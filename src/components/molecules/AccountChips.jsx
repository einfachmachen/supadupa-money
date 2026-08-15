// Gemeinsame Konto-Schnellwahl im Stil des Vormerken-Dialogs.
// Quadratische Kacheln (Icon oben, Name unten), eine Reihe; optional eine
// „Alle“-Kachel vorne und/oder eine „+ Konto“-Kachel hinten.
//
// Props:
//   accounts      – Konten-Liste
//   value         – ausgewählte accountId (oder null für „Alle“)
//   onChange(id)  – Auswahl-Callback (id bzw. null bei „Alle“)
//   allowAll      – wenn true: „Alle“-Kachel vorne (value null)
//   allLabel      – Beschriftung der „Alle“-Kachel (Default „Alle“)
//   onAddAccount  – wenn gesetzt: „+ Konto“-Kachel hinten (Callback)
//   addLabel      – Beschriftung der „+ Konto“-Kachel (Default „Konto“)
//   excludeId     – Konto ausblenden (z.B. Umbuchungs-Quelle)
//   minCols       – Mindest-Spaltenzahl (hält z.B. Ziel auf Quell-Breite)
//   S             – Größen-Tokens { fs, radius, gap } (Default wie Vormerken)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { schriftAuf } from "../../theme/amtPill.js";

const DEFAULT_S = { fs: 26, radius: 16, gap: 14 };

function AccountChips({
  accounts = [], value, onChange,
  allowAll = false, allLabel = "Alle",
  onAddAccount = null, addLabel = "Konto",
  excludeId = null, minCols = 0, S = DEFAULT_S,
}) {
  const list = (accounts || []).filter((a) => a.id !== excludeId);
  const cols = Math.max(minCols, list.length + (allowAll ? 1 : 0) + (onAddAccount ? 1 : 0));
  if (cols === 0) return null;

  // GEWAEHLT heisst gefuellt, nicht getoent (§4.4). Die 13%-Toenung war auf
  // der hellen Platte blasser als die nicht gewaehlten Kacheln daneben — die
  // Auswahl sah damit schwaecher aus als der Rest (Nutzer-Hinweis
  // "inkonsistent"). Jetzt traegt die gewaehlte Kachel ihre Kontofarbe voll,
  // die uebrigen sind Tasten.
  const aufChip = (color, schwelle) => schriftAuf(color || T.blue, T.on_accent, schwelle);
  const chipStyle = (selected, color) => ({
    aspectRatio: "1", borderRadius: S.radius, padding: 4,
    background: selected ? (color || T.blue) : "rgba(255,255,255,0.06)",
    border: `2px solid ${selected ? (color || T.blue) : T.bd}`,
    color: selected ? aufChip(color) : T.txt2,
    cursor: "pointer", fontFamily: "inherit", position: "relative",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 2, minWidth: 0, overflow: "hidden",
  });
  const nameStyle = (selected) => ({
    fontSize: S.fs - 12, fontWeight: selected ? 700 : 500,
    width: "100%", textAlign: "center",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1,
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: S.gap / 2 }}>
      {allowAll && (
        <button onClick={() => onChange(null)} className={value == null ? undefined : "wahl-taste"}
          style={chipStyle(value == null, T.blue)}>
          {Li("layers", S.fs, value == null ? aufChip(T.blue, 3) : T.txt2)}
          <span style={nameStyle(value == null)}>{allLabel}</span>
        </button>
      )}
      {list.map((acc) => {
        const sel = value === acc.id;
        const col = acc.color || T.blue;
        return (
          // Nicht gewaehlte Kacheln sind Tasten (Nutzer-Wunsch) — die gewaehlte
          // traegt ihre Kontofarbe voll.
          <button key={acc.id} onClick={() => onChange(acc.id)} className={sel ? undefined : "wahl-taste"}
            style={chipStyle(sel, col)}>
            {acc.delayDays > 0 && (
              <span style={{ position: "absolute", top: 3, right: 3, fontSize: S.fs - 16,
                color: schriftAuf(T.gold, T.on_accent), fontWeight: 700, background: T.gold, borderRadius: 4,
                padding: "0 3px", lineHeight: 1.3, letterSpacing: "-0.5px" }}>
                +{acc.delayDays}
              </span>
            )}
            {Li(acc.icon || "landmark", S.fs, sel ? aufChip(col, 3) : T.txt2)}
            <span style={nameStyle(sel)}>{acc.name || acc.id}</span>
          </button>
        );
      })}
      {onAddAccount && (
        // Die Kachel liegt direkt auf dem Seitenhintergrund — dort traegt die
        // Akzentfarbe nicht in jedem Theme (helle Platte, siehe aufGrund).
        // Auf der Taste traegt die Akzentfarbe wieder — deshalb hier kein
        // aufGrund() mehr, sondern schlicht T.blue.
        <button onClick={onAddAccount} className="wahl-taste" style={{ ...chipStyle(false, T.blue),
          background: "rgba(74,159,212,0.06)", border: `1.5px dashed ${T.blue}66`, color: T.acc }}>
          {Li("plus", S.fs, T.acc)}
          <span style={{ ...nameStyle(false), color: T.acc }}>{addLabel}</span>
        </button>
      )}
    </div>
  );
}

export { AccountChips };
