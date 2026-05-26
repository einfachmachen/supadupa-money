#!/usr/bin/env bash
# ============================================================
# MyBudgetTracker — GitHub Pages Deploy einrichten
# ============================================================
# Führt schrittweise aus:
#   1) Sanity-Check: liegen wichtige Files vor?
#   2) Backup von new/ anlegen
#   3) .github/workflows/deploy.yml schreiben
#   4) Commit + Push
#   5) Status anzeigen + Link zur Actions-Seite
#
# Stoppt bei jedem Fehler. Beantwortet Fragen mit y oder n.
# ============================================================

set -e   # Skript bricht bei jedem Fehler ab

# -----------------------------------------------------------
# Vorbereitung — wo befinden wir uns?
# -----------------------------------------------------------
DUAL_DIR="$(pwd)"

if [ ! -d "${DUAL_DIR}/new" ]; then
  echo "FEHLER: ${DUAL_DIR} sieht nicht aus wie das dual-Verzeichnis."
  echo "       Gehe zuerst nach 'cd ~/dein/Pfad/zu/dual' und starte das Skript dort."
  exit 1
fi
if [ ! -d "${DUAL_DIR}/.git" ]; then
  echo "FEHLER: ${DUAL_DIR}/.git existiert nicht — kein Git-Repo."
  exit 1
fi

echo ""
echo "=== Arbeitsverzeichnis: ${DUAL_DIR} ==="
echo ""

# -----------------------------------------------------------
# 1) Sanity-Check: wichtige Dateien vorhanden?
# -----------------------------------------------------------
echo "── Schritt 1: Sanity-Check ──"

CRITICAL_FILES=(
  "new/src/App.jsx"
  "new/src/components/screens/DashboardScreen.jsx"
  "new/src/components/screens/DashboardScreenV2.jsx"
  "new/src/components/screens/SettingsInline.jsx"
  "new/package.json"
  "new/vite.config.js"
)
MISSING=0
for f in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "${DUAL_DIR}/${f}" ]; then
    echo "  FEHLT: $f"
    MISSING=$((MISSING + 1))
  else
    echo "  OK:    $f"
  fi
done
if [ ${MISSING} -gt 0 ]; then
  echo ""
  echo "FEHLER: ${MISSING} kritische Datei(en) fehlen. Abbruch."
  exit 1
fi

# Inhalts-Check: Dashboard-Toggle wirklich drin?
if ! grep -q "Dashboard-Stil" "${DUAL_DIR}/new/src/components/screens/SettingsInline.jsx"; then
  echo ""
  echo "FEHLER: 'Dashboard-Stil' nicht in SettingsInline.jsx gefunden."
  echo "       Du hast einen alten Stand. Hol Dir erst die aktuellen Files aus Claude."
  exit 1
fi
echo "  OK:    'Dashboard-Stil' in SettingsInline.jsx vorhanden"
echo ""

# -----------------------------------------------------------
# 2) Backup von new/ anlegen
# -----------------------------------------------------------
echo "── Schritt 2: Backup ──"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${HOME}/Desktop/dual-new-backup-${TIMESTAMP}"

if [ -d "${BACKUP_DIR}" ]; then
  echo "  Backup-Ordner existiert schon: ${BACKUP_DIR}"
else
  cp -r "${DUAL_DIR}/new" "${BACKUP_DIR}"
  echo "  Backup angelegt: ${BACKUP_DIR}"
  echo "  Größe: $(du -sh "${BACKUP_DIR}" | cut -f1)"
fi
echo ""

# -----------------------------------------------------------
# 3) Workflow-Datei (neu) schreiben
# -----------------------------------------------------------
echo "── Schritt 3: Workflow-Datei schreiben ──"

mkdir -p "${DUAL_DIR}/.github/workflows"

cat > "${DUAL_DIR}/.github/workflows/deploy.yml" << 'WORKFLOW'
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: new/package-lock.json

      - name: Install dependencies
        working-directory: ./new
        run: npm ci --no-audit --no-fund

      - name: Build app
        working-directory: ./new
        run: npm run build -- --base=/${{ github.event.repository.name }}/

      - name: Assemble site
        run: |
          mkdir -p _site
          cp -r new/dist/* _site/
          echo "── Site-Inhalt ──"
          find _site -maxdepth 2 -type f | head -30

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
WORKFLOW

echo "  Geschrieben: .github/workflows/deploy.yml"
echo ""

# -----------------------------------------------------------
# 4) Alte docs/-Ordner aufräumen (falls vorhanden)
# -----------------------------------------------------------
echo "── Schritt 4: Aufräumen ──"
if [ -d "${DUAL_DIR}/docs" ]; then
  echo "  Lösche alten docs/-Ordner..."
  rm -rf "${DUAL_DIR}/docs"
  echo "  Erledigt."
else
  echo "  Kein docs/ vorhanden, alles gut."
fi
echo ""

# -----------------------------------------------------------
# 5) Git-Status
# -----------------------------------------------------------
echo "── Schritt 5: Git-Status vor Commit ──"
cd "${DUAL_DIR}"
git status --short
echo ""

# -----------------------------------------------------------
# 6) Frage: Commit + Push?
# -----------------------------------------------------------
echo "── Schritt 6: Commit + Push ──"
echo ""
read -p "Jetzt committen und pushen? (y/n): " CONFIRM
if [ "${CONFIRM}" != "y" ]; then
  echo "Abgebrochen. Nichts wurde gepusht."
  echo "Du kannst manuell weitermachen:"
  echo "  git add ."
  echo "  git commit -m 'Restore deploy workflow'"
  echo "  git push"
  exit 0
fi

git add .
git commit -m "Restore deploy workflow + cleanup" || {
  echo "Nichts zu committen — alle Files schon im aktuellen Stand."
}
git push

echo ""
echo "=== Fertig ==="
echo ""
echo "Schau jetzt auf:"
echo "  https://github.com/einfachmachen/supadupa/actions"
echo ""
echo "Du solltest einen neuen Run sehen, der gerade läuft."
echo "Wenn der grün abschließt (1-3 Min), ist die App live unter:"
echo "  https://einfachmachen.github.io/supadupa/"
echo ""
echo "Im Browser dann mit Cmd+Shift+R neu laden."
