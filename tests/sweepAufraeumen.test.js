// Nach dem Ausbau der Mega-Sparrate müssen ihre Buchungen verschwinden.
//
// Nutzer: „Meine Idee mit der Mega-Sparrate war leider pure Illusion. Es wird
// taggenau verzinst und nur am Ende jedes Quartals die Summe ausgezahlt. Von
// daher können wir das Feature wieder komplett entfernen."
//
// Code entfernen ist die eine Hälfte. Die andere sind die Spuren in den
// Buchungen: Wer die Automatik hat laufen lassen, hat eine auf mehrere tausend
// Euro angehobene Sparrate und zwei Rückbuchungen am nächsten Banktag im
// Bestand. Ohne dieses Aufräumen bliebe beides stehen — ohne dass es im
// Bildschirm noch irgendetwas gäbe, das es erklärt.

import { describe, it, expect } from "vitest";
import { sweepAufraeumen } from "../src/utils/sweepAufraeumen.js";

const rate = (extra = {}) => ({
  id: "rate", accountId: "acc-giro", date: "2026-09-30", pending: true,
  totalAmount: -2923, desc: "Sparen·Sparplan 1", _seriesId: "s1",
  splits: [{ id: "sp", catId: "c", subId: "", amount: -2923 }],
  _sweepHin: true, _sweepBasis: 473, ...extra,
});
const rueck = (id) => ({ id, accountId: "acc-giro", date: "2026-10-01", pending: true,
  totalAmount: 2450, desc: "Sweep-Rück·Sparplan 1", _sweepId: "sw1", splits: [] });

describe("Aufräumen nach der Mega-Sparrate", () => {
  it("die angehobene Rate fällt auf ihren ursprünglichen Betrag zurück", () => {
    const { txs } = sweepAufraeumen([rate()]);
    expect(txs).toHaveLength(1);
    expect(txs[0].totalAmount).toBe(-473);
    expect(txs[0].splits[0].amount, "der Split muss mitgehen").toBe(-473);
    // Sonst hielte der Sparplan sie beim nächsten Lauf für eine echte Rate.
    expect(txs[0]._sweepHin).toBeUndefined();
    expect(txs[0]._sweepBasis).toBeUndefined();
    // Alles andere bleibt, wie es war — es ist eine echte Sparrate.
    expect(txs[0]._seriesId).toBe("s1");
    expect(txs[0].date).toBe("2026-09-30");
  });

  it("die Rückbuchungen verschwinden — und werden gemeldet", () => {
    // Gemeldet, weil der Aufrufer Grabsteine setzen muss: Ohne die holt der
    // nächste Sync sie von einem anderen Gerät zurück.
    const { txs, entfernt } = sweepAufraeumen([rate(), rueck("r1"), rueck("r2")]);
    expect(txs).toHaveLength(1);
    expect(entfernt).toEqual(["r1", "r2"]);
  });

  it("eine bereits GEBUCHTE Sweep-Buchung bleibt unangetastet", () => {
    // Sie hat wirklich stattgefunden. Der Marker verliert seine Bedeutung, das
    // Geld nicht — eine echte Buchung zu löschen wäre Datenverlust.
    const gebucht = { ...rueck("r-echt"), pending: false };
    const { txs } = sweepAufraeumen([gebucht]);
    expect(txs).toHaveLength(1);
    expect(txs[0].totalAmount).toBe(2450);
    expect(txs[0]._sweepId, "nur die Markierung geht").toBeUndefined();
  });

  it("eine gebuchte, angehobene Rate behält ihren Betrag", () => {
    const gebucht = rate({ pending: false });
    const { txs } = sweepAufraeumen([gebucht]);
    expect(txs[0].totalAmount, "so ist das Geld wirklich geflossen").toBe(-2923);
    expect(txs[0]._sweepHin).toBeUndefined();
  });

  it("ohne Sweep-Spuren bleibt der Bestand DERSELBE", () => {
    // Wichtig für die Migration beim Laden: Ein neues Array bei jedem Start
    // würde einen Speichervorgang und einen Sync auslösen, ohne dass sich
    // etwas geändert hat.
    const bestand = [{ id: "a", pending: true, totalAmount: -100, splits: [] }];
    const { txs, geaendert, entfernt } = sweepAufraeumen(bestand);
    expect(txs).toBe(bestand);
    expect(geaendert).toBe(false);
    expect(entfernt).toEqual([]);
  });
});
