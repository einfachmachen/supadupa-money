// Verursachungsdatum zieht den Banktag mit (MobileVormerkenModal).
//
// Vorher standen beide Felder unverbunden nebeneinander: ein Kauf vom 27.11.
// konnte einen Banktag vom 20.08. behalten — eine Belastung VOR dem Kauf
// (Nutzer-Bild). Die Rechenregel selbst deckt banktagAusVerursacht.test.js ab;
// hier geht es um die Verdrahtung, und genau dort verstecken sich die Fehler:
// ein umbenannter Handler, das falsche der beiden Datumsfelder, ein Zustand
// aus einem anderen Zweig.
//
// Deshalb echt gerendert und echt getippt statt gerechnet.

import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../src/state/AppContext.js";
import { mockCtx } from "./_mockCtx.js";
import { MobileVormerkenModal } from "../src/components/organisms/MobileVormerkenModal.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    if (typeof window !== "undefined") window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (typeof window !== "undefined" && !window.matchMedia)
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
});

// React hoert nicht auf ein schlichtes `input.value = …` — der Setter des
// Prototyps muss es sein, sonst bekommt der Zustand die Aenderung nie zu sehen.
function tippeDatum(input, wert) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, wert);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Verursachungsdatum zieht den Banktag", () => {
  it("setzt den Banktag auf denselben Tag, wenn das ein Banktag ist", async () => {
    const behaelter = document.createElement("div");
    document.body.appendChild(behaelter);
    let wurzel;
    await act(async () => {
      wurzel = createRoot(behaelter);
      wurzel.render(React.createElement(AppCtx.Provider, { value: mockCtx },
        React.createElement(MobileVormerkenModal, { onClose: () => {} })));
    });

    const felder = () => [...behaelter.querySelectorAll('input[type="date"]')];
    expect(felder().length, "erwartet: verursacht UND Banktag").toBeGreaterThanOrEqual(2);

    const [verursacht, banktag] = felder();
    const vorher = banktag.value;

    // 27.11.2026 ist ein Freitag — also selbst ein Banktag.
    await act(async () => { tippeDatum(verursacht, "2026-11-27"); });

    expect(verursacht.value).toBe("2026-11-27");
    expect(banktag.value).not.toBe(vorher);
    expect(banktag.value).toBe("2026-11-27");

    await act(async () => wurzel.unmount());
    behaelter.remove();
  });

  it("rueckt auf den Montag, wenn der Kauf auf ein Wochenende faellt", async () => {
    const behaelter = document.createElement("div");
    document.body.appendChild(behaelter);
    let wurzel;
    await act(async () => {
      wurzel = createRoot(behaelter);
      wurzel.render(React.createElement(AppCtx.Provider, { value: mockCtx },
        React.createElement(MobileVormerkenModal, { onClose: () => {} })));
    });

    const felder = [...behaelter.querySelectorAll('input[type="date"]')];
    // 2026-08-22 ist ein Samstag.
    await act(async () => { tippeDatum(felder[0], "2026-08-22"); });
    expect(felder[1].value).toBe("2026-08-24");

    await act(async () => wurzel.unmount());
    behaelter.remove();
  });

  it("laesst den Banktag in Ruhe, wenn das Verursachungsdatum geleert wird", async () => {
    const behaelter = document.createElement("div");
    document.body.appendChild(behaelter);
    let wurzel;
    await act(async () => {
      wurzel = createRoot(behaelter);
      wurzel.render(React.createElement(AppCtx.Provider, { value: mockCtx },
        React.createElement(MobileVormerkenModal, { onClose: () => {} })));
    });

    const felder = [...behaelter.querySelectorAll('input[type="date"]')];
    await act(async () => { tippeDatum(felder[0], "2026-11-27"); });
    const gesetzt = felder[1].value;
    await act(async () => { tippeDatum(felder[0], ""); });
    // Ohne Verursachungsdatum gibt es nichts abzuleiten — der Banktag bleibt.
    expect(felder[1].value).toBe(gesetzt);

    await act(async () => wurzel.unmount());
    behaelter.remove();
  });
});
