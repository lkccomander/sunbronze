$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$activateScript = Join-Path $projectRoot ".venv\Scripts\Activate.ps1"
$backendPath = Join-Path $projectRoot "backend"

if (-not (Test-Path $activateScript)) {
    Write-Error "Could not find $activateScript"
    exit 1
}

if (-not (Test-Path $backendPath)) {
    Write-Error "Could not find backend folder at $backendPath"
    exit 1
}

Set-Location $projectRoot
. $activateScript

Set-Location $backendPath
python -m uvicorn sunbronze_api.main:app --host 127.0.0.1 --port 8000 --reload
