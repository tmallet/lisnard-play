## 1. Mentions légales

- [x] 1.1 `config/legal.ts` : contact, hébergeur, date de mise à jour
- [x] 1.2 Route `mentions-legales` : éditeur anonyme, contact, hébergeur, données et cookies, droits et CNIL, sources et résumés automatiques
- [x] 1.3 Lien « Mentions légales et confidentialité » dans `Footer` (mobile et web) et dans « À propos »

## 2. Consentement des lecteurs

- [x] 2.1 `playerUrl()` : YouTube vers `youtube-nocookie.com`, `autoplay=1` ; tests
- [x] 2.2 `PlayerConsent` : miniature, bouton « Lire la vidéo », mention du fournisseur ; lecteur rendu après le clic ; tests
- [x] 2.3 Écran de détail et `MediaEmbed` (natif : lecture sans second geste)

## 3. Qualité et documentation

- [x] 3.1 Smoke test : `/mentions-legales` pré-rendue, avec contact et hébergeur
- [x] 3.2 `apps/app/AGENTS.md` ; `bun run check` et `bun run smoke:web` au vert
