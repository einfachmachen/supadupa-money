// Stellt sicher, dass der Inhalt der 3-Stufen-Tour (GuidedFeatureTour.jsx)
// strukturell vollständig ist — ein fehlendes Feld würde sonst erst zur
// Laufzeit auffallen (z.B. leerer Text bei einer bestimmten Erklär-Ebene).
import { describe, it, expect } from "vitest";
import { GUIDED_TOUR_STAGES } from "../src/content/guidedTourStages.js";

describe("GUIDED_TOUR_STAGES", () => {
  it("hat mindestens 3 Stufen mit je mindestens einem Schritt", () => {
    expect(GUIDED_TOUR_STAGES.length).toBeGreaterThanOrEqual(3);
    GUIDED_TOUR_STAGES.forEach(stage => {
      expect(stage.steps.length).toBeGreaterThan(0);
    });
  });

  it("jede Stufe hat einen eindeutigen key und ein label", () => {
    const keys = GUIDED_TOUR_STAGES.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    GUIDED_TOUR_STAGES.forEach(stage => {
      expect(typeof stage.label).toBe("string");
      expect(stage.label.length).toBeGreaterThan(0);
    });
  });

  it("jeder Schritt hat icon, title und alle vier Erklär-Ebenen als nicht-leeren String", () => {
    GUIDED_TOUR_STAGES.forEach(stage => {
      stage.steps.forEach(step => {
        expect(typeof step.icon).toBe("string");
        expect(step.icon.length).toBeGreaterThan(0);
        expect(typeof step.title).toBe("string");
        expect(step.title.length).toBeGreaterThan(0);
        ["eli10", "eli20", "eli30", "eli60"].forEach(lvl => {
          expect(typeof step[lvl]).toBe("string");
          expect(step[lvl].length).toBeGreaterThan(0);
        });
      });
    });
  });

  it("jeder Schritt hat ein target mit gültigem tab (home|daten) und selector als String oder null", () => {
    GUIDED_TOUR_STAGES.forEach(stage => {
      stage.steps.forEach(step => {
        expect(["home", "daten"]).toContain(step.target.tab);
        expect(step.target.selector === null || typeof step.target.selector === "string").toBe(true);
      });
    });
  });

  it("jeder gesetzte Selector (target und reveal) ist ein wohlgeformter Attribut-Selektor", () => {
    GUIDED_TOUR_STAGES.forEach(stage => {
      stage.steps.forEach(step => {
        if (step.target.selector) {
          expect(step.target.selector).toMatch(/^\[data-tour="[a-z0-9-]+"\]$/);
        }
        if (step.target.reveal) {
          expect(step.target.reveal).toMatch(/^\[(data-tour|title)="[^"]+"\]$/);
        }
      });
    });
  });
});
