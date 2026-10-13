# AGENTS.md

Point d'entrée pour les agents de codage. Lire ce fichier en premier.

## Le projet

Application web et mobile **indépendante** (non affiliée à la campagne) qui
recense les interventions publiques de David Lisnard, candidat à la
présidentielle 2027. Le périmètre couvre tout sauf la mairie de Cannes, AMF
inclus. Le contexte complet se trouve dans `openspec/config.yaml` (`context`).

État actuel : **socle en place** (monorepo Bun, app Expo SDK 57, tRPC, CI,
devcontainer). L'ingestion, la base de données et le classifieur restent à
construire (ADR 0004 à 0007).

## Démarrer

```bash
asdf install        # Bun et Node aux versions de .tool-versions
bun install
bun run dev         # Metro : web, iOS, Android, API routes
bun run check       # format, lint, types, tests, docs:check : avant de conclure
```

Commandes complètes : [docs/architecture/commandes.md](docs/architecture/commandes.md).
Pour travailler en bac à sable (agents en autonomie) :
[docs/architecture/devcontainer.md](docs/architecture/devcontainer.md).

## Où trouver quoi

| Besoin                         | Emplacement                                |
|--------------------------------|--------------------------------------------|
| Pourquoi c'est fait ainsi      | `docs/decisions/` (index : `README.md`)    |
| Comment le système est bâti    | [docs/architecture/](docs/architecture/README.md) |
| Comportement attendu           | `openspec/specs/`                          |
| Changements en cours           | `openspec/changes/` (`openspec list`)      |
| Procédures récurrentes         | `.agents/skills/`                          |
| Règles d'un module             | [apps/app/AGENTS.md](apps/app/AGENTS.md), [packages/api/AGENTS.md](packages/api/AGENTS.md) |

## Règles

- **Documentation en français**, code et identifiants en anglais (ADR 0008).
- **Toute décision durable donne lieu à un ADR** : skill `record-decision`.
  Ne jamais réécrire un ADR accepté, le remplacer.
- **Toute évolution passe par OpenSpec** (`/opsx:propose`, `/opsx:apply`).
  Les `design.md` renvoient aux ADR au lieu de dupliquer leur contenu.
- **Une tâche n'est terminée que si la doc est à jour et `bun run check`
  passe** : skill `docs-sync`.
- **Versions d'outils** : uniquement via `.tool-versions` (et `package.json`,
  vérifié par `docs:check`). Ne jamais installer une autre version de Bun ou
  Node « en passant » (ADR 0010).
- **Indépendance (ADR 0001)** : palette et Montserrat uniquement, jamais de
  logo ni de visuel officiel, mention « non affiliée » visible. Skill `charte-ui`.
- **Expo (SDK 57)** : consulter la doc versionnée avant toute API Expo ou React
  Native, et ajouter les dépendances avec `bunx expo install` (voir
  `apps/app/AGENTS.md`).
- **Classifieur (ADR 0004)** : modèle épinglé sur un instantané daté (`typesafe/jev-1.13-20260917`), jamais
  d'alias `latest`. Toute modification des questions incrémente `questionsVersion`.
- **Secrets** : jamais dans le code, l'image ni un fichier commité.
  `OPENROUTER_API_KEY` et les clés des sources ne résident que dans le worker.
- **Commits** : Conventional Commits (skill `conventional-commit`).

## Skills du projet

Sources canoniques dans `.agents/skills/<nom>/`, symlinkées dans
`.claude/skills/<nom>`. Tout nouveau skill suit ce schéma (vérifié par `docs:check`).

- `docs-sync` : quelle doc mettre à jour en fin de tâche.
- `record-decision` : créer, remplacer ou déprécier un ADR.
- `charte-ui` : règles visuelles, tokens, accessibilité.
- `trpc-procedure` : ajouter une procédure tRPC et l'utiliser côté client.
- `conventional-commit` : rédiger un message de commit.
- `openspec-*` : flux OpenSpec (proposer, appliquer, archiver…).

Les skills génériques Expo viennent du plugin Expo : ne pas les dupliquer.
