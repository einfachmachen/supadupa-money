// Option "Nachkommastellen drehen" (utils/betrag.jsx).
//
// `betrag(v)` liefert bei ausgeschalteter Option denselben String wie `fmt`,
// bei eingeschalteter ein React-Element mit klein gedrehten Cent. Genau daraus
// folgt die eine Regel, die hier bewacht wird: das Element darf ausschliesslich
// in JSX-Kindposition landen. In einem Template-Literal, einem Attribut oder
// einem alert()-Text wuerde daraus "[object Object]" — und zwar erst dann,
// wenn die Option eingeschaltet wird, also lange nach dem Schreiben des Codes.

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { betrag, betragText, setCentsGedreht, centsGedreht } from "../src/utils/betrag.jsx";
import { fmt } from "../src/utils/format.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function alleQuellen(verzeichnis = SRC, treffer = []) {
  for (const name of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, name);
    if (statSync(pfad).isDirectory()) alleQuellen(pfad, treffer);
    else if (/\.jsx?$/.test(name)) treffer.push(pfad);
  }
  return treffer;
}

afterEach(() => setCentsGedreht(false));

describe("Betrags-Option: Nachkommastellen drehen", () => {
  it("ist standardmaessig aus und liefert dann exakt fmt()", () => {
    expect(centsGedreht()).toBe(false);
    expect(betrag(1234.56)).toBe("1.234,56");
    expect(betrag(1234.56)).toBe(fmt(1234.56));
    expect(betrag(0)).toBe(fmt(0));
  });

  it("liefert eingeschaltet ein Element statt eines Strings", () => {
    setCentsGedreht(true);
    const el = betrag(1234.56);
    expect(typeof el).toBe("object");
    expect(el.props.s).toBe("1.234,56");
  });

  it("laesst sich wieder ausschalten", () => {
    setCentsGedreht(true);
    setCentsGedreht(false);
    expect(betrag(1234.56)).toBe("1.234,56");
  });

  it("betragText() laesst Texte ohne Nachkommastellen unveraendert", () => {
    // Die gekuerzten Kategorie-Summen ("2.480" statt "2.480,00") haben kein
    // Komma mehr — da gibt es nichts zu drehen.
    setCentsGedreht(true);
    expect(betragText("2.480")).toBe("2.480");
    expect(typeof betragText("2.480,55")).toBe("object");
  });

  it("betrag() steht in keinem SVG-<text>-Knoten", () => {
    // Bei aktiver Option ist das Ergebnis ein <span>; HTML-Elemente rendern
    // innerhalb von <svg> nicht (CategoryChart nutzt dort bewusst fmt()).
    const funde = [];
    for (const datei of alleQuellen()) {
      const zeilen = readFileSync(datei, "utf8").split("\n");
      let imSvg = false;
      zeilen.forEach((z, i) => {
        if (/<svg[\s>]/.test(z)) imSvg = true;
        if (/<\/svg>/.test(z)) imSvg = false;
        if (imSvg && /\bbetrag(Text|Short)?\(/.test(z)) {
          funde.push(`${datei.slice(SRC.length + 1)}:${i + 1}`);
        }
      });
    }
    expect(funde).toEqual([]);
  });

  it("betrag() steht nirgends in einem String-Kontext", () => {
    // Diese drei Formen ergaeben bei eingeschalteter Option "[object Object]".
    const verboten = [
      { regex: /\$\{[^}]*\bbetrag\(/,        was: "Template-Literal" },
      { regex: /\+\s*betrag\(/,              was: "String-Konkatenation" },
      { regex: /[A-Za-z-]+=\{betrag(Text|Short)?\(/, was: "Attributwert" },
      { regex: /\$\{[^}]*\bbetragText\(/,  was: "Template-Literal" },
      { regex: /\+\s*betragText\(/,         was: "String-Konkatenation" },
    ];
    const funde = [];
    for (const datei of alleQuellen()) {
      const zeilen = readFileSync(datei, "utf8").split("\n");
      zeilen.forEach((z, i) => {
        for (const { regex, was } of verboten) {
          if (regex.test(z)) funde.push(`${datei.slice(SRC.length + 1)}:${i + 1} (${was})`);
        }
      });
    }
    expect(funde).toEqual([]);
  });
});
