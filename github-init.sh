#!/bin/bash
# Einmaliges GitHub-Setup

cd "$(dirname "$(readlink -f "$0")")" || exit 1

clear
echo "=========================================="
echo "  GitHub-Setup für supadupa"
echo "=========================================="
echo

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Git ist nicht installiert."
  echo
  echo "Installation:"
  echo "  • Debian/Ubuntu:  sudo apt install git"
  echo "  • Fedora:         sudo dnf install git"
  echo "  • Arch:           sudo pacman -S git"
  echo
  read -p "Mit Enter schließen..."
  exit 1
fi
echo "✓ Git $(git --version | awk '{print $3}')"

if [ -d ".git" ]; then
  echo
  echo "⚠  Hier liegt schon ein Git-Repository."
  echo "   Wenn du das wirklich neu aufsetzen willst, lösche .git/ manuell."
  read -p "Enter..."
  exit 1
fi

DEFAULT_REMOTE="https://github.com/einfachmachen/supadupa.git"
echo
read -p "Remote-URL [$DEFAULT_REMOTE]: " REMOTE
REMOTE="${REMOTE:-$DEFAULT_REMOTE}"
echo

if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
  echo "Git-User noch nicht gesetzt. Bitte einmalig konfigurieren:"
  read -p "  Name: " GIT_NAME
  read -p "  Email: " GIT_EMAIL
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  echo
fi

echo "▸ git init"
git init -q -b main || { echo "❌"; read -p "Enter..."; exit 1; }

echo "▸ Remote setzen"
git remote add origin "$REMOTE" || { echo "❌"; read -p "Enter..."; exit 1; }

echo "▸ Dateien hinzufügen"
git add . || { echo "❌"; read -p "Enter..."; exit 1; }

# ── SANITY-CHECKS ───────────────────────────────────────────────────────────
STAGED_BAD=$(git diff --cached --name-only | grep -E "^(node_modules/|.*/node_modules/|dist/|.*/dist/|_site/)" | head -3)
if [ -n "$STAGED_BAD" ]; then
  echo
  echo "❌ STOP: node_modules/ oder dist/ würden mit gepusht werden!"
  echo "   Das ist ein häufiger Fehler — diese Ordner sind RIESIG (>100 MB)."
  echo
  echo "   Betroffen:"
  echo "$STAGED_BAD" | sed 's/^/     /'
  echo
  echo "   Lösung:"
  echo "     git rm -r --cached node_modules dist _site 2>/dev/null"
  echo "     echo 'node_modules/' >> .gitignore"
  echo "     echo 'dist/'         >> .gitignore"
  echo "     git add .gitignore && git reset"
  read -p "Enter..."
  exit 1
fi

STAGED_SIZE=$(git ls-files --cached -s | awk '{print $4}' | xargs -I{} sh -c 'wc -c < "$1" 2>/dev/null' _ {} 2>/dev/null | awk '{sum+=$1} END {print sum/1024/1024}')
STAGED_SIZE_INT=${STAGED_SIZE%.*}
if [ -n "$STAGED_SIZE_INT" ] && [ "$STAGED_SIZE_INT" -gt 50 ]; then
  echo
  echo "⚠  ${STAGED_SIZE} MB werden committed — das ist groß. Normal: ~4 MB."
  read -p "Trotzdem fortfahren? [y/N] " GOON
  if [ "$GOON" != "y" ] && [ "$GOON" != "Y" ]; then
    git reset >/dev/null
    echo "Abgebrochen."
    read -p "Enter..."
    exit 1
  fi
fi
echo "✓ Sanity-Check: $(git ls-files --cached | wc -l | tr -d ' ') Dateien, ~${STAGED_SIZE} MB"

echo "▸ Ersten Commit"
git commit -q -m "Initial commit: MyBudgetTracker dual setup" || { echo "❌"; read -p "Enter..."; exit 1; }

echo
echo "▸ Push zu GitHub (kann Login/Token verlangen)"
echo
git push -u origin main
PUSH_STATUS=$?

echo
if [ $PUSH_STATUS -eq 0 ]; then
  echo "✅ Erfolgreich gepusht."
  REPO_NAME=$(basename -s .git "$REMOTE")
  REPO_USER=$(echo "$REMOTE" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
  echo "   Site-URL: https://${REPO_USER}.github.io/${REPO_NAME}/"
  echo
  echo "Nächste Schritte auf GitHub:"
  echo "  1. Settings → Pages → Source: GitHub Actions"
  echo "  2. Tab 'Actions' beobachten"
else
  echo "❌ Push fehlgeschlagen."
  echo
  echo "Häufige Ursachen:"
  echo "  • Repo auf GitHub existiert noch nicht"
  echo "  • Authentifizierung: GitHub will ein Personal Access Token statt Passwort"
  echo "    → https://github.com/settings/tokens"
fi
echo
read -p "Mit Enter schließen..."
