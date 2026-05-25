@echo off
REM MyBudgetTracker Dual-Server (Dev-Modus mit Hot-Reload)
REM Windows: Doppelklick startet alles.
REM
REM Hinweis: Bei Node 22/24 tritt manchmal ein npm-Bug auf
REM ("Exit handler never called"). Dieses Skript prueft daher nicht
REM den Exit-Code, sondern ob node_modules am Ende existiert.

cd /d "%~dp0"
chcp 65001 >nul

cls
echo ==========================================
echo   MyBudgetTracker - Dev-Modus
echo ==========================================
echo.

REM ── Node prüfen ───────────────────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Node.js ist nicht installiert.
  echo.
  echo Installation:
  echo   - Installer:    https://nodejs.org  ^(LTS-Version^)
  echo   - Oder winget:  winget install OpenJS.NodeJS.LTS
  echo.
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
if %NODE_MAJOR% GEQ 22 (
  echo      Hinweis: Bei Node v22+ kann npm install haengen.
  echo      Falls das passiert: Strg+C, dann manuell installieren.
  echo      Oder Node 20 LTS installieren: winget install OpenJS.NodeJS.LTS
)

REM ── Server-Dependencies ───────────────────────────────────────
if not exist "node_modules" (
  echo.
  echo Server-Dependencies werden installiert ^(einmalig, ~15 Sek^)...
  call npm install --no-audit --no-fund --legacy-peer-deps --loglevel=error
  REM Exit-Code IGNORIEREN — wir pruefen das Ergebnis am Verzeichnis
)
if not exist "node_modules" (
  echo [FEHLER] node_modules wurde nicht erstellt.
  echo.
  echo Manueller Fix - Befehle in cmd:
  echo   cd /d "%~dp0"
  echo   npm install --legacy-peer-deps --no-package-lock
  echo.
  pause
  exit /b 1
)
echo [OK] Server-Dependencies da

REM ── App-Dependencies ──────────────────────────────────────────
if not exist "new\node_modules" (
  echo.
  echo App-Dependencies werden installiert ^(einmalig, ~30 Sek^)...
  pushd new
  call npm install --no-audit --no-fund --legacy-peer-deps --loglevel=error
  popd
  REM Exit-Code IGNORIEREN — wir pruefen am Verzeichnis
)
if not exist "new\node_modules" (
  echo [FEHLER] new\node_modules wurde nicht erstellt.
  echo.
  echo Manueller Fix - Befehle in cmd:
  echo   cd /d "%~dp0\new"
  echo   npm install --legacy-peer-deps --no-package-lock
  echo.
  pause
  exit /b 1
)
echo [OK] App-Dependencies da

REM ── Server starten ────────────────────────────────────────────
echo.
echo Starte Server...
echo.
echo    App:  http://localhost:3000
echo.
echo    Strg+C beendet den Server.
echo.

REM Browser nach 2 Sek oeffnen
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

node server.js

echo.
echo Server beendet.
pause
