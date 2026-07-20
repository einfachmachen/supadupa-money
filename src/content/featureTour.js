// Inhalte für die Feature-Tour (FeatureTourScreen.jsx). Jede Funktion hat vier
// Textfelder: eli10 ("Für Kids", eigener Modus) sowie eli20/30/60, die im
// Standardmodus AUFEINANDER AUFBAUEN — eli20 ist die Grundaussage, eli30
// ("mehr …") und eli60 ("noch mehr …") ergänzen jeweils NEUE, tiefer gehende
// Details, statt denselben Inhalt nur anders zu formulieren. Rein inhaltlich,
// keine Logik.

const FEATURE_TOUR_LEVELS = [
  { key:"eli10", label:"Für Kids" },
  { key:"eli20", label:"Einsteiger" },
  { key:"eli30", label:"Profi" },
  { key:"eli60", label:"Erfahren" },
];

const FEATURE_TOUR = [
  {
    icon: "wallet",
    emoji: "🐷",
    title: "Kontostand & Prognose",
    eli10: "Oben siehst du dein Sparschwein-Guthaben — und die App verrät dir schon heute, wie voll es Mitte und Ende des Monats sein wird. Kein Rechnen nötig!",
    eli20: "Der große Betrag oben ist dein aktueller Kontostand. MITTE und ENDE zeigen dir, wo du am 14. und am Monatsende ungefähr stehst — inklusive geplanter Zahlungen, die noch kommen.",
    eli30: "Die Prognose aktualisiert sich sofort, sobald du eine Vormerkung anlegst oder änderst — Du musst nicht warten, bis die echte Buchung bei der Bank eintrifft. Über „Details anzeigen“ siehst Du außerdem, wie sich der Betrag zusammensetzt.",
    eli60: "Sinkt der Kontostand an einem bestimmten Tag unter Deinen eingestellten Mindestpuffer, warnt Dich ein Banner ganz oben in der App — schon Wochen im Voraus, nicht erst wenn es tatsächlich passiert.",
  },
  {
    icon: "layers",
    emoji: "🎨",
    title: "Kategorien & Ausgabenübersicht",
    eli10: "Jede Ausgabe bekommt eine eigene Farbe und ein Symbol — so siehst du auf einen Blick, wofür dein Geld drauf geht: Süßigkeiten, Sparen, Taschengeld für Freunde.",
    eli20: "Unter dem Kontostand siehst du, wie sich deine Ausgaben auf Kategorien verteilen — Miete, Essen, Freizeit usw. Praktisch, um zu erkennen, wo im Monat am meisten wegging.",
    eli30: "Neue Buchungen landen automatisch in der richtigen Kategorie, sobald Du einmal eine Regel dafür eingerichtet hast — Du musst nicht jede Buchung von Hand einsortieren. Für eine feinere Aufteilung lassen sich Kategorien zusätzlich in Unterkategorien gliedern.",
    eli60: "Tippe auf eine Kategorie, um sie aufzuklappen und ihre Unterkategorien mit dem jeweiligen Verbrauch zu sehen. Farbe und Symbol jeder Kategorie kannst Du frei wählen.",
  },
  {
    icon: "target",
    emoji: "🎯",
    title: "Budgets & Vormerkungen",
    eli10: "Du kannst dir ein Limit setzen, z.B. „höchstens 20€ für Süßigkeiten diesen Monat“ — die App sagt dir Bescheid, wenn du kurz davor bist, es zu überschreiten.",
    eli20: "Budgets setzen ein Limit pro Kategorie (z.B. Essen gehen). Vormerkungen sind Buchungen, die Du schon kennst, bevor sie passieren — z.B. die Miete am 1. — und die die Prognose direkt berücksichtigt.",
    eli30: "Vormerkungen lassen sich als wiederkehrende Serie anlegen (z.B. jeden Monat die Miete) und auf mehrere Kategorien aufteilen. Ist das Datum verstrichen, ohne dass die echte Buchung eingetroffen ist, markiert die App sie als überfällig.",
    eli60: "Für unvorhergesehene Ausgaben gibt es einen eigenen Budget-Topf („Unvorhergesehenes“), der nicht das Budget einer einzelnen Kategorie belastet. Zur Monatsmitte und zum Monatsende zeigt Dir die App zusätzlich, wie viel jedes Budget noch übrig hat oder bereits überzogen ist.",
  },
  {
    icon: "landmark",
    emoji: "🏦",
    title: "Bank-Anbindung & Import",
    eli10: "Die App kann sich (mit Erlaubnis) direkt bei der Bank die neuesten Buchungen holen — wie ein Bote, der jeden Tag nachschaut, ob Post da ist.",
    eli20: "Per Wisch-Geste ruft die App neue Buchungen direkt von deiner Bank ab (Enable Banking) oder du importierst eine CSV-Datei vom Online-Banking — beides landet automatisch in den richtigen Kategorien, wenn Regeln existieren.",
    eli30: "Neu abgerufene Buchungen werden automatisch mit bereits vorhandenen abgeglichen: sichere Dubletten fallen weg, unsichere („evtl. Dublette“) zeigt Dir die App zur Prüfung an, statt sie einfach zu verwerfen.",
    eli60: "Der CSV-Import versteht die Formate vieler Banken automatisch und erkennt PayPal-Gegenbuchungen, damit dieselbe Zahlung nicht doppelt auftaucht. Du entscheidest bei jedem Abruf selbst, ob und wann sich die App mit der Bank verbindet.",
  },
  {
    icon: "link",
    emoji: "🧩",
    title: "Vormerkungen automatisch zuordnen",
    eli10: "Wenn eine geplante Ausgabe wirklich passiert, verknüpft die App das automatisch — wie zwei Puzzleteile, die zusammenpassen.",
    eli20: "Sobald die echte Buchung eintrifft, verknüpft die App sie automatisch mit der passenden Vormerkung (gleicher Betrag, gleiches Konto, enges Zeitfenster) — Du musst nichts mehr manuell zusammenklicken.",
    eli30: "Automatisch verknüpft wird bewusst nur bei eindeutigen Treffern — gibt es einen zweiten, ähnlich passenden Kandidaten, verzichtet die App auf die automatische Verknüpfung.",
    eli60: "In diesen mehrdeutigen Fällen bekommst Du die Kandidaten stattdessen zur manuellen Prüfung angezeigt — auch kleine Betragsabweichungen zwischen Vormerkung und echter Buchung werden Dir dabei angezeigt, statt dass falsch zugeordnet wird.",
  },
  {
    icon: "piggy-bank",
    emoji: "💰",
    title: "Sparen & Tagesgeld",
    eli10: "Für Sparziele gibt's ein eigenes Sparschwein-Konto — Geld, das du beiseitelegst, zählt nicht zu deinem „zum Ausgeben“-Betrag.",
    eli20: "Tagesgeld/Sparkonten lassen sich getrennt führen — Geld, das Du zurücklegst, verschwindet aus dem „verfügbar“-Betrag, bleibt aber sichtbar und nachvollziehbar.",
    eli30: "Jedes Konto — auch Tagesgeld und Sparen — kann seinen eigenen Mindestpuffer haben. Die Liquiditätswarnung bezieht sich dabei gezielt auf Dein Girokonto, nicht auf die Summe aller Konten.",
    eli60: "Im SparPlaner legst Du feste Sparraten als wiederkehrende Serie an (z.B. monatlich 50€ aufs Tagesgeld) — die App merkt sie automatisch vor, genau wie andere Vormerkungen.",
  },
  {
    icon: "cloud",
    emoji: "☁️",
    title: "Cloud-Synchronisierung",
    eli10: "Wenn du magst, kann die App eine Kopie deiner Daten sicher im Internet ablegen — dann siehst du dasselbe auf Handy und Tablet, wie zwei Fotos vom selben Bild.",
    eli20: "Optionaler Cloud-Sync hält die Daten geräteübergreifend aktuell. Komplett Deine Entscheidung — ohne Einrichtung läuft alles rein lokal auf dem Gerät.",
    eli30: "Die Synchronisierung läuft über einen eigenen Cloudflare Worker, den Du selbst einrichtest — kein Login bei einem fremden Anbieter, keine Auswertung Deiner Daten durch Dritte.",
    eli60: "Alternativ zum Sync kannst Du Deine Daten jederzeit auch manuell exportieren und wieder importieren — praktisch als zusätzliches Backup oder für einen Gerätewechsel.",
  },
  {
    icon: "shield",
    emoji: "🛡️",
    title: "Offline & Datenschutz",
    eli10: "Die App funktioniert auch ohne Internet — sogar tief im Wald oder auf dem Schiff ohne Empfang. Deine Daten liegen erstmal nur auf deinem eigenen Gerät, nicht bei einer fremden Firma.",
    eli20: "Alle Berechnungen laufen direkt auf Deinem Handy, komplett offline nutzbar. Standardmäßig gehört niemand sonst zu Deinen Finanzdaten dazu — keine Werbe-Firma liest mit.",
    eli30: "Technisch ist die App eine PWA mit lokalem Speicher (IndexedDB) — Bearbeiten, Kategorisieren und Auswerten funktioniert komplett offline, auch wenn nie eine Internetverbindung bestand.",
    eli60: "Es gibt kein Drittanbieter-Tracking und keine Analytics — die einzige externe Verbindung ist der optionale, von Dir selbst eingerichtete Cloud-Sync. Ohne diesen bleibt jede einzelne Buchung ausschließlich auf Deinem Gerät.",
  },
  {
    icon: "palette",
    emoji: "🎪",
    title: "Themes & Personalisierung",
    eli10: "Du kannst der App ein komplett neues Aussehen geben — Weltraum, Zirkus, Abenteuer im Wald, und noch viele mehr. Es gibt sogar eine Diashow, die automatisch durchschaltet!",
    eli20: "Über das kleine Punkte-Symbol oben links wechselst Du das Farbschema — von dezent bis richtig verspielt (extra Themes für jüngere Nutzer mit eigenem Rahmen und Symbolen). Eine Diashow schaltet automatisch jede Sekunde weiter.",
    eli30: "Themes ändern nur die Optik, nie Funktion oder Daten — Du kannst jederzeit wechseln, ohne etwas zu verlieren oder Einstellungen neu vornehmen zu müssen.",
    eli60: "Die Farben in jedem Theme sind bewusst so gewählt, dass Texte und Beträge auch bei ungünstigem Licht oder eingeschränktem Sehen gut lesbar bleiben.",
  },
];

export { FEATURE_TOUR, FEATURE_TOUR_LEVELS };
