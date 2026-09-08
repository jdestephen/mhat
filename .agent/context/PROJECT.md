# MHAT — Contexto del Proyecto

> **Lectura requerida antes de**: [API.md](./API.md), [WEB.md](./WEB.md)

## Propósito General

**MHAT (Medical History App / Numa)** es una plataforma de historial médico digital que permite a pacientes y médicos gestionar, compartir y verificar registros clínicos de forma segura. El nombre comercial es **Numa** (`Numa - Historial Médico`).

El sistema resuelve tres problemas principales:
1. **Pacientes**: tener su historial médico centralizado, portable y compartible con cualquier profesional de salud.
2. **Médicos**: acceder al historial completo de sus pacientes, crear registros clínicos verificados, y emitir prescripciones/órdenes.
3. **Familias**: gestionar el historial médico de dependientes (hijos, padres) desde una sola cuenta.

---

## Arquitectura del Monorepo

```
mhat/
├── backend/          → API (FastAPI + PostgreSQL)
├── apps/
│   ├── web/          → Web App (Next.js)
│   └── mobile/       → Mobile App (Expo/React Native) — en desarrollo
├── docker-compose.yml
├── package.json      → pnpm workspaces
└── pnpm-workspace.yaml
```

- **Gestor de paquetes**: pnpm (workspaces en `apps/*`)
- **Infraestructura local**: Docker Compose con PostgreSQL 15 + FastAPI (uvicorn con hot-reload)
- **Almacenamiento de archivos**: Cloudflare R2 (compatible S3) para documentos médicos
- **Email**: Resend (transaccional)
- **Comandos principales**:
  - `pnpm dev:backend` → `docker-compose up` (PostgreSQL + API en puerto 8000)
  - `pnpm dev:web` → Next.js dev server en puerto 3000
  - `pnpm dev:mobile` → Expo dev server

---

## Roles del Sistema

| Rol | Descripción | Capacidades principales |
|-----|-------------|------------------------|
| **PATIENT** | Usuario paciente | Gestionar su historial, crear registros (no verificados), compartir vía link, gestionar familia, invitar médicos |
| **DOCTOR** | Profesional médico | Requiere aprobación de admin. Puede crear registros verificados, prescripciones, órdenes clínicas, y gestionar pacientes |
| **ADMIN** | Administrador | Aprobar/rechazar solicitudes de médicos, gestionar la plataforma |

> Un doctor puede tener **dual-mode**: además de su rol de doctor, puede inicializar un perfil de paciente propio para gestionar su historial personal (`/family/doctor-patient-init`).

---

## Modelo de Datos Central

```
User (cuenta de autenticación)
  ├── PatientProfile (perfil de paciente, puede existir sin User)
  │     ├── MedicalRecord (registro médico)
  │     │     ├── MedicalDiagnosis[] (diagnósticos con ranking)
  │     │     ├── Document[] (archivos adjuntos con OCR)
  │     │     ├── Prescription[] (prescripciones)
  │     │     ├── ClinicalOrder[] (órdenes: laboratorio, imagen, referencia, procedimiento)
  │     │     └── VitalSigns? (signos vitales vinculados)
  │     ├── VitalSigns[] (signos vitales independientes)
  │     ├── Medication[] (medicamentos activos/históricos)
  │     ├── Allergy[] (alergias con soft-delete)
  │     ├── Condition[] (condiciones/padecimientos con soft-delete)
  │     ├── Surgery[] (cirugías con soft-delete)
  │     ├── Vaccine[] (vacunas con soft-delete)
  │     ├── HealthHabit? (hábitos de salud: tabaco, alcohol, actividad física, dieta, sueño)
  │     ├── FamilyHistoryCondition[] (antecedentes familiares)
  │     ├── PersonalReference[] (contactos de emergencia, máx. 3)
  │     └── PatientLocation[] (ubicaciones del paciente con coordenadas)
  │
  ├── DoctorProfile (perfil profesional, si role=DOCTOR)
  │     ├── college_number, verification_phone
  │     ├── approval_status (PENDING → APPROVED/REJECTED)
  │     ├── identity_document_key, college_document_key (documentos verificación)
  │     └── ocr_extracted_data, ocr_processed (datos OCR extraídos)
  │
  ├── FamilyMembership (relación User ↔ PatientProfile)
  └── DoctorPatientAccess (relación Doctor ↔ PatientProfile)
```

---

## Patrones Transversales

Estos patrones son compartidos entre API y Web. **No deben re-documentarse** en `API.md` o `WEB.md`; solo referenciarse.

### 1. Sistema de Cuentas Familiares (Multi-Perfil)

Un usuario puede gestionar múltiples `PatientProfile` a través de `FamilyMembership`:

- **SELF**: perfil propio (creado automáticamente al registrarse)
- **CHILD, PARENT, SPOUSE, SIBLING, OTHER**: perfiles de familia sin cuenta de usuario

Cada membership define:
- `relationship_type`: tipo de relación
- `access_level`: `FULL_ACCESS` o `READ_ONLY`
- `can_manage_family`: permiso para invitar otros guardianes
- `profile_color`: color asignado para identificación visual

La invitación a otros guardianes usa **códigos de invitación de 48 horas** (`FamilyInvitation`).

### 2. Control de Acceso Médico

Los médicos acceden a perfiles de pacientes a través de `DoctorPatientAccess`:

- **Niveles**: `READ_ONLY` (solo lectura) o `WRITE` (lectura + escritura)
- **Tipos**: `PERMANENT` o `TEMPORARY` (con expiración en días)
- **Obtención de acceso**:
  - El paciente genera un `AccessInvitation` (código corto de 24 horas)
  - El médico reclama el código vía `/doctor/claim-access`
  - El médico también puede crear pacientes directamente (sin cuenta de usuario), obteniendo acceso WRITE automáticamente

### 3. Sistema de Verificación de Registros

Los registros médicos tienen un flujo de verificación:

| Estado | Significado |
|--------|-------------|
| `UNVERIFIED` | Creado por paciente, sin verificar |
| `BACKED_BY_DOCUMENT` | Paciente adjuntó un documento |
| `VERIFIED` | Verificado por un médico |

- Registros creados por médicos son automáticamente `VERIFIED`
- `record_source`: `PATIENT` o `DOCTOR` (para tracking de origen)
- Un registro verificado por un médico ya **no puede ser editado** por el paciente

### 4. Profile Claims (Vinculación de Perfiles)

Cuando un médico crea un paciente con email y ese email se registra después:

1. Al registrarse, se crea un `ProfileClaimRequest` automático (estado `PENDING`)
2. El médico ve la solicitud y puede aprobar/rechazar
3. Si aprueba:
   - Si el perfil propio del paciente está vacío → lo reemplaza con el perfil del médico
   - Si el paciente ya tiene datos → se agrega como perfil adicional

### 5. Compartir Historial Médico

Sistema de links temporales con tokens criptográficos:

- **Tipos**: `SPECIFIC_RECORDS` (registros específicos) o `SUMMARY` (resumen completo)
- **Características**: expiración configurable, uso único opcional, revocación inmediata
- **Seguridad**: logging de acceso (IP, user-agent), contador de accesos
- **Endpoints públicos**: no requieren autenticación, solo el token válido

### 6. Aprobación de Médicos

Flujo de registro para médicos:
1. Doctor se registra con `role=DOCTOR` + `college_number` + `verification_phone`
2. Estado inicial: `PENDING` → no puede hacer login
3. Puede subir documentos de identidad y colegiación (con OCR automático)
4. Admin recibe notificación por email
5. Admin aprueba/rechaza → se envía email al doctor
6. Si aprobado: puede hacer login y operar

### 7. Catálogos Médicos

Datos estáticos en archivos JSON (`app/data/`):
- `catalog_es.json`: alergias, condiciones, vacunas (con búsqueda por nombre/sinónimos)
- `clinical_orders_es.json`: opciones de órdenes clínicas (LAB, IMAGING, REFERRAL, PROCEDURE)
- UI options: severidades, estados, rutas de medicamentos, etc.

---

## Variables de Entorno Clave

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_USER/PASSWORD/SERVER/DB` | Conexión a PostgreSQL |
| `SECRET_KEY` | Clave para JWT |
| `EMAIL_ENABLED` | `false` en dev (auto-verifica emails, desactiva validación fuerte de contraseña) |
| `RESEND_API_KEY` | API key de Resend para emails transaccionales |
| `R2_*` | Credenciales de Cloudflare R2 para almacenamiento |
| `STORAGE_LOCAL_MODE` | `true` para almacenamiento local en dev |
| `ADMIN_NOTIFICATION_EMAIL` | Email para notificaciones de admin |
| `CORS_ORIGINS` | Orígenes permitidos (localhost en dev) |

> En modo dev (`EMAIL_ENABLED=false`): los usuarios se auto-verifican al registrarse, no se requiere contraseña fuerte, y no se envían emails.
