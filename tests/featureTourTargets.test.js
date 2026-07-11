// Stellt sicher, dass die Wiring-Metadaten der interaktiven Feature-Tour
// (GuidedFeatureTour.jsx) synchron zum Inhalt (content/featureTour.js)
// bleiben — ein Index-Versatz würde sonst z.B. den falschen Text zum
// hervorgehobenen Element zeigen, ohne dass ein Test das je bemerkt.
import { describe, it, expect } from "vitest";
import { FEATURE_TOUR } from "../src/content/featureTour.js";
import { FEATURE_TOUR_TARGETS } from "../src/content/featureTourTargets.js";

describe("FEATURE_TOUR_TARGETS", () => {
  it("hat für jeden FEATURE_TOUR-Eintrag genau ein Ziel (gleiche Länge, gleicher Index)", () => {
    expect(FEATURE_TOUR_TARGETS.length).toBe(FEATURE_TOUR.length);
  });

  it("jedes Ziel hat einen gültigen Tab (home|daten) und selector ist String oder null", () => {
    FEATURE_TOUR_TARGETS.forEach(t => {
      expect(["home", "daten"]).toContain(t.tab);
      expect(t.selector === null || typeof t.selector === "string").toBe(true);
    });
  });

  it("jeder gesetzte Selector ist ein wohlgeformter [data-tour=\"...\"]-Attribut-Selektor", () => {
    FEATURE_TOUR_TARGETS.forEach(t => {
      if (t.selector) expect(t.selector).toMatch(/^\[data-tour="[a-z0-9-]+"\]$/);
    });
  });
});
