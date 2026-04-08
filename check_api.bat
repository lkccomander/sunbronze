@echo off
setlocal

cd /d "%~dp0"

if not exist "check_api.ps1" (
    echo Could not find check_api.ps1 in:
    echo %~dp0
    exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0check_api.ps1"
