# Welcome To Nicaragua Repo Bootstrap Guide

## Goal

Create a brand-new repository for the `Welcome to Nicaragua` WhatsApp receptionist MVP.

This repo should reuse the useful platform structure from `sunbronze` while avoiding all barber and appointment-specific business logic.

## MVP Product Shape

This is not a generic tours platform yet.

The first product is a focused system that:

- receives WhatsApp messages
- guides the user through a reservation flow
- checks preliminary availability against one shared Google Calendar
- creates a pre-reservation
- stores everything in PostgreSQL
- mirrors Google Calendar into the database
- notifies a human operator
- leaves every booking as `pending_human_confirmation`

## Recommendation

Use a brand-new Git repository with clean history.

Do not make the new app depend on `sunbronze` at runtime. Use `sunbronze` only as a source of reusable code patterns and structure.

## Suggested Repo Name

Use a client-specific product name.

Examples:

- `welcome-nicaragua-bot`
- `welcome-nicaragua-ops`
- `welcome-nicaragua-reception`

Examples below use:

- `welcome-nicaragua-bot`

## What To Reuse From Sunbronze

Reuse and adapt:

- `backend/`
- `frontend/`
- `.gitignore`
- local run scripts if still useful
- FastAPI app structure
- Next.js admin shell structure
- config/session/auth patterns
- WhatsApp webhook and sender patterns

Do not carry over as product logic:

- barber routes
- appointment logic
- staff scheduling assumptions
- salon assets and wording
- old legal content
- salon seed data
- salon tests

## Key Reference Files In Sunbronze

These are the most useful files to study while migrating:

- `C:\Projects\sunbronze\backend\src\sunbronze_api\services\whatsapp.py`
- `C:\Projects\sunbronze\backend\src\sunbronze_api\services\whatsapp_booking.py`
- `C:\Projects\sunbronze\backend\src\sunbronze_api\api\routes\whatsapp.py`
- `C:\Projects\sunbronze\backend\src\sunbronze_api\core\config.py`
- `C:\Projects\sunbronze\backend\src\sunbronze_api\db\session.py`
- `C:\Projects\sunbronze\backend\src\sunbronze_api\main.py`
- `C:\Projects\sunbronze\frontend\app`
- `C:\Projects\sunbronze\frontend\components`
- `C:\Projects\sunbronze\frontend\lib`

## New Repo Structure

Keep the same top-level split:

```text
welcome-nicaragua-bot/
  backend/
  frontend/
  docs/
  scripts/
  tests/
```

Recommended backend layout:

```text
backend/
  alembic/
  src/welcome_nicaragua_api/
    api/
    core/
    db/
    models/
    schemas/
    services/
    integrations/
    jobs/
    utils/
```

Important change from `sunbronze`:

- use `Alembic` from day one
- do not keep the SQL-script-only migration approach

## Core Domain For This MVP

Use this domain model, not `appointments`.

Main entities:

- `customers`
- `tours`
- `booking_requests`
- `whatsapp_messages`
- `conversation_state`
- `calendar_events_mirror`
- `metrics_events`

## Shared Calendar Rule

The system must use one shared Google Calendar only.

Example:

```text
Welcome to Nicaragua - Reservas
```

Do not create one calendar per tour.

Tour separation should happen in PostgreSQL using `tour_id`.

## Source Of Truth Model

For this MVP:

- Google Calendar is the operational availability source
- PostgreSQL is the traceability and metrics source
- the app owns the booking workflow state

That means:

- availability checks use Google Calendar FreeBusy
- booking request state lives in PostgreSQL
- created calendar events are mirrored into PostgreSQL
- manual Google Calendar changes must later be synced back into the mirror

## Step-By-Step Bootstrap Plan

### 1. Create the new repo

```powershell
cd C:\Projects
mkdir welcome-nicaragua-bot
cd welcome-nicaragua-bot
git init -b main
```

### 2. Copy the structural foundation only

Copy from `sunbronze`:

- `backend`
- `frontend`
- optional helper scripts
- `.gitignore`

Do not copy:

- `.git`
- `.venv`
- `.pytest_cache`
- logs
- generated output
- old images and legal content unless explicitly reused

### 3. Rename the backend package immediately

Current package:

- `sunbronze_api`

Rename to:

- `welcome_nicaragua_api`

Update:

- folder name in `backend/src/`
- Python imports
- `pyproject.toml`
- startup command
- test imports
- script references

New local run target:

```powershell
python -m uvicorn welcome_nicaragua_api.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Replace all business naming

Review and replace:

- `sunbronze`
- `barber`
- `barbers`
- `appointment`
- `appointments`
- `service`
- `services`
- `specialist`
- `staff`

Replace with the new business vocabulary where appropriate:

- `tour`
- `booking_request`
- `customer`
- `conversation`
- `operator`
- `calendar_event_mirror`

Do not use blind global replace. Some uses are structural and some are domain-specific.

### 5. Strip old pages and routes

Delete or rewrite first:

- appointment routes
- barber routes
- services pages
- specialists pages
- salon marketing pages
- salon-specific seed data

Keep if useful:

- health endpoint pattern
- auth structure if generic enough
- admin shell
- API client helpers
- locale helpers if needed for ES/EN

### 6. Rebuild the backend around the MVP domain

Create these first models:

- `Customer`
- `Tour`
- `BookingRequest`
- `WhatsappMessage`
- `ConversationState`
- `CalendarEventMirror`
- `MetricsEvent`

Suggested first fields:

- `customers`: id, full_name, whatsapp_number, language, created_at, updated_at
- `tours`: id, slug, name_es, name_en, description_es, description_en, base_price_usd, duration_minutes, is_active, created_at, updated_at
- `booking_requests`: id, customer_id, tour_id, status, requested_date, requested_start_time, requested_end_time, pax_adults, pax_children, pickup_location, language, estimated_total_usd, notes, source, created_at, updated_at
- `whatsapp_messages`: id, wa_message_id, customer_id, direction, message_type, body, raw_payload, created_at
- `conversation_state`: id, customer_id, current_step, selected_tour_id, booking_request_id, context, updated_at
- `calendar_events_mirror`: id, booking_request_id, google_calendar_id, google_event_id, tour_id, event_title, event_description, start_time, end_time, status, html_link, google_etag, last_synced_at, created_at, updated_at
- `metrics_events`: id, event_type, customer_id, booking_request_id, tour_id, metadata, created_at

### 7. Use Alembic from the beginning

Do not port the `sunbronze` SQL-first migration strategy into this repo.

Bootstrap:

- initialize Alembic
- connect it to the SQLAlchemy models
- generate the first migration for the core tables
- keep all future schema changes in migrations

This is the right choice here because the domain will evolve quickly and the MVP already has multiple integration-driven tables.

### 8. Seed the fixed tours early

Create a seed for:

1. Masaya Volcano Night Tour
2. Isletas de Granada
3. Mombacho Volcano
4. Transporte privado Nicaragua

This should be available on day one so the WhatsApp flow can map directly to real records.

### 9. Keep WhatsApp as its own integration boundary

Retain these ideas from `sunbronze`:

- webhook verification
- inbound payload parsing
- outbound sender service
- provider message id deduplication
- raw payload storage
- logging and error isolation

Required endpoints:

- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`

The POST flow should:

1. receive payload
2. extract customer number
3. extract inbound text and `wa_message_id`
4. create or update `customer`
5. store inbound `whatsapp_message`
6. record `whatsapp_message_received`
7. run `conversation_service`
8. send reply through WhatsApp Cloud API
9. store outbound `whatsapp_message`
10. record `whatsapp_message_sent`

### 10. Build the conversation flow around pre-reservations

The conversation service should support:

- `welcome`
- `selecting_tour`
- `asking_date`
- `asking_pax`
- `asking_pickup`
- `asking_language`
- `checking_availability`
- `waiting_confirmation`
- `handoff_human`
- `completed`

Critical rule:

- the bot must never fully confirm a booking
- success state is `pending_human_confirmation`

### 11. Make Google Calendar a first-class integration

Do not treat this as a later add-on.

Create:

- `services/google_calendar_service.py`
- `integrations/google_calendar/`
- `jobs/calendar_sync_job.py`

Required functions:

- `check_availability(start_time, end_time)`
- `create_calendar_event(booking_request_id)`
- `update_calendar_event(event_id, data)`
- `delete_calendar_event(event_id)`
- `sync_reservations_calendar(time_min, time_max)`

MVP availability rule:

- if FreeBusy returns any occupied block in the target range, do not auto-create the pre-reservation as available
- if no conflict exists, create a pending calendar event

### 12. Add the calendar mirror from day one

This is not optional for the MVP.

Purpose of `calendar_events_mirror`:

- audit created events
- track event ids and etags
- detect manual edits
- support metrics without hitting Google Calendar constantly
- keep operational history even if events change later

Sync job rules:

- run every 10 or 15 minutes
- read future events from the shared calendar
- update mirror rows
- mark missing events as `cancelled_or_missing`
- never delete historical rows

### 13. Add operator handoff

When a pre-reservation is created:

- notify the operator by WhatsApp
- record `human_handoff_triggered`
- keep booking status as `pending_human_confirmation`

This is part of the business process, not a nice-to-have.

### 14. Add metrics early

Create `metrics_events` immediately.

Minimum event types:

- `whatsapp_message_received`
- `whatsapp_message_sent`
- `tour_selected`
- `booking_started`
- `availability_checked`
- `availability_available`
- `availability_unavailable`
- `calendar_event_created`
- `calendar_event_updated_from_sync`
- `calendar_event_missing_from_sync`
- `human_handoff_triggered`
- `booking_confirmed`
- `booking_cancelled`
- `error_google_calendar`
- `error_whatsapp_send`
- `error_backend`

### 15. Protect internal endpoints

Internal endpoints should be protected by `APP_API_KEY`.

Initial internal endpoints:

- `GET /health`
- `GET /bookings`
- `GET /bookings/{id}`
- `PATCH /bookings/{id}/status`
- `GET /metrics/summary`
- `GET /calendar/mirror`
- `POST /calendar/sync`

### 16. Reset environment variables

Do not keep `SUNBRONZE_*`.

Use a clean `.env.example` like:

```env
DATABASE_URL=
RAILWAY_ENVIRONMENT=

APP_API_KEY=
DEFAULT_TIMEZONE=America/Managua

WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_RESERVATIONS_ID=

OPERATOR_WHATSAPP_NUMBER=
```

Frontend:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

### 17. Keep the frontend thin for the first demo

For the first local demo, do not rebuild a large product UI.

Build only:

- basic login if easy to keep
- internal dashboard
- bookings list
- booking detail view
- conversation/messages view
- calendar mirror view
- simple metrics summary view

Recommended dashboard widgets:

- total inbound messages
- total booking requests
- pending human confirmations
- latest conversations
- latest calendar sync status

### 18. Local development bootstrap

Backend:

```powershell
cd C:\Projects\welcome-nicaragua-bot\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .
Copy-Item .env.example .env
python -m uvicorn welcome_nicaragua_api.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend:

```powershell
cd C:\Projects\welcome-nicaragua-bot\frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

### 19. Railway shape from day one

Target deploy structure:

- 1 FastAPI backend service
- 1 PostgreSQL Railway database

Start command:

```bash
uvicorn welcome_nicaragua_api.main:app --host 0.0.0.0 --port $PORT
```

Healthcheck:

```text
/health
```

### 20. First commit sequence

Recommended commit order:

1. `chore: bootstrap welcome nicaragua repo from sunbronze structure`
2. `refactor: rename package and remove sunbronze domain naming`
3. `feat: add core models and alembic migrations`
4. `feat: add whatsapp webhook and message persistence`
5. `feat: add guided booking request conversation flow`
6. `feat: add google calendar freebusy and event creation`
7. `feat: add calendar mirror and sync job`
8. `feat: add operator handoff and metrics`
9. `feat: add internal dashboard for local demo`

## Fastest Path To A Local Demo Today

If the goal is to have a visible local demo by end of day, use this sequence:

1. Create the new repo and copy the base structure.
2. Rename the backend package and env vars.
3. Remove barber pages and routes.
4. Create the seven core models.
5. Set up Alembic and generate the first migration.
6. Seed the four tours.
7. Reuse the WhatsApp webhook skeleton.
8. Implement a narrow conversation flow for the happy path only.
9. Implement Google Calendar availability as a mock first if credentials are not ready.
10. Implement calendar event mirror writes.
11. Build a simple internal dashboard and bookings screen.
12. Run backend and frontend locally.

## Realistic End-Of-Day Demo

Realistic local demo outcome:

- backend running locally
- frontend running locally
- seeded tours visible
- WhatsApp inbound test payload accepted
- customer record created
- inbound and outbound messages stored
- conversation reaches pre-reservation stage
- `booking_request` created
- booking status set to `pending_human_confirmation`
- Google Calendar availability checked with mock or real integration
- calendar mirror record created
- operator handoff action logged
- metrics summary endpoint working

## What Not To Do On Day One

Avoid:

- automatic booking confirmation
- full AI sales behavior
- advanced dashboarding
- guide-specific resource planning
- payments
- complex inventory logic
- shared package extraction before the demo works
- bidirectional full reconciliation beyond the initial mirror/sync design

## First Tests To Add

Start with:

- `GET /health`
- valid WhatsApp webhook verification
- invalid WhatsApp webhook verification
- inbound WhatsApp text processing
- new customer creation
- inbound message persistence
- tour selection by number
- booking request creation
- price estimation from tour data
- mocked FreeBusy available
- mocked FreeBusy occupied
- calendar mirror creation
- `GET /metrics/summary`

## Bottom Line

This new repo should be built as a clean WhatsApp + Google Calendar + PostgreSQL + Railway MVP for `Welcome to Nicaragua`.

Reuse the `sunbronze` skeleton and integration patterns, but rebuild the domain around:

- `booking_requests`
- shared-calendar availability
- calendar mirroring
- operator handoff
- traceability and metrics
