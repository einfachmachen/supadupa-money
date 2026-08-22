// Welche Sparplan-Vormerkungen bringt die Automatik NICHT in Übereinstimmung
// mit dem angezeigten Plan?
//
// Nutzer-Frage: „Wie synchronisieren wir die oder werden die (ggf. veraltete
// VM) los? Das verwirrt sonst total."
//
// Seit Vorschau und Automatik dieselbe Funktion benutzen, steht im Plan und in
// der Vormerkung dieselbe Zahl — für alle Raten, die die Automatik anfasst.
// Genau zwei Sorten lässt sie liegen, und beide sahen aus wie ein Widerspruch:
// überfällige Raten (Termin vorbei, nie gebucht) und mehrdeutige Monate
// (mehrere Abgänge desselben Plans in einem Monat — dann weiß niemand, welcher
// die Rate ist). Beides muss das Widget zeigen statt es zu verschweigen.

import { describe, it, expect } from "vitest";
import { sparPlanPflege, heuteIsoVon } from "../src/utils/sparPlanPflege.js";
import { sparAbgaenge } from "../src/utils/sparBerechnen.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESC = "Sparen·Tagesgeld";
const HEUTE = "2026-08-20";

const abgang = (id, datum, b, extra = {}) => ({ id, accountId: "acc-giro", date: datum,
  totalAmount: -b, pending: true, _csvType: "expense", desc: DESC, _seriesId: "s1",
  splits: [{ id: id + "-s", catId: "", subId: "", amount: -b }], ...extra });
const zugang = (id, datum, b, zu) => ({ id, accountId: "acc-tg", date: datum,
  totalAmount: b, pending: true, _csvType: "income", desc: DESC, _seriesId: "s1-tgt",
  _linkedTo: zu, splits: [{ id: id + "-s", catId: "", subId: "", amount: b }] });

describe("Sparplan-Pflege: was die Automatik liegen lässt", () => {
  it("findet die überfällige Rate des Vormonats — mit beiden Beinen", () => {
    const txs = [
      abgang("a-jul", "2026-07-31", 658), zugang("z-jul", "2026-07-31", 658, "a-jul"),
      abgang("a-aug", "2026-08-31", 583), zugang("z-aug", "2026-08-31", 583, "a-aug"),
    ];
    const p = sparPlanPflege({ txs, sparDesc: DESC, heuteIso: HEUTE });
    expect(p.vergangenAnzahl, "eine Rate, nicht zwei Beine").toBe(1);
    expect(p.vergangenIds.sort(), "beide Beine müssen weg").toEqual(["a-jul", "z-jul"]);
    expect(p.vergangenMonate).toEqual(["2026-07"]);
    expect(p.vergangenSumme).toBe(658);
    expect(p.handlungsbedarf).toBe(true);
  });

  it("ein sauberer Plan meldet nichts", () => {
    const txs = [abgang("a-aug", "2026-08-31", 583), zugang("z-aug", "2026-08-31", 583, "a-aug")];
    expect(sparPlanPflege({ txs, sparDesc: DESC, heuteIso: HEUTE }).handlungsbedarf).toBe(false);
  });

  it("meldet genau die Monate, die `sparAbgaenge` als mehrdeutig auslässt", () => {
    // Das ist der Punkt: Die Automatik überspringt so einen Monat still —
    // dort kann ein alter Betrag beliebig lange stehen bleiben.
    const txs = [
      abgang("a-aug", "2026-08-31", 583),
      abgang("a-sep1", "2026-09-30", 400), abgang("a-sep2", "2026-09-15", 400),
    ];
    const p = sparPlanPflege({ txs, sparDesc: DESC, heuteIso: HEUTE });
    expect(p.mehrdeutig).toEqual(["2026-09"]);
    // Gegenprobe an der Quelle: September fehlt in der Liste der Raten.
    const monate = sparAbgaenge(txs, "2026-08-01").map((t) => t.date.slice(0, 7));
    expect(monate).toEqual(["2026-08"]);
  });

  it("der heutige Tag ist noch nicht überfällig", () => {
    const txs = [abgang("a", "2026-08-20", 100)];
    expect(sparPlanPflege({ txs, sparDesc: DESC, heuteIso: HEUTE }).vergangenAnzahl).toBe(0);
  });

  it("fremde Pläne bleiben unangetastet", () => {
    // Der Filter auf `_sweepId` ist mit der Mega-Sparrate entfallen — es gibt
    // keine Buchungen mehr, die unter dem Namen dieses Plans laufen, ohne eine
    // Rate zu sein.
    const txs = [
      { ...abgang("fremd", "2026-07-31", 200), desc: "Sparen·Urlaub" },
    ];
    const p = sparPlanPflege({ txs, sparDesc: DESC, heuteIso: HEUTE });
    expect(p.vergangenIds).toEqual([]);
    expect(p.handlungsbedarf).toBe(false);
  });

  it("heuteIsoVon liefert den Stichtag im ISO-Format", () => {
    expect(heuteIsoVon(new Date(2026, 7, 5))).toBe("2026-08-05");
  });

  it("das Widget zeigt den Hinweis und setzt beim Entfernen Grabsteine", () => {
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    expect(src).toMatch(/sparPlanPflege\(\{/);
    expect(src).toMatch(/überfällige/);
    // Ohne Grabstein holt der naechste Sync die geloeschten Raten zurueck.
    expect(src).toMatch(/recordDeletedTxs\(pflege\.vergangenIds\)/);
    // Die Schrift auf dem Knopf wird gerechnet, nicht auf Schwarz geraten.
    expect(src).toMatch(/pflegePaar = \(\) => knopfPaar\(T\.gold, DUNKEL\)/);
  });
});
