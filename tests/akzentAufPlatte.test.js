// Akzentfarbe für Text auf gegensätzlichen Untergründen.
//
// Anlass: In Themes mit heller Platte und dunklen Karten (Tastenhell) liegen
// die beiden Untergründe auf gegenüberliegenden Seiten der Helligkeit. Das
// geerbte Lime #C8DC2E trägt auf der Taste #525252 sauber (5,11:1), auf der
// Platte #ECECE4 aber nur mit 1,29:1 — dort war der Text faktisch unsichtbar.
// Ein EINZELNER Akzentton kann beides grundsätzlich nicht bedienen.
//
// Deshalb gibt es `acc` (Platte) und `acc_card` (Karte), die über dieselbe
// CSS-Variablen-Mechanik laufen wie txt/txt_card. Dieser Test hält beide
// Werte auf Kurs — und stellt sicher, dass Themes ohne diese Angabe
// unverändert bleiben.
import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { theme as T, setActiveTheme } from "../src/theme/activeTheme.js";

function leuchtdichte(hex) {
  const h = String(hex).replace("#", "");
  const teile = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * teile[0] + 0.7152 * teile[1] + 0.0722 * teile[2];
}
function kontrast(a, b) {
  const l1 = leuchtdichte(a), l2 = leuchtdichte(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe("Akzent-Text auf Platte und Karte", () => {
  it("Tastenhell: acc traegt auf der Platte, acc_card auf der Taste", () => {
    const t = THEMES.tastenhell;
    expect(t.acc, "acc fehlt").toBeTruthy();
    expect(t.acc_card, "acc_card fehlt").toBeTruthy();

    const aufPlatte = kontrast(t.acc, t.bg);
    const aufTaste = kontrast(t.acc_card, t.surf);
    expect(aufPlatte, `acc ${t.acc} auf Platte ${t.bg}: ${aufPlatte.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5);
    expect(aufTaste, `acc_card ${t.acc_card} auf Taste ${t.surf}: ${aufTaste.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5);
  });

  it("Tastenhell: acc_neg traegt auf der Platte, acc_neg_card auf der Taste", () => {
    const t = THEMES.tastenhell;
    const aufPlatte = kontrast(t.acc_neg, t.bg);
    const aufTaste = kontrast(t.acc_neg_card, t.surf);
    expect(aufPlatte, `acc_neg ${t.acc_neg} auf Platte ${t.bg}: ${aufPlatte.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5);
    expect(aufTaste, `acc_neg_card ${t.acc_neg_card} auf Taste ${t.surf}: ${aufTaste.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5);
    // Auch hier: der Karten-Ton faellt auf der Platte durch — der gemeldete
    // Zustand ("alle Daten zuruecksetzen" mass 1,31:1).
    expect(kontrast(t.acc_neg_card, t.bg)).toBeLessThan(4.5);
  });

  it("Tastenhell: acc_override traegt auf Platte und Taste", () => {
    // Die Rolle kam nach: seit der Fuss der Jahrestabelle auf der
    // Tabellenflaeche liegt, stand das Amber der manuellen Ueberschreibung
    // dort mit 1,56:1. Gefunden hat es der Kontrast-Lauf, nachdem die
    // Jahresansicht Station wurde — vorher sah er die Ansicht nie.
    const t = THEMES.tastenhell;
    expect(t.acc_override, "acc_override fehlt").toBeTruthy();
    expect(t.acc_override_card, "acc_override_card fehlt").toBeTruthy();
    const aufPlatte = kontrast(t.acc_override, t.bg);
    const aufTaste = kontrast(t.acc_override_card, t.surf);
    expect(aufPlatte, `acc_override ${t.acc_override} auf Platte ${t.bg}: ${aufPlatte.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5);
    expect(aufTaste, `acc_override_card ${t.acc_override_card} auf Taste ${t.surf}: ${aufTaste.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5);
  });

  it("belegt, warum es zwei Werte braucht: ein Ton kann nicht beides", () => {
    const t = THEMES.tastenhell;
    // Der Karten-Ton auf der Platte — das war der gemeldete Zustand.
    expect(kontrast(t.acc_card, t.bg)).toBeLessThan(4.5);
    // Und der Platten-Ton auf der Karte faellt ebenso durch.
    expect(kontrast(t.acc, t.surf)).toBeLessThan(4.5);
  });

  it("T.acc liefert bei Tastenhell die umschaltbare Variable", () => {
    setActiveTheme("tastenhell");
    expect(String(T.acc)).toContain("var(--acc");
    // Der Rueckfallwert in der Variable ist der Platten-Ton: kaeme sie
    // nirgends an, stuende dort die auf der Platte lesbare Farbe.
    expect(String(T.acc)).toContain(THEMES.tastenhell.acc);
  });

  it("Themes ohne getrennte Karten-Textfarben bleiben unveraendert", () => {
    const ohne = Object.entries(THEMES).find(([k, v]) => v && v.name && !v.txt_card && v.blue);
    expect(ohne, "kein Theme ohne txt_card gefunden").toBeTruthy();
    const [key, wert] = ohne;
    setActiveTheme(key);
    // Kein var(), sondern schlicht die bisherige Akzentfarbe.
    expect(T.acc).toBe(wert.blue);
  });
});
