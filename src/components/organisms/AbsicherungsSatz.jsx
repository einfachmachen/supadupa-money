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

import React, { useContext } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { NUM_FONT } from "../../utils/format.js";
import { betrag } from "../../utils/betrag.jsx";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { saldoIst } from "../../utils/saldo.js";
import { absicherungsStatus } from "../../utils/absicherung.js";
import { knopfPaar, DUNKEL } from "../../theme/amtPill.js";

const MONATE_K = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const kurzDat = (iso) => {
  const [y, m, d] = String(iso).split("-");
  return `${d}.${m}.${String(y).slice(2)}`;
};
const monatText = (iso) => {
  const [y, m] = String(iso).split("-").map(Number);
  return `${MONATE_K[m - 1]} ${String(y).slice(2)}`;
};

function AbsicherungsSatz({ onOeffnen }) {
  const { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth,
    liquidityWarnings, navigateToSparen } = useContext(AppCtx);

  const heute = new Date();

  // Was auf dem Tagesgeld liegt — abzüglich Notgroschen. Das Zielkonto des
  // Sparplans ist die naheliegende Quelle; ohne zugeordnetes Konto lässt sich
  // über das Zurückholen nichts sagen (dann sagt der Satz das auch nicht).
  const tgAccId = kvStore.getItem("mbt_spar_accid") || "";
  const notgroschen = parseInt(kvStore.getItem("mbt_tg_notgroschen") || "0", 10) || 0;
  const tagesgeldFrei = React.useMemo(() => {
    if (!tgAccId || !(accounts || []).some((a) => a.id === tgAccId)) return null;
    try {
      const ctx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
      const stand = saldoIst(heute.getFullYear(), heute.getMonth(), heute.getDate(), tgAccId, ctx);
      if (stand === null || stand === undefined) return null;
      return stand - notgroschen;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, cats, accounts, tgAccId, notgroschen]);

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

  const oeffnen = onOeffnen || navigateToSparen;

  return (
    <div onClick={oeffnen}
      style={{margin:"0 10px 6px",padding:"7px 12px",borderRadius:12,
        background:paar.grund,color:paar.schrift,cursor:oeffnen?"pointer":"default",
        display:"flex",alignItems:"center",gap:8,fontSize:12,lineHeight:1.35}}>
      <span style={{flexShrink:0,display:"inline-flex"}}>{Li(symbol,15,paar.schrift)}</span>
      <div style={{flex:1}}>
        {status.art === "sicher" && (
          <><b>Abgesichert{status.bis ? ` bis ${monatText(status.bis + "-01")}` : ""}</b>
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
          <span style={{opacity:0.85}}> +{status.weitere} weitere</span>
        )}
      </div>
    </div>
  );
}

export { AbsicherungsSatz };
export default AbsicherungsSatz;
