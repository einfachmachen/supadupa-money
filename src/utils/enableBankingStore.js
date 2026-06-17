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
  session: "eb_session",
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

// Aktive Bank-Session (Freigabe) lokal halten, damit künftige Importe ohne
// erneute Bank-Authentifizierung laufen — bis die Freigabe abläuft.
//   { sessionId, accounts:[{uid,label}], validUntil (ISO), aspsp }
async function loadEbSession() {
  try {
    const raw = (await idbGet(KEYS.session)) || kvStore.getItem(KEYS.session) || "";
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveEbSession(sess) {
  const raw = JSON.stringify(sess || null);
  idbSet(KEYS.session, raw);
  kvStore.setItem(KEYS.session, raw);
}
function clearEbSession() {
  idbSet(KEYS.session, "");
  kvStore.setItem(KEYS.session, "");
}

// ── Verschlüsselter Mehrgeräte-Sync ──────────────────────────────────────
// Der private Schlüssel wird NUR über die client-seitig VERSCHLÜSSELTE
// Cloud-Nutzlast übertragen (siehe App.jsx cfSave: nur wenn eine Passphrase
// gesetzt ist). exportEbForSync() liefert die dauerhaften Verbindungsdaten;
// die kurzlebige Bank-Session bleibt absichtlich draußen (gerät-/zeitgebunden,
// jederzeit neu abrufbar). Gibt null zurück, wenn kein Schlüssel vorliegt.
async function exportEbForSync() {
  const { relayUrl, appId, privateKey } = await loadEbCreds();
  if (!privateKey) return null;
  const accountMap = await loadEbAccountMap();
  return { relayUrl, appId, privateKey, accountMap };
}

// Schreibt aus dem Sync empfangene Verbindungsdaten lokal — überschreibt aber
// einen bereits vorhandenen lokalen Schlüssel NICHT (lokal hat Vorrang, damit
// ein laufendes Gerät nicht versehentlich entkoppelt wird).
async function importEbFromSync(block) {
  if (!block || typeof block !== "object") return false;
  const existing = await loadEbCreds();
  if (existing.privateKey) return false; // schon eingerichtet → nichts tun
  const { relayUrl, appId, privateKey, accountMap } = block;
  if (!privateKey) return false;
  saveEbCreds({
    relayUrl: relayUrl || existing.relayUrl || "",
    appId: appId || existing.appId || "",
    privateKey,
  });
  if (accountMap && typeof accountMap === "object") saveEbAccountMap(accountMap);
  return true;
}

export {
  loadEbCreds,
  saveEbCreds,
  loadEbAccountMap,
  saveEbAccountMap,
  loadEbSession,
  saveEbSession,
  clearEbSession,
  exportEbForSync,
  importEbFromSync,
};
