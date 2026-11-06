# Numa

Numa es una aplicación de historial médico digital con API FastAPI, web Next.js y un prototipo móvil Expo. `mhat` es el nombre histórico del repositorio. Este proyecto es independiente de ISIS.

## Contexto para desarrollo

Empieza en [AGENTS.md](AGENTS.md). Los documentos de [docs/context](docs/context/PROJECT.md) describen producto, API, web y estado móvil según el código actual.

## Desarrollo local

- `pnpm dev:backend`: PostgreSQL y API con Docker Compose (`localhost:8000`).
- `pnpm dev:web`: web Next.js (`localhost:3000`).
- `pnpm dev:mobile`: Expo.

Configura las variables locales que requieren `docker-compose.yml` y `backend/app/core/config.py`. La web utiliza `NEXT_PUBLIC_API_URL` con base `/api/v1`. Consulta [API.md](docs/context/API.md) para la arquitectura y los contratos existentes.
