## Context

Voir `proposal.md` pour la motivation. La règle du format, son seuil et le choix de ne
pas utiliser `kind` sont dans l'ADR 0033. `listPublished` filtre déjà par thème en SQL,
avec un curseur sur la date ; l'accueil lance une requête par section, et `ThemeFilter`
porte l'état du filtre dans `InterventionFeed`.

## Goals / Non-Goals

**Goals :**
- Un seul endroit pour la règle du format, côté lecture.
- Aucune migration ni reprise de données.

**Non-Goals :**
- Exposer le format dans la réponse de l'API : aucun écran ne l'affiche.

## Decisions

- **Filtre SQL dans `packages/db/src/read.ts`** : une condition par format, avec la
  constante du seuil à côté. Une colonne calculée n'apporterait rien : le volume reste
  faible, et elle figerait le seuil dans une migration.
- **L'API filtre pour tout statut, l'accueil ne passe le format qu'à « Passées »** : le
  contrat reste simple, et la règle « directs toujours visibles » reste une règle d'écran.
- **Composant de pastilles commun** : `ThemeFilter` devient un composant générique, avec
  ses options et son libellé d'accessibilité, utilisé pour les deux rangées. Deux copies
  des mêmes styles se désaligneraient.
- **État local, comme le thème** : un second `useState` dans `InterventionFeed`, ajouté à
  la clé de la requête « Passées », ce qui repart de la première page.

## Risks / Trade-offs

- [Un lien peut mener à une vidéo sur le site du média : au moins 30 des 70 liens hors
  `presse` en production] → Pastille « Presse et médias » plutôt qu'« Articles » (ADR 0033).
- [Deux rangées de pastilles repoussent le flux sur téléphone] → Rangée courte de quatre
  pastilles, à vérifier à 375 px.
- [Le seuil de 5 minutes vieillit si la chaîne change de formats] → Constante unique,
  changement consigné par un nouvel ADR.
