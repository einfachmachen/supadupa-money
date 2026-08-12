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
      // Die Regel darf da sein (Themes koennen Flaechen/Deko setzen, ohne die
      // Textfarben zu trennen) — nur Text-Variablen duerfen NICHT darin stehen.
      if (/--txt|--lbl|--amt-neutral/.test(kartenTextRegel())) {
        mitVariable.push(`${name}: Text-Variablen in der Regel`);
      }
      if (wurzelTextVars()) mitVariable.push(`${name}: Wurzel-Variablen gesetzt`);
    });
    expect(mitVariable).toEqual([]);
  });

  it("liefert bei einem Theme MIT txt_card Variablen samt Rueckfallwert", () => {
    // Kein ausgeliefertes Theme braucht die zwei Saetze derzeit: das
    // Keyboard-Theme, fuer das der Mechanismus gebaut wurde, kam am Ende mit
    // einer mittelhellen Platte aus (siehe tools/kontrast.cjs — eine fast
    // weisse Platte riss 23 Stellen auf). Der Mechanismus bleibt trotzdem: er
    // ist die einzige Moeglichkeit, Hintergrund und Karten gegensaetzlich zu
    // faerben. Geprueft wird er deshalb an einem gestellten Theme.
    const gegensaetzlich = { ...THEMES.keyboard, txt: "#1E1E1C", txt_card: "#FFFFFF",
      txt2: "rgba(30,30,28,0.66)", txt2_card: "rgba(255,255,255,0.80)" };
    setActiveTheme("probe", gegensaetzlich);
    expect(hatKartenText()).toBe(true);
    // Der Rueckfallwert ist die Hintergrund-Farbe: kaeme die Variable irgendwo
    // nicht an, stuende dort dieselbe Farbe wie vor dem Umbau.
    expect(T.txt).toBe("var(--txt, #1E1E1C)");
    expect(wurzelTextVars()["--txt"]).toBe("#1E1E1C");
    // --amt-neutral gehoert in BEIDE Saetze: ein var() in einer Custom Property
    // wird dort aufgeloest, wo sie DEKLARIERT ist. Auf der Wurzel als
    // var(--txt) deklariert erbte jede Karte den Hintergrund-Wert — weisse
    // Namen, aber fast schwarze Betraege daneben (Nutzer-Hinweis).
    expect(wurzelTextVars()["--amt-neutral"]).toBe("#1E1E1C");
    expect(kartenTextRegel()).toContain("--amt-neutral:#FFFFFF");
  });

  it("nennt in der Regel JEDE Kartenflaeche des Themes", () => {
    setActiveTheme("keyboard", THEMES.keyboard);
    const regel = kartenTextRegel();
    const alsRgb = (h) => { const [r, g, b] = rgb(h); return `rgb(${r}, ${g}, ${b})`; };
    [THEMES.keyboard.surf, THEMES.keyboard.surf2, THEMES.keyboard.surf3, THEMES.keyboard.cat_bg]
      .forEach(f => expect(regel).toContain(alsRgb(f)));
    // Hero, Drei-Symbol-Zeile und Werkzeuge-Zeile tragen Akzentfarben und
    // brauchen ebenfalls eine Flaeche — sonst fallen die Symbole durch.
    Object.keys(THEMES.keyboard.flaechen_extra).forEach(sel => {
      expect(regel).toContain(sel);
    });
    // Die Fuge zwischen zwei Keycaps kommt aus dem Theme, nicht aus der
    // CSS-Datei — sonst kann sie von der Kartenfarbe abgekoppelt werden.
    expect(regel).toContain("box-shadow");
  });

  it("Keyboard: Text und Akzente sitzen lesbar auf Platte UND Keycaps", () => {
    const t = THEMES.keyboard;
    const flaechen = [t.bg, t.surf, t.surf2, t.surf3, t.cat_bg, ...Object.values(t.flaechen_extra)];
    // Weisser Text traegt auf allen Flaechen …
    flaechen.forEach(f => expect(kontrast(t.txt, f)).toBeGreaterThanOrEqual(4.5));
    // … und die Akzente erreichen ueberall die Schwelle fuer Symbole/grossen
    // Text. Genau daran ist die fast weisse Platte gescheitert.
    [t.blue, t.neg, t.gold, t.mid].forEach(a => {
      flaechen.forEach(f => expect(kontrast(a, f)).toBeGreaterThanOrEqual(3));
    });
    // Vorgemerkt bleibt vom Gebuchten unterscheidbar (§4.4).
    expect(kontrast(t.neg, t.neg_vm)).toBeGreaterThan(1.25);
  });
});
