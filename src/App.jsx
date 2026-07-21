// Auto-generated module (siehe app-src.jsx)

import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { MobileHeader } from "./components/atoms/MobileHeader.jsx";
import { Overlay } from "./components/atoms/Overlay.jsx";
import { PBtn } from "./components/atoms/PBtn.jsx";
import { MonthPicker } from "./components/molecules/MonthPicker.jsx";
import { ThemeDropdown } from "./components/molecules/ThemeDropdown.jsx";
import { EditPopup } from "./components/organisms/EditPopup.jsx";
import { DashboardScreenV2 } from "./components/screens/DashboardScreenV2.jsx";
import { JahrScreen } from "./components/screens/JahrScreen.jsx";
import { ManagementScreen } from "./components/screens/ManagementScreen.jsx";
import { MonatScreen } from "./components/screens/MonatScreen.jsx";
import { MoneyMoodScreen } from "./components/screens/MoneyMoodScreen.jsx";
import { TrendOverviewScreen } from "./components/screens/TrendOverviewScreen.jsx";
import { SyncStatusBadge } from "./components/organisms/SyncStatusBadge.jsx";
import { GuidedFeatureTour } from "./components/organisms/GuidedFeatureTour.jsx";
import { useOnlineStatus } from "./hooks/useOnlineStatus.js";

// Selten geöffnete Vollbild-Dialoge/Screens NICHT im Hauptbundle: sie laden
// erst als eigener Chunk, wenn sie per "show*"-Flag tatsächlich aufgerufen
// werden (React.lazy + Suspense an den jeweiligen Render-Stellen weiter
// unten). Named Export → lazy() braucht ein Modul mit "default", daher der
// kleine .then()-Adapter statt einem direkten import().
//
// retryImport: bei instabiler Verbindung (Flugzeug-/Schiffs-WLAN) kann der
// Chunk-Download kurz fehlschlagen — ohne Retry stürzt der Screen sofort mit
// "Failed to fetch dynamically imported module" ab. Zwei Versuche mit kurzer
// Pause fangen die meisten kurzen Netzwerk-Aussetzer ab, bevor aufgegeben wird.
function retryImport(loader, retries = 2, delayMs = 1000) {
  return loader().catch(err => {
    if (retries <= 0) throw err;
    return new Promise(res => setTimeout(res, delayMs)).then(() => retryImport(loader, retries - 1, delayMs * 2));
  });
}
const lazyNamed = (loader, name) => lazy(() => retryImport(loader).then(m => ({ default: m[name] })));
const AddTxModal            = lazyNamed(() => import("./components/organisms/AddTxModal.jsx"), "AddTxModal");
const DataManagerDialog     = lazyNamed(() => import("./components/organisms/DataManagerDialog.jsx"), "DataManagerDialog");
const ExportDialog          = lazyNamed(() => import("./components/organisms/ExportDialog.jsx"), "ExportDialog");
const MobileActionPicker    = lazyNamed(() => import("./components/organisms/MobileActionPicker.jsx"), "MobileActionPicker");
const MobileKategorienModal = lazyNamed(() => import("./components/organisms/MobileKategorienModal.jsx"), "MobileKategorienModal");
const MobileVormerkenModal  = lazyNamed(() => import("./components/organisms/MobileVormerkenModal.jsx"), "MobileVormerkenModal");
const MonthPickerModal      = lazyNamed(() => import("./components/organisms/MonthPickerModal.jsx"), "MonthPickerModal");
const CloudSaveModal        = lazyNamed(() => import("./components/organisms/CloudSaveModal.jsx"), "CloudSaveModal");
const CsvImportScreen       = lazyNamed(() => import("./components/screens/CsvImportScreen.jsx"), "CsvImportScreen");
const EnableBankingWizard   = lazyNamed(() => import("./components/screens/EnableBankingWizard.jsx"), "EnableBankingWizard");
const CloudSetupWizard      = lazyNamed(() => import("./components/screens/CloudSetupWizard.jsx"), "CloudSetupWizard");
const FuelAnalysisScreen    = lazyNamed(() => import("./components/screens/FuelAnalysisScreen.jsx"), "FuelAnalysisScreen");
const MatchingScreen        = lazyNamed(() => import("./components/screens/MatchingScreen.jsx"), "MatchingScreen");
const RecurringDetectionScreen = lazyNamed(() => import("./components/screens/RecurringDetectionScreen.jsx"), "RecurringDetectionScreen");
const VormerkungHub         = lazyNamed(() => import("./components/screens/VormerkungHub.jsx"), "VormerkungHub");

// Fallback während ein Lazy-Chunk lädt — dezenter Spinner statt hartem
// Leerstand, falls die Verbindung mal langsamer ist.
function LazyFallback() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",
      alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.25)"}}>
      <div style={{width:36,height:36,borderRadius:"50%",
        border:"3px solid rgba(255,255,255,0.25)",borderTopColor:"#AACC00",
        animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
}
import { AppCtx } from "./state/AppContext.js";
import { theme as T, setActiveTheme, isLightTheme } from "./theme/activeTheme.js";
import { readableOn } from "./theme/amtPill.js";
import { PAL, gs } from "./theme/palette.js";
import { getTheme, THEMES } from "./theme/themes.js";
import { BASE_ROWS, CUR_YEAR, INIT_ACCOUNTS, INIT_CATS } from "./utils/constants.js";
import { kvStore } from "./utils/kvStore.js";
import { useLocalSaveDebounce } from "./hooks/useLocalSaveDebounce.js";
import { useCloudCredentials } from "./hooks/useCloudCredentials.js";
import { isoAddMonths, calcRecurringCount } from "./utils/date.js";
import { anchorValue, anchorDay } from "./utils/anchors.js";
import { pn, uid, sumAmounts, fmt } from "./utils/format.js";
import { MONTHS_S } from "./utils/constants.js";
import { computeKontoWarnungen } from "./utils/kontoWarnungen.js";
import { Li } from "./utils/icons.jsx";
import { makeYearData } from "./utils/yearData.js";
import { isDuplCounterpart, buildTxIdMap } from "./utils/tx.js";
import { compressTxByYear } from "./utils/cloudTx.js";
import { encryptJSON, decryptJSON, isEncrypted, freshSaltB64 } from "./utils/syncCrypto.js";
import { exportEbForSync, importEbFromSync } from "./utils/enableBankingStore.js";
import { saldoAt, saldoEnde, saldoMitte } from "./utils/saldo.js";
import { getSyncBadgeState } from "./utils/syncBadge.js";
import { recordDeletedTxs, filterTombstonedTxs, getTombstonesForSync, mergeRemoteTombstones } from "./utils/txTombstones.js";
import { getSparWatermarksForSync, mergeRemoteSparWatermarks } from "./utils/sparWatermarks.js";

export default function SupaDupaMoney() {
  const [mainTab,       setMainTab]      = useState("erfassen"); // erfassen|struktur|mehr
  const [sparOpenRequest, setSparOpenRequest] = useState(0);
  const [activeStructurTab, setActiveStructurTab] = useState("daten");
  const [hideEmptyRows, setHideEmptyRows] = useState(true);
  const [themeName, setThemeName] = useState(()=>kvStore.getItem("mbt_theme")||"dark");
  const [noBorders, setNoBorders] = useState(()=>kvStore.getItem("mbt_noborders")==="0" ? false : true);
  const [themeRev, setThemeRev] = useState(0); // incremented to force re-render on same theme
  const [handedness, setHandedness] = useState(()=>kvStore.getItem("mbt_handedness")||"right");
  // Theme-Diashow: lebt hier (statt in ThemeSwitcherMini selbst), weil manche
  // Themes ("Magazin"/hero_layout:"editorial") den Theme-Umschalter an einer
  // ANDEREN Stelle im JSX-Baum rendern (SaldoHeroV2-Zweig) — beim Wechsel
  // dorthin/zurück baut React die Komponente neu auf, ein lokaler State
  // (und sein setInterval) wäre dabei verloren gegangen. Genau das war der
  // gemeldete Bug: die Diashow stoppte stumm exakt beim Erreichen von
  // "Magazin", weil ThemeSwitcherMini dort neu gemountet wurde.
  const [themeSlideshow, setThemeSlideshow] = useState(false);
  useEffect(() => {
    if (!themeSlideshow) return;
    const keys = Object.keys(THEMES).filter(k => k !== "custom_preview");
    const id = setInterval(() => {
      setThemeName(cur => {
        const idx = keys.indexOf(cur);
        const next = keys[(idx+1) % keys.length] || keys[0];
        kvStore.setItem("mbt_theme", next);
        return next;
      });
      setThemeRev(r => r+1);
    }, 1000);
    return () => clearInterval(id);
  }, [themeSlideshow]);
  // T als reaktive Variable — alle Komponenten die T nutzen re-rendern durch Context
  setActiveTheme(themeName, { _rev: themeRev });
  // Haupt-Hintergrundfarbe auch hinter/neben der Notch (Safe-Area, Statusleiste)
  // setzen: body-Hintergrund + theme-color-Meta an die aktuelle Theme-bg koppeln.
  useEffect(() => {
    try {
      document.body.style.background = T.bg;
      let meta = document.querySelector('meta[name="theme-color"]');
      if(meta) meta.setAttribute("content", T.bg);
    } catch(e) {}
  }, [themeName, themeRev]);
  // iOS Safari: Die dynamische Symbolleiste (Adressleiste/Toolbar) ändert die
  // tatsächlich sichtbare Höhe, ohne dass die CSS-Einheit 100svh das
  // zuverlässig nachführt — je nachdem, ob/wie vorher gescrollt wurde, kann
  // 100svh beim Öffnen eines Vollbild-Dialogs kleiner ausfallen als der
  // aktuell wirklich sichtbare Bereich. Das erzeugte den Eindruck, Listen
  // würden "zu früh abgeschnitten" (Daten-Manager, Kategorien & Budget),
  // obwohl der Fehler nicht im Inhalt lag, sondern in der Höhenberechnung
  // des Vollbild-Rahmens selbst. Wir messen die reale Höhe per
  // visualViewport und schreiben sie als CSS-Variable — .mobile-modal nutzt
  // sie (mit 100svh als Fallback) statt sich allein auf die CSS-Einheit zu
  // verlassen.
  useEffect(() => {
    const vv = window.visualViewport;
    let lastH = vv ? vv.height : window.innerHeight;
    const setH = () => {
      try {
        const h = vv ? vv.height : window.innerHeight;
        // Ein plötzlicher, großer Höhenverlust (>150px) kommt praktisch nur
        // von der aufklappenden Bildschirmtastatur (Adressleiste ein-/
        // ausblenden macht nur wenige zehn Pixel aus). Ein Vollbild-Dialog
        // darf dabei NICHT schrumpfen — sonst wird am unteren Rand (dort, wo
        // die Tastatur den Bildschirm verdeckt) kurz der darunterliegende
        // Screen sichtbar (z.B. Kategorieübersicht beim Betrag-Eingeben im
        // Vormerken-Dialog). Deshalb bei Tastatur-Größenordnungen die zuletzt
        // bekannte "echte" Höhe beibehalten; bei Vergrößerung (Tastatur zu,
        // Adressleiste ein-/ausgeblendet) ganz normal übernehmen.
        if(h < lastH - 150) return;
        lastH = h;
        document.documentElement.style.setProperty("--app-vvh", `${h}px`);
      } catch(e) {}
    };
    setH();
    if(vv) {
      vv.addEventListener("resize", setH);
      vv.addEventListener("scroll", setH);
      return () => { vv.removeEventListener("resize", setH); vv.removeEventListener("scroll", setH); };
    } else {
      window.addEventListener("resize", setH);
      return () => window.removeEventListener("resize", setH);
    }
  }, []);
  const [showHamburger, setShowHamburger] = useState(false);
  // ── DEBUG: Performance-Toggles ──
  const [debugFlags, setDebugFlags] = useState(()=>{
    try { return JSON.parse(kvStore.getItem("mbt_debug_flags")||"{}"); } catch { return {}; }
  });
  const setDebugFlag = (key, val) => {
    setDebugFlags(p=>{
      const next = {...p, [key]:val};
      kvStore.setItem("mbt_debug_flags", JSON.stringify(next));
      return next;
    });
  };
  // Globale Verfügbarkeit für alle Komponenten
  React.useEffect(()=>{ window.MBT_DEBUG = debugFlags; }, [debugFlags]);
  // Initial setzen damit erste Render-Pässe es sehen
  if(typeof window!=="undefined") window.MBT_DEBUG = debugFlags;
  // ── Icon-Favoriten (per Swipe-Picker kuratiert) — Schnellwahl im Icon-Picker ──
  const [favIcons, setFavIconsState] = useState(()=>{
    try { return JSON.parse(kvStore.getItem("mbt_fav_icons")||"[]"); } catch { return []; }
  });
  const setFavIcons = (updater) => {
    setFavIconsState(prev=>{
      const next = typeof updater==="function" ? updater(prev) : updater;
      kvStore.setItem("mbt_fav_icons", JSON.stringify(next));
      return next;
    });
  };
  const [subTab,        setSubTab]       = useState("dashboard");
  const navigateToSparen = () => { setMainTab("erfassen"); setSubTab("dashboard"); setSparOpenRequest(v=>v+1); };
  const LS_KEY = "finanzapp_v9";
  // Merkt sich (in kvStore, unabhängig vom großen Daten-Blob) den saved_at-
  // Zeitstempel des Cloud-Stands, mit dem dieses Gerät zuletzt NACHWEISLICH
  // synchron war (nach einem erfolgreichen Push ODER Pull). Der reine
  // Vergleich "ist mein lokaler saved_at älter als der von Cloudflare?" ist
  // dafür ungeeignet: jede lokale Änderung — auch ein (ggf. unvollständiger)
  // Cloud-Import — stempelt saved_at beim nächsten Auto-Save neu auf "jetzt",
  // wodurch lokal fälschlich "aktueller" aussieht als Cloudflare, obwohl der
  // Inhalt noch abweicht. Der Sync-Anker vergleicht stattdessen den
  // tatsächlichen Cloud-Zeitstempel gegen den zuletzt bestätigt synchronisierten
  // — ändert sich der, hat garantiert ein anderes Gerät seither gespeichert.
  const CF_SYNC_MARK_KEY = "mbt_cf_synced_at";
  const getCfSyncedAt = () => parseInt(kvStore.getItem(CF_SYNC_MARK_KEY) || "0", 10) || 0;
  const setCfSyncedAt = (ts) => { try { kvStore.setItem(CF_SYNC_MARK_KEY, String(ts||0)); } catch(e) {} };

  const [isLand,        setIsLand]       = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(true); // Jahresansicht immer alle Monate
  const [year,          setYear]         = useState(CUR_YEAR);
  const [month,         setMonth]        = useState(new Date().getMonth());
  // Während Monatswähler-Modal offen ist: Hauptcontent rendert mit gefrorenem year/month,
  // damit Pfeil-Klicks im Modal nicht den schweren Hauptcontent re-rendern lassen.
  const [frozenYear,  setFrozenYear]  = useState(CUR_YEAR);
  const [frozenMonth, setFrozenMonth] = useState(new Date().getMonth());
  // Zähler statt Boolean: MonatScreen beobachtet ihn per useEffect und scrollt
  // bei JEDER Änderung erneut zum heutigen Tag — auch wenn "heute" (Anker-Monat)
  // sich zwischen zwei Sprüngen gar nicht geändert hat.
  const [scrollToTodayTick, setScrollToTodayTick] = useState(0);
  const [selAcc,        setSelAcc]       = useState(null); // Globaler Konto-Filter (null = Gesamt)
  const [col3Name,      setCol3Name]     = useState("aktuell");
  const [csvRules,      setCsvRules]     = useState({});
  const [budgets,       setBudgets]      = useState({}); // {catId: monatsbetrag}
  const [startBalances, setStartBalances] = useState({}); // {year: {accountId: betrag}}
  const [cats,          setCats]         = useState(INIT_CATS);
  const [groups,        setGroups]       = useState([]);
  const [txs,           setTxs]         = useState([]);
  const [accounts,      setAccounts]     = useState(INIT_ACCOUNTS);
  // Fahrzeuge für die Tank-Erfassung (Verbrauch/Preis je Fahrzeug): {id,name,icon,color}
  const [vehicles,      setVehicles]     = useState([]);
  const [yearData,      setYearData]     = useState(makeYearData);
  const [jEditing,      setJEditing]     = useState(null);
  const [jEditVal,      setJEditVal]     = useState("");
  const [modal,         setModal]        = useState(null);
  const [mgmtCat,       setMgmtCat]     = useState(null);
  const [editTx,        setEditTx]       = useState(null);
  const [exportModal,   setExportModal]  = useState(null);
  const [exportDialog,  setExportDialog] = useState(null);
  const [showDataMgr,   setShowDataMgr]  = useState(false);
  const [newTx,         setNewTx]        = useState(()=>({
    date: new Date().toISOString().split("T")[0],
    totalAmount:"", desc:"", note:"", pending:false,
    repeatMonths:1, accountId:"acc-giro",
    splits:[{id:uid(),catId:"",subId:"",amount:""}],
  }));
  const [newCat,        setNewCat]       = useState({name:"",type:"expense",icon:"tag",color:T.blue,subs:[]});
  const [newSubName,    setNewSubName]   = useState("");
  const [showSettings,  setShowSettings] = useState(false);
  const [mobileMode, setMobileMode] = useState(false); // Großes Mobile-UI
  const [showMobileVormerken, setShowMobileVormerken] = useState(false);
  const [showMobileWiederkehrend, setShowMobileWiederkehrend] = useState(false);
  const [showMobileWiederkehrendTyp, setShowMobileWiederkehrendTyp] = useState("wiederkehrend");
  const [showMobilePicker, setShowMobilePicker] = useState(false);
  // Öffnet das Mehr-Menü wieder — für Zurück-Navigation aus Vormerken/Zuordnen.
  const reopenMobilePicker = () => setShowMobilePicker(true);
  // Plus-Button: arretiert (höhere Position + 1,5× Größe) ja/nein
  // NICHT persistiert — beim App-Start immer false (Bottom-Bar-Position)
  const [plusArretiert, setPlusArretiert] = useState(false);
  // True, solange der Money-Mood/Trend-Drilldown offen ist. Dort wird der + Button
  // vergrößert angezeigt und ist frei vertikal verschiebbar (drillBtnY); Links/
  // Rechts-Wisch schaltet weiter das Jahr. Standard-Y bei jedem Öffnen.
  const [moodDrillOpen, setMoodDrillOpen] = useState(false);
  const [drillBtnY, setDrillBtnY] = useState(-260);
  useEffect(() => {
    const h = e => { setMoodDrillOpen(!!e.detail); if (e.detail) setDrillBtnY(-260); };
    window.addEventListener("sdm-drill", h);
    return () => window.removeEventListener("sdm-drill", h);
  }, []);
  const [showMobileBudget, setShowMobileBudget] = useState(false);
  const [showMobileKategorien, setShowMobileKategorien] = useState(false);
  const [showMonthPickerModal, setShowMonthPickerModal] = useState(false);  // für Master-Button
  const [showCloudSave, setShowCloudSave] = useState(false);  // Cloud-Speichern-Modal (Wisch ↓)
  // Betrags-Sichtbarkeit (Augensymbol): 0 = unscharf + neutral, 1 = scharf +
  // neutral, 2 = scharf + farbig (wie bisher). Startet IMMER bei 0 (alle Beträge
  // unscharf & in Kategorie-Schriftfarbe) — bewusst nicht persistiert.
  const [amtMode, setAmtMode] = useState(0);
  // Betrags-Schriftvariante (persistiert, zum Testen umschaltbar im Theme-Menü):
  // "" = Geldschrift Questrial (Standard, Schnitt 400)
  // "medium" = System-Font 500, "semibold" = System-Font 600 (echte Schnitte +
  // tabellarische Ziffern). Klasse amtfont-* am Wurzel-Div schaltet die CSS-Regel.
  const [amtFont, setAmtFontState] = useState(()=>kvStore.getItem("mbt_amt_font")||"");
  const setAmtFont = (v)=>{ setAmtFontState(v||""); kvStore.setItem("mbt_amt_font", v||""); };
  // Sync: wenn Modal NICHT offen ist, frozenYear/frozenMonth = year/month
  React.useEffect(()=>{
    if(!showMonthPickerModal) {
      setFrozenYear(year);
      setFrozenMonth(month);
    }
  }, [showMonthPickerModal, year, month]);
  const masterTouchRef = React.useRef({x:0,y:0,t:0,moved:false,zone:null});
  const masterLastTapRef = React.useRef({zone:null,t:0,timer:null});
  // Master-Button-Override: wenn ein Mobile-Wizard (z.B. Vormerken) aktiv ist,
  // übernimmt der Plus-Knopf dessen Bestätigungs-Aktion. Tipp = Bestätigen,
  // Wisch ← = Zurück, Wisch ↓ = Modal schließen.
  //   { label, onConfirm, onBack|null, onDismiss, disabled? }
  const [masterOverride, setMasterOverride] = useState(null);

  // Merkt sich den zuletzt aktiven Haupt-Tab (außerhalb der Struktur-/
  // Einstellungs-Screens). Verlässt man die Einstellungen per Doppel-Tap,
  // kehrt man hierher zurück (z.B. nach Monat), statt immer auf Home zu springen.
  const prevTabRef = React.useRef({mainTab:"erfassen", subTab:"dashboard"});
  React.useEffect(() => {
    if(mainTab !== "struktur") prevTabRef.current = {mainTab, subTab};
  }, [mainTab, subTab]);

  // Hinweis: Der +-Button-Override für die Struktur-Screens wird weiter unten
  // gesetzt (nach allen Overlay-States), damit er nur greift, wenn KEIN Overlay
  // darüber offen ist. Siehe Effekt „struktur-Override".
  const [dashDrillOpen, setDashDrillOpen] = useState(false);
  const [reviewQueue,   setReviewQueue]  = useState(null);
  const [customIcons,   setCustomIconsRaw] = useState(()=>{
    try { return JSON.parse(kvStore.getItem("mbt_custom_icons")||"[]"); } catch{ return []; }
  });
  const setCustomIcons = (updater) => {
    setCustomIconsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      window._customIcons = next; // Bridge für Li()
      return next;
    });
  };
  // Bridge initialisieren
  React.useEffect(()=>{ window._customIcons = customIcons; }, [customIcons]); // globaler Review-Dialog
  const [showCsv,       setShowCsv]       = useState(false);
  const [showBankWizard, setShowBankWizard] = useState(false);
  const [showCloudSetup, setShowCloudSetup] = useState(false);
  const [showFuelAnalysis, setShowFuelAnalysis] = useState(false);
  // Interaktive, hervorhebende Tour (Hero-"?"-Symbol) — anders als die
  // übrigen showXxx-Vollbild-Screens ERSETZT sie den Inhalt NICHT, sondern
  // liegt als Overlay ÜBER dem jeweils aktiven Tab (springt beim Weiter-
  // Klicken selbst zwischen Tabs). Der Schritt-Index lebt lokal in
  // GuidedFeatureTour (setzt sich bei jedem Öffnen automatisch zurück).
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [importText,    setImportText]     = useState("");
  const [importStatus,  setImportStatus]   = useState(null);
  const [topMenu,       setTopMenu]        = useState(null); // "laden"|"speichern"|null
  useEffect(()=>{
    if(!topMenu) return;
    const close = ()=>setTopMenu(null);
    document.addEventListener("click", close);
    return ()=>document.removeEventListener("click", close);
  },[topMenu]);
  const [showMatching,  setShowMatching]  = useState(false);
  const [showVormMenu,   setShowVormMenu]   = useState(false);
  const [showVormHub,    setShowVormHub]    = useState(false);
  const [editVormTx,    setEditVormTx]    = useState(null); // Bearbeiten-Modus für VormerkungHub
  const [showOverdueList, setShowOverdueList] = useState(false); // Liste überfälliger Vormerkungen (Banner-Tap)
  const [showSupaQuick,  setShowSupaQuick]  = useState(false);
  const [showRecurring,     setShowRecurring]     = useState(false);
  const [showKategorisieren,setShowKategorisieren] = useState(false);
  const [confirmReset,  setConfirmReset]  = useState(false);
  // const [reconstructed, setReconstructed] = useState(false); // entfernt
  const [accIconPick,   setAccIconPick]   = useState(null);
  const [quickBtns, setQuickBtns] = useState([]);
  const [quickColors, setQuickColors] = useState([]);
  const globalDrag = React.useRef(null);
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  // WICHTIG: startet mit "loading", NICHT "idle". Der Boot-Ladevorgang setzt
  // "loading" erst INNERHALB des cfCredsReady-Effekts (siehe unten) — bis
  // cfCredsReady selbst true wird, ist das ein async IndexedDB-Read. Startete
  // syncStatus mit "idle", hätte useLocalSaveDebounce in genau diesem Fenster
  // (vor dem ersten echten Laden) "loading:false" gesehen und die noch LEEREN
  // Anfangswerte (cats=INIT_CATS, txs=[]) nach 300ms ins lokale IndexedDB
  // gespeichert — und damit echte, bereits vorhandene lokale Daten
  // überschrieben, sofern der eigentliche Ladevorgang (z. B. bei einem
  // Absturz/Reload mittendrin) nicht rechtzeitig vorher fertig wurde.
  const [syncStatus, setSyncStatus] = useState("loading");
  // Einmaliger Re-Render, sobald der asynchron geladene Lucide-Chunk bereit
  // ist — danach rendern auch nutzergewählte Icons (Kategorien/Konten)
  const [, setLucideReady] = useState(typeof window!=="undefined" && !!window.LucideIcons);
  useEffect(()=>{
    const on = () => setLucideReady(true);
    window.addEventListener("lucide-ready", on);
    return () => window.removeEventListener("lucide-ready", on);
  }, []);
  // Nach Enable-Banking-Bank-Redirect direkt den Connect-Screen öffnen
  useEffect(()=>{
    try {
      if(sessionStorage.getItem("eb_open_connect")) {
        sessionStorage.removeItem("eb_open_connect");
        setShowBankWizard(true);
      }
    } catch(e) {}
  }, []);

  // ── +-Button-Override für die Struktur-Screens (Einstellungen/Konten/Kategorien) ──
  // Navigations-Gesten statt eigenem Zurück-Pfeil/✕: Doppel-Tap = schließen
  // (zurück zum vorherigen Tab), Wisch ← = zurück ins Mehr-Menü.
  // WICHTIG: nur aktiv, wenn KEIN Overlay (Mehr-Menü, Daten-Manager, Dialoge …)
  // darüber offen ist — sonst zeigte der Knopf ein veraltetes Label und sein
  // Schließen träfe das obenliegende Overlay nicht. Overlays bringen ihre eigene
  // Schließen-/Override-Logik mit (eigene Kopfzeile bzw. eigener Override).
  const _structOverlayOpen =
    showMobilePicker || showDataMgr || showMobileKategorien || showMobileVormerken ||
    showMobileWiederkehrend || showMobileBudget || showCsv || showBankWizard ||
    showCloudSetup || showFuelAnalysis || showMatching || showVormHub || showVormMenu ||
    showRecurring || showKategorisieren || showMonthPickerModal || showCloudSave ||
    showSettings || showSupaQuick || showQuickPicker || !!modal || !!exportModal ||
    !!exportDialog || !!reviewQueue || dashDrillOpen || !!accIconPick || !!editTx;
  React.useEffect(() => {
    // !showGuidedTour: sonst schwebt der vergrößerte Override-Knopf über der
    // Feature-Tour-Karte (Regression: Nutzer-Feedback, "Kategorien & Budgets"
    // -Schritt landet auf dem Struktur-Tab und triggert diesen Override
    // unabhängig davon, welches Element die Tour gerade erklärt).
    if(mainTab==="struktur" && !_structOverlayOpen && !showGuidedTour) {
      setMasterOverride({
        label: "←zurück 2×schließen",
        dismissOnDoubleTap: true,                          // Doppel-Tap → onDismiss; Einzel-Tap: nichts
        onConfirm: () => {},                               // Einzel-Tap: bewusst ohne Aktion
        onBack: () => {                                    // Wisch ← : eine Ebene zurück ins Mehr-Menü
          // WICHTIG: zuerst die struktur-Ebene verlassen (mainTab wechseln),
          // DANN das Menü öffnen — sonst läge das Menü über struktur und ein
          // anschließendes Schließen fiele in den Struktur-Screen zurück (Loop).
          // Den +-Knopf NICHT verkleinern: das Mehr-Menü wird mit großem Knopf
          // bedient. Verkleinern passiert nur beim Doppel-Tap (onDismiss).
          const p = prevTabRef.current;
          setMainTab(p.mainTab); setSubTab(p.subTab);
          reopenMobilePicker();
        },
        onDismiss: () => {                                 // Doppel-Tap → schließen, zurück zum vorherigen Tab (Dashboard)
          setShowMobilePicker(false);
          const p = prevTabRef.current;
          setMainTab(p.mainTab); setSubTab(p.subTab);
          setPlusArretiert(false);
        },
      });
      return () => setMasterOverride(null);
    }
  }, [mainTab, activeStructurTab, _structOverlayOpen, showGuidedTour]);
  const [isDirty, setIsDirty] = useState(false);
  const [syncError, setSyncError] = useState("");

  // Cloud-Zugangsdaten (Supa/JSONBin/Gist/Cloudflare) ausgelagert nach
  // hooks/useCloudCredentials.js — reines State-/Persistenz-Management.
  // Die Sync-Funktionen (cfSave/cfLoad/gistSave/… normCfUrl) bleiben hier.
  const {
    supaUrl, setSupaUrl, supaKey, setSupaKey, supaStatus, setSupaStatus,
    supaError, setSupaError, supaLockKey, setSupaLockKey, supaActive,
    jsonbinKey, setJsonbinKey, jsonbinId, setJsonbinId, jsonbinStatus, setJsonbinStatus, jsonbinActive,
    gistToken, setGistToken, gistId, setGistId, gistStatus, setGistStatus, gistActive,
    cfUrl, cfSecret, setCfUrl, setCfSecret, cfCredsReady, cfStatus, setCfStatus, cfActive,
    syncPass, setSyncPass, syncPassReady, syncEncActive,
  } = useCloudCredentials();

  const normCfUrl = (url) => {
    if(!url) return "";
    url = url.trim();
    if(url && !url.startsWith("http")) url = "https://" + url;
    return url.replace(/\/+$/, ""); // trailing slash entfernen
  };

  const cfSave = async (payload) => {
    if(!normCfUrl(cfUrl) || !cfSecret) throw new Error("Cloudflare URL oder Secret fehlt");
    const clean = JSON.parse(JSON.stringify(payload));
    Object.keys(clean.yearData||{}).forEach(y=>Object.keys(clean.yearData[y]||{}).forEach(m=>{
      Object.keys(clean.yearData[y][m]||{}).forEach(k=>{if(k.startsWith("jsub_"))delete clean.yearData[y][m][k];});
    }));
    // Aufteilen: config + txs pro Jahr
    const {txs: rawTxs, ...configOnly} = clean;
    const base = normCfUrl(cfUrl);
    const headers = {"Content-Type":"application/json","X-Secret":cfSecret};

    // Letzte Verteidigungslinie GEGEN wiederkehrende gelöschte Buchungen:
    // BEVOR überhaupt irgendetwas hochgeladen wird, kurz die aktuell in der
    // Cloud stehenden Tombstones/Sparplan-Wasserzeichen abholen und lokal
    // übernehmen. Grund: dieses Gerät kann einen veralteten lokalen Stand
    // haben (z.B. nach längerer Inaktivität + Reconnect-Auto-Save, oder wenn
    // kurz zuvor ein ANDERES Gerät etwas gelöscht und synchronisiert hat) —
    // ohne diesen Vorab-Abgleich würde so ein Push die fremde Löschung
    // versehentlich rückgängig machen, unabhängig davon, wodurch die
    // Buchung ursprünglich entstanden ist (Sparplan, Budget-Platzhalter,
    // manuell, …). Das schließt das Zeitfenster, das die rein reaktive
    // Übernahme beim Laden (cfLoad-Aufrufer) offen lässt, wenn ein Gerät
    // zwischen zwei Loads einfach nur speichert.
    try {
      const remoteRes = await fetch(`${base}/config`, {headers:{"X-Secret":cfSecret}});
      if(remoteRes.ok) {
        const remoteRaw = await remoteRes.json();
        const remoteConfig = isEncrypted(remoteRaw)
          ? (syncPass ? await decryptJSON(remoteRaw, syncPass) : null)
          : remoteRaw;
        if(remoteConfig) {
          if(remoteConfig._txTombstones) mergeRemoteTombstones(remoteConfig._txTombstones);
          if(remoteConfig._sparWatermarks) mergeRemoteSparWatermarks(remoteConfig._sparWatermarks);
        }
      }
    } catch(e) { console.warn("Tombstone-/Wasserzeichen-Vorabgleich vor Push übersprungen:", e); }
    // Lokalen State direkt mitbereinigen, damit die UI nicht kurzzeitig eine
    // Buchung zeigt, die der folgende Push ohnehin schon ausschließt.
    const allTxs = filterTombstonedTxs(rawTxs);
    if(allTxs.length !== rawTxs.length) setTxs(prev => filterTombstonedTxs(prev));

    // Privaten Bank-Schlüssel (.pem) + Verbindungsdaten NUR mitsynchronisieren,
    // wenn eine Passphrase aktiv ist — dann landet er ausschließlich verschlüsselt
    // im /config-Body. Ohne Passphrase verlässt der Schlüssel das Gerät nie.
    if(syncPass) {
      try { const eb = await exportEbForSync(); if(eb) configOnly._ebSecure = eb; }
      catch(e) { console.warn("EB-Sync-Export übersprungen:", e); }
    }
    // Eigene Farbthemes liegen lokal in kvStore — mit in den Worker-Sync nehmen,
    // damit beide Sicherungswege (Worker und Daten-Manager) sie abdecken.
    try {
      const ct = JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}");
      if(ct && Object.keys(ct).length) configOnly.customThemes = ct;
    } catch(e) {}
    // Tombstones gelöschter Buchungen mitschicken (inkl. der gerade eben von
    // der Cloud übernommenen) — sonst kennt ein zweites Gerät (z.B. iPhone)
    // eine auf dem Mac gelöschte Buchung nicht und lädt sie beim eigenen
    // nächsten Push versehentlich wieder hoch (siehe utils/txTombstones.js).
    const tombstones = getTombstonesForSync();
    if(Object.keys(tombstones).length) configOnly._txTombstones = tombstones;
    // Sparplan-Wasserzeichen mitschicken — sonst kennt ein zweites Gerät die
    // frühere Spanne eines Sparplan-Beins nicht und könnte eine dort zuvor
    // gelöschte letzte Rate beim eigenen "Neuberechnen" für neu halten und
    // wieder anlegen (siehe utils/sparWatermarks.js).
    const sparWatermarks = getSparWatermarksForSync();
    if(Object.keys(sparWatermarks).length) configOnly._sparWatermarks = sparWatermarks;
    const byYear = compressTxByYear(allTxs);
    // Jahre, für die die Cloud noch Daten hat, dieses Gerät lokal aber GAR
    // KEINE Buchungen mehr (z.B. weil die letzte/einzige Buchung dieses
    // Jahres gerade eben durch einen Tombstone herausgefiltert wurde) —
    // ohne das würde die obige Schreib-Schleife dieses Jahr komplett
    // überspringen (sie iteriert nur über lokal vorhandene Jahre) und der
    // veraltete Cloud-Datensatz für dieses Jahr bliebe für immer stehen,
    // inklusive der eigentlich gelöschten Buchung. Explizit ein leeres Array
    // ergänzen, damit die Schreib-Schleife dieses Jahr trotzdem anfasst.
    try {
      const keysRes = await fetch(`${base}/keys`, {headers:{"X-Secret":cfSecret}});
      if(keysRes.ok) {
        const keys = await keysRes.json();
        (keys.txYears||[]).forEach(y => { if(!(y in byYear)) byYear[y] = []; });
      }
    } catch(e) { console.warn("Jahres-Liste vor Push nicht abrufbar, übersprungen:", e); }

    // Zero-Knowledge: Ist eine Passphrase gesetzt, wird jeder Body vor dem
    // Hochladen client-seitig verschlüsselt. Ein gemeinsamer Salt pro Sync-Lauf
    // → PBKDF2-Schlüssel nur einmal ableiten. Delta-Hashes bleiben auf Klartext.
    const saltB64 = syncPass ? freshSaltB64() : null;
    const wrap = (obj) => syncPass ? encryptJSON(obj, syncPass, {salt:saltB64}) : Promise.resolve(obj);

    // Reihenfolge bewusst: erst die Buchungs-Jahre schreiben, Config zuletzt.
    // cfSave() macht mehrere unabhängige PUT-Requests — schlägt einer davon
    // fehl (Netz-Hänger), bricht die Funktion mit einer Exception ab. Würde
    // Config ZUERST geschrieben, stünde auf dem Server danach ein neuer
    // saved_at-Zeitstempel, obwohl die Buchungsdaten für das fehlgeschlagene
    // Jahr noch den alten Stand zeigen — die App hielte den Cloud-Stand beim
    // nächsten Start fälschlich für vollständig synchron und "neuer", ein
    // bestätigtes Nachladen würde dann bereits gelöschte Buchungen aus dem
    // veralteten Jahres-Datensatz wieder aufleben lassen. Erst wenn ALLE
    // Jahres-Schreibvorgänge durch sind, ist der Stand auch wirklich
    // vollständig — erst dann darf Config (und damit saved_at) folgen.
    let txWrites = 0;
    for(const [y,arr] of Object.entries(byYear)) {
      const hash = arr.length + "|" + arr.map(t=>t.id).sort().join(",").slice(0,200);
      if(savedYearHashRef.current[y] !== hash) {
        const body = await wrap(arr);
        await fetch(`${base}/txs/${y}`, {method:"PUT", headers,
          body:JSON.stringify(body)
        }).then(r=>{if(!r.ok)throw new Error(`CF txs ${y}: ${r.status}`);});
        savedYearHashRef.current[y] = hash;
        txWrites++;
      }
    }

    // Delta-Sync: Config nur wenn geändert — saved_at kommt 1:1 vom Aufrufer
    // (payload.saved_at), damit der lokale Sync-Anker (setCfSyncedAt) exakt
    // denselben Zeitstempel trägt wie das, was gerade tatsächlich auf dem
    // Server steht.
    const configStr = JSON.stringify(configOnly);
    const configHash = configStr.length + "|" + configStr.slice(0,100);
    let configWrites = 0;
    if(configHash !== savedConfigHashRef.current) {
      const body = await wrap({...configOnly, saved_at: configOnly.saved_at||Date.now()});
      await fetch(`${base}/config`, {method:"PUT", headers,
        body:JSON.stringify(body)
      }).then(r=>{if(!r.ok)throw new Error(`CF config: ${r.status}`);});
      savedConfigHashRef.current = configHash;
      configWrites = 1;
    }
    console.log(`CF Delta-Sync: ${configWrites} config + ${txWrites} Jahre (von ${Object.keys(byYear).length})`);
  };

  const cfLoad = async () => {
    const base = cfUrl.replace(/\/$/, "");
    const headers = {"X-Secret":cfSecret};
    // Erkennt verschlüsselte Bodies und entschlüsselt sie mit der lokalen
    // Passphrase. Unverschlüsselte (alte) Stores werden unverändert gelesen.
    const unwrap = async (data) => {
      if(!isEncrypted(data)) return data;
      if(!syncPass) throw new Error("Daten sind verschlüsselt — bitte Passphrase eingeben");
      return decryptJSON(data, syncPass);
    };
    const cfgRes = await fetch(`${base}/config`, {headers});
    if(!cfgRes.ok) throw new Error(`CF config: ${cfgRes.status}`);
    const config = await unwrap(await cfgRes.json());
    // Verschlüsselt mitgelieferten Bank-Schlüssel lokal übernehmen (nur wenn
    // dieses Gerät noch keinen hat) und aus der App-Nutzlast entfernen.
    if(config && config._ebSecure) {
      try { await importEbFromSync(config._ebSecure); } catch(e) { console.warn("EB-Sync-Import:", e); }
      delete config._ebSecure;
    }
    // Alle Jahres-Keys laden
    const keysRes = await fetch(`${base}/keys`, {headers});
    if(!keysRes.ok) throw new Error(`CF keys: ${keysRes.status}`);
    const keys = await keysRes.json();
    const txs = [];
    for(const key of (keys.txYears||[])) {
      const r = await fetch(`${base}/txs/${key}`, {headers});
      if(r.ok) { const arr=await unwrap(await r.json()); txs.push(...arr); }
    }
    return {...config, txs};
  };

  const gistSave = async (payload) => {
    const clean = JSON.parse(JSON.stringify(payload));
    Object.keys(clean.yearData||{}).forEach(y=>Object.keys(clean.yearData[y]||{}).forEach(m=>{
      Object.keys(clean.yearData[y][m]||{}).forEach(k=>{if(k.startsWith("jsub_"))delete clean.yearData[y][m][k];});
    }));
    // Aufteilen: Config (ohne txs) + Buchungen pro Jahr als separate Dateien
    const {txs: allTxs, ...configOnly} = clean;
    const files = {"mbt-config.json": {content: JSON.stringify({...configOnly, saved_at: Date.now()})}};
    // Buchungen pro Jahr komprimieren (kanonisch, siehe utils/cloudTx.js)
    const byYear = compressTxByYear(allTxs);
    Object.entries(byYear).forEach(([y,arr])=>{
      // Große Jahre in Hälften aufteilen (>500 Buchungen oder >800KB)
      const fullContent = JSON.stringify(arr);
      if(fullContent.length < 800*1024) {
        const kb = Math.round(fullContent.length/1024);
        console.log(`  mbt-txs-${y}.json: ${arr.length} Buchungen, ~${kb}KB`);
        files[`mbt-txs-${y}.json`] = {content: fullContent};
      } else {
        // Aufteilen in Quartale
        for(let q=0; q<4; q++) {
          const startM = q*3, endM = q*3+2;
          const chunk = arr.filter(t=>{const m=new Date(t.date).getMonth();return m>=startM&&m<=endM;});
          if(chunk.length===0) continue;
          const c = JSON.stringify(chunk);
          const kb = Math.round(c.length/1024);
          console.log(`  mbt-txs-${y}-q${q+1}.json: ${chunk.length} Buchungen, ~${kb}KB`);
          files[`mbt-txs-${y}-q${q+1}.json`] = {content: c};
        }
      }
    });
    const totalKb = Object.values(files).reduce((s,f)=>s+Math.round(f.content.length/1024),0);
    console.log(`GitHub Gist Upload: ${Object.keys(files).length} Dateien, ~${totalKb}KB gesamt`);
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {"Authorization":`token ${gistToken}`, "Content-Type":"application/json"},
      body: JSON.stringify({files})
    });
    if(!res.ok) throw new Error(`Gist ${res.status}: ${await res.text()}`);
    return res.json();
  };

  const gistLoad = async () => {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {"Authorization":`token ${gistToken}`}
    });
    if(!res.ok) throw new Error(`Gist ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const files = data.files||{};
    // Config laden
    const cfgFile = files["mbt-config.json"];
    if(!cfgFile) throw new Error("mbt-config.json nicht im Gist gefunden");
    // Dateien laden — bei truncated via GitHub API (nicht raw_url, CORS-Problem)
    const loadFile = async (file) => {
      if(!file.truncated && file.content) return file.content;
      // Truncated: Gist nochmals laden — GitHub API gibt volle Inhalte zurück
      // wenn die Datei <= 10MB ist (was bei unseren Daten immer der Fall ist)
      console.log(`  ${file.filename}: truncated, lade via API...`);
      const r = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers:{"Authorization":`token ${gistToken}`, "Accept":"application/vnd.github.v3.raw"}
      });
      if(!r.ok) throw new Error(`Gist API Fehler ${r.status}`);
      const d = await r.json();
      const f2 = d.files?.[file.filename];
      if(!f2) throw new Error(`Datei ${file.filename} nicht gefunden`);
      if(f2.content) return f2.content;
      throw new Error(`Datei ${file.filename} immer noch truncated`);
    };
    const config = JSON.parse(await loadFile(cfgFile));
    // Buchungen aus allen Jahres-Dateien zusammenführen
    const txs = [];
    for(const [name, file] of Object.entries(files)) {
      if(!name.match(/^mbt-txs-/)) continue;
      try {
        const arr = JSON.parse(await loadFile(file));
        txs.push(...arr);
        console.log(`  ${name}: ${arr.length} Buchungen geladen`);
      } catch(e) {
        console.error(`  ${name}: Fehler beim Laden:`, e.message);
      }
    }
    // Fallback: alte mbt-data.json
    if(!config.cats?.length && files["mbt-data.json"]) {
      const old = JSON.parse(await loadFile(files["mbt-data.json"]));
      return old;
    }
    return {...config, txs};
  };

  const jsonbinSave = async (payload) => {
    // Komprimieren: jsub_* aus yearData entfernen, unnötige Felder kürzen
    const clean = JSON.parse(JSON.stringify(payload));
    Object.keys(clean.yearData||{}).forEach(y=>Object.keys(clean.yearData[y]||{}).forEach(m=>{
      Object.keys(clean.yearData[y][m]||{}).forEach(k=>{if(k.startsWith("jsub_"))delete clean.yearData[y][m][k];});
    }));
    const body = JSON.stringify(clean);
    const kb = Math.round(body.length/1024);
    console.log(`JSONBin Upload: ~${kb}KB`);
    const res = await fetch(`https://api.jsonbin.io/v3/b/${jsonbinId}`, {
      method: "PUT",
      headers: {"Content-Type":"application/json", "X-Master-Key": jsonbinKey, "X-Bin-Versioning":"false"},
      body
    });
    if(!res.ok) {
      const errText = await res.text().catch(()=>"(kein Text)");
      throw new Error(`JSONBin ${res.status}: ${errText} (Datenmenge: ~${kb}KB)`);
    }
    return res.json();
  };

  const jsonbinLoad = async () => {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${jsonbinId}/latest`, {
      headers: {"X-Master-Key": jsonbinKey}
    });
    if(!res.ok) {
      const errText = await res.text().catch(()=>"");
      throw new Error(`JSONBin ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.record;
  };

  const supaFetch = async (table, method, body=null, query="", _urlOverride, _keyOverride) => {
    const _u = _urlOverride || supaUrl;
    const _k = _keyOverride || supaKey;
    const url = `${_u}/rest/v1/${table}${query}`;
    const res = await fetch(url, {
      method,
      headers: {
        "apikey": _k,
        "Authorization": `Bearer ${_k}`,
        "Content-Type": "application/json",
        "Prefer": method==="POST" ? "resolution=merge-duplicates,return=minimal" : "return=minimal",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if(!res.ok) throw new Error(`${res.status}: ${text}`);
    try { return method==="GET" ? JSON.parse(text) : null; } catch(e) { return null; }
  };

  // Tx → DB row
  const txToRow = (tx) => ({
    id: tx.id, user_id: "default",
    date: tx.date, description: tx.desc||"",
    total_amount: parseFloat(tx.totalAmount)||0,
    account_id: tx.accountId||"",
    pending: tx.pending||false,
    pending_date: tx.pendingDate||"",
    repeat_months: tx.repeatMonths||1,
    csv_type: tx._csvType||"",
    splits: tx.splits||[],
    linked_ids: tx.linkedIds||[],
    fingerprint: tx._fp||"",
    extra: {readOnlyAmount: tx._readOnlyAmount||false, note: tx.note||"", csvSource: tx._csvSource||""},
    updated_at: new Date().toISOString(),
  });

  // DB row → Tx
  const rowToTx = (row) => ({
    id: row.id, date: row.date,
    desc: row.description||"",
    totalAmount: parseFloat(row.total_amount)||0,
    accountId: row.account_id||"",
    pending: row.pending||false,
    pendingDate: row.pending_date||"",
    repeatMonths: row.repeat_months||1,
    _csvType: row.csv_type||"",
    splits: Array.isArray(row.splits)?row.splits:[],
    linkedIds: Array.isArray(row.linked_ids)?row.linked_ids:[],
    _fp: row.fingerprint||"",
    _readOnlyAmount: row.extra?.readOnlyAmount||false,
    note: row.extra?.note||"",
    _csvSource: row.extra?.csvSource||"",
  });

  const testSupaConnection = async () => {
    if(!supaUrl||!supaKey) return;
    setSupaStatus("saving"); setSupaError("");
    try {
      await supaFetch("config", "GET", null, "?key=eq.cats&limit=1");
      setSupaStatus("ok"); setSupaError("");
    } catch(e) { setSupaStatus("error"); setSupaError(e.message); }
  };

  const loadFromSupa = async (_urlOv, _keyOv) => {
    const cfgRows = await supaFetch("config", "GET", null, "?user_id=eq.default", _urlOv, _keyOv);
    const cfg = {};
    (cfgRows||[]).forEach(r=>{ cfg[r.key]=r.value; });
    if(cfg.cats?.length)     setCats(cfg.cats.map(c=>({...c,subs:Array.isArray(c.subs)?c.subs:[],icon:c.icon||"tag",color:c.color||T.blue})));
    if(cfg.groups?.length)   setGroups(cfg.groups);
    if(cfg.accounts?.length) setAccounts(cfg.accounts);
    if(cfg.yearData) {
      const cleaned = JSON.parse(JSON.stringify(cfg.yearData));
      Object.keys(cleaned).forEach(y=>Object.keys(cleaned[y]||{}).forEach(m=>{
        Object.keys(cleaned[y][m]||{}).forEach(k=>{
          if(k.startsWith("jsub_")) delete cleaned[y][m][k];
        });
      }));
      setYearData(cleaned);
    }
    if(cfg.col3Name)         setCol3Name(cfg.col3Name);
    if(cfg.quickBtns)        setQuickBtns(cfg.quickBtns);
    if(cfg.quickColors)      setQuickColors(cfg.quickColors);
    if(cfg.csvRules)         setCsvRules(cfg.csvRules);
    // Merge mit lokalem Backup (falls Supabase weniger Regeln hat)
    try {
      const localBackup = JSON.parse(kvStore.getItem("mbt_csvRules_backup")||"{}");
      if(Object.keys(localBackup).length > Object.keys(cfg.csvRules||{}).length) {
        setCsvRules({...localBackup,...(cfg.csvRules||{})});
      }
    } catch(e){}
    if(cfg.budgets) setBudgets(cfg.budgets);
    if(cfg.startBalances) {
      // Keys als Zahlen normalisieren — Migration passiert via useEffect sobald txs geladen
      const normalized = {};
      Object.entries(cfg.startBalances).forEach(([k,v])=>{ normalized[Number(k)]=v; });
      setStartBalances(normalized);
    }
    if(Array.isArray(cfg.customIcons) && cfg.customIcons.length) {
      setCustomIcons(cfg.customIcons);
      kvStore.setItem("mbt_custom_icons", JSON.stringify(cfg.customIcons));
    }

    // Buchungen aus config/txs_YYYY laden (neue Methode — kein transactions-table mehr)
    const allTxs = [];
    const txKeys = Object.keys(cfg).filter(k=>k.startsWith("txs_"));
    txKeys.forEach(k => {
      const arr = cfg[k];
      if(Array.isArray(arr)) allTxs.push(...arr);
    });

    // Fallback: alte transactions-Tabelle (Migration)
    if(allTxs.length === 0) {
      const txRows = await supaFetch("transactions", "GET", null, "?user_id=eq.default&order=date.desc&limit=20000", _urlOv, _keyOv);
      if(txRows?.length) {
        const migrated = txRows.map(rowToTx);
        setTxs(migrated);
        // Sofort in neue Struktur migrieren
        const byYear = {};
        migrated.forEach(t => {
          const y = new Date(t.date).getFullYear();
          if(!byYear[y]) byYear[y]=[];
          byYear[y].push(t);
        });
        const items = Object.entries(byYear).map(([y,arr])=>({
          key:`txs_${y}`, user_id:"default", value:arr, updated_at:new Date().toISOString()
        }));
        if(items.length>0) {
          await supaFetch("config","POST",items,"", _urlOv, _keyOv);
          console.log("Migration: Buchungen in config/txs_YYYY gespeichert, transactions-Tabelle kann geleert werden");
        }
        return;
      }
    }
    if(allTxs.length > 0) {
      const migrated = migrateBudgetDates(migrateRecurringOvershoot(stripBudgetSeries(migrateSeries(allTxs.map(t=>({...t, splits:Array.isArray(t.splits)?t.splits:[]}))))));
      // Migration: alle Buchungen ohne accountId → acc-giro
      const migratedWithAcc = migrated.map(t => t.accountId ? t : {...t, accountId:"acc-giro"});
      setTxs(migratedWithAcc);
    }
  };

  const saveSupaSettings = async (overrideUrl, overrideKey) => {
    const url = overrideUrl || supaUrl;
    const key = overrideKey || supaKey;
    kvStore.setItem("supa_url", url);
    kvStore.setItem("supa_key", key);
    if(overrideUrl) setSupaUrl(url);
    if(overrideKey) setSupaKey(key);
    setSupaStatus("loading"); setSupaError("");
    try {
      // Prüfe ob Daten vorhanden (neue Methode: txs_ in config)
      const cfgRows = await supaFetch("config", "GET", null, "?user_id=eq.default", url, key);
      const hasTxs = (cfgRows||[]).some(r=>r.key.startsWith("txs_"));
      console.log("cfgRows:", cfgRows?.length, "hasTxs:", hasTxs);

      if(hasTxs) {
        console.log("Lade aus Supabase...");
        await loadFromSupa(url, key);
      } else {
        console.log("Tabellen leer, versuche Wiederherstellung aus finanz_data...");
        // Versuche alte finanz_data Tabelle
        let recovered = false;
        try {
          const oldRows = await supaFetch("finanz_data", "GET", null, "?id=eq.main");
          console.log("finanz_data rows:", oldRows?.length);
          if(oldRows?.length > 0) {
            const row = oldRows[0];
            const d = (row.data && Object.keys(row.data).length > 0)
              ? row.data
              : { cats:row.cats, groups:row.groups, txs:row.txs,
                  accounts:row.accounts, yearData:row.year_data, col3Name:row.col3_name };
            console.log("Wiederhergestellt: cats:", d.cats?.length, "txs:", d.txs?.length);
            if(Array.isArray(d.txs) && d.txs.length > 0) {
              // Config hochladen
              const configItems = ["cats","groups","accounts","yearData","col3Name"]
                .map(k=>({key:k, user_id:"default", value:d[k]??null, updated_at:new Date().toISOString()}))
                .filter(i=>i.value!==null);
              if(configItems.length>0) await supaFetch("config","POST",configItems,"");
              // Buchungen in Batches hochladen
              for(let i=0;i<d.txs.length;i+=200) {
                const batch = d.txs.slice(i,i+200).map(tx=>({
                  id: tx.id, user_id:"default", date:tx.date,
                  description:tx.desc||"", total_amount:parseFloat(tx.totalAmount)||0,
                  account_id:tx.accountId||"", pending:tx.pending||false,
                  pending_date:tx.pendingDate||"", repeat_months:tx.repeatMonths||1,
                  csv_type:tx._csvType||"", splits:tx.splits||[],
                  linked_ids:tx.linkedIds||[], fingerprint:tx._fp||"",
                  extra:{readOnlyAmount:tx._readOnlyAmount||false, note:tx.note||""},
                  updated_at:new Date().toISOString(),
                }));
                await supaFetch("transactions","POST",batch,"");
                console.log("Batch", Math.floor(i/200)+1, "gespeichert");
              }
              await loadFromSupa();
              recovered = true;
            }
          }
        } catch(e2) { console.log("finanz_data nicht verfügbar:", e2.message); }

        if(!recovered) {
          console.log("Supabase leer — lokale Daten bleiben lokal bis manuell importiert");
          // Nicht automatisch hochladen — Nutzer soll bewusst entscheiden
          setSupaError("Keine Daten in Supabase gefunden. Bitte CSV neu importieren.");
        }
      }
      setSupaStatus("ok");
      setSupaLockKey(k=>k+1);
    }
    catch(e) {
      console.error("saveSupaSettings error:", e);
      setSupaStatus("error");
      setSupaError(e.message);
    }
  };

  // Migration: erkennt zusammengehörige Vormerkungen und vergibt _seriesId
  const migrateSeries = (txList) => {
    // Nur pending ohne bestehende seriesId. Budget-Platzhalter (_budgetSubId)
    // sind KEINE wiederkehrende Nutzer-Serie (eigene Mechanik) und werden
    // ausgeschlossen — sonst werden konstante monatliche Budgets (z.B. Tanken
    // 100 €) fälschlich als Serie markiert.
    const needsMigration = txList.filter(t=>t.pending && !t._seriesId && !t._budgetSubId);
    if(needsMigration.length === 0) return txList;

    // Gruppiere nach desc + betrag + catId
    const groups = {};
    needsMigration.forEach(t=>{
      const catId = (t.splits||[])[0]?.catId||"";
      const key = `${(t.desc||"").trim().toLowerCase()}|${Math.round(t.totalAmount*100)}|${catId}`;
      if(!groups[key]) groups[key]=[];
      groups[key].push(t);
    });

    const updates = {};
    Object.values(groups).forEach(grp=>{
      if(grp.length < 2) return;
      // Sortiere nach Datum
      const sorted = [...grp].sort((a,b)=>a.date.localeCompare(b.date));
      // Prüfe ob aufeinanderfolgende Monate
      let isConsecutive = true;
      for(let i=1;i<sorted.length;i++){
        const prev = new Date(sorted[i-1].date);
        const curr = new Date(sorted[i].date);
        const diffMonths = (curr.getFullYear()-prev.getFullYear())*12+(curr.getMonth()-prev.getMonth());
        if(diffMonths !== 1) { isConsecutive = false; break; }
      }
      if(!isConsecutive) return;
      // Serie vergeben
      const seriesId = "series-"+uid();
      sorted.forEach((t,i)=>{
        updates[t.id] = {_seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:sorted.length};
      });
    });

    if(Object.keys(updates).length === 0) return txList;
    return txList.map(t => updates[t.id] ? {...t, ...updates[t.id]} : t);
  };

  // Bereinigung: Budget-Platzhalter (_budgetSubId) dürfen keine Serien-Felder
  // tragen. Ein früherer migrateSeries-Lauf hat konstante monatliche
  // Platzhalter (z.B. Tanken 100 €) fälschlich als Serie markiert ("⚠ alt").
  // Wir entfernen _seriesId/_seriesIdx/_seriesTotal von allen Budget-Platzhaltern.
  const stripBudgetSeries = (txList) => {
    let changed = false;
    const out = txList.map(t => {
      if(t._budgetSubId && (t._seriesId || t._seriesIdx || t._seriesTotal)) {
        changed = true;
        const { _seriesId, _seriesIdx, _seriesTotal, ...rest } = t;
        return rest;
      }
      return t;
    });
    return changed ? out : txList;
  };

  // Migration: entfernt den durch einen früheren Rechenfehler (Off-by-one
  // bei "unbegrenzt"-Serien im Vormerken-Dialog, s. calcRecurringCount in
  // utils/date.js) erzeugten ÜBERZÄHLIGEN letzten Termin einer wiederkehrenden
  // Vormerkungs-Serie ohne explizites Enddatum — z.B. eine Buchung im Januar
  // des 7. statt Dezember des 6. Jahres nach Start. Betrifft NUR noch nicht
  // gebuchte (pending) Einträge, nie echte/gebuchte Transaktionen — und nur,
  // wenn die neu berechnete korrekte Anzahl exakt eins weniger ergibt als
  // tatsächlich vorhanden UND der letzte Termin über den 6-Jahres-Horizont
  // hinausreicht (enges, konservatives Kriterium gegen Fehlalarme bei
  // absichtlich langen, vom Nutzer selbst befristeten Serien).
  const migrateRecurringOvershoot = (txList) => {
    const bySeries = {};
    txList.forEach(t => {
      if(!t.pending || !t._seriesId || t._budgetSubId) return;
      (bySeries[t._seriesId] ||= []).push(t);
    });
    const removeIds = new Set();
    const seriesTotalFix = {};
    Object.entries(bySeries).forEach(([seriesId, grp]) => {
      if(grp.length < 2) return;
      const sorted = [...grp].sort((a,b)=>a.date.localeCompare(b.date));
      const interval = sorted[0].repeatMonths || 1;
      const startDate = sorted[0].date;
      const startYear = Number(startDate.slice(0,4));
      const correctCount = calcRecurringCount(startDate, null, interval);
      const last = sorted[sorted.length-1];
      const lastYear = Number(last.date.slice(0,4));
      if(sorted.length === correctCount + 1 && lastYear > startYear + 6) {
        removeIds.add(last.id);
        seriesTotalFix[seriesId] = correctCount;
      }
    });
    if(removeIds.size === 0) return txList;
    return txList.filter(t => !removeIds.has(t.id))
      .map(t => (t._seriesId && seriesTotalFix[t._seriesId] !== undefined)
        ? {...t, _seriesTotal: seriesTotalFix[t._seriesId]} : t);
  };

  // Migration: Budget-Platzhalter-Daten korrigieren
  // Betrifft NUR Buchungen mit _budgetSubId (=Budget-Platzhalter), niemals echte Buchungen.
  // Alter Code setzte Mitte auf 01. und Ende auf 15. — korrekt wäre 14. bzw. Monatsletzter.
  const migrateBudgetDates = (txList) => {
    let changed = 0;
    const fixed = txList.map(t => {
      // Nur Budget-Platzhalter (pending + _budgetSubId gesetzt)
      if(!t.pending || !t._budgetSubId) return t;
      const parts = t.date.split("-");
      if(parts.length !== 3) return t;
      const [y, m, d] = parts;
      const day = parseInt(d);
      const isMitte = t._budgetSubId.endsWith("_mitte");
      const isEnde  = !isMitte;
      let newDay = null;
      if(isMitte && day === 1)  newDay = "14";
      if(isEnde  && day === 15) newDay = String(new Date(parseInt(y), parseInt(m), 0).getDate()).padStart(2,"0");
      if(newDay === null) return t;
      changed++;
      return {...t, date: `${y}-${m}-${newDay}`};
    });
    if(changed > 0) console.log(`[MigrateBudgetDates] ${changed} Platzhalter korrigiert`);
    return fixed;
  };

  // force=true: bedingungslos ALLE Felder übernehmen (auch wenn im Payload
  // leer/fehlend) — für explizite, vom Nutzer bestätigte "Cloud → Lokal"-
  // Aktionen (loadFromCloud). Ohne force bleiben leere/fehlende Felder beim
  // aktuellen lokalen Stand (Schutz beim automatischen Boot-Laden vor
  // unvollständigen/korrupten Payloads). Ohne diese Unterscheidung blieb
  // nach einem bestätigten "Cloudflare → Lokal"-Laden bei Feldern, die im
  // Cloud-Stand zufällig leer waren, stillschweigend der alte lokale Wert
  // stehen — die Zahlen stimmten dann trotz erfolgreichem Laden nicht exakt
  // mit Cloudflare überein.
  const applyData = (d, force=false) => {
    if(!d) return;
    if(force || (Array.isArray(d.cats) && d.cats.length))
      setCats((d.cats||[]).map(c=>({...c,subs:Array.isArray(c.subs)?c.subs:[],icon:c.icon||"tag",color:c.color||T.blue})));
    if(force || (Array.isArray(d.groups) && d.groups.length))
      setGroups(d.groups||[]);
    if(force || (Array.isArray(d.txs) && d.txs.length)) {
      // Vor dem Übernehmen lokal längst gelöschte Buchungen ausfiltern —
      // sonst kann ein (teilweise fehlgeschlagener oder veralteter) Cloud-
      // Snapshot eine Löschung rückgängig machen, siehe utils/txTombstones.js.
      const incomingTxs = filterTombstonedTxs(d.txs||[]);
      setTxs(migrateBudgetDates(migrateRecurringOvershoot(stripBudgetSeries(migrateSeries(incomingTxs.map(t=>({...t,splits:Array.isArray(t.splits)?t.splits:[]})))))));
    }
    if(force || (Array.isArray(d.accounts) && d.accounts.length)) {
      // Migration: alten Puffer ins Giro-Konto übernehmen
      const oldPuffer = parseInt(kvStore.getItem("mbt_tagesgeld_puffer")||"0");
      const accs = (d.accounts||[]).map(a => {
        if(a.id==="acc-giro" && (a.minPuffer===undefined||a.minPuffer===null) && oldPuffer>0) {
          return {...a, minPuffer: oldPuffer};
        }
        return a;
      });
      setAccounts(accs);
    }
    if(force || (Array.isArray(d.vehicles) && d.vehicles.length))
      setVehicles(d.vehicles||[]);
    if(force || (d.yearData && Object.keys(d.yearData).length)) {
      // Bereinige alte jsub_*_M/E/D Einträge — diese werden jetzt live berechnet
      const cleaned = JSON.parse(JSON.stringify(d.yearData||{}));
      Object.keys(cleaned).forEach(y=>Object.keys(cleaned[y]||{}).forEach(m=>{
        Object.keys(cleaned[y][m]||{}).forEach(k=>{
          if(k.startsWith("jsub_")) delete cleaned[y][m][k];
        });
      }));
      setYearData(cleaned);
    }
    if(force || d.col3Name)  setCol3Name(d.col3Name||"Aktuell");
    if(force || Array.isArray(d.quickBtns))   setQuickBtns(d.quickBtns||[]);
    if(force || Array.isArray(d.quickColors)) setQuickColors(d.quickColors||[]);
    if(force || (d.budgets && Object.keys(d.budgets).length)) {
      // endDate bereinigen: leer setzen wenn es in der nahen Vergangenheit/Zukunft liegt
      // (wurde versehentlich als Default gesetzt)
      const minValid = new Date(Date.now() + 60*24*60*60*1000); // mind. 60 Tage in Zukunft
      const cleanedBudgets = {};
      Object.entries(d.budgets||{}).forEach(([k,v])=>{
        if(v.endDate && new Date(v.endDate) < minValid) {
          cleanedBudgets[k] = {...v, endDate:""};
        } else {
          cleanedBudgets[k] = v;
        }
      });
      // Migration: alle Budgets ohne accountId bekommen acc-giro
      Object.entries(cleanedBudgets).forEach(([k,v])=>{
        if(v && !v.accountId) cleanedBudgets[k] = {...v, accountId:"acc-giro"};
      });
      setBudgets(cleanedBudgets);
    }
    if(force || (d.csvRules && Object.keys(d.csvRules).length))
      setCsvRules(d.csvRules||{});
    if(force || (Array.isArray(d.customIcons) && d.customIcons.length))
      setCustomIcons(d.customIcons||[]);
    // Eigene Farbthemes übernehmen (aus Worker-Sync oder Backup): in kvStore
    // mergen und live in THEMES injizieren, damit sie sofort wählbar sind.
    if(d.customThemes && typeof d.customThemes === "object" && Object.keys(d.customThemes).length) {
      try {
        const existing = JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}");
        const merged = {...existing, ...d.customThemes};
        kvStore.setItem("mbt_custom_themes", JSON.stringify(merged));
        Object.entries(d.customThemes).forEach(([k,v]) => { THEMES[k] = v; });
      } catch(e) {}
    }
    if(force || (d.startBalances && Object.keys(d.startBalances).length)) {
      // Keys als Zahlen normalisieren
      const normalized = {};
      Object.entries(d.startBalances||{}).forEach(([k,v])=>{ normalized[Number(k)]=v; });
      setStartBalances(normalized);
    }
  };

  // Load on startup — wartet bis CF-Zugangsdaten aus IDB geladen sind
  useEffect(()=>{
    if(!cfCredsReady) return;
    setSyncStatus("loading");
    const doLoad = async () => {
      // Hilfsfunktion: lokalen Stand laden. Gibt die geparsten Daten zurück
      // (oder null) — NICHT über React-State (cats/txs) prüfen, das zeigt im
      // selben Tick noch den alten Wert von vor dem setState.
      const loadLocal = async () => {
        try {
          // Erst IndexedDB versuchen, dann localStorage als Fallback
          let raw = await window.IDB.get(LS_KEY).catch(()=>null);
          if(!raw) raw = localStorage.getItem(LS_KEY);
          if(raw) {
            try {
              const d=JSON.parse(raw); delete d.isLand; applyData(d);
              return d;
            } catch(parseErr) {
              // Korrupte Daten NICHT verlieren: der Auto-Save würde sie sonst
              // kurz darauf mit leerem Zustand überschreiben. Rohstring sichern.
              console.error("Lokale Daten korrupt — Rohdaten nach mbt_corrupt_rescue gesichert:", parseErr);
              window.IDB.set("mbt_corrupt_rescue_"+Date.now(), raw).catch(()=>{});
              setSyncError("⚠️ Lokale Daten beschädigt — Rohdaten wurden gesichert (mbt_corrupt_rescue)");
              setSyncStatus("error");
            }
          }
        } catch(e) { console.error("Lokaler Load fehlgeschlagen:", e); }
        return null;
      };

      try {
        // ── 1. Lokalen Stand IMMER zuerst laden — sofort verfügbar, kein
        //    Netz nötig (Offline-Boot!). Vorher hing dieser Zweig an einem
        //    separaten "mbt_local_backup"-Zeitstempel, der nirgends mehr
        //    geschrieben wurde → lokale Daten wurden beim Start IMMER
        //    übersprungen zugunsten von Cloudflare; schlug das offline fehl,
        //    blieb die App leer, obwohl der echte lokale Stand längst da war.
        const local = await loadLocal();
        const localTs = local?.saved_at || 0;
        const hasData = !!(local && ((local.txs?.length||0) > 0 || (local.cats?.length||0) > 2));
        const checkLocalNewer = (remoteTs, remoteName) => {
          if(localTs > remoteTs + 5000) {
            const diff = Math.round((localTs-remoteTs)/1000);
            return window.confirm(
              `⚠️ Lokaler Stand ist ${diff}s neuer als ${remoteName}!

OK = Lokalen Stand verwenden
Abbrechen = ${remoteName}-Stand laden`
            );
          }
          return false;
        };

        if(hasData) {
          setSyncError(`✓ Lokale Daten geladen (${new Date(localTs || Date.now()).toLocaleTimeString()})`);
          if(cfActive) {
            cfLoad().then(cdata=>{
              setCfStatus("ok");
              // Tombstones anderer Geräte IMMER übernehmen und sofort auf den
              // eigenen lokalen Stand anwenden — unabhängig davon, ob unten
              // ein "Cloud hat neuere Daten"-Hinweis erscheint. Sonst würde
              // dieses Gerät eine anderswo gelöschte Buchung beim eigenen
              // nächsten Push wieder mit hochladen (siehe txTombstones.js).
              if(cdata._txTombstones) {
                const tombstonesChanged = mergeRemoteTombstones(cdata._txTombstones);
                delete cdata._txTombstones;
                if(tombstonesChanged) setTxs(prev => filterTombstonedTxs(prev));
              }
              if(cdata._sparWatermarks) { mergeRemoteSparWatermarks(cdata._sparWatermarks); delete cdata._sparWatermarks; }
              const cTs = cdata.saved_at||0;
              const lastSynced = getCfSyncedAt();
              // Sync-Anker vorhanden (Normalfall): jede Abweichung vom zuletzt
              // bestätigten Cloud-Stand bedeutet, ein anderes Gerät hat seither
              // gespeichert — unabhängig davon, wie "frisch" der lokale
              // saved_at-Zeitstempel gerade aussieht (siehe Kommentar bei
              // CF_SYNC_MARK_KEY). Ohne Anker (z.B. Erststart nach diesem
              // Update) auf die alte 60s-Heuristik zurückfallen, damit
              // Bestandsnutzer nicht plötzlich falsche Hinweise sehen.
              const cloudChanged = lastSynced ? (cTs !== lastSynced && cTs > lastSynced) : (cTs > localTs + 60000);
              if(cloudChanged) {
                const diff = Math.round((cTs-(lastSynced||localTs))/1000);
                setSyncError(`☁ Cloudflare hat neuere Daten (${diff}s). Auf den Hinweis oben tippen, um sie zu laden.`);
                // "error_shown" wurde von KEINER Anzeige konsumiert (getSyncBadgeState
                // kennt nur saving/saved/error/isDirty) — der Hinweis verschwand
                // dadurch spurlos, ohne dass der Nutzer je erfuhr, dass ein anderes
                // Gerät neuere Daten gespeichert hat. "cloud_newer" wird jetzt im
                // persistenten Sync-Badge angezeigt und ist dort auch antippbar.
                setSyncStatus("cloud_newer");
              } else if(!lastSynced) {
                // Kein Anker gesetzt und auch kein Unterschied erkannt — als
                // synchron übernehmen, damit ab jetzt der robuste Vergleich greift.
                setCfSyncedAt(cTs);
              }
            }).catch(e=>{ setCfStatus("error"); });
          }
          setIsLand(false); setSyncStatus("idle");
          return;
        }

        // ── 2. Kein lokaler Stand → von Cloudflare laden ──────────────
        setSyncError("⚠️ Kein lokaler Stand gefunden — lade von Cloudflare...");
        if(cfActive) {
          try {
            const cdata = await cfLoad();
            if(cdata._txTombstones) { mergeRemoteTombstones(cdata._txTombstones); delete cdata._txTombstones; }
            if(cdata._sparWatermarks) { mergeRemoteSparWatermarks(cdata._sparWatermarks); delete cdata._sparWatermarks; }
            if(cdata.cats?.length) {
              applyData(cdata);
              // Sofort lokal speichern damit nächster Start funktioniert
              const ts = Date.now();
              const toStore = JSON.stringify({...cdata, saved_at:ts});
              window.IDB.set(LS_KEY, toStore).catch(()=>{});
              setCfSyncedAt(cdata.saved_at||ts);
              setSyncError("✓ Von Cloudflare geladen und lokal gespeichert");
            }
            setCfStatus("ok"); setIsLand(false); setSyncStatus("idle");
            return;
          } catch(e) {
            console.error("CF load error:", e);
            setCfStatus("error");
            setIsLand(false); setSyncStatus("idle");
            return;
          }
        }



        // ── 2. JSONBin (Priorität wenn aktiv) ──────────────────────────
        if(jsonbinActive) {
          try {
            const jdata = await jsonbinLoad();
            const jTs = jdata.saved_at||0;
            if(checkLocalNewer(jTs,"JSONBin")) {
              // lokal (bereits geprüft) den Vorzug geben — nichts zu tun
            } else if(jdata.cats?.length) {
              applyData(jdata);
            }
            setJsonbinStatus("ok"); setIsLand(false); setSyncStatus("idle");
            return;
          } catch(e) {
            console.error("JSONBin load error:", e);
            setJsonbinStatus("error");
            setIsLand(false); setSyncStatus("idle");
            return;
          }
        }

        // Supabase/JSONBin/Gist deaktiviert — nur Cloudflare aktiv
        setIsLand(false); setSyncStatus("idle");
      } catch(e) {
        console.error("Load error:", e);
        setSyncError(e.message); setSyncStatus("error");
        await loadLocal(); setSyncStatus("idle");
      }
    };
    doLoad();
  }, [cfCredsReady]);

  // ── Feature-Tour beim allerersten Start automatisch anbieten ────────────
  // "syncStatus wird idle" passiert bei JEDEM abgeschlossenen Speicher-
  // /Ladevorgang (auch später beim normalen Nutzen) — die mbt_tourAutoShown-
  // Markierung sorgt dafür, dass die Prüfung (und ein eventuelles Öffnen)
  // nur beim ALLERERSTEN Mal wirklich etwas tut. Komplett leer = kein Konto
  // und keine Buchung, also ein frischer Start ohne vorhandene Daten.
  useEffect(() => {
    if(syncStatus !== "idle") return;
    if(kvStore.getItem("mbt_tourAutoShown")) return;
    kvStore.setItem("mbt_tourAutoShown", "1");
    const isFreshStart = (accounts?.length||0) === 0 && (txs?.length||0) === 0;
    if(isFreshStart) setShowGuidedTour(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus]);

  // ── Auto-Migration: altes startBalances-Format → neues Monats-Format ────
  // Altes Format: startBalances[Jahr]["acc-giro"] = Endstand 31.12.(Jahr-1)
  //   d.h. der Wert für Jahr=2024 ist der Kontostand am Ende von Dez 2023
  // Neues Format: startBalances[Jahr-1][11]["acc-giro"]
  const migrationDone = React.useRef(false);
  useEffect(()=>{
    if(migrationDone.current) return;
    if(!startBalances || !Object.keys(startBalances).length) return;
    let needsMigration = false;
    const next = JSON.parse(JSON.stringify(startBalances));
    Object.entries(next).forEach(([yearKey, yearVal])=>{
      const y = Number(yearKey);
      if(yearVal?.["acc-giro"] !== undefined && typeof yearVal["acc-giro"] === "number") {
        needsMigration = true;
        // Wert ist Endstand von Dez(y-1) → in Jahr(y-1), Monat 11 speichern
        const anchorYear = y - 1;
        const anchorMonth = 11; // Dezember
        if(!next[anchorYear]) next[anchorYear] = {};
        next[anchorYear][anchorMonth] = {"acc-giro": yearVal["acc-giro"]};
        delete next[y]["acc-giro"];
        // Leeres Jahr-Objekt aufräumen
        if(Object.keys(next[y]).length === 0) delete next[y];
      }
    });
    migrationDone.current = true;
    if(needsMigration) setStartBalances(next);
  }, [startBalances]);

  // Auto-Erweiterung: Budget-Platzhalter immer bis Ende des 7. Jahres auffüllen
  //
  // Läuft NICHT mehr automatisch/lautlos — legt nichts mehr direkt an,
  // sondern stellt einen Vorschlag (budgetExtProposal) auf, den der Nutzer
  // im Popup unten explizit bestätigen oder ablehnen muss. Grund: trotz des
  // Wasserzeichens (generatedThrough, das NUR vorwärts läuft und eine
  // gelöschte Einzelrate nicht mehr aus den aktuell existierenden
  // Platzhaltern zurückrechnet) kam eine gelöschte Tagesgeld-Buchung
  // weiterhin zurück — die genaue Ursache dafür ist noch nicht restlos
  // geklärt. Bis dahin: sichtbar machen statt raten, damit der Nutzer den
  // tatsächlich vorgeschlagenen Automatismus selbst sehen und ablehnen kann.
  const [budgetExtProposal, setBudgetExtProposal] = useState(null);
  useEffect(()=>{
    if(!Object.keys(budgets).length) return;
    const now = new Date();
    const curYear = now.getFullYear();
    const endYear = curYear + 6;
    const toAdd = [];
    let budgetsChanged = false;
    const nextBudgets = {...budgets};
    const proposalItems = [];
    Object.entries(budgets).forEach(([subId, bud])=>{
      if(!bud?.amount || !bud?.catId) return;
      const interval = bud.months||1;
      const existing = txs.filter(t=>t._budgetSubId===subId&&t.pending)
        .sort((a,b)=>b.date.localeCompare(a.date));
      const firstPend = existing[existing.length-1];
      // Wasserzeichen einmalig aus dem aktuell spätesten Platzhalter
      // bootstrappen (Bestandsdaten ohne dieses Feld) — danach nur noch
      // fortschreiben, nie mehr aus existing ableiten.
      let genThrough = bud.generatedThrough || existing[0]?.date || null;
      if(!bud.generatedThrough && genThrough) {
        nextBudgets[subId] = {...bud, generatedThrough: genThrough};
        budgetsChanged = true;
      }
      if(!genThrough) return; // noch nie ein Platzhalter angelegt — nichts zu erweitern
      const lastYear = parseInt(genThrough.split("-")[0]);
      if(lastYear >= endYear) return; // schon ausreichend
      // Fehlende Einträge ab dem Wasserzeichen+interval bis endYear
      const [ly,lm] = genThrough.split("-").map(Number);
      let curM = lm - 1 + interval;
      let curY = ly + Math.floor(curM/12);
      curM = curM % 12;
      const acc = accounts[0];
      const catId = firstPend?.splits?.[0]?.catId || bud.catId;
      let lastGenDate = genThrough;
      const theseNew = [];
      while(curY <= endYear) {
        // Tag aus gespeichertem startDate übernehmen, auf Monatslänge clampen
        const startDay = bud.startDate ? parseInt(bud.startDate.split("-")[2]) : 1;
        const maxDay = new Date(curY, curM+1, 0).getDate();
        const day = Math.min(startDay, maxDay);
        const dateStr = `${curY}-${String(curM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        const newTx = {
          id:"budget-"+subId+"-ext-"+curY+curM+"-"+Date.now(),
          date: dateStr,
          desc: firstPend?.desc||"Budget",
          totalAmount: bud.amount,
          pending: true,
          accountId: acc?.id||"acc-giro",
          pendingDate:"", repeatMonths: interval,
          _budgetSubId: subId, _csvType:"expense",
          splits:[{id:uid(),catId,subId,amount:bud.amount}],
        };
        toAdd.push(newTx);
        theseNew.push(newTx);
        lastGenDate = dateStr;
        curM += interval;
        curY += Math.floor(curM/12);
        curM = curM % 12;
      }
      if(theseNew.length) {
        proposalItems.push({
          subId, desc: firstPend?.desc||"Budget", count: theseNew.length,
          from: theseNew[0].date, to: theseNew[theseNew.length-1].date,
          amount: bud.amount, accountId: acc?.id||"acc-giro",
          lastGenDate, prevGenThrough: bud.generatedThrough||null,
        });
      }
      nextBudgets[subId] = {...nextBudgets[subId], generatedThrough: lastGenDate};
      budgetsChanged = true;
    });
    // Ein reines Watermark-Bootstrap (keine neuen Buchungen, nur das Feld
    // erstmalig gesetzt) braucht keine Nachfrage — nur wenn tatsächlich
    // Buchungen entstehen würden, wird gefragt.
    if(toAdd.length>0) {
      setBudgetExtProposal({ items: proposalItems, toAdd, nextBudgets });
    } else if(budgetsChanged) {
      setBudgets(nextBudgets);
    }
  }, [budgets]); // läuft nur wenn sich budgets ändern (inkl. nach dem Laden)

  // ── Einmalige Bereinigung: alle endDate-Felder leeren + nach CF hochladen ──
  const endDateCleanedRef = useRef(false);
  useEffect(()=>{
    if(endDateCleanedRef.current) return;
    if(!budgets || Object.keys(budgets).length === 0) return;
    // Prüfen ob irgendein Budget ein endDate hat
    const hasEndDate = Object.values(budgets).some(b=>b.endDate);
    if(!hasEndDate) { endDateCleanedRef.current = true; return; }
    // Alle endDates leeren
    const cleaned = {};
    Object.entries(budgets).forEach(([k,v])=>{
      cleaned[k] = v.endDate ? {...v, endDate:""} : v;
    });
    setBudgets(cleaned);
    endDateCleanedRef.current = true;
    console.log("Budget endDates bereinigt");
  }, [budgets]);

  // Track which txs changed since last save
  const changedTxIds = useRef(new Set());

  const deletedTxIds = useRef(new Set());
  const prevTxsRef   = useRef(null);
  const t0           = useRef(null);
  const t0y          = useRef(null);

  // Delta-Sync: merkt sich Hashes pro Jahr + Config — nur geänderte Daten nach CF schreiben
  const savedYearHashRef = useRef({});
  const savedConfigHashRef = useRef("");
  // Passphrase-Wechsel (Verschlüsselung an/aus/geändert) → Delta-Hashes leeren,
  // damit der nächste Sync alles im neuen (Klartext-/Chiffrat-)Format neu schreibt.
  useEffect(()=>{
    savedYearHashRef.current = {};
    savedConfigHashRef.current = "";
  }, [syncPass]);

  const saveToCloud = async (payload) => {
    if(!cfActive || !normCfUrl(cfUrl)) return;
    // Bereinige jsub_* aus yearData
    const cleanYearData = JSON.parse(JSON.stringify(payload.yearData||{}));
    Object.keys(cleanYearData).forEach(y=>Object.keys(cleanYearData[y]||{}).forEach(m=>{
      Object.keys(cleanYearData[y][m]||{}).forEach(k=>{
        if(k.startsWith("jsub_")) delete cleanYearData[y][m][k];
      });
    }));
    payload = {...payload, yearData: cleanYearData};
    setSyncStatus("saving"); setCfStatus("saving");
    try {
      const pushedAt = Date.now();
      await cfSave({...payload, saved_at:pushedAt});
      setCfSyncedAt(pushedAt);
      setCfStatus("ok"); setSyncStatus("saved"); setIsDirty(false);
      setTimeout(()=>setSyncStatus("idle"), 2000);
    } catch(e) {
      console.error("CF save error:", e);
      setSyncError(e.message); setSyncStatus("error"); setCfStatus("error");
    }
  };

  // Offline-Unterstützung: Verbindungsstatus + automatisches Nachsynchronisieren
  // bei Wiederverbindung. cfSave() macht ohnehin schon Delta-Sync über
  // savedConfigHashRef/savedYearHashRef — ein einfacher saveToCloud()-Aufruf
  // reicht also, um genau die Änderungen hochzuladen, die während der
  // Offline-Phase lokal entstanden sind (isDirty wurde währenddessen von
  // useLocalSaveDebounce gesetzt).
  const isOnline = useOnlineStatus();
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if(!wasOnline && isOnline && cfActive && isDirty) {
      saveToCloud({cats, groups, txs, accounts, vehicles, yearData, col3Name, quickBtns, quickColors, csvRules, budgets, customIcons, startBalances, saved_at:Date.now()});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, cfActive, isDirty]);

  // Diff txs to track changes + deletions — DEAKTIVIERT
  // Die `changedTxIds`/`deletedTxIds`-Sets wurden befüllt aber nie gelesen
  // (geplantes Delta-Sync-Feature). Die JSON.stringify-Diff-Schleife kostete
  // bei 1500+ Buchungen ~5 ms × jeder Klick. Entfernt.
  //
  // Save-Effekt: Auto-Save in IndexedDB mit Debounce + Flush bei App-Schließen.
  // Logik ausgelagert nach hooks/useLocalSaveDebounce.js (Verhalten unverändert:
  // 300 ms Debounce, ein Stringify/Schreibslot, jsub_-Strip, csvRules-Backup,
  // Fehler sichtbar). saveToCloud/saveConfig bleiben hier (CF-spezifisch).
  useLocalSaveDebounce({
    lsKey: LS_KEY,
    state: {cats, groups, txs, accounts, vehicles, yearData, col3Name, quickBtns, quickColors, csvRules, budgets, customIcons, startBalances},
    loading: syncStatus==="loading",
    setSyncStatus, setSyncError, setIsDirty,
  });

  // ── New-tx form ───────────────────────────────────────────────────────────

  // ── New-cat form ──────────────────────────────────────────────────────────
  // isLand steuert nur noch das Raster-Overlay — nicht mehr die Orientierung
  useEffect(()=>{}, []);

  // ── Auto-Erweiterung yearData: wenn ein Jahr navigiert wird das noch nicht
  // in yearData existiert, wird es automatisch mit leeren Zeilen initialisiert.
  // Das verhindert 0,00 € für historische Jahre und fehlende Vormerkungen für Zukunftsjahre.
  useEffect(() => {
    if (yearData[year]) return; // already exists
    setYearData(prev => {
      if (prev[year]) return prev; // double-check
      const newYear = {};
      for (let m = 0; m < 12; m++) {
        const o = {};
        BASE_ROWS.forEach(r => {
          if (r.cols) { o[r.id+"_M"]=""; o[r.id+"_E"]=""; o[r.id+"_D"]=""; }
          else o[r.id] = "";
        });
        newYear[m] = o;
      }
      return { ...prev, [year]: newYear };
    });
  }, [year]);

  // CF-Save beim Schließen: nur über cfSaveOnClose-Handler unten



  // CF-Sync beim Schließen — nur wenn cfSaveOnClose aktiviert
  // cfSaveOnClose wurde entfernt — kein automatischer Upload beim Schließen
  const [cfSaveOnClose, setCfSaveOnClose] = useState(false);

  // swipe for month navigation
  const onTS = e => {
    t0.current  = e.touches[0].clientX;
    t0y.current = e.touches[0].clientY;
  };
  const onTE = e => {
    if(t0.current===null) return;
    const dx = e.changedTouches[0].clientX - t0.current;
    const dy = e.changedTouches[0].clientY - t0y.current;
    // Nur auslösen wenn eindeutig horizontal (dx > dy * 1.5) und Mindestdistanz
    if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if(mainTab==="erfassen" && subTab==="mood") {
        // Money Mood: horizontal wischt das Jahr.
        setYear(y => dx<0 ? y+1 : y-1);
      } else if(mainTab==="erfassen" && subTab==="trend") {
        // Trend-Übersicht zeigt ohnehin alle Jahre gleichzeitig — kein Wisch-Ziel.
      } else if(dx<0) { setMonth(m=>{ if(m<11)return m+1; setYear(y=>y+1); return 0; }); }
      else     { setMonth(m=>{ if(m>0) return m-1; setYear(y=>y-1); return 11; }); }
    }
    t0.current = null; t0y.current = null;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getCat    = id    => cats.find(c=>c.id===id);
  const getSub    = (cId,sId) => cats.find(c=>c.id===cId)?.subs?.find(s=>s.id===sId);
  const txType    = tx   => {
    const catType = getCat((tx.splits||[])[0]?.catId)?.type;
    const grp = groups.find(g=>g.type===catType);
    const beh = grp?.behavior || catType;
    if(beh==="income")    return "income";
    if(beh==="tagesgeld") return "tagesgeld";
    if(beh==="expense")   return "expense";
    // Keine Kategorie: gespeicherter CSV-Typ oder Fallback auf expense
    if(tx._csvType) return tx._csvType;
    return "expense";
  };
  const txPal     = tx   => PAL[txType(tx)] || PAL.expense;

  // ── Pending (Vormerkung) sums per subId per month ─────────────────────────
  // A pending tx with date day≤14 counts for Mitte AND Ende
  // A pending tx with date day>14 counts for Ende only
  const pendingSums = useMemo(()=>{
    const r = {};  // key: "y:m:subId:col"  col = M|E
    txs.filter(tx=>tx.pending).forEach(tx=>{
      const d = new Date(tx.date);
      const y=d.getFullYear(), m=d.getMonth(), day=d.getDate();
      (tx.splits||[]).forEach(sp=>{
        const base = `${y}:${m}:${sp.subId}`;
        r[base+":E"] = (r[base+":E"]||0) + pn(sp.amount);
        if (day<=14) r[base+":M"] = (r[base+":M"]||0) + pn(sp.amount);
      });
    });
    return r;
  },[txs]);

  const getPendingSum = (y,m,subId,col) => pendingSums[`${y}:${m}:${subId}:${col}`]||0;

  // ── Actual (non-pending) sums per subId per month ─────────────────────────
  // M = Tag 1–14 (Mitte), E = alle Buchungen (Ende)
  const actualSums = useMemo(()=>{
    const r={};
    // ⭐ NEUE LOGIK: Filter nach selAcc (Konto-spezifisch)
    const getAccountFilter = () => {
      if (!selAcc) return null; // null = keine Filterung = GESAMT
      return (tx) => {
        if (!tx.accountId && selAcc === "acc-giro") return true; // Fallback Giro
        return tx.accountId === selAcc;
      };
    };
    const accountFilter = getAccountFilter();
    
    txs.filter(tx=>{
      if (tx.pending || tx._linkedTo) return false;
      // ⭐ Wende Konto-Filter an
      if (accountFilter && !accountFilter(tx)) return false;
      return true;
    }).forEach(tx=>{
      const d=new Date(tx.date);
      const y=d.getFullYear(), m=d.getMonth(), day=d.getDate();
      // Kategorisierte Splits
      (tx.splits||[]).forEach(sp=>{
        const base=`${y}:${m}:${sp.subId}`;
        r[base+":E"]=(r[base+":E"]||0)+Math.abs(pn(sp.amount));
        if(day<=14) r[base+":M"]=(r[base+":M"]||0)+Math.abs(pn(sp.amount));
      });
      // Gesamteinnahmen/-ausgaben: Typ aus Kategorie ableiten, dann _csvType, dann Vorzeichen
      const catType0 = getCat((tx.splits||[])[0]?.catId)?.type;
      const type = catType0==="income" ? "income"
                 : catType0==="expense" ? "expense"
                 : tx._csvType || (tx.totalAmount>=0 ? "income" : "expense");
      const amt = Math.abs(tx.totalAmount||0);
      const baseTotal = `${y}:${m}:${type}`;
      r[baseTotal+":E"]=(r[baseTotal+":E"]||0)+amt;
      if(day<=14) r[baseTotal+":M"]=(r[baseTotal+":M"]||0)+amt;
    });
    return r;
  },[txs, selAcc]);

  const getActualSum=(y,m,subId,col="E")=>actualSums[`${y}:${m}:${subId}:${col}`]||0;

  // PERFORMANCE-FIX: Index für Budget-Platzhalter aufbauen.
  // Vorher lief jeder getBudgetForMonth-Aufruf zwei txs.filter/some über ALLE
  // 10000+ Buchungen — und die Funktion wird pro Render dutzendfach aufgerufen
  // (50–600× je nach Screen). Bei 12k txs sind das schnell 120+ ms pro Klick.
  // Jetzt: einmal pro txs-Änderung ein Index, dann O(1)-Lookup.
  //
  // Match-Logik wie im Original: getBudgetForMonth(X, y, m) summiert alle
  // Platzhalter, deren _budgetSubId === X ODER X+"_mitte". Wenn X selbst auf
  // "_mitte" endet, matcht nur X (das doppelte "_mitte_mitte" trifft praktisch
  // nie zu). Wir bauen daher pro exakter _budgetSubId einen Index, plus eine
  // Menge aller vorhandenen _budgetSubId-Werte für die hasAnySeries-Prüfung.
  const _budgetIdx = useMemo(()=>{
    const sumByKey = new Map();          // "exactBudgetSubId|YYYY-MM" → sum
    const subIdsSeen = new Set();        // alle vorhandenen _budgetSubId
    for(const t of txs) {
      if(!t.pending || !t._budgetSubId) continue;
      subIdsSeen.add(t._budgetSubId);
      const monthStr = (t.date||"").slice(0,7);
      const key = t._budgetSubId + "|" + monthStr;
      sumByKey.set(key, (sumByKey.get(key)||0) + Math.abs(pn(t.totalAmount)));
    }
    return { sumByKey, subIdsSeen };
  }, [txs]);

  // Gibt den effektiven Budget-Betrag für einen Monat zurück
  // Liest aus txs-Platzhaltern (Mitte+Ende) statt aus dem Template
  const getBudgetForMonth = (subId, y, m) => {
    const monthStr = `${y}-${String(m+1).padStart(2,"0")}`;
    // Originallogik: matcht (_budgetSubId === subId) ODER (_budgetSubId === subId+"_mitte")
    const sumExact   = _budgetIdx.sumByKey.get(subId + "|" + monthStr) || 0;
    const sumMitte   = _budgetIdx.sumByKey.get(subId + "_mitte|" + monthStr) || 0;
    const sumForMonth = sumExact + sumMitte;
    if(sumForMonth > 0) return sumForMonth;
    // Keine Platzhalter für diesen Monat, aber andere Monate haben welche → kein Fallback
    const hasAnySeries = _budgetIdx.subIdsSeen.has(subId) || _budgetIdx.subIdsSeen.has(subId+"_mitte");
    if(hasAnySeries) return 0;
    return pn(budgets[subId]?.amount)||0;
  };
  // Neue Helfer für Gesamtsummen
  const getTotalIncome =(y,m,col="E")=>actualSums[`${y}:${m}:income:${col}`]||0;
  const getTotalExpense=(y,m,col="E")=>actualSums[`${y}:${m}:expense:${col}`]||0;

  const _catTypeById = useMemo(()=>{ const m={}; cats.forEach(c=>{m[c.id]=c.type;}); return m; }, [cats]);
  // liquidityWarnings + strainWarning werden weiter unten definiert (NACH
  // getKumulierterSaldo/getCat, die sie für die Saldo-Prognose brauchen).

  // Kumulierter Kontostand bis inkl. Monat m des Jahres y
  const _ksCache = React.useRef({});
  const _ksTxsRef = React.useRef(null);
  const _ksBalRef = React.useRef(null);
  const getKumulierterSaldo = (toYear, toMonth, accountId=null) => {
    const noCache = window.MBT_DEBUG?.disable_kumcache;
    if(_ksTxsRef.current !== txs || _ksBalRef.current !== startBalances) {
      _ksCache.current = {};
      _ksTxsRef.current = txs;
      _ksBalRef.current = startBalances;
    }
    const ck=`${toYear}-${toMonth}-${accountId||""}`;
    if(!noCache && ck in _ksCache.current) return _ksCache.current[ck];
    const accFilter = accountId;

    // ── Ankerpunkte sammeln ───────────────────────────────────────────────────
    const anchors = [];
    Object.entries(startBalances||{}).forEach(([yearKey, yearVal])=>{
      const y = Number(yearKey);
      if(!yearVal || typeof yearVal !== "object") return;
      Object.entries(yearVal).forEach(([k, v])=>{
        if(k === "acc-giro" && typeof v === "number") {
          // Altes Format (Jahres-Anker = Ende Vorjahr)
          if(!accFilter || accFilter === "acc-giro")
            anchors.push({year:y, month:-1, value:v, day:null, accId:"acc-giro"});
        } else if(!isNaN(Number(k)) && typeof v === "object") {
          const mo = Number(k);
          if(accFilter) {
            // Konto-spezifisch — Wert kann Zahl (Monats-Ende) oder {v,day} (taggenau) sein
            const val = anchorValue(v[accFilter]);
            if(val != null) anchors.push({year:y, month:mo, value:val, day:anchorDay(v[accFilter]), accId:accFilter});
          } else {
            // Gesamt: alle Konten summieren
            Object.entries(v).forEach(([aId, raw])=>{
              const val = anchorValue(raw);
              if(val != null) anchors.push({year:y, month:mo, value:val, day:anchorDay(raw), accId:aId});
            });
          }
        }
      });
    });
    if(!anchors.length) return null;

    const toIdx = toYear * 12 + toMonth;

    if(accFilter) {
      // Konto-spezifisch: letzten Ankerpunkt <= toIdx nehmen — NUR für dieses Konto
      const eligible = anchors
        .filter(a => a.accId === accFilter)
        .map(a => ({...a, idx: a.year*12 + a.month}))
        .filter(a => a.idx <= toIdx)
        .sort((a,b) => b.idx - a.idx);
      if(!eligible.length) return null;

      const anchor = eligible[0];
      let saldo = anchor.value;
      // Taggenauer Anker: im Anker-Monat selbst zaehlen nur Buchungen NACH dem
      // Anker-Tag (bis inkl. Anker-Tag steckt bereits im Anker-Wert). Monats-Ende-
      // Anker (day=null) → aDay = letzter Tag → Anker-Monat traegt nichts bei
      // (identisch zum alten Verhalten "ab Folgemonat"). Jahres-Anker (month=-1)
      // startet im Januar.
      const aDay = anchor.day == null
        ? (anchor.month >= 0 ? new Date(anchor.year, anchor.month+1, 0).getDate() : 0)
        : anchor.day;
      const startY = anchor.year, startM = anchor.month >= 0 ? anchor.month : 0;

      const signedAmt = t => {
        const type = t._csvType || (t.totalAmount>=0?"income":"expense");
        return type==="income" ? Math.abs(t.totalAmount) : -Math.abs(t.totalAmount);
      };
      for(let y = startY; y <= toYear; y++) {
        const maxM = (y===toYear)?toMonth:11, minM=(y===startY)?startM:0;
        for(let m = minM; m <= maxM; m++) {
          const isAnchorMonth = (y===anchor.year && m===anchor.month);
          const accTxs = txs.filter(t=>{
            if(t.pending||t._linkedTo) return false;
            const d=new Date(t.date);
            if(d.getFullYear()!==y || d.getMonth()!==m) return false;
            if(isAnchorMonth && d.getDate() <= aDay) return false;
            return (t.accountId===accFilter || (!t.accountId && accFilter==="acc-giro"));
          });
          saldo += accTxs.reduce((s,t)=>s+signedAmt(t), 0);
        }
      }

      const realTxs = txs.filter(t=>!t.pending);
      if(!realTxs.length && anchor.month===-1) { _ksCache.current[ck]=null; return null; }
      const firstBuchungDate = realTxs.length ? realTxs.map(t=>t.date).sort()[0] : null;
      const firstY = firstBuchungDate ? Number(firstBuchungDate.split("-")[0]) : toYear;
      const firstM = firstBuchungDate ? Number(firstBuchungDate.split("-")[1])-1 : toMonth;
      const anchorEndIdx = anchor.year*12 + anchor.month;
      const firstBuchungIdx = firstY*12 + firstM;
      if(toIdx < Math.min(anchorEndIdx+1, firstBuchungIdx)) { _ksCache.current[ck]=null; return null; }
      _ksCache.current[ck]=saldo;
      return saldo;

    } else {
      // Gesamt-Modus: pro Konto den letzten Ankerpunkt nehmen, dann Buchungen aufsummieren
      // Alle bekannten Konten aus Ankerpunkten + accounts
      const allAccIds = [...new Set([
        ...anchors.map(a=>a.accId),
        ...accounts.map(a=>a.id)
      ])];

      // Prüfen ob überhaupt Ankerpunkte existieren
      const eligibleAnchors = anchors.filter(a => (a.year*12+a.month) <= toIdx);
      if(!eligibleAnchors.length) { _ksCache.current[ck]=null; return null; }

      const signedAmt = t => {
        const type = t._csvType || (t.totalAmount>=0?"income":"expense");
        return type==="income" ? Math.abs(t.totalAmount) : -Math.abs(t.totalAmount);
      };

      let gesamtSaldo = 0;
      let hasAnyAnchor = false;

      allAccIds.forEach(aId=>{
        const accAnchors = anchors
          .filter(a=>a.accId===aId)
          .map(a=>({...a, idx:a.year*12+a.month}))
          .filter(a=>a.idx<=toIdx)
          .sort((a,b)=>b.idx-a.idx);
        if(!accAnchors.length) return;
        hasAnyAnchor = true;

        const anchor = accAnchors[0];
        let saldo = anchor.value;
        // Taggenauer Anker (siehe Konto-spezifischen Zweig oben)
        const aDay = anchor.day == null
          ? (anchor.month >= 0 ? new Date(anchor.year, anchor.month+1, 0).getDate() : 0)
          : anchor.day;
        const startY = anchor.year, startM = anchor.month >= 0 ? anchor.month : 0;

        for(let y=startY; y<=toYear; y++){
          const maxM=(y===toYear)?toMonth:11, minM=(y===startY)?startM:0;
          for(let m=minM; m<=maxM; m++){
            const isAnchorMonth = (y===anchor.year && m===anchor.month);
            const accTxs = txs.filter(t=>{
              if(t.pending||t._linkedTo) return false;
              const d=new Date(t.date);
              if(d.getFullYear()!==y || d.getMonth()!==m) return false;
              if(isAnchorMonth && d.getDate() <= aDay) return false;
              return (t.accountId===aId || (!t.accountId && aId==="acc-giro"));
            });
            saldo += accTxs.reduce((s,t)=>s+signedAmt(t),0);
          }
        }
        gesamtSaldo += saldo;
      });

      if(!hasAnyAnchor) { _ksCache.current[ck]=null; return null; }
      const realTxs = txs.filter(t=>!t.pending);
      if(!realTxs.length) { _ksCache.current[ck]=null; return null; }
      _ksCache.current[ck]=gesamtSaldo;
      return gesamtSaldo;
    }
  };

  // ── Liquiditäts-Schieflage: taggenauer Giro-Saldo vs. Mindest-Puffer ─────────
  // GENAU DIESELBE Berechnung wie die Dashboard-Warnung (KontoWarnungWidget) —
  // beide rufen computeKontoWarnungen auf, damit Banner, Dashboard und Money-Mood-
  // Ampel sich nie widersprechen. Prüft den prognostizierten Tagessaldo (inkl.
  // Vormerkungen + Budget-Reservierung) gegen acc-giro.minPuffer.
  const _giroPuffer = (accounts||[]).find(a=>a.id==="acc-giro")?.minPuffer || 0;
  const liquidityWarnings = useMemo(()=>computeKontoWarnungen({
    txs, cats, accounts, getKumulierterSaldo, getCat, getBudgetForMonth, budgets, puffer: pn(_giroPuffer)||0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [txs, cats, accounts, _giroPuffer, budgets, startBalances]);

  // Banner-Daten: frühester betroffener Monat (Konto fällt unter den Puffer).
  const strainWarning = useMemo(()=>{
    if(!liquidityWarnings.length) return null;
    const w = liquidityWarnings[0];
    return {
      soonest: { yr: w.year, mi: w.month, saldoVal: Math.round(w.saldoVal), deficit: Math.round(w.deficit) },
      buffer: Math.round(w.minPuffer),
      count: liquidityWarnings.length,
    };
  }, [liquidityWarnings]);

  // ── Überfällige Vormerkungen: gesetztes Buchungsdatum bereits vergangen, aber
  // die tatsächliche (Bank-)Buchung ist bisher nicht eingetroffen — zählt im
  // Saldo schon mit, kann aber real abweichen. Eigener Banner analog zur
  // Schieflage-Warnung, da es zuvor nur unauffällig im Chevron einer einzelnen
  // Buchung sichtbar war (Nutzer-Feedback: "fällt sonst nicht auf").
  const overduePending = useMemo(()=>{
    const todayISO = new Date().toISOString().slice(0,10);
    // _budgetSubId-Zeilen sind interne Budget-Platzhalter (nicht vom Nutzer
    // angelegte Vormerkungen) und liegen technisch immer "in der Vergangenheit"
    // sobald ihre Phase (Mitte/Ende) verstrichen ist — zählen hier nicht mit.
    return (txs||[]).filter(t=>t.pending && !t._linkedTo && !t._budgetSubId && t.date < todayISO)
      .sort((a,b)=>a.date.localeCompare(b.date));
  }, [txs]);

  // ── Prognostizierter Saldo (inkl. offene Vormerkungen bis Halbmonat oder Monatsende) ──
  const _progDetailCache = React.useRef({});
  const _progDetailTxsRef = React.useRef(null);
  const _progDetailBalRef = React.useRef(null);
  const _progDetailCatsRef = React.useRef(null);
  const _progDetailBudgetsRef = React.useRef(null);
  const _progDetailAccountsRef = React.useRef(null);
  const getPrognoseSaldoDetail = (toYear, toMonth, half) => {
    // Cache-Invalidierung: auch bei cats/budgets/accounts-Änderung, damit neu hinzugefügte
    // Konten oder Kategorien sofort reflektiert werden (nicht erst nach Tx-Änderung).
    if(_progDetailTxsRef.current !== txs ||
       _progDetailBalRef.current !== startBalances ||
       _progDetailCatsRef.current !== cats ||
       _progDetailBudgetsRef.current !== budgets ||
       _progDetailAccountsRef.current !== accounts) {
      _progDetailCache.current={};
      _progDetailTxsRef.current=txs;
      _progDetailBalRef.current=startBalances;
      _progDetailCatsRef.current=cats;
      _progDetailBudgetsRef.current=budgets;
      _progDetailAccountsRef.current=accounts;
    }
    const ck=`${toYear}-${toMonth}-${half?1:0}`;
    if(ck in _progDetailCache.current) return _progDetailCache.current[ck];
    let base;
    if(toMonth === 0) base = getKumulierterSaldo(toYear-1, 11);
    else base = getKumulierterSaldo(toYear, toMonth-1);
    if(base === null || base === undefined) return null;
    const cutDay = half ? 14 : 31;

    // Wenn der Zeitraum bereits verstrichen ist → nur echte Buchungen, kein Budget
    const today = new Date();
    const todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();
    const isCurrentMonth = toYear===todayY && toMonth===todayM;
    const isPastMonth    = toYear<todayY || (toYear===todayY && toMonth<todayM);
    const lastDayOfMonth = new Date(toYear, toMonth+1, 0).getDate();
    // Mitte ist "abgelaufen" wenn heute ≥ 15 (im aktuellen Monat) oder Monat vergangen
    const mitteAbgelaufen = half  && (isPastMonth || (isCurrentMonth && todayD >= 15));
    // Ende  ist "abgelaufen" wenn heute ≥ letzter Tag (im aktuellen Monat) oder Monat vergangen
    const endeAbgelaufen  = !half && (isPastMonth || (isCurrentMonth && todayD >= lastDayOfMonth));
    const nurEchteBuchungen = mitteAbgelaufen || endeAbgelaufen;

    // Vorzeichen-Bestimmung:
    // 1. _csvType hat Vorrang (gesetzt beim CSV-Import)
    // 2. Splits: Kategorie-Typ bestimmt Vorzeichen
    // 3. Fallback: Vorzeichen von totalAmount
    const getTxType = t => {
      if(t._csvType) return t._csvType;
      const splits = (t.splits||[]).filter(s=>s.catId);
      if(splits.length > 0) {
        const cat = getCat(splits[0].catId);
        if(cat) return (cat.type==="income"||cat.type==="tagesgeld") ? "income" : "expense";
      }
      return t.totalAmount >= 0 ? "income" : "expense";
    };

    // Lokale Verknüpfungs-Erkennung: nutzt zentralen Helper mit Tx-Index für
    // korrekte Sparen-Transfer-Erkennung (Partner-Konto != aktuelles Konto).
    const _txsById = buildTxIdMap(txs);
    const _isDupl  = t => isDuplCounterpart(t, _txsById);
    const realTxs = txs.filter(t=>{
      if(t.pending) return false;
      const d=new Date(t.date);
      return d.getFullYear()===toYear && d.getMonth()===toMonth && d.getDate()<=cutDay;
    });
    const realIn  = realTxs.filter(t=>!_isDupl(t) && getTxType(t)==="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);
    const realOut = realTxs.filter(t=>!_isDupl(t) && getTxType(t)!=="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);

    // Alle Vormerkungen im Zeitraum (ohne Duplikate)
    // _linkedTo-Counterparts werden einbezogen damit sie in konto-spezifischen Drilldowns
    // sichtbar sind. Globale Summen pendIn/pendOut nehmen sie aber aus.
    //
    // WICHTIG: Duplikat-Erkennung hier NUR über die id (echtes Objekt-Duplikat,
    // z.B. durch einen Bug beim Zusammenführen von Arrays) — NICHT über einen
    // Inhalts-Fingerprint (Datum+Betrag+Text+Konto). Ein Fingerprint hätte zwei
    // tatsächlich getrennte Vormerkungen mit zufällig gleichem Betrag/Datum/Text
    // (z.B. zweimal derselbe Snack-Automat am selben Tag) fälschlich als
    // "Duplikat" erkannt und eine davon stillschweigend verschluckt.
    const seenPendIds = new Set();
    const allPendTxs = txs.filter(t=>{
      if(!t.pending) return false;
      const d=new Date(t.date);
      if(d.getFullYear()!==toYear||d.getMonth()!==toMonth||d.getDate()>cutDay) return false;
      if(seenPendIds.has(t.id)) return false;
      seenPendIds.add(t.id);
      return true;
    });

    // Wenn der Zeitraum abgelaufen ist: keine Vormerkungen/Budgets mehr
    if(nurEchteBuchungen) {
      const totalIn  = realIn;
      const totalOut = realOut;
      const saldo = base + totalIn - totalOut;
      return { base, realIn, realOut, pendIn:0, pendOut:0, totalIn, totalOut, saldo,
        nurEchteBuchungen:true, budgetEntries:[], unbudgetedPend:[], unbudgetedRealTxs:realTxs, overBudgetWarnings:[] };
    }

    // Konkrete Vormerkungen (keine Budget-Platzhalter)
    const concretePend = allPendTxs.filter(t=>!t._budgetSubId);

    // Budget-Logik: Budget hat Vorrang bis es durch konkrete Vormerkungen + echte Buchungen
    // überschritten wird.
    // Beim Ende-Drilldown (half=false): Mitte+Ende eines Budgets zusammenfassen,
    // da die Mitte-Phase bereits abgelaufen ist (echte Buchungen ersetzen dort das Budget).
    const budgetSubIds = new Set();
    const budgetedRealTxIds = new Set();
    const seenBudget = new Set();
    let pendOutBudget = 0;
    let pendInBudget  = 0;
    const overBudgetWarnings = [];

    // Beim Ende-Drilldown: Mitte-Platzhalter und Ende-Platzhalter je Unterkategorie
    // zusammenfassen. cutDay ist hier 31 (Ende), also schauen wir auf den ganzen Monat.
    // Für jede baseSubId: Gesamtbudget = mitteAmt (abgelaufen: durch echte Buchungen ersetzt)
    //                                  + endeAmt (noch offen)
    // Effektiver Beitrag Mitte = max(mitteBudget, realForSubBisTag14)
    // Effektiver Beitrag Ende  = max(endeBudget,  realForSubAb15 + concreteForSub)
    // Gesamt = effMitte + effEnde

    // Sammle catIds aus Budget-Platzhaltern für erweitertes Matching
    const budgetCatIds = new Set();
    allPendTxs.filter(t=>t._budgetSubId).forEach(t=>{
      (t.splits||[]).forEach(sp=>{ if(sp.catId) budgetCatIds.add(sp.catId); });
    });

    // Sammle alle Budget-Platzhalter nach baseSubId
    const budgetBySubId = {};
    allPendTxs.filter(t=>t._budgetSubId).forEach(t=>{
      const isMitte = t._budgetSubId.endsWith("_mitte");
      const baseSubId = isMitte ? t._budgetSubId.slice(0,-6) : t._budgetSubId;
      if(!budgetBySubId[baseSubId]) budgetBySubId[baseSubId]={mitteTx:null,endeTx:null};
      if(isMitte) budgetBySubId[baseSubId].mitteTx = t;
      else        budgetBySubId[baseSubId].endeTx  = t;
    });

    Object.entries(budgetBySubId).forEach(([baseSubId, {mitteTx, endeTx}])=>{
      // Deduplizierung: jede baseSubId nur einmal
      if(seenBudget.has(baseSubId)) return;
      seenBudget.add(baseSubId);
      budgetSubIds.add(baseSubId);

      const repTx = endeTx || mitteTx; // für Typ-Bestimmung
      const isInc = getTxType(repTx)==="income";
      // Auch catId des Budget-Platzhalters hinzufügen für Matching mit Vormerkungen
      (repTx?.splits||[]).forEach(sp=>{ if(sp.catId) budgetSubIds.add(sp.catId); });

      // Echte Buchungen bis cutDay für diese Unterkategorie (cutDay=14 für Mitte, 31 für Ende)
      // _isDupl ausschließen: eine CSV-verknüpfte Buchung (Vormerkung ↔ Bank-Buchung)
      // hinterlässt ZWEI echte Buchungen mit derselben subId — die _linkedTo-Seite ist
      // ein Duplikat und darf nicht doppelt zählen (konsistent mit saldo.js istForSub).
      const realTxsForSub = realTxs.filter(r=>
        !_isDupl(r) && (r.splits||[]).some(sp=>sp.subId===baseSubId)
      );
      realTxsForSub.forEach(r=>budgetedRealTxIds.add(r.id));

      // Konkrete Vormerkungen für diese Unterkategorie (innerhalb cutDay)
      const concreteTxsForSub = concretePend.filter(c=>
        (c.splits||[]).some(sp=>sp.subId===baseSubId || sp.catId===baseSubId)
      );

      let effektiv = 0;

      if(!half && mitteTx && endeTx) {
        // Ende-Drilldown MIT Mitte+Ende-Split:
        // Mitte-Phase (Tag 1-14): bereits abgelaufen → echte Buchungen bis Tag 14
        const realBis14 = realTxsForSub
          .filter(r=>new Date(r.date).getDate()<=14)
          .reduce((s,r)=>{ const sp=(r.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(r.totalAmount)); },0);
        const mitteBudget = Math.abs(mitteTx.totalAmount);
        const effMitte = Math.max(mitteBudget, realBis14);

        // Ende-Phase (Tag 15-cutDay): Budget + Buchungen ab 15. + alle Vormerkungen
        const realAb15 = realTxsForSub
          .filter(r=>new Date(r.date).getDate()>14)
          .reduce((s,r)=>{ const sp=(r.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(r.totalAmount)); },0);
        const concForSub = concreteTxsForSub
          .reduce((s,c)=>{ const sp=(c.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(c.totalAmount)); },0);
        const endeBudget = Math.abs(endeTx.totalAmount);
        const effEnde = Math.max(endeBudget, realAb15 + concForSub);

        effektiv = effMitte + effEnde;

        // Warnung wenn Gesamtbudget überschritten
        const totalBudget = mitteBudget + endeBudget;
        const totalActual = realBis14 + realAb15 + concForSub;
        if(totalActual > totalBudget) {
          const cat = getCat((repTx.splits||[])[0]?.catId);
          const sub = cat ? getSub(cat.id, baseSubId) : null;
          const catName = cat?.name || repTx.desc || baseSubId;
          overBudgetWarnings.push({
            subId:baseSubId, name: sub?.name ? `${catName} / ${sub.name}` : catName,
            budget:totalBudget, actual:totalActual,
          });
        }
      } else {
        // Kein Split oder Mitte-Drilldown: normale Logik
        const budget = Math.abs(repTx.totalAmount);
        const realForSub = realTxsForSub
          .reduce((s,r)=>{ const sp=(r.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(r.totalAmount)); },0);
        const concreteForSub = concreteTxsForSub
          .reduce((s,c)=>{ const sp=(c.splits||[]).find(sp=>sp.subId===baseSubId||sp.catId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(c.totalAmount)); },0);
        effektiv = Math.max(budget, realForSub + concreteForSub);

        if(realForSub + concreteForSub > budget) {
          const cat = getCat((repTx.splits||[])[0]?.catId);
          const sub = cat ? getSub(cat.id, baseSubId) : null;
          const catName = cat?.name || repTx.desc || baseSubId;
          overBudgetWarnings.push({
            subId:baseSubId, name: sub?.name ? `${catName} / ${sub.name}` : catName,
            budget, actual:realForSub+concreteForSub,
          });
        }
      }

      if(isInc) pendInBudget  += effektiv;
      else       pendOutBudget += effektiv;
    });

    // Echte Buchungen OHNE Budget-Zuordnung separat zählen
    // (budget-zugeordnete sind bereits in effektiv enthalten)
    const unbudgetedRealTxs = realTxs.filter(r=>!budgetedRealTxIds.has(r.id));
    const realInUnbudgeted  = unbudgetedRealTxs.filter(t=>!_isDupl(t) && getTxType(t)==="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);
    const realOutUnbudgeted = unbudgetedRealTxs.filter(t=>!_isDupl(t) && getTxType(t)!=="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);

    // Konkrete Vormerkungen OHNE Budget: separat zählen
    // Sparplan-Transfers UND alle anderen Umbuchungen (Buchungen mit _linkedTo oder deren
    // Counterpart _linkedTo hat) immer direkt einbeziehen, Budget-Logik bypassen.
    // Eine Umbuchung ist eine Buchung, die selbst _linkedTo hat (Counterpart) ODER
    // mind. eine andere pending tx _linkedTo===diese.id hat (Parent).
    const linkedParentIds = new Set(concretePend.filter(t=>t._linkedTo).map(t=>t._linkedTo));
    const isUmbuchung = t => t._linkedTo || linkedParentIds.has(t.id);
    const transferPend = concretePend.filter(t=>(t.desc||"").startsWith("Sparen·") || isUmbuchung(t));
    const transferIds  = new Set(transferPend.map(t=>t.id));
    const nonTransferPend = concretePend.filter(t=>!transferIds.has(t.id));
    // Filter-Fix: VM nur dann aus unbudgetedPend ausschließen, wenn ihre Sub-ID
    // wirklich von einem Budget-Platzhalter (budgetSubIds) abgedeckt ist. Reine
    // Cat-ID-Matches (budgetCatIds) waren früher zu pauschal — sie ließen VMs
    // verschwinden, die zwar dieselbe Cat hatten, aber eine andere Sub-ID (oder
    // gar keine Sub-ID), und damit nicht von budgetEntries.concTxs eingesammelt
    // wurden. Solche VMs fielen zwischen Stuhl und Bank.
    const unbudgetedPend = [
      ...transferPend, // immer ungekürzt
      ...nonTransferPend.filter(c=>{
        const splits = c.splits||[];
        // VM hat eine Sub-ID, die ein Budget-Platzhalter abdeckt → von budgetEntries eingesammelt → hier raus
        if(splits.some(sp => sp.subId && budgetSubIds.has(sp.subId))) return false;
        // Sonst behalten — auch wenn Cat-ID matcht, ohne Sub-Match wird sie hier gebraucht
        return true;
      })
    ];
    const pendIn  = pendInBudget  + unbudgetedPend.filter(t=>!_isDupl(t) && getTxType(t)==="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);
    const pendOut = pendOutBudget + unbudgetedPend.filter(t=>!_isDupl(t) && getTxType(t)!=="income").reduce((s,t)=>s+Math.abs(t.totalAmount),0);

    const totalIn  = realInUnbudgeted  + pendIn;
    const totalOut = realOutUnbudgeted + pendOut;
    const saldo = base + totalIn - totalOut;

    // Budget-Einträge für Drilldown — zusammengeführt wie in der Berechnung oben
    const budgetEntries = [];
    Object.entries(budgetBySubId).forEach(([baseSubId, {mitteTx, endeTx}])=>{
      const repTx = endeTx || mitteTx;
      const isInc = getTxType(repTx)==="income";
      const realTxsForSub2 = realTxs.filter(r=>!_isDupl(r)&&(r.splits||[]).some(sp=>sp.subId===baseSubId));
      const concForSub2 = concretePend.filter(c=>(c.splits||[]).some(sp=>sp.subId===baseSubId));

      let budget, effektiv, displayDate;
      if(!half && mitteTx && endeTx) {
        // Ende-Drilldown: zusammengefasst
        const mitteBudget = Math.abs(mitteTx.totalAmount);
        const endeBudget  = Math.abs(endeTx.totalAmount);
        budget = mitteBudget + endeBudget;
        const realBis14Amt = realTxsForSub2.filter(r=>new Date(r.date).getDate()<=14)
          .reduce((s,r)=>{ const sp=(r.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(r.totalAmount)); },0);
        const realAb15Amt = realTxsForSub2.filter(r=>new Date(r.date).getDate()>14)
          .reduce((s,r)=>{ const sp=(r.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(r.totalAmount)); },0);
        const concAmt2 = concForSub2.reduce((s,c)=>{ const sp=(c.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(c.totalAmount)); },0);
        effektiv = Math.max(mitteBudget, realBis14Amt) + Math.max(endeBudget, realAb15Amt + concAmt2);
        const lastDayDisp2 = new Date(toYear, toMonth+1, 0).getDate();
        const pad2d2 = n=>String(n).padStart(2,"0");
        // Anzeige-Datum: Monatsletzter (zusammengeführtes Mitte+Ende-Budget gilt für ganzen Monat)
        displayDate = `${toYear}-${pad2d2(toMonth+1)}-${pad2d2(lastDayDisp2)}`;
      } else {
        budget = Math.abs(repTx.totalAmount);
        const realAmt2 = realTxsForSub2.reduce((s,r)=>{ const sp=(r.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(r.totalAmount)); },0);
        const concAmt2 = concForSub2.reduce((s,c)=>{ const sp=(c.splits||[]).find(sp=>sp.subId===baseSubId); return s+(sp?.amount!=null&&sp.amount!==0?Math.abs(sp.amount):Math.abs(c.totalAmount)); },0);
        effektiv = Math.max(budget, realAmt2 + concAmt2);
        // Anzeige-Datum: Mitte-Budget → 14., Ende-Budget → letzter Tag des Monats
        const isMitteBudget = repTx._budgetSubId?.endsWith("_mitte");
        const lastDayDisp = new Date(toYear, toMonth+1, 0).getDate();
        const pad2d = n=>String(n).padStart(2,"0");
        displayDate = isMitteBudget
          ? `${toYear}-${pad2d(toMonth+1)}-14`
          : `${toYear}-${pad2d(toMonth+1)}-${pad2d(lastDayDisp)}`;
      }
      const realAmt = realTxsForSub2.reduce((s,r)=>{
        const sp = (r.splits||[]).find(sp=>sp.subId===baseSubId);
        const amt = sp?.amount!=null && sp.amount!==0 ? Math.abs(sp.amount) : Math.abs(r.totalAmount);
        return s+amt;
      },0);
      const concAmt = concForSub2.reduce((s,c)=>{
        const sp = (c.splits||[]).find(sp=>sp.subId===baseSubId);
        const amt = sp?.amount!=null && sp.amount!==0 ? Math.abs(sp.amount) : Math.abs(c.totalAmount);
        return s+amt;
      },0);
      budgetEntries.push({
        budgetTx:repTx, baseSubId, budget, isInc,
        realTxs:realTxsForSub2, realAmt,
        concTxs:concForSub2, concAmt,
        effektiv, date:displayDate,
        isMerged: !half && !!mitteTx && !!endeTx,
      });
    });

    const result = { base,
      realIn: realInUnbudgeted, realOut: realOutUnbudgeted,
      pendIn, pendOut, totalIn, totalOut, saldo,
      budgetEntries, unbudgetedPend, unbudgetedRealTxs,
      overBudgetWarnings };
    _progDetailCache.current[ck] = result;
    return result;
  };

  // Konto-spezifische Prognose — gecacht, korrekt mit Budget-Logik
  const _progEndeAccCache = React.useRef({});
  const _progEndeAccTxsRef = React.useRef(null);
  const _progEndeAccBalRef = React.useRef(null);
  const _progEndeAccCatsRef = React.useRef(null);
  const _progEndeAccBudgetsRef = React.useRef(null);
  const _progEndeAccAccountsRef = React.useRef(null);

  // PERFORMANCE-FIX (v2): Tx-Index pro txs-Update aufbauen, damit wir nicht für jede
  // Kategorie das gesamte txs-Array filtern müssen. Reduziert O(months × cats × subs × txs)
  // auf O(txs) initial + O(months × cats × subs) Lookup.
  const _txIndex = React.useMemo(() => {
    // Index-Schlüssel: `${y}-${m}-${accId}` → Array von Tx
    // Auch indexiert per catId und per (catId,subId) für schnelle Aggregation
    const byYM = new Map();           // alle Tx in y/m über alle Konten
    const byYMA = new Map();          // pro Konto
    const byYMACat = new Map();       // pro Konto + Kategorie
    const byYMACatSub = new Map();    // pro Konto + Kategorie + Sub-Kategorie
    const byYMCat = new Map();        // alle Konten, pro Kategorie (für _calcInc/Out ohne acc-Filter)
    const byYMCatSub = new Map();     // alle Konten, pro Kategorie + Sub
    for(const t of txs) {
      if(!t.date) continue;
      const d = new Date(t.date);
      if(isNaN(d.getTime())) continue;
      const y = d.getFullYear(), m = d.getMonth();
      const accId = t.accountId || "acc-giro";
      const kYM = `${y}-${m}`;
      const kYMA = `${y}-${m}-${accId}`;
      let bYM = byYM.get(kYM); if(!bYM){bYM=[];byYM.set(kYM,bYM);} bYM.push(t);
      let bYMA = byYMA.get(kYMA); if(!bYMA){bYMA=[];byYMA.set(kYMA,bYMA);} bYMA.push(t);
      const splits = t.splits || [];
      const seenCats = new Set();
      for(const sp of splits) {
        if(!sp.catId || seenCats.has(sp.catId)) continue;
        seenCats.add(sp.catId);
        const kYMCat = `${y}-${m}-${sp.catId}`;
        const kYMACat = `${y}-${m}-${accId}-${sp.catId}`;
        let bC = byYMCat.get(kYMCat); if(!bC){bC=[];byYMCat.set(kYMCat,bC);} bC.push(t);
        let bAC = byYMACat.get(kYMACat); if(!bAC){bAC=[];byYMACat.set(kYMACat,bAC);} bAC.push(t);
      }
      const seenCS = new Set();
      for(const sp of splits) {
        if(!sp.catId || !sp.subId) continue;
        const csk = sp.catId + "|" + sp.subId;
        if(seenCS.has(csk)) continue;
        seenCS.add(csk);
        const kYMCS = `${y}-${m}-${sp.catId}-${sp.subId}`;
        const kYMACS = `${y}-${m}-${accId}-${sp.catId}-${sp.subId}`;
        let bCS = byYMCatSub.get(kYMCS); if(!bCS){bCS=[];byYMCatSub.set(kYMCS,bCS);} bCS.push(t);
        let bACS = byYMACatSub.get(kYMACS); if(!bACS){bACS=[];byYMACatSub.set(kYMACS,bACS);} bACS.push(t);
      }
    }
    return { byYM, byYMA, byYMACat, byYMACatSub, byYMCat, byYMCatSub };
  }, [txs]);

  // Helper: Tx-Liste für Monat/Konto holen. Berücksichtigt Giro-default.
  const _txsInMonthAcc = (y, m, accId) => {
    // Index berücksichtigt sowohl accountId=accId als auch leeres accountId für Giro
    if(accId === "acc-giro") {
      const a = _txIndex.byYMA.get(`${y}-${m}-acc-giro`) || [];
      // Auch tx ohne accountId zählen für Giro
      // (im Index sind sie schon unter "acc-giro" einsortiert, also nichts extra zu tun)
      return a;
    }
    return _txIndex.byYMA.get(`${y}-${m}-${accId}`) || [];
  };
  const _txsInMonthAccCat = (y, m, accId, catId) => {
    return _txIndex.byYMACat.get(`${y}-${m}-${accId}-${catId}`) || [];
  };
  const _txsInMonthAccCatSub = (y, m, accId, catId, subId) => {
    return _txIndex.byYMACatSub.get(`${y}-${m}-${accId}-${catId}-${subId}`) || [];
  };

  const resetProgEndeCache = () => { _progEndeAccCache.current = {}; };
  // getProgEndeAccGlobal: Wrapper um die zentrale saldoEnde-Funktion aus utils/saldo.js.
  // Liefert das Prognose-Ende (oder echte Kumuliertsaldo) eines Kontos für (y, m).
  // Die alte ~80-zeilige Eigenimplementierung wurde durch saldoEnde abgelöst.
  const getProgEndeAccGlobal = (y, m, accId) => {
    const ck = `${y}-${m}-${accId}`;
    // Cache-Invalidierung wie bisher
    if(_progEndeAccTxsRef.current !== txs ||
       _progEndeAccBalRef.current !== startBalances ||
       _progEndeAccCatsRef.current !== cats ||
       _progEndeAccBudgetsRef.current !== budgets ||
       _progEndeAccAccountsRef.current !== accounts) {
      _progEndeAccCache.current = {};
      _progEndeAccTxsRef.current = txs;
      _progEndeAccBalRef.current = startBalances;
      _progEndeAccCatsRef.current = cats;
      _progEndeAccBudgetsRef.current = budgets;
      _progEndeAccAccountsRef.current = accounts;
    }
    if(ck in _progEndeAccCache.current) return _progEndeAccCache.current[ck];
    const ctx = { txs, cats, accounts, getKumulierterSaldo, getBudgetForMonth };
    const v = saldoEnde(y, m, accId, ctx);
    _progEndeAccCache.current[ck] = v;
    return v;
  };

  // ── Jahresplan value access ───────────────────────────────────────────────
  const getJV = (m,id,sub) => yearData[year]?.[m]?.[sub?id+"_"+sub:id] ?? "";

  // ── Jahresplan aus Buchungen rekonstruieren ──────────────────────────────
  const setJV = (m,id,sub,val) => {
    const k = sub?id+"_"+sub:id;
    setYearData(p=>({...p,[year]:{...p[year],[m]:{...p[year][m],[k]:val}}}));
  };
  const startJEdit = (m,id,sub=null) => { setJEditing({m,id,sub}); setJEditVal(getJV(m,id,sub)); };
  const commitJEdit = () => { if(!jEditing)return; setJV(jEditing.m,jEditing.id,jEditing.sub,jEditVal); setJEditing(null); setJEditVal(""); };

  // For "auto" rows: pending sum is the suggested value for M/E cols
  // The actual stored value overrides if set; otherwise falls back to pending sum
  const getEffectiveVal = (m, rowId, sub, subId) => {
    const stored = getJV(m, rowId, sub);
    if (stored !== "") return stored;
    if (sub==="M"||sub==="E") {
      const ps = getPendingSum(year, m, subId, sub);
      return ps > 0 ? String(ps) : "";
    }
    return "";
  };

  // Monat-view cell values keyed as "mv_y_m_txId_col"
  const getMV = (y,m,txId,col) => yearData[y]?.[m]?.["mv_"+txId+"_"+col] ?? "";
  const setMV = (y,m,txId,col,val) => {
    const k = "mv_"+txId+"_"+col;
    setYearData(p=>({...p,[y]:{...p[y],[m]:{...p[y][m],[k]:val}}}));
  };

  // ── Global edit-tx helpers ──────────────────────────────────────────────
  const getAcc = id => accounts.find(a=>a.id===id) || accounts[0] || {id:"",name:"–",icon:"credit-card",color:"#888",delayDays:0};

  const fmtAmt = v => (Math.round((parseFloat(v)||0)*100)/100).toFixed(2).replace(".",",");
  const openEdit = (tx, readOnlyAmount=false) => {
    // Vormerkungen → neuer VormerkungHub-Dialog (außer Budget-Platzhalter)
    if(tx.pending && !tx._budgetSubId && !readOnlyAmount) {
      setEditVormTx(tx);
      setShowVormHub(true);
      return;
    }
    const splits = (tx.splits||[]).length > 0
      ? (tx.splits||[]).map(sp=>({...sp, amount:fmtAmt(sp.amount)}))
      : [{id:uid(), catId:"", subId:"", amount:fmtAmt(tx.totalAmount)}];
    // Falls bereits ein verknüpfter Zugang existiert (Umbuchung), Zielkonto + Zielkategorie vorbelegen
    // Auch innerhalb der Serie suchen falls direkt nichts gefunden
    let existingLink = txs.find(t => t._linkedTo === tx.id && t.pending);
    if(!existingLink && tx._seriesId) {
      const seriesIds = new Set(txs.filter(t=>t._seriesId===tx._seriesId).map(t=>t.id));
      existingLink = txs.find(t => t.pending && t._linkedTo && seriesIds.has(t._linkedTo));
    }
    const linkSplit = (existingLink?.splits||[])[0];
    setEditTx({
      id: tx.id, desc: tx.desc||"", totalAmount: fmtAmt(tx.totalAmount),
      date: tx.date, pending: tx.pending,
      accountId: tx.accountId||"acc-giro",
      pendingDate: tx.pendingDate||"",
      note: tx.note||"",
      tags: tx.tags||[],
      splits,
      _readOnlyAmount: readOnlyAmount,
      repeatMonths: tx.repeatMonths||1,
      _csvType: tx._csvType||"expense",
      _seriesId: tx._seriesId||null,
      _seriesIdx: tx._seriesIdx||null,
      _seriesTotal: tx._seriesTotal||null,
      _budgetSubId: tx._budgetSubId||null,
      _transferTo: existingLink ? existingLink.accountId : null,
      _transferToCatId: linkSplit?.catId || "",
      _transferToSubId: linkSplit?.subId || "",
      linkedIds: tx.linkedIds||[],
      _potSubId: tx._potSubId||null,
      _fuelVehicleId: tx._fuelVehicleId||null,
      _fuelLiters: tx._fuelLiters??null,
      _fuelPricePerL: tx._fuelPricePerL??null,
      _odometer: tx._odometer??null,
    });
  };

  const saveEdit = (seriesScope="single") => {
    if(!editTx) return;
    const amt = pn(editTx.totalAmount);
    const acc = getAcc(editTx.accountId);
    const isPending = editTx.pending || acc.delayDays > 0;
    const pendingDate = acc.delayDays > 0 && !editTx.pending
      ? editTx.pendingDate || (() => { const d=new Date(editTx.date); d.setDate(d.getDate()+acc.delayDays); return d.toISOString().split("T")[0]; })()
      : editTx.pendingDate;
    const newSplits = (editTx.splits||[]).map(sp=>({...sp, amount:pn(sp.amount)}));
    const newTotal  = newSplits.length===1 ? amt : sumAmounts(newSplits, sp=>sp.amount);

    const hasSeries = !!editTx._seriesId;
    const hasBudget = !!editTx._budgetSubId;

    // ── Budget-Platzhalter: Scope-Bearbeitung ──
    if(isPending && hasBudget && seriesScope !== "single") {
      const subId = editTx._budgetSubId;
      setTxs(prevTxs => {
        const budgetTxs = prevTxs.filter(t=>t._budgetSubId===subId&&t.pending)
          .sort((a,b)=>a.date.localeCompare(b.date));
        const thisIdx = budgetTxs.findIndex(t=>t.id===editTx.id);
        if(thisIdx < 0) return prevTxs;
        const toUpdate = seriesScope === "all" ? budgetTxs : budgetTxs.slice(thisIdx);
        const updateIds = new Set(toUpdate.map(t=>t.id));
        const origDay = parseInt(editTx.date.split("-")[2]);
        const newDay  = parseInt(editTx.date.split("-")[2]);
        const dayOffset = newDay - origDay;
        return prevTxs.map(t=>{
          if(!updateIds.has(t.id)) return t;
          changedTxIds.current.add(t.id);
          let newDate = t.date;
          if(dayOffset !== 0) {
            const [y,m,d] = t.date.split("-").map(Number);
            const maxDay = new Date(y, m, 0).getDate();
            const adjustedDay = Math.min(Math.max(1, d + dayOffset), maxDay);
            newDate = `${y}-${String(m).padStart(2,"0")}-${String(adjustedDay).padStart(2,"0")}`;
          }
          const upd = {
            ...t, date: newDate,
            desc: editTx.desc, note: editTx.note||"", tags: editTx.tags||[],
            totalAmount: newTotal||amt,
            accountId: editTx.accountId,
            splits: newSplits.map(sp=>({...sp, id:uid()})),
          };
          if(editTx._seriesIdx) upd._seriesIdx = editTx._seriesIdx;
          else delete upd._seriesIdx;
          if(editTx._seriesTotal) upd._seriesTotal = editTx._seriesTotal;
          else delete upd._seriesTotal;
          return upd;
        });
      });
      setEditTx(null);
      return;
    }

    if(isPending && hasSeries && seriesScope !== "single") {
      const seriesId = editTx._seriesId;
      // repeatMonths = Intervall in Monaten (1=monatlich, 3=quartalsweise, 12=jährlich)
      // NICHT die Anzahl der Buchungen — daher hier NICHT für Rebuild verwenden

      setTxs(prevTxs => {
        const seriesTxs = prevTxs.filter(t=>t._seriesId===seriesId)
          .sort((a,b)=>a.date.localeCompare(b.date));
        const thisIdx = seriesTxs.findIndex(t=>t.id===editTx.id);
        if(thisIdx < 0) return prevTxs;

        const toUpdate = seriesScope === "all" ? seriesTxs : seriesTxs.slice(thisIdx);

        // Kein automatischer Rebuild mehr — Anzahl bleibt immer gleich
        // (Rebuild nur noch explizit über separaten Dialog)
        if(false) { // deaktiviert — verhinderte versehentliche Kürzung auf 1 Buchung
          void(0);
        }

        // Nur Felder aktualisieren (Datum wird für "from" um denselben Offset verschoben)
        const updateIds = new Set(toUpdate.map(t=>t.id));
        // Berechne Tag-Offset der aktuellen Buchung
        const origDate = toUpdate.find(t=>t.id===editTx.id)?.date || editTx.date;
        const origDay = parseInt(origDate.split("-")[2]);
        const newDay  = parseInt(editTx.date.split("-")[2]);
        const dayOffset = newDay - origDay;
        return prevTxs.map(t=>{
          if(!updateIds.has(t.id)) return t;
          changedTxIds.current.add(t.id);
          // Datum anpassen: Tag um Offset verschieben, innerhalb des Monats clampen
          let newDate = t.date;
          if(dayOffset !== 0) {
            const [y,m,d] = t.date.split("-").map(Number);
            const maxDay = new Date(y, m, 0).getDate();
            const adjustedDay = Math.min(Math.max(1, d + dayOffset), maxDay);
            newDate = `${y}-${String(m).padStart(2,"0")}-${String(adjustedDay).padStart(2,"0")}`;
          }
          const upd2 = {
            ...t,
            date: newDate,
            desc: editTx.desc, note: editTx.note||"", tags: editTx.tags||[],
            totalAmount: newTotal||amt,
            accountId: editTx.accountId,
            splits: newSplits.map(sp=>({...sp, id:uid()})),
            _csvType: editTx._csvType||t._csvType,
          };
          if(editTx._seriesIdx) upd2._seriesIdx = editTx._seriesIdx;
          else delete upd2._seriesIdx;
          if(editTx._seriesTotal) upd2._seriesTotal = editTx._seriesTotal;
          else delete upd2._seriesTotal;
          if(editTx._potSubId) upd2._potSubId = editTx._potSubId;
          else delete upd2._potSubId;
          if(editTx._fuelVehicleId) upd2._fuelVehicleId = editTx._fuelVehicleId;
          else delete upd2._fuelVehicleId;
          if(editTx._fuelLiters!=null) upd2._fuelLiters = editTx._fuelLiters;
          else delete upd2._fuelLiters;
          if(editTx._fuelPricePerL!=null) upd2._fuelPricePerL = editTx._fuelPricePerL;
          else delete upd2._fuelPricePerL;
          if(editTx._odometer!=null) upd2._odometer = editTx._odometer;
          else delete upd2._odometer;
          return upd2;
        });
      });
    } else {
      // Nur diese eine Buchung
      setTxs(p=>p.map(t=>{
        if(t.id!==editTx.id) {
          // Wenn linkedIds in editTx geändert wurden (z.B. durch Entknüpfen),
          // müssen die entknüpften Vormerkungen wieder auf pending gesetzt werden
          if(!editTx.pending && (t._linkedTo===editTx.id) && !(editTx.linkedIds||[]).includes(t.id)) {
            return {...t, pending:true, _linkedTo:null};
          }
          // Hauptbuchung: linkedIds aktualisieren falls diese Buchung eine der entknüpften ist
          return t;
        }
        const upd3 = {...t, desc:editTx.desc, note:editTx.note||"", tags:editTx.tags||[], totalAmount:newTotal||amt, date:editTx.date,
          pending:isPending, accountId:editTx.accountId, pendingDate,
          splits:newSplits, _csvType:editTx._csvType||t._csvType,
          linkedIds: editTx.linkedIds||[]};
        // _linkedTo explizit übernehmen (kann null sein nach Entknüpfen)
        if(editTx._linkedTo) upd3._linkedTo = editTx._linkedTo;
        else delete upd3._linkedTo;
        if(editTx._seriesIdx) upd3._seriesIdx = editTx._seriesIdx;
        else delete upd3._seriesIdx;
        if(editTx._seriesTotal) upd3._seriesTotal = editTx._seriesTotal;
        else delete upd3._seriesTotal;
        // Flexibler Topf: "aus Unvorhergesehenes" übernehmen (kann gelöscht werden)
        if(editTx._potSubId) upd3._potSubId = editTx._potSubId;
        else delete upd3._potSubId;
        // Tank-Erfassung: Fahrzeug/Liter/Preis/km-Stand übernehmen (kann gelöscht werden)
        if(editTx._fuelVehicleId) upd3._fuelVehicleId = editTx._fuelVehicleId;
        else delete upd3._fuelVehicleId;
        if(editTx._fuelLiters!=null) upd3._fuelLiters = editTx._fuelLiters;
        else delete upd3._fuelLiters;
        if(editTx._fuelPricePerL!=null) upd3._fuelPricePerL = editTx._fuelPricePerL;
        else delete upd3._fuelPricePerL;
        if(editTx._odometer!=null) upd3._odometer = editTx._odometer;
        else delete upd3._odometer;
        return upd3;
      }));
      changedTxIds.current.add(editTx.id);
    }

    // Auto-Regel
    const splits = editTx.splits||[];
    if(splits.length===1 && splits[0].catId) {
      const desc = (editTx.desc||"").replace(/\{[^}]{0,300}\}/g,"").trim();
      const vendor = desc.split("·")[0].split("–")[0].split(" · ")[0].trim().slice(0,40);
      if(vendor.length>2) setCsvRules(p=>({...p, [vendor.toLowerCase()]:{catId:splits[0].catId, subId:splits[0].subId||""}}));
    }

    // Umbuchung: Zielkonto-Eingang automatisch erzeugen (auch für Serien)
    // Auch für reale Buchungen die zu einer Serie gehören — die zukünftigen Raten sind ja Vormerkungen
    if(editTx._transferTo && (editTx.pending || editTx._seriesId)) {
      const tgtAccId = editTx._transferTo;
      const tgtCatId = editTx._transferToCatId || "";
      const tgtSubId = editTx._transferToSubId || "";
      const buildZugangSplits = (amt) => [{id:uid(), catId:tgtCatId, subId:tgtSubId, amount:amt}];

      // Bestimmen welche Quell-Buchungen aktualisiert werden (single/from/all)
      setTxs(prev => {
        const sid = editTx._seriesId;
        const thisDate = editTx.date;
        // Liste der Quell-Buchungen die jetzt einen Zugang bekommen
        // - Bei realer Buchung in einer Serie: NUR die zukünftigen pending Raten (real geht nicht mehr nachträglich gegen-buchen)
        let sourceTxs;
        if(sid && !editTx.pending) {
          // Reale Buchung mit Serie: alle pending Raten der Serie als Source (transferiert die Auswahl auf "alle pending")
          sourceTxs = prev.filter(t => t._seriesId===sid && t.pending);
        } else if(sid && seriesScope==="all") {
          sourceTxs = prev.filter(t => t._seriesId===sid && t.pending);
        } else if(sid && seriesScope==="from") {
          sourceTxs = prev.filter(t => t._seriesId===sid && t.pending && t.date>=thisDate);
        } else {
          sourceTxs = prev.filter(t => t.id===editTx.id);
        }

        // Pro Quell-Buchung: bestehender Zugang updaten oder neuen erzeugen
        const existingLinks = new Map();
        prev.filter(t=>t._linkedTo).forEach(t=>existingLinks.set(t._linkedTo, t));

        let result = [...prev];
        sourceTxs.forEach(srcTx => {
          const transferAmt = Math.abs(srcTx.totalAmount);
          const existing = existingLinks.get(srcTx.id);
          if(existing) {
            // Update bestehenden Zugang
            result = result.map(t => t.id===existing.id
              ? {...t, date:srcTx.date, desc:srcTx.desc, accountId:tgtAccId,
                 totalAmount:transferAmt, pending:true, _csvType:"income",
                 splits: buildZugangSplits(transferAmt)}
              : t);
          } else {
            // Neuer Zugang
            result.push({
              id: "pend-"+uid(),
              date: srcTx.date,
              desc: srcTx.desc,
              totalAmount: transferAmt,
              pending: true,
              _csvType: "income",
              accountId: tgtAccId,
              _linkedTo: srcTx.id,
              _seriesId: sid ? sid+"-tgt" : undefined,
              _seriesIdx: srcTx._seriesIdx,
              _seriesTotal: srcTx._seriesTotal,
              splits: buildZugangSplits(transferAmt),
            });
          }
        });
        return result;
      });
    } else if(!editTx._transferTo) {
      // Falls _transferTo entfernt wurde: existierenden Zugang löschen (für die betroffenen Quell-Buchungen)
      setTxs(prev => {
        const sid = editTx._seriesId;
        const thisDate = editTx.date;
        let sourceIds;
        if(sid && seriesScope==="all") {
          sourceIds = new Set(prev.filter(t=>t._seriesId===sid&&t.pending).map(t=>t.id));
        } else if(sid && seriesScope==="from") {
          sourceIds = new Set(prev.filter(t=>t._seriesId===sid&&t.pending&&t.date>=thisDate).map(t=>t.id));
        } else {
          sourceIds = new Set([editTx.id]);
        }
        return prev.filter(t => !(t._linkedTo && sourceIds.has(t._linkedTo)));
      });
    }
    setEditTx(null);
  };

  const deleteFromEdit = () => { if(!window.confirm("Diese Buchung wirklich löschen?")) return; recordDeletedTxs(editTx.id); setTxs(p=>p.filter(x=>x.id!==editTx.id)); setEditTx(null); };
  const updEditSplit = (sid,f,v) => setEditTx(p=>({...p, splits:p.splits.map(s=>s.id===sid?{...s,[f]:v,...(f==="catId"?{subId:""}:{})}:s)}));

  const buildRows = (cs, gs=groups) => {
    const rows = [];
    BASE_ROWS.forEach(br=>{
      rows.push(br);
      if(br.id==="ein_head"){
        // All groups with behavior="income" or type="income", in groups order
        gs.filter(g=>g.behavior==="income"||g.type==="income").forEach(grp=>{
          cs.filter(c=>c.type===grp.type).forEach(cat=>{
            rows.push({id:`jcat_${cat.id}`,label:cat.name,block:"ein",type:"subheader",cols:false,catId:cat.id});
            (cat.subs||[]).forEach(sub=>{
              rows.push({id:`jsub_${sub.id}`,label:sub.name,block:"ein",type:"auto",cols:true,subId:sub.id,catId:cat.id});
            });
          });
        });
      }
      if(br.id==="aus_head"){
        // All groups with behavior="expense" or type="expense", plus custom groups, in groups order
        gs.filter(g=>{
          const beh = g.behavior||g.type;
          return beh==="expense"||g.type==="expense"||(beh!=="income"&&g.type!=="income"&&g.type!=="tagesgeld");
        }).forEach(grp=>{
          cs.filter(c=>c.type===grp.type).forEach(cat=>{
            rows.push({id:`jcat_${cat.id}`,label:cat.name,block:"aus",type:"subheader",cols:false,catId:cat.id});
            (cat.subs||[]).forEach(sub=>{
              rows.push({id:`jsub_${sub.id}`,label:sub.name,block:"aus",type:"auto",cols:true,subId:sub.id,catId:cat.id});
            });
          });
        });
      }
    });
    return rows;
  };

  // ── Split form helpers ────────────────────────────────────────────────────
  const addSplit    = () => setNewTx(t=>({...t,splits:[...t.splits,{id:uid(),catId:"",subId:"",amount:""}]}));
  const removeSplit = sid=> setNewTx(t=>({...t,splits:(t.splits||[]).filter(s=>s.id!==sid)}));
  const updSplit    = (sid,f,v) => setNewTx(t=>({...t,splits:(t.splits||[]).map(s=>s.id===sid?{...s,[f]:v,...(f==="catId"?{subId:""}:{})}:s)}));

  const splitTotal = sumAmounts(newTx.splits, sp=>sp.amount);
  const splitDiff  = pn(pn(newTx.totalAmount)-splitTotal);
  const txValid    = pn(newTx.totalAmount)>0 && (
    newTx.pending
      ? (newTx.splits.length <= 1 || Math.abs(splitDiff)<0.01)  // Vormerkung mit Splits: Summe muss stimmen
      : newTx.splits.every(s=>s.catId&&pn(s.amount)>0) && Math.abs(splitDiff)<0.01
  );

  const saveTx = () => {
    if(!txValid) return;
    const acc = getAcc(newTx.accountId||"acc-giro");
    const isDelayed = acc.delayDays > 0;
    const base = {
      totalAmount: pn(newTx.totalAmount),
      desc: newTx.desc,
      note: newTx.note||"",
      _csvType: newTx._csvType||"expense",
      pending: newTx.pending || isDelayed,
      accountId: newTx.accountId||"acc-giro",
      splits: newTx.splits
        .filter(s=>s.catId) // leere Splits weglassen
        .map(s=>({...s,amount:pn(s.amount)||pn(newTx.totalAmount)})),
    };
    const months = (newTx.pending||isDelayed) ? Math.max(1, parseInt(newTx.repeatMonths)||1) : 1;
    const seriesId = months > 1 ? "series-"+uid() : null;
    const newEntries = [];
    for(let i=0;i<months;i++){
      const iso = isoAddMonths(newTx.date, i);
      let pendingDate = "";
      if(isDelayed){
        const pd = new Date(iso); pd.setDate(pd.getDate()+acc.delayDays);
        pendingDate = pd.toISOString().split("T")[0];
      }
      newEntries.push({...base, id:"t"+Date.now()+"_"+i, date:iso, pendingDate,
        splits: base.splits.map(s=>({...s, id:uid()})),
        ...(seriesId ? {_seriesId:seriesId, _seriesIdx:i+1, _seriesTotal:months} : {}),
      });
    }
    setTxs(p=>[...newEntries, ...p]);
    setNewTx({
      date: new Date().toISOString().split("T")[0],
      totalAmount:"", desc:"", note:"",
      _csvType:"expense",
      pending: false, repeatMonths: 1, accountId: "acc-giro",
      splits:[{id:uid(),catId:"",subId:"",amount:""}],
    }); setModal(null);
  };

  // ── Category CRUD ─────────────────────────────────────────────────────────
  const saveNewCat  = () => { if(!newCat.name.trim())return; setCats(p=>[...p,{...newCat,id:"cat-"+uid(),subs:[]}]); setNewCat({name:"",icon:"",type:"expense",color:"#FFA07A"}); };
  const saveNewSub  = cid=> { if(!newSubName.trim())return; setCats(p=>p.map(c=>c.id===cid?{...c,subs:[...c.subs,{id:"sub-"+uid(),name:newSubName.trim()}]}:c)); setNewSubName(""); };
  const deleteCat   = id => { if(!window.confirm("Kategorie wirklich löschen? Alle zugehörigen Buchungszuweisungen werden entfernt.")) return; setCats(p=>p.filter(c=>c.id!==id)); setTxs(p=>p.map(t=>({...t,splits:(t.splits||[]).filter(s=>s.catId!==id)}))); setMgmtCat(null); };
  const deleteSub   = (cid,sid)=> { setCats(p=>p.map(c=>c.id===cid?{...c,subs:(c.subs||[]).filter(s=>s.id!==sid)}:c)); };
  const renameCat   = (id,name) => setCats(p=>p.map(c=>c.id===id?{...c,name}:c));
  const renameSub   = (cid,sid,name) => setCats(p=>p.map(c=>c.id===cid?{...c,subs:(c.subs||[]).map(s=>s.id===sid?{...s,name}:s)}:c));
  const updateCat   = (id,f,v) => setCats(p=>p.map(c=>c.id===id?{...c,[f]:v}:c));
  const updateSub   = (cid,sid,f,v) => setCats(p=>p.map(c=>c.id===cid?{...c,subs:(c.subs||[]).map(s=>s.id===sid?{...s,[f]:v}:s)}:c));

  // Move a category up/down within its type-group
  const moveAcc = (id, dir) => setAccounts(p => {
    const i = p.findIndex(a=>a.id===id); if(i<0) return p;
    const j = i+dir; if(j<0||j>=p.length) return p;
    const n=[...p]; [n[i],n[j]]=[n[j],n[i]]; return n;
  });
  const moveCat = (id, dir) => setCats(p => {
    const cat = p.find(c=>c.id===id);
    const sameType = p.filter(c=>c.type===cat.type);
    const idx = sameType.findIndex(c=>c.id===id);
    const newIdx = idx+dir;
    if(newIdx<0||newIdx>=sameType.length) return p;
    const swapId = sameType[newIdx].id;
    const gi  = p.findIndex(c=>c.id===id);
    const gj  = p.findIndex(c=>c.id===swapId);
    const arr = [...p];
    [arr[gi],arr[gj]] = [arr[gj],arr[gi]];
    return arr;
  });

  // Move a subcategory up/down within its parent
  const moveSub = (cid, sid, dir) => setCats(p => p.map(c => {
    if(c.id!==cid) return c;
    const idx = (c.subs||[]).findIndex(s=>s.id===sid);
    const newIdx = idx+dir;
    if(newIdx<0||newIdx>=(c.subs||[]).length) return c;
    const arr = [...(c.subs||[])];
    [arr[idx],arr[newIdx]] = [arr[newIdx],arr[idx]];
    return {...c,subs:arr};
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS LIST
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD TRANSACTION MODAL  (mit Vormerkung + Wiederholung)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Pending items per subId+col (for drill-down editing) ────────────────────
  // Returns list of {txId, desc, amount, txRef} for a given year/month/subId/col
  const pendingItemsFor = (y, m, subId, col) => {
    const candidates = txs.filter(tx => {
      if (!tx.pending) return false;
      const d = new Date(tx.date);
      if (d.getFullYear()!==y || d.getMonth()!==m) return false;
      const hasSub = (tx.splits||[]).some(sp => sp.subId===subId);
      if (!hasSub) return false;
      const day = d.getDate();
      if (col==="M" && day>14) return false;
      return true;
    });
    // Wenn Ausnahme-Einträge vorhanden: Haupteinträge derselben Serie ausblenden
    const exIds = new Set(candidates.filter(t=>t._isException).map(t=>t._seriesId));
    const filtered = candidates.filter(t=>
      t._isException || !exIds.has(t._seriesId)
    );
    return filtered.map(tx => ({
      txId: tx.id,
      desc: tx.desc,
      amount: (tx.splits||[]).find(sp=>sp.subId===subId)?.amount || tx.totalAmount,
    }));
  };

  // ── Smart Mitte/Ende/Aktuell component with expandable pending items ─────────

  // ═══════════════════════════════════════════════════════════════════════════
  // MONAT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // JAHRESPLAN
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Master-Button Navigations-Helfer (App-Ebene) ──
  const stepMonth = (delta) => {
    let m = month + delta, y = year;
    while(m<0)  { m+=12; y--; }
    while(m>11) { m-=12; y++; }
    setMonth(m); setYear(y);
  };
  // In der Money-Mood-Ansicht schaltet die Wisch-Geste das Jahr statt des Monats.
  const onMoodScreen = mainTab==="erfassen" && subTab==="mood";
  const stepPeriod = (delta) => { if(onMoodScreen) setYear(y=>y+delta); else stepMonth(delta); };
  const jumpToToday = () => {
    const t = new Date();
    setMonth(t.getMonth()); setYear(t.getFullYear());
    // MonatScreen scrollt selbst zur heutigen Zeile, sobald sich dieser Zähler
    // ändert (siehe scrollToTodayTick-Effekt dort) — nur den Anker-Monat zu
    // setzen reicht nicht, die Liste blieb sonst an ihrer alten Scroll-Position.
    setScrollToTodayTick(n=>n+1);
  };
  const jumpToTxEdge = (direction /* "first"|"last" */) => {
    const relevant = txs.filter(t=>!t._budgetSubId && (!selAcc || t.accountId===selAcc));
    if(relevant.length===0) return;
    const sorted = [...relevant].sort((a,b)=>a.date.localeCompare(b.date));
    const target = direction==="first" ? sorted[0] : sorted[sorted.length-1];
    const d = new Date(target.date);
    if(!isNaN(d.getTime())) { setMonth(d.getMonth()); setYear(d.getFullYear()); }
  };

  // ── Context value ────────────────────────────────────────────────────────
  // Wichtig: Wir verwenden frozenYear/frozenMonth statt year/month, damit
  // Pfeil-Klicks im Monatswähler-Modal den Hauptcontent NICHT re-rendern
  // (sehr teuer wegen Prognose-Berechnungen). Beim Schließen des Modals
  // werden die frozen-Werte automatisch synchronisiert.
  // Memoisiert: ohne useMemo bekam der Provider bei JEDEM App-Render eine
  // neue Objekt-Referenz und alle Consumer re-renderten (z.B. bei jedem
  // syncStatus-Tick oder lucide-ready). Regel für die Dependency-Liste:
  // ALLE Wert-Einträge des Objekts müssen rein, ebenso Werte, die von den
  // enthaltenen Helfern per Closure gelesen werden (deshalb das rohe `year`
  // für getJV/setJV). Setter aus useState und Refs sind stabil und gehören
  // nicht in die Liste. Wer hier einen Helfer ergänzt, der neuen State
  // liest: State mit in die Liste aufnehmen, sonst drohen stale Closures.
  const cx = useMemo(() => ({
    cats, setCats, groups, setGroups, txs, setTxs, accounts, setAccounts,
    vehicles, setVehicles,
    yearData, setYearData,
    year: frozenYear, setYear, month: frozenMonth, setMonth,
    scrollToTodayTick,
    selAcc, setSelAcc, isLand,
    showAllMonths, setShowAllMonths, mainTab, setMainTab, subTab, setSubTab,
    col3Name, setCol3Name, modal, setModal, mgmtCat, setMgmtCat,
    editTx, setEditTx, newTx, setNewTx, newCat, setNewCat,
    newSubName, setNewSubName, exportModal, setExportModal,
    getCat, getSub, txType, getActualSum, getBudgetForMonth, getTotalIncome, getTotalExpense, getKumulierterSaldo, getPrognoseSaldoDetail, getProgEndeAccGlobal, resetProgEndeCache, getPendingSum, pendingItemsFor,
    // PERFORMANCE-FIX: Tx-Index-Helper für teure Filter-Loops (DashboardScreen/MonatScreen).
    // Statt txs.filter(t=>date in y/m && ...) jetzt O(1) Lookup über vorab gebauten Index.
    _txsInMonth: (y, m) => _txIndex.byYM.get(`${y}-${m}`) || [],
    _txsInMonthCat: (y, m, catId) => _txIndex.byYMCat.get(`${y}-${m}-${catId}`) || [],
    _txsInMonthCatSub: (y, m, catId, subId) => _txIndex.byYMCatSub.get(`${y}-${m}-${catId}-${subId}`) || [],
    _txsInMonthAcc, _txsInMonthAccCat, _txsInMonthAccCatSub,
    navigateToSparen, sparOpenRequest,
    liquidityWarnings,
    getJV, setJV, getMV, setMV, getAcc, openEdit, saveEdit, deleteFromEdit,
    updEditSplit, moveCat, moveSub, updateSub, updateCat,
    renameCat, renameSub, deleteCat, deleteSub, saveNewCat, saveNewSub,
    moveAcc,
    addSplit, removeSplit, updSplit, splitTotal, splitDiff, txValid, saveTx,
    quickBtns, setQuickBtns, showQuickPicker, setShowQuickPicker,
    quickColors, setQuickColors, globalDrag,
    supaUrl, setSupaUrl, supaKey, setSupaKey, supaStatus, setSupaStatus, supaError, setSupaError,
    testSupaConnection, saveSupaSettings,
    accIconPick, setAccIconPick, confirmReset, setConfirmReset,
    supaLockKey, supaActive, supaFetch,
    onTS, onTE,
    csvRules, setCsvRules,
    budgets, setBudgets,
    startBalances, setStartBalances,
    saveConfig: ()=>{ if(cfActive) { savedYearHashRef.current={}; savedConfigHashRef.current=""; saveToCloud({cats, groups, txs, accounts, vehicles, yearData, col3Name, quickBtns, quickColors, csvRules, budgets, customIcons, startBalances, saved_at:Date.now()}); setIsDirty(false); } },
    loadFromCloud: async ()=>{
      if(!cfActive) return;
      try {
        // syncStatus("loading") VOR dem Anwenden setzen: useLocalSaveDebounce
        // erkennt darüber (wie beim Boot-Laden) den true→false-Übergang und
        // startet die Gnadenfrist neu — sonst würde der Auto-Save-Effekt die
        // gerade erst aus der Cloud geladenen (und damit garantiert
        // synchronen) Daten 300ms später fälschlich als "nicht synchronisiert"
        // markieren, obwohl nichts lokal geändert wurde.
        setSyncStatus("loading");
        const d = await cfLoad();
        if(d && d._txTombstones) { mergeRemoteTombstones(d._txTombstones); delete d._txTombstones; }
        if(d && d._sparWatermarks) { mergeRemoteSparWatermarks(d._sparWatermarks); delete d._sparWatermarks; }
        // force=true: ALLE Felder 1:1 vom Cloud-Stand übernehmen, auch wenn
        // einzelne davon dort leer sind — der Nutzer hat den Überschreib-
        // Hinweis bereits bestätigt und erwartet danach garantiert exakt
        // die Cloudflare-Werte, nicht eine Mischung aus alt/neu.
        if(d) applyData(d, true);
        // Sync-Anker auf den Cloud-Zeitstempel setzen: der gleich folgende
        // Auto-Save (useLocalSaveDebounce) stempelt den lokalen Blob zwar mit
        // "jetzt", aber der Anker merkt sich den ECHTEN Cloud-Stand, mit dem
        // wir gerade nachweislich synchron sind — nur so bleibt die spätere
        // "Cloud hat neuere Daten"-Erkennung zuverlässig.
        setCfSyncedAt(d?.saved_at || Date.now());
        setIsDirty(false);
        setSyncStatus("saved");
        setTimeout(()=>setSyncStatus("idle"),2000);
      } catch(e){ setSyncStatus("error"); }
    },
    jsonbinActive, jsonbinSave, jsonbinLoad, jsonbinStatus, setJsonbinStatus, jsonbinKey, jsonbinId, setJsonbinKey, setJsonbinId,
    gistActive, gistSave, gistLoad, gistStatus, setGistStatus, gistToken, gistId, setGistToken, setGistId, applyData,
    // saveToCloudDirect removed — use manual upload button only
    reviewQueue, setReviewQueue,
    showSettings, setShowSettings,
    showVormHub, setShowVormHub, editVormTx, setEditVormTx,
    showMatching, setShowMatching,
    customIcons, setCustomIcons,
    themeName, setThemeName, setThemeRev, themeSlideshow, setThemeSlideshow,
    hideEmptyRows, setHideEmptyRows,
    handedness, setHandedness,
    debugFlags, setDebugFlag, setDebugFlags,
    cfActive, cfSave, cfLoad, cfStatus, setCfStatus, cfUrl, cfSecret, setCfUrl, setCfSecret,
    syncPass, setSyncPass, syncEncActive,
    showCloudSetup, setShowCloudSetup,
    showFuelAnalysis, setShowFuelAnalysis,
    showGuidedTour, setShowGuidedTour,
    setShowMobileKategorien,
    setActiveStructurTab, setShowBankWizard,
    setShowCsv, setShowDataMgr,
    syncStatus, setSyncStatus, syncError, isDirty,
    isOnline, openCloudSave: ()=>setShowCloudSave(true),
    cfSaveOnClose, setCfSaveOnClose,
    dashDrillOpen, setDashDrillOpen,
    amtMode, setAmtMode,
    amtFont, setAmtFont,
    noBorders, setNoBorders,
    masterOverride, setMasterOverride,
    favIcons, setFavIcons,
  }), [
    cats, groups, txs, accounts, vehicles, yearData,
    frozenYear, frozenMonth, year, selAcc, isLand, scrollToTodayTick,
    showAllMonths, mainTab, subTab, col3Name, modal, mgmtCat,
    editTx, newTx, newCat, newSubName, exportModal,
    _txIndex, sparOpenRequest,
    quickBtns, showQuickPicker, quickColors,
    supaUrl, supaKey, supaStatus, supaError, supaLockKey, supaActive,
    accIconPick, confirmReset,
    csvRules, budgets, startBalances,
    jsonbinActive, jsonbinStatus, jsonbinKey, jsonbinId,
    gistActive, gistStatus, gistToken, gistId,
    reviewQueue, showSettings, showVormHub, editVormTx, showMatching,
    customIcons, themeName, themeSlideshow, hideEmptyRows, handedness, debugFlags,
    cfActive, cfStatus, cfUrl, cfSecret,
    syncPass, syncEncActive, showCloudSetup, showFuelAnalysis, showGuidedTour,
    syncStatus, syncError, isDirty, isOnline, cfSaveOnClose,
    dashDrillOpen, amtMode, amtFont, noBorders, masterOverride,
    favIcons,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  const prevMonth = () => { if(month>0){setMonth(m=>m-1);}else{setMonth(11);setYear(y=>y-1);} };
  const nextMonth = () => { if(month<11){setMonth(m=>m+1);}else{setMonth(0);setYear(y=>y+1);} };

  // ── Neue 5-Tab Navigation ─────────────────────────────────────────
  // Kinder-Themes können eigene, verspieltere Icons für Home/Trend/Daten
  // hinterlegen (T.nav_icons) — Monat bleibt überall der Kalender, da es
  // dafür keine klarere Alternative gibt.
  const NAV_TABS = [
    {id:"home",      label:"Home",     icon:T.nav_icons?.home || "home"},
    {id:"jahr",      label:"Trend",    icon:T.nav_icons?.jahr || "activity"},
    {id:"monat",     label:"Monat",    icon:"calendar"},
    {id:"daten",     label:"Daten",    icon:T.nav_icons?.daten || "database"},
  ];
  const activeNavTab =
    mainTab==="struktur" ? "daten" :
    mainTab==="erfassen"&&subTab==="monat" ? "monat" :
    // „Money Mood"/Jahr werden aus der Trend-Übersicht geöffnet → Jahr bleibt aktiv.
    mainTab==="erfassen"&&(subTab==="jahr"||subTab==="mood"||subTab==="trend") ? "jahr" :
    "home";
  const anyMobileModalOpen = showMobileVormerken||showMobileWiederkehrend||
    showMobilePicker||showMobileKategorien||showMobileBudget||
    showCsv||showVormHub||showRecurring||showMatching||!!modal||dashDrillOpen;

  const showMonthPicker = anyMobileModalOpen ||
    activeNavTab==="home"||activeNavTab==="monat"||activeNavTab==="jahr";

  // Höhe, die der SyncStatusBadge oben beansprucht (0, wenn er gerade nicht
  // angezeigt wird) — als CSS-Variable verfügbar, damit position:fixed-
  // Vollbild-Dialoge (die den Badge sonst nicht kennen und ihn überdecken
  // würden, siehe Kategorie-Drilldown) ihren eigenen Notch-Abstand darum
  // ergänzen können: calc(12px + env(safe-area-inset-top) + var(--sync-badge-space)).
  const syncBadgeSpace = getSyncBadgeState({isOnline, cfActive, isDirty, syncStatus}) ? "38px" : "0px";
  // Eckenradius des Deko-Rahmens (Kinder-Themes): an die tatsächliche
  // Bildschirm-Eckenrundung moderner iPhones angenähert (nicht exakt pro
  // Modell messbar, es gibt keine CSS-Eigenschaft dafür) — 18px wirkte im
  // Vergleich zur echten Gehäuserundung eckig/unpassend.
  const FRAME_RADIUS = 44;

  return (
  <AppCtx.Provider value={cx}>
    <>
    <div className={[noBorders?"no-borders":null, themeName==="clean"?"theme-clean":null, themeName==="brutalist"?"theme-brutalist":null, themeName==="terminal"?"theme-terminal":null, themeName==="swiss"?"theme-swiss":null,
      amtMode===0?"amts-blur":null, amtMode<2?"amts-neutral":null,
      amtFont?`amtfont-${amtFont}`:null].filter(Boolean).join(" ")||undefined}
      style={{background:T.bg,height:"100vh",maxHeight:"100vh",
      colorScheme:(isLightTheme())?"light":"dark",
      "--amt-neutral":T.txt,  // Neutral-Schriftfarbe für Beträge (= Kategorie-Text)
      "--sync-badge-space":syncBadgeSpace,
      display:"flex",flexDirection:"column",
      // Inhalt unter die Notch/Statusleiste; bg füllt bis ganz oben. Der volle
      // safe-area-inset-top-Wert liegt spürbar über der reinen Statusleisten-
      // höhe (zusätzlicher iOS-eigener Puffer) — hier gekappt, damit der
      // Inhalt (Sync-Banner) näher an die Statusleiste rückt. max(0px, ...)
      // verhindert auf jedem Gerät negative Werte (Inhalt würde sonst hinter
      // die Notch/Dynamic Island rutschen).
      // Kinder-Themes bekommen zusätzlich die Border-Breite (9-10px) oben
      // "geschenkt" (border-top ist Teil derselben Box, VOR dem Padding) —
      // bei alten Themes fehlt diese Border, also weniger stark kappen,
      // sonst rutscht der Inhalt dort zu nah an/unter die Notch.
      paddingTop:`max(0px, calc(env(safe-area-inset-top) - ${T.frame_border?24:14}px))`,
      fontFamily:"'SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",
      userSelect:"none",overflow:"hidden",
      // Deko-Rahmen der Kinder-Themes: Border BLEIBT Teil dieser Box (durch
      // box-sizing:border-box schrumpft die Inhaltsfläche automatisch mit) —
      // das ist zugleich, worauf sich Vollbild-Dialoge (position:fixed,
      // inset:0) stützen: transform etabliert diesen Container als deren
      // Containing Block, und "inset:0" richtet sich dabei nach der
      // PADDING-Kante dieser Box, die durch die Border bereits automatisch
      // eingerückt ist — Dialoge docken sich also INNERHALB des Rahmens an.
      // Ohne frame_border bleibt das Verhalten alter Themes unverändert
      // (kein transform, keine Border).
      ...(T.frame_border ? {
        border:T.frame_border,
        boxShadow:`inset 0 0 0 4px ${T.frame_ring||T.bg}`,
        borderRadius:FRAME_RADIUS,
        transform:"translateZ(0)",
      } : {})}}>

      {/* Zusätzliche Deko-Rahmen-Overlay-Schicht, GENAU auf derselben Border
          gemalt — aber ÜBER dem gesamten Inhalt (z-index), nicht darunter.
          Grund: normale Nachfahren (Hero-Text, Suchleiste, Kategorie-Karten
          etc.) malen laut CSS-Reihenfolge immer ÜBER der eigenen Border des
          Elternelements, egal wie viel Innenabstand man ihnen gibt — jeder
          Versuch, exakt genug Abstand zu berechnen, war ein Wettlauf gegen
          echte Browser-Schriftbreiten. Diese Overlay-Kopie (pointer-events:
          none, damit sie nie Klicks abfängt) sitzt einfach ÜBER dem Inhalt
          und bleibt so immer sichtbar. z-index bewusst niedrig genug, dass
          echte Dialoge/Dropdowns (alle ≥ 15, siehe z.B. ThemeSwitcherMini/
          MatchingScreen) weiterhin darüber erscheinen.
          Negative Offsets (-frameBorderWidth statt inset:0): der Container
          hat durch transform bereits einen eigenen Containing Block für
          position:absolute/fixed-Nachfahren — dessen Bezugsrahmen ist die
          PADDING-Kante (schon um die Border-Breite eingerückt). inset:0
          würde die Kopie also um die Border-Breite zu weit innen zeichnen;
          die negativen Offsets schieben sie exakt zurück auf die echte
          Außenkante, auf der auch die reale Border liegt. */}
      {T.frame_border && (() => {
        const w = parseInt(T.frame_border) || 0;
        return (
          <div style={{position:"absolute",top:-w,left:-w,right:-w,bottom:-w,
            pointerEvents:"none",zIndex:5,
            border:T.frame_border,
            boxShadow:`inset 0 0 0 4px ${T.frame_ring||T.bg}`,
            borderRadius:FRAME_RADIUS}}/>
        );
      })()}

      {/* ── Performance-Debug + Theme-Umschalter wurden nach Einstellungen verschoben ── */}

      {/* Global edit popup */}
      <ErrorBoundary name="EditPopup"><EditPopup/></ErrorBoundary>

      {/* ── Schieflage-Warnung: schlanker, antippbarer Balken ganz oben (alle Screens) ──
          Erscheint, solange die Vorschau in den nächsten 12 Monaten kippt — NICHT
          ausblendbar; verschwindet erst, wenn das Problem behoben ist. Tippen öffnet
          Money Mood (Details). */}
      {strainWarning && (()=>{
        const w = strainWarning, s = w.soonest;
        const label = `${MONTHS_S[s.mi]} ${s.yr}`;
        return (
          <div onClick={()=>{ setYear(s.yr); setMainTab("erfassen"); setSubTab("mood"); }}
            style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
              // Kräftiges, festes Rot statt T.neg — manche Themes definieren
              // "neg" bewusst blass/pastellig (z.B. #FFA090, #FFC5C4) für den
              // Einsatz als kleine Textfarbe auf grauem Grund; als VOLLFLÄCHIGER
              // Banner-Hintergrund mit weißer Schrift wirkt dieselbe Farbe dann
              // wie "Weiß auf Rosa" und ist kaum zu erkennen. Diese Warnung
              // muss in jedem Theme gleich gut lesbar bleiben.
              background:"#C0311A",color:"#fff",padding:"7px 12px",flexShrink:0,
              boxShadow:"0 1px 6px rgba(0,0,0,0.3)"}}>
            {Li("alert-triangle",16,"#fff")}
            <div style={{flex:1,minWidth:0,lineHeight:1.25}}>
              <div style={{fontSize:12.5,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                Liquiditäts-Engpass ab {label}: Konto fällt auf {s.saldoVal < 0 ? "−" : ""}{fmt(s.saldoVal)} €
              </div>
              <div style={{fontSize:11,opacity:0.92,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {fmt(s.deficit)} € unter Puffer ({fmt(w.buffer)} €){w.count>1?` · +${w.count-1} weitere${w.count-1===1?"r":""} Monat${w.count-1===1?"":"e"}`:""} · tippen
              </div>
            </div>
            {Li("chevron-right",18,"#fff")}
          </div>
        );
      })()}

      {/* ── Überfällige-Vormerkungen-Warnung: schlanker, antippbarer Balken ganz oben
          (alle Screens). Erscheint, solange mind. eine Vormerkung ein bereits
          vergangenes Buchungsdatum hat und noch nicht real gebucht wurde. Tippen
          öffnet eine Liste der betroffenen Vormerkungen. ── */}
      {overduePending.length>0 && (()=>{
        const first = overduePending[0];
        const dateStr = first.date.split("-").reverse().join(".");
        return (
          <div onClick={()=>setShowOverdueList(true)}
            style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
              background:"#8A5A00",color:"#fff",padding:"7px 12px",flexShrink:0,
              boxShadow:"0 1px 6px rgba(0,0,0,0.3)"}}>
            {Li("alert-triangle",16,"#fff")}
            <div style={{flex:1,minWidth:0,lineHeight:1.25}}>
              <div style={{fontSize:12.5,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {overduePending.length===1
                  ? `Überfällige Vormerkung: ${first.desc||"Buchung"}`
                  : `${overduePending.length} überfällige Vormerkungen`}
              </div>
              <div style={{fontSize:11,opacity:0.92,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                seit {dateStr} noch nicht als tatsächliche Buchung eingetroffen · tippen
              </div>
            </div>
            {Li("chevron-right",18,"#fff")}
          </div>
        );
      })()}

      {showOverdueList && (
        <Overlay onClose={()=>setShowOverdueList(false)}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:16,fontWeight:800,color:T.txt}}>Überfällige Vormerkungen</div>
            <div onClick={()=>setShowOverdueList(false)} style={{cursor:"pointer",color:T.txt2}}>{Li("x",20)}</div>
          </div>
          {overduePending.map(tx=>{
            const sp = (tx.splits||[])[0];
            const cat = getCat(sp?.catId);
            const isInc = (tx._csvType||(tx.totalAmount>=0?"income":"expense"))==="income";
            return (
              <div key={tx.id} onClick={()=>{ setShowOverdueList(false); openEdit(tx); }}
                style={{display:"flex",alignItems:"center",gap:10,padding:"11px 8px",
                  borderBottom:`1px solid ${T.bd}`,cursor:"pointer"}}>
                {Li("alert-triangle",16,T.gold)}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {tx.desc||cat?.name||"Buchung"}
                  </div>
                  <div style={{fontSize:11.5,color:T.txt2,marginTop:1}}>
                    seit {tx.date.split("-").reverse().join(".")}
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:isInc?T.pos:T.txt,flexShrink:0}}>
                  {isInc?"+":"−"}{fmt(Math.abs(tx.totalAmount))} €
                </div>
                {Li("chevron-right",16,T.txt2)}
              </div>
            );
          })}
        </Overlay>
      )}

      {/* ── Vorschlag: Budget-Platzhalter automatisch verlängern (Auto-Erweiterung).
          Ersetzt den früheren lautlosen Automatismus — legt NICHTS mehr ohne
          explizite Bestätigung an, siehe useEffect weiter oben. ── */}
      {budgetExtProposal && (
        <Overlay onClose={()=>{
          setBudgets(budgetExtProposal.nextBudgets);
          setBudgetExtProposal(null);
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:16,fontWeight:800,color:T.txt}}>Wiederkehrende Budgets verlängern?</div>
          </div>
          <div style={{fontSize:12.5,color:T.txt2,marginBottom:12,lineHeight:1.4}}>
            Für folgende Budgets werden neue Platzhalter-Buchungen vorgeschlagen,
            damit die Vorschau weiter in die Zukunft reicht. Buchungen, die du
            zuvor gelöscht hast, werden dabei NICHT wieder angelegt.
          </div>
          {budgetExtProposal.items.map(it=>{
            const bud = budgets[it.subId];
            const cat = bud?.catId ? getCat(bud.catId) : null;
            const sub = cat ? getSub(cat.id, it.subId) : null;
            const acc = getAcc(it.accountId);
            return (
              <div key={it.subId} style={{padding:"10px 8px",borderBottom:`1px solid ${T.bd}`}}>
                <div style={{fontSize:14,fontWeight:700,color:T.txt}}>
                  {sub?.name || cat?.name || it.desc}
                </div>
                <div style={{fontSize:11.5,color:T.txt2,marginTop:2}}>
                  {it.count} neue Buchung{it.count===1?"":"en"} · {fmt(Math.abs(it.amount))} € ·
                  {" "}{it.from.split("-").reverse().join(".")} – {it.to.split("-").reverse().join(".")} · {acc?.name}
                </div>
              </div>
            );
          })}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={()=>{
              setBudgets(budgetExtProposal.nextBudgets);
              setBudgetExtProposal(null);
            }} style={{flex:1,padding:"11px 0",borderRadius:10,border:`1px solid ${T.bd}`,
              background:"transparent",color:T.txt,fontWeight:700,fontSize:14,cursor:"pointer"}}>
              Ablehnen
            </button>
            <button onClick={()=>{
              setTxs(p=>[...p,...budgetExtProposal.toAdd]);
              setBudgets(budgetExtProposal.nextBudgets);
              setBudgetExtProposal(null);
            }} style={{flex:1,padding:"11px 0",borderRadius:10,border:"none",
              background:T.gold,color:"#1a1a1a",fontWeight:800,fontSize:14,cursor:"pointer"}}>
              Anlegen
            </button>
          </div>
        </Overlay>
      )}

      {/* ── Offline-/Sync-Hinweis (dauerhaft sichtbar, alle Screens) ── */}
      <SyncStatusBadge/>

      {/* ── Interaktive Feature-Tour (Hero-"?"-Symbol): Overlay ÜBER dem
          aktiven Tab, wechselt selbst zwischen Tabs — kein showXxx-Vollbild-
          Screen, daher außerhalb des CONTENT-Bereichs gerendert. ── */}
      {showGuidedTour && <GuidedFeatureTour onClose={()=>setShowGuidedTour(false)}/>}

      {/* ── CONTENT ── */}
      <div style={{flex:1,minHeight:0,overflow:"hidden",display:"flex",flexDirection:"column",
        touchAction:"pan-y",paddingBottom:57}}
        onTouchStart={onTS} onTouchEnd={onTE}>
        {/* Hinweis: year/month im Context sind frozenYear/frozenMonth, solange das
            Monatswähler-Modal offen ist — verhindert teure Re-Renders. */}
        {mainTab==="erfassen"&&subTab==="dashboard"&&(
          <ErrorBoundary name="DashboardScreenV2"><DashboardScreenV2/></ErrorBoundary>
        )}
        {mainTab==="erfassen"&&subTab==="monat"    &&<ErrorBoundary name="MonatScreen"><MonatScreen/></ErrorBoundary>}
        {mainTab==="erfassen"&&subTab==="trend"     &&<ErrorBoundary name="TrendOverviewScreen"><TrendOverviewScreen/></ErrorBoundary>}
        {mainTab==="erfassen"&&subTab==="jahr"      &&<ErrorBoundary name="JahrScreen"><JahrScreen forceSingle={false}/></ErrorBoundary>}
        {mainTab==="erfassen"&&subTab==="mood"      &&<ErrorBoundary name="MoneyMoodScreen"><MoneyMoodScreen/></ErrorBoundary>}
        {mainTab==="struktur"                       &&<ManagementScreen activeTab={activeStructurTab}/>}

        {/* ── MEHR-SCREEN (inline) ── */}
      </div>

      {/* ── BOTTOM NAV BAR — 5 Tabs + + Button ── */}
      {(()=>{
        const onTap = (t) => {
          // Offene Mobile-Overlays/Picker beim Tab-Wechsel schließen — sonst läge
          // der Picker über der neuen Ansicht und es "passiert nichts".
          setShowMobilePicker(false);
          setShowMobileVormerken(false); setShowMobileKategorien(false);
          setShowMobileBudget(false); setShowMobileWiederkehrend(false);
          setShowDataMgr(false); setShowCsv(false); setShowVormHub(false);
          // WICHTIG: plusArretiert hier NICHT zurücksetzen — der vergrößerte
          // + Button soll ausschließlich per Doppel-Tap (auf den Knopf selbst)
          // verkleinert werden, nicht schon durch einen einfachen Tab-Wechsel
          // in der unteren Navigation.
          if(t.id==="home")      { setMainTab("erfassen"); setSubTab("dashboard"); }
          else if(t.id==="monat")     { setMainTab("erfassen"); setSubTab("monat"); }
          else if(t.id==="daten")     { setMainTab("struktur"); setActiveStructurTab("daten"); }
          else if(t.id==="jahr")      { setMainTab("erfassen"); setSubTab("trend"); }
        };

        // ── Master-Button: Inline-Renderfunktion (keine Komponente, um Hook-Identität zu wahren) ──
        const renderMasterButton = (key) => {
          const monthNames = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
          const SIZE = 78;
          // Heutiger Tag — nur wenn der angezeigte Monat der aktuelle ist (oben im + Button)
          const _nowMB = new Date();
          const _dayStr = (_nowMB.getFullYear()===year && _nowMB.getMonth()===month)
            ? `${_nowMB.getDate()}.` : null;

          // ── Override-Variante: Wizard hat den Knopf temporär übernommen ──
          // Selbe Position, dieselbe Größe — nur Inhalt und Gestik ändern sich.
          // Damit der Knopf trotz offenem Modal (zIndex 300) klickbar bleibt,
          // setzen wir den Wrapper auf zIndex 500.
          if(masterOverride) {
            return <MasterOverrideSlot key={key} override={masterOverride}
              SIZE={SIZE} T={T} plusArretiert={plusArretiert}/>;
          }
          const DRAG_THRESHOLD = 30;   // ab so vielen Pixeln gilt als Geste
          const MOVE_TOLERANCE = 14;   // Finger-Jitter bis hier zählt noch als Tap
          const VISUAL_LIMIT = 15;     // Joystick darf max so weit wandern
          const HOLD_MS = 600;         // wie lange in einer Richtung halten für Edge-Jump
          const DOUBLE_TAP_MS = 350;   // Fenster für Doppel-Tap (vergrößern bzw. jumpToToday)
          // Plus-Button-Rest-Position. Im Trend-Drilldown: VERGRÖSSERT und frei
          // vertikal verschiebbar (drillBtnY) — der Nutzer schiebt ihn aus den
          // Balken; Links/Rechts-Wisch schaltet weiter das Jahr.
          const restingTransform = moodDrillOpen
            ? `translate(0px, ${drillBtnY}px) scale(1.45)`
            : (plusArretiert ? "translate(0px, -94px) scale(1.5)" : "translate(0px, -14px) scale(1)");

          // GESTEN:
          // - Double-Tap = IMMER eine Ebene ZURÜCK:
          //     Mehr/Monatsauswahl offen → schließen
          //     groß → Dashboard + verkleinern + aktuelles Datum
          //     Unteransicht (klein) → Dashboard
          //     Dashboard + klein (Startpunkt) → vergrößern (Zugang zu Mehr)
          // - Single-Tap (klein)      → nichts (hält den Doppel-Tap zuverlässig)
          // - Single-Tap (arretiert)  → Mehr-Ansicht (nach Ablauf des Doppel-Tap-Fensters)
          // - Swipe-L/R (arretiert)   → stepMonth
          // - Swipe-Up (arretiert)    → Monatsauswahl öffnen/schließen (Toggle)
          // - Swipe-Down (arretiert)  → Cloud-Speichern-Modal
          // - Hold horizontal (arretiert) → jumpToTxEdge (first/last)

          // Hilfsfunktion: Hold-Timer setzen, wenn Pointer in horizontale Richtung gedraggt
          const armHoldTimer = (ref, btn) => {
            if(ref.holdTimer) return; // schon gesetzt
            ref.holdTimer = setTimeout(()=>{
              if(!ref.dragging) return;
              if(Math.abs(ref.dx) <= Math.abs(ref.dy)) return; // nicht mehr horizontal
              if(Math.abs(ref.dx) < DRAG_THRESHOLD) return;
              // Geste auslösen
              ref.consumed = true;
              if(ref.dx < 0) jumpToTxEdge("first");
              else jumpToTxEdge("last");
              // Visuelles Feedback: Button kurz "pulsen" — auf der AKTUELLEN
              // Rest-Position/-Größe (arretiert: y -94, scale 1,5), damit er beim
              // Links/Rechts-Hold nicht erst verkleinert und wieder vergrößert wird.
              if(btn) {
                const restY = plusArretiert ? -94 : -14;
                const base  = plusArretiert ? 1.5 : 1;
                const dir   = ref.dx < 0 ? -1 : 1;
                btn.style.transition = "transform 0.15s ease-out";
                btn.style.transform = `translate(${dir*(VISUAL_LIMIT+4)}px, ${restY}px) scale(${base*1.1})`;
                setTimeout(()=>{
                  if(btn && ref.dragging) {
                    btn.style.transition = "none";
                    btn.style.transform = `translate(${dir*VISUAL_LIMIT}px, ${restY}px) scale(${base*1.05})`;
                  }
                }, 150);
              }
            }, HOLD_MS);
          };
          const clearHoldTimer = (ref) => {
            if(ref.holdTimer) { clearTimeout(ref.holdTimer); ref.holdTimer = null; }
          };

          // Pointer-Events: funktioniert für Touch und Maus
          const onPointerDown = (e) => {
            if(e.button !== undefined && e.button !== 0) return;
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err) {}
            masterTouchRef.current = {
              x: e.clientX, y: e.clientY,
              t: Date.now(), moved: false,
              dx: 0, dy: 0,
              pointerId: e.pointerId,
              dragging: true,
              consumed: false,
              holdTimer: null,
              axisLocked: null,  // SNAPPING: "x" oder "y" sobald dominante Achse klar ist
              startDrillY: drillBtnY,  // Ausgangs-Y für freies Ziehen im Drilldown
              drillLiveY: null
            };
          };
          const onPointerMove = (e) => {
            const ref = masterTouchRef.current;
            if(!ref.dragging || ref.pointerId !== e.pointerId) return;
            const dx = e.clientX - ref.x;
            const dy = e.clientY - ref.y;
            ref.dx = dx; ref.dy = dy;
            const absDx = Math.abs(dx), absDy = Math.abs(dy);
            if(absDx>MOVE_TOLERANCE || absDy>MOVE_TOLERANCE) {
              ref.moved = true;
            }
            // ── TREND-DRILLDOWN: Button vergrößert & frei vertikal ziehbar.
            //    Vertikal = verschieben (folgt dem Finger); Links/Rechts = Jahr
            //    (erst beim Loslassen). Normaler Hoch/Runter-Swipe entfällt hier. ──
            if(moodDrillOpen) {
              if(!ref.axisLocked && (absDx > MOVE_TOLERANCE || absDy > MOVE_TOLERANCE)) {
                ref.axisLocked = (absDx >= absDy) ? "x" : "y";
              }
              if(e.currentTarget) {
                e.currentTarget.style.transition = "none";
                if(ref.axisLocked === "y") {
                  const newY = Math.max(-660, Math.min(20, ref.startDrillY + dy));
                  ref.drillLiveY = newY;
                  e.currentTarget.style.transform = `translate(0px, ${newY}px) scale(1.45)`;
                } else if(ref.axisLocked === "x") {
                  const vx = Math.max(-VISUAL_LIMIT, Math.min(VISUAL_LIMIT, dx));
                  e.currentTarget.style.transform = `translate(${vx}px, ${ref.startDrillY}px) scale(${1.45*1.06})`;
                }
              }
              return;
            }
            // ── START-ZUSTAND (klein): Swipen bewirkt visuell/aktionsseitig nichts.
            //    Aktionen laufen über Doppel-Tap (siehe onPointerUp); Wische
            //    (Monat, Monatsauswahl) wirken erst im vergrößerten Zustand. ──
            if(!plusArretiert) {
              clearHoldTimer(ref);
              return;
            }
            // ACHSEN-SNAPPING: Sobald die Bewegung MOVE_TOLERANCE überschreitet,
            // wird die dominante Achse "gelockt". Visualisierung folgt nur dieser Achse,
            // damit sich der Button nie diagonal/schwammig anfühlt.
            if(!ref.axisLocked && (absDx > MOVE_TOLERANCE || absDy > MOVE_TOLERANCE)) {
              ref.axisLocked = (absDx >= absDy) ? "x" : "y";
            }
            // Wenn schon konsumiert (Hold-Geste ausgelöst): nichts mehr tun
            if(ref.consumed) return;
            // Joystick-Visualisierung — STRIKT auf gelockter Achse
            const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));
            // Vertikal: solange klein/Bottom-Bar, kein Drag nach unten zulassen
            const vyLow = plusArretiert ? -VISUAL_LIMIT : -VISUAL_LIMIT;
            const vyHigh = plusArretiert ?  VISUAL_LIMIT : 0;
            const clampY = (v) => Math.max(vyLow, Math.min(vyHigh, v));
            let visX = 0, visY = -14;
            if(ref.axisLocked === "x") {
              visX = clamp(dx, VISUAL_LIMIT);
              visY = -14;
            } else if(ref.axisLocked === "y") {
              visX = 0;
              visY = clampY(dy) - 14;
            }
            // Vor dem Achsen-Lock bleibt der Button bewusst stehen (visX=0, visY=-14).
            // So gibt es KEIN diagonales Wackeln nach links/rechts beim Hochziehen —
            // Bewegung beginnt erst, wenn genau eine Achse (hoch/runter ODER links/
            // rechts) gelockt ist, und folgt dann strikt nur dieser einen Achse.
            // Live-Drag visuell: Translation relativ zur aktuellen Rest-Position
            // (arretiert: y-Offset -94, scale 1.5; sonst y-Offset -14, scale 1)
            const restY = plusArretiert ? -94 : -14;
            const dragScale = plusArretiert ? 1.5*1.08 : 1.08;
            if(e.currentTarget) {
              e.currentTarget.style.transform = `translate(${visX}px, ${visY+restY+14}px) scale(${dragScale})`;
              e.currentTarget.style.transition = "none";
            }
            // Hold-Timer NUR wenn horizontale Achse gelockt
            if(ref.axisLocked === "x" && absDx > DRAG_THRESHOLD) {
              armHoldTimer(ref, e.currentTarget);
            } else {
              clearHoldTimer(ref);
            }
          };
          const onPointerUp = (e) => {
            const ref = masterTouchRef.current;
            if(!ref.dragging || ref.pointerId !== e.pointerId) return;
            ref.dragging = false;
            clearHoldTimer(ref);
            const dx = ref.dx, dy = ref.dy;
            const dt = Date.now() - ref.t;
            // ── TREND-DRILLDOWN: vertikal → Position übernehmen; links/rechts →
            //    Jahr wechseln. Sonst nichts (kein Monatsauswahl/Cloud hier). ──
            if(moodDrillOpen) {
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
              const axis = ref.axisLocked;
              if(axis === "y" && ref.drillLiveY != null) {
                setDrillBtnY(ref.drillLiveY);
              } else {
                if(axis === "x" && Math.abs(dx) > DRAG_THRESHOLD) {
                  if(dx < 0) stepPeriod(-1); else stepPeriod(1);
                }
                if(e.currentTarget) {
                  e.currentTarget.style.transition = "transform 0.18s ease-out";
                  e.currentTarget.style.transform = `translate(0px, ${drillBtnY}px) scale(1.45)`;
                }
              }
              return;
            }
            // ── START-ZUSTAND (klein): Einzel-Tap öffnet — nach kurzer Verzögerung,
            //    damit ein Doppel-Tap ihn noch abfangen kann — DIREKT den
            //    Vormerken-Dialog (ersetzt die frühere Monde-Auswahl). Doppel-Tap
            //    vergrößert weiterhin für die Datums-/Monatsnavigation (Wisch). ──
            if(!plusArretiert) {
              if(e.currentTarget) {
                e.currentTarget.style.transition = "transform 0.2s cubic-bezier(.34,1.4,.64,1)";
                e.currentTarget.style.transform = "translate(0px, -14px) scale(1)";
              }
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
              if(ref.moved) return;   // Wisch im Klein-Zustand → nichts
              if(dt < 700) {
                const now = Date.now();
                const lt = masterLastTapRef.current;
                if(lt.t && (now - lt.t) < DOUBLE_TAP_MS) {
                  if(lt.timer) clearTimeout(lt.timer);   // wartenden Einzel-Tap verwerfen
                  masterLastTapRef.current = {zone:null, t:0, timer:null};
                  try { if(navigator.vibrate) navigator.vibrate(15); } catch(_) {}
                  if(showMobilePicker)          setShowMobilePicker(false);       // Mehr offen → schließen
                  else if(showMonthPickerModal) setShowMonthPickerModal(false);   // Monatsauswahl → schließen
                  else if(showCloudSave)        setShowCloudSave(false);          // Cloud-Modal → schließen
                  else {
                    // klein → vergrößern (Datums-/Monatsnavigation); KEIN Tab-Wechsel
                    if(e.currentTarget) {
                      e.currentTarget.style.transition = "transform 0.42s cubic-bezier(0.34, 1.45, 0.5, 1)";
                      e.currentTarget.style.transform = "translate(0px, -94px) scale(1.5)";
                    }
                    setPlusArretiert(true);
                  }
                } else {
                  // Einzel-Tap: nach kurzer Verzögerung (Doppel-Tap-Fenster) direkt
                  // den Vormerken-Dialog öffnen.
                  const timer = setTimeout(()=>{
                    masterLastTapRef.current = {zone:null, t:0, timer:null};
                    try { if(navigator.vibrate) navigator.vibrate(10); } catch(_) {}
                    setShowMobileVormerken(true);
                  }, DOUBLE_TAP_MS);
                  masterLastTapRef.current = {zone:"center", t:now, timer};
                }
              }
              return;
            }
            const wasConsumed = ref.consumed;
            const axis = ref.axisLocked;
            // Visuell zurück
            if(e.currentTarget) {
              e.currentTarget.style.transition = "transform 0.2s cubic-bezier(.34,1.4,.64,1)";
              e.currentTarget.style.transform = restingTransform;
            }
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
            // Falls schon durch Hold ausgelöst → nichts mehr tun
            if(wasConsumed) return;
            // Drag-Geste am Ende? Entscheidung über die GELOCKTE Achse (nicht über dx/dy-Vergleich)
            // Wisch bricht einen evtl. wartenden Einzel-Tap (Mehr-Timer) ab.
            const _ltPend = masterLastTapRef.current;
            if(_ltPend.timer && ((axis==="y"&&Math.abs(dy)>DRAG_THRESHOLD)||(axis==="x"&&Math.abs(dx)>DRAG_THRESHOLD))) {
              clearTimeout(_ltPend.timer);
              masterLastTapRef.current = {zone:null, t:0, timer:null};
            }
            if(axis === "y" && Math.abs(dy) > DRAG_THRESHOLD) {
              ref.consumed = true;
              // Vertikal koordiniert zwischen Monatsauswahl (oben) und
              // Cloud-Speichern (unten): immer ist höchstens eines offen.
              if(dy < 0) {
                // Swipe-Up → Richtung Monatsauswahl
                if(showCloudSave) { setShowCloudSave(false); setShowMonthPickerModal(true); }
                else              setShowMonthPickerModal(v => !v);
              } else {
                // Swipe-Down → Richtung Cloud-Speichern
                if(showMonthPickerModal) { setShowMonthPickerModal(false); setShowCloudSave(true); }
                else                     setShowCloudSave(v => !v);
              }
              return;
            }
            if(axis === "x" && Math.abs(dx) > DRAG_THRESHOLD) {
              ref.consumed = true;
              // Vergrößert (Datumsanzeige): ←/→ wechselt den Monat.
              if(dx < 0) stepPeriod(-1); else stepPeriod(1);
              return;
            }
            // Tap (ohne nennenswerte Bewegung) im GROSSEN Zustand:
            //   Einzel-Tap  → öffnet nach kurzer Verzögerung direkt den
            //                 Vormerken-Dialog (ersetzt die frühere Monde-Auswahl)
            //   Doppel-Tap  → zurück zum Dashboard, Button wird wieder klein und
            //                 zeigt das aktuelle Datum.
            if(!ref.moved && dt < 700) {
              const now = Date.now();
              const lt = masterLastTapRef.current;
              if(lt.t && (now - lt.t) < DOUBLE_TAP_MS) {
                if(lt.timer) clearTimeout(lt.timer);   // wartenden Einzel-Tap verwerfen
                masterLastTapRef.current = {zone:null, t:0, timer:null};
                try { if(navigator.vibrate) navigator.vibrate(15); } catch(_) {}
                // Doppel-Tap = eine Ebene zurück: offene Overlays schließen, sonst
                // aktuelles Datum. KEIN Tab-Wechsel — man bleibt im aktuellen Tab
                // (Home bleibt Home, Monat bleibt Monat). In JEDEM Fall wird der
                // Button direkt wieder verkleinert.
                if(showMobilePicker)          setShowMobilePicker(false);
                else if(showMonthPickerModal) setShowMonthPickerModal(false);
                else if(showCloudSave)        setShowCloudSave(false);
                else                          jumpToToday();
                if(e.currentTarget) {
                  e.currentTarget.style.transition = "transform 0.2s cubic-bezier(.34,1.4,.64,1)";
                  e.currentTarget.style.transform = "translate(0px, -14px) scale(1)";
                }
                setPlusArretiert(false);
              } else if(showMobilePicker) {
                // Picker („Was möchtest du tun?") offen: Einzel-Tap auf den + =
                // zurück (Picker schließen, Knopf wieder klein).
                setShowMobilePicker(false); setPlusArretiert(false);
                masterLastTapRef.current = {zone:null, t:0, timer:null};
              } else {
                // Einzel-Tap im vergrößerten Zustand: nach kurzer Verzögerung
                // direkt den Vormerken-Dialog öffnen.
                const timer = setTimeout(()=>{
                  masterLastTapRef.current = {zone:null, t:0, timer:null};
                  try { if(navigator.vibrate) navigator.vibrate(10); } catch(_) {}
                  setShowMobileVormerken(true);
                }, DOUBLE_TAP_MS);
                masterLastTapRef.current = {zone:"center", t:now, timer};
              }
            }
          };
          const onPointerCancel = (e) => {
            const ref = masterTouchRef.current;
            if(ref.pointerId === e.pointerId) {
              ref.dragging = false;
              clearHoldTimer(ref);
              if(e.currentTarget) {
                e.currentTarget.style.transition = "transform 0.2s cubic-bezier(.34,1.4,.64,1)";
                e.currentTarget.style.transform = restingTransform;
              }
            }
          };

          // Farb-/Form-Logik zentral (siehe plusBtnColors) — identisch zur
          // Override-Variante, damit der Button überall gleich aussieht.
          const { isFlat, bg, fg } = plusBtnColors(T);

          return (
            <div key={key} style={plusWrapperShell(plusArretiert)}>
              <button
                data-tour="master-plus"
                className="plus-master-btn"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                style={{
                  ...plusBtnShell(SIZE),
                  // Flache Themes: Kontrastrahmen (in Textfarbe) definiert die
                  // Form, da der Schatten per CSS entfernt wird. Sonst dezenter
                  // Rahmen in Nav-Farbe + Schatten wie gehabt.
                  border: isFlat ? `2px solid ${fg}` : `3px solid ${T.surf}`,
                  background: bg,
                  boxShadow: "none",
                  cursor:"pointer",
                  // Ruheposition. Im Drilldown vergrößert & frei ziehbar (s. Gesten);
                  // dort ohne Transition, damit das Ziehen direkt folgt.
                  transform: restingTransform,
                  transition: moodDrillOpen ? "none" : "transform 0.25s cubic-bezier(.34,1.4,.64,1)",
                }}>
                {showMobilePicker ? (
                  <div style={{pointerEvents:"none",textAlign:"center",width:"86%"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <span style={{fontSize:19,fontWeight:800,color:fg,lineHeight:1}}>‹</span>
                      <span style={{fontSize:14,fontWeight:800,color:fg,lineHeight:1}}>zurück</span>
                    </div>
                    <div style={{fontSize:8,fontWeight:700,color:fg,opacity:0.8,letterSpacing:0.3,marginTop:4,whiteSpace:"nowrap"}}>tippen</div>
                  </div>
                ) : (<>
                  {_dayStr && !onMoodScreen && (
                    <div style={{fontSize:24,fontWeight:800,color:fg,lineHeight:1,pointerEvents:"none"}}>
                      {_dayStr}
                    </div>
                  )}
                  <div style={{fontSize:onMoodScreen?20:13,fontWeight:800,color:fg,letterSpacing:-0.3,whiteSpace:"nowrap",pointerEvents:"none"}}>
                    {onMoodScreen ? year : `${monthNames[month]} ${year}`}
                  </div>
                  <div style={{fontSize:8,fontWeight:700,color:fg,opacity:0.75,letterSpacing:0.6,marginTop:2,pointerEvents:"none"}}>
                    WISCHEN
                  </div>
                </>)}
              </button>
            </div>
          );
        };

        // ── TERMINAL NAV ──────────────────────────────────────────────────
        if(T.themeName==="terminal") {
          const G = T.pos; const D = T.txt2;
          const items = [NAV_TABS[0], NAV_TABS[1], "plus", NAV_TABS[2], NAV_TABS[3]];
          return (
            <div className="nav-bottom" style={{
              background:"#0D0D0D",
              borderTop:`1px solid ${G}22`,
              display:"flex", alignItems:"stretch", flexShrink:0, zIndex:10,
              fontFamily:"monospace",
              paddingLeft:0, paddingRight:0}}>
              {items.map((item,idx) => {
                if(item==="plus") return renderMasterButton("master");
                const isActive = activeNavTab===item.id;
                const labels = {home:"HOME",monat:"MONAT",optionen:"OPT.",jahr:"JAHR",mehr:"MEHR"};
                return (
                  <div key={item.id} onClick={()=>onTap(item)}
                    style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",gap:2,cursor:"pointer",padding:"5px 0 4px",
                      background:isActive?"rgba(0,255,65,0.05)":"transparent",
                      WebkitTapHighlightColor:"transparent"}}>
                    {/* aktiver Tab: grüner Strich oben statt Rahmen */}
                    <div style={{height:2,width:24,
                      background:isActive?G:"transparent",
                      marginBottom:3,transition:"background 0.15s"}}/>
                    {Li(item.icon,16,isActive?G:D,isActive?2:1.5)}
                    <span style={{fontSize:8,fontWeight:isActive?700:400,
                      color:isActive?G:D,whiteSpace:"nowrap",letterSpacing:0.5}}>
                      {labels[item.id]||item.label.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }

        // ── BRUTALIST NAV ─────────────────────────────────────────────────
        if(T.themeName==="brutalist") {
          const BK="#000", BY="#FFEC3E";
          // + Button IMMER mittig (3. Position) — identisch zu allen anderen
          // Navs, damit er themeunabhängig an derselben Stelle sitzt.
          const items = [NAV_TABS[0], NAV_TABS[1], "plus", NAV_TABS[2], NAV_TABS[3]];
          return (
            <div className="nav-bottom" style={{
              background:BY,
              borderTop:`3px solid ${BK}`,
              display:"flex", alignItems:"stretch", flexShrink:0, zIndex:10,
              paddingLeft:0, paddingRight:0}}>
              {items.map((item,idx) => {
                if(item==="plus") return renderMasterButton("master");
                const isActive = activeNavTab===item.id;
                return (
                  <div key={item.id} onClick={()=>onTap(item)}
                    style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",gap:2,cursor:"pointer",padding:"4px 2px 3px",
                      background:isActive?BK:BY,
                      WebkitTapHighlightColor:"transparent"}}>
                    {Li(item.icon,17,isActive?BY:BK,isActive?2.5:2)}
                    <span style={{fontSize:8,fontWeight:900,
                      color:isActive?BY:BK,whiteSpace:"nowrap",
                      textTransform:"uppercase",letterSpacing:0.3}}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          );
        }

        const navTab = (t) => {
          const isActive = activeNavTab===t.id;
          // Vergrößerter + Button: die 4 Tabs verlieren ihr Label, werden deutlich
          // größer und füllen die Bottom-Bar gleichmäßig aus.
          if(plusArretiert) {
            return (
              <div key={t.id} onClick={()=>onTap(t)}
                style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",padding:"4px 0",minWidth:0,WebkitTapHighlightColor:"transparent"}}>
                <div style={{width:56,height:48,borderRadius:15,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background:isActive?"rgba(74,159,212,0.18)":"transparent",transition:"all 0.2s"}}>
                  {Li(t.icon,33,isActive?T.blue:T.txt2,isActive?2.6:2)}
                </div>
              </div>
            );
          }
          // Kleiner Zustand: die 4 Tabs sind NUR Anzeige — sie lösen KEINE
          // Navigation aus (kein onClick). Aktiv (tappbar) UND die Symbole voll
          // sichtbar werden sie erst nach Doppel-Tap auf den + Button
          // (plusArretiert). Die Beschriftung bleibt hier jedoch klar sichtbar,
          // nur die Symbole sind blass (Hinweis auf den noch inaktiven Zustand).
          return (
            <div key={t.id}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:2,cursor:"default",padding:"6px 0px 4px",minWidth:0,
                WebkitTapHighlightColor:"transparent"}}>
              <div style={{width:44,height:32,borderRadius:12,opacity:0.35,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:"transparent"}}>
                {Li(t.icon,22,T.txt2,1.5)}
              </div>
              <span style={{fontSize:11,fontWeight:600,
                color:T.txt2,whiteSpace:"nowrap"}}>{t.label}</span>
            </div>
          );
        };

        const items = [NAV_TABS[0], NAV_TABS[1], "plus", NAV_TABS[2], NAV_TABS[3]];

        return (
          <div className="nav-bottom" style={{
            background:T.surf,
            display:"flex", alignItems:"center", flexShrink:0, zIndex:10,
            paddingLeft:8, paddingRight:8,
            // Kinder-Themes: Leiste bekommt rundum Abstand zum Deko-Rahmen
            // (wie die Kategorie-Karten im Content, die schon immer eingerückt
            // waren) statt bündig an den Rand zu stoßen — auch unten, nicht
            // nur seitlich. Andere Themes bleiben unverändert (borderTop wie
            // zuvor, kein Margin/Radius).
            ...(T.frame_border
              ? {margin:"0 10px 10px", borderRadius:16, border:`1px solid ${T.bds}`}
              : {borderTop:`1px solid ${T.bds}`})}}>
            {items.map(item => item==="plus" ? renderMasterButton("master") : navTab(item))}
          </div>
        );
      })()}

      {/* ── MOBILE UI TEST ──
          ErrorBoundary UM Suspense (nicht nur Suspense allein): schlägt einer
          dieser Lazy-Chunks fehl (z. B. Netzwerk-Aussetzer), fängt sie den
          Fehler gezielt HIER ab — ohne sie würde React ohne Boundary den
          KOMPLETTEN Baum unmounten (leerer Bildschirm), obwohl der Rest der
          App (Hero, Screens, Nav) völlig intakt wäre. */}
      <ErrorBoundary name="Mobile-Dialoge">
      <Suspense fallback={<LazyFallback/>}>
      {showMobileVormerken&&<MobileVormerkenModal onClose={()=>{setShowMobileVormerken(false);setPlusArretiert(false);}}
        onBack={()=>{setShowMobileVormerken(false);setPlusArretiert(true);}}/>}
      {showMobileWiederkehrend&&<MobileVormerkenModal
        initialRecurring={true} initialFinanz={showMobileWiederkehrendTyp==="finanzierung"}
        onClose={()=>{setShowMobileWiederkehrend(false);setPlusArretiert(false);}}
        onBack={()=>{setShowMobileWiederkehrend(false);reopenMobilePicker("main");}}/>}
      {showMobileBudget&&<MobileBudgetModal onClose={()=>{setShowMobileBudget(false);setPlusArretiert(false);}}/>}
      {showMobileKategorien&&<MobileKategorienModal
        onClose={()=>{setShowMobileKategorien(false);setPlusArretiert(false);}}
        onBack={()=>{setShowMobileKategorien(false);setPlusArretiert(true);}}
        onKonten={()=>{setShowMobileKategorien(false);setMainTab("struktur");setActiveStructurTab("konten");}}
        onKategorienErweitert={()=>{setShowMobileKategorien(false);setMainTab("struktur");setActiveStructurTab("kategorien");}}/>}
      {showMobilePicker&&<MobileActionPicker
        onClose={()=>{setShowMobilePicker(false);setPlusArretiert(false);}}
        onSelect={(action)=>{
          setShowMobilePicker(false);

          if(action==="addTx") setShowMobileVormerken(true);
          else if(action==="desktop") setModal("addTx");
          else if(action==="vormerken") setShowMobileVormerken(true);
          else if(action==="matching") setShowMatching(true);
          else if(action==="csv") setShowCsv(true);
          else if(action==="bankwizard") setShowBankWizard(true);
          else if(action==="datenmgr") setShowDataMgr(true);
          else if(action==="cloudsetup") setShowCloudSetup(true);
          else if(action==="wiederkehrend") { setShowMobileWiederkehrendTyp("wiederkehrend"); setShowMobileWiederkehrend(true); }
          else if(action==="finanzierung")  { setShowMobileWiederkehrendTyp("finanzierung");  setShowMobileWiederkehrend(true); }
          else if(action==="kategorien"||action==="budget") setShowMobileKategorien(true);
          else if(action==="einstellungen") { setMainTab("struktur"); setActiveStructurTab("einstellungen"); }
        }}
        onSwitchToMonth={()=>{ setShowMobilePicker(false); setShowMonthPickerModal(true); }}
      />}

      {/* ── Monatswähler-Modal (Master-Button Slide-up) ── */}
      {showMonthPickerModal && (
        <MonthPickerModal
          year={year} month={month}
          setYear={setYear} setMonth={setMonth}
          plusArretiert={plusArretiert}
          onClose={()=>{ setShowMonthPickerModal(false); setPlusArretiert(false); }}
          onSwitchToMore={()=>{ setShowMonthPickerModal(false); setPlusArretiert(true); }}/>
      )}

      {/* ── Cloud-Speichern-Modal (Master-Button Wisch ↓) ── */}
      {showCloudSave && <CloudSaveModal onClose={()=>{ setShowCloudSave(false); setPlusArretiert(false); }}/>}

      {/* ── MODALS ── */}
      {modal==="addTx"&&<AddTxModal/>}
      {showCsv&&<CsvImportScreen onClose={()=>{setShowCsv(false);setPlusArretiert(false);}}
        onBack={()=>{setShowCsv(false);setPlusArretiert(true);}}
        csvRules={csvRules} setCsvRules={setCsvRules} mobileMode={mobileMode}/>}
      {showBankWizard&&<EnableBankingWizard onClose={()=>{setShowBankWizard(false);setPlusArretiert(false);}}
        onBack={()=>{setShowBankWizard(false);setPlusArretiert(true);}}/>}
      {showCloudSetup&&<CloudSetupWizard onClose={()=>{setShowCloudSetup(false);setPlusArretiert(false);}}
        onBack={()=>{setShowCloudSetup(false);setPlusArretiert(true);}}/>}
      {showFuelAnalysis&&<FuelAnalysisScreen mobileMode={mobileMode}
        onClose={()=>{setShowFuelAnalysis(false);setPlusArretiert(false);}}
        onBack={()=>{setShowFuelAnalysis(false);setPlusArretiert(true);}}/>}
      {showMatching&&<MatchingScreen onClose={()=>{setShowMatching(false);setPlusArretiert(false);}}
        onBack={()=>{setShowMatching(false);reopenMobilePicker("main");}}/>}
      {showVormHub&&<VormerkungHub onClose={()=>{setShowVormHub(false);setEditVormTx(null);setPlusArretiert(false);}} editVorm={editVormTx} mobileMode={mobileMode}/>}
      {showRecurring&&<RecurringDetectionScreen onClose={()=>{setShowRecurring(false);setPlusArretiert(false);}}/>}
      {showKategorisieren&&<RecurringDetectionScreen initialTab="kategorisieren" onClose={()=>{setShowKategorisieren(false);setPlusArretiert(false);}}/>}
      </Suspense>
      </ErrorBoundary>
      {showSettings&&(
        <div onClick={()=>setShowSettings(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surf,borderRadius:20,padding:"20px",width:"100%",maxWidth:400,
              border:`1px solid ${T.bds}`,boxShadow:"0 20px 60px rgba(0,0,0,0.8)",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{color:T.txt,fontSize:16,fontWeight:700}}>{Li("settings",16,T.txt)} Einstellungen</div>
              <button onClick={()=>setShowSettings(false)}
                style={{background:"rgba(255,255,255,0.07)",border:"none",color:"#888",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12}}>✕</button>
            </div>
            <SettingsPanel/>
            <PBtn onClick={()=>setShowSettings(false)}>Schließen</PBtn>
          </div>
        </div>
      )}
      <ErrorBoundary name="Daten-Manager">
      <Suspense fallback={<LazyFallback/>}>
      {showDataMgr&&<DataManagerDialog onClose={()=>{setShowDataMgr(false);setPlusArretiert(false);}} mobileMode={mobileMode}
        onBack={()=>{setShowDataMgr(false);setPlusArretiert(true);}}/>}
      {exportDialog&&(
        <ExportDialog title={exportDialog.title} defaultName={exportDialog.defaultName}
          data={exportDialog.data} onClose={()=>setExportDialog(null)} onDone={()=>setExportDialog(null)}/>
      )}
      </Suspense>
      </ErrorBoundary>
      {exportModal&&(
        <div onClick={()=>setExportModal(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surf,borderRadius:20,padding:"20px 18px 22px",width:"100%",maxWidth:480,
              border:`1px solid ${T.bds}`,boxShadow:"0 20px 60px rgba(0,0,0,0.8)",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{color:T.blue,fontSize:15,fontWeight:700}}>{Li("file-text",15,T.blue)} {exportModal.title}</div>
              <button onClick={()=>setExportModal(null)}
                style={{background:"rgba(255,255,255,0.07)",border:"none",color:"#888",borderRadius:8,width:28,height:28,cursor:"pointer"}}>{Li("x",13)}</button>
            </div>
            <textarea readOnly value={exportModal.json}
              style={{flex:1,minHeight:200,background:"rgba(0,0,0,0.4)",border:`1px solid ${T.bds}`,
                borderRadius:11,padding:"10px 12px",color:"#A8D8F0",fontSize:11,fontFamily:"monospace",resize:"none",outline:"none"}}
              onFocus={e=>e.target.select()}/>
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>navigator.clipboard.writeText(exportModal.json)}
                style={{flex:1,padding:"12px",borderRadius:11,border:"none",background:T.blue,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                {Li("copy",13,"#fff")} Kopieren
              </button>
              <button onClick={()=>setExportModal(null)}
                style={{flex:1,padding:"12px",borderRadius:11,border:`1px solid ${T.bds}`,background:"transparent",color:T.txt2,fontSize:14,cursor:"pointer"}}>
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  </AppCtx.Provider>
  );
}

// ── Master-Button-Override-Slot ────────────────────────────────────────
// Belegt exakt denselben Platz im Bottom-Nav-Flex wie der reguläre
// Gemeinsame Farb-/Form-Logik des + Buttons — von renderMasterButton UND
// MasterOverrideSlot genutzt, damit beide IMMER identisch aussehen (früher
// dupliziert → Override-Variante war abweichend transparent/unlesbar).
//   • Fläche = Akzentfarbe der Bottom-Bar-Symbole (Terminal=pos-Grün, sonst T.blue)
//   • dark/darkhell/hellgrau behalten Lime
//   • Textfarbe per Kontrast hell/dunkel
//   • Flache Themes (clean/swiss/terminal/brutalist): Kontrastrahmen statt
//     Schatten (CSS entfernt dort box-shadow)
function plusBtnColors(T) {
  const isTerminal  = T.themeName==="terminal";
  const isBrutalist = T.themeName==="brutalist";
  const useLime = T.themeName==="dark" || T.themeName==="darkhell" || T.themeName==="hellgrau";
  const isFlat  = isTerminal || isBrutalist || T.themeName==="clean" || T.themeName==="swiss";
  const accent  = isTerminal ? T.pos : T.blue;
  const bg = useLime ? "linear-gradient(135deg,#9CC800,#AADD00)"
           : isBrutalist ? "#000"
           : accent;
  const fg = useLime ? "#1A1E00"
           : isBrutalist ? "#FFEC3E"
           : readableOn(accent, accent);
  return { isFlat, bg, fg, accent };
}

// Gemeinsame Form-/Größen-Eigenschaften des + Buttons — von renderMasterButton
// UND MasterOverrideSlot geteilt, analog zu plusBtnColors oben. Grund: genau
// diese beiden Stellen sind schon einmal bei den Farben auseinandergedriftet
// (siehe Kommentar zu plusBtnColors) und zuletzt erneut bei Box-Maßen/
// Transition/Padding (Override-Variante wurde zum Ei verzerrt). Damit das
// architektonisch nicht mehr passieren kann, kommen Wrapper- und Button-Shell
// jetzt aus genau einer Quelle statt an zwei Stellen von Hand synchron
// gehalten zu werden.
function plusWrapperShell(plusArretiert) {
  return {
    flex:"0 0 auto", display:"flex", alignItems:"center", justifyContent:"center",
    overflow:"visible", WebkitTapHighlightColor:"transparent", position:"relative",
    transition:"width 0.25s",
    // Vergrößert (schwebt nach oben): Slot auf 0 → die 4 Tabs füllen die Bar.
    width: plusArretiert ? 0 : 90,
  };
}
function plusBtnShell(SIZE) {
  return {
    width:SIZE, height:SIZE, borderRadius:"50%", flexShrink:0,
    // min/max zusätzlich hart auf SIZE verriegelt + overflow:hidden:
    // Absicherung gegen die automatische Flex-Item-Mindestgröße, die
    // mehrzeiliger Label-Inhalt in manchen Browsern erzwingen kann.
    minWidth:SIZE, minHeight:SIZE, maxWidth:SIZE, maxHeight:SIZE, overflow:"hidden",
    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    position:"relative",
    touchAction:"none", userSelect:"none",
    WebkitTapHighlightColor:"transparent",
    padding:0, fontFamily:"inherit", lineHeight:1,
  };
}

// „Mai 2026 / WISCHEN"-Knopf (SIZE/Transform/Wrapper identisch). Während
// ein Mobile-Wizard aktiv ist, ersetzt diese Variante den Inhalt:
//   Tipp             → override.onConfirm()
//   Wisch ←          → override.onBack()    (no-op falls onBack === null)
//   Wisch ↓          → override.onDismiss()
//   Halten + Ziehen  → Knopf frei nach oben UND unten verschieben (dragY,
//                      ±DRAG_RANGE_MAX) — erst nach HOLD_MS Ruhehalten, damit
//                      ein normaler (schneller) Wisch weiterhin sofort
//                      zurück/schließen auslöst, analog zum frei
//                      verschiebbaren drillBtnY im Trend-Drilldown. Bleibt
//                      stehen, bis erneut per Halten gezogen wird (kein
//                      Auto-Reset), und löst beim Loslassen keine der drei
//                      obigen Aktionen aus.
// Der Wrapper bekommt zIndex 500, damit der Knopf über dem Modal
// (zIndex 300) sichtbar UND klickbar bleibt.
function MasterOverrideSlot({ override, SIZE, T, plusArretiert }) {
  const DRAG_THRESHOLD = 30;
  const MOVE_TOLERANCE = 14;
  const VISUAL_LIMIT = 18;
  const DOUBLE_TAP_MS = 350;
  // Langes Halten (HOLD_MS) schaltet in einen freien Vertikal-Verschiebe-Modus
  // um — dadurch bleibt die Zeit statt der Richtung das Unterscheidungsmerkmal:
  // ein normaler (kurzer) Wisch löst weiterhin sofort Zurück/Schließen aus,
  // erst wer den Finger länger ruhig hält und DANN bewegt, verschiebt den
  // Knopf frei nach oben UND wieder zurück nach unten (analog zum frei
  // verschiebbaren drillBtnY im Trend-Drilldown). Löst der Finger, greift
  // wieder die normale Bedienung (Tipp/Wisch) — die Position bleibt aber
  // stehen, bis erneut per Halten gezogen wird (kein Auto-Reset).
  const HOLD_MS = 450;
  const DRAG_RANGE_MAX = 400; // wie weit maximal von der Standardposition weg
  const [dragY, setDragY] = React.useState(0); // 0 = Standardposition, negativ = hochgezogen
  const tapRef = React.useRef({ t: 0 });
  // Ausstehenden Einzel-Tipp-Timer (confirmOnTapDismissOnDouble) beim Unmount stoppen
  React.useEffect(() => () => { if(tapRef.current.timer) clearTimeout(tapRef.current.timer); }, []);
  const restY = (plusArretiert ? -94 : -14) + dragY;
  const baseScale = plusArretiert ? 1.5 : 1;
  const restingTransform = `translate(0px, ${restY}px) scale(${baseScale})`;
  const dragScale = baseScale * 1.06;

  const ref = React.useRef({x:0,y:0,dx:0,dy:0,axisLocked:null,dragging:false,
    pointerId:null,moved:false});
  const btnRef = React.useRef(null);

  const settle = () => {
    if(btnRef.current) {
      btnRef.current.style.transition = "transform 0.2s cubic-bezier(.34,1.4,.64,1)";
      btnRef.current.style.transform  = restingTransform;
    }
  };
  const onDown = (e) => {
    if(e.button !== undefined && e.button !== 0) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch(_) {}
    ref.current = {x:e.clientX,y:e.clientY,dx:0,dy:0,axisLocked:null,
      dragging:true,pointerId:e.pointerId,moved:false,holdEngaged:false,holdTimer:null};
    // Hold-Timer: feuert nur, wenn der Finger bis dahin (praktisch) ruhig
    // aufliegt — eine schnelle Wisch-Geste bricht ihn in onMove sofort ab,
    // bevor er auslösen kann (siehe dort).
    ref.current.holdTimer = setTimeout(() => {
      const rr = ref.current;
      rr.holdTimer = null;
      if(!rr.dragging || rr.pointerId !== e.pointerId) return;
      rr.holdEngaged = true;
      try { if(navigator.vibrate) navigator.vibrate(12); } catch(_) {}
    }, HOLD_MS);
  };
  const onMove = (e) => {
    const r = ref.current;
    if(!r.dragging || r.pointerId !== e.pointerId) return;
    const dx = e.clientX - r.x, dy = e.clientY - r.y;
    r.dx = dx; r.dy = dy;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if(!r.moved && (adx > MOVE_TOLERANCE || ady > MOVE_TOLERANCE)) {
      r.moved = true;
      // Schon spürbar bewegt, bevor die Hold-Schwelle ablief → normale
      // (schnelle) Wisch-Geste, kein Verschiebe-Modus.
      if(r.holdTimer) { clearTimeout(r.holdTimer); r.holdTimer = null; }
    }
    // ── Hold-Verschiebe-Modus: frei nach oben UND unten, unabhängig von den
    //    normalen Wisch-Gesten (die greifen erst wieder nach dem Loslassen,
    //    falls dieser Modus NICHT aktiv war). ──
    if(r.holdEngaged) {
      const proposed = Math.max(-DRAG_RANGE_MAX, Math.min(0, dragY + dy));
      const vy = proposed - dragY;
      if(btnRef.current) {
        btnRef.current.style.transition = "none";
        btnRef.current.style.transform  = `translate(0px, ${vy + restY}px) scale(${dragScale})`;
      }
      return;
    }
    if(!r.axisLocked && (adx > MOVE_TOLERANCE || ady > MOVE_TOLERANCE)) {
      r.axisLocked = adx >= ady ? "x" : "y";
    }
    // Visuelles Folgen: nur in „erlaubte" Richtungen (← bzw. ↓) frei wandern,
    // sonst gedämpft — damit der Nutzer fühlt, was geht.
    const clamp = (v,lim)=>Math.max(-lim,Math.min(lim,v));
    let vx = 0, vy = 0;
    if(r.axisLocked === "x") {
      const allowBack = !!override.onBack;
      vx = dx < 0 ? clamp(dx, allowBack ? VISUAL_LIMIT : 6) : clamp(dx, 6);
    } else if(r.axisLocked === "y") {
      vy = dy > 0 ? clamp(dy, VISUAL_LIMIT) : clamp(dy, 6); // bestehende Wisch-runter-Vorschau (schließen)
    }
    if(btnRef.current) {
      btnRef.current.style.transition = "none";
      btnRef.current.style.transform  = `translate(${vx}px, ${vy + restY}px) scale(${dragScale})`;
    }
  };
  const onUp = (e) => {
    const r = ref.current;
    if(!r.dragging || r.pointerId !== e.pointerId) return;
    r.dragging = false;
    if(r.holdTimer) { clearTimeout(r.holdTimer); r.holdTimer = null; }
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(_) {}
    const {dx,dy,axisLocked,moved,holdEngaged} = r;
    if(holdEngaged) {
      // Verschiebe-Geste — löst KEINE Tipp-/Wisch-Aktion aus. Position bleibt
      // stehen, bis erneut per Halten+Ziehen verschoben wird.
      const newDragY = Math.max(-DRAG_RANGE_MAX, Math.min(0, dragY + dy));
      setDragY(newDragY);
      if(btnRef.current) {
        const newRestY = (plusArretiert ? -94 : -14) + newDragY;
        btnRef.current.style.transition = "transform 0.2s cubic-bezier(.34,1.4,.64,1)";
        btnRef.current.style.transform  = `translate(0px, ${newRestY}px) scale(${baseScale})`;
      }
      return;
    }
    settle();
    if(axisLocked === "x" && Math.abs(dx) > DRAG_THRESHOLD) {
      if(tapRef.current.timer) { clearTimeout(tapRef.current.timer); tapRef.current = { t:0 }; }
      if(dx < 0 && override.onBack) override.onBack();
      return;
    }
    if(axisLocked === "y" && dy > 0 && Math.abs(dy) > DRAG_THRESHOLD) {
      if(tapRef.current.timer) { clearTimeout(tapRef.current.timer); tapRef.current = { t:0 }; }
      override.onDismiss();
      return;
    }
    if(!moved && !override.disabled) {
      if(override.confirmOnTapDismissOnDouble) {
        // Einzel-Tipp → onConfirm (kurz verzögert, um Doppel-Tipp zu erkennen),
        // Doppel-Tipp → onDismiss. Ermöglicht „weiter“ UND „schließen“ am selben Knopf.
        const DT = 260;
        const now = Date.now();
        if(tapRef.current.t && (now - tapRef.current.t) < DT) {
          if(tapRef.current.timer) clearTimeout(tapRef.current.timer);
          tapRef.current = { t: 0 };
          try { if(navigator.vibrate) navigator.vibrate(15); } catch(_) {}
          override.onDismiss();
        } else {
          if(tapRef.current.timer) clearTimeout(tapRef.current.timer);
          const timer = setTimeout(()=>{
            tapRef.current = { t: 0 };
            try { if(navigator.vibrate) navigator.vibrate(10); } catch(_) {}
            override.onConfirm();
          }, DT);
          tapRef.current = { t: now, timer };
        }
      } else if(override.dismissOnDoubleTap) {
        // Reiner Navigations-Override (z.B. Einstellungen): Doppel-Tap bricht ab,
        // Einzel-Tap macht nichts (kein Confirm, daher keine Latenz nötig).
        const now = Date.now();
        if(tapRef.current.t && (now - tapRef.current.t) < DOUBLE_TAP_MS) {
          tapRef.current = { t: 0 };
          try { if(navigator.vibrate) navigator.vibrate(15); } catch(_) {}
          // Button schon vor dem (evtl. teuren) Tab-Wechsel sichtbar verkleinern.
          if(btnRef.current) {
            btnRef.current.style.transition = "transform 0.2s cubic-bezier(.34,1.4,.64,1)";
            btnRef.current.style.transform  = "translate(0px, -14px) scale(1)";
          }
          override.onDismiss();
        } else {
          tapRef.current = { t: now };
        }
      } else {
        try { if(navigator.vibrate) navigator.vibrate(10); } catch(_) {}
        override.onConfirm();
      }
    }
  };
  const onCancel = () => {
    if(ref.current.holdTimer) { clearTimeout(ref.current.holdTimer); ref.current.holdTimer = null; }
    ref.current.dragging = false;
    settle();
  };

  // Label-Aufteilung für mehrzeilige Darstellung im runden Knopf.
  // Jedes Wort kommt auf eine eigene Zeile (max 4). „→" wird an die
  // vorherige Zeile angehängt. Font-Size schrumpft, je länger das
  // längste Segment, damit nichts seitlich überläuft.
  const _pbc = plusBtnColors(T);
  const label = override.label || "OK";
  let lines;
  if(/→/.test(label)) {
    const m = label.split("→");
    lines = [(m[0] || "").trim() + " →", (m[1] || "").trim()].filter(Boolean);
  } else {
    lines = label.split(/\s+/).filter(Boolean);
  }
  if(lines.length > 4) lines = [lines.slice(0,3).join(" "), lines.slice(3).join(" ")];
  const longest = Math.max(...lines.map(s=>s.length));
  const fontSize = longest > 13 ? 8 : longest > 10 ? 9 : longest > 8 ? 10 : longest > 6 ? 12 : 13;

  return (
    <div style={{...plusWrapperShell(plusArretiert), zIndex:500}}>
      <button
        ref={btnRef}
        className="plus-master-btn"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        disabled={override.disabled}
        style={{
          ...plusBtnShell(SIZE),
          // identische Farb-/Form-Logik wie der reguläre + Button
          border: _pbc.isFlat ? `2px solid ${override.disabled ? T.txt2 : _pbc.fg}` : `3px solid ${T.surf}`,
          background: override.disabled ? (T.disabled || "rgba(128,128,128,0.30)") : _pbc.bg,
          color: override.disabled ? T.txt2 : _pbc.fg,
          boxShadow: "none",
          cursor:override.disabled?"default":"pointer",
          transform: restingTransform,
          transition:"transform 0.25s cubic-bezier(.34,1.4,.64,1)",
          opacity: override.disabled ? 0.55 : 1,
        }}>
        {/* Richtungs-Hinweise: ‹ = Wisch links (zurück), ⌄ = Wisch runter
            (schließen). Nur zeigen, wenn die jeweilige Aktion belegt ist. */}
        {override.onBack && (
          <div style={{position:"absolute",left:1,top:"50%",transform:"translateY(-50%)",
            opacity:0.6,pointerEvents:"none",display:"flex"}}>
            {Li("chevron-left",13,override.disabled?T.txt2:_pbc.fg)}
          </div>
        )}
        {override.onDismiss && (
          <div style={{position:"absolute",bottom:-1,left:"50%",transform:"translateX(-50%)",
            opacity:0.6,pointerEvents:"none",display:"flex"}}>
            {Li("chevron-down",13,override.disabled?T.txt2:_pbc.fg)}
          </div>
        )}
        {/* Hinweis: Knopf lässt sich per Halten+Ziehen frei verschieben, falls
            er verdeckten Inhalt überlappt (s. HOLD_MS/DRAG_RANGE_MAX oben). */}
        <div style={{position:"absolute",top:1,left:"50%",transform:"translateX(-50%)",
          opacity:0.6,pointerEvents:"none",display:"flex"}}>
          {Li("chevron-up",13,override.disabled?T.txt2:_pbc.fg)}
        </div>
        {lines.map((ln,i)=>(
          <div key={i} style={{fontSize,fontWeight:800,letterSpacing:-0.3,
            whiteSpace:"nowrap",pointerEvents:"none",textAlign:"center",
            marginTop: i===0 ? 0 : 1}}>
            {ln}
          </div>
        ))}
      </button>
    </div>
  );
}
