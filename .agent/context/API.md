# MHAT — Contexto de la API

> **Lectura previa requerida**: [PROJECT.md](./PROJECT.md) — contiene los patrones transversales (multi-perfil, acceso médico, verificación, claims, sharing, aprobación de médicos) que esta API implementa.

## Stack Tecnológico

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **FastAPI** | ≥0.115 | Framework web async |
| **SQLAlchemy** | ≥2.0 (async) | ORM con `asyncpg` como driver |
| **PostgreSQL** | 15 (Alpine) | Base de datos principal |
| **Alembic** | ≥1.15 | Migraciones de BD |
| **Pydantic** | v2 | Validación de schemas + `pydantic-settings` para config |
| **python-jose** | JWT | Autenticación con HS256 |
| **passlib + bcrypt** | 3.2.2 | Hashing de contraseñas |
| **Resend** | ≥2.0 | Emails transaccionales |
| **boto3** | ≥1.35 | Almacenamiento S3/R2 |
| **pytesseract + PyPDF2 + Pillow** | — | OCR de documentos médicos |

---

## Estructura del Proyecto

```
backend/
├── app/
│   ├── main.py                  → FastAPI app, CORS, router principal
│   ├── api/
│   │   ├── api.py               → Registro de todos los routers
│   │   ├── deps.py              → Dependencias compartidas (auth, resolve_patient_profile)
│   │   ├── family.py            → Endpoints de gestión familiar
│   │   └── endpoints/
│   │       ├── auth.py          → Autenticación y registro
│   │       ├── hx.py            → Registros médicos (paciente)
│   │       ├── profiles.py      → Perfiles de paciente y doctor
│   │       ├── health_data.py   → Datos de salud (alergias, medicamentos, etc.)
│   │       ├── doctor_access.py → Gestión de acceso médico (lado paciente)
│   │       ├── sharing.py       → Compartir historial
│   │       ├── catalog.py       → Catálogos médicos
│   │       ├── patient_api.py   → Endpoints específicos de paciente
│   │       ├── admin.py         → Administración
│   │       └── doctor/          → Paquete modular de endpoints para médicos
│   │             ├── __init__.py    → Re-exporta router unificado
│   │             ├── _helpers.py    → require_doctor_role, get_doctor_patient_access
│   │             ├── access.py      → Reclamar invitaciones, grant/revoke acceso
│   │             ├── patients.py    → CRUD pacientes, perfil de salud, info personal
│   │             ├── records.py     → CRUD registros médicos
│   │             ├── prescriptions.py → Prescripciones en registros
│   │             ├── orders.py      → Órdenes clínicas (record-attached y standalone)
│   │             ├── vital_signs.py → Signos vitales
│   │             ├── health_history.py → CRUD datos de salud del paciente
│   │             └── claims.py      → Gestión de claims de perfiles
│   ├── core/
│   │   ├── config.py            → Settings (pydantic-settings)
│   │   ├── security.py          → JWT, hashing, refresh tokens
│   │   └── rate_limit.py        → Rate limiting in-memory por IP
│   ├── db/
│   │   ├── base.py              → Base declarativa de SQLAlchemy
│   │   ├── base_class.py        → Clase base para modelos
│   │   └── session.py           → AsyncSession factory
│   ├── models/                  → Modelos SQLAlchemy
│   ├── schemas/                 → Schemas Pydantic
│   ├── services/
│   │   ├── catalog_service.py   → Búsqueda en catálogos JSON
│   │   ├── document_verification.py → Verificación OCR de documentos de médicos
│   │   ├── email.py             → Templates y envío de emails via Resend
│   │   ├── family_service.py    → Lógica de negocio de familias
│   │   ├── ocr.py               → Procesamiento OCR (Tesseract)
│   │   ├── storage.py           → Upload/download a S3/R2 con presigned URLs
│   │   └── summary.py           → Generación de resumen médico para sharing
│   ├── utils/
│   │   └── sharing.py           → Utilidades de tokens de sharing
│   └── data/
│       ├── catalog_es.json      → Catálogo médico en español
│       └── clinical_orders_es.json → Opciones de órdenes clínicas
├── alembic/                     → Migraciones
├── Dockerfile
└── requirements.txt
```

---

## Reglas Arquitectónicas

1. **Async everywhere**: Todos los endpoints son `async`. Se usa `asyncpg` como driver de PostgreSQL.
2. **Profile-aware**: La mayoría de endpoints de paciente aceptan `?profile_id=` para soportar multi-perfil (ver sistema familiar en PROJECT.md).
3. **Resolución de perfil**: `resolve_patient_profile()` en `deps.py` verifica acceso vía `FamilyMembership` antes de operar sobre un perfil.
4. **Doctor access checks**: Los endpoints de doctor usan `get_doctor_patient_access()` que valida `DoctorPatientAccess` y opcionalmente requiere nivel `WRITE`.
5. **Soft-delete**: Alergias, condiciones, cirugías y vacunas usan `deleted=True` + `deleted_at` en lugar de eliminar físicamente.
6. **Rate limiting**: Login, register y forgot-password tienen rate limiting in-memory por IP (sliding window).
7. **Registro de routers**: El orden de registro en `api.py` importa — sharing se registra ANTES de hx para evitar que `/{record_id}` capture `/shares`.
8. **search_text**: Los registros médicos mantienen un campo `search_text` concatenado (motive + diagnósticos + tags + notas + categoría + estado) para búsqueda por texto.

---

## Autenticación y Seguridad

- **Access Token**: JWT HS256, 30 minutos de expiración
- **Refresh Token**: Random URL-safe de 64 bytes, hasheado con SHA-256 para almacenamiento, 7 días de expiración, **rotación** en cada uso
- **Verificación de email**: Token random de 32 bytes, 24h de expiración, invalidación de tokens previos
- **Reset de contraseña**: Token random de 32 bytes, 1h de expiración
- **Rate limiting**: 5 req/min para login, 3 req/min para register y forgot-password
- **Endpoint público**: `GET /auth/config` retorna configuración de auth para el frontend (dev mode, requisitos de contraseña, verificación de email)

---

## Endpoints por Módulo

### Auth (`/api/v1/auth`)

| Método | Ruta | Descripción | Auth | Parámetros principales | Respuesta |
|--------|------|-------------|------|----------------------|-----------|
| `GET` | `/config` | Configuración de auth pública | ❌ | — | `{dev_mode, require_strong_password, email_verification_required}` |
| `POST` | `/login` | Iniciar sesión | ❌ | Form: `username` (email), `password` | `{access_token, refresh_token, token_type}` |
| `POST` | `/refresh` | Renovar tokens | ❌ | Body: `{refresh_token}` | `{access_token, refresh_token, token_type}` |
| `POST` | `/logout` | Revocar refresh token | ❌ | Body: `{refresh_token}` | `{message}` |
| `POST` | `/register` | Registrar usuario | ❌ | Body: `{email, password, first_name, last_name, city, country, role, college_number?, verification_phone?}` | `User` |
| `POST` | `/verify-email` | Verificar email | ❌ | Body: `{token}` | `{message}` |
| `POST` | `/resend-verification` | Reenviar verificación | ❌ | Body: `{email}` | `{message}` |
| `POST` | `/forgot-password` | Solicitar reset | ❌ | Body: `{email}` | `{message}` |
| `POST` | `/reset-password` | Resetear contraseña | ❌ | Body: `{token, new_password}` | `{message}` |
| `POST` | `/change-password` | Cambiar contraseña | ✅ | Body: `{current_password, new_password}` | `{message}` |
| `GET` | `/me` | Usuario actual | ✅ | — | `User` |
| `PUT` | `/me` | Actualizar usuario | ✅ | Body: `UserUpdate` (no permite cambiar email/role/is_active) | `User` |
| `POST` | `/doctor/upload-documents-registration` | Subir docs post-registro | ❌ | Form: `email, password` + Files: `identity_document?, college_document?` | `{message, profile, ...verification_result}` |
| `POST` | `/doctor/upload-documents` | Subir docs (autenticado) | ✅ Doctor | Files: `identity_document?, college_document?` | `{message, profile, ...verification_result}` |

---

### Registros Médicos — Paciente (`/api/v1/hx`)

| Método | Ruta | Descripción | Auth | Parámetros principales | Respuesta |
|--------|------|-------------|------|----------------------|-----------|
| `POST` | `/` | Crear registro | ✅ | Body: `{motive, record_date?, notes, category_id?, tags[], diagnoses[], prescriptions[]}`, Query: `profile_id?` | `MedicalRecord` |
| `GET` | `/` | Listar registros | ✅ | Query: `skip, limit, q?, category_id?, date_from?, date_to?, profile_id?, has_prescriptions?, has_orders?` | `MedicalRecord[]` |
| `GET` | `/categories` | Listar categorías | ✅ | — | `Category[]` |
| `GET` | `/{record_id}` | Obtener registro | ✅ | Query: `profile_id?` | `MedicalRecord` |
| `PUT` | `/{record_id}` | Actualizar registro | ✅ | Body: `MedicalRecordUpdate` (solo si lo creó el paciente y no está verificado) | `MedicalRecord` |
| `POST` | `/{record_id}/documents` | Subir documento | ✅ | File: archivo, auto-OCR si es imagen local | `Document` |
| `GET` | `/{record_id}/documents/{document_id}/url` | URL presigned de doc | ✅ | — | `{url}` |
| `GET` | `/{record_id}/view-log` | Log de quién vio el registro | ✅ Patient | — | `RecordViewLog[]` |

#### Signos Vitales (Paciente) — bajo `/api/v1/hx`

| Método | Ruta | Descripción | Auth | Parámetros principales | Respuesta |
|--------|------|-------------|------|----------------------|-----------|
| `POST` | `/vital-signs` | Crear signos vitales | ✅ | Body: `VitalSignsCreate`, Query: `profile_id?` | `VitalSignsResponse` |
| `GET` | `/vital-signs` | Listar signos vitales | ✅ | Query: `profile_id?` | `VitalSignsResponse[]` |
| `GET` | `/vital-signs/{vital_id}` | Obtener signos vitales | ✅ | — | `VitalSignsResponse` |
| `PUT` | `/vital-signs/{vital_id}` | Actualizar (solo si creado por paciente y no verificado) | ✅ | Body: `VitalSignsUpdate` | `VitalSignsResponse` |

---

### Perfiles (`/api/v1/profiles`)

| Método | Ruta | Descripción | Auth | Parámetros principales | Respuesta |
|--------|------|-------------|------|----------------------|-----------|
| `GET` | `/patient` | Obtener perfil paciente | ✅ | Query: `profile_id?` (auto-crea SELF si no existe) | `PatientProfile` (con medications, allergies, conditions, references, habits, family_history, locations, surgeries, vaccines) |
| `PUT` | `/patient` | Actualizar perfil paciente | ✅ | Body: `PatientProfileUpdate`, Query: `profile_id?` | `PatientProfile` |
| `GET` | `/doctor` | Obtener perfil doctor | ✅ Doctor | — | `DoctorProfile` |
| `PUT` | `/doctor` | Actualizar perfil doctor | ✅ Doctor | Body: `DoctorProfileUpdate` | `DoctorProfile` |

---

### Datos de Salud (`/api/v1/profiles/patient`)

Todos soportan `?profile_id=` para multi-perfil.

#### Alergias

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/allergies` | Agregar alergia | `PatientProfile` (completo) |
| `PATCH` | `/allergies/{id}` | Actualizar alergia | `Allergy` |
| `DELETE` | `/allergies/{id}` | Soft-delete alergia | 204 |

#### Condiciones

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/conditions` | Agregar condición | `PatientProfile` |
| `PATCH` | `/conditions/{id}` | Actualizar condición | `Condition` |
| `DELETE` | `/conditions/{id}` | Soft-delete condición | 204 |

#### Cirugías

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/surgeries` | Agregar cirugía | `PatientProfile` |
| `PATCH` | `/surgeries/{id}` | Actualizar cirugía | `Surgery` |
| `DELETE` | `/surgeries/{id}` | Soft-delete cirugía | 204 |

#### Vacunas

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/vaccines` | Agregar vacuna | `PatientProfile` |
| `PATCH` | `/vaccines/{id}` | Actualizar vacuna | `Vaccine` |
| `DELETE` | `/vaccines/{id}` | Soft-delete vacuna | 204 |

#### Medicamentos

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/medications` | Crear medicamento | `Medication` |
| `GET` | `/medications` | Listar (filtros: `status`, `condition_id`) | `Medication[]` |
| `GET` | `/medications/active` | Solo medicamentos activos | `Medication[]` |
| `GET` | `/medications/{id}` | Obtener uno | `Medication` |
| `PATCH` | `/medications/{id}` | Actualizar | `Medication` |
| `DELETE` | `/medications/{id}` | Eliminar (hard delete) | 204 |
| `GET` | `/conditions/{id}/medications` | Medicamentos de una condición | `Medication[]` |

#### Referencias Personales

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/references` | Agregar referencia (máx. 3) | `PersonalReference` |
| `PUT` | `/references/{id}` | Actualizar | `PersonalReference` |
| `DELETE` | `/references/{id}` | Eliminar (hard delete) | 204 |

#### Hábitos de Salud

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/habits` | Obtener hábitos | `HealthHabit \| null` |
| `PUT` | `/habits` | Crear o actualizar (upsert) | `HealthHabit` |

#### Antecedentes Familiares

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/family-history` | Listar | `FamilyHistoryCondition[]` |
| `POST` | `/family-history` | Agregar | `FamilyHistoryCondition` |
| `PUT` | `/family-history/{id}` | Actualizar | `FamilyHistoryCondition` |
| `DELETE` | `/family-history/{id}` | Eliminar (hard delete) | 204 |

#### Ubicaciones

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/locations` | Listar ubicaciones | `PatientLocation[]` |
| `POST` | `/locations` | Agregar (máx. 5) | `PatientLocation` |
| `PUT` | `/locations/{id}` | Actualizar | `PatientLocation` |
| `DELETE` | `/locations/{id}` | Eliminar | 204 |
| `PUT` | `/locations/{id}/default` | Marcar como predeterminada | `PatientLocation` |

---

### Acceso Médico — Lado Paciente (`/api/v1/profiles/me`)

| Método | Ruta | Descripción | Auth | Respuesta |
|--------|------|-------------|------|-----------|
| `GET` | `/doctor-access` | Médicos con acceso | ✅ | `DoctorAccessInfo[]` |
| `POST` | `/doctor-access` | Otorgar acceso a médico | ✅ | `{message, access_level}` |
| `DELETE` | `/doctor-access/{doctor_id}` | Revocar acceso | ✅ | `{message}` |
| `POST` | `/invitations` | Crear invitación para médico (24h) | ✅ | `AccessInvitationResponse` (con código) |
| `GET` | `/invitations` | Listar invitaciones | ✅ | `AccessInvitationResponse[]` |
| `DELETE` | `/invitations/{id}` | Revocar invitación | ✅ | `{message}` |
| `GET` | `/doctors` | Listar médicos con acceso (detallado) | ✅ | `DoctorAccessInfo[]` |
| `DELETE` | `/doctors/{access_id}` | Revocar acceso por ID | ✅ | `{message}` |

---

### Compartir Historial (`/api/v1/hx` + público)

| Método | Ruta | Descripción | Auth | Respuesta |
|--------|------|-------------|------|-----------|
| `POST` | `/hx/share` | Crear link de compartir | ✅ | `{share_url, token, expires_at, record_count}` |
| `GET` | `/hx/shares` | Listar mis links (filtros: `include_expired`, `include_revoked`) | ✅ | `{shares[]}` |
| `DELETE` | `/hx/share/{token_id}` | Revocar link | ✅ | `{message, token_id}` |
| `GET` | `/shared/{token}` | Ver registros compartidos | ❌ Público | `SharedRecordsViewResponse` |
| `GET` | `/shared/{token}/summary` | Ver resumen médico | ❌ Público | `MedicalHistorySummaryResponse` |
| `GET` | `/shared/{token}/record/{record_id}` | Detalle de registro compartido | ❌ Público | `SharedRecordResponse` |
| `GET` | `/shared/{token}/document/{document_id}` | Redirect a doc compartido | ❌ Público | Redirect a presigned URL |

---

### Catálogos (`/api/v1/catalog`)

| Método | Ruta | Descripción | Auth | Parámetros | Respuesta |
|--------|------|-------------|------|-----------|-----------|
| `GET` | `/allergies` | Buscar alergias | ✅ | `q` (texto) | `[{display, code, code_system, type, synonyms}]` |
| `GET` | `/conditions` | Buscar condiciones | ✅ | `q` (texto) | `[{display, code, code_system, synonyms}]` |
| `GET` | `/vaccines` | Buscar vacunas | ✅ | `q` (texto) | `[{display, code, code_system, synonyms}]` |
| `GET` | `/options` | Opciones de UI para dropdowns | ✅ | — | `{severity, allergy_type, condition_status, ...}` |
| `GET` | `/clinical-orders` | Opciones de órdenes clínicas | ✅ | `type?` (LAB, IMAGING, REFERRAL, PROCEDURE) | Agrupado por tipo |

---

### Doctor (`/api/v1/doctor`)

#### Acceso

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/claim-access` | Reclamar código de invitación | `{message, patient_name, access_level, access_type}` |
| `POST` | `/patients/{id}/access` | Otorgar acceso directo | `DoctorPatientAccessResponse` |
| `DELETE` | `/patients/{id}/access` | Revocar acceso propio | `{message}` |

#### Pacientes

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/patients/create` | Crear paciente (sin cuenta de usuario) | `{patient_id, first_name, last_name, email, activation_email_sent}` |
| `GET` | `/patients` | Listar pacientes del doctor | `PatientAccessSummary[]` |
| `GET` | `/patients/{id}/health` | Perfil de salud completo | `{medications, allergies, conditions, health_habit, family_history, locations, surgeries, vaccines}` |
| `PUT` | `/patients/{id}/personal-info` | Actualizar datos personales del paciente | Perfil actualizado |
| `GET` | `/patients/{id}/locations` | Ubicaciones del paciente | `PatientLocation[]` |

#### Registros Médicos

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/patients/{id}/records` | Listar registros (filtro: `category_id?`) | `MedicalRecord[]` |
| `POST` | `/patients/{id}/records` | Crear registro (auto-verificado, con diagnósticos, prescripciones, órdenes, vitales) | `MedicalRecord` |
| `GET` | `/records/{id}` | Obtener registro (loguea acceso cada 15min) | `MedicalRecord` |
| `PUT` | `/records/{id}/verify` | Verificar registro de paciente | Record actualizado |
| `PUT` | `/records/{id}` | Actualizar registro completo (reemplaza diagnósticos, prescripciones, órdenes, vitales) | `MedicalRecord` |

#### Prescripciones

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/records/{id}/prescriptions` | Agregar prescripción | `PrescriptionResponse` |
| `DELETE` | `/records/{id}/prescriptions/{rx_id}` | Eliminar prescripción | `{message}` |

#### Órdenes Clínicas

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `POST` | `/records/{id}/orders` | Agregar orden a registro | `ClinicalOrderResponse` |
| `DELETE` | `/records/{id}/orders/{order_id}` | Eliminar orden de registro | `{message}` |
| `POST` | `/patients/{id}/orders` | Crear orden standalone | `ClinicalOrderResponse` |
| `GET` | `/patients/{id}/orders` | Listar órdenes (standalone + record-attached, filtro: `order_type?`) | `ClinicalOrderResponse[]` |
| `DELETE` | `/patients/{id}/orders/{order_id}` | Eliminar orden standalone | `{message}` |

#### Signos Vitales

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/patients/{id}/vital-signs` | Listar signos vitales | `VitalSignsResponse[]` |
| `POST` | `/patients/{id}/records/{record_id}/vital-signs` | Crear vinculados a registro | `VitalSignsResponse` |
| `POST` | `/patients/{id}/vital-signs` | Crear standalone (auto-VERIFIED) | `VitalSignsResponse` |
| `PUT` | `/patients/{id}/vital-signs/{vital_id}` | Actualizar | `VitalSignsResponse` |
| `GET` | `/patients/{id}/vital-signs/recent` | Más recientes (últimas 3 horas) | `VitalSignsResponse \| null` |

#### Historial de Salud (CRUD en perfil del paciente)

El doctor puede hacer CRUD completo de: **condiciones**, **cirugías**, **alergias**, **medicamentos**, **hábitos**, **antecedentes familiares** y **vacunas** del paciente. Todos requieren acceso WRITE.

Rutas: `/patients/{patient_id}/{recurso}` con los mismos patrones que los endpoints de paciente.

#### Claims de Perfiles

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/claim-requests` | Listar claims pendientes | `ClaimRequestSummary[]` |
| `POST` | `/claim-requests/{id}/approve` | Aprobar claim (smart merge) | `{message}` |
| `POST` | `/claim-requests/{id}/reject` | Rechazar claim | `{message}` |

---

### Paciente (`/api/v1/patient`)

| Método | Ruta | Descripción | Auth | Respuesta |
|--------|------|-------------|------|-----------|
| `GET` | `/profiles` | Listar perfiles accesibles vía FamilyMembership | ✅ Patient | `PatientProfileSummary[]` |
| `GET` | `/claim-requests` | Listar claims propios | ✅ Patient | `ClaimRequestSummary[]` |

---

### Familia (`/api/v1/family`)

| Método | Ruta | Descripción | Auth | Respuesta |
|--------|------|-------------|------|-----------|
| `GET` | `/managed-patients` | Perfiles que el usuario gestiona (self + familia) | ✅ | `ManagedPatientResponse[]` |
| `POST` | `/members` | Crear miembro familiar (sin cuenta) | ✅ | `PatientProfileResponse` |
| `PATCH` | `/memberships/{id}` | Actualizar membresía (color, acceso) | ✅ | `FamilyMembershipResponse` |
| `DELETE` | `/memberships/{id}` | Revocar acceso (soft-delete, no permite SELF) | ✅ | `FamilyMembershipResponse` |
| `GET` | `/patients/{id}/members` | Listar quiénes tienen acceso a un perfil | ✅ | `FamilyMembershipResponse[]` |
| `POST` | `/profiles/{id}/invite` | Generar código de invitación familiar (48h) | ✅ | `FamilyInvitationResponse` |
| `POST` | `/invite/claim` | Reclamar invitación familiar | ✅ | `ManagedPatientResponse` |
| `GET` | `/invitations/{patient_id}` | Listar invitaciones de un perfil | ✅ | `FamilyInvitationResponse[]` |
| `DELETE` | `/invitations/{id}/revoke` | Revocar invitación no reclamada | ✅ | `{message}` |
| `POST` | `/doctor-patient-init` | Crear perfil de paciente para doctor (idempotente) | ✅ Doctor | `PatientProfileResponse` |

---

### Admin (`/api/v1/admin`)

Todos requieren `is_admin=True` en el usuario.

| Método | Ruta | Descripción | Parámetros | Respuesta |
|--------|------|-------------|-----------|-----------|
| `GET` | `/doctors` | Listar solicitudes de médicos | Query: `status?` (PENDING, APPROVED, REJECTED) | `DoctorApplicationSummary[]` |
| `GET` | `/doctors/{profile_id}` | Detalle de solicitud | — | `DoctorApplicationSummary` |
| `POST` | `/doctors/{profile_id}/approve` | Aprobar médico | — | `{message}` |
| `POST` | `/doctors/{profile_id}/reject` | Rechazar médico | Body: `{reason}` | `{message}` |

---

## Servicios Internos

| Servicio | Archivo | Descripción |
|----------|---------|-------------|
| **CatalogService** | `catalog_service.py` | Carga catálogos JSON al inicio, búsqueda in-memory por nombre/sinónimos con límite de 20 resultados |
| **DocumentVerification** | `document_verification.py` | Sube documentos a R2, ejecuta OCR, extrae DNI/colegiación automáticamente |
| **Email** | `email.py` | Templates HTML en español para: verificación, reset de contraseña, aprobación/rechazo de doctor, notificación de registro, activación de paciente |
| **OCR** | `ocr.py` | Procesamiento de imágenes con Tesseract (español), extracción de texto de PDFs |
| **Storage** | `storage.py` | Upload a S3/R2, generación de presigned URLs (1h expiración), modo local para dev |
| **Summary** | `summary.py` | Construye resumen médico completo para sharing (demographics, medications, conditions, allergies, records recientes) |
| **FamilyService** | `family_service.py` | Lógica de negocio para gestión de familias |
