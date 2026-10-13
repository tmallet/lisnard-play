## Why

Les décisions structurantes sont prises (ADR 0001 à 0008), mais le dépôt ne
contient encore aucun code. Avant de construire l'ingestion et la liste des
interventions, il faut un socle exécutable : le monorepo, l'application Expo
habillée de la charte, le transport tRPC de bout en bout, et l'outillage qui
garantit que la documentation reste cohérente.

## What Changes

- Création du **monorepo Bun** (workspaces `apps/*`, `packages/*`), avec
  TypeScript strict, lint et format partagés (ADR 0002).
- Création de `apps/app` : **Expo (dernier SDK) + Expo Router**, cibles web
  (sortie serveur, SSR), iOS et Android (ADR 0003).
- Intégration d'**Uniwind** et déclaration des tokens de la charte réduite
  (palette, Montserrat), conformément à l'ADR 0001.
- **Coquille de l'application** : mise en page commune, page d'accueil
  provisoire, écran « À propos » et mention d'indépendance visible partout
  (ADR 0001).
- Création de `packages/api` : **routeur tRPC** partagé, avec une procédure de
  santé, servi par une API route Expo et consommé par le client via React Query
  (ADR 0002, 0003).
- **Outillage de documentation** : script `docs:check` (frontmatter des ADR,
  cohérence de l'index, liens internes, symlinks des skills) et CI GitHub
  Actions qui lance typecheck, lint, tests et `docs:check` (ADR 0008).
- **Versions d'outils gérées par asdf** : un `.tool-versions` à la racine
  (Bun, Node) est la source unique pour le poste local, le devcontainer et la
  CI (ADR 0010).
- **Devcontainer** : environnement reproductible, et bac à sable sûr où les
  agents de codage peuvent travailler en autonomie, avec un pare-feu sortant
  en liste blanche (ADR 0010).
- Premiers documents d'architecture (`docs/architecture/`), `AGENTS.md` par
  module, et les skills `docs-sync`, `charte-ui` et `trpc-procedure` (ADR 0008).

## Capabilities

### New Capabilities

- `app-shell` : application accessible sur le web, iOS et Android ; mise en
  page commune, navigation de base, écran « À propos », mention d'indépendance,
  application de la charte réduite et métadonnées web de base.
- `api-transport` : point d'accès tRPC exposé par l'application, procédure de
  santé, validation des entrées et typage partagé entre client et serveur.

### Modified Capabilities

(aucune : aucune spec n'existe encore)

## Hors périmètre

- Base de données et `packages/db` : le choix (Postgres ou SQLite/Turso, ADR
  0002) sera fait dans le change d'ingestion, qui en a le premier besoin.
- Worker d'ingestion, sources, classifieur Jev, oEmbed (ADR 0003 à 0007).
- Liste et détail des interventions, notifications.
- Déploiement et hébergement (EAS Hosting ou autre) : seul le fonctionnement
  local et en CI est visé.
- Nom définitif de l'application : un nom provisoire est centralisé dans une
  seule constante pour être remplacé facilement (ADR 0001, point ouvert).

## Impact

- **Nouveau code** : `package.json` racine (workspaces), `apps/app`,
  `packages/api`, configuration TypeScript, lint et format partagée.
- **Dépendances** : expo, expo-router, react-native, uniwind, @trpc/server,
  @trpc/client, @trpc/tanstack-react-query, @tanstack/react-query, zod.
- **Outillage** : `scripts/docs-check.ts`, `.github/workflows/ci.yml`,
  `.tool-versions`, `.devcontainer/` (Dockerfile, `devcontainer.json`, script
  de pare-feu).
- **Limite connue** : le simulateur iOS et l'émulateur Android restent sur la
  machine hôte, et se connectent à Metro dans le conteneur par redirection de
  ports.
- **Documentation** : `docs/architecture/`, `apps/app/AGENTS.md`,
  `packages/api/AGENTS.md`, nouveaux skills dans `.agents/skills/`, mise à
  jour d'`AGENTS.md` (l'état « pré-code » disparaît).
