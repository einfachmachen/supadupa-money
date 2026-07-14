// Automatische Verknüpfung von Vormerkungen mit später eintreffenden echten
// Buchungen (CSV-Import, Bank-Live-Abruf/Enable-Banking-Übernahme).
//
// Bisher musste JEDE Vormerkung — egal ob manuell angelegt oder als
// vorläufige (PDNG-)Buchung vom Bank-Abruf übernommen — von Hand über
// MatchingScreen mit der später eintreffenden echten Buchung verknüpft
// werden. Das hier übernimmt die eindeutigen Fälle automatisch, konservativ
// nach demselben Prinzip wie das bestehende PayPal-Matching (paypalMatch.js):
// nur EINDEUTIGE Treffer (exakter Betrag, gleiches Konto, enges Datums-
// fenster, jeweils einziger Kandidat auf beiden Seiten) werden automatisch
// verknüpft. Mehrdeutige Fälle bleiben bewusst dem manuellen Matching
// überlassen, um Fehlverknüpfungen bei den Finanzdaten zu vermeiden.

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
  return !!(tx && tx.pending && (tx._bankPending || tx._ebRef || tx._fp || tx._csvSource));
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
      linkedIds: (tx.linkedIds || []).includes(pendId) ? (tx.linkedIds || []) : [...(tx.linkedIds || []), pendId],
      note: combinedNote,
      _amtMismatch: amtMismatch ? { pendId, pendAmt: pendTotal, realAmt: real.totalAmount } : undefined,
    };
    if (tx.id === pendId) return { ...tx, pending: false, _linkedTo: realId, accountId: real.accountId };
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
      linkedIds: (tx.linkedIds || []).includes(manualId) ? (tx.linkedIds || []) : [...(tx.linkedIds || []), manualId],
      note: combinedNote,
      _amtMismatch: amtMismatch ? { pendId: manualId, pendAmt: manualTotal, realAmt: bank.totalAmount } : undefined,
    };
    if (tx.id === manualId) return { ...tx, pending: false, _linkedTo: bankId, accountId: bank.accountId };
    return tx;
  });
}

// Sucht eindeutige Vormerkung↔echte-Buchung-Paare und verknüpft sie.
// Budget-Platzhalter (_budgetSubId) bleiben außen vor — die folgen einer
// anderen Logik (Soll/Ist-Vergleich statt 1:1-Verknüpfung).
export function autoMatchVormerkungen(txs) {
  const pendings = txs.filter(t => t.pending && !t._budgetSubId);
  const reals = txs.filter(t => !t.pending && !t._linkedTo);
  if (!pendings.length || !reals.length) return { txs, linkedCount: 0 };

  const acctOf = t => t.accountId || "acc-giro";
  const cents = t => Math.round(Math.abs(t.totalAmount || 0) * 100);
  const isIncomeOf = t => t._csvType ? t._csvType === "income" : (t.totalAmount || 0) > 0;

  const pairs = [];
  pendings.forEach(p => {
    reals.forEach(r => {
      if (acctOf(p) !== acctOf(r)) return;
      if (cents(p) !== cents(r)) return;
      if (isIncomeOf(p) !== isIncomeOf(r)) return;
      const diffDays = Math.abs((new Date(r.date).getTime() - new Date(p.date).getTime()) / DAY);
      if (diffDays > MAX_DAYS) return;
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
