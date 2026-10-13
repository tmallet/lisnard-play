---
id: "0015"
title: Hébergement — conteneurs Docker sur Coolify, runtime Bun partout
status: accepted
date: 2026-10-13
tags: [architecture, hebergement, deploiement]
supersedes: null
superseded-by: null
related-specs: []
related-changes: [intervention-ingestion]
---

# 0015 — Hébergement : conteneurs Docker sur Coolify, runtime Bun partout

## Contexte

Les ADR 0002 et 0011 laissaient ouverts l'hébergement de l'app (web + API
routes) et le mode de planification du worker. Le porteur du projet souhaite
des conteneurs Docker gérés par **Coolify**, une plateforme auto-hébergée.

## Décision

Trois services sur Coolify :

```
 Coolify (un hôte)
 ├─ app      image Docker : `expo export -p web`, puis serveur Bun
 │           (adaptateur `expo-server/adapter/bun`) : pages pré-rendues + API routes tRPC.
 │           Seul service exposé publiquement (HTTPS par le proxy Coolify).
 ├─ worker   image Docker Bun : collecte, classification, publication.
 │           Processus long avec planification interne ; non exposé.
 └─ postgres service Coolify (ADR 0014), réseau interne uniquement.
```

- **Le service « app » est le serveur, pas l'application mobile.** Il sert les pages
  web et le **backend** (API tRPC). Les clients web, iOS et Android ne font que
  des appels HTTP à `/api/trpc` et n'accèdent jamais à la base. Seuls le backend
  et le worker parlent à Postgres, sur le réseau interne.
- **Bun est le runtime de l'app et du worker.** L'export Expo est servi par
  l'adaptateur Bun d'`expo-server`, ce qui permet d'utiliser `Bun.sql`
  (ADR 0014) partout.
- **Images construites depuis le monorepo** : un Dockerfile par service
  (`apps/app/Dockerfile`, `apps/worker/Dockerfile`), versions de Bun lues dans
  `.tool-versions` (ADR 0010).
- **Configuration par variables d'environnement** saisies dans Coolify
  (`DATABASE_URL`, `OPENROUTER_API_KEY`, etc.). Aucun secret dans les images.
- **Migrations** : appliquées par le worker au démarrage, avant la première
  collecte, de façon idempotente.
- **Planification du worker** : boucle interne, avec une cadence par type de
  source et un verrou Postgres (advisory lock) pour qu'une seule instance
  collecte à la fois. Coolify redémarre le conteneur en cas d'arrêt.
- **Mobile** : les clients iOS et Android appellent l'API publique via
  `EXPO_PUBLIC_API_URL`.

## Alternatives écartées

- **EAS Hosting** : pas de worker permanent, et il faudrait une base externe.
- **Tâches planifiées Coolify** (cron qui lance une commande) : plus de
  démarrages à froid, et une cadence moins fine pour détecter les directs. Ça
  reste possible plus tard sans changer le code du worker.
- **Runtime Node pour l'app** : deux runtimes à maintenir, et `Bun.sql` serait
  indisponible côté API.

## Conséquences

- Les points ouverts « hébergement » des ADR 0002 et 0011 sont tranchés ici.
- L'app et le worker exposent un point de santé exploitable par les
  healthchecks Coolify.
- Tout service externe appelé par le worker en production n'est pas filtré
  comme dans le devcontainer : les appels sortants du worker se limitent aux
  sources configurées, à OpenRouter et aux fournisseurs oEmbed.
