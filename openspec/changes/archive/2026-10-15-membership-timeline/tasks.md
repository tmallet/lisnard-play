## 1. Données

- [x] 1.1 Colonne `source.official` (migration 0008) et recopie par le worker depuis `sources.config.ts`
- [x] 1.2 `listTimelineItems` dans `@lisnard/db/read` (jour de Paris, officielle, direct) ; tests
- [x] 1.3 Vérifier le fuseau du « jour » de la source et l'aligner (D3)

## 2. API

- [x] 2.1 `src/membership/source.ts` : lecture, validation zod, cache 90 s, requête unique en vol, repli sur la dernière valeur valide ; tests (cache, panne, réponse invalide)
- [x] 2.2 Procédure `membership.timeline` (coupe de l'historique, jour en cours) ; tests

## 3. App

- [x] 3.1 `bunx expo install react-native-svg`
- [x] 3.2 `layoutMarkers` (positions et empilement) ; tests
- [x] 3.3 Graphique : courbe, aire, grille, axes, défilement ouvert sur la fin, repères (miniatures rondes, points, liseré direct)
- [x] 3.4 Carte de l'intervention sélectionnée (toucher, survol web), lien vers la page
- [x] 3.5 Page `(tabs)/adhesions` : total, mise à jour, source, phrase de prudence, état de repli ; onglet dans `NAV_ITEMS`
- [x] 3.6 Vérification visuelle sur téléphone et ordinateur (captures)

## 4. Corrections ajoutées en cours de revue

- [x] 4a.1 Entités HTML nommées décodées dans les aperçus ; réparation des aperçus enregistrés au démarrage du worker ; tests
- [x] 4a.3 Suites de la revue : échelle valide pour un total inchangé, graduations distinctes, ouverture en fin de période une seule fois, sélection fixée au clic, titres génériques exclus des reprises, recherche des reprises limitée aux 10 derniers jours après le démarrage, titres des contenus réparés, interventions du graphique gardées une minute par l'API
- [x] 4a.4 Description YouTube affichée seulement pour la chaîne officielle (`getPublishedById`) ; test
- [x] 4a.2 Reprises d'articles : colonne `item.duplicate_of` (migration 0009), `markPressDuplicates` au démarrage et après chaque collecte RSS, reprises exclues du flux, du graphique, des notifications et du classement ; tests

## 5. Qualité et documentation

- [x] 4.1 Smoke web : `/adhesions` pré-rendue, `membership.timeline` servie depuis des fixtures (`MEMBERSHIP_SOURCE_URL`)
- [x] 4.2 ADR 0026, index des ADR
- [x] 4.3 `docs/architecture/README.md` (onglet, procédure, cache), `deploiement.md` (`MEMBERSHIP_SOURCE_URL`, facultative), `apps/app/AGENTS.md`, `packages/api/AGENTS.md`, `packages/db/AGENTS.md`
- [x] 4.4 `bun run check` et `bun run smoke:web` au vert
