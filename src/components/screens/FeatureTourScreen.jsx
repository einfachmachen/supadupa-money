// Feature-Tour: kurzer Rundgang durch alle Kernfunktionen der App. Standard-
// Ansicht ist die Einsteiger-Erklärung je Karte, die sich per "mehr …"/"noch
// mehr …" um die Profi- bzw. Erfahren-Ebene ergänzen lässt (statt vorher drei
// separat anwählbaren Ebenen, die unerfahrene Nutzer eher verwirrt haben).
// Die "Für Kids"-Ebene ist bewusst kein Teil dieser Eskalation, sondern ein
// eigener Modus — per Teddy-Symbol im Header umschaltbar. Text kommt komplett
// aus content/featureTour.js, dieser Screen ist reine Anzeige.

import React, { useContext, useEffect, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { FEATURE_TOUR } from "../../content/featureTour.js";

// Bunte Comic-Palette für die "Für Kids"-Ebene — bewusst feste, kräftige
// Farben statt Theme-Tokens: die Kids-Ansicht soll wie ein Comicheft wirken,
// unabhängig vom gerade aktiven (ggf. gedeckten) Farbschema.
const COMIC_COLORS = ["#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#3BC9DB", "#4DABF7", "#B197FC", "#F783AC"];

function FeatureTourScreen({ onClose, onBack, mobileMode=false }) {
  const { setMasterOverride } = useContext(AppCtx);
  const [kidsMode, setKidsMode] = useState(() => kvStore.getItem("mbt_tourKids") === "1");
  const [expand, setExpand] = useState(() => Math.min(2, parseInt(kvStore.getItem("mbt_tourExpand") || "0", 10) || 0));

  const toggleKids = () => {
    const next = !kidsMode;
    setKidsMode(next);
    kvStore.setItem("mbt_tourKids", next ? "1" : "0");
  };
  const expandMore = () => {
    const next = Math.min(2, expand + 1);
    setExpand(next);
    kvStore.setItem("mbt_tourExpand", String(next));
  };
  const collapseAll = () => {
    setExpand(0);
    kvStore.setItem("mbt_tourExpand", "0");
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
      <MobileHeader title="Feature-Tour"
        subtitle={kidsMode ? "Für Kids 🧸" : "Kurzer Rundgang durch die App"}
        icon="compass" iconColor={T.blue} onBack={onBack} onClose={onClose}
        right={
          <button onClick={toggleKids}
            aria-label={kidsMode ? "Zur normalen Ansicht" : "Kids-Ansicht"}
            title={kidsMode ? "Zur normalen Ansicht" : "Kids-Ansicht"}
            style={{width:40, height:40, borderRadius:12, border:"none", cursor:"pointer",
              background: kidsMode ? `${T.blue}33` : "rgba(255,255,255,0.08)",
              fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", padding:0}}>
            🧸
          </button>
        }/>

      <div style={{flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch",
        padding:"12px 16px 24px", display:"flex", flexDirection:"column",
        gap: kidsMode ? 22 : 10}}>
        {kidsMode ? FEATURE_TOUR.map((f, i) => {
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
        }) : <>
          {FEATURE_TOUR.map((f, i) => (
            <div key={i} style={{background:T.surf, border:`1px solid ${T.bd}`, borderRadius:14,
              padding:"14px 14px"}}>
              <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
                <div style={{width:36, height:36, borderRadius:10, flexShrink:0,
                  background:`${T.blue}1f`, display:"flex", alignItems:"center", justifyContent:"center"}}>
                  {Li(f.icon, 18, T.blue)}
                </div>
                <div style={{color:T.txt, fontSize:16, fontWeight:700}}>{f.title}</div>
              </div>
              <div style={{color:T.txt2, fontSize:14, lineHeight:1.5}}>{f.eli20}</div>
              {expand>=1 && (
                <div style={{color:T.txt2, fontSize:13.5, lineHeight:1.5, marginTop:10,
                  paddingTop:10, borderTop:`1px solid ${T.bd}`}}>{f.eli30}</div>
              )}
              {expand>=2 && (
                <div style={{color:T.txt2, fontSize:13.5, lineHeight:1.5, marginTop:10,
                  paddingTop:10, borderTop:`1px solid ${T.bd}`}}>{f.eli60}</div>
              )}
            </div>
          ))}
          <button onClick={expand<2 ? expandMore : collapseAll}
            style={{alignSelf:"center", background:"transparent", border:"none", cursor:"pointer",
              color:T.blue, fontSize:14, fontWeight:700, fontFamily:"inherit", padding:"8px 16px"}}>
            {expand===0 ? "mehr …" : expand===1 ? "noch mehr …" : "weniger anzeigen"}
          </button>
        </>}
      </div>
    </div>
  );
}

export { FeatureTourScreen };
