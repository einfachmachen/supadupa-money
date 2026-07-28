# Projekt-Hinweise: SupaDupa Money

## Git-Workflow

- Änderungen immer direkt nach `main` mergen/pushen (nicht auf einem
  Feature-Branch liegen lassen und auf einen PR warten). Der Deploy
  (GitHub Pages, gh-pages) baut aus `main`.
- Vor dem Push: `npx vitest run` und `npm run build` müssen sauber
  durchlaufen.
- Vor dem Push immer `git fetch origin main` prüfen, ob zwischenzeitlich
  parallele Commits (z. B. aus einer anderen Session) dazugekommen sind,
  und diese bei Bedarf zuerst mergen.
