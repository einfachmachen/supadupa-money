// Ein Satz statt einer Tabelle.
//
// Nutzer-Wunsch: „Irgendwie suche ich nach einer Möglichkeit, mir nicht
// ständig darum Gedanken machen zu müssen, sondern recht entspannt auf Nummer
// sicher zu gehen."
//
// Der Kern der Aussage ist die Unterscheidung zwischen zwei Engpässen, die in
// der Tabelle gleich aussehen:
//
//   * einer, den das Tagesgeld deckt — das ist eine Überweisung, keine Sorge;
//   * einer, den es nicht deckt — erst da muss wirklich etwas geändert werden.
//
// Genau diese Grenze prüft dieser Test, dazu den Vorlauf (wer am Freitag
// überweist, hat das Geld am Montag) und die Zusage, dass hier nichts
// gerechnet oder gebucht, sondern nur gelesen wird.

import { describe, it, expect } from "vitest";
import { absicherungsStatus, banktagDavor } from "../src/utils/absicherung.js";
import { isBankWorkday } from "../src/utils/date.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const warnung = (date, deficit) => ({ date, deficit, minPuffer: 100 });

describe("Absicherungs-Satz", () => {
  it("ohne Engpass: abgesichert bis zum Horizont", () => {
    const s = absicherungsStatus({ warnungen: [], tagesgeldFrei: 5000, horizontBis: "2027-03" });
    expect(s.art).toBe("sicher");
    expect(s.bis).toBe("2027-03");
    expect(s.weitere).toBe(0);
  });

  it("Engpass, den das Tagesgeld deckt: zurückholen", () => {
    const s = absicherungsStatus({ warnungen: [warnung("2027-04-12", 340)], tagesgeldFrei: 5000 });
    expect(s.art).toBe("rueckholen");
    expect(s.fehlt).toBe(340);
    expect(s.holenBis < "2027-04-12", "vorher, nicht am Tag selbst").toBe(true);
  });

  it("Engpass, den das Tagesgeld NICHT deckt: eng", () => {
    const s = absicherungsStatus({ warnungen: [warnung("2027-04-12", 340)], tagesgeldFrei: 120 });
    expect(s.art).toBe("eng");
    expect(s.luecke, "340 gebraucht, 120 da").toBe(220);
  });

  it("genau aufgehende Deckung zählt als gedeckt", () => {
    // Die Grenze selbst — sonst haengt die Aussage an einem Cent.
    expect(absicherungsStatus({ warnungen: [warnung("2027-04-12", 340)], tagesgeldFrei: 340 }).art)
      .toBe("rueckholen");
    expect(absicherungsStatus({ warnungen: [warnung("2027-04-12", 340)], tagesgeldFrei: 339 }).art)
      .toBe("eng");
  });

  it("ohne zugeordnetes Tagesgeldkonto bleibt es ein Engpass", () => {
    const s = absicherungsStatus({ warnungen: [warnung("2027-04-12", 340)], tagesgeldFrei: null });
    expect(s.art).toBe("eng");
    expect(s.frei).toBeNull();
  });

  it("es zählt der FRÜHESTE Engpass, die übrigen werden nur gezählt", () => {
    const s = absicherungsStatus({
      warnungen: [warnung("2027-04-12", 340), warnung("2027-06-03", 900)],
      tagesgeldFrei: 5000 });
    expect(s.tag).toBe("2027-04-12");
    expect(s.weitere).toBe(1);
  });

  it("der Rückhol-Tag ist ein Banktag und liegt weit genug davor", () => {
    // 2027-04-12 ist ein Montag: zwei Banktage davor ist Donnerstag, der 08.
    const iso = banktagDavor("2027-04-12", 2);
    const [y, m, d] = iso.split("-").map(Number);
    expect(isBankWorkday(new Date(y, m - 1, d)), `${iso} ist kein Banktag`).toBe(true);
    expect(iso).toBe("2027-04-08");
  });

  it("die Anzeige rechnet nichts nach, sie liest nur", () => {
    // Sonst haetten wir eine dritte Quelle fuer dieselbe Wahrheit — genau das
    // Problem, das uns bei Vorschau und Automatik schon eingeholt hat.
    const src = readFileSync(resolve(wurzel, "src/components/organisms/AbsicherungsSatz.jsx"), "utf8");
    expect(src, "die Warnungen kommen aus dem Context").toMatch(/liquidityWarnings/);
    expect(src, "keine eigene Engpass-Rechnung").not.toMatch(/computeKontoWarnungen/);
    expect(src, "es wird nichts geschrieben").not.toMatch(/setTxs/);
  });

  it("der Satz steht auf der Startseite", () => {
    const src = readFileSync(resolve(wurzel, "src/components/screens/DashboardScreenV2.jsx"), "utf8");
    expect(src).toMatch(/<AbsicherungsSatz\/>/);
  });
});
