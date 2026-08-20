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
import { toenungsGrund, schriftAuf, knopfPaar, kontrastWert } from "../src/theme/amtPill.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Genau die Rechnung aus TagesgeldWidget.jsx (`sweepFarbe`, `sweepKante`).
//
// Das Band bekommt bewusst KEINE Karten-Klasse: In „Tastenhell" waeren Zeile
// und Band sonst dieselbe Taste, und die Toenung waere weggebuegelt (1,00:1
// gemessen). Ohne Klasse wird sie wirklich gemalt — also `flaeche` = der
// Untergrund der Monatszeile.
const TOENUNG = 0x1f / 255;
let THEMES_AKTIV = null;
const zeilenGrund = () => toenungsGrund("#FFFFFF", 0.02, ".wahl-taste", THEMES_AKTIV.surf);
// Auf einem MITTELHELLEN Band traegt weder Schwarz noch Weiss (in „Dark"
// gemessene 4,36:1). Die Bandfarbe wird deshalb im Ausnahmefall minimal
// nachgerueckt, statt als Hex-Alpha darueberzuliegen.
const grund = () => knopfPaar(toenungsGrund(THEMES_AKTIV.gold, TOENUNG, undefined, zeilenGrund()), null, 4.5).grund;
const farbe = (ton, schwelle) => schriftAuf(grund(), ton, schwelle);
const kante = () => schriftAuf(zeilenGrund(), THEMES_AKTIV.gold, 3);

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

  it("das Band ist als Band erkennbar — Toenung oder Kante", () => {
    // Die Toenung allein traegt nicht ueberall: in hellen Themes sind es nur
    // ~1,09:1 gegen die Zeile. Deshalb zusaetzlich die Kante links, und die
    // muss 3:1 halten (WCAG 1.4.11, Bedienelement-Abgrenzung). Eine Kante ist
    // kein zweiter Bereich — aber sie ist immer da.
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg || !t.gold || !/^#/.test(t.gold)) continue;
      setActiveTheme(name, t); THEMES_AKTIV = t;
      const w = kontrastWert(kante(), zeilenGrund());
      if (w < 3) durchgefallen.push(`${name} · Kante: ${w.toFixed(2)}:1`);
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

  it("ein BAND, kein Kasten im Kasten — und ohne Symbol", () => {
    // Nutzer-Hinweise, beide in einem: „im Bereich nicht noch einen Bereich
    // zeichnen" und „das Blitzsymbol koennen wir weglassen, damit eine Zeile
    // reicht". Ein gerahmtes Kaestchen IN einer gerahmten Zeile las sich als
    // zweiter Bereich; das Symbol kostete die Breite, an der die Zeile umbrach.
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    const i = src.indexOf("Super-Sparrate</b>");
    expect(i, "die Zeile muss es geben").toBeGreaterThan(-1);
    const block = src.slice(i - 700, i + 400);
    expect(block, "kein Rahmen ringsum").not.toMatch(/border:\s*`1px solid/);
    expect(block, "keine Rundung").not.toMatch(/borderRadius:\s*6/);
    expect(block, "kein Blitzsymbol").not.toMatch(/Li\("zap"/);
    expect(block, "nicht eingerueckt").not.toMatch(/paddingLeft:\s*38/);
    // Buendig bis an die Raender: negative Raender heben das Polster der
    // Monatszeile auf.
    expect(block).toMatch(/margin:\s*"3px -6px -3px"/);
    expect(block, "Kante links statt Rahmen").toMatch(/borderLeft:/);
  });
});

