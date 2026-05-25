#!/bin/bash
# Recovery: entfernt versehentlich getrackte node_modules/dist aus dem Repo.
# Nutzen wenn ein vorheriger Commit diese Ordner enthalten hat.

cd "$(dirname "$0")" || exit 1

clear
echo "=========================================="
echo "  Git-Recovery: node_modules entfernen"
echo "=========================================="
echo

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Git nicht installiert."
  read -p "Enter..."
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "❌ Kein Git-Repo gefunden."
  read -p "Enter..."
  exit 1
fi

echo "Dieses Skript entfernt unerwünschte Ordner aus dem Git-Tracker"
echo "(node_modules, dist, _site) und sorgt dafür, dass die .gitignore stimmt."
echo
echo "Was passiert:"
echo "  1. .gitignore wird ggf. ergänzt"
echo "  2. node_modules/, dist/, _site/ werden aus dem Git-Index entfernt"
echo "     (lokal bleiben sie erhalten, nur Git ignoriert sie ab jetzt)"
echo "  3. Ein Cleanup-Commit wird erstellt"
echo "  4. Push zu GitHub"
echo
read -p "Fortfahren? [y/N] " GOON
if [ "$GOON" != "y" ] && [ "$GOON" != "Y" ]; then
  echo "Abgebrochen."
  read -p "Enter..."
  exit 0
fi
echo

# 1. .gitignore ergänzen
echo "▸ .gitignore prüfen"
touch .gitignore
for pattern in "node_modules/" "dist/" "_site/" ".DS_Store" "*.log"; do
  if ! grep -qxF "$pattern" .gitignore; then
    echo "$pattern" >> .gitignore
    echo "  + $pattern hinzugefügt"
  fi
done

# 2. Aus dem Index entfernen (nicht von der Platte!)
echo "▸ node_modules/dist/_site aus Git-Index entfernen"
git rm -r --cached node_modules dist _site 2>/dev/null
find . -type d -name node_modules -exec git rm -r --cached --quiet {} + 2>/dev/null
find . -type d -name dist -not -path "./old/*" -exec git rm -r --cached --quiet {} + 2>/dev/null
echo "  (Lokal bleiben die Ordner erhalten, nur Git ignoriert sie jetzt.)"

# 3. Commit
echo "▸ Status:"
CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$CHANGED" = "0" ]; then
  echo "  Nichts geändert. Repo ist schon sauber."
  read -p "Enter..."
  exit 0
fi

git add .gitignore
git commit -q -m "chore: remove tracked node_modules/dist, fix .gitignore" || {
  echo "❌ Commit fehlgeschlagen"
  read -p "Enter..."
  exit 1
}
echo "  ✓ Commit erstellt"

# 4. Push
echo "▸ Push zu GitHub"
echo
git push
PUSH_STATUS=$?

echo
if [ $PUSH_STATUS -eq 0 ]; then
  echo "✅ Repo aufgeräumt."
  echo "   GitHub sollte jetzt nur noch ~4 MB groß sein."
  echo
  echo "ACHTUNG: Die alten Commits in der History enthalten weiterhin node_modules."
  echo "Falls du das auch loswerden willst (History neu schreiben):"
  echo "   git filter-repo --path node_modules --invert-paths --force"
  echo "   git push --force"
  echo "Im Normalfall reicht aber, dass neue Commits sauber sind."
else
  echo "❌ Push fehlgeschlagen."
fi
echo
read -p "Mit Enter schließen..."
