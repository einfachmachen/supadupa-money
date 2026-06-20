// PayPal ↔ Giro-Verknüpfung — robustes Matching mit eindeutigen Merkmalen.
//
// Hintergrund: PayPal-Zahlungen belasten das Girokonto per SEPA-Lastschrift.
// Auf dem Kontoauszug erscheint dann eine Buchung an "PayPal Europe …" mit
// dem Verwendungszweck ". Ihr Einkauf bei {Händler}". Ziel: jede konkrete
// PayPal-Buchung (aus dem PayPal-CSV) der passenden Giro-Belastung zuordnen –
// ohne wilde Fehlverknüpfungen.
//
// Eindeutige Merkmale (statt nur Betrag+Datum):
//  1. Gläubiger-ID: PayPals SEPA-Creditor-ID in DE ist fix → 100 % PayPal.
//  2. Empfänger/Text enthält "paypal" → PayPal-Lastschrift.
//  3. Händlername aus dem PayPal-CSV taucht wörtlich im Giro-Verwendungszweck
//     auf ("Ihr Einkauf bei {Händler}") → unterscheidet gleich-hohe Buchungen.

// PayPal (Europe) S.à r.l. et Cie, S.C.A. — feste Gläubiger-ID in Deutschland.
export const PAYPAL_CREDITOR_ID = "LU96ZZZ0000000000000000058";

const normCreditor = s => (s || "").replace(/\s+/g, "").toUpperCase();

// Generische Wörter, die NICHT als Händlername zählen (PayPal-Boilerplate,
// Rechtsformen, Verwendungszweck-Floskeln).
const STOP = new Set([
  "paypal", "europe", "sarl", "cie", "sca", "scrl", "luxembourg",
  "gmbh", "ag", "kg", "ohg", "ltd", "inc", "limited", "co", "company",
  "ihr", "einkauf", "bei", "ein", "kauf", "der", "die", "das", "und",
  "com", "www", "http", "https", "payment", "zahlung", "ref", "kd",
  "mandat", "mandatsref", "glaeubiger", "verwendungszweck",
  // Finanzblick-PayPal-Floskeln (Status / Gegenbuchungen), kein Händlername:
  "successful", "pending", "completed", "rechnungs", "nr", "rechnungsnr",
  "sonstige", "einnahmen", "abbuchung", "konto", "service", "services",
]);

const norm = s =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = s => norm(s).split(" ").filter(t => t.length >= 3 && !STOP.has(t));

// Ist die Giro-Buchung eine PayPal-Lastschrift?
export function isPayPalGiroTx(tx) {
  if (tx && tx._creditorId && normCreditor(tx._creditorId) === PAYPAL_CREDITOR_ID) return true;
  const d = (tx?.desc || "").toLowerCase();
  return d.includes("paypal") || /\bpp\.\s*\d/.test(d) || /\bpp\.\b/.test(d);
}

// Händlername aus einer PayPal-CSV-Zeile. Bevorzugt einen angereicherten Namen
// (aus der zugehörigen Kaufzeile bei „PayPal +30", siehe enrichPayPalMerchants),
// dann das separate Empfänger-Feld (_recipient), sonst die erste
// Beschreibungs-Komponente.
export function payPalMerchant(row) {
  if (row?._enrichedMerchant) return row._enrichedMerchant;
  const raw = (row?._recipient || (row?.desc || "").split(" · ")[0]);
  return raw
    .split(" – ")[0]
    .replace(/\{[^}]{0,300}\}/g, "")
    .trim();
}

// „PayPal Bezahlen nach 30 Tagen": Finanzblick legt zwei Ausgaben-Zeilen an —
// den Kauf (mit echtem Händler) und ~30 Tage später die Abbuchung über
// „PayPal (Europe) …" OHNE Händler. Diese Funktion reichert solche händlerlosen
// Abbuchungen mit dem Händler der passenden Kaufzeile an (gleicher Betrag,
// 24–40 Tage früher, eindeutiger Händler). Gibt eine neue Zeilen-Liste zurück
// (Reihenfolge/Länge unverändert → Indizes bleiben gültig).
export function enrichPayPalMerchants(rows) {
  const generic = m => tokens(m).length === 0; // nur Floskeln/Rechtsform → kein echter Händler
  const meta = rows.map(r => ({
    amt: Math.round(Math.abs(r.amount ?? r.totalAmount ?? 0) * 100),
    date: new Date(r.isoDate || r.date).getTime(),
    merchant: payPalMerchant(r),
    expense: r.amount == null || r.amount < 0,
  }));
  const enriched = new Array(rows.length).fill(null);
  const isPurchaseLeg = new Array(rows.length).fill(false);
  rows.forEach((r, i) => {
    const cur = meta[i];
    if (!cur.expense || !generic(cur.merchant)) return;
    const sources = meta
      .map((o, j) => ({ o, j }))
      .filter(({ o, j }) =>
        j !== i && o.expense && o.amt === cur.amt && !generic(o.merchant) &&
        (cur.date - o.date) / 86400000 >= 24 && (cur.date - o.date) / 86400000 <= 40);
    if (!sources.length) return;
    const names = [...new Set(sources.map(s => s.o.merchant))];
    if (names.length !== 1) return; // mehrdeutig → nicht anreichern
    enriched[i] = names[0];
    // Kauf-Leg(s) markieren: ihre Belastung läuft über DIESE Abbuchung, sie
    // haben keine eigene Giro-Buchung → vom Giro-Matching ausschließen.
    sources.forEach(({ j }) => { isPurchaseLeg[j] = true; });
  });
  return rows.map((r, i) => {
    let out = r;
    if (enriched[i]) out = { ...out, _enrichedMerchant: enriched[i], _enrichedPlus30: true };
    if (isPurchaseLeg[i]) out = { ...out, _plus30Purchase: true };
    return out;
  });
}

// Steckt der Händlername im Giro-Verwendungszweck? Token-basiert, damit
// "REWE SAGT DANKE" ↔ "Rewe" trotzdem greift, aber Floskeln nicht fälschlich
// matchen. Match, wenn ein signifikantes Händler-Token (≥4 Zeichen Teilstring,
// oder exaktes Token ≥3) im Giro-Text vorkommt.
export function merchantMatchesGiro(merchant, giroDesc) {
  const gNorm = norm(giroDesc);
  if (!gNorm) return false;
  const gToks = new Set(tokens(giroDesc));
  const mToks = tokens(merchant);
  if (!mToks.length) return false;
  return mToks.some(t => (t.length >= 4 && gNorm.includes(t)) || gToks.has(t));
}

// Erwartete zeitliche Lage der Giro-Lastschrift relativ zur PayPal-Buchung.
//  - "sofort": Standard — Giro wird wenige Tage nach der PayPal-Buchung belastet.
//  - "plus30": „PayPal Bezahlen nach 30 Tagen" — Belastung ~30 Tage später.
//  - "unklar": dazwischen / weiter weg → bei wiederkehrenden Beträgen meist der
//    falsche Monat.
// signedDays = Giro-Datum − PayPal-Datum (positiv = Giro später, der Normalfall).
export const TIMING = { SOFORT_MIN: -2, SOFORT_MAX: 9, PLUS30_MIN: 24, PLUS30_MAX: 38 };
export function timingTier(signedDays) {
  if (signedDays >= TIMING.SOFORT_MIN && signedDays <= TIMING.SOFORT_MAX) return "sofort";
  if (signedDays >= TIMING.PLUS30_MIN && signedDays <= TIMING.PLUS30_MAX) return "plus30";
  return "unklar";
}

// Bewertet ein Kandidatenpaar (PayPal-Zeile ↔ Giro-Buchung). Gibt null zurück,
// wenn es kein Kandidat ist (falscher Betrag, kein PayPal, außerhalb Fenster).
export function scoreMatch(row, giroTx, linkDays) {
  // Nur Ausgaben paaren: PayPal-Lastschriften belasten das Girokonto. Die
  // positiven „Sonstige Einnahmen"-Gegenbuchungen der Finanzblick-PayPal-CSV
  // (Guthaben-Finanzierung jeder Zahlung) sind kein Lastschrift-Pendant.
  if (row.amount != null && row.amount >= 0) return null;
  if (giroTx._csvType === "income") return null;
  const absAmt = Math.abs(row.amount ?? row.totalAmount ?? 0);
  if (Math.round((giroTx.totalAmount || 0) * 100) !== Math.round(absAmt * 100)) return null;
  if (!isPayPalGiroTx(giroTx)) return null;
  const rDate = new Date(row.isoDate || row.date).getTime();
  const tDate = new Date(giroTx.date).getTime();
  const signedDays = Math.round((tDate - rDate) / 86400000);
  const diffDays = Math.abs(signedDays);
  if (diffDays > linkDays) return null;
  const merchantMatch = merchantMatchesGiro(payPalMerchant(row), giroTx.desc);
  const tier = timingTier(signedDays);
  // Score nur als Sortier-Fallback; maßgeblich ist die Konfidenz unten.
  const tierBonus = tier === "sofort" ? 200 : tier === "plus30" ? 80 : 0;
  const score = (merchantMatch ? 1000 : 0) + tierBonus + (50 - Math.min(diffDays, 50));
  // Eigenständige (paarweise) Konfidenz — die kontextbewusste Endeinstufung
  // erfolgt in assignPayPalLinks (berücksichtigt nähere Treffer derselben Zeile).
  const confidence = merchantMatch && tier !== "unklar" ? "hoch"
    : merchantMatch ? "niedrig"
    : tier === "sofort" ? "mittel" : "niedrig";
  return { diffDays, signedDays, tier, merchantMatch, score, confidence };
}

// Ordnet PayPal-Zeilen den Giro-Buchungen zu.
//  - links: sichere 1:1-Auto-Verknüpfungen (für Import).
//  - suggestions: alle Kandidatenpaare (für die Vorschlagsansicht), bestes zuerst.
// Reihenfolge der Sicherheit: Händlername + „sofort"-Timing ist am stärksten.
// Gibt es für eine PayPal-Buchung einen näheren „sofort"-Treffer, werden ihre
// weiter entfernten Kandidaten (z.B. der Folgemonat eines Abos) abgewertet.
export function assignPayPalLinks(newRows, giroTxs, linkDays, opts = {}) {
  const excludeRows = opts.excludeRows || new Set();
  const excludeGiroIds = opts.excludeGiroIds || new Set();

  const pairs = [];
  newRows.forEach((r, rowIdx) => {
    if (excludeRows.has(rowIdx)) return;
    // „PayPal +30"-Kaufzeile: keine eigene Giro-Belastung (läuft über die
    // ~30 Tage spätere Abbuchung) → nicht matchen.
    if (r._plus30Purchase) return;
    giroTxs.forEach(t => {
      if (excludeGiroIds.has(t.id)) return;
      const s = scoreMatch(r, t, linkDays);
      if (s) pairs.push({ rowIdx, giroTx: t, ...s });
    });
  });

  // Mehrdeutigkeit + „gibt es einen sofort-Treffer für diese Zeile?" zählen.
  const candByRow = {};
  const candByTx = {};
  const rowHasSofort = {};
  pairs.forEach(p => {
    candByRow[p.rowIdx] = (candByRow[p.rowIdx] || 0) + 1;
    candByTx[p.giroTx.id] = (candByTx[p.giroTx.id] || 0) + 1;
    if (p.tier === "sofort") rowHasSofort[p.rowIdx] = true;
  });

  // Kontextbewusste Konfidenz + verständlicher Grund je Paar.
  pairs.forEach(p => {
    const unique = candByRow[p.rowIdx] === 1 && candByTx[p.giroTx.id] === 1;
    // Redundant: für dieselbe PayPal-Buchung existiert ein näherer „sofort"-Treffer.
    p.redundant = p.tier !== "sofort" && !!rowHasSofort[p.rowIdx];
    if (p.redundant) {
      p.confidence = "niedrig";
      p.reason = "näherer Treffer vorhanden – Belastung folgt normal in Tagen";
    } else if (p.merchantMatch && p.tier === "sofort") {
      p.confidence = "hoch";
      p.reason = p.diffDays <= 1 ? "Händler + Belastung ~sofort" : `Händler + Belastung ${p.diffDays} Tage später`;
    } else if (p.merchantMatch && p.tier === "plus30") {
      p.confidence = "mittel";
      p.reason = `Händler, Belastung ${p.diffDays} Tage später (evtl. PayPal +30)`;
    } else if (p.merchantMatch) {
      p.confidence = "niedrig";
      p.reason = `Händler stimmt, Zeitabstand untypisch (${p.diffDays} Tage)`;
    } else if (p.tier === "sofort" && unique) {
      p.confidence = "mittel";
      p.reason = "Betrag eindeutig, Belastung wenige Tage später";
    } else if (p.tier === "sofort") {
      p.confidence = "niedrig";
      p.reason = "nur Betrag – mehrere gleich hohe Buchungen";
    } else if (p.tier === "plus30") {
      p.confidence = "niedrig";
      p.reason = `nur Betrag, ${p.diffDays} Tage später`;
    } else {
      p.confidence = "niedrig";
      p.reason = `schwacher Treffer (${p.diffDays} Tage)`;
    }
    // Auto-verknüpft wird nur, was wirklich sicher ist.
    p.autoLinkable =
      p.confidence === "hoch" ||
      (p.confidence === "mittel" && p.tier === "sofort" && unique) ||
      (p.confidence === "mittel" && p.tier === "plus30" && unique);
  });

  // Saubere 1:1-Zuordnung als Vorschlagsliste: jede PayPal-Buchung und jede
  // Giro-Buchung höchstens einmal, stärkste Konfidenz zuerst, dann zeitlich am
  // nächsten. links = die automatisch sicheren Treffer daraus.
  const rank = c => (c === "hoch" ? 3 : c === "mittel" ? 2 : 1);
  const ranked = pairs
    .filter(p => !p.redundant)
    .sort((a, b) => rank(b.confidence) - rank(a.confidence) || a.diffDays - b.diffDays || b.score - a.score);
  const usedRows = new Set();
  const usedTx = new Set();
  const suggestions = [];
  const links = [];
  ranked.forEach(p => {
    if (usedRows.has(p.rowIdx) || usedTx.has(p.giroTx.id)) return;
    usedRows.add(p.rowIdx);
    usedTx.add(p.giroTx.id);
    suggestions.push(p);
    if (p.autoLinkable) links.push(p);
  });

  return { links, suggestions };
}
