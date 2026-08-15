// Auto-generated module (siehe app-src.jsx)

import React, { useState } from "react";
import { NachkategorisierenButton } from "../buttons/NachkategorisierenButton.jsx";
import { TypPruefButton } from "../buttons/TypPruefButton.jsx";
import { KontoWarnungWidget } from "./KontoWarnungWidget.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function WerkzeugeSection() {
  const [open, setOpen] = React.useState(false);
  return (
    // `symbolzeile`: derselbe Haken wie bei der Drei-Symbol-Zeile im Dashboard
    // (siehe flaechen_extra in activeTheme.js). Die Zeile fuehrt ein
    // Akzent-Symbol, das auf einem hellen Hintergrund sonst kaum sichtbar ist.
    <div className="symbolzeile" style={{borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
      <div onClick={()=>setOpen(v=>!v)}
        style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:6,
          cursor:"pointer",userSelect:"none"}}>
        {Li("tag",12,T.acc_gold)}
        <span style={{color:T.txt2,fontSize:11,fontWeight:600,flex:1}}>Werkzeuge</span>
        {Li(open?"chevron-up":"chevron-down",12,T.txt2)}
      </div>
      {open&&(
        <div style={{padding:"0 14px 10px"}}>
          <NachkategorisierenButton/>
          <TypPruefButton/>
        </div>
      )}
    </div>
  );
}

// ── KontoWarnungWidget — zeigt Minus-Tage des aktuellen Monats ───────────────

export { WerkzeugeSection };
