---
id: "0014"
title: Base de données — PostgreSQL, Drizzle ORM et driver Bun.sql
status: accepted
date: 2026-10-13
tags: [architecture, donnees, stack]
supersedes: null
superseded-by: null
related-specs: []
related-changes: [intervention-ingestion]
---

# 0014 — Base de données : PostgreSQL, Drizzle ORM et driver Bun.sql

## Contexte

L'ADR 0002 laissait le choix de la base ouvert (Postgres ou SQLite/Turso). Le
change `intervention-ingestion` en a besoin. Ce que la base doit offrir :
- deux processus qui écrivent : le worker (collecte, décisions du classifieur)
  et l'application (plus tard : abonnements aux notifications) ;
- un volume modeste (quelques milliers d'interventions, et un journal de
  décisions de quelques dizaines de milliers de lignes) ;
- une base légère, optimisée et **administrable** (sauvegardes, restauration,
  consultation des données), dans un hébergement Coolify (ADR 0015) ;
- à terme, une recherche plein texte en français.

## Décision

- **PostgreSQL** (dernière version majeure stable), déployé comme service
  Coolify : sauvegardes planifiées vers S3 et restauration depuis l'interface
  Coolify. La base n'est jamais exposée publiquement, seulement sur le réseau
  interne Docker.
- **Drizzle ORM** pour le schéma et les requêtes, **drizzle-kit** pour les
  migrations (fichiers SQL versionnés dans le dépôt), **Drizzle Studio** pour
  consulter les données.
- **Driver `Bun.sql`** (client Postgres intégré à Bun) via `drizzle-orm/bun-sql`,
  sans dépendance de driver supplémentaire. L'app et le worker tournent tous
  deux sous Bun (ADR 0015).
- Le schéma, les migrations et le client vivent dans **`packages/db`**
  (`@lisnard/db`), partagé par le worker (écriture) et par `@lisnard/api`
  (lecture).
- Le développement local et la CI utilisent un Postgres en conteneur, à la même
  version majeure que la production.

## Alternatives écartées

- **SQLite (fichier)** : la plus légère, mais deux conteneurs devraient écrire
  dans un fichier partagé via un volume, et les sauvegardes seraient à monter
  soi-même (Litestream). Moins administrable dans Coolify.
- **Turso / libSQL** : service géré, ou serveur `sqld` à auto-héberger. Ajoute
  un composant sans gain à cette échelle.
- **postgres.js / node-postgres** : dépendance de plus, alors que Bun intègre un
  client Postgres.
- **Prisma** : plus lourd (moteur, génération de client) que Drizzle pour un
  besoin simple.

## Conséquences

- Environ 50 à 100 Mo de RAM supplémentaires sur l'hôte Coolify.
- La CI démarre un service Postgres pour les tests qui touchent la base.
- Le devcontainer ajoute un service Postgres (docker compose).
- La recherche plein texte (`tsvector` avec la configuration `french` et
  `unaccent`) sera disponible le moment venu, sans changer de moteur.
