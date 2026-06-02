// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

const MHead = ({title,onClose}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
    <span style={{color:T.blue,fontSize:17,fontWeight:700}}>{title}</span>
    <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",color:"#aaa",borderRadius:9,width:30,height:30,cursor:"pointer",fontSize:14}}>{Li("x",13)}</button>
  </div>
);

export { MHead };
