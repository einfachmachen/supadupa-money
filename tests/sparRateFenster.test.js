// WELCHE Sparrate fängt eine Schieflage ab?
//
// Bisher immer die des LAUFENDEN Monats: `computeSafeCurrentMonthAmount`
// kennt genau diesen einen Stellknopf und prüft damit den ganzen Horizont.
// Eine Schieflage im Januar senkte also schon im August die Sparrate — das
// Geld liegt dann fünf Monate zinslos auf Giro, und genau die Monate mit der
// Super-Sparrate verlieren ihren Vorsprung (Nutzer-Entscheidung: „Ich möchte
// so viel wie möglich sparen — besonders in den Monaten mit der
// Super-Sparrate").
//
// Die neue Aufteilung folgt aus der Sache: Geld, das eine Rate nicht abbucht,
// liegt ab IHREM Termin auf Giro — aber die nächste Rate kann dasselbe ab
// ihrem Termin. Also ist jede Rate für das Fenster von ihrem Termin bis zum
// nächsten Sparplan-Termin verantwortlich, für nichts davor und nichts danach.
//
// Der Fall, an dem sich alles entscheidet, ist der erste Test hier: Fällt der
// Saldo am 5. Januar unter den Puffer und geht die Januar-Rate erst am 28. ab,
// kann die Januar-Rate daran NICHTS ändern — zuständig ist die Dezember-Rate.
// Eine monatsweise Betrachtung („reduziere im Monat des Problems") liefe hier
// ins Leere, deshalb ist das Fenster taggenau.

import { describe, it, expect } from "vitest";
import { sparAbgaenge, minImFenster, computeSafeAmountForAbgang, sparRatenAbgleich }
  from "../src/utils/sparBerechnen.js";

// Der Anker gilt NUR fuer den Vormonat des Szenarios (Juli 2026). Fuer alle
// spaeteren Monate liefert `getKumulierterSaldo` bewusst `null`, damit die
// App den Saldo selbst fortschreibt (saldoEnde) — sonst startete jeder Monat
// wieder beim Anker, und ein Engpass im Januar waere gar nicht darstellbar.
// Aus demselben Grund KEIN `getProgEndeAccGlobal`: der wuerde die
// Fortschreibung ebenfalls kurzschliessen.
function buildCtx({ txs, anker }) {
  return {
    txs,
    cats: [],
    accounts: [{ id: "acc-giro", name: "Giro" }],
    getKumulierterSaldo: (y, m) => (y === 2026 && m === 6 ? anker : null),
    getCat: () => null,
    getBudgetForMonth: () => 0,
  };
}

const rate = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: -betrag, pending: true,
  _csvType: "expense", desc: "Sparen·Tagesgeld", _seriesId: "s1",
  splits: [{ id: id + "-s", catId: "", subId: "", amount: -betrag }],
});
const ausgabe = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: -betrag, pending: true,
  _csvType: "expense", splits: [],
});
const einnahme = (id, datum, betrag) => ({
  id, accountId: "acc-giro", date: datum, totalAmount: betrag, pending: true,
  _csvType: "income", splits: [],
});

describe("Sparraten: jede Rate haftet nur bis zur nächsten", () => {
  const today = new Date("2026-08-20");
  const puffer = 100;

  it("Engpass VOR dem Termin: die Rate DAVOR muss ran, nicht die des Monats", () => {
    // Anker 2000 zum Monatsende Juli. Im Januar fällt der Saldo am 5. tief;
    // die Januar-Rate geht erst am 28. ab und kann daran nichts ändern.
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-12", "2026-12-28", 500),
      rate("r-01", "2027-01-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
      // Rueckfluss VOR dem Januar-Termin. Ohne ihn waere nach dem 5.1. fuer
      // jede spaetere Rate ohnehin nichts mehr da, und der Fall zeigte nichts.
      einnahme("rueck", "2027-01-20", 1500),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });

    const raten = sparAbgaenge(txs, "2026-08-01");
    expect(raten.map((r) => r.id)).toEqual(["r-08", "r-12", "r-01"]);

    // Die Januar-Rate sieht in IHREM Fenster (ab 28.01.) den 5. Januar gar
    // nicht mehr — sie bleibt also unangetastet hoch.
    const jan = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-01"), bisIso: null, puffer, ctx, today,
    });
    expect(jan, "Januar-Rate darf nicht fuer den 5.1. bluten").toBeGreaterThan(0);

    // Die Dezember-Rate ist zuständig: ihr Fenster (28.12. – 28.01.) enthält
    // den 5. Januar.
    const dez = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-12"), bisIso: "2027-01-28", puffer, ctx, today,
    });
    expect(dez, "Dezember-Rate muss den 5.1. abfangen").toBeLessThan(500);
  });

  it("die Rate des laufenden Monats bleibt von einem fernen Engpass unberührt", () => {
    // Das ist der Kern der Entscheidung: Der Engpass liegt im Januar, die
    // August-Rate wird trotzdem nicht angefasst — ihr Fenster endet am
    // nächsten Sparplan-Termin.
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-09", "2026-09-28", 500),
      rate("r-12", "2026-12-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const aug = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-08"), bisIso: "2026-09-28", puffer, ctx, today,
    });
    expect(aug, "August-Rate darf wegen Januar nicht sinken").toBeGreaterThanOrEqual(500);
  });

  it("belegt den Unterschied: mit dem ALTEN Fenster (ganzer Horizont) sinkt sie", () => {
    // Ohne Fenstergrenze prüft dieselbe Rechnung bis ans Ende — und dann
    // trifft es die August-Rate. Genau das war das gemeldete Verhalten.
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-09", "2026-09-28", 500),
      rate("r-12", "2026-12-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const ohneFenster = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-08"), bisIso: null, puffer, ctx, today,
    });
    expect(ohneFenster).toBeLessThan(500);
  });

  it("minImFenster zählt nur Tage im Fenster", () => {
    const txs = [ausgabe("a", "2026-09-10", 5000), einnahme("b", "2026-09-20", 5000)];
    const ctx = buildCtx({ txs, anker: 2000 });
    // Fenster endet VOR der Delle → sie zählt nicht.
    const vorher = minImFenster("2026-08-28", "2026-09-10", "acc-giro", ctx, today, 12);
    expect(vorher).toBeGreaterThan(0);
    // Fenster über die Delle → sie zählt.
    const drueber = minImFenster("2026-08-28", "2026-09-21", "acc-giro", ctx, today, 12);
    expect(drueber).toBeLessThan(0);
  });

  it("mehrere Sparbuchungen in einem Monat: dieser Monat wird ausgelassen", () => {
    // Bei zwei Plänen im selben Monat ist nicht zu erkennen, welcher gemeint
    // ist — dieselbe Eindeutigkeits-Bedingung wie bisher.
    const txs = [
      rate("r-08a", "2026-08-10", 300),
      rate("r-08b", "2026-08-28", 200),
      rate("r-09", "2026-09-28", 500),
    ];
    expect(sparAbgaenge(txs, "2026-08-01").map((r) => r.id)).toEqual(["r-09"]);
  });

  it("Vorwaertsgang allein wuerde eine Schieflage ERZEUGEN — der Rueckwaertsgang repariert sie", () => {
    // Die Luecke der neuen Regel, und der Grund fuer den zweiten Durchgang:
    // Nimmt die August-Rate alles mit, was IHR Fenster hergibt, kann der
    // September danach unter den Puffer fallen. Steht dessen eigene Rate schon
    // bei 0, kann sie nichts mehr ausrichten — dann muss doch die August-Rate
    // nachgeben. So spaet wie moeglich, aber eben doch.
    //
    // Ohne diesen Durchgang waere die neue Regel in genau diesen Faellen
    // SCHLECHTER als die alte „immer der laufende Monat", und das war nicht
    // der Deal.
    const txs = [
      rate("r-08", "2026-08-28", 0),   // steht auf 0, darf hochgehen
      rate("r-09", "2026-09-28", 0),   // steht schon bei 0 — kann nichts mehr
      ausgabe("miete", "2026-10-02", 1800),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const aend = sparRatenAbgleich({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" });
    const nach = new Map(aend.map((a) => [a.abgang.id, a.neu]));
    const aug = nach.has("r-08") ? nach.get("r-08") : 0;
    const sep = nach.has("r-09") ? nach.get("r-09") : 0;

    // 2000 − aug − sep − 1800 muss >= 100 bleiben.
    expect(2000 - aug - sep - 1800, `aug=${aug} sep=${sep}`).toBeGreaterThanOrEqual(puffer);
    // Und der Vorwaertsgang allein haette die August-Rate hoeher gesetzt:
    // ihr eigenes Fenster (28.08.–28.09.) sieht die Miete vom 2.10. gar nicht.
    const nurVorwaerts = computeSafeAmountForAbgang({
      abgang: txs.find((t) => t.id === "r-08"), bisIso: "2026-09-28", puffer, ctx, today,
    });
    expect(nurVorwaerts, "Beleg: das eigene Fenster erlaubt mehr").toBeGreaterThan(aug);
  });

  it("sparRatenAbgleich liefert nur die Raten, die sich wirklich ändern", () => {
    const txs = [
      rate("r-08", "2026-08-28", 500),
      rate("r-12", "2026-12-28", 500),
      rate("r-01", "2027-01-28", 500),
      ausgabe("gross", "2027-01-05", 1400),
      einnahme("rueck", "2027-01-20", 1500),
    ];
    const ctx = buildCtx({ txs, anker: 2000 });
    const aend = sparRatenAbgleich({ txs, puffer, ctx, today, abDatumIso: "2026-08-01" });
    const betroffen = aend.map((a) => a.abgang.id);
    expect(betroffen, "die Dezember-Rate muss dabei sein").toContain("r-12");
    // Und die August-Rate darf NICHT gesenkt werden.
    const august = aend.find((a) => a.abgang.id === "r-08");
    if (august) expect(august.neu).toBeGreaterThanOrEqual(august.alt);
  });
});
