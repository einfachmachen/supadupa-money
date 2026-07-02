// Auto-generated module (siehe app-src.jsx)
//
// Vollbild-Dialog zur Kuratierung von Icon-Favoriten: ein Lucide-Icon nach dem
// anderen, Tinder-artig per Wisch (oder Buttons) als Favorit sammeln (rechts)
// oder überspringen (links). Favoriten landen in AppCtx.favIcons und tauchen
// als Schnellwahl-Zeile im normalen IconPickerDialog auf. Fortschritt (Index)
// wird persistiert, damit man die Runde später fortsetzen kann.

import React, { useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SafeIcon } from "../atoms/SafeIcon.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li, getAllLucideIcons } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";

const IDX_KEY = "mbt_fav_icons_idx";
const SWIPE_THRESHOLD = 100;

function IconSwipePicker({ onClose }) {
  const { favIcons, setFavIcons } = useContext(AppCtx);

  const [lucideReady, setLucideReady] = React.useState(!!window.LucideIcons);
  React.useEffect(()=>{
    if(lucideReady) return;
    const on = () => setLucideReady(true);
    window.addEventListener("lucide-ready", on);
    return () => window.removeEventListener("lucide-ready", on);
  }, [lucideReady]);

  const list = useMemo(()=>getAllLucideIcons(), [lucideReady]);
  const [idx, setIdx] = useState(()=>{
    const saved = parseInt(kvStore.getItem(IDX_KEY)||"0", 10);
    return Number.isFinite(saved) ? saved : 0;
  });
  const historyRef = useRef([]); // {icon, wasFav} — für "Zurück"

  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, active: false });

  const total = list.length;
  const done = idx >= total && total > 0;
  const icon = !done ? list[idx] : null;

  const advance = (dir) => {
    if(!icon) return;
    historyRef.current.push({ icon, wasFav: dir===1 });
    if(dir===1){
      setFavIcons(prev => prev.includes(icon) ? prev : [...prev, icon]);
    }
    const next = idx+1;
    setIdx(next);
    kvStore.setItem(IDX_KEY, String(next));
    setOffsetX(0);
    setDragging(false);
  };

  const undo = () => {
    const last = historyRef.current.pop();
    if(!last) return;
    if(last.wasFav) setFavIcons(prev => prev.filter(i=>i!==last.icon));
    const prevIdx = Math.max(0, idx-1);
    setIdx(prevIdx);
    kvStore.setItem(IDX_KEY, String(prevIdx));
    setOffsetX(0);
  };

  const restart = () => {
    historyRef.current = [];
    setIdx(0);
    kvStore.setItem(IDX_KEY, "0");
    setOffsetX(0);
  };

  const onPointerDown = (e) => {
    if(!icon) return;
    dragRef.current = { startX: e.clientX, active: true };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if(!dragRef.current.active) return;
    setOffsetX(e.clientX - dragRef.current.startX);
  };
  const onPointerUp = () => {
    if(!dragRef.current.active) return;
    dragRef.current.active = false;
    if(offsetX > SWIPE_THRESHOLD) advance(1);
    else if(offsetX < -SWIPE_THRESHOLD) advance(-1);
    else { setOffsetX(0); setDragging(false); }
  };

  const rot = Math.max(-14, Math.min(14, offsetX/12));
  const rightGlow = Math.max(0, Math.min(1, offsetX/SWIPE_THRESHOLD));
  const leftGlow  = Math.max(0, Math.min(1, -offsetX/SWIPE_THRESHOLD));

  const content = (
    <div style={{position:"fixed",inset:0,background:T.bg,zIndex:999999,
      display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",
        borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
        <button onClick={onClose} aria-label="Schließen"
          style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt2,
            width:40,height:40,borderRadius:12,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:0}}>
          ✕
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:T.txt,fontSize:18,fontWeight:700}}>Icon-Favoriten</div>
          <div style={{color:T.txt2,fontSize:12}}>
            {done ? "Alle Icons durchgesehen" : `${idx+1} / ${total}`}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,color:T.gold,fontWeight:700,fontSize:14,flexShrink:0}}>
          {Li("star",15,T.gold)} {favIcons.length}
        </div>
      </div>

      {/* Karten-Bühne */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
        {done ? (
          <div style={{textAlign:"center",maxWidth:320}}>
            <div style={{fontSize:48,marginBottom:12}}>{Li("party-popper",48,T.gold)}</div>
            <div style={{color:T.txt,fontSize:18,fontWeight:700,marginBottom:6}}>Fertig!</div>
            <div style={{color:T.txt2,fontSize:13,lineHeight:1.5,marginBottom:20}}>
              Du hast alle {total} Icons durchgesehen und <b style={{color:T.gold}}>{favIcons.length} Favoriten</b> gesammelt.
              Sie erscheinen jetzt als Schnellwahl im Icon-Picker.
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={restart}
                style={{padding:"10px 16px",borderRadius:11,border:`1px solid ${T.bds}`,
                  background:"transparent",color:T.txt2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                {Li("refresh-cw",13)} Nochmal von vorne
              </button>
              <button onClick={onClose}
                style={{padding:"10px 18px",borderRadius:11,border:"none",
                  background:T.blue,color:T.on_accent,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                Fertig
              </button>
            </div>
          </div>
        ) : !lucideReady ? (
          <div style={{color:T.txt2,fontSize:13}}>Icons werden geladen…</div>
        ) : (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              width:"100%",maxWidth:340,aspectRatio:"3/4",
              background:T.surf,borderRadius:24,border:`1.5px solid ${T.bds}`,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,
              cursor:dragging?"grabbing":"grab",touchAction:"none",userSelect:"none",
              transform:`translateX(${offsetX}px) rotate(${rot}deg)`,
              transition:dragging?"none":"transform 0.25s ease",
              boxShadow:"0 12px 40px rgba(0,0,0,0.35)",position:"relative",
            }}>
            {/* Favorit-/Skip-Badges während des Ziehens */}
            <div style={{position:"absolute",top:20,left:20,color:T.pos,fontWeight:800,fontSize:16,
              border:`2.5px solid ${T.pos}`,borderRadius:8,padding:"4px 10px",
              opacity:rightGlow,transform:`rotate(-12deg) scale(${0.9+rightGlow*0.1})`,pointerEvents:"none"}}>
              ★ FAVORIT
            </div>
            <div style={{position:"absolute",top:20,right:20,color:T.neg,fontWeight:800,fontSize:16,
              border:`2.5px solid ${T.neg}`,borderRadius:8,padding:"4px 10px",
              opacity:leftGlow,transform:`rotate(12deg) scale(${0.9+leftGlow*0.1})`,pointerEvents:"none"}}>
              WEITER
            </div>
            <div style={{width:240,height:240,borderRadius:44,background:`${T.blue}18`,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <SafeIcon name={icon} size={192} color={T.blue}/>
            </div>
            <div style={{color:T.txt,fontSize:15,fontWeight:600,fontFamily:"monospace"}}>{icon}</div>
          </div>
        )}
      </div>

      {/* Aktions-Buttons */}
      {!done && lucideReady && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:18,
          padding:"10px 16px calc(20px + env(safe-area-inset-bottom, 0px))",flexShrink:0}}>
          <button onClick={undo} disabled={historyRef.current.length===0}
            title="Letzte Entscheidung rückgängig machen"
            style={{width:46,height:46,borderRadius:23,border:`1px solid ${T.bd}`,
              background:"rgba(255,255,255,0.04)",color:T.txt2,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              opacity:historyRef.current.length===0?0.4:1}}>
            {Li("undo-2",18)}
          </button>
          <button onClick={()=>advance(-1)}
            style={{width:64,height:64,borderRadius:32,border:`2px solid ${T.neg}`,
              background:`${T.neg}12`,color:T.neg,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {Li("x",28)}
          </button>
          <button onClick={()=>advance(1)}
            style={{width:64,height:64,borderRadius:32,border:"none",
              background:`linear-gradient(135deg, ${T.gold}, #f0c040)`,color:"#2a1e00",cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              boxShadow:`0 4px 16px ${T.gold}55`}}>
            {Li("star",28)}
          </button>
          <div style={{width:46,flexShrink:0}}/>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

export { IconSwipePicker };
