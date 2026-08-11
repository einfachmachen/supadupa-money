// Zwei Textfarben: auf dem Hintergrund und auf Kartenflaechen.
//
// Bis zu diesem Umbau hatte die App EINE Textfarbe fuer beides. Das schloss
// jedes Motiv aus, das die Flaechen gegensaetzlich faerbt — beim Keyboard-Theme
// (dunkle Keycaps auf heller Tastatur-Platte) fiel dadurch immer eine Seite
// durch: im Aufriss standen die Buchungszeilen weiss auf fast weiss.
//
// Der Mechanismus greift NUR bei Themes, die `txt_card` angeben. Genau das
// haelt der erste Test fest — er ist die Absicherung dafuer, dass die anderen
// 32 Themes Zeichen fuer Zeichen unveraendert bleiben.

import { describe, it, expect, beforeEach } from "vitest";
import { theme as T, setActiveTheme, kartenTextRegel, wurzelTextVars, hatKartenText } from "../src/theme/activeTheme.js";
import { THEMES } from "../src/theme/themes.js";

const rgb = (h) => {
  let x = String(h).replace("#", "");
  if (x.length === 3) x = x.split("").map(c => c + c).join("");
  return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16));
};
const lum = (c) => {
  const s = rgb(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const kontrast = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

beforeEach(() => setActiveTheme("dark", THEMES.dark));

describe("Karten-Textfarbe", () => {
  it("laesst alle Themes ohne txt_card voellig unveraendert", () => {
    const mitVariable = [];
    Object.entries(THEMES).forEach(([name, th]) => {
      if (th.txt_card) return;
      setActiveTheme(name, th);
      ["txt", "txt2", "lbl"].forEach(k => {
        if (String(T[k]).includes("var(")) mitVariable.push(`${name}.${k}`);
      });
      if (kartenTextRegel()) mitVariable.push(`${name}: Regel nicht leer`);
      if (wurzelTextVars()) mitVariable.push(`${name}: Wurzel-Variablen gesetzt`);
    });
    expect(mitVariable).toEqual([]);
  });

  it("liefert bei einem Theme MIT txt_card Variablen samt Rueckfallwert", () => {
    setActiveTheme("keyboard", THEMES.keyboard);
    expect(hatKartenText()).toBe(true);
    // Der Rueckfallwert ist die Hintergrund-Farbe: kaeme die Variable irgendwo
    // nicht an, stuende dort dieselbe Farbe wie vor dem Umbau.
    expect(T.txt).toBe(`var(--txt, ${THEMES.keyboard.txt})`);
    expect(wurzelTextVars()["--txt"]).toBe(THEMES.keyboard.txt);
  });

  it("nennt in der Regel JEDE Kartenflaeche des Themes", () => {
    setActiveTheme("keyboard", THEMES.keyboard);
    const regel = kartenTextRegel();
    const alsRgb = (h) => { const [r, g, b] = rgb(h); return `rgb(${r}, ${g}, ${b})`; };
    [THEMES.keyboard.surf, THEMES.keyboard.surf2, THEMES.keyboard.surf3, THEMES.keyboard.cat_bg]
      .forEach(f => expect(regel).toContain(alsRgb(f)));
    expect(regel).toContain(THEMES.keyboard.txt_card);
    // Der Hero traegt Akzentfarben und braucht deshalb ebenfalls eine Flaeche.
    expect(regel).toContain(".hero-flaeche");
  });

  it("Keyboard: beide Textfarben sitzen lesbar auf ihrer Flaeche", () => {
    const t = THEMES.keyboard;
    // Karten-Text auf jeder Kartenflaeche …
    [t.surf, t.surf2, t.surf3, t.cat_bg, t.hero_surface].forEach(f => {
      expect(kontrast(t.txt_card, f)).toBeGreaterThanOrEqual(4.5);
    });
    // … und Hintergrund-Text auf der Platte.
    expect(kontrast(t.txt, t.bg)).toBeGreaterThanOrEqual(4.5);
    // Und beide sind wirklich verschieden — sonst braeuchte es den Umbau nicht.
    expect(t.txt_card).not.toBe(t.txt);
  });
});
