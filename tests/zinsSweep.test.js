// Testet die reine Rechenlogik des Zins-Sweeps ("Mega-Sparrate") aus
// src/utils/zinsSweep.js — Stichtage, Rückholfenster und Betragsformel.
import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_ZINS_MONATE,
  monatsLetzter,
  parseZinsMonate,
  serializeZinsMonate,
  zinsTermine,
  sweepFenster,
  computeSweep,
  ohneSweepBuchungen,
  SWEEP_RUECK_DESC,
  sweepZustandAnwenden,
} from "../src/utils/zinsSweep.js";

describe("zinsSweep — Stichtage", () => {
  it("monatsLetzter trifft auch Schaltjahr und 30-Tage-Monate", () => {
    expect(monatsLetzter(2026, 5)).toBe("2026-06-30");
    expect(monatsLetzter(2026, 11)).toBe("2026-12-31");
    expect(monatsLetzter(2028, 1)).toBe("2028-02-29"); // Schaltjahr
    expect(monatsLetzter(2026, 1)).toBe("2026-02-28");
  });

  it("liefert die nächsten Quartalstermine ab einem Datum", () => {
    expect(zinsTermine("2026-08-01", 3)).toEqual([
      "2026-09-30",
      "2026-12-31",
      "2027-03-31",
    ]);
  });

  it("überspringt den Termin des Startmonats, wenn er schon vorbei ist", () => {
    // Am 30.06. selbst ist der Termin noch aktuell …
    expect(zinsTermine("2026-06-30", 1)).toEqual(["2026-06-30"]);
    // … einen Tag später nicht mehr.
    expect(zinsTermine("2026-07-01", 1)).toEqual(["2026-09-30"]);
  });

  it("respektiert eine abweichende Monatsauswahl (Dirks 31.08. statt 30.09.)", () => {
    const eigene = [2, 5, 7, 11]; // Mär, Jun, Aug, Dez
    expect(zinsTermine("2026-08-01", 3, eigene)).toEqual([
      "2026-08-31",
      "2026-12-31",
      "2027-03-31",
    ]);
  });

  it("gibt bei leerer Monatsauswahl keine Termine zurück", () => {
    expect(zinsTermine("2026-08-01", 3, [])).toEqual([]);
  });

  it("parst und serialisiert die Monatsauswahl robust", () => {
    expect(parseZinsMonate("2,5,8,11")).toEqual(DEFAULT_ZINS_MONATE);
    expect(parseZinsMonate("11,2,2,5,8")).toEqual([2, 5, 8, 11]); // sortiert + dedupliziert
    expect(parseZinsMonate("99,-3,abc,5")).toEqual([5]);          // Müll fliegt raus
    expect(parseZinsMonate("")).toBeNull();                        // "nie gesetzt"
    expect(serializeZinsMonate([11, 2, 5, 8])).toBe("2,5,8,11");
  });
});

describe("zinsSweep — Rückholfenster", () => {
  it("Do 31.12.2026 → Rückbuchung Fr 01.01.2027? Nein: Neujahr ist Bankfeiertag", () => {
    const f = sweepFenster("2026-12-31");
    expect(f.bis).toBe("2027-01-04"); // 1.1. Feiertag, 2./3.1. Wochenende → Mo
    expect(f.tage).toEqual([
      "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04",
    ]);
  });

  it("Di 30.06.2026 → Rückbuchung schon am Mi 01.07.2026", () => {
    const f = sweepFenster("2026-06-30");
    expect(f.bis).toBe("2026-07-01");
    expect(f.tage).toEqual(["2026-06-30", "2026-07-01"]);
  });

  it("Fenster über ein Wochenende: Do 30.09.2027 → Fr 01.10.2027", () => {
    const f = sweepFenster("2027-09-30");
    expect(f.bis).toBe("2027-10-01");
  });

  it("der Rückbuchungstag zählt zum Fenster (Belastungen am Ersten!)", () => {
    const f = sweepFenster("2026-06-30");
    expect(f.tage).toContain(f.bis);
  });
});

describe("zinsSweep — Betragsformel", () => {
  const salden = [
    { date: "2026-06-30", saldo: 3200 },
    { date: "2026-07-01", saldo: 1400 }, // Miete am Ersten → Engpass
  ];

  it("begrenzt den Sweep auf den engsten Tag des Fensters minus Puffer", () => {
    const r = computeSweep({ salden, puffer: 100, normaleSparrate: 584 });
    expect(r.sweep).toBe(1300);          // 1400 − 100
    expect(r.engpassTag).toBe("2026-07-01");
    expect(r.minSaldo).toBe(1400);
    expect(r.restNachSweep).toBe(100);   // exakt der Puffer bleibt stehen
  });

  it("KERNFALL: die Rücküberweisung ist um die normale Sparrate reduziert", () => {
    const r = computeSweep({ salden, puffer: 100, normaleSparrate: 584 });
    expect(r.hin).toBe(1884);            // 1300 Sweep + 584 Sparrate
    expect(r.zurueck).toBe(1300);
    expect(r.bleibt).toBe(584);
    // Genau das ist der Sinn: hin − zurück = die regelmäßige Sparrate.
    expect(r.hin - r.zurueck).toBe(584);
  });

  it("ohne Sparplan-Rate sind Hin- und Rückbetrag identisch", () => {
    const r = computeSweep({ salden, puffer: 100, normaleSparrate: 0 });
    expect(r.hin).toBe(1300);
    expect(r.zurueck).toBe(1300);
    expect(r.bleibt).toBe(0);
  });

  it("kein Sweep, wenn das Fenster den Puffer schon unterschreitet", () => {
    const eng = [
      { date: "2026-06-30", saldo: 3200 },
      { date: "2026-07-01", saldo: 40 },
    ];
    const r = computeSweep({ salden: eng, puffer: 100, normaleSparrate: 584 });
    expect(r.sweep).toBe(0);
    expect(r.zurueck).toBe(0);
    // Die normale Sparrate bleibt davon unberührt — sie ist im Saldo schon drin.
    expect(r.hin).toBe(584);
  });

  it("rundet auf volle Euro ab, damit der Puffer nie unterschritten wird", () => {
    const r = computeSweep({
      salden: [{ date: "2026-06-30", saldo: 1234.87 }],
      puffer: 100,
    });
    expect(r.sweep).toBe(1134); // nicht 1134.87
  });

  it("liefert null, wenn kein Tagessaldo ermittelbar war", () => {
    expect(computeSweep({ salden: [], puffer: 100 })).toBeNull();
    expect(computeSweep({ salden: [{ date: "x", saldo: null }], puffer: 100 })).toBeNull();
  });

  it("negativer Tagessaldo im Fenster führt nie zu einem negativen Sweep", () => {
    const r = computeSweep({
      salden: [{ date: "2026-07-01", saldo: -250 }],
      puffer: 100,
      normaleSparrate: 200,
    });
    expect(r.sweep).toBe(0);
    expect(r.zurueck).toBe(0);
  });
});

describe("zinsSweep — Buchungsbestand normalisieren", () => {
  // Sind die Sweep-Buchungen einmal gesetzt, darf eine erneute Rechnung nicht
  // auf sie hereinfallen — sonst schrumpft der Betrag bei jedem Durchlauf.
  const txs = [
    { id: "a", date: "2026-09-30", totalAmount: -3400, _sweepHin: true, _sweepBasis: 584 },
    { id: "b", date: "2026-09-30", totalAmount: 3400, _sweepHin: true, _sweepBasis: 584 },
    { id: "c", date: "2026-10-01", totalAmount: -2816, _sweepId: "s1" },
    { id: "d", date: "2026-10-01", totalAmount: 2816, _sweepId: "s1" },
    { id: "e", date: "2026-10-01", totalAmount: -1200 },
  ];

  it("entfernt die Rückbuchungen komplett", () => {
    const rein = ohneSweepBuchungen(txs);
    expect(rein.map(t => t.id)).toEqual(["a", "b", "e"]);
  });

  it("setzt angehobene Raten auf die ursprüngliche normale Rate zurück", () => {
    const rein = ohneSweepBuchungen(txs);
    expect(rein.find(t => t.id === "a").totalAmount).toBe(-584); // Vorzeichen bleibt
    expect(rein.find(t => t.id === "b").totalAmount).toBe(584);
  });

  it("lässt unbeteiligte Buchungen unangetastet", () => {
    const rein = ohneSweepBuchungen(txs);
    expect(rein.find(t => t.id === "e")).toEqual(txs[4]);
  });

  it("ist idempotent — zweimal angewendet ändert sich nichts mehr", () => {
    const einmal = ohneSweepBuchungen(txs);
    expect(ohneSweepBuchungen(einmal)).toEqual(einmal);
  });

  it("verkraftet eine leere oder fehlende Liste", () => {
    expect(ohneSweepBuchungen([])).toEqual([]);
    expect(ohneSweepBuchungen(null)).toEqual([]);
  });

  it("SWEEP_RUECK_DESC hängt am Plannamen", () => {
    expect(SWEEP_RUECK_DESC("Tagesgeld")).toBe("Sweep-Rück·Tagesgeld");
    expect(SWEEP_RUECK_DESC("")).toBe("Sweep-Rück·Plan");
  });
});

describe("zinsSweep — Soll-Ist-Abgleich (Automatik)", () => {
  let n;
  const mkId = () => `id${++n}`;
  const basisTxs = () => ([
    { id: "ab", date: "2026-09-30", desc: "Sparen·TG", totalAmount: -584, pending: true,
      accountId: "acc-giro", _seriesId: "s", splits: [{ id: "s1", catId: "", subId: "", amount: -584 }] },
    { id: "zu", date: "2026-09-30", desc: "Sparen·TG", totalAmount: 584, pending: true,
      accountId: "acc-tg", _linkedTo: "ab", _seriesId: "s-tgt", splits: [{ id: "s2", catId: "", subId: "", amount: 584 }] },
    { id: "x", date: "2026-10-01", desc: "Miete", totalAmount: -1200, pending: true, accountId: "acc-giro" },
  ]);
  const ziel = { abgangId: "ab", zugangId: "zu", hin: 3400, zurueck: 2816, basis: 584,
    ruecktag: "2026-10-01", zielKontoId: "acc-tg", planName: "TG", mkId };
  beforeEach(() => { n = 0; });

  it("hebt beide Beine der Rate an und legt die Rückbuchung an", () => {
    const next = sweepZustandAnwenden(basisTxs(), ziel);
    const ab = next.find(t => t.id === "ab"), zu = next.find(t => t.id === "zu");
    expect(ab.totalAmount).toBe(-3400);
    expect(ab._sweepHin).toBe(true);
    expect(ab._sweepBasis).toBe(584);
    expect(ab.splits[0].amount).toBe(-3400);      // Split zieht mit
    expect(zu.totalAmount).toBe(3400);
    const rueck = next.filter(t => t._sweepId);
    expect(rueck).toHaveLength(2);
    expect(rueck.find(t => t.accountId === "acc-tg").totalAmount).toBe(-2816);
    expect(rueck.find(t => t.accountId === "acc-giro").totalAmount).toBe(2816);
    expect(rueck.every(t => t.date === "2026-10-01" && t.pending)).toBe(true);
  });

  it("KERNFALL Idempotenz: ein zweiter Lauf meldet null — sonst liefe die Automatik im Kreis", () => {
    const einmal = sweepZustandAnwenden(basisTxs(), ziel);
    expect(sweepZustandAnwenden(einmal, ziel)).toBeNull();
  });

  it("passt an, wenn sich der Betrag im Monatsverlauf erhöht", () => {
    const einmal = sweepZustandAnwenden(basisTxs(), ziel);
    const hoeher = { ...ziel, hin: 4000, zurueck: 3416 };
    const zweimal = sweepZustandAnwenden(einmal, hoeher);
    expect(zweimal).not.toBeNull();
    expect(zweimal.find(t => t.id === "ab").totalAmount).toBe(-4000);
    const rueck = zweimal.filter(t => t._sweepId);
    expect(rueck).toHaveLength(2);                       // kein Zuwachs an Paaren
    expect(Math.abs(rueck[0].totalAmount)).toBe(3416);
  });

  it("baut alles zurück, sobald kein Sweep mehr möglich ist", () => {
    const einmal = sweepZustandAnwenden(basisTxs(), ziel);
    const aus = sweepZustandAnwenden(einmal, { ...ziel, hin: 0, zurueck: 0 });
    expect(aus.filter(t => t._sweepId)).toHaveLength(0);
    const ab = aus.find(t => t.id === "ab");
    expect(ab.totalAmount).toBe(-584);                   // ursprüngliche Rate
    expect(ab._sweepHin).toBeUndefined();
    expect(ab._sweepBasis).toBeUndefined();
    expect(ab.splits[0].amount).toBe(-584);
    // und der Rückbau ist seinerseits idempotent
    expect(sweepZustandAnwenden(aus, { ...ziel, hin: 0, zurueck: 0 })).toBeNull();
  });

  it("meldet null, wenn ohne Sweep gar nichts zu tun ist", () => {
    expect(sweepZustandAnwenden(basisTxs(), { ...ziel, hin: 0, zurueck: 0 })).toBeNull();
  });

  it("meldet null, wenn die Rate gar nicht (mehr) existiert", () => {
    expect(sweepZustandAnwenden(basisTxs(), { ...ziel, abgangId: "weg" })).toBeNull();
  });

  it("erneuert die Rückbuchung, wenn sich ihr Termin verschiebt", () => {
    const einmal = sweepZustandAnwenden(basisTxs(), ziel);
    const anderesDatum = { ...ziel, ruecktag: "2026-10-05" };
    const zweimal = sweepZustandAnwenden(einmal, anderesDatum);
    expect(zweimal).not.toBeNull();
    expect(zweimal.filter(t => t._sweepId).every(t => t.date === "2026-10-05")).toBe(true);
  });
});
