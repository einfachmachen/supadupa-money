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
import { schriftAuf, toenungsGrund, knopfPaar, kontrastWert } from "../src/theme/amtPill.js";

// Genau die Helfer aus EnableBankingWizard.jsx.
const KASTEN_TON = 0x18 / 255;
let _t = null;
const aufPlatte   = (rolle, schwelle = 4.5) => schriftAuf(_t.bg, accWert(rolle), schwelle);
const kastenGrund = (ton) => toenungsGrund(ton, KASTEN_TON, ".hinweis-karte");
const imKasten    = (ton, wunsch, schwelle = 4.5) => schriftAuf(kastenGrund(ton), wunsch, schwelle);

// [Beschreibung, Akzent-Rolle, Schwelle]
const AUF_PLATTE = [
  ["Fortschrittspunkt (erledigt)",        "acc_gold", 3],
  ["Bank-Symbol in der Sitzungsliste",    "acc_gold", 3],
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
