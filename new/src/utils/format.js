// Auto-generated module (siehe app-src.jsx)

const fmt = v => {
  if (v===""||v==null) return "";
  const n = parseFloat(String(v).replace(",","."));
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(n));
};

const pn  = v => { const n=parseFloat(String(v||"").replace(",",".")); return isNaN(n)?0:Math.round(n*100)/100; };

const uid = () => Math.random().toString(36).slice(2,10);

// Gruppiert Budget-Mitte/Ende-Paare zu einer einzigen Zeile

const dayOf = iso => parseInt(iso.split("-")[2], 10);

// Sortierung für Drilldown-Listen: zwei Sektionen (Mitte 1-14, Ende 15-31)
// Budget-Vormerkungen (_budgetSubId) jeweils ganz oben in ihrer Sektion

const drillSort = (a, b) => {
  // Budget-Mitte (0) → Budget-Ende (1) → alle anderen absteigend nach Datum (2)
  const sectionOf = t => {
    if(!t._budgetSubId) return 2;
    return t._budgetSubId.endsWith("_mitte") ? 0 : 1;
  };
  const sa = sectionOf(a), sb = sectionOf(b);
  if(sa !== sb) return sa - sb;
  return b.date.localeCompare(a.date);
};

export { fmt, pn, uid, dayOf, drillSort };
