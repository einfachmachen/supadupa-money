// PDF-Kontoauszug-Import.
//
// Liest Buchungen aus PDF-Kontoauszügen. Aktuell unterstützt: Wirecard/N26
// („Number26“) Auszüge. Die Text-Extraktion (inkl. Schrift-/Umlaut-Dekodierung)
// übernimmt pdf.js; der Parser rekonstruiert Zeilen aus den Text-Positionen und
// liest pro Buchung Datum, Betrag (mit Vorzeichen) und Empfänger + Zweck.
//
// Ergebnis hat dieselbe Form wie utils/csv.js → parseCSV
// ({ rows:[{isoDate, amount, desc, fp}], format, detectedBalances }), damit die
// bestehende Import-Pipeline (Dedup, Kategorisierung, Anker) unverändert greift.

import { txFingerprint } from "./tx.js";
import { parseGermanAmount } from "./csv.js";

// pdf.js wird erst bei Bedarf geladen (großer Chunk).
let _pdfjs = null;
async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  const pdfjsLib = await import("pdfjs-dist");
  try {
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch (e) {
    // Ohne expliziten Worker nutzt pdf.js den Fallback (Hauptthread).
  }
  _pdfjs = pdfjsLib;
  return pdfjsLib;
}

// Extrahiert Textzeilen aus dem PDF — gruppiert Text-Fragmente je Seite nach
// y-Position (Zeile), sortiert nach x (Lesereihenfolge). Fußzeile (kleines y)
// wird ausgelassen, damit sich wiederholende Seitenfüße keine Buchung verfälschen.
async function extractPdfLines(arrayBuffer) {
  const pdfjsLib = await getPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const byRow = new Map();
    for (const it of content.items) {
      const str = it.str || "";
      if (!str.trim()) continue;
      const x = it.transform[4];
      const y = it.transform[5];
      if (y < 55) continue; // Fußzeile überspringen
      const key = Math.round(y / 2) * 2;
      if (!byRow.has(key)) byRow.set(key, []);
      byRow.get(key).push({ x, str });
    }
    const ys = [...byRow.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const row = byRow.get(y).sort((a, b) => a.x - b.x).map((r) => r.str).join(" ").replace(/\s+/g, " ").trim();
      if (row) lines.push(row);
    }
  }
  return lines;
}

const MONTHS = {
  Januar: 1, Februar: 2, "März": 3, Maerz: 3, April: 4, Mai: 5, Juni: 6,
  Juli: 7, August: 8, September: 9, Oktober: 10, November: 11, Dezember: 12,
};
const DAY_RE = /^(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),\s*(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)\s*(\d{4})/;
const AMT_RE = /^(-?[\d.]+,\d{2})\s*€$/;
// Schluss-/Hinweistext, ab dem keine Zweck-Zeilen mehr an eine Buchung gehängt werden.
const STOP_RE = /Zusammenfassung|Allgemeinen Geschäftsbedingungen|Anmerkung|Dein N26 Team|Einlagensicherung|Dein alter Kontostand|Dein neuer Kontostand/i;

function dedupParts(parts) {
  return parts.filter((p, i) =>
    !parts.slice(0, i).some((prev) =>
      prev.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(prev.toLowerCase())
    )
  );
}

// Parst die rekonstruierten Zeilen eines Wirecard/N26-Auszugs.
function parseWirecardLines(lines) {
  let curDate = null;
  let cur = null;
  const txs = [];
  const balances = [];
  for (const ln of lines) {
    const d = ln.match(DAY_RE);
    if (d) {
      const mm = MONTHS[d[2]];
      if (mm) {
        curDate = `${d[3]}-${String(mm).padStart(2, "0")}-${String(+d[1]).padStart(2, "0")}`;
        const bm = ln.match(/(-?[\d.]+,\d{2})\s*€\s*$/); // Tagessaldo am Zeilenende
        if (bm) balances.push({ date: curDate, saldo: parseGermanAmount(bm[1]) });
      }
      cur = null;
      continue;
    }
    const a = ln.match(AMT_RE);
    if (a) {
      cur = { date: curDate, amount: parseGermanAmount(a[1]), lines: [] };
      txs.push(cur);
      continue;
    }
    if (cur) {
      if (STOP_RE.test(ln)) cur = null; // Schlussblock erreicht → nichts mehr anhängen
      else cur.lines.push(ln);
    }
  }
  const rows = txs
    .filter((t) => t.date && t.amount !== 0 && t.lines.length)
    .map((t) => {
      const name = t.lines[0] || "";
      const rest = t.lines.slice(1).filter((l) => !/^IBAN:/i.test(l));
      const desc = (dedupParts([name, ...rest].filter(Boolean)).join(" · ") || "Unbekannt").slice(0, 200);
      return { isoDate: t.date, amount: t.amount, desc, fp: txFingerprint(t.date, t.amount, desc) };
    });
  const detectedBalances = balances.length ? [balances[balances.length - 1]] : [];
  return { rows, format: "Wirecard/N26-PDF", detectedBalances, skipped: [] };
}

// Liest ein PDF (ArrayBuffer) und gibt das parseCSV-kompatible Ergebnis zurück.
async function parsePdfStatement(arrayBuffer) {
  const lines = await extractPdfLines(arrayBuffer);
  const result = parseWirecardLines(lines);
  if (!result.rows.length) {
    throw new Error("Keine Buchungen erkannt. Wird dieses PDF-Format (Wirecard/N26) unterstützt?");
  }
  return result;
}

export { parsePdfStatement, parseWirecardLines, extractPdfLines };
