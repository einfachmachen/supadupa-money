// Benutzte gemeinsame Konstanten muessen auch importiert sein.
//
// Anlass: In RecurringDetectionScreen wurde UNTEN_FREI an vier Stellen
// benutzt, ohne die Konstante zu importieren. Weder Build noch Tests schlugen
// an — ein fehlender Import ist kein Syntaxfehler, sondern erst zur LAUFZEIT
// einer, und zwar genau dann, wenn der betroffene Zweig gerendert wird. Der
// Render-Test des Screens lief gruen, weil er einen anderen Zweig zeigt.
// Aufgefallen waere es erst beim Oeffnen des Screens auf dem Geraet.
//
// Dieser Test liest die Namen direkt aus palette.js und prueft jede Quelldatei
// dagegen — er veraltet also nicht, wenn dort etwas dazukommt.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const WURZEL = path.resolve("src");
const PALETTE = path.join(WURZEL, "theme", "palette.js");

// Exportierte Namen aus palette.js: `export { A, B, ... };`
function exportierteNamen() {
  const text = fs.readFileSync(PALETTE, "utf8");
  const m = text.match(/export\s*\{([^}]*)\}/);
  if (!m) return [];
  return m[1].split(",").map(s => s.trim()).filter(Boolean);
}

function quellDateien(dir, treffer = []) {
  for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, eintrag.name);
    if (eintrag.isDirectory()) quellDateien(p, treffer);
    else if (/\.(jsx?|mjs)$/.test(eintrag.name)) treffer.push(p);
  }
  return treffer;
}

describe("Gemeinsame Konstanten: benutzt = importiert", () => {
  const namen = exportierteNamen();

  it("palette.js exportiert ueberhaupt etwas (sonst prueft dieser Test nichts)", () => {
    expect(namen.length).toBeGreaterThan(0);
  });

  it("jede Datei, die einen dieser Namen benutzt, importiert ihn auch", () => {
    const fehler = [];
    for (const datei of quellDateien(WURZEL)) {
      if (path.resolve(datei) === PALETTE) continue;
      const text = fs.readFileSync(datei, "utf8");
      // Import-Zeilen aus palette.js einsammeln (Pfad-Tiefe egal).
      const importiert = new Set();
      for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*theme\/palette\.js["']/g)) {
        m[1].split(",").forEach(n => importiert.add(n.trim().split(/\s+as\s+/)[0]));
      }
      // Kommentare raus, bevor gesucht wird: die Namen tauchen dort haeufig
      // als Erklaerung auf ("// INP: live getter …") und waeren sonst
      // Fehlalarme. Ebenso die Import-Zeilen selbst.
      const nurCode = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
        .replace(/import[^;]*;/g, "");
      for (const name of namen) {
        const ohneImporte = nurCode;
        if (!new RegExp(`\\b${name}\\b`).test(ohneImporte)) continue;
        // Eigene Deklaration im selben Modul ist auch in Ordnung.
        if (new RegExp(`(const|let|var|function)\\s+${name}\\b`).test(ohneImporte)) continue;
        if (!importiert.has(name)) {
          fehler.push(`${path.relative(WURZEL, datei)} benutzt ${name}, importiert es aber nicht`);
        }
      }
    }
    expect(fehler, fehler.join("\n")).toEqual([]);
  });
});
