# Numa: producto y arquitectura general

Estado documentado: 6 de noviembre de 2026, según el código del repositorio. Este documento describe implementación actual, no una hoja de ruta.

## Identidad y propósito

**Numa** es una plataforma de historial médico digital para pacientes, médicos y personas que gestionan perfiles familiares. Permite reunir datos de salud y registros clínicos, dar acceso a médicos, compartir información mediante enlaces temporales y operar flujos clínicos. `MHAT` persiste como nombre histórico del repositorio y de algunos identificadores de infraestructura. Numa es independiente de ISIS; no se deben heredar decisiones de esa consultora.

## Superficies y dependencia principal

```text
apps/web (Next.js) ──HTTP /api/v1──> backend (FastAPI) ──> PostgreSQL
                                          │                   └─ Alembic
                                          ├─ Cloudflare R2 o archivos locales
                                          ├─ Resend (correo)
                                          └─ Tesseract/PDF (OCR)
apps/mobile (Expo, prototipo) ──HTTP parcial──┘
```

- `apps/web` es el cliente funcional principal. Usa App Router, React Query y Axios; la mayor parte de las pantallas autenticadas son componentes cliente.
- `backend` registra los routers bajo `/api/v1`, usa SQLAlchemy async y PostgreSQL. Pydantic define límites de entrada y salida; Alembic contiene cambios de esquema.
- `apps/mobile` contiene navegación, pantallas de acceso y una prueba de carga de documentos. Aún no comparte el contrato completo de web/API; véase [MOBILE.md](MOBILE.md).
- Docker Compose inicia PostgreSQL 15 y la API. El monorepo usa pnpm para `apps/*`; el backend instala dependencias desde `backend/requirements.txt`.

## Personas, cuentas y permisos

| Concepto | Implementación |
| --- | --- |
| `User` | Cuenta autenticada con `role` (`PATIENT`, `DOCTOR`, `ASSISTANT`) y bandera `is_admin`. Admin es una capacidad, no un valor de `UserRole`. |
| `PatientProfile` | Datos de paciente; puede estar asociado a un usuario o ser un perfil sin cuenta creado para un familiar o por un médico. |
| `DoctorProfile` | Datos profesionales y estado de aprobación `PENDING`, `APPROVED` o `REJECTED`. |
| `FamilyMembership` | Relación cuenta ↔ perfil, con parentesco, nivel de acceso y capacidad de administrar familia. |
| `DoctorPatientAccess` | Relación médico ↔ paciente, con nivel `READ_ONLY` o `WRITE` y tipo `TEMPORARY` o `PERMANENT`. El modelo actual no guarda fecha de vencimiento del acceso. |
| `DoctorAssistantAssignment` | Relación asistente ↔ médico y centro de salud, con permisos granulares y estado activo. |
| `HealthCenterMembership` | Afiliación de usuario a centro de salud, separada del acceso a pacientes. |

Los usuarios clínicos pueden abrir un perfil de paciente propio y alternar la interfaz entre modo clínico y paciente. El modo de interfaz no sustituye los controles de autorización de la API.

## Datos clínicos principales

- Un `PatientProfile` agrupa `MedicalRecord`, signos vitales, medicamentos, alergias, condiciones, cirugías, vacunas, hábitos, antecedentes familiares, referencias personales y ubicaciones.
- `MedicalRecord` tiene categoría, motivo, fecha, notas, etiquetas, diagnósticos, documentos, prescripciones, órdenes clínicas y, opcionalmente, signos vitales asociados. `search_text` permite búsqueda.
- Las órdenes clínicas pueden estar vinculadas a un registro o existir de forma independiente para un paciente.
- Los estados de registro son `UNVERIFIED`, `BACKED_BY_DOCUMENT` y `VERIFIED`; el origen admite `PATIENT`, `DOCTOR`, `ASSISTANT` e `IMPORTED`. Los registros creados por un médico se verifican al crearse. La API limita la edición del paciente sobre registros verificados.
- Parte del historial de salud usa borrado lógico; medicamentos, referencias y antecedentes familiares tienen rutas de eliminación física. Comprueba el recurso concreto antes de cambiar esta semántica.

## Flujos que cruzan API y clientes

1. **Cuenta y médico:** registro, verificación de correo (según configuración), login con access/refresh token; los médicos pasan por aprobación administrativa y pueden subir documentos de verificación.
2. **Familia:** una cuenta puede gestionar varios perfiles mediante `FamilyMembership`. Hay invitaciones familiares con código y vencimiento. La web conserva el perfil activo para enviar `profile_id` en peticiones pertinentes.
3. **Acceso médico:** el paciente puede conceder o revocar acceso y emitir invitaciones; el médico reclama el código. Crear un paciente desde el panel médico también establece acceso clínico.
4. **Vinculación de perfiles:** cuando existe un perfil creado por un médico para un correo que después se registra, `ProfileClaimRequest` permite aprobar o rechazar la vinculación.
5. **Compartir:** `ShareToken` habilita enlaces públicos de registros específicos o resumen, con expiración, revocación, opción de uso único y registro de accesos. El token concede acceso solo al contenido definido por el enlace.
6. **Asistentes y centros:** un médico puede afiliarse a centros de salud e invitar asistentes con permisos por asignación. El correo dirige a `/auth/activate-assistant?token=...`; la página consulta la invitación y permite crear una cuenta nueva o aceptar una asignación con una cuenta de asistente existente. El backend valida permisos de asistentes y acceso del médico a cada paciente.

## Mapa de código

| Lugar | Responsabilidad |
| --- | --- |
| `backend/app/api/api.py` | Ensamble y prefijos de routers. |
| `backend/app/api/deps.py` | Usuario actual, admin y resolución de perfil familiar. |
| `backend/app/api/endpoints/doctor/_helpers.py` | Roles clínicos, permisos de asistentes y acceso a pacientes. |
| `backend/app/models/`, `schemas/` | Persistencia y contratos Pydantic. |
| `backend/app/services/` | Correo, almacenamiento, OCR, catálogos, familias y resúmenes. |
| `apps/web/src/app/` | Rutas y pantallas. |
| `apps/web/src/hooks/`, `lib/api.ts`, `types/` | Estado, llamadas a API y tipos del cliente. |
| `apps/mobile/app/` | Rutas Expo del prototipo. |

## Desarrollo local

`pnpm dev:backend` ejecuta Docker Compose (API en `:8000`, PostgreSQL en `:5432`), `pnpm dev:web` la web en `:3000` y `pnpm dev:mobile` Expo. Configura variables mediante archivos locales no versionados. No copies credenciales a la documentación. `docker-compose.yml` es la referencia para las variables del servicio; `backend/app/core/config.py` define valores y predeterminados efectivos. La web requiere `NEXT_PUBLIC_API_URL` apuntando a la base `/api/v1`.

## Límites conocidos del estado actual

- El módulo móvil usa `/documents` y `/documents/upload`; esos endpoints no están registrados en `backend/app/api/api.py`. Tampoco persiste el token que recibe del login.
- Las invitaciones de acceso médico pueden indicar `TEMPORARY` y `expires_in_days`, pero `DoctorPatientAccess` no almacena un vencimiento y `get_doctor_patient_access()` no comprueba uno. El vencimiento del código de invitación sí se valida. Tratar la caducidad del acceso como funcionalidad pendiente hasta resolverla.
- Los README de web y móvil son textos iniciales de los frameworks; este contexto y el código describen mejor el estado del producto.
