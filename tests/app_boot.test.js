// Boot-Smoke-Test: rendert die komplette App einmal headless.
// Fängt Render-Crashes der gesamten Komponenten-Kette ab — insbesondere die
// TDZ-Klasse ("Cannot access X before initialization"), die einen
// Produktions-Crash verursacht hatte. renderToString führt den Render synchron
// aus (ohne Effekte) — das genügt, da solche Fehler beim Rendern auftreten.
import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { renderToString } from "react-dom/server";

beforeAll(() => {
  // Browser-APIs, die einzelne Komponenten beim Rendern erwarten
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  }
});

describe("App-Boot", () => {
  it("rendert ohne Crash (TDZ-Regression)", async () => {
    const { installLegacyBridge } = await import("../src/state/persistence.js");
    installLegacyBridge(); // window.IDB für etwaige Render-Pfade
    const Mod = await import("../src/App.jsx");
    const App = Mod.default;
    expect(() => renderToString(React.createElement(App))).not.toThrow();
  });
});
