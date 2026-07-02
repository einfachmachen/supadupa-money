import { describe, it, expect } from "vitest";
import { buildKnownFps } from "../src/utils/enableBankingFetch.js";
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
