// SupaDupa Money License Worker — Phase 1: Verify Endpoint + KV-Struktur
//
// POST /verify
//   - Akzeptiert: { licenseCode: "..." }
//   - Sucht Code in KV-Namespace LICENSE_KV auf
//   - Gibt HMAC-signiertes Session-Token zurück (30 Tage gültig, offline-validierbar)
//   - 402 Payment Required bei ungültig/abgelaufen
//
// KV-Struktur:
//   LICENSE_KV[licenseCode] = { email, tier, purchasedAt, expiresAt }
//   tier: "pro" | "team" (für zukünftige Funktionen)
//
// Token-Format (offline-validierbar):
//   payload = Base64(JSON.stringify({ email, tier, iat, exp }))
//   signature = Base64(HMAC-SHA256(payload, secret))
//   token = payload + "." + signature
//
// Deploy:
//   1. wrangler deploy --name license-worker
//   2. KV-Namespace erstellen:  wrangler kv:namespace create LICENSE_KV
//      (oder in wrangler.toml konfigurieren)
//   3. Secret setzen:  wrangler secret put LICENSE_SECRET
//

const TOKEN_VALIDITY_DAYS = 30;
const TOKEN_VALIDITY_MS = TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

async function generateToken(email, tier, secret) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_VALIDITY_DAYS * 24 * 60 * 60;

  const payload = {
    email,
    tier,
    iat: now,
    exp,
  };

  // Payload kodieren
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = btoa(payloadStr);

  // HMAC-SHA256 Signatur
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(payloadB64)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${payloadB64}.${signatureB64}`;
}

async function handleVerify(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { licenseCode } = body;
  if (!licenseCode || typeof licenseCode !== "string") {
    return new Response(JSON.stringify({ error: "missing_license_code" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // KV-Lookup
  const kv = env.LICENSE_KV;
  if (!kv) {
    return new Response(
      JSON.stringify({ error: "kv_not_configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const licenseData = await kv.get(licenseCode, "json");
  if (!licenseData) {
    return new Response(
      JSON.stringify({
        error: "license_not_found",
        message: "Lizenzcode nicht gefunden oder ungültig",
      }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  // Gültigkeit prüfen
  const now = Date.now();
  const expiresAt = new Date(licenseData.expiresAt).getTime();
  if (expiresAt < now) {
    return new Response(
      JSON.stringify({
        error: "license_expired",
        message: "Lizenz ist abgelaufen",
      }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  // Token generieren
  const secret = env.LICENSE_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "secret_not_configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = await generateToken(licenseData.email, licenseData.tier, secret);

  return new Response(
    JSON.stringify({
      token,
      email: licenseData.email,
      tier: licenseData.tier,
      expiresIn: Math.floor((expiresAt - now) / 1000),
      validUntil: new Date(now + TOKEN_VALIDITY_MS).toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache, no-store",
      },
    }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Router
    if (path === "/verify") {
      return handleVerify(request, env);
    }

    if (path === "/health") {
      return new Response("OK", { status: 200 });
    }

    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
