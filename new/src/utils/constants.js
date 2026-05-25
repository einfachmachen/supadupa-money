// Auto-generated module (siehe app-src.jsx)

const MONTHS_S = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

const MONTHS_F = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

const CUR_YEAR  = 2026;

const CAT_COLORS= ["#FF6B6B","#FFA07A","#4ECDC4","#95E77A","#89C4F4","#66B3FF","#FFD700","#F472B6","#34D399","#FB923C","#60A5FA","#A3E635"];

const INIT_CATS = [];

// ─── Keine Demo-Buchungen ─────────────────────────────────────────────────────

const INIT_TXS = [];

// ─── Zahlungsarten ────────────────────────────────────────────────────────────

const INIT_ACCOUNTS = [];

const BASE_ROWS = [
  {id:"tg_head",      label:"Tagesgeld",              block:"tg",   type:"header",    cols:false},
  {id:"tg_uebertrag", label:"Übertrag Vormonat",       block:"tg",   type:"row",       cols:true},
  {id:"tg_sparen",    label:"TAGESGELD-Sparen",        block:"tg",   type:"highlight", cols:true},
  {id:"tg_belastung", label:"Belastung",               block:"tg",   type:"row",       cols:true},
  {id:"tg_saldo_giro",label:"Saldo Giro vor Gehalt",   block:"tg",   type:"row",       cols:true},
  {id:"tg_vorschlag", label:"Vorschlag eig. Einzahl.", block:"tg",   type:"row",       cols:true},
  {id:"tg_gutschrift",label:"Gutschrift",              block:"tg",   type:"row",       cols:true},
  {id:"tg_einzahlung",label:"eigene Einzahlung",       block:"tg",   type:"row",       cols:true},
  {id:"tg_zinsen",    label:"Zinsen",                  block:"tg",   type:"row",       cols:true},
  {id:"tg_saldo",     label:"TAGESGELD (Saldo)",       block:"tg",   type:"result",    cols:true},
  {id:"giro_head",    label:"Giro",                    block:"giro", type:"header",    cols:false},
  {id:"giro_start",   label:"Anfangssaldo (Vorjahr)",   block:"giro", type:"row",       cols:true},
  {id:"giro_diff",    label:"EINNAHMEN – AUSGABEN",    block:"giro", type:"highlight", cols:true},
  {id:"giro_saldo",   label:"SALDO GIRO",              block:"giro", type:"result",    cols:true},
  {id:"ein_head",     label:"EINNAHMEN",               block:"ein",  type:"highlight", cols:true},
  {id:"aus_head",     label:"AUSGABEN",                block:"aus",  type:"highlight", cols:true},
];

export { MONTHS_S, MONTHS_F, CUR_YEAR, CAT_COLORS, INIT_CATS, INIT_TXS, INIT_ACCOUNTS, BASE_ROWS };
