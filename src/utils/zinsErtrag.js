// Was die Mega-Sparrate an ZINSEN bringt — die Zahl, um die es dabei geht.
//
// Bisher zeigte der Sparplan nur, wie viel Geld sich zum Zinstermin bewegen
// lässt. Ob sich das lohnt, stand nirgends. Diese Datei rechnet den Ertrag aus
// und stellt beide Fälle nebeneinander: nur die normale Sparrate auf dem
// Tagesgeld — oder zusätzlich der Sweep-Betrag.
//
// ── Zwei Zinsmodelle, und warum hier beide vorkommen ─────────────────────
//
// STICHTAG: Die Bank verzinst den Stand, der am Zinstermin auf dem Konto
// liegt, für den ganzen zurückliegenden Zeitraum. Nur unter diesem Modell
// ergibt die Mega-Sparrate überhaupt Sinn — sie ist genau darauf gebaut (siehe
// zinsSweep.js). Wer am Stichtag 3.000 € mehr liegen hat, bekommt ein Quartal
// lang Zinsen darauf, obwohl das Geld am nächsten Banktag wieder weg ist.
//
// TAGGENAU: Die Bank verzinst jeden Tag den Stand dieses Tages und schreibt
// die Summe zum Termin gut. Das ist bei Tagesgeld das VERBREITETE Modell.
// Darunter bringt die Mega-Sparrate nur die ein bis drei Tage, die das Geld
// wirklich dort liegt — praktisch nichts.
//
// Der Unterschied ist keine Feinheit, sondern der Unterschied zwischen „lohnt
// sich sehr" und „lohnt sich nicht". Deshalb rechnet `zinsVergleich` beide
// Werte aus, statt eines davon zu unterstellen: Welches Modell die eigene Bank
// benutzt, steht in ihren Bedingungen — und nur wer beide Zahlen sieht, merkt
// überhaupt, dass er nachsehen sollte.

import { monatsLetzter, DEFAULT_ZINS_MONATE } from "./zinsSweep.js";

// Zinstage im Jahr. 365 statt 360: die deutsche Praxis bei Tagesgeld
// (act/365). Der Unterschied sind rund 1,4 % des Zinsbetrags — bei 20 € also
// knapp 30 Cent, zu wenig für eine Entscheidung, aber kein Grund, falsch zu
// rechnen.
export const ZINSTAGE_JAHR = 365;

// „2,25" → 2.25. Deutsche Eingabe mit Komma, aber auch ein Punkt geht durch;
// Müll und Negatives ergeben null („kein Zinssatz gesetzt"), nicht 0 — das
// Feld soll leer bleiben dürfen, ohne 0,00 € Zinsen zu behaupten.
export function parseZinssatz(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(",", ".").replace(/[%\s]/g, "");
  if (!s) return null;
  const v = Number.parseFloat(s);
  if (!Number.isFinite(v) || v < 0) return null;
  // Über 20 % ist kein Tagesgeld mehr, sondern ein Tippfehler — trotzdem
  // durchlassen: Es ist SEIN Konto, und eine stille Korrektur wäre schlimmer
  // als eine große Zahl.
  return v;
}

export function serializeZinssatz(v) {
  return v === null || v === undefined ? "" : String(v);
}

// Ganze Tage zwischen zwei ISO-Daten (bis minus von).
export function tageZwischen(vonIso, bisIso) {
  const d = (iso) => {
    const [y, m, t] = String(iso).split("-").map(Number);
    if (!y || !m || !t) return null;
    return Date.UTC(y, m - 1, t);
  };
  const a = d(vonIso), b = d(bisIso);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
}

// Der Zinstermin VOR diesem — die untere Grenze des Zeitraums, für den zum
// Termin gutgeschrieben wird.
//
// Ist nur ein einziger Zinsmonat eingestellt, liegt der vorige ein Jahr
// zurück; dann verzinst der Termin eben ein ganzes Jahr. Das fällt hier von
// selbst richtig heraus, weil rückwärts gesucht wird, bis ein Monat passt.
export function vorigerZinsTermin(terminIso, monate = DEFAULT_ZINS_MONATE) {
  const set = new Set(monate || []);
  if (!set.size || !terminIso) return null;
  const [y, m] = String(terminIso).split("-").map(Number);
  if (!y || !m) return null;
  let idx = y * 12 + (m - 1);
  for (let k = 0; k < 13; k++) {
    idx--;
    const yy = Math.floor(idx / 12), mm = idx % 12;
    if (set.has(mm)) return monatsLetzter(yy, mm);
  }
  return null;
}

// Zins für einen Betrag über eine Anzahl Tage, kaufmännisch auf Cent gerundet.
export function zinsFuerZeitraum(saldo, prozent, tage, basis = ZINSTAGE_JAHR) {
  if (!Number.isFinite(saldo) || !Number.isFinite(prozent) || !Number.isFinite(tage)) return null;
  if (saldo <= 0 || prozent <= 0 || tage <= 0) return 0;
  return Math.round(saldo * (prozent / 100) * (tage / basis) * 100) / 100;
}

// Die Gegenüberstellung, die im Bildschirm steht.
//
// `saldoNormal`  — Tagesgeld-Stand am Stichtag mit der normalen Sparrate.
// `extra`        — was die Mega-Sparrate zusätzlich drauflegt (= der Betrag,
//                  der am nächsten Banktag zurückgeht).
// `tageZeitraum` — Tage seit dem vorigen Zinstermin (der verzinste Zeitraum).
// `tageFenster`  — Tage, die das Extra wirklich auf dem Konto liegt.
//
// `plus` ist der Gewinn unter dem STICHTAG-Modell, `taggenauPlus` derselbe
// Gewinn unter dem TAGGENAU-Modell. Beide gehören zusammen; siehe oben.
export function zinsVergleich({ saldoNormal = 0, extra = 0, prozent = 0,
  tageZeitraum = 0, tageFenster = 1 } = {}) {
  const p = Number.isFinite(prozent) ? prozent : 0;
  if (p <= 0 || !(tageZeitraum > 0)) return null;
  const normal = zinsFuerZeitraum(Math.max(0, saldoNormal), p, tageZeitraum);
  const mitMega = zinsFuerZeitraum(Math.max(0, saldoNormal) + Math.max(0, extra), p, tageZeitraum);
  const taggenauPlus = zinsFuerZeitraum(Math.max(0, extra), p, Math.max(0, tageFenster));
  return {
    normal,
    mitMega,
    plus: Math.round((mitMega - normal) * 100) / 100,
    taggenauPlus,
    tageZeitraum,
    tageFenster,
  };
}
