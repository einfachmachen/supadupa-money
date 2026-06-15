import { describe, it, expect, beforeAll } from "vitest";
import nodeCrypto, { webcrypto } from "node:crypto";
import {
  base64urlFromString,
  pemToPkcs8ArrayBuffer,
  buildJwt,
  ebSignedAmount,
  ebDescription,
  mapEnableBankingTx,
  mapEnableBankingTransactions,
} from "../src/utils/enableBanking.js";
import { txFingerprint } from "../src/utils/tx.js";

// Web Crypto (subtle) sicherstellen — jsdom liefert teils kein subtle.
beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    try {
      Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
    } catch {
      /* ignorieren — Test unten überspringt sich dann */
    }
  }
});

function b64urlDecodeToString(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

describe("Base64URL", () => {
  it("kodiert ohne Padding und URL-sicher", () => {
    const out = base64urlFromString("foo??>>");
    expect(out).not.toMatch(/[+/=]/);
    expect(b64urlDecodeToString(out)).toBe("foo??>>");
  });
});

describe("pemToPkcs8ArrayBuffer", () => {
  it("entfernt Header/Whitespace und dekodiert Base64", () => {
    const raw = new Uint8Array([1, 2, 3, 4, 250]);
    const b64 = Buffer.from(raw).toString("base64");
    const pem = `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`;
    const buf = new Uint8Array(pemToPkcs8ArrayBuffer(pem));
    expect([...buf]).toEqual([...raw]);
  });
});

describe("ebSignedAmount", () => {
  it("DBIT ist negativ, CRDT positiv", () => {
    expect(ebSignedAmount({ transaction_amount: { amount: "12.34" }, credit_debit_indicator: "DBIT" })).toBeCloseTo(-12.34);
    expect(ebSignedAmount({ transaction_amount: { amount: "12.34" }, credit_debit_indicator: "CRDT" })).toBeCloseTo(12.34);
  });
  it("nutzt das Betragsvorzeichen als Fallback ohne Indikator", () => {
    expect(ebSignedAmount({ amount: "-9.99" })).toBeCloseTo(-9.99);
  });
});

describe("ebDescription", () => {
  it("verbindet Empfänger und Verwendungszweck mit ' · '", () => {
    const d = ebDescription({ creditor: { name: "REWE" }, remittance_information: ["Einkauf", "Danke"] });
    expect(d).toBe("REWE · Einkauf Danke");
  });
  it("entfernt Duplikate zwischen Name und Zweck", () => {
    const d = ebDescription({ creditor: { name: "Netflix" }, remittance_information: "Netflix" });
    expect(d).toBe("Netflix");
  });
  it("fällt auf 'Unbekannt' zurück", () => {
    expect(ebDescription({})).toBe("Unbekannt");
  });
});

describe("mapEnableBankingTx", () => {
  it("erzeugt die SupaDupa-Zeilenform inkl. passendem Fingerprint", () => {
    const tx = {
      booking_date: "2026-03-15",
      transaction_amount: { amount: "47.30", currency: "EUR" },
      credit_debit_indicator: "DBIT",
      creditor: { name: "DM Drogerie" },
      remittance_information: ["Einkauf Filiale 123"],
      status: "BOOK",
    };
    const row = mapEnableBankingTx(tx, "acc-giro");
    expect(row.isoDate).toBe("2026-03-15");
    expect(row.amount).toBeCloseTo(-47.3);
    expect(row.desc).toBe("DM Drogerie · Einkauf Filiale 123");
    expect(row.pending).toBe(false);
    expect(row.fp).toBe(txFingerprint("2026-03-15", -47.3, "DM Drogerie · Einkauf Filiale 123", "acc-giro"));
  });
  it("markiert PDNG als pending", () => {
    const row = mapEnableBankingTx({ booking_date: "2026-01-01", amount: "1.00", credit_debit_indicator: "CRDT", status: "PDNG" }, "acc-giro");
    expect(row.pending).toBe(true);
  });
});

describe("mapEnableBankingTransactions", () => {
  it("filtert Nuller-Beträge und datumslose Einträge heraus", () => {
    const rows = mapEnableBankingTransactions(
      [
        { booking_date: "2026-02-02", amount: "5.00", credit_debit_indicator: "CRDT" },
        { booking_date: "2026-02-03", amount: "0", credit_debit_indicator: "CRDT" }, // 0 → raus
        { amount: "9.00", credit_debit_indicator: "DBIT" }, // kein Datum → raus
      ],
      "acc-giro"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].isoDate).toBe("2026-02-02");
  });
});

describe("buildJwt", () => {
  const hasSubtle = !!globalThis.crypto?.subtle || !!webcrypto?.subtle;
  (hasSubtle ? it : it.skip)("erzeugt ein gültiges, vom öffentlichen Schlüssel verifizierbares RS256-JWT", async () => {
    const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const jwt = await buildJwt({ appId: "app-123", privateKeyPem: privateKey, now: 1_700_000_000_000 });
    const [h, p, s] = jwt.split(".");
    expect(s).toBeTruthy();

    const header = JSON.parse(b64urlDecodeToString(h));
    const payload = JSON.parse(b64urlDecodeToString(p));
    expect(header).toEqual({ typ: "JWT", alg: "RS256", kid: "app-123" });
    expect(payload.iss).toBe("enablebanking.com");
    expect(payload.aud).toBe("api.enablebanking.com");
    expect(payload.exp - payload.iat).toBe(3600);

    const verify = nodeCrypto.createVerify("RSA-SHA256");
    verify.update(`${h}.${p}`);
    const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    expect(verify.verify(publicKey, sig)).toBe(true);
  });
});
