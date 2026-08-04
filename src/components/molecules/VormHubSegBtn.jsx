// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { VormVerknuepfenPanel } from "../organisms/VormVerknuepfenPanel.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

// Typ-Schnellwahl im Vormerkungs-Dialog.
//
// minWidth:0 ist hier das Entscheidende: flex:1 allein macht die drei Knöpfe
// NICHT gleich breit, weil ein Flex-Element per Voreinstellung nicht unter
// seine Inhaltsbreite schrumpft. Das längste Wort gab damit die Breite vor und
// schob die Zeile über den Bildschirmrand (das dritte Wort war abgeschnitten).
// Auf sehr schmalen Geräten weicht zusätzlich die Beschriftung der nicht
// gewählten Knöpfe dem Symbol (s. .vh-seg-label-inactive in base.css).
function VormHubSegBtn({v,l,icon,cur,set,clearCount,clearEnd}) {
  const aktiv = cur===v;
  return (
    <button onClick={()=>{set(v);clearCount();clearEnd();}}
      style={{flex:1,minWidth:0,padding:"14px 6px",borderRadius:14,border:"none",cursor:"pointer",
        fontFamily:"inherit",fontSize:20,"--btn-fs":"20px",fontWeight:aktiv?700:400,
        background:aktiv?T.gold:"transparent",
        color:aktiv?T.on_accent:T.txt2,transition:"all 0.15s",
        display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
      <span style={{display:"flex",flexShrink:0}}>{Li(icon,18,aktiv?T.on_accent:T.txt2)}</span>
      <span className={aktiv?undefined:"vh-seg-label-inactive"}
        style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l}</span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════
// VormerkungHub — Zentraler Dialog für alle Vormerkungstypen
// ══════════════════════════════════════════════════════════════════════
// ── VormVerknuepfenPanel: Vormerkung → Buchung zuordnen (in VormerkungHub) ──

export { VormHubSegBtn };
