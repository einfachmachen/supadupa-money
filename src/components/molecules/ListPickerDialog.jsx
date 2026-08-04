// Auswahl aus einer Liste als eigener Vollbild-Dialog.
//
// Ersatz für <select> dort, wo die native iOS-Auswahl stört: deren Zeilenhöhe,
// Schrift und Abstände legt das System fest, sie lassen sich nicht anpassen.
// Bei langen Kategorielisten steht dadurch nur eine Handvoll Einträge im Bild
// (Nutzer-Hinweis). Hier stattdessen kompakte Zeilen mit Trennlinien, sodass
// deutlich mehr auf einmal sichtbar ist.
//
// Props:
//   title       – Überschrift des Dialogs
//   options     – [{id, name}] in Anzeigereihenfolge
//   value       – aktuell gewählte id ("" = keine)
//   emptyLabel  – Beschriftung der Zeile ganz oben, die die Auswahl leert
//                 (null = diese Zeile weglassen)
//   onSelect(id)– gewählte id (auch "" bei emptyLabel)
//   onClose     – ohne Auswahl zurück

import React from "react";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function ListPickerDialog({ title, options = [], value, emptyLabel = null, onSelect, onClose }) {
  const zeilen = emptyLabel != null
    ? [{ id: "", name: emptyLabel }, ...options]
    : options;

  return (
    <div className="mobile-modal"
      style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 320,
        display: "flex", flexDirection: "column" }}>
      <MobileHeader title={title} onBack={onClose}/>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch", background: T.surf2,
        paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        {zeilen.map((o, i) => {
          const gewaehlt = (o.id || "") === (value || "");
          return (
            <div key={o.id || `__leer-${i}`} onClick={() => onSelect(o.id)}
              style={{ display: "flex", alignItems: "center", gap: 10,
                padding: "11px 16px", cursor: "pointer",
                // Trennlinie zwischen den Zeilen, nicht unter der letzten.
                borderBottom: i < zeilen.length - 1 ? `1px solid ${T.bd}` : "none",
                background: gewaehlt ? `${T.blue}1f` : "transparent",
                WebkitTapHighlightColor: "transparent" }}>
              <span style={{ width: 18, flexShrink: 0, display: "flex" }}>
                {gewaehlt ? Li("check", 18, T.blue) : null}
              </span>
              <span style={{ flex: 1, minWidth: 0, color: o.id ? T.txt : T.txt2,
                fontSize: 18, fontWeight: gewaehlt ? 700 : 500, lineHeight: 1.25 }}>
                {o.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ListPickerDialog };
