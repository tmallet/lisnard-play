## 1. Image

- [ ] 1.1 Dépendances `satori`, `@resvg/resvg-js` (app) ; module `src/server/quote-image.ts` : mise en page, polices, taille selon la longueur ; test (PNG 1080 × 1080, texte présent dans le SVG)
- [ ] 1.2 Route `/interventions/<id>/citation/<s>/image.png` dans `server.ts` : validation, 404, cache mémoire et en-têtes

## 2. Partage

- [ ] 2.1 `bunx expo install expo-sharing expo-file-system` ; `shareImage(url, fichier)` : feuille de partage native, partage de fichier ou téléchargement sur le web ; tests
- [ ] 2.2 Bouton « Partager en image » sur la page d'une citation et dans `QuotesBlock`
- [ ] 2.3 Vérification visuelle (images de citations courte et longue, bouton sur téléphone et ordinateur)

## 3. Qualité

- [ ] 3.1 Smoke web : l'image d'une citation est un PNG 1080 × 1080, une citation inconnue répond 404
- [ ] 3.2 `bun run check` et `bun run smoke:web` au vert

## 4. Documentation

- [ ] 4.1 ADR 0029 et index ; `docs/architecture/README.md` (route, dépendances), `apps/app/AGENTS.md`, skill `charte-ui` si la règle des images partagées y a sa place
