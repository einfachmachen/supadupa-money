// Auto-generated module (siehe app-src.jsx)

import React, { useRef, useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { parseGermanAmount } from "../../utils/csv.js";
import { parseGermanDate } from "../../utils/date.js";
import { Li } from "../../utils/icons.jsx";

function KontostandImportButton({year, accId: importAccId, onImport}) {
  const [statuses, setStatuses] = React.useState([]);
  const fileRef = React.useRef();

  const extractSaldo = (text) => {
    const lines = text.split(/\r?\n/);

    // Finanzblick: "Kontostand am DD.MM.YYYY  X.XXX,XX"
    // DKB-Original-Header: "Kontostand vom DD.MM.YYYY: X.XXX,XX €"
    const kontoMatches = [];
    for(const line of lines) {
      const cols = line.split(";").map(c=>c.replace(/^"+|"+$/g,"").trim());
      const fullText = cols.join(" ");
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
    // Tagesgeld-Zinsen: jede Zeile mit Verwendungszweck beginnend mit "Abrechnung"
    // hat den echten Zinsbetrag in der Betrag-Spalte und das echte Buchungsdatum in Spalte 1.
    // zinsByDate: Buchungsdatum → Zinsbetrag (mit Vorzeichen)
    const zinsByDate = new Map();
    // Header-Zeile finden um Spalten-Indices zu kennen
    let zinsHeaderIdx = -1, zinsHeaders = [];
    for(let i=0; i<Math.min(lines.length,10); i++) {
      const h = lines[i].split(";").map(c=>c.replace(/^"+|"+$/g,"").trim().toLowerCase());
      if(h.includes("buchungsdatum")||h.includes("datum")) { zinsHeaderIdx=i; zinsHeaders=h; break; }
    }
    if(zinsHeaderIdx >= 0) {
      const dateColZ = zinsHeaders.findIndex(h=>h==="buchungsdatum"||h==="datum");
      const amountColZ = zinsHeaders.findIndex(h=>h==="betrag"||h==="amount"||h.includes("umsatz"));
      const descColZ = zinsHeaders.findIndex(h=>h.includes("verwendungszweck")||h.includes("zweck"));
      for(let i=zinsHeaderIdx+1; i<lines.length; i++) {
        const cols = lines[i].split(";").map(c=>c.replace(/^"+|"+$/g,"").trim());
        if(cols.length < 2) continue;
        const desc = descColZ>=0 ? cols[descColZ] : "";
        // Zinsen-Buchung erkennen: Verwendungszweck beginnt mit "Abrechnung" und enthält "Zinsen"
        if(!desc.startsWith("Abrechnung")) continue;
        if(!desc.includes("Zinsen") && !desc.includes("zinsen")) continue;
        const d = parseGermanDate(cols[dateColZ] || "");
        const a = parseFloat((cols[amountColZ]||"").replace(/\./g,"").replace(",","."));
        if(d && !isNaN(a) && a!==0) zinsByDate.set(d, a);
      }
    }

    // Neu: ALLE gefundenen Kontostände als Ankerpunkte zurückgeben.
    // Pro Match wird die zugehörige Zins-Buchung (≤3 Tage vor Stichtag) addiert.
    // Duplikate mit identischem Datum werden gefiltert.
    const balances = [];
    if(kontoMatches.length>0) {
      kontoMatches.sort((a,b)=>a.date.localeCompare(b.date));
      const seenDates = new Set();
      for(const km of kontoMatches) {
        if(seenDates.has(km.date)) continue;
        seenDates.add(km.date);
        // Zinsen zum jeweiligen Kontostand-Datum suchen
        let zins = 0;
        const refTime = new Date(km.date).getTime();
        for(const [d, v] of zinsByDate.entries()) {
          if(!d) continue;
          const diffDays = (refTime - new Date(d).getTime()) / 86400000;
          if(diffDays >= 0 && diffDays <= 3) { zins = v; break; }
        }
        balances.push({saldo: km.amount + zins, date: km.date});
      }
    }

    // DKB: Saldo-Spalte (Fallback, falls keine "Kontostand am"-Treffer)
    if(balances.length===0) {
      let headerIdx=-1, headers=[];
      for(let i=0;i<lines.length;i++){
        const h=lines[i].split(";").map(c=>c.replace(/^"+|"+$/g,"").trim().toLowerCase());
        if(h.includes("buchungsdatum")||h.includes("datum")||h.includes("date")){
          headerIdx=i; headers=h; break;
        }
      }
      if(headerIdx>=0) {
        const dateCol  = headers.findIndex(h=>h.includes("buchungsdatum")||h==="datum"||h==="date");
        const saldoCol = headers.findIndex(h=>h.includes("saldo")||h.includes("kontostand")||h.includes("balance"));
        if(saldoCol>=0) {
          const entries = lines.slice(headerIdx+1).map(l=>{
            const c=l.split(";").map(x=>x.replace(/^"+|"+$/g,"").trim());
            return {date:parseGermanDate(c[dateCol]), saldo:parseGermanAmount(c[saldoCol])};
          }).filter(e=>e.date&&e.saldo!==0).sort((a,b)=>a.date.localeCompare(b.date));
          if(entries.length>0){
            const latest = entries[entries.length-1];
            balances.push({saldo: latest.saldo, date: latest.date});
          }
        }
      }
    }

    // Singular = letzter Anker (Rückwärtskompatibilität)
    const last = balances.length>0 ? balances[balances.length-1] : {saldo: null, date: null};
    return {saldo: last.saldo, date: last.date, balances};
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files||[]);
    if(!files.length) return;
    setStatuses(files.map(f=>({name:f.name, status:"Lese…"})));
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const {saldo, date, balances} = extractSaldo(ev.target.result);
          // Neu: alle gefundenen Anker übergeben (nicht nur den letzten)
          const list = (balances && balances.length>0)
            ? balances
            : (saldo !== null && date ? [{saldo, date}] : []);
          if(list.length > 0) {
            for(const b of list) onImport(b.saldo, b.date);
            const status = list.length === 1
              ? `✓ ${list[0].date}: ${list[0].saldo.toLocaleString("de-DE",{minimumFractionDigits:2})} €`
              : `✓ ${list.length} Ankerpunkte: ${list.map(b=>b.date.slice(5)).join(", ")}`;
            setStatuses(p=>p.map((s,i)=>i===idx ? {...s, status} : s));
          } else {
            setStatuses(p=>p.map((s,i)=>i===idx ? {...s, status:"⚠ Kein Kontostand gefunden"} : s));
          }
        } catch(err) {
          setStatuses(p=>p.map((s,i)=>i===idx ? {...s, status:"✗ Fehler: "+err.message} : s));
        }
      };
      reader.readAsText(file, "utf-8");
    });
    e.target.value="";
  };

  return (
    <div style={{marginTop:8}}>
      <input ref={fileRef} type="file" accept=".csv,.txt" multiple style={{display:"none"}} onChange={handleFiles}/>
      <button onClick={()=>fileRef.current?.click()}
        style={{width:"100%",padding:"7px",borderRadius:8,
          border:`1px solid ${T.blue}44`,background:"rgba(74,159,212,0.08)",
          color:T.blue,fontSize:11,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        {Li("upload",12,T.blue)} Eine oder mehrere CSVs importieren (Endkontostände)
      </button>
      {statuses.map((s,i)=>(
        <div key={i} style={{fontSize:10,marginTop:3,
          color:s.status.startsWith("✓")?T.pos:s.status.startsWith("⚠")||s.status.startsWith("✗")?T.gold:T.txt2}}>
          <span style={{color:T.txt2}}>{s.name}: </span>{s.status}
        </div>
      ))}
    </div>
  );
}

export { KontostandImportButton };
