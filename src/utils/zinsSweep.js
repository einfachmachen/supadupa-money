// Zins-Sweep („Mega-Sparrate") — rein informativer Zusatz zum Tagesgeld-Sparplan.
//
// Hintergrund: Viele Tagesgeldkonten schreiben Zinsen nur zu festen Stichtagen
// gut (typisch: Quartalsende). Wer genau an diesem Tag möglichst viel auf dem
// Tagesgeld liegen hat, bekommt den maximalen Zinsbetrag — und holt sich den
// Überhang am nächsten Banktag wieder aufs Giro zurück.
//
// Der Clou gegenüber der normalen Sparrate: Das Geld ist nur für ein sehr
// kurzes Fenster weg (Stichtag bis zur Rückbuchung). Es muss also NICHT
// dauerhaft entbehrlich sein — nur bis die ersten Belastungen des Folgemonats
// durch sind. Deshalb liegt der Sweep-Betrag regelmäßig deutlich über der
// dauerhaft sicheren Sparrate.
//
// Diese Datei enthält NUR die reine Rechenlogik (Stichtage, Rückholfenster,
// Betragsformel). Die Tagessalden liefert das TagesgeldWidget, das dafür
// dieselben Bausteine nutzt wie die reguläre Sparplan-Berechnung.

import { isoAddDays, nextBankWorkday } from "./date.js";

// Standard-Zinstermine: Quartalsende (0-basierte Monate → Mär, Jun, Sep, Dez)
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

// Fenster, in dem das Geld NICHT auf dem Giro liegt: vom Zinstermin bis
// einschließlich des Rückbuchungstages. Der Rückbuchungstag zählt bewusst mit:
// die Belastungen des Folgemonats (Miete & Co. am Ersten) können am selben Tag
// posten, an dem das Geld erst zurücküberwiesen wird — das darf nicht knapp
// werden. Genau diese Tage begrenzen den Sweep-Betrag.
export function sweepFenster(terminIso) {
  const bis = nextBankWorkday(terminIso);
  const tage = [terminIso];
  let d = terminIso;
  // Schutzgrenze: nextBankWorkday liegt nie mehr als ein paar Tage entfernt.
  while (d < bis && tage.length < 14) {
    d = isoAddDays(d, 1);
    tage.push(d);
  }
  return { von: terminIso, bis, tage };
}

// Kernformel.
//
// salden: [{ date, saldo }] über alle Tage des Fensters. `saldo` ist der
//   tagesgenaue Giro-Saldo NACH allen bereits eingeplanten Buchungen —
//   inklusive der normalen Sparrate, die am Monatsletzten ohnehin abgeht.
// puffer: Mindest-Puffer, der auf dem Giro bleiben muss.
// normaleSparrate: die im Sparplan für diesen Monat vorgesehene Rate. Sie ist
//   in `salden` bereits abgezogen und wird hier nur benutzt, um die real zu
//   tätigende Gesamtüberweisung (`hin`) auszuweisen.
//
// Ergebnis:
//   hin      = Betrag, der am Zinstermin aufs Tagesgeld geht (Sweep + Sparrate)
//   zurueck  = Betrag, der am nächsten Banktag zurück aufs Giro geht
//   bleibt   = was dauerhaft auf dem Tagesgeld bleibt (= normale Sparrate)
//
// Damit ist `zurueck` per Konstruktion um die normale Sparrate reduziert:
// regelmäßig sparen UND die maximalen Zinsen mitnehmen.
export function computeSweep({ salden, puffer = 0, normaleSparrate = 0 }) {
  const werte = (salden || []).filter(
    (s) => s && s.saldo !== null && s.saldo !== undefined && Number.isFinite(s.saldo)
  );
  if (!werte.length) return null;
  let eng = werte[0];
  for (const s of werte) if (s.saldo < eng.saldo) eng = s;
  const rate = Math.max(0, normaleSparrate || 0);
  const sweep = Math.floor(Math.max(0, eng.saldo - puffer));
  return {
    sweep,                    // Überhang — kommt am Rückbuchungstag zurück
    hin: sweep + rate,        // Gesamtüberweisung am Zinstermin
    zurueck: sweep,           // = hin − normale Sparrate
    bleibt: rate,             // bleibt dauerhaft auf dem Tagesgeld
    minSaldo: eng.saldo,      // engster Tagessaldo im Fenster (vor Sweep)
    engpassTag: eng.date,     // an welchem Tag es am knappsten wird
    restNachSweep: eng.saldo - sweep, // liegt per Definition ≥ puffer
  };
}
