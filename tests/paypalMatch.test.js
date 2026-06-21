import { describe, it, expect } from "vitest";
import {
  PAYPAL_CREDITOR_ID,
  isPayPalGiroTx,
  payPalMerchant,
  merchantMatchesGiro,
  scoreMatch,
  assignPayPalLinks,
  enrichPayPalMerchants,
  dropPayPalCounterBookings,
  detectPayPalRefunds,
  reconcilePayPalLegs,
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
  _csvType: opts.csvType || "expense",
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
      id: "g1", totalAmount: 9.99, date: "2026-03-03", _csvType: "expense",
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
    expect(nearS.confidence).toBe("hoch");
    // Der ~Folgemonat-Treffer wird gar nicht erst vorgeschlagen (redundant).
    expect(suggestions.find(s => s.giroTx.id === "far")).toBeUndefined();
  });

  it("eindeutiger Betrag ohne Händler, Belastung wenige Tage später → hoch (im engen Fenster konkurrenzlos)", () => {
    const rows = [{ amount: -7.5, isoDate: "2025-03-16", desc: "Successful · Rechnungs-Nr: X" }];
    const giros = [giro("g1", 7.5, "2025-03-20", "", { desc: "PayPal Europe . Allgemeine Abbuchung" })];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 35);
    expect(suggestions[0].confidence).toBe("hoch");
    expect(suggestions[0].reason).toMatch(/eindeutig/);
    expect(links.map(l => l.giroTx.id)).toEqual(["g1"]);
  });

  it("monatliches Abo: jeder Monat wird trotz gleicher Beträge sauber 1:1 zugeordnet (hoch)", () => {
    // Gleicher Betrag mehrfach im Jahr, aber je Monat ein klarer Wenige-Tage-Treffer.
    const rows = [
      { amount: -10.99, isoDate: "2025-08-26", desc: "Successful · Rechnungs-Nr: A" },
      { amount: -10.99, isoDate: "2025-09-26", desc: "Successful · Rechnungs-Nr: B" },
    ];
    const giros = [
      giro("g1", 10.99, "2025-08-28", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
      giro("g2", 10.99, "2025-09-28", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
    ];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 40);
    const byRow = Object.fromEntries(suggestions.map(s => [s.rowIdx, s.giroTx.id]));
    expect(byRow[0]).toBe("g1");
    expect(byRow[1]).toBe("g2");
    expect(suggestions.every(s => s.confidence === "hoch")).toBe(true);
    expect(links).toHaveLength(2);
  });

  it("echt mehrdeutig: zwei gleich hohe Buchungen IM selben engen Fenster → mittel, kein Auto-Link", () => {
    const rows = [
      { amount: -10.99, isoDate: "2025-08-25", desc: "Successful · Rechnungs-Nr: A" },
      { amount: -10.99, isoDate: "2025-08-26", desc: "Successful · Rechnungs-Nr: B" },
    ];
    const giros = [
      giro("g1", 10.99, "2025-08-27", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
      giro("g2", 10.99, "2025-08-28", "", { desc: "PayPal Europe . Allgemeine Abbuchung" }),
    ];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 40);
    expect(links).toHaveLength(0); // Datum trennt nicht, kein Händler → nur Vorschlag
    expect(suggestions.every(s => s.confidence === "mittel")).toBe(true);
  });

  it("bevorzugt das _recipient-Feld als Händlername", () => {
    const rows = [{ amount: -15.98, isoDate: "2025-12-29",
      desc: "Successful · Rechnungs-Nr: OLNUE1", _recipient: "COMTRADA GmbH paypal@comtrada.de" }];
    const giros = [giro("g1", 15.98, "2025-12-29", "Comtrada")];
    const { links } = assignPayPalLinks(rows, giros, 35);
    expect(links.map(l => l.giroTx.id)).toEqual(["g1"]);
  });
});

describe("Einnahmen-Matching (PayPal-Eingang ↔ Giro-Gutschrift)", () => {
  it("matcht einen PayPal-Eingang mit einer gleich hohen Giro-Gutschrift", () => {
    const rows = [{ amount: 30.00, isoDate: "2025-04-09", desc: "Inge Asche", _recipient: "Inge Asche" }];
    const giros = [{ id: "g1", totalAmount: 30.00, date: "2025-04-10", _csvType: "income",
      desc: "PayPal Europe S.a.r.l. · PP.5555.PP/ABBUCHUNG VOM PAYPAL-KONTO" }];
    const { links, suggestions } = assignPayPalLinks(rows, giros, 35);
    expect(links.map(l => l.giroTx.id)).toEqual(["g1"]);
    expect(suggestions[0].confidence).toBe("hoch");
  });

  it("paart NICHT über Kreuz: Eingang nicht mit Lastschrift, Ausgabe nicht mit Gutschrift", () => {
    const inc = { amount: 30.00, isoDate: "2025-04-09", desc: "X", _recipient: "Inge" };
    const exp = { amount: -30.00, isoDate: "2025-04-09", desc: "Y", _recipient: "Shop" };
    const giroCredit = { id: "gc", totalAmount: 30, date: "2025-04-10", _csvType: "income", desc: "PayPal ABBUCHUNG VOM PAYPAL-KONTO" };
    const giroDebit  = { id: "gd", totalAmount: 30, date: "2025-04-10", _csvType: "expense", desc: "PayPal Ihr Einkauf bei Shop" };
    // Eingang darf nur die Gutschrift treffen
    expect(assignPayPalLinks([inc], [giroDebit], 35).suggestions).toHaveLength(0);
    expect(assignPayPalLinks([inc], [giroCredit], 35).suggestions.map(s=>s.giroTx.id)).toEqual(["gc"]);
    // Ausgabe darf nur die Lastschrift treffen
    expect(assignPayPalLinks([exp], [giroCredit], 35).suggestions).toHaveLength(0);
    expect(assignPayPalLinks([exp], [giroDebit], 35).suggestions.map(s=>s.giroTx.id)).toEqual(["gd"]);
  });
});

describe("detectPayPalRefunds", () => {
  it("erkennt Erstattung über Händler + gleichen Betrag und verlinkt die Ausgabe", () => {
    const rows = [
      { amount: -10.99, isoDate: "2026-01-01", desc: "Apple", _recipient: "Apple Services paypal-itunes-eur@group.apple.com" },
      { amount:  10.99, isoDate: "2026-01-05", desc: "Apple", _recipient: "Apple Services paypal-itunes-eur@group.apple.com" },
    ];
    const out = detectPayPalRefunds(rows);
    expect(out[1]._isRefund).toBe(true);
    expect(out[1]._refundOf.date).toBe("2026-01-01");
    expect(out[0]._isRefund).toBeUndefined(); // Ausgabe selbst ist keine Erstattung
  });

  it("erkennt Erstattung am Schlüsselwort (auch ohne passende Ausgabe)", () => {
    const rows = [{ amount: 8.99, isoDate: "2026-05-24", desc: "DisneyPlus · Credit has been processed and claim is now closed. Dispute ID PP-R-SSU-123", _recipient: "DisneyPlus" }];
    expect(detectPayPalRefunds(rows)[0]._isRefund).toBe(true);
  });

  it("markiert echte Einnahmen (Privatperson) NICHT als Erstattung", () => {
    const rows = [
      { amount: -5.00, isoDate: "2026-01-01", desc: "Shop", _recipient: "Irgendein Shop" },
      { amount: 240.00, isoDate: "2026-01-11", desc: "Andreas Bauer", _recipient: "Andreas Bauer" },
    ];
    expect(detectPayPalRefunds(rows)[1]._isRefund).toBeUndefined();
  });

  it("Teilerstattung: verlinkt über Referenztransaktionscode trotz abweichendem Betrag", () => {
    const rows = [
      { amount: -145.95, isoDate: "2022-05-04", desc: "Macconnect", txCode: "9AB12345CD678901E" },
      { amount:   50.00, isoDate: "2022-05-21", desc: "Macconnect", txCode: "1ZZ99887766554433", refCode: "9AB12345CD678901E" },
    ];
    const out = detectPayPalRefunds(rows);
    expect(out[1]._isRefund).toBe(true);
    expect(out[1]._partialRefund).toBe(true);
    expect(out[1]._refundOf.date).toBe("2022-05-04");
    expect(out[1]._refundOf.amount).toBeCloseTo(-145.95, 2);
  });

  it("Teilerstattung: verlinkt über gemeinsame Rechnungs-Nr (Finanzblick)", () => {
    const rows = [
      { amount: -200.00, isoDate: "2022-03-01", desc: "Macconnect · Rechnungs-Nr: 21645" },
      { amount:   75.50, isoDate: "2022-03-20", desc: "Macconnect · Rechnungs-Nr: 21645 https://macconnect-store.de" },
    ];
    const out = detectPayPalRefunds(rows);
    expect(out[1]._isRefund).toBe(true);
    expect(out[1]._partialRefund).toBe(true);
    expect(out[1]._refundOf.date).toBe("2022-03-01");
  });

  it("ohne gemeinsame Referenz wird ein Teilbetrag NICHT fälschlich als Erstattung gewertet", () => {
    const rows = [
      { amount: -200.00, isoDate: "2022-03-01", desc: "Macconnect · Rechnungs-Nr: 21645" },
      { amount:   75.50, isoDate: "2022-03-20", desc: "Andere Firma · Rechnungs-Nr: 99999" },
    ];
    expect(detectPayPalRefunds(rows)[1]._isRefund).toBeUndefined();
  });
});

describe("reconcilePayPalLegs", () => {
  it("hebt _internalLeg auf, wenn die zugehörige Auszahlung nicht (mehr) existiert", () => {
    const rows = [
      { fp: "fp-refund", amount: 29.99, isoDate: "2026-02-11", _internalLeg: true, _isRefund: true },
    ];
    const out = reconcilePayPalLegs(rows);
    expect(out[0]._internalLeg).toBeUndefined();
    expect(out[0]._isRefund).toBe(true); // übrige Marker bleiben erhalten
  });

  it("behält _internalLeg, solange die Auszahlung per _legSourceFps darauf verweist", () => {
    const rows = [
      { fp: "fp-refund", amount: 29.99, isoDate: "2026-02-11", _internalLeg: true },
      { fp: "fp-wd", amount: 29.99, isoDate: "2026-02-12", _enrichedWithdrawal: true, _legSourceFps: ["fp-refund"] },
    ];
    const out = reconcilePayPalLegs(rows);
    expect(out[0]._internalLeg).toBe(true);
  });

  it("bereinigt _legSourceFps, die auf entfernte Zeilen zeigen", () => {
    const rows = [
      { fp: "fp-wd", amount: 29.99, isoDate: "2026-02-12", _enrichedWithdrawal: true, _legSourceFps: ["fp-refund", "fp-gone"] },
      { fp: "fp-refund", amount: 29.99, isoDate: "2026-02-11", _internalLeg: true },
    ];
    const out = reconcilePayPalLegs(rows);
    expect(out[0]._legSourceFps).toEqual(["fp-refund"]);
    expect(out[1]._internalLeg).toBe(true);
  });

  it("nach Wegfall der Auszahlung wird die Erstattung wieder der Giro-Gutschrift zugeordnet", () => {
    // Nur die Erstattung überlebt (Auszahlung als Gegenbuchung entfernt).
    const rows = reconcilePayPalLegs([
      { fp: "fp-refund", amount: 29.99, isoDate: "2026-02-11", _internalLeg: true,
        desc: "Microsoft Payments · Reverse Payment", _recipient: "Microsoft Payments" },
    ]);
    const giros = [{ id: "g1", totalAmount: 29.99, date: "2026-02-12", _csvType: "income",
      desc: "PayPal (Europe) S.a r.l. · ABBUCHUNG VOM PAYPAL-KONTO Microsoft" }];
    const { suggestions } = assignPayPalLinks(rows, giros, 35);
    expect(suggestions.map(s => s.giroTx.id)).toEqual(["g1"]);
  });
});

describe("dropPayPalCounterBookings", () => {
  it("entfernt interne Gegenbuchungen, behält echte Einnahmen und Ausgaben", () => {
    const rows = [
      { amount: -15.98, isoDate: "2025-12-29", desc: "COMTRADA", _recipient: "COMTRADA GmbH" },     // Ausgabe
      { amount:  15.98, isoDate: "2025-12-29", desc: "Successful" },                                  // Gegenbuchung → weg
      { amount:  30.00, isoDate: "2025-04-09", desc: "Inge Asche", _recipient: "Inge Asche" },        // echte Einnahme → bleibt
      { amount:  41.82, isoDate: "2025-10-09", desc: "Erstattung", _recipient: "Andreas Warth" },     // Erstattung → bleibt
      { amount:  99.00, isoDate: "2025-01-01", desc: "Successful" },                                   // positiv ohne Spiegel → bleibt
    ];
    const out = dropPayPalCounterBookings(rows);
    expect(out.map(r => r.amount)).toEqual([-15.98, 30.00, 41.82, 99.00]);
  });

  it("entfernt auch die NEGATIVE Gegenbuchung einer Einnahme/Erstattung", () => {
    const rows = [
      { amount:  240.00, isoDate: "2026-01-11", desc: "Andreas Bauer", _recipient: "Andreas Bauer" }, // Einnahme → bleibt
      { amount: -240.00, isoDate: "2026-01-11", desc: "Successful" },                                   // Gegenbuchung → weg
    ];
    expect(dropPayPalCounterBookings(rows).map(r=>r.amount)).toEqual([240.00]);
  });

  it("entfernt die Gegenbuchung auch bei ±3 Tagen Versatz", () => {
    const rows = [
      { amount: -10.00, isoDate: "2025-05-01", desc: "X", _recipient: "Shop" },
      { amount:  10.00, isoDate: "2025-05-03", desc: "Successful" }, // 2 Tage Versatz → Gegenbuchung
    ];
    expect(dropPayPalCounterBookings(rows).map(r=>r.amount)).toEqual([-10.00]);
  });
});

describe("enrichPayPalMerchants — PayPal +30", () => {
  const rows = () => [
    // Kauf (mit Händler) am 29.11.
    { amount: -359.99, isoDate: "2025-11-29", desc: "Roborock Germany GmbH", _recipient: "Roborock Germany GmbH dgpp@roborock.com" },
    { amount:  359.99, isoDate: "2025-11-29", desc: "Successful" }, // Gegenbuchung
    // Abbuchung (ohne Händler) am 29.12. — ~30 Tage später
    { amount: -359.99, isoDate: "2025-12-29", desc: "Successful", _recipient: "PayPal (Europe) S.à r.l. et Cie, SCA" },
    { amount:  359.99, isoDate: "2025-12-29", desc: "Successful" }, // Gegenbuchung
  ];

  it("überträgt den Händler der Kaufzeile auf die +30-Abbuchung", () => {
    const enr = enrichPayPalMerchants(rows());
    expect(enr[2]._enrichedMerchant).toMatch(/Roborock/);
    expect(enr[2]._enrichedPlus30).toBe(true);
    expect(payPalMerchant(enr[2])).toMatch(/Roborock/);
    // Kaufzeile und Gegenbuchungen bleiben unverändert
    expect(enr[0]._enrichedMerchant).toBeUndefined();
  });

  it("+30-Abbuchung wird eindeutig (Kauf-Leg ausgeschlossen) und auto-verknüpft", () => {
    const enr = enrichPayPalMerchants(rows());
    // Echte +30-Giro-Form: „PAYPAL..SPAETER.ZAHLEN", VISA-Debit, OHNE Händler.
    const giros = [{ id: "g1", totalAmount: 359.99, date: "2025-12-30",
      desc: "PAYPAL..SPAETER.ZAHLEN/8007234500 · VISA Debitkartenumsatz vom 28.12.2025", _csvType: "expense" }];
    const { links, suggestions } = assignPayPalLinks(enr, giros, 45);
    // Nur EIN Vorschlag (die Abbuchung), nicht zusätzlich die Kaufzeile.
    expect(suggestions).toHaveLength(1);
    expect(links.map(l => l.giroTx.id)).toEqual(["g1"]);
    // Betrag im engen Fenster konkurrenzlos → zuverlässig.
    expect(suggestions[0].confidence).toBe("hoch");
    // Der angereicherte Händler hängt an der gematchten Zeile (für die Anzeige).
    expect(suggestions[0].giroTx.id).toBe("g1");
    const matchedRow = enr[suggestions[0].rowIdx];
    expect(matchedRow._enrichedMerchant).toMatch(/Roborock/);
  });

  it("reichert NICHT an, wenn der Betrag ~30 Tage früher mehrdeutig ist", () => {
    const r = [
      { amount: -9.99, isoDate: "2025-11-01", desc: "A", _recipient: "Netflix" },
      { amount: -9.99, isoDate: "2025-11-02", desc: "B", _recipient: "Spotify" },
      { amount: -9.99, isoDate: "2025-12-01", desc: "Successful", _recipient: "PayPal (Europe) S.à r.l. et Cie, SCA" },
    ];
    const enr = enrichPayPalMerchants(r);
    expect(enr[2]._enrichedMerchant).toBeUndefined();
  });

  it("Auszahlung: generische +Einnahme erbt Händler der Quell-Erstattung; Quelle wird Leg", () => {
    // Macconnect erstattet +145,95 (21.05) → Auszahlung „PayPal (Europe)" +145,95 (22.05) → Giro 23.05.
    const rows = [
      { amount: 145.95, isoDate: "2022-05-21", desc: "Macconnect", _recipient: "Macconnect Computersysteme GmbH paypal@macconnect.de" },
      { amount: 145.95, isoDate: "2022-05-22", desc: "Successful", _recipient: "PayPal (Europe) S.à r.l. et Cie, SCA" },
    ];
    const enr = enrichPayPalMerchants(rows);
    expect(enr[1]._enrichedMerchant).toMatch(/Macconnect/);
    expect(enr[1]._enrichedWithdrawal).toBe(true);
    expect(enr[0]._internalLeg).toBe(true); // Quell-Erstattung → vom Matching ausschließen

    // Giro-Gutschrift trifft eindeutig die Auszahlung (Quelle ausgeschlossen) → hoch.
    const giros = [{ id: "g1", totalAmount: 145.95, date: "2022-05-23", _csvType: "income",
      desc: "PayPal (Europe) S.a r.l. · PP.5555.PP ABBUCHUNG VOM PAYPAL-KONTO" }];
    const { links, suggestions } = assignPayPalLinks(enr, giros, 35);
    expect(suggestions).toHaveLength(1);
    expect(links.map(l => l.giroTx.id)).toEqual(["g1"]);
    expect(suggestions[0].confidence).toBe("hoch");
  });

  it("merkt sich die Quell-Legs per Fingerprint (zum Mit-Verknüpfen an die Giro-Buchung)", () => {
    const rows = [
      { amount: 145.95, isoDate: "2022-05-21", desc: "Macconnect", fp: "fp-refund", _recipient: "Macconnect Computersysteme GmbH" },
      { amount: 145.95, isoDate: "2022-05-22", desc: "Successful", fp: "fp-withdrawal", _recipient: "PayPal (Europe) S.à r.l. et Cie, SCA" },
    ];
    const enr = enrichPayPalMerchants(rows);
    // Die Auszahlung kennt den Fingerprint ihrer Quell-Erstattung.
    expect(enr[1]._legSourceFps).toEqual(["fp-refund"]);
  });
});
