// Regression: der "Cloudflare → Lokal"-Button in den Einstellungen rief
// bisher cfLoad()/applyData() direkt auf, OHNE syncStatus kurz auf "loading"
// zu setzen — der Auto-Save-Effekt (useLocalSaveDebounce) markierte den
// gerade frisch geladenen Cloud-Stand 300ms später fälschlich als "nicht
// synchronisiert" (genau das vom Nutzer gemeldete Symptom: direkt nach
// "Cloudflare → Lokal" erschien das "Nicht synchronisiert"-Banner). Der
// Button delegiert jetzt an das bereits fixte loadFromCloud() aus App.jsx.
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { SettingsInline } from "../src/components/screens/SettingsInline.jsx";
import { mockCtx } from "./_mockCtx.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

function renderWithOverrides(overrides) {
  const ctx = new Proxy({}, {
    get(_t, key) { return key in overrides ? overrides[key] : mockCtx[key]; },
    has() { return true; },
  });
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(AppCtx.Provider, { value: ctx },
      React.createElement(SettingsInline)));
  });
  return { container, root };
}

describe("SettingsInline — 'Cloudflare → Lokal' delegiert an loadFromCloud", () => {
  it("ruft nach Bestätigung loadFromCloud() auf (statt cfLoad/applyData direkt)", async () => {
    const loadFromCloud = vi.fn(() => Promise.resolve());
    const setCfStatus = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container, root } = renderWithOverrides({ cfActive: true, loadFromCloud, setCfStatus });

    const btn = [...container.querySelectorAll("button")]
      .find(b => b.textContent.includes("Cloudflare → Lokal"));
    expect(btn).toBeTruthy();

    await act(async () => { btn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(confirmSpy).toHaveBeenCalled();
    expect(loadFromCloud).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
    act(() => { root.unmount(); });
  });

  it("ruft loadFromCloud NICHT auf, wenn die Sicherheitsabfrage abgebrochen wird", async () => {
    const loadFromCloud = vi.fn(() => Promise.resolve());
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    const { container, root } = renderWithOverrides({ cfActive: true, loadFromCloud, setCfStatus: () => {} });
    const btn = [...container.querySelectorAll("button")]
      .find(b => b.textContent.includes("Cloudflare → Lokal"));

    await act(async () => { btn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(loadFromCloud).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
    act(() => { root.unmount(); });
  });
});
