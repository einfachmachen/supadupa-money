import { describe, it, expect } from "vitest";
import { saldoEnde } from "../src/utils/saldo.js";
import { pn } from "../src/utils/format.js";

// ─────────────────────────────────────────────────────────────────────
// Ziel: empirisch beweisen, ob die ALTE konto-spezifische Prognose
// (SaldoHero2.getProgEndeAcc) durch die zentrale saldoEnde() ersetzt
// werden kann, ohne dass sich Zahlen ändern. Wir portieren getProgEndeAcc
// 1:1 (Stand SaldoHero2.jsx) und vergleichen es gegen saldoEnde über ein
// breites Szenario-Spektrum + randomisierte Fälle.
// ─────────────────────────────────────────────────────────────────────

// Kontext-Builder analog tests/saldo.test.js (gleiches getKumulierterSaldo).
function buildCtx({ accounts, cats, anchors = {}, txs = [], budgets = {}, today = null }) {
  const getKumulierterSaldo = (y, m, accId) => {
    if(!accId) {
      // Gesamt = Summe über alle Konten
      let s = 0;
      accounts.forEach(a => { const v = getKumulierterSaldo(y, m, a.id); if(v != null) s += v; });
      return s;
    }
    const accAnchors = anchors[accId] || {};
    const targetIdx = y * 12 + m;
    let bestKey = null, bestIdx = -Infinity;
    Object.keys(accAnchors).forEach(k => {
      const [yK, mK] = k.split("-").map(Number);
      const idx = yK * 12 + mK;
      if(idx <= targetIdx && idx > bestIdx) { bestKey = k; bestIdx = idx; }
    });
    if(!bestKey) return null;
    let saldo = accAnchors[bestKey];
    if(bestIdx === targetIdx) return saldo;
    const [aY, aM] = bestKey.split("-").map(Number);
    let curY = aY, curM = aM + 1;
    if(curM > 11) { curM = 0; curY++; }
    while(curY < y || (curY === y && curM <= m)) {
      txs.forEach(t => {
        if((t.accountId || "acc-giro") !== accId) return;
        if(t._budgetSubId) return;
        if(t._linkedTo) {
          const partner = txs.find(p => p.id === t._linkedTo);
          if(partner && (partner.accountId||"acc-giro") === accId) return;
        }
        const d = new Date(t.date);
        if(d.getFullYear() !== curY || d.getMonth() !== curM) return;
        const type = t._csvType || (t.totalAmount >= 0 ? "income" : "expense");
        const amt = Math.abs(t.totalAmount || 0);
        saldo += (type === "income") ? amt : -amt;
      });
      curM++;
      if(curM > 11) { curM = 0; curY++; }
    }
    return saldo;
  };
  const getBudgetForMonth = (subId) => {
    const b = budgets[subId];
    return b ? b.amount : 0;
  };
  return { accounts, cats, txs, budgets, getKumulierterSaldo, getBudgetForMonth, today };
}

// ── 1:1-Portierung von SaldoHero2.getProgEndeAcc (Stand vor Konsolidierung) ──
// Einziger Unterschied: `new Date()` → P.today (Test-Determinismus).
function getProgEndeAcc(y, m, accId, P) {
  const { today, getKumulierterSaldo, txs, cats, budgets, getBudgetForMonth } = P;
  const tb = today || new Date();
  if(y < tb.getFullYear() || (y === tb.getFullYear() && m < tb.getMonth()))
    return getKumulierterSaldo(y, m, accId);
  const pY = m===0?y-1:y, pM = m===0?11:m-1;
  const prevEnde = getProgEndeAcc(pY, pM, accId, P);
  if(prevEnde===null||prevEnde===undefined) return null;
  const lastD = new Date(y,m+1,0).getDate();
  const todayY=tb.getFullYear(), todayM=tb.getMonth(), todayD=tb.getDate();
  const isCur=y===todayY&&m===todayM, isPastM=y<todayY||(y===todayY&&m<todayM);
  const endeAbg=isPastM;
  const isAcc = t => t.accountId===accId || (!t.accountId && accId==="acc-giro");
  const signAmt = t => {
    const type = t._csvType||(t.totalAmount>=0?"income":"expense");
    return type==="income" ? Math.abs(t.totalAmount) : -Math.abs(t.totalAmount);
  };
  const uncatTxs = (txs||[]).filter(t=>{
    if(t._linkedTo||t._budgetSubId) return false;
    if(endeAbg&&t.pending) return false;
    if(!isAcc(t)) return false;
    const d=new Date(t.date);
    if(d.getFullYear()!==y||d.getMonth()!==m) return false;
    return (t.splits||[]).length===0 || (t.splits||[]).every(sp=>!sp.catId);
  });
  const uncatSum = uncatTxs.reduce((s,t)=>s+signAmt(t), 0);
  if(accId !== "acc-giro") {
    const allAccTxs = (txs||[]).filter(t=>{
      if(t._budgetSubId) return false;
      if(endeAbg&&t.pending) return false;
      if(!isAcc(t)) return false;
      const d=new Date(t.date);
      return d.getFullYear()===y && d.getMonth()===m;
    });
    return prevEnde + allAccTxs.reduce((s,t)=>s+signAmt(t), 0);
  }
  const inc = (cats||[]).filter(c=>c.type==="income").reduce((s,cat)=>{
    return s+(txs||[]).filter(t=>{
      if(t._linkedTo||t._budgetSubId) return false;
      if(endeAbg&&t.pending) return false;
      if(!isAcc(t)) return false;
      const d=new Date(t.date);
      return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id);
    }).reduce((ss,t)=>{
      const spAmt=(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((a,sp)=>a+Math.abs(pn(sp.amount)),0);
      return ss+(spAmt>0?spAmt:Math.abs(t.totalAmount));
    },0);
  },0);
  const out = (cats||[]).filter(c=>c.type==="expense").reduce((s,cat)=>{
    if(endeAbg) {
      return s+(txs||[]).filter(t=>{
        if(t._linkedTo||t._budgetSubId) return false;
        if(t.pending&&t._seriesTyp!=="finanzierung") return false;
        if(!isAcc(t)) return false;
        const d=new Date(t.date);
        return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id);
      }).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id)
        .reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
    }
    if(accId !== "acc-giro") {
      const real=(txs||[]).filter(t=>{if(t.pending||t._linkedTo||t._budgetSubId)return false;if(!isAcc(t))return false;const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id);}).reduce((ss,t)=>{const sa=(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((a,sp)=>a+Math.abs(pn(sp.amount)),0);return ss+(sa>0?sa:Math.abs(t.totalAmount));},0);
      const pend=(txs||[]).filter(t=>{if(!t.pending||t._linkedTo||t._budgetSubId)return false;if(!isAcc(t))return false;const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id);}).reduce((ss,t)=>{const sa=(t.splits||[]).filter(sp=>sp.catId===cat.id).reduce((a,sp)=>a+Math.abs(pn(sp.amount)),0);return ss+(sa>0?sa:Math.abs(t.totalAmount));},0);
      return s+real+pend;
    }
    const subIds=new Set((cat.subs||[]).map(sub=>sub.id));
    const subTotal=(cat.subs||[]).reduce((catSum,sub)=>{
      const bG=getBudgetForMonth(sub.id,y,m);
      const budgetAccId = (budgets||{})[sub.id]?.accountId || "acc-giro";
      const effectiveBG = (bG>0 && budgetAccId===accId) ? bG : 0;
      const real=(txs||[]).filter(t=>{if(t.pending||t._linkedTo||t._budgetSubId)return false;if(!isAcc(t))return false;const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id&&sp.subId===sub.id);}).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||0),0);
      const pend=(txs||[]).filter(t=>{if(!t.pending||t._linkedTo||t._budgetSubId)return false;if(!isAcc(t))return false;const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id&&sp.subId===sub.id);}).reduce((ss,t)=>ss+Math.abs((t.splits||[]).find(sp=>sp.subId===sub.id)?.amount||t.totalAmount),0);
      return catSum+(effectiveBG>0?Math.max(effectiveBG,real+pend):real+pend);
    },0);
    const pendNoSub=(txs||[]).filter(t=>{if(!t.pending||t._linkedTo||t._budgetSubId)return false;if(!isAcc(t))return false;const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));}).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId))).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)||t.totalAmount),0),0);
    const realNoSub=(txs||[]).filter(t=>{if(t.pending||t._linkedTo||t._budgetSubId)return false;if(!isAcc(t))return false;const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m&&(t.splits||[]).some(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId)));}).reduce((ss,t)=>ss+(t.splits||[]).filter(sp=>sp.catId===cat.id&&(!sp.subId||!subIds.has(sp.subId))).reduce((sss,sp)=>sss+Math.abs(pn(sp.amount)),0),0);
    return s+subTotal+pendNoSub+realNoSub;
  },0);
  return prevEnde + inc - out + uncatSum;
}

// Standard-Konten/Kategorien
const ACCOUNTS = [{ id: "acc-giro", name: "Giro" }, { id: "acc-tagesgeld", name: "Tagesgeld" }];
const CATS = [
  { id: "c-essen",   type: "expense", subs: [{ id: "s-essen" }] },
  { id: "c-baecker", type: "expense", subs: [{ id: "s-baecker" }] },
  { id: "c-gehalt",  type: "income",  subs: [{ id: "s-gehalt" }] },
];

function placeholders(year, month, subId, mitte, ende, catId = "c-essen") {
  const lastDay = new Date(year, month+1, 0).getDate();
  const mm = String(month+1).padStart(2,"0");
  return [
    { id: `b-${subId}-mitte`, accountId: "acc-giro", pending: true, _budgetSubId: subId + "_mitte",
      _csvType: "expense", date: `${year}-${mm}-14`, totalAmount: mitte, splits: [{ catId, subId, amount: mitte }] },
    { id: `b-${subId}-ende`, accountId: "acc-giro", pending: true, _budgetSubId: subId,
      _csvType: "expense", date: `${year}-${mm}-${String(lastDay).padStart(2,"0")}`, totalAmount: ende, splits: [{ catId, subId, amount: ende }] },
  ];
}

// Vergleichshelfer: getProgEndeAcc vs saldoEnde für gegebenes (y,m,accId)
function bothEqual(cfg, y, m, accId) {
  const ctx = buildCtx(cfg);
  const P = { today: cfg.today, getKumulierterSaldo: ctx.getKumulierterSaldo, txs: cfg.txs||[], cats: cfg.cats||CATS, budgets: cfg.budgets||{}, getBudgetForMonth: ctx.getBudgetForMonth };
  const old = getProgEndeAcc(y, m, accId, P);
  const neu = saldoEnde(y, m, accId, buildCtx(cfg)); // frischer ctx (eigener Cache)
  return { old, neu };
}

describe("Prognose-Konsolidierung: getProgEndeAcc vs saldoEnde", () => {
  describe("Giro — algebraische Äquivalenz (Budget-Floor ⇔ RestEnde)", () => {
    const base = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-giro": { "2026-3": 1000 } }, today: new Date("2026-05-05") };

    it("Ausgabe unter Budget (Gesamtbudget, Floor greift)", () => {
      const cfg = { ...base, budgets: { "s-essen": { amount: 200 } }, txs: [
        { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -50, _csvType: "expense", splits: [{ catId: "c-essen", subId: "s-essen", amount: -50 }] },
        ...placeholders(2026, 4, "s-essen", 0, 200),
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-giro");
      expect(neu).toBe(old);
    });

    it("Ausgabe über Budget (Ist > Budget)", () => {
      const cfg = { ...base, budgets: { "s-essen": { amount: 200 } }, txs: [
        { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -260, _csvType: "expense", splits: [{ catId: "c-essen", subId: "s-essen", amount: -260 }] },
        ...placeholders(2026, 4, "s-essen", 0, 200),
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-giro");
      expect(neu).toBe(old);
    });

    it("Mitte+Ende-Split, Ausgabe in beiden Hälften", () => {
      const cfg = { ...base, budgets: { "s-essen": { amount: 300 } }, txs: [
        { id: "t1", accountId: "acc-giro", date: "2026-05-08", totalAmount: -40, _csvType: "expense", splits: [{ catId: "c-essen", subId: "s-essen", amount: -40 }] },
        { id: "t2", accountId: "acc-giro", date: "2026-05-20", totalAmount: -90, _csvType: "expense", splits: [{ catId: "c-essen", subId: "s-essen", amount: -90 }] },
        ...placeholders(2026, 4, "s-essen", 100, 200),
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-giro");
      expect(neu).toBe(old);
    });

    it("Mehrere Kategorien + Einnahme", () => {
      const cfg = { ...base, budgets: { "s-essen": { amount: 200 }, "s-baecker": { amount: 60 } }, txs: [
        { id: "t1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -50, _csvType: "expense", splits: [{ catId: "c-essen", subId: "s-essen", amount: -50 }] },
        { id: "t2", accountId: "acc-giro", date: "2026-05-12", totalAmount: -80, _csvType: "expense", splits: [{ catId: "c-baecker", subId: "s-baecker", amount: -80 }] },
        { id: "t3", accountId: "acc-giro", date: "2026-05-25", totalAmount: 2500, _csvType: "income", splits: [{ catId: "c-gehalt", subId: "s-gehalt", amount: 2500 }] },
        ...placeholders(2026, 4, "s-essen", 100, 100),
        ...placeholders(2026, 4, "s-baecker", 0, 60, "c-baecker"),
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-giro");
      expect(neu).toBe(old);
    });
  });

  describe("Vergangenheit / Zukunft", () => {
    it("Vergangener Monat → beide = getKumulierterSaldo", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-giro": { "2026-2": 500 } }, today: new Date("2026-05-15"), budgets: {}, txs: [
        { id: "t1", accountId: "acc-giro", date: "2026-04-10", totalAmount: -50, _csvType: "expense", splits: [{ catId: "c-essen", subId: "s-essen", amount: -50 }] },
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 3, "acc-giro");
      expect(neu).toBe(old);
    });

    it("Übernächster Monat (reine Zukunft, Budget durchgehend reserviert)", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-giro": { "2026-3": 1000 } }, today: new Date("2026-05-05"), budgets: { "s-essen": { amount: 200 } }, txs: [
        ...placeholders(2026, 4, "s-essen", 0, 200),
        ...placeholders(2026, 5, "s-essen", 0, 200),
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 5, "acc-giro");
      expect(neu).toBe(old);
    });
  });

  describe("Tagesgeld (Nicht-Giro)", () => {
    it("Einfache Buchungen, kein Budget-Floor", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-tagesgeld": { "2026-3": 5000 } }, today: new Date("2026-05-05"), budgets: {}, txs: [
        { id: "t1", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: 100, _csvType: "income", splits: [{ catId: "c-gehalt", subId: "s-gehalt", amount: 100 }] },
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-tagesgeld");
      expect(neu).toBe(old);
    });
  });

  describe("Gesamt-Sicht (accId=null) — nur saldoEnde (getProgEndeAcc unterstützt das nicht)", () => {
    it("saldoEnde(null) summiert Konten", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-giro": { "2026-3": 1000 }, "acc-tagesgeld": { "2026-3": 5000 } }, today: new Date("2026-05-05"), budgets: {}, txs: [] };
      const neu = saldoEnde(2026, 4, null, buildCtx(cfg));
      expect(neu).toBe(6000);
    });
  });

  // ── Randomisierte Breitensuche: deckt Kombinationen ab, die einzelne Tests verfehlen ──
  describe("Randomisiert (Giro, budgetiert)", () => {
    function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
    it("1000 zufällige Giro-Szenarien: saldoEnde === getProgEndeAcc", () => {
      const rnd = mulberry32(12345);
      const pick = arr => arr[Math.floor(rnd()*arr.length)];
      let mismatches = [];
      for(let i=0;i<1000;i++){
        const budE = pick([0,50,100,200]);
        const budM = pick([0,50,100]);
        const subs = pick(["s-essen","s-baecker"]);
        const catId = subs==="s-essen"?"c-essen":"c-baecker";
        const nTx = Math.floor(rnd()*4);
        const txs = [...placeholders(2026,4,subs,budM,budE,catId)];
        for(let k=0;k<nTx;k++){
          const day = 1+Math.floor(rnd()*28);
          const amt = -(5+Math.floor(rnd()*120));
          const pending = rnd()<0.4;
          txs.push({ id:`r${i}-${k}`, accountId:"acc-giro", pending, date:`2026-05-${String(day).padStart(2,"0")}`,
            totalAmount:amt, _csvType:"expense", splits:[{catId, subId:subs, amount:amt}] });
        }
        // gelegentlich eine Einnahme
        if(rnd()<0.3){ const amt=100+Math.floor(rnd()*2000); txs.push({id:`r${i}-inc`,accountId:"acc-giro",pending:rnd()<0.3,date:`2026-05-${String(1+Math.floor(rnd()*28)).padStart(2,"0")}`,totalAmount:amt,_csvType:"income",splits:[{catId:"c-gehalt",subId:"s-gehalt",amount:amt}]}); }
        const cfg = { accounts:ACCOUNTS, cats:CATS, anchors:{ "acc-giro":{ "2026-3": 1000 } }, today:new Date("2026-05-05"),
          budgets: { [subs]: { amount: budM+budE } } };
        cfg.txs = txs;
        const { old, neu } = bothEqual(cfg, 2026, 4, "acc-giro");
        if(Math.abs((old??0)-(neu??0)) > 1e-6) mismatches.push({ i, old, neu, txs });
      }
      if(mismatches.length){
        const ex = mismatches[0];
        // eslint-disable-next-line no-console
        console.error(`MISMATCH-Beispiel #${ex.i}: alt=${ex.old} neu=${ex.neu}`, JSON.stringify(ex.txs));
      }
      expect(mismatches.length).toBe(0);
    });
  });

  // ── Dokumentierte Divergenzen ──────────────────────────────────────────
  // Hier weichen alte Funktion und saldoEnde bewusst ab. saldoEnde (= neu) ist
  // jeweils der korrekte Wert und wird seit der Konsolidierung überall genutzt
  // (Hero, Drilldown, Konto-Umschalter). Diese Tests halten fest, WARUM gewechselt
  // wurde — und dass es nur diese klar fehlerhaften Altfälle betrifft.
  describe("Dokumentierte (aufgelöste) Divergenzen alt→neu", () => {
    it("Giro + ausgehender Sparen-Transfer: alt ignoriert ihn, saldoEnde zieht ihn ab", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-giro": { "2026-3": 1000 } }, today: new Date("2026-05-05"), budgets: {}, txs: [
        { id: "g1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -100, _csvType: "expense", _linkedTo: "tg1", splits: [] },
        { id: "tg1", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: 100, _csvType: "income", _linkedTo: "g1", splits: [] },
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-giro");
      expect(old).toBe(1000); // ALT (fehlerhaft): Umbuchung ignoriert
      expect(neu).toBe(900);  // NEU (korrekt): 100 € verlassen das Giro
    });
    it("Tagesgeld + CSV-Dublette: alt zählt doppelt, saldoEnde dedupliziert", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-tagesgeld": { "2026-3": 5000 } }, today: new Date("2026-05-05"), budgets: {}, txs: [
        { id: "x1", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: 200, _csvType: "income", splits: [] },
        { id: "x2", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: 200, _csvType: "income", _linkedTo: "x1", splits: [] },
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-tagesgeld");
      expect(old).toBe(5400); // ALT (fehlerhaft): 200 doppelt
      expect(neu).toBe(5200); // NEU (korrekt): Dublette entfernt
    });
    it("Tagesgeld + eingehender Sparen-Transfer: identisch (beide zählen den Zugang)", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-tagesgeld": { "2026-3": 5000 } }, today: new Date("2026-05-05"), budgets: {}, txs: [
        { id: "g1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -300, _csvType: "expense", _linkedTo: "tg1", splits: [] },
        { id: "tg1", accountId: "acc-tagesgeld", date: "2026-05-10", totalAmount: 300, _csvType: "income", _linkedTo: "g1", splits: [] },
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-tagesgeld");
      expect(neu).toBe(old);
      expect(neu).toBe(5300);
    });
    it("Giro + unkategorisierte Buchung: identisch", () => {
      const cfg = { accounts: ACCOUNTS, cats: CATS, anchors: { "acc-giro": { "2026-3": 1000 } }, today: new Date("2026-05-05"), budgets: {}, txs: [
        { id: "u1", accountId: "acc-giro", date: "2026-05-10", totalAmount: -25, _csvType: "expense", splits: [] },
      ]};
      const { old, neu } = bothEqual(cfg, 2026, 4, "acc-giro");
      expect(neu).toBe(old);
      expect(neu).toBe(975);
    });
  });
});
