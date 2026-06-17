// Hängt beim Löschen eines Kontos alle Referenzen von `fromId` auf `toId` um,
// damit keine Buchung (und kein Budget / keine Kategorie-Gruppe) verwaist.
//
// Legacy-Buchungen ohne accountId zählen als "acc-giro" — wird "acc-giro"
// gelöscht, werden auch diese explizit auf das Ziel gesetzt.
export function reassignAccount({ txs, groups, budgets }, fromId, toId) {
  const isFrom = (a) => (a || "acc-giro") === fromId;
  return {
    txs: (txs || []).map(t => isFrom(t.accountId) ? { ...t, accountId: toId } : t),
    groups: (groups || []).map(g => (g.accountId || "") === fromId ? { ...g, accountId: toId } : g),
    budgets: Object.fromEntries(
      Object.entries(budgets || {}).map(([k, v]) =>
        [k, (v && v.accountId === fromId) ? { ...v, accountId: toId } : v])
    ),
  };
}

// Zählt, wie viele Objekte an `accId` hängen (für die Warnung vor dem Löschen).
export function accountRefs({ txs, groups, budgets }, accId) {
  return {
    tx: (txs || []).filter(t => (t.accountId || "acc-giro") === accId).length,
    grp: (groups || []).filter(g => (g.accountId || "") === accId).length,
    bud: Object.values(budgets || {}).filter(b => (b && b.accountId) === accId).length,
  };
}
