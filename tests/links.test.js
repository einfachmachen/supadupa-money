import { describe, it, expect } from "vitest";
import { liveLinkedGiroIds, dropTxsAndUnlink } from "../src/utils/links.js";

describe("liveLinkedGiroIds", () => {
  it("schließt nur Giro-Buchungen mit LEBENDER Verknüpfung aus", () => {
    const txs = [
      { id: "g1", pending: false, linkedIds: ["p1"] },          // p1 existiert → ausgeschlossen
      { id: "p1", pending: true, _linkedTo: "g1" },
      { id: "g2", pending: false, linkedIds: ["geloescht"] },   // Partner weg → matchbar
      { id: "g3", pending: false },                              // kein Link → matchbar
    ];
    const out = liveLinkedGiroIds(txs);
    expect(out.has("g1")).toBe(true);
    expect(out.has("g2")).toBe(false); // Regression: verwaister Link darf NICHT ausschließen
    expect(out.has("g3")).toBe(false);
  });

  it("ignoriert Vormerkungen (pending) als Giro-Seite", () => {
    const txs = [{ id: "v1", pending: true, linkedIds: ["x"] }, { id: "x", pending: false }];
    expect(liveLinkedGiroIds(txs).has("v1")).toBe(false);
  });
});

describe("dropTxsAndUnlink", () => {
  it("löscht Buchungen und entfernt verwaiste linkedIds bei verbleibenden", () => {
    const txs = [
      { id: "g1", pending: false, linkedIds: ["p1", "p2"] },
      { id: "p1", pending: false, accountId: "acc-paypal", _linkedTo: "g1" },
      { id: "p2", pending: false, accountId: "acc-paypal", _linkedTo: "g1" },
    ];
    // Lösche die beiden PayPal-Buchungen
    const out = dropTxsAndUnlink(txs, t => t.accountId === "acc-paypal");
    expect(out.map(t => t.id)).toEqual(["g1"]);
    expect(out[0].linkedIds).toEqual([]); // beide Referenzen entfernt
  });

  it("räumt verwaiste _linkedTo der Gegenseite auf", () => {
    const txs = [
      { id: "g1", pending: false, linkedIds: ["v1"] },
      { id: "v1", pending: false, _linkedTo: "g1" },
    ];
    const out = dropTxsAndUnlink(txs, t => t.id === "g1");
    expect(out.map(t => t.id)).toEqual(["v1"]);
    expect(out[0]._linkedTo).toBe(null);
  });

  it("gibt die Liste unverändert zurück, wenn nichts gelöscht wird", () => {
    const txs = [{ id: "a" }, { id: "b" }];
    expect(dropTxsAndUnlink(txs, () => false)).toBe(txs);
  });
});
