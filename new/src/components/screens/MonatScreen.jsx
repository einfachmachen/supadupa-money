// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useMemo, useRef, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { CategoryChart } from "../molecules/CategoryChart.jsx";
import { MitteEndeFields } from "../molecules/MitteEndeFields.jsx";
import { BudgetEditorModal } from "../organisms/BudgetEditorModal.jsx";
import { IconPickerDialog } from "../organisms/IconPickerDialog.jsx";
import { SaldoHero2 } from "../organisms/SaldoHero2.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { PAL } from "../../theme/palette.js";
import { MONTHS_F } from "../../utils/constants.js";
import { dayOf, fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchAmount, matchSearch } from "../../utils/search.js";
import { isDuplCounterpart, buildTxIdMap } from "../../utils/tx.js";
import { saldoAt, saldoMitte, saldoEnde } from "../../utils/saldo.js";

function MonatScreen() {
  const { cats,setCats,groups,setGroups,txs,setTxs,accounts,setAccounts,
    yearData,setYearData,year,setYear,month,setMonth,selAcc,isLand,
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
    navigateToSparen,
  } = useContext(AppCtx);

    const _isSelAcc = t => !selAcc || t.accountId===selAcc || (!t.accountId && selAcc==="acc-giro");
    // Index für schnelle _linkedTo-Partner-Lookup (für Sparen-Transfer-Erkennung)
    const _txsById = useMemo(()=>buildTxIdMap(txs), [txs]);
    const _isDupl  = t => isDuplCounterpart(t, _txsById);
    const [filt,     setFilt]     = useState("all");
    const [showAllCats, setShowAllCats] = useState(false);
    const [activeCatTxId, setActiveCatTxId] = useState(null);
    const pendingCatsRef = useRef({});
    const [txIconPickM, setTxIconPickM] = useState(null);
    const [search,   setSearch]   = useState("");
    const [selected, setSelected] = useState(new Set());
    const [bulkCat,  setBulkCat]  = useState({catId:"",subId:""});
    const [budgetEditSub, setBudgetEditSub] = useState(null);
    const [budgetEditKey, setBudgetEditKey] = useState(0);
    const openBudgetEdit = (sub) => { setBudgetEditSub(sub); setBudgetEditKey(k=>k+1); };
    const mCatOptions = useMemo(()=>{
      const opts=[];
      groups.forEach(g=>cats.filter(c=>c.type===g.type).forEach(cat=>
        (cat.subs||[]).forEach(sub=>opts.push({catId:cat.id,subId:sub.id,label:`${cat.name} / ${sub.name}`,group:g.label}))));
      return opts;
    },[cats,groups]);

    // _linkedTo-Counterparts: in Globalansicht ausblenden (sonst werden Umbuchungen doppelt
    // gezählt). In Konto-spezifischer Ansicht (selAcc gesetzt) MÜSSEN sie sichtbar sein,
    // sonst fehlen z. B. die Einnahme-Vormerkungen auf Tagesgeld komplett.
    const allMTxs = txs.filter(t=>{
      const d=new Date(t.date);
      if(d.getFullYear()!==year||d.getMonth()!==month) return false;
      if(t._budgetSubId) return false;
      if(!_isSelAcc(t)) return false;
      if(t._linkedTo) {
        // CSV-Duplikat (zugeordnete Vormerkung ↔ Buchung auf demselben Konto):
        // immer ausblenden, sonst erscheint die Buchung doppelt — auch konto-spezifisch.
        if(_isDupl(t)) return false;
        // Sparen-/Konten-Transfer (Partner auf anderem Konto): nur in der
        // Gesamtansicht ausblenden, konto-spezifisch sichtbar lassen.
        if(!selAcc) return false;
      }
      return true;
    }).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const filtByType = filt==="all" ? allMTxs : filt==="pending" ? allMTxs.filter(t=>t.pending) : filt==="uncat" ? allMTxs.filter(t=>(t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId)) : filt==="mismatch" ? allMTxs.filter(t=>{ const ct=t._csvType; if(!ct) return false; const tt=txType(t); return (ct==="expense"&&tt==="income")||(ct==="income"&&tt==="expense"); }) : allMTxs.filter(t=>!t.pending&&txType(t)===filt);
    const mTxs = search.trim() ? filtByType.filter(t=>{
      const isAmt = /^[=<>]?[\d.,]+$/.test(search.trim());
      if(isAmt) return matchAmount(Math.abs(t.totalAmount), search);
      return matchSearch(t.desc,search)||(t.splits||[]).some(sp=>matchSearch(getCat(sp.catId)?.name,search)||matchSearch(getSub(sp.catId,sp.subId)?.name,search));
    }) : filtByType;

    const allSel = mTxs.length>0 && mTxs.every(t=>selected.has(t.id));
    const toggleAll = () => setSelected(allSel ? new Set() : new Set(mTxs.map(t=>t.id)));
    const toggleOne = (id) => setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
    const applyBulk = () => {
      if(!bulkCat.catId||selected.size===0) return;
      setTxs(p=>p.map(tx=>!selected.has(tx.id)?tx:{...tx,splits:[{id:uid(),catId:bulkCat.catId,subId:bulkCat.subId,amount:tx.totalAmount}]}));
      setSelected(new Set()); setBulkCat({catId:"",subId:""});
    };
    const inSearchMode = search.trim().length>0;
    const selCount = [...selected].filter(id=>mTxs.some(t=>t.id===id)).length;

    const totalIn  = getTotalIncome(year, month);
    const totalOut = getTotalExpense(year, month);
    const pendOut  = allMTxs.filter(t=>t.pending).reduce((s,t)=>s+t.totalAmount,0);

    // Detail-Prognose früh berechnen — wird für getDaySaldo UND SaldoHero2 genutzt.
    // BUGFIX: getPrognoseSaldoDetail liefert globale Werte (kein Konto-Filter).
    // Wir überschreiben das saldo-Feld UND das base-Feld mit den zentralen
    // saldoAt-Funktionen, damit Hero MITTE/ENDE und Drilldown-Vormonatssaldo
    // für Gesamt = Σ Konten gilt. Die Drilldown-Felder (budgetEntries etc.)
    // bleiben unverändert.
    const _today3 = new Date();
    const _isCurM = year===_today3.getFullYear()&&month===_today3.getMonth();
    const _isFutM = year>_today3.getFullYear()||(year===_today3.getFullYear()&&month>_today3.getMonth());
    const _saldoCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
    // base = saldoAt(Tag 0) liefert den Anker (Vormonats-Endsaldo) für selAcc oder Gesamt.
    const _detailBase = (sa) => saldoAt(year, month, 0, sa, _saldoCtx);
    // Konto-Filter für Drilldown-Detail. selAcc=null → kein Konto-Filter,
    // aber wir filtern IMMER verlinkte Vormerkungen aus (Vormerkung+echte Buchung
    // sind aneinander gemappt → in der Liste nur die echte Buchung anzeigen).
    // Budgets liegen auf acc-giro: bei Tagesgeld werden sie ausgefiltert.
    const _txIdMap = buildTxIdMap(txs);
    // Vormerkungs-IDs, denen bereits eine echte Buchung (mit _linkedTo darauf)
    // zugeordnet wurde — werden in den Drilldown-Listen ausgefiltert.
    const _linkedPendIds = new Set();
    (txs||[]).forEach(t => {
      if(!t.pending && t._linkedTo) _linkedPendIds.add(t._linkedTo);
    });
    const _filterDetailByAcc = (det, sa) => {
      if(!det) return det;
      const accMatchOrAny = (t) => !sa || (t.accountId || "acc-giro") === sa;
      const dropLinkedPend = (t) => !_linkedPendIds.has(t.id);
      const dropDuplReal   = (t) => !isDuplCounterpart(t, _txIdMap);
      // Budget-Entries auch filtern: realTxs/concTxs sind eigene Listen pro
      // Budget-Kategorie. Ex-Vormerkungen mit _linkedTo landen hier wenn sie
      // eine Sub-Kategorie haben.
      const filterBudgetEntry = (be) => {
        if(!be) return be;
        const realTxs = (be.realTxs || []).filter(accMatchOrAny).filter(dropDuplReal);
        const concTxs = (be.concTxs || []).filter(accMatchOrAny).filter(dropLinkedPend);
        // realAmt/concAmt aus den GEFILTERTEN Listen neu berechnen, sonst zeigt
        // "genutzt" (= realAmt+concAmt) eine andere Summe als die darunter
        // aufgelisteten Buchungen (z.B. nach Konto-Filter oder Duplikat-Drop).
        // Gleiche Pro-Split-Logik wie in App.jsx und SaldoPrognose.TxRow.
        const sumFor = (list) => list.reduce((s,t)=>{
          const sp = (t.splits||[]).find(sp=>sp.subId===be.baseSubId);
          const amt = sp?.amount!=null && sp.amount!==0 ? Math.abs(sp.amount) : Math.abs(t.totalAmount);
          return s + amt;
        }, 0);
        return {
          ...be,
          realTxs, concTxs,
          realAmt: sumFor(realTxs),
          concAmt: sumFor(concTxs),
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
    const monatDetailMitte = useMemo(()=> {
      const base = getPrognoseSaldoDetail(year, month, true);
      if(!base) return null;
      const filtered = _filterDetailByAcc(base, selAcc);
      return {
        ...filtered,
        saldo: saldoAt(year, month, 14, selAcc, _saldoCtx),
        base:  _detailBase(selAcc),
      };
    }, [year, month, txs, accounts, selAcc]);
    const monatDetailEnde = useMemo(()=> {
      const base = getPrognoseSaldoDetail(year, month, false);
      if(!base) return null;
      const lastDay = new Date(year, month+1, 0).getDate();
      const filtered = _filterDetailByAcc(base, selAcc);
      return {
        ...filtered,
        saldo: saldoAt(year, month, lastDay, selAcc, _saldoCtx),
        base:  _detailBase(selAcc),
      };
    }, [year, month, txs, accounts, selAcc]);

    // UNIVERSALE LOGIK (identisch mit expenseTotals/incomeTotals in der Buchungen-View)
    // PERFORMANCE-FIX: vorher pro sub ein txs.filter (O(subs × txs)) — bei 10k+ Buchungen
    // und 30 Subs = 300k Iterationen pro Render. Jetzt einmalig einen Subsumme-Index
    // bauen (O(txs)).
    const _subSumByAcc = (!selAcc) ? null : (() => {
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
    })();
    const catSums = cats.filter(c=>c.type==="expense").map(c=>({...c,sum:(c.subs||[]).reduce((s,sub)=>{
      if(!selAcc) return s+getActualSum(year,month,sub.id);
      return s + (_subSumByAcc[sub.id]||0);
    },0)})).filter(c=>c.sum>0).sort((a,b)=>b.sum-a.sum);
    const maxSum  = catSums[0]?.sum||1;

    const byDate  = mTxs.reduce((acc,tx)=>{ if(!acc[tx.date])acc[tx.date]=[]; acc[tx.date].push(tx); return acc; },{});
    // Stelle sicher dass der 14. und Monatsletzt immer im Rendering auftauchen (Restbudget-Zeilen)
    const pad2 = n=>String(n).padStart(2,"0");
    const lastDayOfMonth = new Date(year, month+1, 0).getDate();
    const mitteIso = `${year}-${pad2(month+1)}-14`;
    const endeIso  = `${year}-${pad2(month+1)}-${pad2(lastDayOfMonth)}`;

    // PERFORMANCE-FIX: vorab für jede subId einen Tages-Aggregat-Index aufbauen.
    // Vorher liefen in calcOpenBudgetDetails pro Sub × pro Tag-Filter (Mitte/Ende) zwei
    // txs.filter über alle 12k Buchungen — bei 100 Subs × 2 Durchläufe = 2,4 Mio
    // Iterationen, doppelt wegen calcOpenBudgetDetails(14) + (lastDayOfMonth).
    // Jetzt einmal pro Render aufgebaut.
    const _subDayMap = useMemo(()=>{
      const m = new Map();
      const monthTxs = _txsInMonth(year, month);
      for(const t of monthTxs) {
        if(t._linkedTo || t._budgetSubId) continue;
        const d = new Date(t.date);
        const day = d.getDate();
        const isPend = !!t.pending;
        const splits = t.splits || [];
        // Pro Sub nur die ERSTE matchende split (matcht das ursprüngliche .find()-Verhalten)
        const seenSubs = new Set();
        for(const sp of splits) {
          if(!sp.subId || seenSubs.has(sp.subId)) continue;
          seenSubs.add(sp.subId);
          const amt = (sp.amount!=null && sp.amount!==0) ? Math.abs(sp.amount) : Math.abs(t.totalAmount);
          const k = sp.subId + "|" + day + (isPend ? "|p" : "|r");
          m.set(k, (m.get(k)||0) + amt);
        }
      }
      return m;
    }, [txs, year, month]);

    // Liefert Summe für Sub bis maxDay (real ODER pending).
    const _subSumUpTo = (subId, maxDay, kind /* "r" | "p" */) => {
      let s = 0;
      for(let d=1; d<=maxDay; d++) {
        s += _subDayMap.get(subId + "|" + d + "|" + kind) || 0;
      }
      return s;
    };

    // Offenes Budget für Tag 14 (Mitte) und Monatsletzter (Ende) berechnen
    // = Budget - (echte Buchungen + Vormerkungen bis maxDay) für alle Expense-Subs mit Budget
    const calcOpenBudgetDetails = (maxDay) => {
      // Budgets nur für Gesamt oder Giro anzeigen — andere Konten haben keine Budgets
      // Aber: Kategorieübersicht zeigen auch für Tagesgeld (einfach nur ohne Budgets)
      if(selAcc && selAcc !== "acc-giro") return { items:[], totalOpen:0 };
      const items = [];
      let totalOpen = 0;
      cats.filter(c=>c.type==="expense"||c.type==="income").forEach(cat=>{
        (cat.subs||[]).forEach(sub=>{
          const isMitte = maxDay===14;
          const pad2m = n=>String(n).padStart(2,"0");
          const pfx = `${year}-${pad2m(month+1)}-`;

          // Prüfe ob dieses Budget einen Mitte-Split hat
          const mittePx = txs.find(t=>t.pending&&t._budgetSubId===sub.id+"_mitte"&&t.date.startsWith(pfx));
          const hasAnyMittePx = txs.some(t=>t.pending&&t._budgetSubId===sub.id+"_mitte");
          const mitteFromTemplate = pn(budgets[sub.id+"_mitte"]?.amount)||0;
          const mitteAmt = mittePx ? Math.abs(pn(mittePx.totalAmount))
            : (hasAnyMittePx ? 0 : mitteFromTemplate);
          const hasSplit = mitteAmt > 0;

          let bgt = 0;
          if(isMitte) {
            // Am 14.: Mitte-Budget anzeigen (nur wenn Split vorhanden)
            if(!hasSplit) return; // kein Mitte-Split → nicht am 14. anzeigen
            bgt = mitteAmt;
          } else {
            // Am Monatsletzten: Gesamt-Budget anzeigen (mit oder ohne Split)
            if(hasSplit) {
              // Split-Budget: Gesamt = Mitte-Platzhalter + Ende-Platzhalter (sub.id)
              const endePx = txs.find(t=>t.pending&&t._budgetSubId===sub.id&&t.date.startsWith(pfx));
              const hasAnyEndePx = txs.some(t=>t.pending&&t._budgetSubId===sub.id);
              const endeAmt = endePx ? Math.abs(pn(endePx.totalAmount))
                : (hasAnyEndePx ? 0 : (pn(budgets[sub.id]?.amount)||0));
              // Gesamtbudget = Mitte + Ende-Hälfte
              bgt = mitteAmt + endeAmt;
            } else {
              // Kein Split: einfaches Monats-Budget
              const budgetKey = sub.id;
              const px = txs.find(t=>t.pending&&t._budgetSubId===budgetKey&&t.date.startsWith(pfx));
              const hasAnyPx = txs.some(t=>t.pending&&t._budgetSubId===budgetKey);
              bgt = px ? Math.abs(pn(px.totalAmount)) : (hasAnyPx ? 0 : (pn(budgets[budgetKey]?.amount)||0));
            }
          }
          if(bgt<=0) return;

          // PERFORMANCE-FIX: vorher 2× txs.filter über alle 12k txs pro Sub.
          // Jetzt O(maxDay) Lookups in _subDayMap.
          const real = _subSumUpTo(sub.id, maxDay, "r");
          const pend = _subSumUpTo(sub.id, maxDay, "p");
          const spent = real + pend;
          const open = bgt - spent; // kann negativ sein (Budget überschritten)
          if(open !== 0) items.push({name:`${cat.name} / ${sub.name}`, spent, budget:bgt, open, type:cat.type});
          totalOpen += Math.max(0, open); // nur positives Restbudget zählt für Abzug
        });
      });
      return {items, totalOpen};
    };
    const budgetDetailsMitte = useMemo(()=>calcOpenBudgetDetails(14),           [year,month,txs,selAcc]);
    const budgetDetailsEnde  = useMemo(()=>calcOpenBudgetDetails(lastDayOfMonth),[year,month,txs,selAcc]);
    const openBudgetMitte = budgetDetailsMitte.totalOpen;
    const openBudgetEnde  = budgetDetailsEnde.totalOpen;
    if(budgetDetailsMitte.items.length && !byDate[mitteIso]) byDate[mitteIso]=[];
    if(budgetDetailsEnde.items.length  && !byDate[endeIso])  byDate[endeIso]=[];
    const dates   = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
    const fmtD    = iso=>{ const[,,d]=iso.split("-"); return `${d}.`; };
    const dayName = iso=>["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(iso).getDay()];

    // Tagessaldo-Basis: PrognoseE des Vormonats — gleiche Logik wie Dashboard (getProgEnde)
    // Vergangene Monate → echter Endkontostand; aktuell/zukünftig → rekursive Prognose
    // NEU: nutzt saldoEnde aus utils/saldo.js (single source of truth)
    const _getProgEndeM = useMemo(() => {
      const cache = {};
      return (y, m) => {
        const ck = `${y}-${m}`;
        if(ck in cache) return cache[ck];
        // Gesamt = Summe saldoEnde über alle Konten
        // Nutze die zentrale Funktion
        const ctx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
        let total = 0;
        let any = false;
        (accounts || []).forEach(acc => {
          const v = saldoEnde(y, m, acc.id, ctx);
          if(v != null && !isNaN(v)) { total += v; any = true; }
        });
        const result = any ? total : null;
        cache[ck] = result;
        return result;
      };
    }, [txs, cats, accounts, getKumulierterSaldo]);
    const baseSaldo = useMemo(()=>{
      const prevY2 = month===0 ? year-1 : year, prevM2 = month===0 ? 11 : month-1;
      if(selAcc) {
        return getProgEndeAccGlobal(prevY2, prevM2, selAcc) ?? getKumulierterSaldo(prevY2, prevM2, selAcc);
      } else {
        // Gesamt: Summe aller Konten PrognoseE vom Vormonat
        let totalE = 0;
        (accounts || []).forEach(acc => {
          const e = getProgEndeAccGlobal(prevY2, prevM2, acc.id);
          if(e !== null && e !== undefined) totalE += e;
        });
        return totalE > 0 ? totalE : null;
      }
    }, [year, month, selAcc, accounts, txs]);

    // _calcInc/_calcOut: Berechnung von Einnahmen/Ausgaben bis zu einem cut-day (1..lastDay)
    // im aktuellen Monat. Vorher nur in SaldoHero2-IIFE definiert, jetzt zentral nutzbar
    // auch in getDaySaldo. Liefert die gleiche Budget-Floor-Logik wie Hero, so dass
    // Tagessaldi am 14./15./letzten-Tag-Übergang exakt mit Hero MITTE/ENDE übereinstimmen.
    //
    // Wichtig: isMC = "maxDay liegt in oder vor Monatsmitte"; Tag 14 ist *noch* Mitte.
    const _heroCalc = useMemo(()=>{
      const _tbHC=new Date(),_tdY=_tbHC.getFullYear(),_tdM=_tbHC.getMonth(),_tdD=_tbHC.getDate();
      const _isCurHC=year===_tdY&&month===_tdM, _isPastHC=year<_tdY||(year===_tdY&&month<_tdM);
      const _lastDayHC=new Date(year,month+1,0).getDate();
      const _mitteAbgHC = _isPastHC || (_isCurHC && _tdD>14);
      // _endeAbg: ab dem letzten Tag → "Ende-Periode ist abgelaufen"
      const _calcInc=(maxDay,onlyReal=false)=>{
        const isMC = maxDay <= 14;
        const _endeAbgLocal = _isPastHC || (_isCurHC && _tdD >= maxDay);
        if(onlyReal || (isMC && _mitteAbgHC) || (!isMC && _endeAbgLocal)){
          return cats.filter(c=>c.type==="income"||c.type==="tagesgeld").reduce((s,cat)=>{
            const catTxs = _txsInMonthCat(year, month, cat.id);
            return s + catTxs.filter(t=>{if(t.pending||_isDupl(t)||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;})
              .reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
          },0);
        }
        return cats.filter(c=>c.type==="income"||c.type==="tagesgeld").reduce((s,cat)=>{
          const catTxs = _txsInMonthCat(year, month, cat.id);
          return s + catTxs.filter(t=>{if(_isDupl(t)||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;})
            .reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
        },0);
      };
      const _calcOut=(maxDay,onlyReal=false)=>{
        const isMC = maxDay <= 14;
        const _endeAbgLocal = _isPastHC || (_isCurHC && _tdD >= maxDay);
        return cats.filter(c=>c.type==="expense").reduce((s,cat)=>{
          const catTxs = _txsInMonthCat(year, month, cat.id);
          if(onlyReal||(isMC&&_mitteAbgHC)||(!isMC&&_endeAbgLocal)){
            return s+catTxs.filter(t=>{if(_isDupl(t)||t._budgetSubId)return false;if(t.pending&&t._seriesTyp!=="finanzierung")return false;const d=new Date(t.date);return d.getDate()<=maxDay;})
              .reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
          }
          const subIds=new Set((cat.subs||[]).map(sub=>sub.id));
          const subTotal=(cat.subs||[]).reduce((cs,sub)=>{
            const bG=getBudgetForMonth(sub.id,year,month);
            const bM=(()=>{const m2=getBudgetForMonth(sub.id+"_mitte",year,month);return(m2>0&&m2<bG)?m2:0;})();
            const budget=isMC?bM:bG;
            const subTxs = _txsInMonthCatSub(year, month, cat.id, sub.id);
            const real=subTxs.filter(t=>{if(t.pending||_isDupl(t)||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;}).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||0),0);
            const pend=subTxs.filter(t=>{if(!t.pending||_isDupl(t)||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;}).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||t.totalAmount),0);
            return cs+(budget>0?Math.max(budget,real+pend):real+pend);
          },0);
          const pendNoSub=catTxs.filter(t=>{if(!t.pending||_isDupl(t)||t._budgetSubId)return false;const d=new Date(t.date);if(d.getDate()>maxDay)return false;return (t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));}).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId))).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)||t.totalAmount),0),0);
          const realNoSub=catTxs.filter(t=>{if(t.pending||_isDupl(t)||t._budgetSubId)return false;const d=new Date(t.date);if(d.getDate()>maxDay)return false;return (t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));}).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId))).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
          return s+subTotal+pendNoSub+realNoSub;
        },0);
      };
      return { _calcInc, _calcOut };
    }, [year, month, txs, cats, _txsById]);

    const getDaySaldo = (isoDate) => {
      // NEU: Single Source of Truth — saldoAt aus utils/saldo.js
      // Tagessaldo am Tag X = Anker + Ist(1..X) − Sprung (am 14. bzw. letzten Tag)
      // Funktioniert für alle Konten + Gesamt (selAcc=null), für vergangene und
      // zukünftige Monate, mit korrekter Phasen-Logik aus der User-Spec.
      const [yy, mm, dd] = isoDate.split("-").map(Number);
      const dayNum = dd;
      const yYear = yy;
      const yMonth = mm - 1;
      const v = saldoAt(yYear, yMonth, dayNum, selAcc, _saldoCtx);
      return (v == null || isNaN(v)) ? null : v;
    };
    // Für die Minus-Warnung: ersten zukünftigen Tag mit positivem Saldo finden
    // (= Datum an dem z.B. das Gehalt eingeht und den Saldo dreht)
    const warningDates = new Map(); // isoDate → {deficit, nextPosDate, nextPosName, neededAmount}
    if(baseSaldo !== null && baseSaldo !== undefined) {
      const allDates = [...dates].sort((a,b)=>a.localeCompare(b)); // aufsteigend
      allDates.forEach((d, idx) => {
        const saldo = getDaySaldo(d);
        if(saldo !== null && saldo < 0) {
          // Nächsten Tag mit positivem Saldo finden (in diesem oder Folgemonat)
          let nextPos = null;
          for(let i = idx+1; i < allDates.length; i++) {
            const s2 = getDaySaldo(allDates[i]);
            if(s2 !== null && s2 >= 0) {
              // Name der Einnahme an diesem Tag
              const dayIncomeTxs = (byDate[allDates[i]]||[]).filter(t=>txType(t)==="income"||t._csvType==="income");
              const name = dayIncomeTxs.length>0
                ? (dayIncomeTxs[0].desc || getCat((dayIncomeTxs[0].splits||[])[0]?.catId)?.name || "Einnahme")
                : null;
              nextPos = {date: allDates[i], name};
              break;
            }
          }
          warningDates.set(d, {
            deficit: Math.abs(saldo),
            nextPos,
          });
        }
      });
    }

    const createNew = () => {
      const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;
      const firstCat = cats[0], firstSub = firstCat?.subs[0];
      const draft = {id:"t"+Date.now(), desc:"", totalAmount:0, date:iso, pending:false,
        splits:[{id:uid(), catId:firstCat?.id||"", subId:firstSub?.id||"", amount:0}]};
      setTxs(p=>[draft,...p]);
      openEdit(draft);
    };

    return (<>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",position:"relative"}} onTouchStart={onTS} onTouchEnd={onTE}>

        {/* Hero — SaldoHero2 wie Dashboard */}
        <div style={window.MBT_DEBUG?.disable_sticky?{}:{position:"sticky",top:0,zIndex:10,background:T.hero_bg}}>
        {(()=>{
          const _tb=new Date(),_todayY=_tb.getFullYear(),_todayM=_tb.getMonth(),_todayD=_tb.getDate();
          const _isCurS=year===_todayY&&month===_todayM,_isPastS=year<_todayY||(year===_todayY&&month<_todayM);
          const _lastDayS=new Date(year,month+1,0).getDate();
          const _mitteAbg=_isPastS||(_isCurS&&_todayD>14),_endeAbg=_isPastS||(_isCurS&&_todayD>=_lastDayS);
          const _h2 = t => { const d=new Date(t.date); return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()<=14; };
          const _calcInc=(maxDay,onlyReal=false)=>{
            const isMC=maxDay===14;
            // PERFORMANCE-FIX: nutzt _txsInMonthCat statt globalem txs.filter
            if(onlyReal||(isMC&&_mitteAbg)||(!isMC&&_endeAbg)){
              return cats.filter(c=>c.type==="income"||c.type==="tagesgeld").reduce((s,cat)=>{
                const catTxs = _txsInMonthCat(year, month, cat.id);
                return s + catTxs.filter(t=>{if(t.pending||t._linkedTo||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;})
                  .reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
              },0);
            }
            return cats.filter(c=>c.type==="income"||c.type==="tagesgeld").reduce((s,cat)=>{
              const catTxs = _txsInMonthCat(year, month, cat.id);
              return s + catTxs.filter(t=>{if(t._linkedTo||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;})
                .reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
            },0);
          };
          // BUGFIX (Monat-Sync): _calcOut nutzt jetzt die gleiche bM-Logik wie Home,
          // d.h. für isMC (Mitte) wird optional ein eigenes Mitte-Budget verwendet.
          // PERFORMANCE-FIX: nutzt Tx-Index-Helper statt globalem txs.filter
          const _calcOut=(maxDay,onlyReal=false)=>{
            const isMC=maxDay===14;
            return cats.filter(c=>c.type==="expense").reduce((s,cat)=>{
              const catTxs = _txsInMonthCat(year, month, cat.id);
              if(onlyReal||(isMC&&_mitteAbg)||(!isMC&&_endeAbg)){
                return s+catTxs.filter(t=>{if(t._linkedTo||t._budgetSubId)return false;if(t.pending&&t._seriesTyp!=="finanzierung")return false;const d=new Date(t.date);return d.getDate()<=maxDay;})
                  .reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
              }
              const subIds=new Set((cat.subs||[]).map(sub=>sub.id));
              const subTotal=(cat.subs||[]).reduce((cs,sub)=>{
                const bG=getBudgetForMonth(sub.id,year,month);
                const bM=(()=>{const m=getBudgetForMonth(sub.id+"_mitte",year,month);return(m>0&&m<bG)?m:0;})();
                const budget=isMC?bM:bG;
                const subTxs = _txsInMonthCatSub(year, month, cat.id, sub.id);
                const real=subTxs.filter(t=>{if(t.pending||t._linkedTo||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;}).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||0),0);
                const pend=subTxs.filter(t=>{if(!t.pending||t._linkedTo||t._budgetSubId)return false;const d=new Date(t.date);return d.getDate()<=maxDay;}).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||t.totalAmount),0);
                return cs+(budget>0?Math.max(budget,real+pend):real+pend);
              },0);
              const pendNoSub=catTxs.filter(t=>{if(!t.pending||t._linkedTo||t._budgetSubId)return false;const d=new Date(t.date);if(d.getDate()>maxDay)return false;return (t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));}).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId))).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)||t.totalAmount),0),0);
              const realNoSub=catTxs.filter(t=>{if(t.pending||t._linkedTo||t._budgetSubId)return false;const d=new Date(t.date);if(d.getDate()>maxDay)return false;return (t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));}).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId))).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
              return s+subTotal+pendNoSub+realNoSub;
            },0);
          };
          const _inMitte=_calcInc(14),_inEnde=_calcInc(_lastDayS);
          const _outMitte=_calcOut(14),_outEnde=_calcOut(_lastDayS);
          const prevY=month===0?year-1:year,prevM=month===0?11:month-1;
          const base=getProgEndeAccGlobal(prevY,prevM,"acc-giro"); // nur für Legacy-Drilldown noch nötig
          // NEU: prognoseMitte/Ende kommen IMMER aus saldoAt — Single Source of Truth.
          // saldoAt liefert konto-spezifisch (selAcc) oder Gesamt (selAcc=null).
          const prognoseMitte = saldoAt(year, month, 14, selAcc, _saldoCtx);
          const prognoseEnde  = saldoAt(year, month, _lastDayS, selAcc, _saldoCtx);
          const _isCurH=year===_todayY&&month===_todayM,_isFutH=year>_todayY||(year===_todayY&&month>_todayM);
          const detailMitte = monatDetailMitte;
          const detailEnde  = monatDetailEnde;
          // Für ALLE Monate Saldo-Werte setzen (auch Vergangenheit).
          // Bei Gesamt-Sicht (selAcc=null): null, damit Drill drill.saldo nutzt.
          const saldoMitte = selAcc ? prognoseMitte : null;
          const saldoEnde  = selAcc ? prognoseEnde  : null;
          const _realIn =allMTxs.filter(t=>!t.pending&&txType(t)==="income");
          const _realOut=allMTxs.filter(t=>!t.pending&&txType(t)==="expense");
          const _uIn =allMTxs.filter(t=>txType(t)==="income" &&((t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId)));
          const _uOut=allMTxs.filter(t=>txType(t)==="expense"&&((t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId)));
          const _sum=arr=>arr.reduce((s,t)=>s+Math.abs(t.totalAmount||0),0);
          const _realInM =_realIn.filter(_h2),_realOutM=_realOut.filter(_h2);
          // Exakt wie Dashboard: pTxs aus txs (ohne _budgetSubId-Filter), pendOpenAmt = totalAmount
          const _pTxs    = txs.filter(t=>{ const d=new Date(t.date); return d.getFullYear()===year&&d.getMonth()===month&&t.pending; });
          const pTxsOut2 = _pTxs.filter(t=>txType(t)==="expense"||(t._csvType==="expense"&&!txType(t)==="income"));
          const pTxsIn2  = _pTxs.filter(t=>txType(t)==="income"||(t._csvType==="income"));
          const _pTxsInM =_mitteAbg?[]:pTxsIn2.filter(t=>_h2(t)&&(!t._budgetSubId||t._budgetSubId.endsWith("_mitte"))),_pTxsOutM=_mitteAbg?[]:pTxsOut2.filter(t=>_h2(t)&&(!t._budgetSubId||t._budgetSubId.endsWith("_mitte")));
          const _uInM2=_mitteAbg?[]:_uIn.filter(_h2),_uOutM2=_mitteAbg?[]:_uOut.filter(_h2);
          const pendingIn2 = pTxsIn2.reduce((s,t)=>s+t.totalAmount, 0);
          const pendingOut2= pTxsOut2.reduce((s,t)=>s+t.totalAmount, 0);
          return (
            <SaldoHero2 year={year} month={month}
              buchInM={_sum(_realInM)}  buchOutM={_sum(_realOutM)}
              buchInE={_sum(_realIn)}   buchOutE={_sum(_realOut)}
              pendInM={_sum(_pTxsInM)}  pendOutM={_sum(_pTxsOutM)}
              pendInE={pendingIn2}       pendOutE={pendingOut2}
              uInM={_sum(_uInM2)}        uOutM={_sum(_uOutM2)}
              uInE={_sum(_uIn)}          uOutE={_sum(_uOut)}
              prognoseMitte={prognoseMitte} prognoseEnde={prognoseEnde}
              detailMitte={detailMitte} detailEnde={detailEnde}
              saldoMitte={saldoMitte}   saldoEnde={saldoEnde}
              onDrillBuchIn ={(isMitte)=>setFilt(isMitte?"income":"income")}
              onDrillBuchOut={(isMitte)=>setFilt(isMitte?"expense":"expense")}
              onDrillPendIn ={(isMitte)=>setFilt("pending")}
              onDrillPendOut={(isMitte)=>setFilt("pending")}
              onDrillUncatIn ={(isMitte)=>setFilt("uncat")}
              onDrillUncatOut={(isMitte)=>setFilt("uncat")}
            />
          );
        })()}
        {/* Kategorie-Balken — gleiche Hintergrundfarbe wie Hero */}
        {catSums.length>0&&!window.MBT_DEBUG?.disable_categorychart&&<CategoryChart catSums={catSums} maxSum={maxSum} budgets={budgets} getBudgetForMonth={getBudgetForMonth} year={year} month={month}/>}
        </div>

        {/* Budget-Schnellzugriff */}
        <div style={{margin:"0 10px 4px",display:"flex",flexWrap:"wrap",gap:4}}>
          {cats.filter(c=>c.type==="expense"||c.type==="income").flatMap(cat=>
            (cat.subs||[]).filter(sub=>getBudgetForMonth(sub.id,year,month)>0).map(sub=>({sub,cat}))
          ).map(({sub,cat})=>(
            <button key={sub.id} onClick={()=>openBudgetEdit({id:sub.id,name:sub.name,catId:cat.id,catColor:cat.color,accountId:(groups.find(g=>g.type===cat.type)?.accountId||cat.accountId||"acc-giro")})}
              style={{padding:"3px 8px",borderRadius:7,border:`1px solid ${T.gold}55`,
                background:"rgba(245,166,35,0.1)",color:T.gold,fontSize:10,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
              {Li("target",9,T.gold)} {sub.name}: {fmt(getBudgetForMonth(sub.id,year,month))}
            </button>
          ))}
          <button onClick={()=>setBudgetEditSub({pickMode:true})}
            style={{padding:"3px 8px",borderRadius:7,border:`1px solid ${T.bds}`,
              background:"transparent",color:T.txt2,fontSize:10,cursor:"pointer",
              fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            {Li("plus",9,T.txt2)} Budget
          </button>
        </div>

        {/* Budget-Picker wenn pickMode */}
        {budgetEditSub?.pickMode&&(
          <div onClick={()=>setBudgetEditSub(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",
              zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.surf2,borderRadius:20,
              padding:"16px",width:"100%",maxWidth:400,maxHeight:"80vh",overflowY:"auto",
              border:`1px solid ${T.gold}44`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{color:T.gold,fontSize:14,fontWeight:700}}>{Li("target",14,T.gold)} Budget wählen</span>
                <button onClick={()=>setBudgetEditSub(null)} style={{background:"none",border:"none",color:T.txt2,cursor:"pointer"}}>{Li("x",14)}</button>
              </div>
              {cats.filter(c=>c.type==="expense"||c.type==="income").map(cat=>(
                <div key={cat.id} style={{marginBottom:8}}>
                  <div style={{color:cat.color||T.blue,fontSize:10,fontWeight:700,padding:"2px 6px"}}>{cat.name}</div>
                  {(cat.subs||[]).map(sub=>(
                    <div key={sub.id} onClick={()=>openBudgetEdit({id:sub.id,name:sub.name,catId:cat.id,catColor:cat.color,accountId:(groups.find(g=>g.type===cat.type)?.accountId||cat.accountId||"acc-giro")})}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
                        marginBottom:3,borderRadius:9,cursor:"pointer",
                        background:"rgba(255,255,255,0.04)",border:`1px solid ${getBudgetForMonth(sub.id,year,month)>0?T.gold+"55":T.bd}`}}>
                      <span style={{flex:1,color:T.txt,fontSize:12}}>{sub.name}</span>
                      {getBudgetForMonth(sub.id,year,month)>0?(
                        <span style={{color:T.gold,fontSize:10,fontWeight:700}}>
                          {Li("target",9,T.gold)} {fmt(getBudgetForMonth(sub.id,year,month))}
                        </span>
                      ):<span style={{color:T.txt2,fontSize:10}}>{Li("plus",9,T.txt2)} setzen</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suche */}
        <div style={{padding:"6px 10px 4px",display:"flex",gap:6,alignItems:"center"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",background:"rgba(255,255,255,0.06)",
            border:`1px solid ${search?T.blue:T.bds}`,borderRadius:11,padding:"8px 10px",gap:6}}>
            {Li("search",14,T.txt2)}
            <input value={search} onChange={e=>{setSearch(e.target.value);setSelected(new Set());}}
              placeholder="suchen…"
              style={{flex:1,background:"transparent",border:"none",color:T.txt,fontSize:12,outline:"none"}}/>
            {search&&<button onClick={()=>{setSearch("");setSelected(new Set());}}
              style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:13}}>{Li("x",13)}</button>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{color:T.txt2,fontSize:11}}>Kategorien</span>
            <div onClick={()=>setShowAllCats(v=>!v)}
              style={{width:40,height:24,borderRadius:12,cursor:"pointer",
                background:showAllCats?T.blue:"rgba(255,255,255,0.12)",
                position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{position:"absolute",top:3,
                left:showAllCats?19:3,width:18,height:18,borderRadius:"50%",
                background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
            </div>
          </div>
        </div>

        {/* Filter-Tabs */}
        <div style={{display:"flex",gap:6,padding:"0 10px 6px"}}>
          {(()=>{
            const chips = [
              ["expense","Ausgaben",  T.neg,    T.tab_exp],
              ["income", "Einnahmen", T.pos,    T.tab_inc],
              ["pending","vorgemerkt",T.gold,   T.tab_pend],
              ["uncat",  "？",        T.txt2,   T.disabled],
              ["mismatch","⚠ Falsch", T.gold,   T.tab_pend],
            ];
            return chips.map(([v,lbl,col,bgActive])=>{
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
                    color: active ? "#fff" : T.txt2,
                    fontSize:12,
                    fontWeight:700,
                    letterSpacing:0.2,
                    transition:"all 0.15s",
                    outline: active ? `1.5px solid ${col}44` : "none",
                  }}>
                  {lbl}
                </button>
              );
            });
          })()}
        </div>

        {/* Mismatch-Autokorrektur-Banner */}
        {filt==="mismatch"&&mTxs.length>0&&(
          <div style={{margin:"0 10px 4px",padding:"8px 12px",borderRadius:10,
            background:"rgba(245,166,35,0.1)",border:`1px solid ${T.gold}44`,
            display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,color:T.gold,fontSize:11}}>
              {Li("alert-triangle",13,T.gold)} {mTxs.length} Buchung{mTxs.length!==1?"en":""} mit falschem Vorzeichen laut CSV — Kategorie{mTxs.length!==1?"n":""} entfernen und neu zuweisen?
            </div>
            <button onClick={()=>{
              setTxs(p=>p.map(t=>{
                const ct=t._csvType;
                if(!ct) return t;
                const tt=txType(t);
                if(!((ct==="expense"&&tt==="income")||(ct==="income"&&tt==="expense"))) return t;
                const d=new Date(t.date);
                if(d.getFullYear()!==year||d.getMonth()!==month) return t;
                return {...t, splits:[]};
              }));
              setFilt("uncat");
            }} style={{padding:"5px 10px",borderRadius:8,border:"none",
              background:T.gold,color:T.on_accent,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
              Alle korrigieren
            </button>
          </div>
        )}

        {/* Bulk-Aktionsleiste */}
        {(inSearchMode||selected.size>0)&&mTxs.length>0&&(
          <div style={{padding:"6px 8px",background:"rgba(74,159,212,0.08)",
            borderTop:`1px solid ${T.bd}`,borderBottom:`1px solid ${T.bd}`,
            display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={toggleAll}
              style={{background:allSel?"rgba(74,159,212,0.3)":"rgba(255,255,255,0.08)",
                border:`1px solid ${T.blue}`,borderRadius:8,padding:"4px 8px",
                color:T.blue,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
              {Li(allSel?"check-square":"square",12,T.blue)} Alle ({mTxs.length})
            </button>
            {selected.size>0&&<>
              <span style={{color:T.txt2,fontSize:11,flexShrink:0}}>{selCount} ausgewählt</span>
              <div style={{flex:1,minWidth:100}}>
                {(()=>{
                  const selTxs=[...selected].map(id=>txs.find(t=>t.id===id)).filter(Boolean);
                  const hasNeg=selTxs.some(t=>t.totalAmount<0||t._csvType==="expense");
                  const hasPos=selTxs.some(t=>t.totalAmount>0&&t._csvType!=="expense");
                  const fType=selTxs.length===0?null:(hasNeg&&!hasPos?"expense":(!hasNeg&&hasPos?"income":null));
                  return <CatPicker value={bulkCat.catId+"|"+bulkCat.subId}
                    onChange={(c,s)=>setBulkCat({catId:c,subId:s})}
                    filterType={fType}
                    placeholder={fType==="expense"?"— Ausgaben-Kategorie —":fType==="income"?"— Einnahmen-Kategorie —":"— Kategorie —"}/>;
                })()}
              </div>
              <button onClick={applyBulk} disabled={!bulkCat.catId}
                style={{background:bulkCat.catId?T.blue:T.disabled,
                  border:"none",borderRadius:8,padding:"5px 10px",color:"#fff",
                  fontSize:11,fontWeight:700,cursor:bulkCat.catId?"pointer":"default",
                  opacity:bulkCat.catId?1:0.4,flexShrink:0}}>✓</button>
              <button onClick={()=>setSelected(new Set())}
                style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:11}}>{Li("x",13)}</button>
            </>}
          </div>
        )}



        {/* Transaction cards */}
        {mTxs.length===0
          ? <div style={{color:T.txt2,textAlign:"center",padding:"40px 20px"}}>
              <div style={{marginBottom:10,opacity:0.4}}>{Li("inbox",36,T.txt2,1)}</div>
              <div style={{fontSize:13}}>Keine Buchungen im {MONTHS_F[month]}</div>
            </div>
          : dates.map(date=>{
            const dayTxs = [...byDate[date]].sort((a,b)=>{
              const aInc = txType(a)==="income" ? 0 : 1;
              const bInc = txType(b)==="income" ? 0 : 1;
              return aInc - bInc;
            });
            const dayNet = dayTxs.reduce((s,t)=>t.pending?s:txType(t)==="expense"?s-t.totalAmount:s+t.totalAmount,0);
            const daySaldo = getDaySaldo(date);
            // Hat dieser Tag Vormerkungen?
            const hasDayPend = dayTxs.some(t=>t.pending);
            return (
              <div key={date} style={{margin:"14px 8px 0",border:`1px solid ${T.bd}`,borderRadius:12,overflow:"hidden",background:T.surf||"rgba(255,255,255,0.03)"}}>
                <div style={{display:"flex",alignItems:"center",
                  padding:"7px 10px 6px",gap:8,background:"rgba(255,255,255,0.04)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                    <span style={{color:T.txt,fontSize:12,fontWeight:700}}>{fmtD(date)}</span>
                    <span style={{color:T.txt2,fontSize:10}}>{dayName(date)}</span>
                    {dayOf(date)<=14&&<span style={{color:T.mid,fontSize:9,fontWeight:700,
                      background:"rgba(103,232,249,0.1)",borderRadius:5,padding:"1px 5px"}}>Mitte</span>}
                  </div>
                  {/* Verbindungs-Linie in grün (positiver) / rot (negativer Tagessaldo) */}
                  <div style={{flex:1,height:2,
                    background:(daySaldo!==null?daySaldo:dayNet)>=0?T.pos:T.neg,
                    opacity:0.85,borderRadius:1,minWidth:10}}/>
                  {daySaldo!==null ? (
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <span style={{
                        color:daySaldo>=0?T.pos:T.neg,
                        fontSize:14,fontWeight:800,fontFamily:"monospace"}}>
                        {daySaldo>=0?"+":"−"}{fmt(Math.abs(daySaldo))}
                      </span>
                      {hasDayPend&&(()=>{
                        const pendUpToDay = txs.filter(t=>{
                          if(!t.pending||t._linkedTo||t._budgetSubId) return false;
                          const d=new Date(t.date);
                          return d.getFullYear()===year&&d.getMonth()===month&&t.date<=date&&_isSelAcc(t);
                        });
                        const n = pendUpToDay.length;
                        const todayPend = dayTxs.filter(t=>t.pending&&!t._budgetSubId);
                        return <div style={{color:T.gold,fontSize:8,lineHeight:1.3,textAlign:"right"}}>
                          inkl. {n} Vorm. ({todayPend.length} heute)
                        </div>;
                      })()}
                    </div>
                  ) : (
                    <span style={{color:dayNet>=0?T.pos:T.neg,fontSize:14,fontWeight:800,
                      fontFamily:"monospace",flexShrink:0}}>
                      {dayNet>=0?"+":"−"}{fmt(Math.abs(dayNet))}
                    </span>
                  )}
                </div>
                {/* ── Minus-Warnung ── */}
                {(()=>{
                  const w = warningDates.get(date);
                  if(!w) return null;
                  const [,wm,wd] = (w.nextPos?.date||"").split("-");
                  const nextLabel = w.nextPos
                    ? `${parseInt(wd)}.${parseInt(wm)}.`
                    : null;
                  return (
                    <div style={{
                      margin:"2px 0 3px",
                      background:`${T.neg}18`,
                      border:`1px solid ${T.neg}44`,
                      borderRadius:8,
                      padding:"7px 10px",
                      display:"flex",alignItems:"center",gap:10,
                    }}>
                      <div style={{flexShrink:0,width:28,height:28,borderRadius:8,
                        background:`${T.neg}22`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {Li("alert-triangle",14,T.neg)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:T.neg,fontSize:12,fontWeight:700,lineHeight:1.3}}>
                          Kontostand im Minus: −{fmt(w.deficit)} €
                        </div>
                        <div style={{color:T.txt2,fontSize:10,marginTop:2,lineHeight:1.4}}>
                          {w.nextPos
                            ? <>Fehlbetrag ausgleichen bis <span style={{color:T.gold,fontWeight:700}}>{nextLabel}</span>
                              {w.nextPos.name&&<span> ({w.nextPos.name})</span>}
                              {" — mindestens "}<span style={{color:T.neg,fontWeight:700,fontFamily:"monospace"}}>
                                {fmt(w.deficit)} €
                              </span>{" einplanen"}</>
                            : <>Kein positiver Saldo-Tag im Monat gefunden — mindestens{" "}
                              <span style={{color:T.neg,fontWeight:700,fontFamily:"monospace"}}>
                                {fmt(w.deficit)} €
                              </span>{" fehlen"}</>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Einnahmen zuerst — vor den Restbudgets */}
                {dayTxs.filter(tx=>txType(tx)==="income").map(tx=>{
                  const cat   = getCat((tx.splits||[])[0]?.catId);
                  const sub0  = getSub((tx.splits||[])[0]?.catId, (tx.splits||[])[0]?.subId);
                  const type  = txType(tx);
                  const pal   = tx.pending
                    ? {bg:T.cell_inc_bg,bd:T.cell_inc_bd,hdr:T.cell_inc,val:T.cell_inc}
                    : PAL[type]||PAL.expense;
                  const isS   = (tx.splits||[]).length>1;
                  const involvedCats = isS
                    ? [...new Map((tx.splits||[]).map(sp=>[sp.catId,getCat(sp.catId)])).values()].filter(Boolean)
                    : [cat].filter(Boolean);
                  const displayIcon  = (!isS&&sub0?.icon) ? sub0.icon  : (involvedCats[0]?.icon||"help-circle");
                  const displayColor = involvedCats[0]?.color||T.blue;
                  const vE = getMV(year,month,tx.id,"E");
                  const vD = getMV(year,month,tx.id,"D");
                  const eItems = (tx.splits||[]).flatMap(sp => pendingItemsFor(year,month,sp.subId,"E"));
                  const eSum   = eItems.reduce((s,i)=>s+pn(i.amount),0);
                  const effE   = eSum>0 ? String(eSum) : vE;
                  const normE  = fmt(pn(effE)), normD = fmt(pn(vD));
                  const needsHatch = effE!==""&&vD!==""&&normE!==normD;
                  const fulfilled  = effE!==""&&vD!==""&&normE===normD;
                  return (
                    <div key={tx.id} style={{borderRadius:0,marginBottom:0,overflow:"hidden",background:fulfilled?T.pos+"11":"transparent",borderTop:`1px solid ${T.bd}`,position:"relative"}}>
                      <div style={{position:"relative",zIndex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:0,padding:"3px 8px"}}>
                          <div style={{position:"relative",width:32,height:32,flexShrink:0,marginRight:8}}>
                            <div onClick={e=>{e.stopPropagation();setTxIconPickM(txIconPickM===tx.id?null:tx.id);}}
                              style={{width:32,height:32,borderRadius:9,cursor:"pointer",background:displayColor+"22",border:`1px solid ${txIconPickM===tx.id?displayColor+"66":T.bd}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {involvedCats.length>0?Li(displayIcon,16,displayColor):Li("help-circle",16,T.txt2)}
                            </div>
                          </div>
                          {txIconPickM===tx.id&&(<IconPickerDialog selectedIcon={involvedCats[0]?.icon||"help-circle"} selectedColor={involvedCats[0]?.color||T.txt2} onSelect={ic=>{if(involvedCats[0])setCats(p=>p.map(c=>c.id===involvedCats[0].id?{...c,icon:ic}:c));setTxIconPickM(null);}} onClose={()=>setTxIconPickM(null)}/>)}
                          <div onClick={()=>openEdit(tx)} style={{flex:1,minWidth:0,marginRight:6,cursor:"pointer"}}>
                            <div style={{color:T.txt,fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {tx.desc||cat?.name||"Buchung"}{tx.note&&<span title={tx.note} style={{marginLeft:3,display:"inline-flex"}}>{Li("sticky-note",9,T.gold)}</span>}
                            </div>
                            <div style={{color:cat?.color||T.txt2,fontSize:10,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                              {tx.pending?"Vorgemerkt · ":""}{isS?involvedCats.map(c=>c.name).join(" · "):(()=>{const ss=getSub((tx.splits||[])[0]?.catId,(tx.splits||[])[0]?.subId);return ss?.name||cat?.name||"";})()}
                              {tx.accountId&&tx.accountId!=="acc-giro"&&(()=>{const a=getAcc(tx.accountId);return(<span style={{background:a.color+"22",color:a.color,borderRadius:5,padding:"1px 5px",fontSize:9,fontWeight:700,flexShrink:0}}>{Li(a.icon,9,a.color)} {a.name}</span>)})()}
                            </div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0,marginRight:8}}>
                            <div style={{color:pal.val,fontSize:14,fontWeight:800,fontFamily:"monospace"}}>+{fmt(tx.totalAmount)}</div>
                            {fulfilled&&<div style={{color:T.pos,fontSize:9}}>{Li("check",9,T.pos)} erfüllt</div>}
                            {needsHatch&&<div style={{color:pal.hdr,fontSize:9}}>{Li("alert-circle",9,T.gold)} offen</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Budget-Restanzeige am 14. und Monatsletzten — als einzelne Buchungszeilen */}
                {(()=>{
                  const [,, dd] = date.split("-");
                  const dayNum = parseInt(dd);
                  const isMitteDay = dayNum===14;
                  const isEndeDay  = dayNum===lastDayOfMonth;
                  if(!isMitteDay&&!isEndeDay) return null;
                  if(filt==="mismatch") return null;
                  const details = isMitteDay ? budgetDetailsMitte : budgetDetailsEnde;
                  if(!details.items.length) return null;
                  return details.items.map(({name,spent,budget,open,type})=>{
                    const isIncome = type==="income";
                    const isOverspent = !isIncome && open < 0;
                    const accentCol = isIncome ? T.cell_inc : (isOverspent ? T.neg : T.gold);
                    const pct = budget > 0 ? Math.min(150, spent/budget*100) : 100;
                    const barCol = isIncome ? T.cell_inc : (pct>=100?T.neg:pct>=75?T.gold:T.pos);
                    const subName = name.split(" / ")[1]||name;
                    const barW = Math.min(100, pct);
                    const signedOpen   = isIncome ?  open :  -open;
                    const signedBudget = isIncome ? budget : -budget;
                    const fmtSigned = v => (v<0?"-":"+") + fmt(Math.abs(v));
                    return (
                      <div key={"rb-"+name} style={{borderRadius:0,marginBottom:0,overflow:"hidden",background:"transparent",borderTop:`1px solid ${T.bd}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:0,padding:"3px 8px"}}>
                          <div style={{width:32,height:32,borderRadius:9,flexShrink:0,marginRight:8,background:accentCol+"22",border:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {Li(isOverspent?"alert-triangle":"target",16,accentCol)}
                          </div>
                          <div style={{flex:1,minWidth:0,marginRight:6}}>
                            <div style={{color:isOverspent?T.neg:T.txt,fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isOverspent?"Überzogen: ":"Restbudget: "}{subName}</div>
                            <div style={{marginTop:3,display:"flex",alignItems:"center",gap:6}}>
                              <div style={{flex:1,maxWidth:120,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
                                <div style={{height:"100%",borderRadius:2,background:barCol,width:`${barW}%`}}/>
                              </div>
                              <span style={{color:isOverspent?T.neg:T.txt2,fontSize:10}}>{Math.round(pct)}% verbraucht</span>
                            </div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0,marginRight:8}}>
                            {isOverspent ? (<>
                              <div style={{color:T.neg,fontSize:10,fontWeight:700}}>{fmtSigned(signedBudget)} um {fmt(Math.abs(open))} überschritten</div>
                              <div style={{borderTop:`1px solid ${T.neg}44`,margin:"3px 0"}}/>
                              <div style={{color:T.neg,fontSize:13,fontWeight:800,fontFamily:"monospace"}}>{fmtSigned(-spent)}</div>
                            </>) : (<>
                              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline"}}>
                                <span style={{color:T.txt2,fontSize:10}}>offenes Budget:</span>
                                <span style={{color:open>0?T.gold:T.txt2,fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{fmtSigned(signedOpen)}</span>
                              </div>
                              <div style={{borderTop:`1px solid ${T.bd}`,margin:"3px 0"}}/>
                              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline"}}>
                                <span style={{color:T.txt2,fontSize:10}}>genutzt:</span>
                                <span style={{color:spent===0?T.txt2:accentCol,fontSize:13,fontWeight:800,fontFamily:"monospace"}}>{spent===0?"—":fmtSigned(-spent)}</span>
                              </div>
                            </>)}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Ausgaben & Vormerkungen */}
                {dayTxs.filter(tx=>txType(tx)!=="income").map(tx=>{
                  const cat   = getCat((tx.splits||[])[0]?.catId);
                  const sub0  = getSub((tx.splits||[])[0]?.catId, (tx.splits||[])[0]?.subId);
                  const type  = txType(tx);
                  const pal   = tx.pending
                    ? (type==="income"
                        ? {bg:T.cell_inc_bg,bd:T.cell_inc_bd,hdr:T.cell_inc,val:T.cell_inc}
                        : {bg:T.on_accent,bd:"#7A5200",hdr:T.gold,val:T.gold})
                    : PAL[type]||PAL.expense;
                  const isS   = (tx.splits||[]).length>1;
                  const involvedCats = isS
                    ? [...new Map((tx.splits||[]).map(sp=>[sp.catId,getCat(sp.catId)])).values()].filter(Boolean)
                    : [cat].filter(Boolean);
                  // Unterkategorie-Icon hat Vorrang wenn vorhanden
                  const displayIcon  = (!isS&&sub0?.icon) ? sub0.icon  : (involvedCats[0]?.icon||"help-circle");
                  const displayColor = involvedCats[0]?.color||T.blue;

                  const vE = getMV(year,month,tx.id,"E");
                  const vD = getMV(year,month,tx.id,"D");
                  const eItems = (tx.splits||[]).flatMap(sp => pendingItemsFor(year,month,sp.subId,"E"));
                  const eSum   = eItems.reduce((s,i)=>s+pn(i.amount),0);
                  const effE   = eSum>0 ? String(eSum) : vE;
                  const normE  = fmt(pn(effE)), normD = fmt(pn(vD));
                  const needsHatch = effE!==""&&vD!==""&&normE!==normD;
                  const fulfilled  = effE!==""&&vD!==""&&normE===normD;

                  return (
                    <div key={tx.id} style={{
                      borderRadius:0, marginBottom:0, overflow:"hidden",
                      background: fulfilled ? T.pos+"11" : "transparent",
                      borderTop:`1px solid ${T.bd}`,
                      position:"relative",
                    }}>
                      

                      <div style={{position:"relative",zIndex:1}}>
                        {/* Main row */}
                        <div style={{display:"flex",alignItems:"center",gap:0,padding:"3px 8px"}}>
                          {/* Icon — immer Icon-Picker */}
                          <div style={{position:"relative",width:32,height:32,flexShrink:0,marginRight:8}}>
                            <div onClick={e=>{e.stopPropagation();setTxIconPickM(txIconPickM===tx.id?null:tx.id);}}
                              style={{width:32,height:32,borderRadius:9,cursor:"pointer",
                                background:displayColor+"22",
                                border:`1px solid ${txIconPickM===tx.id?displayColor+"66":T.bd}`,
                                display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {involvedCats.length>0
                                ? Li(displayIcon,16,displayColor)
                                : tx.pending ? (tx._seriesTyp==="finanzierung"?Li("credit-card",16,T.gold):tx._seriesId?Li("repeat",16,T.pos):Li("calendar",16,T.gold)) : Li("help-circle",16,T.txt2)}
                            </div>
                          </div>
                          {txIconPickM===tx.id&&(
                            <IconPickerDialog
                              selectedIcon={involvedCats[0]?.icon||"help-circle"}
                              selectedColor={involvedCats[0]?.color||T.txt2}
                              onSelect={ic=>{
                                if(involvedCats[0]) setCats(p=>p.map(c=>c.id===involvedCats[0].id?{...c,icon:ic}:c));
                                setTxIconPickM(null);
                              }}
                              onClose={()=>setTxIconPickM(null)}/>
                          )}
                          {/* Text — Klick öffnet Edit */}
                          <div onClick={()=>openEdit(tx)} style={{flex:1,minWidth:0,marginRight:6,cursor:"pointer"}}>
                            <div style={{color:T.txt,fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {tx.desc||cat?.name||"Buchung"}{tx.note&&<span title={tx.note} style={{marginLeft:3,display:"inline-flex"}}>{Li("sticky-note",9,T.gold)}</span>}
                            </div>
                            <div style={{color:cat?.color||T.txt2,fontSize:10,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                              {tx.pending?"Vorgemerkt · ":""}{isS?involvedCats.map(c=>c.name).join(" · "):(()=>{const ss=getSub((tx.splits||[])[0]?.catId,(tx.splits||[])[0]?.subId);return ss?.name || cat?.name || "";})()}
                              {tx.valueDate&&(
                              <span style={{background:"rgba(200,210,220,0.1)",color:T.txt2,
                                borderRadius:5,padding:"1px 5px",fontSize:9,flexShrink:0}}>
                                {Li("calendar",8,T.txt2)} {(()=>{const[,m,d]=tx.valueDate.split("-");return `${d}.${m}.`;})()}
                              </span>
                            )}
                            {tx.accountId&&tx.accountId!=="acc-giro"&&(()=>{const a=getAcc(tx.accountId);return(
                                <span style={{background:a.color+"22",color:a.color,borderRadius:5,padding:"1px 5px",fontSize:9,fontWeight:700,flexShrink:0}}>{Li(a.icon,9,a.color)} {a.name}</span>
                              )})()}
                            </div>
                          </div>
                          {/* Amount */}
                          <div style={{textAlign:"right",flexShrink:0,marginRight:8}}>
                            <div style={{color:pal.val,fontSize:14,fontWeight:800,fontFamily:"monospace"}}>
                              {type==="income"?"+":"−"}{fmt(tx.totalAmount)}
                            </div>
                            {isS&&(
                              <div style={{marginTop:2}}>
                                {(tx.splits||[]).filter(sp=>sp.catId).map((sp,si)=>{
                                  const spCat=getCat(sp.catId);
                                  return (
                                    <div key={sp.id} style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end",marginBottom:1}}>
                                      <span style={{width:6,height:6,borderRadius:"50%",background:spCat?.color||T.txt2,flexShrink:0,display:"inline-block"}}/>
                                      <span style={{color:spCat?.color||T.txt2,fontSize:9,fontFamily:"monospace",fontWeight:700}}>{fmt(pn(sp.amount))}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {fulfilled&&<div style={{color:T.pos,fontSize:9}}>{Li("check",9,T.pos)} erfüllt</div>}
                            {needsHatch&&<div style={{color:pal.hdr,fontSize:9}}>{Li("alert-circle",9,T.gold)} offen</div>}
                          </div>
                        </div>

                        {/* Mitte / Ende / aktuell */}
                        {/* MitteEndeFields ausgeblendet — nur in Jahresansicht */}
                        {/* Kategorie-Picker — erscheint wenn globaler Toggle an */}
                        {showAllCats&&(
                          <div onClick={e=>e.stopPropagation()}
                            style={{marginLeft:40,marginBottom:4,marginRight:28}}>
                            <CatPicker
                              value={(tx.splits||[])[0]?.catId+"|"+((tx.splits||[])[0]?.subId||"")}
                              filterType={txType(tx)==="income"?"income":"expense"}
                              openUp={true}
                              onChange={(catId,subId)=>{
                                setTxs(p=>p.map(t=>t.id===tx.id?{...t,
                                  splits:[{id:(t.splits||[])[0]?.id||uid(),catId,subId,amount:t.totalAmount}]
                                }:t));
                              }}
                              placeholder="— Kategorie wählen —"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        }
        <div style={{height:8}}/>
        {/* ── Ankerpunkt-Info ── */}
        {(()=>{
          const prevY3 = month===0?year-1:year, prevM3 = month===0?11:month-1;
          const progVal = selAcc
            ? (getProgEndeAccGlobal(prevY3, prevM3, selAcc) ?? getKumulierterSaldo(prevY3, prevM3, selAcc))
            : _getProgEndeM(prevY3, prevM3);
          const MONTHS_S2=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
          const label = `${MONTHS_S2[prevM3]} ${prevY3}`;
          const accName = selAcc ? accounts.find(a=>a.id===selAcc)?.name : null;
          const tb2 = new Date();
          const isFut = year>tb2.getFullYear()||(year===tb2.getFullYear()&&month>tb2.getMonth());
          const ankLabel = selAcc ? (isFut?"PrognoseE Vormonat":"Kontostand Vormonat") : "PrognoseE Vormonat";
          return (
            <div style={{margin:"4px 10px 8px",padding:"8px 12px",
              background:"rgba(255,255,255,0.04)",borderRadius:8,
              border:`1px solid ${T.bd}44`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{color:T.txt2,fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>
                  Ankerpunkt ({label}){accName?` · ${accName}`:""}
                </span>
                <span style={{color:T.txt,fontSize:13,fontWeight:700,fontFamily:"monospace"}}>
                  {progVal!==null?(progVal>=0?"+":"")+fmt(progVal)+" €":"—"}
                </span>
                <span style={{color:T.txt2,fontSize:9}}>{ankLabel}</span>
              </div>
            </div>
          );
        })()}
        <div style={{height:16}}/>
      </div>
      {budgetEditSub&&budgetEditSub.id&&<BudgetEditorModal
        key={`${budgetEditKey}-${year}-${month}`}
        sub={{id:budgetEditSub.id,name:budgetEditSub.name}}
        cat={{id:budgetEditSub.catId,color:budgetEditSub.catColor}}
        accountId={budgetEditSub.accountId||"acc-giro"}
        onClose={()=>setBudgetEditSub(null)}/>
      }

      {/* Kategorie-Zuweisung Modal */}
      {activeCatTxId&&(()=>{
        const tx = txs.find(t=>t.id===activeCatTxId);
        if(!tx) return null;
        const type = txType(tx);
        return (
          <div onClick={()=>setActiveCatTxId(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
              backdropFilter:"blur(8px)",zIndex:200,
              display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:60}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:T.surf2,borderRadius:"0 0 20px 20px",width:"100%",
                maxWidth:480,padding:"16px",maxHeight:"70vh",overflowY:"auto",
                border:`1px solid ${T.bd}`}}>
              <div style={{color:T.txt,fontSize:13,fontWeight:700,marginBottom:4}}>{tx.desc}</div>
              <div style={{color:T.txt2,fontSize:11,marginBottom:12}}>Kategorie zuweisen</div>
              <CatPicker
                value={(()=>{
                  const pc = pendingCatsRef.current[activeCatTxId];
                  const catId = pc?.catId||(tx.splits||[])[0]?.catId||"";
                  const subId = pc?.subId||(tx.splits||[])[0]?.subId||"";
                  return catId+"|"+subId;
                })()}
                filterType={type==="income"?"income":"expense"}
                onChange={(catId,subId)=>{
                  setTxs(p=>p.map(t=>t.id===activeCatTxId?{...t,
                    splits:[{id:(t.splits||[])[0]?.id||uid(),catId,subId,amount:t.totalAmount}]
                  }:t));
                  setActiveCatTxId(null);
                }}
                placeholder="— Kategorie wählen —"
              />
            </div>
          </div>
        );
      })()}
    </>);

}

// ══════════════════════════════════════════════════════════════════════

export { MonatScreen };
