## Context

Le serveur de production (`apps/app/server.ts`, ADR 0015) sert l'export Expo et les
API routes ; `robots.txt` y est produit directement. Les pages sont pré-rendues au
build (ADR 0011) : le plan du site doit donc être produit à la requête, depuis la base,
pour suivre les interventions publiées chaque jour.

## Goals / Non-Goals

**Goals :** un plan du site à jour sans reconstruction, peu coûteux pour la base.

**Non-Goals :** priorités et fréquences de changement (ignorées par Google).

## Decisions

- **API route Expo `sitemap.xml+api.ts`**, comme `manifest+api.ts` : elle s'exécute en
  développement comme en production et lit la base par la même connexion partagée que
  la route tRPC (extraite dans `src/server/db.ts`). Alternative écartée : la produire
  dans `server.ts`, absent en développement et hors du bundle qui connaît la base.
- **Lecture** : une fonction de `@lisnard/db/read` renvoie les interventions visibles
  (même condition que le reste de la lecture). Date de mise à jour : le jour du résumé
  s'il existe, lu comme texte (une valeur illisible ne fait pas échouer la requête),
  sinon celui de l'intervention.
- **Domaine** : déduit de la requête (`X-Forwarded-Proto` et `X-Forwarded-Host` posés
  par le proxy, sinon l'URL reçue). Le même code sert ainsi la production et les
  prévisualisations, sans variable de plus. `robots.txt` utilise la même fonction.
- **Cache** : les adresses lues sont gardées dix minutes, une seule fois quel que soit le
  domaine, et la lecture en cours est partagée par les appels simultanés ; seul le XML
  est produit à chaque requête. Un domaine annoncé par la requête ne peut donc pas forcer
  de nouvelle lecture.

## Risks / Trade-offs

- [En-têtes `X-Forwarded-*` falsifiables] → seule l'adresse affichée dans le plan
  change, pour celui qui les falsifie ; rien n'est mis en cache par domaine.
- [Taille] → environ 300 interventions aujourd'hui, très loin de la limite de 50 000
  adresses.
