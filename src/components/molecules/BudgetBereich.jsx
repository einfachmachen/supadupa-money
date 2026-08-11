// Eine Budget-Kategorie als abgesetzter Bereich — der gemeinsame Baustein für
// ALLE Aufrisse (Prognose Mitte/Ende, Buchungen, VM, unkategorisiert).
//
// Vorher hatte jeder Aufriss seine eigene Fassung: die Prognose zeigte Datum,
// Symbol, Name, „offen", darunter „Budget:" und „genutzt:"; der Buchungen-
// Aufriss stattdessen eine 30px-Symbolkachel und nur die Summe der Posten aus
// genau dieser Liste; die VM-Zeile wiederum einen Verbrauchs-Pegel mit
// „genutzt / Rest:". Drei Darstellungen für dieselbe Sache — und jede
// Korrektur musste dreimal gemacht werden (Nutzer-Wunsch: vereinheitlichen).
//
// Der Bereich rendert nur den KOPF (Karte, beide Zeilen, Trennstrich). Die
// Einzelposten kommen als children, weil die Listen dort berechtigt
// unterschiedlich sind: die Prognose zeigt Tag-Chips, die Aufrisse öffnen die
// Buchung per Tipp. Sie stehen eingeklappt hinter einem Tipp auf den
// Kategorienamen — die Anzahl neben dem Chevron sagt, wie viele es sind.
//
// Die children müssen ALLES enthalten, was in `genutzt` steckt. Sonst gibt es
// Kategorien, deren Kopf einen Verbrauch nennt, die sich aber nicht aufklappen
// lassen — genau so geschehen, als der Vormerkungs-Aufriss nur die
// Vormerkungen durchreichte, `genutzt` aber den gesamten Verbrauch zählte.
//
// WICHTIG für die Aufrufer: `budget` und `genutzt` werden als fertige Zahlen
// erwartet, nicht als Budget-Eintrag. In der Mitte-Ansicht gilt nur die
// HÄLFTE des Monatsbudgets, und die gefilterten Listen (Konto-Filter) ergeben
// andere Summen als die ungefilterten Felder des Eintrags. Beides hat schon
// einmal zu „genutzt"-Werten geführt, die nicht zu den Zeilen darunter passten.

import React, { useState } from "react";
import { theme as T, flaecheAbgesetzt } from "../../theme/activeTheme.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { tagKurz } from "../../utils/date.js";

// Dieselben Stufen wie in den Aufriss-Listen selbst.
const FS_TEXT = 15, FS_BETRAG = 17, FS_DETAIL = 12;

// `seitenrand`: Abstand der Karte zum linken/rechten Listenrand. In der
// Prognose kommt der Einzug schon vom Panel darum, dort bleibt er auf 0; die
// Aufrisse setzen ihn selbst, sonst laufen die Karten von Kante zu Kante und
// wirken neben den schmaleren Prognose-Karten unruhig (Nutzer-Hinweis).
function BudgetBereich({ datum, name, budget, genutzt, isInc = false, seitenrand = 0, children }) {
  // Die Einzelposten stehen erst nach einem Tipp auf den Kategorienamen — eine
  // Budget-Kategorie mit acht Zahlungen schob sonst alles Weitere aus dem Bild
  // (Nutzer-Wunsch). Der Kopf mit Budget, genutzt und offen bleibt immer da.
  const [offenAufgeklappt, setOffenAufgeklappt] = useState(false);
  const hatPosten = React.Children.count(children) > 0;
  const zeigePosten = hatPosten && offenAufgeklappt;
  const budgetAbs = Math.abs(budget || 0);
  const genutztAbs = Math.abs(genutzt || 0);
  const offen = budgetAbs - genutztAbs;
  const drueber = offen < 0;
  const vz = isInc ? "+" : "−";
  // Budget-Farbe: Einnahmen- vs. Ausgaben-Seite. Sie trägt das Symbol und die
  // Beträge — der NAME bleibt in normaler Textfarbe, sonst wirkt die ganze
  // Liste eingefärbt. Ausnahme ist das überschrittene Budget (Warnzustand).
  const farbe = isInc ? T.cell_inc : T.cell_exp;

  return (
    <div style={{ margin: `0 ${seitenrand}px 8px`, background: flaecheAbgesetzt(T.bg),
      borderRadius: 8, padding: "5px 0" }}>

      {/* Zeile 1: Symbol · Name | rechts „offen" bzw. die Überschreitung.
          Symbol und Name beginnen ganz links — die Tageszahl stand hier davor
          und schob beides ein, ohne dass sie in der Kopfzeile etwas beitrug
          (Nutzer-Wunsch). Sie steht jetzt eine Zeile tiefer vor „Budget:". */}
      <div onClick={hatPosten ? () => setOffenAufgeklappt(o => !o) : undefined}
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2,
          paddingLeft: 8, paddingRight: 8, cursor: hatPosten ? "pointer" : "default" }}>
        {Li(drueber ? "alert-triangle" : "target", 12, drueber ? T.neg : farbe)}
        <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 4,
          color: drueber ? T.neg : T.txt, fontSize: FS_TEXT, fontWeight: 700 }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap" }}>{name}</span>
          {/* Zeigt an, dass sich hier die Einzelposten auffaechern lassen —
              ohne den Hinweis bliebe die Aufklapp-Moeglichkeit unentdeckt. */}
          {hatPosten && (
            <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 2,
              color: T.txt2, fontSize: FS_DETAIL, fontWeight: 600 }}>
              {Li(zeigePosten ? "chevron-up" : "chevron-down", 12, T.txt2)}
              {!zeigePosten && React.Children.count(children)}
            </span>
          )}
        </span>
        {drueber ? (
          <span style={{ color: T.neg, fontSize: FS_DETAIL, fontWeight: 700,
            fontFamily: NUM_FONT, flexShrink: 0 }}>um {fmt(-offen)} drüber</span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, flexShrink: 0 }}>
            <span style={{ color: T.txt2, fontSize: FS_DETAIL }}>offen:</span>
            <span style={{ color: farbe, fontSize: FS_BETRAG, fontWeight: 700,
              fontFamily: NUM_FONT }}>{vz}{fmt(offen)}</span>
          </span>
        )}
      </div>

      {/* Zeile 2: Tageszahl · Budget links | genutzt rechts. Abstand zwischen
          Zahl und Text wie in den übrigen Zeilen der Aufrisse (gap 6). */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 6, marginBottom: 2, paddingLeft: 8, paddingRight: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
          <span style={{ color: T.txt2, fontSize: FS_DETAIL, flexShrink: 0,
            fontFamily: NUM_FONT }}>{tagKurz(datum)}</span>
          <span style={{ color: T.txt2, fontSize: FS_DETAIL }}>Budget: {vz}{fmt(budgetAbs)}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ color: T.txt2, fontSize: FS_DETAIL }}>genutzt:</span>
          <span style={{ color: genutztAbs === 0 ? T.txt2 : drueber ? T.neg : farbe,
            fontSize: FS_DETAIL, fontWeight: 700, fontFamily: NUM_FONT }}>
            {genutztAbs === 0 ? "—" : `${vz}${fmt(genutztAbs)}`}
          </span>
        </span>
      </div>

      {zeigePosten && (
        <>
          <div style={{ borderTop: `1px solid ${T.bd}`, margin: "2px 8px 4px" }} />
          <div style={{ paddingLeft: 8, paddingRight: 8 }}>{children}</div>
        </>
      )}
    </div>
  );
}

export { BudgetBereich };
