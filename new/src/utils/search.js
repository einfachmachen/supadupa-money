// Auto-generated module (siehe app-src.jsx)

const normSearch = s => (s||"").toLowerCase().replace(/[‒–—―−]/g,"-");

const matchSearch = (text, search) => {
  if(!search.trim()) return true;
  const h = normSearch(text);
  return normSearch(search).split(" ").filter(Boolean).every(t => h.includes(t));
};

// Betrag aus Suchbegriff extrahieren: "41,85" "=41.85" ">50" "<100"

const matchAmount = (amount, search) => {
  const s = search.trim().replace(",",".");
  const opMatch = s.match(/^([=<>]=?)([\d.]+)$/);
  if(opMatch) {
    const [,op,val] = opMatch;
    const n = parseFloat(val);
    if(isNaN(n)) return false;
    if(op==="="||op==="==") return Math.abs(amount-n)<0.015;
    if(op===">")  return amount > n;
    if(op===">=") return amount >= n;
    if(op==="<")  return amount < n;
    if(op==="<=") return amount <= n;
  }
  // Reine Zahl → ungefährer Match (beginnt mit diesem Wert)
  if(/^[\d.,]+$/.test(s)) {
    const formatted = amount.toFixed(2).replace(".",",");
    const formatted2 = amount.toFixed(2);
    return formatted.startsWith(s.replace(".",",")) || formatted2.startsWith(s.replace(",","."));
  }
  return false;
};

// ─── Theme ───────────────────────────────────────────────────────────────────

export { normSearch, matchSearch, matchAmount };
