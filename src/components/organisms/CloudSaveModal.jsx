// Schickes Modal zum Sichern der lokalen Änderungen in die Cloud (Cloudflare).
// Wird per Wisch-nach-unten am großen + Button geöffnet.
import React, { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { readableOn, knopfPaar, DUNKEL } from "../../theme/amtPill.js";
import { AMPEL } from "../../utils/syncBadge.js";

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

  // Status-Text + Signalfarbe.
  //
  // Dieselbe Ampel wie im SyncStatusBadge (utils/syncBadge.js): es ist
  // derselbe Zustand, also muss er dieselbe Farbe tragen. Vorher standen hier
  // Theme-Toene als 10-%-Toenung — ueber 34 Themes ergab das mal Oliv, mal
  // Senf. Ein Zustand, eine Farbe, ueberall gleich.
  //
  // „Keine Cloud verbunden" ist bewusst KEIN Ampelzustand: da ist nichts rot
  // oder gelb, es ist schlicht nichts eingerichtet. Deshalb neutral.
  const status = !cfActive ? { txt: "Keine Cloud verbunden", col: null, icon: "cloud" }
    : error     ? { txt: "Speichern fehlgeschlagen", col: AMPEL.rot, icon: "alert-triangle" }
    : justSaved ? { txt: "Gesichert ✓", col: AMPEL.gruen, icon: "check" }
    : saving    ? { txt: "Speichert…", col: AMPEL.gelb, icon: "refresh-cw" }
    : isDirty   ? { txt: "Ungespeicherte Änderungen", col: AMPEL.gelb, icon: "upload-cloud" }
    :             { txt: "Alles aktuell gesichert", col: AMPEL.gruen, icon: "check" };
  const pille = status.col
    ? knopfPaar(status.col, DUNKEL)
    : { grund: "transparent", schrift: T.txt2 };

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
          padding:"5px 12px",borderRadius:999,background:pille.grund,
          border: status.col ? "none" : `1px solid ${T.bd}`,
          color:pille.schrift,fontSize:13,fontWeight:700}}>
          {/* Symbol statt Farbpunkt: der Punkt haette dieselbe Farbe wie die
              Flaeche und waere darauf unsichtbar — und die Aussage darf
              ohnehin nicht allein an der Farbe haengen. */}
          {Li(status.icon, 14, pille.schrift)}
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
