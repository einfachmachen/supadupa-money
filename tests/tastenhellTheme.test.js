// Theme "Tastenhell" — die helle Tastatur.
//
// Gegenstueck zu "Keyboard": helle Platte, hellgraue Tasten. Genau diese
// Richtung war beim Keyboard-Theme gescheitert (eine fast weisse Platte riss
// 23 Stellen unter die Schwelle), weil die hellen Akzente der App darauf nicht
// tragen. Tastenhell loest das nicht mit einer dunkleren Platte, sondern mit
// einer DUNKLEN Akzentfamilie — und genau das haelt dieser Test fest. Wer eine
// der Farben spaeter aufhellt, faellt hier auf, nicht erst im Browser.
//
// Der Browser-Lauf (tools/kontrast.cjs tastenhell) prueft dasselbe an der
// echten Oberflaeche und meldet 0 theme-eigene Stellen; dieser Test ist die
// schnelle Absicherung davor.

import { describe, it, expect, beforeEach } from "vitest";
import { setActiveTheme, isLightTheme, gefahrText, blasserAkzent } from "../src/theme/activeTheme.js";
import { THEMES } from "../src/theme/themes.js";

const rgb = (h) => {
  const m = String(h).match(/rgba?\(([^)]+)\)/);
  if (m) {
    const t = m[1].split(",").map(v => parseFloat(v));
    return [t[0], t[1], t[2], t.length > 3 ? t[3] : 1];
  }
  let x = String(h).replace("#", "");
  if (x.length === 3) x = x.split("").map(c => c + c).join("");
  return [...[0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)), 1];
};
// Deckt eine (evtl. halbtransparente) Farbe ueber ihren Untergrund — genau das
// tut der Browser, und nur so ist der Kontrast von txt2/lbl ueberhaupt messbar.
const ueber = (farbe, grund) => {
  const [r, g, b, a] = rgb(farbe), u = rgb(grund);
  return [r * a + u[0] * (1 - a), g * a + u[1] * (1 - a), b * a + u[2] * (1 - a)];
};
const lum = (c) => {
  const s = (Array.isArray(c) ? c : rgb(c).slice(0, 3)).map(v => {
    v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const kontrast = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
// Saettigung im HSL-Sinn — fuer die Regel "vorgemerkt ist blass" (§4.4).
const saettigung = (c) => {
  const [r, g, b] = rgb(c).slice(0, 3).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (l > 0.5 ? 2 - max - min : max + min);
};

const t = THEMES.tastenhell;
// Alle Flaechen, auf denen Text und Akzente liegen koennen. Die dunkelste
// darunter ist die strengste — bei einem hellen Theme ist das die dunklere
// Haelfte des Hero-Verlaufs.
const FLAECHEN = [t.bg, t.surf, t.surf2, t.surf3, t.cat_bg, "#C8C8C0", "#D4D4CC"];

describe("Theme Tastenhell", () => {
  it("gilt als helles Theme", () => {
    expect(isLightTheme("tastenhell")).toBe(true);
  });

  it("hat hellgraue Tasten auf hellerer Platte", () => {
    // Die Karten sind hier DUNKLER als der Hintergrund (Taste auf Platte) —
    // umgekehrt zu jedem anderen hellen Theme. Das ist Absicht, aber es muss
    // sichtbar bleiben.
    expect(lum(t.surf)).toBeLessThan(lum(t.bg));
    expect(kontrast(t.bg, t.surf)).toBeGreaterThan(1.3);
    // surf2/surf3 (Dialoge) sind HELLER als die Taste: die dunkelste
    // Kartenflaeche soll die Taste selbst sein, weil sie bestimmt, wie hell
    // ein Akzent hoechstens sein darf.
    expect(lum(t.surf2)).toBeGreaterThan(lum(t.surf));
    expect(lum(t.surf3)).toBeGreaterThan(lum(t.surf));
  });

  it("traegt Text auf jeder Flaeche (>= 4,5:1)", () => {
    const schwach = [];
    FLAECHEN.forEach(f => {
      ["txt", "txt2", "lbl"].forEach(k => {
        const kk = kontrast(ueber(t[k], f), f);
        if (kk < 4.5) schwach.push(`${k} auf ${f} = ${kk.toFixed(2)}`);
      });
    });
    expect(schwach).toEqual([]);
  });

  it("traegt JEDEN Akzent auf jeder Flaeche (>= 4,5:1)", () => {
    // 4,5 statt der 3:1 fuer Symbole: die Akzente sind hier vor allem
    // BETRAEGE, und die sind kleiner Text.
    const akzente = ["blue", "pos", "neg", "gold", "mid", "cf", "err",
      "cond_neg", "neg_aktuell", "neg_vm", "cond_pos", "pos_aktuell", "pos_vm",
      "warn", "warn_bold", "warn_icon", "override"];
    const schwach = [];
    akzente.forEach(k => {
      FLAECHEN.forEach(f => {
        const kk = kontrast(t[k], f);
        if (kk < 4.5) schwach.push(`${k} (${t[k]}) auf ${f} = ${kk.toFixed(2)}`);
      });
    });
    expect(schwach).toEqual([]);
  });

  it("macht Vorgemerktes ueber die Saettigung blass, nicht ueber die Helligkeit", () => {
    // Auf hellem Grund kostet Aufhellen sofort Kontrast (§4.4). Deshalb ist
    // die VM-Variante hier entsaettigt statt aufgehellt — unterscheidbar,
    // ohne unter die Schwelle zu fallen.
    expect(saettigung(t.neg_vm)).toBeLessThan(saettigung(t.neg) - 0.3);
    expect(saettigung(t.pos_vm)).toBeLessThan(saettigung(t.pos) - 0.3);
    expect(kontrast(t.neg, t.neg_vm)).toBeGreaterThan(1.25);
    expect(kontrast(t.pos, t.pos_vm)).toBeGreaterThan(1.25);
  });

  it("gibt Hero und Symbolzeile eine eigene Flaeche", () => {
    // Beide tragen Akzentfarben, sind im Markup aber keine Karten.
    expect(Object.keys(t.flaechen_extra)).toContain(".hero-flaeche");
    expect(Object.keys(t.flaechen_extra)).toContain(".symbolzeile");
    // Dunkle Fuge — spiegelbildlich zu Keyboard, wo die helle Platte sie bildet.
    expect(t.card_shadow).toContain("rgba(40,40,36");
  });
});

describe("Blasser Akzent (blasserAkzent)", () => {
  beforeEach(() => setActiveTheme("dark", THEMES.dark));

  it("hellt auf dunklen Themes deutlich auf", () => {
    const blass = blasserAkzent();
    expect(lum(blass)).toBeGreaterThan(lum(THEMES.dark.blue));
    expect(kontrast(blass, THEMES.dark.bg)).toBeGreaterThan(3);
  });

  it("bleibt auf hellen Themes ueber der Schwelle", () => {
    // Vorher stand hier fest lightenHex(T.blue, 0.35) — auf hellem Grund
    // genau falsch herum: die Prognose-Betraege landeten bei 2,1:1.
    setActiveTheme("tastenhell", THEMES.tastenhell);
    const blass = blasserAkzent();
    // Sichtbar blasser als der volle Akzent …
    expect(lum(blass)).toBeGreaterThan(lum(THEMES.tastenhell.blue));
    // … aber die Prognose ist grosser Text (Schwelle 3:1) und der Wert dient
    // zugleich als Kachelflaeche unter weisser Schrift (Schwelle 4,5:1).
    expect(kontrast(blass, "#C8C8C0")).toBeGreaterThanOrEqual(3);
    expect(kontrast(blass, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Gefahr-Rot als Text auf hellen Themes", () => {
  it("traegt auf jeder hellen Kartenflaeche (>= 4,5:1)", () => {
    // Das satte GEFAHR (#D93025) reicht nur gegen reines Weiss; auf den
    // hellgrauen Tasten von Tastenhell waren es 3,0:1 (Kontrast-Lauf).
    const schwach = [];
    Object.entries(THEMES).forEach(([name, th]) => {
      if (name === "custom_preview" || !isLightTheme(name)) return;
      setActiveTheme(name, th);
      const farbe = gefahrText();
      ["#F5F7F2", th.surf, th.surf2, th.bg].filter(Boolean).forEach(f => {
        const kk = kontrast(farbe, f);
        if (kk < 4.5) schwach.push(`${name}: ${farbe} auf ${f} = ${kk.toFixed(2)}`);
      });
    });
    expect(schwach).toEqual([]);
  });
});
