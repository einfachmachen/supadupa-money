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
} from "../../utils/enableBankingStore.js";

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

  const [relayUrl, setRelayUrl] = useState("");
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

  const client = () => createEnableBankingClient({ relayUrl, appId, privateKeyPem: privateKey });
  const credsComplete = relayUrl && appId && privateKey;

  useEffect(() => {
    (async () => {
      const c = await loadEbCreds();
      setRelayUrl(c.relayUrl);
      setAppId(c.appId);
      setPrivateKey(c.privateKey);
      setAccMap(await loadEbAccountMap());
      // Nach Bank-Redirect zurückgekehrt? (in main.jsx abgefangen)
      const code = sessionStorage.getItem("eb_pending_code");
      if (code && c.relayUrl && c.appId && c.privateKey) {
        sessionStorage.removeItem("eb_pending_code");
        resumeSession(code, c);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    saveEbCreds({ relayUrl, appId, privateKey });
    setMsg({ tone: "tip", text: "Zugangsdaten lokal gespeichert." });
  };

  const loadBanks = async () => {
    setBusy(true); setMsg(null);
    try {
      saveEbCreds({ relayUrl, appId, privateKey });
      const r = await client().listAspsps(country);
      const list = (r?.aspsps || r || []).map((a) => a?.name || a).filter(Boolean);
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
        window.location.href = r.url; // Weiterleitung zur Bank
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
      const accs = normalizeAccounts(r);
      setSessionAccounts(accs);
      const m = { ...(await loadEbAccountMap()) };
      accs.forEach((a) => { if (!m[a.uid]) m[a.uid] = accounts[0]?.id || "acc-giro"; });
      setAccMap(m);
      setMsg({ tone: "tip", text: `${accs.length} Konto/Konten verbunden. Zuordnen und Umsätze abrufen.` });
    } catch (e) {
      setMsg({ tone: "danger", text: String(e.message || e) });
    }
    setBusy(false);
  };

  const importTx = async () => {
    setBusy(true); setMsg(null); setResult(null);
    try {
      saveEbAccountMap(accMap);
      const known = buildKnownFps(txs);
      const dateFrom = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const cl = client();
      let added = 0, dup = 0, skipped = 0;
      const newTxs = [];
      for (const a of sessionAccounts) {
        const appAccId = accMap[a.uid] || accounts[0]?.id || "acc-giro";
        const r = await cl.getTransactions(a.uid, { dateFrom });
        const rows = mapEnableBankingTransactions(r?.transactions || [], appAccId);
        rows.forEach((row) => {
          if (row.pending) { skipped++; return; } // vorgemerkte Bank-Umsätze überspringen
          const fpNorm = txFingerprintNorm(row.isoDate, row.amount, row.desc, appAccId);
          if (known.has(row.fp) || known.has(fpNorm)) { dup++; return; }
          known.add(row.fp);
          added++;
          newTxs.push({
            id: "eb-" + uid(), date: row.isoDate, totalAmount: Math.abs(row.amount),
            desc: row.desc, note: "", pending: false, accountId: appAccId, splits: [],
            _csvType: row.amount > 0 ? "income" : "expense", _fp: row.fp, _csvSource: "Enable Banking",
          });
        });
      }
      if (newTxs.length) {
        setTxs((p) => [...newTxs, ...p].sort((x, y) => y.date.localeCompare(x.date)));
      }
      setResult({ added, dup, skipped });
      setMsg({ tone: "tip", text: `Fertig: ${added} neu, ${dup} Duplikate, ${skipped} vorgemerkt übersprungen.` });
    } catch (e) {
      setMsg({ tone: "danger", text: String(e.message || e) });
    }
    setBusy(false);
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
        padding: "16px 18px calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          <Box tone="warn">
            <b>Experimentell.</b> Voraussetzung: ein deployter Relay-Worker und ein
            Enable-Banking-Zugang. Schritt-für-Schritt erklärt die Hilfe „Bank verbinden“.
          </Box>

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
          {banks && (
            <>
              <label style={labelStyle}>Bank</label>
              <select style={inputStyle} value={bank} onChange={(e) => setBank(e.target.value)}>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <PButton onClick={connect} disabled={busy || !bank} bg={T.gold}>
                Mit Bank verbinden (Weiterleitung)
              </PButton>
            </>
          )}

          {/* 3. Konten & Import */}
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
              <PButton onClick={importTx} disabled={busy} bg={T.pos}>
                Umsätze abrufen (letzte 90 Tage)
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
