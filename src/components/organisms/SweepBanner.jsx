// Banner rund um den Zins-Sweep. Zwei Zustände, beide zeitkritisch:
//
//   1) AM ZINSTERMIN (Monatsletzter der eingestellten Zinsmonate) — der Tag,
//      an dem die Überweisung aufs Tagesgeld raus muss. Das ist die eigentlich
//      wichtige Erinnerung: verpasst man sie, ist die Gelegenheit weg.
//   2) AB DEM RÜCKBUCHUNGSTAG, solange eine Sweep-Rückbuchung offen ist —
//      das Geld muss zurück aufs Giro, sonst fehlt es für die Belastungen am
//      Monatsanfang (genau die, die den Sweep-Betrag begrenzen).
//
// Der Betrag in Zustand 1 wird AM TAG SELBST frisch gerechnet, nicht aus einer
// vorab gespeicherten Zahl gelesen. Grund: Die monatliche Sparrate steht erst
// am Monatsletzten wirklich fest — werden nach dem Gehaltseingang noch
// Budget-Vormerkungen freigegeben, steigt der verfügbare Betrag teils
// deutlich. Ein Wert von vor drei Wochen wäre schlicht zu niedrig.
//
// Ist der Sweep für den Monat bereits vorgemerkt, zeigt das Banner den
// vorgemerkten Betrag — dann ist er die verbindliche Größe.

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { buildTxIdMap } from "../../utils/tx.js";
import { computeTagessaldoAt, buildTxsByMonth } from "../../utils/sparBerechnen.js";
import { DEFAULT_ZINS_MONATE, parseZinsMonate, monatsLetzter, sweepFenster,
  computeSweep, ohneSweepBuchungen } from "../../utils/zinsSweep.js";

const pad2 = (n) => String(n).padStart(2, "0");
const kurzDat = (iso) => {
  const [y, m, d] = String(iso).split("-");
  return `${d}.${m}.${String(y).slice(2)}`;
};

function SweepBanner() {
  const { txs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth,
    navigateToSparen, liquidityWarnings } = useContext(AppCtx);

  const heute = new Date();
  const heuteIso = `${heute.getFullYear()}-${pad2(heute.getMonth() + 1)}-${pad2(heute.getDate())}`;
  const zinsMonate = parseZinsMonate(kvStore.getItem("mbt_zins_monate")) ?? DEFAULT_ZINS_MONATE;
  const istZinstermin = zinsMonate.includes(heute.getMonth())
    && heuteIso === monatsLetzter(heute.getFullYear(), heute.getMonth());

  // Bereits vorgemerkt? Dann ist der vorgemerkte Betrag die verbindliche Größe.
  const monatsPfx = heuteIso.slice(0, 8);
  const vorgemerkt = (txs || []).find((t) => t.pending && t._sweepHin
    && t.accountId === "acc-giro" && String(t.date).startsWith(monatsPfx));

  // Live-Rechnung nur am Zinstermin und nur, wenn noch nichts vorgemerkt ist —
  // an allen anderen Tagen (also fast immer) fällt hier keine Arbeit an.
  const [liveSweep, setLiveSweep] = useState(null);
  const brauchtRechnung = istZinstermin && !vorgemerkt;
  React.useEffect(() => {
    if (!brauchtRechnung) { setLiveSweep(null); return; }
    let abgebrochen = false;
    const id = requestAnimationFrame(() => {
      if (abgebrochen) return;
      const giro = (accounts || []).find((a) => a.id === "acc-giro");
      const puffer = (giro && giro.minPuffer) || 0;
      const reineTxs = ohneSweepBuchungen(txs);
      const ctx = { txs: reineTxs, cats, accounts, getKumulierterSaldo, getCat,
        getBudgetForMonth, _restCache: {},
        _txsById: buildTxIdMap(reineTxs), _txsByMonth: buildTxsByMonth(reineTxs) };
      const f = sweepFenster(heuteIso);
      const salden = f.tage.map((d) => ({ date: d, saldo: computeTagessaldoAt(d, "acc-giro", ctx) }));
      const planName = kvStore.getItem("mbt_spar_planname") || "Sparplan 1";
      const desc = `Sparen·${planName}`;
      const rateTx = reineTxs.find((t) => t.pending && !t._linkedTo && t.desc === desc
        && t.accountId === "acc-giro" && String(t.date).startsWith(monatsPfx));
      const r = computeSweep({ salden, puffer,
        sofortRueck: kvStore.getItem("mbt_zins_sofortrueck") === "1",
        normaleSparrate: rateTx ? Math.abs(rateTx.totalAmount) : 0 });
      if (abgebrochen) return;
      setLiveSweep(r ? { ...r, bis: f.bis } : null);
    });
    return () => { abgebrochen = true; cancelAnimationFrame(id); };
  }, [brauchtRechnung, txs, accounts, heuteIso, monatsPfx]);

  // ── Zustand 2: offene Rückbuchung, deren Termin erreicht ist ──────────
  const rueckFaellig = (txs || [])
    .filter((t) => t.pending && t._sweepId && t.accountId === "acc-giro"
      && t.totalAmount > 0 && String(t.date) <= heuteIso)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];

  const box = (farbe, icon, titel, zeile, betrag) => (
    <div onClick={navigateToSparen}
      style={{ margin: "0 10px 6px", borderRadius: 10,
        cursor: navigateToSparen ? "pointer" : "default",
        background: `${farbe}18`, border: `1px solid ${farbe}66`,
        padding: "9px 11px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flexShrink: 0, display: "flex" }}>{Li(icon, 17, farbe)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: farbe, fontSize: 12, fontWeight: 700 }}>{titel}</div>
        <div style={{ color: T.txt, fontSize: 11, lineHeight: 1.45 }}>{zeile}</div>
      </div>
      {betrag !== null && betrag !== undefined && (
        <div style={{ flexShrink: 0, color: farbe, fontSize: 15, fontWeight: 800,
          fontFamily: NUM_FONT }}>{fmt(betrag)} €</div>
      )}
    </div>
  );

  // Zustand 1 hat Vorrang: heute ist der Tag, an dem gehandelt werden muss.
  if (istZinstermin) {
    const betrag = vorgemerkt ? Math.abs(vorgemerkt.totalAmount) : (liveSweep && liveSweep.hin);
    const bis = vorgemerkt
      ? sweepFenster(heuteIso).bis
      : (liveSweep && liveSweep.bis);
    if (betrag > 0) {
      return box(T.gold, "zap", "Heute ist Zinstermin",
        `${vorgemerkt ? "vorgemerkt" : "aktuell möglich"} — aufs Tagesgeld, zurück am ${kurzDat(bis)}`,
        betrag);
    }
    // Kein Spielraum (oder noch am Rechnen): trotzdem an den Tag erinnern.
    return box(T.gold, "zap", "Heute ist Zinstermin",
      liveSweep ? "Aktuell kein Spielraum über dem min. Saldo." : "Betrag wird ermittelt …", null);
  }

  // ── Zustand 3: Engpass, den die noch offene Rückbuchung deckt ────────
  // Der Sweep drückt den Giro-Saldo bewusst bis an den Puffer (mit
  // Sofort-Rückbuchung sogar darunter) — die Liquiditätswarnung schlägt
  // dadurch zwangsläufig an. Für sich genommen ist sie richtig, aber ohne
  // Zusammenhang: der Engpass ist eingeplant und wird durch die Rückbuchung
  // aufgelöst. Deshalb hier VOR der allgemeinen Warnung der konkrete Betrag,
  // der vom Tagesgeld zurück MUSS.
  const rueckOffen = (txs || [])
    .filter((t) => t.pending && t._sweepId && t.accountId === "acc-giro" && t.totalAmount > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  if (!rueckFaellig && rueckOffen && (liquidityWarnings || []).length) {
    const quelle = (txs || []).find((q) => q.id === rueckOffen._linkedTo);
    const quellKonto = accounts.find((a) => a.id === (quelle && quelle.accountId));
    return box(T.neg, "alert-triangle", "Rücküberweisung nötig",
      `${fmt(Math.abs(rueckOffen.totalAmount))} € müssen am ${kurzDat(rueckOffen.date)} von `
      + `${quellKonto ? quellKonto.name : "Tagesgeld"} zurück aufs Giro — sonst bleibt der `
      + `gemeldete Engpass bestehen.`,
      Math.abs(rueckOffen.totalAmount));
  }

  if (rueckFaellig) {
    const quelle = (txs || []).find((q) => q.id === rueckFaellig._linkedTo);
    const quellKonto = accounts.find((a) => a.id === (quelle && quelle.accountId));
    const ueberfaellig = String(rueckFaellig.date) < heuteIso;
    return box(ueberfaellig ? T.neg : T.gold,
      ueberfaellig ? "alert-triangle" : "arrow-left-right",
      ueberfaellig ? "Rücküberweisung überfällig" : "Rücküberweisung fällig",
      `${quellKonto ? `${quellKonto.name} → Giro` : "zurück aufs Giro"} · seit ${kurzDat(rueckFaellig.date)}`
        + (ueberfaellig ? " — die Belastungen am Monatsanfang brauchen das Geld auf dem Giro." : ""),
      Math.abs(rueckFaellig.totalAmount));
  }

  return null;
}

export { SweepBanner };
