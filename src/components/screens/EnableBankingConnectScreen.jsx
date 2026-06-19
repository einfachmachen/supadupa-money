// Enable-Banking-Verbindung — funktionaler Screen (experimentell).
//
// Ablauf: Zugangsdaten (Relay-URL, App-ID, .pem) lokal hinterlegen → Bank
// wählen → zur Bank weiterleiten → nach Rückkehr Session erstellen → Konten
// zuordnen → Umsätze abrufen. Die Umsätze werden über das getestete Mapping
// in die bestehende Buchungsliste übernommen (mit Duplikat-Schutz).
//
// Hinweis: Der Live-Pfad (echte API/Bank-Redirect) ist noch nicht end-to-end
// getestet — er folgt der Enable-Banking-Doku und der getesteten Kern-Logik.

import React, { useContext, useEffect, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { uid } from "../../utils/format.js";
import { txFingerprint, txFingerprintNorm } from "../../utils/tx.js";
import {
  createEnableBankingClient,
  mapEnableBankingTransactions,
} from "../../utils/enableBanking.js";
import {
  loadEbCreds,
  saveEbCreds,
  loadEbAccountMap,
  saveEbAccountMap,
  clearEbSession,
  loadEbSessionList,
  upsertEbSession,
  removeEbSession,
} from "../../utils/enableBankingStore.js";

// Vom Betreiber bereitgestellter Standard-Relay (datenlos, geteilt). Editierbar —
// wer einen eigenen Relay deployt, trägt hier seine eigene URL ein.
const DEFAULT_RELAY = "https://enable-banking-proxy.relay-url-supadupa-money.workers.dev";

function Box({ tone = "info", children }) {
  const map = { info: T.blue, tip: T.pos, warn: T.gold, danger: T.neg };
  const c = map[tone] || T.blue;
  return (
    <div style={{ background: c + "18", border: `1px solid ${c}55`, borderRadius: 12,
      padding: "10px 12px", color: T.txt, fontSize: 13.5, lineHeight: 1.5, marginTop: 12 }}>
      {children}
    </div>
  );
}

const labelStyle = { color: T.txt2, fontSize: 12.5, fontWeight: 700, marginBottom: 5, marginTop: 14, display: "block" };
const inputStyle = {
  width: "100%", boxSizing: "border-box", background: T.bg, color: T.txt,
  border: `1px solid ${T.bds}`, borderRadius: 11, padding: "10px 12px", fontSize: 15, fontFamily: "inherit",
};
function PButton({ onClick, disabled, children, bg }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: "100%", padding: "11px", borderRadius: 13, border: "none",
        cursor: disabled ? "not-allowed" : "pointer", background: disabled ? T.disabled : (bg || T.blue),
        color: disabled ? "#888" : T.on_accent, fontSize: 16, fontWeight: 800, marginTop: 14, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

// Alle bekannten Fingerprints aus vorhandenen Buchungen (wie im CSV-Import)
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

// Session-Antwort → einheitliche Kontoliste [{uid, label}]
function normalizeAccounts(r) {
  const arr = (r && r.accounts) || [];
  return arr
    .map((a, i) => {
      if (typeof a === "string") return { uid: a, label: `Konto ${i + 1}` };
      const u = a.uid || a.account_uid || a.id;
      const iban = a.account_id?.iban || a.iban || a.identification || "";
      const name = a.name || a.product || "";
      return { uid: u, label: [name, iban].filter(Boolean).join(" · ") || `Konto ${i + 1}` };
    })
    .filter((a) => a.uid);
}

function EnableBankingConnectScreen({ onClose }) {
  const { txs, setTxs, accounts } = useContext(AppCtx);

  const [relayUrl, setRelayUrl] = useState(DEFAULT_RELAY);
  const [appId, setAppId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [country, setCountry] = useState("DE");
  const [banks, setBanks] = useState(null);
  const [bank, setBank] = useState("");
  const [sessionAccounts, setSessionAccounts] = useState(null);
  const [accMap, setAccMap] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [bankFilter, setBankFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [preview, setPreview] = useState(null);
  const [validUntil, setValidUntil] = useState(null); // ISO: bis wann die Bank-Freigabe gilt
  const [connectedBanks, setConnectedBanks] = useState([]); // alle verbundenen Banken (Mehrbank)

  // Genau die Adresse, die die App beim Verbinden als redirect_url mitschickt —
  // diese muss im Enable-Banking-Portal als Redirect-URL hinterlegt sein.
  const redirectUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUrl);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = redirectUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* ignorieren */
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const client = () => createEnableBankingClient({ relayUrl, appId, privateKeyPem: privateKey });
  const credsComplete = relayUrl && appId && privateKey;

  // Auswahl mit dem Filter synchron halten: ist die gewählte Bank nicht (mehr)
  // in der gefilterten Liste, automatisch die erste passende übernehmen.
  useEffect(() => {
    if (!banks) return;
    const f = bankFilter.trim().toLowerCase();
    const filtered = f ? banks.filter((b) => String(b).toLowerCase().includes(f)) : banks;
    if (filtered.length && !filtered.includes(bank)) setBank(filtered[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankFilter, banks]);

  useEffect(() => {
    (async () => {
      const c = await loadEbCreds();
      setRelayUrl(c.relayUrl || DEFAULT_RELAY);
      setAppId(c.appId);
      setPrivateKey(c.privateKey);
      setAccMap(await loadEbAccountMap());
      // Nach Bank-Redirect zurückgekehrt? (in main.jsx abgefangen)
      const code = sessionStorage.getItem("eb_pending_code");
      if (code && c.relayUrl && c.appId && c.privateKey) {
        sessionStorage.removeItem("eb_pending_code");
        await refreshConnected(); // bereits verbundene Banken sofort zeigen
        resumeSession(code, c);
        return;
      }
      // Sonst: alle gespeicherten, noch gültigen Bank-Sessions wiederverwenden —
      // ohne erneute Bank-Anmeldung direkt Umsätze (aller Banken) abrufen.
      await refreshConnected();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lädt alle verbundenen (gültigen) Banken, vereinigt ihre Konten in
  // sessionAccounts (für Mapping + Abruf) und füllt die Banken-Liste der UI.
  const refreshConnected = async () => {
    const list = await loadEbSessionList();
    const valid = list.filter((s) => s && s.validUntil && new Date(s.validUntil) > new Date() && (s.accounts || []).length);
    setConnectedBanks(valid);
    if (!valid.length) { setSessionAccounts(null); setValidUntil(null); return; }
    const union = [];
    const seen = new Set();
    valid.forEach((s) => (s.accounts || []).forEach((a) => { if (!seen.has(a.uid)) { seen.add(a.uid); union.push(a); } }));
    setSessionAccounts(union);
    // nächstliegendes Ablaufdatum als Gesamt-Gültigkeit anzeigen
    const soonest = valid.map((s) => s.validUntil).sort((a, b) => String(a).localeCompare(String(b)))[0];
    setValidUntil(soonest);
    const m = { ...(await loadEbAccountMap()) };
    union.forEach((a) => { if (!m[a.uid]) m[a.uid] = accounts[0]?.id || "acc-giro"; });
    setAccMap(m);
    setMsg({ tone: "tip", text: `${valid.length} Bank${valid.length !== 1 ? "en" : ""} verbunden. Du kannst direkt „Buchungen abrufen“.` });
  };

  const disconnectBank = async (sess) => {
    await removeEbSession({ aspsp: sess.aspsp, sessionId: sess.sessionId });
    await refreshConnected();
  };

  const save = () => {
    saveEbCreds({ relayUrl, appId, privateKey });
    setMsg({ tone: "tip", text: "Zugangsdaten lokal gespeichert." });
  };

  const loadBanks = async () => {
    setBusy(true); setMsg(null);
    try {
      saveEbCreds({ relayUrl, appId, privateKey });
      const r = await client().listAspsps(country);
      const names = (r?.aspsps || r || []).map((a) => a?.name || a).filter(Boolean);
      const list = [...new Set(names)].sort((a, b) => String(a).localeCompare(String(b)));
      setBanks(list);
      if (list.length && !bank) setBank(list[0]);
      setMsg({ tone: "tip", text: `${list.length} Banken geladen.` });
    } catch (e) {
      setMsg({ tone: "danger", text: String(e.message || e) });
    }
    setBusy(false);
  };

  const connect = async () => {
    setBusy(true); setMsg(null);
    try {
      saveEbCreds({ relayUrl, appId, privateKey });
      const redirectUrl = window.location.origin + window.location.pathname;
      const state = "ebmoney-" + Math.random().toString(36).slice(2);
      const r = await client().startAuth({ aspspName: bank, country, redirectUrl, state });
      if (r?.url) {
        // Gewählte Bank für den Rücksprung merken: nach der Same-Tab-Navigation
        // lädt der Screen frisch (bank-State ist dann leer). So bekommt die neu
        // verbundene Session ein korrektes Label/Identität (DKB, PayPal …).
        try { sessionStorage.setItem("eb_pending_aspsp", bank || ""); } catch (e) { /* egal */ }
        // Weiterleitung im SELBEN Tab (volle Seitennavigation zur Bank). So ist
        // die Adressleiste der Bank sichtbar (Zugangsdaten gehen an die Bank,
        // nicht an die App) UND der Rücksprung mit ?code landet zuverlässig
        // wieder hier — main.jsx fängt ihn ab und öffnet den Connect-Screen
        // erneut (siehe App.jsx eb_open_connect). Ein neuer Tab führte dazu,
        // dass der Rücksprung im anderen Tab landete und dieser Screen hängen
        // blieb (u. a. beim Testen im Responsive-Modus, z. B. mit PayPal).
        setMsg({ tone: "info", text: "Weiterleitung zu deiner Bank…" });
        window.location.href = r.url;
      } else {
        setMsg({ tone: "danger", text: "Keine Weiterleitungs-URL von Enable Banking erhalten." });
        setBusy(false);
      }
    } catch (e) {
      setMsg({ tone: "danger", text: String(e.message || e) });
      setBusy(false);
    }
  };

  const resumeSession = async (code, creds) => {
    setBusy(true); setMsg({ tone: "info", text: "Verbinde mit deiner Bank…" });
    try {
      const cl = createEnableBankingClient({
        relayUrl: creds.relayUrl, appId: creds.appId, privateKeyPem: creds.privateKey,
      });
      const r = await cl.createSession(code);
      let accs = normalizeAccounts(r);
      let vu = r?.access?.valid_until || r?.valid_until || null;
      let aspspName = r?.aspsp?.name || "";
      const sessionId = r?.session_id || r?.session?.id || r?.id || r?.sessionId || "";
      // Manche ASPSPs (z. B. PayPal) liefern die Konten NICHT im createSession-
      // Response, sondern erst über GET /sessions/{id} — dann dort nachladen.
      if (!accs.length && sessionId) {
        try {
          const s = await cl.getSession(sessionId);
          accs = normalizeAccounts(s);
          vu = vu || s?.access?.valid_until || s?.valid_until || null;
          aspspName = aspspName || s?.aspsp?.name || "";
        } catch (e) { /* unten als „keine Konten“ behandelt */ }
      }
      if (!accs.length) {
        // Bestehende Banken weiter anzeigen (DKB darf nicht verschwinden) und
        // einen verwertbaren Hinweis inkl. Antwort-Auszug geben.
        await refreshConnected();
        const snippet = (() => { try { return JSON.stringify(r).slice(0, 240); } catch { return String(r); } })();
        setMsg({ tone: "danger", text: `Bank verbunden, aber keine Konten erhalten. Antwort: ${snippet}` });
        setBusy(false);
        return;
      }
      const m = { ...(await loadEbAccountMap()) };
      accs.forEach((a) => { if (!m[a.uid]) m[a.uid] = accounts[0]?.id || "acc-giro"; });
      setAccMap(m);
      saveEbAccountMap(m);
      // Bank-Session lokal sichern (Mehrbank: hinzufügen, vorhandene derselben
      // Bank ersetzen) → künftige Importe ohne erneute Bank-Anmeldung.
      vu = vu || new Date(Date.now() + 90 * 86400000).toISOString();
      // Banklabel/Identität: API-aspsp, sonst die vor dem Redirect gemerkte Wahl.
      let pendingAspsp = "";
      try { pendingAspsp = sessionStorage.getItem("eb_pending_aspsp") || ""; sessionStorage.removeItem("eb_pending_aspsp"); } catch (e) { /* egal */ }
      const aspsp = aspspName || pendingAspsp || bank || "";
      await upsertEbSession({ sessionId, accounts: accs, validUntil: vu, aspsp });
      // Banken-Liste + vereinigte Konten neu laden (alle verbundenen Banken)
      await refreshConnected();
      setMsg({ tone: "tip", text: `${aspsp || "Bank"} verbunden (gültig bis ${String(vu).slice(0, 10)}). Zuordnen und „Buchungen abrufen“.` });
    } catch (e) {
      // Bestehende Banken erhalten bleiben — Fehler nur melden.
      await refreshConnected();
      setMsg({ tone: "danger", text: String(e.message || e) });
    }
    setBusy(false);
  };

  // Umsätze laden und als VORSCHAU aufbereiten (noch nicht importieren).
  // Jede Buchung bekommt einen Status:
  //   exact = Fingerabdruck schon vorhanden → abgewählt
  //   maybe = gleiches Datum+Betrag vorhanden (z. B. anderer Quelltext) → abgewählt
  //   new   = unbekannt → vorausgewählt
  const loadPreview = async () => {
    setBusy(true); setMsg(null); setResult(null); setPreview(null);
    try {
      saveEbAccountMap(accMap);
      const known = buildKnownFps(txs);
      const amtIndex = new Set();
      (txs || []).forEach((t) => {
        if (t.pending) return;
        amtIndex.add(`${t.date}|${Math.round(Math.abs(t.totalAmount) * 100)}`);
      });
      const cl = client();
      const items = [];
      for (const a of sessionAccounts) {
        const appAccId = accMap[a.uid] || accounts[0]?.id || "acc-giro";
        const r = await cl.getTransactions(a.uid, { dateFrom });
        const rows = mapEnableBankingTransactions(r?.transactions || [], appAccId);
        rows.forEach((row) => {
          if (row.pending) return; // vorgemerkte Bank-Umsätze auslassen
          const fpNorm = txFingerprintNorm(row.isoDate, row.amount, row.desc, appAccId);
          const amtKey = `${row.isoDate}|${Math.round(Math.abs(row.amount) * 100)}`;
          let status = "new";
          if (known.has(row.fp) || known.has(fpNorm)) status = "exact";
          else if (amtIndex.has(amtKey)) status = "maybe";
          items.push({
            key: appAccId + "|" + items.length + "|" + (row._ebRef || row.fp),
            accId: appAccId, row, status, checked: status === "new",
          });
        });
      }
      items.sort((x, y) => y.row.isoDate.localeCompare(x.row.isoDate));
      setPreview(items);
      const news = items.filter((i) => i.status === "new").length;
      setMsg({ tone: "tip", text: `${items.length} Buchungen geladen · ${news} neu vorausgewählt, ${items.length - news} mögliche Dubletten abgewählt.` });
    } catch (e) {
      const txt = String(e.message || e);
      if (/\b(401|404)\b|expired|session|consent/i.test(txt)) {
        clearEbSession();
        setSessionAccounts(null);
        setValidUntil(null);
        setMsg({ tone: "warn", text: "Bank-Freigabe abgelaufen oder ungültig — bitte unten neu mit der Bank verbinden." });
      } else {
        setMsg({ tone: "danger", text: txt });
      }
    }
    setBusy(false);
  };

  const togglePreview = (key) =>
    setPreview((p) => p.map((it) => (it.key === key ? { ...it, checked: !it.checked } : it)));
  const setAllPreview = (val) => setPreview((p) => p.map((it) => ({ ...it, checked: val })));

  const commitImport = () => {
    const chosen = (preview || []).filter((i) => i.checked);
    if (!chosen.length) { setMsg({ tone: "warn", text: "Keine Buchung ausgewählt." }); return; }
    const newTxs = chosen.map(({ row, accId }) => ({
      id: "eb-" + uid(), date: row.isoDate, totalAmount: Math.abs(row.amount),
      desc: row.desc, note: "", pending: false, accountId: accId, splits: [],
      _csvType: row.amount > 0 ? "income" : "expense", _fp: row.fp, _csvSource: "Enable Banking",
    }));
    setTxs((p) => [...newTxs, ...p].sort((x, y) => y.date.localeCompare(x.date)));
    setResult({ added: newTxs.length });
    setMsg({ tone: "tip", text: `${newTxs.length} Buchungen importiert.` });
    setPreview(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 320, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: T.surf, borderBottom: `1px solid ${T.bd}`,
        padding: "calc(12px + env(safe-area-inset-top, 0px)) 16px 12px",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", color: T.txt2,
            width: 44, height: 44, borderRadius: 14, cursor: "pointer", fontSize: 20,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {Li("arrow-left", 22, T.txt)}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.blue, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Enable Banking
          </div>
          <div style={{ color: T.txt, fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginTop: 1 }}>
            Bank-Konto verbinden
          </div>
        </div>
      </div>

      {/* Inhalt */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
        padding: "16px 18px calc(81px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          <Box tone="warn">
            <b>Experimentell.</b> Voraussetzung: ein deployter Relay-Worker und ein
            Enable-Banking-Zugang. Schritt-für-Schritt erklärt die Hilfe „Bank verbinden“.
          </Box>

          {validUntil && (
            <Box tone="tip">
              ✓ Bank-Verbindung aktiv — gültig bis <b>{String(validUntil).slice(0, 10)}</b>.
              Bis dahin brauchst du für weitere Importe <b>keine erneute Bank-Anmeldung</b> —
              einfach unten „Buchungen abrufen“.
            </Box>
          )}

          {/* Verbundene Banken (Mehrbank): jede separat entfernbar. Eine weitere
              Bank verbindest du unten über „2 · Bank wählen“ — sie wird ergänzt,
              nicht ersetzt. Der Dashboard-Abruf holt alle auf einmal. */}
          {connectedBanks.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: T.txt, fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                Verbundene Banken ({connectedBanks.length})
              </div>
              {connectedBanks.map((s) => (
                <div key={(s.aspsp || "") + "|" + s.sessionId}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 11, border: `1px solid ${T.bd}`, background: "rgba(255,255,255,0.03)", marginBottom: 8 }}>
                  {Li("landmark", 18, T.blue)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.txt, fontSize: 14, fontWeight: 700, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.aspsp || "Bank"}</div>
                    <div style={{ color: T.txt2, fontSize: 11.5 }}>
                      {(s.accounts || []).length} Konto/Konten · gültig bis {String(s.validUntil).slice(0, 10)}
                    </div>
                  </div>
                  <button onClick={() => disconnectBank(s)} title="Bank entfernen"
                    style={{ flexShrink: 0, background: "transparent", border: `1px solid ${T.bd}`,
                      borderRadius: 9, padding: "6px 8px", color: T.neg, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}>
                    {Li("trash-2", 14, T.neg)} entfernen
                  </button>
                </div>
              ))}
              <div style={{ color: T.txt2, fontSize: 11.5, lineHeight: 1.45 }}>
                Weitere Bank verbinden: unten unter „2 · Bank wählen“ — sie wird zur Liste ergänzt.
              </div>
            </div>
          )}

          {/* Redirect-URL zum Eintragen im Enable-Banking-Portal */}
          <div style={{ marginTop: 18 }}>
            <label style={labelStyle}>Deine Redirect-URL (im Enable-Banking-Portal eintragen)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <div style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 12.5,
                wordBreak: "break-all", display: "flex", alignItems: "center" }}>
                {redirectUrl}
              </div>
              <button onClick={copyRedirect}
                style={{ flexShrink: 0, padding: "0 14px", borderRadius: 11, border: "none",
                  background: copied ? T.pos : T.blue, color: T.on_accent, fontSize: 14, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                {Li(copied ? "check" : "copy", 16, T.on_accent)}
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>
            <div style={{ color: T.txt2, fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
              Genau diese Adresse muss im Portal als Redirect-URL hinterlegt sein (exakte Schreibweise).
            </div>
          </div>

          {/* 1. Zugangsdaten */}
          <div style={{ color: T.txt, fontSize: 16, fontWeight: 800, marginTop: 20 }}>1 · Zugangsdaten</div>

          <label style={labelStyle}>Relay-URL (Cloudflare Worker)</label>
          <input style={inputStyle} value={relayUrl} placeholder="https://…workers.dev"
            onChange={(e) => setRelayUrl(e.target.value.trim())} autoCapitalize="off" autoCorrect="off" />

          <label style={labelStyle}>Application-ID</label>
          <input style={inputStyle} value={appId} placeholder="aus dem Enable-Banking-Portal"
            onChange={(e) => setAppId(e.target.value.trim())} autoCapitalize="off" autoCorrect="off" />

          <label style={labelStyle}>Privater Schlüssel (.pem)</label>
          <input type="file" accept=".pem,.key,application/x-pem-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => setPrivateKey(String(reader.result || ""));
              reader.readAsText(f);
            }}
            style={{ color: T.txt2, fontSize: 13, marginBottom: 6 }} />
          <textarea style={{ ...inputStyle, minHeight: 70, fontFamily: "monospace", fontSize: 11 }}
            value={privateKey} placeholder="-----BEGIN PRIVATE KEY-----…"
            onChange={(e) => setPrivateKey(e.target.value)} />

          <label style={labelStyle}>Land</label>
          <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().trim())}
            maxLength={2} placeholder="DE" autoCapitalize="characters" />

          <PButton onClick={save} disabled={busy} bg={T.surf3}>Lokal speichern</PButton>

          {/* 2. Bank wählen */}
          <div style={{ color: T.txt, fontSize: 16, fontWeight: 800, marginTop: 22 }}>2 · Bank wählen</div>
          <PButton onClick={loadBanks} disabled={busy || !credsComplete}>Banken laden</PButton>
          {banks && (() => {
            const f = bankFilter.trim().toLowerCase();
            const filtered = f ? banks.filter((b) => String(b).toLowerCase().includes(f)) : banks;
            return (
              <>
                <label style={labelStyle}>Bank suchen</label>
                <input style={inputStyle} value={bankFilter} placeholder="z. B. DKB"
                  onChange={(e) => setBankFilter(e.target.value)} autoCapitalize="off" autoCorrect="off" />
                <label style={labelStyle}>Bank ({filtered.length} von {banks.length})</label>
                <select style={inputStyle} value={bank} onChange={(e) => setBank(e.target.value)}>
                  {filtered.map((b, i) => <option key={b + "|" + i} value={b}>{b}</option>)}
                </select>
                <PButton onClick={connect} disabled={busy || !bank} bg={T.gold}>
                  Mit Bank verbinden (im Browser)
                </PButton>
                <div style={{ color: T.txt2, fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
                  Öffnet die Anmeldung im Browser auf der Seite deiner Bank. Deine
                  Bank-Zugangsdaten gibst du <b>nur dort</b> ein — niemals in dieser App.
                </div>
              </>
            );
          })()}

          {/* 3. Konten zuordnen + Zeitraum */}
          {sessionAccounts && (
            <>
              <div style={{ color: T.txt, fontSize: 16, fontWeight: 800, marginTop: 22 }}>3 · Konten zuordnen</div>
              {sessionAccounts.map((a) => (
                <div key={a.uid} style={{ marginTop: 12 }}>
                  <div style={{ color: T.txt2, fontSize: 12.5, marginBottom: 5 }}>{a.label}</div>
                  <select style={inputStyle} value={accMap[a.uid] || ""}
                    onChange={(e) => setAccMap((m) => ({ ...m, [a.uid]: e.target.value }))}>
                    {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
              ))}
              <label style={labelStyle}>Buchungen ab Datum</label>
              <input type="date" style={inputStyle} value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)} />
              <div style={{ color: T.txt2, fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
                Tipp: Datum hochsetzen (z. B. auf nach deinem letzten Finanzblick-Import),
                damit alte, bereits vorhandene Buchungen gar nicht erst geladen werden.
              </div>
              <PButton onClick={loadPreview} disabled={busy} bg={T.blue}>
                Buchungen abrufen
              </PButton>
            </>
          )}

          {/* 4. Vorschau & Auswahl */}
          {preview && (
            <>
              <div style={{ color: T.txt, fontSize: 16, fontWeight: 800, marginTop: 22 }}>
                4 · Vorschau ({preview.filter((i) => i.checked).length}/{preview.length} ausgewählt)
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => setAllPreview(true)}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, border: `1px solid ${T.bd}`,
                    background: "rgba(255,255,255,0.05)", color: T.txt, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Alle
                </button>
                <button onClick={() => setAllPreview(false)}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, border: `1px solid ${T.bd}`,
                    background: "rgba(255,255,255,0.05)", color: T.txt, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Keine
                </button>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {preview.map((it) => (
                  <label key={it.key}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px",
                      borderRadius: 10, border: `1px solid ${T.bd}`, cursor: "pointer",
                      background: it.checked ? T.blue + "14" : "transparent" }}>
                    <input type="checkbox" checked={it.checked} onChange={() => togglePreview(it.key)}
                      style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ color: T.txt2, fontSize: 12 }}>{it.row.isoDate}</span>
                        <span style={{ color: it.row.amount < 0 ? T.neg : T.pos, fontSize: 13, fontWeight: 700 }}>
                          {it.row.amount.toFixed(2)} €
                        </span>
                      </div>
                      <div style={{ color: T.txt, fontSize: 13, lineHeight: 1.35, wordBreak: "break-word" }}>
                        {it.row.desc}
                      </div>
                      {it.status !== "new" && (
                        <span style={{ display: "inline-block", marginTop: 3, fontSize: 11, fontWeight: 700,
                          color: it.status === "exact" ? T.txt2 : T.gold }}>
                          {it.status === "exact" ? "schon vorhanden" : "mögliche Dublette (Datum + Betrag)"}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <PButton onClick={commitImport} disabled={busy} bg={T.pos}>
                {preview.filter((i) => i.checked).length} Buchungen importieren
              </PButton>
            </>
          )}

          {busy && <Box tone="info">Bitte warten…</Box>}
          {msg && <Box tone={msg.tone}>{msg.text}</Box>}
          {result && (
            <Box tone="tip">
              <b>{result.added}</b> neue Umsätze importiert · {result.dup} Duplikate · {result.skipped} vorgemerkt übersprungen.
            </Box>
          )}
        </div>
      </div>
    </div>
  );
}

export { EnableBankingConnectScreen };
