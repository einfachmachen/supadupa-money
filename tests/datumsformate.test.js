// Datums-Ausgabe in der Oberflaeche.
//
// An mehreren Stellen stand der rohe ISO-Wert ("2026-08-10") ungefiltert in
// der Oberflaeche und wirkte dadurch wie eine englische Datumsangabe
// (Nutzer-Hinweis). Die Regel dahinter: Steht Monat und Jahr schon am
// + Button, reicht der Tag — sonst so viel, wie noetig ist, um eindeutig zu
// bleiben.
//
// Der zweite Test haelt fest, dass kein Bildschirm zurueck auf ISO faellt.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tagKurz, tagMonat, tagVoll } from "../src/utils/date.js";

describe("Datums-Formate", () => {
  it("tagKurz liefert nur den Tag", () => {
    expect(tagKurz("2026-08-10")).toBe("10.");
    expect(tagKurz("2026-01-01")).toBe("01.");
  });

  it("tagMonat liefert Tag und Monat", () => {
    expect(tagMonat("2026-08-10")).toBe("10.08.");
  });

  it("tagVoll liefert Tag, Monat und Jahr", () => {
    expect(tagVoll("2026-08-10")).toBe("10.08.2026");
  });

  it("kommt mit fehlenden oder kaputten Werten klar", () => {
    for (const f of [tagKurz, tagMonat, tagVoll]) {
      expect(f(null)).toBe("");
      expect(f(undefined)).toBe("");
      expect(f("")).toBe("");
      expect(f("Unsinn")).toBe("");
    }
  });

  it("keine der drei Formen enthaelt einen englischen Monatsnamen", () => {
    const alle = [tagKurz, tagMonat, tagVoll].map(f => f("2026-08-10")).join(" ");
    expect(alle).not.toMatch(/Aug|August|Sep|Dec/);
  });
});

// ── Kein roher ISO-Wert mehr in der Oberflaeche ──────────────────────────
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function jsxDateien(ordner) {
  const out = [];
  for (const name of readdirSync(ordner)) {
    const voll = join(ordner, name);
    if (statSync(voll).isDirectory()) out.push(...jsxDateien(voll));
    else if (name.endsWith(".jsx")) out.push(voll);
  }
  return out;
}

describe("Keine rohen ISO-Daten in der Oberflaeche", () => {
  it("kein {x.date} / {x.isoDate} direkt im JSX", () => {
    // Nur die AUSGABE als JSX-Kind treffen — also `>{tx.date}` oder ein
    // Ausdruck am Zeilenanfang. Bewusst NICHT: `datum={b.date}` (Prop, wird
    // in der Komponente formatiert) und `${row.isoDate}` (Index-Schluessel im
    // Template-Literal). Beides ist voellig in Ordnung und war beim ersten
    // Anlauf faelschlich mit angeschlagen.
    const muster = /(?:^|>)\s*\{\s*(?:tx|t|r|b|it|pend|row)\.(?:date|isoDate)\s*\}/;
    const treffer = [];
    for (const datei of jsxDateien(SRC)) {
      readFileSync(datei, "utf8").split("\n").forEach((zeile, i) => {
        if (muster.test(zeile)) treffer.push(`${datei.replace(SRC, "src")}:${i + 1}`);
      });
    }
    expect(treffer).toEqual([]);
  });
});
