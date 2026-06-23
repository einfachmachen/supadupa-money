// "Money Mood" — zahlenarme Jahresübersicht der finanziellen Tendenz.
//
// Idee (iPhone 13 mini): statt winziger Zahlen je Haupt-/Unterkategorie eine
// farbcodierte Mini-Sparkline über 12 Monate (Ampel: grün = im grünen Bereich,
// gelb = aufpassen, rot = Schieflage). Kritische Zeilen antippen → Detail mit
// Monatsausgaben vs. Budget über 12 Monate.
//
// Farb-/Heat-Logik (heat ≈ Auslastung):
//  - mit Budget: heat = Ist / Budget.
//  - ohne Budget: heat = Ist / (1,25 × Schnitt der bisherigen Monate) → 25 %
//    über dem eigenen Schnitt gilt als gelb/rot.
//  Ausgaben: hoch = rot. Einnahmen: Logik invertiert (unter Ziel = rot).

import React, { useContext, useMemo, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MONTHS_S } from "../../utils/constants.js";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { YearViewToggle } from "../molecules/YearViewToggle.jsx";

const RANGE = 12;

// heat (Auslastung) → Ampelfarbe + Schweregrad. Bei Einnahmen invertiert.
function ampel(heat, isIncome) {
  if (heat == null) return { c: T.bd, sev: -1 };       // keine Datenbasis
  const lvl = heat >= 1 ? 2 : heat >= 0.75 ? 1 : 0;     // 0 ok · 1 warn · 2 voll
  if (isIncome) {
    // Einnahmen: viel (≥ Ziel) ist gut → grün; wenig ist die Schieflage.
    return [{ c: T.neg, sev: 2 }, { c: T.gold, sev: 1 }, { c: T.pos, sev: 0 }][lvl];
  }
  return [{ c: T.pos, sev: 0 }, { c: T.gold, sev: 1 }, { c: T.neg, sev: 2 }][lvl];
}

function MoneyMoodScreen() {
  const { cats, groups, year, setYear, getActualSum, getBudgetForMonth } = useContext(AppCtx);
  const [openCat, setOpenCat] = useState(null);   // aufgeklappte Hauptkategorie
  const [detail, setDetail] = useState(null);     // { name, isIncome, actual[], budget[] }

  const now = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth();
  // Letzter Monat mit (vollständigen) Daten: aktuelles Jahr → Vormonat; frühere
  // Jahre → Dezember; künftige Jahre → keiner.
  const recentIdx = year < nowY ? 11 : year > nowY ? -1 : Math.max(0, nowM - 1);
  const elapsedIdx = year < nowY ? 11 : year > nowY ? -1 : nowM; // inkl. laufendem

  // Reihen je Block (Einnahmen / Ausgaben) aus cats+groups, mit 12-Monats-Serien.
  const blocks = useMemo(() => {
    const seriesForSub = (subId) => {
      const actual = [], budget = [];
      for (let mi = 0; mi < RANGE; mi++) {
        actual.push(Math.abs(getActualSum(year, mi, subId, "E") || 0));
        budget.push(Math.abs(getBudgetForMonth(subId, year, mi) || 0));
      }
      return { actual, budget };
    };
    const sum12 = (a, b) => a.map((v, i) => v + (b[i] || 0));

    const mk = (isIncome) => {
      const out = [];
      const grps = groups.filter(g => {
        const beh = g.behavior || g.type;
        return isIncome ? (beh === "income" || g.type === "income")
          : (beh === "expense" || g.type === "expense" || (beh !== "income" && g.type !== "income" && g.type !== "tagesgeld"));
      });
      grps.forEach(grp => {
        cats.filter(c => c.type === grp.type).forEach(cat => {
          let cAct = Array(RANGE).fill(0), cBud = Array(RANGE).fill(0);
          const subs = (cat.subs || []).map(sub => {
            const s = seriesForSub(sub.id);
            cAct = sum12(cAct, s.actual); cBud = sum12(cBud, s.budget);
            return { id: sub.id, name: sub.name, ...s };
          });
          // Leere Kategorien (nie Geld geflossen, kein Budget) überspringen.
          if (cAct.every(v => v === 0) && cBud.every(v => v === 0)) return;
          out.push({ id: cat.id, name: cat.name, isIncome, actual: cAct, budget: cBud, subs });
        });
      });
      return out;
    };
    return { expense: mk(false), income: mk(true) };
  }, [cats, groups, year, getActualSum, getBudgetForMonth]);

  // heat eines Monats für eine Serie. avg = Schnitt der bisherigen Monate (>0).
  const heatAt = (row, mi) => {
    const a = row.actual[mi], b = row.budget[mi];
    if (b > 0) return a / b;
    const past = row.actual.slice(0, Math.max(1, elapsedIdx)).filter(v => v > 0);
    if (past.length < 2) return null;
    const avg = past.reduce((s, v) => s + v, 0) / past.length;
    return avg > 0 ? a / (avg * 1.25) : null;
  };
  // Schweregrad einer Reihe = heat des jüngsten abgeschlossenen Monats.
  const rowSev = (row) => recentIdx < 0 ? -1 : (ampel(heatAt(row, recentIdx), row.isIncome).sev);

  // ── Mini-Sparkline: 12 ampelgefärbte Balken, Höhe = relative Größe ──
  const Spark = ({ row, h = 24 }) => {
    const maxV = Math.max(1, ...row.actual);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: h, flexShrink: 0 }}>
        {row.actual.map((v, mi) => {
          const { c } = ampel(heatAt(row, mi), row.isIncome);
          const bh = Math.max(2, Math.round((v / maxV) * h));
          const future = mi > elapsedIdx && elapsedIdx >= 0;
          return <div key={mi} title={`${MONTHS_S[mi]}: ${fmt(v)}`}
            style={{ width: 5, height: bh, background: c, opacity: future ? 0.16 : (mi === recentIdx ? 1 : 0.85), borderRadius: 1 }} />;
        })}
      </div>
    );
  };

  const SevDot = ({ row }) => {
    const { c, sev } = recentIdx < 0 ? { c: T.bd, sev: -1 } : ampel(heatAt(row, recentIdx), row.isIncome);
    return <div style={{ width: 9, height: 9, borderRadius: "50%", background: sev < 0 ? "transparent" : c, border: sev < 0 ? `1px solid ${T.bd}` : "none", flexShrink: 0 }} />;
  };

  const Row = ({ row, sub }) => (
    <button onClick={() => setDetail({ name: sub ? row.name : row.name, isIncome: row.isIncome, actual: row.actual, budget: row.budget })}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        padding: sub ? "7px 14px 7px 30px" : "9px 14px", background: "transparent",
        border: "none", borderBottom: `1px solid ${T.bd}`, cursor: "pointer", fontFamily: "inherit",
      }}>
      <span style={{ flex: 1, minWidth: 0, color: sub ? T.txt2 : T.txt, fontSize: sub ? 13 : 14, fontWeight: sub ? 500 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {row.name}
      </span>
      <Spark row={row} h={sub ? 18 : 24} />
      <SevDot row={row} />
    </button>
  );

  const renderBlock = (label, rows, color) => {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => rowSev(b) - rowSev(a));
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ color, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", padding: "4px 14px 5px", opacity: 0.85 }}>{label}</div>
        {sorted.map(cat => (
          <div key={cat.id}>
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 0 }}><Row row={cat} /></div>
              {cat.subs.length > 0 && (
                <button onClick={() => setOpenCat(o => o === cat.id ? null : cat.id)}
                  style={{ flexShrink: 0, width: 38, background: "transparent", border: "none", borderBottom: `1px solid ${T.bd}`, cursor: "pointer", color: T.txt2 }}>
                  {Li(openCat === cat.id ? "chevron-up" : "chevron-down", 15, T.txt2)}
                </button>
              )}
            </div>
            {openCat === cat.id && cat.subs
              .filter(s => !(s.actual.every(v => v === 0) && s.budget.every(v => v === 0)))
              .map(s => <Row key={s.id} row={{ ...s, isIncome: cat.isIncome }} sub />)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", background: T.bg }}>
      <YearViewToggle active="mood" />
      {/* Kopf: Titel + Jahr-Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 8px", position: "sticky", top: 0, background: T.bg, zIndex: 2, borderBottom: `1px solid ${T.bd}` }}>
        <span style={{ color: T.txt, fontSize: 18, fontWeight: 800, flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
          {Li("activity", 17, T.gold)} Money Mood
        </span>
        <button onClick={() => setYear(y => y - 1)} style={navBtn}>{Li("chevron-left", 15, T.txt2)}</button>
        <span style={{ color: T.txt, fontSize: 15, fontWeight: 700, fontFamily: NUM_FONT, minWidth: 42, textAlign: "center" }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={navBtn}>{Li("chevron-right", 15, T.txt2)}</button>
      </div>

      <div style={{ color: T.txt2, fontSize: 11, padding: "7px 14px 9px", lineHeight: 1.45 }}>
        Jede Zeile zeigt 12 Monate als Ampel-Striche – <b style={{ color: T.pos }}>grün</b> ist im grünen Bereich,
        {" "}<b style={{ color: T.gold }}>gelb</b> heißt aufpassen, <b style={{ color: T.neg }}>rot</b> ist eine Schieflage.
        Tippe eine Zeile für den 12-Monats-Verlauf.
      </div>

      {renderBlock("Ausgaben", blocks.expense, T.neg)}
      {renderBlock("Einnahmen", blocks.income, T.pos)}
      {blocks.expense.length === 0 && blocks.income.length === 0 && (
        <div style={{ color: T.txt2, fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          Für {year} sind noch keine Buchungen/Budgets vorhanden.
        </div>
      )}

      {detail && <MoodDetail detail={detail} year={year} recentIdx={recentIdx} elapsedIdx={elapsedIdx} onClose={() => setDetail(null)} />}
    </div>
  );
}

const navBtn = {
  width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.bd}`, background: "transparent",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

// ── Detail: 12-Monats-Balken (Ist) mit Budget-Markern ──
function MoodDetail({ detail, year, recentIdx, elapsedIdx, onClose }) {
  const { name, isIncome, actual, budget } = detail;
  const maxV = Math.max(1, ...actual, ...budget);
  const W = 320, H = 150, padL = 4, padB = 18, chartH = H - padB;
  const bw = (W - padL) / RANGE;
  const overBudget = actual.filter((a, i) => budget[i] > 0 && (isIncome ? a < budget[i] : a > budget[i])).length;
  const budgeted = budget.filter(b => b > 0).length;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "82vh", overflowY: "auto", background: T.surf || T.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: `1px solid ${T.bd}`, padding: "14px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ flex: 1, color: T.txt, fontSize: 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <button onClick={onClose} style={{ ...navBtn, width: 34, height: 34 }}>{Li("x", 16, T.txt2)}</button>
        </div>
        <div style={{ color: T.txt2, fontSize: 12, marginBottom: 10 }}>
          {year} · Ist vs. Budget {budgeted > 0
            ? <>· <b style={{ color: overBudget > 0 ? T.neg : T.pos }}>{overBudget}</b> von {budgeted} Monaten {isIncome ? "unter Ziel" : "über Budget"}</>
            : "· (kein Budget hinterlegt)"}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {actual.map((a, i) => {
            const x = padL + i * bw;
            const bh = (a / maxV) * chartH;
            const future = i > elapsedIdx && elapsedIdx >= 0;
            const { c } = ampel(budget[i] > 0 ? a / budget[i] : null, isIncome);
            const col = budget[i] > 0 ? c : (isIncome ? T.pos : T.blue);
            return (
              <g key={i}>
                <rect x={x + bw * 0.12} y={chartH - bh} width={bw * 0.76} height={Math.max(0, bh)}
                  rx={2} fill={col} opacity={future ? 0.18 : (i === recentIdx ? 1 : 0.82)} />
                {budget[i] > 0 && (
                  <line x1={x + bw * 0.05} x2={x + bw * 0.95} y1={chartH - (budget[i] / maxV) * chartH} y2={chartH - (budget[i] / maxV) * chartH}
                    stroke={T.txt} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7} />
                )}
                <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="8" fill={i === recentIdx ? T.gold : T.txt2}
                  fontWeight={i === recentIdx ? 700 : 400}>{MONTHS_S[i]}</text>
              </g>
            );
          })}
        </svg>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, color: T.txt2, fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 0, borderTop: `2px dashed ${T.txt}` }} /> Budget</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: isIncome ? T.pos : T.neg }} /> Ist</span>
        </div>
      </div>
    </div>
  );
}

export { MoneyMoodScreen };
