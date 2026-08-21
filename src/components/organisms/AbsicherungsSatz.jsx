// Ein Satz statt einer Tabelle — der entspannte Blick auf die Liquidität.
//
// Nutzer-Wunsch: „Irgendwie suche ich nach einer Möglichkeit, mir nicht
// ständig darum Gedanken machen zu müssen, sondern recht entspannt auf Nummer
// sicher zu gehen."
//
// Die Sparplan-Tabelle kann alles beantworten, aber sie will gelesen werden.
// Hier steht eine einzige Aussage, dieselbe Stelle, jeden Tag:
//
//     „Abgesichert bis Mär 27 — nichts zu tun."
//     „Am 12.04. fehlen 340 € — bis 09.04. vom Tagesgeld zurückholen."
//     „Am 12.04. fehlen 340 €, verfügbar sind nur 120 €."
//
// Der Unterschied zwischen den letzten beiden ist der Kern: Ein Engpass, den
// das Tagesgeld deckt, ist eine Überweisung — kein Grund zur Sorge. Erst wenn
// es ihn NICHT deckt, muss wirklich etwas geändert werden.
//
// REINE AUSKUNFT. Hier wird nichts gebucht und nichts verschoben — das war die
// Bedingung, unter der dieser Schritt zuerst kommt: sofort spürbar, ohne dass
// eine Automatik Geld bewegt, deren Logik man noch nicht gesehen hat.
//
// ── Warum dieser Satz das orange Banner verdrängt ──────────────────────
//
// Rückmeldung nach dem ersten Einbau: „Die Warnungen nehmen Überhand."
// Dieselbe Schieflage stand gleichzeitig im orangen Balken ganz oben, in
// diesem Satz und in der Warnkarte im Panel. Drei Meldungen, ein Sachverhalt.
//
// Der Satz ist die bessere der drei: Er sagt nicht nur, DASS etwas fehlt,
// sondern was zu tun ist. Solange er steht, tritt der orange Balken zurück —
// über denselben Modul-Speicher wie beim Sync-Hinweis (`SyncStatusBadge`),
// damit App.jsx nicht raten muss, ob gerade die Startseite sichtbar ist.

import React, { useContext, useSyncExternalStore } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { NUM_FONT } from "../../utils/format.js";
import { betrag } from "../../utils/betrag.jsx";
import { Li } from "../../utils/icons.jsx";
import { useTagesgeldFrei } from "../../state/useTagesgeldFrei.js";
import { absicherungsStatus } from "../../utils/absicherung.js";
import { knopfPaar, DUNKEL } from "../../theme/amtPill.js";

// ── Modul-Speicher: steht der Satz gerade auf dem Bildschirm? ──────────
let _sichtbar = 0;
const _hoerer = new Set();
const _melden = () => _hoerer.forEach((h) => h());
const _abonnieren = (h) => { _hoerer.add(h); return () => _hoerer.delete(h); };
const _stand = () => _sichtbar > 0;

export function useAbsicherungsSatzAktiv() {
  return useSyncExternalStore(_abonnieren, _stand, () => false);
}

const MONATE_K = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const kurzDat = (iso) => {
  const [y, m, d] = String(iso).split("-");
  return `${d}.${m}.${String(y).slice(2)}`;
};
const monatText = (jjjjMm) => {
  const [y, m] = String(jjjjMm).split("-").map(Number);
  return `${MONATE_K[m - 1]} ${String(y).slice(2)}`;
};

function AbsicherungsSatz({ onOeffnen }) {
  const { txs, liquidityWarnings } = useContext(AppCtx);
  const tagesgeldFrei = useTagesgeldFrei();

  // Solange dieser Satz im Baum hängt, tritt der orange Balken zurück.
  React.useEffect(() => {
    _sichtbar++; _melden();
    return () => { _sichtbar--; _melden(); };
  }, []);

  // Bis wann überhaupt gerechnet wurde: der späteste Monat mit Vormerkungen.
  const horizontBis = React.useMemo(() => {
    let max = null;
    (txs || []).forEach((t) => {
      if (!t.pending) return;
      const d = String(t.date).slice(0, 7);
      if (!max || d > max) max = d;
    });
    return max;
  }, [txs]);

  const status = React.useMemo(() => absicherungsStatus({
    warnungen: liquidityWarnings, tagesgeldFrei, horizontBis,
  }), [liquidityWarnings, tagesgeldFrei, horizontBis]);

  // Farbe nach Bedeutung, Schrift dagegen gerechnet — nicht geraten. Die
  // Fläche ist deckend (wie beim Sync-Hinweis und der Super-Sparraten-Zeile):
  // eine Tönung sieht über 34 Themes jedes Mal anders aus.
  const ton = status.art === "sicher" ? T.pos : status.art === "rueckholen" ? T.gold : T.neg;
  const paar = knopfPaar(ton, DUNKEL);
  // Nur Symbole aus dem statischen Satz (lucideStatic.js) — sie stehen
  // sofort, ohne auf den nachgeladenen Icon-Chunk zu warten.
  const symbol = status.art === "sicher" ? "shield"
    : status.art === "rueckholen" ? "arrow-down" : "alert-triangle";

  // „Nichts zu tun" braucht keinen Weg irgendwohin — ein Pfeil, der nichts
  // aufmacht, war genau der gemeldete Fehlgriff („passiert nichts").
  const klickbar = status.art !== "sicher" && typeof onOeffnen === "function";

  return (
    <div onClick={klickbar ? onOeffnen : undefined}
      role={klickbar ? "button" : undefined} tabIndex={klickbar ? 0 : undefined}
      onKeyDown={klickbar ? (e) => { if (e.key === "Enter" || e.key === " ") onOeffnen(); } : undefined}
      style={{margin:"0 10px 6px",padding:"8px 12px",borderRadius:12,
        background:paar.grund,color:paar.schrift,cursor:klickbar?"pointer":"default",
        display:"flex",alignItems:"center",gap:8,fontSize:12,lineHeight:1.35}}>
      <span style={{flexShrink:0,display:"inline-flex"}}>{Li(symbol,15,paar.schrift)}</span>
      <div style={{flex:1,minWidth:0}}>
        {status.art === "sicher" && (
          <><b>Abgesichert{status.bis ? ` bis ${monatText(status.bis)}` : ""}</b>
            {" — nichts zu tun."}</>
        )}
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
      {/* Der Pfeil steht nur da, wo er auch etwas aufmacht. */}
      {klickbar && <span style={{flexShrink:0,display:"inline-flex"}}>
        {Li("chevron-right",16,paar.schrift)}</span>}
    </div>
  );
}

export { AbsicherungsSatz };
export default AbsicherungsSatz;
