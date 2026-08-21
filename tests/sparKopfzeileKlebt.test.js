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

  it("kein overflow:hidden ueber der Tabelle — das schaltet sticky ab", () => {
    // Ein overflow:hidden auf einem VORFAHREN der Kopfzeile wuerde sie still
    // wieder mitscrollen lassen. Deshalb wird jedes Vorkommen einzeln
    // verantwortet statt bloss gezaehlt — sonst waechst die Zahl irgendwann
    // stillschweigend mit.
    //
    // Erlaubt, weil beide an kleinen Blattelementen sitzen und die Tabelle
    // nicht umschliessen:
    //   * der Fortschrittsbalken im Statusband (64x4px),
    //   * die Textkuerzung an den Zinsmonat-Schaltern.
    const erlaubt = [
      /background:"rgba\(0,0,0,0\.22\)",overflow:"hidden"/,     // Fortschrittsbalken
      /userSelect:"none",overflow:"hidden",whiteSpace:"nowrap"/,  // Textkuerzung
    ];
    const treffer = widget.match(/[^\n]*overflow:"hidden"[^\n]*/g) || [];
    const unbekannt = treffer.filter((zeile) => !erlaubt.some((r) => r.test(zeile)));
    expect(unbekannt, `unverantwortetes overflow:hidden — ${unbekannt.join(" | ")}`)
      .toEqual([]);
    // Und die bekannten muessen es auch wirklich noch geben.
    expect(treffer.length).toBe(2);
  });
});
