## Why

Un direct de David Lisnard met aujourd'hui 2 à 5 minutes, parfois plus, à
apparaître dans l'application :
- collecte des flux RSS toutes les 3 minutes, et ces flux prennent eux-mêmes du
  retard ;
- revérification des directs programmés au même rythme ;
- puis classement, rendu du lecteur et rafraîchissement de l'app, toutes les 30
  à 60 secondes.

Le porteur du projet veut qu'un direct s'affiche **quasi instantanément**.
Interroger plus souvent n'est pas possible : le quota de l'API YouTube est déjà
consommé aux deux tiers.

## What Changes

- **Notifications push de YouTube (WebSub)** : le worker s'abonne au flux de
  chaque chaîne suivie et reçoit, en quelques secondes, une notification à
  chaque création ou modification de vidéo, y compris un direct programmé ou
  lancé à l'improviste.
  - La notification déclenche aussitôt :
    - la lecture des métadonnées de cette seule vidéo (`videos.list`, 1 unité) ;
    - l'enregistrement ;
    - le classement et le rendu du lecteur, sans attendre le cycle suivant.
  - Le flux RSS reste en place comme filet de sécurité.
- **Point d'entrée public du worker** : un petit serveur HTTP, sur un
  sous-domaine dédié, ne reçoit que les vérifications et notifications du hub,
  signées en HMAC. C'est une exception à l'ADR 0015, consignée dans l'ADR 0023.
- **Surveillance rapprochée des directs programmés** : de 15 minutes avant
  l'heure prévue jusqu'au démarrage effectif, revérification toutes les 30
  secondes.
- **Vidéos disparues** : un direct supprimé ou passé en privé est clos.
  Comportement déjà en place, mais à inscrire dans la spec.
- **App** : rafraîchissement des directs et des interventions à venir toutes les
  30 secondes, et dès le retour de l'app au premier plan.
- **Fonction désactivable** : sans `WEBSUB_CALLBACK_URL` ni `WEBSUB_SECRET`, le
  worker fonctionne comme aujourd'hui.

Délai visé : moins d'une minute entre le début du direct sur YouTube et son
apparition dans l'app.

## Capabilities

### New Capabilities

### Modified Capabilities
- `intervention-collection` :
  - nouvelle exigence « Notifications push des chaînes » ;
  - « Statut de diffusion » modifiée : surveillance rapprochée, vidéos
    disparues.
- `intervention-feed` : « Fraîcheur » modifiée (30 secondes, retour au premier
  plan).

## Impact

- **Worker** :
  - `websub/` : abonnement et renouvellement, serveur HTTP, vérification de la
    signature, traitement des notifications ;
  - voie rapide de classement et de rendu pour un seul contenu ;
  - tâche `recheck:soon` ;
  - configuration (`WEBSUB_CALLBACK_URL`, `WEBSUB_SECRET`, `WEBSUB_PORT`).
- **App** : intervalle de rafraîchissement, et rafraîchissement au retour au
  premier plan (`focusManager` de TanStack Query relié à `AppState`).
- **Déploiement** :
  - un domaine dédié pour le worker dans Coolify ;
  - deux variables d'environnement ;
  - le domaine du hub ajouté au pare-feu du devcontainer.
- **Documentation** : ADR 0023, `docs/architecture/README.md`, `deploiement.md`,
  `apps/worker/AGENTS.md`, skill `add-intervention-source` (abonnement
  automatique des nouvelles chaînes).

## Hors périmètre

- **Interventions dans le flux permanent d'une chaîne d'info** (direct continu
  de BFMTV ou CNEWS) : aucune nouvelle vidéo n'est créée, rien à détecter.
- **Notifications envoyées aux utilisateurs** : un change ultérieur, qui
  s'appuiera sur cette détection.
- **Push du serveur vers l'app** (WebSocket, SSE) : le rafraîchissement toutes
  les 30 secondes suffit pour l'objectif d'une minute.
