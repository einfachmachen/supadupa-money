import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base-URL für Deploy:
//   • lokal:                       base = "/"          (Standard)
//   • GitHub Pages (Projektseite):  base = "/<repo-name>/" (autom. via deploy.yml)
// Wird gesetzt via Env-Var VITE_BASE oder beim Build via --base=...
export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: "es2020",
    // Source-Maps nur im Dev-Server; die .map im Prod-Build war 4,4 MB groß
    sourcemap: false,
  },
}));
