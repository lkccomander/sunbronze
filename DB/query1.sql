
SELECT
    l.name AS local,
    b.display_name AS barbero,
    s.name AS servicio,
    COALESCE(bs.custom_duration_minutes, s.duration_minutes) AS duracion_min,
    COALESCE(bs.custom_price_cents, s.price_cents) AS precio,
    h.weekday,
    h.start_time,
    h.end_time
FROM app.barbers b
JOIN app.locations l
    ON l.id = b.location_id
JOIN app.barber_services bs
    ON bs.barber_id = b.id
JOIN app.services s
    ON s.id = bs.service_id
LEFT JOIN app.barber_working_hours h
    ON h.barber_id = b.id
WHERE b.is_active = true
  AND bs.is_active = true
  AND s.is_active = true
  AND (h.is_active = true OR h.id IS NULL)
ORDER BY l.name, b.display_name, s.name, h.weekday;


UPDATE app.system_users SET is_active = false WHERE password_hash IS NULL;

UPDATE app.system_users SET password_hash = '8b41e68aa629ae9f846c1a9365698baf7887314e26ece9397214b0485bcb423e', is_active = true WHERE email IN ('admin@sunbronze.local', 'recepcion@sunbronze.local');


