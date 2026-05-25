// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";

const GBtn = ({onClick,children,color=T.blue,mt=4}) => (
  <button onClick={onClick}
    style={{width:"100%",padding:"11px",borderRadius:12,border:`1.5px solid ${color}`,cursor:"pointer",
      background:"transparent",color,fontSize:14,fontWeight:600,marginTop:mt}}>
    {children}
  </button>
);



// ══════════════════════════════════════════════════════════════════════════════
// MONTH PICKER – wiederverwendbarer Monat/Jahr-Wähler mit Klick-Dropdown
// ══════════════════════════════════════════════════════════════════════════════

export { GBtn };
