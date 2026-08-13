// Auto-generated module (siehe app-src.jsx)

import React, { useCallback, useMemo, useState } from "react";
import { ChartBlock } from "./ChartBlock.jsx";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { betrag, centsGedreht } from "../../utils/betrag.jsx";
import { Li } from "../../utils/icons.jsx";
import { schriftAuf } from "../../theme/amtPill.js";

// Betragsbeschriftungen des Tortendiagramms.
//
// Die Beschriftungen sind SVG-<text>-Knoten. `betrag()` liefert bei aktiver
// Nachkommastellen-Option ein <span>, und HTML rendert innerhalb von <svg> nur
// in einem <foreignObject>. Das war der erste Versuch — und ging auf dem iPhone
// schief: WebKit setzte die gedrehten Cent an voellig andere Stellen als Blink
// (Nutzer-Bild). foreignObject ist in Safari seit jeher fehleranfaellig, und
// hier ist ohnehin nichts gewonnen, wenn es nur in einem Browser stimmt.
//
// Deshalb JETZT ohne SVG: die Betraege liegen als normales HTML in einer
// Auflage ueber dem Diagramm — derselbe Renderpfad wie Hero und Monatsliste,
// die auf dem iPhone nachweislich richtig aussehen. Die Auflage ist genauso
// gross wie das (quadratische) Diagramm, deshalb rechnet ein Faktor die
// SVG-Einheiten in Pixel um: `skala = Breite / 320`.
//
// Ist die Option AUS, bleibt alles beim unveraenderten <text> im SVG — dann
// gibt es weder Auflage noch Messung.
//
// `y` ist die Grundlinie des <text>; die optische Mitte liegt etwa 0,36
// Schriftgroessen darueber.
const GRUNDLINIE_ZU_MITTE = 0.36;

function CategoryChart({catSums, maxSum, budgets, getBudgetForMonth, year, month}) {
  const [chartOpen, setChartOpen] = React.useState(false);
  const [view, setView] = React.useState("bar");
  const [hovered, setHovered] = React.useState(null);
  const total = catSums.reduce((s,c)=>s+c.sum, 0);
  const COLORS = ["#4a9fd4","#e8a838","#e05c5c","#5cb85c","#9b59b6","#1abc9c","#e67e22","#3498db","#e91e63","#00bcd4","#f39c12","#2ecc71"];
  const pie = React.useMemo(()=>{
    let angle = -Math.PI/2;
    return catSums.map((c,i)=>{
      const frac = c.sum / total;
      const start = angle;
      angle += frac * 2 * Math.PI;
      const end = angle;
      const large = (end-start) > Math.PI ? 1 : 0;
      const R = 150, cx = 160, cy = 160;
      const x1 = cx + R*Math.cos(start), y1 = cy + R*Math.sin(start);
      const x2 = cx + R*Math.cos(end),   y2 = cy + R*Math.sin(end);
      const mid = start + (end-start)/2;
      const pct = Math.round(frac*100);
      const labelR = pct >= 8 ? 100 : 128;
      const lx = cx + labelR*Math.cos(mid);
      const ly = cy + labelR*Math.sin(mid);
      return {cat:c, frac, pct, color: c.color || COLORS[i%COLORS.length],
        path:`M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`, lx, ly};
    });
  }, [catSums, total]);

  // Breite des Diagramms in Pixeln — nur noetig, wenn die Betraege als HTML-
  // Auflage darueber liegen (siehe oben). Callback-Ref statt useEffect, weil das
  // <svg> erst existiert, sobald der Bereich aufgeklappt UND "Torte" gewaehlt
  // ist; ein Effekt mit leerer Abhaengigkeitsliste haette es nie gesehen.
  const [tortenBreite, setTortenBreite] = useState(0);
  const tortenRef = useCallback((el) => {
    if (!el) return;
    setTortenBreite(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setTortenBreite(e.contentRect.width));
    ro.observe(el);
  }, []);
  const gedreht = centsGedreht();
  const skala = tortenBreite / 320;   // SVG-Einheit -> Pixel

  // Schriftfarben der Torte. Vorher stand hier ueberall ein festes "#fff" bzw.
  // T.txt/T.txt2 — beides ging schief:
  //   * Die Beschriftungen LIEGEN AUF DEM SEGMENT, und dessen Farbe kommt aus
  //     den Nutzerdaten. Auf einem hellen Pastellton (Lachs, Hellblau) war
  //     weiss praktisch unsichtbar (Nutzer-Bild).
  //   * Die Nabe ist eine SVG-<circle>-Flaeche, kein Hintergrund. Die
  //     Karten-Textregel (§4.7) greift dort nicht — im Theme "Tastenhell"
  //     stand die dunkle Platten-Textfarbe auf der dunklen Taste.
  // schriftAuf(Grund) rechnet den WCAG-Kontrast aus und nimmt Weiss oder
  // Fast-Schwarz — je nachdem, was auf diesem Grund traegt. Die
  // Helligkeitsklasse allein reichte nicht: auf einem mittleren Rot blieb die
  // Schrift weiss und lag bei 3,2:1.
  // Wichtig: gerechnet wird gegen die GEMALTE Farbe. Die Segmente liegen bei
  // 88 % Deckkraft auf dem Seitenhintergrund und sind damit je nach Theme
  // heller oder dunkler als der reine Kategorieton.
  const gemalt = (farbe) => {
    const h = String(farbe).replace("#", "");
    const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const teile = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
    if (teile.some(Number.isNaN)) return farbe;
    const g = String(T.bg).replace("#", "");
    const gr = [0, 2, 4].map(i => parseInt((g.length === 3 ? g.split("").map(c => c + c).join("") : g).slice(i, i + 2), 16));
    if (gr.some(Number.isNaN)) return farbe;
    return `rgb(${teile.map((v, i) => Math.round(v * 0.88 + gr[i] * 0.12)).join(",")})`;
  };
  const aufSegment = (farbe) => schriftAuf(gemalt(farbe));
  // Schrift auf der gefuellten Akzent-Pille: `on_accent` nur, solange es
  // traegt. In hellen Themes ist es weiss, und weiss auf dem Lime #6B9900
  // erreicht nur 3,4:1 (Kontrast-Lauf).
  const aufAkzent = schriftAuf(T.blue, T.on_accent);
  const nabe = T.surf2 || T.surf;
  const aufNabe = schriftAuf(nabe);

  // Alle Betragsbeschriftungen an EINER Stelle: einmal als <text> im SVG
  // (Option aus), einmal als HTML in der Auflage (Option an). So koennen die
  // beiden Darstellungen nicht auseinanderlaufen.
  const betragsLabels = [
    hovered === null
      ? { key: "gesamt", x: 160, y: 169, groesse: 13, farbe: aufNabe, fett: "800", wert: total }
      : { key: "hover",  x: 160, y: 164, groesse: 13, farbe: aufNabe, fett: "800", wert: pie[hovered]?.cat.sum },
    ...pie.map((seg, i) => (seg.pct >= 8 ? {
      key: "seg" + i, x: seg.lx, y: seg.ly + 3,
      groesse: seg.pct >= 15 ? 9.5 : 8, farbe: aufSegment(seg.color), fett: "600",
      opacity: (hovered === null || hovered === i ? 1 : 0.4) * 0.95,
      wert: seg.cat.sum,
    } : null)),
  ].filter(Boolean);

  return (
    // `diagramm-flaeche`: ein Inhaltsblock wie Hero und Kategorienkarten. Ohne
    // eigene Flaeche stand die Torte als grosser heller Fleck zwischen zwei
    // Tasten (Nutzer-Hinweis "wirkt inkonsistent").
    <div className="diagramm-flaeche"
      style={{margin:"0 0 4px",borderRadius:12,overflow:"hidden",border:`1px solid ${T.bd}`}}>
      <div onClick={()=>setChartOpen(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:6,padding:"7px 2px",
          cursor:"pointer",background:"rgba(255,255,255,0.03)"}}>
        {Li("bar-chart-2",13,T.txt2)}
        <span style={{flex:1,color:T.txt2,fontSize:11,fontWeight:600}}>Ausgaben nach Kategorie</span>
        {Li(chartOpen?"chevron-up":"chevron-down",12,T.txt2)}
      </div>
      {chartOpen&&<>
        <div style={{display:"flex",gap:6,padding:"6px 2px 2px",borderTop:`1px solid ${T.bd}`}}>
          {[["bar","bar-chart-2","Balken"],["pie","pie-chart","Torte"]].map(([v,icon,label])=>(
            <button key={v} onClick={()=>setView(v)}
              // Aktiv = GEFUELLTE Pille wie in der Sortierzeile darunter. Vorher
              // lag die Akzentfarbe als Text auf einer 9%-Toenung derselben
              // Farbe; auf hellem Grund ergab das Lime auf fast Weiss.
              style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",
                borderRadius:8,border:`1px solid ${view===v?T.blue:T.bd}`,
                background:view===v?T.blue:"rgba(255,255,255,0.06)",
                color:view===v?aufAkzent:T.txt2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {Li(icon,11,view===v?aufAkzent:T.txt2)} {label}
            </button>
          ))}
        </div>
        {view==="bar"&&<ChartBlock catSums={catSums} maxSum={maxSum} budgets={budgets} getBudgetForMonth={getBudgetForMonth} year={year} month={month}/>}
        {view==="pie"&&(
          <div style={{padding:"0 0 8px",position:"relative"}}>
            <svg ref={tortenRef} viewBox="0 0 320 320" style={{width:"100%",display:"block"}}
              onMouseLeave={()=>setHovered(null)}>
              {pie.map((seg,i)=>(
                <path key={i} d={seg.path} fill={seg.color}
                  opacity={hovered===null||hovered===i ? 0.88 : 0.35}
                  stroke={T.bg} strokeWidth={2}
                  style={{cursor:"pointer",transition:"opacity 0.15s"}}
                  onMouseEnter={()=>setHovered(i)}
                  onTouchStart={()=>setHovered(hovered===i?null:i)}/>
              ))}
              <circle cx={160} cy={160} r={62} fill={T.surf2||T.surf}/>
              {hovered===null ? (<>
                <text x={160} y={153} textAnchor="middle" fill={aufNabe} opacity={0.8} fontSize={10}>Gesamt</text>
                {!gedreht && <text x={160} y={169} textAnchor="middle" fill={aufNabe}
                  fontSize={13} fontWeight="800">{fmt(total)}</text>}
              </>) : (<>
                {/* Kategoriefarbe nur, wenn sie sich von der Nabe absetzt. */}
                <text x={160} y={149} textAnchor="middle" fill={schriftAuf(nabe, pie[hovered]?.color)} fontSize={9} fontWeight="700">{pie[hovered]?.cat.name}</text>
                {!gedreht && <text x={160} y={164} textAnchor="middle" fill={aufNabe}
                  fontSize={13} fontWeight="800">{fmt(pie[hovered]?.cat.sum)}</text>}
                <text x={160} y={177} textAnchor="middle" fill={aufNabe} opacity={0.8} fontSize={10}>{pie[hovered]?.pct}%</text>
              </>)}
              {pie.map((seg,i)=>{
                if(seg.pct < 4) return null;
                const isHov = hovered===i;
                const op = hovered===null||isHov ? 1 : 0.4;
                if(seg.pct >= 8) return (
                  <g key={"l"+i} style={{pointerEvents:"none"}}>
                    <text x={seg.lx} y={seg.ly-10} textAnchor="middle"
                      fill={aufSegment(seg.color)} fontSize={seg.pct>=15?10:8.5} fontWeight="700" opacity={op}>
                      {seg.cat.name.length>10 ? seg.cat.name.slice(0,9)+"\u2026" : seg.cat.name}
                    </text>
                    {!gedreht && <text x={seg.lx} y={seg.ly+3} textAnchor="middle"
                      fill={aufSegment(seg.color)} fontSize={seg.pct>=15?9.5:8} fontWeight="600" opacity={op*0.95}>
                      {fmt(seg.cat.sum)}
                    </text>}
                    <text x={seg.lx} y={seg.ly+15} textAnchor="middle"
                      fill={aufSegment(seg.color)} fontSize={7.5} opacity={op*0.85}>
                      {seg.pct}%
                    </text>
                  </g>
                );
                return (
                  <g key={"l"+i} style={{pointerEvents:"none"}}>
                    {/* Schmale Segmente: die Beschriftung liegt trotzdem noch auf
                        dem Segment — dessen eigene Farbe war dort unsichtbar. */}
                    <text x={seg.lx} y={seg.ly} textAnchor="middle"
                      fill={aufSegment(seg.color)} fontSize={8} fontWeight="700" opacity={op}>
                      {seg.pct}%
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Betraege als HTML-Auflage — nur bei aktiver Option (siehe oben).
                Die Auflage deckt exakt das quadratische Diagramm ab, deshalb
                genuegt `skala`, um SVG-Einheiten in Pixel umzurechnen. Sie
                nimmt keine Tipps an, damit die Segmente darunter weiter
                antippbar bleiben. */}
            {gedreht && skala > 0 && (
              <div style={{position:"absolute",left:0,top:0,width:tortenBreite,height:tortenBreite,
                pointerEvents:"none"}}>
                {betragsLabels.map(l => (
                  // `--amt-neutral` MUSS hier mitgegeben werden: im neutralen
                  // Betrags-Modus faerbt base.css jeden Betrag per
                  // `color: var(--amt-neutral) !important` um. Die Auflage
                  // haengt am Seitenhintergrund, erbt also dessen Textfarbe —
                  // im Theme "Tastenhell" stand der Betrag in der Nabe damit
                  // dunkel auf der dunklen Nabe (Nutzer-Bild). Mit der
                  // Variablen kommt genau die Farbe heraus, die oben je
                  // Segment bzw. fuer die Nabe gerechnet wurde.
                  <div key={l.key} style={{position:"absolute",
                    left: l.x * skala,
                    top: (l.y - GRUNDLINIE_ZU_MITTE * l.groesse) * skala,
                    transform:"translate(-50%,-50%)",
                    display:"flex",alignItems:"center",whiteSpace:"nowrap",
                    color:l.farbe, "--amt-neutral":l.farbe,
                    fontSize:l.groesse * skala, fontWeight:l.fett,
                    fontFamily:NUM_FONT, lineHeight:1, opacity:l.opacity}}>
                    {betrag(l.wert)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>}
    </div>
  );
}

export { CategoryChart };
