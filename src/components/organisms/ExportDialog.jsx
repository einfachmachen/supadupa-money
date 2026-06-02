// Auto-generated module (siehe app-src.jsx)

import React, { createElement, useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function ExportDialog({title, defaultName, data, onClose, onDone=()=>{}}) {
  const [fileName, setFileName] = useState(defaultName);
  const [copied, setCopied]     = useState(false);
  const json = JSON.stringify(data, null, 2);
  const name = () => (fileName.trim()||defaultName).replace(/\.json$/i,"") + ".json";

  const doCopy = () => {
    navigator.clipboard?.writeText(json).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };
  const doDownload = async () => {
    try {
      const blob = new Blob([json], {type:"application/json"});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[new File([blob],name(),{type:"application/json"})]})) {
        await navigator.share({files:[new File([blob],name(),{type:"application/json"})],title:name()});
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href=url; a.download=name();
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
    } catch(e){if(e.name!=="AbortError")console.error(e);}
    onDone();
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",
      backdropFilter:"blur(8px)",zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surf,borderRadius:18,
        width:"100%",maxWidth:420,maxHeight:"80vh",display:"flex",flexDirection:"column",
        border:`1px solid ${T.bd}`,boxShadow:"0 8px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(170,204,0,0.08)"}}>
        {/* Header */}
        <div style={{padding:"14px 16px 10px",flexShrink:0}}>
          <div style={{color:T.txt,fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            {Li("download",14,T.blue)} {title}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input autoFocus value={fileName}
              onChange={e=>setFileName(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")doDownload();if(e.key==="Escape")onClose();}}
              style={{flex:1,background:"rgba(255,255,255,0.07)",border:`1px solid ${T.bds}`,
                borderRadius:9,padding:"7px 10px",color:T.txt,fontSize:12,outline:"none"}}/>
            <span style={{color:T.txt2,fontSize:11,flexShrink:0}}>.json</span>
          </div>
        </div>
        {/* JSON Preview */}
        <div style={{flex:1,overflowY:"auto",margin:"0 16px",borderRadius:10,
          background:"rgba(255,255,255,0.04)",border:`1px solid ${T.bd}`}}>
          <pre style={{margin:0,padding:"10px 12px",color:"#7EC8A0",fontSize:9,
            fontFamily:"monospace",whiteSpace:"pre-wrap",wordBreak:"break-all",lineHeight:1.5}}>
            {json.slice(0,3000)}{json.length>3000?"…":""}
          </pre>
        </div>
        {/* Buttons */}
        <div style={{display:"flex",gap:6,padding:"10px 16px 14px",flexShrink:0}}>
          <button onClick={onClose}
            style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${T.bds}`,
              background:"transparent",color:T.txt2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            ✕
          </button>
          <button onClick={doCopy}
            style={{flex:2,padding:"9px",borderRadius:10,border:`1px solid ${T.blue}`,
              background:copied?"rgba(74,159,212,0.3)":"rgba(74,159,212,0.1)",
              color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {copied?<>{Li("check",12,T.blue)} kopiert</>:<>{Li("copy",12,T.blue)} kopieren</>}
          </button>
          <button onClick={doDownload}
            style={{flex:2,padding:"9px",borderRadius:10,border:"none",
              background:`linear-gradient(135deg,${T.blue}99,${T.blue})`,color:"#fff",
              fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {Li("download",12,"#fff")} speichern
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CSV IMPORT SCREEN
// ══════════════════════════════════════════════════════════════════════════════

// Fingerprint für Duplikat-Erkennung
// Addiert Monate auf ISO-Datum ohne Zeitzonenprobleme

export { ExportDialog };
