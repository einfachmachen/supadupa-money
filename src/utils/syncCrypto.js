// Client-seitige Verschlüsselung der Cloud-Sync-Nutzlast (Zero-Knowledge).
//
// Ziel: Was in die persönliche „Cloud-DB" (Cloudflare-Worker, Gist, …) geht,
// liegt dort nur als Chiffrat. Ver-/Entschlüsselt wird ausschließlich auf dem
// Gerät mit einer Passphrase, die den Server nie erreicht. Selbst bei einem
// vollständigen Einbruch in den Store bekommt niemand Klartext — die Sicherheit
// hängt allein an der Stärke der Passphrase.
//
// Verfahren: Passphrase → AES-256-Schlüssel via PBKDF2-SHA256 (mit Salt),
// Inhalt verschlüsselt mit AES-GCM (random IV, integritätsgesichert).
//
// Umschlag-Format (selbstbeschreibend, damit Entschlüsseln nur Passphrase +
// Umschlag braucht):
//   { __enc:1, v:1, alg:"AES-GCM", kdf:"PBKDF2-SHA256",
//     iter:<n>, salt:<b64>, iv:<b64>, ct:<b64> }
//
// Rückwärtskompatibel: Wer keine Passphrase setzt, speichert wie bisher
// Klartext. Beim Laden erkennt isEncrypted() den Umschlag und entschlüsselt
// nur dann — bestehende, unverschlüsselte Stores bleiben lesbar.

const SUBTLE = () => {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error("Web Crypto (crypto.subtle) nicht verfügbar");
  return c.subtle;
};

const PBKDF2_ITER = 150000;
const ENC_VERSION = 1;

// ── Base64 ⇄ Bytes (binär-sicher, funktioniert in Browser & Node) ──
function bytesToB64(bytes) {
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// Abgeleitete Schlüssel cachen (PBKDF2 ist absichtlich teuer): Schlüssel pro
// (Passphrase, Salt, Iterationen) nur einmal ableiten.
const _keyCache = new Map();
const _cacheKey = (pass, saltB64, iter) => `${iter}|${saltB64}|${pass}`;

async function deriveKey(passphrase, saltBytes, iter = PBKDF2_ITER) {
  const saltB64 = bytesToB64(saltBytes);
  const ck = _cacheKey(passphrase, saltB64, iter);
  if (_keyCache.has(ck)) return _keyCache.get(ck);
  const subtle = SUBTLE();
  const baseKey = await subtle.importKey(
    "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: iter, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  _keyCache.set(ck, key);
  return key;
}

// Erkennt einen Verschlüsselungs-Umschlag.
export function isEncrypted(x) {
  return !!x && typeof x === "object" && x.__enc === 1 && typeof x.ct === "string";
}

// Beliebiges JSON-serialisierbares Objekt → Umschlag.
// opts.salt: optional gemeinsamer Salt (z. B. einmal pro Sync-Lauf), damit der
// PBKDF2-Schlüssel nur einmal abgeleitet werden muss.
export async function encryptJSON(obj, passphrase, opts = {}) {
  if (!passphrase) throw new Error("Passphrase fehlt");
  const subtle = SUBTLE();
  const salt = opts.salt
    ? (typeof opts.salt === "string" ? b64ToBytes(opts.salt) : opts.salt)
    : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iter = opts.iter || PBKDF2_ITER;
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iter);
  const plain = enc.encode(JSON.stringify(obj));
  const ctBuf = await subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    __enc: 1,
    v: ENC_VERSION,
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iter,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ctBuf)),
  };
}

// Umschlag → ursprüngliches Objekt. Wirft bei falscher Passphrase / Manipulation.
export async function decryptJSON(envelope, passphrase) {
  if (!isEncrypted(envelope)) throw new Error("Kein gültiger Verschlüsselungs-Umschlag");
  if (!passphrase) throw new Error("Passphrase fehlt");
  const subtle = SUBTLE();
  const salt = b64ToBytes(envelope.salt);
  const iv = b64ToBytes(envelope.iv);
  const ct = b64ToBytes(envelope.ct);
  const key = await deriveKey(passphrase, salt, envelope.iter || PBKDF2_ITER);
  let plainBuf;
  try {
    plainBuf = await subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  } catch {
    throw new Error("Falsche Passphrase oder beschädigte Daten");
  }
  return JSON.parse(dec.decode(plainBuf));
}

// Frischen Zufalls-Salt (für einen Sync-Lauf) als Base64.
export function freshSaltB64() {
  return bytesToB64(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}

// Schlüssel-Cache leeren (z. B. bei Passphrase-Wechsel / Logout).
export function clearKeyCache() {
  _keyCache.clear();
}
