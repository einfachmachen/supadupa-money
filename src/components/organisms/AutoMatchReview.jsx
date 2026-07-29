// Auto-generated module (siehe app-src.jsx)

import React, { useEffect } from "react";
import { Overlay } from "../atoms/Overlay.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { unlinkPendingFromReal } from "../../utils/vormMatch.js";

// Review-Dialog für automatisch verknüpfte Vormerkungen (autoMatchVormerkungen):
// zeigt beide Seiten jeder Verknüpfung nebeneinander, damit sich auf einen
// Blick prüfen lässt, ob Vormerkung und echte Buchung wirklich zusammengehören
// (das Matching prüft nur Konto/Betrag/Datum, nicht den Verwendungszweck) —
// nicht passende Verknüpfungen lassen sich hier direkt wieder lösen, statt
// dafür erst die betroffene Buchung manuell suchen und öffnen zu müssen.
function AutoMatchReview({ matches, txs, setTxs, onClose }) {
  // Nur noch tatsächlich verlinkte Paare zeigen — kann sich durch
  // zwischenzeitliches Lösen (hier oder anderswo) verändert haben.
  const rows = matches
    .map(m => ({ m, pend: txs.find(t => t.id === m.pendId), real: txs.find(t => t.id === m.realId) }))
    .filter(({ pend, real }) => pend && real && pend._linkedTo === real.id);

  useEffect(() => {
    if (rows.length === 0) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  if (!rows.length) return null;

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.txt }}>Automatische Verknüpfungen prüfen</div>
        <div onClick={onClose} style={{ cursor: "pointer", color: T.txt2 }}>{Li("x", 20)}</div>
      </div>
      <div style={{ color: T.txt2, fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
        Das Matching prüft nur Konto, Betrag und Datum — nicht den Verwendungszweck.
        Nicht passende Verknüpfungen hier lösen.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ m, pend, real }) => (
          <div key={m.pendId} style={{ background: T.surf3, borderRadius: 11, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.txt2, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Vormerkung</div>
                <div style={{ color: T.txt, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pend.desc || "(ohne Bezeichnung)"}
                </div>
                <div style={{ color: T.txt2, fontSize: 10 }}>
                  {(pend.date || "").split("-").reverse().join(".")} · {fmt(Math.abs(pend.totalAmount || 0))} €
                </div>
              </div>
              {Li("arrow-right", 14, T.txt2)}
              <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                <div style={{ color: T.txt2, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Echte Buchung</div>
                <div style={{ color: T.txt, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {real.desc || "(ohne Bezeichnung)"}
                </div>
                <div style={{ color: T.txt2, fontSize: 10 }}>
                  {(real.date || "").split("-").reverse().join(".")} · {fmt(Math.abs(real.totalAmount || 0))} €
                </div>
              </div>
            </div>
            <button onClick={() => setTxs(p => unlinkPendingFromReal(p, pend.id, real.id))}
              style={{ width: "100%", padding: "6px", borderRadius: 8, border: `1px solid ${T.neg}44`,
                background: "rgba(234,64,37,0.10)", color: T.neg, fontSize: 11, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
              {Li("unlink", 12, T.neg)} Verknüpfung lösen
            </button>
          </div>
        ))}
      </div>
      <button onClick={onClose}
        style={{ marginTop: 14, width: "100%", padding: "9px", borderRadius: 10, border: "none",
          background: T.pos, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        Fertig
      </button>
    </Overlay>
  );
}

export { AutoMatchReview };
