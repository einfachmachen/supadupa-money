// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useMemo, useState } from "react";
import { InlineCatSelect } from "../molecules/InlineCatSelect.jsx";
import { InlineNewCat } from "../molecules/InlineNewCat.jsx";
import { VormerkungHub } from "./VormerkungHub.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { isoAddMonths } from "../../utils/date.js";
import { pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchAmount } from "../../utils/search.js";

function RecurringDetectionScreen({onClose, embedded=false, initialTab="vormerkung", onOpenVormHub=null}) {
  const { txs, setTxs, cats, setCats, groups, getCat, getSub, setShowVormHub, setEditVormTx } = useContext(AppCtx);
  const [newCatPanel, setNewCatPanel] = React.useState(null); // suggestion id where panel is open
  const [tab, setTab] = React.useState(initialTab||"vormerkung"); // vormerkung | kategorisieren
  const [phase, setPhase] = React.useState("config"); // config | vendors | results | done
  // Kategorisieren-Tab state
  const [katPhase, setKatPhase] = React.useState("config"); // config | vendors | apply | done
  const [katFromMonth, setKatFromMonth] = React.useState(0);
  const [katFromYear, setKatFromYear] = React.useState(()=>new Date().getFullYear()-5);
  const [katVendors, setKatVendors] = React.useState(null);
  const [katIncluded, setKatIncluded] = React.useState(new Set());
  const [katSearch, setKatSearch] = React.useState("");
  const [katDrill, setKatDrill] = React.useState(null);
  const [katAssign, setKatAssign] = React.useState({}); // vendor → {catId, subId}
  const [katDone, setKatDone] = React.useState(0);
  const [fromMonth, setFromMonth] = React.useState(0);
  const [fromYear, setFromYear] = React.useState(()=>new Date().getFullYear()-1);
  const [vendors, setVendors] = React.useState(null);
  const [included, setIncluded] = React.useState(new Set());
  const [suggestions, setSuggestions] = React.useState([]);
  const [accepted, setAccepted] = React.useState(new Set());
  const [edited, setEdited] = React.useState({});
  const [vendorSearch, setVendorSearch] = React.useState("");
  const [drillVendor, setDrillVendor] = React.useState(null); // vendor key für Drilldown
  const [drillSel, setDrillSel] = React.useState({}); // "vendor::amount" → bool (vormerkung tab)
  const [katDrillSel, setKatDrillSel] = React.useState({}); // "vendor::amount" → bool (kat tab)
  const [drillCatPanel, setDrillCatPanel] = React.useState(null); // "vendor::amount" key
  const [minCount, setMinCount] = React.useState(2); // Mindestanzahl wiederkehrender Buchungen
  const [manualIntervals, setManualIntervals] = React.useState({}); // vendor → interval override

  const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const fmt2 = v => (Math.round(pn(v)*100)/100).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2});

  const normalizeVendor = (desc) => {
    const raw = (desc||"").replace(/\{[^}]{0,300}\}/g,"").trim();
    return raw.split("·")[0].split("–")[0].split("/")[0].trim().toLowerCase().slice(0,40);
  };

  const detectInterval = (sorted) => {
    if(sorted.length < 2) return null;
    const gaps = [];
    for(let i=1;i<sorted.length;i++) {
      const d1=new Date(sorted[i-1].date), d2=new Date(sorted[i].date);
      gaps.push(Math.round((d2-d1)/86400000));
    }
    const avg = gaps.reduce((s,g)=>s+g,0)/gaps.length;
    // Toleranz: ±40% vom erwarteten Abstand
    if(avg>=18&&avg<=42) return "monatlich";
    if(avg>=70&&avg<=110) return "quartalsweise";
    if(avg>=300&&avg<=420) return "jährlich";
    if(avg>=10&&avg<=18) return "14-täglich";
    return null;
  };

  const nextDateFor = (lastDate, interval) => {
    if(interval==="monatlich")      return isoAddMonths(lastDate, 1);
    if(interval==="quartalsweise")  return isoAddMonths(lastDate, 3);
    if(interval==="jährlich")       return isoAddMonths(lastDate, 12);
    if(interval==="14-täglich") {
      const d=new Date(lastDate); d.setDate(d.getDate()+14);
      return d.toISOString().slice(0,10);
    }
    return lastDate;
  };

  // ── Phase 1: Alle Absender mit min. 2 Buchungen sammeln ─────────────
  const buildVendors = () => {
    const fromIso = `${fromYear}-${String(fromMonth+1).padStart(2,"0")}-01`;
    const realTxs = txs.filter(t=>!t.pending&&t.date&&t.date>=fromIso&&!t._linkedTo);
    const byVendor = {};
    realTxs.forEach(tx=>{
      const v = normalizeVendor(tx.desc);
      if(v.length<3) return;
      if(!byVendor[v]) byVendor[v]=[];
      byVendor[v].push(tx);
    });
    const list = Object.entries(byVendor)
      .map(([vendor,txList])=>{
        const sorted=[...txList].sort((a,b)=>a.date.localeCompare(b.date));
        // Betragshäufigkeit: {betrag: anzahl} — gerundet auf 2 Stellen
        const amountCounts={};
        txList.forEach(t=>{
          const a=Math.round(t.totalAmount*100)/100;
          amountCounts[a]=(amountCounts[a]||0)+1;
        });
        // Nur Beträge die mindestens 2x vorkommen
        const repeatedAmounts=Object.entries(amountCounts)
          .filter(([,c])=>c>=minCount)
          .sort(([a],[b])=>Number(a)-Number(b))
          .map(([a,c])=>({amount:Number(a),count:c}));
        // Auch ohne wiederholte Beträge anzeigen wenn manualInterval gesetzt oder txList>=minCount
        if(repeatedAmounts.length===0 && txList.length<minCount) return null;
        const topDesc=Object.entries(txList.reduce((acc,t)=>{
          const d=t.desc||""; acc[d]=(acc[d]||0)+1; return acc;
        },{})).sort((a,b)=>b[1]-a[1])[0]?.[0]||vendor;
        const shortDesc=topDesc.split("·")[0].split("–")[0].trim().slice(0,50);
        const isIncome=txList[0]._csvType==="income"||(txList[0].totalAmount>0&&txList[0]._csvType!=="expense");
        const interval=manualIntervals[vendor]||detectInterval(sorted);
        // Letzter Betrag aus den wiederholten Beträgen
        // Fallback: letzter tatsächlicher Betrag wenn keine Wiederholungen erkannt
        const lastRepeatedAmt = repeatedAmounts.length>0
          ? repeatedAmounts[repeatedAmounts.length-1].amount
          : Math.round(txList[txList.length-1]?.totalAmount*100)/100 || 0;
        const hasExistingVorm = txs.some(t=>t.pending&&!t._linkedTo&&normalizeVendor(t.desc)===vendor);
        return {vendor, shortDesc, count:txList.length, repeatedAmounts, sorted, txList,
          lastDate:sorted[sorted.length-1].date, isIncome, interval,
          lastAmt:lastRepeatedAmt, hasExistingVorm};
      })
      .filter(Boolean)
      .sort((a,b)=>b.count-a.count);
    setVendors(list);
    setIncluded(new Set());
    setVendorSearch("");
    // Pre-fill katAssign mit häufigster Kategorie je Betrag (für Drilldown)
    const preAssignV = {};
    list.forEach(v => {
      v.repeatedAmounts.forEach(({amount}) => {
        const key = v.vendor+"::"+amount;
        const txsForAmt = v.txList.filter(t=>Math.round(t.totalAmount*100)/100===amount);
        const catCountsA = {};
        txsForAmt.forEach(t => {
          const sp = (t.splits||[])[0];
          if(sp?.catId) { const k=sp.catId+"|"+(sp.subId||""); catCountsA[k]=(catCountsA[k]||0)+1; }
        });
        const topA = Object.entries(catCountsA).sort((a,b)=>b[1]-a[1])[0];
        if(topA) { const [c,sb]=topA[0].split("|"); preAssignV[key]={catId:c,subId:sb||""}; }
      });
    });
    setKatAssign(p=>({...p,...preAssignV}));
    setPhase("vendors");
  };

  // ── Phase 2: Nur Absender mit erkanntem Intervall → Vorschläge ──────
  const analyzeVendors = () => {
    const results = [];
    (vendors||[]).filter(v=>included.has(v.vendor)&&v.interval).forEach(v=>{
      const lastAmt = v.lastAmt || v.sorted[v.sorted.length-1].totalAmount;
      const catCounts={};
      v.txList.forEach(t=>{const c=(t.splits||[])[0]?.catId||"";if(c)catCounts[c]=(catCounts[c]||0)+1;});
      const topCatId=Object.entries(catCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
      const subCounts={};
      v.txList.forEach(t=>{const sp=(t.splits||[])[0];if(sp?.catId===topCatId&&sp?.subId)subCounts[sp.subId]=(subCounts[sp.subId]||0)+1;});
      const topSubId=Object.entries(subCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
      results.push({
        id:"rec-"+v.vendor.replace(/\s/g,"_"),
        vendor:v.vendor, shortDesc:v.shortDesc,
        amount:Math.round(lastAmt*100)/100,
        repeatedAmounts:v.repeatedAmounts, interval:v.interval,
        catId:topCatId, subId:topSubId, csvType:v.isIncome?"income":"expense",
        count:v.count, lastDate:v.lastDate,
        nextDate:nextDateFor(v.lastDate,v.interval),
        accountId:v.txList[0].accountId||"acc-giro",
      });
    });
    results.sort((a,b)=>b.count-a.count);
    setSuggestions(results);
    setAccepted(new Set(results.map(r=>r.id)));
    setEdited({});
    setPhase("results");
  };

  const get = (id,field) => edited[id]?.[field]!==undefined ? edited[id][field] : suggestions.find(s=>s.id===id)?.[field];
  const set_ = (id,field,val) => setEdited(p=>({...p,[id]:{...(p[id]||{}),[field]:val}}));

  const createVormerkungen = () => {
    const newTxs=[];
    const endYear=new Date().getFullYear()+6;
    const endDate=new Date(endYear,11,31);
    const addInterval=(d,interval)=>{
      // d ist ein Date-Objekt — wir konvertieren zu ISO und zurück um Monatsüberlauf zu vermeiden
      const iso = d.toISOString().slice(0,10);
      if(interval==="monatlich")     return new Date(isoAddMonths(iso,1)+"T12:00:00");
      if(interval==="quartalsweise") return new Date(isoAddMonths(iso,3)+"T12:00:00");
      if(interval==="jährlich")      return new Date(isoAddMonths(iso,12)+"T12:00:00");
      if(interval==="14-täglich")    { const nd=new Date(d); nd.setDate(nd.getDate()+14); return nd; }
      return new Date(d);
    };
    const skipped=[];
    suggestions.filter(s=>accepted.has(s.id)).forEach(s=>{
      const amount=pn(get(s.id,"amount"));
      const catId=get(s.id,"catId")||"";
      const subId=get(s.id,"subId")||"";
      const desc=get(s.id,"shortDesc")||s.shortDesc;
      const firstDate=get(s.id,"nextDate")||s.nextDate;
      const interval=get(s.id,"interval")||manualIntervals[s.vendor]||s.interval;
      // Dopplungs-Check
      const existing=txs.filter(t=>t.pending&&!t._linkedTo&&
        normalizeVendor(t.desc)===s.vendor&&
        Math.round(t.totalAmount*100)/100===amount);
      if(existing.length>0){skipped.push(desc);return;}
      // Startdatum nicht in der Vergangenheit — vorwärts iterieren bis heute
      let current=new Date(firstDate+"T12:00:00");
      const todayMs=new Date(); todayMs.setHours(0,0,0,0);
      while(current<todayMs){current=addInterval(current,interval);}
      const seriesId="series-"+uid();
      const dates=[];
      while(current<=endDate){dates.push(current.toISOString().slice(0,10));current=addInterval(current,interval);}
      dates.forEach((date,i)=>newTxs.push({
        id:"pend-"+uid(), date, desc, totalAmount:amount, pending:true,
        _csvType:s.csvType, accountId:s.accountId,
        _seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:dates.length,
        splits:catId?[{id:uid(),catId,subId,amount}]:[{id:uid(),catId:"",subId:"",amount}],
      }));
    });
    setTxs(p=>[...p,...newTxs]);
    if(skipped.length>0) alert(`Übersprungen (bereits Vormerkungen vorhanden):\n${skipped.join(", ")}`);
    setPhase("done");
  };

  // ── Kategorisieren: Absender sammeln ───────────────────────────────────────
  const buildKatVendors = () => {
    const fromIso = `${katFromYear}-${String(katFromMonth+1).padStart(2,"0")}-01`;
    const realTxs = txs.filter(t=>!t.pending&&t.date&&t.date>=fromIso&&!t._linkedTo);
    const byVendor = {};
    realTxs.forEach(tx=>{
      const v = normalizeVendor(tx.desc);
      if(v.length<3) return;
      if(!byVendor[v]) byVendor[v]=[];
      byVendor[v].push(tx);
    });
    const list = Object.entries(byVendor)
      .map(([vendor,txList])=>{
        const sorted=[...txList].sort((a,b)=>a.date.localeCompare(b.date));
        const amountCounts={};
        txList.forEach(t=>{const a=Math.round(t.totalAmount*100)/100; amountCounts[a]=(amountCounts[a]||0)+1;});
        const repeatedAmounts=Object.entries(amountCounts).filter(([,c])=>c>=2)
          .sort(([a],[b])=>Number(a)-Number(b)).map(([a,c])=>({amount:Number(a),count:c}));
        if(repeatedAmounts.length===0) return null;
        const topDesc=Object.entries(txList.reduce((acc,t)=>{const d=t.desc||"";acc[d]=(acc[d]||0)+1;return acc;},{}))
          .sort((a,b)=>b[1]-a[1])[0]?.[0]||vendor;
        const shortDesc=topDesc.split("·")[0].split("–")[0].trim().slice(0,50);
        const isIncome=txList[0]._csvType==="income"||(txList[0].totalAmount>0&&txList[0]._csvType!=="expense");
        return {vendor, shortDesc, count:txList.length, repeatedAmounts, sorted, txList,
          firstDate:sorted[0].date, lastDate:sorted[sorted.length-1].date, isIncome};
      }).filter(Boolean).sort((a,b)=>b.count-a.count);
    setKatVendors(list);
    setKatIncluded(new Set());
    setKatSearch("");
    setKatDrill(null);
    // Pre-fill katAssign mit häufigster Kategorie je Absender und je Betrag
    const preAssign = {};
    list.forEach(v => {
      // Je Absender (für Apply-Phase)
      const catCountsV = {};
      v.txList.forEach(t => {
        const sp = (t.splits||[])[0];
        if(sp?.catId) {
          const k = sp.catId+"|"+(sp.subId||"");
          catCountsV[k] = (catCountsV[k]||0) + 1;
        }
      });
      const topV = Object.entries(catCountsV).sort((a,b)=>b[1]-a[1])[0];
      if(topV) {
        const [c,sb] = topV[0].split("|");
        preAssign[v.vendor] = {catId:c, subId:sb||""};
      }
      // Je Betrag (für Drilldown)
      v.repeatedAmounts.forEach(({amount}) => {
        const key = "kat::"+v.vendor+"::"+amount;
        const txsForAmt = v.txList.filter(t=>Math.round(t.totalAmount*100)/100===amount);
        const catCountsA = {};
        txsForAmt.forEach(t => {
          const sp = (t.splits||[])[0];
          if(sp?.catId) {
            const k = sp.catId+"|"+(sp.subId||"");
            catCountsA[k] = (catCountsA[k]||0) + 1;
          }
        });
        const topA = Object.entries(catCountsA).sort((a,b)=>b[1]-a[1])[0];
        if(topA) {
          const [c,sb] = topA[0].split("|");
          preAssign[key] = {catId:c, subId:sb||""};
        }
      });
    });
    setKatAssign(preAssign);
    setKatPhase("vendors");
  };

  // ── Kategorisieren: Buchungen neu kategorisieren ─────────────────────────
  const applyKatAssign = () => {
    let count=0;
    setTxs(prev=>{
      let next=[...prev];
      (katVendors||[]).filter(v=>katIncluded.has(v.vendor)&&katAssign[v.vendor]?.catId).forEach(v=>{
        const {catId,subId}=katAssign[v.vendor];
        next=next.map(t=>{
          if(t.pending||!t.date) return t;
          const vn=normalizeVendor(t.desc);
          if(vn!==v.vendor) return t;
          count++;
          return {...t, splits:[{id:uid(),catId,subId:subId||"",amount:t.totalAmount}]};
        });
      });
      return next;
    });
    setKatDone(count);
    setKatPhase("done");
  };

  const allCatOpts = React.useMemo(()=>{
    const opts=[];
    (cats||[]).forEach(cat=>(cat.subs||[]).forEach(sub=>opts.push({catId:cat.id,subId:sub.id,label:`${cat.name} / ${sub.name}`})));
    return opts;
  },[cats]);

  const wrapStyle = embedded
    ? {display:"flex",flexDirection:"column",maxHeight:"65vh",overflow:"hidden",
       fontFamily:"'SF Pro Text',sans-serif",background:T.surf2,borderRadius:12}
    : {position:"fixed",inset:0,background:T.bg,zIndex:15,display:"flex",flexDirection:"column",
       fontFamily:"'SF Pro Text',-apple-system,sans-serif"};

  return (
    <div style={wrapStyle}>
      {/* Header */}
      <div style={{background:T.surf,borderBottom:`1px solid ${T.bds}`,padding:"12px 16px",
        display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={()=>{
          if(tab==="vormerkung"){
            if(phase==="vendors") setPhase("config");
            else if(phase==="results") setPhase("vendors");
            else onClose();
          } else {
            if(katPhase==="vendors") setKatPhase("config");
            else if(katPhase==="apply") setKatPhase("vendors");
            else onClose();
          }
        }}
          style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,
            borderRadius:10,width:34,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {Li("arrow-left",13)}
        </button>
        <div style={{flex:1}}>
          <div style={{color:T.gold,fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
            {Li("repeat",14,T.gold)} Wiederkehrende Buchungen erkennen
          </div>
          <div style={{color:T.txt2,fontSize:10,marginTop:1}}>
            {tab==="vormerkung"&&(
              phase==="config"?"zeitraum wählen":
              phase==="vendors"?`Schritt 1/2 — Absender (${(vendors||[]).length} gefunden)`:
              phase==="results"?`Schritt 2/2 — Vorschläge (${suggestions.length} Muster)`:
              "fertig"
            )}
            {tab==="kategorisieren"&&(
              katPhase==="config"?"zeitraum wählen":
              katPhase==="vendors"?`Schritt 1/2 — Absender (${(katVendors||[]).length} gefunden)`:
              katPhase==="apply"?`Schritt 2/2 — Kategorien zuweisen`:
              "fertig"
            )}
          </div>
        </div>
        {((tab==="vormerkung"&&phase==="vendors")||(tab==="kategorisieren"&&katPhase==="vendors"))&&(
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.2)",
            borderRadius:8,padding:"4px 8px"}}>
            {Li("search",12,T.txt2)}
            <input value={tab==="vormerkung"?vendorSearch:katSearch}
              onChange={e=>tab==="vormerkung"?setVendorSearch(e.target.value):setKatSearch(e.target.value)}
              placeholder="suchen…"
              style={{background:"transparent",border:"none",color:T.txt,fontSize:11,outline:"none",width:70}}/>
            {(tab==="vormerkung"?vendorSearch:katSearch)&&(
              <button onClick={()=>tab==="vormerkung"?setVendorSearch(""):setKatSearch("")}
                style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:0,fontSize:10}}>✕</button>
            )}
          </div>
        )}
      </div>
      {/* Tab-Switch */}
      {(phase==="config"||phase==="done")&&(katPhase==="config"||katPhase==="done")&&(
        <div style={{display:"flex",background:T.surf,borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
          {[["vormerkung","vormerkungen erstellen","clock"],["kategorisieren","buchungen kategorisieren","tag"]].map(([id,label,icon])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:1,padding:"10px 8px",border:"none",borderBottom:`2px solid ${tab===id?T.gold:"transparent"}`,
                background:"transparent",color:tab===id?T.gold:T.txt2,fontSize:12,fontWeight:tab===id?700:400,
                cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {Li(icon,12,tab===id?T.gold:T.txt2)} {label}
            </button>
          ))}
        </div>
      )}

      {/* ══ TAB: VORMERKUNGEN ══ */}
      {tab==="vormerkung"&&(<>
      {/* ── PHASE 0: Konfiguration ── */}
      {phase==="config"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",gap:16,padding:32}}>
          {Li("search",48,T.gold)}
          <div style={{color:T.txt,fontSize:16,fontWeight:700,textAlign:"center"}}>
            Buchungen nach Mustern durchsuchen
          </div>
          <div style={{background:T.surf,borderRadius:12,padding:"14px 16px",width:"100%",maxWidth:320,border:`1px solid ${T.bd}`}}>
            <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:10}}>Analyse ab Monat / Jahr:</div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
              <select value={fromMonth} onChange={e=>setFromMonth(Number(e.target.value))}
                style={{flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:8,padding:"8px 10px",color:T.txt,fontSize:13,outline:"none",cursor:"pointer"}}>
                {MONTHS.map((m,i)=><option key={i} value={i} style={{background:T.surf2}}>{m}</option>)}
              </select>
              <input type="number" value={fromYear} onChange={e=>setFromYear(Number(e.target.value))}
                style={{width:80,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:8,padding:"8px 10px",color:T.txt,fontSize:13,textAlign:"center",outline:"none"}}/>
            </div>
            <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6}}>Mindestanzahl Buchungen:</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[2,1,3,4].map(n=>(
                <button key={n} onClick={()=>setMinCount(n)}
                  style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",cursor:"pointer",
                    fontFamily:"inherit",fontSize:12,fontWeight:700,
                    background:minCount===n?T.gold:"rgba(255,255,255,0.08)",
                    color:minCount===n?T.on_accent:T.txt2}}>
                  {n}×
                </button>
              ))}
            </div>
            <div style={{color:T.txt2,fontSize:10,marginTop:4}}>
              {txs.filter(t=>!t.pending&&t.date>=`${fromYear}-${String(fromMonth+1).padStart(2,"0")}-01`).length} Buchungen im Zeitraum
            </div>
          </div>
          <button onClick={buildVendors}
            style={{padding:"14px 32px",borderRadius:11,border:"none",background:T.gold,
              color:T.on_accent,fontSize:15,fontWeight:700,cursor:"pointer",
              display:"flex",alignItems:"center",gap:8}}>
            {Li("list",16,T.on_accent)} Absender anzeigen
          </button>
        </div>
      )}

      {/* ── PHASE 1: Absender-Liste ── */}
      {phase==="vendors"&&vendors&&(
        <>
          <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.bd}`,flexShrink:0,
            display:"flex",alignItems:"center",gap:8}}>
            <div style={{color:T.txt2,fontSize:11,flex:1}}>
              Anhaken = einschließen · <span style={{color:T.gold,fontWeight:700}}>
                {included.size} ausgewählt
              </span>
            </div>
            <button onClick={()=>setIncluded(new Set())}
              style={{background:"transparent",border:`1px solid ${T.bds}`,color:T.txt2,borderRadius:7,padding:"3px 8px",fontSize:10,cursor:"pointer"}}>
              Alle ab
            </button>
            <button onClick={()=>setIncluded(new Set(vendors.map(v=>v.vendor)))}
              style={{background:"transparent",border:`1px solid ${T.bds}`,color:T.txt2,borderRadius:7,padding:"3px 8px",fontSize:10,cursor:"pointer"}}>
              Alle an
            </button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
            {(vendors||[]).filter(v=>{
              if(!vendorSearch) return true;
              const isAmt = /^[=<>]?[\d.,]+$/.test(vendorSearch.trim());
              if(isAmt) return (v.repeatedAmounts||[]).some(({amount})=>matchAmount(Math.abs(amount),vendorSearch));
              return v.shortDesc.toLowerCase().includes(vendorSearch.toLowerCase())||v.vendor.includes(vendorSearch.toLowerCase());
            }).map(v=>{
              const isIncluded=included.has(v.vendor);
              const hasInterval=!!v.interval;
              return (
                <div key={v.vendor}
                  style={{borderRadius:10,marginBottom:4,overflow:"hidden",
                    background:isIncluded?T.surf:"rgba(255,255,255,0.02)",
                    border:`1px solid ${isIncluded?hasInterval?T.gold+"66":T.bds:T.bd}`,
                    opacity:isIncluded?1:0.4}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",cursor:"pointer"}}
                    onClick={()=>setDrillVendor(drillVendor===v.vendor?null:v.vendor)}>
                    <div onClick={e=>{e.stopPropagation();setIncluded(p=>{const n=new Set(p);isIncluded?n.delete(v.vendor):n.add(v.vendor);return n;});}}
                      style={{width:18,height:18,borderRadius:4,flexShrink:0,cursor:"pointer",
                        background:isIncluded?T.gold:"rgba(255,255,255,0.08)",
                        border:`2px solid ${isIncluded?T.gold:T.bds}`,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {isIncluded&&Li("check",10,T.on_accent)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:T.txt,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {v.shortDesc}
                        {hasInterval&&<span style={{marginLeft:6,color:T.gold,fontSize:9,fontWeight:700,
                          background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",borderRadius:4,padding:"1px 5px"}}>
                          {v.interval}
                        </span>}
                        {v.hasExistingVorm&&<span style={{marginLeft:4,color:T.blue,fontSize:9,fontWeight:700,
                          background:"rgba(74,159,212,0.15)",borderRadius:4,padding:"1px 5px"}}>
                          {Li("clock",8,T.blue)} Vormerkg. vorhanden
                        </span>}
                      </div>
                      <div style={{color:T.txt2,fontSize:10,marginTop:2,display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                        {v.repeatedAmounts.map(({amount,count},i)=>(
                          <span key={i} style={{color:v.isIncome?T.pos:T.neg,fontFamily:"monospace",fontSize:10,
                            background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 5px"}}>
                            {count}× {v.isIncome?"+":"−"}{fmt2(amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span style={{color:T.txt2,flexShrink:0}}>
                      {Li(drillVendor===v.vendor?"chevron-up":"chevron-down",12)}
                    </span>
                  </div>
                  {/* Drilldown: Buchungsliste nach Betrag gruppiert */}
                  {drillVendor===v.vendor&&(
                    <div style={{borderTop:`1px solid ${T.bd}`,padding:"8px 12px",background:"rgba(0,0,0,0.15)"}}>
                      {/* Bei variablen Beträgen + manuellem Rhythmus: letzten Betrag anzeigen */}
                      {manualIntervals[v.vendor]&&v.repeatedAmounts.length===0&&(
                        <div style={{fontSize:9,color:T.txt2,marginBottom:6,padding:"4px 6px",
                          background:"rgba(74,159,212,0.08)",borderRadius:6}}>
                          {Li("info",9,T.blue)} Kein gleichbleibender Betrag erkannt — verwende letzten Betrag:
                          <span style={{color:T.txt,fontFamily:"monospace",fontWeight:700,marginLeft:4}}>
                            {(()=>{const last=v.txList.sort((a,b)=>b.date.localeCompare(a.date))[0];return `${v.isIncome?"+":"−"}${fmt2(last?.totalAmount||0)} €`;})()}
                          </span>
                        </div>
                      )}
                      {(v.repeatedAmounts.length>0 ? v.repeatedAmounts : (manualIntervals[v.vendor] ? [{amount:v.txList.sort((a,b)=>b.date.localeCompare(a.date))[0]?.totalAmount||0, count:v.txList.length}] : [])).map(({amount,count})=>{
                        const key=v.vendor+"::"+amount;
                        const isSel=!!drillSel[key];
                        const txsForAmt=v.txList.filter(t=>Math.round(t.totalAmount*100)/100===amount)
                          .sort((a,b)=>b.date.localeCompare(a.date));
                        const lastDate=txsForAmt[0]?.date||"";
                        const interval=detectInterval([...txsForAmt].sort((a,b)=>a.date.localeCompare(b.date)));
                        return (
                          <div key={amount} style={{marginBottom:8,borderRadius:8,
                            border:`1px solid ${isSel?T.gold+"88":"transparent"}`,
                            background:isSel?"rgba(245,166,35,0.06)":"transparent",padding:"6px 8px"}}>
                            {/* Betragszeile mit Checkbox */}
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <div onClick={()=>setDrillSel(p=>({...p,[key]:!p[key]}))}
                                style={{width:16,height:16,borderRadius:3,flexShrink:0,cursor:"pointer",
                                  background:isSel?T.gold:"rgba(255,255,255,0.1)",
                                  border:`2px solid ${isSel?T.gold:T.bds}`,
                                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {isSel&&Li("check",9,T.on_accent)}
                              </div>
                              <span style={{color:v.isIncome?T.pos:T.neg,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>
                                {v.isIncome?"+":"−"}{fmt2(amount)} €
                              </span>
                              <span style={{color:T.txt2,fontSize:9}}>{count}×</span>
                              {/* Erkannter oder manuell gesetzter Rhythmus */}
                            {(()=>{
                              const effInterval = manualIntervals[v.vendor]||interval;
                              const isManual = !!manualIntervals[v.vendor];
                              return (<>
                                {effInterval&&<span style={{color:isManual?T.blue:T.gold,fontSize:9,
                                  background:isManual?"rgba(74,159,212,0.15)":(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.15)":"rgba(245,166,35,0.12)",
                                  borderRadius:4,padding:"1px 5px",fontWeight:700}}>
                                  {isManual?"✎ ":""}{effInterval}
                                </span>}
                                {/* Manuelle Rhythmus-Auswahl */}
                                <div style={{display:"flex",gap:3,marginLeft:4}}>
                                  {["monatlich","quartalsweise","jährlich"].map(iv=>(
                                    <button key={iv} onClick={e=>{
                                      e.stopPropagation();
                                      setManualIntervals(p=>({...p,
                                        [v.vendor]: p[v.vendor]===iv ? undefined : iv
                                      }));
                                    }}
                                      style={{padding:"1px 5px",borderRadius:4,border:"none",
                                        cursor:"pointer",fontSize:8,fontFamily:"inherit",
                                        background:(manualIntervals[v.vendor]||interval)===iv
                                          ?"rgba(74,159,212,0.3)":"rgba(255,255,255,0.08)",
                                        color:(manualIntervals[v.vendor]||interval)===iv?T.blue:T.txt2}}>
                                      {iv==="monatlich"?"mtl.":iv==="quartalsweise"?"quartl.":"jährl."}
                                    </button>
                                  ))}
                                </div>
                              </>);
                            })()}
                            </div>
                            {/* Datum-Chips */}
                            <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:isSel?6:0,paddingLeft:24}}>
                              {txsForAmt.map(t=>(
                                <span key={t.id} style={{background:"rgba(255,255,255,0.06)",
                                  borderRadius:5,padding:"2px 6px",fontSize:10,color:T.txt2}}>
                                  {t.date.split("-").reverse().join(".")}
                                </span>
                              ))}
                            </div>
                            {/* Aktionen wenn ausgewählt */}
                            {isSel&&(()=>{
                              const cfg=drillSel[key+"_cfg"]||{};
                              const dTyp=cfg.typ||"wiederkehrend";
                              const dCount=cfg.count||"";
                              const dStart=cfg.startDate||"";
                              const dEnd=cfg.endDate||"";
                              const intMo=interval==="monatlich"?1:interval==="quartalsweise"?3:interval==="jährlich"?12:1;
                              const addIntD=(d)=>{
                                const iso=d.toISOString().slice(0,10);
                                if(interval==="monatlich")     return new Date(isoAddMonths(iso,1)+"T12:00:00");
                                if(interval==="quartalsweise") return new Date(isoAddMonths(iso,3)+"T12:00:00");
                                if(interval==="jährlich")      return new Date(isoAddMonths(iso,12)+"T12:00:00");
                                const nd=new Date(d); nd.setDate(nd.getDate()+14); return nd;
                              };
                              const calcN=()=>{
                                if(dCount) return Math.max(1,parseInt(dCount)||1);
                                const ey=new Date().getFullYear()+6;
                                const ed=dEnd?new Date(dEnd):new Date(ey,11,31);
                                const baseStart=dStart||nextDateFor(lastDate,interval);
                                let cur=new Date(baseStart+"T12:00:00");
                                const now=new Date(); now.setHours(0,0,0,0);
                                if(!dStart){while(cur<now){cur=addIntD(cur);}}
                                let n=0; let tmp=new Date(cur);
                                while(tmp<=ed){n++;tmp=addIntD(tmp);}
                                return n;
                              };
                              const drillN=calcN();
                              const setCfg=(patch)=>setDrillSel(p=>({...p,[key+"_cfg"]:{...cfg,...patch}}));
                              return (
                              <div style={{display:"flex",flexDirection:"column",gap:5,
                                background:"rgba(245,166,35,0.07)",borderRadius:9,
                                padding:"8px 10px",marginTop:2}}>
                                {/* Im VormerkungHub öffnen mit vorausgefüllten Werten */}
                                {(manualIntervals[v.vendor]||interval)&&(
                                  <button onClick={()=>{
                                    const effInterval = manualIntervals[v.vendor]||interval;
                                    const intMo2 = effInterval==="monatlich"?1:effInterval==="quartalsweise"?3:effInterval==="jährlich"?12:1;
                                    const nextDate = nextDateFor(lastDate, effInterval);
                                    const assignedCat = katAssign[key]||{};
                                    // Prefill-Objekt für VormerkungHub
                                    const prefill = {
                                      _prefill: true,
                                      desc: v.shortDesc,
                                      totalAmount: amount,
                                      _csvType: v.isIncome?"income":"expense",
                                      date: nextDate,
                                      accountId: v.txList[0]?.accountId||"",
                                      repeatMonths: intMo2,
                                      _seriesTyp: undefined,
                                      splits: assignedCat.catId
                                        ? [{id:uid(),catId:assignedCat.catId,subId:assignedCat.subId||"",amount}]
                                        : [],
                                    };
                                    if(onOpenVormHub) {
                                      // Embedded im VormerkungHub: direkt callback
                                      setDrillSel(p=>({...p,[key]:false}));
                                      onOpenVormHub(prefill);
                                    } else {
                                      setEditVormTx(prefill);
                                      setShowVormHub(true);
                                      setDrillSel(p=>({...p,[key]:false}));
                                    }
                                  }}
                                    style={{padding:"8px 10px",borderRadius:8,border:"none",
                                      background:T.gold,color:T.on_accent,fontSize:11,fontWeight:700,
                                      cursor:"pointer",fontFamily:"inherit",
                                      display:"flex",alignItems:"center",gap:6,justifyContent:"center",
                                      width:"100%"}}>
                                    {Li("calendar-plus",11,T.on_accent)}
                                    Im Vormerkungsdialog öffnen →
                                  </button>
                                )}
                                  <InlineCatSelect
                                    value={(katAssign[key]?.catId||"")+"|"+(katAssign[key]?.subId||"")}
                                    onChange={v2=>{const[c,sb]=v2.split("|");setKatAssign(p=>({...p,[key]:{catId:c,subId:sb}}));}}
                                    allCatOpts={allCatOpts} cats={cats} setCats={setCats} groups={groups}
                                    isIncome={v.isIncome} accentColor={T.pos}/>
                                  {katAssign[key]?.catId&&(
                                    <button onClick={()=>{
                                      const {catId,subId}=katAssign[key];
                                      let changed=0;
                                      setTxs(prev=>prev.map(t=>{
                                        if(t.pending||!t.date) return t;
                                        if(normalizeVendor(t.desc)!==v.vendor) return t;
                                        if(Math.round(t.totalAmount*100)/100!==amount) return t;
                                        changed++;
                                        return {...t,splits:[{id:uid(),catId,subId:subId||"",amount:t.totalAmount}]};
                                      }));
                                      setDrillSel(p=>({...p,[key]:false}));
                                      alert(`${changed} Buchungen kategorisiert.`);
                                    }}
                                      style={{padding:"4px 8px",borderRadius:7,border:"none",background:T.pos,
                                        color:T.on_accent,fontSize:10,fontWeight:700,cursor:"pointer",
                                        fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap",marginTop:1}}>
                                      {Li("check",10,T.on_accent)} Anwenden
                                    </button>
                                  )}
                              </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                      {/* Einmalige Beträge */}
                      {(()=>{
                        const singles=v.txList.filter(t=>{
                          const a=Math.round(t.totalAmount*100)/100;
                          return !v.repeatedAmounts.find(r=>r.amount===a);
                        });
                        if(!singles.length) return null;
                        return (
                          <div style={{marginTop:4,borderTop:`1px solid ${T.bd}`,paddingTop:6}}>
                            <div style={{color:T.txt2,fontSize:9,marginBottom:4}}>Einmalige Beträge:</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {singles.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>(
                                <span key={t.id} style={{background:"rgba(255,255,255,0.04)",
                                  borderRadius:5,padding:"2px 7px",fontSize:10,color:T.txt2,opacity:0.6}}>
                                  {t.date.split("-").reverse().join(".")} {v.isIncome?"+":"−"}{fmt2(Math.round(t.totalAmount*100)/100)}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{padding:"12px 16px",flexShrink:0,borderTop:`1px solid ${T.bd}`}}>
            <button onClick={analyzeVendors}
              style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
                background:T.gold,color:T.on_accent,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {Li("search",14,T.on_accent)} Muster analysieren ({(vendors||[]).filter(v=>included.has(v.vendor)&&v.interval).length} mit erkanntem Intervall)
            </button>
          </div>
        </>
      )}

      {/* ── PHASE 2: Ergebnisse ── */}
      {phase==="results"&&(
        <>
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.bd}`,flexShrink:0,
            display:"flex",alignItems:"center",gap:10}}>
            <div style={{color:T.txt2,fontSize:12,flex:1}}>
              {suggestions.length} Muster · <span style={{color:T.gold,fontWeight:700}}>{accepted.size} ausgewählt</span>
            </div>
            <button onClick={()=>setAccepted(new Set(suggestions.map(s=>s.id)))}
              style={{background:"transparent",border:`1px solid ${T.bds}`,color:T.txt2,borderRadius:7,padding:"3px 8px",fontSize:10,cursor:"pointer"}}>Alle</button>
            <button onClick={()=>setAccepted(new Set())}
              style={{background:"transparent",border:`1px solid ${T.bds}`,color:T.txt2,borderRadius:7,padding:"3px 8px",fontSize:10,cursor:"pointer"}}>Keine</button>
          </div>
          {suggestions.length===0?(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
              <div style={{color:T.txt2,fontSize:14,textAlign:"center"}}>
                Keine Muster mit erkanntem Intervall.<br/>
                <span style={{fontSize:12,display:"block",marginTop:8}}>
                  Gehe zurück und prüfe ob mehr Absender eingeschlossen sind.
                </span>
              </div>
            </div>
          ):(
            <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
              {suggestions.map(s=>{
                const isAcc=accepted.has(s.id);
                const cat=getCat(get(s.id,"catId"));
                const isIncome=s.csvType==="income";
                return (
                  <div key={s.id} style={{background:isAcc?T.surf:"rgba(255,255,255,0.02)",
                    border:`1px solid ${isAcc?T.gold+"55":T.bd}`,
                    borderRadius:12,padding:"10px 12px",marginBottom:8,opacity:isAcc?1:0.5}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6}}>
                      <div onClick={()=>setAccepted(p=>{const n=new Set(p);isAcc?n.delete(s.id):n.add(s.id);return n;})}
                        style={{width:20,height:20,borderRadius:5,flexShrink:0,cursor:"pointer",marginTop:1,
                          background:isAcc?T.gold:"rgba(255,255,255,0.1)",border:`2px solid ${isAcc?T.gold:T.bds}`,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {isAcc&&Li("check",12,T.on_accent)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <input value={get(s.id,"shortDesc")||s.shortDesc} onChange={e=>set_(s.id,"shortDesc",e.target.value)}
                          style={{width:"100%",background:"transparent",border:"none",color:T.txt,fontSize:13,
                            fontWeight:700,outline:"none",fontFamily:"inherit",padding:0,boxSizing:"border-box"}}/>
                        <div style={{color:T.txt2,fontSize:10,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                          <span style={{color:T.gold,fontWeight:700}}>{Li("repeat",9,T.gold)} {get(s.id,"interval")||s.interval}</span>
                          <span>{s.count}× gefunden</span>
                          <span>Nächster: {(get(s.id,"nextDate")||s.nextDate).split("-").reverse().join(".")}</span>
                        </div>
                        {/* Betragshistorie — wiederkehrende Beträge mit Häufigkeit */}
                        <div style={{marginTop:5,display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>
                          <span style={{color:T.txt2,fontSize:9,marginRight:2}}>Beträge:</span>
                          {(s.repeatedAmounts||[]).map(({amount,count},i)=>(
                            <span key={i} style={{
                              background:amount===pn(get(s.id,"amount")||s.amount)?"rgba(170,204,0,0.15)":"rgba(255,255,255,0.06)",
                              border:amount===pn(get(s.id,"amount")||s.amount)?`1px solid ${T.pos}44`:"1px solid transparent",
                              borderRadius:5,padding:"2px 6px",fontSize:10,fontFamily:"monospace",
                              color:isIncome?T.pos:T.neg,fontWeight:amount===pn(get(s.id,"amount")||s.amount)?700:400}}>
                              {count}× {isIncome?"+":"−"}{fmt2(amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{color:T.txt2,fontSize:9,marginBottom:2}}>Nächster Betrag</div>
                        <input value={String(get(s.id,"amount")||s.amount).replace(".",",")}
                          onChange={e=>set_(s.id,"amount",e.target.value)} inputMode="decimal"
                          style={{width:88,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                            borderRadius:7,padding:"4px 6px",color:isIncome?T.pos:T.neg,
                            fontSize:13,fontWeight:700,fontFamily:"monospace",textAlign:"right",outline:"none"}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                      <select value={(get(s.id,"catId")||"")+"|"+(get(s.id,"subId")||"")}
                        onChange={e=>{const[c,sb]=e.target.value.split("|");set_(s.id,"catId",c);set_(s.id,"subId",sb);}}
                        style={{flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                          borderRadius:8,padding:"6px 8px",color:cat?cat.color:T.txt2,fontSize:11,outline:"none",cursor:"pointer"}}>
                        <option value="|" style={{background:T.surf2}}>— Kategorie wählen (optional) —</option>
                        {allCatOpts.map(o=>(
                          <option key={o.catId+"|"+o.subId} value={o.catId+"|"+o.subId} style={{background:T.surf2}}>{o.label}</option>
                        ))}
                      </select>
                      <button onClick={()=>setNewCatPanel(newCatPanel===s.id?null:s.id)}
                        title="neue Kategorie anlegen"
                        style={{padding:"6px 8px",borderRadius:8,border:`1px solid ${T.pos}44`,
                          background:newCatPanel===s.id?`${T.pos}22`:`${T.pos}11`,
                          color:T.pos,fontSize:11,cursor:"pointer",flexShrink:0,
                          display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}>
                        {Li("plus",11,T.pos)} Neu
                      </button>
                    </div>
                    {/* Inline Kategorie-Ersteller */}
                    {newCatPanel===s.id&&<InlineNewCat s={s} isIncome={isIncome} groups={groups} cats={cats} setCats={setCats} set_={set_} setNewCatPanel={setNewCatPanel}/>}
                  </div>
                );
              })}
            </div>
          )}
          {suggestions.length>0&&(
            <div style={{padding:"12px 16px",flexShrink:0,borderTop:`1px solid ${T.bd}`}}>
              <button onClick={createVormerkungen} disabled={accepted.size===0}
                style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
                  background:accepted.size>0?T.gold:T.disabled,color:T.on_accent,
                  fontSize:14,fontWeight:700,cursor:accepted.size>0?"pointer":"default",
                  opacity:accepted.size>0?1:0.4,fontFamily:"inherit"}}>
                {accepted.size} Vormerkungsser{accepted.size!==1?"ien":"ie"} erstellen ✓
              </button>
            </div>
          )}
        </>
      )}

      {/* ── DONE ── */}
      {phase==="done"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24}}>
          {Li("check-circle",48,T.pos)}
          <div style={{color:T.txt,fontSize:20,fontWeight:800}}>
            {suggestions.filter(s=>accepted.has(s.id)).length} Serien angelegt!
          </div>
          <div style={{color:T.txt2,fontSize:13,textAlign:"center"}}>
            Die Vormerkungen erscheinen im Dashboard unter "offene Vormerkungen".
          </div>
          <button onClick={onClose}
            style={{padding:"12px 32px",borderRadius:11,border:"none",background:T.gold,
              color:T.on_accent,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Fertig
          </button>
        </div>
      )}
      </>)}

      {/* ══ TAB: KATEGORISIEREN ══ */}
      {tab==="kategorisieren"&&(<>

      {/* ── KAT PHASE 0: Zeitraum ── */}
      {katPhase==="config"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",gap:16,padding:32}}>
          {Li("tag",48,T.blue)}
          <div style={{color:T.txt,fontSize:16,fontWeight:700,textAlign:"center"}}>
            Vergangene Buchungen kategorisieren
          </div>
          <div style={{color:T.txt2,fontSize:13,textAlign:"center",maxWidth:300,lineHeight:1.6}}>
            Erkennt wiederkehrende Absender und weist ihnen nachträglich Kategorien zu.
            Keine Vormerkungen werden erstellt.
          </div>
          <div style={{background:T.surf,borderRadius:12,padding:"14px 16px",width:"100%",maxWidth:320,border:`1px solid ${T.bd}`}}>
            <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:10}}>Analyse ab Monat / Jahr:</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select value={katFromMonth} onChange={e=>setKatFromMonth(Number(e.target.value))}
                style={{flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:8,padding:"8px 10px",color:T.txt,fontSize:13,outline:"none",cursor:"pointer"}}>
                {MONTHS.map((m,i)=><option key={i} value={i} style={{background:T.surf2}}>{m}</option>)}
              </select>
              <input type="number" value={katFromYear} onChange={e=>setKatFromYear(Number(e.target.value))}
                style={{width:80,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                  borderRadius:8,padding:"8px 10px",color:T.txt,fontSize:13,textAlign:"center",outline:"none"}}/>
            </div>
            <div style={{color:T.txt2,fontSize:10,marginTop:8}}>
              {txs.filter(t=>!t.pending&&t.date>=`${katFromYear}-${String(katFromMonth+1).padStart(2,"0")}-01`).length} Buchungen im Zeitraum
            </div>
          </div>
          <button onClick={buildKatVendors}
            style={{padding:"14px 32px",borderRadius:11,border:"none",background:T.blue,
              color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",
              display:"flex",alignItems:"center",gap:8}}>
            {Li("list",16,"#fff")} Absender anzeigen
          </button>
        </div>
      )}

      {/* ── KAT PHASE 1: Absender-Liste ── */}
      {katPhase==="vendors"&&katVendors&&(
        <>
          <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.bd}`,flexShrink:0,
            display:"flex",alignItems:"center",gap:8}}>
            <div style={{color:T.txt2,fontSize:11,flex:1}}>
              <span style={{color:T.blue,fontWeight:700}}>
                {katIncluded.size} ausgewählt
              </span>
              {" · "}Anhaken = einschließen
            </div>
            <button onClick={()=>setKatIncluded(new Set())}
              style={{background:"transparent",border:`1px solid ${T.bds}`,color:T.txt2,borderRadius:7,padding:"3px 8px",fontSize:10,cursor:"pointer"}}>Alle ab</button>
            <button onClick={()=>setKatIncluded(new Set(katVendors.map(v=>v.vendor)))}
              style={{background:"transparent",border:`1px solid ${T.bds}`,color:T.txt2,borderRadius:7,padding:"3px 8px",fontSize:10,cursor:"pointer"}}>Alle an</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
            {(katVendors||[]).filter(v=>{
              if(!katSearch) return true;
              const isAmt = /^[=<>]?[\d.,]+$/.test(katSearch.trim());
              if(isAmt) return (v.repeatedAmounts||[]).some(({amount})=>matchAmount(Math.abs(amount),katSearch));
              return v.shortDesc.toLowerCase().includes(katSearch.toLowerCase());
            }).map(v=>{
              const isExcl=!katIncluded.has(v.vendor);
              return (
                <div key={v.vendor} style={{borderRadius:10,marginBottom:4,overflow:"hidden",
                  background:isExcl?"rgba(255,255,255,0.02)":T.surf,
                  border:`1px solid ${isExcl?T.bd:T.blue+"55"}`,opacity:isExcl?0.35:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",cursor:"pointer"}}
                    onClick={()=>setKatDrill(katDrill===v.vendor?null:v.vendor)}>
                    <div onClick={e=>{e.stopPropagation();setKatIncluded(p=>{const n=new Set(p);n.has(v.vendor)?n.delete(v.vendor):n.add(v.vendor);return n;});}}
                      style={{width:18,height:18,borderRadius:4,flexShrink:0,cursor:"pointer",
                        background:isExcl?"rgba(255,255,255,0.08)":T.blue,
                        border:`2px solid ${isExcl?T.bds:T.blue}`,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {!isExcl&&Li("check",10,"#fff")}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:T.txt,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {v.shortDesc}
                      </div>
                      <div style={{color:T.txt2,fontSize:10,marginTop:2,display:"flex",gap:4,flexWrap:"wrap"}}>
                        <span>{v.count}×</span>
                        <span style={{color:T.txt2,fontSize:9}}>
                          {v.firstDate.split("-").reverse().join(".")} – {v.lastDate.split("-").reverse().join(".")}
                        </span>
                        {v.repeatedAmounts.map(({amount,count},i)=>(
                          <span key={i} style={{color:v.isIncome?T.pos:T.neg,fontFamily:"monospace",fontSize:10,
                            background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 5px"}}>
                            {count}× {v.isIncome?"+":"−"}{fmt2(amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                    {Li(katDrill===v.vendor?"chevron-up":"chevron-down",12,T.txt2)}
                  </div>
                  {katDrill===v.vendor&&(
                    <div style={{borderTop:`1px solid ${T.bd}`,padding:"8px 12px",background:"rgba(0,0,0,0.15)"}}>
                      {v.repeatedAmounts.map(({amount,count})=>{
                        const key="kat::"+v.vendor+"::"+amount;
                        const isSel=!!katDrillSel[key];
                        const txsForAmt=v.txList.filter(t=>Math.round(t.totalAmount*100)/100===amount)
                          .sort((a,b)=>b.date.localeCompare(a.date));
                        const interval=detectInterval([...txsForAmt].sort((a,b)=>a.date.localeCompare(b.date)));
                        return (
                          <div key={amount} style={{marginBottom:8,borderRadius:8,
                            border:`1px solid ${isSel?T.blue+"88":"transparent"}`,
                            background:isSel?"rgba(74,159,212,0.06)":"transparent",padding:"6px 8px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <div onClick={()=>setKatDrillSel(p=>({...p,[key]:!p[key]}))}
                                style={{width:16,height:16,borderRadius:3,flexShrink:0,cursor:"pointer",
                                  background:isSel?T.blue:"rgba(255,255,255,0.1)",
                                  border:`2px solid ${isSel?T.blue:T.bds}`,
                                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {isSel&&Li("check",9,"#fff")}
                              </div>
                              <span style={{color:v.isIncome?T.pos:T.neg,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>
                                {v.isIncome?"+":"−"}{fmt2(amount)} €
                              </span>
                              <span style={{color:T.txt2,fontSize:9}}>{count}×</span>
                              {/* Erkannter oder manuell gesetzter Rhythmus */}
                            {(()=>{
                              const effInterval = manualIntervals[v.vendor]||interval;
                              const isManual = !!manualIntervals[v.vendor];
                              return (<>
                                {effInterval&&<span style={{color:isManual?T.blue:T.gold,fontSize:9,
                                  background:isManual?"rgba(74,159,212,0.15)":(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.15)":"rgba(245,166,35,0.12)",
                                  borderRadius:4,padding:"1px 5px",fontWeight:700}}>
                                  {isManual?"✎ ":""}{effInterval}
                                </span>}
                                {/* Manuelle Rhythmus-Auswahl */}
                                <div style={{display:"flex",gap:3,marginLeft:4}}>
                                  {["monatlich","quartalsweise","jährlich"].map(iv=>(
                                    <button key={iv} onClick={e=>{
                                      e.stopPropagation();
                                      setManualIntervals(p=>({...p,
                                        [v.vendor]: p[v.vendor]===iv ? undefined : iv
                                      }));
                                    }}
                                      style={{padding:"1px 5px",borderRadius:4,border:"none",
                                        cursor:"pointer",fontSize:8,fontFamily:"inherit",
                                        background:(manualIntervals[v.vendor]||interval)===iv
                                          ?"rgba(74,159,212,0.3)":"rgba(255,255,255,0.08)",
                                        color:(manualIntervals[v.vendor]||interval)===iv?T.blue:T.txt2}}>
                                      {iv==="monatlich"?"mtl.":iv==="quartalsweise"?"quartl.":"jährl."}
                                    </button>
                                  ))}
                                </div>
                              </>);
                            })()}
                            </div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:isSel?6:0,paddingLeft:24}}>
                              {txsForAmt.map(t=>(
                                <span key={t.id} style={{background:"rgba(255,255,255,0.06)",borderRadius:5,
                                  padding:"2px 6px",fontSize:10,color:T.txt2}}>
                                  {t.date.split("-").reverse().join(".")}
                                </span>
                              ))}
                            </div>
                            {isSel&&(
                              <div style={{paddingLeft:24,display:"flex",gap:6,alignItems:"flex-start"}}>
                                <InlineCatSelect
                                  value={(katAssign[key]?.catId||"")+"|"+(katAssign[key]?.subId||"")}
                                  onChange={v2=>{const[c,sb]=v2.split("|");setKatAssign(p=>({...p,[key]:{catId:c,subId:sb}}));}}
                                  allCatOpts={allCatOpts} cats={cats} setCats={setCats} groups={groups}
                                  isIncome={v.isIncome} accentColor={T.blue}/>
                                {katAssign[key]?.catId&&(
                                  <button onClick={()=>{
                                    const {catId,subId}=katAssign[key];
                                    let changed=0;
                                    setTxs(prev=>prev.map(t=>{
                                      if(t.pending||!t.date) return t;
                                      if(normalizeVendor(t.desc)!==v.vendor) return t;
                                      if(Math.round(t.totalAmount*100)/100!==amount) return t;
                                      changed++;
                                      return {...t,splits:[{id:uid(),catId,subId:subId||"",amount:t.totalAmount}]};
                                    }));
                                    setKatDrillSel(p=>({...p,[key]:false}));
                                    alert(`${changed} Buchungen kategorisiert.`);
                                  }}
                                    style={{padding:"4px 8px",borderRadius:7,border:"none",background:T.blue,
                                      color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",
                                      fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap",marginTop:1}}>
                                    {Li("check",10,"#fff")} Anwenden
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{padding:"12px 16px",flexShrink:0,borderTop:`1px solid ${T.bd}`}}>
            <button onClick={()=>{setKatPhase("apply");}}
              style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
                background:T.blue,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {Li("tag",14,"#fff")} Kategorien zuweisen ({katIncluded.size} Absender)
            </button>
          </div>
        </>
      )}

      {/* ── KAT PHASE 2: Kategorien zuweisen ── */}
      {katPhase==="apply"&&(
        <>
          <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.bd}`,flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
            <div style={{color:T.txt2,fontSize:11,flex:1}}>
              Je Absender eine Kategorie wählen · {Object.values(katAssign).filter(a=>a.catId).length} zugewiesen
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
            {(katVendors||[]).filter(v=>katIncluded.has(v.vendor)).map(v=>{
              const assigned=katAssign[v.vendor];
              const assignedCat=assigned?.catId?allCatOpts.find(o=>o.catId===assigned.catId&&o.subId===assigned.subId):null;
              return (
                <div key={v.vendor} style={{background:T.surf,borderRadius:12,padding:"10px 12px",
                  marginBottom:8,border:`1px solid ${assigned?.catId?T.blue+"55":T.bd}`}}>
                  <div style={{color:T.txt,fontSize:12,fontWeight:700,marginBottom:3}}>
                    {v.shortDesc}
                  </div>
                  <div style={{color:T.txt2,fontSize:10,marginBottom:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span>{v.count}× Buchungen</span>
                    <span>{v.firstDate.split("-").reverse().join(".")} – {v.lastDate.split("-").reverse().join(".")}</span>
                    {v.repeatedAmounts.map(({amount,count},i)=>(
                      <span key={i} style={{color:v.isIncome?T.pos:T.neg,fontFamily:"monospace",fontSize:10}}>
                        {count}× {v.isIncome?"+":"−"}{fmt2(amount)}
                      </span>
                    ))}
                  </div>
                  <InlineCatSelect
                    value={(assigned?.catId||"")+"|"+(assigned?.subId||"")}
                    onChange={v2=>{const[c,sb]=v2.split("|");setKatAssign(p=>({...p,[v.vendor]:{catId:c,subId:sb}}));}}
                    allCatOpts={allCatOpts} cats={cats} setCats={setCats} groups={groups}
                    isIncome={v.isIncome} accentColor={T.blue}/>
                </div>
              );
            })}
          </div>
          <div style={{padding:"12px 16px",flexShrink:0,borderTop:`1px solid ${T.bd}`}}>
            <button onClick={applyKatAssign}
              disabled={Object.values(katAssign).filter(a=>a.catId).length===0}
              style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
                background:Object.values(katAssign).filter(a=>a.catId).length>0?T.blue:T.disabled,
                color:"#fff",fontSize:14,fontWeight:700,fontFamily:"inherit",
                cursor:Object.values(katAssign).filter(a=>a.catId).length>0?"pointer":"default",
                opacity:Object.values(katAssign).filter(a=>a.catId).length>0?1:0.4}}>
              {Li("check",14,"#fff")} {Object.values(katAssign).filter(a=>a.catId).length} Absender kategorisieren
            </button>
          </div>
        </>
      )}

      {/* ── KAT PHASE 3: Done ── */}
      {katPhase==="done"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24}}>
          {Li("check-circle",48,T.blue)}
          <div style={{color:T.txt,fontSize:20,fontWeight:800}}>
            {katDone} Buchungen kategorisiert!
          </div>
          <div style={{color:T.txt2,fontSize:13,textAlign:"center"}}>
            Die Buchungen haben jetzt die zugewiesenen Kategorien.
          </div>
          <button onClick={onClose}
            style={{padding:"12px 32px",borderRadius:11,border:"none",background:T.blue,
              color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Fertig
          </button>
        </div>
      )}
      </>)}
    </div>
  );
}

export { RecurringDetectionScreen };
