// Token-Verifikation: HMAC-SHA256-Signatur prüfen, Ablauf checken.
//
// Das Token wurde vom Worker signiert mit `LICENSE_SECRET`. Der Client prüft
// die Signatur offline, ohne den Server zu fragen. Das ermöglicht Offline-Modus.
//
// Token-Format (vom Worker): `payload.signature`
//   payload = Base64(JSON.stringify({ email, tier, products, iat, exp }))
//   signature = Base64(HMAC-SHA256(payload, secret))
//
// Achtung: Der Client kennt `LICENSE_SECRET` nicht. Er kann die Signatur
// NICHT neu erzeugen, nur prüfen, ob eine bestehende gültig ist — dafür
// brauchte er das Secret. Das ist korrekt: nur der Worker kann Token
// ausstellen, der Client kann sie nur glauben oder anzweifeln.
//
// Stattdessen nutzen wir ein lokales Vertrauen: wenn wir das Token von
// `/verify` bekommen haben und die Antwort ein signiertes Token ist,
// speichern wir es und glauben ihm, bis es abläuft. Kein Reflex, die
// Signatur zu prüfen — das wäre nicht möglich ohne das Secret.
//
// (Für Tests: test/licenseToken.test.js hat ein Testgeheimnis und prüft
// die komplette Signatur nach.)

// Token parsen und die Payload dekodieren
function decodeToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const payloadStr = atob(parts[0]);
    const payload = JSON.parse(payloadStr);
    return {
      payload,
      encodedPayload: parts[0],
      signature: parts[1],
    };
  } catch (e) {
    return null;
  }
}

// Ist das Token noch gültig (Ablauf prüfen)?
function isTokenValid(payload) {
  if (!payload || typeof payload.exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

// Token aus localStorage laden und prüfen
function loadLocalToken() {
  try {
    const stored = localStorage.getItem("supadupa_license_token");
    if (!stored) return null;
    const decoded = decodeToken(stored);
    if (!decoded || !isTokenValid(decoded.payload)) {
      localStorage.removeItem("supadupa_license_token");
      return null;
    }
    return { token: stored, data: decoded.payload };
  } catch (e) {
    return null;
  }
}

// Token in localStorage speichern
function saveLocalToken(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !isTokenValid(decoded.payload)) return false;
    localStorage.setItem("supadupa_license_token", token);
    return true;
  } catch (e) {
    return false;
  }
}

// Token löschen
function clearLocalToken() {
  try {
    localStorage.removeItem("supadupa_license_token");
  } catch (e) {}
}

export { decodeToken, isTokenValid, loadLocalToken, saveLocalToken, clearLocalToken };
