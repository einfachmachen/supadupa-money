# MyBudgetTracker — Dual-Server

Alte und neue App parallel laufen lassen, um direkt zu vergleichen.

```
.
├── server.js          ← startet beide Ports
├── package.json
├── old/
│   └── index-OLD.html ← die ursprüngliche Single-File-App
└── new/               ← die modulare App (Vite + React)
    ├── package.json
    ├── src/
    └── …
```

## Einmalig einrichten

```bash
# Im Wurzelordner (wo server.js liegt):
npm install

# Außerdem die neue App vorbereiten:
npm run install:new
```

Das war's.

## Starten

### Dev-Modus (Standard, mit Hot-Reload)

```bash
npm start
```

→ `🔵 Alt:  http://localhost:3000`  
→ `🟢 Neu:  http://localhost:3001` mit Vite Hot-Reload

Änderungen unter `new/src/` erscheinen sofort im Browser.

### Production-Modus (gebaute Version testen)

```bash
npm run build:new     # einmal — baut new/dist/
npm run start:prod    # serviert das gebaute dist/
```

### Nur eine der beiden

```bash
npm run start:old     # nur Port 3000
npm run start:new     # nur Port 3001
```

### Custom Ports

```bash
node server.js --port-old=4000 --port-new=4001
```

## Was wann nutzen

| Was du tust | Modus |
|---|---|
| Code in `new/src/` ändern und live sehen | **Dev** (Standard) |
| Produktions-Build testen (Bundle-Größe, Minifizierung) | **Prod** |
| Daten zwischen alt und neu vergleichen | Beides parallel auf 3000 + 3001 |

## Wichtig zu wissen: IndexedDB-Trennung

Die alte App auf `localhost:3000` und die neue App auf `localhost:3001` haben **getrennte IndexedDB-Datenbanken** (verschiedene Origins). Wenn du Daten übernehmen willst:

1. Auf der alten App (Port 3000): **Datenmanager → Export → JSON**
2. Auf der neuen App (Port 3001): **Datenmanager → Import**

Andersherum geht's natürlich auch.

## Stoppen

`Strg+C` im Terminal. Stoppt beide Server.
