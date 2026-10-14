## 1. Serveur

- [x] 1.1 Module `apps/app/indexing.ts` : `indexingAllowed(env)`, `robotsTxt(allowed)`, `withIndexingPolicy(response, allowed)` ; tests
- [x] 1.2 `server.ts` : `/robots.txt` servi selon la politique, en-tête `X-Robots-Tag` sur toutes les réponses quand l'indexation est bloquée

## 2. Qualité

- [x] 2.1 Smoke test : en-tête sur une page, sur un fichier statique et sur l'API ; `robots.txt` interdit
- [x] 2.2 `bun run check` et `bun run smoke:web` au vert

## 3. Documentation

- [x] 3.1 `docs/architecture/deploiement.md` (variable `ALLOW_INDEXING`, à laisser absente jusqu'au lancement), `docs/architecture/commandes.md`, `.env.example`
