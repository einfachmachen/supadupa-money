@echo off
REM Schneller Commit + Push

cd /d "%~dp0"
chcp 65001 >nul

cls
echo ==========================================
echo   GitHub Push
echo ==========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Git ist nicht installiert.
  pause
  exit /b 1
)

if not exist ".git\" (
  echo [FEHLER] Hier gibt es noch kein Git-Repo.
  echo          Erst github-init.bat ausfuehren.
  pause
  exit /b 1
)

echo Aenderungen seit letztem Commit:
echo.
git status --short
echo.

REM Anzahl geaenderter Dateien zaehlen
set CHANGED=0
for /f %%a in ('git status --porcelain 2^>nul ^| find /c /v ""') do set CHANGED=%%a

if "%CHANGED%"=="0" (
  echo Nichts zu committen - Arbeitsbaum sauber.
  echo.
  set /p PUSH_ANYWAY="Trotzdem push versuchen? [y/N] "
  if /i "%PUSH_ANYWAY%"=="y" git push
  pause
  exit /b 0
)

REM Datum/Zeit als Default-Message
for /f "tokens=2-4 delims=/.- " %%a in ('date /t') do set TODAY=%%c-%%b-%%a
for /f "tokens=1-2 delims=:" %%a in ('time /t') do set NOW=%%a:%%b
set "DEFAULT_MSG=Update %TODAY% %NOW%"

echo.
set /p MSG="Commit-Message [%DEFAULT_MSG%]: "
if "%MSG%"=="" set "MSG=%DEFAULT_MSG%"
echo.

echo Schritt: git add .
git add .
if errorlevel 1 ( echo [FEHLER] git add & pause & exit /b 1 )

echo Schritt: git commit
git commit -q -m "%MSG%"
if errorlevel 1 ( echo [FEHLER] git commit & pause & exit /b 1 )

echo Schritt: git push
git push
set PUSH_STATUS=%errorlevel%

echo.
if %PUSH_STATUS%==0 (
  echo [OK] Erfolgreich gepusht.
  echo      GitHub Actions baut jetzt - in 1-2 Min ist die Seite aktualisiert.
) else (
  echo [FEHLER] Push fehlgeschlagen.
)
echo.
pause
