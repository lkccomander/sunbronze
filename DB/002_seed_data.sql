-- WhatsApp Receptionist MVP - Seed Data
-- Run after 001_initial_postgres_schema.sql
-- Example:
--   psql -U postgres -d sunbronze -f DB/002_seed_data.sql

BEGIN;

-- 1 local
INSERT INTO app.locations (
    code,
    name,
    phone_e164,
    email,
    address_line_1,
    city,
    state,
    postal_code,
    country_code,
    time_zone
)
VALUES (
    'sunbronze-main',
    'SunBronze Studio',
    '+50600000000',
    'info@sunbronze.local',
    'Local principal',
    'San Jose',
    'San Jose',
    '10101',
    'CR',
    'America/Costa_Rica'
)
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    phone_e164 = EXCLUDED.phone_e164,
    email = EXCLUDED.email,
    address_line_1 = EXCLUDED.address_line_1,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    country_code = EXCLUDED.country_code,
    time_zone = EXCLUDED.time_zone,
    is_active = true;

-- 4 servicios
INSERT INTO app.services (
    code,
    name,
    description,
    requires_barber,
    requires_resource,
    duration_minutes,
    buffer_before_minutes,
    buffer_after_minutes,
    price_cents,
    currency_code
)
VALUES
    ('corte', 'Corte', 'Servicio de corte de cabello', true, false, 45, 0, 15, 12000, 'CRC'),
    ('barba', 'Barba', 'Arreglo y perfilado de barba', true, false, 30, 0, 10, 8000, 'CRC'),
    ('corte-barba', 'Corte + Barba', 'Paquete de corte y barba', true, false, 75, 0, 15, 18000, 'CRC'),
    ('sesion-bronceado', 'Sesion de Bronceado', 'Sesion individual de bronceado', false, true, 30, 0, 10, 15000, 'CRC')
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    requires_barber = EXCLUDED.requires_barber,
    requires_resource = EXCLUDED.requires_resource,
    duration_minutes = EXCLUDED.duration_minutes,
    buffer_before_minutes = EXCLUDED.buffer_before_minutes,
    buffer_after_minutes = EXCLUDED.buffer_after_minutes,
    price_cents = EXCLUDED.price_cents,
    currency_code = EXCLUDED.currency_code,
    is_active = true;

-- 2 barberos
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
    v.code,
    v.first_name,
    v.last_name,
    v.display_name,
    v.email,
    v.phone_e164,
    'America/Costa_Rica'
FROM app.locations l
CROSS JOIN (
    VALUES
        ('walter', 'Walter', 'Solano', 'Walter', 'walter@sunbronze.local', '+50670000001'),
        ('andres', 'Andres', 'Mora', 'Andres', 'andres@sunbronze.local', '+50670000002')
) AS v(code, first_name, last_name, display_name, email, phone_e164)
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

-- Recurso para bronceado
INSERT INTO app.resources (
    location_id,
    code,
    name,
    resource_type,
    description,
    is_active
)
SELECT
    l.id,
    'cabina-bronceado-1',
    'Cabina de Bronceado 1',
    'tanning_bed',
    'Recurso para sesiones de bronceado',
    true
FROM app.locations l
WHERE l.code = 'sunbronze-main'
ON CONFLICT (code) DO UPDATE
SET
    location_id = EXCLUDED.location_id,
    name = EXCLUDED.name,
    resource_type = EXCLUDED.resource_type,
    description = EXCLUDED.description,
    is_active = true;

-- Relacion de servicios por barbero
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
JOIN app.services s ON s.code IN ('corte', 'barba', 'corte-barba')
WHERE b.code IN ('walter', 'andres')
ON CONFLICT (barber_id, service_id) DO UPDATE
SET
    is_active = true;

-- Horarios base de lunes a viernes de 9:00 a 17:00
INSERT INTO app.barber_working_hours (
    barber_id,
    weekday,
    start_time,
    end_time,
    is_active
)
SELECT
    b.id,
    d.weekday,
    TIME '09:00',
    TIME '17:00',
    true
FROM app.barbers b
CROSS JOIN (
    VALUES (1), (2), (3), (4), (5)
) AS d(weekday)
WHERE b.code IN ('walter', 'andres')
ON CONFLICT (barber_id, weekday, start_time, end_time) DO UPDATE
SET
    is_active = true;

-- Horario del recurso de bronceado de lunes a viernes de 9:00 a 17:00
INSERT INTO app.resource_working_hours (
    resource_id,
    weekday,
    start_time,
    end_time,
    is_active
)
SELECT
    r.id,
    d.weekday,
    TIME '09:00',
    TIME '17:00',
    true
FROM app.resources r
CROSS JOIN (
    VALUES (1), (2), (3), (4), (5)
) AS d(weekday)
WHERE r.code = 'cabina-bronceado-1'
ON CONFLICT (resource_id, weekday, start_time, end_time) DO UPDATE
SET
    is_active = true;

-- 1 admin y 1 recepcionista
INSERT INTO app.system_users (
    location_id,
    email,
    password_hash,
    first_name,
    last_name,
    display_name,
    phone_e164,
    is_active
)
SELECT
    l.id,
    v.email,
    '8b41e68aa629ae9f846c1a9365698baf7887314e26ece9397214b0485bcb423e',
    v.first_name,
    v.last_name,
    v.display_name,
    v.phone_e164,
    true
FROM app.locations l
CROSS JOIN (
    VALUES
        ('admin@sunbronze.local', 'Admin', 'Principal', 'Admin Principal', '+50671000001'),
        ('recepcion@sunbronze.local', 'Recepcion', 'Principal', 'Recepcion Principal', '+50671000002')
) AS v(email, first_name, last_name, display_name, phone_e164)
WHERE l.code = 'sunbronze-main'
ON CONFLICT (email) DO UPDATE
SET
    location_id = EXCLUDED.location_id,
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    phone_e164 = EXCLUDED.phone_e164,
    is_active = true;

-- Asignacion de roles
INSERT INTO app.user_roles (user_id, role_id)
SELECT
    u.id,
    r.id
FROM app.system_users u
JOIN app.roles r ON r.code = 'admin'
WHERE u.email = 'admin@sunbronze.local'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO app.user_roles (user_id, role_id)
SELECT
    u.id,
    r.id
FROM app.system_users u
JOIN app.roles r ON r.code = 'receptionist'
WHERE u.email = 'recepcion@sunbronze.local'
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;
