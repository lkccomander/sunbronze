@echo off
setlocal

cd /d "%~dp0frontend"

if not exist ".env.local" copy ".env.example" ".env.local" >nul

if not exist "node_modules" (
  call npm install
)

call npm run dev
