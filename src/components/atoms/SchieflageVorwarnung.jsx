// Live-Vorwarnung beim Anlegen einer Vormerkung / wiederkehrenden Reihe /
// Finanzierung: zeigt einen roten Hinweisbalken, sobald der EINGEGEBENE (noch
// nicht gespeicherte) Entwurf eine Liquiditäts-Schieflage auf dem Giro-Konto neu
// auslöst oder eine bestehende verschärft. Rein informativ — Speichern bleibt
// möglich. Nutzt dieselbe Quelle der Wahrheit wie das globale Schieflage-Banner.
//
// Props:
//   draftTxs — Array der pending-Tx, die gespeichert würden (vom Aufrufer
//              memoisiert, damit nicht jeder Tastendruck neu rechnet).
//   kind     — "vormerkung" | "serie" | "finanzierung" | "umbuchung" (nur fürs Wording).

import React, { useContext, useMemo, useState, useEffect } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, pn } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { MONTHS_S } from "../../utils/constants.js";
import { schieflagePreview } from "../../utils/schieflagePreview.js";

export function SchieflageVorwarnung({ draftTxs, kind = "vormerkung", style }) {
  const { txs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, budgets } = useContext(AppCtx);
  const giroPuffer = (accounts || []).find((a) => a.id === "acc-giro")?.minPuffer || 0;

  // Entkoppeln vom Tippen: Die (recht teure) Schieflage-Berechnung erst nach einer
  // kurzen Pause auslösen — sonst rechnet sie bei JEDEM Tastendruck neu und die
  // Eingabe wird träge.
  const [debDraft, setDebDraft] = useState(draftTxs);
  useEffect(() => {
    const id = setTimeout(() => setDebDraft(draftTxs), 350);
    return () => clearTimeout(id);
  }, [draftTxs]);

  const res = useMemo(() => {
    try {
      return schieflagePreview({
        draftTxs: debDraft, txs, cats, accounts,
        getKumulierterSaldo, getCat, getBudgetForMonth, budgets,
        puffer: pn(giroPuffer) || 0,
      });
    } catch {
      // Rein informativer Hinweis — bei einem Rechenfehler lieber still verbergen
      // als den Anlege-Dialog zu stören.
      return { hasImpact: false };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debDraft, txs, cats, accounts, budgets, giroPuffer]);

  if (!res.hasImpact) return null;

  const label = `${MONTHS_S[res.month]} ${res.year}`;
  const subj = kind === "finanzierung" ? "Diese Finanzierung"
    : kind === "umbuchung" ? "Diese Umbuchung"
    : kind === "serie" ? "Diese wiederkehrende Vormerkung"
    : "Diese Vormerkung";
  const saldoStr = `${res.saldoVal < 0 ? "−" : ""}${fmt(Math.abs(res.saldoVal))} €`;
  const saldoColor = res.saldoVal < 0 ? T.neg : T.txt; // nur negativer Kontostand rot, sonst normal (weiß)

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10,
      background: T.neg + "1f", border: `1.5px solid ${T.neg}`, borderRadius: 12,
      padding: "11px 13px", lineHeight: 1.4, ...style }}>
      {Li("alert-triangle", 18, T.neg)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: T.neg, fontSize: 14, marginBottom: 2 }}>
          {res.isNew ? "Achtung: führt zu einer Schieflage" : "Achtung: verschärft eine Schieflage"}
        </div>
        <div style={{ fontSize: 13, color: T.txt }}>
          {subj} drückt das Giro-Konto ab <b>{label}</b> auf{" "}
          <b style={{ color: saldoColor }}>{saldoStr}</b> —{" "}
          <b style={{ color: T.gold }}>{fmt(res.deficit)} €</b> unter deinen Puffer ({fmt(res.buffer)} €).
          {res.count > 1 ? ` Betroffen: ${res.count} Monate.` : ""}
        </div>
        <div style={{ fontSize: 11.5, color: T.txt2, marginTop: 3 }}>
          Du kannst trotzdem speichern — dies ist nur ein Hinweis.
        </div>
      </div>
    </div>
  );
}
