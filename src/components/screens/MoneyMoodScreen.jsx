// "Money Mood" — zahlenarme Jahresübersicht der finanziellen Tendenz.
//
// Idee (iPhone 13 mini): statt winziger Zahlen je Haupt-/Unterkategorie eine
// farbcodierte Mini-Sparkline über 12 Monate. Die Ampel misst NICHT das Budget,
// sondern den Vergleich zum eigenen Schnitt der letzten 12 Monate:
//   grün  = im üblichen Rahmen (auch ohne Budget)
//   gelb  = spürbar über dem Schnitt
//   rot   = massiv über dem Schnitt (Schieflage)
// Bei Einnahmen invertiert (massiv unter dem Schnitt = rot).
//
// Tippen auf eine Zeile → Drilldown: 12 Monatsbalken mit Gesamtbetrag oben,
// klickbar; darüber zeigt ein Detail-Drilldown, wie sich der Monat zusammensetzt
// (Hauptkategorie → Unterkategorien, Unterkategorie → einzelne Buchungen).

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, isLightTheme } from "../../theme/activeTheme.js";
import { MONTHS_S, MONTHS_F } from "../../utils/constants.js";
import { fmt, pn, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { pendingForecast, monthlyStrain } from "../../utils/moodForecast.js";
import { YearSectionHeader } from "../molecules/YearSectionHeader.jsx";

const RANGE = 12;
// Kategorie-Priorität: bestimmt, welche Posten bei einer Schieflage zuerst als
// Kürz-Vorschlag erscheinen. flexibel = realistisch kürzbar (zuerst), essentiell
// = Pflicht (zuletzt, gedämpft). Default „normal" in der Mitte.
const PRIO_RANK = { flex: 0, normal: 1, essential: 2 };
const PRIO_META = {
  flex:      { label: "Flexibel",   short: "kürzbar",    color: T.gold, icon: "scissors" },
  normal:    { label: "Normal",     short: "",           color: T.txt2, icon: "minus" },
  essential: { label: "Essentiell", short: "Pflicht",    color: T.pos,  icon: "lock" },
};
const PRIO_ORDER = ["essential", "normal", "flex"];
// Schwellen für die Abweichung vom 12-Monats-Schnitt (dev = Ist / Schnitt).
const EXP = { warn: 1.2, bad: 1.5 };   // Ausgaben: höher = schlechter
const INC = { warn: 0.8, bad: 0.5 };   // Einnahmen: niedriger = schlechter

// dev (Abweichung vom Schnitt) → Ampelfarbe + Schweregrad (0 ok · 1 warn · 2 rot).
function classify(dev, isIncome) {
  if (dev == null) return { c: T.bd, sev: -1 };           // zu wenig Historie
  if (isIncome) {
    if (dev >= INC.warn) return { c: T.pos, sev: 0 };
    if (dev >= INC.bad) return { c: T.gold, sev: 1 };
    return { c: T.neg, sev: 2 };
  }
  if (dev <= EXP.warn) return { c: T.pos, sev: 0 };
  if (dev <= EXP.bad) return { c: T.gold, sev: 1 };
  return { c: T.neg, sev: 2 };
}

const fmtK = (v) => v >= 1000 ? (Math.round(v / 100) / 10) + "k" : String(Math.round(v));

function MoneyMoodScreen() {
  const { cats, groups, txs, year, selAcc, getActualSum, getBudgetForMonth, getAcc, getTotalIncome, getTotalExpense, openEdit, updateCat } = useContext(AppCtx);
  const [openCat, setOpenCat] = useState(null);   // aufgeklappte Hauptkategorie
  const [detail, setDetail] = useState(null);     // { row, isSub, isIncome }
  const [heroOpen, setHeroOpen] = useState(false);          // Hero-Details auf/zu
  const [catSortMode, setCatSortMode] = useState("mood");   // custom | desc | asc | mood
  // Akzent wie +Button/Kontostand im Hero (rote Spark-Balken im eingeklappten Modus).
  const plusAccent = T.themeName === "terminal" ? T.pos : T.blue;
  const isLight = isLightTheme();
  const cardBg = T.surf || (isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)");

  const now = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth();
  // Jüngster abgeschlossener Monat: aktuelles Jahr → Vormonat; frühere → Dez.
  const recentIdx = year < nowY ? 11 : year > nowY ? -1 : Math.max(0, nowM - 1);
  const elapsedIdx = year < nowY ? 11 : year > nowY ? -1 : nowM;

  // ── Vormerkungen (pending) je Unterkategorie/Monat + als Gesamt-Summen ────────
  // Damit die Sparklines nicht nur den Ist-Stand zeigen, sondern eine Vorschau:
  // gebucht + vorgemerkt. So schlagen z. B. künftige Finanzierungsraten schon vor
  // der Buchung als Schieflage durch. Konto-Filter wie bei den Ist-Summen.
  const catTypeById = useMemo(() => {
    const m = {};
    cats.forEach(c => { m[c.id] = c.type; });
    return m;
  }, [cats]);
  const pend = useMemo(
    () => pendingForecast(txs, { year, selAcc, catTypeById }),
    [txs, selAcc, year, catTypeById]);

  // Reihen je Block (Einnahmen/Ausgaben) mit 12-Monats-Serie + 24-Monats-„ext"
  // (Vorjahr+Jahr) für den gleitenden 12-Monats-Schnitt.
  const blocks = useMemo(() => {
    // Laufender oder künftiger Monat (nur dort floort das Budget die Vorschau).
    const upcoming = (mi) => year > nowY || (year === nowY && mi >= nowM);
    const extForSub = (subId) => {
      const ext = [];
      for (let k = 0; k < 24; k++) {
        const y = k < 12 ? year - 1 : year, m = k % 12;
        ext.push(Math.abs(getActualSum(y, m, subId, "E") || 0));
      }
      const budget = [];
      for (let mi = 0; mi < RANGE; mi++) budget.push(Math.abs(getBudgetForMonth(subId, year, mi) || 0));
      // Vorschau: gebuchter Ist-Wert + offene Vormerkungen des Monats. Der
      // 24-Monats-Schnitt (ext) bleibt rein gebucht → Vergleichsbasis = echte Historie.
      const actual = ext.slice(12).map((v, mi) => v + (pend.sub[`${mi}:${subId}`] || 0));
      // Forecast-Balken: zusätzlich das Budget als geplante Ausgabe einrechnen –
      // aber nur für laufende/künftige Monate (Vergangenheit = Realität, kein
      // Aufblähen auf das Budget). Budget gilt als Untergrenze, nicht additiv:
      // bereits gebuchtes/vorgemerktes zehrt es auf, Überschreitung schlägt durch.
      const fore = actual.map((v, mi) => upcoming(mi) ? Math.max(v, budget[mi] || 0) : v);
      return { ext, actual, budget, fore };
    };
    const add = (a, b) => a.map((v, i) => v + (b[i] || 0));

    const mk = (isIncome) => {
      const out = [];
      const grps = groups.filter(g => {
        const beh = g.behavior || g.type;
        return isIncome ? (beh === "income" || g.type === "income")
          : (beh === "expense" || g.type === "expense" || (beh !== "income" && g.type !== "income" && g.type !== "tagesgeld"));
      });
      grps.forEach(grp => {
        cats.filter(c => c.type === grp.type).forEach(cat => {
          let cExt = Array(24).fill(0), cBud = Array(RANGE).fill(0), cAct = Array(RANGE).fill(0), cFore = Array(RANGE).fill(0);
          const subs = (cat.subs || []).map(sub => {
            const s = extForSub(sub.id);
            cExt = add(cExt, s.ext); cBud = add(cBud, s.budget); cAct = add(cAct, s.actual); cFore = add(cFore, s.fore);
            return { id: sub.id, name: sub.name, ...s };
          });
          if (cExt.every(v => v === 0) && cBud.every(v => v === 0) && cAct.every(v => v === 0)) return;
          out.push({ id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, priority: cat.priority || "normal", isIncome, ext: cExt, actual: cAct, budget: cBud, fore: cFore, subs });
        });
      });
      return out;
    };
    return { expense: mk(false), income: mk(true) };
  }, [cats, groups, year, getActualSum, getBudgetForMonth, pend]);

  // Monate, in denen die Gesamtlage kippt: Ausgaben > Einnahmen (Schieflage).
  // Nur dann werden Kategorien überhaupt gelb/rot eingefärbt.
  const strainFull = useMemo(() => {
    // Gleiche Quelle wie der globale Warnbanner (utils/moodForecast) → nie widersprüchlich.
    const isUpcoming = (mi) => year > nowY || (year === nowY && mi >= nowM);
    return monthlyStrain({
      year, cats, groups, pend,
      getActualSum, getBudgetForMonth, getTotalIncome, getTotalExpense, isUpcoming,
    });
  }, [year, cats, groups, pend, getActualSum, getBudgetForMonth, getTotalIncome, getTotalExpense]);
  const strained = strainFull.strained;
  // Alle kommenden Schieflage-Monate im betrachteten Jahr. Je Monat die Treiber
  // sortiert nach Priorität (flexibel/kürzbar zuerst, essentiell zuletzt), dann
  // nach Betrag — so „springt" der oberste Treiber nicht mehr nach Betrag, sondern
  // zeigt stabil die realistisch kürzbaren Posten.
  const strainMonths = useMemo(() => {
    const out = [];
    for (let mi = 0; mi < RANGE; mi++) {
      const up = year > nowY || (year === nowY && mi >= nowM);
      if (!up || !strainFull.strained[mi]) continue;
      const drivers = blocks.expense
        .map(r => ({
          row: r, val: r.fore[mi] || 0, prio: r.priority || "normal",
          // Vom Budget gehalten? Dann senkt das Löschen von Vormerkungen den Posten
          // NICHT — die Vorschau floort auf das geplante Budget (max(Ist+VM, Budget)).
          fromBudget: (r.budget[mi] || 0) > (r.actual[mi] || 0) + 0.5,
        }))
        .filter(d => d.val > 0)
        .sort((a, b) => (PRIO_RANK[a.prio] - PRIO_RANK[b.prio]) || (b.val - a.val))
        .slice(0, 4);
      const exp = Math.round(strainFull.exp[mi]), inc = Math.round(strainFull.inc[mi]);
      out.push({ mi, exp, inc, over: exp - inc, drivers });   // exp − inc geht sichtbar exakt auf (= Banner)
    }
    return out;
  }, [strainFull, blocks, year]);
  // Im Panel ausgewählter Schieflage-Monat (Default: frühester). Fällt der gewählte
  // Monat weg (z. B. nach dem Kürzen), rutscht die Auswahl automatisch auf den ersten.
  const [selStrainMi, setSelStrainMi] = useState(null);
  const activeStrain = strainMonths.find(s => s.mi === selStrainMi) || strainMonths[0] || null;

  // Ist-Wert + gleitender 12-Monats-Schnitt + Abweichung (nur Monate mit Bewegung;
  // <2 Datenpunkte → null = neutral, damit Neues nicht sofort auffällt).
  const statAt = (row, mi) => {
    const v = row.fore[mi];
    const win = row.ext.slice(mi, mi + 12).filter(x => x > 0);
    if (win.length < 2) return null;
    const avg = win.reduce((s, x) => s + x, 0) / win.length;
    return avg > 0 ? { v, avg, dev: v / avg } : null;
  };
  // „Gesamtlage zuerst": Kategorie nur einfärben, wenn der Monat insgesamt kippt
  // UND die Kategorie spürbar (≥ FLOOR €) über ihrem Schnitt liegt (bzw. Einnahmen
  // darunter). Sonst grün. Passt das Gesamtbild → alles grün.
  const FLOOR = 75;
  const monthMood = (row, mi) => {
    const v = row.fore[mi];
    if (v <= 0) return { c: T.bd, sev: -1 };
    if (!strained[mi]) return { c: T.pos, sev: 0 };
    const st = statAt(row, mi);
    if (!st) return { c: T.pos, sev: 0 };
    const gap = row.isIncome ? (st.avg - st.v) : (st.v - st.avg);
    if (gap < FLOOR) return { c: T.pos, sev: 0 };
    return classify(st.dev, row.isIncome);
  };
  // Reihen-Stimmung = schlimmster Monat ab dem aktuellen (inkl. kommender Belastungen).
  const rowMood = (row) => {
    let best = { c: T.bd, sev: -1 };
    const start = recentIdx < 0 ? 0 : recentIdx;
    for (let mi = start; mi < RANGE; mi++) {
      if (row.fore[mi] <= 0) continue;
      const m = monthMood(row, mi);
      if (m.sev > best.sev) best = m;
    }
    return best;
  };

  // ── Mini-Sparkline: 12 Balken, Höhe = relative Größe ──
  // Hero ausgeklappt → volle Ampelfarben. Eingeklappt (Anfangsansicht) → ruhig
  // weiß wie im Dashboard, rote Monate in der +Button/Kontostand-Akzentfarbe.
  const Spark = ({ row, h = 24 }) => {
    const maxV = Math.max(1, ...row.fore);
    // Schmaler + rechtsbündig → Sparkline beginnt weiter rechts, einheitliche Spalte.
    return (
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 1, height: h, width: 60, marginLeft: 16, flexShrink: 0 }}>
        {row.fore.map((v, mi) => {
          const m = monthMood(row, mi);
          const barC = heroOpen ? m.c : (m.sev >= 2 ? plusAccent : T.txt);
          const bh = Math.max(2, Math.round((v / maxV) * h));
          return <div key={mi} title={`${MONTHS_S[mi]}: ${fmt(v)}`}
            style={{ width: 4, height: bh, background: v > 0 ? barC : T.bd, opacity: v > 0 ? (mi === recentIdx ? 1 : 0.9) : 0.18, borderRadius: 1 }} />;
        })}
      </div>
    );
  };

  const MoodDot = ({ c, sev }) => (
    <div style={{ width: 9, height: 9, borderRadius: "50%", background: sev < 0 ? "transparent" : c, border: sev < 0 ? `1px solid ${T.bd}` : "none", flexShrink: 0 }} />
  );

  // ── Kategorie-Karte wie im Dashboard (kombinierte Liste, Einnahmen + Ausgaben) ──
  const renderCard = (row) => {
    const mood = rowMood(row);
    const accent = row.color || (row.isIncome ? T.pos : T.neg);
    const subs = (row.subs || []).filter(s => s.fore.some(v => v > 0) || s.budget.some(v => v > 0));
    const open = openCat === row.id;
    return (
      <div key={row.id} style={{ background: cardBg, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "4px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Icon-Kästchen in Kategoriefarbe wie im Dashboard */}
          <div style={{ width: 30, height: 30, borderRadius: 8, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {Li(row.icon || "folder", 18, accent)}
          </div>
          <button onClick={() => setDetail({ row, isSub: false, isIncome: row.isIncome })}
            style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, minHeight: 30 }}>
            <span style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 20, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
            <Spark row={row} h={24} />
            <MoodDot {...mood} />
          </button>
          {subs.length > 0 && (
            <button onClick={() => setOpenCat(o => o === row.id ? null : row.id)}
              style={{ flexShrink: 0, width: 30, height: 30, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {Li(open ? "chevron-up" : "chevron-down", 15, T.txt2)}
            </button>
          )}
        </div>
        {open && subs.map(s => {
          const srow = { ...s, isIncome: row.isIncome };
          const sm = rowMood(srow);
          return (
            <button key={s.id} onClick={() => setDetail({ row: srow, isSub: true, isIncome: row.isIncome })}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "6px 0 6px 38px", background: "transparent", border: "none", borderTop: `1px solid ${T.bd}`, cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ flex: 1, minWidth: 0, color: T.txt2, fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              <Spark row={srow} h={18} />
              <MoodDot {...sm} />
            </button>
          );
        })}
      </div>
    );
  };

  // Kombinierte, durchsortierbare Liste (Einnahmen + Ausgaben), Modi wie im Dashboard
  // plus „Auffällig" (rötester/auffälligster Monat zuerst).
  const yearTotal = (row) => row.fore.reduce((s, v) => s + v, 0);
  const allRows = [...blocks.income, ...blocks.expense];

  // Bei Jahrwechsel (Links/Rechts-Wisch am + Button) den offenen Drilldown auf die
  // gleiche Kategorie/Unterkategorie des neuen Jahres aktualisieren, statt veraltet
  // stehenzubleiben. Existiert sie im neuen Jahr nicht → Drilldown schließen.
  useEffect(() => {
    if (!detail) return;
    let next = null;
    if (detail.isSub) {
      for (const cat of allRows) {
        const s = (cat.subs || []).find(x => x.id === detail.row.id);
        if (s) { next = { ...s, isIncome: cat.isIncome }; break; }
      }
    } else {
      next = allRows.find(r => r.id === detail.row.id) || null;
    }
    if (next) { if (next !== detail.row) setDetail(d => d ? { ...d, row: next } : d); }
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);
  const sortedRows = (() => {
    const arr = [...allRows];
    if (catSortMode === "desc") arr.sort((a, b) => yearTotal(b) - yearTotal(a));
    else if (catSortMode === "asc") arr.sort((a, b) => yearTotal(a) - yearTotal(b));
    else if (catSortMode === "mood") arr.sort((a, b) => rowMood(b).sev - rowMood(a).sev);
    return arr;   // "custom" → natürliche Reihenfolge (Dashboard-/cats-Order)
  })();

  // Sortier-Buttons (wie Dashboard) + Farb-Legende — beides nur im Hero-Ausklappmodus.
  const headerExtras = (
    <>
      <div style={{ padding: "6px 12px 2px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["custom", "✎ Eigene"], ["desc", "↓"], ["asc", "↑"], ["mood", "Auffällig"]].map(([mode, lbl]) => (
          <button key={mode} onClick={() => setCatSortMode(mode)}
            style={{ background: catSortMode === mode ? T.blue : "transparent", color: catSortMode === mode ? (T.on_accent || "#000") : T.txt2, border: `1px solid ${catSortMode === mode ? T.blue : T.bd}`, borderRadius: 14, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{ color: T.txt2, fontSize: 11, padding: "4px 14px 6px", lineHeight: 1.45 }}>
        <b style={{ color: T.gold }}>Gelb</b>/<b style={{ color: T.neg }}>rot</b> nur in Monaten, in denen insgesamt mehr aus- als einging –
        {" "}und diese Kategorie auffällig dazu beitrug. Sonst <b style={{ color: T.pos }}>grün</b>.
        {" "}Die Balken zeigen die <b style={{ color: T.txt }}>Vorschau</b>: gebucht + Vormerkungen, damit künftige Belastungen früh sichtbar werden.
      </div>
    </>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", background: T.bg }}>
      <YearSectionHeader active="mood" detailsOpen={heroOpen} setDetailsOpen={setHeroOpen}>
        {headerExtras}
      </YearSectionHeader>

      {/* Schieflage-Panel: ab wann, wie hoch, kürzbare Treiber zuerst. Mehrere
          betroffene Monate sind als Pills durchschaltbar (löst „+N weitere Monate"). */}
      {activeStrain && (
        <div style={{ margin: "8px 10px 2px", background: T.neg + "1A", border: `1px solid ${T.neg}66`, borderRadius: 12, padding: "9px 11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            {Li("alert-triangle", 16, T.neg)}
            <span style={{ color: T.neg, fontWeight: 700, fontSize: 13.5 }}>
              {strainMonths.length > 1 ? `Schieflage in ${strainMonths.length} Monaten` : `Schieflage ab ${MONTHS_F[activeStrain.mi]} ${year}`}
            </span>
          </div>

          {/* Monats-Pills (nur bei mehreren betroffenen Monaten) */}
          {strainMonths.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {strainMonths.map(s => {
                const on = s.mi === activeStrain.mi;
                return (
                  <button key={s.mi} onClick={() => setSelStrainMi(s.mi)}
                    style={{ display: "inline-flex", alignItems: "baseline", gap: 5, background: on ? T.neg + "33" : "rgba(255,255,255,0.05)", border: `1px solid ${on ? T.neg : T.bd}`, borderRadius: 13, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ color: on ? T.neg : T.txt, fontSize: 11.5, fontWeight: on ? 800 : 600 }}>{MONTHS_S[s.mi]}</span>
                    <span style={{ color: T.txt2, fontSize: 10.5, fontFamily: NUM_FONT }}>−{fmt(s.over)} €</span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ color: T.txt, fontSize: 12.5, lineHeight: 1.4, marginBottom: activeStrain.drivers.length ? 7 : 0 }}>
            <b>{MONTHS_F[activeStrain.mi]}:</b> <b>{fmt(activeStrain.exp)} €</b> Ausgaben gegen <b>{fmt(activeStrain.inc)} €</b> Einnahmen — <b style={{ color: T.neg }}>{fmt(activeStrain.over)} € zu viel</b>.
          </div>

          {activeStrain.drivers.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{ color: T.txt2, fontSize: 11, flexShrink: 0 }}>Zuerst kürzen:</span>
              {activeStrain.drivers.map((d) => {
                const flex = d.prio === "flex", ess = d.prio === "essential";
                return (
                  <button key={d.row.id} onClick={() => setDetail({ row: d.row, isSub: false, isIncome: d.row.isIncome, focusMi: activeStrain.mi })}
                    title={ess ? "Essentiell – schwer kürzbar" : flex ? "Flexibel – am ehesten kürzbar" : undefined}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, opacity: ess ? 0.55 : 1, background: flex ? T.gold + "22" : (T.surf || "rgba(255,255,255,0.06)"), border: `1px solid ${flex ? T.gold + "99" : T.bd}`, borderRadius: 14, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit" }}>
                    {ess && Li("lock", 11, T.txt2)}
                    {Li(d.row.icon || "folder", 12, d.row.color || T.neg)}
                    <span style={{ color: T.txt, fontSize: 11.5, fontWeight: flex ? 700 : 600 }}>{d.row.name}</span>
                    <span style={{ color: T.txt2, fontSize: 11, fontFamily: NUM_FONT }}>{fmt(d.val)} €</span>
                    {d.fromBudget && <span style={{ background: T.gold + "22", color: T.gold, borderRadius: 4, padding: "0 4px", fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>Budget</span>}
                  </button>
                );
              })}
            </div>
          )}
          {activeStrain.drivers.some(d => d.fromBudget) && (
            <div style={{ marginTop: 7, color: T.txt2, fontSize: 10.5, lineHeight: 1.45 }}>
              <b style={{ color: T.gold }}>„Budget"</b>-Posten werden über die geplanten Budgets gehalten, nicht über Buchungen — gelöschte Vormerkungen senken sie nicht. Zum Reduzieren das <b>Budget der Kategorie</b> anpassen.
            </div>
          )}
        </div>
      )}

      {sortedRows.length === 0 ? (
        <div style={{ color: T.txt2, fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          Für {year} sind noch keine Buchungen/Budgets vorhanden.
        </div>
      ) : (
        <div style={{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {sortedRows.map(renderCard)}
        </div>
      )}

      {detail && <MoodDetail {...detail} year={year} txs={txs} getAcc={getAcc} recentIdx={recentIdx} elapsedIdx={elapsedIdx} monthMood={monthMood} openEdit={openEdit} updateCat={updateCat} onClose={() => setDetail(null)} />}
    </div>
  );
}

const navBtn = {
  width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.bd}`, background: "transparent",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

// ── Drilldown: 12 Monatsbalken (Gesamtbetrag oben, klickbar) + Zusammensetzung ──
function MoodDetail({ row, isSub, isIncome, focusMi, year, txs, getAcc, recentIdx, elapsedIdx, monthMood, openEdit, updateCat, onClose }) {
  const { name, actual, budget, fore = actual } = row;
  const isCat = !isSub && !!row.subs;
  // Priorität nur für Ausgaben-Hauptkategorien (steuert die Treiber-Reihenfolge
  // im Schieflage-Panel). Lokaler State für sofortiges Feedback beim Umstellen.
  const canPrioritize = isCat && !isIncome && !!updateCat;
  const [localPrio, setLocalPrio] = useState(row.priority || "normal");
  // Startmonat: bei Aufruf aus der Schieflage-Warnung der betroffene Monat,
  // sonst der jüngste Monat mit Bewegung.
  const initSel = (focusMi != null && focusMi >= 0)
    ? focusMi
    : (recentIdx >= 0 && actual[recentIdx] > 0)
      ? recentIdx : (actual.reduce((acc, v, i) => v > 0 ? i : acc, 0));
  const [sel, setSel] = useState(initSel);
  const [selSub, setSelSub] = useState(null);   // gewählter Unterkategorie-Balken
  const [openBk, setOpenBk] = useState(null);   // ausgeklappte Einzelbuchung
  useEffect(() => { setOpenBk(null); }, [sel, selSub]);

  // Aufgeklappte Buchung in den sichtbaren Bereich scrollen, damit die unterste
  // Buchung beim Aufklappen nicht vom unteren Rand verdeckt wird.
  const openRowRef = useRef(null);
  useEffect(() => {
    if (openBk != null && openRowRef.current) {
      openRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [openBk]);

  // + Button (Bottom-Nav) ausblenden, solange dieser Drilldown offen ist —
  // sonst verdeckt er unten die Monatsbalken. App.jsx hört auf dieses Event.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sdm-drill", { detail: true }));
    return () => window.dispatchEvent(new CustomEvent("sdm-drill", { detail: false }));
  }, []);

  // Einzelbuchungen einer Unterkategorie in Monat mi (inkl. voller Buchung).
  const bookingsForSub = (subId, mi) => {
    const out = [];
    (txs || []).forEach(tx => {
      // Vormerkungen (pending) mitnehmen — sie bilden den Vorschau-Anteil der Balken.
      // Budget-Platzhalter bleiben außen vor (wie bei den Balken oben).
      if (tx._linkedTo || tx._budgetSubId) return;
      const d = new Date(tx.date);
      if (d.getFullYear() !== year || d.getMonth() !== mi) return;
      let amt = 0;
      (tx.splits || []).forEach(sp => { if (sp.subId === subId) amt += Math.abs(pn(sp.amount)); });
      if (amt > 0) out.push({ tx, name: tx.desc || "Buchung", dateStr: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), val: amt, pending: !!tx.pending });
    });
    return out.sort((a, b) => b.val - a.val);
  };

  const drilledSub = isCat && selSub ? row.subs.find(s => s.id === selSub) : null;

  // Unterkategorie-Zusammensetzung des Monats (nur Hauptkategorien).
  const subBreakdown = useMemo(() => !isCat ? [] :
    row.subs.map(s => {
      const act = s.actual[sel] || 0;
      const val = (s.fore?.[sel] ?? act) || 0;   // budget-gefloort (Vorschau)
      return { name: s.name, val, subId: s.id, isBudget: act <= 0 && val > 0 };
    }).filter(it => it.val > 0).sort((a, b) => b.val - a.val),
    [isCat, row, sel]);

  // Einzelbeträge für den oberen Extra-Bereich: Blattkategorie immer,
  // Hauptkategorie sobald ein Unterkategorie-Balken gewählt ist.
  const bookings = useMemo(() => {
    if (isCat && !selSub) return null;
    return bookingsForSub(isCat ? selSub : row.id, sel);
  }, [isCat, selSub, row, sel, txs, year]);

  const selTotal = (fore[sel] ?? actual[sel]) || 0;
  const headTotal = drilledSub ? ((drilledSub.fore?.[sel] ?? drilledSub.actual[sel]) || 0) : selTotal;
  // Budget des aktuell betrachteten Blatts/Subs im gewählten Monat (für den Fall
  // „Budget gesetzt, aber noch keine Buchungen" → Hinweiszeile statt Leerstand).
  const bkBudget = drilledSub ? (drilledSub.budget?.[sel] || 0) : (!isCat ? (budget[sel] || 0) : 0);
  const subMax = Math.max(1, ...subBreakdown.map(it => it.val));
  const bkMax = Math.max(1, ...(bookings || []).map(it => it.val));
  const fullDate = (ds) => new Date(ds).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
  const Field = ({ label, value, wrap }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ color: T.txt2, fontSize: 10, minWidth: 92, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.txt, fontSize: 11, whiteSpace: wrap ? "normal" : "nowrap", overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );

  const W = 340, H = 178, padL = 4, padTop = 16, padB = 18, chartH = H - padTop - padB;
  const bw = (W - padL) / RANGE;
  const maxV = Math.max(1, ...actual, ...budget);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.surf || T.bg, zIndex: 300, display: "flex", alignItems: "flex-start" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: T.surf || T.bg, display: "flex", flexDirection: "column", paddingLeft: 5, paddingRight: 5, paddingTop: "calc(8px + env(safe-area-inset-top, 0px))", paddingBottom: "58px" }}>
        {/* Scrollende Mitte: ALLE Inhalte (inkl. Titel) von UNTEN nach oben verankert,
            direkt über dem Chart. Leerraum entsteht oben. */}
        <div className="sdm-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ marginTop: "auto" }}>

        {/* Titel (Hauptkategorie) — direkt über den Unterkategorien. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: canPrioritize ? 6 : 10 }}>
          <button onClick={onClose} title="Zurück" style={{ ...navBtn, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>{Li("chevron-left", 28, T.txt)}</button>
          <span style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 21, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <button onClick={onClose} style={{ ...navBtn, width: 36, height: 36, flexShrink: 0 }}>{Li("x", 18, T.txt2)}</button>
        </div>

        {/* Priorität dieser Kategorie — steuert die Reihenfolge im Schieflage-Panel:
            „Flexibel" erscheint dort zuerst als Kürz-Vorschlag, „Essentiell" zuletzt. */}
        {canPrioritize && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ color: T.txt2, fontSize: 11, flexShrink: 0 }}>Priorität:</span>
            <div style={{ display: "flex", gap: 4, flex: 1 }}>
              {PRIO_ORDER.map(p => {
                const meta = PRIO_META[p], on = localPrio === p;
                return (
                  <button key={p} onClick={() => { setLocalPrio(p); updateCat(row.id, "priority", p); }}
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 6px", borderRadius: 8, background: on ? meta.color + "22" : "rgba(255,255,255,0.05)", border: `1.5px solid ${on ? meta.color : T.bd}`, color: on ? meta.color : T.txt2, fontSize: 11.5, fontWeight: on ? 700 : 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {Li(meta.icon, 12, on ? meta.color : T.txt2)} {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Oberer Extra-Bereich: Einzelbeträge, je Zeile per Chevron ausklappbar */}
        {bookings && (
          <div style={{ border: `1px solid ${T.bd}`, borderRadius: 12, padding: "8px 6px", marginBottom: 8, background: "rgba(255,255,255,0.02)" }}>
            {/* Unterkategorie-Kopf: Zurück-Pfeil inline links vor dem Namen. */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {drilledSub && (
                <button onClick={() => setSelSub(null)} title="Zurück"
                  style={{ ...navBtn, width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}>{Li("chevron-left", 28, T.txt)}</button>
              )}
              <span style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 20, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {drilledSub ? drilledSub.name : name}
                <span style={{ color: T.txt2, fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
                  {bookings.length} {bookings.length === 1 ? "Buchung" : "Buchungen"}
                </span>
              </span>
              <span style={{ color: isIncome ? T.pos : T.txt, fontSize: 19, fontWeight: 800, fontFamily: NUM_FONT }}>{fmt(headTotal)}</span>
            </div>
            {bookings.length === 0 ? (
              bkBudget > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)" }}>
                  <span style={{ background: "rgba(245,166,35,0.15)", color: T.gold, borderRadius: 4, padding: "0 5px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>Budget</span>
                  <span style={{ flex: 1, color: T.txt2, fontSize: 12 }}>geplant, noch keine Buchungen</span>
                  <span style={{ color: T.txt, fontSize: 15, fontWeight: 700, fontFamily: NUM_FONT }}>{fmt(bkBudget)}</span>
                </div>
              ) : (
                <div style={{ color: T.txt2, fontSize: 12, padding: "4px 0" }}>Keine Buchungen in diesem Monat.</div>
              )
            ) : (
              <div style={{ position: "relative" }}>
                <div className="sdm-scroll" style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                  {bookings.map((it, i) => {
                    const open = openBk === i;
                    const acc = (getAcc && it.tx.accountId) ? getAcc(it.tx.accountId) : null;
                    const txTotal = Math.abs(it.tx.totalAmount || 0);
                    return (
                      <div key={i} ref={open ? openRowRef : null} style={{ flexShrink: 0, borderRadius: 6, overflow: "hidden", background: open ? "rgba(255,255,255,0.05)" : "transparent", border: `1px solid ${open ? T.bd : "transparent"}` }}>
                        <button onClick={() => setOpenBk(open ? null : i)}
                          style={{ position: "relative", width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", borderRadius: 6, overflow: "hidden", padding: "7px 8px", display: "block", textAlign: "left" }}>
                          <div style={{ position: "absolute", inset: 0, width: `${(it.val / bkMax) * 100}%`, background: (isIncome ? T.pos : T.blue) + "22" }} />
                          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                            {Li(open ? "chevron-down" : "chevron-right", 16, T.txt2)}
                            <span style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                            {it.pending && <span style={{ background: "rgba(245,166,35,0.15)", color: T.gold, borderRadius: 4, padding: "0 5px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>VM</span>}
                            <span style={{ color: T.txt2, fontSize: 12, flexShrink: 0, whiteSpace: "nowrap" }}>{it.dateStr}</span>
                            <span style={{ color: T.txt, fontSize: 16, fontWeight: 700, fontFamily: NUM_FONT, flexShrink: 0, whiteSpace: "nowrap" }}>{fmt(it.val)}</span>
                          </div>
                        </button>
                        {open && (
                          <div style={{ padding: "6px 10px 9px 28px", display: "flex", flexDirection: "column", gap: 3 }}>
                            <Field label="Verwendungszweck" value={it.tx.desc || "—"} wrap />
                            {it.tx.note && <Field label="Notiz" value={it.tx.note} wrap />}
                            <Field label="Datum" value={fullDate(it.tx.date)} />
                            {acc && <Field label="Konto" value={acc.name} />}
                            <Field label="Betrag (Anteil)" value={fmt(it.val)} />
                            {Math.round(txTotal * 100) !== Math.round(it.val * 100) && <Field label="Buchung gesamt" value={fmt(txTotal)} />}
                            {openEdit && (
                              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
                                {/* Drilldown schließen, damit der Bearbeiten-/Vormerkungs-Dialog
                                    sichtbar ist (Drilldown liegt bei zIndex 300). Von dort lässt
                                    sich die Buchung/Vormerkung ändern oder löschen. */}
                                <button onClick={(e) => { e.stopPropagation(); onClose(); openEdit(it.tx); }}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.blue, color: T.on_accent || "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                  {Li("edit-2", 14, T.on_accent || "#fff")}
                                  {it.pending ? "Vormerkung bearbeiten" : "Buchung bearbeiten"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unterkategorie-Zusammensetzung des Monats (nur Hauptkategorien) */}
        {isCat && (
          <div style={{ border: `1px solid ${T.bd}`, borderRadius: 12, padding: "8px 6px", marginBottom: 8, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, color: T.txt, fontSize: 15, fontWeight: 700 }}>{MONTHS_F[sel]} {year}</span>
              <span style={{ color: isIncome ? T.pos : T.txt, fontSize: 18, fontWeight: 800, fontFamily: NUM_FONT }}>{fmt(selTotal)}</span>
            </div>
            {subBreakdown.length === 0 ? (
              <div style={{ color: T.txt2, fontSize: 13, padding: "4px 0" }}>Keine Buchungen in diesem Monat.</div>
            ) : (
              <div className="sdm-scroll" style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                {subBreakdown.map((it, i) => {
                  const active = it.subId === selSub;
                  return (
                    <div key={i} onClick={() => setSelSub(it.subId)}
                      style={{ flexShrink: 0, position: "relative", borderRadius: 6, overflow: "hidden", padding: "8px 8px", cursor: "pointer", outline: active ? `1px solid ${T.gold}` : "none" }}>
                      <div style={{ position: "absolute", inset: 0, width: `${(it.val / subMax) * 100}%`, background: (isIncome ? T.pos : T.blue) + (it.isBudget ? "12" : "22") }} />
                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0, color: active ? T.gold : (it.isBudget ? T.txt2 : T.txt), fontSize: 20, fontWeight: active ? 700 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                        {it.isBudget && <span style={{ background: "rgba(245,166,35,0.15)", color: T.gold, borderRadius: 4, padding: "0 5px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>Budget</span>}
                        <span style={{ color: it.isBudget ? T.txt2 : T.txt, fontSize: 18, fontWeight: 600, fontFamily: NUM_FONT, flexShrink: 0 }}>{fmt(it.val)}</span>
                        {Li("chevron-right", 18, active ? T.gold : T.txt2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>{/* Ende Unten-Verankerung */}
        </div>{/* Ende scrollende Mitte */}

        {/* Fester Fußbereich: Monatsbalken — immer unten verankert. */}
        <div style={{ flexShrink: 0, marginTop: 6 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {actual.map((a, i) => {
            const x = padL + i * bw;
            const bdg = budget[i] || 0;
            const bh = (a / maxV) * chartH;                 // Ist + VM
            const bhB = (bdg / maxV) * chartH;              // Budget (geplant)
            const labelV = Math.max(a, fore[i] ?? a);       // angezeigter Vorschau-Wert
            const bhTop = (labelV / maxV) * chartH;
            const future = i > elapsedIdx && elapsedIdx >= 0;
            const { c } = monthMood(row, i);
            const seld = i === sel;
            return (
              <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
                <rect x={x} y={padTop} width={bw} height={chartH + padB} fill="transparent" />
                {/* Budget als schwächerer Balken dahinter — gibt künftigen Monaten
                    einen sichtbaren, anklickbaren Balken (zeigt die Budget-Beträge). */}
                {bdg > 0 && (
                  <rect x={x + bw * 0.12} y={padTop + chartH - bhB} width={bw * 0.76} height={Math.max(0, bhB)}
                    rx={2} fill={T.txt2} opacity={seld ? 0.4 : 0.2}
                    stroke={seld ? T.txt : "none"} strokeWidth={seld ? 1 : 0} />
                )}
                {/* Ist + Vormerkungen davor, in Ampelfarbe. */}
                {a > 0 && (
                  <rect x={x + bw * 0.12} y={padTop + chartH - bh} width={bw * 0.76} height={Math.max(0, bh)}
                    rx={2} fill={c} opacity={seld ? 1 : (future ? 0.3 : 0.5)}
                    stroke={seld && bdg <= 0 ? T.txt : "none"} strokeWidth={seld && bdg <= 0 ? 1 : 0} />
                )}
                {labelV > 0 && (
                  <text x={x + bw / 2} y={padTop + chartH - bhTop - 3} textAnchor="middle" fontSize="7"
                    fill={seld ? T.gold : T.txt2} fontWeight={seld ? 700 : 400}>{fmtK(labelV)}</text>
                )}
                <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="8" fill={seld ? T.gold : T.txt2}
                  fontWeight={seld ? 700 : 400}>{MONTHS_S[i]}</text>
              </g>
            );
          })}
        </svg>
        </div>{/* Ende Fußbereich */}
      </div>
    </div>
  );
}

export { MoneyMoodScreen };
