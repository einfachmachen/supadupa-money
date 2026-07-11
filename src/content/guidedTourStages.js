// Inhalt + Wiring der interaktiven Feature-Tour, organisiert in drei
// "Zündstufen" (von einfach zu anspruchsvoll, jederzeit frei anwählbar):
//   1. Schnellstart — alles, um sofort loszulegen (Konten, Kategorien,
//      Budgets, CSV-Import, Vormerkungen, Warnungen)
//   2. Komfort — Sparen/Tagesgeld, Personalisierung
//   3. Cloud & Bank — optionale Einrichtungsassistenten, nur verwiesen
//
// Jeder Schritt: icon, title, vier Erklär-Ebenen (eli10..eli60) sowie ein
// target { tab, selector, reveal }. selector:null = keine Hervorhebung
// (konzeptionelle Erklärung, zentrierte Karte). reveal = optionaler
// Selektor, der VOR der Suche nach dem eigentlichen Ziel einmal angeklickt
// wird, um es sichtbar zu machen (z.B. "Details anzeigen" ausklappen).
const GUIDED_TOUR_STAGES = [
  {
    key: "schnellstart",
    label: "1. Schnellstart",
    steps: [
      {
        icon: "wallet",
        title: "Kontostand & Prognose",
        eli10: "Oben siehst du dein Sparschwein-Guthaben — und die App verrät dir schon heute, wie voll es Mitte und Ende des Monats sein wird. Kein Rechnen nötig!",
        eli20: "Der große Betrag oben ist dein aktueller Kontostand. MITTE und ENDE zeigen dir, wo du am 14. und am Monatsende ungefähr stehst — inklusive geplanter Zahlungen, die noch kommen.",
        eli30: "Der Hero-Bereich zeigt nicht nur den Ist-Stand, sondern eine echte Prognose: alle bereits bekannten fixen Kosten, Vormerkungen und Budgets werden vorausgerechnet.",
        eli60: "Oben sehen Sie auf einen Blick, wie viel Geld gerade da ist — und wie viel bis zur Monatsmitte und zum Monatsende übrig bleiben wird, wenn man alle bereits bekannten Zahlungen mitrechnet.",
        target: { tab: "home", selector: '[data-tour="hero-balance"]' },
      },
      {
        icon: "credit-card",
        title: "Konten einrichten",
        eli10: "Zuerst richtest du deine Konten ein — z.B. dein Girokonto, wo dein Taschengeld ankommt. Tippe hier, um eins anzulegen oder zu bearbeiten.",
        eli20: "Erster Schritt: Konten anlegen (Girokonto, ggf. Tagesgeld/Sparkonto). Reihenfolge und ein Mindestpuffer je Konto lassen sich hier auch einstellen.",
        eli30: "Konten sind die Basis für alles Weitere — Kategorien, Budgets und Prognosen beziehen sich immer auf ein Konto. Auch der Liquiditätspuffer (Warnschwelle) wird hier je Konto festgelegt.",
        eli60: "Bevor Sie loslegen, legen Sie Ihre Konten an — mindestens ein Girokonto, optional weitere (z.B. für Rücklagen). Hier lässt sich auch ein Mindestpuffer je Konto festlegen, ab dem Sie gewarnt werden.",
        target: { tab: "daten", selector: '[data-tour="row-konten"]' },
      },
      {
        icon: "layers",
        title: "Kategorien & Budgets",
        eli10: "Jede Ausgabe bekommt eine Kategorie und ein Symbol — so siehst du auf einen Blick, wofür dein Geld drauf geht. Du kannst auch ein Limit setzen, z.B. „höchstens 20€ für Süßigkeiten“.",
        eli20: "Hier legst du Kategorien an/passt sie an und setzt optional Budgets je Kategorie — ein Limit pro Monat, bei dessen Überschreitung die App dich warnt.",
        eli30: "Kategorien gruppieren Buchungen (per Regeln, die du einmal einrichtest); Budgets setzen zusätzlich Obergrenzen je Unterkategorie und warnen bei Überschreitung, bevor es zu spät ist.",
        eli60: "Hier können Sie Kategorien an Ihre Bedürfnisse anpassen und für einzelne Bereiche (z.B. Lebensmittel) eine Obergrenze je Monat festlegen.",
        target: { tab: "daten", selector: '[data-tour="row-budget"]' },
      },
      {
        icon: "download",
        title: "Buchungen importieren",
        eli10: "Statt jede Buchung einzeln einzutippen, kannst du eine Datei aus deiner Banking-App importieren — die App sortiert vieles automatisch in die richtigen Kategorien ein.",
        eli20: "Der CSV-Import holt deine Buchungen aus dem Online-Banking auf einmal rein und schlägt automatisch Kategorien vor. Vorgemerkte Zahlungen erkennt er dabei auch automatisch wieder.",
        eli30: "Der CSV-Import unterstützt nahezu jedes Bankformat, erkennt Dubletten automatisch und ordnet Kategorien nach mitlernenden Regeln zu. Er versucht außerdem automatisch, bereits vorgemerkte Zahlungen mit den echten Buchungen zu verknüpfen — meistens musst du danach gar nichts mehr manuell zuordnen.",
        eli60: "Statt jede Buchung von Hand einzutragen, können Sie eine Datei aus dem Online-Banking Ihrer Bank importieren. Die App erkennt Duplikate und ordnet Kategorien automatisch zu — in den meisten Fällen ist danach nichts mehr manuell nötig.",
        target: { tab: "daten", selector: '[data-tour="row-csv"]' },
      },
      {
        icon: "clock",
        title: "Vormerkungen anlegen",
        eli10: "Weißt du schon heute, dass am Monatsanfang die Miete abgeht? Das kannst du vormerken — einmalig, jeden Monat wiederkehrend, oder als Finanzierung (z.B. Ratenkauf). Tippe auf das große Plus, um loszulegen.",
        eli20: "Über den großen Plus-Knopf legst du Vormerkungen an: einmalige, wiederkehrende (z.B. Miete jeden Monat) oder Finanzierungen (z.B. Raten mit fester Laufzeit) — sie fließen sofort in die Prognose ein.",
        eli30: "Drei Vormerkungsarten decken die meisten Fälle ab: einmalig (einzelne bekannte Zahlung), wiederkehrend (feste Zahlung jeden Monat) und Finanzierung (Raten mit definierter Gesamtlaufzeit/-summe). Alle drei fließen sofort in MITTE/ENDE ein, noch bevor die Bank sie meldet.",
        eli60: "Über den großen Plus-Knopf können Sie geplante Zahlungen vormerken — einmalig, regelmäßig wiederkehrend (z.B. Miete) oder als Finanzierung mit fester Laufzeit (z.B. ein Ratenkauf). Das fließt sofort in die Vorschau ein, auch wenn die Bank die Zahlung noch nicht gemeldet hat.",
        target: { tab: "home", selector: '[data-tour="master-plus"]' },
      },
      {
        icon: "link",
        title: "Vormerkung ↔ Buchung zuordnen",
        eli10: "Wenn die echte Zahlung dann passiert, verknüpft die App das oft automatisch. Klappt es nicht von allein, schlägt dir der Bearbeiten-Dialog einer Vormerkung passende Buchungen direkt zum Antippen vor.",
        eli20: "Öffnest du eine Vormerkung zum Bearbeiten, schlägt dir die App dort passende Buchungen zum Verknüpfen vor (nach Betrag/Datum sortiert) — ein Tipp genügt zum Zuordnen.",
        eli30: "Automatisches Matching läuft konservativ und verknüpft nur eindeutige Treffer. Für alle anderen Fälle bietet der „Vormerkung bearbeiten“-Dialog eine nach Betragstreffer sortierte Vorschlagsliste — das ist der komfortabelste Weg auf dem Handy, im Gegensatz zum eher für den Desktop gedachten Bulk-Zuordnen-Screen.",
        eli60: "Wenn eine geplante Zahlung eintrifft, erkennt die App das oft von selbst. Klappt das nicht automatisch, bietet Ihnen der Bearbeiten-Dialog einer Vormerkung eine Liste wahrscheinlich passender Buchungen an — einfach antippen zum Verknüpfen.",
        target: { tab: "home", selector: null },
      },
      {
        icon: "shield-check",
        title: "Warnungen",
        eli10: "Falls dein Konto mal knapp wird, sagt dir die App rechtzeitig Bescheid — mit einer Warnung, bevor es wirklich passiert.",
        eli20: "Unter „Details anzeigen“ findest du eine Warnungen-Kachel: Sie meldet sich, wenn dein Kontostand unter den eingestellten Mindestpuffer zu fallen droht — inklusive Folgemonate.",
        eli30: "Die Warnung wertet die Prognose (nicht nur den Ist-Stand) gegen den je Konto festgelegten Mindestpuffer aus und zeigt optional auch die Folgemonate, damit ein Engpass nicht erst am Tag X auffällt.",
        eli60: "Droht Ihr Kontostand unter den von Ihnen festgelegten Mindestpuffer zu fallen, macht die App Sie rechtzeitig darauf aufmerksam — nicht erst, wenn es bereits so weit ist.",
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
        title: "Sparen & Tagesgeld",
        eli10: "Für Sparziele gibt's ein eigenes Sparschwein-Symbol — hier kannst du festlegen, dass automatisch etwas Geld vom Girokonto ins Sparkonto wandert.",
        eli20: "Unter „Details anzeigen“ versteckt sich das Sparschwein-Symbol: dort richtest du einen Sparplan ein, der monatlich einen festen Betrag vom Giro- aufs Tagesgeldkonto verschiebt (und kannst ihn jederzeit anpassen).",
        eli30: "Der Sparplan ist rein planerisch (kein echter Dauerauftrag) — er reduziert den „verfügbar“-Betrag um die geplante Sparrate, damit die Prognose realistisch bleibt, auch wenn Sie das Geld noch nicht tatsächlich verschoben haben.",
        eli60: "Über das Sparschwein-Symbol (unter „Details anzeigen“) können Sie einen monatlichen Sparbetrag vom Girokonto auf ein Tagesgeld-/Sparkonto einplanen und jederzeit ändern.",
        target: { tab: "home", selector: '[data-tour="panel-sparen"]', reveal: '[title="Details anzeigen"]' },
      },
      {
        icon: "palette",
        title: "Themes & Personalisierung",
        eli10: "Du kannst der App ein komplett neues Aussehen geben — Weltraum, Zirkus, Abenteuer im Wald, und noch viele mehr. Es gibt sogar eine Diashow!",
        eli20: "Über die bunten Punkte oben links wechselst Du das Farbschema — von dezent bis richtig verspielt. Eine Diashow schaltet automatisch jede Sekunde weiter.",
        eli30: "Themes sind rein visuell und ändern nichts an Funktion oder Daten — praktisch, um z.B. das Gerät eines Kindes kindgerechter zu gestalten.",
        eli60: "Sie können das Erscheinungsbild der App anpassen — von schlicht bis sehr verspielt. Das ändert nur die Optik, nicht die Funktion oder Ihre Daten.",
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
        title: "Cloud-Synchronisierung",
        eli10: "Wenn du magst, kann die App eine Kopie deiner Daten sicher im Internet ablegen, damit du auf mehreren Geräten dasselbe siehst. Das ist ein eigener, geführter Assistent — hier geht's los.",
        eli20: "Optionaler Cloud-Sync (eigene Cloudflare-Worker-Instanz) hält Daten geräteübergreifend aktuell. Ein eigener Einrichtungsassistent führt Schritt für Schritt durch — ganz ohne Cloud-Sync läuft die App genauso gut, nur lokal.",
        eli30: "Der Einrichtungsassistent führt durch Worker-Deployment und Zugangsdaten. Kein Anbieter-Login, keine Werbe-Auswertung — Sie behalten die Kontrolle über die Infrastruktur.",
        eli60: "Falls Sie Ihre Daten zusätzlich an einem selbst eingerichteten, sicheren Ort im Internet speichern möchten, führt Sie ein eigener Assistent Schritt für Schritt durch die Einrichtung. Das ist freiwillig.",
        target: { tab: "daten", selector: '[data-tour="row-cloudsync"]' },
      },
      {
        icon: "landmark",
        title: "Bank-Anbindung",
        eli10: "Die App kann sich (mit deiner Erlaubnis) direkt bei der Bank die neuesten Buchungen holen. Auch das ist ein eigener, geführter Assistent.",
        eli20: "Die Bank-Anbindung (Enable Banking) hat ihren eigenen Einrichtungsassistenten, der Schritt für Schritt durch Anmeldung und Konto-Zuordnung führt.",
        eli30: "Enable Banking (PSD2/Open Banking) ermöglicht einen Live-Abruf ohne CSV-Export — der Assistent führt durch Zugangsdaten, Bank-Auswahl und Konto-Zuordnung.",
        eli60: "Möchten Sie, dass die App sich direkt bei Ihrer Bank die neuesten Kontobewegungen holt (über ein offizielles, reguliertes Verfahren), führt Sie ein eigener Assistent durch die Einrichtung.",
        target: { tab: "daten", selector: '[data-tour="row-bank"]' },
      },
      {
        icon: "shield",
        title: "Offline & Datenschutz",
        eli10: "Die App funktioniert auch ganz ohne Internet — sogar tief im Wald oder auf dem Schiff. Deine Daten liegen erstmal nur auf deinem eigenen Gerät.",
        eli20: "Alle Berechnungen laufen direkt auf Deinem Handy, komplett offline nutzbar. Standardmäßig gehört niemand sonst zu Deinen Finanzdaten dazu.",
        eli30: "Die App ist eine PWA mit lokalem State (IndexedDB) — funktioniert vollständig offline. Es gibt keine Drittanbieter-Analytics/Tracking; die einzige externe Verbindung ist der optionale, selbst konfigurierte Sync.",
        eli60: "Die App braucht keine ständige Internetverbindung. Ihre Daten liegen zunächst nur auf Ihrem eigenen Gerät, es liest niemand automatisch mit — auch nicht, wenn Sie Cloud-Sync oder Bank-Anbindung gar nicht einrichten.",
        target: { tab: "home", selector: null },
      },
    ],
  },
];

export { GUIDED_TOUR_STAGES };
