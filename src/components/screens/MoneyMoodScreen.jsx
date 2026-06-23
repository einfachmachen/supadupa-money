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

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MONTHS_S, MONTHS_F } from "../../utils/constants.js";
import { fmt, pn, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { YearViewToggle } from "../molecules/YearViewToggle.jsx";

const RANGE = 12;
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
  const { cats, groups, txs, year, getActualSum, getBudgetForMonth, getAcc } = useContext(AppCtx);
  const [openCat, setOpenCat] = useState(null);   // aufgeklappte Hauptkategorie
  const [detail, setDetail] = useState(null);     // { row, isSub, isIncome }

  const now = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth();
  // Jüngster abgeschlossener Monat: aktuelles Jahr → Vormonat; frühere → Dez.
  const recentIdx = year < nowY ? 11 : year > nowY ? -1 : Math.max(0, nowM - 1);
  const elapsedIdx = year < nowY ? 11 : year > nowY ? -1 : nowM;

  // Reihen je Block (Einnahmen/Ausgaben) mit 12-Monats-Serie + 24-Monats-„ext"
  // (Vorjahr+Jahr) für den gleitenden 12-Monats-Schnitt.
  const blocks = useMemo(() => {
    const extForSub = (subId) => {
      const ext = [];
      for (let k = 0; k < 24; k++) {
        const y = k < 12 ? year - 1 : year, m = k % 12;
        ext.push(Math.abs(getActualSum(y, m, subId, "E") || 0));
      }
      const budget = [];
      for (let mi = 0; mi < RANGE; mi++) budget.push(Math.abs(getBudgetForMonth(subId, year, mi) || 0));
      return { ext, actual: ext.slice(12), budget };
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
          let cExt = Array(24).fill(0), cBud = Array(RANGE).fill(0);
          const subs = (cat.subs || []).map(sub => {
            const s = extForSub(sub.id);
            cExt = add(cExt, s.ext); cBud = add(cBud, s.budget);
            return { id: sub.id, name: sub.name, ...s };
          });
          if (cExt.every(v => v === 0) && cBud.every(v => v === 0)) return;
          out.push({ id: cat.id, name: cat.name, isIncome, ext: cExt, actual: cExt.slice(12), budget: cBud, subs });
        });
      });
      return out;
    };
    return { expense: mk(false), income: mk(true) };
  }, [cats, groups, year, getActualSum, getBudgetForMonth]);

  // Abweichung des Monats mi vom Schnitt der vorangehenden 12 Monate (nur Monate
  // mit Bewegung; <2 Datenpunkte → null = neutral, damit Neues nicht sofort rot wird).
  const devAt = (row, mi) => {
    const v = row.actual[mi];
    const win = row.ext.slice(mi, mi + 12).filter(x => x > 0);
    if (win.length < 2) return null;
    const avg = win.reduce((s, x) => s + x, 0) / win.length;
    return avg > 0 ? v / avg : null;
  };
  // Reihen-Stimmung = schlimmster Monat ab dem aktuellen (inkl. kommender Belastungen).
  const rowMood = (row) => {
    let best = { c: T.bd, sev: -1 };
    const start = recentIdx < 0 ? 0 : recentIdx;
    for (let mi = start; mi < RANGE; mi++) {
      if (row.actual[mi] <= 0) continue;
      const m = classify(devAt(row, mi), row.isIncome);
      if (m.sev > best.sev) best = m;
    }
    return best;
  };

  // ── Mini-Sparkline: 12 ampelgefärbte Balken, Höhe = relative Größe ──
  const Spark = ({ row, h = 24 }) => {
    const maxV = Math.max(1, ...row.actual);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: h, flexShrink: 0 }}>
        {row.actual.map((v, mi) => {
          const { c } = classify(devAt(row, mi), row.isIncome);
          const bh = Math.max(2, Math.round((v / maxV) * h));
          return <div key={mi} title={`${MONTHS_S[mi]}: ${fmt(v)}`}
            style={{ width: 5, height: bh, background: v > 0 ? c : T.bd, opacity: v > 0 ? (mi === recentIdx ? 1 : 0.9) : 0.18, borderRadius: 1 }} />;
        })}
      </div>
    );
  };

  const Row = ({ row, sub }) => {
    const { c, sev } = rowMood(row);
    return (
      <button onClick={() => setDetail({ row, isSub: !!sub, isIncome: row.isIncome })}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
          padding: sub ? "7px 14px 7px 30px" : "9px 14px", background: "transparent",
          border: "none", borderBottom: `1px solid ${T.bd}`, cursor: "pointer", fontFamily: "inherit",
        }}>
        <span style={{ flex: 1, minWidth: 0, color: sub ? T.txt2 : T.txt, fontSize: sub ? 13 : 14, fontWeight: sub ? 500 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.name}
        </span>
        <Spark row={row} h={sub ? 18 : 24} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: sev < 0 ? "transparent" : c, border: sev < 0 ? `1px solid ${T.bd}` : "none", flexShrink: 0 }} />
      </button>
    );
  };

  const renderBlock = (label, rows, color) => {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => rowMood(b).sev - rowMood(a).sev);
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
              .filter(s => s.actual.some(v => v > 0) || s.budget.some(v => v > 0))
              .map(s => <Row key={s.id} row={{ ...s, isIncome: cat.isIncome }} sub />)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", background: T.bg }}>
      <YearViewToggle active="mood" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 8px", position: "sticky", top: 0, background: T.bg, zIndex: 2, borderBottom: `1px solid ${T.bd}` }}>
        <span style={{ color: T.txt, fontSize: 18, fontWeight: 800, flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
          {Li("activity", 17, T.gold)} Money Mood
        </span>
        <span style={{ color: T.txt, fontSize: 16, fontWeight: 800, fontFamily: NUM_FONT }}>{year}</span>
      </div>

      <div style={{ color: T.txt2, fontSize: 11, padding: "7px 14px 9px", lineHeight: 1.45 }}>
        Jede Zeile zeigt 12 Monate gegen den eigenen Schnitt – <b style={{ color: T.pos }}>grün</b> ist im üblichen Rahmen,
        {" "}<b style={{ color: T.gold }}>gelb</b> liegt spürbar drüber, <b style={{ color: T.neg }}>rot</b> ist massiv drüber.
        Tippe eine Zeile für den 12-Monats-Verlauf.
      </div>

      {renderBlock("Ausgaben", blocks.expense, T.neg)}
      {renderBlock("Einnahmen", blocks.income, T.pos)}
      {blocks.expense.length === 0 && blocks.income.length === 0 && (
        <div style={{ color: T.txt2, fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          Für {year} sind noch keine Buchungen/Budgets vorhanden.
        </div>
      )}

      {detail && <MoodDetail {...detail} year={year} txs={txs} getAcc={getAcc} recentIdx={recentIdx} elapsedIdx={elapsedIdx} devAt={devAt} onClose={() => setDetail(null)} />}
    </div>
  );
}

const navBtn = {
  width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.bd}`, background: "transparent",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

// ── Drilldown: 12 Monatsbalken (Gesamtbetrag oben, klickbar) + Zusammensetzung ──
function MoodDetail({ row, isSub, isIncome, year, txs, getAcc, recentIdx, elapsedIdx, devAt, onClose }) {
  const { name, actual, budget } = row;
  const isCat = !isSub && !!row.subs;
  // Startmonat: jüngster Monat mit Bewegung.
  const initSel = (recentIdx >= 0 && actual[recentIdx] > 0)
    ? recentIdx : (actual.reduce((acc, v, i) => v > 0 ? i : acc, 0));
  const [sel, setSel] = useState(initSel);
  const [selSub, setSelSub] = useState(null);   // gewählter Unterkategorie-Balken
  const [openBk, setOpenBk] = useState(null);   // ausgeklappte Einzelbuchung
  useEffect(() => { setOpenBk(null); }, [sel, selSub]);

  // Einzelbuchungen einer Unterkategorie in Monat mi (inkl. voller Buchung).
  const bookingsForSub = (subId, mi) => {
    const out = [];
    (txs || []).forEach(tx => {
      if (tx.pending || tx._linkedTo) return;
      const d = new Date(tx.date);
      if (d.getFullYear() !== year || d.getMonth() !== mi) return;
      let amt = 0;
      (tx.splits || []).forEach(sp => { if (sp.subId === subId) amt += Math.abs(pn(sp.amount)); });
      if (amt > 0) out.push({ tx, name: tx.desc || "Buchung", dateStr: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), val: amt });
    });
    return out.sort((a, b) => b.val - a.val);
  };

  const drilledSub = isCat && selSub ? row.subs.find(s => s.id === selSub) : null;

  // Unterkategorie-Zusammensetzung des Monats (nur Hauptkategorien).
  const subBreakdown = useMemo(() => !isCat ? [] :
    row.subs.map(s => ({ name: s.name, val: s.actual[sel], subId: s.id }))
      .filter(it => it.val > 0).sort((a, b) => b.val - a.val),
    [isCat, row, sel]);

  // Einzelbeträge für den oberen Extra-Bereich: Blattkategorie immer,
  // Hauptkategorie sobald ein Unterkategorie-Balken gewählt ist.
  const bookings = useMemo(() => {
    if (isCat && !selSub) return null;
    return bookingsForSub(isCat ? selSub : row.id, sel);
  }, [isCat, selSub, row, sel, txs, year]);

  const selTotal = actual[sel] || 0;
  const headTotal = drilledSub ? (drilledSub.actual[sel] || 0) : selTotal;
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "88vh", overflowY: "auto", background: T.surf || T.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: `1px solid ${T.bd}`, padding: "14px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ flex: 1, color: T.txt, fontSize: 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <button onClick={onClose} style={{ ...navBtn, width: 34, height: 34 }}>{Li("x", 16, T.txt2)}</button>
        </div>

        {/* Oberer Extra-Bereich: Einzelbeträge, je Zeile per Chevron ausklappbar */}
        {bookings && (
          <div style={{ border: `1px solid ${T.bd}`, borderRadius: 12, padding: "10px 12px", marginBottom: 12, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {drilledSub && (
                <button onClick={() => setSelSub(null)} title="Zurück"
                  style={{ ...navBtn, width: 24, height: 24, borderRadius: 6 }}>{Li("chevron-left", 14, T.txt2)}</button>
              )}
              <span style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {drilledSub ? drilledSub.name : name}
                <span style={{ color: T.txt2, fontSize: 11, fontWeight: 400, marginLeft: 6 }}>{MONTHS_F[sel]} {year}</span>
              </span>
              <span style={{ color: isIncome ? T.pos : T.txt, fontSize: 15, fontWeight: 800, fontFamily: NUM_FONT }}>{fmt(headTotal)}</span>
            </div>
            {bookings.length === 0 ? (
              <div style={{ color: T.txt2, fontSize: 12, padding: "4px 0" }}>Keine Buchungen in diesem Monat.</div>
            ) : (
              <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {bookings.map((it, i) => {
                  const open = openBk === i;
                  const acc = (getAcc && it.tx.accountId) ? getAcc(it.tx.accountId) : null;
                  const txTotal = Math.abs(it.tx.totalAmount || 0);
                  return (
                    <div key={i} style={{ borderRadius: 6, overflow: "hidden", background: open ? "rgba(255,255,255,0.04)" : "transparent", border: `1px solid ${open ? T.bd : "transparent"}` }}>
                      <button onClick={() => setOpenBk(open ? null : i)}
                        style={{ position: "relative", width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", borderRadius: 6, overflow: "hidden", padding: "6px 8px", display: "block" }}>
                        <div style={{ position: "absolute", inset: 0, width: `${(it.val / bkMax) * 100}%`, background: (isIncome ? T.pos : T.blue) + "22" }} />
                        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                          {Li(open ? "chevron-down" : "chevron-right", 13, T.txt2)}
                          <span style={{ flex: 1, minWidth: 0, textAlign: "left", color: T.txt, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                          <span style={{ color: T.txt2, fontSize: 10 }}>{it.dateStr}</span>
                          <span style={{ color: T.txt, fontSize: 12, fontWeight: 600, fontFamily: NUM_FONT }}>{fmt(it.val)}</span>
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Unterkategorie-Zusammensetzung des Monats (nur Hauptkategorien) */}
        {isCat && (
          <div style={{ border: `1px solid ${T.bd}`, borderRadius: 12, padding: "10px 12px", marginBottom: 12, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, color: T.txt, fontSize: 13, fontWeight: 700 }}>{MONTHS_F[sel]} {year}</span>
              <span style={{ color: isIncome ? T.pos : T.txt, fontSize: 15, fontWeight: 800, fontFamily: NUM_FONT }}>{fmt(selTotal)}</span>
            </div>
            {subBreakdown.length === 0 ? (
              <div style={{ color: T.txt2, fontSize: 12, padding: "4px 0" }}>Keine Buchungen in diesem Monat.</div>
            ) : (
              <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {subBreakdown.map((it, i) => {
                  const active = it.subId === selSub;
                  return (
                    <div key={i} onClick={() => setSelSub(it.subId)}
                      style={{ position: "relative", borderRadius: 6, overflow: "hidden", padding: "5px 8px", cursor: "pointer", outline: active ? `1px solid ${T.gold}` : "none" }}>
                      <div style={{ position: "absolute", inset: 0, width: `${(it.val / subMax) * 100}%`, background: (isIncome ? T.pos : T.blue) + "22" }} />
                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0, color: active ? T.gold : T.txt, fontSize: 12, fontWeight: active ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                        <span style={{ color: T.txt, fontSize: 12, fontWeight: 600, fontFamily: NUM_FONT }}>{fmt(it.val)}</span>
                        {Li("chevron-right", 13, active ? T.gold : T.txt2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ color: T.txt2, fontSize: 11, marginBottom: 4 }}>
          {isCat ? "Monatsbalken unten & Kategoriebalken oben sind tippbar" : "Tippe einen Balken für den jeweiligen Monat"} · gestrichelt = Budget
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {actual.map((a, i) => {
            const x = padL + i * bw;
            const bh = (a / maxV) * chartH;
            const future = i > elapsedIdx && elapsedIdx >= 0;
            const { c } = classify(devAt(row, i), isIncome);
            const seld = i === sel;
            return (
              <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
                <rect x={x} y={padTop} width={bw} height={chartH + padB} fill="transparent" />
                <rect x={x + bw * 0.12} y={padTop + chartH - bh} width={bw * 0.76} height={Math.max(0, bh)}
                  rx={2} fill={a > 0 ? c : T.bd} opacity={seld ? 1 : (future ? 0.3 : 0.5)}
                  stroke={seld ? T.txt : "none"} strokeWidth={seld ? 1 : 0} />
                {a > 0 && (
                  <text x={x + bw / 2} y={padTop + chartH - bh - 3} textAnchor="middle" fontSize="7"
                    fill={seld ? T.gold : T.txt2} fontWeight={seld ? 700 : 400}>{fmtK(a)}</text>
                )}
                {budget[i] > 0 && (
                  <line x1={x + bw * 0.05} x2={x + bw * 0.95} y1={padTop + chartH - (budget[i] / maxV) * chartH} y2={padTop + chartH - (budget[i] / maxV) * chartH}
                    stroke={T.txt} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
                )}
                <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="8" fill={seld ? T.gold : T.txt2}
                  fontWeight={seld ? 700 : 400}>{MONTHS_S[i]}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export { MoneyMoodScreen };
