// Die zwei Wahlkarten im Export-Reiter des Daten-Managers.
//
// „Export verschlüsseln" tönt sich blau, „Bank-Schlüssel" gold — jeweils mit
// `${ton}10` über der Dialogfläche (der Dialog malt T.bg). Symbol und
// Warnschrift darauf trugen den ROHTON. Auf hellem Theme war der Schlüssel
// dadurch kaum zu sehen (Nutzer-Bild).
//
// Warum das der bestehende Wächter NICHT gefangen hat: `selbstgetoenteFlaechen`
// sucht nach `background: ${X}NN` UND `color: X` INNERHALB desselben
// style-Blocks. Die Symbolfarbe steht hier aber als ARGUMENT — `Li("key", 13,
// T.gold)` —, nicht als CSS-Eigenschaft. Diese Bauform bleibt dort unsichtbar,
// deshalb rechnet dieser Test die betroffenen Stellen direkt nach.

import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme } from "../src/theme/activeTheme.js";
import { toenungsGruende, schriftAuf, kontrastWert } from "../src/theme/amtPill.js";

// Genau die Rechnung aus DataManagerDialog.jsx — inklusive der Klasse.
//
// Die Klasse ist hier der Kern: Themes wie „Tastenhell" erklaeren
// `.wahl-taste` zur Taste und malen deren Farbe mit `!important` ueber die
// Toenung (gemessen #525252 statt eines Blauschleiers auf heller Platte).
// Ein erster Anlauf rechnete ohne die Klasse gegen die Toenung und waehlte
// dadurch DUNKLE Schrift auf einer DUNKLEN Taste — schlimmer als vorher.
const ANTEIL = 0x10 / 255;
const kartenGrund = (ton) => toenungsGruende(ton, ANTEIL, ".wahl-taste")[0];
const aufKarte = (ton, wunsch, schwelle) => schriftAuf(kartenGrund(ton), wunsch, schwelle);

// [Beschreibung, Toenung der Karte, Wunschfarbe, Schwelle]
// Symbole 3:1 (WCAG 1.4.11), Text 4,5:1.
const STELLEN = [
  ["Schloss auf blauer Karte",        "blue", "blue", 3],
  ["Schild auf blauer Karte",         "blue", "blue", 3],
  ["Warnschrift gold auf blauer Karte","blue", "gold", 4.5],
  ["Schluessel auf goldener Karte",   "gold", "gold", 3],
  ["Schild auf goldener Karte",       "gold", "gold", 3],
  ["Warnschrift auf goldener Karte",  "gold", "gold", 4.5],
  // Der Uebereinstimmungs-Hinweis unter den Passphrase-Feldern.
  ["Passphrasen stimmen (blau)",      "blue", "pos",  4.5],
  ["Passphrasen stimmen nicht (blau)","blue", "neg",  4.5],
  ["Passphrasen stimmen (gold)",      "gold", "pos",  4.5],
  ["Passphrasen stimmen nicht (gold)","gold", "neg",  4.5],
];

describe("Daten-Manager: getönte Wahlkarten", () => {
  it("Symbole und Schrift tragen auf der Tönung — in jedem Theme", () => {
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg) continue;
      setActiveTheme(name, t);
      for (const [was, tonKey, wunschKey, schwelle] of STELLEN) {
        const ton = t[tonKey], wunsch = t[wunschKey];
        if (!ton || !/^#/.test(ton) || !wunsch || !/^#/.test(wunsch)) continue;
        const farbe = aufKarte(ton, wunsch, schwelle);
        const wert = kontrastWert(farbe, kartenGrund(ton));
        if (wert < schwelle) durchgefallen.push(`${name} · ${was}: ${wert.toFixed(2)}:1 (soll ${schwelle})`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("belegt den gemeldeten Fall: der Rohton allein reicht nicht", () => {
    // Ohne die Rechnung faellt der Schluessel in mehreren Themes durch — das
    // ist der Beleg, dass der Helfer hier wirklich etwas tut.
    const rohDurchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.gold || !/^#/.test(t.gold)) continue;
      setActiveTheme(name, t);
      if (kontrastWert(t.gold, kartenGrund(t.gold)) < 3) rohDurchgefallen.push(name);
    }
    expect(rohDurchgefallen.length, "erwartet: der Rohton faellt mehrfach durch")
      .toBeGreaterThan(0);
  });
});
