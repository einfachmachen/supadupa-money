// Enable-Banking-Anbindung — Kern-Logik (ohne UI).
//
// Enthält:
//   • JWT-Signierung (RS256) per Web Crypto aus dem privaten .pem-Schlüssel
//     der Enable-Banking-Application. Der Schlüssel verlässt den Browser nie.
//   • Mapping einer Enable-Banking-Transaktion auf die bestehende
//     SupaDupa-Money-Zeilenform { isoDate, amount, desc, fp } — damit die
//     vorhandene Dedup-/Kategorisierungs-Pipeline unverändert weiterläuft.
//   • Einen dünnen Client, der alle Aufrufe über einen konfigurierbaren Relay
//     (Cloudflare Worker, siehe worker/enable-banking-proxy.js) an
//     api.enablebanking.com weiterreicht (löst CORS, speichert nichts).
//
// Reine Logik, in tests/enableBanking.test.js getestet. Live-Aufrufe brauchen
// gültige Zugangsdaten + einen erreichbaren Relay.

import { txFingerprint } from "./tx.js";

// ── Base64URL-Helfer ────────────────────────────────────────────────────────
function base64urlFromBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlFromString(str) {
  return base64urlFromBytes(new TextEncoder().encode(str));
}

// PEM (PKCS#8) → ArrayBuffer mit dem reinen DER-Inhalt
function pemToPkcs8ArrayBuffer(pem) {
  const body = String(pem || "")
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(privateKeyPem) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8ArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// Baut ein signiertes JWT, wie es die Enable-Banking-API als Bearer-Token erwartet.
async function buildJwt({ appId, privateKeyPem, validitySec = 3600, now = Date.now() }) {
  if (!appId) throw new Error("Enable Banking: Application-ID fehlt");
  if (!privateKeyPem) throw new Error("Enable Banking: privater Schlüssel fehlt");
  const header = { typ: "JWT", alg: "RS256", kid: appId };
  const iat = Math.floor(now / 1000);
  const payload = {
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat,
    exp: iat + validitySec,
  };
  const signingInput =
    base64urlFromString(JSON.stringify(header)) + "." + base64urlFromString(JSON.stringify(payload));
  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput)
  );
  return signingInput + "." + base64urlFromBytes(new Uint8Array(sig));
}

// ── Transaktions-Mapping ────────────────────────────────────────────────────
// Vorzeichen: credit_debit_indicator ("CRDT" = Eingang, "DBIT" = Ausgang)
// bestimmt das Vorzeichen, analog zur Vorzeichen-Konvention im CSV-Import.
function ebSignedAmount(tx) {
  const rawStr = tx?.transaction_amount?.amount ?? tx?.amount ?? 0;
  const abs = Math.abs(parseFloat(rawStr)) || 0;
  const ind = String(tx?.credit_debit_indicator || "").toUpperCase();
  if (ind === "DBIT") return -abs;
  if (ind === "CRDT") return abs;
  // Fallback: Vorzeichen so übernehmen, wie es im Betrag steht
  return parseFloat(rawStr) || 0;
}

// Name der Gegenpartei je nach Richtung: bei Ausgang (DBIT) der Empfänger
// (creditor), bei Eingang (CRDT) der Zahler (debtor). Platzhalter wie
// "NOT PROVIDED" werden als leer behandelt und auf die andere Partei
// zurückgefallen — sonst stünde bei Gutschriften oft "NOT PROVIDED".
function ebIsJunkName(s) {
  return !s || /^(not\s*provided|n\/?a|unknown|unbekannt)$/i.test(String(s).trim());
}
function ebCounterpartyName(tx) {
  const creditor = tx?.creditor?.name || tx?.creditor_account?.name || "";
  const debtor = tx?.debtor?.name || tx?.debtor_account?.name || "";
  const ind = String(tx?.credit_debit_indicator || "").toUpperCase();
  let primary = ind === "CRDT" ? debtor : creditor;
  let secondary = ind === "CRDT" ? creditor : debtor;
  if (ebIsJunkName(primary)) primary = ebIsJunkName(secondary) ? "" : secondary;
  return ebIsJunkName(primary) ? "" : String(primary).trim();
}

// Beschreibung im bestehenden " · "-Schema (Gegenpartei + Verwendungszweck),
// mit Duplikat-Entfernung wie im CSV-Parser.
function ebDescription(tx) {
  const name = ebCounterpartyName(tx);
  let rem = tx?.remittance_information;
  if (Array.isArray(rem)) rem = rem.join(" ");
  rem = String(rem || "").trim();
  const parts = [name, rem].map((s) => String(s || "").trim()).filter(Boolean);
  const uniq = parts.filter(
    (p, i) =>
      !parts
        .slice(0, i)
        .some(
          (prev) =>
            prev.toLowerCase().includes(p.toLowerCase()) ||
            p.toLowerCase().includes(prev.toLowerCase())
        )
  );
  return uniq.join(" · ").trim() || "Unbekannt";
}

// Eine Enable-Banking-Transaktion → SupaDupa-Money-Zeilenform.
function mapEnableBankingTx(tx, accountId) {
  // Vorgemerkt erkennen — robust über mögliche Statusfelder/-werte der ASPSPs
  // (Enable Banking Standard: status "PDNG"; manche Banken liefern es abweichend).
  const pending = /pdng|pend|hold|reserv|vorgemerkt/i.test(
    String(tx?.status ?? tx?.booking_status ?? tx?.transaction_status ?? tx?.credit_debit_status ?? ""));
  // Datum: maßgeblich ist, WANN der Umsatz das Konto belastet — das bestimmt
  // Tagessaldo und Budget. Bei VORGEMERKTEN Buchungen daher die voraussichtliche
  // Wertstellung (value_date) bevorzugen, erst als Fallback den Banktag
  // (booking_date). Das Verursachungsdatum (transaction_date, z. B. Zeitpunkt an
  // der Kasse) dient NUR der Nachvollziehbarkeit und wird hier bewusst NICHT zur
  // Einordnung genutzt: Eine heute verursachte, aber erst im Folgemonat belastete
  // Zahlung gehört saldo-/budgetseitig in den Folgemonat.
  // Bei echten (gebuchten) Buchungen bleibt booking_date führend, damit die
  // Dubletten-Erkennung bereits importierter Umsätze stabil bleibt.
  const isoDate = (pending
    ? String(tx?.value_date || tx?.booking_date || "")
    : String(tx?.booking_date || tx?.value_date || "")).slice(0, 10);
  const amount = ebSignedAmount(tx);
  const desc = ebDescription(tx);
  return {
    isoDate,
    amount,
    desc,
    fp: txFingerprint(isoDate, amount, desc, accountId),
    pending,
    _ebRef: tx?.entry_reference || tx?.transaction_id || null,
    _resolvedAccId: accountId,
  };
}

function mapEnableBankingTransactions(list, accountId) {
  return (Array.isArray(list) ? list : [])
    .map((tx) => mapEnableBankingTx(tx, accountId))
    .filter((r) => r.isoDate && r.amount !== 0);
}

// ── Relay-Client ────────────────────────────────────────────────────────────
// Alle Aufrufe gehen an den Relay (base), der sie an api.enablebanking.com
// weiterleitet. Der private Schlüssel wird NUR lokal zum JWT-Signieren genutzt.
function createEnableBankingClient({ relayUrl, appId, privateKeyPem }) {
  const base = String(relayUrl || "").replace(/\/+$/, "");

  async function req(path, { method = "GET", body } = {}) {
    if (!base) throw new Error("Enable Banking: Relay-URL fehlt");
    const jwt = await buildJwt({ appId, privateKeyPem });
    const headers = { Authorization: `Bearer ${jwt}` };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      // Den Endpunkt mit in den Fehler schreiben — so ist sofort erkennbar, an
      // welchem Schritt es scheitert: /auth (Anmeldung starten), /sessions
      // (Session erstellen) oder /accounts/…/transactions (Umsätze abrufen).
      const step = path.startsWith("/auth") ? "Anmeldung starten"
        : path.startsWith("/sessions") ? "Session erstellen"
        : /\/transactions/.test(path) ? "Umsätze abrufen"
        : path.startsWith("/aspsps") ? "Banken laden"
        : path;
      throw new Error(`Enable Banking ${res.status} [${step}: ${method} ${path.split("?")[0]}]: ${text.slice(0, 300)}`);
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  return {
    // Liste der verfügbaren Banken (ASPSPs) für ein Land
    listAspsps: (country = "DE") =>
      req(`/aspsps?country=${encodeURIComponent(country)}`),

    // Autorisierung starten → liefert { url } zur Weiterleitung an die Bank.
    // valid_until: max. 90 Tage (PSD2). Bewusst 89 statt 90 — ein Tag Puffer,
    // damit eine voreilende Gerätezeit das Maximum nicht überschreitet (manche
    // Banken quittieren das mit ASPSP_ERROR / „Internal server error").
    startAuth: ({ aspspName, country = "DE", redirectUrl, state, validUntilDays = 89, psuType = "personal" }) =>
      req(`/auth`, {
        method: "POST",
        body: {
          access: { valid_until: new Date(Date.now() + validUntilDays * 86400000).toISOString() },
          aspsp: { name: aspspName, country },
          state,
          redirect_url: redirectUrl,
          psu_type: psuType,
        },
      }),

    // Nach dem Bank-Redirect: Session aus dem code erzeugen → { session_id, accounts }
    createSession: (code) => req(`/sessions`, { method: "POST", body: { code } }),

    getSession: (sessionId) => req(`/sessions/${encodeURIComponent(sessionId)}`),

    // Umsätze eines Kontos (date_from im Format YYYY-MM-DD)
    getTransactions: (accountUid, { dateFrom, dateTo, continuationKey } = {}) => {
      const q = new URLSearchParams();
      if (dateFrom) q.set("date_from", dateFrom);
      if (dateTo) q.set("date_to", dateTo);
      if (continuationKey) q.set("continuation_key", continuationKey);
      const qs = q.toString();
      return req(`/accounts/${encodeURIComponent(accountUid)}/transactions${qs ? `?${qs}` : ""}`);
    },
  };
}

export {
  base64urlFromBytes,
  base64urlFromString,
  pemToPkcs8ArrayBuffer,
  buildJwt,
  ebSignedAmount,
  ebDescription,
  mapEnableBankingTx,
  mapEnableBankingTransactions,
  createEnableBankingClient,
};
