// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useState } from "react";
import { IconPickerDialog } from "./IconPickerDialog.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, isLightTheme } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function SubRow({sub, si, arr, cat}) {
  const { moveSub, renameSub, deleteSub, updateSub, budgets, setBudgets, txs, setTxs, year, month, accounts } = useContext(AppCtx);
  const [subEdit, setSubEdit] = useState(false);
  const [budgetInput, setBudgetInput] = useState(()=>String(budgets[sub.id]?.amount||"").replace(".",","));
  const [budgetInputMitte, setBudgetInputMitte] = useState(()=>String(budgets[sub.id+"_mitte"]?.amount||"").replace(".",","));
  const [budgetMonths, setBudgetMonths] = useState(()=>budgets[sub.id]?.months||1);

  // Startdatum: Tag aus gespeichertem Budget (oder 1), aber Jahr/Monat vom aktuellen Monat
  const calcStartDate = (y, mo) => {
    const existing = budgets[sub.id]?.startDate;
    const rawDay = existing ? parseInt(existing.split("-")[2]) : 1;
    const maxDay = new Date(y, mo+1, 0).getDate();
    const day = String(Math.min(rawDay, maxDay)).padStart(2,"0");
    return `${y}-${String(mo+1).padStart(2,"0")}-${day}`;
  };
  const [budgetStartDate, setBudgetStartDate] = useState(()=>calcStartDate(year, month));
  const [budgetEndDate, setBudgetEndDate] = useState("");
  const [budgetSaved, setBudgetSaved] = useState(false);

  // budgetInput + budgetStartDate dynamisch bei Monat-/Jahr-Wechsel aktualisieren
  React.useEffect(()=>{
    if(subEdit==="budget") {
      // Betrag: aus dem Platzhalter des aktuellen Monats lesen
      const pad = n=>String(n).padStart(2,"0");
      const monthPrefix = `${year}-${pad(month+1)}-`;
      const existingTx = txs.find(t=>t._budgetSubId===sub.id && t.pending && t.date.startsWith(monthPrefix));
      if(existingTx) setBudgetInput(String(existingTx.totalAmount).replace(".",","));
      else setBudgetInput(String(budgets[sub.id]?.amount||"").replace(".",","));
      // Startdatum: Tag aus gespeichertem Budget, Jahr/Monat vom aktuellen Monat
      const existingDate = budgets[sub.id]?.startDate;
      const rawDay = existingDate ? parseInt(existingDate.split("-")[2]) : 1;
      const maxDay = new Date(year, month+1, 0).getDate();
      const day = String(Math.min(rawDay, maxDay)).padStart(2,"0");
      setBudgetStartDate(`${year}-${pad(month+1)}-${day}`);
    }
  }, [year, month, subEdit]);

  // Schnellwahl: Tag-Bereich für wiederkehrende Buchungen im Monat
  // Gibt ein Startdatum für den nächsten passenden Monat zurück
  const applyQuickDate = (type) => {
    const ref = budgetStartDate ? new Date(budgetStartDate+"T12:00:00") : new Date();
    const y = ref.getFullYear(), mo = ref.getMonth()+1;
    const pad = n=>String(n).padStart(2,"0");
    if(type==="h1") { setBudgetStartDate(`${y}-${pad(mo)}-01`); setBudgetEndDate(`${y}-${pad(mo)}-15`); }
    if(type==="h2") { const last=new Date(y,mo,0).getDate(); setBudgetStartDate(`${y}-${pad(mo)}-16`); setBudgetEndDate(`${y}-${pad(mo)}-${last}`); }
    if(type==="w1") { setBudgetStartDate(`${y}-${pad(mo)}-01`); setBudgetEndDate(`${y}-${pad(mo)}-07`); }
    if(type==="w2") { setBudgetStartDate(`${y}-${pad(mo)}-08`); setBudgetEndDate(`${y}-${pad(mo)}-14`); }
    if(type==="w3") { setBudgetStartDate(`${y}-${pad(mo)}-15`); setBudgetEndDate(`${y}-${pad(mo)}-21`); }
    if(type==="w4") { const last=new Date(y,mo,0).getDate(); setBudgetStartDate(`${y}-${pad(mo)}-22`); setBudgetEndDate(`${y}-${pad(mo)}-${last}`); }
  };

  const saveBudget = (scope="all") => {
    const amount = pn(budgetInput);
    const amountMitte = pn(budgetInputMitte);
    if(amount<=0 && !amountMitte) {
      setBudgets(p=>{const n={...p};delete n[sub.id];delete n[sub.id+"_mitte"];return n;});
      setTxs(p=>p.filter(t=>t._budgetSubId!==sub.id&&t._budgetSubId!==sub.id+"_mitte"));
      setBudgetSaved(true); setTimeout(()=>setBudgetSaved(false),1500);
      return;
    }
    const interval = budgetMonths;
    const [sY, sM, sD] = budgetStartDate.split("-").map(Number);
    const startYear = sY;
    const startMonth = sM - 1; // 0-indexed
    const startDay = sD;

    // ── Scope: Nur diese ──────────────────────────────────────────────────
    if(scope==="single") {
      setTxs(p=>p.map(t=>{
        if(!(t._budgetSubId===sub.id && t.pending)) return t;
        // Nur den Eintrag für den aktuellen Monat/Tag aktualisieren
        const [tY, tM] = t.date.split("-").map(Number);
        if(tY===sY && tM===sM) {
          // Budget-Platzhalter immer am letzten Tag des Monats datieren
          // (Mitte-Platzhalter haben eigenes _budgetSubId+"_mitte"-Suffix, kommen hier nicht durch).
          const lastDay = new Date(tY, tM, 0).getDate();
          const day = String(lastDay).padStart(2,"0");
          return {...t, totalAmount:amount, date:`${tY}-${String(tM).padStart(2,"0")}-${day}`,
            splits:[{...((t.splits||[])[0]||{}), amount}]};
        }
        return t;
      }));
      setBudgetSaved(true); setTimeout(()=>setBudgetSaved(false),2000);
      return;
    }

    // ── End-Datum berechnen ────────────────────────────────────────────────
    let endYear, endMonth;
    if(budgetEndDate) {
      const [eY, eM] = budgetEndDate.split("-").map(Number);
      endYear = eY; endMonth = eM - 1;
    } else {
      endYear = startYear + 6; endMonth = 11;
    }

    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    const totalEntries = Math.ceil(totalMonths / interval);
    const acc = accounts[0];

    const newPendings = Array.from({length:totalEntries},(_,i)=>{
      const totalM = i * interval;
      const m = (startMonth + totalM) % 12;
      const y = startYear + Math.floor((startMonth + totalM) / 12);
      if(y > endYear || (y===endYear && m > endMonth)) return null;
      // Budget-Platzhalter (Mitte=0, also nur Ende-Budget) wird auf den
      // letzten Tag des Monats datiert — semantisch das "Ende-Budget"
      // unabhängig vom User-Input-Startdatum (das Startdatum bestimmt nur
      // den Monat, nicht den Tag, weil Budgets Monats-Logik haben).
      const lastDay = new Date(y, m+1, 0).getDate();
      const dateStr = `${y}-${String(m+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
      return {
        id:"budget-"+sub.id+"-"+i+"-"+Date.now(),
        date: dateStr,
        desc:`${cat.name} / ${sub.name}`,
        totalAmount: amount,
        pending: true,
        accountId: acc?.id||"acc-giro",
        pendingDate:"", repeatMonths: interval,
        _budgetSubId: sub.id, _csvType: "expense",
        splits:[{id:uid(),catId:cat.id,subId:sub.id,amount}],
      };
    }).filter(Boolean);

    if(scope==="from") {
      // Ab diesem: nur bereits existierende Platzhalter ab budgetStartDate aktualisieren
      // KEINE neuen Einträge für Monate erstellen die vorher leer waren
      setTxs(p=>p.map(t=>{
        if(!(t._budgetSubId===sub.id && t.pending && t.date>=budgetStartDate)) return t;
        // Betrag + Tag anpassen, Monat/Jahr beibehalten.
        // Budget-Platzhalter (Ende-Budget) immer auf den letzten Tag des Monats datieren.
        const [tY, tM] = t.date.split("-").map(Number);
        const lastDay = new Date(tY, tM, 0).getDate();
        const day = String(lastDay).padStart(2,"0");
        return {...t,
          totalAmount: amount,
          date: `${tY}-${String(tM).padStart(2,"0")}-${day}`,
          splits: [{...((t.splits||[])[0]||{}), id:uid(), amount}],
          repeatMonths: interval,
        };
      }));
    } else {
      // Alle: komplett neu aufbauen
      setBudgets(p=>({...p,[sub.id]:{amount,months:interval,catId:cat.id,startDate:budgetStartDate,endDate:budgetEndDate||"",createdYear:startYear}}));
      if(amountMitte>0) {
        // Mitte-Einträge: Tag 1 jedes Monats
        const mittePendings = Array.from({length:totalEntries},(_,i)=>{
          const totalM = i * interval;
          const m = (startMonth + totalM) % 12;
          const y = startYear + Math.floor((startMonth + totalM) / 12);
          if(y > endYear || (y===endYear && m > endMonth)) return null;
          const dateStr = `${y}-${String(m+1).padStart(2,"0")}-14`;
          return {
            id:"budget-"+sub.id+"_mitte-"+i+"-"+Date.now(),
            date: dateStr,
            desc:`${cat.name} / ${sub.name}`,
            totalAmount: amountMitte,
            pending: true,
            accountId: acc?.id||"acc-giro",
            pendingDate:"", repeatMonths: interval,
            _budgetSubId: sub.id+"_mitte", _csvType: "expense",
            splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amountMitte}],
          };
        }).filter(Boolean);
        // Ende-Einträge: Tag 15 jedes Monats
        // Ende-Platzhalter = Differenz (Gesamt - Mitte) = zweite Monatshälfte
        const amtEnde = Math.max(0, amount - amountMitte);
        const endePendings = Array.from({length:totalEntries},(_,i)=>{
          const totalM = i * interval;
          const m = (startMonth + totalM) % 12;
          const y = startYear + Math.floor((startMonth + totalM) / 12);
          if(y > endYear || (y===endYear && m > endMonth)) return null;
          const lastDay = new Date(y, m+1, 0).getDate();
          const dateStr = `${y}-${String(m+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
          return {
            id:"budget-"+sub.id+"-"+i+"-"+Date.now(),
            date: dateStr,
            desc:`${cat.name} / ${sub.name}`,
            totalAmount: amtEnde,
            pending: true,
            accountId: acc?.id||"acc-giro",
            pendingDate:"", repeatMonths: interval,
            _budgetSubId: sub.id, _csvType: "expense",
            splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtEnde}],
          };
        }).filter(Boolean);
        setBudgets(p=>({...p,
          [sub.id]:{amount,months:interval,catId:cat.id,startDate:budgetStartDate,endDate:budgetEndDate||"",createdYear:startYear},
          [sub.id+"_mitte"]:{amount:amountMitte,months:interval,catId:cat.id,startDate:budgetStartDate,endDate:budgetEndDate||"",createdYear:startYear},
        }));
        setTxs(p=>[...p.filter(t=>t._budgetSubId!==sub.id&&t._budgetSubId!==sub.id+"_mitte"), ...mittePendings, ...endePendings]);
      } else {
        setBudgets(p=>{const n={...p};delete n[sub.id+"_mitte"];return n;});
        setTxs(p=>[...p.filter(t=>t._budgetSubId!==sub.id&&t._budgetSubId!==sub.id+"_mitte"), ...newPendings]);
      }
    }
    setBudgetSaved(true); setTimeout(()=>setBudgetSaved(false),2000);
  };

  return (
    <div style={{background:"rgba(255,255,255,0.04)",borderRadius:12,margin:"3px 10px",border:`1px solid ${budgets[sub.id]?T.gold+"44":T.bd}`,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
          <button onClick={()=>moveSub(cat.id,sub.id,-1)} disabled={si===0}
            style={{background:"none",border:"none",color:si===0?"rgba(255,255,255,0.1)":T.txt2,cursor:si===0?"default":"pointer",fontSize:11,padding:"1px 3px",lineHeight:1}}>{Li("chevron-up",10)}</button>
          <button onClick={()=>moveSub(cat.id,sub.id,+1)} disabled={si===arr.length-1}
            style={{background:"none",border:"none",color:si===arr.length-1?"rgba(255,255,255,0.1)":T.txt2,cursor:si===arr.length-1?"default":"pointer",fontSize:11,padding:"1px 3px",lineHeight:1}}>{Li("chevron-down",10)}</button>
        </div>
        <div onClick={()=>setSubEdit(subEdit===true||subEdit==="picking"?false:true)}
          style={{width:30,height:30,borderRadius:8,background:(sub.icon?cat.color+"33":"rgba(255,255,255,0.07)"),border:`1px solid ${(subEdit===true||subEdit==="picking")?T.blue:T.bd}`,fontSize:16,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {sub.icon ? Li(sub.icon,15,cat.color||T.blue) : "·"}
        </div>
        <button onClick={()=>setSubEdit(subEdit==="budget"?false:"budget")}
          style={{background:subEdit==="budget"?T.gold+"22":"none",
            border:`1px solid ${subEdit==="budget"?T.gold+"66":"transparent"}`,
            color:subEdit==="budget"?T.gold:(budgets[sub.id]?T.gold:T.txt2),
            cursor:"pointer",borderRadius:7,padding:"4px 6px",flexShrink:0,
            display:"flex",alignItems:"center"}}>
          {subEdit==="budget" ? Li("arrow-left",14,T.gold) : Li("target",13,budgets[sub.id]?T.gold:T.txt2)}
        </button>
        <div style={{flex:1,minWidth:0}}>
          <input defaultValue={sub.name} style={{...INP,marginBottom:0,width:"100%",fontSize:13,padding:"4px 8px"}}
            onBlur={e=>renameSub(cat.id,sub.id,e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){renameSub(cat.id,sub.id,e.target.value);e.target.blur();}}}/>
          {(()=>{
            const lastTx = txs.filter(t=>!t.pending&&(t.splits||[]).some(s=>s.subId===sub.id))
              .sort((a,b)=>b.date.localeCompare(a.date))[0];
            if(!lastTx) return <span style={{color:T.neg,opacity:0.6,fontSize:9,marginLeft:4}}>nie genutzt</span>;
            const [y,m] = lastTx.date.split("-");
            const age = (new Date().getFullYear()-Number(y))*12 + (new Date().getMonth()+1-Number(m));
            const col = age>24?"rgba(224,80,96,0.6)":age>12?T.gold:T.txt2;
            return <span style={{color:col,fontSize:9,marginLeft:4}}>zuletzt: {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][Number(m)-1]} {y}</span>;
          })()}
        </div>
        {budgets[sub.id]&&(
          <span style={{color:T.gold,fontSize:10,fontWeight:700,flexShrink:0,background:(isLightTheme())?"rgba(192,120,0,0.15)":"rgba(245,166,35,0.12)",borderRadius:5,padding:"1px 5px"}}>
            {Li("target",9,T.gold)} {fmt(budgets[sub.id].amount)} {budgets[sub.id].months===1?"mtl.":budgets[sub.id].months===3?"quartl.":budgets[sub.id].months===6?"halbj.":"jährl."}{budgets[sub.id].startDate?` · ${budgets[sub.id].startDate.split("-")[2]}.`:""}
          </span>
        )}
        <button onClick={()=>{if(window.confirm(`"${sub.name}" wirklich löschen?`)) deleteSub(cat.id,sub.id);}} style={{background:"none",border:"none",color:T.neg,opacity:0.55,cursor:"pointer",fontSize:15,flexShrink:0,display:"flex",alignItems:"center"}}>{Li("trash-2",14)}</button>
      </div>
      {subEdit==="budget"&&(
        <div style={{borderTop:`1px solid ${T.bd}`,padding:"10px 10px 12px",background:(isLightTheme())?"rgba(192,120,0,0.06)":"rgba(245,166,35,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,gap:8}}>
            <div style={{color:T.gold,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
              {Li("target",11,T.gold)} Budget & Vormerkungen für „{sub.name}"
            </div>
            {/* Live-Zusammenfassung */}
            <div style={{color:T.txt2,fontSize:9,textAlign:"right",lineHeight:1.4}}>
              {pn(budgetInputMitte)>0&&pn(budgetInput)>0
                ? <>{budgetMonths===1?"mtl.":budgetMonths===3?"quartl.":"jährl."} · bis {budgetEndDate||`Ende ${parseInt(budgetStartDate.split("-")[0])+6}`}<br/>
                    <span style={{color:T.gold}}>Mitte {budgetInputMitte}€ · Gesamt {budgetInput}€</span></>
                : <span>{budgetMonths===1?"monatlich":budgetMonths===3?"quartalsweise":"jährlich"} · {budgetInput||"?"}€</span>
              }
            </div>
          </div>
          {/* Beträge + Startdatum in einer Zeile */}
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <div style={{flex:1}}>
              <div style={{color:T.txt2,fontSize:9,marginBottom:2}}>Mitte (bis 14.) €</div>
              <input value={budgetInputMitte} onChange={e=>setBudgetInputMitte(e.target.value)}
                placeholder="z.B. 125" inputMode="decimal"
                style={{...INP,marginBottom:0,width:"100%",fontSize:13,
                  border:`1px solid ${T.gold}44`,background:(isLightTheme())?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:T.txt2,fontSize:9,marginBottom:2}}>Gesamt/Monat (Ende) €</div>
              <input value={budgetInput} onChange={e=>setBudgetInput(e.target.value)}
                placeholder="z.B. 250" inputMode="decimal"
                style={{...INP,marginBottom:0,width:"100%",fontSize:13,
                  border:`1px solid ${T.gold}44`,background:(isLightTheme())?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:T.txt2,fontSize:9,marginBottom:2}}>Startdatum</div>
              <input type="date" value={budgetStartDate} onChange={e=>setBudgetStartDate(e.target.value)}
                style={{...INP,marginBottom:0,fontSize:11,padding:"6px 6px",width:"100%",
                  border:`1px solid ${T.gold}44`,background:(isLightTheme())?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",
                  colorScheme:"dark"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:T.txt2,fontSize:9,marginBottom:2}}>Enddatum <span style={{opacity:0.6}}>(leer=7J)</span></div>
              <div style={{display:"flex",gap:2,alignItems:"center"}}>
                {/* Wenn leer: Textfeld zeigen statt date-Input (Browser zeigt sonst heute) */}
                {budgetEndDate ? (
                  <>
                    <input type="date" value={budgetEndDate}
                      onChange={e=>setBudgetEndDate(e.target.value)}
                      min={new Date(Date.now()+86400000).toISOString().slice(0,10)}
                      style={{...INP,marginBottom:0,fontSize:11,padding:"6px 6px",flex:1,
                        border:`1px solid ${T.blue+"66"}`,
                        background:(isLightTheme())?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",
                        colorScheme:(isLightTheme())?"light":"dark"}}/>
                    <button onClick={()=>setBudgetEndDate("")}
                      style={{background:"none",border:"none",color:T.neg,
                        cursor:"pointer",padding:"2px",flexShrink:0}}>
                      {Li("x",10)}
                    </button>
                  </>
                ) : (
                  <button onClick={()=>setBudgetEndDate(new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10))}
                    style={{...INP,marginBottom:0,fontSize:11,padding:"6px 6px",flex:1,
                      border:`1px solid ${T.gold+"44"}`,cursor:"pointer",textAlign:"left",
                      background:(isLightTheme())?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",
                      color:T.txt2,fontFamily:"inherit"}}>
                    kein Enddatum (7 Jahre)
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Schnellwahlen + Wiederholung in einer Zeile */}
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
            <div style={{color:T.txt2,fontSize:9,flexShrink:0}}>Schnellwahl:</div>
            {[{k:"h1",l:"1.H"},{k:"h2",l:"2.H"},{k:"w1",l:"W1"},{k:"w2",l:"W2"},{k:"w3",l:"W3"},{k:"w4",l:"W4"}].map(({k,l})=>(
              <button key={k} onClick={()=>applyQuickDate(k)}
                style={{padding:"3px 6px",borderRadius:5,border:`1px solid ${T.gold}44`,
                  background:(isLightTheme())?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",color:T.gold,fontSize:9,fontWeight:700,cursor:"pointer"}}>
                {l}
              </button>
            ))}
            <div style={{marginLeft:"auto",display:"flex",gap:4}}>
              {[{v:1,l:"mtl."},{v:3,l:"quartl."},{v:12,l:"jährl."}].map(({v,l})=>(
                <button key={v} onClick={()=>setBudgetMonths(v)}
                  style={{padding:"3px 8px",borderRadius:6,
                    border:`1.5px solid ${budgetMonths===v?T.gold:T.bd}`,
                    background:budgetMonths===v?T.gold+"22":"transparent",
                    color:budgetMonths===v?T.gold:T.txt2,fontSize:9,fontWeight:700,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {budgets[sub.id] ? (<>
            <div style={{color:T.gold,fontSize:10,fontWeight:700,textAlign:"center",marginBottom:4}}>
              {budgetSaved ? "✓ Gespeichert!" : "Welche Platzhalter aktualisieren?"}
            </div>
            <div style={{display:"flex",gap:4,marginBottom:6}}>
              <button onClick={()=>saveBudget("single")}
                style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${T.gold}44`,
                  background:"rgba(245,166,35,0.1)",color:T.gold,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit"}}>
                {Li("check",11,T.gold)} Nur dieser
              </button>
              <button onClick={()=>saveBudget("from")}
                style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${T.blue}44`,
                  background:"rgba(74,159,212,0.1)",color:T.blue,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit"}}>
                {Li("check",11,T.blue)} Ab diesem
              </button>
              <button onClick={()=>saveBudget("all")}
                style={{flex:1,padding:"8px 4px",borderRadius:10,border:"none",
                  background:budgetInput?T.gold:T.disabled,color:T.on_accent,fontSize:11,fontWeight:700,
                  cursor:budgetInput?"pointer":"default",opacity:budgetInput?1:0.4,fontFamily:"inherit"}}>
                {Li("check",11,T.on_accent)} Alle
              </button>
            </div>
          </>) : (
            <button onClick={()=>saveBudget("all")}
              style={{flex:2,padding:"8px",borderRadius:9,border:"none",marginBottom:6,
                background:budgetInput?T.gold:T.disabled,color:T.on_accent,
                fontSize:12,fontWeight:700,cursor:budgetInput?"pointer":"default",
                opacity:budgetInput?1:0.4,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
              {Li("check",12,T.on_accent)} {budgetSaved?"Gespeichert!":"Budget & Platzhalter setzen"}
            </button>
          )}
          <div style={{display:"flex",gap:6}}>
            {budgets[sub.id]&&(
              <button onClick={()=>{
                setBudgets(p=>{const n={...p};delete n[sub.id];delete n[sub.id+"_mitte"];return n;});
                setTxs(p=>p.filter(t=>t._budgetSubId!==sub.id&&t._budgetSubId!==sub.id+"_mitte"));
                setBudgetInput(""); setBudgetInputMitte(""); setSubEdit(false);
              }} style={{flex:1,padding:"8px",borderRadius:9,border:`1px solid ${T.neg}44`,
                background:`${T.neg}08`,color:T.neg,fontSize:11,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                {Li("trash-2",11,T.neg)} Entfernen
              </button>
            )}
          </div>
        </div>
      )}
      {(subEdit===true||subEdit==="picking")&&(
        <div style={{borderTop:`1px solid ${T.bd}`,padding:"10px 10px 12px",background:"rgba(0,0,0,0.2)"}}>
          {subEdit==="picking"&&<IconPickerDialog selectedIcon={sub.icon} selectedColor={cat.color} onSelect={ic=>{updateSub(cat.id,sub.id,"icon",ic);setSubEdit(false);}} onClose={()=>setSubEdit(false)}/>}
          <div style={{color:T.txt2,fontSize:10,marginBottom:7}}>Icon für Unterkategorie:</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>setSubEdit("picking")}
              style={{width:36,height:36,borderRadius:9,cursor:"pointer",
                border:sub.icon?`2px solid ${cat.color||T.blue}44`:`2px dashed ${T.bds}`,
                background:sub.icon?(cat.color||T.blue)+"18":"rgba(255,255,255,0.04)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              {sub.icon ? Li(sub.icon,16,cat.color||T.blue) : Li("plus",14,T.txt2)}
            </button>
            {sub.icon&&<>
              <span style={{color:T.txt2,fontSize:11,flex:1}}>{sub.icon}</span>
              <button onClick={()=>{updateSub(cat.id,sub.id,"icon","");setSubEdit(false);}}
                style={{background:"none",border:"none",color:T.txt2,fontSize:11,cursor:"pointer"}}>Entfernen</button>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

export { SubRow };
