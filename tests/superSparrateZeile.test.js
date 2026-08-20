// Die Super-Sparraten-Zeile im Sparplan (TagesgeldWidget).
//
// Sie hebt sich mit ihrer EIGENEN Warnfarbe ab (`${T.gold}1f`) und schreibt
// denselben Ton darauf. Auf einem Grund, der aus genau diesem Ton gemischt
// ist, schrumpft der Kontrast — dieselbe Falle wie bei den Hinweiskästen und
// den Wahlkarten im Daten-Manager, und sie ist hier schon zweimal
// zugeschnappt (Nutzer-Bilder).
//
// Deshalb rechnet die Zeile mit `aufToenung(..., ".hinweis-karte", ...)`:
// Themes mit gegensätzlichen Flächen („Tastenhell") erklären diese Klasse per
// `flaechen_extra` zur Taste und malen deren Farbe mit `!important` über die
// Tönung — dann ist SIE der Untergrund, nicht der Goldschleier.

import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme } from "../src/theme/activeTheme.js";
import { aufToenung, toenungsGrund, kontrastWert } from "../src/theme/amtPill.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Genau die Rechnung aus TagesgeldWidget.jsx (`sweepFarbe`).
const TOENUNG = 0x1f / 255;
const grund = () => toenungsGrund(THEMES_AKTIV.gold, TOENUNG, ".hinweis-karte");
const farbe = (ton, schwelle) => aufToenung(ton, TOENUNG, ".hinweis-karte", schwelle);
let THEMES_AKTIV = null;

// [Beschreibung, Ton, Schwelle] — Text 4,5:1, Symbole 3:1 (WCAG 1.4.11)
const STELLEN = [
  ["Blitz-Symbol",            "gold", 3],
  ["Wort Super-Sparrate",     "gold", 4.5],
  ["Hin-Betrag",              "gold", 4.5],
  ["Rueck-Betrag",            "pos",  4.5],
  ["Fliesstext",              "txt",  4.5],
];

describe("Super-Sparraten-Zeile: Kontrast auf der eigenen Toenung", () => {
  it("alles traegt auf der gemalten Flaeche — in jedem Theme", () => {
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg || !t.gold) continue;
      setActiveTheme(name, t); THEMES_AKTIV = t;
      for (const [was, tonKey, schwelle] of STELLEN) {
        const ton = t[tonKey];
        if (!ton || !/^#/.test(ton)) continue;   // `txt` kann eine CSS-Variable sein
        const wert = kontrastWert(farbe(ton, schwelle), grund());
        if (wert < schwelle) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1 (soll ${schwelle})`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("belegt den Fall: der Rohton allein reicht nicht", () => {
    // Ohne die Rechnung faellt das Gold auf seiner eigenen Toenung durch —
    // der Beleg, dass `aufToenung` hier wirklich etwas tut.
    const rohDurchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.gold || !/^#/.test(t.gold)) continue;
      setActiveTheme(name, t); THEMES_AKTIV = t;
      if (kontrastWert(t.gold, grund()) < 4.5) rohDurchgefallen.push(name);
    }
    expect(rohDurchgefallen.length, "erwartet: der Rohton faellt mehrfach durch")
      .toBeGreaterThan(0);
  });

  it("die Zeile beginnt links, nicht eingerueckt", () => {
    // Nutzer-Wunsch: Sie gehoert zum Monat als Ganzem, nicht zu einer der
    // Spalten rechts. Ein `paddingLeft` in Spaltenbreite (38px) waere genau
    // die Einrueckung, die vorher dastand.
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    const zeile = src.slice(src.indexOf("Super-Sparrate</b> am") - 900, src.indexOf("Super-Sparrate</b> am"));
    expect(zeile).not.toMatch(/paddingLeft:\s*38/);
    expect(zeile).toContain('className="hinweis-karte"');
  });
});

