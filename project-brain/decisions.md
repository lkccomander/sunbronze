# Decisions

## 2026-04-08

### Railway deployment and runtime configuration

- Chose Railway as the first public deployment target for the FastAPI backend because Phase 5.5 required a public HTTPS webhook URL for Meta.
- Chose to keep the Railway service rooted at `backend/` instead of the repo root so build and start commands stay focused on the backend package.
- Standardized the Railway backend build command to `pip install -r requirements.txt && pip install -e .` inside `backend/`.
- Standardized the Railway backend start command to `python -m uvicorn sunbronze_api.main:app --host 0.0.0.0 --port $PORT`.
- Added `backend/requirements.txt` so the Railway service root is self-contained and does not depend on the repo-root `requirements.txt`.
- Chose to support both `SUNBRONZE_DATABASE_URL` and Railway's native `DATABASE_URL` in application settings so local and hosted environments can share the same code path.
- Chose to use an explicit `postgresql+psycopg://` connection string in Railway so SQLAlchemy uses `psycopg` instead of defaulting to `psycopg2`.
- Chose to set production-oriented runtime variables in Railway rather than in the local `.env`, especially `SUNBRONZE_ENV=production` and `SUNBRONZE_DEBUG=false`.

### Phase 5.5 Meta WhatsApp integration

- Chose to keep the local mock webhook at `/api/whatsapp/webhook` for tests and add a separate provider-compatible path at `/api/whatsapp/meta/webhook` for Meta Cloud API traffic.
- Chose Meta WhatsApp Cloud API as the first real provider integration path instead of introducing Twilio.
- Added support for Meta webhook subscription verification using `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- Added provider configuration through environment variables for verify token, access token, phone number id, and Graph API version.
- Chose to start with Meta's test number flow before migrating a real business number, because it is safer and faster to validate end-to-end behavior.
- Chose to use the Meta developer console flow at `https://developers.facebook.com/apps/1695547714807698/use_cases/customize/wa-dev-console/?use_case_enum=WHATSAPP_BUSINESS_MESSAGING&product_route=whatsapp-business&business_id=924671457108486&selected_tab=wa-dev-console` as the operator-facing setup path for this project.
- Chose to capture Meta outbound error response bodies in the database so provider-side failures can be diagnosed from application data instead of from generic HTTP status text alone.

### Security hardening

- Fixed the critical auth bypass where active `system_users` with `password_hash = NULL` could log in without a real password.
- Chose to seed local staff users with a real SHA-256 password hash for the known test password `phase4-runtime` so runtime auth tests remain deterministic.
- Temporarily deactivated Railway `system_users` with null password hashes until real password hashes were set.
- Protected sensitive WhatsApp staff surfaces with auth:
  - `GET /api/whatsapp/messages`
  - `GET /api/whatsapp/conversations`
  - `POST /api/whatsapp/reminders/process`
- Chose not to switch to JWT yet; current auth remains in-memory bearer tokens while Phase 5.5 and Phase 6 move forward.

### Phase 6 frontend stack

- Chose `Next.js` with `TypeScript` for the frontend.
- Chose to place the frontend in a new top-level `frontend/` workspace so it stays clearly separated from the FastAPI backend.
- Chose the App Router approach so the receptionist/admin interface can mix server-rendered pages with client-side interaction where needed.
- Chose to start with a web admin/receptionist interface rather than a mobile app because the current priority is staff operations, conversations, and schedule management.
- Chose to keep styling simple and productive at the start with `Tailwind CSS`, while avoiding heavy component-library lock-in until the first screens are stable.
- Chose `fetch`-based API integration first instead of introducing a large client-state library on day one; we can add one later if the frontend data flows become complex.

### Data migration and runtime testing

- Chose `pg_dump -f` instead of PowerShell redirection when exporting the local Postgres database for Railway, because PowerShell output redirection produced an invalid encoded SQL dump.
- Chose to keep two kinds of runtime verification in the project:
  - in-process FastAPI `TestClient` checks for app-level runtime behavior
  - live API checks against the actual running server for deployment verification
- Added dedicated live API checks once the backend was public so deployment/runtime issues are separated from in-process test behavior.

### Phase 1 backend stabilization

- Added database connectivity verification to `GET /api/health` by running a lightweight `SELECT 1` probe against the configured Postgres database.
- Chose to keep migrations SQL-first for now, using versioned scripts in `DB/` instead of introducing Alembic during Phase 1.
- Chose to keep FastAPI dependencies explicit with `fastapi` plus `uvicorn[standard]` instead of switching to `fastapi[standard]`.
- Avoided `fastapi dev` in local startup scripts because the project does not rely on the optional FastAPI CLI extras; `uvicorn` is already installed and is sufficient to boot the app.
- Kept FastAPI boot verification as an open item until it is confirmed from the project Windows environment.
- Kept the original local Phase 5 webhook contract for tests and added a separate Meta-compatible webhook path at `/api/whatsapp/meta/webhook` so real phone/provider integration does not destabilize the in-process test suite.

## 2026-04-07

### Workspace and tooling

- Standardized the workspace to use the Windows virtual environment at `C:\Projects\sunbronze\.venv\Scripts\python.exe`.
- Added local VS Code settings to reduce Ruff language server crashes caused by a Windows/WSL interpreter mismatch.
- Verified that recent Ruff logs no longer show `EPIPE` or `exit code 1` failures.

### Database and documentation

- Used `DB/001_initial_postgres_schema.sql` as the source of truth for backend structure.
- Created an entity relationship diagram in Excalidraw at `project-brain/sunbronze-er-diagram.excalidraw`.
- Chose to keep the ER diagram focused on entities and foreign-key relationships, while leaving triggers, enums, and exclusion constraints documented in SQL instead of overloading the diagram.

### Backend architecture

- Chose FastAPI for the backend framework.
- Chose SQLAlchemy 2.0 style ORM models for database mapping.
- Organized the backend under `backend/src/sunbronze_api/` with these layers:
  - `api/` for routers
  - `core/` for configuration
  - `db/` for engine, base, and session
  - `models/` for ORM entities and enums
  - `schemas/` for request and response contracts
  - `services/` for business logic

### Backend implementation completed today

- Created the backend scaffold in `backend/`.
- Added environment-based settings and a local `.env.example`.
- Added a health endpoint at `GET /api/health`.
- Added ORM models aligned to the current Postgres schema.
- Added the first real domain module for appointments:
  - `GET /api/appointments`
  - `GET /api/appointments/{appointment_id}`
  - `POST /api/appointments`

### Booking rules already enforced

- Appointment creation validates that referenced `customer`, `service`, `barber`, `resource`, and `conversation` records exist.
- Service rules are enforced for:
  - barber-required services
  - resource-required services
  - services that do not use a barber
- Appointment duration defaults from the selected service.
- Barber-specific custom duration is supported through `barber_services`.
- Reserved time windows are computed from service buffer settings.

### Short-term product direction

- Backend comes first.
- Frontend will start after the backend exposes enough stable reference and booking endpoints.
- Immediate backend priorities are reference data endpoints, booking logic, auth, and WhatsApp integration.
