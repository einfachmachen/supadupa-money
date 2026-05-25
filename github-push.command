#!/bin/bash
# Schneller Commit + Push
# Fragt nach Commit-Message und pusht.

cd "$(dirname "$0")" || exit 1

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
  echo "   Erst github-init.command ausführen."
  read -p "Enter..."
  exit 1
fi

# Status anzeigen
echo "▸ Änderungen seit letztem Commit:"
echo
git status --short
echo

CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$CHANGED" = "0" ]; then
  echo "Nichts zu committen — Arbeitsbaum sauber."
  echo
  read -p "Trotzdem push versuchen (falls lokale Commits anstehen)? [y/N] " PUSH_ANYWAY
  if [ "$PUSH_ANYWAY" = "y" ] || [ "$PUSH_ANYWAY" = "Y" ]; then
    git push
  fi
  read -p "Enter..."
  exit 0
fi

# Commit-Message
echo
DEFAULT_MSG="Update $(date +%Y-%m-%d\ %H:%M)"
read -p "Commit-Message [$DEFAULT_MSG]: " MSG
MSG="${MSG:-$DEFAULT_MSG}"
echo

echo "▸ git add ."
git add . || { echo "❌ git add fehlgeschlagen"; read -p "Enter..."; exit 1; }

echo "▸ git commit"
git commit -q -m "$MSG" || { echo "❌ git commit fehlgeschlagen"; read -p "Enter..."; exit 1; }

echo "▸ git push"
git push
PUSH_STATUS=$?

echo
if [ $PUSH_STATUS -eq 0 ]; then
  echo "✅ Erfolgreich gepusht."
  echo "   GitHub Actions baut jetzt — in 1–2 Min ist die Seite aktualisiert."
else
  echo "❌ Push fehlgeschlagen. Siehe Meldung oben."
fi
echo
read -p "Mit Enter schließen..."
