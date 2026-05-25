#!/bin/bash
# MyBudgetTracker Dual-Server (Dev-Modus mit Hot-Reload)
# macOS: Doppelklick öffnet Terminal und startet alles.

# Ins Verzeichnis der Datei wechseln (egal von wo aufgerufen)
cd "$(dirname "$0")" || exit 1

clear
echo "=========================================="
echo "  MyBudgetTracker — Dev-Modus"
echo "=========================================="
echo

# Node prüfen
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js ist nicht installiert."
  echo
  echo "Installation:"
  echo "  • Über Homebrew:  brew install node"
  echo "  • Oder Installer: https://nodejs.org (LTS-Version)"
  echo
  read -p "Mit Enter schließen..."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node.js ist zu alt (Version $(node -v))."
  echo "   Benötigt: Node 18 oder neuer."
  echo
  read -p "Mit Enter schließen..."
  exit 1
fi
echo "✓ Node $(node -v)"

# Dependencies prüfen / installieren
if [ ! -d "node_modules" ]; then
  echo
  echo "▸ Server-Dependencies werden installiert (einmalig, ~15 Sek)..."
  npm install --no-audit --no-fund --loglevel=error || { echo "❌ npm install fehlgeschlagen"; read -p "Enter..."; exit 1; }
fi
echo "✓ Server-Dependencies da"

if [ ! -d "new/node_modules" ]; then
  echo
  echo "▸ App-Dependencies werden installiert (einmalig, ~30 Sek)..."
  (cd new && npm install --no-audit --no-fund --loglevel=error) || { echo "❌ npm install (new) fehlgeschlagen"; read -p "Enter..."; exit 1; }
fi
echo "✓ App-Dependencies da"

echo
echo "▸ Starte Server..."
echo
echo "   🟢 App:  http://localhost:3000"
echo
echo "   Strg+C beendet den Server. Terminal danach mit ⌘+W schließen."
echo

# Browser nach 2 Sek öffnen
(sleep 2 && open http://localhost:3000) &

node server.js

echo
echo "Server beendet."
read -p "Mit Enter schließen..."
