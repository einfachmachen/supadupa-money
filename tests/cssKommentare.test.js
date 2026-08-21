// Wacht darueber, dass die Theme-Stylesheets syntaktisch heil sind.
//
// Anlass: Beim Erweitern eines Kommentars wurde dessen Abschluss `*/` mitten
// im Text stehen gelassen. Der Text dahinter landete dadurch als roher CSS-
// Inhalt in der Datei und verschmolz mit der folgenden Selektorliste — der
// Browser verwarf daraufhin die KOMPLETTE Regel. Sichtbar war das nur als
// "die Abstaende stimmen nicht"; weder Build noch Tests schlugen an, denn
// CSS kennt keinen Syntaxfehler, es ignoriert Unverstandenes stillschweigend.
// Genau diese Klasse Fehler faengt dieser Test.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const CSS_DATEIEN = ["src/theme/css/themes.css", "src/theme/css/base.css"];

// Position (Zeile/Spalte) fuer eine Zeichen-Position im Text — damit die
// Fehlermeldung direkt auf die Stelle zeigt statt nur "irgendwo".
function stelle(text, index) {
  const davor = text.slice(0, index);
  const zeile = davor.split("\n").length;
  const spalte = index - davor.lastIndexOf("\n");
  return `Zeile ${zeile}, Spalte ${spalte}`;
}

describe("Theme-Stylesheets: Kommentare", () => {
  for (const datei of CSS_DATEIEN) {
    it(`${datei}: jedes /* wird genau einmal geschlossen`, () => {
      const text = fs.readFileSync(path.resolve(datei), "utf8");
      let i = 0, offen = null;
      while (i < text.length) {
        const auf = text.indexOf("/*", i);
        const zu = text.indexOf("*/", i);
        if (auf === -1 && zu === -1) break;
        if (auf !== -1 && (zu === -1 || auf < zu)) {
          // Kommentar beginnt — Ende suchen.
          const ende = text.indexOf("*/", auf + 2);
          expect(ende, `Unbeendeter Kommentar ab ${stelle(text, auf)}`).not.toBe(-1);
          i = ende + 2;
          offen = null;
        } else {
          // Ein `*/` ohne zugehoeriges `/*` davor: genau der Fehler von damals.
          expect.fail(
            `Verwaistes "*/" bei ${stelle(text, zu)} — davor beginnt kein Kommentar. ` +
            `Der Text davor landet als roher CSS-Inhalt in der Datei und macht die ` +
            `folgende Regel ungueltig (der Browser verwirft sie stillschweigend).`
          );
        }
      }
      expect(offen).toBeNull();
    });
  }

  // Zusatzsicherung fuer die Regeln, die diesen Fehler ausgeloest haben: sie
  // muessen als zusammenhaengende Selektorliste erhalten bleiben. Ein Selektor,
  // dem Text vorausgeht, waere fuer den Browser unlesbar.
  it("themes.css: der 8px-Rhythmus der luftigen Themes steht als gueltige Regel", () => {
    const text = fs.readFileSync(path.resolve("src/theme/css/themes.css"), "utf8");
    // Kommentare entfernen — uebrig bleibt, was der Browser wirklich sieht.
    const ohneKommentare = text.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const klasse of ["diagramm-flaeche", "symbolzeile", "sortier-zeile", "such-zeile", "filter-zeile"]) {
      // Die Regeln hiessen frueher `.theme-tastenhell` und gelten jetzt fuer
      // jedes Theme mit `luftig:true` (siehe tests/themeLuftig.test.js).
      const treffer = ohneKommentare.includes(`.theme-luftig .${klasse}`);
      expect(treffer, `.theme-luftig .${klasse} fehlt im wirksamen CSS`).toBe(true);
    }
    // Kein Fliesstext zwischen Regelende und naechstem Selektor: nach einer
    // schliessenden Klammer darf nur Selektor-Syntax folgen, kein Prosa-Wort
    // mit Satzzeichen wie "Dieselbe Rechnung gilt …".
    const verdaechtig = ohneKommentare.match(/\}\s*[A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöüß]+\s+[A-Za-zÄÖÜäöü]/);
    expect(verdaechtig, `Fliesstext ausserhalb eines Kommentars: ${verdaechtig?.[0]}`).toBeNull();
  });
});
