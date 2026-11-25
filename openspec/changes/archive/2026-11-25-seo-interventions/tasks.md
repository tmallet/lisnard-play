## 1. Serveur

- [x] 1.1 Étendre `PageMeta` et `withPageMeta` (type Open Graph, texte `<noscript>`, statut)
- [x] 1.2 Ajouter `intervention-page.ts` : lecture, métadonnées, JSON-LD, texte, accueil
- [x] 1.3 Brancher accueil et interventions dans `server.ts`, 404 réel
- [x] 1.4 Partager titre et description avec `PageHead` (`lib/intervention-meta.ts`)

## 2. Tests

- [x] 2.1 Tests unitaires : métadonnées vidéo et presse, échappement, JSON-LD, accueil, lecture
- [x] 2.2 Étendre `scripts/smoke-web.ts` (canonique, JSON-LD, 404, accueil)

## 3. Documentation

- [x] 3.1 ADR 0036 et index, `docs/architecture/README.md`, `apps/app/AGENTS.md`, spec `app-shell`
