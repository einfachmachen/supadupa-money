// Interaktive, hervorhebende Feature-Tour — ausgelöst über das "?"-Symbol im
// Hero. Anders als der statische FeatureTourScreen (Textkarten im Daten-Tab,
// bleibt als Alternative bestehen) hebt diese Version das jeweils erklärte
// UI-Element direkt hervor (Spotlight) und springt dafür bei Bedarf selbst
// zwischen den Tabs — Schritt für Schritt über "Weiter"/"Zurück".
//
// Architektur: läuft rein über echte DOM-Elemente mit data-tour-Attributen
// (siehe content/featureTourTargets.js) statt über direkten Zugriff auf
// lokalen State anderer Screens — genau wie ein echter Nutzer navigiert die
// Tour über Tab-Wechsel (setMainTab/setActiveStructurTab, AppCtx) und misst
// danach die Position des Ziel-Elements per getBoundingClientRect(). Das hält
// den Eingriff in bestehende, bereits fein abgestimmte Screens minimal (nur
// data-tour-Attribute, keine Logikänderung).
import React, { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { FEATURE_TOUR, FEATURE_TOUR_LEVELS } from "../../content/featureTour.js";
import { FEATURE_TOUR_TARGETS } from "../../content/featureTourTargets.js";

const POLL_MS = 60;
const POLL_TIMEOUT_MS = 1500;

function GuidedFeatureTour({ onClose }) {
  const { setMainTab, setSubTab, setActiveStructurTab } = useContext(AppCtx);
  const [stepIndex, setStepIndex] = useState(0);
  const [level, setLevel] = useState(() => kvStore.getItem("mbt_tourLevel") || "eli20");
  const [rect, setRect] = useState(null);   // {top,left,width,height} des Ziel-Elements, oder null
  const [ready, setReady] = useState(false); // true, sobald Ziel gefunden ODER Timeout erreicht
  const pollRef = useRef(null);

  const step = FEATURE_TOUR[stepIndex];
  const target = FEATURE_TOUR_TARGETS[stepIndex];
  const isLast = stepIndex === FEATURE_TOUR.length - 1;

  const pickLevel = (key) => { setLevel(key); kvStore.setItem("mbt_tourLevel", key); };

  // Bei jedem Schritt: richtigen Tab ansteuern, dann auf das Ziel-Element
  // warten (kurzes Polling — der Tab-Wechsel selbst braucht einen Render-
  // Zyklus) und seine Position messen. Kein Ziel-Selector → sofort "bereit"
  // (zentrierte Karte ohne Hervorhebung).
  //
  // WICHTIG (Regression, per Screenshot gemeldet): die vorherige Version gab
  // im Erfolgsfall `return true;` aus dem Effect zurück — das ist KEINE
  // gültige Cleanup-Funktion (React akzeptiert nur Funktionen oder
  // undefined), wurde also stillschweigend ignoriert. Der zuvor per
  // requestAnimationFrame geplante Callback lief dadurch auch dann noch,
  // wenn der Nutzer inzwischen (z. B. bei schnellem Weiter-Klicken) schon
  // beim NÄCHSTEN Schritt war — und überschrieb dessen frisch gesetztes
  // rect:null mit dem VERALTETEN Rechteck des vorherigen Ziel-Elements
  // (sichtbar als "Geister-Spotlight" an falscher Stelle, z. B. blieb der
  // gesamte Hero-Bereich unverdunkelt, obwohl der aktuelle Schritt gar kein
  // Ziel-Element hatte). `cancelled` schützt jetzt jeden asynchronen
  // Callback davor, nach einem Schritt-Wechsel noch zu greifen.
  useEffect(() => {
    setReady(false);
    setRect(null);
    if (target.tab === "home") { setMainTab("erfassen"); setSubTab("dashboard"); }
    else if (target.tab === "daten") { setMainTab("struktur"); setActiveStructurTab("daten"); }

    let cancelled = false;
    let rafId = null;

    if (!target.selector) { setReady(true); return () => { cancelled = true; }; }

    const start = Date.now();
    const tryFind = () => {
      const el = document.querySelector(target.selector);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        // Nach scrollIntoView einen Frame abwarten, damit die Position stimmt.
        rafId = requestAnimationFrame(() => {
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          setReady(true);
        });
        return true;
      }
      return false;
    };
    if (!tryFind()) {
      pollRef.current = setInterval(() => {
        if (cancelled) { clearInterval(pollRef.current); return; }
        if (tryFind() || Date.now() - start > POLL_TIMEOUT_MS) {
          clearInterval(pollRef.current);
          if (!cancelled) setReady(true); // Timeout: zentrierte Karte ohne Hervorhebung als Fallback
        }
      }, POLL_MS);
    }
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const goNext = () => { if (isLast) onClose?.(); else setStepIndex(i => i + 1); };
  const goPrev = () => setStepIndex(i => Math.max(0, i - 1));

  // Callout-Position: unterhalb des Ziels, wenn genug Platz ist, sonst
  // darüber; ohne Ziel (oder solange nicht "ready") zentriert.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const CARD_PAD = 14;
  let cardStyle;
  if (rect) {
    const spaceBelow = vh - rect.top - rect.height;
    const placeBelow = spaceBelow > 220 || spaceBelow > rect.top;
    cardStyle = placeBelow
      ? { top: Math.min(rect.top + rect.height + 14, vh - 60), left: CARD_PAD, right: CARD_PAD }
      : { bottom: Math.max(vh - rect.top + 14, 60), left: CARD_PAD, right: CARD_PAD };
  } else {
    cardStyle = { top: "50%", left: CARD_PAD, right: CARD_PAD, transform: "translateY(-50%)" };
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600 }}>
      {/* Abdunkelnder, klickblockierender Hintergrund. Ohne Ziel-Element: eine
          einfache flächige Abdunkelung. Mit Ziel-Element: der "Ausschnitt"
          entsteht rein visuell über den box-shadow-Trick am Hervorhebungs-
          Rahmen unten (spart die doppelte Abdunkelung). Die Tour bleibt
          bewusst vollständig modal (nur über die eigenen Buttons steuerbar),
          damit ein Antippen des hervorgehobenen Elements nicht versehentlich
          echte Navigation auslöst, während man gerade die Erklärung liest. */}
      {!rect && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }} />}

      {rect && (
        <div style={{
          position: "fixed",
          top: rect.top - 6, left: rect.left - 6,
          width: rect.width + 12, height: rect.height + 12,
          borderRadius: 16,
          border: `2px solid ${T.blue}`,
          boxShadow: `0 0 0 4000px rgba(0,0,0,0.72)`,
          pointerEvents: "none",
          transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
        }} />
      )}

      {/* Callout-Karte */}
      <div style={{ position: "fixed", ...cardStyle, background: T.surf, border: `1px solid ${T.bd}`,
        borderRadius: 16, padding: "14px 16px", boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        opacity: ready ? 1 : 0, transition: "opacity 0.15s ease", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${T.blue}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {Li(step.icon, 18, T.blue)}
          </div>
          <div style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 15, fontWeight: 700 }}>{step.title}</div>
          <button onClick={onClose} title="Tour beenden"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4,
              display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
            {Li("x", 18, T.txt2)}
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
          {FEATURE_TOUR_LEVELS.map(lv => {
            const active = lv.key === level;
            return (
              <button key={lv.key} onClick={() => pickLevel(lv.key)}
                style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 20, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
                  border: `1px solid ${active ? T.blue : T.bd}`,
                  background: active ? `${T.blue}22` : "transparent",
                  color: active ? T.blue : T.txt2 }}>
                {lv.label}
              </button>
            );
          })}
        </div>

        <div style={{ color: T.txt, fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
          {step[level]}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: T.txt2, fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
            {stepIndex + 1} / {FEATURE_TOUR.length}
          </span>
          <div style={{ flex: 1 }} />
          {stepIndex > 0 && (
            <button onClick={goPrev}
              style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${T.bd}`,
                background: "transparent", color: T.txt2, fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              Zurück
            </button>
          )}
          <button onClick={goNext}
            style={{ padding: "8px 16px", borderRadius: 10, border: "none",
              background: T.blue, color: T.on_accent || "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit" }}>
            {isLast ? "Fertig ✓" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { GuidedFeatureTour };
