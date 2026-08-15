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
  // Lazy geladene Vollbild-Dialoge: sie kommen im Hauptbundle nicht vor und
  // waren deshalb in keinem Render-Test — ein TDZ-Fehler darin (Wert vor
  // seiner Deklaration benutzt) faellt sonst erst beim Oeffnen auf dem Geraet
  // auf. Genau das war beim Jahres-Auswahlfeld des Daten-Managers beinahe
  // passiert.
  ["DataManagerDialog", () => import("../src/components/organisms/DataManagerDialog.jsx"), {}],
  ["CsvImportScreen",   () => import("../src/components/screens/CsvImportScreen.jsx"), {}],
  // Weitere lazy geladene Vollbild-Screens. Anlass: in RecurringDetectionScreen
  // wurde eine Konstante benutzt, ohne sie zu importieren — weder Build noch
  // Tests schlugen an (ein fehlender Import ist erst zur LAUFZEIT ein Fehler),
  // aufgefallen waere es erst beim Oeffnen des Screens.
  ["RecurringDetectionScreen", () => import("../src/components/screens/RecurringDetectionScreen.jsx"), {}],
  ["MatchingScreen",           () => import("../src/components/screens/MatchingScreen.jsx"), {}],
  ["VormerkungHub",            () => import("../src/components/screens/VormerkungHub.jsx"), {}],
  ["FuelAnalysisScreen",       () => import("../src/components/screens/FuelAnalysisScreen.jsx"), {}],
  ["CloudSetupWizard",         () => import("../src/components/screens/CloudSetupWizard.jsx"), {}],
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
