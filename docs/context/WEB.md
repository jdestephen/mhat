# Numa: web app actual

Lectura previa: [PROJECT.md](PROJECT.md) y [API.md](API.md). Estado contrastado con `apps/web/src` el 16 de noviembre de 2026.

## Stack y ejecución

`apps/web` usa Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, TanStack Query 5, Axios, Lucide, date-fns, Driver.js y Leaflet. `pnpm dev:web` inicia el cliente; `NEXT_PUBLIC_API_URL` debe apuntar a la base `/api/v1`. `apps/web/src/app/layout.tsx` monta `Providers` y `AppShell` para todas las rutas.

## Rutas y funcionalidad

| Área | Rutas implementadas | Función |
| --- | --- | --- |
| Pública | `/`, `/shared/[token]`, `/shared/[token]/summary` | Landing y visualización de contenido compartido. |
| Cuenta | `/auth/login`, `/auth/register`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/activate-assistant` | Acceso, registro, recuperación y activación de invitaciones para asistentes. |
| Inicio | `/onboarding` | Completar datos iniciales del perfil. |
| Paciente | `/dashboard`, `/dashboard/vital-signs`, `/records/new`, `/records/[id]`, `/records/[id]/edit` | Lista, búsqueda y detalle de registros; mediciones y creación/edición de historial. |
| Perfil | `/profile/me`, `/profile/health-history`, `/profile/doctor-access`, `/profile/shared-links` | Datos personales, condiciones, alergias, medicamentos, vacunas, hábitos, antecedentes, referencias, acceso médico y shares. |
| Familia | `/family/new` | Crear perfil familiar; el selector de perfil está en la navegación. |
| Médico | `/doctor`, `/doctor/assistants`, `/doctor/print-settings`, `/doctor/patients/[id]`, `/doctor/patients/[id]/health-history` | Pacientes, claims, acceso por invitación, asistentes, configuración de impresión, ficha e historial de salud. |
| Registros clínicos | `/doctor/patients/[id]/records/new`, `/new-tabbed`, `/[recordId]`, `/[recordId]/edit` | Crear, consultar y editar registros de pacientes. |
| Admin | `/admin/doctors` | Solicitudes de aprobación médica. |

`new-tabbed` es una variante de interfaz presente en el código. La página administrativa para centros de salud no existe aunque la API sí ofrece esas rutas.

### Disponibilidad del panel de asistentes

`NEXT_PUBLIC_ASSISTANT_MANAGEMENT_ENABLED` controla únicamente el panel web `/doctor/assistants`: solo el valor literal `true` muestra el enlace en el sidebar, consulta sus invitaciones y permite abrir la ruta. Si falta o vale `false`, la ruta responde 404. El resto de los flujos clínicos de asistentes permanece disponible. Next.js incorpora las variables `NEXT_PUBLIC_*` al compilar la web, así que cambiar el valor requiere una nueva compilación y despliegue.

### Cambio de modo para médicos

`NEXT_PUBLIC_DOCTOR_PATIENT_MODE_ENABLED` controla el selector entre el panel médico y el perfil personal de paciente para cuentas `DOCTOR`. Solo el valor literal `true` lo muestra; si falta o vale `false`, la web mantiene a esos usuarios en modo clínico, incluso si `numa_active_mode` guardaba `patient`. Los asistentes conservan su selector. En cada login de médico se restaura el modo clínico y se actualiza el estado compartido antes de navegar a `/doctor`. `AppShell` consulta el rol y el modo efectivo antes de redirigir desde una ruta pública o de autenticación. Esta variable también se incorpora al compilar y requiere nueva compilación y despliegue.

### Impresión de recetas y órdenes

La página `/doctor/print-settings`, enlazada desde Perfil para médicos, guarda nombre y grado opcionalmente distintos del perfil, hospital/clínica, dos teléfonos, dirección, correo público opcional, logo PNG/JPEG de hasta 1 MB, tamaño A4/carta y visibilidad de la duración en recetas. Explica que la fecha de emisión se toma automáticamente de la creación original del documento y se conserva en reimpresiones. El correo de acceso no se copia al impreso. En la pestaña Plan de `/doctor/patients/[id]`, cada medicamento creado por el médico muestra **Imprimir**; el PDF agrupa y numera todos sus medicamentos del mismo registro. Cada orden propia de tipo `LAB`, `IMAGING` o `PROCEDURE` muestra el mismo botón, ya sea asociada a un registro o independiente. `REFERRAL` queda sin impresión. `PrintPreviewDialog` carga el PDF autenticado como Blob, permite revisarlo, imprimirlo y descargarlo. El PDF se vuelve a generar con la configuración actual; la API valida acceso y autoría, y no imprime notas internas de órdenes.

## Composición de la aplicación

- `src/app/` contiene las páginas del App Router. La landing tiene `components/landing/`; las pantallas autenticadas se muestran dentro de `components/layout/app-shell.tsx` con sidebar y cabecera móvil. `AppShell` hace una comprobación de token en `localStorage` y redirige del lado cliente. La autorización real corresponde a la API.
- `components/providers.tsx` compone QueryClient, `ActiveModeProvider`, `ActiveProfileProvider` y toasts. La mayoría de páginas autenticadas usan `'use client'` y obtienen datos vía Axios/React Query.
- `src/lib/api.ts` crea el cliente Axios, adjunta `token` desde `localStorage` y en 401 intenta renovar con `refreshToken`, poniendo en cola peticiones simultáneas. Tras fallar la renovación, limpia tokens y redirige a login. Para archivos usa `getDocumentUrl`/`BACKEND_ORIGIN`.
- `src/lib/api.ts` también convierte los headers estándar de paginación de `/api/v1` mediante `getPaginationMeta` y `toPaginatedResult`; los contratos compartidos están en `src/types/pagination.ts`. `usePaginationState` centraliza `page`, `pageSize`, `skip`, reinicio por cambio de recurso o filtros y ajuste al disminuir el total. Los listados existentes todavía deben migrarse individualmente para dejar de paginar arreglos en memoria.
- `/auth/activate-assistant` lee el token del enlace enviado por correo, consulta `POST /auth/assistant-invitation/preview` y presenta creación de contraseña solo para una cuenta nueva. Una cuenta de asistente existente puede aceptar sin contraseña. `AppShell` permite abrir esta ruta aun cuando haya una sesión activa y `Providers` omite las consultas de perfil habituales en esta página pública; la API decide si el token es válido.
- `src/hooks/queries/` y `mutations/` contienen hooks de lectura/escritura. Cada cambio de datos debe revisar `queryKey` e invalidaciones relacionadas. Algunas páginas llaman a `api` directamente; sigue el patrón cercano cuando una extracción no aporte claridad.
- `src/hooks/useActiveProfile.tsx` mantiene el perfil activo (`numa_active_profile_id`) y usa el SELF como fallback. Al operar con un familiar, las llamadas correspondientes agregan `profile_id`.
- `src/hooks/useActiveMode.tsx` mantiene `clinical|patient` (`numa_active_mode`) para usuarios clínicos. `RoleSwitcher` y `Sidebar` muestran la navegación acorde al rol y al modo. Con el cambio de modo médico desactivado, el modo efectivo de `DOCTOR` siempre es `clinical`. Esto es estado de interfaz, no permiso del servidor.
- `src/types/index.ts` define tipos compartidos del cliente. Los contratos verdaderos están en `backend/app/schemas/`; al cambiar uno, sincroniza ambos lados.

## Funciones y componentes reutilizables

| Lugar | Función |
| --- | --- |
| `components/records/`, `components/search/` | Tarjetas, tabla, detalle, log de vistas y búsqueda de registros. |
| `components/clinical/` | Formularios y visualización de signos vitales, recetas y órdenes clínicas. |
| `components/patient/` | Selector de perfil, estado de salud, ubicaciones y banners. |
| `components/doctor/` | Crear paciente, información clínica, claims, invitaciones y permisos de asistentes. |
| `components/ui/` | Controles base, modales, toasts, selectores, paginación y carga de documentos. Revísalos antes de crear otro componente. |
| `hooks/useMedicalRecordForm.ts` | Estado del formulario de registro. |
| `hooks/use-voice-input.ts`, `lib/speech-recognition.ts` | Dictado Web Speech API en formularios compatibles. |
| `hooks/useProductTour.ts` | Recorrido guiado con Driver.js. |
| `hooks/usePaginationState.ts`, `types/pagination.ts` | Estado y contrato compartidos para paginación de listas respaldada por la API. |
| `lib/dateUtils.ts`, `prescriptionOptions.ts`, `vitalSignsRanges.ts` | Fechas y opciones/rangos clínicos usados por la UI. |

## Integración y cautelas

- Las vistas de paciente y médico usan endpoints distintos para recursos parecidos. Selecciona el prefijo correcto (`/profiles/patient`, `/hx`, `/doctor/patients/{id}`) y envía el perfil o paciente esperado.
- La web almacena tokens en `localStorage`. El render de una ruta pública o autenticada se decide en cliente dentro de `AppShell`; no presupongas protección de middleware o SSR.
- La página pública `/shared/[token]` usa `GET /shared/{token}`; la variante de resumen consulta también el detalle de registros autorizados por el token.
- Si cambias la lógica de refresh, revisa las peticiones concurrentes y las rutas excluidas. Si cambias URLs de archivos, revisa modo R2 y modo local.
- El código contiene algunos patrones no uniformes y páginas largas. Mantén consistencia con el área que edites y extrae piezas cuando mejore el cambio específico.
