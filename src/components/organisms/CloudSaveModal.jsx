// Schickes Modal zum Sichern der lokalen Änderungen in die Cloud (Cloudflare).
// Wird per Wisch-nach-unten am großen + Button geöffnet.
import React, { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { readableOn } from "../../theme/amtPill.js";

function CloudSaveModal({ onClose }) {
  const { cfActive, cfStatus, saveConfig, isDirty } = useContext(AppCtx);
  const [attempted, setAttempted] = useState(false);
  const wasSaving = useRef(false);

  const saving = cfStatus === "saving";
  const error  = cfStatus === "error";
  const justSaved = attempted && cfStatus === "ok";

  // Nach erfolgreichem Speichern kurz Erfolg zeigen, dann automatisch schließen.
  useEffect(() => {
    if(wasSaving.current && cfStatus === "ok") {
      const t = setTimeout(onClose, 1100);
      return () => clearTimeout(t);
    }
    wasSaving.current = saving;
  }, [cfStatus, saving, onClose]);

  const doSave = () => { if(cfActive && !saving) { setAttempted(true); saveConfig(); } };

  const accent = T.blue;
  const onAccent = readableOn(accent, accent);

  // Status-Text + Farbe
  const status = !cfActive ? { txt: "Keine Cloud verbunden", col: T.txt2 }
    : error     ? { txt: "Speichern fehlgeschlagen", col: T.neg }
    : justSaved ? { txt: "Gesichert ✓", col: T.pos }
    : saving    ? { txt: "Speichert…", col: T.gold }
    : isDirty   ? { txt: "Ungespeicherte Änderungen", col: T.gold }
    :             { txt: "Alles aktuell gesichert", col: T.pos };

  const badgeBg = justSaved ? T.pos : error ? T.neg : accent;

  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:400,display:"flex",
        alignItems:"center",justifyContent:"center",padding:20,
        background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{width:"100%",maxWidth:360,background:T.surf,borderRadius:22,
          border:`1px solid ${T.bds}`,boxShadow:"0 24px 70px rgba(0,0,0,0.6)",
          padding:"26px 22px 18px",display:"flex",flexDirection:"column",
          alignItems:"center",gap:14,textAlign:"center"}}>

        {/* Cloud-Badge */}
        <div style={{width:72,height:72,borderRadius:"50%",
          display:"flex",alignItems:"center",justifyContent:"center",
          background:`${badgeBg}1F`,border:`2px solid ${badgeBg}`,
          transition:"all 0.25s"}}>
          {Li(justSaved ? "check-circle" : "upload-cloud", 34, badgeBg)}
        </div>

        <div style={{color:T.txt,fontSize:18,fontWeight:800,letterSpacing:-0.3}}>
          In die Cloud speichern
        </div>

        {/* Status-Pille */}
        <div style={{display:"inline-flex",alignItems:"center",gap:7,
          padding:"5px 12px",borderRadius:999,background:`${status.col}1A`,
          color:status.col,fontSize:13,fontWeight:700}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:status.col,
            display:"inline-block"}}/>
          {status.txt}
        </div>

        {cfActive ? (
          <>
            <button onClick={doSave} disabled={saving}
              style={{width:"100%",marginTop:4,padding:"13px",borderRadius:13,border:"none",
                background:saving?T.gold:accent,color:saving?readableOn(T.gold,T.gold):onAccent,
                fontSize:15,fontWeight:800,cursor:saving?"wait":"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {saving ? <>{Li("loader",17,readableOn(T.gold,T.gold))} Speichert…</>
                      : <>{Li("upload-cloud",17,onAccent)} Jetzt sichern</>}
            </button>
            <button onClick={onClose}
              style={{background:"none",border:"none",color:T.txt2,fontSize:13,
                fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"4px 8px"}}>
              Schließen
            </button>
          </>
        ) : (
          <>
            <div style={{color:T.txt2,fontSize:13,lineHeight:1.5,maxWidth:280}}>
              Richte die Cloud-Synchronisierung in den Einstellungen ein,
              um deine Daten zu sichern.
            </div>
            <button onClick={onClose}
              style={{width:"100%",marginTop:4,padding:"12px",borderRadius:13,border:`1px solid ${T.bds}`,
                background:"transparent",color:T.txt,fontSize:14,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              Verstanden
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export { CloudSaveModal };
