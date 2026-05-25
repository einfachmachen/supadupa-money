// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useState } from "react";
import { VormHubSecToggle } from "../molecules/VormHubSecToggle.jsx";
import { VormHubSegBtn } from "../molecules/VormHubSegBtn.jsx";
import { VormVerknuepfenPanel } from "../organisms/VormVerknuepfenPanel.jsx";
import { RecurringDetectionScreen } from "./RecurringDetectionScreen.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { MONTHS_F } from "../../utils/constants.js";
import { isoAddMonths } from "../../utils/date.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function VormerkungHub({onClose, editVorm: _editVormProp=null, mobileMode=false}) {
  const { cats, groups, txs, setTxs, accounts, year, month, getCat, getSub } = useContext(AppCtx);
  const today = new Date().toISOString().slice(0,10);
  const pad = n => String(n).padStart(2,"0");
  const MONTHS_G = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  // Wenn eine Einnahme-Buchung mit _linkedTo geöffnet wird (= Counterpart einer Umbuchung),
  // stattdessen die zugehörige Ausgabe-Parent als editVorm verwenden. So wirkt jede Änderung
  // auf BEIDE Seiten der Umbuchung — Range-/From-Edits werden automatisch synchronisiert.
  const editVorm = React.useMemo(() => {
    if(!_editVormProp || _editVormProp._prefill) return _editVormProp;
    if(_editVormProp._linkedTo) {
      const parent = txs.find(t => t.id === _editVormProp._linkedTo && t.pending);
      if(parent) return parent;
    }
    return _editVormProp;
  }, [_editVormProp, txs]);

  // Bearbeiten-Modus: Typ aus editVorm erkennen
  const isEdit = !!editVorm && !editVorm._prefill;
  const initTyp = editVorm
    ? (editVorm._seriesTyp==="finanzierung" ? "finanzierung"
       : editVorm._seriesId ? "wiederkehrend" : "einmalig")
    : "einmalig";

  // Sektionen — im Edit-Modus direkt Neu-Erstellen aufklappen
  const [secNeu,        setSecNeu]        = useState(true);
  const [secErkennen,   setSecErkennen]   = useState(false);
  const [secKategorien, setSecKategorien] = useState(false);

  // Typ
  const [typ, setTyp] = useState(initTyp);

  // Scope für Bearbeiten: single | range | from | all
  const [editScope, setEditScope] = useState("single");
  // Hilfsfunktion: Datum der Buchung im Monat y/m dieser Serie
  const _txDateForMonth = (y, m) => {
    const pad2 = n=>String(n).padStart(2,"0");
    const ms = `${y}-${pad2(m+1)}`;
    const found = txs.find(t=>t._seriesId===editVorm?._seriesId && !t._exSeriesId && t.date.startsWith(ms));
    if(found) return found.date;
    // Fallback: Tag aus editVorm, im Monat y/m
    const origDay = editVorm?.date ? parseInt(editVorm.date.split("-")[2]) : 1;
    const maxD = new Date(y, m+1, 0).getDate();
    return `${y}-${pad2(m+1)}-${pad2(Math.min(origDay,maxD))}`;
  };
  const [scopeFrom, setScopeFrom] = useState(()=>_txDateForMonth(year, month));
  const [scopeTo,   setScopeTo]   = useState(()=>_txDateForMonth(year, month));
  const [fromDateManual, setFromDateManual] = useState(false);
  const [lastOfMonth, setLastOfMonth] = useState(editVorm?._lastOfMonth||false);

  // Monat/Jahr wechselt → scopeFrom/scopeTo nachziehen (nur wenn nicht manuell)
  React.useEffect(()=>{
    if(fromDateManual) return;
    const d = _txDateForMonth(year, month);
    setScopeFrom(d);
    if(editScope==="single") setScopeTo(d);
    // Im Bearbeiten-Modus: Startdatum auf die Buchung im gewählten Monat setzen
    if(isEdit && editVorm?._seriesId) setStartDate(d);
  }, [month, year]);

  // Formular — mit Vorbelegung aus editVorm
  const initSplit = editVorm ? (editVorm.splits||[])[0] : null;
  const [desc,      setDesc]      = useState(editVorm?.desc||"");
  const [amount,    setAmount]    = useState(editVorm ? String(editVorm.totalAmount).replace(".",",") : "");
  const [csvType,   setCsvType]   = useState(editVorm?._csvType||"expense");
  const [catId,     setCatId]     = useState(initSplit?.catId||"");
  const [subId,     setSubId]     = useState(initSplit?.subId||"");
  const [accountId, setAccountId] = useState(editVorm?.accountId||accounts[0]?.id||"");
  // Umbuchung: Zielkonto + Zielkategorie (für Transfer auf eigenes Konto)
  // Bei Edit: aus existierendem verknüpften Zugang laden — auch innerhalb der Serie suchen
  const _existingLinkInit = (() => {
    if(!editVorm?.id) return null;
    // 1. Direkter Link auf diese Buchung?
    let linked = txs.find(t => t._linkedTo === editVorm.id && t.pending);
    if(linked) return linked;
    // 2. Sonst: Wenn Serie, suchen ob irgendeine Rate ein Linked hat → Serien-Eintrag
    if(editVorm._seriesId) {
      const seriesIds = new Set(txs.filter(t=>t._seriesId===editVorm._seriesId).map(t=>t.id));
      linked = txs.find(t => t.pending && t._linkedTo && seriesIds.has(t._linkedTo));
    }
    return linked || null;
  })();
  const _existingLinkSplit = (_existingLinkInit?.splits||[])[0];
  const [transferToAcc, setTransferToAcc] = useState(_existingLinkInit?.accountId || "");
  const [transferToCat, setTransferToCat] = useState(_existingLinkSplit?.catId || "");
  const [transferToSub, setTransferToSub] = useState(_existingLinkSplit?.subId || "");
  const [note,      setNote]      = useState(editVorm?.note||"");
  const [startDate, setStartDate] = useState(()=>{
    if(editVorm?._seriesId) {
      // Für Serien: erste Buchung der Serie als Startdatum
      const firstTx = txs.filter(t=>t._seriesId===editVorm._seriesId&&!t._exSeriesId)
        .sort((a,b)=>a.date.localeCompare(b.date))[0];
      if(firstTx) return firstTx.date;
    }
    if(editVorm?.date) return editVorm.date;
    // Neu-Anlegen: heute als Default (nicht der angezeigte Monat!)
    const now = new Date();
    const pad2 = n=>String(n).padStart(2,"0");
    return `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;
  });
  const [endDate,   setEndDate]   = useState("");
  const [valueDate, setValueDate] = useState(editVorm?.valueDate||"");
  const [interval,  setInterval_] = useState(()=>{
    if(!editVorm) return 1;
    // Aus repeatMonths wenn gesetzt
    if(editVorm.repeatMonths && editVorm.repeatMonths > 1) return editVorm.repeatMonths;
    // Sonst aus den tatsächlichen Abständen der Serie berechnen
    // (wird unten via seriesInterval überschrieben sobald txs verfügbar)
    return editVorm.repeatMonths||1;
  });
  const [count, setCount] = useState(()=>{
    if(!editVorm?._seriesId) return "";
    // Finanzierung: Ratenanzahl vorausfüllen
    if(editVorm._seriesTyp==="finanzierung") {
      const n = txs.filter(t=>t._seriesId===editVorm._seriesId&&!t._isException).length;
      return n>0 ? String(n) : "";
    }
    return "";
  });
  const [customFirstLast, setCustomFirstLast] = useState(()=>{
    // Auto-aktivieren wenn erste/letzte Buchung abweicht — wird nach mount per Effect gesetzt
    return false;
  });
  const [firstAmount, setFirstAmount] = useState("");
  const [lastAmount,  setLastAmount]  = useState("");
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  // ── Eingebettete Ausnahme-Serie ───────────────────────────────────────
  const [showExForm,    setShowExForm]    = useState(false);
  const [exAmount,      setExAmount]      = useState("");
  const [exInterval,    setExInterval]    = useState(12); // jährlich
  const [exStartDate,   setExStartDate]   = useState("");

  // Wenn Monat/Jahr wechselt und Ausnahme-Formular offen: Startdatum nachziehen
  React.useEffect(()=>{
    if(!showExForm || !editVorm?._seriesId || exEditId) return;
    const pad2 = n=>String(n).padStart(2,"0");
    const monthStr = `${year}-${pad2(month+1)}`;
    const found = txs.find(t=>t._seriesId===editVorm._seriesId
      && !t._exSeriesId && t.date.startsWith(monthStr));
    if(found) setExStartDate(found.date);
    else setExStartDate(_txDateForMonth(year, month));
  }, [month, year, showExForm]);
  const [exCount,       setExCount]       = useState("");
  const [exEditId,      setExEditId]      = useState(null);  // _exSeriesId beim Bearbeiten
  const [exEditScope,   setExEditScope]   = useState("single");
  const [exLastOfMonth, setExLastOfMonth] = useState(false);

  // Alle Ausnahme-Serien dieser Hauptserie
  const exSeries = React.useMemo(()=>{
    if(!editVorm?._seriesId) return [];
    const allEx = txs.filter(t=>t._seriesId===editVorm._seriesId && t._exSeriesId);
    const byId = {};
    allEx.forEach(t=>{
      if(!byId[t._exSeriesId]) byId[t._exSeriesId]=[];
      byId[t._exSeriesId].push(t);
    });
    return Object.entries(byId).map(([id,items])=>{
      const sorted = items.sort((a,b)=>a.date.localeCompare(b.date));
      return {id, items:sorted, first:sorted[0], last:sorted[sorted.length-1],
        interval: items[0]?._exInterval||12, amount: items[0]?.totalAmount};
    });
  }, [editVorm, txs]);

  const handleSaveException = () => {
    const amt = pn(exAmount.replace(",","."));
    if(!amt || !exStartDate) return;
    const seriesId = editVorm._seriesId;
    if(!seriesId) return;

    const exId = exEditId || ("ex-"+uid());
    const n = exCount ? parseInt(exCount)||1 : 99;

    setTxs(prev=>{
      // Hauptserien-Buchungen ab exStartDate mit passendem Intervall
      const mainTxs = prev.filter(t=>t._seriesId===seriesId && !t._exSeriesId)
        .sort((a,b)=>a.date.localeCompare(b.date));

      const matches = mainTxs.filter(t=>{
        if(t.date < exStartDate) return false;
        const d = new Date(t.date);
        const s = new Date(exStartDate);
        const monthDiff = (d.getFullYear()-s.getFullYear())*12 + (d.getMonth()-s.getMonth());
        return monthDiff >= 0 && monthDiff % exInterval === 0;
      }).slice(0, n);

      const matchIds = new Set(matches.map(t=>t.id));

      // Bearbeitung: zuerst vorherige Ausnahmen dieser exId zurücksetzen
      const withReset = exEditId ? prev.map(t=>{
        if(t._exSeriesId!==exEditId) return t;
        // Betrag auf regularAmt zurücksetzen
        const regAmt = seriesAmtInfo.regularAmt;
        return regAmt ? {...t, totalAmount:regAmt, _exSeriesId:undefined, _isException:undefined} : t;
      }) : prev;

      // Jetzt passende Buchungen mit neuem Betrag + exSeriesId markieren
      return withReset.map(t=>{
        if(!matchIds.has(t.id)) return t;
        return {
          ...t,
          totalAmount: amt,
          splits: t.splits?.length ? t.splits.map(s=>({...s,amount:amt/t.splits.length})) : t.splits,
          _exSeriesId: exId,
          _exInterval: exInterval,
          _isException: true,
        };
      });
    });

    setShowExForm(false);
    setExAmount(""); setExStartDate(""); setExCount(""); setExEditId(null);
  };

  const handleDeleteException = (exId, scope, fromDate) => {
    const regAmt = seriesAmtInfo.regularAmt;
    setTxs(prev=>prev.map(t=>{
      if(t._exSeriesId!==exId) return t;
      if(scope==="all" ||
         (scope==="from" && t.date>=fromDate) ||
         (scope==="single" && t.date===fromDate)) {
        // Betrag auf regulären Wert zurücksetzen
        const restored = regAmt ? regAmt : t.totalAmount;
        return {
          ...t,
          totalAmount: restored,
          splits: t.splits?.length ? t.splits.map(s=>({...s,amount:restored/t.splits.length})) : t.splits,
          _exSeriesId: undefined,
          _isException: undefined,
        };
      }
      return t;
    }));
  };

  // Anzahl + Intervall der Serie aus echten Buchungen ermitteln
  const seriesCount = React.useMemo(()=>{
    if(!isEdit || !editVorm?._seriesId) return null;
    return txs.filter(t=>t._seriesId===editVorm._seriesId && !t._isException).length;
  }, [isEdit, editVorm, txs]);

  // Abweichende Beträge in der Serie erkennen
  const seriesAmtInfo = React.useMemo(()=>{
    if(!isEdit || !editVorm?._seriesId) return {deviations:[],regularAmt:0,firstDev:null,lastDev:null};
    // Nur Hauptserien-Buchungen ohne Ausnahme-Markierung für regulären Betrag
    const sorted = txs.filter(t=>t._seriesId===editVorm._seriesId && !t._isException)
      .sort((a,b)=>a.date.localeCompare(b.date));
    if(sorted.length<2) return {deviations:[],regularAmt:sorted[0]?.totalAmount||0,firstDev:null,lastDev:null};
    // Häufigster Betrag = "regulär"
    const amtCounts = {};
    sorted.forEach(t=>{const k=Math.round(t.totalAmount*100)/100; amtCounts[k]=(amtCounts[k]||0)+1;});
    const regularAmt = Number(Object.entries(amtCounts).sort((a,b)=>b[1]-a[1])[0][0]);
    // Abweichungen = Buchungen mit anderem Betrag (das sind echte Betragsänderungen, nicht Ausnahmen)
    const allDev = sorted
      .map((t,i)=>({idx:i, date:t.date, amt:t.totalAmount, id:t.id, n:sorted.length}))
      .filter(e=>Math.round(e.amt*100)/100 !== regularAmt);
    // Für Finanzierung: erste/letzte abweichende
    const firstDev = allDev.find(e=>e.idx===0)||null;
    const lastDev  = allDev.find(e=>e.idx===sorted.length-1)||null;
    const deviations = allDev.filter(e=>e.idx!==0 && e.idx!==sorted.length-1);
    return {deviations, regularAmt, firstDev, lastDev};
  }, [isEdit, editVorm, txs]);
  const seriesDeviations = seriesAmtInfo.deviations;

  // Editierbare abweichende Beträge: {txId -> string}
  const [devAmounts, setDevAmounts] = useState(()=>{
    if(!editVorm?._seriesId) return {};
    return {}; // wird unten per useEffect befüllt
  });

  // Befülle devAmounts wenn seriesDeviations sich ändert
  React.useEffect(()=>{
    if(seriesDeviations.length===0) return;
    setDevAmounts(prev=>{
      const next={...prev};
      seriesDeviations.forEach(e=>{
        if(!next[e.id]) next[e.id]=String(e.amt).replace(".",",");
      });
      return next;
    });
  }, [seriesDeviations.length]);

  // Korrigiere amount auf den regulären Betrag (nicht den der angeklickten Buchung)
  React.useEffect(()=>{
    if(!isEdit || !seriesAmtInfo.regularAmt || seriesAmtInfo.regularAmt<=0) return;
    setAmount(String(seriesAmtInfo.regularAmt).replace(".",","));
  }, [seriesAmtInfo.regularAmt]);

  // Auto-aktiviere Toggle nur für Finanzierung wenn erste/letzte Buchung abweicht
  React.useEffect(()=>{
    if(typ!=="finanzierung") return;
    const {firstDev, lastDev} = seriesAmtInfo;
    if(firstDev||lastDev) {
      setCustomFirstLast(true);
      if(firstDev) setFirstAmount(String(firstDev.amt).replace(".",","));
      if(lastDev)  setLastAmount(String(lastDev.amt).replace(".",","));
    }
  }, [seriesAmtInfo.firstDev?.id, seriesAmtInfo.lastDev?.id]);

  const seriesInterval = React.useMemo(()=>{
    if(!isEdit || !editVorm?._seriesId) return null;
    const sorted = txs.filter(t=>t._seriesId===editVorm._seriesId)
      .sort((a,b)=>a.date.localeCompare(b.date));
    if(sorted.length < 2) return editVorm.repeatMonths||1;
    const d1 = new Date(sorted[0].date);
    const d2 = new Date(sorted[1].date);
    const months = (d2.getFullYear()-d1.getFullYear())*12+(d2.getMonth()-d1.getMonth());
    return months||1;
  }, [isEdit, editVorm, txs]);

  // Intervall aus Serie übernehmen wenn nicht explizit geändert
  React.useEffect(()=>{
    if(seriesInterval && seriesInterval !== interval_) {
      setInterval_(seriesInterval);
    }
  }, [seriesInterval]);

  const catOpts = cats.filter(c => {
    const grp = groups.find(g=>g.type===c.type);
    const beh = grp?.behavior || c.type;
    return csvType==="income"
      ? (beh==="income" || (c.type==="tagesgeld" && beh!=="expense"))
      : (beh==="expense" || (c.type==="tagesgeld" && beh!=="income"));
  });
  const selCat = cats.find(c=>c.id===catId);
  const subOpts = selCat?.subs||[];

  const interval_ = interval; // muss VOR calcCount stehen!
  const calcCount = () => {
    if(typ==="einmalig") return 1;
    if(count) return Math.max(1, parseInt(count)||1);
    if(endDate && startDate) {
      const s=new Date(startDate), e=new Date(endDate);
      const months=(e.getFullYear()-s.getFullYear())*12+(e.getMonth()-s.getMonth())+1;
      return Math.max(1, Math.ceil(months/interval_));
    }
    // Finanzierung: bestehende Serienanzahl als Fallback (nicht 1!)
    if(typ==="finanzierung") {
      if(isEdit && seriesCount) return seriesCount;
      return 1;
    }
    // "unbegrenzt" = vom Startdatum bis Dezember (Startjahr + 6)
    const start = new Date(startDate||today);
    const endYear = start.getFullYear() + 6;
    const endDec = new Date(endYear, 11, 31); // 31. Dez
    const totalMonths = (endDec.getFullYear()-start.getFullYear())*12+(endDec.getMonth()-start.getMonth())+1;
    return Math.max(1, Math.ceil(totalMonths/interval_));
  };
  const totalCount = calcCount();
  const preview = [];
  for(let i=0;i<Math.min(totalCount,3);i++) preview.push(isoAddMonths(startDate,i*interval_));

  const handleSave = () => {
    setError("");
    const amt = pn(amount.replace(",","."));
    if(!amt) { setError("Bitte Betrag eingeben."); return; }
    if(!desc.trim()) { setError("Bitte Beschreibung eingeben."); return; }
    if(!startDate) { setError("Bitte Startdatum wählen."); return; }

    const newSplits = catId ? [{id:uid(),catId,subId:subId||"",amount:amt}] : [];

    // ── BEARBEITEN-MODUS ──────────────────────────────────────────────
    if(isEdit) {
      const seriesId = editVorm._seriesId;
      const pad2 = n=>String(n).padStart(2,"0");

      // Hilfsfunktion: eine einzelne tx updaten
      const updateTx = (t) => ({
        ...t, desc:desc.trim(), totalAmount:amt,
        accountId, _csvType:csvType, splits:newSplits, note:note||"",
        repeatMonths:interval_,
        ...(lastOfMonth?{_lastOfMonth:true}:{_lastOfMonth:undefined}),
        ...(typ==="finanzierung"?{_seriesTyp:"finanzierung"}:{_seriesTyp:undefined}),
      });

      // Hilfsfunktion: Linked-Counterpart aktualisieren oder erstellen/löschen
      // Gibt zurück: {removeIds: Set, addTxs: Array}
      const buildLinkedUpdate = (parentTx) => {
        const existingLinked = txs.find(t => t._linkedTo===parentTx.id && t.pending);
        if(csvType!=="expense" || !transferToAcc || transferToAcc===accountId) {
          // Kein Transfer mehr → bestehendes Gegenstück löschen
          return existingLinked
            ? {removeIds:new Set([existingLinked.id]), addTxs:[]}
            : {removeIds:new Set(), addTxs:[]};
        }
        const linkedSplits = transferToCat
          ? [{id:uid(),catId:transferToCat,subId:transferToSub||"",amount:amt}]
          : [];
        const newLinked = {
          id: existingLinked?.id || uid(),
          date: parentTx.date,
          desc: desc.trim(),
          totalAmount: amt,
          pending: true,
          accountId: transferToAcc,
          _csvType: "income",
          repeatMonths: interval_,
          splits: linkedSplits,
          note: note||"",
          _linkedTo: parentTx.id,
          ...(parentTx._seriesId ? {_seriesId: parentTx._seriesId+"_in", _seriesIdx: parentTx._seriesIdx, _seriesTotal: parentTx._seriesTotal} : {}),
          ...(lastOfMonth ? {_lastOfMonth:true} : {}),
        };
        return existingLinked
          ? {removeIds:new Set([existingLinked.id]), addTxs:[newLinked]}
          : {removeIds:new Set(), addTxs:[newLinked]};
      };

      if(typ==="einmalig" || !seriesId) {
        // Einmalige Buchung: direkt updaten inkl. Datum + Counterpart pflegen
        const updatedParent = (() => {
          const orig = txs.find(t=>t.id===editVorm.id);
          return orig ? {...updateTx(orig), date: startDate||orig.date} : null;
        })();
        if(updatedParent) {
          const {removeIds, addTxs} = buildLinkedUpdate(updatedParent);
          setTxs(p => {
            const next = p.map(t => t.id===editVorm.id ? updatedParent : t)
                          .filter(t => !removeIds.has(t.id));
            return [...next, ...addTxs];
          });
        }

      } else if(editScope==="single") {
        // Nur die Buchung im aktuell gewählten Monat ändern (Datum bleibt)
        const monthStr = `${year}-${pad2(month+1)}`;
        const matchedParents = txs.filter(t=>
          t._seriesId===seriesId && !t._exSeriesId && t.date.startsWith(monthStr));
        setTxs(p=>{
          let next = p.map(t=>{
            if(t._seriesId!==seriesId||t._exSeriesId) return t;
            if(!t.date.startsWith(monthStr)) return t;
            return updateTx(t);
          });
          // Für jede aktualisierte Parent-Buchung die Linked-Counterpart pflegen
          matchedParents.forEach(orig => {
            const updated = updateTx(orig);
            const {removeIds, addTxs} = buildLinkedUpdate(updated);
            next = next.filter(t => !removeIds.has(t.id));
            next = [...next, ...addTxs];
          });
          return next;
        });

      } else {
        // range / from / all — Serie immer komplett neu aufbauen im Bereich
        const seriesTxs = txs.filter(t=>t._seriesId===seriesId&&!t._exSeriesId)
          .sort((a,b)=>a.date.localeCompare(b.date));
        const rangeFrom = editScope==="all" ? "0000-00-00" : scopeFrom;
        const rangeTo   = editScope==="all" ? "9999-99-99"
                        : editScope==="from" ? "9999-99-99"
                        : scopeTo;
        const affectedIds = new Set(
          seriesTxs.filter(t=>t.date>=rangeFrom && t.date<=rangeTo).map(t=>t.id)
        );
        const keepTxs = txs.filter(t=>!affectedIds.has(t.id));

        // Startdatum: bei "alle" = neues startDate; bei "from"/"range" = scopeFrom
        const refStart = editScope==="all"
          ? (startDate || seriesTxs[0]?.date || editVorm.date)
          : scopeFrom;

        // Anzahl: bei "alle" = count-Feld oder calcCount(); sonst = betroffene Raten
        const firstAmt2 = customFirstLast&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
        const lastAmt2  = customFirstLast&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;

        let n;
        if(editScope==="all") {
          n = count ? Math.max(1,parseInt(count)||1) : calcCount();
        } else {
          // range/from: Anzahl der betroffenen Raten beibehalten
          n = affectedIds.size;
        }

        const newGenTxs = [];
        for(let i=0; i<n; i++){
          const date = isoAddMonths(refStart, i*interval_, lastOfMonth);
          const isFirst=i===0, isLast=i===n-1;
          const txAmt = (isFirst&&firstAmt2!=null)?firstAmt2:(isLast&&lastAmt2!=null)?lastAmt2:amt;
          const txSplits = catId?[{id:uid(),catId,subId:subId||"",amount:txAmt}]:newSplits;
          const tx = {
            id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
            accountId, _csvType:csvType, splits:txSplits, note:note||"",
            repeatMonths:interval_, _seriesId:seriesId,
            _seriesIdx:i+1, _seriesTotal:n,
            ...(lastOfMonth?{_lastOfMonth:true}:{_lastOfMonth:undefined}),
            ...(typ==="finanzierung"?{_seriesTyp:"finanzierung"}:{_seriesTyp:undefined}),
          };
          newGenTxs.push(tx);
          // Umbuchungs-Gegenstück (Einnahme auf Zielkonto)
          if(csvType==="expense" && transferToAcc && transferToAcc!==accountId) {
            const linkedSplits = transferToCat
              ? [{id:uid(),catId:transferToCat,subId:transferToSub||"",amount:txAmt}]
              : [];
            newGenTxs.push({
              id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
              accountId: transferToAcc, _csvType:"income",
              repeatMonths:interval_, splits:linkedSplits, note:note||"",
              _linkedTo: tx.id,
              _seriesId: seriesId+"_in", _seriesIdx:i+1, _seriesTotal:n,
              ...(lastOfMonth?{_lastOfMonth:true}:{}),
            });
          }
        }
        // Beim Edit-Replace: alte verknüpfte Gegenstücke der betroffenen Buchungen auch entfernen
        const affectedLinkedIds = new Set(
          txs.filter(t=>t._linkedTo && affectedIds.has(t._linkedTo)).map(t=>t.id)
        );
        const keepTxs2 = keepTxs.filter(t=>!affectedLinkedIds.has(t.id));
        setTxs([...keepTxs2, ...newGenTxs]);
      }
      setSaved(true); setTimeout(()=>{ setSaved(false); onClose(); },1000);
      return;
    }

    // ── NEU ERSTELLEN ─────────────────────────────────────────────────
    const n = calcCount();
    const seriesId = typ!=="einmalig" ? uid() : null;
    // Erst-/Letztbetrag
    const firstAmt = customFirstLast&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
    const lastAmt  = customFirstLast&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;

    const newTxs = [];
    for(let i=0; i<n; i++){
      const date = isoAddMonths(startDate, i*interval_, lastOfMonth&&typ!=="einmalig");
      const isFirst = i===0;
      const isLast  = i===n-1;
      const txAmt = (isFirst&&firstAmt!=null) ? firstAmt
                  : (isLast &&lastAmt !=null) ? lastAmt
                  : amt;
      const txSplits = catId
        ? [{id:uid(),catId,subId:subId||"",amount:txAmt}]
        : [];
      const tx = {
        id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
        accountId:accountId||accounts[0]?.id||"",
        _csvType:csvType, repeatMonths:interval_,
        splits: txSplits,
        note: note||"",
        ...(lastOfMonth&&typ!=="einmalig" ? {_lastOfMonth:true} : {}),
        ...(typ==="einmalig"&&valueDate ? {valueDate} : {}),
      };
      if(seriesId){
        tx._seriesId=seriesId; tx._seriesIdx=i+1; tx._seriesTotal=n;
        if(typ==="finanzierung") tx._seriesTyp="finanzierung";
      }
      newTxs.push(tx);

      // Umbuchung auf eigenes Konto: verknüpfte Gegenbuchung als Einnahme erstellen
      // Nur für Ausgaben (csvType==="expense") und wenn transferToAcc gesetzt ist
      if(csvType==="expense" && transferToAcc && transferToAcc!==tx.accountId) {
        const linkedSplits = transferToCat
          ? [{id:uid(),catId:transferToCat,subId:transferToSub||"",amount:txAmt}]
          : [];
        const linkedTx = {
          id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
          accountId: transferToAcc,
          _csvType:"income",  // Gegenstück = Einnahme
          repeatMonths:interval_,
          splits: linkedSplits,
          note: note||"",
          _linkedTo: tx.id,   // verknüpft mit Ausgabe
          ...(lastOfMonth&&typ!=="einmalig" ? {_lastOfMonth:true} : {}),
        };
        if(seriesId){
          // Eigene Serie für die Zugang-Seite (oder gleiche Serie? besser eigene damit edit-getrennt)
          linkedTx._seriesId=seriesId+"_in"; linkedTx._seriesIdx=i+1; linkedTx._seriesTotal=n;
        }
        newTxs.push(linkedTx);
      }
    }
    setTxs(p=>[...p,...newTxs]);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
    setDesc(""); setAmount(""); setCatId(""); setSubId(""); setCount(""); setEndDate(""); setStartDate(today); setValueDate(""); setNote("");
  };

  const handleDelete = () => {
    if(!isEdit||!editVorm) return;
    const seriesId = editVorm._seriesId;
    if(!seriesId || editScope==="single") {
      if(!window.confirm("Diese Vormerkung löschen?")) return;
      setTxs(p=>p.filter(t=>t.id!==editVorm.id));
    } else if(editScope==="from") {
      if(!window.confirm("Diese und alle folgenden Vormerkungen löschen?")) return;
      setTxs(prevTxs=>{
        const seriesTxs=prevTxs.filter(t=>t._seriesId===seriesId).sort((a,b)=>a.date.localeCompare(b.date));
        const toDelete=new Set(seriesTxs.filter(t=>t.date>=scopeFrom).map(t=>t.id));
        return prevTxs.filter(t=>!toDelete.has(t.id));
      });
    } else {
      if(!window.confirm("Alle Vormerkungen dieser Serie löschen?")) return;
      setTxs(p=>p.filter(t=>t._seriesId!==seriesId));
    }
    onClose();
  };

  // SecToggle defined outside

  // SegBtn defined outside

  const endPreview = count && startDate
    ? (()=>{const d=new Date(isoAddMonths(startDate,(parseInt(count)-1)*interval_));
        return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;})()
    : null;

  return (
    <div onClick={mobileMode?null:onClose}
      className={mobileMode?"mobile-modal":""}
      style={mobileMode
        ? {position:"fixed",inset:0,background:T.bg,zIndex:300,display:"flex",flexDirection:"column"}
        : {position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",
            backdropFilter:"blur(8px)",zIndex:15,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={mobileMode
        ? {flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}
        : {background:T.surf2,borderRadius:"24px 24px 0 0",
            width:"100%",maxWidth:520,maxHeight:"92vh",display:"flex",flexDirection:"column",
            border:`1px solid ${T.bds}`,boxShadow:"0 -8px 40px rgba(0,0,0,0.6)"}}>

        {/* Header */}
        <div style={{padding:mobileMode?"12px 16px":"14px 16px 10px",
          borderBottom:`1px solid ${T.bd}`,background:mobileMode?T.surf:"transparent",
          display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",
            color:T.txt2,width:mobileMode?44:34,height:mobileMode?44:34,
            borderRadius:11,cursor:"pointer",fontSize:mobileMode?20:16,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            ←
          </button>
          <div style={{flex:1}}>
            <div style={{color:T.txt,fontSize:mobileMode?24:15,fontWeight:700}}>
              {isEdit ? "vormerkung bearbeiten" : "wiederkehrende anlegen"}
            </div>
            <div style={{color:T.txt2,fontSize:mobileMode?16:10}}>
              {isEdit
                ? (editVorm._seriesId ? `${typ==="finanzierung"?"Finanzierung":"Serie"} · ${txs.filter(t=>t._seriesId===editVorm._seriesId).length} Buchungen · Intervall: ${interval_===1?"monatlich":interval_===3?"quartalsweise":interval_===12?"jährlich":interval_+"M"}` : "einmalige Vormerkung")
                : "Einmalig · Wiederkehrend · Finanzierung · Erkennen"}
            </div>
          </div>
          {!mobileMode&&<button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"none",
            color:T.txt2,borderRadius:9,width:30,height:30,cursor:"pointer"}}>
            {Li("x",14)}
          </button>}
        </div>

        <div style={{flex:1,overflowY:"auto",background:mobileMode?T.surf2:"transparent"}}>

          {/* NEU ERSTELLEN */}
          <VormHubSecToggle label="neue Vormerkung erstellen" icon="plus-circle"
            active={secNeu} onToggle={()=>setSecNeu(v=>!v)} accent={T.gold}/>

          {secNeu&&(
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.bd}`}}>

              {/* Abweichende Beträge nur für Finanzierung */}
              {isEdit&&seriesDeviations.length>0&&typ==="finanzierung"&&(
                <div style={{background:"rgba(74,159,212,0.08)",border:`1px solid ${T.blue}44`,
                  borderRadius:9,padding:"8px 10px",marginBottom:10}}>
                  <div style={{color:T.blue,fontSize:10,fontWeight:700,marginBottom:6,
                    display:"flex",alignItems:"center",gap:4}}>
                    {Li("edit-3",10,T.blue)} Abweichende Beträge mittendrin ({seriesDeviations.length}):
                  </div>
                  {seriesDeviations.map(e=>{
                    const [y,m,d]=e.date.split("-");
                    const label = e.idx===0 ? "1. Buchung (Start)"
                      : e.idx===(seriesCount-1) ? `${e.idx+1}. Buchung (Ende)`
                      : `${e.idx+1}. Buchung`;
                    return (
                      <div key={e.id} style={{display:"flex",alignItems:"center",
                        gap:6,marginBottom:5}}>
                        <div style={{flex:1}}>
                          <div style={{color:T.txt2,fontSize:8,marginBottom:2}}>
                            {label} · {d}.{m}.{y}
                          </div>
                          <input
                            value={devAmounts[e.id]||String(e.amt).replace(".",",")}
                            onChange={ev=>setDevAmounts(p=>({...p,[e.id]:ev.target.value}))}
                            inputMode="decimal"
                            style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",
                              fontSize:11,padding:"5px 8px",border:`1px solid ${T.blue}66`}}/>
                        </div>
                        <button
                          onClick={()=>setDevAmounts(p=>({...p,[e.id]:amount}))}
                          title="auf regulären Betrag zurücksetzen"
                          style={{background:"rgba(255,255,255,0.07)",border:"none",
                            color:T.txt2,cursor:"pointer",borderRadius:6,
                            padding:"6px 8px",flexShrink:0,marginTop:12}}>
                          {Li("rotate-ccw",10,T.txt2)}
                        </button>
                      </div>
                    );
                  })}
                  <div style={{color:T.txt2,fontSize:8,marginTop:2}}>
                    Leeres Feld = regulärer Betrag · ↩ setzt auf regulären Betrag zurück
                  </div>
                </div>
              )}

              {/* Segmented Control */}
              <div style={{display:"flex",gap:3,background:"rgba(0,0,0,0.2)",
                borderRadius:10,padding:3,marginBottom:12}}>
                <VormHubSegBtn v="einmalig"      l="Einmalig"      icon="calendar"     cur={typ} set={setTyp} clearCount={()=>setCount("")} clearEnd={()=>setEndDate("")}/>
                <VormHubSegBtn v="wiederkehrend" l="wiederkehrend" icon="repeat"        cur={typ} set={setTyp} clearCount={()=>setCount("")} clearEnd={()=>setEndDate("")}/>
                <VormHubSegBtn v="finanzierung"  l="Finanzierung"  icon="credit-card"   cur={typ} set={setTyp} clearCount={()=>setCount("")} clearEnd={()=>setEndDate("")}/>
              </div>

              {/* 1. Ausgabe / Einnahme */}
              <div style={{display:"flex",gap:4,marginBottom:8}}>
                {[["expense","− Ausgabe",T.neg],["income","+ Einnahme",T.pos]].map(([val,label,col])=>{
                  const active = csvType===val;
                  return (
                    <button key={val} onClick={()=>{setCsvType(val);setCatId("");setSubId("");}}
                      style={{flex:1,padding:"8px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,
                        border:`2px solid ${active?col:T.bd}`,
                        background:active?col:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.04)",
                        color:active?"#fff":T.txt2,fontFamily:"inherit",transition:"all 0.15s"}}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* 2. Zahlungsart */}
              {accounts.length>0&&<>
                <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Zahlungsart</div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  {accounts.map(acc=>{
                    const sel = accountId===acc.id;
                    return (
                      <button key={acc.id} onClick={()=>setAccountId(acc.id)}
                        style={{flex:1,padding:"8px 4px",borderRadius:10,border:`2px solid ${sel?acc.color:"transparent"}`,
                          cursor:"pointer",fontSize:11,fontWeight:700,textAlign:"center",
                          background:sel?acc.color+"22":"rgba(255,255,255,0.04)",color:sel?acc.color:T.txt2,
                          fontFamily:"inherit"}}>
                        <div style={{fontSize:16,marginBottom:1}}>{Li(acc.icon,18,T.txt)}</div>
                        {acc.name}{acc.delayDays>0&&<span style={{color:T.gold,fontSize:"0.8em",fontWeight:700,marginLeft:2}}>+{acc.delayDays}d</span>}
                      </button>
                    );
                  })}
                </div>
              </>}

              {/* 2b. Umbuchung: Zielkonto + Zielkategorie (nur für Ausgaben) */}
              {csvType==="expense" && accounts.length>1 && (()=>{
                const targets = accounts.filter(a=>a.id!==accountId);
                // Zielkategorien: alle Income-Behavior-Kategorien strikt nach Zielkonto filtern.
                // "Income-Behavior" = Gruppen-Behavior "income" ODER c.type==="income"/"tagesgeld" (Legacy).
                const tgtCats = (cats||[]).filter(c=>{
                  const grp = (groups||[]).find(g=>g.type===c.type);
                  const beh = grp?.behavior || c.type;
                  // Nur Income-Behavior-Kategorien als Umbuchungsziel
                  if(beh!=="income" && beh!=="tagesgeld" && c.type!=="income" && c.type!=="tagesgeld") return false;
                  if(!transferToAcc) return true; // ohne Konto-Wahl alle anzeigen
                  // 1) Falls Kategorie selbst eine accountId hat → direkt vergleichen
                  if(c.accountId) return c.accountId === transferToAcc;
                  // 2) Sonst über Gruppen-Zuordnung: gibt es eine Gruppe mit gleichem type
                  //    deren accountId zum Target passt? Oder eine Gruppe ohne accountId (global)?
                  const matchingGroups = (groups||[]).filter(g=>g.type===c.type);
                  if(matchingGroups.length === 0) return true; // keine Gruppe → universell
                  return matchingGroups.some(g => !g.accountId || g.accountId === transferToAcc);
                });
                const curTgtCat = tgtCats.find(c=>c.id===transferToCat);
                const tgtSubs = curTgtCat?.subs||[];
                const umbBlue = "#4A9FD4";
                return (
                  <div style={{marginBottom:8,padding:"8px 10px",
                    background:"rgba(74,159,212,0.06)",border:`1px solid ${transferToAcc?umbBlue:T.bd}`,
                    borderRadius:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      {Li("arrow-right-left",12,umbBlue)}
                      <span style={{color:T.txt2,fontSize:10,fontWeight:700}}>Umbuchung auf eigenes Konto (optional)</span>
                      {transferToAcc&&(
                        <button onClick={()=>{setTransferToAcc("");setTransferToCat("");setTransferToSub("");}}
                          style={{marginLeft:"auto",background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:10,padding:"2px 6px",fontFamily:"inherit"}}>
                          Entfernen
                        </button>
                      )}
                    </div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:transferToAcc?6:0}}>
                      {targets.map(tgt=>{
                        const sel = transferToAcc===tgt.id;
                        return (
                          <button key={tgt.id} onClick={()=>{
                            const newVal = sel?"":tgt.id;
                            setTransferToAcc(newVal);
                            // Bei Konto-Wechsel: Zielkategorie zurücksetzen falls sie zum vorherigen Konto gehörte
                            if(newVal !== transferToAcc) {
                              setTransferToCat("");
                              setTransferToSub("");
                            }
                            // Bei Edit einer Serie + neue Umbuchung hinzugefügt → Default-Scope auf "alle"
                            if(newVal && isEdit && editVorm?._seriesId && editScope==="single") {
                              setEditScope("all");
                            }
                          }}
                            style={{flex:"1 1 80px",padding:"5px 8px",borderRadius:7,
                              border:`1.5px solid ${sel?tgt.color:T.bd}`,
                              background:sel?tgt.color+"22":"rgba(255,255,255,0.04)",
                              color:sel?tgt.color:T.txt2,fontSize:11,fontWeight:600,cursor:"pointer",
                              display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"inherit"}}>
                            {Li(tgt.icon,11,sel?tgt.color:T.txt2)}
                            {tgt.name}
                          </button>
                        );
                      })}
                    </div>
                    {transferToAcc&&(<>
                      <div style={{color:T.txt2,fontSize:9,fontWeight:700,marginBottom:3}}>Zielkategorie auf Zielkonto</div>
                      <div style={{display:"flex",gap:5}}>
                        <select value={transferToCat}
                          onChange={e=>{setTransferToCat(e.target.value);setTransferToSub("");}}
                          style={{flex:1,padding:"5px 7px",borderRadius:6,border:`1px solid ${T.bd}`,
                            background:"rgba(255,255,255,0.04)",color:T.txt,fontSize:11,fontFamily:"inherit",outline:"none"}}>
                          <option value="">— Hauptkategorie —</option>
                          {tgtCats.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                        <select value={transferToSub} disabled={!tgtSubs.length}
                          onChange={e=>setTransferToSub(e.target.value)}
                          style={{flex:1,padding:"5px 7px",borderRadius:6,border:`1px solid ${T.bd}`,
                            background:"rgba(255,255,255,0.04)",color:T.txt,fontSize:11,fontFamily:"inherit",outline:"none",
                            opacity:tgtSubs.length?1:0.5}}>
                          <option value="">— Unterkategorie —</option>
                          {tgtSubs.map(s=>(<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                      <div style={{color:T.txt2,fontSize:9,marginTop:4,fontStyle:"italic"}}>
                        Beim Speichern wird automatisch eine verknüpfte Eingangs-Vormerkung auf dem Zielkonto angelegt.
                      </div>
                    </>)}
                  </div>
                );
              })()}

              {/* 3. Betrag */}
              <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>
                {typ==="finanzierung"&&customFirstLast ? "Regelmäßiger Betrag (€)" : "Betrag (€)"}
              </div>
              <input value={amount} onChange={e=>setAmount(e.target.value)}
                placeholder="0,00" inputMode="decimal"
                style={{...INP,marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

              {/* 4. Intervall (Wiederkehrend/Finanzierung) */}
              {typ!=="einmalig"&&<>
                <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Intervall</div>
                <div style={{display:"flex",gap:3,marginBottom:8}}>
                  {[[1,"mtl."],[3,"quartl."],[6,"halb."],[12,"jährl."]].map(([v,l])=>(
                    <button key={v} onClick={()=>setInterval_(v)}
                      style={{flex:1,padding:"7px 2px",borderRadius:8,border:"none",
                        cursor:"pointer",fontFamily:"inherit",fontSize:9,fontWeight:700,
                        background:interval_===v?T.blue:"rgba(255,255,255,0.08)",
                        color:interval_===v?"#fff":T.txt2}}>
                      {l}
                    </button>
                  ))}
                </div>
              </>}

              {/* 5. Letzter Tag (Wiederkehrend/Finanzierung) */}
              {typ!=="einmalig"&&(
                <div onClick={()=>{
                  const next = !lastOfMonth;
                  setLastOfMonth(next);
                  if(next && startDate) {
                    const [y,m] = startDate.split("-").map(Number);
                    const lastDay = new Date(y, m, 0).getDate();
                    setStartDate(`${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`);
                  }
                  // fromDate immer mitaktualisieren wenn nicht manuell gesetzt
                  if(!fromDateManual) {
                    const d=_txDateForMonth(year,month);
                    setScopeFrom(d); setScopeTo(d);
                  }
                }} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                  borderRadius:8,cursor:"pointer",marginBottom:8,
                  background:lastOfMonth?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${lastOfMonth?T.blue:T.bd}`}}>
                  <div style={{width:28,height:18,borderRadius:9,position:"relative",flexShrink:0,
                    background:lastOfMonth?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:lastOfMonth?11:2,width:14,height:14,
                      borderRadius:"50%",background:"#fff",transition:"left 0.2s",
                      boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                  </div>
                  <span style={{color:lastOfMonth?T.txt:T.txt2,fontSize:10}}>Immer letzter Tag des Monats</span>
                </div>
              )}

              {/* 6. Anzahl / Enddatum (Wiederkehrend/Finanzierung) */}
              {typ!=="einmalig"&&<div style={{display:"flex",gap:6,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>
                    {typ==="finanzierung"?"Anzahl Raten":"Anzahl (leer = 7 Jahre)"}
                  </div>
                  <input value={count} onChange={e=>{setCount(e.target.value);if(e.target.value)setEndDate("");}}
                    placeholder={typ==="finanzierung"?"z.B. 36":String(calcCount())}
                    inputMode="numeric"
                    style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box"}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>oder Enddatum</div>
                  {endDate?(
                    <div style={{display:"flex",gap:2,alignItems:"center"}}>
                      <input type="date" value={endDate}
                        onChange={e=>{setEndDate(e.target.value);if(e.target.value)setCount("");}}
                        style={{...INP,marginBottom:0,flex:1,
                          colorScheme:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"light":"dark"}}/>
                      <button onClick={()=>setEndDate("")}
                        style={{background:"none",border:"none",color:T.neg,cursor:"pointer",padding:"4px"}}>
                        {Li("x",10)}
                      </button>
                    </div>
                  ):(
                    <button onClick={()=>{
                      setEndDate(new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10));
                      setCount("");
                    }} style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",
                      cursor:"pointer",color:T.txt2,textAlign:"left",fontFamily:"inherit",
                      border:`1px solid ${T.gold}44`,background:"transparent"}}>
                      kein Enddatum
                    </button>
                  )}
                </div>
              </div>}

              {/* 7+8. verursacht + Buchung am / Startdatum nebeneinander */}
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{color:T.txt2,fontSize:10,marginBottom:3,display:"flex",alignItems:"center",gap:4}}>
                    {Li("calendar",10,T.txt2)} verursacht
                  </div>
                  <div style={{display:"flex",gap:2,alignItems:"center"}}>
                    <input type="date" value={valueDate} onChange={e=>setValueDate(e.target.value)}
                      style={{...INP,marginBottom:0,flex:1,
                        colorScheme:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"light":"dark"}}/>
                    {valueDate&&<button onClick={()=>setValueDate("")}
                      style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:"4px",flexShrink:0}}>
                      {Li("x",11)}
                    </button>}
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>
                    {typ==="einmalig"?"Buchung am":"Startdatum"}
                  </div>
                  <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                    style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",
                      colorScheme:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"light":"dark"}}/>
                </div>
              </div>

              {/* 9. Kategorie */}
              <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Kategorie (optional)</div>
              <select value={catId} onChange={e=>{setCatId(e.target.value);setSubId("");}}
                style={{...INP,marginBottom:8,width:"100%",boxSizing:"border-box"}}>
                <option value="">— keine —</option>
                {catOpts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {catId&&subOpts.length>0&&<>
                <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Unterkategorie</div>
                <select value={subId} onChange={e=>setSubId(e.target.value)}
                  style={{...INP,marginBottom:8,width:"100%",boxSizing:"border-box"}}>
                  <option value="">— keine —</option>
                  {subOpts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </>}

              {/* 10. Beschreibung + Notiz zusammen */}
              <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Beschreibung</div>
              <input value={desc} onChange={e=>setDesc(e.target.value)}
                placeholder="z.B. Miete, Gehalt, Kfz-Steuer…"
                style={{...INP,marginBottom:4,width:"100%",boxSizing:"border-box"}}/>
              {/* 11. Abweichende Erst-/Letztbuchung (nur Finanzierung) */}
              {typ==="finanzierung"&&(
                <div onClick={()=>{setCustomFirstLast(v=>{if(v){setFirstAmount("");setLastAmount("");}return !v;})}}
                  style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                    cursor:"pointer",padding:"5px 8px",borderRadius:8,
                    background:customFirstLast?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.03)",
                    border:`1px solid ${customFirstLast?T.blue:T.bd}`}}>
                  <div style={{width:34,height:20,borderRadius:10,position:"relative",flexShrink:0,
                    background:customFirstLast?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:customFirstLast?14:2,width:16,height:16,
                      borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                  </div>
                  <span style={{color:customFirstLast?T.txt:T.txt2,fontSize:10}}>Abweichende Anzahlung / Schlussrate</span>
                </div>
              )}
              {customFirstLast&&typ==="finanzierung"&&(
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Startbetrag (1. Buchung)</div>
                    <input value={firstAmount} onChange={e=>setFirstAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                      placeholder={amount||"0,00"} inputMode="decimal"
                      style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",border:`1px solid ${T.blue}66`}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Endbetrag (letzte Buchung)</div>
                    <input value={lastAmount} onChange={e=>setLastAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                      placeholder={amount||"0,00"} inputMode="decimal"
                      style={{...INP,marginBottom:0,width:"100%",boxSizing:"border-box",border:`1px solid ${T.blue}66`}}/>
                  </div>
                </div>
              )}

              {/* 12. Vorschau (Wiederkehrend/Finanzierung) */}
              {typ!=="einmalig"&&(
                <div style={{background:"rgba(0,0,0,0.2)",borderRadius:9,padding:"8px 10px",
                  marginBottom:10,fontSize:10,color:T.txt2,lineHeight:1.6}}>
                  <span style={{color:T.pos,fontWeight:700}}>
                    {isEdit&&seriesCount
                      ? `${seriesCount} ${typ==="finanzierung"?"Rate":"Buchung"}${seriesCount!==1?"n":""} in der Serie`
                      : totalCount>=84&&!count?"Unbegrenzt (7 Jahre)"
                      : `${totalCount} ${typ==="finanzierung"?"Rate":"Buchung"}${totalCount!==1?"n":""}`}
                  </span>
                  {startDate&&<>{" · "}Start: {(()=>{const d=new Date(startDate);return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;})()}</>}
                  {endPreview&&<>{" · "}Ende: {endPreview}</>}
                  {totalCount>1&&<>{" · "}Erste 3: {preview.map(d=>{const dt=new Date(d);return `${pad(dt.getDate())}.${pad(dt.getMonth()+1)}`;}).join(", ")+(totalCount>3?"…":"")}</>}
                </div>
              )}

              {/* 13. Betrags-Abschnittsliste (nur Wiederkehrend im Bearbeiten-Modus) */}
              {isEdit&&editVorm._seriesId&&typ==="wiederkehrend"&&(()=>{
                const MONTHS_DE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
                const allSorted = txs.filter(t=>t._seriesId===editVorm._seriesId)
                  .sort((a,b)=>a.date.localeCompare(b.date));
                // Hauptbuchungen (keine Ausnahme-Markierung)
                const mainSorted = allSorted.filter(t=>!t._isException);
                if(mainSorted.length<1) return null;
                const total = mainSorted.length;
                // Betrags-Abschnitte aus Hauptbuchungen
                const sections = [];
                let cur = null;
                mainSorted.forEach(t=>{
                  const a = Math.round(t.totalAmount*100)/100;
                  if(!cur || cur.amt!==a) {
                    if(cur) sections.push(cur);
                    cur = {amt:a, from:t.date, to:t.date, count:1};
                  } else {
                    cur.to = t.date; cur.count++;
                  }
                });
                if(cur) sections.push(cur);
                // Ausnahmen (isException-Markierung)
                const exSorted = allSorted.filter(t=>t._isException);
                // Gruppiere Ausnahmen nach exSeriesId
                const exGroups = {};
                exSorted.forEach(t=>{
                  const k = t._exSeriesId||t.id;
                  if(!exGroups[k]) exGroups[k]={id:k,amt:t.totalAmount,dates:[]};
                  exGroups[k].dates.push(t.date);
                });
                const fmtMY = iso => {
                  const d=new Date(iso); return `${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
                };
                return (
                  <div style={{marginBottom:8,background:"rgba(0,0,0,0.15)",borderRadius:9,
                    padding:"8px 10px",fontSize:10}}>
                    <div style={{color:T.txt2,fontWeight:700,marginBottom:6}}>
                      {total}× insgesamt
                    </div>
                    {sections.map((s,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",
                        padding:"3px 0",borderBottom:`1px solid ${T.bd}`,alignItems:"center"}}>
                        <span style={{color:T.txt2}}>
                          {s.count===total
                            ? `${fmtMY(s.from)} – ${fmtMY(s.to)}`
                            : s.count===1 ? fmtMY(s.from)
                            : `${fmtMY(s.from)} – ${fmtMY(s.to)}`}
                          {s.count>1&&sections.length>1&&
                            <span style={{color:T.txt2,opacity:0.6}}> ({s.count}×)</span>}
                        </span>
                        <span style={{color:T.pos,fontWeight:700,fontFamily:"monospace"}}>
                          {fmt(s.amt)} €
                        </span>
                      </div>
                    ))}
                    {Object.values(exGroups).map(ex=>(
                      <div key={ex.id} style={{display:"flex",justifyContent:"space-between",
                        padding:"3px 0",borderBottom:`1px solid ${T.bd}`,alignItems:"center"}}>
                        <span style={{color:T.gold,display:"flex",alignItems:"center",gap:4}}>
                          {Li("star",9,T.gold)}
                          {ex.dates.length===1
                            ? fmtMY(ex.dates[0])
                            : `${fmtMY(ex.dates[0])} · ${ex.dates.length}×`}
                        </span>
                        <span style={{color:T.gold,fontWeight:700,fontFamily:"monospace"}}>
                          {fmt(ex.amt)} €
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {error&&<div style={{color:T.neg,fontSize:10,marginBottom:8}}>{error}</div>}

              {/* ── Verknüpfen: Vormerkung → Buchung ── */}
              {isEdit&&editVorm&&<VormVerknuepfenPanel editVorm={editVorm} txs={txs} setTxs={setTxs} onClose={onClose}/>}

              {/* Scope-Auswahl im Bearbeiten-Modus */}
              {isEdit&&editVorm._seriesId&&(()=>{
                const isLight2=T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss";
                const csD={colorScheme:isLight2?"light":"dark"};
                const inpStyle={...INP,marginBottom:0,width:"100%",boxSizing:"border-box",...csD,
                  border:`1px solid ${T.blue}66`};
                return (
                <div style={{marginBottom:8}}>
                  <div style={{color:T.txt2,fontSize:10,marginBottom:4}}>Änderung anwenden auf:</div>
                  {/* 4 Scope-Buttons */}
                  <div style={{display:"flex",gap:3,marginBottom:8}}>
                    {[["single","nur dieser"],["range","von … bis"],["from","ab dieser"],["all","alle"]].map(([v,l])=>(
                      <button key={v} onClick={()=>{
                        setEditScope(v);
                        setFromDateManual(false);
                        const d=_txDateForMonth(year,month);
                        if(v==="single"){setScopeFrom(d);setScopeTo(d);}
                        else if(v==="from"){setScopeFrom(d);}
                        else if(v==="range"){setScopeFrom(d);setScopeTo(d);}
                      }}
                        style={{flex:1,padding:"7px 2px",borderRadius:8,border:"none",cursor:"pointer",
                          fontFamily:"inherit",fontSize:10,fontWeight:editScope===v?700:400,
                          background:editScope===v?T.blue:"rgba(255,255,255,0.08)",
                          color:editScope===v?"#fff":T.txt2}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {/* Datumfelder je nach Scope */}
                  {editScope==="single"&&(
                    <div style={{color:T.txt2,fontSize:10,padding:"4px 0",opacity:0.8}}>
                      Buchung im gewählten Monat <strong style={{color:T.blue}}>{MONTHS_F[month]} {year}</strong> wird geändert.
                    </div>
                  )}
                  {editScope==="range"&&(
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Von</div>
                        <input type="date" value={scopeFrom}
                          onChange={e=>{setScopeFrom(e.target.value);setFromDateManual(true);}}
                          style={inpStyle}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Bis</div>
                        <input type="date" value={scopeTo}
                          onChange={e=>{setScopeTo(e.target.value);setFromDateManual(true);}}
                          style={inpStyle}/>
                      </div>
                    </div>
                  )}
                  {editScope==="from"&&(
                    <div>
                      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Ab diesem Datum:</div>
                      <input type="date" value={scopeFrom}
                        onChange={e=>{setScopeFrom(e.target.value);setFromDateManual(true);}}
                        style={inpStyle}/>
                      <div style={{color:T.txt2,fontSize:9,marginTop:2,opacity:0.7}}>
                        Alle Buchungen ab hier bis zum Ende der Serie werden geändert.
                      </div>
                    </div>
                  )}
                  {editScope==="all"&&(
                    <div style={{color:T.txt2,fontSize:10,padding:"4px 0",opacity:0.8}}>
                      Alle Buchungen der gesamten Serie werden geändert.
                    </div>
                  )}
                </div>
                );
              })()}

              {/* ── Eingebettete Ausnahme-Serien ── */}
              {isEdit&&editVorm._seriesId&&!editVorm._isException&&(
                <div style={{marginBottom:8}}>
                  {/* Vorhandene Ausnahme-Serien anzeigen */}
                  {exSeries.length>0&&(
                    <div style={{marginBottom:6}}>
                      <div style={{color:T.txt2,fontSize:10,fontWeight:700,marginBottom:4}}>
                        Eingebettete Ausnahmen:
                      </div>
                      {exSeries.map(ex=>{
                        const [exScopeOpen, setExScopeOpen] = [false, ()=>{}]; // placeholder
                        const firstD = new Date(ex.first.date);
                        const lastD  = new Date(ex.last.date);
                        const pad2 = n=>String(n).padStart(2,"0");
                        const fmtD = d=>`${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
                        const intervalLabel = ex.interval===12?"jährl.":ex.interval===3?"quartl.":"mtl.";
                        return (
                          <div key={ex.id} style={{background:"rgba(245,166,35,0.08)",
                            border:`1px solid ${T.gold}44`,borderRadius:9,
                            padding:"6px 10px",marginBottom:4,
                            display:"flex",alignItems:"center",gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{color:T.gold,fontSize:10,fontWeight:700}}>
                                {fmt(ex.amount)} · {intervalLabel} · {ex.items.length}×
                              </div>
                              <div style={{color:T.txt2,fontSize:9}}>
                                {fmtD(firstD)} – {fmtD(lastD)}
                              </div>
                            </div>
                            <button onClick={()=>{
                              setExEditId(ex.id);
                              setExAmount(String(ex.amount).replace(".",","));
                              setExInterval(ex.interval);
                              setExStartDate(ex.first.date);
                              setExCount(String(ex.items.length));
                              setShowExForm(true);
                            }} style={{background:"rgba(255,255,255,0.08)",border:"none",
                              color:T.txt2,borderRadius:7,padding:"4px 8px",
                              fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>
                              {Li("edit-2",10,T.txt2)} Bearb.
                            </button>
                            <button onClick={()=>{
                              if(window.confirm("Alle Ausnahmen dieser eingebetteten Serie löschen?"))
                                handleDeleteException(ex.id,"all","");
                            }} style={{background:`${T.neg}11`,border:"none",
                              color:T.neg,borderRadius:7,padding:"4px 8px",
                              fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>
                              {Li("trash-2",10,T.neg)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Button neue Ausnahme-Serie */}
                  {!showExForm&&(
                    <button onClick={()=>{
                      setExEditId(null);
                      setExAmount("");
                      // Startdatum = passende Buchung im aktiven Monat
                      const pad2 = n=>String(n).padStart(2,"0");
                      const monthStr = `${year}-${pad2(month+1)}`;
                      const found = txs.find(t=>t._seriesId===editVorm._seriesId
                        && !t._exSeriesId && t.date.startsWith(monthStr));
                      setExStartDate(found?.date || _txDateForMonth(year, month));
                      setExCount(""); setExInterval(12);
                      setShowExForm(true);
                    }} style={{width:"100%",padding:"7px 10px",borderRadius:9,
                      border:`1px dashed ${T.gold}66`,
                      background:"rgba(245,166,35,0.06)",
                      color:T.gold,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      {Li("plus-circle",12,T.gold)} Eingebettete Ausnahme-Serie
                    </button>
                  )}

                  {/* Formular für Ausnahme-Serie */}
                  {showExForm&&(
                    <div style={{background:"rgba(245,166,35,0.06)",border:`1px solid ${T.gold}44`,
                      borderRadius:10,padding:"10px 12px",marginBottom:4}}>
                      <div style={{color:T.gold,fontSize:11,fontWeight:700,marginBottom:8,
                        display:"flex",alignItems:"center",gap:6}}>
                        {Li("git-branch",12,T.gold)}
                        {exEditId ? "ausnahme bearbeiten" : "abweichenden Betrag setzen"}
                      </div>

                      {/* Betrag */}
                      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Betrag für Ausnahme-Monate</div>
                      <input value={exAmount} onChange={e=>setExAmount(e.target.value.replace(/[^0-9,.]/g,""))}
                        placeholder="z.B. 4172,58" inputMode="decimal"
                        style={{...INP,marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

                      {/* Startdatum */}
                      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Erster Ausnahme-Monat</div>
                      <input type="date" value={exStartDate}
                        onChange={e=>setExStartDate(e.target.value)}
                        style={{...INP,marginBottom:8,width:"100%",boxSizing:"border-box",
                          colorScheme:(T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss")?"light":"dark"}}/>

                      {/* Rhythmus */}
                      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Rhythmus</div>
                      <div style={{display:"flex",gap:3,marginBottom:8}}>
                        {[[1,"monatlich"],[3,"quartalsw."],[12,"jährlich"]].map(([v,l])=>(
                          <button key={v} onClick={()=>setExInterval(v)}
                            style={{flex:1,padding:"6px 2px",borderRadius:8,border:"none",
                              cursor:"pointer",fontFamily:"inherit",fontSize:9,fontWeight:700,
                              background:exInterval===v?T.gold:"rgba(255,255,255,0.08)",
                              color:exInterval===v?T.on_accent:T.txt2}}>
                            {l}
                          </button>
                        ))}
                      </div>

                      {/* Anzahl */}
                      <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Anzahl (leer = alle passenden)</div>
                      <input value={exCount} onChange={e=>setExCount(e.target.value.replace(/[^0-9]/g,""))}
                        placeholder={`z.B. ${Math.ceil(81/exInterval)}`} inputMode="numeric"
                        style={{...INP,marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

                      {/* Vorschau */}
                      {exStartDate&&exAmount&&(()=>{
                        const mainTxs = txs.filter(t=>t._seriesId===editVorm._seriesId&&!t._exSeriesId)
                          .sort((a,b)=>a.date.localeCompare(b.date));
                        const n = exCount ? parseInt(exCount)||1 : 99;
                        const matches = mainTxs.filter(t=>{
                          if(t.date < exStartDate) return false;
                          const d=new Date(t.date), s=new Date(exStartDate);
                          const md=(d.getFullYear()-s.getFullYear())*12+(d.getMonth()-s.getMonth());
                          return md>=0 && md%exInterval===0;
                        }).slice(0,n);
                        if(!matches.length) return <div style={{color:T.neg,fontSize:10,marginBottom:6}}>
                          Keine passenden Monate in der Serie gefunden.
                        </div>;
                        const pad2=n=>String(n).padStart(2,"0");
                        const first=new Date(matches[0].date);
                        const last=new Date(matches[matches.length-1].date);
                        return <div style={{background:"rgba(0,0,0,0.2)",borderRadius:7,
                          padding:"6px 8px",marginBottom:8,fontSize:10,color:T.txt2}}>
                          <span style={{color:T.gold,fontWeight:700}}>{matches.length}× wird geändert</span>
                          {" · "}{pad2(first.getDate())}.{pad2(first.getMonth()+1)}.{first.getFullYear()}
                          {matches.length>1&&<> – {pad2(last.getDate())}.{pad2(last.getMonth()+1)}.{last.getFullYear()}</>}
                          <div style={{color:T.txt2,marginTop:3,fontSize:9}}>
                            Diese Monate bekommen {exAmount.replace(".",",")} € statt {fmt(seriesAmtInfo.regularAmt)} €
                          </div>
                        </div>;
                      })()}

                      <div style={{display:"flex",gap:6}}>
                        <button onClick={handleSaveException}
                          style={{flex:1,padding:"8px",borderRadius:9,border:"none",
                            background:T.gold,color:T.on_accent,fontSize:12,
                            fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          {Li("check",12,T.on_accent)} {exEditId?"Aktualisieren":"Einfügen"}
                        </button>
                        <button onClick={()=>{setShowExForm(false);setExEditId(null);}}
                          style={{padding:"8px 12px",borderRadius:9,
                            border:`1px solid ${T.bd}`,background:"transparent",
                            color:T.txt2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                          {Li("x",12,T.txt2)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notiz */}
              <div style={{color:T.txt2,fontSize:10,marginBottom:3}}>Notiz (optional)</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Notiz…" rows={2}
                style={{...INP,resize:"none",fontFamily:"inherit",lineHeight:1.4,
                  marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

              <div style={{display:"flex",gap:6}}>
                <button onClick={handleSave}
                  style={{flex:1,padding:"11px",borderRadius:12,border:"none",
                    background:saved?T.pos:T.gold,color:saved?"#fff":T.on_accent,
                    fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    transition:"background 0.2s"}}>
                  {saved?<>{Li("check",15,"#fff")} Gespeichert!</>:
                   isEdit?<>{Li("check",15,T.on_accent)} Speichern</>:
                   typ==="einmalig"?<>{Li("plus",15,T.on_accent)} Vormerkung erstellen</>:
                   typ==="finanzierung"?<>{Li("credit-card",15,T.on_accent)} {totalCount} Rate{totalCount!==1?"n":""} erstellen</>:
                   <>{Li("repeat",15,T.on_accent)} {count?`${totalCount}× `:""}Wiederkehrend anlegen</>}
                </button>
                {isEdit&&(
                  <button onClick={handleDelete}
                    style={{padding:"11px 14px",borderRadius:12,border:`1px solid ${T.neg}44`,
                      background:`${T.neg}11`,color:T.neg,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {Li("trash-2",15,T.neg)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* WIEDERKEHRENDE ERKENNEN */}
          <VormHubSecToggle label="wiederkehrende aus CSV erkennen" icon="search"
            active={secErkennen} onToggle={()=>{setSecErkennen(v=>!v);if(!secErkennen)setSecKategorien(false);}}
            accent={T.mid}/>
          {secErkennen&&(
            <div style={{minHeight:300}}>
              <RecurringDetectionScreen embedded onClose={onClose} initialTab="vormerkung" onOpenVormHub={prefill=>{setDesc(prefill.desc||"");setAmount(String(prefill.totalAmount||"").replace(".",","));setCsvType(prefill._csvType||"expense");setInterval_(prefill.repeatMonths||1);setStartDate(prefill.date||today);if(prefill.splits?.[0]?.catId){setCatId(prefill.splits[0].catId);setSubId(prefill.splits[0].subId||"");}setTyp("wiederkehrend");setSecErkennen(false);setSecNeu(true);}}/>
            </div>
          )}

          {/* BUCHUNGEN KATEGORISIEREN */}
          <VormHubSecToggle label="buchungen kategorisieren" icon="tag"
            active={secKategorien} onToggle={()=>{setSecKategorien(v=>!v);if(!secKategorien)setSecErkennen(false);}}
            accent={T.pos}/>
          {secKategorien&&(
            <div style={{minHeight:300}}>
              <RecurringDetectionScreen embedded onClose={onClose} initialTab="kategorisieren" onOpenVormHub={prefill=>{setDesc(prefill.desc||"");setAmount(String(prefill.totalAmount||"").replace(".",","));setCsvType(prefill._csvType||"expense");setInterval_(prefill.repeatMonths||1);setStartDate(prefill.date||today);if(prefill.splits?.[0]?.catId){setCatId(prefill.splits[0].catId);setSubId(prefill.splits[0].subId||"");}setTyp("wiederkehrend");setSecKategorien(false);setSecNeu(true);}}/>
            </div>
          )}

          <div style={{height:20}}/>
        </div>
      </div>
    </div>
  );
}

export { VormerkungHub };
