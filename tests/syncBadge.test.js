import { describe, it, expect } from "vitest";
import { getSyncBadgeState } from "../src/utils/syncBadge.js";

describe("getSyncBadgeState — Offline-/Sync-Hinweis-Badge", () => {
  it("zeigt Offline-Hinweis, sobald keine Verbindung besteht — unabhängig vom Cloud-Status", () => {
    const state = getSyncBadgeState({ isOnline: false, cfActive: true, isDirty: true, syncStatus: "idle" });
    expect(state.key).toBe("offline");

    const noCloud = getSyncBadgeState({ isOnline: false, cfActive: false, isDirty: false, syncStatus: "idle" });
    expect(noCloud.key).toBe("offline");
  });

  it("zeigt nichts, wenn online, keine Cloud eingerichtet ist und nichts aussteht", () => {
    expect(getSyncBadgeState({ isOnline: true, cfActive: false, isDirty: true, syncStatus: "idle" })).toBeNull();
  });

  it("zeigt nichts, wenn online, Cloud eingerichtet und alles synchron ist", () => {
    expect(getSyncBadgeState({ isOnline: true, cfActive: true, isDirty: false, syncStatus: "idle" })).toBeNull();
  });

  it("zeigt 'nicht synchronisiert', wenn online + Cloud aktiv + lokale Änderungen ausstehen", () => {
    const state = getSyncBadgeState({ isOnline: true, cfActive: true, isDirty: true, syncStatus: "idle" });
    expect(state.key).toBe("dirty");
  });

  it("zeigt den laufenden Sync-Status (saving/saved/error) mit Vorrang vor 'dirty'", () => {
    expect(getSyncBadgeState({ isOnline: true, cfActive: true, isDirty: true, syncStatus: "saving" }).key).toBe("saving");
    expect(getSyncBadgeState({ isOnline: true, cfActive: true, isDirty: true, syncStatus: "saved" }).key).toBe("saved");
    expect(getSyncBadgeState({ isOnline: true, cfActive: true, isDirty: true, syncStatus: "error" }).key).toBe("error");
  });

  // Regression (echter Nutzer-Bericht): eine Verknüpfung wurde auf einem
  // anderen Gerät vorgenommen und in die Cloud gespeichert — der Boot-Check
  // erkennt das zwar (saved_at-Vergleich), setzte bisher aber "error_shown",
  // einen Status, den getSyncBadgeState gar nicht kannte. Der Hinweis
  // verschwand dadurch spurlos, ohne je angezeigt zu werden.
  it("zeigt 'cloud_newer', wenn ein anderes Gerät neuere Daten gespeichert hat", () => {
    const state = getSyncBadgeState({ isOnline: true, cfActive: true, isDirty: false, syncStatus: "cloud_newer" });
    expect(state.key).toBe("cloud_newer");
  });
});
