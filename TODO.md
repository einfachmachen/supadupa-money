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

## Sync / Performance

- [ ] **Delta-Sync statt Voll-State-Sync.** Aktuell wird bei jedem Speichern der
  komplette State serialisiert/übertragen. Die frühere Diff-Schleife
  (`changedTxIds`/`deletedTxIds`) wurde entfernt, weil sie befüllt aber nie
  gelesen wurde und bei 1500+ Buchungen Tipp-Lag verursachte
  (`src/App.jsx`, Kommentar „Diff txs … DEAKTIVIERT"). Ein echtes Delta-Sync
  (nur geänderte/gelöschte Buchungen übertragen) bleibt als Optimierung offen.
