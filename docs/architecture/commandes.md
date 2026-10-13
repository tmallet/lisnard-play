# Commandes

Toutes les commandes se lancent depuis la racine du dépôt.

## Prérequis

Les versions de Bun et Node sont épinglées dans `.tool-versions` (ADR 0010) :

```bash
asdf install
```

Les CLI globales (`openspec`, `codex`…) doivent être installées pour la
version de Node du projet, puisque asdf choisit la version selon le dossier.

Ou bien travailler dans le devcontainer : voir [devcontainer.md](devcontainer.md).

## Quotidien

| Commande | Effet |
|----------|-------|
| `bun install` | Installe les dépendances (arborescence « hoisted », voir `bunfig.toml`) |
| `bun run dev` | Lance Metro (web, iOS, Android, API routes) |
| `bun run check` | Format + lint (Biome), types, tests, `docs:check`. **À lancer avant de conclure une tâche** |
| `bun run format` | Formate tout le dépôt (Biome) |
| `bun run smoke:web` | Export web de production, serveur local, vérifications HTTP sans JavaScript |
| `bun run docs:check` | Cohérence des ADR, de l'index, des liens, des skills et des versions d'outils |

Options du smoke test : `SMOKE_PORT` (8091 par défaut), `SKIP_EXPORT=1` pour réutiliser `apps/app/dist`.

## Par workspace

| Commande | Effet |
|----------|-------|
| `bun --filter @lisnard/app dev` | Metro (équivalent de `bun run dev`) |
| `bun --filter @lisnard/app export:web` | Export web dans `apps/app/dist` |
| `bun --filter @lisnard/api test` | Tests `bun test` du routeur |
| `bun --filter @lisnard/app test` | Tests jest-expo des composants |

Dans `apps/app`, ajouter une dépendance avec `bunx expo install <paquet>`
(versions compatibles avec le SDK).

## Variables d'environnement

Voir `.env.example`. Un fichier `.env*` n'est jamais commité (sauf `.env.example`).

| Variable | Usage |
|----------|-------|
| `EXPO_PUBLIC_API_URL` | URL de base de l'API pour les clients mobiles hors développement |

## CI

`.github/workflows/ci.yml`, sur chaque PR et sur `main` :

1. Bun et Node installés depuis `.tool-versions` ;
2. `bun install --frozen-lockfile` ;
3. `bun run check` ;
4. `bun run smoke:web`.
