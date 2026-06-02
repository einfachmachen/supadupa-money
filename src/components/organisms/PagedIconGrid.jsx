// Auto-generated module (siehe app-src.jsx)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeIcon } from "../atoms/SafeIcon.jsx";
import { IconPickerDialog } from "./IconPickerDialog.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { matchIconCategory } from "../../utils/icons.jsx";

function PagedIconGrid({search="", catFilter=null, selectedIcon, selectedColor, onSelect, onPagination}) {
  const ICON_SIZE = 46;
  const [page, setPage] = React.useState(0);
  const [cols, setCols] = React.useState(6);
  const [rows, setRows] = React.useState(5);
  const containerRef = React.useRef(null);
  const col = selectedColor || T.blue;
  const safeSearch = (search || "").toLowerCase().trim();

  React.useEffect(()=>{
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setCols(Math.max(4, Math.floor(w / ICON_SIZE)));
      setRows(Math.max(2, Math.floor(h / ICON_SIZE)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageSize = cols * rows;
  const filtered = React.useMemo(()=>{
    const all = _getAllLucideIcons();
    return all.filter(n => {
      if (safeSearch && !n.includes(safeSearch)) return false;
      if (catFilter) return matchIconCategory(n, catFilter);
      return true;
    });
  }, [safeSearch, catFilter]);

  React.useEffect(()=>{ setPage(0); }, [safeSearch, catFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages - 1);
  const icons      = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // Pagination-Controls nach oben melden
  React.useEffect(()=>{
    onPagination && onPagination({
      page: safePage, totalPages,
      prev: ()=>setPage(p=>Math.max(0,p-1)),
      next: ()=>setPage(p=>Math.min(totalPages-1,p+1)),
    });
  }, [safePage, totalPages]);

  return (
    <div ref={containerRef} style={{flex:1,minHeight:0,overflow:"hidden",
      display:"grid",
      gridTemplateColumns:`repeat(${cols}, 1fr)`,
      gridTemplateRows:`repeat(${rows}, 1fr)`,
      gap:2,
    }}>
      {(icons||[]).map(ic=>(
        <button key={ic} onClick={()=>onSelect(ic)} title={ic}
          style={{borderRadius:9,
            border:selectedIcon===ic?`2px solid ${col}`:"1px solid rgba(255,255,255,0.08)",
            background:selectedIcon===ic?col+"22":T.surf,
            cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
            minWidth:0,minHeight:0}}>
          <SafeIcon name={ic} size={16} color={selectedIcon===ic?col:T.txt2}/>
        </button>
      ))}
    </div>
  );
}

// IconPickerDialog – wiederverwendbarer Icon-Auswahl-Dialog (alle Lucide-Icons)
// Props: selectedIcon, selectedColor, onSelect(iconName), onClose

export { PagedIconGrid };
