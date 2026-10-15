# apps/worker — @lisnard/worker

Ingestion (ADR 0004, 0007, 0015 à 0018, 0023) : collecte, classification par Jev,
résolution des médias, notifications push YouTube. Processus Bun long ; seule
l'adresse de rappel WebSub est exposée, si elle est configurée. Vue d'ensemble et cycle
des tâches : [docs/architecture/README.md](../../docs/architecture/README.md).

## Structure

| Fichier | Rôle |
|---------|------|
| `src/index.ts` | Démarrage : migrations, sources, verrou de leader, tâches |
| `src/scheduler.ts` | `Scheduler` (cadence par tâche, échecs isolés, pulsation), `tryAcquireLeaderLock` |
| `src/config.ts` | `HISTORY_START`, cadences, variables d'environnement |
| `src/sources.config.ts` | Sources déclarées (identifiants de chaînes vérifiés), `isOfficialSource` |
| `src/sources/youtube.ts` | Flux RSS, playlist « uploads » (rattrapage), `videos.list`, statut de diffusion |
| `src/sources/rss.ts` | RSS générique (Google News : média lu dans `<source>`) |
| `src/collect.ts` | Pré-filtre, seuil d'historique, upsert ; rattrapage ; revérification des directs |
| `src/classifier/` | `questions.ts` (version), `systemone.ts` (client REST), `thresholds.ts`, `decide.ts` |
| `src/publish.ts` | `classifyPending`, `recompute`, `reclassify` |
| `src/media/` | `safe-fetch.ts` (anti-SSRF, POST, lecture limitée à l'en-tête), `resolve.ts` (oEmbed, Open Graph), `google-news.ts` (décodage vers l'éditeur), `task.ts` (rendus, `refreshMedia`, `repairMediaEntities` au démarrage) |
| `src/dedupe.ts` | Reprises d'une même dépêche par plusieurs médias (titre identique à 3 jours près) : `markPressDuplicates` au démarrage et après chaque collecte RSS |
| `src/text.ts` | `decodeEntities` : entités HTML numériques et nommées (accents, guillemets typographiques), sensibles à la casse ; une entité inconnue reste telle quelle |
| `src/summaries/` | `prompt.ts` (consigne, `PROMPT_VERSION`, `SUMMARY_MODEL`), `openrouter.ts` (client Gemini, validation), `task.ts` (sélection, budget, échecs). Voir `docs/architecture/resumes.md` |
| `src/websub/` | `server.ts` (vérification du hub, signature HMAC, corps borné, file sérielle), `subscribe.ts` (abonnements), `handle.ts` (voie rapide : enregistrement, classement, rendu) |
| `src/notifications/` | `send.ts` (messages, Web Push chiffré par `web-push`, Expo Push), `task.ts` (`notifyPending` : réservation puis envoi, abonnements expirés supprimés) |
| `src/calibrate.ts`, `eval/reference.jsonl` | Calibration sur le jeu de référence validé |
| `src/cli.ts` | `backfill`, `calibrate`, `recompute`, `reclassify` |

## Règles

- **Réseau externe** : toujours passer par une dépendance injectée (`ctx.fetch`)
  pour que les tests tournent sur des fixtures (`src/__fixtures__/`), et par
  `safeFetchText` pour toute URL qui ne vient pas d'une API connue (ADR 0017).
- **Quota YouTube** : incrémenter `ctx.quota.youtubeUnits` à chaque appel à
  l'API. Jamais de `search.list` (100 unités).
- **Classifieur** : modèle épinglé (instantané daté). Changer les questions
  impose d'incrémenter `QUESTIONS_VERSION` et de recalibrer. Skill `classifier-jev`.
- **Résumés** : modèle épinglé ; changer la consigne impose d'incrémenter
  `PROMPT_VERSION` et de faire relire un échantillon. Jamais de résumé d'un article
  de presse ni de lecture de son texte : pour un éditeur, `safeFetchText` avec
  `headOnly` (ADR 0021).
- **WebSub** : ne rien lire d'une notification avant d'avoir vérifié sa signature, et
  n'en tirer que des identifiants de vidéo et de chaîne : les données viennent ensuite
  de l'API YouTube. Une chaîne non suivie n'a aucun effet (ADR 0023).
- **Notifications** : réserver l'événement (`claimNotification`) avant d'envoyer,
  jamais l'inverse : une panne perd une notification plutôt que de la doubler.
  `VAPID_PRIVATE_KEY` et `EXPO_ACCESS_TOKEN` n'existent que dans ce service.
- **Ajouter une source** : skill `add-intervention-source`.
- **Logs** : `log.info|warn|error` (JSON par ligne), jamais de secret dans les
  données journalisées. Une tâche fréquente qui n'a souvent rien à faire déclare
  `quiet` (`Task`, `scheduler.ts`) pour ne pas écrire une ligne vide à chaque tour.
- **Secrets** : `OPENROUTER_API_KEY` et `YOUTUBE_API_KEY` n'existent que dans ce
  service.

## Tests

`bun --filter @lisnard/worker test` : fixtures réelles réduites, classifieur
factice, bases Postgres jetables. Aucun appel réseau réel.
