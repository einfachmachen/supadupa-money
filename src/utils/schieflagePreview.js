// Live-Vorwarnung VOR dem Speichern: Würde die gerade eingegebene (noch nicht
// gespeicherte) Vormerkung / wiederkehrende Reihe / Finanzierung eine
// Liquiditäts-Schieflage NEU auslösen oder eine bestehende VERSCHLIMMERN?
//
// Nutzt dieselbe Quelle der Wahrheit wie das Schieflage-Banner und das
// Dashboard-Widget: computeKontoWarnungen. Trick: Die Entwurfs-Vormerkungen
// werden an txs angehängt und neu gerechnet. computeKontoWarnungen leitet die
// Monatsanker für Zukunftsmonate rekursiv aus txs ab (über saldoAt), daher
// propagiert der Entwurf korrekt über alle Folgemonate — ohne Sonderlogik.
//
// Sauberer Vergleich statt Monats-Diff: Der Entwurf ist rein ADDITIV, also gilt
// auf jedem Tag  Saldo_basis = Saldo_mit − Entwurfsbeitrag(bis zu diesem Tag).
// So unterscheiden wir echtes Verschlechtern (Entwurf drückt den Saldo unter den
// Puffer) von bloßem Sichtbarmachen eines ohnehin schon negativen Tages (z. B.
// wenn eine Einnahme-Vormerkung an einem latent unterdeckten Tag eingetragen
// wird — das soll NICHT warnen).
//
// Rückgabe:
//   { hasImpact:false }
//   { hasImpact:true, isNew, year, month, date,
//     saldoVal, deficit, deficitDelta, buffer, count }   // frühester betroffener Monat

import { computeKontoWarnungen } from "./kontoWarnungen.js";

// Vorzeichenbehafteter Giro-Beitrag einer Entwurfs-Tx (gleiche Konvention wie
// kontoWarnungen/saldo). Nur acc-giro, keine Umbuchungs-/Budget-Platzhalter.
function signedGiro(t) {
  if (!t || t._linkedTo || t._budgetSubId) return 0;
  const acc = t.accountId || "acc-giro";
  if (acc !== "acc-giro") return 0;
  const type = t._csvType || ((t.totalAmount || 0) >= 0 ? "income" : "expense");
  const abs = Math.abs(t.totalAmount || 0);
  return type === "income" ? abs : -abs;
}

export function schieflagePreview({ draftTxs = [], txs = [], ...rest } = {}) {
  const draft = (draftTxs || []).filter(Boolean);
  if (!draft.length) return { hasImpact: false };

  const withDraft = computeKontoWarnungen({ txs: [...txs, ...draft], ...rest });
  if (!withDraft.length) return { hasImpact: false };

  // Entwurfsbeitrag bis einschließlich Datum d (ISO-Strings vergleichen chronologisch).
  const draftCumTo = (dateStr) =>
    draft.reduce((s, t) => (t.date && t.date <= dateStr ? s + signedGiro(t) : s), 0);

  const EPS = 0.005;
  const impacted = [];
  withDraft.forEach((w) => {
    let best = null;
    (w.allDays || []).forEach((day) => {
      const delta = draftCumTo(day.date);     // <0 = Entwurf drückt den Saldo
      if (delta >= -EPS) return;               // Entwurf hat diesen Tag nicht verschlechtert
      const balanceBase = day.saldoVal - delta;
      const deficitBase = Math.max(0, w.minPuffer - balanceBase);
      const contribution = day.deficit - deficitBase; // wie viel der Entwurf zum Defizit beiträgt
      if (contribution > EPS && (!best || contribution > best.deficitDelta)) {
        best = {
          date: day.date, saldoVal: day.saldoVal, deficit: day.deficit,
          deficitDelta: contribution, isNew: deficitBase <= EPS,
        };
      }
    });
    if (best) impacted.push({ year: w.year, month: w.month, minPuffer: w.minPuffer, ...best });
  });
  if (!impacted.length) return { hasImpact: false };

  impacted.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  const f = impacted[0];
  return {
    hasImpact: true,
    isNew: f.isNew,
    year: f.year,
    month: f.month,
    date: f.date,
    saldoVal: Math.round(f.saldoVal),
    deficit: Math.round(f.deficit),
    deficitDelta: Math.round(f.deficitDelta),
    buffer: Math.round(f.minPuffer),
    count: impacted.length,
  };
}
