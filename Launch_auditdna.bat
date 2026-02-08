@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM AUDITDNA - LAUNCH ALL SERVICES
REM Launches Frontend (3000), Backend (5050), and PostgreSQL (5432)
REM ═══════════════════════════════════════════════════════════════════════════════

title AuditDNA System Launcher
color 0E

echo.
echo ════════════════════════════════════════════════════════════════
echo    AUDITDNA SYSTEM LAUNCHER v3.0
echo    Launching all services...
echo ════════════════════════════════════════════════════════════════
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM STEP 1: Start PostgreSQL
REM ═══════════════════════════════════════════════════════════════════════════════
echo [1/3] Starting PostgreSQL on PORT 5432...
net start postgresql-x64-14 >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] PostgreSQL started
) else (
    echo [WARN] PostgreSQL already running or failed to start
)
echo.

timeout /t 2 /nobreak >nul

REM ═══════════════════════════════════════════════════════════════════════════════
REM STEP 2: Start Backend Server (PORT 5050)
REM ═══════════════════════════════════════════════════════════════════════════════
echo [2/3] Starting Backend Server on PORT 5050...
start "AuditDNA Backend (Port 5050)" cmd /k "cd /d C:\AuditDNA\backend\MiniAPI && node server.js"
echo [OK] Backend server starting...
echo.

timeout /t 3 /nobreak >nul

REM ═══════════════════════════════════════════════════════════════════════════════
REM STEP 3: Start Frontend (PORT 3000)
REM ═══════════════════════════════════════════════════════════════════════════════
echo [3/3] Starting Frontend on PORT 3000...
start "AuditDNA Frontend (Port 3000)" cmd /k "cd /d C:\AuditDNA\frontend && npm start"
echo [OK] Frontend starting...
echo.

echo.
echo ════════════════════════════════════════════════════════════════
echo    ALL SERVICES LAUNCHED!
echo.
echo    Frontend:    http://localhost:3000
echo    Backend:     http://localhost:5050
echo    PostgreSQL:  localhost:5432
echo.
echo    Close this window to keep services running.
echo ════════════════════════════════════════════════════════════════
echo.

pause