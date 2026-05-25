#!/bin/bash
# Einmaliges GitHub-Setup
# Init lokales Repo, Remote setzen, ersten Commit, Push.

cd "$(dirname "$0")" || exit 1

clear
echo "=========================================="
echo "  GitHub-Setup für supadupa"
echo "=========================================="
echo

# Git vorhanden?
if ! command -v git >/dev/null 2>&1; then
  echo "❌ Git ist nicht installiert."
  echo
  echo "Installation:"
  echo "  • Homebrew:  brew install git"
  echo "  • Xcode:     xcode-select --install"
  echo
  read -p "Mit Enter schließen..."
  exit 1
fi
echo "✓ Git $(git --version | awk '{print $3}')"

# Schon ein Repo?
if [ -d ".git" ]; then
  echo
  echo "⚠  Hier liegt schon ein Git-Repository."
  echo "   Wenn du das wirklich neu aufsetzen willst, lösche .git/ manuell."
  echo
  read -p "Mit Enter schließen..."
  exit 1
fi

# Remote-URL erfragen (mit sinnvoller Vorgabe)
DEFAULT_REMOTE="https://github.com/einfachmachen/supadupa.git"
echo
read -p "Remote-URL [$DEFAULT_REMOTE]: " REMOTE
REMOTE="${REMOTE:-$DEFAULT_REMOTE}"
echo

# git-user prüfen — sonst meckert git beim commit
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
  echo "Git-User noch nicht gesetzt. Bitte einmalig konfigurieren:"
  read -p "  Name (z.B. Max Mustermann): " GIT_NAME
  read -p "  Email (deine GitHub-Email): " GIT_EMAIL
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  echo
fi

echo "▸ git init"
git init -q -b main || { echo "❌ git init fehlgeschlagen"; read -p "Enter..."; exit 1; }

echo "▸ Remote setzen"
git remote add origin "$REMOTE" || { echo "❌ git remote fehlgeschlagen"; read -p "Enter..."; exit 1; }

echo "▸ Alle Dateien hinzufügen"
git add . || { echo "❌ git add fehlgeschlagen"; read -p "Enter..."; exit 1; }

# ── SANITY-CHECKS: keine node_modules oder dist committen! ──────────────────
STAGED_BAD=$(git diff --cached --name-only | grep -E "^(node_modules/|.*/node_modules/|dist/|.*/dist/|_site/)" | head -3)
if [ -n "$STAGED_BAD" ]; then
  echo
  echo "❌ STOP: node_modules/ oder dist/ würden mit gepusht werden!"
  echo "   Das ist ein häufiger Fehler — diese Ordner sind RIESIG (>100 MB)"
  echo "   und gehören NIE in ein Git-Repository."
  echo
  echo "   Betroffene Pfade (Auszug):"
  echo "$STAGED_BAD" | sed 's/^/     /'
  echo
  echo "   Lösung: Die mitgelieferte .gitignore sollte das verhindern."
  echo "   Falls die fehlt oder defekt ist:"
  echo "     git rm -r --cached node_modules dist _site 2>/dev/null"
  echo "     echo 'node_modules/' >> .gitignore"
  echo "     echo 'dist/'         >> .gitignore"
  echo "     git add .gitignore && git reset"
  echo
  read -p "Mit Enter schließen..."
  exit 1
fi

# Größencheck (gestaged)
STAGED_SIZE=$(git ls-files --cached -s | awk '{print $4}' | xargs -I{} sh -c 'wc -c < "$1" 2>/dev/null' _ {} 2>/dev/null | awk '{sum+=$1} END {print sum/1024/1024}')
STAGED_SIZE_INT=${STAGED_SIZE%.*}
if [ -n "$STAGED_SIZE_INT" ] && [ "$STAGED_SIZE_INT" -gt 50 ]; then
  echo
  echo "⚠  Achtung: ${STAGED_SIZE} MB werden committed — das ist groß für ein Source-Repo."
  echo "   Normal wären ~4 MB. Vermutlich sind unerwünschte Dateien dabei."
  echo
  read -p "Trotzdem fortfahren? [y/N] " GOON
  if [ "$GOON" != "y" ] && [ "$GOON" != "Y" ]; then
    git reset >/dev/null
    echo "Abgebrochen, Stage geleert."
    read -p "Enter..."
    exit 1
  fi
fi
echo "✓ Sanity-Check: $(git ls-files --cached | wc -l | tr -d ' ') Dateien, ~${STAGED_SIZE} MB"

echo "▸ Ersten Commit erstellen"
git commit -q -m "Initial commit: MyBudgetTracker dual setup" || { echo "❌ git commit fehlgeschlagen"; read -p "Enter..."; exit 1; }

echo
echo "▸ Push zu GitHub (kann Login/Token verlangen)"
echo
git push -u origin main
PUSH_STATUS=$?

echo
if [ $PUSH_STATUS -eq 0 ]; then
  echo "✅ Erfolgreich gepusht."
  echo
  REPO_NAME=$(basename -s .git "$REMOTE")
  REPO_USER=$(echo "$REMOTE" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
  echo "   Site-URL nach Build: https://${REPO_USER}.github.io/${REPO_NAME}/"
  echo
  echo "Nächste Schritte auf GitHub:"
  echo "  1. Settings → Pages → Source: GitHub Actions"
  echo "  2. Tab 'Actions' beobachten — der Build läuft jetzt automatisch"
  echo "  3. Nach 1–2 Min ist die Seite live"
else
  echo "❌ Push fehlgeschlagen."
  echo
  echo "Häufige Ursachen:"
  echo "  • Repo auf GitHub existiert noch nicht → erst auf github.com erstellen"
  echo "  • Authentifizierung: GitHub will ein Personal Access Token statt Passwort"
  echo "    → https://github.com/settings/tokens (classic, repo-scope)"
fi
echo
read -p "Mit Enter schließen..."
