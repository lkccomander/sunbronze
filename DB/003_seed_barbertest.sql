-- Dedicated seed data for barbertest
-- Run after 001_initial_postgres_schema.sql and 002_seed_data.sql
-- Example:
--   psql -U postgres -d sunbronze -f DB/003_seed_barbertest.sql

BEGIN;

INSERT INTO app.barbers (
    location_id,
    code,
    first_name,
    last_name,
    display_name,
    email,
    phone_e164,
    time_zone
)
SELECT
    l.id,
    'barbertest',
    'Barber',
    'Test',
    'barbertest',
    'barbertest@sunbronze.local',
    '+50670000003',
    'America/Costa_Rica'
FROM app.locations l
WHERE l.code = 'sunbronze-main'
ON CONFLICT (code) DO UPDATE
SET
    location_id = EXCLUDED.location_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone_e164 = EXCLUDED.phone_e164,
    time_zone = EXCLUDED.time_zone,
    is_active = true;

INSERT INTO app.barber_services (
    barber_id,
    service_id,
    is_active
)
SELECT
    b.id,
    s.id,
    true
FROM app.barbers b
JOIN app.services s ON s.code = 'corte'
WHERE b.code = 'barbertest'
ON CONFLICT (barber_id, service_id) DO UPDATE
SET
    is_active = true;

DELETE FROM app.barber_working_hours
WHERE barber_id IN (
    SELECT id
    FROM app.barbers
    WHERE code = 'barbertest'
);

INSERT INTO app.barber_working_hours (
    barber_id,
    weekday,
    start_time,
    end_time,
    is_active
)
SELECT
    b.id,
    schedule.weekday,
    schedule.start_time,
    schedule.end_time,
    true
FROM app.barbers b
CROSS JOIN (
    VALUES
        (1, TIME '08:00', TIME '12:00'),
        (1, TIME '13:00', TIME '17:00'),
        (2, TIME '08:00', TIME '12:00'),
        (2, TIME '13:00', TIME '17:00'),
        (3, TIME '08:00', TIME '12:00'),
        (3, TIME '13:00', TIME '17:00'),
        (4, TIME '08:00', TIME '12:00'),
        (4, TIME '13:00', TIME '17:00'),
        (5, TIME '08:00', TIME '12:00'),
        (5, TIME '13:00', TIME '17:00')
) AS schedule(weekday, start_time, end_time)
WHERE b.code = 'barbertest';

INSERT INTO app.customers (
    whatsapp_phone_e164,
    first_name,
    last_name,
    display_name,
    notes,
    is_active
)
VALUES (
    '+50679990001',
    'Cliente',
    'Prueba',
    'Cliente Prueba Barbertest',
    'Cliente semilla para pruebas de disponibilidad y agenda de barbertest.',
    true
)
ON CONFLICT (whatsapp_phone_e164) DO UPDATE
SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    notes = EXCLUDED.notes,
    is_active = true;

DELETE FROM app.appointments a
USING app.barbers b, app.customers c
WHERE a.barber_id = b.id
  AND a.customer_id = c.id
  AND b.code = 'barbertest'
  AND c.whatsapp_phone_e164 = '+50679990001'
  AND a.scheduled_start_at >= date_trunc('week', CURRENT_DATE)
  AND a.scheduled_start_at < date_trunc('week', CURRENT_DATE) + INTERVAL '5 day';

INSERT INTO app.appointments (
    customer_id,
    barber_id,
    service_id,
    source,
    status,
    scheduled_start_at,
    scheduled_end_at,
    buffer_before_minutes,
    buffer_after_minutes,
    reserved_start_at,
    reserved_end_at,
    notes
)
SELECT
    c.id,
    b.id,
    s.id,
    'admin_console'::app.appointment_source,
    'confirmed'::app.appointment_status,
    date_trunc('week', CURRENT_DATE) + (day_offset * INTERVAL '1 day') + TIME '14:00',
    date_trunc('week', CURRENT_DATE) + (day_offset * INTERVAL '1 day') + TIME '15:00',
    s.buffer_before_minutes,
    s.buffer_after_minutes,
    date_trunc('week', CURRENT_DATE) + (day_offset * INTERVAL '1 day') + TIME '14:00',
    date_trunc('week', CURRENT_DATE) + (day_offset * INTERVAL '1 day') + TIME '15:00',
    'Corte de prueba semanal para barbertest'
FROM generate_series(0, 4) AS day_offset
JOIN app.barbers b ON b.code = 'barbertest'
JOIN app.services s ON s.code = 'corte'
JOIN app.customers c ON c.whatsapp_phone_e164 = '+50679990001';

COMMIT;
