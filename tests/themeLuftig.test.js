// Alle Themes tragen die luftige Gestalt.
//
// Nutzer-Wunsch, nachdem zwei Duplikate („Lime Luftig", „Deep Ocean Luftig")
// gefallen hatten: „Bitte ändere alle Themes so um. Den Zusatz ‚luftig' kannst
// Du entfernen." Wenn ALLE Themes so aussehen, ist es keine Variante mehr,
// sondern die Gestalt der App — und dann gehören die Duplikate weg.
//
// Was „aufgelockert" ausmacht, ist keine Farbe:
//
//   1. Abstand und Form (`luftig:true` → Klasse `theme-luftig` → themes.css).
//   2. Die Auszeichnung, WELCHE Bereiche abgesetzte Flächen sind
//      (`flaechen_extra`) — Hero, Symbolzeile, Reiter, Blätter, Diagramm sind
//      im Markup keine Karten.
//   3. Ein Schatten, der sie anhebt (`card_shadow`).
//
// Die Umstellung fasst BEWUSST keine Farbe an. Der naheliegende Griff wäre,
// die Platte abzudunkeln, damit die Fuge deutlicher wird — gemessen kostet das
// aber Kontrast, in hellen Themes viel (Limehell 90 → 125 Stellen unter der
// Schwelle) und in dunklen wegen halbdurchsichtiger Schrift auch etwas
// (Lime 60 → 62). Die Herleitung steht bei `luftigMachen` in themes.js.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES, getTheme, THEME_ALIAS } from "../src/theme/themes.js";
import { setActiveTheme, theme as T, kartenTextRegel } from "../src/theme/activeTheme.js";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(wurzel, "src/theme/css/themes.css"), "utf8");
const cssWirksam = css.replace(/\/\*[\s\S]*?\*\//g, "");
const app = readFileSync(resolve(wurzel, "src/App.jsx"), "utf8");
const alle = Object.entries(THEMES).filter(([k]) => k !== "custom_preview");

describe("Luftige Gestalt für alle Themes", () => {
  it("jedes Theme meldet sich an", () => {
    const ohne = alle.filter(([, t]) => !t.luftig).map(([k]) => k);
    expect(ohne, `nicht luftig: ${ohne.join(", ")}`).toEqual([]);
    expect(alle.length).toBeGreaterThanOrEqual(30);
  });

  it("jedes Theme zeichnet dieselben Bereiche als Fläche aus", () => {
    // Ein Theme, das den Hero vergisst, sieht halb umgebaut aus.
    const fehlt = [];
    alle.forEach(([k, t]) => {
      [".hero-flaeche", ".symbolzeile", ".nav-tab"].forEach((sel) => {
        if (!(t.flaechen_extra || {})[sel]) fehlt.push(`${k}${sel}`);
      });
      if (!t.card_shadow) fehlt.push(`${k} ohne Schatten`);
    });
    expect(fehlt, fehlt.join(", ")).toEqual([]);
  });

  it("die Auszeichnung landet auch wirklich im erzeugten CSS", () => {
    alle.slice(0, 6).forEach(([k]) => {
      setActiveTheme(k);
      const regel = kartenTextRegel(T);
      expect(regel, `${k}: keine Flächen-Regel`).toContain(".hero-flaeche{");
      expect(regel).toContain(".nav-tab{");
      expect(regel, "der Schatten gehört dazu").toContain("box-shadow:");
    });
  });

  it("KEINE Farbe wurde dabei angefasst", () => {
    // Das ist die Zusage, die diese Umstellung ungefährlich macht: Sie ist
    // rein gestalterisch. Wäre sie es nicht, könnte jede der 34 Farbwelten
    // an einer Stelle kippen, die niemand mehr einzeln nachmisst.
    const quelle = readFileSync(resolve(wurzel, "src/theme/themes.js"), "utf8");
    const i = quelle.indexOf("function luftigMachen");
    const block = quelle.slice(i, quelle.indexOf("\n}", i));
    expect(block, "kein Eingriff in bg").not.toMatch(/t\.bg\s*=/);
    expect(block, "kein Eingriff in surf").not.toMatch(/t\.surf\s*=/);
    expect(block, "kein Eingriff in Text").not.toMatch(/t\.txt2?\s*=/);
  });

  it("bedeutungstragende Flächen bleiben ausgespart", () => {
    // `.warn-karte` malt ihren Warnton, `.wahl-taste` die Farbe des gewählten
    // Typs. Ein `background: … !important` darauf löscht genau die
    // Information — schon einmal gemeldet („die Detaildarstellung ist zu
    // düster"). Nur „Tastenhell" zählt sie selbst auf: dort ist die Platte
    // hell, und die Akzentfarben fänden sonst keinen Grund.
    alle.forEach(([k, t]) => {
      if (k === "tastenhell") return;
      [".warn-karte", ".hinweis-karte", ".wahl-taste", ".tages-karte"].forEach((sel) => {
        expect((t.flaechen_extra || {})[sel], `${k}: ${sel} darf nicht übermalt werden`)
          .toBeFalsy();
      });
    });
  });

  it("die Abstandsregeln hängen an `luftig`, nicht an einem Theme-Namen", () => {
    expect(cssWirksam, "die alte, festverdrahtete Kette ist weg")
      .not.toMatch(/\.theme-tastenhell/);
    [".hero-flaeche", ".kategorie-liste", ".nav-tab"].forEach((sel) => {
      expect(css).toContain(`.theme-luftig ${sel}`);
    });
    expect(app, "die Klasse muss auch gesetzt werden")
      .toMatch(/T\.luftig\?"theme-luftig":null/);
  });

  it("entfernte Themes laufen ins Leere statt ins Nichts", () => {
    // Wer eines ausgewählt hatte, darf nicht auf einem Namen sitzen bleiben,
    // den es nicht mehr gibt: Die App zeigte dann zwar etwas, in der
    // Theme-Auswahl wäre aber nichts markiert (derselbe Fall wie bei
    // „darkhell").
    ["limeluftig", "deepoceanluftig", "keyboard", "magazin"].forEach((k) => {
      expect(THEMES[k], `${k} muss weg sein`).toBeUndefined();
      expect(THEME_ALIAS[k], `${k} braucht ein Ziel`).toBeTruthy();
      expect(THEMES[THEME_ALIAS[k]]).toBeTruthy();
      // Und der Alias greift auch wirklich.
      expect(getTheme(k).name).toBe(THEMES[THEME_ALIAS[k]].name);
    });
    expect(app, "beim Laden aufgeloest").toMatch(/THEME_ALIAS\[gespeichert\]/);
    const quelle = readFileSync(resolve(wurzel, "src/theme/themes.js"), "utf8");
    expect(quelle, "kein Name mit Zusatz mehr").not.toMatch(/name:"[^"]*Luftig"/);
  });

  it("Tastenhell behält seine eigene, reichere Auszeichnung", () => {
    // Es war die Vorlage — seine Gestalt darf sich durch die Verallgemeinerung
    // nicht ändern.
    expect(THEMES.tastenhell.luftig).toBe(true);
    expect(THEMES.tastenhell.flaechen_extra[".warn-karte"]).toBeTruthy();
    expect(THEMES.tastenhell.flaechen_extra[".mobile-modal input"]).toBeTruthy();
    expect(THEMES.tastenhell.card_shadow).toMatch(/rgba\(0,0,0,0\.34\)/);
  });
});
