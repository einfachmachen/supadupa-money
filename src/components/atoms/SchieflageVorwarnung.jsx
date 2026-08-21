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
import { betrag } from "../../utils/betrag.jsx";
import { Li } from "../../utils/icons.jsx";
import { MONTHS_S } from "../../utils/constants.js";
import { schieflagePreview } from "../../utils/schieflagePreview.js";
import { absicherungsStatus } from "../../utils/absicherung.js";
import { useTagesgeldFrei } from "../../state/useTagesgeldFrei.js";
import { aufToenung } from "../../theme/amtPill.js";

// Der Kasten tönt sich mit seiner eigenen Warnfarbe ein UND schreibt die
// Überschrift in derselben Farbe. Auf einem Grund, der aus genau diesem Ton
// gemischt ist, schrumpft der Kontrast — im Theme "Keyboard" (Ausgaben-Cyan)
// gemessene 3,86:1. `aufToenung()` prüft deshalb gegen die WIRKLICH gemalte
// Fläche und weicht auf Weiß bzw. Fast-Schwarz aus, wenn die Warnfarbe dort
// nicht mehr trägt. Rahmen und Symbol bleiben farbig, der Kasten also
// weiterhin als Warnung erkennbar.
const TOENUNG = 0x1f / 255; // = die "1f"-Deckkraft der Fläche unten

const kurzDat = (iso) => {
  const [y, m, d] = String(iso).split("-");
  return `${d}.${m}.${String(y).slice(2)}`;
};

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

  // Was das Tagesgeld davon auffangen könnte — dieselbe Quelle wie auf der
  // Startseite (`useTagesgeldFrei`), damit beide Stellen nie auseinanderlaufen.
  // MUSS vor dem frühen return stehen: Hooks laufen in fester Reihenfolge.
  const tagesgeldFrei = useTagesgeldFrei();
  const status = useMemo(() => (res.hasImpact
    ? absicherungsStatus({
        warnungen: [{ date: res.date, deficit: res.deficit }], tagesgeldFrei })
    : null), [res, tagesgeldFrei]);

  if (!res.hasImpact) return null;

  const label = `${MONTHS_S[res.month]} ${res.year}`;
  const subj = kind === "finanzierung" ? "Diese Finanzierung"
    : kind === "umbuchung" ? "Diese Umbuchung"
    : kind === "serie" ? "Diese wiederkehrende Vormerkung"
    : "Diese Vormerkung";
  const saldoStr = `${res.saldoVal < 0 ? "−" : ""}${fmt(Math.abs(res.saldoVal))} €`;
  // JEDE Akzentfarbe in diesem Kasten liegt auf der Tönung, nicht auf der
  // Platte — sie läuft deshalb durch `auf()`. Symbole dürfen dabei die
  // niedrigere Schwelle nutzen (3:1, WCAG 1.4.11).
  const auf = (farbe, schwelle) => aufToenung(farbe, TOENUNG, ".warn-karte", schwelle);
  const saldoColor = res.saldoVal < 0 ? auf(T.neg) : T.txt; // nur negativer Kontostand rot, sonst normal (weiß)

  return (
    // `warn-karte`: In Themes mit gegensaetzlichen Flaechen ("Tastenhell")
    // erklaert das Theme diesen Kasten zur Karte — sonst laege die
    // Akzentfarbe der Ueberschrift auf ihrer eigenen 12%-Toenung, und das
    // ist auf hellem Grund nicht zu lesen (Nutzer-Bild "bestaetigen").
    <div className="warn-karte" style={{ display: "flex", alignItems: "flex-start", gap: 10,
      background: T.neg + "1f", border: `1.5px solid ${T.neg}`, borderRadius: 12,
      padding: "11px 13px", lineHeight: 1.4, ...style }}>
      {Li("alert-triangle", 18, auf(T.neg, 3))}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: auf(T.neg), fontSize: 14, marginBottom: 2 }}>
          {res.isNew ? "Achtung: führt zu einer Schieflage" : "Achtung: verschärft eine Schieflage"}
        </div>
        <div style={{ fontSize: 13, color: T.txt }}>
          {subj} drückt das Giro-Konto ab <b>{label}</b> auf{" "}
          <b style={{ color: saldoColor }}>{saldoStr}</b> —{" "}
          <b style={{ color: auf(T.gold) }}>{betrag(res.deficit)} €</b> unter deinen Puffer ({betrag(res.buffer)} €).
          {res.count > 1 ? ` Betroffen: ${res.count} Monate.` : ""}
        </div>
        {/* Was tun? — dieselbe Aussage wie der Absicherungs-Satz auf der
            Startseite, in denselben Worten. Bisher erschien sie erst NACH dem
            Speichern (Nutzer-Hinweis); dabei ist genau hier der Moment, in
            dem sie etwas ändert: Ein Engpass, den das Tagesgeld deckt, ist
            eine Überweisung — einer, den es nicht deckt, ist eine
            Entscheidung.

            Faengt die Sparraten-Automatik den Engpass ohnehin ganz ab
            (`sparAdjust`), entfaellt diese Zeile: Dann ist gar nichts zu tun,
            und ein Rueckhol-Hinweis waere eine Meldung zu viel — genau das,
            was hier zu viel war. */}
        {!res.sparAdjust && status && status.art === "rueckholen" && (
          <div style={{ fontSize: 13, color: T.txt, marginTop: 4 }}>
            {Li("arrow-down", 13, auf(T.pos, 3))}{" "}
            Deckbar: bis <b>{kurzDat(status.holenBis)}</b>{" "}
            <b style={{ color: auf(T.pos) }}>{betrag(status.fehlt)} €</b> vom Tagesgeld
            zurückholen.
          </div>
        )}
        {!res.sparAdjust && status && status.art === "eng" && status.frei !== null && (
          <div style={{ fontSize: 13, color: T.txt, marginTop: 4 }}>
            {Li("alert-triangle", 13, auf(T.neg, 3))}{" "}
            Vom Tagesgeld sind nur <b style={{ color: auf(T.gold) }}>{betrag(status.frei)} €</b>{" "}
            verfügbar — <b>{betrag(status.luecke)} €</b> bleiben offen.
          </div>
        )}
        {res.sparAdjust && (
          <div style={{ fontSize: 13, color: T.txt, marginTop: 4 }}>
            {Li("arrow-down", 13, auf(T.pos, 3))}{" "}
            Durch Reduzierung der Tagesgeld-Sparrate im{" "}
            {MONTHS_S[res.sparAdjust.month]} {res.sparAdjust.year} von{" "}
            <b>{betrag(res.sparAdjust.oldAmount)} €</b> auf{" "}
            <b style={{ color: auf(T.pos) }}>{betrag(res.sparAdjust.safeAmount)} €</b>{" "}
            wird die Schieflage vermieden.
          </div>
        )}
        {/* Bewusst `txt` statt `txt2`: die Zeile steht auf der GETÖNTEN Fläche,
            nicht auf der Platte — der abgeschwächte Ton fiel dort in mehreren
            Themes unter 4,5:1. Zurückgenommen wirkt sie schon über die Größe. */}
        <div style={{ fontSize: 11.5, color: T.txt, marginTop: 3 }}>
          Du kannst trotzdem speichern — dies ist nur ein Hinweis.
        </div>
      </div>
    </div>
  );
}
