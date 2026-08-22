// Aufräumen nach der Mega-Sparrate.
//
// Die Mega-Sparrate war ein Manöver für Banken, die den Stand am Zinstermin
// verzinsen: kurz vor dem Stichtag viel aufs Tagesgeld, am nächsten Banktag
// zurück. Sie ist entfallen, weil sie auf einer falschen Annahme beruhte —
// Dirks Bank (wie die meisten) verzinst TAGGENAU und schreibt die Summe nur
// quartalsweise gut. Dann liegt das Geld ein bis zwei Tage dort und bringt
// Cent statt Euro.
//
// Der Code ist weg, seine SPUREN sind es nicht: Wer die Automatik hat laufen
// lassen, hat in seinen Buchungen
//
//   * Rückbuchungen am nächsten Banktag  (`_sweepId`, je zwei Beine),
//   * angehobene Sparraten               (`_sweepHin`, mit `_sweepBasis` als
//                                         ursprünglichem Betrag).
//
// Ohne dieses Aufräumen bliebe eine Sparrate von mehreren tausend Euro als
// Vormerkung stehen, zu der es keine Erklärung mehr im Bildschirm gibt — und
// der Sparplan würde sie beim nächsten Lauf für eine echte Rate halten.
//
// Bewusst KEIN Blick auf `pending`: Sollte eine solche Buchung längst gebucht
// sein, ist sie echt und wird nicht angefasst. Genau deshalb wird hier nur
// entfernt, was pending ist, und nur zurückgesetzt, was pending ist.

export function sweepAufraeumen(txs) {
  const liste = txs || [];
  const entfernt = [];
  const behalten = [];
  let geaendert = false;

  liste.forEach((t) => {
    // Die Rückbuchung gibt es nur wegen des Sweeps — mit ihm fällt sie weg.
    if (t && t._sweepId && t.pending) { entfernt.push(t.id); geaendert = true; return; }
    // Die angehobene Rate bleibt, aber mit ihrem ursprünglichen Betrag.
    if (t && t._sweepHin && t.pending) {
      const basis = Math.abs(Number(t._sweepBasis) || 0);
      const vorzeichen = t.totalAmount < 0 ? -1 : 1;
      const { _sweepHin, _sweepBasis, ...rest } = t;
      behalten.push({
        ...rest,
        totalAmount: vorzeichen * basis,
        splits: (t.splits || []).map((s) => ({ ...s, amount: vorzeichen * basis })),
      });
      geaendert = true;
      return;
    }
    // Marker an einer bereits gebuchten Buchung: Der Betrag ist echt und bleibt,
    // nur die Markierung hat keine Bedeutung mehr.
    if (t && (t._sweepId || t._sweepHin)) {
      const { _sweepId, _sweepHin, _sweepBasis, ...rest } = t;
      behalten.push(rest);
      geaendert = true;
      return;
    }
    behalten.push(t);
  });

  return { txs: geaendert ? behalten : liste, entfernt, geaendert };
}
