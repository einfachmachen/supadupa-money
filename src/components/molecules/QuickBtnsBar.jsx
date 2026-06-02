// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useRef, useState } from "react";
import { IconPickerDialog } from "../organisms/IconPickerDialog.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function QuickBtnsBar({onSelect, _colorTarget, _noDelete, _onDragStart, _onDragEnd}) {
  const { quickBtns, setQuickBtns, globalDrag } = useContext(AppCtx);
  const _btns = Array.isArray(quickBtns) ? quickBtns : [];
  const [pickingNew,  setPickingNew]  = React.useState(false);
  const [deleting,    setDeleting]    = React.useState(null); // id being long-pressed → delete
  const [dragId,      setDragId]      = React.useState(null); // id being dragged
  const [overIdx,     setOverIdx]     = React.useState(null); // drop-target index

  // ── Long-press to delete ──────────────────────────────────────────
  const pressTimer    = React.useRef(null);
  const feedbackTimer = React.useRef(null);
  const didDrag       = React.useRef(false);
  const cancelled     = React.useRef(false);

  const startPress = (id) => {
    didDrag.current = false;
    cancelled.current = false;
    setDeleting(null);
    // Rotes Feedback nach 500ms
    feedbackTimer.current = setTimeout(() => {
      if (!didDrag.current && !cancelled.current) setDeleting(id);
    }, 500);
    // Löschen nach 900ms
    pressTimer.current = setTimeout(() => {
      if (!didDrag.current && !cancelled.current) {
        setQuickBtns(p => p.filter(b => b.id !== id));
        setDeleting(null);
        setDragId(null);
      }
    }, 900);
  };
  const cancelPress = () => {
    clearTimeout(pressTimer.current);
    clearTimeout(feedbackTimer.current);
    cancelled.current = true;
    setDeleting(null);
  };

  // ── Drag & Drop via pointer events ───────────────────────────────
  const containerRef = React.useRef(null);
  const overIdxRef = React.useRef(null); // für document-level handler

  const onPointerDown = (e, id) => {
    // Kein setPointerCapture – externe Drop-Zonen müssen erreichbar bleiben
    didDrag.current = false;
    cancelled.current = false;
    setDragId(id);
    if (!_noDelete) startPress(id);
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
        const btn = _btns.find(b => b.id === id);
        if (btn) {
          globalDrag.current = { icon: btn.icon, color: btn.color || T.blue };
          _onDragStart && _onDragStart(btn.icon, btn.color || T.blue);
        }
      }      if (!didDrag.current) return;
      // Reorder-Highlight innerhalb der Bar
      const container = containerRef.current;
      if (container) {
        const els = Array.from(container.querySelectorAll("[data-btnidx]"));
        let found = null;
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
            found = parseInt(el.dataset.btnidx, 10); break;
          }
        }
        overIdxRef.current = found;
        setOverIdx(found);
      }
    };
    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);

      if (didDrag.current) {
        // War ein Drag → Timer canceln
        cancelPress();
        // External drop zone?
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const dz = el?.closest("[data-dropzone]");
        if (dz && globalDrag.current) {
          const type = dz.dataset.dropzone;
          const targetId = dz.dataset.dropid;
          _onDragStart && _onDragStart(globalDrag.current.icon, globalDrag.current.color, type, targetId);
        } else if (overIdxRef.current !== null) {
          setQuickBtns(p => {
            const arr = [...p];
            const fromIdx = arr.findIndex(b => b.id === id);
            if (fromIdx === -1 || fromIdx === overIdxRef.current) return p;
            const [item] = arr.splice(fromIdx, 1);
            arr.splice(overIdxRef.current, 0, item);
            return arr;
          });
        }
        globalDrag.current = null;
        _onDragEnd && _onDragEnd();
        setDragId(null); setOverIdx(null);
        overIdxRef.current = null;
        didDrag.current = false;
      } else {
        // Kurzes Antippen → Timer weiterlaufen lassen (für Long-Press-Delete)
        // aber sofort als Tap behandeln wenn Timer noch nicht gefeuert hat
        if (!cancelled.current) {
          // Timer läuft noch → das ist ein normaler Tap, Timer canceln und onSelect
          cancelPress();
          const btn = _btns.find(b => b.id === id);
          if (btn) onSelect && onSelect(btn);
        }
        // Wenn cancelled.current schon true ist, hat der Delete-Timer bereits gefeuert
        setDragId(null); setOverIdx(null);
        overIdxRef.current = null;
        didDrag.current = false;
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleNewIcon = (ic) => {
    setQuickBtns(p => {
      if (p.find(b => b.icon === ic)) return p;
      return [...p, { id: "q" + Date.now(), icon: ic, label: "", color: T.blue, catId: "" }];
    });
    setPickingNew(false);
  };

  return (
    <>
      {pickingNew && (
        <IconPickerDialog
          selectedIcon={null}
          selectedColor={T.blue}
          onSelect={handleNewIcon}
          onClose={() => setPickingNew(false)}
        />
      )}
      <div ref={containerRef}
        style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
        {_btns.map((btn, idx) => {
          const isDragging  = dragId === btn.id;
          const isOver      = overIdx === idx && dragId !== btn.id;
          const isDeleting  = deleting === btn.id;
          return (
            <button
              key={btn.id}
              data-btnidx={idx}
              onPointerEnter={()=>{ if(globalDrag.current?.color && !globalDrag.current?.icon) setQuickBtns(p=>p.map(b=>b.id===btn.id?{...b,color:globalDrag.current.color}:b)); }}
              onPointerDown={e => onPointerDown(e, btn.id)}
              onPointerCancel={() => { cancelPress(); setDragId(null); setOverIdx(null); }}
              title={`${btn.icon}${btn.label ? " · " + btn.label : ""} – lang drücken zum Löschen`}
              style={{
                width:40, height:40, borderRadius:10, flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                background: isDeleting ? "rgba(255,95,95,0.22)"
                           : isDragging ? "rgba(170,204,0,0.18)"
                           : T.surf,
                border: isDeleting  ? `1.5px solid ${T.neg}`
                       : isOver     ? `2px solid ${T.blue}`
                       : isDragging ? `1.5px solid ${T.blue}88`
                       : _colorTarget === btn.id ? `2px solid ${T.gold}`
                       : `1.5px solid ${(btn.color || T.blue)}44`,
                cursor: _colorTarget ? "pointer" : "grab",
                outline: _colorTarget === btn.id ? `2px solid ${T.gold}88` : "none",
                outlineOffset: 2,
                opacity: isDragging ? 0.5 : 1,
                transform: isOver ? "scale(1.15)" : "scale(1)",
                transition:"background 0.15s, border-color 0.15s, transform 0.1s",
                userSelect:"none", WebkitUserSelect:"none", touchAction:"none",
              }}>
              {Li(btn.icon || "star", 20, isDeleting ? T.neg : isDragging ? T.blue : (btn.color || T.blue))}
            </button>
          );
        })}
        {/* + Button wandert mit jedem neuen Icon nach rechts */}
        <button onClick={() => setPickingNew(true)}
          title="icon zur Schnellwahl hinzufügen"
          style={{width:40,height:40,borderRadius:10,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            background:"transparent",border:`1.5px dashed ${T.bds}`,
            cursor:"pointer", userSelect:"none"}}>
          {Li("plus", 18, T.txt2)}
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Kleines Farbwahl-Popup ────────────────────────────────────────────

export { QuickBtnsBar };
