// Wiederverwendbarer Hero der cleanen Dashboard-Variante (ehem. inline in
// DashboardScreenV2). Wird im Dashboard UND in der Monatsansicht genutzt.
//
// Datenwerte (Buch/VM/unkat, Prognose, Detail) sowie die Drill-Handler kommen
// als Props vom jeweiligen Screen. Der Aufklapp-Zustand (detailsOpen) wird
// kontrolliert übergeben (im Dashboard steuert er zusätzlich die Kategorie-
// Pillen); der Prognose-Drilldown (progDrill) ist intern.

import React, { useContext, useState } from "react";
import { SaldoPrognose } from "./SaldoPrognose.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { amtStyle } from "../../theme/amtPill.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function SaldoHeroV2({
  year, month,
  buchInM, buchOutM, buchInE, buchOutE,
  pendInM, pendOutM, pendInE, pendOutE,
  uInM, uOutM, uInE, uOutE,
  prognoseMitte, prognoseEnde, detailMitte, detailEnde, saldoMitte, saldoEnde,
  onDrillBuchIn, onDrillBuchOut, onDrillPendIn, onDrillPendOut, onDrillUncatIn, onDrillUncatOut,
  detailsOpen, setDetailsOpen,
}) {
  const { selAcc, setSelAcc, accounts, getKumulierterSaldo, txs, getCat, getSub, amtMode, setAmtMode } = useContext(AppCtx);
  const [progDrill, setProgDrill] = useState(null);
  // Augensymbol: nur 2 Stufen — unscharf (0) ↔ sichtbar. Sichtbar ist neutral-
  // weiß (1), solange der Detail-Block eingeklappt ist; farbig (2) nur, wenn er
  // über das Ausklapp-Chevron geöffnet wurde.
  const toggleEye = (e) => { e.stopPropagation(); setAmtMode?.(m => m===0 ? (detailsOpen?2:1) : 0); };
  const eyeIcon = amtMode===0 ? "eye-off" : "eye";
  const eyeCol  = amtMode===0 ? T.txt2 : T.txt;
  // Ausklappen schaltet im sichtbaren Zustand zugleich die Farbe ein/aus.
  const toggleDetails = () => {
    setDetailsOpen(v => {
      const nv = !v;
      setAmtMode?.(m => m===0 ? 0 : (nv ? 2 : 1));
      return nv;
    });
  };

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
  // Aktueller Kontostand (großer Wert): an die Akzentfarbe angeglichen.
  // Negativ bleibt rot — ein Minus-Saldo soll nicht in der Markenfarbe
  // "unsichtbar" werden.
  const heroColor = v => v==null?T.txt : v<0?T.cond_neg : T.blue;
  // Mitte/Ende-Prognose behalten die Schwellwert-Ampel (<0 neg · ≤500 warn · ≤1000 gold · sonst pos).
  const saldoCol  = v => v==null?T.txt2:v<0?T.cond_neg:v<=500?T.cond_warn:v<=1000?T.cond_gold:T.cond_pos;

  // Mini-Zelle für Detail-Werte (Out|In Paar)
  const HalfCell = ({vIn, vOut, clrIn, clrOut, dim, isMitte, onTapIn, onTapOut}) => (
    <div style={{flex:1,display:"flex",alignItems:"baseline"}}>
      <div style={{flex:1,textAlign:"center",cursor:vOut>0&&onTapOut?"pointer":"default",padding:"2px 0",opacity:dim?0.65:1}}
        onClick={vOut>0&&onTapOut?()=>onTapOut(isMitte):undefined}>
        {vOut>0
          ? <span style={{...amtStyle("neg",clrOut||T.neg),fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>{fmt(vOut)}</span>
          : <span style={{color:T.txt2,fontSize:20}}>—</span>}
      </div>
      <div style={{flex:1,textAlign:"center",cursor:vIn>0&&onTapIn?"pointer":"default",padding:"2px 0",opacity:dim?0.65:1}}
        onClick={vIn>0&&onTapIn?()=>onTapIn(isMitte):undefined}>
        {vIn>0
          ? <span style={{...amtStyle("pos",clrIn||T.pos),fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>{fmt(vIn)}</span>
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
    <div style={{padding:"5px 20px 6px",position:"relative"}}>
      {/* Zeile 1: aktueller Kontostand groß & zentriert. Tippen auf den Betrag
          wechselt durch die Konten. Direkt rechts daneben — vertikal zentriert —
          das Augensymbol (unscharf ↔ sichtbar). Der Kontoname sitzt klein/
          zentriert in der MITTE/ENDE-Zeile. */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",
        gap:8,userSelect:"none"}}>
        <span onClick={allAccIds.length>1?cycleAcc:undefined} className="heroAmt"
          style={{
            color: heroColor(saldo),
            fontSize:48,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
            letterSpacing:-1,lineHeight:1.1,
            WebkitTextStroke:"0.8px currentColor",
            cursor:allAccIds.length>1?"pointer":"default",
          }}>
          {saldo>=0?"":"−"}{fmtMoney(Math.abs(saldo||0))} €
        </span>
        <span onClick={toggleEye} title="Beträge ein-/ausblenden"
          style={{cursor:"pointer",userSelect:"none",flexShrink:0,
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            padding:"4px"}}>
          {Li(eyeIcon,18,eyeCol)}
        </span>
      </div>

      {/* Zeile 2: MITTE | ENDE — zwei flex:1-Hälften (6px-Gap), Kontoname + Caret
          als mittiges Overlay (beansprucht keine Spaltenbreite, damit die
          Beträge über den Kategorie-Pillen fluchten). */}
      <div style={{display:"flex",gap:6,marginTop:2,padding:"0 1px",
        alignItems:"stretch",position:"relative"}}>
        {/* Mitte-Spalte — Klickfläche nur um den Text (inline-block), damit sie
            nicht bis zum mittigen Ausklapp-Chevron reicht. Spaltenbreite, Text-
            position und der Highlight bleiben unverändert. */}
        <div style={{flex:1,textAlign:"center",padding:"2px 0 4px"}}>
          <div onClick={()=>setProgDrill(v=>v==="Mitte"?null:"Mitte")}
            style={{display:"inline-block",cursor:"pointer",borderRadius:8,padding:"0 10px",
              background: progDrill==="Mitte" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
            <div style={{color:T.mid||T.txt2,fontSize:9,fontWeight:700,
              letterSpacing:2,opacity:0.7,marginBottom:2}}>MITTE</div>
            <div className="heroAmt" style={{color: saldoCol(prognoseMitte),
              fontSize:20,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>
              {prognoseMitte>=0?"":"−"}{fmtMoney(Math.abs(prognoseMitte||0))}
            </div>
          </div>
        </div>
        {/* Ende-Spalte — Klickfläche analog nur um den Text. */}
        <div style={{flex:1,textAlign:"center",padding:"2px 0 4px"}}>
          <div onClick={()=>setProgDrill(v=>v==="Ende"?null:"Ende")}
            style={{display:"inline-block",cursor:"pointer",borderRadius:8,padding:"0 10px",
              background: progDrill==="Ende" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
            <div style={{color:T.gold||T.txt2,fontSize:9,fontWeight:700,
              letterSpacing:2,opacity:0.7,marginBottom:2}}>ENDE</div>
            <div className="heroAmt" style={{color: saldoCol(prognoseEnde),
              fontSize:20,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>
              {prognoseEnde>=0?"":"−"}{fmtMoney(Math.abs(prognoseEnde||0))}
            </div>
          </div>
        </div>
        {/* Mittiges Overlay: Kontoname + ⟳-Symbol (Label-Zeile) und großes
            Ausklapp-Chevron (Werte-Zeile). */}
        <div style={{position:"absolute",left:0,right:0,top:0,bottom:0,
          display:"flex",flexDirection:"column",alignItems:"center",
          padding:"2px 0 4px",pointerEvents:"none"}}>
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
          <span onClick={toggleDetails}
            title={detailsOpen?"Details ausblenden":"Details anzeigen"}
            style={{pointerEvents:"auto",cursor:"pointer",userSelect:"none",opacity:0.75,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li(detailsOpen?"chevron-up":"chevron-down",26,T.txt2)}
          </span>
        </div>
      </div>

      {/* Detail-Block: Buch / VM / unkat — drei Zeilen mit Drill-Pfaden */}
      {detailsOpen && (
        <div style={{marginTop:2,paddingTop:6,borderTop:`1px solid ${T.bd}`}}>
          <DetailRow label="Buch."
            mIn={buchInM} mOut={buchOutM} eIn={buchInE} eOut={buchOutE}
            onTapIn={onDrillBuchIn} onTapOut={onDrillBuchOut}/>
          {(pendInE>0||pendOutE>0) && (
            <DetailRow label="VM"
              mIn={pendInM} mOut={pendOutM} eIn={pendInE} eOut={pendOutE}
              clrIn={T.cell_inc} clrOut={T.gold}
              onTapIn={onDrillPendIn} onTapOut={onDrillPendOut}/>
          )}
          {(uInE>0||uOutE>0) && (
            <DetailRow label="unkat."
              mIn={uInM} mOut={uOutM} eIn={uInE} eOut={uOutE}
              clrIn={T.gold} clrOut={T.gold}
              onTapIn={onDrillUncatIn} onTapOut={onDrillUncatOut}/>
          )}
        </div>
      )}

      {/* Prognose-Drilldown (Mitte oder Ende) */}
      {progDrill && (
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.bd}`}}>
          <SaldoPrognose year={year} month={month} txs={[]}
            detailMitte={detailMitte} detailEnde={detailEnde}
            saldoMitte={saldoMitte} saldoEnde={saldoEnde}
            getCat={getCat} getSub={getSub}
            initialOpen={progDrill}/>
        </div>
      )}
    </div>
  );
}

export { SaldoHeroV2 };
