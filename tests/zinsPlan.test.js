// Die zu erwartenden Zinsen — taggenau gerechnet.
//
// Nutzer: „Dennoch wäre es schön, die zu erwartenden Zinsen mit zu berechnen
// und vorzumerken. Die Berechnung müsste doch effizient möglich sein. Wenn der
// Tagesgeldsaldo sich 20 Tage nicht geändert hat, errechnen sich die
// Zinsanteile: Tagesgeldsaldo * Zinssatz % * 20/360. Macht das so Sinn?"
//
// Ja — und der erste Test hier ist genau diese Formel. Der Rest der Datei
// hält die drei Stellen fest, an denen es darüber hinausgeht:
//
//   * Ein Zeitraum besteht aus MEHREREN Abschnitten (jede Buchung beginnt
//     einen neuen), und ihre Tage müssen zusammen den Zeitraum ergeben —
//     kein Tag doppelt, keiner verschluckt.
//   * Die Gutschrift verzinst sich mit.
//   * Die Jahresbasis ist einstellbar, weil sie in den Bedingungen der Bank
//     steht und nicht in unserem Code.

import { describe, it, expect } from "vitest";
import { saldoAbschnitte, zinsAusAbschnitten, zinsPlan, tageZwischen, tagPlus,
  parseZinssatz, ZINS_BASIS_STANDARD } from "../src/utils/zinsPlan.js";

describe("Dirks Formel", () => {
  it("20 Tage unveränderter Saldo, 2 % auf 360 Tage", () => {
    // 10.000 · 2 % · 20/360 = 11,11 €
    const abschnitte = [{ tage: 20, saldo: 10000 }];
    expect(zinsAusAbschnitten(abschnitte, 2, 360)).toBe(11.11);
  });

  it("dieselben 20 Tage auf 365er-Basis sind etwas weniger", () => {
    // 10.000 · 2 % · 20/365 = 10,96 €. Der Unterschied ist der Grund, warum
    // die Basis einstellbar ist und nicht geraten wird.
    expect(zinsAusAbschnitten([{ tage: 20, saldo: 10000 }], 2, 365)).toBe(10.96);
    expect(ZINS_BASIS_STANDARD).toBe(365);
  });

  it("ein Konto im Minus bringt keine Habenzinsen", () => {
    expect(zinsAusAbschnitten([{ tage: 20, saldo: -5000 }], 2, 365)).toBe(0);
  });

  it("gerundet wird erst am Schluss", () => {
    // Vier Abschnitte à 0,4 Cent sind zusammen 1,6 Cent — je Abschnitt
    // gerundet wären es 0.
    const kleine = Array.from({ length: 4 }, () => ({ tage: 1, saldo: 730 }));
    expect(zinsAusAbschnitten(kleine, 2, 365)).toBe(0.16);
  });
});

describe("Abschnitte konstanten Saldos", () => {
  it("ohne Buchung ist der ganze Zeitraum EIN Abschnitt", () => {
    const a = saldoAbschnitte({ vonIso: "2026-07-01", bisIso: "2026-09-30", startSaldo: 5000 });
    expect(a).toHaveLength(1);
    expect(a[0].saldo).toBe(5000);
    expect(a[0].tage, "1. Juli bis 30. September einschließlich").toBe(92);
  });

  it("jede Buchung beginnt einen neuen Abschnitt — ab ihrem Tag", () => {
    const a = saldoAbschnitte({
      vonIso: "2026-07-01", bisIso: "2026-07-31", startSaldo: 1000,
      bewegungen: [{ date: "2026-07-21", betrag: 500 }],
    });
    expect(a).toHaveLength(2);
    // 1.–20. Juli mit 1.000 €, dann ab dem 21. mit 1.500 €.
    expect(a[0]).toMatchObject({ von: "2026-07-01", bis: "2026-07-20", tage: 20, saldo: 1000 });
    expect(a[1]).toMatchObject({ von: "2026-07-21", bis: "2026-07-31", tage: 11, saldo: 1500 });
  });

  it("die Abschnitte decken den Zeitraum lückenlos ab", () => {
    // Der Test, der Rundungs- und Off-by-one-Fehler fängt: Ein verschluckter
    // oder doppelt gezählter Tag fällt in der Zinssumme sonst nicht auf.
    const a = saldoAbschnitte({
      vonIso: "2026-01-01", bisIso: "2026-03-31", startSaldo: 100,
      bewegungen: [{ date: "2026-01-31", betrag: 10 }, { date: "2026-02-28", betrag: 10 },
                   { date: "2026-03-31", betrag: 10 }],
    });
    const summe = a.reduce((s, x) => s + x.tage, 0);
    expect(summe).toBe(tageZwischen("2026-01-01", "2026-03-31") + 1);
    expect(summe).toBe(90);
  });

  it("mehrere Buchungen an EINEM Tag ergeben einen Abschnitt", () => {
    const a = saldoAbschnitte({
      vonIso: "2026-07-01", bisIso: "2026-07-31", startSaldo: 0,
      bewegungen: [{ date: "2026-07-15", betrag: 100 }, { date: "2026-07-15", betrag: 200 }],
    });
    expect(a).toHaveLength(2);
    expect(a[1].saldo).toBe(300);
  });

  it("Buchungen außerhalb des Zeitraums bleiben außen vor", () => {
    const a = saldoAbschnitte({
      vonIso: "2026-07-01", bisIso: "2026-07-31", startSaldo: 1000,
      bewegungen: [{ date: "2026-06-15", betrag: 999 }, { date: "2026-08-15", betrag: 999 }],
    });
    expect(a).toHaveLength(1);
    expect(a[0].saldo, "der Startsaldo bringt die Vergangenheit schon mit").toBe(1000);
  });
});

describe("Zinsplan über mehrere Termine", () => {
  const termine = ["2026-09-30", "2026-12-31", "2027-03-31"];

  it("je Termin ein Betrag, jeder für seinen eigenen Zeitraum", () => {
    const plan = zinsPlan({
      termine, abIso: "2026-07-01", startSaldo: 10000, prozent: 2, basis: 365,
      mitZinseszins: false,
    });
    expect(plan.map((p) => p.termin)).toEqual(termine);
    // Q3 (1.7.–30.9.) sind 92 Tage: 10.000 · 2 % · 92/365 = 50,41 €
    expect(plan[0]).toMatchObject({ tage: 92, zins: 50.41 });
    // Q4 (1.10.–31.12.) sind 92 Tage.
    expect(plan[1].tage).toBe(92);
    // Q1 (1.1.–31.3.2027) sind 90 Tage.
    expect(plan[2].tage).toBe(90);
  });

  it("die Sparraten dazwischen erhöhen den Zins", () => {
    const ohne = zinsPlan({ termine: ["2026-09-30"], abIso: "2026-07-01",
      startSaldo: 10000, prozent: 2, basis: 365 });
    const mit = zinsPlan({ termine: ["2026-09-30"], abIso: "2026-07-01",
      startSaldo: 10000, prozent: 2, basis: 365,
      bewegungen: [{ date: "2026-07-31", betrag: 1000 }] });
    expect(mit[0].zins).toBeGreaterThan(ohne[0].zins);
    // 1.000 € liegen vom 31.7. bis 30.9., also 62 Tage: +3,40 €
    expect(mit[0].zins - ohne[0].zins).toBeCloseTo(1000 * 0.02 * 62 / 365, 2);
  });

  it("die Gutschrift verzinst sich mit", () => {
    const mit = zinsPlan({ termine, abIso: "2026-07-01", startSaldo: 10000,
      prozent: 2, basis: 365, mitZinseszins: true });
    const ohne = zinsPlan({ termine, abIso: "2026-07-01", startSaldo: 10000,
      prozent: 2, basis: 365, mitZinseszins: false });
    expect(mit[0].zins, "der erste Termin kann noch nichts wissen").toBe(ohne[0].zins);
    expect(mit[1].zins, "danach zählt die Gutschrift mit").toBeGreaterThan(ohne[1].zins);
    expect(mit[2].zins).toBeGreaterThan(ohne[2].zins);
  });

  it("ein Termin verzinst ab dem Tag NACH dem vorigen — kein Tag doppelt", () => {
    const plan = zinsPlan({ termine: ["2026-09-30", "2026-12-31"], abIso: "2026-07-01",
      startSaldo: 10000, prozent: 2, basis: 365 });
    expect(plan[0].abschnitte[0].von).toBe("2026-07-01");
    expect(plan[1].abschnitte[0].von).toBe("2026-10-01");
    expect(tagPlus("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("ohne Zinssatz gibt es keinen Plan", () => {
    expect(zinsPlan({ termine, abIso: "2026-07-01", startSaldo: 10000, prozent: 0 }))
      .toEqual([]);
    expect(parseZinssatz("")).toBeNull();
    expect(parseZinssatz("2,25")).toBe(2.25);
  });

  it("Termine in der Vergangenheit werden übersprungen", () => {
    // Die sind vorbei und von der Bank längst gerechnet; die Vorschau ist nur
    // für das zuständig, was noch kommt.
    const plan = zinsPlan({ termine: ["2026-03-31", "2026-09-30"], abIso: "2026-07-01",
      startSaldo: 10000, prozent: 2, basis: 365 });
    expect(plan.map((p) => p.termin)).toEqual(["2026-09-30"]);
  });
});

// ── Berechnet zum Quartalsletzten, gebucht am Tag darauf ──────────────────
//
// Nutzer: „Kannst Du die Zinsen dann bitte für den Tag nach der
// Zinsberechnung auf dem Tagesgeldkonto gutschreiben? Das erhöht ja auch
// etwas den Tagesgeldsaldo."
//
// Genau so macht es die Bank: Der 30.09. ist der Tag, BIS zu dem gerechnet
// wird, der 01.10. der Tag, an dem das Geld da ist. Für den Zinseszins ist der
// Unterschied nicht kosmetisch — die Gutschrift verzinst sich ab dem ersten
// Tag des nächsten Quartals, nicht schon am letzten Tag des alten.
describe("Gutschrift am Tag nach dem Termin", () => {
  it("jeder Termin nennt seinen Buchungstag", () => {
    const plan = zinsPlan({ termine: ["2026-09-30", "2026-12-31"], abIso: "2026-07-01",
      startSaldo: 10000, prozent: 2, basis: 365 });
    expect(plan[0].gutschrift).toBe("2026-10-01");
    expect(plan[1].gutschrift).toBe("2027-01-01");
  });

  it("der Buchungstag ist zugleich der erste Tag des nächsten Zeitraums", () => {
    // Sonst zählte ein Tag doppelt oder fiele heraus — und der Zinseszins
    // liefe um einen Tag daneben.
    const plan = zinsPlan({ termine: ["2026-09-30", "2026-12-31"], abIso: "2026-07-01",
      startSaldo: 10000, prozent: 2, basis: 365 });
    expect(plan[1].abschnitte[0].von).toBe(plan[0].gutschrift);
  });
});
