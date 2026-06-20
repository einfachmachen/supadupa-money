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

// Händlername aus einer PayPal-CSV-Zeile (erste Beschreibungs-Komponente = "Name").
export function payPalMerchant(row) {
  return (row?.desc || "")
    .split(" · ")[0]
    .split(" – ")[0]
    .replace(/\{[^}]{0,300}\}/g, "")
    .trim();
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

// Bewertet ein Kandidatenpaar (PayPal-Zeile ↔ Giro-Buchung). Gibt null zurück,
// wenn es kein Kandidat ist (falscher Betrag, kein PayPal, außerhalb Fenster).
export function scoreMatch(row, giroTx, linkDays) {
  const absAmt = Math.abs(row.amount ?? row.totalAmount ?? 0);
  if (Math.round((giroTx.totalAmount || 0) * 100) !== Math.round(absAmt * 100)) return null;
  if (!isPayPalGiroTx(giroTx)) return null;
  const rDate = new Date(row.isoDate || row.date).getTime();
  const tDate = new Date(giroTx.date).getTime();
  const diffDays = Math.abs(tDate - rDate) / 86400000;
  if (diffDays > linkDays) return null;
  const merchantMatch = merchantMatchesGiro(payPalMerchant(row), giroTx.desc);
  // Händler-Treffer dominiert; sonst Nähe in Tagen. Lastschriften fallen
  // meist NACH der PayPal-Buchung an → leichte Bevorzugung tDate >= rDate.
  const dirBonus = tDate >= rDate ? 1 : 0;
  const score = (merchantMatch ? 1000 : 0) + (100 - Math.min(diffDays, 100)) + dirBonus;
  const confidence = merchantMatch ? "hoch" : diffDays <= 3 ? "mittel" : "niedrig";
  return { diffDays: Math.round(diffDays), merchantMatch, score, confidence };
}

// Ordnet PayPal-Zeilen den Giro-Buchungen zu.
//  - links: sichere 1:1-Auto-Verknüpfungen (für Import).
//  - suggestions: alle Kandidatenpaare (für die Vorschlagsansicht), bestes zuerst.
// Sicher (auto) ist ein Paar nur, wenn der Händlername passt ODER die Zuordnung
// eindeutig ist (genau ein Kandidat auf beiden Seiten). Mehrdeutige gleich-hohe
// Buchungen ohne Händler-Treffer werden NICHT automatisch verknüpft.
export function assignPayPalLinks(newRows, giroTxs, linkDays, opts = {}) {
  const excludeRows = opts.excludeRows || new Set();
  const excludeGiroIds = opts.excludeGiroIds || new Set();

  const pairs = [];
  newRows.forEach((r, rowIdx) => {
    if (excludeRows.has(rowIdx)) return;
    giroTxs.forEach(t => {
      if (excludeGiroIds.has(t.id)) return;
      const s = scoreMatch(r, t, linkDays);
      if (s) pairs.push({ rowIdx, giroTx: t, ...s });
    });
  });

  // Mehrdeutigkeit zählen (global, konservativ).
  const candByRow = {};
  const candByTx = {};
  pairs.forEach(p => {
    candByRow[p.rowIdx] = (candByRow[p.rowIdx] || 0) + 1;
    candByTx[p.giroTx.id] = (candByTx[p.giroTx.id] || 0) + 1;
  });

  // Gieriges 1:1 — bestes Paar zuerst.
  const sorted = [...pairs].sort((a, b) => b.score - a.score || a.diffDays - b.diffDays);
  const usedRows = new Set();
  const usedTx = new Set();
  const links = [];
  sorted.forEach(p => {
    if (usedRows.has(p.rowIdx) || usedTx.has(p.giroTx.id)) return;
    const unique = candByRow[p.rowIdx] === 1 && candByTx[p.giroTx.id] === 1;
    const safe = p.merchantMatch || unique;
    if (!safe) return; // mehrdeutig → nur Vorschlag, keine Auto-Verknüpfung
    usedRows.add(p.rowIdx);
    usedTx.add(p.giroTx.id);
    links.push(p);
  });

  return { links, suggestions: sorted };
}
