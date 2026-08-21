// Ein Satz statt einer Tabelle — der entspannte Blick auf die Liquidität.
//
// Nutzer-Wunsch: „Irgendwie suche ich nach einer Möglichkeit, mir nicht
// ständig darum Gedanken machen zu müssen, sondern recht entspannt auf Nummer
// sicher zu gehen."
//
// Zwei Aussagen, und nur die stehen hier:
//
//     „Am 12.04. fehlen 340 € — bis 09.04. vom Tagesgeld zurückholen."
//     „Am 12.04. fehlen 340 €, verfügbar sind nur 120 €."
//
// Der Unterschied ist der Kern: Ein Engpass, den das Tagesgeld deckt, ist eine
// Überweisung — kein Grund zur Sorge. Erst wenn es ihn NICHT deckt, muss
// wirklich etwas geändert werden.
//
// ── „Alles in Ordnung" bekommt KEINEN Balken ──────────────────────────
//
// Anfangs stand hier auch der gute Fall („Abgesichert bis Dez 32 — nichts zu
// tun."), in derselben Größe und Farbigkeit wie eine Warnung. Rückmeldung:
// „Das grüne dauerhafte Banner nimmt dauerhaft Platz weg. Die Information,
// dass alles gut ist, möchte ich eher dezent sehen — als Umrandung oder
// ähnlich."
//
// Das ist mehr als Geschmack: Eine Meldung, die an 360 von 365 Tagen dasselbe
// sagt, wird zur Tapete und nimmt den beiden anderen die Wirkung. Der gute
// Fall zeigt sich jetzt als Umrandung am Schild-Symbol in der Zeile darüber
// (siehe DashboardScreenV2) — sichtbar, wenn man hinschaut, und sonst still.
// Diese Komponente rendert dann schlicht nichts.
//
// ── Warum dieser Satz das orange Banner verdrängt ──────────────────────
//
// Dieselbe Schieflage stand gleichzeitig im orangen Balken ganz oben, in
// diesem Satz und in der Warnkarte („Die Warnungen nehmen Überhand"). Der Satz
// ist die beste der drei: Er sagt nicht nur, DASS etwas fehlt, sondern was zu
// tun ist. Solange er steht, tritt der orange Balken zurück — über denselben
// Modul-Speicher wie beim Sync-Hinweis (`SyncStatusBadge`), damit App.jsx
// nicht raten muss, ob gerade die Startseite sichtbar ist.

import React, { useSyncExternalStore } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { NUM_FONT } from "../../utils/format.js";
import { betrag } from "../../utils/betrag.jsx";
import { Li } from "../../utils/icons.jsx";
import { useAbsicherungsStatus } from "../../state/useAbsicherungsStatus.js";
import { knopfPaar, DUNKEL } from "../../theme/amtPill.js";

// ── Modul-Speicher: steht der Satz gerade als Balken auf dem Bildschirm? ──
let _sichtbar = 0;
const _hoerer = new Set();
const _melden = () => _hoerer.forEach((h) => h());
const _abonnieren = (h) => { _hoerer.add(h); return () => _hoerer.delete(h); };
const _stand = () => _sichtbar > 0;

export function useAbsicherungsSatzAktiv() {
  return useSyncExternalStore(_abonnieren, _stand, () => false);
}

const kurzDat = (iso) => {
  const [y, m, d] = String(iso).split("-");
  return `${d}.${m}.${String(y).slice(2)}`;
};

function AbsicherungsSatz({ onOeffnen }) {
  const status = useAbsicherungsStatus();
  // Nur der Handlungsfall bekommt einen Balken — siehe oben.
  const alsBalken = status.art !== "sicher";

  // An-/abmelden GENAU dann, wenn wirklich ein Balken steht: Nur dann darf der
  // orange Balken in App.jsx zurücktreten.
  React.useEffect(() => {
    if (!alsBalken) return undefined;
    _sichtbar++; _melden();
    return () => { _sichtbar--; _melden(); };
  }, [alsBalken]);

  if (!alsBalken) return null;

  // Farbe nach Bedeutung, Schrift dagegen gerechnet — nicht geraten. Die
  // Fläche ist deckend (wie beim Sync-Hinweis und der Super-Sparraten-Zeile):
  // eine Tönung sieht über 34 Themes jedes Mal anders aus.
  const ton = status.art === "rueckholen" ? T.gold : T.warn_bold;
  const paar = knopfPaar(ton, DUNKEL);
  // Nur Symbole aus dem statischen Satz (lucideStatic.js) — sie stehen
  // sofort, ohne auf den nachgeladenen Icon-Chunk zu warten.
  const symbol = status.art === "rueckholen" ? "arrow-down" : "alert-triangle";
  const klickbar = typeof onOeffnen === "function";

  return (
    <div onClick={klickbar ? onOeffnen : undefined}
      role={klickbar ? "button" : undefined} tabIndex={klickbar ? 0 : undefined}
      onKeyDown={klickbar ? (e) => { if (e.key === "Enter" || e.key === " ") onOeffnen(); } : undefined}
      style={{margin:"0 10px 6px",padding:"8px 12px",borderRadius:12,
        background:paar.grund,color:paar.schrift,cursor:klickbar?"pointer":"default",
        display:"flex",alignItems:"center",gap:8,fontSize:12,lineHeight:1.35}}>
      <span style={{flexShrink:0,display:"inline-flex"}}>{Li(symbol,15,paar.schrift)}</span>
      <div style={{flex:1,minWidth:0}}>
        {status.art === "rueckholen" && (
          <>Am <b>{kurzDat(status.tag)}</b> fehlen{" "}
            <b style={{fontFamily:NUM_FONT}}>{betrag(status.fehlt)} €</b>
            {" — bis "}<b>{kurzDat(status.holenBis)}</b> vom Tagesgeld zurückholen.</>
        )}
        {status.art === "eng" && (
          <>Am <b>{kurzDat(status.tag)}</b> fehlen{" "}
            <b style={{fontFamily:NUM_FONT}}>{betrag(status.fehlt)} €</b>
            {status.frei === null
              ? " — kein Tagesgeldkonto zugeordnet."
              : <>, verfügbar sind nur{" "}
                  <b style={{fontFamily:NUM_FONT}}>{betrag(status.frei)} €</b>.</>}
          </>
        )}
        {status.weitere > 0 && (
          <span> {" · "}+{status.weitere} weitere{status.weitere === 1 ? "r" : ""} Monat
            {status.weitere === 1 ? "" : "e"}</span>
        )}
      </div>
      {klickbar && <span style={{flexShrink:0,display:"inline-flex"}}>
        {Li("chevron-right",16,paar.schrift)}</span>}
    </div>
  );
}

export { AbsicherungsSatz };
export default AbsicherungsSatz;
