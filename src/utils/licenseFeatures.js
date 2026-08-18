// Stufenmodell: welche Fähigkeit in welcher Stufe steckt.
//
// Zwei Achsen, bewusst getrennt (siehe worker/license-worker.js):
//   products — für WELCHE SupaDupa-App der Code gilt (["money"] …)
//   tier     — WELCHE Stufe innerhalb der App
//
// Was hier NICHT hingehört: das Abrechnungsmodell. „Lifetime" ist keine
// Stufe, sondern dieselbe Stufe ohne Ablauf — im Lizenzeintrag ein weit in
// der Zukunft liegendes `expiresAt`, sonst nichts. Es braucht dafür weder
// hier noch im Worker eine Zeile Code; deshalb kann es jederzeit als Aktion
// angeboten werden, ohne dass vorher etwas gebaut werden müsste.
//
// Gates fragen nach der FÄHIGKEIT, nie nach dem Stufennamen:
//     hasFeature(lizenz, "bank_connect")     ✓
//     lizenz.tier === "pro"                  ✗
// Sonst muss beim Einführen einer weiteren Stufe jede einzelne Abfrage
// gesucht und um `|| tier === "promax"` ergänzt werden — genau die Streuung,
// die sich später nicht mehr einfangen lässt. Eine neue Stufe ist hier eine
// Zeile, und sonst nirgends.

// Reihenfolge der Leiter, von frei nach teuer. Explizit als Liste, damit die
// Antwort von `wunschStufe` nicht an der Schlüsselreihenfolge eines
// Objektliterals hängt.
//
// ZUM START werden nur `free` und `premium` verkauft. `pro` und `promax`
// stehen hier als reservierte Namen: der Lizenzserver nimmt ohnehin jede
// Zeichenkette als `tier` entgegen, und so ist dokumentiert, wohin die Leiter
// wachsen soll. Solange sie nichts Eigenes tragen, sind sie deckungsgleich
// mit `premium` — eine Stufe, die dasselbe kann wie die darunter, darf man
// nicht verkaufen, aber sie schadet auch nicht.
const TIER_ORDER = ["free", "premium", "pro", "promax"];

// Wie eine Fähigkeit durchgesetzt wird — der Unterschied ist wichtig genug,
// um ihn an der Fähigkeit selbst zu vermerken:
//   "server" — ein eigener Worker prüft und kann wirklich „nein" sagen.
//   "weich"  — nur die Oberfläche fragt. Ehrlichen Nutzern ein Wegweiser,
//              kein Schutz; im Browser in Sekunden ausgehebelt.
// Damit hängt niemand später versehentlich etwas Schützenswertes hinter ein
// weiches Tor, „weil es ja auch ein Gate ist".
const FEATURES = {
  bank_connect: { label: "Bankabruf", schutz: "server" },
  // Bewusst weich: jeder hostet seinen eigenen Daten-Worker, es gibt nichts
  // von uns zu schützen. Siehe TODO.md, Phase 3.
  cloud_sync: { label: "Cloud-Sync", schutz: "weich" },
};

// Stufe → Fähigkeiten. Jede Stufe enthält alles der darunterliegenden.
//
// `premium` trägt zum Start ALLES Kostenpflichtige. Vorher lag der Bankabruf
// auf `pro` — bei einem Start mit „frei und Premium" hätten die ersten
// zahlenden Nutzer genau die Funktion nicht bekommen, für die sie zahlen.
// `pro`/`promax` sind reserviert (siehe TIER_ORDER) und heute deshalb
// deckungsgleich; sie bekommen ihre eigenen Einträge, sobald es eine Funktion
// gibt, die sie rechtfertigt.
const TIER_FEATURES = {
  free: [],
  premium: ["cloud_sync", "bank_connect"],
  pro: ["cloud_sync", "bank_connect"],
  promax: ["cloud_sync", "bank_connect"],
};

// Niedrigste Stufe, die eine Fähigkeit mitbringt — für Hinweise wie
// „ab Pro verfügbar". `null`, wenn keine Stufe sie kennt.
function wunschStufe(feature) {
  for (const tier of TIER_ORDER) {
    if ((TIER_FEATURES[tier] || []).includes(feature)) return tier;
  }
  return null;
}

function tierHasFeature(tier, feature) {
  return (TIER_FEATURES[tier] || []).includes(feature);
}

// `licenseData` ist die Nutzlast des Tokens ({ email, tier, products, … })
// oder `null`, wenn keine Lizenz hinterlegt ist.
function hasFeature(licenseData, feature) {
  if (!licenseData || !licenseData.tier) return false;
  return tierHasFeature(licenseData.tier, feature);
}

// Anzeigename einer Stufe für die Oberfläche.
const TIER_LABEL = {
  free: "Frei",
  premium: "Premium",
  pro: "Pro",
  promax: "Pro Max",
};

export {
  TIER_ORDER, TIER_FEATURES, TIER_LABEL, FEATURES,
  wunschStufe, tierHasFeature, hasFeature,
};
