// Cloud-Zugangsdaten (Supabase / JSONBin / GitHub Gist / Cloudflare Worker),
// entkoppelt aus App.jsx. Reines State-/Persistenz-Management — KEINE
// Netzwerk-/Sync-Funktionen (die bleiben vorerst in App.jsx).
//
// Verhalten unverändert:
//   • Supa/JSONBin/Gist: aus kvStore initialisiert, einfache useState-Setter.
//   • Cloudflare: URL/Secret werden aus IndexedDB geladen (stabiler auf iOS),
//     Fallback kvStore; cfCredsReady signalisiert das Ende des Ladens. Die
//     öffentlichen Setter setCfUrl/setCfSecret schreiben in State + kvStore + IDB.
//   • *Active-Flags abgeleitet (beide Felder gesetzt).
//
// Rückgabe: alle States/Setter + abgeleitete Flags (App destrukturiert sie und
// reicht sie an Context + Sync-Funktionen weiter).
import { useState, useEffect } from "react";
import { kvStore } from "../utils/kvStore.js";

export function useCloudCredentials() {
  // Supabase
  const [supaUrl, setSupaUrl] = useState(()=>kvStore.getItem("supa_url")||"");
  const [supaKey, setSupaKey] = useState(()=>kvStore.getItem("supa_key")||"");
  const [supaStatus, setSupaStatus] = useState("idle");
  const [supaError, setSupaError] = useState("");
  const [supaLockKey, setSupaLockKey] = useState(0);
  const supaActive = !!(supaUrl && supaKey);

  // JSONBin
  const [jsonbinKey, setJsonbinKey] = useState(()=>kvStore.getItem("jsonbin_key")||"");
  const [jsonbinId,  setJsonbinId]  = useState(()=>kvStore.getItem("jsonbin_id")||"");
  const [jsonbinStatus, setJsonbinStatus] = useState("idle");
  const jsonbinActive = !!(jsonbinKey && jsonbinId);

  // GitHub Gist
  const [gistToken, setGistToken] = useState(()=>kvStore.getItem("gist_token")||"");
  const [gistId,    setGistId]    = useState(()=>kvStore.getItem("gist_id")||"");
  const [gistStatus, setGistStatus] = useState("idle");
  const gistActive = !!(gistToken && gistId);

  // Cloudflare Worker
  const [cfUrl,    setCfUrlRaw]    = useState("");
  const [cfSecret, setCfSecretRaw] = useState("");
  const [cfCredsReady, setCfCredsReady] = useState(false);
  // CF-Zugangsdaten aus IDB laden (stabiler auf iOS als localStorage)
  useEffect(()=>{
    (async()=>{
      try {
        const url = await window.IDB.get("cf_url").catch(()=>null) || kvStore.getItem("cf_url") || "";
        const sec = await window.IDB.get("cf_secret").catch(()=>null) || kvStore.getItem("cf_secret") || "";
        setCfUrlRaw(url);
        setCfSecretRaw(sec);
        if(url) window.IDB.set("cf_url", url).catch(()=>{});
        if(sec) window.IDB.set("cf_secret", sec).catch(()=>{});
      } catch(e){}
      setCfCredsReady(true);
    })();
  }, []);
  const setCfUrl = (v) => {
    setCfUrlRaw(v);
    kvStore.setItem("cf_url", v);
    window.IDB.set("cf_url", v).catch(()=>{});
  };
  const setCfSecret = (v) => {
    setCfSecretRaw(v);
    kvStore.setItem("cf_secret", v);
    window.IDB.set("cf_secret", v).catch(()=>{});
  };
  const [cfStatus, setCfStatus] = useState("idle");
  const cfActive = !!(cfUrl && cfSecret);

  // Sync-Verschlüsselung: Passphrase NUR lokal (IndexedDB + kvStore-Fallback),
  // wird NIE mitsynchronisiert. Ist sie gesetzt, wird die Cloud-Nutzlast vor
  // dem Hochladen client-seitig verschlüsselt (Zero-Knowledge).
  const [syncPass, setSyncPassRaw] = useState("");
  const [syncPassReady, setSyncPassReady] = useState(false);
  useEffect(()=>{
    (async()=>{
      try {
        const p = await window.IDB.get("sync_pass").catch(()=>null) || kvStore.getItem("sync_pass") || "";
        setSyncPassRaw(p);
        if(p) window.IDB.set("sync_pass", p).catch(()=>{});
      } catch(e){}
      setSyncPassReady(true);
    })();
  }, []);
  const setSyncPass = (v) => {
    setSyncPassRaw(v);
    // Leeren = leeren String persistieren (IDB kennt kein del): beim nächsten
    // Laden ist "" falsy → fällt auf kvStore zurück, das ebenfalls geleert wird.
    if(v) { kvStore.setItem("sync_pass", v); }
    else { kvStore.removeItem?.("sync_pass"); }
    window.IDB.set("sync_pass", v || "").catch(()=>{});
  };
  const syncEncActive = !!syncPass;

  return {
    supaUrl, setSupaUrl, supaKey, setSupaKey, supaStatus, setSupaStatus,
    supaError, setSupaError, supaLockKey, setSupaLockKey, supaActive,
    jsonbinKey, setJsonbinKey, jsonbinId, setJsonbinId, jsonbinStatus, setJsonbinStatus, jsonbinActive,
    gistToken, setGistToken, gistId, setGistId, gistStatus, setGistStatus, gistActive,
    cfUrl, cfSecret, setCfUrl, setCfSecret, cfCredsReady, cfStatus, setCfStatus, cfActive,
    syncPass, setSyncPass, syncPassReady, syncEncActive,
  };
}
