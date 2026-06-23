// Gemeinsamer Kopf der Jahres-Sektion: Hero (wie Dashboard/Monat) ganz oben,
// darunter die ausklappbar versteckten Tabs „Money Mood | Jahr". Wird von beiden
// Sichten (MoneyMoodScreen, JahrScreen) oben gerendert.

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { SaldoHeroV2 } from "../organisms/SaldoHeroV2.jsx";
import { useSaldoHeroData } from "../../state/useSaldoHeroData.js";

const noop = () => {};
const OPTS = [["mood", "Money Mood", "activity"], ["jahr", "Jahr", "calendar-range"]];

function YearSectionHeader({ active }) {   // active: "mood" | "jahr"
  const { year, month, setSubTab } = useContext(AppCtx);
  const hero = useSaldoHeroData(year, month);
  const [heroOpen, setHeroOpen] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(false);
  const cur = OPTS.find(o => o[0] === active) || OPTS[0];

  return (
    <div style={{ flexShrink: 0, background: T.bg }}>
      <SaldoHeroV2 year={year} month={month} {...hero}
        onDrillBuchIn={noop} onDrillBuchOut={noop} onDrillPendIn={noop} onDrillPendOut={noop}
        onDrillUncatIn={noop} onDrillUncatOut={noop}
        detailsOpen={heroOpen} setDetailsOpen={setHeroOpen} />

      {!tabsOpen ? (
        // Eingeklappt: nur die aktive Sicht + Chevron als Aufklapp-Hinweis.
        <button onClick={() => setTabsOpen(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
            padding: "5px 10px", background: "transparent", border: "none", borderBottom: `1px solid ${T.bd}`,
            cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
          {Li(cur[2], 13, T.gold)} <span style={{ color: T.txt }}>{cur[1]}</span> {Li("chevron-down", 14, T.txt2)}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "7px 10px", borderBottom: `1px solid ${T.bd}` }}>
          {OPTS.map(([id, lbl, ic]) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => { if (id !== active) setSubTab(id); else setTabsOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 9, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 500,
                  border: `1px solid ${on ? T.gold : T.bd}`, background: on ? "rgba(245,166,35,0.16)" : "transparent",
                  color: on ? T.gold : T.txt2 }}>
                {Li(ic, 13, on ? T.gold : T.txt2)} {lbl}
              </button>
            );
          })}
          <button onClick={() => setTabsOpen(false)}
            style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.bd}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {Li("chevron-up", 14, T.txt2)}
          </button>
        </div>
      )}
    </div>
  );
}

export { YearSectionHeader };
