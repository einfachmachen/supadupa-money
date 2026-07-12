import { describe, it, expect } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { TagInput, normalizeTag } from "../src/components/atoms/TagInput.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

// jsdom/React: ein direktes el.value="x" wird von Reacts internem Value-Tracker
// ignoriert (kein "echter" Tastatur-Input) — über den nativen Setter umgehen,
// damit das anschließende "input"-Event onChange wirklich auslöst.
function setNativeValue(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("normalizeTag", () => {
  it("entfernt führende '#', trimmt und macht lowercase", () => {
    expect(normalizeTag("#AIDA")).toBe("aida");
    expect(normalizeTag("  Amazon  ")).toBe("amazon");
    expect(normalizeTag("##doppelt")).toBe("doppelt");
  });
  it("leerer/undefined Input ergibt leeren String", () => {
    expect(normalizeTag("")).toBe("");
    expect(normalizeTag(undefined)).toBe("");
  });
});

describe("TagInput (Render + Interaktion)", () => {
  it("fügt beim Enter einen normalisierten Tag hinzu und ruft onChange auf", () => {
    let value = [];
    const onChange = (v) => { value = v; };
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TagInput, { value, onChange })); });
    const input = container.querySelector("input");
    act(() => { setNativeValue(input, "#AIDA"); });
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(value).toEqual(["aida"]);
    root.unmount();
  });

  it("verhindert doppelte Tags", () => {
    let value = ["aida"];
    const onChange = (v) => { value = v; };
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TagInput, { value, onChange })); });
    const input = container.querySelector("input");
    act(() => { setNativeValue(input, "aida"); });
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(value).toEqual(["aida"]);
    root.unmount();
  });

  it("entfernt einen Tag per Klick auf das x-Symbol", () => {
    let value = ["aida", "amazon"];
    const onChange = (v) => { value = v; };
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TagInput, { value, onChange })); });
    const removeIcons = container.querySelectorAll("span[style*='cursor: pointer']");
    expect(removeIcons.length).toBe(2);
    act(() => { removeIcons[0].dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(value).toEqual(["amazon"]);
    root.unmount();
  });

  it("zeigt vorhandene Tags als Chips mit '#'-Präfix", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TagInput, { value: ["aida"], onChange: () => {} })); });
    expect(container.textContent).toContain("#aida");
    root.unmount();
  });
});

describe("TagInput Autovervollständigung (suggestions)", () => {
  it("zeigt beim Fokussieren passende, noch nicht vergebene Vorschläge gefiltert nach Draft", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TagInput, {
      value: ["amazon"], onChange: () => {}, suggestions: ["aida", "amazon", "aldi"],
    })); });
    const input = container.querySelector("input");
    act(() => { input.focus(); });
    act(() => { setNativeValue(input, "a"); });
    // "amazon" ist bereits vergeben -> ausgeblendet; "aida"/"aldi" bleiben
    const dropdown = container.querySelector("div[style*='position: absolute']");
    expect(dropdown).toBeTruthy();
    expect(dropdown.textContent).toContain("#aida");
    expect(dropdown.textContent).toContain("#aldi");
    expect(dropdown.textContent).not.toContain("#amazon");
    act(() => { root.unmount(); });
    container.remove();
  });

  it("übernimmt einen Vorschlag per Klick", () => {
    let value = [];
    const onChange = (v) => { value = v; };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TagInput, {
      value, onChange, suggestions: ["aida", "amazon"],
    })); });
    const input = container.querySelector("input");
    act(() => { input.focus(); });
    act(() => { setNativeValue(input, "aid"); });
    const suggestion = [...container.querySelectorAll("div[style*='cursor: pointer']")]
      .find(d => d.textContent === "#aida");
    expect(suggestion).toBeTruthy();
    act(() => { suggestion.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(value).toEqual(["aida"]);
    act(() => { root.unmount(); });
    container.remove();
  });

  it("übernimmt den per Pfeiltasten markierten Vorschlag mit Enter", () => {
    let value = [];
    const onChange = (v) => { value = v; };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => { root.render(React.createElement(TagInput, {
      value, onChange, suggestions: ["aida", "amazon"],
    })); });
    const input = container.querySelector("input");
    act(() => { input.focus(); });
    act(() => { setNativeValue(input, "a"); });
    act(() => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })); });
    act(() => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); });
    expect(value).toEqual(["aida"]);
    act(() => { root.unmount(); });
    container.remove();
  });
});
