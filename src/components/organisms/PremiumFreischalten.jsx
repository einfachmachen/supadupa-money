// Einstellungen → „Premium freischalten": Lizenzcode eingeben, Status sehen.
//
// Zwei Zustände, bewusst deutlich unterschieden:
//   • freigeschaltet — Stufe, Mailadresse, Gültigkeit, Knopf zum Entfernen
//   • nicht freigeschaltet — Eingabefeld, Kauf-Hinweis, Liste der Funktionen
//
// Die Fläche tönt sich mit dem Gold-Ton. Die Schrift darauf darf deshalb
// NICHT derselbe Rohton sein (der Untergrund ist ja in ihre Richtung
// verschoben) — `aufToenung` rechnet den getönten Grund zusammen und gibt
// den Wunschton nur zurück, wenn er darauf trägt. Siehe
// tests/selbstgetoenteFlaechen.test.js.

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { Li } from "../../utils/icons.jsx";
import { aufGrund, aufToenung } from "../../theme/amtPill.js";
import { TIER_LABEL, TIER_FEATURES, FEATURES, wunschStufe } from "../../utils/licenseFeatures.js";

// Unix-Sekunden → „18.09.2026"
function datumText(expSekunden) {
  if (!expSekunden) return "";
  try {
    return new Date(expSekunden * 1000).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch (e) { return ""; }
}

function PremiumFreischalten() {
  const {
    istFreigeschaltet, tier, lizenzMail, lizenzBis,
    freischalten, lizenzEntfernen, lizenzLaeuft, lizenzFehler,
    frageBestaetigung,
  } = useContext(AppCtx);

  const [code, setCode] = useState("");
  const [geschafft, setGeschafft] = useState(false);

  const absenden = async () => {
    const r = await freischalten(code);
    if (r?.ok) {
      setCode("");
      setGeschafft(true);
      setTimeout(() => setGeschafft(false), 2600);
    }
  };

  // Gold als Rohton fuer Flaeche/Rahmen, gerechnete Schrift darauf.
  const grundAnteil = 0x14 / 255;
  const goldSchrift = aufToenung(T.gold, grundAnteil);

  if (istFreigeschaltet) {
    return (
      <div style={{ padding: "12px 13px", borderRadius: 12,
        background: T.gold + "14", border: `1px solid ${T.gold}55` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          {Li("sparkles", 17, aufGrund(T.gold, 3))}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: goldSchrift }}>
              {/* Nie den Rohwert rendern: eine Stufe, die die Tabelle nicht
                  kennt (aelterer Client, neuer Code), waere sonst als roher
                  Schluessel oder — im Test-Mock — als Funktion im Text. */}
              {TIER_LABEL[tier] || "Premium"} freigeschaltet
            </div>
            {lizenzMail && (
              <div style={{ fontSize: 10, color: T.txt2, marginTop: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lizenzMail}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11, color: T.txt2, lineHeight: 1.5, marginBottom: 10 }}>
          Freigeschaltet: {(TIER_FEATURES[tier] || []).map((f) => FEATURES[f]?.label || f).join(", ") || "—"}.
          {lizenzBis ? ` Prüfung erneuert sich bis ${datumText(lizenzBis)} von selbst.` : ""}
        </div>

        <button
          onClick={() => frageBestaetigung?.(
            "Lizenz von diesem Gerät entfernen?\n\nDein Code bleibt gültig — Du kannst ihn jederzeit wieder eingeben.",
            () => lizenzEntfernen?.(),
            { jaLabel: "Entfernen", ton: "gefahr" })}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px",
            borderRadius: 8, border: `1px solid ${T.bd}`, background: "rgba(255,255,255,0.04)",
            color: T.txt2, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          {Li("log-out", 12, T.txt2)} Lizenz entfernen
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ color: T.txt2, fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
        Alles, was SupaDupa Money lokal rechnet — Trend, Money Mood, Budgets, Tanken,
        Themes, Import — bleibt <b style={{ color: T.txt }}>dauerhaft frei</b>.
        Kostenpflichtig sind nur die Funktionen mit eigenem Server dahinter:
      </div>

      <div style={{ marginBottom: 12 }}>
        {Object.entries(FEATURES).map(([schluessel, f]) => (
          <div key={schluessel}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
            {Li("check", 13, aufGrund(T.gold, 3))}
            <span style={{ fontSize: 12, color: T.txt, flex: 1 }}>{f.label}</span>
            <span style={{ fontSize: 10, color: T.txt2, fontWeight: 700 }}>
              ab {TIER_LABEL[wunschStufe(schluessel)] || "—"}
            </span>
          </div>
        ))}
      </div>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") absenden(); }}
        placeholder="Lizenzcode eingeben"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        style={{ ...INP, marginBottom: 8 }}
      />

      <button
        onClick={absenden}
        disabled={lizenzLaeuft || !code.trim()}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: "100%", padding: "10px 8px", borderRadius: 9, border: "none",
          background: T.gold, color: T.on_accent, fontSize: 12, fontWeight: 800,
          fontFamily: "inherit",
          cursor: lizenzLaeuft || !code.trim() ? "default" : "pointer",
          opacity: lizenzLaeuft || !code.trim() ? 0.5 : 1 }}>
        {Li(geschafft ? "check" : "sparkles", 13, T.on_accent)}
        {lizenzLaeuft ? "Wird geprüft…" : geschafft ? "Freigeschaltet!" : "Premium freischalten"}
      </button>

      {lizenzFehler && (
        <div style={{ marginTop: 9, padding: "8px 10px", borderRadius: 8,
          background: T.neg + "18", border: `1px solid ${T.neg}55`,
          color: aufToenung(T.neg, 0x18 / 255), fontSize: 11, lineHeight: 1.45 }}>
          {lizenzFehler}
        </div>
      )}

      <div style={{ color: T.txt2, fontSize: 10, marginTop: 10, lineHeight: 1.5 }}>
        Den Code bekommst Du nach dem Kauf per E-Mail. Er gilt auf allen Deinen
        Geräten — einmal je Gerät eingeben.
      </div>
    </div>
  );
}

export { PremiumFreischalten };
