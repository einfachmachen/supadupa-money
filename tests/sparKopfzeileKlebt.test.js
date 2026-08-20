// Die Kopfzeile der Sparplan-Tabelle bleibt beim Scrollen stehen.
//
// Nutzer-Wunsch: „Da wäre es schöner, wenn die Kopfzeile mit Tiefst-Saldo,
// nach Sparen, + Monat, gesamt beim Scrollen nach oben stehen bleibt und die
// weiteren Zeilen sich immer die Überschriften behalten."
//
// Zwei Fallen stecken darin, und beide sind hier festgehalten:
//
//   1. `top: 0` wäre falsch. Der Hero klebt in demselben Scroll-Container
//      bereits oben (`.hero-sticky`, position:sticky, top:0). Eine Kopfzeile
//      mit `top: 0` schöbe sich dahinter und wäre genau dann unsichtbar, wenn
//      man sie braucht. Sie dockt deshalb an der Unterkante des Hero an —
//      `--hero-h`, in App.jsx GEMESSEN, weil der Hero auf- und zuklappbar und
//      je nach Theme unterschiedlich hoch ist.
//   2. Eine klebende Zeile muss deckend sein. Ohne eigenen Hintergrund
//      wandern die Datenzeilen sichtbar hindurch.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const widget = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
const app = readFileSync(resolve(wurzel, "src/App.jsx"), "utf8");
const dash = readFileSync(resolve(wurzel, "src/components/screens/DashboardScreenV2.jsx"), "utf8");

// Der Block um die Kopfzeile herum.
const kopf = (() => {
  const i = widget.indexOf("Tiefst-Saldo*");
  return widget.slice(i - 700, i + 100);
})();

describe("Sparplan-Kopfzeile klebt", () => {
  it("die Kopfzeile ist sticky", () => {
    expect(kopf).toMatch(/position:"sticky"/);
  });

  it("sie dockt an der Unterkante des Hero an, nicht bei 0", () => {
    expect(kopf).toMatch(/top:"var\(--hero-h, 0px\)"/);
    expect(kopf, "top:0 laege hinter dem Hero").not.toMatch(/top:0/);
  });

  it("sie ist deckend — sonst wandern die Zeilen hindurch", () => {
    expect(kopf).toMatch(/background:T\.surf2/);
    // Und zwar in DER Farbe der Karte, auf der sie liegt.
    expect(widget).toMatch(/id="sparplan-widget"[\s\S]{0,120}background:T\.surf2/);
  });

  it("sie liegt über den Datenzeilen", () => {
    expect(kopf).toMatch(/zIndex:3/);
  });

  it("--hero-h wird gemessen, nicht geraten", () => {
    expect(app).toMatch(/setProperty\("--hero-h"/);
    expect(app, "der Hero klappt auf und zu — ein ResizeObserver haelt nach")
      .toMatch(/new ResizeObserver\(\(\) => setzen/);
    expect(app).toMatch(/querySelector\("\.hero-sticky"\)/);
  });

  it("das gemessene Element gibt es wirklich", () => {
    expect(dash).toMatch(/className="hero-sticky"/);
  });

  it("kein overflow:hidden im Widget — das schaltet sticky ab", () => {
    // Ein einziges overflow:hidden auf einem Vorfahren wuerde die Kopfzeile
    // still wieder mitscrollen lassen. Das eine vorhandene sitzt an einer
    // Textkuerzung tief drin, nicht ueber der Tabelle.
    const treffer = widget.match(/overflow:"hidden"/g) || [];
    expect(treffer.length, "neues overflow:hidden pruefen").toBeLessThanOrEqual(1);
  });
});
