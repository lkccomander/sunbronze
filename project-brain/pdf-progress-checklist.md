# PDF Progress Check

Source compared:

- `project-brain/WhatsApp-Based Receptionist System for Barber Scheduling.pdf`
- `project-brain/plan.md`
- `project-brain/learn.md`
- `project-brain/decisions.md`
- `backend/`
- `frontend/`
- `Test/`

Date checked: 2026-04-09

## What The PDF Actually Recommends

The PDF describes a WhatsApp-based barber receptionist system with these main expectations:

- receptionist web console + backend API + scheduling rules engine + WhatsApp webhook handler + reminder jobs
- custom Postgres scheduling engine if we want maximum control, or Acuity if we want the lowest-risk SaaS path
- strict server-side double-booking prevention with atomic booking logic
- conversation-state handling for booking, rescheduling, cancellation, FAQ, and handoff
- WhatsApp Business Platform/API, not the basic WhatsApp Business App
- webhook idempotency, fast acknowledgements, and signature verification
- utility templates for booking confirmation, reminder, reschedule, and cancellation
- receptionist-focused flows including walk-ins, overrides, client lookup, and auditability
- privacy/security controls, role-based access, and strong production hardening

## Overall Match

The repo matches the PDF well on the chosen product direction:

- custom backend-first system, not a SaaS scheduling product
- FastAPI + Postgres + receptionist web UI + Meta WhatsApp integration
- booking conflict prevention, availability search, conversation persistence, reminders, and staff tooling

The repo only partially matches the PDF on production hardening and receptionist completeness:

- frontend core screens now read live backend data, but several operations are still read-only
- webhook integrity and idempotency are now implemented for the Meta inbound webhook
- auth is simpler than the PDF’s recommended production direction
- some PDF flows and operational safeguards are still missing or not clearly finished

## Exact Comparison Against Current Repo

- `[x]` The repo follows the PDF’s custom scheduling-engine path rather than the Acuity path.
  Evidence: custom appointments, availability, barbers, resources, customers, and WhatsApp flows exist in the backend.

- `[x]` The repo matches the PDF’s recommended end-state shape at a high level.
  Evidence: receptionist console in `frontend/`, backend API in `backend/`, scheduling rules in appointment services, WhatsApp webhooks, and reminder jobs.

- `[x]` The repo uses one of the PDF-approved backend stacks.
  Evidence: the PDF allowed Python/FastAPI; the backend is FastAPI.

- `[x]` The repo uses PostgreSQL as the system of record, matching the custom-engine path in the PDF.
  Evidence: SQL schema in `DB/`, SQLAlchemy models, Railway Postgres deployment notes.

- `[x]` The repo implements server-side double-booking/conflict checks.
  Evidence: appointment conflict validation and availability logic are present in `backend/src/sunbronze_api/services/appointments.py`.

- `[x]` The repo supports the core WhatsApp intents the PDF expects.
  Evidence: booking, reschedule, cancel, FAQ, and human handoff states exist in `backend/src/sunbronze_api/services/whatsapp.py`.

- `[x]` The repo has reminder-job support, which aligns with the PDF’s background jobs requirement.
  Evidence: reminder enqueueing, listing, and processing exist.

- `[x]` The repo has receptionist/admin UI scaffolding that aligns with the PDF’s receptionist-console concept.
  Evidence: dashboard, appointments, customers, conversations, login, and services/staff screens exist in `frontend/app/`.

- `[~]` The repo has the receptionist console, but not at the completeness level implied by the PDF.
  Evidence: `appointments` is meaningfully connected; `conversations`, `customers`, and `services` still look mostly placeholder/starter.

- `[~]` The repo matches the PDF’s recommended calendar UI direction only partially.
  Evidence: there is a custom appointments board.
  Gap: the PDF specifically recommends FullCalendar Premium if resource timeline views are needed, and that is not what the repo currently uses.

- `[~]` The repo has role-aware auth, but not the stronger production auth direction suggested by the PDF.
  Evidence: bearer-token auth and role checks exist.
  Gap: the PDF recommends OIDC/OAuth2-style console auth; current notes explicitly say JWT migration is deferred, and the backend only exposes `POST /api/auth/login`.

- `[x]` The repo has WhatsApp provider integration with production webhook hardening for inbound Meta payloads.
  Evidence: Meta verification handshake, inbound payload parsing, `X-Hub-Signature-256` HMAC-SHA256 verification, and duplicate `provider_message_id` skipping exist in the backend.

- `[~]` Reminder support exists, but the PDF’s retry/backoff/queue direction is only partially matched.
  Evidence: reminder jobs and outbound delivery exist.
  Gap: I did not find Redis/queue usage, explicit retry backoff policy, or async queue-backed processing.

- `[x]` Webhook idempotency from the PDF is implemented for inbound Meta text messages.
  Evidence from PDF: store `provider_message_id` or webhook event IDs and ignore duplicates.
  Current repo: `provider_message_id` is stored on messages and checked before processing inbound Meta messages, so duplicate deliveries are skipped.

- `[x]` Webhook signature verification from the PDF is implemented.
  Evidence from PDF: verify HMAC-SHA256 against `X-Hub-Signature-256`.
  Current repo: `POST /api/whatsapp/meta/webhook` validates `X-Hub-Signature-256` against `SUNBRONZE_WHATSAPP_META_APP_SECRET` before parsing the JSON payload.

- `[ ]` The PDF’s practical WhatsApp template set is not implemented as a clearly tracked production asset.
  Evidence from PDF: booking confirmation, reminder, rescheduled, and cancellation templates are explicitly proposed.
  Current repo: message records support template-related fields, but I did not find a finished template catalog or template-management doc in the repo.

- `[ ]` The PDF’s receptionist flow for walk-ins/check-in is not clearly implemented.
  Evidence from PDF: walk-ins, forced booking, and `POST /appointments/{id}/checkin`.
  Current repo: I did not find a walk-in/check-in endpoint or an equivalent documented flow.

- `[ ]` The PDF’s richer auth/user surface is not fully present.
  Evidence from PDF: `POST /auth/login`, `POST /auth/logout`, and `GET /me`.
  Current repo: backend exposes `POST /api/auth/login`; I did not find backend `logout` or `me` endpoints.

- `[ ]` The PDF’s suggested internal API surface is only partly covered.
  Evidence from PDF: client CRUD, barber/service management, schedule blocks, availability query, check-in, outbound WhatsApp send, calendar integration callbacks.
  Current repo: many read and booking flows exist, but not the full management/integration surface suggested in the PDF.

- `[ ]` The PDF’s Redis recommendation is not matched.
  Evidence from PDF: Redis for locks, rate limiting, idempotency keys, and session-state cache.
  Current repo: I did not find Redis usage.

- `[ ]` The PDF’s queue/worker recommendation is not matched.
  Evidence from PDF: queue-backed background jobs and async processing.
  Current repo: reminder processing exists, but I did not find a queue worker.

- `[ ]` The PDF’s privacy-retention guidance is not yet clearly operationalized.
  Evidence from PDF: minimize stored data and avoid retaining message bodies indefinitely unless required.
  Current repo: message bodies are persisted, but I did not find documented retention/deletion policy.

## Most Important Gaps Versus The PDF

These are the highest-signal mismatches now that the full PDF is readable:

1. Auth is lighter than the PDF’s production recommendation.
2. Walk-in/check-in and some receptionist operational flows are still missing.
3. WhatsApp production template set is not yet clearly documented/managed.
4. Queue/Redis-style operational hardening is still absent.
5. Frontend operations are still mostly read-only, even though the core screens now render live data.

## Checklist For You To Review

Use this as the practical “what should I verify or decide next?” list.

- `[ ]` Confirm we are intentionally following the PDF’s custom Postgres scheduling-engine path, not the Acuity path.
- `[ ]` Confirm we are intentionally using a custom appointment board instead of adopting FullCalendar Premium.
- `[ ]` Confirm the current backend conflict checks are strong enough to count as the PDF’s double-booking solution.
- `[ ]` Confirm we do or do not need Redis for locks, idempotency keys, and rate limiting in the next milestone.
- `[ ]` Confirm we do or do not need a queue/worker for reminders and outbound processing in the next milestone.
- `[x]` Confirm Meta webhook signature verification must be added before production use.
- `[x]` Confirm duplicate webhook delivery handling must be added before production use.
- `[ ]` Confirm the current auth approach is acceptable short-term, or decide to add stronger auth next.
- `[ ]` Confirm whether backend `logout` and `me` endpoints should be added to align the API with the PDF.
- `[ ]` Confirm whether walk-in and check-in flows are required for the next release.
- `[ ]` Confirm whether receptionist override/force-book behavior is required for the next release.
- `[ ]` Confirm the exact production WhatsApp utility templates we want to register:
  booking confirmation, reminder, rescheduled, cancellation confirmed.
- `[ ]` Confirm whether template IDs/names should be tracked in repo docs or config.
- `[ ]` Confirm reminder timing, retry behavior, and failure handling for real customers.
- `[x]` Confirm the conversations page should now be wired to live conversation and message data.
- `[~]` Confirm the customers page should now support real lookup by name and WhatsApp number.
- `[~]` Confirm the services/staff page should now support real service and staff assignment data.
- `[ ]` Confirm whether privacy/data-retention rules for WhatsApp message bodies need a written policy now.
- `[ ]` Confirm whether cost estimates from the PDF need a repo decision note or can remain planning-only reference.
- `[ ]` Confirm whether Phase 6 can be marked complete only after all live frontend screens are wired, not just present.

## Suggested Next Work

If the goal is to make the project match the PDF more tightly, the best next steps are:

1. Decide whether the next milestone includes stronger auth plus walk-in/check-in operations.
2. Document and register the exact WhatsApp utility templates for production.
3. Decide whether to keep the custom schedule board or move to FullCalendar.
4. Decide whether Redis/queue-backed processing is needed before production traffic.
