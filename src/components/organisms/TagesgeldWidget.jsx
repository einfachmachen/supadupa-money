// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useRef, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { planLegDecisions } from "../../utils/sparPlanSeries.js";
import { getSparWatermark, noteSparWatermark } from "../../utils/sparWatermarks.js";
import { computeMinTagessaldo, computeTagessaldoAt } from "../../utils/sparBerechnen.js";
import { DEFAULT_ZINS_MONATE, parseZinsMonate, serializeZinsMonate,
  monatsLetzter, sweepFenster, computeSweep } from "../../utils/zinsSweep.js";

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

  // ── Zins-Sweep („Mega-Sparrate") — rein informativ ────────────────────
  // Zeigt als zusätzliche Tabellenspalte, wie viel zum Zinsstichtag kurzfristig
  // aufs Tagesgeld geschoben werden kann, ohne am nächsten Banktag in
  // Schieflage zu geraten. Welche Zeile ihre Details ausklappt (Monatsschlüssel
  // y*12+m) bzw. null = keine.
  const [sweepOffen, setSweepOffen] = useState(null);
  const [zinsMonate, setZinsMonateState] = useState(
    ()=>parseZinsMonate(kvStore.getItem("mbt_zins_monate")) ?? DEFAULT_ZINS_MONATE);
  const setZinsMonate = (arr) => {
    const next = [...new Set(arr)].sort((a,b)=>a-b);
    setZinsMonateState(next);
    kvStore.setItem("mbt_zins_monate", serializeZinsMonate(next));
  };
  const toggleZinsMonat = (m) =>
    setZinsMonate(zinsMonate.includes(m) ? zinsMonate.filter(x=>x!==m) : [...zinsMonate, m]);

  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const nowY=new Date().getFullYear(), nowM=new Date().getMonth();
  const isCurr = year===nowY && month===nowM;

  // ── Caches — müssen vor jedem return stehen (React Hook-Regel) ────────
  const minTagCache = React.useRef({});
  // Zins-Sweep je Zinstermin. Ohne diesen Cache würde die Tabelle bei einem
  // langen Vorschauzeitraum (Dirk: 77 Monate → ~26 Quartalstermine à ~3 Tage)
  // bei JEDEM Render rund 80 Tagessalden neu durchrechnen.
  const sweepCache = React.useRef({key:null, map:new Map()});
  React.useEffect(()=>{ minTagCache.current = {}; sweepCache.current = {key:null, map:new Map()}; }, [txs, selAcc]);
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

  // Tagesgenauen Minimalsaldo eines Monats berechnen — Kernrechnung ausgelagert
  // nach utils/sparBerechnen.js (computeMinTagessaldo), damit dieselbe Logik
  // auch außerhalb des Widgets nutzbar ist (siehe App.jsx: automatische
  // Anpassung der laufenden Monatsrate bei Pufferunterschreitung). Hier nur
  // noch Cache + Standardkonto-Fallback (selAcc) obendrauf.
  // excludeSparDesc: wenn gesetzt, werden Sparplan-Buchungen mit diesem desc ignoriert
  // (für Neuberechnung eines bestehenden Sparplans)
  const getMinTagessaldo = (y, m, virtualSpar={}, accId, excludeSparDesc=null) => {
    // Cache nur ohne virtualSpar und ohne exclude sinnvoll
    const effSelAcc = accId !== undefined ? accId : selAcc;
    const key = (Object.keys(virtualSpar).length===0 && !excludeSparDesc) ? `${y}-${m}-${effSelAcc||"all"}` : null;
    if(key && key in minTagCache.current) return minTagCache.current[key];
    const result2 = computeMinTagessaldo(y, m, virtualSpar, effSelAcc, excludeSparDesc,
      { txs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, getProgEndeAccGlobal });
    if(key) minTagCache.current[key] = result2;
    return result2;
  };

  // Die im Sparplan für den Monat des Zinstermins vorgesehene Rate. Quelle ist
  // die tatsächlich angelegte Vormerkung — sie steckt im Tagessaldo bereits
  // drin und wird hier nur ausgewiesen, um die reale Gesamtüberweisung
  // („hin") und die davon abgeleitete Rücküberweisung zu zeigen.
  const sparrateImMonat = (terminIso) => {
    const desc = buildSparDesc(sparPlanName);
    const pfx = String(terminIso).slice(0,8); // "YYYY-MM-"
    const tx = txs.find(t => t.pending && !t._linkedTo && t.desc===desc
      && t.accountId==="acc-giro" && String(t.date).startsWith(pfx));
    return tx ? Math.abs(tx.totalAmount) : 0;
  };

  // ── Zins-Sweep für alle Zinstermine der Vorschau ──────────────────────
  // Liefert eine Map monatsSchlüssel (y*12+m) → Sweep-Ergebnis, damit die
  // Tabelle pro Zeile nur noch nachschlagen muss.
  //
  // Der ctx wird EINMAL gebaut und über alle Termine geteilt: computeMin-
  // Tagessaldo legt darauf seine internen Caches ab (_restCache für die
  // Budget-Reservierungen, _txsById für den Duplikat-Lookup). Ein frisches
  // ctx-Objekt pro Aufruf würde jeden dieser Caches wirkungslos machen.
  const sweepMap = () => {
    const monateKey = serializeZinsMonate(zinsMonate);
    const key = `${monateKey}|${puffer}|${sparPlanName}|${result?result.length:0}`;
    if(sweepCache.current.key === key) return sweepCache.current.map;
    const map = new Map();
    if(zinsMonate.length && result && result.length) {
      const ctx = { txs, cats, accounts, getKumulierterSaldo, getCat,
        getBudgetForMonth, getProgEndeAccGlobal, _restCache:{} };
      result.forEach(({y,m})=>{
        if(!zinsMonate.includes(m)) return;
        const termin = monatsLetzter(y, m);
        const f = sweepFenster(termin);
        const salden = f.tage.map(d=>({date:d, saldo:computeTagessaldoAt(d, "acc-giro", ctx)}));
        const rate = sparrateImMonat(termin);
        const r = computeSweep({salden, puffer, normaleSparrate:rate});
        if(r) map.set(y*12+m, {...r, termin, bis:f.bis});
      });
    }
    sweepCache.current = {key, map};
    return map;
  };

  // Extrahierte Aktualisierungs-Logik — nutzbar von Button UND autoAnpassen
  const doAktualisieren = (rows, seriesId, tgtSeriesId, sparDesc) => {
    const sparMonate = rows.filter(r=>r.zusaetzlich>0);
    // Entscheidungslogik in utils/sparPlanSeries.js (testbar, siehe dort):
    // pro Bein (Abgang vom Giro / Zugang aufs Zielkonto) GETRENNT merken,
    // welche Monate bisher eine Rate hatten — eine vom Nutzer manuell
    // gelöschte einzelne Rate innerhalb der bisher abgedeckten Spanne soll
    // beim Neuberechnen nicht stillschweigend wieder auftauchen, auch dann
    // nicht, wenn nur EIN Bein des verknüpften Paars gelöscht wurde (z.B.
    // nur die Tagesgeld-Einnahme, der Giro-Abgang blieb bestehen).
    const oldAbgang = txs.filter(t=>t._seriesId===seriesId&&t.pending);
    const oldZugang = txs.filter(t=>t._seriesId===tgtSeriesId&&t.pending);
    // Wasserzeichen aus vorherigen Läufen: schützt vor dem "letzte Rate
    // gelöscht"-Fall, in dem oldAbgang/oldZugang allein die alte Spanne
    // fälschlich verkürzt anzeigen würden (siehe utils/sparWatermarks.js).
    const historicalMaxAbgangKey = getSparWatermark(seriesId);
    const historicalMaxZugangKey = getSparWatermark(tgtSeriesId);
    const decisions = new Map(
      planLegDecisions(sparMonate.map(row=>row.y*12+row.m), oldAbgang, oldZugang, !!sparAccId,
        historicalMaxAbgangKey, historicalMaxZugangKey)
        .map(d=>[d.key, d])
    );

    setTxs(p=>{
      // Nur PENDING Buchungen der alten Serie entfernen — echte (bereits gebuchte) bleiben
      const ohne = p.filter(t=>{
        if(t._seriesId!==seriesId&&t._seriesId!==tgtSeriesId) return true;
        if(!t.pending) return true; // bereits gebucht — behalten
        return false; // pending — entfernen
      });
      const newTxs = sparMonate.flatMap((row)=>{
        const key = row.y*12+row.m;
        const { keepAbgang, keepZugang } = decisions.get(key);
        if(!keepAbgang && !keepZugang) return [];
        const pad2 = n=>String(n).padStart(2,"0");
        const lastDay = new Date(row.y, row.m+1, 0).getDate();
        const date = `${row.y}-${pad2(row.m+1)}-${pad2(lastDay)}`;
        const amount = -row.zusaetzlich;
        const abgang = keepAbgang ? {
          id:"pend-"+uid(), date, desc:sparDesc,
          totalAmount:amount, pending:true, _csvType:"expense",
          accountId:"acc-giro",
          _seriesId:seriesId,
          splits:sparCatId?[{id:uid(),catId:sparCatId,subId:sparSubId||"",amount}]
                          :[{id:uid(),catId:"",subId:"",amount}],
        } : null;
        if(!keepZugang) return abgang ? [abgang] : [];
        const zugang = {
          id:"pend-"+uid(), date, desc:sparDesc,
          totalAmount:row.zusaetzlich, pending:true, _csvType:"income",
          accountId:sparAccId,
          ...(abgang ? {_linkedTo:abgang.id} : {}),
          _seriesId:tgtSeriesId,
          splits:sparTgtCatId?[{id:uid(),catId:sparTgtCatId,subId:sparTgtSubId||"",amount:row.zusaetzlich}]
                             :[{id:uid(),catId:"",subId:"",amount:row.zusaetzlich}],
        };
        return abgang ? [abgang, zugang] : [zugang];
      });
      // _seriesIdx/_seriesTotal erst hier vergeben (getrennt je Bein), damit
      // die Zählung auch bei einseitig übersprungenen Monaten stimmt.
      let ai = 0, zi = 0;
      const abgangTotal = newTxs.filter(t=>t._seriesId===seriesId).length;
      const zugangTotal = newTxs.filter(t=>t._seriesId===tgtSeriesId).length;
      newTxs.forEach(t=>{
        if(t._seriesId===seriesId) { ai++; t._seriesIdx=ai; t._seriesTotal=abgangTotal; }
        else { zi++; t._seriesIdx=zi; t._seriesTotal=zugangTotal; }
      });
      return [...ohne, ...newTxs];
    });
    // Wasserzeichen auf die gerade berechnete Planspanne vorziehen (nie
    // zurücksetzen) — unabhängig davon, ob einzelne Monate wegen einer
    // vorherigen Löschung gerade übersprungen wurden. Erst dadurch "weiß"
    // ein künftiger Lauf (auch auf einem anderen, synchronisierten Gerät),
    // wie weit diese Serie tatsächlich schon einmal reichte.
    const maxSparMonateKey = sparMonate.length ? Math.max(...sparMonate.map(row=>row.y*12+row.m)) : -Infinity;
    if(isFinite(maxSparMonateKey)) {
      noteSparWatermark(seriesId, maxSparMonateKey);
      if(sparAccId) noteSparWatermark(tgtSeriesId, maxSparMonateKey);
    }
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
  // ── Ableitungen für die Zins-Sweep-Spalte ─────────────────────────────
  const sweepAktiv = zinsMonate.length > 0;
  const sweeps = sweepAktiv ? sweepMap() : new Map();
  const zielKontoName = accounts.find(a=>a.id===sparAccId)?.name || "Tagesgeld";
  const WOCHENTAGE = ["So","Mo","Di","Mi","Do","Fr","Sa"];
  const kurzDat = (iso) => {
    const [y,m,d] = String(iso).split("-").map(Number);
    const p2 = n=>String(n).padStart(2,"0");
    return `${p2(d)}.${p2(m)}.${String(y).slice(2)}`;
  };
  const wochentag = (iso) => {
    const [y,m,d] = String(iso).split("-").map(Number);
    return WOCHENTAGE[new Date(y,m-1,d).getDay()];
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

  // Kein eigener Akzent-Rand mehr oben — die Verbindung zum aktiven Symbol
  // in der Icon-Zeile darüber entsteht jetzt direkt über die identische
  // Tab-Hintergrundfarbe (T.surf2, siehe activeBg in DashboardScreenV2), ein
  // zusätzlicher andersfarbiger Rand hätte dort wie eine Trennlinie gewirkt.
  return (
    <div id="sparplan-widget" style={{margin:"0 10px 4px",background:T.surf2,borderRadius:16,
      padding:"9px 10px",border:`1px solid ${T.bd}`}}>

      {/* Header */}
      <div onClick={()=>setCollapsed(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:8,marginBottom:collapsed?0:8,cursor:"pointer"}}>
        {/* Sparschwein-Symbol entfernt — die 3 Symbole in der Icon-Zeile oben
            reichen als Kennzeichnung. Kein Platzhalter mehr: Text beginnt
            jetzt bündig mit "offene VM" im Vormerkungen-Tab. */}
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
          {/* „min. Saldo" + „bis" teilen sich eine Zeile — die frühere
              Einzelzeile „oder Anzahl Monate" ist entfallen: das Enddatum ist
              die Bezugsgröße, die Monatszahl war nur eine zweite Schreibweise
              desselben Werts. Der so gewonnene Platz trägt jetzt das
              Zinstermin-Raster. */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:T.txt2,fontSize:10,flexShrink:0}}>min. Saldo</span>
            <input type="number" value={puffer}
              onChange={e=>{const v=parseInt(e.target.value)||0;setPuffer(v);if(result) setResultOutdated(true);}}
              style={{...FIELD,width:66,textAlign:"right"}}/>
            <span style={{color:T.txt2,fontSize:10,flexShrink:0,marginLeft:"auto"}}>bis</span>
            <input type="date" min={monateToEndDate(1)} value={monateToEndDate(monate)}
              onChange={e=>{const n=endDateToMonate(e.target.value);if(n) setMonatePersist(n);}}
              style={{...FIELD,width:132,textAlign:"right",colorScheme:"dark"}}/>
          </div>
          {/* Zinstermine — steuern zugleich die Sweep-Spalte in der Tabelle:
              kein Monat gewählt = keine Spalte. */}
          {/* Blitz-Symbol statt des Wortes „Zinstermine": nur so bleibt genug
              Breite für lesbare Monatskürzel. Mit einem Buchstaben wären
              Jan/Jun/Jul nicht unterscheidbar. */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span title="Zinstermine — jeweils Monatsletzter" style={{flexShrink:0,display:"flex"}}>
              {Li("zap",12,sweepAktiv?T.gold:T.txt2)}
            </span>
            <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:2}}>
              {MONTHS_G.map((nm,mi)=>{
                const on = zinsMonate.includes(mi);
                return (
                  <div key={mi} onClick={()=>toggleZinsMonat(mi)} title={`Zinstermin ${nm} — Monatsletzter`}
                    style={{textAlign:"center",padding:"4px 0",borderRadius:5,cursor:"pointer",
                      background:on?"rgba(212,175,55,0.18)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${on?T.gold+"66":T.bd}`,
                      color:on?T.gold:T.txt2,fontSize:8,fontWeight:on?700:500,
                      userSelect:"none",overflow:"hidden",whiteSpace:"nowrap"}}>
                    {nm}
                  </div>
                );
              })}
            </div>
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

        {/* Ergebnis-Tabelle — mit optionaler Zins-Sweep-Spalte. Die Spalte
            erscheint, sobald mindestens ein Zinsmonat gewählt ist; kein Monat
            gewählt = Spalte aus. */}
        {!result&&(
          <div style={{textAlign:"center",color:T.txt2,fontSize:10,padding:"8px 0"}}>
            Klicke „Neuberechnen" um den Sparplan zu ermitteln
          </div>
        )}
        {result&&result.length>0&&(<>
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
                  // Wasserzeichen direkt bei Erstanlage setzen, damit eine
                  // spätere Löschung der letzten Rate schon beim allerersten
                  // "Neuberechnen" korrekt erkannt wird (siehe doAktualisieren).
                  const maxKey = Math.max(...sparMonate.map(row=>row.y*12+row.m));
                  noteSparWatermark(seriesId, maxKey);
                  if(sparAccId) noteSparWatermark(seriesId+"-tgt", maxKey);
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
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",padding:"0 8px",marginBottom:2}}>
              <div style={{width:44,flexShrink:0}}/>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8}}>Tiefst-Saldo*</div>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8}}>nach Sparen</div>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8}}>+ Monat</div>
              <div style={{flex:1,textAlign:"right",color:T.txt2,fontSize:8,fontWeight:700}}>∑ gespart</div>
              {sweepAktiv&&<div style={{flex:1,textAlign:"right",color:T.gold,fontSize:8,fontWeight:700}}>⚡ Sweep</div>}
            </div>
            {result.map(({y,m,minTag,minNach,zusaetzlich,kumuliert},i)=>{
              const zusCol=zusaetzlich>0?zusaetzlich<500?T.warn:T.pos:T.txt2;
              const isCurM=i===0;
              const kritisch=minNach!==null&&minNach<puffer;
              const mKey=y*12+m;
              const sw=sweepAktiv?sweeps.get(mKey):null;
              const offen=sweepOffen===mKey;
              return (
                <React.Fragment key={i}>
                <div onClick={sw?()=>setSweepOffen(offen?null:mKey):undefined}
                  style={{display:"flex",alignItems:"center",
                  padding:"3px 8px",borderRadius:7,cursor:sw?"pointer":"default",
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
                  {sweepAktiv&&<div style={{flex:1,textAlign:"right",fontSize:10,fontWeight:700,
                    fontFamily:NUM_FONT,color:sw&&sw.hin>0?T.gold:T.txt2}}>
                    {sw&&sw.hin>0?fmt(sw.hin):"—"}
                    {sw&&sw.hin>0&&<span style={{fontSize:7,marginLeft:2}}>{offen?"▴":"▾"}</span>}
                  </div>}
                </div>
                {sw&&offen&&(
                  <div style={{margin:"1px 8px 3px",padding:"7px 9px",borderRadius:7,
                    background:"rgba(212,175,55,0.07)",border:`1px solid ${T.gold}44`}}>
                    {sw.hin>0?(<>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                        <span style={{color:T.txt2,fontSize:9}}>am {kurzDat(sw.termin)} aufs {zielKontoName}</span>
                        <span style={{color:T.gold,fontSize:11,fontWeight:800,fontFamily:NUM_FONT}}>{fmt(sw.hin)} €</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:2}}>
                        <span style={{color:T.txt2,fontSize:9}}>zurück aufs Giro am {kurzDat(sw.bis)} ({wochentag(sw.bis)})</span>
                        <span style={{color:T.blue,fontSize:11,fontWeight:800,fontFamily:NUM_FONT}}>{fmt(sw.zurueck)} €</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:3,
                        paddingTop:3,borderTop:`1px solid ${T.bd}`}}>
                        <span style={{color:T.txt2,fontSize:9}}>bleibt gespart</span>
                        <span style={{color:sw.bleibt>0?T.pos:T.txt2,fontSize:10,fontWeight:700,fontFamily:NUM_FONT}}>
                          {sw.bleibt>0?fmt(sw.bleibt)+" €":"—"}
                        </span>
                      </div>
                      <div style={{color:T.txt2,fontSize:8,marginTop:4,lineHeight:1.5}}>
                        {sw.bleibt>0&&<>Ersetzt die normale Sparrate von {fmt(sw.bleibt)} € — die steckt
                          schon im Hin-Betrag, also nicht zusätzlich überweisen.<br/></>}
                        Engster Tag {kurzDat(sw.engpassTag)}: danach bleiben {fmt(Math.round(sw.restNachSweep))} € auf dem Giro.
                        Nur ein Vorschlag — es wird keine Vormerkung angelegt.
                      </div>
                    </>):(
                      <div style={{color:T.txt2,fontSize:9}}>
                        Kein Spielraum — am {kurzDat(sw.engpassTag)} liegt der Giro-Saldo schon
                        bei {fmt(Math.round(sw.minSaldo))} € (min. Saldo {fmt(puffer)} €).
                      </div>
                    )}
                  </div>
                )}
                </React.Fragment>
              );
            })}
          </div>
          <div style={{textAlign:"right",color:T.txt2,fontSize:8,marginTop:4}}>
            * Tiefst-Saldo nach Abzug bereits eingeplanter Sparraten · Sparen = Tiefst-Saldo − {fmt(puffer)} € Puffer
            {sweepAktiv&&<><br/>⚡ Sweep = Betrag zum Zinsstichtag, antippen für Details</>}
          </div>
        </>)}

      </>}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════

export { TagesgeldWidget };
