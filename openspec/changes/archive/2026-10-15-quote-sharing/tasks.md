## 1. Image paysage

- [x] 1.1 `quoteCard(data, format)` : variante paysage 1200 × 630 ; tests
- [x] 1.2 Route `…/apercu.png` (même gestionnaire et cache, clé avec le format) ; smoke : PNG 1200 × 630

## 2. Aperçu du lien

- [x] 2.1 Réécriture de l'en-tête des pages de citation dans `server.ts` (`HTMLRewriter`) : titre, description, `og:image`, `og:url`, `twitter:card`, `twitter:image` ; gabarit inchangé si la citation est introuvable ; tests
- [x] 2.2 Smoke : la page d'une citation porte la citation dans son titre et `og:image` vers `apercu.png`

## 3. Partage sur X

- [x] 3.1 `xShareUrl(texte, adresse)` : guillemets, signature, raccourci à 280 caractères (lien compté 23) ; tests
- [x] 3.2 Bouton « Partager sur X » sur la page d'une citation et dans `QuotesBlock`
- [x] 3.3 Vérification : aperçu lu par un client sans JavaScript, bouton sur téléphone et ordinateur

## 4. Qualité

- [x] 4.1 `bun run check` et `bun run smoke:web` au vert

## 5. Documentation

- [x] 5.1 ADR 0030 et index (l'ADR 0011, accepté, n'est pas réécrit : l'ADR 0030 y renvoie) ; `docs/architecture/README.md`, `apps/app/AGENTS.md`
