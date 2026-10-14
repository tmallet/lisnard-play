---
id: "0010"
title: Versions d'outils via asdf et devcontainer bac à sable pour agents
status: accepted
date: 2026-10-13
tags: [outillage, environnement, agents, security]
supersedes: null
superseded-by: null
related-specs: []
related-changes: [setup-foundation]
---

# 0010 — Versions d'outils via asdf et devcontainer bac à sable pour agents

## Contexte

Le projet est développé en grande partie par des agents de codage (ADR 0008).
Pour qu'ils soient efficaces, il faut :
1. que les versions de Bun et Node soient identiques sur le poste, dans le
   conteneur et en CI ;
2. pouvoir les laisser travailler sans confirmation à chaque commande,
   sans exposer la machine hôte.

Le porteur du projet utilise déjà asdf sur son poste (macOS). Avec Expo, le
simulateur iOS n'existe que sous macOS, et Docker sur Mac ne fournit pas la
virtualisation imbriquée qu'exige l'émulateur Android.

## Décision

- **asdf** gère les versions. Un `.tool-versions` à la racine épingle `bun`
  et `nodejs` et constitue la **source unique** :
  - poste local : asdf ;
  - devcontainer : asdf installé dans l'image, `asdf install` au build ;
  - CI : `oven-sh/setup-bun` et `actions/setup-node` lisent ce même fichier
    (pas d'asdf sur le runner).
  `packageManager` et `engines` du `package.json` racine reprennent ces
  versions, et `docs:check` vérifie leur cohérence.
- **Devcontainer** (`.devcontainer/`) avec deux rôles :
  - **environnement reproductible** : installation, Metro, web, API, tests,
    smoke test, OpenSpec et agents de codage ;
  - **bac à sable pour agents** : utilisateur non root, pare-feu sortant
    refusant tout par défaut avec une liste blanche (registre npm, GitHub,
    API Anthropic, OpenAI et OpenRouter, Expo, sources asdf), aucun secret
    dans l'image, variables d'environnement transmises une à une. Les agents
    ne tournent sans confirmation **que** dans ce conteneur.
- **Mobile** : le simulateur iOS et l'émulateur Android restent sur l'hôte et
  joignent Metro par le port 8081 redirigé. Un téléphone physique passe par
  l'IP réseau de l'hôte ou par un tunnel Expo.

## Alternatives écartées

- **Versions codées en dur dans l'image et la CI** : plusieurs sources de
  vérité, qui finissent par diverger.
- **mise** : équivalent fonctionnel qui lit aussi `.tool-versions`, mais asdf
  est déjà installé et utilisé sur le poste.
- **Nix / devbox** : plus puissant mais plus lourd, et sans usage existant.
- **Agents autonomes directement sur l'hôte** : accès réseau et système de
  fichiers illimités, jugé trop risqué.
- **Émulateurs dans le conteneur** : impossible pour iOS, et impraticable pour
  Android sur Mac.

## Conséquences

- Versions retenues à l'implémentation : Bun 1.4.3, Node 24.21.0 (LTS).
- Les CLI npm globales (`openspec`, `codex`…) s'installent **par version de
  Node** avec asdf : dans le dépôt, il faut les installer pour Node 24.21.0.
- Le port de Metro doit être identique côté hôte et côté conteneur (le
  manifeste Expo annonce `localhost:<port>`) : 8081, ou 8082 en repli. Le
  pare-feu les autorise en entrée, car Docker Desktop relaie les ports
  redirigés depuis une adresse extérieure au réseau de l'hôte.
- Certains noms GitHub se résolvent vers des IP absentes de
  `api.github.com/meta` : la liste blanche les résout aussi par DNS.

- Modifier une version d'outil revient à modifier `.tool-versions` (puis
  `package.json`), ce qui reconstruit le conteneur et met à jour la CI.
- Ajouter un service externe (nouvelle API, nouvelle source d'ingestion)
  impose d'ajouter son domaine à la liste blanche du pare-feu.
- Le bac à sable ne protège pas le dépôt lui-même : un agent peut modifier les
  fichiers montés et pousser avec les identifiants transférés. La revue des PR
  reste le garde-fou.

