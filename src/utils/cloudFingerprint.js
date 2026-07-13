// Kurzer, gut vergleichbarer Fingerabdruck aus Worker-URL + Secret.
// Zweck: auf einen Blick zwischen Geräten prüfen können, ob sie wirklich auf
// denselben Cloudflare-Sync-Store zeigen — eine falsche/veraltete URL auf nur
// einem Gerät fällt sonst nicht auf (die App selbst kann das nicht erkennen,
// da jedes Gerät nur seine eigenen Zugangsdaten kennt). Der Secret-Klartext
// fließt nur in den Hash ein, wird nie angezeigt.
async function cloudFingerprint(url, secret) {
  const normUrl = (url || "").trim().replace(/\/+$/, "");
  if (!normUrl || !secret) return "";
  const enc = new TextEncoder().encode(normUrl + "|" + secret);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 6).toUpperCase();
}

export { cloudFingerprint };
