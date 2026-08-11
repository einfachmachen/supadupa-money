// Beträge in der ANZEIGE — mit optional gedrehten Nachkommastellen.
//
// `betrag(v)` ist der Ersatz für `fmt(v)` überall dort, wo ein Betrag direkt
// gerendert wird. Ist die Option aus (Standard), liefert es exakt denselben
// String wie `fmt` — die Anzeige ist Zeichen für Zeichen unverändert. Ist sie
// an, kommen die Cent klein und um 90° gedreht (siehe RotatedCents), wie es
// Hero und Monatsliste ohnehin schon fest tun.
//
// WICHTIG: bei aktiver Option gibt `betrag` ein React-Element zurück, keinen
// String. Es gehört deshalb ausschliesslich in JSX-Kindposition — NICHT in
// Template-Literals, Attribute, `alert()`/Toast-Texte oder Exporte. Dafür
// bleibt `fmt` aus utils/format.js zuständig; ein Test wacht darüber
// (tests/betragOption.test.js).
//
// Das Flag liegt bewusst im Modul und nicht im Context: `betrag` wird an über
// hundert Stellen aufgerufen, die dafür alle einen Context-Zugriff bräuchten.
// App.jsx setzt es beim Rendern aus dem persistierten Zustand — die Kinder
// rendern danach, sehen also immer den aktuellen Wert.

import React from "react";
import { fmt } from "./format.js";
import { RotatedCents } from "../components/atoms/RotatedCents.jsx";

let _gedreht = false;

const setCentsGedreht = (v) => { _gedreht = !!v; };
const centsGedreht = () => _gedreht;

const betrag = (v) => _gedreht
  ? React.createElement(RotatedCents, { s: fmt(v) })
  : fmt(v);

// Für bereits fertig formatierte Betragstexte — etwa die um „,00" gekürzten
// Kategorie-Summen (`fmtShort`/`fmtK`). Ohne Komma gibt es nichts zu drehen,
// dann bleibt es beim String; das spart ein Element ohne jede Wirkung und
// hält den Rückgabetyp vorhersagbar.
const betragText = (s) => (_gedreht && String(s).includes(","))
  ? React.createElement(RotatedCents, { s })
  : s;

export { betrag, betragText, setCentsGedreht, centsGedreht };
