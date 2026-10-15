## Why

Le site recense les interventions de David Lisnard ; Nouvelle Énergie publie en libre
accès son nombre d'adhérents, en direct et jour par jour. Mettre les deux en regard
montre comment les adhésions évoluent au fil des interventions, en particulier lors
d'une accélération comme celle observée depuis le 7 octobre 2026 (environ 2 000
adhésions par jour contre une médiane de 55).

## What Changes

- **Onglet « Adhésions »** (en-tête web et barre d'onglets mobile) : une page avec le
  total d'adhérents en cours et un graphique.
- **Graphique** : courbe du total cumulé d'adhérents depuis le début de l'historique
  des interventions (31 mars 2026), jusqu'à maintenant. Toutes les interventions
  publiées y sont posées, au jour où elles ont eu lieu :
  - vidéo de la chaîne officielle : rond avec sa miniature ;
  - autre intervention : point ;
  - plusieurs le même jour : empilées au-dessus de la courbe ;
  - toucher ou survoler un repère : carte de l'intervention, avec lien vers sa page.
- **Lisibilité** : échelle fixe d'environ 10 px par jour, défilement horizontal, vue
  ouverte sur les jours les plus récents.
- **Données** : procédure tRPC `membership.timeline`. Le serveur de l'app lit les deux
  fichiers publics du parti, avec un cache en mémoire de 90 secondes et la dernière
  valeur valide servie si la source est indisponible. Aucun stockage en base.
- **Transparence** : source citée (« Nouvelle Énergie ») et phrase rappelant qu'une
  simultanéité n'est pas un effet démontré. Nouvel ADR 0026.

## Capabilities

### New Capabilities
- `membership-timeline` : page « Adhésions », données d'adhésion mises en cache,
  graphique du total et des interventions.

### Modified Capabilities
- `intervention-feed` : la description d'une vidéo YouTube n'est affichée que pour la
  chaîne officielle, ajouté en cours de revue.
- `intervention-collection` : les reprises d'une même dépêche par plusieurs médias
  (même titre, moins de trois jours d'écart) sont masquées, ajouté en cours de revue.

- **Corrections ajoutées en cours de revue** :
  - décodage complet des entités HTML des aperçus (« Actualit&eacute;s ») ;
  - masquage des reprises d'articles (colonne `item.duplicate_of`, migration 0009),
    visibles en double dans la liste « +N ».

## Impact

- **API** (`packages/api`) : routeur `membership` ; lecture HTTP sortante vers une
  adresse fixe ; lecture des interventions par `@lisnard/db/read`.
- **Base** (`packages/db/src/read.ts`) : liste légère des interventions publiées depuis
  une date (identifiant, jour, titre, média, miniature, source officielle, direct).
- **App** : onglet et route `adhesions`, composant de graphique en SVG
  (`react-native-svg`, ajouté par `bunx expo install`), carte d'intervention.
- **Docs** : ADR 0026, architecture, `apps/app/AGENTS.md`, `packages/api/AGENTS.md`.
- ADR concernés : 0001 (indépendance), 0011 (pré-rendu), 0017 (frontière d'écriture),
  0020 (périmètre), 0022 (confidentialité : aucun traceur), 0025 (adhésion).

## Hors périmètre

- Copie de l'historique d'adhésion en base, par le worker.
- Calcul statistique d'un effet (régression, adhésions « attribuées » à une
  intervention).
- Filtres par thème ou par type d'intervention sur le graphique.
- Notifications liées au nombre d'adhérents.
