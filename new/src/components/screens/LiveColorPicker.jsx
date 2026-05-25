// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { THEMES, getTheme } from "../../theme/themes.js";
import { kvStore } from "../../utils/kvStore.js";

const LCP_KEYS = [
  {g:"Grundfarben",k:"bg",         l:"App-Hintergrund",       css:["bg"]},
  {g:"Grundfarben",k:"surf",       l:"Oberfläche / Karten",   css:["bg"]},
  {g:"Grundfarben",k:"surf2",      l:"Oberfläche 2",          css:["bg"]},
  {g:"Grundfarben",k:"surf3",      l:"Oberfläche 3",          css:["bg"]},
  {g:"Grundfarben",k:"txt",        l:"Text primär",           css:["color"]},
  {g:"Grundfarben",k:"txt2",       l:"Text sekundär",         css:["color"]},
  {g:"Grundfarben",k:"lbl",        l:"Label-Text",            css:["color"]},
  {g:"Grundfarben",k:"bd",         l:"Rahmen fein",           css:["border"]},
  {g:"Grundfarben",k:"bds",        l:"Rahmen stark",          css:["border"]},
  {g:"Akzente",    k:"blue",       l:"Akzentfarbe",           css:["bg","color"]},
  {g:"Akzente",    k:"pos",        l:"Positiv / Einnahme",    css:["color"]},
  {g:"Akzente",    k:"neg",        l:"Negativ / Ausgabe",     css:["color"]},
  {g:"Akzente",    k:"gold",       l:"Gold / Highlight",      css:["color"]},
  {g:"Akzente",    k:"warn",       l:"Warnung",               css:["color"]},
  {g:"Akzente",    k:"err",        l:"Fehlerfarbe",           css:["color"]},
  {g:"Akzente",    k:"mid",        l:"Mitte-Label",           css:["color"]},
  {g:"Hero",       k:"hero_bg",    l:"Hero-Hintergrund",      css:["bg"]},
  {g:"Hero",       k:"logo_c1",    l:"Logo Farbe 1",          css:["bg"]},
  {g:"Hero",       k:"logo_c2",    l:"Logo Farbe 2",          css:["bg"]},
  {g:"Hero",       k:"err_bg",     l:"Fehler-Bg",             css:["bg"]},
  {g:"Panels",     k:"pal_inc_bg", l:"Einnahmen Bg",          css:["bg"]},
  {g:"Panels",     k:"pal_inc_bd", l:"Einnahmen Rahmen",      css:["border"]},
  {g:"Panels",     k:"pal_inc_hdr",l:"Einnahmen Header",      css:["color"]},
  {g:"Panels",     k:"pal_inc_fld",l:"Einnahmen Feld",        css:["bg"]},
  {g:"Panels",     k:"pal_inc_val",l:"Einnahmen Wert",        css:["color"]},
  {g:"Panels",     k:"pal_exp_bg", l:"Ausgaben Bg",           css:["bg"]},
  {g:"Panels",     k:"pal_exp_bd", l:"Ausgaben Rahmen",       css:["border"]},
  {g:"Panels",     k:"pal_exp_fld",l:"Ausgaben Feld",         css:["bg"]},
  {g:"Panels",     k:"pal_tg_bg",  l:"Tagesgeld Bg",          css:["bg"]},
  {g:"Panels",     k:"pal_tg_bd",  l:"Tagesgeld Rahmen",      css:["border"]},
  {g:"Panels",     k:"pal_tg_hdr", l:"Tagesgeld Header",      css:["color"]},
  {g:"Panels",     k:"pal_tg_fld", l:"Tagesgeld Feld",        css:["bg"]},
  {g:"Panels",     k:"pal_tg_val", l:"Tagesgeld Wert",        css:["color"]},
  {g:"Jahresplan", k:"cell_inc",   l:"Zelle Einnahme Text",   css:["color"]},
  {g:"Jahresplan", k:"cell_inc_bg",l:"Zelle Einnahme Bg",     css:["bg"]},
  {g:"Jahresplan", k:"cell_inc_bd",l:"Zelle Einnahme Rahmen", css:["border"]},
  {g:"Tabs",       k:"tab_exp",    l:"Tab Ausgaben",          css:["bg"]},
  {g:"Tabs",       k:"tab_inc",    l:"Tab Einnahmen",         css:["bg"]},
  {g:"Tabs",       k:"tab_pend",   l:"Tab Vorgemerkt",        css:["bg"]},
  {g:"Sonstiges",  k:"on_accent",  l:"Text auf Buttons",      css:["color"]},
  {g:"Sonstiges",  k:"disabled",   l:"Deaktiviert",           css:["bg"]},
  {g:"Sonstiges",  k:"override",   l:"Manuell-Markierung",    css:["color"]},
  {g:"Sonstiges",  k:"vorm_bg",    l:"Vormerkungen Bg",       css:["bg"]},
  {g:"Sonstiges",  k:"vorm_bd",    l:"Vormerkungen Rahmen",   css:["border"]},
  {g:"Bedingte Farben", k:"cond_neg",  l:"Bedingt: Kritisch/Negativ", css:["color"]},
  {g:"Bedingte Farben", k:"cond_warn", l:"Bedingt: Warnung",          css:["color"]},
  {g:"Bedingte Farben", k:"cond_gold", l:"Bedingt: Neutral/Knapp",    css:["color"]},
  {g:"Bedingte Farben", k:"cond_pos",  l:"Bedingt: Positiv/OK",       css:["color"]},
];

function _lcpToHex(c) {
  if (!c) return null;
  if (typeof c === "string" && c.startsWith("#")) return c.slice(0,7);
  const m = (c||"").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return "#"+[m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,"0")).join("");
  return null;
}

function _lcpFindKeys(el) {
  function dist(a,b) {
    if (!a||!b) return 9999;
    const ah=a.replace("#",""),bh=b.replace("#","");
    const ar=[parseInt(ah.slice(0,2),16),parseInt(ah.slice(2,4),16),parseInt(ah.slice(4,6),16)];
    const br=[parseInt(bh.slice(0,2),16),parseInt(bh.slice(2,4),16),parseInt(bh.slice(4,6),16)];
    return Math.sqrt((ar[0]-br[0])**2+(ar[1]-br[1])**2+(ar[2]-br[2])**2);
  }

  const cs = window.getComputedStyle(el);
  const elCol = _lcpToHex(cs.color);
  const elBd  = _lcpToHex(cs.borderTopColor);
  const elBg  = _lcpToHex(cs.backgroundColor); // transparent = null
  const elBgImg = cs.backgroundImage;
  const elHasGrad = elBgImg && elBgImg !== "none" && elBgImg.includes("gradient");
  const elHasBg = elHasGrad || (elBg && cs.backgroundColor !== "rgba(0, 0, 0, 0)");

  // Find best matching T-keys for this element's own colors
  const ownCands = [];
  for (const def of LCP_KEYS) {
    if (def.k === "hero_bg") continue;
    const tv = _lcpToHex(T[def.k]); if (!tv) continue;
    let d = 9999;
    if (def.css.includes("color")  && elCol) d = Math.min(d, dist(tv, elCol));
    if (def.css.includes("border") && elBd)  d = Math.min(d, dist(tv, elBd));
    if (def.css.includes("bg")     && elBg && elHasBg && !elHasGrad) d = Math.min(d, dist(tv, elBg));
    if (d < 60) ownCands.push({...def, d});
  }
  ownCands.sort((a,b) => a.d - b.d);

  // Check if any ancestor has a gradient (for hero_bg)
  let hasGradAncestor = elHasGrad;
  if (!hasGradAncestor) {
    let cur = el.parentElement;
    for (let i = 0; i < 10 && cur && cur !== document.body; i++) {
      const bgImg = window.getComputedStyle(cur).backgroundImage;
      if (bgImg && bgImg !== "none" && bgImg.includes("gradient")) { hasGradAncestor = true; break; }
      cur = cur.parentElement;
    }
  }

  // Decide order: if element has its own strong color/bg match → that comes first
  // hero_bg is added if there's a gradient ancestor, but after own color matches
  const heroDef = LCP_KEYS.find(d => d.k === "hero_bg");
  const heroCandidate = hasGradAncestor ? [{...heroDef, d: ownCands.length > 0 ? 99 : 0}] : [];

  const combined = [...ownCands, ...heroCandidate];
  combined.sort((a,b) => a.d - b.d);
  const seen = new Set();
  return combined.filter(c => { if(seen.has(c.k)) return false; seen.add(c.k); return true; }).slice(0, 4);
}

function LiveColorPicker() {
  const { themeName, setThemeName, setThemeRev } = useContext(AppCtx);
  const [active, setActive]       = React.useState(false);
  const [picker, setPicker]       = React.useState(null);
  const [toast, setToast]         = React.useState(null);
  const [hoverEl, setHoverEl]     = React.useState(null);
  const [btnPos, setBtnPos]       = React.useState({right:16,bottom:90});
  const [pickerPos, setPickerPos] = React.useState(null);
  const isDark = !["light","ios","material","paper"].includes(themeName);

  const startDragBtn = (e) => {
    if(e.button!==0)return; e.preventDefault(); e.stopPropagation();
    const vw=window.innerWidth,vh=window.innerHeight,o={x:e.clientX,y:e.clientY,r:btnPos.right,b:btnPos.bottom};
    const mv=(ev)=>setBtnPos({right:Math.max(0,Math.min(vw-44,o.r-(ev.clientX-o.x))),bottom:Math.max(0,Math.min(vh-44,o.b-(ev.clientY-o.y)))});
    const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };
  const startDragPicker = (e) => {
    if(e.button!==0)return; e.preventDefault(); e.stopPropagation();
    const cur=pickerPos||(picker?{x:picker.x,y:picker.y}:{x:100,y:100});
    const o={x:e.clientX,y:e.clientY,px:cur.x,py:cur.y};
    const vw=window.innerWidth,vh=window.innerHeight;
    const mv=(ev)=>setPickerPos({x:Math.max(0,Math.min(vw-280,o.px+(ev.clientX-o.x))),y:Math.max(0,Math.min(vh-440,o.py+(ev.clientY-o.y)))});
    const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };

  const applyKey = (key, val) => {
    // Always start from the last saved custom_preview or the original theme —
    // never lose previously changed keys
    const base = (themeName === "custom_preview" && THEMES["custom_preview"])
      ? THEMES["custom_preview"]
      : getTheme(themeName);
    const next = { ...base, [key]: val, name: "Live Edit…" };
    THEMES["custom_preview"] = next;
    if (themeName === "custom_preview") setThemeRev(r => r + 1);
    else setThemeName("custom_preview");
    kvStore.setItem("mbt_theme", "custom_preview");
  };

  // The "original" theme key — what was active before we started editing
  const baseThemeName = React.useRef(themeName);
  React.useEffect(() => {
    if (themeName !== "custom_preview") baseThemeName.current = themeName;
  }, [themeName]);

  React.useEffect(()=>{
    if(!active){setHoverEl(null);return;}
    const mv=(e)=>{
      if(!e.target||typeof e.target.closest!=="function")return;
      if(e.target.closest("#lcp-overlay")||e.target.closest("#lcp-activate-btn")||e.target.closest("#lcp-banner"))return;
      setHoverEl(e.target);
    };
    document.addEventListener("mousemove",mv,{passive:true});
    return ()=>document.removeEventListener("mousemove",mv);
  },[active]);

  React.useEffect(()=>{
    if(!active)return;
    const onClick=(e)=>{
      if(!e.target||typeof e.target.closest!=="function")return;
      if(e.target.closest("#lcp-overlay")||e.target.closest("#lcp-activate-btn")||e.target.closest("#lcp-banner"))return;
      e.preventDefault();e.stopPropagation();
      const el=e.target;
      const keys=_lcpFindKeys(el);
      if(!keys.length)return;
      const rect=el.getBoundingClientRect();
      const vw=window.innerWidth,vh=window.innerHeight;
      let x=Math.min(rect.right+10,vw-285),y=Math.min(rect.top,vh-460);
      if(x<4)x=Math.max(4,rect.left-285);if(y<4)y=4;
      setPickerPos(null);
      setPicker({el,x,y,keys,activeKey:keys[0].k,current:extractHex(T[keys[0].k])||"#888888"});
    };
    document.addEventListener("click",onClick,true);
    return ()=>document.removeEventListener("click",onClick,true);
  },[active,themeName]);

  React.useEffect(()=>{
    if(!active){setPicker(null);setHoverEl(null);return;}
    document.body.style.cursor="crosshair";
    return ()=>{document.body.style.cursor="";};
  },[active]);

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),2400);};

  // Extract first hex color from a value (handles gradients and plain colors)
  const extractHex = (val) => {
    if (!val) return null;
    const direct = _lcpToHex(val);
    if (direct) return direct;
    // Try to pull first color from gradient string
    const m1 = val.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
    if (m1) return "#"+(m1[1].length===3?m1[1].split("").map(c=>c+c).join(""):m1[1]);
    const m2 = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m2) return "#"+[m2[1],m2[2],m2[3]].map(n=>parseInt(n).toString(16).padStart(2,"0")).join("");
    return null;
  };

  // For gradient keys, build a new gradient from chosen color
  const buildVal = (key, hex) => {
    const cur = T[key] || "";
    // If the current value is a gradient, replace all color stops with variants of hex
    if (cur.includes("gradient")) {
      // Make second stop slightly lighter/different
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      const lighter = "#"+[Math.min(255,r+30),Math.min(255,g+30),Math.min(255,b+30)].map(v=>v.toString(16).padStart(2,"0")).join("");
      // Preserve the gradient direction
      const dirMatch = cur.match(/linear-gradient\(([^,]+),/);
      const dir = dirMatch ? dirMatch[1] : "135deg";
      return `linear-gradient(${dir},${hex},${lighter})`;
    }
    return hex;
  };

  const saveTheme=()=>{
    const name="Live Edit "+new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
    const key="custom_"+Date.now();
    const theme={...getTheme(themeName),name};
    THEMES[key]=theme;
    try{
      const saved=JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}");
      saved[key]=theme;
      kvStore.setItem("mbt_custom_themes",JSON.stringify(saved));
    }catch{}
    setThemeName(key);
    kvStore.setItem("mbt_theme",key);
    showToast("\u2713 Als \""+name+"\" gespeichert");
    setActive(false);setPicker(null);
  };

  const hoverRect=hoverEl?hoverEl.getBoundingClientRect():null;
  const px=pickerPos?pickerPos.x:(picker?picker.x:0);
  const py=pickerPos?pickerPos.y:(picker?picker.y:0);
  const curVal=picker?(extractHex(T[picker.activeKey])||picker.current||"#888888"):"#888888";
  const keyDef=picker?LCP_KEYS.find(d=>d.k===picker.activeKey)||{l:picker.activeKey,g:""}:{};

  return (
    <>
      {active&&hoverRect&&(
        <div style={{position:"fixed",top:hoverRect.top-2,left:hoverRect.left-2,
          width:hoverRect.width+4,height:hoverRect.height+4,
          border:`2px solid ${T.blue}`,borderRadius:4,pointerEvents:"none",zIndex:997,
          boxShadow:`0 0 0 1px ${T.blue}55`,transition:"all 0.05s"}}/>
      )}
      <div id="lcp-activate-btn" onMouseDown={startDragBtn}
        onClick={()=>{setActive(a=>!a);setPicker(null);}}
        style={{position:"fixed",bottom:btnPos.bottom,right:btnPos.right,zIndex:999,
          width:44,height:44,borderRadius:"50%",
          background:active?T.blue:(isDark?"rgba(40,44,50,0.95)":"rgba(228,232,226,0.95)"),
          border:`2px solid ${active?T.blue:T.bds}`,
          boxShadow:active?`0 0 0 4px ${T.blue}44,0 4px 20px rgba(0,0,0,0.5)`:"0 4px 16px rgba(0,0,0,0.35)",
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"grab",backdropFilter:"blur(10px)"}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#fff":T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {active?<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                 :<><path d="M2 13.5V19a2 2 0 0 0 2 2h3"/><path d="M7.5 2H5a2 2 0 0 0-2 2v3"/><path d="M21 10.5V5a2 2 0 0 0-2-2h-5.5"/><path d="m7 15 2.5-2.5 7-7 2 2-7 7L9 17z"/></>}
        </svg>
      </div>
      {active&&(
        <div id="lcp-banner" style={{position:"fixed",top:0,left:0,right:0,zIndex:998,
          background:`${T.blue}F0`,backdropFilter:"blur(10px)",
          padding:"7px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",
          boxShadow:"0 2px 16px rgba(0,0,0,0.35)",fontSize:12,gap:8}}>
          <span style={{color:"#fff",fontWeight:700,display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 13.5V19a2 2 0 0 0 2 2h3"/><path d="M7.5 2H5a2 2 0 0 0-2 2v3"/><path d="M21 10.5V5a2 2 0 0 0-2-2h-5.5"/><path d="m7 15 2.5-2.5 7-7 2 2-7 7L9 17z"/></svg>
            Element anklicken zum Färben
          </span>
          <div style={{display:"flex",gap:6}}>
            <button onClick={saveTheme}
              style={{background:"rgba(255,255,255,0.25)",border:"1px solid rgba(255,255,255,0.5)",color:"#fff",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>
              💾 Speichern
            </button>
            <button onClick={()=>{setActive(false);setPicker(null);}}
              style={{background:"rgba(0,0,0,0.25)",border:"none",color:"#fff",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
              ✕ Beenden
            </button>
          </div>
        </div>
      )}
      {picker&&(
        <div id="lcp-overlay" style={{position:"fixed",left:px,top:py,zIndex:1000,
          background:"#1e2128",border:"1.5px solid rgba(255,255,255,0.15)",borderRadius:16,
          boxShadow:"0 12px 48px rgba(0,0,0,0.7)",width:272,padding:"13px 13px 11px",
          fontFamily:"inherit",color:"#e8eaf0"}}>
          <div onMouseDown={startDragPicker}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,cursor:"grab",userSelect:"none"}}>
            <div>
              <div style={{color:"#e8eaf0",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                🎨 {keyDef.l}
                <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:400,fontFamily:"monospace"}}>T.{picker.activeKey}</span>
              </div>
              <div style={{color:"rgba(255,255,255,0.3)",fontSize:10,marginTop:1}}>{keyDef.g}</div>
            </div>
            <button onClick={()=>setPicker(null)}
              style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#bbb",cursor:"pointer",fontSize:15,padding:"2px 7px",borderRadius:6,fontFamily:"inherit"}}>×</button>
          </div>
          {picker.activeKey && picker.activeKey.startsWith("cond_") && (
            <div style={{marginBottom:9,padding:"7px 9px",borderRadius:9,
              background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",
              display:"flex",alignItems:"flex-start",gap:7}}>
              <span style={{fontSize:14,flexShrink:0}}>⚡</span>
              <div>
                <div style={{color:"#ffd080",fontSize:11,fontWeight:700,marginBottom:2}}>Bedingte Farbe</div>
                <div style={{color:"#c0a840",fontSize:10,lineHeight:1.5}}>
                  Diese Farbe wird wertabhängig eingesetzt – z.B. für den Kontostand je nach Höhe.
                  Änderungen wirken auf alle Stellen wo dieser Zustand angezeigt wird.
                </div>
              </div>
            </div>
          )}
          {picker.keys.length>1&&(
            <div style={{display:"flex",gap:3,marginBottom:9,flexWrap:"wrap"}}>
              {picker.keys.map(kd=>(
                <button key={kd.k}
                  onClick={()=>setPicker(p=>p?{...p,activeKey:kd.k,current:extractHex(T[kd.k])||"#888"}:p)}
                  style={{padding:"3px 8px",borderRadius:7,fontSize:10,fontWeight:600,cursor:"pointer",
                    fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,
                    border:`1.5px solid ${picker.activeKey===kd.k?"#7ab8f5":"rgba(255,255,255,0.15)"}`,
                    background:picker.activeKey===kd.k?"rgba(122,184,245,0.2)":"rgba(255,255,255,0.05)",
                    color:picker.activeKey===kd.k?"#7ab8f5":"#9098a8"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:extractHex(T[kd.k])||"#888",
                    display:"inline-block",border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}}/>
                  {kd.l}
                </button>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
              <input type="color" value={curVal}
                onChange={e=>{setPicker(p=>p?{...p,current:e.target.value}:p);applyKey(picker.activeKey,buildVal(picker.activeKey,e.target.value));}}
                style={{width:58,height:44,borderRadius:10,border:"2px solid rgba(255,255,255,0.2)",cursor:"pointer",padding:2,background:"rgba(255,255,255,0.05)",display:"block"}}
              />
              {window.EyeDropper?(
                <button onClick={async()=>{try{const r=await new window.EyeDropper().open();setPicker(p=>p?{...p,current:r.sRGBHex}:p);applyKey(picker.activeKey,buildVal(picker.activeKey,r.sRGBHex));}catch{}}}
                  style={{width:58,height:26,borderRadius:8,border:"1.5px solid #7ab8f5",
                    background:"rgba(122,184,245,0.15)",color:"#7ab8f5",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:3,
                    fontSize:10,fontWeight:700,fontFamily:"inherit",padding:0}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8"/>
                  </svg>
                  Pipette
                </button>
              ):(
                <div style={{width:58,height:26,borderRadius:8,border:"1px dashed rgba(255,255,255,0.2)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:9,color:"#888",textAlign:"center",lineHeight:1.2,padding:"0 2px"}}>
                  kein<br/>Browser
                </div>
              )}
            </div>
            <div style={{flex:1}}>
              <div style={{color:"#9098a8",fontSize:10,marginBottom:4}}>Hex-Wert</div>
              <input type="text" value={curVal}
                onChange={e=>{
                  setPicker(p=>p?{...p,current:e.target.value}:p);
                  if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)) applyKey(picker.activeKey,buildVal(picker.activeKey,e.target.value));
                }}
                style={{width:"100%",background:"rgba(255,255,255,0.08)",
                  border:"1px solid rgba(255,255,255,0.18)",borderRadius:9,padding:"7px 10px",
                  color:"#e8eaf0",fontSize:14,outline:"none",fontFamily:"monospace",boxSizing:"border-box"}}
              />
              <div style={{marginTop:5,display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:16,height:16,borderRadius:4,
                  background:extractHex(getTheme(baseThemeName.current)[picker.activeKey])||"#888",
                  border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}}/>
                <span style={{color:"#9098a8",fontSize:10}}>
                  Theme-Standard: {extractHex(getTheme(baseThemeName.current)[picker.activeKey])||"–"}
                </span>
              </div>
            </div>
          </div>
          <div style={{marginBottom:9}}>
            <div style={{color:"#9098a8",fontSize:10,marginBottom:5}}>Theme-Palette:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {["bg","surf","surf2","txt","txt2","blue","pos","neg","gold","warn","err","mid","on_accent","lbl","cond_neg","cond_warn","cond_gold","cond_pos"].map(k=>{
                const v = extractHex(T[k] || getTheme(baseThemeName.current)[k]) || "#888";
                return(
                  <div key={k} onClick={()=>{setPicker(p=>p?{...p,current:v}:p);applyKey(picker.activeKey,buildVal(picker.activeKey,v));}}
                    title={`${k}: ${v}`}
                    style={{width:20,height:20,borderRadius:5,background:v,cursor:"pointer",
                      border:"1.5px solid rgba(255,255,255,0.2)",flexShrink:0}}/>
                );
              })}
            </div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:10}}>
            {[100,80,60,40,20].map(pct=>{
              const base=(curVal||"#888888").replace(/^#/,"").slice(0,6).padEnd(6,"0");
              const r=parseInt(base.slice(0,2),16)||0,g=parseInt(base.slice(2,4),16)||0,b=parseInt(base.slice(4,6),16)||0;
              const rgba=`rgba(${r},${g},${b},${pct/100})`;
              return(
                <div key={pct} onClick={()=>applyKey(picker.activeKey, rgba)}
                  title={`${pct}% Deckkraft`}
                  style={{flex:1,height:20,borderRadius:5,cursor:"pointer",
                    background:rgba,
                    border:"1px solid rgba(255,255,255,0.15)",
                    fontSize:9,color:pct>50?"#fff":"rgba(255,255,255,0.5)",
                    textAlign:"center",lineHeight:"20px",textShadow:"0 1px 3px rgba(0,0,0,0.8)"}}>
                  {pct}%
                </div>
              );
            })}
          </div>
          <button onClick={()=>{
            const base = getTheme(baseThemeName.current);
            const orig = base[picker.activeKey];
            if(orig){setPicker(p=>p?{...p,current:extractHex(orig)||"#888"}:p);applyKey(picker.activeKey,orig);}
          }}
            style={{width:"100%",padding:"7px",borderRadius:9,border:"1px solid rgba(255,255,255,0.18)",
              background:"rgba(255,255,255,0.06)",color:"#bbc",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
            ↩ Auf Theme-Standard zurücksetzen
          </button>
        </div>
      )}
      {toast&&(
        <div style={{position:"fixed",bottom:155,left:"50%",transform:"translateX(-50%)",
          background:"#1e2128",border:"1px solid rgba(122,184,245,0.6)",borderRadius:12,
          padding:"9px 20px",color:"#e8eaf0",fontSize:13,fontWeight:600,
          boxShadow:"0 4px 20px rgba(0,0,0,0.6)",zIndex:1001,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}
    </>
  );
}
// ══════════════════════════════════════════════════════════════════════
// CUSTOM THEME EDITOR
// ══════════════════════════════════════════════════════════════════════

export { LCP_KEYS, LiveColorPicker };
