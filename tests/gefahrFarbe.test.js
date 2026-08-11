// Gefahr-Rot der Rueckfrage (GEFAHR in activeTheme.js).
//
// Der Loeschen-Knopf trug vorher T.neg — im 4-Farben-Schema die AUSGABEN-Farbe,
// in den meisten Themes cyan. Als Warnsignal las sich das nicht (Nutzer-
// Hinweis). Die feste Farbe muss dafuer in JEDEM Theme funktionieren: weisser
// Text darauf lesbar, und der gefuellte Knopf muss sich von der Dialogkarte
// absetzen (Overlay: helle Themes #F5F7F2, sonst T.surf2).

import { describe, it, expect } from "vitest";
import { GEFAHR, GEFAHR_KANTE, isLightTheme } from "../src/theme/activeTheme.js";
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

describe("Gefahr-Farbe der Rueckfrage", () => {
  it("traegt weissen Text lesbar (>= 4.5:1)", () => {
    expect(kontrast(GEFAHR, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("ist rot — nicht die Ausgaben-Farbe eines Themes", () => {
    const [r, g, b] = rgb(GEFAHR);
    expect(r).toBeGreaterThan(g + 60);
    expect(r).toBeGreaterThan(b + 60);
  });

  it("ist in JEDEM Theme als Knopf erkennbar — durch Fuellung ODER Kante", () => {
    // 3:1 ist die Schwelle fuer Bedienelemente (WCAG 1.4.11). Die FUELLUNG
    // allein kann sie auf mittelgrauen Karten nicht erreichen, ohne den weissen
    // Text unlesbar zu machen (siehe Rechnung bei GEFAHR) — deshalb zaehlt hier
    // der bessere der beiden Werte.
    const schwach = [];
    Object.entries(THEMES).forEach(([name, th]) => {
      if (name === "custom_preview") return;
      // Overlay waehlt die Kartenfarbe nach isLightTheme() — genau die pruefen.
      const karte = isLightTheme(name) ? "#F5F7F2" : (th.surf2 || th.surf);
      if (!karte) return;
      const k = Math.max(kontrast(GEFAHR, karte), kontrast(GEFAHR_KANTE, karte));
      if (k < 3) schwach.push(`${name} auf ${karte} = ${k.toFixed(2)}`);
    });
    expect(schwach).toEqual([]);
  });

  it("die Kante hebt sich von der Fuellung ab", () => {
    // Sonst waere sie unsichtbar und truege nichts bei.
    expect(kontrast(GEFAHR_KANTE, GEFAHR)).toBeGreaterThan(1.5);
  });

  it("hebt sich vom Abbrechen-Knopf ab, der die Kartenfarbe traegt", () => {
    // Abbrechen ist transparent mit Rahmen — nur der Ja-Knopf ist gefuellt.
    // Damit ist die Farbe das einzige Unterscheidungsmerkmal der beiden.
    expect(GEFAHR).not.toBe(THEMES.dark?.neg);
  });
});
