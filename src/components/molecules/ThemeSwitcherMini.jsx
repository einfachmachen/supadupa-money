// Minimaler Theme-Umschalter für den freien Bereich links oben im Hero.
// Trigger = winziges Swatch in der Theme-Hintergrundfarbe mit den vier Punkten
// des Betrags-Farbschemas (grün=pos · hellgrün=cell_inc · gold · rot=neg).
// Tippen öffnet eine kompakte Liste aller Themes im selben Swatch-Stil.

import React, { useContext } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { THEMES } from "../../theme/themes.js";
import { AppCtx } from "../../state/AppContext.js";
import { kvStore } from "../../utils/kvStore.js";

// Farbwert → #rrggbb (versteht #… und rgb()/rgba())
const toH = c => {
  if (!c) return "#888";
  if (c.startsWith("#")) return c.slice(0, 7);
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("") : "#888";
};

// Ein Swatch: Hintergrund = Theme-bg, darin die 4 Akzent-Punkte.
function Swatch({ th, size = 22, dot = 5, gap = 2 }) {
  const dots = [th.pos, th.cell_inc, th.gold, th.neg];
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: toH(th.bg), border: "1px solid rgba(128,128,128,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexWrap: "wrap", gap, padding: 2, boxSizing: "border-box",
    }}>
      {dots.map((c, i) => (
        <div key={i} style={{
          width: dot, height: dot, borderRadius: "50%", background: toH(c),
          border: "1px solid rgba(128,128,128,0.25)",
        }} />
      ))}
    </div>
  );
}

function ThemeSwitcherMini() {
  const { themeName, setThemeName, setThemeRev } = useContext(AppCtx);
  const [open, setOpen] = React.useState(false);
  const themes = React.useMemo(() => {
    const saved = (() => { try { return JSON.parse(kvStore.getItem("mbt_custom_themes") || "{}"); } catch { return {}; } })();
    Object.entries(saved).forEach(([k, v]) => { if (!THEMES[k]) THEMES[k] = v; });
    return Object.entries(THEMES)
      .filter(([k]) => k !== "custom_preview")
      .map(([k, v]) => ({ key: k, name: v.name || k, th: v }));
  }, [themeName]);
  const cur = THEMES[themeName] || THEMES.dark;
  const pick = (key) => {
    setThemeName?.(key);
    kvStore.setItem("mbt_theme", key);
    setThemeRev?.(r => r + 1);
    setOpen(false);
  };
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} title="Theme wechseln"
        style={{
          padding: 2, border: "none", background: "transparent",
          cursor: "pointer", display: "inline-flex", borderRadius: 8,
          outline: open ? `2px solid ${T.blue}` : "none",
        }}>
        <Swatch th={cur} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
            background: T.surf, border: `1px solid ${T.bds || T.bd}`, borderRadius: 13,
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)", backdropFilter: "blur(12px)",
            maxHeight: 320, overflowY: "auto", padding: "5px 0", minWidth: 180,
          }}>
            {themes.map(({ key, name, th }) => {
              const active = key === themeName;
              return (
                <div key={key} onClick={() => pick(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "6px 12px",
                    cursor: "pointer", background: active ? `${T.blue}18` : "transparent",
                    borderLeft: active ? `3px solid ${T.blue}` : "3px solid transparent",
                  }}>
                  <Swatch th={th} size={20} dot={4.5} />
                  <span style={{
                    fontSize: 12, color: active ? T.blue : T.txt, fontWeight: active ? 700 : 400,
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{name}</span>
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export { ThemeSwitcherMini };
