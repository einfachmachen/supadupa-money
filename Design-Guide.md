# Design-Guide — SupaDupa Money

> Stand: 2026-06-30 · Abgeleitet aus dem aktuellen Code (`src/`). Diese Datei
> beschreibt das gelebte Design-System der App, nicht einen Wunschzustand.
> Bei Abweichungen gilt der Code — bitte diesen Guide bei Änderungen mitpflegen.

---

## 1. Grundprinzipien

- **Local-first PWA**: React + Vite, Daten liegen lokal (IndexedDB via `kvStore`).
  Kein Pflicht-Backend, kein Tracking.
- **Optionaler, verschlüsselter Cloud-Sync**: Wer mehrere Geräte nutzen will, kann
  seine Daten in eine **eigene** Cloud-DB legen (Cloudflare Worker, Supabase,
  JSONBin oder GitHub Gist). Mit gesetzter Passphrase wird die Nutzlast
  **client-seitig Ende-zu-Ende verschlüsselt** (AES-GCM, siehe §12). Es gibt
  weiterhin keinen zentralen Server des Betreibers für Nutzerdaten.
- **Bank-Import** auf drei Wegen: **CSV** (Banking-Export), **PDF-Kontoauszug**
  (`utils/pdfStatement.js`, Wirecard/N26) und **echter PSD2-Kontoabruf** über
  **Enable Banking** (`utils/enableBanking.js`/`enableBankingFetch.js` +
  geführter **`EnableBankingWizard`**, ein 9-Schritte-Assistent nach demselben
  Muster wie `CloudSetupWizard`, siehe §12).
- **Mobile-first**: Layout ist auf schmale Hochkant-Screens (iPhone 13 mini als
  Referenz) optimiert; alles skaliert nach oben. Safe-Areas (Notch/Home-Indikator)
  werden über `env(safe-area-inset-*)` berücksichtigt.
- **Inline-Styles statt CSS-Klassen**: Komponenten stylen über `style={{…}}` mit
  **Theme-Tokens** (`T.*`). Globales CSS gibt es nur für Grundlagen
  (`theme/css/base.css`) und themenspezifische Sonderfälle (`theme/css/themes.css`).
- **Ein Quell der Wahrheit für Geld-Logik**: Salden/Prognosen aus `utils/saldo.js`,
  Formatierung aus `utils/format.js`, Budget-Helfer aus `utils/budgets.js`. UI
  rechnet nicht selbst „nebenher".

---

## 2. Wo liegt was (Modul-Karte)

Wurzel: `src/`. Einstieg `main.jsx` → `App.jsx` (hält fast den gesamten State +
den `AppCtx`-Provider). UI-Sprache Deutsch, Code/Token/Props Englisch.

### Theme & Darstellung
| Zweck | Ort |
|---|---|
| Theme-Definitionen (Farb-Token je Theme) | `theme/themes.js` |
| Aktives Theme (Proxy + Umschaltung) | `theme/activeTheme.js` (`setActiveTheme`, `isLightTheme`) |
| Betrags-Pillen (Helligkeits-Kontrast) | `theme/amtPill.js` |
| Palette/Input-Styles | `theme/palette.js` (`INP`) |
| Globale CSS-Grundlagen (Font-Face, Reset, Fett, Blur/Neutral) | `theme/css/base.css` |
| Themenspezifisches CSS | `theme/css/themes.css` |
| Gebündelte Geldschrift | `theme/fonts/questrial-*.woff2` |

### Zentrale Logik (`utils/`)
| Zweck | Datei |
|---|---|
| Formatierung + `NUM_FONT` | `format.js` (`fmt`, `pn`, `uid`, `sumAmounts`) |
| Salden/Prognosen | `saldo.js` |
| Budget-Helfer | `budgets.js` (`budgetOpenRestFor`, `budgetPlaceholderActive`) |
| Budget-Vorschläge (Schätzung aus Historie) | `budgetSuggest.js` |
| Buchungs-Helfer / Fingerprints | `tx.js` |
| Jahres-/Monatsdaten, Ankerpunkte | `yearData.js`, `anchors.js` |
| Datum/Bankwerktage (u. a. `nextBankWorkday`, `pendingDebitDate`) | `date.js` |
| CSV-Parsing / PDF-Kontoauszug | `csv.js`, `pdfStatement.js` |
| PayPal-Zuordnung (Sammelbuchung ↔ Einzelposten) | `paypalMatch.js` |
| Geplante/Mood-Prognose („Money Mood") | `moodForecast.js` |
| Schieflage-/Dispo-Vorschau | `schieflagePreview.js` |
| Konto-Warnungen (z. B. drohende Überziehung) | `kontoWarnungen.js` |
| Tank-Erfassung (Kategorie-Erkennung, Verbrauchsberechnung) | `fuel.js` (`isFuelCat`, `buildFuelSeries`) |
| Cloud-Buchungskompression | `cloudTx.js` (`compressTxByYear`) |
| **Sync-Verschlüsselung (Zero-Knowledge)** | `syncCrypto.js` (AES-GCM/PBKDF2) |
| **Enable-Banking-Client + lokale Ablage** | `enableBanking.js`, `enableBankingStore.js` |
| **Wiederverwendbarer Bank-Abruf** (Dashboard-Pull-to-Refresh, Fehlerklartext) | `enableBankingFetch.js` (`fetchNewBankTx`, `friendlyBankError`) |
| **Konto-Löschen ohne Datenverlust** | `accountReassign.js` |
| Verknüpfungen (Vormerkung ↔ reale Buchung) | `links.js` |
| Auto-Update-Erkennung neuer Deploys | `autoUpdate.js` |
| Suche, Konstanten, KV-Store, Icons | `search.js`, `constants.js`, `kvStore.js`, `icons.jsx`, `lucideStatic.js` |

### State & Hooks
| Zweck | Ort |
|---|---|
| App-Context-Objekt | `state/AppContext.js` (`AppCtx`) |
| Persistenz / IndexedDB-Bridge (`window.IDB`) | `state/persistence.js` |
| Cloud-Zugangsdaten + Sync-Passphrase | `hooks/useCloudCredentials.js` |
| Debounced Local-Save | `hooks/useLocalSaveDebounce.js` |

### Screens (`components/screens/`)
`DashboardScreenV2` (Home) · **`MonatScreen`** (vereinte Monats-/Buchungsansicht,
siehe §5/§6 — der frühere eigene „Buchungen"-Tab/`TransactionsScreen` wurde
hier hinein verschmolzen, §10) · `JahrScreen` (Tab-Label „Trend") ·
`MoneyMoodScreen` (Mood-/Trend-Drilldown) · `ManagementScreen` (Struktur:
Konten/Kategorien/Einstellungen) · `SettingsInline` · `CsvImportScreen` ·
`MatchingScreen` (zuordnen) · `VormerkungHub` · `RecurringDetectionScreen` ·
`CustomThemeEditor` · **`CloudSetupWizard`** (geführte Cloud-DB-Einrichtung) ·
**`EnableBankingWizard`** (geführter Bank-Verbinden-Assistent, ersetzt die
früheren getrennten Screens `EnableBankingConnectScreen` + `EnableBankingGuide`,
§10/§12) · `FuelAnalysisScreen` (Tank-Verbrauch/Preisauswertung, §13).

### Organisms / Molecules / Atoms / Buttons
- **organisms/**: `SaldoHeroV2` (Hero, von Dashboard **und** Monat genutzt —
  inkl. Konto-Dropdown-Pille zum Kontowechsel), `SaldoPrognose`, `PendingList`,
  `DataManagerDialog`, `MobileActionPicker` (das „+"-Menü), `BankFetchPanel`
  (Pull-to-Refresh-Vorschau/Staging für PSD2-Bankabruf, §6/§12),
  `WerkzeugeSection` (Massen-Zuordnungs-Werkzeuge, in `MonatScreen` eingebettet),
  `KontoWarnungWidget`, `AnchorSection`, `MobileKategorienModal`,
  `MobileVormerkenModal`, `MobileWiederkehrendModal`, `EditPopup`, `AddTxModal`,
  `BudgetEditorModal`, `MonthPickerModal`, `CloudSaveModal`, `TagesgeldWidget`,
  u. a.
- **molecules/**: `AccountChips` (Konto-Schnellwahl im Vormerken-Stil, überall
  genutzt), `CatPicker` (mit `noMargin`-Prop für enge Toolbars, §9),
  `ThemeDropdown`, **`ThemeSwitcherMini`** (Hero-Theme-Umschalter, 4-Punkte-
  Symbol), `MitteEndeFields`, `CategoryChart`/`ChartBlock` (Chart-Bausteine).
- **atoms/**: `MobileHeader` (Safe-Area + Zurück/X), `SupaField`, `Lbl`, `PBtn`, …
- **buttons/**: Werkzeug-Buttons (`NachkategorisierenButton`, `RegenRulesButton`, …).

### Worker (außerhalb `src/`, getrennt deploybar)
| Zweck | Ort |
|---|---|
| **Enable-Banking-Relay** (zustandslos, geheimnisfrei) | `worker/` |
| **Persönlicher Daten-Store** (KV-basiert, `X-Secret`) | `worker-data/` (Deploy-Button) |

---

## 3. Typografie

### 3.1 Zwei Schriftwelten
- **Geldbeträge** → **Questrial** (selbst gehostet). Zentral als `NUM_FONT` in
  `utils/format.js`:
  ```
  "Questrial","Century Gothic","Futura","Avenir Next",system-ui,sans-serif
  ```
  Als `@font-face` in `base.css` eingebunden und als Modul-Asset gebündelt →
  systemübergreifend identisch. Fallbacks greifen nur in der kurzen Ladephase.
- **UI-Text** → System-Sans (`-apple-system, BlinkMacSystemFont, "SF Pro Text", …`).

### 3.2 Fett-Regel (wichtig!)
- **Alle Texte sind regulär.** Global in `base.css`:
  `*{ font-weight:400 !important; font-synthesis:none; }`
- **Ausnahme**: Klasse **`.heroAmt`** (fett, synthetisch via `font-synthesis:weight`).
  Genutzt für **Kontostand, Mitte- und Ende-Betrag** im Hero. Der große Kontostand
  trägt zusätzlich `.heroBalance` (siehe §4.5). Inline-`fontWeight` ist sonst wirkungslos.

### 3.3 Geldformatierung
- `fmt(v)` → de-DE, **immer 2 Nachkommastellen**, **ohne Vorzeichen** (Absolutwert).
- **Minuszeichen** ist `−` (U+2212), nicht der Bindestrich.
- **Euro-Symbol** nur am großen Hero-Kontostand (`… €`); in Listen/Pillen ohne `€`.
- Tabellarische Ausrichtung mit `fontVariantNumeric:"tabular-nums"`.

---

## 4. Farben & Theming

### 4.1 Tokens statt Hex
Niemals Farben hart kodieren — immer `T.*` aus dem aktiven Theme.

| Token | Bedeutung |
|---|---|
| `T.bg` | App-Hintergrund |
| `T.surf`, `T.surf2`, `T.surf3` | Flächen/Karten (steigende Tiefe) |
| `T.txt`, `T.txt2`, `T.lbl` | Text primär / sekundär / tertiär |
| `T.bd`, `T.bds` | Border schwach / stärker |
| `T.pos` | Einnahmen / positiv (Default: Lime `#AACC00`) |
| `T.cell_inc` | **Hellgrün** — Einnahmen-Vormerkung |
| `T.gold` | **Gold** — Ausgaben-Vormerkung / Budget / Warnakzent (`#F5A623`) |
| `T.neg` | Ausgaben / negativ (`#EA4025`) |
| `T.blue` | Primär-Akzent (im Default-Theme = Lime, **nicht** wörtlich blau); auch Farbe des „+"-Buttons & Kontostands |
| `T.cf` | Cloudflare-Akzent (Sync-UI) |
| `T.mid` | „Mitte"-Label-Farbe |
| `T.on_accent` | Textfarbe auf Akzentflächen |
| `T.cond_neg/_warn/_gold/_pos` | Saldo-Ampel der Mitte/Ende-Prognose |

> `T.blue` ist historisch benannt; es ist der **Primärakzent** des Themes.

### 4.2 Verfügbare Themes
29 fest in `themes.js` ausgelieferte Themes (kein Nutzer-Content!), in zwei
Gruppen:
- **Basis-Set** (Objekt-Literal): `dark` (Default), `light`, `firetv`, `xbox`,
  `ps5`, `disneyplus`, `netflix`, `magenta`, `ios`, `material`, `paper`, `dkb`,
  `obsidian`, `sand`, `clean`, `brutalist`, `terminal`, `swiss`, `keyboard`.
- **Nachträglich ergänzt** (`THEMES.x = {...spread}`): `darkhell`, `hellgrau`,
  `kontrastdunkel`, `kontrasthell`, `mitternacht`, `creme`, `modernslate`,
  `cleancorporate`, `deepocean`, `softecotech`. `deepocean` und `darkhell`
  teilen bewusst **dieselbe Hintergrund-/Flächenhelligkeit** (`bg:"#3E444C"` …) —
  „Deep Ocean" ist optisch ein helleres Anthrazit auf demselben Grauwert wie
  „Dark Hell".

Zusätzlich **nutzerdefinierte** Themes aus `mbt_custom_themes` (`CustomThemeEditor`,
§4.3) — diese kommen **on top**, nicht in `themes.js`.

Jedes Theme definiert denselben Token-Satz. **Helle Themes** werden zentral in
`activeTheme.js` (`LIGHT_THEMES` / `isLightTheme`) geführt — neue helle Themes
**nur dort** ergänzen (sonst rechnet `isLightTheme()` für sie falsch; das ist
bereits einmal passiert und wurde gefixt — `LIGHT_THEMES` enthält jetzt alle 14
hellen Themes inkl. `kontrasthell`, `creme`, `cleancorporate`, `softecotech`).

### 4.3 Eine Farbe ändern — der sichere Weg
Der frühere Live-Color-Picker wurde entfernt (§10). Stattdessen:
1. **Token identifizieren** (`T.xyz` im Code).
2. Wert in `themes.js` für das/die Theme(s) ändern.
3. **Ein Token wirkt überall.** Für eine einzelne abweichende Stelle zuerst einen
   **neuen Token** anlegen, keinen bestehenden „umbiegen".

`SettingsInline` zeigt **keine Preset-Themes mehr** — nur den formularbasierten
`CustomThemeEditor` zum Anlegen **eigener** Farbschemata (§10). Gespeicherte
eigene Schemata erscheinen dort als kleine Chips mit einem **4-Punkte-Symbol**
(2×2-Raster: `blue/pos/neg/gold`) statt eines Theme-Namens. Derselbe 4-Punkte-
Look findet sich im `ThemeSwitcherMini` links oben im Hero (schaltet schnell
durch, je 4 Akzentpunkte über der Theme-Hintergrundfarbe).

### 4.4 Das 4-Farben-Betragsschema (zentral!)
Beträge tragen **keine** `+`/`−`-Vorzeichen mehr (außer der Kontostand bei negativ);
die **Farbe** kommuniziert Richtung und Art:

| Farbe | Token | Bedeutung |
|---|---|---|
| Grün | `T.pos` | reale **Einnahme** |
| Hellgrün | `T.cell_inc` | **Einnahmen**-Vormerkung |
| Gold | `T.gold` | **Ausgaben**-Vormerkung |
| Rot | `T.neg` | reale **Ausgabe** |

### 4.5 Betrags-Sichtbarkeit (`amtMode`) — das Augensymbol
`amtMode` (Context) steuert global per CSS-Klassen auf dem Wurzel-Container:
- **0** = unscharf (`.amts-blur`) + neutral — Beträge verwischt.
- **1** = sichtbar, neutral-weiß (`.amts-neutral`).
- **2** = sichtbar **und farbig** (4-Farben-Schema aktiv).

Bedienung im Hero (`SaldoHeroV2`): Das **Auge** rechts neben dem Kontostand schaltet
nur **0 ↔ sichtbar**. Das **Farbig-Schalten (2)** passiert über das **Ausklapp-Chevron**
zwischen MITTE und ENDE — farbig nur im ausgeklappten Detail-Zustand. Der große
**Kontostand** ist davon ausgenommen (`.heroBalance` + `--bal-col`): Er trägt immer
die Akzentfarbe des „+"-Buttons (negativ rot).

### 4.6 Budget-Ampel
Budget-Auslastung färbt nach **tatsächlichem Verbrauch (Ist)**, nicht nach dem
reservierten Prognosewert.

---

## 5. Layout & Navigation

- **Bottom-Tabbar** (`NAV_TABS` in `App.jsx`, visuell mit dem Master-Button in
  der Mitte): **Home · Trend · [+] · Monat · Daten**. „Trend" ist
  `JahrScreen`/`MoneyMoodScreen`-Land (`subTab==="mood"`), „Monat" ist die
  vereinte Monats-/Buchungsansicht (§6). „Daten" (vormals „Optionen") führt in
  `ManagementScreen` mit `activeStructurTab==="daten"` — eine Übersicht mit
  Zeilen zu CSV-Import, Bank verbinden, Daten-Manager, Cloud-Sync sowie einem
  Link zu „Konten" und einem Zahnrad oben rechts zu „Einstellungen"
  (`SettingsInline`). Der Bottom-Tab ist der direkteste, immer sichtbare Weg zu
  diesen Werkzeugen — bewusst wichtiger eingestuft als „Einstellungen", das
  seltener gebraucht wird und stattdessen über den dritten Mond bzw. das
  Zahnrad erreichbar ist (§10).
- **Zentraler Master-Button** (runder „+"/Monats-Knopf) — Kleinzustand: **nur
  Doppel-Tipp wirkt** (vergrößert ihn; Einzel-Tipp und Wisch tun im Kleinzustand
  bewusst nichts, damit der Doppel-Tipp zuverlässig erkannt wird). Vergrößerter
  Zustand: **Tipp** zeigt erst die **3 Monde** (`vormerken`/gold, `kategorien`
  „Budget"/blau, `einstellungen`/grau — **nicht mehr `daten`**, das hat jetzt
  einen eigenen Bottom-Tab, s. o.), ein **weiterer Tipp** öffnet die gerade
  aktive Mond-Funktion (oder direkt einen Mond antippen); **Wisch ←/→** blättert
  zwischen den Monden, **Doppel-Tipp** geht eine Ebene zurück/verkleinert wieder.
  **Wichtige Invariante:** JEDER Vollbild-Flow, der über den + geöffnet wird,
  **muss** beim Schließen (`onClose`, nicht `onBack`) `setPlusArretiert(false)`
  setzen — sonst bleibt der Button in der vergrößerten Mond-Bereitschaft hängen
  und der nächste Tipp wirkt scheinbar nicht (Symptom: „ich muss ständig
  doppeltippen"). Genau das war einmal kaputt (`MobileActionPicker`s `onClose`
  setzte fälschlich `true` statt `false`, plus mehrere fehlende Resets bei
  `CsvImportScreen`/`EnableBankingWizard`/`CloudSetupWizard`/`MatchingScreen`/
  `VormerkungHub`/`RecurringDetectionScreen`/`DataManagerDialog` u. a.) — bei
  neuen Vollbild-Flows diese Invariante von Anfang an einhalten.
- **Master-Override** (`masterOverride` im Context, `MasterOverrideSlot` in `App.jsx`):
  Vollbild-Flows (Vormerken, Kategorien, **Cloud-Wizard**, **Bank-Wizard** …)
  übernehmen den „+"-Button. Config `{label, onConfirm, onBack, onDismiss, disabled}`:
  - **Tipp** = `onConfirm` (Weiter/Bestätigen),
  - **Wisch ←** = `onBack` (Hinweis: **‹** am linken Rand),
  - **Wisch ↓** = `onDismiss` (Hinweis: **⌄** am unteren Rand).
  Der Effekt darf **nur an Bool-Readiness** hängen (nicht an Rohtexten), sonst Tipp-Lag.
  Die 3 Monde werden **unterdrückt, solange `masterOverride` aktiv ist**
  (Render-Bedingung verlangt `!masterOverride`) — sie würden sonst Inhalte
  des Wizards verdecken. Vollbild-Wizards, die den Override nutzen, brauchen
  entsprechend **viel Scroll-Reserve unten** (`calc(190px + safe-area-inset-bottom)`
  in `CloudSetupWizard`/`EnableBankingWizard`), weil der übernommene Knopf im
  Override-Zustand auf 1,5× skaliert und weit nach oben transformiert wird.
- **Drilldown-Muster**: state-basiertes Vollbild-Overlay, **immer Zurück-Pfeil links
  und X rechts**, Safe-Area-Header (`MobileHeader`), Suchfeld oben. Kein URL-Routing.
- **Vollbild-Screens** reservieren unten Platz für die fixe Nav-Bar:
  `calc(57px + env(safe-area-inset-bottom))`.

---

## 6. Home / Dashboard

Es gibt **nur noch `DashboardScreenV2`** (die „clean"-Variante; die alte v1 wurde
entfernt). Der Hero ist `organisms/SaldoHeroV2`.

- **Kategorie-Karten**: Zeile 1 = Icon + Name (Klick = **inline aufklappen**) +
  großer **aktuell**-Betrag (Klick = Buchungs-Drilldown). Zeile 2 = **Mitte/Ende**-
  Pillen (sichtbar bei globalem Toggle oder wenn aufgeklappt).
- **Inline-Unterkategorien** im selben 2-Zeilen-Format; jede Zelle öffnet direkt den
  jeweiligen Buchungs-Drilldown. Kein Zwischen-Modal mit Unterkategorien.
- **Hero-Konto-Dropdown**: Der Kontoname im Hero ist eine tippbare Pille — öffnet
  ein Dropdown zum direkten Kontowechsel (`SaldoHeroV2`, `accMenuOpen`); der
  große Kontostand selbst bleibt für das Durch-Tippen mehrerer Konten zuständig.
- **Bank-Abruf per Pull-to-Refresh**: Ziehen am oberen Rand (Scroll-Top) startet
  einen PSD2-Abruf neuer Bankumsätze (`enableBankingFetch.js`); Treffer landen
  **erst als Vorschau/Staging** in `organisms/BankFetchPanel` (Vorgemerkt-Badge,
  Dublettenerkennung, Lösch-Möglichkeit ohne Kategorisierungszwang) — **kein**
  automatischer Import ohne Bestätigung.

---

## 7. Geld-Semantik (für korrekte Anzeige unverzichtbar)

- **Mitte** = kumuliert bis **Tag 14**; **Ende** = bis **Monatsletzter**;
  **aktuell** = real gebuchter Ist-Stand (ohne Reservierung).
- **Budget-bewusste Prognose** (Giro/Gesamt, solange die Phase erreichbar ist):
  `Mitte = Ist(1..14) + restMitte`, `Ende = Ist(1..Ende) + restEnde` mit
  `rest = Σ max(0, Budget − Ist)` je Unterkategorie — gleiche Quelle wie der Hero.
- **Budget-Platzhalter** sind Vormerkungen mit `_budgetSubId` (`…_mitte` für die
  erste Hälfte, ohne Suffix für Ende/Gesamt). `totalAmount` = volles Phasenbudget;
  offenes Restbudget dynamisch über `utils/budgets.js: budgetOpenRestFor`.
- **`budgetPlaceholderActive(tx)`** entscheidet, ob ein Restbudget noch zählt. Nach
  Phasenende **fällt der Platzhalter überall weg**. Neue VM-/Budget-Anzeigen müssen
  diesen Filter anwenden.
- **VM-Buchhaltung** rechnet überall mit dem **offenen Rest** für Budgets
  (Header, Drilldown, `PendingList`, Monat) — konsistent.
- **Saldo-Quelle**: `utils/saldo.js`. Keine parallelen Eigenberechnungen in der UI.
- **Pending-Datum bei Bank-Abruf**: Für Saldo/Budget ist das **`value_date`**
  (wann der Umsatz das Konto belastet) maßgeblich, nicht `transaction_date`
  (nur zur Nachvollziehbarkeit). Vorgemerkte Bank-Umsätze bekommen zusätzlich
  über `date.js: pendingDebitDate()`/`nextBankWorkday()` automatisch den
  **nächsten Bankwerktag** als Datum, statt am (oft falschen) Bank-Stempel
  „heute" zu kleben — identisch zur manuellen Vormerkung.

---

## 8. Icons & Bilder

- Icons über `Li(name, size, color)` aus `utils/icons.jsx` (Lucide-Stil, async
  geladen via `lucideStatic.js`). Größen typ. 11–28 px.
- Bank-Logos als Inline-SVG (DKB, ING, Sparkasse, …) mit `currentColor`.

---

## 9. Wiederkehrende Komponenten-Muster

- **AccountChips** (`molecules/AccountChips.jsx`): quadratische Konto-Schnellwahl
  (Icon über Name) im Vormerken-Stil — überall verwendet, auch in Desktop-Modals.
- **Betrags-Pille/Zelle**: gleichbreite Fläche (`flex:1`), zentriert, klickbar nur
  bei Wert > 0; Betrags-Stil über `amtStyle(kind, plain)` aus `theme/amtPill.js`
  (sorgt für lesbaren Kontrast auf hellen Themes).
- **Drilldown-Header**: Zurück-Pfeil · Icon · Titel · Anzahl + Summe · X.
- **Inline definierte Komponenten NICHT als `<X/>` rendern** — sie bekommen pro
  Render neue Identität und mounten ihren Teilbaum neu (Scroll springt, Fokus geht
  verloren). Stattdessen als JSX-Wert oder Funktionsaufruf einsetzen (siehe Fix in
  `DataManagerDialog`).
- **Typsichere Massenkategorisierung** (`MonatScreen`, Bulk-Leiste bei
  Mehrfachauswahl): Eine gewählte Kategorie wird **nur** auf Buchungen
  angewendet, deren Einnahme/Ausgabe-Typ zur Kategorie passt
  (`matchType`-Guard); bei gemischter Auswahl bleiben nicht-passende Treffer
  **ausgewählt** statt falsch verbucht zu werden, plus Warnhinweis. `CatPicker`
  bekommt dafür die `noMargin`-Prop, damit die Kategorie-Pille in der
  horizontalen Bulk-Leiste bündig sitzt statt den eigenen Standard-Außenabstand
  zu behalten.

---

## 10. Entfernt / Deprecated

- **Live-Color-Picker** (schwebendes Stift-Symbol): komplett entfernt. Farben über
  `themes.js` (§4.3).
- **Dashboard v1** (`DashboardScreen.jsx`): entfernt — nur noch V2.
- **Menüpunkt „JSON laden"**: entfernt. Importieren läuft **ausschließlich** über
  den **Daten-Manager → Reiter „importieren"** (versteht Daten-Manager-Format und
  Voll-Backups; Mehrfach-Datei-Import möglich).
- **Eigener „Buchungen"-Tab / `TransactionsScreen.jsx`**: entfernt — die Ansicht
  wurde **in `MonatScreen` vereint** (multi-monatiges Durchblättern per
  Swipe/Infinite-Scroll mit Scroll-Spy, globale Suche per Enter, Tages-Gruppierung
  mit Tagessaldo, eingebettete `WerkzeugeSection`). Bottom-Tabbar entsprechend
  von „Home · Monat · Buchungen · Jahr" zunächst auf „Home · Trend · Monat ·
  Optionen" geändert.
- **Bottom-Tab „Optionen"**: kurzlebig — durch **„Daten"** ersetzt (§5). Ein
  reiner Einstellungen-Tab war zu selten gebraucht für den wertvollsten
  Bottom-Bar-Platz; „Daten" (CSV/Bank/Cloud-Sync/Backup) ist es häufiger.
  Einstellungen sind seither über den dritten Mond bzw. ein Zahnrad im
  Daten-Screen erreichbar. Der dritte Mond hieß vorher `daten` — jetzt
  `einstellungen`, da Daten den eigenen Tab hat. Die dadurch verwaiste
  `MobileActionPicker`-„daten"-Unteransicht (samt `initialScreen`/
  `mobilePickerScreen`-Umweg) wurde mit entfernt.
- **~29 Preset-Farbschema-Buttons** in den Einstellungen: entfernt.
  `SettingsInline`/`CustomThemeEditor` zeigen nur noch **selbst angelegte**
  Farbschemata (§4.3) — die 29 fest verdrahteten `themes.js`-Themes (§4.2)
  bleiben als Themes bestehen, sind aber nicht mehr über eine Preset-Knopfreihe
  wählbar.
- **`EnableBankingGuide.jsx` + `EnableBankingConnectScreen.jsx`**: entfernt,
  ersetzt durch den vereinten **`EnableBankingWizard.jsx`** (§12). In
  `MobileActionPicker` gibt es entsprechend nur noch **einen** Eintrag „Bank
  verbinden" statt zweier getrennter Einträge „Anleitung"/„Bank-Konto
  verbinden"; `App.jsx` hält nur noch `showBankWizard` statt zweier
  Einzel-States.

---

## 11. Daten sichern & wiederherstellen (Daten-Manager)

`organisms/DataManagerDialog.jsx` ist der **eine** nachvollziehbare Sicherungsort,
drei Reiter:

- **Exportieren**: 12 einzeln abwählbare Bereiche; **alle Haken + voller Zeitraum =
  100 %-Sicherung** (identisch zum Worker-zu-Worker-Weg). Optional der **Bank-Schlüssel
  (.pem)** — nur **passphrase-verschlüsselt** (mit Wiederholungsfeld; ohne die
  Passphrase nicht reimportierbar). Status-Banner zeigt vollständig/teilweise an.
- **Importieren**: Buchungen werden **ergänzt** (Duplikate per id übersprungen),
  Stammdaten **ersetzt**. Mehrere Dateien gleichzeitig möglich. Verschlüsselter
  Bank-Schlüssel braucht das Passphrase-Feld (wird hervorgehoben, wenn erkannt).
- **Löschen**: dieselben 12 Punkte (gleiche Namen/Reihenfolge wie Export) mit
  Bestätigung + automatischem Backup-Download. **Konten** und **Bank-Schlüssel** sind
  **Sprung-Punkte** in den Konten-Manager bzw. Bank-Abruf (nicht direkt löschbar).
- **Konto-Löschen** (im Konten-Manager) erzwingt das **Umhängen aller Buchungen,
  Gruppen und Budgets** auf ein Ziel-Konto — getestet in `utils/accountReassign.js`.
  So kann keine Buchung verwaisen.

---

## 12. Sync & Verschlüsselung (Architektur)

- **Backends** (`hooks/useCloudCredentials.js`): Supabase, JSONBin, GitHub Gist,
  **Cloudflare Worker** (empfohlen). Zugangsdaten lokal in IDB + kvStore.
- **Zero-Knowledge**: Ist eine **Sync-Passphrase** gesetzt, verschlüsselt
  `utils/syncCrypto.js` (AES-256-GCM, Schlüssel via PBKDF2-SHA256/150k, selbst-
  beschreibender Umschlag `{__enc,salt,iv,ct}`) jeden Body **vor** dem Upload. Der
  Worker sieht nur Chiffrat. Ohne Passphrase: Klartext wie bisher. Auf dem Load-Pfad
  erkennt `isEncrypted()` den Umschlag automatisch. Aktuell im **Cloudflare-Pfad**
  verdrahtet.
- **Bank-Schlüssel im Sync**: Der private .pem wird **nur bei aktiver Passphrase**
  (verschlüsselt) mitsynchronisiert (`exportEbForSync`/`importEbFromSync`); lokaler
  Schlüssel hat Vorrang. **Eigene Farbthemes** wandern ebenfalls mit.
- **Relay vs. Daten-Store**: Der Enable-Banking-**Relay** (`worker/`) ist zustandslos
  und geheimnisfrei (löst nur CORS; JWT wird im Browser signiert). Der **Daten-Store**
  (`worker-data/`) ist die persönliche DB pro Nutzer (KV, `X-Secret`/`SYNC_SECRET`).
  Beide Cloudflare-Free-tauglich, 0 € laufend.
- **Einrichtung**: geführt über `CloudSetupWizard` (Deploy-to-Cloudflare-Button,
  Secret-Generator, Passphrase mit Auge + Wiederholung, Selbsttest) — erreichbar über
  „+" → Daten → **Cloud-Sync einrichten**. Doku: `Cloudflare-Setup.md`.
- **Bank-Verbinden-Einrichtung**: analog geführt über **`EnableBankingWizard`**
  (9 Schritte: Übersicht → Portal-Konto → App/Schlüssel → Zugangsdaten →
  Konten-freischalten-Hinweis → Bank wählen/verbinden → Konten zuordnen →
  Vorschau/Import → Fertig) — erreichbar über den Bottom-Tab **Daten** →
  **Bank verbinden** (`App.jsx`-State `showBankWizard`). Springt nach
  Bank-Redirect automatisch zum passenden Schritt zurück. Ist bereits alles
  eingerichtet, zeigt Schritt „Übersicht" statt der Erklär-Texte eine
  **Status-Zusammenfassung** (Application-ID, Schlüssel-Status, verbundene
  Banken) mit direkten Sprungzielen („Zugangsdaten ansehen/ändern“, „Buchungen
  abrufen“, „Weitere Bank verbinden“) — man muss sich nicht durch die
  Erklär-Schritte klicken, um an bereits hinterlegte Werte zu kommen.
  `enableBankingFetch.js: friendlyBankError()` prüft **Rate-Limit (429) vor**
  abgelaufener Freigabe — die 429-Meldung der Bank enthält zufällig das Wort
  „consent" und würde sonst fälschlich als „Freigabe abgelaufen" angezeigt.
- **Wichtige Falle bei „live speichern" auf Formularen mit asynchronem
  Erst-Laden** (`EnableBankingWizard`): Ein `useEffect`, der bei jeder Eingabe
  sofort persistiert (`[relayUrl, appId, privateKey]` als Deps), feuert beim
  **allerersten Render bereits mit den leeren Anfangswerten** — noch bevor ein
  zweiter, asynchroner `useEffect` die zuvor gespeicherten Werte geladen hat.
  Ohne Schutz überschreibt der erste Effekt damit sofort eine bereits
  gespeicherte Application-ID/einen Schlüssel mit `""`. Fix: ein Hydration-Flag
  (`credsHydratedRef`), das der Speichern-Effekt erst nach erfolgreichem Laden
  respektiert. Dieses Muster gilt für **jedes** Formular, das „sofort
  speichern" mit asynchronem Laden bestehender Werte kombiniert.

---

## 13. Tank-Erfassung (Verbrauch & Preisauswertung)

- **Erkennung**: feste Kategorie **„Tanken"** (exakt, case-insensitive —
  `utils/fuel.js: isFuelCat()`), kein Fuzzy-Match auf Empfänger/Notiz.
  **„Tanken" kann Haupt- ODER Unterkategorie sein** (typisch: Hauptkategorie
  „Auto" mit Unterkategorie „Tanken") — deshalb prüft `isFuelSelection(cat, sub)`
  **beide Ebenen**; ein Check nur auf die Hauptkategorie übersieht den in der
  Praxis häufigeren Fall (Kategorie als Unterpunkt einer Oberkategorie).
- **Zusatzfelder an der Buchung** (nur gesetzt, wenn beim Erfassen ausgefüllt):
  `_fuelVehicleId`, `_fuelLiters`, `_fuelPricePerL`, `_odometer`.
- **Mehrere Fahrzeuge**: eigenes Top-Level-Array `vehicles` (`{id,name}`) —
  genau wie `accounts`/`cats` lokal persistiert (`useLocalSaveDebounce`),
  Cloud-synchronisiert (`saveConfig`/`applyData`) und über den Daten-Manager
  exportier-/importier-/löschbar. Anlage **inline** beim Erfassen („+ neues
  Fahrzeug"-Chip in `MobileVormerkenModal`/`EditPopup`) — keine eigene
  Verwaltungsseite (Scope-Entscheidung: der Nutzer wollte Mehrfahrzeug-
  **Unterstützung**, kein volles CRUD-Tooling).
- **Erfassung**: Felder erscheinen **nur**, wenn Kategorie = „Tanken" **und**
  es sich um eine einmalige Ausgabe handelt (nicht bei Serie/Umbuchung) —
  `MobileVormerkenModal` Schritt 3 („Details") bzw. `EditPopup` direkt unter
  dem „aus Unvorhergesehenes"-Baustein. Liter × €/Liter wird live berechnet
  und kann per Button „Betrag übernehmen" in den Betrag (Schritt 1) sync­en.
- **Vier separate Erfassungs-/Bearbeiten-Formulare, EINE Regel**: Es gibt
  keinen einzigen zentralen Vormerkung-Dialog — `MobileVormerkenModal` (Mobile,
  Neu-Anlegen), `VormerkungHub` (Mobile, Bearbeiten bestehender Vormerkungen
  via `openEdit()` + Prefill aus `RecurringDetectionScreen`) und `AddTxModal`
  (Desktop, Neu-Anlegen) bauen `tx`-Objekte jeweils in eigener Logik. Die
  Tank-Erfassung muss **in allen dreien** verdrahtet sein (gleiche Gating-
  Bedingung `typ==="einmalig" && csvType==="expense" && isFuelCat(cat)`,
  gleiches `fuelTxFields`-Objekt-Muster in den finalen tx-Konstruktoren) —
  sonst fehlt sie unbemerkt in einem der Wege. Bei künftigen neuen
  Zusatzfeldern an Vormerkungen **immer alle drei Dateien prüfen**.
- **Falle beim Bearbeiten (`EditPopup`/`saveEdit` in `App.jsx`)**: `openEdit()`
  baut `editTx` aus einer **expliziten Feld-Whitelist** und `saveEdit()`
  schreibt beim Speichern nur explizit gelistete Felder in die aktualisierte
  Buchung — ein einfaches `{...t, ...}`/`{...editTx}` reicht nicht. Jedes neue
  Zusatzfeld (wie zuvor schon `_potSubId`) muss **an beiden Stellen** ergänzt
  werden, sonst gehen Änderungen beim Speichern verloren bzw. zeigt der
  Dialog beim erneuten Öffnen leere Felder, obwohl die Buchung Daten trägt.
- **Auswertung**: `utils/fuel.js: buildFuelSeries()` sortiert die
  Tankvorgänge eines Fahrzeugs nach km-Stand und berechnet den Verbrauch
  (l/100 km) jeweils aus der Menge des **späteren** Tankvorgangs und der
  Distanz zum vorherigen. `screens/FuelAnalysisScreen.jsx` zeigt Ø-Kennzahlen,
  zwei Balken-Charts (Verbrauch, Preis/Liter — je Chart eine feste
  Magnitude-Farbe statt einer kategorialen Palette) und eine Liste aller
  Tankvorgänge — erreichbar über Bottom-Tab **Daten** → **Tankverbrauch**
  (`App.jsx`-State `showFuelAnalysis`).

---

## 14. Performance (Konventionen + Hotspots)

Die App hält bis zu 10.000+ Buchungen im Context. Verbindliche Regeln:

- **Lange Listen deckeln/virtualisieren.** `MonatScreen` rendert nicht alle Monate
  auf einmal, sondern hält ein **Monats-Fenster** (`range`/`monthKeys`) und lädt
  bei Swipe nach oben/unten **genau einen weiteren Monat** nach
  („+ N neuere/ältere anzeigen"; Swipe löst exakt dieselbe Reveal-Funktion wie
  der Button aus). Scroll-Spy für den dynamischen Monatstitel ist **entprellt**
  (~170 ms) und manipuliert die Scroll-Position **nicht** selbst — sonst löst der
  Monatswechsel mitten im Scrollen die teure Budget-Neuberechnung
  (`calcOpenBudgetDetails`) aus und der Bildschirm wird kurz leer.
- **Teure Aggregationen in `useMemo`** mit minimalen Deps (i. d. R.
  `[txs, year, month, selAcc]`); Pro-Kategorie-Summen einmal als Map.
- **Kein O(txs) pro Zeile** in `.map()` — vorindizierte Maps statt `txs.filter/find`.
- **Datumsvergleich per ISO-String** statt `new Date()` in heißen Schleifen.
- **Context-`useMemo`-Deps vollständig halten:** Neue Context-Werte müssen ins
  Dependency-Array des `AppCtx`-Provider-`useMemo`, sonst „friert" der Wert ein
  (führte z. B. dazu, dass ein Eingabefeld keine Eingaben annahm).
- **Zentrale Helfer statt Eigenrechnung** (Salden, Summen-Maps).

---

## 15. Konventionen

- **UI-Sprache: Deutsch.** Code/Token/Props in Englisch.
- Viele Dateien tragen den Kopf „Auto-generated module" — sie werden **direkt**
  gepflegt (kein aktiver Generator mehr); Änderungen in `src/`.
- Vor jeder visuellen Änderung prüfen, ob ein **Token** oder eine **zentrale
  Konstante** (`NUM_FONT`, `fmt`, Saldo-Helfer, `amtStyle`) der richtige Hebel ist.
- **Sicherheit**: Der private .pem-Schlüssel liegt nur im Gerät (IndexedDB) bzw.
  ausschließlich **verschlüsselt** in Sync/Backup. Keine Geheimnisse ins Repo.
- Tests: `npm test` (Vitest/jsdom). Vor Commit Build **und** Tests grün halten.
