# Enable-Banking-Relay (Cloudflare Worker)

Ein **zustandsloser** Durchleitungs-Proxy, der nur das CORS-Problem löst, damit
SupaDupa Money direkt aus dem Browser mit der Enable-Banking-API sprechen kann.

## Was der Worker tut (und was nicht)

- ✅ Reicht Anfragen 1:1 an `https://api.enablebanking.com` weiter und ergänzt
  CORS-Header.
- ✅ Leitet **ausschließlich** dorthin weiter (kein offener Proxy).
- ❌ Speichert **nichts** — keine Tokens, keine Schlüssel, keine Umsätze.
- ❌ Hält **kein Geheimnis** — das JWT wird im Browser mit dem privaten
  Schlüssel des Nutzers signiert (siehe `src/utils/enableBanking.js`).

## Deploy (kostenloser Cloudflare-Free-Tier)

```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```

Wrangler gibt eine URL aus, z. B. `https://enable-banking-proxy.<name>.workers.dev`.
Diese URL trägst du in SupaDupa Money als **Relay-URL** ein.

## Optional: Zugriff einschränken

In `wrangler.toml` die `ALLOWED_ORIGINS`-Variable (kommasepariert) auf deine
App-Domain(s) setzen. Leer lassen = alle Origins (unkritisch, da der Worker
ohnehin nur an Enable Banking weiterleitet und nichts speichert).

## Voll autark (Weg B aus ENABLE_BANKING_PLAN.md)

Jede:r Nutzer:in kann diesen Worker im **eigenen** kostenlosen Cloudflare-Konto
deployen und die eigene Relay-URL verwenden — dann gibt es gar keinen zentralen
Punkt beim Betreiber.
