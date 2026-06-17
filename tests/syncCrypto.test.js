import { describe, it, expect } from "vitest";
import {
  encryptJSON, decryptJSON, isEncrypted, freshSaltB64, clearKeyCache,
} from "../src/utils/syncCrypto.js";

const PASS = "korrekt-pferd-batterie-klammer";

describe("syncCrypto", () => {
  it("verschlüsselt und entschlüsselt ein Objekt verlustfrei (Round-Trip)", async () => {
    const obj = { cats: [{ id: "a", name: "Wohnen" }], n: 42, flag: true, nested: { x: [1, 2, 3] } };
    const env = await encryptJSON(obj, PASS);
    expect(isEncrypted(env)).toBe(true);
    const back = await decryptJSON(env, PASS);
    expect(back).toEqual(obj);
  });

  it("liefert einen selbstbeschreibenden Umschlag ohne Klartext", async () => {
    const env = await encryptJSON({ geheim: "1.989,81 €" }, PASS);
    expect(env.__enc).toBe(1);
    expect(env.alg).toBe("AES-GCM");
    expect(typeof env.salt).toBe("string");
    expect(typeof env.iv).toBe("string");
    expect(typeof env.ct).toBe("string");
    // Der Klartext darf nirgends im serialisierten Umschlag auftauchen
    expect(JSON.stringify(env)).not.toContain("1.989,81");
    expect(JSON.stringify(env)).not.toContain("geheim");
  });

  it("scheitert mit klarer Meldung bei falscher Passphrase", async () => {
    const env = await encryptJSON({ a: 1 }, PASS);
    await expect(decryptJSON(env, "falsch")).rejects.toThrow(/Falsche Passphrase|beschädigte/i);
  });

  it("erzeugt unterschiedliche Chiffrate für gleiche Eingabe (random IV/Salt)", async () => {
    const a = await encryptJSON({ a: 1 }, PASS);
    const b = await encryptJSON({ a: 1 }, PASS);
    expect(a.ct).not.toBe(b.ct);
    expect(a.iv).not.toBe(b.iv);
  });

  it("nutzt einen gemeinsamen Salt, wenn übergeben (für Batch-Sync)", async () => {
    const salt = freshSaltB64();
    const a = await encryptJSON({ a: 1 }, PASS, { salt });
    const b = await encryptJSON({ b: 2 }, PASS, { salt });
    expect(a.salt).toBe(salt);
    expect(b.salt).toBe(salt);
    expect(await decryptJSON(a, PASS)).toEqual({ a: 1 });
    expect(await decryptJSON(b, PASS)).toEqual({ b: 2 });
  });

  it("isEncrypted erkennt unverschlüsselte Daten (Rückwärtskompatibilität)", () => {
    expect(isEncrypted({ cats: [], txs: [] })).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted("text")).toBe(false);
    expect(isEncrypted([1, 2, 3])).toBe(false);
  });

  it("verschlüsselt auch Arrays (Jahres-Buchungen)", async () => {
    const arr = [{ id: "t1", a: -12.5 }, { id: "t2", a: 600 }];
    const env = await encryptJSON(arr, PASS);
    expect(await decryptJSON(env, PASS)).toEqual(arr);
  });

  it("verlangt eine Passphrase", async () => {
    await expect(encryptJSON({ a: 1 }, "")).rejects.toThrow(/Passphrase/i);
    clearKeyCache();
  });
});
