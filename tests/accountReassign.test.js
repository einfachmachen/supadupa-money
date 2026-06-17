import { describe, it, expect } from "vitest";
import { reassignAccount, accountRefs } from "../src/utils/accountReassign.js";

const base = () => ({
  txs: [
    { id: "t1", accountId: "acc-a", totalAmount: -10 },
    { id: "t2", accountId: "acc-b", totalAmount: 5 },
    { id: "t3", totalAmount: -3 }, // Legacy ohne accountId → acc-giro
  ],
  groups: [
    { id: "g1", accountId: "acc-a" },
    { id: "g2", accountId: "acc-b" },
  ],
  budgets: {
    b1: { accountId: "acc-a", amount: 100 },
    b2: { accountId: "acc-b", amount: 50 },
  },
});

describe("accountReassign", () => {
  it("hängt alle Buchungen des Kontos auf das Ziel um — keine geht verloren", () => {
    const d = base();
    const out = reassignAccount(d, "acc-a", "acc-b");
    // gleiche Anzahl Buchungen wie vorher
    expect(out.txs).toHaveLength(d.txs.length);
    expect(out.txs.find(t => t.id === "t1").accountId).toBe("acc-b");
    // unbeteiligte Buchung bleibt
    expect(out.txs.find(t => t.id === "t2").accountId).toBe("acc-b");
    // keine Buchung verweist mehr auf das gelöschte Konto
    expect(out.txs.some(t => (t.accountId || "acc-giro") === "acc-a")).toBe(false);
  });

  it("behandelt Legacy-Buchungen ohne accountId als acc-giro", () => {
    const out = reassignAccount(base(), "acc-giro", "acc-b");
    expect(out.txs.find(t => t.id === "t3").accountId).toBe("acc-b");
    // Konten-gebundene bleiben unverändert
    expect(out.txs.find(t => t.id === "t1").accountId).toBe("acc-a");
  });

  it("hängt auch Gruppen und Budgets um", () => {
    const out = reassignAccount(base(), "acc-a", "acc-b");
    expect(out.groups.find(g => g.id === "g1").accountId).toBe("acc-b");
    expect(out.budgets.b1.accountId).toBe("acc-b");
    expect(out.budgets.b2.accountId).toBe("acc-b"); // war schon b
  });

  it("verändert nichts, was nicht zum Konto gehört", () => {
    const out = reassignAccount(base(), "acc-a", "acc-b");
    expect(out.txs.find(t => t.id === "t2")).toEqual({ id: "t2", accountId: "acc-b", totalAmount: 5 });
  });

  it("accountRefs zählt Buchungen/Gruppen/Budgets korrekt", () => {
    const r = accountRefs(base(), "acc-a");
    expect(r).toEqual({ tx: 1, grp: 1, bud: 1 });
    expect(accountRefs(base(), "acc-giro")).toEqual({ tx: 1, grp: 0, bud: 0 });
  });
});
