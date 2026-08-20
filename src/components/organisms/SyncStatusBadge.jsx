// Persistenter Hinweis-Badge: Offline-Status bzw. "noch nicht synchronisiert".
// Anders als das CloudSaveModal (nur bei Wisch-Geste sichtbar) ist dieses
// Badge dauerhaft eingeblendet, damit unsynchronisierte Änderungen nicht
// unbemerkt bleiben. Antippen öffnet den Cloud-Speichern-Dialog.
//
// Rendert als normales Flow-Element ganz oben (wie die Liquiditäts-Engpass-
// Leiste in App.jsx) statt als position:fixed-Overlay — sonst würde es den
// großen Kontostand im Dashboard überlagern statt eigenen Platz zu bekommen.
import React, { useContext, useEffect, useSyncExternalStore } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { knopfPaar, DUNKEL } from "../../theme/amtPill.js";
import { Li } from "../../utils/icons.jsx";
import { getSyncBadgeState } from "../../utils/syncBadge.js";

// ── Der Hinweis darf nur EINMAL auf dem Bildschirm stehen ────────────────
//
// Er wird an zwei Stellen gerendert: im Hero (direkt unter dem Saldo, wo er
// hingehört) und ganz oben, für Bildschirme ohne Hero. Welche Bildschirme
// einen Hero haben, stand als feste Liste in App.jsx
// (`mainTab==="erfassen" && (subTab==="dashboard" || subTab==="monat")`) — und
// die war unvollständig: Die Jahresansicht rendert ihren Hero über
// `YearSectionHeader`, taucht in der Liste aber nicht auf. Ergebnis: zweimal
// „Nicht synchronisiert" übereinander (Nutzer-Bild).
//
// Statt die Liste zu pflegen (und beim nächsten Bildschirm mit Hero wieder zu
// vergessen), meldet sich der Hero-Hinweis selbst an. Solange einer angemeldet
// ist, hält sich der obere zurück. Ein winziger externer Speicher statt eines
// Context: Der obere Hinweis und der Hero liegen in verschiedenen Ästen des
// Baums, ein Provider müsste dafür um die ganze App gelegt werden.
let _heroBadges = 0;
const _hoerer = new Set();
const _melden = () => _hoerer.forEach((h) => h());
const _abonnieren = (h) => { _hoerer.add(h); return () => _hoerer.delete(h); };
const _stand = () => _heroBadges > 0;

// Für App.jsx: Steht der Hinweis gerade im Hero? Dann braucht die Leiste oben
// auch keinen Platz zu reservieren (`--sync-badge-space`).
export function useHeroBadgeAktiv() {
  return useSyncExternalStore(_abonnieren, _stand, () => false);
}

// `imHero`: Diese Instanz sitzt unter dem Saldo. Sie gewinnt immer — dort ist
// der Hinweis am richtigen Ort, direkt bei den Zahlen, um die es geht.
function SyncStatusBadge({ imHero = false }) {
  const { isOnline, cfActive, isDirty, syncStatus, openCloudSave, loadFromCloud, frageBestaetigung } = useContext(AppCtx);
  const state = getSyncBadgeState({ isOnline, cfActive, isDirty, syncStatus });
  const heroDa = useHeroBadgeAktiv();

  // An-/Abmelden — nur die Hero-Instanz, und nur solange sie wirklich etwas
  // anzeigt. Ein Hero ohne Hinweis darf den oberen nicht unterdrücken.
  const sichtbar = !!state;
  useEffect(() => {
    if (!imHero || !sichtbar) return;
    _heroBadges += 1; _melden();
    return () => { _heroBadges -= 1; _melden(); };
  }, [imHero, sichtbar]);

  if (!state) return null;
  if (!imHero && heroDa) return null;

  // VOLLE Signalflaeche statt Toenung.
  //
  // Vorher trug das Badge den jeweiligen Theme-Ton als 13-%-Toenung. Ueber 34
  // Themes hinweg ergab das mal Oliv, mal Senf, mal ein blasses Gruen — „nicht
  // Fisch, nicht Fleisch" (Nutzer-Wort). Eine Ampel muss ueberall dieselbe
  // Ampel sein, deshalb kommen die vier Toene jetzt fest aus syncBadge.js und
  // nicht aus dem Theme.
  //
  // `knopfPaar` rechnet die Schrift gegen die Flaeche und weicht auf
  // Schwarz/Weiss aus; im Ausnahmefall rueckt es die Flaeche minimal nach. Auf
  // dem Sonnengelb landet damit dunkle Schrift bei rund 11:1.
  //
  // Damit entfaellt auch die Frage, worauf das Badge liegt: eine deckende
  // Flaeche bringt ihren Untergrund selbst mit. Vorher musste der Aufrufer die
  // Karte durchreichen, auf der es sitzt — das braucht es jetzt nicht mehr.
  const { grund, schrift } = knopfPaar(state.signal, DUNKEL);

  // "cloud_newer": ein anderes Gerät hat neuere Daten gespeichert (z.B. eine
  // dort vorgenommene Vormerkungs-Verknüpfung) — Antippen lädt sie direkt,
  // statt (wie sonst) den reinen Hochladen-Dialog zu öffnen. Vorher NUR über
  // Einstellungen → "Cloudflare → Lokal" erreichbar; das machte den Hinweis
  // faktisch unsichtbar, weil er nirgends im normalen Nutzungsfluss auftauchte.
  const onTap = state.key === "cloud_newer"
    ? () => frageBestaetigung?.(
        "Neuere Daten aus der Cloud laden?\n\nLokale Änderungen seit dem letzten Sync werden dabei überschrieben.",
        () => loadFromCloud?.(),
        { jaLabel: "Laden", ton: "gefahr" })
    : openCloudSave;

  // Deutlich größere Trefferfläche als früher: die schmale Pille (5px Polster,
  // 11,5px Schrift) klebte oben am Bildschirmrand direkt unter der Notch und
  // war kaum zu treffen (Nutzer-Hinweis). Jetzt eine volle Zeile mit 48px
  // Mindesthöhe — dieselbe Größe, die auch alle anderen antippbaren Zeilen der
  // App haben (siehe .mobile-modal button in themes.css).
  return (
    <div style={{display:"flex",justifyContent:"center",padding:"6px 12px 2px",flexShrink:0}}>
      <div onClick={onTap} role="button"
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,
          width:"100%",minHeight:48,boxSizing:"border-box",
          padding:"10px 16px",borderRadius:14,
          background:grund,border:"none",
          color:schrift,fontSize:14,fontWeight:700,cursor:"pointer",
          textAlign:"center",lineHeight:1.25}}>
        {/* Symbol statt Farbpunkt: der Punkt hatte dieselbe Farbe wie die
            Flaeche und waere darauf unsichtbar. Wichtiger noch — die Aussage
            darf nicht allein an der Farbe haengen (Rot-Gruen-Sehschwaeche). */}
        {Li(state.icon, 16, schrift)}
        {state.text}
      </div>
    </div>
  );
}

export { SyncStatusBadge };
