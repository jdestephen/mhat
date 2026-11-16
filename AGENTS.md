# Numa — instrucciones para Codex

## Identidad y alcance

- El producto se llama **Numa**. `mhat` y `MHAT` son nombres históricos del repositorio y de algunos recursos técnicos; no son el nombre actual del producto.
- Numa es un proyecto independiente de la consultora ISIS. No apliques objetivos, decisiones, convenciones ni contexto empresarial de ISIS por defecto. Una skill de terceros puede usarse aquí cuando sea pertinente, sin importar dónde se use también.
- Estas instrucciones gobiernan el repositorio completo. Antes de modificar una función, consulta el documento de contexto correspondiente y confirma los detalles en el código. El código y las migraciones prevalecen cuando un documento quede desactualizado.

## Mapa de contexto

| Trabajo | Leer |
| --- | --- |
| Entender el producto, roles, flujos o modelo de datos | [docs/context/PROJECT.md](docs/context/PROJECT.md) |
| Cambiar la API, base de datos o servicios | [docs/context/API.md](docs/context/API.md) |
| Cambiar la web o su integración con la API | [docs/context/WEB.md](docs/context/WEB.md) y API.md |
| Cambiar Expo/React Native | [docs/context/MOBILE.md](docs/context/MOBILE.md) y API.md |

## Forma de trabajo

- Mantén el cambio dentro del alcance solicitado y usa los patrones reales del área afectada. No reorganices código solo para ajustarlo a una arquitectura idealizada.
- En la API, valida autorización sobre el perfil y el recurso concreto. Los roles, las membresías familiares, el acceso médico y los permisos de asistentes no son equivalentes. Revisa `backend/app/api/deps.py` y `backend/app/api/endpoints/doctor/_helpers.py`.
- Para cambios de datos, crea una migración Alembic y actualiza modelos, esquemas y clientes afectados. Conserva el contrato `/api/v1` salvo que el cambio de versión sea explícito.
- En la web, reutiliza `src/lib/api.ts`, los hooks React Query y los componentes existentes. Incluye `profile_id` donde corresponda y revisa invalidaciones de caché al mutar datos.
- En móvil, distingue el prototipo actual de funcionalidad integrada. No supongas que las rutas `/documents` existen en la API.
- Protege secretos y datos clínicos. No incluyas contenido de `.env`, bases de datos locales, documentos subidos ni datos personales reales en documentación o salidas.
- Actualiza el contexto cuando cambies un flujo, contrato o decisión de arquitectura. Separa lo implementado de lo planeado y señala dudas verificables.

## Verificación práctica

- Web: `pnpm --filter web lint`, `pnpm --filter web build` o `pnpm --filter web exec tsc --noEmit`, según el cambio.
- Móvil: `pnpm --filter mobile lint` y `pnpm --filter mobile exec tsc --noEmit` cuando se trabaje allí.
- API: comprueba importaciones/rutas y ejecuta las pruebas existentes que correspondan; no hay una suite de pruebas de backend en este repositorio a la fecha de esta documentación.
- No describas una verificación como superada si no se ejecutó.
