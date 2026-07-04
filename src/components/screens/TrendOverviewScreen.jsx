// Trend-Übersicht: neuer Einstieg für den "Trend"-Tab (statt direkt in Money
// Mood zu landen). Zeigt zuerst drei Mini-Sparklines über ALLE Jahre —
// Endekontostand, Einnahmen, Ausgaben. Antippen einer Sparkline öffnet eine
// Detailansicht mit einem Balken pro Jahr für genau diese Kennzahl; Antippen
// eines Balkens öffnet Money Mood für dieses Jahr (die bisherige "Trend"-
// Ansicht, jetzt für ein einzelnes Jahr statt als direkter Einstieg).
//
// Zurück zu dieser Übersicht: über den "Übersicht"-Umschalter im gemeinsamen
// YearSectionHeader (Money Mood/Jahr), siehe molecules/YearSectionHeader.jsx.

import React, { useContext, useMemo, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { saldoEnde } from "../../utils/saldo.js";
import { buildTxIdMap, isDuplCounterpart } from "../../utils/tx.js";

const METRICS = [
  { key: "saldo",   label: "Endekontostand", icon: "wallet",             color: (v,T)=>T.blue },
  { key: "income",  label: "Einnahmen",      icon: "arrow-down-circle",  color: (v,T)=>T.pos },
  { key: "expense", label: "Ausgaben",       icon: "arrow-up-circle",    color: (v,T)=>T.neg },
];

// Mini-Sparkline (Balkenreihe) für die Übersichts-Karten — ein Balken pro Jahr.
function MiniSpark({ values, color, h = 26 }) {
  const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: h, flex: 1, minWidth: 0 }}>
      {values.map((v, i) => {
        const bh = Math.max(2, Math.round((Math.abs(v) / maxAbs) * h));
        return (
          <div key={i} style={{ flex: 1, minWidth: 2, height: bh, borderRadius: 1,
            background: color, opacity: v < 0 ? 0.4 : (i === values.length - 1 ? 1 : 0.75) }} />
        );
      })}
    </div>
  );
}

// Balken-Detailansicht (ein Jahr = ein Balken), Nulllinie berücksichtigt
// negative Werte (z. B. Endekontostand im Minus).
function YearBarChart({ perYear, get, color, onSelectYear }) {
  const W = 320, H = 200, padTop = 20, padB = 30, padL = 4;
  const chartH = H - padTop - padB;
  const vals = perYear.map(get);
  const maxV = Math.max(0, ...vals), minV = Math.min(0, ...vals);
  const range = (maxV - minV) || 1;
  const yOf = (v) => padTop + chartH * (maxV - v) / range;
  const zeroY = yOf(0);
  const bw = (W - padL * 2) / perYear.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <line x1={padL} y1={zeroY} x2={W - padL} y2={zeroY} stroke={T.bd} strokeWidth={1} />
      {perYear.map((row, i) => {
        const v = get(row);
        const x = padL + i * bw;
        const yTop = yOf(Math.max(v, 0));
        const yBot = yOf(Math.min(v, 0));
        const h = Math.max(1, yBot - yTop);
        return (
          <g key={row.year} onClick={() => onSelectYear(row.year)} style={{ cursor: "pointer" }}>
            <rect x={x} y={padTop} width={bw} height={chartH} fill="transparent" />
            <rect x={x + bw * 0.18} y={yTop} width={bw * 0.64} height={h} rx={2} fill={color} opacity={0.85} />
            <text x={x + bw / 2} y={zeroY + (v < 0 ? 14 : -6)} textAnchor="middle" fontSize="9"
              fill={T.txt2} fontWeight={600}>
              {fmt(v)}
            </text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={T.txt2}>
              {row.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendOverviewScreen() {
  const { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth, setYear, setSubTab } = useContext(AppCtx);
  const [metric, setMetric] = useState(null); // null = Sparkline-Übersicht, sonst METRICS[i].key

  // Alle Jahre mit Buchungen (mindestens das aktuelle Jahr, auch ohne Daten).
  const yearRange = useMemo(() => {
    const now = new Date();
    let min = now.getFullYear(), max = now.getFullYear();
    (txs || []).forEach(t => {
      if (!t.date) return;
      const y = Number(t.date.slice(0, 4));
      if (Number.isFinite(y)) { if (y < min) min = y; if (y > max) max = y; }
    });
    const years = [];
    for (let y = min; y <= max; y++) years.push(y);
    return years;
  }, [txs]);

  // Endekontostand/Einnahmen/Ausgaben je Jahr — bewusst GESAMT über alle
  // Konten (accId=null), unabhängig vom sonst in der App aktiven Konto-Filter,
  // damit die Übersicht immer das große Bild zeigt.
  const perYear = useMemo(() => {
    const txsById = buildTxIdMap(txs || []);
    const saldoCtx = { txs: txs || [], cats, accounts, getKumulierterSaldo, getBudgetForMonth, _txsById: txsById };
    return yearRange.map(year => {
      let income = 0, expense = 0;
      (txs || []).forEach(t => {
        if (t.pending || t._budgetSubId) return;
        if (isDuplCounterpart(t, txsById)) return;
        if (!t.date || Number(t.date.slice(0, 4)) !== year) return;
        const amt = t.totalAmount || 0;
        if (amt >= 0) income += amt; else expense += Math.abs(amt);
      });
      const saldo = saldoEnde(year, 11, null, saldoCtx);
      return { year, saldo, income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100 };
    });
  }, [yearRange, txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth]);

  const openYear = (year) => { setYear(year); setSubTab("mood"); };
  const activeMetric = METRICS.find(m => m.key === metric);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 16px 4px", flexShrink: 0 }}>
        <div style={{ color: T.txt, fontSize: 20, fontWeight: 700 }}>Trend</div>
        <div style={{ color: T.txt2, fontSize: 12 }}>
          {metric ? `${activeMetric.label} · alle Jahre` : "Alle Jahre im Überblick"}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 24px" }}>
        {!metric ? (
          // ── Übersicht: 3 Sparkline-Karten ──
          METRICS.map(m => {
            const values = perYear.map(r => r[m.key]);
            const latest = values[values.length - 1];
            const col = m.color(latest, T);
            return (
              <button key={m.key} onClick={() => setMetric(m.key)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: T.surf, border: `1px solid ${T.bd}`, borderRadius: 14,
                  padding: "14px 14px", marginBottom: 10, cursor: "pointer",
                  fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: col + "22",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {Li(m.icon, 20, col)}
                </div>
                <div style={{ minWidth: 72, flexShrink: 0 }}>
                  <div style={{ color: T.txt2, fontSize: 11, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ color: T.txt, fontSize: 15, fontWeight: 700, fontFamily: NUM_FONT }}>
                    {fmt(latest)}
                  </div>
                </div>
                <MiniSpark values={values} color={col} />
                {Li("chevron-right", 16, T.txt2)}
              </button>
            );
          })
        ) : (
          // ── Detail: ein Balken pro Jahr für die gewählte Kennzahl ──
          <>
            <button onClick={() => setMetric(null)}
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
                background: "transparent", border: "none", color: T.blue, fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
              {Li("chevron-left", 15, T.blue)} Übersicht
            </button>
            <div style={{ background: T.surf, border: `1px solid ${T.bd}`, borderRadius: 14, padding: "12px 8px" }}>
              <YearBarChart perYear={perYear} get={r => r[activeMetric.key]}
                color={activeMetric.color(null, T)} onSelectYear={openYear} />
            </div>
            <div style={{ color: T.txt2, fontSize: 11, marginTop: 10, textAlign: "center" }}>
              Balken antippen → Money Mood für dieses Jahr
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { TrendOverviewScreen };
