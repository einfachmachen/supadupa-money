import { describe, it, expect } from "vitest";
import {
  PAYPAL_CREDITOR_ID,
  isPayPalGiroTx,
  payPalMerchant,
  merchantMatchesGiro,
  scoreMatch,
  assignPayPalLinks,
} from "../src/utils/paypalMatch.js";

// Eine PayPal-CSV-Zeile, wie der Parser sie liefert (desc = "Name · Typ · …").
const ppRow = (merchant, amount, isoDate, extra = "") => ({
  amount: -Math.abs(amount),
  isoDate,
  desc: `${merchant}${extra ? " · " + extra : ""}`,
});

// Eine Giro-Buchung (DKB-Lastschrift an PayPal). totalAmount wird in dieser App
// als positiver Absolutbetrag gespeichert (Vorzeichen steckt in _csvType).
const giro = (id, amount, date, merchant, opts = {}) => ({
  id,
  totalAmount: Math.abs(amount),
  date,
  desc: opts.desc || `PayPal Europe S.a.r.l. et Cie S.C.A. · . Ihr Einkauf bei ${merchant}`,
  ...(opts.creditorId ? { _creditorId: opts.creditorId } : {}),
});

describe("isPayPalGiroTx", () => {
  it("erkennt PayPal an der Gläubiger-ID", () => {
    expect(isPayPalGiroTx({ desc: "Lastschrift", _creditorId: PAYPAL_CREDITOR_ID })).toBe(true);
    expect(isPayPalGiroTx({ desc: "Lastschrift", _creditorId: "lu96zzz0000000000000000058" })).toBe(true);
  });
  it("erkennt PayPal am Empfängertext", () => {
    expect(isPayPalGiroTx({ desc: "PAYPAL EUROPE . Ihr Einkauf bei REWE" })).toBe(true);
    expect(isPayPalGiroTx({ desc: "PP.4711.PP . MERCHANT" })).toBe(true);
  });
  it("erkennt Nicht-PayPal-Buchungen NICHT", () => {
    expect(isPayPalGiroTx({ desc: "AMAZON PAYMENTS EUROPE Kartenzahlung" })).toBe(false);
    expect(isPayPalGiroTx({ desc: "REWE SAGT DANKE Kartenzahlung" })).toBe(false);
  });
});

describe("payPalMerchant / merchantMatchesGiro", () => {
  it("extrahiert den Händlernamen", () => {
    expect(payPalMerchant(ppRow("Spotify AB", 9.99, "2026-03-01"))).toBe("Spotify AB");
  });
  it("matcht Händler trotz Zusatztext im Giro-Zweck", () => {
    expect(merchantMatchesGiro("REWE", "PayPal Europe . Ihr Einkauf bei REWE SAGT DANKE")).toBe(true);
    expect(merchantMatchesGiro("Spotify AB", "PayPal . Ihr Einkauf bei Spotify")).toBe(true);
  });
  it("matcht NICHT auf bloßem PayPal-Boilerplate", () => {
    // Händler "Europe" wäre Stopword → kein Treffer
    expect(merchantMatchesGiro("Europe", "PayPal Europe . Ihr Einkauf bei XY")).toBe(false);
    expect(merchantMatchesGiro("Netflix", "PayPal . Ihr Einkauf bei Spotify")).toBe(false);
  });
});

describe("scoreMatch — Gating", () => {
  it("kein Treffer bei abweichendem Betrag", () => {
    expect(scoreMatch(ppRow("REWE", 10, "2026-03-01"), giro("g", 11, "2026-03-02", "REWE"), 35)).toBeNull();
  });
  it("kein Treffer bei Nicht-PayPal-Buchung", () => {
    const nonPp = { id: "g", totalAmount: -10, date: "2026-03-02", desc: "REWE Kartenzahlung" };
    expect(scoreMatch(ppRow("REWE", 10, "2026-03-01"), nonPp, 35)).toBeNull();
  });
  it("kein Treffer außerhalb des Datumsfensters", () => {
    expect(scoreMatch(ppRow("REWE", 10, "2026-03-01"), giro("g", 10, "2026-05-01", "REWE"), 35)).toBeNull();
  });
  it("Händler-Treffer → hohe Konfidenz", () => {
    const s = scoreMatch(ppRow("REWE", 10, "2026-03-01"), giro("g", 10, "2026-03-03", "REWE"), 35);
    expect(s.merchantMatch).toBe(true);
    expect(s.confidence).toBe("hoch");
  });
});

describe("assignPayPalLinks — eindeutige Zuordnung", () => {
  it("verknüpft eindeutigen Treffer 1:1", () => {
    const rows = [ppRow("Spotify", 9.99, "2026-03-01")];
    const giros = [giro("g1", 9.99, "2026-03-03", "Spotify")];
    const { links } = assignPayPalLinks(rows, giros, 35);
    expect(links.map(l => [l.rowIdx, l.giroTx.id])).toEqual([[0, "g1"]]);
  });

  it("ordnet gleich-hohe Buchungen anhand des Händlernamens korrekt zu", () => {
    // Zwei PayPal-Zahlungen über exakt 10,00 € — nur der Händlername unterscheidet.
    const rows = [
      ppRow("REWE", 10, "2026-03-01"),
      ppRow("Spotify", 10, "2026-03-02"),
    ];
    const giros = [
      giro("g-spotify", 10, "2026-03-04", "Spotify"),
      giro("g-rewe", 10, "2026-03-03", "REWE"),
    ];
    const { links } = assignPayPalLinks(rows, giros, 35);
    const byRow = Object.fromEntries(links.map(l => [l.rowIdx, l.giroTx.id]));
    expect(byRow[0]).toBe("g-rewe");
    expect(byRow[1]).toBe("g-spotify");
  });

  it("verknüpft NICHT wild, wenn gleich-hohe Buchungen ohne Händler-Treffer mehrdeutig sind", () => {
    // Zwei generische 10€-PayPal-Lastschriften ohne erkennbaren Händler im Zweck.
    const rows = [
      ppRow("Irgendwer", 10, "2026-03-01"),
      ppRow("Anderer", 10, "2026-03-02"),
    ];
    const giros = [
      giro("g1", 10, "2026-03-03", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
      giro("g2", 10, "2026-03-04", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
    ];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 35);
    expect(links).toHaveLength(0); // mehrdeutig → keine Auto-Verknüpfung
    expect(suggestions.length).toBeGreaterThan(0); // aber als Vorschlag sichtbar
  });

  it("respektiert manuell akzeptierte Zeilen/Buchungen (exclude)", () => {
    const rows = [ppRow("Spotify", 9.99, "2026-03-01")];
    const giros = [giro("g1", 9.99, "2026-03-03", "Spotify")];
    const { links } = assignPayPalLinks(rows, giros, 35, { excludeGiroIds: new Set(["g1"]) });
    expect(links).toHaveLength(0);
  });

  it("nutzt die Gläubiger-ID als PayPal-Nachweis, auch ohne 'paypal' im Text", () => {
    const rows = [ppRow("Spotify", 9.99, "2026-03-01")];
    const giros = [{
      id: "g1", totalAmount: 9.99, date: "2026-03-03",
      desc: "Lastschrift . Ihr Einkauf bei Spotify", _creditorId: PAYPAL_CREDITOR_ID,
    }];
    const { links } = assignPayPalLinks(rows, giros, 35);
    expect(links.map(l => l.giroTx.id)).toEqual(["g1"]);
  });
});

describe("assignPayPalLinks — Rauschen & Konfidenz-Gründe", () => {
  it("ignoriert positive Gegenbuchungen (Guthaben-Finanzierung)", () => {
    // Finanzblick-PayPal-CSV: jede Zahlung hat eine +X 'Sonstige Einnahmen'-Zeile.
    const rows = [{ amount: 15.98, isoDate: "2025-12-29", desc: "Successful · Rechnungs-Nr: OLNUE1" }];
    const giros = [giro("g1", 15.98, "2025-12-29", "Comtrada")];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 35);
    expect(links).toHaveLength(0);
    expect(suggestions).toHaveLength(0);
  });

  it("Händler-Treffer mit Belastung wenige Tage später → hoch", () => {
    const rows = [ppRow("Apple Services paypal-itunes-eur@group.apple.com", 10.99, "2025-08-26")];
    const giros = [giro("g1", 10.99, "2025-08-28", "Apple Services")];
    const { suggestions } = assignPayPalLinks(rows, giros, 40);
    expect(suggestions[0].confidence).toBe("hoch");
    expect(suggestions[0].reason).toMatch(/Händler/);
  });

  it("Händler-Treffer, aber Belastung ~30 Tage später → nur mittel (evtl. PayPal +30)", () => {
    const rows = [ppRow("Apple Services", 10.99, "2025-08-26")];
    const giros = [giro("g1", 10.99, "2025-09-25", "Apple Services")]; // 30 Tage
    const { suggestions } = assignPayPalLinks(rows, giros, 40);
    expect(suggestions[0].confidence).toBe("mittel");
    expect(suggestions[0].reason).toMatch(/30|\+30/);
  });

  it("Abo: näherer Treffer (wenige Tage) gewinnt, der ~Folgemonat wird niedrig", () => {
    // Apple monatlich: PayPal-Buchung 26.08., echte Belastung 28.08. (2 Tage),
    // der Treffer 26 Tage später (21.09.) ist der falsche Monat.
    const rows = [ppRow("Apple Services", 10.99, "2025-08-26")];
    const giros = [
      giro("near", 10.99, "2025-08-28", "Apple Services"),
      giro("far",  10.99, "2025-09-21", "Apple Services"),
    ];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 40);
    expect(links.map(l => l.giroTx.id)).toEqual(["near"]);
    const nearS = suggestions.find(s => s.giroTx.id === "near");
    const farS  = suggestions.find(s => s.giroTx.id === "far");
    expect(nearS.confidence).toBe("hoch");
    expect(farS.confidence).toBe("niedrig");
    expect(farS.reason).toMatch(/näherer Treffer/);
  });

  it("eindeutiger Betrag ohne Händler, Belastung wenige Tage später → mittel", () => {
    const rows = [{ amount: -7.5, isoDate: "2025-03-16", desc: "Successful · Rechnungs-Nr: X" }];
    const giros = [giro("g1", 7.5, "2025-03-20", "", { desc: "PayPal Europe . Allgemeine Abbuchung" })];
    const { suggestions } = assignPayPalLinks(rows, giros, 35);
    expect(suggestions[0].confidence).toBe("mittel");
    expect(suggestions[0].reason).toMatch(/eindeutig/);
  });

  it("mehrere gleich hohe ohne Händler → niedrig", () => {
    const rows = [
      { amount: -10.99, isoDate: "2025-08-26", desc: "Successful · Rechnungs-Nr: A" },
      { amount: -10.99, isoDate: "2025-09-26", desc: "Successful · Rechnungs-Nr: B" },
    ];
    const giros = [
      giro("g1", 10.99, "2025-08-28", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
      giro("g2", 10.99, "2025-09-28", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
    ];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 40);
    expect(links).toHaveLength(0); // ohne Händler + mehrdeutig → keine Auto-Verknüpfung
    expect(suggestions.every(s => s.confidence === "niedrig")).toBe(true);
  });

  it("bevorzugt das _recipient-Feld als Händlername", () => {
    const rows = [{ amount: -15.98, isoDate: "2025-12-29",
      desc: "Successful · Rechnungs-Nr: OLNUE1", _recipient: "COMTRADA GmbH paypal@comtrada.de" }];
    const giros = [giro("g1", 15.98, "2025-12-29", "Comtrada")];
    const { links } = assignPayPalLinks(rows, giros, 35);
    expect(links.map(l => l.giroTx.id)).toEqual(["g1"]);
  });
});
