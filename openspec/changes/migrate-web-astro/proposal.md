## Why

L'application vise le web, iOS et Android (ADR 0002), mais les builds mobiles n'ont jamais
été produits : les notifications mobiles attendent toujours EAS (ADR 0024). Le mobile coûte
pourtant au quotidien : React Native Web, des composants `.web.tsx` en double, jest-expo,
le shim Metro (ADR 0019). Surtout, Expo SDK 57 ne sait pas rendre une page à chaque requête
(ADR 0011). Le référencement repose donc sur une réécriture de l'en-tête dans `server.ts`
(ADR 0030 et 0036), et le contenu lisible par les robots d'IA, qui n'exécutent pas le
JavaScript, se limite à un `<noscript>`. Le projet abandonne définitivement le mobile
natif (ADR 0037) et devient un site web rendu par le serveur.

## What Changes

- **BREAKING** : suppression définitive des applications iOS et Android. Il n'y aura ni
  publication sur les stores ni build EAS. Le site web, installable en PWA, est le seul client.
- **BREAKING** : `apps/app` (Expo Router, React Native, Uniwind) est remplacé par un site
  Astro rendu par le serveur à chaque requête, avec des îlots React pour l'interactivité
  (ADR 0037).
- Chaque page sert un HTML complet : contenu principal dans le corps de la page,
  métadonnées, adresse canonique, JSON-LD. La réécriture de l'en-tête et le texte
  `<noscript>` disparaissent.
- La lecture fonctionne sans JavaScript : flux, détail, citations, filtres par l'adresse,
  pagination par liens. Le JavaScript ajoute le lecteur après consentement, la recherche
  instantanée, le rafraîchissement des directs, les notifications et le partage.
- Les adresses publiques ne changent pas : `/`, `/interventions/<id>`, citations, images
  de partage, `/campagne`, `/a-propos`, `/mentions-legales`, `/notifications`,
  `/sitemap.xml`, `/robots.txt`, `/api/trpc`, `/admin`, et la redirection `/adhesions`.
- **BREAKING** : notifications par Web Push seulement. Expo Push disparaît des
  abonnements (API), de l'envoi (worker) et de la configuration (`EXPO_ACCESS_TOKEN`).
- Les comportements propres au mobile sont retirés des specs : feuille de partage native,
  barre d'onglets, schéma `twitter://`, vue web.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `app-shell` : site web seul, rendu par le serveur à chaque requête, contenu lisible sans
  JavaScript, stabilité des adresses, métadonnées SEO dans la page (sans `<noscript>`).
- `api-transport` : clients navigateur seulement, rendu serveur appelant les mêmes
  procédures sans passer par HTTP.
- `push-notifications` : Web Push seulement, plus de jeton Expo.
- `intervention-feed` : fraîcheur au retour sur l'onglet du navigateur, filtres et
  pagination portés par l'adresse.
- `intervention-media` : lecteur en iframe seulement.
- `intervention-quotes` : partage en image par le navigateur seulement.
- `membership-timeline` : onglet « Campagne » dans l'en-tête seulement.

## Impact

- `apps/app` : réécrit (environ 8 000 lignes, une douzaine de routes, une soixantaine de
  composants), dans un nouvel espace `apps/web`, puis supprimé après la bascule.
- `packages/api` : abonnement sans variante `expo`. Ajout d'un appel serveur direct
  (`createCaller`) pour le rendu des pages.
- `packages/db` : migration qui retire la valeur `expo` de `push_kind` et les éventuels
  abonnements Expo.
- `apps/worker` : retrait de l'envoi Expo Push et de `EXPO_ACCESS_TOKEN`.
- `apps/admin` : inchangé (Vite et Refine, déjà indépendant d'Expo). Le relais `/admin`
  passe dans le nouveau site.
- Outillage : Vitest remplace jest-expo pour le site. Smoke test web et CI adaptés.
  Dockerfile et service Coolify de l'application refaits.
- ADR : 0037 remplace 0002. ADR à remplacer pendant la mise en œuvre : 0009 (tests),
  0011 (rendu), 0013 (polices embarquées), 0015 (image du service web), 0019 (Metro),
  0024 (Expo Push),
  0030 et 0036 (réécriture de l'en-tête).
- Prérequis : les changes `seo-interventions`, `feed-format-filter` et `group-style-ui`
  sont archivés avant celui-ci, car il modifie les exigences qu'ils ajoutent.

## Hors périmètre

- Toute évolution fonctionnelle : nouveaux écrans, pages par thème indexables, nouveau
  design. La migration vise la parité, hors comportements mobiles retirés.
- Le worker, en dehors du retrait d'Expo Push ; la classification, la collecte, les résumés.
- Le backoffice (`apps/admin`), en dehors de son relais.
- Un CDN ou un cache HTTP devant le site.
- Un client mobile futur sous quelque forme que ce soit : l'abandon est définitif (ADR 0037).
