// Suche & Summe: findet Buchungen/Vormerkungen über Text, "#tag" oder Betrag
// hinweg über ALLE Kategorien und Monate — und zeigt dazu direkt die Summe,
// eine Aufteilung je Monat sowie einen optionalen von/bis-Zeitraum. Löst den
// Anwendungsfall "was hat mich die Kreuzfahrt/wieviel habe ich bei Amazon
// insgesamt ausgegeben" ohne Kategorien einzeln durchzuklicken.
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchSearch, matchAmount } from "../../utils/search.js";

const MONTHS_F = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const isTxExpense = t => t.totalAmount<0 || t._csvType==="expense";

function SearchSummaryScreen({ onClose, onBack, mobileMode=false }) {
  const { txs, getCat, getSub, openEdit, setMasterOverride } = useContext(AppCtx);
  const [search, setSearch] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  const _sHandlersRef = React.useRef({});
  _sHandlersRef.current = { onBack, onClose };
  useEffect(() => {
    if(!setMasterOverride) return;
    const H = () => _sHandlersRef.current;
    setMasterOverride({
      label: "Schließen",
      onConfirm: () => (H().onBack||H().onClose)?.(),
      onBack: null,
      onDismiss: () => H().onClose?.(),
    });
    return () => setMasterOverride(null);
  }, []);

  const setPreset = (kind) => {
    const today = new Date();
    if(kind==="monat") {
      const y=today.getFullYear(), m=today.getMonth();
      setVon(`${y}-${String(m+1).padStart(2,"0")}-01`);
      setBis(new Date(y,m+1,0).toISOString().slice(0,10));
    } else if(kind==="jahr") {
      setVon(`${today.getFullYear()}-01-01`);
      setBis(`${today.getFullYear()}-12-31`);
    } else {
      setVon(""); setBis("");
    }
  };

  const matched = useMemo(() => {
    const q = search.trim();
    if(!q) return [];
    const isAmt = /^[+\-=<>]?[\d.,]+$/.test(q);
    return txs.filter(t=>{
      if(von && t.date < von) return false;
      if(bis && t.date > bis) return false;
      if(isAmt) return matchAmount(Math.abs(t.totalAmount||0), q.replace(/^[+\-]/,""));
      return matchSearch(t.desc, q, t.tags)
        || (t.splits||[]).some(sp=>matchSearch(getCat(sp.catId)?.name,q)||matchSearch(getSub(sp.catId,sp.subId)?.name,q));
    }).sort((a,b)=>b.date.localeCompare(a.date));
  }, [txs, search, von, bis]);

  const totalExpense = matched.filter(isTxExpense).reduce((s,t)=>s+Math.abs(t.totalAmount||0),0);
  const totalIncome  = matched.filter(t=>!isTxExpense(t)).reduce((s,t)=>s+Math.abs(t.totalAmount||0),0);
  const pendingCount = matched.filter(t=>t.pending).length;

  const byMonth = useMemo(() => {
    const m = new Map();
    matched.forEach(t=>{
      const key = t.date.slice(0,7);
      if(!m.has(key)) m.set(key, {expense:0, income:0, count:0});
      const e = m.get(key);
      if(isTxExpense(t)) e.expense += Math.abs(t.totalAmount||0);
      else e.income += Math.abs(t.totalAmount||0);
      e.count++;
    });
    return [...m.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
  }, [matched]);

  const monthLabel = key => { const [y,m] = key.split("-"); return `${MONTHS_F[parseInt(m,10)-1]} ${y}`; };
  const dLabel = iso => (iso||"").split("-").slice(1).reverse().join(".");

  return (
    <div className={mobileMode?"mobile-modal":undefined} style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column"}}>
      <MobileHeader title="Suche & Summe" subtitle="Positionen über Kategorien &amp; Monate finden"
        icon="bar-chart-2" iconColor={T.blue}
        onBack={onBack||onClose} onClose={onClose}/>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"12px 16px 140px"}}>

        <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.05)",
          border:`1px solid ${T.bd}`,borderRadius:11,padding:"8px 12px",marginBottom:10}}>
          {Li("search",14,T.txt2)}
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Suchen… Text, #tag oder Betrag"
            style={{flex:1,background:"transparent",border:"none",outline:"none",
              color:T.txt,fontSize:14,fontFamily:"inherit"}}/>
          {search&&<button onClick={()=>setSearch("")}
            style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:0}}>{Li("x",14)}</button>}
        </div>

        <div style={{display:"flex",gap:6,marginBottom:6}}>
          <div style={{flex:1}}>
            <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>von</div>
            <input type="date" value={von} onChange={e=>setVon(e.target.value)}
              style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",
                border:`1px solid ${T.bd}`,borderRadius:9,padding:"6px 8px",color:T.txt,
                fontSize:12,outline:"none",fontFamily:"inherit"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{color:T.txt2,fontSize:10,marginBottom:2}}>bis</div>
            <input type="date" value={bis} onChange={e=>setBis(e.target.value)}
              style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",
                border:`1px solid ${T.bd}`,borderRadius:9,padding:"6px 8px",color:T.txt,
                fontSize:12,outline:"none",fontFamily:"inherit"}}/>
          </div>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {[["monat","Dieser Monat"],["jahr","Dieses Jahr"],["alle","Alle"]].map(([k,label])=>(
            <button key={k} onClick={()=>setPreset(k)}
              style={{padding:"5px 10px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
                fontSize:11.5,fontWeight:700,border:`1px solid ${T.bd}`,
                background:"transparent",color:T.txt2}}>
              {label}
            </button>
          ))}
        </div>

        {!search.trim() ? (
          <div style={{textAlign:"center",padding:"32px 16px",color:T.txt2,fontSize:13,lineHeight:1.6}}>
            {Li("search",28,T.txt2)}
            <div style={{marginTop:10}}>
              Gib einen Suchbegriff ein — z.B. einen Namen, ein <b style={{color:T.txt}}>#tag</b> (wie „#aida")
              oder einen Betrag — um alle passenden Positionen über Kategorien und Monate hinweg
              samt Summe zu finden.
            </div>
          </div>
        ) : matched.length===0 ? (
          <div style={{textAlign:"center",padding:"32px 16px",color:T.txt2,fontSize:13}}>
            Keine Treffer für „{search.trim()}"{(von||bis)?" im gewählten Zeitraum":""}.
          </div>
        ) : (<>

          {/* Summen */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"10px 12px"}}>
              <div style={{color:T.txt2,fontSize:10,marginBottom:4}}>Ausgaben</div>
              <div style={{color:T.neg,fontSize:16,fontWeight:700,fontFamily:NUM_FONT}}>−{fmt(totalExpense)}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"10px 12px"}}>
              <div style={{color:T.txt2,fontSize:10,marginBottom:4}}>Einnahmen</div>
              <div style={{color:T.pos,fontSize:16,fontWeight:700,fontFamily:NUM_FONT}}>+{fmt(totalIncome)}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"10px 12px"}}>
              <div style={{color:T.txt2,fontSize:10,marginBottom:4}}>Netto</div>
              <div style={{color:(totalIncome-totalExpense)>=0?T.pos:T.neg,fontSize:16,fontWeight:700,fontFamily:NUM_FONT}}>
                {(totalIncome-totalExpense)>=0?"+":"−"}{fmt(Math.abs(totalIncome-totalExpense))}
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"10px 12px"}}>
              <div style={{color:T.txt2,fontSize:10,marginBottom:4}}>Positionen</div>
              <div style={{color:T.txt,fontSize:16,fontWeight:700,fontFamily:NUM_FONT}}>
                {matched.length}{pendingCount>0&&<span style={{color:T.gold,fontSize:11,fontWeight:600}}> ({pendingCount} vorgemerkt)</span>}
              </div>
            </div>
          </div>

          {/* Je Monat */}
          {byMonth.length>1&&(
            <div style={{marginBottom:16}}>
              <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6}}>Je Monat</div>
              {byMonth.map(([key,e])=>(
                <div key={key} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"6px 10px",borderBottom:`1px solid ${T.bd}`}}>
                  <span style={{flex:1,color:T.txt,fontSize:12.5}}>{monthLabel(key)}</span>
                  <span style={{color:T.txt2,fontSize:10.5,flexShrink:0}}>{e.count}×</span>
                  {e.expense>0&&<span style={{color:T.neg,fontSize:12.5,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0}}>−{fmt(e.expense)}</span>}
                  {e.income>0&&<span style={{color:T.pos,fontSize:12.5,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0}}>+{fmt(e.income)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Alle Positionen */}
          <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6}}>Alle Positionen</div>
          {matched.map(t=>{
            const sp = (t.splits||[])[0];
            const cat = getCat(sp?.catId);
            const sub = getSub(sp?.catId, sp?.subId);
            return (
              <div key={t.id} onClick={()=>openEdit?.(t)}
                style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
                  background:"rgba(255,255,255,0.03)",border:`1px solid ${T.bd}`,borderRadius:10,
                  padding:"8px 10px",marginBottom:5}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:T.txt,fontSize:13,fontWeight:600,overflow:"hidden",
                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc||cat?.name||"Buchung"}</div>
                  <div style={{color:T.txt2,fontSize:10.5,marginTop:1,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                    <span>{dLabel(t.date)}</span>
                    {(sub?.name||cat?.name)&&<span>{sub?.name||cat?.name}</span>}
                    {t.pending&&<span style={{color:T.gold,fontWeight:700}}>vorgemerkt</span>}
                    {(t.tags||[]).map(tg=>(
                      <span key={tg} style={{background:`${T.blue}1a`,color:T.blue,
                        borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>#{tg}</span>
                    ))}
                  </div>
                </div>
                <span style={{color:isTxExpense(t)?T.neg:T.pos,fontSize:14,fontWeight:700,
                  fontFamily:NUM_FONT,flexShrink:0}}>
                  {isTxExpense(t)?"−":"+"}{fmt(Math.abs(t.totalAmount||0))}
                </span>
              </div>
            );
          })}
        </>)}
      </div>
    </div>
  );
}

export { SearchSummaryScreen };
