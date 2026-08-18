// Flächen, die sich mit ihrer EIGENEN Farbe tönen.
//
// Das Muster steckt überall in der App: `background: ${X}22` und `color: X`.
// Gegen die reine Platte gerechnet sieht es sauber aus — gemalt ist der
// Untergrund aber genau in Richtung der Schrift verschoben, und der Kontrast
// schrumpft. Aufgefallen ist es am Hinweis „Nicht synchronisiert": helles Gold
// auf 13 % desselben Golds, auf heller Platte kaum zu lesen (Nutzer-Hinweis).
//
// Der Kontrast-Lauf im Browser hat das nicht gemeldet, und zwar nicht wegen
// einer fehlenden Fläche, sondern weil er den ZUSTAND nie herstellt: das
// Banner erscheint nur bei eingerichteter Cloud mit ungesicherten Änderungen.
// Genau solche Fälle deckt dieser Test ab — er rechnet statt zu klicken.
//
// `aufToenung` ist die Antwort der App darauf: es rechnet den getönten
// Untergrund erst zusammen und gibt den Wunschton nur zurück, wenn er darauf
// trägt. Ein fester Ersatzton reicht nicht — nachgerechnet fielen 57 von 136
// Theme-/Ton-Kombinationen unter 4,5:1, quer durch die Themes.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES } from "../src/theme/themes.js";
import { setActiveTheme } from "../src/theme/activeTheme.js";
import { aufToenung, kontrastWert, mischen } from "../src/theme/amtPill.js";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function alleDateien(d, raus = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) alleDateien(p, raus);
    else if (/\.jsx$/.test(e.name)) raus.push(p);
  }
  return raus;
}

// Alle style={{...}}-Literale einer Datei, Klammern mitgezählt.
function stilBloecke(code) {
  const out = [];
  const start = /style=\{\{/g;
  let m;
  while ((m = start.exec(code))) {
    let i = m.index + m[0].length, tiefe = 2;
    while (i < code.length && tiefe > 0) {
      if (code[i] === "{") tiefe++;
      else if (code[i] === "}") tiefe--;
      i++;
    }
    out.push({ block: code.slice(m.index, i), zeile: code.slice(0, m.index).split("\n").length });
  }
  return out;
}

describe("Selbstgetönte Flächen", () => {
  it("keine Fläche tönt sich mit X und schreibt X ungeprüft darauf", () => {
    const funde = [];
    for (const datei of alleDateien(resolve(wurzel, "src"))) {
      const code = readFileSync(datei, "utf8");
      for (const { block, zeile } of stilBloecke(code)) {
        // Tönung erkennen: `${X}NN` oder X + "NN"
        const toene = [
          ...block.matchAll(/background\s*:\s*`\$\{([^}]+)\}[0-9a-fA-F]{2}`/g),
          ...block.matchAll(/background\s*:\s*([A-Za-z_.$[\]"']+)\s*\+\s*"[0-9a-fA-F]{2}"/g),
        ].map((m) => m[1].trim());
        if (!toene.length) continue;

        const farbTeil = (block.match(/\bcolor\s*:\s*([^,}]+)/) || [])[1];
        if (!farbTeil) continue;
        // Die Helfer der App rechnen selbst — die sind der gewuenschte Weg.
        if (/auf(Toenung|Grund|Banner|Band|Knopf)|schriftAuf|readableOn/.test(farbTeil)) continue;

        for (const ton of toene) {
          const nackt = ton.replace(/^T\./, "").replace(/[.[\]$]/g, "\\$&");
          if (new RegExp(`(^|[^A-Za-z_.])${nackt}([^A-Za-z_]|$)`).test(farbTeil) || farbTeil.trim() === ton)
            funde.push(`${datei.replace(wurzel + "/", "")}:${zeile} — tönt mit ${ton}, schreibt ${farbTeil.trim().slice(0, 40)}`);
        }
      }
    }
    expect(funde, `ungeprüfte selbstgetönte Flächen:\n  ${funde.join("\n  ")}`).toEqual([]);
  });

  it("aufToenung haelt 4,5:1 auf JEDER Themefläche — anders als ein fester Ton", () => {
    // Die Rechnung, die den Anlass belegt: der Sync-Hinweis toent mit 0x22.
    const anteil = 0x22 / 255;
    const ohneHelfer = [];
    const mitHelfer = [];
    for (const [name, t] of Object.entries(THEMES)) {
      if (name === "custom_preview" || !t || !t.bg) continue;
      setActiveTheme(name, t);
      for (const rolle of ["gold", "pos", "neg", "blue"]) {
        const roh = t[rolle];
        if (!roh || !/^#/.test(roh)) continue;
        const grund = mischen(roh, anteil, t.bg);
        if (kontrastWert(roh, grund) < 4.5) ohneHelfer.push(`${name}/${rolle}`);
        if (kontrastWert(aufToenung(roh, anteil), grund) < 4.5) mitHelfer.push(`${name}/${rolle}`);
      }
    }
    // Ohne Helfer faellt ein erheblicher Teil durch — das ist der Beleg,
    // warum es den Helfer braucht und nicht nur einen anderen festen Ton.
    expect(ohneHelfer.length, "erwartet: der Rohton faellt vielfach durch").toBeGreaterThan(20);
    // Mit Helfer keine einzige Stelle mehr.
    expect(mitHelfer, `aufToenung traegt nicht bei: ${mitHelfer.join(", ")}`).toEqual([]);
  });
});
