## 1. Données

- [ ] 1.1 Colonne `source.official` (migration 0008) et recopie par le worker depuis `sources.config.ts`
- [ ] 1.2 `listTimelineItems` dans `@lisnard/db/read` (jour de Paris, officielle, direct) ; tests
- [ ] 1.3 Vérifier le fuseau du « jour » de la source et l'aligner (D3)

## 2. API

- [ ] 2.1 `src/membership/source.ts` : lecture, validation zod, cache 90 s, requête unique en vol, repli sur la dernière valeur valide ; tests (cache, panne, réponse invalide)
- [ ] 2.2 Procédure `membership.timeline` (coupe de l'historique, jour en cours) ; tests

## 3. App

- [ ] 3.1 `bunx expo install react-native-svg`
- [ ] 3.2 `layoutMarkers` (positions et empilement) ; tests
- [ ] 3.3 Graphique : courbe, aire, grille, axes, défilement ouvert sur la fin, repères (miniatures rondes, points, liseré direct)
- [ ] 3.4 Carte de l'intervention sélectionnée (toucher, survol web), lien vers la page
- [ ] 3.5 Page `(tabs)/adhesions` : total, mise à jour, source, phrase de prudence, état de repli ; onglet dans `NAV_ITEMS`
- [ ] 3.6 Vérification visuelle sur téléphone et ordinateur (captures)

## 4. Qualité et documentation

- [ ] 4.1 Smoke web : `/adhesions` pré-rendue, `membership.timeline` servie depuis des fixtures (`MEMBERSHIP_SOURCE_URL`)
- [ ] 4.2 ADR 0026, index des ADR
- [ ] 4.3 `docs/architecture/README.md` (onglet, procédure, cache), `deploiement.md` (`MEMBERSHIP_SOURCE_URL`, facultative), `apps/app/AGENTS.md`, `packages/api/AGENTS.md`, `packages/db/AGENTS.md`
- [ ] 4.4 `bun run check` et `bun run smoke:web` au vert
