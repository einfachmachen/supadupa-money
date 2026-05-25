#!/bin/bash
# Erstellt einen 'legacy'-Branch im GitHub-Repo als eingefrorene Sicherheitskopie.

cd "$(dirname "$(readlink -f "$0")")" || exit 1

clear
echo "=========================================="
echo "  Legacy-Branch erstellen"
echo "=========================================="
echo

if ! command -v git >/dev/null 2>&1; then echo "❌ Git nicht installiert."; read -p "Enter..."; exit 1; fi
if [ ! -d ".git" ]; then echo "❌ Kein Git-Repo gefunden."; read -p "Enter..."; exit 1; fi

if git show-ref --verify --quiet refs/heads/legacy; then
  echo "⚠  Branch 'legacy' existiert bereits."
  read -p "Trotzdem überschreiben? [y/N] " GOON
  [ "$GOON" != "y" ] && [ "$GOON" != "Y" ] && { echo "Abgebrochen."; read -p "Enter..."; exit 0; }
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "▸ Aktueller Branch: $CURRENT_BRANCH"

if [ -n "$(git status --porcelain)" ]; then
  echo
  echo "❌ Es gibt ungespeicherte Änderungen:"
  git status --short
  echo "   Erst mit github-push.sh pushen, dann erneut versuchen."
  read -p "Enter..."
  exit 1
fi

echo "▸ Branch 'legacy' anlegen"
git branch -f legacy

echo "▸ Push zu GitHub"
git push -u origin legacy
PUSH_STATUS=$?

echo
if [ $PUSH_STATUS -eq 0 ]; then
  echo "✅ Legacy-Branch gesichert."
  REMOTE=$(git remote get-url origin)
  REPO_USER=$(echo "$REMOTE" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
  REPO_NAME=$(basename -s .git "$REMOTE")
  echo "   https://github.com/${REPO_USER}/${REPO_NAME}/tree/legacy"
else
  echo "❌ Push fehlgeschlagen."
fi
echo
read -p "Mit Enter schließen..."
