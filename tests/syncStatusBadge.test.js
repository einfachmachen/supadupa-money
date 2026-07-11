// Regression: "Cloud hat neuere Daten" wurde zwar beim Boot erkannt, aber
// nirgends sichtbar angezeigt (syncStatus "error_shown" wurde von KEINER
// Anzeige konsumiert) — ein Nutzer, der eine Verknüpfung auf einem anderen
// Gerät vorgenommen hatte, sah sie auf einem zweiten Gerät nie ankommen.
// Das Badge zeigt "cloud_newer" jetzt sichtbar an und lädt beim Antippen
// (nach Bestätigung) direkt von der Cloud, statt nur den Hochladen-Dialog
// zu öffnen.
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { SyncStatusBadge } from "../src/components/organisms/SyncStatusBadge.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

function renderBadge(ctxOverrides) {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(AppCtx.Provider, { value: ctxOverrides },
      React.createElement(SyncStatusBadge)));
  });
  return { container, root };
}

describe("SyncStatusBadge — 'cloud_newer' sichtbar und antippbar", () => {
  it("zeigt den Hinweis-Text für cloud_newer an", () => {
    const { container, root } = renderBadge({
      isOnline: true, cfActive: true, isDirty: false, syncStatus: "cloud_newer",
      openCloudSave: () => {}, loadFromCloud: () => {},
    });
    expect(container.textContent).toMatch(/Cloud/);
    act(() => { root.unmount(); });
  });

  it("ruft bei cloud_newer nach Bestätigung loadFromCloud auf, NICHT openCloudSave", () => {
    const openCloudSave = vi.fn();
    const loadFromCloud = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container, root } = renderBadge({
      isOnline: true, cfActive: true, isDirty: false, syncStatus: "cloud_newer",
      openCloudSave, loadFromCloud,
    });
    const badge = container.querySelector("div[style*='cursor: pointer']") || container.firstChild.firstChild;
    act(() => { badge.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(loadFromCloud).toHaveBeenCalledTimes(1);
    expect(openCloudSave).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
    act(() => { root.unmount(); });
  });

  it("ruft loadFromCloud NICHT auf, wenn der Nutzer die Sicherheitsabfrage abbricht", () => {
    const openCloudSave = vi.fn();
    const loadFromCloud = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { container, root } = renderBadge({
      isOnline: true, cfActive: true, isDirty: false, syncStatus: "cloud_newer",
      openCloudSave, loadFromCloud,
    });
    const badge = container.querySelector("div[style*='cursor: pointer']") || container.firstChild.firstChild;
    act(() => { badge.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(loadFromCloud).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
    act(() => { root.unmount(); });
  });

  it("ruft bei 'dirty' weiterhin openCloudSave auf (normales Hochladen), nicht loadFromCloud", () => {
    const openCloudSave = vi.fn();
    const loadFromCloud = vi.fn();
    const { container, root } = renderBadge({
      isOnline: true, cfActive: true, isDirty: true, syncStatus: "idle",
      openCloudSave, loadFromCloud,
    });
    const badge = container.querySelector("div[style*='cursor: pointer']") || container.firstChild.firstChild;
    act(() => { badge.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(openCloudSave).toHaveBeenCalledTimes(1);
    expect(loadFromCloud).not.toHaveBeenCalled();
    act(() => { root.unmount(); });
  });
});
