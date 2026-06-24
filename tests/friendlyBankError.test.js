import { describe, it, expect } from "vitest";
import { friendlyBankError } from "../src/utils/enableBankingFetch.js";

describe("friendlyBankError — Klartext statt rohem Fehler-JSON", () => {
  it("übersetzt den ASPSP-Serverfehler der Bank in eine 'vorübergehend nicht erreichbar'-Meldung", () => {
    const raw = 'Enable Banking 400: {"code":400,"message":"Error interacting with ASPSP","detail":{"message":"Internal server error","error_name":"HttpException","error_data":{}},"error":"ASPSP_ERROR"}';
    expect(friendlyBankError(raw)).toMatch(/vorübergehend nicht erreichbar/i);
  });

  it("erkennt 5xx-Serverfehler als vorübergehend", () => {
    expect(friendlyBankError("Enable Banking 503: Service Unavailable")).toMatch(/vorübergehend nicht erreichbar/i);
  });

  it("erkennt Rate-Limiting (429)", () => {
    expect(friendlyBankError("Enable Banking 429: Too Many Requests")).toMatch(/zu viele anfragen/i);
  });

  it("erkennt Netzwerkfehler", () => {
    expect(friendlyBankError("TypeError: Failed to fetch")).toMatch(/keine verbindung/i);
  });

  it("generisches 400 ohne ASPSP → 'abgelehnt'-Hinweis", () => {
    expect(friendlyBankError("Enable Banking 400: Bad Request")).toMatch(/abgelehnt/i);
  });

  it("liefert für Unbekanntes eine generische, freundliche Meldung (kein rohes JSON)", () => {
    const msg = friendlyBankError("irgendwas seltsames");
    expect(msg).toMatch(/fehlgeschlagen/i);
    expect(msg).not.toContain("{");
  });
});
