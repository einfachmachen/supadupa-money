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
import { fmt, NUM_FONT, darkenHex, lightenHex } from "../../utils/format.js";
import { phaseStillReachable } from "../../utils/saldo.js";
import { Li } from "../../utils/icons.jsx";
import { ThemeSwitcherMini } from "../molecules/ThemeSwitcherMini.jsx";
import { kvStore } from "../../utils/kvStore.js";

function SaldoHeroV2({
  year, month,
  buchInM, buchOutM, buchInE, buchOutE,
  pendInM, pendOutM, pendInE, pendOutE,
  uInM, uOutM, uInE, uOutE,
  prognoseMitte, prognoseEnde, detailMitte, detailEnde, saldoMitte, saldoEnde,
  onDrillBuchIn, onDrillBuchOut, onDrillPendIn, onDrillPendOut, onDrillUncatIn, onDrillUncatOut,
  detailsOpen, setDetailsOpen, hideDetailRows,
  showScrollFocusToggle,
}) {
  const { selAcc, setSelAcc, accounts, getKumulierterSaldo, txs, getCat, getSub, amtMode, setAmtMode, setShowGuidedTour, debugFlags, setDebugFlag } = useContext(AppCtx);
  const [progDrill, setProgDrill] = useState(null);
  const [accMenuOpen, setAccMenuOpen] = useState(false);
  // "?"-Symbol öffnet die interaktive, hervorhebende Tour (GuidedFeatureTour)
  // direkt am konkreten Feature (Spotlight), immer im normalen (nicht Kids-)
  // Modus — den Kids-Modus schaltet man bei Bedarf über das Teddy-Symbol IN
  // der Tour-Karte selbst um (siehe GuidedFeatureTour.jsx).
  const openTour = (e) => { e.stopPropagation(); kvStore.setItem("mbt_tourKids", "0"); setShowGuidedTour?.(true); };
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
  // Negativ = eigene, kräftige Warnfarbe (Hellorange) — ein Minus-Saldo soll
  // nicht in der Markenfarbe "unsichtbar" werden, und Cyan ist jetzt die
  // Ausgabenfarbe, nicht mehr "negativ/Warnung".
  // Positiver Kontostand in der Akzentfarbe des +-Buttons (Terminal: pos,
  // sonst blue/lime) — wirkt harmonischer.
  const plusAccent = T.themeName==="terminal" ? T.pos : T.blue;
  const heroColor = v => v==null?T.txt : v<0?T.warn_icon : plusAccent;
  // Der Deko-Rahmen der Kinder-Themes wird als eigene Overlay-Schicht ÜBER
  // dem gesamten Inhalt gemalt (siehe App.jsx) — der Hero muss also nicht
  // mehr extra Innenabstand reservieren, um den Rahmen freizuhalten.
  // Schriftgröße ist daher wieder identisch zu den alten Themes (44px).
  // framePad ist bei Kinder-Themes um die Border-Breite REDUZIERT: die
  // Border selbst ist (für den Vollbild-Dialog-Containing-Block-Trick) nach
  // wie vor Teil der Haupt-Box und frisst dort echten Platz von der
  // Inhaltsbreite weg — das hier gleicht das wieder aus, damit der Hero bei
  // alten und Kinder-Themes exakt dieselbe nutzbare Breite hat.
  // Die Auge-Zone (mittig zwischen Betrag-Ende und Seitenrand statt direkt
  // am Betrag) gilt jetzt für ALLE Themes — gefiel so gut, dass sie auf
  // Wunsch vereinheitlicht wurde.
  const frameBorderWidth = T.frame_border ? (parseInt(T.frame_border)||0) : 0;
  const framePad = 20 - frameBorderWidth;
  const amtFontSize = 44;
  const eyeBoxSize = 30;
  // midGap: Lücke zwischen MITTE- und ENDE-Hälfte — von BEIDEN Zeilen genutzt
  // (Prognose MITTE|ENDE und den Buch./VM/unkat.-Detailzeilen darunter,
  // dieselbe flex:1+flex:1-Struktur), damit sie weiterhin exakt fluchten.
  // Größer als früher (war 6px): schiebt MITTE samt Prognose M etwas nach
  // links und ENDE samt Prognose E etwas nach rechts, damit die mittigen
  // Overlays (Kontoname/Chevron bzw. die kleinen Symbol-Labels der
  // Detailzeilen) genug Platz haben und nicht mehr die Beträge verdecken
  // (Nutzer-Feedback: "Buch., VM und unkat. verdecken die Beträge").
  const midGap = 32;
  // eyeZoneWidth: reservierte Obergrenze für Betrag + Auge zusammen (siehe
  // Zeile 1 unten) — das Auge selbst hängt dort NICHT mehr in einer fest
  // reservierten, symmetrischen Zone, sondern als absolut positioniertes
  // Geschwister direkt am rechten Rand des Betrags. Dadurch bleibt der
  // Kontostand IMMER exakt zentriert (Nutzer-Wunsch), und das Auge rückt
  // automatisch weiter nach rechts, je breiter der Betrag wird — eyeZoneWidth
  // wirkt nur noch als Sicherheitsmarge (maxWidth des Betrags), damit bei
  // extrem wenig Platz der Betrag per Ellipsis kürzt, statt das Auge aus dem
  // sichtbaren Bereich zu drücken.
  const eyeZoneWidth = 56;
  // Editorial-Layout (Theme-Token hero_layout): linksbündige Schlagzeilen-
  // Anordnung statt zentriert — Kicker-Zeile (Theme-Umschalter, Label,
  // Kontowahl, Auge) oben, großer Betrag links, Prognosen als Ticker-Leiste.
  // Alle anderen Themes rendern unverändert den bisherigen Aufbau.
  const isEditorial = T.hero_layout === "editorial";
  // Mitte/Ende-Prognose: Varianten der Akzentfarbe (dieselbe wie der aktuelle
  // Kontostand) — kräftiger sobald das jeweilige Datum erreicht ist, sonst
  // blasser. Negativ bleibt die eigene Warnfarbe.
  const saldoCol = (v, abg) => v==null ? T.txt2 : v<0 ? T.warn_icon : (abg ? darkenHex(T.blue, 0.15) : lightenHex(T.blue, 0.35));

  // mitteAbgHero/endeAbgHero: nur noch für die Mitte/Ende-Prognose (saldoCol)
  // gebraucht — eine reale Buchung ist immer abgeschlossen (s. bookColHero).
  const _lastDayHero = new Date(year, month+1, 0).getDate();
  const mitteAbgHero = !phaseStillReachable(year, month, 14, {});
  const endeAbgHero  = !phaseStillReachable(year, month, _lastDayHero, {});
  // Reale Buchungen (nicht Vormerkungen) sind ihrer Natur nach immer
  // abgeschlossen — sonst wären sie noch eine Vormerkung. Immer die kräftige
  // Cyan-/Limegreen-Farbe, kein Datumsbezug.
  const bookColHero  = (isInc) => {
    if (isInc) return T.cond_pos;
    return T.cond_neg;
  };

  // Nachkommastellen klein & um 90° nach links (gegen den Uhrzeigersinn)
  // gedreht statt ",XX" in normaler Größe — braucht dadurch nur noch etwa die
  // Breite einer einzelnen Ziffer (Nutzer-Wunsch, für Buch./VM/unkat.-Beträge).
  // Rotation dreht Breite/Höhe: bei kleinerer Schrift wird die ROTIERTE Breite
  // (= ursprüngliche Zeilenhöhe) entsprechend schmal.
  const RotatedCents = ({v}) => {
    const s = fmt(v); // z.B. "3.109,42"
    const i = s.lastIndexOf(",");
    if (i === -1) return s;
    return (<>
      {s.slice(0, i)}
      <span style={{display:"inline-block",fontSize:"0.5em",lineHeight:1,
        transform:"rotate(-90deg)",transformOrigin:"center",verticalAlign:"middle"}}>
        {s.slice(i + 1)}
      </span>
    </>);
  };
  // Ein einzelner Betrags-Slot (Out oder In). Bewusst OHNE flex:1/textAlign-
  // Zwang: die Breite ergibt sich rein aus dem Inhalt, sodass kleine Beträge
  // HalfCell: EINE Hälfte (Mitte oder Ende), nochmal in Out|In geteilt und
  // JEWEILS zur eigenen Halb-Hälfte zentriert — exakt wie die Prognose-Zeile
  // (MITTE|ENDE) ihre beiden flex:1-Spalten intern zentriert (Nutzer-Wunsch:
  // "von dort geteilt Ausgaben/Einnahmen auch wieder zentriert zur jeweiligen
  // Hälfte"). Der Platzhalter-Strich "—" nutzt dieselbe zentrierte Zelle wie
  // ein echter Betrag — dadurch bleibt er nie an den Rändern kleben (Nutzer-
  // Feedback: "Striche sollten nicht ganz links oder rechts sein").
  // cond_neg/cond_pos statt neg/pos als Default: manche Themes definieren "neg"
  // bewusst blass/pastellig (WCAG-Kontrast für kleine Textfarbe auf grauem
  // Grund) — als 20px-Betrag hier wirkt das dann wie Rosa statt Rot
  // (Nutzer-Feedback, betraf konkret die unbeschriftete "Buch."-Zeile; VM/
  // unkat. hatten schon eine eigene, kräftige clrOut/clrIn-Farbe).
  const HalfCell = ({vOut, vIn, clrOut, clrIn, isMitte, onTapOut, onTapIn, rotatedCents}) => (
    <div style={{flex:1,display:"flex",alignItems:"baseline"}}>
      <div style={{flex:1,textAlign:"center",cursor:vOut>0&&onTapOut?"pointer":"default",padding:"2px 0"}}
        onClick={vOut>0&&onTapOut?()=>onTapOut(isMitte):undefined}>
        {vOut>0
          ? <span style={{...amtStyle("neg",clrOut||T.cond_neg),fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>{rotatedCents?<RotatedCents v={vOut}/>:fmt(vOut)}</span>
          : <span style={{color:T.txt2,fontSize:20}}>—</span>}
      </div>
      <div style={{flex:1,textAlign:"center",cursor:vIn>0&&onTapIn?"pointer":"default",padding:"2px 0"}}
        onClick={vIn>0&&onTapIn?()=>onTapIn(isMitte):undefined}>
        {vIn>0
          ? <span style={{...amtStyle("pos",clrIn||T.cond_pos),fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>{rotatedCents?<RotatedCents v={vIn}/>:fmt(vIn)}</span>
          : <span style={{color:T.txt2,fontSize:20}}>—</span>}
      </div>
    </div>
  );
  // DetailRow: bewusst dieselbe flex:1 + flex:1-Struktur (gleicher gap/
  // padding, midGap) wie die Prognose-Zeile (MITTE|ENDE) darüber — dadurch
  // fluchten Buch./VM./unkat. exakt unter MITTE bzw. ENDE (Nutzer-Wunsch).
  // Statt eines Text-Labels (verdeckte bei breiten Beträgen deren Ziffern,
  // Nutzer-Feedback) sitzt jetzt ein kleines SYMBOL als zentriertes Overlay
  // OHNE eigene Spaltenbreite — bleibt dadurch garantiert immer exakt mittig
  // UND ist schmal genug, um selbst bei vollen Zahlen nicht mehr zu
  // überlappen (siehe midGap oben, der dafür zusätzlich Platz schafft).
  const DetailRow = ({icon, iconText, iconColor, title, mIn, mOut, eIn, eOut, clrIn, clrOut, clrInM, clrOutM, clrInE, clrOutE, onTapIn, onTapOut, rotatedCents}) => (
    <div style={{display:"flex",gap:midGap,padding:"0 1px",position:"relative",alignItems:"baseline",marginBottom:4}}>
      <HalfCell vOut={mOut} vIn={mIn} clrOut={clrOutM??clrOut} clrIn={clrInM??clrIn}
        isMitte={true} onTapOut={onTapOut} onTapIn={onTapIn} rotatedCents={rotatedCents}/>
      <HalfCell vOut={eOut} vIn={eIn} clrOut={clrOutE??clrOut} clrIn={clrInE??clrIn}
        isMitte={false} onTapOut={onTapOut} onTapIn={onTapIn} rotatedCents={rotatedCents}/>
      <div style={{position:"absolute",left:0,right:0,top:0,bottom:0,
        display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        {/* pointerEvents nur auf dem Symbol selbst (nicht dem ganzen Overlay,
            das sonst Klicks auf die Beträge dahinter blockieren würde) —
            damit der Titel-Tooltip beim Hover funktioniert. Größer & in
            T.txt (statt vorher T.txt2/klein) für bessere Unterscheidbarkeit
            (Nutzer-Feedback). iconText: für Symbole ohne kreisloses Lucide-
            Äquivalent (kein "nur Fragezeichen" ohne Kreis/Badge verfügbar) —
            einfach als Text gerendert statt als Icon. */}
        <span title={title} style={{display:"inline-flex",pointerEvents:"auto"}}>
          {iconText
            ? <span style={{fontSize:19,fontWeight:800,lineHeight:1,color:iconColor||T.txt}}>{iconText}</span>
            : Li(icon,19,iconColor||T.txt)}
        </span>
      </div>
    </div>
  );

  // Konto-Pille + Dropdown-Menü — gemeinsame Render-Funktion für beide
  // Hero-Layouts (Standard: mittig in der MITTE/ENDE-Zeile, angehoben auf
  // die Label-Linie · Editorial: links in der Kicker-Zeile, Menü linksbündig
  // statt zentriert verankert, damit es nicht über den Rand hinausragt).
  const renderAccPill = ({lift=false, menuAlign="center"}={}) => (
    <span style={{position:"relative",display:"inline-flex",alignItems:"center",
      ...(lift?{marginBottom:2}:{}),pointerEvents:"auto"}}>
      {/* Konto-Pille: Tippen öffnet die Schnellwahl. Durchklicken bleibt
          zusätzlich auf dem großen Kontostand-Betrag erhalten. */}
      <span onClick={allAccIds.length>1?(e)=>{e.stopPropagation();setAccMenuOpen(o=>!o);}:undefined}
        title={allAccIds.length>1?"Konto wählen":undefined}
        style={{display:"inline-flex",alignItems:"center",gap:3,userSelect:"none",lineHeight:1,
          ...(lift?{position:"relative",top:"-2px"}:{}),   // auf die MITTE/ENDE-Label-Linie heben
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
        <div style={{position:"absolute",top:"100%",
          ...(menuAlign==="center"?{left:"50%",transform:"translateX(-50%)"}:{left:0}),
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
  );

  return (
    <div style={{
      padding: `5px ${framePad}px 6px`,
      position:"relative"}}>
      {/* Freier Bereich links oben: minimaler Theme-Umschalter, direkt darunter
          das Feature-Tour-Symbol (im Editorial-Layout sitzt beides stattdessen
          inline in der Kicker-Zeile). */}
      {!isEditorial && (
        <div style={{position:"absolute",top:8,left:14,zIndex:2,
          display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div data-tour="theme-switcher"><ThemeSwitcherMini/></div>
          <span onClick={openTour} title="Feature-Tour"
            style={{cursor:"pointer",userSelect:"none",width:22,height:22,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li("help-circle",17,T.txt2)}
          </span>
        </div>
      )}

      {isEditorial ? (<>
        {/* ── EDITORIAL-LAYOUT (hero_layout:"editorial") ─────────────────
            Schlagzeilen-Anordnung: Kicker-Zeile (Umschalter · Label ·
            Kontowahl · Auge), darunter der Betrag groß und LINKSbündig,
            darunter die Prognosen als Ticker-Leiste mit Haarlinie. Gleiche
            Handler/Zustände wie das Standard-Layout — nur anders angeordnet. */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"2px 0 0",userSelect:"none"}}>
          <span data-tour="theme-switcher"><ThemeSwitcherMini/></span>
          <span onClick={openTour} title="Feature-Tour"
            style={{cursor:"pointer",userSelect:"none",width:22,height:22,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li("help-circle",17,T.txt2)}
          </span>
          <span style={{color:T.lbl,fontSize:9,fontWeight:800,letterSpacing:2.5}}>KONTOSTAND</span>
          {renderAccPill({menuAlign:"left"})}
          <div style={{flex:1}}/>
          <span onClick={toggleEye} title="Beträge ein-/ausblenden"
            style={{cursor:"pointer",userSelect:"none",width:eyeBoxSize,height:eyeBoxSize,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li(eyeIcon,23,eyeCol)}
          </span>
        </div>
        <div data-tour="hero-balance">
        <div style={{padding:"2px 0 0"}}>
          <span onClick={allAccIds.length>1?cycleAcc:undefined} className="heroAmt heroBalance"
            style={{
              color: heroColor(saldo),
              "--bal-col": heroColor(saldo),
              display:"block",textAlign:"left",
              fontSize:amtFontSize,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
              letterSpacing:-1,lineHeight:1.1,whiteSpace:"nowrap",
              WebkitTextStroke:"0.8px currentColor",
              cursor:allAccIds.length>1?"pointer":"default",
              overflow:"hidden",textOverflow:"ellipsis",
            }}>
            {saldo>=0?"":"−"}{fmtMoney(Math.abs(saldo||0))}&nbsp;€
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5,paddingTop:6,
          borderTop:`1px solid ${T.bd}`,userSelect:"none"}}>
          <div onClick={()=>setProgDrill(v=>v==="Mitte"?null:"Mitte")}
            style={{display:"flex",alignItems:"baseline",gap:6,cursor:"pointer",
              borderRadius:8,padding:"2px 8px 3px",marginLeft:-8,
              background: progDrill==="Mitte" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
            <span style={{color:T.mid||T.txt2,fontSize:9,fontWeight:700,letterSpacing:2,opacity:0.7}}>MITTE</span>
            <span className="heroAmt" style={{color: saldoCol(prognoseMitte, mitteAbgHero),
              fontSize:19,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>
              {prognoseMitte>=0?"":"−"}{fmtMoney(Math.abs(prognoseMitte||0))}
            </span>
          </div>
          <span style={{color:T.bd,fontSize:14}}>·</span>
          <div onClick={()=>setProgDrill(v=>v==="Ende"?null:"Ende")}
            style={{display:"flex",alignItems:"baseline",gap:6,cursor:"pointer",
              borderRadius:8,padding:"2px 8px 3px",
              background: progDrill==="Ende" ? (T.surf2||"rgba(255,255,255,0.04)") : "transparent"}}>
            <span style={{color:T.gold||T.txt2,fontSize:9,fontWeight:700,letterSpacing:2,opacity:0.7}}>ENDE</span>
            <span className="heroAmt" style={{color: saldoCol(prognoseEnde, endeAbgHero),
              fontSize:19,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT}}>
              {prognoseEnde>=0?"":"−"}{fmtMoney(Math.abs(prognoseEnde||0))}
            </span>
          </div>
          <div style={{flex:1}}/>
          <span onClick={toggleDetails}
            title={detailsOpen?"Details ausblenden":"Details anzeigen"}
            style={{cursor:"pointer",userSelect:"none",opacity:0.75,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li(detailsOpen?"chevron-up":"chevron-down",24,T.txt2)}
          </span>
        </div>
        </div>
      </>) : (<div data-tour="hero-balance">
      {/* Zeile 1: aktueller Kontostand groß & IMMER zentriert. Tippen auf den
          Betrag wechselt durch die Konten. Das Auge hängt als absolut
          positioniertes Geschwister direkt am rechten Rand des Betrags (statt
          in einer fest reservierten, symmetrischen Zone) — dadurch bleibt der
          Betrag unabhängig von seiner Breite exakt mittig, und das Auge rückt
          automatisch mit, je breiter der Betrag wird (Nutzer-Wunsch: Auge
          "dynamisch weiter nach rechts", Kontostand "in jedem Fall zentriert").
          Der Kontoname sitzt klein/zentriert in der MITTE/ENDE-Zeile. */}
      <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",
        userSelect:"none",
        // Kinder-Themes: kappt den Weichzeichner-"Glow" des ausgeblendeten
        // Kontostands (filter:blur) exakt an dieser Zeile, statt ihn frei bis
        // zum Deko-Rahmen bluten zu lassen. Enthält kein Popup/Dropdown (der
        // Theme-Umschalter sitzt in einer eigenen Geschwister-Box), daher
        // unbedenklich zu clippen.
        ...(T.frame_border ? {overflow:"hidden"} : {})}}>
        {/* Wrapper: sizt sich exakt auf die Breite des Betrags (inline-block
            als Flex-Item) — dadurch zentriert justifyContent:"center" oben
            NUR den Betrag, das absolut positionierte Auge zählt nicht mit.
            maxWidth reserviert die Augen-Zone als Obergrenze, damit der
            Betrag bei extrem wenig Platz weiterhin per Ellipsis kürzt statt
            das Auge aus dem sichtbaren Bereich zu drücken. */}
        <div style={{position:"relative", display:"inline-block", maxWidth:`calc(100% - ${eyeZoneWidth}px)`}}>
          <span onClick={allAccIds.length>1?cycleAcc:undefined} className="heroAmt heroBalance"
            style={{
              color: heroColor(saldo),
              "--bal-col": heroColor(saldo),
              fontSize:amtFontSize,fontWeight:800,fontVariantNumeric:"tabular-nums",fontFamily:NUM_FONT,
              letterSpacing:-1,lineHeight:1.15,whiteSpace:"nowrap",
              WebkitTextStroke:"0.8px currentColor",
              cursor:allAccIds.length>1?"pointer":"default",
              display:"inline-block", maxWidth:"100%", verticalAlign:"top",
              // overflow/textOverflow bleiben ein Notnagel für den Fall, dass
              // wirklich kein Platz mehr da ist (z.B. extrem kleines Gerät).
              overflow:"hidden", textOverflow:"ellipsis",
            }}>
            {saldo>=0?"":"−"}{fmtMoney(Math.abs(saldo||0))}&nbsp;€
          </span>
          {/* Auge: direkt am (dynamischen) rechten Rand des Betrags-Wrappers,
              vertikal zentriert. Kein fester Abstand zum Seitenrand mehr —
              er rückt automatisch mit, je breiter der Betrag wird. */}
          <span onClick={toggleEye} title="Beträge ein-/ausblenden"
            style={{position:"absolute", left:"100%", top:"50%",
              transform:"translateY(-50%)", marginLeft:12,
              cursor:"pointer",userSelect:"none",width:eyeBoxSize,height:eyeBoxSize,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li(eyeIcon,23,eyeCol)}
          </span>
        </div>
      </div>

      {/* Zeile 2: MITTE | ENDE — zwei flex:1-Hälften (6px-Gap), Kontoname + Caret
          als mittiges Overlay (beansprucht keine Spaltenbreite, damit die
          Beträge über den Kategorie-Pillen fluchten). Kinder-Themes: die
          Werte bekommen eine harte Breiten-Deckelung (maxWidth/overflow/
          ellipsis) — rein defensiv, unabhängig vom Deko-Rahmen (der läuft
          jetzt als Overlay über allem, siehe App.jsx). */}
      <div style={{display:"flex",gap:midGap,marginTop:2,padding:"0 1px",
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
            <div className="heroAmt" style={{color: saldoCol(prognoseMitte, mitteAbgHero),
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
            <div className="heroAmt" style={{color: saldoCol(prognoseEnde, endeAbgHero),
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
          {renderAccPill({lift:true})}
          <span onClick={toggleDetails}
            title={detailsOpen?"Details ausblenden":"Details anzeigen"}
            style={{pointerEvents:"auto",cursor:"pointer",userSelect:"none",opacity:0.75,
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {Li(detailsOpen?"chevron-up":"chevron-down",26,T.txt2)}
          </span>
        </div>
      </div>
      </div>)}

      {/* Detail-Block: Buch / VM / unkat — drei Zeilen mit Drill-Pfaden.
          Im Trend/Jahr (hideDetailRows) ausgeblendet, da dort jährlich gedacht
          und der Monatsbezug fehlt. */}
      {detailsOpen && !hideDetailRows && (
        <div style={{marginTop:2,paddingTop:6,borderTop:`1px solid ${T.bd}`}}>
          <DetailRow icon="check" title="Gebucht"
            mIn={buchInM} mOut={buchOutM} eIn={buchInE} eOut={buchOutE}
            clrIn={bookColHero(true)} clrOut={bookColHero(false)}
            onTapIn={onDrillBuchIn} onTapOut={onDrillBuchOut} rotatedCents/>
          {(pendInE>0||pendOutE>0) && (
            <DetailRow icon="clock" title="Vorgemerkt"
              mIn={pendInM} mOut={pendOutM} eIn={pendInE} eOut={pendOutE}
              clrIn={T.pos_vm} clrOut={T.neg_vm}
              onTapIn={onDrillPendIn} onTapOut={onDrillPendOut} rotatedCents/>
          )}
          {(uInE>0||uOutE>0) && (
            <DetailRow iconText="?" title="Unkategorisiert"
              mIn={uInM} mOut={uOutM} eIn={uInE} eOut={uOutE}
              clrIn={T.gold} clrOut={T.gold}
              onTapIn={onDrillUncatIn} onTapOut={onDrillUncatOut} rotatedCents/>
          )}
          {showScrollFocusToggle && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,paddingTop:8,borderTop:`1px solid ${T.bd}`}}>
              <span style={{flex:1,color:T.txt2,fontSize:11.5}}>Scroll-Vergrößerung (Zeile wächst/dockt an)</span>
              <div onClick={()=>setDebugFlag?.("enable_scroll_focus", !debugFlags?.enable_scroll_focus)}
                style={{width:40,height:24,borderRadius:12,cursor:"pointer",
                  background:debugFlags?.enable_scroll_focus?T.blue:"rgba(255,255,255,0.12)",
                  position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,
                  left:debugFlags?.enable_scroll_focus?19:3,width:18,height:18,borderRadius:"50%",
                  background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
              </div>
            </div>
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
