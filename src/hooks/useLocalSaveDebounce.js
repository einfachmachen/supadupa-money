// Auto-Save des Finanzdatenstands nach IndexedDB, entkoppelt aus App.jsx.
//
// Verhalten (unverändert gegenüber der Inline-Version):
//   • Debounce 300 ms: viele setX-Aufrufe in Folge lösen nur EINEN Save aus
//     (ein JSON.stringify, ein IDB-Schreibslot statt 4× pro Klick).
//   • Flush bei beforeunload / pagehide / visibilitychange→hidden: ein noch
//     ausstehender Debounce wird sofort geschrieben (wichtig für iOS-Wegswipe).
//   • jsub_-Schlüssel werden vor dem Speichern aus yearData entfernt (abgeleitet,
//     gehören nicht persistiert).
//   • csvRules zusätzlich als eigenständiges Mini-Backup in den kvStore.
//   • Fehler beim Schreiben werden sichtbar gemacht (setSyncError/setSyncStatus),
//     nicht verschluckt.
//
// Eingaben:
//   lsKey         – IDB-Schlüssel des Hauptstands (z.B. "finanzapp_v9")
//   state         – { cats, groups, txs, accounts, vehicles, yearData, col3Name,
//                     quickBtns, quickColors, csvRules, budgets, customIcons,
//                     startBalances }
//   loading       – true solange initial geladen wird → Save aussetzen
//   setSyncStatus, setSyncError, setIsDirty – Status-Setter aus App
import { useEffect, useRef } from "react";
import { kvStore } from "../utils/kvStore.js";

export function useLocalSaveDebounce({ lsKey, state, loading, setSyncStatus, setSyncError, setIsDirty }) {
  const {
    cats, groups, txs, accounts, vehicles, yearData, col3Name,
    quickBtns, quickColors, csvRules, budgets, customIcons, startBalances,
  } = state;

  const saveTimerRef   = useRef(null);
  const pendingSaveRef = useRef(null); // letzter Save-Job für den beforeunload-Flush

  // loading via Ref lesen, damit der Debounce-Effekt exakt wie im Original NUR
  // von den 12 Datenfeldern abhängt (nicht von loading) — sonst würde ein
  // loading-Wechsel einen zusätzlichen Save-Lauf auslösen.
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  // doSaveLocal in Ref halten, damit der Flush-Effekt (deps: []) immer die
  // aktuelle Variante nutzt, ohne neu zu registrieren.
  const doSaveLocalRef = useRef(null);
  doSaveLocalRef.current = (payload) => {
    try {
      let cleanYD = payload.yearData || {};
      let needsClone = false;
      Object.keys(cleanYD).forEach(y=>Object.keys(cleanYD[y]||{}).forEach(m=>{
        Object.keys(cleanYD[y][m]||{}).forEach(k=>{ if(k.startsWith("jsub_")) needsClone = true; });
      }));
      if(needsClone) {
        cleanYD = JSON.parse(JSON.stringify(cleanYD));
        Object.keys(cleanYD).forEach(y=>Object.keys(cleanYD[y]||{}).forEach(m=>{
          Object.keys(cleanYD[y][m]||{}).forEach(k=>{ if(k.startsWith("jsub_")) delete cleanYD[y][m][k]; });
        }));
      }
      const toStore = {...payload, yearData:cleanYD, saved_at:Date.now()};
      const serialized = JSON.stringify(toStore);
      // Großes Payload (bis 4-5 MB bei 10k+ Buchungen) AUSSCHLIESSLICH nach IDB:
      // localStorage.setItem ist synchron und blockiert die UI; IDB ist async.
      window.IDB.set(lsKey, serialized).catch(e=>{
        // Speichern fehlgeschlagen (Quota voll, Private Mode, …) — sichtbar machen
        console.error("IDB-Save fehlgeschlagen:", e);
        setSyncError(`⚠️ Lokales Speichern fehlgeschlagen: ${e?.message||e}`);
        setSyncStatus("error");
      });
      // csvRules separat als Mini-Backup (für Reset/Regen über RegenRulesButton)
      if(payload.csvRules && Object.keys(payload.csvRules).length>0) {
        try { kvStore.setItem("mbt_csvRules_backup", JSON.stringify(payload.csvRules)); } catch(e){}
      }
      setIsDirty(true);
    } catch(e) {
      console.error("Serialisierung beim Speichern fehlgeschlagen:", e);
      setSyncError(`⚠️ Lokales Speichern fehlgeschlagen: ${e?.message||e}`);
      setSyncStatus("error");
    }
  };

  // Debounce-Save: feuert 300 ms nach der letzten Datenänderung.
  useEffect(()=>{
    if(loadingRef.current) return;
    const payload = {cats, groups, txs, accounts, vehicles, yearData, col3Name, quickBtns, quickColors, csvRules, budgets, customIcons, startBalances};
    pendingSaveRef.current = payload;
    if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(()=>{
      doSaveLocalRef.current(payload);
      pendingSaveRef.current = null;
    }, 300);
    return ()=>{ if(saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [cats, groups, txs, accounts, vehicles, yearData, col3Name, quickBtns, quickColors, csvRules, budgets, customIcons, startBalances]);

  // Flush bei App-Schließen/Tab-Wechsel: ausstehenden Debounce sofort schreiben.
  useEffect(()=>{
    const flush = () => {
      if(pendingSaveRef.current) {
        if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
        doSaveLocalRef.current(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    };
    const onVisChange = () => { if(document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisChange);
    return ()=>{
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, []);
}
