@echo off
REM Erstellt einen 'legacy'-Branch im GitHub-Repo als Sicherheitskopie.

cd /d "%~dp0"
chcp 65001 >nul

cls
echo ==========================================
echo   Legacy-Branch erstellen
echo ==========================================
echo.

where git >nul 2>nul
if errorlevel 1 ( echo [FEHLER] Git nicht installiert. & pause & exit /b 1 )
if not exist ".git\" ( echo [FEHLER] Kein Git-Repo. & pause & exit /b 1 )

REM Branch schon vorhanden?
git show-ref --verify --quiet refs/heads/legacy
if not errorlevel 1 (
  echo [WARN] Branch 'legacy' existiert bereits.
  set /p GOON="Trotzdem ueberschreiben? [y/N] "
  if /i not "%GOON%"=="y" ( echo Abgebrochen. & pause & exit /b 0 )
)

for /f "delims=" %%a in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%a"
echo Aktueller Branch: %CURRENT_BRANCH%

REM Ungespeicherte Aenderungen pruefen
git status --porcelain > "%TEMP%\gitstatus.txt"
for /f %%a in ('type "%TEMP%\gitstatus.txt" ^| find /c /v ""') do set CHANGED=%%a
del "%TEMP%\gitstatus.txt" 2>nul
if not "%CHANGED%"=="0" (
  echo.
  echo [FEHLER] Es gibt ungespeicherte Aenderungen.
  echo          Erst mit github-push.bat pushen.
  pause
  exit /b 1
)

echo Schritt: Branch 'legacy' anlegen
git branch -f legacy
if errorlevel 1 ( echo [FEHLER] git branch & pause & exit /b 1 )

echo Schritt: Push zu GitHub
git push -u origin legacy
set PUSH_STATUS=%errorlevel%

echo.
if %PUSH_STATUS%==0 (
  echo [OK] Legacy-Branch gesichert.
) else (
  echo [FEHLER] Push fehlgeschlagen.
)
echo.
pause
