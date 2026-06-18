# Design-Guide — SupaDupa Money

> Stand: 2026-06 · Abgeleitet aus dem aktuellen Code (`src/`). Diese Datei
> beschreibt das gelebte Design-System der App, nicht einen Wunschzustand.
> Bei Abweichungen gilt der Code — bitte diesen Guide bei Änderungen mitpflegen.

---

## 1. Grundprinzipien

- **Local-first PWA**: React + Vite, Daten liegen lokal (IndexedDB via `kvStore`).
  Kein Pflicht-Backend, kein Tracking.
- **Optionaler, verschlüsselter Cloud-Sync**: Wer mehrere Geräte nutzen will, kann
  seine Daten in eine **eigene** Cloud-DB legen (Cloudflare Worker, Supabase,
  JSONBin oder GitHub Gist). Mit gesetzter Passphrase wird die Nutzlast
  **client-seitig Ende-zu-Ende verschlüsselt** (AES-GCM, siehe §13). Es gibt
  weiterhin keinen zentralen Server des Betreibers für Nutzerdaten.
- **Bank-Import** auf drei Wegen: **CSV** (Banking-Export), **PDF-Kontoauszug**
  (`utils/pdfStatement.js`, Wirecard/N26) und **echter PSD2-Kontoabruf** über
  **Enable Banking** (`utils/enableBanking.js` + geführter Connect-Screen).
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
| Buchungs-Helfer / Fingerprints | `tx.js` |
| Jahres-/Monatsdaten, Ankerpunkte | `yearData.js`, `anchors.js` |
| CSV-Parsing / PDF-Kontoauszug | `csv.js`, `pdfStatement.js` |
| Cloud-Buchungskompression | `cloudTx.js` (`compressTxByYear`) |
| **Sync-Verschlüsselung (Zero-Knowledge)** | `syncCrypto.js` (AES-GCM/PBKDF2) |
| **Enable-Banking-Client + lokale Ablage** | `enableBanking.js`, `enableBankingStore.js` |
| **Konto-Löschen ohne Datenverlust** | `accountReassign.js` |
| Suche, Datum, Konstanten, KV-Store, Icons | `search.js`, `date.js`, `constants.js`, `kvStore.js`, `icons.jsx`, `lucideStatic.js` |

### State & Hooks
| Zweck | Ort |
|---|---|
| App-Context-Objekt | `state/AppContext.js` (`AppCtx`) |
| Persistenz / IndexedDB-Bridge (`window.IDB`) | `state/persistence.js` |
| Cloud-Zugangsdaten + Sync-Passphrase | `hooks/useCloudCredentials.js` |
| Debounced Local-Save | `hooks/useLocalSaveDebounce.js` |

### Screens (`components/screens/`)
`DashboardScreenV2` (Home) · `MonatScreen` · `TransactionsScreen` · `JahrScreen` ·
`ManagementScreen` (Struktur: Konten/Kategorien/Einstellungen) · `SettingsInline` ·
`CsvImportScreen` · `MatchingScreen` (zuordnen) · `VormerkungHub` ·
`RecurringDetectionScreen` · `CustomThemeEditor` · **`CloudSetupWizard`** (geführte
Cloud-DB-Einrichtung) · **`EnableBankingConnectScreen`** + `EnableBankingGuide`.

### Organisms / Molecules / Atoms / Buttons
- **organisms/**: `SaldoHeroV2` (Hero, von Dashboard **und** Monat genutzt),
  `SaldoPrognose`, `PendingList`, `DataManagerDialog`, `MobileActionPicker`
  (das „+"-Menü), `MobileKategorienModal`, `MobileVormerkenModal`,
  `MobileWiederkehrendModal`, `EditPopup`, `AddTxModal`, `BudgetEditorModal`,
  `MonthPickerModal`, `CloudSaveModal`, `TagesgeldWidget`, u. a.
- **molecules/**: `AccountChips` (Konto-Schnellwahl im Vormerken-Stil, überall
  genutzt), `CatPicker`, `ThemeDropdown`, **`ThemeSwitcherMini`** (Hero-Theme-
  Umschalter), `MitteEndeFields`, Chart-Bausteine.
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
Definiert in `themes.js`: `dark` (Default), `light`, `firetv`, `xbox`, `ps5`,
`disneyplus`, `netflix`, `magenta`, `ios`, `material`, `paper`, `dkb`, `obsidian`,
`sand`, `clean`, `brutalist`, `terminal`, `swiss`, `keyboard` (plus
nutzerdefinierte aus `mbt_custom_themes`). Jedes Theme definiert denselben
Token-Satz. **Helle Themes** werden zentral in `activeTheme.js` (`LIGHT_THEMES` /
`isLightTheme`) geführt — neue helle Themes **nur dort** ergänzen.

### 4.3 Eine Farbe ändern — der sichere Weg
Der frühere Live-Color-Picker wurde entfernt (§10). Stattdessen:
1. **Token identifizieren** (`T.xyz` im Code).
2. Wert in `themes.js` für das/die Theme(s) ändern.
3. **Ein Token wirkt überall.** Für eine einzelne abweichende Stelle zuerst einen
   **neuen Token** anlegen, keinen bestehenden „umbiegen".

(Formularbasierter `CustomThemeEditor` in den Einstellungen bleibt; der
`ThemeSwitcherMini` links oben im Hero schaltet schnell durch — je 4 Akzentpunkte
über der Theme-Hintergrundfarbe.)

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

- **Bottom-Tabbar**: Home · Monat · Buchungen · Jahr.
- **Zentraler Master-Button** (runder „+"/Monats-Knopf): Normalzustand zeigt den
  aktuellen Monat („WISCHEN"); **Tipp** öffnet das Aktions-Menü
  (`MobileActionPicker`), **Wisch** wechselt den Monat. **Doppel-Tipp** arretiert
  ihn größer.
- **Master-Override** (`masterOverride` im Context, `MasterOverrideSlot` in `App.jsx`):
  Vollbild-Flows (Vormerken, Kategorien, **Cloud-Wizard** …) übernehmen den
  „+"-Button. Config `{label, onConfirm, onBack, onDismiss, disabled}`:
  - **Tipp** = `onConfirm` (Weiter/Bestätigen),
  - **Wisch ←** = `onBack` (Hinweis: **‹** am linken Rand),
  - **Wisch ↓** = `onDismiss` (Hinweis: **⌄** am unteren Rand).
  Der Effekt darf **nur an Bool-Readiness** hängen (nicht an Rohtexten), sonst Tipp-Lag.
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

---

## 10. Entfernt / Deprecated

- **Live-Color-Picker** (schwebendes Stift-Symbol): komplett entfernt. Farben über
  `themes.js` (§4.3).
- **Dashboard v1** (`DashboardScreen.jsx`): entfernt — nur noch V2.
- **Menüpunkt „JSON laden"**: entfernt. Importieren läuft **ausschließlich** über
  den **Daten-Manager → Reiter „importieren"** (versteht Daten-Manager-Format und
  Voll-Backups; Mehrfach-Datei-Import möglich).

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

---

## 13. Performance (Konventionen + Hotspots)

Die App hält bis zu 10.000+ Buchungen im Context. Verbindliche Regeln:

- **Lange Listen deckeln/virtualisieren.** `TransactionsScreen` rendert nur die
  ersten `PAGE` (80) Treffer + „mehr anzeigen".
- **Teure Aggregationen in `useMemo`** mit minimalen Deps (i. d. R.
  `[txs, year, month, selAcc]`); Pro-Kategorie-Summen einmal als Map.
- **Kein O(txs) pro Zeile** in `.map()` — vorindizierte Maps statt `txs.filter/find`.
- **Datumsvergleich per ISO-String** statt `new Date()` in heißen Schleifen.
- **Context-`useMemo`-Deps vollständig halten:** Neue Context-Werte müssen ins
  Dependency-Array des `AppCtx`-Provider-`useMemo`, sonst „friert" der Wert ein
  (führte z. B. dazu, dass ein Eingabefeld keine Eingaben annahm).
- **Zentrale Helfer statt Eigenrechnung** (Salden, Summen-Maps).

---

## 14. Konventionen

- **UI-Sprache: Deutsch.** Code/Token/Props in Englisch.
- Viele Dateien tragen den Kopf „Auto-generated module" — sie werden **direkt**
  gepflegt (kein aktiver Generator mehr); Änderungen in `src/`.
- Vor jeder visuellen Änderung prüfen, ob ein **Token** oder eine **zentrale
  Konstante** (`NUM_FONT`, `fmt`, Saldo-Helfer, `amtStyle`) der richtige Hebel ist.
- **Sicherheit**: Der private .pem-Schlüssel liegt nur im Gerät (IndexedDB) bzw.
  ausschließlich **verschlüsselt** in Sync/Backup. Keine Geheimnisse ins Repo.
- Tests: `npm test` (Vitest/jsdom). Vor Commit Build **und** Tests grün halten.
