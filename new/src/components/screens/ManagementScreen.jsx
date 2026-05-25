// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useState } from "react";
import { ErrorBoundary } from "../ErrorBoundary.jsx";
import { Lbl } from "../atoms/Lbl.jsx";
import { RegenRulesButton } from "../buttons/RegenRulesButton.jsx";
import { QuickBtnsBarWithColor } from "../molecules/QuickBtnsBarWithColor.jsx";
import { AddAccountForm } from "../organisms/AddAccountForm.jsx";
import { AddTxModal } from "../organisms/AddTxModal.jsx";
import { IconPickerDialog } from "../organisms/IconPickerDialog.jsx";
import { KategorieAnlegen } from "../organisms/KategorieAnlegen.jsx";
import { SubRow } from "../organisms/SubRow.jsx";
import { SettingsInline } from "./SettingsInline.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function ManagementScreen({activeTab="kategorien"}) {
  const { cats=[],setCats,groups=[],setGroups,txs=[],setTxs,accounts=[],setAccounts,
    yearData,setYearData,year,setYear,month,setMonth,isLand,
    col3Name,setCol3Name,modal,setModal,mgmtCat,setMgmtCat,
    editTx,setEditTx,newTx,setNewTx,newCat,setNewCat,
    newSubName,setNewSubName,exportModal,setExportModal,
    getCat,getSub,txType,getActualSum,getTotalIncome,getTotalExpense,getPendingSum,pendingItemsFor,
    getJV,setJV,getMV,setMV,getAcc,openEdit,saveEdit,deleteFromEdit,
    updEditSplit,moveCat,moveSub,updateSub,updateCat,
    renameCat,renameSub,deleteCat,deleteSub,saveNewCat,saveNewSub,
    moveAcc, accIconPick, setAccIconPick,
    addSplit,removeSplit,updSplit,splitTotal,splitDiff,txValid,saveTx,
    quickBtns=[],setQuickBtns,
    budgets={}, setBudgets,
    onTS,onTE, globalDrag,
  } = useContext(AppCtx);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [editGrpLabel, setEditGrpLabel] = useState(null);
  const [editGrpLabelVal, setEditGrpLabelVal] = useState("");
  const [newGroup, setNewGroup] = useState({label:"", icon:"folder-open", accent:T.blue, behavior:"expense", accountId:""});
  const [collapsedAccs, setCollapsedAccs] = useState(new Set());
  const [collapsedGrps, setCollapsedGrps] = useState(new Set());
  const toggleAcc = id => setCollapsedAccs(p=>{ const s=new Set(p); s.has(id)?s.delete(id):s.add(id); return s; });
  const toggleGrp = id => setCollapsedGrps(p=>{ const s=new Set(p); s.has(id)?s.delete(id):s.add(id); return s; });
  const [inlineNewCat, setInlineNewCat] = useState(null);
  const [inlineCatName, setInlineCatName] = useState("");
  const [dropTargetCat, setDropTargetCat] = useState(null);
  const [showGroupIconPicker, setShowGroupIconPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [ln, setLn] = useState("");
  const [mgrTab, setMgrTab] = useState(activeTab);
  React.useEffect(()=>{ setMgrTab(activeTab); }, [activeTab]);
  const _cats = Array.isArray(cats) ? cats : [];
  const _groups = Array.isArray(groups) ? groups : [];
  const _accounts = Array.isArray(accounts) ? accounts : [];
  const _quickBtns = Array.isArray(quickBtns) ? quickBtns : [];

  React.useEffect(()=>{
    const c = (cats||[]).find(x=>x.id===mgmtCat);
    if(c) setLn(c.name||"");
  }, [mgmtCat, cats]);

  const cat = (cats||[]).find(c=>c.id===mgmtCat);

  const moveGroup = (id, dir) => setGroups(p => {
    const idx = p.findIndex(g=>g.id===id);
    const newIdx = idx+dir;
    if(newIdx<0||newIdx>=p.length) return p;
    const arr=[...p]; [arr[idx],arr[newIdx]]=[arr[newIdx],arr[idx]]; return arr;
  });
  const saveNewGroup = () => {
    if(!newGroup.label.trim()) return;
    const newType = "grp-"+uid();
    setGroups(p=>[...p,{id:"grp-"+uid(), type:newType, label:newGroup.label.trim(),
      icon:newGroup.icon, accent:newGroup.accent, blockColor:"aus",
      behavior:newGroup.behavior, accountId:newGroup.accountId||""}]);
    setNewGroup({label:"",icon:"folder-open",accent:T.blue,behavior:"expense",accountId:""});
    setShowNewGroup(false);
  };
    if(cat){
      const grp = (groups||[]).find(g=>g.type===cat.type);
      return (
        <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          {showIconPicker==="cat"&&<IconPickerDialog selectedIcon={cat.icon} selectedColor={cat.color} onSelect={ic=>updateCat(cat.id,"icon",ic)} onClose={()=>setShowIconPicker(null)}/>}
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px 6px"}}>
            <button onClick={()=>setMgmtCat(null)} style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,borderRadius:10,width:34,height:34,cursor:"pointer",fontSize:18}}>{Li("arrow-left",13)}</button>
            <button onClick={()=>setShowIconPicker("cat")}
              style={{width:36,height:36,borderRadius:11,background:cat.color+"33",border:`1px solid ${cat.color+"44"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
              {Li(cat.icon,20,cat.color||T.txt2)}
            </button>
            <div style={{flex:1}}>
              <div style={{color:T.blue,fontSize:16,fontWeight:700}}>{cat.name}</div>
              <div style={{color:T.txt2,fontSize:11}}>{grp?.label||cat.type} · {(cat.subs||[]).length} Unterkategorien</div>
            </div>
            <button onClick={()=>setMergeTarget(mergeTarget===cat.id?null:cat.id)}
              style={{background:mergeTarget===cat.id?"rgba(74,159,212,0.25)":"rgba(74,159,212,0.1)",
                border:"none",color:T.blue,borderRadius:10,padding:"7px 12px",
                cursor:"pointer",fontSize:12,fontWeight:600,marginRight:4}}>
              {Li("git-merge",12,T.blue)} Zusammenführen
            </button>
            <button onClick={()=>deleteCat(cat.id)} style={{background:"rgba(224,80,96,0.12)",border:"none",color:T.neg,borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>Löschen</button>
          </div>

          {/* Name */}
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:16,padding:14,margin:"8px 14px",border:`1px solid ${T.bd}`}}>
            <Lbl>Name</Lbl>
            <div style={{display:"flex",gap:8}}>
              <input value={ln} onChange={e=>setLn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renameCat(cat.id,ln);}} style={{...INP,marginBottom:0,flex:1}}/>
              <button onClick={()=>renameCat(cat.id,ln)} style={{background:T.blue,border:"none",borderRadius:10,padding:"0 14px",color:"#fff",fontWeight:700,cursor:"pointer",flexShrink:0}}>✓</button>
            </div>
          </div>

          {/* Zusammenführen */}
          {mergeTarget===cat.id&&(
            <div style={{background:"rgba(74,159,212,0.08)",borderRadius:16,padding:14,margin:"8px 14px",border:`1px solid ${T.blue}44`}}>
              <div style={{color:T.blue,fontSize:12,fontWeight:700,marginBottom:2}}>{Li("git-merge",12,T.blue)} In welche Kategorie zusammenführen?</div>
              <div style={{color:T.txt2,fontSize:11,marginBottom:10,lineHeight:1.5}}>
                Alle Buchungen von <b style={{color:T.txt}}>{cat.name}</b> werden zur gewählten Kategorie verschoben. <b style={{color:T.neg}}>Diese Kategorie wird danach gelöscht.</b>
              </div>
              {(cats||[]).filter(c=>c.id!==cat.id&&c.type===cat.type).length===0
                ? <div style={{color:T.txt2,fontSize:12}}>Keine anderen Kategorien gleicher Gruppe vorhanden.</div>
                : (cats||[]).filter(c=>c.id!==cat.id&&c.type===cat.type).map(tc=>(
                  <button key={tc.id} onClick={()=>{
                    // Move all splits from cat.id → tc.id (first sub of target)
                    const targetSub = (tc.subs||[])[0]?.id||"";
                    setTxs(p=>p.map(tx=>({...tx,
                      splits:(tx.splits||[]).map(sp=>sp.catId===cat.id
                        ? {...sp,catId:tc.id,subId:sp.subId&&(tc.subs||[]).find(s=>s.id===sp.subId)?sp.subId:targetSub}
                        : sp)
                    })));
                    deleteCat(cat.id);
                    setMergeTarget(null);
                  }}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",
                      background:"rgba(255,255,255,0.05)",border:`1px solid ${T.bd}`,
                      borderRadius:10,padding:"9px 12px",cursor:"pointer",marginBottom:6,
                      color:T.txt,fontSize:12,fontWeight:600}}>
                    <div style={{width:28,height:28,borderRadius:8,background:tc.color+"33",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
                      {tc.icon}
                    </div>
                    <span style={{flex:1,textAlign:"left"}}>{tc.name}</span>
                    <span style={{color:T.txt2,fontSize:11}}>{(tc.subs||[]).length} Unterkategorien</span>
                    <span style={{color:T.blue,fontSize:13}}>→</span>
                  </button>
                ))
              }
              <button onClick={()=>setMergeTarget(null)}
                style={{width:"100%",padding:"8px",borderRadius:9,border:"none",
                  background:"none",color:T.txt2,fontSize:12,cursor:"pointer",marginTop:4}}>
                Abbrechen
              </button>
            </div>
          )}

          {/* Gruppe wechseln */}
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:16,padding:14,margin:"8px 14px",border:`1px solid ${T.bd}`}}>
            <Lbl>Hauptkategorie</Lbl>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {(groups||[]).map(g=>(
                <button key={g.id} onClick={()=>updateCat(cat.id,"type",g.type)}
                  style={{padding:"7px 12px",borderRadius:10,border:cat.type===g.type?`2px solid ${g.accent}`:"2px solid transparent",
                    cursor:"pointer",fontSize:12,fontWeight:700,
                    background:cat.type===g.type?g.accent+"22":"rgba(255,255,255,0.05)",
                    color:cat.type===g.type?g.accent:T.txt2}}>
                  {Li(g.icon,13,cat.type===g.type?g.accent:T.txt2)} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Unterkategorien */}
          <div style={{color:T.txt2,fontSize:11,fontWeight:700,padding:"6px 14px 3px"}}>Unterkategorien</div>
          {(cat.subs||[]).map((sub,si,arr)=>(
            <ErrorBoundary name="SubRow"><SubRow key={sub.id} sub={sub} si={si} arr={arr} cat={cat}/></ErrorBoundary>
          ))}
          <div style={{padding:"8px 14px 24px"}}>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="neue Unterkategorie…" value={newSubName} onChange={e=>setNewSubName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")saveNewSub(cat.id);}}
                style={{...INP,marginBottom:0,flex:1,fontSize:13}}/>
              <button onClick={()=>saveNewSub(cat.id)} style={{background:T.blue,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",fontWeight:700,cursor:"pointer",flexShrink:0,fontSize:18}}>+</button>
            </div>
          </div>
        </div>
      );
    }

    // ── Übersicht: Konten + Kategorien ───────────────────────────────────────
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Tab-Navigation jetzt in Bottom-Bar — keine interne Tab-Bar nötig */}
        {mgrTab==="einstellungen"&&<SettingsInline/>}
        {mgrTab==="konten"&&(
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"12px 14px 24px"}}>
            <div style={{color:T.lbl||T.txt2,fontSize:11,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              {Li("credit-card",13,T.blue)} Konten / Zahlungsarten
            </div>
            {_accounts.map((acc,ai)=>(
              <div key={acc.id} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"6px 8px",marginBottom:3,border:`1px solid ${T.bd}`}}>
                <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                  <button onClick={()=>moveAcc(acc.id,-1)} disabled={ai===0}
                    style={{background:"none",border:"none",color:ai===0?"rgba(255,255,255,0.1)":T.txt2,cursor:ai===0?"default":"pointer",fontSize:11,padding:"1px 3px",lineHeight:1}}>{Li("chevron-up",10)}</button>
                  <button onClick={()=>moveAcc(acc.id,+1)} disabled={ai===_accounts.length-1}
                    style={{background:"none",border:"none",color:ai===_accounts.length-1?"rgba(255,255,255,0.1)":T.txt2,cursor:ai===_accounts.length-1?"default":"pointer",fontSize:11,padding:"1px 3px",lineHeight:1}}>{Li("chevron-down",10)}</button>
                </div>
                <button onClick={()=>setAccIconPick(acc.id)}
                  style={{width:28,height:28,borderRadius:7,border:`1px solid ${T.bd}`,background:"rgba(255,255,255,0.06)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {Li(acc.icon,16,acc.color||T.txt)}
                </button>
                {accIconPick===acc.id&&<IconPickerDialog selectedIcon={acc.icon} selectedColor={acc.color||T.blue}
                  onSelect={ic=>{setAccounts(p=>p.map(a=>a.id===acc.id?{...a,icon:ic}:a));setAccIconPick(null);}}
                  onClose={()=>setAccIconPick(null)}/>}
                <span style={{flex:1,color:T.txt,fontSize:12,fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {acc.name}{acc.delayDays>0&&<span style={{color:T.gold,fontSize:"0.8em",fontWeight:700,marginLeft:2}}>+{acc.delayDays}d</span>}
                </span>
                {/* Mindest-Puffer */}
                <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}
                  title="Mindest-Puffer: Warnung wenn Saldo darunter fällt">
                  {Li("shield",11,T.txt2)}
                  <input type="number" inputMode="numeric"
                    value={acc.minPuffer||""} placeholder="0"
                    onChange={e=>{
                      const v=parseInt(e.target.value)||0;
                      setAccounts(p=>p.map(a=>a.id===acc.id?{...a,minPuffer:v}:a));
                      window.dispatchEvent(new Event("mbt-puffer-changed"));
                    }}
                    style={{width:54,padding:"3px 5px",borderRadius:6,
                      border:`1px solid ${T.bd}`,background:"rgba(255,255,255,0.05)",
                      color:T.txt,fontSize:11,fontFamily:"monospace",textAlign:"right",outline:"none"}}/>
                  <span style={{color:T.txt2,fontSize:10}}>€</span>
                </div>
                <button onClick={()=>setAccounts(p=>p.filter(a=>a.id!==acc.id))}
                  style={{background:"none",border:"none",color:T.neg,opacity:0.6,cursor:"pointer",fontSize:14}}>{Li("trash-2",14)}</button>
              </div>
            ))}
            <ErrorBoundary name="AddAccountForm"><AddAccountForm setAccounts={setAccounts}/></ErrorBoundary>
          </div>
        )}
        {mgrTab!=="einstellungen"&&mgrTab!=="konten"&&(
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",display:"flex",flexDirection:"column"}}>

        {/* ── Kategorie-Zuordnungen ── */}
        <div style={{padding:"10px 14px 6px",borderBottom:`1px solid ${T.bd}`}}>
          <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
            {Li("refresh-cw",12,T.blue)} Kategorie-Zuordnungen
          </div>
          <div style={{color:T.txt2,fontSize:10,marginBottom:6,lineHeight:1.5}}>
            Regeneriert alle Händler-Regeln aus den bereits kategorisierten Buchungen.
          </div>
          <RegenRulesButton/>
        </div>

        {/* ── Schnellwahl (kein Titel, kein Rahmen) ── */}
        <div style={{padding:"10px 14px 6px"}}>
          <div style={{color:T.txt2,fontSize:10,marginBottom:4,opacity:0.6}}>Icon auf Kategorie ziehen zum Zuweisen</div>
          <QuickBtnsBarWithColor onSelectIcon={()=>{}} onSelectColor={()=>{}}
            _onDragStart={(icon, color, type, targetId)=>{
              if (type === "cat" && targetId) {
                updateCat(targetId, "icon", icon);
                if (color) updateCat(targetId, "color", color);
              } else if (type === "group" && targetId) {
                setGroups(p=>p.map(g=>g.id===targetId?{...g,icon,...(color?{accent:color}:{})}:g));
              } else if (type === "acc-icon") {
                // handled by onPointerUp on the icon button itself via globalDrag
              } else {
                globalDrag.current = {icon, color};
              }
            }}
            _onDragEnd={()=>{ globalDrag.current=null; setDropTargetCat(null); }}
          />
        </div>

        {/* ── Neue Hauptkategorie anlegen ── */}
        <div style={{padding:"0 14px 10px",borderBottom:`1px solid ${T.bd}`,marginBottom:4}}>
          {showGroupIconPicker&&<IconPickerDialog selectedIcon={newGroup.icon} selectedColor={newGroup.accent||T.blue} onSelect={ic=>{setNewGroup(p=>({...p,icon:ic}));setShowGroupIconPicker(false);}} onClose={()=>setShowGroupIconPicker(false)}/>}

          <div style={{color:T.txt2,fontSize:10,fontWeight:700,textTransform:"uppercase",
            letterSpacing:"0.05em",marginBottom:8,marginTop:4,display:"flex",alignItems:"center",gap:5}}>
            {Li("plus-circle",11,T.blue)} Neue Hauptkategorie
          </div>

          {/* Schritt 1: Konto */}
          {_accounts.length>0&&(
            <div style={{marginBottom:8}}>
              <div style={{color:T.txt2,fontSize:10,marginBottom:4,fontWeight:600}}>1. Konto</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                <button onClick={()=>setNewGroup(p=>({...p,accountId:""}))}
                  style={{padding:"5px 10px",borderRadius:9,fontSize:11,fontWeight:600,cursor:"pointer",
                    border:`2px solid ${!newGroup.accountId?T.blue:"transparent"}`,
                    background:!newGroup.accountId?"rgba(74,159,212,0.15)":"rgba(255,255,255,0.05)",
                    color:!newGroup.accountId?T.blue:T.txt2,fontFamily:"inherit"}}>
                  Kein Konto
                </button>
                {_accounts.map(a=>(
                  <button key={a.id} onClick={()=>setNewGroup(p=>({...p,accountId:a.id}))}
                    style={{padding:"5px 10px",borderRadius:9,fontSize:11,fontWeight:600,cursor:"pointer",
                      border:`2px solid ${newGroup.accountId===a.id?(a.color||T.blue):"transparent"}`,
                      background:newGroup.accountId===a.id?(a.color||T.blue)+"22":"rgba(255,255,255,0.05)",
                      color:newGroup.accountId===a.id?(a.color||T.blue):T.txt2,fontFamily:"inherit",
                      display:"flex",alignItems:"center",gap:5}}>
                    {Li(a.icon||"landmark",12,newGroup.accountId===a.id?(a.color||T.blue):T.txt2)}
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Schritt 2: Typ */}
          <div style={{marginBottom:8}}>
            <div style={{color:T.txt2,fontSize:10,marginBottom:4,fontWeight:600}}>{_accounts.length>0?"2.":"1."} Typ</div>
            <div style={{display:"flex",gap:6}}>
              {[
                ["expense","Ausgaben", T.neg,  T.tab_exp],
                ["income", "Einnahmen",T.pos,  T.tab_inc],
              ].map(([v,l,col,bgActive])=>{
                const active = newGroup.behavior===v;
                return (
                  <button key={v} onClick={()=>setNewGroup(p=>({...p,behavior:v}))}
                    style={{flex:1,padding:"7px 4px",borderRadius:10,cursor:"pointer",
                      fontFamily:"inherit",border:"none",
                      background:active?bgActive:"rgba(255,255,255,0.06)",
                      color:active?"#fff":T.txt2,fontSize:11,fontWeight:700,transition:"all 0.15s",
                      outline:active?`1.5px solid ${col}44`:"none"}}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schritt 3: Name + Icon */}
          <div>
            <div style={{color:T.txt2,fontSize:10,marginBottom:4,fontWeight:600}}>{_accounts.length>0?"3.":"2."} Name</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div
                data-dropzone="newgroup-icon"
                onClick={()=>setShowGroupIconPicker(true)}
                onPointerUp={e=>{ if(globalDrag.current){const d=globalDrag.current;setNewGroup(p=>({...p,...(d.icon?{icon:d.icon}:{}),...(d.color?{accent:d.color}:{})}));globalDrag.current=null;} }}
                title="Klicken zum Wählen oder Icon hierher ziehen"
                style={{width:36,height:36,borderRadius:9,flexShrink:0,cursor:"pointer",
                  background:"rgba(255,255,255,0.06)",border:`1px dashed ${T.bds}`,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                {newGroup.icon&&!newGroup.icon.includes("📂")
                  ? Li(newGroup.icon,18,newGroup.accent||T.blue)
                  : Li("folder-open",18,T.txt2)}
              </div>
              <input placeholder="Name der Hauptkategorie…" value={newGroup.label}
                onChange={e=>setNewGroup(p=>({...p,label:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&newGroup.label.trim()&&saveNewGroup()}
                style={{...INP,marginBottom:0,flex:1,fontSize:13}}/>
              <button onClick={saveNewGroup} disabled={!newGroup.label.trim()}
                style={{width:36,height:36,borderRadius:9,border:`1px solid ${T.bd}`,flexShrink:0,
                  background:newGroup.label.trim()?T.blue:"rgba(255,255,255,0.04)",
                  cursor:newGroup.label.trim()?"pointer":"default",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  opacity:newGroup.label.trim()?1:0.3}}>
                {Li("check",18,"#fff")}
              </button>
            </div>
          </div>
        </div>
        {/* Hauptkategorien-Liste — nach Konto gruppiert */}
        {(()=>{
          const accsWithGroups = [];
          _accounts.forEach(acc => {
            const grpsForAcc = _groups.filter(g=>g.accountId===acc.id);
            if(grpsForAcc.length>0) accsWithGroups.push({acc, grps: grpsForAcc});
          });
          const grpsNoAcc = _groups.filter(g=>!g.accountId);
          if(grpsNoAcc.length>0) accsWithGroups.push({acc:null, grps: grpsNoAcc});

          return accsWithGroups.map(({acc, grps}, blockIdx) => {
            const accKey = acc?.id||"no-acc";
            const accCollapsed = collapsedAccs.has(accKey);
            return (
            <div key={accKey}>
              {/* Konto-Header — einklappbar */}
              <div onClick={()=>toggleAcc(accKey)}
                style={{padding:"10px 14px 4px", display:"flex", alignItems:"center", gap:8,
                cursor:"pointer",
                borderTop: blockIdx>0 ? `2px solid ${T.bd}` : "none",
                marginTop: blockIdx>0 ? 6 : 0}}>
                {acc ? (<>
                  <div style={{width:22,height:22,borderRadius:6,background:(acc.color||T.blue)+"22",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {Li(acc.icon||"landmark",13,acc.color||T.blue)}
                  </div>
                  <span style={{color:acc.color||T.blue,fontSize:13,fontWeight:800,flex:1}}>
                    {acc.name}
                  </span>
                  {acc.delayDays>0&&<span style={{color:T.gold,fontSize:9,fontWeight:700,
                    background:T.gold+"22",borderRadius:4,padding:"1px 5px"}}>+{acc.delayDays}d</span>}
                </>) : (<>
                  {Li("layers",13,T.txt2)}
                  <span style={{color:T.txt2,fontSize:12,fontWeight:700,flex:1}}>Kein Konto zugeordnet</span>
                </>)}
                {Li(accCollapsed?"chevron-right":"chevron-down",12,T.txt2)}
              </div>

              {/* Gruppen dieses Kontos */}
              {!accCollapsed && grps.map((grp) => {
                const gi = _groups.indexOf(grp);
                return (
          <div key={grp.id}>
            {/* Gruppen-Header — einklappbar */}
            <div style={{display:"flex",alignItems:"center",padding:"8px 14px 3px",gap:6}}>
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                <button onClick={()=>moveGroup(grp.id,-1)} disabled={gi===0}
                  style={{background:"none",border:"none",color:gi===0?"rgba(255,255,255,0.1)":grp.accent,cursor:gi===0?"default":"pointer",fontSize:11,padding:"1px 4px",lineHeight:1}}>{Li("chevron-up",10)}</button>
                <button onClick={()=>moveGroup(grp.id,+1)} disabled={gi===_groups.length-1}
                  style={{background:"none",border:"none",color:gi===_groups.length-1?"rgba(255,255,255,0.1)":grp.accent,cursor:gi===_groups.length-1?"default":"pointer",fontSize:11,padding:"1px 4px",lineHeight:1}}>{Li("chevron-down",10)}</button>
              </div>
              {/* Gruppen-Icon: klickbar + Drop-Zone */}
              <div
                data-dropzone="group" data-dropid={grp.id}
                onClick={()=>setShowIconPicker(`grp-${grp.id}`)}
                onPointerUp={e=>{
                  if(globalDrag.current){
                    const d=globalDrag.current;
                    setGroups(p=>p.map(g=>g.id===grp.id?{...g,...(d.icon?{icon:d.icon}:{}),...(d.color?{accent:d.color}:{})}:g));
                    globalDrag.current=null;
                  }
                }}
                style={{cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                  width:26,height:26,borderRadius:7,background:grp.accent+"18",flexShrink:0,
                  border:`1px solid ${showIconPicker===`grp-${grp.id}`?grp.accent+"88":T.bd}`}}>
                {Li(grp.icon||"folder-open",16,grp.accent||T.txt2)}
              </div>
              {showIconPicker===`grp-${grp.id}`&&(
                <IconPickerDialog selectedIcon={grp.icon||"folder-open"} selectedColor={grp.accent||T.blue}
                  onSelect={ic=>{setGroups(p=>p.map(g=>g.id===grp.id?{...g,icon:ic}:g));setShowIconPicker(null);}}
                  onClose={()=>setShowIconPicker(null)}/>
              )}
              {/* Gruppen-Label — Klick zum Umbenennen */}
              {editGrpLabel===grp.id ? (
                <input autoFocus value={editGrpLabelVal}
                  onChange={e=>setEditGrpLabelVal(e.target.value)}
                  onBlur={()=>{ if(editGrpLabelVal.trim()) setGroups(p=>p.map(g=>g.id===grp.id?{...g,label:editGrpLabelVal.trim()}:g)); setEditGrpLabel(null); }}
                  onKeyDown={e=>{ if(e.key==="Enter"){ if(editGrpLabelVal.trim()) setGroups(p=>p.map(g=>g.id===grp.id?{...g,label:editGrpLabelVal.trim()}:g)); setEditGrpLabel(null); } if(e.key==="Escape") setEditGrpLabel(null); }}
                  style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${grp.accent||T.blue}`,
                    borderRadius:7,padding:"2px 8px",color:T.txt,fontSize:14,fontWeight:700,
                    outline:"none",width:140}}/>
              ) : (
                <span onClick={()=>{setEditGrpLabel(grp.id);setEditGrpLabelVal(grp.label);}}
                  title="Klicken zum Umbenennen"
                  style={{color:T.pos,fontSize:14,fontWeight:700,cursor:"text",
                    borderBottom:`1px dashed transparent`,
                    transition:"border-color 0.15s"}}
                  onMouseEnter={e=>e.target.style.borderBottomColor=T.txt2}
                  onMouseLeave={e=>e.target.style.borderBottomColor="transparent"}>
                  {grp.label}
                </span>
              )}
              {grp.accountId&&(()=>{const a=_accounts.find(x=>x.id===grp.accountId);return a?(
                <span style={{background:a.color+"22",color:a.color,borderRadius:5,
                  padding:"1px 6px",fontSize:9,fontWeight:700}}>{Li(a.icon,10,a.color)} {a.name}</span>
              ):null;})()}
              <span style={{flex:1}}/>
              <button onClick={e=>{e.stopPropagation();toggleGrp(grp.id);}}
                style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:"2px 4px"}}>
                {Li(collapsedGrps.has(grp.id)?"chevron-right":"chevron-down",12,T.txt2)}
              </button>
              {_accounts.length>0&&(
                <select value={grp.accountId||""}
                  onChange={e=>setGroups(p=>p.map(g=>g.id===grp.id?{...g,accountId:e.target.value}:g))}
                  style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bd}`,
                    borderRadius:7,padding:"2px 6px",color:T.txt2,fontSize:10,outline:"none",
                    cursor:"pointer",maxWidth:90}}>
                  <option value="">kein Konto</option>
                  {_accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              {(_cats).filter(c=>c.type===grp.type).length===0&&(
                <button onClick={()=>{if(window.confirm(`Gruppe "${grp.label}" wirklich löschen?`)) setGroups(p=>p.filter(g=>g.id!==grp.id));}}
                  style={{background:"none",border:"none",color:T.neg,opacity:0.5,cursor:"pointer"}}>{Li("trash-2",14)}</button>
              )}
              <button onClick={()=>{ setInlineNewCat(inlineNewCat===grp.id?null:grp.id); setInlineCatName(""); }}
                style={{background:inlineNewCat===grp.id?"rgba(224,80,96,0.15)":"rgba(255,255,255,0.06)",
                  border:`1px solid ${inlineNewCat===grp.id?"rgba(224,80,96,0.4)":T.bd}`,
                  color:inlineNewCat===grp.id?T.neg:T.txt2,
                  borderRadius:8,padding:"2px 8px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
                {inlineNewCat===grp.id ? <>{Li("x",11)} Abbrechen</> : <>{Li("plus",11)} Kategorie</>}
              </button>
            </div>

            {/* Inline neues Kategorie-Formular */}
            {inlineNewCat===grp.id&&(
              <div style={{display:"flex",gap:6,padding:"4px 14px 8px",alignItems:"center"}}>
                <input autoFocus value={inlineCatName}
                  onChange={e=>setInlineCatName(e.target.value)}
                  onKeyDown={e=>{
                    if(e.key==="Enter"&&inlineCatName.trim()){
                      setCats(p=>[...p,{id:"cat-"+uid(),name:inlineCatName.trim(),icon:"",type:grp.type,color:grp.accent||T.blue,subs:[]}]);
                      setInlineCatName(""); setInlineNewCat(null);
                    }
                    if(e.key==="Escape") setInlineNewCat(null);
                  }}
                  placeholder={`neue Kategorie in ${grp.label}…`}
                  style={{...INP,marginBottom:0,flex:1,fontSize:13,padding:"7px 11px",
                    border:`1px solid ${grp.accent+"66"}`,background:"rgba(255,255,255,0.05)"}}/>
                <button disabled={!inlineCatName.trim()}
                  onClick={()=>{
                    if(!inlineCatName.trim()) return;
                    setCats(p=>[...p,{id:"cat-"+uid(),name:inlineCatName.trim(),icon:"",type:grp.type,color:grp.accent||T.blue,subs:[]}]);
                    setInlineCatName(""); setInlineNewCat(null);
                  }}
                  style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${T.bd}`,
                    borderRadius:9,width:34,height:34,
                    cursor:inlineCatName.trim()?"pointer":"default",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    opacity:inlineCatName.trim()?1:0.3}}>
                  {Li("check",18,inlineCatName.trim()?T.blue:T.txt2)}
                </button>
              </div>
            )}

            {/* Kategorien dieser Gruppe */}
            {!collapsedGrps.has(grp.id) && (_cats).filter(c=>c.type===grp.type).map((cat,ci,arr)=>(
              <div key={cat.id}
                data-dropzone="cat" data-dropid={cat.id}
                onPointerUp={e=>{
                  if(globalDrag.current){
                    const d=globalDrag.current;
                    if(d.icon) updateCat(cat.id,"icon",d.icon);
                    if(d.color) updateCat(cat.id,"color",d.color);
                    globalDrag.current=null; setDropTargetCat(null);
                  }
                }}
                onPointerEnter={()=>{ if(globalDrag.current) setDropTargetCat(cat.id); }}
                onPointerLeave={()=>setDropTargetCat(null)}
                style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"5px 8px",margin:"2px 10px",
                  border:dropTargetCat===cat.id?`2px solid ${T.blue}`:`1px solid ${T.bd}`,
                  display:"flex",alignItems:"center",gap:8,
                  transition:"border-color 0.15s",
                  boxShadow:dropTargetCat===cat.id?`0 0 0 2px ${T.blue}33`:"none"}}>
                <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                  <button onClick={e=>{e.stopPropagation();moveCat(cat.id,-1);}} disabled={ci===0}
                    style={{background:"none",border:"none",color:ci===0?"rgba(255,255,255,0.1)":T.txt2,cursor:ci===0?"default":"pointer",fontSize:11,padding:"0px 3px",lineHeight:1}}>{Li("chevron-up",10)}</button>
                  <button onClick={e=>{e.stopPropagation();moveCat(cat.id,+1);}} disabled={ci===arr.length-1}
                    style={{background:"none",border:"none",color:ci===arr.length-1?"rgba(255,255,255,0.1)":T.txt2,cursor:ci===arr.length-1?"default":"pointer",fontSize:11,padding:"0px 3px",lineHeight:1}}>{Li("chevron-down",10)}</button>
                </div>
                <div onClick={()=>setMgmtCat(cat.id)} style={{display:"flex",alignItems:"center",gap:8,flex:1,cursor:"pointer",minWidth:0}}>
                  <button onClick={e=>{e.stopPropagation();setShowIconPicker(`cat-list-${cat.id}`);}}
                    style={{width:28,height:28,borderRadius:8,background:cat.color+"22",flexShrink:0,
                      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                      border:dropTargetCat===cat.id?`2px dashed ${T.blue}`:`1px solid ${cat.color+"33"}`}}>
                    {cat.icon?Li(cat.icon,16,cat.color||T.txt2):<span style={{color:T.txt2,fontSize:16,opacity:0.3}}>·</span>}
                  </button>
                  {showIconPicker===`cat-list-${cat.id}`&&(
                    <IconPickerDialog selectedIcon={cat.icon} selectedColor={cat.color}
                      onSelect={ic=>{updateCat(cat.id,"icon",ic);setShowIconPicker(null);}}
                      onClose={()=>setShowIconPicker(null)}/>
                  )}
                  <span style={{color:T.txt,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{cat.name}</span>
                  {Li("chevron-right",13,T.txt2)}
                </div>
              </div>
            ))}
            {(_cats).filter(c=>c.type===grp.type).length===0&&(
              <div style={{color:T.txt2,fontSize:11,padding:"4px 24px 6px"}}>Noch keine Kategorien</div>
            )}
          </div>
                ); // end grp div
              })} {/* end grps.map */}
            </div>
          ); // end accsWithGroups block
          }); // end accsWithGroups.map
        })()} {/* end IIFE */}

</div>
        )} {/* end mgrTab!==einstellungen&&!==konten */}
      </div>
    );

}

// ══════════════════════════════════════════════════════════════════════
// ── KategorieAnlegen — eingebettet in AddTxModal ──────────────────────

export { ManagementScreen };
