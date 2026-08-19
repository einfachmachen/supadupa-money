// Der Sync-Hinweis ist eine Ampel — überall dieselbe.
//
// Vorher trug er den jeweiligen Theme-Ton als 13-%-Tönung. Über 34 Themes
// hinweg ergab das mal Oliv, mal Senf, mal ein blasses Grün: „nicht Fisch,
// nicht Fleisch" (Nutzer-Wort). Jetzt vier feste Signalfarben, volle Fläche,
// Schrift dagegen gerechnet.
//
// Zwei Dinge hält dieser Test fest, die man beim nächsten Umbau leicht wieder
// verliert:
//   1. Die Farben sind FEST und kommen nicht aus dem Theme — sonst ist es
//      wieder 34× etwas anderes.
//   2. Jeder Zustand trägt ein eigenes Symbol. Die Aussage darf nicht allein
//      an der Farbe hängen (Rot-Grün-Sehschwäche).

import { describe, it, expect } from "vitest";
import { getSyncBadgeState, AMPEL } from "../src/utils/syncBadge.js";
import { knopfPaar, kontrastWert, DUNKEL } from "../src/theme/amtPill.js";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme } from "../src/theme/activeTheme.js";
import { STATIC_LUCIDE } from "../src/utils/lucideStatic.js";

const ZUSTAENDE = [
  ["offline",     { isOnline: false, cfActive: true,  isDirty: false, syncStatus: "idle" },        AMPEL.blau],
  ["saving",      { isOnline: true,  cfActive: true,  isDirty: false, syncStatus: "saving" },      AMPEL.gelb],
  ["saved",       { isOnline: true,  cfActive: true,  isDirty: false, syncStatus: "saved" },       AMPEL.gruen],
  ["error",       { isOnline: true,  cfActive: true,  isDirty: false, syncStatus: "error" },       AMPEL.rot],
  ["cloud_newer", { isOnline: true,  cfActive: true,  isDirty: false, syncStatus: "cloud_newer" }, AMPEL.gelb],
  ["dirty",       { isOnline: true,  cfActive: true,  isDirty: true,  syncStatus: "idle" },        AMPEL.gelb],
];

describe("Sync-Ampel", () => {
  it("jeder Zustand trägt seine Signalfarbe", () => {
    for (const [key, eingabe, farbe] of ZUSTAENDE) {
      const s = getSyncBadgeState(eingabe);
      expect(s, key).not.toBeNull();
      expect(s.key, key).toBe(key);
      expect(s.signal, key).toBe(farbe);
    }
  });

  it("die Farben sind fest — kein Theme verändert sie", () => {
    const vorher = ZUSTAENDE.map(([, e]) => getSyncBadgeState(e).signal);
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg) continue;
      setActiveTheme(name, t);
      const jetzt = ZUSTAENDE.map(([, e]) => getSyncBadgeState(e).signal);
      expect(jetzt, `Theme ${name} verändert die Ampel`).toEqual(vorher);
    }
  });

  it("jeder Zustand hat ein eigenes, sofort verfügbares Symbol", () => {
    for (const [key, eingabe] of ZUSTAENDE) {
      const s = getSyncBadgeState(eingabe);
      expect(s.icon, key).toBeTruthy();
      // Nicht-statische Symbole bleiben leer, bis der grosse Lucide-Block
      // nachgeladen ist — ausgerechnet bei einem Warnhinweis inakzeptabel.
      expect(STATIC_LUCIDE[s.icon], `${key}: „${s.icon}" ist nicht statisch`).toBeTruthy();
    }
  });

  it("die Beschriftung trägt auf jeder Signalfarbe", () => {
    for (const [key, eingabe] of ZUSTAENDE) {
      const { grund, schrift } = knopfPaar(getSyncBadgeState(eingabe).signal, DUNKEL);
      const wert = kontrastWert(schrift, grund);
      expect(wert, `${key}: ${wert.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("auf dem Sonnengelb steht dunkle Schrift, nicht weiße", () => {
    // Der ausdrückliche Wunsch: gelbe Fläche, dunkle Schrift. Weiss auf Gelb
    // waere zwar eine mögliche Wahl des Helfers, aber die falsche.
    const { schrift } = knopfPaar(AMPEL.gelb, DUNKEL);
    expect(schrift).toBe(DUNKEL);
  });

  it("ohne eingerichtete Cloud gibt es keinen Hinweis", () => {
    expect(getSyncBadgeState({ isOnline: true, cfActive: false, isDirty: true, syncStatus: "idle" })).toBeNull();
    // Offline zählt trotzdem — da geht es nicht um die Cloud.
    expect(getSyncBadgeState({ isOnline: false, cfActive: false, isDirty: false, syncStatus: "idle" })).not.toBeNull();
  });
});
