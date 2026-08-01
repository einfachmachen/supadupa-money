# Cloudflare Workers für SupaDupa Money

## Worker 1: Enable-Banking-Relay

Ein **zustandsloser** Durchleitungs-Proxy, der nur das CORS-Problem löst, damit
SupaDupa Money direkt aus dem Browser mit der Enable-Banking-API sprechen kann.

### Was der Worker tut (und was nicht)

- ✅ Reicht Anfragen 1:1 an `https://api.enablebanking.com` weiter und ergänzt
  CORS-Header.
- ✅ Leitet **ausschließlich** dorthin weiter (kein offener Proxy).
- ❌ Speichert **nichts** — keine Tokens, keine Schlüssel, keine Umsätze.
- ❌ Hält **kein Geheimnis** — das JWT wird im Browser mit dem privaten
  Schlüssel des Nutzers signiert (siehe `src/utils/enableBanking.js`).

### Deploy

```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```

Wrangler gibt eine URL aus, z. B. `https://enable-banking-proxy.<name>.workers.dev`.
Diese URL trägst du in SupaDupa Money als **Relay-URL** ein.

### Optional: Zugriff einschränken

In `wrangler.toml` die `ALLOWED_ORIGINS`-Variable (kommasepariert) auf deine
App-Domain(s) setzen. Leer lassen = alle Origins (unkritisch, da der Worker
ohnehin nur an Enable Banking weiterleitet und nichts speichert).

---

## Worker 2: License-Worker (Phase 1)

Verifiziert Lizenzcodes und generiert offline-validierbare Session-Tokens.

### KV-Namespace Setup

```bash
# KV-Namespace erstellen
wrangler kv:namespace create LICENSE_KV
wrangler kv:namespace create LICENSE_KV --preview

# IDs in wrangler-license.toml eintragen:
# [[kv_namespaces]]
# binding = "LICENSE_KV"
# id = "YOUR_KV_NAMESPACE_ID"
# preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID"
```

### Secret konfigurieren

```bash
# Zufälligen Secret generieren (z. B. mit OpenSSL)
openssl rand -hex 32

# Secret in Cloudflare speichern
wrangler secret put LICENSE_SECRET
wrangler secret put LICENSE_SECRET --env development
```

### KV-Datenstruktur

Schlüssel: `licenseCode` (z. B. "SUPA-DUPA-2024-ABC123")

Wert (JSON):
```json
{
  "email": "user@example.com",
  "tier": "pro",
  "purchasedAt": "2026-08-01T10:00:00Z",
  "expiresAt": "2027-08-01T10:00:00Z"
}
```

### Deploy

```bash
cd worker
wrangler deploy --config wrangler-license.toml
```

Gibt URL aus, z. B. `https://license-worker.<name>.workers.dev`.

### API

#### POST /verify

Request:
```json
{ "licenseCode": "SUPA-DUPA-2024-ABC123" }
```

Response (200 OK):
```json
{
  "token": "eyJlbWFpbCI6Li4uIi50aWVyIjoicHJvIiwuYXQuLi50aWVyIjoicHJvI...",
  "email": "user@example.com",
  "tier": "pro",
  "expiresIn": 2592000,
  "validUntil": "2026-09-01T10:00:00Z"
}
```

Response (402 Payment Required):
```json
{
  "error": "license_not_found",
  "message": "Lizenzcode nicht gefunden oder ungültig"
}
```

### Token-Format

Selbstsigniertes Format (keine Server-Anfrage für Validierung nötig):
- `payload` = Base64(JSON) mit email, tier, iat, exp
- `signature` = HMAC-SHA256(payload, secret)
- `token` = `payload.signature`

Gültig für 30 Tage (offline-fähig).

---

## Voll autark (Weg B aus ENABLE_BANKING_PLAN.md)

Jede:r Nutzer:in kann diese Worker im **eigenen** kostenlosen Cloudflare-Konto
deployen und die eigenen URLs verwenden — dann gibt es gar keinen zentralen
Punkt beim Betreiber.
