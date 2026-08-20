// Ein Satz statt einer Tabelle.
//
// Nutzer-Wunsch: „Irgendwie suche ich nach einer Möglichkeit, mir nicht
// ständig darum Gedanken machen zu müssen, sondern recht entspannt auf Nummer
// sicher zu gehen."
//
// Die Sparplan-Tabelle beantwortet die Frage — aber sie beantwortet sie in
// zwölf Zeilen mit vier Spalten, und man muss sie lesen wollen. Gesucht ist
// eine Aussage, die man im Vorbeigehen erfasst:
//
//     „Abgesichert bis Mär 27 — nichts zu tun."
//     „Am 12.04. fehlen 340 € — bis 09.04. vom Tagesgeld zurückholen."
//     „Am 12.04. fehlen 340 €, verfügbar sind nur 120 €."
//
// Der Unterschied zwischen den letzten beiden ist der ganze Punkt: Ein
// Engpass, den das Tagesgeld deckt, ist eine Überweisung — keine Sorge. Nur
// wenn das Tagesgeld ihn NICHT deckt, muss man wirklich etwas ändern.
//
// Diese Datei rechnet nichts nach: Sie liest die ohnehin vorhandenen
// Liquiditäts-Warnungen (`computeKontoWarnungen`, in App.jsx als
// `liquidityWarnings`) und den freien Tagesgeld-Bestand und macht daraus eine
// Aussage. Reine Auskunft — es wird nichts gebucht und nichts geändert.

import { isoAddDays, isBankWorkday } from "./date.js";

// Der letzte Banktag, der `vorlauf` Banktage VOR `isoDate` liegt.
// Wochenenden und Feiertage zählen nicht mit — wer am Freitag überweist,
// hat das Geld am Montag, nicht am Samstag.
export function banktagDavor(isoDate, vorlauf = 2) {
  let iso = String(isoDate);
  let offen = Math.max(1, vorlauf);
  // Höchstens drei Wochen zurück; danach stimmt etwas anderes nicht.
  for (let i = 0; i < 21 && offen > 0; i++) {
    iso = isoAddDays(iso, -1);
    const [y, m, d] = iso.split("-").map(Number);
    if (isBankWorkday(new Date(y, m - 1, d))) offen--;
  }
  return iso;
}

// `warnungen`      — das Ergebnis von computeKontoWarnungen, früheste zuerst.
// `tagesgeldFrei`  — was heute auf dem Tagesgeld liegt, abzüglich Notgroschen.
//                    `null` heißt „kein Tagesgeldkonto zugeordnet".
// `horizontBis`    — bis wann überhaupt gerechnet wurde ("YYYY-MM").
export function absicherungsStatus({ warnungen = [], tagesgeldFrei = null,
  horizontBis = null, vorlauf = 2 } = {}) {
  const liste = Array.isArray(warnungen) ? warnungen : [];
  const w = liste[0];
  if (!w) return { art: "sicher", bis: horizontBis, weitere: 0 };

  const fehlt = Math.max(0, Math.round(w.deficit || 0));
  const frei = tagesgeldFrei === null ? null : Math.max(0, Math.round(tagesgeldFrei));
  const gemeinsam = { tag: w.date, fehlt, frei, weitere: Math.max(0, liste.length - 1) };

  // Kein Tagesgeldkonto zugeordnet: dann lässt sich über das Zurückholen
  // nichts sagen, und der Engpass bleibt ein Engpass.
  if (frei === null) return { art: "eng", ...gemeinsam, luecke: fehlt };
  if (frei >= fehlt) return { art: "rueckholen", ...gemeinsam, holenBis: banktagDavor(w.date, vorlauf) };
  return { art: "eng", ...gemeinsam, luecke: fehlt - frei };
}
