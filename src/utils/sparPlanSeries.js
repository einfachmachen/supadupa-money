// Reine Entscheidungslogik für TagesgeldWidget.doAktualisieren(): welche
// Monate beim Neuberechnen einer SparPlan-Serie pro Bein (Abgang vom Giro /
// Zugang aufs Zielkonto) neu angelegt werden dürfen, ohne eine vom Nutzer
// bewusst gelöschte Einzelrate wieder aufleben zu lassen.
//
// Wichtig: die beiden Beine eines verknüpften Paars (Abgang/Zugang) werden
// GETRENNT betrachtet. Eine reine Monats-Prüfung über beide Beine hinweg
// (frühere Fassung dieses Fixes) hätte ein noch vorhandenes Gegenstück als
// "Monat existiert noch" gewertet und das vom Nutzer gelöschte Bein trotzdem
// wieder mit angelegt — genau der gemeldete "Tagesgeld-Einnahme kommt nach
// dem Löschen zurück"-Fall, wenn nur die Einnahme (Zugang) gelöscht wurde,
// der Giro-Abgang aber bestehen blieb.

// "YYYY-MM-DD" → fortlaufender Monatsschlüssel (Jahr*12+Monat, 0-basiert)
export function keyOfDate(dateStr) {
  const [y, m] = String(dateStr).split("-").map(Number);
  return y * 12 + (m - 1);
}

// months: Array von Monatsschlüsseln (aus der aktuellen Neuberechnung).
// oldAbgang/oldZugang: Arrays der bisherigen PENDING Buchungen dieser Serie
// (je Objekt mit .date), BEVOR sie entfernt werden.
// hasZugangAccount: ob überhaupt ein Zielkonto für die Zugang-Seite gesetzt ist.
export function planLegDecisions(months, oldAbgang, oldZugang, hasZugangAccount) {
  const abgangKeys = new Set((oldAbgang || []).map(t => keyOfDate(t.date)));
  const zugangKeys = new Set((oldZugang || []).map(t => keyOfDate(t.date)));
  const maxAbgangKey = abgangKeys.size ? Math.max(...abgangKeys) : -Infinity;
  const maxZugangKey = zugangKeys.size ? Math.max(...zugangKeys) : -Infinity;
  // Innerhalb der bisherigen Spanne dieses Beins, aber keine vorhandene Rate
  // mehr → wurde bewusst gelöscht, nicht wieder anlegen. Jenseits der
  // bisherigen Spanne (oder wenn es noch nie eine Rate gab) → echter neuer
  // Monat, normal anlegen.
  const wasDeleted = (key, keys, maxKey) => key <= maxKey && !keys.has(key);
  return months.map(key => ({
    key,
    keepAbgang: !wasDeleted(key, abgangKeys, maxAbgangKey),
    keepZugang: !!hasZugangAccount && !wasDeleted(key, zugangKeys, maxZugangKey),
  }));
}
