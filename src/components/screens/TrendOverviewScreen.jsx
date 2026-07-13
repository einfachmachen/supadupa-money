// Trend-Übersicht: neuer Einstieg für den "Trend"-Tab (statt direkt in Money
// Mood zu landen). Zeigt zuerst drei Mini-Sparklines über ALLE Jahre —
// Endekontostand, Einnahmen, Ausgaben. Antippen einer Sparkline öffnet eine
// Detailansicht mit einem Balken pro Jahr für genau diese Kennzahl; Antippen
// eines Balkens öffnet Money Mood für dieses Jahr (die bisherige "Trend"-
// Ansicht, jetzt für ein einzelnes Jahr statt als direkter Einstieg).
//
// Zurück zu dieser Übersicht: über den "Übersicht"-Umschalter im gemeinsamen
// YearSectionHeader (Money Mood/Jahr), siehe molecules/YearSectionHeader.jsx.
// Der Hero (Kontostand) kommt ebenfalls von dort, wie bei Home/Monat — und
// respektiert dort wie hier den global gewählten Konto-Filter (selAcc).

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { fmt, NUM_FONT } from "../../utils/format.js";
import { saldoEnde } from "../../utils/saldo.js";
import { buildTxIdMap, isDuplCounterpart } from "../../utils/tx.js";
import { YearSectionHeader } from "../molecules/YearSectionHeader.jsx";

const METRICS = [
  { key: "saldo",   label: "Endekontostand", icon: "wallet",             color: (v,T)=>T.blue, split: false },
  { key: "income",  label: "Einnahmen",      icon: "arrow-down-circle",  color: (v,T)=>T.pos,  split: true },
  { key: "expense", label: "Ausgaben",       icon: "arrow-up-circle",    color: (v,T)=>T.neg,  split: true },
];

// Kompakte Kurzform für die Balken-Beschriftung ("15.7K" statt "15.737,42 €") —
// bei PER_ROW=8 Balken pro Zeile ist für den vollen Betrag kein Platz.
function fmtK(v) {
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}K`;
  return `${sign}${Math.round(abs)}`;
}

// Modul-weiter Cache für die teure Jahres-Aggregation (siehe computePerYear):
// bleibt über Un-/Wiedermontieren des Screens hinweg erhalten (anders als ein
// useMemo, dessen Zustand beim Unmount verworfen wird) und verhindert so die
// spürbare Verzögerung beim Zurück-/Hinschalten zwischen den Jahres-Ansichten.
// Cache-Key sind txs/cats/accounts/selAcc per Referenzvergleich — echte
// Änderungen (neue Buchung, umbenannte Kategorie, Konto-Wechsel, …)
// invalidieren ihn zuverlässig, ohne dass instabile Funktions-Referenzen
// (getKumulierterSaldo etc., die bei jedem App-Render neu erzeugt werden)
// unnötig neu rechnen.
let _perYearCache = { txs: null, cats: null, accounts: null, selAcc: undefined, result: null };

function computePerYear(yearRange, txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth, getCat, selAcc) {
  const c = _perYearCache;
  if (c.txs === txs && c.cats === cats && c.accounts === accounts && c.selAcc === selAcc && c.result) return c.result;

  const txsById = buildTxIdMap(txs || []);
  const saldoCtx = { txs: txs || [], cats, accounts, getKumulierterSaldo, getBudgetForMonth, _txsById: txsById };
  // Konto-Filter wie in App.jsx/actualSums: kein Filter bei selAcc=null (GESAMT).
  const accFilter = selAcc ? (t => (t.accountId || "acc-giro") === selAcc) : null;
  const r2 = v => Math.round(v * 100) / 100;

  const result = yearRange.map(year => {
    let incomeActual = 0, incomePending = 0, expenseActual = 0, expensePending = 0;
    (txs || []).forEach(t => {
      // Wie saldo.js/ist(): nur Budget-Platzhalter und CSV-Duplikate raus —
      // vorgemerkte (pending) Buchungen ZÄHLEN, denn der Endekontostand
      // berücksichtigt sie ja auch (Vormerkungen fließen in die Prognose ein).
      if (t._budgetSubId) return;
      if (isDuplCounterpart(t, txsById)) return;
      if (accFilter && !accFilter(t)) return;
      if (!t.date || Number(t.date.slice(0, 4)) !== year) return;
      // Typ wie in App.jsx/actualSums: Kategorie-Typ zuerst, dann _csvType,
      // erst zuletzt das Vorzeichen (viele Buchungen speichern totalAmount
      // unabhängig vom Typ, z. B. bei CSV-Importen).
      const catType0 = getCat((t.splits || [])[0]?.catId)?.type;
      const type = catType0 === "income" ? "income"
                 : catType0 === "expense" ? "expense"
                 : t._csvType || (t.totalAmount >= 0 ? "income" : "expense");
      const amt = Math.abs(t.totalAmount || 0);
      if (type === "income") { if (t.pending) incomePending += amt; else incomeActual += amt; }
      else                   { if (t.pending) expensePending += amt; else expenseActual += amt; }
    });
    const saldo = saldoEnde(year, 11, selAcc, saldoCtx);
    return {
      year, saldo,
      incomeActual: r2(incomeActual), incomePending: r2(incomePending), income: r2(incomeActual + incomePending),
      expenseActual: r2(expenseActual), expensePending: r2(expensePending), expense: r2(expenseActual + expensePending),
    };
  });

  _perYearCache = { txs, cats, accounts, selAcc, result };
  return result;
}

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

// Ziel-Balkenbreite in Pixeln — bewusst KONSTANT (skaliert nicht mit der
// Bildschirmbreite). Wie viele Balken nebeneinander in eine Zeile passen
// (perRow) ergibt sich stattdessen aus der tatsächlich verfügbaren Breite
// (per ResizeObserver gemessen): ein iPhone mini zeigt so automatisch
// weniger, aber genauso große/lesbare Balken pro Zeile als ein breiteres
// Gerät — nicht gleich viele, nur kleiner gequetschte.
const BAR_W = 52;
const MIN_PER_ROW = 3;

// Vertikaler Balken-Chart in Zeilen ("Stapel"), damit auch bei vielen Jahren
// jeder Balken breit genug für lesbare, um 90° gedrehte Jahres-Labels bleibt.
// Skala (min/max) gilt über ALLE Zeilen hinweg, damit Balkenhöhen zwischen
// den Zeilen vergleichbar bleiben. Werte über dem Balken als kurze "xxK"-Form
// (fmtK). Bei Einnahmen/Ausgaben wird der vorgemerkte (noch nicht gebuchte)
// Anteil oben im Balken heller dargestellt — der Gesamtbetrag (inkl.
// Vormerkungen) bleibt aber gleich.
function YearBarRows({ perYear, get, getPending, color, onSelectYear }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vals = perYear.map(get);
  const maxV = Math.max(0, ...vals), minV = Math.min(0, ...vals);
  const range = (maxV - minV) || 1;
  const hasNegative = minV < -0.005;

  const perRow = containerWidth ? Math.max(MIN_PER_ROW, Math.floor(containerWidth / BAR_W)) : MIN_PER_ROW;
  const rows = [];
  for (let i = 0; i < perYear.length; i += perRow) rows.push(perYear.slice(i, i + perRow));

  const bw = BAR_W;
  const yearFs = 13, amtFs = 12;
  const chartH = 70;
  const padTop = amtFs + 10; // Luft für das Betrags-Label über dem höchsten Balken
  // Sichtbare Höhe der um 90° gedrehten 4-stelligen Jahreszahl (Breite je
  // Zeichen ≈ Schriftgröße * 0.62) plus etwas Sicherheitsabstand.
  const yearLabelH = yearFs * 0.62 * 4 + 4;
  const gapBarToLabel = 4; // genau DER Abstand, um den es beim Feedback ging
  const bottomMargin = 4;
  // Bei negativen Werten steht das Betrags-Label UNTER statt ÜBER dem
  // Balken — dafür zusätzlichen Platz vor der Jahreszahl reservieren (worst
  // case: der negativste Wert der gesamten Skala sitzt am unteren
  // Diagrammrand), damit sich Betrag und Jahreszahl nie überlagern.
  const negAmountH = hasNegative ? amtFs + 12 + 4 : 0;
  const padB = gapBarToLabel + negAmountH + yearLabelH + bottomMargin;
  const rowH = padTop + chartH + padB;
  const yOf = (v) => padTop + chartH * (maxV - v) / range;
  const zeroY = yOf(0);
  const labelY = rowH - bottomMargin;

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map((row, ri) => {
        const W = row.length * bw;
        return (
          <svg key={ri} viewBox={`0 0 ${W} ${rowH}`} width={W} height={rowH} style={{ display: "block", overflow: "visible" }}>
            <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke={T.bd} strokeWidth={1} />
            {row.map((r, i) => {
              const v = get(r);
              const vPending = getPending ? getPending(r) : 0;
              const vActual = v - vPending;
              const x = i * bw;
              const cx = x + bw / 2;
              const yTop = yOf(Math.max(v, 0));
              const yBot = yOf(Math.min(v, 0));
              const ySplit = yOf(Math.max(vActual, 0));
              const showSplit = vPending > 0.005 && ySplit > yTop + 0.5;
              return (
                <g key={r.year} onClick={() => onSelectYear(r.year)} style={{ cursor: "pointer" }}>
                  <rect x={x} y={padTop} width={bw} height={chartH} fill="transparent" />
                  {showSplit ? (
                    <>
                      <rect x={x + bw * 0.22} y={ySplit} width={bw * 0.56} height={Math.max(1, yBot - ySplit)} rx={2} fill={color} opacity={0.85} />
                      <rect x={x + bw * 0.22} y={yTop} width={bw * 0.56} height={Math.max(1, ySplit - yTop)} rx={2} fill={color} opacity={0.35} />
                    </>
                  ) : (
                    <rect x={x + bw * 0.22} y={yTop} width={bw * 0.56} height={Math.max(1, yBot - yTop)} rx={2} fill={color} opacity={0.85} />
                  )}
                  <text x={cx} y={v >= 0 ? yTop - 4 : yBot + 12} textAnchor="middle" fontSize={amtFs} fill={T.txt} fontWeight={700}>
                    {fmtK(v)}
                  </text>
                  <text x={cx} y={labelY} textAnchor="end" fontSize={yearFs} fill={T.txt} fontWeight={700}
                    transform={`rotate(-90 ${cx} ${labelY})`}>
                    {r.year}
                  </text>
                </g>
              );
            })}
          </svg>
        );
      })}
    </div>
  );
}

// Alternative Ausrichtung: ein Jahr = eine Zeile (Label + horizontaler
// Balken). Passt deutlich mehr Jahre pro Bildschirmhöhe als die vertikale
// Stapel-Ansicht, da nur eine schmale Zeile statt eines ganzen Balkens
// gebraucht wird — dafür scrollbar statt auf einen Blick. Vorgemerkter
// Anteil auch hier heller, an den gebuchten Anteil angehängt.
function YearBarListHorizontal({ perYear, get, getPending, color, onSelectYear }) {
  const vals = perYear.map(get);
  const maxPos = Math.max(0, ...vals);
  const maxNeg = Math.max(0, ...vals.map(v => Math.max(0, -v)));
  const totalSpan = (maxPos + maxNeg) || 1;
  const zeroPct = (maxNeg / totalSpan) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {perYear.map(row => {
        const v = get(row);
        const vPending = getPending ? getPending(row) : 0;
        const vActual = v - vPending;
        const pct = (Math.abs(v) / totalSpan) * 100;
        const pctActual = (Math.abs(vActual) / totalSpan) * 100;
        const showSplit = vPending > 0.005;
        return (
          <button key={row.year} onClick={() => onSelectYear(row.year)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent",
              border: "none", borderBottom: `1px solid ${T.bd}`, padding: "7px 0", cursor: "pointer",
              fontFamily: "inherit", width: "100%" }}>
            <div style={{ width: 40, flexShrink: 0, textAlign: "right", color: T.txt2, fontSize: 11, fontWeight: 700 }}>
              {row.year}
            </div>
            <div style={{ position: "relative", flex: 1, height: 14, background: T.bd + "50", borderRadius: 3 }}>
              {maxNeg > 0 && <div style={{ position: "absolute", left: `${zeroPct}%`, top: 0, bottom: 0, width: 1, background: T.bd }} />}
              {showSplit ? (
                <>
                  <div style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 2, background: color, opacity: 0.85,
                    left: v >= 0 ? `${zeroPct}%` : `${Math.max(0, zeroPct - pctActual)}%`,
                    width: `${pctActual}%` }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 2, background: color, opacity: 0.35,
                    left: v >= 0 ? `${zeroPct + pctActual}%` : `${Math.max(0, zeroPct - pct)}%`,
                    width: `${Math.max(0, pct - pctActual)}%` }} />
                </>
              ) : (
                <div style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 2, background: color, opacity: 0.85,
                  left: v >= 0 ? `${zeroPct}%` : `${Math.max(0, zeroPct - pct)}%`,
                  width: `${pct}%` }} />
              )}
            </div>
            <div style={{ width: 78, flexShrink: 0, textAlign: "right", color: T.txt, fontSize: 11, fontWeight: 700, fontFamily: NUM_FONT }}>
              {fmt(v)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TrendOverviewScreen() {
  const { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth, getCat, selAcc, setYear, setSubTab } = useContext(AppCtx);
  const [metric, setMetric] = useState(null); // null = Sparkline-Übersicht, sonst METRICS[i].key
  const [heroOpen, setHeroOpen] = useState(false);
  const [layout, setLayout] = useState("vertical"); // "vertical" | "horizontal"

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

  // Endekontostand/Einnahmen/Ausgaben je Jahr — respektiert den global
  // gewählten Konto-Filter (selAcc), genau wie der Hero oben. Die eigentliche
  // (teure) Berechnung sitzt in computePerYear() mit modul-weitem Cache.
  const perYear = useMemo(
    () => computePerYear(yearRange, txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth, getCat, selAcc),
    [yearRange, txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth, getCat, selAcc]
  );

  // Kopfzahlen der Übersichtskarten: bewusst über ALLE angezeigten Jahre,
  // nicht "aktuell" (steht schon im Hero) und nicht "laufendes Jahr" (per
  // Antippen über die Detailansicht erreichbar). Einnahmen/Ausgaben werden
  // über alle Jahre summiert; beim Endekontostand ergibt eine Summe keinen
  // Sinn (kein Fluss, sondern ein Stand) — dort zeigt die Zahl den Stand am
  // Ende des letzten angezeigten Jahres, also das Ergebnis über den ganzen
  // Zeitraum hinweg.
  const totalsAllYears = useMemo(() => {
    const lastRow = perYear[perYear.length - 1];
    const round = v => Math.round(v * 100) / 100;
    return {
      saldo: lastRow ? lastRow.saldo : 0,
      income: round(perYear.reduce((s, r) => s + r.income, 0)),
      expense: round(perYear.reduce((s, r) => s + r.expense, 0)),
    };
  }, [perYear]);

  const openYear = (year) => { setYear(year); setSubTab("mood"); };
  const activeMetric = METRICS.find(m => m.key === metric);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: T.bg }}>
      <YearSectionHeader active="trend" detailsOpen={heroOpen} setDetailsOpen={setHeroOpen} />

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ padding: "12px 16px 4px" }}>
          <div style={{ color: T.txt, fontSize: 20, fontWeight: 700 }}>Trend</div>
          <div style={{ color: T.txt2, fontSize: 12 }}>
            {metric ? `${activeMetric.label} · alle Jahre` : "Alle Jahre im Überblick"}
          </div>
        </div>

        <div style={{ padding: "8px 16px 24px" }}>
          {!metric ? (
            // ── Übersicht: 3 Sparkline-Karten ──
            METRICS.map(m => {
              const values = perYear.map(r => r[m.key]);
              const latest = totalsAllYears[m.key];
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
            // ── Detail: ein Balken/eine Zeile pro Jahr für die gewählte Kennzahl ──
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button onClick={() => setMetric(null)}
                  style={{ display: "flex", alignItems: "center", gap: 6,
                    background: "transparent", border: "none", color: T.blue, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                  {Li("chevron-left", 15, T.blue)} Übersicht
                </button>
                <button onClick={() => setLayout(l => l === "vertical" ? "horizontal" : "vertical")}
                  title="Ausrichtung wechseln"
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent",
                    border: `1px solid ${T.bd}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: T.txt2 }}>
                  {Li(layout === "vertical" ? "list" : "bar-chart-2", 14, T.txt2)}
                  {layout === "vertical" ? "Als Zeilen" : "Als Balken"}
                </button>
              </div>
              <div style={{ background: T.surf, border: `1px solid ${T.bd}`, borderRadius: 14,
                padding: layout === "vertical" ? "12px 8px" : "4px 12px" }}>
                {layout === "vertical"
                  ? <YearBarRows perYear={perYear} get={r => r[activeMetric.key]}
                      getPending={activeMetric.split ? (r => r[`${activeMetric.key}Pending`]) : null}
                      color={activeMetric.color(null, T)} onSelectYear={openYear} />
                  : <YearBarListHorizontal perYear={perYear} get={r => r[activeMetric.key]}
                      getPending={activeMetric.split ? (r => r[`${activeMetric.key}Pending`]) : null}
                      color={activeMetric.color(null, T)} onSelectYear={openYear} />}
              </div>
              <div style={{ color: T.txt2, fontSize: 11, marginTop: 10, textAlign: "center" }}>
                {layout === "vertical" ? "Balken" : "Zeile"} antippen → Money Mood für dieses Jahr
                {activeMetric.split ? " · hell = vorgemerkt" : ""}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { TrendOverviewScreen };
