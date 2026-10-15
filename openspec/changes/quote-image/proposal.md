## Why

Une citation se partage aujourd'hui par un lien, dont l'aperçu reste générique tant que
les pages ne sont pas rendues à la demande (ADR 0011). Sur Instagram, WhatsApp ou X, ce
qui circule, ce sont des images : une citation mise en forme, lisible sans cliquer, avec
l'adresse du site, est le meilleur moyen de faire connaître le site.

## What Changes

- **Image d'une citation** : `/interventions/<id>/citation/<secondes>/image.png`, une
  image carrée de 1080 × 1080 aux couleurs de la charte. Elle montre la citation en
  grand, « David Lisnard », le média et la date, le thème, l'adresse du site et la
  mention d'indépendance. Ni logo, ni photo, ni miniature de la vidéo (ADR 0001, 0007).
- **Bouton « Partager en image »** sur la page d'une citation et dans la section
  « Citations » de l'écran de détail :
  - sur mobile, la feuille de partage du système avec l'image ;
  - sur le web, le partage du navigateur quand il accepte les fichiers, sinon le
    téléchargement.
- Nouvel ADR 0029 : image produite par le serveur (satori et resvg), nouvelles
  dépendances.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `intervention-quotes` : nouvelle exigence « Partage d'une citation en image ».

## Hors périmètre

- Format paysage (1200 × 630) et stories (1080 × 1920) : une seule image carrée, qui
  passe sur tous les réseaux. Un second format pourra s'ajouter sans changer le reste.
- Image dans les aperçus de lien (`og:image`) : il faut le rendu par requête du SDK 58
  (ADR 0011). L'adresse de l'image servira alors telle quelle.
- Image d'une intervention entière ou du résumé.

## Impact

- `apps/app` :
  - production de l'image (`src/server/`), servie par le serveur de production
    (`server.ts`) ;
  - bouton de partage ;
  - dépendances `satori`, `@resvg/resvg-js`, `expo-sharing`, `expo-file-system`.
- `packages/db` : lecture de la citation existante (`getQuoteAt`), sans écriture
  (ADR 0017).
- Coût : aucun appel payant ; environ 0,1 à 0,3 s de calcul par image, mise en cache.
