## Context

Voir `proposal.md` pour la motivation, et l'ADR 0037 pour la décision durable : abandon du
mobile, Astro en SSR, îlots React, données par `createCaller`.

État actuel de `apps/app` :
- Expo Router SDK 57, environ 8 000 lignes, une douzaine de routes et une soixantaine de
  composants React Native, dont une quinzaine en double `.web.tsx`.
- `server.ts` (`Bun.serve`) concentre ce qu'Expo ne sait pas faire :
  - relais `/admin` (ADR 0032) ;
  - politique d'indexation (`X-Robots-Tag`, `robots.txt`) ;
  - images de citation et de récapitulatif (satori et resvg, ADR 0029) ;
  - réécriture de l'en-tête des pages de citation, d'intervention, de récapitulatif et
    de l'accueil (ADR 0030, 0031, 0036) ;
  - fichiers statiques.
- `public/` contient `sw.js` (Web Push), les icônes et le fichier de vérification Google.

La logique pure de `src/server/` (`share.ts`, `intervention-page.ts`, `quote-card.ts`,
`indexing.ts`, `sitemap.ts`) et de `src/lib/` (`intervention-meta.ts`, `format.ts`…) ne
dépend pas de React Native : elle se reprend telle quelle.

## Goals / Non-Goals

**Goals :**
- Parité fonctionnelle avec le site actuel, hors comportements mobiles retirés (specs du
  change).
- Même HTML de référencement qu'aujourd'hui, au minimum, avec le contenu dans le corps de
  la page.
- Bascule sans interruption ni changement d'adresse, avec retour arrière possible.

**Non-Goals :**
- Refonte visuelle : on reproduit la charte et les mises en page actuelles (skill
  `charte-ui`).
- Optimisation fine des performances au-delà de ce que donne le passage aux îlots.

## Decisions

### Nouvel espace `apps/web`, construit à côté de `apps/app`

Le site Astro naît dans `apps/web` (`@lisnard/web`), pendant que `apps/app` reste en
production. On le déploie sur une adresse de prévisualisation non indexée, on vérifie la
parité, puis le domaine bascule sur le nouveau service. `apps/app` est supprimé ensuite.
- *Alternative écartée : réécrire `apps/app` sur place.* Le site serait cassé pendant toute
  la migration, sans comparaison possible avec l'existant.
- *Alternative écartée : migrer page par page derrière le même domaine.* Il faudrait un
  routage par chemin dans le proxy Coolify, et deux coquilles (en-tête, navigation)
  coexisteraient. Trop de complexité pour une douzaine de routes.

### Correspondance des routes

| Actuel (Expo / `server.ts`) | Astro (`apps/web/src/pages`) |
|---|---|
| `(tabs)/index.tsx` + `withPageMeta` accueil | `index.astro` (`?theme`, `?format`, `?avant=<curseur>`) |
| `(tabs)/campagne.tsx` + méta récap | `campagne.astro` (`?vue`, récapitulatifs) |
| `(tabs)/a-propos.tsx`, `mentions-legales.tsx`, `notifications.tsx` | `.astro` du même nom |
| `adhesions.tsx` | redirection 301 dans `astro.config` (`redirects`) |
| `interventions/[id].tsx` + méta | `interventions/[id].astro` (404 par `Astro.response.status`) |
| `interventions/[id]/citation/[t].tsx` + méta | `interventions/[id]/citation/[t].astro` |
| images `image.png`, `apercu.png`, récap | endpoints `.png.ts` sous les mêmes chemins |
| `sitemap.xml+api.ts`, `manifest+api.ts`, `robots.txt` | endpoints `sitemap.xml.ts`, `manifest.ts`, `robots.txt.ts` |
| `api/trpc/[trpc]+api.ts` | `api/trpc/[...trpc].ts` (`fetchRequestHandler`) |
| relais `/admin` | endpoint `admin/[...path].ts` qui reprend `admin-relay.ts` |
| `withIndexingPolicy` | middleware Astro (`src/middleware.ts`) sur toute réponse |

La pagination sans JavaScript utilise le curseur déjà renvoyé par la procédure de liste
(paramètre d'adresse `avant`). L'îlot de chargement continu repart de ce même curseur.

### Mise en page et îlots

- Une mise en page `Base.astro` porte l'en-tête, la mention d'indépendance, le pied de
  page, Umami et le composant `Seo.astro`. Ce dernier reçoit titre, description,
  canonique, image et JSON-LD, calculés par les modules existants (`intervention-meta`,
  `quote-meta`, `intervention-page`).
- Îlots React (`client:visible` par défaut, `client:idle` pour la cloche) :
  - chargement continu des interventions passées ;
  - recherche instantanée (sans JavaScript, le formulaire `GET` mène à la même page) ;
  - rafraîchissement « En direct » et « À venir » ;
  - lecteur après consentement (ADR 0022) ;
  - carte des déplacements et graphique des adhésions : SVG rendu par le serveur,
    l'îlot n'ajoute que l'interaction ;
  - notifications (`PushLifecycle`, `NotificationSettings`) ;
  - partage en image et sur X ;
  - repli des filtres sur téléphone (sans JavaScript, ce sont des liens).
- Les îlots appellent `/api/trpc` avec le client tRPC et TanStack Query existants. Un
  `QueryClient` est créé par îlot, et la page leur passe les données initiales en props
  (pas de second appel au chargement).

### Données côté serveur

`packages/api` exporte une fabrique d'appel serveur (`createCaller` avec le contexte de
`context.ts`). Le contexte reçoit la `Request` d'Astro, pour l'IP (limites de débit) et
l'origine. Une `TRPCError` `NOT_FOUND` devient un 404 de page. Une autre erreur donne
une page d'erreur 500 sans détail (ADR 0013), jamais un 200 vide qui serait indexé.

La connexion partagée sur `globalThis` (ADR 0019) reste valable : le serveur de
développement Vite réévalue aussi les modules.

### Runtime

- Production : `bun --bun ./dist/server/entry.mjs` (adaptateur `@astrojs/node`, mode
  `standalone`).
- Développement : `bun --bun astro dev`.
- `@resvg/resvg-js` et `bun` sont déclarés externes à Vite pour le SSR
  (`vite.ssr.external`). Le module `bun` reste importé tel quel, sans shim.
- La première tâche vérifie ce montage (lecture en base, image PNG, Web Push) avant toute
  réécriture d'écran.

### Polices

Montserrat 400, 600 et 700 en fichiers `woff2` servis par le site (`@fontsource`, ou les
fichiers actuels convertis), avec `font-display: swap` et un préchargement de la graisse
du corps de texte. Les TTF restent utilisés par satori pour les images. Aucun CDN (ADR 0013,
remplacé pendant le change).

### Tests

- Vitest dans `apps/web` :
  - modules purs repris de `src/server` et `src/lib` ;
  - pages `.astro` rendues par l'API Container d'Astro ;
  - îlots avec Testing Library React sous happy-dom.
- `bun test` reste en place pour `packages/*` et le worker.
- `scripts/smoke-web.ts` vise le build Astro et ajoute des vérifications : contenu
  d'intervention hors `<noscript>`, pagination sans JavaScript, 301 `/adhesions`,
  canonique de l'accueil filtré.
- Contrôle de parité avant la bascule : un script compare, pour un échantillon d'adresses
  du plan du site, le statut, le titre, la canonique et le JSON-LD de l'ancien et du
  nouveau service.

### Retrait d'Expo Push

- `packages/api` : la variante `expo` disparaît de l'entrée d'abonnement.
- Worker : suppression de l'envoi Expo et de `EXPO_ACCESS_TOKEN`.
- `packages/db` : une migration supprime les abonnements `expo`, puis la valeur de
  l'enum `push_kind` (recréation de l'enum, car Postgres ne retire pas une valeur). La
  production ne devrait en contenir aucun : l'option n'a jamais été visible sans projet EAS.

## Risks / Trade-offs

- [Astro sous le runtime Bun : incompatibilité de l'adaptateur Node] → vérifiée dès la
  première tâche. En cas d'échec, `Bun.serve` peut appeler le `handler` de l'adaptateur
  en mode `middleware`. Le recours à un adaptateur Bun communautaire exigerait un ADR.
- [Lectures en base à chaque page, notamment par les robots] → requêtes déjà indexées.
  `Cache-Control: public, max-age=60, stale-while-revalidate=300` sur les pages
  publiques, pour un futur cache.
- [Écarts visuels en passant de React Native Web au HTML] → captures Playwright
  comparées sur l'accueil, une intervention et une citation, à 375 px et 1280 px, avant
  la bascule.
- [Hydratation incohérente des îlots (dates relatives, heure locale)] → dates formatées
  en `Europe/Paris` côté serveur. Le relatif (« il y a 5 min ») n'est calculé que dans
  les îlots.
- [Régressions de référencement à la bascule] → script de parité, mêmes adresses et
  canoniques. Surveillance de la Search Console pendant deux semaines.
- [Taille du change] → découpage en tâches livrables séparément sur la prévisualisation.
  Seule la bascule est atomique.

## Migration Plan

1. Construire `apps/web` et son service Coolify de prévisualisation (`ALLOW_INDEXING`
   absent, donc `noindex`), branché sur la même base en lecture.
2. Atteindre la parité : smoke test, script de parité et captures au vert.
3. Bascule : le domaine `play.projetlisnard.fr` passe au service `web`, puis on active
   `ALLOW_INDEXING=true`. Le relais `/admin` et `/api/trpc` suivent, car ils sont servis
   par le même service.
4. Retrait d'Expo Push : migration de base et code du worker, déployés après la bascule.
5. Observation pendant deux semaines (erreurs, Search Console, Umami).
6. Suppression d'`apps/app`, de son Dockerfile et de son service Coolify.

**Retour arrière** : jusqu'à l'étape 6, on remet le domaine sur l'ancien service `app`.
Il reste déployé, mais arrêté. L'API ne change pas de contrat avant l'étape 4, donc les
deux services restent compatibles avec la base.
