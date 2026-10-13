## Why

Le socle est en place (change `setup-foundation`), mais l'application n'affiche
encore aucune intervention. Ce change apporte la valeur centrale du produit :
collecter automatiquement les interventions publiques de David Lisnard depuis
des sources publiques, ne garder que celles du périmètre (ADR 0006) grâce au
classifieur Jev (ADR 0004 et 0005), puis les présenter en direct, à venir ou
passées sur le web et le mobile.

## What Changes

- **Base de données** : création de `packages/db` (`@lisnard/db`) avec
  PostgreSQL, Drizzle ORM, le driver `Bun.sql` et des migrations versionnées
  (ADR 0014). Postgres local dans le devcontainer et en CI.
- **Worker d'ingestion** : création d'`apps/worker`, processus Bun avec
  planification interne et verrou Postgres (ADR 0015). Il enchaîne collecte,
  classification et publication.
- **Sources** (ADR 0004, 0016) :
  - flux RSS publics des chaînes YouTube (@davidlisnard et chaînes de médias),
    avec le statut direct / programmé / rediffusion tiré de l'API YouTube Data ;
  - flux RSS de podcasts et d'actualités ;
  - filtre grossier sur le nom, dédoublonnage, seuil du 31 mars 2026.
- **Classification** : client System One (Jev via OpenRouter, modèle épinglé
  `typesafe/jev-1.13`), trois questions (« intervient lui-même », rôle, type),
  seuils par modèle, publication automatique et journal complet des décisions
  (ADR 0004, 0005, 0006). Un jeu de référence étiqueté et un script de
  calibration fixent les seuils.
- **Médias** : rendu calculé à l'ingestion. Lecteur intégré via oEmbed quand le
  fournisseur le permet, sinon carte de lien construite à partir d'Open Graph
  (ADR 0007).
- **API** : procédures tRPC publiques `interventions.list` (filtres par statut
  temporel et par rôle, pagination) et `interventions.byId`.
- **Interface** : l'accueil liste les interventions en trois sections (en
  direct, à venir, passées). Un écran de détail affiche le lecteur intégré ou
  le lien vers la source, sur le web et le mobile.
- **Déploiement** : Dockerfiles de l'app et du worker pour Coolify, healthchecks.

## Capabilities

### New Capabilities

- `intervention-collection` : collecte des contenus candidats depuis les
  sources configurées, métadonnées déterministes, statut direct et programmé,
  dédoublonnage, seuil de début d'historique, résilience aux pannes de source.
- `intervention-classification` : décision de pertinence par le classifieur
  (intervention de David Lisnard, rôle, type), seuils par modèle, publication
  automatique, journal des décisions, reclassification.
- `intervention-media` : choix entre lecteur intégré (oEmbed) et carte de lien
  vers la source, sécurité du contenu intégré, aucun réhébergement.
- `intervention-feed` : consultation des interventions publiées (API et
  interface), classées en direct, à venir et passées, avec filtre par rôle et
  écran de détail.

### Modified Capabilities

(aucune : l'accueil change de contenu, mais aucune exigence d'`app-shell` ne
change ; le contenu de l'accueil est décrit par `intervention-feed`)

## Hors périmètre

- Notifications push (natives et Web Push) : change ultérieur.
- Sources nécessitant une authentification ou une API payante (X, Instagram,
  Facebook) et l'oEmbed de Meta.
- Rattrapage profond de l'historique (recherche ou archives au-delà de ce que
  les flux exposent) : ADR 0016, conséquences.
- Saisie ou modération manuelle (ADR 0005 : tout automatique).
- Pages de détail rendues côté serveur avec métadonnées par intervention :
  attend le SSR stable du SDK 58 (ADR 0011). D'ici là, le détail est rendu côté
  client avec des métadonnées génériques.
- Recherche plein texte.

## Impact

- **Nouveau code** : `packages/db`, `apps/worker`, procédures dans
  `packages/api`, écrans dans `apps/app`.
- **Dépendances** : `drizzle-orm`, `drizzle-kit`, un parseur RSS/XML, le SDK
  TypeSafe JS (ou un client REST minimal), un assainisseur HTML pour l'oEmbed.
- **Infrastructure** : services Postgres (devcontainer en docker compose, CI),
  Dockerfiles, déploiement Coolify.
- **Secrets** : `DATABASE_URL`, `OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`, côté
  worker uniquement. Le backend ne reçoit que `DATABASE_URL`.
- **Pare-feu du devcontainer** : ajout des domaines YouTube, OpenRouter (déjà
  présent), des fournisseurs oEmbed et des flux RSS configurés.
- **Documentation** : architecture (flux d'ingestion, schéma de données),
  `AGENTS.md` des nouveaux packages, skills `add-intervention-source` et
  `classifier-jev`.
