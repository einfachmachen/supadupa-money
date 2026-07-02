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
  session: "eb_session",   // Legacy: einzelne Bank-Session
  sessions: "eb_sessions", // Mehrbank: Liste von Bank-Sessions
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

// Diagnose des letzten Verbindungs-Versuchs (nur lokal, zur Fehlersuche). Hält
// fest, was die Bank beim Resume zurückgegeben hat — überlebt Reload/Redirect.
function saveEbDiag(obj) {
  try {
    const raw = JSON.stringify({ ts: new Date().toISOString(), ...obj });
    idbSet("eb_last_diag", raw);
    kvStore.setItem("eb_last_diag", raw);
  } catch { /* egal */ }
}
async function loadEbDiag() {
  try {
    const raw = (await idbGet("eb_last_diag")) || kvStore.getItem("eb_last_diag") || "";
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearEbDiag() {
  idbSet("eb_last_diag", "");
  kvStore.setItem("eb_last_diag", "");
}
function saveEbAccountMap(map) {
  const raw = JSON.stringify(map || {});
  idbSet(KEYS.accountMap, raw);
  kvStore.setItem(KEYS.accountMap, raw);
}

// Aktive Bank-Session(s) (Freigabe) lokal halten, damit künftige Importe ohne
// erneute Bank-Authentifizierung laufen — bis die Freigabe abläuft.
//   Session = { sessionId, accounts:[{uid,label}], validUntil (ISO), aspsp }
//
// Mehrbank: Es können mehrere Banken parallel verbunden sein. Gespeichert wird
// eine LISTE unter eb_sessions; der alte Einzel-Key eb_session wird weiter
// gepflegt (Rückwärtskompatibilität) und beim ersten Laden in die Liste migriert.

async function _loadLegacySession() {
  try {
    const raw = (await idbGet(KEYS.session)) || kvStore.getItem(KEYS.session) || "";
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Vollständige Liste aller gespeicherten Bank-Sessions (inkl. evtl. abgelaufener).
async function loadEbSessionList() {
  try {
    const raw = (await idbGet(KEYS.sessions)) || kvStore.getItem(KEYS.sessions) || "";
    let arr = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(arr)) arr = [];
    if (!arr.length) {
      const one = await _loadLegacySession();
      if (one && (one.accounts || []).length) arr = [one];
    }
    return arr;
  } catch {
    return [];
  }
}

function saveEbSessionList(arr) {
  const raw = JSON.stringify(Array.isArray(arr) ? arr : []);
  idbSet(KEYS.sessions, raw);
  kvStore.setItem(KEYS.sessions, raw);
}

// Rein lokaler Check ohne Bank-API-Aufruf (kein Rate-Limit-Verbrauch): welche
// Konten aktiver Bank-Sessions haben (noch) KEINE Zuordnung zu einem
// App-Konto? Damit das proaktiv auffällt — nicht erst beim nächsten Abruf
// oder Öffnen des Bank-Assistenten (siehe fetchNewBankTx: unbekannte Konten
// werden dort übersprungen statt geraten, aber das sieht man nur, wenn man
// aktiv abruft).
async function findUnmappedEbAccounts() {
  try {
    const list = await loadEbSessionList();
    const valid = list.filter((s) => s && s.validUntil && new Date(s.validUntil) > new Date() && (s.accounts || []).length);
    if (!valid.length) return [];
    const m = await loadEbAccountMap();
    const seen = new Set();
    const out = [];
    valid.forEach((s) => (s.accounts || []).forEach((a) => {
      if (seen.has(a.uid) || m[a.uid]) return;
      seen.add(a.uid);
      out.push({ uid: a.uid, label: a.label || a.uid, aspsp: s.aspsp || "" });
    }));
    return out;
  } catch {
    return [];
  }
}

// Identität einer Session: bevorzugt die Bank (aspsp), sonst die sessionId.
// Ohne gemeinsame Kennung NIE zusammenfassen — sonst überschriebe eine zweite
// Bank ohne aspsp/sessionId versehentlich die erste.
function _sameSession(a, b) {
  if (a.aspsp && b.aspsp) return a.aspsp === b.aspsp;
  if (a.sessionId && b.sessionId) return a.sessionId === b.sessionId;
  return false;
}

// Session hinzufügen/aktualisieren (ersetzt eine vorhandene derselben Bank).
// Maßgeblich sind die KONTEN — die getTransactions-Abfrage braucht nur die
// Konto-UID, keine sessionId. Deshalb wird eine Session mit Konten auch ohne
// sessionId gespeichert (manche ASPSPs, z. B. PayPal, liefern keine).
async function upsertEbSession(sess) {
  if (!sess || !(sess.accounts || []).length) return;
  const list = await loadEbSessionList();
  const next = list.filter((s) => !_sameSession(s, sess));
  next.push(sess);
  saveEbSessionList(next);
  // Legacy-Key weiter pflegen (zuletzt verbundene Bank)
  const raw = JSON.stringify(sess);
  idbSet(KEYS.session, raw);
  kvStore.setItem(KEYS.session, raw);
}

// Einzelne Bank-Session entfernen (per aspsp oder sessionId).
async function removeEbSession({ aspsp, sessionId } = {}) {
  const list = await loadEbSessionList();
  const match = (s) => (aspsp && s.aspsp === aspsp) || (sessionId && s.sessionId === sessionId);
  saveEbSessionList(list.filter((s) => !match(s)));
  const legacy = await _loadLegacySession();
  if (legacy && match(legacy)) {
    idbSet(KEYS.session, "");
    kvStore.setItem(KEYS.session, "");
  }
}

// Rückwärtskompatibel: jüngste noch gültige Session (oder null).
async function loadEbSession() {
  const list = await loadEbSessionList();
  const valid = list.filter((s) => s && s.validUntil && new Date(s.validUntil) > new Date());
  valid.sort((a, b) => String(b.validUntil).localeCompare(String(a.validUntil)));
  return valid[0] || (list[0] || null);
}

// Rückwärtskompatibel: schreibt als Upsert in die Liste.
function saveEbSession(sess) {
  upsertEbSession(sess);
}

function clearEbSession() {
  saveEbSessionList([]);
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
  loadEbSessionList,
  upsertEbSession,
  removeEbSession,
  saveEbDiag,
  loadEbDiag,
  clearEbDiag,
  exportEbForSync,
  importEbFromSync,
  findUnmappedEbAccounts,
};
