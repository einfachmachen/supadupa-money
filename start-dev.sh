#!/bin/bash
# MyBudgetTracker Dual-Server (Dev-Modus mit Hot-Reload)
# Linux: Aus Datei-Manager mit "Ausführen" oder im Terminal: ./start-dev.sh

cd "$(dirname "$(readlink -f "$0")")" || exit 1

clear
echo "=========================================="
echo "  MyBudgetTracker — Dev-Modus"
echo "=========================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js ist nicht installiert."
  echo
  echo "Installation:"
  echo "  • Debian/Ubuntu:  sudo apt install nodejs npm"
  echo "  • Fedora:         sudo dnf install nodejs"
  echo "  • Arch:           sudo pacman -S nodejs npm"
  echo "  • NodeSource:     https://github.com/nodesource/distributions"
  echo
  read -p "Mit Enter schließen..."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node.js zu alt ($(node -v)). Benötigt: 18+"
  read -p "Enter..."
  exit 1
fi
echo "✓ Node $(node -v)"

if [ ! -d "node_modules" ]; then
  echo
  echo "▸ Server-Dependencies werden installiert (einmalig, ~15 Sek)..."
  npm install --no-audit --no-fund --loglevel=error || { read -p "Enter..."; exit 1; }
fi
echo "✓ Server-Dependencies da"

if [ ! -d "new/node_modules" ]; then
  echo
  echo "▸ App-Dependencies werden installiert (einmalig, ~30 Sek)..."
  (cd new && npm install --no-audit --no-fund --loglevel=error) || { read -p "Enter..."; exit 1; }
fi
echo "✓ App-Dependencies da"

echo
echo "▸ Starte Server..."
echo
echo "   🟢 App:  http://localhost:3000"
echo
echo "   Strg+C beendet den Server."
echo

# Browser nach 2 Sek öffnen (xdg-open ist Linux-Standard)
(sleep 2 && xdg-open http://localhost:3000 >/dev/null 2>&1) &

node server.js

echo
read -p "Mit Enter schließen..."
