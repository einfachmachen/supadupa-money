// Realtest: Tombstones für gelöschte Buchungen verhindern, dass ein
// (teilweise fehlgeschlagener oder veralteter) Cloud-Snapshot eine lokal
// bereits gelöschte Buchung wieder aufleben lässt.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { kvStore } from "../src/utils/kvStore.js";
import { recordDeletedTxs, filterTombstonedTxs, getTombstonesForSync, mergeRemoteTombstones } from "../src/utils/txTombstones.js";

describe("txTombstones", () => {
  beforeEach(async () => {
    await kvStore.init();
    kvStore.removeItem("mbt_tx_tombstones");
  });

  it("filtert eine gelöschte Buchung aus einem Snapshot heraus, der ÄLTER ist als die Löschung", () => {
    const deletedAt = Date.now();
    recordDeletedTxs("tx-1");
    const snapshotTs = deletedAt - 60000; // Snapshot ist 1 Minute älter als die Löschung
    const txs = [{id:"tx-1", desc:"Tagesgeld-Buchung"}, {id:"tx-2", desc:"andere Buchung"}];
    const out = filterTombstonedTxs(txs, snapshotTs);
    expect(out.map(t=>t.id)).toEqual(["tx-2"]);
  });

  it("akzeptiert eine Buchung, die in einem NEUEREN Snapshot wieder auftaucht (bewusst neu angelegt)", () => {
    recordDeletedTxs("tx-1");
    const snapshotTs = Date.now() + 60000; // Snapshot ist neuer als die Löschung
    const txs = [{id:"tx-1", desc:"wurde offenbar neu angelegt"}];
    const out = filterTombstonedTxs(txs, snapshotTs);
    expect(out.map(t=>t.id)).toEqual(["tx-1"]);
  });

  it("lässt unbeteiligte Buchungen unverändert", () => {
    recordDeletedTxs("tx-1");
    const txs = [{id:"tx-2"}, {id:"tx-3"}];
    const out = filterTombstonedTxs(txs, Date.now());
    expect(out.map(t=>t.id)).toEqual(["tx-2","tx-3"]);
  });

  it("verarbeitet mehrere IDs auf einmal (Bulk-Löschung, z.B. Serie oder Duplikate)", () => {
    recordDeletedTxs(["tx-1","tx-2"]);
    const snapshotTs = Date.now() - 60000;
    const txs = [{id:"tx-1"},{id:"tx-2"},{id:"tx-3"}];
    const out = filterTombstonedTxs(txs, snapshotTs);
    expect(out.map(t=>t.id)).toEqual(["tx-3"]);
  });

  it("ignoriert leere/undefined IDs ohne Fehler", () => {
    expect(() => recordDeletedTxs([null, undefined, ""])).not.toThrow();
    const txs = [{id:"tx-1"}];
    expect(filterTombstonedTxs(txs, Date.now()).length).toBe(1);
  });

  it("gibt eine leere/kein-Array-Eingabe unverändert zurück", () => {
    expect(filterTombstonedTxs([], Date.now())).toEqual([]);
    expect(filterTombstonedTxs(undefined, Date.now())).toBeUndefined();
  });

  it("Geräte-übergreifend: eine auf Gerät A gelöschte Buchung wird auf Gerät B nach dem Merge lokal entfernt", () => {
    // Gerät A löscht und synchronisiert seine Tombstones
    recordDeletedTxs("tx-mac-1");
    const syncedFromA = getTombstonesForSync();
    expect(Object.keys(syncedFromA)).toContain("tx-mac-1");

    // Gerät B (frischer Tombstone-Speicher — simuliert eigenes Gerät) kennt
    // die Löschung noch nicht, hat die Buchung aber noch lokal in txs.
    kvStore.removeItem("mbt_tx_tombstones");
    expect(getTombstonesForSync()).toEqual({});

    const changed = mergeRemoteTombstones(syncedFromA);
    expect(changed).toBe(true);

    // Gerät B bereinigt seinen eigenen lokalen Stand (unconditional prune, ts=0)
    const localTxsOnB = [{id:"tx-mac-1", desc:"war auf Gerät B noch da"}, {id:"tx-other"}];
    const pruned = filterTombstonedTxs(localTxsOnB, 0);
    expect(pruned.map(t=>t.id)).toEqual(["tx-other"]);
  });

  it("mergeRemoteTombstones ignoriert ungültige Eingaben ohne Fehler", () => {
    expect(mergeRemoteTombstones(null)).toBe(false);
    expect(mergeRemoteTombstones(undefined)).toBe(false);
    expect(mergeRemoteTombstones("not-an-object")).toBe(false);
    expect(mergeRemoteTombstones({})).toBe(false);
  });

  it("getTombstonesForSync liefert eine leere Map ohne vorherige Löschungen", () => {
    expect(getTombstonesForSync()).toEqual({});
  });
});
