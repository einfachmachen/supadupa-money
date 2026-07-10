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

// #rrggbb → {h,s,l} (h in Grad 0-360, s/l 0-1) — zur Einordnung der Akzentfarbe
// in eine Farbfamilie (Rot/Orange/…) für die Theme-Gruppierung.
const toHsl = hex => {
  const h = toH(hex);
  const r = (parseInt(h.slice(1,3),16)||0)/255, g = (parseInt(h.slice(3,5),16)||0)/255, b = (parseInt(h.slice(5,7),16)||0)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
  let hue = 0, sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if (max===r) hue = (g-b)/d + (g<b?6:0);
    else if (max===g) hue = (b-r)/d + 2;
    else hue = (r-g)/d + 4;
    hue *= 60;
  }
  return { h: hue, s: sat, l };
};

// Ordnet einen Farbton einer von 8 Farbfamilien zu — sehr blasse/entsättigte
// Akzente (Grautöne) landen unabhängig vom Farbton in "Neutral".
const colorFamily = (hue, sat) => {
  if (sat < 0.12) return "Neutral";
  const h = ((hue % 360) + 360) % 360;
  if (h < 15 || h >= 345) return "Rot";
  if (h < 45)  return "Orange";
  if (h < 70)  return "Gelb";
  if (h < 160) return "Grün";
  if (h < 195) return "Türkis";
  if (h < 255) return "Blau";
  if (h < 290) return "Violett";
  return "Pink";
};
const FAMILY_ORDER = ["Rot","Orange","Gelb","Grün","Türkis","Blau","Violett","Pink","Neutral"];

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
  const { themeName, setThemeName, setThemeRev, amtFont, setAmtFont,
    themeSlideshow, setThemeSlideshow } = useContext(AppCtx);
  const [open, setOpen] = React.useState(false);
  const luma = c => { const h = toH(c); const r = parseInt(h.slice(1,3),16)||0, g = parseInt(h.slice(3,5),16)||0, b = parseInt(h.slice(5,7),16)||0; return (0.299*r+0.587*g+0.114*b)/255; };
  // Gruppierung: primär nach Farbfamilie der Akzentfarbe (T.blue — die
  // Hauptakzentfarbe jedes Themes, z.B. Buttons/Highlights), erst DARIN nach
  // Dunkel/Hell (wie zuvor die einzige Gruppierung war).
  const families = React.useMemo(() => {
    const saved = (() => { try { return JSON.parse(kvStore.getItem("mbt_custom_themes") || "{}"); } catch { return {}; } })();
    Object.entries(saved).forEach(([k, v]) => { if (!THEMES[k]) THEMES[k] = v; });
    const list = Object.entries(THEMES)
      .filter(([k]) => k !== "custom_preview")
      .map(([k, v]) => {
        const hsl = toHsl(v.blue || v.pos || v.bg);
        return { key: k, name: v.name || k, th: v, lum: luma(v.bg), family: colorFamily(hsl.h, hsl.s), accentHex: toH(v.blue || v.pos || v.bg) };
      });
    const byFamily = {};
    list.forEach(t => { (byFamily[t.family] ||= []).push(t); });
    return FAMILY_ORDER
      .filter(f => byFamily[f]?.length)
      .map(f => ({
        name: f,
        accentHex: byFamily[f][0].accentHex,
        dark:  byFamily[f].filter(t => t.lum < 0.5).sort((a,b)=>a.lum-b.lum),
        light: byFamily[f].filter(t => t.lum >= 0.5).sort((a,b)=>b.lum-a.lum),
      }));
  }, [themeName]);
  const cur = THEMES[themeName] || THEMES.dark;
  const pick = (key) => {
    setThemeSlideshow?.(false); // manuelle Auswahl beendet die laufende Diashow
    setThemeName?.(key);
    kvStore.setItem("mbt_theme", key);
    setThemeRev?.(r => r + 1);
    setOpen(false);
  };
  const renderItem = ({ key, name, th }) => {
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
  };
  // Haupt-Header: Farbfamilie (mit kleinem Farbpunkt in der Akzentfarbe).
  const famHdr = (label, count, accentHex) => (
    <div style={{ padding: "8px 12px 3px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
      textTransform: "uppercase", color: T.txt2, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: accentHex, flexShrink: 0 }}/>
      {label}{count!=null && <span style={{ opacity: 0.6, fontWeight: 600 }}> ({count})</span>}
    </div>
  );
  // Unter-Header: Dunkel/Hell INNERHALB einer Farbfamilie — bewusst leichter
  // gewichtet als famHdr, damit die Farbfamilie die klar dominante Gruppe bleibt.
  const subHdr = (label) => (
    <div style={{ padding: "3px 12px 2px 22px", fontSize: 9, fontWeight: 600, letterSpacing: "0.05em",
      textTransform: "uppercase", color: T.txt2, opacity: 0.6 }}>{label}</div>
  );
  // Schlichter Header ohne Farbpunkt — für Abschnitte außerhalb der
  // Farbfamilien-Gruppierung (z.B. "Beträge (Test)").
  const hdr = (label, count) => (
    <div style={{ padding: "6px 12px 3px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
      textTransform: "uppercase", color: T.txt2 }}>{label}{count!=null && <span style={{ opacity: 0.6, fontWeight: 600 }}> ({count})</span>}</div>
  );

  // Während der Diashow: Umschalter komplett ausblenden, damit der Bildschirm
  // frei zu sehen ist ("um alles sehen zu können") — statt des Swatch-Buttons
  // sitzt an derselben Stelle nur eine unsichtbare, aber weiter antippbare
  // Fläche, über die sich die Diashow wieder stoppen lässt (öffnet zugleich
  // das Dropdown, damit man direkt ein neues Theme wählen kann).
  if (themeSlideshow) {
    return (
      <button onClick={() => { setThemeSlideshow(false); setOpen(true); }} title="Diashow stoppen"
        style={{ padding: 2, border: "none", background: "transparent", cursor: "pointer",
          display: "inline-flex", borderRadius: 8, width: 26, height: 26, opacity: 0 }}/>
    );
  }

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
            {/* Diashow: schaltet jede Sekunde automatisch zum nächsten Theme
                (Intervall + Zustand leben in App.jsx/AppCtx, siehe dort —
                nicht hier lokal, weil manche Themes den Umschalter an einer
                anderen JSX-Stelle rendern und ein lokaler State beim
                Remount verloren ginge). Schließt das Dropdown sofort, damit
                der Bildschirm frei ist. */}
            <div onClick={() => { setThemeSlideshow?.(true); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 12px",
                cursor: "pointer" }}>
              <span style={{ display: "inline-flex", width: 20, height: 20, alignItems: "center",
                justifyContent: "center", flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke={T.txt2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
              <span style={{ fontSize: 12, color: T.txt, fontWeight: 400, flex: 1 }}>
                Diashow (1×/Sek.)
              </span>
              <div style={{ width: 34, height: 20, borderRadius: 10, flexShrink: 0,
                background: "rgba(128,128,128,0.3)",
                position: "relative", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 2, left: 2,
                  width: 16, height: 16, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${T.bd}`, margin: "2px 0 4px" }} />
            {families.map(fam => (
              <React.Fragment key={fam.name}>
                {famHdr(fam.name, fam.dark.length + fam.light.length, fam.accentHex)}
                {fam.dark.length>0 && subHdr("Dunkel")}
                {fam.dark.map(renderItem)}
                {fam.light.length>0 && subHdr("Hell")}
                {fam.light.map(renderItem)}
              </React.Fragment>
            ))}
            <div style={{ borderTop: `1px solid ${T.bd}`, margin: "5px 0 0" }} />
            {hdr("Beträge (Test)")}
            <div style={{ display: "flex", gap: 6, padding: "2px 12px 8px" }}>
              {[
                { v: "",         lbl: "Standard", cls: "amtw-q" },
                { v: "medium",   lbl: "Medium",   cls: "amtw-500" },
                { v: "semibold", lbl: "Semibold", cls: "amtw-600" },
              ].map(o => {
                const on = (amtFont || "") === o.v;
                return (
                  <button key={o.v} onClick={() => setAmtFont?.(o.v)}
                    style={{
                      flex: 1, padding: "5px 4px", cursor: "pointer",
                      borderRadius: 7, fontSize: 11, lineHeight: 1.25,
                      color: on ? T.blue : T.txt,
                      background: on ? `${T.blue}18` : "transparent",
                      border: `1px solid ${on ? T.blue : T.bd}`,
                    }}>
                    <span style={{ fontSize: 9, opacity: 0.75 }}>{o.lbl}</span><br/>
                    <span className={o.cls} style={{ fontSize: 13 }}>1.234</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { ThemeSwitcherMini };
