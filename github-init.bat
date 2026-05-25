@echo off
REM Einmaliges GitHub-Setup

cd /d "%~dp0"
chcp 65001 >nul

cls
echo ==========================================
echo   GitHub-Setup fuer supadupa
echo ==========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Git ist nicht installiert.
  echo.
  echo Installation:
  echo   - Installer: https://git-scm.com/download/win
  echo   - winget:    winget install --id Git.Git
  echo.
  pause
  exit /b 1
)
echo [OK] Git installiert
git --version

if exist ".git\" (
  echo.
  echo [WARN] Hier liegt schon ein Git-Repository.
  echo        Wenn du das wirklich neu aufsetzen willst, loesche .git\ manuell.
  pause
  exit /b 1
)

set "DEFAULT_REMOTE=https://github.com/einfachmachen/supadupa.git"
echo.
set /p REMOTE="Remote-URL [%DEFAULT_REMOTE%]: "
if "%REMOTE%"=="" set "REMOTE=%DEFAULT_REMOTE%"
echo.

REM Git-User pruefen
for /f "delims=" %%a in ('git config user.name 2^>nul') do set "GIT_USER=%%a"
for /f "delims=" %%a in ('git config user.email 2^>nul') do set "GIT_MAIL=%%a"
if "%GIT_USER%"=="" goto :ASK_USER
if "%GIT_MAIL%"=="" goto :ASK_USER
goto :SKIP_USER

:ASK_USER
echo Git-User noch nicht gesetzt. Bitte einmalig konfigurieren:
set /p GIT_NAME="  Name (z.B. Max Mustermann): "
set /p GIT_EMAIL="  Email (deine GitHub-Email): "
git config --global user.name "%GIT_NAME%"
git config --global user.email "%GIT_EMAIL%"
echo.

:SKIP_USER

echo Schritt: git init
git init -q -b main
if errorlevel 1 ( echo [FEHLER] git init & pause & exit /b 1 )

echo Schritt: Remote setzen
git remote add origin "%REMOTE%"
if errorlevel 1 ( echo [FEHLER] git remote & pause & exit /b 1 )

echo Schritt: Dateien hinzufuegen
git add .
if errorlevel 1 ( echo [FEHLER] git add & pause & exit /b 1 )

REM Sanity-Check: keine node_modules/dist im Stage
git diff --cached --name-only | findstr /R "^node_modules/ ^dist/ ^_site/ /node_modules/ /dist/" >nul
if not errorlevel 1 (
  echo.
  echo [STOP] node_modules/ oder dist/ wuerden mit gepusht werden!
  echo        Das sind die installierten Pakete - die gehoeren NIE in Git.
  echo.
  echo Betroffene Pfade:
  git diff --cached --name-only | findstr /R "^node_modules/ ^dist/ ^_site/ /node_modules/ /dist/"
  echo.
  echo Loesung:
  echo   git rm -r --cached node_modules dist _site
  echo   echo node_modules/ ^>^> .gitignore
  echo   echo dist/         ^>^> .gitignore
  echo   git add .gitignore ^&^& git reset
  echo.
  pause
  exit /b 1
)
echo [OK] Sanity-Check bestanden

echo Schritt: Ersten Commit erstellen
git commit -q -m "Initial commit: MyBudgetTracker dual setup"
if errorlevel 1 ( echo [FEHLER] git commit & pause & exit /b 1 )

echo.
echo Schritt: Push zu GitHub ^(kann Login/Token verlangen^)
echo.
git push -u origin main
set PUSH_STATUS=%errorlevel%

echo.
if %PUSH_STATUS%==0 (
  echo [OK] Erfolgreich gepusht.
  echo.
  REM Versuche User/Repo aus der URL zu extrahieren
  echo Naechste Schritte auf GitHub:
  echo   1. Settings ^> Pages ^> Source: GitHub Actions
  echo   2. Tab 'Actions' beobachten - der Build laeuft jetzt automatisch
  echo   3. Nach 1-2 Min ist die Seite live
) else (
  echo [FEHLER] Push fehlgeschlagen.
  echo.
  echo Haeufige Ursachen:
  echo   - Repo auf GitHub existiert noch nicht
  echo   - Authentifizierung: GitHub will ein Personal Access Token statt Passwort
  echo     ^> https://github.com/settings/tokens
)
echo.
pause
