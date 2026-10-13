## 1. Données

- [x] 1.1 `THEMES` et le type `Theme` dans `packages/db/src/schema.ts` ; `theme` ajouté à `AppliedThresholds` ; réponses de thème ajoutées à `ClassifierAnswers` (D2, D4)
- [x] 1.2 Colonne `item.themes text[] NOT NULL DEFAULT '{}'` et index GIN ; migration générée avec `db:generate` (D3)
- [x] 1.3 `write.ts` : `recordClassification` écrit `themes` ; `read.ts` : filtre `theme` (`themes @> ARRAY[...]`), `themes` exposé à la place de `role` ; tests de `db.test.ts` mis à jour

## 2. Classifieur

- [x] 2.1 `questions.ts` : sept questions Noul `theme_<id>`, définitions reprises de la spec `intervention-themes` ; question du rôle réécrite (périmètre de l'ADR 0020) ; `QUESTIONS_VERSION = 3` (D1)
- [x] 2.2 `systemone.ts` : lecture des réponses de thème ; une réponse sans thème donne une liste vide, sans échec
- [x] 2.3 `decide.ts` : `PUBLISHABLE_ROLES = ['national']`, calcul de `themes` avec `τ_theme` ; `thresholds.ts` : `theme: 0.5` pour le modèle épinglé (D4, D5)
- [x] 2.4 `publish.ts` : `classifyPending`, `recompute` et `reclassify` propagent `themes` ; tests de `publish.test.ts` (AMF écarté, multi-thème, aucun thème, recalcul des thèmes, contenu AMF déjà publié écarté par `recompute`)

## 3. Calibration

- [x] 3.1 `eval/reference.jsonl` : les cas attendus `amf` deviennent des cas à écarter ; `calibrate.ts` ne considère publiable que `national` ; tests mis à jour
- [x] 3.2 Champ facultatif `themes` dans le jeu de référence ; `calibrate` affiche la précision et le rappel par thème quand il est renseigné
- [x] 3.3 En local : `recompute`, reclassement v3, puis tableau d'environ 30 contenus publiés avec leurs thèmes, à faire valider par le porteur du projet ; ajout des réponses validées au jeu de référence et ajustement de `τ_theme` si besoin

## 4. API

- [x] 4.1 `interventions.list` : `theme: z.enum(THEMES).optional()` remplace `role` ; `list` et `byId` exposent `themes` (D6)
- [x] 4.2 Tests du routeur : filtre par thème, thème inconnu rejeté, contenu sans thème présent sans filtre

## 5. App

- [x] 5.1 `lib/format.ts` : `THEME_LABELS: Record<Theme, string>` (type inféré depuis `AppRouter`) et formatage de la liste des thèmes (deux au plus, puis « +N »)
- [x] 5.2 `ThemeFilter` remplace `RoleFilter` : pastilles qui passent à la ligne sur toutes les plateformes, état actif accessible (D7, skill `charte-ui`)
- [x] 5.3 `InterventionFeed` : filtre par thème transmis aux requêtes des trois sections ; message dédié pour un thème sans intervention
- [x] 5.4 `InterventionCard` et écran de détail : thèmes à la place du rôle ; suppression de `ROLE_LABELS`
- [x] 5.5 Tests : `ThemeFilter`, carte avec plusieurs thèmes et sans thème, flux filtré et vide
- [x] 5.6 Vérification visuelle sur le web et sur le simulateur iOS (filtre défilable, état actif, détail)

- [x] 5.7 Accueil : chargement continu des interventions passées (`useOnEndReached`, `ScrollEnd`) à la place du bouton « Voir plus » ; retrait du statut de l'API en bas de l'accueil (demande du porteur du projet)

## 6. Qualité

- [x] 6.1 Smoke test web : l'intervention de test porte un thème, et `interventions.list` filtré par ce thème la renvoie
- [x] 6.2 `bun run check` et `bun run smoke:web` au vert

## 7. Documentation

- [x] 7.1 `docs/architecture/classifier.md` : questions v3, règle de publication (`national` seul), `τ_theme`, calibration des thèmes
- [x] 7.2 `docs/architecture/README.md` (schéma : `themes`, contrat tRPC) et `docs/architecture/deploiement.md` (étape `recompute` à la mise en production, D5)
- [x] 7.3 `AGENTS.md` racine et `openspec/config.yaml` (périmètre recentré sur la campagne, ADR 0020) ; `apps/app/AGENTS.md`, `apps/worker/AGENTS.md`, `packages/api/AGENTS.md`, `packages/db/AGENTS.md` si leurs exemples citent le rôle ou l'AMF
- [x] 7.4 Skill `classifier-jev` : questions de thème, `τ_theme`, validation d'un échantillon de thèmes
- [x] 7.5 ADR 0020 (remplace l'ADR 0006) déjà rédigé ; consigner tout écart d'implémentation avec le skill `record-decision`
