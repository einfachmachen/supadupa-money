// Umschalter zwischen der Jahres-Tabelle und "Money Mood" (zwei Sichten auf
// dasselbe Jahr). Beide Screens liegen unter erfassen/jahr bzw. erfassen/mood.

import React, { useContext } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

function YearViewToggle({ active }) {       // active: "jahr" | "mood"
  const { setSubTab } = useContext(AppCtx);
  const opts = [["jahr", "Tabelle", "calendar-range"], ["mood", "Money Mood", "activity"]];
  return (
    <div style={{ display: "flex", gap: 6, padding: "7px 10px", flexShrink: 0, borderBottom: `1px solid ${T.bd}`, background: T.bg }}>
      {opts.map(([id, lbl, ic]) => {
        const on = active === id;
        return (
          <button key={id} onClick={() => setSubTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 9,
              cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 500,
              border: `1px solid ${on ? T.gold : T.bd}`, background: on ? "rgba(245,166,35,0.16)" : "transparent",
              color: on ? T.gold : T.txt2,
            }}>
            {Li(ic, 13, on ? T.gold : T.txt2)} {lbl}
          </button>
        );
      })}
    </div>
  );
}

export { YearViewToggle };
