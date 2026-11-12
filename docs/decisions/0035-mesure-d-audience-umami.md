---
id: "0035"
title: Mesure d'audience Umami sans cookie, web seulement
status: accepted
date: 2026-11-12
tags: [produit, confidentialite, juridique, web]
supersedes: null
superseded-by: null
related-specs: [app-shell]
related-changes: [audience-measurement]
---

# 0035 — Mesure d'audience Umami sans cookie, web seulement

## Contexte

L'application ne mesurait pas l'audience (ADR 0022). L'éditeur veut savoir quelles
pages sont consultées et d'où viennent les visiteurs. Il administre déjà une
instance Umami (`umami.thimal.fr`). Selon la CNIL, une mesure d'audience peut se
passer de consentement si elle sert uniquement à des statistiques anonymes, ne
recoupe pas d'autres traitements, ne suit pas le visiteur d'un site à l'autre et
ne conserve pas les données plus de 25 mois.

## Décision

- **Umami, instance de l'éditeur** : le script `https://umami.thimal.fr/script.js`
  est chargé en `defer` dans le document HTML racine (`+html.tsx`), donc sur le
  web seulement. L'application mobile ne mesure pas l'audience.
- **Sans cookie ni stockage local** : Umami n'en dépose pas. L'adresse IP n'est
  pas conservée ; elle sert à calculer un identifiant de visite renouvelé chaque
  mois.
- **Pas de bandeau de consentement**, en s'appuyant sur l'exemption CNIL de la
  mesure d'audience ; l'opposition passe par l'option « Ne pas me suivre » du
  navigateur (`data-do-not-track`), décrite dans la politique de confidentialité.
- **Production seulement** : `data-domains` limite l'envoi à
  `play.projetlisnard.fr` ; préproduction et développement ne comptent pas.
- **Pages vues uniquement** : aucun événement personnalisé, en particulier pas
  sur le bouton d'adhésion (spec `app-shell`, aucun traceur sur ce lien).
- **Conservation de 25 mois au plus** : deux tâches planifiées Coolify du service
  `umami` (conteneur `postgresql`) purgent chaque nuit les données de ce site :
  `purge-25-mois-lisnard-play-evenements` (03:43, `website_event`, `event_data`,
  `session_data`) puis `purge-25-mois-lisnard-play-sessions` (03:53, sessions
  sans événement restant). Deux tâches, car Coolify limite une commande à
  255 caractères.

## Alternatives écartées

- **Analyse des journaux du serveur** : pas de données de navigation côté client
  (pages de l'app servies en SPA après le premier chargement).
- **Outil hébergé par un tiers** (Google Analytics…) : cookies, transfert hors
  UE et consentement obligatoire.
- **Mesure dans l'app mobile** : nécessiterait un SDK et un passage par les
  formulaires de confidentialité des stores, pour peu d'intérêt aujourd'hui.

## Conséquences

- La page « Mentions légales et confidentialité » décrit la mesure d'audience :
  données, finalité, conservation, opposition. ADR 0022 reste valable pour les
  lecteurs tiers ; son constat « ne mesure pas l'audience » est remplacé ici.
- Changer d'instance ou d'identifiant de site se fait dans
  `apps/app/src/config/analytics.ts`.
- Une politique de sécurité du contenu (CSP) future devra autoriser
  `umami.thimal.fr` en `script-src` et `connect-src`.
