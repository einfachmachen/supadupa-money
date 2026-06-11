// Mock-AppContext für Render-Smoke-Tests.
//
// Ziel: Screens/Modals einmal headless rendern, um Render-Crashes (v.a. die
// TDZ-Klasse "Cannot access X before initialization") zu fangen — NICHT um
// pixelgenaues Verhalten zu prüfen. Daher liefert der Context für unbekannte
// Schlüssel einen "universellen" Wert: aufrufbar UND mit Array-Methoden, damit
// fehlende Mock-Felder nicht selbst zu Fehlern führen.
import { AppCtx } from "../src/state/AppContext.js";
import React from "react";

function universal() {
  const f = function () { return f; };
  Object.assign(f, {
    map: () => [], filter: () => [], flatMap: () => [], forEach: () => {},
    reduce: (_fn, init) => (init ?? 0), find: () => undefined, some: () => false,
    every: () => true, slice: () => [], sort: () => [], join: () => "",
    includes: () => false, indexOf: () => -1, keys: () => [], values: () => [],
    entries: () => [],
  });
  f[Symbol.iterator] = function* () {};
  return f;
}

const acc = { id: "acc-giro", name: "Giro", color: "#8aa", icon: "credit-card", delayDays: 0 };

// Präzise Werte für die am häufigsten genutzten Felder/Funktionen.
const EXPLICIT = {
  cats: [], groups: [], txs: [], accounts: [acc], budgets: {}, reviewQueue: [],
  customIcons: [], quickBtns: [], quickColors: [], yearData: {}, startBalances: {},
  csvRules: {}, debugFlags: {},
  year: 2026, month: 5, frozenYear: 2026, frozenMonth: 5, selAcc: null,
  col3Name: "Aktuell", themeName: "dark", handedness: "right",
  newTx: { splits: [], totalAmount: "" }, newCat: { subs: [], name: "" },
  newSubName: "", editTx: null, mgmtCat: null, modal: null, exportModal: null,
  // Berechnungs-Helfer mit korrekten Rückgabe-Typen
  getCat: () => null, getSub: () => null, getAcc: () => acc, txType: () => "expense",
  getActualSum: () => 0, getBudgetForMonth: () => 0, getTotalIncome: () => 0,
  getTotalExpense: () => 0, getKumulierterSaldo: () => 0, getPendingSum: () => 0,
  pendingItemsFor: () => [], splitTotal: 0, splitDiff: 0, txValid: false,
  getJV: () => "", getMV: () => "", getProgEndeAccGlobal: () => 0,
  getPrognoseSaldoDetail: () => ({ mitte: 0, ende: 0, saldoMitte: 0, saldoEnde: 0, detailMitte: {}, detailEnde: {} }),
  _txsInMonth: () => [], _txsInMonthCat: () => [], _txsInMonthCatSub: () => [],
  _txsInMonthAcc: () => [], _txsInMonthAccCat: () => [], _txsInMonthAccCatSub: () => [],
  sparOpenRequest: 0,
  // Cloud-Status (für SettingsInline)
  supaUrl: "", supaKey: "", supaStatus: "idle", supaError: "", supaLockKey: 0, supaActive: false,
  jsonbinKey: "", jsonbinId: "", jsonbinStatus: "idle", jsonbinActive: false,
  gistToken: "", gistId: "", gistStatus: "idle", gistActive: false,
  cfUrl: "", cfSecret: "", cfStatus: "idle", cfActive: false, cfCredsReady: true, cfSaveOnClose: false,
  syncStatus: "idle", syncError: "", isDirty: false,
};

const BOOL_RE = /^(show|is|has|can|use)[A-Z]|Active$|Open$|Ready$/;

const handler = {
  get(_t, key) {
    if (typeof key === "symbol") return undefined;
    if (key in EXPLICIT) return EXPLICIT[key];
    if (key === "__esModule") return undefined;
    if (/^set[A-Z]/.test(key)) return () => {};           // Setter → no-op
    if (BOOL_RE.test(key)) return false;                   // Flags → false
    return universal();                                    // sonst: universell
  },
  has() { return true; },
};

export const mockCtx = new Proxy({}, handler);
export const withCtx = (el) => React.createElement(AppCtx.Provider, { value: mockCtx }, el);
