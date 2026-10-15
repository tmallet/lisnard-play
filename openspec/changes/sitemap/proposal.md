## Why

L'indexation peut désormais être activée sur `play.projetlisnard.fr`. Sans plan du
site, les moteurs ne découvrent les interventions qu'en suivant les
liens depuis l'accueil, qui charge le flux page par page : la plupart des pages
resteraient longtemps inconnues.

## What Changes

- **`/sitemap.xml`** : plan du site au format Sitemaps, produit à la demande à partir de
  la base : pages fixes (accueil, campagne, à propos, mentions légales) et chaque
  intervention visible, avec leur date de mise à jour.
- **`/robots.txt`** : quand l'indexation est activée, il indique l'adresse du plan du
  site.
- Les adresses sont absolues et suivent le domaine par lequel le site est servi.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `app-shell` : l'exigence « Indexation par les moteurs de recherche » gagne le plan du
  site et sa mention dans `robots.txt`.

## Hors périmètre

- Pages de citation : leur HTML servi est le gabarit commun (titre générique) et leur
  adresse change à la régénération des résumés ; elles rejoindront le plan avec le rendu
  par requête.
- Métadonnées par intervention dans le HTML servi : elles attendent le rendu par requête
  du SDK 58 (ADR 0011).
- Déclaration dans Google Search Console : faite par l'exploitant.
- Plan du site découpé en plusieurs fichiers : inutile sous 50 000 adresses.

## Impact

- `apps/app` : route `/sitemap.xml`, `robots.txt` (`src/server/indexing.ts`).
- `packages/db` : lecture des adresses à publier (`read`), sans écriture (ADR 0017).
- Aucune nouvelle dépendance ni variable d'environnement.
