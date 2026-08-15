// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T, isLightTheme } from "../../theme/activeTheme.js";

// `zIndex` nur setzen, wenn die Ebene ueber anderen Dialogen liegen muss —
// die Rueckfrage (BestaetigenDialog) wird aus offenen Modalen heraus geoeffnet
// und laege mit der Standard-50 dahinter. Sie war dann unsichtbar, und ein
// Tipp auf "Löschen" sah aus, als passiere nichts.
const Overlay = ({onClose,children,zIndex=50}) => (
  <div onClick={onClose} style={{position:"fixed",inset:0,
    background:(isLightTheme())?"rgba(0,0,0,0.45)":"rgba(0,0,0,0.78)",
    backdropFilter:"blur(12px)",zIndex,display:"flex",alignItems:"flex-start",justifyContent:"center",
    // Der Karteninhalt beginnt oben — ohne die Notch-Aussparung liegt seine
    // Ueberschrift auf Geraeten mit Statusleisten-Aussparung darunter.
    padding:"16px",paddingTop:"calc(20px + env(safe-area-inset-top, 0px))",
    paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))",overflowY:"auto"}}>
    <div onClick={e=>e.stopPropagation()} style={{
      background:(isLightTheme())?"#F5F7F2":T.surf2,
      borderRadius:20,padding:"20px 18px",width:"100%",maxWidth:480,maxHeight:"calc(100dvh - 32px - env(safe-area-inset-top, 0px))",overflowY:"auto",boxSizing:"border-box",
      boxShadow:"0 20px 60px rgba(0,0,0,0.5)",border:`1px solid ${T.bds}`}}>
      {children}
    </div>
  </div>
);

export { Overlay };
