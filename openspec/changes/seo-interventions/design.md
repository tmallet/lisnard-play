## Context

Voir `proposal.md`. La technique est celle de l'ADR 0030 (réécriture de l'en-tête par
`HTMLRewriter` dans `server.ts`) ; la décision durable est l'ADR 0036.

## Decisions

- **Réutiliser `withPageMeta`** : `PageMeta` gagne `ogType` et `body` ; la fonction accepte
  un statut. Les pages de citation et de récapitulatif restent inchangées.
- **Titre et description dans `lib/intervention-meta.ts`**, partagés avec `PageHead` pour que
  navigateur et robots voient la même chose (comme `quote-meta.ts`).
- **Lecture par l'API interne** (`interventions.byId`) : 404 tRPC devient 404 HTTP ; une
  erreur de l'API laisse le gabarit sans changement et en 200, pour ne pas désindexer à tort.
- **Presse** : titre, média et date seulement ; le résumé n'est repris que si le rendu est un
  lecteur intégré (ADR 0021).
- **Texte sans JavaScript dans `<noscript>`** : sans risque pour l'hydratation du gabarit.
- **JSON-LD** sérialisé avec `<`, `>` et `&` échappés.
- **Image** : miniature `https` de la vidéo, sinon l'icône de l'application, avec la carte
  `summary` plutôt que `summary_large_image`.

## Risks / Trade-offs

- Une lecture d'intervention par page servie, comme pour les citations (ADR 0030).
- Le contenu `<noscript>` n'est pas visible : il sert aux robots, la page réelle reste celle
  rendue par le client.
