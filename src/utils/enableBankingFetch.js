// Wiederverwendbarer Bank-Abruf (Enable Banking) — ohne UI.
//
// Kapselt genau die Logik, die bisher nur im EnableBankingWizard lag:
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

// Gültig = noch nicht abgelaufen UND hat Konten. Die sessionId ist NICHT nötig
// (der Abruf läuft über die Konto-UIDs); manche ASPSPs liefern keine.
function sessionValid(sess) {
  return !!(sess && sess.validUntil &&
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

// Übersetzt rohe Fehlertexte (oft JSON von Enable Banking / der Bank) in eine
// verständliche, möglichst konkrete Klartext-Meldung mit klarem nächsten Schritt.
// Wertet den Schritt aus, den req() in den Fehler schreibt
// ([Anmeldung starten] / [Session erstellen] / [Umsätze abrufen] / [Banken laden]).
// Der Rohtext bleibt separat als `detail` erhalten (ausklappbar).
function friendlyBankError(txt) {
  const s = String(txt || "").toLowerCase();
  const step = /umsätze abrufen/.test(s) ? "fetch"
    : /session erstellen/.test(s) ? "session"
    : /anmeldung starten/.test(s) ? "auth"
    : /banken laden/.test(s) ? "banks"
    : null;

  // Bankseitiger Serverfehler (ASPSP = die Bank). Liegt an der Bank-Schnittstelle,
  // betrifft alle Banking-Apps gleichermaßen und ist meist nur vorübergehend.
  if (/aspsp_error|internal server error|httpexception|bad gateway|service unavailable|gateway timeout|\b50[0-4]\b/.test(s))
    return "Die Bank meldet gerade einen internen Fehler an ihrer Schnittstelle für Banking-Apps (PSD2). "
      + "Das liegt an der Bank – nicht an dieser App – und betrifft alle Banking-Apps gleichermaßen. "
      + "Meist ist es nur vorübergehend: bitte in ein paar Minuten bis Stunden erneut versuchen.";

  if (/\b429\b|rate.?limit|too many/.test(s))
    return "Zu viele Anfragen in kurzer Zeit. Bitte ein, zwei Minuten warten und dann erneut versuchen.";

  if (/failed to fetch|networkerror|network error|timeout|timed out|err_|enotfound|econnrefused/.test(s))
    return "Keine Verbindung zum Bank-Dienst. Bitte Internetverbindung prüfen und erneut versuchen.";

  // Abgelaufene/zurückgezogene Freigabe oder ungültige Sitzung.
  if (/\b401\b|\b403\b|expired|consent|unauthor|invalid.*token|token.*invalid/.test(s))
    return "Die Bank-Freigabe ist abgelaufen oder wurde zurückgezogen. Bitte die Bank unten neu verbinden "
      + "(eine Freigabe gilt aus Sicherheitsgründen höchstens 90 Tage).";

  if (/\b404\b/.test(s))
    return step === "fetch"
      ? "Das zugeordnete Konto wurde bei der Bank nicht gefunden. Bitte die Bank neu verbinden und die Konten neu zuordnen."
      : "Die Bank-Verbindung wurde nicht gefunden. Bitte die Bank unten neu verbinden.";

  if (/\b400\b/.test(s)) {
    if (step === "session")
      return "Die Bank-Anmeldung konnte nicht abgeschlossen werden – oft, weil sie abgebrochen oder die Freigabe "
        + "in der Bank-App zu spät bestätigt wurde. Bitte die Verbindung erneut starten und die TAN/Freigabe zügig bestätigen.";
    if (step === "auth")
      return "Die Anmelde-Anfrage wurde von der Bank abgelehnt. Bitte erneut versuchen; bleibt es bestehen, im "
        + "Verbindungs-Check unten Redirect-URL und Application-ID mit dem Enable-Banking-Portal abgleichen.";
    return "Die Anfrage wurde von der Bank abgelehnt. Oft hilft „Erneut versuchen“; bleibt es bestehen, die Bank-Verbindung neu freigeben.";
  }

  const wo = step === "auth" ? " (beim Starten der Bank-Anmeldung)"
    : step === "session" ? " (beim Abschließen der Bank-Anmeldung)"
    : step === "fetch" ? " (beim Abrufen der Umsätze)"
    : step === "banks" ? " (beim Laden der Bankenliste)" : "";
  return `Der Bankabruf ist fehlgeschlagen${wo}. Bitte erneut versuchen – Details siehe unten.`;
}

// Ruft neue Umsätze ab und klassifiziert sie gegen die vorhandenen Buchungen.
// Ergebnis:
//   { ok:true, items:[{ accId, row, status:"new"|"exact"|"maybe" }], validUntil }
//   { ok:false, reason:"no-creds"|"no-session"|"expired"|"error", message, detail? }
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
          // Vorgemerkte Bank-Umsätze (PDNG) laufen mit durch und werden weiter
          // unten als Vormerkung (pending) übernommen — Auflösung gegen die
          // spätere echte Buchung erfolgt manuell im Matching.
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
    // WICHTIG: Rate-Limit ZUERST prüfen — die 429-Meldung enthält das Wort
    // "consent" (… exceeding the daily multiplicity for consent …) und würde
    // sonst fälschlich als abgelaufene Freigabe eingeordnet.
    if (/\b429\b|rate.?limit|multiplicity|too many/i.test(txt)) {
      return { ok: false, reason: "rate-limit", message: "Tageslimit für Bank-Abrufe erreicht.", detail: txt };
    }
    if (/\b(401|403|404)\b|expired|session|consent/i.test(txt)) {
      return { ok: false, reason: "expired", message: "Bank-Freigabe abgelaufen oder ungültig.", detail: txt };
    }
    return { ok: false, reason: "error", message: friendlyBankError(txt), detail: txt };
  }

  items.sort((x, y) => y.row.isoDate.localeCompare(x.row.isoDate));
  return { ok: true, items, validUntil: lastValidUntil };
}

export { fetchNewBankTx, listConnectedBanks, buildKnownFps, loadEbSessions, sessionValid, friendlyBankError };
