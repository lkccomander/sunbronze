# Plan

## Goal

Build the SunBronze barber scheduling platform in three stages:

1. Complete the FastAPI backend.
2. Add the integration flows needed for WhatsApp-based receptionist behavior.
3. Build the frontend on top of stable backend contracts.

## Next Steps

### Phase 1: Stabilize the backend foundation

- Install backend dependencies in the project environment. ✅
- Run the FastAPI app locally and confirm the app boots successfully. ✅
- Add database connectivity verification against the local Postgres database. ✅
- Decide whether migrations will be handled with Alembic or with SQL-first versioned scripts only. ✅
- Verify `/api/health` returns runtime database status from the live API. ✅

### Phase 2: Build reference-data endpoints

- Add read endpoints for: ✅
  - `services`
  - `barbers`
  - `resources`
  - `customers`
  - `locations`
- Add response schemas for each resource. ✅
- Add filtering and pagination where useful. ✅
- Verify reference-data endpoints return runtime JSON payloads from the live API. ✅

### Phase 3: Expand booking capabilities

- Add appointment update and cancellation endpoints. ✅
- Add rescheduling support. ✅
- Add conflict checks before insert and update for barber and resource reservations. ✅
- Add availability search endpoints based on: ✅
  - barber working hours
  - barber time off
  - resource working hours
  - resource time off
  - service duration and buffers
- Verify booking update, cancellation, and availability endpoints behave correctly at runtime. ✅

### Phase 4: Authentication and staff operations

- Add authentication for `system_users`. ✅
- Add role-aware authorization for owner, admin, receptionist, and barber. ✅
- Add staff-facing endpoints for: ✅
  - conversation assignment
  - appointment management
  - customer lookup
  - audit-friendly actions
- Verify authentication, authorization, and staff endpoints behave correctly at runtime. `pending`

### Phase 5: WhatsApp integration

- Define webhook endpoints for inbound WhatsApp messages. ✅
- Persist inbound and outbound messages in `whatsapp_messages`. ✅
- Add conversation state handling for booking, rescheduling, cancellation, FAQ, and human handoff. ✅
- Add reminder job processing linked to appointments. ✅
- Verify WhatsApp webhook, message persistence, and reminder flows behave correctly at runtime. ✅

### Phase 6: Frontend

- Choose the frontend stack.
- Build a receptionist/admin interface first.
- Build core screens for:
  - dashboard
  - appointments calendar/list
  - customer search
  - conversations inbox
  - services and staff management
- Verify the frontend boots and core screens render in runtime checks. `pending`

## Immediate Recommended Order

1. Install and run the backend locally.
2. Add `services`, `barbers`, `resources`, and `customers` endpoints.
3. Add appointment conflict detection and availability search.
4. Add authentication and role enforcement.
5. Add WhatsApp webhook and conversation flow handling.
6. Start the frontend once those API contracts are stable.

## Deliverables for the next work session

- Running FastAPI app locally
- Reference-data endpoints implemented
- Appointment module expanded with conflict validation
- Clear frontend stack decision
