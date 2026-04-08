param(
    [string]$DbName = "sunbronze",
    [string]$DbUser = "postgres",
    [string]$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PsqlPath)) {
    throw "No se encontro psql en: $PsqlPath"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$schemaFile = Join-Path $scriptDir "001_initial_postgres_schema.sql"
$seedFile = Join-Path $scriptDir "002_seed_data.sql"

Write-Host "Recreando base de datos '$DbName'..." -ForegroundColor Cyan
& $PsqlPath -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $DbName;"
& $PsqlPath -U $DbUser -d postgres -c "CREATE DATABASE $DbName;"

Write-Host "Ejecutando schema..." -ForegroundColor Cyan
& $PsqlPath -U $DbUser -d $DbName -f $schemaFile

Write-Host "Ejecutando seed..." -ForegroundColor Cyan
& $PsqlPath -U $DbUser -d $DbName -f $seedFile

Write-Host ""
Write-Host "Preview de servicios:" -ForegroundColor Green
& $PsqlPath -U $DbUser -d $DbName -c "SELECT code, name, requires_barber, requires_resource, duration_minutes FROM app.services ORDER BY name;"

Write-Host ""
Write-Host "Preview de barberos:" -ForegroundColor Green
& $PsqlPath -U $DbUser -d $DbName -c "SELECT code, display_name, email FROM app.barbers ORDER BY display_name;"

Write-Host ""
Write-Host "Preview de recursos:" -ForegroundColor Green
& $PsqlPath -U $DbUser -d $DbName -c "SELECT code, name, resource_type FROM app.resources ORDER BY name;"

Write-Host ""
Write-Host "Preview de usuarios del sistema:" -ForegroundColor Green
& $PsqlPath -U $DbUser -d $DbName -c "SELECT u.display_name, u.email, STRING_AGG(r.code, ', ' ORDER BY r.code) AS roles FROM app.system_users u LEFT JOIN app.user_roles ur ON ur.user_id = u.id LEFT JOIN app.roles r ON r.id = ur.role_id GROUP BY u.id, u.display_name, u.email ORDER BY u.display_name;"

Write-Host ""
Write-Host "Base de datos lista." -ForegroundColor Green
