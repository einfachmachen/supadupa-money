// Tank-Auswertung: Verbrauch (l/100km) und Preisentwicklung (€/Liter) je
// Fahrzeug, berechnet aus den Tankbuchungen (_fuelVehicleId/_fuelLiters/
// _fuelPricePerL/_odometer, siehe utils/fuel.js und TODO.md).

import React, { useContext, useEffect, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { buildFuelSeries } from "../../utils/fuel.js";

function FuelAnalysisScreen({onClose, onBack, mobileMode=false}) {
  const { txs, vehicles, setMasterOverride, plusArretiert } = useContext(AppCtx);
  const [vehicleId, setVehicleId] = useState((vehicles||[])[0]?.id || "");
  const [hoverIdx, setHoverIdx] = useState(null);

  // "+"-Button übernehmen — sonst kann er in seinem zuletzt genutzten,
  // ggf. vergrößerten Zustand hängen bleiben und unteren Inhalt überlappen
  // (wie bei den anderen Daten-Tab-Dialogen, s. DataManagerDialog).
  // WICHTIG: onBack/onClose NICHT als Dependency — neue Funktionsobjekte bei
  // jedem App.jsx-Render würden den Effect ständig neu feuern lassen (+
  // Button flackert/wirkt wie "minimiert"). Aktuelle Handler per Ref.
  const _faHandlersRef = React.useRef({});
  _faHandlersRef.current = { onBack, onClose };
  useEffect(() => {
    if(!setMasterOverride) return;
    const H = () => _faHandlersRef.current;
    setMasterOverride({
      label: "Schließen",
      onConfirm: () => (H().onBack||H().onClose)?.(),
      onBack: null,
      onDismiss: () => H().onClose?.(),
    });
    return () => setMasterOverride(null);
  }, []);

  const series = buildFuelSeries(txs, vehicleId);
  const withConsumption = series.filter(t=>t._consumption!=null);
  const withCostPerKm = series.filter(t=>t._costPerKm!=null);

  const totalLiters = series.reduce((s,t)=>s+(t._fuelLiters||0), 0);
  const totalSpent  = series.reduce((s,t)=>s+Math.abs(t.totalAmount||0), 0);
  const avgConsumption = withConsumption.length
    ? withConsumption.reduce((s,t)=>s+t._consumption,0)/withConsumption.length : null;
  const pricedEntries = series.filter(t=>t._fuelPricePerL!=null);
  const avgPrice = pricedEntries.length
    ? pricedEntries.reduce((s,t)=>s+t._fuelPricePerL,0)/pricedEntries.length : null;
  const avgCostPerKm = withCostPerKm.length
    ? withCostPerKm.reduce((s,t)=>s+t._costPerKm,0)/withCostPerKm.length : null;

  const dLabel = iso => (iso||"").split("-").slice(1).reverse().join(".");

  // Einfacher SVG-Balken-Chart (Stil wie MoneyMoodScreen/ChartBlock): eine
  // Kennzahl über die Zeit, feste Farbe je Metrik (Magnitude → ein Hue).
  // WICHTIG: viewBox-Einheiten entsprechen bei width:100% auf Mobile in etwa
  // CSS-Pixeln (Container ~320-380px breit) — eine "fontSize" von 7 war damit
  // ca. 7px auf dem Bildschirm und praktisch unlesbar. 11/10 entsprechen der
  // sonst in der App für kleine Beschriftungen üblichen Größe.
  const barChart = (rows, valueOf, color, emptyHint, fmtVal=(v)=>v.toFixed(1)) => {
    if(!rows.length) return (
      <div style={{color:T.txt2,fontSize:11,padding:"16px 0",textAlign:"center"}}>{emptyHint}</div>
    );
    const W = 320, H = 138, padL = 4, padB = 22, padTop = 22;
    const chartH = H - padB - padTop;
    const vals = rows.map(valueOf);
    const maxV = Math.max(...vals, 0.0001);
    const bw = (W - padL*2) / rows.length;
    const showLabels = rows.length <= 10;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
        {rows.map((r,i)=>{
          const v = valueOf(r);
          const bh = (v/maxV)*chartH;
          const x = padL + i*bw;
          const sel = hoverIdx===r.id;
          return (
            <g key={r.id} onClick={()=>setHoverIdx(sel?null:r.id)} style={{cursor:"pointer"}}>
              <rect x={x} y={padTop} width={bw} height={chartH+padB} fill="transparent"/>
              <rect x={x+bw*0.15} y={padTop+chartH-bh} width={bw*0.7} height={Math.max(0,bh)}
                rx={2} fill={color} opacity={sel?1:0.65}
                stroke={sel?T.txt:"none"} strokeWidth={sel?1:0}/>
              {showLabels&&(
                <text x={x+bw/2} y={padTop+chartH-bh-6} textAnchor="middle" fontSize="11"
                  fill={sel?T.txt:T.txt2} fontWeight={sel?700:600}>
                  {fmtVal(v)}
                </text>
              )}
              <text x={x+bw/2} y={H-6} textAnchor="middle" fontSize="10" fill={sel?T.txt:T.txt2}>
                {dLabel(r.date)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className={mobileMode?"mobile-modal":undefined} style={{position:"fixed",inset:0,background:T.bg,
      zIndex:300,display:"flex",flexDirection:"column","--mm-bottom":plusArretiert?"190px":"57px"}}>
      <MobileHeader title="Tankverbrauch" subtitle="Verbrauch & Preisentwicklung"
        icon="fuel" iconColor={T.gold}
        onBack={onBack||onClose} onClose={onClose}/>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"12px 16px 32px"}}>

        {!(vehicles||[]).length ? (
          <div style={{textAlign:"center",padding:"40px 16px",color:T.txt2}}>
            {Li("fuel",28,T.txt2)}
            <div style={{marginTop:10,fontSize:13,lineHeight:1.6}}>
              Noch keine Fahrzeuge angelegt.<br/>
              Lege beim Erfassen einer Tankbuchung (Kategorie „Tanken") ein Fahrzeug an —
              die Auswertung erscheint dann automatisch hier.
            </div>
          </div>
        ) : (<>

          {/* Fahrzeug-Auswahl */}
          {(vehicles||[]).length>1 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {(vehicles||[]).map(v=>{
                const on = vehicleId===v.id;
                return (
                  <button key={v.id} onClick={()=>{setVehicleId(v.id);setHoverIdx(null);}}
                    style={{padding:"6px 12px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",
                      fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:6,
                      border:`1.5px solid ${on?T.gold:T.bd}`,
                      background:on?T.gold+"22":"rgba(255,255,255,0.04)",
                      color:on?T.gold:T.txt2}}>
                    {Li("car",12,on?T.gold:T.txt2)} {v.name}
                    {v.plate&&<span style={{fontWeight:400,opacity:0.75}}>· {v.plate}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {!series.length ? (
            <div style={{textAlign:"center",padding:"32px 16px",color:T.txt2,fontSize:13,lineHeight:1.6}}>
              Für dieses Fahrzeug liegen noch keine Tankbuchungen mit km-Stand vor.
            </div>
          ) : (<>

            {/* Kennzahlen */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {[
                ["Ø Verbrauch", avgConsumption!=null?avgConsumption.toFixed(1)+" l/100km":"—", T.gold, "activity"],
                ["Ø Preis",     avgPrice!=null?avgPrice.toFixed(3).replace(".",",")+" €/l":"—", T.blue, "trending-up"],
                ["Ø Kosten/km", avgCostPerKm!=null?avgCostPerKm.toFixed(3).replace(".",",")+" €/km":"—", T.mid, "route"],
                ["Getankt",     totalLiters.toFixed(1)+" l", T.txt, "droplet"],
                ["Ausgegeben",  fmt(totalSpent), T.txt, "wallet"],
              ].map(([label,val,col,icon])=>(
                <div key={label} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${T.bd}`,
                  borderRadius:11,padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,color:T.txt2,fontSize:10,marginBottom:4}}>
                    {Li(icon,11,T.txt2)} {label}
                  </div>
                  <div style={{color:col,fontSize:15,fontWeight:700,fontFamily:NUM_FONT}}>{val}</div>
                </div>
              ))}
            </div>

            {/* Verbrauch-Chart */}
            <div style={{marginBottom:16}}>
              <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                {Li("activity",12,T.gold)} Verbrauch (l/100km) je Tankvorgang
              </div>
              <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"8px"}}>
                {barChart(withConsumption, t=>t._consumption, T.gold,
                  "Mindestens 2 Tankvorgänge mit km-Stand nötig, um Verbrauch zu berechnen.")}
              </div>
            </div>

            {/* Preis-Chart */}
            <div style={{marginBottom:16}}>
              <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                {Li("trending-up",12,T.blue)} Preisentwicklung (€/Liter)
              </div>
              <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"8px"}}>
                {barChart(pricedEntries, t=>t._fuelPricePerL, T.blue,
                  "Noch keine Tankbuchung mit Preis pro Liter erfasst.")}
              </div>
            </div>

            {/* Kosten/km-Chart */}
            <div style={{marginBottom:16}}>
              <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                {Li("route",12,T.mid)} Kosten je gefahrenem km
              </div>
              <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${T.bd}`,borderRadius:11,padding:"8px"}}>
                {barChart(withCostPerKm, t=>t._costPerKm, T.mid,
                  "Mindestens 2 Tankvorgänge mit km-Stand UND Preis/Liter nötig, um Kosten/km zu berechnen.",
                  v=>v.toFixed(2))}
              </div>
            </div>

            {/* Liste */}
            <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6}}>Alle Tankvorgänge</div>
            {[...series].reverse().map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,
                background:"rgba(255,255,255,0.03)",border:`1px solid ${T.bd}`,borderRadius:10,
                padding:"8px 10px",marginBottom:5}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:T.txt,fontSize:12,fontWeight:600}}>{dLabel(t.date)}</div>
                  <div style={{color:T.txt2,fontSize:10,marginTop:1}}>
                    {t._fuelLiters!=null?t._fuelLiters+" l":"—"}
                    {t._fuelPricePerL!=null?" · "+t._fuelPricePerL.toFixed(3).replace(".",",")+" €/l":""}
                    {t._odometer!=null?" · "+t._odometer+" km":""}
                  </div>
                </div>
                {(t._consumption!=null||t._costPerKm!=null)&&(
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {t._consumption!=null&&(
                      <div style={{color:T.gold,fontSize:12,fontWeight:700,fontFamily:NUM_FONT}}>
                        {t._consumption.toFixed(1)} l/100km
                      </div>
                    )}
                    {t._costPerKm!=null&&(
                      <div style={{color:T.mid,fontSize:10,fontWeight:700,fontFamily:NUM_FONT}}>
                        {t._costPerKm.toFixed(3).replace(".",",")} €/km
                      </div>
                    )}
                  </div>
                )}
                <div style={{color:T.txt2,fontSize:12,fontFamily:NUM_FONT,flexShrink:0}}>{fmt(Math.abs(t.totalAmount||0))}</div>
              </div>
            ))}

          </>)}
        </>)}
      </div>
    </div>
  );
}

export { FuelAnalysisScreen };
