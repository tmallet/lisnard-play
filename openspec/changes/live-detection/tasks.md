## 1. Réception WebSub

- [ ] 1.1 Configuration : `WEBSUB_CALLBACK_URL`, `WEBSUB_SECRET` (32 caractères au moins, sinon arrêt au démarrage), `WEBSUB_PORT` ; fonction désactivée sans les deux premières
- [ ] 1.2 `websub/server.ts` : vérification `GET` (chaîne suivie, renvoi du défi), `POST` signé HMAC-SHA1 en temps constant, corps de 64 Ko au plus, réponse 204 puis traitement en arrière-plan ; tests (défi, signature fausse, chaîne inconnue, corps trop gros)
- [ ] 1.3 Analyse des notifications Atom : vidéos et entrées supprimées ; tests sur des notifications enregistrées

## 2. Voie rapide

- [ ] 2.1 `classifyItem` (un seul contenu) dans `publish.ts`, sur le modèle de `classifyPending`
- [ ] 2.2 `websub/handle.ts` : `videos.list` pour la vidéo, enregistrement, classement, rendu du lecteur ; entrée supprimée close comme une vidéo disparue ; tests

## 3. Abonnements et surveillance

- [ ] 3.1 `websub/subscribe.ts` et tâche `websub:subscribe` (démarrage, puis 24 h) ; tests de la requête envoyée au hub
- [ ] 3.2 Serveur démarré seulement par l'instance qui détient le verrou de leader (`index.ts`)
- [ ] 3.3 `listLiveSoon` et tâche `recheck:soon` (30 s, aucun appel sans direct imminent) ; tests

## 4. App

- [ ] 4.1 `REFRESH_MS` à 30 s ; `focusManager` relié à `AppState` sur mobile ; test

## 5. Qualité et documentation

- [ ] 5.1 Pare-feu du devcontainer : `pubsubhubbub.appspot.com`
- [ ] 5.2 `docs/architecture/README.md` (schéma, tâches), `deploiement.md` (domaine du worker, variables, vérification), `commandes.md`, `.env.example`
- [ ] 5.3 `apps/worker/AGENTS.md` et skill `add-intervention-source` (abonnement automatique)
- [ ] 5.4 `bun run check` et `bun run smoke:web` au vert
