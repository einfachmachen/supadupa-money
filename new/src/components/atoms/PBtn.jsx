// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";

const PBtn = ({onClick,children,disabled,bg,mt=4}) => (
  <button onClick={onClick} disabled={disabled}
    style={{width:"100%",padding:"10px",borderRadius:13,border:"none",cursor:disabled?"not-allowed":"pointer",
      background:disabled?T.disabled:bg||T.blue,color:disabled?"#666":T.on_accent,fontSize:17,fontWeight:700,marginTop:mt,opacity:disabled?0.45:1}}>
    {children}
  </button>
);

export { PBtn };
