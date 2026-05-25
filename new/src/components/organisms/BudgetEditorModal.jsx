// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function BudgetEditorModal({sub, cat, accountId="acc-giro", onClose}) {
  const { budgets, setBudgets, txs, setTxs, year, setYear, month, setMonth, accounts } = useContext(AppCtx);
  const pad = n => String(n).padStart(2,"0");
  const isLight = T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper";
  const goldBg = isLight?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)";

  // Startdatum = Tag aus gespeichertem Budget, Monat aus App-Monatswähler
  // Default: letzter Tag des Monats (Ende-Budget) — nicht 1.!
  const calcSD = (y, mo) => {
    const ex = budgets[sub.id]?.startDate;
    const max = new Date(y, mo+1, 0).getDate();
    const day = ex ? parseInt(ex.split("-")[2]) : max;
    return `${y}-${pad(mo+1)}-${String(Math.min(day,max)).padStart(2,"0")}`;
  };

  // Initialisierung: Werte aus aktuellem Monats-Platzhalter
  const initPrefix = `${year}-${pad(month+1)}-`;
  const initPE = txs.find(t=>t.pending&&t._budgetSubId===sub.id&&t.date.startsWith(initPrefix));
  const initPM = txs.find(t=>t.pending&&t._budgetSubId===sub.id+"_mitte"&&t.date.startsWith(initPrefix));
  // Platzhalter-Beträge — KEIN Fallback auf Template (Template gilt für andere Monate)
  // Nur wenn KEIN Platzhalter existiert für irgendeinen Monat, Template als Default
  const hasAnyPlaceholder = txs.some(t=>t.pending&&(t._budgetSubId===sub.id||t._budgetSubId===sub.id+"_mitte"));
  const defaultMitte  = hasAnyPlaceholder ? (initPM?.totalAmount||0) : (budgets[sub.id+"_mitte"]?.amount||0);
  const defaultEndeRaw = hasAnyPlaceholder ? (initPE?.totalAmount||0) : (budgets[sub.id]?.amount||0);
  const defaultGesamt  = defaultMitte + defaultEndeRaw; // Gesamt = Mitte + Ende

  const [inGesamt, setInGesamt] = useState(()=>defaultGesamt?String(defaultGesamt).replace(".",","):"");
  const [inMitte,  setInMitte]  = useState(()=>defaultMitte?String(defaultMitte).replace(".",","):"");
  const [intv,     setIntv]     = useState(()=>budgets[sub.id]?.months||1);
  const [sd,       setSd]       = useState(()=>calcSD(year, month));
  const [ed,       setEd]       = useState("");
  const [saved,    setSaved]    = useState(false);

  const amtM = pn(inMitte.replace(",","."));
  const amtG = pn(inGesamt.replace(",","."));
  const amtE = Math.max(0, amtG - amtM); // Ende = Gesamt - Mitte

  const doDelete = (scope) => {
    const [sY,sM] = sd.split("-").map(Number);
    const pfx = `${sY}-${pad(sM)}-`;
    if(scope==="single") {
      setTxs(p=>p.filter(t=>!(t.pending&&
        (t._budgetSubId===sub.id||t._budgetSubId===sub.id+"_mitte")&&
        t.date.startsWith(pfx))));
    } else if(scope==="from") {
      setTxs(p=>p.filter(t=>!(t.pending&&
        (t._budgetSubId===sub.id||t._budgetSubId===sub.id+"_mitte")&&
        t.date>=sd)));
    } else {
      setBudgets(p=>{const n={...p};delete n[sub.id];delete n[sub.id+"_mitte"];return n;});
      setTxs(p=>p.filter(t=>t._budgetSubId!==sub.id&&t._budgetSubId!==sub.id+"_mitte"));
    }
    setSaved(true); setTimeout(()=>{setSaved(false);onClose();},1200);
  };

  const doSave = (scope) => {
    const [sY,sM,sD] = sd.split("-").map(Number);
    const acc = accounts?.[0];

    if(amtE<=0 && amtM<=0) {
      // Löschen
      if(scope==="single") {
        const pfx = `${sY}-${pad(sM)}-`;
        setTxs(p=>p.filter(t=>!(t.pending&&
          (t._budgetSubId===sub.id||t._budgetSubId===sub.id+"_mitte")&&
          t.date.startsWith(pfx))));
      } else if(scope==="from") {
        setTxs(p=>p.filter(t=>!(t.pending&&
          (t._budgetSubId===sub.id||t._budgetSubId===sub.id+"_mitte")&&
          t.date>=sd)));
      } else {
        setBudgets(p=>{const n={...p};delete n[sub.id];delete n[sub.id+"_mitte"];return n;});
        setTxs(p=>p.filter(t=>t._budgetSubId!==sub.id&&t._budgetSubId!==sub.id+"_mitte"));
      }
      setSaved(true); setTimeout(()=>{setSaved(false);onClose();},1200);
      return;
    }

    if(scope==="single") {
      // Nur diesen Monat: NUR txs ändern — budgets-Template NICHT anfassen
      const pfx = `${sY}-${pad(sM)}-`;
      const maxD = new Date(sY,sM,0).getDate();
      const dayE = String(Math.min(sD,maxD)).padStart(2,"0");
      setTxs(p=>{
        const rest = p.filter(t=>!(t.pending&&
          (t._budgetSubId===sub.id||t._budgetSubId===sub.id+"_mitte")&&
          t.date.startsWith(pfx)));
        const add = [];
        if(amtE>0) add.push({id:uid(),date:`${sY}-${pad(sM)}-${dayE}`,
          desc:sub.name,totalAmount:amtE,pending:true,_budgetSubId:sub.id,
          accountId:acc?.id||"acc-giro",
          splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtE}],_csvType:"expense"});
        if(amtM>0) add.push({id:uid(),date:`${sY}-${pad(sM)}-14`,
          desc:sub.name,totalAmount:amtM,pending:true,_budgetSubId:sub.id+"_mitte",
          accountId:acc?.id||"acc-giro",
          splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtM}],_csvType:"expense"});
        return [...rest,...add];
      });

    } else if(scope==="from") {
      // Ab diesem Monat: bestehende Platzhalter ab sd aktualisieren
      setTxs(p=>p.map(t=>{
        if(!t.pending) return t;
        if(t._budgetSubId===sub.id&&t.date>=sd) {
          const [tY,tM]=t.date.split("-").map(Number);
          const maxD=new Date(tY,tM,0).getDate();
          const day=String(Math.min(sD,maxD)).padStart(2,"0");
          return {...t,totalAmount:amtE,date:`${tY}-${pad(tM)}-${day}`,
            splits:[{...((t.splits||[])[0]||{}),amount:amtE}]};
        }
        if(t._budgetSubId===sub.id+"_mitte"&&t.date>=sd) {
          if(amtM>0) return {...t,totalAmount:amtM,
            splits:[{...((t.splits||[])[0]||{}),amount:amtM}]};
          return null; // Mitte entfernen
        }
        return t;
      }).filter(Boolean));
      setBudgets(p=>({...p,
        [sub.id]:{amount:amtE,months:intv,startDate:sd,endDate:ed||"",accountId:accountId},
        ...(amtM>0
          ? {[sub.id+"_mitte"]:{amount:amtM,months:intv,startDate:sd,endDate:ed||"",accountId:accountId}}
          : (p[sub.id+"_mitte"]?{[sub.id+"_mitte"]:undefined}:{}))
      }));

    } else {
      // Alle: komplett neu aufbauen
      setBudgets(p=>({...p,
        [sub.id]:{amount:amtE,months:intv,startDate:sd,endDate:ed||"",accountId:accountId},
        ...(amtM>0
          ? {[sub.id+"_mitte"]:{amount:amtM,months:intv,startDate:sd,endDate:ed||"",accountId:accountId}}
          : (p[sub.id+"_mitte"]?{[sub.id+"_mitte"]:undefined}:{}))
      }));
      const endY = ed?new Date(ed).getFullYear():sY+6;
      const endMo= ed?new Date(ed).getMonth():11;
      const startMo = sM-1;
      const totalMos = (endY-sY)*12+(endMo-startMo)+1;
      const n = Math.ceil(totalMos/intv);
      const newP = [];
      for(let i=0;i<n;i++){
        const tm=i*intv, m=(startMo+tm)%12, y=sY+Math.floor((startMo+tm)/12);
        if(y>endY||(y===endY&&m>endMo)) break;
        const maxD=new Date(y,m+1,0).getDate();
        const day=String(Math.min(sD,maxD)).padStart(2,"0");
        newP.push({id:uid(),date:`${y}-${pad(m+1)}-${day}`,
          desc:sub.name,totalAmount:amtE,pending:true,_budgetSubId:sub.id,
          accountId:acc?.id||"acc-giro",
          splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtE}],_csvType:"expense"});
        if(amtM>0) newP.push({id:uid(),date:`${y}-${pad(m+1)}-14`,
          desc:sub.name,totalAmount:amtM,pending:true,_budgetSubId:sub.id+"_mitte",
          accountId:acc?.id||"acc-giro",
          splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtM}],_csvType:"expense"});
      }
      setTxs(p=>[...p.filter(t=>!t.pending||
        (t._budgetSubId!==sub.id&&t._budgetSubId!==sub.id+"_mitte")),...newP]);
    }
    setSaved(true); setTimeout(()=>{setSaved(false);onClose();},1200);
  };

  const hasBudget = !!budgets[sub.id] || txs.some(t=>t.pending&&t._budgetSubId===sub.id);

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",
      backdropFilter:"blur(8px)",zIndex:90,display:"flex",alignItems:"center",
      justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surf2,borderRadius:20,
        padding:"16px",width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",
        border:`1px solid ${T.gold}44`,boxShadow:"0 16px 48px rgba(0,0,0,0.6)"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:34,height:34,borderRadius:9,background:T.gold+"22",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {Li("target",16,T.gold)}
          </div>
          <div style={{flex:1}}>
            <div style={{color:T.gold,fontSize:14,fontWeight:700}}>Budget: {sub.name}</div>
            <div style={{color:T.blue,fontSize:11}}>
              Aktiver Monat: {year}-{pad(month+1)} · über Wähler oben ändern
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:T.txt2,cursor:"pointer",fontSize:18}}>{Li("x",14)}</button>
        </div>

        {/* Felder: Mitte + Ende */}
        <div style={{display:"flex",gap:8,marginBottom:6}}>
          <div style={{flex:1}}>
            <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>
              Mitte (bis 14.) € <span style={{opacity:0.5,fontSize:9}}>optional</span>
            </div>
            <input value={inMitte} onChange={e=>{
                const prev = pn(inMitte.replace(",","."));
                const curG = pn(inGesamt.replace(",","."));
                setInMitte(e.target.value);
                if(e.target.value===""&&prev>0&&curG>0)
                  setInGesamt(String(Math.max(0,curG-prev)).replace(".",","));
              }}
              placeholder="leer = kein Split" inputMode="decimal"
              style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",
                border:`1px solid ${T.mid}55`,background:goldBg}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>{intv===1?"Gesamt/Monat":intv===3?"Gesamt/Quartal":intv===6?"Gesamt/Halbjahr":"Gesamt/Jahr"} €</div>
            <input value={inGesamt} onChange={e=>setInGesamt(e.target.value)}
              placeholder="z.B. 300" inputMode="decimal"
              style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",
                border:`1px solid ${T.gold}55`,background:goldBg}}/>
          </div>
        </div>

        {/* Mitte / Ende / Gesamt — eine Zeile */}
        {amtG>0&&(
          <div style={{display:"flex",gap:12,marginBottom:10,
            background:"rgba(255,255,255,0.04)",borderRadius:7,padding:"6px 10px",
            fontSize:12,fontFamily:"monospace"}}>
            <span><span style={{color:T.txt2,fontFamily:"inherit",fontSize:11}}>Mitte: </span>
              <span style={{color:T.mid,fontWeight:700}}>{fmt(amtM||0)}</span></span>
            <span style={{color:T.txt2}}>·</span>
            <span><span style={{color:T.txt2,fontFamily:"inherit",fontSize:11}}>Gesamt: </span>
              <span style={{color:T.txt,fontWeight:700}}>{fmt(amtG)}</span></span>
            <span style={{color:T.txt2}}>·</span>
            <span><span style={{color:T.txt2,fontFamily:"inherit",fontSize:11}}>Ende: </span>
              <span style={{color:T.pos,fontWeight:700}}>{fmt(amtE)}</span></span>
          </div>
        )}

        {/* Rhythmus */}
        <div style={{display:"flex",gap:4,marginBottom:8}}>
          {[{v:1,l:"monatlich"},{v:3,l:"quartalsw."},{v:6,l:"halbjährl."},{v:12,l:"jährlich"}].map(({v,l})=>(
            <button key={v} onClick={()=>setIntv(v)}
              style={{flex:1,padding:"6px 2px",borderRadius:8,cursor:"pointer",
                fontFamily:"inherit",fontSize:10,fontWeight:700,
                border:`1.5px solid ${intv===v?T.gold:T.bd}`,
                background:intv===v?T.gold+"22":"transparent",
                color:intv===v?T.gold:T.txt2}}>
              {l}
            </button>
          ))}
        </div>

        {/* Startdatum */}
        <div style={{marginBottom:12}}>
          <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Startdatum</div>
          <input type="date" value={sd} onChange={e=>setSd(e.target.value)}
            style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",
              border:`1px solid ${T.gold}44`,background:goldBg,colorScheme:"dark"}}/>
        </div>

        {/* Buttons */}
        {saved?(
          <div style={{textAlign:"center",color:T.pos,fontWeight:700,padding:"12px"}}>
            ✓ Gespeichert!
          </div>
        ):hasBudget?(<>
          <div style={{color:T.gold,fontSize:10,fontWeight:700,
            textAlign:"center",marginBottom:6}}>
            Welche Monate ändern?
          </div>
          <div style={{display:"flex",gap:5,marginBottom:6}}>
            {[["single","nur dieser"],["from","Ab diesem"],["all","alle"]].map(([sc,lbl])=>(
              <button key={sc} onClick={()=>doSave(sc)}
                style={{flex:1,padding:"9px 4px",borderRadius:10,fontFamily:"inherit",
                  fontSize:11,fontWeight:700,cursor:"pointer",
                  border:`1px solid ${sc==="from"?T.blue:T.gold}44`,
                  background:sc==="all"?(amtE>0?T.gold:"rgba(255,255,255,0.1)"):
                    sc==="from"?"rgba(74,159,212,0.12)":"rgba(245,166,35,0.12)",
                  color:sc==="all"?(amtE>0?T.on_accent:T.txt2):
                    sc==="from"?T.blue:T.gold}}>
                {Li("check",10,sc==="all"?(amtE>0?T.on_accent:T.txt2):sc==="from"?T.blue:T.gold)} {lbl}
              </button>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${T.bd}`,margin:"4px 0 6px"}}/>
          <div style={{color:T.txt2,fontSize:10,fontWeight:700,textAlign:"center",marginBottom:5}}>Budget löschen</div>
          <div style={{display:"flex",gap:5}}>
            {[["single","nur dieser"],["from","ab diesem"],["all","alle"]].map(([sc,lbl])=>(
              <button key={"del-"+sc} onClick={()=>doDelete(sc)}
                style={{flex:1,padding:"7px 4px",borderRadius:10,fontFamily:"inherit",
                fontSize:11,fontWeight:700,cursor:"pointer",
                border:`1px solid ${T.neg}44`,
                background:"rgba(234,64,37,0.10)",
                color:T.neg}}>
                {Li("trash-2",10,T.neg)} {lbl}
              </button>
            ))}
          </div>
        </>):(
          <button onClick={()=>doSave("all")} disabled={amtE<=0}
            style={{width:"100%",padding:"10px",borderRadius:12,border:"none",
              background:amtE>0?T.gold:"rgba(255,255,255,0.1)",
              color:amtE>0?T.on_accent:T.txt2,fontSize:13,fontWeight:700,
              cursor:amtE>0?"pointer":"default",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {Li("target",14,amtE>0?T.on_accent:T.txt2)} Budget setzen
          </button>
        )}
      </div>
    </div>
  );
}

export { BudgetEditorModal };
