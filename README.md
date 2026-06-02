# MyBudgetTracker — modularisiert

Vollständige Modularisierung der ursprünglichen Single-File-PWA (24.454 Zeilen `index.html`) zu einer Vite-basierten React-App mit atomic design.

## Quick Start

```bash
# Mit npm
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm run build      # Production-Build → dist/
npm run preview    # Preview des Builds
npm test           # Vitest-Suite

# Mit bun (gleicher API)
bun install
bun run dev
bun run build
bun test
```

## Was passiert ist

- **Single-File-PWA mit Babel-Standalone-Transform** → **Vite + ES-Module**
- 1 `<script type="text/plain">` mit ~22.000 JSX-Zeilen → **86 Module** mit expliziten Imports
- `let T = THEMES.dark` (modul-globale mutable Variable, die bei jedem Render neu zugewiesen wurde) → **Proxy auf einen Holder** mit `setActiveTheme(name)` (semantisch identisch, aber ES-Module-konform)
- `window.IDB` (inline-Script im `<head>`) → **ES-Modul `state/persistence.js`** mit Legacy-Bridge für Code, der noch `window.IDB` erwartet
- `window.FinanzApp = function …` → **`export default function FinanzApp`**
- Inline-CSS (`<style>`-Blöcke) → **`theme/css/base.css`** und **`theme/css/themes.css`**

## Atomic-Design-Struktur

```
src/
├── main.jsx                ← Bootstrap (renders <FinanzApp/>)
├── App.jsx                 ← FinanzApp (Context-Provider, Routing)
│
├── state/
│   ├── AppContext.js       ← React-Context + Default-Werte
│   └── persistence.js      ← IndexedDB + localStorage-Migration
│
├── theme/
│   ├── themes.js           ← THEMES-Map (dark, light, ios, …)
│   ├── activeTheme.js      ← Proxy-Theme + setActiveTheme()
│   ├── palette.js          ← INP, PAL, getBC, gs
│   └── css/
│       ├── base.css        ← Reset, scrollbars, mobile-modal
│       └── themes.css      ← Brutalist / Terminal / Swiss / Clean
│
├── utils/
│   ├── constants.js        ← MONTHS_S/F, CUR_YEAR, CAT_COLORS, BASE_ROWS
│   ├── format.js           ← fmt, pn, uid, dayOf, drillSort
│   ├── search.js           ← normSearch, matchSearch, matchAmount
│   ├── date.js             ← isoAddMonths, parseGermanDate
│   ├── csv.js              ← parseCSV, parseGermanAmount
│   ├── tx.js               ← txFingerprint, extractVendor, …
│   ├── budgets.js          ← groupBudgetPairs
│   ├── yearData.js         ← makeYearData
│   └── icons.jsx           ← Li, ALL_LUCIDE_ICONS, BANK_SVGS, …
│
└── components/
    ├── ErrorBoundary.jsx
    ├── atoms/              ← Overlay, Lbl, PBtn, GBtn, MHead, SupaField,
    │                         SubNameField, SafeIcon
    ├── molecules/          ← MonthPicker, CatPicker, InlineCatSelect,
    │                         ColorPickerPopup, QuickBtnsBar, ChartBlock,
    │                         CategoryChart, ThemeDropdown, …
    ├── organisms/          ← SaldoHero2, SaldoPrognose, TagesgeldWidget,
    │                         PendingList, EditPopup, AddTxModal, Mobile*-Modale,
    │                         IconPickerDialog, BudgetEditorModal, …
    ├── screens/            ← DashboardScreen, TransactionsScreen, MonatScreen,
    │                         JahrScreen, ManagementScreen, SettingsInline,
    │                         CustomThemeEditor, LiveColorPicker,
    │                         RecurringDetectionScreen, VormerkungHub,
    │                         MatchingScreen, CsvImportScreen
    └── buttons/            ← RegenRulesButton, TypPruefButton,
                              SerienReparierenButton, KontostandImportButton,
                              NachkategorisierenButton
```

## Verifikation

- ✅ **`npm run build` läuft sauber durch** (929 kB minified / 239 kB gzipped, 0 Errors, 0 Warnings außer chunk-size-Hinweis)
- ✅ **`npm test` — 31 von 31 Tests grün** (format, search, date, csv, tx, theme-proxy, persistence)
- ✅ **Smoke-Test in jsdom**: App rendert HTML in `#root` ohne Crash

## Fixes auf dem Weg

Im Original gefunden und gepatcht (waren latente Bugs, die Babel-Standalone toleriert hat, esbuild aber nicht):

1. `handedness, setHandedness,` stand **zweimal** im AppCtx-Provider-Value (App.jsx ~Z. 2416)
2. `flexShrink:0` zweimal in einem Style-Objekt in `DashboardScreen`
3. `fontSize:S.fs+2` zweimal in `MobileVormerkenModal`

## Design-Entscheidungen

### `let T = ...` → Proxy

Das Original hatte auf Modul-Ebene `let T = THEMES.dark;` und schrieb in jedem Render `T = {...getTheme(themeName), themeName, _rev:themeRev};`. Alle Komponenten lasen dieses `T` über Closure. In ES-Modulen geht das nicht: Importe sind `const`-Bindings.

Lösung: `theme/activeTheme.js` exportiert einen **Proxy** auf einen mutablen Holder. Komponenten importieren `theme as T` und schreiben weiter `T.txt`, `T.bg` etc. — semantisch identisch. Beim Theme-Wechsel wird `setActiveTheme(name)` aufgerufen, das den Holder austauscht. Den Re-Render löst weiter der `themeRev`-State im Context aus.

### Bun-kompatibel

`package.json` nutzt nur npm-kompatible Standard-Felder. `bun install && bun run build` funktioniert identisch zu `npm install && npm run build`.

### Lucide via CDN

Wie im Original wird Lucide-Icons via CDN-Script-Tag in `index.html` geladen und als `window.LucideIcons` global gemacht. Das macht das Bundle kleiner und vermeidet 1500+ Icon-Komponenten im JS-Bundle. Wenn du es lokal bündeln willst:

```bash
npm install lucide-react
```

und in `utils/icons.jsx` `import * as LucideIcons from "lucide-react"` ersetzen.

## Bekannte Punkte

- **PWA-Icons**: `public/icon-192.png` fehlt (im Original-Upload nicht enthalten). Beliebige 192×192-PNG dort ablegen.
- **Service Worker** (`public/sw.js`) ist ein minimaler Pass-Through. Wenn Offline-Cache gewünscht: dort `caches`-Logik ergänzen.
- **Chunk-Size-Warnung**: Vite empfiehlt Code-Splitting für die ~930 kB. Da es eine PWA mit einem Single-Page-Flow ist, ist das weniger relevant — die Ladezeit nach dem ersten Besuch ist Service-Worker-Cache-basiert.

## Test-Coverage

Smoke-Tests decken die Logik-Kerne ab:

| Datei | Tests | Was |
|---|---|---|
| `tests/format.test.js`     | 9 | `fmt`, `pn`, `uid`, `dayOf`, `drillSort` |
| `tests/search.test.js`     | 7 | `normSearch`, `matchSearch`, `matchAmount` (Operator-Suche) |
| `tests/utils.test.js`      | 8 | `isoAddMonths`, `parseGermanDate`, `parseGermanAmount`, `parseCSV`, `txFingerprint` |
| `tests/theme.test.js`      | 4 | Proxy-Verhalten, alle Themes durchlaufen ohne Crash |
| `tests/persistence.test.js`| 3 | localStorage-Migration (entfernt `isLand`, schluckt Müll) |
