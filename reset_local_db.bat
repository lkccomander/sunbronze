@echo off
setlocal

cd /d "%~dp0"

if not exist "reset_local_db.ps1" (
    echo Could not find reset_local_db.ps1 in:
    echo %~dp0
    exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0reset_local_db.ps1"
