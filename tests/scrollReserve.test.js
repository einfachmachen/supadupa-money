// Regression: Scroll-Reserve unter den Dialogen, die den + Knopf tragen.
//
// Diese Dialoge setzen masterOverride — die Bottom-Leiste UND der vergroesserte
// + Knopf liegen dann ueber ihnen (der Knopf ist dort die Bestaetigung und soll
// genau dort bleiben). Ihr Scrollbereich braucht deshalb unten eine Reserve in
// Hoehe von UNTEN_FREI, sonst enden die letzten Zeilen unter dem Knopf und
// lassen sich nicht mehr hochschieben.
//
// Der Fehler kam zweimal vor: erst mit fest verdrahteten 140px, die noch von
// der alten 57px-Leiste ohne den Ueberhang des Knopfes stammten, dann mit 32px
// im Vormerken-Hub, die eine inzwischen entfernte Pauschal-Reserve in
// .mobile-modal voraussetzten. Beides sah im Build und in den Tests sauber aus
// und war nur auf dem Geraet zu sehen. Der Test prueft daher zwei Dinge:
// die Reserve ist ueberhaupt vorhanden, und sie ist nicht wieder eine Zahl.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { UNTEN_FREI } from "../src/theme/palette.js";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Dateien, die masterOverride setzen (ermittelt via grep setMasterOverride).
// GuidedFeatureTour bleibt aussen vor: die Tour legt sich als Overlay ueber
// eine fremde Seite und hat keinen eigenen Scrollbereich.
const DIALOGE = [
  "src/components/organisms/MobileVormerkenModal.jsx",
  "src/components/organisms/MobileKategorienModal.jsx",
  "src/components/organisms/DataManagerDialog.jsx",
  "src/components/screens/VormerkungHub.jsx",
  "src/components/screens/CsvImportScreen.jsx",
  "src/components/screens/FuelAnalysisScreen.jsx",
];

// Kommentare raus, sonst zaehlen erklaerende Texte als Fundstelle mit.
const ohneKommentare = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");

// Alle style={{...}}-Literale einer Datei einsammeln. Klammern werden mitgezaehlt,
// damit verschachtelte Ausdruecke (Ternaere, Template-Strings) nicht abschneiden.
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
    out.push(code.slice(m.index, i));
  }
  return out;
}

// Verschachtelte { }-Gruppen entfernen, damit nur die oberste Ebene eines
// style-Literals uebrig bleibt. Sonst zaehlt ein flex:1 aus einem eingebetteten
// Zweig (…(voll ? {flex:1} : {maxHeight:220})) als Treffer, obwohl die Flaeche
// nur im Sonderfall bis nach unten reicht.
function nurObersteEbene(block) {
  const inner = block.replace(/^style=\{\{/, "").replace(/\}\}$/, "");
  let out = "", tiefe = 0;
  for (const c of inner) {
    if (c === "{") tiefe++;
    else if (c === "}") { if (tiefe > 0) tiefe--; continue; }
    if (tiefe === 0) out += c;
  }
  return out;
}

// Nur die Scrollflaechen, die bis zur Dialog-Unterkante reichen (flex:1) —
// eine Teilliste mit eigener maxHeight endet nicht unter dem + Knopf und
// braucht die Reserve daher nicht.
const istVolleScrollflaeche = (s) => {
  const oben = nurObersteEbene(s);
  return /overflowY\s*:\s*["']auto["']/.test(oben) && /\bflex\s*:\s*1\b/.test(oben);
};

describe("Scroll-Reserve in den Dialogen mit + Knopf", () => {
  for (const datei of DIALOGE) {
    const roh = readFileSync(resolve(wurzel, datei), "utf8");
    const code = ohneKommentare(roh);

    it(`${datei} reserviert UNTEN_FREI nach unten`, () => {
      expect(code).toMatch(/UNTEN_FREI/);
      expect(code).toMatch(/import\s*\{[^}]*\bUNTEN_FREI\b[^}]*\}\s*from\s*["'][^"']*palette\.js["']/);
    });

    it(`${datei} verdrahtet in keiner vollen Scrollflaeche eine kleinere Reserve fest`, () => {
      const flaechen = stilBloecke(code).filter(istVolleScrollflaeche);
      expect(flaechen.length, "keine volle Scrollflaeche gefunden").toBeGreaterThan(0);

      const zuKnapp = [];
      for (const s of flaechen) {
        if (/UNTEN_FREI/.test(s)) continue;          // Reserve korrekt gesetzt
        // paddingBottom:140 / paddingBottom:"calc(32px + …)" / padding:"12px 16px 140px"
        const m = s.match(/paddingBottom\s*:\s*["'`]?\s*(?:calc\(\s*)?(\d+)(?:px)?/)
          || s.match(/padding\s*:\s*[`"'][^`"']*?(\d+)px[`"']/);
        zuKnapp.push(m ? `${m[1]}px` : "gar keine");
      }
      expect(zuKnapp, `Scrollflaeche(n) ohne UNTEN_FREI: ${zuKnapp.join(", ")}`).toEqual([]);
    });
  }
});

// Die beiden Hauptlisten hinter der Leiste: Home und Monat. Sie holten ihre
// Reserve nicht aus UNTEN_FREI, sondern aus einer Regel in themes.css mit
// 64px — genau die Leistenhoehe OHNE den + Knopf, der darueber hinausragt.
// Gemessen endete der letzte Tag in Monat dadurch 120px UNTER dessen
// Oberkante und liess sich nicht hochschieben; mit UNTEN_FREI sind es 32px
// darueber. Die Regel in themes.css bleibt bestehen (Inline gewinnt), sie
// deckt nur noch Faelle ohne eigene Reserve ab.
describe("Scroll-Reserve der Hauptlisten", () => {
  for (const datei of [
    "src/components/screens/DashboardScreenV2.jsx",
    "src/components/screens/MonatScreen.jsx",
  ]) {
    it(`${datei} gibt der Bildschirmliste UNTEN_FREI mit`, () => {
      const code = ohneKommentare(readFileSync(resolve(wurzel, datei), "utf8"));
      expect(code).toMatch(/import\s*\{[^}]*\bUNTEN_FREI\b[^}]*\}\s*from\s*["'][^"']*palette\.js["']/);
      // Der Scrollbehaelter traegt die Klasse screen-scroll; die Reserve muss
      // an genau diesem Element haengen, nicht irgendwo sonst in der Datei.
      const block = stilBloecke(code).find(s => /paddingBottom:\s*UNTEN_FREI/.test(s)
        && /overflowY\s*:\s*["']auto["']/.test(nurObersteEbene(s)));
      expect(block, "keine Scrollflaeche mit UNTEN_FREI gefunden").toBeTruthy();
    });
  }
});
