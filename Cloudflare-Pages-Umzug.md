# Umzug: GitHub Pages → Cloudflare Pages

Schritt-für-Schritt zum Abarbeiten. Reihenfolge einhalten — Teil A muss
**vor** allem anderen passieren, sonst sind Daten weg.

> **Zu den Beschriftungen:** Cloudflare ändert sein Dashboard häufig. Wo eine
> Beschriftung nicht passt, steht hier daneben, *wonach* Du suchst. Im Zweifel
> nachfragen statt raten.

---

## Teil A — Daten sichern (ZUERST!)

**Warum:** Die App speichert alles lokal im Browser (IndexedDB), und dieser
Speicher hängt an der **Adresse**. Unter `supadupa.top` startet die App mit
einer leeren Datenbank — die Daten von `einfachmachen.github.io` sind nicht
gelöscht, aber dort unerreichbar. Der Browser lässt keinen Zugriff über
Adressgrenzen hinweg zu, das ist kein Fehler, sondern Absicht.

- [ ] **Auf JEDEM Gerät**, auf dem Du die App benutzt: Daten → Daten-Manager →
      **Exportieren**, alle Haken, voller Zeitraum. Datei sicher ablegen.
- [ ] Alternativ (oder zusätzlich): Cloud-Sync einrichten und hochladen. Dann
      genügt später auf der neuen Adresse dieselbe Worker-URL + Secret, und
      die Daten kommen von dort.

Beides zusammen ist die sicherste Variante.

---

## Teil B — Pages-Projekt anlegen

- [ ] Cloudflare-Dashboard → linke Leiste **Compute** → **Workers und Pages**
- [ ] Knopf **Create** (oben rechts) → Reiter **Pages**
- [ ] **Wichtig: „Direct Upload" wählen, NICHT „Connect to Git".**
      Der Auslieferungs-Workflow im Repo lädt den fertigen Build selbst hoch
      (`wrangler pages deploy`). Bei einer Git-Anbindung würde Cloudflare
      zusätzlich selbst bauen — zwei Wege, die sich gegenseitig überschreiben.
- [ ] Projektname: **`supadupa-money`**
      → ergibt die Vorschau-Adresse `supadupa-money.pages.dev`
- [ ] Cloudflare fragt jetzt nach Dateien zum Hochladen. Du kannst das
      überspringen bzw. das Fenster verlassen — das Projekt existiert ab
      jetzt, den ersten echten Upload macht gleich der Workflow.

---

## Teil C — Zugangsdaten besorgen

### C1 — Account-ID

Die steht in der Adresszeile des Dashboards, erster Abschnitt nach
`dash.cloudflare.com/`. Bei Dir ist das:

```
20b4f5c4fd5154beba38db1d804d42a2
```

(Kein Geheimnis, nur eine Adresse — dieselbe Kette wie beim KV-Namespace.)

### C2 — API-Token

- [ ] Cloudflare → rechts oben Profilsymbol → **My Profile** → **API Tokens**
- [ ] **Create Token**
- [ ] Vorlage **„Edit Cloudflare Workers"** nehmen — ODER besser eng
      geschnitten über **Create Custom Token** mit genau einer Berechtigung:
      **Account › Cloudflare Pages › Edit**
- [ ] Token erzeugen und **sofort kopieren** — Cloudflare zeigt ihn nur
      einmal an.

> Das ist ein echtes Geheimnis. Wer ihn hat, kann in Deinem Namen
> veröffentlichen. Nur in den GitHub-Secrets ablegen, nirgends sonst.

---

## Teil D — GitHub-Secrets setzen

Repo → **Settings** → **Secrets and variables** → **Actions**.
Achtung: Dort gibt es **zwei Reiter**, „Secrets" und „Variables". Beides wird
gebraucht.

Reiter **Secrets** → *New repository secret*:

- [ ] `CLOUDFLARE_API_TOKEN` = der Token aus C2
- [ ] `CLOUDFLARE_ACCOUNT_ID` = `20b4f5c4fd5154beba38db1d804d42a2`

Reiter **Variables** → *New repository variable*:

- [ ] `CF_DEPLOY` = `true`   ← das schaltet den Workflow scharf
- [ ] `CF_PROJECT` = `supadupa-money`

Solange `CF_DEPLOY` nicht `true` ist, überspringt sich der Job selbst — genau
deshalb konnte er die ganze Zeit im Repo liegen, ohne zu stören.

---

## Teil E — Ersten Deploy auslösen

- [ ] Repo → **Actions** → Workflow **„Deploy to Cloudflare Pages"** →
      **Run workflow** → Branch `main` → starten.
      (Oder einfach den nächsten Push abwarten, der Workflow läuft auch dann.)
- [ ] Lauf ansehen. Er sollte bei „Deploy to Cloudflare Pages" enden mit einer
      Zeile wie `✨ Deployment complete!` und einer URL.
- [ ] **`https://supadupa-money.pages.dev` öffnen.** Die App muss laden.

**Wenn hier etwas schiefgeht:**

| Meldung | Ursache |
|---|---|
| Job wurde übersprungen | `CF_DEPLOY` steht nicht auf `true` (Reiter *Variables*, nicht *Secrets*) |
| `Authentication error` | Token falsch kopiert oder ohne Pages-Edit-Berechtigung |
| `Project not found` | Projektname weicht ab — `CF_PROJECT` muss exakt dem Namen aus Teil B entsprechen |
| Seite lädt, aber leer/kaputt | Bitte melden, dann sehe ich mir den Build an |

---

## Teil F — Eigene Domain verbinden

- [ ] **Domain zu Cloudflare bringen.** Wo `supadupa.top` registriert ist:
      entweder die **Nameserver** auf die von Cloudflare umstellen (Cloudflare
      → Add a site → Anweisungen folgen) oder die Domain ganz zu Cloudflare
      transferieren. Nameserver-Umstellung reicht völlig und geht schneller.
- [ ] Pages-Projekt → Reiter **Custom domains** → **Set up a custom domain**
- [ ] `supadupa.top` eintragen, Cloudflare legt den DNS-Eintrag selbst an.
- [ ] Optional zusätzlich `www.supadupa.top` mit Weiterleitung auf die
      Hauptadresse.
- [ ] **Zertifikat abwarten.** Das dauert typischerweise Minuten, gelegentlich
      länger. Solange es „Pending" zeigt, ist nichts kaputt.

---

## Teil G — Prüfen, bevor irgendetwas abgeschaltet wird

- [ ] `https://supadupa.top` öffnet die App.
- [ ] **Daten importieren** (Daten-Manager → Importieren, Datei aus Teil A)
      oder Cloud-Sync einrichten und laden.
- [ ] **PWA neu installieren.** Eine bereits auf dem iPhone installierte App
      zeigt weiterhin auf die ALTE Adresse — sie merkt vom Umzug nichts. Alte
      Installation löschen, neue Adresse öffnen, „Zum Home-Bildschirm".
- [ ] **Bank-Relay prüfen:** Falls im Worker `ALLOWED_ORIGINS` gesetzt ist,
      muss `https://supadupa.top` dort mit hinein — sonst schlägt der
      Bankabruf mit einem CORS-Fehler fehl.
- [ ] **Lizenzserver prüfen:** dasselbe, falls dort `ALLOWED_ORIGINS`
      gesetzt wird (in `worker/wrangler-license.toml` heute noch
      auskommentiert).
- [ ] Cloud-Sync einmal hoch- und runterladen.
- [ ] Ein paar Tage parallel laufen lassen. Es kostet nichts, und
      GitHub Pages ist dann noch als Rückfallebene da.

---

## Teil H — GitHub Pages stilllegen

**Erst wenn Teil G vollständig durch ist.**

- [ ] Sag mir Bescheid — ich entferne `.github/workflows/deploy.yml` und
      passe README/TODO an.
- [ ] Repo → Settings → Pages → Source auf **None**.
- [ ] Branch `gh-pages` löschen.

**Oder besser, falls schon jemand die alte Adresse kennt:** Statt sie
abzuschalten, eine kleine Umzugsseite dort stehen lassen — „SupaDupa Money ist
umgezogen", Link zur neuen Adresse, und der ausdrückliche Hinweis, vorher die
Daten zu exportieren. Sag Bescheid, dann baue ich die.

---

## Was danach anders ist

- Die App liegt im **Wurzelverzeichnis** der Domain statt im Unterordner
  `/supadupa-money/`. Der Workflow baut deshalb ohne `--base` — das ist schon
  eingerichtet, Du musst nichts tun.
- `public/_headers` greift ab jetzt: `version.json` und `sw.js` werden nicht
  mehr vom Cloudflare-Edge zwischengespeichert (sonst bemerkt die App neue
  Deploys nie), die gehashten Bundles dafür dauerhaft.
- Alles liegt bei einem Anbieter. Das ist ein bewusster Ausfallpunkt — die
  Nutzerdaten liegen aber lokal, ein Cloudflare-Ausfall heißt „nicht
  erreichbar", nicht „Daten weg". Und der Build ist eine statische Seite, die
  notfalls auf jedem Host läuft.

## Was der Umzug NICHT löst

Cloudflare Pages ersetzt die **Auslieferung**, nicht den **Quelltext**. Der
liegt weiter auf GitHub, und der Deploy wird von GitHub Actions angestoßen.
Wer auch davon weg will, braucht zusätzlich eine andere Stelle für Repository
und CI — das ist eine eigene Entscheidung mit eigenen Folgen (unter anderem
für die Zusammenarbeit hier, die auf GitHub-Zugang aufsetzt).
