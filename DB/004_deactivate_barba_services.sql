-- Deactivate services that should no longer appear in booking flows.
-- Run once against existing environments after 002_seed_data.sql has already been applied.

BEGIN;

UPDATE app.services
SET is_active = false
WHERE code IN ('barba', 'corte-barba');

UPDATE app.barber_services bs
SET is_active = false
FROM app.services s
WHERE bs.service_id = s.id
  AND s.code IN ('barba', 'corte-barba');

UPDATE app.services
SET is_active = true
WHERE code IN ('corte', 'sesion-bronceado');

COMMIT;
