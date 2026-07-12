// Auto-generated module (siehe app-src.jsx)

const normSearch = s => (s||"").toLowerCase().replace(/[‒–—―−]/g,"-");

// tags: optionales Array von Tag-Strings (ohne führendes "#", s. TagInput.jsx).
// Ein Suchwort, das mit "#" beginnt, muss gegen die Tags matchen statt gegen
// den Freitext — so filtert "#aida" gezielt auf getaggte Buchungen, auch wenn
// "aida" zufällig auch im Beschreibungstext vorkäme.
const matchSearch = (text, search, tags) => {
  if(!search.trim()) return true;
  const h = normSearch(text);
  const tagSet = (tags||[]).map(t=>normSearch(t));
  return normSearch(search).split(" ").filter(Boolean).every(t => {
    if(t[0]==="#") {
      const q = t.slice(1);
      return q ? tagSet.some(tag=>tag.includes(q)) : tagSet.length>0;
    }
    return h.includes(t);
  });
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

// Alle bereits vergebenen Tags (dedupliziert, alphabetisch) — Grundlage für
// die Autovervollständigung im TagInput, damit man einen einmal benutzten
// Tag (z.B. "aida") beim nächsten Mal nur noch antippen statt neu tippen muss.
const getAllTags = (txs) => {
  const s = new Set();
  (txs||[]).forEach(t => (t.tags||[]).forEach(tag => { if(tag) s.add(tag); }));
  return [...s].sort();
};

// ─── Theme ───────────────────────────────────────────────────────────────────

export { normSearch, matchSearch, matchAmount, getAllTags };
