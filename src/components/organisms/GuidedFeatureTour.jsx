// Interaktive, hervorhebende Feature-Tour — ausgelöst über das "?"-Symbol im
// Hero. Hebt das jeweils erklärte UI-Element direkt hervor (Spotlight) und
// springt dafür bei Bedarf selbst zwischen den Tabs — Schritt für Schritt
// über "Weiter"/"Zurück".
//
// Organisiert in drei frei anwählbaren "Zündstufen" (Reiter oben: Schnell-
// start/Komfort/Cloud & Bank, siehe content/guidedTourStages.js) — von
// einfach zu anspruchsvoll, aber ohne Zwang zur Reihenfolge: wer direkt zur
// Bank-Anbindung will, kann das jederzeit tun.
//
// Je Schritt zeigt die Karte standardmäßig die Einsteiger-Erklärung, die
// sich per "mehr …"/"noch mehr …" um die Profi- bzw. Erfahren-Ebene ergänzen
// lässt (setzt beim Schrittwechsel zurück — jeder Schritt startet wieder
// bei der Grundaussage). Die "Für Kids"-Ebene ist davon getrennt: ein
// Teddy-Symbol neben dem Schließen-Button schaltet die gesamte Tour in den
// Kids-Modus, genau wie das Teddy-Symbol im Hero (gleicher kvStore-Schlüssel
// "mbt_tourKids", damit beide Einstiegspunkte konsistent bleiben).
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
import { GUIDED_TOUR_STAGES } from "../../content/guidedTourStages.js";

const POLL_MS = 60;
const POLL_TIMEOUT_MS = 1500;

// Bunte Comic-Palette für den Kids-Modus — bewusst feste, kräftige Farben
// statt Theme-Tokens: die Kids-Ansicht soll wie ein Comicheft wirken,
// unabhängig vom gerade aktiven (ggf. gedeckten) Farbschema. Dieselbe
// Palette wie zuvor in der (inzwischen entfernten) statischen FeatureTour.
const COMIC_COLORS = ["#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#3BC9DB", "#4DABF7", "#B197FC", "#F783AC"];

function GuidedFeatureTour({ onClose, initialStage=0 }) {
  const { setMainTab, setSubTab, setActiveStructurTab, setMasterOverride, setTourPlusFly } = useContext(AppCtx);
  const [stageIndex, setStageIndex] = useState(initialStage);
  const [stepIndex, setStepIndex] = useState(0);
  const [kidsMode, setKidsMode] = useState(() => kvStore.getItem("mbt_tourKids") === "1");
  // Ausklapp-Stufe (0/1/2) für "mehr …"/"noch mehr …" — startet bei jedem
  // Schrittwechsel wieder bei 0, s. Effect unten.
  const [expandLevel, setExpandLevel] = useState(0);
  const [rect, setRect] = useState(null);   // {top,left,width,height} des Ziel-Elements, oder null
  const [ready, setReady] = useState(false); // true, sobald Ziel gefunden ODER Timeout erreicht
  const [plusRect, setPlusRect] = useState(null); // {top,height} des echten +-Knopfs — für die Karten-Positionierung
  const pollRef = useRef(null);

  const stage = GUIDED_TOUR_STAGES[stageIndex];
  const step = stage.steps[stepIndex];
  const target = step.target;
  // Fortlaufender Index über alle Stufen/Schritte hinweg — für eine stabile,
  // aber pro Schritt wechselnde Comic-Farbe/-Neigung im Kids-Modus.
  const flatIndex = GUIDED_TOUR_STAGES.slice(0, stageIndex).reduce((s,st)=>s+st.steps.length, 0) + stepIndex;
  const comicColor = COMIC_COLORS[flatIndex % COMIC_COLORS.length];
  const comicTilt = flatIndex % 2 === 0 ? -1.2 : 1.2;
  const isLastStepOfStage = stepIndex === stage.steps.length - 1;
  const isLastStage = stageIndex === GUIDED_TOUR_STAGES.length - 1;
  const isVeryLast = isLastStepOfStage && isLastStage;

  const toggleKids = () => {
    const next = !kidsMode;
    setKidsMode(next);
    kvStore.setItem("mbt_tourKids", next ? "1" : "0");
  };
  const expandMore = () => setExpandLevel(v => Math.min(2, v + 1));
  const collapseExpand = () => setExpandLevel(0);
  useEffect(() => { setExpandLevel(0); }, [stageIndex, stepIndex]);

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
          // Form des Ziels übernehmen (z.B. runder +/Datums-Button) — ein
          // fest verdrahtetes borderRadius:16 auf der Hervorhebung sah bei
          // runden Zielen wie ein zusätzliches "abgerundetes Quadrat" hinter
          // dem eigentlich kreisrunden Element aus (Nutzer-Feedback), weil
          // die Ecken der Box über den Kreis hinausragten.
          const targetRadius = getComputedStyle(el).borderRadius;
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height,
            borderRadius: targetRadius && targetRadius !== "0px" ? targetRadius : "16px" });
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
  const isPlusTarget = target.selector === '[data-tour="master-plus"]';

  // Misst die reale Position des +-Knopfs (unabhängig vom gerade
  // hervorgehobenen Ziel) — Grund: der Knopf steckt in der App-eigenen
  // unteren Navigationsleiste, die per CSS einen sehr hohen z-index trägt
  // (siehe themes.css, ".nav-bottom") und dadurch IMMER über der Tour liegt,
  // egal welchen z-index die Tour selbst hat. Ein fest verdrahteter
  // Sicherheitsabstand (siehe NAV_BOTTOM_H weiter unten) reicht deshalb
  // nicht, sobald der Knopf größer/anders positioniert ist als angenommen —
  // die Karte muss die ECHTE, gemessene Position kennen, um ihr in JEDEM
  // Schritt zuverlässig auszuweichen (Regression: Nutzer-Feedback, mehrere
  // Erklärkarten wurden trotz vorherigem Fix weiterhin vom +-Knopf verdeckt).
  useEffect(() => {
    const measure = () => {
      // ".plus-master-btn" statt "[data-tour=...]": Sobald die Tour selbst
      // den Override belegt (siehe Effect weiter unten), verliert der Knopf
      // sein data-tour-Attribut (das trägt nur die reguläre Variante,
      // MasterOverrideSlot rendert bewusst ohne) — die Klasse dagegen tragen
      // BEIDE Varianten, damit die Messung in jedem Zustand funktioniert.
      const el = document.querySelector('.plus-master-btn');
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPlusRect(prev => (prev && prev.top === r.top && prev.height === r.height) ? prev
        : { top: r.top, height: r.height });
    };
    measure();
    const rafId = requestAnimationFrame(measure); // erneut messen, nachdem Tab-Wechsel/Layout sich gesetzt haben
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", measure); };
  }, [ready]);

  // Während die Tour offen ist, übernimmt der +-Knopf selbst Weiter/Zurück/
  // Abbrechen (Tipp/Wisch-links/Doppel-Tipp) — zusätzlich zu den Buttons in
  // der Karte, nicht als Ersatz dafür. Beim Schritt, der den +-Knopf SELBST
  // erklärt ("Vormerkungen anlegen"), gilt das genauso — nur übernimmt dort
  // NICHT der echte Knopf die Navigation (der muss seine eigenen Gesten frei
  // demonstrieren können), sondern ein zweiter, zusätzlicher Knopf an seiner
  // Stelle (s. tourPlusFly-Effect unten und renderMasterButton in App.jsx).
  useEffect(() => {
    const words = [isVeryLast ? "Fertig✓" : isLastStepOfStage ? "Nächste" : "Weiter"];
    if (!isVeryFirst) words.push("←Zurück");
    words.push("2×Abbrechen");
    setMasterOverride({
      label: words.join(" "),
      confirmOnTapDismissOnDouble: true,   // Einzel-Tipp → onConfirm, Doppel-Tipp → onDismiss
      onConfirm: goNext,
      onBack: isVeryFirst ? null : goPrev,
      onDismiss: () => onClose?.(),
    });
    return () => setMasterOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIndex, stepIndex]);

  // "Vormerkungen anlegen": der echte +-Knopf fliegt sichtbar (sanft animiert)
  // in die Lücke zwischen Kartenunterkante und seiner normalen Position hoch,
  // statt dort zu bleiben, wo ihn die Karte ohnehin schon meidet — so bleibt
  // Platz für den zweiten (Navigations-)Knopf an seiner alten Stelle, UND der
  // hochgeflogene echte Knopf ist als Besonderheit klar erkennbar (goldener
  // Rand, s. renderMasterButton). plusOriginalTopRef merkt sich dafür die
  // zuletzt gemessene NORMALE Position (aus einem Schritt, in dem der Knopf
  // nicht selbst fliegt) — sonst würde die eigene Flugbewegung die nächste
  // Messung verfälschen (Rückkopplung).
  const plusOriginalTopRef = useRef(null);
  useEffect(() => {
    if (!isPlusTarget && plusRect) plusOriginalTopRef.current = plusRect.top;
  }, [plusRect, isPlusTarget]);

  const cardRef = useRef(null);
  const [cardBottom, setCardBottom] = useState(null);
  useEffect(() => {
    if (!isPlusTarget) { setCardBottom(null); return; }
    const measure = () => { if (cardRef.current) setCardBottom(cardRef.current.getBoundingClientRect().bottom); };
    const rafId = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", measure); };
  }, [isPlusTarget, expandLevel, kidsMode, ready]);

  useEffect(() => {
    if (!isPlusTarget || cardBottom == null || plusOriginalTopRef.current == null) {
      setTourPlusFly(null);
      return;
    }
    const GAP = 20;
    const gapTop = cardBottom + GAP;
    const gapBottom = plusOriginalTopRef.current - GAP;
    const targetTop = gapBottom > gapTop ? (gapTop + gapBottom) / 2 : gapTop;
    setTourPlusFly(Math.min(0, targetTop - plusOriginalTopRef.current));
  }, [isPlusTarget, cardBottom]);
  // Beim Verlassen der Tour in jedem Fall zurücksetzen.
  useEffect(() => () => setTourPlusFly(null), []);

  // Callout-Position: unterhalb des Ziels, wenn genug Platz ist, sonst
  // darüber; ohne Ziel (oder solange nicht "ready") zentriert. Der obere
  // Rand respektiert dabei IMMER die Notch/Statusleiste (safe-area-inset-top)
  // — max() lässt den Browser selbst entscheiden, je nach Gerät. Die Stufen-
  // Reiter sitzen INNERHALB der Karte (nicht mehr als eigene fixe Leiste
  // oben) — so überlappen sie nie den hervorgehobenen Bereich (z.B. den
  // Hero-Kontostand) und wandern automatisch mit an die jeweils freie Stelle.
  //
  // WICHTIG: die Karte bekommt zusätzlich eine maxHeight, die zu ihrer
  // Position passt — sonst schiebt "mehr …"/"noch mehr …" (variable Text-
  // länge) die Zurück/Weiter-Buttons irgendwann über den Bildschirmrand
  // hinaus und die Tour lässt sich nicht mehr bedienen. Das hervorgehobene
  // Feature selbst (der "rect"-Rahmen) bleibt davon unberührt an seiner
  // echten Position in der App — nur die Erklärung darunter/darüber darf
  // bei Bedarf intern scrollen (siehe overflowY am Textblock unten).
  //
  // REGRESSION gefunden beim Testen: die App hat eine EIGENE, immer
  // sichtbare untere Navigationsleiste (".nav-bottom", ca. 60px hoch,
  // Teil des normalen Seiteninhalts, nicht der Tour). War die Karte nah
  // genug am unteren Bildschirmrand platziert, landete ihre Zurück/Weiter-
  // Zeile GENAU in dieser Zone — die App-eigene Leiste fing den Klick dann
  // ab, ohne dass optisch etwas verdeckt aussah (Playwright bestätigte:
  // "<div> from <div class='nav-bottom'> intercepts pointer events").
  // Fix: ein Sicherheitsabstand unten, den die Karte (inkl. maxHeight) nie
  // unterschreitet — bevorzugt aus der ECHTEN, gemessenen Position des
  // +-Knopfs (plusRect) abgeleitet, weil ".nav-bottom" per CSS einen sehr
  // hohen z-index trägt (liegt IMMER über der Tour) und der Knopf selbst
  // weiter nach oben herausragt als die Leiste hoch ist — ein reiner
  // Leisten-Sicherheitsabstand reichte deshalb nicht aus (Regression:
  // Nutzer-Feedback, Karten wurden trotz vorherigem NAV_BOTTOM_H-Fix
  // weiterhin vom +-Knopf verdeckt). NAV_BOTTOM_H bleibt nur als Fallback,
  // solange plusRect noch nicht gemessen werden konnte.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const CARD_PAD = 14;
  const TOP_SAFE_APPROX = 40;   // grobe Notch/Statusleiste-Reserve für die Höhenrechnung
  const NAV_BOTTOM_H = 64;      // Fallback-Reserve, falls plusRect (noch) nicht gemessen werden konnte
  const PLUS_BTN_MARGIN = 14;
  const navBottomH = plusRect ? Math.max(NAV_BOTTOM_H, (vh - plusRect.top) + PLUS_BTN_MARGIN) : NAV_BOTTOM_H;
  const usableTop = TOP_SAFE_APPROX;
  const usableBottom = vh - navBottomH;
  const SAFE_TOP = "max(env(safe-area-inset-top, 0px) + 10px, 10px)";
  let cardStyle;
  if (target.pinCard === "top") {
    // Bewusst NICHT relativ zum Ziel platziert (siehe Kommentar am Schritt
    // in guidedTourStages.js) — manche Ziele (z.B. der große +-Button) sind
    // zu variabel in Größe/Position, um sie zuverlässig zu umgehen. Die
    // Hervorhebung (rect-Rahmen weiter unten) zeigt trotzdem an der echten
    // Stelle an; nur die Karte weicht konsequent an eine feste, sichere
    // Stelle aus.
    cardStyle = { top: `max(${SAFE_TOP}, ${usableTop}px)`, left: CARD_PAD, right: CARD_PAD,
      maxHeight: usableBottom - usableTop };
  } else if (rect) {
    const spaceBelow = usableBottom - rect.top - rect.height;
    const spaceAbove = rect.top - usableTop;
    const placeBelow = spaceBelow > 220 || spaceBelow > spaceAbove;
    if (placeBelow) {
      const top = Math.min(rect.top + rect.height + 14, usableBottom - 60);
      cardStyle = { top: `max(${SAFE_TOP}, ${top}px)`, left: CARD_PAD, right: CARD_PAD,
        maxHeight: Math.max(160, usableBottom - top) };
    } else {
      const bottom = Math.max(vh - rect.top + 14, navBottomH + 14);
      cardStyle = { bottom, left: CARD_PAD, right: CARD_PAD,
        maxHeight: Math.max(160, (vh - bottom) - usableTop) };
    }
  } else {
    const bandCenter = (usableTop + usableBottom) / 2;
    cardStyle = { top: bandCenter, left: CARD_PAD, right: CARD_PAD, transform: "translateY(-50%)",
      maxHeight: usableBottom - usableTop };
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
      {/* isPlusTarget: der echte Knopf fliegt sichtbar aus seiner ursprünglichen
          Position weg (s. tourPlusFly) — ein Hervorhebungs-Rahmen an der
          (dann veralteten) Ausgangsposition würde nur noch auf eine leere
          Stelle zeigen. Der goldene Rand am geflogenen Knopf selbst (siehe
          renderMasterButton in App.jsx) übernimmt die Hervorhebung stattdessen,
          vor einer schlichten, flächigen Abdunkelung. */}
      {(!rect || isPlusTarget) && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }} />}

      {rect && !isPlusTarget && (
        <div style={{
          position: "fixed",
          top: rect.top - 6, left: rect.left - 6,
          width: rect.width + 12, height: rect.height + 12,
          borderRadius: rect.borderRadius || 16,
          border: `2px solid ${T.blue}`,
          boxShadow: `0 0 0 4000px rgba(0,0,0,0.72)`,
          pointerEvents: "none",
          transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease, border-radius 0.25s ease",
        }} />
      )}

      {/* Callout-Karte — im Kids-Modus leicht schräg, kräftig umrandet mit
          Comic-Sticker-Schatten und großem Emoji-Badge (Stil wie zuvor in
          der entfernten statischen FeatureTour), sonst die normale,
          ruhige Karte. */}
      <div ref={cardRef} style={{ position: "fixed", ...cardStyle,
        transform: `${cardStyle.transform||""} rotate(${kidsMode?comicTilt:0}deg)`,
        background: T.surf,
        border: kidsMode ? `3px solid ${comicColor}` : `1px solid ${T.bd}`,
        borderRadius: kidsMode ? 22 : 16, padding: "14px 16px",
        boxShadow: kidsMode ? `4px 4px 0 ${comicColor}77, 0 12px 32px rgba(0,0,0,0.5)` : "0 12px 32px rgba(0,0,0,0.5)",
        opacity: ready ? 1 : 0, transition: "opacity 0.15s ease", maxWidth: 480, margin: "0 auto",
        display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Stufen-Reiter — jederzeit frei anwählbar, unabhängig vom Fortschritt.
            Sitzt jetzt oben IN der Karte statt als eigene fixe Leiste, damit
            nie etwas anderes (z.B. der Hero-Kontostand) überdeckt wird.
            flexShrink:0 — bleibt IMMER sichtbar, egal wie lang die
            aufgeklappte Erklärung darunter gerade ist. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexShrink: 0 }}>
          {GUIDED_TOUR_STAGES.map((s, i) => {
            const active = i === stageIndex;
            return (
              <button key={s.key} onClick={() => gotoStage(i)}
                style={{ flex: 1, padding: "6px 4px", borderRadius: 10, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                  border: `1.5px solid ${active ? T.blue : T.bd}`,
                  background: active ? `${T.blue}22` : "transparent",
                  color: active ? T.blue : T.txt2, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexShrink: 0 }}>
          {kidsMode ? (
            <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: comicColor, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, boxShadow: `0 3px 0 ${comicColor}99` }}>
              {step.emoji || "✨"}
            </div>
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `${T.blue}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {Li(step.icon, 18, T.blue)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, color: T.txt,
            fontSize: kidsMode ? 17 : 15, fontWeight: kidsMode ? 800 : 700 }}>{step.title}</div>
          <button onClick={toggleKids}
            title={kidsMode ? "Zur normalen Ansicht" : "Für Kids"}
            style={{ background: kidsMode ? `${comicColor}33` : "transparent", border: "none",
              cursor: "pointer", padding: 4, borderRadius: 8, fontSize: 16,
              display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
            🧸
          </button>
          <button onClick={onClose} title="Tour beenden"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4,
              display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
            {Li("x", 18, T.txt2)}
          </button>
        </div>

        {/* Erklärungstext — einziger Bereich, der bei Bedarf intern scrollt.
            flex:1 + minHeight:0 sorgt dafür, dass "mehr …"/"noch mehr …" die
            Karte nie über den verfügbaren Platz hinaus wachsen lässt: Kopf-
            zeile oben und Zurück/Weiter-Leiste unten bleiben so in jedem
            Ausklapp-Zustand sichtbar und bedienbar. */}
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", marginBottom: 12 }}>
          {kidsMode ? (
            <div style={{ color: T.txt, fontSize: 15.5, lineHeight: 1.55, fontWeight: 500 }}>
              {step.eli10}
            </div>
          ) : (
            <div>
              <div style={{ color: T.txt, fontSize: 13.5, lineHeight: 1.5 }}>{step.eli20}</div>
              {expandLevel>=1 && (
                <div style={{ color: T.txt2, fontSize: 12.5, lineHeight: 1.5, marginTop: 8,
                  paddingTop: 8, borderTop: `1px solid ${T.bd}` }}>{step.eli30}</div>
              )}
              {expandLevel>=2 && (
                <div style={{ color: T.txt2, fontSize: 12.5, lineHeight: 1.5, marginTop: 8,
                  paddingTop: 8, borderTop: `1px solid ${T.bd}` }}>{step.eli60}</div>
              )}
              <button onClick={expandLevel<2 ? expandMore : collapseExpand}
                style={{ marginTop: 8, background: "transparent", border: "none", cursor: "pointer",
                  color: T.blue, fontSize: 12, fontWeight: 700, fontFamily: "inherit", padding: 0 }}>
                {expandLevel===0 ? "mehr …" : expandLevel===1 ? "noch mehr …" : "▲ weniger anzeigen"}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
              background: kidsMode ? comicColor : T.blue, color: kidsMode ? "#1A1A1A" : (T.on_accent || "#fff"),
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {isVeryLast ? "Fertig ✓" : isLastStepOfStage ? "Nächste Stufe →" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { GuidedFeatureTour };
