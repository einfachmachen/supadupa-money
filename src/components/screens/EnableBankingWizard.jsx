// Geführter Vollbild-Assistent „Bank verbinden" (Enable Banking) — vereint die
// frühere reine Erklär-Anleitung (EnableBankingGuide) und den separaten
// funktionalen Connect-Screen (EnableBankingConnectScreen) zu EINEM
// Schritt-für-Schritt-Ablauf, analog zum Cloud-Sync-Assistenten
// (CloudSetupWizard): je Seite eine kurze Erklärung UND direkt die dafür
// nötigen Eingabefelder/Aktionen — Weiterschalten über den Master-„+"-Knopf.
//
// Funktionale Logik (Zugangsdaten, Bank-Liste, Session/Konten, Vorschau,
// Import) ist unverändert aus dem alten Connect-Screen übernommen.

import React, { useContext, useEffect, useRef, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { Li } from "../../utils/icons.jsx";
import { uid } from "../../utils/format.js";
import { txFingerprintNorm } from "../../utils/tx.js";
import {
  createEnableBankingClient,
  mapEnableBankingTransactions,
} from "../../utils/enableBanking.js";
import {
  loadEbCreds,
  saveEbCreds,
  loadEbAccountMap,
  saveEbAccountMap,
  loadEbSessionList,
  upsertEbSession,
  removeEbSession,
  saveEbDiag,
  loadEbDiag,
  clearEbDiag,
} from "../../utils/enableBankingStore.js";
import { friendlyBankError, fetchAllTransactions, buildKnownFps, buildKnownPendingFps } from "../../utils/enableBankingFetch.js";

// Vom Betreiber bereitgestellter Standard-Relay (datenlos, geteilt).
const DEFAULT_RELAY = "https://enable-banking-proxy.relay-url-supadupa-money.workers.dev";
const SIGNUP_URL = "https://enablebanking.com";
const ACCENT = T.gold;

// Eine Seite pro Schritt — Erklärung + die für diesen Schritt nötigen
// Eingaben/Aktionen, genau wie beim Cloud-Sync-Assistenten.
const STEPS = [
  { key: "intro",        title: "Übersicht" },
  { key: "portal",       title: "Enable Banking" },
  { key: "app",          title: "App & Schlüssel" },
  { key: "zugang",       title: "Zugangsdaten" },
  { key: "freischalten", title: "Konten freischalten" },
  { key: "bank",         title: "Bank wählen" },
  { key: "zuordnen",     title: "Konten zuordnen" },
  { key: "vorschau",     title: "Vorschau & Import" },
  { key: "fertig",       title: "Fertig" },
];
const idxOf = (key) => STEPS.findIndex((s) => s.key === key);

function Box({ tone = "info", children }) {
  const map = { info: T.blue, tip: T.pos, warn: T.gold, danger: T.neg };
  const c = map[tone] || T.blue;
  return (
    <div style={{ background: c + "18", border: `1px solid ${c}55`, borderRadius: 12,
      padding: "12px 14px", color: T.txt, fontSize: 15, lineHeight: 1.55, marginTop: 12 }}>
      {children}
    </div>
  );
}

function Steps({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 12,
            background: ACCENT + "22", color: ACCENT, fontSize: 13, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
          <div style={{ color: T.txt, fontSize: 14.5, lineHeight: 1.5, paddingTop: 1 }}>{it}</div>
        </div>
      ))}
    </div>
  );
}

const lblStyle = { color: T.txt2, fontSize: 14.5, fontWeight: 700, marginBottom: 6, marginTop: 16, display: "block" };
const inputStyle = {
  width: "100%", boxSizing: "border-box", background: T.bg, color: T.txt,
  border: `1px solid ${T.bds || T.bd}`, borderRadius: 11, padding: "13px 14px", fontSize: 16, fontFamily: "inherit",
};
function LinkBtn({ href, icon, children, color }) {
  const c = color || ACCENT;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        textDecoration: "none", marginTop: 12, padding: "13px", borderRadius: 13,
        border: `1px solid ${c}55`, background: `${c}14`, color: c, fontSize: 16, fontWeight: 800 }}>
      {Li(icon, 18, c)} {children}
    </a>
  );
}
function ActionBtn({ onClick, disabled, children, bg, icon }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        width: "100%", marginTop: 12, padding: "13px", borderRadius: 13, border: "none",
        cursor: disabled ? "not-allowed" : "pointer", background: disabled ? T.disabled : (bg || ACCENT),
        color: disabled ? "#888" : T.on_accent, fontSize: 15.5, fontWeight: 800, opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit" }}>
      {icon && Li(icon, 16, disabled ? "#888" : T.on_accent)} {children}
    </button>
  );
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

function EnableBankingWizard({ onClose, onBack }) {
  const { txs, setTxs, accounts, setMasterOverride } = useContext(AppCtx);

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
  const [validUntil, setValidUntil] = useState(null);
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [diag, setDiag] = useState(null);
  const [diagCopied, setDiagCopied] = useState(false);

  const [step, setStep] = useState(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // onBack (falls von App.jsx gesetzt) verlässt den Assistenten auf Schritt 0
  // "nur eine Ebene" ins Daten-Menü — anders als onClose (echtes Verlassen)
  // hält das den vergrößerten +-Button-Zustand aufrecht. Fällt auf onClose
  // zurück, falls kein onBack übergeben wurde.
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const exitOnStep0 = () => (onBackRef.current || onCloseRef.current)?.();

  const redirectUrl =
    typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  const copyRedirect = async () => {
    try { await navigator.clipboard.writeText(redirectUrl); } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = redirectUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { /* ignorieren */ }
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const client = () => createEnableBankingClient({ relayUrl, appId, privateKeyPem: privateKey });
  const credsComplete = !!(relayUrl && appId && privateKey);

  // Eingaben sofort lokal persistieren (wie beim Cloud-Sync-Assistenten) —
  // ABER erst, nachdem der initiale Ladevorgang unten (siehe useEffect mit
  // loadEbCreds) abgeschlossen ist. Sonst feuert dieser Effekt beim allerersten
  // Render noch mit den leeren Anfangswerten (relayUrl=DEFAULT, appId="",
  // privateKey="") und überschreibt eine bereits gespeicherte Application-ID/
  // einen bereits hinterlegten Schlüssel, BEVOR der Ladevorgang sie wieder-
  // herstellen konnte — genau das ließ die Application-ID "verschwinden".
  const credsHydratedRef = useRef(false);
  useEffect(() => {
    if (!credsHydratedRef.current) return;
    saveEbCreds({ relayUrl, appId, privateKey });
  }, [relayUrl, appId, privateKey]);

  useEffect(() => {
    if (!banks) return;
    const f = bankFilter.trim().toLowerCase();
    const filtered = f ? banks.filter((b) => String(b).toLowerCase().includes(f)) : banks;
    if (filtered.length && !filtered.includes(bank)) setBank(filtered[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankFilter, banks]);

  const refreshConnected = async () => {
    const list = await loadEbSessionList();
    const valid = list.filter((s) => s && s.validUntil && new Date(s.validUntil) > new Date() && (s.accounts || []).length);
    setConnectedBanks(valid);
    if (!valid.length) { setSessionAccounts(null); setValidUntil(null); return; }
    const union = [];
    const seen = new Set();
    valid.forEach((s) => (s.accounts || []).forEach((a) => { if (!seen.has(a.uid)) { seen.add(a.uid); union.push(a); } }));
    setSessionAccounts(union);
    const soonest = valid.map((s) => s.validUntil).sort((a, b) => String(a).localeCompare(String(b)))[0];
    setValidUntil(soonest);
    // WICHTIG: Enable Banking vergibt Konto-UIDs teils NUR pro Sitzung — nach
    // einer erneuten Bank-Anmeldung kann sich die UID eines Kontos ändern.
    // Ein bisher unbekanntes UID NICHT still auf das erste Konto (Giro)
    // vorbelegen — sonst landen z. B. Tagesgeld-Umsätze unbemerkt auf Giro.
    // Stattdessen leer lassen: der Schritt „Konten zuordnen" zeigt das dann
    // deutlich als „— bitte wählen —" und verlangt eine bewusste Auswahl.
    const m = { ...(await loadEbAccountMap()) };
    setAccMap(m);
    // Kein setMsg hier mehr — der Verbindungs-Status steht jetzt dauerhaft
    // oben im Banner (statt bei jedem Refresh erneut unten aufzupoppen und
    // auf jedem Schritt liegen zu bleiben, siehe Banner weiter unten).
  };

  const disconnectBank = async (sess) => {
    await removeEbSession({ aspsp: sess.aspsp, sessionId: sess.sessionId });
    await refreshConnected();
  };

  const loadBanks = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await client().listAspsps(country);
      const names = (r?.aspsps || r || []).map((a) => a?.name || a).filter(Boolean);
      const list = [...new Set(names)].sort((a, b) => String(a).localeCompare(String(b)));
      setBanks(list);
      if (list.length && !bank) setBank(list[0]);
      setMsg({ tone: "tip", text: `${list.length} Banken geladen.` });
    } catch (e) {
      const raw = String(e.message || e);
      setMsg({ tone: "danger", text: friendlyBankError(raw), detail: raw });
    }
    setBusy(false);
  };

  const connect = async () => {
    setBusy(true); setMsg(null);
    try {
      const redirect = window.location.origin + window.location.pathname;
      const state = "ebmoney-" + Math.random().toString(36).slice(2);
      const r = await client().startAuth({ aspspName: bank, country, redirectUrl: redirect, state });
      if (r?.url) {
        try { sessionStorage.setItem("eb_pending_aspsp", bank || ""); } catch (e) { /* egal */ }
        setMsg({ tone: "info", text: "Weiterleitung zu deiner Bank…" });
        window.location.href = r.url;
      } else {
        setMsg({ tone: "danger", text: "Keine Weiterleitungs-URL von Enable Banking erhalten." });
        setBusy(false);
      }
    } catch (e) {
      const raw = String(e.message || e);
      saveEbDiag({ outcome: "auth-fehler", error: raw });
      setDiag({ ts: new Date().toISOString(), outcome: "auth-fehler", error: raw });
      setMsg({ tone: "danger", text: friendlyBankError(raw), detail: raw });
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
      const diagRec = {
        bank: (() => { try { return sessionStorage.getItem("eb_pending_aspsp") || bank || ""; } catch { return bank || ""; } })(),
        createKeys: r && typeof r === "object" ? Object.keys(r) : [],
        createAccounts: accs.length,
        sessionId: sessionId ? "(vorhanden)" : "(fehlt)",
        createRaw: (() => { try { return JSON.stringify(r).slice(0, 600); } catch { return String(r); } })(),
      };
      if (!accs.length && sessionId) {
        try {
          const s = await cl.getSession(sessionId);
          accs = normalizeAccounts(s);
          vu = vu || s?.access?.valid_until || s?.valid_until || null;
          aspspName = aspspName || s?.aspsp?.name || "";
          diagRec.getSessionKeys = s && typeof s === "object" ? Object.keys(s) : [];
          diagRec.getSessionAccounts = accs.length;
          diagRec.getSessionRaw = (() => { try { return JSON.stringify(s).slice(0, 600); } catch { return String(s); } })();
        } catch (e) { diagRec.getSessionError = String(e.message || e); }
      }
      if (!accs.length) {
        diagRec.outcome = "keine-konten";
        saveEbDiag(diagRec); setDiag({ ts: new Date().toISOString(), ...diagRec });
        await refreshConnected();
        const isPaypal = /paypal/i.test(aspspName || diagRec.bank || "");
        setMsg({ tone: "danger", text: isPaypal
          ? "PayPal hat die Freigabe bestätigt, liefert aber kein abrufbares Konto. PayPal stellt per PSD2 nur ein aktiviertes PayPal-Guthabenkonto („Geldbörse“) bereit — ohne dieses gibt es keine Konten zum Abrufen. Alternative: PayPal-Umsätze als CSV exportieren und über den CSV-Import einlesen."
          : "Bank verbunden, aber keine Konten erhalten. Details siehe „Diagnose“ — bitte kopieren und senden." });
        setBusy(false);
        return;
      }
      diagRec.outcome = "ok";
      saveEbDiag(diagRec); setDiag({ ts: new Date().toISOString(), ...diagRec });
      // Nicht auf das erste Konto (Giro) vorbelegen — s. Kommentar in
      // refreshConnected(). Neue/unbekannte Konto-UIDs bleiben bewusst leer.
      const m = { ...(await loadEbAccountMap()) };
      setAccMap(m);
      saveEbAccountMap(m);
      vu = vu || new Date(Date.now() + 90 * 86400000).toISOString();
      let pendingAspsp = "";
      try { pendingAspsp = sessionStorage.getItem("eb_pending_aspsp") || ""; sessionStorage.removeItem("eb_pending_aspsp"); } catch (e) { /* egal */ }
      const aspsp = aspspName || pendingAspsp || bank || "";
      await upsertEbSession({ sessionId, accounts: accs, validUntil: vu, aspsp });
      await refreshConnected();
      setMsg({ tone: "tip", text: `${aspsp || "Bank"} verbunden (gültig bis ${String(vu).slice(0, 10)}).` });
      setStep(idxOf("zuordnen"));
    } catch (e) {
      const raw = String(e.message || e);
      const rec = { outcome: "fehler", error: raw };
      saveEbDiag(rec); setDiag({ ts: new Date().toISOString(), ...rec });
      await refreshConnected();
      setMsg({ tone: "danger", text: friendlyBankError(raw), detail: raw });
    }
    setBusy(false);
  };

  // Initiales Laden: Zugangsdaten/Konto-Mapping/Diagnose, danach entweder einen
  // Bank-Redirect zu Ende führen (kommt mit ?code zurück) oder bestehende,
  // noch gültige Bank-Sessions wiederverwenden.
  useEffect(() => {
    (async () => {
      const c = await loadEbCreds();
      setRelayUrl(c.relayUrl || DEFAULT_RELAY);
      setAppId(c.appId);
      setPrivateKey(c.privateKey);
      credsHydratedRef.current = true; // ab jetzt darf der Live-Speichern-Effekt greifen
      setAccMap(await loadEbAccountMap());
      setDiag(await loadEbDiag());
      const code = sessionStorage.getItem("eb_pending_code");
      if (code && c.relayUrl && c.appId && c.privateKey) {
        sessionStorage.removeItem("eb_pending_code");
        setStep(idxOf("bank"));
        await refreshConnected();
        resumeSession(code, c);
        return;
      }
      await refreshConnected();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreview = async () => {
    setBusy(true); setMsg(null); setResult(null); setPreview(null);
    try {
      saveEbAccountMap(accMap);
      const known = buildKnownFps(txs);
      const knownPending = buildKnownPendingFps(txs);
      // Konto-gebunden, NICHT global — sonst versteckt eine zufällig
      // betragsgleiche Buchung auf einem ANDEREN Konto (z. B. eine
      // Tagesgeld-Zinsgutschrift vs. eine unabhängige Giro-Rate am selben Tag)
      // die echte neue Buchung fälschlich als "vorhanden".
      const amtIndex = new Set();
      (txs || []).forEach((t) => {
        if (t.pending) return;
        amtIndex.add(`${t.accountId}|${t.date}|${Math.round(Math.abs(t.totalAmount) * 100)}`);
      });
      const cl = client();
      const items = [];
      for (const a of sessionAccounts) {
        const appAccId = accMap[a.uid] || accounts[0]?.id || "acc-giro";
        const rawTx = await fetchAllTransactions(cl, a.uid, dateFrom);
        const rows = mapEnableBankingTransactions(rawTx, appAccId);
        rows.forEach((row) => {
          const fpNorm = txFingerprintNorm(row.isoDate, row.amount, row.desc, appAccId);
          const amtKey = `${appAccId}|${row.isoDate}|${Math.round(Math.abs(row.amount) * 100)}`;
          let status = "new";
          if (known.has(row.fp) || known.has(fpNorm)) status = "exact";
          // Noch bei der Bank vorgemerkte (PDNG) Zeile, die bereits als
          // Vormerkung importiert wurde → nicht erneut als „neu" anbieten.
          else if (row.pending && (knownPending.has(row.fp) || knownPending.has(fpNorm))) status = "exact";
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
      setStep(idxOf("vorschau"));
    } catch (e) {
      const txt = String(e.message || e);
      if (/\b(401|404)\b|expired|session|consent/i.test(txt)) {
        setSessionAccounts(null);
        setValidUntil(null);
        setMsg({ tone: "warn", text: "Bank-Freigabe abgelaufen oder ungültig — bitte erneut mit der Bank verbinden.", detail: txt });
        setStep(idxOf("bank"));
      } else {
        setMsg({ tone: "danger", text: friendlyBankError(txt), detail: txt });
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
      id: "eb-" + uid(), date: row.isoDate,
      totalAmount: row.pending ? row.amount : Math.abs(row.amount),
      desc: row.desc, note: "", pending: !!row.pending, accountId: accId, splits: [],
      _csvType: row.amount > 0 ? "income" : "expense", _fp: row.fp, _csvSource: "Enable Banking",
      ...(row._ebRef ? { _ebRef: row._ebRef } : {}),
    }));
    setTxs((p) => [...newTxs, ...p].sort((x, y) => y.date.localeCompare(x.date)));
    setResult({ added: newTxs.length });
    setMsg({ tone: "tip", text: `${newTxs.length} Buchungen importiert.` });
    setPreview(null);
    setStep(idxOf("fertig"));
  };

  // ── Master-„+"-Button übernimmt die Schritt-Steuerung ──────────────────
  const back = () => (step === 0 ? exitOnStep0() : setStep((s) => s - 1));
  const stepKey = STEPS[step].key;
  const stepReady =
    stepKey === "zugang" ? credsComplete :
    stepKey === "bank" ? !!sessionAccounts :
    stepKey === "zuordnen" ? !!preview :
    true;
  useEffect(() => {
    const isLast = step === STEPS.length - 1;
    setMasterOverride?.({
      label: isLast ? "✓ Fertig" : "Weiter",
      disabled: !stepReady,
      onConfirm: () => {
        if (isLast) { onCloseRef.current?.(); return; }
        if (!stepReady) return;
        setStep((s) => Math.min(STEPS.length - 1, s + 1));
      },
      onBack: () => { if (step === 0) exitOnStep0(); else setStep((s) => Math.max(0, s - 1)); },
      onDismiss: () => onCloseRef.current?.(),
    });
    return () => setMasterOverride?.(null);
  }, [step, stepReady]);

  const checkedCount = (preview || []).filter((i) => i.checked).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 320, display: "flex", flexDirection: "column",
      paddingBottom: "57px" }}>
      {/* Header — einheitlich mit den anderen Daten-Tab-Dialogen (siehe MobileHeader) */}
      <MobileHeader title="Bank verbinden"
        subtitle={`Schritt ${step + 1}/${STEPS.length} · ${STEPS[step].title}`}
        icon="landmark" iconColor={ACCENT}
        onBack={back}
        right={
          <button onClick={() => onCloseRef.current?.()} title="Schließen" aria-label="Schließen"
            style={{ background: "rgba(255,255,255,0.08)", border: "none", color: T.txt2,
              width: 36, height: 36, borderRadius: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {Li("x", 18, T.txt2)}
          </button>
        }/>

      {/* Fortschritts-Punkte */}
      <div style={{ display: "flex", gap: 6, padding: "10px 18px 0", flexShrink: 0 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? ACCENT : T.bd }} />
        ))}
      </div>

      {/* Verbindungs-Status: dauerhaft sichtbar oben, auf JEDEM Schritt (statt
          als Meldung unten, die auf jeder Seite erneut/veraltet auftaucht).
          Nur "Konten zuordnen" selbst blendet ihn aus — dort wäre er sinnlos. */}
      {validUntil && stepKey !== "zuordnen" && (
        <div style={{ margin: "10px 18px 0", padding: "10px 14px", borderRadius: 12,
          background: T.pos + "18", border: `1px solid ${T.pos}55`,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {Li("check-circle", 18, T.pos)}
          <div style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 13, lineHeight: 1.4 }}>
            Bank-Verbindung ist schon aktiv — gültig bis <b>{String(validUntil).slice(0, 10)}</b>.
          </div>
          <button onClick={() => setStep(idxOf("zuordnen"))}
            style={{ flexShrink: 0, background: T.pos, border: "none", borderRadius: 9,
              padding: "8px 11px", color: T.on_accent, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              whiteSpace: "nowrap" }}>
            Konten zuordnen →
          </button>
        </div>
      )}

      {/* Inhalt */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
        padding: "8px 18px calc(190px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {stepKey === "intro" && (
            credsComplete ? (
              // Bereits eingerichtet: eine zusammengefasste Status-Seite statt
              // erneut durch die Erklär-Schritte zu müssen — mit klaren
              // Sprungzielen, statt die bestehenden Zugangsdaten "nebenbei"
              // beim Durchklicken versehentlich zu verändern.
              <>
                <Box tone="tip">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 6 }}>
                    {Li("check-circle", 17, T.pos)} Zugang eingerichtet
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                    <div>Application-ID: <code style={{ fontFamily: "monospace" }}>{appId}</code></div>
                    <div>Schlüssel: hinterlegt ✓</div>
                  </div>
                  <button onClick={() => setStep(idxOf("zugang"))}
                    style={{ display: "block", marginTop: 10, background: "transparent", border: `1px solid ${T.bd}`,
                      color: T.txt2, borderRadius: 9, padding: "8px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                    Zugangsdaten ansehen/ändern →
                  </button>
                </Box>

                {connectedBanks.length > 0 ? (
                  // "Konten zuordnen" steht schon dauerhaft im Banner oben —
                  // hier nur der Weg zu einer WEITEREN Bank.
                  <Box tone="tip">
                    {connectedBanks.length} Bank{connectedBanks.length !== 1 ? "en" : ""} verbunden.
                    <button onClick={() => setStep(idxOf("bank"))}
                      style={{ display: "block", marginTop: 8, background: "transparent", border: `1px solid ${T.bd}`,
                        color: T.txt2, borderRadius: 9, padding: "8px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                      Weitere Bank verbinden →
                    </button>
                  </Box>
                ) : (
                  <Box tone="info">
                    Noch keine Bank verbunden.
                    <button onClick={() => setStep(idxOf("bank"))}
                      style={{ display: "block", marginTop: 8, background: "transparent", border: `1px solid ${ACCENT}66`,
                        color: ACCENT, borderRadius: 9, padding: "8px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                      Jetzt Bank verbinden →
                    </button>
                  </Box>
                )}
              </>
            ) : (
              <>
                <Box tone="info">
                  Statt CSV-Dateien zu exportieren, holst du deine Bankumsätze direkt —
                  über deinen eigenen, kostenlosen Zugang bei <b>Enable Banking</b>.
                </Box>
                <Steps items={[
                  "Komplett kostenlos für dich.",
                  "Dein Bank-Login bleibt bei deiner Bank — wir sehen ihn nie.",
                  "Einmalige Einrichtung (ca. 10 Minuten), danach nur noch „Aktualisieren“.",
                ]}/>
                <Box tone="info">
                  Funktioniert aktuell mit Banken in <b>EU &amp; UK</b>.
                </Box>
              </>
            )
          )}

          {stepKey === "portal" && (
            <>
              <div style={{ color: T.txt2, fontSize: 15, lineHeight: 1.55 }}>
                Enable Banking ist der Dienst, der die regulierte Verbindung zu deiner
                Bank herstellt. Du legst dort ein kostenloses Konto an.
              </div>
              <Steps items={[
                "Öffne enablebanking.com und registriere dich kostenlos.",
                "Bestätige deine E-Mail-Adresse.",
                "Melde dich im Portal an.",
              ]}/>
              <LinkBtn href={SIGNUP_URL} icon="link">enablebanking.com öffnen</LinkBtn>
            </>
          )}

          {stepKey === "app" && (
            <>
              <div style={{ color: T.txt2, fontSize: 15, lineHeight: 1.55 }}>
                Im Portal registrierst du eine „Application“. Dabei erzeugt dein
                Browser einen privaten Schlüssel als Datei.
              </div>
              <Steps items={[
                "Im Portal „Applications“ → neue Application anlegen.",
                "Als Redirect-URL genau die Adresse unten eintragen.",
                "Die heruntergeladene Schlüssel-Datei (…pem) sicher speichern.",
                "Die angezeigte Application-ID notieren.",
              ]}/>
              <label style={lblStyle}>Deine Redirect-URL (im Portal eintragen)</label>
              <div style={{ background: T.bg, border: `1px solid ${T.bds}`, borderRadius: 11,
                padding: "10px 12px", fontSize: 12.5, fontFamily: "monospace", wordBreak: "break-all",
                color: redirectUrl ? T.txt : T.neg }}>
                {redirectUrl || "—"}
              </div>
              <button onClick={copyRedirect}
                style={{ marginTop: 8, padding: "8px 14px", borderRadius: 11, border: "none",
                  background: copied ? T.pos : ACCENT, color: T.on_accent, fontSize: 14, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {Li(copied ? "check" : "copy", 16, T.on_accent)}
                {copied ? "kopiert" : "Redirect-URL kopieren"}
              </button>
              <Box tone="danger">
                Der <b>.pem-Schlüssel</b> ist dein privater Zugang — wie ein Passwort.
                Sicher aufbewahren (z. B. Passwort-Manager) und niemandem weitergeben.
              </Box>
            </>
          )}

          {stepKey === "zugang" && (
            <>
              <Box tone="info">
                Jetzt das, was Enable Banking dir gegeben hat, hier eintragen.
              </Box>
              <label style={lblStyle}>Relay-URL (Cloudflare Worker)</label>
              <input style={inputStyle} value={relayUrl} placeholder="https://…workers.dev"
                onChange={(e) => setRelayUrl(e.target.value.trim())} autoCapitalize="off" autoCorrect="off" />

              <label style={lblStyle}>Application-ID</label>
              <input style={inputStyle} value={appId} placeholder="aus dem Enable-Banking-Portal"
                onChange={(e) => setAppId(e.target.value.trim())} autoCapitalize="off" autoCorrect="off" />

              <label style={lblStyle}>Privater Schlüssel (.pem)</label>
              <input type="file" accept=".pem,.key,application/x-pem-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => setPrivateKey(String(reader.result || ""));
                  reader.readAsText(f);
                }}
                style={{ color: T.txt2, fontSize: 13, marginTop: 4, marginBottom: 6 }} />
              <textarea style={{ ...inputStyle, minHeight: 70, fontFamily: "monospace", fontSize: 11 }}
                value={privateKey} placeholder="-----BEGIN PRIVATE KEY-----…"
                onChange={(e) => setPrivateKey(e.target.value)} />

              <details style={{ marginTop: 16 }}>
                <summary style={{ color: T.txt2, fontSize: 13, cursor: "pointer" }}>
                  Verbindungs-Check (mit dem Portal abgleichen)
                </summary>
                <div style={{ background: T.bg, border: `1px solid ${T.bds}`, borderRadius: 11,
                  padding: "10px 12px", fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ color: T.txt2, flexShrink: 0, minWidth: 92 }}>Redirect-URL</span>
                    <span style={{ flex: 1, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all",
                      color: redirectUrl ? T.txt : T.neg }}>{redirectUrl || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 6 }}>
                    <span style={{ color: T.txt2, flexShrink: 0, minWidth: 92 }}>Application-ID</span>
                    <span style={{ flex: 1, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all",
                      color: appId ? T.txt : T.neg }}>{appId || "(fehlt)"}</span>
                  </div>
                </div>
              </details>
            </>
          )}

          {stepKey === "freischalten" && (
            <>
              <div style={{ color: T.txt2, fontSize: 15, lineHeight: 1.55 }}>
                Im kostenlosen Modus erlaubt Enable Banking nur Konten, die du selbst
                ausdrücklich freischaltest („Restricted Production“).
              </div>
              <Steps items={[
                "Im Portal deine Bank auswählen.",
                "Die Konten freischalten, die du in SupaDupa Money sehen willst.",
                "Freigabe speichern.",
              ]}/>
              <Box tone="warn">
                Ohne diesen Schritt werden später <b>keine Konten</b> gefunden. Genau
                das macht den Zugang gratis und auf deine eigenen Konten beschränkt.
              </Box>
            </>
          )}

          {stepKey === "bank" && (
            <>
              {connectedBanks.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ color: T.txt, fontSize: 15, fontWeight: 800, marginBottom: 8 }}>
                    Verbundene Banken ({connectedBanks.length})
                  </div>
                  {connectedBanks.map((s) => (
                    <div key={(s.aspsp || "") + "|" + s.sessionId}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        borderRadius: 11, border: `1px solid ${T.bd}`, background: "rgba(255,255,255,0.03)", marginBottom: 8 }}>
                      {Li("landmark", 18, ACCENT)}
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
                </div>
              )}

              {/* Verbindungs-Status steht jetzt dauerhaft im Banner oben. */}

              {diag && (
                <div style={{ marginTop: 12, border: `1px solid ${diag.outcome === "ok" ? T.pos : T.gold}55`,
                  borderRadius: 12, background: (diag.outcome === "ok" ? T.pos : T.gold) + "12", padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, color: T.txt, fontSize: 13.5, fontWeight: 800 }}>
                      Diagnose (letzter Versuch: {diag.outcome || "?"})
                    </div>
                    <button onClick={() => {
                      const txt = JSON.stringify(diag, null, 2);
                      try { navigator.clipboard?.writeText(txt); } catch (e) { /* egal */ }
                      setDiagCopied(true); setTimeout(() => setDiagCopied(false), 1500);
                    }}
                      style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 9, border: "none",
                        background: diagCopied ? T.pos : T.blue, color: T.on_accent, fontSize: 12, fontWeight: 800,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {Li(diagCopied ? "check" : "copy", 14, T.on_accent)} {diagCopied ? "Kopiert" : "Kopieren"}
                    </button>
                    <button onClick={() => { clearEbDiag(); setDiag(null); }} title="Diagnose verbergen"
                      style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                      {Li("x", 16, T.txt2)}
                    </button>
                  </div>
                  <pre style={{ margin: 0, color: T.txt2, fontSize: 11, lineHeight: 1.4, whiteSpace: "pre-wrap",
                    wordBreak: "break-word", maxHeight: 180, overflow: "auto", fontFamily: "monospace" }}>
                    {JSON.stringify(diag, null, 2)}
                  </pre>
                </div>
              )}

              {!credsComplete ? (
                <Box tone="warn">
                  Bitte zuerst beim Schritt „Zugangsdaten“ Relay-URL, Application-ID
                  und Schlüssel eintragen.
                </Box>
              ) : (
                <>
                  <label style={lblStyle}>Land</label>
                  <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().trim())}
                    maxLength={2} placeholder="DE" autoCapitalize="characters" />
                  <ActionBtn onClick={loadBanks} disabled={busy} icon="search">Banken laden</ActionBtn>

                  {banks && (() => {
                    const f = bankFilter.trim().toLowerCase();
                    const filtered = f ? banks.filter((b) => String(b).toLowerCase().includes(f)) : banks;
                    return (
                      <>
                        <label style={lblStyle}>Bank suchen</label>
                        <input style={inputStyle} value={bankFilter} placeholder="z. B. DKB"
                          onChange={(e) => setBankFilter(e.target.value)} autoCapitalize="off" autoCorrect="off" />
                        <label style={lblStyle}>Bank ({filtered.length} von {banks.length})</label>
                        <select style={inputStyle} value={bank} onChange={(e) => setBank(e.target.value)}>
                          {filtered.map((b, i) => <option key={b + "|" + i} value={b}>{b}</option>)}
                        </select>
                        <ActionBtn onClick={connect} disabled={busy || !bank} icon="link">
                          Mit Bank verbinden (im Browser)
                        </ActionBtn>
                        <div style={{ color: T.txt2, fontSize: 12.5, marginTop: 8, lineHeight: 1.45 }}>
                          Öffnet die Anmeldung auf der Seite deiner Bank. Dein
                          Passwort gibst du <b>nur dort</b> ein — niemals in dieser App.
                          Danach kommst du automatisch hierher zurück.
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </>
          )}

          {stepKey === "zuordnen" && (
            !sessionAccounts ? (
              <Box tone="warn">Bitte zuerst eine Bank verbinden.</Box>
            ) : (
              <>
                <div style={{ color: T.txt2, fontSize: 15, lineHeight: 1.55 }}>
                  Ordne jedes Bankkonto einem Konto in SupaDupa Money zu.
                </div>
                {sessionAccounts.some((a) => !accMap[a.uid]) && (
                  <Box tone="warn">
                    Enable Banking vergibt Konto-Kennungen teils nur je Sitzung — nach
                    einer erneuten Bank-Anmeldung kann sich die Zuordnung ändern.
                    Deshalb steht unten <b>bewusst nichts vorausgewählt</b>: bitte
                    jedes Konto einmal explizit prüfen/wählen.
                  </Box>
                )}
                {sessionAccounts.map((a) => {
                  const unmapped = !accMap[a.uid];
                  return (
                    <div key={a.uid} style={{ marginTop: 14 }}>
                      <div style={{ color: unmapped ? T.gold : T.txt2, fontSize: 12.5, marginBottom: 5,
                        display: "flex", alignItems: "center", gap: 5 }}>
                        {unmapped && Li("alert-triangle", 13, T.gold)} {a.label}
                      </div>
                      <select style={{ ...inputStyle, border: `1px solid ${unmapped ? T.gold : (T.bds || T.bd)}` }}
                        value={accMap[a.uid] || ""}
                        onChange={(e) => setAccMap((m) => {
                          // Sofort persistieren (wie bei den Zugangsdaten) — nicht erst
                          // beim späteren "Buchungen abrufen" speichern. Sonst geht eine
                          // Zuordnung verloren, sobald der Assistent zwischendurch neu
                          // gemountet wird (z. B. über die Bottom-Tabbar), und sie landet
                          // nie im Cloud-Sync-Export (der liest den gespeicherten Stand).
                          const next = { ...m, [a.uid]: e.target.value };
                          saveEbAccountMap(next);
                          return next;
                        })}>
                        <option value="">— bitte wählen —</option>
                        {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                  );
                })}
                <label style={lblStyle}>Buchungen ab Datum</label>
                <input type="date" style={inputStyle} value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)} />
                <div style={{ color: T.txt2, fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>
                  Tipp: Datum hochsetzen (z. B. auf nach deinem letzten Import),
                  damit alte, bereits vorhandene Buchungen gar nicht erst geladen werden.
                </div>
                <ActionBtn onClick={loadPreview}
                  disabled={busy || sessionAccounts.some((a) => !accMap[a.uid])} icon="download">
                  Buchungen abrufen
                </ActionBtn>
              </>
            )
          )}

          {stepKey === "vorschau" && (
            !preview ? (
              <Box tone="warn">Bitte zuerst beim Schritt „Konten zuordnen“ Buchungen abrufen.</Box>
            ) : (
              <>
                <div style={{ color: T.txt, fontSize: 15, fontWeight: 800 }}>
                  {checkedCount}/{preview.length} ausgewählt
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
                        background: it.checked ? ACCENT + "14" : "transparent" }}>
                      <input type="checkbox" checked={it.checked} onChange={() => togglePreview(it.key)}
                        style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ color: T.txt2, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {it.row.isoDate}
                            {it.row.pending && (
                              <span style={{ background: "rgba(245,166,35,0.15)", color: T.gold,
                                borderRadius: 4, padding: "0 4px", fontSize: 9, fontWeight: 700 }}>
                                vorgemerkt
                              </span>
                            )}
                          </span>
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
                <ActionBtn onClick={commitImport} disabled={busy} bg={T.pos} icon="check">
                  {checkedCount} Buchungen importieren
                </ActionBtn>
              </>
            )
          )}

          {stepKey === "fertig" && (
            <>
              {result && (
                <Box tone="tip">✓ <b>{result.added}</b> Buchungen importiert.</Box>
              )}
              <div style={{ color: T.txt2, fontSize: 15, lineHeight: 1.55, marginTop: 12 }}>
                Geschafft! Ab jetzt holst du neue Umsätze mit einem Tipp auf „Aktualisieren“.
              </div>
              <Steps items={[
                "Button „Aktualisieren“ holt neue Umsätze.",
                "Alle ~90 Tage einmal erneut bei der Bank freigeben (PSD2-Pflicht).",
              ]}/>
              <Box tone="tip">
                Kostenlos für deine eigenen Konten. Kein Bank-Login bei uns
                gespeichert — Enable Banking sieht die Umsätze technisch im
                Durchlauf, wie bei jedem Open-Banking-Anbieter.
              </Box>
            </>
          )}

          {busy && <Box tone="info">Bitte warten…</Box>}
          {msg && (
            <Box tone={msg.tone}>
              {msg.text}
              {msg.action && (
                <button onClick={msg.action.onClick}
                  style={{ display: "block", marginTop: 8, background: "transparent", border: `1px solid ${T.pos}66`,
                    color: T.pos, borderRadius: 9, padding: "8px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                  {msg.action.label}
                </button>
              )}
              {msg.detail && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: "pointer", color: T.txt2, fontSize: 12 }}>Technische Details</summary>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: T.txt2,
                    wordBreak: "break-all", marginTop: 4, whiteSpace: "pre-wrap" }}>{msg.detail}</div>
                </details>
              )}
            </Box>
          )}
        </div>
      </div>
    </div>
  );
}

export { EnableBankingWizard };
