import { describe, it, expect } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { autoMatchVormerkungen, linkPendingToReal, linkPendingToPending, isBankPending } from "../src/utils/vormMatch.js";
import { getVormLinkCandidates, isVormAmountMatch, VormVerknuepfenPanel } from "../src/components/organisms/VormVerknuepfenPanel.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

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

// Regression: während einer Offline-Phase (Flugmodus) legt der Nutzer manuell
// eine Vormerkung an; sobald wieder online, meldet der Bank-Abruf dieselbe
// Zahlung bereits als eigene, noch bei der Bank vorgemerkte (PDNG) Zeile
// (_bankPending). Beide dürfen NICHT als zwei getrennte offene Vormerkungen
// stehen bleiben (sonst zählt die Prognose den Betrag doppelt) — der Nutzer
// muss sie manuell verknüpfen können, auch wenn die Bank-Zeile selbst noch
// nicht "real" gebucht ist.
describe("linkPendingToPending — manuelle Vormerkung mit Bank-vorgemerkter Zeile verschmelzen", () => {
  const manual = (over={}) => pend({ id:"pend-manual", desc:"Miete", note:"", ...over });
  const bankPending = (over={}) => ({
    id:"pend-bank", pending:true, _bankPending:true, date:"2026-07-01", totalAmount:-2.98,
    desc:"REWE Koblenz", note:"", accountId:"acc-giro", splits:[], _csvType:"expense", ...over,
  });

  it("verschmilzt beide: Bank-Zeile bleibt pending, manuelle Vormerkung wird verlinkt/retiriert", () => {
    const txs = linkPendingToPending([manual(), bankPending()], "pend-manual", "pend-bank");
    const m = txs.find(t=>t.id==="pend-manual");
    const b = txs.find(t=>t.id==="pend-bank");
    expect(m.pending).toBe(false);
    expect(m._linkedTo).toBe("pend-bank");
    expect(b.pending).toBe(true); // noch nicht real gebucht — bleibt Platzhalter
    expect(b._bankPending).toBe(true);
    expect(b.linkedIds).toContain("pend-manual");
  });

  it("übernimmt die Kategorie der manuellen Vormerkung auf die Bank-Zeile", () => {
    const txs = linkPendingToPending([manual(), bankPending()], "pend-manual", "pend-bank");
    const b = txs.find(t=>t.id==="pend-bank");
    expect(b.splits[0].catId).toBe("cat-essen");
  });

  it("markiert eine Betragsabweichung zwischen manueller Schätzung und Bank-Betrag", () => {
    const txs = linkPendingToPending([manual(), bankPending({ totalAmount:-5.00 })], "pend-manual", "pend-bank");
    const b = txs.find(t=>t.id==="pend-bank");
    expect(b._amtMismatch).toBeTruthy();
  });

  it("getVormLinkCandidates bietet Bank-vorgemerkte Zeilen als Kandidaten an, normale Vormerkungen aber nicht", () => {
    const otherManual = { id:"pend-other", pending:true, date:"2026-07-01", accountId:"acc-giro", totalAmount:-2.98 };
    const candidates = getVormLinkCandidates([bankPending(), otherManual], manual());
    expect(candidates.map(c=>c.id)).toEqual(["pend-bank"]);
  });

  // Regression (echter Nutzer-Bericht): Zwei bereits vor Einführung des
  // _bankPending-Flags importierte/angelegte Vormerkungen für denselben
  // Flug (eine manuell, eine von der Bank/CSV übernommen — OHNE das neue
  // Flag, da die Daten älter sind) ließen sich über "Buchung/Vormerkung
  // zuordnen" nicht verknüpfen, weil die Bank-Zeile mangels Flag als
  // "normale Vormerkung" durchging und komplett aus den Kandidaten fiel.
  // isBankPending() muss solche Alt-Datensätze anhand von _fp/_csvSource/
  // _ebRef zuverlässig erkennen, auch ganz ohne explizites Flag.
  it("erkennt Bank-vorgemerkte Zeilen auch OHNE explizites _bankPending-Flag (Altdaten) anhand von _fp/_csvSource", () => {
    const legacyBankRow = {
      id:"pend-legacy-bank", pending:true, date:"2026-07-13", totalAmount:-39.90,
      desc:"Eurowings Frankfurt am DE", note:"", accountId:"acc-giro",
      splits:[], _csvType:"expense", _fp:"fp-eurowings", _csvSource:"Enable Banking",
      // KEIN _bankPending — genau das Altdaten-Szenario.
    };
    expect(isBankPending(legacyBankRow)).toBe(true);

    const manualEurowings = manual({ id:"pend-manual-eurowings", desc:"Boss Man Eurowings",
      date:"2026-07-13", totalAmount:-39.90 });
    const candidates = getVormLinkCandidates([legacyBankRow], manualEurowings);
    expect(candidates.map(c=>c.id)).toEqual(["pend-legacy-bank"]);
  });

  it("bietet die bearbeitete Vormerkung nie als Kandidat für sich selbst an", () => {
    const selfBankRow = bankPending({ id:"pend-self" });
    const candidates = getVormLinkCandidates([selfBankRow], selfBankRow);
    expect(candidates).toEqual([]);
  });

  it("isBankPending ist false für eine ganz normale manuelle Vormerkung", () => {
    expect(isBankPending(manual())).toBe(false);
  });

  // Regression (echter Nutzer-Bericht): von der manuellen Vormerkung aus ließ
  // sich die Bank-Zeile verknüpfen — umgekehrt, von der Bank-vorgemerkten
  // Zeile aus bearbeitet, wurde die manuelle Vormerkung aber NICHT als
  // Kandidat angeboten (die Kandidaten-Filterung war einseitig).
  it("bietet von der Bank-vorgemerkten Zeile aus die manuelle Vormerkung als Kandidat an (symmetrisch)", () => {
    const candidates = getVormLinkCandidates([manual()], bankPending());
    expect(candidates.map(c=>c.id)).toEqual(["pend-manual"]);
  });

  it("bietet zwei Bank-vorgemerkte Zeilen NICHT gegenseitig als Kandidat an", () => {
    const otherBank = bankPending({ id:"pend-bank-2" });
    const candidates = getVormLinkCandidates([otherBank], bankPending());
    expect(candidates).toEqual([]);
  });

  // Regression: beim Verknüpfen ausgehend von der Bank-Zeile (editVorm =
  // Bank-vorgemerkt, Kandidat = manuell) darf NICHT die Bank-Zeile retiriert
  // werden — sie muss immer der lebende Platzhalter bleiben, unabhängig von
  // der Klick-Reihenfolge/-Richtung.
  it("verknüpft über die UI korrekt orientiert, auch wenn von der Bank-Zeile aus gestartet wird", () => {
    const manualVorm = manual();
    const bankVorm = bankPending();
    const txs = [manualVorm, bankVorm];
    let latestTxs = txs;
    const setTxs = (updater) => { latestTxs = typeof updater === "function" ? updater(latestTxs) : updater; };

    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(VormVerknuepfenPanel,
        { editVorm: bankVorm, txs, setTxs, onClose: () => {} }));
    });
    const toggleBtn = container.querySelector("button");
    act(() => { toggleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const candidateRow = [...container.querySelectorAll("div")]
      .find(d => d.style.cursor === "pointer" && d.textContent.includes("Miete"));
    expect(candidateRow).toBeTruthy();
    act(() => { candidateRow.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    const manualAfter = latestTxs.find(t=>t.id==="pend-manual");
    const bankAfter = latestTxs.find(t=>t.id==="pend-bank");
    expect(manualAfter.pending).toBe(false);
    expect(manualAfter._linkedTo).toBe("pend-bank");
    expect(bankAfter.pending).toBe(true); // Bank-Zeile bleibt der lebende Platzhalter
    expect(bankAfter.linkedIds).toContain("pend-manual");
    root.unmount();
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
