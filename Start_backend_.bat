@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM AUDITDNA BACKEND STARTUP SCRIPT
REM Starts backend server on PORT 5050
REM ═══════════════════════════════════════════════════════════════════════════════

title AuditDNA Backend Server (Port 5050)
color 0A

echo.
echo ════════════════════════════════════════════════════════════════
echo    AUDITDNA BACKEND SERVER
echo    Starting on PORT 5050...
echo ════════════════════════════════════════════════════════════════
echo.

cd /d C:\AuditDNA\backend\MiniAPI

REM Check if .env exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo Please copy .env file to C:\AuditDNA\backend\MiniAPI\
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo [WARN] node_modules not found. Installing dependencies...
    call npm install
    echo.
)

REM Start server
echo [INFO] Starting server.js on PORT 5050...
echo.
node server.js

pause