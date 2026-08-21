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
const VORSCHAU_REGEL = 4;
const lies = (roh, regel = VORSCHAU_REGEL) => {
  try {
    if (!roh) return null;
    const p = JSON.parse(roh);
    if (Array.isArray(p)) return null;
    return p && p.regel === regel ? p.rows : null;
  } catch { return null; }
};
const schreib = (v) => JSON.stringify({ regel: VORSCHAU_REGEL, abdruck: "xyz", rows: v });

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
    expect(lies(JSON.stringify({ regel: 3, rows }))).toBeNull();
  });

  it("Schrott im Speicher wirft nicht, sondern rechnet neu", () => {
    expect(lies("{kaputt")).toBeNull();
    expect(lies(null)).toBeNull();
  });

  it("das Widget benutzt den Stempel wirklich", () => {
    expect(src).toMatch(/const VORSCHAU_REGEL = \d+/);
    expect(src).toMatch(/regel:VORSCHAU_REGEL, abdruck, rows:v/);
    expect(src, "ein nacktes Array ist der Stand von vorher").toMatch(/Array\.isArray\(p\)\) return null/);
  });

  it("der Stempel allein reicht NICHT — der Abdruck der Daten muss mit", () => {
    // Der Stempel faengt eine geaenderte RECHENREGEL. Die andere Haelfte sind
    // geaenderte BUCHUNGEN: „Ich habe testweise eine Vormerkung ueber 3.000 €
    // erstellt und bin in den Sparplan. Da wurde aber nichts geaendert."
    //
    // Ein Effekt auf `txs` kann das nicht loesen — das Widget haengt nur im
    // Baum, solange das Sparen-Panel offen ist, und eine Vormerkung legt man
    // bei geschlossenem Panel an. Die Tabelle muss deshalb SELBST wissen,
    // woraus sie entstanden ist.
    expect(src).toMatch(/const datenAbdruck = React\.useCallback/);
    expect(src).toMatch(/abdruckRef\.current === jetzt/);
    // Und der Abdruck wird beim Oeffnen verglichen, nicht nur bei Aenderungen
    // waehrend das Panel offen steht.
    expect(src, "kein Erstlauf-Ausschluss mehr").not.toMatch(/ersterLaufRef/);
  });

  it("ohne gespeicherten Stand rechnet das Panel von selbst nach", () => {
    // Sonst haette der Stempel nur die alte Zahl entfernt und nichts an ihre
    // Stelle gesetzt — eine leere Tabelle waere keine Verbesserung.
    expect(src).toMatch(/Auto-Recompute beim ersten Öffnen des Panels/);
    expect(src).toMatch(/if\(result\) \{ didAutoLoadRef\.current = true; return; \}/);
  });
});

// ── Die Vorschau darf sich nicht in den Zeichentakt draengeln ─────────────
//
// Gemeldet: „Wenn eine Sparplan-Neuberechnung läuft und ich hoch und
// runterscrolle, wird der Bildschirm sporadisch nur halb gezeichnet."
//
// Zwei Ursachen, beide behoben:
//
//   1. Die Rechnung lief in `requestAnimationFrame`. Das klingt schonend, ist
//      aber das Gegenteil: rAF kommt VOR jedem einzelnen Bild dran — die
//      Rechnung draengelt sich also genau in den Takt, den der Browser zum
//      Scrollen braucht. Bei 77 Monaten sind das rund 26 Haeppchen.
//      `requestIdleCallback` kommt umgekehrt nur dran, wenn nichts
//      Dringenderes ansteht; das `timeout` sorgt dafuer, dass die Rechnung
//      trotzdem fertig wird.
//   2. Die Unschaerfe der alten Ansicht lag ueber einem sehr grossen Bereich
//      und wurde bei jedem Scroll-Bild neu gerechnet. Eine eigene Ebene
//      (`translateZ(0)`) laesst sie einmal rastern und danach nur schieben.
describe("Vorschau-Rechnung: gibt dem Scrollen Vorrang", () => {
  it("rechnet in Leerlauf-Haeppchen, nicht im Zeichentakt", () => {
    expect(src).toMatch(/requestIdleCallback\(fn, \{ timeout: 300 \}\)/);
    expect(src, "kein rAF mehr fuer die Monatsschleife").not.toMatch(/requestAnimationFrame\(step\)/);
    // Fallback fuer Safari unter 16.4 — sonst rechnet dort gar nichts mehr.
    expect(src).toMatch(/setTimeout\(fn, 0\)/);
  });

  it("hoert auf die Frist, macht aber immer mindestens einen Monat", () => {
    // Ohne das „mindestens einen" kaeme die Rechnung bei dauerhaftem Scrollen
    // nie voran — der Fortschrittsbalken stuende still.
    expect(src).toMatch(/frist\.timeRemaining\(\) > 4/);
    expect(src).toMatch(/getan === 0 \|\| nochZeit\(\)/);
  });

  it("die unscharfe Ansicht bekommt eine eigene Ebene", () => {
    const i = src.indexOf('filter:"blur(2.5px)"');
    expect(i, "die Unschaerfe muss es geben").toBeGreaterThan(-1);
    const block = src.slice(i, i + 700);
    expect(block).toMatch(/transform:"translateZ\(0\)"/);
    expect(block).toMatch(/willChange:"filter"/);
  });
});
