// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useMemo, useState } from "react";
import { SaldoPrognose } from "./SaldoPrognose.jsx";
import { DashboardScreen } from "../screens/DashboardScreen.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { THEMES } from "../../theme/themes.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { saldoEnde as calcSaldoEnde, saldoMitte as calcSaldoMitte } from "../../utils/saldo.js";

function SaldoHero2({year, month,
  buchInM, buchOutM, buchInE, buchOutE,
  pendInM, pendOutM, pendInE, pendOutE,
  uInM, uOutM, uInE, uOutE,
  prognoseMitte, prognoseEnde, detailMitte, detailEnde, saldoMitte, saldoEnde,
  onDrillBuchIn, onDrillBuchOut, onDrillPendIn, onDrillPendOut,
  onDrillUncatIn, onDrillUncatOut, onDrill}) {
  const { getKumulierterSaldo, accounts, startBalances, txs, cats, getBudgetForMonth, selAcc, setSelAcc } = useContext(AppCtx);
  const ks = getKumulierterSaldo(year, month);
  const [showDetail, setShowDetail] = React.useState(false);

  // Konto-spezifische Prognose-Ende: delegiert an die zentrale saldoEnde()
  // (Single Source of Truth — utils/saldo.js). Früher eine lokale Budget-Floor-
  // Reimplementierung; im Giro-Standardfall beweisbar äquivalent (siehe
  // tests/prognose_equivalence.test.js), aber sie ignorierte ausgehende Sparen-
  // Umbuchungen und zählte CSV-Dubletten doppelt. saldoEnde rechnet das korrekt
  // und identisch zum Haupt-Hero (dessen prognose-Props bereits über saldoEnde
  // laufen) — keine Divergenz mehr zwischen Hero, Drilldown und Konto-Umschalter.
  const _saldoCtx = React.useMemo(
    () => ({ txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth }),
    [txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth]);
  const getProgEndeAcc = (y, m, accId) => calcSaldoEnde(y, m, accId, _saldoCtx);

  // SICHERHEIT: Alle Konten aus accounts zeigen, die mindestens EINE Buchung haben.
  // Konten ohne jegliche Buchung werden ausgeblendet (z.B. unused Bar/PayPal).
  // Wenn ein Konto später eine Buchung bekommt, taucht es automatisch wieder auf.
  // Wenn selAcc auf ein ausgeblendetes Konto zeigt, fällt's auf Gesamt (null) zurück.
  const accountsForToggle = React.useMemo(()=>{
    if(!accounts) return [];
    // Welche accountIds haben mindestens eine Buchung?
    const used = new Set();
    (txs||[]).forEach(t => { if(t.accountId) used.add(t.accountId); });
    return accounts.filter(a => used.has(a.id)).map(a => a.id);
  }, [accounts, txs]);
  // Konto-Toggle: null = Gesamt, sonst accountId
  const accIds = accountsForToggle;
  const allAccIds = [null, ...accIds];
  // SICHERHEIT: Falls selAcc auf ein nicht-existentes/gelöschtes Konto zeigt,
  // behandle es als Gesamt (null). Verhindert NaN-Anzeige nach Datenmanipulation.
  React.useEffect(() => {
    if(selAcc !== null && !accIds.includes(selAcc)) {
      console.warn("[SaldoHero] selAcc zeigt auf nicht-existentes Konto", selAcc, "→ falle zurück auf Gesamt");
      setSelAcc(null);
    }
  }, [selAcc, accIds, setSelAcc]);
  // Effektiv-selAcc: nur verwenden wenn das Konto in accIds existiert
  const effSelAcc = (selAcc !== null && accIds.includes(selAcc)) ? selAcc : null;
  const ksAcc = React.useMemo(()=>{
    const res = {};
    accIds.forEach(id=>{ res[id] = getKumulierterSaldo(year, month, id); });
    return res;
  }, [year, month, accIds, getKumulierterSaldo]);
  const displayKs = effSelAcc===null ? ks : ksAcc[effSelAcc];
  const displayColor = v => v===null?T.txt:v<0?T.cond_neg:v<=500?T.cond_warn:v<=1000?T.cond_gold:T.cond_pos;
  const nowY = new Date().getFullYear(), nowM = new Date().getMonth();
  const isCurrent = year===nowY && month===nowM;
  const isFuture  = year>nowY || (year===nowY && month>nowM);
  const isLight = T.themeName==="light"||T.themeName==="ios"||T.themeName==="material"||T.themeName==="paper"||T.themeName==="dkb"||T.themeName==="sand"||T.themeName==="clean"||T.themeName==="brutalist"||T.themeName==="swiss";
  const subClr = isLight?"rgba(0,0,0,0.45)":T.txt2;
  const ksColor = displayColor(displayKs);
  const showPrognose = true; // Auch für vergangene Monate die Prognose-Zeile zeigen (mit echten Werten)
  const saldoColor = v => v===null?T.txt2:v<0?T.cond_neg:v<=500?T.cond_warn:v<=1000?T.cond_gold:T.cond_pos;
  const ms = buchInE - buchOutE;
  const [progDrill, setProgDrill] = React.useState(null);
  // Echte Konto-Prognose-Werte für Mitte/Ende — als useMemo damit Hero und Drilldown gleich rechnen
  // - selAcc: getProgEndeAcc für dieses Konto
  // - Gesamt: Σ über alle Konten:
  //     E = getProgEndeAcc(year, month, accId)
  //     M = Vormonats-Endsaldo(accId) + Bewegungen(y,m,accId,date<=14)
  //   Für Giro ist Bewegungen-bis-Mitte = prognoseMitte - Vormonats-Giro-Ende (= Budget-Floor-Logik aus DashboardScreen).
  //   Für andere Konten = Σ signAmt(tx) der Tx in y/m mit date<=14.
  const accProg = React.useMemo(()=>{
    if(!showPrognose) return {M:null, E:null};
    // NEU: prognoseMitte/Ende werden vom Aufrufer (MonatScreen/Dashboard) als
    // konto-spezifische oder Gesamt-Werte aus saldoAt() berechnet. Wir nutzen
    // sie direkt, ohne eigene parallele Berechnung. Single Source of Truth.
    if(selAcc) {
      if(ksAcc[selAcc]===null||ksAcc[selAcc]===undefined) return {M:prognoseMitte, E:prognoseEnde};
      // Für andere Konten als Giro: prognoseMitte könnte null sein
      // (siehe Aufrufer-Logik in MonatScreen). Dann fallback auf prognoseEnde.
      const M = prognoseMitte != null ? prognoseMitte : prognoseEnde;
      const E = prognoseEnde;
      return {M, E};
    }
    // GESAMT: prognoseMitte/Ende sind bereits Σ saldoAt(Konto) — direkt nutzen
    return {M: prognoseMitte, E: prognoseEnde};
  }, [selAcc, prognoseMitte, prognoseEnde, ksAcc, showPrognose]);
  // Konto-spezifische Prognose-Werte für Warnfarben (wenn selAcc gesetzt)
  const displayPrognoseMitte = React.useMemo(()=>{
    if(!selAcc || !showPrognose) return prognoseMitte;
    if(ksAcc[selAcc]===null||ksAcc[selAcc]===undefined) return prognoseMitte;
    return accProg.M ?? getProgEndeAcc(year, month, selAcc);
  }, [selAcc, prognoseMitte, year, month, ksAcc, showPrognose, accProg]);
  const displayPrognoseEnde = React.useMemo(()=>{
    if(!selAcc || !showPrognose) return prognoseEnde;
    if(ksAcc[selAcc]===null||ksAcc[selAcc]===undefined) return prognoseEnde;
    return accProg.E ?? getProgEndeAcc(year, month, selAcc);
  }, [selAcc, prognoseEnde, year, month, ksAcc, showPrognose, accProg]);

  // ── TERMINAL LAYOUT ──────────────────────────────────────────────────────
  if(T.themeName==="terminal") {
    const G = T.pos;
    const R = T.neg;
    const A = T.txt;
    const D = T.txt2;
    const fmtT = v => v>0 ? fmt(v) : "─";
    const saldo = ks!==null ? ks : ms;
    const saldoStr = (saldo>=0?"+":"-") + fmt(Math.abs(saldo)) + " EUR";
    const saldoC = saldo<0?R:saldo<=500?T.gold:G;
    const MONTHS_ABBR=["JAN","FEB","MAR","APR","MAI","JUN","JUL","AUG","SEP","OKT","NOV","DEZ"];
    const monthStr = MONTHS_ABBR[month]+" "+year;

    // Zeile: Label linksbündig, 2 Werte rechtsbündig — kein Box-Rahmen, nur Hintergrund
    const Row2 = ({label, vIn, vOut, cIn, cOut, onIn, onOut, dim}) => (
      <div style={{display:"flex",alignItems:"baseline",padding:"1px 12px",
        opacity:dim?0.65:1}}>
        <span style={{color:D,fontSize:10,minWidth:88,letterSpacing:0.5}}>{label}</span>
        <span onClick={vIn>0&&onIn?onIn:undefined}
          style={{color:cIn||G,fontSize:12,fontWeight:700,flex:1,textAlign:"right",
            fontFamily:NUM_FONT,cursor:vIn>0&&onIn?"pointer":"default"}}>
          {vIn>0?"+"+fmtT(vIn):fmtT(0)}
        </span>
        <span style={{color:D,fontSize:10,padding:"0 8px"}}>/</span>
        <span onClick={vOut>0&&onOut?onOut:undefined}
          style={{color:cOut||R,fontSize:12,fontWeight:700,flex:1,textAlign:"right",
            fontFamily:NUM_FONT,cursor:vOut>0&&onOut?"pointer":"default"}}>
          {vOut>0?"-"+fmtT(vOut):fmtT(0)}
        </span>
      </div>
    );

    return (
      <div style={{margin:"0",background:"#0D0D0D",fontFamily:NUM_FONT}}>
        {/* Saldo-Block — eigener dunkler Hintergrund, keine Umrandung */}
        <div style={{background:"#111",padding:"10px 12px 8px",
          borderBottom:`1px solid ${G}22`}}>
          <div style={{color:D,fontSize:9,letterSpacing:2,marginBottom:2}}>
            {">"} SALDO {ks!==null?"[kumuliert]":"[monatlich]"} :: {monthStr}
          </div>
          <div style={{color:saldoC,fontSize:32,fontWeight:700,letterSpacing:-1,lineHeight:1}}>
            {saldoStr}
          </div>
        </div>
        {/* Datenzeilen — nur durch vertikalen Rhythmus gegliedert */}
        <div style={{padding:"6px 0 4px"}}>
          <div style={{color:D,fontSize:9,letterSpacing:2,padding:"0 12px",marginBottom:3}}>
            {"// EINNAHMEN / AUSGABEN"}
          </div>
          <Row2 label="BUCHUNGEN" vIn={buchInE} vOut={buchOutE}
            onIn={buchInE>0&&onDrillBuchIn?()=>onDrillBuchIn(false):null}
            onOut={buchOutE>0&&onDrillBuchOut?()=>onDrillBuchOut(false):null}/>
          {(pendInE>0||pendOutE>0)&&(
            <Row2 label="VORMERKUNG" vIn={pendInE} vOut={pendOutE}
              cIn={G+"99"} cOut={R+"99"} dim
              onIn={pendInE>0&&onDrillPendIn?()=>onDrillPendIn(false):null}
              onOut={pendOutE>0&&onDrillPendOut?()=>onDrillPendOut(false):null}/>
          )}
          {(uInE>0||uOutE>0)&&(
            <Row2 label="UNKAT." vIn={uInE} vOut={uOutE}
              cIn={T.gold} cOut={T.gold} dim/>
          )}
        </div>
        {/* Prognose / Saldo-Zeile — eigener Block, leicht heller */}
        {showPrognose ? (
          <div style={{background:"#111",borderTop:`1px solid ${G}22`,padding:"6px 12px 8px"}}>
            <div style={{color:D,fontSize:9,letterSpacing:2,marginBottom:4}}>
              {"// PROGNOSE"}
            </div>
            <div style={{display:"flex",gap:0}}>
              <div style={{flex:1}}>
                <div style={{color:D,fontSize:9,letterSpacing:1,marginBottom:2}}>MITTE</div>
                <div onClick={displayPrognoseMitte!==null?()=>setProgDrill(v=>v==="Mitte"?null:"Mitte"):undefined}
                  style={{color:saldoColor(displayPrognoseMitte),fontSize:16,fontWeight:700,
                    fontFamily:NUM_FONT,cursor:displayPrognoseMitte!==null?"pointer":"default"}}>
                  {displayPrognoseMitte!==null?(displayPrognoseMitte>=0?"+":"-")+fmt(Math.abs(displayPrognoseMitte))+"€":"─"}
                </div>
              </div>
              <div style={{width:1,background:`${G}22`,margin:"0 16px"}}/>
              <div style={{flex:1}}>
                <div style={{color:D,fontSize:9,letterSpacing:1,marginBottom:2}}>ENDE</div>
                <div onClick={displayPrognoseEnde!==null?()=>setProgDrill(v=>v==="Ende"?null:"Ende"):undefined}
                  style={{color:saldoColor(displayPrognoseEnde),fontSize:16,fontWeight:700,
                    fontFamily:NUM_FONT,cursor:displayPrognoseEnde!==null?"pointer":"default"}}>
                  {displayPrognoseEnde!==null?(displayPrognoseEnde>=0?"+":"-")+fmt(Math.abs(displayPrognoseEnde))+"€":"─"}
                </div>
              </div>
            </div>
            {progDrill&&(
              <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${G}22`}}>
                <SaldoPrognose year={year} month={month} txs={[]}
                  detailMitte={detailMitte} detailEnde={detailEnde}
                  saldoMitte={saldoMitte} saldoEnde={saldoEnde}
                  getCat={()=>null} getSub={()=>null}
                  initialOpen={progDrill}/>
              </div>
            )}
          </div>
        ) : (
          <div style={{background:"#111",borderTop:`1px solid ${G}22`,
            padding:"6px 12px",display:"flex",alignItems:"baseline",gap:8}}>
            <span style={{color:D,fontSize:9,letterSpacing:2}}>MONATS-SALDO</span>
            <span style={{color:ms>=0?G:R,fontSize:16,fontWeight:700,fontFamily:NUM_FONT,marginLeft:"auto"}}>
              {(ms>=0?"+":"-")+fmt(Math.abs(ms))+" EUR"}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── BRUTALIST LAYOUT ─────────────────────────────────────────────────────
  if(T.themeName==="brutalist") {
    const BK = "#000000";
    const BY = "#FFEC3E";
    const BR = "#CC0000";
    const BG = "#006600";
    const saldo = ks!==null ? ks : ms;
    const saldoC = saldo<0?BR:BG;
    const MONTHS_ABBR=["JAN","FEB","MRZ","APR","MAI","JUN","JUL","AUG","SEP","OKT","NOV","DEZ"];

    // Kachel: Hintergrund zeigt Zugehörigkeit, kein Einzelrahmen
    const Tile = ({label, val, col, bg, onClick, grow}) => (
      <div onClick={onClick}
        style={{background:bg||"#fff",padding:"8px 10px",
          flex:grow||1,minWidth:0,cursor:onClick?"pointer":"default"}}>
        <div style={{fontSize:8,fontWeight:900,color:col==="#fff"?BK+"88":BK+"66",
          letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{label}</div>
        <div style={{fontSize:16,fontWeight:900,color:col||BK,fontFamily:NUM_FONT,lineHeight:1}}>{val||"—"}</div>
      </div>
    );

    return (
      <div style={{margin:"0",background:BY}}>
        {/* Titel-Streifen — einzige starke Linie: oben und unten je 3px */}
        <div style={{background:BK,padding:"7px 12px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          borderBottom:`3px solid ${BY}`}}>
          <span style={{color:BY,fontWeight:900,fontSize:10,letterSpacing:2}}>
            BUDGET {MONTHS_ABBR[month]} {year}
          </span>
          <span style={{color:saldoC===BR?BR:BY,fontWeight:900,fontSize:22,fontFamily:NUM_FONT}}>
            {(saldo>=0?"+":"-")+fmt(Math.abs(saldo))+" €"}
          </span>
        </div>
        {/* Buchungen-Zeile: 3 Flächen nebeneinander, durch Hintergrundfarbe getrennt */}
        <div style={{display:"flex",gap:2,padding:2,paddingBottom:0}}>
          <Tile label="Einnahmen" val={buchInE>0?"+"+fmt(buchInE):"—"} col={BG}
            bg="#E8FFE8"
            onClick={buchInE>0&&onDrillBuchIn?()=>onDrillBuchIn(false):null}/>
          <Tile label="Ausgaben" val={buchOutE>0?"-"+fmt(buchOutE):"—"} col={BR}
            bg="#FFE8E8"
            onClick={buchOutE>0&&onDrillBuchOut?()=>onDrillBuchOut(false):null}/>
          <Tile label="Saldo" val={(ms>=0?"+":"-")+fmt(Math.abs(ms))} col={ms>=0?BG:BR}
            bg="#FFFFFF"/>
        </div>
        {/* Zeile 2: VM + Prognose — optional, kompakter */}
        {(pendInE>0||pendOutE>0||showPrognose)&&(
          <div style={{display:"flex",gap:2,padding:"2px 2px 0"}}>
            {pendInE>0&&<Tile label="VM. Ein" val={"+"+fmt(pendInE)}
              col={BG+"bb"} bg="#F0FFF0"
              onClick={onDrillPendIn?()=>onDrillPendIn(false):null}/>}
            {pendOutE>0&&<Tile label="VM. Aus" val={"-"+fmt(pendOutE)}
              col={BR+"bb"} bg="#FFF0F0"
              onClick={onDrillPendOut?()=>onDrillPendOut(false):null}/>}
            {showPrognose&&<>
              <Tile label="Prog. Mitte"
                val={displayPrognoseMitte!==null?(displayPrognoseMitte>=0?"+":"-")+fmt(Math.abs(displayPrognoseMitte)):"—"}
                col={saldoColor(displayPrognoseMitte)} bg="#FAFAFA"
                onClick={displayPrognoseMitte!==null?()=>setProgDrill(v=>v==="Mitte"?null:"Mitte"):null}/>
              <Tile label="Prog. Ende"
                val={displayPrognoseEnde!==null?(displayPrognoseEnde>=0?"+":"-")+fmt(Math.abs(displayPrognoseEnde)):"—"}
                col={saldoColor(displayPrognoseEnde)} bg="#F5F5F5"
                onClick={displayPrognoseEnde!==null?()=>setProgDrill(v=>v==="Ende"?null:"Ende"):null}/>
            </>}
          </div>
        )}
        {progDrill&&(
          <div style={{background:"#fff",padding:8,margin:"2px 2px 0"}}>
            <SaldoPrognose year={year} month={month} txs={[]}
              detailMitte={detailMitte} detailEnde={detailEnde}
              saldoMitte={saldoMitte} saldoEnde={saldoEnde}
              getCat={()=>null} getSub={()=>null}
              initialOpen={progDrill}/>
          </div>
        )}
        {/* untere Abschlusslinie */}
        <div style={{height:3,background:BK,marginTop:2}}/>
      </div>
    );
  }

  // ── DEFAULT / ALLE ANDEREN THEMES ───────────────────────────────────────
  const tapStyle = {cursor:"pointer",borderRadius:8,transition:"background 0.1s"};
  const LBL_W = 42;
  const Val = ({v, clr, dim}) => (
    <div style={{flex:1,textAlign:"center"}}>
      <span style={{color:clr,fontSize:17,fontWeight:700,opacity:dim?0.55:1}}>
        {v>0?fmt(v):"–"}
      </span>
    </div>
  );
  const HalfCell = ({vIn, vOut, clrIn, clrOut, dim, isMitte, onTapIn, onTapOut}) => (
    <div style={{flex:2,display:"flex"}}>
      <div style={{flex:1,textAlign:"center",...(onTapOut&&vOut>0?tapStyle:{}),padding:"3px 0"}}
        onClick={vOut>0&&onTapOut?()=>onTapOut(isMitte):undefined}>
        <Val v={vOut} clr={clrOut||T.neg} dim={dim}/>
      </div>
      <div style={{flex:1,textAlign:"center",...(onTapIn&&vIn>0?tapStyle:{}),padding:"3px 0"}}
        onClick={vIn>0&&onTapIn?()=>onTapIn(isMitte):undefined}>
        <Val v={vIn} clr={clrIn||T.pos} dim={dim}/>
      </div>
    </div>
  );
  const Row = ({label, mIn, mOut, eIn, eOut, clrIn, clrOut, onTapIn, onTapOut}) => (
    <div style={{display:"flex",alignItems:"center",marginBottom:6}}>
      <HalfCell vIn={mIn} vOut={mOut} clrIn={clrIn} clrOut={clrOut}
        dim={true} isMitte={true} onTapIn={onTapIn} onTapOut={onTapOut}/>
      <div onClick={()=>setShowDetail(false)}
        style={{width:LBL_W,flexShrink:0,textAlign:"center",color:subClr,fontSize:10,cursor:"pointer"}}>{label}</div>
      <HalfCell vIn={eIn} vOut={eOut} clrIn={clrIn} clrOut={clrOut}
        dim={false} isMitte={false} onTapIn={onTapIn} onTapOut={onTapOut}/>
    </div>
  );
  // Konto-Label fürs Center (GESAMT/GIRO/TAGESGELD ...)
  const accLabel = selAcc===null
    ? "GESAMT"
    : (accounts.find(a=>a.id===selAcc)?.name?.toUpperCase() || "");
  const accLabelColor = selAcc===null ? T.txt2 : T.blue;

  const PrognoseRow = ({pm, pe}) => (
    <>
      {/* Drei-Spalten-Zeile: MITTE | GESAMT/GIRO | ENDE */}
      <div style={{display:"flex",alignItems:"baseline"}}>
        <div style={{flex:1,textAlign:"center",color:T.mid,fontSize:9,fontWeight:700,letterSpacing:2,opacity:0.7}}>MITTE</div>
        {/* Kontoname + Umschalter sind jetzt in der ersten Zeile (oben) — Mitte bleibt frei */}
        <div style={{flex:1}}/>
        <div style={{flex:1,textAlign:"center",color:T.gold,fontSize:9,fontWeight:700,letterSpacing:2,opacity:0.7}}>ENDE</div>
      </div>
      {/* Werte-Zeile: PrognoseM | Prog. (Toggle) | PrognoseE */}
      <div style={{display:"flex",alignItems:"baseline"}}>
        <div style={{flex:1,textAlign:"center",padding:"2px 0",cursor:pm!==null?"pointer":"default"}}
          onClick={()=>{if(pm!==null)setProgDrill(v=>v==="Mitte"?null:"Mitte");}}>
          <span style={{color:saldoColor(pm),fontSize:17,fontWeight:800}}>
            {pm!==null?fmt(pm)+" €":"–"}
          </span>
        </div>
        <div style={{flex:1,textAlign:"center",cursor:"pointer"}}
          onClick={()=>setShowDetail(v=>!v)}
          title={showDetail?"Details ausblenden":"Details anzeigen"}>
          <span style={{color:T.txt2,fontSize:10,fontWeight:700,
            display:"inline-flex",alignItems:"center",gap:3,userSelect:"none"}}>
            Prog. {Li(showDetail?"chevron-up":"chevron-down",10,T.txt2)}
          </span>
        </div>
        <div style={{flex:1,textAlign:"center",padding:"2px 0",cursor:pe!==null?"pointer":"default"}}
          onClick={()=>{if(pe!==null)setProgDrill(v=>v==="Ende"?null:"Ende");}}>
          <span style={{color:saldoColor(pe),fontSize:17,fontWeight:800}}>
            {pe!==null?fmt(pe)+" €":"–"}
          </span>
        </div>
      </div>
      {progDrill&&(()=>{
        const filterDetail = (detail) => {
          if(!detail) return detail;
          // Sparplan-Transfers immer separat sammeln (kontosspezifisch)
          const sparTransfers = (detail.unbudgetedPend||[]).filter(t=>
            t._linkedTo && (t.desc||"").startsWith("Sparen·")
          );
          
          // FIX: Wenn unbudgetedRealTxs/Pend LEER sind, sammle sie aus txs
          let unbudgetedRealTxs = detail.unbudgetedRealTxs||[];
          let unbudgetedPend = detail.unbudgetedPend||[];
          if(unbudgetedRealTxs.length === 0 && unbudgetedPend.length === 0) {
            // Sammle alle Tx des ganzen Monats (half-Info nicht verfügbar hier)
            const lastDay = new Date(year, month + 1, 0).getDate();
            unbudgetedRealTxs = (txs||[]).filter(t => {
              if(t.pending || t._budgetSubId) return false;
              const d = new Date(t.date);
              return d.getFullYear() === year && d.getMonth() === month && d.getDate() <= lastDay;
            });
            unbudgetedPend = (txs||[]).filter(t => {
              if(!t.pending || t._budgetSubId) return false;
              const d = new Date(t.date);
              return d.getFullYear() === year && d.getMonth() === month && d.getDate() <= lastDay;
            });
          }
          
          if(!selAcc) {
            // Gesamt: Auch hier Fallback für leere unbudgetedTxs anwenden!
            let gesamtRealTxs = unbudgetedRealTxs;
            let gesamtPendTxs = unbudgetedPend;
            if(gesamtRealTxs.length === 0 && gesamtPendTxs.length === 0) {
              const lastDay = new Date(year, month + 1, 0).getDate();
              gesamtRealTxs = (txs||[]).filter(t => {
                if(t.pending || t._budgetSubId) return false;
                const d = new Date(t.date);
                return d.getFullYear() === year && d.getMonth() === month && d.getDate() <= lastDay;
              });
              gesamtPendTxs = (txs||[]).filter(t => {
                if(!t.pending || t._budgetSubId) return false;
                const d = new Date(t.date);
                return d.getFullYear() === year && d.getMonth() === month && d.getDate() <= lastDay;
              });
            }
            // Gesamt: alle Transaktionen (Umbuchungen werden im Render gruppiert)
            return {...detail, unbudgetedRealTxs: gesamtRealTxs, unbudgetedPend: gesamtPendTxs};
          }
          const isSpar = t => (t.desc||"").startsWith("Sparen·");
          const isAcc = t => t.accountId===selAcc || (!t.accountId && selAcc==="acc-giro") || (isSpar(t) && t._linkedTo && t.accountId===selAcc);
          // Kontosspezifische Buchungen + Sparplan-Transfers für dieses Konto
          const filteredRealTxs = unbudgetedRealTxs.filter(t=>isAcc(t)||((t._linkedTo||(t.desc||"").startsWith("Sparen·"))&&isAcc(t)));
          const filteredPend    = unbudgetedPend.filter(t=>isAcc(t));
          const getTxType = t => {
            if(t._csvType) return t._csvType;
            const sp=(t.splits||[]).filter(s=>s.catId);
            if(sp.length>0){const c=cats?.find(c=>c.id===sp[0].catId);if(c)return(c.type==="income"||c.type==="tagesgeld")?"income":"expense";}
            return t.totalAmount>=0?"income":"expense";
          };
          const filteredRealIn  = filteredRealTxs.filter(t=>getTxType(t)==="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);
          const filteredRealOut = filteredRealTxs.filter(t=>getTxType(t)!=="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);
          const filteredPendIn  = filteredPend.filter(t=>getTxType(t)==="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);
          const filteredPendOut = filteredPend.filter(t=>getTxType(t)!=="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);
          return {
            ...detail,
            realIn:  filteredRealIn,
            realOut: filteredRealOut,
            pendIn:  filteredPendIn,
            pendOut: filteredPendOut,
            totalIn:  filteredRealIn  + filteredPendIn,
            totalOut: filteredRealOut + filteredPendOut,
            unbudgetedRealTxs: filteredRealTxs,
            unbudgetedPend:    filteredPend,
            budgetEntries: detail.budgetEntries||[],
          };
        };
        const prevY2=month===0?year-1:year, prevM2=month===0?11:month-1;
        // base: konto-spezifisch oder Gesamt direkt aus detailMitte/Ende.base übernehmen
        // (das wird vom Aufrufer ueber saldoAt korrekt befuellt, auch fuer Gesamt).
        // Frueher wurde hier fuer Gesamt der Giro-Anker hardgecoded — das war ein Workaround
        // aus der Zeit vor dem Saldo-Refactor und wird nicht mehr gebraucht.
        const accBase = selAcc
          ? getProgEndeAcc(prevY2, prevM2, selAcc)
          : null; // Gesamt: detailMitte.base/detailEnde.base nutzen
        // Konto-spezifische Mitte/Ende-Werte aus accProg useMemo (oben berechnet)
        const accSaldoMitte = accProg.M;
        const accSaldoEnde  = accProg.E;
        const detM = detailMitte ? {...filterDetail(detailMitte), base: accBase ?? filterDetail(detailMitte)?.base} : null;
        const detE = detailEnde  ? {...filterDetail(detailEnde),  base: accBase ?? filterDetail(detailEnde)?.base}  : null;
        return <SaldoPrognose year={year} month={month} txs={[]}
          detailMitte={detM} detailEnde={detE}
          saldoMitte={accSaldoMitte}
          saldoEnde={accSaldoEnde}
          getCat={()=>null} getSub={()=>null}
          initialOpen={progDrill}/>;
      })()}
    </>
  );
  return (
    <div style={{margin:"0",background:T.hero_bg,
      borderRadius:0,padding:"0",position:"relative",overflow:"hidden"}}>
      <div style={{position:"relative",margin:"0",padding:"2px 14px 4px"}}>
        {/* Erste Zeile (wie im alten Hero): Kontoname links, aktueller Kontostand
            rechts. Tippen auf die Zeile wechselt direkt durch die Konten. */}
        <div onClick={()=>{
            if(allAccIds.length<=1) return;
            const idx = allAccIds.indexOf(selAcc);
            setSelAcc(allAccIds[(idx+1)%allAccIds.length]);
          }}
          style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,
            cursor:allAccIds.length>1?"pointer":"default",userSelect:"none"}}
          title={allAccIds.length>1?"Konto wechseln":undefined}>
          <span style={{fontSize:28,fontWeight:800,letterSpacing:0.5,color:accLabelColor,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}}>
            {accLabel}
          </span>
          <span style={{fontSize:40,fontWeight:800,letterSpacing:-1,color:ksColor,
            whiteSpace:"nowrap",flexShrink:0}}>
            {displayKs!==null ? fmt(Math.abs(displayKs))+" €" : selAcc ? "—" : fmt(Math.abs(ms))+" €"}
          </span>
        </div>
        {showPrognose ? (()=>{
          if(!selAcc) {
            // Gesamt: accProg liefert die korrekten Gesamt-Werte (Σ saldoAt je Konto)
            return <PrognoseRow pm={accProg.M ?? prognoseMitte} pe={accProg.E ?? prognoseEnde}/>;
          }
          if(!ksAcc[selAcc] && ksAcc[selAcc] !== 0) return null; // Kein Ankerpunkt → keine Prognose
          // Konto-spezifische Fallback-Werte aus der zentralen Engine (saldoMitte/
          // saldoEnde, Single Source of Truth). Props vom Aufrufer (Dashboard/Monat)
          // haben Vorrang, damit Hero und Buchungsliste konsistent bleiben. Früher:
          // lokale calcAcc-Reimplementierung — Äquivalenz/Divergenzen dokumentiert in
          // tests/prognose_equivalence.test.js.
          const rE = calcSaldoEnde(year, month, selAcc, _saldoCtx);
          if(rE===null||rE===undefined) return null;
          const rM = calcSaldoMitte(year, month, selAcc, _saldoCtx);
          return <PrognoseRow pm={prognoseMitte ?? rM} pe={prognoseEnde ?? rE}/>;

        })() : (selAcc && displayKs===null) ? null : <div style={{display:"flex",alignItems:"center"}}>
              <div style={{flex:2,textAlign:"center"}}>
                <span style={{color:ms>=0?T.pos:T.neg,fontSize:17,fontWeight:800}}>{fmt(Math.abs(ms))} €</span>
              </div>
              <div style={{width:LBL_W,flexShrink:0,textAlign:"center",color:subClr,fontSize:10,fontWeight:700}}>Saldo</div>
              <div style={{flex:2}}/>
            </div>}
      </div>
      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:0}}>
        {showDetail&&<div>
        {(()=>{
          // Wenn kein Konto gewählt → Props nutzen (Gesamt)
          if(!selAcc) return (<>
            <Row label="Buch." mIn={buchInM} mOut={buchOutM} eIn={buchInE} eOut={buchOutE}
              onTapIn={onDrillBuchIn} onTapOut={onDrillBuchOut}/>
            {(pendInE>0||pendOutE>0)&&<Row label="VM"
              mIn={pendInM} mOut={pendOutM} eIn={pendInE} eOut={pendOutE}
              clrIn={T.pos+"aa"} clrOut={T.neg+"aa"}
              onTapIn={onDrillPendIn} onTapOut={onDrillPendOut}/>}
            {(uInE>0||uOutE>0)&&<Row label="unkat."
              mIn={uInM} mOut={uOutM} eIn={uInE} eOut={uOutE}
              clrIn={T.gold} clrOut={T.gold}
              onTapIn={onDrillUncatIn} onTapOut={onDrillUncatOut}/>}
          </>);
          // Konto-spezifisch: Buchungen nach accountId filtern
          const inM = t => { const d=new Date(t.date); return d.getFullYear()===year&&d.getMonth()===month; };
          const isAcc = t => t.accountId===selAcc;
          const bis14 = t => new Date(t.date).getDate()<=14;
          const txType = t => t._csvType || (t.totalAmount>=0?"income":"expense");
          const linkedChildIds = new Set();
          (txs||[]).forEach(t=>(t.linkedIds||[]).forEach(id=>linkedChildIds.add(id)));
          // Für Giro: _linkedTo ausschließen (Transfer-Gegenstücke). Für andere Konten: einbeziehen (Sparplan-Zugänge)
          const isGiro = selAcc==="acc-giro";
          const allM = (txs||[]).filter(t=>inM(t)&&isAcc(t)&&(!isGiro||!t._linkedTo)&&!linkedChildIds.has(t.id));
          const realIn  = allM.filter(t=>!t.pending&&txType(t)==="income");
          const realOut = allM.filter(t=>!t.pending&&txType(t)!=="income");
          const pendIn  = allM.filter(t=>t.pending&&txType(t)==="income");
          const pendOut = allM.filter(t=>t.pending&&txType(t)!=="income");
          const uIn  = allM.filter(t=>txType(t)==="income"&&((t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId)));
          const uOut = allM.filter(t=>txType(t)!=="income"&&((t.splits||[]).length===0||(t.splits||[]).every(s=>!s.catId)));
          const s = arr => arr.reduce((s,t)=>s+Math.abs(t.totalAmount||0),0);
          // Mitte abgelaufen wenn aktueller Monat und heute > 14, oder vergangener Monat
          const todayD2 = new Date().getDate();
          const mitteAbg = (isCurrent && todayD2 > 14) || (!isCurrent && !isFuture);
          const bIM=s(realIn.filter(bis14)), bOM=s(realOut.filter(bis14));
          const bIE=s(realIn), bOE=s(realOut);
          // VM Mitte: wenn Mitte abgelaufen → keine Platzhalter; sonst nur _mitte-Platzhalter
          const accPendInM  = mitteAbg ? [] : pendIn.filter(t=>bis14(t)&&(!t._budgetSubId||t._budgetSubId.endsWith("_mitte")));
          const accPendOutM = mitteAbg ? [] : pendOut.filter(t=>bis14(t)&&(!t._budgetSubId||t._budgetSubId.endsWith("_mitte")));
          const pIM=s(accPendInM), pOM=s(accPendOutM);
          const pIE=s(pendIn), pOE=s(pendOut);
          const uIM=s(uIn.filter(bis14)), uOM=s(uOut.filter(bis14));
          const uIE=s(uIn), uOE=s(uOut);
          const sum = arr => arr.reduce((s,t)=>s+Math.abs(t.totalAmount||0),0);
          const drill = (label, list, isIncome, isPending=false) => {
            if(onDrill) onDrill({label, txList:list, isIncome, uncatCount:isPending?0:list.filter(t=>(t.splits||[]).every(s=>!s.catId)).length, cat:null, total:isPending?sum(list):sum(list), isPending});
            else if(isIncome) { if(isPending) onDrillPendIn&&onDrillPendIn(false); else onDrillBuchIn&&onDrillBuchIn(false); }
            else { if(isPending) onDrillPendOut&&onDrillPendOut(false); else onDrillBuchOut&&onDrillBuchOut(false); }
          };
          return (<>
            <Row label="Buch." mIn={bIM} mOut={bOM} eIn={bIE} eOut={bOE}
              onTapIn={(isMitte)=>drill("Einnahmen"+(isMitte?" bis 14.":""), isMitte?realIn.filter(bis14):realIn, true)}
              onTapOut={(isMitte)=>drill("Ausgaben"+(isMitte?" bis 14.":""), isMitte?realOut.filter(bis14):realOut, false)}/>
            {(pIE>0||pOE>0)&&<Row label="VM" mIn={pIM} mOut={pOM} eIn={pIE} eOut={pOE}
              clrIn={T.pos+"aa"} clrOut={T.neg+"aa"}
              onTapIn={(isMitte)=>drill("Einnahmen – VM"+(isMitte?" bis 14.":""), isMitte?accPendInM:pendIn, true, true)}
              onTapOut={(isMitte)=>drill("Ausgaben – VM"+(isMitte?" bis 14.":""), isMitte?accPendOutM:pendOut, false, true)}/>}
            {(uIE>0||uOE>0)&&<Row label="unkat." mIn={uIM} mOut={uOM} eIn={uIE} eOut={uOE}
              clrIn={T.gold} clrOut={T.gold}
              onTapIn={(isMitte)=>drill("Einnahmen – unkat."+(isMitte?" bis 14.":""), isMitte?uIn.filter(bis14):uIn, true)}
              onTapOut={(isMitte)=>drill("Ausgaben – unkat."+(isMitte?" bis 14.":""), isMitte?uOut.filter(bis14):uOut, false)}/>}
          </>);
        })()}
        </div>}{/* end showDetail */}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── SaldoPrognose: Mitte/Ende Prognose mit Drilldown ────────────────

export { SaldoHero2 };
