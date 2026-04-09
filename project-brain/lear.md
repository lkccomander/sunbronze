# Lessons Learned

## 2026-04-08

### What we completed today

- Deployed the FastAPI backend publicly on Railway.
- Migrated the Postgres database to Railway and verified runtime DB connectivity with `/api/health`.
- Completed real Meta WhatsApp Cloud API integration through the public Railway webhook.
- Verified a real WhatsApp test-number flow end to end and confirmed persistence in the application database.
- Started Phase 6 with a new `frontend/` workspace using Next.js, TypeScript, and Tailwind.
- Hardened several API security gaps that appeared during public deployment.

### Key lessons learned

#### Railway deployment

- Railway service root matters. Because the backend service was rooted at `backend/`, the start command must not use `cd backend`.
- A self-contained `backend/requirements.txt` made Railway installs more reliable than depending on the repo-root `requirements.txt`.
- Railway's default Postgres URL can arrive as `postgresql://...`; SQLAlchemy then tries `psycopg2`. For this app, the deployed connection string must use `postgresql+psycopg://...`.
- Public runtime checks should not be inferred from local success. A deployed `/api/health` check quickly exposed environment and database issues.

#### Database migration

- In PowerShell, `pg_dump ... > file.sql` produced a dump that `psql` could not read because of encoding problems.
- The safe export pattern is:

```powershell
pg_dump --clean --if-exists --no-owner --no-privileges -U postgres -d sunbronze -f .\sunbronze_dump.sql
```

- Command-line `psql` queries were a more reliable source of truth than the Railway web table viewer during import verification.

#### Runtime testing

- In-process runtime tests and live API tests answer different questions:
  - FastAPI `TestClient` proves the app behaves correctly in memory.
  - Live API tests prove the deployed service, network path, and public configuration actually work.
- Keeping both types of tests helped isolate whether a problem was in code, data, or deployment.

#### Security

- Public deployment immediately exposed a critical auth flaw: active users with `password_hash = NULL` could log in without a real password.
- Sensitive WhatsApp data routes must be protected once the API is internet-facing.
- `.local` staff seed emails were useful for local realism, but they do not work well with strict `EmailStr` validation in this workflow.
- Public-provider integrations need better diagnostics. Capturing real Meta response bodies in `error_message` made troubleshooting practical.

#### WhatsApp provider setup

- Meta's test number flow is the fastest and safest way to validate the integration before migrating a real business number.
- A personal or business number already registered with WhatsApp cannot be attached directly to Cloud API without migration or disconnection first.
- Callback verification should be tested manually before saving in Meta.

Manual verification pattern:

```text
https://<your-railway-domain>/api/whatsapp/meta/webhook?hub.mode=subscribe&hub.verify_token=<your-token>&hub.challenge=12345
```

Expected response:

```text
12345
```

### Decisions reinforced today

- Keep the local test webhook and the Meta webhook separate.
- Use Railway as the first public deployment environment.
- Use Meta WhatsApp Cloud API directly instead of adding another provider layer first.
- Use the Meta test number before attempting a real number migration.
- Defer JWT migration until after the public webhook and frontend foundation are stable.

## Process: Set up WhatsApp Cloud API for SunBronze

This documents the exact operator flow used for this project.

### Required operator console

Use the Meta developer console path below for this app:

`https://developers.facebook.com/apps/1695547714807698/use_cases/customize/wa-dev-console/?use_case_enum=WHATSAPP_BUSINESS_MESSAGING&product_route=whatsapp-business&business_id=924671457108486&selected_tab=wa-dev-console`

Reference material used alongside it:

- [Meta Cloud API overview](https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview)

### 1. Prepare the backend

The deployed backend must already expose:

- `GET /api/whatsapp/meta/webhook`
- `POST /api/whatsapp/meta/webhook`

The deployed backend must also be healthy:

- `GET /api/health` returns `"database": "ok"`

### 2. Deploy the backend publicly on Railway

Backend Railway service settings used here:

- service root: `backend`
- build command:

```bash
pip install -r requirements.txt && pip install -e .
```

- start command:

```bash
python -m uvicorn sunbronze_api.main:app --host 0.0.0.0 --port $PORT
```

Production Railway variables to set:

```text
SUNBRONZE_ENV=production
SUNBRONZE_DEBUG=false
SUNBRONZE_DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:<port>/<db>
```

### 3. Set Meta WhatsApp variables in Railway

Add these backend variables:

```text
SUNBRONZE_WHATSAPP_META_VERIFY_TOKEN=<your-random-shared-secret>
SUNBRONZE_WHATSAPP_META_ACCESS_TOKEN=<meta-access-token>
SUNBRONZE_WHATSAPP_META_PHONE_NUMBER_ID=<meta-phone-number-id>
SUNBRONZE_WHATSAPP_META_GRAPH_API_VERSION=v23.0
```

Notes:

- `SUNBRONZE_WHATSAPP_META_VERIFY_TOKEN` is created by us, not by Meta.
- `SUNBRONZE_WHATSAPP_META_ACCESS_TOKEN` and `SUNBRONZE_WHATSAPP_META_PHONE_NUMBER_ID` come from the Meta WhatsApp dashboard.

### 4. Configure the webhook in Meta

In the Meta console, set:

- Callback URL:

```text
https://<your-railway-domain>/api/whatsapp/meta/webhook
```

- Verify token:

```text
<the exact SUNBRONZE_WHATSAPP_META_VERIFY_TOKEN value from Railway>
```

Before pressing Verify and save, test the callback manually with the `hub.challenge` URL pattern above.

### 5. Subscribe the required webhook field

Subscribe to:

- `messages`

That is the critical field for inbound message delivery and message-status events in this project flow.

### 6. Use the Meta test number first

Recommended first validation path:

- keep Meta's provided test business number
- add your own personal phone as the allowed test recipient
- send a test message from the Meta dashboard

Why:

- this avoids early migration risk with a real business number
- it validates webhook reception and outbound replies first

### 7. Validate persistence in SunBronze

After sending a test message, verify:

- the webhook request reaches Railway
- a conversation is created or updated
- inbound and outbound messages are persisted in `app.whatsapp_messages`

Useful checks:

- `GET /api/whatsapp/messages`
- `GET /api/whatsapp/conversations`

These are staff-protected, so authenticate first.

### 8. Troubleshoot outbound delivery

If the inbound webhook works but replies fail:

- inspect `app.whatsapp_messages.error_message`
- confirm the access token is valid
- confirm the phone number id belongs to the correct Meta app/WABA
- confirm the destination is allowed for the current test setup

Example SQL:

```sql
SELECT created_at, status, provider_message_id, body, error_message
FROM app.whatsapp_messages
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
```

### 9. Delay real-number migration until stable

If Meta says a phone number is already registered to WhatsApp, do not rush the migration.

Safer order:

1. finish the integration with the Meta test number
2. confirm inbound and outbound behavior
3. only then decide whether to migrate a real business number into Cloud API

## Follow-up security work still recommended

- Replace SHA-256 password hashing with Argon2 or bcrypt.
- Replace in-memory bearer tokens with signed, expiring JWT or another durable session mechanism.
- Restrict or disable the local mock webhook on public deployments.
- Add Meta webhook signature verification on POST requests.
