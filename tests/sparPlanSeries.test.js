// Testet die Entscheidungslogik hinter dem Fix für "gelöschte Tagesgeld-
// Einnahme kommt nach Neuberechnen/Auto-Anpassen zurück" (TagesgeldWidget).
import { describe, it, expect } from "vitest";
import { keyOfDate, planLegDecisions } from "../src/utils/sparPlanSeries.js";

describe("sparPlanSeries", () => {
  it("keyOfDate liefert einen fortlaufenden, vergleichbaren Monatsschlüssel", () => {
    expect(keyOfDate("2026-01-31")).toBe(2026*12+0);
    expect(keyOfDate("2026-02-28")).toBe(2026*12+1);
    expect(keyOfDate("2026-02-28") - keyOfDate("2026-01-31")).toBe(1);
    expect(keyOfDate("2027-01-31") - keyOfDate("2026-12-31")).toBe(1);
  });

  it("legt beide Beine für einen Monat an, wenn zuvor noch keine Serie existierte (Erstanlage)", () => {
    const months = [keyOfDate("2026-08-31"), keyOfDate("2026-09-30")];
    const decisions = planLegDecisions(months, [], [], true);
    expect(decisions).toEqual([
      { key: months[0], keepAbgang: true, keepZugang: true },
      { key: months[1], keepAbgang: true, keepZugang: true },
    ]);
  });

  it("KERNFALL: nur die Zugang-Seite (Einnahme) eines mittleren Monats wurde gelöscht, Abgang blieb — Einnahme darf NICHT wieder auftauchen", () => {
    const aug = keyOfDate("2026-08-31"), sep = keyOfDate("2026-09-30"), okt = keyOfDate("2026-10-31");
    // Abgang existiert für alle drei Monate durchgehend.
    const oldAbgang = [{ date: "2026-08-31" }, { date: "2026-09-30" }, { date: "2026-10-31" }];
    // Zugang für September fehlt — der Nutzer hat genau diese Einnahme
    // gelöscht; August und Oktober umschließen die Lücke.
    const oldZugang = [{ date: "2026-08-31" }, { date: "2026-10-31" }];
    const decisions = planLegDecisions([aug, sep, okt], oldAbgang, oldZugang, true);
    const bySep = decisions.find(d => d.key === sep);
    expect(bySep.keepAbgang).toBe(true);   // Abgang war nicht gelöscht — bleibt
    expect(bySep.keepZugang).toBe(false);  // Zugang war gelöscht — bleibt gelöscht
    const byAug = decisions.find(d => d.key === aug);
    expect(byAug.keepAbgang).toBe(true);
    expect(byAug.keepZugang).toBe(true);
  });

  it("umgekehrt: nur die Abgang-Seite eines mittleren Monats wurde gelöscht, Zugang blieb (Spanne durch Aug+Okt belegt)", () => {
    const aug = keyOfDate("2026-08-31"), sep = keyOfDate("2026-09-30"), okt = keyOfDate("2026-10-31");
    // Abgang für September fehlt, für August und Oktober ist er noch da —
    // damit ist die Spanne eindeutig belegt und September liegt "mittendrin".
    const oldAbgang = [{ date: "2026-08-31" }, { date: "2026-10-31" }];
    const oldZugang = [{ date: "2026-08-31" }, { date: "2026-09-30" }, { date: "2026-10-31" }];
    const decisions = planLegDecisions([aug, sep, okt], oldAbgang, oldZugang, true);
    const bySep = decisions.find(d => d.key === sep);
    expect(bySep.keepAbgang).toBe(false);
    expect(bySep.keepZugang).toBe(true);
  });

  it("beide Beine eines mittleren Monats gelöscht (klassischer Fall) — Monat bleibt komplett leer", () => {
    const aug = keyOfDate("2026-08-31"), sep = keyOfDate("2026-09-30"), okt = keyOfDate("2026-10-31");
    // September fehlt komplett, August und Oktober umschließen die Lücke.
    const oldAbgang = [{ date: "2026-08-31" }, { date: "2026-10-31" }];
    const oldZugang = [{ date: "2026-08-31" }, { date: "2026-10-31" }];
    const decisions = planLegDecisions([aug, sep, okt], oldAbgang, oldZugang, true);
    const bySep = decisions.find(d => d.key === sep);
    expect(bySep.keepAbgang).toBe(false);
    expect(bySep.keepZugang).toBe(false);
  });

  it("ein GENUINE neuer Monat jenseits der bisherigen Spanne wird trotz fehlender alter Rate normal angelegt (Plan-Verlängerung)", () => {
    const aug = keyOfDate("2026-08-31");
    const oct = keyOfDate("2026-10-31"); // liegt jenseits der bisherigen Spanne (nur bis August)
    const oldAbgang = [{ date: "2026-08-31" }];
    const oldZugang = [{ date: "2026-08-31" }];
    const decisions = planLegDecisions([aug, oct], oldAbgang, oldZugang, true);
    const byOct = decisions.find(d => d.key === oct);
    expect(byOct.keepAbgang).toBe(true);
    expect(byOct.keepZugang).toBe(true);
  });

  it("ohne Zielkonto (kein sparAccId) wird die Zugang-Seite nie angelegt, unabhängig von der Historie", () => {
    const sep = keyOfDate("2026-09-30");
    const decisions = planLegDecisions([sep], [], [{ date: "2026-09-30" }], false);
    expect(decisions[0].keepZugang).toBe(false);
  });

  it("REGRESSION (Rundtrip-Bug): wird die LETZTE (zeitlich am weitesten entfernte) Zugang-Rate gelöscht, verkürzt sich die aus den verbleibenden Buchungen abgeleitete Spanne — ohne Wasserzeichen sieht der gelöschte Monat wie neu aus und würde fälschlich wieder angelegt", () => {
    const aug = keyOfDate("2026-08-31"), sep = keyOfDate("2026-09-30"), okt = keyOfDate("2026-10-31");
    // Serie ging ursprünglich bis Oktober; die Zugang-Seite von Oktober (der
    // spätesten Rate) wurde gelöscht — August/September blieben unangetastet.
    const oldAbgang = [{ date: "2026-08-31" }, { date: "2026-09-30" }, { date: "2026-10-31" }];
    const oldZugang = [{ date: "2026-08-31" }, { date: "2026-09-30" }]; // Oktober fehlt — war die letzte Rate
    // OHNE Wasserzeichen (alter Bug): max(oldZugang) ist jetzt September,
    // Oktober liegt "jenseits" davon → sieht wie ein echter neuer Monat aus.
    const buggy = planLegDecisions([aug, sep, okt], oldAbgang, oldZugang, true);
    expect(buggy.find(d => d.key === okt).keepZugang).toBe(true); // reproduziert den Bug

    // MIT Wasserzeichen (Fix): die Serie reichte historisch nachweislich bis
    // Oktober — Oktober liegt also INNERHALB der bekannten Spanne und die
    // fehlende Zugang-Rate wird korrekt als bewusst gelöscht erkannt.
    const fixed = planLegDecisions([aug, sep, okt], oldAbgang, oldZugang, true, -Infinity, okt);
    expect(fixed.find(d => d.key === okt).keepZugang).toBe(false);
    // August/September (weiterhin vorhanden) bleiben davon unberührt.
    expect(fixed.find(d => d.key === aug).keepZugang).toBe(true);
    expect(fixed.find(d => d.key === sep).keepZugang).toBe(true);
  });

  it("Wasserzeichen jenseits der aktuell berechneten Planspanne blockiert eine echte Plan-Verlängerung nicht", () => {
    const aug = keyOfDate("2026-08-31"), nov = keyOfDate("2026-11-30");
    // Wasserzeichen aus einem früheren Lauf reichte nur bis August; November
    // ist eine ECHTE Verlängerung (z.B. Enddatum im Widget erhöht) und muss
    // trotzdem angelegt werden.
    const decisions = planLegDecisions([aug, nov], [{ date: "2026-08-31" }], [{ date: "2026-08-31" }], true, aug, aug);
    expect(decisions.find(d => d.key === nov).keepZugang).toBe(true);
    expect(decisions.find(d => d.key === nov).keepAbgang).toBe(true);
  });
});
