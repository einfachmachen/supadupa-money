// „Luftige" Themes: Lime und Deep Ocean in der Gestalt von Tastenhell.
//
// Nutzer-Wunsch: „Kannst Du bitte das Lime und Deep Ocean Theme einmal
// duplizieren und so umbauen, dass es so aufgelockert aussieht wie
// Tastenhell?"
//
// Was „aufgelockert" ausmacht, sind drei Dinge — und keines davon ist eine
// Farbe:
//
//   1. Abstand und Form: Bloecke liegen als abgesetzte Flaechen mit Fugen
//      dazwischen auf einer Platte, mit runden Ecken.
//   2. Die Auszeichnung, WELCHE Bereiche solche Flaechen sind. Hero,
//      Symbolzeile, Reiter und Blaetter sind im Markup keine Karten — ohne
//      `flaechen_extra` verschwaemmen sie mit der Platte und es gaebe keine
//      Fugen zu sehen.
//   3. Eine Platte, die dunkler ist als die Flaechen. In den Vorlagen liegen
//      bg (#2C3035) und surf (#363B42) so dicht beieinander, dass eine Fuge
//      dazwischen kaum zu erkennen waere.
//
// Punkt 1 stand bis hierher fest auf `.theme-tastenhell` verdrahtet. Diese
// Regeln beschreiben aber nichts Farbiges — sie gelten jetzt fuer jedes Theme
// mit `luftig:true`. Eine Kette aus Theme-Namen im Stylesheet veraltet,
// sobald ein Theme dazukommt; genau das war bei Tastenhell schon einmal
// passiert (siehe der Kommentar an der Theme-Klasse in App.jsx).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme, theme as T } from "../src/theme/activeTheme.js";
import { kartenTextRegel } from "../src/theme/activeTheme.js";
import { kontrastWert } from "../src/theme/amtPill.js";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(wurzel, "src/theme/css/themes.css"), "utf8");
// Ohne Kommentare — uebrig bleibt, was der Browser wirklich sieht. Der Name
// „theme-tastenhell" darf in der Erklaerung durchaus noch vorkommen; als
// SELEKTOR darf er es nicht mehr.
const cssWirksam = css.replace(/\/\*[\s\S]*?\*\//g, "");
const app = readFileSync(resolve(wurzel, "src/App.jsx"), "utf8");

const NEU = ["limeluftig", "deepoceanluftig"];
const VORLAGE = { limeluftig: "dark", deepoceanluftig: "deepocean" };

describe("Luftige Themes", () => {
  it("es gibt sie, und sie tragen einen eigenen Namen", () => {
    NEU.forEach((k) => {
      expect(THEMES[k], `${k} fehlt`).toBeTruthy();
      expect(THEMES[k].name).toMatch(/Luftig/);
      // Die Vorlage bleibt unangetastet — es sind Duplikate, kein Umbau.
      expect(THEMES[VORLAGE[k]].luftig, `${VORLAGE[k]} darf nicht mitverändert sein`)
        .toBeFalsy();
    });
  });

  it("sie behalten die Akzente ihrer Vorlage", () => {
    // „Duplizieren und umbauen" heisst: dieselbe Farbwelt, andere Gestalt.
    NEU.forEach((k) => {
      const v = THEMES[VORLAGE[k]];
      ["blue", "pos", "neg", "gold", "warn_bold"].forEach((rolle) => {
        expect(THEMES[k][rolle], `${k}.${rolle}`).toBe(v[rolle]);
      });
    });
  });

  it("die Platte liegt unter den Flächen — sonst gäbe es keine Fuge", () => {
    NEU.forEach((k) => {
      const t = THEMES[k];
      const fuge = kontrastWert(t.surf, t.bg);
      expect(fuge, `${k}: Platte und Fläche zu ähnlich (${fuge.toFixed(2)}:1)`)
        .toBeGreaterThan(1.15);
      // Und die Platte muss WIRKLICH dunkler sein als die Vorlage, sonst
      // waere die Fuge durch ein helleres surf erkauft.
      expect(t.bg, `${k}: Platte nicht abgesenkt`).not.toBe(THEMES[VORLAGE[k]].bg);
    });
  });

  it("Hero, Symbolzeile und Reiter sind als Flächen ausgezeichnet", () => {
    NEU.forEach((k) => {
      const f = THEMES[k].flaechen_extra || {};
      [".hero-flaeche", ".symbolzeile", ".nav-tab", ".aufriss-blatt"].forEach((sel) => {
        expect(f[sel], `${k}: ${sel} fehlt in flaechen_extra`).toBeTruthy();
      });
      expect(THEMES[k].card_shadow, `${k}: ohne Schatten hebt sich nichts ab`).toBeTruthy();
    });
  });

  it("die Auszeichnung landet auch wirklich im erzeugten CSS", () => {
    // `kartenTextRegel` erzeugt die Regeln aus `flaechen_extra` — auch ohne
    // eigene Karten-Textfarbe (Platte und Karten sind hier beide dunkel).
    NEU.forEach((k) => {
      setActiveTheme(k);
      const regel = kartenTextRegel(T);
      expect(regel, `${k}: keine Flächen-Regel erzeugt`).toContain(".hero-flaeche{");
      expect(regel).toContain(".nav-tab{");
      expect(regel, "der Schatten gehört dazu").toContain("box-shadow:");
    });
  });

  it("die Abstandsregeln hängen an `luftig`, nicht an einem Theme-Namen", () => {
    expect(cssWirksam, "die alte, festverdrahtete Kette ist weg")
      .not.toMatch(/\.theme-tastenhell/);
    expect(css).toMatch(/\.theme-luftig \.hero-flaeche/);
    expect(css).toMatch(/\.theme-luftig \.kategorie-liste/);
    expect(css).toMatch(/\.theme-luftig \.nav-tab/);
    expect(app, "die Klasse muss auch gesetzt werden")
      .toMatch(/T\.luftig\?"theme-luftig":null/);
  });

  it("Tastenhell meldet sich mit demselben Schalter an", () => {
    // Sonst haetten die Regeln zwar einen neuen Namen, aber ihr urspruenglicher
    // Traeger verlore sie — und Tastenhell waere ueber Nacht eckig.
    expect(THEMES.tastenhell.luftig).toBe(true);
  });

  it("alle luftigen Themes zeichnen dieselben Bereiche aus", () => {
    // Ein luftiges Theme, das den Hero vergisst, sieht halb umgebaut aus.
    const luftige = Object.entries(THEMES).filter(([, t]) => t.luftig);
    expect(luftige.length).toBeGreaterThanOrEqual(3);
    luftige.forEach(([k, t]) => {
      [".hero-flaeche", ".symbolzeile", ".nav-tab"].forEach((sel) => {
        expect((t.flaechen_extra || {})[sel], `${k}: ${sel} fehlt`).toBeTruthy();
      });
    });
  });
});
