# MHAT — Contexto de la Web App

> **Lectura previa requerida**: [PROJECT.md](./PROJECT.md) — contiene los patrones transversales (multi-perfil, acceso médico, verificación, claims, sharing) que esta app implementa en su interfaz.

## Stack Tecnológico

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **Next.js** | 16.1 | Framework web (App Router) |
| **React** | 19.2 | Librería de UI |
| **TailwindCSS** | v4 | Estilos (via `@tailwindcss/postcss`) |
| **TanStack React Query** | v5 | Data fetching, cache, mutations |
| **Axios** | ≥1.13 | HTTP client con interceptors |
| **Lucide React** | ≥0.562 | Iconografía |
| **date-fns** | v4 | Formateo y manipulación de fechas |
| **Driver.js** | v1.4 | Product tour / onboarding guiado |
| **Leaflet** | v1.9 | Mapas interactivos para ubicaciones |
| **clsx + tailwind-merge** | — | Utilidades para clases CSS condicionales |

---

## Estructura del Proyecto

```
apps/web/src/
├── app/                          → Rutas (Next.js App Router)
│   ├── layout.tsx                → Root layout (providers globales)
│   ├── page.tsx                  → Landing / redirect
│   ├── globals.css               → Estilos globales + tema TailwindCSS
│   ├── auth/                     → Flujo de autenticación
│   ├── onboarding/               → Onboarding post-registro
│   ├── dashboard/                → Panel principal del paciente
│   ├── records/                  → Crear/ver registros médicos
│   ├── profile/                  → Perfil, historial de salud, acceso médico, links compartidos
│   ├── doctor/                   → Dashboard y pacientes del médico
│   ├── family/                   → Crear miembros familiares
│   ├── admin/                    → Gestión de solicitudes de médicos
│   └── shared/                   → Vista pública de registros compartidos
├── components/
│   ├── ui/                       → Componentes base reutilizables
│   ├── layout/                   → AppShell, Sidebar, MobileHeader
│   ├── clinical/                 → Formularios clínicos (órdenes, prescripciones, vitales)
│   ├── records/                  → RecordCard, RecordDetailModal, RecordsTable
│   ├── patient/                  → ProfileSwitcher, HealthSidebar, LocationManager
│   ├── doctor/                   → CreatePatientModal, PatientInfoBanner, ClaimRequests
│   ├── share/                    → ShareRecordDialog
│   ├── search/                   → RecordSearchBar
│   ├── landing/                  → Hero, Features, HowItWorks, Footer, Navbar
│   ├── onboarding/               → WelcomeCard, ProfileCompletionBanner
│   └── providers.tsx             → Composición de providers
├── hooks/
│   ├── queries/                  → React Query hooks de lectura
│   ├── mutations/                → React Query hooks de escritura
│   ├── useActiveProfile.tsx      → Context + hook para perfil activo (multi-perfil)
│   ├── useMedicalRecordForm.ts   → Hook para formulario de registro médico
│   ├── useOnboardingStatus.ts    → Estado del onboarding
│   ├── useProductTour.ts         → Tour guiado con Driver.js
│   └── use-voice-input.ts       → Dictado por voz (Web Speech API)
├── lib/
│   ├── api.ts                    → Cliente Axios con interceptors (token, refresh, redirect)
│   ├── dateUtils.ts              → Formateo de fechas
│   ├── prescriptionOptions.ts    → Opciones para formularios de prescripción
│   ├── vitalSignsRanges.ts       → Rangos normales de signos vitales
│   ├── speech-recognition.ts     → Tipos y helpers para Web Speech API
│   ├── utils.ts                  → Utilidad cn() (clsx + tailwind-merge)
│   └── react-query/
│       └── queryClient.ts        → Configuración del QueryClient
├── types/
│   └── index.ts                  → Tipos e interfaces TypeScript compartidos
└── providers/
    └── QueryProvider.tsx          → Provider de React Query
```

---

## Páginas y Rutas

### Autenticación (`/auth`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/auth/login` | Inicio de sesión | Formulario email/contraseña |
| `/auth/register` | Registro de usuario (paciente o doctor) | Formulario multi-paso, selección de rol |
| `/auth/verify-email` | Verificación de email | Pantalla de token |
| `/auth/forgot-password` | Solicitar reset de contraseña | Formulario de email |
| `/auth/reset-password` | Resetear contraseña con token | Formulario nueva contraseña |

### Onboarding (`/onboarding`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/onboarding` | Flujo multi-paso post-registro | `WelcomeCard`, formulario de perfil, condiciones, alergias, medicamentos |

El onboarding detecta si el perfil está completo vía `useOnboardingStatus` y redirige al dashboard cuando se completa.

### Panel del Paciente (`/dashboard`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/dashboard` | Vista principal: registros médicos con filtros, búsqueda, categorías + signos vitales recientes | `RecordsTable`, `RecordCard`, `RecordDetailModal`, `RecordSearchBar`, filtros por categoría/fecha |
| `/dashboard/vital-signs` | Historial de signos vitales con tabla y gráficos | `VitalSignsForm` |

### Registros Médicos (`/records`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/records/new` | Crear registro médico | Formulario completo: motivo, categoría, diagnósticos, notas, tags |
| `/records/[id]` | Detalle de registro (vista/edición) | `RecordDetailModal` |

### Perfil (`/profile`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/profile/me` | Perfil personal del usuario | Tabs: `PatientProfileForm` / `DoctorProfileForm`, `PersonalReferencesTab`, `ChangePasswordForm` |
| `/profile/health-history` | Historial de salud completo | Layout 1:3 con `PersonalInfoSidebar` sticky + tabs: Medicamentos, Alergias, Condiciones, Cirugías, Vacunas, Hábitos, Antecedentes Familiares |
| `/profile/doctor-access` | Gestión de acceso médico | Lista de médicos con acceso, crear/revocar invitaciones, acceso por nivel |
| `/profile/shared-links` | Links de historial compartidos | Lista de links activos/expirados/revocados, crear nuevo link |

### Panel del Médico (`/doctor`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/doctor` | Dashboard médico: lista de pacientes, reclamar invitaciones, claims pendientes | `ClaimRequestsPanel`, `CreatePatientModal`, búsqueda/filtros de pacientes |
| `/doctor/patients/[id]` | Ficha detallada de paciente | `PatientInfoBanner` (HUD demográfico), registros, órdenes, vitales |
| `/doctor/patients/[id]/records/new` | Crear registro médico para paciente | Formulario clínico completo: diagnósticos, prescripciones, órdenes, vitales |
| `/doctor/patients/[id]/records/new-tabbed` | Versión con tabs del formulario | Variante UI alternativa |
| `/doctor/patients/[id]/records/[recordId]` | Editar registro existente | `RecordDetailModal`, `RecordSlideModal` |
| `/doctor/patients/[id]/health-history` | Historial de salud del paciente (doctor view) | Tabs con CRUD completo de datos de salud |

### Familia (`/family`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/family/new` | Crear nuevo miembro familiar | Formulario: nombre, fecha de nacimiento, tipo de relación, color |

### Admin (`/admin`)

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/admin/doctors` | Gestión de solicitudes de médicos | Lista con estado, detalle, aprobar/rechazar |

### Vista Pública — Shared (`/shared`)

| Ruta | Descripción | Auth |
|------|-------------|------|
| `/shared/[token]` | Vista de registros compartidos | ❌ Público |
| `/shared/[token]/summary` | Resumen médico compartido | ❌ Público |

---

## Patrones Arquitectónicos de la Web App

### 1. Cliente API con Auto-Refresh

El archivo `lib/api.ts` configura un cliente Axios con:
- **Interceptor de request**: inyecta `Bearer {token}` desde localStorage
- **Interceptor de response**: en 401, intenta refresh automático con cola de requests pendientes
- **Redirect a login**: si el refresh falla, limpia tokens y redirige a `/auth/login`
- **Prevención de loops**: flag `isRedirecting` evita múltiples redirects simultáneos

Tokens se almacenan en `localStorage`:
- `token` → access token
- `refreshToken` → refresh token

### 2. Profile Switching (Multi-Perfil)

`useActiveProfile` es un Context + hook que gestiona el perfil activo:

- Almacena el `activeProfileId` en `localStorage` (key: `numa_active_profile_id`)
- Provee: `activeProfileId`, `activeProfile`, `isManagingOther`, `profiles`, `isLoading`
- Fallback automático a perfil SELF si el ID almacenado es inválido
- `ProfileSwitcher` en el sidebar permite cambiar entre perfiles

Todos los queries de datos de paciente envían `?profile_id=` cuando se está gestionando un perfil que no es SELF.

### 3. Data Fetching (React Query)

**Queries** (`hooks/queries/`): hooks de lectura con convenciones consistentes:
- `useCurrentUser` — usuario autenticado
- `usePatientProfiles` — perfiles accesibles
- `usePatientProfile` — perfil individual
- `usePatientRecords` — registros médicos
- `usePatientHealth` — perfil de salud completo
- `useMyDoctors` — médicos con acceso
- `useMyInvitations` — invitaciones activas
- `useMyPatients` — pacientes del doctor
- `usePatientOrders` — órdenes clínicas
- `useClaimRequests` — solicitudes de vinculación
- `useCategories` — categorías de registros
- `useOrderOptions` — opciones de órdenes clínicas
- `useAuthConfig` — configuración de auth

**Mutations** (`hooks/mutations/`): hooks de escritura con invalidación de cache:
- `useCreateMedicalRecord`, `useUpdatePatientRecord`
- `useCreateDoctorRecord`, `useUpdateDoctorRecord`
- `useUploadDocument`
- `useCreatePatient` (doctor crea paciente)
- `useGrantAccess`, `useRevokeDoctorAccess`, `useUpdateAccessLevel`
- `useCreateInvitation`, `useClaimInvitation`, `useRevokeInvitation`
- `useCreateStandaloneOrder`
- `useVerifyRecord`

### 4. Sidebar con Menú por Rol

El sidebar se adapta al rol del usuario:

**Paciente**:
- Panel (dashboard)
- Nuevo Registro
- Perfil (submenú: Mi Perfil, Historial de Salud, Acceso Médico, Links Compartidos, Miembros Familiares)

**Doctor**:
- Panel Médico
- Perfil (submenú: Mi Perfil)

Características:
- Colapsable en desktop, overlay en mobile
- `ProfileSwitcher` integrado (solo pacientes)
- Logout con limpieza de tokens

### 5. Dictado por Voz (Web Speech API)

Hook `use-voice-input.ts` que usa `webkitSpeechRecognition`:
- Idioma: `es-419` (español latinoamérica)
- Resultados continuos e interinos
- Integrado en: `InputWithVoice`, `TextareaWithVoice` (componentes UI)
- Usado en: notas de registros, instrucciones de medicamentos, reacciones de alergias

### 6. Product Tour (Driver.js)

Hook `useProductTour.ts` que gestiona un tour guiado del dashboard:
- Se activa automáticamente la primera vez (flag en localStorage)
- Steps configurables por elemento del DOM (via IDs)
- Estilizado con tema personalizado

### 7. Layout y Navegación

- `AppShell`: layout principal con sidebar + contenido
- `MobileHeader`: header responsive con botón hamburguesa para abrir sidebar
- La landing page (`/`) tiene su propio layout con `Navbar`, `Hero`, `Features`, `HowItWorks`, `Footer`
- Soporte multilenguaje en landing via `LanguageContext` (español/inglés)

---

## Componentes UI Reutilizables (`components/ui/`)

| Componente | Descripción |
|-----------|-------------|
| `Button` | Botón con variantes (primary, outline, danger, ghost) y tamaños |
| `Input` | Input de texto estilizado |
| `InputWithVoice` | Input con botón de dictado por voz integrado |
| `TextareaWithVoice` | Textarea con dictado por voz |
| `Select` | Select nativo estilizado |
| `SearchableSelect` | Select con búsqueda de texto |
| `MultiSelect` | Select múltiple con checkboxes y búsqueda |
| `Combobox` | Combobox avanzado con búsqueda, creación libre, y soporte async |
| `CatalogSearchSelect` | Select que busca en catálogos médicos del backend |
| `Autocomplete` | Input con sugerencias de autocompletado |
| `TagInput` | Input de tags (in-input tagging) |
| `Tabs` | Sistema de tabs con variantes |
| `Dialog` | Modal dialog |
| `Toast` | Sistema de notificaciones toast |
| `DateTimePicker` | Selector de fecha/hora |
| `DropdownMenu` | Menú desplegable contextual |
| `Pagination` | Paginación de tablas/listas |
| `Avatar` | Avatar con iniciales |
| `StatusBadge` | Badge de estado (VERIFIED, PENDING, etc.) |
| `EmptyState` | Estado vacío con ícono y mensaje |
| `PasswordStrengthBar` | Indicador de fortaleza de contraseña |
| `DocumentUpload` | Upload de documentos con preview |
| `VoiceButton` | Botón de grabación de voz |

---

## Componentes Clínicos (`components/clinical/`)

| Componente | Descripción |
|-----------|-------------|
| `VitalSignsForm` | Formulario completo de signos vitales (temperatura, FC, FR, PA, SpO2, peso, talla, IMC, glucosa, dolor) |
| `VitalSignsModal` | Modal contenedor del formulario de vitales |
| `PrescriptionForm` | Formulario de prescripción (medicamento, dosis, frecuencia, vía, cantidad, instrucciones) |
| `ClinicalOrderForm` | Formulario de orden clínica (tipo, items con selector pill, urgencia, razón, notas) |
| `ClinicalOrderModal` | Modal contenedor del formulario de órdenes |
| `ClinicalOrdersDisplay` | Display de órdenes existentes en un registro |
| `OrderPillSelector` | Selector de items de orden con pills agrupadas por categoría |

---

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL base del backend (e.g., `http://localhost:8000/api/v1`) |

> La web app es 100% client-side rendered para las páginas autenticadas. Solo la landing page y las vistas compartidas (`/shared/[token]`) podrían beneficiarse de SSR.
