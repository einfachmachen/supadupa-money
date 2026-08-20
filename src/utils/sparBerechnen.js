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
    // `today` MUSS mit: saldoAnchor() in utils/saldo.js entscheidet daran, ob
    // der Vormonat vergangen ist (dann echter Saldo über getKumulierterSaldo)
    // oder aktuell/künftig (dann rekursiv aus den Buchungen). Fehlt es, fällt
    // saldoAnchor auf `new Date()` zurück und hält bei einem injizierten
    // Stichtag den falschen Monat für vergangen — die Rekursion wird
    // abgeschnitten und ein hypothetischer Buchungsstand (siehe
    // computeSafeCurrentMonthAmount) wirkt sich nicht mehr auf die Folgemonate
    // aus. Genau daran scheiterte die Absicherung gegen ferne Engpässe.
    ctx._saldoUtilCtx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth,
      today,
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
  //
  // `allDays` (die Tage, an denen sich überhaupt etwas ändert — plus 14./15./
  // Monatsletzter) kommt mit, damit ein Aufrufer das Minimum über ein
  // DATUMSFENSTER statt über den ganzen Monat bilden kann. Gebraucht von
  // `minImFenster` unten: die Verantwortung einer Sparrate endet am nächsten
  // Sparplan-Termin, und der liegt fast immer mitten im Folgemonat.
  return { min: minVal, saldoEnde, saldoAt, allDays };
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
export function buildTxsByMonth(txs) {
  const map = new Map();
  (txs || []).forEach(t => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });
  return map;
}

// HISTORISCH: der EINE Stellknopf „Rate des laufenden Monats", geprueft gegen
// den ganzen Horizont. Die App nutzt ihn nicht mehr — eine Schieflage im
// Januar senkte damit schon im August die Sparrate (Nutzer-Hinweis, siehe
// `computeSafeAmountForAbgang` weiter unten). Er bleibt als Referenz stehen:
// die Tests belegen an ihm den Unterschied zur Fenster-Rechnung.
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

// ── Wer fängt eine Schieflage ab: WELCHE Sparrate? ───────────────────────
//
// `computeSafeCurrentMonthAmount` oben kennt genau einen Stellknopf: die Rate
// des LAUFENDEN Monats. Sie prüft damit den ganzen Horizont — eine Schieflage
// im Januar senkt also schon im August die Sparrate. Das ist teuer und
// unnötig: Das Geld wird bis Dezember gar nicht gebraucht, liegt bis dahin
// zinslos auf Giro, und genau die Monate mit der Super-Sparrate verlieren
// ihren Vorsprung (Nutzer-Hinweis: „Ich möchte so viel wie möglich sparen —
// besonders in den Monaten mit der Super-Sparrate").
//
// Die richtige Aufteilung folgt aus der Sache selbst: Geld, das eine Rate
// NICHT abbucht, bleibt von ihrem Termin an auf Giro liegen — aber die
// nächste Rate kann dasselbe für alles ab IHREM Termin leisten. Also:
//
//   Eine Rate ist für die Tage von ihrem eigenen Termin bis zum nächsten
//   Sparplan-Termin verantwortlich. Für nichts davor und nichts danach.
//
// Die letzte Rate im Horizont hat kein „danach" und trägt den Rest.
//
// Die Umkehrung ist der Fall, den man leicht übersieht: Fällt der Saldo am
// 5. Januar unter den Puffer und geht die Januar-Rate erst am 28. ab, kann
// die Januar-Rate daran nichts ändern — zuständig ist die DEZEMBER-Rate.
// Genau deshalb ist das Fenster taggenau und nicht monatsweise.

// Alle Sparplan-Abgänge auf Giro, chronologisch — je Monat höchstens einer.
//
// Die Eindeutigkeits-Bedingung ist dieselbe wie bisher: Liegen in einem Monat
// mehrere Sparplan-Buchungen, ist nicht zu erkennen, welche gemeint ist —
// dann lieber diesen Monat auslassen als raten.
export function sparAbgaenge(txs, abDatumIso = null) {
  const proMonat = new Map();
  (txs || []).forEach((t) => {
    if (!t.pending || t._linkedTo || !t._seriesId) return;
    if (t.accountId !== "acc-giro") return;
    if (!(t.desc || "").startsWith("Sparen·")) return;
    if (abDatumIso && (t.date || "") < abDatumIso) return;
    const key = (t.date || "").slice(0, 7);
    if (!key) return;
    if (proMonat.has(key)) proMonat.set(key, "mehrdeutig");
    else proMonat.set(key, t);
  });
  return [...proMonat.values()]
    .filter((v) => v && v !== "mehrdeutig")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// Tiefster Tagessaldo im Fenster [vonIso, bisIso) — über Monatsgrenzen hinweg.
// `bisIso === null` heißt „bis zum Ende des Horizonts".
// Gibt `null` zurück, wenn im Fenster kein einziger Tag zu prüfen ist.
export function minImFenster(vonIso, bisIso, accId, ctx, today, horizonMonths) {
  const [vy, vm] = String(vonIso).split("-").map(Number);
  if (!vy || !vm) return null;
  let min = null;
  for (let i = 0; i <= horizonMonths; i++) {
    const m = (vm - 1 + i) % 12, y = vy + Math.floor((vm - 1 + i) / 12);
    const monatsPfx = `${y}-${String(m + 1).padStart(2, "0")}-`;
    // Ganz hinter dem Fensterende? Dann sind wir fertig.
    if (bisIso && monatsPfx > bisIso.slice(0, 8)) break;
    const r = computeMinTagessaldo(y, m, {}, accId, null, ctx, today);
    if (!r || !r.allDays) continue;
    r.allDays.forEach((tag) => {
      if (tag < vonIso) return;
      if (bisIso && tag >= bisIso) return;
      const s = r.saldoAt(tag);
      if (min === null || s < min) min = s;
    });
  }
  return min;
}

// Der höchste Betrag für GENAU DIESE Rate, mit dem im Fenster
// [abgang.date, bisIso) kein Tag unter den Puffer fällt.
//
// `null` heißt: nicht berechenbar (kein Tag im Fenster) — dann bleibt die
// Rate unangetastet.
export function computeSafeAmountForAbgang({ abgang, bisIso, puffer = 0, ctx, today = new Date(), horizonMonths }) {
  if (!abgang || !abgang.date) return null;
  const [ay, am] = abgang.date.split("-").map(Number);
  const eff = horizonMonths ?? furthestPendingMonthOffset(ctx.txs, ay, am - 1);

  // Caches wie in computeSafeCurrentMonthAmount: sie hängen nur an den
  // ANDEREN Buchungen, nie am hier simulierten Betrag.
  const restCache = {};
  const txsById = buildTxIdMap(ctx.txs || []);

  const mitBetrag = (x) => {
    const testTxs = (ctx.txs || []).map((t) => (t.id === abgang.id
      ? { ...t, totalAmount: -x, splits: (t.splits || []).map((s) => ({ ...s, amount: -x })) }
      : t));
    return { ...ctx, txs: testTxs, getProgEndeAccGlobal: undefined,
      _restCache: restCache, _txsById: txsById, _txsByMonth: buildTxsByMonth(testTxs) };
  };

  // Obergrenze: was ohne diese Rate im Fenster übrig bleibt.
  const ohne = minImFenster(abgang.date, bisIso, "acc-giro", mitBetrag(0), today, eff);
  if (ohne === null) return null;
  const max = Math.floor(Math.max(0, ohne - puffer));
  if (max === 0) return 0;

  const traegt = (x) => {
    const min = minImFenster(abgang.date, bisIso, "acc-giro", mitBetrag(x), today, eff);
    return min === null || min >= puffer;
  };

  let lo = 0, hi = max;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (traegt(mid)) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// Der ganze Plan auf einmal: für jede Rate ab `abDatumIso` der sichere Betrag.
//
// Rückgabe: [{ abgang, alt, neu }] — nur die Raten, bei denen sich etwas
// ändert. Chronologisch, damit der Aufrufer sie in einem Zug anwenden kann.
export function sparRatenAbgleich({ txs, puffer = 0, ctx, today = new Date(), abDatumIso = null, horizonMonths }) {
  const ab = abDatumIso || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const raten = sparAbgaenge(txs, ab);
  if (!raten.length) return [];
  const aenderungen = [];
  // Laufender Stand: jede Rate wird auf dem Ergebnis der vorherigen gerechnet,
  // sonst sähe Rate 2 noch den alten Wert von Rate 1.
  let stand = txs;
  raten.forEach((rate, i) => {
    const bisIso = i + 1 < raten.length ? raten[i + 1].date : null;
    const aktuell = stand.find((t) => t.id === rate.id) || rate;
    const alt = Math.round(Math.abs(aktuell.totalAmount || 0) * 100) / 100;
    const neu = computeSafeAmountForAbgang({
      abgang: aktuell, bisIso, puffer, ctx: { ...ctx, txs: stand }, today, horizonMonths,
    });
    if (neu === null || neu === alt) return;
    aenderungen.push({ abgang: aktuell, alt, neu });
    stand = stand.map((t) => (t.id === aktuell.id
      ? { ...t, totalAmount: -neu, splits: (t.splits || []).map((s) => ({ ...s, amount: -neu })) }
      : t));
  });
  return aenderungen;
}

// ── Was kann die Sparrate gegen DIESEN Engpass noch ausrichten? ──────────
//
// Die App passt Sparraten automatisch an. Das ist gut, war aber unsichtbar:
// Solange die Anpassung reichte, sah man gar keine Warnung — und wenn sie
// nicht mehr reichte, stand plötzlich eine Warnung da, ohne ein Wort dazu, ob
// die App etwas dagegen tut (Nutzer: „ich sehe keine Info, ob/was ggf.
// geändert wird. Bin gerade lost").
//
// Diese Funktion beantwortet genau das für einen konkreten Engpass-Tag:
//
//   { jahr, monat, aktuell, sicher, wirdReduziert, reicht }  |  null
//
//   `null`          – es gibt gar keine Rate vor diesem Tag, die helfen könnte.
//   `wirdReduziert` – die App senkt diese Rate gleich (oder hat es schon).
//   `reicht`        – mit der gesenkten Rate ist der Engpass wirklich weg.
//                     Ist das false, hilft nur noch, Ausgaben zu kürzen.
export function sparHilfeFuerEngpass({ txs, engpassIso, puffer = 0, ctx, today = new Date() }) {
  if (!engpassIso) return null;
  const raten = sparAbgaenge(txs);
  let rate = null, naechste = null;
  raten.forEach((r, i) => {
    if ((r.date || "") < engpassIso) { rate = r; naechste = raten[i + 1] || null; }
  });
  if (!rate) return null;

  const bisIso = naechste ? naechste.date : null;
  const aktuell = Math.round(Math.abs(rate.totalAmount || 0) * 100) / 100;
  let sicher;
  try {
    sicher = computeSafeAmountForAbgang({ abgang: rate, bisIso, puffer, ctx, today });
  } catch { return null; }
  if (sicher === null) return null;

  // Reicht die gesenkte Rate wirklich? `computeSafeAmountForAbgang` liefert im
  // Zweifel 0 — das heißt „mehr geht nicht", nicht „damit ist es gelöst".
  const [ay, am] = rate.date.split("-").map(Number);
  const eff = furthestPendingMonthOffset(ctx.txs, ay, am - 1);
  const mitSicher = (ctx.txs || []).map((t) => (t.id === rate.id
    ? { ...t, totalAmount: -sicher, splits: (t.splits || []).map((s) => ({ ...s, amount: -sicher })) }
    : t));
  const min = minImFenster(rate.date, bisIso, "acc-giro",
    { ...ctx, txs: mitSicher, getProgEndeAccGlobal: undefined,
      _restCache: {}, _txsById: buildTxIdMap(mitSicher), _txsByMonth: buildTxsByMonth(mitSicher) },
    today, eff);

  return {
    jahr: ay, monat: am - 1, aktuell, sicher,
    wirdReduziert: sicher < aktuell,
    reicht: min === null || min >= puffer,
  };
}
