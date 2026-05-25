// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { VormVerknuepfenPanel } from "../organisms/VormVerknuepfenPanel.jsx";
import { VormerkungHub } from "../screens/VormerkungHub.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function VormHubSegBtn({v,l,icon,cur,set,clearCount,clearEnd}) {
  return (
    <button onClick={()=>{set(v);clearCount();clearEnd();}}
      style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",cursor:"pointer",
        fontFamily:"inherit",fontSize:11,fontWeight:cur===v?700:400,
        background:cur===v?T.gold:"transparent",
        color:cur===v?T.on_accent:T.txt2,transition:"all 0.15s",
        display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
      {Li(icon,11,cur===v?T.on_accent:T.txt2)} {l}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════
// VormerkungHub — Zentraler Dialog für alle Vormerkungstypen
// ══════════════════════════════════════════════════════════════════════
// ── VormVerknuepfenPanel: Vormerkung → Buchung zuordnen (in VormerkungHub) ──

export { VormHubSegBtn };
