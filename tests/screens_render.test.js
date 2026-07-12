// Render-Smoke-Tests: jeder Haupt-Screen + das Einstellungs-Panel wird einmal
// gerendert. Fängt Render-Crashes (insb. TDZ "Cannot access X before init").
import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { renderToString } from "react-dom/server";
import { withCtx } from "./_mockCtx.js";

beforeAll(async () => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof window !== "undefined" && !window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  const { installLegacyBridge } = await import("../src/state/persistence.js").catch(()=>({installLegacyBridge(){}}));
  installLegacyBridge?.();
});

const cases = [
  ["DashboardScreenV2", () => import("../src/components/screens/DashboardScreenV2.jsx"), {}],
  ["MonatScreen",       () => import("../src/components/screens/MonatScreen.jsx"), {}],
  ["JahrScreen",        () => import("../src/components/screens/JahrScreen.jsx"), {}],
  ["TrendOverviewScreen", () => import("../src/components/screens/TrendOverviewScreen.jsx"), {}],
  ["ManagementScreen",  () => import("../src/components/screens/ManagementScreen.jsx"), { activeTab:"einstellungen" }],
  ["SettingsInline",    () => import("../src/components/screens/SettingsInline.jsx"), {}],
  ["EnableBankingWizard", () => import("../src/components/screens/EnableBankingWizard.jsx"), {}],
  ["SearchSummaryScreen", () => import("../src/components/screens/SearchSummaryScreen.jsx"), {}],
];

describe("Screen-Render (TDZ-Regression)", () => {
  for (const [name, loader, props] of cases) {
    it(`${name} rendert ohne Crash`, async () => {
      const mod = await loader();
      const Comp = mod[name] || mod.default;
      expect(typeof Comp).toBe("function");
      expect(() => renderToString(withCtx(React.createElement(Comp, props)))).not.toThrow();
    });
  }
});
