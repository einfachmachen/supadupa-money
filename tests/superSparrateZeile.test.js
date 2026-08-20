// Die Super-Sparraten-Zeile im Sparplan (TagesgeldWidget).
//
// VOLLE Signalfläche in Sonnengelb, keine Tönung (Nutzer-Wunsch — dieselbe
// Entscheidung wie beim Sync-Hinweis: „einfache, klare Farben").
//
// Eine Tönung war der erste Versuch und ging aus zwei Gründen nicht auf:
//
//   * Über 34 Themes ergab derselbe Alpha-Wert mal Oliv, mal Senf, mal einen
//     kaum sichtbaren Hauch. Gemessen erreichte das Band gegen die Monatszeile
//     nur 1,10:1 — als Hervorhebung zu wenig.
//   * In „Tastenhell" sind Zeile und Band dieselbe Taste, sobald man das Band
//     als Karte auszeichnet; die Tönung wäre dort restlos weggebügelt worden
//     (1,00:1 gemessen).
//
// Eine deckende Fläche bringt ihren Untergrund selbst mit. Damit ist beides
// erledigt: Sie sieht in jedem Theme gleich aus, und die Schrift lässt sich
// dagegen ausrechnen statt gegen eine Mischung, die vom Theme abhängt — genau
// deshalb hat dieser Test keine Theme-Schleife mehr für die Fläche.

import { describe, it, expect } from "vitest";
import { AMPEL } from "../src/utils/syncBadge.js";
import { knopfPaar, DUNKEL, kontrastWert } from "../src/theme/amtPill.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Genau die Rechnung aus TagesgeldWidget.jsx (`sweepPaar`).
const paar = () => knopfPaar(AMPEL.gelb, DUNKEL);

describe("Super-Sparraten-Zeile: Sonnengelb mit gerechneter Schrift", () => {
  it("die Schrift trägt auf dem Sonnengelb", () => {
    const { grund, schrift } = paar();
    const wert = kontrastWert(schrift, grund);
    expect(wert, `nur ${wert.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it("es ist DASSELBE Sonnengelb wie im Sync-Hinweis", () => {
    // Zwei Sonnengelbs in einer App driften auseinander. Der Wert kommt
    // deshalb aus syncBadge.js und wird hier nicht noch einmal getippt.
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    expect(src).toMatch(/import \{ AMPEL \} from "\.\.\/\.\.\/utils\/syncBadge\.js"/);
    expect(src).toMatch(/knopfPaar\(AMPEL\.gelb, DUNKEL\)/);
    expect(src, "kein zweites Gelb von Hand").not.toMatch(/#FFC400/);
  });

  it("die Fläche ist deckend, nicht getönt", () => {
    // Eine Tönung (`${…}1f`) wäre der Rückfall in genau das Problem oben.
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    const i = src.indexOf("Super-Sparrate</b>");
    const block = src.slice(i - 500, i + 400);
    expect(block).toMatch(/background:\s*sweepGrund\(\)/);
    expect(block, "keine Hex-Alpha-Toenung").not.toMatch(/\$\{T\.gold\}1f/);
  });

  it("ein BAND, kein Kasten im Kasten — und ohne Symbol", () => {
    // Nutzer-Hinweise, beide in einem: „im Bereich nicht noch einen Bereich
    // zeichnen" und „das Blitzsymbol koennen wir weglassen, damit eine Zeile
    // reicht". Ein gerahmtes Kaestchen IN einer gerahmten Zeile las sich als
    // zweiter Bereich; das Symbol kostete die Breite, an der die Zeile umbrach.
    const src = readFileSync(resolve(wurzel, "src/components/organisms/TagesgeldWidget.jsx"), "utf8");
    const i = src.indexOf("Super-Sparrate</b>");
    expect(i, "die Zeile muss es geben").toBeGreaterThan(-1);
    const block = src.slice(i - 500, i + 400);
    expect(block, "kein Rahmen ringsum").not.toMatch(/border:\s*`1px solid/);
    expect(block, "keine Rundung").not.toMatch(/borderRadius:/);
    expect(block, "kein Blitzsymbol").not.toMatch(/Li\("zap"/);
    expect(block, "nicht eingerueckt").not.toMatch(/paddingLeft:\s*38/);
    // Buendig bis an die Raender: negative Raender heben das Polster der
    // Monatszeile auf.
    expect(block).toMatch(/margin:\s*"3px -6px -3px"/);
  });
});
