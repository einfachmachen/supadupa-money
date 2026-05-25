// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useRef, useState } from "react";
import { Lbl } from "../atoms/Lbl.jsx";
import { ColorPickerPopup } from "./ColorPickerPopup.jsx";
import { QuickBtnsBar } from "./QuickBtnsBar.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function QuickBtnsBarWithColor({onSelectIcon, onSelectColor, _onDragStart, _onDragEnd}) {
  const { quickBtns, setQuickBtns, quickColors, setQuickColors, globalDrag } = useContext(AppCtx);
  const [colorTarget, setColorTarget] = React.useState(null);
  const _cols = Array.isArray(quickColors) ? quickColors : [];
  const colorInputRef = React.useRef(null);
  const [delColor, setDelColor] = React.useState(null);
  const [dragColId, setDragColId] = React.useState(null);
  const [overColIdx, setOverColIdx] = React.useState(null);
  const pressTimerC = React.useRef(null);
  const didDragC = React.useRef(false);
  const colContainerRef = React.useRef(null);

  const onBtnClick = (btn) => {
    if (colorTarget === btn.id) {
      // zweiter Klick → Markierung aufheben
      setColorTarget(null);
    } else if (_cols.length > 0) {
      // Farben vorhanden → als Ziel markieren
      setColorTarget(btn.id);
    } else {
      // keine Farben → direkt Icon auswählen
      onSelectIcon && onSelectIcon(btn);
    }
  };

  const onColorClick = (color) => {
    if (colorTarget) {
      setQuickBtns(p => p.map(b => b.id === colorTarget ? {...b, color} : b));
      onSelectColor && onSelectColor(color);
      setColorTarget(null);
    }
  };

  const feedbackTimerC = React.useRef(null);
  const cancelledC     = React.useRef(false);

  const startPressC = (id) => {
    didDragC.current = false;
    cancelledC.current = false;
    setDelColor(null);
    feedbackTimerC.current = setTimeout(() => {
      if (!didDragC.current && !cancelledC.current) setDelColor(id);
    }, 500);
    pressTimerC.current = setTimeout(() => {
      if (!didDragC.current && !cancelledC.current) { setQuickColors(p => p.filter(c => c.id !== id)); setDelColor(null); setDragColId(null); }
    }, 900);
  };
  const cancelPressC = () => {
    clearTimeout(pressTimerC.current);
    clearTimeout(feedbackTimerC.current);
    cancelledC.current = true;
    setDelColor(null);
  };
  const onColPointerDown = (e, id) => {
    didDragC.current = false;
    cancelledC.current = false;
    setDragColId(id);
    startPressC(id);
    const pointerId = e.pointerId;
    const startX = e.clientX, startY = e.clientY;
    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const moved = Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4;
      if (moved && !didDragC.current) {
        didDragC.current = true;
        clearTimeout(pressTimerC.current);
        clearTimeout(feedbackTimerC.current);
        cancelledC.current = true;
        setDelColor(null);
        const col = _cols.find(c => c.id === id);
        if (col) globalDrag.current = { color: col.color };
      }
      if (!didDragC.current) return;
      const els = Array.from(colContainerRef.current?.querySelectorAll("[data-colidx]")||[]);
      let found=null;
      for (const el of els) { const r=el.getBoundingClientRect(); if(ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom){found=parseInt(el.dataset.colidx,10);break;} }
      setOverColIdx(found);
    };
    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (didDragC.current) {
        cancelPressC();
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const dz = el?.closest("[data-dropzone]");
        if (dz && globalDrag.current?.color) {
          const targetBtnIdx = el?.closest("[data-btnidx]");
          if (targetBtnIdx) {
            const btnId = _btns[parseInt(targetBtnIdx.dataset.btnidx)]?.id;
            if (btnId) setQuickBtns(p => p.map(b => b.id === btnId ? {...b, color: globalDrag.current.color} : b));
          } else {
            onColorClick(globalDrag.current.color);
          }
        } else if (overColIdx !== null) {
          setQuickColors(p => { const arr=[...p]; const fi=arr.findIndex(c=>c.id===id); if(fi===-1||fi===overColIdx)return p; const[item]=arr.splice(fi,1); arr.splice(overColIdx,0,item); return arr; });
        }
        globalDrag.current = null;
        setDragColId(null); setOverColIdx(null); didDragC.current=false;
      } else {
        if (!cancelledC.current) {
          cancelPressC();
          const col=_cols.find(c=>c.id===id); if(col) onColorClick(col.color);
        }
        setDragColId(null); setOverColIdx(null); didDragC.current=false;
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };
  const [showPickerW, setShowPickerW] = React.useState(false);
  const addColorW = (color) => {
    setQuickColors(p => { if(p.find(c=>c.color===color))return p; return [...p,{id:"qc"+Date.now(),color}]; });
  };
  const pendingColorW = React.useRef(null);
  const handleColorInput = () => {
    const color = pendingColorW.current;
    if (!color) return;
    setQuickColors(p => { if(p.find(c=>c.color===color))return p; return [...p,{id:"qc"+Date.now(),color}]; });
    pendingColorW.current = null;
  };

  return (
    <div>
      <Lbl>Icon {colorTarget
        ? <span style={{color:T.gold,fontWeight:600}}>→ jetzt Farbe antippen</span>
        : _cols.length>0 ? <span style={{color:T.txt2,fontWeight:400}}>antippen zum Einfärben</span> : ""}
      </Lbl>
      <QuickBtnsBar onSelect={onBtnClick} _colorTarget={colorTarget} _noDelete={!!colorTarget} _onDragStart={(icon, color)=>{_onDragStart&&_onDragStart(icon, color);}} _onDragEnd={_onDragEnd} />
      <Lbl>Farbe</Lbl>
      <div ref={colContainerRef}
        style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
        {_cols.map((col,idx) => {
          const isDragging=dragColId===col.id, isOver=overColIdx===idx&&dragColId!==col.id, isDel=delColor===col.id;
          return (
            <button key={col.id} data-colidx={idx}
              onPointerDown={e=>onColPointerDown(e,col.id)}
              onPointerCancel={()=>{cancelPressC();setDragColId(null);setOverColIdx(null);}}
              title="Farbe anwenden · lang drücken zum Löschen"
              style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                background:col.color,
                border:isDel?`3px solid ${T.neg}`:isOver?`3px solid #fff`:isDragging?`2px solid rgba(255,255,255,0.4)`:`2.5px solid transparent`,
                cursor:colorTarget?"pointer":"grab",
                outline:colorTarget?"2px solid "+T.gold:"none",
                outlineOffset:2,
                opacity:isDragging?0.5:1,
                transform:isOver?"scale(1.2)":isDel?"scale(0.85)":"scale(1)",
                transition:"transform 0.1s,border-color 0.15s",
                userSelect:"none",WebkitUserSelect:"none",touchAction:"none"}}/>
          );
        })}
        <button onClick={()=>setShowPickerW(true)}
          title="farbe hinzufügen"
          style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            background:"transparent",border:`1.5px dashed ${T.bds}`,cursor:"pointer"}}>
          {Li("plus",14,T.txt2)}
        </button>
      </div>
      {showPickerW && <ColorPickerPopup onClose={()=>setShowPickerW(false)} onSelect={addColorW}/>}
    </div>
  );
}

// value={catId+"|"+subId}, onChange={(catId,subId)=>...}
// onSplit={(splits)=>...} optional – wenn gesetzt, erscheint Split-Button
// ══════════════════════════════════════════════════════════════════════

export { QuickBtnsBarWithColor };
