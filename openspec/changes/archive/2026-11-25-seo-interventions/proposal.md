## Why

Le plan du site liste environ 1 770 pages d'intervention, mais le HTML servi est le même
gabarit pour toutes : même titre (« Intervention · Lisnard Play »), même description, même
H1, aucune adresse canonique, aucune donnée structurée, aucune image d'aperçu. Pour Google,
ce sont des quasi-doublons ; pour les robots d'IA, qui n'exécutent pas le JavaScript, les
pages sont vides. L'accueil n'a ni canonique, ni carte Twitter, ni image, ni JSON-LD.

## What Changes

- Les pages `/interventions/<id>` servent un en-tête propre à l'intervention : titre daté,
  description tirée de ses données, adresse canonique, Open Graph, carte Twitter et JSON-LD
  (`VideoObject` pour une vidéo, `WebPage` pour un lien vers la presse).
- Le HTML contient aussi le titre, la description et, pour une vidéo seulement, le résumé
  et ses points, dans un `<noscript>` lisible sans JavaScript.
- Une intervention inconnue ou masquée répond HTTP 404 (le gabarit reste servi pour l'écran
  « Intervention introuvable »).
- L'accueil gagne une adresse canonique, une carte Twitter, une image d'aperçu et un JSON-LD
  `WebSite` et `Organization` qui reprend la mention d'indépendance.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `app-shell` : métadonnées de l'accueil et des pages d'intervention, 404 réel.

## Impact

- `apps/app` : `server.ts`, `src/server/intervention-page.ts`, `src/lib/intervention-meta.ts`
  (titre et description partagés avec la page), `withPageMeta` étendu (type Open Graph,
  texte `<noscript>`, statut).
- Aucun changement d'API, de base ni de dépendance. Presse (ADR 0021) : métadonnées seulement.

## Hors périmètre

- Métadonnées des pages Campagne, À propos et Mentions légales.
- Image d'aperçu propre à chaque intervention (la miniature de la vidéo est utilisée).
- Rendu serveur complet (SDK 58, ADR 0011).
