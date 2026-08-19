// Selbstgetönte Flächen, die auf einer KARTE liegen — nicht auf der Platte.
//
// `aufToenung` rechnet den getönten Untergrund zusammen und wählt die Schrift
// danach. Der Untergrund war aber bis hierher immer `T.bg`, der
// Seitenhintergrund. Zwei Stellen liegen nachweislich woanders:
//
//   • Sync-Hinweis im Hero → auf der Hero-Karte
//   • Pille im Cloud-Dialog → auf der Dialogfläche (T.surf)
//
// In Themes mit heller Platte und dunklen Karten („Tastenhell") kippt das die
// Entscheidung ins Gegenteil: gerechnet gegen die helle Platte fällt die Wahl
// auf DUNKLE Schrift, gemalt wird sie aber auf eine dunkle Karte. Gemessen
// 3,03:1 statt 5,98:1 (Nutzer-Bild).
//
// Dazu kam eine stille Falle: `flaechen_extra[".hero-flaeche"]` ist in diesem
// Theme ein VERLAUF. Die alte Prüfung verlangte `karte[0] === "#"` und warf
// ihn deshalb wortlos weg — der Aufrufer bekam nie zu sehen, dass seine
// Angabe ignoriert wurde.

import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme } from "../src/theme/activeTheme.js";
import { aufToenung, toenungsGruende, flaecheVon, kontrastWert } from "../src/theme/amtPill.js";

const ANTEIL = 0x22 / 255;

describe("Tönung auf einer Karte", () => {
  it("ein Verlauf wird nicht mehr verworfen", () => {
    const t = THEMES.tastenhell;
    setActiveTheme("tastenhell", t);
    const verlauf = t.flaechen_extra?.[".hero-flaeche"];
    expect(verlauf, "Voraussetzung: das Theme gibt dem Hero einen Verlauf").toMatch(/gradient/);

    // Beide Enden des Verlaufs kommen an, nicht nur eines — und keinesfalls
    // ersatzweise der Seitenhintergrund. Wichtig: als FLAECHE, auf der etwas
    // liegt. Als `klasse` hiesse es „ich BIN diese Karte", dann malte das
    // Theme seine Farbe ueber die Toenung und sie waere gar nicht sichtbar.
    const gruende = toenungsGruende(t.gold, ANTEIL, undefined, flaecheVon(".hero-flaeche"));
    expect(gruende.length).toBe(2);
    const ohneAngabe = toenungsGruende(t.gold, ANTEIL);
    expect(gruende).not.toEqual(ohneAngabe);
  });

  it("die Schrift trägt auf JEDEM Ende des Verlaufs — in jedem Theme", () => {
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg) continue;
      setActiveTheme(name, t);
      for (const rolle of ["gold", "pos", "neg", "blue"]) {
        const ton = t[rolle];
        if (!ton || !/^#/.test(ton)) continue;
        const schrift = aufToenung(ton, ANTEIL, undefined, 4.5, flaecheVon(".hero-flaeche"));
        for (const grund of toenungsGruende(ton, ANTEIL, undefined, flaecheVon(".hero-flaeche"))) {
          const wert = kontrastWert(schrift, grund);
          if (wert < 4.5) durchgefallen.push(`${name}/${rolle} auf ${grund}: ${wert.toFixed(2)}:1`);
        }
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("auf T.surf gerechnet — die Pille im Cloud-Dialog", () => {
    const durchgefallen = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.surf) continue;
      setActiveTheme(name, t);
      const anteil = 0x1A / 255;
      for (const rolle of ["gold", "pos", "neg", "txt2"]) {
        const ton = t[rolle];
        if (!ton || !/^#/.test(ton)) continue;
        const schrift = aufToenung(ton, anteil, undefined, 4.5, t.surf);
        const grund = toenungsGruende(ton, anteil, undefined, t.surf)[0];
        const wert = kontrastWert(schrift, grund);
        if (wert < 4.5) durchgefallen.push(`${name}/${rolle}: ${wert.toFixed(2)}:1`);
      }
    }
    expect(durchgefallen, `zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
  });

  it("belegt den gemeldeten Fall: gegen die Platte gerechnet fällt es durch", () => {
    const t = THEMES.tastenhell;
    setActiveTheme("tastenhell", t);
    // So rechnete die App vorher: gegen T.bg.
    const falsch = aufToenung(t.gold, ANTEIL);
    // So liegt es wirklich: auf der dunklen Hero-Karte.
    const echterGrund = toenungsGruende(t.gold, ANTEIL, undefined, flaecheVon(".hero-flaeche"))[0];
    expect(kontrastWert(falsch, echterGrund)).toBeLessThan(4.5);

    // Mit der Angabe stimmt es.
    const richtig = aufToenung(t.gold, ANTEIL, undefined, 4.5, flaecheVon(".hero-flaeche"));
    expect(kontrastWert(richtig, echterGrund)).toBeGreaterThanOrEqual(4.5);
  });
});
