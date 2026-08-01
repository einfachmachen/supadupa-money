// Sparplan-Kernberechnung: taggenauer Tiefst-Saldo eines Monats. 1:1
// extrahiert aus TagesgeldWidget (getMinTagessaldo), damit dieselbe, bereits
// genutzte Logik auch außerhalb des Widgets aufgerufen werden kann (siehe
// App.jsx: automatische Anpassung der LAUFENDEN Monatsrate bei
// Pufferunterschreitung, ohne die ganze Serie neu zu berechnen).
import { restMitte, restEnde, phaseStillReachable, saldoEnde as saldoEndeUtil } from "./saldo.js";
import { isDuplCounterpart, buildTxIdMap } from "./tx.js";

// ctx: { txs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, getProgEndeAccGlobal? }
// getProgEndeAccGlobal ist OPTIONAL: die reale App übergibt den gecachten
// App.jsx-Wrapper (schnell, aber an die ECHTEN txs gebunden — closure, nicht
// parametrisiert). Fehlt er, wird ersatzweise direkt saldoEnde() aus
// utils/saldo.js mit dem übergebenen ctx.txs berechnet — das ist zwingend
// nötig, sobald ctx.txs ein HYPOTHETISCHER Buchungsstand ist (siehe
// computeSafeCurrentMonthAmount unten), da der App.jsx-Wrapper die echten
// txs aus seinem eigenen Closure liest und einen hypothetischen Stand sonst
// schlicht ignorieren würde.
export function computeMinTagessaldo(y, m, virtualSpar = {}, accId, excludeSparDesc = null, ctx, today = new Date()) {
  const { txs = [], cats = [], accounts = [], getKumulierterSaldo, getCat, getBudgetForMonth, getProgEndeAccGlobal } = ctx;
  // Für den Fallback EINEN Sub-Kontext auf ctx SELBST zwischenspeichern (statt
  // bei jedem Aufruf neu zu bauen) — saldoEnde()/saldoAnchor() cachen intern
  // rekursive Zwischenergebnisse auf genau diesem Objekt (ctx._anchorCache in
  // utils/saldo.js). Ein frisches Objekt pro Aufruf würde diesen Cache nie
  // treffen lassen: beim monatsweisen Vorwärts-Scannen über viele Monate
  // (siehe computeSafeCurrentMonthAmount) rechnet sich sonst JEDER Monat
  // erneut rekursiv bis zum Anker zurück — quadratische statt lineare
  // Laufzeit (führte zu einer echten Warnung des Browsers wegen eines
  // "langsamen Skripts" bei horizonMonths=24). Solange derselbe ctx über
  // mehrere Monate hinweg wiederverwendet wird (der Fall in der Schleife
  // dort), bleibt der Cache erhalten.
  if (!getProgEndeAccGlobal && !ctx._saldoUtilCtx) {
    ctx._saldoUtilCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth,
      _restCache: ctx._restCache, _txsById: ctx._txsById, _txsByMonth: ctx._txsByMonth };
  }
  const progEnde = (py, pm, pAcc) => getProgEndeAccGlobal
    ? getProgEndeAccGlobal(py, pm, pAcc)
    : saldoEndeUtil(py, pm, pAcc ?? null, ctx._saldoUtilCtx);
  const effSelAcc = accId;
  const prevY = m === 0 ? y - 1 : y, prevM = m === 0 ? 11 : m - 1;
  const _prevIsPast = prevY < today.getFullYear() || (prevY === today.getFullYear() && prevM < today.getMonth());
  const baseSaldo = effSelAcc
    ? (_prevIsPast
        ? (getKumulierterSaldo(prevY, prevM, effSelAcc) ?? progEnde(prevY, prevM, effSelAcc))
        : (progEnde(prevY, prevM, effSelAcc) ?? getKumulierterSaldo(prevY, prevM, effSelAcc)))
    : (_prevIsPast
        ? getKumulierterSaldo(prevY, prevM)
        : progEnde(prevY, prevM));
  if (baseSaldo === null || baseSaldo === undefined) return { min: null, saldoEnde: null };
  let baseSaldoEff = baseSaldo;
  if (excludeSparDesc) {
    const oldSparBefore = txs.filter(t => {
      if (!t.pending || t._linkedTo) return false;
      if (t.desc !== excludeSparDesc) return false;
      const isAcc = !effSelAcc || t.accountId === effSelAcc || (!t.accountId && effSelAcc === "acc-giro");
      if (!isAcc) return false;
      const d = new Date(t.date);
      const idx = d.getFullYear() * 12 + d.getMonth();
      const targetIdx = y * 12 + m;
      return idx < targetIdx;
    });
    const correction = oldSparBefore.reduce((s, t) => s + Math.abs(t.totalAmount), 0);
    baseSaldoEff = baseSaldo + correction;
  }
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad2 = n => String(n).padStart(2, "0");
  const pfx = `${y}-${pad2(m + 1)}-`;
  const isAccTx = t => !effSelAcc || t.accountId === effSelAcc || (!t.accountId && effSelAcc === "acc-giro");
  // ctx._txsById/ctx._txsByMonth (optional): computeSafeCurrentMonthAmount
  // baut diese Indizes einmalig VOR der Kandidaten-Schleife, statt hier bei
  // JEDEM der ~12 Kandidaten × bis zu mehreren hundert Monate (mehrjährige
  // Finanzierung) erneut komplett über alle Buchungen zu scannen.
  const _txsById = ctx._txsById || buildTxIdMap(txs || []);
  const _monthPool = ctx._txsByMonth ? (ctx._txsByMonth.get(`${y}-${m}`) || []) : txs;
  const mTxs = _monthPool.filter(t => {
    if (isDuplCounterpart(t, _txsById)) return false;
    if (excludeSparDesc && t.pending && t.desc === excludeSparDesc) return false;
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m && isAccTx(t);
  });
  const signed = t => {
    const ct = t._csvType || (() => {
      const s = (t.splits || []).filter(sp => sp.catId);
      if (s.length > 0) { const c = getCat(s[0].catId); if (c) return (c.type === "income" || c.type === "tagesgeld") ? "income" : "expense"; }
      return t.totalAmount >= 0 ? "income" : "expense";
    })();
    return ct === "income" ? +Math.abs(t.totalAmount) : -Math.abs(t.totalAmount);
  };
  const _saldoCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth,
    _restCache: ctx._restCache, _txsById: ctx._txsById, _txsByMonth: ctx._txsByMonth };
  const istGiroView = !effSelAcc || effSelAcc === "acc-giro";
  const obMitte = (istGiroView && phaseStillReachable(y, m, 14, _saldoCtx)) ? restMitte(y, m, _saldoCtx) : 0;
  const obEnde = (istGiroView && phaseStillReachable(y, m, lastDay, _saldoCtx)) ? restEnde(y, m, _saldoCtx) : 0;
  const isFutureDay = (d) => {
    const tY = today.getFullYear(), tM = today.getMonth(), tD = today.getDate();
    if (y > tY) return true;
    if (y < tY) return false;
    if (m > tM) return true;
    if (m < tM) return false;
    return d >= tD;
  };
  const saldoAt = (dayStr) => {
    const dayNum = parseInt(dayStr.split("-")[2]);
    const real = mTxs.filter(t => !t.pending && !t._budgetSubId && t.date <= dayStr).reduce((s, t) => s + signed(t), 0);
    const pend = mTxs.filter(t => t.pending && !t._budgetSubId && t.date <= dayStr).reduce((s, t) => s + signed(t), 0);
    const virt = Object.entries(virtualSpar).filter(([d]) => d <= dayStr).reduce((s, [, v]) => s + v, 0);
    const bd = !isFutureDay(dayNum) ? 0 : (dayNum >= 15 ? -obEnde : -obMitte);
    return baseSaldoEff + real + pend + virt + bd;
  };
  const tbReal = today;
  const isCurrentMonth = (y === tbReal.getFullYear() && m === tbReal.getMonth());
  const firstRelevantDay = isCurrentMonth ? tbReal.getDate() : 1;
  const firstRelevantStr = `${pfx}${pad2(firstRelevantDay)}`;
  const daysWithTxs = new Set();
  mTxs.forEach(t => { if (t.date >= firstRelevantStr) daysWithTxs.add(t.date); });
  [`${pfx}14`, `${pfx}15`, `${pfx}${pad2(lastDay)}`].forEach(d => { if (d >= firstRelevantStr) daysWithTxs.add(d); });
  daysWithTxs.add(firstRelevantStr);
  const allDays = [...daysWithTxs].sort();
  let minVal = null;
  allDays.forEach(ds => {
    const s = saldoAt(ds);
    if (minVal === null || s < minVal) minVal = s;
  });
  const saldoEnde = saldoAt(`${pfx}${pad2(lastDay)}`);
  // saldoAt wird mit zurückgegeben, damit Aufrufer den Saldo eines EINZELNEN
  // Tages abfragen können, ohne die Basis-/Budget-/Vorzeichen-Logik ein
  // zweites Mal nachzubauen (siehe computeTagessaldoAt).
  return { min: minVal, saldoEnde, saldoAt };
}

// Taggenauer Saldo für EINEN konkreten Tag (ISO "YYYY-MM-DD"). Dünne Hülle um
// computeMinTagessaldo, damit garantiert dieselbe Logik greift: Basissaldo des
// Vormonats, CSV-Duplikatfilter, Vorzeichen aus Kategorie/_csvType und die
// Budget-Reservierung (RestMitte/RestEnde).
//
// Nötig für den Zins-Sweep (utils/zinsSweep.js): dessen Fenster läuft vom
// Monatsletzten bis zum nächsten Banktag und überschreitet damit regelmäßig
// die Monatsgrenze — computeMinTagessaldo liefert dagegen nur das Minimum
// EINES Monats.
export function computeTagessaldoAt(iso, accId, ctx, today = new Date()) {
  const [y, mo] = String(iso).split("-").map(Number);
  if (!y || !mo) return null;
  const r = computeMinTagessaldo(y, mo - 1, {}, accId, null, ctx, today);
  return r && typeof r.saldoAt === "function" ? r.saldoAt(iso) : null;
}

// Sichere Sparrate für den LAUFENDEN Monat, die zusätzlich sicherstellt, dass
// auch kein Folgemonat (innerhalb horizonMonths) unter den Puffer fällt —
// nicht nur der laufende Monat selbst. Eine Buchung, die am Monatsletzten
// vom Giro aufs Tagesgeld geht, wirkt sich als fester Betrag auf JEDEN
// Folgemonat aus (weniger Abgang jetzt = überall danach entsprechend mehr
// Spielraum) — deshalb genügt eine Vorwärts-Simulation mit dem jeweils
// bereits bestehenden (unveränderten) Betrag aller Folgemonate.
//
// WICHTIG: bewusst eine SIMULATION (mit hypothetisch verändertem Betrag der
// laufenden Monats-Buchung), nicht eine reaktive Prüfung auf aktuell
// gemeldete Warnungen — sonst würde das Beheben eines Folgemonats-Engpasses
// die Warnung zum Verschwinden bringen, woraufhin die Rate im nächsten
// Durchlauf sofort wieder erhöht würde und der Engpass erneut aufträte
// (Oszillation). Die Simulation bleibt dagegen stabil, weil sie nicht von
// zwischenzeitlich verschwundenen Warnungen abhängt.
//
// ctx OHNE getProgEndeAccGlobal übergeben (siehe computeMinTagessaldo oben)
// — sonst würde der reale App.jsx-Cache die echten statt der hier
// simulierten (testTxs) Buchungen für die Folgemonate zugrunde legen.
// Ermittelt, wie viele Monate ab (y, m) noch eine vorgemerkte Buchung
// existiert — z.B. eine mehrjährige Finanzierung mit monatlicher Rate.
// Ohne expliziten horizonMonths-Wert wird GENAU so weit simuliert, wie
// tatsächlich Vormerkungen reichen ("alle Jahre", nicht nur ein fester
// Zeitraum) — analog zu computeKontoWarnungen (dieselbe Anforderung).
function furthestPendingMonthOffset(txs, y, m) {
  const baseIdx = y * 12 + m;
  let maxOffset = 0;
  (txs || []).forEach(t => {
    if (!t.pending) return;
    const d = new Date(t.date);
    const offset = (d.getFullYear() * 12 + d.getMonth()) - baseIdx;
    if (offset > maxOffset) maxOffset = offset;
  });
  return maxOffset;
}

// Bucketed Index Jahr-Monat → Teilmenge von txs (siehe utils/saldo.js:
// monthPool). Ohne diesen Index würde JEDE Monatsabfrage (bis zu mehrere
// hundert bei einer langlaufenden Finanzierung) über ALLE Buchungen
// scannen — mit ihm nur einmal pro Kandidat.
function buildTxsByMonth(txs) {
  const map = new Map();
  (txs || []).forEach(t => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });
  return map;
}

export function computeSafeCurrentMonthAmount({ y, m, puffer, abgangId, abgangDesc, ctx, today = new Date(), horizonMonths }) {
  // Cache für RestMitte/RestEnde (Budget-Reservierungen je Monat), über ALLE
  // Kandidaten der binären Suche HINWEG geteilt: anders als der Anker-Cache
  // (saldoAnchor) hängen diese Werte nur von den ANDEREN, budget-getaggten
  // Buchungen ab — nie vom hier simulierten Sparplan-Betrag selbst. Ohne
  // diesen Cache scannt jeder der ~12 Kandidaten alle Monate erneut von
  // Grund auf (siehe utils/saldo.js: collectBudgets/restMitte/restEnde),
  // was bei horizonMonths=24 zu spürbaren Verzögerungen führte (Browser-
  // Warnung wegen eines "langsamen Skripts").
  const restCache = {};
  // _linkedTo-Partner-Lookup (buildTxIdMap) hängt nur von IDs/accountId ab,
  // nie vom simulierten Betrag — einmalig bauen und über alle Kandidaten
  // hinweg teilen statt bei jedem computeMinTagessaldo-Aufruf neu.
  const txsById = buildTxIdMap(ctx.txs || []);
  const effHorizon = horizonMonths ?? furthestPendingMonthOffset(ctx.txs, y, m);

  // Eigene, flache Kopie für diesen einen Aufruf — computeMinTagessaldo
  // hängt im Fallback-Pfad einen Cache (_saldoUtilCtx) an das übergebene
  // ctx-Objekt. Würde hier das Original-ctx mutiert, würden alle weiter
  // unten per Spread (`{...ctx}`) gebauten testCtx-Objekte diesen (an die
  // ECHTEN txs gebundenen) Cache mit-erben und für jeden Simulations-
  // Kandidaten fälschlich denselben, veralteten Stand zurückliefern.
  const ownCtx = { ...ctx, _restCache: restCache, _txsById: txsById, _txsByMonth: buildTxsByMonth(ctx.txs) };
  const { min: minTagOwn } = computeMinTagessaldo(y, m, {}, "acc-giro", abgangDesc, ownCtx, today);
  if (minTagOwn === null) return null;
  const ownMax = Math.floor(Math.max(0, minTagOwn - puffer));

  const isSafeWithAmount = (x) => {
    const testTxs = ctx.txs.map(t => t.id === abgangId ? { ...t, totalAmount: -x } : t);
    const testCtx = { ...ctx, txs: testTxs, getProgEndeAccGlobal: undefined,
      _restCache: restCache, _txsById: txsById, _txsByMonth: buildTxsByMonth(testTxs) };
    for (let i = 1; i <= effHorizon; i++) {
      const nm = (m + i) % 12, ny = y + Math.floor((m + i) / 12);
      const { min } = computeMinTagessaldo(ny, nm, {}, "acc-giro", null, testCtx, today);
      if (min !== null && min < puffer) return false;
    }
    return true;
  };

  let lo = 0, hi = ownMax;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (isSafeWithAmount(mid)) lo = mid; else hi = mid - 1;
  }
  return lo;
}
