// Betrag-Pillen: In dunklen Themes (amt_pill:true) liegen Beträge auf einer
// hellen Pille, damit kräftiges Rot/Limegreen auf dunklem Grau lesbar wird.
// Die Schriftfarbe wird IMMER gegen die Helligkeit des Untergrunds geprüft —
// nie weiße Schrift auf heller Fläche (und umgekehrt).
import { theme as T } from "./activeTheme.js";

// Wahrgenommene Helligkeit 0–255 (YIQ); versteht #rgb, #rrggbb[aa], rgb()/rgba()
export function colorBrightness(c) {
  if (!c || typeof c !== "string") return 0;
  let r, g, b;
  if (c[0] === "#") {
    const h = c.slice(1);
    const f = h.length < 6 ? h.split("").map(x => x + x).join("") : h;
    r = parseInt(f.slice(0, 2), 16); g = parseInt(f.slice(2, 4), 16); b = parseInt(f.slice(4, 6), 16);
    if (Number.isNaN(r + g + b)) return 0;
  } else {
    const m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!m) return 0;
    r = +m[1]; g = +m[2]; b = +m[3];
  }
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export const isLightColor = c => colorBrightness(c) >= 150;

// Liefert eine auf `bg` garantiert lesbare Schriftfarbe: `wanted`, solange es
// sich in der Helligkeitsklasse vom Untergrund unterscheidet — sonst der
// dunkle bzw. helle Fallback.
export function readableOn(bg, wanted) {
  if (isLightColor(bg) !== isLightColor(wanted)) return wanted;
  return isLightColor(bg) ? "#22261C" : "#F2F4EF";
}

// ── Schriftfarbe nach WCAG statt nach Helligkeitsklasse ─────────────────
// `readableOn` entscheidet über die YIQ-Helligkeit (Schwelle 150). Das
// genügt für Pillen, ist für TEXT aber zu großzügig: die Tortenbeschriftung
// auf einem mittleren Rot (#E06D6C) galt damit als "dunkler Grund" und blieb
// weiß — gemessen 3,17:1 statt der nötigen 4,5:1 (Kontrast-Lauf). Deshalb
// hier die echte Rechnung: es gewinnt der Ton, der auf diesem Grund den
// höheren Kontrast erreicht.
const _lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
function _rgb(c) {
  if (!c || typeof c !== "string") return null;
  let r, g, b;
  if (c[0] === "#") {
    const h = c.slice(1);
    const f = h.length < 6 ? h.split("").map(x => x + x).join("") : h;
    r = parseInt(f.slice(0, 2), 16); g = parseInt(f.slice(2, 4), 16); b = parseInt(f.slice(4, 6), 16);
  } else {
    const m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!m) return null;
    r = +m[1]; g = +m[2]; b = +m[3];
  }
  return Number.isNaN(r + g + b) ? null : [r, g, b];
}
function _luminanz(c) {
  const p = _rgb(c);
  if (!p) return 0;
  return 0.2126 * _lin(p[0]) + 0.7152 * _lin(p[1]) + 0.0722 * _lin(p[2]);
}

// `farbe` mit dem Anteil `anteil` (0–1) über `grund` gelegt — das JS-Gegenstück
// zu einer Fläche mit Hex-Alpha (`${T.neg}1f`). Gebraucht überall dort, wo eine
// so getönte Fläche selbst wieder Untergrund für schriftAuf() ist: sonst prüft
// man gegen den Ton VOR der Tönung und misst 4,5:1, wo auf dem Bildschirm 3,9:1
// stehen.
export function mischen(farbe, anteil, grund) {
  const a = _rgb(farbe), b = _rgb(grund);
  if (!a || !b) return grund;
  const t = Math.min(1, Math.max(0, anteil));
  const v = [0, 1, 2].map(i => Math.round(a[i] * t + b[i] * (1 - t)));
  return `#${v.map(x => x.toString(16).padStart(2, "0")).join("")}`;
}
export function kontrastWert(a, b) {
  const l1 = _luminanz(a), l2 = _luminanz(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export const HELL = "#FFFFFF";
export const DUNKEL = "#161614";
// Beste Schriftfarbe auf `grund`. `wunsch` (z.B. eine Kategoriefarbe) wird
// genommen, sobald er die Schwelle selbst erreicht — sonst Weiß bzw. Fast-
// Schwarz, je nachdem was besser trägt.
export function schriftAuf(grund, wunsch, schwelle = 4.5) {
  if (wunsch && kontrastWert(wunsch, grund) >= schwelle) return wunsch;
  return kontrastWert(HELL, grund) >= kontrastWert(DUNKEL, grund) ? HELL : DUNKEL;
}

// Kurzform für den häufigsten Fall: Text oder Symbol liegt direkt auf dem
// SEITENHINTERGRUND. In den meisten Themes trägt die Akzentfarbe dort; in
// "Tastenhell" (helle Platte) fallen Gelbgrün und Gold durch — dann liefert
// die Funktion den lesbaren Ersatz. Für Symbole reicht 3:1 (WCAG 1.4.11).
export const aufGrund = (farbe, schwelle = 4.5) => schriftAuf(T.bg, farbe, schwelle);

// Stil für einen Betrag. kind: "pos" | "neg" | "gold" | "txt" | "txt2" oder
// eine konkrete Farbe. `plain` überschreibt optional die Farbe im Nicht-Pill-
// Modus (für Stellen, die bisher eine Palette-Farbe statt T[kind] nutzten).
export function amtStyle(kind, plain) {
  const col = T[kind] || kind;
  if (!T.amt_pill) return { color: plain !== undefined ? plain : col };
  const bg   = T.pill_bg || "#ECEFE3";
  const tone = T["pill_" + kind] || col;
  return {
    background: bg,
    color: readableOn(bg, tone),
    padding: "0px 7px",
    borderRadius: 999,
    display: "inline-block",
  };
}
