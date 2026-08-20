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

// ── Vollflächige Signatur-Knöpfe ────────────────────────────────────────
// Ein Knopf, der ganz in einer Akzentfarbe steht und seine Beschriftung
// daraufschreibt. `schriftAuf` allein reicht hier nicht: es sucht die beste
// SCHRIFT für eine gegebene Fläche — bei einer mittelhellen Fläche trägt aber
// weder Schwarz noch Weiß (gemessen 4,36:1 und 4,48:1 auf dem Gold zweier
// Themes). Dann muss die FLÄCHE nachgeben.
//
// Rückgabe: `{ grund, schrift }`. `grund` ist die ursprüngliche Farbe, solange
// sie trägt — nur im Ausnahmefall minimal in Richtung Schwarz bzw. Weiß
// gerückt, in 5-%-Schritten und in der Richtung, die zuerst reicht. So bleibt
// die Farbe erkennbar und die Beschriftung trotzdem lesbar.
export function knopfPaar(flaeche, wunschSchrift, schwelle = 4.5) {
  const direkt = schriftAuf(flaeche, wunschSchrift, schwelle);
  if (kontrastWert(direkt, flaeche) >= schwelle) return { grund: flaeche, schrift: direkt };
  for (let anteil = 0.05; anteil <= 0.9; anteil += 0.05) {
    for (const [ziel, schrift] of [[DUNKEL, HELL], [HELL, DUNKEL]]) {
      const grund = mischen(ziel, anteil, flaeche);
      if (kontrastWert(schrift, grund) >= schwelle) return { grund, schrift };
    }
  }
  return { grund: flaeche, schrift: direkt };
}

// ── Ein Knopf braucht ZWEI Kontraste ────────────────────────────────────
// `knopfPaar` sorgt dafür, dass die BESCHRIFTUNG auf der Fläche trägt. Das
// genügt nicht: Man muss den Knopf auch als Knopf ERKENNEN, und dafür muss
// sich seine Fläche vom Untergrund abheben. Beides ist unabhängig — im Theme
// „Tastenhell" trägt die Ziffer auf dem Gold mit 14,8:1, das Gold selbst
// steht auf der cremefarbenen Platte aber bei 1,18:1. Genau so sah es aus:
// dunkle Ziffern, die frei zu schweben schienen, und eine Schaltfläche, die
// niemand als Schaltfläche erkannte (Nutzer-Bild).
//
// Die Fläche darf dafür NICHT verbogen werden — sie trägt die Akzentfarbe,
// und die ist gewollt. Stattdessen trägt eine KANTE die Abgrenzung. Dieselbe
// Lösung wie beim Gefahr-Knopf (GEFAHR_KANTE in activeTheme.js), wo Füllung
// und Beschriftung rechnerisch nicht beides gleichzeitig leisten können.
//
// Rückgabe: die Kantenfarbe — oder `null`, wenn die Fläche selbst schon
// genug Abstand zum Untergrund hat (der Normalfall in dunklen Themes).
export function knopfKante(flaeche, untergrund, schwelle = 3) {
  const grund = untergrund || T.bg;
  if (!_rgb(flaeche) || !_rgb(grund)) return null;
  if (kontrastWert(flaeche, grund) >= schwelle) return null;
  // In der Richtung rücken, die zuerst reicht — meist dieselbe wie die der
  // Beschriftung, dadurch wirkt der Knopf wie aus einem Guss.
  for (let anteil = 0.15; anteil <= 0.95; anteil += 0.05) {
    for (const ziel of [DUNKEL, HELL]) {
      const kante = mischen(ziel, anteil, flaeche);
      if (kontrastWert(kante, grund) >= schwelle) return kante;
    }
  }
  return kontrastWert(DUNKEL, grund) >= kontrastWert(HELL, grund) ? DUNKEL : HELL;
}

// Der ganze Knopf auf einmal: Fläche, Beschriftung, Kante.
// `{ grund, schrift, kante }` — `kante` ist `null`, wo keine nötig ist.
export function vollKnopf(flaeche, wunschSchrift, untergrund, schwelle = 4.5) {
  const paar = knopfPaar(flaeche, wunschSchrift, schwelle);
  return { ...paar, kante: knopfKante(paar.grund, untergrund) };
}

// ── Flächen, die sich mit ihrer EIGENEN Akzentfarbe tönen ───────────────
// Warnkasten, Hinweisbalken, Kategorie-Kopfzeile, „Editor öffnen": alle malen
// `${farbe}1f` und schreiben denselben Ton darauf. Gegen die Platte gerechnet
// sieht das sauber aus — gemalt ist der Untergrund aber genau in Richtung der
// Schrift verschoben, und der Kontrast schrumpft (gemessen 3,86:1 / 3,99:1).
//
// `klasse` (optional): Erklärt ein Theme diese Fläche per `flaechen_extra` zur
// Karte („Tastenhell"), gewinnt deren Farbe per `!important` gegen die Tönung
// — dann ist SIE der Untergrund, und der Akzent bleibt meist stehen.
// Alle Hex-Farben aus einem CSS-Hintergrundwert. Ein Verlauf bringt mehrere
// mit ("linear-gradient(135deg,#4E4E4E,#3A3A3A)") — und die Schrift muss auf
// JEDEM Ende tragen, nicht nur auf dem zufällig ersten.
function hexTeile(wert) {
  return String(wert || "").match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
}

// Die Fläche, die ein Theme für einen Bereich erklärt (`flaechen_extra`) —
// oder `undefined`. Kann ein Verlauf sein.
export function flaecheVon(klasse) {
  const v = klasse && T.flaechen_extra && T.flaechen_extra[klasse];
  return typeof v === "string" ? v : undefined;
}

// Die Untergründe, gegen die zu rechnen ist — eine Farbe, bei einem Verlauf
// mehrere. Zwei verschiedene Fälle, die man nicht verwechseln darf:
//
//   `klasse`  — DIESES Element IST die Karte. Das Theme malt seine Fläche per
//               `!important` über die eigene Tönung; die wird also gar nicht
//               sichtbar. Untergrund ist die Kartenfarbe, UNGETÖNT.
//   `flaeche` — Das Element LIEGT AUF dieser Fläche (z. B. der Sync-Hinweis
//               im Hero). Seine Tönung wird wirklich gemalt und muss
//               eingerechnet werden.
//
// Ohne beides gilt der Seitenhintergrund.
//
// Ein Verlauf wurde vorher STILL verworfen (die Prüfung verlangte
// `karte[0] === "#"`) und fiel auf `T.bg` zurück — der Aufrufer bekam nie zu
// sehen, dass seine Angabe ignoriert wurde.
export function toenungsGruende(farbe, anteil, klasse, flaeche) {
  const karte = hexTeile(flaecheVon(klasse));
  if (karte.length) return karte;
  const teile = hexTeile(flaeche);
  const gruende = teile.length ? teile : [T.bg];
  return gruende.map((g) => mischen(farbe, anteil, g));
}

// Rückwärtskompatibel: EIN Grund. Bei einem Verlauf der dunkelste/hellste ist
// nicht eindeutig — deshalb der erste. Wer es genau braucht, nimmt
// `toenungsGruende`.
export function toenungsGrund(farbe, anteil, klasse, flaeche) {
  return toenungsGruende(farbe, anteil, klasse, flaeche)[0];
}

// Schriftfarbe auf einer selbstgetönten Fläche. Der Wunschton wird nur
// genommen, wenn er auf ALLEN Gründen trägt (bei einem Verlauf also an beiden
// Enden); sonst Weiß bzw. Fast-Schwarz — und wenn auch davon keines überall
// reicht, das mit dem besseren schlechtesten Fall.
export const aufToenung = (farbe, anteil, klasse, schwelle = 4.5, flaeche) => {
  const gruende = toenungsGruende(farbe, anteil, klasse, flaeche);
  const traegtUeberall = (c) => gruende.every((g) => kontrastWert(c, g) >= schwelle);
  if (farbe && traegtUeberall(farbe)) return farbe;
  if (traegtUeberall(HELL)) return HELL;
  if (traegtUeberall(DUNKEL)) return DUNKEL;
  const schlechtester = (c) => Math.min(...gruende.map((g) => kontrastWert(c, g)));
  return schlechtester(HELL) >= schlechtester(DUNKEL) ? HELL : DUNKEL;
};

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
