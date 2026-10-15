## Context

Motivation : `proposal.md`. Décision durable : ADR 0025, qui complète l'ADR 0001.

## Decisions

### D1 — Configuration

`apps/app/src/config/join.ts` : URL de parrainage, libellés et mention de
transparence, en un seul endroit. Changer de lien (lien neutre, autre parrain) ne
touche que ce fichier.

### D2 — Composant `JoinCta`

- Encart `rounded-xl border border-chamois/40 bg-bleu/60 p-5` :
  - titre « Vous partagez ces idées ? » (Montserrat 800, « idées » en chamois) ;
  - une phrase d'accroche ;
  - bouton plein chamois « Adhérer à Nouvelle Énergie ↗ » ;
  - sous le bouton, en `blanc/70` : « Site du parti, ouvert dans un nouvel onglet.
    Lien de parrainage de l'éditeur : votre adhésion lui sera rattachée. »
- **Ouverture** : `Linking.openURL`, comme les autres liens sortants (nouvel onglet
  sur le web, navigateur sur mobile). Aucun paramètre ni événement de suivi.

### D3 — Emplacements

- **Accueil** : dans `InterventionFeed`, avant la section « Passées », une fois le
  chargement terminé et en l'absence d'erreur. Placer l'encart plus bas le rendrait
  inaccessible, à cause du chargement continu.
- **Détail** : en fin de contenu, après le lien vers la source.

### D4 — Mentions légales

Section « Contenus » : le bouton d'adhésion est un lien de parrainage de
l'éditeur ; le site reste indépendant du parti.

## Risks / Trade-offs

- **[Anonymat de l'éditeur]** : la page de parrainage affiche son prénom et son
  initiale. C'est un choix de l'éditeur, consigné dans l'ADR 0025.
- **[Perception d'affiliation]** : un bouton vers le parti peut faire croire à un
  site officiel. La mention d'indépendance et le libellé « site du parti » le
  limitent.
