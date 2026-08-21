// Der Kopfbereich des Sparplans („Heute sicher sparen …").
//
// Nutzer-Wünsche, alle aus einer Nachricht und alle mit derselben Absicht —
// der Bereich soll ruhig sein und sich in einem Blick lesen lassen:
//
//   * „die Beträge möchte ich rechtsbündig"  — drei Zahlen untereinander, die
//     an derselben Stelle enden, lassen sich vergleichen; linksbündig muss das
//     Auge bei jeder Zeile neu suchen, weil die Zahlen verschieden lang sind.
//   * „platzsparend jeweils in eine Zeile" — Beschriftung links, Betrag rechts,
//     statt Betrag unter Beschriftung. Möglich wurde das erst, weil beide
//     Seiten kürzer geworden sind: keine Nachkommastellen mehr („die
//     Sparbeträge sind keine vollen Beträge") und keine Klammerzusätze
//     („(Monat 1)", „(Zinstermin)", „(Do)").
//   * „Der Neuberechnen-Knopf kann doch jetzt komplett weg — passiert ja eh
//     automatisch."
//   * „‚Heute sicher sparen …' in eine Zeile."
//   * „Abstand zwischen 648,00 € und Summe 77 Monate: … entfernen."
//   * „Den Erklärtext unten bitte fortlaufend, ohne Absätze."
//   * Aus „Vorschau — vorgemerkt wird automatisch, sobald Sep läuft." wird
//     „Die Mega-Sparrate wird erst vorgemerkt, wenn der Zinsmonat läuft."
//
// Was mit dem Knopf passiert ist, steht weiter unten beim zweiten `describe`:
// Das Schreiben der Vormerkungen haengt jetzt an einem Symbol, das den Plan
// anlegt oder loescht.

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

describe("Sparplan-Kopf: eine Zeile je Betrag, rechtsbündig, ohne Cent", () => {
  it("Beschriftung und Betrag stehen in EINER Zeile, der Betrag rechts", () => {
    // Eine gemeinsame Hilfsfunktion statt dreimal derselbe Aufbau — sonst
    // driften die drei Zeilen beim nächsten Umbau wieder auseinander, und
    // genau das war der „unruhige" Eindruck.
    expect(wirksam).toMatch(/const betragZeile = \(label, farbe, wert, davor\)/);
    const i = wirksam.indexOf("const betragZeile");
    const block = wirksam.slice(i, i + 600);
    expect(block, "Beschriftung und Betrag nebeneinander")
      .toMatch(/justifyContent:"space-between"/);
    // Ohne Symbol auf der Schriftlinie (ein 12px-Text neben einer 22px-Zahl
    // saesse mittig sichtbar zu hoch), MIT Symbol mittig: Ein Knopf hat keine
    // Schriftlinie. Im Browser gemessen — mit `baseline` sass die
    // Beschriftung 6px statt 2px ueber der Zahl, und die Zeile wuchs von
    // 30 auf 39px.
    expect(block).toMatch(/alignItems:davor\?"center":"baseline"/);
    expect(block).toMatch(/fontSize:BETRAG_GROSS/);
    expect(block, "der Betrag bricht nicht um und schrumpft nicht")
      .toMatch(/whiteSpace:"nowrap",flexShrink:0/);
    // Und alle drei Betraege gehen wirklich durch diese eine Zeile.
    expect((wirksam.match(/betragZeile\(/g) || []).length,
      "sicher sparen, hin, zurueck").toBe(3);
  });

  it("die Beträge im Sparbereich zeigen keine Nachkommastellen", () => {
    // Gerundet, nicht nur um „,00" gekuerzt: Ein Cent in einer Vorschau ueber
    // 77 Monate taeuscht eine Genauigkeit vor, die es nicht gibt.
    expect(wirksam).toMatch(/const fmtR = \(v\) => fmtK\(Math\.round\(v\)\)/);
    expect(wirksam).toMatch(/const betragR = \(v\) => betragText\(fmtR\(v\)\)/);
    // Die SPARBETRAEGE des Bereichs laufen alle darueber — zwischen „Heute
    // sicher sparen" und dem Ende des Erklaertexts steht kein `betrag(` mehr.
    //
    // Ausgenommen sind die ZINSBETRAEGE: Sie behalten ihre Cent. Bei 2 % auf
    // ein paar tausend Euro geht es um einstellige Betraege, und ob die
    // Mega-Sparrate 27 Cent oder 12 € bringt, ist genau die Frage — gerundet
    // waere beides „0" bzw. „12". Die Ausnahme steht hier namentlich, damit
    // sie nicht zum Schlupfloch fuer den naechsten Sparbetrag wird.
    const von = wirksam.indexOf('betragZeile("Heute sicher sparen:"');
    const bis = wirksam.indexOf("auf dem Giro.");
    expect(von, "der Bereich muss es geben").toBeGreaterThan(-1);
    expect(bis).toBeGreaterThan(von);
    const ungerundet = wirksam.slice(von, bis).split("\n")
      .filter((z) => /[^R]betrag\(/.test(z))
      .filter((z) => !/zins/i.test(z));
    expect(ungerundet, `ungerundeter Betrag im Sparbereich: ${ungerundet.join(" | ")}`)
      .toEqual([]);
  });

  it("die Klammerzusätze sind weg", () => {
    expect(wirksam, "kein Zusatz (Monat 1)").not.toContain("(Monat 1)");
    expect(wirksam, "kein Zusatz (Zinstermin)").not.toContain("(Zinstermin)");
    // Der Wochentag hinter dem Rueckbuchungsdatum kam aus einer Tabelle, die
    // es damit auch nicht mehr braucht.
    expect(wirksam, "kein Wochentag mehr").not.toMatch(/const WOCHENTAGE/);
  });

  it("die ∑-Zeile steht rechtsbündig unter dem Betrag, ohne Abstand", () => {
    const i = wirksam.indexOf("∑ {monate+1} Monate:");
    expect(i, "die Summenzeile muss es geben").toBeGreaterThan(-1);
    const kopf = wirksam.slice(i - 200, i);
    expect(kopf, "kein marginTop mehr").not.toMatch(/marginTop:\s*\d/);
    expect(kopf).toMatch(/textAlign:"right"/);
    // Auch hier ohne Cent — Summe UND Durchschnitt.
    const zeile = wirksam.slice(i, i + 260);
    expect(zeile).toMatch(/betragR\(totalKumuliert\)/);
    expect(zeile).toMatch(/betragR\(durchschnitt\)/);
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
    const i = wirksam.indexOf("bleiben <b>{betragR(sweep.restNachSweep)} €</b>");
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
});

// ── Ein Symbol für die zwei Zustände des Plans ────────────────────────────
//
// „Wenn es noch keinen Sparplan gibt, muss natürlich ein Button vorhanden
// sein. Das kann aber auch ein platzsparendes Symbol sein. Sobald es einen
// Sparplan gibt, wechseln wir es doch zu einem Papierkorb-Symbol zum Löschen."
//
// Damit hat der Plan genau zwei Zustände — es gibt ihn oder nicht — und der
// Knopf zeigt beide an. Auffrischen heißt jetzt: löschen, dann neu anlegen;
// das frühere `autoAnpassen` ist damit ersatzlos entfallen. Das ist deshalb
// kein Verlust, weil die Vorschau ohnehin von selbst nachrechnet: Anlegen
// schreibt immer den frischen Stand.
//
// Was ausdrücklich NICHT automatisch passiert, ist das Schreiben selbst.
// Rechnen darf von allein laufen — es zeigt nur etwas an. Anlegen und Löschen
// ändern Buchungen und bleiben eine Entscheidung des Nutzers.
describe("Sparplan-Knopf: anlegen oder löschen", () => {
  it("ein Symbol, zwei Zustände", () => {
    expect(wirksam).toMatch(/Li\(gibtEs\?"trash-2":"plus-circle"/);
    expect(wirksam).toMatch(/onClick=\{gibtEs\?sparplanLoeschen:sparplanAnlegen\}/);
    // Platzsparend: ein kleines Quadrat VOR der Beschriftung, in einer Zeile,
    // die es ohnehin gibt — nicht in einer eigenen ueber der Tabelle
    // („vor der Tabelle eine ganze Zeile zu vergeuden, ist doof").
    expect(wirksam).toMatch(/width:30,height:30/);
    expect(wirksam, "der Knopf steht in der Zeile Heute sicher sparen")
      .toMatch(/\), planKnopf\(\)\)\}/);
    // Ein Symbol ohne Namen ist fuer Screenreader stumm.
    expect(wirksam).toMatch(/title=\{name\} aria-label=\{name\}/);
    expect(wirksam).toContain('"Sparplan löschen"');
    expect(wirksam).toContain('"Sparplan anlegen"');
  });

  it("Löschen fragt nach und trifft nur Vormerkungen", () => {
    const i = wirksam.indexOf("const sparplanLoeschen");
    expect(i, "die Funktion muss es geben").toBeGreaterThan(-1);
    const block = wirksam.slice(i, i + 1400);
    // Gefragt wird im App-Stil, nicht vom Browser.
    expect(block).toMatch(/frageBestaetigung\(frage/);
    expect(block).toMatch(/ton:"gefahr"/);
    // Nur PENDING — bereits gebuchte Raten sind Vergangenheit und gehoeren
    // dem Konto, nicht dem Plan.
    expect(block).toMatch(/txs\.filter\(t => t\.pending/);
    // Ohne Grabstein holt der naechste Sync die Raten von einem anderen
    // Geraet zurueck.
    expect(block).toMatch(/recordDeletedTxs\(/);
  });

  it("das Auffrischen ist bewusst entfallen, nicht vergessen", () => {
    // Wenn es je zurueckkommt, dann als Entscheidung — nicht, weil jemand die
    // tote Funktion wiederfindet und sie „schon mal wieder anschliesst".
    expect(wirksam, "kein toter Auffrisch-Pfad mehr").not.toMatch(/autoAnpassen/);
    expect(wirksam).not.toMatch(/const doAktualisieren/);
    expect(src, "aber die Begruendung steht im Code")
      .toMatch(/Warum es hier kein „Vormerkungen auffrischen" mehr gibt/);
  });
});
