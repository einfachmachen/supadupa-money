// Budget-Vorschlag je Unterkategorie aus der Realität ableiten:
// gewichteter Durchschnitt über vergangene UND zukünftige Monate.
//   • vergangene Monate → tatsächlich gebuchte Beträge (höher gewichtet, wActual)
//   • aktueller/künftige Monate → Vormerkungen (geringer gewichtet, wPending)
// Nur der zusammenhängende Zeitraum mit Daten zählt (von der ersten bis zur
// letzten Bewegung) — Null-Monate DAZWISCHEN bleiben drin, damit seltene
// (z. B. jährliche/quartalsweise) Kosten anteilig auf den Monat umgelegt werden.
//
//   getActual(y, m) → gebuchte Summe der Unterkategorie in dem Monat (Ist)
//   getPending(y, m) → vorgemerkte Summe der Unterkategorie in dem Monat
//
// Rückgabe: { amount, hasData, months, actualMonths, pendingMonths }

export function suggestBudget({
  nowY, nowM, getActual, getPending,
  lookback = 24, lookahead = 24, wActual = 2, wPending = 1,
} = {}) {
  const nowIdx = nowY * 12 + nowM;
  const ym = (idx) => [Math.floor(idx / 12), ((idx % 12) + 12) % 12];
  const valAt = (idx) => {
    const [y, m] = ym(idx);
    if (idx < nowIdx) return { v: getActual(y, m) || 0, w: wActual, past: true };
    // Aktueller Monat: gebucht ODER vorgemerkt (was schon da ist), künftig: vorgemerkt.
    if (idx === nowIdx) return { v: Math.max(getActual(y, m) || 0, getPending(y, m) || 0), w: wPending, past: false };
    return { v: getPending(y, m) || 0, w: wPending, past: false };
  };

  let firstData = null, lastData = null;
  for (let idx = nowIdx - lookback; idx <= nowIdx + lookahead; idx++) {
    if (valAt(idx).v > 0) { if (firstData == null) firstData = idx; lastData = idx; }
  }
  if (firstData == null) return { amount: 0, hasData: false, months: 0, actualMonths: 0, pendingMonths: 0 };

  // Liegt die letzte Bewegung in der Vergangenheit, das Fenster bis zum letzten
  // ABGESCHLOSSENEN Monat verlängern: die Null-Monate dazwischen legen seltene
  // (jährliche/quartalsweise) Kosten anteilig um. Reicht die Bewegung bis in die
  // Gegenwart/Zukunft (Vormerkungen), endet das Fenster an der letzten Bewegung —
  // so wird eine neue/aktuelle Kategorie nicht durch Alt-Nullen verwässert.
  const start = firstData;
  const end = lastData < nowIdx ? (nowIdx - 1) : lastData;

  let vSum = 0, wSum = 0, actualMonths = 0, pendingMonths = 0;
  const paymentIdxs = []; // Monate MIT Bewegung — für die Rhythmus-Erkennung
  for (let idx = start; idx <= end; idx++) {
    const { v, w, past } = valAt(idx);
    vSum += v * w; wSum += w;
    if (past) actualMonths++; else pendingMonths++;
    if (v > 0) paymentIdxs.push(idx);
  }
  const amount = wSum > 0 ? vSum / wSum : 0;

  // Zahlungs-Rhythmus aus den Abständen zwischen Monaten mit Bewegung ableiten
  // (z. B. Rundfunkbeitrag quartalsweise → Abstände 3 → interval 3). Median der
  // Abstände, auf den nächsten Standard-Rhythmus {1,3,6,12} gerundet. Bei nur
  // einer Bewegung bleibt es monatlich (zu wenig Info).
  let interval = 1;
  if (paymentIdxs.length >= 2) {
    const gaps = [];
    for (let i = 1; i < paymentIdxs.length; i++) gaps.push(paymentIdxs[i] - paymentIdxs[i - 1]);
    gaps.sort((a, b) => a - b);
    const medGap = gaps[Math.floor(gaps.length / 2)];
    interval = [1, 3, 6, 12].reduce(
      (best, c) => (Math.abs(c - medGap) < Math.abs(best - medGap) ? c : best), 1);
  }

  return {
    amount,                          // gewichteter MONATS-Schnitt (Rückwärtskompatibel)
    interval,                        // erkannter Rhythmus in Monaten (1|3|6|12)
    intervalAmount: amount * interval, // Betrag PRO Rhythmus-Periode (z. B. Quartalssumme)
    hasData: true,
    months: end - start + 1,
    actualMonths, pendingMonths,
  };
}
