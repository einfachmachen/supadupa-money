import { describe, it, expect } from "vitest";
import { parseCSV } from "../src/utils/csv.js";

// Regression: Bei der Finanzblick-PayPal-Gruppierung nach Rechnungs-Nr darf der
// Schlüssel NICHT am Bindestrich abgeschnitten werden. Sonst kollabieren
// verschiedene Rechnungen desselben Händlers (COMTRADA: OLNUE1-…) auf denselben
// Schlüssel „OLNUE1" und landen in EINER Gruppe → echte Ausgaben verschwinden.
const HEADER = "Buchungsdatum;Wertstellungsdatum;Empfaenger;Verwendungszweck;Buchungstext;Betrag;IBAN;BIC;Kategorie;Konto;Umbuchung;Notiz;Schlagworte;SteuerKategorie;ParentKategorie;AbweichenderEmpfaenger;Splitbuchung;Auswertungsdatum";
const row = (date, empf, vz, betrag) =>
  `${date};${date};${empf};${vz};Successful;${betrag};IBAN1;BIC1;Kino;PayPal (test@example.com);;;;;Freizeit;;false;${date}`;

describe("Finanzblick-PayPal Gruppierung nach Rechnungs-Nr", () => {
  it("trennt verschiedene Rechnungen mit gleichem Präfix (OLNUE1-…)", () => {
    const csv = [
      HEADER,
      row("01.06.2026", "COMTRADA GmbH paypal@comtrada.de", "Rechnungs-Nr: OLNUE1-10000001", "-5,99"),
      row("01.06.2026", "", "Rechnungs-Nr: OLNUE1-10000001", "5,99"),
      row("08.06.2026", "COMTRADA GmbH paypal@comtrada.de", "Rechnungs-Nr: OLNUE1-10000002", "-5,99"),
      row("08.06.2026", "", "Rechnungs-Nr: OLNUE1-10000002", "5,99"),
    ].join("\n");
    const { rows } = parseCSV(csv, { noGroup: false });
    // Zwei eigenständige Käufe müssen erhalten bleiben (nicht zu einem kollabieren).
    const expenses = rows.filter(r => Math.round(r.amount * 100) === -599);
    expect(expenses).toHaveLength(2);
  });
});
