// Persistenter Hinweis-Badge: Offline-Status bzw. "noch nicht synchronisiert".
// Anders als das CloudSaveModal (nur bei Wisch-Geste sichtbar) ist dieses
// Badge dauerhaft eingeblendet, damit unsynchronisierte Änderungen nicht
// unbemerkt bleiben. Antippen öffnet den Cloud-Speichern-Dialog.
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
    <div onClick={openCloudSave}
      style={{position:"fixed",top:"calc(env(safe-area-inset-top,0px) + 8px)",
        left:"50%",transform:"translateX(-50%)",zIndex:350,
        display:"flex",alignItems:"center",gap:6,
        padding:"5px 12px",borderRadius:999,
        background:`${col}1F`,border:`1px solid ${col}66`,
        color:col,fontSize:11.5,fontWeight:700,cursor:"pointer",
        boxShadow:"0 4px 14px rgba(0,0,0,0.25)",whiteSpace:"nowrap"}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}/>
      {state.text}
    </div>
  );
}

export { SyncStatusBadge };
