## 1. Spike classifieur (point de décision)

- [x] 1.1 Obtenir l'accès : clé OpenRouter de test fournie par le porteur du projet dans l'environnement (`OPENROUTER_API_KEY`), jamais commitée
- [x] 1.2 Lire le Quick Start TypeSafe et la page Jev d'OpenRouter ; écrire un script jetable qui envoie un état et les trois questions (Noul + 2 Choice) à `typesafe/jev-1.13` via OpenRouter
- [x] 1.3 Tester sur 20 cas réels variés (interview nationale, AMF, mairie, simple citation, hors sujet) et noter le format de réponse, la latence et la cohérence des probabilités
- [x] 1.4 Consigner le résultat dans le design (format exact de l'appel). Si Jev est inutilisable, s'arrêter et proposer un ADR de remplacement de l'ADR 0004 avant de continuer

## 2. Base de données

- [x] 2.1 Ajouter un service Postgres au devcontainer (passage à docker compose) et à la CI, même version majeure qu'en production ; `DATABASE_URL` dans `.env.example`
- [x] 2.2 Créer `packages/db` (`@lisnard/db`) : Drizzle, driver `drizzle-orm/bun-sql`, configuration drizzle-kit
- [x] 2.3 Écrire le schéma (`source`, `item`, `classification`) et ses index (design D2), générer la première migration SQL
- [x] 2.4 Exposer les points d'entrée `read` (contenus publiés uniquement) et `write` (upsert d'élément, ajout au journal, mise à jour du statut) (ADR 0017)
- [x] 2.5 Tests d'intégration sur Postgres : dédoublonnage par `platform_id`, journal en ajout seul, `read` n'expose jamais un contenu non publié

## 3. Worker : collecte

- [x] 3.1 Créer `apps/worker` (`@lisnard/worker`) : démarrage (migrations, puis boucle), planificateur avec cadences par type et advisory lock (design D1, ADR 0015)
- [x] 3.2 Définir l'interface `Source` et `sources.config.ts` ; résoudre et vérifier les identifiants des chaînes initiales (design D3)
- [x] 3.3 Adaptateur YouTube : flux RSS, puis `videos.list` (par lots de 50) pour la description, `liveStreamingDetails` et le statut ; revérification des `upcoming` et `live`
- [x] 3.4 Adaptateur RSS générique (podcasts, Google News avec résolution des redirections)
- [x] 3.5 `collect.ts` : pré-filtre « Lisnard » (exemption de la chaîne officielle), seuil `HISTORY_START` (ADR 0016), dédoublonnage et upsert
- [x] 3.6 Isolation des pannes par source, journalisation structurée, compteur de quota YouTube, fichier de pulsation pour le healthcheck
- [x] 3.7 Tests sur fixtures : flux RSS, `videos.list` (upcoming, live, ended, none), Google News ; pré-filtre ; seuil d'historique ; source en panne ; verrou à deux instances

- [x] 3.8 Rattrapage des chaînes officielles via la playlist « uploads » (au démarrage, puis quotidien, et commande `backfill`), avec arrêt au début de l'historique (ADR 0018)

## 4. Worker : classification et publication

- [x] 4.1 Interface `Classifier` et client System One (SDK ou REST, selon le spike) ; état envoyé et questions `QUESTIONS_VERSION = 1` (design D4)
- [x] 4.2 `thresholds.ts` par modèle ; aucune publication si le modèle n'a pas de seuils
- [x] 4.3 `publish.ts` : règle de publication, journalisation, dénormalisation `status` / `role` / `kind`, cache par `input_hash`
- [x] 4.4 Reprise sur erreur : 3 tentatives, puis l'élément reste `pending`
- [x] 4.5 CLI : `recompute` (nouveaux seuils sans appel au modèle) et `reclassify` (filtrable par modèle ou version)
- [x] 4.6 Tests avec un classifieur factice : chaque scénario de la spec `intervention-classification` (national, AMF, mairie, simple citation, modèle sans seuils, indisponibilité, recalcul)

- [x] 4.7 Chaîne officielle : intervention présumée dans la règle de publication et le recalcul, filtre sur le rôle conservé (ADR 0018)

## 5. Calibration

- [x] 5.1 Constituer `eval/reference.jsonl` : environ 100 contenus réels collectés, tous les cas limites de l'ADR 0006, avec des étiquettes proposées
- [x] 5.2 Faire valider les étiquettes par le porteur du projet
- [x] 5.3 Commande `calibrate` : précision et rappel par grille de seuils, proposition de seuils (précision maximale avec un rappel ≥ 80 %)
- [x] 5.4 Fixer les seuils de `typesafe/jev-1.13` dans `thresholds.ts` à partir de la calibration, et consigner les résultats dans `docs/architecture/classifier.md`

## 6. Médias

- [x] 6.1 Résolution oEmbed (YouTube, Dailymotion) : extraction de l'`embedUrl` et vérification de son hôte (ADR 0017)
- [x] 6.2 Lecture Open Graph sécurisée : `http(s)` uniquement, refus des IP privées après résolution DNS, 5 s, 1 Mo ; repli sur un `link` minimal
- [x] 6.3 Calcul du rendu à la publication et enregistrement dans `item.media`
- [x] 6.4 Tests : fixtures oEmbed et HTML, hôte d'iframe non conforme refusé, URL vers IP privée refusée, échec réseau qui donne un `link` minimal

## 7. API

- [x] 7.1 `packages/api` : dépendance à `@lisnard/db` (`read`), contexte avec accès à la base
- [x] 7.2 `interventions.list` : filtres `status` et `role`, curseur, `limit ≤ 50`, tri par statut, statut temporel calculé (spec `intervention-feed`)
- [x] 7.3 `interventions.byId` : détail, rendu média, `NOT_FOUND` si absent ou non publié
- [x] 7.4 Tests sur Postgres : filtres, tri, pagination, exclusion des contenus non publiés et des données internes, `NOT_FOUND`, taille de page invalide

## 8. Interface

- [x] 8.1 Installer `react-native-webview` avec `bunx expo install`
- [x] 8.2 Composants `InterventionCard`, `LiveBadge` (émeraude), `LinkCard`, `MediaEmbed` (`.web.tsx` avec iframe sandboxée, `.tsx` avec WebView limitée à l'hôte du fournisseur)
- [x] 8.3 Accueil : sections « En direct », « À venir », « Passées », rafraîchissement toutes les 60 s, chargement progressif, filtre de rôle, état vide (spec `intervention-feed`)
- [x] 8.4 Écran `src/app/interventions/[id].tsx` : rendu côté client, `PageHead` avec titre générique puis titre de l'intervention, lien vers la source
- [x] 8.5 Tests de composants : badge en direct, carte, sections vides masquées, état vide ; vérification au clavier et des contrastes (skill `charte-ui`)
- [x] 8.6 Vérification sur web et simulateur iOS avec une base remplie de fixtures

## 9. Déploiement et CI

- [x] 9.1 `apps/app/server.ts` (adaptateur `expo-server/adapter/bun`) et `apps/app/Dockerfile` multi-étapes
- [x] 9.2 `apps/worker/Dockerfile` ; migrations au démarrage ; healthcheck sur le fichier de pulsation
- [x] 9.3 Construire les deux images localement et vérifier qu'elles démarrent face au Postgres du devcontainer
- [x] 9.4 CI : service Postgres, tests d'intégration, smoke test web étendu (`/interventions/<id>` en 200, accueil avec des données de fixtures)
- [x] 9.5 Pare-feu du devcontainer : ajout des domaines YouTube, Google News, des endpoints oEmbed et des hôtes RSS configurés
- [x] 9.6 Rédiger `docs/architecture/deploiement.md` : services Coolify, variables d'environnement par service, sauvegardes Postgres, ordre de mise en production (design, Migration Plan)

## 10. Documentation

- [x] 10.1 `docs/architecture/README.md` : modules `packages/db` et `apps/worker`, flux collecte → classification → publication → consultation, schéma de données
- [x] 10.2 `docs/architecture/classifier.md` : questions, seuils, calibration, procédure de changement de modèle
- [x] 10.3 `packages/db/AGENTS.md` et `apps/worker/AGENTS.md` ; mise à jour de `packages/api/AGENTS.md`, `apps/app/AGENTS.md` et de l'`AGENTS.md` racine
- [x] 10.4 Skill `add-intervention-source` (déclarer une source, fixtures, pare-feu, règles de l'ADR 0017) et skill `classifier-jev` (questions, version, seuils, calibration, changement de modèle), avec leurs symlinks
- [x] 10.5 Mettre à jour `docs/architecture/commandes.md` (base locale, worker, CLI `recompute`, `reclassify`, `calibrate`, Drizzle Studio) et `.env.example`
- [x] 10.6 Si le spike ou l'implémentation impose un écart aux ADR 0004, 0014, 0015 ou 0017, le consigner avec le skill `record-decision` ; lancer `bun run check`
