# Architecture

Description du système tel qu'il est construit. Le « pourquoi » des choix est
dans les [ADR](../decisions/README.md), le comportement attendu dans
[`openspec/specs/`](../../openspec/specs).

État : socle (change `setup-foundation`). La base de données, le worker
d'ingestion et le classifieur ne sont pas encore construits (ADR 0004 à 0007).

## Modules

```
lisnard-play/
├─ apps/app/            @lisnard/app : Expo Router (web, iOS, Android) + API routes
│  ├─ src/app/          routes (chaque fichier = un écran ; +api.ts = route API)
│  │  ├─ _layout.tsx    racine : CSS global, polices, ApiProvider, fond en dégradé
│  │  ├─ +html.tsx      document HTML web (lang, meta de base)
│  │  ├─ (tabs)/        navigation : index (accueil), a-propos
│  │  └─ api/trpc/[trpc]+api.ts   point d'accès tRPC
│  ├─ src/components/   Title, Footer, Screen, PageHead, AppNavigation(.web), HealthStatus
│  ├─ src/config/app.ts identité : APP_NAME, mentions, contact (source unique)
│  ├─ src/lib/          client tRPC (trpc.tsx), URL de l'API (api-url.ts)
│  ├─ src/theme/        chargement des polices
│  └─ src/global.css    Tailwind + Uniwind + tokens de la charte
├─ packages/api/        @lisnard/api : routeur tRPC, contexte, procédures
├─ scripts/             docs-check.ts, smoke-web.ts
├─ .devcontainer/       environnement reproductible + pare-feu (ADR 0010)
└─ docs/                ADR, architecture
```

## Flux d'une requête web

```
Navigateur ── GET /a-propos ─────────▶ serveur Expo ── HTML pré-rendu (dist/server)
    │                                                    lang="fr", <title>, OG, mention
    │  hydratation (bundle JS)
    └── GET /api/trpc/health ────────▶ API route [trpc]+api.ts
                                          └─ fetchRequestHandler(appRouter, createContext)
                                               └─ procédure health → { status, version, time }
```

En SDK 57, les pages sont **pré-rendues au build** (`web.output: "server"`) et
les API routes sont servies dynamiquement. Le SSR par requête arrivera avec le
SDK 58 (ADR 0011).

Sur mobile, le client appelle `${EXPO_PUBLIC_API_URL}/api/trpc`. En
développement, il passe par l'hôte de Metro (`src/lib/api-url.ts`).

## Contrat tRPC

- `@lisnard/api` exporte `appRouter`, le type `AppRouter`, `createContext` et `createCaller`.
- Le client importe **uniquement le type** `AppRouter` : aucun code serveur
  dans le bundle.
- `errorFormatter` (`packages/api/src/trpc.ts`) : hors développement, pas de
  pile d'appels, message générique pour les erreurs internes, erreurs zod
  aplaties dans `data.zodError`.
- Garde-fou de typage : `apps/app/src/lib/api-contract.typecheck.ts`.

## Style et charte

- Tokens dans `apps/app/src/global.css` (`@theme`) : `bleu`, `bleu-sombre`,
  `chamois`, `blanc`, `emeraude`, `font-sans[-semibold|-bold|-extrabold]`.
- Le dégradé de fond est géré nativement par Uniwind
  (`bg-linear-160 from-bleu to-bleu-sombre`), sans dépendance supplémentaire.
- Montserrat est embarquée via `@expo-google-fonts/montserrat`, sans appel
  réseau à Google.
- Règles de la charte : skill `charte-ui`, ADR 0001.

## Qualité

Voir [commandes.md](commandes.md). `bun run check` est la commande de référence
(ADR 0009), la CI la complète par le smoke test web.
