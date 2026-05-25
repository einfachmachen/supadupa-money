@echo off
REM Recovery: entfernt versehentlich getrackte node_modules/dist aus dem Repo.

cd /d "%~dp0"
chcp 65001 >nul

cls
echo ==========================================
echo   Git-Recovery: node_modules entfernen
echo ==========================================
echo.

where git >nul 2>nul
if errorlevel 1 ( echo [FEHLER] Git nicht installiert. & pause & exit /b 1 )

if not exist ".git\" ( echo [FEHLER] Kein Git-Repo gefunden. & pause & exit /b 1 )

echo Dieses Skript entfernt unerwuenschte Ordner aus dem Git-Tracker
echo (node_modules, dist, _site) und sorgt dafuer, dass die .gitignore stimmt.
echo.
set /p GOON="Fortfahren? [y/N] "
if /i not "%GOON%"=="y" ( echo Abgebrochen. & pause & exit /b 0 )
echo.

echo Schritt: .gitignore pruefen
if not exist .gitignore type nul > .gitignore
for %%p in ("node_modules/" "dist/" "_site/" ".DS_Store" "*.log") do (
  findstr /x /c:%%p .gitignore >nul 2>nul
  if errorlevel 1 (
    echo %%~p>> .gitignore
    echo   + %%~p hinzugefuegt
  )
)

echo Schritt: node_modules/dist/_site aus Git-Index entfernen
git rm -r --cached node_modules 2>nul
git rm -r --cached dist 2>nul
git rm -r --cached _site 2>nul
git rm -r --cached new/node_modules 2>nul
git rm -r --cached new/dist 2>nul

set CHANGED=0
for /f %%a in ('git status --porcelain ^| find /c /v ""') do set CHANGED=%%a
if "%CHANGED%"=="0" (
  echo Nichts geaendert. Repo ist schon sauber.
  pause
  exit /b 0
)

git add .gitignore
git commit -q -m "chore: remove tracked node_modules/dist, fix .gitignore"
if errorlevel 1 ( echo [FEHLER] Commit & pause & exit /b 1 )

echo Schritt: Push zu GitHub
echo.
git push
set PUSH_STATUS=%errorlevel%

echo.
if %PUSH_STATUS%==0 (
  echo [OK] Repo aufgeraeumt.
  echo      GitHub sollte jetzt nur noch ~4 MB gross sein.
  echo.
  echo Falls du auch die History aufraeumen willst:
  echo    git filter-repo --path node_modules --invert-paths --force
  echo    git push --force
) else (
  echo [FEHLER] Push fehlgeschlagen.
)
echo.
pause
