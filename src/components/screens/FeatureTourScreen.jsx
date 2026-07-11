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
        padding:"12px 16px 24px", display:"flex", flexDirection:"column", gap:10}}>
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
            <div style={{color:T.txt2, fontSize:14, lineHeight:1.5}}>{f[level]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { FeatureTourScreen };
