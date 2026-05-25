#!/bin/bash
# Schneller Commit + Push

cd "$(dirname "$(readlink -f "$0")")" || exit 1

clear
echo "=========================================="
echo "  GitHub Push"
echo "=========================================="
echo

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Git ist nicht installiert."
  read -p "Enter..."
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "❌ Hier gibt's noch kein Git-Repo."
  echo "   Erst github-init.sh ausführen."
  read -p "Enter..."
  exit 1
fi

echo "▸ Änderungen seit letztem Commit:"
echo
git status --short
echo

CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$CHANGED" = "0" ]; then
  echo "Nichts zu committen — Arbeitsbaum sauber."
  read -p "Trotzdem push versuchen? [y/N] " PUSH_ANYWAY
  if [ "$PUSH_ANYWAY" = "y" ] || [ "$PUSH_ANYWAY" = "Y" ]; then
    git push
  fi
  read -p "Enter..."
  exit 0
fi

DEFAULT_MSG="Update $(date +%Y-%m-%d\ %H:%M)"
read -p "Commit-Message [$DEFAULT_MSG]: " MSG
MSG="${MSG:-$DEFAULT_MSG}"
echo

echo "▸ git add ."
git add . || { echo "❌"; read -p "Enter..."; exit 1; }

echo "▸ git commit"
git commit -q -m "$MSG" || { echo "❌"; read -p "Enter..."; exit 1; }

echo "▸ git push"
git push
PUSH_STATUS=$?

echo
if [ $PUSH_STATUS -eq 0 ]; then
  echo "✅ Erfolgreich gepusht."
  echo "   GitHub Actions baut jetzt — in 1–2 Min ist die Seite aktualisiert."
else
  echo "❌ Push fehlgeschlagen."
fi
echo
read -p "Mit Enter schließen..."
