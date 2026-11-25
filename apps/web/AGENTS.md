# apps/web — @lisnard/web

Site Astro rendu par le serveur à chaque requête (ADR 0037), qui remplace `apps/app` à
la bascule (change `migrate-web-astro`). Il sert aussi l'API tRPC. Vue d'ensemble :
[docs/architecture/README.md](../../docs/architecture/README.md).

## Principes

- **Lisible sans JavaScript.** Toute page rend son contenu dans le HTML, hors
  `<noscript>`. Filtres, pagination, recherche et vues passent par l'adresse (liens et
  formulaires `GET`). Un îlot ne fait qu'ajouter une fonction à un contenu déjà là. Toute
  action d'un îlot est d'abord un lien qui mène quelque part sans JavaScript (affiche du
  lecteur, minutage d'une citation, partage d'une image).
- **Métadonnées rendues par la page** : `Base.astro` reçoit titre, description,
  canonique, image et données structurées (`Seo.astro`, `lib/seo.ts`). Adresses
  absolues sur `siteOrigin()` (`SITE_URL`), jamais sur l'origine de la requête.
- **Données côté serveur** : `api(Astro.request)` (`src/server/api.ts`) appelle les
  procédures de `packages/api` dans le processus (`createCaller`). Jamais de lecture
  directe de la base dans une page (règles d'exposition portées par les procédures,
  ADR 0017), sauf le plan du site. `isNotFound(error)` : `Astro.rewrite('/404')`. Une
  autre erreur ne doit jamais donner une page vide en 200 (elle serait indexée).
- **Îlots** (`src/islands/`, React) : `client:idle` pour ce qui doit répondre vite
  (lecteur, citations), `client:visible` pour le reste. Ils reçoivent leurs données
  initiales en props et appellent `/api/trpc` par `ApiProvider` (`lib/trpc.tsx`, un
  client partagé par les îlots d'une page). Les îlots d'une page ne partagent pas d'état
  React : ils communiquent par évènements (`lib/player.ts`).
- **Premier rendu identique** côté serveur et navigateur (pas d'écart d'hydratation) :
  ce qui dépend du navigateur (abonnement push, largeur mesurée) arrive dans un effet.

## Structure

| Chemin | Rôle |
|--------|------|
| `src/pages/` | Routes : pages `.astro` et endpoints `.ts` (images, `sitemap.xml`, `robots.txt`, `manifest`, `api/trpc/[...trpc]`, `admin/[...path]`) |
| `src/layouts/Base.astro` | Document commun : `lang="fr"`, `html.js` posé en tête, repli des miniatures (`data-fallback`), en-tête, mention d'indépendance, pied de page, Umami, `PushLifecycle` |
| `src/components/` | `.astro` rendus par le serveur ; `.tsx` partagés avec les îlots (`InterventionCard`, `Join`, `ShareButtons`, `PlayIcon`) ; `campaign/` : vues de la page Campagne |
| `src/islands/` | Îlots hydratés : `LiveSections`, `PastSection`, `PlayerConsent`, `QuotesBlock`, `DescriptionBlock`, `QuoteActions`, `MembershipView`, `TravelsMap`, `RecapShare`, `NotificationSettings`, `PushLifecycle` |
| `src/lib/` | Modules purs (formats, filtres, SEO, récapitulatifs, carte, chronologie) et clients navigateur (tRPC, Web Push, partage) |
| `src/server/` | Serveur seulement : `api.ts` (appel des procédures, connexion partagée sur `globalThis`, ADR 0019), `images.ts` (satori, resvg, polices @fontsource), `quote-card.ts`, `recap-card.ts`, `indexing.ts`, `admin-relay.ts`, `sitemap.ts`, `site.ts` |
| `src/middleware.ts` | `X-Robots-Tag` (sans `ALLOW_INDEXING=true`, hors du domaine de `SITE_URL`, et toujours sur une 404) et `Cache-Control` court des pages HTML |
| `src/config/` | `identity.json` (**source unique** du nom), `app.ts`, `join.ts`, `legal.ts`, `analytics.ts`, `navigation.ts` |
| `src/styles/global.css` | Tailwind 4, tokens de la charte (`@theme`), graisses `font-sans-*`, variante `js:` |
| `server.mjs` | Serveur de production : gestionnaire de l'adaptateur Node (mode autonome, sans son serveur), `X-Robots-Tag` aussi sur les fichiers statiques |

## Conventions

- **Style** : classes Tailwind avec les tokens de la charte (`bg-bleu-sombre`,
  `text-chamois`, `font-sans-extrabold`…). Valeurs JS (SVG, images, manifeste) :
  `src/theme/colors.ts`. Jamais de code hex ni de police en dur. Skill `charte-ui`.
- **Variante `js:`** : ce qui n'a de sens qu'avec JavaScript (bouton « Filtres »,
  description repliée, « Partager » d'une citation) est `hidden js:flex` ; ce qui est
  replié seulement avec JavaScript est `js:max-md:hidden`, `js:line-clamp-4`.
- **Lecteurs tiers** : toujours `PlayerConsent` (clic pour charger, ADR 0022).
- **Presse** (ADR 0021) : métadonnées seulement, jamais de résumé ni de texte d'article.
- **Polices** : Montserrat de `@fontsource` (woff2 pour le site, woff pour les images).
  Elle n'a ni « ▶ » ni emoji : `PlayIcon` dans les pages, `playIcon` dans les images.
- **Ajout d'une procédure** : skill `trpc-procedure`.

## Tests

- `bun --filter @lisnard/web test` : Vitest. Modules purs ; composants `.astro` par
  l'API Container ; îlots sous happy-dom (en-tête `// @vitest-environment happy-dom`),
  API simulée par `fakeApi()` (`src/test/trpc.ts`).
- `bun run smoke:web` : build de production, serveur et base jetable, vérifications
  HTTP sans JavaScript (contenu hors `<noscript>`, pagination, redirections, en-têtes).

## Pièges

- **Runtime Bun obligatoire** (`Bun.sql`) : `bun run dev:web`, `bun --bun astro build`,
  `bun --bun server.mjs`. Sous Node : « Cannot find package 'bun' ».
- **Types de Vite dédoublés** (Astro, `@tailwindcss/vite`, Vitest) : conversion `as never`
  commentée dans `astro.config.ts` et `vitest.config.ts`, compatible à l'exécution.
- **Fichiers statiques** : servis avant le middleware d'Astro ; ce qui doit valoir pour
  eux aussi (en-têtes) se règle dans `server.mjs`.
- **Hydratation** `client:visible` : un clic avant l'hydratation suit le lien de repli.
  C'est voulu ; dans un test de navigateur, attendre qu'il n'y ait plus d'`astro-island[ssr]`.
