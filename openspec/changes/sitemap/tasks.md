## 1. Données

- [x] 1.1 `listSitemapEntries` dans `@lisnard/db/read` : interventions visibles (date de mise à jour) ; test

## 2. App

- [x] 2.1 Connexion partagée extraite dans `src/server/db.ts` (route tRPC et plan du site)
- [x] 2.2 Domaine public déduit de la requête et `robots.txt` avec `Sitemap:` quand l'indexation est activée ; tests
- [x] 2.3 Route `/sitemap.xml` : XML, échappement, cache de dix minutes partagé ; test du rendu

## 3. Qualité

- [x] 3.1 Smoke web : `/sitemap.xml` liste l'intervention publiée
- [x] 3.2 `bun run check` et `bun run smoke:web` au vert

## 4. Documentation

- [x] 4.1 `docs/architecture/deploiement.md` (activation de l'indexation, Search Console), `docs/architecture/README.md` (routes), `apps/app/AGENTS.md` ; aucun ADR nouveau
