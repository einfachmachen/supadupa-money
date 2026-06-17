// Auto-generated module (siehe app-src.jsx)

import React, { createElement, useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { INP } from "../../theme/palette.js";
import { THEMES } from "../../theme/themes.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { exportEbForSync, importEbFromSync } from "../../utils/enableBankingStore.js";
import { encryptJSON, decryptJSON, isEncrypted } from "../../utils/syncCrypto.js";
import { useEffect } from "react";

function DataManagerDialog({onClose, onBack, mobileMode=false}) {
  const { cats, groups, accounts, txs, setTxs, csvRules, startBalances,
    setStartBalances, setCats, setGroups, setAccounts, setCsvRules,
    yearData, setYearData, col3Name, setCol3Name,
    quickBtns, setQuickBtns, quickColors, setQuickColors,
    budgets, setBudgets, customIcons, setCustomIcons } = useContext(AppCtx);

  const MONTHS_G=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const today = new Date();
  const [tab, setTab] = useState("export"); // export | import | delete

  // Voller Zeitraum als Standard: vom frühesten bis zum spätesten Buchungsdatum.
  // So enthält ein Export mit allen Haken wirklich ALLE Buchungen (inkl. alter
  // und zukünftiger/Vormerkungen) — identisch zum Worker-zu-Worker-Weg.
  const _allDates = (txs||[]).map(t=>t.date).filter(Boolean).sort();
  const _minD = _allDates[0] || null;
  const _maxD = _allDates[_allDates.length-1] || null;
  const fullFromY = _minD ? Number(_minD.slice(0,4)) : today.getFullYear();
  const fullFromM = _minD ? Number(_minD.slice(5,7))-1 : 0;
  const fullToY   = _maxD ? Number(_maxD.slice(0,4)) : today.getFullYear();
  const fullToM   = _maxD ? Number(_maxD.slice(5,7))-1 : today.getMonth();

  // Zeitraum
  const [fromY, setFromY] = useState(fullFromY);
  const [fromM, setFromM] = useState(fullFromM);
  const [toY,   setToY]   = useState(fullToY);
  const [toM,   setToM]   = useState(fullToM);

  // Export-Auswahl — Standard: ALLES an (= 100 %-Sicherung).
  const [sel, setSel] = useState({
    cats:true, groups:true, accounts:true,
    realTxs:true, pendTxs:true, rules:true, anchors:true,
    yearData:true, budgets:true, icons:true, quick:true, themes:true,
  });
  const toggleSel = k => setSel(p=>({...p,[k]:!p[k]}));

  // Import
  const [importJson, setImportJson] = useState("");
  const [importErr,  setImportErr]  = useState("");
  const [importOk,   setImportOk]   = useState("");

  // Bank-Schlüssel (.pem): optionaler, passphrase-verschlüsselter Export.
  const [hasEbKey, setHasEbKey] = useState(false);
  const [inclEbKey, setInclEbKey] = useState(false);
  const [ebPass, setEbPass] = useState("");
  const [showEbPass, setShowEbPass] = useState(false);
  const [importEbPass, setImportEbPass] = useState("");
  useEffect(() => { exportEbForSync().then(b => setHasEbKey(!!b)).catch(()=>{}); }, []);

  // Delete confirm
  const [delConfirm, setDelConfirm] = useState(null); // null | key
  // Konto-Filter für Löschen/Export — null = alle Konten
  const [delAcc, setDelAcc] = useState(null);

  const fromIso = `${fromY}-${String(fromM+1).padStart(2,"0")}-01`;
  const toIso   = `${toY}-${String(toM+1).padStart(2,"0")}-31`;

  // Konto-Match: null = alle. Bei "acc-giro" auch tx ohne accountId (Legacy).
  const accMatch = (t) => {
    if(!delAcc) return true;
    const a = t.accountId || "acc-giro";
    return a === delAcc;
  };
  const filterTxs = (list) => list.filter(t=>{
    if(!t.date) return false;
    if(!accMatch(t)) return false;
    return t.date>=fromIso && t.date<=toIso;
  });

  // ── Export ──────────────────────────────────────────────────────────
  // Vollständig, wenn ALLE Haken aktiv UND der volle Zeitraum gewählt ist UND —
  // falls ein Bank-Schlüssel existiert — dieser (verschlüsselt) mit dabei ist.
  const isFullRange = fromY===fullFromY && fromM===fullFromM && toY===fullToY && toM===fullToM;
  const ebOk = !hasEbKey || (inclEbKey && !!ebPass);
  const isComplete = sel.cats&&sel.groups&&sel.accounts&&sel.realTxs&&sel.pendTxs&&
    sel.rules&&sel.anchors&&sel.yearData&&sel.budgets&&sel.icons&&sel.quick&&sel.themes&&isFullRange&&ebOk;

  const buildExport = () => {
    const out = {exportedAt: new Date().toISOString(), app:"SupaDupa Money",
      _type:"supadupa-backup", _complete:isComplete};
    if(sel.cats)   { out.cats = cats; out.groups = groups; }   // Kategorien & Gruppen gehören zusammen
    if(sel.accounts) out.accounts = accounts;
    if(sel.realTxs) out.realTxs = filterTxs(txs.filter(t=>!t.pending));
    if(sel.pendTxs) out.pendTxs = filterTxs(txs.filter(t=>t.pending));
    if(sel.rules)   out.csvRules = csvRules;
    if(sel.anchors) out.startBalances = startBalances;
    if(sel.yearData) out.yearData = yearData;
    if(sel.budgets)  out.budgets = budgets;
    if(sel.icons)    out.customIcons = customIcons;
    if(sel.quick)   { out.quickBtns = quickBtns; out.quickColors = quickColors; out.col3Name = col3Name; }
    if(sel.themes) {
      try { out.customThemes = JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}"); } catch{}
    }
    return out;
  };

  // Hängt den passphrase-verschlüsselten Bank-Schlüssel an, falls gewählt. Der
  // Schlüssel landet NUR als AES-GCM-Chiffrat in der Datei — ohne die Passphrase
  // nicht wieder importierbar.
  const buildExportFull = async () => {
    const out = buildExport();
    if(inclEbKey && ebPass && hasEbKey) {
      try {
        const block = await exportEbForSync();
        if(block) { out._ebSecure = await encryptJSON(block, ebPass); out._ebEnc = true; }
      } catch(e) { /* Schlüssel weglassen statt Export zu verhindern */ }
    }
    return out;
  };

  const doExport = async () => {
    const data = await buildExportFull();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`supadupa-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const copyExport = async () => {
    navigator.clipboard.writeText(JSON.stringify(await buildExportFull(), null, 2));
  };

  // Zähler
  const cntReal  = filterTxs(txs.filter(t=>!t.pending)).length;
  const cntPend  = filterTxs(txs.filter(t=>t.pending)).length;
  const cntRules = Object.keys(csvRules||{}).length;
  const cntAnch  = Object.values(startBalances||{}).reduce((s,y)=>s+Object.keys(y||{}).filter(k=>!isNaN(k)).length,0);
  const cntYears = Object.keys(yearData||{}).length;
  const cntBudg  = Object.keys(budgets||{}).length;
  const cntIcons = (customIcons||[]).length;
  const cntQuick = (quickBtns||[]).length;

  // ── Import ──────────────────────────────────────────────────────────
  const doImport = async () => {
    setImportErr(""); setImportOk("");
    try {
      const d = JSON.parse(importJson);
      let msg = [];
      // Stammdaten werden ERSETZT …
      if(d.cats)    { setCats(d.cats);    msg.push(`${d.cats.length} Kategorien`); }
      if(d.groups)  { setGroups(d.groups);msg.push(`${d.groups.length} Gruppen`); }
      if(d.accounts){ setAccounts(d.accounts); msg.push(`${d.accounts.length} Konten`); }
      if(d.csvRules){ setCsvRules(d.csvRules); msg.push(`${Object.keys(d.csvRules).length} Zuordnungen`); }
      if(d.startBalances){ setStartBalances(d.startBalances); msg.push("Ankerpunkte"); }
      if(d.budgets){ setBudgets(d.budgets); msg.push(`${Object.keys(d.budgets).length} Budgets`); }
      if(d.yearData){ setYearData(d.yearData); msg.push("Monatsdaten"); }
      if(d.col3Name){ setCol3Name(d.col3Name); }
      if(Array.isArray(d.quickBtns)){ setQuickBtns(d.quickBtns); msg.push("Schnellwahl"); }
      if(Array.isArray(d.quickColors)){ setQuickColors(d.quickColors); }
      if(Array.isArray(d.customIcons)){ setCustomIcons(d.customIcons); msg.push(`${d.customIcons.length} Icons`); }
      // … Buchungen werden ERGÄNZT (Duplikate per id übersprungen). Akzeptiert
      // sowohl das Daten-Manager-Format (realTxs/pendTxs) als auch ein
      // Voll-Backup/Cloud-Format (txs).
      const toAdd = [...(d.realTxs||[]), ...(d.pendTxs||[]), ...(Array.isArray(d.txs)?d.txs:[])];
      if(toAdd.length) {
        setTxs(prev=>{
          const ids = new Set(prev.map(t=>t.id));
          return [...prev, ...toAdd.filter(t=>!ids.has(t.id))];
        });
        msg.push(`${toAdd.length} Buchungen`);
      }
      if(d.customThemes && typeof d.customThemes === "object") {
        const existing = JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}");
        const merged = {...existing, ...d.customThemes};
        kvStore.setItem("mbt_custom_themes", JSON.stringify(merged));
        // inject into THEMES live
        Object.entries(d.customThemes).forEach(([k,v]) => { THEMES[k] = v; });
        msg.push(`${Object.keys(d.customThemes).length} Themes`);
      }
      // Verschlüsselter Bank-Schlüssel: nur mit korrekter Passphrase. Wird nur
      // übernommen, wenn dieses Gerät noch keinen Schlüssel hat (lokaler Vorrang).
      if(d._ebSecure) {
        if(isEncrypted(d._ebSecure)) {
          if(!importEbPass) {
            msg.push("Bank-Schlüssel übersprungen (Passphrase fehlt)");
          } else {
            let block;
            try { block = await decryptJSON(d._ebSecure, importEbPass); }
            catch(e) { setImportErr("Bank-Schlüssel: Passphrase falsch oder Daten beschädigt"); return; }
            const ok = await importEbFromSync(block);
            msg.push(ok ? "Bank-Schlüssel" : "Bank-Schlüssel (lokal bereits vorhanden, beibehalten)");
          }
        } else {
          const ok = await importEbFromSync(d._ebSecure);
          if(ok) msg.push("Bank-Schlüssel");
        }
      }
      setImportOk("✓ Importiert: "+msg.join(", "));
      setImportJson("");
    } catch(e) {
      setImportErr("Ungültiges JSON: "+e.message);
    }
  };

  // ── Auto-Backup vor jeder Lösch-Aktion ──────────────────────────────
  // Lädt den kompletten localStorage-Snapshot als JSON-Download.
  // So kann der User bei Fehlbedienung den vorherigen Zustand wiederherstellen.
  const triggerAutoBackup = () => {
    try {
      const data = kvStore.getItem("finanzapp_v9");
      if(!data) return;
      const blob = new Blob([data], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "supadupa-autobackup-" + new Date().toISOString().slice(0,16).replace(/[:T]/g,"-") + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // URL.revokeObjectURL nach kurzer Verzögerung
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    } catch(e) {
      console.error("Auto-Backup fehlgeschlagen:", e);
    }
  };

  // Wrapper: vor jeder Lösch-Aktion erst Auto-Backup auslösen
  const wrapWithBackup = (action) => () => {
    triggerAutoBackup();
    action();
  };

  // ── Anker-Filter: berücksichtigt Datum-Range UND Konto-Filter ───────
  // Wenn delAcc gesetzt: nur Anker dieses Kontos im Datums-Range löschen.
  // Wenn delAcc=null: ALLE Anker (verhalten wie zuvor).
  const deleteAnchorsFiltered = () => {
    if(!delAcc) {
      // Alle Konten + alle Zeit
      setStartBalances({});
      return;
    }
    // Konto-spezifisch + Datums-Range
    const fromIdx = fromY*12 + fromM;
    const toIdx   = toY*12 + toM;
    setStartBalances(prev => {
      const next = {};
      Object.entries(prev || {}).forEach(([yKey, yVal]) => {
        if(!yVal || typeof yVal !== "object") return;
        const y = Number(yKey);
        const newY = {};
        Object.entries(yVal).forEach(([mKey, mVal]) => {
          // Altes Format: {y:{"acc-giro": number}}
          if(mKey === "acc-giro" && typeof mVal === "number") {
            // Altes Format-Anker: nur löschen wenn delAcc===acc-giro und Range erfüllt
            // (für altes Format gibt es kein Monat-Detail → behalten wenn nicht eindeutig betroffen)
            newY[mKey] = mVal; // konservativ: behalten
            return;
          }
          // Neues Format: {y:{"0":{accId: number}, "11":{accId: number}}}
          if(!isNaN(Number(mKey)) && typeof mVal === "object" && mVal !== null) {
            const m = Number(mKey);
            const idx = y*12 + m;
            const inRange = idx >= fromIdx && idx <= toIdx;
            if(inRange && mVal[delAcc] !== undefined) {
              // Diesen Konto-Anker entfernen; andere Konten behalten
              const filteredAccs = {};
              Object.entries(mVal).forEach(([aId, aVal]) => {
                if(aId !== delAcc) filteredAccs[aId] = aVal;
              });
              if(Object.keys(filteredAccs).length > 0) newY[mKey] = filteredAccs;
              // sonst: ganzen Monatseintrag weglassen
            } else {
              newY[mKey] = mVal;
            }
          } else {
            newY[mKey] = mVal;
          }
        });
        if(Object.keys(newY).length > 0) next[yKey] = newY;
      });
      return next;
    });
  };

  // Anker-Counter: ehrlich anzeigen, wie viele tatsächlich betroffen wären
  const cntAnchFiltered = (() => {
    if(!delAcc) {
      // Alle Anker
      let cnt = 0;
      Object.values(startBalances || {}).forEach(yVal => {
        if(yVal && typeof yVal === "object") {
          Object.values(yVal).forEach(mVal => {
            if(typeof mVal === "number") cnt++;
            else if(mVal && typeof mVal === "object") cnt += Object.keys(mVal).length;
          });
        }
      });
      return cnt;
    }
    // Konto-spezifisch + Range
    const fromIdx = fromY*12 + fromM;
    const toIdx   = toY*12 + toM;
    let cnt = 0;
    Object.entries(startBalances || {}).forEach(([yKey, yVal]) => {
      if(!yVal || typeof yVal !== "object") return;
      const y = Number(yKey);
      Object.entries(yVal).forEach(([mKey, mVal]) => {
        if(isNaN(Number(mKey)) || !mVal || typeof mVal !== "object") return;
        const m = Number(mKey);
        const idx = y*12 + m;
        if(idx >= fromIdx && idx <= toIdx && mVal[delAcc] !== undefined) cnt++;
      });
    });
    return cnt;
  })();

  // ── Kategorien & Gruppen: konto-spezifisch über groups.accountId ────
  // Modell: Kategorie.type → Gruppe.id; Gruppe.accountId → Konto.
  // Bei aktivem delAcc löschen wir: Gruppen mit accountId===delAcc UND
  // Kategorien deren type auf eine dieser Gruppen zeigt.
  const groupsForAcc = !delAcc ? [] :
    (groups || []).filter(g => (g.accountId || "") === delAcc);
  const groupTypesForAcc = new Set(groupsForAcc.map(g => g.type));
  const catsForAcc = !delAcc ? [] :
    (cats || []).filter(c => groupTypesForAcc.has(c.type));
  const cntCatsGroupsFiltered = !delAcc
    ? (cats.length + groups.length)
    : (catsForAcc.length + groupsForAcc.length);

  const deleteCatsGroupsFiltered = () => {
    if(!delAcc) { setCats([]); setGroups([]); return; }
    const catIdsToRemove = new Set(catsForAcc.map(c => c.id));
    // Kategorien entfernen
    setCats(p => p.filter(c => !catIdsToRemove.has(c.id)));
    // Gruppen entfernen
    setGroups(p => p.filter(g => !groupTypesForAcc.has(g.type)));
    // Splits in Buchungen, die auf gelöschte Kategorien zeigen, bereinigen
    setTxs(p => p.map(t => ({
      ...t,
      splits: (t.splits || []).filter(s => !catIdsToRemove.has(s.catId))
    })));
    // CSV-Rules, die auf gelöschte Kategorien zeigen, bereinigen
    setCsvRules(p => {
      const next = {};
      Object.entries(p || {}).forEach(([k, v]) => {
        if(!catIdsToRemove.has(v?.catId)) next[k] = v;
      });
      return next;
    });
  };

  // ── CSV-Rules: konto-spezifisch über catId → Gruppe → accountId ─────
  // Eine Rule zeigt auf eine Kategorie. Die Kategorie hat eine Gruppe.
  // Die Gruppe hat eine accountId. → Rule gehört indirekt zu diesem Konto.
  const rulesForAcc = !delAcc ? [] : (() => {
    const catIdsThisAcc = new Set(catsForAcc.map(c => c.id));
    return Object.entries(csvRules || {})
      .filter(([_, v]) => catIdsThisAcc.has(v?.catId));
  })();
  const cntRulesFiltered = !delAcc ? cntRules : rulesForAcc.length;

  const deleteRulesFiltered = () => {
    if(!delAcc) { setCsvRules({}); return; }
    const keysToRemove = new Set(rulesForAcc.map(([k]) => k));
    setCsvRules(p => {
      const next = {};
      Object.entries(p || {}).forEach(([k, v]) => {
        if(!keysToRemove.has(k)) next[k] = v;
      });
      return next;
    });
  };

  // ── Löschen ─────────────────────────────────────────────────────────
  // Lösch-Filter: Datum-Range UND (wenn gesetzt) Konto-Match
  const inDelRange = (t) => t.date>=fromIso && t.date<=toIso && accMatch(t);
  // Konto-Name für Labels
  const delAccName = !delAcc ? null : ((accounts||[]).find(a=>a.id===delAcc)?.name || delAcc);
  const DELETE_ITEMS = [
    {key:"realTxs", label:"echte Buchungen", icon:"check-circle",
     count: filterTxs(txs.filter(t=>!t.pending)).length,
     action:()=>setTxs(p=>p.filter(t=>t.pending||!inDelRange(t)))},
    {key:"pendTxs", label:"Vormerkungen / Wiederkehrende", icon:"calendar",
     count: filterTxs(txs.filter(t=>t.pending)).length,
     action:()=>setTxs(p=>p.filter(t=>!t.pending||!inDelRange(t)))},
    {key:"rules",   label: delAcc
        ? `Kategorie-Zuordnungen (${delAccName})`
        : "Kategorie-Zuordnungen (alle)",
     icon:"bookmark",
     count: cntRulesFiltered, action: deleteRulesFiltered},
    {key:"anchors", label: delAcc
        ? `Kontostand-Ankerpunkte (${delAccName}, Zeitraum)`
        : "Kontostand-Ankerpunkte (ALLE Konten, ALLE Zeiten)",
     icon:"landmark",
     count: cntAnchFiltered, action: deleteAnchorsFiltered},
    {key:"cats",    label: delAcc
        ? `Kategorien & Gruppen (${delAccName})`
        : "Kategorien & Gruppen (alle)",
     icon:"tag",
     count: cntCatsGroupsFiltered, action: deleteCatsGroupsFiltered},
    {key:"themes",  label:"Eigene Farbthemes (alle, global)",     icon:"palette",
     count: Object.keys(JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}")).length,
     action:()=>{
       const saved = JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}");
       Object.keys(saved).forEach(k => { delete THEMES[k]; });
       kvStore.removeItem("mbt_custom_themes");
     }},
  ];

  const SEL_ITEMS = [
    {key:"cats",    label:"Kategorien & Gruppen",    icon:"tag",       count:cats.length+groups.length},
    {key:"accounts",label:"Konten",                  icon:"landmark",  count:accounts.length},
    {key:"realTxs", label:"echte Buchungen",          icon:"check-circle",count:cntReal, hasRange:true},
    {key:"pendTxs", label:"Vormerkungen & Wiederkehrende",icon:"calendar",count:cntPend, hasRange:true},
    {key:"budgets", label:"Budgets",                 icon:"target",    count:cntBudg},
    {key:"yearData",label:"Monatsdaten",             icon:"calendar",  count:cntYears+" Jahre"},
    {key:"rules",   label:"Kategorie-Zuordnungen",   icon:"bookmark",  count:cntRules},
    {key:"anchors", label:"Kontostand-Ankerpunkte",  icon:"landmark",  count:cntAnch},
    {key:"quick",   label:"Schnellwahl & Spaltenname",icon:"grid",     count:cntQuick},
    {key:"icons",   label:"Eigene Icons",            icon:"image",     count:cntIcons},
    {key:"themes",  label:"eigene Farbthemes",       icon:"palette",   count:Object.keys(JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}")).length},
  ];

  const RangeSelector = ()=>(
    <div style={{background:"rgba(0,0,0,0.15)",borderRadius:9,padding:"8px 10px",marginBottom:10}}>
      <div style={{color:T.txt2,fontSize:10,marginBottom:6,fontWeight:600}}>Zeitraum:</div>
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <select value={fromM} onChange={e=>setFromM(Number(e.target.value))}
          style={{flex:1,minWidth:60,...INP,marginBottom:0,fontSize:11,padding:"4px 6px"}}>
          {MONTHS_G.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
        <input type="number" value={fromY} onChange={e=>setFromY(Number(e.target.value))}
          style={{width:64,...INP,marginBottom:0,fontSize:11,padding:"4px 6px",textAlign:"center"}}/>
        <span style={{color:T.txt2,fontSize:11}}>–</span>
        <select value={toM} onChange={e=>setToM(Number(e.target.value))}
          style={{flex:1,minWidth:60,...INP,marginBottom:0,fontSize:11,padding:"4px 6px"}}>
          {MONTHS_G.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
        <input type="number" value={toY} onChange={e=>setToY(Number(e.target.value))}
          style={{width:64,...INP,marginBottom:0,fontSize:11,padding:"4px 6px",textAlign:"center"}}/>
        <button onClick={()=>{setFromM(fullFromM);setFromY(fullFromY);setToM(fullToM);setToY(fullToY);}}
          title="Ganzer Zeitraum (alle Buchungen)"
          style={{background:"rgba(255,255,255,0.07)",border:"none",color:T.txt2,borderRadius:6,
            padding:"4px 8px",fontSize:10,cursor:"pointer"}}>Alles</button>
      </div>
    </div>
  );

  // Mobile: Vollbild mit einheitlichem Header (Zurück → Daten-Untermenü).
  // Desktop: zentriertes Overlay-Dialog wie bisher.
  const Wrapper = mobileMode
    ? ({children}) => (
        <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,
          zIndex:300,display:"flex",flexDirection:"column"}}>{children}</div>
      )
    : ({children}) => (
        <div onClick={onClose}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",
            zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surf,borderRadius:20,width:"100%",maxWidth:480,
              maxHeight:"85vh",display:"flex",flexDirection:"column",
              border:`1px solid ${T.bds}`,boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>{children}</div>
        </div>
      );
  return (
    <Wrapper>

        {/* Header */}
        {mobileMode ? (
          <MobileHeader title="Daten-Manager" subtitle="Exportieren · Importieren · Löschen"
            onBack={onBack||onClose} onClose={onClose}/>
        ) : (
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 16px 0",flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:10,background:"rgba(170,204,0,0.12)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            {Li("database",17,T.pos)}
          </div>
          <div style={{flex:1}}>
            <div style={{color:T.txt,fontSize:15,fontWeight:700}}>Daten-Manager</div>
            <div style={{color:T.txt2,fontSize:10}}>Exportieren · Importieren · Löschen</div>
          </div>
          <button onClick={onClose}
            style={{background:"rgba(255,255,255,0.07)",border:"none",color:T.txt2,
              borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:4,padding:"10px 16px 0",flexShrink:0}}>
          {[["export","download","Exportieren",T.pos],
            ["import","upload","importieren",T.blue],
            ["delete","trash-2","Löschen",T.neg]].map(([v,ic,lb,col])=>(
            <button key={v} onClick={()=>setTab(v)}
              style={{flex:1,padding:"7px 4px",borderRadius:9,border:"none",cursor:"pointer",
                fontFamily:"inherit",fontSize:11,fontWeight:700,
                background:tab===v?col+"22":"rgba(255,255,255,0.05)",
                color:tab===v?col:T.txt2,
                borderBottom:tab===v?`2px solid ${col}`:"2px solid transparent"}}>
              {Li(ic,11,tab===v?col:T.txt2)} {lb}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"12px 16px 24px"}}>

          {/* ── EXPORT ── */}
          {tab==="export"&&(<>
            {/* Vollständigkeits-Hinweis: ehrlich anzeigen, ob es ein 100%-Backup ist */}
            <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",marginBottom:10,
              borderRadius:9,border:`1px solid ${isComplete?T.pos:T.gold}55`,
              background:`${isComplete?T.pos:T.gold}12`}}>
              {Li(isComplete?"shield-check":"shield",13,isComplete?T.pos:T.gold)}
              <div style={{flex:1,color:T.txt,fontSize:10.5,lineHeight:1.5}}>
                {isComplete
                  ? <><b style={{color:T.pos}}>Vollständige Sicherung (100 %)</b> — alle Bereiche + ganzer Zeitraum{hasEbKey?<> inkl. <b>verschlüsseltem Bank-Schlüssel</b></>:""}.</>
                  : <><b style={{color:T.gold}}>Teil-Sicherung</b> — für 100 % alle Haken setzen, bei den Buchungen „Alles" als Zeitraum{hasEbKey&&!ebOk?<> und den <b>Bank-Schlüssel</b> mit Passphrase aufnehmen</>:""}.</>}
                <br/>Wieder einspielen über den Reiter <b style={{color:T.txt}}>„importieren"</b> hier im Daten-Manager.
              </div>
            </div>
            <RangeSelector/>
            <div style={{color:T.txt2,fontSize:10,marginBottom:8}}>Bereiche auswählen (Zeitraum gilt nur für Buchungen):</div>
            {SEL_ITEMS.map(({key,label,icon,count,hasRange})=>(
              <div key={key} onClick={()=>toggleSel(key)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                  borderRadius:9,marginBottom:4,cursor:"pointer",
                  background:sel[key]?"rgba(170,204,0,0.08)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${sel[key]?T.pos:T.bd}`}}>
                <div style={{width:16,height:16,borderRadius:4,flexShrink:0,
                  background:sel[key]?T.pos:"rgba(255,255,255,0.1)",
                  border:`2px solid ${sel[key]?T.pos:T.bds}`,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {sel[key]&&Li("check",9,T.on_accent)}
                </div>
                {Li(icon,13,sel[key]?T.pos:T.txt2)}
                <span style={{flex:1,color:T.txt,fontSize:12}}>{label}</span>
                <span style={{color:T.txt2,fontSize:10,fontFamily:"monospace"}}>
                  {hasRange?`${count} im Zeitraum`:count}
                </span>
              </div>
            ))}

            {/* Bank-Schlüssel (.pem): optional, NUR passphrase-verschlüsselt */}
            <div style={{marginTop:10,padding:"8px 10px",borderRadius:9,
              border:`1px solid ${inclEbKey?T.gold:T.bd}`,
              background:inclEbKey?`${T.gold}10`:"rgba(255,255,255,0.03)"}}>
              <div onClick={()=>hasEbKey&&setInclEbKey(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:10,cursor:hasEbKey?"pointer":"default",opacity:hasEbKey?1:0.5}}>
                <div style={{width:16,height:16,borderRadius:4,flexShrink:0,
                  background:inclEbKey?T.gold:"rgba(255,255,255,0.1)",
                  border:`2px solid ${inclEbKey?T.gold:T.bds}`,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {inclEbKey&&Li("check",9,T.on_accent)}
                </div>
                {Li("key",13,inclEbKey?T.gold:T.txt2)}
                <span style={{flex:1,color:T.txt,fontSize:12}}>Bank-Schlüssel (verschlüsselt)</span>
                <span style={{color:T.txt2,fontSize:10}}>{hasEbKey?"vorhanden":"keiner"}</span>
              </div>
              <div style={{color:T.txt2,fontSize:10,lineHeight:1.5,marginTop:6,display:"flex",gap:5,alignItems:"flex-start"}}>
                {Li("shield",11,T.gold)}
                <span>Der private Bank-Schlüssel wird normalerweise <b>nicht</b> mitgesichert
                  (er läge sonst unverschlüsselt in der Datei). Optional kannst du ihn hier
                  <b> mit einer Passphrase verschlüsselt</b> aufnehmen. <b style={{color:T.gold}}>Ohne diese
                  Passphrase lässt er sich später nicht wieder importieren.</b></span>
              </div>
              {inclEbKey && (
                <div style={{position:"relative",marginTop:8}}>
                  <input type={showEbPass?"text":"password"} value={ebPass}
                    onChange={e=>setEbPass(e.target.value)} placeholder="Passphrase für den Schlüssel"
                    autoCapitalize="off" autoCorrect="off" autoComplete="new-password" spellCheck={false}
                    style={{...INP,marginBottom:0,paddingRight:40,fontSize:13}}/>
                  <button onClick={()=>setShowEbPass(v=>!v)}
                    style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
                      background:"transparent",border:"none",cursor:"pointer",padding:6,display:"flex"}}>
                    {Li(showEbPass?"eye-off":"eye",16,T.txt2)}
                  </button>
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={copyExport}
                style={{flex:1,padding:"10px",borderRadius:11,border:`1px solid ${T.pos}44`,
                  background:`${T.pos}08`,color:T.pos,fontSize:12,fontWeight:700,cursor:"pointer",
                  fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {Li("copy",13,T.pos)} Kopieren
              </button>
              <button onClick={doExport}
                style={{flex:2,padding:"10px",borderRadius:11,border:"none",
                  background:T.pos,color:T.on_accent,fontSize:13,fontWeight:700,cursor:"pointer",
                  fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {Li("download",14,T.on_accent)} Als JSON speichern
              </button>
            </div>
          </>)}

          {/* ── IMPORT ── */}
          {tab==="import"&&(<>
            <div style={{color:T.txt2,fontSize:11,marginBottom:10,lineHeight:1.6}}>
              JSON aus einem Export hier einfügen oder Datei wählen.
              <br/><b style={{color:T.txt}}>Buchungen</b> werden <b>ergänzt</b> (Duplikate per id übersprungen).
              <b style={{color:T.txt}}> Stammdaten</b> (Kategorien, Gruppen, Konten, Budgets, Monatsdaten,
              Zuordnungen, Ankerpunkte, Schnellwahl, Icons, Themes) werden <b>ersetzt</b>.
              Versteht das Daten-Manager-Format ebenso wie ein Voll-Backup.
            </div>
            {/* Optionale Passphrase — nur nötig, wenn die Datei einen verschlüsselten Bank-Schlüssel enthält */}
            <div style={{position:"relative",marginBottom:10}}>
              <input type="password" value={importEbPass} onChange={e=>setImportEbPass(e.target.value)}
                placeholder="Passphrase für Bank-Schlüssel (nur falls enthalten)"
                autoCapitalize="off" autoCorrect="off" autoComplete="new-password" spellCheck={false}
                style={{...INP,marginBottom:0,fontSize:12}}/>
            </div>
            <textarea value={importJson} onChange={e=>setImportJson(e.target.value)}
              placeholder='{"cats":[...],"realTxs":[...],...}'
              style={{width:"100%",minHeight:140,background:"rgba(0,0,0,0.2)",
                border:`1px solid ${importErr?T.neg:T.bds}`,borderRadius:10,
                color:T.txt,fontSize:11,padding:"10px",fontFamily:"monospace",
                boxSizing:"border-box",outline:"none",resize:"vertical"}}/>
            {importErr&&<div style={{color:T.neg,fontSize:10,marginTop:4}}>{importErr}</div>}
            {importOk&&<div style={{color:T.pos,fontSize:11,marginTop:4,fontWeight:700}}>{importOk}</div>}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <label style={{flex:1,padding:"10px",borderRadius:11,border:`1px solid ${T.blue}44`,
                background:`${T.blue}08`,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:6,textAlign:"center"}}>
                {Li("folder-open",13,T.blue)} Datei wählen
                <input type="file" accept=".json" style={{display:"none"}}
                  onChange={e=>{
                    const f=e.target.files[0]; if(!f) return;
                    const r=new FileReader();
                    r.onload=ev=>setImportJson(ev.target.result);
                    r.readAsText(f);
                  }}/>
              </label>
              <button onClick={doImport} disabled={!importJson.trim()}
                style={{flex:2,padding:"10px",borderRadius:11,border:"none",
                  background:importJson.trim()?T.blue:T.disabled,
                  color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
                  fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                  opacity:importJson.trim()?1:0.4}}>
                {Li("upload",14,"#fff")} Importieren
              </button>
            </div>
          </>)}

          {/* ── LÖSCHEN ── */}
          {tab==="delete"&&(<>
            <div style={{color:T.neg,fontSize:11,marginBottom:10,padding:"6px 10px",
              background:`${T.neg}10`,borderRadius:8,border:`1px solid ${T.neg}33`}}>
              {Li("alert-triangle",11,T.neg)} Achtung: Löschen kann nicht rückgängig gemacht werden!
            </div>
            <RangeSelector/>
            {/* Konto-Filter — gilt für 'echte Buchungen' und 'Vormerkungen' */}
            <div style={{marginBottom:10}}>
              <div style={{color:T.txt2,fontSize:10,marginBottom:4}}>Konto-Filter (für Buchungen/Vormerkungen):</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                <button onClick={()=>setDelAcc(null)}
                  style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:!delAcc?700:400,
                    background:!delAcc?T.blue:"transparent",
                    color:!delAcc?"#fff":T.txt2,
                    border:`1px solid ${!delAcc?T.blue:T.bd}`,cursor:"pointer"}}>
                  Alle Konten
                </button>
                {(accounts||[]).map(a => (
                  <button key={a.id} onClick={()=>setDelAcc(a.id)}
                    style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:delAcc===a.id?700:400,
                      background:delAcc===a.id?T.blue:"transparent",
                      color:delAcc===a.id?"#fff":T.txt2,
                      border:`1px solid ${delAcc===a.id?T.blue:T.bd}`,cursor:"pointer"}}>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            {DELETE_ITEMS.map(({key,label,icon,count,action})=>(
              <div key={key} style={{marginBottom:6}}>
                {delConfirm===key ? (
                  <div style={{padding:"10px",borderRadius:10,
                    background:`${T.neg}15`,border:`1px solid ${T.neg}44`}}>
                    <div style={{color:T.neg,fontSize:11,fontWeight:700,marginBottom:6}}>
                      Wirklich löschen: {label} ({count})?
                    </div>
                    <div style={{color:T.txt2,fontSize:10,marginBottom:8,lineHeight:1.4}}>
                      {Li("shield",10,T.txt2)} Vor dem Löschen wird automatisch ein Backup-JSON heruntergeladen.
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setDelConfirm(null)}
                        style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.bds}`,
                          background:"transparent",color:T.txt2,fontSize:12,cursor:"pointer"}}>
                        Abbrechen
                      </button>
                      <button onClick={()=>{wrapWithBackup(action)();setDelConfirm(null);}}
                        style={{flex:1,padding:"7px",borderRadius:8,border:"none",
                          background:T.neg,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        {Li("trash-2",12,"#fff")} Backup & Löschen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                    borderRadius:9,background:"rgba(255,255,255,0.03)",border:`1px solid ${T.bd}`}}>
                    {Li(icon,14,T.txt2)}
                    <span style={{flex:1,color:T.txt,fontSize:12}}>{label}</span>
                    <span style={{color:T.txt2,fontSize:10,fontFamily:"monospace",marginRight:4}}>
                      {count}
                    </span>
                    <button onClick={()=>setDelConfirm(key)}
                      style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${T.neg}44`,
                        background:`${T.neg}10`,color:T.neg,fontSize:11,fontWeight:700,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      {Li("trash-2",11,T.neg)} Löschen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>)}

        </div>
    </Wrapper>
  );
}

// ══════════════════════════════════════════════════════════════════════

export { DataManagerDialog };
