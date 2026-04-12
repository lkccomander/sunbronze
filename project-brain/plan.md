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
- Verify authentication, authorization, and staff endpoints behave correctly at runtime. ✅

### Phase 5: WhatsApp integration

- Define webhook endpoints for inbound WhatsApp messages. ✅
- Persist inbound and outbound messages in `whatsapp_messages`. ✅
- Add conversation state handling for booking, rescheduling, cancellation, FAQ, and human handoff. ✅
- Add reminder job processing linked to appointments. ✅
- Verify WhatsApp webhook, message persistence, and reminder flows behave correctly at runtime. ✅

### Phase 5.5: Real WhatsApp provider integration

- Add Meta-compatible webhook verification for a public deployment. ✅
- Add Meta-style inbound payload parsing for real phone messages. ✅
- Add provider configuration for verify token, access token, phone number id, and Graph API version. ✅
- Add optional outbound message delivery through the Meta API. ✅
- Prepare Railway environment variables and public webhook deployment steps. ✅
- Verify a real WhatsApp message from a phone reaches the deployed API and is persisted end to end. ✅

### Phase 6: Frontend

- Choose the frontend stack. ✅
- Build a receptionist/admin interface first. ✅
- Build core screens for: ✅
  - dashboard
  - appointments calendar/list
  - customer search
  - conversations inbox
  - services and staff management
- Verify the frontend boots and core screens render in runtime checks. ✅

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

## 2026-04-11 19:25:09 -0600 - Phase 7: CRUD de servicios y equipo

Objetivo: convertir la pantalla `Servicios y equipo` del frontend en una sección bilingue completa para crear, leer, actualizar y desactivar/reactivar servicios y miembros del equipo, usando el API del backend como fuente de verdad. Español será el idioma predeterminado y todo texto nuevo debe agregarse a `frontend/i18n/es.json` y `frontend/i18n/en.json`.

1. Backend - contratos CRUD para servicios
   - Agregar schemas Pydantic para `ServiceCreate`, `ServiceUpdate` y `ServiceDetail`.
   - Exponer endpoints protegidos para:
     - `POST /api/services`
     - `GET /api/services/{service_id}`
     - `PATCH /api/services/{service_id}`
     - `DELETE /api/services/{service_id}` como baja lógica usando `is_active=false`.
   - Validar `code` único, duración mayor a 0, buffers no negativos, moneda ISO de 3 letras y precio opcional no negativo.
   - Mantener el endpoint actual `GET /api/services` para lectura pública o staff, según la política de auth que se decida.

2. Backend - contratos CRUD para equipo/barberos
   - Agregar schemas Pydantic para `BarberCreate`, `BarberUpdate` y `BarberDetail`.
   - Exponer endpoints protegidos para:
     - `POST /api/barbers`
     - `GET /api/barbers/{barber_id}`
     - `PATCH /api/barbers/{barber_id}`
     - `DELETE /api/barbers/{barber_id}` como baja lógica usando `is_active=false`.
   - Validar `code` único, `display_name` requerido, email/teléfono opcionales, `location_id` válido si se envía, y `time_zone` con default existente `America/Costa_Rica`.
   - Definir si el equipo administrado desde esta pantalla representa solo `barbers` o también debe crear/actualizar `system_users`; no mezclar ambos hasta cerrar esa decisión.

3. Backend - asignación servicios ↔ equipo
   - Agregar endpoints protegidos para administrar `BarberService`:
     - listar servicios asignados a un barber
     - asignar uno o más servicios a un barber
     - actualizar duración/precio custom opcional
     - desactivar o remover asignación
   - Asegurar que una asignación no duplique `(barber_id, service_id)`.
   - Confirmar impacto en disponibilidad/citas cuando se desactiva un servicio o una asignación existente.

4. Backend - permisos y auditoría
   - Requerir usuario staff autenticado en endpoints de mutación.
   - Restringir mutaciones a roles `owner`/`admin` si la política actual lo permite; si no, documentar temporalmente `staff` como permiso mínimo.
   - Registrar acciones administrativas relevantes en audit log: creación, actualización, activación/desactivación y cambios de asignaciones.

5. Tests backend
   - Agregar pruebas de schemas y validaciones.
   - Agregar pruebas de endpoints CRUD felices y errores: no autenticado, sin permiso, duplicado, no encontrado, payload inválido.
   - Agregar prueba runtime/live API si encaja con el patrón existente de fases.

6. Frontend - capa API
   - Extender `frontend/lib/api.ts` con tipos de payload y helpers para crear/actualizar/desactivar servicios y barbers.
   - Usar `fetchApiJsonWithToken` para mutaciones protegidas.
   - Mantener lectura inicial server-side donde convenga, pero usar componentes cliente para formularios, edición inline, confirmaciones y estados optimistas si son seguros.

7. Frontend - UI CRUD en `Servicios y equipo`
   - Dividir la pantalla en dos secciones claras: catálogo de servicios y equipo activo.
   - Agregar acciones por servicio: crear, editar, activar/desactivar.
   - Agregar acciones por miembro del equipo: crear, editar, activar/desactivar.
   - Agregar manejo de errores y estados de carga en español/inglés.
   - Agregar confirmación antes de desactivar registros que puedan afectar citas futuras.
   - Mantener el diseño SkyGlass migrado y evitar introducir una segunda librería visual.

8. Frontend - asignaciones servicios/equipo
   - Agregar vista o modal para seleccionar qué servicios puede realizar cada miembro del equipo.
   - Permitir custom duration/custom price solo si el backend ya lo soporta en `BarberService`.
   - Mostrar claramente cuándo un servicio está activo pero no asignado a nadie.

9. i18n obligatorio
   - Toda etiqueta, botón, mensaje de error, confirmación, empty state y texto nuevo debe agregarse en `frontend/i18n/es.json` y `frontend/i18n/en.json`.
   - No dejar strings nuevos hardcodeados en JSX salvo nombres propios, códigos técnicos o datos del backend.
   - Español sigue siendo default mediante `sunbronze_locale=es` o ausencia de cookie.

10. Verificación
   - Ejecutar pruebas backend relacionadas.
   - Ejecutar `npm run build` en `frontend`.
   - Probar manualmente en el navegador:
     - crear servicio
     - editar servicio
     - desactivar/reactivar servicio
     - crear miembro del equipo
     - editar miembro del equipo
     - desactivar/reactivar miembro del equipo
     - cambiar idioma ES/EN y confirmar que la pantalla se mantiene traducida.
