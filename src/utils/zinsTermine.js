// Zinstermine des Tagesgeldkontos.
//
// Viele Tagesgeldkonten schreiben die Zinsen nur zu festen Terminen gut —
// typisch am Quartalsende. Diese Datei weiß, wann diese Termine liegen; was
// dann gutgeschrieben wird, rechnet utils/zinsPlan.js.
//
// Hier stand einmal zusätzlich die „Mega-Sparrate": kurz vor dem Stichtag viel
// aufs Tagesgeld, am nächsten Banktag zurück. Sie ist ersatzlos entfallen, und
// zwar nicht aus Geschmacksgründen — sie beruhte auf der Annahme, die Bank
// verzinse den STAND am Zinstermin. Tatsächlich verzinst sie taggenau und
// zahlt zum Termin nur die aufgelaufene Summe aus. Dann bringt ein Betrag, der
// zwei Tage dort liegt, auch nur zwei Tage Zinsen — Cent statt Euro. Der
// Termin ist der Zahltag, nicht der Messtag.
//
// Was von der Idee bleibt, ist genau das hier: WANN gutgeschrieben wird.

export const DEFAULT_ZINS_MONATE = [2, 5, 8, 11];

const pad2 = (n) => String(n).padStart(2, "0");

// Monatsletzter als ISO-Datum — der Zinstermin selbst.
export function monatsLetzter(y, m) {
  return `${y}-${pad2(m + 1)}-${pad2(new Date(y, m + 1, 0).getDate())}`;
}

// "2,5,8,11" → [2,5,8,11]. Robust gegen Müll aus dem kvStore (fremde/alte
// Werte, doppelte Einträge, Monate außerhalb 0..11).
export function parseZinsMonate(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const arr = String(raw)
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 11);
  return [...new Set(arr)].sort((a, b) => a - b);
}

export function serializeZinsMonate(monate) {
  return [...new Set(monate || [])].sort((a, b) => a - b).join(",");
}

// Die nächsten `count` Zinstermine ab (einschließlich) fromIso.
// Sucht maximal 12 Jahre voraus — bei leerer Monatsauswahl gibt es keine.
export function zinsTermine(fromIso, count = 1, monate = DEFAULT_ZINS_MONATE) {
  const set = new Set(monate || []);
  if (!set.size || !fromIso) return [];
  const [y0, m0] = String(fromIso).split("-").map(Number);
  if (!y0 || !m0) return [];
  const out = [];
  let idx = y0 * 12 + (m0 - 1);
  for (let k = 0; k < 12 * 12 && out.length < count; k++, idx++) {
    const y = Math.floor(idx / 12);
    const m = idx % 12;
    if (!set.has(m)) continue;
    const iso = monatsLetzter(y, m);
    // Der Termin des Startmonats kann schon vorbei sein.
    if (iso < fromIso) continue;
    out.push(iso);
  }
  return out;
}

// Der Zinstermin VOR einem Datum — der Anfang des Zeitraums, für den zum
// nächsten Termin gutgeschrieben wird.
//
// Wird für die Vorschau gebraucht: Die Gutschrift am 30.09. enthält auch die
// Tage seit dem 01.07., also auch die, die heute schon vorbei sind. Wer erst
// ab heute rechnet, merkt zu wenig vor.
export function vorigerZinsTermin(isoDatum, monate = DEFAULT_ZINS_MONATE) {
  const set = new Set(monate || []);
  if (!set.size || !isoDatum) return null;
  const [y, m] = String(isoDatum).split("-").map(Number);
  if (!y || !m) return null;
  let idx = y * 12 + (m - 1);
  // Der Termin des eigenen Monats zählt nur, wenn er schon vorbei ist.
  for (let k = 0; k < 14; k++, idx--) {
    const yy = Math.floor(idx / 12), mm = ((idx % 12) + 12) % 12;
    if (!set.has(mm)) continue;
    const iso = monatsLetzter(yy, mm);
    if (iso < String(isoDatum)) return iso;
  }
  return null;
}
