// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { BudgetEditorModal } from "../organisms/BudgetEditorModal.jsx";
import { IconPickerDialog } from "../organisms/IconPickerDialog.jsx";
import { WerkzeugeSection } from "../organisms/WerkzeugeSection.jsx";
import { MonatScreen } from "./MonatScreen.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, isLightTheme } from "../../theme/activeTheme.js";
import { amtStyle, readableOn } from "../../theme/amtPill.js";
import { fmt, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { AccountChips } from "../molecules/AccountChips.jsx";
import { matchAmount, matchSearch } from "../../utils/search.js";
import { budgetPlaceholderActive } from "../../utils/saldo.js";

const MON_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const monthName = (key) => { const [y,m]=key.split("-"); return `${MON_SHORT[(+m||1)-1]} ${y}`; };

function TransactionsScreen() {
  const { cats,setCats,groups,setGroups,txs,setTxs,accounts,setAccounts,
    yearData,setYearData,year,setYear,month,setMonth,isLand,
    col3Name,setCol3Name,modal,setModal,mgmtCat,setMgmtCat,
    editTx,setEditTx,newTx,setNewTx,newCat,setNewCat,
    newSubName,setNewSubName,exportModal,setExportModal,
    getCat,getSub,txType,getActualSum,getTotalIncome,getTotalExpense,getPendingSum,pendingItemsFor,
    getJV,setJV,getMV,setMV,getAcc,openEdit,saveEdit,deleteFromEdit,
    updEditSplit,moveCat,moveSub,updateSub,updateCat,
    renameCat,renameSub,deleteCat,deleteSub,saveNewCat,saveNewSub,
    moveAcc,
    addSplit,removeSplit,updSplit,splitTotal,splitDiff,txValid,saveTx,
    onTS,onTE,
    csvRules,setCsvRules,
    setShowVormHub, setEditVormTx,
  } = useContext(AppCtx);

    const [filt,    setFilt]    = useState("all");
    const [txIconPick, setTxIconPick] = useState(null);
    const [search,  setSearch]  = useState("");
    const [selected,setSelected]= useState(new Set());
    const [bulkCat, setBulkCat] = useState({catId:"",subId:""});
    const [bulkAccId, setBulkAccId] = useState("");
    const [filtAcc, setFiltAcc] = useState("");
    const [hideLinked, setHideLinked] = useState(true);
    // PERFORMANCE: nur die ersten N Treffer rendern (jede Zeile mit Verknüpfungen
    // macht sonst txs.filter → O(txs) pro Zeile). Auswahl/Zähler bleiben über die
    // volle Liste; nur das DOM ist gedeckelt. Bei Filter-/Suchwechsel zurücksetzen.
    const PAGE = 80;
    const [visibleCount, setVisibleCount] = useState(PAGE);
    // Monats-Fenster: wie viele Monate vor/nach dem gewählten Monat eingeblendet
    const [showNewer, setShowNewer] = useState(0);
    const [showOlder, setShowOlder] = useState(0);
    const [showAllCats, setShowAllCats] = useState(false);
    const [activeCatTxId, setActiveCatTxId] = useState(null);
    const pendingCatsRef = useRef({});
    const [, forceUpdate] = React.useReducer(x=>x+1, 0); // Ref statt State — kein Re-render bei Änderung
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const toggleExpand = id => setExpandedGroups(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); // verknüpfte Unterbuchungen ausblenden

    // Set aller IDs die als Unterbuchung einer anderen TX verknüpft sind
    const linkedChildIds = useMemo(()=>{
      const s = new Set();
      txs.forEach(t=>(t.linkedIds||[]).forEach(id=>s.add(id)));
      return s;
    },[txs]);

    // All category options for dropdowns
    const catOptions = useMemo(()=>{
      const opts=[];
      groups.forEach(g=>cats.filter(c=>c.type===g.type).forEach(cat=>
        (cat.subs||[]).forEach(sub=>opts.push({catId:cat.id,subId:sub.id,
          label:`${cat.name} / ${sub.name}`,group:g.label,color:cat.color}))));
      return opts;
    },[cats,groups]);

    const filteredList = useMemo(()=>{
      let list = txs.filter(t=>{
        if(filt==="all")     return true;
        if(filt==="pending") return t.pending;
        if(filt==="income")  return !t.pending&&txType(t)==="income";
        if(filt==="uncat")   return (t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId);
        if(filt==="mismatch"){
          if(t.pending) return false;
          const splits=(t.splits||[]).filter(s=>s.catId);
          if(!splits.length) return false;
          const cat=getCat(splits[0].catId); if(!cat) return false;
          const isNeg=t.totalAmount<0||t._csvType==="expense";
          const isPos=t.totalAmount>0&&t._csvType!=="expense";
          const catIncome=cat.type==="income"||cat.type==="tagesgeld";
          const catExpense=cat.type==="expense";
          return (isNeg&&catIncome)||(isPos&&catExpense);
        }
        return !t.pending&&txType(t)==="expense";
      });
      if(search.trim()) {
        // Betragssuche: startet mit Ziffer oder Operator
        const isAmountSearch = /^[=<>]/.test(search.trim()) || /^[\d]/.test(search.trim());
        list = list.filter(t=>
          isAmountSearch
            ? matchAmount(Math.abs(t.totalAmount), search)
            : (matchSearch(t.desc, search) ||
               (t.splits||[]).some(sp=>matchSearch(getCat(sp.catId)?.name, search)||matchSearch(getSub(sp.catId,sp.subId)?.name, search)))
        );
      }
      if(filtAcc) list = list.filter(t=>t.accountId===filtAcc);
      // Erledigte Vormerkungen (zugeordnet) immer ausblenden
      list = list.filter(t=>!t._linkedTo);
      // Freigegebene Restbudget-Platzhalter ausblenden: gilt schon die nächste
      // Phase, ist die Reservierung weg — dann auch nicht mehr in den Buchungen.
      list = list.filter(t=>budgetPlaceholderActive(t));
      if(hideLinked && !search.trim()) list = list.filter(t=>!linkedChildIds.has(t.id));
      // Neueste zuerst
      list = [...list].sort((a,b)=>b.date.localeCompare(a.date));
      return list;
    },[txs,filt,search,cats,groups,filtAcc,hideLinked,linkedChildIds]);

    // Sichtbare Anzahl bei Filter-/Suchwechsel zurücksetzen
    useEffect(()=>{ setVisibleCount(PAGE); }, [filt,search,filtAcc,hideLinked]);

    // ── Monats-Fenster (wie Monatsansicht) ────────────────────────────────
    // Standardmäßig wird NUR der über den Monatswähler gewählte Monat gezeigt.
    // Ältere/neuere Monate werden über die Buttons unten/oben schrittweise
    // sichtbar gemacht, damit beim Monatswechsel nicht alles geladen wird.
    // In Such-/Review-Modi (suchen, ？, ⚠ Falsch) gilt das Fenster nicht.
    const monthScoped = !search.trim() && filt!=="mismatch" && filt!=="uncat";
    const selKey = `${year}-${String(month+1).padStart(2,"0")}`;
    // Fenster beim Monats-/Filterwechsel zurücksetzen → Sprung zum Monat
    useEffect(()=>{ setShowNewer(0); setShowOlder(0); }, [selKey,filt,filtAcc]);

    const monthKeys = useMemo(()=>{
      const s = new Set(filteredList.map(t=>t.date.slice(0,7)));
      return [...s].sort().reverse(); // absteigend, neueste zuerst
    },[filteredList]);
    const newerKeys = useMemo(()=>monthKeys.filter(k=>k>selKey),[monthKeys,selKey]); // oben
    const olderKeys = useMemo(()=>monthKeys.filter(k=>k<selKey),[monthKeys,selKey]); // unten

    const visibleKeys = useMemo(()=>{
      const set = new Set([selKey]);
      newerKeys.slice(Math.max(0,newerKeys.length-showNewer)).forEach(k=>set.add(k));
      olderKeys.slice(0,showOlder).forEach(k=>set.add(k));
      return set;
    },[selKey,newerKeys,olderKeys,showNewer,showOlder]);

    const windowList = useMemo(()=>{
      if(!monthScoped) return filteredList;
      return filteredList.filter(t=>visibleKeys.has(t.date.slice(0,7)));
    },[monthScoped,filteredList,visibleKeys]);

    // Anzahl noch versteckter Buchungen ober-/unterhalb des Fensters
    const newerHiddenCount = useMemo(()=>{
      if(!monthScoped) return 0;
      const hidden = new Set(newerKeys.slice(0,Math.max(0,newerKeys.length-showNewer)));
      return filteredList.filter(t=>hidden.has(t.date.slice(0,7))).length;
    },[monthScoped,filteredList,newerKeys,showNewer]);
    const olderHiddenCount = useMemo(()=>{
      if(!monthScoped) return 0;
      const hidden = new Set(olderKeys.slice(showOlder));
      return filteredList.filter(t=>hidden.has(t.date.slice(0,7))).length;
    },[monthScoped,filteredList,olderKeys,showOlder]);

    const shownList = monthScoped ? windowList : filteredList.slice(0, visibleCount);

    const allSelected = filteredList.length>0 && filteredList.every(t=>selected.has(t.id));
    const toggleAll   = () => setSelected(allSelected
      ? new Set()
      : new Set(filteredList.map(t=>t.id)));
    // toggleOne: Gruppe als Einheit — Hauptbuchung + ihre linkedIds zusammen
    const toggleOne = (id) => setSelected(p=>{
      const n = new Set(p);
      const tx = txs.find(t=>t.id===id);
      const groupIds = [id, ...(tx?.linkedIds||[])];
      if(n.has(id)) groupIds.forEach(gid=>n.delete(gid));
      else          groupIds.forEach(gid=>n.add(gid));
      return n;
    });
    // selectedCount: Gruppen zählen als 1
    const selectedCount = filteredList.filter(t=>selected.has(t.id)).length;

    const applyBulk = () => {
      if(!bulkCat.catId || selected.size===0) return;
      const selectedTxs = txs.filter(tx=>selected.has(tx.id));
      setTxs(p=>p.map(tx=>{
        if(!selected.has(tx.id)) return tx;
        return {...tx, splits:[{id:uid(),catId:bulkCat.catId,subId:bulkCat.subId,amount:tx.totalAmount}]};
      }));
      // Regeln für alle ausgewählten Buchungen erstellen
      const newRules = {};
      selectedTxs.forEach(tx=>{
        const desc = (tx.desc||"").replace(/\{[^}]{0,300}\}/g,"").trim();
        const vendor = desc.split("·")[0].split("–")[0].trim().slice(0,40).toLowerCase();
        if(vendor.length>2) newRules[vendor] = {catId:bulkCat.catId, subId:bulkCat.subId||""};
      });
      if(Object.keys(newRules).length>0) setCsvRules(p=>({...p,...newRules}));
      setSelected(new Set());
      setBulkCat({catId:"",subId:""});
    };

    // Zusammenfassen: Hauptbuchung (größter Betrag) bekommt alle anderen als linkedIds
    // Nichts wird gelöscht — die anderen werden nur ausgeblendet (wie bei Verknüpfen)
    const applyMerge = () => {
      const ids = [...selected];
      if(ids.length < 2) return;
      const toMerge = txs.filter(t=>ids.includes(t.id));
      // Hauptbuchung: größter Absolutbetrag
      const main = toMerge.reduce((a,b)=>Math.abs(a.totalAmount)>=Math.abs(b.totalAmount)?a:b);
      const childIds = toMerge.filter(t=>t.id!==main.id).map(t=>t.id);
      setTxs(p=>p.map(t=>t.id===main.id
        ? {...t, linkedIds:[...(t.linkedIds||[]).filter(id=>!childIds.includes(id)), ...childIds]}
        : t
      ));
      setSelected(new Set());
    };

    // Verknüpfen (genau 2): Giro ← PayPal, oder erste ← zweite
    const applyLink = () => {
      const ids = [...selected];
      if(ids.length !== 2) return;
      const [a, b] = ids.map(id=>txs.find(t=>t.id===id));
      const aAcc = accounts.find(ac=>ac.id===a?.accountId);
      // Giro-Buchung = Konto ohne "paypal"/"amazon" im Namen
      const isAGiro = aAcc && !aAcc.name.toLowerCase().includes("paypal") && !aAcc.name.toLowerCase().includes("amazon");
      const parent = isAGiro ? a : b;
      const child  = isAGiro ? b : a;
      setTxs(p=>p.map(t=>t.id===parent.id
        ? {...t, linkedIds:[...(t.linkedIds||[]).filter(id=>id!==child.id), child.id]}
        : t
      ));
      setSelected(new Set());
    };

  const applyBulkAcc = () => {
    if(!bulkAccId || selected.size===0) return;
    setTxs(p=>p.map(tx => selected.has(tx.id) ? {...tx, accountId: bulkAccId} : tx));
    setSelected(new Set());
    setBulkAccId("");
  };

    const inSearchMode = search.trim().length > 0 || filt==="mismatch";

    return (
      <>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",display:"flex",flexDirection:"column"}}>

        {/* ── Buchungen nachkategorisieren — einklappbar ── */}
        <WerkzeugeSection/>

        {/* ── STICKY HEADER ── */}
        <div style={{position:"sticky",top:0,zIndex:20,background:T.bg,flexShrink:0}}>

          {/* Konto-Filter — gemeinsame AccountChips (Vormerken-Stil) inkl. „Alle“ */}
          {accounts.length>0&&(
            <div style={{padding:"6px 14px 2px"}}>
              <AccountChips accounts={accounts} value={filtAcc||null}
                onChange={id=>setFiltAcc(id||"")} allowAll={true} allLabel="Alle"
                S={{fs:20,radius:12,gap:10}}/>
            </div>
          )}

          {/* Filter-Tabs */}
          <div style={{display:"flex",gap:6,padding:"4px 14px 6px"}}>
            {(()=>{
              const tabs = [
                ["expense","Ausgaben",  T.neg,  T.tab_exp],
                ["income", "Einnahmen", T.pos,  T.tab_inc],
                ["pending","vorgemerkt",T.gold, T.tab_pend],
                ["uncat",  "？",        T.txt2, T.disabled],
                ["mismatch","⚠ Falsch", T.gold, T.tab_pend],
              ];
              return tabs.map(([v,lbl,col,bgActive])=>{
                const active = filt===v;
                return (
                  <button key={v} onClick={()=>setFilt(f=>f===v?"all":v)}
                    style={{
                      flex:1,
                      padding:"7px 4px",
                      borderRadius:10,
                      cursor:"pointer",
                      fontFamily:"inherit",
                      border:"none",
                      background: active ? bgActive : "rgba(255,255,255,0.06)",
                      color: active ? readableOn(bgActive, col) : T.txt2,
                      fontSize:12,
                      fontWeight:700,
                      letterSpacing:0.2,
                      whiteSpace:"nowrap",
                      transition:"all 0.15s",
                      outline: active ? `1.5px solid ${col}44` : "none",
                    }}>
                    {lbl}
                  </button>
                );
              });
            })()}
          </div>

          {/* Suche — jetzt unten */}
          <div style={{padding:"0 14px 4px",display:"flex",gap:6,alignItems:"center"}}>
            <div style={{flex:1,display:"flex",alignItems:"center",background:"rgba(255,255,255,0.06)",
              border:`1px solid ${search?T.blue:T.bds}`,borderRadius:11,padding:"9px 11px",gap:6}}>
              {Li("search",14,T.txt2,1.5)}
              <input value={search} onChange={e=>{setSearch(e.target.value);setSelected(new Set());}}
                placeholder="suchen…"
                style={{flex:1,background:"transparent",border:"none",color:T.txt,fontSize:13,outline:"none"}}/>
              {search&&<button onClick={()=>{setSearch("");setSelected(new Set());}}
                style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:14,flexShrink:0}}>{Li("x",13)}</button>}
            </div>
            {/* Kategorisieren-Toggle — gleicher Stil wie CSV-Import */}
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{color:T.txt2,fontSize:11}}>Kategorisieren</span>
              <div onClick={()=>{
                  const next = !showAllCats;
                  setShowAllCats(next);
                  if(next) {
                    setFilt("uncat");
                  } else {
                    // Alle ausstehenden Kategorie-Änderungen auf einmal speichern
                    if(Object.keys(pendingCatsRef.current).length > 0) {
                      setTxs(p=>p.map(t=>{
                        const pc = pendingCatsRef.current[t.id];
                        if(!pc) return t;
                        return {...t, splits:[{id:(t.splits||[])[0]?.id||uid(),
                          catId:pc.catId, subId:pc.subId, amount:t.totalAmount}]};
                      }));
                      pendingCatsRef.current = {};
                    }
                  }
                }}
                style={{width:40,height:24,borderRadius:12,cursor:"pointer",
                  background:showAllCats?T.blue:"rgba(255,255,255,0.12)",
                  position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,
                  left:showAllCats?19:3,width:18,height:18,borderRadius:"50%",
                  background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
              </div>
            </div>
          </div>
          {/^[\d=<>]/.test(search.trim())&&search.trim()&&(
            <div style={{color:T.gold,fontSize:9,padding:"0 16px 2px"}}>
              {Li("search",10,T.gold)} Betragssuche · z.B. 41,85 · &gt;50 · &lt;=100
            </div>
          )}

          {/* Bulk-Aktionsleiste — bei Auswahl immer, Kategorie nur bei Suche */}
          {selected.size>0&&(
            <div style={{padding:"6px 14px",background:"rgba(74,159,212,0.08)",
              borderTop:`1px solid ${T.bd}`,borderBottom:`1px solid ${T.bd}`,
              display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={toggleAll}
                style={{background:allSelected?"rgba(74,159,212,0.3)":"rgba(255,255,255,0.08)",
                  border:`1px solid ${T.blue}`,borderRadius:8,padding:"4px 9px",
                  color:T.blue,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                {Li(allSelected?"check-square":"square",12,T.blue)} ({filteredList.length})
              </button>
              <span style={{color:T.txt2,fontSize:11,flexShrink:0}}>{selectedCount} ✓</span>
              {selectedCount>=2&&(
                <button onClick={applyMerge}
                  style={{background:"rgba(245,166,35,0.2)",border:`1px solid ${T.gold}`,
                    borderRadius:8,padding:"4px 9px",color:T.gold,
                    fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3}}>
                  {Li("layers",12,T.gold)} Gruppieren
                </button>
              )}
              {selectedCount===2&&(
                <button onClick={applyLink}
                  style={{background:(isLightTheme())?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",border:`1px solid ${T.gold}66`,
                    borderRadius:8,padding:"4px 9px",color:T.gold,
                    fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:3}}>
                  {Li("link",12,T.gold)} Verknüpfen
                </button>
              )}
              {/* Kategorie-Zuweisung bei Suche ODER Fehlzuordnungs-Filter */}
              {(inSearchMode||filt==="mismatch")&&<>
                <div style={{flex:1,minWidth:90}}>
                  {(()=>{
                    // Filtertyp aus selektierten Buchungen ableiten
                    const selTxs = filteredList.filter(t=>selected.has(t.id));
                    const hasNeg = selTxs.some(t=>t.totalAmount<0||(t._csvType==="expense"));
                    const hasPos = selTxs.some(t=>t.totalAmount>0&&t._csvType!=="expense");
                    const filterType = selTxs.length===0 ? null : (hasNeg&&!hasPos?"expense":(!hasNeg&&hasPos?"income":null));
                    return (
                      <CatPicker value={bulkCat.catId+"|"+bulkCat.subId}
                        onChange={(c,s)=>setBulkCat({catId:c,subId:s})}
                        filterType={filterType}
                        placeholder={filterType==="expense"?"— Ausgaben-Kategorie —":filterType==="income"?"— Einnahmen-Kategorie —":"— Kategorie —"}/>
                    );
                  })()}
                </div>
                <button onClick={applyBulk} disabled={!bulkCat.catId}
                  style={{background:bulkCat.catId?T.blue:T.disabled,border:"none",borderRadius:8,
                    padding:"4px 9px",color:"#fff",fontSize:11,fontWeight:700,
                    cursor:bulkCat.catId?"pointer":"default",opacity:bulkCat.catId?1:0.4,flexShrink:0}}>
                  ✓
                </button>
              </>}
              <span style={{flex:1}}/>
              <select value={bulkAccId} onChange={e=>setBulkAccId(e.target.value)}
                style={{background:T.surf,border:`1px solid ${T.bds}`,borderRadius:8,
                  padding:"4px 7px",color:T.txt,fontSize:11,outline:"none",cursor:"pointer",maxWidth:110}}>
                <option value="">Konto…</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {bulkAccId&&<button onClick={applyBulkAcc}
                style={{background:T.pos,border:"none",borderRadius:8,padding:"4px 9px",
                  color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>✓</button>}
              <button onClick={()=>setSelected(new Set())}
                style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:"4px"}}>
                {Li("x",14,T.txt2)}
              </button>
            </div>
          )}
        </div>

        {/* Liste */}
        <div style={{flex:1,padding:"6px 12px 20px",overflowY:"auto"}}>
          {filt==="mismatch"&&filteredList.length>0&&(
            <div style={{margin:"0 0 6px",padding:"8px 12px",borderRadius:10,
              background:"rgba(245,166,35,0.08)",border:`1px solid ${T.gold}44`}}>
              <div style={{color:T.gold,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                {Li("alert-triangle",12,T.gold)} {filteredList.length} Vorzeichen-Fehlzuordnung{filteredList.length!==1?"en":""}
              </div>
              <div style={{color:T.txt2,fontSize:10,marginTop:3,lineHeight:1.5}}>
                Buchungen mit negativem Betrag einer Einnahmen-Kategorie zugeordnet oder umgekehrt. Auswählen → oben Kategorie korrigieren.
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
                <button onClick={()=>{
                  setTxs(p=>p.map(t=>{
                    if(t.pending) return t;
                    const splits=(t.splits||[]).filter(s=>s.catId);
                    if(!splits.length) return t;
                    const cat=getCat(splits[0].catId);
                    if(!cat) return t;
                    const isNeg=t.totalAmount<0||t._csvType==="expense";
                    const isPos=t.totalAmount>0&&t._csvType!=="expense";
                    const catIsIncome=cat.type==="income"||cat.type==="tagesgeld";
                    const catIsExpense=cat.type==="expense";
                    if((isNeg&&catIsIncome)||(isPos&&catIsExpense)) return {...t,splits:[]};
                    return t;
                  }));
                  setFilt("uncat");
                }} style={{padding:"5px 12px",borderRadius:8,border:"none",
                  background:T.gold,color:T.on_accent,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  Alle korrigieren ({filteredList.length})
                </button>
              </div>
            </div>
          )}
          {filteredList.length===0
            ? <div style={{color:T.txt2,textAlign:"center",padding:32,fontSize:13}}>
                {filt==="mismatch" ? "Keine Fehlzuordnungen gefunden ✓" : search ? `Keine Buchungen für „${search}"` : "keine Buchungen"}
              </div>
            : <div style={{background:"rgba(255,255,255,0.04)",borderRadius:18,
                padding:"4px 6px",border:`1px solid ${T.bd}`}}>
                {/* Neuere Monate einblenden (oben) */}
                {monthScoped && newerHiddenCount>0 && (
                  <div onClick={()=>setShowNewer(n=>n+1)}
                    style={{textAlign:"center",padding:"10px",cursor:"pointer",
                      color:T.blue,fontSize:13,fontWeight:600,borderBottom:`1px solid ${T.bd}`,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    {Li("chevron-up",14,T.blue)} + {newerHiddenCount} neuere anzeigen
                  </div>
                )}
                {/* Hinweis, wenn der gewählte Monat selbst leer ist */}
                {monthScoped && shownList.length===0 && (
                  <div style={{color:T.txt2,textAlign:"center",padding:"18px 8px",fontSize:12}}>
                    keine Buchungen in {monthName(selKey)}
                  </div>
                )}
                {shownList.map((tx,i)=>{
                  const cat=getCat((tx.splits||[])[0]?.catId);
                  const type=txType(tx);
                  const isS=(tx.splits||[]).length>1;
                  const isSel=selected.has(tx.id);
                  const isUncat=(tx.splits||[]).length===0||(tx.splits||[]).every(s=>!s.catId);
                  const acc=accounts.find(a=>a.id===tx.accountId);
                  const linked=(tx.linkedIds||[]).length>0 ? txs.filter(t=>tx.linkedIds.includes(t.id)) : [];
                  // Händlernamen aus verknüpften PayPal-Buchungen extrahieren
                  const merchantName = linked.length>0 ? (()=>{
                    const names = linked
                      .map(lt=>(lt.desc||"").replace(/\{[^}]{0,300}\}/g,"").replace(/\s{2,}/g," ").trim())
                      .map(d=>d.split(" · ")[0].split(" – ")[0].trim())
                      .filter(n=>n && !n.match(/^successful$/i) && !n.match(/^rechnungs-nr/i));
                    return [...new Set(names)].slice(0,2).join(", ");
                  })() : null;
                  // Beschreibung: Giro-Rohdaten durch Händlernamen ersetzen wenn vorhanden
                  const rawDesc = (tx.desc||cat?.name||"Buchung")
                    .replace(/\{[^}]{0,300}\}/g,"").replace(/\s{2,}/g," ").trim();
                  const isPayPalGiro = rawDesc.match(/PAYPAL/i) && merchantName;
                  const cleanDesc = isPayPalGiro
                    ? `PayPal · ${merchantName}`
                    : rawDesc;
                  return (
                    <div key={tx.id}
                      style={{borderTop:i>0?`1px solid ${T.bd}`:"none",
                        background:isSel?"rgba(74,159,212,0.06)":"transparent",
                        borderRadius:isSel?8:0,margin:isSel?"2px -4px":"0",
                        padding:"1px 0"}}>
                      {/* Hauptzeile */}
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"3px 8px",
                        userSelect:"none",WebkitUserSelect:"none"}}>
                        {/* Checkbox links — nur im Suchmodus sichtbar */}
                        {inSearchMode&&(
                          <div onClick={()=>toggleOne(tx.id)} style={{width:20,height:20,borderRadius:6,flexShrink:0,
                            background:isSel?"rgba(74,159,212,0.25)":"transparent",
                            border:`2px solid ${isSel?T.blue:"rgba(255,255,255,0.15)"}`,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",transition:"all 0.15s"}}>
                            {isSel&&Li("check",12,T.blue)}
                          </div>
                        )}
                        {/* Icon — immer Icon-Picker */}
                        <div onClick={e=>{e.stopPropagation();setTxIconPick(txIconPick===tx.id?null:tx.id);}}
                          style={{width:32,height:32,borderRadius:9,
                            background:(cat?.color||"#888")+"22",display:"flex",alignItems:"center",
                            justifyContent:"center",flexShrink:0,cursor:"pointer",
                            border:`1px solid ${txIconPick===tx.id?(cat?.color||T.blue)+"66":T.bd}`}}>
                          {tx.pending?(tx._seriesTyp==="finanzierung"?Li("credit-card",16,T.gold):tx._seriesId?Li("repeat",16,T.pos):Li("calendar",16,T.gold)):isUncat?Li("help-circle",16,T.txt2):isS?Li("arrow-left-right",16,T.blue):Li(cat?.icon,16,cat?.color||T.txt2)}
                        </div>
                        {txIconPick===tx.id&&(
                          <IconPickerDialog
                            selectedIcon={cat?.icon||"help-circle"}
                            selectedColor={cat?.color||T.txt2}
                            onSelect={ic=>{
                              if(cat) setCats(p=>p.map(c=>c.id===cat.id?{...c,icon:ic}:c));
                              setTxIconPick(null);
                            }}
                            onClose={()=>setTxIconPick(null)}/>
                        )}
                        {/* Text — Klick öffnet Edit */}
                        <div onClick={()=>{toggleOne(tx.id);openEdit(tx);}}
                          style={{flex:1,minWidth:0,cursor:"pointer"}}>
                          <div style={{color:T.txt,fontSize:13,fontWeight:700,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {cleanDesc}
                          </div>
                          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",marginTop:1}}>
                            <span style={{color:T.txt2,fontSize:10}}>{tx.date}</span>
                            {tx.pending&&<span style={{fontSize:9,background:"rgba(245,166,35,0.18)",
                              color:T.gold,borderRadius:4,padding:"0px 5px",fontWeight:700,
                              border:`1px solid ${T.gold}44`,flexShrink:0}}>VM</span>}
                            {acc&&<span style={{background:acc.color+"22",color:acc.color,borderRadius:4,
                              padding:"0px 5px",fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",gap:2}}>
                              {Li(acc.icon,9,acc.color)}{acc.name}{acc.delayDays>0&&<span style={{color:T.gold,fontSize:"0.8em",fontWeight:700,marginLeft:2}}>+{acc.delayDays}d</span>}
                            </span>}
                            {isUncat
                              ? <span style={{fontSize:9,background:"rgba(248,113,113,0.2)",
                                  color:T.neg,borderRadius:4,padding:"0px 5px",fontWeight:700}}>
                                  unkategorisiert
                                </span>
                              : cat
                                ? <span style={{color:cat.color,fontSize:10,display:"inline-flex",alignItems:"center",gap:2}}>
                                    {Li(cat.icon,10,cat.color||T.txt2)}
                                    {getSub((tx.splits||[])[0]?.catId,(tx.splits||[])[0]?.subId)?.name||cat.name}
                                  </span>
                                : null}
                            {/* Mismatch-Warnung: falsche Kategorie mit Korrekturhinweis */}
                            {filt==="mismatch"&&cat&&(()=>{
                              const isNeg=tx.totalAmount<0||tx._csvType==="expense";
                              const catIncome=cat.type==="income"||cat.type==="tagesgeld";
                              const subName=getSub((tx.splits||[])[0]?.catId,(tx.splits||[])[0]?.subId)?.name||cat.name;
                              if((isNeg&&catIncome)||(!isNeg&&!catIncome)) return (
                                <span style={{fontSize:9,background:(isLightTheme())?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",
                                  color:T.gold,borderRadius:4,padding:"1px 6px",fontWeight:700,
                                  display:"inline-flex",alignItems:"center",gap:3,
                                  border:`1px solid ${T.gold}44`}}>
                                  {Li("alert-triangle",8,T.gold)}
                                  <span style={{color:"rgba(255,255,255,0.5)",textDecoration:"line-through"}}>{subName}</span>
                                  <span>←</span>
                                  <span style={{color:T.gold}}>{isNeg?"Ausgabe":"Einnahme"}</span>
                                </span>
                              );
                              return null;
                            })()}
                            {/* Verknüpfte Vormerkungen — Badge + Lösen */}
                            {(tx.linkedIds||[]).map(lid=>{
                              const lt = txs.find(t=>t.id===lid);
                              if(!lt || lt.pending) return null; // nur erledigte Vormerkungen
                              const wasVormerkung = lt._linkedTo===tx.id;
                              if(!wasVormerkung) return null;
                              return (
                                <span key={lid} onClick={e=>{e.stopPropagation();}}
                                  style={{display:"inline-flex",alignItems:"center",gap:3,
                                    background:"rgba(74,159,212,0.12)",border:`1px solid ${T.blue}33`,
                                    borderRadius:5,padding:"1px 5px",fontSize:9,color:T.blue}}>
                                  {Li("link",9,T.blue)}
                                  <span style={{maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                    {lt.desc||"Vormerkung"}
                                  </span>
                                  <button onClick={e=>{
                                    e.stopPropagation();
                                    // Verknüpfung lösen: Splits der echten Buchung
                                    // auf den ORIGINALZUSTAND vor der Verknüpfung zurücksetzen
                                    // (gespeichert in _splitsBeforeLink). Wenn nicht vorhanden,
                                    // bleibt die aktuelle Kategorie erhalten — besser als leeren.
                                    setTxs(p=>p.map(t=>{
                                      if(t.id===tx.id) {
                                        const newLinkedIds = (t.linkedIds||[]).filter(x=>x!==lid);
                                        // Wenn das die letzte Verknüpfung war: Original-Splits restaurieren
                                        const isLastUnlink = newLinkedIds.length===0;
                                        if(isLastUnlink && t._splitsBeforeLink) {
                                          const { _splitsBeforeLink, ...rest } = t;
                                          return { ...rest, linkedIds: newLinkedIds, splits: _splitsBeforeLink };
                                        }
                                        return { ...t, linkedIds: newLinkedIds };
                                      }
                                      if(t.id===lid) return {...t, pending:true, _linkedTo:null};
                                      return t;
                                    }));
                                  }} style={{background:"none",border:"none",color:T.txt2,
                                    cursor:"pointer",padding:"0 0 0 2px",fontSize:9,lineHeight:1}}>
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {/* Betrag */}
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{...amtStyle(tx.pending?"gold":type==="income"?"pos":"neg"),
                            fontSize:16,fontWeight:800,fontFamily:NUM_FONT,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
                            {type==="income"?"+":"−"}{fmt(tx.totalAmount)}
                          </div>
                        </div>
                      </div>
                      {/* Kategorie-Button — öffnet separaten Dialog */}
                      {showAllCats&&(
                        <div onClick={e=>e.stopPropagation()}
                          style={{marginLeft:48,marginBottom:4,marginRight:28}}>
                          <button onClick={()=>setActiveCatTxId(tx.id)}
                            style={{width:"100%",padding:"6px 10px",borderRadius:8,
                              border:`1px solid ${(pendingCatsRef.current[tx.id]||(tx.splits||[])[0]?.catId)?T.gold+"55":T.bd}`,
                              background:"rgba(255,255,255,0.04)",
                              color:(pendingCatsRef.current[tx.id]||(tx.splits||[])[0]?.catId)?T.gold:T.txt2,
                              fontSize:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                              display:"flex",alignItems:"center",gap:6}}>
                            {Li("tag",10,(pendingCatsRef.current[tx.id]||(tx.splits||[])[0]?.catId)?T.gold:T.txt2)}
                            {(()=>{
                              const pc = pendingCatsRef.current[tx.id];
                              const catId = pc?.catId || (tx.splits||[])[0]?.catId;
                              const subId = pc?.subId || (tx.splits||[])[0]?.subId;
                              if(!catId) return "— Kategorie wählen —";
                              return `${getCat(catId)?.name||"?"} / ${getSub(catId,subId)?.name||"?"}`;
                            })()}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Ältere Monate einblenden (unten) */}
                {monthScoped && olderHiddenCount>0 && (
                  <div onClick={()=>setShowOlder(n=>n+1)}
                    style={{textAlign:"center",padding:"12px",cursor:"pointer",
                      color:T.blue,fontSize:13,fontWeight:600,borderTop:`1px solid ${T.bd}`,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    {Li("chevron-down",14,T.blue)} + {olderHiddenCount} ältere anzeigen
                  </div>
                )}
                {/* Such-/Review-Modus: klassisches Paging */}
                {!monthScoped && filteredList.length>visibleCount && (
                  <div onClick={()=>setVisibleCount(c=>c+PAGE*4)}
                    style={{textAlign:"center",padding:"12px",cursor:"pointer",
                      color:T.blue,fontSize:13,borderTop:`1px solid ${T.bd}`}}>
                    + {filteredList.length-visibleCount} weitere anzeigen
                  </div>
                )}
              </div>
          }
        </div>
      </div>

      {/* Kategorie-Zuweisung Modal */}
      {activeCatTxId&&(()=>{
        const tx = txs.find(t=>t.id===activeCatTxId);
        if(!tx) return null;
        const type = txType(tx);
        return (
          <div onClick={()=>setActiveCatTxId(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
              backdropFilter:"blur(8px)",zIndex:200,
              display:"flex",alignItems:"flex-start",justifyContent:"center",
              paddingTop:60}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:T.surf2,borderRadius:"0 0 20px 20px",width:"100%",
                maxWidth:480,padding:"16px",maxHeight:"70vh",overflowY:"auto",
                border:`1px solid ${T.bd}`}}>
              <div style={{color:T.txt,fontSize:13,fontWeight:700,marginBottom:4}}>
                {tx.desc}
              </div>
              <div style={{color:T.txt2,fontSize:11,marginBottom:12}}>
                Kategorie zuweisen
              </div>
              <CatPicker
                value={(()=>{
                  const pc = pendingCatsRef.current[activeCatTxId];
                  const tx2 = txs.find(t=>t.id===activeCatTxId);
                  const catId = pc?.catId || (tx2?.splits||[])[0]?.catId || "";
                  const subId = pc?.subId || (tx2?.splits||[])[0]?.subId || "";
                  return catId+"|"+subId;
                })()}
                filterType={(()=>{
                  const tx2 = txs.find(t=>t.id===activeCatTxId);
                  return txType(tx2)==="income"?"income":"expense";
                })()}
                onChange={(catId,subId)=>{
                  pendingCatsRef.current = {...pendingCatsRef.current, [activeCatTxId]:{catId,subId}};
                  // Toggle kurz aus/an um Re-render der Liste zu vermeiden
                  setShowAllCats(false);
                  setActiveCatTxId(null);
                  setTimeout(()=>setShowAllCats(true), 50);
                }}
                placeholder="— Kategorie wählen —"
              />
            </div>
          </div>
        );
      })()}
      </>
    );
}

// ══════════════════════════════════════════════════════════════════════
// BudgetEditorModal — wiederverwendbar in AddTxModal und MonatScreen
// sub: {id, name}  cat: {id, color}

export { TransactionsScreen };
