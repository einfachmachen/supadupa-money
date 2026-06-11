import { describe, it, expect } from "vitest";
import { compressTx, compressTxByYear } from "../src/utils/cloudTx.js";

const fullTx = {
  id:"t1", date:"2026-06-10", totalAmount:-12.34, accountId:"acc-giro",
  desc:"Edeka", pending:true, _csvType:"expense", _budgetSubId:"sub-essen",
  _potSubId:"sub-unvorhergesehen", _linkedTo:"x", _seriesId:"s1", _seriesIdx:2,
  _seriesTotal:12, _seriesTyp:"miete", _fp:"fp1", note:"Notiz",
  valueDate:"2026-06-12", repeatMonths:3, pendingDate:"2026-06-15",
  _csvSource:"DKB.csv", _exSeriesId:"s1", _isException:true, _readOnlyAmount:true,
  _splitsBeforeLink:[{id:"old"}],
  splits:[{id:"sp1",catId:"cat-1",subId:"sub-essen",amount:-12.34}],
  linkedIds:["l1","l2"],
  // Laufzeit-/Anzeige-Felder (dürfen NICHT persistiert werden):
  _mitteAmt:5, _endeAmt:7, _isBudgetPair:true, _partnerId:"p1",
};

describe("compressTx (Blacklist / sicheres Prinzip)", () => {
  it("erhält ALLE dauerhaften Felder (auch zuvor verlorene)", () => {
    const c = compressTx(fullTx);
    for (const k of ["id","date","totalAmount","accountId","desc","pending",
      "_csvType","_budgetSubId","_potSubId","_linkedTo","_seriesId","_seriesIdx",
      "_seriesTotal","_seriesTyp","_fp","note","valueDate","repeatMonths",
      "pendingDate","_csvSource","_exSeriesId","_isException","_readOnlyAmount",
      "_splitsBeforeLink","splits","linkedIds"]) {
      expect(c[k], `Feld ${k} fehlt`).toEqual(fullTx[k]);
    }
  });
  it("entfernt nur die Laufzeit-/Anzeige-Felder", () => {
    const c = compressTx(fullTx);
    for (const k of ["_mitteAmt","_endeAmt","_isBudgetPair","_partnerId"]) {
      expect(c).not.toHaveProperty(k);
    }
  });
  it("KERN: ein neues/unbekanntes Feld überlebt automatisch", () => {
    // Das ist der Sinn der Blacklist — kein künftiges Feld geht mehr verloren.
    const c = compressTx({ ...fullTx, _neuesZukunftsfeld:"wichtig" });
    expect(c._neuesZukunftsfeld).toBe("wichtig");
  });
  it("bleibt kompakt: leere/Default-Werte weg, aber totalAmount:0 bleibt", () => {
    const c = compressTx({ id:"t2", date:"2026-01-01", totalAmount:0, accountId:"acc-giro",
      desc:undefined, splits:[], repeatMonths:1, note:null });
    expect(Object.keys(c).sort()).toEqual(["accountId","date","id","totalAmount"]);
    expect(c.totalAmount).toBe(0); // 0 ist ein gültiger Betrag, bleibt erhalten
  });
  it("ist idempotent (Round-Trip stabil)", () => {
    const c = compressTx(fullTx);
    expect(compressTx(c)).toEqual(c);
  });
  it("compressTxByYear gruppiert nach Jahr", () => {
    const by = compressTxByYear([
      { id:"a", date:"2025-12-31", totalAmount:1, accountId:"x" },
      { id:"b", date:"2026-01-01", totalAmount:2, accountId:"x" },
      { id:"c", date:"2026-06-01", totalAmount:3, accountId:"x" },
    ]);
    expect(Object.keys(by).sort()).toEqual(["2025","2026"]);
    expect(by["2026"].map(t=>t.id)).toEqual(["b","c"]);
  });
});
