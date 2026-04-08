# Decisions

## 2026-04-08

### Phase 1 backend stabilization

- Added database connectivity verification to `GET /api/health` by running a lightweight `SELECT 1` probe against the configured Postgres database.
- Chose to keep migrations SQL-first for now, using versioned scripts in `DB/` instead of introducing Alembic during Phase 1.
- Chose to keep FastAPI dependencies explicit with `fastapi` plus `uvicorn[standard]` instead of switching to `fastapi[standard]`.
- Avoided `fastapi dev` in local startup scripts because the project does not rely on the optional FastAPI CLI extras; `uvicorn` is already installed and is sufficient to boot the app.
- Kept FastAPI boot verification as an open item until it is confirmed from the project Windows environment.

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
