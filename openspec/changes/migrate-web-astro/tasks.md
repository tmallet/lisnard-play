## 0. Prérequis

- [ ] 0.1 Archiver `seo-interventions`, `feed-format-filter` et `group-style-ui` (leurs exigences sont modifiées ici)

## 1. Socle Astro et vérification du runtime

- [ ] 1.1 Créer `apps/web` (`@lisnard/web`) : Astro, `@astrojs/node` (standalone), `@astrojs/react`, `@tailwindcss/vite`, versions épinglées ; scripts `dev`, `build`, `start`, `typecheck`, `test`
- [ ] 1.2 Configurer `vite.ssr.external` (`bun`, `@resvg/resvg-js`) et vérifier sous `bun --bun` : une page qui lit en base, un endpoint PNG, `astro build` puis démarrage de `dist/server/entry.mjs`
- [ ] 1.3 Exporter de `packages/api` une fabrique d'appel serveur (`createCaller` et contexte depuis une `Request`), avec tests
- [ ] 1.4 Monter `/api/trpc` dans `src/pages/api/trpc/[...trpc].ts`
- [ ] 1.5 Middleware d'indexation (`X-Robots-Tag`, `ALLOW_INDEXING`) et endpoint `robots.txt`, en reprenant `indexing.ts`
- [ ] 1.6 Reprendre `public/` (`sw.js`, icônes, vérification Google) et l'endpoint `manifest`

## 2. Coquille et charte

- [ ] 2.1 CSS global : tokens de la charte en `@theme`, Montserrat `woff2` servie localement, focus visible
- [ ] 2.2 `Base.astro` : en-tête et navigation (Accueil, Campagne, À propos, cloche), logo Projet Lisnard (ADR 0034), mention d'indépendance (tablette : pied fixe ; téléphone : en tête), Umami
- [ ] 2.3 `Seo.astro` : titre, description, canonique, Open Graph, Twitter, JSON-LD échappé, à partir des modules `*-meta` repris de `apps/app/src/lib`
- [ ] 2.4 Page 404 avec la mention d'indépendance

## 3. Pages

- [ ] 3.1 Accueil : sections En direct, À venir, Passées ; filtres thème et format par l'adresse ; lien « plus anciennes » (`avant`) ; compteur ; invitation à adhérer ; canonique sans paramètre ; JSON-LD `WebSite` et `Organization`
- [ ] 3.2 Détail d'une intervention : contenu, résumé, points et citations dans le corps ; presse limitée aux métadonnées (ADR 0021) ; `VideoObject` ou `WebPage` ; 404 réel ; invitation à adhérer
- [ ] 3.3 Page d'une citation : métadonnées d'aperçu (`apercu.png`, `summary_large_image`), canonique
- [ ] 3.4 Campagne : vues Adhésions et Déplacements par `?vue`, graphique et carte en SVG serveur, récapitulatifs et leurs métadonnées (ADR 0031), redirection 301 `/adhesions`
- [ ] 3.5 À propos, Mentions légales (sans données d'application mobile), Notifications (explication sans JavaScript)
- [ ] 3.6 Endpoints d'images de citation et de récapitulatif (satori et resvg repris), 503 journalisé en cas d'échec
- [ ] 3.7 Endpoint `sitemap.xml` repris de `sitemap.ts`
- [ ] 3.8 Relais `/admin` repris de `admin-relay.ts` (numéro de prévisualisation compris)
- [ ] 3.9 `Cache-Control` des pages publiques et des ressources immuables

## 4. Îlots React

- [ ] 4.1 Chargement continu des interventions passées, à partir du curseur rendu par le serveur, avec réessai
- [ ] 4.2 Recherche instantanée (formulaire `GET` sans JavaScript)
- [ ] 4.3 Rafraîchissement En direct et À venir (30 s, onglet de nouveau visible)
- [ ] 4.4 Lecteur après consentement, `youtube-nocookie.com`, iframe du fournisseur
- [ ] 4.5 Interactions de la carte et du graphique
- [ ] 4.6 Notifications : abonnement Web Push, préférences, désabonnement, invitation de l'accueil, cas iPhone hors écran d'accueil
- [ ] 4.7 Partage en image (Web Share avec fichier, sinon téléchargement ; lien sans JavaScript) et partage sur X par l'adresse publique
- [ ] 4.8 Repli des filtres sur téléphone avec le nombre de filtres actifs

## 5. Tests et outillage

- [ ] 5.1 Vitest dans `apps/web` : modules repris, pages par l'API Container, îlots sous happy-dom ; reprendre les cas des tests existants d'`apps/app`
- [ ] 5.2 Adapter `scripts/smoke-web.ts` au build Astro : contenu hors `<noscript>`, pagination sans JavaScript, 404, 301 `/adhesions`, canonique de l'accueil filtré, `X-Robots-Tag`
- [ ] 5.3 Script de parité ancien/nouveau service sur un échantillon du plan du site (statut, titre, canonique, JSON-LD)
- [ ] 5.4 Captures Playwright de l'accueil, d'une intervention et d'une citation à 375 et 1280 px, comparées à l'existant
- [ ] 5.5 Mettre à jour la CI et `bun run check` pour `apps/web`

## 6. Déploiement et bascule

- [ ] 6.1 `apps/web/Dockerfile` (Bun, build Astro, resvg et polices des images) et service Coolify de prévisualisation non indexé
- [ ] 6.2 Parité validée (5.2 à 5.4), puis bascule du domaine sur le service `web` et activation de `ALLOW_INDEXING`
- [ ] 6.3 Observation deux semaines : journaux, Search Console, Umami

## 7. Retrait d'Expo Push

- [ ] 7.1 `packages/api` : retirer la variante `expo` de l'abonnement ; test du refus d'un jeton Expo
- [ ] 7.2 `packages/db` : migration qui supprime les abonnements `expo` et recrée `push_kind` sans `expo`
- [ ] 7.3 Worker : retirer l'envoi Expo Push et `EXPO_ACCESS_TOKEN` (config, `.env.example`, Coolify)

## 8. Nettoyage

- [ ] 8.1 Supprimer `apps/app`, son Dockerfile et son service Coolify ; retirer les dépendances Expo et React Native du lockfile
- [ ] 8.2 Renommer les mentions `apps/app` restantes (scripts racine, `docs:check`, devcontainer)

## 9. Documentation

- [ ] 9.1 ADR remplaçant 0009 (Vitest pour le site), 0011 (rendu par requête), 0013 (polices sans `expo-font`), 0015 (image du service web), 0019 (plus de Metro), 0024 (Web Push seulement), 0030 et 0036 (métadonnées rendues par la page) ; index mis à jour
- [ ] 9.2 `AGENTS.md` : retirer la note de migration, les règles Expo et la mention « web et mobile » ; `openspec/config.yaml` (`context`) aligné sur l'ADR 0037
- [ ] 9.3 `apps/web/AGENTS.md` (remplace `apps/app/AGENTS.md`) : pages, îlots, données par `createCaller`, règle « lisible sans JavaScript »
- [ ] 9.4 `docs/architecture/` (README, commandes, déploiement) et `.agents/skills/` : `charte-ui` (HTML et Tailwind, plus d'Uniwind), `trpc-procedure` (appel serveur et îlots), `docs-sync`
- [ ] 9.5 Specs principales : corriger à la main le `Purpose` d'`app-shell` et d'`intervention-feed` (plus de mention d'iOS, d'Android ni du mobile) ; renseigner celui de `push-notifications`
