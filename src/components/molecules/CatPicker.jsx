// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useRef, useState } from "react";
import { QuickBtnsBar } from "./QuickBtnsBar.jsx";
import { QuickBtnsBarWithColor } from "./QuickBtnsBarWithColor.jsx";
import { IconPickerDialog } from "../organisms/IconPickerDialog.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function CatPicker({value, onChange, placeholder="Kategorie wählen…", totalAmount=0, onSplit=null, filterType=null, openUp=false, accountId=null, noMargin=false}) {
  const { cats, groups, accounts, setCats, setGroups, quickBtns, setQuickBtns } = useContext(AppCtx);
  const [step,    setStep]    = useState(0);  // 0=Gruppe 1=Kat 2=Unterkat
  const [selGrp,  setSelGrp]  = useState(null);
  const [selCat,  setSelCat]  = useState(null);
  const [open,    setOpen]    = useState(false);
  // Neu-Anlegen
  const [newMode, setNewMode] = useState(null); // "grp"|"cat"|"sub"
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newColor,setNewColor]= useState(T.blue);
  const [newBeh,  setNewBeh]  = useState("expense");
  const [showCpQuick, setShowCpQuick] = useState(false);
  // Split
  const [splitMode, setSplitMode]  = useState(false);
  const [splits,    setSplits]     = useState([]);
  // Kategorien von einem anderen Konto übernehmen
  const [copyMode, setCopyMode] = useState(false);

  const [curCatId, curSubId] = (value||"|").split("|");
  const curCat = cats.find(c=>c.id===curCatId);
  const curSub = curCat?.subs?.find(s=>s.id===curSubId);
  const label  = curSub?`${curCat.name} / ${curSub.name}`:curCat?curCat.name:placeholder;

  const reset = () => { setStep(0); setSelGrp(null); setSelCat(null); setNewMode(null); setNewName(""); setSplitMode(false); setCopyMode(false); };
  const close = () => { setOpen(false); reset(); };

  // Wenn Konto- oder Typ-Filter sich ändern: zurück zu Step 0 (Gruppen-Liste neu zeigen)
  const _prevAccRef = React.useRef(accountId);
  const _prevTypeRef = React.useRef(filterType);
  React.useEffect(()=>{
    if(_prevAccRef.current !== accountId || _prevTypeRef.current !== filterType) {
      _prevAccRef.current = accountId;
      _prevTypeRef.current = filterType;
      reset();
    }
  }, [accountId, filterType]);

  const btnS = (active,col) => ({
    width:"100%", textAlign:"left", padding:"6px 8px", borderRadius:8,
    border:`1px solid ${active?(col||T.blue)+"66":T.bd}`,
    background:active?(col||T.blue)+"18":"rgba(255,255,255,0.04)",
    color:T.txt, fontSize:12, cursor:"pointer", marginBottom:2,
    display:"flex", alignItems:"center", gap:8,
  });

  // Split helpers
  const initSplit = () => {
    const half = totalAmount ? String(totalAmount/2).replace(".",",") : "";
    setSplits([
      {id:uid(), catId:curCatId, subId:curSubId, amount:half},
      {id:uid(), catId:"", subId:"", amount:half},
    ]);
    setSplitMode(true);
  };
  const splitTotal = splits.reduce((s,sp)=>s+pn(sp.amount),0);
  const splitDiff  = totalAmount ? Math.abs(splitTotal-totalAmount) : 0;

  const saveNewGrp = () => {
    if(!newName.trim()) return;
    const id = "grp-"+uid();
    const type = id;
    // Wenn der Picker auf ein Konto bezogen ist (accountId-Prop), die neue
    // Hauptkategorie diesem Konto zuordnen — sonst landet sie „ohne Konto".
    setGroups(p=>[...p,{id,type,label:newName.trim(),icon:newIcon,accent:newColor,blockColor:"aus",behavior:newBeh,...(accountId?{accountId}:{})}]);
    setNewMode(null); setNewName(""); setStep(0);
  };

  // Alle Hauptkategorien (+ Kategorien + Unterkategorien) eines Quell-Kontos auf
  // das aktuelle Konto klonen (neue IDs/Typen, gleiche Namen/Icons/Budget-Struktur).
  const copyCatsFromAccount = (srcAccId) => {
    const srcGroups = groups.filter(g => (g.accountId||null) === srcAccId);
    const newGroups = [];
    const newCats = [];
    srcGroups.forEach(g => {
      const newGid = "grp-"+uid();
      const newType = newGid;
      newGroups.push({...g, id:newGid, type:newType, accountId});
      cats.filter(c => c.type === g.type).forEach(c => {
        newCats.push({...c, id:"cat-"+uid(), type:newType,
          subs:(c.subs||[]).map(s=>({...s, id:"sub-"+uid()}))});
      });
    });
    if(newGroups.length){ setGroups(p=>[...p,...newGroups]); setCats(p=>[...p,...newCats]); }
    setCopyMode(false);
  };
  const saveNewCatLocal = () => {
    if(!newName.trim()||!selGrp) return;
    const id = "cat-"+uid();
    setCats(p=>[...p,{id,name:newName.trim(),icon:newIcon,color:newColor,type:selGrp.type,subs:[]}]);
    setNewMode(null); setNewName(""); setNewIcon("");
  };
  const saveNewSubLocal = () => {
    if(!newName.trim()||!selCat) return;
    const id = "sub-"+uid();
    setCats(p=>p.map(c=>c.id===selCat.id?{...c,subs:[...c.subs,{id,name:newName.trim(),icon:newIcon}]}:c));
    setNewMode(null); setNewName("");
  };

  const triggerRef = React.useRef(null);
  const [panelPos, setPanelPos] = React.useState({top:0,left:0,width:0});
  const openPanel = () => {
    if(triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      // Auto-Flip: wenn nach unten zu wenig Platz UND nach oben mehr Platz → nach oben aufklappen.
      // Panel-maxHeight ist 320 + 4px Abstand; wir reservieren etwas extra für nav-bottom.
      const PANEL_H = 320 + 4;
      const NAV_BOTTOM_RESERVE = 70; // nav-bottom-Höhe + bisschen Luft
      const spaceBelow = window.innerHeight - r.bottom - NAV_BOTTOM_RESERVE;
      const spaceAbove = r.top;
      const flipUp = openUp || (spaceBelow < PANEL_H && spaceAbove > spaceBelow);
      setPanelPos({
        top: flipUp ? r.top - 4 : r.bottom + 4,
        left: r.left, width: r.width,
        up: flipUp
      });
    }
    setOpen(o=>!o); if(open) reset();
  };

  return (
    <div style={{position:"relative",width:"100%",marginBottom:noMargin?0:8}}>
      {/* Trigger */}
      <div style={{display:"flex",gap:4}}>
        <button ref={triggerRef} onClick={openPanel}
          style={{flex:1,padding:"5px 10px",borderRadius:10,
            border:`1px solid ${open||curCat?T.blue:T.bds}`,
            background:"rgba(255,255,255,0.06)",color:curCat?T.txt:T.txt2,
            fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",
            justifyContent:"space-between",gap:6,minWidth:0}}>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {curCat&&<span style={{marginRight:4,display:"inline-flex",alignItems:"center"}}>{Li(curCat.icon,13,curCat.color||T.txt2)}</span>}
            {label}
          </span>
          <span style={{color:T.txt2,fontSize:10,flexShrink:0}}>{Li(open?"chevron-up":"chevron-down",11,T.txt2)}</span>
        </button>
        {/* Split-Button */}
        {onSplit&&curCat&&(
          <button onClick={()=>{setOpen(true);initSplit();}}
            title="Splitbuchung"
            style={{background:"rgba(74,159,212,0.15)",border:`1px solid ${T.blue}44`,
              borderRadius:10,padding:"0 10px",color:T.blue,fontSize:13,cursor:"pointer",flexShrink:0}}>
            ⇌
          </button>
        )}
      </div>

      {/* Panel */}
      {open&&(
        <div onClick={e=>e.stopPropagation()}
          style={{position:"fixed",
            ...(panelPos.up
              ? {bottom: `calc(100vh - ${panelPos.top}px)`, top:"auto"}
              : {top:panelPos.top}),
            left:panelPos.left,width:panelPos.width,zIndex:200,
            background:T.surf2,borderRadius:14,border:`1px solid ${T.bds}`,
            boxShadow:"0 8px 32px rgba(0,0,0,0.6)",padding:10,maxHeight:320,overflowY:"auto"}}>

          {/* ── SPLIT MODE ── */}
          {splitMode&&onSplit&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{color:T.blue,fontSize:12,fontWeight:700,flex:1}}><span style={{display:"flex",alignItems:"center",gap:4}}>{Li("arrow-left-right",12)}Splitbuchung</span></span>
                <button onClick={()=>setSplitMode(false)}
                  style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:12}}>{Li("x",13)}</button>
              </div>
              {splits.map((sp,si)=>{
                const sc=cats.find(c=>c.id===sp.catId);
                const ss=sc?.subs?.find(s=>s.id===sp.subId);
                return (
                  <div key={sp.id} style={{background:"rgba(255,255,255,0.04)",borderRadius:10,
                    padding:"6px 8px",marginBottom:6,border:`1px solid ${T.bd}`}}>
                    <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
                      <span style={{color:T.txt2,fontSize:10,width:16}}>{si+1}.</span>
                      <input value={sp.amount} onChange={e=>setSplits(p=>p.map(s=>s.id===sp.id?{...s,amount:e.target.value}:s))}
                        placeholder="Betrag" inputMode="decimal"
                        style={{width:80,background:"rgba(255,255,255,0.07)",border:`1px solid ${T.bds}`,
                          borderRadius:7,padding:"4px 8px",color:T.txt,fontSize:12,outline:"none"}}/>
                      <span style={{color:T.txt2,fontSize:11,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {ss?`${sc.name}/${ss.name}`:sc?sc.name:"kategorie wählen"}
                      </span>
                      {splits.length>1&&(
                        <button onClick={()=>setSplits(p=>p.filter(s=>s.id!==sp.id))}
                          style={{background:"none",border:"none",color:T.neg,cursor:"pointer",fontSize:14,flexShrink:0}}>{Li("x",13)}</button>
                      )}
                    </div>
                    <CatPicker value={sp.catId+"|"+sp.subId}
                      onChange={(catId,subId)=>setSplits(p=>p.map(s=>s.id===sp.id?{...s,catId,subId}:s))}
                      placeholder="Kategorie…"/>
                  </div>
                );
              })}
              <button onClick={()=>setSplits(p=>[...p,{id:uid(),catId:"",subId:"",amount:""}])}
                style={{width:"100%",padding:"6px",borderRadius:8,border:`1px dashed ${T.bds}`,
                  background:"transparent",color:T.blue,fontSize:12,cursor:"pointer",marginBottom:8}}>
                + Weiterer Split
              </button>
              {totalAmount>0&&(
                <div style={{textAlign:"right",fontSize:11,marginBottom:6,
                  color:Math.abs(splitDiff)<0.01?T.pos:T.neg}}>
                  {(()=>{const d=Math.round(splitDiff*100)/100; return Math.abs(d)<0.01?"✓ Stimmt überein":"⚠ Differenz: "+fmt(Math.abs(d));})()}
                </div>
              )}
              <button onClick={()=>{ onSplit(splits); close(); }}
                disabled={splits.some(s=>!s.catId)||splits.length<2}
                style={{width:"100%",padding:"9px",borderRadius:10,border:"none",
                  background:splits.every(s=>s.catId)&&splits.length>=2
                    ?T.blue:T.disabled,
                  color:"#fff",fontSize:13,fontWeight:700,
                  cursor:splits.every(s=>s.catId)?"pointer":"default",
                  opacity:splits.every(s=>s.catId)?1:0.4}}>
                Split übernehmen ✓
              </button>
            </div>
          )}

          {/* ── NEU ANLEGEN FORM ── */}
          {!splitMode&&newMode&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <button onClick={()=>{setNewMode(null);setNewName("");}}
                  style={{background:"none",border:"none",color:T.blue,cursor:"pointer",fontSize:12}}>{Li("arrow-left",11,T.blue)} zurück</button>
                <span style={{color:T.txt,fontSize:12,fontWeight:700,flex:1}}>
                  {newMode==="grp"?"neue Hauptkategorie":newMode==="cat"?"neue Kategorie":"neue Unterkategorie"}
                </span>
              </div>
              <input value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="Name…" autoFocus
                style={{width:"100%",background:"rgba(255,255,255,0.07)",border:`1px solid ${T.bds}`,
                  borderRadius:9,padding:"6px 8px",color:T.txt,fontSize:13,outline:"none",
                  marginBottom:8,boxSizing:"border-box"}}/>
              {/* Schnellwahl-Icons + Farben zur Icon-Auswahl */}
              {newMode!=="sub"
                ? <QuickBtnsBarWithColor
                    onSelectIcon={btn => { setNewIcon(btn.icon); if(btn.color) setNewColor(btn.color); }}
                    onSelectColor={col => setNewColor(col)}
                    _onDragStart={(icon, color)=>{ setNewIcon(icon); if(color) setNewColor(color); }}
                  />
                : <QuickBtnsBar onSelect={btn => { setNewIcon(btn.icon); }} />
              }
              {showCpQuick==="icon"&&<IconPickerDialog selectedIcon={newIcon} selectedColor={newMode!=="sub"?newColor:T.blue} onSelect={ic=>setNewIcon(ic)} onClose={()=>setShowCpQuick(false)}/>}
              {/* Behavior for new group */}
              {newMode==="grp"&&(
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  {[["income","Einnahmen"],["expense","Ausgaben"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setNewBeh(v)}
                      style={{flex:1,padding:"5px",borderRadius:8,border:`1px solid ${newBeh===v?T.blue:T.bd}`,
                        background:newBeh===v?"rgba(74,159,212,0.15)":"transparent",
                        color:newBeh===v?T.blue:T.txt2,fontSize:11,cursor:"pointer",fontWeight:600}}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              {showCpQuick==="icon"&&<IconPickerDialog selectedIcon={newIcon} selectedColor={newMode!=="sub"?newColor:T.blue} onSelect={ic=>setNewIcon(ic)} onClose={()=>setShowCpQuick(false)}/>}
              <button onClick={newMode==="grp"?saveNewGrp:newMode==="cat"?saveNewCatLocal:saveNewSubLocal}
                disabled={!newName.trim()}
                style={{width:"100%",padding:"9px",borderRadius:10,border:"none",
                  background:newName.trim()?T.blue:T.disabled,
                  color:"#fff",fontSize:13,fontWeight:700,
                  cursor:newName.trim()?"pointer":"default",opacity:newName.trim()?1:0.4}}>
                Anlegen ✓
              </button>
            </div>
          )}

          {/* ── NORMAL NAVIGATION ── */}
          {!splitMode&&!newMode&&(
            <>
              {/* Breadcrumb */}
              {step>0&&(
                <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6,color:T.txt2,fontSize:10}}>
                  <button onClick={()=>{setStep(0);setSelGrp(null);setSelCat(null);}}
                    style={{background:"none",border:"none",color:T.blue,cursor:"pointer",fontSize:10,padding:0}}>Gruppen</button>
                  {step>=1&&<><span>{Li("chevron-right",14)}</span>
                    <button onClick={()=>{if(step>1){setStep(1);setSelCat(null);}}}
                      style={{background:"none",border:"none",color:step>1?T.blue:T.txt,
                        cursor:step>1?"pointer":"default",fontSize:10,padding:0}}>{selGrp?.label}</button></>}
                  {step>=2&&<><span>{Li("chevron-right",14)}</span><span style={{color:T.txt}}>{selCat?.name}</span></>}
                </div>
              )}

              {/* Step 0: Gruppen + Neue Gruppe */}
              {step===0&&<>
                {(()=>{
                  // Wenn ein Konto gewählt ist: ALLE Gruppen dieses Kontos zeigen
                  // (Einnahme + Ausgabe), Typ-Filter wird dabei ignoriert.
                  // Ohne Konto-Filter: nach Behavior-Typ filtern.
                  // Helper: matcht eine Gruppe gegen den filterType.
                  // (Zentrales Predicate, damit accountId und filterType gleichzeitig
                  // wirken können — sonst zeigt der CSV-Import auch Einnahme-Kategorien
                  // für Ausgaben, wenn ein Konto vorausgewählt ist.)
                  const matchesType = (g) => {
                    if(!filterType) return true;
                    if(filterType==="tagesgeld") return g.behavior==="tagesgeld"||g.type==="tagesgeld";
                    if(filterType==="income")    return g.behavior==="income"   ||g.behavior==="tagesgeld"||g.type==="income"   ||g.type==="tagesgeld";
                    // expense
                    return g.behavior==="expense"||g.behavior==="tagesgeld"||g.type==="expense"||g.type==="tagesgeld"||(!g.behavior&&g.type!=="income");
                  };
                  let filteredGroups;
                  if(accountId) {
                    filteredGroups = groups.filter(g => g.accountId===accountId && matchesType(g));
                  } else {
                    filteredGroups = groups.filter(matchesType);
                  }
                  // IMMER nach Konto gruppieren — Konto-Header über jeder Gruppe
                  const byAcc = new Map();
                  filteredGroups.forEach(g=>{
                    const k = g.accountId || "_none";
                    if(!byAcc.has(k)) byAcc.set(k, []);
                    byAcc.get(k).push(g);
                  });
                  const renderGroup = g => (
                    <button key={g.id} onClick={()=>{setSelGrp(g);setStep(1);}} style={{...btnS(false,g.accent)}}>
                      <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:18,flexShrink:0}}>{Li(g.icon,15,g.accent||T.txt2)}</span>
                      <span style={{flex:1,fontWeight:600,color:(g.behavior==="expense"||g.type==="expense")?T.neg:(g.behavior==="income"||g.type==="income")?T.pos:g.accent,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.label}</span>
                      <span style={{color:T.txt2,fontSize:9,flexShrink:0}}>{cats.filter(c=>c.type===g.type).length} K.</span>
                      <span style={{color:T.txt2,fontSize:11,flexShrink:0}}>{Li("chevron-right",14)}</span>
                    </button>
                  );
                  return [...byAcc.entries()].map(([accId, grps])=>{
                    const acc = accounts.find(a=>a.id===accId);
                    return (
                      <div key={accId} style={{marginBottom:6}}>
                        {acc&&(
                          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 6px",
                            color:acc.color||T.blue,fontSize:10,fontWeight:700,letterSpacing:0.3,
                            textTransform:"uppercase"}}>
                            {Li(acc.icon||"credit-card",11,acc.color||T.blue)}
                            {acc.name}
                          </div>
                        )}
                        {!acc&&accId==="_none"&&(
                          <div style={{padding:"4px 6px",color:T.txt2,fontSize:10,fontWeight:700,letterSpacing:0.3,textTransform:"uppercase"}}>
                            ohne Konto-Zuordnung
                          </div>
                        )}
                        {grps.map(renderGroup)}
                      </div>
                    );
                  });
                })()}
                <button onClick={()=>setNewMode("grp")}
                  style={{...btnS(false),border:`1px dashed ${T.bds}`,color:T.blue,marginTop:4}}>
                  <span>＋</span><span>neue Kategorie anlegen</span>
                </button>
                {/* Kategorien von anderem Konto übernehmen — nur im Konto-Kontext */}
                {accountId&&(()=>{
                  const srcAccs = accounts.filter(a=>a.id!==accountId && groups.some(g=>g.accountId===a.id));
                  if(!srcAccs.length) return null;
                  if(copyMode) return (
                    <div style={{marginTop:6,borderTop:`1px solid ${T.bd}`,paddingTop:6}}>
                      <div style={{color:T.txt2,fontSize:10,fontWeight:700,marginBottom:4}}>Von welchem Konto übernehmen?</div>
                      {srcAccs.map(a=>(
                        <button key={a.id} onClick={()=>copyCatsFromAccount(a.id)} style={{...btnS(false,a.color)}}>
                          <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:18,flexShrink:0}}>{Li(a.icon||"credit-card",14,a.color||T.blue)}</span>
                          <span style={{flex:1}}>{a.name}</span>
                        </button>
                      ))}
                      <button onClick={()=>setCopyMode(false)}
                        style={{background:"none",border:"none",color:T.txt2,fontSize:10,cursor:"pointer",marginTop:2}}>abbrechen</button>
                    </div>
                  );
                  return (
                    <button onClick={()=>setCopyMode(true)}
                      style={{...btnS(false),border:`1px dashed ${T.bds}`,color:T.txt2,marginTop:4}}>
                      <span>⧉</span><span>Kategorien von anderem Konto übernehmen</span>
                    </button>
                  );
                })()}
              </>}

              {/* Step 1: Kategorien + Neue Kategorie */}
              {step===1&&<>
                {cats.filter(c=>c.type===selGrp?.type).map(cat=>(
                  <button key={cat.id} onClick={()=>{
                    if((cat.subs||[]).length===0){onChange(cat.id,"");close();}
                    else{setSelCat(cat);setStep(2);}
                  }} style={{...btnS(curCatId===cat.id,cat.color)}}>
                    <div style={{width:24,height:24,borderRadius:7,background:cat.color+"33",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{Li(cat.icon,14,cat.color||T.txt2)||<span style={{opacity:0.3}}>·</span>}</div>
                    <span style={{flex:1}}>{cat.name}</span>
                    <span style={{color:T.txt2,fontSize:10}}>{(cat.subs||[]).length} Unterk.</span>
                    <span style={{color:T.txt2,fontSize:11}}>{Li("chevron-right",14)}</span>
                  </button>
                ))}
                <button onClick={()=>setNewMode("cat")}
                  style={{...btnS(false),border:`1px dashed ${T.bds}`,color:T.blue,marginTop:4}}>
                  <span>＋</span><span>neue Kategorie in „{selGrp?.label}"</span>
                </button>
              </>}

              {/* Step 2: Unterkategorien + Neue Unterkategorie */}
              {step===2&&<>
                {selCat?.subs?.map(sub=>(
                  <button key={sub.id} onClick={()=>{onChange(selCat.id,sub.id);close();}}
                    style={{...btnS(curSubId===sub.id,selCat.color)}}>
                    <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:20,flexShrink:0}}>{Li(sub.icon,13,selCat.color||T.txt2)||<span style={{opacity:0.3}}>·</span>}</span>
                    <span style={{flex:1}}>{sub.name}</span>
                    {curSubId===sub.id&&<span style={{display:"inline-flex"}}>{Li("check",11,T.blue)}</span>}
                  </button>
                ))}
                <button onClick={()=>setNewMode("sub")}
                  style={{...btnS(false),border:`1px dashed ${T.bds}`,color:T.blue,marginTop:4}}>
                  <span>＋</span><span>neue Unterkategorie in „{selCat?.name}"</span>
                </button>
              </>}

              {/* Auswahl löschen */}
              {curCat&&(
                <button onClick={()=>{onChange("","");close();}}
                  style={{width:"100%",textAlign:"left",padding:"4px 8px",borderRadius:8,
                    border:"none",background:"none",color:T.neg,fontSize:11,cursor:"pointer",marginTop:4}}>
                  ✕ Auswahl entfernen
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { CatPicker };
