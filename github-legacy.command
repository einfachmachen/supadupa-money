#!/bin/bash
# Erstellt einen 'legacy'-Branch im GitHub-Repo als eingefrorene Sicherheitskopie
# der alten App. Nur einmal nötig — danach kann 'old/' irgendwann gefahrlos gelöscht
# werden, weil 'legacy' auf GitHub den Stand konserviert.

cd "$(dirname "$0")" || exit 1

clear
echo "=========================================="
echo "  Legacy-Branch erstellen"
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

# Schon vorhanden?
if git show-ref --verify --quiet refs/heads/legacy; then
  echo "⚠  Branch 'legacy' existiert bereits lokal."
  read -p "Trotzdem überschreiben? [y/N] " GOON
  if [ "$GOON" != "y" ] && [ "$GOON" != "Y" ]; then
    echo "Abgebrochen."
    read -p "Enter..."
    exit 0
  fi
fi

# Aktuellen Branch merken
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "▸ Aktueller Branch: $CURRENT_BRANCH"

# Sicherstellen, dass alles committed ist
if [ -n "$(git status --porcelain)" ]; then
  echo
  echo "❌ Es gibt ungespeicherte Änderungen:"
  git status --short
  echo
  echo "   Erst alle Änderungen mit github-push.command pushen,"
  echo "   dann diese Aktion wiederholen."
  read -p "Enter..."
  exit 1
fi

echo "▸ Branch 'legacy' anlegen (Snapshot vom aktuellen Stand)"
git branch -f legacy

echo "▸ Branch 'legacy' zu GitHub pushen"
git push -u origin legacy
PUSH_STATUS=$?

echo
if [ $PUSH_STATUS -eq 0 ]; then
  echo "✅ Legacy-Branch ist auf GitHub gesichert."
  echo
  REMOTE=$(git remote get-url origin)
  REPO_USER=$(echo "$REMOTE" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
  REPO_NAME=$(basename -s .git "$REMOTE")
  echo "   Erreichbar unter:"
  echo "   https://github.com/${REPO_USER}/${REPO_NAME}/tree/legacy"
  echo
  echo "Du arbeitest jetzt weiter auf '$CURRENT_BRANCH'."
  echo "Falls du irgendwann den 'old/'-Ordner löschen willst:"
  echo "   git rm -r old/ && git commit -m 'remove old app, archived in legacy branch' && git push"
else
  echo "❌ Push fehlgeschlagen."
fi
echo
read -p "Mit Enter schließen..."
