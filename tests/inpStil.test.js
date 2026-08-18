// INP: der Eingabefeld-Grundstil muss sich SPREADEN lassen.
//
// `INP` ist ein Proxy, damit die Werte dem aktiven Theme live folgen. Er hatte
// aber nur einen `get`-Trap — und `{...INP}` fragt `ownKeys` und
// `getOwnPropertyDescriptor`, die ans leere Ziel gingen. Ergebnis: an allen 71
// Stellen im Code, die `{...INP}` schreiben, kam ein LEERES Objekt an. Die
// Felder trugen nur, was zufaellig daneben stand — deshalb war nicht zu
// erkennen, was ein Eingabefeld ist (Nutzer-Hinweis).
//
// Der Test prueft beides: dass der Spread ueberhaupt etwas liefert, und dass
// die Werte dem Theme folgen.

import { describe, it, expect, beforeEach } from "vitest";
import { INP } from "../src/theme/palette.js";
import { setActiveTheme } from "../src/theme/activeTheme.js";
import { THEMES } from "../src/theme/themes.js";

beforeEach(() => setActiveTheme("dark", THEMES.dark));

describe("INP (Eingabefeld-Grundstil)", () => {
  it("kommt beim Spread vollstaendig an", () => {
    const stil = { ...INP };
    expect(Object.keys(stil).length).toBeGreaterThan(5);
    expect(stil.borderRadius).toBe(11);
    expect(stil.width).toBe("100%");
    expect(stil.color).toBeTruthy();
  });

  it("traegt die Feldkante als inneren Schatten", () => {
    // Als `border` waere sie im Randlos-Modus (Standard) weg — der faerbt
    // jede border-color transparent.
    expect({ ...INP }.boxShadow).toContain("inset");
    expect({ ...INP }.boxShadow).toContain("currentColor");
  });

  it("folgt dem Theme", () => {
    const dunkel = { ...INP }.background;
    setActiveTheme("light", THEMES.light);
    expect({ ...INP }.background).not.toBe(dunkel);
  });
});

// Die vier Zeitraum-Felder im Daten-Manager sind <select>. Nativ malt jede
// Plattform sie anders — iOS ein Doppel-Chevron mit eigenem Innenabstand,
// Chrome ein einfaches Dreieck — und nebeneinander in einer Zeile faellt das
// sofort auf (Nutzer-Hinweis). Deshalb `appearance:none` plus ein Pfeil aus
// dem Symbolsatz der App, der zugleich die Themefarbe traegt.
describe("Zeitraum-Felder im Daten-Manager", () => {
  it("schalten die native Darstellung ab und malen den Pfeil selbst", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const code = readFileSync(resolve(wurzel, "src/components/organisms/DataManagerDialog.jsx"), "utf8");

    const feld = code.slice(code.indexOf("const ZeitFeld"), code.indexOf("const rangeSelector"));
    expect(feld, "ZeitFeld nicht gefunden").toBeTruthy();
    expect(feld).toMatch(/appearance:\s*"none"/);
    expect(feld).toMatch(/WebkitAppearance:\s*"none"/);
    expect(feld).toMatch(/Li\("chevron-down"/);
    // Der Pfeil darf den Klick nicht abfangen — sonst laesst sich das Feld
    // an der Stelle nicht mehr oeffnen.
    expect(feld).toMatch(/pointerEvents:\s*"none"/);
    // Und alle vier Felder muessen ueber dasselbe Bauteil laufen, sonst
    // driften sie wieder auseinander.
    expect((code.match(/<ZeitFeld /g) || []).length).toBe(4);
    // Genau EIN <select> mit dem Haken — das im Bauteil. Taucht ein zweites
    // auf, ist ein Feld an ZeitFeld vorbei gebaut und driftet wieder.
    expect((code.match(/<select className="zeitraum-feld"/g) || []).length).toBe(1);
  });
});
