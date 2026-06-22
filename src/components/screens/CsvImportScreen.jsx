// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { AnchorSection } from "../organisms/AnchorSection.jsx";
import { QuickPicker } from "../organisms/QuickPicker.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, isLightTheme } from "../../theme/activeTheme.js";
import { parseCSV } from "../../utils/csv.js";
import { assignPayPalLinks, enrichPayPalMerchants, looksLikePayPalCsv, dropPayPalCounterBookings, detectPayPalRefunds, reconcilePayPalLegs } from "../../utils/paypalMatch.js";
import { AccountChips } from "../molecules/AccountChips.jsx";
import { parsePdfStatement } from "../../utils/pdfStatement.js";
import { anchorFromDetectedBalance, makeAnchorEntry } from "../../utils/anchors.js";
import { fmt, pn, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { matchAmount, matchSearch } from "../../utils/search.js";
import { txFingerprint, txFingerprintNorm } from "../../utils/tx.js";

function CsvImportScreen({onClose, onBack, embedded=false, mobileMode=false}) {
  const { cats, groups, txs, setTxs, accounts, csvRules, setCsvRules, startBalances, setStartBalances, setMasterOverride } = useContext(AppCtx);
  const MFS = mobileMode ? 22 : 13; // mobile font size base
  const MFSl = mobileMode ? 18 : 11; // mobile font size small
  const MPad = mobileMode ? "14px 16px" : "8px 12px"; // mobile padding
  const S = {fs:26, pad:10, padL:14, radius:16, gap:14}; // für mobile Konto-Kacheln
  const [csvText, setCsvText]       = useState("");
  const [csvSources, setCsvSources] = useState([]); // Dateinamen der importierten CSVs
  const [pdfBusy, setPdfBusy]       = useState(false); // PDF wird gerade gelesen
  const [pdfError, setPdfError]     = useState("");
  const [parsed,  setParsed]        = useState(null);
  const [rules,   setRules]         = useState(()=>({...(csvRules||{})})); // initialisiert aus globalen Regeln
  const [assign,  setAssign]        = useState({});
  const [step,    setStep]          = useState("input");
  const [search,  setSearch]        = useState("");
  const [bulkCat, setBulkCat]       = useState({catId:"",subId:""});
  const [doneCount, setDoneCount]   = useState(0);
  const [showCatAssign, setShowCatAssign] = useState(false);
  const [selAccId, setSelAccId]     = useState(""); // Zielkonto für Import
  // Sobald Konten aus IndexedDB geladen sind, erstes Konto vorauswählen (falls noch nichts gewählt)
  useEffect(()=>{
    if(!selAccId && accounts.length>0) setSelAccId(accounts[0].id);
  }, [accounts]);
  // Wenn der User während der Review-Phase das Konto wechselt: Rows neu auflösen + Kategorien neu zuweisen
  // (nutzt Ref-basiert um Endlosschleife zu vermeiden — wir wollen nur reagieren auf manuellen Konto-Wechsel)
  const _prevSelAccIdRef = React.useRef(selAccId);
  useEffect(()=>{
    if(_prevSelAccIdRef.current === selAccId) return;
    _prevSelAccIdRef.current = selAccId;
    if(step !== "review" || !parsed) return;
    // Nur Rows aktualisieren bei denen kein _konto-String aus der CSV ein anderes Konto bestimmt
    const updatedRows = parsed.rows.map(r => {
      // Wenn die Row durch _konto-Match ein anderes Konto hat, NICHT überschreiben
      if(r._konto) {
        const kLow = r._konto.toLowerCase();
        const matched = accounts.find(a =>
          a.name.toLowerCase().includes(kLow) ||
          kLow.includes(a.name.toLowerCase()) ||
          a.id === r._konto
        );
        if(matched) return r; // belassen
      }
      // Sonst auf neues selAccId setzen
      const newAccId = selAccId || accounts[0]?.id;
      return {...r, _resolvedAccId: newAccId,
        fp: txFingerprint(r.isoDate, r.amount, r.desc, newAccId)};
    });
    // Volle Verarbeitung erneut (Anreicherung, Gegenbuchungs-Filter) UND
    // Vorschläge neu berechnen — sonst stimmen Einnahmen/Vorschläge nicht mehr.
    const { newRows, dupRows, droppedCounter } = buildRows(parsed.format, updatedRows);
    setParsed(p => ({...p, rows: updatedRows, newRows, dupRows, droppedCounter,
      autoSuggestions: computeAutoSuggestions(newRows)}));
    // Kategorien neu zuweisen (Auto-Regeln berücksichtigen jetzt das neue Konto)
    setAssign(autoAssign(newRows));
  }, [selAccId, step]);
  const [anchorWarning, setAnchorWarning] = useState(null); // {firstMonth, firstYear} wenn Vormonat-Ankerpunkt fehlt

  // Alle bekannten Fingerprints aus vorhandenen Buchungen
  // Doppelt: exakter Fingerprint UND normalisierter Fingerprint (Umlaute, DATUM-Suffix
  // weggestrippt). Letzteres erkennt Dup zwischen Finanzblick- und DKB-Original-CSVs.
  const knownFps = useMemo(()=>{
    const s = new Set();
    txs.forEach(t => {
      // Gespeicherter Fingerprint (alt oder neu)
      if(t._fp) s.add(t._fp);
      // Immer beide Varianten — schützt vor Reimport alter und neuer CSVs
      const abs = Math.abs(t.totalAmount);
      s.add(txFingerprint(t.date, t.totalAmount, t.desc));
      s.add(txFingerprint(t.date, abs,           t.desc));
      // Normalisierte Variante (formatübergreifend)
      s.add(txFingerprintNorm(t.date, t.totalAmount, t.desc));
      s.add(txFingerprintNorm(t.date, abs,           t.desc));
      if(t.accountId) {
        s.add(txFingerprint(t.date, t.totalAmount, t.desc, t.accountId));
        s.add(txFingerprint(t.date, abs,           t.desc, t.accountId));
        s.add(txFingerprintNorm(t.date, t.totalAmount, t.desc, t.accountId));
        s.add(txFingerprintNorm(t.date, abs,           t.desc, t.accountId));
      }
    });
    return s;
  }, [txs]);

  // Auto-Zuweisung via gespeicherte Regeln
  const autoAssign = (rows) => {
    const a = {};
    rows.forEach((r,i) => {
      const rowAccId = r._resolvedAccId || selAccId || accounts[0]?.id;
      const rowAcc = accounts.find(a=>a.id===rowAccId);

      // Prüft ob eine Kategorie zum Konto der Row passt
      const catMatchesAcc = (catId) => {
        if(!catId) return true;
        const cat = cats.find(c=>c.id===catId);
        if(!cat) return true;
        const grp = groups.find(g=>g.type===cat.type);
        const beh = grp?.behavior || cat.type;
        const isTgCat = beh==="tagesgeld" || cat.type==="tagesgeld";
        const isTgAcc = rowAcc?.name?.toLowerCase().includes("tagesgeld") || rowAccId?.includes("tagesgeld");
        // Tagesgeld-Kategorien nur für Tagesgeld-Konto, und umgekehrt
        if(isTgCat && !isTgAcc) return false;
        if(!isTgCat && isTgAcc && (beh==="income"||beh==="expense")) return false;
        return true;
      };

      // 1. Exakt per Fingerprint
      if(rules[r.fp] && catMatchesAcc(rules[r.fp].catId)) { a[i] = rules[r.fp]; return; }
      const descLower = r.desc.toLowerCase();
      // 2. Exakter Name-Match
      const name = r.desc.split(" – ")[0].toLowerCase().trim();
      const exactKey = Object.keys(rules).find(k=>k.startsWith("name:"+name));
      if(exactKey && catMatchesAcc(rules[exactKey].catId)) { a[i] = rules[exactKey]; return; }
      // 3. Teilübereinstimmung — Regelname in Beschreibung enthalten
      const partialKey = Object.keys(rules).find(k=>{
        if(!k.startsWith("name:")) return false;
        const ruleName = k.slice(5);
        return ruleName.length>3 && descLower.includes(ruleName);
      });
      if(partialKey && catMatchesAcc(rules[partialKey].catId)) { a[i] = rules[partialKey]; return; }
      a[i] = {catId:"", subId:""};
    });
    return a;
  };

  const [linkToGiro, setLinkToGiro] = useState(false);
  const [linkDays, setLinkDays] = useState(35);
  const [autoGroup, setAutoGroup] = useState(false); // Automatisches Zusammenfassen

  const [showAutoSugg, setShowAutoSugg] = useState(false);
  // Vollbild-Modus für das Vorschlags-Panel: blendet Konto-Kacheln + unsortierte
  // Liste aus, damit die Verknüpfungsvorschläge die ganze Höhe nutzen können.
  const [autoSuggFull, setAutoSuggFull] = useState(false);
  // Suchfeld im Vorschlags-Panel (Händler, Betrag, Datum, Giro-Text).
  const [suggSearch, setSuggSearch] = useState("");
  // Filter-Chips: Typ ("" | "ausgaben" | "einnahmen") und Konfidenz
  // ("" | "hoch" | "mittel" | "niedrig"). "" = nicht gesetzt (kein „alle"-Chip nötig).
  const [suggType, setSuggType] = useState("");
  const [suggConf, setSuggConf] = useState("");
  // Nur „vollbild", wenn das Panel auch sichtbar ist — sonst leerer Screen.
  const suggFull = showAutoSugg && autoSuggFull;

  // ── Sammel-Übernehmen der Verknüpfungsvorschläge ───────────────────────────
  // Übernimmt in einem Rutsch die beste 1:1-Zuordnung je Konfidenzstufe.
  // Vorschläge sind bereits „bestes zuerst" sortiert; greedy hält 1:1 ein.
  const acceptBulk = (levels) => {
    const sugg = parsed?.autoSuggestions || [];
    const usedRows = new Set(), usedGiro = new Set();
    (parsed?.acceptedSuggs||[]).forEach(a=>{usedRows.add(a.rowIdx);usedGiro.add(a.giroId);});
    const add = [];
    sugg.forEach(s=>{
      if(!levels.includes(s.confidence)) return;
      if(usedRows.has(s.rowIdx)||usedGiro.has(s.giroTx.id)) return;
      usedRows.add(s.rowIdx); usedGiro.add(s.giroTx.id);
      add.push({rowIdx:s.rowIdx, giroId:s.giroTx.id});
    });
    if(add.length) setParsed(p=>({...p, acceptedSuggs:[...(p.acceptedSuggs||[]), ...add]}));
  };
  const clearAccepted = () => setParsed(p=>({...p, acceptedSuggs:[]}));
  // Wie viele Vorschläge wären je Stufe noch übernehmbar (nach 1:1, ohne bereits
  // akzeptierte)? hoch zuerst belegen, dann mittel.
  const bulkCounts = (()=>{
    const sugg = parsed?.autoSuggestions || [];
    const usedRows = new Set(), usedGiro = new Set();
    (parsed?.acceptedSuggs||[]).forEach(a=>{usedRows.add(a.rowIdx);usedGiro.add(a.giroId);});
    const take = lvl => {
      let n=0;
      sugg.forEach(s=>{
        if(s.confidence!==lvl) return;
        if(usedRows.has(s.rowIdx)||usedGiro.has(s.giroTx.id)) return;
        usedRows.add(s.rowIdx); usedGiro.add(s.giroTx.id); n++;
      });
      return n;
    };
    const hoch = take("hoch");
    const mittel = take("mittel");
    return {hoch, mittel};
  })();
  const acceptedCount = (parsed?.acceptedSuggs||[]).length;
  // Einnahmen/Ausgaben-Übersicht für die Summenzeile. Bei PayPal sind die
  // positiven „Sonstige Einnahmen" ohne Empfänger interne Gegenbuchungen
  // (Finanzierung jeder Zahlung) — keine echten Einnahmen.
  const flowStats = (()=>{
    const rows = parsed?.newRows || [];
    let income=0, expense=0, counter=0;
    rows.forEach(r=>{
      const amt = r.amount ?? r.totalAmount ?? 0;
      if(amt<0){ expense++; return; }
      if(amt>0){ if(r._recipient) income++; else counter++; }
    });
    return {income, expense, counter};
  })();
  // Gefilterte Vorschläge (Ausgaben↔Giro). „einnahmen" wird separat behandelt,
  // weil Einnahmen keine Giro-Belastung haben (siehe incomeShown).
  const suggAmt = s => (parsed?.newRows?.[s.rowIdx]?.amount ?? parsed?.newRows?.[s.rowIdx]?.totalAmount ?? 0);
  const dshort = iso => { const p=String(iso||"").split("-"); return p.length===3?`${p[2]}.${p[1]}.${p[0].slice(2)}`:iso||""; };
  const matchSuggText = (s, q) => {
    const r = parsed.newRows[s.rowIdx] || {};
    const hay = [r.desc, r._enrichedMerchant, r._recipient, r.isoDate, s.giroTx?.desc,
      s.giroTx?.date, String(Math.abs(r.amount ?? r.totalAmount ?? 0)).replace(".",","),
      String(s.giroTx?.totalAmount ?? "").replace(".",",")].join(" ").toLowerCase();
    return hay.includes(q);
  };
  const showIncome = suggType==="einnahmen";
  // Filter-Logik: ohne Auswahl (suggType==="") werden BEIDE Listen gezeigt.
  const showExpenses   = suggType!=="einnahmen"; // "" oder "ausgaben"
  const showIncomeList = suggType!=="ausgaben";  // "" oder "einnahmen"
  const showBoth       = suggType==="";
  const shownSuggs = (()=>{
    const all = parsed?.autoSuggestions || [];
    const q = suggSearch.trim().toLowerCase();
    return all.filter(s=>{
      if(suggAmt(s) > 0) return false; // Einnahmen-Matches → eigene „Einnahmen"-Ansicht
      if(suggConf && s.confidence!==suggConf) return false;
      if(!q) return true;
      return matchSuggText(s, q);
    });
  })();
  // Vorschlag je PayPal-Zeile (für Einnahmen: zeigt die zugehörige
  // Giro-Gutschrift, falls vorhanden).
  const suggByRow = (()=>{
    const m = new Map();
    (parsed?.autoSuggestions || []).forEach(s=>{ if(!m.has(s.rowIdx)) m.set(s.rowIdx, s); });
    return m;
  })();
  // Echte Einnahmen-Buchungen (positive Zeilen) mit Original-Index — für den
  // Filter „Einnahmen". Matched = hat eine Giro-Gutschrift.
  // Interne Legs (Quell-Erstattungen einer Auszahlung) werden NICHT eigenständig
  // gelistet, sondern als Detail unter ihrer Auszahlung gezeigt — sie werden beim
  // Import an dieselbe Giro-Buchung gehängt (eine gezählte Buchung, alle Infos).
  const fpToRowIdx = (()=>{
    const m = new Map();
    (parsed?.newRows || []).forEach((r,i)=>{ if(r.fp && !m.has(r.fp)) m.set(r.fp, i); });
    return m;
  })();
  const legsByParent = (()=>{
    const m = new Map(); // Auszahlungs-Zeilenindex → [Index der Quell-Erstattungen]
    (parsed?.newRows || []).forEach((r,i)=>{
      if(r._legSourceFps && r._legSourceFps.length){
        const legs = r._legSourceFps.map(fp=>fpToRowIdx.get(fp)).filter(j=>j!=null);
        if(legs.length) m.set(i, legs);
      }
    });
    return m;
  })();
  const claimedLegIdx = new Set([...legsByParent.values()].flat());
  const incomeRowText = r => [r.desc, r._recipient, r.isoDate,
    String(Math.abs(r.amount??r.totalAmount??0)).replace(".",",")].join(" ").toLowerCase();
  const incomeShown = (()=>{
    const rows = parsed?.newRows || [];
    const q = suggSearch.trim().toLowerCase();
    return rows.map((r,i)=>({r,i})).filter(({r,i})=>{
      if(!((r.amount ?? r.totalAmount ?? 0) > 0)) return false;
      if(claimedLegIdx.has(i)) return false; // wird als Detail unter der Auszahlung gezeigt
      if(!q) return true;
      if(incomeRowText(r).includes(q)) return true;
      // Treffer in einem verknüpften Leg → Auszahlung trotzdem zeigen.
      return (legsByParent.get(i)||[]).some(j=>incomeRowText(rows[j]).includes(q));
    });
  })();
  // Zähler je Konfidenzstufe (für die Chip-Beschriftung) — nur Ausgaben-Matches.
  const confCounts = (()=>{
    const all = parsed?.autoSuggestions || [];
    const c = {hoch:0, mittel:0, niedrig:0};
    all.forEach(s=>{ if(suggAmt(s)<0 && c[s.confidence]!=null) c[s.confidence]++; });
    return c;
  })();

  // Automatische Verknüpfungsvorschläge berechnen (für Vergleich, ohne zu importieren).
  // Nutzt den robusten Matcher: PayPal-Gate (Gläubiger-ID/Empfänger),
  // Händlername-Bestätigung und Bestes-Paar-Sortierung statt loser Betrag+Datum-Treffer.
  const computeAutoSuggestions = (newRows) =>
    assignPayPalLinks(newRows, txs, linkDays).suggestions;

  // Gemeinsame Zeilen-Verarbeitung (Dup-Split, PayPal-Anreicherung +30,
  // Gegenbuchungs-Filter). Wird von applyParsed UND dem Kontowechsel-Effekt
  // genutzt, damit beide konsistent bleiben.
  const buildRows = (format, resolvedRows) => {
    const isDup = r => knownFps.has(r.fp) || knownFps.has(r._fpNorm);
    const newRowsRaw = resolvedRows.filter(r=>!isDup(r));
    const dupRows = resolvedRows.filter(isDup);
    const isPayPalCsv = looksLikePayPalCsv(format, resolvedRows);
    const enrichedRows = isPayPalCsv ? enrichPayPalMerchants(newRowsRaw) : newRowsRaw;
    // PayPal: interne Gegenbuchungen entfernen, dann Rückerstattungen erkennen.
    const filtered = isPayPalCsv ? dropPayPalCounterBookings(enrichedRows) : enrichedRows;
    const refunds = isPayPalCsv ? detectPayPalRefunds(filtered) : filtered;
    // Verwaiste Legs reparieren: wurde die zugehörige Auszahlung gefiltert,
    // wird die Erstattung wieder normal zuordenbar (sonst „siehe Auszahlung"
    // ohne Auszahlung + kein Giro-Match).
    const newRows = isPayPalCsv ? reconcilePayPalLegs(refunds) : refunds;
    return { newRows, dupRows, droppedCounter: enrichedRows.length - filtered.length };
  };

  const doParse = () => {
    if(!csvText.trim()) return;
    applyParsed(parseCSV(csvText, {noGroup: !autoGroup}));
  };

  // Gemeinsame Nachbearbeitung für CSV- UND PDF-Parser: Konto auflösen,
  // Fingerprints bilden, Duplikate erkennen, Review-Schritt öffnen.
  const applyParsed = ({rows, format, detectedBalance, detectedBalances, skipped, headerRepeats}) => {
    // _konto-String → accountId auflösen und Fingerprint mit accountId neu bilden
    const resolvedRows = rows.map(r => {
      let resolvedAccId = selAccId || accounts[0]?.id;
      if(r._konto) {
        const kLow = r._konto.toLowerCase();
        const matched = accounts.find(a =>
          a.name.toLowerCase().includes(kLow) ||
          kLow.includes(a.name.toLowerCase()) ||
          a.id === r._konto
        );
        if(matched) resolvedAccId = matched.id;
      }
      return {...r, _resolvedAccId: resolvedAccId,
        fp: txFingerprint(r.isoDate, r.amount, r.desc, resolvedAccId),
        _fpNorm: txFingerprintNorm(r.isoDate, r.amount, r.desc, resolvedAccId)};
    });
    const { newRows, dupRows, droppedCounter } = buildRows(format, resolvedRows);
    const autoSuggestions = computeAutoSuggestions(newRows);
    setParsed({rows: resolvedRows, format, newRows, dupRows, autoSuggestions, droppedCounter, skipped: skipped || [], headerRepeats: headerRepeats || 0, detectedBalance, detectedBalances: detectedBalances || (detectedBalance ? [detectedBalance] : [])});
    setAssign(autoAssign(newRows));
    setShowCatAssign(newRows.length <= 20);
    // PayPal-CSVs: Giro-Verknüpfung automatisch vorschalten — PayPal-Zahlungen
    // belasten ohnehin das Girokonto, deshalb fast immer gewünscht. Bei anderen
    // Formaten bleibt die Verknüpfung aus (Standard).
    setLinkToGiro(looksLikePayPalCsv(format, resolvedRows));
    setStep("review");
  };

  // PDF-Kontoauszug einlesen (asynchron — pdf.js wird bei Bedarf geladen)
  const doParsePdf = (file) => {
    setPdfBusy(true); setPdfError("");
    file.arrayBuffer()
      .then(ab => parsePdfStatement(ab))
      .then(res => { setCsvSources([file.name]); applyParsed(res); })
      .catch(err => setPdfError(String(err?.message || err)))
      .finally(() => setPdfBusy(false));
  };

  const doImport = () => {
    const newTxs = [];
    const giroUpdates = {}; // giroTxId → [newTxId, ...]

    // Auto-Verknüpfung vorab berechnen (sicheres 1:1, ohne manuell akzeptierte
    // Zeilen/Giro-Buchungen doppelt zu belegen).
    const acceptedRows = new Set((parsed.acceptedSuggs||[]).map(a=>a.rowIdx));
    const acceptedGiroIds = new Set((parsed.acceptedSuggs||[]).map(a=>a.giroId));
    const autoByRow = {};
    if(linkToGiro) {
      const {links} = assignPayPalLinks(parsed.newRows, txs, linkDays,
        {excludeRows: acceptedRows, excludeGiroIds: acceptedGiroIds});
      links.forEach(l => { autoByRow[l.rowIdx] = l.giroTx; });
    }

    // Fingerprint → neue Tx-ID, um interne Legs (PayPal +30-Kauf / Auszahlungs-
    // Quelle) an dieselbe Giro-Buchung zu hängen wie ihren gematchten Partner.
    const fpToNewId = {};
    const legLinkByRow = {}; // rowIdx → [fp der Quell-Legs]
    parsed.newRows.forEach((r,i) => {
      const {catId="", subId=""} = assign[i]||{};
      const absAmt = Math.abs(r.amount);
      const splits = catId ? [{id:uid(), catId, subId, amount:absAmt}] : [];
      const newId = "csv-"+uid();
      fpToNewId[r.fp] = newId;
      if(r._legSourceFps) legLinkByRow[i] = r._legSourceFps;
      // Konto: bereits in doParse aufgelöst
      const resolvedAccId = r._resolvedAccId || selAccId || accounts[0]?.id || "acc-giro";
      newTxs.push({
        id: newId,
        date: r.isoDate,
        totalAmount: absAmt,
        desc: r.desc,
        note: r._detailNote || "",
        pending: false,
        accountId: resolvedAccId,
        splits,
        _csvType: r.amount > 0 ? "income" : "expense",
        _fp: r.fp,
        _csvSource: csvSources.length===1 ? csvSources[0] : csvSources.length>1 ? csvSources.join(", ") : "",
        _kontoRaw: r._konto || "",
        ...(r._creditorId ? {_creditorId: r._creditorId} : {}),
        ...(r._umbuchung ? {_umbuchung: r._umbuchung} : {}),
        ...(r._isRefund ? {_isRefund: true} : {}),
        ...(r._partialRefund ? {_partialRefund: true} : {}),
        ...(r._refundOf ? {_refundOf: r._refundOf} : {}),
      });
      // Regel merken — lokal + global
      if(catId) {
        const name = r.desc.split(" – ")[0].toLowerCase().trim();
        const newRule = {catId,subId};
        setRules(p=>({...p, ["name:"+name]:newRule, [r.fp]:newRule}));
        setCsvRules(p=>({...p, ["name:"+name]:newRule, [r.fp]:newRule}));
      }
      // Giro-Verknüpfung: Automatik (wenn aktiv) oder manuell akzeptierte Vorschläge
      const accepted = (parsed.acceptedSuggs||[]).filter(a=>a.rowIdx===i);
      accepted.forEach(a=>{
        if(!giroUpdates[a.giroId]) giroUpdates[a.giroId]=[];
        giroUpdates[a.giroId].push(newId);
      });
      if(linkToGiro && accepted.length===0 && autoByRow[i]) {
        const match = autoByRow[i];
        if(!giroUpdates[match.id]) giroUpdates[match.id] = [];
        giroUpdates[match.id].push(newId);
      }
    });

    // Interne Legs (PayPal-+30-Kauf / Quell-Erstattung einer Auszahlung) an
    // dieselbe Giro-Buchung hängen wie ihren gematchten Partner → eine gezählte
    // Buchung (das Giro), alle PayPal-Detail-Legs als verknüpfte Info, keine
    // Doppelzählung.
    if(linkToGiro) Object.entries(legLinkByRow).forEach(([iStr, fps]) => {
      const i = Number(iStr);
      const acc = (parsed.acceptedSuggs||[]).find(a=>a.rowIdx===i);
      const giroId = acc ? acc.giroId : autoByRow[i]?.id;
      if(!giroId) return;
      if(!giroUpdates[giroId]) giroUpdates[giroId] = [];
      fps.forEach(fp => {
        const sid = fpToNewId[fp];
        if(sid && !giroUpdates[giroId].includes(sid)) giroUpdates[giroId].push(sid);
      });
    });

    setTxs(p => {
      const withNew = [...newTxs, ...p];
      const sorted = [...withNew].sort((a,b)=>b.date.localeCompare(a.date));
      if(!linkToGiro || Object.keys(giroUpdates).length === 0) return sorted;
      // Giro-Buchungen mit linkedIds aktualisieren
      return sorted.map(t => {
        if(giroUpdates[t.id]) {
          return {...t, linkedIds: [...(t.linkedIds||[]), ...giroUpdates[t.id]]};
        }
        return t;
      });
    });
    setDoneCount(newTxs.length);

    // ── Erkannte Kontostände als Ankerpunkte speichern ───────────────────────
    // Neu: Alle gefundenen Stützpunkte werden übernommen (z.B. DKB
    // Quartalsabrechnungen liefern oft 4 pro Jahr). Fallback auf
    // detectedBalance (Singular) für ältere parsed-States ohne Array.
    const balancesToStore = (parsed.detectedBalances && parsed.detectedBalances.length)
      ? parsed.detectedBalances
      : (parsed.detectedBalance ? [parsed.detectedBalance] : []);
    if(balancesToStore.length > 0) {
      const targetAccId = selAccId || accounts[0]?.id || "acc-giro";
      // Kontostand "am Datum" TAGGENAU als Anker ablegen (siehe utils/anchors.js):
      // Monats-Ende → schlichte Zahl (rückwärtskompatibel), Datum mitten im Monat
      // → { v, day }. getKumulierterSaldo addiert dann im Anker-Monat nur die
      // Buchungen NACH dem Anker-Tag — spätere Buchungen verschwinden nicht mehr.
      setStartBalances(prev=>{
        let next = {...(prev||{})};
        for(const db of balancesToStore) {
          const a = anchorFromDetectedBalance(db);
          if(!a) continue;
          const entry = makeAnchorEntry(a.value, a.year, a.month, a.day);
          next = {
            ...next,
            [a.year]: {
              ...(next?.[a.year]||{}),
              [a.month]: {
                ...((next?.[a.year]?.[a.month])||{}),
                [targetAccId]: entry,
              },
            }
          };
        }
        return next;
      });
    }

    // ── Prüfen ob der Vormonat-Ankerpunkt für den ersten importierten Monat fehlt ──
    if(newTxs.length > 0) {
      const importAccId = selAccId || accounts[0]?.id || "acc-giro";
      // Frühestes Datum aller importierten Buchungen ermitteln
      const sortedDates = newTxs.map(t=>t.date).sort();
      const firstDate = sortedDates[0]; // "YYYY-MM-DD"
      const firstYear = Number(firstDate.slice(0,4));
      const firstMonth = Number(firstDate.slice(5,7)) - 1; // 0-basiert
      // Vormonat berechnen
      const prevMonth = firstMonth === 0 ? 11 : firstMonth - 1;
      const prevYear  = firstMonth === 0 ? firstYear - 1 : firstYear;
      // Ankerpunkte prüfen: gibt es einen Ankerpunkt für dieses Konto <= Vormonat?
      const sb = startBalances || {};
      let hasAnchorForPrev = false;
      Object.entries(sb).forEach(([yStr, yVal]) => {
        const y = Number(yStr);
        if(typeof yVal !== "object" || !yVal) return;
        Object.entries(yVal).forEach(([kStr, kVal]) => {
          const mo = Number(kStr);
          if((y < prevYear) || (y === prevYear && mo <= prevMonth)) {
            // Neues Format: {mo: {accId: number}}
            if(!isNaN(mo) && typeof kVal === "object" && kVal?.[importAccId] !== undefined) hasAnchorForPrev = true;
            // Altes Format (nur acc-giro): nur wenn wir auch acc-giro importieren
            if(kStr === "acc-giro" && typeof kVal === "number" && importAccId === "acc-giro") hasAnchorForPrev = true;
          }
        });
      });
      // Neu gesetzte Ankerpunkte aus CSV zählen auch (jeder einzelne)
      const balancesForCheck = (parsed.detectedBalances && parsed.detectedBalances.length)
        ? parsed.detectedBalances
        : (parsed.detectedBalance ? [parsed.detectedBalance] : []);
      for(const db of balancesForCheck) {
        if(!db || !db.date) continue;
        const py = Number(db.date.slice(0,4)), pm = Number(db.date.slice(5,7)) - 1;
        if((py < prevYear) || (py === prevYear && pm <= prevMonth)) { hasAnchorForPrev = true; break; }
      }
      if(!hasAnchorForPrev) {
        setAnchorWarning({firstMonth, firstYear, prevMonth, prevYear, accId: importAccId,
          accName: accounts.find(a=>a.id===importAccId)?.name || importAccId});
      } else {
        setAnchorWarning(null);
      }
    }

    setStep("done");
  };

  const allCatOptions = useMemo(()=>{
    const opts = [];
    groups.forEach(g=>{
      cats.filter(c=>c.type===g.type).forEach(cat=>{
        (cat.subs||[]).forEach(sub=>{
          opts.push({catId:cat.id, subId:sub.id, label:`${cat.name} / ${sub.name}`, group:g.label});
        });
      });
    });
    return opts;
  },[cats,groups]);

  const setRowAssign = (i, catId, subId) => setAssign(p=>({...p,[i]:{catId,subId}}));

  // Master-Button-Override: der große Plus-Knopf übernimmt die Schritt-Aktion
  // (Tipp = bestätigen, Wisch ← = zurück, Wisch ↓ = abbrechen) — analog zu den
  // Mobile-Wizards. Nur im mobileMode aktiv; embedded/Desktop nutzt die Inline-
  // Buttons. Handler über Ref, damit immer die aktuellen Kategorie-Zuweisungen
  // (assign) greifen, ohne den Effect bei jeder Auswahl neu zu registrieren.
  const _csvHandlersRef = React.useRef({});
  _csvHandlersRef.current = { doParse, doImport, onClose };
  React.useEffect(() => {
    // Override für den +-Knopf bei JEDEM Vollbild-CSV-Import (auch ohne „großes
    // Mobile-UI"); nur im eingebetteten Modal-Tab nicht (dort eigenes ✕).
    if(embedded || !setMasterOverride) return;
    const H = () => _csvHandlersRef.current;
    let cfg = null;
    if(step === "input") {
      cfg = {
        label: parsed ? `Erneut prüfen (${parsed.newRows?.length||0} neu)` : "Vorschau anzeigen",
        onConfirm: () => { if(csvText.trim()) H().doParse(); },
        onBack: null,
        onDismiss: () => H().onClose(),
        disabled: !csvText.trim(),
      };
    } else if(step === "review") {
      const n = parsed?.newRows?.length || 0;
      cfg = n === 0 ? {
        label: "Schließen",
        onConfirm: () => H().onClose(),
        onBack: () => setStep("input"),
        onDismiss: () => H().onClose(),
      } : {
        label: `${n} importieren${showCatAssign ? " · mit Kategorien ✓" : ""}`,
        onConfirm: () => H().doImport(),
        onBack: () => setStep("input"),
        onDismiss: () => H().onClose(),
      };
    } else if(step === "done") {
      cfg = {
        label: "✓ Fertig",
        onConfirm: () => H().onClose(),
        onBack: null,
        onDismiss: () => H().onClose(),
      };
    }
    setMasterOverride(cfg);
    return () => setMasterOverride(null);
  }, [step, csvText, parsed, showCatAssign, embedded]);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className={mobileMode?"mobile-modal":""} style={embedded
      ? {display:"flex",flexDirection:"column",fontFamily:"'SF Pro Text',-apple-system,sans-serif",minHeight:300}
      : {position:"fixed",inset:0,background:T.bg,zIndex:15,display:"flex",flexDirection:"column",
         fontFamily:"'SF Pro Text',-apple-system,sans-serif",
         // Reserve unten: die nav-bottom (Home/Monat/Jahr) ist position:fixed z-index:9999
         // und überdeckt sonst den Footer mit dem "Buchungen importieren"-Button.
         paddingBottom:"calc(60px + env(safe-area-inset-bottom, 0px))"}}>
      {/* Header */}
      {!embedded && (mobileMode ? (
        // Mobile: einheitlicher Header. Zurück führt review/done → input, input → Mehr-Menü.
        <MobileHeader title="CSV-Import" titleColor={T.blue}
          subtitle={step==="review"&&parsed?.format ? parsed.format : "DKB · Finanzblick · beliebiges Format"}
          onBack={step!=="input" ? ()=>setStep("input") : (onBack||onClose)}
          onClose={onClose}/>
      ) : (
        <div style={{background:T.surf,borderBottom:`1px solid ${T.bds}`,padding:MPad,paddingTop:"calc(10px + env(safe-area-inset-top, 0px))",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",color:T.txt,borderRadius:10,width:34,height:34,cursor:"pointer",fontSize:18}}>{Li("arrow-left",13)}</button>
          <div style={{flex:1}}>
            <div style={{color:T.blue,fontSize:16,fontWeight:700}}>{Li("upload-cloud",16,T.blue)} CSV-Import</div>
            <div style={{color:T.txt2,fontSize:MFSl}}>DKB · Finanzblick · beliebiges Format</div>
          </div>
          {step==="review"&&<div style={{color:T.txt2,fontSize:MFSl}}>{parsed?.format}</div>}
        </div>
      ))}

      {/* ── Kontoauswahl — sichtbar auf allen Steps, außer im Vorschlags-Vollbild ── */}
      {accounts.length>0&&!suggFull&&(
        <div style={{background:T.surf2,borderBottom:`1px solid ${T.bd}`,padding:mobileMode?"12px 16px":"8px 14px",flexShrink:0}}>
          <div style={{color:T.txt2,fontSize:mobileMode?14:10,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>
            {Li("landmark",mobileMode?14:10,T.txt2)} Konto (gilt für Buchungen & Ankerpunkt)
          </div>
          <AccountChips accounts={accounts} value={selAccId} onChange={setSelAccId}/>
          {selAccId&&(()=>{const a=accounts.find(x=>x.id===selAccId);return a?(
            <div style={{color:a.color||T.blue,fontSize:mobileMode?12:9,marginTop:5,fontWeight:600}}>
              Buchungen & Ankerpunkt → {a.name}
            </div>
          ):null;})()}
        </div>
      )}

      {/* STEP: INPUT */}
      {step==="input"&&(
        <div style={{flex:1,overflowY:"auto",padding:mobileMode?20:16,
          fontSize:mobileMode?"inherit":"inherit",
          "--csv-fs": mobileMode?"18px":"12px",
          "--csv-fs-s": mobileMode?"15px":"11px",
          "--csv-fs-l": mobileMode?"22px":"14px"}}>
          <div style={{color:T.txt2,fontSize:MFSl,marginBottom:8,lineHeight:1.5}}>
            CSV-Export aus deiner Banking-App hier einfügen oder Datei laden:
          </div>
          {/* Auto-Gruppierung Toggle */}
          <div onClick={()=>setAutoGroup(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:10,padding:MPad,
              borderRadius:11,border:`1px solid ${autoGroup?T.blue+"66":T.bd}`,
              background:autoGroup?"rgba(137,196,244,0.06)":"rgba(255,255,255,0.03)",
              cursor:"pointer",marginBottom:8}}>
            <div style={{width:36,height:22,borderRadius:11,position:"relative",flexShrink:0,
              background:autoGroup?T.blue:"rgba(255,255,255,0.1)",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,left:autoGroup?16:3,width:16,height:16,
                borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <div>
              <div style={{color:autoGroup?T.blue:T.txt2,fontSize:MFSl,fontWeight:700}}>
                Zusammengehörige Zeilen automatisch gruppieren
              </div>
              <div style={{color:T.txt2,fontSize:10,lineHeight:1.4}}>
                {autoGroup
                  ? "Aktiv — Zeilen mit gleicher Rechnungs-Nr. / PP-Referenz werden zusammengefasst"
                  : "Inaktiv — jede CSV-Zeile wird als eigene Buchung importiert (empfohlen für manuelle Kontrolle)"}
              </div>
            </div>
          </div>

          {/* Verknüpfung mit bestehenden Giro-Buchungen */}
          {txs.length > 0 && (
            <div style={{marginBottom:12,borderRadius:11,border:`1px solid ${linkToGiro?T.gold+"66":T.bd}`,
              background:linkToGiro?"rgba(245,166,35,0.06)":"rgba(255,255,255,0.03)",overflow:"hidden"}}>
              {/* Toggle-Zeile */}
              <div onClick={()=>setLinkToGiro(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:10,padding:MPad,cursor:"pointer"}}>
                <div style={{width:36,height:22,borderRadius:11,position:"relative",flexShrink:0,
                  background:linkToGiro?T.warn:"rgba(255,255,255,0.1)",transition:"background 0.2s"}}>
                  <div style={{position:"absolute",top:3,left:linkToGiro?16:3,width:16,height:16,
                    borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                </div>
                <div>
                  <div style={{color:linkToGiro?T.gold:T.txt2,fontSize:MFSl,fontWeight:700}}>
                    Mit Giro-Buchungen verknüpfen
                  </div>
                  <div style={{color:T.txt2,fontSize:10}}>
                    Gleicher Betrag innerhalb ±{linkDays} Tage → automatisch verknüpfen
                  </div>
                </div>
              </div>
              {/* Tage-Slider – nur wenn aktiv */}
              {linkToGiro&&(
                <div style={{padding:"0 14px 12px",borderTop:`1px solid ${T.gold}22`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,marginTop:8}}>
                    <span style={{color:T.txt2,fontSize:10}}>Zeitspanne</span>
                    <span style={{color:T.gold,fontSize:MFSl,fontWeight:700}}>{linkDays} Tage</span>
                  </div>
                  <input type="range" min={1} max={90} value={linkDays}
                    onChange={e=>setLinkDays(Number(e.target.value))}
                    style={{width:"100%",accentColor:T.gold,cursor:"pointer"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",color:T.txt2,fontSize:9,marginTop:2}}>
                    <span>1 Tag</span>
                    <span style={{color:linkDays>=30?T.gold:T.txt2}}>30 (PayPal Später)</span>
                    <span>90 Tage</span>
                  </div>
                  <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[3,7,14,30,45,60,90].map(d=>(
                      <button key={d} onClick={()=>setLinkDays(d)}
                        style={{padding:"3px 8px",borderRadius:7,border:`1px solid ${linkDays===d?T.gold:T.bd}`,
                          background:linkDays===d?"rgba(245,166,35,0.2)":"transparent",
                          color:linkDays===d?T.gold:T.txt2,fontSize:10,cursor:"pointer",fontWeight:linkDays===d?700:400}}>
                        {d}d{d===30?"":d===3?" schnell":d===90?" max":""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ── Kontostand-Ankerpunkte ── */}
          <AnchorSection selAccId={selAccId} accounts={accounts} startBalances={startBalances}
            setStartBalances={setStartBalances} mobileMode={mobileMode} MFSl={MFSl}/>

          <label style={{display:"block",padding:"11px 14px",borderRadius:11,border:`1px solid ${T.bds}`,
            background:"rgba(137,196,244,0.08)",color:T.blue,fontSize:MFS,fontWeight:600,
            cursor:"pointer",marginBottom:10,textAlign:"left"}}>
            {Li("folder-open",14)} CSV- oder PDF-Datei auswählen
            <input type="file" accept=".csv,.txt,text/csv,.pdf,application/pdf" multiple style={{display:"none"}}
              onChange={e=>{
                const files=Array.from(e.target.files||[]); if(!files.length) return;
                // PDF-Kontoauszug? (eigener Pfad, nutzt pdf.js)
                const pdf = files.find(f=>/\.pdf$/i.test(f.name) || f.type==="application/pdf");
                if(pdf){ doParsePdf(pdf); e.target.value=""; return; }
                const results=[];
                let done=0;
                files.forEach((file,i)=>{
                  const reader=new FileReader();
                  reader.onload=ev=>{
                    results[i]={text:ev.target.result, name:file.name};
                    done++;
                    if(done===files.length){
                      // Jede Datei separat mit Marker versehen
                      const combined=results.map((r,idx)=>{
                        const lines=r.text.trim().split("\n");
                        const firstLine=lines[0]||"";
                        const looksLikeHeader=!/^\d/.test(firstLine.trim()) && !/^\d{2}[./]/.test(firstLine.trim());
                        const dataLines=(idx===0||looksLikeHeader)?lines:(lines.slice(1));
                        // Ersten Datenzeilen einen Source-Marker voranstellen
                        return (idx===0?lines.join("\n"):dataLines.join("\n"));
                      }).join("\n");
                      setCsvText(combined);
                      setCsvSources(results.map(r=>r.name));
                    }
                  };
                  reader.readAsText(file,"utf-8");
                });
                e.target.value="";
              }}/>
          </label>
          <div style={{color:T.txt2,fontSize:10,marginBottom:10,marginTop:-4}}>
            PDF: Wirecard/N26-Kontoauszüge
          </div>
          {pdfBusy && <div style={{color:T.blue,fontSize:11,fontWeight:600,marginBottom:10}}>PDF wird analysiert…</div>}
          {pdfError && <div style={{color:T.neg,fontSize:11,marginBottom:10}}>PDF-Import: {pdfError}</div>}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{flex:1,height:1,background:T.bd}}/>
            <span style={{color:T.txt2,fontSize:10}}>oder Text einfügen</span>
            <div style={{flex:1,height:1,background:T.bd}}/>
          </div>
          <textarea value={csvText} onChange={e=>setCsvText(e.target.value)}
            placeholder={"Buchungsdatum;Wertstellung;Status;Zahlungsempfänger*in;Verwendungszweck;Betrag (€)\n14.03.26;14.03.26;Gebucht;REWE;REWE SAGT DANKE;-47,30\n..."}
            style={{width:"100%",minHeight:160,background:"rgba(255,255,255,0.04)",
              border:`1px solid ${csvText?T.blue:T.bds}`,borderRadius:11,padding:"10px 12px",
              color:T.txt,fontSize:10,fontFamily:"monospace",resize:"vertical",
              outline:"none",boxSizing:"border-box",marginBottom:14}}/>
          <button onClick={doParse} disabled={!csvText.trim()}
            style={{width:"100%",padding:"10px",borderRadius:11,border:"none",
              background:csvText.trim()?"linear-gradient(135deg,#2C6E9E,#5BA3D0)":T.disabled,
              color:"#fff",fontSize:MFS,fontWeight:700,cursor:csvText.trim()?"pointer":"default",
              opacity:csvText.trim()?1:0.4}}>
            CSV analysieren →
          </button>
        </div>
      )}

      {/* STEP: REVIEW */}
      {step==="review"&&parsed&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          {/* Info: wiederholte Kopfzeilen (mehrere Exporte zusammengefügt) — harmlos */}
          {!suggFull&&(parsed.headerRepeats||0)>0&&(
            <div style={{background:"rgba(74,159,212,0.10)",borderBottom:`1px solid ${T.blue}44`,
              padding:"7px 16px",flexShrink:0,fontSize:MFSl,color:T.txt2,display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{flexShrink:0,marginTop:1}}>{Li("info",13,T.blue)}</span>
              <div>
                <b style={{color:T.blue}}>{parsed.headerRepeats} wiederholte Kopfzeile{parsed.headerRepeats!==1?"n":""}</b> übersprungen
                {" "}— entstehen, wenn mehrere Export-Dateien zusammengefügt werden. <b style={{color:T.txt}}>Kein Datenverlust.</b>
              </div>
            </div>
          )}
          {/* Warnung: Zeilen mit WIRKLICH unlesbarem Datum/Betrag (echter Datenverlust) */}
          {!suggFull&&(parsed.skipped||[]).length>0&&(
            <div style={{background:"rgba(245,166,35,0.12)",borderBottom:`1px solid ${T.gold}55`,
              padding:"8px 16px",flexShrink:0,fontSize:MFSl,color:T.gold,display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{flexShrink:0,marginTop:1}}>{Li("alert-triangle",13,T.gold)}</span>
              <div>
                <b>{parsed.skipped.length} Zeile{parsed.skipped.length!==1?"n":""} nicht importiert</b>
                {" "}— Datum oder Betrag war unlesbar:
                <div style={{color:T.txt2,fontSize:MFSl,marginTop:3,fontFamily:NUM_FONT}}>
                  {parsed.skipped.slice(0,4).map((s,i)=>(
                    <div key={i}>Zeile {s.line}: {s.reason}=„{(s.reason==="Datum"?s.rawDate:s.rawAmount)||"leer"}"</div>
                  ))}
                  {parsed.skipped.length>4&&<div>… und {parsed.skipped.length-4} weitere</div>}
                </div>
              </div>
            </div>
          )}
          {/* Summary bar — im Vorschlags-Vollbild ausgeblendet, damit nur die
              Vorschläge sichtbar sind. */}
          {!suggFull&&(
          <div style={{background:T.surf2,padding:"10px 16px",borderBottom:`1px solid ${T.bd}`,flexShrink:0,display:"flex",gap:10,flexWrap:"wrap"}}>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.pos,fontSize:18,fontWeight:800}}>{parsed.newRows.length}</div>
              <div style={{color:T.txt2,fontSize:10}}>Neu</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.txt2,fontSize:18,fontWeight:700}}>{parsed.dupRows.length}</div>
              <div style={{color:T.txt2,fontSize:10}}>Duplikate</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.blue,fontSize:18,fontWeight:700}}>{parsed.rows.length}</div>
              <div style={{color:T.txt2,fontSize:10}}>Gesamt</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.pos,fontSize:18,fontWeight:800}}>{flowStats.income}</div>
              <div style={{color:T.txt2,fontSize:10}}>Einnahmen</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:T.neg,fontSize:18,fontWeight:800}}>{flowStats.expense}</div>
              <div style={{color:T.txt2,fontSize:10}}>Ausgaben</div>
            </div>
            {(parsed.droppedCounter>0)&&(
              <div style={{textAlign:"center"}} title="Interne PayPal-Gegenbuchungen (Spiegel-Einnahmen zur Finanzierung jeder Zahlung) wurden herausgefiltert">
                <div style={{color:T.txt2,fontSize:18,fontWeight:700}}>−{parsed.droppedCounter}</div>
                <div style={{color:T.txt2,fontSize:10}}>Gegenbuch. gefiltert</div>
              </div>
            )}
            {parsed.rows.some(r=>r._paypalRows>1)&&(
              <div style={{textAlign:"center"}}>
                <div style={{color:T.gold,fontSize:18,fontWeight:800}}>
                  {parsed.rows.filter(r=>r._paypalRows>1).reduce((s,r)=>s+(r._paypalRows||1),0)}→{parsed.rows.filter(r=>r._paypalRows>1).length}
                </div>
                <div style={{color:T.txt2,fontSize:10}}>PayPal gruppiert</div>
              </div>
            )}
            <div style={{flex:1}}/>
            <div style={{color:T.txt2,fontSize:MFSl,alignSelf:"center",marginRight:8}}>
              {parsed.format}
            </div>
            {/* Toggle: Auto-Vorschläge Vergleich */}
            {(parsed.autoSuggestions||[]).length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                <span style={{color:T.gold,fontSize:MFSl}}>
                  {Li("git-compare",12,T.gold)} {parsed.autoSuggestions.length} Vorschläge
                </span>
                <div onClick={()=>setShowAutoSugg(v=>!v)}
                  style={{width:40,height:24,borderRadius:12,cursor:"pointer",
                    background:showAutoSugg?T.warn:"rgba(255,255,255,0.12)",
                    position:"relative",transition:"background 0.2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,
                    left:showAutoSugg?19:3,width:18,height:18,borderRadius:"50%",
                    background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                </div>
              </div>
            )}
            {/* Toggle: Jetzt kategorisieren */}
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{color:T.txt2,fontSize:MFSl}}>Kategorisieren</span>
              <div onClick={()=>setShowCatAssign(v=>!v)}
                style={{width:40,height:24,borderRadius:12,cursor:"pointer",
                  background:showCatAssign?T.blue:"rgba(255,255,255,0.12)",
                  position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,
                  left:showCatAssign?19:3,width:18,height:18,borderRadius:"50%",
                  background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
              </div>
            </div>
          </div>
          )}

          {/* Auto-Vorschläge Vergleichspanel */}
          {showAutoSugg&&(parsed.autoSuggestions||[]).length>0&&(
            <div style={{background:(isLightTheme())?"rgba(192,120,0,0.08)":"rgba(245,166,35,0.06)",borderBottom:`1px solid ${T.gold}33`,
              padding:"10px 16px",overflowY:"auto",
              ...(autoSuggFull?{flex:1,minHeight:0}:{flexShrink:0,maxHeight:220})}}>
              <div style={{marginBottom:8,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
                background:(isLightTheme())?"rgba(252,247,238,0.96)":"rgba(38,34,26,0.96)",
                margin:"-10px -16px 8px",padding:"10px 16px 8px",zIndex:1,
                // Im Vollbild scrollt der Kopf mit (nur Vorschläge sichtbar); sonst sticky.
                ...(autoSuggFull?{}:{position:"sticky",top:-10})}}>
                <span style={{color:T.gold,fontSize:MFSl,fontWeight:700,display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
                  {Li("git-compare",13,T.gold)}
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {suggType==="einnahmen" ? `${incomeShown.length} Einnahmen`
                      : suggType==="ausgaben" ? `${shownSuggs.length} Ausgaben`
                      : `${shownSuggs.length} Ausgaben · ${incomeShown.length} Einnahmen`}{acceptedCount>0&&showExpenses?` · ${acceptedCount} übernommen`:""}
                  </span>
                </span>
                {/* Sammel-Übernehmen (nur in der Vorschlags-/Match-Ansicht) */}
                {showExpenses&&bulkCounts.hoch>0&&(
                  <button onClick={()=>acceptBulk(["hoch"])}
                    style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                      background:T.pos,border:`1px solid ${T.pos}`,borderRadius:8,padding:"5px 11px",
                      color:T.on_accent||"#0a0a0a",fontSize:MFSl,fontWeight:800,fontFamily:"inherit"}}>
                    {Li("check",13,T.on_accent||"#0a0a0a")} Alle sicheren ({bulkCounts.hoch})
                  </button>
                )}
                {showExpenses&&bulkCounts.mittel>0&&(
                  <button onClick={()=>acceptBulk(["hoch","mittel"])}
                    style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                      background:"rgba(245,166,35,0.18)",border:`1px solid ${T.gold}`,borderRadius:8,padding:"5px 11px",
                      color:T.gold,fontSize:MFSl,fontWeight:700,fontFamily:"inherit"}}>
                    {Li("check",13,T.gold)} +mittel ({bulkCounts.mittel})
                  </button>
                )}
                {acceptedCount>0&&(
                  <button onClick={clearAccepted}
                    style={{flexShrink:0,cursor:"pointer",background:"transparent",
                      border:`1px solid ${T.bd}`,borderRadius:8,padding:"5px 9px",
                      color:T.txt2,fontSize:MFSl,fontFamily:"inherit"}}>
                    zurücksetzen
                  </button>
                )}
                <button onClick={()=>setAutoSuggFull(v=>!v)}
                  style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                    background:autoSuggFull?T.gold:"rgba(245,166,35,0.15)",
                    border:`1px solid ${T.gold}`,borderRadius:8,padding:"5px 11px",
                    color:autoSuggFull?T.on_accent||"#1a1a1a":T.gold,fontSize:MFSl,fontWeight:700,fontFamily:"inherit"}}>
                  {Li(autoSuggFull?"minimize-2":"maximize-2",12,autoSuggFull?(T.on_accent||"#1a1a1a"):T.gold)}
                  {autoSuggFull?"Verkleinern":"Vollbild"}
                </button>
                {/* Suchzeile — filtert die Vorschläge (Händler, Betrag, Datum, Giro-Text) */}
                <div style={{flex:"1 1 100%",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:6,
                    background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,borderRadius:8,padding:"5px 9px"}}>
                    {Li("search",13,T.txt2)}
                    <input value={suggSearch} onChange={e=>setSuggSearch(e.target.value)}
                      placeholder="Vorschläge durchsuchen (z. B. Roborock, 359, Apple)…"
                      style={{flex:1,background:"transparent",border:"none",color:T.txt,
                        fontSize:autoSuggFull?14:MFSl,outline:"none",fontFamily:"inherit"}}/>
                    {suggSearch&&<span onClick={()=>setSuggSearch("")} style={{cursor:"pointer",color:T.txt2,display:"flex"}}>{Li("x",13,T.txt2)}</span>}
                  </div>
                  {suggSearch&&<span style={{color:T.txt2,fontSize:MFSl,flexShrink:0}}>{(suggType==="einnahmen"?incomeShown.length:suggType==="ausgaben"?shownSuggs.length:incomeShown.length+shownSuggs.length)} Treffer</span>}
                </div>
                {/* Filter-Chips: Typ (groß, Substantive) + Konfidenz (klein,
                    Adjektive). Erneutes Tippen wählt wieder ab — kein „alle"-Chip nötig. */}
                <div style={{flex:"1 1 100%",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {[["ausgaben","Ausgaben"],["einnahmen","Einnahmen"]].map(([v,lbl])=>{
                    const active=suggType===v;
                    return <button key={v} onClick={()=>setSuggType(t=>t===v?"":v)}
                      style={{padding:"4px 11px",borderRadius:10,border:`1px solid ${active?T.blue:T.bd}`,
                        background:active?"rgba(74,159,212,0.2)":"transparent",color:active?T.blue:T.txt2,
                        fontSize:autoSuggFull?13:MFSl,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit"}}>{lbl}</button>;
                  })}
                  <div style={{width:1,alignSelf:"stretch",background:T.bd,margin:"2px 3px"}}/>
                  {[["hoch",T.pos,"rgba(34,197,94,0.18)"],["mittel",T.gold,"rgba(245,166,35,0.18)"],
                    ["niedrig",T.txt2,"rgba(255,255,255,0.08)"]].map(([v,col,bg])=>{
                    const active=suggConf===v;
                    return <button key={v} onClick={()=>setSuggConf(c=>c===v?"":v)} disabled={!showExpenses}
                      style={{padding:"4px 11px",borderRadius:10,border:`1px solid ${active?col:T.bd}`,
                        background:active?bg:"transparent",color:active?col:T.txt2,opacity:!showExpenses?0.4:1,
                        fontSize:autoSuggFull?13:MFSl,fontWeight:active?700:500,cursor:!showExpenses?"default":"pointer",fontFamily:"inherit"}}>
                      {v} ({confCounts[v]})</button>;
                  })}
                </div>
              </div>
              {/* Listen-Bereich. Ohne Filter (suggType==="") werden BEIDE Listen
                  gezeigt — Ausgaben zuerst (order:1), Einnahmen darunter (order:2). */}
              <div style={{display:"flex",flexDirection:"column"}}>
              {showIncomeList&&(
                <div style={{order:showBoth?2:1}}>
                  {showBoth&&<div style={{color:T.pos,fontSize:MFSl,fontWeight:800,letterSpacing:"0.04em",textTransform:"uppercase",opacity:0.85,padding:"6px 2px 3px"}}>Einnahmen ({incomeShown.length})</div>}
                  {incomeShown.length===0&&(
                    <div style={{color:T.txt2,fontSize:MFSl,padding:"10px 2px"}}>Keine Einnahmen für die aktuelle Auswahl.</div>
                  )}
                  {incomeShown.map(({r,i})=>{
                    const amt = Math.abs(pn(r.amount ?? r.totalAmount ?? 0));
                    const descFS = autoSuggFull ? (mobileMode?15:13.5) : (mobileMode?14:11.5);
                    const metaFS = autoSuggFull ? (mobileMode?13:11.5) : (mobileMode?12:10);
                    const wrap = autoSuggFull ? {whiteSpace:"normal",wordBreak:"break-word"} : {overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
                    const s = suggByRow.get(i); // zugehörige Giro-Gutschrift (falls vorhanden)
                    const confColor = s ? (s.confidence==="hoch"?T.pos:s.confidence==="mittel"?T.gold:T.txt2) : T.txt2;
                    const accepted = s && (parsed.acceptedSuggs||[]).some(a=>a.rowIdx===s.rowIdx&&a.giroId===s.giroTx.id);
                    return (
                      <div key={"inc"+i} style={{display:"flex",flexDirection:"column",gap:3,
                        padding:autoSuggFull?"11px 2px":"8px 2px",borderBottom:`1px solid rgba(255,255,255,0.06)`,
                        background:accepted?"rgba(34,197,94,0.07)":"transparent"}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                          <div style={{flex:1,minWidth:0,color:T.pos,fontSize:autoSuggFull?(mobileMode?22:17):(mobileMode?17:13.5),
                            fontWeight:800,fontFamily:NUM_FONT}}>+ {fmt(amt)}</div>
                          <div style={{flexShrink:0,color:T.txt2,fontSize:metaFS}}>
                            {s?`Giro ${dshort(s.giroTx.date)} · `:""}PayPal {dshort(r.isoDate)}
                          </div>
                        </div>
                        {/* Konfidenz + übernehmen — nur wenn es eine Giro-Gutschrift gibt */}
                        {s ? (
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{flex:1,minWidth:0,display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                              <span style={{color:confColor,fontSize:autoSuggFull?14:12,fontWeight:800}}>{s.confidence}</span>
                              <span style={{color:T.txt2,fontSize:metaFS}}>±{s.diffDays} Tage</span>
                              {s.reason&&<span style={{color:T.txt2,fontSize:metaFS,opacity:0.85}}>· {s.reason}</span>}
                            </div>
                            <button onClick={()=>setParsed(p=>({...p,acceptedSuggs:[...(p.acceptedSuggs||[]),{rowIdx:s.rowIdx,giroId:s.giroTx.id}]}))}
                              disabled={accepted}
                              style={{flexShrink:0,background:accepted?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.06)",
                                border:`1px solid ${accepted?T.pos:T.bd}`,borderRadius:8,padding:autoSuggFull?"6px 13px":"4px 10px",
                                fontSize:autoSuggFull?13:11,fontWeight:700,cursor:accepted?"default":"pointer",
                                color:accepted?T.pos:T.txt2,fontFamily:"inherit"}}>
                              {accepted?"✓ übernommen":"übernehmen"}
                            </button>
                          </div>
                        ) : (
                          <div style={{color:T.txt2,fontSize:metaFS,opacity:0.7}}>
                            {r._internalLeg ? "→ aufs Giro ausgezahlt (siehe Auszahlung)" : "kein Giro-Gegenstück (Guthaben bleibt in PayPal)"}
                          </div>
                        )}
                        {r._isRefund&&(
                          <div style={{display:"inline-flex",alignSelf:"flex-start",alignItems:"center",gap:5,
                            background:"rgba(245,166,35,0.15)",border:`1px solid ${T.gold}66`,borderRadius:7,
                            padding:"2px 8px",color:T.gold,fontSize:metaFS,fontWeight:700}}>
                            {Li("corner-up-left",11,T.gold)} {r._partialRefund?"Teilerstattung":"Erstattung"}{r._refundOf?` zu ${(r._refundOf.merchant||"Ausgabe").split(" ")[0]} ${fmt(Math.abs(r._refundOf.amount))} · ${dshort(r._refundOf.date)}`:""}
                          </div>
                        )}
                        {r._enrichedWithdrawal&&r._enrichedMerchant&&(
                          <div style={{color:T.blue,fontSize:metaFS,fontWeight:700,...wrap}}>
                            {Li("corner-down-right",11,T.blue)} Auszahlung von: {r._enrichedMerchant}
                          </div>
                        )}
                        {s&&(
                          <div style={{color:T.txt,fontSize:descFS,fontWeight:600,...wrap}}>
                            <span style={{color:T.blue,fontWeight:700}}>Giro:</span> {s.giroTx.desc}
                          </div>
                        )}
                        <div style={{color:T.txt2,fontSize:descFS,...wrap}}>
                          <span style={{color:T.gold,fontWeight:700}}>PayPal:</span> {r.desc}
                        </div>
                        {/* Verknüpfte Quell-Erstattungen (interne Legs): werden beim
                            Import an dieselbe Giro-Buchung gehängt → hier als Detail
                            unter der Auszahlung, nicht als eigene Einnahme. */}
                        {(legsByParent.get(i)||[]).length>0&&(
                          <div style={{marginTop:4,paddingTop:5,
                            borderTop:`1px solid rgba(255,255,255,0.08)`,display:"flex",flexDirection:"column",gap:5}}>
                            <div style={{color:T.txt2,fontSize:metaFS,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                              {Li("link",10,T.txt2)} Verrechnete Erstattung{(legsByParent.get(i)||[]).length>1?"en":""} (mit dieser Auszahlung verknüpft)
                            </div>
                            {(legsByParent.get(i)||[]).map(j=>{
                              const lr = parsed.newRows[j];
                              return (
                                <div key={"leg"+j} style={{display:"flex",flexDirection:"column",gap:2}}>
                                  {lr._isRefund&&(
                                    <div style={{display:"inline-flex",alignSelf:"flex-start",alignItems:"center",gap:5,
                                      background:"rgba(245,166,35,0.15)",border:`1px solid ${T.gold}66`,borderRadius:7,
                                      padding:"2px 8px",color:T.gold,fontSize:metaFS,fontWeight:700}}>
                                      {Li("corner-up-left",11,T.gold)} {lr._partialRefund?"Teilerstattung":"Erstattung"}{lr._refundOf?` zu ${(lr._refundOf.merchant||"Ausgabe").split(" ")[0]} ${fmt(Math.abs(lr._refundOf.amount))} · ${dshort(lr._refundOf.date)}`:""}
                                    </div>
                                  )}
                                  <div style={{color:T.txt2,fontSize:descFS,...wrap}}>
                                    <span style={{color:T.gold,fontWeight:700}}>PayPal {dshort(lr.isoDate)}:</span> {lr.desc}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {showExpenses&&(
              <div style={{order:1}}>
                {showBoth&&<div style={{color:T.neg,fontSize:MFSl,fontWeight:800,letterSpacing:"0.04em",textTransform:"uppercase",opacity:0.85,padding:"6px 2px 3px"}}>Ausgaben ({shownSuggs.length})</div>}
                {shownSuggs.length===0&&(
                <div style={{color:T.txt2,fontSize:MFSl,padding:"10px 2px"}}>
                  Keine Vorschläge für die aktuelle Auswahl{suggSearch?` (Suche „${suggSearch}")`:""}.
                </div>
              )}
              {shownSuggs.map((s,si)=>{
                const r = parsed.newRows[s.rowIdx];
                const confColor = s.confidence==="hoch"?T.pos:s.confidence==="mittel"?T.gold:T.txt2;
                const accepted = (parsed.acceptedSuggs||[]).some(a=>a.rowIdx===s.rowIdx&&a.giroId===s.giroTx.id);
                const ppAmt = Math.abs(pn(r.amount ?? r.totalAmount ?? 0));
                const isExpense = (r.amount ?? r.totalAmount ?? 0) < 0;
                // Schriftgrößen — auf dem iPhone 13 mini gut lesbar, im Vollbild größer.
                const amtFS  = autoSuggFull ? (mobileMode?22:17)   : (mobileMode?17:13.5);
                const descFS = autoSuggFull ? (mobileMode?15:13.5) : (mobileMode?14:11.5);
                const metaFS = autoSuggFull ? (mobileMode?13:11.5) : (mobileMode?12:10);
                const wrapStyle = autoSuggFull
                  ? {whiteSpace:"normal",overflow:"visible",wordBreak:"break-word"}
                  : {overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
                return (
                  <div key={si} style={{display:"flex",flexDirection:"column",gap:3,
                    padding:autoSuggFull?"11px 2px":"8px 2px",
                    borderBottom:`1px solid rgba(255,255,255,0.06)`,
                    background:accepted?"rgba(34,197,94,0.07)":"transparent"}}>
                    {/* Zeile 1: Betrag (nur einmal) | Datum Giro · Datum PayPal */}
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                      <div style={{flex:1,minWidth:0,color:isExpense?T.neg:T.pos,fontSize:amtFS,
                        fontWeight:800,fontFamily:NUM_FONT}}>
                        {isExpense?"−":"+"} {fmt(ppAmt)}
                      </div>
                      <div style={{flexShrink:0,color:T.txt2,fontSize:metaFS,textAlign:"right"}}>
                        Giro {dshort(s.giroTx.date)} · PayPal {dshort(r.isoDate)}
                      </div>
                    </div>
                    {/* Zeile 2: Konfidenz · ±Tage (+ Grund) | übernehmen */}
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,minWidth:0,display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                        <span style={{color:confColor,fontSize:autoSuggFull?14:12,fontWeight:800}}>{s.confidence}</span>
                        <span style={{color:T.txt2,fontSize:metaFS}}>±{s.diffDays} Tage</span>
                        {s.reason&&<span style={{color:T.txt2,fontSize:metaFS,opacity:0.85}}>· {s.reason}</span>}
                      </div>
                      <button onClick={()=>{
                        // Vorschlag als manuelle Verknüpfung übernehmen — wird in doImport angewendet.
                        setParsed(p=>({...p,
                          acceptedSuggs: [...(p.acceptedSuggs||[]), {rowIdx:s.rowIdx, giroId:s.giroTx.id}]
                        }));
                      }}
                        disabled={accepted}
                        style={{flexShrink:0,background:accepted?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.06)",
                          border:`1px solid ${accepted?T.pos:T.bd}`,
                          borderRadius:8,padding:autoSuggFull?"6px 13px":"4px 10px",
                          fontSize:autoSuggFull?13:11,fontWeight:700,cursor:accepted?"default":"pointer",
                          color:accepted?T.pos:T.txt2,fontFamily:"inherit"}}>
                        {accepted?"✓ übernommen":"übernehmen"}
                      </button>
                    </div>
                    {/* Zeile 3: Giro-Buchung = „die Wahrheit" */}
                    <div style={{color:T.txt,fontSize:descFS,fontWeight:600,...wrapStyle}}>
                      <span style={{color:T.blue,fontWeight:700}}>Giro:</span> {s.giroTx.desc}
                    </div>
                    {/* Zeile 4: PayPal-Buchung = Detail-Infos */}
                    <div style={{color:T.txt2,fontSize:descFS,...wrapStyle}}>
                      <span style={{color:T.gold,fontWeight:700}}>PayPal:</span>{" "}
                      {r._enrichedMerchant?`${r._enrichedMerchant}${r._enrichedPlus30?" · via +30":""} — `:""}{r.desc}
                    </div>
                  </div>
                );
              })}
              </div>
              )}
              </div>
            </div>
          )}

          {parsed.newRows.length===0?(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24}}>
              {Li("check-circle",40,T.pos)}
              <div style={{color:T.blue,fontSize:MFS,fontWeight:700}}>Alles bereits importiert</div>
              <div style={{color:T.txt2,fontSize:MFS,textAlign:"center"}}>Alle {parsed.dupRows.length} Buchungen sind bereits in deiner App vorhanden.</div>
              <button onClick={onClose} style={{padding:"12px 32px",borderRadius:11,border:"none",background:T.blue,color:T.on_accent,fontSize:MFS,fontWeight:700,cursor:"pointer",marginTop:8,fontFamily:"inherit"}}>Schließen</button>
            </div>
          ):(
            <>
              {/* ── Suche + Massenauswahl (nur wenn Kategorisieren aktiv) ── */}
              {showCatAssign&&!suggFull&&<div style={{padding:"8px 16px 6px",flexShrink:0,display:"flex",gap:8,alignItems:"center"}}>
                <input
                  value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Suchen (Empfänger, Verwendungszweck…)"
                  style={{flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.bds}`,
                    borderRadius:9,padding:"7px 11px",color:T.txt,fontSize:MFSl,outline:"none"}}
                />
                {search&&<button onClick={()=>setSearch("")}
                  style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",fontSize:MFS,flexShrink:0}}>{Li("x",13)}</button>}
              </div>}
              {/* Massenauswahl für gefilterte Zeilen */}
              {search&&!suggFull&&(()=>{
                const matchIdx = parsed.newRows
                  .map((r,i)=>({r,i}))
                  .filter(({r})=>{
                    const isAmt = /^[=<>]?[\d.,]+$/.test(search.trim());
                    if(isAmt) return matchAmount(Math.abs(pn(r.amount||r.totalAmount||0)), search);
                    return matchSearch(r.desc,search);
                  })
                  .map(({i})=>i);
                if(matchIdx.length===0) return null;
                return (
                  <div style={{padding:"6px 16px 8px",flexShrink:0,background:"rgba(74,159,212,0.08)",
                    borderBottom:`1px solid ${T.bd}`,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{color:T.blue,fontSize:MFSl,fontWeight:600,flexShrink:0}}>
                      {matchIdx.length} Treffer – alle auf einmal:
                    </span>
                    <div style={{flex:1,minWidth:120}}>
                      <CatPicker value={bulkCat.catId+"|"+bulkCat.subId}
                        onChange={(c,s)=>setBulkCat({catId:c,subId:s})}
                        placeholder="— Kategorie wählen —"
                        filterType={(()=>{
                          // Typ aus den Treffer-Zeilen ableiten
                          const types = matchIdx.map(i=>parsed.newRows[i]?.amount>0?"income":"expense");
                          const allIncome = types.every(t=>t==="income");
                          const allExpense = types.every(t=>t==="expense");
                          return allIncome?"income":allExpense?"expense":null;
                        })()}/>
                    </div>
                    <button
                      disabled={!bulkCat.catId}
                      onClick={()=>{
                        if(!bulkCat.catId) return;
                        setAssign(p=>{
                          const next={...p};
                          matchIdx.forEach(i=>{ next[i]={catId:bulkCat.catId,subId:bulkCat.subId}; });
                          return next;
                        });
                        setBulkCat({catId:"",subId:""});
                      }}
                      style={{background:bulkCat.catId?T.blue:T.disabled,
                        border:"none",borderRadius:8,padding:"6px 14px",color:"#fff",
                        fontSize:MFSl,fontWeight:700,cursor:bulkCat.catId?"pointer":"default",
                        opacity:bulkCat.catId?1:0.4,flexShrink:0}}>
                      Alle zuweisen ✓
                    </button>
                  </div>
                );
              })()}
              {!suggFull&&<div style={{color:T.txt2,fontSize:MFSl,padding:"6px 16px 4px",flexShrink:0}}>
                {showCatAssign
                  ? (search
                      ? `${parsed.newRows.filter(r=>matchSearch(r.desc,search)).length} von ${parsed.newRows.length} Buchungen`
                      : "Kategorie zuweisen – die App merkt sich die Regel für gleiche Empfänger:")
                  : `${parsed.newRows.length} Buchungen werden ohne Kategorie importiert – du kannst sie später unter Erfassen → Buchungen kategorisieren.`}
              </div>}
              <div style={{flex:suggFull?"0 0 0px":1,overflowY:"auto",display:suggFull?"none":"block"}}>
                {parsed.newRows.filter(r=>{
                  if(!search) return true;
                  const isAmt = /^[=<>]?[\d.,]+$/.test(search.trim());
                  if(isAmt) return matchAmount(Math.abs(pn(r.amount||r.totalAmount||0)), search);
                  return matchSearch(r.desc,search);
                }).map((r,i)=>{
                  // Get original index for assign
                  const origIdx = parsed.newRows.indexOf(r);
                  const a = assign[origIdx]||{catId:"",subId:""};
                  const isPos = r.amount > 0;
                  return (
                    <div key={origIdx} style={{padding:"8px 16px",borderBottom:`1px solid ${T.bd}`,background:origIdx%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:showCatAssign?4:0}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:T.txt,fontSize:MFSl,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.desc}</div>
                          <div style={{color:T.txt2,fontSize:10,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                            <span>{r.isoDate}</span>
                            {r._paypalRows>1&&<span style={{color:T.gold,fontSize:9,fontWeight:700,
                              background:(isLightTheme())?"rgba(192,120,0,0.18)":"rgba(245,166,35,0.15)",borderRadius:4,padding:"0 4px"}}>
                              {r._paypalRows} Zeilen zusammengefasst{r._paypalTypes?" · "+r._paypalTypes:""}
                            </span>}
                            {r._detailNote&&<span style={{color:T.blue,fontSize:9,fontWeight:600,
                              background:"rgba(74,159,212,0.1)",borderRadius:4,padding:"0 4px"}}>
                              📋 {r._detailNote.slice(0,60)}{r._detailNote.length>60?"…":""}
                            </span>}
                          </div>
                        </div>
                        <div style={{color:isPos?T.pos:T.neg,fontSize:MFS,fontWeight:700,fontFamily:NUM_FONT,flexShrink:0,whiteSpace:"nowrap"}}>
                          {isPos?"+ ":"− "}{Math.abs(r.amount).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                        </div>
                      </div>
                      {showCatAssign&&(()=>{
                        const rowAccId = r._resolvedAccId || selAccId || accounts[0]?.id;
                        const rowAcc = accounts.find(a=>a.id===rowAccId);
                        const isTgAcc = rowAcc?.name?.toLowerCase().includes("tagesgeld") || rowAccId?.includes("tagesgeld");
                        // Wichtig: filterType nach Vorzeichen, accountId für Konto-spezifische Gruppen.
                        // "tagesgeld" als filterType wäre zu eng (filtert nur Gruppen mit type/behavior==="tagesgeld").
                        const fType = isPos ? "income" : "expense";
                        return <CatPicker
                          value={a.catId+"|"+a.subId}
                          onChange={(catId,subId)=>setRowAssign(origIdx,catId,subId)}
                          placeholder={isTgAcc?"— Tagesgeld-Kategorie —":isPos?"— Einnahmen-Kategorie —":"— Ausgaben-Kategorie —"}
                          filterType={fType}
                          accountId={rowAccId}
                        />;
                      })()}
                    </div>
                  );
                })}
              </div>
              <div style={{padding:"12px 16px",flexShrink:0,borderTop:`1px solid ${T.bd}`,display:"flex",gap:8}}>
                <button onClick={()=>setStep("input")}
                  style={{flex:1,padding:"12px",borderRadius:11,border:`1px solid ${T.bds}`,background:"transparent",color:T.txt2,fontSize:MFS,cursor:"pointer"}}>
                  ← Zurück
                </button>
                <button onClick={doImport}
                  style={{flex:2,padding:"12px",borderRadius:11,border:"none",
                    background:T.pos,color:T.on_accent,fontSize:MFS,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {parsed.newRows.length} Buchungen importieren {showCatAssign?"mit Kategorien ✓":"→"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP: DONE */}
      {step==="done"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24,overflowY:"auto"}}>
          {Li("check-circle",48,T.pos)}
          <div style={{color:T.txt,fontSize:20,fontWeight:800}}>{doneCount} Buchungen importiert!</div>
          <div style={{color:T.txt2,fontSize:MFS,textAlign:"center"}}>Die Buchungen sind jetzt in deiner App. Kategorieregeln wurden für zukünftige Importe gespeichert.</div>

          {/* Erkannte Kontostände wurden als Ankerpunkte gesetzt */}
          {(() => {
            const dbs = (parsed?.detectedBalances && parsed.detectedBalances.length)
              ? parsed.detectedBalances
              : (parsed?.detectedBalance?.date ? [parsed.detectedBalance] : []);
            if(dbs.length === 0) return null;
            const isMulti = dbs.length > 1;
            return (
              <div style={{background:"rgba(170,204,0,0.10)",border:"1px solid rgba(170,204,0,0.35)",
                borderRadius:11,padding:MPad,width:"100%",maxWidth:380,display:"flex",gap:10,alignItems:"flex-start"}}>
                {Li("landmark",16,T.pos)}
                <div style={{flex:1}}>
                  <div style={{color:T.pos,fontSize:MFSl,fontWeight:700,marginBottom:2}}>
                    {isMulti ? `${dbs.length} Kontostand-Ankerpunkte gesetzt` : "Kontostand-Ankerpunkt gesetzt"}
                  </div>
                  <div style={{color:T.txt2,fontSize:MFSl,lineHeight:1.5}}>
                    {isMulti ? "Aus der CSV wurden folgende Kontostände automatisch als Ankerpunkte gespeichert:" : "Aus der CSV wurde der Kontostand vom "}
                    {!isMulti && (<>
                      <span style={{color:T.txt,fontWeight:700}}>
                        {dbs[0].date.split("-").reverse().join(".")}
                      </span>{" "}
                      (<span style={{color:T.pos,fontFamily:NUM_FONT,fontWeight:700}}>
                        {dbs[0].saldo.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                      </span>) automatisch als Ankerpunkt gespeichert.
                    </>)}
                  </div>
                  {isMulti && (
                    <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
                      {dbs.map((db,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:MFSl}}>
                          <span style={{color:T.txt,fontWeight:600}}>{db.date.split("-").reverse().join(".")}</span>
                          <span style={{color:T.pos,fontFamily:NUM_FONT,fontWeight:700}}>
                            {db.saldo.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Warnung: Vormonat-Ankerpunkt fehlt */}
          {anchorWarning && (
            <div style={{background:"rgba(245,166,35,0.10)",border:"1px solid rgba(245,166,35,0.4)",
              borderRadius:11,padding:MPad,width:"100%",maxWidth:380,display:"flex",gap:10,alignItems:"flex-start"}}>
              {Li("alert-triangle",16,T.gold)}
              <div style={{flex:1}}>
                <div style={{color:T.gold,fontSize:MFSl,fontWeight:700,marginBottom:3}}>
                  Kontostand für Vormonat fehlt
                  {anchorWarning.accName&&<span style={{color:T.gold,fontWeight:400,marginLeft:4,fontSize:10}}>({anchorWarning.accName})</span>}
                </div>
                <div style={{color:T.txt2,fontSize:MFSl,lineHeight:1.6}}>
                  Die früheste importierte Buchung stammt aus{" "}
                  <span style={{color:T.txt,fontWeight:700}}>
                    {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.firstMonth]} {anchorWarning.firstYear}
                  </span>.
                  Damit der Kontostand{anchorWarning.accName?` (${anchorWarning.accName})`:""} ab diesem Monat korrekt berechnet werden kann, wird der
                  Endkontostand von{" "}
                  <span style={{color:T.txt,fontWeight:700}}>
                    {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.prevMonth]} {anchorWarning.prevYear}
                  </span>{" "}
                  benötigt.
                </div>
                <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{color:T.txt2,fontSize:10,display:"flex",gap:6,alignItems:"flex-start"}}>
                    <span style={{color:T.gold,flexShrink:0}}>①</span>
                    <span>Den Endkontostand von{" "}
                      <span style={{color:T.txt,fontWeight:600}}>
                        {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.prevMonth]} {anchorWarning.prevYear}
                      </span>{" "}
                      oben unter <span style={{color:T.blue,fontWeight:600}}>Kontostand-Ankerpunkte</span> eintragen (Konto: {anchorWarning.accName||"gewähltes Konto"}).
                    </span>
                  </div>
                  <div style={{color:T.txt2,fontSize:10,display:"flex",gap:6,alignItems:"flex-start"}}>
                    <span style={{color:T.gold,flexShrink:0}}>②</span>
                    <span>Oder: Den CSV-Export für{" "}
                      <span style={{color:T.txt,fontWeight:600}}>
                        {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][anchorWarning.prevMonth]} {anchorWarning.prevYear}
                      </span>{" "}
                      importieren — der Kontostand wird dann automatisch erkannt.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={()=>{setCsvText("");setParsed(null);setStep("input");setAnchorWarning(null);}}
            style={{padding:"12px 24px",borderRadius:11,border:`1px solid ${T.bds}`,background:"transparent",color:T.blue,fontSize:MFS,fontWeight:600,cursor:"pointer"}}>
            Weiteren Import
          </button>
          <button onClick={onClose}
            style={{padding:"12px 32px",borderRadius:11,border:"none",background:T.blue,color:"#fff",fontSize:MFS,fontWeight:700,cursor:"pointer"}}>
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}



// ══════════════════════════════════════════════════════════════════════
// QuickPicker – Schnellwahl verwalten mit allen Lucide-Icons
// ══════════════════════════════════════════════════════════════════════

export { CsvImportScreen };
