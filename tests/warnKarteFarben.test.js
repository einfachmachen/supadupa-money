// Die Warnkarte war grün.
//
// Nutzer-Bild: „3× unter Puffer (100,00 €) — schlimmste: 796,57 €" stand als
// cyanfarbene Schrift auf einer pastellgrünen Fläche. Nutzer: „die Farben in
// ‚3x unter Puffer …' passen nicht. Das Pastellgrün mag ich nicht."
//
// Die Ursache war keine Geschmacksfrage, sondern eine Verwechslung: Die Karte
// war komplett aus `T.neg` gebaut. `neg` ist seit dem Farbumbau die
// AUSGABEN-Farbe (Cyan) und nicht mehr die Warnfarbe — dieselbe Korrektur war
// beim orangen Balken in App.jsx schon einmal fällig. Über dem hellen
// Seitengrund wird aus 9 % Cyan ein Mintton: Er SIEHT aus wie „alles gut",
// während er eine Schieflage meldet.
//
// Dafür gibt es `warn_bold` — bewusst als eigener, in jedem Theme kräftiger
// Ton definiert. Dieser Test prüft beides: dass die Karte ihn benutzt, und
// dass die Schrift darauf über ALLE Themes trägt.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme, theme as T } from "../src/theme/activeTheme.js";
import { aufToenung, kontrastWert, mischen, flaecheVon } from "../src/theme/amtPill.js";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(wurzel, "src/components/organisms/KontoWarnungWidget.jsx"), "utf8");
const TOENUNG = 0x20 / 255;
const namen = Object.keys(THEMES);

// Der Grund, der WIRKLICH gemalt wird — dieselbe Unterscheidung wie in
// `toenungsGruende`: Erklaert ein Theme `.warn-karte` zur Karte („Tastenhell"),
// malt es seine Kartenfarbe per !important darueber und die Toenung ist gar
// nicht zu sehen. Sonst gilt die Toenung ueber dem Seitengrund.
const gemalterGrund = () => flaecheVon(".warn-karte") || mischen(T.warn_bold, TOENUNG, T.bg);

describe("Warnkarte: Warnfarbe statt Ausgabenfarbe", () => {
  it("die Karte ist aus warn_bold gebaut, nicht aus neg", () => {
    expect(src).toMatch(/const WARN = T\.warn_bold/);
    // Kein einziges neg mehr im Kasten — sonst kommt das Mint zurueck.
    expect(src, "kein T.neg mehr").not.toMatch(/\$\{T\.neg\}/);
    expect(src, "kein acc_neg mehr").not.toMatch(/T\.acc_neg/);
  });

  it("die Schrift wird gegen die getönte Fläche gerechnet", () => {
    // Ein Warnton auf seiner EIGENEN Toenung verliert Kontrast — deshalb
    // aufToenung() und nicht die Akzentfarbe der Platte.
    expect(src).toMatch(/aufToenung\(farbe, TOENUNG, "\.warn-karte", schwelle\)/);
  });

  it("jedes Theme trägt die Überschrift auf der Warnfläche", () => {
    const schwach = [];
    namen.forEach((name) => {
      setActiveTheme(name);
      const grund = gemalterGrund();
      const schrift = aufToenung(T.warn_bold, TOENUNG, ".warn-karte");
      const wert = kontrastWert(schrift, grund);
      if (wert < 4.5) schwach.push(`${name}: ${wert.toFixed(2)}:1`);
    });
    expect(schwach, `zu schwach — ${schwach.join(", ")}`).toEqual([]);
  });

  it("die Warnfläche hebt sich vom Seitenhintergrund ab", () => {
    // Ein Kasten, den man nicht sieht, warnt nicht. 1,2:1 ist wenig, aber es
    // ist eine FLAECHE mit Rahmen, kein Text — der Rahmen traegt den Rest.
    const schwach = [];
    namen.forEach((name) => {
      setActiveTheme(name);
      // Nur fuer Themes ohne eigene Kartenfarbe pruefbar — wo das Theme die
      // Karte selbst malt, ist ihre Sichtbarkeit ohnehin dessen Sache.
      if (flaecheVon(".warn-karte")) return;
      const grund = mischen(T.warn_bold, TOENUNG, T.bg);
      if (kontrastWert(grund, T.bg) < 1.05) schwach.push(name);
    });
    expect(schwach, `unsichtbar in: ${schwach.join(", ")}`).toEqual([]);
  });

  it("der Reiter über der Karte trägt denselben Ton", () => {
    // Sonst sitzt ein cyanfarbener Reiter auf einer orangen Karte.
    const dash = readFileSync(resolve(wurzel, "src/components/screens/DashboardScreenV2.jsx"), "utf8");
    expect(dash).toMatch(/panel="warnings"[\s\S]{0,200}activeBg=\{`\$\{T\.warn_bold\}20`\}/);
  });
});
