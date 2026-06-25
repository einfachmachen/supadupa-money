// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { SubNameField } from "../atoms/SubNameField.jsx";
import { AccountChips } from "../molecules/AccountChips.jsx";
import { IconPickerDialog } from "./IconPickerDialog.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { fmt, pn, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { suggestBudget } from "../../utils/budgetSuggest.js";

// Kategorie-Priorität (steuert die Treiber-Reihenfolge im Money-Mood-Schieflage-Panel).
const PRIO_OPTS = [
  ["essential", "Essentiell", "lock"],
  ["normal",    "Normal",     "minus"],
  ["flex",      "Flexibel",   "scissors"],
];

function MobileKategorienModal({onClose, onBack, onKonten, onKategorienErweitert}) {
  const goBack = onBack || onClose; // zurück eine Ebene hoch (Mehr-Menü)
  const { cats, setCats, groups, setGroups, budgets, setBudgets, txs, setTxs, accounts,
    getBudgetForMonth, getActualSum, year, setYear, month, setMonth, selAcc, csvRules, setCsvRules, setMasterOverride } = useContext(AppCtx);
  const S = {fs:26, pad:10, padL:14, radius:16, gap:14};
  const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  // Konto-Filter — initial vom aktuell aktiven Konto
  const [catAccFilter, setCatAccFilter] = useState(selAcc || null);
  // Toast für Regen-Feedback
  const [toast, setToast] = useState("");
  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""), 3000); };
  // Kategorien von einem anderen Konto auf das aktuell gefilterte Konto klonen
  // (neue IDs/Typen, gleiche Namen/Icons/Struktur; Budget-Beträge bleiben kontoweise separat)
  const [copySrcOpen, setCopySrcOpen] = useState(false);
  const copyCatsToAccount = (targetAccId, srcAccId) => {
    const srcGroups = groups.filter(g => (g.accountId||"") === srcAccId);
    const newGroups = []; const newCats = [];
    srcGroups.forEach(g => {
      const newGid = "grp-"+uid(); const newType = newGid;
      newGroups.push({...g, id:newGid, type:newType, accountId: targetAccId});
      cats.filter(c => c.type === g.type).forEach(c => {
        newCats.push({...c, id:"cat-"+uid(), type:newType,
          subs:(c.subs||[]).map(s=>({...s, id:"sub-"+uid()}))});
      });
    });
    if(newGroups.length){
      setGroups(p=>[...p,...newGroups]);
      setCats(p=>[...p,...newCats]);
      showToast(`✓ ${newGroups.length} Kategorie-Gruppen übernommen`);
    } else {
      showToast("Quell-Konto hat keine Kategorien");
    }
    setCopySrcOpen(false);
  };
  // Icon-/Farb-Picker State (per Antippen)
  const [iconPickFor, setIconPickFor] = useState(null);    // {type:"cat"|"sub", id}
  const updateCat = (catId, field, val) => {
    setCats(p => p.map(c => c.id===catId ? {...c, [field]: val} : c));
  };
  const updateSub = (subId, field, val) => {
    setCats(p => p.map(c => ({
      ...c,
      subs: (c.subs||[]).map(s => s.id===subId ? {...s, [field]: val} : s)
    })));
  };

  // Findet (oder legt an) eine Gruppe für (accountId, behavior) und gibt deren type zurück.
  // accId="" → ohne Konto-Bindung. behavior="income"|"expense".
  // Diese Funktion ist kritisch dafür, dass eine Kategorie auf einem Konto "kleben bleibt",
  // wenn der Nutzer ihr Behavior ändert oder eine neue anlegt: die Gruppe wird passend gewählt
  // (oder erstellt), damit der Account-Filter im Tab-Filter weiterhin greift.
  const ensureGroupForCat = (accId, behavior) => {
    const beh = behavior==="income" ? "income" : "expense";
    const wantedAcc = accId || "";
    // 1. Suche existierende Gruppe mit passender accountId UND passendem behavior
    const exact = (groups||[]).find(g =>
      (g.accountId||"") === wantedAcc &&
      ((g.behavior||g.type) === beh || (beh==="income" && (g.behavior==="tagesgeld"||g.type==="tagesgeld")))
    );
    if(exact) return exact.type;
    // 2. Keine passende Gruppe → neue anlegen
    const newType = "grp-"+uid();
    const accObj = (accounts||[]).find(a=>a.id===wantedAcc);
    const accLabel = accObj?.name || "";
    const label = accLabel
      ? `${accLabel} ${beh==="income"?"Einnahmen":"Ausgaben"}`
      : (beh==="income"?"Einnahmen":"Ausgaben");
    setGroups(p=>[...p,{
      id:"grp-"+uid(), type:newType, label,
      icon: beh==="income"?"arrow-down-circle":"arrow-up-circle",
      accent: beh==="income" ? T.pos : T.neg, blockColor:"aus",
      behavior: beh, accountId: wantedAcc
    }]);
    return newType;
  };

  const [view,     setView]     = useState("list"); // list|newCat|newSub|editCat
  const [selCat,   setSelCat]   = useState(null);
  const [newName,  setNewName]  = useState("");
  const [newType,  setNewType]  = useState("expense");
  const [newColor, setNewColor] = useState(T.blue);
  const [editName, setEditName] = useState(""); // für Kategorie bearbeiten
  const [editColor,setEditColor]= useState(T.blue);
  const [editType, setEditType] = useState("expense");
  const [editPriority, setEditPriority] = useState("normal");
  const [budgetOpen, setBudgetOpen]  = useState({}); // {subId: bool}
  const [budgetEdits, setBudgetEdits] = useState({});
  const [budgetScope, setBudgetScope] = useState({});
  const [budgetRhythm, setBudgetRhythm] = useState({}); // {subId: 1|3|6|12}

  // Budget-Vorschlag je Unterkategorie: gewichteter Schnitt aus gebuchter
  // Historie + Vormerkungen — dieselbe Util wie das Desktop-BudgetEditorModal.
  // Nur lazy beim geöffneten Editor je Sub aufgerufen (sonst zu teuer).
  const calcSuggestion = (subId) => {
    const getActual = (y,m) => getActualSum?.(y,m,subId,"E") || 0;
    const getPending = (y,m) => {
      let s = 0;
      (txs||[]).forEach(t=>{
        if(!t.pending || t._budgetSubId || t._linkedTo) return;
        const d = new Date(t.date);
        if(d.getFullYear()!==y || d.getMonth()!==m) return;
        (t.splits||[]).forEach(sp=>{ if(sp.subId===subId) s += Math.abs(pn(sp.amount)); });
      });
      return s;
    };
    const now = new Date();
    return suggestBudget({ nowY: now.getFullYear(), nowM: now.getMonth(), getActual, getPending });
  };

  const btnBase = {width:"100%",padding:`${S.padL}px`,borderRadius:S.radius,
    border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:S.fs,fontWeight:700,
    display:"flex",alignItems:"center",justifyContent:"flex-start",gap:10,textAlign:"left"};
  const btnCenter = {...btnBase,justifyContent:"center"};
  const inp = (extra={}) => ({width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
    borderRadius:S.radius,background:"rgba(255,255,255,0.06)",color:T.txt,
    fontSize:S.fs,fontFamily:"inherit",outline:"none",
    border:`2px solid ${T.blue}`,...extra});

  const COLORS = [T.blue,T.pos,T.neg,T.gold,"#9b59b6","#1abc9c","#e67e22","#e91e63","#00bcd4","#ff5722"];

  // ── Hauptaktionen je View (auch vom + Button genutzt) ──
  // liveRef hält die aktuellen Eingabewerte, damit die Save-Handler sie immer
  // frisch lesen — so muss der Override-Effekt NICHT pro Tastendruck neu
  // registriert werden (sonst App-weite Re-Renders → Tipp-Lag).
  const liveRef = React.useRef({});
  liveRef.current = { newName, newColor, newType, editName, editColor, editType, editPriority, selCat, catAccFilter };
  const openNewCat = () => { setNewName(""); setNewColor(T.blue); setView("newCat"); };
  const saveEditCat = () => {
    const { editName, editColor, editType, editPriority, selCat, catAccFilter } = liveRef.current;
    if(!editName.trim() || !selCat) return;
    const curGrp = (groups||[]).find(g=>g.type===selCat.type);
    const curAcc = curGrp?.accountId || catAccFilter || "";
    const newCatType = ensureGroupForCat(curAcc, editType);
    setCats(p=>p.map(c=>c.id===selCat.id
      ?{...c,name:editName.trim(),color:editColor,type:newCatType,priority:editType==="expense"?editPriority:undefined}:c));
    setView("list");
  };
  const saveNewCat = () => {
    const { newName, newColor, newType, catAccFilter } = liveRef.current;
    if(!newName.trim()) return;
    const newCatType = ensureGroupForCat(catAccFilter || "", newType);
    setCats(p=>[...p,{id:"cat-"+uid(),name:newName.trim(),
      icon:"tag",color:newColor,type:newCatType,subs:[]}]);
    setNewName(""); setView("list");
  };
  const saveNewSub = () => {
    const { newName, selCat } = liveRef.current;
    if(!newName.trim() || !selCat) return;
    setCats(p=>p.map(c=>c.id===selCat.id
      ?{...c,subs:[...(c.subs||[]),{id:"sub-"+uid(),name:newName.trim(),icon:""}]}:c));
    setNewName(""); setView("list");
  };

  // ── + Button steuert den Dialog: Tipp = Hauptaktion der aktuellen View,
  //    Wisch ← = Zurück (eine Ebene), Wisch ↓ = Abbrechen (schließen).
  //    Deps nur view + Readiness-Booleans → kein Neu-Registrieren pro Tastendruck. ──
  const newNameReady = !!newName.trim();
  const editNameReady = !!editName.trim();
  React.useEffect(() => {
    if(iconPickFor) { setMasterOverride(null); return; }
    let cfg;
    if(view==="newCat") {
      cfg = { label:"✓ Kategorie anlegen", onConfirm:saveNewCat,
        onBack:()=>setView("list"), onDismiss:onClose, disabled:!newNameReady };
    } else if(view==="newSub") {
      cfg = { label:"✓ Unterkategorie anlegen", onConfirm:saveNewSub,
        onBack:()=>setView("list"), onDismiss:onClose, disabled:!newNameReady };
    } else if(view==="editCat") {
      cfg = { label:"✓ Speichern", onConfirm:saveEditCat,
        onBack:()=>setView("list"), onDismiss:onClose, disabled:!editNameReady };
    } else {
      cfg = { label:"+ neue Kategorie", onConfirm:openNewCat,
        onBack:goBack, onDismiss:onClose };
    }
    setMasterOverride(cfg);
    return () => setMasterOverride(null);
  }, [view, newNameReady, editNameReady, iconPickFor]);

  // onBack ist hier IMMER gesetzt (entweder zur Listenansicht oder, im Root, ins
  // Mehr-Menü) — der Button zeigt also stets den Zurück-Pfeil.
  const header = (title, onBack) => (
    <MobileHeader title={title} onBack={onBack||onClose} onClose={onClose}/>
  );


  // ── Kategorie bearbeiten ──
  if(view==="editCat"&&selCat) return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column","--mob-fs":S.fs+"px"}}>
      {header(`bearbeiten: ${selCat.name}`,()=>setView("list"))}
      <div style={{flex:1,padding:S.padL,overflowY:"auto"}}>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Name</div>
        <input value={editName} onChange={e=>setEditName(e.target.value)}
          autoFocus style={{...inp(),marginBottom:S.gap}}/>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Typ</div>
        <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
          {[["expense","Ausgabe",T.neg],["income","Einnahme",T.pos]].map(([t,l,c])=>(
            <button key={t} onClick={()=>setEditType(t)}
              style={{flex:1,padding:`${S.pad}px`,borderRadius:S.radius,
                background:editType===t?c+"22":"rgba(255,255,255,0.06)",
                border:`2px solid ${editType===t?c:T.bd}`,
                color:editType===t?c:T.txt2,fontSize:S.fs,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>
        {editType==="expense" && (<>
          <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Priorität</div>
          <div style={{display:"flex",gap:S.gap/2,marginBottom:6}}>
            {PRIO_OPTS.map(([p,l,ic])=>{
              const c = p==="flex"?T.gold:p==="essential"?T.pos:T.txt2;
              const on = editPriority===p;
              return (
                <button key={p} onClick={()=>setEditPriority(p)}
                  style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                    padding:`${S.pad}px ${S.pad/2}px`,borderRadius:S.radius,
                    background:on?c+"22":"rgba(255,255,255,0.06)",
                    border:`2px solid ${on?c:T.bd}`,color:on?c:T.txt2,
                    fontSize:S.fs-4,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {Li(ic,S.fs-8,on?c:T.txt2)} {l}
                </button>
              );
            })}
          </div>
          <div style={{color:T.txt2,fontSize:S.fs-8,marginBottom:S.gap*1.2,lineHeight:1.4}}>
            Bei einer Schieflage werden flexible Posten zuerst als Kürz-Vorschlag gezeigt, essentielle zuletzt.
          </div>
        </>)}
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Farbe</div>
        <div style={{display:"flex",gap:S.gap/2,flexWrap:"wrap",marginBottom:S.gap*1.5}}>
          {COLORS.map(c=>(
            <div key={c} onClick={()=>setEditColor(c)}
              style={{width:44,height:44,borderRadius:S.radius/2,background:c,
                cursor:"pointer",border:`3px solid ${editColor===c?"#fff":"transparent"}`,flexShrink:0}}/>
          ))}
        </div>
        <button onClick={saveEditCat}
          style={{...btnCenter,background:editName.trim()?T.blue:"rgba(255,255,255,0.1)",
          color:editName.trim()?"#fff":T.txt2,marginBottom:S.gap}}>
          ✓ Speichern
        </button>
        <button onClick={()=>{
          if(window.confirm(`"${selCat.name}" wirklich löschen?`)) {
            setCats(p=>p.filter(c=>c.id!==selCat.id));
            setView("list");
          }
        }} style={{...btnCenter,background:"transparent",
          border:`1.5px solid ${T.neg}44`,color:T.neg,fontWeight:400}}>
          {Li("trash-2",S.fs-4,T.neg)} Kategorie löschen
        </button>
      </div>
    </div>
  );

  // ── Neue Kategorie ──
  if(view==="newCat") return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column","--mob-fs":S.fs+"px"}}>
      {header("neue Kategorie",()=>setView("list"))}
      <div style={{flex:1,padding:S.padL,overflowY:"auto"}}>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Name</div>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          placeholder="z.B. Freizeit" autoFocus style={{...inp(),marginBottom:S.gap}}/>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Typ</div>
        <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
          {[["expense","Ausgabe",T.neg],["income","Einnahme",T.pos]].map(([t,l,c])=>(
            <button key={t} onClick={()=>setNewType(t)}
              style={{flex:1,padding:`${S.pad}px`,borderRadius:S.radius,
                background:newType===t?c+"22":"rgba(255,255,255,0.06)",
                border:`2px solid ${newType===t?c:T.bd}`,
                color:newType===t?c:T.txt2,fontSize:S.fs,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Farbe</div>
        <div style={{display:"flex",gap:S.gap/2,flexWrap:"wrap",marginBottom:S.gap*1.5}}>
          {COLORS.map(c=>(
            <div key={c} onClick={()=>setNewColor(c)}
              style={{width:44,height:44,borderRadius:S.radius/2,background:c,
                cursor:"pointer",border:`3px solid ${newColor===c?"#fff":"transparent"}`,flexShrink:0}}/>
          ))}
        </div>
        <button onClick={saveNewCat}
          style={{...btnCenter,background:newName.trim()?T.pos:"rgba(255,255,255,0.1)",
          color:newName.trim()?"#fff":T.txt2}}>
          ✓ Kategorie anlegen
        </button>
      </div>
    </div>
  );

  // ── Neue Unterkategorie ──
  if(view==="newSub"&&selCat) return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column","--mob-fs":S.fs+"px"}}>
      {header(`neue Unterkategorie`,()=>setView("list"))}
      <div style={{flex:1,padding:S.padL,overflowY:"auto"}}>
        <div style={{color:T.txt2,fontSize:S.fs-6,marginBottom:S.gap,
          display:"flex",alignItems:"center",gap:8}}>
          {Li(selCat.icon||"tag",S.fs,selCat.color||T.blue)}
          <span style={{color:selCat.color||T.blue,fontWeight:700}}>{selCat.name}</span>
        </div>
        <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Name</div>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          placeholder="z.B. Restaurant" autoFocus style={{...inp(),marginBottom:S.gap}}/>
        <button onClick={saveNewSub}
          style={{...btnCenter,background:newName.trim()?T.pos:"rgba(255,255,255,0.1)",
          color:newName.trim()?"#fff":T.txt2}}>
          ✓ Unterkategorie anlegen
        </button>
      </div>
    </div>
  );

  // ── Hauptliste ──
  return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column","--mob-fs":S.fs+"px"}}>
      {header("Kategorien & Budget",goBack)}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",touchAction:"pan-y",WebkitOverflowScrolling:"touch",
        padding:`${S.gap}px ${S.pad}px ${S.padL}px`}}>

        <button onClick={openNewCat}
          style={{...btnCenter,background:"rgba(74,159,212,0.1)",
            border:`2px dashed ${T.blue}`,color:T.blue,marginBottom:S.gap}}>
          {Li("plus",S.fs,T.blue)} neue Kategorie
        </button>

        {onKonten&&<button onClick={onKonten}
          style={{...btnCenter,background:"rgba(255,255,255,0.04)",
            border:`1px solid ${T.bd}`,color:T.txt2,marginBottom:S.gap}}>
          {Li("credit-card",S.fs-4,T.txt2)} Konten verwalten
        </button>}

        {/* Hinweis: Symbole und Farben können durch Antippen geändert werden */}

        {/* Konto-Filter — gemeinsame AccountChips (Vormerken-Stil) inkl. „Alle" */}
        {accounts.length>1 && (
          <div style={{marginBottom:S.gap, paddingBottom:S.gap, borderBottom:`1px solid ${T.bd}`}}>
            <AccountChips accounts={accounts} value={catAccFilter} onChange={setCatAccFilter} allowAll={true} S={S}/>
          </div>
        )}

        {/* Kategorien von anderem Konto übernehmen — wenn ein bestimmtes Konto gewählt ist */}
        {catAccFilter && (()=>{
          const srcAccs = accounts.filter(a => a.id!==catAccFilter && groups.some(g=>(g.accountId||"")===a.id));
          if(!srcAccs.length) return null;
          if(!copySrcOpen) return (
            <button onClick={()=>setCopySrcOpen(true)}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                padding:`${S.pad}px ${S.padL}px`,borderRadius:S.radius,
                background:"rgba(255,255,255,0.04)",border:`1.5px dashed ${T.bds}`,
                color:T.txt2,marginBottom:S.gap,fontWeight:600,fontSize:S.fs-2,cursor:"pointer",fontFamily:"inherit"}}>
              {Li("copy",S.fs-4,T.txt2)} Kategorien von anderem Konto übernehmen
            </button>
          );
          return (
            <div style={{border:`1px solid ${T.bd}`,borderRadius:S.radius,padding:S.pad,marginBottom:S.gap}}>
              <div style={{color:T.txt2,fontSize:S.fs-6,fontWeight:700,marginBottom:6}}>Von welchem Konto übernehmen?</div>
              {srcAccs.map(a=>(
                <button key={a.id} onClick={()=>copyCatsToAccount(catAccFilter, a.id)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",marginBottom:4,
                    borderRadius:S.radius/2,border:`1px solid ${T.bd}`,background:"rgba(255,255,255,0.04)",
                    color:T.txt,cursor:"pointer",fontSize:S.fs-4,fontFamily:"inherit"}}>
                  {Li(a.icon||"landmark",S.fs-4,a.color||T.blue)}
                  <span style={{flex:1,textAlign:"left"}}>{a.name}</span>
                </button>
              ))}
              <button onClick={()=>setCopySrcOpen(false)}
                style={{background:"none",border:"none",color:T.txt2,fontSize:S.fs-8,cursor:"pointer",marginTop:2,fontFamily:"inherit"}}>abbrechen</button>
            </div>
          );
        })()}

        {/* Kategorie-Zuordnungen anzeigen */}
        <button onClick={()=>{
          // Vorschau: alle automatisch erkennbaren Vendor → Kat-Zuordnungen
          const detected = {};
          (txs||[]).forEach(t => {
            const split = (t.splits||[])[0];
            if(!split?.catId) return;
            const desc = (t.desc||"").replace(/\{[^}]{0,300}\}/g,"").trim();
            const vendor = desc.split("·")[0].split("–")[0].split(" · ")[0].trim().slice(0,40).toLowerCase();
            if(vendor.length>2) {
              detected[vendor] = detected[vendor] || {catId:split.catId, subId:split.subId||"", count:0};
              detected[vendor].count++;
            }
          });
          const total = Object.keys(detected).length;
          const existing = Object.keys(csvRules||{}).length;
          // Anzahl die neu wären
          const newOnes = Object.keys(detected).filter(v=>!csvRules[v]).length;
          const changed = Object.keys(detected).filter(v=>{
            const e = csvRules[v];
            return e && (e.catId !== detected[v].catId || (e.subId||"") !== (detected[v].subId||""));
          }).length;
          if(window.confirm(
            `Aus ${(txs||[]).length} Buchungen erkannt: ${total} Händler-Zuordnungen.\n\n` +
            `Bestehende Regeln: ${existing}\n` +
            `Neu hinzufügen: ${newOnes}\n` +
            `Geänderte Regeln: ${changed}\n\n` +
            `Fortfahren? (Bestehende Regeln werden überschrieben)`
          )) {
            const newRules = {};
            Object.entries(detected).forEach(([v, d]) => {
              newRules[v] = {catId:d.catId, subId:d.subId};
            });
            setCsvRules(p => ({...p, ...newRules}));
            showToast(`✓ ${newOnes} neu, ${changed} aktualisiert`);
          }
        }} style={{...btnCenter,background:"rgba(74,159,212,0.06)",
          border:`1.5px dashed ${T.blue}66`,color:T.blue,marginBottom:S.gap,fontWeight:600,fontSize:S.fs-2}}>
          {Li("refresh-cw",S.fs-4,T.blue)} Zuordnungen aus Buchungen prüfen
        </button>

        {/* Toast */}
        {toast && (
          <div style={{padding:`${S.pad}px ${S.padL}px`,marginBottom:S.gap,
            background:T.pos+"22",border:`1px solid ${T.pos}`,borderRadius:S.radius,
            color:T.pos,fontSize:S.fs-4,fontWeight:600,textAlign:"center"}}>
            {toast}
          </div>
        )}

        {cats.filter(c=>{
          if(catAccFilter===null) return true;
          const grp = groups.find(g=>g.type===c.type);
          const grpAccId = grp?.accountId || "";
          // Strikt: nur Kategorien deren Gruppe zum gewählten Konto gehört
          return grpAccId === catAccFilter;
        }).map(cat=>(
          <div key={cat.id} style={{marginBottom:S.gap/2}}>

            {/* Kategorie-Header */}
            <div style={{display:"flex",alignItems:"center",gap:8,
              padding:"4px 10px",borderRadius:S.radius/2,
              background:cat.color+"18",
              border:`2px solid ${cat.color}44`,
              marginBottom:2}}>
              {/* Icon — antippen öffnet Icon-Picker (mit Farb-Picker integriert) */}
              <button onClick={()=>setIconPickFor({type:"cat", id:cat.id})}
                style={{width:38,height:38,minWidth:38,minHeight:38,maxWidth:38,maxHeight:38,
                aspectRatio:"1 / 1",boxSizing:"border-box",borderRadius:6,
                background:cat.color+"33",border:`1.5px solid ${cat.color}66`,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                cursor:"pointer",fontFamily:"inherit",padding:0,lineHeight:0}}>
                {cat.icon ? Li(cat.icon,S.fs-2,cat.color||T.blue) : null}
              </button>
              <span style={{flex:1,minWidth:0,color:T.txt,fontSize:S.fs,fontWeight:700,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat.name}</span>
              {(()=>{
                const grp = (groups||[]).find(g=>g.type===cat.type);
                const isInc = (grp?.behavior || cat.type)==="income";
                return (
                  <span style={{color:isInc?T.pos:T.neg,fontSize:S.fs,fontWeight:800,
                    flexShrink:0,lineHeight:1,padding:"0 2px"}}>
                    {isInc ? "+" : "−"}
                  </span>
                );
              })()}
              <button onClick={()=>{
                const grp = (groups||[]).find(g=>g.type===cat.type);
                const beh = grp?.behavior || cat.type;
                setSelCat(cat);
                setEditName(cat.name);
                setEditColor(cat.color||T.blue);
                setEditType(beh==="income" ? "income" : "expense");
                setEditPriority(cat.priority||"normal");
                setView("editCat");
              }} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bd}`,
                borderRadius:S.radius/2,color:T.txt2,cursor:"pointer",
                width:38,height:38,minWidth:38,minHeight:38,padding:0,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {Li("edit-2",S.fs-6,T.txt2)}
              </button>
            </div>

            {/* Unterkategorien mit Budget */}
            {(cat.subs||[]).map(sub=>{
              const pad2 = n=>String(n).padStart(2,"0");
              const initPrefix = `${year}-${pad2(month+1)}-`;
              // getBudgetForMonth gibt bereits Mitte+Ende zurück
              const curGesamt = getBudgetForMonth(sub.id, year, month);
              // Mitte separat aus txs
              const curMitte = txs.filter(t=>t.pending&&t._budgetSubId===sub.id+"_mitte"&&t.date.startsWith(initPrefix))
                .reduce((s,t)=>s+Math.abs(t.totalAmount),0);
              const curE = curGesamt - curMitte; // Ende = Gesamt - Mitte
              const editing = !!budgetOpen[sub.id];
              // Budget-Vorschlag (inkl. erkanntem Rhythmus) nur für den GEÖFFNETEN Sub.
              const sug = editing ? calcSuggestion(sub.id) : null;
              const scope = budgetScope[sub.id]||"month";
              const eKey = sub.id;
              const mKey = sub.id+"_mitte";
              const gVal = budgetEdits[sub.id+"_G"];
              const mVal = budgetEdits[sub.id+"_M"];
              const amtM = mVal ? pn(mVal.replace(",",".")) : curMitte;
              const amtG = gVal ? pn(gVal.replace(",",".")) : curGesamt;
              const amtE = Math.max(0, amtG - amtM);
              const isRenamingSub = !!budgetOpen[sub.id+"_rename"];

              // Rhythmus: manuelle Wahl > bestehendes Budget > erkannter Vorschlag > monatlich.
              const rhythm = budgetRhythm[sub.id] || budgets[sub.id]?.months || sug?.interval || 1;
              const doSaveBudget = () => {
                const acc = accounts?.[0];
                const pfx = `${year}-${pad2(month+1)}-`;
                if(scope==="single") {
                  setTxs(p=>{
                    const rest = p.filter(t=>!(t.pending&&(t._budgetSubId===eKey||t._budgetSubId===mKey)&&t.date.startsWith(pfx)));
                    const add=[];
                    if(amtE>0) add.push({id:uid(),date:`${year}-${pad2(month+1)}-28`,
                      desc:sub.name,totalAmount:amtE,pending:true,_budgetSubId:eKey,
                      accountId:acc?.id||"",splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtE}],_csvType:"expense"});
                    if(amtM>0) add.push({id:uid(),date:`${year}-${pad2(month+1)}-14`,
                      desc:sub.name,totalAmount:amtM,pending:true,_budgetSubId:mKey,
                      accountId:acc?.id||"",splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtM}],_csvType:"expense"});
                    return [...rest,...add];
                  });
                } else {
                  // "from" oder "all": Platzhalter neu generieren ab startMonat
                  const startY=year, startM=month;
                  const endY=startY+6, endMo=11;
                  const totalMos=(endY-startY)*12+(endMo-startM)+1;
                  const n=Math.ceil(totalMos/rhythm);
                  const newP=[];
                  for(let i=0;i<n;i++){
                    const tm=i*rhythm, mo=(startM+tm)%12, y=startY+Math.floor((startM+tm)/12);
                    if(y>endY||(y===endY&&mo>endMo)) break;
                    const maxD=new Date(y,mo+1,0).getDate();
                    const day=String(Math.min(28,maxD)).padStart(2,"0");
                    if(amtE>0) newP.push({id:uid(),date:`${y}-${pad2(mo+1)}-${day}`,
                      desc:sub.name,totalAmount:amtE,pending:true,_budgetSubId:eKey,
                      accountId:acc?.id||"",splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtE}],_csvType:"expense"});
                    if(amtM>0) newP.push({id:uid(),date:`${y}-${pad2(mo+1)}-14`,
                      desc:sub.name,totalAmount:amtM,pending:true,_budgetSubId:mKey,
                      accountId:acc?.id||"",splits:[{id:uid(),catId:cat.id,subId:sub.id,amount:amtM}],_csvType:"expense"});
                  }
                  if(scope==="from") {
                    const fromIso=`${year}-${pad2(month+1)}-01`;
                    setTxs(p=>[...p.filter(t=>!t.pending||(t._budgetSubId!==eKey&&t._budgetSubId!==mKey)||t.date<fromIso),...newP]);
                  } else {
                    setTxs(p=>[...p.filter(t=>!t.pending||(t._budgetSubId!==eKey&&t._budgetSubId!==mKey)),...newP]);
                  }
                  setBudgets(p=>({...p,[eKey]:{amount:amtE,months:rhythm},
                    ...(amtM>0?{[mKey]:{amount:amtM,months:rhythm}}:{})}));
                }
                setBudgetOpen(p=>({...p,[sub.id]:false}));
                setBudgetEdits(p=>{const n={...p};delete n[sub.id+"_G"];delete n[sub.id+"_M"];return n;});
              };

              const doDeleteBudget = () => {
                if(!window.confirm("Budget löschen?")) return;
                setBudgets(p=>{const n={...p};delete n[eKey];delete n[mKey];return n;});
                setTxs(p=>p.filter(t=>t._budgetSubId!==eKey&&t._budgetSubId!==mKey));
                setBudgetOpen(p=>({...p,[sub.id]:false}));
              };

              return (
                <div key={sub.id} style={{marginLeft:S.pad,marginBottom:4,
                  borderRadius:S.radius,background:"rgba(255,255,255,0.03)",
                  border:`1px solid ${T.bd}`,overflow:"hidden"}}>

                  {/* Sub-Zeile */}
                  <div style={{display:"flex",alignItems:"center",
                    padding:"2px 10px",gap:8}}>
                    {/* Icon — antippen öffnet Icon-Picker (mit Farb-Picker integriert) */}
                    <button onClick={()=>setIconPickFor({type:"sub", id:sub.id})}
                      style={{width:30,height:30,minWidth:30,minHeight:30,maxWidth:30,maxHeight:30,
                      aspectRatio:"1 / 1",boxSizing:"border-box",borderRadius:5,
                      background:(sub.color||cat.color)+"22",
                      border:`1px solid ${(sub.color||cat.color)}55`,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                      cursor:"pointer",fontFamily:"inherit",padding:0,lineHeight:0}}>
                      {sub.icon ? Li(sub.icon,S.fs-6,sub.color||cat.color||T.blue) : null}
                    </button>
                    {/* Name – Klick zeigt Rahmen + Lösch-Button */}
                    <SubNameField sub={sub} cat={cat} setCats={setCats} S={S} T={T} />
                    {/* Budget-Anzeige */}
                    {curGesamt>0&&!editing&&(
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{color:T.gold,fontSize:S.fs-4,fontWeight:700}}>{fmt(curGesamt)}</div>
                        {curMitte>0&&<div style={{color:T.txt2,fontSize:S.fs-8}}>Mitte: {fmt(curMitte)}</div>}
                      </div>
                    )}
                    {/* Budget öffnen/schließen – Pfeil wenn offen, Zielscheibe wenn zu */}
                    <button onClick={()=>{
                      const next=!editing;
                      setBudgetOpen(p=>({...p,[sub.id]:next}));
                      if(next) setBudgetEdits(p=>({...p,
                        [sub.id+"_G"]:curGesamt?String(curGesamt).replace(".",","):"",
                        [sub.id+"_M"]:curMitte?String(curMitte).replace(".",","):""}));
                    }} style={{background:"none",border:"none",
                      color:editing?T.gold:T.txt2,
                      cursor:"pointer",padding:0,fontFamily:"inherit",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      flexShrink:0,lineHeight:0}}>
                      {editing ? Li("arrow-left",S.fs-4,T.gold) : Li("target",S.fs-4,T.gold)}
                    </button>
                  </div>

                  {/* Budget-Editor */}
                  {editing&&(
                    <div style={{padding:`0 ${S.pad}px ${S.pad}px`,borderTop:`1px solid ${T.bd}`}}>
                      <div style={{color:T.txt2,fontSize:S.fs-6,margin:`${S.gap/2}px 0 4px`}}>
                        Budget {MONTHS[month]} {year}
                      </div>
                      {/* Realitätsnaher Vorschlag aus Ist-Historie + Vormerkungen,
                          inkl. erkanntem Rhythmus (z. B. Rundfunkbeitrag quartalsweise) */}
                      {(()=>{
                        if(!sug) return null;
                        const sugAmt = Math.round(sug.intervalAmount);
                        if(!(sug.hasData && sugAmt>0)) return null;
                        const RL = {1:"monatlich",3:"quartalsweise",6:"halbjährlich",12:"jährlich"}[sug.interval];
                        return (
                          <div onClick={()=>{
                            setBudgetEdits(p=>({...p,[sub.id+"_G"]:String(sugAmt).replace(".",","),[sub.id+"_M"]:""}));
                            setBudgetRhythm(p=>({...p,[sub.id]:sug.interval}));
                          }}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                              marginBottom:8,borderRadius:12,border:`1px solid ${T.blue}55`,
                              background:"rgba(74,159,212,0.10)",cursor:"pointer"}}>
                            {Li("bar-chart-2",18,T.blue)}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:14,color:T.txt2}}>Vorschlag</span>
                                <b style={{fontSize:18,color:T.blue,fontFamily:NUM_FONT}}>{fmt(sugAmt)} €</b>
                                <span style={{fontSize:13,color:T.txt2}}>· {RL}</span>
                              </div>
                              <div style={{color:T.txt2,fontSize:11.5,marginTop:2}}>
                                Ø aus {sug.months} Mon. · {sug.actualMonths} gebucht · {sug.pendingMonths} geplant
                              </div>
                            </div>
                            <span style={{color:T.blue,fontSize:13,fontWeight:800,flexShrink:0}}>übernehmen</span>
                          </div>
                        );
                      })()}
                      {/* Mitte / Gesamt */}
                      <div style={{display:"flex",gap:S.gap,marginBottom:4}}>
                        <div style={{flex:1}}>
                          <div style={{color:T.txt2,fontSize:S.fs-8,marginBottom:3}}>Mitte (bis 14.)</div>
                          <input type="text" inputMode="decimal"
                            value={budgetEdits[sub.id+"_M"]||""}
                            onChange={e=>setBudgetEdits(p=>({...p,[sub.id+"_M"]:e.target.value.replace(/[^0-9,.]/g,"")}))}
                            placeholder="0,00"
                            style={{...inp({fontWeight:700,textAlign:"right",fontFamily:NUM_FONT,marginBottom:0})}}/>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{color:T.txt2,fontSize:S.fs-8,marginBottom:3}}>Gesamt</div>
                          <input type="text" inputMode="decimal"
                            value={budgetEdits[sub.id+"_G"]||""}
                            onChange={e=>setBudgetEdits(p=>({...p,[sub.id+"_G"]:e.target.value.replace(/[^0-9,.]/g,"")}))}
                            placeholder="0,00"
                            style={{...inp({fontWeight:700,textAlign:"right",fontFamily:NUM_FONT,marginBottom:0})}}/>
                        </div>
                      </div>
                      {amtG>0&&<div style={{color:T.txt2,fontSize:S.fs-8,marginBottom:S.gap/2,textAlign:"right"}}>
                        2. Hälfte: {fmt(amtE)}
                      </div>}
                      {/* Rhythmus */}
                      <div style={{display:"flex",gap:4,marginBottom:S.gap/2}}>
                        {[[1,"monatl."],[3,"quartalsw."],[6,"halbjährl."],[12,"jährlich"]].map(([v,l])=>(
                          <button key={v} onClick={()=>setBudgetRhythm(p=>({...p,[sub.id]:v}))}
                            style={{flex:1,padding:"6px 2px",borderRadius:8,border:"none",
                              cursor:"pointer",fontFamily:"inherit",fontSize:S.fs-10,fontWeight:700,
                              background:rhythm===v?T.gold+"33":"rgba(255,255,255,0.08)",
                              color:rhythm===v?T.gold:T.txt2}}>
                            {l}
                          </button>
                        ))}
                      </div>
                      {/* Scope */}
                      <div style={{display:"flex",gap:4,marginBottom:S.gap/2}}>
                        {[["month","nur "+MONTHS[month]],["from","ab "+MONTHS[month]],["all","immer"]].map(([v,l])=>(
                          <button key={v} onClick={()=>setBudgetScope(p=>({...p,[sub.id]:v}))}
                            style={{flex:1,padding:"6px 2px",borderRadius:8,border:"none",
                              cursor:"pointer",fontFamily:"inherit",fontSize:S.fs-8,fontWeight:700,
                              background:scope===v?T.blue:"rgba(255,255,255,0.08)",
                              color:scope===v?"#fff":T.txt2}}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:S.gap/2}}>
                        <button onClick={doSaveBudget}
                          style={{flex:1,...btnCenter,background:amtG>0?T.pos:"rgba(255,255,255,0.1)",
                            color:amtG>0?"#fff":T.txt2,padding:`${S.pad}px`}}>
                          ✓ Budget setzen
                        </button>
                        {(curGesamt>0||curMitte>0)&&(
                          <button onClick={doDeleteBudget}
                            style={{padding:`${S.pad}px ${S.padL}px`,borderRadius:S.radius,
                              border:`1px solid ${T.neg}44`,background:`${T.neg}11`,
                              color:T.neg,cursor:"pointer",fontFamily:"inherit",fontSize:S.fs-4}}>
                            {Li("trash-2",S.fs-6,T.neg)}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Neue Unterkategorie */}
            <button onClick={()=>{setSelCat(cat);setNewName("");setView("newSub");}}
              style={{...btnBase,marginLeft:S.padL,width:`calc(100% - ${S.padL}px)`,
                background:"rgba(255,255,255,0.02)",
                border:`1px dashed ${T.bd}`,color:T.txt2,fontWeight:400,
                fontSize:S.fs-6,padding:"3px 10px",marginTop:2}}>
              {Li("plus",S.fs-8,T.txt2)} Unterkategorie hinzufügen
            </button>
          </div>
        ))}
        <div style={{height:40}}/>
      </div>
      {/* Icon-Picker Dialog (mit Farb-Picker und Bereich „bereits verwendet") */}
      {iconPickFor && (() => {
        const target = iconPickFor.type==="cat"
          ? cats.find(c=>c.id===iconPickFor.id)
          : cats.flatMap(c=>(c.subs||[])).find(s=>s.id===iconPickFor.id);
        if(!target) return null;
        const parentCat = iconPickFor.type==="sub"
          ? cats.find(c => (c.subs||[]).some(s=>s.id===iconPickFor.id))
          : null;
        const color = target.color || parentCat?.color || T.blue;
        return (
          <IconPickerDialog
            selectedIcon={target.icon||""}
            selectedColor={color}
            showUsed={true}
            onSelect={(ic)=>{
              if(iconPickFor.type==="cat") updateCat(iconPickFor.id, "icon", ic);
              else updateSub(iconPickFor.id, "icon", ic);
            }}
            onSelectColor={(col)=>{
              if(iconPickFor.type==="cat") updateCat(iconPickFor.id, "color", col);
              else updateSub(iconPickFor.id, "color", col);
            }}
            onClose={()=>setIconPickFor(null)}
          />
        );
      })()}
    </div>
  );
}

export { MobileKategorienModal };
