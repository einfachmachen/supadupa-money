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
// Marker auf den erzeugten Buchungen:
//   _sweepHin   – die Sparplan-Rate dieses Monats wurde auf den Hin-Betrag
//                 angehoben (sie ENTHÄLT die normale Rate)
//   _sweepBasis – die ursprüngliche, normale Rate (zum Zurückrechnen)
//   _sweepId    – gehört zur Rückbuchung am nächsten Banktag
export const SWEEP_RUECK_DESC = (planName) => `Sweep-Rück·${planName || "Plan"}`;

// Buchungsbestand für die Sweep-Rechnung normalisieren.
//
// Ohne das würde sich der Sweep selbst ins Knie schießen: Sind die Buchungen
// einmal gesetzt, ist der Hin-Betrag im Tagessaldo schon abgezogen und die
// Rückbuchung schon gutgeschrieben — eine erneute Rechnung käme auf einen
// ganz anderen (zu kleinen) Betrag. Deshalb vor jeder Rechnung: Rückbuchungen
// raus, angehobene Raten auf ihren ursprünglichen Wert zurücksetzen.
// Analog zu excludeSparDesc in computeMinTagessaldo.
export function ohneSweepBuchungen(txs) {
  return (txs || []).filter(t => !t._sweepId).map(t => {
    if (!t._sweepHin) return t;
    const basis = Math.abs(t._sweepBasis || 0);
    return { ...t, totalAmount: t.totalAmount < 0 ? -basis : basis };
  });
}

// sofortRueck: Rechnet damit, dass die Rückbuchung AM Rückbuchungstag selbst
// erfolgt und hausintern sofort gutgeschrieben wird (Dirks Beobachtung für
// DKB Giro ↔ DKB Tagesgeld). Dann zählt an diesem Tag nur der Tagesschluss:
//
//   Giro − hin − Belastungen + zurück ≥ Puffer
//
// und weil zurück = hin − normale Rate ist, kürzt sich `hin` heraus — der
// Rückbuchungstag begrenzt den Sweep also gar nicht mehr. Übrig bleibt die
// Grenze am Stichtag selbst. Deshalb fällt genau der LETZTE Fenstertag aus
// der Minimum-Suche, nicht das ganze Fenster: liegen zwischen Stichtag und
// Rückbuchung noch Tage (31.12. → 04.01.), ist das Geld dort weiterhin weg
// und keine Rückbuchung gleicht etwas aus.
//
// Der Preis dafür ist eine echte Verhaltensänderung: Ohne die Rückbuchung an
// genau diesem Tag steht das Konto tatsächlich im Minus. Deshalb standardmäßig
// aus (siehe TagesgeldWidget: mbt_zins_sofortrueck).
export function computeSweep({ salden, puffer = 0, normaleSparrate = 0, sofortRueck = false }) {
  let werte = (salden || []).filter(
    (s) => s && s.saldo !== null && s.saldo !== undefined && Number.isFinite(s.saldo)
  );
  if (sofortRueck && werte.length > 1) werte = werte.slice(0, -1);
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

// ── Soll-Ist-Abgleich der Sweep-Buchungen ────────────────────────────────
//
// Kernstück der Automatik. Bekommt den aktuellen Buchungsbestand und den
// gewünschten Zielzustand und liefert:
//   null            – Ist entspricht bereits dem Soll, NICHTS tun
//   Array<tx>       – der neue Bestand
//
// Das `null` ist nicht bloß eine Optimierung, sondern die Abbruchbedingung:
// die Automatik läuft auf Änderungen von txs und ändert txs selbst. Ohne ein
// belastbares „passt schon" schriebe sie sich endlos im Kreis. Deshalb wird
// der Ist-Zustand exakt (Betrag, Datum, Anzahl der Beine) gegen das Soll
// geprüft, nicht bloß „gibt es überhaupt Sweep-Buchungen".
//
// ziel:
//   abgangId/zugangId – die beiden Beine der Sparplan-Rate des Zinsmonats
//   hin               – Gesamtbetrag am Stichtag (enthält die normale Rate)
//   zurueck           – Rückbuchung am nächsten Banktag (= hin − basis)
//   basis             – die normale Sparrate (für ohneSweepBuchungen gemerkt)
//   ruecktag          – Datum der Rückbuchung
//   zielKontoId       – Tagesgeld-Konto
//   planName, mkId    – Beschreibung bzw. ID-Erzeuger
export function sweepZustandAnwenden(txs, ziel) {
  const { abgangId, zugangId, hin = 0, zurueck = 0, basis = 0,
    ruecktag, zielKontoId, planName, mkId } = ziel || {};
  const liste = txs || [];
  const abgang = liste.find(t => t.id === abgangId);
  if (!abgang) return null;

  const sollAktiv = hin > 0 && zurueck > 0 && !!ruecktag && !!zielKontoId;
  const alteRueck = liste.filter(t => t.pending && t._sweepId);

  // Ist-Zustand exakt gegen das Soll prüfen
  const hinPasst = sollAktiv
    ? (!!abgang._sweepHin && Math.abs(abgang.totalAmount) === hin
       && Math.abs(abgang._sweepBasis || 0) === basis)
    : !abgang._sweepHin;
  const rueckPasst = sollAktiv
    ? (alteRueck.length === 2
       && alteRueck.every(t => t.date === ruecktag && Math.abs(t.totalAmount) === zurueck))
    : alteRueck.length === 0;
  if (hinPasst && rueckPasst) return null;

  // 1) Alten Zustand zurückbauen — immer vollständig, danach neu aufbauen.
  //    Das ist einfacher und sicherer als ein Teil-Update: der Zielzustand
  //    hängt nur vom Soll ab, nie davon, was vorher dastand.
  let next = liste.filter(t => !(t.pending && t._sweepId));
  next = next.map(t => {
    if (!t._sweepHin) return t;
    const b = Math.abs(t._sweepBasis || 0);
    const { _sweepHin, _sweepBasis, ...rest } = t;
    const betrag = t.totalAmount < 0 ? -b : b;
    return { ...rest, totalAmount: betrag,
      splits: (t.splits || []).length === 1
        ? [{ ...t.splits[0], amount: betrag }] : t.splits };
  });
  if (!sollAktiv) return next;

  // 2) Rate des Zinsmonats auf den Hin-Betrag anheben (beide Beine)
  next = next.map(t => {
    if (t.id !== abgangId && t.id !== zugangId) return t;
    const betrag = t.totalAmount < 0 ? -hin : hin;
    return { ...t, totalAmount: betrag, _sweepHin: true, _sweepBasis: basis,
      splits: (t.splits || []).length === 1
        ? [{ ...t.splits[0], amount: betrag }] : t.splits };
  });

  // 3) Rückbuchung am nächsten Banktag anlegen (Tagesgeld → Giro)
  const sweepId = "sweep-" + mkId();
  const desc = SWEEP_RUECK_DESC(planName);
  const ab = { id: "pend-" + mkId(), date: ruecktag, desc,
    totalAmount: -zurueck, pending: true, _csvType: "expense",
    accountId: zielKontoId, _sweepId: sweepId,
    splits: [{ id: mkId(), catId: "", subId: "", amount: -zurueck }] };
  const zu = { id: "pend-" + mkId(), date: ruecktag, desc,
    totalAmount: zurueck, pending: true, _csvType: "income",
    accountId: "acc-giro", _linkedTo: ab.id, _sweepId: sweepId,
    splits: [{ id: mkId(), catId: "", subId: "", amount: zurueck }] };
  return [...next, ab, zu];
}

// ── Der Sweep für EINEN beliebigen Monat ────────────────────────────────
//
// Bis hierher wurde der Sweep nur für den LAUFENDEN Monat gerechnet: in
// App.jsx hinter `if (zinsMonate.includes(today.getMonth()))`, im SweepBanner
// hinter `istZinstermin`. Ein technisches Hindernis war das nie — es fragte
// nur niemand für andere Monate.
//
// Genau das fehlte aber: Im Sparplan stand für einen Zinsmonat die normale
// Rate, obwohl dort in Wirklichkeit ein Vielfaches fließt (Nutzer-Hinweis:
// „Es macht wenig Sinn, dass ich die Super-Sparraten erst sehe, wenn ein
// Zinsmonat läuft"). Eine Vorschau, die etwas anderes zeigt als das, was
// passiert, ist keine.
//
// Wichtig: Diese Funktion RECHNET nur. Sie legt keine Buchungen an — die
// entstehen weiterhin erst zum Termin (`sweepZustandAnwenden`). Der Plan darf
// die Zahl zeigen, ohne das Geld vorzeitig zu bewegen.
//
// `virtualSpar`: geplante, noch nicht gebuchte Raten (Datum→Betrag). Die
// Sparplan-Vorschau arbeitet damit; ohne diesen Durchgriff sähe die Rechnung
// einen Saldo, in dem die geplanten Raten gar nicht abgezogen sind.
//
// Rückgabe: `{ hin, zurueck, bleibt, termin, bis }` — oder `null`, wenn der
// Monat kein Zinsmonat ist oder kein Spielraum bleibt.
export function sweepFuerMonat({ y, m, ctx, puffer = 0, normaleSparrate = 0,
  sofortRueck = false, today = new Date(), virtualSpar = {}, monate = DEFAULT_ZINS_MONATE,
  saldoAmTag }) {
  if (!Array.isArray(monate) || !monate.includes(m)) return null;
  const termin = monatsLetzter(y, m);
  const f = sweepFenster(termin);
  const salden = f.tage.map((d) => ({ date: d, saldo: saldoAmTag(d, ctx, virtualSpar) }));
  const r = computeSweep({ salden, puffer, normaleSparrate, sofortRueck });
  if (!r || !(r.zurueck > 0)) return null;
  return { ...r, termin, bis: f.bis };
}
