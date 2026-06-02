// Live-Paletten: INP (Input-Style), PAL (per Transaktionstyp), getBC/gs (Jahresplan-Farben)
import { theme as T } from "./activeTheme.js";

const _INP_BASE = ()=>({width:"100%",background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(0,0,0,0.05)":"rgba(255,255,255,0.05)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"6px 10px",color:T.txt,fontSize:14,outline:"none",marginBottom:9,boxSizing:"border-box"});
const INP = new Proxy({}, { get:(_,k)=>_INP_BASE()[k] });


// ── Lucide SVG Icons ──────────────────────────────────────────────────────────
// iOS-dark palette per transaction type

const PAL = new Proxy({}, { get:(_,type)=>{
  const hexToRgba = (hex, a) => {
    if (!hex||!hex.startsWith("#")) return `rgba(128,128,128,${a})`;
    const h = hex.replace("#",""), f = h.length===3?h.split("").map(c=>c+c).join(""):h;
    return `rgba(${parseInt(f.slice(0,2),16)},${parseInt(f.slice(2,4),16)},${parseInt(f.slice(4,6),16)},${a})`;
  };
  return {
    income:    {bg:T.pal_inc_bg,bd:T.pal_inc_bd,hdr:T.pal_inc_hdr,fld:T.pal_inc_fld,val:T.pal_inc_val,lbl:hexToRgba(T.pal_inc_hdr,0.25)},
    expense:   {bg:T.pal_exp_bg,bd:T.pal_exp_bd,hdr:T.neg,fld:T.pal_exp_fld,val:T.neg,lbl:hexToRgba(T.neg,0.25)},
    tagesgeld: {bg:T.pal_tg_bg, bd:T.pal_tg_bd, hdr:T.pal_tg_hdr,fld:T.pal_tg_fld,val:T.pal_tg_val,lbl:hexToRgba(T.pal_tg_hdr,0.25)},
  }[type] || {};
}});

// Jahresplan colors — Dove Sport Design
// BC is a live getter so it always uses the current T.txt

const getBC = () => {
  const tx  = T.txt;
  const bd  = T.bd;
  const row = {bg:"transparent",tx,bd};
  const blk = { header:row, subheader:row, row, highlight:row, result:row, auto:row, pending:row, accent:tx };
  return { tg:blk, giro:blk, ein:blk, aus:blk };
};
const gs = (block, type) => { const bc=getBC(); return (bc[block]||bc.aus)[type] || bc.aus.row; };

// ─── Initial categories ───────────────────────────────────────────────────────

export { INP, PAL, getBC, gs };
