// Der Premium-Knopf traegt seine Beschriftung auf der VOLLEN Gold-Flaeche.
//
// Anlass: der Knopf war auf hellem Theme kaum zu lesen (Nutzer-Bild). Zwei
// Ursachen, beide nur zusammen sichtbar:
//
//   1. `T.on_accent` ist je Theme gesetzt, aber nirgends gegen `T.gold`
//      nachgerechnet — es ist die Schrift fuer DEN Akzent, nicht fuer Gold.
//   2. Der Knopf war deaktiviert, solange das Feld leer war, mit
//      opacity:0.5. Das halbiert den Kontrast noch einmal — und der leere
//      Zustand ist genau der, den jeder als Erstes sieht.
//
// Punkt 2 ist im Bauteil geloest (kein deaktivierter Zustand mehr, der leere
// Fall laeuft ueber die Fehlerzeile). Punkt 1 rechnet dieser Test fuer JEDES
// Theme nach — ein Screenshot zeigt immer nur eines.

import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme } from "../src/theme/activeTheme.js";
import { knopfPaar, kontrastWert } from "../src/theme/amtPill.js";

describe("Premium-Knopf", () => {
  it("die Beschriftung traegt auf Gold — in jedem Theme", () => {
    const durchgefallen = [];
    const ohneHelfer = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.gold || !/^#/.test(t.gold)) continue;
      setActiveTheme(name, t);

      // So, wie es das Bauteil rechnet.
      const { grund, schrift } = knopfPaar(t.gold, t.on_accent);
      const wert = kontrastWert(schrift, grund);
      if (wert < 4.5) durchgefallen.push(`${name}: ${wert.toFixed(2)}:1`);

      // Zum Vergleich: der ungeprüfte Wunschton, wie er vorher dort stand.
      if (t.on_accent && kontrastWert(t.on_accent, t.gold) < 4.5) ohneHelfer.push(name);
    }
    expect(durchgefallen, `Knopfschrift zu schwach:\n  ${durchgefallen.join("\n  ")}`).toEqual([]);
    // Beleg, dass der Helfer hier wirklich etwas tut und nicht nur Zierde ist.
    expect(ohneHelfer.length, "erwartet: on_accent faellt auf Gold mehrfach durch")
      .toBeGreaterThan(0);
  });
});
