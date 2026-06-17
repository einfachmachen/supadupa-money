// Geführte Vollbild-Einrichtung der persönlichen Cloud-DB (Cloudflare Worker).
//
// Der Nutzer macht alle Eingaben direkt hier: Worker-URL, Secret und optionale
// Verschlüsselungs-Passphrase. Jeder Schritt führt an die richtige Stelle
// (Cloudflare-Login, Deploy-Button, Dashboard-Variable) und prüft am Ende per
// Selbsttest die Verbindung. Eingaben werden sofort live in den Context
// geschrieben (setCfUrl/setCfSecret/setSyncPass) — derselbe Zustand wie in den
// Einstellungen, nur geführt.

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";

const DEPLOY_URL = "https://deploy.workers.cloudflare.com/?url=https://github.com/einfachmachen/supadupa-money/tree/main/worker-data";
const SIGNUP_URL = "https://dash.cloudflare.com/sign-up";

const STEPS = ["Konto", "Worker", "Secret", "Verschlüsselung", "Test"];

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

const lblStyle = { color: T.txt2, fontSize: 12.5, fontWeight: 700, marginBottom: 5, marginTop: 14, display: "block" };
const inputStyle = {
  width: "100%", boxSizing: "border-box", background: T.bg, color: T.txt,
  border: `1px solid ${T.bds || T.bd}`, borderRadius: 11, padding: "11px 12px", fontSize: 15, fontFamily: "inherit",
};
function LinkBtn({ href, icon, children, color }) {
  const c = color || T.cf || T.blue;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        textDecoration: "none", marginTop: 12, padding: "12px", borderRadius: 13,
        border: `1px solid ${c}55`, background: `${c}14`, color: c, fontSize: 15, fontWeight: 800 }}>
      {Li(icon, 16, c)} {children}
    </a>
  );
}

function CloudSetupWizard({ onClose }) {
  const {
    cfUrl, setCfUrl, cfSecret, setCfSecret, cfActive,
    syncPass, setSyncPass, syncEncActive, saveConfig,
  } = useContext(AppCtx);
  const [step, setStep] = useState(0);
  const [testState, setTestState] = useState("idle"); // idle|testing|ok|error
  const [testMsg, setTestMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const setUrl = (v) => { const u = v.trim(); setCfUrl?.(u); kvStore.setItem("cf_url", u); };
  const setSecret = (v) => { setCfSecret?.(v); kvStore.setItem("cf_secret", v); };

  const genSecret = () => {
    const b = crypto.getRandomValues(new Uint8Array(24));
    const s = btoa(String.fromCharCode(...b)).replace(/[+/=]/g, "").slice(0, 32);
    setSecret(s);
    try { navigator.clipboard?.writeText(s); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {}
  };

  const runTest = async () => {
    setTestState("testing"); setTestMsg("");
    try {
      const base = (cfUrl || "").replace(/\/$/, "");
      const r = await fetch(base + "/ping", { headers: { "X-Secret": cfSecret } });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(r.status === 401 ? "Secret stimmt nicht mit SYNC_SECRET im Worker überein" :
          r.status === 503 ? "SYNC_SECRET ist im Worker noch nicht gesetzt" : `Status ${r.status} ${txt.slice(0, 80)}`);
      }
      setTestState("ok"); setTestMsg("Verbindung steht!");
    } catch (e) {
      setTestState("error"); setTestMsg(String(e && e.message || e));
    }
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => (step === 0 ? onClose() : setStep((s) => s - 1));
  const canNext = () => {
    if (step === 1) return !!cfUrl;
    if (step === 2) return !!cfSecret;
    return true;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 320, display: "flex", flexDirection: "column" }}>
      {/* Header mit Safe-Area + Zurück */}
      <div style={{ background: T.surf, borderBottom: `1px solid ${T.bd}`,
        padding: "calc(12px + env(safe-area-inset-top, 0px)) 16px 12px",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={back}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", color: T.txt2,
            width: 44, height: 44, borderRadius: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {Li("arrow-left", 22, T.txt)}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.cf || T.blue, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Cloud-Datenbank · Schritt {step + 1}/{STEPS.length}
          </div>
          <div style={{ color: T.txt, fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginTop: 1 }}>
            {STEPS[step]}
          </div>
        </div>
        <button onClick={onClose} title="Schließen"
          style={{ background: "transparent", border: "none", color: T.txt2, cursor: "pointer",
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {Li("x", 22, T.txt2)}
        </button>
      </div>

      {/* Fortschritts-Punkte */}
      <div style={{ display: "flex", gap: 6, padding: "10px 18px 0", flexShrink: 0 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? (T.cf || T.blue) : T.bd }} />
        ))}
      </div>

      {/* Inhalt */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
        padding: "8px 18px calc(96px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {step === 0 && (
            <>
              <Box tone="info">
                Deine Buchungen liegen in <b>deiner eigenen</b> kleinen Cloud-DB bei
                Cloudflare — kostenlos, kein zentraler Server. Einmal einrichten, danach
                auf allen Geräten verfügbar.
              </Box>
              <LinkBtn href={SIGNUP_URL} icon="user-plus" color={T.pos}>Cloudflare-Konto anlegen</LinkBtn>
              <Box tone="tip">Hast du schon ein Konto? Dann direkt weiter zu Schritt 2.</Box>
            </>
          )}

          {step === 1 && (
            <>
              <Box tone="info">
                Der Button legt nach dem Cloudflare-Login den Worker <b>und</b> den
                Speicher (KV) automatisch an. Am Ende bekommst du eine Adresse wie
                <b> mbt-sync.dein-name.workers.dev</b> — die trägst du unten ein.
              </Box>
              <LinkBtn href={DEPLOY_URL} icon="upload-cloud">1-Klick: Worker einrichten</LinkBtn>
              <label style={lblStyle}>Worker-URL</label>
              <input style={inputStyle} value={cfUrl || ""} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mbt-sync.xxx.workers.dev" inputMode="url" autoCapitalize="off" autoCorrect="off" />
            </>
          )}

          {step === 2 && (
            <>
              <Box tone="info">
                Das Secret schützt deinen Worker. Generiere eins, <b>kopiere</b> es und
                hinterlege denselben Wert im Cloudflare-Dashboard:
                <br />Worker <b>mbt-sync</b> → Settings → Variables → <b>SYNC_SECRET</b> (als Secret).
              </Box>
              <button onClick={genSecret}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  width: "100%", marginTop: 12, padding: "12px", borderRadius: 13, border: "none",
                  background: T.pos, color: T.on_accent, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                {Li(copied ? "check" : "key", 16, T.on_accent)} {copied ? "Kopiert!" : "Secret generieren & kopieren"}
              </button>
              <label style={lblStyle}>Secret</label>
              <input style={inputStyle} value={cfSecret || ""} onChange={(e) => setSecret(e.target.value)}
                placeholder="wird generiert oder selbst gewählt" autoCapitalize="off" autoCorrect="off" />
            </>
          )}

          {step === 3 && (
            <>
              <Box tone="warn">
                <b>Optional, aber empfohlen.</b> Mit einer Passphrase werden deine Daten
                schon <b>im Browser verschlüsselt</b> — der Server sieht nur Chiffrat
                (Zero-Knowledge). Auf <b>jedem Gerät dieselbe</b> Passphrase eingeben.
                Geht sie verloren, sind die Cloud-Daten nicht mehr lesbar.
              </Box>
              <label style={lblStyle}>Passphrase (leer = unverschlüsselt)</label>
              <input style={inputStyle} type="password" value={syncPass || ""} onChange={(e) => setSyncPass?.(e.target.value)}
                placeholder="z. B. ein langer Merksatz" autoCapitalize="off" autoCorrect="off" />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                color: syncEncActive ? T.pos : T.gold, fontSize: 12.5, fontWeight: 700 }}>
                {Li(syncEncActive ? "lock" : "unlock", 14, syncEncActive ? T.pos : T.gold)}
                {syncEncActive ? "Verschlüsselung aktiv" : "Daten liegen unverschlüsselt in der Cloud"}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <Box tone="info">
                Letzter Schritt: Verbindung prüfen und deine Daten hochladen.
              </Box>
              <button onClick={runTest} disabled={!cfActive || testState === "testing"}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  width: "100%", marginTop: 12, padding: "12px", borderRadius: 13, border: `1px solid ${T.cf || T.blue}55`,
                  background: `${T.cf || T.blue}14`, color: T.cf || T.blue, fontSize: 15, fontWeight: 800,
                  cursor: !cfActive ? "not-allowed" : "pointer", opacity: !cfActive ? 0.5 : 1 }}>
                {Li("wifi", 16, T.cf || T.blue)} {testState === "testing" ? "Teste…" : "Verbindung testen"}
              </button>
              {testState === "ok" && <Box tone="tip">✓ {testMsg}</Box>}
              {testState === "error" && <Box tone="danger">Fehler: {testMsg}</Box>}
              {testState === "ok" && (
                <button onClick={() => { saveConfig?.(); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    width: "100%", marginTop: 12, padding: "13px", borderRadius: 13, border: "none",
                    background: T.pos, color: T.on_accent, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
                  {Li("upload-cloud", 16, T.on_accent)} Daten jetzt hochladen
                </button>
              )}
              <Box tone="tip">
                Weiteres Gerät später: dort dieselbe URL, dasselbe Secret und (falls genutzt)
                dieselbe Passphrase eintragen — dann „Cloudflare → Lokal".
              </Box>
            </>
          )}
        </div>
      </div>

      {/* Fußzeile: Zurück / Weiter (bzw. Fertig) */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0,
        display: "flex", gap: 10, padding: "12px 18px calc(12px + env(safe-area-inset-bottom, 0px))",
        background: T.surf, borderTop: `1px solid ${T.bd}` }}>
        <button onClick={back}
          style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${T.bd}`,
            background: "transparent", color: T.txt2, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {step === 0 ? "Abbrechen" : "Zurück"}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} disabled={!canNext()}
            style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none",
              background: canNext() ? (T.cf || T.blue) : T.bd, color: T.on_accent, fontSize: 16, fontWeight: 800,
              cursor: canNext() ? "pointer" : "not-allowed", opacity: canNext() ? 1 : 0.6 }}>
            Weiter
          </button>
        ) : (
          <button onClick={onClose}
            style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none",
              background: T.pos, color: T.on_accent, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
            Fertig
          </button>
        )}
      </div>
    </div>
  );
}

export { CloudSetupWizard };
