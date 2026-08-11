// Startkonto: welches Konto der Hero nach dem App-Start zeigt, und wie es die
// Reihenfolge der Konto-Schnellwahl bestimmt.
//
// Die Reihenfolge-Logik steckt inline in SaldoHeroV2 (allAccIds). Hier ist sie
// als reine Funktion nachgebaut und getestet — der Punkt ist, die drei Faelle
// festzunageln, die beim Aendern leicht kaputtgehen: Startkonto nach oben,
// keine Dublette, und ein geloeschtes Startkonto darf die Liste nicht
// verbiegen.

import { describe, it, expect } from "vitest";

// Identisch zu SaldoHeroV2: [null = Gesamt, ...bebuchte Konten], danach das
// Startkonto nach vorn gezogen.
function reihenfolge(kontoIds, startKonto) {
  const rest = [null, ...kontoIds];
  if (!startKonto || !kontoIds.includes(startKonto)) return rest;
  return [startKonto, ...rest.filter(id => id !== startKonto)];
}

const KONTEN = ["acc-giro", "acc-tagesgeld", "acc-depot"];

describe("Startkonto — Reihenfolge der Konto-Schnellwahl", () => {
  it("ohne Startkonto steht Gesamt vorn (bisheriges Verhalten)", () => {
    expect(reihenfolge(KONTEN, "")).toEqual([null, ...KONTEN]);
  });

  it("mit Startkonto steht dieses vorn, Gesamt rutscht dahinter", () => {
    expect(reihenfolge(KONTEN, "acc-giro"))
      .toEqual(["acc-giro", null, "acc-tagesgeld", "acc-depot"]);
  });

  it("das Startkonto taucht nur EINMAL auf", () => {
    const liste = reihenfolge(KONTEN, "acc-tagesgeld");
    expect(liste.filter(id => id === "acc-tagesgeld")).toHaveLength(1);
    expect(liste).toHaveLength(KONTEN.length + 1);
  });

  it("ein nicht (mehr) vorhandenes Startkonto laesst die Liste unveraendert", () => {
    expect(reihenfolge(KONTEN, "acc-geloescht")).toEqual([null, ...KONTEN]);
  });

  it("enthaelt immer alle Konten plus Gesamt", () => {
    for (const start of ["", "acc-giro", "acc-depot", "acc-weg"]) {
      const liste = reihenfolge(KONTEN, start);
      expect(new Set(liste)).toEqual(new Set([null, ...KONTEN]));
    }
  });
});

describe("Startkonto — Anfangswert von selAcc", () => {
  // App.jsx: useState(() => kvStore.getItem("mbt_start_konto") || null)
  const anfang = gespeichert => gespeichert || null;

  it("ohne Eintrag startet die App auf Gesamt", () => {
    expect(anfang("")).toBe(null);
    expect(anfang(null)).toBe(null);
    expect(anfang(undefined)).toBe(null);
  });

  it("mit Eintrag startet die App auf diesem Konto", () => {
    expect(anfang("acc-giro")).toBe("acc-giro");
  });
});
