// Verknüpfungs-Hygiene für Buchungen.
//
// Modell: Eine echte Giro-Buchung trägt `linkedIds` (IDs verknüpfter
// Vormerkungen / PayPal-Legs); die Gegenseite trägt `_linkedTo` (die ID der
// Giro-Buchung). Wird eine Seite gelöscht, darf die andere sie nicht weiter
// referenzieren — sonst entstehen „verwaiste" Links.

// Giro-Buchungen, die fürs PayPal-Matching als „bereits verknüpft" gelten —
// ABER nur, wenn die Verknüpfung noch LEBT (Link-Partner existiert weiterhin).
// Eine verwaiste linkedIds-Referenz (Partner gelöscht) macht eine Lastschrift
// sonst dauerhaft un-matchbar.
export function liveLinkedGiroIds(txs) {
  const ids = new Set((txs || []).map(t => t.id));
  return new Set(
    (txs || [])
      .filter(t => !t.pending && (t.linkedIds || []).some(id => ids.has(id)))
      .map(t => t.id)
  );
}

// Buchungen löschen (per Prädikat) UND verbleibende Buchungen von Referenzen auf
// die gelöschten bereinigen. Gibt die Liste unverändert zurück, wenn nichts zu
// löschen ist (stabile Identität).
export function dropTxsAndUnlink(list, shouldDelete) {
  const all = list || [];
  const removed = new Set(all.filter(shouldDelete).map(t => t.id));
  if (!removed.size) return all;
  return all
    .filter(t => !removed.has(t.id))
    .map(t => {
      let nt = t;
      if ((t.linkedIds || []).some(id => removed.has(id)))
        nt = { ...nt, linkedIds: (t.linkedIds || []).filter(id => !removed.has(id)) };
      if (t._linkedTo && removed.has(t._linkedTo))
        nt = { ...nt, _linkedTo: null };
      return nt;
    });
}
