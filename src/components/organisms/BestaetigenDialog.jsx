// Rückfrage im App-Stil statt window.confirm().
//
// Der native Browser-Dialog bestimmt seine Breite selbst. In einem schmalen
// Fenster — etwa dem auf Handy-Breite gezogenen Firefox — ragt er rechts aus
// dem Bild, und der Bestätigen-Knopf ist nicht mehr erreichbar (Nutzer-Bild).
// Daran lässt sich von außen nichts ändern, also übernehmen wir die Rückfrage
// selbst: Overlay (kennt die Notch), volle Breite bis 480px, Knöpfe
// untereinander mit 48px Mindesthöhe wie überall sonst.
//
// Aufruf über den Context: `frageBestaetigung(text, onJa, { jaLabel, ton })`.
// `ton:"gefahr"` färbt den Bestätigen-Knopf rot — für Löschen und alles, was
// Daten überschreibt.

import React from "react";
import { Overlay } from "../atoms/Overlay.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function BestaetigenDialog({ frage, jaLabel = "OK", ton, onJa, onAbbrechen }) {
  const gefahr = ton === "gefahr";
  const akzent = gefahr ? T.neg : T.blue;
  // Erste Zeile als Überschrift, der Rest als Erläuterung — window.confirm
  // trennte das per Leerzeile, das übernehmen wir.
  const zeilen = String(frage || "").split(/\n\s*\n/);
  const titel = zeilen[0] || "";
  const rest = zeilen.slice(1).join("\n\n");

  return (
    // Ueber ALLEN anderen Ebenen: die Rueckfrage kommt fast immer aus einem
    // bereits offenen Dialog (Bearbeiten zIndex 80, Modale bis 1100). Mit der
    // Standard-Ebene lag sie dahinter — der Tipp auf "Löschen" sah aus, als
    // passiere nichts. Der native window.confirm hatte das Problem nicht, weil
    // ihn das System ueber die ganze Seite legte.
    <Overlay onClose={onAbbrechen} zIndex={2000}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: rest ? 10 : 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `${akzent}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Li(gefahr ? "alert-triangle" : "help-circle", 18, akzent)}
        </div>
        <div style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 16, fontWeight: 700,
          lineHeight: 1.35, whiteSpace: "pre-line" }}>{titel}</div>
      </div>

      {rest && (
        <div style={{ color: T.txt2, fontSize: 13.5, lineHeight: 1.5, marginBottom: 18,
          whiteSpace: "pre-line" }}>{rest}</div>
      )}

      {/* Untereinander statt nebeneinander: nebeneinander werden die Knöpfe auf
          schmalen Geräten zu eng, und genau darum ging es hier. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onJa}
          style={{ width: "100%", minHeight: 48, borderRadius: 12, border: "none",
            background: akzent, color: T.on_accent || "#fff", fontSize: 15, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit" }}>
          {jaLabel}
        </button>
        <button onClick={onAbbrechen}
          style={{ width: "100%", minHeight: 48, borderRadius: 12,
            border: `1px solid ${T.bd}`, background: "transparent", color: T.txt2,
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Abbrechen
        </button>
      </div>
    </Overlay>
  );
}

export { BestaetigenDialog };
