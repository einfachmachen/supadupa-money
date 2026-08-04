// Auswahl aus einer Liste als eigener Vollbild-Dialog.
//
// Ersatz für <select> dort, wo die native iOS-Auswahl stört: deren Zeilenhöhe,
// Schrift und Abstände legt das System fest, sie lassen sich nicht anpassen.
// Bei langen Kategorielisten steht dadurch nur eine Handvoll Einträge im Bild
// (Nutzer-Hinweis). Hier stattdessen enge Zeilen (6px Innenabstand) mit
// deutlichen Trennlinien: so passen deutlich mehr Einträge auf den Schirm,
// ohne dass die Schrift kleiner werden muss.
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
            <React.Fragment key={o.id || `__leer-${i}`}>
              <div onClick={() => onSelect(o.id)}
                style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 16px", cursor: "pointer",
                  background: gewaehlt ? `${T.blue}1f` : "transparent",
                  WebkitTapHighlightColor: "transparent" }}>
                <span style={{ width: 18, flexShrink: 0, display: "flex" }}>
                  {gewaehlt ? Li("check", 18, T.blue) : null}
                </span>
                <span style={{ flex: 1, minWidth: 0, color: o.id ? T.txt : T.txt2,
                  fontSize: 18, fontWeight: gewaehlt ? 700 : 500, lineHeight: 1.2 }}>
                  {o.name}
                </span>
              </div>
              {/* Trennlinie als 1px hohe FLÄCHE, nicht als border: im
                  Randlos-Modus setzt eine globale Regel jede Rahmenfarbe auf
                  transparent (.no-borders * in themes.css) — die Linien waren
                  dort deshalb unsichtbar. Ein Hintergrund ist davon nicht
                  betroffen und die Trennung bleibt in beiden Modi erhalten;
                  sie gehört hier zur Lesbarkeit, nicht zur Dekoration. */}
              {i < zeilen.length - 1 && (
                <div style={{ height: 1, background: T.bds, flexShrink: 0 }}/>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export { ListPickerDialog };
