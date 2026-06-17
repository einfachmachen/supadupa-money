// SupaDupa Money — persönlicher Daten-Store (Cloudflare Worker + KV).
//
// Das ist die private "Cloud-DB" eines einzelnen Nutzers: Sie speichert die
// App-Daten (Konfiguration + Buchungen pro Jahr), damit sie auf allen eigenen
// Geräten verfügbar sind. Jeder Nutzer betreibt seine EIGENE Instanz — es gibt
// keinen geteilten Server und keine zentrale Datenhaltung.
//
// Sicherheit:
//   • Zugriff nur mit dem geheimen Header `X-Secret` (== env.SYNC_SECRET).
//   • Der Worker ist inhaltsblind: Setzt der Nutzer in der App eine Passphrase,
//     kommen die Bodies bereits VERSCHLÜSSELT an (AES-GCM) und werden 1:1
//     abgelegt. Der Worker sieht dann nur Chiffrat (Zero-Knowledge).
//
// Endpunkte (alle erfordern Header `X-Secret`):
//   GET  /ping            → { ok:true }                 (Verbindungstest)
//   PUT  /config          ← JSON                        (App-Konfiguration)
//   GET  /config          → JSON
//   PUT  /txs/<jahr>       ← JSON-Array                  (Buchungen eines Jahres)
//   GET  /txs/<jahr>       → JSON-Array
//   GET  /keys            → { txYears:[ ... ] }          (vorhandene Jahre)
//
// Speicher: KV-Namespace, gebunden als `SYNC_KV` (siehe wrangler.toml).
//   Schlüssel: "config", "txs:<jahr>".

const CFG_KEY = "config";
const TX_PREFIX = "txs:";

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "X-Secret,Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body, status, origin) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // Konfigurationsfehler früh und deutlich melden.
    if (!env.SYNC_SECRET) {
      return json({ error: "SYNC_SECRET ist nicht gesetzt (Worker-Variable konfigurieren)" }, 503, origin);
    }
    if (!env.SYNC_KV) {
      return json({ error: "KV-Namespace SYNC_KV ist nicht gebunden" }, 503, origin);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // Authentifizierung über geheimen Header.
    const secret = request.headers.get("X-Secret") || "";
    if (secret !== env.SYNC_SECRET) {
      return json({ error: "X-Secret fehlt oder ist falsch" }, 401, origin);
    }

    const kv = env.SYNC_KV;

    try {
      // Verbindungstest
      if (path === "/ping") return json({ ok: true }, 200, origin);

      // Liste der vorhandenen Jahre
      if (path === "/keys" && request.method === "GET") {
        const years = [];
        let cursor;
        do {
          const res = await kv.list({ prefix: TX_PREFIX, cursor });
          for (const k of res.keys) years.push(k.name.slice(TX_PREFIX.length));
          cursor = res.list_complete ? null : res.cursor;
        } while (cursor);
        years.sort();
        return json({ txYears: years }, 200, origin);
      }

      // Konfiguration
      if (path === "/config") {
        if (request.method === "PUT") {
          await kv.put(CFG_KEY, await request.text());
          return json({ ok: true }, 200, origin);
        }
        if (request.method === "GET") {
          const v = await kv.get(CFG_KEY);
          return json(v ?? "{}", 200, origin);
        }
      }

      // Buchungen pro Jahr
      const m = path.match(/^\/txs\/([A-Za-z0-9_-]+)$/);
      if (m) {
        const key = TX_PREFIX + m[1];
        if (request.method === "PUT") {
          await kv.put(key, await request.text());
          return json({ ok: true }, 200, origin);
        }
        if (request.method === "GET") {
          const v = await kv.get(key);
          return json(v ?? "[]", 200, origin);
        }
      }

      return json({ error: "Unbekannter Pfad" }, 404, origin);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500, origin);
    }
  },
};
