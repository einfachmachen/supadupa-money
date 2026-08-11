# Design-Guide — SupaDupa Money

> Stand: 2026-08-07 · Abgeleitet aus dem aktuellen Code (`src/`). Diese Datei
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
  `DataManagerDialog`, `MobileActionPicker` (das „+"-Menü), `IconPickerDialog`
  (alle Lucide-Icons, Suche/Kategorien, „Bereits verwendet"- und „Favoriten"-
  Schnellwahlzeile), **`IconSwipePicker`** (Vollbild-Dialog, Tinder-artig: ein
  Icon nach dem anderen, per Wisch/Buttons als Favorit (★, rechts) sammeln
  oder überspringen (✕, links); Fortschritt (`mbt_fav_icons_idx`) und
  Favoriten (`AppCtx.favIcons`, kvStore `mbt_fav_icons`) persistiert — Aufruf
  über den ★-Button im `IconPickerDialog`-Header), `BankFetchPanel`
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
- **atoms/**: `MobileHeader` (Safe-Area + Zurück/X, optionale Icon-Kachel via
  `icon`/`iconColor` — verbindlicher Header aller Daten-Tab-Dialoge, §5),
  **`RotatedCents`** (kleine, gedrehte Nachkommastellen, §3.3),
  `SupaField`, `Lbl`, `PBtn`, …
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
- **Schriftgrößen**: Dashboard und Monatsliste teilen sich **eine** Stufenleiter
  — 20 für die Kopfzeile einer Gruppe (Kategorie bzw. Tag samt Tagessaldo), 17
  für die Zeilen darunter (Buchung, Budget-Kategorie), 12 für Unterzeilen,
  Datum und Zusätze. In `MonatScreen` stehen sie als `FS_ZEILE`/`FS_BETRAG`/
  `FS_SUB`/`FS_KOPF`/`FS_SALDO`/`FS_DETAIL` oben in der Datei. **Wer sie
  ändert, muss die Ruhewerte im Fokus-Effekt (`setRowFocus`) mitziehen** — der
  setzt die Größen per DOM und würde sonst beim Deaktivieren auf alte Zahlen
  zurückfallen.
- **`atoms/RotatedCents.jsx`** für enge Stellen: Euro bleiben groß und
  vollständig, die Nachkommastellen stehen klein und um 90° nach links gedreht
  daneben — braucht statt „,XX" nur noch etwa eine Ziffernbreite. Im Einsatz in
  den Hero-Detailzeilen (Buch./VM/unkat.) und bei **allen Beträgen der
  Monatsliste**. Dort ist es die Gegenrechnung zu den größeren Schriften: die
  Zeilen wurden auf Dashboard-Maß angehoben, ohne breiter zu werden. In der
  Tages-Kopfzeile ist es zusätzlich nötig, weil Datum, Wochentag, „Mitte"-Marke
  und zwei Zusatzinfos sonst gemeinsam über die Bildschirmbreite hinauslaufen. Das umgebende Element braucht
  `display:"inline-flex"` + `alignItems:"center"`.

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
| `T.cell_inc` | **Blasses Lime** (= `pos_vm`) — Einnahmen-Vormerkung |
| `T.cell_exp` | **Blasses Cyan** (= `neg_vm`) — Ausgaben-Vormerkung |
| `T.gold` | **Gold** — Budget / Warnakzent / Finanzierung (`#F5A623`) |
| `T.neg` | Ausgaben / negativ |
| `T.blue` | Primär-Akzent (im Default-Theme = Lime, **nicht** wörtlich blau); auch Farbe des „+"-Buttons & Kontostands |
| `T.cf` | Cloudflare-Akzent (Sync-UI) |
| `T.mid` | „Mitte"-Label-Farbe |
| `T.on_accent` | Textfarbe auf Akzentflächen |
| `T.cond_neg/_warn/_gold/_pos` | Saldo-Ampel der Mitte/Ende-Prognose |

> `T.blue` ist historisch benannt; es ist der **Primärakzent** des Themes.

**Abgesetzte Flächen** (Budget-Bereiche in den Aufrissen) kommen **nicht** aus
einem festen Token, sondern aus `flaecheAbgesetzt(untergrund)` in
`activeTheme.js`. Der Helfer liefert normalerweise `T.surf` — die Themes haben
ihre Kartenfarbe bewusst gewählt. Nur wenn `surf` dem Untergrund zu nahe kommt
(< `MIN_KONTRAST`, 1,42 : 1; „Kontrast Hell" setzt beide auf `#FFFFFF`), rückt
er selbst vom Untergrund ab — heller bei dunklen, dunkler bei hellen Themes,
bis **`ZIEL_KONTRAST` (1,52 : 1)** erreicht ist. Den Mischanteil sucht eine
kurze Binärsuche statt einer geschlossenen Formel, damit der **Farbton des
Untergrunds erhalten bleibt** (ein blaustichiges Grau bleibt blaustichig).
Ergebnis über alle 33 Themes: 1,50–1,54 : 1.

> **Gemessen wird WCAG-Kontrast, nicht Helligkeit.** Zwei frühere Fassungen
> nutzten eine schlichte Kanal-Mischung (`0,299·R + 0,587·G + 0,114·B`). Die ist
> nicht wahrnehmungsgerecht: derselbe Zahlenabstand wirkt auf mittlerem Grau
> deutlich und auf fast Schwarz kaum. „Kontrast Dunkel" (`bg #000000`) und
> „Glutorange" (`bg #161616`) lagen rechnerisch beide bei 0,130 — sichtbar aber
> bei 1,30 : 1 gegen 1,52 : 1, und genau das sah man. Der Kontrastwert bildet
> die Gamma-Kurve ab und gilt über den ganzen Helligkeitsbereich gleich.
>
> `ZIEL_KONTRAST` ist die **einzige** Stellschraube dafür, wie deutlich sich ein
> Budget-Bereich abhebt — eine Zeile ändern wirkt auf die ganze App.

> **Alle Budget-Bereiche liegen auf `T.bg`** — der Hero-Bereich und die
> Aufriss-Liste sind beide auf `T.bg` gemalt. Das ist die Voraussetzung dafür,
> dass dieselbe Kategorie in Prognose und Aufriss **dieselbe** Farbe hat. Der
> Prognose-Aufriss hatte zwischenzeitlich ein eigenes `surf3`-Panel; dadurch
> rechnete der Helfer je Zusammenhang gegen einen anderen Untergrund, und die
> Karten hatten sichtbar zwei verschiedene Grautöne. Wer dort wieder eine
> Fläche einzieht, muss sie an **beiden** Orten einziehen.

*Warum das bei hellen Themes enger ist:* Über Weiß gibt es keinen Spielraum
mehr. Wo `bg` schon fast weiß ist, kann die Karte nicht heller werden — sie
geht dann eine Spur ins Graue, genau wie die grauen Karten-Listen der
System-UIs. Deshalb entscheidet die Richtung `isLightTheme()` und nicht ein
fester Weiß-Schleier.

### 4.2 Verfügbare Themes
33 fest in `themes.js` ausgelieferte Themes (kein Nutzer-Content!), in zwei
Gruppen:
- **Basis-Set** (Objekt-Literal): `dark` (Default), `light`, `firetv`, `xbox`,
  `ps5`, `disneyplus`, `netflix`, `magenta`, `ios`, `material`, `paper`, `dkb`,
  `obsidian`, `sand`, `clean`, `brutalist`, `terminal`, `swiss`, `keyboard`.
- **Nachträglich ergänzt** (`THEMES.x = {...spread}`): `hellgrau`,
  `kontrastdunkel`, `kontrasthell`, `mitternacht`, `creme`, `modernslate`,
  `cleancorporate`, `deepocean`, `softecotech`, `abenteuergruen`,
  `weltraumtaschengeld`, `zirkustaschenrechner`, `kloetzchenwelt`, `magazin`.

> **Schlüssel ≠ Anzeigename.** Die Schlüssel sind bewusst eingefroren
> (gespeicherte Auswahl in `mbt_theme`), die `name`-Felder wurden mehrfach
> geändert. Anzeigenamen sind **kurze zusammengesetzte Wörter** aus Gattung
> und Signalfarbe (`firetv` → „Glutorange", `netflix` → „Serienrot", `dkb` →
> „Direktbank", `dark`/`light` → „Lime"/„Limehell"). Fremde Markennamen sind
> bewusst **weder benutzt noch übersetzt** — eine Übersetzung wäre der
> klassische Fallstrick. Wer ein Theme umbenennt: nur `name` anfassen, nie den
> Schlüssel.

**Kinder-Themes**: `abenteuergruen`, `weltraumtaschengeld`,
`zirkustaschenrechner`, `kloetzchenwelt` („Klötzchenwelt", Farbwelt der
bekannten Klötzchen-Bauwelt; alle Ecken eckig via `.theme-kloetzchenwelt *`).
Sie unterscheiden sich über Farben, `hero_bg` und ein eigenes `nav_icons`-Set.
Den früheren farbigen Deko-Außenrand (`frame_border`/`frame_ring`) gibt es
nicht mehr (§10).

Zusätzlich **nutzerdefinierte** Themes aus `mbt_custom_themes` (`CustomThemeEditor`,
§4.3) — diese kommen **on top**, nicht in `themes.js`.

Jedes Theme definiert denselben Token-Satz. **Helle Themes** werden zentral in
`activeTheme.js` (`LIGHT_THEMES` / `isLightTheme`) geführt — neue helle Themes
bitte **dort eintragen**. Die Liste war dreimal unvollständig (`keyboard`,
`abenteuergruen`, `zirkustaschenrechner`), deshalb liegt jetzt ein
**Sicherheitsnetz** dahinter: Ist ein Theme nicht eingetragen, entscheidet die
Helligkeit seines `bg` (Luma ≥ 0,5 → hell). Die Liste hat weiterhin Vorrang und
regelt die Grenzfälle; sie muss nur nicht mehr vollständig sein, damit nichts
kaputtgeht.

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
| Blasses Lime | `T.cell_inc` (= `pos_vm`) | **Einnahmen**-Vormerkung |
| Blasses Cyan | `T.cell_exp` (= `neg_vm`) | **Ausgaben**-Vormerkung |
| Rot/Cyan | `T.neg` | reale **Ausgabe** (Farbe je nach Farbkonzept-Version des Themes) |

**Blass heißt geplant, gesättigt heißt geflossen.** Daraus folgt für jedes
Gegensatzpaar in den Aufrissen: „genutzt" (bereits ausgegeben) steht
**gesättigt**, „offen"/„Rest" (noch nicht ausgegeben) **blass**. In
`BudgetBereich` trug „genutzt" lange die blasse Vormerkungsfarbe und war damit
von „offen" daneben nicht zu unterscheiden.

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

### 4.6 Nachkommastellen drehen (`betrag()` statt `fmt()`)
Option im Theme-Menü unter „Beträge", persistiert als `mbt_cents_gedreht`.
Eingeschaltet stehen die Cent überall klein und um 90° gedreht — das, was Hero
und Monatsliste an einzelnen Stellen ohnehin fest tun (`RotatedCents`), nur für
**alle** Beträge. Spart je Betrag etwa die Breite einer Ziffer.

Die Regel dahinter, und sie ist wichtig:

| Funktion | Rückgabe | Wofür |
|---|---|---|
| `fmt(v)` (`utils/format.js`) | **immer** ein String | Template-Literals, Attribute, `alert()`/Toasts, Exporte, Breitenrechnungen |
| `betrag(v)` (`utils/betrag.jsx`) | String **oder Element** | ausschließlich JSX-Kindposition |
| `betragText(s)` | dito, aus fertigem Text | bereits gekürzte Beträge (`fmtShort`, „2.480" ohne `,00`) |

Ein `betrag()` im String-Kontext ergibt `[object Object]` — und zwar erst,
wenn die Option eingeschaltet wird, also lange nach dem Schreiben des Codes.
Ebenso wenig funktioniert es in SVG-`<text>`-Knoten: dort rendert kein
HTML-`<span>`, weshalb `CategoryChart` bewusst bei `fmt()` bleibt.
`tests/betragOption.test.js` scannt den Quelltext auf beide Fälle.

Das Flag liegt im Modul, nicht im Context — über hundert Aufrufstellen bräuchten
sonst alle einen Context-Zugriff. `App.jsx` setzt es beim Rendern aus dem
persistierten Zustand; die Kinder rendern danach.

### 4.7 Budget-Ampel
Budget-Auslastung färbt nach **tatsächlichem Verbrauch (Ist)**, nicht nach dem
reservierten Prognosewert.

---

## 5. Layout & Navigation

- **Bottom-Tabbar** (`NAV_TABS` in `App.jsx`, visuell mit dem Master-Button in
  der Mitte): **Home · Monat · [+] · Trend · Daten**. Die drei Render-Stellen
  greifen positionsbasiert zu (`[NAV_TABS[0], NAV_TABS[1], "plus",
  NAV_TABS[2], NAV_TABS[3]]`) — für eine andere Reihenfolge genügt es, das
  Array umzusortieren. „Trend" ist
  `JahrScreen`/`MoneyMoodScreen`-Land (`subTab==="mood"`), „Monat" ist die
  vereinte Monats-/Buchungsansicht (§6). „Daten" (vormals „Optionen") führt in
  `ManagementScreen` mit `activeStructurTab==="daten"` — eine Übersicht mit
  Zeilen zu CSV-Import, Bank verbinden, Daten-Manager, Cloud-Sync, Tankverbrauch,
  Konten, **Budget** und **Einstellungen** (letztere beiden vormals über die
  „Monde" erreichbar, s. u. — jetzt gleichwertige Zeilen; „Einstellungen" hat
  wie „Konten" einen eigenen Zurück-Pfeil zu „Daten"). Der Bottom-Tab ist der
  direkteste, immer sichtbare Weg zu diesen Werkzeugen.
- **Zentraler Master-Button** (runder „+"/Monats-Knopf) — **Einzel-Tipp öffnet
  direkt die Vormerken-Erfassung** (`MobileVormerkenModal`), sowohl im
  Kleinzustand (Ruheposition in der Bottom-Bar) als auch im vergrößerten
  Zustand — jeweils nach einer kurzen Verzögerung (`DOUBLE_TAP_MS` = 350 ms),
  damit ein Doppel-Tipp den Einzel-Tipp noch abfangen kann (`clearTimeout` auf
  den wartenden Timer). **Doppel-Tipp** vergrößert den Button (Kleinzustand)
  bzw. verkleinert ihn wieder und springt aufs aktuelle Datum (vergrößerter
  Zustand) — für die **Datums-/Monatsnavigation**: **Wisch ←/→** wechselt im
  vergrößerten Zustand den Monat, **Wisch ↑/↓** öffnet Monatsauswahl bzw.
  Cloud-Speichern-Modal. **(Historie: früher zeigte der erste Tipp im
  vergrößerten Zustand „3 Monde" — `vormerken`/gold, `kategorien` „Budget"/blau,
  `einstellungen`/grau — zur Auswahl; ein Nutzer-Sohn fand das „zu verspielt".
  Entfernt, weil Budget/Einstellungen jetzt eigene Zeilen im Daten-Tab haben und
  Vormerken die mit Abstand häufigste Aktion ist — kein Zwischenschritt mehr
  nötig. Der `moonIn`-Keyframe in `theme/css/themes.css` blieb bewusst
  erhalten, falls ein ähnlicher „aufpoppender Kreis"-Effekt später für einen
  Tutorial-/Onboarding-Modus wiederverwendet wird.)**
  **Invariante zur Optik:** Der Knopf **muss** die Klasse `plus-master-btn`
  tragen — daran hängen die Theme-Regeln in `theme/css/themes.css` (runde Form
  in den eckigen Spezial-Themes, die Pixel-Kontur im Terminal-Theme) und die
  Feature-Tour findet ihn per `querySelector('.plus-master-btn')`. Sie stand
  einmal in einem **zweiten** `className`-Attribut daneben; in JSX gewinnt das
  letzte, die Klasse fiel ersatzlos weg. Im Terminal-Theme griff dadurch
  `button:not(.plus-master-btn) { background:transparent }` auf den Knopf
  selbst — er war unsichtbar. Neue Klassen deshalb **in dasselbe** `className`
  (Array + `filter(Boolean).join(" ")`). Doppelte Objekt-Schlüssel meldet der
  Build als Warnung; die Warnliste bitte leer halten, sonst geht der nächste
  echte Fall darin unter.
  **Wichtige Invariante:** JEDER Vollbild-Flow, der über den + geöffnet wird,
  **muss** beim Schließen (`onClose`, nicht `onBack`) `setPlusArretiert(false)`
  setzen — sonst bleibt der Button im vergrößerten Zustand hängen und der
  nächste Tipp wirkt scheinbar nicht (Symptom: „ich muss ständig
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
  Vollbild-Wizards, die den Override nutzen, brauchen entsprechend **viel
  Scroll-Reserve unten** (`calc(190px + safe-area-inset-bottom)` in
  `CloudSetupWizard`/`EnableBankingWizard`), weil der übernommene Knopf im
  Override-Zustand auf 1,5× skaliert und weit nach oben transformiert wird.
- **`MobileActionPicker`** („Mehr"-Menü, `showMobilePicker`) ist kein primärer
  „+"-Einstiegspunkt mehr — nur noch `onBack`-Ziel für Wiederkehrend/Zuordnen/
  Struktur-Screens (`reopenMobilePicker()`). Listet noch „Vormerkung",
  „zuordnen", „Kategorien & Budgets", „Desktop-Modal" (bewusst unverändert
  gelassen, außerhalb des Moon-Umbaus).
- **Drilldown-Muster**: state-basiertes Vollbild-Overlay, **immer Zurück-Pfeil links
  und X rechts**, Safe-Area-Header (`MobileHeader`), Suchfeld oben. Kein URL-Routing.
- **Budget-Kategorien in den Aufrissen** (Prognose Mitte/Ende, Buchungen, VM):
  **`molecules/BudgetBereich.jsx`** — ein Baustein für alle. Karte
  (`flaecheAbgesetzt()`, §4.1), Zeile 1 = Symbol · Name | „offen",
  Zeile 2 = Tag · „Budget:" | „genutzt:", darunter ein dünner Trennstrich und die
  Einzelposten als `children` — **eingeklappt**, ein Tipp auf die Kopfzeile
  fächert sie auf (Chevron + Anzahl neben dem Namen). Eine Kategorie mit acht
  Zahlungen schob sonst alles Weitere aus dem Bild.
  `seitenrand` steuert den Abstand zum Listenrand: in der Prognose 0 (der
  Einzug kommt vom Panel darum), in den Aufrissen 10 — ohne ihn laufen die
  Karten dort von Kante zu Kante. Die Posten bleiben bei den Aufrufern, weil sie
  sich berechtigt unterscheiden (Tag-Chips in der Prognose, Tipp-zum-Öffnen in
  den Aufrissen) — Kopf und Beträge sind dagegen überall identisch.
  Vorher hatte jeder Aufriss eine eigene Fassung (Prognose mit Datum + „offen",
  Buchungen mit 30px-Symbolkachel und nur der Summe, VM mit Verbrauchs-Pegel);
  jede Korrektur musste dreimal gemacht werden und lief entsprechend
  auseinander.
  Regeln, die dabei mehrfach falsch waren und es bleiben sollen:
  - **Der Kategoriename steht in normaler Textfarbe** (`T.txt`), nicht in der
    Budget-Farbe — die tragen Symbol und Beträge. Ausnahme: überschrittenes
    Budget (`T.neg`), das ist ein Warnzustand.
  - **Jede Liste zeigt nur ihre Seite**: unter „Buchungen" nur abgeschlossene
    Buchungen, unter „VM" nur Vormerkungen.
  - **`budget`/`genutzt` sind fertige Zahlen, kein Budget-Eintrag.** `genutzt`
    wird aus den TATSÄCHLICH gelisteten Posten gerechnet: die Listen sind
    konto-gefiltert, die Summenfelder des Eintrags (`realAmt`/`concAmt`) nicht
    — sonst passt der Kopf nicht zu den Zeilen darunter.
  - **Bezugsgröße muss zur Zeile passen.** In der Mitte-Ansicht steht nur der
    Mitte-Platzhalter, `budgetOpenRest` liefert den Rest **dieser Hälfte** —
    `be.budget` aus `dashDetailEnde.budgetEntries` ist dagegen immer das ganze
    Monatsbudget. Beides gemischt ergibt „genutzt = ganzes Budget − Rest der
    Hälfte" (`istMitteHaelfte` in `DashboardScreenV2`).
- **Buchungszeile in den Aufrissen** — **zwei** Zeilen, für jede Buchung gleich
  hoch; die verknüpfte Vormerkung kommt als dritte Zeile nur auf Wunsch dazu:

  ```
  Buchungsbeschreibung                        ⌄
  Tag.  Kategorie              🔗⌄       Betrag
  🔗 Beschreibung der Vormerkung   ← erst nach Tipp aufs Kettensymbol
  ```

  In Zeile 2 steht nur das **Kettensymbol** (`VormerkungSymbol`), ein Tipp
  darauf klappt die vollständige Beschreibung als letzte Zeile auf
  (`VormerkungZeile`, beide in `DashboardScreenV2`). Ohne verknüpfte
  Vormerkung fehlt das Symbol ganz — es ist damit zugleich der Hinweis darauf,
  dass eine existiert. Regeln, die dabei zählen:
  - **Die Beschreibung gehört nicht in Zeile 2.** Sie ist regelmäßig so lang
    wie der Buchungstext selbst („Fahrradhelm, 2er Lesebrille, Sonoff Zigbee
    Stick, …"). Dort schob sie den Betrag aus der Zeile, die Beträge standen
    untereinander auf verschiedenen Höhen und die Buchung zerfiel in vier
    gleich aussehende Fragmente.
  - **Aufgeklappt trägt der Text keine Chip-Fläche**, nur ein vorangestelltes
    Symbol. Als Fläche musste er umbrechen, und mehrere Zeilen eingefärbter
    Untergrund wirken unruhig.
  - **`stopPropagation` am Symbol ist Pflicht** — die ganze Zeile öffnet sonst
    den Bearbeiten-Dialog und der Tipp käme nie an.
  - **Mehrere Buchungen dürfen gleichzeitig offen sein** (`vmOffen` als Set,
    nicht als einzelne ID): beim Durchsehen einer Liste will man vergleichen,
    nicht jedes Mal die vorige verlieren.
  - Die kurzen `#Tags` bleiben in Zeile 2 — sie sind Merkmale der Buchung,
    keine zweite Beschreibung.
  - Tag und Text trennt überall `gap: 6`; die Datumsspalte hat **keine** feste
    Breite (`tagKurz` liefert immer zwei Ziffern und einen Punkt, eine feste
    Breite erzeugt daher nur Luft).
- **Prognose-Aufriss** (`SaldoPrognose`, aus dem Hero über MITTE/ENDE): Titel
  und Saldo teilen sich **eine** Zeile („Prognose Mitte" links, Betrag rechts),
  darunter ohne Abstand die kleinen Summen. Zwischen Hero-Ende und Aufriss
  liegt nur die Trennlinie, kein Abstand. Flächen und Trennlinien **aus dem
  Theme** — feste `rgba(0,0,0,…)`/`rgba(255,255,255,…)`-Schleier legten auf
  hellen Themes eine dunkle Platte in die helle Seite und waren dort als Linien
  unsichtbar.
- **Budget-Kategorien in `MonatScreen`**: die Restbudget-Zeile am 14./Monats-
  letzten ist **antippbar** und klappt ihre Einzelzahlungen auf (Chevron am
  Namen, immer nur eine Zeile offen). Vorgemerkt (goldene Uhr, gedämpft) und
  gebucht (Haken) sind unterscheidbar. Die Liste hing früher **nur** am
  Scroll-Fokus-Effekt — der ist standardmäßig aus, sie war damit praktisch nie
  erreichbar.
- **Vollbild-Screens** reservieren unten Platz für die fixe Nav-Bar:
  `calc(57px + env(safe-area-inset-bottom))`.
- **Sync-Hinweis** (`organisms/SyncStatusBadge`, Zustand aus
  `utils/syncBadge.js`): eine volle Zeile mit **48px Mindesthöhe** — dieselbe
  Trefferfläche wie alle anderen antippbaren Zeilen. Auf Screens **mit** Hero
  (Dashboard, Monat) rendert ihn **`SaldoHeroV2` selbst**, und zwar zwischen
  Hero und Prognose-Aufriss — der Aufriss gehört zum Hero, ein Banner im
  aufrufenden Screen landete deshalb unterhalb der ganzen Aufriss-Liste, sobald
  MITTE/ENDE angetippt war. Alle übrigen Screens bekommen ihn aus `App.jsx`
  oben unter der Notch; `--sync-badge-space`
  (an dem sich Vollbild-Dialoge für ihren Notch-Abstand orientieren) wird
  entsprechend nur für die Screens ohne Hero reserviert. Antippen öffnet
  `CloudSaveModal` (bzw. lädt bei `cloud_newer` nach Rückfrage).
  **Invariante:** `showCloudSave` wird an drei Stellen gesetzt (Tipp auf den
  Hinweis, Wisch ↓ am „+", Wechsel aus der Monatsauswahl) — das **Rendern von
  `<CloudSaveModal>`** in `App.jsx` muss dazu existieren. Es fiel einmal beim
  Aufräumen eines anderen Menüs mit weg; der Hinweis war danach ein Knopf ohne
  jede Wirkung, ohne dass irgendetwas gemeldet hätte.
- **Rückfragen kommen aus der App, nie vom System.** `window.confirm()` ist
  **verboten** — der Browser zeichnet ihn selbst, er sieht auf jeder Plattform
  anders aus, und im schmalen Firefox-Fenster ragte er sogar rechts aus dem
  Bild (Nutzer-Bild). Stattdessen `frageBestaetigung(frage, onJa, {jaLabel,
  ton})` aus dem Context → `organisms/BestaetigenDialog.jsx`. `ton:"gefahr"`
  färbt den Ja-Knopf in `T.neg` (Löschen, Überschreiben). Erste Zeile = Titel,
  ein Leerzeilen-Absatz danach = Erläuterung.
  Regeln, die dabei zählen:
  - **Der Rückgabewert wird zum Callback.** Aus `if(!confirm(x)) return; A;`
    wird `frageBestaetigung(x, () => { A; })` — und **alles**, was nach dem
    `return` stand, muss mit in den Callback, sonst läuft es auch beim
    Abbrechen. `tests/settingsInlineCloudLoad.test.js` prüft beide Hälften.
  - **Der Dialog liegt auf `zIndex: 2000`** (`Overlay`-Prop). Er wird fast immer
    aus einem offenen Dialog heraus geöffnet (Bearbeiten 80, Modale bis 1100);
    mit der Standard-Ebene 50 lag er dahinter und war unsichtbar — ein Tipp auf
    „Löschen" sah aus, als passiere nichts.
  - **Der Context-Standard ist eine leere Funktion**, kein fehlender Eintrag:
    außerhalb des Providers unterbleibt die Aktion, statt ohne Rückfrage zu
    laufen oder zu werfen.
  - Muss ein Ablauf auf die Antwort **warten** (der Startvorgang entscheidet
    daran, welcher Datenstand geladen wird), gibt es `frageBestaetigungAsync`
    in `App.jsx` — dasselbe Fenster, nur als Promise.
- **Einheitlicher Dialog-Header** (`atoms/MobileHeader.jsx`) — **verbindlich für
  alle 8 Daten-Tab-Dialoge** (CSV importieren, Bank verbinden, Daten-Manager,
  Cloud-Sync einrichten, Tankverbrauch, Konten, Budget, Einstellungen), damit
  sie „aus einem Guss" wirken: großer Titel (26px/700) = der Funktionsname
  **identisch zur zugehörigen Zeile im Daten-Tab**, darunter eine gut lesbare
  Unterzeile (13px, gedämpft) für Kontext/Status, links davon optional eine
  **Icon-Kachel** (Props `icon`/`iconColor`, 40px, `background:${farbe}1f`) —
  bewusst **dasselbe Icon + dieselbe Farbe wie die auslösende Zeile im
  Daten-Tab** (Wiedererkennung „Kachel angetippt → genau dieses Icon oben").
  Zuordnung: CSV importieren = `download`/`T.pos`, Bank verbinden = `landmark`/
  `T.gold`, Daten-Manager = `database`/`T.pos`, Cloud-Sync = `cloud`/
  `T.cf||T.blue`, Tankverbrauch = `fuel`/`T.gold`, Konten = `credit-card`/
  `T.blue`, Budget = `target`/`T.mid`, Einstellungen = `settings`/`T.txt2`.
  **Mehrstufige Assistenten** (`EnableBankingWizard`/`CloudSetupWizard`)
  zeigen als Titel den **festen Funktionsnamen** („Bank verbinden", nicht den
  wechselnden Schritt-Titel) und packen „Schritt X/Y · aktueller Schritt-Titel"
  in die Unterzeile — der Schritt-Titel wandert aus einer früheren, separaten
  Eyebrow-Zeile OBERHALB des Titels in die reguläre Unterzeile darunter, damit
  das Muster mit den anderen 6 Dialogen identisch bleibt. Assistenten
  brauchen zusätzlich zum Zurück-Pfeil (`onBack`, Schritt zurück) einen
  **expliziten Schließen-Button** (Assistent ganz verlassen) — dafür den
  bestehenden `right`-Slot nutzen (36px-Button im selben abgerundeten Stil wie
  der Header-eigene Button, nur kleiner/dezenter), **nicht** `MobileHeader`
  selbst um einen zweiten Button erweitern. Frühere bespoke Header-Varianten
  (Desktop-Icon-Badge in `DataManagerDialog`, Mobile-vs-Desktop-Split in
  `CsvImportScreen`, winzige 11px-Breadcrumb-Header für „Konten"/„Einstellungen"
  in `ManagementScreen`) sind entfernt — `MobileHeader` läuft jetzt
  **unabhängig von `mobileMode`/Viewport überall identisch**.
- **Nachschärfung nach Nutzer-Feedback zum einheitlichen Header** (Screenshots
  zeigten: Erklärtexte in CSV importieren zu winzig, Daten-Manager noch als
  Overlay-Karte statt Vollbild, Kontennamen zu klein, Einstellungen unstrukturiert):
  - **Erklärtext-Schriftgröße**: eigene Konstante `MFSd` (mobil ~15px, Desktop
    ~11px) in `CsvImportScreen.jsx`, analog zu `Box`/`Steps` in
    `EnableBankingWizard`/`CloudSetupWizard` (~14.5–15px) — für **Fließtext-
    Erklärungen** (Toggle-Beschreibungen, Hinweise unter Buttons), nicht für
    funktionale Mikro-Labels (Slider-Endbeschriftung, Tages-Chips).
  - `DataManagerDialog.jsx`s `wrap()` rendert jetzt **immer** Vollbild
    (`position:fixed;inset:0`) — die alte `mobileMode`-Verzweigung auf ein
    zentriertes Overlay-Karten-Modal ist entfernt, damit der Dialog nie mehr
    als schwebende Karte über gedimmtem Hintergrund erscheint.
  - Kontonamen in „Konten" (`ManagementScreen.jsx`) von 12px/600 auf 16px/700
    angehoben — passend zur größeren 26px-Kopfzeile.
  - **Einstellungen neu strukturiert** (`SettingsInline.jsx`): einheitlicher
    `SECTION`-Rahmen (`borderTop` + Abstand) und `SectionHeader`-Helper
    (Icon + Label, 12px/700) für jeden Block — Anzeige (Randlos + 3.-Spalte-
    Bezeichnung, vorher ohne jede Überschrift lose im Fließtext), Cloudflare
    Workers Sync, Budget-Platzhalter Wartung, Gefahrenzone (jetzt mit
    `alert-triangle`-Icon statt nacktem Text), Performance-Debug — statt einer
    unstrukturierten Mischung aus beschrifteten und unbeschrifteten Blöcken.

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
  Jede Zeile trägt rechts einen **Stern** = „beim Start dieses Konto zeigen"
  (`startKonto` im Context, `mbt_start_konto`). Das Startkonto steht zugleich
  **ganz oben** in der Liste, und `cycleAcc` nutzt dieselbe Liste — Schnellwahl
  und Durchtippen bleiben dadurch in derselben Reihenfolge. Ohne gesetztes
  Startkonto ist alles wie zuvor: Gesamt zuerst.
  Zwei Fallstricke: Der Stern braucht **`stopPropagation`** (sonst schaltet das
  Antippen zugleich die Auswahl um und schließt das Menü), und er nutzt bewusst
  `star` statt `pin` — nur Icons aus `lucideStatic.js` rendern sofort, alles
  andere bleibt leer, bis der große Lucide-Chunk nachgeladen ist. Ein
  gelöschtes Startkonto fängt eine `useEffect`-Sicherung in `App.jsx` ab und
  setzt still auf Gesamt zurück.
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

- **Farbiger Deko-Außenrand der Kinder-Themes** (`frame_border`/`frame_ring`):
  entfernt. Mit ihm fielen **alle** Sonderfälle weg, die es nur seinetwegen
  gab — Border + Innenring + `FRAME_RADIUS` am Hauptcontainer samt
  `translateZ(0)`, die Overlay-Kopie des Rahmens über dem Inhalt, der
  Notch-Sonderabstand (24px statt 14px), der Sonderfall der Bottom-Nav (Margin
  + Radius + Rundum-Rahmen statt schlichter Oberkante) und im Hero die
  `framePad`-Korrektur um die Rahmenbreite samt Clipping und
  Breiten-Deckelungen der Mitte-/Ende-Spalten. Hero und Hauptcontainer rechnen
  seither für alle Themes gleich.
- **Theme „Dark Hell (helleres Grau)"** (`darkhell`): entfernt. Seine Werte
  leben praktisch unverändert in `deepocean` weiter — das seinerseits inzwischen
  auf **dasselbe Anthrazit wie `dark`** umgestellt wurde (`#2C3035`), weil die
  hellere Fassung zu hell wirkte. Ein gespeichertes `"darkhell"` wird beim Start
  auf `"dark"` umgebogen (`App.jsx`); ohne das zeigte die App zwar Dark
  (`getTheme` fällt darauf zurück), in der Theme-Auswahl wäre aber nichts
  markiert gewesen.
- **Fremde Markennamen in den Theme-Namen**: ersetzt (§4.2). Nur `name`
  geändert, Schlüssel unverändert.
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
  von „Home · Monat · Buchungen · Jahr" über „Home · Trend · Monat · Optionen"
  auf die heutige Reihenfolge geändert (§5).
- **Bottom-Tab „Optionen"**: kurzlebig — durch **„Daten"** ersetzt (§5). Ein
  reiner Einstellungen-Tab war zu selten gebraucht für den wertvollsten
  Bottom-Bar-Platz; „Daten" (CSV/Bank/Cloud-Sync/Backup) ist es häufiger.
  Einstellungen sind seither über den dritten Mond bzw. ein Zahnrad im
  Daten-Screen erreichbar. Der dritte Mond hieß vorher `daten` — jetzt
  `einstellungen`, da Daten den eigenen Tab hat. Die dadurch verwaiste
  `MobileActionPicker`-„daten"-Unteransicht (samt `initialScreen`/
  `mobilePickerScreen`-Umweg) wurde mit entfernt.
- **Preset-Farbschema-Buttons** in den Einstellungen: entfernt.
  `SettingsInline`/`CustomThemeEditor` zeigen nur noch **selbst angelegte**
  Farbschemata (§4.3) — die fest verdrahteten `themes.js`-Themes (§4.2)
  bleiben als Themes bestehen, sind aber nicht mehr über eine Preset-Knopfreihe
  wählbar.
- **`EnableBankingGuide.jsx` + `EnableBankingConnectScreen.jsx`**: entfernt,
  ersetzt durch den vereinten **`EnableBankingWizard.jsx`** (§12). In
  `MobileActionPicker` gibt es entsprechend nur noch **einen** Eintrag „Bank
  verbinden" statt zweier getrennter Einträge „Anleitung"/„Bank-Konto
  verbinden"; `App.jsx` hält nur noch `showBankWizard` statt zweier
  Einzel-States.
- **Die „3 Monde"** (`MOONS`-Array, `activeMoon`/`moonsShown`-States, `openMoon()`):
  komplett entfernt (§5). Auslöser: ein Nutzer-Sohn fand die aufpoppenden
  Kreis-Buttons „zu verspielt". Einzel-Tipp auf den „+" öffnet jetzt **direkt**
  die Vormerken-Erfassung — die zwei verbliebenen Mond-Ziele „Budget"
  (`kategorien`) und „Einstellungen" sind als gleichwertige Zeilen in den
  Daten-Tab gewandert (`ManagementScreen.jsx`, `mgrTab==="daten"`). Der dabei
  ebenfalls entfernte, nie aufgerufene `doPlus()`-Handler (toter Code aus einer
  früheren Bottom-Tab-„+"-Variante) ging mit weg. Der `moonIn`-CSS-Keyframe
  (`theme/css/themes.css`) blieb — als möglicher Baustein für einen künftigen
  Tutorial-/Onboarding-Modus (Idee aus derselben Konversation, noch nicht
  umgesetzt).

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
- **Mehrere Fahrzeuge**: eigenes Top-Level-Array `vehicles`
  (`{id,name,plate?}` — `plate` = Kennzeichen, optional) — genau wie
  `accounts`/`cats` lokal persistiert (`useLocalSaveDebounce`),
  Cloud-synchronisiert (`saveConfig`/`applyData`) und über den Daten-Manager
  exportier-/importier-/löschbar. Anlage/Bearbeiten **inline** beim Erfassen
  (in allen vier Dialogen identisch): „+ neues Fahrzeug"-Chip öffnet ein
  Formular mit Name + Kennzeichen; ein Stift-Icon neben dem gerade
  **ausgewählten** Fahrzeug-Chip öffnet dasselbe Formular vorbefüllt zum
  Bearbeiten (`saveVehicle()`/`startEditVehicle()`, State `editingVehicleId`
  unterscheidet Neu- vs. Bearbeiten-Modus). Bewusst **kein** eigenes
  Löschen/keine dedizierte Verwaltungsseite (Scope-Entscheidung: der Nutzer
  wollte Mehrfahrzeug-**Unterstützung** mit editierbaren Stammdaten, kein
  volles CRUD-Tooling mit Liste/Löschen — Löschen bleibt über den
  Daten-Manager möglich, s. §11).
- **Erfassung**: Felder erscheinen **nur**, wenn Kategorie = „Tanken" **und**
  es sich um eine einmalige Ausgabe handelt (nicht bei Serie/Umbuchung) —
  `MobileVormerkenModal` Schritt 3 („Details") bzw. `EditPopup` direkt unter
  dem „aus Unvorhergesehenes"-Baustein. Liter × €/Liter wird live berechnet.
  **Der in Schritt 1 eingegebene Betrag wird NIE automatisch durch
  Liter × €/Liter ersetzt** — in der Praxis stimmen beide oft nicht exakt
  überein (Rundung an der Zapfsäule, Bar-/Gutschein-Anteil, mit-getankte
  Zusatzartikel …); ein früherer Versuch, den berechneten Betrag beim Tipp
  auf den Master-„+"-Knopf **still** zu übernehmen, hat genau das kaputt
  gemacht: ein korrekt eingegebener Betrag (z. B. 100 €) wurde lautlos
  durch das Rechenergebnis (z. B. 77,36 €) ersetzt. Stattdessen: bei
  spürbarer Abweichung (> 1 Cent) nur ein **Hinweis** (`MobileVormerkenModal`
  Schritt 3, gold, wie andere Warnungen), keine Datenänderung — der Nutzer
  entscheidet, ob er Schritt 1 manuell korrigiert. `VormerkungHub`/
  `AddTxModal` haben einen normalen sichtbaren „Speichern"-Button statt
  Master-Knopf-Navigation — dort bleibt ein **expliziter** (per Klick
  ausgelöster) „Betrag übernehmen"-Button unkritisch, weil der Nutzer die
  Übernahme selbst auslöst, statt dass sie beim Weiterschalten automatisch
  passiert. `EditPopup` bearbeitet einen bereits existierenden Betrag
  direkt (kein Sync-Button nötig). **Lehre:** ein aus Nutzerkomfort
  abgeleiteter Automatismus, der bestehende, korrekte Nutzerdaten ohne
  Bestätigung überschreibt, ist auch dann riskant, wenn er „meistens"
  passt — im Zweifel informieren statt automatisch verändern.
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
  Tankvorgänge eines Fahrzeugs nach km-Stand und berechnet je Tankvorgang
  (außer dem ersten — kein Vorgänger) zwei Kennzahlen aus derselben Distanz
  (`calcDistance`, Differenz der km-Stände zum vorherigen Tankvorgang):
  - **Verbrauch** (l/100 km, `calcConsumption`) = Menge des **späteren**
    Tankvorgangs / Distanz × 100,
  - **Kosten/km** (`calcCostPerKm`) = Menge × Preis/Liter des **späteren**
    Tankvorgangs / Distanz — rechnerisch identisch zu
    `Verbrauch/100 × Preis/Liter`, aber direkt aus den Rohwerten (robuster
    gegen Rundung).
  Beide nutzen die Menge/den Preis des SPÄTEREN Tankvorgangs, weil dieser
  die seit dem vorherigen Tanken gefahrene Strecke „wieder auffüllt".
  `screens/FuelAnalysisScreen.jsx` zeigt Ø-Kennzahlen, drei Balken-Charts
  (Verbrauch, Preis/Liter, Kosten/km — je Chart eine feste Magnitude-Farbe
  statt einer kategorialen Palette) und eine Liste aller Tankvorgänge —
  erreichbar über Bottom-Tab **Daten** → **Tankverbrauch**
  (`App.jsx`-State `showFuelAnalysis`). **SVG-Chart-Beschriftungen**: die
  `viewBox`-Einheiten entsprechen bei `width:100%` auf Mobile (Container
  ~320-380px) ungefähr CSS-Pixeln — `fontSize="7"` war dadurch faktisch
  ~7px und unlesbar; Wert-/Achsen-Labels in kleinen SVG-Charts brauchen
  mindestens `fontSize` 10-11 (siehe `barChart()`-Helper), nicht die aus
  Desktop-Charts gewohnten 7-8.
- **Plausibilitätsprüfung km-Stand** (`utils/fuel.js: checkOdometerPlausibility()`):
  warnt beim Erfassen/Bearbeiten vor typischen Zahlendrehern/fehlenden
  Ziffern (z. B. „13400" statt „134700"), **blockiert das Speichern aber
  nicht** (reine Warnung, wie `SchieflageVorwarnung`). Vergleicht NUR gegen
  Tankbuchungen desselben Fahrzeugs **vor/nach dem gewählten Datum** —
  NICHT gegen den globalen Höchststand —, sonst würde das nachträgliche
  Erfassen einer älteren Tankbuchung (legitim kleinerer km-Stand)
  fälschlich als Fehler gemeldet. Drei Fälle: `"lower"` (km-Stand unter
  einer früheren Buchung), `"higher"` (km-Stand über einer bereits
  erfassten späteren Buchung — chronologisch unmöglich), `"jump"`
  (Sprung > 3000 km seit der letzten Buchung — großzügige Schwelle, damit
  normale Tankfüllungen nicht triggern). In allen vier Erfassungs-/
  Bearbeiten-Dialogen verdrahtet, `excludeTxId` beim Bearbeiten nicht
  vergessen (sonst vergleicht die Buchung mit sich selbst).
  **Performance-Falle (bereits einmal passiert):** Die Funktion durchsucht
  ALLE Buchungen — **immer mit `useMemo` verdrahten** (Deps: die tatsächlich
  relevanten Werte wie `_showFuelFields, odometer, fuelVehicleId, date/
  startDate, txs`, NICHT `amount`/`desc`/etc.). In `VormerkungHub`/
  `AddTxModal` liegen Betrag-Feld und km-Stand-Feld auf **derselben Seite**
  (kein Schritt-Wechsel wie in `MobileVormerkenModal`) — ohne `useMemo`
  lief die Prüfung bei JEDEM Tastendruck in JEDEM Feld neu (auch beim
  Betrag tippen, sobald Fahrzeug+km-Stand schon gesetzt waren) und machte
  die Eingabe spürbar träge. In `EditPopup` zusätzlich zu beachten: `useMemo`
  ist ein Hook und muss — wie die Fahrzeug-Schnellanlage-States — **vor**
  dem `if(!editTx) return null;`-Frühausstieg stehen (`editTx` dort mit `?.`
  null-sicher lesen).

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
- **Kommentare in JSX**: `{/* … */}` funktioniert nur an **Kind-Positionen**.
  Direkt vor einem Element im Ausdruck (etwa hinter `cond && (`) oder in einer
  `return (`-Klammer gehört ein normales `//` — sonst liest der Parser ein
  Objekt-Literal und bricht ab.
- **Auslieferung**: Push auf `main` baut zwei unabhängige Wege — GitHub Pages
  (`.github/workflows/deploy.yml`, peaceiris → `gh-pages`) und **Cloudflare
  Pages** (`deploy-cloudflare.yml`, `wrangler pages deploy` per Direkt-Upload,
  scharf geschaltet über die Repo-Variable `CF_DEPLOY=true`). Anlass war ein
  mehrstündiger Ausfall des GitHub-eigenen Publish-Schritts, an dem von außen
  kein Hebel ansetzt: Der Build lag fertig im `gh-pages`-Branch und war
  trotzdem nicht erreichbar. Der Cloudflare-Weg baut **ohne** `--base`, weil
  die App dort im Wurzelverzeichnis liegt.
