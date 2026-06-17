# Persönlicher Daten-Store (Cloudflare Worker + KV)

Deine **eigene private „Cloud-DB"** für SupaDupa Money: speichert Konfiguration
und Buchungen, damit sie auf allen deinen Geräten verfügbar sind. Du betreibst
deine eigene Instanz — **kein geteilter Server, keine zentrale Datenhaltung**.

## Ein-Klick-Einrichtung

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/einfachmachen/supadupa-money/tree/main/worker-data)

Der Button legt nach dem Cloudflare-Login den Worker **und** den KV-Namespace an.
Danach noch das Zugriffs-Geheimnis setzen (siehe unten) und die ausgegebene
`…workers.dev`-URL in der App eintragen.

## Zugriffs-Geheimnis (`SYNC_SECRET`)

Der Worker akzeptiert nur Anfragen mit dem Header `X-Secret`, der `SYNC_SECRET`
entsprechen muss. Setze es so (Wert in der App unter *Secret* generieren lassen):

- **Dashboard:** Worker → *Settings* → *Variables and Secrets* → `SYNC_SECRET`
  hinzufügen (als *Secret*).
- **CLI:** `wrangler secret put SYNC_SECRET`

Ohne gesetztes `SYNC_SECRET` antwortet der Worker bewusst mit `503`.

## Manuelles Deploy (Alternative)

```bash
npm install -g wrangler
wrangler login
cd worker-data
wrangler kv namespace create SYNC_KV   # id in wrangler.toml eintragen
wrangler secret put SYNC_SECRET        # dein Geheimnis
wrangler deploy
```

## Datenschutz / Zero-Knowledge

Der Worker ist **inhaltsblind**. Setzt du in der App eine **Passphrase**, werden
die Daten schon im Browser verschlüsselt (AES-GCM) und hier nur als Chiffrat
abgelegt — selbst bei einem Einbruch in den Store bleibt alles unlesbar. Ohne
Passphrase liegen die Daten im Klartext (nur durch `SYNC_SECRET` geschützt).

## Endpunkte

Alle erfordern den Header `X-Secret`:

| Methode | Pfad          | Zweck                          |
|---------|---------------|--------------------------------|
| GET     | `/ping`       | Verbindungstest                |
| PUT/GET | `/config`     | App-Konfiguration (JSON)       |
| PUT/GET | `/txs/<jahr>` | Buchungen eines Jahres (JSON)  |
| GET     | `/keys`       | `{ txYears: [...] }`           |
