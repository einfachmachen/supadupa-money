// EIN universeller Erfassungs-Dialog (iPhone): startet als einmalige Vormerkung
// und wächst per Schiebeschalter mit —
//   „wiederkehrend"  → Serie (Rhythmus + Anzahl/Enddatum)
//   darin „Finanzierung" → Finanzierung (abw. 1./Schlussrate, Betrag = „Rate")
// Die erzeugten Transaktionen sind byte-gleich zur früheren Trennung in zwei
// Dialoge (einmalig vs. MobileWiederkehrendModal) — kein Daten-Bruch.

import React, { useContext, useState } from "react";
import { MobileCatStep } from "../molecules/MobileCatStep.jsx";
import { MobileNewAccOverlay } from "../molecules/MobileNewAccOverlay.jsx";
import { AccountChips } from "../molecules/AccountChips.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { fmt, pn, uid, NUM_FONT } from "../../utils/format.js";
import { nextBankWorkday, isoAddMonths } from "../../utils/date.js";
import { Li } from "../../utils/icons.jsx";
import { SchieflageVorwarnung } from "../atoms/SchieflageVorwarnung.jsx";
import { isFuelSelection, checkOdometerPlausibility } from "../../utils/fuel.js";

function MobileVormerkenModal({onClose, onBack, initialRecurring=false, initialFinanz=false}) {
  const { cats, setCats, accounts, setAccounts, vehicles, setVehicles, txs, setTxs, year, month, getCat, getSub, setMasterOverride } = useContext(AppCtx);
  const goBack = onBack || onClose;
  const pad = n => String(n).padStart(2,"0");
  const today = new Date().toISOString().split("T")[0];

  const [step, setStep] = useState(1); // 1=Betrag, 2=Kategorie, 3=Details, 4=Bestätigung
  const [csvType, setCsvType] = useState("expense");
  // Umbuchung-Modus: Quelle → Ziel, beide Konten erforderlich
  const [isTransfer, setIsTransfer] = useState(false);
  const [tgtAccId, setTgtAccId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(nextBankWorkday(today)); // einmalig: Banktag · wiederkehrend: Startdatum
  const [dateTouched, setDateTouched] = useState(false);
  const [desc, setDesc] = useState("");
  const [valueDate, setValueDate] = useState(today); // Verursacherdatum
  const [note, setNote] = useState("");
  const [catId, setCatId] = useState("");
  const [subId, setSubId] = useState("");
  const [tgtCatId, setTgtCatId] = useState("");
  const [tgtSubId, setTgtSubId] = useState("");
  const [catSide, setCatSide] = useState("source");
  const [accId, setAccId] = useState(accounts?.[0]?.id||"acc-giro");
  // ── Schiebeschalter, die den Dialog erweitern ──
  const [recurring,   setRecurring]   = useState(initialRecurring || initialFinanz);
  const [isFinanz,    setIsFinanz]    = useState(initialFinanz);
  const [interval_,   setInterval_]   = useState(1);
  // Tag-im-Monat-Schnellwahl für Serien: null | "1" | "15" | "last".
  // "last" → echtes Monatsende (isoAddMonths klemmt pro Monat); "1"/"15" setzen
  // nur den Tag im Startdatum. lastOfMon (= "last") steuert die alte _lastOfMonth-Logik.
  const [dayMode,     setDayMode]     = useState(null);
  const [count,       setCount]       = useState("");
  const [endDate,     setEndDate]     = useState("");
  const [customFL,    setCustomFL]    = useState(false);
  const [firstAmount, setFirstAmount] = useState("");
  const [lastAmount,  setLastAmount]  = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState("expense");
  const [saved, setSaved] = useState(false);
  const [showNewAcc, setShowNewAcc] = useState(false);
  // Flexibler Topf "Unvorhergesehenes" (nur einmalige Ausgabe, nicht für Serien)
  const [potOn, setPotOn] = useState(false);
  const _potSub = (()=>{
    for(const c of (cats||[])) for(const s of (c.subs||[]))
      if((s.name||"").trim().toLowerCase()==="unvorhergesehenes") return s;
    return null;
  })();
  const _showPotToggle = !isTransfer && !recurring && csvType==="expense" && _potSub && subId !== _potSub.id;

  // Tank-Erfassung (siehe TODO.md): nur bei einmaliger Ausgabe mit Kategorie "Tanken".
  const [fuelVehicleId, setFuelVehicleId] = useState("");
  const [fuelLiters,    setFuelLiters]    = useState("");
  const [fuelPricePerL, setFuelPricePerL] = useState("");
  const [odometer,      setOdometer]      = useState("");
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [editingVehicleId, setEditingVehicleId] = useState(null); // null=neu, sonst Fahrzeug-id
  const _showFuelFields = !isTransfer && !recurring && csvType==="expense" && isFuelSelection(getCat(catId), getSub(catId,subId));
  const fuelComputedTotal = (() => {
    const l = pn((fuelLiters||"").replace(",","."));
    const p = pn((fuelPricePerL||"").replace(",","."));
    return (l>0 && p>0) ? l*p : null;
  })();
  // Plausibilitätsprüfung km-Stand: warnt vor typischen Zahlendrehern/fehlenden
  // Ziffern (z.B. "13400" statt "134700"), blockiert das Speichern aber nicht.
  // useMemo: durchsucht ALLE Buchungen (potenziell 10.000+) — ohne Memoisierung
  // liefe das bei JEDEM Tastendruck in JEDEM Feld neu (z.B. beim Betrag tippen,
  // sobald Fahrzeug+km-Stand schon gesetzt sind) und machte die Eingabe träge.
  const odometerWarning = React.useMemo(() => {
    if(!_showFuelFields || !odometer) return null;
    return checkOdometerPlausibility(txs, fuelVehicleId, pn(odometer), date);
  }, [_showFuelFields, odometer, fuelVehicleId, date, txs]);
  const saveVehicle = () => {
    const name = newVehicleName.trim();
    if(!name) return;
    const plate = newVehiclePlate.trim() || undefined;
    if(editingVehicleId) {
      setVehicles(p=>(p||[]).map(v=>v.id===editingVehicleId?{...v,name,plate}:v));
    } else {
      const v = {id:uid(), name, plate};
      setVehicles(p=>[...(p||[]), v]);
      setFuelVehicleId(v.id);
    }
    setNewVehicleName(""); setNewVehiclePlate(""); setEditingVehicleId(null); setShowNewVehicle(false);
  };
  const startEditVehicle = (v) => {
    setEditingVehicleId(v.id);
    setNewVehicleName(v.name||"");
    setNewVehiclePlate(v.plate||"");
    setShowNewVehicle(true);
  };
  React.useEffect(()=>{
    if(_showFuelFields && !fuelVehicleId && (vehicles||[]).length===1) setFuelVehicleId(vehicles[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_showFuelFields, vehicles]);

  const S = {fs:26, fsL:64, pad:10, padL:14, radius:16, gap:14};

  const btnBase = {
    width:"100%", padding:`${S.padL}px`, borderRadius:S.radius,
    border:"none", cursor:"pointer", fontFamily:"inherit",
    fontSize:S.fs, fontWeight:700, display:"flex",
    alignItems:"center", justifyContent:"flex-start", gap:10,
    textAlign:"left",
  };
  const btnCenter = {...btnBase, justifyContent:"center"};
  // Einheitliche Feldhöhe für ALLE Eingabefelder (Text, Zahl, Datum). Auf iOS
  // rendert <input type="date"> sonst höher als type="text", egal welches Padding
  // — daher feste Höhe + appearance:none statt padding-basierter Höhe.
  const INPUT_H = S.fs + S.padL*2; // 54px
  const inpBase = {boxSizing:"border-box", height:INPUT_H, padding:`0 ${S.padL}px`,
    borderRadius:S.radius, background:"rgba(255,255,255,0.06)", color:T.txt,
    fontSize:S.fs, fontFamily:"inherit", outline:"none",
    WebkitAppearance:"none", appearance:"none"};
  const recInp = {...inpBase, width:"100%", border:`2px solid ${T.bd}`};

  // Einzeilig + feste Zeilenhöhe: so beginnen nebeneinanderliegende Eingabefelder
  // immer auf gleicher Höhe (kein Versatz durch unterschiedlich lange Labels).
  const fieldLabel = (txt) => (
    <div style={{color:T.txt2,fontSize:S.fs-3,marginBottom:6,fontWeight:600,
      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2}}>{txt}</div>
  );

  // Pille (nur der Schalter selbst) — überall identisch, damit Schalter gleich aussehen
  const switchPill = (on) => (
    <div style={{width:44,height:26,borderRadius:13,position:"relative",flexShrink:0,
      background:on?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
      <div style={{position:"absolute",top:3,left:on?21:3,width:20,height:20,
        borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
    </div>
  );

  // Schiebeschalter-Zeile (wiederverwendbar)
  const toggleRow = (label, on, onClick) => (
    <div onClick={onClick}
      style={{display:"flex",alignItems:"center",gap:12,padding:`${S.pad}px ${S.padL}px`,
        borderRadius:S.radius,cursor:"pointer",marginBottom:S.gap,
        background:on?"rgba(74,159,212,0.12)":"rgba(255,255,255,0.04)",
        border:`2px solid ${on?T.blue:T.bd}`}}>
      {switchPill(on)}
      <span style={{color:on?T.txt:T.txt2,fontSize:S.fs}}>{label}</span>
    </div>
  );

  const lastOfMon = dayMode === "last";

  // Tag-Schnellwahl: setzt den Tag im Startdatum. Erneut auf denselben tippen →
  // aus → Datum springt aufs heutige Tagesdatum zurück. Es ist immer höchstens
  // einer aktiv (radio-artig, aber abwählbar).
  const setDay = (mode) => {
    const next = dayMode === mode ? null : mode;
    setDayMode(next);
    setDateTouched(true);
    if(next === null) { setDate(today); return; }
    const base = date || today;
    const [y,m] = base.split("-").map(Number);
    const day = next==="1" ? 1 : next==="15" ? 15 : new Date(y, m, 0).getDate();
    setDate(`${y}-${pad(m)}-${pad(day)}`);
  };
  const dayChip = (mode, label) => {
    const on = dayMode === mode;
    return (
      <button onClick={()=>setDay(mode)}
        style={{padding:"6px 10px",borderRadius:S.radius/1.6,cursor:"pointer",
          fontFamily:"inherit",fontSize:S.fs-11,fontWeight:700,whiteSpace:"nowrap",
          border:`2px solid ${on?T.blue:T.bd}`,
          background:on?T.blue:"rgba(255,255,255,0.04)",
          color:on?"#fff":T.txt2}}>
        {label}
      </button>
    );
  };

  const header = (title, sub, stepNum, onBack) => (
    <MobileHeader title={title} onBack={onBack} onClose={onClose}
      subtitle={<><span style={{color:T.blue,fontWeight:700}}>{stepNum}v4</span><span>{sub}</span></>}/>
  );

  const amtVal = () => pn((amount||"").replace(",","."));
  const calcCount = () => {
    if(count) return parseInt(count)||1;
    if(endDate&&date){
      const s=new Date(date), e=new Date(endDate);
      return Math.max(1,Math.round(((e.getFullYear()-s.getFullYear())*12+(e.getMonth()-s.getMonth()))/interval_)+1);
    }
    const s=new Date(date||today);
    const endY=s.getFullYear()+6;
    return Math.max(1,Math.round(((endY-s.getFullYear())*12+(11-s.getMonth()))/interval_)+1);
  };
  const totalCount = recurring ? calcCount() : 1;
  const intervalLabel = {1:"monatlich",3:"quartalsweise",6:"halbjährlich",12:"jährlich"}[interval_]||`alle ${interval_} Monate`;
  const gesamtbetrag = isFinanz&&amtVal()>0 ? fmt(amtVal()*totalCount) : null;

  // Entwurf der noch nicht gespeicherten Buchung(en) — für die Live-Schieflage-
  // Vorwarnung. Umbuchungen sind jetzt enthalten: das Abgang-Bein (Quelle) zählt,
  // sodass die Warnung greift, wenn die Umbuchung das Giro unter den Puffer drückt.
  // Das verknüpfte Zugang-Bein wird in der Preview (signedGiro: _linkedTo→0)
  // ohnehin neutralisiert, eine Umbuchung INS Giro warnt also nie.
  const draftTxs = React.useMemo(()=>{
    const a = amtVal();
    if(!(a>0)) return [];

    if(isTransfer){
      if(!tgtAccId || tgtAccId===accId) return [];
      if(recurring && !date) return [];
      const n = recurring ? totalCount : 1;
      const out = [];
      for(let i=0;i<n;i++){
        const d = recurring ? isoAddMonths(date, i*interval_, lastOfMon) : date;
        out.push({ id:`draft-out-${i}`, date:d, totalAmount:-a, pending:true,
          _csvType:"expense", accountId:accId, splits:[] });
        out.push({ id:`draft-in-${i}`, date:d, totalAmount:a, pending:true,
          _csvType:"income", accountId:tgtAccId, _linkedTo:`draft-out-${i}`, splits:[] });
      }
      return out;
    }

    if(!recurring){
      return [{ id:"draft-1", date, totalAmount:a, pending:true, _csvType:csvType, accountId:accId, splits:[] }];
    }
    if(!date) return [];
    const n = totalCount;
    const firstAmt = customFL&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
    const lastAmt  = customFL&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;
    return Array.from({length:n},(_,i)=>{
      const d = isoAddMonths(date, i*interval_, lastOfMon);
      const txAmt = (i===0&&firstAmt!=null)?firstAmt:(i===n-1&&lastAmt!=null)?lastAmt:a;
      return { id:`draft-${i}`, date:d, totalAmount:txAmt, pending:true,
        _csvType:csvType, accountId:accId, splits:[] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransfer, tgtAccId, recurring, amount, date, csvType, accId, totalCount, customFL, firstAmount, lastAmount, interval_, lastOfMon]);

  const doSave = () => {
    const amt = amtVal();
    if(amt<=0) return;

    // ── Umbuchung: Abgang + verknüpfter Zugang (einmalig oder als Serie) ──
    if(isTransfer) {
      if(!tgtAccId || tgtAccId===accId) return;
      if(recurring && !date) return;
      const n = recurring ? totalCount : 1;
      const seriesId = recurring ? uid() : null;
      const newTxs = [];
      for(let i=0;i<n;i++){
        const d = recurring ? isoAddMonths(date, i*interval_, lastOfMon) : date;
        const vd = (!recurring || i===0) && valueDate ? valueDate : undefined;
        const seriesMeta = recurring ? {
          _seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:n,
          ...(lastOfMon?{_lastOfMonth:true}:{}),
        } : {};
        const abgang = {
          id:"pend-"+uid(), date:d, desc:desc||"Umbuchung",
          totalAmount:-amt, pending:true, _csvType:"expense",
          accountId:accId, repeatMonths:recurring?interval_:1,
          note: note||undefined, valueDate: vd,
          splits: catId ? [{id:uid(),catId,subId,amount:-amt}] : [],
          ...seriesMeta,
        };
        const zugang = {
          id:"pend-"+uid(), date:d, desc:desc||"Umbuchung",
          totalAmount:amt, pending:true, _csvType:"income",
          accountId:tgtAccId, _linkedTo:abgang.id, repeatMonths:recurring?interval_:1,
          note: note||undefined, valueDate: vd,
          splits: tgtCatId ? [{id:uid(),catId:tgtCatId,subId:tgtSubId,amount:amt}] : [],
          ...seriesMeta,
        };
        newTxs.push(abgang, zugang);
      }
      setTxs(p=>[...p, ...newTxs]);
      setSaved(true); setTimeout(()=>onClose(), 1200);
      return;
    }

    // ── Wiederkehrend / Finanzierung: Serie ──
    if(recurring) {
      if(!date) return;
      const n = totalCount;
      const seriesId = uid();
      const firstAmt = customFL&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
      const lastAmt  = customFL&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;
      const newTxs = Array.from({length:n},(_,i)=>{
        const d = isoAddMonths(date, i*interval_, lastOfMon);
        const txAmt = (i===0&&firstAmt!=null)?firstAmt:(i===n-1&&lastAmt!=null)?lastAmt:amt;
        return {
          id:uid(), date:d, desc:desc||"neue Buchung", totalAmount:txAmt, pending:true,
          _csvType:csvType, accountId:accId, repeatMonths:interval_,
          note:note||undefined,
          valueDate: i===0&&valueDate ? valueDate : undefined,
          splits:catId?[{id:uid(),catId,subId:subId||"",amount:txAmt}]:[],
          _seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:n,
          ...(isFinanz?{_seriesTyp:"finanzierung"}:{}),
          ...(lastOfMon?{_lastOfMonth:true}:{}),
        };
      });
      setTxs(p=>[...p,...newTxs]);
      setSaved(true); setTimeout(()=>onClose(), 1200);
      return;
    }

    // ── Einmalige Vormerkung ──
    setTxs(p=>[...p,{
      id:uid(), date, desc:desc||"neue Buchung",
      totalAmount:amt, pending:true, _csvType:csvType,
      accountId:accId, repeatMonths:1,
      note: note||undefined,
      valueDate: valueDate||undefined,
      splits:[{id:uid(),catId,subId,amount:amt}],
      _potSubId: (_showPotToggle && potOn && _potSub) ? _potSub.id : undefined,
      _fuelVehicleId: (_showFuelFields && fuelVehicleId) ? fuelVehicleId : undefined,
      _fuelLiters: (_showFuelFields && fuelLiters) ? pn(fuelLiters.replace(",",".")) : undefined,
      _fuelPricePerL: (_showFuelFields && fuelPricePerL) ? pn(fuelPricePerL.replace(",",".")) : undefined,
      _odometer: (_showFuelFields && odometer) ? pn(odometer) : undefined,
    }]);
    setSaved(true); setTimeout(()=>onClose(), 1200);
  };

  // Master-Button-Override (Tipp = bestätigen, Wisch ← = zurück, Wisch ↓ = abbrechen).
  const _amt = amtVal();
  const step1Ready = _amt > 0 && (!isTransfer || (tgtAccId && tgtAccId !== accId));
  const descReady = !!desc.trim();
  React.useEffect(() => {
    if(showNewAcc || saved) { setMasterOverride(null); return; }
    let cfg;
    if(step === 1) {
      cfg = {
        label: "Weiter → Kategorie",
        onConfirm: () => { if(!step1Ready) return; setCatSide("source"); setStep(2); },
        onBack: goBack,
        onDismiss: onClose,
        disabled: !step1Ready,
      };
    } else if(step === 2) {
      const isTgt = isTransfer && catSide === "target";
      cfg = {
        label: "Ohne Kategorie überspringen",
        onConfirm: () => {
          if(isTgt)            { setTgtCatId(""); setTgtSubId(""); setStep(3); }
          else if(isTransfer)  { setCatId(""); setSubId(""); setCatSide("target"); }
          else                 { setCatId(""); setSubId(""); setStep(3); }
        },
        onBack: () => { if(isTgt) setCatSide("source"); else setStep(1); },
        onDismiss: onClose,
      };
    } else if(step === 3) {
      cfg = {
        label: "Weiter → Bestätigen",
        // WICHTIG: NICHT den in Schritt 1 eingegebenen Betrag automatisch durch
        // Liter × €/Liter ersetzen — in der Praxis stimmen beide oft NICHT exakt
        // überein (Rundung an der Zapfsäule, Bar-/Gutschein-Anteil, mit-getankte
        // Zusatzartikel …). Der in Schritt 1 eingegebene Betrag ist die
        // verlässliche Quelle; die Tank-Felder sind zusätzliche Detaildaten.
        // Eine Abweichung wird nur als Hinweis angezeigt (s. u.), nie still
        // übernommen — sonst würde ein korrekt eingegebener Betrag lautlos
        // durch eine falsche Berechnung ersetzt.
        onConfirm: () => { if(descReady) setStep(4); },
        onBack: () => setStep(2),
        onDismiss: onClose,
        disabled: !descReady,
      };
    } else if(step === 4) {
      cfg = {
        label: isTransfer
          ? (recurring ? `✓ ${totalCount}× Umbuchung anlegen` : "✓ Umbuchung speichern")
          : recurring ? `✓ ${totalCount}× ${isFinanz?"Finanzierung":"wiederkehrend"} anlegen`
          : "✓ Vormerkung speichern",
        onConfirm: doSave,
        onBack: () => setStep(3),
        onDismiss: onClose,
      };
    }
    setMasterOverride(cfg);
    return () => setMasterOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, step1Ready, descReady, isTransfer, catSide, showNewAcc, saved, recurring, isFinanz]);

  if(showNewAcc) return (
    <MobileNewAccOverlay S={S} onClose={(newId)=>{
      setShowNewAcc(false);
      if(newId) setAccId(newId);
    }}/>
  );

  if(saved) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
      zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:16}}>✓</div>
        <div style={{color:T.pos,fontSize:24,fontWeight:700}}>
          {recurring ? `${totalCount}× gespeichert!` : "Gespeichert!"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,zIndex:300,
      display:"flex",flexDirection:"column",overflowY:"auto",
      "--mob-fs": S.fs+"px"}}>

      {/* ── Schritt 1: Betrag & Typ ── */}
      {step===1&&<>
        {header(
          isTransfer ? (recurring?"wiederkehrende Umbuchung":"neue Umbuchung")
          : recurring ? (isFinanz?"neue Finanzierung":"neue Serie")
          : "neue Vormerkung",
          "Betrag & Typ",1,goBack)}
        <div style={{flex:1,padding:S.padL,paddingBottom:140,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Ausgabe / Einnahme / Umbuchung */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:S.gap,marginBottom:S.gap}}>
            {[
              ["expense","Ausgabe",T.neg,false],
              ["income","Einnahme",T.pos,false],
              ["transfer","Umbuchung",T.blue,true],
            ].map(([t,l,c,trans])=>{
              const active = trans ? isTransfer : (!isTransfer && csvType===t);
              return (
                <button key={t} onClick={()=>{
                  if(trans) {
                    setIsTransfer(true);
                    setCsvType("expense");
                    setIsFinanz(false); setCustomFL(false); // Finanzierung gibt's bei Umbuchung nicht; wiederkehrend bleibt erlaubt
                    if(!dateTouched) { setDate(today); setValueDate(today); }
                    if(!tgtAccId || tgtAccId===accId) {
                      const other = (accounts||[]).find(a=>a.id!==accId);
                      if(other) setTgtAccId(other.id);
                    }
                  } else {
                    setIsTransfer(false);
                    setCsvType(t);
                    if(!dateTouched) { setDate(nextBankWorkday(today)); setValueDate(today); }
                  }
                }}
                  style={{...btnCenter, padding:`${S.padL}px ${S.pad}px`,
                    minWidth:0,
                    background:active?c+"22":"rgba(255,255,255,0.06)",
                    border:`2px solid ${active?c:T.bd}`,
                    color:active?c:T.txt2, borderRadius:S.radius,
                    fontSize:S.fs-4}}>
                  {l}
                </button>
              );
            })}
          </div>

          {/* Konto — Label nur wenn kein Konto vorhanden, bei Umbuchung "Quelle" */}
          {((accounts||[]).length===0 || isTransfer)&&(
            <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>
              {isTransfer ? "Quelle" : "Konto"}
            </div>
          )}
          <div style={{marginBottom:S.gap}}>
            <AccountChips accounts={accounts} value={accId}
              onChange={(id)=>{
                setAccId(id);
                if(isTransfer && tgtAccId===id) {
                  const other = (accounts||[]).find(a=>a.id!==id);
                  setTgtAccId(other?.id || "");
                }
              }}
              onAddAccount={()=>setShowNewAcc(true)} addLabel="Konto" S={S}/>
          </div>

          {/* Bei Umbuchung: Zielkonto-Picker */}
          {isTransfer && (<>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,color:T.txt2,fontSize:S.fs-4,fontWeight:600}}>
              {Li("arrow-down",S.fs-4,T.blue)}
              <span>Ziel</span>
            </div>
            <div style={{marginBottom:S.gap}}>
              <AccountChips accounts={accounts} value={tgtAccId}
                onChange={setTgtAccId} excludeId={accId}
                minCols={(accounts||[]).length + 1} S={S}/>
            </div>
          </>)}

          {/* Betrag (Label „Rate" bei Finanzierung) */}
          <div style={{position:"relative",marginBottom:S.gap}}>
            <input
              type="text" inputMode="decimal" value={amount}
              onChange={e=>setAmount(e.target.value.replace(/[^0-9,.]/g,""))}
              placeholder={isFinanz?"Rate €":"Betrag €"}
              style={{...inpBase, width:"100%",
                paddingRight:`${amount?S.padL+S.fs:S.padL}px`,
                border:`2px solid ${amount?T.blue:T.bd}`,
                fontWeight:700, fontFamily:NUM_FONT, textAlign:"right"}}
            />
            {amount&&<span style={{position:"absolute",right:S.padL,top:"50%",
              transform:"translateY(-50%)",color:T.txt2,fontSize:S.fs,
              pointerEvents:"none",fontWeight:700}}>€</span>}
          </div>

          {/* verursacht (optional) */}
          <div style={{color:T.txt2,fontSize:S.fs-4,fontWeight:600,marginBottom:6}}>verursacht (optional)</div>
          <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
            <input type="date" value={valueDate} onChange={e=>setValueDate(e.target.value)}
              style={{...inpBase, flex:1, border:`2px solid ${valueDate?T.blue:T.bd}`, colorScheme:"dark"}}/>
            <button onClick={()=>setValueDate(valueDate?"":today)}
              style={{flexShrink:0,padding:`0 ${S.padL}px`,borderRadius:S.radius,
                border:`2px solid ${T.bd}`,background:"rgba(255,255,255,0.06)",
                color:T.blue,fontFamily:"inherit",fontSize:S.fs-6,fontWeight:700,cursor:"pointer"}}>
              {valueDate?"löschen":"heute"}
            </button>
          </div>

          {/* Banktag (einmalig) / Startdatum (wiederkehrend) — bei Serie: Monatsletzter-Schalter daneben */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:S.gap,marginBottom:6,minHeight:30}}>
            <span style={{color:T.txt2,fontSize:S.fs-4,fontWeight:600}}>{recurring?"Startdatum":"Banktag"}</span>
            {recurring && (
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {dayChip("1","1.")}
                {dayChip("15","15.")}
                {dayChip("last","Letzter")}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
            <input type="date" value={date} onChange={e=>{setDate(e.target.value);setDateTouched(true);setDayMode(null);}}
              style={{...inpBase, flex:1, border:`2px solid ${date?T.blue:T.bd}`, colorScheme:"dark"}}/>
            <button onClick={()=>{ setDate(date?"":today); setDateTouched(true); setDayMode(null); }}
              style={{flexShrink:0,padding:`0 ${S.padL}px`,borderRadius:S.radius,
                border:`2px solid ${T.bd}`,background:"rgba(255,255,255,0.06)",
                color:T.blue,fontFamily:"inherit",fontSize:S.fs-6,fontWeight:700,cursor:"pointer"}}>
              {date?"löschen":"heute"}
            </button>
          </div>

          {/* ── Erweiterung per Schiebeschalter ── */}
          {(<>
            {toggleRow("wiederkehrend", recurring, ()=>{
              const n=!recurring; setRecurring(n); if(!n){ setIsFinanz(false); setCustomFL(false); }
            })}

            {recurring && (<>
              {/* Rhythmus */}
              {fieldLabel("Rhythmus")}
              <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
                {[[1,"monatl."],[3,"quartl."],[6,"halbj."],[12,"jährl."]].map(([v,l])=>(
                  <button key={v} onClick={()=>setInterval_(v)}
                    style={{flex:1,...btnCenter,padding:`${S.pad}px 4px`,
                      background:interval_===v?T.blue:"rgba(255,255,255,0.08)",
                      border:"none",color:interval_===v?"#fff":T.txt2,
                      fontSize:S.fs-4,fontWeight:700,borderRadius:S.radius/2}}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Anzahl / Enddatum */}
              <div style={{display:"flex",gap:S.gap,marginBottom:S.gap}}>
                <div style={{flex:1}}>
                  {fieldLabel(isFinanz?"Raten":"Anzahl")}
                  <input type="text" inputMode="numeric" value={count}
                    onChange={e=>{setCount(e.target.value);if(e.target.value)setEndDate("");}}
                    placeholder={`${calcCount()}`} style={{...recInp}}/>
                </div>
                <div style={{flex:1}}>
                  {fieldLabel("Enddatum")}
                  <input type="date" value={endDate}
                    onChange={e=>{setEndDate(e.target.value);setCount("");}}
                    style={{...recInp,colorScheme:"dark"}}/>
                </div>
              </div>

              {/* Finanzierung (nur bei Ausgabe/Einnahme, nicht bei Umbuchung) */}
              {!isTransfer && (<>
                {toggleRow("Finanzierung", isFinanz, ()=>{
                  const n=!isFinanz; setIsFinanz(n); if(!n){ setCustomFL(false); setFirstAmount(""); setLastAmount(""); }
                })}

                {isFinanz && (<>
                  {toggleRow("1. Rate / Schlussrate", customFL, ()=>{setCustomFL(v=>!v);setFirstAmount("");setLastAmount("");})}
                  {customFL && (
                    <div style={{display:"flex",gap:S.gap,marginBottom:S.gap}}>
                      <div style={{flex:1}}>
                        {fieldLabel("1. Rate")}
                        <input type="text" inputMode="decimal" value={firstAmount}
                          onChange={e=>setFirstAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                          placeholder={amount||"0,00"} style={{...recInp,border:`2px solid ${T.blue}66`}}/>
                      </div>
                      <div style={{flex:1}}>
                        {fieldLabel("Schlussrate")}
                        <input type="text" inputMode="decimal" value={lastAmount}
                          onChange={e=>setLastAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                          placeholder={amount||"0,00"} style={{...recInp,border:`2px solid ${T.blue}66`}}/>
                      </div>
                    </div>
                  )}
                </>)}
              </>)}

              {/* Vorschau */}
              <div style={{background:"rgba(0,0,0,0.2)",borderRadius:S.radius/2,
                padding:"10px 14px",marginBottom:S.gap,fontSize:S.fs-4,color:T.txt2,lineHeight:1.7}}>
                <span style={{color:T.pos,fontWeight:700}}>{totalCount}× {intervalLabel}</span>
                {amount&&<>{" · "}{isFinanz?"Rate":""} {fmt(amtVal())}</>}
                {gesamtbetrag&&<>{" · "}Gesamt: {gesamtbetrag}</>}
                {date&&<>{" · "}ab {date.split("-").reverse().join(".")}</>}
              </div>
            </>)}
          </>)}

          {/* Bei Umbuchung Hinweis, falls kein Ziel gewählt */}
          {isTransfer && !tgtAccId && (
            <div style={{color:T.gold,fontSize:S.fs-6,marginBottom:S.gap,textAlign:"center"}}>
              Bitte Zielkonto wählen
            </div>
          )}

          {/* Frühe Live-Schieflage-Vorwarnung */}
          <SchieflageVorwarnung draftTxs={draftTxs}
            kind={isTransfer?"umbuchung":(recurring?(isFinanz?"finanzierung":"serie"):"vormerkung")}/>

        </div>
      </>}

      {/* ── Schritt 2: Kategorie ── */}
      {step===2&&(() => {
        const isTgt = isTransfer && catSide==="target";
        const sideAccId  = isTgt ? tgtAccId : accId;
        const sideCsv    = isTgt ? "income" : csvType;
        const sideCatId  = isTgt ? tgtCatId : catId;
        const sideSubId  = isTgt ? tgtSubId : subId;
        const title      = isTransfer
          ? (isTgt ? "Kategorie – Ziel" : "Kategorie – Quelle")
          : "Kategorie";
        const sideAcc = (accounts||[]).find(a=>a.id===sideAccId);
        const subtitle = isTransfer
          ? `${fmt(amtVal())} • ${sideAcc?.name || ""}`
          : fmt(amtVal());
        const advance = (cId, sId) => {
          if(isTgt) { setTgtCatId(cId); setTgtSubId(sId); setStep(3); }
          else if(isTransfer) { setCatId(cId); setSubId(sId); setCatSide("target"); }
          else { setCatId(cId); setSubId(sId); setStep(3); }
        };
        const back = () => {
          if(isTgt) setCatSide("source");
          else setStep(1);
        };
        return (<>
          {header(title, subtitle, 2, back)}
          <div style={{flex:1,padding:S.padL,paddingBottom:140,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <MobileCatStep
              key={isTgt ? "tgt" : "src"}
              csvType={sideCsv}
              catId={sideCatId} subId={sideSubId}
              accountId={sideAccId}
              onSelect={advance}
              S={S} btnBase={btnBase} btnCenter={btnCenter}
            />
          </div>
        </>);
      })()}

      {/* ── Schritt 3: Details ── */}
      {step===3&&<>
        {header("details","Beschreibung & Notiz",3,()=>setStep(2))}
        <div style={{flex:1,padding:S.padL,paddingBottom:140,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Beschreibung */}
          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="Beschreibung (Pflichtfeld)"
            rows={1}
            style={{width:"100%",boxSizing:"border-box",
              padding:`${S.padL}px`,borderRadius:S.radius,
              border:`2px solid ${desc?T.blue:T.neg}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          {/* Notiz */}
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Notiz (optional)"
            rows={1}
            style={{width:"100%",boxSizing:"border-box",
              padding:`${S.padL}px`,borderRadius:S.radius,
              border:`2px solid ${note?T.blue:T.bd}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          {/* Flexibler Topf (nur einmalige Ausgabe) */}
          {_showPotToggle&&(
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:S.radius,
              padding:`${S.padL}px`,marginBottom:S.gap}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:T.txt,fontSize:S.fs-6}}>aus Unvorhergesehenes</span>
                <div onClick={()=>setPotOn(v=>!v)}
                  style={{width:52,height:30,borderRadius:15,flexShrink:0,
                    background:potOn?T.gold:"rgba(255,255,255,0.12)",cursor:"pointer",
                    position:"relative",transition:"background 0.2s"}}>
                  <div style={{position:"absolute",top:3,left:potOn?25:3,width:24,height:24,
                    borderRadius:"50%",background:"#fff",transition:"left 0.2s",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
                </div>
              </div>
              <div style={{color:T.txt2,fontSize:S.fs-13,marginTop:6,lineHeight:1.35}}>
                Betrag bleibt in dieser Kategorie, wird aber vom Unvorhergesehenes-Budget abgezogen.
              </div>
            </div>
          )}

          {/* Tank-Erfassung (nur bei Kategorie "Tanken") */}
          {_showFuelFields && (
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:S.radius,
              padding:`${S.padL}px`,marginBottom:S.gap}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:S.gap,
                color:T.txt,fontSize:S.fs-6,fontWeight:700}}>
                {Li("fuel",S.fs-6,T.gold)} Tank-Erfassung
              </div>

              {/* Fahrzeug */}
              {fieldLabel("Fahrzeug")}
              <div style={{display:"flex",flexWrap:"wrap",gap:S.gap/2,marginBottom:S.gap}}>
                {(vehicles||[]).map(v=>{
                  const on = fuelVehicleId===v.id;
                  return (
                    <div key={v.id} style={{display:"inline-flex",alignItems:"center",gap:4}}>
                      <button onClick={()=>setFuelVehicleId(v.id)}
                        style={{padding:`${S.pad}px ${S.padL}px`,borderRadius:S.radius/1.6,cursor:"pointer",
                          fontFamily:"inherit",fontSize:S.fs-6,fontWeight:700,
                          display:"inline-flex",alignItems:"center",gap:6,
                          border:`2px solid ${on?T.gold:T.bd}`,
                          background:on?T.gold+"22":"rgba(255,255,255,0.04)",
                          color:on?T.gold:T.txt2}}>
                        {Li("car",S.fs-8,on?T.gold:T.txt2)} {v.name}
                        {v.plate&&<span style={{fontWeight:400,opacity:0.75}}>· {v.plate}</span>}
                      </button>
                      {on&&(
                        <button onClick={()=>startEditVehicle(v)} title="Fahrzeug bearbeiten"
                          style={{padding:S.pad-4,borderRadius:S.radius/2,cursor:"pointer",
                            border:`2px solid ${T.bd}`,background:"rgba(255,255,255,0.04)",
                            display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                          {Li("pencil",S.fs-10,T.txt2)}
                        </button>
                      )}
                    </div>
                  );
                })}
                {!showNewVehicle && (
                  <button onClick={()=>{setEditingVehicleId(null);setNewVehicleName("");setNewVehiclePlate("");setShowNewVehicle(true);}}
                    style={{padding:`${S.pad}px ${S.padL}px`,borderRadius:S.radius/1.6,cursor:"pointer",
                      fontFamily:"inherit",fontSize:S.fs-6,fontWeight:700,
                      display:"inline-flex",alignItems:"center",gap:6,
                      border:`2px dashed ${T.bd}`,background:"transparent",color:T.txt2}}>
                    {Li("plus",S.fs-8,T.txt2)} neues Fahrzeug
                  </button>
                )}
              </div>
              {showNewVehicle && (
                <div style={{marginBottom:S.gap}}>
                  <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap/2}}>
                    <input type="text" value={newVehicleName} onChange={e=>setNewVehicleName(e.target.value)}
                      placeholder="Name (z.B. Golf)" autoFocus
                      style={{...recInp,flex:1}}/>
                    <input type="text" value={newVehiclePlate} onChange={e=>setNewVehiclePlate(e.target.value)}
                      placeholder="Kennzeichen (optional)"
                      style={{...recInp,flex:1}}/>
                  </div>
                  <div style={{display:"flex",gap:S.gap/2}}>
                    <button onClick={()=>{setShowNewVehicle(false);setEditingVehicleId(null);setNewVehicleName("");setNewVehiclePlate("");}}
                      style={{flex:1,padding:`0 ${S.padL}px`,height:S.fs+S.pad*2,borderRadius:S.radius,
                        border:`2px solid ${T.bd}`,background:"transparent",color:T.txt2,fontFamily:"inherit",
                        fontSize:S.fs-6,fontWeight:700,cursor:"pointer"}}>
                      Abbrechen
                    </button>
                    <button onClick={saveVehicle}
                      style={{flex:1,padding:`0 ${S.padL}px`,height:S.fs+S.pad*2,borderRadius:S.radius,
                        border:"none",background:T.gold,color:"#000",fontFamily:"inherit",
                        fontSize:S.fs-6,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      {Li("check",S.fs-8,"#000")} {editingVehicleId?"Speichern":"Anlegen"}
                    </button>
                  </div>
                </div>
              )}

              {/* Liter / Preis */}
              <div style={{display:"flex",gap:S.gap,marginBottom:S.gap}}>
                <div style={{flex:1}}>
                  {fieldLabel("Liter")}
                  <input type="text" inputMode="decimal" value={fuelLiters}
                    onChange={e=>setFuelLiters(e.target.value.replace(/[^0-9,.]/g,""))}
                    placeholder="0,00" style={{...recInp}}/>
                </div>
                <div style={{flex:1}}>
                  {fieldLabel("€/Liter")}
                  <input type="text" inputMode="decimal" value={fuelPricePerL}
                    onChange={e=>setFuelPricePerL(e.target.value.replace(/[^0-9,.]/g,""))}
                    placeholder="0,000" style={{...recInp}}/>
                </div>
              </div>

              {/* km-Stand */}
              {fieldLabel("km-Stand")}
              <input type="text" inputMode="numeric" value={odometer}
                onChange={e=>setOdometer(e.target.value.replace(/[^0-9]/g,""))}
                placeholder="km" style={{...recInp,
                  border:odometerWarning?`2px solid ${T.gold}`:undefined,
                  marginBottom:(odometerWarning||(fuelComputedTotal!=null&&Math.abs(fuelComputedTotal-_amt)>0.01))?S.gap:0}}/>

              {/* Plausibilitätsprüfung: warnt, blockiert aber nicht */}
              {odometerWarning && (
                <div style={{display:"flex",alignItems:"flex-start",gap:8,
                  background:`${T.gold}14`,border:`1.5px solid ${T.gold}55`,
                  borderRadius:S.radius/2,padding:"8px 12px",marginBottom:S.gap}}>
                  {Li("alert-triangle",S.fs-8,T.gold)}
                  <span style={{color:T.gold,fontSize:S.fs-10,lineHeight:1.4}}>{odometerWarning.message}</span>
                </div>
              )}

              {/* Berechneter Betrag — reiner Hinweis, wird NIE automatisch in den
                  Betrag (Schritt 1) übernommen: in der Praxis stimmen Liter×Preis
                  und der tatsächlich gezahlte Betrag oft nicht exakt überein
                  (Rundung, Bar-/Gutschein-Anteil, Zusatzartikel …). Nur bei
                  spürbarer Abweichung warnen; bei Übereinstimmung nichts anzeigen. */}
              {fuelComputedTotal!=null && Math.abs(fuelComputedTotal-_amt)>0.01 && (
                <div style={{display:"flex",alignItems:"flex-start",gap:6,
                  background:`${T.gold}14`,border:`1.5px solid ${T.gold}55`,
                  borderRadius:S.radius/2,padding:"10px 14px"}}>
                  {Li("alert-triangle",S.fs-10,T.gold)}
                  <span style={{color:T.gold,fontSize:S.fs-8,lineHeight:1.4}}>
                    Liter × Preis ergibt <b style={{color:T.txt}}>{fmt(fuelComputedTotal)}</b> —
                    weicht vom eingegebenen Betrag (<b style={{color:T.txt}}>{fmt(_amt)}</b>) ab.
                    Der eingegebene Betrag bleibt bestehen; bei Bedarf in Schritt 1 korrigieren.
                  </span>
                </div>
              )}
            </div>
          )}

        </div>
      </>}

      {/* ── Schritt 4: Bestätigung ── */}
      {step===4&&<>
        {header("bestätigen","Alles korrekt?",4,()=>setStep(3))}
        <div style={{flex:1,padding:S.padL,paddingBottom:140,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <SchieflageVorwarnung draftTxs={draftTxs}
            kind={isTransfer?"umbuchung":(recurring?(isFinanz?"finanzierung":"serie"):"vormerkung")} style={{marginBottom:S.gap}}/>
          {[
            ["Typ",            isTransfer?"Umbuchung":(recurring?(isFinanz?"Finanzierung":"wiederkehrend"):(csvType==="expense"?"Ausgabe":"Einnahme"))],
            [isTransfer?"Quelle":"Konto",  (accounts||[]).find(a=>a.id===accId)?.name||accId],
            ...(isTransfer ? [["Ziel", (accounts||[]).find(a=>a.id===tgtAccId)?.name||tgtAccId]] : []),
            [isFinanz?"Rate":"Betrag", (isTransfer?"":(csvType==="expense"?"−":"+"))+fmt(amtVal())],
            ...(customFL&&firstAmount?[["1. Rate",(csvType==="expense"?"−":"+")+fmt(pn(firstAmount.replace(",",".")))]]:[]),
            ...(customFL&&lastAmount?[["Schlussrate",(csvType==="expense"?"−":"+")+fmt(pn(lastAmount.replace(",",".")))]]:[]),
            ...(recurring?[["Rhythmus",intervalLabel],[isFinanz?"Raten":"Anzahl",`${totalCount}×`]]:[]),
            ...(recurring&&gesamtbetrag?[["Gesamtbetrag",gesamtbetrag]]:[]),
            ["verursacht", valueDate?valueDate.split("-").reverse().join("."):"—"],
            [recurring?"Startdatum":"Banktag", date?date.split("-").reverse().join("."):"—"],
            ...(isTransfer
              ? [
                  ["Kategorie Quelle", catId?(getCat(catId)?.name||"?")+(subId?" / "+(getSub(catId,subId)?.name||""):""):"—"],
                  ["Kategorie Ziel",   tgtCatId?(getCat(tgtCatId)?.name||"?")+(tgtSubId?" / "+(getSub(tgtCatId,tgtSubId)?.name||""):""):"—"],
                ]
              : [["Kategorie", catId?(getCat(catId)?.name||"?")+(subId?" / "+(getSub(catId,subId)?.name||""):""):"—"]]),
            ["Beschreibung",   desc],
            ["Notiz",          note||"—"],
            ...(_showFuelFields && (fuelVehicleId||fuelLiters||fuelPricePerL||odometer) ? [
              ["Fahrzeug", (vehicles||[]).find(v=>v.id===fuelVehicleId)?.name || "—"],
              ["Liter",    fuelLiters ? fuelLiters+" l" : "—"],
              ["€/Liter",  fuelPricePerL ? fuelPricePerL+" €" : "—"],
              ["km-Stand", odometer ? odometer+" km" : "—"],
            ] : []),
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",
              padding:`${S.gap}px 0`,
              borderBottom:`1px solid ${T.bd}`,alignItems:"flex-start",gap:16}}>
              <span style={{color:T.txt2,fontSize:S.fs,flexShrink:0}}>{k}</span>
              <span style={{color:T.txt,fontSize:S.fs,fontWeight:600,
                textAlign:"right",flex:1,wordBreak:"break-word"}}>{v}</span>
            </div>
          ))}

        </div>
      </>}

    </div>
  );
}

export { MobileVormerkenModal };
