import { describe, it, expect } from "vitest";
import { buildKnownFps, buildKnownPendingFps, buildAmtIndex } from "../src/utils/enableBankingFetch.js";
import { txFingerprint, txFingerprintNorm } from "../src/utils/tx.js";

// Regression: Eine noch offene Vormerkung (pending) für eine Amazon-Bestellung
// wurde bislang mit in den "bekannte Fingerprints"-Index aufgenommen. Rief man
// danach die echten Bank-Umsätze ab, hatte die tatsächliche Buchung dasselbe
// Datum/denselben Betrag/denselben Text wie die Vormerkung → sie wurde
// fälschlich als "exact" (bereits vorhanden) eingestuft und nie importiert,
// obwohl real nur die Vormerkung existierte. Der Betrags-Index (amtIndex)
// schloss Vormerkungen schon vorher aus (`if (t.pending) return;`) —
// buildKnownFps musste nachziehen, sonst greift fetchNewBankTx/EnableBankingWizard
// (`if (known.has(row.fp) || known.has(fpNorm)) status = "exact";`) fälschlich.
describe("buildKnownFps", () => {
  const vormerkung = { id: "v1", date: "2026-07-02", totalAmount: -70.19, desc: "AMAZON PAYMENTS EUROPE S.C.A.", pending: true, accountId: "acc-giro" };
  const real = { id: "r1", date: "2026-07-02", totalAmount: -70.19, desc: "AMAZON PAYMENTS EUROPE S.C.A.", pending: false, accountId: "acc-giro" };

  it("nimmt Vormerkungen (pending) NICHT in die bekannten Fingerprints auf", () => {
    const known = buildKnownFps([vormerkung]);
    const fp = txFingerprint(vormerkung.date, vormerkung.totalAmount, vormerkung.desc, vormerkung.accountId);
    const fpNorm = txFingerprintNorm(vormerkung.date, vormerkung.totalAmount, vormerkung.desc, vormerkung.accountId);
    expect(known.has(fp)).toBe(false);
    expect(known.has(fpNorm)).toBe(false);
    expect(known.size).toBe(0);
  });

  it("nimmt echte, bereits gebuchte Transaktionen weiterhin auf (keine Regression bei echten Dubletten)", () => {
    const known = buildKnownFps([real]);
    const fp = txFingerprint(real.date, real.totalAmount, real.desc, real.accountId);
    expect(known.has(fp)).toBe(true);
  });

  it("gemischt: nur die echte Buchung landet im Index, die Vormerkung nicht", () => {
    const known = buildKnownFps([vormerkung, real]);
    expect(known.size).toBeGreaterThan(0);
    // Der Fingerprint ist für beide identisch (gleiches Datum/Betrag/Text) —
    // entscheidend ist, dass buildKnownFps([vormerkung]) allein ihn NICHT liefert.
    const known2 = buildKnownFps([vormerkung]);
    expect(known2.size).toBe(0);
  });
});

// Regression: Eine bereits als Vormerkung importierte Buchung (z. B. Audible,
// Penny, Bäcker) wurde bei der Bank oft noch tagelang als "PDNG" geführt.
// Weil buildKnownFps Vormerkungen bewusst ausschließt (s. o.), tauchte
// dieselbe, unverändert weiter vorgemerkte Bank-Buchung bei JEDEM erneuten
// Abruf (Pull-to-Refresh) wieder als "neu" auf und wurde erneut zur Übernahme
// vorgeschlagen — obwohl sie längst als Vormerkung existierte. Fix:
// buildKnownPendingFps liefert einen zweiten Index NUR aus bestehenden
// Vormerkungen, gegen den eingehende, selbst noch vorgemerkte (pending)
// Zeilen zusätzlich geprüft werden.
describe("buildKnownPendingFps", () => {
  const vormerkung = { id: "v1", date: "2026-07-06", totalAmount: -9.95, desc: "Audible Gmbh audible.de/r DE", pending: true, accountId: "acc-giro" };

  it("nimmt bestehende Vormerkungen auf (Gegenstück zu buildKnownFps)", () => {
    const knownPending = buildKnownPendingFps([vormerkung]);
    const fp = txFingerprint(vormerkung.date, vormerkung.totalAmount, vormerkung.desc, vormerkung.accountId);
    expect(knownPending.has(fp)).toBe(true);
  });

  it("erkennt eine erneut als PDNG gemeldete, bereits vorgemerkte Buchung als Dublette", () => {
    const known = buildKnownFps([vormerkung]); // wie im echten Abruf: nur nicht-pending Buchungen
    const knownPending = buildKnownPendingFps([vormerkung]);
    const incomingRow = { isoDate: vormerkung.date, amount: vormerkung.totalAmount, desc: vormerkung.desc, pending: true };
    const fp = txFingerprint(incomingRow.isoDate, incomingRow.amount, incomingRow.desc, vormerkung.accountId);
    const fpNorm = txFingerprintNorm(incomingRow.isoDate, incomingRow.amount, incomingRow.desc, vormerkung.accountId);
    let status = "new";
    if (known.has(fp) || known.has(fpNorm)) status = "exact";
    else if (incomingRow.pending && (knownPending.has(fp) || knownPending.has(fpNorm))) status = "exact";
    expect(status).toBe("exact");
  });

  it("blockiert weiterhin NICHT die passende echte Buchung, wenn nur eine Vormerkung bekannt ist", () => {
    const known = buildKnownFps([vormerkung]);
    const knownPending = buildKnownPendingFps([vormerkung]);
    const incomingRow = { isoDate: vormerkung.date, amount: vormerkung.totalAmount, desc: vormerkung.desc, pending: false };
    const fp = txFingerprint(incomingRow.isoDate, incomingRow.amount, incomingRow.desc, vormerkung.accountId);
    const fpNorm = txFingerprintNorm(incomingRow.isoDate, incomingRow.amount, incomingRow.desc, vormerkung.accountId);
    let status = "new";
    if (known.has(fp) || known.has(fpNorm)) status = "exact";
    else if (incomingRow.pending && (knownPending.has(fp) || knownPending.has(fpNorm))) status = "exact";
    expect(status).toBe("new");
  });
});

// Regression (Nutzer-Bericht): "Viele Buchungen wurden nochmal als neu erkannt,
// obwohl ich bisher nur die Bank-Vormerkungen drin hatte."
//
// Verknüpft man eine EIGENE Vormerkung mit einer BANK-Vormerkung
// (linkPendingToPending in vormMatch.js), setzt die App die eigene auf
// `pending:false` und hängt `_linkedTo` an die Bank-Vormerkung. Die
// Bank-Vormerkung ist danach der einzige sichtbare Eintrag — gebucht ist aber
// nichts. Für den Bankabruf sah dieser Eintrag trotzdem aus wie eine echte
// Buchung und landete in beiden Indizes.
//
// Folge: Kam die Bank später mit der tatsächlichen Buchung, stimmten Konto,
// Datum und Betrag mit dem absorbierten Eintrag überein — nur der Text nicht
// (dort steht die eigene Beschreibung). Die echte Buchung wurde deshalb als
// "mögliche Dublette" abgewählt statt importiert, und zwar bei jedem Abruf
// aufs Neue. Wer viel verknüpft, bekam einen ganzen Stapel davon.
describe("Absorbierte Vormerkungen (eigene ↔ Bank verknüpft)", () => {
  // Ausgangslage wie nach linkPendingToPending: Bank-Vormerkung bleibt pending,
  // die eigene wird auf pending:false gesetzt und zeigt per _linkedTo auf sie.
  const bankVorm = {
    id: "b1", date: "2026-08-10", totalAmount: -100.57, pending: true,
    desc: "AMAZON +18002796620 LU", accountId: "acc-giro", linkedIds: ["m1"],
  };
  const eigeneAbsorbiert = {
    id: "m1", date: "2026-08-10", totalAmount: -100.57, pending: false,
    desc: "Fahrradhelm, 2er Lesebrille, Sonoff Zigbee Stick", accountId: "acc-giro",
    _linkedTo: "b1",
  };
  const txs = [bankVorm, eigeneAbsorbiert];

  it("zählt nicht als bekannte Buchung (buildKnownFps)", () => {
    const known = buildKnownFps(txs);
    const fp = txFingerprint(eigeneAbsorbiert.date, eigeneAbsorbiert.totalAmount,
      eigeneAbsorbiert.desc, eigeneAbsorbiert.accountId);
    expect(known.has(fp)).toBe(false);
    expect(known.size).toBe(0);   // die Bank-Vormerkung ist ohnehin pending
  });

  it("eine echt gebuchte, verknüpfte Gegenbuchung zählt weiterhin", () => {
    // Gegenprobe zu oben: hier ist der Partner KEINE Vormerkung mehr, sondern
    // die reale Buchung (linkPendingToReal). Dann ist der Eintrag sehr wohl
    // gebucht und muss im Index stehen — sonst käme er erneut als "neu".
    const echteBuchung = { ...bankVorm, pending: false };
    const known = buildKnownFps([echteBuchung, { ...eigeneAbsorbiert }]);
    const fp = txFingerprint(echteBuchung.date, echteBuchung.totalAmount,
      echteBuchung.desc, echteBuchung.accountId);
    expect(known.has(fp)).toBe(true);
  });

  it("ohne _linkedTo bleibt alles wie bisher", () => {
    const normal = { ...eigeneAbsorbiert, _linkedTo: undefined };
    const known = buildKnownFps([normal]);
    expect(known.size).toBeGreaterThan(0);
  });
});

// Der Betrags-Index ist der Auslöser des oben beschriebenen Falls: die
// tatsächliche Bank-Buchung wurde über ihn zur "möglichen Dublette", weil der
// absorbierte Eintrag dieselbe Kombination aus Konto, Datum und Betrag trug.
describe("buildAmtIndex", () => {
  const schluessel = (t) =>
    `${t.accountId}|${t.date}|${Math.round(Math.abs(t.totalAmount) * 100)}`;

  const bankVorm = { id: "b1", date: "2026-08-10", totalAmount: -100.57, pending: true,
    desc: "AMAZON +18002796620 LU", accountId: "acc-giro", linkedIds: ["m1"] };
  const eigeneAbsorbiert = { id: "m1", date: "2026-08-10", totalAmount: -100.57, pending: false,
    desc: "Fahrradhelm, 2er Lesebrille", accountId: "acc-giro", _linkedTo: "b1" };

  it("laesst absorbierte Vormerkungen draussen — sonst wird die echte Buchung zur Dublette", () => {
    const idx = buildAmtIndex([bankVorm, eigeneAbsorbiert]);
    expect(idx.has(schluessel(eigeneAbsorbiert))).toBe(false);
    expect(idx.size).toBe(0);
  });

  it("laesst Vormerkungen draussen (bisheriges Verhalten)", () => {
    expect(buildAmtIndex([bankVorm]).size).toBe(0);
  });

  it("nimmt echte Buchungen auf", () => {
    const echt = { id: "r1", date: "2026-08-10", totalAmount: -25.95, pending: false,
      desc: "HORNBACH BAUMARKT", accountId: "acc-giro" };
    expect(buildAmtIndex([echt]).has(schluessel(echt))).toBe(true);
  });

  it("trennt nach Konto — gleicher Betrag am selben Tag auf einem anderen Konto zaehlt nicht", () => {
    const giro = { id: "r1", date: "2026-08-10", totalAmount: -25.95, pending: false, desc: "A", accountId: "acc-giro" };
    const idx = buildAmtIndex([giro]);
    expect(idx.has(schluessel({ ...giro, accountId: "acc-tagesgeld" }))).toBe(false);
  });
});
