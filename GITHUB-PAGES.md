# GitHub-Pages-Setup

Schritt-für-Schritt: Vom Zip auf https://einfachmachen.github.io/supadupa/ — inkl. iPhone-PWA.

## Was am Ende dasteht

```
https://einfachmachen.github.io/supadupa/    ← die modulare App direkt
```

Die ursprüngliche Single-File-App ist im `legacy`-Branch archiviert:
`https://github.com/einfachmachen/supadupa/tree/legacy`

Auf dem iPhone Safari öffnen → „Teilen" → „Zum Home-Bildschirm" → App-Icon.

## Voraussetzungen

- GitHub-Account `einfachmachen` mit dem Repo `supadupa`
- Git lokal installiert (Standard auf macOS/Linux, Windows: https://git-scm.com)

## 1. Repository klonen oder anlegen

Falls das Repo noch leer ist:

```bash
git clone https://github.com/einfachmachen/supadupa.git
cd supadupa
```

Falls du auf einem leeren Ordner stehst und das Repo lokal anlegen willst:

```bash
cd supadupa
git init
git remote add origin https://github.com/einfachmachen/supadupa.git
```

## 2. Inhalt aus dem Zip rüberkopieren

Aus dem entpackten `dual/`-Ordner **alle Inhalte** in den `supadupa/`-Ordner kopieren:

- `new/` (modulare App, ohne `node_modules/` und `dist/`)
- `old/` (alte App)
- `landing.html`
- `.github/workflows/deploy.yml`
- `.gitignore`
- `README.md`, `START-HIER.md` (optional)
- Die `start-*.command` / `.bat` / `.sh` (für lokale Entwicklung; auf GitHub-Pages nicht benutzt, aber stören nicht)

Was du **nicht** committen solltest (deckt die `.gitignore` ab):
- `node_modules/`
- `dist/`, `_site/`
- `package-lock.json` im **Wurzelordner** (wo `server.js` liegt) — der ist für lokal
- aber `new/package-lock.json` **muss mit committed werden** (GitHub Actions braucht ihn)

## 3. GitHub Pages aktivieren

Im GitHub-Repo:

1. **Settings** → **Pages**
2. Unter **Source** wählen: **GitHub Actions**
3. Speichern (manche Browser brauchen einen Reload, bis die Option erscheint)

Das war's. Beim ersten Push wird der Workflow `deploy.yml` automatisch laufen.

## 4. Pushen — per Doppelklick-Skript

Im `dual/`-Ordner findest du:

| | Datei | Was es macht |
|---|---|---|
| macOS | `github-init.command` | **Einmalig**: init, Remote setzen, ersten Push |
| macOS | `github-push.command`  | **Alltag**: add, commit (mit Frage nach Message), push |
| Windows | `github-init.bat` / `github-push.bat` | gleiche Logik |
| Linux | `github-init.sh` / `github-push.sh` | gleiche Logik |

Doppelklicken auf **`github-init.*`** für den ersten Push. Das Skript:
1. Prüft ob Git installiert ist (sonst klare Anleitung)
2. Fragt nach der Remote-URL (Default: `https://github.com/einfachmachen/supadupa.git`)
3. Fragt einmalig nach Name + Email falls Git-User noch nicht gesetzt ist
4. Macht `git init`, `git add .`, ersten Commit, `git push -u origin main`

Bei späteren Änderungen: **`github-push.*`** doppelklicken — fragt nach einer Commit-Message (mit Datum als Default) und pusht.

### Authentifizierung

GitHub akzeptiert seit 2021 kein Passwort mehr beim Push. Du brauchst entweder:
- **GitHub CLI** (`gh auth login`) — komfortabelste Lösung
- **Personal Access Token** statt Passwort — auf https://github.com/settings/tokens (Classic, Scope `repo`)
- **SSH-Key** für `git@github.com:user/repo.git`-Remotes

macOS/Windows merken sich nach der ersten Eingabe ein Token im Keychain/Credential-Manager. Linux: `git config --global credential.helper store` oder `cache`.

### Manuell (falls Skript nicht passt)

```bash
cd dual
git init
git remote add origin https://github.com/einfachmachen/supadupa.git
git add .
git commit -m "Initial deploy"
git push -u origin main
```

## 5. iPhone als PWA installieren

1. Im **Safari** (nicht Chrome!) die URL öffnen: `https://einfachmachen.github.io/supadupa/`
2. **„Neu"** oder **„Alt"** wählen
3. Unten auf das **Teilen-Symbol** tippen (das Quadrat mit Pfeil)
4. **„Zum Home-Bildschirm"** wählen
5. **„Hinzufügen"**

Das App-Icon ist jetzt auf dem Home-Bildschirm. Beim Antippen startet die App im Standalone-Modus (ohne Safari-UI, fühlt sich wie eine native App an).

> Wichtig: PWA-Installation funktioniert **nur über HTTPS** — GitHub Pages liefert HTTPS automatisch, also kein Problem.

## Bei Änderungen

Doppelklick auf **`github-push.command`** / **`.bat`** / **`.sh`** — fertig.

Das Skript zeigt dir vorher kurz welche Dateien geändert wurden, fragt nach einer Commit-Message (Default: aktuelles Datum/Uhrzeit) und pusht. Workflow läuft automatisch, neue Version ist nach ~1–2 Min live. Auf dem iPhone evtl. Safari neu laden (PWA-Cache).

## Häufige Stolpersteine

**Repo wird riesig (>50 MB), Push dauert ewig oder bricht ab**
→ Klassischer Fall: `node_modules/` wurde mit committed. Das sind die installierten Pakete (100+ MB). Lösung: **`github-cleanup.command`** / **`.bat`** / **`.sh`** doppelklicken — räumt den Tracker auf und pusht eine saubere Version. Die `node_modules/` selbst bleiben lokal erhalten (`npm install` muss nicht erneut laufen).

**„Action failed: npm ci"**
→ `new/package-lock.json` fehlt im Repo. Lokal `cd new && npm install` ausführen und das resultierende `package-lock.json` mit committen.

**„Action failed: Build failed"**
→ Build-Logs anschauen unter Actions → letzter Run → Build-Step. Meist ein fehlender Import oder Typo.

**„404 Not Found" beim Öffnen der Site**
→ Pages-Source steht nicht auf "GitHub Actions". Schritt 3 prüfen.

**Assets laden nicht (graue Seite, Konsole zeigt 404 auf JS-Dateien)**
→ Die `base`-URL stimmt nicht. Im Workflow ist sie auf `--base=/${repo-name}/new/` hartcodiert. Falls du das Repo umbenennst, läuft das automatisch mit. Falls du Pages nicht unter `/<reponame>/` sondern unter custom-domain laufen lässt, musst du `--base=/new/` setzen.

**iPhone zeigt alte Version**
→ Safari-Cache. Im Safari die Seite öffnen, dann ⓘ-Icon (oder „Aa"-Menü) → „Website neu laden ohne Cache" — oder Safari komplett schließen.

## Was darf NICHT in den Git-Tracker

```
node_modules/       ← installierte Pakete (~100+ MB)
dist/               ← Build-Output (wird vom Workflow erzeugt)
_site/              ← lokaler Pages-Test-Build
```

Was DARF nicht fehlen:

```
new/package-lock.json   ← GitHub Actions braucht ihn (npm ci)
landing.html
.github/workflows/deploy.yml
.gitignore
```

Die mitgelieferte `.gitignore` deckt das ab — solange du sie nicht löschst, kann nichts schiefgehen. Die Init- und Push-Skripte prüfen vor jedem Push aktiv, ob `node_modules` oder `dist` versehentlich im Stage liegen, und stoppen mit Fehler.
