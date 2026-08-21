// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useRef, useState } from "react";
import { CatPicker } from "../molecules/CatPicker.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, GEFAHR } from "../../theme/activeTheme.js";
import { fmt, uid, NUM_FONT } from "../../utils/format.js";
import { betrag, betragText } from "../../utils/betrag.jsx";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
import { noteSparWatermark } from "../../utils/sparWatermarks.js";
import { buildTxIdMap } from "../../utils/tx.js";
import { sparPlanPflege, heuteIsoVon } from "../../utils/sparPlanPflege.js";
import { recordDeletedTxs } from "../../utils/txTombstones.js";
import { computeMinTagessaldo, computeTagessaldoAt, buildTxsByMonth, sparPlanOptimum,
  tiefpunktImFenster } from "../../utils/sparBerechnen.js";
import { knopfPaar, DUNKEL, HELL } from "../../theme/amtPill.js";
import { AMPEL } from "../../utils/syncBadge.js";
import { DEFAULT_ZINS_MONATE, parseZinsMonate, serializeZinsMonate,
  zinsTermine, sweepFenster, computeSweep, ohneSweepBuchungen, sweepFuerMonat,
  SWEEP_RUECK_DESC } from "../../utils/zinsSweep.js";
import { parseZinssatz, vorigerZinsTermin, tageZwischen, zinsVergleich } from "../../utils/zinsErtrag.js";

function TagesgeldWidget({year, month, initialCollapsed=true}) {
  const {  getKumulierterSaldo, txs, setTxs, cats, accounts, setAccounts, getAcc, budgets, getCat, getBudgetForMonth, selAcc, getProgEndeAccGlobal, resetProgEndeCache, sparOpenRequest, frageBestaetigung } = useContext(AppCtx);
  const MONTHS_G=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  // Ein Feld-Stil für ALLE Eingaben/Auswahlen im Widget (Planname, Puffer,
  // Vorschau, Monate, Abgang/Zugang) — vorher nutzten die oberen Felder das
  // generische INP (leicht aufgehelltes Weiß-Overlay, Radius 11) und die
  // untere "Vormerkungsserie anlegen"-Karte eigene, flachere Werte (Radius 8,
  // Grundfarbe T.surf2) — dadurch wirkte der Dialog wie aus zwei Stilen
  // zusammengesetzt (Nutzer-Feedback). Jetzt einheitlich das dezente, flache
  // T.surf2-Grau statt des Overlays.
  // fontSize:16 (nicht kleiner!) — echte <input>/<select>-Elemente werden von
  // der globalen iOS-Zoom-Schutzregel (input,select,textarea{font-size:16px
  // !important}, siehe themes.css) ohnehin auf 16px erzwungen; ein kleinerer
  // Wert hier wäre wirkungslos. Damit das feste "Giro"-<span> (davon NICHT
  // betroffen) optisch dazu passt, bekommt es hier bewusst denselben Wert.
  // Einheitliche Spaltenbreiten und Feldhöhe für die Konfig-Karte: nur mit
  // festen Werten beginnen die Felder aller Zeilen an derselben Stelle und
  // sind gleich hoch. Die Höhe MUSS gesetzt sein (statt sie aus dem Padding
  // entstehen zu lassen) — <input type="date"> und <select> bringen je nach
  // Browser eigene Innenabstände mit und wären sonst unterschiedlich hoch.
  const LBL_W = 62, KTO_W = 56, FELD_H = 34;
  const FIELD = {background:T.surf2, border:`1px solid ${T.bd}`, borderRadius:10,
    padding:"0 8px", height:FELD_H, fontSize:16, color:T.txt, fontFamily:"inherit",
    outline:"none", boxSizing:"border-box"};
  // Beschriftungen und Erklärtexte in T.txt statt T.txt2: auf der dunklen
  // Karte (rgba(0,0,0,0.15) über T.surf2) war das gedämpfte Grau kaum noch
  // lesbar (Nutzer-Feedback).
  const LBL = {color:T.txt, fontSize:12};
  const ZENTRIERT = {display:"flex", alignItems:"center", justifyContent:"center", padding:0};
  // Der CatPicker-Auslöser bringt eigene Werte mit (padding 5/10, Radius 10,
  // hellerer Overlay-Hintergrund) — ohne Angleich wirken die beiden
  // Kategorie-Zeilen flacher und anders eingefärbt als die übrigen Felder.
  // Den Rahmen lässt der Picker bewusst selbst: er färbt ihn blau, sobald eine
  // Kategorie gewählt ist — ein nützlicher Hinweis, den ein Überschreiben
  // schlucken würde. Zusätzlich noMargin, sonst hängt unter jedem Picker ein
  // marginBottom von 8px und die Zeilenabstände wären ungleich.
  const TRIGGER = {fontSize:16, height:FELD_H, padding:"0 8px", borderRadius:10,
    background:T.surf2, boxSizing:"border-box"};

  // Mindest-Puffer aus acc-giro.minPuffer (Quelle der Wahrheit)
  const giroAcc = accounts.find(a=>a.id==="acc-giro");
  const puffer = giroAcc?.minPuffer || 0;
  const setPuffer = (v) => {
    const n = parseInt(v)||0;
    setAccounts(p=>p.map(a=>a.id==="acc-giro"?{...a, minPuffer:n}:a));
  };
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  React.useEffect(()=>{ if(sparOpenRequest>0) setCollapsed(false); }, [sparOpenRequest]);
  // Die Vorschau-Tabelle liegt lokal im kvStore — sonst stünde sie nach jedem
  // Neuladen leer da. Der Haken daran hat den Nutzer echtes Vertrauen gekostet:
  // `resultOutdated` reagiert nur auf Horizont und Puffer, NICHT auf geänderte
  // Buchungen und schon gar nicht auf eine geänderte Rechenregel. Als die
  // Automatik die neue Regel bekam (11261788) und die Vorschau noch die alte
  // hatte, zeigte die Tabelle weiter ihren alten Stand (103 €), während in den
  // Buchungen längst der neue stand (583 €) — und sah dabei aktuell aus.
  //
  // Deshalb ein Stempel: Wird die Regel geändert, wird VORSCHAU_REGEL erhöht;
  // gespeicherte Tabellen älterer Stände werden dann nicht mehr angezeigt,
  // sondern verworfen und neu gerechnet. Eine Zahl, der man nicht ansieht, wie
  // alt sie ist, ist schlimmer als gar keine.
  // 2 = Fenster ab Ratentermin (sparPlanOptimum)
  // 3 = „nach Sparen" im Fenster gemessen statt Monats-Tiefstand minus Rate
  // 4 = Abdruck der Daten mitgespeichert (siehe unten)
  const VORSCHAU_REGEL = 4;

  // ── Und ein Abdruck der DATEN, aus denen die Tabelle entstand ────────
  //
  // Der Stempel oben fängt nur die eine Hälfte: eine geänderte Rechenregel.
  // Die andere Hälfte sind geänderte BUCHUNGEN — und die war der eigentliche
  // Befund: „Ich habe testweise eine Vormerkung über 3.000 € erstellt und bin
  // in den Sparplan. Da wurde aber nichts geändert oder nach Aufruf neu
  // berechnet."
  //
  // Ein erster Versuch hing an einem Effekt, der auf `txs` horcht. Der kann
  // gar nicht greifen: Das Widget ist nur eingehängt, solange das Sparen-Panel
  // OFFEN ist (siehe DashboardScreenV2). Wer eine Vormerkung anlegt, tut das
  // bei geschlossenem Panel — es gibt niemanden, der etwas mitbekommt. Und
  // beim nächsten Öffnen startet die Komponente frisch: Sie liest die
  // gespeicherte Tabelle und hat keinerlei Anhalt, dass sie veraltet ist.
  //
  // Deshalb muss die Tabelle SELBST wissen, woraus sie entstanden ist. Der
  // Abdruck wird mitgespeichert und beim Öffnen gegen den heutigen Stand
  // gehalten. Passt er nicht, wird gerechnet — ohne Knopfdruck.
  // (Die Funktion selbst steht weiter unten — sie liest `monate`,
  // `sparPlanName` und `sparAccId`, und deren Deklarationen kommen erst
  // danach. Die Abhaengigkeitsliste eines useCallback wird SOFORT ausgewertet;
  // hier oben gaebe das einen ReferenceError. Dieselbe TDZ-Falle wie bei
  // `sparOptimum` in App.jsx.)

  const gespeichert = (()=>{ try {
    const s=kvStore.getItem("mbt_spar_result");
    if(!s) return null;
    const p=JSON.parse(s);
    if(Array.isArray(p)) return null;                  // Stand vor dem Stempel
    return p && p.regel===VORSCHAU_REGEL ? p : null;
  } catch{return null;} })();
  const [result,    setResultState]   = useState(()=>gespeichert ? gespeichert.rows : null);
  const resultRef = React.useRef(result);
  // Der Abdruck, zu dem die gerade angezeigte Tabelle gehört.
  const abdruckRef = React.useRef(gespeichert ? (gespeichert.abdruck||null) : null);
  const setResult = (v) => {
    resultRef.current = v; setResultState(v);
    try {
      if(v) {
        const abdruck = datenAbdruck();
        abdruckRef.current = abdruck;
        kvStore.setItem("mbt_spar_result", JSON.stringify({regel:VORSCHAU_REGEL, abdruck, rows:v}));
      } else { abdruckRef.current = null; kvStore.removeItem("mbt_spar_result"); }
    } catch{}
  };
  const [resultOutdated, setResultOutdated] = useState(false);
  const [computing, setComputing]= useState(false);
  const [monate,    setMonate]   = useState(()=>parseInt(kvStore.getItem("mbt_sparen_monate")||"3"));
  const [sparCatId, setSparCatId]   = useState(()=>kvStore.getItem("mbt_spar_catid")||"");
  const [sparSubId, setSparSubId]   = useState(()=>kvStore.getItem("mbt_spar_subid")||"");
  const [sparAccId, setSparAccId]   = useState(()=>kvStore.getItem("mbt_spar_accid")||"");
  const [sparPlanName, setSparPlanName] = useState(()=>kvStore.getItem("mbt_spar_planname")||"Sparplan 1");
  // ── Zins-Sweep („Mega-Sparrate") — rein informativ ────────────────────
  // Zeigt als zusätzliche Tabellenspalte, wie viel zum Zinsstichtag kurzfristig
  // aufs Tagesgeld geschoben werden kann, ohne am nächsten Banktag in
  // Schieflage zu geraten.
  //
  // Diese drei Einstellungen stehen bewusst HIER OBEN, vor `datenAbdruck`:
  //
  //   * Alle drei entwerten die Vorschau-Tabelle — sie zeigt in jedem
  //     Zinsmonat das Mega-Sparraten-Band und (seit dem Zinssatz) den
  //     Zinsvergleich. Sie gehören deshalb in den Abdruck; nur was dort
  //     einfließt, löst ein Nachrechnen aus.
  //   * Ein bloßes `setResultOutdated(true)` im Setzer reichte NICHT: Seit der
  //     „Neuberechnen"-Knopf weg ist, rechnet einzig der Abdruck-Effekt nach.
  //     Eine Einstellung, die nur „veraltet" setzt, ließe die Tabelle für
  //     immer unscharf stehen — unter einer Meldung „wird neu berechnet", die
  //     niemand einlöst.
  //   * Die Abhängigkeitsliste eines `useCallback` wird beim ERSTEN Rendern
  //     ausgewertet. Stünden sie unter `datenAbdruck`, griffe sie auf noch
  //     nicht angelegte Bindungen zu (temporale Todeszone — genau daran ist
  //     die App in dieser Sitzung schon einmal abgestürzt).
  const [zinsMonate, setZinsMonateState] = useState(
    ()=>parseZinsMonate(kvStore.getItem("mbt_zins_monate")) ?? DEFAULT_ZINS_MONATE);
  const setZinsMonate = (arr) => {
    const next = [...new Set(arr)].sort((a,b)=>a-b);
    setZinsMonateState(next);
    kvStore.setItem("mbt_zins_monate", serializeZinsMonate(next));
  };
  const toggleZinsMonat = (m) =>
    setZinsMonate(zinsMonate.includes(m) ? zinsMonate.filter(x=>x!==m) : [...zinsMonate, m]);
  // Rechnet damit, dass die Rückbuchung am Rückbuchungstag selbst erfolgt und
  // hausintern sofort gutgeschrieben wird. Standardmäßig AUS: der höhere
  // Betrag setzt voraus, dass an genau diesem Tag zurücküberwiesen wird.
  const [sofortRueck, setSofortRueckState] = useState(
    ()=>kvStore.getItem("mbt_zins_sofortrueck")==="1");
  const setSofortRueck = (v) => {
    setSofortRueckState(v);
    kvStore.setItem("mbt_zins_sofortrueck", v?"1":"0");
  };
  // Der Zinssatz des Tagesgeldkontos, in % p.a. Als TEXT im Zustand, nicht als
  // Zahl: Sonst lässt sich „2," nicht tippen — der Zwischenstand wäre keine
  // gültige Zahl und das Komma spränge beim Tippen wieder weg. Gerechnet wird
  // mit `zinssatz` (geparst), gezeigt wird `zinssatzText`.
  const [zinssatzText, setZinssatzText] = useState(
    ()=>kvStore.getItem("mbt_zins_satz") || "");
  const zinssatz = parseZinssatz(zinssatzText);
  const setZinssatz = (roh) => {
    setZinssatzText(roh);
    kvStore.setItem("mbt_zins_satz", roh);
  };

  // Der Abdruck der Daten, aus denen eine Tabelle entstand (siehe oben).
  const datenAbdruck = React.useCallback(() => {
    // FNV-1a über die Felder, die den Plan bewegen. Ein String über alle
    // Buchungen wäre bei mehreren tausend Einträgen unnötig Speicher.
    let h = 2166136261;
    const misch = (v) => {
      const s = String(v ?? "");
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      h ^= 0x2c; h = Math.imul(h, 16777619);      // Trenner: "1|2" ≠ "12|"
    };
    (txs||[]).forEach(t => {
      misch(t.id); misch(t.date); misch(t.totalAmount);
      misch(t.pending?1:0); misch(t.accountId); misch(t.desc);
    });
    try { misch(JSON.stringify(budgets||{})); } catch { /* egal */ }
    misch(puffer); misch(monate); misch(sparPlanName); misch(sparAccId);
    // Die Zins-Einstellungen gehören dazu: Sie ändern das Mega-Sparraten-Band
    // und den Zinsvergleich in JEDEM Zinsmonat der Tabelle.
    misch(serializeZinsMonate(zinsMonate)); misch(sofortRueck?1:0); misch(zinssatzText);
    return (h>>>0).toString(36);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, budgets, puffer, monate, sparPlanName, sparAccId,
      zinsMonate, sofortRueck, zinssatzText]);

  // Nach programmatischem Setzen (Dropdown-Auswahl) bleibt scrollLeft bei 0 —
  // text-align:right allein wirkt sich NICHT auf die Scroll-Position eines
  // <input> aus (nur auf die Ausrichtung bei Restplatz). Ohne diesen Ref bliebe
  // bei einem langen Plan-Namen der ANFANG sichtbar und das (aussagekräftigere)
  // Ende unsichtbar abgeschnitten.
  const planNameInputRef = useRef(null);
  const scrollPlanNameToEnd = () => {
    requestAnimationFrame(() => {
      const el = planNameInputRef.current;
      if (el) el.scrollLeft = el.scrollWidth;
    });
  };
  // Einheitlicher sparDesc-Builder — nur vom Plannamen abhängig
  const buildSparDesc = (name) => "Sparen·"+(name||"Plan");
  // „2026-12-31" → „31.12."  — kurz, weil das Jahr in der Zeile schon steht.
  const kurzTag = (iso) => { const p = String(iso).split("-"); return p.length === 3 ? `${p[2]}.${p[1]}.` : String(iso); };
  // ── Farben der Super-Sparraten-Zeile ──────────────────────────────────
  //
  // VOLLE Signalfläche in Sonnengelb, keine Tönung (Nutzer-Wunsch — dieselbe
  // Entscheidung wie beim Sync-Hinweis: „einfache, klare Farben").
  //
  // Eine Tönung war der erste Versuch und ging aus zwei Gründen nicht auf:
  //
  //   * Über 34 Themes ergab derselbe Alpha-Wert mal Oliv, mal Senf, mal
  //     einen kaum sichtbaren Hauch. Gemessen erreichte das Band gegen die
  //     Monatszeile nur 1,10:1 — als Hervorhebung zu wenig.
  //   * In „Tastenhell" sind Zeile und Band dieselbe Taste, sobald man das
  //     Band als Karte auszeichnet; die Tönung wäre dort restlos weggebügelt
  //     worden (1,00:1 gemessen).
  //
  // Eine deckende Fläche bringt ihren Untergrund selbst mit — damit ist beides
  // erledigt: Sie sieht in jedem Theme gleich aus, und die Schrift lässt sich
  // dagegen ausrechnen statt gegen eine Mischung, die vom Theme abhängt.
  //
  // Das Sonnengelb kommt aus `syncBadge.js`, damit es in der ganzen App EIN
  // Sonnengelb gibt und nicht zwei, die auseinanderdriften.
  //
  // `knopfPaar` rechnet die Schrift dagegen und rückt die Fläche im
  // Ausnahmefall minimal nach; auf diesem Gelb landet dunkle Schrift bei rund
  // 11:1. Farbige Töne (Lime, Gold) tragen darauf NICHT — die Unterscheidung
  // der beiden Beträge macht deshalb die Fettung, nicht die Farbe.
  const sweepPaar = () => knopfPaar(AMPEL.gelb, DUNKEL);
  const sweepGrund = () => sweepPaar().grund;
  const sweepFarbe = () => sweepPaar().schrift;
  // Der „Entfernen"-Knopf beim Hinweis auf überfällige Raten: dieselbe
  // Rechnung, damit die Schrift auf dem Gold in JEDEM Theme trägt, statt sich
  // auf ein festes Schwarz zu verlassen.
  const pflegePaar = () => knopfPaar(T.gold, DUNKEL);
  // Das Statusband „wird neu berechnet": informierend, nicht warnend —
  // deshalb der blaue Akzent und nicht Gold. Schrift wie ueberall gerechnet.
  const rechnePaar = () => knopfPaar(T.blue, HELL);
  // Zwischen dem Erkennen einer Aenderung und dem Rechnen liegen 450 ms
  // Sammelpause (siehe der Abdruck-Effekt oben). Beides zusammen ist „die
  // Tabelle gilt gerade nicht".
  const rechnetNeu = computing || resultOutdated;
  // Bestehende Sparplan-Series für aktuellen Plannamen finden
  const findExistingSeries = (name) => {
    const desc = buildSparDesc(name);
    const series = txs.filter(t=>t.pending&&!t._linkedTo&&t.desc===desc&&t._seriesId&&t.accountId==="acc-giro");
    const ids = [...new Set(series.map(t=>t._seriesId))];
    return {desc, series, seriesIds:ids};
  };
  const [sparTgtCatId, setSparTgtCatId] = useState(()=>kvStore.getItem("mbt_spar_tgt_catid")||"");
  const [sparTgtSubId, setSparTgtSubId] = useState(()=>kvStore.getItem("mbt_spar_tgt_subid")||"");

  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const nowY=new Date().getFullYear(), nowM=new Date().getMonth();
  const isCurr = year===nowY && month===nowM;

  // ── Caches — müssen vor jedem return stehen (React Hook-Regel) ────────
  const minTagCache = React.useRef({});
  // Zins-Sweep je Zinstermin. Ohne diesen Cache würde die Tabelle bei einem
  // langen Vorschauzeitraum (Dirk: 77 Monate → ~26 Quartalstermine à ~3 Tage)
  // bei JEDEM Render rund 80 Tagessalden neu durchrechnen.
  const sweepCache = React.useRef({key:null, wert:null});
  React.useEffect(()=>{ minTagCache.current = {}; sweepCache.current = {key:null, wert:null}; }, [txs, selAcc]);
  const [progress, setProgress] = useState(0);

  // ── Mega-Sparrate zum nächsten Zinstermin ─────────────────────────────
  // Nur der NÄCHSTE Stichtag wird gerechnet — das ist der einzige, an dem
  // gehandelt wird. Spätere hingen ohnehin an Annahmen, die sich bis dahin
  // mehrfach ändern, und kosteten unnötig Rechenzeit.
  //
  // Bewusst NICHT während des Renders: computeTagessaldoAt läuft über das
  // Fenster Stichtag→nächster Banktag und geht dabei durch den kompletten
  // Buchungsbestand. Im Render blockierte das spürbar das Öffnen des Panels.
  // Zusätzlich werden _txsById/_txsByMonth einmal gebaut und geteilt — ohne
  // diese Indizes scannt jeder Aufruf erneut alle Buchungen (derselbe Grund,
  // aus dem computeSafeCurrentMonthAmount sie vorab aufbaut).
  const [sweep, setSweep] = useState(null);
  const sweepAktiv = zinsMonate.length > 0;
  React.useEffect(() => {
    if(collapsed || !sweepAktiv) { setSweep(null); return; }
    const p2 = n=>String(n).padStart(2,"0");
    const heute = new Date();
    const heuteIso = `${heute.getFullYear()}-${p2(heute.getMonth()+1)}-${p2(heute.getDate())}`;
    const termin = zinsTermine(heuteIso, 1, zinsMonate)[0];
    if(!termin) { setSweep(null); return; }
    const key = `${termin}|${puffer}|${sparPlanName}|${sofortRueck?1:0}`;
    if(sweepCache.current.key === key) { setSweep(sweepCache.current.wert); return; }
    let abgebrochen = false;
    const id = requestAnimationFrame(() => {
      if(abgebrochen) return;
      // Auf dem NORMALISIERTEN Bestand rechnen: bereits gesetzte Sweep-
      // Buchungen müssen raus, sonst schrumpft der Betrag bei jedem Durchlauf.
      // getProgEndeAccGlobal bleibt hier bewusst weg — der App-Cache hängt an
      // den echten txs und würde den normalisierten Stand ignorieren.
      const reineTxs = ohneSweepBuchungen(txs);
      const ctx = { txs:reineTxs, cats, accounts, getKumulierterSaldo, getCat,
        getBudgetForMonth, _restCache:{},
        _txsById: buildTxIdMap(reineTxs), _txsByMonth: buildTxsByMonth(reineTxs) };
      const f = sweepFenster(termin);
      const salden = f.tage.map(d => ({date:d, saldo:computeTagessaldoAt(d, "acc-giro", ctx)}));
      // Die im Sparplan für diesen Monat vorgesehene Rate steckt im Tagessaldo
      // bereits drin; sie wird nur ausgewiesen, um die reale Gesamtüberweisung
      // und die davon abgeleitete Rückbuchung zu zeigen.
      const desc = buildSparDesc(sparPlanName);
      const pfx = termin.slice(0,8); // "YYYY-MM-"
      const rateTx = reineTxs.find(t => t.pending && !t._linkedTo && t.desc===desc
        && t.accountId==="acc-giro" && String(t.date).startsWith(pfx));
      const r = computeSweep({ salden, puffer, sofortRueck,
        normaleSparrate: rateTx ? Math.abs(rateTx.totalAmount) : 0 });
      if(abgebrochen) return;
      const wert = r ? {...r, termin, bis:f.bis} : null;
      sweepCache.current = {key, wert};
      setSweep(wert);
    });
    return () => { abgebrochen = true; cancelAnimationFrame(id); };
  }, [collapsed, sweepAktiv, zinsMonate, puffer, sparPlanName, txs, sofortRueck]);


  // Auto-Recompute beim ersten Öffnen des Panels (oder nach Dropdown-Auswahl),
  // wenn eine zum Plannamen passende Sparplan-Series in den Buchungen existiert,
  // aber kein lokal gecachtes Ergebnis vorliegt. Tritt z.B. auf, wenn die App
  // auf einem anderen Gerät / frischen Browser geöffnet wird — die Series-Daten
  // sind in txs persistiert, die Vorschau-Ergebnis-Tabelle nur per kvStore lokal.
  const didAutoLoadRef = React.useRef(false);
  React.useEffect(() => {
    if(!isCurr || collapsed) return;
    if(didAutoLoadRef.current) return;
    if(computing) return;
    if(result) { didAutoLoadRef.current = true; return; }
    const desc = `Sparen·${(sparPlanName||"").trim()}`;
    const hasSeries = txs.some(t => t.pending && !t._linkedTo && t._seriesId
      && t.accountId==="acc-giro" && t.desc===desc);
    if(!hasSeries) return;
    didAutoLoadRef.current = true;
    berechnen();
  }, [collapsed, result, sparPlanName, txs, computing]);

  // ── Der Plan muss den Buchungen folgen ───────────────────────────────
  //
  // Gemeldet: „Obwohl ich eben zum Test 2.000 € als Tagesgeld-Sparrate
  // vorgemerkt habe UND alles sofort in Schieflage gerät, ändert sich gar
  // nichts im Sparplan unterm Sparschwein."
  //
  // Zu Recht. Die Vorschau-Tabelle liegt lokal im kvStore, damit sie nach
  // einem Neuladen nicht leer ist — und wurde bis hierher NUR neu gerechnet,
  // wenn es noch gar keinen Stand gab oder man den Knopf drückte.
  // `resultOutdated` hing an genau zwei Dingen: Horizont und Puffer. Eine
  // geänderte Buchung — also das, was den Plan überhaupt bewegt — löste
  // nichts aus. Der Regel-Stempel (VORSCHAU_REGEL) hat davon nur die eine
  // Hälfte erwischt: eine geänderte RECHENREGEL. Die geänderten DATEN blieben
  // liegen.
  //
  // Verglichen wird der ABDRUCK, nicht ein Ereignis (siehe oben): Der erste
  // Versuch horchte auf `txs` und konnte deshalb gar nicht greifen — das
  // Widget ist nur eingehängt, solange das Panel offen ist, und eine
  // Vormerkung legt man bei geschlossenem Panel an.
  //
  // Deshalb läuft dieser Effekt AUCH beim ersten Rendern, ohne Ausnahme. Er
  // vergleicht, was die gespeicherte Tabelle sah, mit dem, was jetzt da ist.
  // Die Verzögerung fängt ganze Schübe ab (Sync, Serien-Anlage, die Automatik
  // in App.jsx) — sonst rechnete die Vorschau bei jeder einzelnen Buchung neu.
  React.useEffect(() => {
    if(!isCurr || collapsed) return;
    if(!resultRef.current) return;      // noch nichts da — das macht der Auto-Load
    const jetzt = datenAbdruck();
    if(abdruckRef.current === jetzt) return;
    setResultOutdated(true);
    const id = setTimeout(() => {
      abdruckRef.current = jetzt;       // vor dem Rechnen, sonst laeuft es doppelt
      setResultOutdated(false);
      berechnen();
    }, 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, datenAbdruck, accounts, cats]);

  // Wenn unter dem aktuellen Plannamen bereits eine Sparplan-Series existiert,
  // Kategorien / Zielkonto aus deren ersten Buchungen übernehmen. Sonst sieht
  // der User auf einem fremden Browser leere Felder, obwohl die Info in den
  // (gesyncten) txs liegt. Wir markieren pro Planname einmal als geladen, sobald
  // die Series gefunden wurde — danach respektieren wir spätere User-Änderungen.
  const lastLoadedPlanRef = React.useRef(null);
  React.useEffect(() => {
    if(lastLoadedPlanRef.current === sparPlanName) return;
    const desc = buildSparDesc(sparPlanName);
    const abgang = txs.find(t=>t.pending&&!t._linkedTo&&t.desc===desc&&t._seriesId&&t.accountId==="acc-giro");
    if(!abgang) return; // warten bis txs geladen / Series existiert
    lastLoadedPlanRef.current = sparPlanName;
    const split = abgang.splits?.[0];
    if(split?.catId && split.catId !== sparCatId) {
      setSparCatId(split.catId); kvStore.setItem("mbt_spar_catid", split.catId);
    }
    if(split && (split.subId||"") !== sparSubId) {
      setSparSubId(split.subId||""); kvStore.setItem("mbt_spar_subid", split.subId||"");
    }
    const zugang = txs.find(t=>t._linkedTo===abgang.id);
    if(zugang) {
      if(zugang.accountId && zugang.accountId !== sparAccId) {
        setSparAccId(zugang.accountId); kvStore.setItem("mbt_spar_accid", zugang.accountId);
      }
      const tgt = zugang.splits?.[0];
      if(tgt?.catId && tgt.catId !== sparTgtCatId) {
        setSparTgtCatId(tgt.catId); kvStore.setItem("mbt_spar_tgt_catid", tgt.catId);
      }
      if(tgt && (tgt.subId||"") !== sparTgtSubId) {
        setSparTgtSubId(tgt.subId||""); kvStore.setItem("mbt_spar_tgt_subid", tgt.subId||"");
      }
    }
  }, [sparPlanName, txs]);

  // Tagesgenauen Minimalsaldo eines Monats berechnen — Kernrechnung ausgelagert
  // nach utils/sparBerechnen.js (computeMinTagessaldo), damit dieselbe Logik
  // auch außerhalb des Widgets nutzbar ist (siehe App.jsx: automatische
  // Anpassung der laufenden Monatsrate bei Pufferunterschreitung). Hier nur
  // noch Cache + Standardkonto-Fallback (selAcc) obendrauf.
  // excludeSparDesc: wenn gesetzt, werden Sparplan-Buchungen mit diesem desc ignoriert
  // (für Neuberechnung eines bestehenden Sparplans)
  const getMinTagessaldo = (y, m, virtualSpar={}, accId, excludeSparDesc=null) => {
    // Cache nur ohne virtualSpar und ohne exclude sinnvoll
    const effSelAcc = accId !== undefined ? accId : selAcc;
    const key = (Object.keys(virtualSpar).length===0 && !excludeSparDesc) ? `${y}-${m}-${effSelAcc||"all"}` : null;
    if(key && key in minTagCache.current) return minTagCache.current[key];
    const result2 = computeMinTagessaldo(y, m, virtualSpar, effSelAcc, excludeSparDesc,
      { txs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, getProgEndeAccGlobal });
    if(key) minTagCache.current[key] = result2;
    return result2;
  };

  // ── Warum es hier kein „Vormerkungen auffrischen" mehr gibt ───────────
  //
  // Bis hierher stand an dieser Stelle `doAktualisieren`/`autoAnpassen`: Es
  // schrieb ein frisches Ergebnis in eine BESTEHENDE Serie und musste dabei
  // Buch führen, welche Rate der Nutzer zwischendurch von Hand gelöscht hatte
  // (utils/sparPlanSeries.js, utils/sparWatermarks.js), damit sie nicht
  // stillschweigend wieder auftauchte.
  //
  // Der Sparplan hat jetzt nur noch zwei Zustände — es gibt ihn oder nicht —
  // und entsprechend einen Knopf, der ihn anlegt oder wegwirft (Nutzer-Wunsch,
  // siehe `sparplanAnlegen`/`sparplanLoeschen`). Auffrischen heißt damit:
  // löschen, dann neu anlegen. Das Ergebnis ist dasselbe, denn die Vorschau
  // rechnet ohnehin von selbst nach — und die Buchführung über einzeln
  // gelöschte Raten erübrigt sich, weil ein Löschen jetzt den ganzen Plan
  // meint und nicht mehr eine einzelne Rate darin.
  //
  // Die beiden Hilfsmodule bleiben liegen, samt Tests: Sie beschreiben eine
  // Entscheidung, die zurückkommen kann, wenn das Auffrischen zurückkommt.

  const berechnen = (onDone, accOverride) => {
    const effAcc = accOverride !== undefined ? accOverride : selAcc;
    setComputing(true);
    setResult(null);
    setProgress(0);
    minTagCache.current = {}; // Cache leeren — stellt sicher dass Plan-1-Vormerkungen einbezogen werden
    resetProgEndeCache(); // Globalen AppCtx Prognose-Cache leeren
    // Wenn ein Sparplan mit diesem Namen existiert, alte Raten ignorieren — sonst rechnen wir mit reduziertem Saldo
    const sparDesc = buildSparDesc(sparPlanName);
    const hasExisting = txs.some(t=>t.pending&&!t._linkedTo&&t.desc===sparDesc&&t.accountId==="acc-giro");
    const excludeDesc = hasExisting ? sparDesc : null;
    let i = 0;
    let kumuliert = 0;
    const virtualSpar = {};
    const rows = [];
    const total = monate + 1;
    const CHUNK = 3; // Verarbeite mehrere Monate pro Haeppchen

    // ── Wann das naechste Haeppchen rechnet ───────────────────────────────
    //
    // Frueher `requestAnimationFrame`. Das klingt schonend, ist es aber
    // nicht: rAF laeuft VOR dem Zeichnen jedes einzelnen Bildes — die
    // Rechnung draengelt sich also genau in den Takt, den der Browser zum
    // Scrollen braucht. Bei 77 Monaten sind das rund 26 solcher Haeppchen,
    // und beim Scrollen waehrend der Neuberechnung blieb der Bildschirm
    // sporadisch halb gezeichnet stehen (Nutzer-Bild).
    //
    // `requestIdleCallback` macht genau das Gegenteil: Es kommt dran, wenn
    // der Browser gerade NICHTS Dringenderes zu tun hat — Scrollen und
    // Zeichnen gehen vor. Das `timeout` sorgt dafuer, dass die Rechnung
    // trotzdem fertig wird, auch wenn jemand minutenlang scrollt.
    //
    // Safari kennt rIC erst ab 16.4; darunter (und in jsdom) faellt es auf
    // einen kurzen Timer zurueck. Der ist zwar auch nicht ideal, draengelt
    // sich aber wenigstens nicht in den Zeichentakt.
    const gleich = typeof requestIdleCallback === "function"
      ? (fn) => requestIdleCallback(fn, { timeout: 300 })
      : (fn) => setTimeout(fn, 0);

    // ── Grundlage für die Super-Sparrate in der Vorschau ────────────────
    //
    // Die Zinsmonate bekommen zusätzlich zur normalen Rate ihren Sweep-Betrag
    // ausgewiesen. Bis hierher stand dort die normale Rate, obwohl in
    // Wirklichkeit ein Vielfaches fließt — eine Vorschau, die etwas anderes
    // zeigt als das, was passiert (Nutzer-Hinweis).
    //
    // Gerechnet wird auf demselben Stand wie die Vorschau selbst: bestehende
    // Raten dieses Plans raus (sie werden ja gerade neu geplant), Sweep-
    // Buchungen raus (sonst rechnete sich der Sweep gegen sich selbst). Die
    // geplanten Raten kommen über `virtualSpar` dazu.
    //
    // KEIN `getProgEndeAccGlobal`: der Cache in App.jsx hängt an den ECHTEN
    // Buchungen und würde diesen hypothetischen Stand schlicht ignorieren.
    const zinsMonateVorschau = parseZinsMonate(kvStore.getItem("mbt_zins_monate")) ?? DEFAULT_ZINS_MONATE;
    const sofortRueckVorschau = kvStore.getItem("mbt_zins_sofortrueck") === "1";
    // Wie die beiden Zeilen darüber aus dem Speicher und nicht aus dem
    // Zustand: `berechnen` läuft in Häppchen weiter, während der Zustand sich
    // längst geändert haben kann. Aus dem Speicher gelesen gehört jeder
    // Durchlauf zu genau einem Stand.
    const zinssatzVorschau = parseZinssatz(kvStore.getItem("mbt_zins_satz")) ?? 0;
    const basisTxs = ohneSweepBuchungen(txs)
      .filter(t => !(excludeDesc && t.pending && t.desc === excludeDesc));
    const sweepCtx = { txs: basisTxs, cats, accounts, getKumulierterSaldo, getCat,
      getBudgetForMonth, _restCache: {},
      _txsById: buildTxIdMap(basisTxs), _txsByMonth: buildTxsByMonth(basisTxs) };
    const saldoAmTag = (d, c, vs) => computeTagessaldoAt(d, "acc-giro", c, undefined, vs);

    const addVS = (y, m, wert, vs) => {
      if(!wert || wert <= 0) return;
      const pad2 = n=>String(n).padStart(2,"0");
      const lastDay = new Date(y, m+1, 0).getDate();
      const date = `${y}-${pad2(m+1)}-${pad2(lastDay)}`;
      vs[date] = (vs[date]||0) - wert;
    };

    // ── Die Raten kommen aus DERSELBEN Rechnung wie die Automatik ──────
    //
    // Hier stand eine zweite, eigene Näherung: obere Schranke aus dem Tiefst-
    // Saldo des GANZEN Monats, dann eine Binärsuche mit drei Monaten
    // Vorausschau. Die Automatik in App.jsx rechnet anders (Fenster ab dem
    // Termin der Rate, Suffix-Minimum über alle Fenster) — zwei Regeln für
    // dieselben Raten.
    //
    // Das ist nicht theoretisch auseinandergelaufen: Für August zeigte die
    // Vorschau 103 €, während in den Buchungen 583 € standen (Nutzer-Bilder).
    // Der Grund ist die obere Schranke: Die Rate geht am MONATSLETZTEN ab und
    // kann an einem tiefen Tag am 15. nichts mehr ändern — sie damit zu
    // begrenzen, verschenkt Sparbetrag ohne jeden Gewinn an Sicherheit.
    //
    // Jetzt eine Quelle: ein virtueller Bestand (echte Buchungen ohne die
    // Raten dieses Plans, plus je eine Null-Rate am Monatsletzten) geht durch
    // `sparPlanOptimum`. Damit ist die Vorschau per Konstruktion dasselbe, was
    // die Automatik später hinschreibt.
    const pad2v = n=>String(n).padStart(2,"0");
    const monatsLetzterIso = (y, m) => `${y}-${pad2v(m+1)}-${pad2v(new Date(y, m+1, 0).getDate())}`;
    const vorschauRaten = [];
    for(let k = 0; k < total; k++) {
      const m=(nowM+k)%12, y=nowY+Math.floor((nowM+k)/12);
      vorschauRaten.push({ id:`vorschau-${k}`, accountId:"acc-giro",
        date:monatsLetzterIso(y, m), totalAmount:0, pending:true, _csvType:"expense",
        desc:sparDesc, _seriesId:"vorschau-serie",
        splits:[{id:`vorschau-s-${k}`, catId:"", subId:"", amount:0}] });
    }
    const planTxs = [...basisTxs, ...vorschauRaten];
    let optimum = new Map();
    try {
      optimum = sparPlanOptimum({
        txs: planTxs, puffer, today: new Date(),
        abDatumIso: `${nowY}-${pad2v(nowM+1)}-01`,
        ctx: { txs: planTxs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth },
      });
    } catch(e) { /* Vorschau bleibt bei 0 statt zu scheitern */ }

    // ── Der Stand, auf dem die Tabelle ihre Tiefpunkte misst ─────────────
    //
    // Die Raten dieses Plans mit dem GERECHNETEN Betrag, nicht mit dem, was
    // gerade in den Buchungen steht. Nur so zeigt die Tabelle den Tiefpunkt,
    // der sich mit genau diesem Plan ergibt.
    const ergebnisTxs = [...basisTxs, ...vorschauRaten.map(t => {
      const b = optimum.get(t.id) ?? 0;
      return { ...t, totalAmount: -b, splits: (t.splits||[]).map(s => ({...s, amount: -b})) };
    })];
    const fensterCtx = { txs: ergebnisTxs, cats, accounts, getKumulierterSaldo, getCat,
      getBudgetForMonth, _restCache: {},
      _txsById: buildTxIdMap(ergebnisTxs), _txsByMonth: buildTxsByMonth(ergebnisTxs) };

    const step = (frist) => {
      // Wie viele Monate in diesem Haeppchen? Hoechstens CHUNK — und wenn
      // `requestIdleCallback` eine Frist mitgibt, nur solange davon noch
      // etwas uebrig ist. IMMER mindestens einer, sonst kaeme die Rechnung
      // bei dauerhaftem Scrollen nie voran.
      const nochZeit = () => !frist || typeof frist.timeRemaining !== "function"
        || frist.timeRemaining() > 4;
      const end = Math.min(i + CHUNK, total);
      for(let getan = 0; i < end && (getan === 0 || nochZeit()); i++, getan++) {
        const m=(nowM+i)%12, y=nowY+Math.floor((nowM+i)/12);
        const {min:monatsMin, saldoEnde} = getMinTagessaldo(y, m, virtualSpar, effAcc, excludeDesc);
        const zusaetzlich = (effAcc === undefined || effAcc === null || effAcc === "acc-giro")
          ? (optimum.get(`vorschau-${i}`) ?? 0) : 0;

        kumuliert += zusaetzlich;

        // ── „nach Sparen" — im FENSTER der Rate, nicht im Monat ───────────
        //
        // Hier stand `minTag - zusaetzlich`: der Tiefstand des ganzen Monats,
        // minus der vollen Rate. Das unterstellt, die Rate sei den ganzen
        // Monat über schon weg. Sie geht aber erst am MONATSLETZTEN ab — an
        // einem tiefen Tag am 15. ist sie noch da.
        //
        // Die Folge war eine Zahl, die es nie gab: „Tiefst-Saldo +203, nach
        // Sparen −379" (Nutzer-Bild) — also ein rotes Minus samt Warndreieck,
        // während der Plan gleichzeitig 583 € sparen wollte. Beides konnte
        // nicht stimmen; falsch war die Spalte, nicht die Rate.
        //
        // Jetzt gemessen, wo die Rate wirklich wirkt: vom Ratentermin bis zur
        // nächsten Rate. In diesem Fenster ist sie an JEDEM Tag abgezogen —
        // deshalb ist der Stand davor exakt `nach + Rate`, und deshalb muss
        // `nach` den Puffer halten. Tut es das nicht, stimmt etwas nicht, und
        // das Warndreieck bedeutet wieder etwas.
        const vonIso = monatsLetzterIso(y, m);
        const nIdx = nowM + i + 1;
        const bisIso = monatsLetzterIso(nowY + Math.floor(nIdx/12), nIdx % 12);
        const aufGiro = effAcc === undefined || effAcc === null || effAcc === "acc-giro";
        let minNachSparen = null, tiefTag = null, minTag = monatsMin;
        if(aufGiro) {
          try {
            const tp = tiefpunktImFenster(vonIso, bisIso, "acc-giro", fensterCtx, new Date(), 2);
            minNachSparen = tp.min;
            tiefTag = tp.tag;
            if(minNachSparen !== null) minTag = minNachSparen + zusaetzlich;
          } catch(e) { minNachSparen = null; }
        }
        if(minNachSparen === null) {
          // Fallback (fremdes Konto oder Rechenfehler): wenigstens die alte,
          // grobe Auskunft — aber ohne den Anspruch, ein Tagessaldo zu sein.
          minTag = monatsMin;
          minNachSparen = monatsMin !== null ? monatsMin - zusaetzlich : null;
          tiefTag = null;
        }
        addVS(y, m, zusaetzlich, virtualSpar);

        // Super-Sparrate für Zinsmonate — reine ANZEIGE. Die Buchungen
        // entstehen weiterhin erst zum Termin (sweepZustandAnwenden); der Plan
        // darf die Zahl zeigen, ohne das Geld vorzeitig zu bewegen.
        // `virtualSpar` enthält an dieser Stelle bereits die Rate DIESES
        // Monats — genau so, wie sie am Stichtag abgeht.
        let sweep = null;
        if(effAcc === undefined || effAcc === null || effAcc === "acc-giro") {
          try {
            sweep = sweepFuerMonat({ y, m, ctx: sweepCtx, puffer,
              normaleSparrate: zusaetzlich, sofortRueck: sofortRueckVorschau,
              virtualSpar, monate: zinsMonateVorschau, saldoAmTag });
          } catch(e) { sweep = null; }
        }
        // ── Zinsertrag des Termins ───────────────────────────────────────
        //
        // Nur in Zinsmonaten, nur mit eingetragenem Zinssatz — sonst kostet es
        // Rechenzeit für eine Zeile, die niemand sehen will.
        //
        // Der verzinste Stand ist der Tagesgeld-Stand AM STICHTAG. Er setzt
        // sich aus zwei Teilen zusammen, die auseinandergehalten werden
        // müssen: dem gebuchten Bestand (`sweepCtx` — echte Buchungen OHNE die
        // Raten dieses Plans) und den geplanten Raten bis hierher
        // (`kumuliert`, die Rate dieses Monats eingeschlossen, denn sie geht am
        // Monatsletzten ab und ist am Stichtag da). Beides zu addieren wäre
        // doppelt gezählt, wenn `sweepCtx` die Plan-Raten noch enthielte —
        // genau deshalb sind sie dort herausgefiltert.
        let zins = null;
        if(zinssatzVorschau > 0 && sweep && sparAccId) {
          try {
            const vorig = vorigerZinsTermin(sweep.termin, zinsMonateVorschau);
            const tageZeitraum = vorig ? tageZwischen(vorig, sweep.termin) : null;
            const gebucht = computeTagessaldoAt(sweep.termin, sparAccId, sweepCtx);
            if(tageZeitraum > 0 && gebucht !== null && gebucht !== undefined) {
              zins = zinsVergleich({
                saldoNormal: gebucht + kumuliert,
                // Was die Mega-Sparrate zusätzlich hinlegt, ist genau der
                // Betrag, der am nächsten Banktag zurückgeht — die normale
                // Rate steckt schon in `kumuliert`.
                extra: sweep.zurueck,
                prozent: zinssatzVorschau, tageZeitraum,
                tageFenster: tageZwischen(sweep.termin, sweep.bis) || 1,
              });
              if(zins) zins.stichtagSaldo = gebucht + kumuliert;
            }
          } catch(e) { zins = null; }
        }
        rows.push({y, m, minTag, minNach: minNachSparen, tiefTag, saldoEnde, zusaetzlich, kumuliert, sweep, zins});
      }
      setProgress(Math.round(i/total*100));
      if(i < total) gleich(step);
      else { setResult([...rows]); setComputing(false); if(onDone) onDone([...rows]); }
    };
    gleich(step);
  };

  // ── Sparplan anlegen und löschen ──────────────────────────────────────
  //
  // Der Sparplan hat genau zwei Zustände, und deshalb genau EINEN Knopf:
  // Gibt es noch keine Vormerkungsserie, legt er sie an; gibt es eine, wirft
  // er sie weg (Nutzer: „Sobald es einen Sparplan gibt, wechseln wir es doch
  // zu einem Papierkorb-Symbol"). Zum Auffrischen genügt beides nacheinander —
  // die Vorschau rechnet ohnehin von selbst nach, das Anlegen schreibt also
  // immer den frischen Stand.
  const sparplanAnlegen = () => {
    const sparMonate = result ? result.filter(r=>r.zusaetzlich>0) : [];
    if(!result) { showToast("Der Sparplan wird noch berechnet."); return; }
    if(!sparMonate.length) { showToast("Keine Sparraten möglich — Konto bereits voll genutzt oder unter Puffer."); return; }
    const sparDesc = buildSparDesc(sparPlanName);
    const seriesId = "series-"+uid();
    const newTxs = sparMonate.flatMap((row, i) => {
      const pad2 = n=>String(n).padStart(2,"0");
      const lastDay = new Date(row.y, row.m+1, 0).getDate();
      const date = `${row.y}-${pad2(row.m+1)}-${pad2(lastDay)}`;
      const amount = -row.zusaetzlich;
      const abgang = {
        id: "pend-"+uid(), date, desc:sparDesc,
        totalAmount: amount, pending:true, _csvType:"expense",
        accountId: "acc-giro",
        _seriesId: seriesId, _seriesIdx: i+1, _seriesTotal: sparMonate.length,
        splits: sparCatId ? [{id:uid(),catId:sparCatId,subId:sparSubId||"",amount}]
                          : [{id:uid(),catId:"",subId:"",amount}],
      };
      if(!sparAccId) return [abgang];
      const zugang = {
        id: "pend-"+uid(), date, desc:sparDesc,
        totalAmount: row.zusaetzlich, pending:true, _csvType:"income",
        accountId: sparAccId,
        _linkedTo: abgang.id,
        _seriesId: seriesId+"-tgt", _seriesIdx: i+1, _seriesTotal: sparMonate.length,
        splits: sparTgtCatId ? [{id:uid(),catId:sparTgtCatId,subId:sparTgtSubId||"",amount:row.zusaetzlich}]
                            : [{id:uid(),catId:"",subId:"",amount:row.zusaetzlich}],
      };
      return [abgang, zugang];
    });
    setTxs(p=>[...p, ...newTxs]);
    // Wasserzeichen setzen: Es hält fest, wie weit diese Serie einmal reichte
    // — die einzige Spur, die ein anderes, synchronisiertes Gerät davon hat.
    const maxKey = Math.max(...sparMonate.map(row=>row.y*12+row.m));
    noteSparWatermark(seriesId, maxKey);
    if(sparAccId) noteSparWatermark(seriesId+"-tgt", maxKey);
    showToast(`✓ ${sparMonate.length} Sparvormerkungen angelegt${sparAccId?" (Abgang + Zugang)":""}`);
  };

  // Löschen heißt: alle VORGEMERKTEN Raten dieser Serie weg — beide Beine.
  // Bereits gebuchte Raten bleiben unangetastet; sie sind Vergangenheit und
  // gehören nicht mehr dem Plan, sondern dem Konto.
  const sparplanLoeschen = () => {
    const {series} = findExistingSeries(sparPlanName);
    const serienIds = new Set(series.map(t=>t._seriesId).flatMap(id=>[id, id+"-tgt"]));
    const weg = txs.filter(t => t.pending && (
      serienIds.has(t._seriesId) || series.some(a=>a.id===t._linkedTo)));
    if(!weg.length) { showToast("Kein Sparplan zum Löschen gefunden."); return; }
    const summe = weg.filter(t=>t.totalAmount<0).reduce((s,t)=>s+Math.abs(t.totalAmount),0);
    const anzahl = weg.filter(t=>t.totalAmount<0).length;
    const frage = `Sparplan „${sparPlanName}" löschen?\n\n${anzahl} vorgemerkte `
      + `${anzahl===1?"Rate":"Raten"} über zusammen ${fmtR(summe)} € werden entfernt. `
      + `Bereits gebuchte Raten bleiben stehen. Die Vorschau bleibt — Du kannst den `
      + `Plan danach mit dem frischen Stand neu anlegen.`;
    // Die Rückfrage kommt aus der App, nicht vom Browser — der native Dialog
    // ragt im schmalen Fenster aus dem Bild (siehe BestaetigenDialog.jsx).
    frageBestaetigung(frage, () => {
      // Grabsteine setzen, sonst holt der nächste Sync die gelöschten Raten
      // von einem anderen Gerät zurück.
      recordDeletedTxs(weg.map(t=>t.id));
      const ids = new Set(weg.map(t=>t.id));
      setTxs(p=>p.filter(t=>!ids.has(t.id)));
      showToast(`✓ Sparplan gelöscht — ${anzahl} ${anzahl===1?"Vormerkung":"Vormerkungen"} entfernt`);
    }, { jaLabel:"Löschen", ton:"gefahr" });
  };

  // ── Ableitungen für die Zins-Sweep-Spalte ─────────────────────────────
  // sweepAktiv/sweep kommen aus dem Effekt weiter oben (nicht aus dem Render).
  // Ob die Automatik die Buchungen bereits gesetzt hat — das passiert erst,
  // wenn der Zinsmonat der laufende ist (siehe App.jsx).
  const sweepGesetzt = () => txs.some(t => t.pending && t._sweepId);
  // In der Tabelle stehen fast nur glatte Euro-Beträge — die ",00" kosten dort
  // nur Breite. Nachkommastellen bleiben, sobald sie etwas aussagen.
  const fmtK = (v) => { const s = fmt(v); return s.endsWith(",00") ? s.slice(0,-3) : s; };
  // Anzeige-Variante davon: dieselbe Kuerzung, aber der Nachkommastellen-
  // Option folgend. fmtK selbst bleibt ein String — er wird mit dem
  // Vorzeichen zusammengesetzt, und da darf kein Element stehen.
  const betragK = (v) => betragText(fmtK(v));
  // Der Sparbereich zeigt GERUNDETE Beträge — ohne Cent (Nutzer: „Da die
  // Sparbeträge keine vollen Beträge sind, können die Nachkommastellen weg").
  // Das ist keine Sparsamkeit an der Anzeige, sondern Ehrlichkeit: Die Zahlen
  // entstehen aus einer Vorschau über Monate hinweg; ein Cent darin gaukelt
  // eine Genauigkeit vor, die es nicht gibt. Nebenbei macht es die Zeilen
  // schmal genug, dass Beschriftung und Betrag nebeneinander passen.
  // Nach dem Runden bleibt kein Komma übrig — `fmtR` ist deshalb immer ein
  // String und darf, anders als `betrag`, auch in Template-Literals stehen.
  const fmtR = (v) => fmtK(Math.round(v));
  const betragR = (v) => betragText(fmtR(v));
  // Zinsbeträge bleiben MIT Cent. Sie sind klein — bei 2 % auf ein paar tausend
  // Euro geht es um einstellige Beträge, und ob die Mega-Sparrate 27 Cent oder
  // 12 € bringt, ist genau die Frage. Gerundet wäre beides „0" bzw. „12".
  //
  // ── Der Zinsvergleich zum NÄCHSTEN Termin ────────────────────────────
  //
  // Er wird nicht neu gerechnet, sondern aus der Vorschau-Tabelle geholt: Dort
  // steht er schon, für jeden Zinsmonat. Zweimal gerechnet wären es zwei
  // Zahlen, die irgendwann auseinanderlaufen — der Fehler, der in dieser App
  // schon zwischen Plan und Vormerkungen steckte.
  const zinsZeile = sweep
    ? (result||[]).find(r => r.zins && r.sweep && r.sweep.termin === sweep.termin)
    : null;
  const zinsNaechst = zinsZeile ? zinsZeile.zins : null;
  const zinsNaechstTermin = sweep ? sweep.termin : null;
  // ── Das Symbol, das den Sparplan anlegt oder wegwirft ────────────────
  //
  // Es steht VOR „Heute sicher sparen:" und damit in einer Zeile, die es
  // ohnehin gibt (Nutzer: „vor der Tabelle eine ganze Zeile zu vergeuden, ist
  // doof"). Zwei Zustände, ein Symbol: Gibt es noch keine Vormerkungsserie,
  // legt es sie an (Plus); gibt es eine, wirft es sie weg (Papierkorb).
  //
  // Warum es überhaupt einen Knopf braucht, obwohl gerechnet wird: Das RECHNEN
  // passiert von selbst, das SCHREIBEN nicht. Anlegen und Löschen ändern
  // Vormerkungen — das bleibt eine Entscheidung des Nutzers und keine
  // Nebenwirkung des Hinschauens.
  //
  // Beschriftung im `title`/`aria-label` statt daneben: Ein Symbol ohne Namen
  // ist für Screenreader stumm.
  const planKnopf = () => {
    const gibtEs = findExistingSeries(sparPlanName).seriesIds.length>0;
    // Ohne Plan UND ohne Ergebnis gibt es nichts anzulegen — dann kein Knopf.
    if(!gibtEs && !(result&&result.length>0)) return null;
    const name = gibtEs ? "Sparplan löschen" : "Sparplan anlegen";
    const anlegenPaar = knopfPaar(T.pos, DUNKEL);
    const aus = !gibtEs && computing;
    return (
      <button onClick={gibtEs?sparplanLoeschen:sparplanAnlegen} disabled={aus}
        title={name} aria-label={name}
        style={{width:30,height:30,borderRadius:9,border:"none",padding:0,flexShrink:0,
        background:aus?"rgba(255,255,255,0.1)":gibtEs?GEFAHR:anlegenPaar.grund,
        cursor:aus?"default":"pointer",opacity:aus?0.5:1,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        {Li(gibtEs?"trash-2":"plus-circle",16,
            aus?T.txt2:gibtEs?"#fff":anlegenPaar.schrift)}
      </button>
    );
  };
  // Beschriftung links, Betrag rechts — in EINER Zeile. `davor` nimmt ein
  // Symbol VOR der Beschriftung auf (der Anlegen/Löschen-Knopf): Es steht damit
  // in einer Zeile, die es ohnehin gibt, statt eine eigene zu verbrauchen
  // (Nutzer: „vor der Tabelle eine ganze Zeile zu vergeuden, ist doof").
  //
  // Zeilen OHNE Symbol richten sich an der Schriftlinie aus — sonst schwebte
  // der 12px-Text neben der 22px-Zahl. Die Zeile MIT Symbol richtet sich
  // stattdessen mittig aus: Ein Knopf hat keine Schriftlinie, an der sich etwas
  // ausrichten liesse (im Browser gemessen: die Beschriftung sass dadurch 6px
  // ueber der Zahl statt 2px, und die Zeile wuchs von 30 auf 39px). Mittig
  // sitzen Knopf, Beschriftung und Betrag auf derselben Achse.
  const betragZeile = (label, farbe, wert, davor) => (
    <div style={{display:"flex",alignItems:davor?"center":"baseline",
      justifyContent:"space-between",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
        {davor}
        <div style={{color:T.txt,fontSize:12,whiteSpace:"nowrap"}}>{label}</div>
      </div>
      <div style={{color:farbe,fontSize:BETRAG_GROSS,fontWeight:800,fontFamily:NUM_FONT,
        letterSpacing:-0.5,whiteSpace:"nowrap",flexShrink:0}}>{wert}</div>
    </div>
  );
  const zielKontoName = accounts.find(a=>a.id===sparAccId)?.name || "Tagesgeld";
  const kurzDat = (iso) => {
    const [y,m,d] = String(iso).split("-").map(Number);
    const p2 = n=>String(n).padStart(2,"0");
    return `${p2(d)}.${p2(m)}.${String(y).slice(2)}`;
  };
  // Der Wochentag hinter dem Rückbuchungsdatum („(Do)") ist mit der einzeiligen
  // Darstellung weggefallen — er kostete Breite und sagte nichts, was die
  // Entscheidung stützt. Deshalb gibt es hier auch keine Wochentagsnamen mehr.

  const maxTransfer = result?.[0]?.zusaetzlich ?? null;
  const col = maxTransfer===null?T.txt2:maxTransfer<=0?T.txt2:maxTransfer<500?T.warn:T.pos;
  // Die Kennzahlen der Vorschau stehen HIER und nicht mehr in der Karte:
  // Die Summenzeile lag frueher in der linken Spalte NEBEN dem
  // Neuberechnen-Knopf und hatte deshalb nur die halbe Breite — bei
  // 77 Monaten brach sie dreimal um und stand in 9px da. Sie steht jetzt
  // unter der Zeile ueber die volle Breite (Nutzer-Wunsch), und dafuer
  // brauchen beide Stellen dieselben Werte.
  // EINE Groesse fuer alle Betraege dieses Bereichs. Vorher standen dort 26px
  // (sicher sparen), 20px (Mega-Sparrate) und 13px (Rueckbuchung) neben- und
  // untereinander — das war der „unruhige" Eindruck oben (Nutzer). Drei Zahlen,
  // die dasselbe bedeuten (Geld, das an einem Tag fliesst), sollen auch gleich
  // gross sein; die Bedeutung traegt die Beschriftung darueber, nicht der Grad.
  const BETRAG_GROSS = 22;
  const totalKumuliert = result?.[result.length-1]?.kumuliert ?? 0;
  const sparMonateAnzahl = result ? result.filter(r=>r.zusaetzlich>0).length : 0;
  const durchschnitt = sparMonateAnzahl > 0 ? totalKumuliert/(monate+1) : 0;
  const keinSpielraum = !!result && (totalKumuliert === 0 || durchschnitt < puffer);

  // Enddatum ↔ Monate: monate = Anzahl Folgemonate ab dem aktuellen Monat
  // (Schleife in berechnen() startet bei nowY/nowM, läuft monate+1 Iterationen,
  // letzte Iteration trifft genau den Endmonat). Obergrenze großzügig (50 Jahre).
  const SPAR_MAX_MONATE = 600;
  const monateToEndDate = (n) => {
    const idx = nowM + n;
    const y = nowY + Math.floor(idx/12);
    const m = ((idx % 12) + 12) % 12;
    const pad2 = x=>String(x).padStart(2,"0");
    const lastDay = new Date(y, m+1, 0).getDate();
    return `${y}-${pad2(m+1)}-${pad2(lastDay)}`;
  };
  const endDateToMonate = (iso) => {
    if(!iso) return null;
    const [y,m] = iso.split("-").map(Number);
    if(!y||!m) return null;
    const n = (y-nowY)*12 + ((m-1)-nowM);
    return Math.max(1, Math.min(SPAR_MAX_MONATE, n));
  };
  const setMonatePersist = (v) => {
    setMonate(v);
    kvStore.setItem("mbt_sparen_monate", String(v));
    if(result) setResultOutdated(true);
  };

  // Kein eigener Akzent-Rand mehr oben — die Verbindung zum aktiven Symbol
  // in der Icon-Zeile darüber entsteht jetzt direkt über die identische
  // Tab-Hintergrundfarbe (T.surf2, siehe activeBg in DashboardScreenV2), ein
  // zusätzlicher andersfarbiger Rand hätte dort wie eine Trennlinie gewirkt.
  // ── Der fruehe Ausstieg steht GANZ UNTEN, nicht oben ─────────────────
  //
  // Er stand direkt hinter den Effekten — und genau daran ist die App
  // abgestuerzt ("CRASH: ReferenceError: Cannot access 'qn' before
  // initialization", beim Tippen aufs Sparschwein in einem kuenftigen Monat).
  //
  // Der Grund: `berechnen` ist eine `const` weiter unten, und mehrere Effekte
  // rufen sie auf. In einem NICHT laufenden Monat brach der Rumpf oben ab, die
  // Deklaration wurde nie erreicht — die Effekte waren aber laengst
  // registriert und liefen trotzdem. Sie griffen damit auf eine const im toten
  // Bereich zu (TDZ).
  //
  // Auffallen konnte das keinem Test: `app_boot` rendert zwar die ganze App,
  // aber dieses Widget haengt nur im Baum, solange das Sparen-Panel offen ist —
  // und der Render-Test dafuer lief im LAUFENDEN Monat, wo der Rumpf
  // durchlaeuft.
  //
  // Zwischen dem alten und dem neuen Platz stehen ausschliesslich
  // Deklarationen; den Ausstieg nach unten zu ziehen kostet nichts und nimmt
  // der ganzen Fehlerklasse den Boden. Die beiden Effekte, die `berechnen`
  // rufen, pruefen `isCurr` zusaetzlich selbst — ein kuenftiger Monat soll gar
  // nicht erst rechnen.
  if(!isCurr) return null;

  return (
    // Kopfzeile ("Sparen" / "Tagesgenaue Sparvorschläge" / Ausklapp-Pfeil)
    // entfällt: der Sparschwein-Reiter darüber sagt bereits, worum es geht,
    // und schaltet das Panel ein und aus — der innere Aufklapper war doppelt
    // gemoppelt. Ohne ihn liegt der Rand oben genauso schmal wie seitlich.
    <div id="sparplan-widget" style={{margin:"0 10px 4px",background:T.surf2,borderRadius:16,
      padding:"10px",border:`1px solid ${T.bd}`}}>

      {toast&&(
        <div style={{margin:"4px 0",padding:"8px 12px",background:"rgba(34,197,94,0.15)",
          border:`1px solid ${T.pos}44`,borderRadius:8,color:T.acc_pos,fontSize:12,fontWeight:700,
          textAlign:"center"}}>
          {toast}
        </div>
      )}

      {/* ── „Wird neu berechnet" — ganz oben, nicht unten am Knopf ───────
          Der Fortschritt stand bisher nur AUF dem Neuberechnen-Knopf, und der
          sitzt weit unten: „muss sonst erst weit nach unten scrollen, um es
          ueberhaupt zu erkennen" (Nutzer). Seit die Vorschau von selbst
          nachrechnet, ist das die haeufigste Art, wie man ihr begegnet — also
          gehoert die Meldung an die erste Stelle.

          `resultOutdated` ist mit drin, nicht nur `computing`: Zwischen dem
          Erkennen und dem Rechnen liegen 450 ms Sammelpause. Ohne sie bliebe
          die alte Tabelle in dieser Zeit scharf und unkommentiert stehen. */}
      {!collapsed&&rechnetNeu&&(
        <div style={{margin:"0 0 8px",padding:"7px 10px",borderRadius:10,
          background:rechnePaar().grund,color:rechnePaar().schrift,
          display:"flex",alignItems:"center",gap:8,fontSize:12,lineHeight:1.3}}>
          <span style={{flexShrink:0,display:"inline-flex"}}>
            {Li("refresh-cw",14,rechnePaar().schrift)}</span>
          <b style={{flex:1,minWidth:0}}>Sparplan wird neu berechnet…</b>
          <span style={{fontFamily:NUM_FONT,fontWeight:700,flexShrink:0}}>
            {computing?`${progress} %`:""}</span>
          <div style={{width:64,height:4,borderRadius:2,flexShrink:0,
            background:"rgba(0,0,0,0.22)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:2,background:rechnePaar().schrift,
              width:`${computing?Math.max(3,progress):3}%`,transition:"width 0.15s"}}/>
          </div>
        </div>
      )}

      {/* Die alte Ansicht bleibt stehen, wird aber unscharf und nicht
          bedienbar — so ist auf einen Blick klar, dass die Zahlen darunter
          gerade nicht mehr gelten (Nutzer-Wunsch). `filter` statt `opacity`:
          Bei blosser Transparenz laesst sich jede Zahl noch ablesen, und
          genau das soll sie nicht. */}
      <div style={rechnetNeu
        ? {filter:"blur(2.5px)",opacity:0.55,pointerEvents:"none",
           userSelect:"none",transition:"filter 0.2s,opacity 0.2s",
           // Eigene Ebene erzwingen. Ohne das rechnet der Browser die
           // Unschaerfe bei JEDEM Scroll-Bild neu ueber einen sehr grossen
           // Bereich — auf dem iPhone war der Bildschirm dabei sporadisch nur
           // halb gezeichnet (Nutzer-Bild). Mit eigener Ebene wird einmal
           // gerastert und danach nur noch verschoben.
           transform:"translateZ(0)", willChange:"filter"}
        : {transition:"filter 0.2s,opacity 0.2s"}}>
      {!collapsed&&<>
        {/* Konfig-Karte als echtes RASTER statt einzelner Flex-Zeilen: nur so
            beginnen die Felder aller Zeilen an derselben Stelle — und zwar
            auch die jeweils daneben. Spalten:
              1) Label            2) Konto-Symbol (nur Abgang/Zugang)
              3) Hauptfeld        4) Zweitfeld (klappt zusammen, wenn leer)
            Alle Felder sind gleich hoch (FELD_H), alle Zeilenabstände gleich
            (rowGap) — vorher ergaben sich beide aus dem jeweiligen Inhalt und
            wirkten dadurch unruhig. */}
        <div style={{display:"grid",gridTemplateColumns:`${LBL_W}px ${KTO_W}px minmax(0,1fr)`,
          columnGap:6,rowGap:6,alignItems:"center",marginBottom:8,
          background:"rgba(0,0,0,0.15)",borderRadius:10,padding:"10px 12px"}}>

          {/* Zeile 1 — Abgang: Konto fix Giro, expense-Kategorie auf Giro.
              Konto als Symbol statt als Name; der gewonnene Platz geht an die
              Kategorie-Auswahl, die ihn deutlich nötiger hat. */}
          <span style={LBL}>Abgang</span>
          <span title={giroAcc?.name||"Giro"} style={{...FIELD,...ZENTRIERT}}>
            {Li(giroAcc?.icon||"credit-card",17,giroAcc?.color||T.txt2)}
          </span>
          <div style={{minWidth:0}}>
            <CatPicker
              value={sparCatId+"|"+sparSubId}
              onChange={(cId,sId)=>{setSparCatId(cId);setSparSubId(sId);kvStore.setItem("mbt_spar_catid",cId);kvStore.setItem("mbt_spar_subid",sId);}}
              placeholder="— unkategorisiert —"
              filterType="expense"
              accountId="acc-giro"
              triggerStyle={TRIGGER} noMargin
            />
          </div>

          {/* Zeile 2 — Zugang: Konto wählen, dann income-Kategorie des Kontos.
              Das <select> liegt unsichtbar über dem Symbol, damit die native
              Auswahlliste erhalten bleibt. */}
          <span style={LBL}>Zugang</span>
          {(()=>{
            const zAcc = accounts.find(a=>a.id===sparAccId);
            return (
              <span title={zAcc?.name||"kein Konto"}
                style={{...FIELD,...ZENTRIERT,position:"relative",cursor:"pointer"}}>
                {zAcc ? Li(zAcc.icon||"landmark",17,zAcc.color||T.txt2)
                      : <span style={{color:T.txt2,fontSize:11}}>—</span>}
                <select value={sparAccId}
                  onChange={e=>{
                    const v = e.target.value;
                    setSparAccId(v); kvStore.setItem("mbt_spar_accid",v);
                    // Konto-Wechsel verwirft die bisherige Zugang-Kategorie (gehört zum alten Konto)
                    if(v !== sparAccId) {
                      setSparTgtCatId(""); kvStore.setItem("mbt_spar_tgt_catid","");
                      setSparTgtSubId(""); kvStore.setItem("mbt_spar_tgt_subid","");
                    }
                  }}
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",
                    opacity:0,cursor:"pointer",border:"none"}}>
                  <option value="">— kein Konto —</option>
                  {accounts.filter(a=>a.id!=="acc-giro").map(a=>(
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </span>
            );
          })()}
          <div style={{minWidth:0,
            opacity:sparAccId?1:0.4,pointerEvents:sparAccId?"auto":"none"}}>
            <CatPicker
              value={sparTgtCatId+"|"+sparTgtSubId}
              onChange={(cId,sId)=>{setSparTgtCatId(cId);setSparTgtSubId(sId);kvStore.setItem("mbt_spar_tgt_catid",cId);kvStore.setItem("mbt_spar_tgt_subid",sId);}}
              placeholder={sparAccId?"— unkategorisiert —":"— erst Konto wählen —"}
              filterType="income"
              accountId={sparAccId||null}
              triggerStyle={TRIGGER} noMargin
            />
          </div>

          {/* Zeile 3 — Planname + Auswahl bestehender Pläne */}
          <span style={LBL}>Planname</span>
          {/* Plan-Auswahl als Symbol in derselben Spalte wie die Konten —
              vorher stand sie als Zweitfeld RECHTS neben dem Plannamen und
              begann damit an einer anderen Stelle als alle übrigen Felder.
              Das <select> liegt wieder unsichtbar darüber. Grün + Haken =
              der eingetippte Name entspricht einem gespeicherten Plan. */}
          {(()=>{
            const existingDescs = [...new Set(
              txs.filter(t=>t.pending&&!t._linkedTo&&t._seriesId&&t.accountId==="acc-giro"&&(t.desc||"").startsWith("Sparen·"))
              .map(t=>t.desc)
            )];
            if(!existingDescs.length) return <span/>;
            const currentMatches = existingDescs.includes(buildSparDesc(sparPlanName));
            return (
              <span title={currentMatches?"anderen gespeicherten Plan laden":"gespeicherten Plan laden"}
                style={{...FIELD,...ZENTRIERT,position:"relative",cursor:"pointer",
                  fontSize:10,fontWeight:700,color:currentMatches?T.pos:T.txt2,
                  border:`1px solid ${currentMatches?T.pos:T.bd}`}}>
                laden
                <select value=""
                  onChange={e=>{
                    if(!e.target.value) return;
                    const name = e.target.value.replace(/^Sparen·/,"");
                    setSparPlanName(name);
                    kvStore.setItem("mbt_spar_planname", name);
                    // Vorschau-Ergebnis verwerfen und Auto-Recompute neu scharf
                    // machen, damit die Tabelle für den neuen Plan befüllt wird.
                    setResult(null);
                    didAutoLoadRef.current = false;
                    e.target.value = "";
                    scrollPlanNameToEnd();
                  }}
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",
                    opacity:0,cursor:"pointer",border:"none"}}>
                  <option value="">— Plan wählen —</option>
                  {existingDescs.map(d=>(
                    <option key={d} value={d}>{d.replace(/^Sparen·/,"")}</option>
                  ))}
                </select>
              </span>
            );
          })()}
          <input ref={planNameInputRef} value={sparPlanName}
            onChange={e=>{setSparPlanName(e.target.value);kvStore.setItem("mbt_spar_planname",e.target.value);}}
            placeholder="z.B. Sparplan 1"
            // rechtsbündig: bei einem langen (z.B. geladenen) Plannamen bleibt
            // so das Ende sichtbar, statt unbemerkt rechts abgeschnitten zu sein.
            style={{...FIELD,minWidth:0,textAlign:"right"}}/>

          {/* Eine Zeile für beides: der Mindestsaldo ist schmal und passt in
              die Symbolspalte, das Enddatum bleibt in der Feldspalte und damit
              auf der Flucht mit allen anderen Feldern. */}
          <span style={LBL}>min. Saldo</span>
          <input type="number" value={puffer} title="Mindest-Saldo, der auf dem Giro bleiben muss"
            onChange={e=>{const v=parseInt(e.target.value)||0;setPuffer(v);if(result) setResultOutdated(true);}}
            style={{...FIELD,minWidth:0,padding:"0 4px",textAlign:"center"}}/>
          <input type="date" min={monateToEndDate(1)} value={monateToEndDate(monate)}
            title="Vorschau bis zu diesem Datum"
            onChange={e=>{const n=endDateToMonate(e.target.value);if(n) setMonatePersist(n);}}
            style={{...FIELD,minWidth:0,textAlign:"right",colorScheme:"dark"}}/>

          {/* Zinstermine in ZWEI Reihen à 6 Monaten über die volle Breite —
              12 Felder nebeneinander ließen pro Monat nur ~20px, zum Antippen
              und Lesen zu wenig. Statt eines Symbols ein Erklärsatz: ohne ihn
              war nicht erkennbar, wofür die Felder überhaupt da sind. */}
          <div style={{gridColumn:"1 / -1",marginTop:2}}>
            <div style={{color:T.txt,fontSize:12,marginBottom:6,lineHeight:1.45}}>
              In welchen Monaten gibt es Zinsen? Am Monatsletzten greift dann
              die Mega-Sparrate.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>
              {MONTHS_G.map((nm,mi)=>{
                const on = zinsMonate.includes(mi);
                return (
                  <div key={mi} onClick={()=>toggleZinsMonat(mi)} title={`Zinstermin ${nm} — Monatsletzter`}
                    style={{textAlign:"center",padding:"6px 0",borderRadius:7,cursor:"pointer",
                      background:on?"rgba(212,175,55,0.18)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${on?T.gold+"66":T.bd}`,
                      color:on?T.gold:T.txt2,fontSize:11,fontWeight:on?700:500,
                      userSelect:"none",overflow:"hidden",whiteSpace:"nowrap"}}>
                    {nm}
                  </div>
                );
              })}
            </div>
            {/* ── Zinssatz ────────────────────────────────────────────────
                Ohne ihn zeigt der Plan zwar, wie viel sich zum Termin bewegen
                lässt, aber nicht, was es bringt. Leer heißt „nicht
                eingetragen" und blendet die Zinszeilen aus — nicht „0 %".

                inputMode="decimal" statt type="number": Auf dem Handy kommt
                damit eine Tastatur mit Komma, und der Zwischenstand „2," bleibt
                stehen, statt vom Browser verworfen zu werden. */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:9}}>
              <span style={{...LBL,flexShrink:0}}>Zinssatz</span>
              <input value={zinssatzText} inputMode="decimal" placeholder="z. B. 2,25"
                title="Zinssatz des Tagesgeldkontos in Prozent pro Jahr"
                onChange={e=>setZinssatz(e.target.value)}
                style={{...FIELD,width:90,textAlign:"right"}}/>
              <span style={{...LBL,flexShrink:0}}>% p. a.</span>
            </div>
            {/* Der ehrliche Hinweis gehört genau HIERHIN — an die Stelle, an
                der die Annahme gemacht wird, nicht ans Ergebnis. Herleitung
                beider Modelle in utils/zinsErtrag.js. */}
            {zinssatz > 0 && (
              <div style={{color:T.txt,fontSize:12,lineHeight:1.45,marginTop:6}}>
                Gerechnet auf den Stand am Stichtag — nur so wirkt die
                Mega-Sparrate.
                {zinsNaechst
                  ? <> Verzinst Deine Bank <b>taggenau</b>, bringt sie am
                      {" "}{kurzDat(zinsNaechstTermin)} statt
                      {" "}<b>+{betrag(zinsNaechst.plus)} €</b> nur
                      {" "}<b>+{betrag(zinsNaechst.taggenauPlus)} €</b>.
                      {" "}Steht in den Bedingungen Deiner Bank.</>
                  : <> Verzinst Deine Bank taggenau, bringt sie nur die ein bis
                      zwei Tage im Fenster. Steht in den Bedingungen Deiner Bank.</>}
              </div>
            )}
            {/* Deutlich höherer Betrag, aber nur zulässig, wenn am
                Rückbuchungstag auch wirklich zurücküberwiesen wird. */}
            <div onClick={()=>setSofortRueck(!sofortRueck)}
              style={{display:"flex",alignItems:"flex-start",gap:7,marginTop:9,cursor:"pointer"}}>
              <span style={{flexShrink:0,marginTop:1}}>
                {Li(sofortRueck?"check-circle":"square",14,sofortRueck?T.gold:T.txt)}
              </span>
              {/* Gekuerzt: Der mittlere Satz erklaerte nur, WARUM ein hoeherer
                  Betrag geht — das folgt schon aus „am selben Tag". Die
                  Bedingung bleibt, sie ist die eigentliche Entscheidung. */}
              <span style={{color:T.txt,fontSize:12,lineHeight:1.45}}>
                Rückbuchung am selben Tag — erlaubt einen deutlich höheren Betrag.
                <span style={{color:T.warn}}> Nur ankreuzen, wenn Du an dem Tag
                wirklich zurücküberweist.</span>
              </span>
            </div>
          </div>
        </div>
        {/* Sofort-Betrag, darunter die Mega-Sparrate.
            Der „Neuberechnen"-Knopf, der hier stand, ist weg: Seit die Vorschau
            ihren Daten-Abdruck mitfuehrt, merkt das Panel selbst, wenn die
            Buchungen sich geaendert haben, und rechnet beim Oeffnen nach
            (Nutzer: „kann doch jetzt komplett weg — passiert ja eh
            automatisch"). Den Fortschritt zeigt das Band ganz oben.
            Das SCHREIBEN der Vormerkungen haengt weiterhin an einem Knopf —
            der steht unter der Tabelle. */}
        <div style={{background:"rgba(0,0,0,0.15)",borderRadius:10,padding:"10px 12px",
          marginBottom:6}}>
        <div>
          <div>
            {(()=>{
              // Kein Spielraum wenn: total=0 oder Durchschnitt pro Monat < puffer
              // (zu wenig um sinnvoll zu sein) — die Werte kommen von oben.
              const keinSpielraumGrund = totalKumuliert === 0
                ? "Ein bestehender Sparplan schöpft bereits alles bis auf den Puffer ab."
                : `Ø ${fmtR(durchschnitt)} €/Monat — zu wenig für einen sinnvollen Sparplan (Schwelle: ${fmtR(puffer)} €/Monat).`;
              return (<>
                {/* Beschriftung und Betrag in DERSELBEN Zeile (Nutzer-Wunsch:
                    „platzsparend jeweils in eine Zeile"). Möglich wurde das
                    erst dadurch, dass beide Seiten kürzer geworden sind: die
                    Klammerzusätze („(Monat 1)", „(Zinstermin)", „(Do)") sind
                    weg, und die Beträge zeigen keine Nachkommastellen mehr.
                    `alignItems:"baseline"` stellt 12px-Text und 22px-Zahl auf
                    dieselbe Schriftlinie — bei `center` säße der Text sichtbar
                    zu hoch. */}
                {betragZeile("Heute sicher sparen:", col, (
                  computing?"…":maxTransfer===null?"—":maxTransfer<=0?"0 €"
                    : <>{betragR(maxTransfer)} €</>
                ), planKnopf())}

                {keinSpielraum&&(
                  <div style={{marginTop:4,background:"rgba(234,64,37,0.12)",border:`1px solid ${T.neg}44`,
                    borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6}}>
                    {Li("x-circle",14,T.acc_neg)}
                    <div>
                      <div style={{color:T.acc_neg,fontSize:11,fontWeight:700}}>Kein sinnvoller Spielraum</div>
                      <div style={{color:T.txt2,fontSize:9}}>{keinSpielraumGrund}</div>
                    </div>
                  </div>
                )}
              </>);
            })()}</div>
        </div>
        {/* Die Summe ueber den ganzen Zeitraum — volle Breite, in derselben
            Groesse wie die Zeile darueber. Vorher stand sie in der linken
            Spalte neben dem Knopf und damit auf halber Breite: Bei 77 Monaten
            brach sie dreimal um und war in 9px kaum zu lesen.
            Sie schliesst ohne Abstand an den Betrag an und steht wie er
            rechtsbuendig (Nutzer-Wunsch): Sie gehoert zu ihm, ein Abstand oder
            eine andere Kante haette sie zu einer eigenen Angabe gemacht. */}
        {result&&!keinSpielraum&&(
          <div style={{color:T.acc_pos,fontSize:12,lineHeight:1.45,textAlign:"right"}}>
            ∑ {monate+1} Monate: <b style={{fontFamily:NUM_FONT}}>{betragR(totalKumuliert)} €</b>
            {" · "}Ø <b style={{fontFamily:NUM_FONT}}>{betragR(durchschnitt)} €</b>/Monat
          </div>
        )}

        {/* ── Raten, die die Automatik NICHT pflegt ────────────────────────
            Der Plan oben und die Vormerkungen sind seit `sparPlanOptimum`
            dieselbe Zahl — aber nur für die Raten, die die Automatik anfasst.
            Zwei Sorten lässt sie bewusst liegen, und beide sahen bisher aus wie
            ein Widerspruch zwischen zwei Bildschirmen (Nutzer: „das verwirrt
            sonst total"). Herleitung in utils/sparPlanPflege.js. */}
        {(()=>{
          const pflege = sparPlanPflege({ txs, sparDesc: buildSparDesc(sparPlanName),
            heuteIso: heuteIsoVon() });
          if(!pflege.handlungsbedarf) return null;
          const monatsText = (k) => { const [jy,jm2]=k.split("-").map(Number);
            return `${MONTHS_G[jm2-1]} ${jy}`; };
          return (
            <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.bd}`}}>
              {pflege.vergangenAnzahl>0&&(
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  {Li("clock",14,T.acc_gold)}
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{color:T.txt,fontSize:12,fontWeight:700}}>
                      {pflege.vergangenAnzahl} überfällige {pflege.vergangenAnzahl===1?"Rate":"Raten"}
                      {" "}({pflege.vergangenMonate.map(monatsText).join(", ")})
                    </div>
                    <div style={{color:T.txt,fontSize:10,lineHeight:1.4}}>
                      Termin vorbei, aber nie gebucht — zusammen {betragR(pflege.vergangenSumme)} €.
                      Sie zählen weder im Saldo noch im Plan und werden auch nicht mehr
                      angepasst. Entfernen, falls die Überweisung ausgefallen ist;
                      stehen lassen, falls sie nur noch nicht importiert wurde.
                    </div>
                  </div>
                  <button onClick={()=>{
                      // Grabstein setzen, sonst holt der naechste Sync die
                      // geloeschten Raten von einem anderen Geraet zurueck.
                      recordDeletedTxs(pflege.vergangenIds);
                      const ids = new Set(pflege.vergangenIds);
                      setTxs(p=>p.filter(t=>!ids.has(t.id)));
                      showToast(`✓ ${pflege.vergangenAnzahl} überfällige Raten entfernt`);
                    }}
                    style={{padding:"6px 12px",borderRadius:9,border:"none",
                      background:pflegePaar().grund,color:pflegePaar().schrift,
                      fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                    Entfernen
                  </button>
                </div>
              )}
              {pflege.mehrdeutig.length>0&&(
                <div style={{display:"flex",alignItems:"flex-start",gap:8,
                  marginTop:pflege.vergangenAnzahl>0?8:0}}>
                  {Li("alert-triangle",14,T.acc_neg)}
                  <div style={{color:T.txt,fontSize:10,lineHeight:1.4}}>
                    <b style={{fontSize:12}}>Mehrere Raten in einem Monat</b> —
                    {" "}{pflege.mehrdeutig.map(monatsText).join(", ")}.
                    Dort ist nicht zu erkennen, welche die Sparrate ist; diese Monate
                    lässt die Automatik aus, ihr Betrag bleibt stehen, wie er ist.
                    Doppelte Rate löschen, dann stimmt der Monat wieder mit dem Plan überein.
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Mega-Sparrate zum nächsten Zinstermin ───────────────────────
            Steht bewusst direkt unter der normalen Sparrate: beide gehen am
            selben Tag ab, und der Hin-Betrag ENTHÄLT die normale Rate. */}
        {sweepAktiv&&sweep&&sweep.hin>0&&(
          <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.bd}`}}>
            {/* Beschriftung links, Betrag rechts — beide in einer Zeile, alle
                Beträge in derselben Größe wie „Heute sicher sparen". Vorher
                standen sie in drei verschiedenen Graden und jeder unter seiner
                Beschriftung; das Auge musste bei jeder Zeile neu suchen, und der
                Block war doppelt so hoch (Nutzer: „wirkt oben unruhig",
                „platzsparend jeweils in eine Zeile").
                Der Zusatz „(Zinstermin)" ist weg: Dass es einer ist, sagt die
                Zeile darüber schon, und er hat genau die Breite gekostet, an der
                die Zeile umbrach. Dasselbe gilt für den Wochentag hinter dem
                Rückbuchungsdatum. */}
            {betragZeile(`Mega-Sparrate zum ${kurzDat(sweep.termin)}`, T.acc_gold,
              <>{betragR(sweep.hin)} €</>)}
            {betragZeile(`zurück aufs Giro am ${kurzDat(sweep.bis)}`, T.acc,
              <>{betragR(sweep.zurueck)} €</>)}
            {/* ── Wofür das Ganze: der Zinsertrag ─────────────────────────
                Eine Zeile, keine zweite Betragszeile: Der Ertrag ist die
                BEGRÜNDUNG der Beträge darüber, nicht ein dritter Betrag
                neben ihnen. Mit Cent — bei diesen Größenordnungen ist der
                Unterschied zwischen 0,27 € und 12,35 € die ganze Aussage. */}
            {zinsNaechst && (
              <div style={{color:T.txt,fontSize:12,marginTop:6,lineHeight:1.45}}>
                Zinsen am {kurzDat(sweep.termin)}:{" "}
                <b style={{color:T.acc_gold}}>{betrag(zinsNaechst.mitMega)} €</b>
                {" "}statt <b>{betrag(zinsNaechst.normal)} €</b> —
                {" "}<b style={{color:T.acc_pos}}>+{betrag(zinsNaechst.plus)} €</b>
              </div>
            )}
            {/* Auf das Wesentliche gekürzt (Nutzer: „Habe selbst keine Lust
                soviel lesen zu müssen"). Vier Absätze sind zu drei knappen
                Sätzen geworden; weggefallen ist, was sich aus den Zahlen selbst
                ergibt („wird nicht zusätzlich überwiesen") oder was den Ablauf
                erklärt, statt eine Entscheidung zu stützen (das Banner auf der
                Startseite, die Nachführung bis zum Stichtag).
                Fortlaufend statt in Zeilen umgebrochen (Nutzer-Wunsch): drei
                kurze Sätze untereinander sahen aus wie eine Aufzählung mit drei
                gleichrangigen Punkten, obwohl es ein Absatz ist. */}
            <div style={{color:T.txt,fontSize:12,marginTop:6,lineHeight:1.5}}>
              {sweep.bleibt>0 && <>Davon <b>{betragR(sweep.bleibt)} €</b> normale Rate —
                bleibt auf dem {zielKontoName}.{" "}</>}
              Am {kurzDat(sweep.engpassTag)} bleiben <b>{betragR(sweep.restNachSweep)} €</b> auf dem Giro.
              {" "}
              {sweepGesetzt()
                ? "Bereits vorgemerkt."
                : "Die Mega-Sparrate wird erst vorgemerkt, wenn der Zinsmonat läuft."}
            </div>
          </div>
        )}
        </div>

        {/* Ergebnis-Tabelle */}
        {!result&&(
          <div style={{textAlign:"center",color:T.txt2,fontSize:10,padding:"8px 0"}}>
            Sparplan wird ermittelt …
          </div>
        )}
        {result&&result.length>0&&(<>
          <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:8}}>
            {/* Die Kopfzeile bleibt beim Scrollen stehen — sonst liest man ab
                der fünften Zeile Zahlen, deren Spalte man nicht mehr kennt
                (Nutzer-Wunsch).

                `top` ist die Unterkante des klebenden Hero (`--hero-h`, in
                App.jsx gemessen). Mit `top:0` schöbe sich die Kopfzeile hinter
                den Hero und wäre genau dann unsichtbar, wenn man sie braucht.

                Der Hintergrund MUSS deckend sein und muss die Farbe der Karte
                treffen, auf der die Zeile liegt (`T.surf2`, siehe der
                Widget-Rahmen oben) — sonst scheinen die Zeilen durch, die
                darunter hindurchwandern. Die negativen Ränder plus dasselbe
                Polster verbreitern den Streifen bis an die Kartenkanten;
                andernfalls bliebe links und rechts ein Spalt, durch den die
                wandernden Zeilen zu sehen wären. */}
            <div style={{display:"flex",padding:"3px 16px 5px",margin:"0 -10px",
              position:"sticky",top:"var(--hero-h, 0px)",zIndex:3,
              background:T.surf2}}>
              <div style={{width:38,flexShrink:0}}/>
              <div style={{flex:1,textAlign:"right",color:T.txt,fontSize:11}}>Tiefst-Saldo*</div>
              <div style={{flex:1,textAlign:"right",color:T.txt,fontSize:11}}>nach Sparen</div>
              <div style={{flex:1,textAlign:"right",color:T.txt,fontSize:11}}>+ Monat</div>
              <div style={{flex:1,textAlign:"right",color:T.txt,fontSize:11,fontWeight:700}}>∑ gespart</div>
            </div>
            {result.map(({y,m,minTag,minNach,tiefTag,zusaetzlich,kumuliert,sweep,zins},i)=>{
              const zusCol=zusaetzlich>0?zusaetzlich<500?T.warn:T.pos:T.txt2;
              const isCurM=i===0;
              const kritisch=minNach!==null&&minNach<puffer;
              return (
                <div key={i} style={{
                  padding:"3px 6px",borderRadius:7,
                  background:isCurM?"rgba(74,159,212,0.08)":"rgba(255,255,255,0.02)",
                  border:kritisch?`1px solid ${T.neg}44`:"1px solid transparent"}}>
                <div style={{display:"flex",alignItems:"center"}}>
                  <div style={{width:38,flexShrink:0}}>
                    <span style={{color:isCurM?T.blue:T.txt,fontSize:12,fontWeight:700}}>{MONTHS_G[m]}</span>
                    <span style={{color:T.txt,fontSize:10,marginLeft:2}}>{String(y).slice(2)}</span>
                  </div>
                  <div style={{flex:1,textAlign:"right",color:minTag===null?T.txt:minTag<puffer?T.neg:T.txt,fontSize:12,fontFamily:NUM_FONT}}>
                    {minTag===null?"—":<>{minTag>=0?"+":"−"}{betragK(Math.abs(minTag))}</>}
                  </div>
                  <div style={{flex:1,textAlign:"right"}}>
                    <div style={{fontSize:12,fontFamily:NUM_FONT,fontWeight:700,
                      color:minNach===null?T.txt:minNach<puffer?T.neg:T.pos}}>
                      {minNach===null?"—":<>{minNach>=0?"+":"−"}{betragK(Math.abs(minNach))}</>}
                      {kritisch&&<span style={{color:T.acc_neg,fontSize:7}}> ⚠</span>}
                    </div>
                    {/* WANN der Tiefpunkt eintritt — die Frage, die die Spalte
                        bisher offenließ („Wann tritt dieser Tagessaldo ein?"). */}
                    {tiefTag&&<div style={{fontSize:8,color:T.txt,fontFamily:NUM_FONT,
                      lineHeight:1.1,marginTop:-1}}>{kurzTag(tiefTag)}</div>}
                  </div>
                  <div style={{flex:1,textAlign:"right",color:zusCol,fontSize:12,fontWeight:700,fontFamily:NUM_FONT}}>
                    {zusaetzlich>0?<>+{betragK(zusaetzlich)}</>:"—"}
                  </div>
                  <div style={{flex:1,textAlign:"right",color:kumuliert>0?T.pos:T.txt,fontSize:12,fontWeight:800,fontFamily:NUM_FONT}}>
                    {kumuliert>0?betragK(kumuliert):"—"}
                  </div>
                </div>
                {/* Zinsmonat: die Mega-Sparrate gehört SICHTBAR in den Plan,
                    nicht erst in den laufenden Monat (Nutzer-Wunsch). Zwei
                    Zahlen, weil es zwei verschiedene Dinge sind: `hin` geht am
                    Stichtag aufs Tagesgeld, `zurueck` kommt am nächsten
                    Banktag wieder — nur die Differenz bleibt gespart.
                    Der Rückweg steht mit Datum dabei, weil genau der
                    vergessen werden kann.

                    Bündig LINKS unter dem Monat, nicht eingerückt: Die Zeile
                    gehört zu diesem Monat als Ganzem, nicht zu einer der
                    Spalten rechts (Nutzer-Wunsch).

                    Volle Signalfläche in Sonnengelb statt einer Tönung —
                    Begründung und Messwerte oben bei `sweepPaar`. */}
                {sweep && (
                  // Ein BAND, kein Kasten: bündig bis an die Ränder der
                  // Monatszeile (negative Ränder heben deren Polster auf),
                  // ohne Rahmen und ohne Rundung. Ein gerahmtes Kästchen IN
                  // einer gerahmten Zeile las sich als zweiter Bereich
                  // (Nutzer-Hinweis). Ohne Symbol, damit eine Zeile reicht.
                  <div style={{margin:"3px -6px -3px",padding:"3px 6px 4px",
                    background:sweepGrund(),color:sweepFarbe(),
                    fontSize:10.5,lineHeight:1.35}}>
                    <b>Mega-Sparrate</b>{" "}
                    {kurzTag(sweep.termin)}:{" "}
                    <b style={{fontFamily:NUM_FONT}}>{betragK(sweep.hin)}</b>
                    {" → "}{kurzTag(sweep.bis)}{" "}
                    <b style={{fontFamily:NUM_FONT}}>{betragK(sweep.zurueck)}</b>
                    {" zurück"}
                    {/* Der Ertrag steht in DERSELBEN Zeile: Er gehört zu diesem
                        Termin und nicht in eine eigene Zeile darunter — das
                        Band soll ein Band bleiben. Mit Cent (siehe `betrag`
                        gegen `betragR` weiter oben). */}
                    {zins && <>{" · Zins "}
                      <b style={{fontFamily:NUM_FONT}}>+{betrag(zins.plus)} €</b>
                      {" (taggenau "}
                      <b style={{fontFamily:NUM_FONT}}>+{betrag(zins.taggenauPlus)} €</b>
                      {")"}</>}
                  </div>
                )}
                </div>
              );
            })}
          </div>
          {/* Die alte Fußnote beschrieb die alte Regel („Sparen = Tiefst-Saldo
              − Puffer") und passte nicht mehr zu dem, was gerechnet wird. */}
          <div style={{textAlign:"right",color:T.txt,fontSize:11,marginTop:5,lineHeight:1.45}}>
            * Tiefster Stand vom Ratentermin bis zur nächsten Rate — dort wirkt sie.
            {" "}Darunter der Tag. Nach Sparen bleibt der Puffer von {betrag(puffer)} € stehen.
          </div>
        </>)}

      </>}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════

export { TagesgeldWidget };
