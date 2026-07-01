// Inline-Panel im Dashboard für per Pull-to-Refresh abgerufene Bank-Umsätze.
//
// Zeigt die NEUEN (bereits dubletten-geschützt importierten) Buchungen der
// aktuellen Kontosicht (selAcc) direkt zwischen Hero und erster Kategorie an —
// jede mit einer Inline-Kategorie-Auswahl wie beim CSV-Import. Bereits
// vorhandene/erkannte Dubletten bleiben eingeklappt und lassen sich ausklappen.

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, uid, NUM_FONT } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";
import { CatPicker } from "../molecules/CatPicker.jsx";

function BankFetchPanel({ state, onClose, onRefetch, onUpdateStaged, onConfirm }) {
  const { accounts } = useContext(AppCtx);
  const [showExisting, setShowExisting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const accName = (accId) => (accounts || []).find((a) => a.id === accId)?.name || accId;

  // Bank-Auswahl: „Alle" + je verbundene Bank. Tippen ruft genau diese Bank ab
  // (bzw. alle). Nur sinnvoll ab 2 Banken; während des Ladens deaktiviert.
  const banks = state.banks || [];
  const loading = state.status === "loading";
  const BankChips = () => {
    if (banks.length < 2) return null;
    const chip = (label, aspsp, active) => (
      <button key={aspsp || "__all__"} disabled={loading}
        onClick={() => onRefetch?.(aspsp)}
        style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${active ? T.blue : T.bd}`,
          background: active ? T.blue + "22" : "transparent", color: active ? T.blue : T.txt2,
          fontSize: 12, fontWeight: 700, cursor: loading ? "default" : "pointer", whiteSpace: "nowrap",
          opacity: loading && !active ? 0.5 : 1, fontFamily: "inherit", flexShrink: 0 }}>
        {label}
      </button>
    );
    return (
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", overflowX: "auto",
        borderBottom: `1px solid ${T.bd}` }}>
        {chip("Alle", null, !state.aspsp)}
        {banks.map((b) => chip(b.aspsp, b.aspsp, state.aspsp === b.aspsp))}
      </div>
    );
  };

  // Kategorie/Löschen wirken auf die noch NICHT importierten (geparkten) Einträge.
  const setRowCat = (id, catId, subId) =>
    onUpdateStaged((list) => list.map((t) => t.id === id
      ? { ...t, splits: catId ? [{ id: uid(), catId, subId, amount: t.totalAmount }] : [] }
      : t));

  // Falsch abgerufenen Eintrag direkt entfernen — ohne ihn vorher kategorisieren
  // zu müssen. (Beim nächsten Abruf würde er ggf. wieder als neu erkannt.)
  const removeRow = (id) => onUpdateStaged((list) => list.filter((t) => t.id !== id));

  const wrap = (children) => (
    <div style={{ margin: "6px 4px 0", border: `1px solid ${T.blue}55`, borderRadius: 14,
      background: T.surf || "rgba(255,255,255,0.03)", overflow: "hidden" }}>
      {children}
    </div>
  );

  const Header = ({ title, right }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
      background: T.blue + "14", borderBottom: `1px solid ${T.bd}` }}>
      {Li("download-cloud", 18, T.blue)}
      <div style={{ flex: 1, color: T.txt, fontSize: 14, fontWeight: 800 }}>{title}</div>
      {right}
      <button onClick={onClose} title="Schließen"
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4,
          display: "inline-flex", alignItems: "center" }}>
        {Li("x", 18, T.txt2)}
      </button>
    </div>
  );

  if (state.status === "loading") {
    return wrap(
      <>
        <Header title={state.aspsp ? `${state.aspsp} abrufen…` : "Buchungen abrufen…"} />
        <BankChips />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", color: T.txt }}>
          {Li("loader", 18, T.blue)}
          <span style={{ fontSize: 14, fontWeight: 700 }}>Buchungen werden abgerufen…</span>
        </div>
      </>
    );
  }

  if (state.status === "error") {
    const hint = state.reason === "no-creds"
      ? "Noch kein Bank-Zugang eingerichtet. Unter Mehr → Daten → Bank-Konto verbinden anlegen."
      : state.reason === "no-session"
        ? "Keine aktive Bank-Verbindung. Unter Mehr → Daten → Bank-Konto verbinden einmalig freigeben."
        : state.reason === "rate-limit"
          ? "Tageslimit für automatische Bank-Abrufe erreicht — die Bank erlaubt nur eine begrenzte Zahl pro Tag. Die Freigabe ist weiterhin gültig; bitte später (i. d. R. morgen) erneut abrufen."
          : state.reason === "expired"
            ? "Die Bank-Freigabe ist abgelaufen. Unter Mehr → Daten → Bank-Konto verbinden neu freigeben."
            : (state.message || "Abruf fehlgeschlagen.");
    return wrap(
      <>
        <Header title="Buchungen abrufen" />
        <BankChips />
        <div style={{ padding: "12px", color: T.txt, fontSize: 13.5, lineHeight: 1.5 }}>
          {Li("alert-triangle", 15, T.gold)} {hint}
          {(state.reason === "error" || state.reason === "expired") && (
            <button onClick={() => onRefetch?.(state.aspsp)}
              style={{ display: "block", marginTop: 10, padding: "9px 12px", borderRadius: 10, border: "none",
                background: T.blue, color: T.on_accent, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              Erneut versuchen
            </button>
          )}
          {state.detail && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setShowDetail((v) => !v)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent",
                  border: "none", color: T.txt2, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                {Li(showDetail ? "chevron-down" : "chevron-right", 14, T.txt2)}
                Technische Details {showDetail ? "verbergen" : "anzeigen"}
              </button>
              {showDetail && (
                <pre style={{ marginTop: 6, maxHeight: 160, overflow: "auto", whiteSpace: "pre-wrap",
                  wordBreak: "break-word", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.bd}`,
                  borderRadius: 8, padding: "8px 10px", color: T.txt2, fontSize: 11, lineHeight: 1.45,
                  fontFamily: NUM_FONT }}>{state.detail}</pre>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // status === "done" — geparkte (noch nicht importierte) Einträge.
  // Alle abgerufenen Einträge werden gezeigt (Abruf ist kontoübergreifend) —
  // so geht beim Verwerfen/Übernehmen nichts versehentlich verloren.
  const newTxs = state.staged || [];
  const dupeItems = state.dupeItems || [];

  if (newTxs.length === 0 && dupeItems.length === 0) {
    return wrap(
      <>
        <Header title="Keine neuen Buchungen" />
        <BankChips />
        <div style={{ padding: "12px", color: T.txt2, fontSize: 13.5 }}>
          Für alle verbundenen Konten wurden keine neuen Umsätze gefunden.
        </div>
      </>
    );
  }

  const Row = ({ t }) => {
    const sp = (t.splits || [])[0];
    const categorized = !!sp?.catId;
    const isInc = t._csvType === "income";
    return (
      <div style={{ padding: "9px 12px", borderTop: `1px solid ${T.bd}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: T.txt2, fontSize: 12, flexShrink: 0 }}>{t.date.slice(8)}.{t.date.slice(5, 7)}.</span>
          {t.pending && (
            <span style={{ fontSize: 9, background: "rgba(245,166,35,0.18)", color: T.gold,
              borderRadius: 4, padding: "1px 5px", fontWeight: 800, border: `1px solid ${T.gold}55`,
              flexShrink: 0, letterSpacing: 0.3 }}>VORGEMERKT</span>
          )}
          <span style={{ fontSize: 9, background: "rgba(255,255,255,0.08)", color: T.txt2,
            borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0, letterSpacing: 0.2 }}>
            {accName(t.accountId)}
          </span>
          <span style={{ flex: 1, color: T.txt, fontSize: 13.5, fontWeight: 600, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc || "Buchung"}</span>
          <span style={{ color: t.pending ? T.gold : (isInc ? T.pos : T.neg), fontSize: 14, fontWeight: 800,
            fontVariantNumeric: "tabular-nums", fontFamily: NUM_FONT, flexShrink: 0 }}>
            {isInc ? "" : "−"}{fmt(Math.abs(t.totalAmount))} €
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CatPicker
              value={(sp?.catId || "") + "|" + (sp?.subId || "")}
              onChange={(catId, subId) => setRowCat(t.id, catId, subId)}
              filterType={isInc ? "income" : "expense"}
              accountId={t.accountId}
              placeholder={isInc ? "— Einnahmen-Kategorie —" : "— Ausgaben-Kategorie —"}
            />
          </div>
          {categorized && Li("check-circle", 18, T.pos)}
          <button onClick={() => removeRow(t.id)} title="Eintrag löschen"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4,
              display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
            {Li("trash-2", 16, T.neg)}
          </button>
        </div>
      </div>
    );
  };

  return wrap(
    <>
      <Header
        title={`${newTxs.length} neue Buchung${newTxs.length !== 1 ? "en" : ""}`}
        right={newTxs.length > 0 && (
          <span style={{ color: T.txt2, fontSize: 11 }}>
            {newTxs.filter((t) => (t.splits || [])[0]?.catId).length}/{newTxs.length} kat.
          </span>
        )}
      />
      <BankChips />
      {newTxs.length > 0 && (
        <div style={{ padding: "7px 12px", borderTop: `1px solid ${T.bd}`, color: T.txt2,
          fontSize: 11.5, lineHeight: 1.4, display: "flex", alignItems: "center", gap: 6 }}>
          {Li("info", 13, T.blue)}
          <span>Noch nicht importiert — prüfen, ggf. kategorisieren oder löschen, dann <b style={{ color: T.txt }}>Übernehmen</b>.</span>
        </div>
      )}
      {newTxs.map((t) => <Row key={t.id} t={t} />)}

      {dupeItems.length > 0 && (
        <>
          <button onClick={() => setShowExisting((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
              borderTop: `1px solid ${T.bd}`, background: "transparent", border: "none", cursor: "pointer",
              color: T.txt2, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>
            {Li(showExisting ? "chevron-up" : "chevron-down", 16, T.txt2)}
            {dupeItems.length} bereits vorhanden{dupeItems.length !== 1 ? "e" : ""} (eingeklappt)
          </button>
          {showExisting && dupeItems.map((it, i) => (
            <div key={(it.row._ebRef || it.row.fp) + "|" + i}
              style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 12px",
                borderTop: `1px solid ${T.bd}`, opacity: 0.65 }}>
              <span style={{ color: T.txt2, fontSize: 11.5, flexShrink: 0 }}>{it.row.isoDate.slice(5)}</span>
              <span style={{ fontSize: 9, background: "rgba(255,255,255,0.08)", color: T.txt2,
                borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0, letterSpacing: 0.2 }}>
                {accName(it.accId)}
              </span>
              <span style={{ flex: 1, color: T.txt2, fontSize: 12.5, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.row.desc}</span>
              <span style={{ color: T.txt2, fontSize: 11, flexShrink: 0 }}>
                {it.status === "exact" ? "vorhanden" : "evtl. Dublette"}
              </span>
              <span style={{ color: it.row.amount < 0 ? T.neg : T.pos, fontSize: 12.5, fontWeight: 700,
                fontVariantNumeric: "tabular-nums", fontFamily: NUM_FONT, flexShrink: 0 }}>
                {fmt(Math.abs(it.row.amount))} €
              </span>
            </div>
          ))}
        </>
      )}

      {newTxs.length > 0 ? (
        <div style={{ display: "flex", borderTop: `1px solid ${T.bd}` }}>
          <button onClick={onClose} title="Abgerufene Einträge verwerfen (nichts importieren)"
            style={{ flex: "0 0 38%", padding: "11px", border: "none", background: "transparent",
              color: T.txt2, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Verwerfen
          </button>
          <button onClick={() => onConfirm(newTxs)}
            style={{ flex: 1, padding: "11px", border: "none", borderLeft: `1px solid ${T.bd}`,
              background: T.pos, color: T.on_accent, fontSize: 14, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {Li("check", 16, T.on_accent)} {newTxs.length} übernehmen
          </button>
        </div>
      ) : (
        <button onClick={onClose}
          style={{ width: "100%", padding: "11px", border: "none", borderTop: `1px solid ${T.bd}`,
            background: T.pos, color: T.on_accent, fontSize: 14, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit" }}>
          Fertig
        </button>
      )}
    </>
  );
}

export { BankFetchPanel };
