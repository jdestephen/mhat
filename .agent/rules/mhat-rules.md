---
trigger: always_on
---

# .antigravity — React Native + Next.js rules

## Project context
You are working in a TypeScript codebase that includes:
- React Native app (mobile)
- Next.js app (web)
- Fast Api as backend

Primary goals:
- readable, consistent code
- predictable folder structure
- type-safety first
- accessible UI
- performance-safe defaults

## Global rules (apply everywhere)
- Use TypeScript for all new code (.ts/.tsx). No `any`. Prefer `unknown` + type guards.
- Prefer functional components + hooks. No class components.
- Prefer named exports (avoid default exports except Next.js route/page conventions when necessary).
- Use `async/await` (avoid `.then()` chains).
- Keep functions small. If a component exceeds ~200 lines, extract subcomponents/hooks.
- Avoid side effects in render. Side effects go in `useEffect` / server actions / route handlers.
- Never duplicate business logic: extract to `/src/lib` (web) or `/src/shared` (mobile) or a shared package.
- Add JSDoc only when the “why” isn’t obvious (don’t narrate the code).

## Formatting & linting (agent must follow)
- Follow ESLint + Prettier output exactly.
- Import order:
  1) react / react-native / next
  2) third-party libs
  3) internal absolute imports
  4) relative imports
- Use single quotes where possible. Trailing commas. No unused vars/imports.

## Naming conventions
- Components: PascalCase (UserCard.tsx)
- Hooks: useSomething (useAuth.ts)
- Functions/vars: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/interfaces: PascalCase (User, UserDTO)
- Files:
  - components in PascalCase when they export a component
  - utilities in camelCase

## Folder conventions
### Next.js (web)
- App Router structure:
  - src/app/** for routes
  - src/components/** for UI
  - src/lib/** for server/client helpers
  - src/styles/** if needed
- Keep route logic thin; move reusable UI to components and logic to lib.

### React Native (mobile)
- src/screens/** for screens
- src/components/** for reusable UI
- src/navigation/** for navigators + route types
- src/lib/** for API/storage/helpers
- src/hooks/** for hooks
- src/assets/** for images/fonts

## React rules (shared)
- Props must be typed. Components must have explicit prop types.
- Prefer composition over “mega props”.
- Derived state should be computed, not stored.
- Memoize only when needed; do not cargo-cult `useMemo/useCallback`.
- All lists require stable keys.
- Handle loading/error/empty states explicitly.

---

# React Native rules
## UI & styling
- Prefer StyleSheet (or your chosen styling system) consistently; avoid scattered inline styles.
- Use a spacing/typography scale (design tokens) instead of random numbers.
- Use Safe Area where needed. Respect notch/home indicator.
- Touch targets must be comfortable; don’t make tiny buttons.

## Performance
- Use FlatList/SectionList for long lists (never map huge arrays into Views).
- Avoid anonymous inline functions inside render for list items if it causes re-renders.
- Images:
  - specify width/height when possible
  - use proper resizeMode
- Minimize re-renders:
  - split components
  - keep state close to where it’s used

## Platform behavior
- Use Platform.select or *.ios.tsx / *.android.tsx for platform-specific code.
- Never assume permissions exist—request and handle denial gracefully.

## Navigation
- Route params must be typed.
- Screens should not directly call low-level storage/network; use services/hooks.

## Accessibility
- Provide accessibilityLabel / accessibilityRole for interactive elements.
- Ensure readable contrast and scalable text.

---

# Next.js rules
## Server vs client
- Default to Server Components. Use `"use client"` only when necessary.
- Client Components:
  - must not import server-only modules
  - keep them small and UI-focused
- Prefer doing data fetching on the server (Route Handlers / Server Actions / server utilities).

## Routing & data
- Use route handlers for API endpoints.
- Validate inputs on the server (never trust the client).
- Prefer typed schemas (e.g., Zod) for request/response boundaries.

## UI conventions
- Use `next/link` for navigation.
- Use `next/image` for images when appropriate.
- Create reusable components in `src/components`.
- Add metadata (title/description) for main routes where it matters.

## Env & secrets
- Never expose secrets to the client.
- Only variables prefixed with NEXT_PUBLIC_* may be used in client code.
- Centralize env access in a small `src/lib/env.ts` module.

## Performance
- Avoid heavy client bundles:
  - keep dependencies server-side when possible
  - dynamically import rare client-only components
- Prefer streaming/loading states via route-level loading UI when appropriate.

---

# Testing & quality gates
- Add tests for critical logic (utils/services) and key UI flows.
- For bug fixes: add a regression test when reasonable.
- Do not merge code with TypeScript errors or failing tests.

# Output expectations for the agent
When generating code, always:
- match existing patterns in the repo
- keep diffs minimal
- include usage examples when introducing new utilities/components
- explain any non-obvious decision in 1–2 sentences in comments (max)

# Python / FastAPI backend rules


## Python standards
- Use Python 3.11+ style (type hints everywhere).
- Format: Black. Lint: Ruff. Import sorting: Ruff (or isort). Type check: mypy (or pyright).
- Prefer `pathlib` over `os.path` and f-strings over `.format()`.
- No implicit `Optional`: be explicit in types.
- Avoid `Any`. Use precise types or `unknown`-style patterns (`Protocol`, `TypedDict`, `Literal`, type guards).

## Project structure (recommended)
- app/
  - main.py (create_app, include routers)
  - api/ (routers, request/response models close to routes)
  - core/ (settings, logging, security)
  - db/ (session, models, migrations hooks)
  - services/ (business logic)
  - repos/ (data access layer)
  - schemas/ (Pydantic models, if not colocated)
  - tests/

## FastAPI conventions
- Always define `response_model` for endpoints.
- Use Pydantic (v2) models for validation at the boundary:
  - request bodies, query params, and responses must be typed/validated
- Use routers + tags:
  - `api/v1/...` versioning
  - group routes by feature (auth, users, items, etc.)
- Use dependency injection (`Depends`) for:
  - DB session
  - auth/user context
  - feature flags / settings access
- Prefer `HTTPException` with clear status codes + messages.
- Never leak internal exception details to clients. Log full stack traces server-side.

## Async + performance
- If your route is `async`, do not call blocking IO inside it.
- Use async DB driver if you go async end-to-end; otherwise keep routes `def` and use sync DB safely.
- Do not perform heavy CPU work inside request handlers; move to background workers if needed.

## Database rules (if using SQLAlchemy)
- Use a single place for session creation and lifecycle.
- Each request gets its own session (via dependency).
- All schema changes must have migrations (Alembic).
- No raw SQL strings unless necessary; prefer SQLAlchemy core/ORM with parameterization.
- Never build SQL by string concatenation.

## Security rules (important)
- Validate *everything* at the API boundary (Pydantic + explicit checks).
- Use auth dependencies:
  - token parsing/verification in `core/security.py`
  - routes never manually decode tokens inline
- Secrets:
  - never hardcode secrets/keys
  - use environment variables
  - only expose safe config
- CORS:
  - allow only known origins (your Next.js domain + Expo dev origins as needed)
- Rate limit or protect sensitive endpoints when possible (login, password reset, etc.).

## Config / settings
- Use `pydantic-settings` for `Settings`.
- `Settings` is the only source of truth for env vars.
- Provide sane defaults for dev, strict requirements for prod.
- No direct `os.environ[...]` scattered across the codebase.

## Logging & observability
- Use structured logging (at least consistent fields: request_id, user_id when available).
- Log errors once (don’t spam).
- Add middleware for request timing + request_id if useful.

## Testing rules
- Pytest for tests.
- Unit test services and repos; minimal “happy path + edge cases”.
- For API tests: use FastAPI TestClient (or httpx AsyncClient).
- Every bug fix should ideally add a regression test.

## API contract rules (Expo / Next.js clients)
- Return consistent error shape (e.g., `{ "detail": "...", "code": "..." }`).
- Do not change response fields without updating clients.
- Prefer pagination for list endpoints.
- Prefer ISO 8601 timestamps in UTC.

## Expo-specific integration notes
- Never hardcode API URLs in the app:
  - use env-based config (Expo config / EAS secrets) and a single API client module.
- Backend must support mobile realities:
  - token refresh flow
  - offline-friendly endpoints where possible
  - idempotent writes when reasonable

