---
id: "0025"
title: Invitation à adhérer à Nouvelle Énergie par le lien de parrainage de l'éditeur
status: accepted
date: 2026-10-14
tags: [produit, ui, independance, juridique]
supersedes: null
superseded-by: null
related-specs: [app-shell]
related-changes: [join-cta]
---

# 0025 — Invitation à adhérer à Nouvelle Énergie par le lien de parrainage de l'éditeur

## Contexte

Le site est une initiative indépendante de soutiens (ADR 0001). Il n'offrait
jusqu'ici aucun moyen de passer à l'action. L'éditeur souhaite inviter les
visiteurs à adhérer à Nouvelle Énergie, avec son propre lien de parrainage : la
page du parti affiche alors son prénom et son initiale, et lui rattache les
adhésions.

## Décision

- **Encart d'invitation** sur l'accueil et sur la page d'une intervention : un
  bouton « Adhérer à Nouvelle Énergie » ouvre le site du parti hors de l'app.
- **Lien de parrainage de l'éditeur**, signalé sous le bouton et dans les mentions
  légales : le visiteur sait à qui son adhésion sera rattachée.
- **Indépendance préservée** :
  - charte de l'app uniquement, sans logo ni visuel du parti ;
  - libellé « site du parti » ;
  - mention d'indépendance inchangée ;
  - aucune collecte d'argent sur le site.
- **Aucun traceur** sur le lien ou sur le clic (ADR 0022).

## Alternatives écartées

- **Lien d'adhésion neutre** : il préserve mieux l'anonymat de l'éditeur
  (ADR 0022), mais l'éditeur a choisi le parrainage, en connaissance de cause.
- **Bouton permanent dans l'en-tête** : trop insistant pour un site d'information.

## Conséquences

- L'anonymat de l'éditeur est réduit : la page de parrainage affiche son prénom et
  son initiale.
- Changer de lien ne touche que `apps/app/src/config/join.ts`.
