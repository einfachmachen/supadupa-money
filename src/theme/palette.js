// Live-Paletten: INP (Input-Style), PAL (per Transaktionstyp), getBC/gs (Jahresplan-Farben)
import { theme as T, isLightTheme } from "./activeTheme.js";

// Eingabefeld-Grundstil.
//
// Die Kante kommt als INNERER Schatten, nicht (nur) als `border`: "Rahmen aus"
// ist der Standard der App und setzt per `.no-borders *` jede border-color auf
// transparent — damit blieb von einem Feld nur ein 5%-Schleier uebrig, und der
// ist auf einer hellen Flaeche praktisch unsichtbar. Genau das war der
// Nutzer-Hinweis: "es ist nicht zu erkennen, was Eingabefelder sind".
//
// `currentColor` statt einer Theme-Farbe: der Ring folgt damit automatisch der
// Schriftfarbe des Feldes — dunkel auf hellem Grund, hell auf dunklem, auch
// dort, wo die Karten-Textregel (§4.7) die Farbe umschaltet. Versteht ein
// Browser `color-mix` nicht, faellt nur der Ring weg.
const _INP_BASE = ()=>({width:"100%",background:(isLightTheme())?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.07)",border:`1px solid ${T.bd}`,boxShadow:"inset 0 0 0 1px color-mix(in srgb, currentColor 30%, transparent)",borderRadius:11,padding:"6px 10px",color:T.txt,fontSize:14,outline:"none",marginBottom:9,boxSizing:"border-box"});
// Der Proxy liefert die Werte LIVE (Theme-Wechsel wirkt sofort). Bis hierher
// hatte er nur einen `get`-Trap — und damit ergab `{...INP}` ein LEERES Objekt:
// der Spread fragt `ownKeys`/`getOwnPropertyDescriptor` ab, und die gingen an
// das leere Ziel. An allen 71 Stellen im Code, die `{...INP}` schreiben, kam
// also NICHTS an; die Felder trugen nur, was daneben stand. Genau deshalb war
// nicht zu erkennen, was ein Eingabefeld ist (Nutzer-Hinweis) — der Grundstil
// existierte, wurde aber nie angewandt.
const INP = new Proxy({}, {
  get:(_,k)=>_INP_BASE()[k],
  has:(_,k)=>k in _INP_BASE(),
  ownKeys:()=>Reflect.ownKeys(_INP_BASE()),
  getOwnPropertyDescriptor:(_,k)=>({value:_INP_BASE()[k], enumerable:true, configurable:true}),
});


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
    expense:   {bg:T.pal_exp_bg,bd:T.pal_exp_bd,hdr:T.cond_neg,fld:T.pal_exp_fld,val:T.cond_neg,lbl:hexToRgba(T.cond_neg,0.25)},
    tagesgeld: {bg:T.pal_tg_bg, bd:T.pal_tg_bd, hdr:T.pal_tg_hdr,fld:T.pal_tg_fld,val:T.pal_tg_val,lbl:hexToRgba(T.pal_tg_hdr,0.25)},
  }[type] || {};
}});

// Jahresplan colors
// BC is a live getter so it always uses the current T.txt

const getBC = () => {
  const tx  = T.txt;
  const bd  = T.bd;
  const row = {bg:"transparent",tx,bd};
  const blk = { header:row, subheader:row, row, highlight:row, result:row, auto:row, pending:row, accent:tx };
  return { tg:blk, giro:blk, ein:blk, aus:blk };
};
const gs = (block, type) => { const bc=getBC(); return (bc[block]||bc.aus)[type] || bc.aus.row; };

// Gemeinsame Hoehe aller Bedienzeilen und -felder: Suchfeld und Filter-Pillen
// der Monatsansicht, die Werkzeuge-Zeile, die Zeitraum-Felder im Daten-Manager.
//
// Massgebend war das Suchfeld — es kann gar nicht flacher werden, weil eine
// globale Regel (themes.css, iOS-Zoomsperre) die Schrift von Eingabefeldern
// auf 16px zwingt. Alle uebrigen ziehen darauf nach, damit nebeneinander
// nichts unterschiedlich hoch steht.
//
// Der Wert stand vorher doppelt (MonatScreen und WerkzeugeSection, mit
// gegenseitigem "beide zusammen aendern"-Hinweis) — hier liegt er einmal.
const ZEILE_H = 38;

// Scroll-Reserve am unteren Ende jeder Liste, die UNTER der Reiterleiste
// endet. Ohne sie bleibt der letzte Eintrag dauerhaft halb verdeckt und
// laesst sich nicht freischieben.
//
// 216 = 64px Leiste + 152px Ueberhang des + Knopfes: der wird im arretierten
// Zustand um 94px angehoben und auf 1,5 skaliert (78 -> 117px), steht also
// mit gut der halben Hoehe (58px) ueber der Leistenoberkante.
//
// Die Flaeche ist reiner Scroll-Weg — sie wird erst am Listenende sichtbar.
// NICHT fuer Vollbild-Dialoge: die liegen mit z-Index 300 ueber der Leiste
// und verdecken sie, dort waere die Reserve nur eine Luecke (siehe
// `.mobile-modal.unter-leiste` in themes.css fuer die eine Ausnahme).
const UNTEN_FREI = 216;

// ─── Initial categories ───────────────────────────────────────────────────────

export { INP, PAL, getBC, gs, ZEILE_H, UNTEN_FREI };
