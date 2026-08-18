// Lizenzserver (worker/license-worker.js).
//
// Der Worker läuft bei Cloudflare, nicht im Build der App — deshalb fällt an
// ihm nichts auf, bis ein zahlender Nutzer davorsteht. Zwei Fallen, die dieser
// Test festnagelt:
//
//   1. CORS. Aufgerufen wird /verify aus dem Browser (die PWA liegt auf
//      GitHub Pages), also über eine fremde Origin. Fehlen die Header, ist der
//      Endpunkt aus der App heraus unerreichbar — per curl dagegen völlig
//      unauffällig. Besonders tückisch: die FEHLER-Antworten. Ein 402 ohne
//      CORS-Header kann der Browser nicht lesen, aus „Lizenzcode ungültig"
//      würde ein diffuser Netzwerkfehler.
//   2. `products`. Der KV-Namespace ist app-übergreifend (ein Lizenzserver für
//      alle SupaDupa-Apps). Getrennt werden die Codes über dieses Feld im
//      Wert, nicht über den Speicher — ohne die Prüfung würde ein Money-Code
//      jede spätere App mit freischalten.
//
// Das Token wird hier echt nachgerechnet (HMAC-SHA256 gegen dasselbe Secret),
// nicht nur auf „sieht aus wie ein Token" geprüft.

import { describe, it, expect } from "vitest";
import worker from "../worker/license-worker.js";

const SECRET = "test-secret-nur-fuer-diesen-lauf";
const IN_ZUKUNFT = "2099-01-01T00:00:00Z";
const VERGANGEN = "2020-01-01T00:00:00Z";

function envMit(eintraege) {
  return {
    LICENSE_SECRET: SECRET,
    LICENSE_KV: {
      async get(key, typ) {
        const wert = eintraege[key];
        if (!wert) return null;
        return typ === "json" ? wert : JSON.stringify(wert);
      },
    },
  };
}

function verify(body, { origin = "https://einfachmachen.github.io", ...rest } = {}) {
  return new Request("https://license-worker.example/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
    ...rest,
  });
}

const LIZENZ = {
  email: "kunde@example.com",
  tier: "pro",
  products: ["money"],
  purchasedAt: "2026-08-01T00:00:00Z",
  expiresAt: IN_ZUKUNFT,
};

// Signatur nachrechnen, wie es ein Client täte.
async function signaturStimmt(token) {
  const [payloadB64, sigB64] = token.split(".");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, sig, enc.encode(payloadB64));
}

const nutzlast = (token) => JSON.parse(atob(token.split(".")[0]));

describe("Lizenzserver", () => {
  it("beantwortet den Preflight, sonst kommt die PWA gar nicht erst durch", async () => {
    const res = await worker.fetch(
      new Request("https://license-worker.example/verify", {
        method: "OPTIONS",
        headers: { Origin: "https://einfachmachen.github.io" },
      }),
      envMit({})
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://einfachmachen.github.io");
    expect(res.headers.get("Access-Control-Allow-Headers")).toMatch(/Content-Type/);
    expect(res.headers.get("Access-Control-Allow-Methods")).toMatch(/POST/);
  });

  it("gibt ein gueltig signiertes Token zurueck", async () => {
    const res = await worker.fetch(verify({ licenseCode: "ABCD-1234", product: "money" }),
      envMit({ "ABCD-1234": LIZENZ }));
    expect(res.status).toBe(200);
    const daten = await res.json();
    expect(daten.email).toBe("kunde@example.com");
    expect(daten.tier).toBe("pro");
    expect(daten.products).toEqual(["money"]);
    expect(await signaturStimmt(daten.token)).toBe(true);

    const p = nutzlast(daten.token);
    expect(p.products).toEqual(["money"]);
    // 30 Tage Laufzeit, bewusst offline-tolerant.
    expect(p.exp - p.iat).toBe(30 * 24 * 60 * 60);
  });

  it("verweigert unbekannte, abgelaufene und fremde Codes mit 402", async () => {
    const env = envMit({
      "ABCD-1234": LIZENZ,
      "ALT-0000": { ...LIZENZ, expiresAt: VERGANGEN },
    });

    const unbekannt = await worker.fetch(verify({ licenseCode: "GIBTS-NICHT" }), env);
    expect(unbekannt.status).toBe(402);
    expect((await unbekannt.json()).error).toBe("license_not_found");

    const abgelaufen = await worker.fetch(verify({ licenseCode: "ALT-0000" }), env);
    expect(abgelaufen.status).toBe(402);
    expect((await abgelaufen.json()).error).toBe("license_expired");

    // Ein Money-Code darf eine spaetere SupaDupa-App NICHT mit freischalten.
    const fremd = await worker.fetch(verify({ licenseCode: "ABCD-1234", product: "irgendwas" }), env);
    expect(fremd.status).toBe(402);
    expect((await fremd.json()).error).toBe("product_not_licensed");
  });

  it("auch die Fehlerantworten tragen CORS-Header — sonst sieht der Nutzer nur „Netzwerkfehler“", async () => {
    const env = envMit({});
    for (const [name, req] of [
      ["unbekannter Code", verify({ licenseCode: "GIBTS-NICHT" })],
      ["kaputtes JSON", new Request("https://license-worker.example/verify", {
        method: "POST", headers: { Origin: "https://einfachmachen.github.io" }, body: "{kein json" })],
      ["ohne Code", verify({})],
      ["falscher Pfad", new Request("https://license-worker.example/nix", {
        method: "POST", headers: { Origin: "https://einfachmachen.github.io" } })],
    ]) {
      const res = await worker.fetch(req, env);
      expect(res.status, name).toBeGreaterThanOrEqual(400);
      expect(res.headers.get("Access-Control-Allow-Origin"), name)
        .toBe("https://einfachmachen.github.io");
    }
  });

  it("ein Eintrag ohne products gilt fuer alle Apps (Altbestand bleibt gueltig)", async () => {
    const { products, ...ohneProducts } = LIZENZ;
    const res = await worker.fetch(verify({ licenseCode: "ALT-1111", product: "money" }),
      envMit({ "ALT-1111": ohneProducts }));
    expect(res.status).toBe(200);
    expect((await res.json()).products).toEqual(["*"]);
  });

  it("ALLOWED_ORIGINS schraenkt ein, wenn gesetzt", async () => {
    const env = { ...envMit({ "ABCD-1234": LIZENZ }), ALLOWED_ORIGINS: "https://meine.app" };
    const res = await worker.fetch(verify({ licenseCode: "ABCD-1234" }, { origin: "https://boese.example" }), env);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://meine.app");
  });

  it("/health antwortet", async () => {
    const res = await worker.fetch(new Request("https://license-worker.example/health"), envMit({}));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
  });
});
