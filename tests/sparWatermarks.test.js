// Realtest: Sparplan-Wasserzeichen (höchster je erzeugter Monatsschlüssel je
// Serie) laufen nur vorwärts und werden Geräte-übergreifend gemergt — siehe
// utils/sparWatermarks.js für den Hintergrund (schützt vor der Löschung der
// jeweils LETZTEN Rate eines Sparplan-Beins).
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { kvStore } from "../src/utils/kvStore.js";
import { getSparWatermark, noteSparWatermark, getSparWatermarksForSync, mergeRemoteSparWatermarks }
  from "../src/utils/sparWatermarks.js";

describe("sparWatermarks", () => {
  beforeEach(async () => {
    await kvStore.init();
    kvStore.removeItem("mbt_spar_watermarks");
  });

  it("liefert -Infinity für eine unbekannte Serie", () => {
    expect(getSparWatermark("series-unknown")).toBe(-Infinity);
  });

  it("setzt das Wasserzeichen beim ersten Aufruf", () => {
    noteSparWatermark("series-1", 2032*12+0);
    expect(getSparWatermark("series-1")).toBe(2032*12+0);
  });

  it("läuft nur vorwärts — ein kleinerer Wert wird ignoriert", () => {
    noteSparWatermark("series-1", 2032*12+0);
    noteSparWatermark("series-1", 2030*12+0); // kleiner — darf das Wasserzeichen nicht zurücksetzen
    expect(getSparWatermark("series-1")).toBe(2032*12+0);
  });

  it("erhöht das Wasserzeichen bei einem größeren Wert", () => {
    noteSparWatermark("series-1", 2030*12+0);
    noteSparWatermark("series-1", 2033*12+5);
    expect(getSparWatermark("series-1")).toBe(2033*12+5);
  });

  it("ignoriert ungültige Eingaben ohne Fehler", () => {
    expect(() => noteSparWatermark(null, 100)).not.toThrow();
    expect(() => noteSparWatermark("series-1", null)).not.toThrow();
    expect(() => noteSparWatermark("series-1", NaN)).not.toThrow();
    expect(getSparWatermark("series-1")).toBe(-Infinity);
  });

  it("Geräte-übergreifend: das höhere Wasserzeichen von Gerät A gewinnt nach dem Merge auf Gerät B", () => {
    noteSparWatermark("series-1", 2032*12+0);
    const syncedFromA = getSparWatermarksForSync();
    expect(syncedFromA["series-1"]).toBe(2032*12+0);

    kvStore.removeItem("mbt_spar_watermarks"); // Gerät B, frischer Speicher
    noteSparWatermark("series-1", 2031*12+0); // Gerät B kennt nur eine kleinere Spanne

    const changed = mergeRemoteSparWatermarks(syncedFromA);
    expect(changed).toBe(true);
    expect(getSparWatermark("series-1")).toBe(2032*12+0); // Maximum gewinnt
  });

  it("mergeRemoteSparWatermarks ignoriert ungültige Eingaben ohne Fehler", () => {
    expect(mergeRemoteSparWatermarks(null)).toBe(false);
    expect(mergeRemoteSparWatermarks(undefined)).toBe(false);
    expect(mergeRemoteSparWatermarks("not-an-object")).toBe(false);
    expect(mergeRemoteSparWatermarks({})).toBe(false);
  });

  it("getSparWatermarksForSync liefert eine leere Map ohne vorherige Wasserzeichen", () => {
    expect(getSparWatermarksForSync()).toEqual({});
  });
});
