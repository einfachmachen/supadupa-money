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
import { sparAbgaenge, computeSafeAmountForAbgang } from "./sparBerechnen.js";

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

// Welche Sparrate kann DIESEN Engpass abfangen?
//
// Nicht mehr die des laufenden Monats (so war es bis hierher), sondern die
// LETZTE Rate STRIKT VOR dem Engpass-Tag. Geld, das sie nicht abbucht, liegt
// von ihrem Termin an auf Giro und steht am Engpass-Tag zur Verfügung; eine
// spätere Rate käme zu spät.
//
// Der Fall, der die naive Variante entlarvt: Engpass am 5. Januar, die
// Januar-Rate geht am 28. ab. „Reduziere im Monat des Problems" hilft dort
// nichts — zuständig ist die Dezember-Rate. Deshalb der taggenaue Vergleich.
//
// Die Eindeutigkeits-Bedingung bleibt (siehe `sparAbgaenge`): Monate mit
// mehreren Sparbuchungen werden ausgelassen statt geraten.
function findSparAbgangVor(combinedTxs, engpassIso) {
  const raten = sparAbgaenge(combinedTxs);
  let treffer = null, naechste = null;
  raten.forEach((r, i) => {
    if ((r.date || "") < engpassIso) { treffer = r; naechste = raten[i + 1] || null; }
  });
  return treffer ? { tx: treffer, bisIso: naechste ? naechste.date : null } : null;
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
  // vermeiden — und wenn ja, WELCHE Rate trägt sie?
  const sparAdjust = (() => {
    const today = new Date();
    const found = findSparAbgangVor(combinedTxs, f.date);
    if (!found) return null;
    const { tx: abgang, bisIso } = found;
    const [y, m] = abgang.date.split("-").map(Number);
    const oldAmount = Math.round(Math.abs(abgang.totalAmount) * 100) / 100;
    const ctx = { txs: combinedTxs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth };
    let safeAmount;
    try {
      safeAmount = computeSafeAmountForAbgang({
        abgang, bisIso, puffer: puffer || 0, ctx, today,
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

    return { year: y, month: m - 1, oldAmount, safeAmount };
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
