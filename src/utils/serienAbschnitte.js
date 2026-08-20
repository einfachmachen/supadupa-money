// Betrags-Abschnitte einer Vormerkungs-Serie — getrennt nach „noch geplant"
// und „schon vorbei".
//
// Warum die Trennung: Die Liste im Bearbeiten-Dialog zeigte bisher ALLE
// Buchungen der Serie, ohne Rücksicht auf das Datum. Bei einem Sparplan stand
// dort neben den kommenden Raten auch die des Vormonats — mit dem Betrag von
// damals. Der Kopf sagte „Serie beginnt 31.08.", die Liste zeigte „Jul 2026:
// 658 €", und beides zusammen las sich wie zwei verschiedene Sparpläne
// (Nutzer-Bild).
//
// Es sind aber keine zwei Pläne, sondern zwei Zeiten: Was vorbei ist, ist
// Vergangenheit und wird von der Sparplan-Automatik bewusst nicht mehr
// angefasst (`sparAbgaenge` filtert ab dem laufenden Monat — was gestern
// abgegangen ist, lässt sich heute nicht mehr ändern). Genau deshalb darf es
// auch nicht so aussehen, als wäre es noch Teil des Plans.
//
// Wichtig: Eine vergangene Rate verschwindet NICHT von selbst. Nur
// Budget-Platzhalter laufen mit ihrer Phase ab (`budgetPlaceholderActive` in
// utils/saldo.js); eine gewöhnliche Vormerkung bleibt stehen, bis sie einer
// echten Buchung zugeordnet oder gelöscht wird.

// Aufeinanderfolgende Buchungen mit gleichem Betrag zu einem Abschnitt fassen.
function abschnitte(liste) {
  const raus = [];
  let cur = null;
  liste.forEach((t) => {
    const a = Math.round(t.totalAmount * 100) / 100;
    if (!cur || cur.amt !== a) {
      if (cur) raus.push(cur);
      cur = { amt: a, from: t.date, to: t.date, count: 1 };
    } else {
      cur.to = t.date;
      cur.count++;
    }
  });
  if (cur) raus.push(cur);
  return raus;
}

// `serienTxs`: alle Buchungen der Serie (Ausnahmen bereits herausgefiltert),
// chronologisch oder unsortiert — hier wird ohnehin sortiert.
// `heuteIso`: Stichtag "YYYY-MM-DD". Alles davor gilt als vorbei.
export function serienAbschnitte(serienTxs, heuteIso) {
  const sortiert = [...(serienTxs || [])].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)));
  const vorbei = sortiert.filter((t) => String(t.date) < heuteIso);
  const offen = sortiert.filter((t) => String(t.date) >= heuteIso);

  // Läuft die Serie komplett in der Vergangenheit, gibt es nichts zu trennen —
  // dann ist die ganze Liste Vergangenheit und wird auch so gezeigt.
  if (!offen.length) {
    return { offen: [], offenCount: 0, vergangenSections: abschnitte(vorbei),
      vergangenCount: vorbei.length, nurVergangen: true };
  }
  return { offen: abschnitte(offen), offenCount: offen.length,
    vergangenSections: abschnitte(vorbei), vergangenCount: vorbei.length,
    nurVergangen: false };
}

export function heuteIso(today = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
}
