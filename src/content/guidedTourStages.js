// Inhalt + Wiring der interaktiven Feature-Tour, organisiert in drei
// "Zündstufen" (von einfach zu anspruchsvoll, jederzeit frei anwählbar):
//   1. Schnellstart — alles, um sofort loszulegen (Konten, Kategorien,
//      Budgets, CSV-Import, Vormerkungen, Warnungen)
//   2. Komfort — Sparen/Tagesgeld, Personalisierung
//   3. Cloud & Bank — optionale Einrichtungsassistenten, nur verwiesen
//
// Jeder Schritt: icon, title, target { tab, selector, reveal } sowie vier
// Textfelder eli10 ("Für Kids", eigener Modus in GuidedFeatureTour.jsx) und
// eli20/30/60, die im Normalmodus AUFEINANDER AUFBAUEN — eli20 ist die
// Grundaussage, eli30 ("mehr …") und eli60 ("noch mehr …") ergänzen jeweils
// NEUE, tiefer gehende Details statt denselben Inhalt nur anders zu
// formulieren. selector:null = keine Hervorhebung (konzeptionelle
// Erklärung, zentrierte Karte). reveal = optionaler Selektor, der VOR der
// Suche nach dem eigentlichen Ziel einmal angeklickt wird, um es sichtbar
// zu machen (z.B. "Details anzeigen" ausklappen).
const GUIDED_TOUR_STAGES = [
  {
    key: "schnellstart",
    label: "1. Schnellstart",
    steps: [
      {
        icon: "wallet",
        emoji: "🐷",
        title: "Kontostand & Prognose",
        eli10: "Oben siehst du dein Sparschwein-Guthaben — und die App verrät dir schon heute, wie voll es Mitte und Ende des Monats sein wird. Kein Rechnen nötig!",
        eli20: "Der große Betrag oben ist dein aktueller Kontostand. MITTE und ENDE zeigen dir, wo du am 14. und am Monatsende ungefähr stehst — inklusive geplanter Zahlungen, die noch kommen.",
        eli30: "Die Prognose aktualisiert sich sofort, sobald du eine Vormerkung anlegst oder änderst — Du musst nicht warten, bis die echte Buchung bei der Bank eintrifft.",
        eli60: "Über „Details anzeigen“ siehst Du, wie sich MITTE und ENDE zusammensetzen (echte Buchungen, Vormerkungen, unkategorisiert) — tippe auf einen der Werte, um direkt zu den passenden Buchungen zu springen.",
        target: { tab: "home", selector: '[data-tour="hero-balance"]' },
      },
      {
        icon: "credit-card",
        emoji: "💳",
        title: "Konten einrichten",
        eli10: "Zuerst richtest du deine Konten ein — z.B. dein Girokonto, wo dein Taschengeld ankommt. Tippe hier, um eins anzulegen oder zu bearbeiten.",
        eli20: "Erster Schritt: Konten anlegen (Girokonto, ggf. Tagesgeld/Sparkonto). Reihenfolge und ein Mindestpuffer je Konto lassen sich hier auch einstellen.",
        eli30: "Jedes Konto hat seinen eigenen Mindestpuffer — die Warnung bei Unterschreitung bezieht sich also gezielt auf das jeweilige Konto, nicht auf die Summe aller Konten zusammen.",
        eli60: "Die Reihenfolge der Konten legt fest, in welcher Reihenfolge sie in Kontowahl-Menüs erscheinen — praktisch, um das Hauptkonto immer zuerst zu sehen.",
        target: { tab: "daten", selector: '[data-tour="row-konten"]' },
      },
      {
        icon: "layers",
        emoji: "🎯",
        title: "Kategorien & Budgets",
        eli10: "Jede Ausgabe bekommt eine Kategorie und ein Symbol — so siehst du auf einen Blick, wofür dein Geld drauf geht. Du kannst auch ein Limit setzen, z.B. „höchstens 20€ für Süßigkeiten“.",
        eli20: "Hier legst du Kategorien an/passt sie an und setzt optional Budgets je Kategorie — ein Limit pro Monat, bei dessen Überschreitung die App dich warnt.",
        eli30: "Kategorien lassen sich in Unterkategorien gliedern, damit z.B. „Essen“ zwischen Supermarkt und Restaurant unterscheidet — jede Unterkategorie kann ihr eigenes Budget bekommen.",
        eli60: "Neue Buchungen landen automatisch in der richtigen Kategorie, sobald du einmal eine Regel dafür eingerichtet hast — von Hand kategorisieren musst du danach nur noch Ausnahmen.",
        target: { tab: "daten", selector: '[data-tour="row-budget"]' },
      },
      {
        icon: "download",
        emoji: "📥",
        title: "Buchungen importieren",
        eli10: "Statt jede Buchung einzeln einzutippen, kannst du eine Datei aus deiner Banking-App importieren — die App sortiert vieles automatisch in die richtigen Kategorien ein.",
        eli20: "Der CSV-Import holt deine Buchungen aus dem Online-Banking auf einmal rein und schlägt automatisch Kategorien vor. Vorgemerkte Zahlungen erkennt er dabei auch automatisch wieder.",
        eli30: "Unsichere Dubletten („evtl. Dublette“) verwirft die App nicht einfach, sondern zeigt sie Dir zur Prüfung an — mit der Möglichkeit, sie trotzdem als neue Buchung zu übernehmen.",
        eli60: "Der Import versteht die CSV-Formate vieler Banken automatisch und erkennt PayPal-Gegenbuchungen, damit dieselbe Zahlung nicht doppelt auftaucht.",
        target: { tab: "daten", selector: '[data-tour="row-csv"]' },
      },
      {
        icon: "clock",
        emoji: "⏰",
        title: "Vormerkungen anlegen",
        eli10: "Papa oder Mama zahlt jeden Monat pünktlich die Miete, damit wir hier wohnen bleiben dürfen — dafür tragen sie hier eine „wiederkehrende Vormerkung“ ein, damit die App das nie vergisst. Kaufst du dir jedes Mal, wenn du Taschengeld bekommst, ein neues Comic-Heft oder Sticker? Genau sowas könntest du hier auch eintragen — dann siehst du immer, wie viel Taschengeld dir noch übrig bleibt.",
        eli20: "Der große Kreis unten zeigt normalerweise das heutige Datum — durch Doppel-Tippen verwandelt er sich in den großen Plus-Knopf. Darüber legst du Vormerkungen an: einmalige, wiederkehrende (z.B. Miete jeden Monat) oder Finanzierungen (z.B. Raten mit fester Laufzeit) — sie fließen sofort in die Prognose ein.",
        eli30: "Eine Vormerkung lässt sich auf mehrere Kategorien gleichzeitig aufteilen (Splits) — praktisch, wenn eine Zahlung z.B. Miete und Nebenkosten in einer Summe abdeckt.",
        eli60: "Ist das Datum einer Vormerkung verstrichen, ohne dass die echte Buchung eingetroffen ist, markiert die App sie als überfällig und weist Dich mit einem Banner darauf hin.",
        target: { tab: "home", selector: '[data-tour="master-plus"]' },
      },
      {
        icon: "link",
        emoji: "🧩",
        title: "Vormerkung ↔ Buchung zuordnen",
        eli10: "Wenn die echte Zahlung dann passiert, verknüpft die App das oft automatisch. Klappt es nicht von allein, schlägt dir der Bearbeiten-Dialog einer Vormerkung passende Buchungen direkt zum Antippen vor.",
        eli20: "Öffnest du eine Vormerkung zum Bearbeiten, schlägt dir die App dort passende Buchungen zum Verknüpfen vor (nach Betrag/Datum sortiert) — ein Tipp genügt zum Zuordnen.",
        eli30: "Automatisch verknüpft wird nur bei eindeutigen Treffern — exakter Betrag, gleiches Konto, enges Zeitfenster und kein zweiter passender Kandidat.",
        eli60: "Weicht der Betrag der echten Buchung leicht von der Vormerkung ab, zeigt Dir die App das als Hinweis an, statt es stillschweigend zu verknüpfen oder zu ignorieren.",
        target: { tab: "home", selector: null },
      },
      {
        icon: "shield-check",
        emoji: "🚨",
        title: "Warnungen",
        eli10: "Falls dein Konto mal knapp wird, sagt dir die App rechtzeitig Bescheid — mit einer Warnung, bevor es wirklich passiert.",
        eli20: "Unter „Details anzeigen“ findest du eine Warnungen-Kachel: Sie meldet sich, wenn dein Kontostand unter den eingestellten Mindestpuffer zu fallen droht — inklusive Folgemonate.",
        eli30: "Die Warnung berücksichtigt dabei nicht nur den heutigen Stand, sondern die komplette Prognose — ein Engpass wird sichtbar, sobald er absehbar ist, nicht erst am Tag X.",
        eli60: "Zusätzlich zur Kachel unter „Details anzeigen“ erscheint bei einem drohenden Engpass ein Banner ganz oben in der App, das in jeder Ansicht sichtbar bleibt.",
        target: { tab: "home", selector: '[data-tour="panel-warnings"]', reveal: '[title="Details anzeigen"]' },
      },
    ],
  },
  {
    key: "komfort",
    label: "2. Komfort",
    steps: [
      {
        icon: "piggy-bank",
        emoji: "💰",
        title: "Sparen & Tagesgeld",
        eli10: "Für Sparziele gibt's ein eigenes Sparschwein-Symbol — hier kannst du festlegen, dass automatisch etwas Geld vom Girokonto ins Sparkonto wandert.",
        eli20: "Unter „Details anzeigen“ versteckt sich das Sparschwein-Symbol: dort richtest du einen Sparplan ein, der monatlich einen festen Betrag vom Giro- aufs Tagesgeldkonto verschiebt (und kannst ihn jederzeit anpassen).",
        eli30: "Der Sparplan ist rein planerisch (kein echter Dauerauftrag) — er reduziert den „verfügbar“-Betrag um die geplante Sparrate, damit die Prognose realistisch bleibt, auch wenn Du das Geld noch nicht tatsächlich verschoben hast.",
        eli60: "Jedes Konto — auch Tagesgeld und Sparen — kann seinen eigenen Mindestpuffer haben. Die Liquiditätswarnung bezieht sich dabei gezielt auf Dein Girokonto, nicht auf die Summe aller Konten.",
        target: { tab: "home", selector: '[data-tour="panel-sparen"]', reveal: '[title="Details anzeigen"]' },
      },
      {
        icon: "palette",
        emoji: "🎪",
        title: "Themes & Personalisierung",
        eli10: "Du kannst der App ein komplett neues Aussehen geben — Weltraum, Zirkus, Abenteuer im Wald, und noch viele mehr. Es gibt sogar eine Diashow!",
        eli20: "Über die bunten Punkte oben links wechselst Du das Farbschema — von dezent bis richtig verspielt. Eine Diashow schaltet automatisch jede Sekunde weiter.",
        eli30: "Themes ändern nur die Optik, nie Funktion oder Daten — Du kannst jederzeit wechseln, ohne etwas zu verlieren oder Einstellungen neu vornehmen zu müssen.",
        eli60: "Die Farben in jedem Theme sind bewusst so gewählt, dass Texte und Beträge auch bei ungünstigem Licht oder eingeschränktem Sehen gut lesbar bleiben.",
        target: { tab: "home", selector: '[data-tour="theme-switcher"]' },
      },
    ],
  },
  {
    key: "cloud",
    label: "3. Cloud & Bank",
    steps: [
      {
        icon: "cloud",
        emoji: "☁️",
        title: "Cloud-Synchronisierung",
        eli10: "Wenn du magst, kann die App eine Kopie deiner Daten sicher im Internet ablegen, damit du auf mehreren Geräten dasselbe siehst. Das ist ein eigener, geführter Assistent — hier geht's los.",
        eli20: "Optionaler Cloud-Sync (eigene Cloudflare-Worker-Instanz) hält Daten geräteübergreifend aktuell. Ein eigener Einrichtungsassistent führt Schritt für Schritt durch — ganz ohne Cloud-Sync läuft die App genauso gut, nur lokal.",
        eli30: "Der Assistent führt durch das Deployment auf Deine eigene Cloudflare-Instanz — kein Login bei einem fremden Anbieter, keine Auswertung Deiner Daten durch Dritte.",
        eli60: "Alternativ zum Sync kannst Du Deine Daten jederzeit auch manuell exportieren und wieder importieren — praktisch als zusätzliches Backup oder für einen Gerätewechsel.",
        target: { tab: "daten", selector: '[data-tour="row-cloudsync"]' },
      },
      {
        icon: "landmark",
        emoji: "🏦",
        title: "Bank-Anbindung",
        eli10: "Die App kann sich (mit deiner Erlaubnis) direkt bei der Bank die neuesten Buchungen holen. Auch das ist ein eigener, geführter Assistent.",
        eli20: "Die Bank-Anbindung (Enable Banking) hat ihren eigenen Einrichtungsassistenten, der Schritt für Schritt durch Anmeldung und Konto-Zuordnung führt.",
        eli30: "Enable Banking ist ein offiziell reguliertes Verfahren (PSD2/Open Banking) für den Live-Abruf — eine Alternative zum CSV-Export, die neue Buchungen direkt und ohne Zwischenschritt bereitstellt.",
        eli60: "Du entscheidest bei jedem Abruf selbst, ob und wann sich die App mit der Bank verbindet — ein automatischer Hintergrund-Abruf ohne Dein Zutun findet nicht statt.",
        target: { tab: "daten", selector: '[data-tour="row-bank"]' },
      },
      {
        icon: "shield",
        emoji: "🛡️",
        title: "Offline & Datenschutz",
        eli10: "Die App funktioniert auch ganz ohne Internet — sogar tief im Wald oder auf dem Schiff. Deine Daten liegen erstmal nur auf deinem eigenen Gerät.",
        eli20: "Alle Berechnungen laufen direkt auf Deinem Handy, komplett offline nutzbar. Standardmäßig gehört niemand sonst zu Deinen Finanzdaten dazu.",
        eli30: "Technisch ist die App eine PWA mit lokalem Speicher (IndexedDB) — Bearbeiten, Kategorisieren und Auswerten funktioniert komplett offline, auch wenn nie eine Internetverbindung bestand.",
        eli60: "Es gibt kein Drittanbieter-Tracking und keine Analytics — die einzigen externen Verbindungen sind der Cloud-Sync und die Bank-Anbindung, jeweils nur wenn Du sie aktiv einrichtest.",
        target: { tab: "home", selector: null },
      },
    ],
  },
];

export { GUIDED_TOUR_STAGES };
