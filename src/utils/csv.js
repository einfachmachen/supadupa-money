// Auto-generated module (siehe app-src.jsx)

import { KontostandImportButton } from "../components/buttons/KontostandImportButton.jsx";
import { parseGermanDate } from "./date.js";
import { txFingerprint } from "./tx.js";

function parseGermanAmount(s) {
  if(!s) return 0;
  // Normalize all minus variants (Unicode, en-dash, em-dash) → ASCII minus
  const norm = s.replace(/[\u2212\u2013\u2014]/g,"-").trim();
  // Negative in parentheses: "(47,30)" → -47.30
  if(norm.startsWith("(") && norm.endsWith(")"))
    return -(parseFloat(norm.slice(1,-1).replace(/[^\d,.]/g,"").replace(/\.(?=\d{3})/g,"").replace(",","."))||0);
  // Normal sign detection (may have spaces around minus)
  const sign = /^\s*-/.test(norm) ? -1 : 1;
  const clean = norm.replace(/[^\d,.]/g,"").replace(/\.(?=\d{3})/g,"").replace(",",".");
  return sign * (parseFloat(clean)||0);
}

// CSV parsen – erkennt DKB, Finanzblick, generisch

function parseCSV(text, {noGroup=false}={}) {
  const allLines = text.trim().split("\n").map(l=>l.trim()).filter(Boolean);
  if(allLines.length < 2) return {rows:[], format:"unbekannt"};

  // Trennzeichen erkennen
  const sep = allLines[0].includes(";") ? ";" : ",";
  const cleanVal = v => v.replace(/^["']|["']$/g,"").trim();

  // ── Echte Header-Zeile suchen ──────────────────────────────────────────────
  // Manche Banken (DKB, Sparkasse) haben Kontoinfo-Zeilen VOR dem eigentlichen Header.
  // Wir suchen die erste Zeile die bekannte Spaltennamen enthält.
  const headerKeywords = ["buchungsdatum","wertstellung","betrag","verwendungszweck","datum","buchungstag","umsatz","belegdatum","eingangstag","wertstellungstag"];
  let headerIdx = 0;
  for(let i=0; i<Math.min(allLines.length, 10); i++) {
    const low = allLines[i].toLowerCase();
    if(headerKeywords.some(k=>low.includes(k))) { headerIdx = i; break; }
  }
  const lines = allLines.slice(headerIdx); // Ab echter Header-Zeile

  if(lines.length < 2) return {rows:[], format:"unbekannt"};

  // Spalten-Header parsen
  const headers = lines[0].split(sep).map(cleanVal).map(h=>h.toLowerCase());

  // Format erkennen
  let format = "generisch";
  let dateCol=-1, amountCol=-1, descCol=-1, recipientCol=-1;

  // Norisbank Kreditkarte: "belegdatum","eingangstag","verwendungszweck","fremdwährung","betrag"
  // Header: Kreditkartentransaktionen;; ... (4 Zeilen Kopf, dann echter Header)
  if(headers.some(h=>h.includes("belegdatum")||h.includes("eingangstag"))) {
    format = "Norisbank";
    dateCol      = headers.findIndex(h=>h.includes("belegdatum"));
    if(dateCol<0) dateCol = headers.findIndex(h=>h.includes("eingangstag"));
    // Norisbank hat mehrere Betrag-Spalten; letzte "betrag"-Spalte vor "währung" nehmen
    const betragCols = headers.reduce((a,h,i)=>h.includes("betrag")?[...a,i]:a,[]);
    amountCol    = betragCols.length>0 ? betragCols[betragCols.length-1] : -1;
    descCol      = headers.findIndex(h=>h.includes("verwendungszweck"));
    recipientCol = -1; // Norisbank hat keinen separaten Empfänger
  }
  // Sparda-Bank: "buchungstag","wertstellungstag","gegeniban","name gegenkonto","verwendungszweck","umsatz","währung"
  else if(headers.some(h=>h.includes("wertstellungstag")||h.includes("name gegenkonto")||h.includes("gegeniban"))) {
    format = "Sparda";
    dateCol      = headers.findIndex(h=>h.includes("buchungstag"));
    if(dateCol<0) dateCol = headers.findIndex(h=>h.includes("wertstellungstag"));
    amountCol    = headers.findIndex(h=>h==="umsatz"||h.includes("betrag"));
    descCol      = headers.findIndex(h=>h.includes("verwendungszweck"));
    recipientCol = headers.findIndex(h=>h.includes("name gegenkonto")||h.includes("gegenkonto"));
  }
  // DKB: "buchungsdatum", "betrag (€)", "zahlungsempfänger*in", "verwendungszweck"
  else if(headers.some(h=>h.includes("buchungsdatum")||h.includes("wertstellung"))) {
    format = "DKB";
    dateCol      = headers.findIndex(h=>h.includes("buchungsdatum"));
    if(dateCol<0) dateCol = headers.findIndex(h=>h.includes("wertstellung"));
    amountCol    = headers.findIndex(h=>h.includes("betrag"));
    descCol      = headers.findIndex(h=>h.includes("verwendungszweck"));
    recipientCol = headers.findIndex(h=>h.includes("zahlungsempf")||h.includes("empf"));
  }
  // Sparkasse: "buchungstag", "betrag", "beguenstigter", "verwendungszweck"
  else if(headers.some(h=>h.includes("buchungstag"))) {
    format = "Sparkasse";
    dateCol      = headers.findIndex(h=>h.includes("buchungstag"));
    amountCol    = headers.findIndex(h=>h.includes("betrag"));
    descCol      = headers.findIndex(h=>h.includes("verwendungszweck"));
    recipientCol = headers.findIndex(h=>h.includes("beguenstigter")||h.includes("begünstigter")||h.includes("auftraggeber")||h.includes("name gegenkonto"));
  }
  // ING: "buchung", "betrag", "auftraggeber/begünstigter", "verwendungszweck"
  else if(headers.some(h=>h==="buchung"||h.includes("buchungs"))) {
    format = "ING";
    dateCol      = headers.findIndex(h=>h==="buchung"||h.includes("buchungsdatum"));
    amountCol    = headers.findIndex(h=>h.includes("betrag")||h.includes("umsatz"));
    descCol      = headers.findIndex(h=>h.includes("verwendungszweck"));
    recipientCol = headers.findIndex(h=>h.includes("auftraggeber")||h.includes("begünstigter"));
  }
  // PayPal: "date","name","type","status","currency","amount"
  else if(headers.some(h=>h==="name"&&headers.includes("type")&&headers.includes("status"))) {
    format = "PayPal";
    dateCol      = headers.findIndex(h=>h==="date"||h==="datum");
    amountCol    = headers.findIndex(h=>h==="amount"||h==="brutto"||h==="netto");
    descCol      = headers.findIndex(h=>h==="type"||h==="betreff"||h==="subject"||h==="beschreibung"||h==="description");
    recipientCol = headers.findIndex(h=>h==="name");
  }
  // Finanzblick-Export: "buchungsdatum","wertstellungsdatum","empfaenger","verwendungszweck","buchungstext","betrag","iban","konto"
  if(headers.includes("buchungsdatum") && headers.includes("empfaenger") && headers.includes("buchungstext")) {
    format = "Finanzblick";
    dateCol      = headers.indexOf("buchungsdatum");
    amountCol    = headers.indexOf("betrag");
    descCol      = headers.indexOf("verwendungszweck");
    recipientCol = headers.indexOf("empfaenger");
  }
  // DKB: "buchungsdatum","wertstellung","status","zahlungspflichtige*r","zahlungsempfänger*in","verwendungszweck","betrag (€)"
  else if(headers.some(h=>h.includes("zahlungsempf")||h.includes("zahlungspflichtig")) || 
          (headers.includes("buchungsdatum") && headers.some(h=>h.includes("betrag")))) {
    format = "DKB";
    dateCol      = headers.findIndex(h=>h.includes("buchungsdatum"));
    if(dateCol<0) dateCol = headers.findIndex(h=>h.includes("wertstellung"));
    amountCol    = headers.findIndex(h=>h.includes("betrag"));
    descCol      = headers.findIndex(h=>h.includes("verwendungszweck"));
    // Zahlungsempfänger*in bevorzugen (wer das Geld bekommt), nicht Zahlungspflichtige*r (du selbst)
    recipientCol = headers.findIndex(h=>h.includes("zahlungsempfänger")||h==="zahlungsempfänger*in");
    if(recipientCol<0) recipientCol = headers.findIndex(h=>h.includes("zahlungsempf"));
  }
  // PayPal-Direktexport (Deutsch): "Datum","Uhrzeit","Zeitzone","Name","Typ","Status","Währung","Brutto","Gebühr","Netto","Transaktionscode","Referenztransaktionscode"
  else if(headers.some(h=>h.includes("transaktionscode")||h.includes("transaction id")||h.includes("transaktionskennung"))) {
    format = "PayPal-DE";
    dateCol      = headers.findIndex(h=>h==="datum"||h==="date");
    amountCol    = headers.findIndex(h=>h==="brutto"||h==="netto"||h==="betrag"||h==="amount");
    descCol      = headers.findIndex(h=>h==="beschreibung"||h==="betreff"||h==="typ"||h==="type"||h==="description");
    recipientCol = headers.findIndex(h=>h==="name");
  }
  // Finanzblick / N26: "datum", "empfänger", "betrag"
  else if(headers.some(h=>h==="datum"||h==="date")) {
    format = headers.some(h=>h.includes("payee")||h==="amount") ? "N26" : "Finanzblick";
    dateCol      = headers.findIndex(h=>h==="datum"||h==="date");
    amountCol    = headers.findIndex(h=>h.includes("betrag")||h==="amount");
    descCol      = headers.findIndex(h=>h.includes("verwendungszweck")||h.includes("purpose")||h.includes("referenz"));
    recipientCol = headers.findIndex(h=>h.includes("empfänger")||h.includes("auftraggeber")||h.includes("payee"));
  }
  // Generisch
  else {
    dateCol      = headers.findIndex(h=>h.includes("dat"));
    amountCol    = headers.findIndex(h=>h.includes("betr")||h.includes("amount")||h.includes("umsatz")||h.includes("summe"));
    descCol      = headers.findIndex(h=>h.includes("zweck")||h.includes("beschr")||h.includes("desc")||h.includes("ref"));
    recipientCol = headers.findIndex(h=>h.includes("empf")||h.includes("payee")||h.includes("auftr")||h.includes("name"));
  }

  // Spalten für Finanzblick-Zusatzfelder
  const buchungstextCol = headers.indexOf("buchungstext");
  const kontoCol        = headers.indexOf("konto");

  // Finanzblick pending-Flag Spalte suchen — NUR für Finanzblick-Format
  let pendingFlagCol = -1;
  if(format === "Finanzblick") {
    pendingFlagCol = headers.findIndex(h=>h==="vorgemerkt"||h==="pending"||h==="vormerkung");
    // Falls nicht im Header: erste Datenzeile scannen
    if(pendingFlagCol<0 && lines.length>1) {
      const sampleCols = lines[1].split(sep).map(cleanVal);
      sampleCols.forEach((v,i)=>{
        if((v.toLowerCase()==="true"||v.toLowerCase()==="false") && pendingFlagCol<0) {
          pendingFlagCol = i;
        }
      });
    }
  }

  const startLine = 1;
  const rows = [];

  // Spalten für PayPal-Gruppierung
  const txCodeCol  = headers.findIndex(h=>h.includes("transaktionscode")||h.includes("transaction id")||h.includes("transaktionskennung")||h==="txcode");
  const refCodeCol = headers.findIndex(h=>h.includes("referenztransaktionscode")||h.includes("reference transaction")||h.includes("referenzcode"));
  const typeCol    = headers.findIndex(h=>h==="typ"||h==="type");
  const isPayPal   = txCodeCol >= 0;

  for(let i=startLine; i<lines.length; i++) {
    const cols = lines[i].split(sep).map(cleanVal);
    if(cols.length < 2) continue;
    const rawDate   = dateCol>=0 ? cols[dateCol] : "";
    const rawAmount = amountCol>=0 ? cols[amountCol] : "";
    const rawDesc   = descCol>=0 ? cols[descCol] : "";
    const rawRecip  = recipientCol>=0 ? cols[recipientCol] : "";
    const rawBtext  = buchungstextCol>=0 ? cols[buchungstextCol] : "";
    const rawKonto  = kontoCol>=0 ? cols[kontoCol] : "";
    const isoDate   = parseGermanDate(rawDate);
    const amount    = parseGermanAmount(rawAmount);
    if(!isoDate || amount===0) continue;
    if(cols[0]&&cols[0].toLowerCase().startsWith("saldo")) continue;
    // Beschreibung aufbauen: JSON entfernen, sinnvolle Teile kombinieren
    const cleanStr = s => s.replace(/\{[^}]{0,400}\}/g,"").replace(/\s{2,}/g," ").trim();
    const descParts = [rawRecip, rawBtext, cleanStr(rawDesc)].map(cleanStr).filter(Boolean);
    // Duplikate entfernen (Empfänger oft auch in Beschreibung)
    const uniqueParts = descParts.filter((p,i)=>!descParts.slice(0,i).some(prev=>prev.toLowerCase().includes(p.toLowerCase())||p.toLowerCase().includes(prev.toLowerCase())));
    const desc = uniqueParts.join(" · ").trim() || "Unbekannt";
    const txCode  = txCodeCol>=0  ? cols[txCodeCol]  : null;
    const refCode = refCodeCol>=0 ? cols[refCodeCol] : null;
    const rowType = typeCol>=0    ? cols[typeCol]     : rawBtext||null;
    // Finanzblick: pending-Flag auslesen
    const isFbPending = pendingFlagCol>=0 && cols[pendingFlagCol]?.toLowerCase()==="true";
    rows.push({ isoDate, amount, desc, fp: txFingerprint(isoDate, amount, desc), txCode, refCode, rowType, _konto: rawKonto, _fbPending: isFbPending });
  }

  // Finanzblick: pending=true Detailzeilen als Notiz an Hauptbuchung anhängen
  if(pendingFlagCol >= 0 && rows.some(r=>r._fbPending)) {
    // Bestellnummer extrahieren (z.B. "028-2951532-2679557")
    const getOrderNr = r => {
      const m = r.desc.match(/\b(\d{3}-\d{7}-\d{7})\b/);
      return m ? m[1] : null;
    };
    // Detailzeilen nach Bestellnummer gruppieren
    const detailsByOrder = {};
    rows.filter(r=>r._fbPending).forEach(r=>{
      const nr = getOrderNr(r);
      if(nr) {
        if(!detailsByOrder[nr]) detailsByOrder[nr]=[];
        detailsByOrder[nr].push(r);
      }
    });
    // Hauptbuchungen: Bestellnummer in Beschreibung suchen und Notiz anhängen
    rows.filter(r=>!r._fbPending).forEach(r=>{
      const nr = getOrderNr(r);
      if(nr && detailsByOrder[nr]) {
        const details = detailsByOrder[nr];
        // Nur Artikelzeilen — Zeilen mit echtem Produktnamen (nicht Versand/Gutschein/MwSt)
        const skipKeywords = /verpackung|versand|shipping|gutschein|prämien|praemien|mwst|mehrwertsteuer|steuer|zwischensumme|summe/i;
        const articleLines = details
          .filter(d => !skipKeywords.test(d.desc))
          .map(d => d.desc.replace(/Bestellnr\.?\s*[\d-]+/gi,"").replace(/\s{2,}/g," ").trim())
          .filter(Boolean);
        if(articleLines.length > 0) {
          r._detailNote = articleLines.join(" · ").slice(0, 200);
        }
      }
    });
    // Detailzeilen aus rows entfernen — sie wurden als Notiz angehängt
    const mainRows = rows.filter(r=>!r._fbPending);
    rows.length = 0;
    mainRows.forEach(r=>rows.push(r));
  }

  // PayPal: Zeilen mit gleichem Transaktionscode zusammenfassen
  if(!noGroup && isPayPal && rows.length > 0) {
    // Gruppenstruktur aufbauen: txCode → [rows]
    const groups = new Map();
    const orphans = [];
    rows.forEach(r => {
      const key = r.refCode || r.txCode;
      if(!key) { orphans.push(r); return; }
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const merged = [];
    groups.forEach((grpRows, key) => {
      // Hauptzeile: größter Absolutbetrag oder erste Zeile
      const main = grpRows.reduce((a,b)=>Math.abs(a.amount)>=Math.abs(b.amount)?a:b);
      // Nettobetrag: alle Beträge summieren (Gebühren bereits inkl.)
      const netAmount = grpRows.reduce((s,r)=>s+r.amount, 0);
      // Beteiligte Namen (ohne Duplikate, ohne leere)
      const names = [...new Set(grpRows.map(r=>r.desc.split(" – ")[0]).filter(Boolean))].join(", ");
      const types = [...new Set(grpRows.map(r=>r.rowType).filter(Boolean))].join(" · ");
      merged.push({
        isoDate: main.isoDate,
        amount: netAmount || main.amount,
        desc: names || main.desc,
        fp: txFingerprint(main.isoDate, Math.abs(netAmount||main.amount), names||main.desc),
        _paypalRows: grpRows.length,
        _paypalTypes: types,
      });
    });
    orphans.forEach(r => merged.push(r));
    // Nach Datum sortieren
    merged.sort((a,b)=>b.isoDate.localeCompare(a.isoDate));
    return { rows: merged, format: format==="generisch"?"PayPal-DE":format };
  }

  // Finanzblick PayPal: mehrere Gruppierungsstrategien
  if(!noGroup && format === "Finanzblick" && rows.length > 0) {

    // Strategie 1: PP.XXXX.PP-Referenz im Buchungstext oder Beschreibung
    const getPPRef = r => {
      const src = (r.rowType||"") + " " + r.desc;
      const m = src.match(/PP\.[A-Z0-9]+\.PP/i)
             || src.match(/PAYID-[A-Z0-9]+/i)
             || src.match(/\bT-[A-Z0-9]{10,}\b/i);
      return m ? m[0].toUpperCase() : null;
    };

    // Strategie 1b: Rechnungs-Nr / Invoice-Nr als Gruppierschlüssel
    const getRechnungsNr = r => {
      const src = (r.rowType||"") + " " + r.desc;
      const m = src.match(/Rechnungs-Nr[.:]?\s*([A-Z0-9]{6,})/i)
             || src.match(/Invoice[- ]?(?:Nr|No|#)[.:]?\s*([A-Z0-9]{6,})/i)
             || src.match(/\bPP-[A-Z0-9-]{8,}\b/i)
             || src.match(/\bPP-R-[A-Z0-9-]+\b/i);
      return m ? (m[1]||m[0]).toUpperCase() : null;
    };

    // Strategie 2: PAYPAL *HÄNDLERNAME-Kennung
    const getPayPalKey = r => {
      const src = (r.rowType||"") + " " + r.desc;
      const m = src.match(/PP\s*\*\s*([A-Z0-9 ]+)/i);
      if(m) return "PP*"+m[1].trim().toUpperCase().slice(0,20);
      return null;
    };

    // Strategie 3: Empfänger + Betrag + Datum nahe beieinander (±3 Tage)
    // Nur wenn Belastung und Gutschrift gegenläufige Vorzeichen haben
    const getDescDateKey = r => {
      const base = r.desc.split(" · ")[0].split(" – ")[0].trim().toLowerCase().replace(/\s+/g," ");
      const amt = Math.abs(r.amount).toFixed(2);
      // Datum auf 3-Tage-Fenster runden
      const d = new Date(r.isoDate);
      const bucket = Math.floor(d.getTime() / (3 * 86400000));
      return `${base}|${amt}|${bucket}`;
    };

    const tryGroup = (rows, keyFn, requireOppositeSign=false) => {
      const groups = new Map();
      const noKey = [];
      rows.forEach(r => {
        const key = keyFn(r);
        if(key) {
          if(!groups.has(key)) groups.set(key, []);
          groups.get(key).push(r);
        } else noKey.push(r);
      });
      const merged = [];
      let grouped = 0;
      groups.forEach(grpRows => {
        if(grpRows.length === 1) { noKey.push(grpRows[0]); return; }
        // Bei requireOppositeSign: nur zusammenfassen wenn es + und - gibt
        if(requireOppositeSign) {
          const hasPos = grpRows.some(r=>r.amount>0);
          const hasNeg = grpRows.some(r=>r.amount<0);
          if(!hasPos || !hasNeg) { grpRows.forEach(r=>noKey.push(r)); return; }
        }
        grouped += grpRows.length;
        const main = grpRows.reduce((a,b)=>Math.abs(a.amount)>=Math.abs(b.amount)?a:b);
        const netAmount = grpRows.reduce((s,r)=>s+r.amount, 0);
        const realName = grpRows.map(r=>r.desc.split(" · ")[0])
          .find(n=>!n.match(/PP\.\d+|PAYPAL-KONTO|ABBUCHUNG|GUTSCHRIFT/i)) || main.desc;
        merged.push({
          isoDate: main.isoDate,
          amount: Math.abs(netAmount) > 0.01 ? netAmount : main.amount,
          desc: realName,
          fp: txFingerprint(main.isoDate, Math.abs(netAmount||main.amount), realName),
          _paypalRows: grpRows.length,
          _paypalTypes: `${grpRows.length} Positionen`,
        });
      });
      noKey.forEach(r => merged.push(r));
      return { merged, grouped };
    };

    // Strategien der Reihe nach — nur sichere Methoden
    for(const [stratFn, stratName, oppSign] of [
      [getPPRef,       "PP-Referenz",           false],
      [getRechnungsNr, "Rechnungs-Nr",           false],
      [getPayPalKey,   "PP*-Kennung",            false],
      [getDescDateKey, "Belastung+Gegenbuchung", true],
    ]) {
      const { merged, grouped } = tryGroup(rows, stratFn, oppSign);
      if(grouped > 0) {
        merged.sort((a,b)=>b.isoDate.localeCompare(a.isoDate));
        return { rows: merged, format: `Finanzblick-PayPal (${stratName})` };
      }
    }
  }

  // ── Kontostand aus den Vorab-Zeilen (vor dem Header) erkennen ─────────────
  // Gleiche Logik wie KontostandImportButton.extractSaldo, aber auf allLines.
  //
  // Neu: Wir sammeln ALLE gefundenen Kontostände als Stützpunkte (z.B. DKB
  // Quartalsabrechnungen liefern bis zu 4 Stück pro Jahr). detectedBalances
  // ist das vollständige Array; detectedBalance (Singular) bleibt als letzter
  // Eintrag erhalten für Rückwärtskompatibilität.
  let detectedBalance = null;
  let detectedBalances = [];
  (() => {
    // 1a) Finanzblick: "Kontostand am DD.MM.YYYY  X.XXX,XX" im Verwendungszweck der Buchungen
    // 1b) DKB-Original: "Kontostand vom DD.MM.YYYY: X.XXX,XX €" im Datei-Header (vor den Daten)
    const kontoMatches = [];
    for(const line of allLines) {
      const cols = line.split(sep).map(c=>c.replace(/^"+|"+$/g,"").trim());
      const fullText = cols.join(" ");
      // "am" (Finanzblick/Quartalsabrechnung) ODER "vom" (DKB-Original-Header)
      const regex = /Kontostand\s+(?:am|vom)\s+(\d{2}\.\d{2}\.\d{4})\s*:?\s*([\d]{1,3}(?:\.[\d]{3})*,\d{2})/gi;
      let m;
      while((m=regex.exec(fullText))!==null) {
        const d = parseGermanDate(m[1]);
        const a = parseFloat(m[2].replace(/\./g,"").replace(",","."));
        if(d && !isNaN(a) && a!==0) kontoMatches.push({date:d, amount:a});
      }
      if(cols[0]?.toLowerCase().startsWith("saldo")||cols[0]?.toLowerCase().startsWith("kontostand")) {
        const d = parseGermanDate(cols[1]);
        const a = parseFloat((cols[2]||"").replace(/\./g,"").replace(",","."));
        if(!isNaN(a) && a!==0) kontoMatches.push({date:d||cols[1], amount:a});
      }
    }
    if(kontoMatches.length>0) {
      // Sortieren + Duplikate (gleiches Datum) zusammenfassen — falls dieselbe
      // Abrechnung im CSV mehrfach erwähnt wird, nehmen wir nur ein Vorkommen.
      kontoMatches.sort((a,b)=>a.date.localeCompare(b.date));
      const seen = new Set();
      for(const km of kontoMatches) {
        if(seen.has(km.date)) continue;
        seen.add(km.date);
        detectedBalances.push({saldo: km.amount, date: km.date});
      }
    }
    // 2) DKB & Co: Saldo-Spalte in der Datentabelle
    if(detectedBalances.length===0 && lines.length>1) {
      const hdrs = lines[0].split(sep).map(c=>c.replace(/^"+|"+$/g,"").trim().toLowerCase());
      const dateC  = hdrs.findIndex(h=>h.includes("buchungsdatum")||h==="datum"||h==="date"||h.includes("wertstellung"));
      const saldoC = hdrs.findIndex(h=>h.includes("saldo")||h.includes("kontostand")||h.includes("balance"));
      if(saldoC>=0 && dateC>=0) {
        const entries = lines.slice(1).map(l=>{
          const c=l.split(sep).map(x=>x.replace(/^"+|"+$/g,"").trim());
          return {date:parseGermanDate(c[dateC]), saldo:parseGermanAmount(c[saldoC])};
        }).filter(e=>e.date&&e.saldo!==0).sort((a,b)=>a.date.localeCompare(b.date));
        if(entries.length>0){
          // Bei einer Saldo-Spalte pro Buchung wäre es überzogen, jeden Tagessaldo
          // als Anker zu setzen. Wir nehmen nur den letzten (=neuesten) als Anker.
          const latest = entries[entries.length-1];
          detectedBalances.push({saldo: latest.saldo, date: latest.date});
        }
      }
    }
    // Singular = letzter Anker (Rückwärtskompatibilität)
    if(detectedBalances.length>0) detectedBalance = detectedBalances[detectedBalances.length-1];
  })();

  return { rows, format, detectedBalance, detectedBalances };
}

export { parseGermanAmount, parseCSV };
