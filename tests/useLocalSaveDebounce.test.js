// Regression: direkt nach dem initialen Laden wurde der erste (redundante)
// Speicherlauf fälschlich als "nicht synchronisiert" markiert, obwohl der
// Nutzer nichts geändert hatte — nur die gerade geladenen Daten wurden
// zurückgeschrieben. Die Gnadenfrist (GRACE_MS) unterdrückt das Dirty-Flag
// in diesem Fenster, ohne den lokalen Save selbst zu unterdrücken.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { useLocalSaveDebounce } from "../src/hooks/useLocalSaveDebounce.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

function Harness({ loading, txs, onDirty }) {
  useLocalSaveDebounce({
    lsKey: "test_key",
    state: {
      cats: [], groups: [], txs, accounts: [], vehicles: [], yearData: {}, col3Name: "",
      quickBtns: [], quickColors: [], csvRules: {}, budgets: {}, customIcons: [], startBalances: {},
    },
    loading,
    setSyncStatus: () => {},
    setSyncError: () => {},
    setIsDirty: onDirty,
  });
  return null;
}
const h = (loading, txs, onDirty) => React.createElement(Harness, { loading, txs, onDirty });

describe("useLocalSaveDebounce — Gnadenfrist nach dem initialen Laden", () => {
  let container, root, idbSet;

  beforeEach(() => {
    vi.useFakeTimers();
    idbSet = vi.fn(() => Promise.resolve());
    window.IDB = { set: idbSet };
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    vi.useRealTimers();
  });

  it("speichert lokal, markiert aber NICHT als dirty, wenn die Daten gerade erst geladen wurden", () => {
    const dirtyCalls = [];
    const onDirty = () => dirtyCalls.push(true);

    act(() => { root.render(h(true, [], onDirty)); });
    // Laden abgeschlossen: loading→false UND Daten wechseln im selben Zug
    // (genau das Szenario, das vorher fälschlich "dirty" auslöste).
    act(() => { root.render(h(false, [{ id: "t1" }], onDirty)); });
    act(() => { vi.advanceTimersByTime(300); }); // Debounce

    expect(idbSet).toHaveBeenCalledTimes(1); // lokal wird trotzdem gespeichert — nichts geht verloren
    expect(dirtyCalls.length).toBe(0); // aber nicht als "nicht synchronisiert" markiert
  });

  it("markiert eine ECHTE Änderung nach Ablauf der Gnadenfrist als dirty", () => {
    const dirtyCalls = [];
    const onDirty = () => dirtyCalls.push(true);

    act(() => { root.render(h(true, [], onDirty)); });
    act(() => { root.render(h(false, [{ id: "t1" }], onDirty)); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(dirtyCalls.length).toBe(0);

    // Gnadenfrist verstreicht
    act(() => { vi.advanceTimersByTime(1500); });

    // Jetzt eine echte Nutzeränderung
    act(() => { root.render(h(false, [{ id: "t1" }, { id: "t2" }], onDirty)); });
    act(() => { vi.advanceTimersByTime(300); });

    expect(idbSet).toHaveBeenCalledTimes(2);
    expect(dirtyCalls.length).toBe(1);
  });

  it("speichert während loading=true gar nicht", () => {
    const dirtyCalls = [];
    const onDirty = () => dirtyCalls.push(true);

    act(() => { root.render(h(true, [], onDirty)); });
    act(() => { root.render(h(true, [{ id: "t1" }], onDirty)); });
    act(() => { vi.advanceTimersByTime(300); });

    expect(idbSet).not.toHaveBeenCalled();
    expect(dirtyCalls.length).toBe(0);
  });
});
