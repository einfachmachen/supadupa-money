// Die neun Schritte von „Bank verbinden" (EnableBankingWizard).
//
// Derselbe Bauplan wie der Cloud-Assistent und deshalb dieselben Schwächen:
// farbige Schrift und Symbole nahmen den Tonwert des Themes, ohne zu prüfen,
// ob er auf DIESEM Untergrund trägt. Hier kommt eine vierte Sorte dazu, die
// es drüben nicht gibt — die Vorschauliste (Betrag, Status, „nicht
// zugeordnet") steht direkt auf der Platte.
//
// Zwei Dinge, die dieser Test zusätzlich festhält:
//
//   * Die Eingabefelder standen auf `T.bg` — auf GENAU der Farbe der Seite
//     dahinter. Sichtbar blieb nur ein 1px-Rahmen. Ein Feld muss sich von
//     seiner Umgebung absetzen, sonst erkennt man es nicht als Feld
//     (Nutzer-Hinweis). Geprüft wird der Abstand Feld ↔ Seite.
//   * Der gesperrte `ActionBtn` hatte `opacity: 0.5`. Halbe Deckkraft
//     halbiert den Kontrast — derselbe Fehler wie beim „Premium
//     freischalten"-Knopf.

import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme, accWert, flaecheAbgesetzt } from "../src/theme/activeTheme.js";
import { schriftAuf, toenungsGrund, knopfPaar, vollKnopf, kontrastWert } from "../src/theme/amtPill.js";

// Genau die Helfer aus EnableBankingWizard.jsx.
const KASTEN_TON = 0x18 / 255;
let _t = null;
const aufPlatte   = (rolle, schwelle = 4.5) => schriftAuf(_t.bg, accWert(rolle), schwelle);
const kastenGrund = (ton) => toenungsGrund(ton, KASTEN_TON, ".hinweis-karte");
const imKasten    = (ton, wunsch, schwelle = 4.5) => schriftAuf(kastenGrund(ton), wunsch, schwelle);
const zeilenGrund = () => toenungsGrund("#FFFFFF", 0.03, ".wahl-taste");
const inZeile     = (wunsch, schwelle = 4.5) => schriftAuf(zeilenGrund(), wunsch, schwelle);

// [Beschreibung, Akzent-Rolle, Schwelle]
const AUF_PLATTE = [
  ["Fortschrittspunkt (erledigt)",        "acc_gold", 3],
  ["Konto nicht zugeordnet (Text)",       "acc_gold", 4.5],
  ["Konto nicht zugeordnet (Symbol)",     "acc_gold", 3],
  ["Betrag Ausgabe in der Vorschau",      "acc_neg",  4.5],
  ["Betrag Einnahme in der Vorschau",     "acc_pos",  4.5],
  ["Status aehnlich in der Vorschau",     "acc_gold", 4.5],
  ["entfernen (Text)",                    "acc_neg",  4.5],
  ["entfernen (Symbol)",                  "acc_neg",  3],
  ["Tag auf alle anwenden (Symbol)",      "acc",      3],
];

// [Beschreibung, Ton des Kastens, Wunschfarbe darin, Schwelle]
const IM_KASTEN = [
  ["Haken im Status-Streifen",         "pos",  "pos",  3],
  ["Haken in Zugang-eingerichtet",     "pos",  "pos",  3],
  ["Konten-zuordnen-Knopf im Kasten",  "pos",  "gold", 4.5],
];

const themen = () => Object.entries(THEMES).filter(([n, t]) => n !== "custom_preview" && t && t.bg);

describe("Bank-Assistent: Kontrast über alle neun Schritte", () => {
  it("farbige Schrift und Symbole tragen auf der Platte — in jedem Theme", () => {
    const durchgefallen = [];
    for (const [name, t] of themen()) {
      setActiveTheme(name, t); _t = t;
      for (const [was, rolle, schwelle] of AUF_PLATTE) {
        const wert = kontrastWert(aufPlatte(rolle, schwelle), t.bg);
        if (wert < schwelle) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1 (soll ${schwelle})`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("farbige Schrift und Symbole tragen im Hinweiskasten — in jedem Theme", () => {
    const durchgefallen = [];
    for (const [name, t] of themen()) {
      setActiveTheme(name, t); _t = t;
      for (const [was, tonKey, wunschKey, schwelle] of IM_KASTEN) {
        const ton = t[tonKey], wunsch = t[wunschKey];
        if (!ton || !/^#/.test(ton) || !wunsch || !/^#/.test(wunsch)) continue;
        const wert = kontrastWert(imKasten(ton, wunsch, schwelle), kastenGrund(ton));
        if (wert < schwelle) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1 (soll ${schwelle})`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("die vollflächigen Knöpfe tragen ihre Beschriftung — auch der gesperrte", () => {
    const durchgefallen = [];
    for (const [name, t] of themen()) {
      setActiveTheme(name, t); _t = t;
      // Aktiv: Gold (Standard), Grün (Import ausführen), Blau (Diagnose kopieren)
      for (const rolle of ["gold", "pos", "blue"]) {
        const flaeche = t[rolle];
        if (!flaeche || !/^#/.test(flaeche)) continue;
        const { grund, schrift } = knopfPaar(flaeche, t.on_accent);
        const wert = kontrastWert(schrift, grund);
        if (wert < 4.5) durchgefallen.push(`${name} · Knopf ${rolle}: ${wert.toFixed(2)}:1`);
      }
      // Gesperrt: T.disabled statt opacity 0.5. Ein gesperrter Knopf ist nach
      // WCAG ausgenommen, lesbar sein soll er trotzdem — deshalb 4,5:1.
      if (t.disabled && /^#/.test(t.disabled)) {
        const wert = kontrastWert(schriftAuf(t.disabled), t.disabled);
        if (wert < 4.5) durchgefallen.push(`${name} · gesperrter Knopf: ${wert.toFixed(2)}:1`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("Verbundene Banken: Symbol und entfernen tragen auf der ZEILE", () => {
    // Der Fehler, den dieser Fall festhält: Die Zeile trägt einen blassen
    // Weiß-Schleier, aber Themes mit gegensätzlichen Flächen malen sie als
    // dunkle Taste. Der erste Anlauf rechnete gegen die HELLE Platte und
    // wählte deshalb eine dunkle Farbe — die dann auf der dunklen Taste
    // stand (Nutzer-Bild, Schritt 6). Hier zählt der Untergrund der Zeile.
    const durchgefallen = [];
    for (const [name, t] of themen()) {
      setActiveTheme(name, t); _t = t;
      for (const [was, ton, schwelle] of [
        ["Bank-Symbol", t.gold, 3], ["entfernen (Text)", t.neg, 4.5], ["entfernen (Symbol)", t.neg, 3],
      ]) {
        if (!ton || !/^#/.test(ton)) continue;
        const wert = kontrastWert(inZeile(ton, schwelle), zeilenGrund());
        if (wert < schwelle) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1 (soll ${schwelle})`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("belegt den gemeldeten Fall: gegen die Platte gerechnet geht es schief", () => {
    // In „Tastenhell" ist die Zeile eine DUNKLE Taste auf HELLER Platte. Die
    // Rechnung gegen die Platte liefert eine Farbe, die auf der Taste
    // durchfällt — genau das war im Bild zu sehen.
    setActiveTheme("tastenhell", THEMES.tastenhell); _t = THEMES.tastenhell;
    const falsch = schriftAuf(THEMES.tastenhell.bg, accWert("acc_neg"));
    expect(kontrastWert(falsch, zeilenGrund())).toBeLessThan(4.5);
    expect(kontrastWert(inZeile(THEMES.tastenhell.neg), zeilenGrund())).toBeGreaterThanOrEqual(4.5);
  });

  it("Ziffernscheibe und Link-Knopf sind als solche erkennbar", () => {
    // Beide waren blasse Tönungen der Akzentfarbe (13 % bzw. 8 %): gemessen
    // 1,05:1 und 1,03:1 gegen die Platte — als Scheibe bzw. Schaltfläche
    // schlicht nicht vorhanden (Nutzer-Bild).
    //
    // Ein Knopf braucht ZWEI Kontraste, und die sind unabhängig voneinander:
    // die Beschriftung muss auf der Fläche tragen (4,5:1), und der Knopf muss
    // sich als Knopf abheben (3:1 nach WCAG 1.4.11). Das Zweite kann die
    // Füllung nicht immer leisten — Gold auf der cremefarbenen Platte von
    // „Tastenhell" kommt auf 1,18:1, obwohl die Ziffer darauf 14,8:1 hat.
    // Dann trägt die KANTE die Abgrenzung (`vollKnopf`).
    const durchgefallen = [];
    for (const [name, t] of themen()) {
      setActiveTheme(name, t); _t = t;
      for (const ton of [t.gold, t.pos, t.blue, t.cf]) {
        if (!ton || !/^#/.test(ton)) continue;
        const { grund, schrift, kante } = vollKnopf(ton, t.on_accent);
        const abgrenzung = kante ? kontrastWert(kante, t.bg) : kontrastWert(grund, t.bg);
        if (abgrenzung < 3) durchgefallen.push(`${name} · ${ton} Abgrenzung: ${abgrenzung.toFixed(2)}:1`);
        const beschriftung = kontrastWert(schrift, grund);
        if (beschriftung < 4.5) durchgefallen.push(`${name} · ${ton} Beschriftung: ${beschriftung.toFixed(2)}:1`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("belegt den Kanten-Fall: die Fuellung allein reicht nicht", () => {
    // Ohne Kante faellt das Gold auf der hellen Platte durch — der Beleg,
    // dass `knopfKante` hier wirklich etwas tut und nicht nur mitlaeuft.
    setActiveTheme("tastenhell", THEMES.tastenhell); _t = THEMES.tastenhell;
    const { grund, kante } = vollKnopf(THEMES.tastenhell.gold, THEMES.tastenhell.on_accent);
    expect(kontrastWert(grund, THEMES.tastenhell.bg)).toBeLessThan(3);
    expect(kante, "es haette eine Kante geben muessen").toBeTruthy();
    expect(kontrastWert(kante, THEMES.tastenhell.bg)).toBeGreaterThanOrEqual(3);
  });

  it("Eingabefelder setzen sich von der Seite ab — in jedem Theme", () => {
    // Sie standen auf `T.bg`, also 1,00:1 zur Umgebung. 1,42:1 ist die
    // Schwelle, ab der die App eine Fläche als abgesetzt gelten lässt
    // (MIN_KONTRAST in activeTheme.js) — dieselbe Zahl wie bei den
    // Budget-Karten, damit die App EINEN Begriff von „abgesetzt" hat.
    const durchgefallen = [];
    for (const [name, t] of themen()) {
      setActiveTheme(name, t); _t = t;
      const feld = flaecheAbgesetzt();
      const wert = kontrastWert(feld, t.bg);
      if (wert < 1.42) durchgefallen.push(`${name}: ${wert.toFixed(2)}:1 (soll >= 1,42)`);
      // Und die Schrift muss darauf tragen.
      const schrift = kontrastWert(schriftAuf(feld, t.txt_card ? null : t.txt), feld);
      if (schrift < 4.5) durchgefallen.push(`${name} · Feldschrift: ${schrift.toFixed(2)}:1`);
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });
});
