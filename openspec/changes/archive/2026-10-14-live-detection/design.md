## Context

Motivation : voir `proposal.md`. Décisions durables : ADR 0023.

État actuel :
- le planificateur (`scheduler.ts`) exécute ses tâches en série toutes les 30 s ;
- `collect:youtube` lit les flux RSS et `videos.list` toutes les 3 minutes ;
- `recheckLive` revérifie les contenus `upcoming` et `live` au même rythme ;
- `classifyPending` et `resolvePendingMedia` traitent leurs files toutes les 30 s.

## Goals / Non-Goals

**Goals :** moins de 60 s entre le début d'un direct sur YouTube et son
affichage, sans augmentation notable du quota.

**Non-Goals :** voir « Hors périmètre » de la proposition.

## Decisions

### D1 — Serveur WebSub dans le worker

- **Serveur** : `websub/server.ts` démarre un `Bun.serve` sur `WEBSUB_PORT` (8080
  par défaut), uniquement si `WEBSUB_CALLBACK_URL` et `WEBSUB_SECRET` sont
  définis. Un seul chemin : `/websub/youtube`.
- **`GET`, vérification du hub** :
  - `hub.mode` vaut `subscribe` ou `unsubscribe` ;
  - le `hub.topic` correspond à une chaîne active ;
  - le serveur renvoie alors `hub.challenge` en 200, et 404 sinon.
- **`POST`, notification** :
  - corps lu dans la limite de 64 Ko ;
  - en-tête `X-Hub-Signature: sha1=<hmac>` comparé au HMAC-SHA1 du corps brut,
    en temps constant ; 401 si la signature est absente ou fausse ;
  - corps Atom analysé avec le parseur existant (`parseChannelFeed`), dont on
    tire les `yt:videoId` et `yt:channelId`, ainsi que les entrées
    `at:deleted-entry` ;
  - le serveur répond 204 aussitôt, puis traite en arrière-plan : le hub
    n'attend pas.
- **Indépendance** : le serveur est indépendant du verrou de leader et de la
  boucle de tâches. Une instance en attente du verrou ne démarre pas le serveur :
  seul le leader reçoit, pour éviter les doubles traitements.

### D2 — Abonnement

- **Requête** : `websub/subscribe.ts` envoie, pour chaque chaîne YouTube active,
  `POST https://pubsubhubbub.appspot.com/subscribe` avec `hub.mode=subscribe`,
  `hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=<id>`,
  `hub.callback`, `hub.secret`, `hub.verify=async` et
  `hub.lease_seconds=432000`.
- **Planification** : tâche `websub:subscribe` au démarrage, puis toutes les
  24 h.
- **Robustesse** : l'abonnement est idempotent côté hub, donc on ne stocke aucun
  état. L'échec d'une chaîne est journalisé sans bloquer les autres.

### D3 — Voie rapide

`websub/handle.ts` traite chaque vidéo notifiée :
1. `fetchVideoDetails([id])` ;
2. `keepCandidate` et `upsertItem` (source = la chaîne) ;
3. `classifyItem(db, classifier, id)`, une variante de `classifyPending` qui
   cible un seul contenu ;
4. s'il est publié, `resolveMedia` et `setMedia`.

**Entrée supprimée** (`at:deleted-entry`) : même traitement qu'une vidéo
disparue lors de `recheckLive`.

**Concurrence avec la boucle** : les écritures sont idempotentes (upsert par
`platform_id`, journal en ajout seul). Un double classement possible reste sans
effet notable : le cache par empreinte l'évite le plus souvent.

### D4 — Surveillance rapprochée

La tâche `recheck:soon` tourne toutes les 30 s :
- elle sélectionne les contenus `upcoming` dont `starts_at` est compris entre
  maintenant moins 30 min et maintenant plus 15 min ;
- elle n'appelle rien quand aucun n'est concerné ;
- sinon, elle fait un `videos.list` pour 50 contenus au plus (1 unité).

**Coût** : environ 120 unités par heure de fenêtre active, ce qui reste
négligeable.

### D5 — App

- **Intervalle** : `REFRESH_MS` passe de 60 s à 30 s.
- **Retour au premier plan** : sur mobile, `focusManager.setEventListener` est
  relié à `AppState`. Les requêtes actives sont alors rafraîchies dès le retour
  de l'app au premier plan, ce que TanStack Query fait déjà sur le web
  (`refetchOnWindowFocus`).

### D6 — Déploiement

- **Domaine** : `hooks.lisnardplay.thimal.fr`, avec un enregistrement DNS vers le
  serveur.
- **Coolify** : sur le service `worker`, port exposé 8080, domaine HTTPS,
  variables `WEBSUB_CALLBACK_URL=https://hooks.lisnardplay.thimal.fr/websub/youtube`
  et `WEBSUB_SECRET` (aléatoire, 32 octets au moins).
- **Vérification** : les logs montrent `websub:subscribe` avec les 14 chaînes,
  puis les vérifications du hub.

## Risks / Trade-offs

- **[Hub en retard ou en panne]** : la collecte RSS reste en place.
- **[Notifications en double]** : le hub renvoie aussi les modifications de
  titre ou de description. Le traitement est idempotent, et le cache par
  empreinte évite de rappeler Jev pour rien.
- **[Surface exposée]** : un seul chemin, une signature exigée avant toute
  lecture, un corps borné, aucune URL suivie. Le risque principal reste un
  déni de service, que le proxy Coolify et le plafond de taille du corps
  limitent.

## Migration Plan

1. Merger, puis créer l'enregistrement DNS `hooks.lisnardplay.thimal.fr`.
2. Dans Coolify, ajouter au worker le domaine, le port 8080 et les deux
   variables, puis redéployer.
3. Vérifier dans les logs les abonnements et les vérifications du hub.

**Retour arrière** : retirer les deux variables. Le serveur ne démarre plus, et
les abonnements expirent d'eux-mêmes au bout de 5 jours.
