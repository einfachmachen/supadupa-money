// Lizenz-Token: ablegen, lesen, auf Ablauf prüfen.
//
// Das Token stellt der Lizenz-Worker aus (worker/license-worker.js):
//   payload   = Base64(JSON.stringify({ email, tier, products, iat, exp }))
//   signature = Base64(HMAC-SHA256(payload, LICENSE_SECRET))
//   token     = payload + "." + signature
//
// Was der Client hier prüft: NUR das Ablaufdatum. Die Signatur kann er nicht
// nachrechnen — dafür bräuchte er `LICENSE_SECRET`, und das liegt allein im
// Worker. Das ist kein Mangel, sondern die Aufgabenteilung:
//
//   • Der Client entscheidet nichts Schützenswertes. Wer die Sperre umgehen
//     will, ändert den Code im Browser — eine Signaturprüfung an dieser
//     Stelle würde er im selben Atemzug mit entfernen. Die weichen Gates
//     sagen ehrlichen Nutzern, was sie haben; mehr sollen sie nicht leisten.
//   • Die Signatur trägt für den SERVER. Der Bank-Proxy (Phase 3) prüft sie
//     mit dem Secret in der Hand — dort kann sie niemand umgehen.
//
// Gespeichert wird über kvStore (IndexedDB), wie alle Einstellungen dieser
// App. Der Schlüssel trägt das `mbt_`-Präfix, damit ihn die
// localStorage-Migration in kvStore.js als App-Schlüssel erkennt.

import { kvStore } from "./kvStore.js";

const TOKEN_KEY = "mbt_license_token";
// Der Lizenzcode selbst. Ohne ihn koennte die App das Token nach 30 Tagen
// nicht erneuern — der zahlende Nutzer fiele stillschweigend auf „frei"
// zurueck und muesste den Code erneut eintippen. Er ist kein Geheimnis im
// Sinne eines Schluessels: wer an das Geraet kommt, kommt ohnehin an alles.
const CODE_KEY = "mbt_license_code";

// Token zerlegen und die Nutzlast dekodieren. `null`, wenn es kein Token im
// erwarteten Format ist.
function decodeToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const payload = JSON.parse(atob(parts[0]));
    if (!payload || typeof payload !== "object") return null;
    return { payload, encodedPayload: parts[0], signature: parts[1] };
  } catch (e) {
    return null;
  }
}

// `exp` ist eine Unix-Zeit in SEKUNDEN (so schreibt es der Worker), nicht in
// Millisekunden — der Vergleich muss auf derselben Einheit laufen.
function isTokenValid(payload) {
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp > Math.floor(Date.now() / 1000);
}

// Abgelaufene Token werden beim Lesen gleich entsorgt, damit nicht bei jedem
// Start erneut ein toter Wert durch die Prüfung läuft.
function loadLocalToken() {
  try {
    const stored = kvStore.getItem(TOKEN_KEY);
    if (!stored) return null;
    const decoded = decodeToken(stored);
    if (!decoded || !isTokenValid(decoded.payload)) {
      kvStore.removeItem(TOKEN_KEY);
      return null;
    }
    return { token: stored, data: decoded.payload };
  } catch (e) {
    return null;
  }
}

// Nur ablegen, was auch lesbar und noch gültig ist — sonst hätten wir einen
// Wert im Speicher, den jeder Lesevorgang sofort wieder wegwirft.
function saveLocalToken(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !isTokenValid(decoded.payload)) return false;
    kvStore.setItem(TOKEN_KEY, token);
    return true;
  } catch (e) {
    return false;
  }
}

function clearLocalToken() {
  try { kvStore.removeItem(TOKEN_KEY); } catch (e) {}
}

// Code merken/lesen/vergessen — Grundlage der stillen Erneuerung.
function saveLocalCode(code) {
  try { kvStore.setItem(CODE_KEY, String(code || "").trim()); } catch (e) {}
}
function loadLocalCode() {
  try { return kvStore.getItem(CODE_KEY) || ""; } catch (e) { return ""; }
}
function clearLocalCode() {
  try { kvStore.removeItem(CODE_KEY); } catch (e) {}
}

// Wie lange vor Ablauf im Voraus erneuert wird. Grosszuegig gewaehlt: die
// Erneuerung braucht Internet, und wer die App zwei Wochen lang nur offline
// oeffnet, soll trotzdem nicht herausfallen.
const ERNEUERN_AB_SEKUNDEN = 7 * 24 * 60 * 60;

function brauchtErneuerung(payload) {
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp - Math.floor(Date.now() / 1000) < ERNEUERN_AB_SEKUNDEN;
}

export {
  TOKEN_KEY, CODE_KEY, ERNEUERN_AB_SEKUNDEN,
  decodeToken, isTokenValid, brauchtErneuerung,
  loadLocalToken, saveLocalToken, clearLocalToken,
  loadLocalCode, saveLocalCode, clearLocalCode,
};
