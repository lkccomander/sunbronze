$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $projectRoot "frontend"
$envFile = Join-Path $frontendRoot ".env.local"
$apiBaseUrl = "http://127.0.0.1:8000"

Set-Location $frontendRoot

if (-not (Test-Path $envFile)) {
    Copy-Item ".env.example" ".env.local"
}

$envContents = Get-Content $envFile -Raw
if ($envContents -match "NEXT_PUBLIC_API_BASE_URL=") {
    $updated = [System.Text.RegularExpressions.Regex]::Replace(
        $envContents,
        "NEXT_PUBLIC_API_BASE_URL=.*",
        "NEXT_PUBLIC_API_BASE_URL=$apiBaseUrl"
    )
    Set-Content $envFile $updated
} else {
    Add-Content $envFile "`nNEXT_PUBLIC_API_BASE_URL=$apiBaseUrl"
}

if (-not (Test-Path "node_modules")) {
    npm install
}

npm run dev
