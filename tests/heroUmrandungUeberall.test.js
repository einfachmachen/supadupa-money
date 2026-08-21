// Die grüne „alles abgesichert"-Umrandung gehört an JEDEN Hero.
//
// Sie hing zuerst an einer Eigenschaft (`ringFarbe`), die nur das Dashboard
// setzte. Monat und Trend zeigen denselben Hero — und blieben ohne Umrandung
// (Nutzer: „Außerdem müssen wir die grüne Hero-Umrandung auch noch in Monat
// und Trend ergänzen").
//
// Die Ursache war keine vergessene Zeile, sondern die falsche Zuständigkeit:
// Der Absicherungs-Stand ist eine Aussage über die LAGE, nicht über den
// Bildschirm. Er gilt auf allen dreien gleich, also holt der Hero ihn sich
// selbst. Damit kann ihn auch der nächste Bildschirm nicht mehr vergessen.
//
// Dieser Test rendert wirklich — ein Blick in den Quelltext hätte die Lücke
// von vorhin gerade NICHT gefunden.

import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppCtx } from "../src/state/AppContext.js";
import { mockCtx } from "./_mockCtx.js";
import { theme as T } from "../src/theme/activeTheme.js";

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof window !== "undefined" && !window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){},
      addListener(){}, removeListener(){} });
});

// Der Hero mit einem überschriebenen Context-Feld — `liquidityWarnings` ist
// das einzige, worauf es hier ankommt: keine Warnung heißt „sicher".
const heroMit = async (warnungen) => {
  const { SaldoHeroV2 } = await import("../src/components/organisms/SaldoHeroV2.jsx");
  // Der Mock-Context ist ein Proxy, der jeden unbekannten Schlüssel beantwortet
  // — deshalb wird er hier nicht kopiert, sondern vorgeschaltet: gefragt wird
  // erst dieses eine Feld, alles andere geht an ihn weiter.
  const ctx = new Proxy({}, {
    get: (_t, k) => (k === "liquidityWarnings" ? warnungen : mockCtx[k]),
    has: () => true,
  });
  return renderToString(React.createElement(AppCtx.Provider, { value: ctx },
    React.createElement(SaldoHeroV2, {
      year: 2026, month: 5, detailsOpen: false, setDetailsOpen: () => {},
    })));
};

describe("Hero-Umrandung: gilt überall, nicht nur im Dashboard", () => {
  it("ist alles abgesichert, trägt der Hero die grüne Umrandung", async () => {
    const html = await heroMit([]);
    expect(html, "die Umrandung fehlt").toContain("inset 0 0 0 2px");
    // In der Positiv-Farbe des Themes, nicht in einem festen Grün.
    expect(html.toLowerCase()).toContain(String(T.pos).toLowerCase());
  });

  it("bei einem Engpass bleibt der Hero ohne Umrandung", async () => {
    // Sonst behauptete die Umrandung „alles gut", während darunter ein
    // Warnbalken steht — der Widerspruch zwischen zwei Anzeigen, den diese
    // Sitzung an mehreren Stellen abgeschafft hat.
    const html = await heroMit([{ date: "2027-04-12", deficit: 340 }]);
    expect(html, "hier darf keine Umrandung stehen").not.toContain("inset 0 0 0 2px");
  });
});
