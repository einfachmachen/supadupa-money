// Regression: der Abstand unter dem Hero im Jahres-Kopf (Trend/Money Mood/Jahr).
//
// Der Hero sitzt dort in einem eigenen Wrapper, damit Reiter- und Sortierzeile
// mit ihm auf- und zuklappen koennen. Dieser Wrapper ist ein Flex-Kind und
// damit ein eigener Block-Kontext: der untere Rand des Heros faellt darin
// nicht mehr mit dem oberen Rand des naechsten Blocks zusammen, sondern wird
// eingeschlossen und addiert sich — 8 + 8 = 16px statt der 8px, die Home und
// Monat zeigen. Zu sehen war das nur bei EINGEKLAPPTEM Hero, weil der Wrapper
// aufgeklappt an der Reiterzeile endet (Rand unten 0).
//
// Der Fehler ist im Browser gemessen worden, nicht am Code abzulesen, und
// Build wie Render-Tests blieben gruen. Dieser Test haelt die beiden Teile
// zusammen, die ihn beheben: die CSS-Regel und der Haken im Markup.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => readFileSync(resolve(wurzel, p), "utf8");

describe("Jahres-Kopf: Abstand unter dem Hero", () => {
  const css = lies("src/theme/css/themes.css");
  const jsx = lies("src/components/molecules/YearSectionHeader.jsx");

  it("nimmt dem Hero im Jahres-Kopf den unteren Rand", () => {
    expect(css).toMatch(/\.jahres-kopf\s*>\s*\.hero-flaeche\s*\{[^}]*margin-bottom:\s*0\s*[;}]/);
  });

  it("setzt den Haken jahres-kopf am Wrapper", () => {
    expect(jsx).toMatch(/className="jahres-kopf"/);
  });

  it("stellt die Regel hinter die theme-eigenen Hero-Raender", () => {
    // Gleiche Spezifitaet — es entscheidet die Reihenfolge in der Datei.
    const letzterThemeRand = css.lastIndexOf("margin-bottom: 8px");
    const unsere = css.indexOf(".jahres-kopf > .hero-flaeche");
    expect(unsere).toBeGreaterThan(-1);
    expect(unsere).toBeGreaterThan(letzterThemeRand);
  });

  it("nennt den dritten Reiter Jahr, nicht Trend", () => {
    // „Trend" ist der Name des ganzen Bereichs in der unteren Leiste und stand
    // als Reiter darin ein zweites Mal fuer die engere Jahresansicht.
    expect(jsx).toMatch(/\["jahr",\s*"Jahr"/);
    expect(jsx).not.toMatch(/\["jahr",\s*"Trend"/);
  });
});
