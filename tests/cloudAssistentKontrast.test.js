// Die neun Schritte von „Cloud-Sync einrichten" (CloudSetupWizard).
//
// Gemeldet wurde Schritt 8 („Verschlüsselung"): „Passphrasen stimmen überein"
// und „Verschlüsselung aktiv" standen im ROHEN `T.pos`. Auf der hellen Platte
// von „Tastenhell" sind das 1,29:1 — der Satz war praktisch unsichtbar.
//
// Der Fehler steckte nicht in diesen zwei Zeilen allein, sondern in der
// Bauform: farbige Schrift und Symbole nehmen den Tonwert des Themes, ohne zu
// prüfen, ob er auf DIESEM Untergrund trägt. Der Assistent hat davon drei
// Sorten, und dieser Test rechnet alle drei nach:
//
//   1. direkt auf der Platte (`T.bg`) — die zwei gemeldeten Zeilen, der
//      Dashboard-Link, die Fortschrittspunkte;
//   2. in einem Hinweiskasten, der sich mit `${ton}18` selbst tönt;
//   3. auf einem vollflächigen Knopf in `T.pos`.
//
// Warum nachgerechnet und nicht abgelesen: `T.acc_pos` & Co. liefern in
// Themes mit eigenen Karten-Textfarben eine CSS-Variable. Im Browser löst sie
// sich richtig auf, in einer JS-Rechnung ergibt sie stillschweigend Unsinn —
// deshalb `accWert()`, das den Platten-Farbwert selbst herausgibt.

import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme, accWert } from "../src/theme/activeTheme.js";
import { schriftAuf, toenungsGrund, knopfPaar, aufToenung, kontrastWert }
  from "../src/theme/amtPill.js";

// Genau die Helfer aus CloudSetupWizard.jsx. Sie stehen dort lokal (sie
// beschreiben die Bauform dieses einen Bildschirms); hier bewusst noch einmal,
// damit ein Umbau dort auffällt statt still durchzurutschen.
const KASTEN_TON = 0x18 / 255;
const aufPlatte   = (rolle, schwelle = 4.5) => schriftAuf(theme_bg(), accWert(rolle), schwelle);
const kastenGrund = (ton) => toenungsGrund(ton, KASTEN_TON, ".hinweis-karte");
const imKasten    = (ton, wunsch, schwelle = 4.5) => schriftAuf(kastenGrund(ton), wunsch, schwelle);
let _t = null;
const theme_bg = () => _t.bg;

// [Beschreibung, Akzent-Rolle, Schwelle] — Text 4,5:1, Symbole 3:1 (WCAG 1.4.11)
const AUF_PLATTE = [
  ["Passphrasen stimmen ueberein (Text)",       "acc_pos",  4.5],
  ["Passphrasen stimmen ueberein (Symbol)",     "acc_pos",  3],
  ["stimmen noch nicht ueberein (Text)",        "acc_neg",  4.5],
  ["stimmen noch nicht ueberein (Symbol)",      "acc_neg",  3],
  ["Verschluesselung aktiv (Text)",             "acc_pos",  4.5],
  ["unverschluesselt (Text)",                   "acc_gold", 4.5],
  ["unverschluesselt (Symbol)",                 "acc_gold", 3],
  ["Hinweis unter Verbindung-testen",           "acc_gold", 4.5],
  ["Dashboard-Link",                            "acc",      4.5],
  ["Fortschrittspunkt (erledigt)",              "acc_cf",   3],
];

// [Beschreibung, Ton des Kastens, Wunschfarbe darin, Schwelle]
const IM_KASTEN = [
  ["Haken im Status-Streifen",             "pos",  "pos", 3],
  ["Haken in Cloud-Sync-eingerichtet",     "pos",  "pos", 3],
  ["Verbindung-testen im Info-Kasten",     "blue", "pos", 4.5],
];

describe("Cloud-Assistent: Kontrast über alle neun Schritte", () => {
  it("farbige Schrift und Symbole tragen auf der Platte — in jedem Theme", () => {
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg) continue;
      setActiveTheme(name, t); _t = t;
      for (const [was, rolle, schwelle] of AUF_PLATTE) {
        const farbe = aufPlatte(rolle, schwelle);
        const wert = kontrastWert(farbe, t.bg);
        if (wert < schwelle) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1 (soll ${schwelle})`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("farbige Schrift und Symbole tragen im Hinweiskasten — in jedem Theme", () => {
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg) continue;
      setActiveTheme(name, t); _t = t;
      for (const [was, tonKey, wunschKey, schwelle] of IM_KASTEN) {
        const ton = t[tonKey], wunsch = t[wunschKey];
        if (!ton || !/^#/.test(ton) || !wunsch || !/^#/.test(wunsch)) continue;
        const farbe = imKasten(ton, wunsch, schwelle);
        const wert = kontrastWert(farbe, kastenGrund(ton));
        if (wert < schwelle) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1 (soll ${schwelle})`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("die vollflächigen Aktionsknöpfe tragen ihre Beschriftung", () => {
    // `T.pos` = Code kopieren / Secret generieren / Daten hochladen,
    // `T.cf` = „Verbindung testen" (Schritt 9). Letzterer war vorher ein
    // 8-%-Schleier mit dünnem Rahmen und als Knopf nicht zu erkennen
    // (Nutzer-Hinweis) — jetzt vollflächig, deshalb hier mit geprüft.
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg) continue;
      setActiveTheme(name, t); _t = t;
      for (const [was, flaeche] of [["Aktion", t.pos], ["Verbindung testen", t.blue]]) {
        if (!flaeche || !/^#/.test(flaeche)) continue;
        const { grund, schrift } = knopfPaar(flaeche, t.on_accent);
        const wert = kontrastWert(schrift, grund);
        if (wert < 4.5) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("die Icon-Kachel im Kopf trägt ihr Symbol (MobileHeader)", () => {
    // Die Kachel malt `${iCol}1f` auf T.surf und setzt dasselbe Icon darauf —
    // der Untergrund ist also in Richtung des Icons verschoben. Gemessen fiel
    // das Cloudflare-Orange im iOS-Theme auf 2,51:1.
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.surf) continue;
      setActiveTheme(name, t); _t = t;
      for (const rolle of ["cf", "blue", "pos", "gold"]) {
        const iCol = t[rolle] || t.blue;
        if (!iCol || !/^#/.test(iCol)) continue;
        const farbe = aufToenung(iCol, 0x1f/255, undefined, 3, t.surf);
        const grund = toenungsGrund(iCol, 0x1f/255, undefined, t.surf);
        const wert = kontrastWert(farbe, grund);
        if (wert < 3) durchgefallen.push(`${name} · Kachel ${rolle}: ${wert.toFixed(2)}:1`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("belegt den gemeldeten Fall: der Rohton allein reicht nicht", () => {
    // Ohne die Rechnung fällt „Passphrasen stimmen überein" durch — in
    // „Tastenhell" auf 1,29:1. Das ist der Beleg, dass hier wirklich etwas
    // repariert wurde und nicht nur eine Zeile umgeschrieben.
    setActiveTheme("tastenhell", THEMES.tastenhell); _t = THEMES.tastenhell;
    expect(kontrastWert(THEMES.tastenhell.pos, THEMES.tastenhell.bg)).toBeLessThan(2);
    expect(kontrastWert(aufPlatte("acc_pos"), THEMES.tastenhell.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
