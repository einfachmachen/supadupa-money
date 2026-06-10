// Bootstrap der App
import React from "react";
import ReactDOM from "react-dom/client";
import SupaDupaMoney from "./App.jsx";
import {
  installLegacyBridge,
  migrateLegacyLocalStorage,
} from "./state/persistence.js";
import { kvStore } from "./utils/kvStore.js";

import "./theme/css/base.css";
import "./theme/css/themes.css";

// Migration und Legacy-Bridge sicherstellen (alte Pfade weiterhin lauffähig)
migrateLegacyLocalStorage();
installLegacyBridge();

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
});
