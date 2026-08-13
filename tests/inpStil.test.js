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
