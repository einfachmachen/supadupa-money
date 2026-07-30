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
//     saldoVal, deficit, deficitDelta, buffer, count,
//     sparAdjust: { year, month, oldAmount, safeAmount } | null }
//   sparAdjust != null bedeutet: die automatische Sparraten-Anpassung (siehe
//   App.jsx/computeSafeCurrentMonthAmount) würde DIESE Schieflage vollständig
//   vermeiden, wenn die laufende Tagesgeld-Sparrate von oldAmount auf
//   safeAmount reduziert wird. null heißt: entweder gibt es keine eindeutige
//   Sparplan-Buchung im laufenden Monat, oder selbst eine Reduzierung würde
//   die Schieflage nicht (vollständig) vermeiden — dann bleibt es bei der
//   normalen Warnung ohne Zusatz-Hinweis.

import { computeKontoWarnungen } from "./kontoWarnungen.js";
import { computeSafeCurrentMonthAmount } from "./sparBerechnen.js";

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

// Findet die EINE eindeutige Sparplan-Abgang-Buchung des laufenden Monats auf
// Giro — dieselbe Eindeutigkeits-Bedingung wie App.jsx (currentMonthSparAdjust):
// bei mehreren/keinen Treffern lieber nichts vorschlagen als raten.
function findCurrentMonthSparAbgang(combinedTxs, today) {
  const y = today.getFullYear(), m = today.getMonth();
  const pad2 = (n) => String(n).padStart(2, "0");
  const monthPfx = `${y}-${pad2(m + 1)}-`;
  const candidates = combinedTxs.filter((t) => t.pending && !t._linkedTo && t._seriesId
    && t.accountId === "acc-giro" && (t.desc || "").startsWith("Sparen·")
    && (t.date || "").startsWith(monthPfx));
  return candidates.length === 1 ? { tx: candidates[0], y, m } : null;
}

export function schieflagePreview({ draftTxs = [], txs = [], cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, puffer, ...rest } = {}) {
  const draft = (draftTxs || []).filter(Boolean);
  if (!draft.length) return { hasImpact: false };

  const combinedTxs = [...txs, ...draft];
  const withDraft = computeKontoWarnungen({ txs: combinedTxs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, puffer, ...rest });
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

  // Könnte die automatische Sparraten-Anpassung diese Schieflage vollständig
  // vermeiden? Nur relevant bei genau EINER Sparplan-Abgang-Buchung im
  // laufenden Monat (sonst wäre nicht eindeutig, welche gemeint ist).
  const sparAdjust = (() => {
    const today = new Date();
    const found = findCurrentMonthSparAbgang(combinedTxs, today);
    if (!found) return null;
    const { tx: abgang, y, m } = found;
    const oldAmount = Math.round(Math.abs(abgang.totalAmount) * 100) / 100;
    const ctx = { txs: combinedTxs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth };
    let safeAmount;
    try {
      safeAmount = computeSafeCurrentMonthAmount({
        y, m, puffer: puffer || 0, abgangId: abgang.id, abgangDesc: abgang.desc, ctx, today,
      });
    } catch {
      return null; // rein informativ — bei einem Rechenfehler lieber nichts vorschlagen
    }
    if (safeAmount == null || safeAmount >= oldAmount) return null; // keine Reduzierung möglich

    // Verifikation: mit der reduzierten Rate wirklich KEINE Schieflage mehr
    // (computeSafeCurrentMonthAmount prüft nur "isSafeWithAmount(mid)"-
    // Kandidaten, garantiert aber nicht, dass 0 selbst sicher ist, wenn der
    // Engpass gar nicht durch diese Sparrate behebbar ist — deshalb hier
    // explizit gegenprüfen statt dem Rückgabewert blind zu vertrauen).
    const adjustedTxs = combinedTxs.map((t) => (t.id === abgang.id ? { ...t, totalAmount: -safeAmount } : t));
    const warningsAfter = computeKontoWarnungen({ txs: adjustedTxs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, puffer });
    if (warningsAfter.length > 0) return null; // reduziert, vermeidet die Schieflage aber nicht vollständig

    return { year: y, month: m, oldAmount, safeAmount };
  })();

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
    sparAdjust,
  };
}
