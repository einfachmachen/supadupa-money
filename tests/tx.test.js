import { describe, it, expect } from "vitest";
import { isSparTransfer, isDuplCounterpart, buildTxIdMap } from "../src/utils/tx.js";

describe("isSparTransfer / isDuplCounterpart (mit Index)", () => {
  // CSV-Verknüpfung: zwei Buchungen auf demselben Konto
  const csvScenario = () => {
    const planned = { id: "p1", accountId: "acc-giro", pending: false, _linkedTo: "real1", desc: "Miete" };
    const real    = { id: "real1", accountId: "acc-giro", pending: false, desc: "Miete" };
    return { txs: [planned, real], planned, real };
  };

  // Konten-Transfer: Buchungen auf zwei verschiedenen Konten
  const transferScenario = () => {
    const abgang = { id: "ab1", accountId: "acc-giro",     pending: true, desc: "Tagesgeld-Sparen Unterhalt Matteo", totalAmount: -205 };
    const zugang = { id: "zu1", accountId: "acc-tagesgeld", pending: true, desc: "Tagesgeld-Sparen Unterhalt Matteo", totalAmount: +205, _linkedTo: "ab1" };
    return { txs: [abgang, zugang], abgang, zugang };
  };

  // Alter Sparen·-Style: Beschreibung startsWith("Sparen·"), Partner auf anderem Konto
  const sparenStyleScenario = () => {
    const abgang = { id: "ab2", accountId: "acc-giro",     pending: true, desc: "Sparen·Tagesgeld", totalAmount: -971 };
    const zugang = { id: "zu2", accountId: "acc-tagesgeld", pending: true, desc: "Sparen·Tagesgeld", totalAmount: +971, _linkedTo: "ab2" };
    return { txs: [abgang, zugang], abgang, zugang };
  };

  it("CSV-Verknüpfung: planned-Tx wird als Duplicate erkannt", () => {
    const { txs, planned } = csvScenario();
    const idx = buildTxIdMap(txs);
    expect(isDuplCounterpart(planned, idx)).toBe(true);
    expect(isSparTransfer(planned, idx)).toBe(false);
  });

  it("CSV-Verknüpfung: reale Tx ohne _linkedTo ist weder Dupl noch Transfer", () => {
    const { txs, real } = csvScenario();
    const idx = buildTxIdMap(txs);
    expect(isDuplCounterpart(real, idx)).toBe(false);
    expect(isSparTransfer(real, idx)).toBe(false);
  });

  it("Konten-Transfer 'Tagesgeld-Sparen Unterhalt Matteo': zugang ist Transfer, NICHT Dupl", () => {
    const { txs, zugang } = transferScenario();
    const idx = buildTxIdMap(txs);
    expect(isSparTransfer(zugang, idx)).toBe(true);
    expect(isDuplCounterpart(zugang, idx)).toBe(false);
  });

  it("Konten-Transfer 'Sparen·Tagesgeld': zugang ist Transfer, NICHT Dupl", () => {
    const { txs, zugang } = sparenStyleScenario();
    const idx = buildTxIdMap(txs);
    expect(isSparTransfer(zugang, idx)).toBe(true);
    expect(isDuplCounterpart(zugang, idx)).toBe(false);
  });

  it("Index fehlt: Fallback auf Description (alte Logik) — Sparen· erkannt", () => {
    const zugang = { id: "z", accountId: "acc-tagesgeld", _linkedTo: "x", desc: "Sparen·Tagesgeld" };
    expect(isSparTransfer(zugang)).toBe(true);
    expect(isDuplCounterpart(zugang)).toBe(false);
  });

  it("Index fehlt + Description NICHT Sparen·: fallback klassifiziert als Dupl (Bug-Fall)", () => {
    // Genau dieser Fall war der Bug: ohne Index und ohne "Sparen·" wurde falsch als CSV-Doppel klassifiziert
    const zugang = { id: "z", accountId: "acc-tagesgeld", _linkedTo: "x", desc: "Tagesgeld-Sparen Unterhalt Matteo" };
    expect(isSparTransfer(zugang)).toBe(false);   // fallback: false weil kein "Sparen·"
    expect(isDuplCounterpart(zugang)).toBe(true); // fallback: true ⇒ ausgefiltert ⇒ war der Bug
  });

  it("Mit Index: derselbe 'Tagesgeld-Sparen Unterhalt Matteo' wird KORREKT als Transfer erkannt", () => {
    const abgang = { id: "ab", accountId: "acc-giro" };
    const zugang = { id: "zu", accountId: "acc-tagesgeld", _linkedTo: "ab", desc: "Tagesgeld-Sparen Unterhalt Matteo" };
    const idx = buildTxIdMap([abgang, zugang]);
    expect(isSparTransfer(zugang, idx)).toBe(true);
    expect(isDuplCounterpart(zugang, idx)).toBe(false);
  });

  it("Tx ohne _linkedTo: weder Dupl noch Transfer", () => {
    const t = { id: "x", accountId: "acc-giro", desc: "normale Buchung" };
    const idx = buildTxIdMap([t]);
    expect(isSparTransfer(t, idx)).toBe(false);
    expect(isDuplCounterpart(t, idx)).toBe(false);
  });

  it("Partner-Tx nicht in Index gefunden: konservativer Fallback = Dupl", () => {
    const t = { id: "x", accountId: "acc-giro", _linkedTo: "non-existent" };
    const idx = buildTxIdMap([t]); // Partner-ID 'non-existent' nicht im Index
    expect(isDuplCounterpart(t, idx)).toBe(true);  // konservativ als Dupl behandeln
    expect(isSparTransfer(t, idx)).toBe(false);
  });

  it("Konten-Transfer beidseitig: BEIDE Buchungen werden als Transfer erkannt", () => {
    // Wichtig: Sowohl abgang (auf Giro) als auch zugang (auf Tagesgeld) sollten als Transfer
    // gelten, damit der Abgang in Giro als − und der Zugang in Tagesgeld als + gezählt wird.
    // _linkedTo kann beidseitig oder einseitig gesetzt sein — wir testen beide Varianten.
    const abgang = { id: "ab", accountId: "acc-giro", _linkedTo: "zu" };  // mit gegenseitiger Verknüpfung
    const zugang = { id: "zu", accountId: "acc-tagesgeld", _linkedTo: "ab" };
    const idx = buildTxIdMap([abgang, zugang]);
    expect(isSparTransfer(abgang, idx)).toBe(true);
    expect(isSparTransfer(zugang, idx)).toBe(true);
    expect(isDuplCounterpart(abgang, idx)).toBe(false);
    expect(isDuplCounterpart(zugang, idx)).toBe(false);
  });
});
