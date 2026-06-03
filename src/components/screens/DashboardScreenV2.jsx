// Auto-generated module (siehe app-src.jsx)

import React, { Fragment, useContext, useMemo, useState } from "react";
import { Overlay } from "../atoms/Overlay.jsx";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { BudgetEditorModal } from "../organisms/BudgetEditorModal.jsx";
import { IconPickerDialog } from "../organisms/IconPickerDialog.jsx";
import { KontoWarnungWidget } from "../organisms/KontoWarnungWidget.jsx";
import { PendingList } from "../organisms/PendingList.jsx";
import { SaldoHero2 } from "../organisms/SaldoHero2.jsx";
import { SaldoPrognose } from "../organisms/SaldoPrognose.jsx";
import { TagesgeldWidget } from "../organisms/TagesgeldWidget.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { groupBudgetPairs, budgetOpenRestFor } from "../../utils/budgets.js";
import { dayOf, drillSort, fmt, pn, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchAmount, matchSearch } from "../../utils/search.js";
import { txFingerprint, isDuplCounterpart, buildTxIdMap } from "../../utils/tx.js";
import { saldoAt, budgetPlaceholderActive } from "../../utils/saldo.js";

function DashboardScreenV2() {
  const { cats,setCats,groups,setGroups,txs,setTxs,accounts,setAccounts,
    yearData,setYearData,year,setYear,month,setMonth,selAcc,setSelAcc,isLand,
    col3Name,setCol3Name,modal,setModal,mgmtCat,setMgmtCat,
    editTx,setEditTx,newTx,setNewTx,newCat,setNewCat,
    newSubName,setNewSubName,exportModal,setExportModal,
    getCat,getSub,txType,getActualSum,getBudgetForMonth,getTotalIncome,getTotalExpense,getKumulierterSaldo,getPrognoseSaldoDetail,getProgEndeAccGlobal,getPendingSum,pendingItemsFor,
    _txsInMonth, _txsInMonthCat, _txsInMonthCatSub,
    getJV,setJV,getMV,setMV,getAcc,openEdit,saveEdit,deleteFromEdit,
    updEditSplit,moveCat,moveSub,updateSub,updateCat,
    renameCat,renameSub,deleteCat,deleteSub,saveNewCat,saveNewSub,
    moveAcc,
    addSplit,removeSplit,updSplit,splitTotal,splitDiff,txValid,saveTx,
    onTS,onTE,
    budgets={},
    setShowMatching,
    setDashDrillOpen,
  } = useContext(AppCtx);

    const _isSelAcc = t => !selAcc || t.accountId===selAcc || (!t.accountId && selAcc==="acc-giro");
    // Index für schnelle _linkedTo-Partner-Lookup (für Sparen-Transfer-Erkennung)
    const _txsById = useMemo(()=>buildTxIdMap(txs), [txs]);

    // PERFORMANCE-FIX: Group-Lookup-Map und Cat-Behavior-Resolver.
    // Cats haben typischerweise type="grp-xyz" als Referenz auf eine Group.
    // Die Group enthält behavior ("income"/"expense"/"tagesgeld") und accountId.
    // Frühere Logik (c.type==="income"||c.type==="tagesgeld") matchte NUR die alten,
    // direkt-typisierten Cats — moderne Group-basierte Tagesgeld-Cats fielen raus.
    const _groupMap = useMemo(()=>{
      const m = new Map();
      (groups||[]).forEach(g => m.set(g.type, g));
      return m;
    }, [groups]);
    const _catBehavior = (c) => {
      // 1) Cat hat direkt einen Klartext-Type → behavior daraus
      if(c.type==="income" || c.type==="expense" || c.type==="tagesgeld") return c.type;
      // 2) Cat referenziert eine Group → behavior aus der Group
      const g = _groupMap.get(c.type);
      if(g) return g.behavior || g.type || null;
      return null;
    };
    const _isCatIncomeOrTagesgeld = (c) => {
      const b = _catBehavior(c);
      return b==="income" || b==="tagesgeld";
    };
    const _isCatExpense = (c) => _catBehavior(c)==="expense";
    const _isDupl  = t => isDuplCounterpart(t, _txsById);
    const [dashDrill, _setDashDrill] = useState(null);
    // Wrapper: synct dashDrillOpen in FinanzApp für TopBar-zIndex
    const setDashDrill = (v) => { _setDashDrill(v); setDashDrillOpen(!!v); };
    // Verknüpfte-Vormerkung-Badge(s) für eine echte Buchung — identisch in allen
    // Drilldown-Zeilen, damit eine zugeordnete Vormerkung ueberall erkennbar ist
    // (auch bei Tagesgeld-Kategorien ohne Unterkategorien).
    const LinkBadges = ({tx}) => {
      if(!(tx.linkedIds||[]).length) return null;
      return (tx.linkedIds||[]).map(lid=>{
        const lt=txs.find(t=>t.id===lid);
        if(!lt||lt.pending) return null;
        const sTotal = lt._seriesTotal;
        const sIdx = lt._seriesIdx;
        return (
          <span key={lid} style={{display:"inline-flex",alignItems:"center",gap:3,
            background:"rgba(74,159,212,0.12)",border:`1px solid ${T.blue}33`,
            borderRadius:5,padding:"1px 5px",fontSize:9,color:T.blue}}>
            {Li("link",9,T.blue)}
            {lt.desc||"Vormerkung"}
            {sTotal>1&&` · ${sIdx}/${sTotal}`}
          </span>
        );
      });
    };
    const [detailsOpen, setDetailsOpen] = useState(false);
    // Ausklappbarer Buchungstext im Drilldown (iPhone-13-mini: Text wird sonst
    // abgeschnitten). Nur Anfang zeigen, auf Tipp den vollen Text anzeigen.
    const [expandedDescIds, setExpandedDescIds] = useState(()=>new Set());
    const toggleDesc = (id) => setExpandedDescIds(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
    const renderDesc = (tx, {color=T.txt, size=12, weight=600, fallback="Buchung"}={}) => {
      const full = tx.desc || fallback;
      const isLong = full.length > 26;
      const exp = expandedDescIds.has(tx.id);
      if(!isLong) return (
        <div style={{color,fontSize:size,fontWeight:weight,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{full}</div>
      );
      return (
        <div onClick={(e)=>{e.stopPropagation();toggleDesc(tx.id);}}
          style={{display:"flex",alignItems:exp?"flex-start":"center",gap:4,cursor:"pointer"}}>
          <div style={{flex:1,minWidth:0,color,fontSize:size,fontWeight:weight,
            ...(exp?{whiteSpace:"normal",wordBreak:"break-word"}:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"})}}>
            {full}
          </div>
          <span style={{flexShrink:0,display:"inline-flex"}}>{Li(exp?"chevron-up":"chevron-down",12,T.blue)}</span>
        </div>
      );
    };
    // activePanel: null | "warnings" | "sparen" | "vormerkungen"
    const [activePanel, setActivePanel] = useState(null);
    const [warnCount, setWarnCount] = useState(0);
    const isPastMonth = useMemo(()=>{
      const t = new Date();
      return year < t.getFullYear() || (year === t.getFullYear() && month < t.getMonth());
    }, [year, month]);
    // Hero-Prognose-Drilldown: null | "Mitte" | "Ende"
    const [heroProgDrill, setHeroProgDrill] = useState(null);
    const [expandedSplitId, setExpandedSplitId] = useState(null);
    const [drillExpandedSub, setDrillExpandedSub] = useState(null);
    // Inline ausgeklappte Hauptkategorien (Home-Karten) → zeigt Unterkategorien direkt
    const [expandedCats, setExpandedCats] = useState(()=>new Set());
    const toggleCatExpand = (id) => setExpandedCats(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
    const [budgetEditSub, setBudgetEditSub] = useState(null);
    const [budgetEditKey, setBudgetEditKey] = useState(0);
    const openBudgetEdit = (sub) => { setBudgetEditSub(sub); setBudgetEditKey(k=>k+1); };
    const [dashIconPick, setDashIconPick] = useState(null);
    const [catSortMode, setCatSortMode] = useState("custom"); // "desc" | "asc" | "custom"
    const [dragCatId,   setDragCatId]   = useState(null);
    const [dragOver,    setDragOver]    = useState(null);
    const [dashSearch, setDashSearch] = useState("");
    const [showDupDetail,   setShowDupDetail]   = useState(false);
    const [showMismatch,    setShowMismatch]    = useState(false);
    const [showAllMismatch, setShowAllMismatch] = useState(false);
    const dashLinkedChildIds = useMemo(()=>{
      const s = new Set();
      txs.forEach(t=>(t.linkedIds||[]).forEach(id=>s.add(id)));
      return s;
    },[txs]);
    const mTxs    = useMemo(()=>txs.filter(t=>{ const d=new Date(t.date); return d.getFullYear()===year&&d.getMonth()===month&&!t.pending&&!_isDupl(t)&&!dashLinkedChildIds.has(t.id)&&_isSelAcc(t); }), [txs,year,month,selAcc]);
    const pTxs    = useMemo(()=>txs.filter(t=>{ const d=new Date(t.date); return d.getFullYear()===year&&d.getMonth()===month&&t.pending&&_isSelAcc(t); }), [txs,year,month,selAcc]);

    // PERFORMANCE-FIX: vorab pro Kategorie/Sub aggregierte Maps. Vorher liefen in
    // der Cat-Schleife (Z654, 666, 675, 691, 747, 778, 809, 819, …) je 1–4
    // `txs.filter(t => date in y/m && (splits).some(catId===cat.id))` über alle
    // 10000+ txs. Bei 30 Cats × 4 Filter × 12k = 1,4 Mio Iterationen pro Render.
    // Jetzt: 1× Durchlauf über _txsInMonth(year,month) (eingeschränkter Index) und
    // wir bauen Maps für (catId → liste real / liste pending / sum_total / sum_bis_tag).
    const _catTxMaps = useMemo(()=>{
      const realByCat   = new Map();
      const pendByCat   = new Map();
      const sumRealByCat= new Map();
      const sumPendByCat= new Map();
      const sumByDayCat = new Map();
      const accIdsByCat = new Map();   // catId → Set<accountId> (für "Konto in Klammern")
      // Pro-Sub aggregierte Ist-Summen (real + konkrete VM, ohne Budget-Platzhalter)
      // für die budget-bewusste Mitte/Ende-Prognose (restMitte/restEnde je Cat).
      const sumSub14   = new Map();    // subId → Ist(1..14)
      const sumSubAll  = new Map();    // subId → Ist(1..Monatsletzter)
      const monthTxs = _txsInMonth(year, month);
      for(const t of monthTxs) {
        if(_isDupl(t)) continue;
        if(!_isSelAcc(t)) continue;
        const isPend = !!t.pending;
        if(isPend && t._budgetSubId) continue;
        const splits = t.splits || [];
        const seenCats = new Set();
        const d = new Date(t.date);
        const day = d.getDate();
        const accId = t.accountId || "acc-giro";
        for(const sp of splits) {
          if(!sp.catId || seenCats.has(sp.catId)) continue;
          seenCats.add(sp.catId);
          const cid = sp.catId;
          if(isPend) {
            let l = pendByCat.get(cid); if(!l){l=[];pendByCat.set(cid,l);} l.push(t);
          } else {
            let l = realByCat.get(cid); if(!l){l=[];realByCat.set(cid,l);} l.push(t);
          }
          // Konto-Set pro Cat
          let s = accIdsByCat.get(cid); if(!s){s=new Set();accIdsByCat.set(cid,s);} s.add(accId);
        }
        const catAmts = new Map();
        for(const sp of splits) {
          if(!sp.catId) continue;
          catAmts.set(sp.catId, (catAmts.get(sp.catId)||0) + Math.abs(pn(sp.amount)));
        }
        for(const [cid, amt] of catAmts) {
          if(isPend) sumPendByCat.set(cid, (sumPendByCat.get(cid)||0) + amt);
          else       sumRealByCat.set(cid, (sumRealByCat.get(cid)||0) + amt);
          const k = cid + "|" + day;
          sumByDayCat.set(k, (sumByDayCat.get(k)||0) + amt);
        }
        // Pro-Sub-Ist (für budget-bewusste Reservierung); gleiche Quelle wie sumByDayCat
        for(const sp of splits) {
          if(!sp.subId) continue;
          const a = Math.abs(pn(sp.amount));
          sumSubAll.set(sp.subId, (sumSubAll.get(sp.subId)||0) + a);
          if(day<=14) sumSub14.set(sp.subId, (sumSub14.get(sp.subId)||0) + a);
        }
      }
      return { realByCat, pendByCat, sumRealByCat, sumPendByCat, sumByDayCat, accIdsByCat, sumSub14, sumSubAll };
    }, [txs, year, month, selAcc]);

    // Schneller calcIncome(maxDay)-Lookup pro Cat — Ersatz für die teure
    // txs.filter(...maxDay)-Schleife auf Z666.
    const _catSumUpToDay = (catId, maxDay) => {
      let sum = 0;
      for(let d=1; d<=maxDay; d++) {
        sum += _catTxMaps.sumByDayCat.get(catId + "|" + d) || 0;
      }
      return sum;
    };

    // Kurze Konto-Bezeichnung für die Klammer hinter dem Cat-Namen in Gesamt-Ansicht.
    // Heuristik: 1 Konto → Kontoname; 2 Konten → "Name1+Name2"; mehr → "(N Konten)".
    const _accLabelByCat = useMemo(()=>{
      const out = new Map();
      const accNameById = new Map((accounts||[]).map(a => [a.id, a.name||a.id]));
      const shortName = (id) => {
        const n = accNameById.get(id) || id;
        return n.replace(/^DKB[\s-]*/i,"").trim() || n;
      };
      _catTxMaps.accIdsByCat.forEach((set, catId) => {
        const arr = [...set];
        if(arr.length===1)      out.set(catId, shortName(arr[0]));
        else if(arr.length===2) out.set(catId, arr.map(shortName).join("+"));
        else                    out.set(catId, `${arr.length} Konten`);
      });
      return out;
    }, [_catTxMaps, accounts]);
    const pendOpenAmt = t => t.totalAmount;
    // Offenes Restbudget pro Budget-Platzhalter (für die Offene-Vormerkungen-Liste).
    const budgetOpenRest = React.useCallback(
      (tx)=>budgetOpenRestFor(tx, txs, _txsById, year, month),
      [txs, _txsById, year, month]);
    const totalIn = useMemo(()=>getTotalIncome(year, month),  [year,month,txs]);
    const totalOut= useMemo(()=>getTotalExpense(year, month), [year,month,txs]);
    const pTxsOut = useMemo(()=>pTxs.filter(t=>budgetPlaceholderActive(t)&&(txType(t)==="expense"||(t._csvType==="expense"&&!txType(t)==="income"))), [pTxs]);
    const pTxsIn  = useMemo(()=>pTxs.filter(t=>budgetPlaceholderActive(t)&&(txType(t)==="income"||(t._csvType==="income"))), [pTxs]);
    const pendingOut= useMemo(()=>pTxsOut.reduce((s,t)=>s+pendOpenAmt(t),0), [pTxsOut]);
    const pendingIn = useMemo(()=>pTxsIn.reduce((s,t)=>s+pendOpenAmt(t),0),  [pTxsIn]);

    const getPendingIncomeSum = useMemo(()=>(catId) => txs.filter(t=>{
      if(!t.pending||t._budgetSubId) return false;
      // CSV-Doppler raus; Sparen-Transfers (Partner auf anderem Konto) bleiben drin
      if(_isDupl(t)) return false;
      if(!_isSelAcc(t)) return false;
      const d=new Date(t.date);
      return d.getFullYear()===year&&d.getMonth()===month&&
        (t.splits||[]).some(sp=>sp.catId===catId);
    }).reduce((s,t)=>s+(t.splits||[]).filter(sp=>sp.catId===catId)
      .reduce((ss,sp)=>ss+Math.abs(pn(sp.amount)),0),0), [txs,year,month,selAcc]);

    // PERFORMANCE-FIX: gemeinsamer Subsumme-Index für catTotals/incomeTotals.
    // Vorher pro sub ein txs.filter (O(subs × txs)) — bei 10k+ Buchungen und 60+ Subs
    // = 600k+ Iterationen pro Render. Jetzt einmalig O(txs).
    // Nur aktiv wenn selAcc gesetzt — sonst nutzt der Code getActualSum (das eigene Caches hat).
    const _subSumByAcc = useMemo(()=>{
      if(!selAcc) return null;
      const idx = Object.create(null);
      for(const t of txs) {
        if(t.pending) continue;
        if(_isDupl(t)) continue;
        if(!_isSelAcc(t)) continue;
        const d = new Date(t.date);
        if(d.getFullYear()!==year || d.getMonth()!==month) continue;
        const splits = t.splits||[];
        for(const sp of splits) {
          if(!sp.subId) continue;
          idx[sp.subId] = (idx[sp.subId]||0) + Math.abs(sp.amount||0);
        }
      }
      return idx;
    }, [txs, year, month, selAcc, _txsById]);

    const catTotals = useMemo(()=>{
      if(window.MBT_DEBUG?.disable_cattotals) return [];
      return cats.filter(_isCatExpense)
      .map(c=>{
        const subSum = (c.subs||[]).reduce((s,sub)=>{
          if(!selAcc) return s+getActualSum(year,month,sub.id);
          return s + (_subSumByAcc?.[sub.id]||0);
        },0);
        const finPend = txs.filter(t=>t.pending&&t._seriesTyp==="finanzierung"&&!_isDupl(t)&&!t._budgetSubId&&
          _isSelAcc(t)&&
          (()=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()===month;})()&&
          (t.splits||[]).some(sp=>(c.subs||[]).some(sub=>sub.id===sp.subId))
        ).reduce((s,t)=>s+Math.abs(t.totalAmount||0),0);
        // Flat-Cat-Fallback: bei Cats ohne Subs direkt die Cat-Ebene nutzen.
        // Typischer Fall: Tagesgeld-Ausgabe-Cats wie "Belastung" haben oft keine Subs.
        const directCatSum = _catTxMaps.sumRealByCat.get(c.id) || 0;
        const sum = (!c.subs || c.subs.length===0)
          ? directCatSum + finPend
          : subSum + finPend;
        return {...c, sum};
      })
      .filter(c=>{
        if(c.sum>0 && !selAcc) return true;
        const hasBudget=(!selAcc||selAcc==="acc-giro")&&(c.subs||[]).some(sub=>getBudgetForMonth(sub.id,year,month)>0);
        const hasPend=txs.some(t=>t.pending&&!_isDupl(t)&&!t._budgetSubId&&
          _isSelAcc(t)&&
          (()=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()===month;})()&&
          (t.splits||[]).some(sp=>sp.catId===c.id));
        const hasRealTx=txs.some(t=>!t.pending&&!_isDupl(t)&&
          _isSelAcc(t)&&
          (()=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()===month;})()&&
          (t.splits||[]).some(sp=>sp.catId===c.id));
        if(selAcc) return hasPend||hasRealTx;
        return hasBudget||hasPend||hasRealTx;
      }).sort((a,b)=>{
        if(catSortMode==="asc")  return a.sum-b.sum;
        if(catSortMode==="custom") return 0;
        return b.sum-a.sum;
      });
    }, [txs,year,month,selAcc,cats,catSortMode,budgets,_catTxMaps]);

    const incomeTotals = useMemo(()=>{
      if(window.MBT_DEBUG?.disable_cattotals) return [];
      return cats.filter(_isCatIncomeOrTagesgeld)
      .map(c=>{
        // Cat-Sum aus den Subs aggregieren (Standard-Fall, wie bei Giro mit Subs).
        const subSum = (c.subs||[]).reduce((s,sub)=>{
          if(!selAcc) return s+getActualSum(year,month,sub.id);
          return s + (_subSumByAcc?.[sub.id]||0);
        },0);
        // Flat-Cat-Fallback: Wenn die Cat keine Subs hat (typisch Tagesgeld-Cats),
        // gibt's keinen sub-Aggregat-Wert — dann direkt die Cat-Ebene nutzen.
        // Bei Cats MIT Subs aber unkategorisierten direkten Splits (Edge-Case)
        // auch addieren, damit nichts verloren geht.
        const directCatSum = _catTxMaps.sumRealByCat.get(c.id) || 0;
        const sum = (!c.subs || c.subs.length===0)
          ? directCatSum + getPendingIncomeSum(c.id)
          : subSum + getPendingIncomeSum(c.id);
        return {...c, sum};
      })
      .filter(c=>{
        if(c.sum>0 && !selAcc) return true;
        const hasPend=txs.some(t=>t.pending&&!_isDupl(t)&&!t._budgetSubId&&
          _isSelAcc(t)&&
          (()=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()===month;})()&&
          (t.splits||[]).some(sp=>sp.catId===c.id));
        const hasRealTx=txs.some(t=>!t.pending&&!_isDupl(t)&&
          _isSelAcc(t)&&
          (()=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()===month;})()&&
          (t.splits||[]).some(sp=>sp.catId===c.id));
        return hasPend||hasRealTx;
      }).sort((a,b)=>{
        if(catSortMode==="asc")  return a.sum-b.sum;
        if(catSortMode==="custom") return 0;
        return b.sum-a.sum;
      });
    }, [txs,year,month,selAcc,cats,catSortMode,_catTxMaps]);

    const _dashNowY=new Date().getFullYear(),_dashNowM=new Date().getMonth();
    const _isCurH=year===_dashNowY&&month===_dashNowM, _isFutH=year>_dashNowY||(year===_dashNowY&&month>_dashNowM);
    // Konto-Filter für Drilldown-Detail (siehe MonatScreen).
    // Zusätzlich werden verlinkte Vormerkungen ausgefiltert: wenn eine echte
    // Buchung eine Vormerkung "zugewiesen" wurde (echte Buchung trägt _linkedTo),
    // sollte die Vormerkung nicht mehr in der Liste auftauchen.
    const _dashTxIdMap = buildTxIdMap(txs);
    const _dashLinkedPendIds = new Set();
    (txs||[]).forEach(t => {
      if(!t.pending && t._linkedTo) _dashLinkedPendIds.add(t._linkedTo);
    });
    const _filterDetailByAccD = (det, sa) => {
      if(!det) return det;
      const accMatchOrAny = (t) => !sa || (t.accountId || "acc-giro") === sa;
      const dropLinkedPend = (t) => !_dashLinkedPendIds.has(t.id);
      const dropDuplReal   = (t) => !isDuplCounterpart(t, _dashTxIdMap);
      // Budget-Entries auch filtern: realTxs (echte Buchungen) und concTxs (Pendings)
      // sind eigene Listen pro Budget-Kategorie. Ex-Vormerkungen mit _linkedTo
      // landen hier wenn sie eine Sub-Kategorie haben — z.B. Sharkoon → Unvorhergesehenes.
      const filterBudgetEntry = (be) => {
        if(!be) return be;
        return {
          ...be,
          realTxs: (be.realTxs || []).filter(accMatchOrAny).filter(dropDuplReal),
          concTxs: (be.concTxs || []).filter(accMatchOrAny).filter(dropLinkedPend),
        };
      };
      const budgetEntries = sa && sa !== "acc-giro"
        ? []
        : (det.budgetEntries || []).map(filterBudgetEntry);
      const unbudgetedPend = (det.unbudgetedPend || [])
        .filter(accMatchOrAny)
        .filter(dropLinkedPend);
      const unbudgetedRealTxs = (det.unbudgetedRealTxs || [])
        .filter(accMatchOrAny)
        .filter(dropDuplReal);
      const overBudgetWarnings = sa && sa !== "acc-giro"
        ? []
        : (det.overBudgetWarnings || []);
      return { ...det, budgetEntries, unbudgetedPend, unbudgetedRealTxs, overBudgetWarnings };
    };
    const dashDetailMitte = useMemo(()=>{
      if(window.MBT_DEBUG?.disable_progdetail) return null;
      const _ctx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
      const newSaldo = saldoAt(year, month, 14, selAcc, _ctx);
      const newBase  = saldoAt(year, month, 0,  selAcc, _ctx);
      const base = getPrognoseSaldoDetail(year, month, true);
      if(!base) return { saldo: newSaldo, base: newBase, budgetEntries: [], unbudgetedRealTxs: [], unbudgetedPend: [] };
      const filtered = _filterDetailByAccD(base, selAcc);
      return { ...filtered, saldo: newSaldo, base: newBase };
    },  [year, month, txs, selAcc, accounts]);

    const dashDetailEnde  = useMemo(()=>{
      if(window.MBT_DEBUG?.disable_progdetail) return null;
      const _ctx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
      const lastDay = new Date(year, month + 1, 0).getDate();
      const newSaldo = saldoAt(year, month, lastDay, selAcc, _ctx);
      const newBase  = saldoAt(year, month, 0,       selAcc, _ctx);
      const base = getPrognoseSaldoDetail(year, month, false);
      if(!base) return { saldo: newSaldo, base: newBase, budgetEntries: [], unbudgetedRealTxs: [], unbudgetedPend: [] };
      const filtered = _filterDetailByAccD(base, selAcc);
      return { ...filtered, saldo: newSaldo, base: newBase };
    }, [year, month, txs, selAcc, accounts]);
    const dashRealIn  = useMemo(()=>mTxs.filter(t=>!t.pending&&txType(t)==="income" &&!dashLinkedChildIds.has(t.id)), [mTxs]);
    const dashRealOut = useMemo(()=>mTxs.filter(t=>!t.pending&&txType(t)==="expense"&&!dashLinkedChildIds.has(t.id)), [mTxs]);
    const dashUIn     = useMemo(()=>mTxs.filter(t=>txType(t)==="income" &&!dashLinkedChildIds.has(t.id)&&((t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId))), [mTxs]);
    const dashUOut    = useMemo(()=>mTxs.filter(t=>txType(t)==="expense"&&!dashLinkedChildIds.has(t.id)&&((t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId))), [mTxs]);
    // Buchungen aus derselben CSV (gleicher _csvSource) werden nie als Duplikat gewertet
    const dupGroups = {};
    mTxs.forEach(t=>{
      const fp = t._fp || txFingerprint(t.date, Math.abs(t.totalAmount), t.desc);
      if(!dupGroups[fp]) dupGroups[fp]=[];
      dupGroups[fp].push(t);
    });
    // Nur als Duplikat werten wenn Buchungen aus VERSCHIEDENEN Quellen kommen
    // oder wenn keine Quelle bekannt ist (alte Buchungen) UND Fingerprint identisch
    const dupKeys = Object.keys(dupGroups).filter(k=>{
      const group = dupGroups[k];
      if(group.length < 2) return false;
      // Wenn alle Buchungen aus derselben CSV-Quelle kommen → kein Duplikat
      const sources = group.map(t=>t._csvSource||"").filter(Boolean);
      if(sources.length === group.length) {
        // Alle haben eine Quelle — nur Duplikat wenn verschiedene Quellen
        const uniqueSources = new Set(sources);
        return uniqueSources.size > 1;
      }
      // Keine oder gemischte Quellen → als Duplikat werten (alter Import)
      return true;
    });
    const dupCount = dupKeys.reduce((s,k)=>s+dupGroups[k].length-1,0);
    const dupAmount = dupKeys.reduce((s,k)=>{
      const g=dupGroups[k];
      return s+(g.length-1)*Math.abs(g[0].totalAmount);
    },0);

    // Vorzeichen-Fehlzuordnung: negative Buchung mit Einnahmen-Kategorie oder umgekehrt
    const mismatchTxs = txs.filter(t=>{
      if(t.pending) return false;
      const splits = (t.splits||[]).filter(s=>s.catId);
      if(!splits.length) return false;
      const cat = getCat(splits[0].catId);
      if(!cat) return false;
      const isNegative = t.totalAmount < 0 || t._csvType==="expense";
      const isPositive = t.totalAmount > 0 && t._csvType!=="expense";
      const catIsIncome = _isCatIncomeOrTagesgeld(cat);
      const catIsExpense = cat.type==="expense";
      return (isNegative && catIsIncome) || (isPositive && catIsExpense);
    }).sort(drillSort);

    // ── Gemeinsame Summen (Prognose + Header) ──
    const _todayS=new Date(),_todayYS=_todayS.getFullYear(),_todayMS=_todayS.getMonth(),_todayDS=_todayS.getDate();
    const _isCurS=year===_todayYS&&month===_todayMS,_isPastS=year<_todayYS||(year===_todayYS&&month<_todayMS);
    const _lastDayS=new Date(year,month+1,0).getDate(),_mitteAbg=_isPastS||(_isCurS&&_todayDS>14),_endeAbg=_isPastS||(_isCurS&&_todayDS>=_lastDayS);
    const _calcInc = (maxDay, onlyReal=false) => {
      const isMC = maxDay===14;
      // PERFORMANCE-FIX: nutzt _txsInMonthCat statt globalem txs.filter
      // selAcc-Filter: _txsInMonthCat liefert ALLE Konten — bei Konto-Auswahl
      // zusätzlich auf accountId filtern, sonst zeigt die Summenzeile auch
      // Einnahmen anderer Konten.
      if(onlyReal || (isMC && _mitteAbg) || (!isMC && _endeAbg)) {
        return cats.filter(_isCatIncomeOrTagesgeld).reduce((s,cat)=>{
          const catTxs = _txsInMonthCat(year, month, cat.id);
          return s + catTxs.filter(t=>{
            if(t.pending||t._linkedTo||t._budgetSubId) return false;
            if(!_isSelAcc(t)) return false;
            const d=new Date(t.date);
            return d.getDate()<=maxDay;
          }).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id)
            .reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
        },0);
      }
      return cats.filter(_isCatIncomeOrTagesgeld).reduce((s,cat)=>{
        const catTxs = _txsInMonthCat(year, month, cat.id);
        return s + catTxs.filter(t=>{
          if(t._budgetSubId) return false;
          // _linkedTo nur bei Gesamt-Ansicht filtern (sonst fehlen Sparen-Transfer-VMs)
          if(!selAcc && t._linkedTo) return false;
          if(!_isSelAcc(t)) return false;
          const d=new Date(t.date);
          return d.getDate()<=maxDay;
        }).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id)
          .reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
      },0);
    };

    // Ausgaben-Summen: exakt gleiche Logik wie calcTotal im Render
    // selAcc-Filter ergänzt: _txsInMonthCat/Sub liefern alle Konten — bei Konto-
    // Auswahl müssen wir zusätzlich auf accountId filtern.
    const _calcOut = (maxDay, onlyReal=false) => {
      const isMC = maxDay===14;
      return cats.filter(_isCatExpense).reduce((s,cat)=>{
        const catTxs = _txsInMonthCat(year, month, cat.id);
        // Abgelaufen oder onlyReal: echte Buchungen + Finanzierungsraten
        if(onlyReal||(isMC&&_mitteAbg)||(!isMC&&_endeAbg)) {
          return s+catTxs.filter(t=>{
            if(t._budgetSubId) return false;
            if(!selAcc && t._linkedTo) return false;
            if(!_isSelAcc(t)) return false;
            if(t.pending&&t._seriesTyp!=="finanzierung") return false;
            const d=new Date(t.date);
            return d.getDate()<=maxDay;
          }).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id)
            .reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
        }
        // Nicht abgelaufen: je Sub max(budget, real+pend), dann Rest ohne Sub
        const subIds=new Set((cat.subs||[]).map(sub=>sub.id));
        const subTotal=(cat.subs||[]).reduce((catSum,sub)=>{
          const bG=getBudgetForMonth(sub.id,year,month);
          const bM=(()=>{const m=getBudgetForMonth(sub.id+"_mitte",year,month);return(m>0&&m<bG)?m:0;})();
          const budget=isMC?bM:bG;
          const subTxs = _txsInMonthCatSub(year, month, cat.id, sub.id);
          const real=subTxs.filter(t=>{
            if(t.pending||t._budgetSubId) return false;
            if(!selAcc && t._linkedTo) return false;
            if(!_isSelAcc(t)) return false;
            const d=new Date(t.date);
            return d.getDate()<=maxDay;
          }).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||0),0);
          const pend=subTxs.filter(t=>{
            if(!t.pending||t._budgetSubId) return false;
            if(!selAcc && t._linkedTo) return false;
            if(!_isSelAcc(t)) return false;
            const d=new Date(t.date);
            return d.getDate()<=maxDay;
          }).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||t.totalAmount),0);
          return catSum+(budget>0?Math.max(budget,real+pend):real+pend);
        },0);
        // Vormerkungen + Buchungen ohne bekannte subId — separat, kein Budget-Floor
        const pendNoSub=catTxs.filter(t=>{
          if(!t.pending||t._budgetSubId) return false;
          if(!selAcc && t._linkedTo) return false;
          if(!_isSelAcc(t)) return false;
          const d=new Date(t.date);
          if(d.getDate()>maxDay) return false;
          return (t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));
        }).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)))
          .reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)||t.totalAmount),0),0);
        const realNoSub=catTxs.filter(t=>{
          if(t.pending||t._budgetSubId) return false;
          if(!selAcc && t._linkedTo) return false;
          if(!_isSelAcc(t)) return false;
          const d=new Date(t.date);
          if(d.getDate()>maxDay) return false;
          return (t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));
        }).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)))
          .reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
        return s+subTotal+pendNoSub+realNoSub;
      },0);
    };

    const _inMitte  = _calcInc(14);
    const _inEnde   = _calcInc(_lastDayS);
    const _inAkt    = _calcInc(_lastDayS, true);
    const _outMitte = _calcOut(14);
    const _outEnde  = _calcOut(_lastDayS);
    const _outAkt   = _calcOut(_lastDayS, true);

    // ── Prognose: Vormonatssaldo + Einnahmen - Ausgaben (Mitte/Ende) ──
    return (<>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch"}}>
        {/* Duplikat-Warnung */}
        {dupCount>0&&(
          <div style={{margin:"6px 10px",background:T.err_bg,border:`2px solid ${T.neg}`,borderRadius:12,padding:"10px 12px"}}>
            <div style={{color:T.neg,fontWeight:700,fontSize:12,marginBottom:4,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}
              onClick={()=>setShowDupDetail(p=>!p)}>
              {Li("alert-triangle",13,T.neg)} {dupCount} mögliche Duplikate
              <span style={{color:T.txt2,fontSize:10,fontWeight:400,flex:1}}>diesen Monat</span>
              {Li(showDupDetail?"chevron-up":"chevron-down",12,T.neg)}
            </div>
            {showDupDetail&&(
              <div style={{marginBottom:8}}>
                {dupKeys.map(key=>{
                  const group = dupGroups[key];
                  return (
                    <div key={key} style={{background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"6px 8px",marginBottom:4}}>
                      <div style={{color:T.txt2,fontSize:9,marginBottom:3}}>Gleicher Fingerprint: {key.slice(0,40)}</div>
                      {group.map(t=>(
                        <div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:"2px 0",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                          <span style={{color:T.txt2,fontSize:9,flexShrink:0}}>{t.date}</span>
                          <span style={{color:T.txt,fontSize:10,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</span>
                          {t._csvSource&&<span style={{color:T.gold,fontSize:9,flexShrink:0,background:"rgba(245,166,35,0.1)",borderRadius:3,padding:"0 3px"}}>
                            📄 {t._csvSource}
                          </span>}
                          <span style={{color:(t.splits||[]).some(s=>s.catId)?T.pos:T.txt2,fontSize:9,flexShrink:0}}>
                            {(t.splits||[]).some(s=>s.catId)?"✓ kat.":"unkategorisiert"}
                          </span>
                          <span style={{color:T.neg,fontSize:10,fontFamily:NUM_FONT,flexShrink:0}}>{fmt(Math.abs(t.totalAmount))}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{color:T.txt2,fontSize:10,marginBottom:8,lineHeight:1.5}}>
              Bei Duplikaten wird die <b style={{color:T.txt}}>kategorisierte Version behalten</b>. Bitte prüfe die Liste bevor du löschst.
            </div>
            <button onClick={()=>{
              const toDelete = new Set();
              dupKeys.forEach(key=>{
                const group = dupGroups[key];
                const sorted = [...group].sort((a,b)=>{
                  const aHasCat = (a.splits||[]).some(s=>s.catId);
                  const bHasCat = (b.splits||[]).some(s=>s.catId);
                  return (bHasCat?1:0)-(aHasCat?1:0);
                });
                sorted.slice(1).forEach(t=>toDelete.add(t.id));
              });
              setTxs(p=>p.filter(t=>!toDelete.has(t.id)));
              setShowDupDetail(false);
            }} style={{background:T.neg,border:"none",borderRadius:9,padding:"7px 14px",
              color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",gap:6}}>
              {Li("trash-2",13,"#fff")} {dupCount} Duplikate entfernen
            </button>
          </div>
        )}
        <div style={window.MBT_DEBUG?.disable_sticky?{}:{position:"sticky",top:0,zIndex:10,background:T.hero_bg}}>
        {(()=>{
          // ── Prognose: Vormonatssaldo + Einnahmen - Ausgaben ──

          // Einnahmen-Summen
          // Basis = Prognose-Ende des Vormonats
          // Für vergangene Monate: echter Kontostand per getKumulierterSaldo
          // NEU: prognoseMitte/Ende kommen IMMER aus saldoAt — Single Source of Truth.
          const _saldoCtxD = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
          const _lastDayD = new Date(year, month+1, 0).getDate();
          const prognoseMitte = saldoAt(year, month, 14, selAcc, _saldoCtxD);
          const prognoseEnde  = saldoAt(year, month, _lastDayD, selAcc, _saldoCtxD);
          // base wird noch für ein paar Stellen referenziert (Drilldown). Wir lassen es stehen.
          const prevY=month===0?year-1:year, prevM=month===0?11:month-1;
          const base = getProgEndeAccGlobal(prevY, prevM, "acc-giro");

          {
            const detailMitte = dashDetailMitte;
            const detailEnde  = dashDetailEnde;
            // BUGFIX: Im Gesamt-Modus (selAcc===null) soll der Drill den korrekten Gesamt-Saldo zeigen,
            // Für ALLE Monate: Saldo-Werte für Drilldown setzen.
            // Bei Konto-Sicht: aus prognose (saldoAt für aktuell/Zukunft, getKumulierterSaldo
            // für Vergangenheit). Bei Gesamt-Sicht (selAcc=null): null, damit Drilldown
            // auf drill.saldo (= getPrognoseSaldoDetail) zurückfällt.
            const saldoMitte  = selAcc ? prognoseMitte : null;
            const saldoEnde   = selAcc ? prognoseEnde  : null;
            const _realIn  = dashRealIn;
            const _realOut = dashRealOut;
            const _uIn     = dashUIn;
            const _uOut    = dashUOut;
            const _sum = arr => arr.reduce((s,t)=>s+Math.abs(t.totalAmount||0),0);
            const _h2txM = t => { const d=new Date(t.date); return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()<=14; };
            // Mitte-gefilterte Listen (≤14)
            const _realInM  = _realIn.filter(_h2txM);
            const _realOutM = _realOut.filter(_h2txM);
            const _pTxsInM  = _mitteAbg ? [] : pTxsIn.filter(t=>_h2txM(t)&&(!t._budgetSubId||t._budgetSubId.endsWith("_mitte")));
            const _pTxsOutM = _mitteAbg ? [] : pTxsOut.filter(t=>_h2txM(t)&&(!t._budgetSubId||t._budgetSubId.endsWith("_mitte")));
            const _uInM2    = _mitteAbg ? [] : _uIn.filter(_h2txM);
            const _uOutM2   = _mitteAbg ? [] : _uOut.filter(_h2txM);
            return (()=>{
              // V2-Hero — eigene clean Variante
              const accLabel = selAcc===null
                ? "GESAMT"
                : (accounts.find(a=>a.id===selAcc)?.name?.toUpperCase() || "");
              // Nur Konten mit mindestens einer Buchung im Toggle anbieten
              const usedAccIds = (()=>{
                const s = new Set();
                (txs||[]).forEach(t => { if(t.accountId) s.add(t.accountId); });
                return s;
              })();
              const filteredAccs = (accounts||[]).filter(a => usedAccIds.has(a.id));
              const allAccIds = [null, ...filteredAccs.map(a => a.id)];
              const cycleAcc = () => {
                const idx = allAccIds.findIndex(a => a===selAcc);
                setSelAcc(allAccIds[(idx+1) % allAccIds.length]);
              };
              const saldo = selAcc === null
                ? getKumulierterSaldo(year, month)
                : getKumulierterSaldo(year, month, selAcc);
              const fmtMoney = v => v==null||v===undefined ? "—" : fmt(v);
              // Farbsystem wie im klassischen Hero (SaldoHero2): nicht nur grün/rot,
              // sondern nach Schwellwerten <0 neg · ≤500 warn · ≤1000 gold · sonst pos.
              const heroColor = v => v==null?T.txt :v<0?T.cond_neg:v<=500?T.cond_warn:v<=1000?T.cond_gold:T.cond_pos;
              const saldoCol  = v => v==null?T.txt2:v<0?T.cond_neg:v<=500?T.cond_warn:v<=1000?T.cond_gold:T.cond_pos;

              // Detail-Werte für Buch/VM/unkat
              const buchInM  = _sum(_realInM),  buchOutM = _sum(_realOutM);
              const buchInE  = _sum(_realIn),   buchOutE = _sum(_realOut);
              const pendInM  = _sum(_pTxsInM),  pendOutM = _sum(_pTxsOutM);
              const pendInE2 = pendingIn,        pendOutE2= pendingOut;
              const uInM2v   = _sum(_uInM2),    uOutM2v  = _sum(_uOutM2);
              const uInEv    = _sum(_uIn),       uOutEv   = _sum(_uOut);

              // Drill-Handler analog V1
              const drillBuchIn  = (isMitte)=>{const l=isMitte?_realInM :_realIn; setDashDrill({label:"Einnahmen"+(isMitte?" bis 14.":""),txList:l,isIncome:true, uncatCount:(isMitte?_uInM2:_uIn).length,cat:null,total:_sum(l)});setDashSearch("");};
              const drillBuchOut = (isMitte)=>{const l=isMitte?_realOutM:_realOut;setDashDrill({label:"Ausgaben" +(isMitte?" bis 14.":""),txList:l,isIncome:false,uncatCount:(isMitte?_uOutM2:_uOut).length,cat:null,total:_sum(l)});setDashSearch("");};
              const drillPendIn  = (isMitte)=>{const l=isMitte?_pTxsInM :pTxsIn; setDashDrill({label:"Einnahmen \u2013 VM"+(isMitte?" bis 14.":""),txList:l,isIncome:true, uncatCount:0,cat:null,total:_sum(l),isPending:true});setDashSearch("");};
              const drillPendOut = (isMitte)=>{const l=isMitte?_pTxsOutM:pTxsOut;setDashDrill({label:"Ausgaben \u2013 VM" +(isMitte?" bis 14.":""),txList:l,isIncome:false,uncatCount:0,cat:null,total:_sum(l),isPending:true});setDashSearch("");};
              const drillUncatIn = (isMitte)=>{const l=isMitte?_uInM2 :_uIn; setDashDrill({label:"Einnahmen \u2013 unkat."+(isMitte?" bis 14.":""),txList:l,isIncome:true, uncatCount:l.length,cat:null,total:null});setDashSearch("");};
              const drillUncatOut= (isMitte)=>{const l=isMitte?_uOutM2:_uOut;setDashDrill({label:"Ausgaben \u2013 unkat." +(isMitte?" bis 14.":""),txList:l,isIncome:false,uncatCount:l.length,cat:null,total:null});setDashSearch("");};

              // Mini-Zelle für Detail-Werte (Out|In Paar)
              const HalfCell = ({vIn, vOut, clrIn, clrOut, dim, isMitte, onTapIn, onTapOut}) => (
                <div style={{flex:1,display:"flex",alignItems:"baseline"}}>
                  <div style={{flex:1,textAlign:"center",cursor:vOut>0&&onTapOut?"pointer":"default",padding:"2px 0",opacity:dim?0.65:1}}
                    onClick={vOut>0&&onTapOut?()=>onTapOut(isMitte):undefined}>
                    {vOut>0
                      ? <span style={{color:clrOut||T.neg,fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>{fmt(vOut)}</span>
                      : <span style={{color:T.txt2,fontSize:20}}>—</span>}
                  </div>
                  <div style={{flex:1,textAlign:"center",cursor:vIn>0&&onTapIn?"pointer":"default",padding:"2px 0",opacity:dim?0.65:1}}
                    onClick={vIn>0&&onTapIn?()=>onTapIn(isMitte):undefined}>
                    {vIn>0
                      ? <span style={{color:clrIn||T.pos,fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>{fmt(vIn)}</span>
                      : <span style={{color:T.txt2,fontSize:20}}>—</span>}
                  </div>
                </div>
              );
              const DetailRow = ({label, mIn, mOut, eIn, eOut, clrIn, clrOut, onTapIn, onTapOut}) => (
                <div style={{display:"flex",alignItems:"center",marginBottom:4}}>
                  <HalfCell vIn={mIn} vOut={mOut} clrIn={clrIn} clrOut={clrOut}
                    dim={true} isMitte={true} onTapIn={onTapIn} onTapOut={onTapOut}/>
                  <div style={{width:44,flexShrink:0,textAlign:"center",
                    color:T.txt2,fontSize:10,fontWeight:600,letterSpacing:0.3}}>{label}</div>
                  <HalfCell vIn={eIn} vOut={eOut} clrIn={clrIn} clrOut={clrOut}
                    dim={false} isMitte={false} onTapIn={onTapIn} onTapOut={onTapOut}/>
                </div>
              );

              return (
                <div style={{padding:"12px 20px 6px"}}>
                  {/* Zeile 1: aktueller Kontostand groß & zentriert (wie klassisches
                      Layout). Tippen wechselt durch die Konten. Der Kontoname sitzt
                      jetzt klein/zentriert in der MITTE/ENDE-Zeile (siehe unten). */}
                  <div onClick={allAccIds.length>1?cycleAcc:undefined}
                    style={{textAlign:"center",userSelect:"none",
                      cursor:allAccIds.length>1?"pointer":"default"}}>
                    <span className="heroAmt" style={{
                      color: heroColor(saldo),
                      fontSize:40,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
                      letterSpacing:-1,lineHeight:1.1,
                    }}>
                      {saldo>=0?"":"−"}{fmtMoney(Math.abs(saldo||0))} €
                    </span>
                  </div>

                  {/* Zeile 2: MITTE | ENDE-Pillen (gleiche Schriftgröße wie Cat-Pillen)
                      mit Caret-Toggle für Buch./VM-Details.
                      Geometrie exakt wie die Kategorie-Pillen: zwei flex:1-Hälften,
                      6px-Gap, 21px-Rand (Wrapper 20px + 1px) → die Beträge fluchten
                      pixelgenau über den Mitte-/Ende-Pillen. Der Caret liegt absolut
                      mittig darüber und beansprucht keine Spaltenbreite. */}
                  <div style={{display:"flex",gap:6,marginTop:2,padding:"0 1px",
                    alignItems:"stretch",position:"relative"}}>
                    {/* Mitte-Spalte */}
                    <div onClick={()=>setHeroProgDrill(v=>v==="Mitte"?null:"Mitte")}
                      style={{flex:1,textAlign:"center",cursor:"pointer",
                        padding:"2px 0 4px",borderRadius:8,
                        background: heroProgDrill==="Mitte" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
                      <div style={{color:T.mid||T.txt2,fontSize:9,fontWeight:700,
                        letterSpacing:2,opacity:0.7,marginBottom:2}}>MITTE</div>
                      <div className="heroAmt" style={{color: saldoCol(prognoseMitte),
                        fontSize:17,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>
                        {prognoseMitte>=0?"":"−"}{fmtMoney(Math.abs(prognoseMitte||0))}
                      </div>
                    </div>
                    {/* Ende-Spalte */}
                    <div onClick={()=>setHeroProgDrill(v=>v==="Ende"?null:"Ende")}
                      style={{flex:1,textAlign:"center",cursor:"pointer",
                        padding:"2px 0 4px",borderRadius:8,
                        background: heroProgDrill==="Ende" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
                      <div style={{color:T.gold||T.txt2,fontSize:9,fontWeight:700,
                        letterSpacing:2,opacity:0.7,marginBottom:2}}>ENDE</div>
                      <div className="heroAmt" style={{color: saldoCol(prognoseEnde),
                        fontSize:17,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>
                        {prognoseEnde>=0?"":"−"}{fmtMoney(Math.abs(prognoseEnde||0))}
                      </div>
                    </div>
                    {/* Mittig überlagert (beansprucht keine Spaltenbreite, damit die
                        MITTE/ENDE-Beträge weiter exakt über den Kategorie-Pillen fluchten):
                        Kontoname klein & zentriert + Caret-Toggle darunter. */}
                    <div style={{position:"absolute",left:0,right:0,top:0,bottom:0,
                      display:"flex",flexDirection:"column",alignItems:"center",
                      padding:"2px 0 4px",pointerEvents:"none"}}>
                      {/* Label-Zeile: Kontoname + ⟳-Symbol (Größen wie klassischer Hero) */}
                      <span style={{display:"inline-flex",alignItems:"center",gap:3,
                        marginBottom:2,pointerEvents:"auto"}}>
                        <span onClick={allAccIds.length>1?cycleAcc:undefined}
                          title={allAccIds.length>1?"Konto wechseln":undefined}
                          style={{userSelect:"none",
                            cursor:allAccIds.length>1?"pointer":"default",
                            color:selAcc===null ? T.txt2 : T.blue,
                            fontSize:11,fontWeight:700,letterSpacing:0.5,
                            maxWidth:118,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {accLabel}
                        </span>
                        {allAccIds.length>1 && (
                          <span onClick={cycleAcc} title="Konto wechseln"
                            style={{cursor:"pointer",display:"inline-flex",alignItems:"center",padding:"2px"}}>
                            {Li("refresh-cw",9, selAcc===null ? T.txt2 : T.blue)}
                          </span>
                        )}
                      </span>
                      {/* Werte-Zeile: Prog.-Toggle (öffnet Buch./VM-Details) */}
                      <span onClick={()=>setDetailsOpen(v=>!v)}
                        title={detailsOpen?"Details ausblenden":"Details anzeigen"}
                        style={{pointerEvents:"auto",cursor:"pointer",userSelect:"none",
                          color:T.txt2,fontSize:10,fontWeight:700,
                          display:"inline-flex",alignItems:"center",gap:3}}>
                        Prog. {Li(detailsOpen?"chevron-up":"chevron-down",10,T.txt2)}
                      </span>
                    </div>
                  </div>

                  {/* Detail-Block: Buch / VM / unkat — drei Zeilen mit Drill-Pfaden */}
                  {detailsOpen && (
                    <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.bd}`}}>
                      <DetailRow label="Buch."
                        mIn={buchInM} mOut={buchOutM} eIn={buchInE} eOut={buchOutE}
                        onTapIn={drillBuchIn} onTapOut={drillBuchOut}/>
                      {(pendInE2>0||pendOutE2>0) && (
                        <DetailRow label="VM"
                          mIn={pendInM} mOut={pendOutM} eIn={pendInE2} eOut={pendOutE2}
                          clrIn={T.pos+"aa"} clrOut={T.neg+"aa"}
                          onTapIn={drillPendIn} onTapOut={drillPendOut}/>
                      )}
                      {(uInEv>0||uOutEv>0) && (
                        <DetailRow label="unkat."
                          mIn={uInM2v} mOut={uOutM2v} eIn={uInEv} eOut={uOutEv}
                          clrIn={T.gold} clrOut={T.gold}
                          onTapIn={drillUncatIn} onTapOut={drillUncatOut}/>
                      )}
                    </div>
                  )}

                  {/* Prognose-Drilldown (Mitte oder Ende): inline wie in V1 */}
                  {heroProgDrill && (
                    <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.bd}`}}>
                      <SaldoPrognose year={year} month={month} txs={[]}
                        detailMitte={detailMitte} detailEnde={detailEnde}
                        saldoMitte={saldoMitte} saldoEnde={saldoEnde}
                        getCat={getCat} getSub={getSub}
                        initialOpen={heroProgDrill}/>
                    </div>
                  )}
                </div>
              );
            })();
          }
        })()}
        </div>

        {/* ── 3-Symbol-Zeile: Warnungen | Sparen | Vormerkungen ──
            Vergangene Monate: nur Vormerkungen-Icon (und nur wenn echte, nicht-Budget-Vormerkungen offen) */}
        {(()=>{
          const visiblePTxs = (()=>{
            const base = isPastMonth ? pTxs.filter(t=>!t._budgetSubId) : pTxs;
            // identisch zur PendingList: freigegebene Restbudgets (Mitte wie Ende)
            // ausblenden, sobald die nächste Phase gilt → auch das Badge schrumpft.
            return base.filter(t=>budgetPlaceholderActive(t));
          })();
          const showRow = !isPastMonth || visiblePTxs.length>0;
          if(!showRow) return null;
          const togglePanel = (key) => setActivePanel(p => p===key ? null : key);
          const Card = ({panel, icon, badge, color}) => {
            const isActive = activePanel === panel;
            return (
              <div onClick={()=>togglePanel(panel)}
                style={{flex:1,display:"flex",alignItems:"center",
                  justifyContent:"center",padding:"10px 6px",cursor:"pointer",
                  userSelect:"none",position:"relative",
                  opacity:isActive?1:0.7}}>
                {Li(icon, 28, color)}
                {badge!=null && badge>0 && (
                  <div style={{position:"absolute",top:4,right:"calc(50% - 22px)",
                    minWidth:16,height:16,borderRadius:8,padding:"0 4px",
                    background:color,color:T.bg||"#000",fontSize:9,fontWeight:800,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {badge}
                  </div>
                )}
              </div>
            );
          };
          return (
            <div style={{margin:"6px 10px 0",display:"flex",gap:6}}>
              {!isPastMonth && <Card panel="warnings"     icon="shield-check" badge={warnCount}   color={warnCount>0 ? T.neg : T.pos}/>}
              {!isPastMonth && <Card panel="sparen"       icon="piggy-bank"   badge={null}        color={T.blue}/>}
              <Card panel="vormerkungen" icon="clock"        badge={visiblePTxs.length} color={T.gold}/>
            </div>
          );
        })()}

        {/* Warnungen-Widget: immer gemountet, damit der Badge-Zähler aktuell bleibt */}
        {!isPastMonth && (
          <KontoWarnungWidget showFolgemonateToggle={true}
            hidden={activePanel!=="warnings"}
            onCountChange={setWarnCount}/>
        )}
        {!isPastMonth && activePanel === "sparen" && (
          <TagesgeldWidget year={year} month={month} initialCollapsed={false}/>
        )}
        {activePanel === "vormerkungen" && !window.MBT_DEBUG?.disable_pendinglist && (()=>{
          const visiblePTxs = (()=>{
            const base = isPastMonth ? pTxs.filter(t=>!t._budgetSubId) : pTxs;
            return base.filter(t=>budgetPlaceholderActive(t));
          })();
          if(visiblePTxs.length===0) return null;
          return (
            <PendingList pTxs={visiblePTxs} getCat={getCat} getSub={getSub} txType={txType} openEdit={openEdit} dayOf={dayOf} pendOpenAmt={pendOpenAmt} budgetOpenRest={budgetOpenRest} initialCollapsed={false}/>
          );
        })()}

        {/* Vorzeichen-Fehlzuordnung-Warnung — einklappbar */}
        {mismatchTxs.length>0&&(
          <div style={{margin:"6px 10px",background:T.tab_pend,
            border:`2px solid ${T.gold}`,borderRadius:12,padding:"8px 12px"}}>
            <div onClick={()=>setShowMismatch(v=>!v)}
              style={{color:T.gold,fontWeight:700,fontSize:12,
                display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
              {Li("alert-triangle",13,T.gold)}
              <span style={{flex:1}}>
                {mismatchTxs.length} Fehlzuordnung{mismatchTxs.length!==1?"en":""}
              </span>
              <span style={{color:T.txt2,fontSize:10,fontWeight:400}}>Kategorie-Typ falsch</span>
              {Li(showMismatch?"chevron-up":"chevron-down",12,T.gold)}
            </div>
            {!showMismatch&&showAllMismatch&&setShowAllMismatch(false)||null}
            {showMismatch&&(<>
              <div style={{color:T.txt2,fontSize:10,margin:"6px 0",lineHeight:1.4}}>
                Negative Beträge einer Einnahmen-Kategorie zugeordnet oder umgekehrt.
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}>
                <button onClick={()=>{
                  setTxs(p=>p.map(t=>{
                    if(t.pending) return t;
                    const splits=(t.splits||[]).filter(s=>s.catId);
                    if(!splits.length) return t;
                    const cat=getCat(splits[0].catId);
                    if(!cat) return t;
                    const isNeg=t.totalAmount<0||t._csvType==="expense";
                    const isPos=t.totalAmount>0&&t._csvType!=="expense";
                    const catIsIncome=_isCatIncomeOrTagesgeld(cat);
                    const catIsExpense=cat.type==="expense";
                    if((isNeg&&catIsIncome)||(isPos&&catIsExpense)) return {...t,splits:[]};
                    return t;
                  }));
                }} style={{padding:"5px 12px",borderRadius:8,border:"none",
                  background:T.gold,color:T.on_accent,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  Alle korrigieren ({mismatchTxs.length})
                </button>
              </div>
              <div style={{maxHeight:200,overflowY:"auto"}}>
                {(showAllMismatch?mismatchTxs:mismatchTxs.slice(0,10)).map(t=>{
                  const cat=getCat((t.splits||[])[0]?.catId);
                  return (
                    <div key={t.id} onClick={()=>openEdit(t)}
                      style={{display:"flex",gap:8,alignItems:"center",padding:"5px 6px",
                        borderRadius:6,cursor:"pointer",marginBottom:2,
                        background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)"}}>
                      <span style={{color:T.txt2,fontSize:9,flexShrink:0}}>{t.date}</span>
                      <span style={{color:T.gold,fontSize:9,flexShrink:0,
                        background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",
                        borderRadius:3,padding:"1px 4px",fontWeight:700}}>
                        {t.totalAmount<0?"−":"+"} → {cat?.type==="income"?"Einnahme":"Ausgabe"}
                      </span>
                      <span style={{color:T.txt,fontSize:11,flex:1,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</span>
                      <span style={{color:t.totalAmount<0?T.neg:T.pos,fontSize:11,
                        fontFamily:NUM_FONT,flexShrink:0,fontWeight:700}}>
                        {t.totalAmount<0?"−":"+"}{fmt(Math.abs(t.totalAmount))}
                      </span>
                    </div>
                  );
                })}
                {mismatchTxs.length>10&&!showAllMismatch&&(
                  <div onClick={()=>setShowAllMismatch(true)}
                    style={{color:T.blue,fontSize:11,fontWeight:700,textAlign:"center",
                      padding:"6px 0",cursor:"pointer"}}>
                    +{mismatchTxs.length-10} weitere anzeigen
                  </div>
                )}
              </div>
            </>)}
          </div>
        )}




        {/* ── V2: Sort-Buttons + Datum (oben rechts) ── */}
        {(incomeTotals.length>0||catTotals.length>0)&&(()=>{
          // Datum nur im aktuellen Monat anzeigen
          const today = new Date();
          const isCurrentMonth = today.getFullYear()===year && today.getMonth()===month;
          const dateStr = isCurrentMonth
            ? `${String(today.getDate()).padStart(2,"0")}.${String(today.getMonth()+1).padStart(2,"0")}.`
            : null;
          return (
            <div style={{padding:"6px 12px 4px",display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",gap:6,flex:1,minWidth:0,alignItems:"center"}}>
                {[["custom","\u270e Eigene"],["desc","\u2193"],["asc","\u2191"]].map(([mode,lbl])=>(
                  <button key={mode} onClick={()=>setCatSortMode(mode)}
                    style={{background:catSortMode===mode?T.blue:"transparent",
                      color:catSortMode===mode?T.on_accent||"#000":T.txt2,
                      border:`1px solid ${catSortMode===mode?T.blue:T.bd}`,
                      borderRadius:14,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    {lbl}
                  </button>
                ))}
              </div>
              {dateStr && (
                <div style={{color:T.lbl||T.txt2,fontSize:11,fontWeight:600,
                  fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,flexShrink:0}}>
                  {dateStr}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── V2: Kategorie-Karten (clean) ── */}
        {(()=>{
          const lastDay = new Date(year, month+1, 0).getDate();
          const allCatsToShow = [...incomeTotals, ...catTotals];
          if(allCatsToShow.length===0) return null;

          // Budget-Vormerkungen (reserviertes Restbudget) in Mitte/Ende einrechnen.
          // Phase noch erreichbar? (gleiche Logik wie budgetPlaceholderActive/Hero)
          const _mm = String(month+1).padStart(2,"0");
          const mitteReach = budgetPlaceholderActive({_budgetSubId:"_mitte", date:`${year}-${_mm}-14`});
          const endeReach  = budgetPlaceholderActive({_budgetSubId:"x",       date:`${year}-${_mm}-${String(lastDay).padStart(2,"0")}`});
          const budgetApplies = (selAcc===null || selAcc==="acc-giro");
          // restMitte/restEnde je Cat (vgl. utils/saldo.js): Σ max(0, Budget − Ist)
          const resMitte = (cat) => (!budgetApplies||!mitteReach) ? 0 : (cat.subs||[]).reduce((s,sub)=>{
            const g = getBudgetForMonth(sub.id,year,month)||0;
            const m = getBudgetForMonth(sub.id+"_mitte",year,month)||0;
            const ref = m>0 ? m : g;                 // nur Mitte-Anteil, sonst volles Budget
            if(ref<=0) return s;
            return s + Math.max(0, ref - (_catTxMaps.sumSub14.get(sub.id)||0));
          },0);
          const resEnde = (cat) => (!budgetApplies||!endeReach) ? 0 : (cat.subs||[]).reduce((s,sub)=>{
            const g = getBudgetForMonth(sub.id,year,month)||0;
            if(g<=0) return s;
            return s + Math.max(0, g - (_catTxMaps.sumSubAll.get(sub.id)||0));
          },0);
          const isLight = (T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss");
          const cellBg = T.cat_bg ? "rgba(255,255,255,0.10)" : isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";

          // Ampelfarbe (6-stufig wie in V1):
          //  ≤25%  hellgrün     ≤50%  grün       ≤75%  gelb
          //  ≤100% orange       ≤125% hellrot    >125% rot
          const trafficColor = (amt, bgt) => {
            if(!bgt || bgt===0) return null;
            const r = amt/bgt*100;
            if(r<=25)  return isLight?"#4CAF50":"#66BB6A";
            if(r<=50)  return isLight?"#43A047":"#4CAF50";
            if(r<=75)  return isLight?"#FBC02D":"#FDD835";
            if(r<=100) return isLight?"#FB8C00":"#FFA726";
            if(r<=125) return isLight?"#E53935":"#EF5350";
            return isLight?"#C62828":(T.err||"#E53935");
          };
          // Text-Farbe (Ampel): bei Einnahmen nicht ampeln (immer grün/Akzent), bei Ausgaben ampeln
          const textColor = (amt, bgt, isInc) => {
            if(isInc) {
              // Einnahmen: nur grün wenn vorhanden, sonst neutral
              return amt>0 ? T.pos : T.txt2;
            }
            const c = trafficColor(amt, bgt);
            return c || T.txt;
          };

          // Clean-Pille (Mitte/Ende) mit Ampel-Strich, optional klickbar → Buchungs-Drilldown
          const valuePill = (val, bgt, isInc, onClick, opts={}) => {
            // Anzeige = val (inkl. reserviertem Budget); Ampelfarbe nach tatsächlichem
            // Verbrauch (opts.colorVal), damit nicht alles dauerhaft auf ~100% steht.
            const cb = opts.colorVal!=null ? opts.colorVal : val;
            const stripe = !isInc && bgt>0 ? trafficColor(cb, bgt) : null;
            const clickable = !!onClick && val>0;
            return (
              <div onClick={clickable?(e=>{e.stopPropagation();onClick();}):undefined}
                style={{flex:1,position:"relative",textAlign:"center",
                  padding:"5px 0",borderRadius:7,background:cellBg,
                  color:textColor(isInc?val:cb,bgt,isInc),
                  fontSize:opts.size||20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
                  opacity:opts.dim?0.55:0.9,overflow:"hidden",
                  cursor:clickable?"pointer":"default"}}>
                {val>0 ? fmt(val) : "—"}
                {stripe && (
                  <div style={{position:"absolute",left:0,right:0,bottom:0,height:3,background:stripe}}/>
                )}
              </div>
            );
          };

          return (
            <div style={{padding:"0 10px 4px",display:"flex",flexDirection:"column",gap:2}}>
              {allCatsToShow.map(cat => {
                const isIncome = _isCatIncomeOrTagesgeld(cat);
                // Ist (real + konkrete VM) — auch Basis für die Ampelfarbe
                const istMitte = _catSumUpToDay(cat.id, 14);
                const istEnde  = _catSumUpToDay(cat.id, lastDay);
                // Mitte/Ende = Ist + reserviertes Restbudget (Budget-Vormerkungen)
                const iMitte = istMitte + (isIncome?0:resMitte(cat));
                const iEnde  = istEnde  + (isIncome?0:resEnde(cat));
                const iAkt   = _catTxMaps.sumRealByCat.get(cat.id) || 0;
                const catColor = cat.color || (isIncome ? T.pos : T.neg);
                const accLabel = !selAcc ? _accLabelByCat.get(cat.id) : null;

                // Budget je Halbmonat aus den Subs aggregieren (nur für Ausgaben-Cats relevant)
                let budgetMitte = 0, budgetEnde = 0;
                if(!isIncome) {
                  (cat.subs||[]).forEach(sub => {
                    const gesamt = getBudgetForMonth(sub.id, year, month) || 0;
                    const mitte  = getBudgetForMonth(sub.id+"_mitte", year, month) || 0;
                    const hasSplit = mitte>0 && mitte<gesamt;
                    budgetMitte += hasSplit ? mitte : 0;  // Wenn kein expliziter Mitte-Split: kein Mitte-Budget
                    budgetEnde  += gesamt;
                  });
                }

                // Großer Hauptbetrag rechts = AKTUELLER Verbrauch (real gebucht), gefärbt nach Ampel
                // Mitte/Ende-Pillen zeigen die Prognose; oben zeigt der reale Stand.
                const headColor = textColor(iAkt, budgetEnde, isIncome);

                const isExpanded = expandedCats.has(cat.id);
                const showPills  = detailsOpen || isExpanded;

                // Alle (echten + vorgemerkten, ohne Budget-Platzhalter) Buchungen dieser Cat im Monat
                const monthCatTxs = (_catTxMaps.realByCat.get(cat.id)||[])
                  .concat(_catTxMaps.pendByCat.get(cat.id)||[]);

                // Oeffnet direkt die Buchungsliste (kein Sub-Modal) fuer einen Zeitraum
                const openCatDrill = (maxDay, lbl, val, realOnly) => {
                  const list = monthCatTxs.filter(t =>
                    (realOnly ? !t.pending : true) && new Date(t.date).getDate() <= maxDay);
                  setDashDrill({ cat:null, label:`${cat.name} — ${lbl}`, txList:list,
                    isIncome, total:val, _subDrillNoBudget:true });
                  setDashSearch("");
                };
                const openSubInlineDrill = (sub, subTxs, maxDay, lbl, val, realOnly) => {
                  const list = subTxs.filter(t =>
                    !(t.pending&&t._budgetSubId) &&
                    (realOnly ? !t.pending : true) &&
                    new Date(t.date).getDate() <= maxDay);
                  setDashDrill({ cat:null, label:`${cat.name} / ${sub.name} — ${lbl}`, txList:list,
                    isIncome, total:val, _subDrillNoBudget:true });
                  setDashSearch("");
                };

                return (
                  <div key={cat.id}
                    style={{
                      background: T.surf || (isLight?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.04)"),
                      border: `1px solid ${T.bd}`,
                      borderRadius: 10,
                      padding: "4px 10px",
                    }}>
                    {/* Zeile 1: [Icon+Name -> ausklappen]  +  aktuell (-> Buchungs-Drilldown) */}
                    <div style={{display:"flex",alignItems:"center",gap:8,
                      marginBottom: showPills ? 6 : 0}}>
                      <div onClick={()=>toggleCatExpand(cat.id)}
                        style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0,
                          cursor:"pointer"}}>
                        <div style={{
                          width:28,height:28,borderRadius:8,
                          background:catColor+"22",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          flexShrink:0,
                        }}>
                          {Li(cat.icon||"folder", 16, catColor)}
                        </div>
                        <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                          <div style={{
                            color:T.txt,fontSize:15,fontWeight:600,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                          }}>{cat.name}</div>
                          {accLabel && (
                            <div style={{color:T.lbl,fontSize:10,fontWeight:500,marginTop:1}}>
                              ({accLabel})
                            </div>
                          )}
                        </div>
                      </div>
                      <div onClick={e=>{e.stopPropagation(); if(iAkt>0) openCatDrill(lastDay,"aktuell",iAkt,true);}}
                        style={{
                          color:headColor,fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
                          flexShrink:0, cursor:iAkt>0?"pointer":"default",
                        }}>
                        {fmt(iAkt)}
                      </div>
                    </div>
                    {/* Zeile 2: Mitte/Ende-Pillen (global per Toggle ODER wenn Zeile ausgeklappt) */}
                    {showPills && (
                      <div style={{display:"flex",gap:6,marginTop:6}}>
                        {valuePill(iMitte, budgetMitte, isIncome,
                          ()=>openCatDrill(14,"Mitte",iMitte,false), {dim:true, colorVal:istMitte})}
                        {valuePill(iEnde, budgetEnde, isIncome,
                          ()=>openCatDrill(lastDay,"Ende",iEnde,false), {dim:true, colorVal:istEnde})}
                      </div>
                    )}
                    {/* Inline-Unterkategorien (gleiches 2-Zeilen-Format wie die Hauptzeile) */}
                    {isExpanded && (cat.subs||[]).map(sub => {
                      const subTxs = monthCatTxs.filter(t =>
                        (t.splits||[]).some(sp => sp.subId===sub.id || sp.catId===sub.id));
                      const subBudget = !isIncome ? (getBudgetForMonth(sub.id,year,month)||0) : 0;
                      if(subTxs.length===0 && !(subBudget>0)) return null;
                      const amtOf = t => Math.abs(
                        (t.splits||[]).find(sp=>sp.subId===sub.id||sp.catId===sub.id)?.amount
                        || (t.pending ? Math.abs(t.totalAmount) : 0));
                      const sReal = (mx)=>subTxs.filter(t=>!t.pending && new Date(t.date).getDate()<=mx)
                        .reduce((s,t)=>s+amtOf(t),0);
                      const sPend = (mx)=>subTxs.filter(t=>t.pending && !t._budgetSubId && new Date(t.date).getDate()<=mx)
                        .reduce((s,t)=>s+amtOf(t),0);
                      const sAkt    = sReal(lastDay);
                      const _ist14  = sReal(14) + sPend(14);
                      const _istAll = sReal(lastDay) + sPend(lastDay);
                      // Mitte/Ende = max(Ist, Budget): reserviertes Restbudget (Budget-Vormerkungen)
                      const _refM   = (()=>{ const g=getBudgetForMonth(sub.id,year,month)||0,
                        m=getBudgetForMonth(sub.id+"_mitte",year,month)||0; return m>0?m:g; })();
                      const sMitte = (!isIncome && budgetApplies && mitteReach && _refM>0)
                        ? Math.max(_ist14, _refM) : _ist14;
                      const sEnde  = (!isIncome && budgetApplies && endeReach && subBudget>0)
                        ? Math.max(_istAll, subBudget) : _istAll;
                      const sBudMitte = (()=>{ const g=getBudgetForMonth(sub.id,year,month)||0,
                        m=getBudgetForMonth(sub.id+"_mitte",year,month)||0; return (m>0&&m<g)?m:0; })();
                      const sHead = textColor(sAkt, subBudget, isIncome);
                      return (
                        <div key={sub.id}
                          style={{marginTop:6}}>
                          {/* Sub Zeile 1: Name + aktuell (-> Buchungs-Drilldown) */}
                          <div onClick={e=>{e.stopPropagation(); if(sAkt>0) openSubInlineDrill(sub,subTxs,lastDay,"aktuell",sAkt,true);}}
                            style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,
                              cursor:sAkt>0?"pointer":"default"}}>
                            <span style={{flexShrink:0,display:"inline-flex"}}>
                              {Li("corner-down-right",13,T.txt2)}
                            </span>
                            <div style={{flex:1,minWidth:0,color:T.txt,fontSize:14,fontWeight:600,
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {sub.name}
                            </div>
                            <div style={{color:sHead,fontSize:17,fontWeight:700,
                              fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,flexShrink:0}}>
                              {sAkt>0?fmt(sAkt):"—"}
                            </div>
                          </div>
                          {/* Sub Zeile 2: Mitte/Ende-Pillen (-> Buchungs-Drilldown) */}
                          <div style={{display:"flex",gap:6}}>
                            {valuePill(sMitte, sBudMitte, isIncome,
                              ()=>openSubInlineDrill(sub,subTxs,14,"Mitte",sMitte,false), {size:16, colorVal:_ist14})}
                            {valuePill(sEnde, subBudget, isIncome,
                              ()=>openSubInlineDrill(sub,subTxs,lastDay,"Ende",sEnde,false), {size:16, colorVal:_istAll})}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}


        {/* Drilldown Overlay */}
        {dashDrill&&(
          <div onClick={()=>setDashDrill(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",
              zIndex:65,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:0}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:T.surf2,borderRadius:0,width:"100%",maxWidth:560,
                height:"100dvh",maxHeight:"100dvh",display:"flex",flexDirection:"column",
                border:"none",boxShadow:"0 8px 40px rgba(0,0,0,0.7)"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 12px 8px",flexShrink:0}}>
                {/* Zurueck-Pfeil links (spaeter auch per + bedienbar) */}
                <button onClick={()=>setDashDrill(null)}
                  style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,
                    borderRadius:10,width:36,height:36,cursor:"pointer",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>{Li("arrow-left",18)}</button>
                {dashDrill.cat&&<div style={{width:38,height:38,borderRadius:11,background:dashDrill.cat.color+"33",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {Li(dashDrill.cat.icon,18,dashDrill.cat.color||T.txt2)}
                </div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:dashDrill.cat ? T.blue : dashDrill.isIncome ? T.pos : "#EA4025",
                    fontSize:19,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dashDrill.label||dashDrill.cat?.name}</div>
                  <div style={{color:T.txt2,fontSize:13,display:"flex",gap:8,alignItems:"center"}}>
                    {dashDrill.cat ? (()=>{
                      const live = txs.filter(t=>{const d=new Date(t.date);return d.getFullYear()===year&&d.getMonth()===month&&(t.splits||[]).some(sp=>sp.catId===dashDrill.cat.id);});
                      return <span>{live.length} Buchung{live.length!==1?"en":""}</span>;
                    })() : <span>{(dashDrill.txList||[]).length} Buchung{(dashDrill.txList||[]).length!==1?"en":""}</span>}
                    {dashDrill.total!=null&&<span style={{color:dashDrill.isIncome?T.pos:T.neg,fontWeight:700,fontSize:15}}>
                      {fmt(dashDrill.total)}
                    </span>}
                  </div>
                </div>
                <button onClick={()=>setDashDrill(null)}
                  style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,
                    borderRadius:10,width:36,height:36,cursor:"pointer",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>{Li("x",16)}</button>
              </div>
              {/* Suchfeld */}
              <div style={{padding:"8px 14px",borderTop:`1px solid ${T.bd}`,flexShrink:0,
                display:"flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.15)"}}>
                {Li("search",16,T.txt2)}
                <input value={dashSearch} onChange={e=>setDashSearch(e.target.value)}
                  placeholder="suchen…"
                  style={{flex:1,background:"transparent",border:"none",color:T.txt,
                    fontSize:14,outline:"none"}}/>
                {dashSearch&&<button onClick={()=>setDashSearch("")}
                  style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:14}}>{Li("x",14)}</button>}
              </div>
              {/* Fixe Spaltenueberschrift Mitte/Ende/aktuell — bei Kategorie-Drilldown mit Unterkategorien (Einnahmen wie Ausgaben) */}
              {dashDrill.cat&&!dashSearch&&(dashDrill.cat.subs||[]).length>0&&(
                <div style={{display:"flex",gap:4,padding:"6px 14px 6px",flexShrink:0,
                  background:"rgba(0,0,0,0.12)",borderTop:`1px solid ${T.bd}`}}>
                  <div style={{flex:1,textAlign:"center",color:T.txt2,fontSize:12,fontWeight:700,letterSpacing:0.3}}>Mitte</div>
                  <div style={{flex:1,textAlign:"center",color:T.txt2,fontSize:12,fontWeight:700,letterSpacing:0.3}}>Ende</div>
                  <div style={{flex:1,textAlign:"center",color:T.txt2,fontSize:12,fontWeight:700,letterSpacing:0.3}}>aktuell</div>
                </div>
              )}
              <div style={{flex:1,overflowY:"auto"}}>
                {/* Unterkategorie-Ansicht wenn Kategorie-Drill und keine Suche */}
                {dashDrill.cat&&!dashSearch&&(()=>{
                  const cat = dashDrill.cat;
                  // Live txList aus aktuellem Monat
                  const allTxForCat = [
                    ...txs.filter(t=>{const d=new Date(t.date);return !t.pending&&!t._linkedTo&&d.getFullYear()===year&&d.getMonth()===month&&(t.splits||[]).some(sp=>sp.catId===cat.id);}),
                    ...txs.filter(t=>{const d=new Date(t.date);return t.pending&&!t._budgetSubId&&d.getFullYear()===year&&d.getMonth()===month&&(t.splits||[]).some(sp=>sp.catId===cat.id);}),
                  ];
                  // Berechne je Unterkategorie: Mitte / Ende / aktuell
                  const subRows = (cat.subs||[]).map(sub=>{
                    const subTxs = allTxForCat.filter(t=>
                      (t.splits||[]).some(sp=>sp.subId===sub.id || sp.catId===sub.id)
                    );
                    // Auch Vormerkungen ohne Split (totalAmount direkt)
                    const subPendNoSplit = allTxForCat.filter(t=>
                      t.pending&&!t._budgetSubId&&
                      (t.splits||[]).length===0&&
                      !(t.splits||[]).some(sp=>sp.subId===sub.id)
                    );
                    const subHasBudget = (getBudgetForMonth(sub.id,year,month)) > 0;
                    if(subTxs.length===0 && !subHasBudget) return null;
                    // Echte Buchungen bis maxDay
                    const calcReal = (maxDay) => subTxs
                      .filter(t=>!t.pending&&new Date(t.date).getDate()<=maxDay)
                      .reduce((s,t)=>s+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||0),0);
                    // Vormerkungen bis maxDay (ohne Budget-Platzhalter)
                    const calcPendDay = (maxDay) => subTxs
                      .filter(t=>t.pending&&!t._budgetSubId&&new Date(t.date).getDate()<=maxDay)
                      .reduce((s,t)=>s+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||Math.abs(t.totalAmount)),0);
                    const realMitte   = calcReal(14);
                    const realEnde    = calcReal(31);
                    const pendMitte   = calcPendDay(14);
                    const pendEnde    = calcPendDay(31);
                    const mitte   = realMitte + pendMitte;
                    const ende    = realEnde  + pendEnde;
                    const aktuell = realEnde;  // nur echte Buchungen
                    const pend    = pendEnde; // für Label "vorgemerkt"
                    const budget  = getBudgetForMonth(sub.id,year,month);
                    return {sub, subTxs, mitte, ende, aktuell, pend, budget,
                      realMitte, realEnde, pendMitte, pendEnde};
                  }).filter(Boolean);
                  // Ungebundene Buchungen (kein subId oder subId nicht in subs)
                  const subIds = new Set((cat.subs||[]).map(s=>s.id));
                  const unbound = allTxForCat.filter(t=>
                    !(t.splits||[]).some(sp=>subIds.has(sp.subId) || subIds.has(sp.catId))
                  );

                  const isExp = (subId) => drillExpandedSub===subId;

                  return (<>
                    {/* Buchungen ohne Unterkategorie ganz oben, nach Datum */}
                    {[...unbound].sort((a,b)=>b.date.localeCompare(a.date)).map(tx=>{
                      const amt=Math.abs(tx.totalAmount);
                      return (
                        <div key={"u-"+tx.id} onClick={()=>{setDashDrill(null);openEdit(tx);}}
                          style={{padding:"8px 14px",borderBottom:`1px solid ${T.bd}`,
                            cursor:"pointer",display:"flex",flexDirection:"column",gap:3,
                            background:tx.pending?"rgba(245,166,35,0.06)":"transparent"}}>
                          {/* Zeile 1: Buchungstext (ausklappbar) */}
                          {renderDesc(tx,{color:T.txt,size:15,weight:600,fallback:cat?.name||"Buchung"})}
                          {/* Zeile 2: Datum + Status links, Betrag rechts (volle Breite) */}
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                            <div style={{color:T.txt2,fontSize:12,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",minWidth:0}}>
                              <span>{tx.date}</span>
                              {tx.pending&&<span style={{color:T.gold,fontSize:11,fontWeight:700}}>{tx._seriesId?"wiederkehrend":"vorgemerkt"}</span>}
                              <LinkBadges tx={tx}/>
                            </div>
                            <span style={{color:tx.pending?T.gold:(cat.type==="income"?T.pos:T.neg),fontSize:17,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0}}>{fmt(amt)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {subRows.map(({sub,subTxs,mitte,ende,aktuell,pend,budget,realMitte,realEnde,pendMitte,pendEnde})=>(
                      <div key={sub.id}>
                        {/* Unterkategorie Header */}
                        <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.bd}`,
                            background:isExp(sub.id)?"rgba(74,159,212,0.08)":"transparent",
                            display:"flex",flexDirection:"column",gap:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div onClick={()=>setDrillExpandedSub(isExp(sub.id)?null:sub.id)}
                            style={{flex:1,minWidth:0,cursor:"pointer"}}>
                            <div style={{color:T.txt,fontSize:15,fontWeight:700,
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {sub.name}
                            </div>
                            {pend>0&&<div style={{color:T.gold,fontSize:11,marginTop:1}}>
                              {Li("clock",10,T.gold)} {fmt(pend)} vorgemerkt
                            </div>}
                          </div>
                          {/* Budget-Button */}
                          <button onClick={e=>{e.stopPropagation();openBudgetEdit({id:sub.id,name:sub.name,catId:cat.id,catColor:cat.color,accountId:(groups.find(g=>g.type===cat.type)?.accountId||cat.accountId||"acc-giro")});}}
                            title="budget festlegen"
                            style={{background:budget>0?`${T.gold}22`:"none",
                              border:`1px solid ${budget>0?T.gold+"66":"transparent"}`,
                              color:budget>0?T.gold:T.txt2,cursor:"pointer",
                              borderRadius:7,padding:"4px 8px",flexShrink:0,
                              display:"flex",alignItems:"center",gap:4,fontSize:13}}>
                            {Li("target",14,budget>0?T.gold:T.txt2)}
                            {budget>0&&<span style={{fontWeight:700}}>{fmt(budget)}</span>}
                          </button>
                          </div>
                          {/* Werte-Zeile (Spaltenkoepfe stehen fix oben im Modal) */}
                          <div style={{display:"flex",gap:4,width:"100%"}}>
                            {(()=>{
                              // Budget je Halbmonat
                              const budgetMitteS = (()=>{
                                const g=getBudgetForMonth(sub.id,year,month), m=getBudgetForMonth(sub.id+"_mitte",year,month);
                                return (m>0&&m<g)?m:0;
                              })();
                              const budgetEndeS = getBudgetForMonth(sub.id,year,month);
                              const openSubDrill = (maxDay, lbl) => {
                                const txList = subTxs.filter(t=>{
                                  if(t.pending&&t._budgetSubId) return false;
                                  const d=new Date(t.date);
                                  return d.getDate()<=maxDay;
                                }).sort(drillSort);
                                setDashDrill({
                                  label:`${cat.name} / ${sub.name} — ${lbl}`,
                                  txList,
                                  isIncome: cat.type==="income",
                                  cat: null, // null = zeige Buchungsliste direkt
                                  uncatCount:0, total:null,
                                  _subDrillNoBudget:true,
                                });
                                setDashSearch("");
                              };
                              return [
                                ["Mitte", mitte, realMitte, pendMitte, budgetMitteS, ()=>openSubDrill(14,"Mitte")],
                                ["Ende",  ende,  realEnde,  pendEnde,  budgetEndeS,  ()=>openSubDrill(31,"Ende")],
                                ["aktuell",  aktuell,realEnde, 0, 0,   ()=>openSubDrill(31,"aktuell")],
                              ].map(([lbl,val,real,pnd,bgt,onCellClick])=>{
                                const onlyPend = pnd>0 && real===0;
                                const valCol = val===0 ? T.txt2 : onlyPend ? T.gold : (cat.type==="income"?T.pos:T.neg);
                                const pct = bgt>0 ? Math.min(110, val/bgt*100) : null;
                                const barCol = pct===null ? T.pos
                                  : pct<=50  ? T.pos
                                  : pct<=75  ? "#8BC34A"
                                  : pct<=100 ? T.gold
                                  : T.neg;
                                return (
                                  <div key={lbl} onClick={e=>{e.stopPropagation();if(val>0)onCellClick();}}
                                    style={{textAlign:"center",cursor:val>0?"pointer":"default",
                                    flex:1,minWidth:0,padding:"5px 4px",borderRadius:7,
                                    background:T.cat_bg?"rgba(255,255,255,0.10)":(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.04)",
                                    border:`1px solid ${onlyPend?T.gold:T.bd}`,
                                    position:"relative",overflow:"hidden",
                                    display:"flex",flexDirection:"column",gap:1}}>
                                    {/* Betrag (Label steht als fixe Spaltenueberschrift darueber; Vorzeichen weggelassen, Farbe codiert) */}
                                    <div style={{color:valCol,fontSize:18,
                                      fontWeight:800,fontFamily:NUM_FONT,whiteSpace:"nowrap"}}>
                                      {val>0?fmt(val):"—"}
                                    </div>
                                    {/* Budget-Balken direkt in Zelle */}
                                    {bgt>0&&(
                                      <div style={{width:"100%",height:2,borderRadius:1,
                                        background:"rgba(255,255,255,0.1)",overflow:"hidden",marginTop:1}}>
                                        <div style={{height:"100%",borderRadius:1,
                                          background:barCol,
                                          width:`${Math.min(100,pct)}%`,
                                          transition:"width 0.3s"}}/>
                                      </div>
                                    )}
                                    {/* Budget-Zahl */}
                                    {bgt>0&&(
                                      <div style={{color:T.txt2,fontSize:11,fontWeight:600,
                                        whiteSpace:"nowrap",opacity:0.8}}>
                                        {fmt(bgt)}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>

                        </div>
                        {/* Budget-Fortschrittsbalken wenn Budget vorhanden */}
                        {isExp(sub.id)&&budget>0&&(()=>{
                          const realAmt = realEnde;
                          const pendAmt = pendEnde;
                          const totalAmt = realAmt + pendAmt;
                          const pct = Math.min(110, totalAmt / budget * 100);
                          const barCol = pct<=50?T.pos:pct<=75?"#8BC34A":pct<=100?T.gold:T.neg;
                          const rest = Math.max(0, budget - totalAmt);
                          const ueber = totalAmt > budget ? totalAmt - budget : 0;
                          return (
                            <div style={{padding:"10px 14px 8px",
                              background:"rgba(255,255,255,0.02)",
                              borderBottom:`1px solid ${T.bd}`}}>
                              {/* Balken */}
                              <div style={{height:6,borderRadius:3,
                                background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(0,0,0,0.1)":"rgba(255,255,255,0.1)",
                                overflow:"hidden",marginBottom:6}}>
                                <div style={{height:"100%",borderRadius:3,
                                  background:barCol,
                                  width:`${Math.min(100,pct)}%`,
                                  transition:"width 0.3s"}}/>
                              </div>
                              {/* Zahlen-Zeile */}
                              <div style={{display:"flex",justifyContent:"space-between",
                                alignItems:"center",gap:8}}>
                                <div style={{fontSize:9,color:T.txt2}}>
                                  <span style={{color:T.neg,fontWeight:700,fontFamily:NUM_FONT}}>
                                    −{fmt(realAmt)}
                                  </span>
                                  {pendAmt>0&&<span style={{color:T.gold,fontFamily:NUM_FONT}}>
                                    {" "}+<span style={{color:T.gold}}>{cat.type==="income"?"+":"−"}{fmt(pendAmt)} vorgem.</span>
                                  </span>}
                                  <span style={{color:T.txt2}}> / {cat.type==="income"?"+":"−"}{fmt(budget)}</span>
                                </div>
                                {ueber>0
                                  ? <span style={{fontSize:9,color:T.neg,fontWeight:700}}>
                                      {Li("alert-circle",9,T.neg)} −{fmt(ueber)} über Budget
                                    </span>
                                  : <span style={{fontSize:9,color:rest>0?T.pos:T.txt2,fontWeight:700}}>
                                      {rest>0?`${fmt(rest)} frei`:"aufgebraucht"}
                                    </span>
                                }
                              </div>
                            </div>
                          );
                        })()}
                        {/* Buchungen der Unterkategorie */}
                        {isExp(sub.id)&&subTxs.sort((a,b)=>b.date.localeCompare(a.date)).map(tx=>{
                          const sp = (tx.splits||[]).find(s=>s.subId===sub.id);
                          const amt = sp ? Math.abs(pn(sp.amount)) : Math.abs(tx.totalAmount);
                          return (
                            <div key={tx.id} onClick={()=>{setDashDrill(null);openEdit(tx);}}
                              style={{padding:"7px 14px 7px 28px",
                                borderBottom:`1px solid ${T.bd}`,
                                background:tx.pending
                                  ?"rgba(245,166,35,0.07)":"rgba(0,0,0,0.15)",
                                cursor:"pointer",display:"flex",flexDirection:"column",gap:3}}>
                              {renderDesc(tx,{color:T.txt,size:15,weight:600,fallback:sub.name})}
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                                <div style={{color:T.txt2,fontSize:12,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",minWidth:0}}>
                                  <span>{tx.date}</span>
                                  {tx.pending&&<span style={{color:T.gold,fontSize:11,fontWeight:700}}>
                                    {tx._seriesId?"wiederkehrend":"vorgemerkt"}
                                  </span>}
                                  <LinkBadges tx={tx}/>
                                </div>
                                <span style={{color:tx.pending?T.gold:(cat.type==="income"?T.pos:T.neg),fontSize:17,
                                  fontWeight:700,fontFamily:NUM_FONT,flexShrink:0}}>
                                  {fmt(amt)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </>);
                })()}
                {/* Normale Buchungsliste wenn kein Kategorie-Drill oder Suche aktiv */}
                {(!dashDrill.cat||dashSearch)&&(()=>{
                  const sorted = groupBudgetPairs((dashDrill.cat ? [
                    ...txs.filter(t=>{const d=new Date(t.date);return !t.pending&&!t._linkedTo&&d.getFullYear()===year&&d.getMonth()===month&&(t.splits||[]).some(sp=>sp.catId===dashDrill.cat.id);}),
                    ...txs.filter(t=>{const d=new Date(t.date);return t.pending&&!t._budgetSubId&&d.getFullYear()===year&&d.getMonth()===month&&(t.splits||[]).some(sp=>sp.catId===dashDrill.cat.id);}),
                  ].sort(drillSort)
                  : [...(dashDrill.txList||[]).map(t=>txs.find(x=>x.id===t.id)||t)]
                      .filter(t=>!(dashDrill._subDrillNoBudget&&t.pending&&t._budgetSubId))
                      .sort((a,b)=>{const da=a.date||"",db=b.date||"";return db.localeCompare(da);})
                  ).filter(t=>{
                    if(!dashSearch) return true;
                    const isAmtSearch = /^[=<>]?[\d.,]+$/.test(dashSearch.trim());
                    if(isAmtSearch) return matchAmount(Math.abs(t.totalAmount), dashSearch);
                    return matchSearch(t.desc, dashSearch);
                  }));
                  // Trennlinie zwischen Mitte (1-14) und Ende (15-31) einfügen
                  const sectionOf = t => {
                    if(!t._budgetSubId) return 2;
                    return t._budgetSubId.endsWith("_mitte") ? 0 : 1;
                  };
                  let lastSection = null;
                  return sorted.map((tx,idx)=>{
                    const sec = sectionOf(tx);
                    // Trennlinie nur zwischen Budget-Ende (1) und Rest (2), oder zwischen Mitte (0) und Ende (1)
                    const showDivider = !dashSearch && lastSection!==null && lastSection<2 && sec===2;
                    lastSection = sec;
                    return (<React.Fragment key={tx.id}>
                      {showDivider&&<div style={{padding:"6px 18px",background:T.surf3,
                        borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:1,background:T.bd}}/>
                        <span style={{color:T.txt2,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Vormerkungen</span>
                        <div style={{flex:1,height:1,background:T.bd}}/>
                      </div>}
                      {(()=>{
                  // Budget-Paar: als einzelne Zeile darstellen
                  if(tx._isBudgetPair) {
                    const cat2 = getCat((tx.splits||[])[0]?.catId);
                    const col2 = T.neg;
                    return (
                      <div key={tx.id} style={{padding:"10px 18px",borderBottom:`1px solid ${T.bd}`,background:T.surf3}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setDashDrill(null);openEdit(tx);}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:T.txt,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc||cat2?.name}</div>
                            <div style={{color:T.txt2,fontSize:10}}>{tx.date.slice(0,7)}</div>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                            <span style={{color:T.mid,fontSize:10}}>Mitte</span>
                            <span style={{color:col2,fontSize:12,fontWeight:700,fontFamily:NUM_FONT}}>−{fmt(tx._mitteAmt)}</span>
                            <span style={{color:T.gold,fontSize:10}}>Gesamt</span>
                            <span style={{color:col2,fontSize:12,fontWeight:700,fontFamily:NUM_FONT}}>−{fmt(tx._mitteAmt+tx._endeAmt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // Ungepaartes Budget (z.B. "Budget für Unvorhergesehenes" ohne Mitte)
                  if(tx._budgetSubId && !tx._isBudgetPair) {
                    const cat2 = getCat((tx.splits||[])[0]?.catId);
                    const col2 = T.neg;
                    const isMitte = tx._budgetSubId.endsWith("_mitte");
                    return (
                      <div key={tx.id} style={{padding:"10px 18px",borderBottom:`1px solid ${T.bd}`,background:T.surf3}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setDashDrill(null);openEdit(tx);}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:T.txt,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc||cat2?.name}</div>
                            <div style={{color:T.txt2,fontSize:10}}>{tx.date.slice(0,7)}</div>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                            {isMitte&&<><span style={{color:T.mid,fontSize:10}}>Mitte</span>
                            <span style={{color:col2,fontSize:12,fontWeight:700,fontFamily:NUM_FONT}}>−{fmt(tx.totalAmount)}</span></>}
                            <span style={{color:T.gold,fontSize:10}}>Gesamt</span>
                            <span style={{color:col2,fontSize:12,fontWeight:700,fontFamily:NUM_FONT}}>−{fmt(tx.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const sp = dashDrill.cat ? (tx.splits||[]).find(s=>s.catId===dashDrill.cat.id) : (tx.splits||[])[0];
                  const sub = getSub(sp?.catId, sp?.subId);
                  const cat = getCat(sp?.catId);
                  // Für Vormerkungsliste (kein Kategorie-Filter) immer Gesamtbetrag zeigen
                  const amt = dashDrill.cat ? (sp ? pn(sp.amount) : tx.totalAmount) : tx.totalAmount;
                  const isS = (tx.splits||[]).length>1;
                  const isUncat = (tx.splits||[]).length===0||(tx.splits||[]).every(s=>!s.catId);
                  const isPendingSplit = tx.pending && isS;
                  const isExpanded = expandedSplitId === tx.id;
                  return (
                    <div key={tx.id}
                      style={{padding:"10px 18px",borderBottom:`1px solid ${T.bd}`,
                        background:tx.pending?T.surf3:"transparent"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:(isUncat||isExpanded)?6:0,
                        cursor:isUncat?"default":"pointer"}}
                        onClick={()=>{
                          if(isUncat) return;
                          if(isS) { setExpandedSplitId(isExpanded?null:tx.id); return; }
                          setDashDrill(null); openEdit(tx);
                        }}>
                        {/* Zeile 1: Buchungstext (ausklappbar) + ggf. Split-Chevron */}
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            {renderDesc(tx,{color:T.txt,size:15,weight:600,fallback:dashDrill.cat?.name||"Buchung"})}
                          </div>
                          {!isUncat&&isS&&<span style={{color:T.txt2,fontSize:16,flexShrink:0}}>{Li(isExpanded?"chevron-up":"chevron-down",14)}</span>}
                        </div>
                        {/* Zeile 2: Datum + Status/Badges links, Betrag rechts (volle Breite) */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                          <div style={{color:T.txt2,fontSize:12,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",minWidth:0}}>
                            <span style={{color:"rgba(220,90,20,0.9)"}}>{tx.date}</span>
                            {tx.pending&&<span style={{
                              background:tx._seriesTyp==="finanzierung"?"rgba(245,166,35,0.2)":tx._seriesId?"rgba(170,204,0,0.15)":"rgba(74,159,212,0.15)",
                              color:tx._seriesTyp==="finanzierung"?T.gold:tx._seriesId?T.pos:T.blue,
                              borderRadius:4,padding:"1px 5px",fontSize:10,fontWeight:700,
                              display:"inline-flex",alignItems:"center",gap:3}}>
                              {tx._seriesTyp==="finanzierung"?Li("credit-card",9,T.gold):tx._seriesId?Li("repeat",9,T.pos):Li("calendar",9,T.blue)}
                              {tx._seriesTyp==="finanzierung"?"Finanzierung":tx._seriesId?"wiederkehrend":"vorgemerkt"}
                            </span>}
                            {tx._seriesId&&tx._seriesTotal>1&&tx._seriesIdx&&tx._seriesTyp==="finanzierung"&&<span style={{color:T.gold,fontSize:10,fontWeight:700,
                              background:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(192,120,0,0.15)":"rgba(245,166,35,0.12)",borderRadius:4,padding:"0 4px"}}>
                              {tx._seriesIdx} / {tx._seriesTotal}
                            </span>}
                            <LinkBadges tx={tx}/>
                            {isS&&<span style={{background:"rgba(137,196,244,0.15)",color:T.blue,
                              borderRadius:4,padding:"0 4px",fontSize:10,fontWeight:700}}>Split</span>}
                            {sub&&!isUncat&&!isS&&<span style={{color:cat?.color||dashDrill.cat?.color||T.txt2,fontSize:12}}>{sub.name}</span>}
                            {isUncat&&<span style={{color:T.neg,fontSize:10,fontWeight:700}}>unkategorisiert</span>}
                          </div>
                          <div style={{color:dashDrill.isIncome?T.pos:T.neg,fontSize:17,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0}}>
                            {fmt(amt)}
                          </div>
                        </div>
                      </div>
                      {/* Aufgeklappte Split-Kategorien für alle Splitbuchungen */}
                      {isS&&isExpanded&&(
                        <div style={{marginTop:6,marginBottom:2,display:"flex",flexDirection:"column",gap:3}}>
                          {(tx.splits||[]).filter(s=>s.catId).map(s=>{
                            const sCat=getCat(s.catId), sSub=getSub(s.catId,s.subId);
                            const isLinked=false;
                            const isCurrentCat = dashDrill.cat && s.catId===dashDrill.cat.id;
                            return (
                              <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,
                                padding:"4px 8px",borderRadius:7,
                                background:isCurrentCat?T.blue:T.surf3,
                                border:`1px solid ${isCurrentCat?T.pos:T.bd}`}}>
                                <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,
                                  background:sCat?.color||T.txt2,display:"inline-block"}}/>
                                <span style={{flex:1,color:sCat?.color||T.txt2,fontSize:11,fontWeight:600,
                                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                  {sSub?.name||sCat?.name||"?"}
                                </span>
                                {isLinked&&<span style={{color:T.blue,fontSize:9,flexShrink:0,
                                  display:"flex",alignItems:"center",gap:3}}>
                                  {Li("link",9,T.blue)} zugeordnet
                                </span>}
                                <span style={{color:isLinked?T.txt2:dashDrill.isIncome?T.pos:T.neg,
                                  fontSize:11,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0,
                                  opacity:isLinked?0.5:1}}>
                                  {dashDrill.isIncome?"+":"−"}{fmt(pn(s.amount))}
                                </span>
                              </div>
                            );
                          })}
                          <button onClick={()=>{setDashDrill(null);openEdit(tx);}}
                            style={{marginTop:2,padding:"5px",borderRadius:7,border:`1px solid ${T.bds}`,
                              background:"transparent",color:T.blue,fontSize:10,cursor:"pointer",
                              display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                            {Li("edit",10,T.blue)} Bearbeiten
                          </button>
                        </div>
                      )}
                      {isUncat&&(
                        <CatPicker value="|"
                          onChange={(catId,subId)=>{
                            if(!catId) return;
                            setTxs(p=>p.map(t=>t.id!==tx.id?t:{...t,
                              splits:[{id:uid(),catId,subId,amount:t.totalAmount}]
                            }));
                            setDashDrill(d=>d?({...d,
                              txList:d.txList.map(t=>t.id!==tx.id?t:{...t,
                                splits:[{id:uid(),catId,subId,amount:t.totalAmount}]
                              })
                            }):null);
                          }}
                          placeholder="Kategorie zuweisen…"
                          filterType={tx._csvType||null}
                        />
                      )}
                    </div>
                  );
                  })()}
                  </React.Fragment>);
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
      {budgetEditSub&&budgetEditSub.id&&<BudgetEditorModal
        key={`${budgetEditKey}-${year}-${month}`}
        sub={{id:budgetEditSub.id,name:budgetEditSub.name}}
        cat={{id:budgetEditSub.catId,color:budgetEditSub.catColor}}
        accountId={budgetEditSub.accountId||"acc-giro"}
        onClose={()=>setBudgetEditSub(null)}/>}
    </>);

}

// ══════════════════════════════════════════════════════════════════════

export { DashboardScreenV2 };
