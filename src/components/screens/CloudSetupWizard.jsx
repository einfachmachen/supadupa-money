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
import { theme as T, accWert, flaecheAbgesetzt } from "../../theme/activeTheme.js";
import { schriftAuf, toenungsGrund, knopfPaar, vollKnopf } from "../../theme/amtPill.js";
import { MobileHeader } from "../atoms/MobileHeader.jsx";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";
// Worker-Quellcode als Roh-String — einzige Quelle der Wahrheit ist die echte
// Datei. So lässt er sich ohne GitHub direkt ins Cloudflare-Dashboard einfügen.
import WORKER_CODE from "../../../worker-data/data-store-worker.js?raw";

const DEPLOY_URL = "https://deploy.workers.cloudflare.com/?url=https://github.com/einfachmachen/supadupa-money/tree/main/worker-data";
const SIGNUP_URL = "https://dash.cloudflare.com/sign-up";
const DASH_URL = "https://dash.cloudflare.com/?to=/:account/workers-and-pages";

// Eine Seite pro Schritt mit höchstens EINEM Schaubild — auf kleinen Displays
// (z. B. iPhone 13 mini) sind mehrere Bilder pro Seite zu klein. Schlüssel statt
// Index, damit die Weiter-Freigabe unabhängig von der Reihenfolge bleibt.
const STEPS = [
  { key: "konto",   title: "Konto" },
  { key: "worker",  title: "Worker anlegen" },
  { key: "code",    title: "Code einfügen" },
  { key: "kv",      title: "KV-Namespace" },
  { key: "binding", title: "KV verbinden" },
  { key: "url",     title: "Worker-URL" },
  { key: "secret",  title: "Secret" },
  { key: "pass",    title: "Verschlüsselung" },
  { key: "test",    title: "Test" },
];
const idxOf = (key) => STEPS.findIndex((s) => s.key === key);

// ── Kontrast in diesem Assistenten ──────────────────────────────────────
//
// Alle neun Schritte liegen auf der Seitenfläche (`T.bg`). Zwei Fälle, die
// man auseinanderhalten muss:
//
//   `aufPlatte(rolle)`  – Schrift oder Symbol liegt DIREKT auf `T.bg`.
//        Gewünscht ist die Akzentfarbe dieser Rolle; trägt sie dort nicht,
//        liefert `schriftAuf` Weiß bzw. Fast-Schwarz. Der Wert kommt aus
//        `accWert()` und nicht aus `T.acc_*`: letzteres ist in Themes mit
//        eigenen Karten-Textfarben eine CSS-Variable, und die lässt sich
//        nicht nachrechnen.
//        Genau hier lag der gemeldete Fehler: „Passphrasen stimmen überein"
//        stand im ROHEN `T.pos` — auf der hellen Platte von „Tastenhell"
//        sind das 1,29:1, praktisch unsichtbar.
//
//   `imKasten(ton, wunsch)` – Schrift oder Symbol liegt IN einem Hinweis-
//        kasten. Der malt `${ton}18`, der Untergrund ist also in Richtung
//        des Tons verschoben. Themes mit gegensätzlichen Flächen erklären
//        `.hinweis-karte` per `flaechen_extra` zur Taste und malen deren
//        Farbe mit `!important` darüber — dann ist SIE der Untergrund.
const KASTEN_TON = 0x18 / 255;
const aufPlatte = (rolle, schwelle = 4.5) => schriftAuf(T.bg, accWert(rolle), schwelle);
const kastenGrund = (ton) => toenungsGrund(ton, KASTEN_TON, ".hinweis-karte");
const imKasten = (ton, wunsch, schwelle = 4.5) => schriftAuf(kastenGrund(ton), wunsch, schwelle);

function Box({ tone = "info", children }) {
  const map = { info: T.blue, tip: T.pos, warn: T.gold, danger: T.neg };
  const c = map[tone] || T.blue;
  return (
    <div className="hinweis-karte"
      style={{ background: c + "18", border: `1px solid ${c}55`, borderRadius: 12,
        padding: "12px 14px", color: T.txt, fontSize: 15.5, lineHeight: 1.55, marginTop: 12 }}>
      {children}
    </div>
  );
}

// Als FUNKTIONEN, nicht als Konstanten: der Assistent wird nachgeladen
// (Code-Splitting), und `T.txt2` & Co. liefern den Wert des Themes, das dabei
// gerade aktiv war. Wer danach das Theme wechselte, sah hier die alte Farbe.
const lbl = () => ({ color: T.txt2, fontSize: 14.5, fontWeight: 700, marginBottom: 6, marginTop: 16, display: "block" });

// Eingabefelder standen auf `T.bg` — auf GENAU der Farbe der Seite dahinter.
// Sichtbar war nur ein 1px-Rahmen, als Eingabefeld erkannte man sie nicht
// (Nutzer-Hinweis zu den Schritten 6, 7 und 8). `flaecheAbgesetzt()` nimmt die
// Kartenfarbe des Themes und rueckt sie selbst vom Untergrund ab, wo beide zu
// dicht beieinander liegen.
const feld = () => ({
  width: "100%", boxSizing: "border-box", background: flaecheAbgesetzt(), color: T.txt,
  border: `1px solid ${T.bds || T.bd}`, borderRadius: 11, padding: "13px 14px", fontSize: 17, fontFamily: "inherit",
});
// Aufklappbare Nebenwege („Alternative: 1-Klick per GitHub", „Technische
// Details"). Sie standen als blasser Fliesstext da — dass man sie ANTIPPEN
// kann, sah man nicht (Nutzer-Bild). Jetzt eine abgesetzte Zeile mit Rahmen
// und Dreieck: als Bedienelement erkennbar, aber ruhiger als ein Knopf,
// denn es ist ja der Nebenweg.
const klappZeile = () => ({
  cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8,
  background: flaecheAbgesetzt(), border: `1px solid ${T.bds || T.bd}`, borderRadius: 11,
  padding: "11px 13px", color: T.txt, fontSize: 14, fontWeight: 700,
});
// Weiterfuehrender Link („Cloudflare-Konto anlegen", „Deploy to Cloudflare").
// War eine 8-%-Toenung mit 33-%-Rahmen — auf heller Platte gemessene 1,03:1
// fuer die Flaeche: als Schaltflaeche nicht zu erkennen. Jetzt vollflaechig,
// und zwar im Theme-Akzent statt im Cloudflare-Orange: das gehoert zu keinem
// Theme der App und wirkte als Fremdkoerper (beides Nutzer-Hinweis).
function LinkBtn({ href, icon, children, color }) {
  const { grund, schrift, kante } = vollKnopf(color || T.blue, T.on_accent);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        textDecoration: "none", marginTop: 12, padding: "13px", borderRadius: 13,
        boxShadow: kante ? `inset 0 0 0 1.5px ${kante}` : "none", border: "none", background: grund, color: schrift,
        fontSize: 16, fontWeight: 800 }}>
      {Li(icon, 18, schrift)} {children}
    </a>
  );
}

// Schematische Schaubilder (SVG in public/img) — kein echter Screenshot, daher
// stabil gegen Cloudflare-UI-Änderungen. BASE_URL macht den Pfad deploy-fest.
// Volle Breite + große Schrift für gute Lesbarkeit auf kleinen Displays.
function Fig({ name, alt }) {
  return (
    <img src={`${import.meta.env.BASE_URL}img/${name}`} alt={alt}
      style={{ display: "block", width: "100%", margin: "14px auto 0",
        borderRadius: 14, border: `1px solid ${T.bd}` }} />
  );
}
const olStep = () => ({ margin: "10px 0 0", padding: "0 0 0 20px", color: T.txt, fontSize: 15.5, lineHeight: 1.6 });

// Die vollflächigen Aktionsknöpfe („Code kopieren", „Secret generieren",
// „Daten hochladen"): ganz in `T.pos`, Beschriftung `T.on_accent` darauf.
// `knopfPaar` gibt die Fläche unverändert zurück, solange sie trägt — und
// rückt sie nur im Ausnahmefall in 5-%-Schritten, wenn dort weder die
// Wunschschrift noch Schwarz oder Weiß auf 4,5:1 kommt.
const aktionsKnopf = () => vollKnopf(T.pos, T.on_accent);
// Derselbe Knopf, aber IN einem Hinweiskasten — dann ist der Kasten sein
// Untergrund, nicht die Seite. Sonst bekaeme er eine Kante, die er dort gar
// nicht braucht (oder keine, wo er eine braeuchte).
const kastenKnopf = (flaeche, ton) => vollKnopf(flaeche, T.on_accent, kastenGrund(ton));

// „Verbindung testen" (Schritt 9) war erst ein 8-%-Schleier mit duennem
// Rahmen — als KNOPF hat man ihn nicht erkannt. Vollflaechig in der
// CLOUDFLARE-Farbe wirkte er dann wie ein Fremdkoerper: Orange kommt in
// keinem Theme der App vor (beides Nutzer-Hinweis).
//
// Deshalb der Theme-Akzent `T.blue`. Die Hierarchie bleibt trotzdem
// erkennbar: die ausfuehrenden Knoepfe („kopieren", „hochladen") stehen in
// `T.pos`, die pruefenden/weiterfuehrenden in `T.blue`.
//
// Die Cloudflare-Farbe bleibt dort, wo sie WIEDERERKENNUNG stiftet statt zu
// dominieren: Kopf-Symbol und Fortschrittsbalken.
const testKnopf = () => vollKnopf(T.blue, T.on_accent);

function CloudSetupWizard({ onClose, onBack }) {
  const {
    cfUrl, setCfUrl, cfSecret, setCfSecret, cfActive,
    syncPass, setSyncPass, syncEncActive, saveConfig, setMasterOverride,
  } = useContext(AppCtx);
  const [step, setStep] = useState(0);
  const [testState, setTestState] = useState("idle"); // idle|testing|ok|error
  const [testMsg, setTestMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyWorkerCode = () => {
    try { navigator.clipboard?.writeText(WORKER_CODE); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1800); } catch (e) {}
  };

  // onClose stabil halten (Master-Override-Effekt soll nicht pro Render feuern)
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  // onBack (falls von App.jsx gesetzt) verlässt den Assistenten auf Schritt 0
  // "nur eine Ebene" ins Daten-Menü — anders als onClose (echtes Verlassen)
  // hält das den vergrößerten +-Button-Zustand aufrecht. Fällt auf onClose
  // zurück, falls kein onBack übergeben wurde.
  const onBackRef = React.useRef(onBack);
  onBackRef.current = onBack;
  const exitOnStep0 = () => (onBackRef.current || onCloseRef.current)?.();

  // Passphrase mit Sichtbarkeits-Auge und Wiederholungsfeld. Ein Tippfehler in
  // der Passphrase = Datenverlust → deshalb erst übernehmen (und „Weiter"
  // freigeben), wenn beide Felder identisch sind.
  const [showPass, setShowPass] = useState(false);
  const [pass1, setPass1] = useState(syncPass || "");
  const [pass2, setPass2] = useState(syncPass || "");
  const passMatch = pass1 === pass2;
  React.useEffect(() => {
    if (pass1 === pass2) setSyncPass?.(pass1);
  }, [pass1, pass2]);

  const setUrl = (v) => { const u = v.trim(); setCfUrl?.(u); kvStore.setItem("cf_url", u); };
  const setSecret = (v) => { setCfSecret?.(v); kvStore.setItem("cf_secret", v); };

  // Lokale Entwürfe für URL/Secret: Tippen ist sofort, der globale Wert (und damit
  // ein App-weites Re-Render) wird erst beim Verlassen des Feldes gesetzt.
  const [urlDraft, setUrlDraft] = useState(cfUrl || "");
  const [secretDraft, setSecretDraft] = useState(cfSecret || "");
  const urlFocused = React.useRef(false);
  const secFocused = React.useRef(false);
  React.useEffect(() => { if(!urlFocused.current) setUrlDraft(cfUrl || ""); }, [cfUrl]);
  React.useEffect(() => { if(!secFocused.current) setSecretDraft(cfSecret || ""); }, [cfSecret]);

  const genSecret = () => {
    const b = crypto.getRandomValues(new Uint8Array(24));
    const s = btoa(String.fromCharCode(...b)).replace(/[+/=]/g, "").slice(0, 32);
    setSecret(s); setSecretDraft(s);
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

  const back = () => (step === 0 ? exitOnStep0() : setStep((s) => s - 1));
  const k = STEPS[step].key;

  // Master-„+"-Button übernimmt die Schritt-Steuerung: Tipp = Weiter/Fertig,
  // Wisch ← = zurück (Schritt 0 → schließen), Wisch ↓ = schließen. Der Effekt
  // hängt nur an Bool-Readiness, nicht an den Rohtexten (sonst Tipp-Lag).
  const urlReady = !!cfUrl;
  const secretReady = !!cfSecret;
  const passReady = passMatch;
  React.useEffect(() => {
    const isLast = step === STEPS.length - 1;
    const key = STEPS[step].key;
    const stepReady = key === "url" ? urlReady : key === "secret" ? secretReady : key === "pass" ? passReady : true;
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
  }, [step, urlReady, secretReady, passReady]);

  return (
    <div className="formular-blatt"
      style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 320, display: "flex", flexDirection: "column",
        paddingBottom: "57px" }}>
      {/* Header — einheitlich mit den anderen Daten-Tab-Dialogen (siehe MobileHeader) */}
      <MobileHeader title="Cloud-Sync einrichten"
        subtitle={`Schritt ${step + 1}/${STEPS.length} · ${STEPS[step].title}`}
        icon="cloud" iconColor={T.cf || T.blue}
        onBack={back}
        right={
          <button onClick={onClose} title="Schließen" aria-label="Schließen"
            style={{ background: "rgba(255,255,255,0.08)", border: "none", color: T.txt2,
              width: 44, height: 44, borderRadius: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {Li("x", 20, T.txt2)}
          </button>
        }/>

      {/* Fortschritts-Punkte */}
      <div style={{ display: "flex", gap: 6, padding: "10px 18px 0", flexShrink: 0 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? aufPlatte("acc_cf", 3) : T.bd }} />
        ))}
      </div>

      {/* Verbindungs-Status: dauerhaft sichtbar oben, auf JEDEM Schritt (statt
          erst nach dem letzten Schritt sichtbar). Nur "Test" selbst blendet
          ihn aus — dort wäre er redundant. */}
      {cfActive && k !== "test" && (
        <div className="hinweis-karte"
          style={{ margin: "10px 18px 0", padding: "10px 14px", borderRadius: 12,
            background: T.pos + "18", border: `1px solid ${T.pos}55`,
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {Li("check-circle", 18, imKasten(T.pos, T.pos, 3))}
          <div style={{ flex: 1, minWidth: 0, color: T.txt, fontSize: 13, lineHeight: 1.4 }}>
            Cloud-Sync ist schon eingerichtet.
          </div>
          <button onClick={() => setStep(idxOf("test"))}
            style={{ flexShrink: 0, background: kastenKnopf(T.pos, T.pos).grund,
              boxShadow: kastenKnopf(T.pos, T.pos).kante ? `inset 0 0 0 1.5px ${kastenKnopf(T.pos, T.pos).kante}` : "none", border: "none",
              borderRadius: 9,
              padding: "8px 11px", color: kastenKnopf(T.pos, T.pos).schrift, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              whiteSpace: "nowrap" }}>
            Verbindung testen →
          </button>
        </div>
      )}

      {/* Inhalt */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
        padding: "8px 18px calc(190px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {k === "konto" && (
            cfActive ? (
              // Bereits eingerichtet: Status-Übersicht mit direkten Sprungzielen,
              // statt erneut durch die Cloudflare-Einrichtungs-Schritte zu müssen.
              <>
                <Box tone="tip">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 6 }}>
                    {Li("check-circle", 17, imKasten(T.pos, T.pos, 3))} Cloud-Sync eingerichtet
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                    <div>Worker-URL: <code style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{cfUrl}</code></div>
                    <div>Secret: hinterlegt ✓</div>
                    <div>Verschlüsselung: {syncEncActive ? "aktiv ✓" : "aus (unverschlüsselt)"}</div>
                  </div>
                  <button onClick={() => setStep(idxOf("url"))}
                    style={{ display: "block", marginTop: 10, background: "transparent", border: `1px solid ${T.bd}`,
                      color: T.txt2, borderRadius: 9, padding: "8px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                    Zugangsdaten ansehen/ändern →
                  </button>
                </Box>
                <Box tone="info">
                  Weiteres Gerät verbinden? Dort dieselbe URL, dasselbe Secret und
                  (falls genutzt) dieselbe Passphrase eintragen, dann testen.
                  <button onClick={() => setStep(idxOf("test"))}
                    style={{ display: "block", marginTop: 8, background: "transparent", border: `1px solid ${T.pos}66`,
                      color: imKasten(T.blue, T.pos), borderRadius: 9, padding: "8px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                    Verbindung testen →
                  </button>
                </Box>
              </>
            ) : (
              <>
                <Box tone="info">
                  Deine Buchungen liegen in <b>deiner eigenen</b> kleinen Cloud-DB bei
                  Cloudflare — kostenlos, kein zentraler Server. Einmal einrichten, danach
                  auf allen Geräten verfügbar.
                </Box>
                <LinkBtn href={SIGNUP_URL} icon="user-plus" color={T.pos}>Cloudflare-Konto anlegen</LinkBtn>
                <Box tone="tip">Hast du schon ein Konto? Dann einfach weiter.</Box>
              </>
            )
          )}

          {k === "worker" && (
            <>
              <Box tone="info">
                Lege deinen Worker im Cloudflare-Dashboard an — <b>ganz ohne GitHub</b>.
              </Box>
              <ol style={olStep()}>
                <li>Im <a href={DASH_URL} target="_blank" rel="noopener noreferrer" style={{ color: aufPlatte("acc"), fontWeight: 700 }}>Cloudflare-Dashboard</a> → <b>Workers &amp; Pages</b> <i>(Workers und Pages)</i> → <b>Create</b> <i>(Erstellen)</i> → <b>Worker</b>.</li>
                <li>Name z. B. <b>supadupa-sync</b> → <b>Deploy</b> <i>(Bereitstellen)</i>.</li>
              </ol>
              <Fig name="cloudflare-create-worker.svg" alt="Worker anlegen: Workers und Pages → Erstellen → Worker → Name → Bereitstellen" />
              <details style={{ marginTop: 12 }}>
                <summary style={klappZeile()}>
                  {Li("chevron-down", 16, T.txt2)} Alternative: 1-Klick per GitHub (nur mit öffentlichem Repo)
                </summary>
                <div style={{ marginTop: 8 }}>
                  <LinkBtn href={DEPLOY_URL} icon="upload-cloud">Deploy to Cloudflare</LinkBtn>
                  <div style={{ color: T.txt2, fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>
                    Funktioniert nur, wenn die Worker-Vorlage in einem öffentlichen Repo liegt
                    (Cloudflare forkt sie). Sonst nimm den Code-Weg.
                  </div>
                </div>
              </details>
            </>
          )}

          {k === "code" && (
            <>
              <Box tone="info">
                Jetzt den Worker-Code einsetzen: unten kopieren, im Editor einfügen.
              </Box>
              <button onClick={copyWorkerCode}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  width: "100%", marginTop: 12, padding: "12px", borderRadius: 13,
                  boxShadow: aktionsKnopf().kante ? `inset 0 0 0 1.5px ${aktionsKnopf().kante}` : "none", border: "none",
                  background: aktionsKnopf().grund, color: aktionsKnopf().schrift, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                {Li(codeCopied ? "check" : "copy", 16, aktionsKnopf().schrift)} {codeCopied ? "Code kopiert!" : "Worker-Code kopieren"}
              </button>
              <ol style={olStep()}>
                <li><b>Edit code</b> <i>(Code bearbeiten)</i> öffnen, alles markieren, den kopierten Code <b>einfügen</b> → <b>Deploy</b> <i>(Bereitstellen)</i>.</li>
              </ol>
              <Fig name="cloudflare-edit-code.svg" alt="Code einfügen: Code bearbeiten öffnen, alles markieren, einfügen, Bereitstellen" />
            </>
          )}

          {k === "kv" && (
            <>
              <Box tone="info">
                Lege den Speicher (<b>KV-Namespace</b>) an. Das geht <b>nur hier</b> —
                der Binding-Dialog im nächsten Schritt kann keinen neuen anlegen.
              </Box>
              <ol style={olStep()}>
                <li>Menü <b>Storage &amp; Databases → KV</b> <i>(Speicher und Datenbanken → KV)</i> — je nach Dashboard auch <b>Workers &amp; Pages → KV</b>.</li>
                <li><b>Create</b> <i>(Namespace erstellen)</i> → Name z. B. <b>supadupa-sync-kv</b>.</li>
              </ol>
              <Fig name="cloudflare-kv-create.svg" alt="KV-Namespace anlegen: Speicher und Datenbanken → KV → Namespace erstellen → Name" />
            </>
          )}

          {k === "binding" && (
            <>
              <Box tone="info">
                Verbinde den Speicher mit dem Worker (Binding).
              </Box>
              <ol style={olStep()}>
                <li>Reiter <b>Bindings</b> <i>(Bindungen)</i> öffnen — <b>eigener Reiter neben „Settings"</b>, nicht darunter → <b>Add binding</b> <i>(Bindung hinzufügen)</i> → Typ <b>KV namespace</b>.</li>
                <li><b>Variable name</b> <i>(Variablenname)</i>: genau <b>SYNC_KV</b>. <b>KV namespace</b>: den eben angelegten <b>supadupa-sync-kv</b> <b>auswählen</b>.</li>
              </ol>
              <Fig name="cloudflare-kv-binding.svg" alt="Binding-Dialog: SYNC_KV in Variablenname, angelegten Namespace auswählen" />
            </>
          )}

          {k === "url" && (
            <>
              <Box tone="info">
                Nach dem <b>Deploy</b> zeigt Cloudflare die Adresse deines Workers
                (endet auf <b>…workers.dev</b>). Trag sie hier ein.
              </Box>
              <label style={lbl()}>Worker-URL</label>
              <input style={feld()} value={urlDraft}
                onFocus={()=>{urlFocused.current=true;}}
                onBlur={()=>{urlFocused.current=false; setUrl(urlDraft);}}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://supadupa-sync.xxx.workers.dev" inputMode="url" autoCapitalize="off" autoCorrect="off" />
            </>
          )}

          {k === "secret" && (
            <>
              <Box tone="info">
                Das Secret schützt deinen Worker. So der Reihe nach:
                <ol style={{ margin: "8px 0 0", padding: "0 0 0 18px", lineHeight: 1.6 }}>
                  <li>Unten <b>„Secret generieren &amp; kopieren"</b> tippen — es entsteht ein langes Zufalls-Geheimnis (liegt dann in der Zwischenablage).</li>
                  <li>Im Dashboard: Worker <b>supadupa-sync</b> → <b>Settings → Variables and Secrets</b> <i>(Einstellungen → Variablen und Geheimnisse)</i> → <b>Add</b>. Variablenname <b>SYNC_SECRET</b>, Typ <b>Secret</b>, und in das Feld <b>Wert/Value</b> das kopierte Geheimnis <b>einfügen</b> → <b>Bereitstellen</b>.</li>
                  <li>Fertig — derselbe Wert steht unten schon im Feld <b>Secret</b>.</li>
                </ol>
              </Box>
              <button onClick={genSecret}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  width: "100%", marginTop: 12, padding: "12px", borderRadius: 13,
                  boxShadow: aktionsKnopf().kante ? `inset 0 0 0 1.5px ${aktionsKnopf().kante}` : "none", border: "none",
                  background: aktionsKnopf().grund, color: aktionsKnopf().schrift, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                {Li(copied ? "check" : "key", 16, aktionsKnopf().schrift)} {copied ? "Kopiert!" : "Secret generieren & kopieren"}
              </button>
              <Fig name="cloudflare-secret.svg" alt="Secret setzen: Typ Secret, Variablenname SYNC_SECRET, Wert = kopiertes Secret" />
              <label style={lbl()}>Secret</label>
              <input style={feld()} value={secretDraft}
                onFocus={()=>{secFocused.current=true;}}
                onBlur={()=>{secFocused.current=false; setSecret(secretDraft);}}
                onChange={(e) => setSecretDraft(e.target.value)}
                placeholder="wird generiert oder selbst gewählt" autoCapitalize="off" autoCorrect="off" />
            </>
          )}

          {k === "pass" && (
            <>
              <Box tone="warn">
                <b>Optional, aber empfohlen.</b> Mit einer Passphrase werden deine Daten
                schon <b>im Browser verschlüsselt</b> — der Server sieht nur Chiffrat
                (Zero-Knowledge). Auf <b>jedem Gerät dieselbe</b> Passphrase eingeben.
                Geht sie verloren, sind die Cloud-Daten nicht mehr lesbar.
              </Box>
              <label style={lbl()}>Passphrase (leer = unverschlüsselt)</label>
              <div style={{ position: "relative" }}>
                <input style={{ ...feld(), paddingRight: 44 }} type={showPass ? "text" : "password"}
                  value={pass1} onChange={(e) => setPass1(e.target.value)}
                  placeholder="z. B. ein langer Merksatz"
                  autoCapitalize="off" autoCorrect="off" autoComplete="new-password" spellCheck={false} />
                <button onClick={() => setShowPass((v) => !v)} title={showPass ? "verbergen" : "anzeigen"}
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", cursor: "pointer", padding: 6,
                    display: "flex", alignItems: "center" }}>
                  {Li(showPass ? "eye-off" : "eye", 18, T.txt2)}
                </button>
              </div>
              <label style={lbl()}>Passphrase wiederholen</label>
              <input style={feld()} type={showPass ? "text" : "password"}
                value={pass2} onChange={(e) => setPass2(e.target.value)}
                placeholder="zur Sicherheit nochmal eingeben"
                autoCapitalize="off" autoCorrect="off" autoComplete="new-password" spellCheck={false} />
              {/* Beide Zeilen stehen DIREKT auf der Platte — deshalb
                  `aufPlatte` statt der rohen Tonwerte (siehe oben). */}
              {(pass1 || pass2) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                  color: aufPlatte(passMatch ? "acc_pos" : "acc_neg"), fontSize: 12.5, fontWeight: 700 }}>
                  {Li(passMatch ? "check" : "alert-triangle", 14, aufPlatte(passMatch ? "acc_pos" : "acc_neg", 3))}
                  {passMatch ? "Passphrasen stimmen überein" : "Passphrasen stimmen noch nicht überein"}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                color: aufPlatte(syncEncActive ? "acc_pos" : "acc_gold"), fontSize: 12.5, fontWeight: 700 }}>
                {Li(syncEncActive ? "lock" : "unlock", 14, aufPlatte(syncEncActive ? "acc_pos" : "acc_gold", 3))}
                {syncEncActive ? "Verschlüsselung aktiv" : "Daten liegen unverschlüsselt in der Cloud"}
              </div>
            </>
          )}

          {k === "test" && (
            <>
              <Box tone="info">
                Letzter Schritt: Verbindung prüfen und deine Daten hochladen.
              </Box>
              {/* Bewusst OHNE `opacity` im gesperrten Zustand: ein halb-
                  durchsichtiger Knopf halbiert seinen Kontrast (derselbe
                  Fehler wie beim „Premium freischalten"-Knopf). Dass er noch
                  nicht geht, sagt stattdessen die Zeile darunter. */}
              <button onClick={runTest} disabled={!cfActive || testState === "testing"}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  width: "100%", marginTop: 12, padding: "13px", borderRadius: 13,
                  boxShadow: testKnopf().kante ? `inset 0 0 0 1.5px ${testKnopf().kante}` : "none", border: "none",
                  background: testKnopf().grund, color: testKnopf().schrift, fontSize: 15, fontWeight: 800,
                  fontFamily: "inherit",
                  cursor: !cfActive ? "not-allowed" : "pointer" }}>
                {Li("wifi", 16, testKnopf().schrift)} {testState === "testing" ? "Teste…" : "Verbindung testen"}
              </button>
              {!cfActive && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                  color: aufPlatte("acc_gold"), fontSize: 12.5, fontWeight: 700 }}>
                  {Li("alert-triangle", 14, aufPlatte("acc_gold", 3))}
                  Erst Worker-URL (Schritt {idxOf("url") + 1}) und Secret (Schritt {idxOf("secret") + 1}) eintragen.
                </div>
              )}
              {testState === "ok" && <Box tone="tip">✓ {testMsg}</Box>}
              {testState === "error" && <Box tone="danger">Fehler: {testMsg}</Box>}
              {testState === "ok" && (
                <button onClick={() => { saveConfig?.(); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    width: "100%", marginTop: 12, padding: "13px", borderRadius: 13,
                    boxShadow: aktionsKnopf().kante ? `inset 0 0 0 1.5px ${aktionsKnopf().kante}` : "none", border: "none",
                    background: aktionsKnopf().grund, color: aktionsKnopf().schrift, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
                  {Li("upload-cloud", 16, aktionsKnopf().schrift)} Daten jetzt hochladen
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

      {/* Steuerung über den Master-„+"-Button: Tipp = Weiter/Fertig,
          Wisch ← = zurück, Wisch ↓ = schließen. Zusätzlich oben Header-Pfeil/X. */}
    </div>
  );
}

export { CloudSetupWizard };
