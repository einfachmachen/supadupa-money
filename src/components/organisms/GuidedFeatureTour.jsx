// Interaktive, hervorhebende Feature-Tour — ausgelöst über das "?"-Symbol im
// Hero. Anders als der statische FeatureTourScreen (Textkarten im Daten-Tab,
// bleibt als Alternative bestehen) hebt diese Version das jeweils erklärte
// UI-Element direkt hervor (Spotlight) und springt dafür bei Bedarf selbst
// zwischen den Tabs — Schritt für Schritt über "Weiter"/"Zurück".
//
// Organisiert in drei frei anwählbaren "Zündstufen" (Reiter oben: Schnell-
// start/Komfort/Cloud & Bank, siehe content/guidedTourStages.js) — von
// einfach zu anspruchsvoll, aber ohne Zwang zur Reihenfolge: wer direkt zur
// Bank-Anbindung will, kann das jederzeit tun.
//
// Architektur: läuft rein über echte DOM-Elemente mit data-tour-Attributen
// statt über direkten Zugriff auf lokalen State anderer Screens — genau wie
// ein echter Nutzer navigiert die Tour über Tab-Wechsel (setMainTab/
// setActiveStructurTab, AppCtx) und misst danach die Position des Ziel-
// Elements per getBoundingClientRect(). Manche Ziele (z.B. die Sparen-/
// Warnungen-Kachel) sind erst nach einem Zwischenschritt sichtbar (Hero-
// Details ausklappen) — dafür klickt die Tour einmalig den optionalen
// "reveal"-Selektor an, bevor sie nach dem eigentlichen Ziel sucht.
import React, { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { FEATURE_TOUR_LEVELS } from "../../content/featureTour.js";
import { GUIDED_TOUR_STAGES } from "../../content/guidedTourStages.js";

const POLL_MS = 60;
const POLL_TIMEOUT_MS = 1500;

function GuidedFeatureTour({ onClose, initialStage=0 }) {
  const { setMainTab, setSubTab, setActiveStructurTab } = useContext(AppCtx);
  const [stageIndex, setStageIndex] = useState(initialStage);
  const [stepIndex, setStepIndex] = useState(0);
  const [level, setLevel] = useState(() => kvStore.getItem("mbt_tourLevel") || "eli20");
  const [rect, setRect] = useState(null);   // {top,left,width,height} des Ziel-Elements, oder null
  const [ready, setReady] = useState(false); // true, sobald Ziel gefunden ODER Timeout erreicht
  const pollRef = useRef(null);

  const stage = GUIDED_TOUR_STAGES[stageIndex];
  const step = stage.steps[stepIndex];
  const target = step.target;
  const isLastStepOfStage = stepIndex === stage.steps.length - 1;
  const isLastStage = stageIndex === GUIDED_TOUR_STAGES.length - 1;
  const isVeryLast = isLastStepOfStage && isLastStage;

  const pickLevel = (key) => { setLevel(key); kvStore.setItem("mbt_tourLevel", key); };

  const gotoStage = (i) => { setStageIndex(i); setStepIndex(0); };

  // Bei jedem Schritt: richtigen Tab ansteuern, ggf. einen "reveal"-Selektor
  // einmalig anklicken, dann auf das Ziel-Element warten (kurzes Polling —
  // der Tab-Wechsel selbst braucht einen Render-Zyklus) und seine Position
  // messen. Kein Ziel-Selector → sofort "bereit" (zentrierte Karte ohne
  // Hervorhebung).
  //
  // WICHTIG: alle asynchronen Callbacks (rAF/Interval) prüfen "cancelled",
  // bevor sie noch Wirkung zeigen — sonst kann ein verspätet auflösender
  // Callback vom VORHERIGEN Schritt dessen (dann längst überholte) Position
  // in den aktuellen Schritt durchschlagen lassen (siehe Regression: ganze
  // Bildschirmbereiche blieben trotz fehlendem Ziel unverdunkelt).
  useEffect(() => {
    setReady(false);
    setRect(null);
    if (target.tab === "home") { setMainTab("erfassen"); setSubTab("dashboard"); }
    else if (target.tab === "daten") { setMainTab("struktur"); setActiveStructurTab("daten"); }

    let cancelled = false;
    let rafId = null;
    let revealClicked = false;

    if (!target.selector) { setReady(true); return () => { cancelled = true; }; }

    const start = Date.now();
    const tryFind = () => {
      const el = document.querySelector(target.selector);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        rafId = requestAnimationFrame(() => {
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          setReady(true);
        });
        return true;
      }
      // Ziel (noch) nicht gefunden — einmalig den reveal-Selektor anklicken,
      // falls vorhanden (z.B. "Details anzeigen" ausklappen).
      if (target.reveal && !revealClicked) {
        revealClicked = true;
        const revealEl = document.querySelector(target.reveal);
        revealEl?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
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
  }, [stageIndex, stepIndex]);

  const goNext = () => {
    if (isVeryLast) { onClose?.(); return; }
    if (isLastStepOfStage) { setStageIndex(i => i + 1); setStepIndex(0); }
    else setStepIndex(i => i + 1);
  };
  const goPrev = () => {
    if (stepIndex > 0) { setStepIndex(i => i - 1); return; }
    if (stageIndex > 0) { setStageIndex(i => i - 1); setStepIndex(GUIDED_TOUR_STAGES[stageIndex-1].steps.length - 1); }
  };
  const isVeryFirst = stageIndex === 0 && stepIndex === 0;

  // Callout-Position: unterhalb des Ziels, wenn genug Platz ist, sonst
  // darüber; ohne Ziel (oder solange nicht "ready") zentriert. Der obere
  // Rand respektiert dabei IMMER die Notch/Statusleiste (safe-area-inset-top)
  // — max() lässt den Browser selbst entscheiden, je nach Gerät.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const CARD_PAD = 14;
  const SAFE_TOP = "max(env(safe-area-inset-top, 0px) + 8px, 8px)";
  // Mindestabstand für die Karte, wenn sie NAHE OBEN positioniert wird — muss
  // zusätzlich die Stufen-Reiter-Zeile (eigene Zeile knapp unter SAFE_TOP)
  // freihalten, sonst überlappen sich beide.
  const CARD_MIN_TOP = "max(env(safe-area-inset-top, 0px) + 56px, 56px)";
  let cardStyle;
  if (rect) {
    const spaceBelow = vh - rect.top - rect.height;
    const placeBelow = spaceBelow > 220 || spaceBelow > rect.top;
    cardStyle = placeBelow
      ? { top: `max(${CARD_MIN_TOP}, min(${rect.top + rect.height + 14}px, ${vh - 60}px))`, left: CARD_PAD, right: CARD_PAD }
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

      {/* Stufen-Reiter — jederzeit frei anwählbar, unabhängig vom Fortschritt.
          Sitzt oben, respektiert ebenfalls die Notch. */}
      <div style={{ position: "fixed", top: SAFE_TOP, left: CARD_PAD, right: CARD_PAD,
        display: "flex", gap: 6, zIndex: 601 }}>
        {GUIDED_TOUR_STAGES.map((s, i) => {
          const active = i === stageIndex;
          return (
            <button key={s.key} onClick={() => gotoStage(i)}
              style={{ flex: 1, padding: "8px 6px", borderRadius: 12, cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${active ? T.blue : T.bd}`,
                background: active ? `${T.blue}22` : T.surf,
                color: active ? T.blue : T.txt2, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.label}
            </button>
          );
        })}
      </div>

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
            {stage.label} · {stepIndex + 1}/{stage.steps.length}
          </span>
          <div style={{ flex: 1 }} />
          {!isVeryFirst && (
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
            {isVeryLast ? "Fertig ✓" : isLastStepOfStage ? "Nächste Stufe →" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { GuidedFeatureTour };
