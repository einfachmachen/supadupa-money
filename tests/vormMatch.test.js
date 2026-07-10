import { describe, it, expect } from "vitest";
import { autoMatchVormerkungen, linkPendingToReal } from "../src/utils/vormMatch.js";
import { getVormLinkCandidates, isVormAmountMatch } from "../src/components/organisms/VormVerknuepfenPanel.jsx";

const pend = (over={}) => ({
  id:"pend-1", pending:true, date:"2026-07-01", totalAmount:-2.98,
  desc:"REWE Koblenz", note:"", accountId:"acc-giro",
  splits:[{id:"s1",catId:"cat-essen",subId:"",amount:2.98}],
  _csvType:"expense", ...over,
});
const real = (over={}) => ({
  id:"real-1", pending:false, date:"2026-07-01", totalAmount:2.98,
  desc:"REWE.Koblenz.Hohenfelde/Koblenz", note:"", accountId:"acc-giro",
  splits:[], _csvType:"expense", ...over,
});

describe("autoMatchVormerkungen", () => {
  it("verknüpft eindeutigen Treffer (gleiches Konto, exakter Betrag, enges Datumsfenster)", () => {
    const { txs, linkedCount } = autoMatchVormerkungen([pend(), real()]);
    expect(linkedCount).toBe(1);
    const p = txs.find(t=>t.id==="pend-1");
    const r = txs.find(t=>t.id==="real-1");
    expect(p.pending).toBe(false);
    expect(p._linkedTo).toBe("real-1");
    expect(r.linkedIds).toContain("pend-1");
    expect(r.splits[0].catId).toBe("cat-essen"); // Kategorie der Vormerkung übernommen
  });

  it("verknüpft NICHT, wenn mehrere Buchungen als Kandidat infrage kommen (mehrdeutig)", () => {
    const dup = real({ id:"real-2" });
    const { txs, linkedCount } = autoMatchVormerkungen([pend(), real(), dup]);
    expect(linkedCount).toBe(0);
    expect(txs.find(t=>t.id==="pend-1").pending).toBe(true);
  });

  it("verknüpft NICHT über verschiedene Konten hinweg", () => {
    const { linkedCount } = autoMatchVormerkungen([pend(), real({ accountId:"acc-tagesgeld" })]);
    expect(linkedCount).toBe(0);
  });

  it("verknüpft NICHT bei abweichendem Betrag", () => {
    const { linkedCount } = autoMatchVormerkungen([pend(), real({ totalAmount:3.50 })]);
    expect(linkedCount).toBe(0);
  });

  it("verknüpft NICHT außerhalb des Datumsfensters (>10 Tage)", () => {
    const { linkedCount } = autoMatchVormerkungen([pend(), real({ date:"2026-07-20" })]);
    expect(linkedCount).toBe(0);
  });

  it("lässt Budget-Platzhalter (_budgetSubId) unangetastet", () => {
    const { linkedCount } = autoMatchVormerkungen([pend({ _budgetSubId:"budget-1" }), real()]);
    expect(linkedCount).toBe(0);
  });

  it("linkPendingToReal übernimmt Splits der Vormerkung und markiert Betragsabweichung", () => {
    const txs = linkPendingToReal([pend(), real({ totalAmount:3.10 })], "pend-1", "real-1");
    const r = txs.find(t=>t.id==="real-1");
    expect(r._amtMismatch).toBeTruthy();
    expect(r._amtMismatch.realAmt).toBe(3.10);
  });
});

// Regression: Eine vom Bank-Live-Abruf übernommene Vormerkung trägt ihren
// Betrag vorzeichenbehaftet (z.B. -2,98 €), die später eintreffende echte
// Buchung aber als reinen Betrag (2,98 €). Die "Buchung zuordnen"-Vorschlags-
// liste verglich bisher die ROHE Differenz (-2,98 - 2,98 = -5,96) statt
// Beträge — die eigentlich passende Buchung wurde nie als Treffer erkannt
// und konnte bei vielen Buchungen im Monat aus den angezeigten Top 8
// herausfallen (genau das vom Nutzer gemeldete Symptom: "die tatsächliche
// Buchung wird gar nicht angeboten").
describe("VormVerknuepfenPanel — Betrags-Matching bei Vorzeichen-Asymmetrie", () => {
  const signedPend = { id:"pend-1", date:"2026-07-01", accountId:"acc-giro", totalAmount:-2.98 };
  const absoluteReal = (over={}) => ({ id:"real-1", date:"2026-07-01", accountId:"acc-giro",
    pending:false, totalAmount:2.98, ...over });

  it("erkennt den Betrag als Treffer trotz unterschiedlicher Vorzeichen", () => {
    expect(isVormAmountMatch(absoluteReal(), signedPend)).toBe(true);
  });

  it("sortiert die passende echte Buchung ganz nach vorne, auch unter vielen anderen Buchungen", () => {
    const others = Array.from({length:10}, (_,i)=>absoluteReal({ id:"other-"+i, totalAmount:12.34+i }));
    const txs = [...others, absoluteReal()];
    const candidates = getVormLinkCandidates(txs, signedPend);
    expect(candidates[0].id).toBe("real-1");
  });
});
