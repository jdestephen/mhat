# Numa: arquitectura y contrato de la API

Lectura previa: [PROJECT.md](PROJECT.md). Inventario contrastado con `backend/app/api/api.py` y los decoradores de `backend/app/api/` el 6 de noviembre de 2026. Para parámetros y respuestas exactas consulta los esquemas Pydantic y `/api/v1/openapi.json` con la API en ejecución.

## Entrada, capas y datos

`backend/app/main.py` crea FastAPI, aplica CORS desde `Settings`, registra `api_router` bajo `/api/v1` y sirve `/static/uploads` solo cuando `STORAGE_LOCAL_MODE` está activo. `backend/app/api/api.py` monta cada router. El orden de `sharing` antes de `hx` importa porque `hx` contiene rutas dinámicas `/{record_id}`.

`sharing.router` se incluye dos veces: con prefijo `/hx` y sin prefijo. Eso registra también alias de las rutas públicas bajo `/hx/shared/*` y de las rutas de gestión bajo `/share*`. Los clientes actuales usan `/hx/share*` para gestionar y `/shared/*` para abrir enlaces. Revisa ambas inclusiones antes de modificar ese router.

La ruta habitual de una petición es:

```text
router → dependencia de usuario/rol/perfil/acceso → AsyncSession → modelos SQLAlchemy
       → servicio cuando corresponde → esquema Pydantic de respuesta
```

- La sesión se crea por petición en `backend/app/db/session.py` con `asyncpg`. Los modelos se importan en `backend/app/db/base.py`; las migraciones están en `backend/alembic/versions/`.
- `get_current_user` decodifica JWT y carga `User`; `require_admin` comprueba `is_admin`; `resolve_patient_profile` valida una membresía familiar activa para `profile_id` o busca el perfil propio.
- El paquete `endpoints/doctor/` separa acceso, pacientes, registros, prescripciones, órdenes, signos vitales, historial y claims. `_helpers.py` contiene `require_doctor_role`, `require_clinical_role`, `check_assistant_permission` y `get_doctor_patient_access`. Comprueba la combinación exigida por la ruta concreta, incluyendo nivel WRITE cuando corresponda.
- Las rutas son principalmente async. Un cambio de esquema requiere migración Alembic, actualización de modelo y de esquema, y revisión de consumidores web/móvil.
- `backend/app/core/config.py` define `Settings`: URL de BD, JWT, correo, R2, CORS, frontend y modo local. Los valores de `.env` son privados. `docker-compose.yml` define la configuración de desarrollo con PostgreSQL 15.
- Las invitaciones médicas validan la expiración del código. El tipo `TEMPORARY` y `expires_in_days` no se traducen actualmente en una fecha de vencimiento de `DoctorPatientAccess`; `_helpers.py` solo comprueba existencia y nivel. No supongas caducidad efectiva del acceso.

## Seguridad y contratos transversales

- Access token JWT HS256 con expiración predeterminada de 30 minutos. Refresh token aleatorio almacenado como hash, 7 días y rotación al renovarlo. La web envía `Authorization: Bearer` y renueva tras 401.
- Registro, login y recuperación de contraseña usan limitación de solicitudes en memoria por IP en `core/rate_limit.py`. No presupongas coordinación entre réplicas.
- La validación de correo y los requisitos de contraseña dependen de `EMAIL_ENABLED`; `GET /auth/config` expone la configuración que necesita el cliente.
- Muchos recursos de paciente aceptan `?profile_id=`. La presencia del parámetro no concede permisos por sí sola. Cuando una ruta no usa `resolve_patient_profile`, revisa su autorización específica.
- El almacenamiento usa R2/S3 o archivos locales. Los documentos se entregan mediante URL firmada o ruta local según configuración; el acceso compartido valida además el token de share.
- Los catálogos de alergias, condiciones, vacunas y órdenes clínicas se cargan de `backend/app/data/*.json`.

## Mapa de rutas registradas

Todas las rutas siguientes llevan `/api/v1`. Esta tabla agrupa operaciones; confirma métodos, cuerpos y `response_model` en el archivo indicado antes de cambiar un contrato.

| Prefijo | Funcionalidad y rutas clave | Fuente |
| --- | --- | --- |
| `/auth` | `config`, `login`, `refresh`, `logout`, `register`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password`, `change-password`, `me`, carga de documentos de médico, `activate-assistant` | `endpoints/auth.py` |
| `/hx` | CRUD de registros del paciente, `categories`, documentos de registro, URL de documento, bitácora de visualización, signos vitales | `endpoints/hx.py` |
| `/profiles` | `patient` y `doctor`; datos de salud bajo `/patient/*`; accesos e invitaciones del paciente bajo `/me/*` | `endpoints/profiles.py`, `health_data.py`, `doctor_access.py` |
| `/catalog` | `allergies`, `conditions`, `vaccines`, `options`, `clinical-orders` | `endpoints/catalog.py` |
| `/doctor` | Acceso, pacientes, registros, prescripciones, órdenes, vitales, historial, claims y asistentes | `endpoints/doctor/*`, `endpoints/assistants.py` |
| `/patient` | `profiles`, `claim-requests` | `endpoints/patient_api.py` |
| `/family` | `managed-patients`, `members`, membresías, miembros de perfil, invitaciones, `doctor-patient-init` | `api/family.py` |
| `/health-centers` | Listado, centros propios, creación, afiliación y centro primario | `endpoints/health_centers.py` |
| `/admin` | Solicitudes de médicos y gestión de centros de salud | `endpoints/admin.py`, `health_centers.py` |
| `/shared/{token}` | Visualización pública de records, summary y documentos según el share | `endpoints/sharing.py` |

### Autenticación y perfiles

- `POST /auth/login` recibe formulario `username` (correo) y `password`; `POST /auth/refresh` recibe `refresh_token`. `POST /auth/logout` revoca el refresh token. `GET/PUT /auth/me` consulta o edita la cuenta.
- El registro de médico crea `DoctorProfile` pendiente. Las rutas de subida de documentos de verificación son `/auth/doctor/upload-documents-registration` (credenciales de registro) y `/auth/doctor/upload-documents` (autenticado). El admin aprueba o rechaza por `/admin/doctors/{profile_id}/approve|reject`.
- `POST /auth/activate-assistant` acepta token de invitación y contraseña; crea cuenta y asignación. La invitación al asistente parte de `/doctor/assistants/invite`.
- `GET/PUT /profiles/patient` y `GET/PUT /profiles/doctor` atienden los perfiles; la API de paciente puede auto crear el perfil SELF. Los modelos de respuesta se definen en `schemas/patient.py` y `schemas/doctor.py`.

### Historial y datos de salud del paciente

- `POST/GET /hx/`, `GET/PUT /hx/{record_id}` atienden registros. `POST /hx/{record_id}/documents` adjunta archivo; `GET /hx/{record_id}/documents/{document_id}/url` entrega URL; `GET /hx/{record_id}/view-log` lista visualizaciones.
- `POST/GET /hx/vital-signs`, `GET/PUT /hx/vital-signs/{vital_id}` atienden mediciones independientes. Las rutas estáticas se registran antes de `/{record_id}`.
- `/profiles/patient/` contiene CRUD de `allergies`, `conditions`, `surgeries`, `vaccines`, `medications`, `references`, `habits`, `family-history` y `locations`. La forma de borrado y el esquema de respuesta varían según recurso.
- `/profiles/me/doctor-access`, `/profiles/me/invitations` y `/profiles/me/doctors` permiten conceder, consultar o revocar acceso médico desde el lado paciente.

### Trabajo clínico

- `/doctor/claim-access` reclama un código; `/doctor/patients` lista pacientes y `/doctor/patients/create` crea un perfil sin cuenta. `/doctor/patients/{id}/health` agrega historial; `/personal-info` y `/locations` gestionan datos del paciente.
- `/doctor/patients/{id}/records` lista o crea registros. `/doctor/records/{id}` obtiene o edita; `/doctor/records/{id}/verify` verifica uno creado por el paciente. Registros clínicos pueden incluir diagnósticos, recetas, órdenes y signos vitales.
- Prescripciones: `/doctor/records/{id}/prescriptions`. Órdenes: `/doctor/records/{id}/orders` o `/doctor/patients/{id}/orders` para independientes. Vitales: `/doctor/patients/{id}/vital-signs` y variantes vinculadas a un registro.
- El historial de salud clínico tiene rutas `/doctor/patients/{patient_id}/{conditions|surgeries|allergies|medications|habits|family-history|vaccines}`. Los claims están en `/doctor/claim-requests` y rutas de aprobación/rechazo.
- Asistentes: `/doctor/assistants/invite`, `/invitations`, `/doctor/assistants`, `/{id}/permissions`, `/{id}/deactivate|reactivate`. Las asignaciones se vinculan a centro de salud y permisos específicos. Para una operación clínica, revisa tanto la asignación como el acceso del médico al paciente.

### Familia, centros y sharing

- Familia: `/family/members`, `/family/memberships/{id}`, `/family/patients/{id}/members`, `/family/profiles/{id}/invite`, `/family/invite/claim` y otras rutas de consulta/revocación. Las invitaciones tienen vencimiento; `doctor-patient-init` crea perfil propio para usuario clínico.
- Centros de salud: `GET /health-centers`, `GET /health-centers/mine`, `POST /health-centers`, `POST /health-centers/{hc_id}/join`, `DELETE /health-centers/{hc_id}/leave`, `PUT /health-centers/{hc_id}/set-primary`. Admin: `GET/POST /admin/health-centers`, `PUT /admin/health-centers/{hc_id}`, `POST .../{hc_id}/verify|reject`. Estas son las rutas reales, distintas de algunas listadas en el contexto antiguo.
- Sharing autenticado: `POST /hx/share`, `GET /hx/shares`, `DELETE /hx/share/{token_id}`. Público: `GET /shared/{token}`, `/shared/{token}/summary`, `/shared/{token}/record/{record_id}`, `/shared/{token}/document/{document_id}`. Los tipos son `SPECIFIC_RECORDS` y `SUMMARY`.

## Servicios y decisiones de cambio

| Servicio | Uso |
| --- | --- |
| `storage.py` | Guardar archivos y generar URLs firmadas; modo local para desarrollo. |
| `ocr.py`, `document_verification.py` | Extraer texto de imagen/PDF y procesar documentos profesionales. |
| `email.py` | Correos de verificación, reset, aprobación, invitación y notificaciones. |
| `summary.py` | Construir resumen para enlace compartido. |
| `catalog_service.py` | Buscar en catálogos JSON en español. |
| `family_service.py` | Operaciones de familia. |

Al agregar o modificar una ruta: revisa dependencia de autorización, esquema de entrada/salida, transacción, migración si cambia persistencia, clientes que la consumen y ubicación estática/dinámica de la ruta. No inventes un endpoint por analogía con otra superficie.
