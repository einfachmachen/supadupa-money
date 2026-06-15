// Enable-Banking-Relay — minimaler, ZUSTANDSLOSER Durchleitungs-Proxy.
//
// Zweck: löst ausschließlich das CORS-Problem. Der Browser signiert das JWT
// selbst (mit dem privaten Schlüssel des Nutzers, siehe
// src/utils/enableBanking.js) und schickt es als Authorization-Header. Dieser
// Worker reicht die Anfrage 1:1 an api.enablebanking.com weiter und gibt die
// Antwort mit CORS-Headern zurück.
//
// Wichtig:
//   • Der Worker speichert NICHTS (keine Tokens, keine Schlüssel, keine Umsätze).
//   • Er leitet NUR an api.enablebanking.com weiter (kein offener Proxy).
//   • Er hält selbst KEIN Geheimnis — der private Schlüssel bleibt im Browser.
//
// Deploy (Cloudflare, kostenloser Free-Tier):
//   1. npm i -g wrangler  &&  wrangler login
//   2. In diesem Ordner:  wrangler deploy
//   3. Die ausgegebene URL (…workers.dev) als „Relay-URL“ in SupaDupa Money
//      eintragen.
//
// Optional: ALLOWED_ORIGINS als Variable setzen (kommaseparierte Liste), um
// den Zugriff auf die eigene App-Domain zu beschränken. Leer = alle Origins.

const UPSTREAM = "https://api.enablebanking.com";

function corsHeaders(origin, allowed) {
  // Wenn keine Allowlist konfiguriert ist: Origin zurückspiegeln (bzw. *).
  let allowOrigin = "*";
  if (allowed && allowed.length) {
    allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  } else if (origin) {
    allowOrigin = origin;
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
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

    if (!["GET", "POST"].includes(request.method)) {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }

    // Pfad + Query unverändert an die Enable-Banking-API weiterreichen
    const inUrl = new URL(request.url);
    const upstreamUrl = UPSTREAM + inUrl.pathname + inUrl.search;

    // Nur die nötigen Header übernehmen (Authorization + Content-Type)
    const fwdHeaders = new Headers();
    const auth = request.headers.get("Authorization");
    if (auth) fwdHeaders.set("Authorization", auth);
    const ct = request.headers.get("Content-Type");
    if (ct) fwdHeaders.set("Content-Type", ct);
    fwdHeaders.set("Accept", "application/json");

    const init = { method: request.method, headers: fwdHeaders };
    if (request.method === "POST") init.body = await request.text();

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamUrl, init);
    } catch (e) {
      return new Response(JSON.stringify({ error: "relay_fetch_failed", detail: String(e) }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Antwort durchreichen + CORS-Header ergänzen
    const body = await upstreamRes.text();
    const headers = new Headers(cors);
    headers.set("Content-Type", upstreamRes.headers.get("Content-Type") || "application/json");
    return new Response(body, { status: upstreamRes.status, headers });
  },
};
