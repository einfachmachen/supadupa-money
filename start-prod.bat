@echo off
REM MyBudgetTracker Dual-Server (Production-Modus)
REM
REM Hinweis: Bei Node 22/24 tritt manchmal ein npm-Bug auf
REM ("Exit handler never called"). Dieses Skript prueft daher nicht
REM den Exit-Code, sondern ob node_modules am Ende existiert.

cd /d "%~dp0"
chcp 65001 >nul

cls
echo ==========================================
echo   MyBudgetTracker - Production-Modus
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Node.js ist nicht installiert.
  echo Installation: https://nodejs.org
  pause
  exit /b 1
)

REM Node-Version (z.B. v24.15.0 -> major 24)
set NODE_MAJOR=0
for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
set NODE_VER=%NODE_VER:v=%
for /f "tokens=1 delims=." %%a in ("%NODE_VER%") do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 18 (
  echo [FEHLER] Node.js zu alt ^(v%NODE_VER%^). Benoetigt: 18+
  pause
  exit /b 1
)
echo [OK] Node v%NODE_VER% ist installiert

REM ── Server-Dependencies ───────────────────────────────────────
if not exist "node_modules" (
  echo Server-Dependencies installieren...
  call npm install --no-audit --no-fund --legacy-peer-deps --loglevel=error
)
if not exist "node_modules" (
  echo [FEHLER] node_modules wurde nicht erstellt. Manueller Fix:
  echo   cd /d "%~dp0"
  echo   npm install --legacy-peer-deps --no-package-lock
  pause
  exit /b 1
)

REM ── App-Dependencies ──────────────────────────────────────────
if not exist "new\node_modules" (
  echo App-Dependencies installieren...
  pushd new
  call npm install --no-audit --no-fund --legacy-peer-deps --loglevel=error
  popd
)
if not exist "new\node_modules" (
  echo [FEHLER] new\node_modules wurde nicht erstellt. Manueller Fix:
  echo   cd /d "%~dp0\new"
  echo   npm install --legacy-peer-deps --no-package-lock
  pause
  exit /b 1
)

REM ── Build ─────────────────────────────────────────────────────
echo Baue App ^(kann 5-15 Sek dauern^)...
pushd new
call npm run build
popd
if not exist "new\dist" (
  echo [FEHLER] Build fehlgeschlagen ^(new\dist fehlt^)
  pause
  exit /b 1
)

echo.
echo Starte Server...
echo    App:  http://localhost:3000
echo.

start "" /b cmd /c "timeout /t 1 /nobreak >nul && start http://localhost:3000"

node server.js --prod

pause
