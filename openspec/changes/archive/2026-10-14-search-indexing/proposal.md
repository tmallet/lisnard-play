## Why

Le porteur du projet veut un premier déploiement sur Coolify sans que le site
apparaisse dans les moteurs de recherche, tant qu'il n'est pas prêt à être rendu
public. L'indexation doit pouvoir s'activer plus tard par une simple variable
d'environnement, sans reconstruire l'image.

## What Changes

- Le serveur de production bloque l'indexation par défaut :
  - en-tête `X-Robots-Tag: noindex, nofollow` sur toutes les réponses (pages,
    fichiers, API) ;
  - `/robots.txt` qui interdit tout (`Disallow: /`).
- La variable `ALLOW_INDEXING=true` lève ce blocage : plus d'en-tête, et un
  `robots.txt` qui autorise tout.
- Le smoke test vérifie le comportement par défaut. La documentation de
  déploiement décrit la variable.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell` : ajout d'une exigence sur l'indexation par les moteurs de
  recherche, désactivée par défaut et activable par configuration.

## Impact

- `apps/app/server.ts` et un petit module `indexing.ts`, avec ses tests.
- `scripts/smoke-web.ts`.
- `docs/architecture/deploiement.md`, `docs/architecture/commandes.md`,
  `.env.example`.
- Aucun impact sur les apps mobiles ni sur l'API (hors en-tête).

## Hors périmètre

- Plan du site (`sitemap.xml`) et métadonnées d'indexation fines par page : à
  traiter au lancement public, avec le SSR du SDK 58 (ADR 0011).
- Protection d'accès (mot de passe) : le site reste consultable par qui connaît
  l'adresse.
