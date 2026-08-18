# Funktionsübersicht — SupaDupa Money

> Abgeleitet aus dem Code (Stand: dieser Commit), nicht aus einer Wunschliste.
> Zweck: Grundlage für die Freemium/Premium-Entscheidung und für Store-Texte.
> Bei Abweichungen gilt der Code.

Legende in den Tabellen:

- **Schutz** — ob sich die Funktion technisch überhaupt durchsetzen lässt:
  `Server` = läuft über einen eigenen Worker, kann wirklich „nein" sagen ·
  `weich` = nur die Oberfläche fragt; im Browser in Sekunden ausgehebelt ·
  `—` = rein lokal, gar nicht durchsetzbar.
- **Besonders** — ★ = hebt sich nach meiner Einschätzung deutlich vom Feld ab,
  ☆ = solide über dem Durchschnitt, leer = erwartbar (Tafelsilber, das jede
  App hat).

---

## 1. Erfassen & Struktur

| Funktion | Kurz | Schutz | Besonders |
|---|---|---|---|
| Kategorien & Unterkategorien | Frei anlegbar, Icons aus ~700 Symbolen, Farben, Gruppen, Reihenfolge per Pfeil | — | |
| Mehrere Konten | Giro, Tagesgeld, Depot … je mit Farbe, Symbol, Verzögerungstagen und Mindest-Puffer | — | |
| Konto löschen ohne Datenverlust | Erzwingt das Umhängen aller Buchungen, Gruppen und Budgets auf ein Zielkonto — keine Buchung kann verwaisen | — | ☆ |
| Vormerkungen | Geplante Buchungen, die später mit der echten Buchung verknüpft werden | — | |
| Wiederkehrende Serien | Monatlich/quartalsweise/jährlich, mit Bearbeitungs-Umfang („nur diese / ab hier / alle") | — | |
| Finanzierungen | Serie mit abweichender erster und Schlussrate, Betrag heißt „Rate" | — | ☆ |
| Umbuchungen | Zwei verknüpfte Beine (Abgang/Zugang); saldenneutral, wird in Auswertungen korrekt neutralisiert | — | ☆ |
| Splits | Eine Buchung auf mehrere Kategorien aufteilen | — | |
| „Unvorhergesehenes"-Topf | Ein flexibler Topf, der auch nachträglich belastet werden kann — beim Bearbeiten und direkt im Bankabruf | — | ★ |
| Tank-Erfassung | Bei Kategorie „Tanken": Liter, €/Liter, Kilometerstand, mehrere Fahrzeuge (inline anlegbar) | — | ★ |
| Ankerpunkte | Taggenaue Kontostände aus Auszügen; Salden werden daraus rückwirkend korrekt rekonstruiert | — | ☆ |

## 2. Auswerten & Vorausschauen

| Funktion | Kurz | Schutz | Besonders |
|---|---|---|---|
| Mitte/Ende-Prognose | Zwei Phasen je Monat (bis Tag 14, bis Monatsende) statt nur Monatssumme — budgetbewusst | — | ★ |
| Budget je Unterkategorie | Mit Ampel nach tatsächlichem Verbrauch, nicht nach Reserviertem | — | |
| Budget-Vorschlag | Schätzt aus der eigenen Historie, gewichtet Ist höher als Vormerkungen, legt seltene Kosten anteilig um | — | ☆ |
| Money Mood | Zahlenarme Jahresübersicht: Mini-Sparkline je Kategorie, Ampel gegen den **eigenen 12-Monats-Schnitt** — funktioniert ganz ohne Budgets | — | ★ |
| Jahrestabelle | 12 Monate × Kategorien, umschaltbar zwischen Ist/Plan | — | |
| Trend-Übersicht | Verlaufsdiagramme über Kategorien und Zeit | — | |
| Buchungs-Drilldown | Von der Kategorie-Kachel bis zur einzelnen Buchung durchtippen, ohne Zwischenmodal | — | ☆ |
| Suche & Summe | Volltext + Betragssuche mit Zeitraum, direkt in der Monatsansicht | — | |
| Tankverbrauch | l/100 km und Preisentwicklung je Fahrzeug aus den erfassten Tankungen | — | ★ |

## 3. Liquidität & Sparen — der eigentliche Kern

| Funktion | Kurz | Schutz | Besonders |
|---|---|---|---|
| Puffer-Warnung, taggenau | Prüft **jeden einzelnen Tag** der Prognose gegen den Mindest-Puffer, nicht nur Monatsenden | — | ★ |
| Schieflage-Vorwarnung **vor** dem Speichern | Noch während der Eingabe: „diese Vormerkung drückt Dich ab März unter den Puffer" — unterscheidet echtes Verschlechtern von bloßem Sichtbarmachen | — | ★★ |
| Sparplan (Tagesgeld) | Berechnet die Sparrate aus dem **prognostizierten Tiefst-Saldo** des Monats: was dauerhaft entbehrlich ist, ohne an irgendeinem Tag unter den Puffer zu rutschen | — | ★★ |
| Automatische Ratenanpassung | Unterschreitet der laufende Monat den Puffer, wird die Rate dieses Monats gesenkt, statt die ganze Serie neu zu rechnen | — | ★ |
| **Zins-Sweep („Mega-Sparrate")** | Nutzt aus, dass Tagesgeld-Zinsen zu Stichtagen gutgeschrieben werden: schiebt zum Stichtag deutlich **mehr** aufs Tagesgeld und holt den Überhang am nächsten Banktag zurück. Der Betrag muss nur kurz entbehrlich sein — deshalb liegt er weit über der dauerhaft sicheren Sparrate | — | ★★★ |

## 4. Daten hereinholen

| Funktion | Kurz | Schutz | Besonders |
|---|---|---|---|
| **Bankabruf (PSD2)** | Echter Kontoabruf über Enable Banking, geführter 9-Schritte-Assistent, Pull-to-Refresh auf der Startseite | **Server** | ☆ |
| Abruf-Vorschau statt Auto-Import | Treffer landen erst in einer Staging-Liste mit Dublettenerkennung — nichts wird ungefragt gebucht | Server | ★ |
| CSV-Import | Banking-Export, mit lernenden Händler-Regeln für die Kategorisierung | — | |
| PDF-Kontoauszug | Liest Kontoauszüge als PDF ein (Wirecard/N26) | — | ★ |
| PayPal-Zuordnung | Verknüpft die PayPal-Sammellastschrift auf dem Giro mit den Einzelposten aus dem PayPal-Export — über die feste Gläubiger-ID und den Händlernamen im Verwendungszweck, nicht über Betrag+Datum | — | ★★ |
| Automatische Vormerkungs-Verknüpfung | Verknüpft eintreffende echte Buchungen mit passenden Vormerkungen — bewusst nur bei eindeutigen Treffern | — | ★ |
| Serien-Erkennung | Findet wiederkehrende Zahlungen in den Buchungen und schlägt Serien vor | — | ☆ |
| Massen-Werkzeuge | Nachkategorisieren, Regeln neu erzeugen, Typen prüfen, Serien reparieren | — | ☆ |

## 5. Daten behalten

| Funktion | Kurz | Schutz | Besonders |
|---|---|---|---|
| Local-first | Alles liegt lokal (IndexedDB). Kein Nutzerkonto, kein Betreiber-Server, kein Tracking | — | ★★ |
| **Cloud-Sync in die EIGENE Cloud** | Cloudflare Worker (empfohlen), Supabase, JSONBin oder GitHub Gist — die DB gehört dem Nutzer, nicht mir | weich | ★★ |
| Ende-zu-Ende-Verschlüsselung | Mit Passphrase AES-256-GCM/PBKDF2 im Browser, der Worker sieht nur Chiffrat | weich | ★★ |
| Geführte Einrichtung | Assistent mit Deploy-Knopf, Secret-Generator, Selbsttest und Fingerabdruck zum Gerätevergleich | weich | ★ |
| Daten-Manager | 12 einzeln wählbare Bereiche für Export/Import/Löschen, „alle Haken = 100 % Sicherung", automatisches Backup vor dem Löschen | — | ★ |
| Offline-fähig | Als PWA installierbar, funktioniert ohne Netz | — | ☆ |

## 6. Bedienung & Darstellung

| Funktion | Kurz | Schutz | Besonders |
|---|---|---|---|
| 34 Themes | Von schlicht bis verspielt, plus eigener Theme-Editor | — | ★ |
| Kontrast-Werkzeug | Prüft und korrigiert die Farbwerte gegen WCAG — im Produkt, nicht nur im Build | — | ★★ |
| Betrags-Sichtbarkeit | Auge blendet alle Beträge unscharf — für den Blick über die Schulter | — | ★ |
| Gedrehte Nachkommastellen | Cents klein und gedreht, damit die Euro-Beträge auf schmalen Bildschirmen lesbar bleiben | — | ★ |
| Links-/Rechtshänder-Modus | Bedienelemente wandern auf die andere Seite | — | ★ |
| Kids-Modus | Vereinfachte, verspielte Ansicht (Teddy-Symbol am Hero) | — | ★ |
| Geführte Tour | Erklärt die Funktionen direkt an den Elementen | — | ☆ |
| Icon-Favoriten per Wisch | Symbole wie beim Kennenlernen durchwischen und sammeln | — | ★ |

---

## 7. Was ich für außergewöhnlich halte

**Vorbehalt vorweg:** Ich kenne den aktuellen Funktionsstand von Finanzblick,
Finanzguru und Debit & Credit nicht aus eigener Prüfung, und Funktionslisten
ändern sich. Die folgende Einschätzung beschreibt, was aus der Konstruktion
dieser App heraus ungewöhnlich ist — sie ersetzt keinen Wettbewerbsvergleich,
den Du vor dem Preisschild einmal selbst machen solltest.

**Die drei stärksten Argumente, in dieser Reihenfolge:**

1. **Zins-Sweep („Mega-Sparrate").** Das ist der ungewöhnlichste Baustein der
   ganzen App. Kein Budget-Werkzeug, das ich kenne, rechnet aus, wie viel man
   *nur für den Zinsstichtag* aufs Tagesgeld schieben und am nächsten Banktag
   zurückholen kann. Es ist auch die Funktion mit dem klarsten Geldwert für den
   Nutzer: sie bringt ihm messbar Zinsen. Wenn Du eine einzige Funktion aufs
   Plakat schreibst, ist es diese.
2. **Der ganze Liquiditäts-Block.** Taggenaue Puffer-Prüfung, die
   Schieflage-Vorwarnung *während der Eingabe* und die daraus abgeleitete
   sichere Sparrate greifen ineinander. Die meisten Apps zeigen, was war;
   diese hier sagt, was passiert, **bevor** man auf Speichern tippt. Das ist
   eine andere Kategorie von Nutzen als eine schöne Auswertung.
3. **Local-first ohne Nutzerkonto, mit Sync in die eigene Cloud.** Die drei
   genannten Wettbewerber sind Konto-gebunden und hosten die Daten selbst. Wer
   das nicht will, hat kaum Alternativen. Das ist kein Feature, sondern eine
   Haltung — und für einen Teil des Marktes das Kaufargument überhaupt.

**Dahinter, aber stark:** Money Mood (Ampel gegen den eigenen Schnitt statt
gegen ein Budget, das niemand pflegt), die PayPal-Zuordnung über Gläubiger-ID
und Händlername, die Mitte/Ende-Phasen, die Tank-Auswertung und die
Bankabruf-Vorschau ohne Automatik.

**Was Tafelsilber ist** und kein Kaufargument: Kategorien, Budgets, Diagramme,
CSV-Import, wiederkehrende Buchungen. Das hat jede App. Der Fehler wäre, damit
zu werben.

**Zum Namen:** Deine Vermutung stimmt vermutlich — „SupaDupa Money" weckt
Skepsis. Genau deshalb sollte der erste Eindruck nicht die Kategorienliste
sein, sondern etwas, das nachweislich rechnet. Die Schieflage-Vorwarnung und
der Zins-Sweep sind die zwei Momente, an denen jemand denkt: „Moment, das hat
mir noch keine App gesagt."

---

## 8. Vorschlag für den Schnitt

Der Ausgangspunkt bleibt: **hart durchsetzen lässt sich nur der Bankabruf.**
Alles andere ist ein Wegweiser für ehrliche Nutzer — und das sind fast alle.
Das ist kein Grund, nur das Erzwingbare zu verkaufen; es ist ein Grund, den
Preis am wahrgenommenen Wert festzumachen und die Sperren freundlich zu halten.

**Frei — muss für sich allein überzeugen:**
Erfassen, Kategorien, Budgets, Konten, Vormerkungen, Serien, Umbuchungen,
Splits, CSV-Import, Jahres- und Trendansicht, **Money Mood**, Suche, Themes,
Daten-Manager, Offline-Betrieb.

Money Mood gehört bewusst in die freie Version: es ist der Moment, in dem
jemand die App mag. Wer sie nicht mag, kauft auch nichts.

**Premium — das „jetzt arbeitet die App für mich"-Paket:**

| Funktion | warum hier |
|---|---|
| Bankabruf (PSD2) | einzige hart geschützte Funktion, kostet laufend Geld |
| Cloud-Sync mit E2E-Verschlüsselung | Mehrgeräte-Nutzung, klarer Mehrwert |
| Sparplan **inkl. Zins-Sweep** | die stärkste Einzelfunktion, rechnet sich für den Käufer selbst |
| Schieflage-Vorwarnung vor dem Speichern | der zweite „das kann sonst keiner"-Moment |
| Tankverbrauch & Preisauswertung | abgeschlossener Zusatznutzen, leicht als Paketbestandteil zu erklären |
| PDF-Kontoauszug + PayPal-Zuordnung | Komfort für Vielnutzer |

Das ergibt sechs Nennungen auf der Kaufseite statt zwei — Deine Ausgangsfrage.
Und es ist ehrlich: jede davon tut etwas, das die freie Version nicht tut.

**Offene Entscheidung:** Ob die weich gesperrten Punkte zusätzlich technisch
gegatet werden sollen (Wegweiser) oder nur beworben. Ich empfehle das Gate —
ohne Sperre merkt niemand, dass es Premium ist, und der Hinweis „ab Premium"
an der Stelle, wo die Funktion sitzt, ist die wirksamste Kaufaufforderung, die
es gibt. Aber die Sperre muss freundlich sein: erklären, was sie kann, nicht
bloß den Weg versperren.
