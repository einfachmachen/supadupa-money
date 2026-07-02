import { describe, it, expect } from "vitest";
import { fetchAllTransactions } from "../src/utils/enableBankingFetch.js";

// Regression: Enable Banking paginiert Umsätze über continuation_key. Ohne
// Schleife lieferte fetchNewBankTx/EnableBankingWizard nur die erste Seite —
// bei Konten mit vielen Buchungen im Abrufzeitraum (z. B. Tagesgeld mit
// täglicher Zins-Vormerkung) gingen dadurch echte, neue Umsätze kommentarlos
// verloren, statt als neu oder Dublette erkannt zu werden.
describe("fetchAllTransactions", () => {
  it("folgt continuation_key, bis keiner mehr geliefert wird", async () => {
    const calls = [];
    const client = {
      getTransactions: async (uid, { dateFrom, continuationKey } = {}) => {
        calls.push({ uid, dateFrom, continuationKey });
        if (!continuationKey) {
          return { transactions: [{ transaction_id: "a" }], continuation_key: "page-2" };
        }
        if (continuationKey === "page-2") {
          return { transactions: [{ transaction_id: "b" }], continuation_key: "page-3" };
        }
        return { transactions: [{ transaction_id: "c" }] };
      },
    };

    const all = await fetchAllTransactions(client, "acc-uid", "2026-05-01");

    expect(all.map((t) => t.transaction_id)).toEqual(["a", "b", "c"]);
    expect(calls).toEqual([
      { uid: "acc-uid", dateFrom: "2026-05-01", continuationKey: undefined },
      { uid: "acc-uid", dateFrom: "2026-05-01", continuationKey: "page-2" },
      { uid: "acc-uid", dateFrom: "2026-05-01", continuationKey: "page-3" },
    ]);
  });

  it("gibt eine leere Liste zurück, wenn keine Umsätze vorhanden sind", async () => {
    const client = { getTransactions: async () => ({ transactions: [] }) };
    expect(await fetchAllTransactions(client, "acc-uid", "2026-05-01")).toEqual([]);
  });
});
