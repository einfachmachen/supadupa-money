// Welche Sparplan-Vormerkungen bringt die Automatik NICHT in Übereinstimmung
// mit dem angezeigten Plan?
//
// Seit Vorschau und Automatik dieselbe Funktion benutzen (`sparPlanOptimum`),
// steht im Plan und in der Vormerkung dieselbe Zahl — aber nur für die Raten,
// die die Automatik überhaupt anfasst. Sie lässt bewusst zwei Sorten liegen,
// und beide sahen bisher aus wie ein Widerspruch (Nutzer: „das verwirrt sonst
// total"):
//
//   VERGANGEN    Eine Rate, deren Termin vorbei ist. `sparAbgaenge` filtert
//                ab dem laufenden Monat — was gestern abgehen sollte, lässt
//                sich heute nicht mehr ändern. Sie verschwindet aber auch
//                nicht von selbst: Nur Budget-Platzhalter laufen mit ihrer
//                Phase ab (`budgetPlaceholderActive` in utils/saldo.js), eine
//                gewöhnliche Vormerkung bleibt stehen, bis sie einer echten
//                Buchung zugeordnet oder gelöscht wird. Auf den Saldo wirkt
//                sie nicht (der Anker eines vergangenen Monats ist der ECHTE
//                Kontostand) — sie steht nur mit einem alten Betrag herum.
//
//   MEHRDEUTIG   Liegen in EINEM Monat mehrere Abgänge desselben Plans, ist
//                nicht zu erkennen, welcher die Rate ist. Die Automatik lässt
//                den Monat dann komplett aus (`sparAbgaenge`: "mehrdeutig") —
//                bisher stillschweigend. Genau dort kann ein alter Betrag
//                beliebig lange stehen bleiben.
//
// Diese Funktion benennt beides, damit das Widget es zeigen kann, statt es
// den Nutzer durch Vergleichen zweier Bildschirme finden zu lassen.

// `txs`: alle Buchungen. `sparDesc`: die Beschreibung dieses Plans
// ("Sparen·<Name>"). `heuteIso`: Stichtag "YYYY-MM-DD" (der heutige Tag zählt
// noch als offen — dieselbe Grenze wie bei den Budget-Phasen).
export function sparPlanPflege({ txs, sparDesc, heuteIso }) {
  const eigene = (txs || []).filter((t) => t.pending && t.desc === sparDesc);
  const monatsPfx = heuteIso.slice(0, 7);

  // Vergangenes: BEIDE Beine (Abgang auf Giro und der verknüpfte Zugang).
  const vergangen = eigene.filter((t) => String(t.date) < heuteIso);
  const vergangenIds = vergangen.map((t) => t.id);
  const vergangenMonate = [...new Set(vergangen.map((t) => String(t.date).slice(0, 7)))].sort();

  // Mehrdeutig: nur die Abgangs-Seite zählt — sie ist es, die `sparAbgaenge`
  // je Monat eindeutig braucht. Vergangene Monate sind hier uninteressant,
  // die überspringt die Automatik ohnehin.
  const proMonat = new Map();
  eigene.forEach((t) => {
    if (t._linkedTo || !t._seriesId) return;
    if (t.accountId !== "acc-giro") return;
    const key = String(t.date).slice(0, 7);
    if (key < monatsPfx) return;
    proMonat.set(key, (proMonat.get(key) || 0) + 1);
  });
  const mehrdeutig = [...proMonat.entries()]
    .filter(([, n]) => n > 1).map(([k]) => k).sort();

  return {
    vergangenIds,
    vergangenAnzahl: vergangen.filter((t) => !t._linkedTo).length,
    vergangenMonate,
    vergangenSumme: vergangen
      .filter((t) => !t._linkedTo && t.accountId === "acc-giro")
      .reduce((s, t) => s + Math.abs(t.totalAmount || 0), 0),
    mehrdeutig,
    handlungsbedarf: vergangenIds.length > 0 || mehrdeutig.length > 0,
  };
}

export function heuteIsoVon(today = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
}
