# SunBronze Backend

FastAPI backend scaffold for the WhatsApp receptionist and barber scheduling platform.

## Run locally

1. Create and activate a Python virtual environment.
2. Install the project:

```bash
pip install -e .
```

3. Copy the environment file:

```bash
cp .env.example .env
```

4. Start the API:

```bash
python -m uvicorn sunbronze_api.main:app --host 127.0.0.1 --port 8000 --reload
```

## Health checks

- `GET /api/health` returns app metadata and verifies database connectivity with `SELECT 1`.
- When Postgres is unavailable, the endpoint responds with HTTP `503` and `"database": "unavailable"`.

## Migration approach

For Phase 1, migrations stay SQL-first using versioned scripts in [`DB/`](../DB) instead of Alembic. This matches the existing schema source of truth and keeps backend work aligned with the hand-maintained Postgres design.

## Initial modules

- `api/`: HTTP routers
- `core/`: app settings
- `db/`: SQLAlchemy base and session
- `models/`: ORM models aligned to the Postgres schema
