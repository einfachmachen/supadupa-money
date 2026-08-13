// Theme "Tastenhell" — die Tastatur aus dem CachyOS-Installationsprogramm:
// helle Platte, DUNKLE Tasten, weisse Hauptbeschriftung, gelbgruene
// Zweitbelegung.
//
// Es ist das erste ausgelieferte Theme mit gegensaetzlichen Flaechen und
// damit der erste Nutzer des Zwei-Textfarben-Mechanismus (§4.7). Dieser Test
// haelt die drei Bedingungen fest, ohne die es sofort auseinanderfaellt:
//
//   1. `hell:false` — fast jede Abfrage von isLightTheme() betrifft eine
//      Karte, einen Dialog oder ein Eingabefeld, und die sind hier dunkel.
//   2. Weisser Text traegt auf den Tasten, dunkler auf der Platte.
//   3. Jede Flaeche, die Akzentfarben zeigt, ist eine Taste — die Akzente
//      lassen sich nicht flaechenabhaengig machen (Hex-Alpha, §4.7).
//
// Der Browser-Lauf (`npm run kontrast tastenhell`) prueft dasselbe an der
// echten Oberflaeche und meldet 0 theme-eigene Stellen.

import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { setActiveTheme, isLightTheme, kartenTextRegel, wurzelTextVars, hatKartenText,
  blasserAkzent } from "../src/theme/activeTheme.js";
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

const t = THEMES.tastenhell;
// Die Tasten samt beider Stufen des Hero-Verlaufs. Der Verlauf zaehlt mit:
// seine dunkle Haelfte ist die strengste Flaeche fuer weissen Text, seine
// helle die strengste fuer die Akzente.
const TASTEN = [t.surf, t.surf2, t.surf3, t.cat_bg,
  ...(String(t.hero_bg).match(/#[0-9a-fA-F]{6}/g) || [])];

describe("Theme Tastenhell", () => {
  beforeEach(() => setActiveTheme("tastenhell", t));

  it("gilt trotz heller Platte als DUNKLES Theme", () => {
    // Der Hintergrund ist hell — die Karten sind es nicht, und fast jede
    // Abfrage von isLightTheme() betrifft eine Karte. Ohne `hell:false`
    // entschiede das Sicherheitsnetz nach der Helligkeit von `bg` und legte
    // helle Dialoge und helle Eingabefelder in ein dunkles Theme.
    expect(t.hell).toBe(false);
    expect(isLightTheme("tastenhell")).toBe(false);
    expect(lum(t.bg)).toBeGreaterThan(0.5);
    expect(lum(t.surf)).toBeLessThan(0.15);
  });

  it("faerbt Platte und Tasten gegensaetzlich", () => {
    expect(hatKartenText()).toBe(true);
    // Dunkler Text auf der Platte …
    expect(kontrast(ueber(t.txt, t.bg), t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(kontrast(ueber(t.txt2, t.bg), t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(kontrast(ueber(t.lbl, t.bg), t.bg)).toBeGreaterThanOrEqual(4.5);
    // … weisser auf den Tasten.
    TASTEN.forEach(f => {
      [t.txt_card, t.txt2_card, t.lbl_card].forEach(c => {
        expect(kontrast(ueber(c, f), f)).toBeGreaterThanOrEqual(4.5);
      });
    });
    expect(wurzelTextVars()["--txt"]).toBe(t.txt);
    expect(kartenTextRegel()).toContain(`--txt:${t.txt_card}`);
  });

  it("traegt jeden Akzent auf den Tasten (>= 4,5:1)", () => {
    const akzente = ["blue", "pos", "neg", "gold", "mid", "cf",
      "cond_neg", "neg_aktuell", "neg_vm", "cond_pos", "pos_aktuell", "pos_vm"];
    const schwach = [];
    akzente.forEach(k => TASTEN.forEach(f => {
      const kk = kontrast(t[k], f);
      if (kk < 4.5) schwach.push(`${k} (${t[k]}) auf ${f} = ${kk.toFixed(2)}`);
    }));
    expect(schwach).toEqual([]);
  });

  it("erklaert JEDE akzenttragende Flaeche zur Taste — und die Klassen gibt es wirklich", () => {
    // Der eigentliche Fallstrick: `flaechen_extra` verweist auf CSS-Klassen im
    // Markup. Wird eine davon umbenannt, faellt das im Browser als blasse
    // Symbole auf heller Platte auf — hier faellt es sofort auf.
    const wurzel = path.resolve(import.meta.dirname, "..", "src");
    const dateien = [];
    const sammeln = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) sammeln(p);
      else if (/\.jsx?$/.test(e.name)) dateien.push(fs.readFileSync(p, "utf8"));
    });
    sammeln(wurzel);
    const quelltext = dateien.join("\n");
    // Ein Selektor kann zusammengesetzt sein (".mobile-modal input") — geprueft
    // wird jede darin genannte KLASSE.
    const klassen = [...new Set(Object.keys(t.flaechen_extra)
      .flatMap(sel => (sel.match(/\.[a-z0-9-]+/g) || []))
      .map(k => k.slice(1)))];
    const fehlend = klassen.filter(k => !quelltext.includes(`"${k}"`));
    expect(fehlend).toEqual([]);
    // Hero, Symbolzeile, Aufriss-Blatt, Daten-Menuezeilen, Reiter, Felder.
    expect(Object.keys(t.flaechen_extra).length).toBeGreaterThanOrEqual(5);
    // Die Dialoge selbst sind KEINE Taste mehr: sie zeigen die Platte, dunkel
    // sind nur ihre Felder (Nutzer-Wunsch "leicht und luftig").
    expect(Object.keys(t.flaechen_extra)).not.toContain(".mobile-modal");
    expect(Object.keys(t.flaechen_extra)).not.toContain(".formular-blatt");
  });

  it("setzt die zusaetzlichen Flaechen gegen Inline-Styles durch", () => {
    // Die bildschirmfuellenden Blaetter malen ihre Flaeche inline
    // (`style={{background:T.bg}}`) — ein Stylesheet verliert dagegen ohne
    // `!important`, und genau daran fiel der erste Versuch durch.
    const regel = kartenTextRegel();
    // Ein Selektor darf inzwischen Sonderzeichen enthalten (Attribut-Selektoren
    // fuer den blassen Weiss-Schleier), deshalb wird er fuer die Suche
    // maskiert statt eingesetzt.
    const maskiert = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    Object.keys(t.flaechen_extra).forEach(sel => {
      expect(regel).toMatch(new RegExp(`${maskiert(sel)}\\{background:[^;]+ !important`));
    });
  });

  it("blasserAkzent hellt hier auf — wie in jedem dunklen Theme", () => {
    const blass = blasserAkzent();
    expect(lum(blass)).toBeGreaterThan(lum(t.blue));
    TASTEN.forEach(f => expect(kontrast(blass, f)).toBeGreaterThanOrEqual(4.5));
  });
});
