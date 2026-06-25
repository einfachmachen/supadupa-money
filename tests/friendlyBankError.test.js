import { describe, it, expect } from "vitest";
import { friendlyBankError } from "../src/utils/enableBankingFetch.js";

describe("friendlyBankError — Klartext statt rohem Fehler-JSON", () => {
  it("übersetzt den ASPSP-Serverfehler der Bank in eine klare 'liegt an der Bank'-Meldung", () => {
    const raw = 'Enable Banking 400 [Session erstellen: POST /sessions]: {"code":400,"message":"Error interacting with ASPSP","detail":{"message":"Internal server error","error_name":"HttpException","error_data":{}},"error":"ASPSP_ERROR"}';
    const msg = friendlyBankError(raw);
    expect(msg).toMatch(/internen Fehler/i);
    expect(msg).toMatch(/betrifft alle Banking-Apps/i);
    expect(msg).toMatch(/vorübergehend/i);
    expect(msg).not.toContain("{");
  });

  it("erkennt 5xx-Serverfehler als bankseitig/vorübergehend", () => {
    expect(friendlyBankError("Enable Banking 503: Service Unavailable")).toMatch(/internen Fehler|vorübergehend/i);
  });

  it("erkennt Rate-Limiting (429)", () => {
    expect(friendlyBankError("Enable Banking 429: Too Many Requests")).toMatch(/zu viele anfragen/i);
  });

  it("erkennt Netzwerkfehler", () => {
    expect(friendlyBankError("TypeError: Failed to fetch")).toMatch(/keine verbindung/i);
  });

  it("abgelaufene/zurückgezogene Freigabe (401/expired) → neu verbinden", () => {
    expect(friendlyBankError("Enable Banking 401: consent expired")).toMatch(/freigabe.*(abgelaufen|zurückgezogen)/i);
    expect(friendlyBankError("Enable Banking 403: Forbidden")).toMatch(/neu verbinden/i);
  });

  it("404 beim Abruf → Konto neu zuordnen", () => {
    const raw = "Enable Banking 404 [Umsätze abrufen: GET /accounts/abc/transactions]: not found";
    expect(friendlyBankError(raw)).toMatch(/konto.*nicht gefunden|neu zuordnen/i);
  });

  it("400 beim Session-Schritt → Anmeldung zügig bestätigen", () => {
    const raw = 'Enable Banking 400 [Session erstellen: POST /sessions]: {"error":"invalid_request"}';
    expect(friendlyBankError(raw)).toMatch(/zügig bestätigen|nicht abgeschlossen/i);
  });

  it("400 beim Auth-Schritt → Verbindungs-Check abgleichen", () => {
    const raw = 'Enable Banking 400 [Anmeldung starten: POST /auth]: {"error":"bad request"}';
    expect(friendlyBankError(raw)).toMatch(/Verbindungs-Check/i);
  });

  it("generisches 400 ohne Schritt → 'abgelehnt'-Hinweis", () => {
    expect(friendlyBankError("Enable Banking 400: Bad Request")).toMatch(/abgelehnt/i);
  });

  it("benennt bei Unbekanntem den Schritt und bleibt frei von rohem JSON", () => {
    const raw = "Enable Banking 418 [Umsätze abrufen: GET /accounts/x/transactions]: I am a teapot";
    const msg = friendlyBankError(raw);
    expect(msg).toMatch(/fehlgeschlagen/i);
    expect(msg).toMatch(/beim Abrufen der Umsätze/i);
    expect(msg).not.toContain("{");
  });
});
