// Auto-generated module (siehe app-src.jsx)
//
// Einheitlicher Header für alle Mobile-UI-Vollbild-Screens (erreichbar über das
// "Mehr"-Menü). Garantiert, dass der Button oben links IMMER an derselben
// Position sitzt und die Ränder (links/oben/unten) identisch sind — egal ob
// X (schließen) oder ← (zurück) angezeigt wird.
//
// Props:
//   title      – Überschrift (großer Funktionsname, z.B. "Bank verbinden")
//   subtitle   – optionale Unterzeile (String oder Node, z.B. Schritt-Zähler/Kontext)
//   icon       – optionaler Lucide-Icon-Name; rendert eine farbige Icon-Kachel
//                links neben Titel/Unterzeile (dieselbe Farbe/Icon wie die
//                zugehörige Zeile im Daten-Tab — Wiedererkennung "Kachel → Dialog")
//   iconColor  – Farbe für Icon + Kachel-Hintergrund (Default T.blue)
//   onBack     – falls gesetzt: Button zeigt ← und ruft onBack (eine Ebene zurück)
//   onClose    – Fallback-Aktion; wenn onBack fehlt, zeigt der Button × und ruft onClose
//   titleColor – optionale Titelfarbe (Default T.txt)
//   right      – optionaler Node rechts im Header (z.B. Monats-Picker, ein
//                zusätzlicher expliziter Schließen-Button bei Assistenten mit
//                Zurück UND Schließen gleichzeitig — s. EnableBankingWizard/
//                CloudSetupWizard)
//   safeAreaTop – Default true, reserviert env(safe-area-inset-top) im eigenen
//                Padding. NUR auf false setzen, wenn der Screen NICHT
//                position:fixed/Vollbild ist, sondern inline innerhalb der
//                App-Content-Fläche rendert — die hat bereits ihr eigenes
//                paddingTop:env(safe-area-inset-top) (App.jsx-Wurzel-Div).
//                Sonst wird die Notch-Aussparung doppelt gerechnet und der
//                Header rutscht mit unnötig großem Abstand nach unten (z.B.
//                „Konten"/„Einstellungen" in ManagementScreen, die inline im
//                struktur-Tab sitzen statt als eigener Vollbild-Screen).

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

// Feste Maße — bewusst als Konstanten, damit alle Screens pixelgleich sind.
const H_PAD_V = 12;   // oben/unten
const H_PAD_H = 16;   // links/rechts
const BTN     = 44;   // Button-Kantenlänge
const BTN_R   = 14;   // Button-Radius
const ICON_SZ = 40;   // Icon-Kachel-Kantenlänge
const FS_TITLE = 26;  // Titel-Schriftgröße
const FS_SUB   = 13;  // Unterzeilen-Schriftgröße

function MobileHeader({ title, subtitle, icon, iconColor, onBack, onClose, titleColor, right, safeAreaTop=true }) {
  const isBack = typeof onBack === "function";
  const handler = isBack ? onBack : onClose;
  const iCol = iconColor || T.blue;
  return (
    <div style={{background:T.surf, borderBottom:`1px solid ${T.bd}`,
      padding:`calc(${H_PAD_V}px + ${safeAreaTop ? "env(safe-area-inset-top, 0px)" : "0px"}) ${H_PAD_H}px ${H_PAD_V}px`,
      display:"flex", alignItems:"center", gap:12, flexShrink:0}}>
      <button onClick={handler} aria-label={isBack ? "Zurück" : "Schließen"}
        style={{background:"rgba(255,255,255,0.08)", border:"none", color:T.txt2,
          width:BTN, height:BTN, borderRadius:BTN_R, cursor:"pointer", fontSize:20,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          padding:0, fontFamily:"inherit"}}>
        {isBack ? Li("arrow-left", 22, T.txt) : "✕"}
      </button>
      {icon && (
        <div style={{width:ICON_SZ, height:ICON_SZ, borderRadius:12, flexShrink:0,
          background:`${iCol}1f`, display:"flex", alignItems:"center", justifyContent:"center"}}>
          {Li(icon, 20, iCol)}
        </div>
      )}
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
