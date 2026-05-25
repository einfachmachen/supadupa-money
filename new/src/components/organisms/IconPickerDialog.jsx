// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useMemo, useState } from "react";
import { Overlay } from "../atoms/Overlay.jsx";
import { ColorPickerPopup } from "../molecules/ColorPickerPopup.jsx";
import { BankIconsGrid } from "./BankIconsGrid.jsx";
import { PagedIconGrid } from "./PagedIconGrid.jsx";
import { SimpleIconsGrid } from "./SimpleIconsGrid.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { ICON_CATEGORIES, Li } from "../../utils/icons.jsx";

function IconPickerDialog({selectedIcon, selectedColor, onSelect, onSelectColor, onClose, showUsed}) {
  const { cats, groups } = useContext(AppCtx);
  const [search, setSearch] = React.useState("");
  const [catIdx, setCatIdx] = React.useState(0);
  const [nav, setNav] = React.useState({page:0,totalPages:1,prev:()=>{},next:()=>{}});
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const activeCat = ICON_CATEGORIES[catIdx] || ICON_CATEGORIES[0];

  // Bereits in Kategorien/Unterkategorien verwendete Icon+Farbe-Kombinationen sammeln
  const usedIcons = React.useMemo(()=>{
    if(!showUsed) return [];
    const set = new Map();
    (cats||[]).forEach(c=>{
      if(c.icon) {
        const key = c.icon+"|"+(c.color||T.blue);
        if(!set.has(key)) set.set(key, {icon:c.icon, color:c.color||T.blue});
      }
      (c.subs||[]).forEach(s=>{
        if(s.icon) {
          const k = s.icon+"|"+(s.color||c.color||T.blue);
          if(!set.has(k)) set.set(k, {icon:s.icon, color:s.color||c.color||T.blue});
        }
      });
    });
    (groups||[]).forEach(g=>{
      if(g.icon) {
        const k = g.icon+"|"+(g.accent||T.blue);
        if(!set.has(k)) set.set(k, {icon:g.icon, color:g.accent||T.blue});
      }
    });
    return [...set.values()];
  }, [cats, groups, showUsed]);

  const content = (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surf2,borderRadius:20,padding:"14px 12px 12px",width:"100%",maxWidth:480,height:"70vh",display:"flex",flexDirection:"column",gap:10}}>
        {/* Titelzeile: Titel | Kategorie-Dropdown | Seitennavigation | ✕ */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{color:T.blue,fontSize:15,fontWeight:700,flexShrink:0}}>Icon wählen</span>
          {/* Aktuelle Farbe — antippen öffnet Farb-Picker */}
          {onSelectColor && (
            <button onClick={()=>setShowColorPicker(true)}
              title="Farbe ändern"
              style={{width:24,height:24,borderRadius:"50%",
                background:selectedColor||T.blue,border:`2px solid rgba(255,255,255,0.2)`,
                cursor:"pointer",flexShrink:0,padding:0}}/>
          )}
          <select value={catIdx} onChange={e=>setCatIdx(Number(e.target.value))}
            style={{flex:1,minWidth:0,background:T.surf,border:`1px solid ${T.bds}`,borderRadius:9,
              padding:"5px 8px",color:T.txt,fontSize:12,outline:"none",cursor:"pointer",
              appearance:"auto"}}>
            {ICON_CATEGORIES.map((c,i)=>(
              <option key={i} value={i}>{c.label}</option>
            ))}
          </select>
          {nav.totalPages > 1 && <>
            <button onClick={nav.prev} disabled={nav.page===0}
              style={{background:T.surf,border:`1px solid ${T.bd}`,borderRadius:7,
                color:nav.page===0?T.txt2:T.txt,cursor:nav.page===0?"default":"pointer",
                width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {Li("chevron-left",13)}
            </button>
            <span style={{color:T.txt2,fontSize:11,minWidth:44,textAlign:"center",flexShrink:0}}>
              {nav.page+1} / {nav.totalPages}
            </span>
            <button onClick={nav.next} disabled={nav.page===nav.totalPages-1}
              style={{background:T.surf,border:`1px solid ${T.bd}`,borderRadius:7,
                color:nav.page===nav.totalPages-1?T.txt2:T.txt,cursor:nav.page===nav.totalPages-1?"default":"pointer",
                width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {Li("chevron-right",13)}
            </button>
          </>}
          <button onClick={onClose}
            style={{background:"none",border:"none",cursor:"pointer",color:T.txt2,padding:4,flexShrink:0}}>
            {Li("x",16)}
          </button>
        </div>
        {/* Bereits-verwendete-Icons-Bereich */}
        {showUsed && usedIcons.length>0 && (
          <div style={{flexShrink:0}}>
            <div style={{color:T.txt2,fontSize:10,fontWeight:600,marginBottom:4,opacity:0.7}}>
              Bereits verwendet ({usedIcons.length})
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,maxHeight:80,overflowY:"auto"}}>
              {usedIcons.map((u,i)=>{
                const isSel = u.icon===selectedIcon && u.color===selectedColor;
                return (
                  <button key={i} onClick={()=>{
                    onSelect(u.icon);
                    if(onSelectColor) onSelectColor(u.color);
                    onClose();
                  }}
                  style={{width:34,height:34,borderRadius:8,flexShrink:0,
                    background:u.color+"22",
                    border:`2px solid ${isSel?T.blue:u.color+"55"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                    {Li(u.icon,16,u.color)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Suchfeld — nicht bei Simple Icons */}
        {!activeCat.simpleIcons&&(
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Icon suchen (z.B. home, car, star…)"
            autoFocus
            style={{width:"100%",background:T.surf,border:`1px solid ${T.bds}`,borderRadius:9,padding:"7px 11px",color:T.txt,fontSize:13,outline:"none",boxSizing:"border-box",flexShrink:0}}/>
        )}
        {/* Icon-Grid */}
        {activeCat.simpleIcons
          ? <SimpleIconsGrid selectedIcon={selectedIcon} selectedColor={selectedColor}
              onSelect={ic=>{onSelect(ic);onClose();}}/>
          : activeCat.bankIcons
          ? <BankIconsGrid selectedIcon={selectedIcon} selectedColor={selectedColor}
              onSelect={ic=>{onSelect(ic);onClose();}}/>
          : <PagedIconGrid search={search} catFilter={activeCat.keywords} selectedIcon={selectedIcon} selectedColor={selectedColor}
              onSelect={ic=>{onSelect(ic);onClose();}}
              onPagination={setNav}/>
        }
      </div>
      {/* Farb-Picker Overlay */}
      {showColorPicker && (
        <ColorPickerPopup
          onClose={()=>setShowColorPicker(false)}
          onSelect={(col)=>{
            onSelectColor && onSelectColor(col);
            setShowColorPicker(false);
          }}
        />
      )}
    </div>
  );
  // Portal: direkt in document.body rendern um Stacking-Context-Probleme zu vermeiden
  return ReactDOM.createPortal(content, document.body);
}

// ══════════════════════════════════════════════════════════════════════

export { IconPickerDialog };
