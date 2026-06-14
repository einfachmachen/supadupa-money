// Lokale Ablage der Enable-Banking-Zugangsdaten.
//
// Bewusst NUR auf dem Gerät: Relay-URL und Application-ID liegen in kvStore +
// IndexedDB, der private Schlüssel ausschließlich in IndexedDB. Nichts davon
// wird je in die Cloud-Synchronisation (App-Daten-Payload) aufgenommen.

import { kvStore } from "./kvStore.js";

const KEYS = {
  relayUrl: "eb_relay_url",
  appId: "eb_app_id",
  privateKey: "eb_private_key",
  accountMap: "eb_account_map",
};

async function idbGet(k) {
  try {
    return (await window.IDB?.get(k)) ?? null;
  } catch {
    return null;
  }
}
function idbSet(k, v) {
  try {
    window.IDB?.set(k, v);
  } catch {
    /* ignorieren */
  }
}

async function loadEbCreds() {
  const relayUrl = (await idbGet(KEYS.relayUrl)) || kvStore.getItem(KEYS.relayUrl) || "";
  const appId = (await idbGet(KEYS.appId)) || kvStore.getItem(KEYS.appId) || "";
  const privateKey = (await idbGet(KEYS.privateKey)) || ""; // nur IDB
  return { relayUrl, appId, privateKey };
}

function saveEbCreds({ relayUrl, appId, privateKey }) {
  if (relayUrl !== undefined) {
    idbSet(KEYS.relayUrl, relayUrl);
    kvStore.setItem(KEYS.relayUrl, relayUrl);
  }
  if (appId !== undefined) {
    idbSet(KEYS.appId, appId);
    kvStore.setItem(KEYS.appId, appId);
  }
  // Privater Schlüssel: nur IndexedDB, niemals kvStore
  if (privateKey !== undefined) idbSet(KEYS.privateKey, privateKey);
}

async function loadEbAccountMap() {
  try {
    const raw = (await idbGet(KEYS.accountMap)) || kvStore.getItem(KEYS.accountMap) || "{}";
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function saveEbAccountMap(map) {
  const raw = JSON.stringify(map || {});
  idbSet(KEYS.accountMap, raw);
  kvStore.setItem(KEYS.accountMap, raw);
}

export { loadEbCreds, saveEbCreds, loadEbAccountMap, saveEbAccountMap };
