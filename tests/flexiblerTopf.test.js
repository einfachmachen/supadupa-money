// Flexibler Topf „Unvorhergesehenes" — nachträglich zuordenbar.
//
// Der Schalter „aus Unvorhergesehenes" gab es an zwei von drei Stellen: beim
// ANLEGEN einer Vormerkung (MobileVormerkenModal) und beim Bearbeiten einer
// bereits GEBUCHTEN Buchung (EditPopup). Eine BESTEHENDE Vormerkung wird
// dagegen im VormerkungHub bearbeitet — und dort fehlte er ganz. Nachträglich
// liess sich der Topf damit gar nicht zuordnen (Nutzer-Hinweis).
//
// Im Browser gegengeprueft: Vormerkung oeffnen → Schalter umlegen → speichern
// → `_potSubId` steht in den Daten → erneut geoeffnet steht er noch.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => readFileSync(resolve(wurzel, p), "utf8");

const STELLEN = [
  ["src/components/organisms/MobileVormerkenModal.jsx", "Vormerkung anlegen"],
  ["src/components/organisms/EditPopup.jsx", "gebuchte Buchung bearbeiten"],
  ["src/components/screens/VormerkungHub.jsx", "bestehende Vormerkung bearbeiten"],
];

describe("Flexibler Topf: an allen drei Bearbeitungswegen", () => {
  for (const [datei, zweck] of STELLEN) {
    const code = lies(datei);

    it(`${zweck}: kennt den Topf und bietet den Schalter`, () => {
      // Erkennung ueber den Namen — die Kategorie ist Nutzerdatum, keine id.
      expect(code).toMatch(/"unvorhergesehenes"/);
      expect(code).toMatch(/aus Unvorhergesehenes/);
    });

    it(`${zweck}: schreibt _potSubId in die Buchung`, () => {
      expect(code).toMatch(/_potSubId/);
    });
  }

  it("VormerkungHub uebernimmt den vorhandenen Stand beim Oeffnen", () => {
    // Ohne das wuerde ein Speichern den Topf stillschweigend abschalten.
    const code = lies("src/components/screens/VormerkungHub.jsx");
    expect(code).toMatch(/useState\(!!editVorm\?\._potSubId\)/);
  });

  it("VormerkungHub schreibt den Topf in BEIDE Speicherwege", () => {
    // Bearbeiten laeuft ueber updateTx, Neuanlegen ueber den tx-Aufbau
    // darunter. Faellt einer aus, geht der Topf beim jeweils anderen Weg
    // verloren, ohne dass es auffaellt.
    const code = lies("src/components/screens/VormerkungHub.jsx");
    expect(code).toMatch(/_potSubId:\s*\(_showPotToggle && potOn && _potSub\) \? _potSub\.id : undefined/);
    expect(code).toMatch(/\{_potSubId:_potSub\.id\}/);
  });

  it("VormerkungHub zeigt den Schalter nur, wo er sinnvoll ist", () => {
    // Einmalige Ausgabe, keine Umbuchung, und nicht wenn der Eintrag ohnehin
    // schon im Topf liegt. Bei einer Serie wuerde die Aenderung auf alle
    // Folgeeintraege wirken — ein dauerhaft aus dem Topf bezahlter Posten ist
    // keine unvorhergesehene Ausgabe mehr.
    const code = lies("src/components/screens/VormerkungHub.jsx");
    expect(code).toMatch(/_showPotToggle\s*=\s*typ==="einmalig"\s*&&\s*csvType==="expense"\s*&&\s*!umbuchung/);
    expect(code).toMatch(/subId !== _potSub\.id/);
  });
});
