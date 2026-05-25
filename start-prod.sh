#!/bin/bash
# MyBudgetTracker Dual-Server (Production-Modus)

cd "$(dirname "$(readlink -f "$0")")" || exit 1

clear
echo "=========================================="
echo "  MyBudgetTracker — Production-Modus"
echo "=========================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js ist nicht installiert."
  echo "   sudo apt install nodejs npm  /  sudo dnf install nodejs  /  …"
  read -p "Enter..."
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
  echo "▸ Server-Dependencies installieren..."
  npm install --no-audit --no-fund --loglevel=error || { read -p "Enter..."; exit 1; }
fi

if [ ! -d "new/node_modules" ]; then
  echo "▸ App-Dependencies installieren..."
  (cd new && npm install --no-audit --no-fund --loglevel=error) || { read -p "Enter..."; exit 1; }
fi

echo "▸ Baue App (kann 5–15 Sek dauern)..."
(cd new && npm run build) || { echo "❌ Build fehlgeschlagen"; read -p "Enter..."; exit 1; }

echo
echo "▸ Starte Server..."
echo "   🟢 App:  http://localhost:3000"
echo

(sleep 1 && xdg-open http://localhost:3000 >/dev/null 2>&1) &

node server.js --prod

read -p "Mit Enter schließen..."
