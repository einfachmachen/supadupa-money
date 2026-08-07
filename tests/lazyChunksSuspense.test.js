// Jeder per React.lazy geladene Dialog MUSS gerendert werden und dabei unter
// einem <Suspense> liegen.
//
// Zwei Fehler dieser Art sind bereits passiert und blieben beide still:
//
//   1. Beim Entfernen des "Mehr"-Menues (5f07e77) fielen die Render-Aufrufe von
//      MonthPickerModal UND CloudSaveModal versehentlich mit weg. Die States
//      wurden weiterhin gesetzt — per Tipp auf den Sync-Hinweis, per Wisch am
//      + Button — es erschien nur nichts mehr. Kein Build-Fehler, kein
//      Laufzeitfehler, keine Warnung: zwei Bedienwege ohne jede Wirkung.
//   2. Beim Wiederherstellen landete CloudSaveModal ausserhalb des Suspense.
//      Ein Lazy-Chunk, der aus einem Klick heraus nachlaedt, wirft dann React
//      #426 ("A component suspended while responding to synchronous input") —
//      rote Fehlerseite statt Dialog.
//
// Der Test liest App.jsx als Text. Das ist grob, faengt aber genau die beiden
// Faelle ab, die ein Render-Test nicht sieht (er muesste jeden Dialog einzeln
// oeffnen) und die Typpruefung ebenso wenig.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const appSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src", "App.jsx"),
  "utf8",
);
const zeilen = appSrc.split("\n");

const lazyNamen = zeilen
  .map(z => z.match(/^const\s+(\w+)\s*=\s*lazyNamed\(/))
  .filter(Boolean)
  .map(m => m[1]);

// Zeilenbereiche zwischen <Suspense …> und </Suspense>.
const suspenseBereiche = (() => {
  const out = [];
  let start = null;
  zeilen.forEach((z, i) => {
    const nr = i + 1;
    if (z.includes("<Suspense")) start = nr;
    if (z.includes("</Suspense>") && start != null) { out.push([start, nr]); start = null; }
  });
  return out;
})();
const imSuspense = nr => suspenseBereiche.some(([a, b]) => nr >= a && nr <= b);

const renderZeilen = name => zeilen
  .map((z, i) => (z.includes(`<${name}`) ? i + 1 : null))
  .filter(Boolean);

describe("Lazy-Dialoge in App.jsx", () => {
  it("findet ueberhaupt Lazy-Komponenten und Suspense-Bereiche", () => {
    expect(lazyNamen.length).toBeGreaterThan(5);
    expect(suspenseBereiche.length).toBeGreaterThan(0);
  });

  it.each(lazyNamen)("%s wird gerendert", name => {
    expect(renderZeilen(name).length).toBeGreaterThan(0);
  });

  it.each(lazyNamen)("%s liegt unter einem <Suspense>", name => {
    const ohne = renderZeilen(name).filter(nr => !imSuspense(nr));
    expect(ohne).toEqual([]);
  });
});
