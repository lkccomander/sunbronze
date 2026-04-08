$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$activateScript = Join-Path $projectRoot ".venv\Scripts\Activate.ps1"

if (-not (Test-Path $activateScript)) {
    Write-Error "Could not find $activateScript"
    exit 1
}

Set-Location $projectRoot
. $activateScript

Write-Host "Virtual environment active in this PowerShell session."
