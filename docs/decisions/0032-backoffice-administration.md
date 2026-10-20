---
id: "0032"
title: Backoffice d'administration sous /admin, service séparé, Better Auth avec TOTP, exception à la frontière d'écriture
status: proposed
date: 2026-10-20
tags: [architecture, securite, admin, donnees]
supersedes: null
superseded-by: null
related-specs: [admin-backoffice]
related-changes: [admin-backoffice]
---

# 0032 — Backoffice d'administration sous /admin, service séparé, Better Auth avec TOTP, exception à la frontière d'écriture

## Contexte

L'exploitant doit pouvoir masquer une vidéo et relancer un résumé sans passer par la
base. Seul le worker écrit (ADR 0017), sauf les abonnements aux notifications
(ADR 0024). L'app est en Expo et React Native (ADR 0003), servie par `server.ts`
(ADR 0015). Le porteur du projet veut :
- un backoffice à `/admin` ;
- un seul compte, sans inscription ;
- un code TOTP ;
- Refine avec shadcn/ui.

## Décision

- **Service `apps/admin` séparé**, servi sous `/admin` : `server.ts` relaie `/admin/*`
  vers lui par le réseau interne, et il n'a pas de domaine public. Le processus public
  ne reçoit aucun droit d'écriture sur les contenus.
- **Exception à la frontière d'écriture** : le service admin écrit, avec un rôle
  Postgres dédié aux droits limités :
  - les colonnes de modération et de demande de résumé de `item` ;
  - le journal `admin_action`, en ajout seul ;
  - les tables de Better Auth.

  Les résumés restent produits par le worker seul, sur demande.
- **Authentification par Better Auth** :
  - mot de passe et TOTP obligatoire, avec codes de secours ;
  - inscription désactivée, compte unique créé en ligne de commande ;
  - cookie restreint à `/admin` (`HttpOnly`, `Secure`, `SameSite=Strict`) ;
  - limitation des tentatives.
- **Interface Refine + shadcn/ui** (React pour navigateur), séparée de l'app Expo. Elle
  consomme un routeur tRPC d'administration protégé par la session.
- **Masquage** :
  - une décision humaine (`item.hidden_at`), indépendante de la classification, qui
    résiste aux reclassements ;
  - exclue de toute lecture publique et des tâches du worker.

## Alternatives écartées

- **Tout dans `server.ts`** : donne au processus public la connexion d'écriture.
- **Sous-domaine dédié** : écarté par le porteur du projet au profit de `/admin`.
- **Backoffice dans l'app Expo** : shadcn/ui n'existe pas en React Native, et l'app
  publique s'alourdirait d'écrans d'administration.
- **Code par courriel** : dépend d'un service d'envoi, et d'une boîte mail aussi sûre
  que le compte ; le TOTP fonctionne hors ligne.
- **Masquer en modifiant le statut de classification** : il serait écrasé par un
  `recompute` ou un reclassement, et le journal des décisions est en ajout seul.

## Conséquences

- Un troisième service à déployer, avec son image, ses variables (`BETTER_AUTH_SECRET`,
  `ADMIN_DATABASE_URL`) et son rôle Postgres.
- La condition de visibilité commune et les sélections du worker excluent les vidéos
  masquées.
- `robots.txt` exclut `/admin` même quand l'indexation est activée.
