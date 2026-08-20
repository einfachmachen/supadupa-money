// Die Reserve unter dem + Knopf — und der Scroller, der sie nutzen kann.
//
// Zwei Fehler, die zusammen denselben Eindruck erzeugten: „Der Inhalt lässt
// sich nicht bis über den + Knopf hochschieben" (Nutzer-Hinweis zu „neue
// Vormerkung" und zur Kategorie-Auswahl — letztere ist Schritt 2 desselben
// Dialogs).
//
//  1. Die Reserve war eine feste Zahl (216 = 64px Leiste + 152px Überhang).
//     Sie stimmt für die Maße, die der Knopf hatte, als sie ausgerechnet
//     wurde. „Tastenhell" macht die Leiste 64 statt 57 Pixel hoch, im
//     arretierten Zustand wächst der Knopf auf das 1,5-fache und hebt sich an,
//     und die Feature-Tour lässt ihn noch weiter fliegen. Jetzt wird sie
//     gemessen (`--plus-frei`, gesetzt in App.jsx).
//
//  2. Die Wurzel des Vormerken-Dialogs stand auf `overflowY:auto`, obwohl
//     JEDER ihrer vier Schritte einen eigenen Scroll-Bereich mitbringt. Zwei
//     Scroll-Container ineinander — und auf iOS entscheidet der äußere, wer
//     die Wischgeste bekommt. Die Reserve war dann da, nur nicht erreichbar.
//
// Beides ist Layout und im Browser gemessen worden (390×780, 390×844,
// 602×1214: die letzte Zeile endet jeweils 50px über der Knopf-Oberkante).
// Was ein Test in jsdom halten kann, ist die BAUFORM — und genau die ist
// jeweils zurückgefallen.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => readFileSync(resolve(wurzel, p), "utf8");

describe("Reserve unter dem + Knopf", () => {
  it("UNTEN_FREI ist die gemessene Variable, keine feste Zahl", () => {
    const palette = lies("src/theme/palette.js");
    expect(palette).toMatch(/const UNTEN_FREI = "var\(--plus-frei, \d+px\)"/);
  });

  it("App.jsx misst den Knopf und setzt --plus-frei", () => {
    const app = lies("src/App.jsx");
    expect(app).toMatch(/setProperty\("--plus-frei"/);
    // Gemessen wird gegen die Oberkante des Knopfes, nicht gegen die Leiste.
    expect(app).toMatch(/plus-master-btn/);
    expect(app).toMatch(/getBoundingClientRect\(\)\.top/);
    // Der Knopf hat eine Transition — einmal messen reicht nicht.
    expect(app).toMatch(/\[80, 180, 300, 450\]/);
  });

  it("kein Aufrufer hängt noch ein px an", () => {
    // `UNTEN_FREI` IST jetzt ein vollständiger CSS-Wert. Ein angehängtes
    // „px" ergäbe `var(--plus-frei, 216px)px` — ungültig, und der Browser
    // verwirft die ganze Deklaration still.
    const dateien = [
      "src/components/organisms/MobileVormerkenModal.jsx",
      "src/components/organisms/MobileKategorienModal.jsx",
      "src/components/organisms/DataManagerDialog.jsx",
      "src/components/screens/MonatScreen.jsx",
      "src/components/screens/JahrScreen.jsx",
      "src/components/screens/DashboardScreenV2.jsx",
      "src/components/screens/VormerkungHub.jsx",
      "src/components/screens/ManagementScreen.jsx",
      "src/components/screens/TrendOverviewScreen.jsx",
    ];
    const treffer = dateien.filter((d) => /\$\{UNTEN_FREI\}px/.test(lies(d)));
    expect(treffer, `noch mit px: ${treffer.join(", ")}`).toEqual([]);
  });

  it("der Vormerken-Dialog hat genau EINEN Scroller je Schritt", () => {
    const src = lies("src/components/organisms/MobileVormerkenModal.jsx");
    // Die Wurzel scrollt nicht …
    const wurzel = src.match(/<div className="mobile-modal" style=\{\{[^}]*\}\}/);
    expect(wurzel, "Wurzel-Div nicht gefunden").toBeTruthy();
    expect(wurzel[0]).toContain('overflow:"hidden"');
    expect(wurzel[0]).not.toContain('overflowY:"auto"');
    // … die vier Schritte schon, jeder mit der Reserve.
    const scroller = src.match(/flex:1,padding:S\.padL,paddingBottom:UNTEN_FREI,overflowY:"auto"/g) || [];
    expect(scroller.length, "erwartet: ein Scroller je Schritt (1–4)").toBe(4);
  });
});
