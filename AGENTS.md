# AGENTS.md

Point d'entrée pour les agents de codage. Lire ce fichier en premier.

## Le projet

Application web et mobile **indépendante** (non affiliée à la campagne) qui
recense les interventions publiques de David Lisnard, candidat à la
présidentielle 2027. Le périmètre couvre tout sauf la mairie de Cannes, AMF
inclus. Le contexte complet se trouve dans `openspec/config.yaml` (`context`).

État actuel : **pré-code**. Les décisions sont prises (ADR 0001 à 0008), le
monorepo n'existe pas encore.

## Où trouver quoi

| Besoin                         | Emplacement                                |
|--------------------------------|--------------------------------------------|
| Pourquoi c'est fait ainsi      | `docs/decisions/` (index : `README.md`)    |
| Comment le système est bâti    | `docs/architecture/` (à créer avec le code)|
| Comportement attendu           | `openspec/specs/`                          |
| Changements en cours           | `openspec/changes/` (`openspec list`)      |
| Procédures récurrentes         | `.agents/skills/`                          |
| Règles d'un module             | `apps/*/AGENTS.md`, `packages/*/AGENTS.md` |

## Règles

- **Documentation en français**, code et identifiants en anglais (ADR 0008).
- **Toute décision durable donne lieu à un ADR** : skill `record-decision`.
  Ne jamais réécrire un ADR accepté, le remplacer.
- **Toute évolution passe par OpenSpec** (`/opsx:propose`, `/opsx:apply`).
  Les `design.md` renvoient aux ADR au lieu de dupliquer leur contenu.
- **Une tâche n'est terminée que si la doc est à jour** : architecture,
  AGENTS.md concernés, skills, ADR.
- **Indépendance (ADR 0001)** : palette et Montserrat uniquement, jamais de
  logo ni de visuel officiel, mention « non affiliée » visible.
- **Classifieur (ADR 0004)** : modèle épinglé (`typesafe/jev-1.13`), jamais
  d'alias `latest`. Toute modification des questions incrémente `questionsVersion`.
- **Secrets** : `OPENROUTER_API_KEY` et les clés des sources ne résident que
  dans le worker.
- **Commits** : Conventional Commits (skill `conventional-commit`).

## Skills du projet

Sources canoniques dans `.agents/skills/<nom>/`, symlinkées dans
`.claude/skills/<nom>`. Tout nouveau skill suit ce schéma.

- `record-decision` : créer, remplacer ou déprécier un ADR.
- `conventional-commit` : rédiger un message de commit.
- `openspec-*` : flux OpenSpec (proposer, appliquer, archiver…).

Les skills génériques Expo viennent du plugin Expo : ne pas les dupliquer.
