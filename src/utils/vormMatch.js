// Automatische Verknüpfung von Vormerkungen mit später eintreffenden echten
// Buchungen (CSV-Import, Bank-Live-Abruf/Enable-Banking-Übernahme).
//
// Bisher musste JEDE Vormerkung — egal ob manuell angelegt oder als
// vorläufige (PDNG-)Buchung vom Bank-Abruf übernommen — von Hand über
// MatchingScreen mit der später eintreffenden echten Buchung verknüpft
// werden. Das hier übernimmt die eindeutigen Fälle automatisch, konservativ
// nach demselben Prinzip wie das bestehende PayPal-Matching (paypalMatch.js):
// nur EINDEUTIGE Treffer (exakter Betrag, gleiches Konto, enges Datums-
// fenster — die echte Buchung darf nur am Datum der Vormerkung oder DANACH
// liegen, nie davor — jeweils einziger Kandidat auf beiden Seiten) werden
// automatisch verknüpft. Mehrdeutige Fälle bleiben bewusst dem manuellen
// Matching überlassen, um Fehlverknüpfungen bei den Finanzdaten zu vermeiden.

import { uid } from "./format.js";

const DAY = 86400000;
const MAX_DAYS = 10;

// Erkennt eine bei der Bank selbst noch vorgemerkte (PDNG) Zeile — auch bei
// ALTEN, schon vor Einführung des expliziten _bankPending-Flags importierten
// Datensätzen: _fp/_csvSource/_ebRef werden AUSSCHLIESSLICH von den Import-
// Pipelines (CSV-Import, Enable-Banking-Abruf/-Wizard) gesetzt, NIE von einer
// manuell angelegten Vormerkung — ihr Vorhandensein ist daher ein zuverlässiger
// Rückfall, ohne dass alte, bereits gespeicherte Buchungen migriert werden müssten.
export function isBankPending(tx) {
  return !!(tx && tx.pending) && hasBankOrigin(tx);
}

// Wie isBankPending, aber ohne die pending-Bedingung: stammt die Zeile
// überhaupt aus einem Abruf/Import? Bleibt auch dann wahr, wenn sie inzwischen
// mit der endgültigen Buchung verknüpft und damit auf pending:false gesetzt
// wurde — genau das braucht die Badge-Anzeige (s. badgeLinkTarget).
export function hasBankOrigin(tx) {
  return !!(tx && (tx._bankPending || tx._ebRef || tx._fp || tx._csvSource));
}

// Welche verknüpfte Zeile gehört als "🔗"-Badge an eine Buchung?
//
// Interessant ist immer die SELBST ANGELEGTE Vormerkung — sie zeigt, was man
// geplant hatte. Die Vorab-Meldung derselben Zahlung durch die Bank (PDNG) ist
// dagegen keine Zusatzinformation: gleicher Betrag, praktisch gleicher Text,
// in der Liste liest sie sich wie eine Dublette der Buchung selbst. Solche
// Bank-Zeilen werden hier übersprungen; hat eine von ihnen zuvor eine manuelle
// Vormerkung absorbiert (linkPendingToPending), tritt diese an ihre Stelle —
// sonst gäbe es gar kein Badge mehr für die eigene Planung.
export function badgeLinkTarget(linkedId, findById) {
  const lt = findById(linkedId);
  if (!lt) return null;
  if (!hasBankOrigin(lt)) return lt;
  return (lt.linkedIds || []).map(findById).find(t => t && !hasBankOrigin(t)) || null;
}

// Führt die eigentliche Verknüpfung durch — identische Feld-Logik wie
// MatchingScreen.doMatch (manuelles Matching), damit beide Wege nie
// auseinanderlaufen.
export function linkPendingToReal(txs, pendId, realId) {
  const pend = txs.find(t => t.id === pendId);
  const real = txs.find(t => t.id === realId);
  if (!pend || !real) return txs;
  const cleanRealNote = (real.note || "").split(" · ")
    .filter(part => !part.startsWith("Vormerkung:"))
    .join(" · ");
  const vormNote = pend.desc && pend.desc !== real.desc ? `Vormerkung: ${pend.desc}` : "";
  const combinedNote = [vormNote, pend.note || "", cleanRealNote]
    .filter(Boolean).join(" · ") || cleanRealNote || "";
  const pendSplits = (pend.splits || []).filter(s => s.catId);
  const pendTotal = pendSplits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
  const newSplits = pendSplits.length > 0
    ? pendSplits.map(sp => ({ ...sp, id: uid() }))
    : real.splits;
  const amtMismatch = pendTotal > 0 && Math.abs(pendTotal - real.totalAmount) > 0.005;
  return txs.map(tx => {
    if (tx.id === realId) return {
      ...tx,
      splits: newSplits,
      // Ursprüngliche Splits sichern (falls noch nicht durch eine frühere
      // Verknüpfung gesichert) — damit sich eine spätere Verknüpfung wieder
      // sauber lösen lässt (siehe unlinkPendingFromReal), statt die von der
      // Vormerkung übernommene Kategorie für immer stehen zu lassen.
      _splitsBeforeLink: tx._splitsBeforeLink || tx.splits || [],
      linkedIds: (tx.linkedIds || []).includes(pendId) ? (tx.linkedIds || []) : [...(tx.linkedIds || []), pendId],
      note: combinedNote,
      _amtMismatch: amtMismatch ? { pendId, pendAmt: pendTotal, realAmt: real.totalAmount } : undefined,
    };
    if (tx.id === pendId) return { ...tx, pending: false, _linkedTo: realId, accountId: real.accountId };
    return tx;
  });
}

// Löst eine zuvor über linkPendingToReal (manuell oder automatisch)
// hergestellte Verknüpfung wieder — die Vormerkung wird wieder offen
// (pending), die echte Buchung verliert die Verknüpfung und bekommt bei der
// letzten gelösten Verknüpfung ihre ursprünglichen Splits zurück (siehe
// _splitsBeforeLink oben). Identische Logik wie das bestehende "Alle
// entknüpfen" in EditPopup.jsx, hier für den Review einzelner automatischer
// Treffer (siehe AutoMatchReview.jsx).
export function unlinkPendingFromReal(txs, pendId, realId) {
  return txs.map(tx => {
    if (tx.id === realId) {
      const newLinkedIds = (tx.linkedIds || []).filter(id => id !== pendId);
      const isLastUnlink = newLinkedIds.length === 0;
      if (isLastUnlink && tx._splitsBeforeLink) {
        const { _splitsBeforeLink, ...rest } = tx;
        return { ...rest, linkedIds: newLinkedIds, splits: _splitsBeforeLink };
      }
      return { ...tx, linkedIds: newLinkedIds };
    }
    if (tx.id === pendId) return { ...tx, pending: true, _linkedTo: null };
    return tx;
  });
}

// Verknüpft eine MANUELL angelegte Vormerkung mit einer noch bei der Bank
// vorgemerkten (PDNG) Buchung — z. B. wenn beide während einer Offline-Phase
// unabhängig voneinander entstanden sind (Nutzer legt die Vormerkung von Hand
// an, während gleichzeitig/später der Bank-Abruf dieselbe Zahlung schon als
// „vorgemerkt" meldet). Anders als linkPendingToReal bleibt die Bank-Zeile
// selbst weiterhin pending (sie ist ja noch nicht real gebucht) — sie
// „gewinnt" nur die Notiz/Kategorie der manuellen Vormerkung und absorbiert
// sie, damit die Prognose den Betrag nicht doppelt zählt. Sobald die Bank die
// Buchung später endgültig bucht, greift dafür ganz normal linkPendingToReal
// (automatisch oder manuell) — die Bank-Zeile bleibt bis dahin der „lebende"
// Platzhalter.
export function linkPendingToPending(txs, manualId, bankId) {
  const manual = txs.find(t => t.id === manualId);
  const bank = txs.find(t => t.id === bankId);
  if (!manual || !bank) return txs;
  const cleanBankNote = (bank.note || "").split(" · ")
    .filter(part => !part.startsWith("Vormerkung:"))
    .join(" · ");
  const vormNote = manual.desc && manual.desc !== bank.desc ? `Vormerkung: ${manual.desc}` : "";
  const combinedNote = [vormNote, manual.note || "", cleanBankNote]
    .filter(Boolean).join(" · ") || cleanBankNote || "";
  const manualSplits = (manual.splits || []).filter(s => s.catId);
  const manualTotal = manualSplits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
  const newSplits = manualSplits.length > 0
    ? manualSplits.map(sp => ({ ...sp, id: uid() }))
    : bank.splits;
  const amtMismatch = manualTotal > 0 && Math.abs(manualTotal - bank.totalAmount) > 0.005;
  return txs.map(tx => {
    if (tx.id === bankId) return {
      ...tx,
      splits: newSplits,
      // Wie in linkPendingToReal: Original-Splits sichern, damit sich die
      // Verknüpfung später wieder sauber lösen lässt (unlinkPendingFromReal
      // bzw. "Alle entknüpfen" im EditPopup).
      _splitsBeforeLink: tx._splitsBeforeLink || tx.splits || [],
      linkedIds: (tx.linkedIds || []).includes(manualId) ? (tx.linkedIds || []) : [...(tx.linkedIds || []), manualId],
      note: combinedNote,
      _amtMismatch: amtMismatch ? { pendId: manualId, pendAmt: manualTotal, realAmt: bank.totalAmount } : undefined,
    };
    if (tx.id === manualId) return { ...tx, pending: false, _linkedTo: bankId, accountId: bank.accountId };
    return tx;
  });
}

// IDs, die in den Prognose-Drilldown-Listen (concTxs/unbudgetedPend)
// ausgeblendet werden müssen, weil ihnen bereits eine Vormerkung zugeordnet
// wurde und sie sonst doppelt erscheinen.
//
// Grundfall: eine Buchung trägt `_linkedTo` auf ihr Gegenstück → das
// Gegenstück ist der überlebende Eintrag … ABER NICHT beim Verschmelzen
// zweier Vormerkungen (linkPendingToPending): dort ist die Bank-Vormerkung
// gerade der EINZIGE noch sichtbare Eintrag (die manuelle wurde auf
// pending:false gesetzt und fällt als Duplikat-Gegenstück ohnehin raus).
// Würde man sie hier zusätzlich ausblenden, verschwände der Betrag komplett
// aus Prognose Mitte/Ende — obwohl die Saldo-Rechnung ihn korrekt enthält.
// Erkennbar ist dieser Fall daran, dass die Gegenseite noch pending ist UND
// die absorbierte Vormerkung in ihren `linkedIds` führt.
export function buildLinkedPendIds(txs) {
  const byId = new Map();
  (txs || []).forEach(t => byId.set(t.id, t));
  const s = new Set();
  (txs || []).forEach(t => {
    if (t.pending || !t._linkedTo) return;
    const partner = byId.get(t._linkedTo);
    if (partner && partner.pending && (partner.linkedIds || []).includes(t.id)) return;
    s.add(t._linkedTo);
  });
  return s;
}

// Sucht eindeutige Vormerkung↔echte-Buchung-Paare und verknüpft sie.
// Budget-Platzhalter (_budgetSubId) bleiben außen vor — die folgen einer
// anderen Logik (Soll/Ist-Vergleich statt 1:1-Verknüpfung).
export function autoMatchVormerkungen(txs) {
  const pendings = txs.filter(t => t.pending && !t._budgetSubId);
  const reals = txs.filter(t => !t.pending && !t._linkedTo);
  if (!pendings.length || !reals.length) return { txs, linkedCount: 0, matched: [] };

  const acctOf = t => t.accountId || "acc-giro";
  const cents = t => Math.round(Math.abs(t.totalAmount || 0) * 100);
  const isIncomeOf = t => t._csvType ? t._csvType === "income" : (t.totalAmount || 0) > 0;

  const pairs = [];
  pendings.forEach(p => {
    reals.forEach(r => {
      if (acctOf(p) !== acctOf(r)) return;
      if (cents(p) !== cents(r)) return;
      if (isIncomeOf(p) !== isIncomeOf(r)) return;
      // Die echte Buchung bestätigt die Vormerkung — sie kann also nur an
      // deren Datum oder DANACH eintreffen, nie davor (eine ältere Buchung
      // mit zufällig demselben Betrag ist etwas anderes, kein Treffer).
      const diffDays = (new Date(r.date).getTime() - new Date(p.date).getTime()) / DAY;
      if (diffDays < 0 || diffDays > MAX_DAYS) return;
      pairs.push({ pendId: p.id, realId: r.id, diffDays });
    });
  });

  // Eindeutigkeit: pro Vormerkung und pro Buchung darf es nur GENAU einen
  // Kandidaten geben — sonst bleibt es dem manuellen Matching überlassen.
  const countByPend = {}, countByReal = {};
  pairs.forEach(p => {
    countByPend[p.pendId] = (countByPend[p.pendId] || 0) + 1;
    countByReal[p.realId] = (countByReal[p.realId] || 0) + 1;
  });
  const uniquePairs = pairs.filter(p => countByPend[p.pendId] === 1 && countByReal[p.realId] === 1);

  let next = txs;
  const matched = [];
  uniquePairs.forEach(p => {
    const pend = txs.find(t => t.id === p.pendId);
    if (pend) matched.push({ pendId: p.pendId, realId: p.realId, desc: pend.desc, totalAmount: pend.totalAmount, date: pend.date });
    next = linkPendingToReal(next, p.pendId, p.realId);
  });
  return { txs: next, linkedCount: uniquePairs.length, matched };
}
