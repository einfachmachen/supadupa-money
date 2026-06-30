// Bootstrap der App
import React from "react";
import ReactDOM from "react-dom/client";
import SupaDupaMoney from "./App.jsx";
import {
  installLegacyBridge,
  migrateLegacyLocalStorage,
} from "./state/persistence.js";
import { kvStore } from "./utils/kvStore.js";
import { startAutoUpdate } from "./utils/autoUpdate.js";

import "./theme/css/base.css";
import "./theme/css/themes.css";

// Migration und Legacy-Bridge sicherstellen (alte Pfade weiterhin lauffähig)
migrateLegacyLocalStorage();
installLegacyBridge();

// Enable-Banking-Redirect abfangen: Die Bank leitet nach der Freigabe mit
// ?code=…&state=ebmoney… zurück. Code zwischenspeichern und die URL säubern,
// damit der Bank-Assistent ihn aufgreifen kann (siehe EnableBankingWizard).
try {
  const sp = new URLSearchParams(window.location.search);
  const code = sp.get("code");
  const state = sp.get("state") || "";
  if (code && state.startsWith("ebmoney")) {
    sessionStorage.setItem("eb_pending_code", code);
    sessionStorage.setItem("eb_open_connect", "1"); // App öffnet danach direkt den Connect-Screen
    window.history.replaceState({}, "", window.location.origin + window.location.pathname);
  }
} catch (e) { /* ignorieren */ }

// React-Globals exponieren, damit Drittcode (Lucide-CDN) weiterhin funktioniert
window.React = React;
window.ReactDOM = ReactDOM;

// Lucide-Gesamtpaket (~1500 Icons, der größte Brocken im Bundle) asynchron
// als eigenen Chunk laden. Die im Code fest verdrahteten UI-Icons sind über
// utils/lucideStatic.js bereits im Hauptbundle und rendern sofort; das
// Gesamtset braucht nur der Icon-Picker und nutzergewählte Icons.
// Nach dem Laden re-rendert die App einmal ("lucide-ready").
import("lucide-react").then(m => {
  window.LucideIcons = m;
  window.dispatchEvent(new Event("lucide-ready"));
});

// kvStore initialisieren (lädt alle Settings/Themes/etc. aus IDB in den
// In-Memory-Cache und migriert ggf. vorhandene LS-Werte). Erst danach
// rendern, damit useState-Initialisierer synchron auf den Cache zugreifen.
kvStore.init().finally(() => {
  const loading = document.getElementById("loading");
  if (loading) loading.style.display = "none";

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<SupaDupaMoney />);

  // Boot-Notbremse entschärfen: App ist gemountet (siehe index.html-Selbstheilung).
  try {
    window.__appMounted = true;
    sessionStorage.removeItem("sdm_boot_retry");
  } catch (e) { /* ignorieren */ }

  // Auf neue Deploys prüfen und die App ggf. automatisch aktualisieren.
  startAutoUpdate();
});
