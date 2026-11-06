# Numa: estado de la app móvil

Estado contrastado con `apps/mobile/app` el 6 de noviembre de 2026. Esta superficie es un prototipo Expo/React Native; no tiene paridad funcional con la web.

## Tecnología y estructura real

Expo 54, Expo Router 6, React Native 0.81, React Query, Axios y NativeWind. La navegación vive en `app/`, con grupos `(auth)`, `(app)` y `(tabs)`; hay componentes y hooks iniciales de Expo en `components/` y `hooks/`. No existe una estructura `src/screens` ni un cliente HTTP central compartido.

| Ruta/archivo | Estado |
| --- | --- |
| `app/index.tsx` | Redirige a login. |
| `app/(auth)/login.tsx` | Envía credenciales a `/auth/login`, pero descarta los tokens. Redirige al dashboard tras respuesta exitosa. |
| `app/(auth)/register.tsx` | Formulario simple que envía nombre, correo y contraseña a `/auth/register`; confirmar requisitos reales en `schemas/user.py`. |
| `app/(app)/dashboard.tsx` | Intenta listar `/documents`. Esa ruta no está registrada en la API actual. |
| `app/(app)/upload.tsx` | Captura o elige imagen e intenta enviarla a `/documents/upload`; tampoco existe esa ruta en la API actual. |
| `app/(tabs)/` | Pantallas de plantilla Expo, no una experiencia de Numa integrada. |

## Implicaciones para desarrollo

- Las pantallas usan `http://localhost:8000/api/v1` directamente. En dispositivo físico o emulador, `localhost` no suele apuntar a la máquina del backend. Antes de integrar funciones, configura una URL por entorno y un cliente HTTP único.
- El backend exige Bearer token para registros y documentos. La app móvil aún no guarda ni envía access/refresh tokens, ni implementa renovación o cierre de sesión.
- Los documentos de Numa se adjuntan a registros mediante `POST /hx/{record_id}/documents` (multipart), después de autenticar y seleccionar un perfil/registro. No existe una colección global `/documents` en la API.
- Para continuar el móvil, define primero flujo de autenticación, almacenamiento seguro de tokens, selección de perfil y contratos con los esquemas actuales. No describas las pantallas de documentos como funcionalidad operativa hasta conectarlas.
