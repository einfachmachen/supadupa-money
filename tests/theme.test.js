import { describe, it, expect, beforeEach } from "vitest";
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
