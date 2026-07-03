// Auto-generated module (siehe app-src.jsx)
//
// Vollbild-Dialog zum Durchblättern aller Lucide-Icons: Wisch nach links/rechts
// (oder ←/→-Buttons) navigiert frei vor UND zurück — kein Icon verschwindet
// dabei, man kann jederzeit zu einem schon gesehenen Icon zurück. Antippen des
// Icons (oder der ★-Button) schaltet es als Favorit an/aus. Favoriten landen in
// AppCtx.favIcons und tauchen als Schnellwahl-Zeile im normalen IconPickerDialog
// auf. Die Blätter-Position wird persistiert, damit man später weitermachen kann.

import React, { useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SafeIcon } from "../atoms/SafeIcon.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li, getAllLucideIcons, ensureLucideLoaded } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";

const IDX_KEY = "mbt_fav_icons_idx";
const SWIPE_THRESHOLD = 70;   // ab hier zählt die Geste als Wisch (vor/zurück)
const TAP_MAX_MOVE = 10;      // darunter zählt die Geste als Antippen (Favorit toggeln)
const TAP_MAX_MS = 400;

function IconSwipePicker({ onClose }) {
  const { favIcons, setFavIcons } = useContext(AppCtx);

  const [lucideReady, setLucideReady] = React.useState(!!window.LucideIcons);
  React.useEffect(()=>{
    if(lucideReady) return;
    ensureLucideLoaded(); // Chunk erst hier anfordern, falls Leerlauf-Trigger noch nicht lief
    const on = () => setLucideReady(true);
    window.addEventListener("lucide-ready", on);
    return () => window.removeEventListener("lucide-ready", on);
  }, [lucideReady]);

  const list = useMemo(()=>getAllLucideIcons(), [lucideReady]);
  const total = list.length;
  const [idx, setIdx] = useState(()=>{
    const saved = parseInt(kvStore.getItem(IDX_KEY)||"0", 10);
    return Number.isFinite(saved) ? Math.max(0, saved) : 0;
  });
  const safeIdx = total ? Math.min(idx, total-1) : 0;
  const icon = total ? list[safeIdx] : null;
  const isFav = icon ? favIcons.includes(icon) : false;

  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startT: 0, active: false });

  const goTo = (next) => {
    const clamped = Math.max(0, Math.min(total-1, next));
    setIdx(clamped);
    kvStore.setItem(IDX_KEY, String(clamped));
  };
  const goPrev = () => goTo(safeIdx - 1);
  const goNext = () => goTo(safeIdx + 1);
  const toggleFavorite = () => {
    if(!icon) return;
    setFavIcons(prev => prev.includes(icon) ? prev.filter(x=>x!==icon) : [...prev, icon]);
  };

  const onPointerDown = (e) => {
    if(!icon) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startT: Date.now(), active: true };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if(!dragRef.current.active) return;
    setOffsetX(e.clientX - dragRef.current.startX);
  };
  const onPointerUp = () => {
    if(!dragRef.current.active) return;
    const { startX, startY, startT } = dragRef.current;
    dragRef.current.active = false;
    setDragging(false);
    const dx = offsetX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) goNext(); else goPrev();
    } else if (Math.abs(dx) <= TAP_MAX_MOVE && (Date.now()-startT) < TAP_MAX_MS) {
      toggleFavorite();
    }
    setOffsetX(0);
  };

  const rot = Math.max(-10, Math.min(10, offsetX/16));

  const content = (
    // onClick stoppen: React-Portals bubblen Events durch den REACT-Baum, nicht
    // den DOM-Baum — dieser Screen hängt (als Kind von IconPickerDialog) über
    // showSwipePicker im React-Baum UNTER dem Backdrop von IconPickerDialog
    // (onClick={onClose} dort). Ohne stopPropagation würde jeder Klick hier
    // drin (Pfeile, Stern, ✕, Karte) bis zu diesem Backdrop durchbubblen und
    // den kompletten Icon-Picker mitschließen — je nachdem, woher der Icon-
    // Picker ursprünglich geöffnet wurde, landet man dann z.B. wieder bei
    // "Konten", statt nur den Swipe-Picker zu schließen.
    <div onClick={e=>e.stopPropagation()} style={{position:"fixed",inset:0,background:T.bg,zIndex:999999,
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
            {total ? `${safeIdx+1} / ${total} · antippen = Favorit` : ""}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,color:T.gold,fontWeight:700,fontSize:14,flexShrink:0}}>
          {Li("star",15,T.gold)} {favIcons.length}
        </div>
      </div>

      {/* Karten-Bühne */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
        {!lucideReady ? (
          <div style={{color:T.txt2,fontSize:13}}>Icons werden geladen…</div>
        ) : (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              width:"100%",maxWidth:340,aspectRatio:"3/4",
              background:T.surf,borderRadius:24,
              border:`1.5px solid ${isFav?T.gold:T.bds}`,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,
              cursor:dragging?"grabbing":"grab",touchAction:"none",userSelect:"none",
              transform:`translateX(${offsetX}px) rotate(${rot}deg)`,
              transition:dragging?"none":"transform 0.25s ease, border-color 0.2s",
              boxShadow:isFav?`0 12px 40px ${T.gold}33`:"0 12px 40px rgba(0,0,0,0.35)",position:"relative",
            }}>
            {/* Favorit-Badge — dauerhaft sichtbar, kein Wisch-Feedback mehr */}
            {isFav && (
              <div style={{position:"absolute",top:16,right:16,color:T.gold,
                display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                {Li("star",26,T.gold)}
              </div>
            )}
            <div style={{width:240,height:240,borderRadius:44,
              background:isFav?`${T.gold}1f`:`${T.blue}18`,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              transition:"background 0.2s"}}>
              <SafeIcon name={icon} size={192} color={isFav?T.gold:T.blue}/>
            </div>
            <div style={{color:T.txt,fontSize:15,fontWeight:600,fontFamily:"monospace"}}>{icon}</div>
          </div>
        )}
      </div>

      {/* Aktions-Buttons */}
      {lucideReady && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:18,
          padding:"10px 16px calc(20px + env(safe-area-inset-bottom, 0px))",flexShrink:0}}>
          <button onClick={goPrev} disabled={safeIdx===0}
            title="Vorheriges Icon"
            style={{width:52,height:52,borderRadius:26,border:`1px solid ${T.bd}`,
              background:"rgba(255,255,255,0.04)",color:safeIdx===0?T.txt2:T.txt,cursor:safeIdx===0?"default":"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              opacity:safeIdx===0?0.4:1}}>
            {Li("chevron-left",24)}
          </button>
          <button onClick={toggleFavorite}
            title={isFav?"Favorit entfernen":"Als Favorit markieren"}
            style={{width:64,height:64,borderRadius:32,border:"none",
              background:isFav?`linear-gradient(135deg, ${T.gold}, #f0c040)`:"rgba(255,255,255,0.06)",
              color:isFav?"#2a1e00":T.gold,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              border:isFav?"none":`2px solid ${T.gold}66`,
              boxShadow:isFav?`0 4px 16px ${T.gold}55`:"none"}}>
            {Li("star",28)}
          </button>
          <button onClick={goNext} disabled={safeIdx>=total-1}
            title="Nächstes Icon"
            style={{width:52,height:52,borderRadius:26,border:`1px solid ${T.bd}`,
              background:"rgba(255,255,255,0.04)",color:safeIdx>=total-1?T.txt2:T.txt,cursor:safeIdx>=total-1?"default":"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              opacity:safeIdx>=total-1?0.4:1}}>
            {Li("chevron-right",24)}
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

export { IconSwipePicker };
