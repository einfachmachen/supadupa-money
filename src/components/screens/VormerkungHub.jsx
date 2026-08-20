// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useEffect, useMemo, useState } from "react";
import { VormHubSecToggle } from "../molecules/VormHubSecToggle.jsx";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { VormHubSegBtn } from "../molecules/VormHubSegBtn.jsx";
import { AccountChips } from "../molecules/AccountChips.jsx";
import { MobileNewAccOverlay } from "../molecules/MobileNewAccOverlay.jsx";
import { MobileCatStep } from "../molecules/MobileCatStep.jsx";
import { hasBankOrigin } from "../../utils/vormMatch.js";
import { VormVerknuepfenPanel } from "../organisms/VormVerknuepfenPanel.jsx";
import { RecurringDetectionScreen } from "./RecurringDetectionScreen.jsx";
import { TagInput } from "../atoms/TagInput.jsx";
import { getAllTags } from "../../utils/search.js";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T, isLightTheme } from "../../theme/activeTheme.js";
import { INP, UNTEN_FREI } from "../../theme/palette.js";
import { MONTHS_F } from "../../utils/constants.js";
import { isoAddMonths, nextBankWorkday, calcRecurringCount } from "../../utils/date.js";
import { fmt, pn, uid, NUM_FONT } from "../../utils/format.js";
import { betrag } from "../../utils/betrag.jsx";
import { Li } from "../../utils/icons.jsx";
import { isFuelSelection, checkOdometerPlausibility } from "../../utils/fuel.js";
import { recordDeletedTxs } from "../../utils/txTombstones.js";

function VormerkungHub({onClose, editVorm: _editVormProp=null}) {
  const { cats, groups, txs, setTxs, accounts, vehicles, setVehicles, year, month, getCat, getSub, setMasterOverride,
    frageBestaetigung } = useContext(AppCtx);
  // „+"-Button übernimmt: Tipp = Fertig/Schließen, Wisch ↓ = schließen.
  useEffect(() => {
    setMasterOverride?.({ label:"Fertig",
      onConfirm:()=>onClose?.(), onBack:()=>onClose?.(), onDismiss:()=>onClose?.() });
    return () => setMasterOverride?.(null);
  }, []);
  const today = new Date().toISOString().slice(0,10);
  const pad = n => String(n).padStart(2,"0");
  const MONTHS_G = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  // Wenn eine Einnahme-Buchung mit _linkedTo geöffnet wird (= Counterpart einer Umbuchung),
  // stattdessen die zugehörige Ausgabe-Parent als editVorm verwenden. So wirkt jede Änderung
  // auf BEIDE Seiten der Umbuchung — Range-/From-Edits werden automatisch synchronisiert.
  const editVorm = React.useMemo(() => {
    if(!_editVormProp || _editVormProp._prefill) return _editVormProp;
    if(_editVormProp._linkedTo) {
      const parent = txs.find(t => t.id === _editVormProp._linkedTo && t.pending);
      if(parent) return parent;
    }
    return _editVormProp;
  }, [_editVormProp, txs]);

  // Bearbeiten-Modus: Typ aus editVorm erkennen
  const isEdit = !!editVorm && !editVorm._prefill;
  const initTyp = editVorm
    ? (editVorm._seriesTyp==="finanzierung" ? "finanzierung"
       : editVorm._seriesId ? "wiederkehrend" : "einmalig")
    : "einmalig";

  // Sektionen — im Edit-Modus direkt Neu-Erstellen aufklappen
  const [secErkennen,   setSecErkennen]   = useState(false);
  const [secKategorien, setSecKategorien] = useState(false);

  // Typ
  const [typ, setTyp] = useState(initTyp);

  // Scope für Bearbeiten: single | range | from | all
  const [editScope, setEditScope] = useState("single");
  // Hilfsfunktion: Datum der Buchung im Monat y/m dieser Serie
  const _txDateForMonth = (y, m) => {
    const pad2 = n=>String(n).padStart(2,"0");
    const ms = `${y}-${pad2(m+1)}`;
    const found = txs.find(t=>t._seriesId===editVorm?._seriesId && !t._exSeriesId && t.date.startsWith(ms));
    if(found) return found.date;
    // Fallback: Tag aus editVorm, im Monat y/m
    const origDay = editVorm?.date ? parseInt(editVorm.date.split("-")[2]) : 1;
    const maxD = new Date(y, m+1, 0).getDate();
    return `${y}-${pad2(m+1)}-${pad2(Math.min(origDay,maxD))}`;
  };
  const [scopeFrom, setScopeFrom] = useState(()=>_txDateForMonth(year, month));
  const [scopeTo,   setScopeTo]   = useState(()=>_txDateForMonth(year, month));
  const [fromDateManual, setFromDateManual] = useState(false);
  const [lastOfMonth, setLastOfMonth] = useState(editVorm?._lastOfMonth||false);

  // Monat/Jahr wechselt → scopeFrom/scopeTo nachziehen (nur wenn nicht manuell)
  React.useEffect(()=>{
    if(fromDateManual) return;
    const d = _txDateForMonth(year, month);
    setScopeFrom(d);
    if(editScope==="single") setScopeTo(d);
    // Im Bearbeiten-Modus: Startdatum auf die Buchung im gewählten Monat setzen
    if(isEdit && editVorm?._seriesId) setStartDate(d);
  }, [month, year]);

  // Formular — mit Vorbelegung aus editVorm
  const initSplit = editVorm ? (editVorm.splits||[])[0] : null;
  const [desc,      setDesc]      = useState(editVorm?.desc||"");
  const [amount,    setAmount]    = useState(editVorm ? String(editVorm.totalAmount).replace(".",",") : "");
  const [csvType,   setCsvType]   = useState(editVorm?._csvType||"expense");
  const [catId,     setCatId]     = useState(initSplit?.catId||"");
  const [subId,     setSubId]     = useState(initSplit?.subId||"");
  const [accountId, setAccountId] = useState(editVorm?.accountId||accounts[0]?.id||"");
  // Umbuchung: Zielkonto + Zielkategorie (für Transfer auf eigenes Konto)
  // Bei Edit: aus existierendem verknüpften Zugang laden — auch innerhalb der Serie suchen
  const _existingLinkInit = (() => {
    if(!editVorm?.id) return null;
    // 1. Direkter Link auf diese Buchung?
    let linked = txs.find(t => t._linkedTo === editVorm.id && t.pending);
    if(linked) return linked;
    // 2. Sonst: Wenn Serie, suchen ob irgendeine Rate ein Linked hat → Serien-Eintrag
    if(editVorm._seriesId) {
      const seriesIds = new Set(txs.filter(t=>t._seriesId===editVorm._seriesId).map(t=>t.id));
      linked = txs.find(t => t.pending && t._linkedTo && seriesIds.has(t._linkedTo));
    }
    return linked || null;
  })();
  const _existingLinkSplit = (_existingLinkInit?.splits||[])[0];
  const [transferToAcc, setTransferToAcc] = useState(_existingLinkInit?.accountId || "");
  // Umbuchungs-Modus als eigener Zustand: ein frisch angetippter
  // "Umbuchung"-Knopf hat noch kein Zielkonto, ist aber schon aktiv.
  const [umbuchung, setUmbuchung] = useState(!!(_existingLinkInit?.accountId));
  // Flexibler Topf: beim Bearbeiten den vorhandenen Stand uebernehmen, damit
  // ein Speichern ihn nicht stillschweigend abschaltet.
  const [potOn, setPotOn] = useState(!!editVorm?._potSubId);
  const [showNewAcc, setShowNewAcc] = useState(false);
  // Offene Kategorie-Auswahl: "quelle" | "quelleSub" | "ziel" | "zielSub".
  // Die "…Sub"-Varianten steigen direkt beim Unterschritt ein (s. unten).
  const [katPicker, setKatPicker] = useState(null);
  // Beschreibung standardmaessig einzeilig; per Pfeil aufklappbar, um lange
  // abgerufene Texte ganz zu lesen.
  // Beschreibung: drei Zustaende. Zugeklappt zeigt sie eine Zeile, aufgeklappt
  // den ganzen Text, und erst der naechste Tipp macht sie zum Eingabefeld.
  // Solange getippt wird, verstellt ein Tipp nur den Cursor — abgeschlossen
  // wird ueber das Haekchen im Feld. Ohne diese Trennung klappte das Feld beim
  // Cursorsetzen staendig um (Nutzer-Hinweis).
  const [descOffen, setDescOffen] = useState(false);
  const [descEdit,  setDescEdit]  = useState(false);
  // Abgerufene Vormerkung: gesperrt wird genau das, was die BANK gemeldet
  // hat — Konto, Betrag, Datum und Beschreibung. Das sind Belege, keine
  // Eingaben; sie zu aendern wuerde die Buchung von dem entfernen, was auf dem
  // Kontoauszug steht. Alles andere ist die eigene Einordnung und bleibt frei:
  // Typ, Buchungsart, Kategorien, Notiz und Tags.
  const bankGesperrt = isEdit && hasBankOrigin(editVorm);
  // Sichtbar, aber nicht bedienbar.
  const SPERRE = bankGesperrt ? {pointerEvents:"none", opacity:0.55} : undefined;
  const [transferToCat, setTransferToCat] = useState(_existingLinkSplit?.catId || "");
  const [transferToSub, setTransferToSub] = useState(_existingLinkSplit?.subId || "");
  const [note,      setNote]      = useState(editVorm?.note||"");
  const [tags,      setTags]      = useState(editVorm?.tags||[]);
  // Tank-Erfassung (siehe TODO.md/Design-Guide §13): nur bei einmaliger Ausgabe
  // mit Kategorie "Tanken" — Vorbelegung aus editVorm für den Bearbeiten-Modus.
  const [fuelVehicleId, setFuelVehicleId] = useState(editVorm?._fuelVehicleId||"");
  const [fuelLiters,    setFuelLiters]    = useState(editVorm?._fuelLiters!=null ? String(editVorm._fuelLiters).replace(".",",") : "");
  const [fuelPricePerL, setFuelPricePerL] = useState(editVorm?._fuelPricePerL!=null ? String(editVorm._fuelPricePerL).replace(".",",") : "");
  const [odometer,      setOdometer]      = useState(editVorm?._odometer!=null ? String(editVorm._odometer) : "");
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [editingVehicleId, setEditingVehicleId] = useState(null); // null=neu, sonst Fahrzeug-id
  const [startDate, setStartDate] = useState(()=>{
    if(editVorm?._seriesId) {
      // Für Serien: erste Buchung der Serie als Startdatum
      const firstTx = txs.filter(t=>t._seriesId===editVorm._seriesId&&!t._exSeriesId)
        .sort((a,b)=>a.date.localeCompare(b.date))[0];
      if(firstTx) return firstTx.date;
    }
    if(editVorm?.date) return editVorm.date;
    // Neu-Anlegen: Buchung am NÄCHSTEN Banktag (eine heute ausgelöste Buchung
    // bucht frühestens am nächsten Geschäftstag; nicht der angezeigte Monat).
    // Bei Umbuchungen Giro→Tagesgeld bucht die Bank sofort → heute (siehe unten).
    return nextBankWorkday(today);
  });
  const [endDate,   setEndDate]   = useState("");
  // "verursacht am": beim Neuanlegen heute, beim Bearbeiten der gespeicherte Wert.
  const [valueDate, setValueDate] = useState(editVorm ? (editVorm.valueDate||"") : today);
  // Verhindert, dass eine manuelle Datumseingabe beim Typ-/Umbuchungs-Wechsel
  // überschrieben wird.
  const [startDateManual, setStartDateManual] = useState(false);
  const [interval,  setInterval_] = useState(()=>{
    if(!editVorm) return 1;
    // Aus repeatMonths wenn gesetzt
    if(editVorm.repeatMonths && editVorm.repeatMonths > 1) return editVorm.repeatMonths;
    // Sonst aus den tatsächlichen Abständen der Serie berechnen
    // (wird unten via seriesInterval überschrieben sobald txs verfügbar)
    return editVorm.repeatMonths||1;
  });
  const [count, setCount] = useState(()=>{
    if(!editVorm?._seriesId) return "";
    // Finanzierung: Ratenanzahl vorausfüllen
    if(editVorm._seriesTyp==="finanzierung") {
      const n = txs.filter(t=>t._seriesId===editVorm._seriesId&&!t._isException).length;
      return n>0 ? String(n) : "";
    }
    return "";
  });
  const [customFirstLast, setCustomFirstLast] = useState(()=>{
    // Auto-aktivieren wenn erste/letzte Buchung abweicht — wird nach mount per Effect gesetzt
    return false;
  });
  const [firstAmount, setFirstAmount] = useState("");
  const [lastAmount,  setLastAmount]  = useState("");
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  // ── Eingebettete Ausnahme-Serie ───────────────────────────────────────
  const [showExForm,    setShowExForm]    = useState(false);
  const [exAmount,      setExAmount]      = useState("");
  const [exInterval,    setExInterval]    = useState(12); // jährlich
  const [exStartDate,   setExStartDate]   = useState("");

  // Wenn Monat/Jahr wechselt und Ausnahme-Formular offen: Startdatum nachziehen
  React.useEffect(()=>{
    if(!showExForm || !editVorm?._seriesId || exEditId) return;
    const pad2 = n=>String(n).padStart(2,"0");
    const monthStr = `${year}-${pad2(month+1)}`;
    const found = txs.find(t=>t._seriesId===editVorm._seriesId
      && !t._exSeriesId && t.date.startsWith(monthStr));
    if(found) setExStartDate(found.date);
    else setExStartDate(_txDateForMonth(year, month));
  }, [month, year, showExForm]);
  const [exCount,       setExCount]       = useState("");
  const [exEditId,      setExEditId]      = useState(null);  // _exSeriesId beim Bearbeiten
  const [exEditScope,   setExEditScope]   = useState("single");
  const [exLastOfMonth, setExLastOfMonth] = useState(false);

  // Alle Ausnahme-Serien dieser Hauptserie
  const exSeries = React.useMemo(()=>{
    if(!editVorm?._seriesId) return [];
    const allEx = txs.filter(t=>t._seriesId===editVorm._seriesId && t._exSeriesId);
    const byId = {};
    allEx.forEach(t=>{
      if(!byId[t._exSeriesId]) byId[t._exSeriesId]=[];
      byId[t._exSeriesId].push(t);
    });
    return Object.entries(byId).map(([id,items])=>{
      const sorted = items.sort((a,b)=>a.date.localeCompare(b.date));
      return {id, items:sorted, first:sorted[0], last:sorted[sorted.length-1],
        interval: items[0]?._exInterval||12, amount: items[0]?.totalAmount};
    });
  }, [editVorm, txs]);

  const handleSaveException = () => {
    const amt = pn(exAmount.replace(",","."));
    if(!amt || !exStartDate) return;
    const seriesId = editVorm._seriesId;
    if(!seriesId) return;

    const exId = exEditId || ("ex-"+uid());
    const n = exCount ? parseInt(exCount)||1 : 99;

    setTxs(prev=>{
      // Hauptserien-Buchungen ab exStartDate mit passendem Intervall
      const mainTxs = prev.filter(t=>t._seriesId===seriesId && !t._exSeriesId)
        .sort((a,b)=>a.date.localeCompare(b.date));

      const matches = mainTxs.filter(t=>{
        if(t.date < exStartDate) return false;
        const d = new Date(t.date);
        const s = new Date(exStartDate);
        const monthDiff = (d.getFullYear()-s.getFullYear())*12 + (d.getMonth()-s.getMonth());
        return monthDiff >= 0 && monthDiff % exInterval === 0;
      }).slice(0, n);

      const matchIds = new Set(matches.map(t=>t.id));

      // Bearbeitung: zuerst vorherige Ausnahmen dieser exId zurücksetzen
      const withReset = exEditId ? prev.map(t=>{
        if(t._exSeriesId!==exEditId) return t;
        // Betrag auf regularAmt zurücksetzen
        const regAmt = seriesAmtInfo.regularAmt;
        return regAmt ? {...t, totalAmount:regAmt, _exSeriesId:undefined, _isException:undefined} : t;
      }) : prev;

      // Jetzt passende Buchungen mit neuem Betrag + exSeriesId markieren
      return withReset.map(t=>{
        if(!matchIds.has(t.id)) return t;
        return {
          ...t,
          totalAmount: amt,
          splits: t.splits?.length ? t.splits.map(s=>({...s,amount:amt/t.splits.length})) : t.splits,
          _exSeriesId: exId,
          _exInterval: exInterval,
          _isException: true,
        };
      });
    });

    setShowExForm(false);
    setExAmount(""); setExStartDate(""); setExCount(""); setExEditId(null);
  };

  const handleDeleteException = (exId, scope, fromDate) => {
    const regAmt = seriesAmtInfo.regularAmt;
    setTxs(prev=>prev.map(t=>{
      if(t._exSeriesId!==exId) return t;
      if(scope==="all" ||
         (scope==="from" && t.date>=fromDate) ||
         (scope==="single" && t.date===fromDate)) {
        // Betrag auf regulären Wert zurücksetzen
        const restored = regAmt ? regAmt : t.totalAmount;
        return {
          ...t,
          totalAmount: restored,
          splits: t.splits?.length ? t.splits.map(s=>({...s,amount:restored/t.splits.length})) : t.splits,
          _exSeriesId: undefined,
          _isException: undefined,
        };
      }
      return t;
    }));
  };

  // Anzahl + Intervall der Serie aus echten Buchungen ermitteln
  const seriesCount = React.useMemo(()=>{
    if(!isEdit || !editVorm?._seriesId) return null;
    return txs.filter(t=>t._seriesId===editVorm._seriesId && !t._isException).length;
  }, [isEdit, editVorm, txs]);

  // Abweichende Beträge in der Serie erkennen
  const seriesAmtInfo = React.useMemo(()=>{
    if(!isEdit || !editVorm?._seriesId) return {deviations:[],regularAmt:0,firstDev:null,lastDev:null};
    // Nur Hauptserien-Buchungen ohne Ausnahme-Markierung für regulären Betrag
    const sorted = txs.filter(t=>t._seriesId===editVorm._seriesId && !t._isException)
      .sort((a,b)=>a.date.localeCompare(b.date));
    if(sorted.length<2) return {deviations:[],regularAmt:sorted[0]?.totalAmount||0,firstDev:null,lastDev:null};
    // Häufigster Betrag = "regulär"
    const amtCounts = {};
    sorted.forEach(t=>{const k=Math.round(t.totalAmount*100)/100; amtCounts[k]=(amtCounts[k]||0)+1;});
    const regularAmt = Number(Object.entries(amtCounts).sort((a,b)=>b[1]-a[1])[0][0]);
    // Abweichungen = Buchungen mit anderem Betrag (das sind echte Betragsänderungen, nicht Ausnahmen)
    const allDev = sorted
      .map((t,i)=>({idx:i, date:t.date, amt:t.totalAmount, id:t.id, n:sorted.length}))
      .filter(e=>Math.round(e.amt*100)/100 !== regularAmt);
    // Für Finanzierung: erste/letzte abweichende
    const firstDev = allDev.find(e=>e.idx===0)||null;
    const lastDev  = allDev.find(e=>e.idx===sorted.length-1)||null;
    const deviations = allDev.filter(e=>e.idx!==0 && e.idx!==sorted.length-1);
    return {deviations, regularAmt, firstDev, lastDev};
  }, [isEdit, editVorm, txs]);
  const seriesDeviations = seriesAmtInfo.deviations;

  // Editierbare abweichende Beträge: {txId -> string}
  const [devAmounts, setDevAmounts] = useState(()=>{
    if(!editVorm?._seriesId) return {};
    return {}; // wird unten per useEffect befüllt
  });

  // Befülle devAmounts wenn seriesDeviations sich ändert
  React.useEffect(()=>{
    if(seriesDeviations.length===0) return;
    setDevAmounts(prev=>{
      const next={...prev};
      seriesDeviations.forEach(e=>{
        if(!next[e.id]) next[e.id]=String(e.amt).replace(".",",");
      });
      return next;
    });
  }, [seriesDeviations.length]);

  // Korrigiere amount auf den regulären Betrag (nicht den der angeklickten Buchung)
  React.useEffect(()=>{
    if(!isEdit || !seriesAmtInfo.regularAmt || seriesAmtInfo.regularAmt<=0) return;
    setAmount(String(seriesAmtInfo.regularAmt).replace(".",","));
  }, [seriesAmtInfo.regularAmt]);

  // Auto-aktiviere Toggle nur für Finanzierung wenn erste/letzte Buchung abweicht
  React.useEffect(()=>{
    if(typ!=="finanzierung") return;
    const {firstDev, lastDev} = seriesAmtInfo;
    if(firstDev||lastDev) {
      setCustomFirstLast(true);
      if(firstDev) setFirstAmount(String(firstDev.amt).replace(".",","));
      if(lastDev)  setLastAmount(String(lastDev.amt).replace(".",","));
    }
  }, [seriesAmtInfo.firstDev?.id, seriesAmtInfo.lastDev?.id]);

  const seriesInterval = React.useMemo(()=>{
    if(!isEdit || !editVorm?._seriesId) return null;
    const sorted = txs.filter(t=>t._seriesId===editVorm._seriesId)
      .sort((a,b)=>a.date.localeCompare(b.date));
    if(sorted.length < 2) return editVorm.repeatMonths||1;
    const d1 = new Date(sorted[0].date);
    const d2 = new Date(sorted[1].date);
    const months = (d2.getFullYear()-d1.getFullYear())*12+(d2.getMonth()-d1.getMonth());
    return months||1;
  }, [isEdit, editVorm, txs]);

  // Intervall aus Serie übernehmen wenn nicht explizit geändert
  React.useEffect(()=>{
    if(seriesInterval && seriesInterval !== interval_) {
      setInterval_(seriesInterval);
    }
  }, [seriesInterval]);

  const catOpts = cats.filter(c => {
    const grp = groups.find(g=>g.type===c.type);
    const beh = grp?.behavior || c.type;
    return csvType==="income"
      ? (beh==="income" || (c.type==="tagesgeld" && beh!=="expense"))
      : (beh==="expense" || (c.type==="tagesgeld" && beh!=="income"));
  });
  const selCat = cats.find(c=>c.id===catId);
  const subOpts = selCat?.subs||[];
  const _showFuelFields = typ==="einmalig" && csvType==="expense"
    && !(transferToAcc && transferToAcc!==accountId) && isFuelSelection(selCat, getSub(catId,subId));

  // Flexibler Topf "Unvorhergesehenes" (per Name erkannt, wie in EditPopup und
  // im Vormerken-Assistenten). Der Betrag bleibt in seiner Kategorie, nur die
  // Budget-Anrechnung wandert in den Topf.
  //
  // Bisher gab es den Schalter nur beim ANLEGEN einer Vormerkung und beim
  // Bearbeiten einer bereits gebuchten Buchung — nicht beim Bearbeiten einer
  // bestehenden Vormerkung, denn die laeuft ueber diesen Dialog. Nachtraeglich
  // liess sich der Topf damit gar nicht zuordnen (Nutzer-Hinweis).
  //
  // Wie beim Anlegen nur fuer EINMALIGE Ausgaben: bei einer Serie wuerde die
  // Aenderung auf alle Folgeeintraege wirken, und ein dauerhaft aus dem Topf
  // bezahlter Posten ist keine unvorhergesehene Ausgabe mehr. Nicht bei
  // Umbuchungen (kein Budget) und nicht, wenn der Eintrag ohnehin schon im
  // Topf liegt.
  const _potSub = (() => {
    for(const c of (cats||[])) for(const sub of (c.subs||[]))
      if((sub.name||"").trim().toLowerCase()==="unvorhergesehenes") return sub;
    return null;
  })();
  const _showPotToggle = typ==="einmalig" && csvType==="expense" && !umbuchung
    && !!_potSub && subId !== _potSub.id;
  const fuelComputedTotal = (() => {
    const l = pn((fuelLiters||"").replace(",","."));
    const p = pn((fuelPricePerL||"").replace(",","."));
    return (l>0 && p>0) ? l*p : null;
  })();
  // Plausibilitätsprüfung km-Stand: warnt vor typischen Zahlendrehern/
  // fehlenden Ziffern, blockiert das Speichern aber nicht. Beim Bearbeiten
  // die eigene Buchung (editVorm.id) beim Vergleich ausschließen.
  // useMemo: durchsucht ALLE Buchungen — ohne Memoisierung liefe das bei
  // JEDEM Tastendruck neu (Betrag/Notiz/… stehen hier auf derselben Seite
  // wie das km-Stand-Feld) und machte die Eingabe spürbar träge.
  const odometerWarning = useMemo(() => {
    if(!_showFuelFields || !odometer) return null;
    return checkOdometerPlausibility(txs, fuelVehicleId, pn(odometer), startDate, editVorm?.id);
  }, [_showFuelFields, odometer, fuelVehicleId, startDate, editVorm?.id, txs]);
  const allTags = useMemo(()=>getAllTags(txs), [txs]);
  const saveVehicle = () => {
    const name = newVehicleName.trim();
    if(!name) return;
    const plate = newVehiclePlate.trim() || undefined;
    if(editingVehicleId) {
      setVehicles(p=>(p||[]).map(v=>v.id===editingVehicleId?{...v,name,plate}:v));
    } else {
      const v = {id:uid(), name, plate};
      setVehicles(p=>[...(p||[]), v]);
      setFuelVehicleId(v.id);
    }
    setNewVehicleName(""); setNewVehiclePlate(""); setEditingVehicleId(null); setShowNewVehicle(false);
  };
  const startEditVehicle = (v) => {
    setEditingVehicleId(v.id);
    setNewVehicleName(v.name||"");
    setNewVehiclePlate(v.plate||"");
    setShowNewVehicle(true);
  };
  const fuelTxFields = _showFuelFields ? {
    _fuelVehicleId: fuelVehicleId || undefined,
    _fuelLiters: fuelLiters ? pn(fuelLiters.replace(",",".")) : undefined,
    _fuelPricePerL: fuelPricePerL ? pn(fuelPricePerL.replace(",",".")) : undefined,
    _odometer: odometer ? pn(odometer) : undefined,
  } : { _fuelVehicleId: undefined, _fuelLiters: undefined, _fuelPricePerL: undefined, _odometer: undefined };

  const interval_ = interval; // muss VOR calcCount stehen!
  const calcCount = () => {
    if(typ==="einmalig") return 1;
    if(count) return Math.max(1, parseInt(count)||1);
    if(endDate && startDate) return calcRecurringCount(startDate, endDate, interval_);
    // Finanzierung: bestehende Serienanzahl als Fallback (nicht 1!)
    if(typ==="finanzierung") {
      if(isEdit && seriesCount) return seriesCount;
      return 1;
    }
    // "unbegrenzt" = vom Startdatum bis Dezember (Startjahr + 6)
    return calcRecurringCount(startDate||today, null, interval_);
  };
  const totalCount = calcCount();
  const preview = [];
  for(let i=0;i<Math.min(totalCount,3);i++) preview.push(isoAddMonths(startDate,i*interval_));

  const handleSave = () => {
    setError("");
    const amt = pn(amount.replace(",","."));
    if(!amt) { setError("Bitte Betrag eingeben."); return; }
    if(!desc.trim()) { setError("Bitte Beschreibung eingeben."); return; }
    if(!startDate) { setError("Bitte Startdatum wählen."); return; }

    const newSplits = catId ? [{id:uid(),catId,subId:subId||"",amount:amt}] : [];

    // ── BEARBEITEN-MODUS ──────────────────────────────────────────────
    if(isEdit) {
      const seriesId = editVorm._seriesId;
      const pad2 = n=>String(n).padStart(2,"0");

      // Hilfsfunktion: eine einzelne tx updaten
      const updateTx = (t) => ({
        ...t, desc:desc.trim(), totalAmount:amt,
        accountId, _csvType:csvType, splits:newSplits, note:note||"", tags,
        repeatMonths:interval_,
        ...(lastOfMonth?{_lastOfMonth:true}:{_lastOfMonth:undefined}),
        ...(typ==="finanzierung"?{_seriesTyp:"finanzierung"}:{_seriesTyp:undefined}),
        // Flexibler Topf: nur setzen, solange der Schalter ueberhaupt gilt.
        // Faellt seine Bedingung weg (Typ auf Serie gestellt, Umbuchung,
        // Kategorie auf den Topf selbst), wird er mit abgeraeumt statt
        // unsichtbar weiterzuwirken.
        _potSubId: (_showPotToggle && potOn && _potSub) ? _potSub.id : undefined,
        ...fuelTxFields,
      });

      // Hilfsfunktion: Linked-Counterpart aktualisieren oder erstellen/löschen
      // Gibt zurück: {removeIds: Set, addTxs: Array}
      const buildLinkedUpdate = (parentTx) => {
        const existingLinked = txs.find(t => t._linkedTo===parentTx.id && t.pending);
        if(csvType!=="expense" || !transferToAcc || transferToAcc===accountId) {
          // Kein Transfer mehr → bestehendes Gegenstück löschen
          return existingLinked
            ? {removeIds:new Set([existingLinked.id]), addTxs:[]}
            : {removeIds:new Set(), addTxs:[]};
        }
        const linkedSplits = transferToCat
          ? [{id:uid(),catId:transferToCat,subId:transferToSub||"",amount:amt}]
          : [];
        const newLinked = {
          id: existingLinked?.id || uid(),
          date: parentTx.date,
          desc: desc.trim(),
          totalAmount: amt,
          pending: true,
          accountId: transferToAcc,
          _csvType: "income",
          repeatMonths: interval_,
          splits: linkedSplits,
          note: note||"", tags,
          _linkedTo: parentTx.id,
          ...(parentTx._seriesId ? {_seriesId: parentTx._seriesId+"_in", _seriesIdx: parentTx._seriesIdx, _seriesTotal: parentTx._seriesTotal} : {}),
          ...(lastOfMonth ? {_lastOfMonth:true} : {}),
        };
        return existingLinked
          ? {removeIds:new Set([existingLinked.id]), addTxs:[newLinked]}
          : {removeIds:new Set(), addTxs:[newLinked]};
      };

      if(typ==="einmalig" || !seriesId) {
        // Einmalige Buchung: direkt updaten inkl. Datum + Counterpart pflegen
        const updatedParent = (() => {
          const orig = txs.find(t=>t.id===editVorm.id);
          return orig ? {...updateTx(orig), date: startDate||orig.date} : null;
        })();
        if(updatedParent) {
          const {removeIds, addTxs} = buildLinkedUpdate(updatedParent);
          setTxs(p => {
            const next = p.map(t => t.id===editVorm.id ? updatedParent : t)
                          .filter(t => !removeIds.has(t.id));
            return [...next, ...addTxs];
          });
        }

      } else if(editScope==="single") {
        // Nur die Buchung im aktuell gewählten Monat ändern (Datum bleibt)
        const monthStr = `${year}-${pad2(month+1)}`;
        const matchedParents = txs.filter(t=>
          t._seriesId===seriesId && !t._exSeriesId && t.date.startsWith(monthStr));
        setTxs(p=>{
          let next = p.map(t=>{
            if(t._seriesId!==seriesId||t._exSeriesId) return t;
            if(!t.date.startsWith(monthStr)) return t;
            return updateTx(t);
          });
          // Für jede aktualisierte Parent-Buchung die Linked-Counterpart pflegen
          matchedParents.forEach(orig => {
            const updated = updateTx(orig);
            const {removeIds, addTxs} = buildLinkedUpdate(updated);
            next = next.filter(t => !removeIds.has(t.id));
            next = [...next, ...addTxs];
          });
          return next;
        });

      } else {
        // range / from / all — Serie immer komplett neu aufbauen im Bereich
        const seriesTxs = txs.filter(t=>t._seriesId===seriesId&&!t._exSeriesId)
          .sort((a,b)=>a.date.localeCompare(b.date));
        const rangeFrom = editScope==="all" ? "0000-00-00" : scopeFrom;
        const rangeTo   = editScope==="all" ? "9999-99-99"
                        : editScope==="from" ? "9999-99-99"
                        : scopeTo;
        const affectedIds = new Set(
          seriesTxs.filter(t=>t.date>=rangeFrom && t.date<=rangeTo).map(t=>t.id)
        );
        const keepTxs = txs.filter(t=>!affectedIds.has(t.id));

        // Startdatum: bei "alle" = neues startDate; bei "from"/"range" = scopeFrom
        const refStart = editScope==="all"
          ? (startDate || seriesTxs[0]?.date || editVorm.date)
          : scopeFrom;

        // Anzahl: bei "alle" = count-Feld oder calcCount(); sonst = betroffene Raten
        const firstAmt2 = customFirstLast&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
        const lastAmt2  = customFirstLast&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;

        let n;
        if(editScope==="all") {
          n = count ? Math.max(1,parseInt(count)||1) : calcCount();
        } else {
          // range/from: Anzahl der betroffenen Raten beibehalten
          n = affectedIds.size;
        }

        // Unveränderte Raten DERSELBEN Serie vor/nach dem bearbeiteten Bereich
        // — bestimmen, WO die neu erzeugten Raten in der Nummerierung
        // weiterzählen. Ohne das startete "ab dieser"/"von…bis" die Zählung
        // lokal wieder bei 1 mit einer nur lokalen Gesamtzahl (z.B. "2/22"
        // statt fortlaufend "16/36" — Nutzer-Bericht: Anzeige "macht keinen
        // Sinn", ändert sich bei jeder Bearbeitung willkürlich).
        const beforeCount = editScope==="all" ? 0 : seriesTxs.filter(t=>t.date<rangeFrom).length;
        const afterCount  = editScope==="range" ? seriesTxs.filter(t=>t.date>rangeTo).length : 0;
        const grandTotal  = editScope==="all" ? n : beforeCount + n + afterCount;
        const oldTotal    = seriesTxs.length;

        const newGenTxs = [];
        for(let i=0; i<n; i++){
          const date = isoAddMonths(refStart, i*interval_, lastOfMonth);
          const isFirst=i===0, isLast=i===n-1;
          const txAmt = (isFirst&&firstAmt2!=null)?firstAmt2:(isLast&&lastAmt2!=null)?lastAmt2:amt;
          const txSplits = catId?[{id:uid(),catId,subId:subId||"",amount:txAmt}]:newSplits;
          const seriesIdx = beforeCount+i+1;
          const tx = {
            id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
            accountId, _csvType:csvType, splits:txSplits, note:note||"", tags,
            repeatMonths:interval_, _seriesId:seriesId,
            _seriesIdx:seriesIdx, _seriesTotal:grandTotal,
            ...(lastOfMonth?{_lastOfMonth:true}:{_lastOfMonth:undefined}),
            ...(typ==="finanzierung"?{_seriesTyp:"finanzierung"}:{_seriesTyp:undefined}),
          };
          newGenTxs.push(tx);
          // Umbuchungs-Gegenstück (Einnahme auf Zielkonto)
          if(csvType==="expense" && transferToAcc && transferToAcc!==accountId) {
            const linkedSplits = transferToCat
              ? [{id:uid(),catId:transferToCat,subId:transferToSub||"",amount:txAmt}]
              : [];
            newGenTxs.push({
              id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
              accountId: transferToAcc, _csvType:"income",
              repeatMonths:interval_, splits:linkedSplits, note:note||"", tags,
              _linkedTo: tx.id,
              _seriesId: seriesId+"_in", _seriesIdx:seriesIdx, _seriesTotal:grandTotal,
              ...(lastOfMonth?{_lastOfMonth:true}:{}),
            });
          }
        }
        // Beim Edit-Replace: alte verknüpfte Gegenstücke der betroffenen Buchungen auch entfernen
        const affectedLinkedIds = new Set(
          txs.filter(t=>t._linkedTo && affectedIds.has(t._linkedTo)).map(t=>t.id)
        );
        // Unveränderte Raten derselben Serie (vor/nach dem Bereich) auf die
        // neue Gesamtzahl nachziehen — "davor" behält seinen Index, "danach"
        // rückt um die Differenz zur alten Gesamtzahl weiter, damit die
        // Nummerierung über die ganze Serie durchgehend konsistent bleibt.
        const totalDelta = grandTotal - oldTotal;
        const keepTxs2 = keepTxs
          .map(t=>{
            if(t._seriesId!==seriesId || t._exSeriesId) return t;
            if(t.date<rangeFrom) return {...t, _seriesTotal:grandTotal};
            if(t.date>rangeTo)   return {...t, _seriesIdx:(t._seriesIdx||0)+totalDelta, _seriesTotal:grandTotal};
            return t;
          })
          .filter(t=>!affectedLinkedIds.has(t.id));
        setTxs([...keepTxs2, ...newGenTxs]);
      }
      setSaved(true); setTimeout(()=>{ setSaved(false); onClose(); },1000);
      return;
    }

    // ── NEU ERSTELLEN ─────────────────────────────────────────────────
    const n = calcCount();
    const seriesId = typ!=="einmalig" ? uid() : null;

    // Dopplungs-Check bei wiederkehrenden Serien: dieser Zweig wird nicht nur
    // beim manuellen Neuanlegen erreicht, sondern auch über Vorbefüllungen
    // ("Im Vormerkungsdialog öffnen →" aus der Wiederkehrend-Erkennung, oder
    // "Als Vormerkung anlegen" aus einer Buchung heraus) — ohne diesen Check
    // entsteht dabei leicht eine zweite, unabhängige Serie für denselben
    // Händler/Betrag, obwohl schon eine läuft. Exakt derselbe Check wie in
    // RecurringDetectionScreen.createVormerkungen().
    if(seriesId){
      const vendorOf = d => (d||"").replace(/\{[^}]{0,300}\}/g,"").trim()
        .split("·")[0].split("–")[0].split("/")[0].trim().toLowerCase().slice(0,40);
      const vendor = vendorOf(desc);
      const dupAmt = pn(amount.replace(",","."));
      const existingSeries = txs.some(t=>t.pending&&!t._linkedTo&&
        vendorOf(t.desc)===vendor&&Math.round(t.totalAmount*100)/100===Math.round(dupAmt*100)/100);
      if(existingSeries){
        alert(`Für "${desc.trim()}" (${fmt(dupAmt)}) existiert bereits eine Vormerkungs-Serie — nicht erneut angelegt.`);
        return;
      }
    }
    // Erst-/Letztbetrag
    const firstAmt = customFirstLast&&firstAmount ? pn(firstAmount.replace(",",".")) : null;
    const lastAmt  = customFirstLast&&lastAmount  ? pn(lastAmount.replace(",","."))  : null;

    const newTxs = [];
    for(let i=0; i<n; i++){
      const date = isoAddMonths(startDate, i*interval_, lastOfMonth&&typ!=="einmalig");
      const isFirst = i===0;
      const isLast  = i===n-1;
      const txAmt = (isFirst&&firstAmt!=null) ? firstAmt
                  : (isLast &&lastAmt !=null) ? lastAmt
                  : amt;
      const txSplits = catId
        ? [{id:uid(),catId,subId:subId||"",amount:txAmt}]
        : [];
      const tx = {
        id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
        accountId:accountId||accounts[0]?.id||"",
        _csvType:csvType, repeatMonths:interval_,
        splits: txSplits,
        note: note||"", tags,
        ...(lastOfMonth&&typ!=="einmalig" ? {_lastOfMonth:true} : {}),
        ...(typ==="einmalig"&&valueDate ? {valueDate} : {}),
        ...((_showPotToggle && potOn && _potSub) ? {_potSubId:_potSub.id} : {}),
        ...fuelTxFields,
      };
      if(seriesId){
        tx._seriesId=seriesId; tx._seriesIdx=i+1; tx._seriesTotal=n;
        if(typ==="finanzierung") tx._seriesTyp="finanzierung";
      }
      newTxs.push(tx);

      // Umbuchung auf eigenes Konto: verknüpfte Gegenbuchung als Einnahme erstellen
      // Nur für Ausgaben (csvType==="expense") und wenn transferToAcc gesetzt ist
      if(csvType==="expense" && transferToAcc && transferToAcc!==tx.accountId) {
        const linkedSplits = transferToCat
          ? [{id:uid(),catId:transferToCat,subId:transferToSub||"",amount:txAmt}]
          : [];
        const linkedTx = {
          id:uid(), date, desc:desc.trim(), totalAmount:txAmt, pending:true,
          accountId: transferToAcc,
          _csvType:"income",  // Gegenstück = Einnahme
          repeatMonths:interval_,
          splits: linkedSplits,
          note: note||"", tags,
          _linkedTo: tx.id,   // verknüpft mit Ausgabe
          ...(lastOfMonth&&typ!=="einmalig" ? {_lastOfMonth:true} : {}),
        };
        if(seriesId){
          // Eigene Serie für die Zugang-Seite (oder gleiche Serie? besser eigene damit edit-getrennt)
          linkedTx._seriesId=seriesId+"_in"; linkedTx._seriesIdx=i+1; linkedTx._seriesTotal=n;
        }
        newTxs.push(linkedTx);
      }
    }
    setTxs(p=>[...p,...newTxs]);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
    setDesc(""); setAmount(""); setCatId(""); setSubId(""); setCount(""); setEndDate(""); setNote(""); setTags([]);
    // Datums-Defaults zurücksetzen: Buchung bei Umbuchung → heute, sonst →
    // nächster Banktag. "verursacht" immer heute.
    setStartDate(transferToAcc ? today : nextBankWorkday(today));
    setValueDate(today);
    setStartDateManual(false);
  };

  const handleDelete = () => {
    if(!isEdit||!editVorm) return;
    const seriesId = editVorm._seriesId;
    // Frage UND Loeschung haengen am gewaehlten Umfang. onClose() gehoert in
    // den Ja-Zweig: bei Abbrechen bleibt der Dialog offen — genau das hat
    // vorher das `return` nach window.confirm erledigt.
    const [frage, loeschen] = (!seriesId || editScope==="single")
      ? ["Diese Vormerkung löschen?", () => {
          recordDeletedTxs(editVorm.id);
          setTxs(p=>p.filter(t=>t.id!==editVorm.id));
        }]
      : editScope==="from"
        ? ["Diese und alle folgenden Vormerkungen löschen?", () => {
            setTxs(prevTxs=>{
              const seriesTxs=prevTxs.filter(t=>t._seriesId===seriesId).sort((a,b)=>a.date.localeCompare(b.date));
              const toDelete=new Set(seriesTxs.filter(t=>t.date>=scopeFrom).map(t=>t.id));
              recordDeletedTxs([...toDelete]);
              return prevTxs.filter(t=>!toDelete.has(t.id));
            });
          }]
        : ["Alle Vormerkungen dieser Serie löschen?", () => {
            recordDeletedTxs(txs.filter(t=>t._seriesId===seriesId).map(t=>t.id));
            setTxs(p=>p.filter(t=>t._seriesId!==seriesId));
          }];
    frageBestaetigung(frage, () => { loeschen(); onClose(); },
      {jaLabel:"Löschen", ton:"gefahr"});
  };

  // SecToggle defined outside

  // SegBtn defined outside

  const endPreview = count && startDate
    ? (()=>{const d=new Date(isoAddMonths(startDate,(parseInt(count)-1)*interval_));
        return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;})()
    : null;

  // Zielkategorien der Umbuchung: alle Income-Behavior-Kategorien, strikt nach
  // Zielkonto gefiltert ("Income-Behavior" = Gruppen-Behavior "income" ODER
  // c.type "income"/"tagesgeld" als Altfall). Steht hier oben, weil die Auswahl
  // inzwischen im Kategorie-Block sitzt, die Ziel-Kacheln aber weiter oben.
  const tgtCats = (cats||[]).filter(c=>{
    const grp = (groups||[]).find(g=>g.type===c.type);
    const beh = grp?.behavior || c.type;
    if(beh!=="income" && beh!=="tagesgeld" && c.type!=="income" && c.type!=="tagesgeld") return false;
    if(!transferToAcc) return true;                       // ohne Konto-Wahl alle anzeigen
    if(c.accountId) return c.accountId === transferToAcc; // Kategorie kennt ihr Konto
    const matchingGroups = (groups||[]).filter(g=>g.type===c.type);
    if(matchingGroups.length === 0) return true;          // keine Gruppe → universell
    return matchingGroups.some(g => !g.accountId || g.accountId === transferToAcc);
  });
  const tgtSubs = (tgtCats.find(c=>c.id===transferToCat)?.subs) || [];

  // Zusammenfassung fuer die Unterzeile der Kopfzeile.
  const intervallWort = interval_===1 ? "monatlich" : interval_===3 ? "quartalsweise"
    : interval_===6 ? "halbjährlich" : interval_===12 ? "jährlich" : interval_+"M";
  const kopfzeile = (()=>{
    if(typ==="einmalig") {
      if(!startDate) return null;
      const [jy,jm,jd] = String(startDate).split("-");
      return `Vormerkung für ${jd}.${jm}.${jy}`;
    }
    const art = typ==="finanzierung" ? "Finanzierung" : "Serie";
    // Beim Bearbeiten einer bestehenden Serie ist die Anzahl bekannt; beim
    // Anlegen steht sie noch nicht fest, dann nur das Intervall.
    const anzahl = isEdit && editVorm?._seriesId
      ? txs.filter(t=>t._seriesId===editVorm._seriesId).length
      : null;
    return anzahl!=null
      ? `${art} · ${anzahl} Buchungen · Intervall: ${intervallWort}`
      : `${art} · Intervall: ${intervallWort}`;
  })();

  // Groessen wie im "neue Vormerkung"-Dialog (MobileVormerkenModal), damit
  // beide Dialoge sich gleich anfuehlen — dort ist die Bedienung auf
  // Daumenbreite ausgelegt, hier waren Felder und Schrift halb so gross.
  const S = {fs:26, pad:10, padL:14, radius:16, gap:14};
  const INPUT_H = S.fs + S.padL*2;
  const INP_GROSS = {boxSizing:"border-box", width:"100%", height:INPUT_H,
    padding:`0 ${S.padL}px`, borderRadius:S.radius, color:T.txt, fontSize:S.fs,
    fontFamily:"inherit", outline:"none", border:`2px solid ${T.bd}`,
    background:(isLightTheme())?"rgba(0,0,0,0.05)":"rgba(255,255,255,0.06)",
    WebkitAppearance:"none", appearance:"none"};
  // Feldbeschriftungen in Textfarbe statt Grau — grau auf dunkelgrauem Grund
  // war kaum lesbar (Nutzer-Hinweis, gilt in der ganzen App).
  const LBL = {color:T.txt, fontSize:S.fs-4, fontWeight:600, marginBottom:6};
  // Duenne graue Linie zwischen den Abschnitten des Formulars. Ohne sie
  // stehen Konten, Betrag, Kategorien, Serien-Einstellungen und Termine als
  // eine einzige lange Folge da — mit den grossen Feldern sieht man auf einen
  // Blick nicht mehr, was zusammengehoert (Nutzer-Wunsch).
  const TRENNER = {height:1, background:T.bd, margin:`${S.gap}px 0`};

  // Grundstile fuer MobileCatStep — identisch zum "neue Vormerkung"-Dialog,
  // damit die Kategorie-Auswahl dort und hier dieselbe ist.
  const btnBase = {width:"100%", padding:`${S.padL}px`, borderRadius:S.radius,
    border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:S.fs,
    fontWeight:700, display:"flex", alignItems:"center",
    justifyContent:"flex-start", gap:10, textAlign:"left"};
  const btnCenter = {...btnBase, justifyContent:"center"};

  // Auslöser-Feld für die Kategorie-Auswahl: sieht aus wie die Eingabefelder
  // daneben, öffnet aber den eigenen Auswahl-Dialog. --btn-fs, weil sonst die
  // 18px-Regel für Knöpfe in .mobile-modal greift (s. themes.css).
  const katFeld = (wert, platzhalter, onOpen, gesperrt=false) => (
    <button onClick={()=>{ if(!gesperrt) onOpen(); }} disabled={gesperrt}
      style={{...INP_GROSS, flex:1, minWidth:0, marginBottom:0,
        "--btn-fs":S.fs+"px", opacity:gesperrt?0.5:1,
        cursor:gesperrt?"default":"pointer", textAlign:"left",
        color:wert?T.txt:T.txt2, display:"flex", alignItems:"center",
        overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis"}}>
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        {wert || platzhalter}
      </span>
    </button>
  );

  // Neues Konto anlegen — gleicher Weg wie im "neue Vormerkung"-Dialog: der
  // Vollbild-Dialog tritt an die Stelle dieses Dialogs und kehrt danach mit dem
  // frisch angelegten Konto zurueck (dessen Zustand bleibt erhalten, weil nur
  // die Ausgabe ersetzt wird, nicht die Komponente).
  // Kategorie-Auswahl: derselbe zweistufige Schritt wie im "neue
  // Vormerkung"-Dialog (MobileCatStep — Kategorie, dann Unterkategorie, mit
  // Symbolen und "neue Kategorie anlegen"), hier nur in einen Vollbild-Rahmen
  // gesetzt statt inline in einem Assistenten. Er liefert Haupt- und
  // Unterkategorie in einem Zug; die beiden Felder im Formular zeigen das
  // Ergebnis, ein Tap auf eines von beiden oeffnet denselben Schritt.
  if(katPicker) {
    const zielSeite = katPicker.startsWith("ziel");
    // Tap auf das Unterkategorie-Feld steigt direkt beim Unterschritt ein —
    // die Hauptkategorie steht ja schon fest. Ueber "‹ zurueck" dort kommt man
    // trotzdem an die Kategorie-Liste.
    const beiUnter = katPicker.endsWith("Sub");
    return (
      <div className="mobile-modal"
        style={{position:"fixed",inset:0,background:T.bg,zIndex:320,
          display:"flex",flexDirection:"column","--mob-fs":S.fs+"px"}}>
        <MobileHeader title={beiUnter ? "Unterkategorie"
            : zielSeite ? "Zielkategorie"
            : (umbuchung ? "Quellkategorie" : "Kategorie")}
          onBack={()=>setKatPicker(null)}/>
        {/* Untere Reserve UNTEN_FREI: Leiste UND der grosse + Knopf liegen ueber
            diesem Dialog (der Knopf soll dort bleiben). Ohne die Reserve endet
            die Liste darunter und laesst sich nicht mehr hochschieben. */}
        <div style={{flex:1,overflowY:"auto",overflowX:"hidden",
          WebkitOverflowScrolling:"touch",background:T.surf2,padding:S.padL,
          paddingBottom:`calc(${UNTEN_FREI} + env(safe-area-inset-bottom, 0px))`}}>
          <MobileCatStep
            key={katPicker}
            startSub={beiUnter}
            csvType={zielSeite ? "income" : csvType}
            catId={zielSeite ? transferToCat : catId}
            subId={zielSeite ? transferToSub : subId}
            accountId={zielSeite ? transferToAcc : accountId}
            onSelect={(c, sub)=>{
              if(zielSeite) { setTransferToCat(c); setTransferToSub(sub||""); }
              else { setCatId(c); setSubId(sub||""); }
              setKatPicker(null);
            }}
            S={S} btnBase={btnBase} btnCenter={btnCenter}/>
        </div>
      </div>
    );
  }

  if(showNewAcc) return (
    <MobileNewAccOverlay S={S} onClose={(newId)=>{
      setShowNewAcc(false);
      if(newId) setAccountId(newId);
    }}/>
  );

  return (
    // Vollbild. Vorher hing das an einem Prop, dessen Setter in App.jsx nie
    // aufgerufen wurde — es war also immer false und jeder bekam das
    // Slide-up-Blatt (92vh, oben abgerundet). Hier werden Betrag, Datum und
    // Beschreibung eingegeben, bei Serien zusaetzlich Intervall und Laufzeit;
    // die Tastatur schob davon die Haelfte aus dem Bild. Gleiches Geruest wie
    // die uebrigen Vollbild-Screens: Kopfzeile steht, nur der Inhalt scrollt.
    <div className="mobile-modal"
      style={{position:"fixed",inset:0,background:T.bg,zIndex:300,
        display:"flex",flexDirection:"column",
        // Ohne diese Variable greift fuer Eingabefelder in .mobile-modal ein
        // ungueltiges var(--mob-fs) und die Felder fallen auf die geerbten
        // 18px zurueck — unabhaengig davon, was inline gesetzt ist.
        "--mob-fs": S.fs+"px"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Gemeinsame Kopfzeile statt einer eigenen. Sie reserviert
            env(safe-area-inset-top) — die selbstgebaute tat das nicht, weshalb
            der Titel auf Geraeten mit Notch (iPhone 13 mini) darunter lag.
            Dieser Dialog war der letzte Vollbild-Screen mit eigener Kopfzeile;
            alle anderen benutzen MobileHeader laengst. Nebenbei sitzt der
            Zurueck-Pfeil damit ueberall auf demselben Fleck.
            Unterzeile: die knappe Zusammenfassung dessen, was gespeichert wird.
            Sie wiederholt nicht die Schnellwahl darueber ("einmalige
            Vormerkung" war genau das), sondern nennt die Fakten, die sonst
            erst weiter unten im Formular stehen — bei einer Serie Anzahl und
            Intervall, bei einer einmaligen Vormerkung ihr Datum. Damit hat
            jeder der drei Typen eine Unterzeile statt nur zwei davon. */}
        <MobileHeader
          title={isEdit ? "Vormerkung bearbeiten" : "wiederkehrende anlegen"}
          subtitle={kopfzeile}
          onBack={onClose}/>

        {/* Die Speichern-Schaltflaeche scrollt mit (kein fixer Fussbereich) — der
            Abstand unten haelt sie nur von der Home-Anzeige frei und gibt bei
            offener Tastatur Platz, das letzte Feld nach oben zu scrollen. */}
        {/* overflowX:hidden — ohne das liess sich der ganze Dialog seitlich
            verschieben, sobald irgendeine Zeile ein paar Pixel breiter war als
            der Bildschirm (grosse Schrift, lange Kategorienamen). Der Inhalt
            ist auf die Breite ausgelegt, also soll er auch nur senkrecht
            scrollen.
            Untere Reserve UNTEN_FREI (Leiste + Ueberhang des + Knopfes, siehe
            palette.js): beide liegen ueber diesem Dialog und der + Knopf soll
            dort auch bleiben. Die frueheren 32px stammten daher, dass
            .mobile-modal die 57px der Leiste noch pauschal reserviert hat —
            das tut es nur noch fuer .unter-leiste, und der + Knopf war nie
            eingerechnet. Ergebnis: die letzten Felder lagen unerreichbar
            darunter. */}
        <div style={{flex:1,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",
          background:T.surf2,maxWidth:"100%",
          paddingBottom:`calc(${UNTEN_FREI} + env(safe-area-inset-bottom, 0px))`}}>

          {/* Typ ganz oben, direkt unter dem Titel — er entscheidet, welche
              Felder darunter ueberhaupt erscheinen (Intervall, Anzahl, Raten).
              Der fruehere Schiebeschalter "neue Vormerkung erstellen" davor ist
              entfallen: das Formular ist der Zweck des Dialogs, nicht ein
              aufklappbarer Abschnitt darin. */}
          <div style={{padding:"12px 14px 0"}}>
            <div style={{display:"flex",gap:3,background:"rgba(0,0,0,0.2)",
              borderRadius:10,padding:3}}>
              <VormHubSegBtn v="einmalig"      l="einmalig" icon="calendar"    cur={typ} set={setTyp} clearCount={()=>setCount("")} clearEnd={()=>setEndDate("")}/>
              <VormHubSegBtn v="wiederkehrend" l="Serie"    icon="repeat"      cur={typ} set={setTyp} clearCount={()=>setCount("")} clearEnd={()=>setEndDate("")}/>
              <VormHubSegBtn v="finanzierung"  l="Raten"    icon="credit-card" cur={typ} set={setTyp} clearCount={()=>setCount("")} clearEnd={()=>setEndDate("")}/>
            </div>
          </div>

          {(
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.bd}`}}>

              {/* Abweichende Beträge nur für Finanzierung */}
              {isEdit&&seriesDeviations.length>0&&typ==="finanzierung"&&(
                <div style={{background:"rgba(74,159,212,0.08)",border:`1px solid ${T.blue}44`,
                  borderRadius:9,padding:"8px 10px",marginBottom:10}}>
                  <div style={{color:T.acc,fontSize:S.fs-6,fontWeight:700,marginBottom:6,
                    display:"flex",alignItems:"center",gap:4}}>
                    {Li("edit-3",16,T.acc)} Abweichende Beträge mittendrin ({seriesDeviations.length}):
                  </div>
                  {seriesDeviations.map(e=>{
                    const [y,m,d]=e.date.split("-");
                    const label = e.idx===0 ? "1. Buchung (Start)"
                      : e.idx===(seriesCount-1) ? `${e.idx+1}. Buchung (Ende)`
                      : `${e.idx+1}. Buchung`;
                    return (
                      <div key={e.id} style={{display:"flex",alignItems:"center",
                        gap:6,marginBottom:5}}>
                        <div style={{flex:1}}>
                          <div style={{color:T.txt2,fontSize:S.fs-13,marginBottom:2}}>
                            {label} · {d}.{m}.{y}
                          </div>
                          <input
                            value={devAmounts[e.id]||String(e.amt).replace(".",",")}
                            onChange={ev=>setDevAmounts(p=>({...p,[e.id]:ev.target.value}))}
                            inputMode="decimal"
                            style={{...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",
                              fontSize:S.fs-10,padding:"5px 8px",border:`1px solid ${T.blue}66`}}/>
                        </div>
                        <button
                          onClick={()=>setDevAmounts(p=>({...p,[e.id]:amount}))}
                          title="auf regulären Betrag zurücksetzen"
                          style={{background:"rgba(255,255,255,0.07)",border:"none",
                            color:T.txt2,cursor:"pointer",borderRadius:6,
                            padding:"6px 8px",flexShrink:0,marginTop:12}}>
                          {Li("rotate-ccw",16,T.txt2)}
                        </button>
                      </div>
                    );
                  })}
                  <div style={{color:T.txt2,fontSize:S.fs-13,marginTop:2}}>
                    Leeres Feld = regulärer Betrag · ↩ setzt auf regulären Betrag zurück
                  </div>
                </div>
              )}

              {/* 1. Ausgabe / Einnahme / Umbuchung — dieselbe Dreier-Zeile wie im
                  "neue Vormerkung"-Dialog. Die Umbuchung stand hier vorher als
                  eigener Kasten weiter unten ("Umbuchung auf eigenes Konto
                  (optional)"), obwohl sie eine dritte Art von Buchung ist und
                  keine Zusatzeinstellung zu einer Ausgabe. */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:S.gap/2,marginBottom:S.gap}}>
                {[["expense","Ausgabe",T.cond_neg,false],
                  ["income","Einnahme",T.cond_pos,false],
                  ["transfer","Umbuchung",T.blue,true]].map(([val,label,col,istUmb])=>{
                  const active = istUmb ? umbuchung : (!umbuchung && csvType===val);
                  // Ohne zweites Konto gibt es kein Ziel — der Knopf wuerde die
                  // Buchung dann still als normale Ausgabe speichern.
                  const gesperrt = istUmb && accounts.length<2;
                  return (
                    <button key={val} disabled={gesperrt} onClick={()=>{
                      if(gesperrt) return;
                      if(istUmb) {
                        // Umbuchung geht immer vom gewaehlten Konto ab; das
                        // Gegenstueck auf dem Zielkonto legt das Speichern an.
                        setUmbuchung(true); setCsvType("expense");
                        setCatId(""); setSubId("");
                        if(!transferToAcc || transferToAcc===accountId) {
                          const anderes = (accounts||[]).find(a=>a.id!==accountId);
                          if(anderes) setTransferToAcc(anderes.id);
                        }
                        if(!isEdit && !startDateManual) { setStartDate(today); setValueDate(today); }
                      } else {
                        setUmbuchung(false);
                        setTransferToAcc(""); setTransferToCat(""); setTransferToSub("");
                        setCsvType(val); setCatId(""); setSubId("");
                        if(!isEdit && !startDateManual) { setStartDate(nextBankWorkday(today)); setValueDate(today); }
                      }
                    }}
                      style={{minWidth:0,padding:`${S.padL}px ${S.pad}px`,borderRadius:S.radius,
                        fontSize:S.fs-4,"--btn-fs":(S.fs-4)+"px",fontWeight:700,
                        border:`2px solid ${active?col:T.bd}`,
                        background:active?col+"22":(isLightTheme())?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.06)",
                        color:active?col:T.txt2,fontFamily:"inherit",transition:"all 0.15s",
                        opacity:gesperrt?0.4:1,cursor:gesperrt?"default":"pointer",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* 2. Konto — bei Umbuchung die Quelle. Gleiche Kachelgroesse wie
                  im "neue Vormerkung"-Dialog, inklusive "+ Konto"-Kachel. */}
              {accounts.length>0&&<>
                <div style={LBL}>{umbuchung ? "Quelle" : "Zahlungsart"}</div>
                <div style={{...SPERRE,marginBottom:S.gap}}>
                  <AccountChips accounts={accounts} value={accountId} S={S}
                    onChange={(id)=>{
                      setAccountId(id);
                      if(umbuchung && transferToAcc===id) {
                        const anderes = (accounts||[]).find(a=>a.id!==id);
                        setTransferToAcc(anderes?.id || "");
                      }
                    }}
                    onAddAccount={()=>setShowNewAcc(true)} addLabel="Konto"/>
                </div>
              </>}

              {/* 2b. Umbuchung: Zielkonto + Zielkategorie — nur noch sichtbar,
                  wenn oben "Umbuchung" gewaehlt ist. */}
              {umbuchung && accounts.length>1 && (()=>{
                const targets = accounts.filter(a=>a.id!==accountId);
                const umbBlue = "#4A9FD4";
                return (
                  <>
                    {/* "Ziel" statt eines eigenen Kastens mit Ueberschrift — die
                        Umbuchung ist oben schon als Art gewaehlt, hier fehlt nur
                        noch wohin. Kachelgroesse und minCols wie im "neue
                        Umbuchung"-Dialog, damit Quelle und Ziel gleich breit
                        stehen. */}
                    <div style={{...LBL,display:"flex",alignItems:"center",gap:6}}>
                      {Li("arrow-down",16,umbBlue)} Ziel
                    </div>
                    <div style={{marginBottom:S.gap}}>
                      <AccountChips accounts={targets} value={transferToAcc}
                        S={S} minCols={(accounts||[]).length + 1} onChange={(newVal)=>{
                        setTransferToAcc(newVal);
                        if(!isEdit && !startDateManual) {
                          setValueDate(today);
                          setStartDate(newVal ? today : nextBankWorkday(today));
                        }
                        if(newVal !== transferToAcc) {
                          setTransferToCat("");
                          setTransferToSub("");
                        }
                        if(newVal && isEdit && editVorm?._seriesId && editScope==="single") {
                          setEditScope("all");
                        }
                      }}/>
                    </div>
                  </>
                );
              })()}

              <div style={TRENNER}/>
              {/* 3. Betrag — Schriftgroesse wie im "neue Vormerkung"-Dialog.
                  Rechtsbuendig in der Geldschrift, wie dort. */}
              <div style={LBL}>
                {typ==="finanzierung"&&customFirstLast ? "Regelmäßiger Betrag (€)" : "Betrag (€)"}
              </div>
              <input value={amount} onChange={e=>setAmount(e.target.value)}
                placeholder="0,00" inputMode="decimal"
                readOnly={bankGesperrt}
                style={{...INP_GROSS,marginBottom:S.gap,fontWeight:700,
                  fontSize:S.fs+6,height:S.fs+6+S.padL*2,
                  fontFamily:NUM_FONT,textAlign:"right",opacity:bankGesperrt?0.55:1,
                  border:`2px solid ${amount?T.blue:T.bd}`}}/>

              <div style={TRENNER}/>
              {/* 9. Kategorien — ohne Ueberschriften, je Zeile Haupt- und
                  Unterkategorie nebeneinander. Statt der Beschriftungen benennt
                  die leere Auswahl das Feld ("— Quellkategorie —"), damit auch
                  ein noch nicht gefuelltes Feld sagt, worum es geht. Die Zeilen
                  sprechen fuer sich: oben die Quelle, darunter das Ziel.
                  Die Unterkategorie steht immer da (gesperrt, wenn es keine
                  gibt) — sonst huepfte die Zeile beim Kategoriewechsel um. */}
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                {katFeld(catOpts.find(c=>c.id===catId)?.name,
                  umbuchung ? "Quellkategorie" : "Kategorie",
                  ()=>setKatPicker("quelle"))}
                {katFeld(subOpts.find(o=>o.id===subId)?.name, "Unterkategorie",
                  ()=>setKatPicker("quelleSub"), !catId || !subOpts.length)}
              </div>

              {/* 9. Flexibler Topf: diese Vormerkung aus dem
                  Unvorhergesehenes-Budget bezahlen. Kategorie und Betrag
                  bleiben, nur die Budget-Anrechnung wandert in den Topf.
                  Steht direkt unter der Kategorie, weil sie sich genau darauf
                  bezieht. */}
              {_showPotToggle&&(
                <div style={{background:"rgba(255,255,255,0.04)",borderRadius:11,padding:"10px 12px",marginBottom:8,border:`1px solid ${T.bd}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <span style={{color:T.txt,fontSize:S.fs-6,display:"inline-flex",alignItems:"center",gap:7}}>
                      {Li("life-buoy",S.fs-6,potOn?T.acc_gold:T.txt2)} aus Unvorhergesehenes</span>
                    <div onClick={()=>setPotOn(v=>!v)} role="switch" aria-checked={potOn}
                      aria-label="aus Unvorhergesehenes bezahlen"
                      style={{width:52,height:30,borderRadius:15,flexShrink:0,
                        background:potOn?T.gold:"rgba(255,255,255,0.12)",cursor:"pointer",
                        position:"relative",transition:"background 0.2s"}}>
                      <div style={{position:"absolute",top:3,left:potOn?25:3,width:24,height:24,
                        borderRadius:"50%",background:"#fff",transition:"left 0.2s",
                        boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
                    </div>
                  </div>
                  <div style={{color:T.txt2,fontSize:S.fs-13,marginTop:6,lineHeight:1.35}}>
                    Betrag bleibt in dieser Kategorie, wird aber vom Unvorhergesehenes-Budget abgezogen.
                  </div>
                </div>
              )}

              {/* 9a. Tank-Erfassung (nur bei Kategorie "Tanken") */}
              {_showFuelFields&&(
                <div style={{background:"rgba(255,255,255,0.04)",borderRadius:11,padding:"10px 12px",marginBottom:8,border:`1px solid ${T.bd}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,color:T.txt,fontSize:S.fs-10,fontWeight:700}}>
                    {Li("fuel",16,T.acc_gold)} Tank-Erfassung
                  </div>
                  <div style={{color:T.txt2,fontSize:S.fs-6,marginBottom:4}}>Fahrzeug</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                    {(vehicles||[]).map(v=>{
                      const on = fuelVehicleId===v.id;
                      return (
                        <div key={v.id} style={{display:"inline-flex",alignItems:"center",gap:3}}>
                          <button onClick={()=>setFuelVehicleId(v.id)}
                            style={{padding:"5px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                              fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",fontWeight:600,display:"inline-flex",alignItems:"center",gap:5,
                              border:`1.5px solid ${on?T.gold:T.bd}`,
                              background:on?T.gold+"22":"rgba(255,255,255,0.04)",
                              color:on?T.gold:T.txt2}}>
                            {Li("car",16,on?T.gold:T.txt2)} {v.name}
                            {v.plate&&<span style={{fontWeight:400,opacity:0.75}}>· {v.plate}</span>}
                          </button>
                          {on&&(
                            <button onClick={()=>startEditVehicle(v)} title="Fahrzeug bearbeiten"
                              style={{padding:4,borderRadius:7,cursor:"pointer",
                                border:`1.5px solid ${T.bd}`,background:"rgba(255,255,255,0.04)",
                                display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                              {Li("pencil",16,T.txt2)}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {!showNewVehicle && (
                      <button onClick={()=>{setEditingVehicleId(null);setNewVehicleName("");setNewVehiclePlate("");setShowNewVehicle(true);}}
                        style={{padding:"5px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                          fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",fontWeight:600,display:"inline-flex",alignItems:"center",gap:5,
                          border:`1.5px dashed ${T.bd}`,background:"transparent",color:T.txt2}}>
                        {Li("plus",16,T.txt2)} neues Fahrzeug
                      </button>
                    )}
                  </div>
                  {showNewVehicle&&(
                    <div style={{marginBottom:8}}>
                      <div style={{display:"flex",gap:6,marginBottom:6}}>
                        <input type="text" value={newVehicleName} onChange={e=>setNewVehicleName(e.target.value)}
                          placeholder="Name (z.B. Golf)" autoFocus
                          style={{...INP_GROSS,flex:1,minWidth:0,marginBottom:0}}/>
                        <input type="text" value={newVehiclePlate} onChange={e=>setNewVehiclePlate(e.target.value)}
                          placeholder="Kennzeichen (optional)"
                          style={{...INP_GROSS,flex:1,minWidth:0,marginBottom:0}}/>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{setShowNewVehicle(false);setEditingVehicleId(null);setNewVehicleName("");setNewVehiclePlate("");}}
                          style={{flex:1,padding:"6px 12px",borderRadius:9,border:`1.5px solid ${T.bd}`,
                            background:"transparent",color:T.txt2,fontFamily:"inherit",fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",
                            fontWeight:700,cursor:"pointer"}}>
                          Abbrechen
                        </button>
                        <button onClick={saveVehicle}
                          style={{flex:1,padding:"6px 12px",borderRadius:9,border:"none",
                            background:T.gold,color:"#000",fontFamily:"inherit",fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",
                            fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                          {Li("check",16,"#000")} {editingVehicleId?"Speichern":"Anlegen"}
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,marginBottom:fuelComputedTotal!=null?8:0}}>
                    <div style={{flex:1}}>
                      <div style={LBL}>Liter</div>
                      <input value={fuelLiters} onChange={e=>setFuelLiters(e.target.value.replace(/[^0-9,.]/g,""))}
                        style={{...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",
                          fontFamily:NUM_FONT,textAlign:"right"}}
                        inputMode="decimal" placeholder="0,00"/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={LBL}>€/Liter</div>
                      <input value={fuelPricePerL} onChange={e=>setFuelPricePerL(e.target.value.replace(/[^0-9,.]/g,""))}
                        style={{...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",
                          fontFamily:NUM_FONT,textAlign:"right"}}
                        inputMode="decimal" placeholder="0,000"/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={LBL}>km-Stand</div>
                      <input value={odometer} onChange={e=>setOdometer(e.target.value.replace(/[^0-9]/g,""))}
                        style={{...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",
                          fontFamily:NUM_FONT,textAlign:"right",
                          border:odometerWarning?`1px solid ${T.gold}`:undefined}}
                        inputMode="numeric" placeholder="km"/>
                    </div>
                  </div>
                  {odometerWarning && (
                    <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:8,
                      background:`${T.gold}14`,border:`1px solid ${T.gold}55`,
                      borderRadius:8,padding:"6px 8px"}}>
                      {Li("alert-triangle",16,T.acc_gold)}
                      <span style={{color:T.acc_gold,fontSize:S.fs-6,lineHeight:1.4}}>{odometerWarning.message}</span>
                    </div>
                  )}
                  {fuelComputedTotal!=null && (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,
                      background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"7px 10px"}}>
                      <span style={{color:T.txt2,fontSize:S.fs-10}}>
                        berechnet: <b style={{color:T.txt}}>{betrag(fuelComputedTotal)}</b>
                      </span>
                      <button onClick={()=>setAmount(fuelComputedTotal.toFixed(2).replace(".",","))}
                        style={{padding:"4px 10px",borderRadius:7,border:"none",
                          background:T.blue,color:"#fff",fontFamily:"inherit",fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",
                          fontWeight:700,cursor:"pointer"}}>
                        Betrag übernehmen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 9b. Zielkategorie der Umbuchung — steht bewusst direkt unter der
                  Quellkategorie: beide beschreiben, wo die Buchung verbucht wird,
                  nur auf verschiedenen Konten. */}
              {umbuchung && transferToAcc && (<>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  {katFeld(tgtCats.find(c=>c.id===transferToCat)?.name, "Zielkategorie",
                    ()=>setKatPicker("ziel"))}
                  {katFeld(tgtSubs.find(o=>o.id===transferToSub)?.name, "Unterkategorie",
                    ()=>setKatPicker("zielSub"), !tgtSubs.length)}
                </div>
                <div style={{color:T.txt,fontSize:S.fs-8,marginBottom:S.gap,fontStyle:"italic"}}>
                  autom. verknüpfte Eingangs-Vormerkung auf Zielkonto anlegen
                </div>
              </>)}

              {/* 4. Intervall (Wiederkehrend/Finanzierung) */}
              {typ!=="einmalig"&&<>
                <div style={TRENNER}/>
                <div style={LBL}>Intervall</div>
                <div style={{display:"flex",gap:3,marginBottom:8}}>
                  {[[1,"mtl."],[3,"quartl."],[6,"halb."],[12,"jährl."]].map(([v,l])=>(
                    <button key={v} onClick={()=>setInterval_(v)}
                      style={{flex:1,minWidth:0,padding:`${S.pad}px ${S.pad/2}px`,borderRadius:S.radius,border:"none",
                        cursor:"pointer",fontFamily:"inherit",fontSize:S.fs-8,"--btn-fs":(S.fs-8)+"px",fontWeight:700,
                        background:interval_===v?T.blue:"rgba(255,255,255,0.08)",
                        color:interval_===v?T.on_accent:T.txt2}}>
                      {l}
                    </button>
                  ))}
                </div>
              </>}

              {/* 5. Letzter Tag (Wiederkehrend/Finanzierung) */}
              {typ!=="einmalig"&&(
                <div onClick={()=>{
                  const next = !lastOfMonth;
                  setLastOfMonth(next);
                  if(next && startDate) {
                    const [y,m] = startDate.split("-").map(Number);
                    const lastDay = new Date(y, m, 0).getDate();
                    setStartDate(`${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`);
                    setStartDateManual(true);
                  }
                  // fromDate immer mitaktualisieren wenn nicht manuell gesetzt
                  if(!fromDateManual) {
                    const d=_txDateForMonth(year,month);
                    setScopeFrom(d); setScopeTo(d);
                  }
                }} style={{display:"flex",alignItems:"center",gap:10,padding:`${S.pad}px ${S.padL}px`,
                  borderRadius:S.radius,cursor:"pointer",marginBottom:S.gap,
                  background:lastOfMonth?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${lastOfMonth?T.blue:T.bd}`}}>
                  <div style={{width:40,height:24,borderRadius:12,position:"relative",flexShrink:0,
                    background:lastOfMonth?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
                    <div style={{position:"absolute",top:3,left:lastOfMonth?19:3,width:18,height:18,
                      borderRadius:"50%",background:"#fff",transition:"left 0.2s",
                      boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                  </div>
                  <span style={{color:lastOfMonth?T.txt:T.txt2,fontSize:S.fs-6}}>Immer letzter Tag des Monats</span>
                </div>
              )}

              {/* 6. Anzahl / Enddatum (Wiederkehrend/Finanzierung) */}
              {/* EINE Beschriftung ueber beiden Feldern statt zwei nebeneinander:
                  zwei Zeilen brachen unterschiedlich um, wodurch "kein Enddatum"
                  tiefer stand als das Anzahl-Feld daneben. */}
              {typ!=="einmalig"&&<>
                <div style={LBL}>
                  {typ==="finanzierung"?"Anzahl Raten oder Enddatum":"Anzahl (7 Jahre) oder Enddatum"}
                </div>
                <div style={{display:"flex",gap:6,marginBottom:S.gap,alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0}}>
                  <input value={count} onChange={e=>{setCount(e.target.value);if(e.target.value)setEndDate("");}}
                    placeholder={typ==="finanzierung"?"z.B. 36":String(calcCount())}
                    inputMode="numeric"
                    style={{...INP_GROSS,marginBottom:0,padding:`0 ${S.pad}px`}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  {endDate?(
                    <div style={{display:"flex",gap:2,alignItems:"center"}}>
                      <input type="date" value={endDate}
                        onChange={e=>{setEndDate(e.target.value);if(e.target.value)setCount("");}}
                        style={{...INP_GROSS,marginBottom:0,flex:1,minWidth:0,
                          padding:`0 ${S.pad}px`,colorScheme:(isLightTheme())?"light":"dark"}}/>
                      <button onClick={()=>setEndDate("")}
                        style={{background:"none",border:"none",color:T.acc_neg,cursor:"pointer",padding:"4px"}}>
                        {Li("x",16)}
                      </button>
                    </div>
                  ):(
                    <button onClick={()=>{
                      setEndDate(new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10));
                      setCount("");
                    }} style={{...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",
                      cursor:"pointer",color:T.txt2,textAlign:"left",fontFamily:"inherit",
                      border:`1px solid ${T.gold}44`,background:"transparent"}}>
                      kein Enddatum
                    </button>
                  )}
                </div>
                </div>
              </>}

              <div style={TRENNER}/>
              {/* 7+8. verursacht + Buchung am / Startdatum nebeneinander */}
              <div style={{...SPERRE,display:"flex",gap:6,marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{...LBL,display:"flex",alignItems:"center",gap:4}}>
                    {Li("calendar",16,T.txt)} verursacht
                  </div>
                  <div style={{display:"flex",gap:2,alignItems:"center"}}>
                    <input type="date" value={valueDate} onChange={e=>{setValueDate(e.target.value);setStartDateManual(true);}}
                      style={{...INP_GROSS,marginBottom:0,flex:1,minWidth:0,
                        padding:`0 ${S.pad}px`,colorScheme:(isLightTheme())?"light":"dark"}}/>
                    {valueDate&&<button onClick={()=>setValueDate("")}
                      style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:"4px",flexShrink:0}}>
                      {Li("x",16)}
                    </button>}
                  </div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={LBL}>
                    {typ==="einmalig"?"Banktag":"Startdatum"}
                  </div>
                  <input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);setStartDateManual(true);}}
                    style={{...INP_GROSS,marginBottom:0,
                      padding:`0 ${S.pad}px`,colorScheme:(isLightTheme())?"light":"dark"}}/>
                </div>
              </div>

              <div style={TRENNER}/>
              {/* 10. Beschreibung + Notiz zusammen */}
              {/* Abgerufene Beschreibungen sind oft deutlich laenger als die
                  Feldbreite ("PAYPAL *KINO KOBLENZ · VISA Debitkartenumsatz vom
                  …"). Das Feld zeigt deshalb erst eine Zeile, klappt beim
                  Antippen auf und wird erst beim naechsten Tipp zum
                  Eingabefeld — so oeffnet sich die Tastatur nicht schon beim
                  blossen Nachlesen. Bestaetigt wird mit dem Haekchen rechts
                  unten im Feld. */}
              <div style={LBL}>Beschreibung</div>
              <div style={{position:"relative",marginBottom:4}}>
                {descEdit ? (
                  <textarea value={desc} onChange={e=>setDesc(e.target.value)}
                    placeholder="z.B. Miete, Gehalt, Kfz-Steuer…" rows={1} autoFocus
                    ref={el=>{ if(el){ el.style.height="auto"; el.style.height=el.scrollHeight+"px"; } }}
                    style={{...INP_GROSS,height:"auto",minHeight:INPUT_H,
                      padding:`${S.pad}px ${S.padL}px ${S.pad+34}px`,resize:"none",
                      overflow:"hidden",fontFamily:"inherit",lineHeight:1.35}}/>
                ) : (
                  <div onClick={()=>{
                      // Gesperrt (Bank-Beschreibung): nur auf- und zuklappen.
                      if(bankGesperrt) { setDescOffen(v=>!v); return; }
                      if(!descOffen) setDescOffen(true);
                      else setDescEdit(true);
                    }}
                    title={bankGesperrt?"von der Bank gemeldet — nicht änderbar":undefined}
                    style={{...INP_GROSS,height:"auto",minHeight:INPUT_H,
                      padding:`${S.pad}px ${S.padL}px`,cursor:"pointer",
                      lineHeight:1.35,opacity:bankGesperrt?0.55:1,
                      color:desc?T.txt:T.txt2,
                      ...(descOffen
                        ? {whiteSpace:"pre-wrap",wordBreak:"break-word"}
                        : {whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"})}}>
                    {desc || "z.B. Miete, Gehalt, Kfz-Steuer…"}
                  </div>
                )}
                {descEdit && (
                  <button onClick={()=>{ setDescEdit(false); setDescOffen(false); }}
                    aria-label="Beschreibung übernehmen"
                    style={{position:"absolute",right:8,bottom:8,width:36,height:36,
                      minHeight:0,borderRadius:10,border:"none",cursor:"pointer",
                      background:T.gold,color:T.on_accent,"--btn-fs":"16px",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {Li("check",20,T.on_accent)}
                  </button>
                )}
              </div>
              {/* 11. Abweichende Erst-/Letztbuchung (nur Finanzierung) */}
              {typ==="finanzierung"&&(
                <div onClick={()=>{setCustomFirstLast(v=>{if(v){setFirstAmount("");setLastAmount("");}return !v;})}}
                  style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                    cursor:"pointer",padding:"5px 8px",borderRadius:8,
                    background:customFirstLast?"rgba(74,159,212,0.1)":"rgba(255,255,255,0.03)",
                    border:`1px solid ${customFirstLast?T.blue:T.bd}`}}>
                  <div style={{width:34,height:20,borderRadius:10,position:"relative",flexShrink:0,
                    background:customFirstLast?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
                    <div style={{position:"absolute",top:3,left:customFirstLast?19:3,width:18,height:18,
                      borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                  </div>
                  <span style={{color:customFirstLast?T.txt:T.txt2,fontSize:S.fs-6}}>Abweichende Anzahlung / Schlussrate</span>
                </div>
              )}
              {customFirstLast&&typ==="finanzierung"&&(
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={LBL}>Startbetrag (1. Buchung)</div>
                    <input value={firstAmount} onChange={e=>setFirstAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                      placeholder={amount||"0,00"} inputMode="decimal"
                      style={{...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",border:`1px solid ${T.blue}66`}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={LBL}>Endbetrag (letzte Buchung)</div>
                    <input value={lastAmount} onChange={e=>setLastAmount(e.target.value.replace(/[^0-9,\.]/g,""))}
                      placeholder={amount||"0,00"} inputMode="decimal"
                      style={{...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",border:`1px solid ${T.blue}66`}}/>
                  </div>
                </div>
              )}

              {/* 12. Vorschau (Wiederkehrend/Finanzierung) */}
              {typ!=="einmalig"&&(
                <div style={{background:"rgba(0,0,0,0.2)",borderRadius:9,padding:"8px 10px",
                  marginBottom:10,fontSize:S.fs-6,color:T.txt,lineHeight:1.6}}>
                  <span style={{color:T.acc_pos,fontWeight:700}}>
                    {isEdit&&seriesCount
                      ? `${seriesCount} ${typ==="finanzierung"?"Rate":"Buchung"}${seriesCount!==1?"n":""} in der Serie`
                      : totalCount>=84&&!count?"Unbegrenzt (7 Jahre)"
                      : `${totalCount} ${typ==="finanzierung"?"Rate":"Buchung"}${totalCount!==1?"n":""}`}
                  </span>
                  {startDate&&<>{" · "}Start: {(()=>{const d=new Date(startDate);return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;})()}</>}
                  {endPreview&&<>{" · "}Ende: {endPreview}</>}
                  {totalCount>1&&<>{" · "}Erste 3: {preview.map(d=>{const dt=new Date(d);return `${pad(dt.getDate())}.${pad(dt.getMonth()+1)}`;}).join(", ")+(totalCount>3?"…":"")}</>}
                </div>
              )}

              {/* 13. Betrags-Abschnittsliste (nur Wiederkehrend im Bearbeiten-Modus) */}
              {isEdit&&editVorm._seriesId&&typ==="wiederkehrend"&&(()=>{
                const MONTHS_DE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
                const allSorted = txs.filter(t=>t._seriesId===editVorm._seriesId)
                  .sort((a,b)=>a.date.localeCompare(b.date));
                // Hauptbuchungen (keine Ausnahme-Markierung)
                const mainSorted = allSorted.filter(t=>!t._isException);
                if(mainSorted.length<1) return null;
                const total = mainSorted.length;
                // Betrags-Abschnitte aus Hauptbuchungen
                const sections = [];
                let cur = null;
                mainSorted.forEach(t=>{
                  const a = Math.round(t.totalAmount*100)/100;
                  if(!cur || cur.amt!==a) {
                    if(cur) sections.push(cur);
                    cur = {amt:a, from:t.date, to:t.date, count:1};
                  } else {
                    cur.to = t.date; cur.count++;
                  }
                });
                if(cur) sections.push(cur);
                // Ausnahmen (isException-Markierung)
                const exSorted = allSorted.filter(t=>t._isException);
                // Gruppiere Ausnahmen nach exSeriesId
                const exGroups = {};
                exSorted.forEach(t=>{
                  const k = t._exSeriesId||t.id;
                  if(!exGroups[k]) exGroups[k]={id:k,amt:t.totalAmount,dates:[]};
                  exGroups[k].dates.push(t.date);
                });
                const fmtMY = iso => {
                  const d=new Date(iso); return `${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
                };
                return (
                  <div style={{marginBottom:8,background:"rgba(0,0,0,0.15)",borderRadius:9,
                    padding:"8px 10px",fontSize:S.fs-6}}>
                    <div style={{color:T.txt,fontWeight:700,marginBottom:6}}>
                      {total}× insgesamt
                    </div>
                    {sections.map((s,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",
                        padding:"3px 0",borderBottom:`1px solid ${T.bd}`,alignItems:"center"}}>
                        <span style={{color:T.txt2}}>
                          {s.count===total
                            ? `${fmtMY(s.from)} – ${fmtMY(s.to)}`
                            : s.count===1 ? fmtMY(s.from)
                            : `${fmtMY(s.from)} – ${fmtMY(s.to)}`}
                          {s.count>1&&sections.length>1&&
                            <span style={{color:T.txt2,opacity:0.6}}> ({s.count}×)</span>}
                        </span>
                        <span style={{color:T.acc_pos,fontWeight:700,fontFamily:NUM_FONT}}>
                          {betrag(s.amt)} €
                        </span>
                      </div>
                    ))}
                    {Object.values(exGroups).map(ex=>(
                      <div key={ex.id} style={{display:"flex",justifyContent:"space-between",
                        padding:"3px 0",borderBottom:`1px solid ${T.bd}`,alignItems:"center"}}>
                        <span style={{color:T.acc_gold,display:"flex",alignItems:"center",gap:4}}>
                          {Li("star",16,T.acc_gold)}
                          {ex.dates.length===1
                            ? fmtMY(ex.dates[0])
                            : `${fmtMY(ex.dates[0])} · ${ex.dates.length}×`}
                        </span>
                        <span style={{color:T.acc_gold,fontWeight:700,fontFamily:NUM_FONT}}>
                          {betrag(ex.amt)} €
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {error&&<div style={{color:T.acc_neg,fontSize:S.fs-6,marginBottom:8}}>{error}</div>}

              {/* ── Verknüpfen: Vormerkung → Buchung ── */}
              {isEdit&&editVorm&&<VormVerknuepfenPanel editVorm={editVorm} txs={txs} setTxs={setTxs} onClose={onClose}/>}

              {/* Scope-Auswahl im Bearbeiten-Modus */}
              {isEdit&&editVorm._seriesId&&(()=>{
                const isLight2=isLightTheme();
                const csD={colorScheme:isLight2?"light":"dark"};
                const inpStyle={...INP_GROSS,marginBottom:0,width:"100%",boxSizing:"border-box",...csD,
                  border:`1px solid ${T.blue}66`};
                return (
                <div style={{marginBottom:8}}>
                  <div style={{color:T.txt2,fontSize:S.fs-6,marginBottom:4}}>Änderung anwenden auf:</div>
                  {/* 4 Scope-Buttons */}
                  <div style={{display:"flex",gap:3,marginBottom:8}}>
                    {[["single","nur dieser"],["range","von … bis"],["from","ab dieser"],["all","alle"]].map(([v,l])=>(
                      <button key={v} onClick={()=>{
                        setEditScope(v);
                        setFromDateManual(false);
                        const d=_txDateForMonth(year,month);
                        if(v==="single"){setScopeFrom(d);setScopeTo(d);}
                        else if(v==="from"){setScopeFrom(d);}
                        else if(v==="range"){setScopeFrom(d);setScopeTo(d);}
                      }}
                        style={{flex:1,minWidth:0,padding:`${S.pad}px ${S.pad/2}px`,borderRadius:S.radius,border:"none",cursor:"pointer",
                          fontFamily:"inherit",fontSize:S.fs-6,"--btn-fs":(S.fs-6)+"px",fontWeight:editScope===v?700:400,
                          background:editScope===v?T.blue:"rgba(255,255,255,0.08)",
                          color:editScope===v?T.on_accent:T.txt2}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {/* Datumfelder je nach Scope */}
                  {editScope==="single"&&(
                    <div style={{color:T.txt2,fontSize:S.fs-6,padding:"4px 0",opacity:0.8}}>
                      Buchung im gewählten Monat <strong style={{color:T.acc}}>{MONTHS_F[month]} {year}</strong> wird geändert.
                    </div>
                  )}
                  {editScope==="range"&&(
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={LBL}>Von</div>
                        <input type="date" value={scopeFrom}
                          onChange={e=>{setScopeFrom(e.target.value);setFromDateManual(true);}}
                          style={inpStyle}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={LBL}>Bis</div>
                        <input type="date" value={scopeTo}
                          onChange={e=>{setScopeTo(e.target.value);setFromDateManual(true);}}
                          style={inpStyle}/>
                      </div>
                    </div>
                  )}
                  {editScope==="from"&&(
                    <div>
                      <div style={LBL}>Ab diesem Datum:</div>
                      <input type="date" value={scopeFrom}
                        onChange={e=>{setScopeFrom(e.target.value);setFromDateManual(true);}}
                        style={inpStyle}/>
                      <div style={{color:T.txt2,fontSize:S.fs-10,marginTop:2,opacity:0.7}}>
                        Alle Buchungen ab hier bis zum Ende der Serie werden geändert.
                      </div>
                    </div>
                  )}
                  {editScope==="all"&&(
                    <div style={{color:T.txt2,fontSize:S.fs-6,padding:"4px 0",opacity:0.8}}>
                      Alle Buchungen der gesamten Serie werden geändert.
                    </div>
                  )}
                </div>
                );
              })()}

              {/* ── Eingebettete Ausnahme-Serien ── */}
              {isEdit&&editVorm._seriesId&&!editVorm._isException&&(
                <div style={{marginBottom:8}}>
                  {/* Vorhandene Ausnahme-Serien anzeigen */}
                  {exSeries.length>0&&(
                    <div style={{marginBottom:6}}>
                      <div style={{color:T.txt2,fontSize:S.fs-6,fontWeight:700,marginBottom:4}}>
                        Eingebettete Ausnahmen:
                      </div>
                      {exSeries.map(ex=>{
                        const [exScopeOpen, setExScopeOpen] = [false, ()=>{}]; // placeholder
                        const firstD = new Date(ex.first.date);
                        const lastD  = new Date(ex.last.date);
                        const pad2 = n=>String(n).padStart(2,"0");
                        const fmtD = d=>`${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
                        const intervalLabel = ex.interval===12?"jährl.":ex.interval===3?"quartl.":"mtl.";
                        return (
                          <div key={ex.id} style={{background:"rgba(245,166,35,0.08)",
                            border:`1px solid ${T.gold}44`,borderRadius:9,
                            padding:"6px 10px",marginBottom:4,
                            display:"flex",alignItems:"center",gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{color:T.acc_gold,fontSize:S.fs-6,fontWeight:700}}>
                                {betrag(ex.amount)} · {intervalLabel} · {ex.items.length}×
                              </div>
                              <div style={{color:T.txt2,fontSize:S.fs-10}}>
                                {fmtD(firstD)} – {fmtD(lastD)}
                              </div>
                            </div>
                            <button onClick={()=>{
                              setExEditId(ex.id);
                              setExAmount(String(ex.amount).replace(".",","));
                              setExInterval(ex.interval);
                              setExStartDate(ex.first.date);
                              setExCount(String(ex.items.length));
                              setShowExForm(true);
                            }} style={{background:"rgba(255,255,255,0.08)",border:"none",
                              color:T.txt2,borderRadius:7,padding:"4px 8px",
                              fontSize:S.fs-6,"--btn-fs":(S.fs-6)+"px",cursor:"pointer",fontFamily:"inherit"}}>
                              {Li("edit-2",16,T.txt2)} Bearb.
                            </button>
                            <button onClick={()=>frageBestaetigung(
                              "Alle Ausnahmen dieser eingebetteten Serie löschen?",
                              ()=>handleDeleteException(ex.id,"all",""),
                              {jaLabel:"Löschen", ton:"gefahr"})} style={{background:`${T.neg}11`,border:"none",
                              color:T.acc_neg,borderRadius:7,padding:"4px 8px",
                              fontSize:S.fs-6,"--btn-fs":(S.fs-6)+"px",cursor:"pointer",fontFamily:"inherit"}}>
                              {Li("trash-2",16,T.acc_neg)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Button neue Ausnahme-Serie */}
                  {!showExForm&&(
                    <button onClick={()=>{
                      setExEditId(null);
                      setExAmount("");
                      // Startdatum = passende Buchung im aktiven Monat
                      const pad2 = n=>String(n).padStart(2,"0");
                      const monthStr = `${year}-${pad2(month+1)}`;
                      const found = txs.find(t=>t._seriesId===editVorm._seriesId
                        && !t._exSeriesId && t.date.startsWith(monthStr));
                      setExStartDate(found?.date || _txDateForMonth(year, month));
                      setExCount(""); setExInterval(12);
                      setShowExForm(true);
                    }} style={{width:"100%",padding:"7px 10px",borderRadius:9,
                      border:`1px dashed ${T.gold}66`,
                      background:"rgba(245,166,35,0.06)",
                      color:T.acc_gold,fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      {Li("plus-circle",16,T.acc_gold)} Eingebettete Ausnahme-Serie
                    </button>
                  )}

                  {/* Formular für Ausnahme-Serie */}
                  {showExForm&&(
                    <div style={{background:"rgba(245,166,35,0.06)",border:`1px solid ${T.gold}44`,
                      borderRadius:10,padding:"10px 12px",marginBottom:4}}>
                      <div style={{color:T.acc_gold,fontSize:S.fs-10,fontWeight:700,marginBottom:8,
                        display:"flex",alignItems:"center",gap:6}}>
                        {Li("git-branch",16,T.acc_gold)}
                        {exEditId ? "ausnahme bearbeiten" : "abweichenden Betrag setzen"}
                      </div>

                      {/* Betrag */}
                      <div style={LBL}>Betrag für Ausnahme-Monate</div>
                      <input value={exAmount} onChange={e=>setExAmount(e.target.value.replace(/[^0-9,.]/g,""))}
                        placeholder="z.B. 4172,58" inputMode="decimal"
                        style={{...INP_GROSS,marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

                      {/* Startdatum */}
                      <div style={LBL}>Erster Ausnahme-Monat</div>
                      <input type="date" value={exStartDate}
                        onChange={e=>setExStartDate(e.target.value)}
                        style={{...INP_GROSS,marginBottom:8,width:"100%",boxSizing:"border-box",
                          padding:`0 ${S.pad}px`,colorScheme:(isLightTheme())?"light":"dark"}}/>

                      {/* Rhythmus */}
                      <div style={LBL}>Rhythmus</div>
                      <div style={{display:"flex",gap:3,marginBottom:8}}>
                        {[[1,"monatlich"],[3,"quartalsw."],[12,"jährlich"]].map(([v,l])=>(
                          <button key={v} onClick={()=>setExInterval(v)}
                            style={{flex:1,padding:"6px 2px",borderRadius:8,border:"none",
                              cursor:"pointer",fontFamily:"inherit",fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",fontWeight:700,
                              background:exInterval===v?T.gold:"rgba(255,255,255,0.08)",
                              color:exInterval===v?T.on_accent:T.txt2}}>
                            {l}
                          </button>
                        ))}
                      </div>

                      {/* Anzahl */}
                      <div style={LBL}>Anzahl (leer = alle passenden)</div>
                      <input value={exCount} onChange={e=>setExCount(e.target.value.replace(/[^0-9]/g,""))}
                        placeholder={`z.B. ${Math.ceil(81/exInterval)}`} inputMode="numeric"
                        style={{...INP_GROSS,marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

                      {/* Vorschau */}
                      {exStartDate&&exAmount&&(()=>{
                        const mainTxs = txs.filter(t=>t._seriesId===editVorm._seriesId&&!t._exSeriesId)
                          .sort((a,b)=>a.date.localeCompare(b.date));
                        const n = exCount ? parseInt(exCount)||1 : 99;
                        const matches = mainTxs.filter(t=>{
                          if(t.date < exStartDate) return false;
                          const d=new Date(t.date), s=new Date(exStartDate);
                          const md=(d.getFullYear()-s.getFullYear())*12+(d.getMonth()-s.getMonth());
                          return md>=0 && md%exInterval===0;
                        }).slice(0,n);
                        if(!matches.length) return <div style={{color:T.acc_neg,fontSize:S.fs-6,marginBottom:6}}>
                          Keine passenden Monate in der Serie gefunden.
                        </div>;
                        const pad2=n=>String(n).padStart(2,"0");
                        const first=new Date(matches[0].date);
                        const last=new Date(matches[matches.length-1].date);
                        return <div style={{background:"rgba(0,0,0,0.2)",borderRadius:7,
                          padding:"6px 8px",marginBottom:8,fontSize:S.fs-6,color:T.txt2}}>
                          <span style={{color:T.acc_gold,fontWeight:700}}>{matches.length}× wird geändert</span>
                          {" · "}{pad2(first.getDate())}.{pad2(first.getMonth()+1)}.{first.getFullYear()}
                          {matches.length>1&&<> – {pad2(last.getDate())}.{pad2(last.getMonth()+1)}.{last.getFullYear()}</>}
                          <div style={{color:T.txt2,marginTop:3,fontSize:S.fs-10}}>
                            Diese Monate bekommen {exAmount.replace(".",",")} € statt {betrag(seriesAmtInfo.regularAmt)} €
                          </div>
                        </div>;
                      })()}

                      <div style={{display:"flex",gap:6}}>
                        <button onClick={handleSaveException}
                          style={{flex:1,padding:"8px",borderRadius:9,border:"none",
                            background:T.gold,color:T.on_accent,fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",
                            fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          {Li("check",16,T.on_accent)} {exEditId?"Aktualisieren":"Einfügen"}
                        </button>
                        <button onClick={()=>{setShowExForm(false);setExEditId(null);}}
                          style={{padding:"8px 12px",borderRadius:9,
                            border:`1px solid ${T.bd}`,background:"transparent",
                            color:T.txt2,fontSize:S.fs-10,"--btn-fs":(S.fs-10)+"px",cursor:"pointer",fontFamily:"inherit"}}>
                          {Li("x",16,T.txt2)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notiz */}
              <div style={LBL}>Notiz (optional)</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Notiz…" rows={2}
                style={{...INP_GROSS,resize:"none",fontFamily:"inherit",lineHeight:1.4,
                  marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

              {/* Tags — quer über Kategorien hinweg durchsuchbar (z.B. "#aida") */}
              <div style={{color:T.txt2,fontSize:S.fs-6,marginBottom:3,display:"flex",alignItems:"center",gap:4}}>
                {Li("hash",16,T.acc)} Tags (optional)
              </div>
              <TagInput value={tags} onChange={setTags} suggestions={allTags}/>

              <div style={{display:"flex",gap:6}}>
                <button onClick={handleSave}
                  style={{flex:1,minWidth:0,padding:`${S.padL}px`,borderRadius:S.radius,border:"none",
                    background:saved?T.pos:T.gold,color:saved?"#fff":T.on_accent,
                    fontSize:S.fs-6,"--btn-fs":(S.fs-6)+"px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    transition:"background 0.2s"}}>
                  {saved?<>{Li("check",20,"#fff")} Gespeichert!</>:
                   isEdit?<>{Li("check",20,T.on_accent)} Speichern</>:
                   typ==="einmalig"?<>{Li("plus",20,T.on_accent)} Vormerkung erstellen</>:
                   typ==="finanzierung"?<>{Li("credit-card",20,T.on_accent)} {totalCount} Rate{totalCount!==1?"n":""} erstellen</>:
                   <>{Li("repeat",20,T.on_accent)} {count?`${totalCount}× `:""}Wiederkehrend anlegen</>}
                </button>
                {isEdit&&(
                  <button onClick={handleDelete}
                    style={{padding:`${S.padL}px ${S.padL}px`,borderRadius:S.radius,border:`1px solid ${T.neg}44`,
                      background:`${T.neg}11`,color:T.acc_neg,fontSize:S.fs-6,"--btn-fs":(S.fs-6)+"px",cursor:"pointer",fontFamily:"inherit",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {Li("trash-2",20,T.acc_neg)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* WIEDERKEHRENDE ERKENNEN */}
          <VormHubSecToggle label="wiederkehrende aus CSV erkennen" icon="search"
            active={secErkennen} onToggle={()=>{setSecErkennen(v=>!v);if(!secErkennen)setSecKategorien(false);}}
            accent={T.mid}/>
          {secErkennen&&(
            <div style={{minHeight:300}}>
              <RecurringDetectionScreen embedded onClose={onClose} initialTab="vormerkung" onOpenVormHub={prefill=>{setDesc(prefill.desc||"");setAmount(String(prefill.totalAmount||"").replace(".",","));setCsvType(prefill._csvType||"expense");setInterval_(prefill.repeatMonths||1);setStartDate(prefill.date||today);if(prefill.splits?.[0]?.catId){setCatId(prefill.splits[0].catId);setSubId(prefill.splits[0].subId||"");}setTyp("wiederkehrend");setSecErkennen(false);setSecNeu(true);}}/>
            </div>
          )}

          {/* BUCHUNGEN KATEGORISIEREN */}
          <VormHubSecToggle label="buchungen kategorisieren" icon="tag"
            active={secKategorien} onToggle={()=>{setSecKategorien(v=>!v);if(!secKategorien)setSecErkennen(false);}}
            accent={T.pos}/>
          {secKategorien&&(
            <div style={{minHeight:300}}>
              <RecurringDetectionScreen embedded onClose={onClose} initialTab="kategorisieren" onOpenVormHub={prefill=>{setDesc(prefill.desc||"");setAmount(String(prefill.totalAmount||"").replace(".",","));setCsvType(prefill._csvType||"expense");setInterval_(prefill.repeatMonths||1);setStartDate(prefill.date||today);if(prefill.splits?.[0]?.catId){setCatId(prefill.splits[0].catId);setSubId(prefill.splits[0].subId||"");}setTyp("wiederkehrend");setSecKategorien(false);setSecNeu(true);}}/>
            </div>
          )}

          <div style={{height:20}}/>
        </div>
      </div>
    </div>
  );
}

export { VormerkungHub };
