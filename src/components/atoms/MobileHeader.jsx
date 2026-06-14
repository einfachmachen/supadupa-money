// Auto-generated module (siehe app-src.jsx)
//
// Einheitlicher Header für alle Mobile-UI-Vollbild-Screens (erreichbar über das
// "Mehr"-Menü). Garantiert, dass der Button oben links IMMER an derselben
// Position sitzt und die Ränder (links/oben/unten) identisch sind — egal ob
// X (schließen) oder ← (zurück) angezeigt wird.
//
// Props:
//   title      – Überschrift
//   subtitle   – optionale Unterzeile (String oder Node, z.B. Step-Badge)
//   onBack     – falls gesetzt: Button zeigt ← und ruft onBack (eine Ebene zurück)
//   onClose    – Fallback-Aktion; wenn onBack fehlt, zeigt der Button × und ruft onClose
//   titleColor – optionale Titelfarbe (Default T.txt)
//   right      – optionaler Node rechts im Header (z.B. Monats-Picker)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

// Feste Maße — bewusst als Konstanten, damit alle Screens pixelgleich sind.
const H_PAD_V = 12;   // oben/unten
const H_PAD_H = 16;   // links/rechts
const BTN     = 44;   // Button-Kantenlänge
const BTN_R   = 14;   // Button-Radius
const FS_TITLE = 26;  // Titel-Schriftgröße
const FS_SUB   = 13;  // Unterzeilen-Schriftgröße

function MobileHeader({ title, subtitle, onBack, onClose, titleColor, right }) {
  const isBack = typeof onBack === "function";
  const handler = isBack ? onBack : onClose;
  return (
    <div style={{background:T.surf, borderBottom:`1px solid ${T.bd}`,
      padding:`calc(${H_PAD_V}px + env(safe-area-inset-top, 0px)) ${H_PAD_H}px ${H_PAD_V}px`,
      display:"flex", alignItems:"center", gap:12, flexShrink:0}}>
      <button onClick={handler} aria-label={isBack ? "Zurück" : "Schließen"}
        style={{background:"rgba(255,255,255,0.08)", border:"none", color:T.txt2,
          width:BTN, height:BTN, borderRadius:BTN_R, cursor:"pointer", fontSize:20,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          padding:0, fontFamily:"inherit"}}>
        {isBack ? Li("arrow-left", 22, T.txt) : "✕"}
      </button>
      <div style={{flex:1, minWidth:0}}>
        <div style={{color:titleColor||T.txt, fontSize:FS_TITLE, fontWeight:700,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{title}</div>
        {subtitle!=null && subtitle!=="" &&
          <div style={{color:T.txt2, fontSize:FS_SUB, marginTop:2,
            display:"flex", alignItems:"center", gap:8}}>{subtitle}</div>}
      </div>
      {right!=null && <div style={{flexShrink:0}}>{right}</div>}
    </div>
  );
}

export { MobileHeader };
