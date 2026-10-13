# Déploiement (Coolify)

Trois services Docker sur un même hôte Coolify (ADR 0014, ADR 0015). Seul
`app` est exposé publiquement ; Postgres et le worker restent sur le réseau
interne.

```
 Internet ── HTTPS (proxy Coolify) ──▶ app      apps/app/Dockerfile      port 3000
                                        │  pages pré-rendues + API tRPC (lecture)
                                        ▼
                                      postgres  service Coolify (PostgreSQL 18)
                                        ▲
                                      worker   apps/worker/Dockerfile    non exposé
                                           collecte → classification → médias
```

## Services

| Service | Source | Démarrage | Santé |
|---------|--------|-----------|-------|
| `postgres` | service Coolify « PostgreSQL », **version 18** (identique au local et à la CI) | géré par Coolify | géré par Coolify |
| `worker` | `apps/worker/Dockerfile`, contexte = racine du dépôt | applique les migrations, puis prend le verrou de leader et lance la boucle | fichier de pulsation de moins de 5 min (`HEALTHCHECK` de l'image) |
| `app` | `apps/app/Dockerfile`, contexte = racine du dépôt | `bun server.ts` (export Expo servi par l'adaptateur Bun) | `GET /api/trpc/health` (`HEALTHCHECK` de l'image) |

Les images n'embarquent aucun secret. La version de Bun (`ARG BUN_VERSION`)
doit suivre `.tool-versions`, ce que vérifie `docs:check`.

- **Image de l'app** : Bun « slim », l'export `dist/`, `server.ts` et le seul
  paquet `expo-server`. Le bundle des API routes est autonome.
- **Image du worker** : `index.js` et `cli.js` empaquetés par `bun build`,
  plus les migrations (`/app/drizzle`).

## Variables d'environnement

| Variable | app | worker | Remarque |
|----------|:---:|:------:|----------|
| `DATABASE_URL` | ✅ | ✅ | URL interne Coolify du service Postgres |
| `OPENROUTER_API_KEY` | — | ✅ | Classifieur Jev (ADR 0004). Clé dédiée, avec une limite de dépense |
| `YOUTUBE_API_KEY` | — | ✅ | API YouTube Data v3, restreinte à cette API (environ 6 000 unités par jour sur 10 000) |
| `PORT` | 3000 par défaut | — | Port interne exposé au proxy Coolify |
| `NODE_ENV` | `production` (image) | `production` (image) | Masque les détails d'erreur de l'API |
| `MIGRATIONS_DIR`, `HEARTBEAT_FILE` | — | fixés par l'image | Ne pas modifier |
| `EXPO_PUBLIC_API_URL` | — | — | **Au build des apps mobiles** : URL publique de l'app (ex. `https://…/`) |

Le backend (`app`) ne reçoit que `DATABASE_URL`. Les clés d'ingestion ne
résident que dans le worker (ADR 0017).

## Sauvegardes

Dans Coolify : service Postgres → « Backups ». Il faut une sauvegarde planifiée
(quotidienne au minimum) vers un stockage S3, et un test de restauration à la
mise en route. Le journal des décisions (`classification`) et les contenus
(`item`) se reconstruisent en partie par une nouvelle collecte, mais pas
au-delà de ce qu'exposent les flux (ADR 0016) : la sauvegarde est donc
indispensable.

## Mise en production (ordre)

1. **Postgres** : créer le service, noter l'URL interne, activer les sauvegardes.
2. **Worker** : variables `DATABASE_URL`, `OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`.
   Au premier démarrage, il applique les migrations, recopie les sources, puis
   collecte, classe et résout les médias. Vérifier dans les logs (JSON par
   ligne) les tâches `collect:youtube`, `classify` et `media`, ainsi que
   `youtubeUnits`.
3. **App** : variable `DATABASE_URL`, domaine et HTTPS dans Coolify. Vérifier
   `/api/trpc/health`, puis l'accueil.
4. **Apps mobiles** : build avec `EXPO_PUBLIC_API_URL` pointant vers le domaine
   de l'app.

**Retour arrière** : arrêter le worker. L'app continue d'afficher les dernières
interventions publiées. Pour revenir à une version précédente, redéployer
l'image précédente du service concerné. Les migrations ne font qu'ajouter, et
restent compatibles.

## Exploitation

Depuis le terminal du conteneur worker dans Coolify :

| Besoin | Commande |
|--------|----------|
| Recalculer la publication après un changement de seuils | `bun cli.js recompute` |
| Reclasser après un changement de modèle | `bun cli.js reclassify --model <ancien>` |
| Mesurer les seuils | `bun cli.js calibrate --validated`. À lancer plutôt depuis le dépôt, car le jeu de référence n'est pas dans l'image |

Voir [classifier.md](classifier.md) pour les procédures du classifieur.

## Vérifié localement

Les deux images sont construites depuis la racine du dépôt et démarrées face au
Postgres local (`docker compose up -d`, accessible depuis les conteneurs via
`host.docker.internal:5433`).
