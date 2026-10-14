---
id: "0022"
title: Lecteurs tiers chargés au clic, YouTube sans cookie, éditeur anonyme
status: accepted
date: 2026-10-14
tags: [juridique, media, ui, confidentialite]
supersedes: null
superseded-by: null
related-specs: [app-shell, intervention-media]
related-changes: [legal-and-consent]
---

# 0022 — Lecteurs tiers chargés au clic, YouTube sans cookie, éditeur anonyme

## Contexte

L'application ne dépose aucun cookie et ne mesure pas l'audience. Le lecteur
YouTube intégré (ADR 0007) dépose en revanche des cookies et traceurs de Google
dès son affichage. Selon la CNIL, ces traceurs exigent le consentement préalable
du visiteur. Le site est par ailleurs édité par un particulier qui souhaite
rester anonyme.

## Décision

- **Clic pour charger** : un lecteur tiers ne se charge qu'après un clic sur
  « Lire la vidéo ». Une mention signale les cookies du fournisseur. La lecture
  démarre aussitôt, puisque ce clic tient lieu d'action de lecture.
- **YouTube via `youtube-nocookie.com`**, qui réduit les traceurs, sans les
  supprimer : le clic reste nécessaire.
- **Pas de bandeau de cookies global** : sans traceur avant l'action du visiteur,
  il serait sans objet.
- **Éditeur anonyme** (LCEN, article 6-III-2) : les mentions légales donnent une
  adresse de contact et l'hébergeur. L'identité de l'éditeur est communiquée à
  l'hébergeur seulement.

## Alternatives écartées

- **Bandeau de consentement global** (outil de gestion du consentement) : il
  ajoute un script et une interface, pour un seul fournisseur et sans autre
  traceur.
- **Mémoriser le consentement d'une vidéo à l'autre** : il faudrait stocker un
  choix (stockage local), donc l'expliquer et le rendre révocable. Le clic par
  vidéo est plus simple.
- **Lien vers YouTube au lieu du lecteur intégré** : l'expérience serait
  dégradée, et la lecture dans l'app est la raison d'être de l'ADR 0007.

## Conséquences

- La vidéo démarre en un clic, comme avant, mais rien ne se charge avant ce
  clic.
- Tout nouveau fournisseur intégrable passe par le même composant de
  consentement.
- Les mentions légales doivent suivre l'hébergeur : changer d'hébergeur impose de
  mettre à jour `config/legal.ts`.
