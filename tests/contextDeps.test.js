// Der Context in App.jsx ist memoisiert. Fehlt ein Wert-Eintrag in der
// Dependency-Liste, bekommen alle Consumer weiterhin den ALTEN Wert — ohne
// Fehler, ohne Warnung, die Oberflaeche reagiert einfach nicht mehr.
//
// Genau so ist es bei `startKonto` passiert: der Stern in der Konto-Schnellwahl
// liess sich antippen, der State im App-Component aenderte sich auch, nur sah
// der Hero davon nie etwas (Nutzer-Hinweis). Der Kommentar ueber der Liste
// warnt davor — gelesen hatte ihn trotzdem niemand.
//
// Dieser Test liest App.jsx als Text, sammelt die im Context-Objekt
// durchgereichten Bezeichner und prueft, dass jeder, der als useState-WERT
// (nicht als Setter) deklariert ist, auch in der Dependency-Liste steht.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src", "App.jsx"),
  "utf8",
);

// const cx = useMemo(() => ({ … }), [ … ]);
const memoStart = src.indexOf("const cx = useMemo(");
const depsStart = src.indexOf("}), [", memoStart);
const depsEnde = src.indexOf("]);", depsStart);

const objektText = src.slice(src.indexOf("({", memoStart) + 2, depsStart);
const depsText = src.slice(depsStart + "}), [".length, depsEnde);

// Alle im Context durchgereichten WERTE. Wichtig: bei `k: v` zaehlt v, nicht k
// — der Context reicht z.B. `month: frozenMonth` durch, gemeint (und in den
// Dependencies erwartet) ist also frozenMonth.
const durchgereicht = new Set(
  objektText
    .replace(/\/\/[^\n]*/g, "")               // Zeilenkommentare raus
    .split(/[,\n]/)
    .map(t => {
      const teile = t.split(":");
      return (teile.length > 1 ? teile[1] : teile[0]).trim();
    })
    .filter(t => /^[A-Za-z_$][\w$]*$/.test(t)),
);

const deps = new Set(
  depsText.split(/[,\n]/).map(t => t.trim()).filter(Boolean),
);

// Namen, die als `const [wert, setWert] = useState(...)` deklariert sind.
const stateWerte = new Set(
  [...src.matchAll(/const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*[A-Za-z_$][\w$]*\s*\]\s*=\s*useState/g)]
    .map(m => m[1]),
);

describe("AppCtx — Dependency-Liste des useMemo", () => {
  it("findet Context-Objekt und Dependency-Liste", () => {
    expect(memoStart).toBeGreaterThan(-1);
    expect(durchgereicht.size).toBeGreaterThan(30);
    expect(deps.size).toBeGreaterThan(20);
  });

  it("jeder durchgereichte useState-WERT steht in der Dependency-Liste", () => {
    const fehlend = [...durchgereicht]
      .filter(name => stateWerte.has(name))
      .filter(name => !deps.has(name))
      .sort();
    expect(fehlend).toEqual([]);
  });

  it("die Liste enthaelt keine Namen, die gar nicht durchgereicht werden", () => {
    // Reine Hygiene: solche Eintraege sind entweder Tippfehler oder Reste.
    // Zwei dokumentierte Ausnahmen — Werte, die NICHT im Context stehen, aber
    // von enthaltenen Helfern per Closure gelesen werden und deshalb sehr wohl
    // in die Liste gehoeren: `year` (getJV/setJV) und `_txIndex` (die
    // Tx-Index-Helfer).
    const AUSNAHMEN = new Set(["year", "_txIndex"]);
    const unbekannt = [...deps]
      .filter(n => !durchgereicht.has(n) && !AUSNAHMEN.has(n))
      .sort();
    expect(unbekannt).toEqual([]);
  });
});
