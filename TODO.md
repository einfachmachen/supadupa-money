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
online sein. Der Lizenzcode wird lokal mitgespeichert, damit sich das Token
still erneuern kann; ohne das fiele jeder zahlende Nutzer nach 30 Tagen
wortlos auf „frei" zurueck.

**Stufen zum Start: nur `free` und `premium`.** `premium` traegt ALLES
Kostenpflichtige (Cloud-Sync UND Bankabruf). `pro`/`promax` sind reservierte
Namen und heute deckungsgleich — sie bekommen eigene Eintraege, sobald es eine
Funktion gibt, die sie rechtfertigt. Eine Stufe, die dasselbe kann wie die
darunter, darf man nicht verkaufen.

**„Lifetime" ist keine Stufe, sondern ein Abrechnungsmodell** — im
Lizenzeintrag ein weit in der Zukunft liegendes `expiresAt`, sonst nichts. Es
braucht dafuer keine Zeile Code und kann jederzeit als Aktion angeboten werden.

**Was spaeter teuer zu aendern waere** (und deshalb jetzt bedacht ist):
- Die FORM der verkauften KV-Eintraege. Neue Felder sind unkritisch (alte
  Eintraege haben sie eben nicht, der Code faellt auf einen Standard zurueck),
  eine geaenderte Bedeutung vorhandener Felder waere es nicht.
- `products` — deshalb von Anfang an drin (siehe Phase 1).
Alles andere ist additiv: eine neue Stufe ist eine Zeile in `TIER_FEATURES`,
eine neue Faehigkeit eine Zeile in `FEATURES` plus die Stufen, die sie tragen.
Auch der Wechsel zu Apples In-App-Kauf aendert daran nichts: er endet ebenfalls
in „dieser Nutzer hat Stufe X".

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

- [x] **Lizenz-Zustand.** `src/hooks/useLicense.js` (GENAU ein Aufruf, in
  App.jsx, verteilt ueber den AppCtx), `src/utils/licenseFeatures.js`
  (Stufenleiter free/premium/pro/promax + `hasFeature`),
  `src/utils/licenseToken.js` (Ablage im kvStore, Ablaufpruefung).
  Jede Faehigkeit traegt einen Vermerk `schutz: "server" | "weich"`, damit
  spaeter nichts Schuetzenswertes hinter einem weichen Tor landet.
- [x] **Menuepunkt „Premium"** in den Einstellungen (ganz oben):
  `src/components/organisms/PremiumFreischalten.jsx`. Code eingeben →
  `/verify` → Token im kvStore. Zeigt im freigeschalteten Zustand Stufe,
  Mailadresse, Gueltigkeit und einen Knopf zum Entfernen.
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

### Umzug von GitHub Pages zu Cloudflare Pages

Entscheidung: Auslieferung komplett zu Cloudflare, eigene Domain
`supadupa.top`. Danach — NICHT vorher — die Code-Trennung (Phase 4).

**Der Weg steht technisch schon.** `.github/workflows/deploy-cloudflare.yml`
existiert seit dem GitHub-Pages-Ausfall im August: Direkt-Upload per
`wrangler pages deploy`, Build ohne `--base` (auf Cloudflare liegt die App im
Wurzelverzeichnis, nicht im Repo-Unterordner). Der Job ist hinter
`vars.CF_DEPLOY == 'true'` geparkt und laeuft los, sobald die Zugangsdaten
hinterlegt sind. Die Einrichtungsschritte stehen im Kopf der Datei.

- [x] `public/_headers` fuer Cloudflare angelegt: `version.json` und `sw.js`
  duerfen NICHT vom Edge gecacht werden (sonst bemerkt die App neue Deploys
  nie), die gehashten Bundles dagegen ewig. GitHub Pages ignoriert die Datei.
- [x] **Anleitung zum Abarbeiten: `Cloudflare-Pages-Umzug.md`** — Teile A–H
  mit Haken, Fehlermeldungs-Tabelle und den Stolpersteinen (Direct Upload
  statt Git-Anbindung, PWA muss neu installiert werden, ALLOWED_ORIGINS in
  beiden Workern nachziehen).
- [ ] Cloudflare Pages-Projekt anlegen (Direct Upload), API-Token +
  Account-ID als Repo-Secrets, `CF_DEPLOY=true` setzen.
- [ ] **`money.supadupa.top`** auf das Pages-Projekt zeigen lassen
  (nicht die nackte Domain — siehe naechster Abschnitt).

### Eine Domain, mehrere Apps: Unterdomains

Entscheidung (Nutzer-Wunsch): `supadupa.top` ist die **Landing-Page** fuer
alle SupaDupa-Apps, jede App bekommt ihre eigene Unterdomain.

| Adresse | Was dort liegt |
|---|---|
| `supadupa.top`, `www.supadupa.top` | Landing-Page, eigenes Pages-Projekt |
| `money.supadupa.top` | diese App (Pages-Projekt `supadupa-money`) |
| `body.supadupa.top` | spaeter, eigenes Projekt |
| `email.supadupa.top` | spaeter, eigenes Projekt |

Technisch ist das der Normalfall und kostet nichts extra: Jedes
Pages-Projekt bekommt unter *Custom domains* seine eigene Adresse, und
Cloudflare legt den DNS-Eintrag selbst an. Eine Adresse gehoert immer genau
EINEM Projekt — deshalb die Trennung in mehrere Projekte statt eines
grossen.

Drei Punkte, die daran haengen:

- **Jetzt entscheiden, nicht spaeter.** IndexedDB haengt am Origin. Ein
  spaeterer Wechsel von `supadupa.top` auf `money.supadupa.top` waere eine
  ZWEITE Datenwanderung fuer alle, die schon umgezogen sind. Money geht
  deshalb von Anfang an auf die Unterdomain.
- **`email` statt `e-mail`.** Der Bindestrich ist in Hostnamen erlaubt, wird
  beim Tippen aber regelmaessig vergessen. Notfalls beide anlegen und eine
  auf die andere weiterleiten.
- **`ALLOWED_ORIGINS` in beiden Workern** (Daten-Worker, Lizenz-Worker) muss
  die tatsaechliche Unterdomain enthalten, nicht die nackte Domain — sonst
  scheitert der Bankabruf mit einem CORS-Fehler. Gilt auch fuer die
  Lizenzpruefung, sobald sie eingeschraenkt wird.

Nebenwirkung, die gelegen kommt: Der Lizenz-Worker liegt unter
`lizenzen.supadupa.workers.dev` und kann mehrere Produkte bedienen
(`product`-Feld, schon eingebaut). Eine Landing-Page pro App und ein
gemeinsamer Lizenzserver passen zusammen.
- [ ] Erst wenn der neue Weg nachweislich traegt: `deploy.yml` (GitHub Pages)
  stilllegen. Solange beide laufen, gibt es zwei unabhaengige
  Auslieferungswege — genau der Grund, aus dem der zweite entstanden ist.

**ACHTUNG, der teure Punkt: Ein Domainwechsel loescht faktisch die lokalen
Daten aller Nutzer.** IndexedDB haengt am ORIGIN. Wer die App unter
`einfachmachen.github.io` benutzt hat, startet auf `supadupa.top` mit einer
leeren App — die Daten sind nicht weg, aber unter der neuen Adresse
unsichtbar, und es gibt keinen automatischen Weg hinueber (der Browser
erlaubt keinen Zugriff auf fremde Origins).

- [ ] **Vor dem Umzug selbst sichern:** Daten-Manager → Export mit allen
  Haken, danach auf der neuen Adresse importieren. Gilt fuer JEDES Geraet
  einzeln. Alternativ ueber Cloud-Sync: auf der alten Adresse hochladen, auf
  der neuen laden — derselbe Worker, dasselbe Secret.
- [ ] **Alte Adresse eine Weile online lassen** mit deutlichem Hinweis auf
  die neue, damit niemand ohne Vorwarnung vor einer leeren App sitzt.

**Zum „single point of failure":** stimmt — Auslieferung, Lizenzserver,
Daten-Worker und KV liegen dann alle bei Cloudflare (plus Enable Banking).
Zwei Dinge entschaerfen das: Die Nutzerdaten liegen lokal auf dem Geraet, ein
Cloudflare-Ausfall heisst also „App nicht erreichbar und Sync steht", nicht
„Daten weg". Und der Build ist eine statische Seite — sie laeuft notfalls auf
jedem beliebigen Host, die Bindung ist also gering, auch wenn der
Ausfallpunkt real ist.

**Nicht verwechseln:** Cloudflare Pages loest die AUSLIEFERUNG von GitHub,
nicht den QUELLTEXT. Der liegt weiter auf GitHub, und der Deploy wird von
GitHub Actions angestossen. Wer auch davon weg will, braucht zusaetzlich eine
andere Stelle fuer Repository und CI (Codeberg, GitLab, eigener Runner) —
oder deployt von Hand mit `wrangler pages deploy dist`.

### Manipulation verhindern — ein ANDERES Ziel als Kopierschutz

Anlass: „Ich moechte verhindern, dass sich ein talentiertes Script-Kiddie mal
einen Spass macht und unsere Arbeit manipuliert." Das ist eine andere Sorge
als entgangener Umsatz, und die wirksamen Mittel liegen woanders — praktisch
alle AUSSERHALB des App-Codes.

**Was harmlos ist:** Wer seine EIGENE Kopie im Browser verbiegt, schadet
niemandem. Es verlaesst kein Datum das Geraet, kein anderer Nutzer merkt
etwas. Gegen diesen Fall zu bauen kostet Aufwand und bringt nichts.

**Was wirklich zaehlt, sind zwei Faelle:**

1. **Jemand manipuliert, was ANDERE Nutzer bekommen.** Das ginge nur ueber
   die Auslieferungskette, nicht ueber den Client. Angriffsflaeche sind
   deshalb die Konten, nicht der Code:
   - [ ] GitHub-Konto mit **2FA**; Cloudflare-Konto mit 2FA.
   - [ ] **Branch-Schutz auf `main`** (kein Force-Push, kein Loeschen). Der
     Deploy laeuft bei jedem Push auf main (`.github/workflows/deploy.yml`) —
     wer dort schreiben kann, liefert an alle Nutzer aus.
   - [ ] **Cloudflare-API-Token eng zuschneiden** (nur die noetigen
     Berechtigungen), nicht den Global API Key verwenden.
   - [x] Worker-Secrets liegen nie im Repo (`wrangler secret put`) — steht.

2. **Jemand veroeffentlicht einen veraenderten Klon unter aehnlichem Namen.**
   Das ist der Fall, der dem RUF schadet — und der einzige, gegen den es
   ueberhaupt eine Handhabe gibt:
   - [ ] **`LICENSE`-Datei fehlt komplett.** Ohne sie gilt formal „alle
     Rechte vorbehalten", aber das weiss niemand, weil es nirgends steht.
     Eine ausdrueckliche Lizenz (welche auch immer) macht klar, was erlaubt
     ist und was nicht.
   - [ ] Namensrechte/Marke „SupaDupa Money" pruefen, bevor Geld fliesst.

**Wichtig fuer die Einordnung von Phase 4:** Das Repository ist heute
**oeffentlich** (`visibility: public`, Forken erlaubt). Solange das so ist,
schuetzt kein nachgeladenes Premium-Buendel irgendetwas — der komplette
Quelltext liegt ohnehin offen. Wer Premium-Code wirklich nicht oeffentlich
haben will, muesste zuerst das Repository (oder wenigstens diesen Teil)
privat stellen. Das ist die Voraussetzung, nicht ein Detail danach.

### Vor der Veroeffentlichung zu klaeren (nicht Code)

- [ ] **Apple: Aktivierungscodes per Mail sind in einer iOS-App ein Problem.**
  App Review Guideline **3.1.1** verlangt In-App-Kauf, wenn in der App
  Funktionen freigeschaltet werden. Zwei gangbare Wege: **3.1.3(b)
  „Multiplatform Services"** (im Web gekaufte Lizenz darf in der App genutzt
  werden — klassisch unter der Auflage, in der App NICHT auf den externen Kauf
  hinzuweisen; diese Anti-Steering-Regel ist durch US-Verfahren und DMA in
  Bewegung), ODER In-App-Kauf fuer iOS zusaetzlich zum Code fuers Web.
  **Vor dem Einreichen den aktuellen Wortlaut von 3.1.1 und 3.1.3(b) selbst
  lesen** — die Regeln aendern sich haeufig. Fuer die Architektur aendert sich
  dadurch nichts (siehe oben).
- [ ] **Eigene Domain `supadupa.top`.** Bringt fuer den SCHUTZ nichts —
  Client-Code bleibt Client-Code. Sinnvoll aus drei anderen Gruenden: die
  Adresse gehoert Dir (GitHub-Pages-URL nicht), ein gemeinsamer Ursprung fuer
  App und Worker erlaubt ein enges `ALLOWED_ORIGINS`, und Apple erwartet fuer
  3.1.3(b) ohnehin einen erkennbaren eigenen Dienst. Umzug: Domain zu
  Cloudflare, App ueber Cloudflare Pages (baut aus demselben Repo), Worker als
  Subdomains.
- [ ] Preis festlegen; Widerrufsbelehrung, AGB, Datenschutzerklaerung.
  Gehoert zu jemandem, der dafuer haftet — nicht in diese Datei.

### Phase 4 — optional (und bewusst zurueckgestellt)

- [ ] **Premium-Code als separat nachgeladenes Bundle** statt im oeffentlichen
  Build. Deutlich mehr Aufwand; erst sinnvoll, wenn 1–3 stehen.

**Abwaegung dazu — Stand dieser Entscheidung: NICHT jetzt bauen.**

Die naheliegende Verschaerfung waere, das nachgeladene Buendel beim Ablauf
der Lizenz (also spaetestens nach 30 Tagen) wieder aus dem Geraetespeicher zu
werfen — sonst bliebe es im Service-Worker- bzw. HTTP-Cache liegen und ein
manipulierter Client koennte es weiter laden. Der Gedanke ist technisch
richtig, fuehrt aber in die falsche Richtung:

- **Das Loeschen fuehrt der Client aus, dem man nicht traut.** „Token
  abgelaufen → Buendel verwerfen" ist eine Zeile im oeffentlichen Code. Wer
  die Gates entfernt, entfernt sie im selben Atemzug.
- **Einmal ausgeliefert ist ausgeliefert.** Der Code lag im Netzwerk-Tab des
  Browsers. Geloescht wird der eigene Cache, nicht die Kopie, die jemand
  gespeichert hat.
- **Es widerspricht direkt der stillen Erneuerung.** Die 30 Tage Laufzeit
  gibt es, damit ein zahlender Nutzer offline nicht ausgesperrt wird.
  Verschwindet bei Ablauf der CODE, verliert genau dieser Nutzer nach einem
  Monat ohne Netz seine Funktionen — und kommt schlechter wieder heran als
  bei einem blossen Token-Ablauf: ein Token holt man in Sekunden nach, ein
  fehlendes Buendel braucht einen Download. Das trifft ausgerechnet die, die
  bezahlt haben, bei einer App, deren Verkaufsargument „funktioniert ohne
  Netz" ist.
- **Baukosten:** Premium-Funktionen duerften nirgends mehr statisch
  importiert werden, jeder Beruehrungspunkt wird asynchron, der Service
  Worker braucht eine Sonderbehandlung. Fuer eine iOS-Einreichung wird
  nachgeladener Programmcode ausserdem nicht einfacher zu erklaeren.

Was der Weg wirklich leistet: er verschiebt die Huerde von „oeffentliches
Bundle lesen" auf „einmal kaufen und den Code aktiv wegsichern". Gegen
beilaeufiges Kopieren hilft das, gegen Entschlossene nicht.

**Variante „Leerdateien nachschieben" — geprueft, ebenfalls nicht.**
Vorschlag: Solange offline, passiert nichts; kommt der Nutzer ohne gueltiges
Token online, liefert der Server leere Dateien aus, die die lokal
gespeicherten ueberschreiben. Das ist BESSER gedacht als das Loeschen nach
Frist — es entschaerft genau den Einwand oben, denn wer offline ist, wird
nicht angetastet, und die Entscheidung faellt serverseitig. Drei andere
Gruende sprechen trotzdem dagegen:

- **Aus einem heilbaren Zustand wird ein zerstoerender.** Heute heisst „Token
  fehlt" nur: Funktionen verborgen, beim naechsten erfolgreichen Abgleich in
  Sekunden wieder da. Mit dem Ueberschreiben heisst eine fehlgeschlagene
  Pruefung: Code WEG, Wiederherstellung braucht funktionierenden Server plus
  Download. Und Pruefungen schlagen fehl — `secret_not_configured` hatten wir
  beim Einrichten real, dazu kommen verrutschte KV-Bindings nach einem
  Deploy, Zahlungsanbieter-Aussetzer, Cloudflare-Stoerungen.
- **Die Datei erreicht nur den Client, der mitspielt.** Wer die Gates
  entfernt hat, holt sie nicht ab oder bedient sich aus seiner Kopie. Der
  zerstoerende Pfad trifft damit ausgerechnet zahlende Kunden und ehrliche
  Gratis-Nutzer.
- **Fuer ein EINMALPRODUKT gibt es den Zielfall kaum.** Eine gekaufte Lizenz
  laeuft nicht ab, es gibt also keinen „frueheren Zahler". Bleiben
  Rueckbuchung und Erstattung — und dafuer steht die Antwort schon in
  Phase 3 (KV-Eintrag loeschen, Proxy schlaegt nach).

Technisch dazu: Vite vergibt inhaltsabhaengige Dateinamen
(`index-LjoFr_6S.js`) — eine „gleichnamige leere Datei" gibt es nicht, das
Buendel braeuchte eine feste URL plus Sonderbehandlung im Service Worker.
Und ein leeres Modul, das die App importieren will, ist kein Gate, sondern
ein Laufzeitfehler.

Leitplanken, falls es spaeter DOCH kommt: nur auf eine ausdruecklich
signierte Widerrufs-Antwort hin, nie bei Fehler, Zeitueberschreitung oder
unklarer Antwort — und lieber „als inaktiv markieren" als Bytes zerstoeren,
damit der Weg zurueck ohne Download geht.

**GitHub Pages kann das Tor NICHT stellen — wichtig, sonst laeuft man in eine
Sackgasse.** Der naheliegende Gedanke „freier Teil auf dem einen Pages-Server,
Premium-Teil auf einem zweiten" traegt nicht: Pages liefert statische Dateien
ohne jede Authentifizierung aus. Ein zweiter Pages-Server ist genauso
oeffentlich wie der erste — wer die URL hat, laedt die Datei. (Zugriffsschutz
fuer Pages gibt es nur in GitHub Enterprise.) Es braucht eine Stelle, die
pruefen KANN: eine **Cloudflare-Worker-Route** (z. B.
`lizenzen.supadupa.top/bundle`, prueft `X-License-Token` wie der Bank-Proxy)
oder **Cloudflare Pages mit Functions**. Beides passt zum Domain-Umzug; ein
zweiter Anbieter ist nicht noetig.

**Der richtige Hebel ist „keine neueren Versionen", nicht „wegnehmen."**
Bei einem Einmalprodukt gibt es keinen abgelaufenen Zahler — laufende
Verbesserungen sind aber ein fortwaehrender Wert, den man vorenthalten kann.
Nicht destruktiv, trifft niemanden versehentlich, und der Ausgangsstand
bleibt funktionsfaehig.

**Reihenfolge: erst privat, dann trennen.** Solange das Repository
oeffentlich ist, klont man den Premium-Code einfach und baut ihn selbst — ein
Tor vor dem GEBAUTEN Buendel waere dann verlorene Arbeit. Abwaegung dabei:
Ein offener Quelltext ist bei einer Finanz-App ein Vertrauensargument
(„schaut nach, was mit euren Daten passiert"), gerade zum
Local-first-Versprechen. Mittelweg: freier Teil bleibt oeffentlich, nur der
Premium-Teil zieht in ein zweites, privates Repository.

**Falls spaeter doch: das Tor sitzt bei der AUSLIEFERUNG, nicht beim
Behalten.** Eine Route auf dem eigenen Server gibt das Premium-Buendel nur
gegen ein gueltiges Token heraus — das ist serverseitig und damit echt. Was
einmal heruntergeladen wurde, bleibt liegen. Groesster Teil des Nutzens,
ohne das Aussperr-Risiko. Ein zweiter Server ist dafuer nicht noetig, nur
ein Pfad mit Pruefung.

**Reihenfolge:** erst veroeffentlichen, dann sehen, ob ueberhaupt jemand
kopiert. Der zu erwartende Verlust durch beilaeufiges Kopieren duerfte
kleiner sein als der Preis dieser Komplexitaet — und kleiner als der
Schaden, wenn ein zahlender Kunde ohne Netz vor einer halben App sitzt.

## Sicherung / Export

- [x] **Ein Geheimnis-Paar fuer die ganze Sicherungsdatei.** Der Bank-Schluessel
  hatte eine EIGENE Passphrase, zusaetzlich zu Passphrase und Recovery-Code des
  Exports — ohne dass irgendwo stand, wozu (Nutzer-Hinweis: „Muessen das 2
  unterschiedliche sein?"). Sinn hatte sie nur, weil die Gesamt-Verschluesselung
  ABSCHALTBAR ist; ohne eigene Passphrase laege der private Schluessel dann
  offen in der Datei.
  Geloest, indem genau dieser Fall ausgeschlossen wird: Der Schluessel darf nur
  in eine **verschluesselte** Sicherung, und beide Schalter halten sich
  gegenseitig fest (Schluessel an ⇒ Verschluesselung an; Verschluesselung aus ⇒
  Schluessel raus). Dadurch wird die zweite Passphrase ueberfluessig statt
  weggelassen. `tests/bankSchluesselEinPasswort.test.js` prueft die Kopplung am
  echten Dateiinhalt, nicht an der Oberflaeche.
- [x] **Reihenfolge im Export-Reiter:** Bank-Schluessel VOR
  „Export verschluesseln" — so passiert es auch (erst wird der Schluessel in die
  Datei gepackt, dann wird die Datei verschluesselt).
- [x] **Das Import-Feld „Passphrase fuer Bank-Schluessel" ist entfernt**
  (Nutzer-Entscheidung: einmal neu sichern, dann wird es nicht mehr
  gebraucht). Trifft der Import doch eine Datei im alten Format, sagt er das
  im Klartext und ueberspringt den Schluessel — er scheitert nicht still.

## Sparrate: WELCHE Rate faengt eine Schieflage ab? — ERLEDIGT

**Nutzer-Entscheidung:** Die Automatik darf und soll in ZUKUENFTIGE Raten
schreiben. Eine Vormerkung, die erst in ferner Zukunft eine Schieflage
ausloest, darf den moeglichen Sparbetrag des laufenden Monats NICHT senken —
„ich moechte so viel wie moeglich sparen, besonders in den Monaten mit der
Super-Sparrate".

**Beim Durchrechnen kam eine unbequeme Wahrheit heraus, und die gehoert
festgehalten:** Der Wunsch ist so nicht erfuellbar.

Sei `K_i` die Kapazitaet von Fenster i (tiefster Tagessaldo zwischen Termin i
und i+1, mit allen Raten auf 0, minus Puffer) und `P_i` die Summe aller Raten
bis einschliesslich i. Weil gespartes Geld liegen bleibt, gilt `P_i ≤ K_i`
fuer jedes i, und weil keine Rate negativ sein kann, steigt `P` monoton.
Daraus folgt zwingend

> `P_i = min(K_i, K_{i+1}, …, K_n)`  (Suffix-Minimum)

und damit: **`P_1` ist das Minimum ueber ALLE Fenster.** Die erste Rate ist
zwangslaeufig durch das engste kuenftige Fenster begrenzt — egal wie man
rechnet. Solange Gespartes nur in EINE Richtung fliesst, laesst sich ein
Engpass im April nicht anders vermeiden als dadurch, dass vorher weniger
gespart wird.

Erfuellbar wird der Wunsch erst mit einer RUECKBUCHUNG vor dem Engpass —
siehe „Der groessere Gedanke dahinter" weiter unten.

**Was der Umbau trotzdem bringt:** Die Kuerzung verteilt sich jetzt richtig.
Steigt die Kapazitaet spaeter wieder (Bonus, ausgelaufene Finanzierung),
steigen auch die spaeteren Raten wieder — `r_i = P_i − P_{i−1}` wird dann
positiv. Vorher trug der laufende Monat die ganze Kuerzung allein, und die
kuenftigen Raten blieben unangetastet zu hoch stehen. Insgesamt wird also
MEHR gespart als vorher, nur eben nicht im ersten Monat.

Nebenbei aufgeraeumt: Es gab zwei getrennte Rechnungen fuer denselben Plan
(laufender Monat in `currentMonthSparAdjust`, Folgemonate in einer zweiten).
Die liefen einander in die Quere. Jetzt eine Quelle: `sparPlanOptimum`.

Code:

* `utils/sparBerechnen.js` — `sparAbgaenge()`, `minImFenster()`,
  `computeSafeAmountForAbgang()` (eine Rate, ihr eigenes Fenster — gebraucht
  von `sparHilfeFuerEngpass`), `sparPlanOptimum()` (der ganze Plan, Suffix-
  Minimum), `sparRatenAbgleich()` als duenne Huelle darum.
  `computeSafeCurrentMonthAmount()` bleibt als Referenz stehen, wird aber
  nicht mehr benutzt.
* `App.jsx` — EIN verzoegerter Effekt rechnet `sparPlanOptimum` fuer alle
  Raten ab dem laufenden Monat; `currentMonthSparAdjust` liest seinen Betrag
  daraus und kuemmert sich nur noch um den Zins-Sweep. Meldung ueber dieselbe
  `autoSparInfo`-Leiste, mit Monatsangabe und „+n weitere Monate".
* `utils/schieflagePreview.js` — der Hinweis im Anlege-Dialog nennt die Rate,
  die wirklich zustaendig ist.
* Tests: `tests/sparRateFenster.test.js`, `tests/sparHilfeText.test.js`.

**Laufzeit** (gemessen, 24 Raten / 1000 Buchungen): erster Anlauf mit
Vorwaerts- plus Reparatur-Durchgang 561 ms — quadratisch und bei jeder
Aenderung am Bestand. Suffix-Minimum: 26 ms, und linear (60 Raten / 3780
Buchungen: 54 ms). Dazu laeuft die Rechnung nicht mehr im Render, sondern in
einer freien Luecke danach.

**Offen geblieben:** Was passiert bei „Super-Sparrate neu berechnen"? Die
Neuberechnung im Tagesgeld-Widget schreibt die Raten neu und wuerde eine so
gesetzte Reduzierung ueberschreiben. Haengt am naechsten Punkt.

## Super-Sparrate im Sparplan sichtbar machen — GEPRUEFT, noch nicht gebaut

**Nutzer-Wunsch:** „Es macht wenig Sinn, dass ich nur die normale und nicht
die Super-Sparraten in den Zinsmonaten vorher sehe, sondern erst, wenn ein
Zinsmonat laeuft. Die Super-Sparrate moechte ich auch im Sparplan sehen."

### 1. Warum die Anhebung erst im laufenden Zinsmonat entsteht

Kein technisches Hindernis — es fragt schlicht niemand danach. In `App.jsx`
steht die Bedingung

```js
if (zinsMonate.includes(m) && zugang)   // m = today.getMonth()
```

Der Sweep wird also nur fuer den LAUFENDEN Monat gerechnet. Die Bausteine
selbst sind monatsunabhaengig: `sweepFenster(terminIso)` nimmt jeden Termin,
`computeTagessaldoAt(iso, …)` liefert jeden Tag, `computeSweep({salden, …})`
rechnet auf uebergebenen Salden.

Zu tun: den Block aus `App.jsx` als `sweepFuerMonat({y, m, txs, puffer, ctx,
today})` herausziehen. Die heutige Stelle wird ihr erster Aufrufer, die
Vorschau der zweite. Kosten pro Zinsmonat: ein `sweepFenster` plus eine
Handvoll `computeTagessaldoAt` — neben der bestehenden Binaersuche je Monat
vernachlaessigbar (~4 Zinsmonate pro Jahr).

### 2. Kann die Vorschau die erhoehte Rate zeigen, ohne den Sweep vorzuziehen?

Ja, und das ist ausdruecklich der richtige Weg: Die BUCHUNGEN sollen weiter
erst zum Termin entstehen, nur die ANZEIGE soll ehrlich sein.

Eine Huerde gibt es, und die ist der eigentliche Aufwand: `berechnen()` im
Tagesgeld-Widget rechnet mit einem VIRTUELLEN Sparplan (`virtualSpar`, ein
Datum→Betrag-Objekt), nicht mit echten Buchungen. `computeTagessaldoAt` kennt
`virtualSpar` nicht — es sieht nur `ctx.txs`. Fuer den Sweep muessen die
virtuellen Raten also als Pseudo-Buchungen materialisiert werden.

Ergebnis in der Tabelle: je Zinsmonat zusaetzlich `hin` und `zurueck` (aus
`computeSweep`), sichtbar als zweite Zeile oder Zusatzspalte.

### 3. Muss die Schieflage-Rechnung die Super-Sparrate kennen?

**Ja — und das ist der schaerfste der drei Punkte.** Der Sweep nimmt vom
Zinstermin bis zum Rueckbuchungstag deutlich MEHR vom Giro als die normale
Rate. Faellt ein Engpass-Tag in dieses Fenster, sieht die heutige Rechnung ihn
nicht, weil die Sweep-Buchungen kuenftiger Monate noch gar nicht existieren.
Die App warnt also zu spaet — erst wenn der Zinsmonat anbricht.

Zu tun: Die GEPLANTEN Sweeps als virtuelle Buchungen in die
Schieflage-Rechnung geben. Dieselbe Normalisierung wie heute
(`ohneSweepBuchungen`) muss dann auch fuer sie gelten, sonst rechnet sich der
Sweep gegen sich selbst.

### Der Konflikt, der dabei aufgeloest werden muss

Zwei Stellen setzen Sparraten, mit UNTERSCHIEDLICHEN Regeln:

| Wer | Regel |
|---|---|
| Vorschau `berechnen()` (wird beim Anlegen zur Buchung) | maximal, solange die naechsten **3** Monate ueber dem Puffer bleiben (`LOOKAHEAD = min(3, …)`) |
| Automatik `sparRatenAbgleich` | maximal im Fenster bis zur naechsten Rate, danach Rueckwaerts-Reparatur |

Solange beide verschieden rechnen, korrigiert die Automatik nach jedem
„Super-Sparrate neu berechnen" die gerade angelegten Raten wieder — der Nutzer
sieht Zahlen springen, ohne zu wissen warum. Die Vorschau sollte deshalb
dieselbe Funktion benutzen wie die Automatik (`sparRatenAbgleich` auf einem
virtuellen Bestand), statt eine zweite Naeherung mitzuschleppen.

Damit ist auch die Frage von vorhin beantwortet („Was passiert bei
Super-Sparrate neu berechnen mit einer automatisch gesenkten Rate?"): Nichts
Ueberraschendes mehr, sobald beide dieselbe Rechnung verwenden.

### Der groessere Gedanke dahinter (fuer spaeter)

Das heutige Modell behandelt Sparen als EINBAHNSTRASSE: Ein Engpass im April
laesst sich nur dadurch vermeiden, dass vorher weniger gespart wird. Das Geld
liegt aber auf dem Tagesgeld und ist nicht weg — es koennte einfach
zurueckgeholt werden. Genau diese Maschinerie gibt es schon: der Zins-Sweep
bucht hin und am naechsten Banktag zurueck.

Ein Engpass im April waere damit sauberer zu loesen als durch weniger Sparen
im August: eine Rueckbuchung vom Tagesgeld kurz vor dem Engpass. Eigener,
groesserer Punkt — aber er gehoert hierher, weil er dieselben Bausteine
braucht.

## Kontrast — offene Punkte

- [ ] **`T.txt2` auf getoenten Flaechen und auf `T.bg`.** Gemessen faellt die
  Sekundaerschrift in mehreren hellen Themes durch (sand 4,37:1, swiss 4,48:1,
  cleancorporate 4,01:1, auf Hinweiskasten-Toenungen bis 3,69:1). Das ist KEIN
  Fehler eines einzelnen Bildschirms, sondern gilt fuer die ganze App —
  entweder die betroffenen Themes nachziehen oder `T.txt2` denselben
  Zwei-Farben-Mechanismus geben wie `T.txt`. Bewusst nicht nebenbei mit
  erledigt.

- [ ] **Alle uebrigen hellen Themes durchgehen.** Bisher sind die Kontraste
  Bildschirm fuer Bildschirm nachgerechnet worden, angestossen jeweils von
  einem konkreten Fund. Die Rechnung selbst gilt aber fuer ALLE Themes, und
  die hellen sind die kritischen: `hellgrau`, `creme`, `softecotech`,
  `abenteuergruen`, `zirkustaschenrechner`, `cleancorporate`, `sand`,
  `swiss`, `kontrasthell`, `paper`, `ios`, `material`, `dkb`. Dort faellt
  regelmaessig durch, was auf dunklem Grund traegt — Gold auf `zirkus`
  2,11:1, das Cloudflare-Orange auf `hellgrau` 2,86:1, `acc_neg` auf `dkb`
  3,00:1. Aufgabe: `tools/kontrast.cjs` ueber jedes helle Theme laufen
  lassen und die Funde entweder im Theme oder ueber die Helfer
  (`aufPlatte`/`imKasten`/`knopfPaar`) beheben.

## Gestaltung — die Abstaende von „Tastenhell" fuer ALLE Themes

- [ ] **Nutzer-Wunsch:** „Tastenhell" wirkt deutlich aufgelockerter als die
  uebrigen Themes, und das soll ueberall so sein. Die Ursache ist nicht die
  Farbe, sondern der Abstand: Das Theme bringt eine eigene Regelgruppe in
  `src/theme/css/themes.css` mit (`.theme-tastenhell …`) — Aussenabstand um
  Hero und Symbolzeile (`margin: 8px 10px`), groessere Radien (16 statt 14),
  Luft zwischen den Kategoriezeilen (`.kategorie-liste { gap: 8px }`),
  Abstaende um Diagramm-, Sortier-, Such- und Filterzeile, und eine untere
  Leiste mit Fugen zwischen den Reitern.

  Zu tun: Diese Werte aus dem Theme herausloesen und zur Grundeinstellung der
  App machen, statt sie an `.theme-tastenhell` zu haengen. Zwei Punkte, die
  dabei nicht untergehen duerfen:

  1. **Die Fuge braucht einen Kontrast.** Bei „Tastenhell" ist die Platte
     hell und die Karte dunkel — der Abstand ist deshalb SICHTBAR. In
     Themes, deren Karten fast die Hintergrundfarbe haben (`kontrasthell`:
     beides `#FFFFFF`), entsteht durch mehr Abstand kein luftigeres Bild,
     sondern nur eine groessere weisse Flaeche. Dort muss
     `flaecheAbgesetzt()` mitziehen — den Helfer gibt es schon, er wird bloss
     noch nicht ueberall benutzt.
  2. **Die Hoehe.** Mehr Abstand heisst weniger Zeilen pro Bildschirm. Auf
     einem iPhone 13 mini ist das spuerbar. Vor dem Umbau einmal im Browser
     durchmessen, nicht schaetzen.

## Sync / Performance

- [ ] **Delta-Sync statt Voll-State-Sync.** Aktuell wird bei jedem Speichern der
  komplette State serialisiert/übertragen. Die frühere Diff-Schleife
  (`changedTxIds`/`deletedTxIds`) wurde entfernt, weil sie befüllt aber nie
  gelesen wurde und bei 1500+ Buchungen Tipp-Lag verursachte
  (`src/App.jsx`, Kommentar „Diff txs … DEAKTIVIERT"). Ein echtes Delta-Sync
  (nur geänderte/gelöschte Buchungen übertragen) bleibt als Optimierung offen.
