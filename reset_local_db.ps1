$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbScript = Join-Path $projectRoot "DB\setup_local_db.ps1"

if (-not (Test-Path $dbScript)) {
    Write-Error "Could not find $dbScript"
    exit 1
}

Write-Host "Resetting local sunbronze database from DB\001_initial_postgres_schema.sql and DB\002_seed_data.sql..." -ForegroundColor Yellow
& $dbScript
