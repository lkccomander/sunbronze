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

## WhatsApp webhook modes

- `POST /api/whatsapp/webhook` is the local test-friendly webhook used by the Phase 5 suite.
- `GET /api/whatsapp/meta/webhook` is the Meta verification endpoint for a public deployment.
- `POST /api/whatsapp/meta/webhook` accepts Meta-style inbound webhook payloads.

To prepare for real phone testing, set these environment variables in `.env` or in Railway:

```env
SUNBRONZE_WHATSAPP_META_VERIFY_TOKEN=your_verify_token
SUNBRONZE_WHATSAPP_META_APP_SECRET=your_meta_app_secret
SUNBRONZE_WHATSAPP_META_ACCESS_TOKEN=your_meta_access_token
SUNBRONZE_WHATSAPP_META_PHONE_NUMBER_ID=your_phone_number_id
SUNBRONZE_WHATSAPP_META_GRAPH_API_VERSION=v23.0
```

`POST /api/whatsapp/meta/webhook` verifies `X-Hub-Signature-256` with the Meta app secret before parsing or processing the payload. Inbound Meta messages with an already-stored `provider_message_id` are skipped so duplicate delivery retries do not create duplicate conversations, messages, or auto-replies.

Then expose the public webhook URL:

```text
https://<your-domain>/api/whatsapp/meta/webhook
```

## Railway database migration

The app accepts either `SUNBRONZE_DATABASE_URL` or Railway's native `DATABASE_URL`.

Recommended migration flow:

1. Provision a PostgreSQL service in Railway.
2. Copy the Railway Postgres connection string.
3. Export the local database with `pg_dump`.
4. Import into Railway with `psql`.
5. Deploy the API service and let it use Railway's `DATABASE_URL`.

Example commands from Windows PowerShell:

```powershell
pg_dump --clean --if-exists --no-owner --no-privileges -U postgres -d sunbronze > sunbronze_dump.sql
psql "<RAILWAY_DATABASE_URL>" -f .\sunbronze_dump.sql
```

If the imported database is meant to include the barber test scenario, run the dedicated seed locally before dumping or run `DB/003_seed_barbertest.sql` against Railway after import.
