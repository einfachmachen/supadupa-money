// Layout-Zusage des Überfällig-Warnbanners.
//
// Vorgeschichte (mehrfach falsch gelöst): Der Balken lag zunächst im normalen
// Fluss und war damit in JEDEM Vollbild-Dialog unsichtbar — sämtliche Dialoge
// ("Bank verbinden", Daten-Manager, CSV-Import, Aufriss …) sind selbst
// position:fixed; inset:0 mit z-Index bis 400 und liegen zwangsläufig darüber.
// Danach lag er fest oben, verdeckte aber Hero und Titelleisten, weil niemand
// seine Höhe freihielt.
//
// Die Lösung besteht aus drei Teilen, die nur ZUSAMMEN funktionieren — genau
// die prüft dieser Test:
//   1. Der Balken liegt position:fixed über allem (z-Index > 400).
//   2. Das Wurzel-Div hält seine gemessene Höhe als paddingTop frei
//      (--overdue-space), damit im Fluss nichts verdeckt wird.
//   3. Das Wurzel-Div trägt transform → seine Polster-Box wird zum
//      Bezugsrahmen aller position:fixed-Nachfahren, wodurch auch die
//      Vollbild-Dialoge unterhalb des Balkens beginnen.
// Fällt einer der drei Punkte weg, ist der Fehler wieder da.
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

const gestern = () => {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString().slice(0, 10);
};

async function mountApp() {
  const { installLegacyBridge } = await import("../src/state/persistence.js");
  installLegacyBridge();
  const App = (await import("../src/App.jsx")).default;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(App)); });
  // Der lokale Stand wird asynchron geladen (IDB → localStorage) — ein paar
  // Microtask-/Timer-Runden abwarten, bis applyData durch ist.
  for (let i = 0; i < 8; i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  }
  return { host, root };
}

// Der Balken ist das erste fixierte Element mit der Warn-Hintergrundfarbe.
const findBanner = (host) =>
  [...host.querySelectorAll("div")].find(el => /überfällige? Vormerkung/i.test(el.textContent || "")
    && el.style.position === "fixed");

// Das themenführende Wurzel-Div (trägt background + height:100vh).
const findRoot = (host) =>
  [...host.querySelectorAll("div")].find(el => el.style.height === "100vh");

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
    seed([{ id: "t1", date: gestern(), desc: "Miete", totalAmount: -800, pending: true,
            accountId: "acc-giro", splits: [{ id: "sp1", catId: "c1", subId: "s1", amount: -800 }] }]);
    const { host } = await mountApp();

    const banner = findBanner(host);
    expect(banner, "Warnbanner wird nicht gerendert").toBeTruthy();
    expect(banner.style.position).toBe("fixed");
    expect(banner.style.top).toBe("0px");
    // Über allen Vollbild-Dialogen — sonst ist er dort unsichtbar.
    expect(Number(banner.style.zIndex)).toBeGreaterThan(MAX_DIALOG_Z);
  });

  it("hält seine Höhe frei und macht die Wurzel zum Bezugsrahmen der Dialoge", async () => {
    seed([{ id: "t1", date: gestern(), desc: "Miete", totalAmount: -800, pending: true,
            accountId: "acc-giro", splits: [{ id: "sp1", catId: "c1", subId: "s1", amount: -800 }] }]);
    const { host } = await mountApp();

    const rootDiv = findRoot(host);
    expect(rootDiv, "Wurzel-Div nicht gefunden").toBeTruthy();

    // 2) Freigehaltene Höhe: paddingTop == --overdue-space (gemessene Balkenhöhe).
    const space = rootDiv.style.getPropertyValue("--overdue-space");
    expect(space).toBeTruthy();
    expect(rootDiv.style.paddingTop).toBe(space);

    // 3) transform → Polster-Box wird Bezugsrahmen für position:fixed-Nachfahren.
    //    Ohne das beginnen die Vollbild-Dialoge wieder am Viewport-Rand und
    //    überdecken den Balken.
    expect(rootDiv.style.transform).not.toBe("");

    // Der Notch-Abstand steckt dann im Balken, nicht mehr in den Dialogköpfen.
    expect(rootDiv.style.getPropertyValue("--safe-top")).toBe("0px");
  });

  it("ändert ohne überfällige Vormerkungen nichts am bisherigen Layout", async () => {
    seed([{ id: "t1", date: "2099-01-01", desc: "Miete", totalAmount: -800, pending: true,
            accountId: "acc-giro", splits: [{ id: "sp1", catId: "c1", subId: "s1", amount: -800 }] }]);
    const { host } = await mountApp();

    expect(findBanner(host)).toBeFalsy();
    const rootDiv = findRoot(host);
    expect(rootDiv.style.getPropertyValue("--overdue-space")).toBe("0px");
    // Kein transform → Vollbild-Dialoge verhalten sich exakt wie zuvor.
    expect(rootDiv.style.transform).toBe("");
    // Notch-Abstand wieder in den Dialogköpfen.
    expect(rootDiv.style.getPropertyValue("--safe-top")).toContain("safe-area-inset-top");
    expect(rootDiv.style.paddingTop).toContain("safe-area-inset-top");
  });
});
