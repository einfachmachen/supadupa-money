// Wiederverwendbarer Bank-Abruf (Enable Banking) — ohne UI.
//
// Kapselt genau die Logik, die bisher nur im EnableBankingConnectScreen lag:
// gespeicherte Bank-Session(s) + Konto-Mapping laden, Umsätze je Konto abrufen,
// auf die App-Zeilenform mappen und gegen die vorhandenen Buchungen auf
// Dubletten prüfen. So kann sie sowohl der Verbinden-Screen als auch das
// Dashboard (Pull-to-Refresh) nutzen.
//
// Bewusst zukunftssicher: akzeptiert eine LISTE von Sessions, auch wenn der
// Speicher heute nur eine hält — damit „mehrere Banken" später ohne Umbau geht.

import { txFingerprint, txFingerprintNorm } from "./tx.js";
import { createEnableBankingClient, mapEnableBankingTransactions } from "./enableBanking.js";
import { loadEbCreds, loadEbAccountMap, loadEbSessionList } from "./enableBankingStore.js";

// Alle bekannten Fingerprints aus vorhandenen Buchungen (identisch zum Import).
function buildKnownFps(txs) {
  const s = new Set();
  (txs || []).forEach((t) => {
    if (t._fp) s.add(t._fp);
    const abs = Math.abs(t.totalAmount);
    s.add(txFingerprint(t.date, t.totalAmount, t.desc));
    s.add(txFingerprint(t.date, abs, t.desc));
    s.add(txFingerprintNorm(t.date, t.totalAmount, t.desc));
    s.add(txFingerprintNorm(t.date, abs, t.desc));
    if (t.accountId) {
      s.add(txFingerprint(t.date, t.totalAmount, t.desc, t.accountId));
      s.add(txFingerprint(t.date, abs, t.desc, t.accountId));
      s.add(txFingerprintNorm(t.date, t.totalAmount, t.desc, t.accountId));
      s.add(txFingerprintNorm(t.date, abs, t.desc, t.accountId));
    }
  });
  return s;
}

function sessionValid(sess) {
  return !!(sess && sess.sessionId && sess.validUntil &&
    new Date(sess.validUntil) > new Date() && (sess.accounts || []).length);
}

// Alle gespeicherten, noch gültigen Bank-Sessions (Mehrbank). Mit optionalem
// aspsp-Filter für den Abruf einer EINZELNEN Bank; ohne Filter alle auf einmal.
async function loadEbSessions(aspsp) {
  const list = await loadEbSessionList();
  let valid = list.filter(sessionValid);
  if (aspsp) valid = valid.filter((s) => s.aspsp === aspsp);
  return valid;
}

// Kompakte Liste der verbundenen Banken (für die Bank-Auswahl im Dashboard).
async function listConnectedBanks() {
  const sessions = await loadEbSessions();
  return sessions.map((s) => ({
    aspsp: s.aspsp || "Bank",
    accounts: (s.accounts || []).length,
    validUntil: s.validUntil,
  }));
}

// Ruft neue Umsätze ab und klassifiziert sie gegen die vorhandenen Buchungen.
// Ergebnis:
//   { ok:true, items:[{ accId, row, status:"new"|"exact"|"maybe" }], validUntil }
//   { ok:false, reason:"no-creds"|"no-session"|"expired"|"error", message }
async function fetchNewBankTx({ txs, accounts, dateFrom, aspsp } = {}) {
  const creds = await loadEbCreds();
  if (!creds.relayUrl || !creds.appId || !creds.privateKey) {
    return { ok: false, reason: "no-creds", message: "Kein Bank-Zugang eingerichtet." };
  }
  const sessions = await loadEbSessions(aspsp);
  if (!sessions.length) {
    return { ok: false, reason: "no-session", message: "Keine aktive Bank-Verbindung." };
  }
  const from = dateFrom || new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const accountMap = await loadEbAccountMap();
  const fallbackAcc = accounts?.[0]?.id || "acc-giro";

  const known = buildKnownFps(txs);
  const amtIndex = new Set();
  (txs || []).forEach((t) => {
    if (t.pending) return;
    amtIndex.add(`${t.date}|${Math.round(Math.abs(t.totalAmount) * 100)}`);
  });

  const cl = createEnableBankingClient({
    relayUrl: creds.relayUrl, appId: creds.appId, privateKeyPem: creds.privateKey,
  });

  const items = [];
  let lastValidUntil = null;
  try {
    for (const sess of sessions) {
      lastValidUntil = sess.validUntil || lastValidUntil;
      for (const a of sess.accounts || []) {
        const appAccId = accountMap[a.uid] || fallbackAcc;
        const r = await cl.getTransactions(a.uid, { dateFrom: from });
        const rows = mapEnableBankingTransactions(r?.transactions || [], appAccId);
        rows.forEach((row) => {
          if (row.pending) return; // vorgemerkte Bank-Umsätze auslassen
          const fpNorm = txFingerprintNorm(row.isoDate, row.amount, row.desc, appAccId);
          const amtKey = `${row.isoDate}|${Math.round(Math.abs(row.amount) * 100)}`;
          let status = "new";
          if (known.has(row.fp) || known.has(fpNorm)) status = "exact";
          else if (amtIndex.has(amtKey)) status = "maybe";
          items.push({ accId: appAccId, row, status });
        });
      }
    }
  } catch (e) {
    const txt = String(e?.message || e);
    if (/\b(401|404)\b|expired|session|consent/i.test(txt)) {
      return { ok: false, reason: "expired", message: "Bank-Freigabe abgelaufen oder ungültig." };
    }
    return { ok: false, reason: "error", message: txt };
  }

  items.sort((x, y) => y.row.isoDate.localeCompare(x.row.isoDate));
  return { ok: true, items, validUntil: lastValidUntil };
}

export { fetchNewBankTx, listConnectedBanks, buildKnownFps, loadEbSessions, sessionValid };
