// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useRef, useState } from "react";
import { ColorPickerPopup } from "./ColorPickerPopup.jsx";
import { QuickBtnsBarWithColor } from "./QuickBtnsBarWithColor.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function QuickColorsBar({onSelect}) {
  const { quickColors, setQuickColors, globalDrag } = useContext(AppCtx);
  const _cols = Array.isArray(quickColors) ? quickColors : [];
  const [showPicker, setShowPicker] = React.useState(false);

  const [deleting,  setDeleting]  = React.useState(null);
  const [dragId,    setDragId]    = React.useState(null);
  const [overIdx,   setOverIdx]   = React.useState(null);
  const pressTimer    = React.useRef(null);
  const feedbackTimer = React.useRef(null);
  const didDrag       = React.useRef(false);
  const cancelled     = React.useRef(false);
  const containerRef  = React.useRef(null);

  const startPress = (id) => {
    didDrag.current = false;
    cancelled.current = false;
    setDeleting(null);
    feedbackTimer.current = setTimeout(() => {
      if (!didDrag.current && !cancelled.current) setDeleting(id);
    }, 500);
    pressTimer.current = setTimeout(() => {
      if (!didDrag.current && !cancelled.current) {
        setQuickColors(p => p.filter(c => c.id !== id));
        setDeleting(null); setDragId(null);
      }
    }, 900);
  };
  const cancelPress = () => {
    clearTimeout(pressTimer.current);
    clearTimeout(feedbackTimer.current);
    cancelled.current = true;
    setDeleting(null);
  };

  const onPointerDown = (e, id) => {
    didDrag.current = false;
    cancelled.current = false;
    setDragId(id);
    startPress(id);
    const pointerId = e.pointerId;
    const startX = e.clientX, startY = e.clientY;

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const moved = Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4;
      if (moved && !didDrag.current) {
        didDrag.current = true;
        clearTimeout(pressTimer.current);
        clearTimeout(feedbackTimer.current);
        cancelled.current = true;
        setDeleting(null);
        const col = _cols.find(c => c.id === id);
        if (col) globalDrag.current = { color: col.color };
      }
      if (!didDrag.current) return;
      const container = containerRef.current;
      if (container) {
        const els = Array.from(container.querySelectorAll("[data-colidx]"));
        let found = null;
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
            found = parseInt(el.dataset.colidx, 10); break;
          }
        }
        setOverIdx(found);
      }
    };
    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (didDrag.current) {
        cancelPress();
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const dz = el?.closest("[data-dropzone]");
        if (dz && globalDrag.current?.color) {
          const col = _cols.find(c => c.id === id);
          if (col) onSelect && onSelect(col.color);
        } else {
          setQuickColors(p => {
            const arr = [...p];
            const fromIdx = arr.findIndex(c => c.id === id);
            if (fromIdx === -1 || overIdx === null || fromIdx === overIdx) return p;
            const [item] = arr.splice(fromIdx, 1);
            arr.splice(overIdx, 0, item);
            return arr;
          });
        }
        globalDrag.current = null;
        setDragId(null); setOverIdx(null);
        didDrag.current = false;
      } else {
        if (!cancelled.current) {
          cancelPress();
          const col = _cols.find(c => c.id === id);
          if (col) onSelect && onSelect(col.color);
        }
        setDragId(null); setOverIdx(null);
        didDrag.current = false;
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };
  const pendingColor = React.useRef(null);

  const handleColorInput = () => {
    const color = pendingColor.current;
    if (!color) return;
    setQuickColors(p => {
      if (p.find(c => c.color === color)) return p;
      return [...p, { id: "qc" + Date.now(), color }];
    });
    pendingColor.current = null;
  };

  const addColor = (color) => {
    setQuickColors(p => {
      if (p.find(c => c.color === color)) return p;
      return [...p, { id: "qc" + Date.now(), color }];
    });
  };

  return (
    <>
      {showPicker && <ColorPickerPopup onClose={()=>setShowPicker(false)} onSelect={addColor}/>}
      <div ref={containerRef}
        style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
      {_cols.map((col, idx) => {
        const isDragging = dragId === col.id;
        const isOver     = overIdx === idx && dragId !== col.id;
        const isDeleting = deleting === col.id;
        return (
          <button key={col.id} data-colidx={idx}
            onPointerDown={e => onPointerDown(e, col.id)}
            onPointerCancel={() => { cancelPress(); setDragId(null); setOverIdx(null); }}
            title="Farbe anwenden · lang drücken zum Löschen"
            style={{
              width:32, height:32, borderRadius:"50%", flexShrink:0,
              background: col.color,
              border: isDeleting ? `3px solid ${T.neg}`
                    : isOver    ? `3px solid #fff`
                    : isDragging? `2px solid rgba(255,255,255,0.4)`
                    : `2px solid transparent`,
              cursor:"grab",
              opacity: isDragging ? 0.5 : 1,
              transform: isOver ? "scale(1.2)" : isDeleting ? "scale(0.85)" : "scale(1)",
              transition:"transform 0.1s, border-color 0.15s, opacity 0.15s",
              userSelect:"none", WebkitUserSelect:"none", touchAction:"none",
            }}/>
        );
      })}
      {/* + Kreis – öffnet Farbwahl-Popup */}
      <button onClick={() => setShowPicker(true)}
        title="farbe zur Schnellwahl hinzufügen"
        style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center",
          background:"transparent",border:`1.5px dashed ${T.bds}`,cursor:"pointer"}}>
        {Li("plus", 14, T.txt2)}
      </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
// QuickBtnsBarWithColor – Icon-Leiste + Farb-Leiste kombiniert.
// Klick auf Icon-Button → markiert es als Farbziel (Ring).
// Klick auf Farbpunkt → ändert Farbe des markierten Icon-Buttons.
// onSelectIcon(btn) → normaler Icon-Klick ohne Farbziel.
// ══════════════════════════════════════════════════════════════════════

export { QuickColorsBar };
