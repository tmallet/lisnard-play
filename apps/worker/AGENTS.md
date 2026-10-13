# apps/worker — @lisnard/worker

Ingestion (ADR 0004, 0007, 0015 à 0018) : collecte, classification par Jev,
résolution des médias. Processus Bun long, non exposé. Vue d'ensemble et cycle
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
| `src/media/` | `safe-fetch.ts` (anti-SSRF), `resolve.ts` (oEmbed, Open Graph), `task.ts` |
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
- **Ajouter une source** : skill `add-intervention-source`.
- **Logs** : `log.info|warn|error` (JSON par ligne), jamais de secret dans les
  données journalisées.
- **Secrets** : `OPENROUTER_API_KEY` et `YOUTUBE_API_KEY` n'existent que dans ce
  service.

## Tests

`bun --filter @lisnard/worker test` : fixtures réelles réduites, classifieur
factice, bases Postgres jetables. Aucun appel réseau réel.
