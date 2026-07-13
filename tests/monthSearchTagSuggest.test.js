// Tippt man in der Monats-Suche ein "#", sollen bereits vergebene Tags als
// Vorschlag erscheinen (statt den Namen blind auswendig eintippen zu müssen).
import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { MonatScreen } from "../src/components/screens/MonatScreen.jsx";
import { mockCtx } from "./_mockCtx.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (!window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
});

const TXS = [
  { id:"t1", date:"2026-01-05", desc:"Amazon Kauf", totalAmount:-20, splits:[], tags:["aida","reise"] },
  { id:"t2", date:"2026-02-10", desc:"Amazon Buch", totalAmount:-15, splits:[], tags:["reise"] },
];

function renderMonat(overrides) {
  const ctx = new Proxy({}, {
    get(_t, key) { return key in overrides ? overrides[key] : mockCtx[key]; },
    has() { return true; },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(AppCtx.Provider, { value: ctx },
      React.createElement(MonatScreen)));
  });
  return { container, root };
}

function typeInSearch(container, term) {
  const input = container.querySelector('input[placeholder^="suchen"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => { input.focus(); });
  act(() => {
    setter.call(input, term);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}

describe("MonatScreen — Suche schlägt vorhandene Tags nach '#' vor", () => {
  it("zeigt beim Tippen von '#' alle vergebenen Tags", () => {
    const { container, root } = renderMonat({ txs: TXS });
    typeInSearch(container, "#");
    expect(container.textContent).toContain("#aida");
    expect(container.textContent).toContain("#reise");
    act(() => { root.unmount(); });
    container.remove();
  });

  it("filtert die Vorschläge nach dem bereits getippten Teil", () => {
    const { container, root } = renderMonat({ txs: TXS });
    typeInSearch(container, "#ai");
    expect(container.textContent).toContain("#aida");
    expect(container.textContent).not.toContain("#reise");
    act(() => { root.unmount(); });
    container.remove();
  });

  it("übernimmt den Vorschlag per Klick und startet die Suche direkt", () => {
    const { container, root } = renderMonat({ txs: TXS });
    typeInSearch(container, "#ai");
    // .children.length===0 wählt gezielt das Vorschlag-Element selbst (Blatt),
    // nicht den umschließenden Dropdown-Container mit demselben Textinhalt.
    const suggestion = [...container.querySelectorAll("div")].find(d => d.children.length===0 && d.textContent.trim() === "#aida");
    expect(suggestion).toBeTruthy();
    act(() => { suggestion.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.textContent).toContain("Alle (1)"); // nur t1 hat #aida
    act(() => { root.unmount(); });
    container.remove();
  });

  it("zeigt keine Vorschläge ohne '#'", () => {
    const { container, root } = renderMonat({ txs: TXS });
    typeInSearch(container, "Amazon");
    expect(container.textContent).not.toContain("#aida");
    act(() => { root.unmount(); });
    container.remove();
  });
});
