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

// Die Rueckfrage kommt seit dem Umbau nicht mehr vom Browser (window.confirm),
// sondern aus der App: `frageBestaetigung(frage, onJa, opts)` aus dem Context.
// Der Test haelt beide Haelften fest — dass gefragt wird, UND dass ohne ein Ja
// nichts passiert. Genau da kann beim Umbau von Rueckgabewert auf Callback eine
// Absicherung verlorengehen, ohne dass es irgendwo auffaellt.
describe("SettingsInline — 'Cloudflare → Lokal' delegiert an loadFromCloud", () => {
  it("ruft nach Bestätigung loadFromCloud() auf (statt cfLoad/applyData direkt)", async () => {
    const loadFromCloud = vi.fn(() => Promise.resolve());
    const setCfStatus = vi.fn();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    let gefragt = null;
    const frageBestaetigung = vi.fn((frage, onJa) => { gefragt = { frage, onJa }; });

    const { container, root } = renderWithOverrides({ cfActive: true, loadFromCloud, setCfStatus, frageBestaetigung });

    const btn = [...container.querySelectorAll("button")]
      .find(b => b.textContent.includes("Cloudflare → Lokal"));
    expect(btn).toBeTruthy();

    await act(async () => { btn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    // Erst gefragt — und noch nichts geladen.
    expect(frageBestaetigung).toHaveBeenCalled();
    expect(gefragt.frage).toMatch(/überschrieben/);
    expect(loadFromCloud).not.toHaveBeenCalled();

    // Ja → jetzt wird geladen.
    await act(async () => { await gefragt.onJa(); });
    expect(loadFromCloud).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
    act(() => { root.unmount(); });
  });

  it("ruft loadFromCloud NICHT auf, wenn die Sicherheitsabfrage abgebrochen wird", async () => {
    const loadFromCloud = vi.fn(() => Promise.resolve());
    // Abbrechen = der onJa-Callback wird nie aufgerufen.
    const frageBestaetigung = vi.fn(() => {});

    const { container, root } = renderWithOverrides({ cfActive: true, loadFromCloud, setCfStatus: () => {}, frageBestaetigung });
    const btn = [...container.querySelectorAll("button")]
      .find(b => b.textContent.includes("Cloudflare → Lokal"));

    await act(async () => { btn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(frageBestaetigung).toHaveBeenCalled();
    expect(loadFromCloud).not.toHaveBeenCalled();
    act(() => { root.unmount(); });
  });

  it("kein Bildschirm ruft noch window.confirm auf", async () => {
    // Der native Dialog wird vom System gezeichnet und sieht auf jeder
    // Plattform anders aus — im schmalen Firefox-Fenster ragte er sogar aus
    // dem Bild (Nutzer-Bild). Deshalb: nirgends mehr.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
    const alle = (verz, treffer = []) => {
      for (const name of readdirSync(verz)) {
        const pfad = join(verz, name);
        if (statSync(pfad).isDirectory()) alle(pfad, treffer);
        else if (/\.jsx?$/.test(name)) treffer.push(pfad);
      }
      return treffer;
    };
    const funde = [];
    for (const datei of alle(SRC)) {
      readFileSync(datei, "utf8").split("\n").forEach((z, i) => {
        // Kommentare duerfen den Namen nennen — sie erklaeren den Umbau.
        if (/window\.confirm\s*\(/.test(z) && !/^\s*(\/\/|\*)/.test(z)) {
          funde.push(`${datei.slice(SRC.length + 1)}:${i + 1}`);
        }
      });
    }
    expect(funde).toEqual([]);
  });
});
