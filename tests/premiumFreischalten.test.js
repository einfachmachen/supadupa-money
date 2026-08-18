// Einstellungen → „Premium freischalten" (PremiumFreischalten.jsx).
//
// Die Sektion hat zwei Zustaende, und der Smoke-Test in screens_render.test.js
// sieht nur einen davon: der Mock-Context ist bewusst nicht freigeschaltet.
// Der freigeschaltete Zweig — Stufenname, Mailadresse, Gueltigkeit,
// Entfernen-Knopf — wuerde dort nie ausgefuehrt. Genau der ist aber der, den
// ein zahlender Nutzer sieht.

import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppCtx } from "../src/state/AppContext.js";
import { _ctxDefault } from "../src/state/AppContext.js";
import { PremiumFreischalten } from "../src/components/organisms/PremiumFreischalten.jsx";
import { TIER_LABEL } from "../src/utils/licenseFeatures.js";

function rendere(ueberschreiben = {}) {
  const wert = { ..._ctxDefault, ...ueberschreiben };
  const html = renderToString(
    React.createElement(AppCtx.Provider, { value: wert },
      React.createElement(PremiumFreischalten))
  );
  // React setzt beim Server-Rendern <!-- --> zwischen benachbarte Textknoten
  // ({wert} gefolgt von Text). Fuer die Frage, was dort STEHT, ist das
  // Rauschen — raus damit, sonst prueft man die Renderer-Interna mit.
  return html.replace(/<!-- -->/g, "");
}

const IN_30_TAGEN = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

describe("Premium freischalten", () => {
  it("ohne Lizenz: Eingabefeld und der Hinweis, dass der Rest frei bleibt", () => {
    const html = rendere();
    expect(html).toMatch(/Lizenzcode eingeben/);
    expect(html).toMatch(/dauerhaft frei/);
    // Die beiden kostenpflichtigen Funktionen sind benannt …
    expect(html).toMatch(/Bankabruf/);
    expect(html).toMatch(/Cloud-Sync/);
    // … samt der Stufe, ab der sie gelten.
    expect(html).toMatch(/ab Pro/);
    expect(html).toMatch(/ab Premium/);
    expect(html).not.toMatch(/freigeschaltet</);
  });

  it("mit Lizenz: Stufe, Mailadresse und Entfernen statt Eingabefeld", () => {
    const html = rendere({
      istFreigeschaltet: true, tier: "promax",
      lizenzMail: "kunde@example.com", lizenzBis: IN_30_TAGEN,
    });
    expect(html).toMatch(new RegExp(`${TIER_LABEL.promax} freigeschaltet`));
    expect(html).toMatch(/kunde@example\.com/);
    expect(html).toMatch(/Lizenz entfernen/);
    // Kein zweites Eingabefeld, wenn schon freigeschaltet.
    expect(html).not.toMatch(/Lizenzcode eingeben/);
  });

  it("mit Lizenz: nennt genau die Faehigkeiten der Stufe", () => {
    const premium = rendere({ istFreigeschaltet: true, tier: "premium" });
    expect(premium).toMatch(/Cloud-Sync/);
    expect(premium).not.toMatch(/Bankabruf/);

    const pro = rendere({ istFreigeschaltet: true, tier: "pro" });
    expect(pro).toMatch(/Cloud-Sync/);
    expect(pro).toMatch(/Bankabruf/);
  });

  it("eine unbekannte Stufe landet nicht als Rohwert im Text", () => {
    // Aelterer Client, neuere Stufe: darf nicht „tier_xy freigeschaltet"
    // anzeigen — und erst recht keine Funktion (so kam es im Mock-Context).
    const html = rendere({ istFreigeschaltet: true, tier: "gibtsnochnicht" });
    expect(html).toMatch(/Premium freigeschaltet/);
    expect(html).not.toMatch(/gibtsnochnicht/);
  });

  it("ein Fehler vom Lizenzserver steht sichtbar im Dialog", () => {
    const html = rendere({ lizenzFehler: "Diesen Lizenzcode kennen wir nicht." });
    expect(html).toMatch(/Diesen Lizenzcode kennen wir nicht/);
  });
});
