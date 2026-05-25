// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useState } from "react";
import { Lbl } from "../atoms/Lbl.jsx";
import { MHead } from "../atoms/MHead.jsx";
import { Overlay } from "../atoms/Overlay.jsx";
import { PBtn } from "../atoms/PBtn.jsx";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { VormHubSecToggle } from "../molecules/VormHubSecToggle.jsx";
import { BudgetEditorModal } from "./BudgetEditorModal.jsx";
import { KategorieAnlegen } from "./KategorieAnlegen.jsx";
import { CsvImportScreen } from "../screens/CsvImportScreen.jsx";
import { RecurringDetectionScreen } from "../screens/RecurringDetectionScreen.jsx";
import { VormerkungHub } from "../screens/VormerkungHub.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { isoAddMonths } from "../../utils/date.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function AddTxModal() {
  const { cats,groups,txs,setTxs,accounts,
    modal,setModal,getCat,getSub,
    addSplit,removeSplit,updSplit,splitTotal,splitDiff,txValid,saveTx,
    newTx,setNewTx,quickBtns,setQuickBtns,
    budgets,setBudgets,year,month,getBudgetForMonth,
  } = useContext(AppCtx);

  const today = new Date().toISOString().slice(0,10);
  const pad = n => String(n).padStart(2,"0");
  const isLight = T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper";

  // Typ: "sofort" | "einmalig" | "wiederkehrend" | "finanzierung"
  const [typ,            setTyp_]           = React.useState("csv");
  // Gemeinsame Formular-Felder (gespiegelt mit newTx für sofort-Typ)
  const [desc,           setDesc]           = React.useState("");
  const [amount,         setAmount]         = React.useState("");
  const [csvType,        setCsvType]        = React.useState("expense");
  const [catId,          setCatId]          = React.useState("");
  const [subId,          setSubId]          = React.useState("");
  const [accountId,      setAccountId]      = React.useState(accounts[0]?.id||"acc-giro");
  const [note,           setNote]           = React.useState("");
  const [startDate,      setStartDate]      = React.useState(today);
  const [endDate,        setEndDate]        = React.useState("");
  const [valueDate,      setValueDate]      = React.useState("");
  const [interval_,      setInterval_]      = React.useState(1);
  const [count,          setCount]          = React.useState("");
  const [lastOfMonth,    setLastOfMonth]    = React.useState(false);
  const [customFirstLast,setCustomFirstLast]= React.useState(false);
  const [firstAmount,    setFirstAmount]    = React.useState("");
  const [lastAmount,     setLastAmount]     = React.useState("");
  const [error,          setError]          = React.useState("");
  const [saved,          setSaved]          = React.useState(false);
  // Budget-Tab
  const [budgetSub,      setBudgetSub]      = React.useState(null); // {id,name} wenn Budget-Dialog offen
  // CSV-Tool Sektionen
  const [secErkennen,    setSecErkennen]    = React.useState(false);
  const [secKategorien,  setSecKategorien]  = React.useState(false);

  const setTyp = (t) => {
    setTyp_(t);
    setCount(""); setEndDate("");
    setCustomFirstLast(false); setFirstAmount(""); setLastAmount("");
    // csv/budget/kontostand/kategorie haben kein pending
  };

  const closeReset = () => {
    setModal(null);
    setNewTx({date:today,totalAmount:"",desc:"",note:"",_csvType:"expense",
      pending:false,repeatMonths:1,accountId:accounts[0]?.id||"acc-giro",
      splits:[{id:uid(),catId:"",subId:"",amount:""}]});
  };

  // Kategorie-Optionen
  const catOpts = cats.filter(c => {
    const grp = groups.find(g=>g.type===c.type);
    const beh = grp?.behavior || c.type;
    return csvType==="income"
      ? (beh==="income" || (c.type==="tagesgeld" && beh!=="expense"))
      : (beh==="expense" || (c.type==="tagesgeld" && beh!=="income"));
  });
  const selCat = cats.find(c=>c.id===catId);
  const subOpts = selCat?.subs||[];

  // Anzahl berechnen — exakt wie VormerkungHub
  const calcCount = () => {
    if(typ==="einmalig") return 1;
    if(count) return Math.max(1, parseInt(count)||1);
    if(endDate && startDate) {
      const s=new Date(startDate), e=new Date(endDate);
      const months=(e.getFullYear()-s.getFullYear())*12+(e.getMonth()-s.getMonth())+1;
      return Math.max(1, Math.ceil(months/interval_));
    }
    if(typ==="finanzierung") return 1;
    // 7 Jahre ab Startdatum
    const endYear = new Date().getFullYear() + 6;
    const endDec  = new Date(endYear, 11, 31);
    const start   = new Date(startDate||today);
    const totalMonths = (endDec.getFullYear()-start.getFullYear())*12+(endDec.getMonth()-start.getMonth())+1;
    return Math.max(1, Math.ceil(totalMonths/interval_));
  };
  const totalCount = calcCount();

  // Enddatum-Vorschau
  const endPreview = (typ!=="sofort"&&typ!=="einmalig"&&count&&startDate)
    ? (()=>{const d=new Date(isoAddMonths(startDate,(parseInt(count)-1)*interval_));
        return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;})()
    : null;

  // Vorschau-Daten (erste 3)
  const preview = [];
  if(typ!=="einmalig"&&startDate&&(typ==="wiederkehrend"||typ==="finanzierung")) {
    for(let i=0;i<Math.min(totalCount,3);i++)
      preview.push(isoAddMonths(startDate, i*interval_, lastOfMonth));
  }

  // Prefill aus CSV-Tools
  const handleCsvPrefill = (prefill) => {
    setDesc(prefill.desc||"");
    setAmount(String(prefill.totalAmount||"").replace(".",","));
    setCsvType(prefill._csvType||"expense");
    setStartDate(prefill.date||today);
    if(prefill.splits?.[0]?.catId){ setCatId(prefill.splits[0].catId); setSubId(prefill.splits[0].subId||""); }
    setInterval_(prefill.repeatMonths||1);
    setTyp_("wiederkehrend");
    setSecErkennen(false); setSecKategorien(false);
  };

  // Validierung für Vormerken-Typen
  const vormValid = amount.trim()&&desc.trim()&&startDate;

  // Speichern
  const handleSave = () => {
    setError("");
    if(typ==="csv"||typ==="kontostand"||typ==="kategorie"||typ==="budget") return;
    const amt = pn(amount.replace(",","."));
    if(!amt)          { setError("Bitte Betrag eingeben.");       return; }
    if(!desc.trim())  { setError("Bitte Beschreibung eingeben."); return; }
    if(!startDate)    { setError("Bitte Startdatum wählen.");     return; }

    const n = totalCount;
    const seriesId = (typ!=="einmalig"&&n>1) ? uid() : null;
    const firstAmt = customFirstLast&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
    const lastAmt  = customFirstLast&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;

    const newEntries = Array.from({length:n},(_,i)=>{
      const date     = isoAddMonths(startDate, i*interval_, lastOfMonth&&typ!=="einmalig");
      const isFirst  = i===0, isLast=i===n-1;
      const txAmt    = (isFirst&&firstAmt!=null)?firstAmt:(isLast&&lastAmt!=null)?lastAmt:amt;
      const txSplits = catId ? [{id:uid(),catId,subId:subId||"",amount:txAmt}] : [];
      return {
        id:uid(), date, desc:desc.trim(), totalAmount:txAmt,
        pending:true, accountId, _csvType:csvType,
        repeatMonths:interval_, note:note||"",
        splits:txSplits,
        ...(lastOfMonth&&typ!=="einmalig"?{_lastOfMonth:true}:{}),
        ...(typ==="einmalig"&&valueDate?{valueDate}:{}),
        ...(seriesId?{_seriesId:seriesId,_seriesIdx:i+1,_seriesTotal:n}:{}),
        ...(typ==="finanzierung"?{_seriesTyp:"finanzierung"}:{}),
      };
    });
    setTxs(p=>[...newEntries,...p]);
    setSaved(true);
    setTimeout(()=>{ setSaved(false); closeReset(); }, 1200);
  };

  // Sync sofort-Felder mit newTx
  React.useEffect(()=>{
    // sofort-Tab entfernt – dieser Effect wird nicht mehr benötigt
    return;
    setNewTx(t=>({...t,
      desc, totalAmount:amount, _csvType:csvType,
      accountId, note, date:startDate,
      splits:catId?[{id:t.splits[0]?.id||uid(),catId,subId:subId||"",amount}]:
        [{id:t.splits[0]?.id||uid(),catId:"",subId:"",amount:""}],
    }));
  },[typ,desc,amount,csvType,accountId,note,startDate,catId,subId]);

  const TABS = [
    {id:"csv",          label:"Import",   icon:"download"},
    {id:"einmalig",     label:"vormerken", icon:"calendar"},
    {id:"wiederkehrend",label:"Wieder­k.", icon:"repeat"},
    {id:"finanzierung", label:"Finan­z.",  icon:"credit-card"},
    {id:"budget",       label:"Budget",    icon:"target"},
    {id:"kategorie",    label:"Kategorien",icon:"tag"},
  ];

  // Dynamischer Titel je Tab
  const TAB_TITLES = {
    csv:          "CSV importieren",
    einmalig:     "neue Vormerkung",
    wiederkehrend:"wiederkehrend anlegen",
    finanzierung: "finanzierung anlegen",
    budget:       "budget festlegen",
    kontostand:   "kontostand setzen",
    kategorie:    "kategorie anlegen",
  };

  return (
    <Overlay onClose={closeReset}>
      <MHead title={TAB_TITLES[typ]||"Erfassen"} onClose={closeReset}/>

      {/* Typ-Tabs — volle Breite, horizontal scrollbar auf kleinen Screens */}
      <div style={{overflowX:"auto",margin:"0 -16px 12px",
        WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
        <div style={{display:"flex",gap:0,background:"rgba(0,0,0,0.15)",
          padding:"3px 0",width:"100%"}}>
          {TABS.map(({id,label,icon})=>{
            const active=typ===id;
            return (
              <button key={id} onClick={()=>setTyp(id)}
                style={{flex:1,padding:"6px 2px",borderRadius:8,border:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:10,fontWeight:active?700:400,
                  background:active?T.surf:"transparent",color:active?T.blue:T.txt2,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                  transition:"all 0.15s",whiteSpace:"nowrap"}}>
                {Li(icon,13,active?T.blue:T.txt2)}{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ausgabe / Einnahme — unter den Tabs, nur für Vormerken-Typen */}
      {(typ==="einmalig"||typ==="wiederkehrend"||typ==="finanzierung")&&(
        <div style={{display:"flex",gap:4,marginBottom:10}}>
          {[["expense","− Ausgabe",T.neg],["income","+ Einnahme",T.pos]].map(([val,label,col])=>{
            const active=csvType===val;
            return (
              <button key={val} onClick={()=>{setCsvType(val);setCatId("");setSubId("");}}
                style={{flex:1,padding:"9px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700,
                  border:`2px solid ${active?col:T.bd}`,
                  background:active?col:isLight?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.04)",
                  color:active?"#fff":T.txt2,fontFamily:"inherit",transition:"all 0.15s"}}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* CSV Import Tab */}
      {typ==="csv"&&(
        <div>
          <CsvImportScreen onClose={closeReset} embedded/>
        </div>
      )}

      {/* Budget-Auswahl */}
      {typ==="budget"&&(
        <div style={{marginTop:4}}>
          <div style={{color:T.txt2,fontSize:12,marginBottom:10,textAlign:"center"}}>
            Wähle eine Unterkategorie um das Budget festzulegen:
          </div>
          <div style={{maxHeight:360,overflowY:"auto"}}>
            {cats.filter(c=>c.type==="expense"||c.type==="income").map(cat=>(
              <div key={cat.id} style={{marginBottom:8}}>
                <div style={{color:cat.color||T.blue,fontSize:10,fontWeight:700,
                  padding:"4px 8px",display:"flex",alignItems:"center",gap:6}}>
                  {cat.icon&&Li(cat.icon,11,cat.color||T.blue)} {cat.name}
                </div>
                {(cat.subs||[]).map(sub=>{
                  const hasBudget = getBudgetForMonth(sub.id,year,month)>0;
                  const totalBudget = getBudgetForMonth(sub.id,year,month);
                  return (
                    <div key={sub.id} onClick={()=>setBudgetSub({id:sub.id,name:sub.name,catId:cat.id,catColor:cat.color})}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
                        marginBottom:3,borderRadius:10,cursor:"pointer",
                        background:"rgba(255,255,255,0.04)",border:`1px solid ${hasBudget?T.gold+"66":T.bd}`,
                        transition:"background 0.1s"}}>
                      {sub.icon&&Li(sub.icon,13,cat.color||T.blue)}
                      <span style={{flex:1,color:T.txt,fontSize:13}}>{sub.name}</span>
                      {hasBudget?(
                        <span style={{color:T.gold,fontSize:10,fontWeight:700,
                          background:"rgba(245,166,35,0.12)",borderRadius:5,padding:"2px 6px"}}>
                          {Li("target",9,T.gold)} {fmt(totalBudget)} {budgets[sub.id].months===1?"mtl.":budgets[sub.id].months===3?"quartl.":budgets[sub.id].months===6?"halbj.":"jährl."}
                        </span>
                      ):(
                        <span style={{color:T.txt2,fontSize:10}}>{Li("plus",10,T.txt2)} Budget</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {budgetSub&&(
            <BudgetEditorModal
              key={budgetSub.id}
              sub={{id:budgetSub.id,name:budgetSub.name}}
              cat={{id:budgetSub.catId,color:budgetSub.catColor}}
              onClose={()=>setBudgetSub(null)}/>
          )}
        </div>
      )}

      {/* Kategorie anlegen Tab */}
      {typ==="kategorie"&&(
        <KategorieAnlegen onDone={closeReset}/>
      )}

      {/* Datum + Beschreibung — nur für Vormerken-Typen */}
      {(typ==="einmalig"||typ==="wiederkehrend"||typ==="finanzierung")&&<>
        <div style={{display:"flex",gap:8,marginBottom:0}}>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
            style={{...INP,flex:"0 0 auto",width:"auto",colorScheme:isLight?"light":"dark"}}/>
          <input placeholder="Beschreibung" value={desc} onChange={e=>setDesc(e.target.value)}
            style={{...INP,flex:1}}/>
        </div>

      {/* Zahlungsart */}
      <Lbl>Zahlungsart</Lbl>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {accounts.map(acc=>{
          const sel=accountId===acc.id;
          return (
            <button key={acc.id} onClick={()=>setAccountId(acc.id)}
              style={{flex:1,padding:"8px 4px",borderRadius:10,border:`2px solid ${sel?acc.color:"transparent"}`,
                cursor:"pointer",fontSize:11,fontWeight:700,textAlign:"center",
                background:sel?acc.color+"22":"rgba(255,255,255,0.04)",
                color:sel?acc.color:T.txt2,fontFamily:"inherit"}}>
              <div style={{marginBottom:1}}>{Li(acc.icon,18,T.txt)}</div>
              {acc.name}{acc.delayDays>0&&<span style={{color:T.gold,fontSize:"0.8em",marginLeft:2}}>+{acc.delayDays}d</span>}
            </button>
          );
        })}
      </div>

      {/* Betrag */}
      <Lbl>{customFirstLast&&typ!=="sofort"&&typ!=="einmalig"?"Regelmäßiger Betrag (€)":"Betrag (€)"}</Lbl>
      <input placeholder="0,00" value={amount} inputMode="decimal"
        onChange={e=>setAmount(e.target.value)}
        style={{...INP,fontSize:20,fontWeight:700,textAlign:"center",
          background:typ==="sofort"?"rgba(61,126,170,0.1)":"rgba(245,158,11,0.08)",
          borderColor:typ==="sofort"?"rgba(61,126,170,0.4)":"rgba(245,158,11,0.4)"}}/>

      {/* ── VORMERKEN-FELDER (alle Typen außer sofort) ── */}
      {typ!=="sofort"&&(<>

        {/* Intervall (nur wiederkehrend + finanzierung) */}
        {(typ==="wiederkehrend"||typ==="finanzierung")&&(
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <div style={{flex:1}}>
              <Lbl>Intervall</Lbl>
              <div style={{display:"flex",gap:3}}>
                {[[1,"mtl."],[3,"quartl."],[6,"halb."],[12,"jährl."]].map(([v,l])=>(
                  <button key={v} onClick={()=>setInterval_(v)}
                    style={{flex:1,padding:"6px 2px",borderRadius:8,border:"none",cursor:"pointer",
                      fontFamily:"inherit",fontSize:9,fontWeight:700,
                      background:interval_===v?T.blue:"rgba(255,255,255,0.08)",
                      color:interval_===v?"#fff":T.txt2}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{flex:1}}>
              <Lbl>{typ==="finanzierung"?"Anzahl Raten":"Anzahl (leer=7J)"}</Lbl>
              <input value={count} onChange={e=>{setCount(e.target.value);if(e.target.value)setEndDate("");}}
                placeholder={typ==="finanzierung"?"z.B. 36":String(totalCount)}
                inputMode="numeric"
                style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box"}}/>
            </div>
          </div>
        )}

        {/* Enddatum (nur wiederkehrend) */}
        {typ==="wiederkehrend"&&!count&&(
          <div style={{marginBottom:8}}>
            <Lbl>oder Enddatum</Lbl>
            {endDate?(
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <input type="date" value={endDate}
                  onChange={e=>{setEndDate(e.target.value);setCount("");}}
                  style={{...INP,marginBottom:0,flex:1,colorScheme:isLight?"light":"dark"}}/>
                <button onClick={()=>setEndDate("")}
                  style={{background:"none",border:"none",color:T.neg,cursor:"pointer",padding:"4px"}}>
                  {Li("x",11)}
                </button>
              </div>
            ):(
              <button onClick={()=>{setEndDate(new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10));setCount("");}}
                style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",cursor:"pointer",
                  color:T.txt2,textAlign:"left",fontFamily:"inherit",
                  border:`1px solid ${T.gold}44`,background:"transparent"}}>
                kein Enddatum
              </button>
            )}
          </div>
        )}

        {/* Letzter Tag des Monats (nur wiederkehrend) */}
        {typ==="wiederkehrend"&&(
          <div onClick={()=>{
            const next = !lastOfMonth;
            setLastOfMonth(next);
            if(next && startDate) {
              const [y,m] = startDate.split("-").map(Number);
              const lastDay = new Date(y, m, 0).getDate();
              setStartDate(`${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`);
            }
          }}
            style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer",
              padding:"5px 8px",borderRadius:8,
              background:lastOfMonth?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.03)",
              border:`1px solid ${lastOfMonth?T.blue:T.bd}`}}>
            <div style={{width:34,height:20,borderRadius:10,position:"relative",flexShrink:0,
              background:lastOfMonth?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:2,left:lastOfMonth?14:2,width:16,height:16,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s",
                boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
            </div>
            <span style={{color:lastOfMonth?T.txt:T.txt2,fontSize:10}}>
              Immer letzter Tag des Monats
            </span>
          </div>
        )}

        {/* Abweichende Erst-/Letztbuchung (nur Finanzierung) */}
        {typ==="finanzierung"&&(
          <div onClick={()=>{setCustomFirstLast(v=>{if(v){setFirstAmount("");setLastAmount("");}return !v;})}}
            style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer",
              padding:"5px 8px",borderRadius:8,
              background:customFirstLast?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.03)",
              border:`1px solid ${customFirstLast?T.blue:T.bd}`}}>
            <div style={{width:34,height:20,borderRadius:10,position:"relative",flexShrink:0,
              background:customFirstLast?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:2,left:customFirstLast?14:2,width:16,height:16,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s",
                boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
            </div>
            <span style={{color:customFirstLast?T.txt:T.txt2,fontSize:10}}>
              Abweichende Anzahlung / Schlussrate
            </span>
          </div>
        )}

        {/* Erst-/Letztbetrag nur für Finanzierung */}
        {customFirstLast&&typ==="finanzierung"&&(
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <div style={{flex:1}}>
              <Lbl>Startbetrag (1. Buchung)</Lbl>
              <input value={firstAmount} onChange={e=>setFirstAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                placeholder={amount||"0,00"} inputMode="decimal"
                style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",border:`1px solid ${T.blue}66`}}/>
            </div>
            <div style={{flex:1}}>
              <Lbl>Endbetrag (letzte Buchung)</Lbl>
              <input value={lastAmount} onChange={e=>setLastAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                placeholder={amount||"0,00"} inputMode="decimal"
                style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",border:`1px solid ${T.blue}66`}}/>
            </div>
          </div>
        )}

        {/* Verursachungsdatum (nur einmalig) */}
        {typ==="einmalig"&&(
          <div style={{marginBottom:8}}>
            <Lbl style={{display:"flex",alignItems:"center",gap:4}}>
              {Li("calendar",10,T.txt2)} Verursachungsdatum (optional)
            </Lbl>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <input type="date" value={valueDate} onChange={e=>setValueDate(e.target.value)}
                style={{...INP,marginBottom:0,flex:1,colorScheme:isLight?"light":"dark"}}/>
              {valueDate&&(
                <button onClick={()=>setValueDate("")}
                  style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:"4px"}}>
                  {Li("x",11)}
                </button>
              )}
            </div>
            <div style={{color:T.txt2,fontSize:9,marginTop:2,opacity:0.7}}>
              Wann ist der Vorgang entstanden (z.B. Bestelldatum)
            </div>
          </div>
        )}

        {/* Vorschau (wiederkehrend + finanzierung) */}
        {(typ==="wiederkehrend"||typ==="finanzierung")&&(
          <div style={{background:"rgba(0,0,0,0.2)",borderRadius:9,padding:"8px 10px",
            marginBottom:8,fontSize:10,color:T.txt2,lineHeight:1.6}}>
            <span style={{color:T.pos,fontWeight:700}}>
              {totalCount>=84&&!count&&typ==="wiederkehrend"
                ?"Unbegrenzt (7 Jahre)"
                :`${totalCount} ${typ==="finanzierung"?"Rate":"Buchung"}${totalCount!==1?"en":""}`}
            </span>
            {startDate&&<> · Start: {(()=>{const d=new Date(startDate);return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;})()}</>}
            {endPreview&&<> · Ende: {endPreview}</>}
            {preview.length>1&&<> · {preview.map(d=>{const dt=new Date(d);return `${pad(dt.getDate())}.${pad(dt.getMonth()+1)}`;}).join(", ")}{totalCount>3?"…":""}</>}
          </div>
        )}
      </>)}

      {/* Kategorie */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <Lbl style={{margin:0,flex:1}}>Kategorie</Lbl>
        {typ==="sofort"&&pn(amount)>0&&(
          <button onClick={addSplit}
            style={{background:"transparent",border:`1px solid ${T.bds}`,borderRadius:7,
              padding:"2px 9px",color:T.blue,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {Li("plus",11,T.blue)}Split
          </button>
        )}
      </div>

      {/* Kategorie — CatPicker für alle Typen */}
      <CatPicker
        value={(typ==="csv"||typ==="budget"||typ==="kategorie"||typ==="kontostand")
          ? "|"
          : (typ==="einmalig"||typ==="wiederkehrend"||typ==="finanzierung")
            ? catId+"|"+subId
            : (newTx.splits[0]?.catId||"")+"|"+(newTx.splits[0]?.subId||"")}
        onChange={(cId,sId)=>{
          setCatId(cId); setSubId(sId);
        }}
        filterType={csvType||"expense"}
        placeholder="Kategorie wählen (optional)…"
      />

      {/* Notiz — volle Breite */}
      <Lbl>Notiz (optional)</Lbl>
      <textarea placeholder="Notiz…" value={note} onChange={e=>setNote(e.target.value)}
        rows={2} style={{...INP,resize:"none",fontFamily:"inherit",lineHeight:1.4,
          marginBottom:4,width:"100%",boxSizing:"border-box"}}/>

      {error&&<div style={{color:T.neg,fontSize:11,marginBottom:8}}>{error}</div>}

      {/* Speichern */}
      <PBtn onClick={handleSave}
        disabled={!vormValid}
        bg={typ==="sofort"?T.blue:T.gold}>
        {saved?<>{Li("check",15,"#fff")} Gespeichert!</>:
         typ==="einmalig"?<>{Li("calendar",15,T.on_accent)} Vormerkung anlegen</>:
         typ==="finanzierung"?<>{totalCount} Rate{totalCount!==1?"n":""} anlegen</>:
         <>{totalCount>=84&&!count?"∞":totalCount}× Wiederkehrend anlegen</>}
      </PBtn>

      </>}

      {/* Wiederkehrende aus CSV erkennen — nur im Wiederkehrend-Tab */}
      {typ==="wiederkehrend"&&(
        <>
          <div style={{borderTop:`1px solid ${T.bd}`,margin:"14px 0 10px"}}/>
          <VormHubSecToggle label="wiederkehrende aus CSV erkennen" icon="search"
            active={secErkennen} onToggle={()=>setSecErkennen(v=>!v)}
            accent={T.mid}/>
          {secErkennen&&(
            <div style={{minHeight:200,marginBottom:8}}>
              <RecurringDetectionScreen embedded onClose={closeReset} initialTab="vormerkung"
                onOpenVormHub={handleCsvPrefill}/>
            </div>
          )}
        </>
      )}
    </Overlay>
  );
}


// Kompakter Dialog nur für Bezeichnung + Farbe + Icon

export { AddTxModal };
