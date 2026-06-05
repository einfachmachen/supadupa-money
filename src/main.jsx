// Bootstrap der App
import React from "react";
import ReactDOM from "react-dom/client";
import * as LucideIcons from "lucide-react";
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

// Lucide aus dem Bundle global verfügbar machen — der App-Code erwartet
// window.LucideIcons (Original-Muster), wir bedienen es jetzt aus npm
// statt aus einem CDN-Script-Tag.
window.LucideIcons = LucideIcons;

// kvStore initialisieren (lädt alle Settings/Themes/etc. aus IDB in den
// In-Memory-Cache und migriert ggf. vorhandene LS-Werte). Erst danach
// rendern, damit useState-Initialisierer synchron auf den Cache zugreifen.
kvStore.init().finally(() => {
  const loading = document.getElementById("loading");
  if (loading) loading.style.display = "none";

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<SupaDupaMoney />);
});
