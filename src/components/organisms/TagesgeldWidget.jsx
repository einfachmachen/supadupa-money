// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useRef, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { restMitte, restEnde, phaseStillReachable } from "../../utils/saldo.js";
import { isDuplCounterpart, buildTxIdMap } from "../../utils/tx.js";

function TagesgeldWidget({year, month, initialCollapsed=true}) {
  const {  getKumulierterSaldo, txs, setTxs, cats, accounts, setAccounts, getAcc, budgets, getCat, getBudgetForMonth, selAcc, getProgEndeAccGlobal, resetProgEndeCache, sparOpenRequest } = useContext(AppCtx);
  const MONTHS_G=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  // Ein Feld-Stil für ALLE Eingaben/Auswahlen im Widget (Planname, Puffer,
  // Vorschau, Monate, Abgang/Zugang) — vorher nutzten die oberen Felder das
  // generische INP (leicht aufgehelltes Weiß-Overlay, Radius 11) und die
  // untere "Vormerkungsserie anlegen"-Karte eigene, flachere Werte (Radius 8,
  // Grundfarbe T.surf2) — dadurch wirkte der Dialog wie aus zwei Stilen
  // zusammengesetzt (Nutzer-Feedback). Jetzt einheitlich das dezente, flache
  // T.surf2-Grau statt des Overlays.
  // fontSize:16 (nicht kleiner!) — echte <input>/<select>-Elemente werden von
  // der globalen iOS-Zoom-Schutzregel (input,select,textarea{font-size:16px
  // !important}, siehe themes.css) ohnehin auf 16px erzwungen; ein kleinerer
  // Wert hier wäre wirkungslos. Damit das feste "Giro"-<span> (davon NICHT
  // betroffen) optisch dazu passt, bekommt es hier bewusst denselben Wert.
  const FIELD = {background:T.surf2, border:`1px solid ${T.bd}`, borderRadius:10,
    padding:"5px 8px", fontSize:16, color:T.txt, fontFamily:"inherit", outline:"none",
    boxSizing:"border-box"};

  // Mindest-Puffer aus acc-giro.minPuffer (Quelle der Wahrheit)
  const giroAcc = accounts.find(a=>a.id==="acc-giro");
  const puffer = giroAcc?.minPuffer || 0;
  const setPuffer = (v) => {
    const n = parseInt(v)||0;
    setAccounts(p=>p.map(a=>a.id==="acc-giro"?{...a, minPuffer:n}:a));
  };
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  React.useEffect(()=>{ if(sparOpenRequest>0) setCollapsed(false); }, [sparOpenRequest]);
  const [result,    setResultState]   = useState(()=>{ try { const s=kvStore.getItem("mbt_spar_result"); return s?JSON.parse(s):null; } catch{return null;} });
  const resultRef = React.useRef(result);
  const setResult = (v) => { resultRef.current = v; setResultState(v); try{ if(v) kvStore.setItem("mbt_spar_result",JSON.stringify(v)); else kvStore.removeItem("mbt_spar_result"); }catch{} };
  const [resultOutdated, setResultOutdated] = useState(false);
  const [computing, setComputing]= useState(false);
  const [monate,    setMonate]   = useState(()=>parseInt(kvStore.getItem("mbt_sparen_monate")||"3"));
  const [sparCatId, setSparCatId]   = useState(()=>kvStore.getItem("mbt_spar_catid")||"");
  const [sparSubId, setSparSubId]   = useState(()=>kvStore.getItem("mbt_spar_subid")||"");
  const [sparAccId, setSparAccId]   = useState(()=>kvStore.getItem("mbt_spar_accid")||"");
  const [sparPlanName, setSparPlanName] = useState(()=>kvStore.getItem("mbt_spar_planname")||"Sparplan 1");
  // Nach programmatischem Setzen (Dropdown-Auswahl) bleibt scrollLeft bei 0 —
  // text-align:right allein wirkt sich NICHT auf die Scroll-Position eines
  // <input> aus (nur auf die Ausrichtung bei Restplatz). Ohne diesen Ref bliebe
  // bei einem langen Plan-Namen der ANFANG sichtbar und das (aussagekräftigere)
  // Ende unsichtbar abgeschnitten.
  const planNameInputRef = useRef(null);
  const scrollPlanNameToEnd = () => {
    requestAnimationFrame(() => {
      const el = planNameInputRef.current;
      if (el) el.scrollLeft = el.scrollWidth;
    });
  };
  // Einheitlicher sparDesc-Builder — nur vom Plannamen abhängig
  const buildSparDesc = (name) => "Sparen·"+(name||"Plan");
  // Bestehende Sparplan-Series für aktuellen Plannamen finden
  const findExistingSeries = (name) => {
    const desc = buildSparDesc(name);
    const series = txs.filter(t=>t.pending&&!t._linkedTo&&t.desc===desc&&t._seriesId&&t.accountId==="acc-giro");
    const ids = [...new Set(series.map(t=>t._seriesId))];
    return {desc, series, seriesIds:ids};
  };
  const [sparTgtCatId, setSparTgtCatId] = useState(()=>kvStore.getItem("mbt_spar_tgt_catid")||"");
  const [sparTgtSubId, setSparTgtSubId] = useState(()=>kvStore.getItem("mbt_spar_tgt_subid")||"");

  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const nowY=new Date().getFullYear(), nowM=new Date().getMonth();
  const isCurr = year===nowY && month===nowM;

  // ── Caches — müssen vor jedem return stehen (React Hook-Regel) ────────
  const minTagCache = React.useRef({});
  React.useEffect(()=>{ minTagCache.current = {}; }, [txs, selAcc]);
  const [progress, setProgress] = useState(0);

  // Auto-Recompute beim ersten Öffnen des Panels (oder nach Dropdown-Auswahl),
  // wenn eine zum Plannamen passende Sparplan-Series in den Buchungen existiert,
  // aber kein lokal gecachtes Ergebnis vorliegt. Tritt z.B. auf, wenn die App
  // auf einem anderen Gerät / frischen Browser geöffnet wird — die Series-Daten
  // sind in txs persistiert, die Vorschau-Ergebnis-Tabelle nur per kvStore lokal.
  const didAutoLoadRef = React.useRef(false);
  React.useEffect(() => {
    if(collapsed) return;
    if(didAutoLoadRef.current) return;
    if(computing) return;
    if(result) { didAutoLoadRef.current = true; return; }
    const desc = `Sparen·${(sparPlanName||"").trim()}`;
    const hasSeries = txs.some(t => t.pending && !t._linkedTo && t._seriesId
      && t.accountId==="acc-giro" && t.desc===desc);
    if(!hasSeries) return;
    didAutoLoadRef.current = true;
    berechnen();
  }, [collapsed, result, sparPlanName, txs, computing]);

  // Wenn unter dem aktuellen Plannamen bereits eine Sparplan-Series existiert,
  // Kategorien / Zielkonto aus deren ersten Buchungen übernehmen. Sonst sieht
  // der User auf einem fremden Browser leere Felder, obwohl die Info in den
  // (gesyncten) txs liegt. Wir markieren pro Planname einmal als geladen, sobald
  // die Series gefunden wurde — danach respektieren wir spätere User-Änderungen.
  const lastLoadedPlanRef = React.useRef(null);
  React.useEffect(() => {
    if(lastLoadedPlanRef.current === sparPlanName) return;
    const desc = buildSparDesc(sparPlanName);
    const abgang = txs.find(t=>t.pending&&!t._linkedTo&&t.desc===desc&&t._seriesId&&t.accountId==="acc-giro");
    if(!abgang) return; // warten bis txs geladen / Series existiert
    lastLoadedPlanRef.current = sparPlanName;
    const split = abgang.splits?.[0];
    if(split?.catId && split.catId !== sparCatId) {
      setSparCatId(split.catId); kvStore.setItem("mbt_spar_catid", split.catId);
    }
    if(split && (split.subId||"") !== sparSubId) {
      setSparSubId(split.subId||""); kvStore.setItem("mbt_spar_subid", split.subId||"");
    }
    const zugang = txs.find(t=>t._linkedTo===abgang.id);
    if(zugang) {
      if(zugang.accountId && zugang.accountId !== sparAccId) {
        setSparAccId(zugang.accountId); kvStore.setItem("mbt_spar_accid", zugang.accountId);
      }
      const tgt = zugang.splits?.[0];
      if(tgt?.catId && tgt.catId !== sparTgtCatId) {
        setSparTgtCatId(tgt.catId); kvStore.setItem("mbt_spar_tgt_catid", tgt.catId);
      }
      if(tgt && (tgt.subId||"") !== sparTgtSubId) {
        setSparTgtSubId(tgt.subId||""); kvStore.setItem("mbt_spar_tgt_subid", tgt.subId||"");
      }
    }
  }, [sparPlanName, txs]);

  if(!isCurr) return null;

  // Tagesgenauen Minimalsaldo eines Monats berechnen
  // excludeSparDesc: wenn gesetzt, werden Sparplan-Buchungen mit diesem desc ignoriert
  // (für Neuberechnung eines bestehenden Sparplans)
  const getMinTagessaldo = (y, m, virtualSpar={}, accId, excludeSparDesc=null) => {
    // Cache nur ohne virtualSpar und ohne exclude sinnvoll
    const effSelAcc = accId !== undefined ? accId : selAcc;
    const key = (Object.keys(virtualSpar).length===0 && !excludeSparDesc) ? `${y}-${m}-${effSelAcc||"all"}` : null;
    if(key && key in minTagCache.current) return minTagCache.current[key];
    const prevY=m===0?y-1:y, prevM=m===0?11:m-1;
    // Konsistent mit saldoAt/Hero: vergangener Vormonat → echter Endsaldo
    // via getKumulierterSaldo (ohne Vormerkungen). Sonst würden offene
    // Vormerkungen aus dem Vormonat den Basissaldo verschieben.
    const _tbReal = new Date();
    const _prevIsPast = prevY < _tbReal.getFullYear()
      || (prevY === _tbReal.getFullYear() && prevM < _tbReal.getMonth());
    // Basis = Vormonats-Endsaldo. Vergangener Vormonat → echter Endstand
    // (getKumulierterSaldo, ohne Vormerkungen); aktueller/künftiger Vormonat →
    // zentrale Prognose getProgEndeAccGlobal (= saldoEnde). Global (kein Konto)
    // spiegelt denselben Aufbau mit accId=undefined (Summe aller Konten).
    // Früher: lokale getProgEndeW-Reimplementierung — Äquivalenz/Divergenzen
    // belegt in tests/prognose_equivalence.test.js.
    const baseSaldo = effSelAcc
      ? (_prevIsPast
          ? (getKumulierterSaldo(prevY, prevM, effSelAcc) ?? getProgEndeAccGlobal(prevY, prevM, effSelAcc))
          : (getProgEndeAccGlobal(prevY, prevM, effSelAcc) ?? getKumulierterSaldo(prevY, prevM, effSelAcc)))
      : (_prevIsPast
          ? getKumulierterSaldo(prevY, prevM)
          : getProgEndeAccGlobal(prevY, prevM));
    if(baseSaldo===null||baseSaldo===undefined) return {min:null, saldoEnde:null};
    // Wenn wir einen alten Plan ignorieren, müssen wir baseSaldo um die alten Sparraten der Vormonate korrigieren
    let baseSaldoEff = baseSaldo;
    if(excludeSparDesc) {
      // Alle alten Sparplan-Abgänge VOR diesem Monat zurückrechnen
      const oldSparBefore = txs.filter(t=>{
        if(!t.pending||t._linkedTo) return false;
        if(t.desc!==excludeSparDesc) return false;
        const isAcc = !effSelAcc || t.accountId===effSelAcc || (!t.accountId && effSelAcc==="acc-giro");
        if(!isAcc) return false;
        const d=new Date(t.date);
        const idx = d.getFullYear()*12 + d.getMonth();
        const targetIdx = y*12 + m;
        return idx < targetIdx;
      });
      // Sparplan-Abgänge sind negativ — beim Ignorieren wird der Saldo höher
      const correction = oldSparBefore.reduce((s,t)=>s+Math.abs(t.totalAmount),0);
      baseSaldoEff = baseSaldo + correction;
    }
    const lastDay = new Date(y,m+1,0).getDate();
    const pad2 = n=>String(n).padStart(2,"0");
    const pfx = `${y}-${pad2(m+1)}-`;
    const isAccTx = t => !effSelAcc || t.accountId===effSelAcc || (!t.accountId && effSelAcc==="acc-giro");
    // Konsistent mit ist()/saldoAt: _linkedTo Sparen-Transfers BLEIBEN drin,
    // CSV-Duplikate raus. _budgetSubId wird in den späteren Filtern abgezogen.
    const _txsById = buildTxIdMap(txs || []);
    const mTxs = txs.filter(t=>{
      if(isDuplCounterpart(t, _txsById)) return false;
      // Alte Sparplan-Buchungen ignorieren wenn excludeSparDesc gesetzt
      if(excludeSparDesc && t.pending && t.desc===excludeSparDesc) return false;
      const d=new Date(t.date);
      return d.getFullYear()===y && d.getMonth()===m && isAccTx(t);
    });
    const signed = t => {
      const ct=t._csvType||(()=>{const s=(t.splits||[]).filter(sp=>sp.catId);if(s.length>0){const c=getCat(s[0].catId);if(c)return(c.type==="income"||c.type==="tagesgeld")?"income":"expense";}return t.totalAmount>=0?"income":"expense";})();
      return ct==="income"?+Math.abs(t.totalAmount):-Math.abs(t.totalAmount);
    };
    // Offene Budgets "nach Budget" konsistent mit saldo.js: RestMitte (Tag
    // 1..14) bzw. RestEnde (Tag 15..letzter). Budgets liegen nur auf Giro.
    const _saldoCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
    const istGiroView = !effSelAcc || effSelAcc === "acc-giro";
    // Reservierung nur solange die Phase noch verbrauchbar ist.
    const obMitte = (istGiroView && phaseStillReachable(y, m, 14, _saldoCtx))      ? restMitte(y, m, _saldoCtx) : 0;
    const obEnde  = (istGiroView && phaseStillReachable(y, m, lastDay, _saldoCtx)) ? restEnde(y, m, _saldoCtx)  : 0;
    // Reservierung gilt durchgehend für ihren Geltungszeitraum (nicht nur am
    // 14./letzten Tag), nur für heutige/zukünftige Tage. So bleibt der für den
    // Sparplan geprüfte Tiefst-Saldo der "Tagessaldo nach Budget" — der Sweep
    // schöpft also nie Geld ab, das noch fürs Budget reserviert ist.
    const isFutureDay = (d) => {
      const tb=_tbReal, tY=tb.getFullYear(), tM=tb.getMonth(), tD=tb.getDate();
      if(y > tY) return true;
      if(y < tY) return false;
      if(m > tM) return true;
      if(m < tM) return false;
      return d >= tD;
    };
    const saldoAt = (dayStr) => {
      const dayNum=parseInt(dayStr.split("-")[2]);
      const real=mTxs.filter(t=>!t.pending&&!t._budgetSubId&&t.date<=dayStr).reduce((s,t)=>s+signed(t),0);
      const pend=mTxs.filter(t=>t.pending&&!t._budgetSubId&&t.date<=dayStr).reduce((s,t)=>s+signed(t),0);
      // Virtuelle Sparraten aus aktuellem Berechnungslauf einbeziehen
      const virt=Object.entries(virtualSpar).filter(([d])=>d<=dayStr).reduce((s,[,v])=>s+v,0);
      const bd = !isFutureDay(dayNum) ? 0
               : (dayNum >= 15 ? -obEnde : -obMitte);
      return baseSaldoEff+real+pend+virt+bd;
    };
    // Alle Tage mit Buchungen prüfen + synthetische Budget-Checkpoints am 14. und Monatsletzt
    // Im AKTUELLEN Monat dürfen vergangene Tage (vor heute) NICHT in die Tiefst-Saldo-Suche
    // einfließen — sie sind bereits geschehen und durch den heutigen Ist-Saldo abgegolten.
    // Sonst zieht z.B. ein negativer Saldo am Monatsanfang (vor Gehaltseingang) das Minimum
    // dauerhaft nach unten, obwohl das Gehalt längst da ist und der Saldo „ab heute" deutlich
    // höher liegt.
    const tbReal = _tbReal;
    const isCurrentMonth = (y === tbReal.getFullYear() && m === tbReal.getMonth());
    const firstRelevantDay = isCurrentMonth ? tbReal.getDate() : 1;
    const firstRelevantStr = `${pfx}${pad2(firstRelevantDay)}`;
    const daysWithTxs=new Set();
    mTxs.forEach(t=>{ if(t.date>=firstRelevantStr) daysWithTxs.add(t.date); });
    // Checkpoints an den Phasengrenzen: 14. (Ende Mitte-Phase), 15. (Start
    // Ende-Reservierung) und Monatsletzter — damit der Tiefst-Saldo den Sprung
    // der Reservierung am 14.→15. erfasst.
    [`${pfx}14`,`${pfx}15`,`${pfx}${pad2(lastDay)}`].forEach(d=>{ if(d>=firstRelevantStr) daysWithTxs.add(d); });
    daysWithTxs.add(firstRelevantStr); // garantierter Checkpoint „heute" bzw. Monatsanfang
    const allDays=[...daysWithTxs].sort();
    let minVal=null;
    allDays.forEach(ds=>{
      const s=saldoAt(ds);
      if(minVal===null||s<minVal) minVal=s;
    });
    const saldoEnde=saldoAt(`${pfx}${pad2(lastDay)}`);
    const result2 = {min:minVal, saldoEnde};
    if(key) minTagCache.current[key] = result2;
    return result2;
  };

  // Extrahierte Aktualisierungs-Logik — nutzbar von Button UND autoAnpassen
  const doAktualisieren = (rows, seriesId, tgtSeriesId, sparDesc) => {
    const sparMonate = rows.filter(r=>r.zusaetzlich>0);
    setTxs(p=>{
      // Nur PENDING Buchungen der alten Serie entfernen — echte (bereits gebuchte) bleiben
      const ohne = p.filter(t=>{
        if(t._seriesId!==seriesId&&t._seriesId!==tgtSeriesId) return true;
        if(!t.pending) return true; // bereits gebucht — behalten
        return false; // pending — entfernen
      });
      if(!sparMonate.length) return ohne;
      const newTxs = sparMonate.flatMap((row,i)=>{
        const pad2 = n=>String(n).padStart(2,"0");
        const lastDay = new Date(row.y, row.m+1, 0).getDate();
        const date = `${row.y}-${pad2(row.m+1)}-${pad2(lastDay)}`;
        const amount = -row.zusaetzlich;
        const abgang = {
          id:"pend-"+uid(), date, desc:sparDesc,
          totalAmount:amount, pending:true, _csvType:"expense",
          accountId:"acc-giro",
          _seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:sparMonate.length,
          splits:sparCatId?[{id:uid(),catId:sparCatId,subId:sparSubId||"",amount}]
                          :[{id:uid(),catId:"",subId:"",amount}],
        };
        if(!sparAccId) return [abgang];
        const zugang = {
          id:"pend-"+uid(), date, desc:sparDesc,
          totalAmount:row.zusaetzlich, pending:true, _csvType:"income",
          accountId:sparAccId,
          _linkedTo:abgang.id,
          _seriesId:tgtSeriesId, _seriesIdx:i+1, _seriesTotal:sparMonate.length,
          splits:sparTgtCatId?[{id:uid(),catId:sparTgtCatId,subId:sparTgtSubId||"",amount:row.zusaetzlich}]
                             :[{id:uid(),catId:"",subId:"",amount:row.zusaetzlich}],
        };
        return [abgang, zugang];
      });
      return [...ohne, ...newTxs];
    });
    return sparMonate.length;
  };

  const berechnen = (onDone, accOverride) => {
    const effAcc = accOverride !== undefined ? accOverride : selAcc;
    setComputing(true);
    setResult(null);
    setProgress(0);
    minTagCache.current = {}; // Cache leeren — stellt sicher dass Plan-1-Vormerkungen einbezogen werden
    resetProgEndeCache(); // Globalen AppCtx Prognose-Cache leeren
    // Wenn ein Sparplan mit diesem Namen existiert, alte Raten ignorieren — sonst rechnen wir mit reduziertem Saldo
    const sparDesc = buildSparDesc(sparPlanName);
    const hasExisting = txs.some(t=>t.pending&&!t._linkedTo&&t.desc===sparDesc&&t.accountId==="acc-giro");
    const excludeDesc = hasExisting ? sparDesc : null;
    let i = 0;
    let kumuliert = 0;
    const virtualSpar = {};
    const rows = [];
    const total = monate + 1;
    const CHUNK = 3; // Verarbeite mehrere Monate pro Frame

    const addVS = (y, m, betrag, vs) => {
      if(!betrag || betrag <= 0) return;
      const pad2 = n=>String(n).padStart(2,"0");
      const lastDay = new Date(y, m+1, 0).getDate();
      const date = `${y}-${pad2(m+1)}-${pad2(lastDay)}`;
      vs[date] = (vs[date]||0) - betrag;
    };

    const step = () => {
      const end = Math.min(i + CHUNK, total);
      for(; i < end; i++) {
        const m=(nowM+i)%12, y=nowY+Math.floor((nowM+i)/12);
        const {min:minTag, saldoEnde} = getMinTagessaldo(y, m, virtualSpar, effAcc, excludeDesc);
        const maxMoeglich = minTag!==null ? Math.floor(Math.max(0, minTag - puffer)) : 0;

        let zusaetzlich = 0;
        if(maxMoeglich > 0) {
          // Binäre Suche mit nur 3 Folgemonate-Check (Rest wird in eigener Iteration korrigiert)
          let lo = 0, hi = maxMoeglich;
          const LOOKAHEAD = Math.min(3, total - i - 1);
          while(lo < hi) {
            const mid = Math.floor((lo + hi + 1) / 2);
            const vsTest = {...virtualSpar};
            addVS(y, m, mid, vsTest);
            let ok = true;
            for(let ahead = 1; ahead <= LOOKAHEAD; ahead++) {
              const ni = i + ahead;
              const nm=(nowM+ni)%12, ny=nowY+Math.floor((nowM+ni)/12);
              const nextMin = getMinTagessaldo(ny, nm, vsTest, effAcc, excludeDesc).min;
              if(nextMin !== null && nextMin < puffer) { ok = false; break; }
            }
            if(ok) lo = mid; else hi = mid - 1;
          }
          zusaetzlich = lo;
        }

        kumuliert += zusaetzlich;
        const minNachSparen = minTag!==null ? minTag - zusaetzlich : null;
        addVS(y, m, zusaetzlich, virtualSpar);
        rows.push({y, m, minTag, minNach: minNachSparen, saldoEnde, zusaetzlich, kumuliert});
      }
      setProgress(Math.round(i/total*100));
      if(i < total) requestAnimationFrame(step);
      else { setResult([...rows]); setComputing(false); if(onDone) onDone([...rows]); }
    };
    requestAnimationFrame(step);
  };

  const autoAnpassen = () => {
    const {desc:sparDesc, series:existingSeries, seriesIds} = findExistingSeries(sparPlanName);
    if(!seriesIds.length) { showToast("Kein Sparplan zum Anpassen gefunden."); return; }
    const seriesId = seriesIds[seriesIds.length-1];
    const altKumuliert = existingSeries.reduce((s,t)=>s+Math.abs(t.totalAmount),0);
    // Wichtig: immer mit Giro-Konto rechnen, unabhängig von selAcc
    const prevSelAcc = selAcc;
    // Temporär auf Giro schalten für die Berechnung — via lokale Variable
    const savedSelAcc = selAcc;
    // Berechnung mit acc-giro erzwingen: minTagCache leeren und mit Giro-Kontext rechnen
    minTagCache.current = {};
    resetProgEndeCache();
    berechnen((rows)=>{
      const anzahl = doAktualisieren(rows, seriesId, seriesId+"-tgt", sparDesc);
      const neuKumuliert = rows.filter(r=>r.zusaetzlich>0).reduce((s,r)=>s+r.zusaetzlich,0);
      const diff = neuKumuliert - altKumuliert;
      const diffStr = diff>0 ? `+${fmt(diff)} €` : diff<0 ? `−${fmt(Math.abs(diff))} €` : "keine Änderung";
      showToast(`✓ Automatisch angepasst: ${anzahl} Raten · ${diffStr}`);
    }, "acc-giro"); // Immer Giro für Sparplan-Berechnung
  };
  const maxTransfer = result?.[0]?.zusaetzlich ?? null;
  const col = maxTransfer===null?T.txt2:maxTransfer<=0?T.txt2:maxTransfer<500?T.warn:T.pos;

  // Enddatum ↔ Monate: monate = Anzahl Folgemonate ab dem aktuellen Monat
  // (Schleife in berechnen() startet bei nowY/nowM, läuft monate+1 Iterationen,
  // letzte Iteration trifft genau den Endmonat). Obergrenze großzügig (50 Jahre).
  const SPAR_MAX_MONATE = 600;
  const monateToEndDate = (n) => {
    const idx = nowM + n;
    const y = nowY + Math.floor(idx/12);
    const m = ((idx % 12) + 12) % 12;
    const pad2 = x=>String(x).padStart(2,"0");
    const lastDay = new Date(y, m+1, 0).getDate();
    return `${y}-${pad2(m+1)}-${pad2(lastDay)}`;
  };
  const endDateToMonate = (iso) => {
    if(!iso) return null;
    const [y,m] = iso.split("-").map(Number);
    if(!y||!m) return null;
    const n = (y-nowY)*12 + ((m-1)-nowM);
    return Math.max(1, Math.min(SPAR_MAX_MONATE, n));
  };
  const setMonatePersist = (v) => {
    setMonate(v);
    kvStore.setItem("mbt_sparen_monate", String(v));
    if(result) setResultOutdated(true);
  };

  return (
    <div id="sparplan-widget" style={{margin:"4px 10px",background:T.surf2,borderRadius:16,
      padding:"9px 12px",border:`1px solid ${T.bd}`}}>

      {/* Header */}
      <div onClick={()=>setCollapsed(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:8,marginBottom:collapsed?0:8,cursor:"pointer"}}>
        <div style={{width:30,height:30,borderRadius:9,background:"rgba(74,159,212,0.15)",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {Li("piggy-bank",15,T.blue)}
        </div>
        <div style={{flex:1}}>
          <div style={{color:T.txt,fontSize:12,fontWeight:700}}>Sparen</div>
          <div style={{color:T.txt2,fontSize:9}}>Tagesgenaue Sparvorschläge</div>
        </div>
        {Li(collapsed?"chevron-down":"chevron-up",12,T.txt2)}
      </div>

      {toast&&(
        <div style={{margin:"4px 0",padding:"8px 12px",background:"rgba(34,197,94,0.15)",
          border:`1px solid ${T.pos}44`,borderRadius:8,color:T.pos,fontSize:12,fontWeight:700,
          textAlign:"center"}}>
          {toast}
        </div>
      )}

      {!collapsed&&<>
        {/* Gleicher dunkler Karten-Hintergrund wie "Sofort-Betrag" und
            "Vormerkungsserie anlegen" weiter unten — sonst liegen die Felder
            direkt auf der (gleichfarbigen) Widget-Fläche und sind praktisch
            nicht mehr als Felder erkennbar (Nutzer-Feedback). */}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8,
          background:"rgba(0,0,0,0.15)",borderRadius:10,padding:"10px 12px"}}>
          {/* Planname + bestehende Pläne */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:T.txt2,fontSize:10,flexShrink:0}}>Planname</span>
            <input ref={planNameInputRef} value={sparPlanName}
              onChange={e=>{setSparPlanName(e.target.value);kvStore.setItem("mbt_spar_planname",e.target.value);}}
              placeholder="z.B. Sparplan 1"
              // rechtsbündig: bei einem langen (z.B. geladenen) Plannamen bleibt so
              // das Ende sichtbar, statt unbemerkt rechts abgeschnitten zu sein.
              style={{...FIELD,flex:1,minWidth:0,textAlign:"right"}}/>
            {(()=>{
              // Dropdown mit bestehenden Plänen
              const existingDescs = [...new Set(
                txs.filter(t=>t.pending&&!t._linkedTo&&t._seriesId&&t.accountId==="acc-giro"&&(t.desc||"").startsWith("Sparen·"))
                .map(t=>t.desc)
              )];
              if(!existingDescs.length) return null;
              // Aktueller Plan-Match-Status
              const currentDesc = buildSparDesc(sparPlanName);
              const currentMatches = existingDescs.includes(currentDesc);
              return (
                <>
                <select value=""
                  onChange={e=>{
                    if(!e.target.value) return;
                    const name = e.target.value.replace(/^Sparen·/,"");
                    setSparPlanName(name);
                    kvStore.setItem("mbt_spar_planname", name);
                    // Vorhandenes Vorschau-Ergebnis verwerfen und Auto-Recompute neu scharf machen,
                    // damit die Tabelle für den neu ausgewählten Plan automatisch befüllt wird.
                    setResult(null);
                    didAutoLoadRef.current = false;
                    e.target.value = "";
                    scrollPlanNameToEnd();
                  }}
                  style={{...FIELD,border:`1px solid ${currentMatches?T.pos:T.bd}`,
                    color:T.txt2,padding:"4px 6px",cursor:"pointer",
                    // Feste Breite statt natürlicher Größe: Browser bemessen die
                    // geschlossene Box eines <select> oft an der BREITESTEN <option>
                    // (hier: der längste Plan-Name), nicht am sichtbaren Label
                    // ("✓ geladen"/"⋯ laden") — ohne feste Breite würde ein langer
                    // Plan-Name das Element aufblähen und das Planname-Feld daneben
                    // verdrängen. flexShrink:0, damit die feste Breite nicht ihrerseits
                    // vom Flex-Layout unterschritten (und der Text abgeschnitten) wird.
                    // 112px, da der Text bei den erzwungenen 16px (s.o.) breiter
                    // ausfällt als bei den ursprünglich angenommenen 10px.
                    width:112,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  <option value="">{currentMatches?"✓ geladen":"⋯ laden"}</option>
                  {existingDescs.map(d=>(
                    <option key={d} value={d}>{d.replace(/^Sparen·/,"")}</option>
                  ))}
                </select>
                </>
              );
            })()}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:T.txt2,fontSize:10,flex:1}}>Mindest-Puffer (€)</span>
            <input type="number" value={puffer}
              onChange={e=>{const v=parseInt(e.target.value)||0;setPuffer(v);if(result) setResultOutdated(true);}}
              style={{...FIELD,width:80,textAlign:"right"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:T.txt2,fontSize:10,flex:1}}>Vorschau bis (Enddatum)</span>
            <input type="date" min={monateToEndDate(1)} value={monateToEndDate(monate)}
              onChange={e=>{const n=endDateToMonate(e.target.value);if(n) setMonatePersist(n);}}
              style={{...FIELD,width:140,textAlign:"right",colorScheme:"dark"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:T.txt2,fontSize:10,flex:1}}>oder Anzahl Monate</span>
            <input type="number" min="1" max={SPAR_MAX_MONATE} value={monate}
              onChange={e=>{const v=Math.max(1,Math.min(SPAR_MAX_MONATE,parseInt(e.target.value)||3));setMonatePersist(v);}}
              style={{...FIELD,width:80,textAlign:"right"}}/>
          </div>
        </div>

        {/* Sofort-Betrag + Neuberechnen-Button */}
        <div style={{background:"rgba(0,0,0,0.15)",borderRadius:10,padding:"10px 12px",
          marginBottom:6,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            {(()=>{
              const totalKumuliert = result?.[result.length-1]?.kumuliert??0;
              const sparMonate = result ? result.filter(r=>r.zusaetzlich>0).length : 0;
              const durchschnitt = sparMonate > 0 ? totalKumuliert / (monate+1) : 0;
              // Kein Spielraum wenn: total=0 oder Durchschnitt pro Monat < puffer (zu wenig um sinnvoll zu sein)
              const keinSpielraum = result && (totalKumuliert === 0 || durchschnitt < puffer);
              const keinSpielraumGrund = totalKumuliert === 0
                ? "Ein bestehender Sparplan schöpft bereits alles bis auf den Puffer ab."
                : `Ø ${fmt(Math.round(durchschnitt))} €/Monat — zu wenig für einen sinnvollen Sparplan (Schwelle: ${fmt(puffer)} €/Monat).`;
              return (<>
                <div style={{color:T.txt2,fontSize:9,marginBottom:4}}>
                  Heute sicher sparen (Monat 1):
                </div>
                <div style={{color:col,fontSize:26,fontWeight:800,fontFamily:NUM_FONT,letterSpacing:-0.5}}>
                  {computing?"…":maxTransfer===null?"—":maxTransfer<=0?"0":fmt(maxTransfer)} €
                </div>
                {result&&!keinSpielraum&&<div style={{color:T.pos,fontSize:9,marginTop:2}}>
                  ∑ {monate+1} Monate: <span style={{fontWeight:700,fontFamily:NUM_FONT}}>
                    {fmt(totalKumuliert)} €
                  </span>
                  {" · "}Ø <span style={{fontWeight:700,fontFamily:NUM_FONT}}>{fmt(Math.round(durchschnitt))} €</span>/Monat
                </div>}
                {keinSpielraum&&(
                  <div style={{marginTop:4,background:"rgba(234,64,37,0.12)",border:`1px solid ${T.neg}44`,
                    borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6}}>
                    {Li("x-circle",14,T.neg)}
                    <div>
                      <div style={{color:T.neg,fontSize:11,fontWeight:700}}>Kein sinnvoller Spielraum</div>
                      <div style={{color:T.txt2,fontSize:9}}>{keinSpielraumGrund}</div>
                    </div>
                  </div>
                )}
              </>);
            })()}</div>
          <div style={{flexShrink:0,display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
            {(()=>{
              const {seriesIds:_existingIds} = findExistingSeries(sparPlanName);
              const hasExisting = _existingIds.length>0;
              if(hasExisting) {
                // Bestehender Plan: „Neuberechnen" — rechnet neu UND überschreibt
                // die Serie mit dem frischen Ergebnis (z.B. nach geändertem Enddatum).
                return (
                  <button onClick={autoAnpassen} disabled={computing}
                    style={{padding:"8px 14px",borderRadius:10,border:"none",
                      background:computing?"rgba(255,255,255,0.1)":resultOutdated?T.gold:T.pos,
                      color:computing?T.txt2:"#000",fontSize:12,fontWeight:700,
                      cursor:computing?"default":"pointer",
                      display:"flex",alignItems:"center",gap:6}}>
                    {Li(computing?"loader":"refresh-cw",13,computing?T.txt2:"#000")}
                    {computing?`${progress}%`:resultOutdated?"⚠ Neu berechnen":"Neuberechnen"}
                  </button>
                );
              }
              // Neuer Plan: klassisches „Neuberechnen" (nur Vorschau, kein Speichern).
              return (
                <button onClick={()=>{ setResultOutdated(false); berechnen(); }} disabled={computing}
                  style={{padding:"8px 14px",borderRadius:10,border:"none",
                    background:computing?"rgba(255,255,255,0.1)":resultOutdated?T.gold:T.blue,
                    color:computing?T.txt2:"#fff",fontSize:12,fontWeight:700,
                    cursor:computing?"default":"pointer",
                    display:"flex",alignItems:"center",gap:6}}>
                  {Li(computing?"loader":"refresh-cw",13,computing?T.txt2:"#fff")}
                  {computing?`${progress}%`:resultOutdated?"⚠ Neu berechnen":"Neuberechnen"}
                </button>
              );
            })()}
            {computing&&(
              <div style={{width:120,height:3,borderRadius:2,background:"rgba(255,255,255,0.1)"}}>
                <div style={{height:"100%",borderRadius:2,background:T.blue,
                  width:`${progress}%`,transition:"width 0.1s"}}/>
              </div>
            )}
          </div>
        </div>

        {/* Ergebnis-Tabelle */}
        {!result&&(
          <div style={{textAlign:"center",color:T.txt2,fontSize:10,padding:"8px 0"}}>
            Klicke „Neuberechnen" um den Sparplan zu ermitteln
          </div>
        )}
        {result&&result.length>0&&(<>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",padding:"0 8px",marginBottom:2}}>
              <div style={{width:44,flexShrink:0}}/>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8}}>Tiefst-Saldo*</div>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8}}>nach Sparen</div>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8}}>+ Monat</div>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8,fontWeight:700}}>∑ gespart</div>
            </div>
            {result.map(({y,m,minTag,minNach,zusaetzlich,kumuliert},i)=>{
              const zusCol=zusaetzlich>0?zusaetzlich<500?T.warn:T.pos:T.txt2;
              const isCurM=i===0;
              const kritisch=minNach!==null&&minNach<puffer;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",
                  padding:"3px 8px",borderRadius:7,
                  background:isCurM?"rgba(74,159,212,0.08)":"rgba(255,255,255,0.02)",
                  border:kritisch?`1px solid ${T.neg}44`:"1px solid transparent"}}>
                  <div style={{width:44,flexShrink:0}}>
                    <span style={{color:isCurM?T.blue:T.txt,fontSize:10,fontWeight:700}}>{MONTHS_G[m]}</span>
                    <span style={{color:T.txt2,fontSize:8,marginLeft:3}}>{String(y).slice(2)}</span>
                  </div>
                  <div style={{flex:1,textAlign:"right",color:minTag===null?T.txt2:minTag<puffer?T.neg:T.txt2,fontSize:9,fontFamily:NUM_FONT}}>
                    {minTag!==null?(minTag>=0?"+":"−")+fmt(Math.abs(minTag)):"—"}
                  </div>
                  <div style={{flex:1,textAlign:"right",fontSize:9,fontFamily:NUM_FONT,fontWeight:700,
                    color:minNach===null?T.txt2:minNach<puffer?T.neg:T.pos}}>
                    {minNach!==null?(minNach>=0?"+":"−")+fmt(Math.abs(minNach)):"—"}
                    {kritisch&&<span style={{color:T.neg,fontSize:7}}> ⚠</span>}
                  </div>
                  <div style={{flex:1,textAlign:"right",color:zusCol,fontSize:10,fontWeight:700,fontFamily:NUM_FONT}}>
                    {zusaetzlich>0?"+"+fmt(zusaetzlich):"—"}
                  </div>
                  <div style={{flex:1,textAlign:"right",color:kumuliert>0?T.pos:T.txt2,fontSize:11,fontWeight:800,fontFamily:NUM_FONT}}>
                    {kumuliert>0?fmt(kumuliert):"—"}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{textAlign:"right",color:T.txt2,fontSize:8,marginTop:4}}>
            * Tiefst-Saldo nach Abzug bereits eingeplanterSparraten · Sparen = Tiefst-Saldo − {fmt(puffer)} € Puffer
          </div>
          {/* Kategorie + Konto + Anlegen */}
          <div style={{marginTop:8,background:"rgba(0,0,0,0.15)",borderRadius:10,padding:"10px 12px",
            display:"flex",flexDirection:"column",gap:8}}>
            <div style={{color:T.txt,fontSize:11,fontWeight:700}}>Vormerkungsserie anlegen</div>
            {/* Zeile 1 — Abgang: immer Giro (Konto fix), expense-Kategorie auf Giro */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:T.txt2,fontSize:10,minWidth:50}}>Abgang</span>
              <span style={{...FIELD,color:T.txt2,fontWeight:600,minWidth:90,textAlign:"center"}}>Giro</span>
              <div style={{flex:1,minWidth:0}}>
                <CatPicker
                  value={sparCatId+"|"+sparSubId}
                  onChange={(cId,sId)=>{setSparCatId(cId);setSparSubId(sId);kvStore.setItem("mbt_spar_catid",cId);kvStore.setItem("mbt_spar_subid",sId);}}
                  placeholder="— unkategorisiert —"
                  filterType="expense"
                  accountId="acc-giro"
                  // 16px passend zum daneben erzwungenen 16px des "Giro"-Felds
                  // (FIELD) — sonst wirkt die Zeile in der Schriftgröße uneinheitlich.
                  triggerStyle={{fontSize:16}}
                />
              </div>
            </div>
            {/* Zeile 2 — Zugang: Konto wählen, dann income-Kategorie dieses Kontos */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:T.txt2,fontSize:10,minWidth:50}}>Zugang</span>
              <select value={sparAccId}
                onChange={e=>{
                  const v = e.target.value;
                  setSparAccId(v); kvStore.setItem("mbt_spar_accid",v);
                  // Konto-Wechsel: bisherige Zugang-Kategorie verwirft (gehört zum alten Konto)
                  if(v !== sparAccId) {
                    setSparTgtCatId(""); kvStore.setItem("mbt_spar_tgt_catid","");
                    setSparTgtSubId(""); kvStore.setItem("mbt_spar_tgt_subid","");
                  }
                }}
                style={{...FIELD,minWidth:90,maxWidth:130,cursor:"pointer"}}>
                <option value="">— kein Konto —</option>
                {accounts.filter(a=>a.id!=="acc-giro").map(a=>(
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div style={{flex:1,minWidth:0,opacity:sparAccId?1:0.4,pointerEvents:sparAccId?"auto":"none"}}>
                <CatPicker
                  value={sparTgtCatId+"|"+sparTgtSubId}
                  onChange={(cId,sId)=>{setSparTgtCatId(cId);setSparTgtSubId(sId);kvStore.setItem("mbt_spar_tgt_catid",cId);kvStore.setItem("mbt_spar_tgt_subid",sId);}}
                  placeholder={sparAccId?"— unkategorisiert —":"— erst Konto wählen —"}
                  filterType="income"
                  accountId={sparAccId||null}
                  // 16px passend zum erzwungenen 16px des Zugang-<select> daneben.
                  triggerStyle={{fontSize:16}}
                />
              </div>
            </div>
            {/* Button */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
              <div style={{color:T.txt2,fontSize:9}}>
                {result.filter(r=>r.zusaetzlich>0).length} Vormerkungen · am Monatsletzten
              </div>
              <div style={{display:"flex",gap:6}}>
                {(()=>{
                  const {seriesIds:_existingIds} = findExistingSeries(sparPlanName);
                  // Bestehender Plan: kein „+ Anlegen" — die Aktualisierung läuft
                  // über den „Auto"-Button oben rechts.
                  if(_existingIds.length>0) return null;
                  return (<button onClick={()=>{
                  const sparMonate = result ? result.filter(r=>r.zusaetzlich>0) : [];
                  if(!result) { showToast("Bitte zuerst Neuberechnen klicken."); return; }
                  if(!sparMonate.length) { showToast("Keine Sparraten möglich — Konto bereits voll genutzt oder unter Puffer."); return; }
                  const sparDesc = buildSparDesc(sparPlanName);
                  const seriesId = "series-"+uid();
                  const newTxs = sparMonate.flatMap((row, i) => {
                    const pad2 = n=>String(n).padStart(2,"0");
                    const lastDay = new Date(row.y, row.m+1, 0).getDate();
                    const date = `${row.y}-${pad2(row.m+1)}-${pad2(lastDay)}`;
                    const amount = -row.zusaetzlich;
                    const abgang = {
                      id: "pend-"+uid(), date, desc:sparDesc,
                      totalAmount: amount, pending:true, _csvType:"expense",
                      accountId: "acc-giro",
                      _seriesId: seriesId, _seriesIdx: i+1, _seriesTotal: sparMonate.length,
                      splits: sparCatId ? [{id:uid(),catId:sparCatId,subId:sparSubId||"",amount}]
                                        : [{id:uid(),catId:"",subId:"",amount}],
                    };
                    if(!sparAccId) return [abgang];
                    const zugang = {
                      id: "pend-"+uid(), date, desc:sparDesc,
                      totalAmount: row.zusaetzlich, pending:true, _csvType:"income",
                      accountId: sparAccId,
                      _linkedTo: abgang.id,
                      _seriesId: seriesId+"-tgt", _seriesIdx: i+1, _seriesTotal: sparMonate.length,
                      splits: sparTgtCatId ? [{id:uid(),catId:sparTgtCatId,subId:sparTgtSubId||"",amount:row.zusaetzlich}]
                                          : [{id:uid(),catId:"",subId:"",amount:row.zusaetzlich}],
                    };
                    return [abgang, zugang];
                  });
                  setTxs(p=>[...p, ...newTxs]);
                  showToast(`✓ ${sparMonate.length} Sparvormerkungen angelegt${sparAccId?" (Abgang + Zugang)":""}`);
                }} disabled={!result}
                  style={{padding:"7px 14px",borderRadius:10,border:"none",
                  background:!result?"rgba(255,255,255,0.1)":T.pos,
                  color:!result?T.txt2:"#000",
                  fontSize:12,fontWeight:700,
                  cursor:!result?"default":"pointer",
                  opacity:!result?0.5:1,
                  display:"flex",alignItems:"center",gap:6}}>
                  {Li("plus-circle",14,!result?T.txt2:"#000")} Anlegen
                </button>);
                })()}
              </div>
            </div>
          </div>
        </>)}
      </>}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════

export { TagesgeldWidget };
