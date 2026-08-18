// Fest verdrahtete UI-Symbole muessen im statischen Satz liegen.
//
// `Li("name")` holt sein Symbol aus STATIC_LUCIDE (im Hauptbundle, sofort da).
// Steht der Name dort nicht, faellt es auf das komplette Icon-Paket zurueck —
// rund 700 kB, die erst asynchron nachladen. Bis dahin bleibt die Stelle LEER.
// Auf schnellem Netz faellt das nicht auf, auf langsamem sehr wohl.
//
// Der Test haelt neue Faelle fern. Die heute schon vorhandenen Luecken stehen
// unten namentlich — sie sind damit sichtbar statt still.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Frueher standen hier neun Ausnahmen (activity, car, corner-up-right, fuel,
// key, key-round, maximize-2, route, trending-up) — darunter das Symbol des
// Money-Mood-Reiters und der „Alles"-Knopf im Zeitraum-Feld. Sie sind
// nachgezogen, die Liste ist leer. Sie bleibt bestehen, damit ein bewusster
// Ausnahmefall spaeter benannt statt stillschweigend eingebaut wird.
const BEKANNTE_LUECKEN = new Set([]);

function alleDateien(d, raus = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) alleDateien(p, raus);
    else if (/\.(jsx?|tsx?)$/.test(e.name)) raus.push(p);
  }
  return raus;
}

describe("Fest verdrahtete Symbole", () => {
  const statisch = new Set(
    [...readFileSync(resolve(wurzel, "src/utils/lucideStatic.js"), "utf8")
      .matchAll(/"([a-z0-9-]+)":/g)].map((m) => m[1]));

  const benutzt = new Set();
  for (const datei of alleDateien(resolve(wurzel, "src")))
    for (const m of readFileSync(datei, "utf8").matchAll(/\bLi\(\s*"([a-z0-9-]+)"/g))
      benutzt.add(m[1]);

  it("findet ueberhaupt Symbole (sonst prueft der Test nichts)", () => {
    expect(statisch.size).toBeGreaterThan(50);
    expect(benutzt.size).toBeGreaterThan(50);
  });

  it("kein NEUES Symbol ausserhalb des statischen Satzes", () => {
    const fehlend = [...benutzt].filter((n) => !statisch.has(n) && !BEKANNTE_LUECKEN.has(n)).sort();
    expect(fehlend, `nicht statisch verfuegbar: ${fehlend.join(", ")}`).toEqual([]);
  });

  it("die Liste der bekannten Luecken ist aktuell", () => {
    // Behobene Luecken sollen aus der Liste verschwinden, sonst verliert sie
    // ihren Wert als Bestandsaufnahme.
    const erledigt = [...BEKANNTE_LUECKEN].filter((n) => statisch.has(n) || !benutzt.has(n)).sort();
    expect(erledigt, `nicht mehr noetig, bitte streichen: ${erledigt.join(", ")}`).toEqual([]);
  });

  it("das Symbol des flexiblen Topfes ist sofort da", () => {
    expect(statisch.has("life-buoy")).toBe(true);
    const panel = readFileSync(resolve(wurzel, "src/components/organisms/BankFetchPanel.jsx"), "utf8");
    expect(panel).toMatch(/Li\("life-buoy"/);
    // piggy-bank ist der Sparplan — der Topf darf ihn sich nicht teilen.
    expect(panel).not.toMatch(/Li\("piggy-bank"/);
  });
});
