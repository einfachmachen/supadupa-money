// schriftAuf(): Schriftfarbe nach WCAG statt nach Helligkeitsklasse.
//
// Anlass waren die Tortenbeschriftungen. Sie standen fest auf "#fff" und lagen
// damit auf jedem hellen Kategorieton (Lachs, Hellblau, Pastellgruen)
// praktisch unsichtbar (Nutzer-Bild). Der naheliegende Griff zu `readableOn`
// half nur halb: dessen YIQ-Schwelle (150) haelt ein mittleres Rot fuer
// "dunkel" und laesst die Schrift weiss — gemessen 3,17:1.
//
// Dieselbe Funktion entscheidet jetzt auch ueber die Schrift auf den
// gefuellten Akzent-Pillen ("Eigene", "Pegel", "Balken"/"Torte"): dort stand
// `T.on_accent`, das in hellen Themes weiss ist — auf deren Lime 3,4:1.

import { describe, it, expect } from "vitest";
import { schriftAuf, kontrastWert, mischen, HELL, DUNKEL } from "../src/theme/amtPill.js";
import { THEMES } from "../src/theme/themes.js";

describe("schriftAuf", () => {
  it("nimmt Weiss auf dunklem und Fast-Schwarz auf hellem Grund", () => {
    expect(schriftAuf("#1E1E1C")).toBe(HELL);
    expect(schriftAuf("#ECECE4")).toBe(DUNKEL);
  });

  it("entscheidet die Grenzfaelle nach der Rechnung, nicht nach der Klasse", () => {
    // Genau der gemeldete Fall: mittleres Rot. Weiss traegt hier NICHT.
    const rot = "#E06D6C";
    expect(kontrastWert(HELL, rot)).toBeLessThan(4.5);
    expect(schriftAuf(rot)).toBe(DUNKEL);
    expect(kontrastWert(DUNKEL, rot)).toBeGreaterThanOrEqual(4.5);
  });

  it("laesst den Wunschton stehen, sobald er selbst traegt", () => {
    // Kategoriefarbe im Tortenkern: sie bleibt, solange sie lesbar ist.
    expect(schriftAuf("#1E1E1C", "#FFD700")).toBe("#FFD700");
    // … und weicht, wenn nicht.
    expect(schriftAuf("#FFF6CC", "#FFD700")).toBe(DUNKEL);
  });

  it("holt auf JEDER Akzent-Pille das Beste heraus", () => {
    // Die gefuellte Pille traegt T.blue. Verlangt wird nicht "4,5:1 ueberall"
    // — das ist auf einem MITTELTON gar nicht erreichbar —, sondern dass die
    // Funktion den besseren der beiden Toene nimmt.
    // Der eigene Ton des Themes (`on_accent`) darf stehen bleiben, sobald er
    // die Schwelle schafft — er ist die bewusste Wahl des Themes. Nur wenn er
    // sie verfehlt, muss das Optimum herauskommen.
    const schlechter = [];
    Object.entries(THEMES).forEach(([name, t]) => {
      if (name === "custom_preview" || !t.blue) return;
      const k = kontrastWert(schriftAuf(t.blue, t.on_accent), t.blue);
      if (k >= 4.5) return;
      const best = Math.max(kontrastWert(HELL, t.blue), kontrastWert(DUNKEL, t.blue));
      if (k < best - 0.01) schlechter.push(`${name}: ${k.toFixed(2)} statt ${best.toFixed(2)}`);
    });
    expect(schlechter).toEqual([]);
  });

  it("nennt die Themes, deren Akzent selbst im Optimum unter 4,5:1 bleibt", () => {
    // Zwei Themes haben einen mittelhellen Akzent (Indigo bzw. Petrol): dort
    // erreicht WEDER Weiss NOCH Fast-Schwarz die Textschwelle — 4,3:1 ist das
    // Maximum. Das ist kein Fehler der Funktion, sondern eine Eigenschaft der
    // Farbe; wer das aufloesen will, muss den Akzent selbst dunkler oder
    // heller waehlen. Der Test haelt die Liste fest, damit sie nicht still
    // waechst.
    const unter = Object.entries(THEMES)
      .filter(([name, t]) => name !== "custom_preview" && t.blue)
      .filter(([, t]) => kontrastWert(schriftAuf(t.blue, t.on_accent), t.blue) < 4.5)
      .map(([name]) => name);
    expect(unter.sort()).toEqual(["obsidian", "softecotech"]);
  });
});

// mischen(): das JS-Gegenstueck zu einer Flaeche mit Hex-Alpha.
//
// Anlass war die Schieflage-Vorwarnung. Sie toent ihre Flaeche mit der
// Warnfarbe (`${T.neg}1f`) und schreibt die Ueberschrift in DERSELBEN Farbe.
// Geprueft wurde bis dahin gegen den Ton VOR der Toenung — im Theme
// "Keyboard" (Ausgaben-Cyan) ergab das rechnerisch 4,5:1, auf dem Bildschirm
// aber 3,86:1 (Kontrast-Lauf, Station "bestaetigen").
describe("mischen", () => {
  const TOENUNG = 0x1f / 255;

  it("liegt zwischen den beiden Toenen und trifft die Endpunkte", () => {
    expect(mischen("#FFFFFF", 0, "#000000")).toBe("#000000");
    expect(mischen("#FFFFFF", 1, "#000000")).toBe("#ffffff");
    expect(mischen("#FFFFFF", 0.5, "#000000")).toBe("#808080");
  });

  it("versteht rgb() und gibt bei unlesbarer Eingabe den Grund zurueck", () => {
    expect(mischen("rgb(255, 255, 255)", 1, "#000000")).toBe("#ffffff");
    expect(mischen("var(--irgendwas)", 0.5, "#123456")).toBe("#123456");
  });

  it("bildet die gemeldete Stelle nach: Cyan auf Cyan-Toenung faellt durch", () => {
    const t = THEMES.keyboard;
    const grund = mischen(t.neg, TOENUNG, t.bg);
    expect(kontrastWert(t.neg, grund)).toBeLessThan(4.5);
    // … und die Ueberschrift weicht deshalb auf Weiss aus.
    expect(schriftAuf(grund, t.neg)).toBe(HELL);
    // Ohne die Toenung mitzurechnen waere der Fehler unsichtbar geblieben.
    expect(kontrastWert(t.neg, t.bg)).toBeGreaterThan(kontrastWert(t.neg, grund));
  });

  it("laesst den Warnton stehen, wo das Theme den Kasten zur Karte erklaert", () => {
    // "Tastenhell": die Karte gewinnt per !important gegen die Toenung, also
    // ist SIE der Untergrund — und dort traegt das Cyan wieder.
    const karte = THEMES.tastenhell.flaechen_extra[".warn-karte"];
    expect(karte).toBe("#525252");
    expect(schriftAuf(karte, THEMES.tastenhell.neg)).toBe(THEMES.tastenhell.neg);
  });
});
