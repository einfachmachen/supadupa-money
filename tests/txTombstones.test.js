// Realtest: Tombstones für gelöschte Buchungen verhindern, dass ein
// (teilweise fehlgeschlagener oder veralteter) Cloud-Snapshot eine lokal
// bereits gelöschte Buchung wieder aufleben lässt.
//
// WICHTIG: filterTombstonedTxs() filtert bedingungslos — eine frühere
// Fassung verwarf den Tombstone, sobald der Snapshot "neuer" aussah
// (verglichen an saved_at). Das war der eigentliche Bug hinter monatelang
// gemeldeten "gelöschte Buchung kommt nach dem Laden zurück"-Fällen: saved_at
// ist ein globaler Zeitstempel, der bei jeder Kleinigkeit vorrückt, nicht nur
// wenn genau diese Buchung absichtlich neu angelegt wurde (siehe Kommentar
// in utils/txTombstones.js).
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { kvStore } from "../src/utils/kvStore.js";
import { recordDeletedTxs, filterTombstonedTxs, getTombstonesForSync, mergeRemoteTombstones } from "../src/utils/txTombstones.js";

describe("txTombstones", () => {
  beforeEach(async () => {
    await kvStore.init();
    kvStore.removeItem("mbt_tx_tombstones");
  });

  it("filtert eine gelöschte Buchung bedingungslos heraus", () => {
    recordDeletedTxs("tx-1");
    const txs = [{id:"tx-1", desc:"Tagesgeld-Buchung"}, {id:"tx-2", desc:"andere Buchung"}];
    const out = filterTombstonedTxs(txs);
    expect(out.map(t=>t.id)).toEqual(["tx-2"]);
  });

  it("REGRESSION: eine gelöschte Buchung bleibt gefiltert, auch wenn der Snapshot einen viel späteren saved_at-Zeitstempel trägt (früher fälschlich akzeptiert)", () => {
    recordDeletedTxs("tx-1");
    // saved_at des Snapshots liegt WEIT in der Zukunft — jede Kleinigkeit
    // (Theme, Budget, …) kann saved_at vorziehen, ohne dass die Buchung
    // selbst je bewusst neu angelegt wurde.
    const txs = [{id:"tx-1", desc:"sollte trotzdem gefiltert werden"}];
    const out = filterTombstonedTxs(txs);
    expect(out.map(t=>t.id)).toEqual([]);
  });

  it("lässt unbeteiligte Buchungen unverändert", () => {
    recordDeletedTxs("tx-1");
    const txs = [{id:"tx-2"}, {id:"tx-3"}];
    const out = filterTombstonedTxs(txs);
    expect(out.map(t=>t.id)).toEqual(["tx-2","tx-3"]);
  });

  it("verarbeitet mehrere IDs auf einmal (Bulk-Löschung, z.B. Serie oder Duplikate)", () => {
    recordDeletedTxs(["tx-1","tx-2"]);
    const txs = [{id:"tx-1"},{id:"tx-2"},{id:"tx-3"}];
    const out = filterTombstonedTxs(txs);
    expect(out.map(t=>t.id)).toEqual(["tx-3"]);
  });

  it("ignoriert leere/undefined IDs ohne Fehler", () => {
    expect(() => recordDeletedTxs([null, undefined, ""])).not.toThrow();
    const txs = [{id:"tx-1"}];
    expect(filterTombstonedTxs(txs).length).toBe(1);
  });

  it("gibt eine leere/kein-Array-Eingabe unverändert zurück", () => {
    expect(filterTombstonedTxs([])).toEqual([]);
    expect(filterTombstonedTxs(undefined)).toBeUndefined();
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

    // Gerät B bereinigt seinen eigenen lokalen Stand
    const localTxsOnB = [{id:"tx-mac-1", desc:"war auf Gerät B noch da"}, {id:"tx-other"}];
    const pruned = filterTombstonedTxs(localTxsOnB);
    expect(pruned.map(t=>t.id)).toEqual(["tx-other"]);
  });

  it("REGRESSION: Flip-Flop-Szenario (Laden bringt Buchung zurück, Speichern entfernt sie wieder) tritt nicht mehr auf", () => {
    // Gerät A hat vor langer Zeit gelöscht und synchronisiert.
    recordDeletedTxs("tx-2033");
    const cloudTombstones = getTombstonesForSync();

    // Gerät B: frischer lokaler Tombstone-Speicher, aber die Buchung liegt
    // lokal noch vor (z.B. weil sie dort nie gelöscht wurde). Ein ganz
    // normaler Cloud-Load liefert die Buchung erneut mit (Cloud hat sie
    // durch einen früheren, inzwischen behobenen Bug nie entfernt) —
    // trotzdem darf sie NICHT zurückkommen, sobald Gerät B die Tombstones
    // gemergt hat, unabhängig vom saved_at des Snapshots.
    kvStore.removeItem("mbt_tx_tombstones");
    mergeRemoteTombstones(cloudTombstones);
    const cloudTxs = [{id:"tx-2033", desc:"Tagesgeld-Einnahme"}, {id:"tx-other"}];
    const afterLoad = filterTombstonedTxs(cloudTxs);
    expect(afterLoad.map(t=>t.id)).toEqual(["tx-other"]);
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
