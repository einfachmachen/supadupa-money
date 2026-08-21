#!/usr/bin/env node
// Welche Themes aehneln sich? — Entscheidungshilfe zum Ausduennen.
//
// Nutzer: „Lieber 7 richtig gut, als 32 teilweise fast nicht unterscheidbare."
//
// Gemessen wird das, was man beim Umschalten ZUERST sieht:
//   * die PLATTE (bg) — die groesste Flaeche im Bild,
//   * die KARTE (surf) — die zweitgroesste,
//   * die AKZENTFARBE (blue) — was farbig heraussticht.
//
// Abstand in CIE-L*a*b* (deltaE 76), nicht in RGB: RGB-Abstaende sagen wenig
// darueber, wie verschieden zwei Farben AUSSEHEN. Faustwerte fuer deltaE:
// unter 2 fuer das Auge praktisch gleich, unter 5 sehr aehnlich, ab etwa 10
// klar unterscheidbar.
//
//   npm run themes:aehnlich            — Paare, sortiert nach Aehnlichkeit
//   npm run themes:aehnlich -- 12      — mit eigener Schwelle

const path = require("path");
const { execFileSync } = require("child_process");

const SCHWELLE = Number(process.argv[2]) || 10;

// Die Theme-Datei ist ESM — ueber vite-node einlesen und als JSON ausgeben.
const fs = require("fs");
const os = require("os");
const wurzel = path.resolve(__dirname, "..");
const hilfsdatei = path.join(os.tmpdir(), `themes-lesen-${process.pid}.mjs`);
fs.writeFileSync(hilfsdatei, `
import { THEMES } from ${JSON.stringify(path.join(wurzel, "src/theme/themes.js"))};
const raus = {};
Object.entries(THEMES).forEach(([k, t]) => {
  if (k === "custom_preview") return;
  raus[k] = { name: t.name || k, bg: t.bg, surf: t.surf, blue: t.blue };
});
console.log("<<JSON>>" + JSON.stringify(raus));
`);
let roh;
try {
  roh = execFileSync("npx", ["vite-node", hilfsdatei],
    { cwd: wurzel, encoding: "utf8", maxBuffer: 1 << 24 });
} finally { try { fs.unlinkSync(hilfsdatei); } catch (_) {} }
const themes = JSON.parse(roh.slice(roh.indexOf("<<JSON>>") + 8).split("\n")[0]);

// ── Farbabstand ───────────────────────────────────────────────────────────
const hex = (c) => {
  const m = String(c || "").match(/^#([0-9a-fA-F]{6})/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const g = String(c || "").match(/(\d+),\s*(\d+),\s*(\d+)/);
  return g ? [1, 2, 3].map((i) => Number(g[i])) : null;
};
function lab(c) {
  const rgb = hex(c);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  let X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let Y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
  let Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [X, Y, Z] = [f(X), f(Y), f(Z)];
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
function dE(a, b) {
  const la = lab(a), lb = lab(b);
  if (!la || !lb) return 99;
  return Math.sqrt(la.reduce((s, v, i) => s + (v - lb[i]) ** 2, 0));
}

// Gesamtabstand: die Platte zaehlt am staerksten (sie fuellt den Bildschirm),
// dann der Akzent, dann die Karte.
const abstand = (a, b) =>
  0.5 * dE(a.bg, b.bg) + 0.3 * dE(a.blue, b.blue) + 0.2 * dE(a.surf, b.surf);

const keys = Object.keys(themes);
const paare = [];
for (let i = 0; i < keys.length; i++)
  for (let j = i + 1; j < keys.length; j++)
    paare.push({ a: keys[i], b: keys[j], d: abstand(themes[keys[i]], themes[keys[j]]) });
paare.sort((x, y) => x.d - y.d);

const nah = paare.filter((p) => p.d < SCHWELLE);
console.log(`\n${keys.length} Themes · ${nah.length} Paare unter ${SCHWELLE}\n`);
console.log("Abst.  Theme A                     Theme B                     bg / Akzent");
console.log("─".repeat(92));
nah.forEach((p) => {
  const A = themes[p.a], B = themes[p.b];
  console.log(
    `${p.d.toFixed(1).padStart(5)}  ${A.name.padEnd(26).slice(0, 26)}  ${B.name.padEnd(26).slice(0, 26)}` +
    `  ${A.bg}/${A.blue}  ${B.bg}/${B.blue}`
  );
});

// ── Gruppen: alles, was ueber die Schwelle zusammenhaengt ────────────────
const eltern = {}; keys.forEach((k) => (eltern[k] = k));
const finde = (x) => (eltern[x] === x ? x : (eltern[x] = finde(eltern[x])));
nah.forEach((p) => { eltern[finde(p.a)] = finde(p.b); });
const gruppen = {};
keys.forEach((k) => { (gruppen[finde(k)] ||= []).push(k); });
const mehr = Object.values(gruppen).filter((g) => g.length > 1);
console.log(`\n${mehr.length} Gruppen aehnlicher Themes (je Gruppe genuegt eines):\n`);
mehr.sort((a, b) => b.length - a.length).forEach((g, i) => {
  console.log(`  ${i + 1}. ${g.map((k) => themes[k].name).join("  ·  ")}`);
});
const einzeln = Object.values(gruppen).filter((g) => g.length === 1).map((g) => themes[g[0]].name);
console.log(`\n${einzeln.length} stehen fuer sich allein:\n`);
console.log("  " + einzeln.join("  ·  ") + "\n");
