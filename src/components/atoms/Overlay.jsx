// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";

const Overlay = ({onClose,children}) => (
  <div onClick={onClose} style={{position:"fixed",inset:0,
    background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(0,0,0,0.45)":"rgba(0,0,0,0.78)",
    backdropFilter:"blur(12px)",zIndex:50,display:"flex",alignItems:"flex-start",justifyContent:"center",
    padding:"16px",paddingTop:"20px",overflowY:"auto"}}>
    <div onClick={e=>e.stopPropagation()} style={{
      background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"#F5F7F2":T.surf2,
      borderRadius:20,padding:"20px 18px",width:"100%",maxWidth:480,maxHeight:"calc(100vh - 32px)",overflowY:"auto",boxSizing:"border-box",
      boxShadow:"0 20px 60px rgba(0,0,0,0.5)",border:`1px solid ${T.bds}`}}>
      {children}
    </div>
  </div>
);

export { Overlay };
