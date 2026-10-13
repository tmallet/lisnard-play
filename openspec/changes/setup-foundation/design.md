## Context

Le dépôt ne contient que la documentation (ADR 0001 à 0008, `AGENTS.md`,
`openspec/config.yaml`). La stack (ADR 0002), l'organisation web d'abord avec
API routes tRPC (ADR 0003), la charte réduite (ADR 0001) et le système de
documentation (ADR 0008) sont décidés. Ce design précise comment les assembler.
Les motivations sont dans `proposal.md`, les exigences dans `specs/`.

## Goals / Non-Goals

**Goals :**
- Un monorepo qui s'installe, se vérifie et se lance avec une seule commande
  par action (`bun install`, `bun run check`, `bun run dev`).
- Une chaîne tRPC de bout en bout (procédure → API route → client React Query)
  qui sert de modèle aux procédures suivantes.
- Une CI qui rend vérifiables toutes les exigences des specs `app-shell` et
  `api-transport`, documentation comprise.

**Non-Goals :**
- Thème clair/sombre : l'application suit la charte (fond bleu sombre) sur
  toutes les plateformes, il n'y a pas de variante claire.
- Internationalisation : interface en français uniquement.
- Builds natifs signés et publication sur les stores.

## Decisions

### D1 — Organisation du monorepo
Voir ADR 0002 pour la cible. Ce change crée seulement :

```
package.json            workspaces ["apps/*", "packages/*"], scripts racine
bunfig.toml             install.linker = "hoisted" (voir Risques)
tsconfig.base.json      strict, partagé
biome.json              lint + format (ADR 0009)
apps/app/               Expo Router
packages/api/           routeur tRPC (@lisnard/api)
scripts/docs-check.ts   contrôle de la doc
.github/workflows/ci.yml
```

`apps/worker` et `packages/db` arrivent avec le change d'ingestion.
Les scripts racine délèguent par `bun --filter`.

### D2 — Expo Router en sortie serveur
`app.json` → `web.output: "server"` pour obtenir à la fois le SSR des pages et
les API routes (ADR 0003). Les métadonnées (titre, description, Open Graph,
`lang="fr"`) sont posées dans `app/+html.tsx` (document racine) et par page
avec `expo-router/head`.
*Alternative* : `output: "static"` (pré-rendu au build). Il satisfait aussi
l'exigence « contenu présent sans JavaScript », mais sans API routes, ce qui
casserait la décision de l'ADR 0003. On ne l'utilise qu'en repli (voir Risques).

### D3 — Montage tRPC
- `packages/api` exporte `appRouter`, son type `AppRouter` et
  `createContext`. Une procédure `health` (`publicProcedure.query`) renvoie
  `{ status: "ok", version, time }`, où `version` vient du `package.json` de l'app.
- `apps/app/src/app/api/trpc/[trpc]+api.ts` branche `fetchRequestHandler`
  sur `GET` et `POST`, avec `endpoint: "/api/trpc"`.
- Un `errorFormatter` retire la `stack` hors développement (spec
  « Erreurs sans fuite d'information »). Les erreurs zod sont aplaties dans
  `data.zodError` pour indiquer les champs fautifs.
- Côté client : `@trpc/tanstack-react-query` (intégration de tRPC v11 avec
  React Query, à base d'options de requête), `httpBatchLink`.
- URL de base : chemin relatif sur le web (même origine) ; sur mobile,
  `EXPO_PUBLIC_API_URL`, avec repli en développement sur l'hôte de Metro
  (`Constants.expoConfig.hostUri`).
- Pas de transformateur (superjson) : les sorties restent du JSON simple
  (dates en chaînes ISO). On l'ajoutera par ADR si un besoin réel apparaît.

### D4 — Uniwind et tokens de la charte
`apps/app/src/global.css` importe Tailwind et Uniwind, puis déclare dans
`@theme` les cinq couleurs de l'ADR 0001 (`--color-bleu`,
`--color-bleu-sombre`, `--color-chamois`, `--color-blanc`, `--color-emeraude`)
et `--font-*` pour Montserrat. La configuration Metro est enveloppée par
l'utilitaire Uniwind, selon sa documentation pour le SDK courant.
Le fond en dégradé (160°, bleu → bleu sombre) passe par `expo-linear-gradient`
dans la mise en page racine, avec `bg-bleu-sombre` en repli.

### D5 — Police Montserrat embarquée
Graisses 400, 600, 700 et 800 via `@expo-google-fonts/montserrat`, chargées
par `expo-font`. Les fichiers sont embarqués dans le bundle : aucun appel à
Google Fonts à l'exécution, donc pas de fuite d'adresse IP vers un tiers ni de
dépendance réseau.

### D6 — Coquille et nom centralisé
- `src/config/app.ts` exporte `APP_NAME` (provisoire), `INDEPENDENCE_NOTICE`
  et `CONTACT`. C'est la seule source pour l'en-tête, « À propos », `<title>`
  et `og:title`.
- Routes : `(tabs)/index` (accueil provisoire, statut de santé visible en
  développement), `(tabs)/a-propos`. Sur le web, la navigation devient un
  en-tête avec liens et la mention est dans un pied de page ; sur mobile, une
  barre d'onglets.
- Composants : `Footer` (mention), `Title` (règle « un seul mot chamois » via
  une prop `highlight`).

### D7 — Qualité et tests
Les choix d'outillage sont consignés dans l'**ADR 0009** (Biome, `bun test`,
`jest-expo`, smoke test HTTP, GitHub Actions). En résumé :
- `packages/api` : `bun test` avec `appRouter.createCaller` (santé, validation,
  formatage des erreurs).
- `apps/app` : `jest-expo` + React Native Testing Library pour les composants
  (mention, nom centralisé, titres).
- **Smoke test web** (`scripts/smoke-web.ts`) : `expo export -p web`, serveur
  de production local, puis requêtes HTTP sans JavaScript sur `/`,
  `/a-propos` et `/api/trpc/health`. Il vérifie `lang="fr"`, `<title>`, les
  meta OG, la mention d'indépendance et la réponse de santé. C'est la preuve
  exécutable des exigences SSR, métadonnées et point d'accès.

### D8 — Contrôle de la documentation
`scripts/docs-check.ts` (Bun, sans dépendance hormis un parseur YAML) échoue si :
- un ADR a un frontmatter invalide ou incomplet, ou un `status` hors liste ;
- l'index `docs/decisions/README.md` ne liste pas exactement les fichiers
  `NNNN-*.md`, ou si son statut diffère du frontmatter ;
- les liens `supersedes` / `superseded-by` ne sont pas réciproques ;
- un lien Markdown relatif dans `docs/`, `AGENTS.md` ou les `AGENTS.md` de
  module est cassé ;
- un dossier de `.agents/skills/` n'a pas son symlink dans `.claude/skills/`
  (et inversement), ou un `SKILL.md` n'a pas de `name` ou de `description`.

## Risks / Trade-offs

- **[Bun + Metro]** Les installations isolées de Bun en workspaces peuvent
  empêcher Metro de résoudre les dépendances. → `install.linker = "hoisted"`
  dans `bunfig.toml`, plus un test de démarrage en CI (export web).
- **[SSR Expo Router]** Le rendu serveur peut encore être expérimental selon le
  SDK courant. → Vérifier son statut à la création du projet. S'il est trop
  instable, passer au pré-rendu `static` pour les pages, garder les API routes
  en `server`, et le consigner par un ADR qui remplace la partie concernée de
  l'ADR 0003.
- **[Uniwind et dernier SDK]** Compatibilité à confirmer avec la version
  d'Expo installée. → Le vérifier en premier (tâche 2). En cas de blocage,
  remonter le problème avant de changer de librairie, puisque c'est une
  décision ADR.
- **[Mention sur mobile]** Un pied de page permanent mange de la place sur
  petit écran. → Sur mobile, la mention figure dans « À propos » et en bas de
  la page d'accueil, conformément à la spec.
- **[Smoke test]** Le test lance un vrai serveur en CI, donc plus lent et plus
  fragile. → Délais explicites, un seul job, et aucune dépendance réseau
  externe.

## Migration Plan

Aucune migration : premier code du dépôt. Retour arrière par revert de la PR.

## Open Questions

- Version exacte du SDK Expo et de React Native : la dernière stable au moment
  de l'implémentation.
- Adresse de contact affichée dans « À propos » : provisoire, centralisée
  dans `src/config/app.ts`.
