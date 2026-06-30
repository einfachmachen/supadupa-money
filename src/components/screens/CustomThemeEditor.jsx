// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { THEMES, getTheme } from "../../theme/themes.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";

function CustomThemeEditor() {
  const { themeName, setThemeName, setThemeRev } = useContext(AppCtx);

  const FIELD_GROUPS = [
    { label:"Grundfarben", fields:[
      { key:"bg",    label:"Hintergrund",              hint:"Haupt-Hintergrundfarbe der App" },
      { key:"surf",  label:"Oberfläche",               hint:"Karten, Panels, Navigation" },
      { key:"surf2", label:"Oberfläche 2",             hint:"Eingabefelder, Sub-Panels, Zeilen" },
      { key:"txt",   label:"Text (primär)",            hint:"Überschriften & Fließtext" },
      { key:"txt2",  label:"Text (sekundär auf Karte)",hint:"Hints & Labels innerhalb von Karten/Panels" },
      { key:"lbl",   label:"Text (sekundär auf Bg)",   hint:"Sektion-Header & Labels auf dem Haupthintergrund" },
      { key:"bd",    label:"Rahmen (fein)",            hint:"Trennlinien & schwache Borders" },
      { key:"bds",   label:"Rahmen (stark)",           hint:"Akzent-Borders, aktive Felder" },
    ]},
    { label:"Akzentfarben", fields:[
      { key:"blue",  label:"Akzent / Primärfarbe", hint:"Buttons, aktive Icons, Links" },
      { key:"pos",   label:"Positiv / Einnahme",   hint:"Plus-Werte, Gewinn-Anzeigen" },
      { key:"neg",   label:"Negativ / Ausgabe",    hint:"Minus-Werte, Verlust-Anzeigen" },
      { key:"gold",  label:"Gold / Highlight",     hint:"3. Spalte, Badges, Sonderwerte" },
    ]},
    { label:"Einnahmen-Panel", fields:[
      { key:"pal_inc_bg",  label:"Hintergrund",    hint:"Hintergrund der Einnahmen-Karte" },
      { key:"pal_inc_bd",  label:"Rahmen",         hint:"Border der Einnahmen-Karte" },
      { key:"pal_inc_hdr", label:"Header-Text",    hint:"Titelfarbe Einnahmen" },
      { key:"pal_inc_fld", label:"Feld-Hintergrund",hint:"Eingabefeld-Bg in Einnahmen" },
      { key:"pal_inc_val", label:"Wert-Text",      hint:"Betragsfarbe in Einnahmen" },
    ]},
    { label:"Ausgaben-Panel", fields:[
      { key:"pal_exp_bg",  label:"Hintergrund",    hint:"Hintergrund der Ausgaben-Karte" },
      { key:"pal_exp_bd",  label:"Rahmen",         hint:"Border der Ausgaben-Karte" },
      { key:"pal_exp_fld", label:"Feld-Hintergrund",hint:"Eingabefeld-Bg in Ausgaben" },
    ]},
    { label:"Buttons & Status", fields:[
      { key:"on_accent", label:"Text auf Akzent-Buttons",    hint:'Textfarbe auf T.blue / T.pos / T.gold Buttons' },
      { key:"disabled",  label:"Deaktivierter Button",       hint:"Hintergrund deaktivierter Buttons" },
      { key:"warn",      label:"Warnfarbe",                  hint:"Budget-Alarm, Hinweise, Warnungen" },
      { key:"override",  label:"Manuell-Markierung",         hint:'"manuell überschrieben" in Jahresplan' },
      { key:"err",       label:"Fehlerfarbe",                hint:"Sync-Fehler, kritische Fehlerzustände" },
    ]},
    { label:"Jahresplan-Zellen", fields:[
      { key:"cell_inc",    label:"Einnahmen-Zelle Akzent",    hint:"Textfarbe Einnahmen in Jahresplan-Zellen" },
      { key:"cell_inc_bg", label:"Einnahmen-Zelle Hintergrund",hint:"Hintergrund Einnahmen-Zellen Jahresplan" },
      { key:"cell_inc_bd", label:"Einnahmen-Zelle Rahmen",    hint:"Border Einnahmen-Zellen Jahresplan" },
    ]},
    { label:"Tabs & Oberflächen", fields:[
      { key:"tab_exp",  label:"Tab Ausgaben-Typ",            hint:"Hintergrund des Ausgaben-Typ-Tabs" },
      { key:"tab_inc",  label:"Tab Einnahmen-Typ",           hint:"Hintergrund des Einnahmen-Typ-Tabs" },
      { key:"tab_pend", label:"Tab Vorgemerkt-Typ",          hint:"Hintergrund des Vorgemerkt-Typ-Tabs" },
      { key:"surf3",    label:"Oberfläche 3",                hint:"Modals, Sheets, leicht erhöhte Flächen" },
    ]},
    { label:"weitere Elemente", fields:[
      { key:"vorm_bg",  label:"Vormerkungen Hintergrund",    hint:"Hintergrundfarbe der Vormerkungen-Leiste" },
      { key:"vorm_bd",  label:"Vormerkungen Rahmen",         hint:"Rahmenfarbe der Vormerkungen-Leiste" },
      { key:"cf",       label:"Cloudflare-Akzent",           hint:"Farbe für Cloudflare-Sync-Buttons & Icons" },
      { key:"mid",      label:'"Mitte"-Label',               hint:'Farbe des "Mitte"-Labels in Buchungslisten' },
    ]},
    { label:"Tagesgeld-Panel", fields:[
      { key:"pal_tg_bg",  label:"Hintergrund",     hint:"Hintergrund der Tagesgeld-Karte" },
      { key:"pal_tg_bd",  label:"Rahmen",          hint:"Border der Tagesgeld-Karte" },
      { key:"pal_tg_hdr", label:"Header-Text",     hint:"Titelfarbe Tagesgeld" },
      { key:"pal_tg_fld", label:"Feld-Hintergrund",hint:"Eingabefeld-Bg in Tagesgeld" },
      { key:"pal_tg_val", label:"Wert-Text",       hint:"Betragsfarbe in Tagesgeld" },
    ]},
    { label:"⚡ Bedingte Farben", fields:[
      { key:"cond_neg",  label:"Kritisch / Negativ", hint:"Kontostand stark negativ, Budget überschritten" },
      { key:"cond_warn", label:"Warnung",             hint:"Kontostand knapp positiv (≤500€), Budget fast erreicht" },
      { key:"cond_gold", label:"Neutral / Knapp",     hint:"Kontostand mittel (≤1000€)" },
      { key:"cond_pos",  label:"Positiv / OK",        hint:"Kontostand gut (>1000€), Budget eingehalten" },
    ]},
  ];
  const FIELDS = FIELD_GROUPS.flatMap(g=>g.fields);

  // Load saved custom themes from localStorage
  const loadSaved = () => {
    try { return JSON.parse(kvStore.getItem("mbt_custom_themes") || "{}"); }
    catch { return {}; }
  };

  const [saved, setSaved] = React.useState(loadSaved);
  const [open, setOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [showSaveInput, setShowSaveInput] = React.useState(false);

  // Current edit state — start from active theme
  const baseTheme = { ...getTheme(themeName) };
  // Strip derived/non-color keys
  const initEdit = () => {
    const base = getTheme(themeName);
    const toHex = (c) => {
      if (!c) return "#888888";
      if (c.startsWith("#")) return c.slice(0,7);
      const m = c.match(/rgba?\((\d+),(\d+),(\d+)/);
      if (m) return "#" + [m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,"0")).join("");
      return "#888888";
    };
    return {
      bg: toHex(base.bg), surf: toHex(base.surf), surf2: toHex(base.surf2),
      txt: toHex(base.txt), txt2: toHex(base.txt2),
      bd: toHex(base.bd), bds: toHex(base.bds),
      lbl: toHex(base.lbl || base.txt2),
      blue: toHex(base.blue), pos: toHex(base.pos), neg: toHex(base.neg), gold: toHex(base.gold),
      pal_inc_bg:  toHex(base.pal_inc_bg  || "#161900"),
      pal_inc_bd:  toHex(base.pal_inc_bd  || "#3A4800"),
      pal_inc_hdr: toHex(base.pal_inc_hdr || "#C8D400"),
      pal_inc_fld: toHex(base.pal_inc_fld || T.on_accent),
      pal_inc_val: toHex(base.pal_inc_val || "#D4E040"),
      pal_exp_bg:  toHex(base.pal_exp_bg  || "#1F0608"),
      pal_exp_bd:  toHex(base.pal_exp_bd  || "#5C1018"),
      pal_exp_fld: toHex(base.pal_exp_fld || "#240408"),
      pal_tg_bg:   toHex(base.pal_tg_bg   || "#071820"),
      pal_tg_bd:   toHex(base.pal_tg_bd   || "#1A3A48"),
      pal_tg_hdr:  toHex(base.pal_tg_hdr  || "#4A9FC0"),
      pal_tg_fld:  toHex(base.pal_tg_fld  || "#091E2A"),
      pal_tg_val:  toHex(base.pal_tg_val  || "#80C8E0"),
      vorm_bg: toHex(base.vorm_bg || T.tab_pend),
      vorm_bd: toHex(base.vorm_bd ? (base.vorm_bd.startsWith("#") ? base.vorm_bd : base.vorm_bg||T.tab_pend) : T.tab_pend),
      cf:  toHex(base.cf  || "#F6821F"),
      mid: toHex(base.mid || "#67E8F9"),
      on_accent:   toHex(base.on_accent   || "#1A1E00"),
      disabled:    toHex(base.disabled    || "#2a2a2a"),
      warn:        toHex(base.warn        || "#F59E0B"),
      override:    toHex(base.override    || "#B45309"),
      cell_inc:    toHex(base.cell_inc    || "#C8E645"),
      cell_inc_bg: toHex(base.cell_inc_bg || "#0F1A00"),
      cell_inc_bd: toHex(base.cell_inc_bd || "#4A6600"),
      tab_exp:     toHex(base.tab_exp     || "#6B1A10"),
      tab_inc:     toHex(base.tab_inc     || "#2A4A00"),
      tab_pend:    toHex(base.tab_pend    || "#5A3A00"),
      surf3:       toHex(base.surf3       || "#2A2E35"),
      err:         toHex(base.err         || "#FF4444"),
      cond_neg:    toHex(base.cond_neg    || "#C0392B"),
      cond_warn:   toHex(base.cond_warn   || "#E67E22"),
      cond_gold:   toHex(base.cond_gold   || "#F1C40F"),
      cond_pos:    toHex(base.cond_pos    || "#2ECC71"),
    };
  };
  const [edit, setEdit] = React.useState(initEdit);

  // When we open the editor, reset to current theme
  const handleOpen = () => {
    setEdit(initEdit());
    setSaveName("");
    setShowSaveInput(false);
    setOpen(true);
  };

  // Apply a color change live — injects a temporary "custom_preview" theme
  const applyColor = (key, val) => {
    const next = { ...edit, [key]: val };
    setEdit(next);
    // Live preview: inject into THEMES and activate
    THEMES["custom_preview"] = { ...next, name: "Vorschau…" };
    // Always force re-render: if already on custom_preview, setThemeName is a no-op,
    // so we bump themeRev to guarantee the component tree re-renders with the new T.
    if (themeName === "custom_preview") {
      setThemeRev(r => r + 1);
    } else {
      setThemeName("custom_preview");
    }
    kvStore.setItem("mbt_theme", "custom_preview");
  };

  const saveTheme = () => {
    const name = saveName.trim() || "Mein Theme";
    const key = "custom_" + Date.now();
    const theme = { ...edit, name };
    THEMES[key] = theme;
    const next = { ...saved, [key]: theme };
    setSaved(next);
    kvStore.setItem("mbt_custom_themes", JSON.stringify(next));
    setThemeName(key);
    kvStore.setItem("mbt_theme", key);
    setShowSaveInput(false);
    setSaveName("");
    setOpen(false);
  };

  const deleteTheme = (key) => {
    if(!window.confirm("Theme wirklich löschen?")) return;
    delete THEMES[key];
    const next = { ...saved };
    delete next[key];
    setSaved(next);
    kvStore.setItem("mbt_custom_themes", JSON.stringify(next));
    if (themeName === key) {
      setThemeName("dark");
      kvStore.setItem("mbt_theme", "dark");
    }
  };

  // Restore all saved custom themes into THEMES on mount
  React.useEffect(() => {
    const s = loadSaved();
    Object.entries(s).forEach(([k, v]) => { THEMES[k] = v; });
    setSaved(s);
  }, []);

  // Helper: hex color → rgba string with opacity
  function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith("#")) return `rgba(128,128,128,${alpha})`;
    const h = hex.replace("#","");
    const full = h.length === 3 ? h.split("").map(c=>c+c).join("") : h;
    const r = parseInt(full.slice(0,2),16);
    const g = parseInt(full.slice(2,4),16);
    const b = parseInt(full.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const hasSaved = Object.keys(saved).length > 0;

  return (
    <div style={{marginBottom:18}}>
      {/* Header row */}
      <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6,justifyContent:"space-between"}}>
        <span style={{display:"flex",alignItems:"center",gap:6}}>
          {Li("sliders",13,T.blue)} Eigenes Farbschema
        </span>
        <button onClick={handleOpen}
          style={{padding:"5px 12px",borderRadius:10,border:`1px solid ${T.blue}`,background:`${T.blue}22`,
            color:T.blue,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          {Li("pencil",11,T.blue)} Editor öffnen
        </button>
      </div>

      {/* Saved custom themes list */}
      {hasSaved && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
          {Object.entries(saved).map(([key, theme]) => (
            <div key={key} style={{display:"flex",alignItems:"center",gap:4,
              background: themeName===key ? `${theme.blue}22` : T.surf,
              border:`1.5px solid ${themeName===key ? theme.blue : T.bd}`,
              borderRadius:10,padding:"5px 8px 5px 10px",cursor:"pointer"}}
              onClick={()=>{ setThemeName(key); kvStore.setItem("mbt_theme",key); }}>
              {/* 4-Farbpunkte-Symbol (2×2) */}
              <div style={{display:"grid",gridTemplateColumns:"7px 7px",gridTemplateRows:"7px 7px",gap:2,marginRight:5,flexShrink:0}}>
                {["blue","pos","neg","gold"].map(f=>(
                  <div key={f} style={{width:7,height:7,borderRadius:"50%",background:theme[f],border:"1px solid rgba(255,255,255,0.25)"}}/>
                ))}
              </div>
              <span style={{fontSize:11,color:T.txt,fontWeight:themeName===key?700:400,maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {theme.name}
              </span>
              {themeName===key && <span style={{fontSize:9,color:theme.blue,fontWeight:700,marginLeft:2}}>✓</span>}
              <button onClick={e=>{e.stopPropagation();deleteTheme(key);}}
                style={{marginLeft:4,background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:"0 2px",fontSize:13,lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen editor modal */}
      {open && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(12px)",
          zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
          <div style={{background:T.surf,borderRadius:20,width:"100%",maxWidth:520,
            maxHeight:"92vh",display:"flex",flexDirection:"column",
            border:`1px solid ${T.bds}`,boxShadow:"0 20px 60px rgba(0,0,0,0.7)"}}>

            {/* Modal header */}
            <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${T.bd}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div style={{color:T.txt,fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                {Li("sliders",15,T.blue)} Theme-Editor
              </div>
              <button onClick={()=>setOpen(false)}
                style={{background:`rgba(255,255,255,0.08)`,border:"none",color:T.txt2,
                  borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:16,fontFamily:"inherit"}}>×</button>
            </div>

            {/* Live mini previews — 4 panels, sticky above scroll */}
            <div style={{padding:"14px 18px 0",flexShrink:0}}>
              <div style={{display:"flex",gap:7,marginBottom:12,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>

                {/* ── Preview 1: Dashboard / Home ── */}
                <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${edit.bds}`,background:edit.bg,display:"flex",flexDirection:"column",minWidth:150,width:150,flexShrink:0}}>
                  {/* Topbar on surf */}
                  <div style={{background:edit.surf,padding:"5px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${edit.bd}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:edit.blue}}/>
                      <div style={{color:edit.txt,fontWeight:700,fontSize:8}}>SupaDupa Money</div>
                    </div>
                    <div style={{color:edit.txt2,fontSize:7}}>Apr 2026</div>
                  </div>
                  {/* Hero banner on blue */}
                  <div style={{background:edit.blue,padding:"7px 8px 5px"}}>
                    <div style={{color:"#fff",fontSize:7,opacity:0.8,marginBottom:1}}>Kontostand</div>
                    <div style={{color:"#fff",fontSize:13,fontWeight:800,marginBottom:3}}>+569,51 €</div>
                    <div style={{display:"flex",gap:10}}>
                      <div><div style={{color:"rgba(255,255,255,0.7)",fontSize:6}}>Einnahmen</div><div style={{color:"#fff",fontSize:8,fontWeight:700}}>+1.024 €</div></div>
                      <div><div style={{color:"rgba(255,255,255,0.7)",fontSize:6}}>Ausgaben</div><div style={{color:"rgba(255,200,200,0.95)",fontSize:8,fontWeight:700}}>−2.358 €</div></div>
                      <div><div style={{color:"rgba(255,255,255,0.7)",fontSize:6}}>Saldo</div><div style={{color:"rgba(255,220,100,0.95)",fontSize:8,fontWeight:700}}>−1.334 €</div></div>
                    </div>
                  </div>
                  {/* Vormerkungen bar: gold border on bg */}
                  <div style={{margin:"5px 6px 0",borderRadius:6,border:`1px solid ${edit.vorm_bd||edit.gold}`,background:edit.vorm_bg||`${edit.gold}15`,padding:"3px 6px",display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:edit.gold,flexShrink:0}}/>
                    <div style={{color:edit.gold,fontSize:7,fontWeight:700}}>Offene Vormerkungen (26)</div>
                  </div>
                  {/* Section label on bg → lbl */}
                  <div style={{color:edit.lbl||edit.txt2,fontSize:7,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",padding:"5px 8px 2px"}}>Einnahmen</div>
                  {/* Category rows on surf */}
                  {[["Einkommen","+2.856,53",true,true],["weitere Einnahmen","+1.024,35",true,false],["Wohnen & Kind","−1.271,92",false,false],["Sonstiges","−893,85",false,true]].map(([l,v,inc,hasSubtext])=>(
                    <div key={l} style={{padding:"4px 8px",borderBottom:`1px solid ${edit.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:edit.surf}}>
                      <div style={{minWidth:0}}>
                        <div style={{color:edit.txt,fontSize:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{l}</div>
                        {hasSubtext&&<div style={{color:edit.txt2,fontSize:6}}>3 Buchungen</div>}
                      </div>
                      <div style={{color:inc?edit.pos:edit.neg,fontSize:8,fontWeight:700,fontFamily:"monospace",flexShrink:0}}>{v}</div>
                    </div>
                  ))}
                  {/* Nav on surf */}
                  <div style={{background:edit.surf,padding:"5px 4px 4px",display:"flex",justifyContent:"space-around",borderTop:`1px solid ${edit.bds}`,marginTop:"auto"}}>
                    {[["Home",true],["Monat",false],["Jahr",false],["Mehr",false]].map(([t,active])=>(
                      <div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                        <div style={{width:18,height:12,borderRadius:4,background:active?`${edit.blue}22`:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:6,height:6,borderRadius:2,background:active?edit.blue:edit.txt2,opacity:active?1:0.5}}/>
                        </div>
                        <div style={{color:active?edit.blue:edit.txt2,fontSize:6,fontWeight:active?700:400}}>{t}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Preview 2: Buchung-Modal ── */}
                <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${edit.bds}`,background:edit.bg,display:"flex",flexDirection:"column",minWidth:150,width:150,flexShrink:0}}>
                  {/* Modal header on surf */}
                  <div style={{background:edit.surf,padding:"5px 8px",borderBottom:`1px solid ${edit.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{color:edit.txt,fontWeight:700,fontSize:8}}>Neue Buchung</div>
                    <div style={{width:12,height:12,borderRadius:3,background:`${edit.txt2}22`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <div style={{color:edit.txt2,fontSize:8,lineHeight:1}}>×</div>
                    </div>
                  </div>
                  {/* Type selector on bg */}
                  <div style={{display:"flex",gap:4,padding:"5px 6px",background:edit.bg}}>
                    <div style={{flex:1,padding:"3px 0",borderRadius:5,background:`${edit.pos}22`,border:`1px solid ${edit.pos}55`,textAlign:"center",color:edit.pos,fontSize:7,fontWeight:700}}>Einnahme</div>
                    <div style={{flex:1,padding:"3px 0",borderRadius:5,background:`${edit.neg}22`,border:`1px solid ${edit.neg}55`,textAlign:"center",color:edit.neg,fontSize:7,fontWeight:700}}>Ausgabe</div>
                  </div>
                  {/* Einnahmen panel */}
                  <div style={{background:edit.pal_inc_bg,border:`1px solid ${edit.pal_inc_bd}`,margin:"0 6px 4px",borderRadius:7,padding:"5px 6px"}}>
                    <div style={{color:edit.pal_inc_hdr,fontSize:8,fontWeight:700,marginBottom:3}}>EINNAHME</div>
                    <div style={{background:edit.pal_inc_fld,borderRadius:4,padding:"3px 6px",marginBottom:3,border:`1px solid ${edit.pal_inc_bd}`}}>
                      <div style={{color:edit.pal_inc_val,fontSize:6,opacity:0.7,marginBottom:1}}>Kategorie</div>
                      <div style={{color:edit.pal_inc_val,fontSize:8,fontWeight:600}}>Einkommen</div>
                    </div>
                    <div style={{background:edit.pal_inc_fld,borderRadius:4,padding:"3px 6px",border:`1px solid ${edit.pal_inc_bd}`,display:"flex",justifyContent:"space-between"}}>
                      <div style={{color:edit.pal_inc_val,fontSize:6,opacity:0.7}}>Betrag</div>
                      <div style={{color:edit.pal_inc_val,fontSize:9,fontWeight:800}}>+1.024,35 €</div>
                    </div>
                  </div>
                  {/* Ausgaben panel */}
                  <div style={{background:edit.pal_exp_bg,border:`1px solid ${edit.pal_exp_bd}`,margin:"0 6px 4px",borderRadius:7,padding:"5px 6px"}}>
                    <div style={{color:edit.neg,fontSize:8,fontWeight:700,marginBottom:3}}>AUSGABE</div>
                    <div style={{background:edit.pal_exp_fld,borderRadius:4,padding:"3px 6px",marginBottom:3,border:`1px solid ${edit.pal_exp_bd}`}}>
                      <div style={{color:edit.neg,fontSize:6,opacity:0.7,marginBottom:1}}>Kategorie</div>
                      <div style={{color:edit.neg,fontSize:8,fontWeight:600}}>Wohnen & Kind</div>
                    </div>
                    <div style={{background:edit.pal_exp_fld,borderRadius:4,padding:"3px 6px",border:`1px solid ${edit.pal_exp_bd}`,display:"flex",justifyContent:"space-between"}}>
                      <div style={{color:edit.neg,fontSize:6,opacity:0.7}}>Betrag</div>
                      <div style={{color:edit.neg,fontSize:9,fontWeight:800}}>−2.358,07 €</div>
                    </div>
                  </div>
                  {/* Save button */}
                  <div style={{margin:"0 6px 6px",padding:"6px",borderRadius:7,background:edit.blue,textAlign:"center",color:"#fff",fontSize:8,fontWeight:700}}>Speichern</div>
                </div>

                {/* ── Preview 3: Jahresplan Tabelle ── */}
                <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${edit.bds}`,background:edit.bg,display:"flex",flexDirection:"column",minWidth:160,width:160,flexShrink:0}}>
                  {/* Table header on surf */}
                  <div style={{background:edit.surf,borderBottom:`1px solid ${edit.bds}`,display:"flex"}}>
                    <div style={{width:60,padding:"3px 5px",borderRight:`1px solid ${edit.bd}`,color:edit.txt2,fontSize:6,fontWeight:700,flexShrink:0}}>Kategorie</div>
                    {["Jan","Feb","Mär"].map(m=>(
                      <div key={m} style={{flex:1,textAlign:"center",borderRight:`1px solid ${edit.bd}`}}>
                        <div style={{color:edit.txt,fontSize:6,fontWeight:700,padding:"2px 0"}}>{m}</div>
                        <div style={{display:"flex",justifyContent:"space-around",paddingBottom:2}}>
                          {["M","E","akt"].map(s=>(
                            <div key={s} style={{color:s==="akt"?edit.blue:edit.txt2,fontSize:5,fontWeight:700}}>{s}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Section header on surf */}
                  <div style={{background:edit.surf,borderBottom:`1px solid ${edit.bd}`,padding:"3px 5px",color:edit.lbl||edit.txt2,fontSize:6,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>Einnahmen</div>
                  {/* Data rows */}
                  {[["Einkommen",["2.856","2.856","2.856"],true],["weitere Einnahmen",["1.024","1.024","1.024"],true],["Wohnen & Kind",["−1.117","−1.271","−1.271"],false],["Sonstiges",["−558","−893","−893"],false]].map(([label,vals,inc])=>(
                    <div key={label} style={{display:"flex",background:edit.surf,borderBottom:`1px solid ${edit.bd}`}}>
                      <div style={{width:60,padding:"3px 5px",borderRight:`1px solid ${edit.bd}`,color:edit.txt,fontSize:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0}}>{label}</div>
                      {vals.map((v,i)=>(
                        <div key={i} style={{flex:1,display:"flex",justifyContent:"space-around",alignItems:"center",borderRight:`1px solid ${edit.bd}`,padding:"2px 0"}}>
                          <div style={{color:inc?edit.pos:edit.neg,fontSize:5,fontFamily:"monospace"}}>{v}</div>
                          <div style={{color:inc?edit.pos:edit.neg,fontSize:5,fontFamily:"monospace"}}>{v}</div>
                          <div style={{color:edit.gold,fontSize:5,fontFamily:"monospace"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {/* Legend on bg */}
                  <div style={{padding:"3px 5px",background:edit.bg,borderTop:`1px solid ${edit.bds}`,display:"flex",gap:6,flexWrap:"wrap",marginTop:"auto"}}>
                    <div style={{color:edit.lbl||edit.txt2,fontSize:5}}>M = 1–14 · E = alle</div>
                    <div style={{color:edit.gold,fontSize:5,fontWeight:700}}>{"{col3Name}"} = aktuell</div>
                  </div>
                </div>

                {/* ── Preview 4: Settings / Tagesgeld / surf2 ── */}
                <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${edit.bds}`,background:edit.bg,display:"flex",flexDirection:"column",minWidth:150,width:150,flexShrink:0}}>
                  {/* Settings header on surf */}
                  <div style={{background:edit.surf,padding:"5px 8px",borderBottom:`1px solid ${edit.bd}`,color:edit.txt,fontWeight:700,fontSize:8}}>Einstellungen</div>
                  {/* Settings label on bg → lbl */}
                  <div style={{padding:"5px 8px 2px",color:edit.lbl||edit.txt2,fontSize:7,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:6,height:6,borderRadius:2,background:edit.blue}}/>
                    Farbschema
                  </div>
                  {/* Theme swatches on bg */}
                  <div style={{display:"flex",gap:3,padding:"2px 8px 5px"}}>
                    {[edit.bg,edit.surf,edit.blue,edit.pos,edit.neg].map((c,i)=>(
                      <div key={i} style={{flex:1,height:12,borderRadius:4,background:c,border:`1.5px solid ${i===2?edit.bds:edit.bd}`}}/>
                    ))}
                  </div>
                  {/* Input field on surf2 */}
                  <div style={{padding:"0 6px 4px"}}>
                    <div style={{color:edit.lbl||edit.txt2,fontSize:6,marginBottom:2,paddingLeft:1}}>Eigene Bezeichnung</div>
                    <div style={{background:edit.surf2,border:`1px solid ${edit.bd}`,borderRadius:5,padding:"3px 6px",display:"flex",justifyContent:"space-between"}}>
                      <div style={{color:edit.txt,fontSize:7}}>aktuell</div>
                      <div style={{color:edit.txt2,fontSize:6}}>Eingabe</div>
                    </div>
                  </div>
                  {/* Tagesgeld panel */}
                  <div style={{background:edit.pal_tg_bg,border:`1px solid ${edit.pal_tg_bd}`,margin:"0 6px 4px",borderRadius:7,padding:"5px 6px"}}>
                    <div style={{color:edit.pal_tg_hdr,fontSize:7,fontWeight:700,marginBottom:3}}>TAGESGELD</div>
                    <div style={{background:edit.pal_tg_fld,borderRadius:4,padding:"3px 6px",marginBottom:3,border:`1px solid ${edit.pal_tg_bd}`,display:"flex",justifyContent:"space-between"}}>
                      <div style={{color:edit.pal_tg_val,fontSize:6,opacity:0.7}}>Saldo</div>
                      <div style={{color:edit.pal_tg_val,fontSize:8,fontWeight:700}}>8.450,00 €</div>
                    </div>
                  </div>
                  {/* Rahmen & Akzent demo */}
                  <div style={{padding:"3px 8px 6px",display:"flex",flexDirection:"column",gap:3,marginTop:"auto"}}>
                    <div style={{height:1,background:edit.bd}}/>
                    <div style={{display:"flex",gap:3}}>
                      <div style={{flex:1,height:8,borderRadius:3,background:`${edit.gold}33`,border:`1px solid ${edit.gold}77`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{color:edit.gold,fontSize:5,fontWeight:700}}>Gold</div>
                      </div>
                      <div style={{flex:1,height:8,borderRadius:3,background:edit.surf2,border:`1px solid ${edit.bds}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{color:edit.txt2,fontSize:5}}>surf2</div>
                      </div>
                      <div style={{flex:1,height:8,borderRadius:3,background:`${edit.cf||"#F6821F"}22`,border:`1px solid ${edit.cf||"#F6821F"}66`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{color:edit.cf||"#F6821F",fontSize:5,fontWeight:700}}>CF</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      <div style={{flex:1,height:8,borderRadius:3,background:edit.bd,border:`1px solid ${edit.bds}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{color:edit.lbl||edit.txt2,fontSize:5}}>bd</div>
                      </div>
                      <div style={{flex:1,height:8,borderRadius:3,background:edit.vorm_bg||T.tab_pend,border:`1px solid ${edit.vorm_bd||edit.gold}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{color:edit.gold,fontSize:5,fontWeight:700}}>Vorm.</div>
                      </div>
                      <div style={{flex:1,height:8,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{color:edit.mid||"#67E8F9",fontSize:5,fontWeight:700}}>Mitte</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Scrollable color list */}
            <div style={{flex:1,overflowY:"auto",padding:"0 18px 14px",WebkitOverflowScrolling:"touch"}}>

              {/* Color pickers — grouped */}
              {FIELD_GROUPS.map(({label:groupLabel, fields})=>(
                <div key={groupLabel} style={{marginBottom:16}}>
                  <div style={{color:T.txt2,fontSize:10,fontWeight:700,letterSpacing:"0.08em",
                    textTransform:"uppercase",marginBottom:8,paddingLeft:2}}>{groupLabel}</div>
                  {fields.map(({key, label, hint}) => (
                    <div key={key} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,
                      padding:"9px 12px",borderRadius:11,background:T.surf2,border:`1px solid ${T.bd}`}}>
                      <div style={{position:"relative",flexShrink:0}}>
                        <div style={{width:36,height:36,borderRadius:10,background:edit[key]||"#888",
                          border:`2px solid ${T.bds}`,cursor:"pointer",overflow:"hidden"}}>
                          <input type="color" value={(edit[key]||"#888888").length===7?(edit[key]||"#888888"):"#888888"}
                            onChange={e=>applyColor(key, e.target.value)}
                            style={{opacity:0,position:"absolute",inset:0,width:"100%",height:"100%",cursor:"pointer",border:"none",padding:0}}/>
                        </div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:T.txt,fontSize:12,fontWeight:600,marginBottom:1}}>{label}</div>
                        <div style={{color:T.txt2,fontSize:10}}>{hint}</div>
                      </div>
                      <div style={{color:T.txt2,fontSize:10,fontFamily:"monospace",flexShrink:0}}>
                        {(edit[key]||"").toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer: save */}
            <div style={{padding:"12px 18px 24px",borderTop:`1px solid ${T.bd}`,flexShrink:0}}>
              {showSaveInput ? (
                <div style={{display:"flex",gap:8}}>
                  <input autoFocus value={saveName} onChange={e=>setSaveName(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&saveTheme()}
                    placeholder="Name für dieses Theme…"
                    style={{flex:1,padding:"11px 12px",borderRadius:11,border:`1px solid ${T.bds}`,
                      background:T.surf2,color:T.txt,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                  <button onClick={saveTheme}
                    style={{padding:"11px 18px",borderRadius:11,border:"none",background:T.blue,
                      color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                    Speichern
                  </button>
                </div>
              ) : (
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowSaveInput(true)}
                    style={{flex:1,padding:"12px",borderRadius:11,border:"none",background:T.blue,
                      color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    {Li("bookmark",14,"#fff")} Als neues Theme speichern
                  </button>
                  <button onClick={()=>setOpen(false)}
                    style={{padding:"12px 16px",borderRadius:11,border:`1px solid ${T.bds}`,
                      background:"transparent",color:T.txt2,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                    Fertig
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════

export { CustomThemeEditor };
