// Die zu erwartenden Zinsen des Tagesgeldkontos.
//
// ── Das Modell ───────────────────────────────────────────────────────────
//
// Verzinst wird TAGGENAU: Jeder Tag trägt den Saldo dieses Tages bei, und die
// Summe wird zum Zinstermin (Quartalsende) gutgeschrieben. Genau so rechnet
// Dirks Bank ab, und genau deshalb gibt es die Mega-Sparrate nicht mehr — bei
// taggenauer Verzinsung bringt ein Betrag, der zwei Tage dort liegt, auch nur
// zwei Tage Zinsen.
//
// Dirks Formel dazu war richtig:
//
//     Tagesgeldsaldo · Zinssatz % · Tage / Jahresbasis
//
// Der ganze Trick der Rechnung steckt darin, sie NICHT für jeden einzelnen
// Tag anzusetzen: Der Saldo ändert sich nur an Tagen mit einer Buchung. Ein
// Quartal mit einer einzigen Sparrate besteht aus zwei Abschnitten, nicht aus
// 92. Diese Datei zerlegt den Zeitraum deshalb in Abschnitte konstanten
// Saldos und rechnet je Abschnitt einmal.
//
// ── Zinseszins ───────────────────────────────────────────────────────────
//
// Die gutgeschriebenen Zinsen bleiben auf dem Konto und verzinsen sich mit.
// Sie werden ab dem Tag NACH dem Termin zum Saldo gezählt — an dem Tag bucht
// die Bank sie auch (`gutschrift`). Für die Vorschau über mehrere Jahre ist das
// kein Detail: Bei 2 % und 20.000 € sind es nach fünf Jahren rund 100 €
// Unterschied.
//
// ── Jahresbasis ──────────────────────────────────────────────────────────
//
// 365 oder 360 — das ist keine Geschmacksfrage, sondern steht in den
// Bedingungen der Bank. Der Unterschied beträgt 1,4 % des Zinsbetrags. Beides
// ist verbreitet, deshalb ist es einstellbar und wird hier nicht geraten.

export const ZINS_BASIS_STANDARD = 365;

// „2,25" → 2.25. Deutsche Eingabe mit Komma, ein Punkt geht auch. Müll und
// Negatives ergeben null („kein Zinssatz gesetzt"), nicht 0 — das Feld soll
// leer bleiben dürfen, ohne 0,00 € Zinsen zu behaupten.
export function parseZinssatz(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(",", ".").replace(/[%\s]/g, "");
  if (!s) return null;
  const v = Number.parseFloat(s);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

const TAG_MS = 86400000;
const alsZeit = (iso) => {
  const [y, m, t] = String(iso).split("-").map(Number);
  if (!y || !m || !t) return null;
  return Date.UTC(y, m - 1, t);
};
const alsIso = (ms) => new Date(ms).toISOString().slice(0, 10);

// Ganze Tage zwischen zwei ISO-Daten (bis minus von).
export function tageZwischen(vonIso, bisIso) {
  const a = alsZeit(vonIso), b = alsZeit(bisIso);
  if (a === null || b === null) return null;
  return Math.round((b - a) / TAG_MS);
}

export function tagPlus(iso, n) {
  const a = alsZeit(iso);
  return a === null ? null : alsIso(a + n * TAG_MS);
}

// Zerlegt [vonIso .. bisIso] (beide Tage eingeschlossen) in Abschnitte, in
// denen der Saldo konstant ist.
//
// `startSaldo`   — der Saldo am Tag `vonIso`, nach allen Bewegungen dieses Tages.
// `bewegungen`   — [{date, betrag}], beliebige Reihenfolge, auch außerhalb des
//                  Zeitraums (die werden ignoriert; wer den Startsaldo liefert,
//                  hat sie schon eingerechnet).
//
// Eine Bewegung wirkt AB ihrem Tag: Wer am 15. 1.000 € einzahlt, hat am 15.
// abends 1.000 € mehr. Das ist die Valuta-Regel, nach der Banken rechnen.
export function saldoAbschnitte({ vonIso, bisIso, startSaldo = 0, bewegungen = [] }) {
  const von = alsZeit(vonIso), bis = alsZeit(bisIso);
  if (von === null || bis === null || bis < von) return [];

  // Bewegungen NACH dem Starttag und bis einschließlich Ende, je Tag gebündelt.
  const proTag = new Map();
  (bewegungen || []).forEach((b) => {
    const t = alsZeit(b && b.date);
    if (t === null || t <= von || t > bis) return;
    proTag.set(t, (proTag.get(t) || 0) + (Number(b.betrag) || 0));
  });

  const tage = [...proTag.keys()].sort((a, b) => a - b);
  const out = [];
  let saldo = startSaldo;
  let abschnittVon = von;
  tage.forEach((t) => {
    out.push({ von: alsIso(abschnittVon), bis: alsIso(t - TAG_MS),
      tage: Math.round((t - abschnittVon) / TAG_MS), saldo });
    saldo += proTag.get(t);
    abschnittVon = t;
  });
  out.push({ von: alsIso(abschnittVon), bis: alsIso(bis),
    tage: Math.round((bis - abschnittVon) / TAG_MS) + 1, saldo });
  return out.filter((a) => a.tage > 0);
}

// Zins über einen Zeitraum, aus den Abschnitten summiert. Gerundet wird ERST
// am Ende: Cent-Rundung je Abschnitt summierte sich sonst zu einem sichtbaren
// Fehler auf.
export function zinsAusAbschnitten(abschnitte, prozent, basis = ZINS_BASIS_STANDARD) {
  if (!(prozent > 0) || !(basis > 0)) return 0;
  const roh = (abschnitte || []).reduce((s, a) => {
    const saldo = Number(a.saldo) || 0;
    // Ein Konto im Minus bringt keine Habenzinsen. Sollzinsen sind eine andere
    // Frage und gehören nicht in eine Tagesgeld-Vorschau.
    if (saldo <= 0) return s;
    return s + saldo * (prozent / 100) * ((Number(a.tage) || 0) / basis);
  }, 0);
  return Math.round(roh * 100) / 100;
}

// Der ganze Plan: je Zinstermin ein Betrag.
//
// `termine`     — aufsteigend, jeweils der Tag, BIS zu dem gerechnet wird
//                 (Quartalsletzter). Gebucht wird einen Tag später.
// `abIso`       — erster Tag, der noch verzinst wird (Vortag = Stand `startSaldo`).
// `startSaldo`  — Saldo am Tag VOR `abIso`.
//
// Der erste Termin verzinst nur ab `abIso` — für die Tage davor ist die
// Vorschau nicht zuständig; die sind vorbei, und die Bank hat sie längst
// gerechnet. Das macht den ersten Betrag kleiner als einen vollen Quartalszins
// und ist genau richtig so: Er ist der Teil, der noch kommt.
export function zinsPlan({ termine = [], abIso, startSaldo = 0, bewegungen = [],
  prozent = 0, basis = ZINS_BASIS_STANDARD, mitZinseszins = true } = {}) {
  if (!(prozent > 0) || !abIso) return [];
  const out = [];
  let von = abIso;
  let saldoVersatz = 0;      // die bisher gutgeschriebenen Zinsen
  (termine || []).forEach((termin) => {
    if (!termin || termin < von) return;
    const abschnitte = saldoAbschnitte({
      vonIso: von, bisIso: termin,
      startSaldo: startSaldoAm(von, startSaldo, bewegungen) + saldoVersatz,
      bewegungen,
    });
    const zins = zinsAusAbschnitten(abschnitte, prozent, basis);
    const tage = abschnitte.reduce((s, a) => s + a.tage, 0);
    // `termin` ist der Tag, BIS zu dem gerechnet wird — `gutschrift` der Tag,
    // an dem das Geld auf dem Konto ist. Die Bank rechnet das Quartal zum
    // Quartalsletzten ab und bucht am Tag darauf (Nutzer-Wunsch: „für den Tag
    // nach der Zinsberechnung gutschreiben").
    //
    // Damit passt der Zinseszins genau: Die Gutschrift zählt ab dem ersten Tag
    // des NÄCHSTEN Zeitraums zum Saldo — und `saldoVersatz` wird unten auf
    // ebendiesen nächsten Zeitraum angewandt. Wäre sie auf den Termin selbst
    // datiert, verzinste sie sich einen Tag zu früh.
    out.push({ termin, gutschrift: tagPlus(termin, 1), zins, tage, abschnitte });
    if (mitZinseszins) saldoVersatz += zins;
    von = tagPlus(termin, 1);
  });
  return out;
}

// Saldo am Tag `iso`, aus Startsaldo und allen Bewegungen bis dahin.
function startSaldoAm(iso, startSaldo, bewegungen) {
  const ziel = alsZeit(iso);
  return (bewegungen || []).reduce((s, b) => {
    const t = alsZeit(b && b.date);
    return (t !== null && t <= ziel) ? s + (Number(b.betrag) || 0) : s;
  }, startSaldo);
}
