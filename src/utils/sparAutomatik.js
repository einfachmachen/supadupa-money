// Die Sparrate des LAUFENDEN Monats nachführen.
//
// Diese Entscheidung stand als `useMemo` mitten in App.jsx — und war damit
// nicht zu prüfen: Sie läuft nur, wenn im Buchungsbestand genau eine
// Sparplan-Rate für den laufenden Monat steht. Ein Boot-Test mit leeren Daten
// kommt gar nicht erst hinein.
//
// Genau daran ist die App abgestürzt: Beim Ausbau der Mega-Sparrate blieb eine
// Zeile stehen, die eine gelöschte Hilfsvariable benutzte
// („ReferenceError: reineTxs is not defined", Nutzer-Bild). Alle 904 Tests
// waren grün — keiner konnte diese Stelle je erreichen.
//
// Deshalb steht sie jetzt hier: eine reine Funktion, ohne React, ohne Context.
//
// Ergebnis:
//   null                       – nichts zu tun (kein eindeutiger Plan, oder der
//                                Betrag stimmt bereits)
//   { abgangId, zugangId,      – die Rate soll von `oldAmount` auf `safeAmount`
//     oldAmount, safeAmount,     gesetzt werden; `zugangId` ist das verknüpfte
//     y, m }                     Gegenstück auf dem Zielkonto (oder null)
//
// Bewusst NUR bei genau einer eindeutigen Rate: Bei mehreren Plänen im selben
// Monat wäre nicht zu erkennen, welche gemeint ist — dann lieber nichts
// automatisch anfassen.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function sparAnpassungFuerMonat({ txs, sparOptimum, today = new Date() } = {}) {
  const liste = txs || [];
  const y = today.getFullYear(), m = today.getMonth();
  const pad2 = (n) => String(n).padStart(2, "0");
  const monatsPfx = `${y}-${pad2(m + 1)}-`;

  const kandidaten = liste.filter((t) => t.pending && !t._linkedTo && t._seriesId
    && t.accountId === "acc-giro" && (t.desc || "").startsWith("Sparen·")
    && (t.date || "").startsWith(monatsPfx));
  if (kandidaten.length !== 1) return null;

  const abgang = kandidaten[0];
  const oldAmount = round2(Math.abs(abgang.totalAmount));
  // Der Betrag kommt aus DERSELBEN Rechnung wie die der Folgemonate
  // (`sparPlanOptimum`): Der ganze Plan wird in einem Zug optimiert, nicht
  // Monat für Monat. Zwei getrennte Rechnungen liefen einander in die Quere —
  // die eine hob die Rate des laufenden Monats auf das Maximum ihres Fensters,
  // die andere musste das später wieder einfangen.
  //
  // Solange die (verzögerte) Rechnung noch nicht gelaufen ist, bleibt die Rate
  // unangetastet.
  const safeAmount = sparOptimum && sparOptimum.has(abgang.id)
    ? sparOptimum.get(abgang.id) : oldAmount;
  if (safeAmount === oldAmount) return null;

  const zugang = liste.find((t) => t._linkedTo === abgang.id && t.pending);
  return { abgangId: abgang.id, zugangId: zugang ? zugang.id : null,
    oldAmount, safeAmount, y, m };
}

// Die Rate (und ihr verknüpftes Gegenstück) auf den neuen Betrag setzen.
// Der Zugang trägt denselben Betrag mit umgekehrtem Vorzeichen — es ist eine
// Umbuchung, keine zwei unabhängigen Buchungen.
export function sparRateSetzen(txs, { abgangId, zugangId, safeAmount }) {
  return (txs || []).map((t) => {
    if (t.id === abgangId)
      return { ...t, totalAmount: -safeAmount,
        splits: (t.splits || []).map((s) => ({ ...s, amount: -safeAmount })) };
    if (zugangId && t.id === zugangId)
      return { ...t, totalAmount: safeAmount,
        splits: (t.splits || []).map((s) => ({ ...s, amount: safeAmount })) };
    return t;
  });
}
