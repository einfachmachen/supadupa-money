import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Eindeutige Build-ID pro Build (Zeitstempel). Wird sowohl ins Bundle injiziert
// (__BUILD_ID__) als auch als version.json mit ausgeliefert. Die laufende App
// vergleicht beide und lädt bei Abweichung neu → installierte PWAs bekommen
// neue Deploys zuverlässig, ohne manuelles Cache-Leeren.
const BUILD_ID = String(Date.now());

// Base-URL für Deploy:
//   • lokal:                       base = "/"          (Standard)
//   • GitHub Pages (Projektseite):  base = "/<repo-name>/" (autom. via deploy.yml)
// Wird gesetzt via Env-Var VITE_BASE oder beim Build via --base=...
export default defineConfig(() => ({
  plugins: [
    react(),
    {
      // version.json neben index.html ablegen (gleiche Build-ID wie im Bundle).
      name: "emit-version-json",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ buildId: BUILD_ID }),
        });
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  base: process.env.VITE_BASE || "/",
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: "es2020",
    // "hidden": .map-Dateien werden erzeugt (für nachträgliches Entschlüsseln
    // von Prod-Crashes), aber NICHT im Bundle verlinkt → Browser laden sie nicht.
    sourcemap: "hidden",
  },
}));
