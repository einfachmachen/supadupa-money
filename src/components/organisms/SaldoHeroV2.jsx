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
import { ThemeSwitcherMini } from "../molecules/ThemeSwitcherMini.jsx";

function SaldoHeroV2({
  year, month,
  buchInM, buchOutM, buchInE, buchOutE,
  pendInM, pendOutM, pendInE, pendOutE,
  uInM, uOutM, uInE, uOutE,
  prognoseMitte, prognoseEnde, detailMitte, detailEnde, saldoMitte, saldoEnde,
  onDrillBuchIn, onDrillBuchOut, onDrillPendIn, onDrillPendOut, onDrillUncatIn, onDrillUncatOut,
  detailsOpen, setDetailsOpen, hideDetailRows,
}) {
  const { selAcc, setSelAcc, accounts, getKumulierterSaldo, txs, getCat, getSub, amtMode, setAmtMode } = useContext(AppCtx);
  const [progDrill, setProgDrill] = useState(null);
  const [accMenuOpen, setAccMenuOpen] = useState(false);
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
  // Positiver Kontostand in der Akzentfarbe des +-Buttons (Terminal: pos,
  // sonst blue/lime) — wirkt harmonischer. Negativ bleibt rot.
  const plusAccent = T.themeName==="terminal" ? T.pos : T.blue;
  const heroColor = v => v==null?T.txt : v<0?T.cond_neg : plusAccent;
  // Kinder-Themes: seitliches Hero-Padding sorgt für sichtbaren Abstand zur
  // Deko-Umrandung — auf ALLEN Elementen, die nah an die Kante reichen
  // (Betragszeile UND Theme-Umschalter-Icon oben links), damit der Innenring
  // umlaufend sichtbar bleibt statt an einer Ecke enger zu sein als anderswo.
  // Deutlich großzügiger als in früheren Versuchen (44px statt 28px) — auf
  // echten Geräten rendert der Kontostand-Text u.U. spürbar breiter als im
  // hier verwendeten Test-Chromium, was den gefühlten Randabstand auffrisst,
  // OHNE dass es zu echter Kürzung kommt (die Betragsbox ist per flex-shrink
  // + overflow:hidden hart auf den verfügbaren Platz gedeckelt). Kontostand
  // bleibt bei 34px (fester Wert). Das Auge sitzt in einer eigenen, jetzt
  // schmaleren Zone rechts (eyeZone), DARIN an den äußeren Rand gerückt.
  const framePad = T.frame_border ? 44 : 20;
  const amtFontSize = T.frame_border ? 34 : 44;
  const eyeBoxSize = 30;
  const eyeZoneWidth = T.frame_border ? 50 : (eyeBoxSize + 6);
  const eyeZoneEdgePad = 6; // Abstand vom Auge zum äußeren Zonenrand (Kinder-Themes)
  const sideReserve = eyeZoneWidth;
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
    <div style={{
      padding: `5px ${framePad}px 6px`,
      position:"relative"}}>
      {/* Freier Bereich links oben: minimaler Theme-Umschalter. */}
      {/* position:absolute richtet sich nach der Padding-Kante des Wrappers,
          NICHT nach dessen padding-Wert — der oben erhöhte Innenabstand für
          Kinder-Themes wirkt hier also nicht automatisch; left/right müssen
          separat mit angepasst werden. */}
      <div style={{position:"absolute",top:8,left:T.frame_border?framePad:14,zIndex:2}}>
        <ThemeSwitcherMini/>
      </div>
      {/* Zeile 1: aktueller Kontostand groß & zentriert. Tippen auf den Betrag
          wechselt durch die Konten. Direkt rechts daneben — vertikal zentriert —
          das Augensymbol (unscharf ↔ sichtbar). Der Kontoname sitzt klein/
          zentriert in der MITTE/ENDE-Zeile. */}
      <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",
        userSelect:"none",
        // Kinder-Themes: kappt den Weichzeichner-"Glow" des ausgeblendeten
        // Kontostands (filter:blur) exakt an dieser Zeile, statt ihn frei bis
        // zum Deko-Rahmen bluten zu lassen. Enthält kein Popup/Dropdown (der
        // Theme-Umschalter sitzt in einer eigenen Geschwister-Box), daher
        // unbedenklich zu clippen.
        ...(T.frame_border ? {overflow:"hidden"} : {})}}>
        {/* Linker Platzhalter — exakt so breit wie das Augen-Symbol rechts
            (inkl. dessen Randabstand). Hält den Betrag optisch zentriert.
            Das Auge ist ein normales Flex-Geschwister statt absolut
            positioniert, kann den Betrag also strukturell nie überlappen. */}
        <div style={{width:sideReserve, flexShrink:0, flexGrow:0}}/>
        <span onClick={allAccIds.length>1?cycleAcc:undefined} className="heroAmt heroBalance"
          style={{
            color: heroColor(saldo),
            "--bal-col": heroColor(saldo),
            fontSize:amtFontSize,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
            letterSpacing:-1,lineHeight:1.15,whiteSpace:"nowrap",
            WebkitTextStroke:"0.8px currentColor",
            cursor:allAccIds.length>1?"pointer":"default",
            minWidth:0, flexGrow:0, flexShrink:1, flexBasis:"auto",
            // overflow/textOverflow bleiben ein echter Notnagel für den Fall,
            // dass wirklich kein Platz mehr da ist (z.B. extrem kleines
            // Gerät) — ausgelöst rein durch die Flex-Verteilung, OHNE
            // zusätzliche feste maxWidth. Eine exakte calc()-Deckelung (voriger
            // Versuch) traf bei einem 5-stelligen Betrag auf einem 375pt-
            // Gerät (iPhone 13 mini) exakt die verfügbare Breite (0px Reserve)
            // — jedes Sub-Pixel-Rendering kippte das dann in Kürzung. Deshalb
            // jetzt lieber echte Breiten-Reserve (s. framePad/iconEdgeExtra
            // oben) als eine bis aufs Pixel exakte Formel.
            overflow:"hidden", textOverflow:"ellipsis",
          }}>
          {saldo>=0?"":"−"}{fmtMoney(Math.abs(saldo||0))}&nbsp;€
        </span>
        {/* Auge, Kinder-Themes: sitzt in einer eigenen Zone (eyeZoneWidth),
            DARIN an den äußeren (rechten) Rand gerückt — näher am Rahmen als
            am Betrag, mit spürbarem Abstand zu beiden. Alte Themes: exakt
            der bisherige, unveränderte Aufbau (Auge direkt nach dem Betrag,
            nur mit rechtem Randabstand) — bewusst NICHT auf dieselbe
            Zonen-Box umgestellt, damit sich am alten Pixel-Layout nichts
            verschiebt. */}
        {T.frame_border ? (
          <div style={{width:eyeZoneWidth, flexShrink:0, flexGrow:0,
            display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:eyeZoneEdgePad}}>
            <span onClick={toggleEye} title="Beträge ein-/ausblenden"
              style={{cursor:"pointer",userSelect:"none",width:eyeBoxSize,height:eyeBoxSize,
                display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              {Li(eyeIcon,23,eyeCol)}
            </span>
          </div>
        ) : (
          <span onClick={toggleEye} title="Beträge ein-/ausblenden"
            style={{flexShrink:0,flexGrow:0,marginRight:6,
              cursor:"pointer",userSelect:"none",width:eyeBoxSize,height:eyeBoxSize,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li(eyeIcon,23,eyeCol)}
          </span>
        )}
      </div>

      {/* Zeile 2: MITTE | ENDE — zwei flex:1-Hälften (6px-Gap), Kontoname + Caret
          als mittiges Overlay (beansprucht keine Spaltenbreite, damit die
          Beträge über den Kategorie-Pillen fluchten). Kinder-Themes: eigener
          seitlicher Randabstand (statt nur 1px) PLUS eine harte Breiten-
          Deckelung auf den Werten selbst (maxWidth/overflow/ellipsis) — anders
          als die Betragszeile hatten MITTE/ENDE bisher KEINE solche Deckelung,
          konnten also (v.a. bei abweichender Schriftbreite in echten Browsern)
          über ihre Hälfte hinaus näher an den Rahmen wachsen. */}
      <div style={{display:"flex",gap:6,marginTop:2,padding:T.frame_border?"0 20px":"0 1px",
        alignItems:"stretch",position:"relative"}}>
        {/* Mitte-Spalte — Klickfläche nur um den Text (inline-block), damit sie
            nicht bis zum mittigen Ausklapp-Chevron reicht. Spaltenbreite, Text-
            position und der Highlight bleiben unverändert. */}
        <div style={{flex:1,...(T.frame_border?{minWidth:0}:{}),textAlign:"center",padding:"2px 0 4px"}}>
          <div onClick={()=>setProgDrill(v=>v==="Mitte"?null:"Mitte")}
            style={{display:"inline-block",...(T.frame_border?{maxWidth:"100%",overflow:"hidden"}:{}),cursor:"pointer",borderRadius:8,padding:"0 10px",
              background: progDrill==="Mitte" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
            <div style={{color:T.mid||T.txt2,fontSize:9,fontWeight:700,
              letterSpacing:2,opacity:0.7,marginBottom:2}}>MITTE</div>
            <div className="heroAmt" style={{color: saldoCol(prognoseMitte),
              fontSize:20,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
              ...(T.frame_border?{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}:{})}}>
              {prognoseMitte>=0?"":"−"}{fmtMoney(Math.abs(prognoseMitte||0))}
            </div>
          </div>
        </div>
        {/* Ende-Spalte — Klickfläche analog nur um den Text. */}
        <div style={{flex:1,...(T.frame_border?{minWidth:0}:{}),textAlign:"center",padding:"2px 0 4px"}}>
          <div onClick={()=>setProgDrill(v=>v==="Ende"?null:"Ende")}
            style={{display:"inline-block",...(T.frame_border?{maxWidth:"100%",overflow:"hidden"}:{}),cursor:"pointer",borderRadius:8,padding:"0 10px",
              background: progDrill==="Ende" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
            <div style={{color:T.gold||T.txt2,fontSize:9,fontWeight:700,
              letterSpacing:2,opacity:0.7,marginBottom:2}}>ENDE</div>
            <div className="heroAmt" style={{color: saldoCol(prognoseEnde),
              fontSize:20,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
              ...(T.frame_border?{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}:{})}}>
              {prognoseEnde>=0?"":"−"}{fmtMoney(Math.abs(prognoseEnde||0))}
            </div>
          </div>
        </div>
        {/* Mittiges Overlay: Kontoname + ⟳-Symbol (Label-Zeile) und großes
            Ausklapp-Chevron (Werte-Zeile). */}
        <div style={{position:"absolute",left:0,right:0,top:0,bottom:0,
          display:"flex",flexDirection:"column",alignItems:"center",
          padding:"2px 0 4px",pointerEvents:"none"}}>
          <span style={{position:"relative",display:"inline-flex",alignItems:"center",
            marginBottom:2,pointerEvents:"auto"}}>
            {/* Konto-Pille: Tippen öffnet die Schnellwahl. Durchklicken bleibt
                zusätzlich auf dem großen Kontostand-Betrag erhalten. */}
            <span onClick={allAccIds.length>1?(e)=>{e.stopPropagation();setAccMenuOpen(o=>!o);}:undefined}
              title={allAccIds.length>1?"Konto wählen":undefined}
              style={{display:"inline-flex",alignItems:"center",gap:3,userSelect:"none",lineHeight:1,
                position:"relative",top:"-2px",   // auf die MITTE/ENDE-Label-Linie heben
                cursor:allAccIds.length>1?"pointer":"default",
                background:allAccIds.length>1?"rgba(255,255,255,0.07)":"transparent",
                border:allAccIds.length>1?`1px solid ${T.bd}`:"none",
                borderRadius:999,padding:allAccIds.length>1?"1px 5px 1px 8px":"0",
                color:selAcc===null ? T.txt2 : T.blue,fontSize:10,fontWeight:700,letterSpacing:0.5}}>
              <span style={{maxWidth:118,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{accLabel}</span>
              {allAccIds.length>1 && Li(accMenuOpen?"chevron-up":"chevron-down",13, selAcc===null ? T.txt2 : T.blue)}
            </span>
            {accMenuOpen && (<>
              {/* Klick-außerhalb schließt das Menü */}
              <div onClick={()=>setAccMenuOpen(false)}
                style={{position:"fixed",inset:0,zIndex:49,pointerEvents:"auto"}}/>
              <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",
                marginTop:5,zIndex:50,background:T.surf2||T.surf,border:`1px solid ${T.bds}`,
                borderRadius:10,padding:4,minWidth:150,maxHeight:260,overflowY:"auto",
                boxShadow:"0 10px 28px rgba(0,0,0,0.45)"}}>
                {allAccIds.map(id=>{
                  const a = id===null ? null : accounts.find(x=>x.id===id);
                  const label = id===null ? "Gesamt" : (a?.name||"");
                  const active = selAcc===id;
                  return (
                    <div key={id||"__all__"} onClick={(e)=>{e.stopPropagation();setSelAcc(id);setAccMenuOpen(false);}}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,
                        cursor:"pointer",background:active?(T.blue+"22"):"transparent",
                        color:active?T.blue:T.txt,fontSize:13,fontWeight:active?700:500,whiteSpace:"nowrap"}}>
                      {id===null ? Li("layers",14,active?T.blue:T.txt2) : Li(a?.icon||"wallet",14,a?.color||T.txt2)}
                      <span style={{flex:1}}>{label}</span>
                      {active && Li("check",14,T.blue)}
                    </div>
                  );
                })}
              </div>
            </>)}
          </span>
          <span onClick={toggleDetails}
            title={detailsOpen?"Details ausblenden":"Details anzeigen"}
            style={{pointerEvents:"auto",cursor:"pointer",userSelect:"none",opacity:0.75,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li(detailsOpen?"chevron-up":"chevron-down",26,T.txt2)}
          </span>
        </div>
      </div>

      {/* Detail-Block: Buch / VM / unkat — drei Zeilen mit Drill-Pfaden.
          Im Trend/Jahr (hideDetailRows) ausgeblendet, da dort jährlich gedacht
          und der Monatsbezug fehlt. */}
      {detailsOpen && !hideDetailRows && (
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

      {/* Prognose-Drilldown (Mitte oder Ende) — über das 20px-Hero-Padding hinaus
          ziehen, damit die Liste fast die volle Breite nutzt (Saldo-Anzeige bleibt). */}
      {progDrill && (
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.bd}`,marginLeft:-15,marginRight:-15}}>
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
