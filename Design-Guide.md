# Design-Guide — SupaDupa Money

> Stand: 2026-06 · Abgeleitet aus dem aktuellen Code (`new/src`). Diese Datei
> beschreibt das gelebte Design-System der App, nicht einen Wunschzustand.
> Bei Abweichungen gilt der Code — bitte diesen Guide bei Änderungen mitpflegen.

---

## 1. Grundprinzipien

- **Local-first PWA**: React + Vite, Daten liegen lokal (IndexedDB via `kvStore`).
  Kein Backend, kein Tracking. Import primär über **CSV**; echter Kontoabruf
  (FinTS/PSD2) ist als spätere Option vorgemerkt, aktuell nicht implementiert.
- **Mobile-first**: Layout ist auf schmale Hochkant-Screens (iPhone 13 mini als
  Referenz) optimiert; alles skaliert nach oben.
- **Inline-Styles statt CSS-Klassen**: Komponenten stylen über `style={{…}}` mit
  **Theme-Tokens** (`T.*`). Globales CSS gibt es nur für Grundlagen
  (`theme/css/base.css`) und themenspezifische Sonderfälle (`theme/css/themes.css`).
- **Ein Quell der Wahrheit für Geld-Logik**: Salden/Prognosen kommen aus
  `utils/saldo.js`, Formatierung aus `utils/format.js`, Budget-Helfer aus
  `utils/budgets.js`. UI rechnet nicht selbst „nebenher".

---

## 2. Wo liegt was

| Bereich | Ort |
|---|---|
| Theme-Definitionen (Farb-Token je Theme) | `new/src/theme/themes.js` |
| Aktives Theme / Umschaltung | `new/src/theme/activeTheme.js`, Context `AppCtx` |
| Globale CSS-Grundlagen (Font-Face, Reset, Fett-Regeln) | `new/src/theme/css/base.css` |
| Themenspezifisches CSS (z. B. Terminal) | `new/src/theme/css/themes.css` |
| Gebündelte Schrift (Beträge) | `new/src/theme/fonts/questrial-latin-400.woff2` |
| Formatierung + Schrift-Konstante | `new/src/utils/format.js` (`fmt`, `NUM_FONT`) |
| Icons | `new/src/utils/icons.jsx` (`Li(...)`, Bank-Logos) |
| Home (Standard-Variante v2) | `new/src/components/screens/DashboardScreenV2.jsx` |
| Home (Alt-Variante v1) | `new/src/components/screens/DashboardScreen.jsx` |
| Hero (Konto + Mitte/Ende) | inline in den Dashboards; separat `organisms/SaldoHero2.jsx` |
| Monat / Buchungen / Jahr | `screens/MonatScreen.jsx`, `TransactionsScreen.jsx`, `JahrScreen.jsx` |

---

## 3. Typografie

### 3.1 Zwei Schriftwelten
- **Geldbeträge** → **Questrial** (selbst gehostet, geometrische Sans im
  Century-Gothic-Stil). Zentral als `NUM_FONT` in `utils/format.js`:
  ```
  "Questrial","Century Gothic","Futura","Avenir Next",system-ui,sans-serif
  ```
  Questrial ist als `@font-face` in `base.css` eingebunden und als **Modul-Asset**
  gebündelt → systemübergreifend identisch (iOS/iPadOS/macOS/Linux/Windows),
  unabhängig von installierten Systemschriften. Die Fallbacks greifen nur für die
  kurze Ladephase beim Erstaufruf.
- **UI-Text** (Labels, Buttons, Listen) → System-Sans
  (`-apple-system, BlinkMacSystemFont, "SF Pro Text", …`).

### 3.2 Fett-Regel (wichtig!)
- **Alle Texte sind regulär.** Global in `base.css`:
  `*{ font-weight:400 !important; font-synthesis:none; }`
  → jede Inline-`fontWeight:700` läuft ins Leere (auch faux-bold ist aus).
- **Einzige Ausnahme**: Klasse **`.heroAmt`** für **Kontostand, Mitte- und
  Ende-Betrag im Hero**:
  `.heroAmt{ font-weight:700 !important; font-synthesis:weight; }`
  (Questrial hat nur Schnitt 400 → das Hero-Fett ist synthetisch, per
  `font-synthesis:weight` an genau diesen Stellen erlaubt.)
- **Konsequenz für neue Beträge**: Inline-`fontWeight` ist wirkungslos. Soll ein
  Betrag fett sein, braucht das Element `className="heroAmt"` (bewusst nur für die
  drei Hero-Werte gedacht).

### 3.3 Geldformatierung
- `fmt(v)` → de-DE, **immer 2 Nachkommastellen**, **Betrag ohne Vorzeichen**
  (Absolutwert). Das Vorzeichen wird separat gesetzt.
- **Minuszeichen** ist das typografische `−` (U+2212), nicht der Bindestrich.
- **Euro-Symbol** nur am großen Hero-Kontostand (`… €`); in Listen/Pillen ohne `€`.
- Für tabellarische Ausrichtung `fontVariantNumeric:"tabular-nums"` setzen.

---

## 4. Farben & Theming

### 4.1 Tokens statt Hex
Niemals Farben hart kodieren — immer ein Theme-Token aus `T.*` verwenden.
Die wichtigsten:

| Token | Bedeutung |
|---|---|
| `T.bg` | App-Hintergrund |
| `T.surf`, `T.surf2`, `T.surf3` | Flächen/Karten (steigende Tiefe) |
| `T.txt`, `T.txt2`, `T.lbl` | Text primär / sekundär / tertiär |
| `T.bd`, `T.bds` | Border schwach / stärker |
| `T.pos` | Einnahmen / positiv (Default: Lime `#AACC00`) |
| `T.neg` | Ausgaben / negativ (`#EA4025`) |
| `T.gold` | Vormerkungen / Budget / Warnakzent (`#F5A623`) |
| `T.blue` | Primär-Akzent (im Default-Theme = Lime, **nicht** wörtlich blau) |
| `T.mid` | „Mitte"-Label-Farbe |
| `T.on_accent` | Textfarbe auf Akzentflächen |
| `T.err`, `T.warn` | Fehler / Warnung |
| `T.cond_neg/_warn/_gold/_pos` | Saldo-Ampel des Hero-Kontostands |

> Hinweis: `T.blue` ist historisch benannt; es ist der **Primärakzent** des Themes
> (im Standard-Theme die Lime-Marke). Nicht von der Bezeichnung täuschen lassen.

### 4.2 Verfügbare Themes
Definiert in `themes.js`: `dark` (Default „Dove Sport"), `light`, `firetv`,
`xbox`, `disneyplus`, `netflix`, `magenta`, `ios`, `material`, `paper`,
`dkb`, `obsidian`, `sand`, `clean`, `brutalist`, `terminal`, `swiss`, `keyboard`.
Jedes Theme definiert denselben Token-Satz. `T.themeName` erlaubt
Sonderfall-Logik (mehrere Komponenten behandeln „helle" Themes
`light/ios/material/paper/dkb/sand/clean/brutalist/swiss` gesondert).

### 4.3 Eine Farbe ändern — der sichere Weg
Der frühere **Live-Color-Picker (das schwebende Stift-Symbol) wurde entfernt** —
er war zu unsicher, weil mehrere UI-Stellen denselben Token teilen und sich
Farben ungewollt mitänderten. Ab jetzt gilt:

1. **Token identifizieren**, der die Stelle färbt (im Code an `T.xyz` ablesbar).
2. Den Wert in `themes.js` für das/die betroffene(n) Theme(s) ändern.
3. Bewusst sein: **Ein Token wirkt überall**, wo er verwendet wird. Soll nur EINE
   Stelle anders sein, braucht es zuerst einen **neuen, eigenen Token** — nicht
   einen bestehenden „umbiegen".

(Ein formularbasierter Theme-Editor existiert noch in den Einstellungen —
`CustomThemeEditor` —, ist aber vom entfernten Live-Picker unabhängig.)

### 4.4 Budget-Ampel (6-stufig)
Für Budget-Auslastung wird eine 6-Stufen-Skala genutzt (Verbrauch/Budget):
≤25 % / ≤50 % hellgrün–grün, ≤75 % gelb, ≤100 % orange, ≤125 % hellrot, >125 % rot.
**Wichtig:** Die Ampel färbt nach **tatsächlichem Verbrauch (Ist)**, nicht nach dem
reservierten Prognosewert (siehe `valuePill(..., {colorVal})` in V2).

---

## 5. Layout & Navigation

- **Bottom-Tabbar**: Home · Monat · Buchungen · Jahr. Mittig der runde
  **Monats-Button** („WISCHEN", Monat per Wisch/Tipp wechseln).
- **Hero** (oben): großer **Kontostand** (GIRO), darunter **MITTE** und **ENDE**
  (Prognosewerte), mittig ein Chevron-Toggle für Buch./VM/unkat.-Detailzeilen.
  Nur diese drei Beträge sind fett (`.heroAmt`).
- **Drilldown-Muster**: state-basiertes Vollbild-Overlay (`dashDrill`), **immer mit
  Zurück-Pfeil links und X rechts**, Suchfeld oben. Kein URL-Routing — Sichtbarkeit
  über State.

---

## 6. Home / Dashboard

- Zwei Varianten via Flag `mbt_dashboard_variant` (`"v1"` default, `"v2"` = die
  „clean" Variante der Screenshots). **V2 ist die gepflegte Ziel-Variante.**
- **Kategorie-Karten (V2)**: Zeile 1 = Icon + Name (Klick = **inline aufklappen**)
  + großer **aktuell**-Betrag (Klick = Buchungs-Drilldown). Zeile 2 = **Mitte/Ende**-
  Pillen (sichtbar bei globalem Toggle **oder** wenn die Zeile aufgeklappt ist).
- **Inline-Unterkategorien**: Beim Aufklappen erscheinen die Subs im selben
  2-Zeilen-Format (Name + aktuell, darunter Mitte/Ende). Jede Zelle (aktuell/
  Mitte/Ende) öffnet direkt den **Buchungs-Drilldown** des jeweiligen Zeitraums.
  Es gibt **kein** Zwischen-Modal mit Unterkategorien mehr.
- **Kein Ausklapp-Chevron** vor den Kategorien — der Name-Klick genügt.

---

## 7. Geld-Semantik (für korrekte Anzeige unverzichtbar)

- **Mitte** = kumuliert bis **Tag 14**; **Ende** = bis **Monatsletzter**;
  **aktuell** = real gebuchter Ist-Stand (ohne Reservierung).
- **Budget-bewusste Prognose** (Kategorie & Sub):
  - `Mitte = Ist(1..14) + restMitte`, `Ende = Ist(1..Ende) + restEnde`
  - mit `restMitte = Σ max(0, refMitte − Ist14)`,
    `restEnde = Σ max(0, Gesamtbudget − IstGesamt)` je Unterkategorie
  - identisch zu `restMitte`/`restEnde` in `utils/saldo.js` (gleiche Quelle wie der
    Hero), nur per Kategorie aggregiert.
  - Gilt nur auf **Giro/Gesamt** und nur solange die Phase **erreichbar** ist.
- **Budget-Platzhalter** sind Vormerkungen mit `_budgetSubId` (`…_mitte` für die
  erste Hälfte, ohne Suffix für Ende/Gesamt). Ihr `totalAmount` = volles
  Phasenbudget; das offene Restbudget wird dynamisch berechnet
  (`utils/budgets.js: budgetOpenRestFor`).
- **`budgetPlaceholderActive(tx)`** entscheidet, ob ein freigegebenes Restbudget
  noch zählt. Sobald die Phase (14. bzw. Monatsende) vorbei ist, **fällt der
  Platzhalter überall weg** — Offene Vormerkungen, Badge, Hero-VM, Monat,
  Buchungen, Kategorie-Mitte/Ende. Neue VM-/Budget-Anzeigen müssen diesen Filter
  anwenden.
- **Saldo-Quelle**: `saldoAt(year, month, day, accId, ctx)` bzw.
  `saldoMitte`/`saldoEnde`. Keine parallelen Eigenberechnungen in der UI.

---

## 8. Icons & Bilder

- Icons über `Li(name, size, color)` aus `utils/icons.jsx` (Lucide-Stil,
  `stroke=currentColor`/übergebene Farbe). Größen typ. 13–28 px.
- Bank-Logos als Inline-SVG in `utils/icons.jsx` (DKB, ING, Sparkasse, …) mit
  `currentColor`.

---

## 9. Wiederkehrende Komponenten-Muster

- **Pille/Zelle für Beträge** (`valuePill` in V2): gleichbreite Fläche (`flex:1`),
  zentriert, optionaler Ampel-Strich an der Unterkante, klickbar nur wenn Wert > 0.
  Farbe nach Verbrauch (`colorVal`), Anzeige = (ggf. reservierter) Wert.
- **Drilldown-Header**: Zurück-Pfeil · Icon · Titel · Anzahl Buchungen + Summe · X.
- **Vorzeichen-Konvention**: Einnahmen `T.pos`, Ausgaben `T.neg`, Vormerkungen
  `T.gold`; reine Vormerkung (kein Ist) → goldener Wert.

---

## 10. Entfernt / Deprecated

- **Live-Color-Picker** (schwebendes Stift-Symbol, Antippen-zum-Färben):
  **komplett entfernt** inkl. globalem Klick-Interceptor. Farbänderungen laufen
  jetzt gezielt über `themes.js` (siehe 4.3).

---

## 11. Performance (Konventionen + bekannte Hotspots)

Die App hält bis zu 10.000+ Buchungen im Context. Daraus folgen verbindliche Regeln:

- **Lange Listen deckeln/virtualisieren.** Nie tausende Zeilen direkt rendern.
  `TransactionsScreen` rendert nur die ersten `PAGE` (80) Treffer + „mehr
  anzeigen" (Auswahl/Zähler laufen über die volle Liste). Gilt analog für künftige
  große Listen.
- **Teure Aggregationen in `useMemo`** mit minimalen Deps (i. d. R.
  `[txs, year, month, selAcc]`). Pro-Kategorie/Sub-Summen einmal als Map bauen
  (`_catTxMaps`), nicht je Zeile neu filtern.
- **Kein O(txs) pro Zeile.** Innerhalb von `.map()` über Kategorien/Tage/Zeilen
  keine `txs.filter/find/some` (sonst O(Zeilen × txs)). Stattdessen vorindizierte
  Map nutzen.
- **Datumsvergleich per ISO-String statt `new Date()`** in heißen Schleifen:
  `t.date.slice(0,7)===\`${y}-${mm}\`` bzw. `t.date.localeCompare(b.date)` zum
  Sortieren. `new Date(t.date)` in Filtern über alle txs ist teuer (und
  zeitzonenanfällig).
- **Zentrale Helfer statt Eigenrechnung:** Salden über `utils/saldo.js`, Summen
  über vorhandene Maps; nicht in der UI duplizieren.

**Noch offene Beschleunigungspotenziale (Stand 2026-06, priorisiert):**
1. `AppCtx.Provider value={cx}` ist ein **frisches Objekt pro Render** und kein
   Screen ist `React.memo` → bei jeder Interaktion rendert nahezu der ganze Baum.
   Größter Hebel; erfordert `useMemo` für `cx` **und** `React.memo` auf den Screens
   zusammen (sonst wirkungslos). Sorgfältig + testen.
2. `MonatScreen` rendert alle Tage/Buchungen eines Monats ohne Windowing; pro
   Tages-Header laufen `txs.filter` mit `new Date` → ISO-Vergleich + Vorgruppierung.
3. Restliche `new Date()`-Schleifen (DashboardScreen v1, Budget-Helfer) auf
   ISO-String-Ops umstellen.

## 12. Konventionen

- **UI-Sprache: Deutsch.** Code/Token/Props in Englisch.
- Viele Dateien tragen den Kopf „Auto-generated module" — sie werden **direkt**
  gepflegt (kein aktiver Generator mehr); Änderungen erfolgen in `new/src`.
- Vor jeder visuellen Änderung prüfen, ob ein **Token** oder eine **zentrale
  Konstante** (`NUM_FONT`, `fmt`, Saldo-Helfer) der richtige Hebel ist, statt
  Werte lokal zu duplizieren.
