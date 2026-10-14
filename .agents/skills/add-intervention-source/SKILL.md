---
name: add-intervention-source
description: Ajouter, corriger ou désactiver une source collectée par le worker (chaîne YouTube ou flux RSS) dans apps/worker/src/sources.config.ts. À utiliser dès qu'il faut suivre un nouveau média, remplacer un identifiant de chaîne ou écrire un nouvel adaptateur de source.
---

# Ajouter une source d'interventions

Règles durables : ADR 0017 (collecte, lecture d'URL externes, frontière
d'écriture), ADR 0016 (début de l'historique), ADR 0018 (chaîne officielle).
Comportement attendu : spec `intervention-collection`.

## 1. Vérifier l'identifiant

Une chaîne YouTube se déclare par son **identifiant `UC…`**, jamais par son
handle, qui peut changer ou désigner une autre chaîne. Résoudre le handle avec
l'API Data, puis contrôler le titre, le pays et le nombre d'abonnés :

```bash
curl -s "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=@cnewsofficiel&key=$YOUTUBE_API_KEY"
```

Pièges déjà rencontrés :
- `@CNEWS` est une chaîne taïwanaise : la bonne est `@cnewsofficiel` ;
- `@davidlisnard` est inactive : la chaîne officielle est `@david_lisnard`.

Ne jamais afficher ni commiter la clé : elle est lue depuis `.env`.

## 2. Déclarer la source

Ajouter une entrée dans `SOURCES` (`apps/worker/src/sources.config.ts`) :

```ts
{
  id: 'yt:<slug>',        // stable : il sert de clé en base, ne jamais le renommer
  kind: 'youtube',
  name: '<Nom affiché>',  // nom du média présenté dans l'app
  channelId: 'UC…',
  active: true,
},
```

Pour un flux RSS : `kind: 'rss'`, `url`, et `outletFromItem: true` si le média
réel figure dans chaque élément (Google News).

- **`official: true`** uniquement pour une chaîne dont David Lisnard est
  l'auteur : elle est exemptée du pré-filtre sur le nom, rattrapée depuis le
  début de l'historique et son intervention est présumée (ADR 0018).
- **Désactiver** plutôt que supprimer (`active: false`) : les contenus déjà
  collectés restent rattachés à la source.
- Au démarrage, le worker recopie la configuration dans la table `source` et,
  si WebSub est configuré, abonne chaque chaîne YouTube active aux notifications
  push (ADR 0023) : rien d'autre à faire pour la détection des directs.

## 3. Nouveau type de source

Si la source n'est ni une chaîne YouTube ni un flux RSS :
1. étendre `SourceConfig` dans `apps/worker/src/sources/types.ts` ;
2. écrire l'adaptateur dans `apps/worker/src/sources/<type>.ts`. Il renvoie des
   `Candidate` et reçoit ses dépendances par `SourceContext` (`fetch`, clés,
   compteur de quota) ;
3. le brancher dans `runCollection` (`collect.ts`) avec une cadence dans
   `CADENCE_MS` (`config.ts`).

Contraintes de l'ADR 0017 :
- pas d'API de recherche coûteuse (`search.list` coûte 100 unités) ;
- toute URL issue d'un contenu externe passe par `safeFetch`
  (`apps/worker/src/media/safe-fetch.ts`) ;
- seul le worker écrit en base, via `@lisnard/db/write` ;
- jamais de téléchargement ni de réhébergement de média (ADR 0007).

## 4. Tester avec des fixtures

- Enregistrer une réponse réelle dans `apps/worker/src/__fixtures__/` (flux XML,
  JSON d'API), sans clé ni donnée personnelle.
- Couvrir le parseur et la collecte dans `apps/worker/src/collect.test.ts`, avec
  un `fetch` simulé et `createTestDb` : pré-filtre, seuil du 31/03/2026,
  dédoublonnage.
- Les tests ne font jamais d'appel réseau.

## 5. Pare-feu du devcontainer

Si la source utilise un nouveau domaine, l'ajouter à la liste de
`.devcontainer/init-firewall.sh`, sinon le worker échoue dans le bac à sable.

## 6. Conclure

- Mettre à jour la liste des sources si elle est citée dans la doc
  (`docs/architecture/README.md`).
- Lancer `bun run check`.
- Vérifier en local : `bun apps/worker/src/index.ts`, puis contrôler dans
  Drizzle Studio (`bun --filter @lisnard/db db:studio`) que des contenus
  arrivent avec le bon `source_id`.
