// Auto-generated module (siehe app-src.jsx)

function isoAddMonths(isoDate, months, lastOfMonth=false) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const newM = m - 1 + months;
  const newY = y + Math.floor(newM / 12);
  const newMonth = ((newM % 12) + 12) % 12 + 1;
  // Letzten gültigen Tag des Zielmonats ermitteln
  const maxDay = new Date(newY, newMonth, 0).getDate();
  const newDay = lastOfMonth ? maxDay : Math.min(d, maxDay);
  return `${newY}-${String(newMonth).padStart(2,"0")}-${String(newDay).padStart(2,"0")}`;
}

function parseGermanDate(s) {
  if(!s) return null;
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if(!m) return null;
  let [,d,mo,y] = m;
  if(y.length===2) y = "20"+y;
  return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

// Betrag "−47,30" / "+3.000,00" / "-47.30" → float

export { isoAddMonths, parseGermanDate };
