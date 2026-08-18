// Persistenter Hinweis-Badge: Offline-Status bzw. "noch nicht synchronisiert".
// Anders als das CloudSaveModal (nur bei Wisch-Geste sichtbar) ist dieses
// Badge dauerhaft eingeblendet, damit unsynchronisierte Änderungen nicht
// unbemerkt bleiben. Antippen öffnet den Cloud-Speichern-Dialog.
//
// Rendert als normales Flow-Element ganz oben (wie die Liquiditäts-Engpass-
// Leiste in App.jsx) statt als position:fixed-Overlay — sonst würde es den
// großen Kontostand im Dashboard überlagern statt eigenen Platz zu bekommen.
import React, { useContext } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { aufToenung } from "../../theme/amtPill.js";
import { getSyncBadgeState } from "../../utils/syncBadge.js";

function SyncStatusBadge() {
  const { isOnline, cfActive, isDirty, syncStatus, openCloudSave, loadFromCloud, frageBestaetigung } = useContext(AppCtx);
  const state = getSyncBadgeState({ isOnline, cfActive, isDirty, syncStatus });
  if (!state) return null;

  // ZWEI Farben aus derselben Rolle, nicht eine:
  //   `col`     — der Rohton. Nur fuer Flaeche, Rahmen und den Punkt links;
  //               ein Alpha-Suffix ("22"/"77") braucht einen echten Hex-Wert.
  //   `schrift` — die Schriftfarbe, gerechnet gegen die GETOENTE Flaeche.
  //
  // Vorher stand hier nur `col`, auch als Schriftfarbe: helles Gold auf einer
  // 13-%-Toenung desselben Golds — der Hinweis „Nicht synchronisiert" war auf
  // heller Platte kaum zu lesen (Nutzer-Hinweis).
  //
  // `aufToenung` ist genau dafuer da: es rechnet den Untergrund erst zusammen
  // (Toenung UEBER der Platte, also in Richtung der Schrift verschoben) und
  // gibt den Wunschton nur zurueck, wenn er darauf traegt — sonst Schwarz oder
  // Weiss. Ein fester Ersatzton haette nicht gereicht: nachgerechnet fielen
  // 57 von 136 Theme-/Ton-Kombinationen unter 4,5:1, quer durch die Themes.
  const col = T[state.tone];
  const schrift = aufToenung(col, 0x22 / 255);

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
          background:`${col}22`,border:`1.5px solid ${col}77`,
          color:schrift,fontSize:14,fontWeight:700,cursor:"pointer",
          textAlign:"center",lineHeight:1.25}}>
        <span style={{width:9,height:9,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}/>
        {state.text}
      </div>
    </div>
  );
}

export { SyncStatusBadge };
