# ToDo / Backlog

Kurze, umsetzbare Liste offener Punkte. Format: `- [ ] Titel — Kontext/Akzeptanz.`

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
