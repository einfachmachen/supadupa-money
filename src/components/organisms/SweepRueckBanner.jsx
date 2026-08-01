// Erinnerungsbanner für eine fällige Sweep-Rücküberweisung.
//
// Beim Zins-Sweep liegt am Stichtag der volle Betrag auf dem Tagesgeld — der
// Überhang muss am nächsten Banktag zurück aufs Giro, sonst fehlt er dort für
// die Belastungen des Monatsanfangs (Miete & Co.). Genau die sind der Grund,
// warum der Sweep-Betrag überhaupt begrenzt ist. Diese Rückbuchung zu
// vergessen ist der einzige Weg, wie der Sweep schiefgehen kann — deshalb ein
// eigenes, auffälliges Banner statt einer Zeile im Sparschwein-Panel, das man
// erst aufklappen müsste.
//
// Sichtbar, sobald das Rückbuchungsdatum erreicht ist (also am Ersten des
// Folgemonats bzw. am nächsten Banktag danach) und solange die Buchung noch
// offen ist. Sobald die echte Kontobewegung eintrifft und die Vormerkung
// abgeglichen wird, verschwindet es von selbst.

import React, { useContext } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function SweepRueckBanner() {
  const { txs, accounts, navigateToSparen } = useContext(AppCtx);

  const pad2 = (n) => String(n).padStart(2, "0");
  const heute = new Date();
  const heuteIso = `${heute.getFullYear()}-${pad2(heute.getMonth() + 1)}-${pad2(heute.getDate())}`;

  // Der Zugang auf dem Giro ist das Bein, das den Rückfluss beschreibt.
  const faellig = (txs || [])
    .filter((t) => t.pending && t._sweepId && t.accountId === "acc-giro"
      && t.totalAmount > 0 && String(t.date) <= heuteIso)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  if (!faellig.length) return null;

  const tx = faellig[0];
  const quelle = (txs || []).find((q) => q.id === tx._linkedTo);
  const quellKonto = accounts.find((a) => a.id === (quelle && quelle.accountId));
  const [y, m, d] = String(tx.date).split("-");
  const datum = `${d}.${m}.${String(y).slice(2)}`;
  // Überfällig = das Datum liegt bereits hinter uns.
  const ueberfaellig = String(tx.date) < heuteIso;

  return (
    <div
      onClick={navigateToSparen}
      style={{
        margin: "0 10px 6px", borderRadius: 10, cursor: navigateToSparen ? "pointer" : "default",
        background: ueberfaellig ? `${T.neg}18` : "rgba(212,175,55,0.14)",
        border: `1px solid ${ueberfaellig ? T.neg + "66" : T.gold + "66"}`,
        padding: "9px 11px", display: "flex", alignItems: "center", gap: 10,
      }}
    >
      <div style={{ flexShrink: 0, display: "flex" }}>
        {Li(ueberfaellig ? "alert-triangle" : "arrow-left-right", 17, ueberfaellig ? T.neg : T.gold)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: ueberfaellig ? T.neg : T.gold, fontSize: 11, fontWeight: 700 }}>
          {ueberfaellig ? "Rücküberweisung überfällig" : "Rücküberweisung fällig"}
        </div>
        <div style={{ color: T.txt2, fontSize: 9, lineHeight: 1.5 }}>
          {quellKonto ? `${quellKonto.name} → Giro` : "zurück aufs Giro"} · seit {datum}
          {ueberfaellig && " — die Belastungen am Monatsanfang brauchen das Geld auf dem Giro."}
        </div>
      </div>
      <div style={{
        flexShrink: 0, color: ueberfaellig ? T.neg : T.gold, fontSize: 15,
        fontWeight: 800, fontFamily: NUM_FONT,
      }}>
        {fmt(Math.abs(tx.totalAmount))} €
      </div>
    </div>
  );
}

export { SweepRueckBanner };
