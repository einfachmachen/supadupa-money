// Vergangenes gehört nicht zwischen die geplanten Raten.
//
// Der gemeldete Fall (Nutzer-Bilder): Der Kopf des Serien-Dialogs sagte
// „Serie beginnt 31.08.2026", die Betragsliste darunter zeigte aber eine Zeile
// „Jul 2026 · 658 €". Das las sich wie ein zweiter Sparplan mit anderen Zahlen.
//
// Es war keiner. Die Liste filterte schlicht nicht nach Datum und zeigte alle
// Buchungen der Serie — auch die des Vormonats, mit dem Betrag von damals.
//
// Die Sparplan-Automatik rechnet ab dem LAUFENDEN Monat (`sparAbgaenge` mit
// `abDatumIso`); was gestern abgegangen ist, lässt sich heute nicht mehr
// ändern. Genau deshalb darf es auch nicht als geplante Rate erscheinen.

import { describe, it, expect } from "vitest";
import { serienAbschnitte, heuteIso } from "../src/utils/serienAbschnitte.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rate = (datum, betrag) => ({ id: datum, date: datum, totalAmount: -betrag });

describe("Serien-Betragsliste: geplant und vorbei getrennt", () => {
  it("die alte Rate des Vormonats zählt nicht als geplant", () => {
    const serie = [
      rate("2026-07-31", 658),          // vorbei
      rate("2026-08-31", 583),
      rate("2026-09-30", 583),
      rate("2026-10-31", 400),
    ];
    const r = serienAbschnitte(serie, "2026-08-20");
    expect(r.offenCount, "drei kommende Raten").toBe(3);
    expect(r.vergangenCount, "eine vorbei").toBe(1);
    expect(r.offen[0].from, "die geplante Liste beginnt am 31.08.").toBe("2026-08-31");
    expect(r.offen.some((s) => s.amt === -658), "658 gehoert nicht mehr in den Plan").toBe(false);
    expect(r.vergangenSections[0].amt).toBe(-658);
    expect(r.nurVergangen).toBe(false);
  });

  it("gleiche Beträge werden weiterhin zu Abschnitten gefasst", () => {
    const serie = [rate("2026-08-31", 583), rate("2026-09-30", 583), rate("2026-10-31", 400)];
    const r = serienAbschnitte(serie, "2026-08-20");
    expect(r.offen.length).toBe(2);
    expect(r.offen[0]).toMatchObject({ amt: -583, from: "2026-08-31", to: "2026-09-30", count: 2 });
    expect(r.offen[1]).toMatchObject({ amt: -400, count: 1 });
  });

  it("der heutige Tag zählt noch als geplant, nicht als vorbei", () => {
    // Die Rate von heute geht heute noch ab — sie darf nicht schon in der
    // Vergangenheit landen (dieselbe Grenze wie bei den Budget-Phasen:
    // der Stichtag gilt bis einschliesslich).
    const r = serienAbschnitte([rate("2026-08-20", 100)], "2026-08-20");
    expect(r.offenCount).toBe(1);
    expect(r.vergangenCount).toBe(0);
  });

  it("eine abgelaufene Serie wird ganz als Vergangenheit gezeigt", () => {
    const serie = [rate("2026-05-31", 300), rate("2026-06-30", 300)];
    const r = serienAbschnitte(serie, "2026-08-20");
    expect(r.nurVergangen).toBe(true);
    expect(r.offenCount).toBe(0);
    expect(r.vergangenCount).toBe(2);
  });

  it("heuteIso liefert den Stichtag im ISO-Format", () => {
    expect(heuteIso(new Date(2026, 7, 5))).toBe("2026-08-05");
  });

  it("die Liste im Dialog benutzt die Trennung", () => {
    const src = readFileSync(resolve(wurzel, "src/components/screens/VormerkungHub.jsx"), "utf8");
    expect(src).toMatch(/serienAbschnitte\(mainSorted, heuteIso\(\)\)/);
    // „insgesamt" war die Formulierung, die den Irrtum trug: sie zaehlte
    // Vergangenes mit und stand ueber den geplanten Raten.
    expect(src, "der Kopf zaehlt jetzt die geplanten").toMatch(/noch geplant/);
  });
});
