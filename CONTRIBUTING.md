# Contribuer

- **Branches** : en anglais, concises, `change/<subject>`, `fix/<subject>` ou `docs/<subject>` (ex. `change/feed-format-filter`).
- **Commits** : en anglais, concis, Conventional Commits avec portée (ex. `feat(feed): filter past interventions by format`).
- **Description de PR** : en français, liste à puces de ce qui est fait, rien d'autre.
- **Validation** : toute PR doit être validée par quelqu'un d'autre que son auteur avant fusion, et `bun run check` doit passer.
- **Versions** : respecter les versions en place ; les mettre à jour pour une raison de sécurité ou de pertinence technique.
- **Sécurité** : aucune clé ni secret dans le dépôt, aucune faille introduite.

Exemple de description :

```
- Ajoute le filtre par format sur les interventions passées
- Corrige les sections de directs qui disparaissaient pendant le chargement
```
