# Echte Bankdaten in SupaDupa — Anbindung über Enable Banking

Stand: 2026-06-14 · Status: **Planungsdokument** (noch keine Implementierung)

Dieses Dokument beschreibt, wie Nutzer ihre echten Bankumsätze direkt (statt per
CSV-Export) in SupaDupa holen können — **kostenlos für den Betreiber, ohne dass
zentral Bank-Zugangsdaten gespeichert werden**.

---

## 1. Zusammenfassung der Entscheidung

| Kriterium | Ergebnis |
|---|---|
| **Anbieter** | **Enable Banking** (EU/UK) |
| **Warum nicht GoCardless/Nordigen** | Hat den kostenlosen „Bank Account Data"-Zugang **für neue Nutzer seit ~Juli 2025 geschlossen**. Nur Bestandskonten laufen weiter. |
| **Kosten Betreiber** | **0 €** im „Restricted Production"-Modus (eigene Konten) + kostenloser Cloudflare-Worker-Free-Tier |
| **Lizenz / eIDAS** | **Bringt Enable Banking mit** (sie agieren als technischer Dienstleister einer lizenzierten TPP) — keine eigene AISP-Lizenz nötig, solange es um eigene/whitelisted Konten geht |
| **Bank-Login** | Findet **direkt bei der Bank** statt (PSD2). Passwort/PIN berührt SupaDupa **nie**. |
| **Gespeicherte Credentials** | **Keine** zentral. Privater Schlüssel + Tokens bleiben lokal im Browser des Users (IndexedDB). |

### Was der Markt erzwingt (ehrliche Grenzen)
- Es gibt **2026 keinen** Anbieter mehr, der eine *öffentliche* App für *beliebige
  fremde* Nutzer **kostenlos** bedient. „Gratis + autark" gilt für den Modus
  **„eigene Konten freischalten"**.
- Eine öffentliche App für Dritte → erfordert Vertrag + kostenpflichtige
  Skalierung (spätere, separate Entscheidung).
- Der Aggregator (Enable Banking) **sieht die Umsätze im Durchlauf** — das ist bei
  *jedem* Open-Banking-Anbieter technisch unvermeidbar.

### Reale Referenz-Integrationen (Beweis, dass der Weg trägt)
- **Firefly III** (Data Importer) — Enable Banking als Sync-Quelle
- **Actual Budget** — Enable Banking als Bank-Sync (PR #7345)

Beides sind Selfhost-Finanztracker mit demselben Anwendungsfall wie SupaDupa.

---

## 2. Nutzer-Setup (einmalig)

Der „ehrliche Preis" des Gratis-/Autark-Wegs: ein einmaliger, leicht technischer
Einrichtungsschritt. In der App mit bebilderter Anleitung führen.

1. Kostenloses Konto auf enablebanking.com anlegen.
2. Im Portal eine **Application** registrieren → der Browser generiert dabei einen
   **privaten Schlüssel** (`<application-id>.pem`, landet in den Downloads).
   Dabei die **Redirect-URL** der SupaDupa-Instanz hinterlegen.
3. Im Portal die **eigene Bank + Konten freischalten** (Whitelist → aktiviert
   „Restricted Production").
4. In SupaDupa **Application-ID + `.pem`-Schlüssel** einmalig hinterlegen
   (Speicherung **nur lokal**, IndexedDB — analog zu den übrigen App-Daten).
5. „Konto verbinden" → Weiterleitung **zur eigenen Bank** → Freigabe per TAN/App →
   zurück zu SupaDupa → Umsätze werden importiert.
6. Danach: Button **„Aktualisieren"**. Re-Auth bei der Bank **alle ~90 Tage**
   (PSD2-Pflicht, kein Anbieter umgeht das).

### Rate-Limit (PSD2, kein technisches Limit von Enable Banking)
- **4 automatische Hintergrund-Abrufe pro Konto/Tag** ohne anwesenden User.
- **Mit anwesendem User** (manuelles „Aktualisieren") sind zusätzliche Abrufe
  erlaubt.
- Für einen Finanztracker **praktisch irrelevant** — Umsätze buchen nur wenige Male
  pro Tag.

> ⚠️ **Offen / zu verifizieren:** Die exakten Free-Limits (max. Konten, Calls/Monat)
> sind nicht öffentlich gelistet (teils sales-gated). Das *Modell* („eigene Konten
> live gratis") ist bestätigt; die genauen Zahlen vor dem Bau direkt im Portal /
> bei Enable Banking prüfen.

---

## 3. API-Flow (Enable Banking)

Auth erfolgt per **RS256-signiertem JWT** (mit dem privaten `.pem`-Schlüssel der
Application). Grober Ablauf:

```
1. JWT bauen & signieren (RS256, kid = application-id)
   header:  { typ: "JWT", alg: "RS256", kid: <application-id> }
   payload: { iss: "enablebanking.com", aud: "api.enablebanking.com",
              iat: now, exp: now + 3600 }

2. GET  /aspsps                      → Liste der Banken (ASPSPs)
3. POST /auth                        → { aspsp, redirect_url, psu_type, state }
        → liefert URL zur Bank; User wird dorthin geleitet & autorisiert
4. (Bank-Redirect zurück mit ?code=…)
5. POST /sessions  { code }          → session_id + Liste autorisierter accounts
6. GET  /accounts/{id}/balances      → Salden
7. GET  /accounts/{id}/transactions  → Umsätze (booking_date, amount, …)
```

Doku: https://enablebanking.com/docs/api/quick-start/ und
https://enablebanking.com/docs/api/reference/

---

## 4. Anbindung an die bestehende SupaDupa-Pipeline

**Kernvorteil:** Die gesamte Auswertung existiert bereits. Enable Banking wird nur
eine **zweite Datenquelle neben dem CSV-Import**.

`src/utils/csv.js → parseCSV` erzeugt pro Buchung:

```js
{ isoDate, amount, desc, fp }   // fp = txFingerprint(isoDate, amount, desc)
```

Eine Enable-Banking-Transaktion wird auf dasselbe Schema gemappt:

```js
import { txFingerprint } from "../utils/tx.js";

function mapEnableBankingTx(tx, accountId) {
  // Vorzeichen: credit_debit_indicator ("CRDT"/"DBIT") bestimmt das Vorzeichen
  const raw = parseFloat(tx.transaction_amount?.amount || 0);
  const amount = tx.credit_debit_indicator === "DBIT" ? -raw : raw;

  const isoDate = tx.booking_date || tx.value_date; // bereits ISO (YYYY-MM-DD)

  // Beschreibung im bestehenden " · "-Schema aufbauen
  const parts = [
    tx.creditor?.name || tx.debtor?.name,
    Array.isArray(tx.remittance_information)
      ? tx.remittance_information.join(" ")
      : tx.remittance_information,
  ].filter(Boolean);
  const desc = parts.join(" · ").trim() || "Unbekannt";

  return {
    isoDate,
    amount,
    desc,
    fp: txFingerprint(isoDate, amount, desc),
    accountId,
    // optional: pending-Flag aus tx.status (z.B. "BOOK" vs "PDNG") → t.pending
  };
}
```

Danach laufen **unverändert** weiter:
- **Duplikaterkennung** (`txFingerprint` / `txFingerprintNorm`, `tx.js`) — greift
  sofort, auch formatübergreifend mit bereits importierten CSV-Buchungen.
- **Vormerkungs-Verknüpfung**, **Kategorisierung**, **Saldo-/Prognose-Logik**.

Praktisch zu integrierende Punkte:
- Neue Datenquelle/Screen analog zu `src/components/screens/CsvImportScreen.jsx`.
- EB-Konto ↔ SupaDupa-`accountId` zuordnen (Mapping-UI).
- `pending`-Status aus EB übernehmen, damit Vormerkungs-Matching funktioniert.

---

## 5. Architektur — beide Wege dokumentiert

Enable Banking erlaubt **keine direkten Browser-Aufrufe** (CORS) und verlangt
signierte Requests. Beide folgenden Wege sind **0 €** und speichern **keine**
Userdaten/Credentials zentral. Der private Schlüssel **verlässt den Browser nie**
(JWT wird per Web Crypto / RS256 **im Browser** signiert).

### Weg A — Ein gemeinsamer, datenloser Relay (Standard, einfacher für User)
```
[User-Browser / PWA]
  • hält .pem lokal (IndexedDB)
  • signiert JWT selbst (Web Crypto RS256)
        │  signierter Request
        ▼
[Cloudflare Worker — vom Betreiber, stateless]
  • reicht Request nur an api.enablebanking.com durch (CORS-Relay)
  • speichert NICHTS (keine Keys, keine Tokens, keine Umsätze)
        │
        ▼
[Enable Banking] ── PSD2 ──> [Bank des Users]
```
- **Pro:** ein einziger Setup-Schritt für den Betreiber, einfacher für User.
- **Contra:** ein (harmloser) zentraler Punkt — sieht Daten nur im Durchlauf,
  hält keinen Schlüssel.
- **Worker-Free-Tier** (Cloudflare): 100.000 Anfragen/Tag — für privaten/kleinen
  Einsatz mehr als genug.

### Weg B — Voll autark: eigener Relay pro User (Profi-Option)
```
[User-Browser / PWA] ──> [Eigener Cloudflare Worker des Users] ──> [Enable Banking] ──> [Bank]
```
- Der Betreiber liefert eine **Open-Source-Worker-Vorlage** + 1-Klick-Deploy.
- **Pro:** **kein** zentraler Punkt beim Betreiber — maximale Autarkie.
- **Contra:** spürbar mehr Einrichtung pro User (eigener Cloudflare/Vercel-Account
  + Deploy).

### Empfehlung
**Weg A** als Standard, **Weg B** als optionaler „Profi-Modus / eigenen Connector
nutzen" zum Nachrüsten. In der App als Einstellung anbieten:
„Standard-Verbindung" vs. „Eigener Connector (URL)".

> **Warum der Relay überhaupt nötig ist:** ausschließlich wegen CORS und um die
> EB-API erreichbar zu machen — **nicht** zum Signieren (das passiert im Browser)
> und **nicht** zum Speichern. Ein reiner Durchleitungs-Proxy.

---

## 6. Datenschutz / Verantwortung (Kurzfassung)

- **Nur für sich/Familie:** unkritisch.
- **Öffentlich für Dritte:** Betreiber wird DSGVO-Verantwortlicher
  (Datenschutzerklärung, AVV mit Enable Banking, ggf. Impressum) — UND es braucht
  Vertrag/Lizenzregelung + kostenpflichtige Skalierung. Separate, spätere
  Entscheidung.

---

## 7. Umsetzungsstand

**Gebaut & getestet:**
- [x] Web-Crypto-RS256-Signierung des JWT im Browser
      (`src/utils/enableBanking.js`, `buildJwt`) — Unit-Test mit echtem
      Signatur-Roundtrip.
- [x] Transaktions-Mapping EB → `{ isoDate, amount, desc, fp }`
      (`mapEnableBankingTx`) — Unit-getestet (CRDT/DBIT, Beschreibung, fp).
- [x] Relay-Client (`createEnableBankingClient`): aspsps/auth/sessions/transactions.
- [x] Cloudflare-Worker-Relay (`worker/enable-banking-proxy.js`) + Anleitung.
- [x] Lokaler Credential-Speicher (`enableBankingStore.js`): privater Schlüssel
      nur in IndexedDB, nie in der Cloud-Synchronisation.
- [x] Connect-Screen (`EnableBankingConnectScreen.jsx`): Zugangsdaten, Bank
      wählen, Redirect, Session, Konten-Mapping, Import mit Duplikat-Schutz.
- [x] Redirect-Abfang beim App-Start (`main.jsx`).
- [x] Menü-Einträge + Start-Button aus der Hilfe; Render-Smoke-Tests.

**Noch offen / noch nicht live getestet:**
- [ ] **End-to-End-Test gegen die echte API** (braucht Zugangsdaten + Relay).
      Feld-/Endpunktnamen ggf. an die reale API-Antwort anpassen
      (z. B. `aspsps`-Form, `sessions`-Antwortstruktur, `account uid`).
- [ ] Exakte Free-Limits von Enable Banking verifizieren (Konten/Calls).
- [ ] Vorgemerkte Bank-Umsätze (PDNG) werden derzeit übersprungen — später
      optional als Vormerkung übernehmen.
- [ ] Kategorisierung beim Import (aktuell unkategorisiert; nachträglich über
      „Nachkategorisieren“ möglich).

## 8. Inbetriebnahme (was du tun musst)

1. **Relay deployen:** im Ordner `worker/` → `wrangler deploy` (siehe
   `worker/README.md`). URL notieren.
2. **Enable-Banking-Zugang anlegen:** Konto + Application registrieren,
   `.pem`-Schlüssel herunterladen, Application-ID notieren, eigene Konten
   freischalten (siehe In-App-Hilfe „Bank verbinden – Anleitung“).
   Als Redirect-URL die App-Adresse eintragen.
3. **In der App:** Mehr → Daten → „Bank-Konto verbinden“ → Relay-URL,
   Application-ID und `.pem` eintragen → „Banken laden“ → Bank wählen →
   „Mit Bank verbinden“ → bei der Bank freigeben → Konten zuordnen →
   „Umsätze abrufen“.
4. **Falls API-Felder abweichen:** Die Anpassung erfolgt zentral in
   `src/utils/enableBanking.js` (Mapping/Client) — die getestete Kern-Logik
   bleibt gleich.

---

## Quellen
- openbankingtracker.com — Nordigen/GoCardless-Alternativen
  (https://www.openbankingtracker.com/api-aggregators/nordigen/alternatives)
- openbankingtracker.com — Best Open Banking API Providers for Developers 2026
  (https://www.openbankingtracker.com/blog/best-open-banking-api-providers-developers-2026)
- Enable Banking — Quick Start (https://enablebanking.com/docs/api/quick-start/)
- Enable Banking — FAQ (https://enablebanking.com/docs/faq/)
- Enable Banking — Sandbox (https://enablebanking.com/docs/api/sandbox/)
- Firefly III — Enable Banking Import
  (https://docs.firefly-iii.org/tutorials/data-importer/eb/)
- Actual Budget — Enable Banking Integration (PR #7345)
- Actual Budget — GoCardless-Setup-Doku (Hinweis auf BAD-Schließung)
  (https://actualbudget.org/docs/advanced/bank-sync/gocardless/)
