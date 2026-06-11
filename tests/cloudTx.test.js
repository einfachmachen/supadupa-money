import { describe, it, expect } from "vitest";
import { compressTx, compressTxByYear } from "../src/utils/cloudTx.js";

const fullTx = {
  id:"t1", date:"2026-06-10", totalAmount:-12.34, accountId:"acc-giro",
  desc:"Edeka", pending:true, _csvType:"expense", _budgetSubId:"sub-essen",
  _potSubId:"sub-unvorhergesehen", _linkedTo:"x", _seriesId:"s1", _seriesIdx:2,
  _seriesTotal:12, _seriesTyp:"miete", _fp:"fp1", note:"Notiz",
  valueDate:"2026-06-12", repeatMonths:3,
  splits:[{id:"sp1",catId:"cat-1",subId:"sub-essen",amount:-12.34}],
  linkedIds:["l1","l2"],
  // Laufzeit-Felder (dürfen NICHT persistiert werden):
  _mitteAmt:5, _endeAmt:7, _isBudgetPair:true, _readOnlyAmount:1,
};

describe("compressTx", () => {
  it("erhält alle persistenten Felder (inkl. valueDate & _potSubId)", () => {
    const c = compressTx(fullTx);
    for (const k of ["id","date","totalAmount","accountId","desc","pending",
      "_csvType","_budgetSubId","_potSubId","_linkedTo","_seriesId","_seriesIdx",
      "_seriesTotal","_seriesTyp","_fp","note","valueDate","repeatMonths",
      "splits","linkedIds"]) {
      expect(c[k], `Feld ${k} fehlt`).toEqual(fullTx[k]);
    }
  });
  it("entfernt Laufzeit-Felder", () => {
    const c = compressTx(fullTx);
    for (const k of ["_mitteAmt","_endeAmt","_isBudgetPair","_readOnlyAmount"]) {
      expect(c).not.toHaveProperty(k);
    }
  });
  it("lässt leere/Default-Felder weg (kompakt)", () => {
    const c = compressTx({ id:"t2", date:"2026-01-01", totalAmount:0, accountId:"acc-giro" });
    expect(Object.keys(c).sort()).toEqual(["accountId","date","id","totalAmount"]);
    // repeatMonths===1 ist Default → weg
    expect(compressTx({ id:"t3", date:"2026-01-01", totalAmount:0, accountId:"a", repeatMonths:1 }))
      .not.toHaveProperty("repeatMonths");
  });
  it("Round-Trip: komprimierte Buchung bleibt als Buchung nutzbar", () => {
    const c = compressTx(fullTx);
    // erneut komprimieren ist idempotent
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
