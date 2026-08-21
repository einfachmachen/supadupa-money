// Der Kopfbereich des Sparplans („Heute sicher sparen …").
//
// Nutzer-Wünsche, alle aus einer Nachricht und alle mit derselben Absicht —
// der Bereich soll ruhig sein und sich in einem Blick lesen lassen:
//
//   * „die Beträge möchte ich rechtsbündig"  — drei Zahlen untereinander, die
//     an derselben Stelle enden, lassen sich vergleichen; linksbündig muss das
//     Auge bei jeder Zeile neu suchen, weil die Zahlen verschieden lang sind.
//   * „Der Neuberechnen-Knopf kann doch jetzt komplett weg — passiert ja eh
//     automatisch."
//   * „‚Heute sicher sparen …' in eine Zeile."
//   * „Abstand zwischen 648,00 € und Summe 77 Monate: … entfernen."
//   * „Den Erklärtext unten bitte fortlaufend, ohne Absätze."
//   * Aus „Vorschau — vorgemerkt wird automatisch, sobald Sep läuft." wird
//     „Die Mega-Sparrate wird erst vorgemerkt, wenn der Zinsmonat läuft."
//
// Der entfernte Knopf hatte eine zweite Aufgabe, die NICHT automatisch
// passiert: Bei einem bestehenden Plan schrieb er das frische Ergebnis in die
// vorhandene Vormerkungs-Serie (`autoAnpassen`). Rechnen darf von selbst
// laufen — Buchungen ändern nicht. Diese Aufgabe hat deshalb der Knopf unter
// der Tabelle übernommen, der bis dahin nur neue Pläne anlegen konnte. Der
// letzte Test hier hält genau das fest: Sonst wäre mit dem Knopf still auch
// der einzige Weg verschwunden, einen bestehenden Sparplan nachzuführen.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");

// Nur der wirksame Code — in den Kommentaren stehen die alten Texte als
// Begründung noch drin und sollen dort auch stehen bleiben.
const wirksam = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("Sparplan-Kopf: rechtsbündige Beträge, ein Knopf weniger", () => {
  it("alle drei Beträge stehen rechtsbündig und in derselben Größe", () => {
    const treffer = [...wirksam.matchAll(/fontSize:BETRAG_GROSS[\s\S]{0,140}?\}\}>/g)]
      .map((m) => m[0]);
    expect(treffer.length, "drei Beträge: sicher sparen, hin, zurück").toBe(3);
    treffer.forEach((block) => {
      expect(block, `nicht rechtsbündig: ${block}`).toMatch(/textAlign:"right"/);
    });
  });

  it("die Zeile „Heute sicher sparen …“ bricht nicht um", () => {
    const i = wirksam.indexOf("Heute sicher sparen (Monat 1):");
    expect(i, "die Zeile muss es geben").toBeGreaterThan(-1);
    expect(wirksam.slice(i - 200, i)).toMatch(/whiteSpace:"nowrap"/);
  });

  it("zwischen Betrag und ∑-Zeile steht kein Abstand mehr", () => {
    const i = wirksam.indexOf("∑ {monate+1} Monate:");
    expect(i, "die Summenzeile muss es geben").toBeGreaterThan(-1);
    const kopf = wirksam.slice(i - 200, i);
    expect(kopf, "kein marginTop mehr").not.toMatch(/marginTop:\s*\d/);
  });

  it("der Neuberechnen-Knopf ist weg", () => {
    // Das Rechnen läuft von selbst (Daten-Abdruck + Auto-Recompute), der
    // Fortschritt steht im Band ganz oben.
    expect(wirksam, "kein Knopf mit dieser Beschriftung mehr")
      .not.toMatch(/"Neuberechnen"/);
    expect(wirksam, "auch nicht die Warn-Variante")
      .not.toMatch(/⚠ Neu berechnen/);
    expect(wirksam, "und kein Hinweis, ihn zu klicken")
      .not.toMatch(/Klicke „Neuberechnen"/);
  });

  it("der Erklärtext läuft fort, ohne Zeilenumbrüche", () => {
    const i = wirksam.indexOf("bleiben <b>{betrag(Math.round(sweep.restNachSweep))} €</b>");
    expect(i, "der Erklärtext muss es geben").toBeGreaterThan(-1);
    const block = wirksam.slice(i - 400, i + 400);
    expect(block, "kein <br/> im Erklärtext").not.toMatch(/<br\/>/);
  });

  it("die Vormerkung ist klar benannt — und heißt Mega-Sparrate", () => {
    expect(src).toContain("Die Mega-Sparrate wird erst vorgemerkt, wenn der Zinsmonat läuft.");
    expect(wirksam, "der alte, unklare Satz ist weg")
      .not.toMatch(/vorgemerkt wird automatisch, sobald/);
    // Auch in der Tabelle darunter — zwei Namen für dieselbe Sache waren der
    // Anlass („Unten die Einträge in der Liste … ändern").
    expect(wirksam, "kein Super mehr im Bildschirmtext").not.toContain("Super-Sparrate<");
    expect(wirksam).toContain("Mega-Sparrate</b>");
  });

  it("das Schreiben der Vormerkungen ist NICHT mit verschwunden", () => {
    // `autoAnpassen` hatte genau einen Aufrufer — den entfernten Knopf. Ohne
    // Ersatz wäre ein bestehender Sparplan nicht mehr nachzuführen gewesen:
    // Die Vorschau hätte die neuen Zahlen gezeigt, die Vormerkungen aber
    // weiter die alten getragen — genau der Widerspruch zwischen zwei
    // Bildschirmen, den diese Sitzung abgeschafft hat.
    expect(wirksam).toMatch(/onClick=\{autoAnpassen\}/);
    expect(wirksam).toContain("Vormerkungen aktualisieren");
    // Und er steht im Zweig für BESTEHENDE Serien, nicht im Anlege-Zweig.
    const i = wirksam.indexOf("onClick={autoAnpassen}");
    expect(wirksam.slice(i - 300, i)).toMatch(/_existingIds\.length>0\) return/);
  });
});
