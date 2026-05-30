// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { AnchorSection } from "../organisms/AnchorSection.jsx";
import { QuickPicker } from "../organisms/QuickPicker.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { parseCSV } from "../../utils/csv.js";
import { anchorFromDetectedBalance, makeAnchorEntry } from "../../utils/anchors.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchAmount, matchSearch } from "../../utils/search.js";
import { txFingerprint, txFingerprintNorm } from "../../utils/tx.js";

function CsvImportScreen({onClose, onBack, embedded=false, mobileMode=false}) {
  const { cats, groups, txs, setTxs, accounts, csvRules, setCsvRules, startBalances, setStartBalances, setMasterOverride } = useContext(AppCtx);
  const MFS = mobileMode ? 22 : 13; // mobile font size base
  const MFSl = mobileMode ? 18 : 11; // mobile font size small
  const MPad = mobileMode ? "14px 16px" : "8px 12px"; // mobile padding
  const S = {fs:26, pad:10, padL:14, radius:16, gap:14}; // für mobile Konto-Kacheln
  const [csvText, setCsvText]       = useState("");
  const [csvSources, setCsvSources] = useState([]); // Dateinamen der importierten CSVs
  const [parsed,  setParsed]        = useState(null);
  const [rules,   setRules]         = useState(()=>({...(csvRules||{})})); // initialisiert aus globalen Regeln
  const [assign,  setAssign]        = useState({});
  const [step,    setStep]          = useState("input");
  const [search,  setSearch]        = useState("");
  const [bulkCat, setBulkCat]       = useState({catId:"",subId:""});
  const [doneCount, setDoneCount]   = useState(0);
  const [showCatAssign, setShowCatAssign] = useState(false);
  const [selAccId, setSelAccId]     = useState(""); // Zielkonto für Import
  // Sobald Konten aus IndexedDB geladen sind, erstes Konto vorauswählen (falls noch nichts gewählt)
  useEffect(()=>{
    if(!selAccId && accounts.length>0) setSelAccId(accounts[0].id);
  }, [accounts]);
  // Wenn der User während der Review-Phase das Konto wechselt: Rows neu auflösen + Kategorien neu zuweisen
  // (nutzt Ref-basiert um Endlosschleife zu vermeiden — wir wollen nur reagieren auf manuellen Konto-Wechsel)
  const _prevSelAccIdRef = React.useRef(selAccId);
  useEffect(()=>{
    if(_prevSelAccIdRef.current === selAccId) return;
    _prevSelAccIdRef.current = selAccId;
    if(step !== "review" || !parsed) return;
    // Nur Rows aktualisieren bei denen kein _konto-String aus der CSV ein anderes Konto bestimmt
    const updatedRows = parsed.rows.map(r => {
      // Wenn die Row durch _konto-Match ein anderes Konto hat, NICHT überschreiben
      if(r._konto) {
        const kLow = r._konto.toLowerCase();
        const matched = accounts.find(a =>
          a.name.toLowerCase().includes(kLow) ||
          kLow.includes(a.name.toLowerCase()) ||
          a.id === r._konto
        );
        if(matched) return r; // belassen
      }
      // Sonst auf neues selAccId setzen
      const newAccId = selAccId || accounts[0]?.id;
      return {...r, _resolvedAccId: newAccId,
        fp: txFingerprint(r.isoDate, r.amount, r.desc, newAccId)};
    });
    const newRows = updatedRows.filter(r=>!knownFps.has(r.fp));
    const dupRows = updatedRows.filter(r=> knownFps.has(r.fp));
    setParsed(p => ({...p, rows: updatedRows, newRows, dupRows}));
    // Kategorien neu zuweisen (Auto-Regeln berücksichtigen jetzt das neue Konto)
    setAssign(autoAssign(newRows));
  }, [selAccId, step]);
  const [anchorWarning, setAnchorWarning] = useState(null); // {firstMonth, firstYear} wenn Vormonat-Ankerpunkt fehlt

  // Alle bekannten Fingerprints aus vorhandenen Buchungen
  // Doppelt: exakter Fingerprint UND normalisierter Fingerprint (Umlaute, DATUM-Suffix
  // weggestrippt). Letzteres erkennt Dup zwischen Finanzblick- und DKB-Original-CSVs.
  const knownFps = useMemo(()=>{
    const s = new Set();
    txs.forEach(t => {
      // Gespeicherter Fingerprint (alt oder neu)
      if(t._fp) s.add(t._fp);
      // Immer beide Varianten — schützt vor Reimport alter und neuer CSVs
      const abs = Math.abs(t.totalAmount);
      s.add(txFingerprint(t.date, t.totalAmount, t.desc));
      s.add(txFingerprint(t.date, abs,           t.desc));
      // Normalisierte Variante (formatübergreifend)
      s.add(txFingerprintNorm(t.date, t.totalAmount, t.desc));
      s.add(txFingerprintNorm(t.date, abs,           t.desc));
      if(t.accountId) {
        s.add(txFingerprint(t.date, t.totalAmount, t.desc, t.accountId));
        s.add(txFingerprint(t.date, abs,           t.desc, t.accountId));
        s.add(txFingerprintNorm(t.date, t.totalAmount, t.desc, t.accountId));
        s.add(txFingerprintNorm(t.date, abs,           t.desc, t.accountId));
      }
    });
    return s;
  }, [txs]);

  // Auto-Zuweisung via gespeicherte Regeln
  const autoAssign = (rows) => {
    const a = {};
    rows.forEach((r,i) => {
      const rowAccId = r._resolvedAccId || selAccId || accounts[0]?.id;
      const rowAcc = accounts.find(a=>a.id===rowAccId);

      // Prüft ob eine Kategorie zum Konto der Row passt
      const catMatchesAcc = (catId) => {
        if(!catId) return true;
        const cat = cats.find(c=>c.id===catId);
        if(!cat) return true;
        const grp = groups.find(g=>g.type===cat.type);
        const beh = grp?.behavior || cat.type;
        const isTgCat = beh==="tagesgeld" || cat.type==="tagesgeld";
        const isTgAcc = rowAcc?.name?.toLowerCase().includes("tagesgeld") || rowAccId?.includes("tagesgeld");
        // Tagesgeld-Kategorien nur für Tagesgeld-Konto, und umgekehrt
        if(isTgCat && !isTgAcc) return false;
        if(!isTgCat && isTgAcc && (beh==="income"||beh==="expense")) return false;
        return true;
      };

      // 1. Exakt per Fingerprint
      if(rules[r.fp] && catMatchesAcc(rules[r.fp].catId)) { a[i] = rules[r.fp]; return; }
      const descLower = r.desc.toLowerCase();
      // 2. Exakter Name-Match
      const name = r.desc.split(" – ")[0].toLowerCase().trim();
      const exactKey = Object.keys(rules).find(k=>k.startsWith("name:"+name));
      if(exactKey && catMatchesAcc(rules[exactKey].catId)) { a[i] = rules[exactKey]; return; }
      // 3. Teilübereinstimmung — Regelname in Beschreibung enthalten
      const partialKey = Object.keys(rules).find(k=>{
        if(!k.startsWith("name:")) return false;
        const ruleName = k.slice(5);
        return ruleName.length>3 && descLower.includes(ruleName);
      });
      if(partialKey && catMatchesAcc(rules[partialKey].catId)) { a[i] = rules[partialKey]; return; }
      a[i] = {catId:"", subId:""};
    });
    return a;
  };

  const [linkToGiro, setLinkToGiro] = useState(false);
  const [linkDays, setLinkDays] = useState(35);
  const [autoGroup, setAutoGroup] = useState(false); // Automatisches Zusammenfassen

  const [showAutoSugg, setShowAutoSugg] = useState(false);

  // Automatische Verknüpfungsvorschläge berechnen (für Vergleich, ohne zu importieren)
  const computeAutoSuggestions = (newRows) => {
    const suggestions = []; // [{newRowIdx, giroTx, confidence}]
    newRows.forEach((r, i) => {
      const absAmt = Math.abs(r.amount);
      const rDate = new Date(r.isoDate).getTime();
      const matches = txs.filter(t => {
        if(Math.round(t.totalAmount*100) !== Math.round(absAmt*100)) return false;
        const diff = Math.abs(new Date(t.date).getTime() - rDate) / 86400000;
        if(diff > linkDays) return false;
        const tDesc = (t.desc||"").toLowerCase();
        const rName = r.desc.split(" · ")[0].split(" – ")[0].toLowerCase().trim();
        const isPayPalGiro = tDesc.includes("paypal")||tDesc.includes("pp.")||tDesc.includes("amazon");
        const nameInGiro = rName.length > 3 && tDesc.includes(rName.slice(0,6).toLowerCase());
        return isPayPalGiro || nameInGiro;
      });
      matches.forEach(m => {
        const diff = Math.abs(new Date(m.date).getTime() - rDate) / 86400000;
        const confidence = diff <= 3 ? "hoch" : diff <= 14 ? "mittel" : "niedrig";
        suggestions.push({ rowIdx: i, giroTx: m, diffDays: Math.round(diff), confidence });
      });
    });
    return suggestions;
  };

  const doParse = () => {
    if(!csvText.trim()) return;
    const {rows, format, detectedBalance, detectedBalances} = parseCSV(csvText, {noGroup: !autoGroup});
    // _konto-String → accountId auflösen und Fingerprint mit accountId neu bilden
    const resolvedRows = rows.map(r => {
      let resolvedAccId = selAccId || accounts[0]?.id;
      if(r._konto) {
        const kLow = r._konto.toLowerCase();
        const matched = accounts.find(a =>
          a.name.toLowerCase().includes(kLow) ||
          kLow.includes(a.name.toLowerCase()) ||
          a.id === r._konto
        );
        if(matched) resolvedAccId = matched.id;
      }
      return {...r, _resolvedAccId: resolvedAccId,
        fp: txFingerprint(r.isoDate, r.amount, r.desc, resolvedAccId),
        _fpNorm: txFingerprintNorm(r.isoDate, r.amount, r.desc, resolvedAccId)};
    });
    // Eine Row ist Duplikat, wenn ENTWEDER der exakte oder der normalisierte
    // Fingerprint bereits bekannt ist. So erkennen sich Finanzblick- und
    // DKB-Original-Exporte gegenseitig als Dupl.
    const isDup = r => knownFps.has(r.fp) || knownFps.has(r._fpNorm);
    const newRows  = resolvedRows.filter(r=>!isDup(r));
    const dupRows  = resolvedRows.filter(isDup);
    const autoSuggestions = computeAutoSuggestions(newRows);
    setParsed({rows: resolvedRows, format, newRows, dupRows, autoSuggestions, detectedBalance, detectedBalances: detectedBalances || (detectedBalance ? [detectedBalance] : [])});
    setAssign(autoAssign(newRows));
    setShowCatAssign(newRows.length <= 20);
    setStep("review");
  };

  const doImport = () => {
    const newTxs = [];
    const giroUpdates = {}; // giroTxId → [newTxId, ...]

    parsed.newRows.forEach((r,i) => {
      const {catId="", subId=""} = assign[i]||{};
      const absAmt = Math.abs(r.amount);
      const splits = catId ? [{id:uid(), catId, subId, amount:absAmt}] : [];
      const newId = "csv-"+uid();
      // Konto: bereits in doParse aufgelöst
      const resolvedAccId = r._resolvedAccId || selAccId || accounts[0]?.id || "acc-giro";
      newTxs.push({
        id: newId,
        date: r.isoDate,
        totalAmount: absAmt,
        desc: r.desc,
        note: r._detailNote || "",
        pending: false,
        accountId: resolvedAccId,
        splits,
        _csvType: r.amount > 0 ? "income" : "expense",
        _fp: r.fp,
        _csvSource: csvSources.length===1 ? csvSources[0] : csvSources.length>1 ? csvSources.join(", ") : "",
        _kontoRaw: r._konto || "",
      });
      // Regel merken — lokal + global
      if(catId) {
        const name = r.desc.split(" – ")[0].toLowerCase().trim();
        const newRule = {catId,subId};
        setRules(p=>({...p, ["name:"+name]:newRule, [r.fp]:newRule}));
        setCsvRules(p=>({...p, ["name:"+name]:newRule, [r.fp]:newRule}));
      }
      // Giro-Verknüpfung: Automatik (wenn aktiv) oder manuell akzeptierte Vorschläge
      const accepted = (parsed.acceptedSuggs||[]).filter(a=>a.rowIdx===i);
      accepted.forEach(a=>{
        if(!giroUpdates[a.giroId]) giroUpdates[a.giroId]=[];
        giroUpdates[a.giroId].push(newId);
      });
      if(linkToGiro && accepted.length===0) {
        const rDate = new Date(r.isoDate).getTime();
        const match = txs.find(t => {
          // Betrag muss exakt übereinstimmen (Cent-Vergleich gegen Float-Ungenauigkeit)
          if(Math.round(t.totalAmount*100) !== Math.round(absAmt*100)) return false;
          // Datum innerhalb der gewählten Toleranz
          const diff = Math.abs(new Date(t.date).getTime() - rDate) / 86400000;
          if(diff > linkDays) return false;
          // Giro-Buchung muss auf PayPal/Amazon/den Empfänger hinweisen
          const tDesc = (t.desc||"").toLowerCase();
          const rName = r.desc.split(" · ")[0].split(" – ")[0].toLowerCase().trim();
          const isPayPalGiro = tDesc.includes("paypal") || tDesc.includes("pp.") || tDesc.includes("amazon");
          const nameInGiro = rName.length > 3 && tDesc.includes(rName.slice(0,6).toLowerCase());
          if(!isPayPalGiro && !nameInGiro) return false;
          return true;
        });
        if(match) {
          if(!giroUpdates[match.id]) giroUpdates[match.id] = [];
          giroUpdates[match.id].push(newId);
        }
      }
    });

    setTxs(p => {
      const withNew = [...newTxs, ...p];
      const sorted = [...withNew].sort((a,b)=>b.date.localeCompare(a.date));
      if(!linkToGiro || Object.keys(giroUpdates).length === 0) return sorted;
      // Giro-Buchungen mit linkedIds aktualisieren
      return sorted.map(t => {
        if(giroUpdates[t.id]) {
          return {...t, linkedIds: [...(t.linkedIds||[]), ...giroUpdates[t.id]]};
        }
        return t;
      });
    });
    setDoneCount(newTxs.length);

    // ── Erkannte Kontostände als Ankerpunkte speichern ───────────────────────
    // Neu: Alle gefundenen Stützpunkte werden übernommen (z.B. DKB
    // Quartalsabrechnungen liefern oft 4 pro Jahr). Fallback auf
    // detectedBalance (Singular) für ältere parsed-States ohne Array.
    const balancesToStore = (parsed.detectedBalances && parsed.detectedBalances.length)
      ? parsed.detectedBalances
      : (parsed.detectedBalance ? [parsed.detectedBalance] : []);
    if(balancesToStore.length > 0) {
      const targetAccId = selAccId || accounts[0]?.id || "acc-giro";
      // Kontostand "am Datum" TAGGENAU als Anker ablegen (siehe utils/anchors.js):
      // Monats-Ende → schlichte Zahl (rückwärtskompatibel), Datum mitten im Monat
      // → { v, day }. getKumulierterSaldo addiert dann im Anker-Monat nur die
      // Buchungen NACH dem Anker-Tag — spätere Buchungen verschwinden nicht mehr.
      setStartBalances(prev=>{
        let next = {...(prev||{})};
        for(const db of balancesToStore) {
          const a = anchorFromDetectedBalance(db);
          if(!a) continue;
          const entry = makeAnchorEntry(a.value, a.year, a.month, a.day);
          next = {
            ...next,
            [a.year]: {
              ...(next?.[a.year]||{}),
              [a.month]: {
                ...((next?.[a.year]?.[a.month])||{}),
                [targetAccId]: entry,
              },
            }
          };
        }
        return next;
      });
    }

    // ── Prüfen ob der Vormonat-Ankerpunkt für den ersten importierten Monat fehlt ──
    if(newTxs.length > 0) {
      const importAccId = selAccId || accounts[0]?.id || "acc-giro";
      // Frühestes Datum aller importierten Buchungen ermitteln
      const sortedDates = newTxs.map(t=>t.date).sort();
      const firstDate = sortedDates[0]; // "YYYY-MM-DD"
      const firstYear = Number(firstDate.slice(0,4));
      const firstMonth = Number(firstDate.slice(5,7)) - 1; // 0-basiert
      // Vormonat berechnen
      const prevMonth = firstMonth === 0 ? 11 : firstMonth - 1;
      const prevYear  = firstMonth === 0 ? firstYear - 1 : firstYear;
      // Ankerpunkte prüfen: gibt es einen Ankerpunkt für dieses Konto <= Vormonat?
      const sb = startBalances || {};
      let hasAnchorForPrev = false;
      Object.entries(sb).forEach(([yStr, yVal]) => {
        const y = Number(yStr);
        if(typeof yVal !== "object" || !yVal) return;
        Object.entries(yVal).forEach(([kStr, kVal]) => {
          const mo = Number(kStr);
          if((y < prevYear) || (y === prevYear && mo <= prevMonth)) {
            // Neues Format: {mo: {accId: number}}
            if(!isNaN(mo) && typeof kVal === "object" && kVal?.[importAccId] !== undefined) hasAnchorForPrev = true;
            // Altes Format (nur acc-giro): nur wenn wir auch acc-giro importieren
            if(kStr === "acc-giro" && typeof kVal === "number" && importAccId === "acc-giro") hasAnchorForPrev = true;
          }
        });
      });
      // Neu gesetzte Ankerpunkte aus CSV zählen auch (jeder einzelne)
      const balancesForCheck = (parsed.detectedBalances && parsed.detectedBalances.length)
        ? parsed.detectedBalances
        : (parsed.detectedBalance ? [parsed.detectedBalance] : []);
      for(const db of balancesForCheck) {
        if(!db || !db.date) continue;
        const py = Number(db.date.slice(0,4)), pm = Number(db.date.slice(5,7)) - 1;
        if((py < prevYear) || (py === prevYear && pm <= prevMonth)) { hasAnchorForPrev = true; break; }
      }
      if(!hasAnchorForPrev) {
        setAnchorWarning({firstMonth, firstYear, prevMonth, prevYear, accId: importAccId,
          accName: accounts.find(a=>a.id===importAccId)?.name || importAccId});
      } else {
        setAnchorWarning(null);
      }
    }

    setStep("done");
  };

  const allCatOptions = useMemo(()=>{
    const opts = [];
    groups.forEach(g=>{
      cats.filter(c=>c.type===g.type).forEach(cat=>{
        (cat.subs||[]).forEach(sub=>{
          opts.push({catId:cat.id, subId:sub.id, label:`${cat.name} / ${sub.name}`, group:g.label});
        });
      });
    });
    return opts;
  },[cats,groups]);

  const setRowAssign = (i, catId, subId) => setAssign(p=>({...p,[i]:{catId,subId}}));

  // Master-Button-Override: der große Plus-Knopf übernimmt die Schritt-Aktion
  // (Tipp = bestätigen, Wisch ← = zurück, Wisch ↓ = abbrechen) — analog zu den
  // Mobile-Wizards. Nur im mobileMode aktiv; embedded/Desktop nutzt die Inline-
  // Buttons. Handler über Ref, damit immer die aktuellen Kategorie-Zuweisungen
  // (assign) greifen, ohne den Effect bei jeder Auswahl neu zu registrieren.
  const _csvHandlersRef = React.useRef({});
  _csvHandlersRef.current = { doParse, doImport, onClose };
  React.useEffect(() => {
    if(!mobileMode || !setMasterOverride) return;
    const H = () => _csvHandlersRef.current;
    let cfg = null;
    if(step === "input") {
      cfg = {
        label: parsed ? `Erneut prüfen (${parsed.newRows?.length||0} neu)` : "Vorschau anzeigen",
        onConfirm: () => { if(csvText.trim()) H().doParse(); },
        onBack: null,
        onDismiss: () => H().onClose(),
        disabled: !csvText.trim(),
      };
    } else if(step === "review") {
      const n = parsed?.newRows?.length || 0;
      cfg = n === 0 ? {
        label: "Schließen",
        onConfirm: () => H().onClose(),
        onBack: () => setStep("input"),
        onDismiss: () => H().onClose(),
      } : {
        label: `${n} importieren${showCatAssign ? " · mit Kategorien ✓" : ""}`,
        onConfirm: () => H().doImport(),
        onBack: () => setStep("input"),
        onDismiss: () => H().onClose(),
      };
    } else if(step === "done") {
      cfg = {
        label: "✓ Fertig",
        onConfirm: () => H().onClose(),
        onBack: null,
        onDismiss: () => H().onClose(),
      };
    }
    setMasterOverride(cfg);
    return () => setMasterOverride(null);
  }, [step, csvText, parsed, showCatAssign, mobileMode]);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className={mobileMode?"mobile-modal":""} style={embedded
      ? {display:"flex",flexDirection:"column",fontFamily:"'SF Pro Text',-apple-system,sans-serif",minHeight:300}
      : {position:"fixed",inset:0,background:T.bg,zIndex:15,display:"flex",flexDirection:"column",
         fontFamily:"'SF Pro Text',-apple-system,sans-serif",
         // Reserve unten: die nav-bottom (Home/Monat/Jahr) ist position:fixed z-index:9999
         // und überdeckt sonst den Footer mit dem "Buchungen importieren"-Button.
         paddingBottom:"calc(60px + env(safe-area-inset-bottom, 0px))"}}>
      {/* Header */}
      {!embedded && (mobileMode ? (
        // Mobile: einheitlicher Header. Zurück führt review/done → input, input → Mehr-Menü.
        <MobileHeader title="CSV-Import" titleColor={T.blue}
          subtitle={step==="review"&&parsed?.format ? parsed.format : "DKB · Finanzblick · beliebiges Format"}
          onBack={step!=="input" ? ()=>setStep("input") : (onBack||onClose)}
          onClose={onClose}/>
      ) : (
        <div style={{background:T.surf,borderBottom:`1px solid ${T.bds}`,padding:MPad,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,borderRadius:10,width:34,height:34,cursor:"pointer",fontSize:18}}>{Li("arrow-left",13)}</button>
          <div style={{flex:1}}>
            <div style={{color:T.blue,fontSize:16,fontWeight:700}}>{Li("upload-cloud",16,T.blue)} CSV-Import</div>
            <div style={{color:T.txt2,fontSize:MFSl}}>DKB · Finanzblick · beliebiges Format</div>
          </div>
          {step==="review"&&<div style={{color:T.txt2,fontSize:MFSl}}>{parsed?.format}</div>}
        </div>
      ))}

      {/* ── Kontoauswahl — immer sichtbar, auf allen Steps ── */}
      {accounts.length>0&&(
        <div style={{background:T.surf2,borderBottom:`1px solid ${T.bd}`,padding:mobileMode?"12px 16px":"8px 14px",flexShrink:0}}>
          <div style={{color:T.txt2,fontSize:mobileMode?14:10,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>
            {Li("landmark",mobileMode?14:10,T.txt2)} Konto (gilt für Buchungen & Ankerpunkt)
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:mobileMode?10:6}}>
            {accounts.map(acc=>{
              const active = selAccId===acc.id;
              return (
                <button key={acc.id} onClick={()=>setSelAccId(acc.id)}
                  style={{
                    display:"flex",alignItems:"center",gap:mobileMode?8:6,
                    padding:mobileMode?"10px 16px":"6px 12px",
                    borderRadius:mobileMode?14:10,cursor:"pointer",fontFamily:"inherit",
                    fontSize:mobileMode?16:12,fontWeight:active?700:500,
                    border:`2px solid ${active?(acc.color||T.blue):T.bd}`,
                    background:active?(acc.color||T.blue)+"22":"rgba(255,255,255,0.04)",
                    color:active?(acc.color||T.blue):T.txt2,
                    boxShadow:active?`0 0 0 1px ${acc.color||T.blue}44`:"none",
                    transition:"all 0.15s",
                  }}>
                  {Li(acc.icon||"landmark",mobileMode?18:14,active?(acc.color||T.blue):T.txt2)}
                  <span>{acc.name||acc.id}</span>
                  {acc.delayDays>0&&<span style={{fontSize:mobileMode?11:9,color:T.gold,fontWeight:700,
                    background:T.gold+"22",borderRadius:4,padding:"1px 4px"}}>+{acc.delayDays}d</span>}
                  {active&&<span style={{fontSize:mobileMode?12:9,opacity:0.8}}>✓</span>}
                </button>
              );
            })}
          </div>
          {selAccId&&(()=>{const a=accounts.find(x=>x.id===selAccId);return a?(
            <div style={{color:a.color||T.blue,fontSize:mobileMode?12:9,marginTop:5,fontWeight:600}}>
              Buchungen & Ankerpunkt → {a.name}
            </div>
          ):null;})()}
        </div>
      )}

      {/* STEP: INPUT */}
      {step==="input"&&(
        <div style={{flex:1,overflowY:"auto",padding:mobileMode?20:16,
          fontSize:mobileMode?"inherit":"inherit",
          "--csv-fs": mobileMode?"18px":"12px",
          "--csv-fs-s": mobileMode?"15px":"11px",
          "--csv-fs-l": mobileMode?"22px":"14px"}}>
          <div style={{color:T.txt2,fontSize:MFSl,marginBottom:8,lineHeight:1.5}}>
            CSV-Export aus deiner Banking-App hier einfügen oder Datei laden:
          </div>
          {/* Auto-Gruppierung Toggle */}
          <div onClick={()=>setAutoGroup(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:10,padding:MPad,
              borderRadius:11,border:`1px solid ${autoGroup?T.blue+"66":T.bd}`,
              background:autoGroup?"rgba(137,196,244,0.06)":"rgba(255,255,255,0.03)",
              cursor:"pointer",marginBottom:8}}>
            <div style={{width:36,height:22,borderRadius:11,position:"relative",flexShrink:0,
              background:autoGroup?T.blue:"rgba(255,255,255,0.1)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,left:autoGroup?16:3,width:16,height:16,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <div>
              <div style={{color:autoGroup?T.blue:T.txt2,fontSize:MFSl,fontWeight:700}}>
                Zusammengehörige Zeilen automatisch gruppieren
              </div>
              <div style={{color:T.txt2,fontSize:10,lineHeight:1.4}}>
                {autoGroup
                  ? "Aktiv — Zeilen mit gleicher Rechnungs-Nr. / PP-Referenz werden zusammengefasst"
                  : "Inaktiv — jede CSV-Zeile wird als eigene Buchung importiert (empfohlen für manuelle Kontrolle)"}
              </div>
            </div>
          </div>

          {/* Verknüpfung mit bestehenden Giro-Buchungen */}
          {txs.length > 0 && (
            <div style={{marginBottom:12,borderRadius:11,border:`1px solid ${linkToGiro?T.gold+"66":T.bd}`,
              background:linkToGiro?"rgba(245,166,35,0.06)":"rgba(255,255,255,0.03)",overflow:"hidden"}}>
              {/* Toggle-Zeile */}
              <div onClick={()=>setLinkToGiro(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:10,padding:MPad,cursor:"pointer"}}>
                <div style={{width:36,height:22,borderRadius:11,position:"relative",flexShrink:0,
                  background:linkToGiro?T.warn:"rgba(255,255,255,0.1)",transition:"background 0.2s"}}>
                  <div style={{position:"absolute",top:3,left:linkToGiro?16:3,width:16,height:16,
                    borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                </div>
                <div>
                  <div style={{color:linkToGiro?T.gold:T.txt2,fontSize:MFSl,fontWeight:700}}>
                    Mit Giro-Buchungen verknüpfen
                  </div>
                  <div style={{color:T.txt2,fontSize:10}}>
                    Gleicher Betrag innerhalb ±{linkDays} Tage → automatisch verknüpfen
                  </div>
                </div>
              </div>
              {/* Tage-Slider – nur wenn aktiv */}
              {linkToGiro&&(
                <div style={{padding:"0 14px 12px",borderTop:`1px solid ${T.gold}22`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,marginTop:8}}>
                    <span style={{color:T.txt2,fontSize:10}}>Zeitspanne</span>
                    <span style={{color:T.gold,fontSize:MFSl,fontWeight:700}}>{linkDays} Tage</span>
                  </div>
                  <input type="range" min={1} max={90} value={linkDays}
                    onChange={e=>setLinkDays(Number(e.target.value))}
                    style={{width:"100%",accentColor:T.gold,cursor:"pointer"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",color:T.txt2,fontSize:9,marginTop:2}}>
                    <span>1 Tag</span>
                    <span style={{color:linkDays>=30?T.gold:T.txt2}}>30 (PayPal Später)</span>
                    <span>90 Tage</span>
                  </div>
                  <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[3,7,14,30,45,60,90].map(d=>(
                      <button key={d} onClick={()=>setLinkDays(d)}
                        style={{padding:"3px 8px",borderRadius:7,border:`1px solid ${linkDays===d?T.gold:T.bd}`,
                          background:linkDays===d?"rgba(245,166,35,0.2)":"transparent",
                          color:linkDays===d?T.gold:T.txt2,fontSize:10,cursor:"pointer",fontWeight:linkDays===d?700:400}}>
                        {d}d{d===30?"":d===3?" schnell":d===90?" max":""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ── Kontostand-Ankerpunkte ── */}
          <AnchorSection selAccId={selAccId} accounts={accounts} startBalances={startBalances}
            setStartBalances={setStartBalances} mobileMode={mobileMode} MFSl={MFSl}/>

          <label style={{display:"block",padding:"11px 14px",borderRadius:11,border:`1px solid ${T.bds}`,
            background:"rgba(137,196,244,0.08)",color:T.blue,fontSize:MFS,fontWeight:600,
            cursor:"pointer",marginBottom:10,textAlign:"left"}}>
            {Li("folder-open",14)} CSV-Datei(en) auswählen
            <input type="file" accept=".csv,.txt,text/csv" multiple style={{display:"none"}}
              onChange={e=>{
                const files=Array.from(e.target.files||[]); if(!files.length) return;
                const results=[];
                let done=0;
                files.forEach((file,i)=>{
                  const reader=new FileReader();
                  reader.onload=ev=>{
                    results[i]={text:ev.target.result, name:file.name};
                    done++;
                    if(done===files.length){
                      // Jede Datei separat mit Marker versehen
                      const combined=results.map((r,idx)=>{
                        const lines=r.text.trim().split("\n");
                        const firstLine=lines[0]||"";
                        const looksLikeHeader=!/^\d/.test(firstLine.trim()) && !/^\d{2}[./]/.test(firstLine.trim());
                        const dataLines=(idx===0||looksLikeHeader)?lines:(lines.slice(1));
                        // Ersten Datenzeilen einen Source-Marker voranstellen
                        return (idx===0?lines.join("\n"):dataLines.join("\n"));
                      }).join("\n");
                      setCsvText(combined);
                      setCsvSources(results.map(r=>r.name));
                    }
                  };
                  reader.readAsText(file,"utf-8");
                });
                e.target.value="";
              }}/>
          </label>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{flex:1,height:1,background:T.bd}}/>
            <span style={{color:T.txt2,fontSize:10}}>oder Text einfügen</span>
            <div style={{flex:1,height:1,background:T.bd}}/>
          </div>
          <textarea value={csvText} onChange={e=>setCsvText(e.target.value)}
            placeholder={"Buchungsdatum;Wertstellung;Status;Zahlungsempfänger*in;Verwendungszweck;Betrag (€)\n14.03.26;14.03.26;Gebucht;REWE;REWE SAGT DANKE;-47,30\n..."}
            style={{width:"100%",minHeight:160,background:"rgba(255,255,255,0.04)",
              border:`1px solid ${csvText?T.blue:T.bds}`,borderRadius:11,padding:"10px 12px",
              color:T.txt,fontSize:10,fontFamily:"monospace",resize:"vertical",
              outline:"none",boxSizing:"border-box",marginBottom:14}}/>
          <button onClick={doParse} disabled={!csvText.trim()}
            style={{width:"100%",padding:"10px",borderRadius:11,border:"none",
              background:csvText.trim()?"linear-gradient(135deg,#2C6E9E,#5BA3D0)":T.disabled,
              color:"#fff",fontSize:MFS,fontWeight:700,cursor:csvText.trim()?"pointer":"default",
              opacity:csvText.trim()?1:0.4}}>
            CSV analysieren →
          </button>
        </div>
      )}

      {/* STEP: REVIEW */}
      {step==="review"&&parsed&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          {/* Summary bar */}
          <div style={{background:T.surf2,padding:"10px 16px",borderBottom:`1px solid ${T.bd}`,flexShrink:0,display:"flex",gap:10,flexWrap:"wrap"}}>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.pos,fontSize:18,fontWeight:800}}>{parsed.newRows.length}</div>
              <div style={{color:T.txt2,fontSize:10}}>Neu</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.txt2,fontSize:18,fontWeight:700}}>{parsed.dupRows.length}</div>
              <div style={{color:T.txt2,fontSize:10}}>Duplikate</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.blue,fontSize:18,fontWeight:700}}>{parsed.rows.length}</div>
              <div style={{color:T.txt2,fontSize:10}}>Gesamt</div>
            </div>
            {parsed.rows.some(r=>r._paypalRows>1)&&(
              <div style={{textAlign:"center"}}>
                <div style={{color:T.gold,fontSize:18,fontWeight:800}}>
                  {parsed.rows.filter(r=>r._paypalRows>1).reduce((s,r)=>s+(r._paypalRows||1),0)}→{parsed.rows.filter(r=>r._paypalRows>1).length}
                </div>
                <div style={{color:T.txt2,fontSize:10}}>PayPal gruppiert</div>
              </div>
            )}
            <div style={{flex:1}}/>
            <div style={{color:T.txt2,fontSize:MFSl,alignSelf:"center",marginRight:8}}>
              {parsed.format}
            </div>
            {/* Toggle: Auto-Vorschläge Vergleich */}
            {(parsed.autoSuggestions||[]).length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <span style={{color:T.gold,fontSize:MFSl}}>
                  {Li("git-compare",12,T.gold)} {parsed.autoSuggestions.length} Vorschläge
                </span>
                <div onClick={()=>setShowAutoSugg(v=>!v)}
                  style={{width:40,height:24,borderRadius:12,cursor:"pointer",
                    background:showAutoSugg?T.warn:"rgba(255,255,255,0.12)",
                    position:"relative",transition:"background 0.2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,
                    left:showAutoSugg?19:3,width:18,height:18,borderRadius:"50%",
                    background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                </div>
              </div>
            )}
            {/* Toggle: Jetzt kategorisieren */}
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{color:T.txt2,fontSize:MFSl}}>Kategorisieren</span>
              <div onClick={()=>setShowCatAssign(v=>!v)}
                style={{width:40,height:24,borderRadius:12,cursor:"pointer",
                  background:showCatAssign?T.blue:"rgba(255,255,255,0.12)",
                  position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,
                  left:showCatAssign?19:3,width:18,height:18,borderRadius:"50%",
                  background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
              </div>
            </div>
          </div>

          {/* Auto-Vorschläge Vergleichspanel */}
          {showAutoSugg&&(parsed.autoSuggestions||[]).length>0&&(
            <div style={{background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",borderBottom:`1px solid ${T.gold}33`,
              padding:"10px 16px",flexShrink:0,maxHeight:220,overflowY:"auto"}}>
              <div style={{color:T.gold,fontSize:MFSl,fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                {Li("git-compare",13,T.gold)} Automatische Verknüpfungsvorschläge — nur zur Ansicht, nichts wird automatisch übernommen
              </div>
              {parsed.autoSuggestions.map((s,si)=>{
                const r = parsed.newRows[s.rowIdx];
                const confColor = s.confidence==="hoch"?T.pos:s.confidence==="mittel"?T.gold:T.txt2;
                return (
                  <div key={si} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",
                    borderBottom:`1px solid rgba(255,255,255,0.05)`}}>
                    {/* PayPal-Seite */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:T.txt,fontSize:MFSl,fontWeight:600,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.desc}</div>
                      <div style={{color:T.txt2,fontSize:9}}>{r.isoDate}</div>
                    </div>
                    {/* Pfeil + Tage-Abstand */}
                    <div style={{flexShrink:0,textAlign:"center"}}>
                      <div style={{color:confColor,fontSize:9,fontWeight:700}}>{s.confidence}</div>
                      <div style={{color:T.txt2,fontSize:9}}>±{s.diffDays}d</div>
                      {Li("arrow-right",14,confColor)}
                    </div>
                    {/* Giro-Seite */}
                    <div style={{flex:1,minWidth:0,textAlign:"right"}}>
                      <div style={{color:T.txt,fontSize:MFSl,fontWeight:600,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap",direction:"rtl"}}>{s.giroTx.desc}</div>
                      <div style={{color:T.txt2,fontSize:9}}>{s.giroTx.date} · {fmt(s.giroTx.totalAmount)}</div>
                    </div>
                    {/* Übernehmen-Button */}
                    <button onClick={()=>{
                      // Vorschlag als manuelle Verknüpfung übernehmen — nach Import
                      // Hier nur merken, wird in doImport angewendet
                      setParsed(p=>({...p,
                        acceptedSuggs: [...(p.acceptedSuggs||[]), {rowIdx:s.rowIdx, giroId:s.giroTx.id}]
                      }));
                    }}
                      disabled={(parsed.acceptedSuggs||[]).some(a=>a.rowIdx===s.rowIdx&&a.giroId===s.giroTx.id)}
                      style={{flexShrink:0,background:(parsed.acceptedSuggs||[]).some(a=>a.rowIdx===s.rowIdx)?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.06)",
                        border:`1px solid ${(parsed.acceptedSuggs||[]).some(a=>a.rowIdx===s.rowIdx)?T.pos:T.bd}`,
                        borderRadius:7,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",
                        color:(parsed.acceptedSuggs||[]).some(a=>a.rowIdx===s.rowIdx)?T.pos:T.txt2}}>
                      {(parsed.acceptedSuggs||[]).some(a=>a.rowIdx===s.rowIdx)?"✓ übernommen":"übernehmen"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {parsed.newRows.length===0?(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24}}>
              {Li("check-circle",40,T.pos)}
              <div style={{color:T.blue,fontSize:MFS,fontWeight:700}}>Alles bereits importiert</div>
              <div style={{color:T.txt2,fontSize:MFS,textAlign:"center"}}>Alle {parsed.dupRows.length} Buchungen sind bereits in deiner App vorhanden.</div>
              <button onClick={onClose} style={{padding:"12px 32px",borderRadius:11,border:"none",background:T.blue,color:T.on_accent,fontSize:MFS,fontWeight:700,cursor:"pointer",marginTop:8,fontFamily:"inherit"}}>Schließen</button>
            </div>
          ):(
            <>
              {/* ── Suche + Massenauswahl (nur wenn Kategorisieren aktiv) ── */}
              {showCatAssign&&<div style={{padding:"8px 16px 6px",flexShrink:0,display:"flex",gap:8,alignItems:"center"}}>
                <input
                  value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Suchen (Empfänger, Verwendungszweck…)"
                  style={{flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                    borderRadius:9,padding:"7px 11px",color:T.txt,fontSize:MFSl,outline:"none"}}
                />
                {search&&<button onClick={()=>setSearch("")}
                  style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:MFS,flexShrink:0}}>{Li("x",13)}</button>}
              </div>}
              {/* Massenauswahl für gefilterte Zeilen */}
              {search&&(()=>{
                const matchIdx = parsed.newRows
                  .map((r,i)=>({r,i}))
                  .filter(({r})=>{
                    const isAmt = /^[=<>]?[\d.,]+$/.test(search.trim());
                    if(isAmt) return matchAmount(Math.abs(pn(r.amount||r.totalAmount||0)), search);
                    return matchSearch(r.desc,search);
                  })
                  .map(({i})=>i);
                if(matchIdx.length===0) return null;
                return (
                  <div style={{padding:"6px 16px 8px",flexShrink:0,background:"rgba(74,159,212,0.08)",
                    borderBottom:`1px solid ${T.bd}`,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{color:T.blue,fontSize:MFSl,fontWeight:600,flexShrink:0}}>
                      {matchIdx.length} Treffer – alle auf einmal:
                    </span>
                    <div style={{flex:1,minWidth:120}}>
                      <CatPicker value={bulkCat.catId+"|"+bulkCat.subId}
                        onChange={(c,s)=>setBulkCat({catId:c,subId:s})}
                        placeholder="— Kategorie wählen —"
                        filterType={(()=>{
                          // Typ aus den Treffer-Zeilen ableiten
                          const types = matchIdx.map(i=>parsed.newRows[i]?.amount>0?"income":"expense");
                          const allIncome = types.every(t=>t==="income");
                          const allExpense = types.every(t=>t==="expense");
                          return allIncome?"income":allExpense?"expense":null;
                        })()}/>
                    </div>
                    <button
                      disabled={!bulkCat.catId}
                      onClick={()=>{
                        if(!bulkCat.catId) return;
                        setAssign(p=>{
                          const next={...p};
                          matchIdx.forEach(i=>{ next[i]={catId:bulkCat.catId,subId:bulkCat.subId}; });
                          return next;
                        });
                        setBulkCat({catId:"",subId:""});
                      }}
                      style={{background:bulkCat.catId?T.blue:T.disabled,
                        border:"none",borderRadius:8,padding:"6px 14px",color:"#fff",
                        fontSize:MFSl,fontWeight:700,cursor:bulkCat.catId?"pointer":"default",
                        opacity:bulkCat.catId?1:0.4,flexShrink:0}}>
                      Alle zuweisen ✓
                    </button>
                  </div>
                );
              })()}
              <div style={{color:T.txt2,fontSize:MFSl,padding:"6px 16px 4px",flexShrink:0}}>
                {showCatAssign
                  ? (search
                      ? `${parsed.newRows.filter(r=>matchSearch(r.desc,search)).length} von ${parsed.newRows.length} Buchungen`
                      : "Kategorie zuweisen – die App merkt sich die Regel für gleiche Empfänger:")
                  : `${parsed.newRows.length} Buchungen werden ohne Kategorie importiert – du kannst sie später unter Erfassen → Buchungen kategorisieren.`}
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {parsed.newRows.filter(r=>{
                  if(!search) return true;
                  const isAmt = /^[=<>]?[\d.,]+$/.test(search.trim());
                  if(isAmt) return matchAmount(Math.abs(pn(r.amount||r.totalAmount||0)), search);
                  return matchSearch(r.desc,search);
                }).map((r,i)=>{
                  // Get original index for assign
                  const origIdx = parsed.newRows.indexOf(r);
                  const a = assign[origIdx]||{catId:"",subId:""};
                  const isPos = r.amount > 0;
                  return (
                    <div key={origIdx} style={{padding:"8px 16px",borderBottom:`1px solid ${T.bd}`,background:origIdx%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:showCatAssign?4:0}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:T.txt,fontSize:MFSl,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.desc}</div>
                          <div style={{color:T.txt2,fontSize:10,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                            <span>{r.isoDate}</span>
                            {r._paypalRows>1&&<span style={{color:T.gold,fontSize:9,fontWeight:700,
                              background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",borderRadius:4,padding:"0 4px"}}>
                              {r._paypalRows} Zeilen zusammengefasst{r._paypalTypes?" · "+r._paypalTypes:""}
                            </span>}
                            {r._detailNote&&<span style={{color:T.blue,fontSize:9,fontWeight:600,
                              background:"rgba(74,159,212,0.1)",borderRadius:4,padding:"0 4px"}}>
                              📋 {r._detailNote.slice(0,60)}{r._detailNote.length>60?"…":""}
                            </span>}
                          </div>
                        </div>
                        <div style={{color:isPos?T.pos:T.neg,fontSize:MFS,fontWeight:700,fontFamily:"monospace",flexShrink:0,whiteSpace:"nowrap"}}>
                          {isPos?"+ ":"− "}{Math.abs(r.amount).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                        </div>
                      </div>
                      {showCatAssign&&(()=>{
                        const rowAccId = r._resolvedAccId || selAccId || accounts[0]?.id;
                        const rowAcc = accounts.find(a=>a.id===rowAccId);
                        const isTgAcc = rowAcc?.name?.toLowerCase().includes("tagesgeld") || rowAccId?.includes("tagesgeld");
                        // Wichtig: filterType nach Vorzeichen, accountId für Konto-spezifische Gruppen.
                        // "tagesgeld" als filterType wäre zu eng (filtert nur Gruppen mit type/behavior==="tagesgeld").
                        const fType = isPos ? "income" : "expense";
                        return <CatPicker
                          value={a.catId+"|"+a.subId}
                          onChange={(catId,subId)=>setRowAssign(origIdx,catId,subId)}
                          placeholder={isTgAcc?"— Tagesgeld-Kategorie —":isPos?"— Einnahmen-Kategorie —":"— Ausgaben-Kategorie —"}
                          filterType={fType}
                          accountId={rowAccId}
                        />;
                      })()}
                    </div>
                  );
                })}
              </div>
              <div style={{padding:"12px 16px",flexShrink:0,borderTop:`1px solid ${T.bd}`,display:"flex",gap:8}}>
                <button onClick={()=>setStep("input")}
                  style={{flex:1,padding:"12px",borderRadius:11,border:`1px solid ${T.bds}`,background:"transparent",color:T.txt2,fontSize:MFS,cursor:"pointer"}}>
                  ← Zurück
                </button>
                <button onClick={doImport}
                  style={{flex:2,padding:"12px",borderRadius:11,border:"none",
                    background:T.pos,color:T.on_accent,fontSize:MFS,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {parsed.newRows.length} Buchungen importieren {showCatAssign?"mit Kategorien ✓":"→"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP: DONE */}
      {step==="done"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24,overflowY:"auto"}}>
          {Li("check-circle",48,T.pos)}
          <div style={{color:T.txt,fontSize:20,fontWeight:800}}>{doneCount} Buchungen importiert!</div>
          <div style={{color:T.txt2,fontSize:MFS,textAlign:"center"}}>Die Buchungen sind jetzt in deiner App. Kategorieregeln wurden für zukünftige Importe gespeichert.</div>

          {/* Erkannte Kontostände wurden als Ankerpunkte gesetzt */}
          {(() => {
            const dbs = (parsed?.detectedBalances && parsed.detectedBalances.length)
              ? parsed.detectedBalances
              : (parsed?.detectedBalance?.date ? [parsed.detectedBalance] : []);
            if(dbs.length === 0) return null;
            const isMulti = dbs.length > 1;
            return (
              <div style={{background:"rgba(170,204,0,0.10)",border:"1px solid rgba(170,204,0,0.35)",
                borderRadius:11,padding:MPad,width:"100%",maxWidth:380,display:"flex",gap:10,alignItems:"flex-start"}}>
                {Li("landmark",16,T.pos)}
                <div style={{flex:1}}>
                  <div style={{color:T.pos,fontSize:MFSl,fontWeight:700,marginBottom:2}}>
                    {isMulti ? `${dbs.length} Kontostand-Ankerpunkte gesetzt` : "Kontostand-Ankerpunkt gesetzt"}
                  </div>
                  <div style={{color:T.txt2,fontSize:MFSl,lineHeight:1.5}}>
                    {isMulti ? "Aus der CSV wurden folgende Kontostände automatisch als Ankerpunkte gespeichert:" : "Aus der CSV wurde der Kontostand vom "}
                    {!isMulti && (<>
                      <span style={{color:T.txt,fontWeight:700}}>
                        {dbs[0].date.split("-").reverse().join(".")}
                      </span>{" "}
                      (<span style={{color:T.pos,fontFamily:"monospace",fontWeight:700}}>
                        {dbs[0].saldo.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                      </span>) automatisch als Ankerpunkt gespeichert.
                    </>)}
                  </div>
                  {isMulti && (
                    <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
                      {dbs.map((db,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:MFSl}}>
                          <span style={{color:T.txt,fontWeight:600}}>{db.date.split("-").reverse().join(".")}</span>
                          <span style={{color:T.pos,fontFamily:"monospace",fontWeight:700}}>
                            {db.saldo.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Warnung: Vormonat-Ankerpunkt fehlt */}
          {anchorWarning && (
            <div style={{background:"rgba(245,166,35,0.10)",border:"1px solid rgba(245,166,35,0.4)",
              borderRadius:11,padding:MPad,width:"100%",maxWidth:380,display:"flex",gap:10,alignItems:"flex-start"}}>
              {Li("alert-triangle",16,T.gold)}
              <div style={{flex:1}}>
                <div style={{color:T.gold,fontSize:MFSl,fontWeight:700,marginBottom:3}}>
                  Kontostand für Vormonat fehlt
                  {anchorWarning.accName&&<span style={{color:T.gold,fontWeight:400,marginLeft:4,fontSize:10}}>({anchorWarning.accName})</span>}
                </div>
                <div style={{color:T.txt2,fontSize:MFSl,lineHeight:1.6}}>
                  Die früheste importierte Buchung stammt aus{" "}
                  <span style={{color:T.txt,fontWeight:700}}>
                    {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.firstMonth]} {anchorWarning.firstYear}
                  </span>.
                  Damit der Kontostand{anchorWarning.accName?` (${anchorWarning.accName})`:""} ab diesem Monat korrekt berechnet werden kann, wird der
                  Endkontostand von{" "}
                  <span style={{color:T.txt,fontWeight:700}}>
                    {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.prevMonth]} {anchorWarning.prevYear}
                  </span>{" "}
                  benötigt.
                </div>
                <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{color:T.txt2,fontSize:10,display:"flex",gap:6,alignItems:"flex-start"}}>
                    <span style={{color:T.gold,flexShrink:0}}>①</span>
                    <span>Den Endkontostand von{" "}
                      <span style={{color:T.txt,fontWeight:600}}>
                        {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.prevMonth]} {anchorWarning.prevYear}
                      </span>{" "}
                      oben unter <span style={{color:T.blue,fontWeight:600}}>Kontostand-Ankerpunkte</span> eintragen (Konto: {anchorWarning.accName||"gewähltes Konto"}).
                    </span>
                  </div>
                  <div style={{color:T.txt2,fontSize:10,display:"flex",gap:6,alignItems:"flex-start"}}>
                    <span style={{color:T.gold,flexShrink:0}}>②</span>
                    <span>Oder: Den CSV-Export für{" "}
                      <span style={{color:T.txt,fontWeight:600}}>
                        {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.prevMonth]} {anchorWarning.prevYear}
                      </span>{" "}
                      importieren — der Kontostand wird dann automatisch erkannt.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={()=>{setCsvText("");setParsed(null);setStep("input");setAnchorWarning(null);}}
            style={{padding:"12px 24px",borderRadius:11,border:`1px solid ${T.bds}`,background:"transparent",color:T.blue,fontSize:MFS,fontWeight:600,cursor:"pointer"}}>
            Weiteren Import
          </button>
          <button onClick={onClose}
            style={{padding:"12px 32px",borderRadius:11,border:"none",background:T.blue,color:"#fff",fontSize:MFS,fontWeight:700,cursor:"pointer"}}>
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}



// ══════════════════════════════════════════════════════════════════════
// QuickPicker – Schnellwahl verwalten mit allen Lucide-Icons
// ══════════════════════════════════════════════════════════════════════

export { CsvImportScreen };
