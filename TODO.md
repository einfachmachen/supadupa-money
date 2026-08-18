# ToDo / Backlog

Kurze, umsetzbare Liste offener Punkte. Format: `- [ ] Titel — Kontext/Akzeptanz.`

## Mobile-UI vervollständigen (Voraussetzung zum Ausblenden der Desktop-Modals)

Ziel: Desktop-Modals (AddTxModal, EditPopup, BudgetEditorModal …) aus der
Oberfläche ausblenden — NICHT löschen, für große Geräte/späteren dynamischen
Umschalter behalten. Vorher müssen die Mobile-Dialoge funktional gleichziehen.
Heute öffnet JEDER Bearbeiten-Tipp das Desktop-`EditPopup` (App.jsx:2609,
`openEdit → setEditTx → <EditPopup/>`), es gibt KEINEN Mobile-Edit.

- [ ] **Mobile-Bearbeiten-Dialog** (größte Lücke). `MobileVormerkenModal` um
  einen Edit-Modus erweitern (`initialTx`-Prop) ODER eigener MobileEditModal:
  bestehende Buchung/Vormerkung bearbeiten (Betrag/Datum/Kategorie/Notiz/
  Verursacherdatum/pending/Topf), **löschen**, Umbuchung & Finanzierung
  bearbeiten.
- [ ] **Serien-Scope auf Mobile** (nur diese / ab hier / alle) — Dialog wie
  Desktop `saveEdit(scope)` (App.jsx:2041+).
- [ ] **Splits auf Mobile** (mehrere Kategorien je Buchung) — beim Neu-Anlegen
  UND beim Bearbeiten. Mobile erzeugt aktuell immer genau 1 Split.
- [ ] **Budget-Scope auf Mobile** (ab Monat / alle) verifizieren und ggf.
  nachrüsten (Desktop: `BudgetEditorModal`).
- [ ] **Konto bearbeiten/löschen inline auf Mobile** (statt Link in den
  Struktur-Screen).
- [ ] **Dynamischer Umschalter Desktop↔Mobile-Dialoge** je Viewport/Einstellung,
  sobald die Mobile-Dialoge alles abdecken.
- [ ] **Landmine entschärfen:** `MobileBudgetModal` (App.jsx:3169) ist gerendert,
  aber nicht importiert/definiert; `setShowMobileBudget(true)` wird nie
  aufgerufen → toten Verweis + State entfernen oder echtes Modal bauen.
- [ ] **`StartBalanceEditor.jsx` entfernen.** Seit ihrer Entstehung bei der
  Modul-Aufteilung (Commit `17bd2c8`) ruft sie **niemand** auf — nie über die
  Oberfläche erreichbar. Dieselbe Aufgabe (Anker-Kontostände anlegen, listen,
  löschen) erledigt `AnchorSection`, eingebunden im CSV-Import. Bewusst noch
  liegen gelassen (Nutzer-Entscheidung), stört im Build nicht.

## Auswertungen / Features

- [x] **Tank-Erfassung & Verbrauchs-/Preisauswertung.** Erledigt (siehe
  Design-Guide.md §13): Erkennung über feste Kategorie „Tanken", Zusatzfelder
  `_fuelVehicleId`/`_fuelLiters`/`_fuelPricePerL`/`_odometer` an der Buchung,
  Erfassung in `MobileVormerkenModal`/`EditPopup` nur bei einmaliger Ausgabe
  mit dieser Kategorie, mehrere Fahrzeuge über eigenes `vehicles`-Array
  (inline anlegbar), Auswertung (Verbrauch l/100km + Preisentwicklung) in
  `FuelAnalysisScreen` (Bottom-Tab Daten → Tankverbrauch).

## Liquidität & Warnungen

- [ ] **Puffer-Warnung für beliebige Konten (nicht nur Giro).**
  Heute ist die Schieflage-Vorwarnung fest auf `acc-giro` verdrahtet
  (`src/utils/schieflagePreview.js` → `signedGiro()` zählt nur `acc-giro`;
  `src/components/atoms/SchieflageVorwarnung.jsx` liest nur `acc-giro`/`minPuffer`).
  Ziel: Jedes Konto mit gesetztem `minPuffer` soll eine eigene Vorwarnung
  auslösen können, wenn ein Entwurf (Vormerkung / Serie / Finanzierung /
  Umbuchung) es unter seinen Puffer drückt.
  - `signedGiro()` von „nur Giro" auf „pro Konto" verallgemeinern
    (Beitrag je `accountId` berechnen, `_linkedTo`-Bein weiter neutralisieren).
  - `schieflagePreview` pro Konto auswerten und das/die betroffene(n) Konto/Konten
    zurückgeben (frühester Monat zuerst, evtl. Konto-Name im Hinweis).
  - `SchieflageVorwarnung` Wording um den Konto-Namen ergänzen
    („… drückt **Tagesgeld** ab \<Monat> …").
  - `computeKontoWarnungen` prüfen: rechnet es bereits pro Konto? Falls ja,
    nur die Preview-Schicht erweitern.
  - Tests in `tests/schieflagePreview.test.js` um Mehr-Konten-Fälle ergänzen.
  - Quelle: Wunsch aus der mobilen Umbuchungs-/Vormerken-Arbeit (Giro war der
    erste Schritt; Puffer für weitere Konten „brauchen wir").

## Bank-Anbindung (Enable Banking)

Offene Punkte aus `ENABLE_BANKING_PLAN.md` (Abschnitt „Noch offen"):

- [ ] **End-to-End-Test gegen die echte Enable-Banking-API** (braucht
  Zugangsdaten + deployten Relay). Feld-/Endpunktnamen ggf. an die reale
  API-Antwort anpassen (`aspsps`-Form, `sessions`-Antwortstruktur, `account uid`).
- [ ] **Free-Limits verifizieren** (zulässige Konten/Calls bei Enable Banking).
- [ ] **Vorgemerkte Bank-Umsätze (PDNG)** beim Import optional als Vormerkung
  übernehmen — werden derzeit übersprungen.
- [ ] **Auto-Kategorisierung beim Bank-Import.** Import legt Umsätze aktuell
  unkategorisiert an (nachträglich über „Nachkategorisieren" möglich). Wäre
  konsistent mit den CSV-Kategorieregeln (`csvRules`).

## Freemium / Premium (Pro-Freischaltung)

Ziel: Bank-Abruf und Cloud-Sync als kostenpflichtige Funktionen, der Rest der
App bleibt frei. Der Plan stand bisher nur im Chat — deshalb hier festgehalten.

**Warum diese Aufteilung:** Die App ist eine local-first PWA auf GitHub Pages,
ohne Nutzerkonto. Alles, was rein lokal rechnet (Trend, Money Mood, Budgets,
Tanken, Themes, csv/pdf-Import), laesst sich clientseitig nicht durchsetzen —
eine Sperre dort waere mit den Entwicklerwerkzeugen in Sekunden weg. Nur was
ueber einen eigenen Worker laeuft, kann wirklich „nein" sagen.

**Zahlungsanbieter: LemonSqueezy** (nicht reines Stripe). Merchant of Record,
uebernimmt EU-Umsatzsteuer und Rechnungsstellung — erspart als Einzelperson
viel Buerokratie. Einmalprodukt „SupaDupa Money Pro". LemonSqueezy kann
Lizenzschluessel selbst erzeugen und per Mail verschicken; dann entfaellt ein
eigener `order_created`-Webhook.

**Token-Modell:** `/verify` gibt ein HMAC-signiertes Token mit 30 Tagen
Laufzeit zurueck. Bewusst offline-tolerant — die PWA muss nicht bei jedem Start
online sein.

### Phase 1 — Lizenzserver (Kauf → Code → Verify)

- [x] **`worker/license-worker.js`** mit `/verify` und `/health`, KV-Struktur
  `LICENSE_KV[code] = {email, tier, purchasedAt, expiresAt}`, HMAC-Token
  (30 Tage). Liegt samt `worker/wrangler-license.toml` im Repo. **Achtung:**
  in einem frueheren Commit beilaeufig mit eingecheckt (`a8d3e668`, Betreff
  „Budget-Bereiche …") — deshalb war er hier nicht vermerkt.
- [ ] **LemonSqueezy-Account + Produkt anlegen.** Muss Dirk selbst machen
  (Verifizierung dauert oft 1–2 Tage). Danach entscheiden: Lizenzschluessel von
  LemonSqueezy erzeugen lassen ODER eigenen `/webhook`-Endpunkt bauen.
- [x] **KV-Namespace angelegt** (`supadupa-lizenzen-kv`), id steht in
  `wrangler-license.toml`. Bewusst app-uebergreifend fuer alle SupaDupa-Apps:
  ein Lizenzserver, ein Secret, eine URL — die KV-Limits gelten ohnehin pro
  Konto, nicht pro Namespace. Getrennt wird ueber das Feld `products` im Wert.
- [x] **CORS + `products` im Worker.** `/verify` wurde aus dem Browser
  aufgerufen, ohne je CORS-Header zu senden (Preflight scheitert; per curl
  unauffaellig) — inklusive der Fehlerantworten, ein 402 ohne Header wird zum
  diffusen Netzwerkfehler. `products` verhindert, dass ein Money-Code eine
  spaetere App mit freischaltet. Abgesichert in `tests/lizenzWorker.test.js`.
- [ ] **Worker deployen** (muss Dirk tun, braucht Konto-Zugang). In `worker/`,
  `--config` ist Pflicht — sonst nimmt wrangler die `wrangler.toml` des
  Bank-Proxys:
  `wrangler secret put LICENSE_SECRET --config wrangler-license.toml`,
  dann `wrangler deploy --config wrangler-license.toml`.
- [ ] **End-to-End einmal durchspielen:** Code in KV legen → `/verify` → Token
  zurueck → Token laeuft nach 30 Tagen ab.

### Phase 2 — Client: Freischalten + weiche Sperren

- [ ] **Lizenz-Zustand** (`useLicense`/`hasFeature("bank_connect"|"cloud_sync")`)
  in `src/state/AppContext.js`. Existiert noch nicht.
- [ ] **Menuepunkt „Pro freischalten"** in den Einstellungen: Code eingeben →
  `/verify` → Token lokal ablegen.
- [ ] **Weiche Gates** in `EnableBankingWizard.jsx` und `CloudSetupWizard.jsx`:
  ohne Lizenz statt des Assistenten eine Pro-Karte mit Kauf-Link.

### Phase 3 — Harte Sperre (die einzige, die wirklich schuetzt)

- [ ] **`worker/enable-banking-proxy.js`**: Anfrage braucht ein gueltiges
  `X-License-Token`, sonst `402 Payment Required`. Heute prueft der Proxy
  nichts. Das ist die Stelle, an der ein Kloner NICHT einfach seine eigene
  Instanz gegen Deine Bank-Anbindung laufen lassen kann.
- [ ] **Widerruf: der Proxy schlaegt zusaetzlich in KV nach.** Die Signatur
  allein reicht nicht — sie ist in sich abgeschlossen und bleibt bis `exp`
  gueltig, auch wenn der KV-Eintrag laengst geloescht ist. Bei Rueckbuchung
  oder Erstattung haette der Nutzer sonst bis zu 30 Tage weiter Zugriff auf
  Deinen Bankabruf. Also beides: Signatur pruefen (billig, faengt Faelschungen
  ab) UND `LICENSE_KV[code]` lesen (faengt Widerrufe ab, wirkt beim naechsten
  Abruf). Kostet einen KV-Lesevorgang pro Bankabruf — bei 100.000 freien pro
  Tag unkritisch. Dafuer muss das Token den `licenseCode` mittragen.
  Bewusst NICHT die Token-Laufzeit kuerzen: das verkleinert das Fenster nur,
  schliesst es nicht, und bezahlt wird es mit der Offline-Tauglichkeit fuer
  alle ehrlichen Nutzer.
- [ ] **Cloud-Sync bleibt bewusst nur weich gegated.** Jeder hostet seinen
  eigenen Daten-Worker — eine harte Sperre waere ohnehin umgehbar. Ehrlicher,
  das offen zu lassen, als Aufwand in Scheinsicherheit zu stecken.
- [ ] **Erstattung/Rueckbuchung loescht den KV-Eintrag.** Anfangs von Hand.
  Spaeter ueber LemonSqueezy-Webhook (`order_refunded`,
  `license_key_revoked`) automatisierbar.

### Phase 4 — optional

- [ ] **Premium-Code als separat nachgeladenes Bundle** statt im oeffentlichen
  Build. Deutlich mehr Aufwand; erst sinnvoll, wenn 1–3 stehen.

### Offen (nicht Code)

- [ ] Preis festlegen; Widerrufsbelehrung, AGB, Datenschutzerklaerung.
  Gehoert zu jemandem, der dafuer haftet — nicht in diese Datei.

## Sync / Performance

- [ ] **Delta-Sync statt Voll-State-Sync.** Aktuell wird bei jedem Speichern der
  komplette State serialisiert/übertragen. Die frühere Diff-Schleife
  (`changedTxIds`/`deletedTxIds`) wurde entfernt, weil sie befüllt aber nie
  gelesen wurde und bei 1500+ Buchungen Tipp-Lag verursachte
  (`src/App.jsx`, Kommentar „Diff txs … DEAKTIVIERT"). Ein echtes Delta-Sync
  (nur geänderte/gelöschte Buchungen übertragen) bleibt als Optimierung offen.
