// Auto-generated module (siehe app-src.jsx)

import { theme as T } from "../theme/activeTheme.js";

function extractVendor(desc) {
  return (desc||"").replace(/\{[^}]{0,300}\}/g,"").trim()
    .split("·")[0].split("–")[0].split(" · ")[0].trim().toLowerCase().slice(0,40);
}

// Hilfsfunktion: Top-Kategorien für einen Händler aus Buchungshistorie

function getVendorSuggestions(vendor, txs, cats, getSub, getCat, limit=3) {
  if(!vendor || vendor.length < 2) return [];
  const counts = {};
  txs.forEach(t => {
    if(t.pending) return;
    const tVendor = extractVendor(t.desc);
    if(!tVendor.includes(vendor) && !vendor.includes(tVendor)) return;
    (t.splits||[]).forEach(sp => {
      if(!sp.catId) return;
      const key = sp.catId + "|" + (sp.subId||"");
      counts[key] = (counts[key]||0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const [catId, subId] = key.split("|");
      const cat = getCat(catId);
      const sub = getSub(catId, subId);
      return {catId, subId, count, catName: cat?.name||"?", subName: sub?.name||"", color: cat?.color||T.blue, icon: cat?.icon||"tag"};
    });
}

function txFingerprint(date, amount, desc, accountId) {
  const base = `${date}|${Math.round(Math.abs(parseFloat(amount||0)*100))}|${(desc||"").trim().toLowerCase().slice(0,80)}`;
  return accountId ? `${base}|${accountId}` : base;
}

// Normalisiert eine Description für formatübergreifende Duplikatserkennung.
// Hintergrund: Finanzblick und DKB-Original-Exporte schreiben dieselbe Buchung
// unterschiedlich:
//   - Umlaute: FB schreibt "ue/oe/ae/ss", DKB behält "ü/ö/ä/ß"
//   - DATUM/UHR-Suffix: FB hängt "DATUM dd.mm.yyyy, HH.MM UHR" an, DKB nicht
//   - Buchungstext: FB packt zusätzlich den Banktext (ONLINE-UEBERWEISUNG,
//     GUTSCHRIFT UEBERWEISUNG, LASTSCHRIFT etc.) als eigenen Teil dazwischen
//     mit " · " als Trenner — DKB lässt das weg.
// Damit ein DKB-Import bereits importierte Finanzblick-Buchungen als Duplikate
// erkennt (und umgekehrt), vergleichen wir zusätzlich auf normalisierter Basis.
//
// Wichtig: Der gespeicherte _fp einer Buchung ändert sich dadurch NICHT — die
// Normalisierung ist nur eine zusätzliche Vergleichsstrategie beim Import.
function normalizeDesc(desc) {
  if(!desc) return "";
  let s = String(desc).toLowerCase();
  // Umlaute und ß auflösen (Finanzblick wandelt sie um, DKB nicht)
  s = s.replace(/ü/g,"ue").replace(/ö/g,"oe").replace(/ä/g,"ae").replace(/ß/g,"ss");
  // Finanzblick hängt oft "  DATUM 28.02.2024, 14.30 UHR" o.ä. an — entfernen
  s = s.replace(/\s+datum\s+\d{2}\.\d{2}\.\d{4}[^]*$/i, "");
  // Bank-Buchungstexte als Stoppwörter rausnehmen (FB packt sie als " · TEXT · "
  // zwischen Empfänger und VZ; DKB-Original hat sie nicht). Wir entfernen den
  // ganzen "· TEXT ·"-Teil, wenn TEXT eine bekannte Bank-Klassifizierung ist.
  const bankTexts = [
    "online-ueberweisung",
    "online-überweisung",
    "gutschrift ueberweisung",
    "gutschrift überweisung",
    "gutschrift ueberweisung dauerauftrag",
    "gutschrift überweisung dauerauftrag",
    "ueberweisung",
    "überweisung",
    "dauerauftrag",
    "lastschrift",
    "kartenzahlung",
    "kartenumsatz",
    "kartenzahlung/-abrechnung",
    "visa debitkartenumsatz",
    "abschluss",
  ];
  for(const bt of bankTexts) {
    // " · banktext · " → " · " (entferne nur, wenn von ·-Trennern umgeben)
    const re = new RegExp("\\s*·\\s*" + bt.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "(?=\\s*·)", "gi");
    s = s.replace(re, "");
    // Auch am Anfang: "banktext · ..." → "..."
    const reStart = new RegExp("^" + bt.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\s*·\\s*", "i");
    s = s.replace(reStart, "");
  }
  // Mehrfache Whitespaces auf einzelne reduzieren
  s = s.replace(/\s+/g, " ").trim();
  // Mehrfache "·" zusammenfassen, falls durch Removal entstanden
  s = s.replace(/·\s*·/g, "·").replace(/\s+·/g, " ·").replace(/·\s+/g, "· ");
  return s.slice(0, 80);
}

function txFingerprintNorm(date, amount, desc, accountId) {
  const base = `${date}|${Math.round(Math.abs(parseFloat(amount||0)*100))}|${normalizeDesc(desc)}`;
  return accountId ? `${base}|${accountId}` : base;
}

// Linked-Transaction-Helpers — zentral, damit alle Saldo-Berechnungen konsistent sind.
//
// `_linkedTo` markiert zwei Sorten von Verknüpfungen:
//
//   1. CSV-Verknüpfung (Vormerkung ↔ echte Bank-Buchung):
//      Eine echte Buchung wird mit der ursprünglich geplanten Vormerkung
//      verknüpft. Beide Buchungen liegen auf DEMSELBEN Konto und stellen
//      dieselbe Geldbewegung dar → für die Saldoberechnung wäre Doppelzählung.
//
//   2. Konten-Transfer / Sparen-Umbuchung (z.B. Giro → Tagesgeld):
//      Zwei separate Buchungen für eine logische Bewegung — einmal Abgang
//      vom Quellkonto, einmal Eingang aufs Zielkonto. KEINE Doppelzählung im
//      Gesamt-Saldo (da die Summe aller Konten gleich bleibt) und in der
//      konto-spezifischen Ansicht SOLL der Eingang sichtbar sein.
//
// Unterscheidung: bei einem Konten-Transfer ist die `accountId` der beiden
// verknüpften Buchungen UNTERSCHIEDLICH. Bei CSV-Verknüpfung gleich.
//
// Diese Funktionen brauchen Zugriff auf die gesamte Tx-Liste, um den
// _linkedTo-Partner zu finden. Wir nutzen daher ein Map als Optimierung.
//
// Bug-Historie: vorherige Versionen erkannten Sparen-Transfers über
// `desc.startsWith("Sparen·")`, was zu eng war — viele Transfer-Beschreibungen
// fangen anders an (z.B. "Tagesgeld-Sparen Unterhalt Matteo").

function _isLinkPartnerOnSameAcc(t, txsById) {
  if(!t._linkedTo) return false;
  const partner = txsById ? txsById.get(t._linkedTo) : null;
  if(!partner) return true; // im Zweifel: gleiche Konto-Annahme (CSV-Verknüpfung)
  // Beide Buchungen haben accountId — wenn unterschiedlich → Transfer
  // accountId kann null/undefined sein → fällt auf "acc-giro" (Default-Konto)
  const accA = t.accountId || "acc-giro";
  const accB = partner.accountId || "acc-giro";
  return accA === accB;
}

// Index-Helper: erstellt eine Map(id → tx) für schnelle Partner-Lookup
function buildTxIdMap(txs) {
  const m = new Map();
  (txs||[]).forEach(t => { if(t.id) m.set(t.id, t); });
  return m;
}

function isSparTransfer(t, txsById) {
  if(!t._linkedTo) return false;
  // Wenn kein Partner-Index gegeben: Fallback auf alte Description-Erkennung
  if(!txsById) return (t.desc||"").startsWith("Sparen·");
  return !_isLinkPartnerOnSameAcc(t, txsById);
}

function isDuplCounterpart(t, txsById) {
  if(!t._linkedTo) return false;
  // Symmetrisch zu isSparTransfer: ohne Index nutzen wir Description als Heuristik.
  // Eine _linkedTo-Tx ist entweder Sparen-Transfer (kein Dupl) oder CSV-Verknüpfung (Dupl).
  if(!txsById) return !(t.desc||"").startsWith("Sparen·");
  return _isLinkPartnerOnSameAcc(t, txsById);
}

export { extractVendor, getVendorSuggestions, txFingerprint, txFingerprintNorm, normalizeDesc, isSparTransfer, isDuplCounterpart, buildTxIdMap };
