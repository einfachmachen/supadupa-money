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

  it("gibt dem Schieflage-Panel keinen Rand nach unten", () => {
    // Zweite Falle derselben Art, aber aus dem umgekehrten Grund: Money Mood
    // ist ein FLEX-Container, und Raender von Flex-Kindern fallen NIE
    // zusammen. Ein Rand unten am Panel addierte sich deshalb zum Rand der
    // Kategorieliste — 8 + 8 = 16px. Im Browser gegengeprueft: mit
    // "8px 10px" misst die Luecke 16px, mit "8px 10px 0" genau 8px.
    const mm = lies("src/components/screens/MoneyMoodScreen.jsx");
    expect(mm).toMatch(/margin:\s*"8px 10px 0"/);
    expect(mm).not.toMatch(/margin:\s*"8px 10px"/);
  });

  it("laesst die Jahrestabelle ueber den + Knopf hochscrollen", () => {
    // Die Tabelle ist die letzte Liste, der die Reserve noch fehlte: ihre
    // untersten Zeilen endeten unter Leiste und + Knopf. Ein erster Versuch
    // hatte stattdessen die Legendenzeile darunter verkleinert — das war die
    // falsche Ursache, denn scrollen liess sich die Tabelle dadurch nicht.
    const js = lies("src/components/screens/JahrScreen.jsx");
    expect(js).toMatch(/import\s*\{[^}]*\bUNTEN_FREI\b[^}]*\}\s*from\s*["'][^"']*palette\.js["']/);
    expect(js).toMatch(/dataScrollRef[\s\S]{0,600}?paddingBottom:\s*UNTEN_FREI/);
  });

  it("haelt die Umschaltzeile im Scrollbereich unter der Tabelle", () => {
    // Als eigenes Flex-Kind endete die Zeile immer am unteren Bildschirmrand
    // und lag damit hinter der Leiste: unlesbar, und der Umschalter „alle
    // Kategorien" war nicht erreichbar. Im Scrollbereich klebt sie unter der
    // letzten Tabellenzeile, und die Reserve wirkt unter IHR — die Tabelle
    // laeuft dadurch nur noch bis kurz ueber den + Knopf.
    const js = lies("src/components/screens/JahrScreen.jsx");
    const legende = js.indexOf("{/* Legend + Toggle");
    const scrollEnde = js.indexOf("{/* end data scroll */}");
    expect(legende).toBeGreaterThan(-1);
    expect(scrollEnde).toBeGreaterThan(-1);
    expect(legende).toBeLessThan(scrollEnde);
    // Waagerecht mitwandern waere falsch — die Tabelle ist breiter als der
    // Bildschirm, die Zeile muss am linken Rand stehen bleiben.
    const zeile = js.slice(legende, scrollEnde);
    expect(zeile).toMatch(/position:\s*"sticky",\s*left:\s*0/);
  });

  it("nennt den dritten Reiter Jahr, nicht Trend", () => {
    // „Trend" ist der Name des ganzen Bereichs in der unteren Leiste und stand
    // als Reiter darin ein zweites Mal fuer die engere Jahresansicht.
    expect(jsx).toMatch(/\["jahr",\s*"Jahr"/);
    expect(jsx).not.toMatch(/\["jahr",\s*"Trend"/);
  });
});
