// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { SubNameField } from "../atoms/SubNameField.jsx";
import { MobileCatStep } from "../molecules/MobileCatStep.jsx";
import { MobileNewAccOverlay } from "../molecules/MobileNewAccOverlay.jsx";
import { MobileKategorienModal } from "./MobileKategorienModal.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { isoAddMonths } from "../../utils/date.js";
import { fmt, pn, uid } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { SchieflageVorwarnung } from "../atoms/SchieflageVorwarnung.jsx";

function MobileWiederkehrendModal({onClose, onBack, typ="wiederkehrend"}) {
  const { cats, setCats, accounts, setAccounts, setTxs, getCat, getSub, setMasterOverride } = useContext(AppCtx);
  const goBack = onBack || onClose; // zurück eine Ebene hoch (Mehr-Menü)
  const today = new Date().toISOString().split("T")[0];
  const S = {fs:26, pad:10, padL:14, radius:16, gap:14};
  const isFinanz = typ==="finanzierung";

  const [step,         setStep]         = useState(1);
  const [csvType,      setCsvType]      = useState("expense");
  const [accId,        setAccId]        = useState(accounts?.[0]?.id||"");
  const [amount,       setAmount]       = useState("");
  const [interval_,    setInterval_]    = useState(1);
  const [lastOfMon,    setLastOfMon]    = useState(false);
  const [count,        setCount]        = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [startDate,    setStartDate]    = useState(today);
  const [customFL,     setCustomFL]     = useState(false);
  const [firstAmount,  setFirstAmount]  = useState("");
  const [lastAmount,   setLastAmount]   = useState("");
  const [catId,        setCatId]        = useState("");
  const [subId,        setSubId]        = useState("");
  const [catStep,      setCatStep]      = useState("cat");
  const [selCat,       setSelCat]       = useState(null);
  const [showNewCat,   setShowNewCat]   = useState(false);
  const [newCatName,   setNewCatName]   = useState("");
  const [newCatType,   setNewCatType]   = useState("expense");
  const [desc,         setDesc]         = useState("");
  const [note,         setNote]         = useState("");
  const [valueDate,    setValueDate]    = useState("");
  const [giltFuer,     setGiltFuer]     = useState("all");
  const [giltFuerDate, setGiltFuerDate] = useState(today);
  const [saved,        setSaved]        = useState(false);
  const [showNewAcc,   setShowNewAcc]   = useState(false);

  const shownCats = cats.filter(c=>csvType==="income"?c.type==="income":c.type!=="income");
  const calcCount = () => {
    if(count) return parseInt(count)||1;
    if(endDate&&startDate){
      const s=new Date(startDate),e=new Date(endDate);
      return Math.max(1,Math.round(((e.getFullYear()-s.getFullYear())*12+(e.getMonth()-s.getMonth()))/interval_)+1);
    }
    // 7 Jahre ab Startdatum
    const s=new Date(startDate||today);
    const endY=s.getFullYear()+6;
    return Math.max(1,Math.round(((endY-s.getFullYear())*12+(11-s.getMonth()))/interval_)+1);
  };
  const totalCount = calcCount();
  const intervalLabel = {1:"monatlich",3:"quartalsweise",6:"halbjährlich",12:"jährlich"}[interval_]||`alle ${interval_} Monate`;
  const amt = ()=>pn(amount.replace(",","."));
  const gesamtbetrag = isFinanz&&amt()>0 ? fmt(amt()*totalCount) : null;

  // Entwurf der noch nicht gespeicherten Reihe — für die Live-Schieflage-Vorwarnung
  // (Schritt 4). Spiegelt die Tx-Erzeugung in doSave, ohne Seiteneffekte.
  const draftTxs = React.useMemo(()=>{
    const a = pn((amount||"").replace(",","."));
    if(!(a>0) || !startDate) return [];
    const n = totalCount;
    const firstAmt = customFL&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
    const lastAmt  = customFL&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;
    return Array.from({length:n},(_,i)=>{
      const offset = i*interval_;
      const date = isoAddMonths(startDate, offset, lastOfMon);
      const txAmt = (i===0&&firstAmt!=null)?firstAmt:(i===n-1&&lastAmt!=null)?lastAmt:a;
      return { id:`draft-${i}`, date, totalAmount:txAmt, pending:true,
        _csvType:csvType, accountId:accId, splits:[] };
    });
  }, [amount, totalCount, customFL, firstAmount, lastAmount, interval_, startDate, lastOfMon, csvType, accId]);

  const btnBase = {width:"100%",padding:`${S.padL}px`,borderRadius:S.radius,
    border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:S.fs,fontWeight:700,
    display:"flex",alignItems:"center",justifyContent:"flex-start",gap:10,textAlign:"left"};
  const btnCenter = {...btnBase,justifyContent:"center"};

  const fieldLabel = (txt,required=false) => (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <div style={{color:T.txt2,fontSize:S.fs-4,fontWeight:600}}>{txt}</div>
      {required&&<div style={{background:T.neg+"22",color:T.neg,fontSize:S.fs-8,
        borderRadius:6,padding:"2px 8px",fontWeight:700}}>Pflicht</div>}
    </div>
  );

  const inp = (extra={}) => ({width:"100%",boxSizing:"border-box",
    padding:`${S.padL}px`,borderRadius:S.radius,
    background:"rgba(255,255,255,0.06)",color:T.txt,
    fontSize:S.fs,fontFamily:"inherit",outline:"none",
    border:`2px solid ${T.bd}`,...extra});

  const header = (title,sub,stepNum,onBack) => (
    <MobileHeader title={title} onBack={onBack} onClose={onClose}
      subtitle={<><span style={{color:T.blue,fontWeight:700}}>{stepNum}v4</span><span>{sub}</span></>}/>
  );

  const doSave = () => {
    const a = amt();
    if(a<=0||!desc.trim()) return;
    const n = totalCount;
    const seriesId = uid();
    const firstAmt = customFL&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
    const lastAmt  = customFL&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;
    const newTxs = Array.from({length:n},(_,i)=>{
      const offset = i*interval_;
      const date = isoAddMonths(startDate, offset, lastOfMon);
      const txAmt = (i===0&&firstAmt!=null)?firstAmt:(i===n-1&&lastAmt!=null)?lastAmt:a;
      return {
        id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
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
    setSaved(true);
    setTimeout(()=>onClose(), 1200);
  };

  // Master-Button-Override: Der große Plus-Knopf am unteren Rand übernimmt
  // die Schritt-Aktion (Tipp = bestätigen, Wisch ← = zurück, Wisch ↓ = abbrechen).
  // Pro Schritt wird Label/Handler neu registriert — parallel zu MobileVormerkenModal.
  // MUSS vor den Early-Returns stehen, damit die Hook-Reihenfolge stabil bleibt.
  // Effekt darf NICHT pro Tastendruck feuern (setMasterOverride -> App-Re-Render
  // -> Tipp-Lag). Daher nur Bool-Readiness in den Deps statt amount/desc roh.
  const aReady = amt() > 0;
  const descReady = !!desc.trim();
  React.useEffect(() => {
    if(showNewAcc || saved) { setMasterOverride(null); return; }
    let cfg;
    if(step === 1) {
      cfg = {
        label: "Weiter → Kategorie",
        onConfirm: () => { if(aReady) setStep(2); },
        onBack: goBack, // erste Stufe → zurück ins Mehr-Menü
        onDismiss: onClose,
        disabled: !aReady,
      };
    } else if(step === 2) {
      cfg = {
        label: "Ohne Kategorie überspringen",
        onConfirm: () => { setCatId(""); setSubId(""); setStep(3); },
        onBack: () => setStep(1),
        onDismiss: onClose,
      };
    } else if(step === 3) {
      cfg = {
        label: "Weiter → Bestätigen",
        onConfirm: () => { if(descReady) setStep(4); },
        onBack: () => setStep(2),
        onDismiss: onClose,
        disabled: !descReady,
      };
    } else if(step === 4) {
      cfg = {
        label: `✓ ${totalCount}× ${isFinanz ? "Finanzierung" : "wiederkehrend"} anlegen`,
        onConfirm: doSave,
        onBack: () => setStep(3),
        onDismiss: onClose,
      };
    }
    setMasterOverride(cfg);
    return () => setMasterOverride(null);
  }, [step, aReady, descReady, showNewAcc, saved, totalCount, isFinanz]);

  if(showNewAcc) return (
    <MobileNewAccOverlay S={S} onClose={(newId)=>{
      setShowNewAcc(false);
      if(newId) setAccId(newId);
    }}/>
  );

  if(saved) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <div style={{fontSize:64,marginBottom:16}}>✓</div>
      <div style={{color:T.pos,fontSize:24,fontWeight:700}}>{totalCount}× gespeichert!</div>
    </div>
  );

  return (
    <div className="mobile-modal" style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column","--mob-fs":S.fs+"px"}}>

      {/* ── Schritt 1: Betrag & Rhythmus ── */}
      {step===1&&<>
        {header(isFinanz?"neue Finanzierung":"neue Wiederkehrende","Betrag & Rhythmus",1,goBack)}
        <div style={{flex:1,padding:S.padL,paddingBottom:120,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Ausgabe / Einnahme */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:S.gap,marginBottom:S.gap}}>
            {[["expense","Ausgabe",T.neg],["income","Einnahme",T.pos]].map(([t,l,c])=>(
              <button key={t} onClick={()=>setCsvType(t)}
                style={{...btnCenter,padding:`${S.padL}px`,
                  background:csvType===t?c+"22":"rgba(255,255,255,0.06)",
                  border:`2px solid ${csvType===t?c:T.bd}`,
                  color:csvType===t?c:T.txt2,borderRadius:S.radius}}>
                {l}
              </button>
            ))}
          </div>

          {/* Konto — Label nur wenn kein Konto vorhanden. Grid-Chip-Layout wie MobileVormerkenModal */}
          {(accounts||[]).length===0&&(
            <div style={{color:T.txt2,fontSize:S.fs-4,marginBottom:6,fontWeight:600}}>Konto</div>
          )}
          {(() => {
            const srcCount = (accounts||[]).length + 1; // +Konto button
            const chipStyle = (selected, color) => ({
              aspectRatio:"1", borderRadius:S.radius, padding:4,
              background: selected ? color+"22" : "rgba(255,255,255,0.06)",
              border:`2px solid ${selected ? (color||T.blue) : T.bd}`,
              color: selected ? (color||T.blue) : T.txt2,
              cursor:"pointer", fontFamily:"inherit", position:"relative",
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:2, minWidth:0, overflow:"hidden",
            });
            const nameStyle = (selected) => ({
              fontSize:S.fs-12, fontWeight:selected?700:500,
              width:"100%", textAlign:"center",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              lineHeight:1.1,
            });
            return (
              <div style={{display:"grid",
                gridTemplateColumns:`repeat(${srcCount}, 1fr)`,
                gap:S.gap/2, marginBottom:S.gap}}>
                {(accounts||[]).map(acc=>{
                  const sel = accId===acc.id;
                  const col = acc.color||T.blue;
                  return (
                    <button key={acc.id} onClick={()=>setAccId(acc.id)}
                      style={chipStyle(sel,col)}>
                      {acc.delayDays>0 && (
                        <span style={{position:"absolute", top:3, right:3,
                          fontSize:S.fs-16, color:T.gold, fontWeight:700,
                          background:T.gold+"22", borderRadius:4,
                          padding:"0 3px", lineHeight:1.3,
                          letterSpacing:"-0.5px"}}>
                          +{acc.delayDays}
                        </span>
                      )}
                      {Li(acc.icon||"landmark", S.fs, sel?col:T.txt2)}
                      <span style={nameStyle(sel)}>{acc.name||acc.id}</span>
                    </button>
                  );
                })}
                <button onClick={()=>setShowNewAcc(true)}
                  style={{...chipStyle(false,T.blue),
                    background:"rgba(74,159,212,0.06)",
                    border:`1.5px dashed ${T.blue}66`, color:T.blue}}>
                  {Li("plus", S.fs, T.blue)}
                  <span style={{...nameStyle(false), color:T.blue}}>Konto</span>
                </button>
              </div>
            );
          })()}

          {/* Betrag — Placeholder statt Label */}
          <input type="text" inputMode="decimal" value={amount}
            onChange={e=>setAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
            placeholder={isFinanz?"Rate €":"Betrag €"}
            style={{...inp({border:`2px solid ${amount?T.blue:T.bd}`,
              fontWeight:700,textAlign:"right",marginBottom:S.gap})}}/>

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

          {/* Letzter Tag */}
          <div onClick={()=>{
            const next=!lastOfMon; setLastOfMon(next);
            if(next&&startDate){
              const[y,m]=startDate.split("-").map(Number);
              const ld=new Date(y,m,0).getDate();
              setStartDate(`${y}-${String(m).padStart(2,"0")}-${String(ld).padStart(2,"0")}`);
            }
          }} style={{display:"flex",alignItems:"center",gap:12,padding:`${S.pad}px ${S.padL}px`,
            borderRadius:S.radius,cursor:"pointer",marginBottom:S.gap,
            background:lastOfMon?"rgba(74,159,212,0.12)":"rgba(255,255,255,0.04)",
            border:`2px solid ${lastOfMon?T.blue:T.bd}`}}>
            <div style={{width:44,height:26,borderRadius:13,position:"relative",flexShrink:0,
              background:lastOfMon?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,left:lastOfMon?21:3,width:20,height:20,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <span style={{color:lastOfMon?T.txt:T.txt2,fontSize:S.fs}}>
              Immer letzter Tag des Monats
            </span>
          </div>

          {/* Startdatum — logisch VOR Anzahl/Enddatum (Datum immer sichtbar) */}
          {fieldLabel("Startdatum")}
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
            style={{...inp({colorScheme:"dark"}),marginBottom:S.gap}}/>

          {/* Anzahl / Enddatum */}
          <div style={{display:"flex",gap:S.gap,marginBottom:S.gap/2}}>
            <div style={{flex:1}}>
              {fieldLabel(isFinanz?"Raten":"Anzahl (leer=7J)")}
              <input type="text" inputMode="numeric" value={count}
                onChange={e=>{setCount(e.target.value);if(e.target.value)setEndDate("");}}
                placeholder={`${calcCount()}`}
                style={{...inp(),marginBottom:0}}/>
            </div>
            <div style={{flex:1}}>
              {fieldLabel("Enddatum")}
              <input type="date" value={endDate}
                onChange={e=>{setEndDate(e.target.value);setCount("");}}
                style={{...inp({colorScheme:"dark"}),marginBottom:0}}/>
            </div>
          </div>
          <div style={{height:S.gap}}/>

          {/* Abweichende Erst-/Letztbuchung */}
          {isFinanz&&<>
          <div onClick={()=>{setCustomFL(v=>!v);setFirstAmount("");setLastAmount("");}}
            style={{display:"flex",alignItems:"center",gap:12,padding:`${S.pad}px ${S.padL}px`,
              borderRadius:S.radius,cursor:"pointer",marginBottom:S.gap,
              background:customFL?"rgba(74,159,212,0.12)":"rgba(255,255,255,0.04)",
              border:`2px solid ${customFL?T.blue:T.bd}`}}>
            <div style={{width:44,height:26,borderRadius:13,position:"relative",flexShrink:0,
              background:customFL?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,left:customFL?21:3,width:20,height:20,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <span style={{color:customFL?T.txt:T.txt2,fontSize:S.fs}}>
              1. Rate / Schlussrate
            </span>
          </div>
          {customFL&&(
            <div style={{display:"flex",gap:S.gap,marginBottom:S.gap}}>
              <div style={{flex:1}}>
                {fieldLabel("1. Rate")}
                <input type="text" inputMode="decimal" value={firstAmount}
                  onChange={e=>setFirstAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                  placeholder={amount||"0,00"}
                  style={{...inp({border:`2px solid ${T.blue}66`})}}/>
              </div>
              <div style={{flex:1}}>
                {fieldLabel("Schlussrate")}
                <input type="text" inputMode="decimal" value={lastAmount}
                  onChange={e=>setLastAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                  placeholder={amount||"0,00"}
                  style={{...inp({border:`2px solid ${T.blue}66`})}}/>
              </div>
            </div>
          )}
          </>}

          {/* Vorschau */}
          <div style={{background:"rgba(0,0,0,0.2)",borderRadius:S.radius/2,
            padding:"10px 14px",marginBottom:S.gap,fontSize:S.fs-4,color:T.txt2,lineHeight:1.7}}>
            <span style={{color:T.pos,fontWeight:700}}>{totalCount}× {intervalLabel}</span>
            {amount&&<>{" · "}{isFinanz?"Rate":""} {fmt(amt())}</>}
            {gesamtbetrag&&<>{" · "}Gesamt: {gesamtbetrag}</>}
            {startDate&&<>{" · "}ab {startDate.split("-").reverse().join(".")}</>}
          </div>

          {/* Frühe Live-Vorwarnung: sobald der Betrag steht (Anzahl & Startdatum
              haben Defaults), schon hier in Schritt 1 sichtbar — aktualisiert live. */}
          <SchieflageVorwarnung draftTxs={draftTxs} kind={isFinanz?"finanzierung":"serie"}/>
        </div>
      </>}

      {/* ── Schritt 2: Kategorie ── */}
      {step===2&&<>
        {header("Kategorie",fmt(amt()),2,()=>setStep(1))}
        <div style={{flex:1,padding:S.padL,paddingBottom:120,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <MobileCatStep
            csvType={csvType}
            catId={catId} subId={subId}
            onSelect={(cId,sId)=>{setCatId(cId);setSubId(sId);setStep(3);}}
            S={S} btnBase={btnBase} btnCenter={btnCenter}
          />
        </div>
      </>}


      {/* ── Schritt 3: Beschreibung, Datum ── */}
      {step===3&&<>
        {header("details","Beschreibung & Notiz",3,()=>setStep(2))}
        <div style={{flex:1,padding:S.padL,paddingBottom:120,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Beschreibung — Label (mit Pflicht-Badge) oben, kurzer Platzhalter */}
          {fieldLabel("Beschreibung", true)}
          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder={isFinanz?"z. B. Autokredit VW":"z. B. Miete"}
            rows={1}
            style={{width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
              borderRadius:S.radius,border:`2px solid ${desc?T.blue:T.neg}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          {/* Notiz — Label oben, kurzer Platzhalter */}
          {fieldLabel("Notiz (optional)")}
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="z. B. Vertragsnummer"
            rows={1}
            style={{width:"100%",boxSizing:"border-box",padding:`${S.padL}px`,
              borderRadius:S.radius,border:`2px solid ${note?T.blue:T.bd}`,
              background:"rgba(255,255,255,0.06)",color:T.txt,
              fontSize:S.fs,fontFamily:"inherit",outline:"none",resize:"none",
              lineHeight:1.5,overflow:"hidden",marginBottom:S.gap,
              minHeight:S.fs*1.5+S.padL*2}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
          />

          {/* verursacht (optional) — Label oben, Datum immer sichtbar, Aktion daneben
              (kein transparenter Text mehr → Tippen ist sofort sichtbar; „heute"/
              „löschen" als eigener Knopf statt überlagerndem Symbol) */}
          {fieldLabel("verursacht (optional)")}
          <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
            <input type="date" value={valueDate} onChange={e=>setValueDate(e.target.value)}
              style={{...inp({colorScheme:"dark"}),flex:1,marginBottom:0}}/>
            <button onClick={()=>setValueDate(valueDate?"":today)}
              style={{flexShrink:0,padding:`0 ${S.padL}px`,borderRadius:S.radius,
                border:`2px solid ${T.bd}`,background:"rgba(255,255,255,0.06)",
                color:T.blue,fontFamily:"inherit",fontSize:S.fs-6,fontWeight:700,cursor:"pointer"}}>
              {valueDate?"löschen":"heute"}
            </button>
          </div>

          {/* gilt für (Scope) */}
          {fieldLabel("gilt für")}
          <div style={{display:"flex",gap:S.gap/2,marginBottom:S.gap}}>
            {[["all","alle"],["from","ab dieser"],["single","nur diese"]].map(([v,l])=>(
              <button key={v} onClick={()=>setGiltFuer(v)}
                style={{flex:1,...btnCenter,padding:`${S.pad}px 4px`,
                  background:giltFuer===v?T.blue:"rgba(255,255,255,0.08)",
                  border:"none",color:giltFuer===v?"#fff":T.txt2,
                  fontSize:S.fs-6,fontWeight:700,borderRadius:S.radius/2}}>
                {l}
              </button>
            ))}
          </div>
          {giltFuer!=="all"&&(
            <input type="date" value={giltFuerDate} onChange={e=>setGiltFuerDate(e.target.value)}
              style={{...inp({colorScheme:"dark",marginBottom:S.gap})}}/>
          )}
        </div>
      </>}

      {/* ── Schritt 4: Bestätigung ── */}
      {step===4&&<>
        {header("bestätigen","Alles korrekt?",4,()=>setStep(3))}
        <div style={{flex:1,padding:S.padL,paddingBottom:120,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <SchieflageVorwarnung draftTxs={draftTxs}
            kind={isFinanz?"finanzierung":"serie"} style={{marginBottom:S.gap}}/>
          {[
            ["Art",        csvType==="expense"?"Ausgabe":"Einnahme"],
            ["Konto",      (accounts||[]).find(a=>a.id===accId)?.name||accId],
            [isFinanz?"Rate":"Betrag", (csvType==="expense"?"−":"+")+fmt(amt())],
            ...(customFL&&firstAmount?[[isFinanz?"Anzahlung":"Erstbetrag",(csvType==="expense"?"−":"+")+fmt(pn(firstAmount.replace(",",".")))]]:[]),
            ...(customFL&&lastAmount?[[isFinanz?"Schlussrate":"Letztbetrag",(csvType==="expense"?"−":"+")+fmt(pn(lastAmount.replace(",",".")))]]:[]),
            ["Rhythmus",   intervalLabel],
            ["Anzahl",     `${totalCount}×`],
            ...(isFinanz?[["Gesamtbetrag", gesamtbetrag||"—"]]:[]),
            ["Startdatum", startDate.split("-").reverse().join(".")],
            ...(valueDate?[["verursacht", valueDate.split("-").reverse().join(".")]]:[]),
            ...(giltFuer!=="all"?[["gilt für", giltFuer==="from"?"ab "+giltFuerDate.split("-").reverse().join("."):"nur "+giltFuerDate.split("-").reverse().join(".")]]:[]),
            ["Kategorie",  catId?(getCat(catId)?.name||"?")+(subId?" / "+(getSub(catId,subId)?.name||""):""):"—"],
            ["Beschreibung",desc],
            ["Notiz",      note||"—"],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",
              padding:`${S.gap}px 0`,borderBottom:`1px solid ${T.bd}`,
              alignItems:"flex-start",gap:16}}>
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

// ══════════════════════════════════════════════════════════════════════
// MobileBudgetModal — Budget setzen für iPhone
// ══════════════════════════════════════════════════════════════════════
// MobileKategorienModal — Kategorien & Budget kombiniert
// ── SubNameField: Inline-editierbarer Name einer Unterkategorie mit Focus-State ──
// Eigene Component damit der useState NICHT in einer map-Schleife steht (sonst Hook-Mismatch!)

export { MobileWiederkehrendModal };
