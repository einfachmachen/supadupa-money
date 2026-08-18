// SupaDupa Money License Worker — Phase 1: Verify Endpoint + KV-Struktur
//
// POST /verify
//   - Akzeptiert: { licenseCode: "...", product: "money" }
//   - Sucht Code in KV-Namespace LICENSE_KV auf
//   - Gibt HMAC-signiertes Session-Token zurück (30 Tage gültig, offline-validierbar)
//   - 402 Payment Required bei ungültig/abgelaufen/falscher App
//
// KV-Struktur:
//   LICENSE_KV[licenseCode] = { email, tier, products, purchasedAt, expiresAt }
//   tier:     "pro" | "team" (für zukünftige Funktionen)
//   products: ["money", ...] — für welche SupaDupa-App(s) der Code gilt.
//
// Warum `products`: der Namespace ist app-übergreifend angelegt (ein
// Lizenzserver, ein Secret, eine URL für alle SupaDupa-Apps; die KV-Limits
// gelten ohnehin pro Konto, nicht pro Namespace). Getrennt werden die Codes
// deshalb nicht über den Speicher, sondern über dieses Feld. Fehlt es, gilt
// der Code für ALLE Apps — so bleiben früh ausgegebene Codes gültig, wenn
// später eine zweite App dazukommt.
//
// Token-Format (offline-validierbar):
//   payload = Base64(JSON.stringify({ email, tier, products, iat, exp }))
//   signature = Base64(HMAC-SHA256(payload, secret))
//   token = payload + "." + signature
//
// Deploy (in diesem Ordner liegen ZWEI Konfigurationen, --config ist Pflicht —
// ohne den Schalter nimmt wrangler die wrangler.toml des Bank-Proxys):
//   1. KV-Namespace anlegen und die id in wrangler-license.toml eintragen
//   2. wrangler secret put LICENSE_SECRET --config wrangler-license.toml
//   3. wrangler deploy --config wrangler-license.toml
//

const TOKEN_VALIDITY_DAYS = 30;
const TOKEN_VALIDITY_MS = TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

// Aufgerufen wird der Worker aus dem Browser (die PWA liegt auf GitHub Pages),
// also über eine fremde Origin. Ohne diese Header scheitert schon der
// Preflight, und /verify ist aus der App heraus nicht erreichbar — per curl
// dagegen unauffällig. Gleiche Bauart wie im enable-banking-proxy.
function corsHeaders(origin, allowed) {
  let allowOrigin = "*";
  if (allowed && allowed.length) {
    allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  } else if (origin) {
    allowOrigin = origin;
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function generateToken(email, tier, products, secret) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_VALIDITY_DAYS * 24 * 60 * 60;

  const payload = {
    email,
    tier,
    products,
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

async function handleVerify(request, env, cors) {
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const { licenseCode, product } = body;
  if (!licenseCode || typeof licenseCode !== "string") {
    return json({ error: "missing_license_code" }, 400, cors);
  }

  // KV-Lookup
  const kv = env.LICENSE_KV;
  if (!kv) {
    return json({ error: "kv_not_configured" }, 500, cors);
  }

  const licenseData = await kv.get(licenseCode, "json");
  if (!licenseData) {
    return json(
      { error: "license_not_found", message: "Lizenzcode nicht gefunden oder ungültig" },
      402,
      cors
    );
  }

  // Gültigkeit prüfen
  const now = Date.now();
  const expiresAt = new Date(licenseData.expiresAt).getTime();
  if (expiresAt < now) {
    return json({ error: "license_expired", message: "Lizenz ist abgelaufen" }, 402, cors);
  }

  // App-Zuordnung prüfen. `null` = kein products-Feld im Eintrag = gilt für
  // alles. Fragt der Client ohne `product`, wird nicht geprüft (praktisch für
  // curl-Tests und für ältere Clients).
  const erlaubt = Array.isArray(licenseData.products) && licenseData.products.length
    ? licenseData.products
    : null;
  if (product && erlaubt && !erlaubt.includes(product)) {
    return json(
      {
        error: "product_not_licensed",
        message: `Lizenz gilt nicht für "${product}"`,
      },
      402,
      cors
    );
  }

  // Token generieren
  const secret = env.LICENSE_SECRET;
  if (!secret) {
    return json({ error: "secret_not_configured" }, 500, cors);
  }

  const token = await generateToken(
    licenseData.email,
    licenseData.tier,
    erlaubt || ["*"],
    secret
  );

  return new Response(
    JSON.stringify({
      token,
      email: licenseData.email,
      tier: licenseData.tier,
      products: erlaubt || ["*"],
      expiresIn: Math.floor((expiresAt - now) / 1000),
      validUntil: new Date(now + TOKEN_VALIDITY_MS).toISOString(),
    }),
    {
      status: 200,
      headers: {
        ...cors,
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

    const origin = request.headers.get("Origin") || "";
    const allowed = (env && env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS) : "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cors = corsHeaders(origin, allowed);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Router
    if (path === "/verify") {
      return handleVerify(request, env, cors);
    }

    if (path === "/health") {
      return new Response("OK", { status: 200, headers: cors });
    }

    return json({ error: "not_found" }, 404, cors);
  },
};
