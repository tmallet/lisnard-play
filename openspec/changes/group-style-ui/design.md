## Context

Mise en forme reprise des sites du collectif Projet Lisnard, logo compris : voir
l'ADR 0034. Charte inchangée (ADR 0001, 0012).

## Decisions

- **Filtres dans l'adresse** : `useUrlFilter` (`apps/app/src/lib/`). Sur le web, la valeur
  est lue après le montage, car le HTML est pré-rendu (ADR 0011), puis réécrite par
  `history.replaceState`. Sur mobile, simple état en mémoire.
- **Repli sur téléphone** : bouton visible sous 768 px seulement (`md:hidden`) ; le
  panneau reste ouvert dès 768 px.
- **Animations** : transitions de 200 ms au plus, aucune sur le défilement, coupées par
  `motion-reduce`.
