import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base-URL für Deploy:
//   • lokal:                       base = "/"          (Standard)
//   • GitHub Pages /supadupa/new/:  base = "/supadupa/new/"
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
    sourcemap: true,
  },
}));
