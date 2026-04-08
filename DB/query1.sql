
SELECT 'locations' AS tabla, COUNT(*) AS total FROM app.locations
UNION ALL
SELECT 'services', COUNT(*) FROM app.services
UNION ALL
SELECT 'barbers', COUNT(*) FROM app.barbers
UNION ALL
SELECT 'barber_services', COUNT(*) FROM app.barber_services
UNION ALL
SELECT 'barber_working_hours', COUNT(*) FROM app.barber_working_hours
UNION ALL
SELECT 'system_users', COUNT(*) FROM app.system_users
UNION ALL
SELECT 'user_roles', COUNT(*) FROM app.user_roles
ORDER BY tabla;

