## Why

Le porteur du projet recentre l'application sur la **campagne présidentielle**
de David Lisnard. Ses interventions en tant que président de l'AMF sortent du
périmètre, ce qui modifie l'ADR 0006. Le filtre « National / AMF » de l'accueil
perd donc son sens. Il est remplacé par des **filtres thématiques**, plus utiles
pour retrouver ses prises de position sur un sujet.

## What Changes

- **Périmètre** (remplace l'ADR 0006) : seules les interventions qui relèvent de
  la campagne présidentielle sont publiées. Les interventions au titre de l'AMF
  sont écartées, comme celles qui concernent la mairie de Cannes. Le
  classifieur garde la question du rôle pour les distinguer.
- **BREAKING (règle de publication)** : seul le rôle `national` est publiable.
  Les contenus déjà publiés avec le rôle `amf` sont écartés par `recompute`,
  sans nouvel appel au modèle (ADR 0018).
- **Thématiques** : sept thèmes, chacun avec son libellé :
  - Économie, Sécurité, Immigration, Éducation, Institutions, International ;
  - Vie de campagne, pour les meetings, déplacements et soutiens.

  **Une intervention peut porter plusieurs thèmes**, ou aucun. Le classifieur
  Jev reçoit une question oui/non (Noul) par thème. Un thème est retenu quand
  sa probabilité atteint un seuil `τ_theme` défini par modèle (ADR 0004).
- **Questions v3** : ajout des questions de thème et réécriture de la question
  du rôle. `QUESTIONS_VERSION` passe à 3, ce qui reclasse tous les contenus
  automatiquement. Le coût reste négligeable : environ 10 questions par
  contenu.
- **Données** : colonne `themes` (tableau, avec index) sur `item`, dénormalisée
  depuis la dernière décision comme `role` et `kind`. Le journal conserve les
  probabilités brutes de chaque thème.
- **BREAKING (API)** : `interventions.list` remplace le filtre `role` par un
  filtre `theme`. Les éléments exposent `themes` à la place de `role`.
- **Interface** :
  - l'accueil remplace le filtre par rôle par une rangée de filtres
    thématiques (« Tout » et les sept thèmes), défilable sur mobile ;
  - les cartes et l'écran de détail affichent les thèmes à la place du rôle.
- **Calibration** : les cas du jeu de référence étiquetés `amf` deviennent des
  cas à écarter. Le seuil `τ_theme` est vérifié sur un échantillon que valide
  le porteur du projet.

## Capabilities

### New Capabilities
- `intervention-themes` : liste des thèmes, attribution multi-thème par le
  classifieur, seuil par modèle, exposition et filtrage.

### Modified Capabilities
- `intervention-classification` : questions posées au classifieur (rôle
  recentré, thèmes) et règle de publication (rôle `national` seul).
- `intervention-feed` : filtre par thème au lieu du rôle dans la liste et sur
  l'accueil ; thèmes affichés à la place du rôle sur les cartes et le détail.
- `app-shell` : plus de surtitre portant le nom de l’application sur les écrans
  mobiles.

Ces deux capacités sont créées par le change `intervention-ingestion`, encore
actif. Il doit être archivé avant celui-ci, pour que les deltas s'appliquent
aux specs principales.

## Impact

- **Worker** : `classifier/questions.ts`, `decide.ts`, `thresholds.ts`,
  `publish.ts`, `calibrate.ts`, `eval/reference.jsonl`, tests.
- **Base** : migration Drizzle (colonne `themes`, index GIN), `read.ts` et
  `write.ts`.
- **API** : `routers/interventions.ts` et ses tests. Le contrat change, mais
  seule l'app le consomme et elle est livrée en même temps.
- **App** : `ThemeFilter` remplace `RoleFilter`. Modification de
  `InterventionCard`, de l'écran de détail et de `lib/format.ts`.
- **Documentation** :
  - nouvel ADR qui remplace l'ADR 0006 ;
  - `classifier.md`, `AGENTS.md`, `openspec/config.yaml` (contexte du
    périmètre) ;
  - skill `classifier-jev`.
- **Coût** : environ 0,0001 $ par contenu, au lieu de 0,00003 $. Le reclassement
  initial de quelques centaines de contenus coûte moins de 0,10 $.

## Hors périmètre

- Thèmes définis ou modifiés depuis une interface d'administration : la liste
  est codée et versionnée avec les questions.
- Recherche plein texte et filtres combinés (plusieurs thèmes à la fois, thème
  et média).
- Résumé et transcription des vidéos : change `intervention-summaries`.
- Notifications par thème.
