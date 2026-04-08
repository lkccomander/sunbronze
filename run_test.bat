@echo off
setlocal

REM Always run from this script's folder.
cd /d "%~dp0"
set "OUTPUT_FILE=%~dp0error.txt"

if not exist ".venv\Scripts\activate" (
    echo [ERROR] Virtual environment activation script not found:
    echo         .venv\Scripts\activate.bat
    echo Create it first with: py -m venv .venv
    exit /b 1
)

call ".venv\Scripts\activate"
python.exe -m pip install --upgrade pip
python -m pytest -q .\Test > "%OUTPUT_FILE%" 2>&1
type "%OUTPUT_FILE%"
