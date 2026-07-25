// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";

const GBtn = ({onClick,children,color=T.blue,disabled,mt=4}) => (
  <button onClick={onClick} disabled={disabled}
    style={{width:"100%",padding:"11px",borderRadius:12,border:`1.5px solid ${disabled?T.lbl:color}`,cursor:disabled?"not-allowed":"pointer",
      background:"transparent",color:disabled?T.txt2:color,fontSize:16,fontWeight:600,marginTop:mt,opacity:disabled?0.6:1}}>
    {children}
  </button>
);



// ══════════════════════════════════════════════════════════════════════════════
// MONTH PICKER – wiederverwendbarer Monat/Jahr-Wähler mit Klick-Dropdown
// ══════════════════════════════════════════════════════════════════════════════

export { GBtn };
