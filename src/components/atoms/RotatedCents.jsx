// Betrag mit kleinen, um 90° nach links gedrehten Nachkommastellen.
//
// Braucht dadurch nur noch etwa die Breite einer einzelnen Ziffer statt der
// vollen ",XX" — gedacht für Stellen, an denen die Euro nach wie vor groß und
// vollständig lesbar bleiben sollen, der Platz aber knapp ist (Hero-Detail-
// zeilen, Tagessaldo in der Monatsliste). Die Rotation dreht Breite und Höhe:
// bei halber Schriftgröße wird die ROTIERTE Breite (= ursprüngliche Zeilenhöhe)
// entsprechend schmal.
//
// Zuerst im Hero entstanden (Nutzer-Wunsch für Buch./VM/unkat.-Beträge), von
// dort hierher gezogen, als die Monatsliste dieselbe Darstellung brauchte.
//
// Das umgebende Element sollte display:"inline-flex" + alignItems:"center"
// setzen, damit die gedrehte Einheit sauber auf der Grundlinie sitzt.

import React from "react";
import { fmt } from "../../utils/format.js";

const RotatedCents = ({ v, s }) => {
  const str = s != null ? s : fmt(v); // z.B. "3.109,42"
  const i = str.lastIndexOf(",");
  if (i === -1) return <>{str}</>;
  return (<>
    {str.slice(0, i)}
    <span style={{display:"inline-block",fontSize:"0.5em",lineHeight:1,
      transform:"rotate(-90deg)",transformOrigin:"center",verticalAlign:"middle"}}>
      {str.slice(i + 1)}
    </span>
  </>);
};

export { RotatedCents };
