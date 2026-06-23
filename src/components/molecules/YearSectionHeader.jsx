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
const OPTS = [["mood", "Money Mood", "activity"], ["jahr", "Trend", "calendar-range"]];

function YearSectionHeader({ active, detailsOpen, setDetailsOpen, children }) {   // active: "mood" | "jahr"
  const { year, month, setSubTab } = useContext(AppCtx);
  const hero = useSaldoHeroData(year, month);
  // Kontrolliert vom Screen (MoneyMood braucht den Zustand für die Sparklines),
  // sonst interner Fallback (z. B. JahrScreen).
  const [internalOpen, setInternalOpen] = useState(false);
  const open = detailsOpen !== undefined ? detailsOpen : internalOpen;
  const setOpen = setDetailsOpen || setInternalOpen;

  return (
    <div style={{ flexShrink: 0, background: T.bg }}>
      <SaldoHeroV2 year={year} month={month} {...hero}
        onDrillBuchIn={noop} onDrillBuchOut={noop} onDrillPendIn={noop} onDrillPendOut={noop}
        onDrillUncatIn={noop} onDrillUncatOut={noop}
        detailsOpen={open} setDetailsOpen={setOpen} />

      {/* Umschalter Money Mood | Jahr, Sortierung & Farb-Legende verstecken sich mit
          dem Hero-Ausklappmodus (nur sichtbar, wenn die Hero-Details offen sind). */}
      {open && (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "7px 10px", borderBottom: `1px solid ${T.bd}` }}>
            {OPTS.map(([id, lbl, ic]) => {
              const on = active === id;
              return (
                <button key={id} onClick={() => { if (id !== active) setSubTab(id); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 9, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 500,
                    border: `1px solid ${on ? T.gold : T.bd}`, background: on ? "rgba(245,166,35,0.16)" : "transparent",
                    color: on ? T.gold : T.txt2 }}>
                  {Li(ic, 13, on ? T.gold : T.txt2)} {lbl}
                </button>
              );
            })}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

export { YearSectionHeader };
