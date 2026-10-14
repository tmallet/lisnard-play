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
| `worker` | `apps/worker/Dockerfile`, contexte = racine du dépôt | prend le verrou de leader (une instance en attente continue de battre), applique les migrations, puis lance la boucle | fichier de pulsation de moins de 5 min (`HEALTHCHECK` de l'image), écrit avant chaque tâche |
| `app` | `apps/app/Dockerfile`, contexte = racine du dépôt | `bun server.ts` (export Expo servi par l'adaptateur Bun) | `GET /api/trpc/health` (`HEALTHCHECK` de l'image) |

**Réseau du worker** : il lit des URL venues de contenus externes (articles,
Open Graph). La lecture sécurisée refuse les adresses privées, mais Bun ne permet
pas d'imposer à `fetch` l'adresse vérifiée : un domaine dont le DNS change entre
la vérification et la connexion pourrait viser le réseau interne. Placer donc le
worker sur un réseau Coolify qui n'atteint que Postgres et Internet, sans accès
aux autres services internes ni au réseau de l'hôte.

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
| `OPENROUTER_API_KEY` | — | ✅ | Classifieur Jev (ADR 0004) et résumés Gemini (ADR 0021). Clé dédiée, avec une limite de dépense |
| `SUMMARY_DAILY_BUDGET_USD` | — | facultatif | Plafond quotidien des résumés (1 $ par défaut). Nombre avec un point (`1.5`) : une valeur illisible arrête le worker au démarrage |
| `YOUTUBE_API_KEY` | — | ✅ | API YouTube Data v3, restreinte à cette API (environ 6 000 unités par jour sur 10 000) |
| `ALLOW_INDEXING` | absente | — | Indexation par les moteurs de recherche. **Absente ou autre que `true` : bloquée** (en-tête `X-Robots-Tag: noindex, nofollow` et `robots.txt` qui interdit tout). Ne la passer à `true` qu'au lancement public, puis redémarrer le service : aucune reconstruction n'est nécessaire |
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

## Premier déploiement, pas à pas (Coolify)

Prérequis : les PR à déployer sont mergées dans `main`, et l'on dispose d'une clé
OpenRouter et d'une clé YouTube **dédiées à la production**, avec une limite de
dépense sur la clé OpenRouter.

1. **Réseau isolé** (Serveur → Destinations) : créer une destination Docker
   dédiée, par exemple `lisnard`, sur le même serveur. Les trois ressources
   ci-dessous y seront déployées : le worker n'atteint ainsi ni les autres
   services de l'hôte ni leurs bases (voir « Réseau du worker »).
2. **Projet** : créer un projet `lisnard-play`, environnement `production`, avec la
   destination `lisnard`.
3. **Postgres** : nouvelle ressource « PostgreSQL », image `postgres:18-alpine`,
   sans port public. Noter l'**URL interne** (`postgres://…@<service>:5432/…`).
   Activer « Backups » (quotidien, vers S3), puis tester une restauration.
4. **Worker** : nouvelle application depuis le dépôt GitHub, branche `main`.
   - Build Pack « Dockerfile », Base Directory `/`, Dockerfile
     `apps/worker/Dockerfile`.
   - Aucun domaine.
   - Désactiver le healthcheck HTTP de Coolify : l'image a son propre
     `HEALTHCHECK` (fichier de pulsation).
   - Variables : `DATABASE_URL` (URL interne), `OPENROUTER_API_KEY` et
     `YOUTUBE_API_KEY`, en secrets. `SUMMARY_DAILY_BUDGET_USD` est facultative
     (1 par défaut).
   - Déployer, puis suivre les logs :
     - `worker démarré` ;
     - `backfill:youtube` (environ 195 vidéos et 8 unités de quota) ;
     - `collect:youtube` et `collect:rss` ;
     - `classify` (lots de 50, environ 0,02 $ pour l'historique) ;
     - `media` ;
     - `summarize`.
5. **App** : nouvelle application depuis le même dépôt.
   - Build Pack « Dockerfile », Base Directory `/`, Dockerfile
     `apps/app/Dockerfile`, port exposé `3000`.
   - Domaine en HTTPS.
   - Healthcheck HTTP : `/api/trpc/health`.
   - Variable : `DATABASE_URL` seulement. **Ne pas définir `ALLOW_INDEXING`** :
     l'indexation reste bloquée.
6. **Vérifications** :
   - `https://<domaine>/api/trpc/health` répond `ok` ;
   - l'accueil affiche les interventions au fil du classement ;
   - `curl -I https://<domaine>/` montre `X-Robots-Tag: noindex, nofollow` ;
   - `https://<domaine>/robots.txt` contient `Disallow: /`.
7. **Résumés de l'historique** (facultatif) : au plafond par défaut, ils
   arrivent en quelques jours. Pour les obtenir d'un coup (environ 5 $), ouvrir
   le terminal du worker dans Coolify et lancer
   `bun cli.js summarize --budget 6`.

Sur une base neuve, ni `recompute` ni `media --refresh` ne sont nécessaires :
chaque contenu est traité directement avec les règles en vigueur.

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

**Changement de règle de publication** (par exemple au déploiement de
`campaign-themes`, ADR 0020) : après le démarrage du nouveau worker, lancer
`bun cli.js recompute` dans son conteneur. La nouvelle règle s'applique ainsi
tout de suite aux décisions journalisées (les contenus AMF sont écartés), sans
appel au modèle. Si la version des questions a changé, le worker reclasse
ensuite tous les contenus de lui-même, à raison de 50 contenus toutes les 30 s.

**Reprise après `intervention-summaries`** : lancer `bun cli.js media --refresh
--source rss:google-news` pour que les articles existants pointent vers leur
éditeur, avec son image. Si l'on veut tous les résumés sans attendre le plafond
quotidien, lancer ensuite `bun cli.js summarize --budget 5` (environ 3 à 5 $).

**Retour arrière** : arrêter le worker. L'app continue d'afficher les dernières
interventions publiées. Pour revenir à une version précédente, redéployer
l'image précédente du service concerné. Les migrations ne font qu'ajouter, et
restent compatibles.

## Exploitation

Depuis le terminal du conteneur worker dans Coolify :

| Besoin | Commande |
|--------|----------|
| Recalculer la publication et les thèmes après un changement de seuils ou de règle | `bun cli.js recompute` |
| Reclasser après un changement de modèle | `bun cli.js reclassify --model <ancien>` |
| Mesurer les seuils | `bun cli.js calibrate --validated`. À lancer plutôt depuis le dépôt, car le jeu de référence n'est pas dans l'image |

Voir [classifier.md](classifier.md) pour les procédures du classifieur.

## Vérifié localement

Les deux images sont construites depuis la racine du dépôt et démarrées face au
Postgres local (`docker compose up -d`, accessible depuis les conteneurs via
`host.docker.internal:5433`).
