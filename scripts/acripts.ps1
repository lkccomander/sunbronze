& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "DROP DATABASE IF EXISTS sunbronze;"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "CREATE DATABASE sunbronze;"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d sunbronze -f "C:\Projects\sunbronze\DB\001_initial_postgres_schema.sql"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d sunbronze -f "C:\Projects\sunbronze\DB\002_seed_data.sql"
