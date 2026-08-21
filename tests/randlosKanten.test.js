// Eine Kante, die etwas AUSSAGT, darf kein `border` sein.
//
// Der Randlos-Modus ist der Standard der App. Er setzt per `.no-borders *`
// jede `border-color` auf `transparent !important` und nimmt Knöpfen ihren
// Rahmen sogar ganz (`.no-borders button { border: none !important }`) —
// beides in `theme/css/themes.css`.
//
// Das ist für Deko-Linien genau richtig und war so gewollt. Für eine Linie,
// die eine INFORMATION trägt, ist es fatal, und zwar unsichtbar fatal: Das
// Element wird gezeichnet, die Regel greift, niemand merkt etwas.
//
// Genau so ist es passiert. Die grüne Umrandung „alles abgesichert" um den
// Hero war als `border` gebaut. Im Browser gemessen: inline
// `border: 2px solid rgb(200,220,46)`, berechnet `rgba(0,0,0,0)`. Der Nutzer:
// „Die grüne Umrandung ums Hero entdecke ich auch nicht." — Und dieselbe
// Falle traf die `knopfKante` aus dem Kontrast-Umbau: Sie trägt den Kontrast
// der Knopf-FLÄCHE gegen die Seite (3:1, WCAG 1.4.11), wenn die Füllung ihn
// allein nicht schafft. Als `border` war auch sie im Standardmodus weg.
//
// Die App löst das an anderer Stelle längst so: Die Kante der Eingabefelder
// kommt als INNERER SCHATTEN (siehe `INP` in theme/palette.js, und der
// Kommentar an der Randlos-Regel selbst: „Randlos meint die DEKO-Linien der
// App, nicht die Erkennbarkeit eines Feldes"). Genau das gilt hier auch.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => readFileSync(resolve(wurzel, p), "utf8");

describe("Randlos-Modus: tragende Kanten als innerer Schatten", () => {
  it("der Randlos-Modus räumt border-color wirklich ab", () => {
    // Die Grundlage des ganzen Tests — ändert sie sich, gilt er neu.
    const css = lies("src/theme/css/themes.css");
    expect(css).toMatch(/\.no-borders \*\s*\{[^}]*border-color:\s*transparent\s*!important/);
    expect(css).toMatch(/\.no-borders button\s*\{\s*border:\s*none\s*!important/);
  });

  it("die Absicherungs-Umrandung am Hero ist ein innerer Schatten", () => {
    const hero = lies("src/components/organisms/SaldoHeroV2.jsx");
    const i = hero.indexOf("{ring && (");
    expect(i, "die Umrandung muss es geben").toBeGreaterThan(-1);
    const block = hero.slice(i, i + 300);
    expect(block).toMatch(/boxShadow:`inset 0 0 0 2px \$\{ring\}`/);
    expect(block, "ein border waere im Standardmodus unsichtbar")
      .not.toMatch(/border:`?\d/);
  });

  it("keine knopfKante hängt mehr an einem border", () => {
    // `kante` kommt aus `vollKnopf`/`knopfKante` und traegt den Kontrast der
    // Flaeche gegen die Seite. Als border ist sie im Standardmodus weg.
    ["src/components/screens/CloudSetupWizard.jsx",
     "src/components/screens/EnableBankingWizard.jsx"].forEach((p) => {
      const src = lies(p);
      const treffer = (src.match(/border:[^,\n]*\.?kante/g) || [])
        .concat(src.match(/border: kante/g) || []);
      expect(treffer, `${p}: ${treffer.join(" | ")}`).toEqual([]);
      // Und es gibt sie ueberhaupt noch — sonst prueft der Test nichts.
      expect(src).toMatch(/inset 0 0 0 1\.5px \$\{/);
    });
  });
});
