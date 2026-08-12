import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { theme, setActiveTheme } from "../src/theme/activeTheme.js";
import { THEMES } from "../src/theme/themes.js";

describe("activeTheme proxy", () => {
  beforeEach(() => setActiveTheme("dark"));

  it("liefert default-Theme-Werte", () => {
    expect(theme.bg).toBeTruthy();
    expect(theme.themeName).toBe("dark");
  });

  it("aktualisiert beim Wechsel des Themes", () => {
    setActiveTheme("light");
    expect(theme.themeName).toBe("light");
    // Mindestens eine Property unterscheidet sich
    setActiveTheme("dark");
    const darkBg = theme.bg;
    setActiveTheme("light");
    expect(theme.bg).not.toBe(darkBg);
  });

  it("überträgt extra-Properties", () => {
    setActiveTheme("dark", { _rev: 5 });
    expect(theme._rev).toBe(5);
  });

  it("alle Themes sind aufrufbar ohne Crash", () => {
    for (const name of Object.keys(THEMES)) {
      setActiveTheme(name);
      expect(theme.themeName).toBe(name);
      expect(theme.bg).toBeDefined();
    }
  });
});

describe("Theme-Klasse am Wurzel-Container", () => {
  // In App.jsx stand eine Kette `themeName==="x"?"theme-x":null`, in die jedes
  // neue Theme von Hand eingetragen werden musste. Bei "Tastenhell" wurde das
  // vergessen — die Regeln in themes.css griffen nie, der Hero blieb eckig und
  // randlos, und das faellt nur im Browser auf. Jetzt entsteht die Klasse aus
  // dem Namen; dieser Test haelt fest, dass die Kette nicht zurueckkommt.
  const app = fs.readFileSync(path.resolve(import.meta.dirname, "..", "src", "App.jsx"), "utf8");

  it("wird allgemein aus dem Theme-Namen gebildet", () => {
    expect(app).toContain("`theme-${themeName}`");
  });

  it("enthaelt keine Aufzaehlung einzelner Themes mehr", () => {
    const kette = app.match(/themeName==="[a-z_]+"\?"theme-/g) || [];
    expect(kette).toEqual([]);
  });

  it("jede Theme-Klasse in der CSS-Datei gehoert zu einem echten Theme", () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, "..", "src", "theme", "css", "themes.css"), "utf8");
    const namen = [...new Set((css.match(/\.theme-[a-z_]+/g) || []).map(s => s.slice(7)))];
    expect(namen.filter(n => !THEMES[n])).toEqual([]);
  });
});
