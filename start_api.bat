@echo off
setlocal

cd /d "%~dp0"

if not exist "start_api.ps1" (
    echo Could not find start_api.ps1 in:
    echo %~dp0
    exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0start_api.ps1"
