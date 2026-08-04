// Auswahl aus einer Liste als eigener Vollbild-Dialog.
//
// Ersatz für <select> dort, wo die native iOS-Auswahl stört: deren Zeilenhöhe,
// Schrift und Abstände legt das System fest, sie lassen sich nicht anpassen.
// Bei langen Kategorielisten steht dadurch nur eine Handvoll Einträge im Bild
// (Nutzer-Hinweis). Hier stattdessen bewusst enge Zeilen (6px Innenabstand,
// 16px Schrift) mit deutlichen Trennlinien: so passen etwa doppelt so viele
// Einträge auf den Schirm, ohne dass die Liste unruhig wirkt.
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
                padding: "6px 16px", cursor: "pointer",
                // Trennlinie zwischen den Zeilen, nicht unter der letzten.
                // T.bds statt T.bd: bei so engen Zeilen ist die schwaechere
                // Linie kaum noch auszumachen, sie soll aber gerade hier die
                // Zeilen auseinanderhalten.
                borderBottom: i < zeilen.length - 1 ? `1px solid ${T.bds}` : "none",
                background: gewaehlt ? `${T.blue}1f` : "transparent",
                WebkitTapHighlightColor: "transparent" }}>
              <span style={{ width: 16, flexShrink: 0, display: "flex" }}>
                {gewaehlt ? Li("check", 16, T.blue) : null}
              </span>
              <span style={{ flex: 1, minWidth: 0, color: o.id ? T.txt : T.txt2,
                fontSize: 16, fontWeight: gewaehlt ? 700 : 500, lineHeight: 1.2 }}>
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
