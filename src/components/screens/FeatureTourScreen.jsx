// Feature-Tour: kurzer Rundgang durch alle Kernfunktionen der App, wahlweise
// in vier Erklär-Ebenen (Für Kids / Einsteiger / Profi / Erfahren) — Text
// kommt komplett aus content/featureTour.js, dieser Screen ist reine Anzeige.

import React, { useContext, useEffect, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { FEATURE_TOUR, FEATURE_TOUR_LEVELS } from "../../content/featureTour.js";

// Bunte Comic-Palette für die "Für Kids"-Ebene — bewusst feste, kräftige
// Farben statt Theme-Tokens: die Kids-Ansicht soll wie ein Comicheft wirken,
// unabhängig vom gerade aktiven (ggf. gedeckten) Farbschema.
const COMIC_COLORS = ["#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#3BC9DB", "#4DABF7", "#B197FC", "#F783AC"];

function FeatureTourScreen({ onClose, onBack, mobileMode=false }) {
  const { setMasterOverride } = useContext(AppCtx);
  const [level, setLevel] = useState(() => kvStore.getItem("mbt_tourLevel") || "eli20");

  const pickLevel = (key) => {
    setLevel(key);
    kvStore.setItem("mbt_tourLevel", key);
  };

  // "+"-Button übernehmen — wie bei den anderen Daten-Tab-Vollbild-Screens
  // (s. FuelAnalysisScreen): onBack/onClose per Ref, damit der Effect nicht
  // bei jedem Render neu feuert.
  const _handlersRef = React.useRef({});
  _handlersRef.current = { onBack, onClose };
  useEffect(() => {
    if (!setMasterOverride) return;
    const H = () => _handlersRef.current;
    setMasterOverride({
      label: "Schließen",
      onConfirm: () => (H().onBack || H().onClose)?.(),
      onBack: null,
      onDismiss: () => H().onClose?.(),
    });
    return () => setMasterOverride(null);
  }, []);

  return (
    <div style={{position:"fixed", inset:0, background:T.bg, zIndex:15,
      display:"flex", flexDirection:"column"}}>
      <MobileHeader title="Feature-Tour" subtitle="Kurzer Rundgang durch die App"
        icon="compass" iconColor={T.blue} onBack={onBack} onClose={onClose}/>

      <div style={{display:"flex", gap:8, padding:"12px 16px 4px", flexShrink:0,
        overflowX:"auto", WebkitOverflowScrolling:"touch"}}>
        {FEATURE_TOUR_LEVELS.map(lv => {
          const active = lv.key === level;
          return (
            <button key={lv.key} onClick={() => pickLevel(lv.key)}
              style={{flexShrink:0, padding:"8px 14px", borderRadius:20, cursor:"pointer",
                fontFamily:"inherit", fontSize:14, fontWeight:700,
                border:`1px solid ${active ? T.blue : T.bd}`,
                background: active ? `${T.blue}22` : "transparent",
                color: active ? T.blue : T.txt2}}>
              {lv.label}
            </button>
          );
        })}
      </div>

      <div style={{flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch",
        padding:"12px 16px 24px", display:"flex", flexDirection:"column",
        gap: level==="eli10" ? 22 : 10}}>
        {level==="eli10" ? FEATURE_TOUR.map((f, i) => {
          const c = COMIC_COLORS[i % COMIC_COLORS.length];
          const tilt = i % 2 === 0 ? -1.5 : 1.5;
          return (
            <div key={i} style={{position:"relative", marginTop:8}}>
              {/* Sprechblasen-Schwänzchen — kleines rotiertes Quadrat, das aus
                  der oberen Kante der Blase herausragt, zeigt zum Icon-Kreis. */}
              <div style={{position:"absolute", top:-9, left:34, width:18, height:18,
                background:T.surf, border:`3px solid ${c}`, borderRight:"none", borderBottom:"none",
                transform:"rotate(45deg)", borderRadius:"3px 0 0 0", zIndex:0}}/>
              <div style={{position:"relative", background:T.surf, border:`3px solid ${c}`,
                borderRadius:22, padding:"16px 16px 16px 16px",
                transform:`rotate(${tilt}deg)`, boxShadow:`4px 4px 0 ${c}55`}}>
                <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:10}}>
                  <div style={{width:52, height:52, borderRadius:"50%", flexShrink:0,
                    background:c, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:28, boxShadow:`0 3px 0 ${c}99`}}>
                    {f.emoji || "✨"}
                  </div>
                  <div style={{color:T.txt, fontSize:19, fontWeight:800, lineHeight:1.15}}>{f.title}</div>
                </div>
                <div style={{color:T.txt, fontSize:16, lineHeight:1.55, fontWeight:500}}>{f.eli10}</div>
              </div>
            </div>
          );
        }) : FEATURE_TOUR.map((f, i) => (
          <div key={i} style={{background:T.surf, border:`1px solid ${T.bd}`, borderRadius:14,
            padding:"14px 14px"}}>
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
              <div style={{width:36, height:36, borderRadius:10, flexShrink:0,
                background:`${T.blue}1f`, display:"flex", alignItems:"center", justifyContent:"center"}}>
                {Li(f.icon, 18, T.blue)}
              </div>
              <div style={{color:T.txt, fontSize:16, fontWeight:700}}>{f.title}</div>
            </div>
            <div style={{color:T.txt2, fontSize:14, lineHeight:1.5}}>{f[level]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { FeatureTourScreen };
