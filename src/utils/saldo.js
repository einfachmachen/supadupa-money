// ─────────────────────────────────────────────────────────────────────
// Zentrale Saldo-Berechnung — Single Source of Truth
// ─────────────────────────────────────────────────────────────────────
//
// Diese Datei implementiert die offizielle Saldo-Spec (Mai 2026):
//
// "Das System unterscheidet strikt zwischen dem realen Ist-Zustand
//  (Tagessaldo) und zukünftigen Plan-Werten (PrognoseM und PrognoseE).
//  Eine Besonderheit ist ein untermonatliches, dynamisches Roll-Over-
//  Verfahren beim Erreichen von Meilensteinen."
//
// ── Phasen (für heutige/zukünftige Tage) ─────────────────────────────
//
// Eine Budget-Reservierung gilt für ihren GESAMTEN Geltungszeitraum,
// nicht nur am Meilenstein-Tag:
//   Mitte-Budget gilt Tag 1..14, Ende-/Gesamt-Budget gilt Tag 15..letzter.
//
// Erste Hälfte (Tag 1..14):       Tagessaldo = Anker + Ist(1..X) − RestMitte
// Zweite Hälfte (Tag 15..letzter): Tagessaldo = Anker + Ist(1..X) − RestEnde
//
// Sonderfall „nur Gesamt-Budget" (kein Mitte-Anteil): Da es keinen
// Mitte-Anteil gibt, der allein die erste Hälfte abdeckt, wird das volle
// Gesamt-Budget bereits ab Tag 1 reserviert (RestMitte fällt pro Kategorie
// auf das Gesamt-Budget zurück).
//
// Eine Reservierung wird beim Übergang 14.→15. bzw. Monatsletzter→1. des
// Folgemonats NUR dann freigegeben, wenn der reale heutige Tag den
// jeweiligen Stichtag bereits überschritten hat. Für reine Zukunftsmonate
// bleibt sie also durchgehend bestehen (kein Hochspringen am 15.), und der
// Monatsend-Stand trägt korrekt als Anker in den Folgemonat.
//
// Für VERGANGENE Tage (vor heute) zeigt der Tagessaldo das reine Ist —
// dort wurde real gebucht, eine Reservierung ergäbe keinen Sinn.
//
// Wobei (pro Budget-Kategorie K, dann summiert):
//   RestMitte = Σ_K max(0, Ref_K − Ist1bis14_K)
//     Ref_K = BudgetMitte_K (falls Mitte-Anteil gesetzt), sonst BudgetGesamt_K
//   Budget_H2_K = max(0, BudgetEnde_K − Ist1bis14_K)         (dynamisches Roll-Over)
//   RestEnde = Σ_K max(0, Budget_H2_K − Ist15bisLetzter_K)
//
// BudgetMitte_K = Mitte-Platzhalter (_budgetSubId.endsWith("_mitte"))
// BudgetEnde_K  = Mitte+Ende-Platzhalter (= GESAMTBUDGET für den Monat)
// Ist_K         = reale + vorgemerkte Buchungen (excl. _linkedTo-Duplikate, _budgetSubId)
//
// ── Konten-Logik ─────────────────────────────────────────────────────
//
// Budgets liegen typischerweise auf acc-giro. Konten ohne Budget (Tagesgeld)
// haben kein RestMitte/RestEnde.
//
// Konten-Transfer: Vormerkungen mit _linkedTo auf ANDEREM Konto zählen
// (das ist eine Sparen-Umbuchung). _linkedTo auf GLEICHEM Konto sind
// CSV-Duplikate und werden ausgefiltert.
//
// Gesamt-Sicht (accId=null): Summe über alle Konten.

import { buildTxIdMap, isDuplCounterpart } from "./tx.js";
import { pn, round2 } from "./format.js";
import { nextBankWorkday } from "./date.js";

// ── Helper: signed amount ─────────────────────────────────────────────
function signedAmount(t) {
  const type = t._csvType || (t.totalAmount >= 0 ? "income" : "expense");
  const abs = Math.abs(t.totalAmount || 0);
  return type === "income" ? abs : -abs;
}

// ── Helper: gehört Tx zu diesem Konto? ────────────────────────────────
function isOnAccount(t, accId) {
  if(!accId) return true;
  const acc = t.accountId || "acc-giro";
  return acc === accId;
}

// ── Anker: Saldo am Ende des Vormonats ───────────────────────────────
//
// Spec: "Sobald der 1. Tag des Folgemonats erreicht ist, verfallen alle
//        Budget-Planwerte des Vormonats. Der tatsächliche Endkontostand
//        des Vormonats wird als unveränderlicher Anfangssaldo für den
//        neuen Monat fixiert."
//
// Konsequenz: saldoAnchor(Y, M) = saldoEnde(Y, M-1) = saldoAt(Y, M-1, letzter Tag).
// Das ist rekursiv: für Juni 2026 → Mai 2026 → April 2026 → ... bis ein
// expliziter Ankerpunkt aus startBalances gefunden wird.
//
// Performance: ctx._anchorCache vermeidet exponentielles Backtracking.
//
// Initialer Anker (kein Vormonat verfügbar): wir fallen auf getKumulierterSaldo
// zurück. Diese Funktion kennt die expliziten Ankerpunkte aus startBalances
// und rechnet sich von dort vorwärts. Sie macht keinen Budget-Sprung, was
// für ABGELAUFENE Monate korrekt ist (tatsächlicher Saldo).
function saldoAnchor(year, month, accId, ctx) {
  const prevY = month === 0 ? year - 1 : year;
  const prevM = month === 0 ? 11 : month - 1;
  const prevLastDay = new Date(prevY, prevM + 1, 0).getDate();

  // Cache check
  if(!ctx._anchorCache) ctx._anchorCache = {};
  const ck = `${prevY}-${prevM}-${accId||""}`;
  if(ck in ctx._anchorCache) return ctx._anchorCache[ck];

  // Wenn Vormonat aktuell oder Zukunft: rekursiv saldoAt nutzen (mit Budget-Sprung)
  // Wenn Vormonat vergangen: getKumulierterSaldo nutzen (tatsächlicher Saldo, kein Sprung)
  const today = ctx.today || new Date();
  const tY = today.getFullYear(), tM = today.getMonth();
  const prevIsPast = prevY < tY || (prevY === tY && prevM < tM);

  let v;
  if(prevIsPast) {
    // Tatsächlicher Saldo: über getKumulierterSaldo (= reale Buchungen ohne Budget)
    if(accId) {
      v = ctx.getKumulierterSaldo ? ctx.getKumulierterSaldo(prevY, prevM, accId) : 0;
      v = v == null ? 0 : v;
    } else {
      v = 0;
      (ctx.accounts || []).forEach(acc => {
        const vAcc = ctx.getKumulierterSaldo ? ctx.getKumulierterSaldo(prevY, prevM, acc.id) : 0;
        if(vAcc != null) v += vAcc;
      });
      v = round2(v);
    }
  } else {
    // Aktueller oder zukünftiger Vormonat: rekursiv saldoAt → eigene Logik mit Budget-Sprung
    v = saldoAt(prevY, prevM, prevLastDay, accId, ctx);
  }

  ctx._anchorCache[ck] = v;
  return v;
}

// ── Ist-Bewegungen: Summe der realen + vorgemerkten Buchungen ─────────
// auf accId im Zeitraum [Monatsanfang..day], mit Vorzeichen
function ist(year, month, day, accId, ctx) {
  let sum = 0;
  ctx.txs.forEach(t => {
    if(isDuplCounterpart(t, ctx._txsById)) return;
    if(t._budgetSubId) return;
    if(!isOnAccount(t, accId)) return;
    const d = new Date(t.date);
    if(d.getFullYear() !== year || d.getMonth() !== month) return;
    if(d.getDate() > day) return;
    sum += signedAmount(t);
  });
  return round2(sum);  // Float-Staub aus der Akkumulation entfernen
}

// ── Budget-Daten pro Sub-Kategorie sammeln ────────────────────────────
//
// Returns: { [baseSubId]: { mitte: Zahl, ende: Zahl, gesamt: Zahl } }
//   mitte  = Wert des _mitte-Platzhalters (oder 0)
//   ende   = Wert des normalen Platzhalters (=2. Hälfte allein)
//   gesamt = mitte + ende (Gesamtbudget für den Monat)
//
// Quellen (in Reihenfolge):
//   1. _budgetSubId-Platzhalter in txs (primäre Quelle, immer aktuell)
//   2. ctx.getBudgetForMonth(subId, y, m) als Fallback für fehlende Platzhalter.
//      Notwendig, weil die App bei Mitte=0 + scope=single keinen Platzhalter
//      anlegt, das Budget aber trotzdem im budgets-Objekt registriert ist.
function collectBudgets(year, month, ctx) {
  const monthStr = `${year}-${String(month+1).padStart(2,"0")}`;
  const result = {};

  // Quelle 1: _budgetSubId-Platzhalter
  ctx.txs.forEach(t => {
    if(!t.pending || !t._budgetSubId) return;
    if(t.date.slice(0,7) !== monthStr) return;
    const acc = t.accountId || "acc-giro";
    if(acc !== "acc-giro") return;
    const isMitteP = t._budgetSubId.endsWith("_mitte");
    const baseSubId = isMitteP ? t._budgetSubId.slice(0,-6) : t._budgetSubId;
    if(!result[baseSubId]) result[baseSubId] = { mitte: 0, ende: 0 };
    const amt = Math.abs(pn(t.totalAmount) || 0);
    if(isMitteP) result[baseSubId].mitte += amt;
    else         result[baseSubId].ende  += amt;
  });

  // Quelle 2: getBudgetForMonth als Fallback (für Subs ohne Platzhalter)
  // Wir gehen alle expense-Subs durch und fragen budgetForMonth ab. Wenn
  // der Sub im Result fehlt (kein Platzhalter angelegt), nehmen wir die
  // Budget-Daten direkt aus dem budgets-Objekt.
  if(ctx.getBudgetForMonth) {
    (ctx.cats || []).filter(c => c.type === "expense").forEach(cat => {
      (cat.subs || []).forEach(sub => {
        if(result[sub.id]) return; // Schon erfasst über Platzhalter
        // getBudgetForMonth(subId): summiert subId + subId+"_mitte" zusammen
        // (siehe App.jsx getBudgetForMonth-Definition)
        const gesamt = ctx.getBudgetForMonth(sub.id, year, month) || 0;
        const mitte = ctx.getBudgetForMonth(sub.id + "_mitte", year, month) || 0;
        if(gesamt <= 0 && mitte <= 0) return;
        // gesamt vs mitte: meistens summiert getBudgetForMonth("sub_mitte")
        // dasselbe wie getBudgetForMonth("sub") (= Mitte+Ende). Wenn ja, ist
        // mitte = gesamt → wir nehmen den Mitte-Anteil aus dem ersten Aufruf.
        // Fallback: Annahme Mitte = 0, Ende = gesamt
        result[sub.id] = { mitte: 0, ende: gesamt };
      });
    });
  }

  // Gesamt = mitte + ende (cent-genau, falls mehrere Platzhalter akkumuliert wurden)
  Object.values(result).forEach(b => {
    b.mitte = round2(b.mitte); b.ende = round2(b.ende);
    b.gesamt = round2(b.mitte + b.ende);
  });
  return result;
}

// ── Ist-Ausgaben einer Sub-Kategorie im Bereich [fromDay..toDay] ──────
// Nur auf acc-giro (Budgets gibt's nur dort), inkl. Vormerkungen
function istForSub(year, month, fromDay, toDay, baseSubId, ctx) {
  let sum = 0;
  ctx.txs.forEach(t => {
    if(t._budgetSubId) return; // Budget-Platzhalter selbst nicht zählen
    if(isDuplCounterpart(t, ctx._txsById)) return;
    const acc = t.accountId || "acc-giro";
    if(acc !== "acc-giro") return;
    const d = new Date(t.date);
    if(d.getFullYear() !== year || d.getMonth() !== month) return;
    const dd = d.getDate();
    if(dd < fromDay || dd > toDay) return;
    // Flexibler Topf: Buchungen mit _potSubId zählen budgetmäßig KOMPLETT gegen
    // die Topf-Sub (und NICHT gegen ihre echte Sub). Greift nur, wenn gesetzt.
    if(t._potSubId) {
      if(t._potSubId === baseSubId) sum += Math.abs(pn(t.totalAmount) || 0);
      return;
    }
    // Splits dieser Sub
    const splits = (t.splits || []).filter(sp => sp.subId === baseSubId);
    if(splits.length === 0) return;
    splits.forEach(sp => {
      const amt = sp.amount != null && sp.amount !== 0
        ? Math.abs(pn(sp.amount))
        : Math.abs(t.totalAmount || 0);
      sum += amt;
    });
  });
  return round2(sum);  // Float-Staub aus der Akkumulation entfernen
}

// ── RestMitte: Reservierung der ersten Monatshälfte (Tag 1..14) ───────
//   Pro Kategorie K wird der Mitte-Anteil reserviert, falls gesetzt;
//   ist NUR ein Gesamt-Budget gesetzt (kein Mitte-Anteil), wird das volle
//   Gesamt-Budget bereits ab Tag 1 reserviert — es gibt dann keinen
//   Mitte-Anteil, der nur die erste Hälfte abdecken würde.
//     Ref_K = BudgetMitte_K  (falls Mitte-Anteil > 0)  sonst BudgetGesamt_K
//     RestMitte = Σ_K max(0, Ref_K − Ist1bis14_K)
function restMitte(year, month, ctx) {
  const budgets = collectBudgets(year, month, ctx);
  let rest = 0;
  Object.entries(budgets).forEach(([subId, b]) => {
    const ref = b.mitte > 0 ? b.mitte : b.gesamt;
    if(ref <= 0) return;
    const istK = istForSub(year, month, 1, 14, subId, ctx);
    rest += Math.max(0, ref - istK);
  });
  return round2(rest);
}

// ── RestEnde: mit dynamischem Roll-Over ───────────────────────────────
//   Budget_H2_K = max(0, BudgetEnde_K − Ist1bis14_K)
//   Rest_K = max(0, Budget_H2_K − Ist15bisLetzter_K)
function restEnde(year, month, ctx) {
  const budgets = collectBudgets(year, month, ctx);
  const lastDay = new Date(year, month+1, 0).getDate();
  let rest = 0;
  Object.entries(budgets).forEach(([subId, b]) => {
    if(b.gesamt <= 0) return;
    const ist1bis14 = istForSub(year, month, 1, 14, subId, ctx);
    const ist15bisLetzter = istForSub(year, month, 15, lastDay, subId, ctx);
    const budgetH2 = Math.max(0, b.gesamt - ist1bis14);
    rest += Math.max(0, budgetH2 - ist15bisLetzter);
  });
  return round2(rest);
}

// ── Sollte am gefragten Tag der Budget-Abzug greifen? ─────────────────
//
// Die Reservierung gilt für ihren gesamten Geltungszeitraum, solange der
// abgefragte Tag heute oder in der Zukunft liegt:
//   - Mitte-Reservierung (RestMitte) auf jedem Tag 1..14.
//   - Ende-Reservierung (RestEnde)  auf jedem Tag 15..letzter.
//
// Liegt der abgefragte Tag dagegen in der VERGANGENHEIT (vor heute), zeigt
// der Tagessaldo das reine Ist — dort wurde real gebucht. Damit wird eine
// Reservierung erst dann freigegeben, wenn der reale heutige Tag den
// jeweiligen Tag überschritten hat (nie allein durch den Kalenderwechsel
// 14.→15. oder Monatsletzter→1.).
//
// "Heute" wird aus ctx.today oder real ermittelt (für deterministische Tests).
function isFuture(year, month, day, ctx) {
  // Ist (year, month, day) heute oder in der Zukunft?
  const today = ctx.today || new Date();
  const tY = today.getFullYear(), tM = today.getMonth(), tD = today.getDate();
  if(year > tY) return true;
  if(year < tY) return false;
  if(month > tM) return true;
  if(month < tM) return false;
  return day >= tD;
}
// Ist das Restbudget einer Phase überhaupt noch verbrauchbar / die Reservierung
// noch aktiv? Maßgeblich ist der KALENDER-Stichtag: Die Phase (14. bzw. Monats-
// letzter) gilt bis EINSCHLIESSLICH diesem Tag — das Budget bleibt also sichtbar/
// reserviert, bis der Stichtag komplett vorbei ist (am Folgetag entfällt es).
// (Früher: nextBankWorkday(today) — dadurch verschwand die Reservierung schon am
// letzten Banktag, also am Stichtag selbst, was verwirrte.)
function phaseStillReachable(year, month, phaseEndDay, ctx) {
  const today = ctx.today || new Date();
  const pad = n => String(n).padStart(2,"0");
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const phaseEndIso = `${year}-${pad(month+1)}-${pad(phaseEndDay)}`;
  // ISO-Strings vergleichen sich chronologisch
  return todayIso <= phaseEndIso;
}
// Ist ein Budget-Platzhalter (pending tx mit _budgetSubId) noch "aktiv", d. h.
// seine Phase noch erreichbar? Sonst ist das Restbudget freigegeben (die nächste
// Phase gilt bereits) und der Platzhalter soll nirgends mehr auftauchen — weder
// in den Offenen Vormerkungen (inkl. Badge), noch in Monat oder Buchungen.
// Nicht-Budget-Buchungen liefern immer true (bleiben unberührt).
function budgetPlaceholderActive(tx, ctx = {}) {
  if(!tx || !tx._budgetSubId) return true;
  const [y, mo] = tx.date.split("-").map(Number); // mo: 1-basiert
  const isMitte = tx._budgetSubId.endsWith("_mitte");
  const phaseEndDay = isMitte ? 14 : new Date(y, mo, 0).getDate();
  return phaseStillReachable(y, mo - 1, phaseEndDay, ctx);
}
function shouldApplyMitteSprung(year, month, day, ctx) {
  if(day > 14) return false;
  // Tag muss heute/Zukunft sein UND die Phase noch verbrauchbar
  return isFuture(year, month, day, ctx) && phaseStillReachable(year, month, 14, ctx);
}
function shouldApplyEndeSprung(year, month, day, ctx) {
  if(day < 15) return false;
  const lastDay = new Date(year, month+1, 0).getDate();
  return isFuture(year, month, day, ctx) && phaseStillReachable(year, month, lastDay, ctx);
}

// ── HAUPTFUNKTION ─────────────────────────────────────────────────────
//
// withReservation = true  → Tagessaldo "nach Budget" (inkl. RestMitte/RestEnde)
// withReservation = false → reiner Ist-Verlauf (Anker + Buchungen, ohne
//                           Reservierung). Diese Linie springt nicht am
//                           14.→15., weil sie keine Reservierung enthält.
function _saldo(year, month, day, accId, ctx, withReservation) {
  // Index aufbauen falls nicht vorhanden (für isDuplCounterpart)
  if(!ctx._txsById) {
    ctx._txsById = buildTxIdMap(ctx.txs || []);
  }

  // Gesamt-Sicht: Summe über alle Konten
  if(!accId) {
    let sum = 0;
    (ctx.accounts || []).forEach(acc => {
      sum += _saldo(year, month, day, acc.id, ctx, withReservation);
    });
    return round2(sum);
  }

  // Konto-spezifisch
  const anker = saldoAnchor(year, month, accId, ctx);
  const istV = ist(year, month, day, accId, ctx);

  // Reservierung gilt erste Hälfte (RestMitte) bzw. zweite Hälfte (RestEnde),
  // nur für heutige/zukünftige Tage und nur für acc-giro
  // (Budgets liegen auf Giro; Tagesgeld hat keine Reservierung)
  let sprung = 0;
  if(withReservation && accId === "acc-giro") {
    if(shouldApplyMitteSprung(year, month, day, ctx)) {
      sprung = restMitte(year, month, ctx);
    } else if(shouldApplyEndeSprung(year, month, day, ctx)) {
      sprung = restEnde(year, month, ctx);
    }
  }

  return round2(anker + istV - sprung);
}

// Tagessaldo "nach Budget" — inkl. Budget-Reservierung (Single Source of Truth)
export function saldoAt(year, month, day, accId, ctx) {
  return _saldo(year, month, day, accId, ctx, true);
}

// Reiner Ist-Verlauf — Anker + Buchungen, OHNE Budget-Reservierung.
// Verläuft glatt (kein Sprung am 14.→15.), zeigt den tatsächlichen
// Kontostand-Verlauf aus realen + vorgemerkten Buchungen.
export function saldoIst(year, month, day, accId, ctx) {
  return _saldo(year, month, day, accId, ctx, false);
}

// ── Convenience-Wrapper ───────────────────────────────────────────────
export function saldoMitte(year, month, accId, ctx) {
  return saldoAt(year, month, 14, accId, ctx);
}

export function saldoEnde(year, month, accId, ctx) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return saldoAt(year, month, lastDay, accId, ctx);
}

export { saldoAnchor, restMitte, restEnde, collectBudgets, phaseStillReachable, budgetPlaceholderActive };
