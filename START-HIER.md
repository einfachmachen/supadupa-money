# START HIER

Doppelklick — fertig.

## Lokal starten

### macOS
- **`start-dev.command`** — Dev-Modus (Hot-Reload, ideal zum Arbeiten)
- **`start-prod.command`** — Production-Modus (baut die App und serviert sie minified)

> Beim ersten Mal kommt evtl. eine Warnung „kann nicht geöffnet werden, Entwickler unbekannt". Lösung: Rechtsklick → **Öffnen** → **Öffnen**. Danach merkt macOS sich das.
>
> Falls Doppelklick nichts tut: einmal im Terminal `chmod +x start-dev.command` ausführen.

### Windows
- **`start-dev.bat`** — Dev-Modus
- **`start-prod.bat`** — Production-Modus

> Windows zeigt beim ersten Start evtl. SmartScreen-Warnung („Computer geschützt"). **Weitere Informationen** → **Trotzdem ausführen**.

### Linux
- **`start-dev.sh`** — Dev-Modus
- **`start-prod.sh`** — Production-Modus

> Im Datei-Manager evtl. „Als ausführbares Programm starten" wählen.
> Oder im Terminal: `chmod +x start-dev.sh && ./start-dev.sh`

## Auf GitHub Pages deployen (für iPhone-PWA & Co.)

| | Einmalig | Im Alltag | Wenn was schiefging |
|---|---|---|---|
| macOS | `github-init.command` | `github-push.command` | `github-cleanup.command` |
| Windows | `github-init.bat` | `github-push.bat` | `github-cleanup.bat` |
| Linux | `github-init.sh` | `github-push.sh` | `github-cleanup.sh` |

**Hinweis:** Die ursprüngliche Single-File-App ist im `legacy`-Branch
auf GitHub archiviert (`https://github.com/<user>/<repo>/tree/legacy`).
`github-legacy.command`/`.bat`/`.sh` aktualisiert diesen Branch falls nötig.

Details in **`GITHUB-PAGES.md`**.

---

## Was passiert beim Doppelklick

1. Prüft ob **Node.js 18+** installiert ist (sonst klare Anleitung)
2. Installiert beim ersten Mal automatisch alle Dependencies (~45 Sek einmalig)
3. Startet den Dev-Server:
   - 🟢 `http://localhost:3000` — die App mit Hot-Reload
4. Öffnet den Browser automatisch
5. **Strg+C** im geöffneten Terminal-Fenster beendet den Server

## Welcher Modus wann

| | **Dev** | **Prod** |
|---|---|---|
| Hot-Reload | ✅ | ❌ |
| Startup-Zeit | ~3 Sek | ~10 Sek (Build) |
| Bundle | unminified | minified |
| Zum Code-Ändern | ✅ | ❌ |
| Zum Echtbetrieb testen | ❌ | ✅ |

Im Zweifel: **Dev**.

## Falls Node.js noch fehlt

| | Empfehlung |
|---|---|
| **macOS** | `brew install node` (mit Homebrew) oder Installer von https://nodejs.org |
| **Windows** | Installer von https://nodejs.org (LTS-Version) oder `winget install OpenJS.NodeJS.LTS` |
| **Linux** | `sudo apt install nodejs npm` oder distro-spezifisch |

Mindestens **Node 18**, ideal Node 20 LTS.
