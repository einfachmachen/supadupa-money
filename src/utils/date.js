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

// Anzahl der Vorkommen einer wiederkehrenden Serie: von startDate bis endDate
// (inklusive) — oder, falls kein endDate gesetzt ist ("unbegrenzt"), bis zum
// 31.12. sechs Jahre nach dem Startjahr. Inklusive Monatszählung + Math.ceil,
// damit der letzte generierte Termin (startDate + (n-1)*interval Monate)
// niemals über das Enddatum hinausschießt. Frühere, unabhängig voneinander
// geschriebene Kopien dieser Formel (MobileVormerkenModal/VormerkungHub)
// rundeten stattdessen VOR der +1-Verschiebung (Math.round(x)+1 statt
// Math.ceil(x+1)) — bei nicht glatt durch das Intervall teilbaren
// Zeiträumen (z. B. quartalsweise) erzeugte das einen Termin zu viel.
function calcRecurringCount(startDate, endDate, interval) {
  const s = new Date(startDate);
  const e = endDate ? new Date(endDate) : new Date(s.getFullYear() + 6, 11, 31);
  const totalMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Math.max(1, Math.ceil(totalMonths / interval));
}

// Kalendertage addieren (UTC, damit kein Zeitzonen-Versatz). z.B. „+30 Tage".
function isoAddDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`;
}

function parseGermanDate(s) {
  if(!s) return null;
  const t = s.trim();
  // ISO-Format (manche Banken exportieren so): 2026-06-10 oder 2026/6/10.
  // Vorher wurde das zu null → die ganze CSV-Zeile beim Import stillschweigend
  // verworfen (0 Buchungen ohne Fehlermeldung).
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if(m) { const [,y,mo,d]=m; return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  // Deutsches Format: 10.06.2026 oder 10.6.26
  m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if(!m) return null;
  let [,d,mo,y] = m;
  if(y.length===2) y = "20"+y;
  return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

// Betrag "−47,30" / "+3.000,00" / "-47.30" → float

// ── Banktage / TARGET2-Feiertage ──────────────────────────────────────
// Deutsche Banken buchen entlang des TARGET2-Kalenders (Eurosystem). Der ist
// EU-weit EINHEITLICH und hängt NICHT vom Bundesland (auch nicht vom
// Banksitz) ab. Geschlossen sind nur: Neujahr, Karfreitag, Ostermontag,
// 1. Mai, 1. + 2. Weihnachtsfeiertag — plus Samstag/Sonntag. Regionale
// Feiertage (Fronleichnam, Reformationstag, …) verschieben die Buchung nicht.
function easterSunday(year) {
  // Anonymous-Gregorian-Algorithmus
  const a=year%19, b=Math.floor(year/100), c=year%100;
  const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31); // 3=März, 4=April
  const day=((h+l-7*m+114)%31)+1;
  return new Date(year, month-1, day);
}

function isBankHoliday(d) {
  const y=d.getFullYear(), mo=d.getMonth(), day=d.getDate();
  if(mo===0  && day===1)              return true; // Neujahr
  if(mo===4  && day===1)              return true; // Tag der Arbeit
  if(mo===11 && (day===25||day===26)) return true; // 1.+2. Weihnachtstag
  const es=easterSunday(y);
  const gf=new Date(es); gf.setDate(es.getDate()-2);  // Karfreitag
  const em=new Date(es); em.setDate(es.getDate()+1);  // Ostermontag
  const same=(x,z)=>x.getFullYear()===z.getFullYear()&&x.getMonth()===z.getMonth()&&x.getDate()===z.getDate();
  return same(d,gf)||same(d,em);
}

function isBankWorkday(d) {
  const wd=d.getDay();
  if(wd===0||wd===6) return false; // So/Sa
  return !isBankHoliday(d);
}

// Nächster Banktag STRIKT nach isoDate (eine Buchung von heute bucht frühestens
// am nächsten Geschäftstag). Überspringt Wochenenden + TARGET2-Feiertage.
function nextBankWorkday(isoDate) {
  const [y,m,dd]=isoDate.split("-").map(Number);
  const d=new Date(y, m-1, dd);
  do { d.setDate(d.getDate()+1); } while(!isBankWorkday(d));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// Voraussichtliches Belastungsdatum einer Vormerkung. Eine heute (oder früher)
// datierte, noch nicht gebuchte Zahlung wird frühestens am nächsten Banktag dem
// Konto belastet — genau wie bei der manuellen Vormerkung. Bereits in der
// Zukunft datierte Vormerkungen (z. B. geplante Lastschriften, deren Bank das
// Wertstellungsdatum schon kennt) bleiben unverändert.
function pendingDebitDate(isoDate, todayIso) {
  if (!isoDate) return isoDate;
  return isoDate <= todayIso ? nextBankWorkday(isoDate) : isoDate;
}

export { isoAddMonths, isoAddDays, parseGermanDate, isBankWorkday, nextBankWorkday, pendingDebitDate, calcRecurringCount };
