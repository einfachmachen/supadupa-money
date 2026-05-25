/**
 * MyBudgetTracker — lokaler Dev/Prod-Server
 *
 * Standardmäßig Vite-Dev-Modus mit Hot-Reload auf Port 3000.
 * Mit --prod wird stattdessen das gebaute new/dist/ serviert.
 *
 * Beispiele:
 *   node server.js              # Dev (Hot-Reload)
 *   node server.js --prod       # Production
 *   node server.js --port=4000  # anderer Port
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const val = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};

const MODE = has("prod") ? "prod" : "dev";
const PORT = parseInt(val("port", "3000"), 10);
const APP_DIR = path.join(__dirname, "new");

const mimeHeaders = (res, p) => {
  if (p.endsWith(".js") || p.endsWith(".mjs")) res.set("Content-Type", "application/javascript; charset=utf-8");
  else if (p.endsWith(".html")) res.set("Content-Type", "text/html; charset=utf-8");
  else if (p.endsWith(".css")) res.set("Content-Type", "text/css; charset=utf-8");
  else if (p.endsWith(".json") || p.endsWith(".webmanifest")) res.set("Content-Type", "application/json; charset=utf-8");
};

async function startDev() {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: APP_DIR,
    server: { port: PORT, host: true, strictPort: true },
    configFile: path.join(APP_DIR, "vite.config.js"),
  });
  await vite.listen();
  console.log(`🟢 Dev: http://localhost:${PORT}  (Hot-Reload aktiv)`);
}

async function startProd() {
  const distDir = path.join(APP_DIR, "dist");
  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, "index.html"))) {
    console.error(`\n❌ ${distDir} nicht gefunden.\n   Erst bauen:    cd new && npm install && npm run build\n   Oder dev-Modus: node server.js  (ohne --prod)\n`);
    return;
  }
  const app = express();
  app.use(express.static(distDir, { setHeaders: mimeHeaders }));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
  return new Promise((resolve) => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🟢 Prod: http://localhost:${PORT}  (aus dist/)`);
      resolve();
    });
  });
}

console.log(`\nMyBudgetTracker`);
console.log(`Modus: ${MODE === "prod" ? "production" : "development (Vite Hot-Reload)"}\n`);

if (MODE === "prod") await startProd();
else await startDev();

console.log(`\n✅ Bereit. Strg+C zum Beenden.\n`);
