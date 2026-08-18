import { describe, it, expect, beforeEach } from "vitest";
import { decodeToken, isTokenValid, loadLocalToken, saveLocalToken, clearLocalToken } from "../src/utils/licenseToken.js";

const VALID_PAYLOAD = {
  email: "test@example.com",
  tier: "pro",
  products: ["money"],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 * 30  // 30 Tage in Zukunft
};
const EXPIRED_PAYLOAD = {
  email: "test@example.com",
  tier: "pro",
  products: ["money"],
  iat: 1000,
  exp: 1  // weit in Vergangenheit
};

// Base64-Token erzeugen (echtes Format wie vom Worker)
function makeToken(template, expired = false) {
  let p;
  if (expired) {
    p = EXPIRED_PAYLOAD;
  } else {
    // Template kopieren und mit aktuellem Timestamp versehen
    p = { ...template, iat: Math.floor(Date.now() / 1000) };
  }
  const payloadB64 = btoa(JSON.stringify(p));
  const signatureB64 = "fake_signature_123"; // Für Tests genug
  return `${payloadB64}.${signatureB64}`;
}

describe("licenseToken", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("decodeToken parst ein gültiges Token", () => {
    const token = makeToken(VALID_PAYLOAD);
    const result = decodeToken(token);
    expect(result).not.toBeNull();
    expect(result.payload.email).toBe("test@example.com");
    expect(result.payload.tier).toBe("pro");
  });

  it("decodeToken gibt null zurück für ungültige Tokens", () => {
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken("")).toBeNull();
    expect(decodeToken("no_dot")).toBeNull();
    expect(decodeToken("too.many.parts")).toBeNull();
  });

  it("isTokenValid prüft das Ablaufdatum", () => {
    const valid = decodeToken(makeToken(VALID_PAYLOAD)).payload;
    const expired = decodeToken(makeToken(EXPIRED_PAYLOAD)).payload;
    expect(isTokenValid(valid)).toBe(true);
    expect(isTokenValid(expired)).toBe(false);
  });

  it("saveLocalToken speichert ein gültiges Token", () => {
    const token = makeToken(VALID_PAYLOAD);
    const result = saveLocalToken(token);
    expect(result).toBe(true);
    expect(localStorage.getItem("supadupa_license_token")).toBe(token);
  });

  it("saveLocalToken gibt false zurück für ungültige/abgelaufene Tokens", () => {
    const expiredToken = makeToken(EXPIRED_PAYLOAD);
    expect(saveLocalToken(expiredToken)).toBe(false);
    expect(localStorage.getItem("supadupa_license_token")).toBeNull();
  });

  it("loadLocalToken gibt das gespeicherte Token zurück", () => {
    const token = makeToken(VALID_PAYLOAD);
    localStorage.setItem("supadupa_license_token", token);
    const loaded = loadLocalToken();
    expect(loaded).not.toBeNull();
    expect(loaded.token).toBe(token);
    expect(loaded.data.tier).toBe("pro");
  });

  it("loadLocalToken löscht abgelaufene Tokens automatisch", () => {
    const expiredToken = makeToken(EXPIRED_PAYLOAD);
    localStorage.setItem("supadupa_license_token", expiredToken);
    const loaded = loadLocalToken();
    expect(loaded).toBeNull();
    expect(localStorage.getItem("supadupa_license_token")).toBeNull();
  });

  it("clearLocalToken löscht das Token", () => {
    const token = makeToken(VALID_PAYLOAD);
    localStorage.setItem("supadupa_license_token", token);
    clearLocalToken();
    expect(localStorage.getItem("supadupa_license_token")).toBeNull();
  });
});
