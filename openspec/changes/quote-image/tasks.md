## 1. Image

- [x] 1.1 Durée de la vidéo dans la citation lue (`getQuoteAt`, `quotes.at`)
- [x] 1.2 Dépendances `satori`, `@resvg/resvg-js` (app) ; mise en page pure (`quote-card.ts`, testée) et rendu PNG (`quote-image.ts`)
- [x] 1.3 Route `/interventions/<id>/citation/<s>/image.png` dans `server.ts` : validation, lecture par l'API interne, 404, cache mémoire et en-têtes
- [x] 1.4 Image Docker : module d'image empaqueté, resvg, polices

## 2. Partage

- [x] 2.1 `bunx expo install expo-sharing expo-file-system` ; `shareImage(url, fichier)` : feuille de partage native, partage de fichier ou téléchargement sur le web ; tests
- [x] 2.2 Bouton « Partager en image » sur la page d'une citation et dans `QuotesBlock`
- [x] 2.3 Vérification visuelle (images de citations courte et longue, bouton sur téléphone et ordinateur)

## 3. Qualité

- [x] 3.1 Smoke web : l'image d'une citation est un PNG 1080 × 1080, une citation inconnue répond 404
- [x] 3.2 `bun run check` et `bun run smoke:web` au vert

## 4. Documentation

- [x] 4.1 ADR 0029 et index ; `docs/architecture/README.md` (route, dépendances), `apps/app/AGENTS.md`, skill `charte-ui` si la règle des images partagées y a sa place
