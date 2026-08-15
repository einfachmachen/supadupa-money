// Layout-Zusage des Überfällig-Warnbanners.
//
// Vorgeschichte (sechs Fehlversuche): Der Balken lag zunächst im normalen
// Fluss — und war damit in JEDEM Vollbild-Dialog unsichtbar, denn die sind
// selbst position:fixed; inset:0 mit z-Index bis 400 und liegen zwangsläufig
// darüber. Der Versuch danach setzte transform aufs Wurzel-Div und hielt den
// Platz per paddingTop frei. Das war NACHWEISLICH falsch: der von transform
// erzeugte Bezugsrahmen hat laut CSS-Transforms-Spec die Maße der BORDER-Box,
// und Polster liegt innerhalb davon. Die Dialoge begannen also weiter bei y=0,
// hinter dem Balken — in Fahrzeug-Analyse, Cloud-Einrichtung und Daten-Manager
// fehlten dadurch die kompletten Kopfzeilen.
//
// Deshalb prüft dieser Test ausdrücklich, dass der Platz NICHT über Polster
// entsteht, sondern über marginTop (verschiebt die Border-Box selbst) plus
// reduzierte Höhe (hält die Unterkante am Bildschirmrand).
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import "fake-indexeddb/auto";
import React from "react";
import { createRoot } from "react-dom/client";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;

// Höchster z-Index unter den Vollbild-Dialogen (CloudSaveModal,
// MobileNewAccOverlay, Konto-Löschen-Rückfrage). Der Balken MUSS darüber
// liegen, sonst ist er dort unsichtbar.
const MAX_DIALOG_Z = 400;

const LS_KEY = "finanzapp_v9";

function seed(txs) {
  localStorage.setItem(LS_KEY, JSON.stringify({
    saved_at: Date.now(),
    txs,
    cats: [{ id: "c1", name: "Wohnen", type: "expense", color: "#8aa", subs: [{ id: "s1", name: "Miete" }] }],
    accounts: [{ id: "acc-giro", name: "Giro", color: "#8aa", icon: "credit-card", delayDays: 0 }],
    groups: [], budgets: {}, yearData: {}, startBalances: {},
  }));
}

const ueberfaellig = () => {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString().slice(0, 10);
};

const tx = (date) => ([{ id: "t1", date, desc: "Miete", totalAmount: -800, pending: true,
  accountId: "acc-giro", splits: [{ id: "sp1", catId: "c1", subId: "s1", amount: -800 }] }]);

async function mountApp() {
  const { installLegacyBridge } = await import("../src/state/persistence.js");
  installLegacyBridge();
  const App = (await import("../src/App.jsx")).default;
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => { createRoot(host).render(React.createElement(App)); });
  // Der lokale Stand wird asynchron geladen (IDB → localStorage).
  for (let i = 0; i < 8; i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  }
  return host;
}

const findBanner = (host) =>
  [...host.querySelectorAll("div")].find(el => /überfällige? Vormerkung/i.test(el.textContent || "")
    && el.style.position === "fixed");

// Das themenführende Wurzel-Div — erkennbar am Bezugsrahmen-transform bzw. an
// der 100vh-Höhenrechnung.
const findRoot = (host) =>
  [...host.querySelectorAll("div")].find(el => (el.style.height || "").includes("100vh"));

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.ResizeObserver = globalThis.ResizeObserver;
  }
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  }
});

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("Überfällige-Vormerkungen-Warnbanner", () => {
  it("liegt fest oben und über JEDEM Vollbild-Dialog", async () => {
    seed(tx(ueberfaellig()));
    const banner = findBanner(await mountApp());

    expect(banner, "Warnbanner wird nicht gerendert").toBeTruthy();
    expect(banner.style.position).toBe("fixed");
    expect(banner.style.top).toBe("0px");
    expect(Number(banner.style.zIndex)).toBeGreaterThan(MAX_DIALOG_Z);
    // Feste Höhe statt gemessener: sonst springt der Inhalt beim ersten Bild.
    expect(banner.style.height).toBeTruthy();
    expect(banner.style.boxSizing).toBe("border-box");
  });

  it("hält seinen Platz per marginTop frei — NICHT per Polster", async () => {
    seed(tx(ueberfaellig()));
    const host = await mountApp();
    const rootDiv = findRoot(host);
    const banner = findBanner(host);
    expect(rootDiv, "Wurzel-Div nicht gefunden").toBeTruthy();

    // Hinweis: jsdom serialisiert CSS-VARIABLEN anders als normale
    // Eigenschaften — Variablenwerte daher nur auf Inhalt prüfen, exakte
    // Gleichheit nur zwischen gleichartigen Eigenschaften.
    const space = rootDiv.style.getPropertyValue("--overdue-space");
    expect(space).toContain("46px");
    expect(space).toContain("safe-area-inset-top");

    // Kern der Sache: marginTop verschiebt die Border-Box und damit den
    // Bezugsrahmen der Dialoge. paddingTop täte das NICHT — genau daran ist
    // der vorige Versuch gescheitert.
    expect(rootDiv.style.marginTop).toContain("46px");
    expect(rootDiv.style.paddingTop === "" || rootDiv.style.paddingTop === "0px").toBe(true);

    // Balken und freigehaltener Platz müssen exakt dieselbe Rechnung sein,
    // sonst klafft eine Lücke oder es überlappt. Beides normale
    // Eigenschaften → direkt vergleichbar.
    expect(banner.style.height).toBe(rootDiv.style.marginTop);

    // Unterkante bleibt am Bildschirmrand, damit die Reiterleiste sitzt.
    expect(rootDiv.style.height).toContain("100vh");
    expect(rootDiv.style.height).toContain("46px");

    // transform → Border-Box wird Bezugsrahmen aller fixed-Nachfahren.
    expect(rootDiv.style.transform).not.toBe("");

    // Notch-Abstand steckt im Balken, nicht mehr in den Dialogköpfen.
    expect(rootDiv.style.getPropertyValue("--safe-top")).toBe("0px");
  });

  it("ändert ohne überfällige Vormerkungen nichts am bisherigen Layout", async () => {
    seed(tx("2099-01-01"));
    const host = await mountApp();
    const rootDiv = findRoot(host);

    expect(findBanner(host)).toBeFalsy();
    expect(rootDiv.style.getPropertyValue("--overdue-space")).toBe("0px");
    expect(rootDiv.style.marginTop === "" || rootDiv.style.marginTop === "0px").toBe(true);
    // Kein transform → Vollbild-Dialoge verhalten sich exakt wie zuvor.
    expect(rootDiv.style.transform).toBe("");
    // Notch-Abstand wieder in den Dialogköpfen bzw. im Wurzel-Polster.
    expect(rootDiv.style.getPropertyValue("--safe-top")).toContain("safe-area-inset-top");
    expect(rootDiv.style.paddingTop).toContain("safe-area-inset-top");
  });
});
