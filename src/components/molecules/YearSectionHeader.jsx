// Gemeinsamer Kopf der Jahres-Sektion: Hero (wie Dashboard/Monat) ganz oben,
// darunter die ausklappbar versteckten Tabs „Money Mood | Jahr". Wird von beiden
// Sichten (MoneyMoodScreen, JahrScreen) oben gerendert.

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { schriftAuf } from "../../theme/amtPill.js";
import { Li } from "../../utils/icons.jsx";
import { SaldoHeroV2 } from "../organisms/SaldoHeroV2.jsx";
import { useSaldoHeroData } from "../../state/useSaldoHeroData.js";

const noop = () => {};
const OPTS = [["trend", "Übersicht", "bar-chart-2"], ["mood", "Money Mood", "activity"], ["jahr", "Trend", "calendar-range"]];

function YearSectionHeader({ active, detailsOpen, setDetailsOpen, children }) {   // active: "mood" | "jahr"
  const { year, month, setSubTab } = useContext(AppCtx);
  // Kontostand jahresabhängig: laufendes Jahr → aktueller Monat; andere (abge-
  // schlossene oder zukünftige) Jahre → Dezember (Jahresend-Stand bzw. -Prognose).
  const _now = new Date();
  const heroMonth = (year === _now.getFullYear()) ? _now.getMonth() : 11;
  const hero = useSaldoHeroData(year, heroMonth);
  // Kontrolliert vom Screen (MoneyMood braucht den Zustand für die Sparklines),
  // sonst interner Fallback (z. B. JahrScreen).
  const [internalOpen, setInternalOpen] = useState(false);
  const open = detailsOpen !== undefined ? detailsOpen : internalOpen;
  const setOpen = setDetailsOpen || setInternalOpen;

  return (
    <div style={{ flexShrink: 0, background: T.bg }}>
      <SaldoHeroV2 year={year} month={heroMonth} {...hero}
        onDrillBuchIn={noop} onDrillBuchOut={noop} onDrillPendIn={noop} onDrillPendOut={noop}
        onDrillUncatIn={noop} onDrillUncatOut={noop}
        hideDetailRows
        detailsOpen={open} setDetailsOpen={setOpen} />

      {/* Umschalter Money Mood | Jahr, Sortierung & Farb-Legende verstecken sich mit
          dem Hero-Ausklappmodus (nur sichtbar, wenn die Hero-Details offen sind). */}
      {open && (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "7px 10px", borderBottom: `1px solid ${T.bd}` }}>
            {OPTS.map(([id, lbl, ic]) => {
              const on = active === id;
              return (
                // GEWAEHLT heisst GEFUELLT, nicht getoent (§4.4, wie bei den
                // Konto-Kacheln). Vorher trug der aktive Reiter einen
                // 16-%-Goldschleier und goldene Schrift darauf: auf einer
                // hellen Platte hebt sich die Flaeche mit rund 1,05:1 nicht ab
                // und die Schrift darauf mit rund 1,18:1 ebenso wenig — der
                // Reiter war praktisch unsichtbar (Nutzer-Hinweis "geht
                // ueberhaupt nicht"). Gefuellt traegt er die volle Akzentfarbe,
                // die Schriftfarbe rechnet schriftAuf dagegen aus.
                <button key={id} onClick={() => { if (id !== active) setSubTab(id); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 9, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 500,
                    border: `1px solid ${on ? T.gold : T.bd}`, background: on ? T.gold : "transparent",
                    color: on ? schriftAuf(T.gold, T.on_accent) : T.txt2 }}>
                  {Li(ic, 13, on ? schriftAuf(T.gold, T.on_accent, 3) : T.txt2)} {lbl}
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
