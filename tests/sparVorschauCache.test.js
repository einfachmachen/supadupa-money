// Eine gespeicherte Vorschau-Tabelle darf nicht aktuell AUSSEHEN, wenn sie
// nach einer alten Rechenregel entstanden ist.
//
// Genau das ist passiert (Nutzer-Bilder): Die Vorschau-Tabelle liegt lokal im
// kvStore, damit sie nach einem Neuladen nicht leer ist. Als aber die Regel
// wechselte (11261788: Fenster ab dem Ratentermin statt Monats-Tiefstand),
// zeigte die gespeicherte Tabelle unverändert ihren alten Stand — 103 € —
// während in den Buchungen längst 583 € standen.
//
// `resultOutdated` half nicht: Es reagiert nur auf einen geänderten Horizont
// oder Puffer, nicht auf geänderte Buchungen und erst recht nicht auf eine
// geänderte Regel. Deshalb trägt der Speicherstand jetzt einen Stempel; bei
// der nächsten Regeländerung wird er erhöht und alte Tabellen werden
// verworfen statt angezeigt.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");

// Die beiden Zeilen aus dem Widget nachgestellt — Lesen und Schreiben.
const VORSCHAU_REGEL = 2;
const lies = (roh, regel = VORSCHAU_REGEL) => {
  try {
    if (!roh) return null;
    const p = JSON.parse(roh);
    if (Array.isArray(p)) return null;
    return p && p.regel === regel ? p.rows : null;
  } catch { return null; }
};
const schreib = (v) => JSON.stringify({ regel: VORSCHAU_REGEL, rows: v });

describe("Vorschau-Cache: Stempel statt blindem Vertrauen", () => {
  const rows = [{ y: 2026, m: 7, zusaetzlich: 583 }];

  it("was mit der aktuellen Regel geschrieben wurde, wird gelesen", () => {
    expect(lies(schreib(rows))).toEqual(rows);
  });

  it("ein Stand aus der Zeit VOR dem Stempel wird verworfen", () => {
    // Damals lag das nackte Array im Speicher — genau der Stand mit den 103 €.
    expect(lies(JSON.stringify([{ y: 2026, m: 7, zusaetzlich: 103 }]))).toBeNull();
  });

  it("ein Stand einer älteren Regel wird verworfen", () => {
    expect(lies(JSON.stringify({ regel: 1, rows }))).toBeNull();
  });

  it("Schrott im Speicher wirft nicht, sondern rechnet neu", () => {
    expect(lies("{kaputt")).toBeNull();
    expect(lies(null)).toBeNull();
  });

  it("das Widget benutzt den Stempel wirklich", () => {
    expect(src).toMatch(/const VORSCHAU_REGEL = \d+/);
    expect(src).toMatch(/regel:VORSCHAU_REGEL, rows:v/);
    expect(src, "ein nacktes Array ist der Stand von vorher").toMatch(/Array\.isArray\(p\)\) return null/);
  });

  it("ohne gespeicherten Stand rechnet das Panel von selbst nach", () => {
    // Sonst haette der Stempel nur die alte Zahl entfernt und nichts an ihre
    // Stelle gesetzt — eine leere Tabelle waere keine Verbesserung.
    expect(src).toMatch(/Auto-Recompute beim ersten Öffnen des Panels/);
    expect(src).toMatch(/if\(result\) \{ didAutoLoadRef\.current = true; return; \}/);
  });
});
