import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppCtx } from "../src/state/AppContext.js";
import { MonthPicker } from "../src/components/molecules/MonthPicker.jsx";
import { MonthPickerModal } from "../src/components/organisms/MonthPickerModal.jsx";

// Regression: `const isLightTheme = (isLightTheme())` überschattete die
// importierte Funktion → TDZ-Crash beim Render ("Cannot access 'd' before…").
const ctx = { year:2026, month:5, setYear(){}, setMonth(){}, txs:[], accounts:[], getKumulierterSaldo:()=>0 };
const h = React.createElement;
const wrap = (Comp, props) => h(AppCtx.Provider, { value: ctx }, h(Comp, props));

describe("MonthPicker/Modal rendern ohne TDZ-Crash", () => {
  it("MonthPicker rendert", () => {
    expect(() => renderToString(wrap(MonthPicker, { year:2026, month:5, setYear(){}, setMonth(){} }))).not.toThrow();
  });
  it("MonthPickerModal rendert", () => {
    expect(() => renderToString(wrap(MonthPickerModal, { year:2026, month:5, setYear(){}, setMonth(){}, onClose(){} }))).not.toThrow();
  });
});
