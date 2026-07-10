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
import { getSyncBadgeState } from "../../utils/syncBadge.js";

function SyncStatusBadge() {
  const { isOnline, cfActive, isDirty, syncStatus, openCloudSave } = useContext(AppCtx);
  const state = getSyncBadgeState({ isOnline, cfActive, isDirty, syncStatus });
  if (!state) return null;

  const col = T[state.tone];

  return (
    <div style={{display:"flex",justifyContent:"center",padding:"3px 12px 0",flexShrink:0}}>
      <div onClick={openCloudSave}
        style={{display:"flex",alignItems:"center",gap:6,
          padding:"5px 12px",borderRadius:999,
          background:`${col}1F`,border:`1px solid ${col}66`,
          color:col,fontSize:11.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}/>
        {state.text}
      </div>
    </div>
  );
}

export { SyncStatusBadge };
