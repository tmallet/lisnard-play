## 1. Monorepo

- [x] 1.0 Créer `.tool-versions` (versions stables de `bun` et `nodejs` LTS) et vérifier `asdf install` sur le poste (design D9)
- [x] 1.1 Créer le `package.json` racine (workspaces `apps/*`, `packages/*`, `private: true`) et `bunfig.toml` avec `install.linker = "hoisted"` (design D1)
- [x] 1.2 Ajouter `tsconfig.base.json` (strict) et `biome.json`, puis les scripts racine `format`, `lint`, `typecheck`, `test` et `check` délégués par `bun --filter` (ADR 0009)
- [x] 1.3 Compléter `.gitignore` (node_modules, `.expo`, `dist`, `.env*` sauf `.env.example`) et ajouter `.env.example` avec `EXPO_PUBLIC_API_URL`

## 2. Application Expo

- [x] 2.1 Créer `apps/app` avec le dernier SDK Expo stable et Expo Router (dossier `src/app`), confirmer que `bun install` et `bun run dev` démarrent sur web, iOS et Android
- [x] 2.2 Régler `web.output: "server"` et vérifier que le SSR et les API routes fonctionnent avec ce SDK. En cas de blocage, appliquer le repli du design (D2, Risques) et consigner un ADR
- [x] 2.3 Installer et configurer Uniwind (CSS global, enveloppe Metro), confirmer la compatibilité avec le SDK installé
- [x] 2.4 Déclarer les tokens de la charte dans `@theme` (cinq couleurs de l'ADR 0001, police Montserrat) et vérifier qu'une classe `bg-bleu-sombre` / `text-chamois` s'applique sur web et mobile
- [x] 2.5 Embarquer Montserrat 400, 600, 700 et 800 via `@expo-google-fonts/montserrat` + `expo-font`, sans aucun appel réseau à Google Fonts (D5)

## 3. Coquille de l'application

- [x] 3.1 Créer `src/config/app.ts` (`APP_NAME` provisoire, `INDEPENDENCE_NOTICE`, `CONTACT`) comme source unique (D6)
- [x] 3.2 Écrire `app/+html.tsx` : `lang="fr"`, meta description, balises `og:title`, `og:description` et `og:type` alimentées par `src/config/app.ts`
- [x] 3.3 Créer la mise en page racine : fond en dégradé 160° bleu → bleu sombre (Uniwind `bg-linear-160`, voir design D4), repli `bg-bleu-sombre`, texte blanc
- [x] 3.4 Créer la navigation : en-tête avec liens sur le web, barre d'onglets native (`NativeTabs`) sur iOS et Android ; routes `(tabs)/index` et `(tabs)/a-propos`
- [x] 3.5 Créer le composant `Footer` (mention d'indépendance visible sur toutes les pages web) et l'ajouter en bas de l'accueil sur mobile
- [x] 3.6 Créer le composant `Title` (Montserrat 800, majuscules, un seul mot chamois via `highlight`)
- [x] 3.7 Rédiger l'écran « À propos » : objet de l'application, mention d'indépendance, origine publique des contenus, contact
- [x] 3.8 Vérifier le focus clavier visible (contour émeraude) et un contraste ≥ 4,5:1 sur le texte principal

## 4. Transport tRPC

- [x] 4.1 Créer `packages/api` (`@lisnard/api`) : initialisation tRPC, `createContext`, `publicProcedure`, `errorFormatter` (sans `stack` hors développement, `zodError` aplati) (D3)
- [x] 4.2 Implémenter la procédure `health` → `{ status: "ok", version, time }` (ISO 8601) et exporter `appRouter` et `AppRouter`
- [x] 4.3 Monter le handler dans `apps/app/src/app/api/trpc/[trpc]+api.ts` (`GET` et `POST`, `endpoint: "/api/trpc"`)
- [x] 4.4 Créer le client : `@trpc/tanstack-react-query` + `httpBatchLink`, URL relative sur le web, `EXPO_PUBLIC_API_URL` ou hôte Metro sur mobile ; provider React Query dans la mise en page racine
- [x] 4.5 Afficher le statut de santé sur l'accueil en développement uniquement

## 5. Tests et CI

- [x] 5.1 Tests `bun test` dans `packages/api` : santé nominale, entrée invalide rejetée avec le champ en cause (procédure de test interne), erreur interne sans `stack` en production
- [x] 5.2 Configurer `jest-expo` + React Native Testing Library dans `apps/app`. Tests : `Footer` affiche la mention, `Title` met en évidence un seul mot, le nom vient de `APP_NAME`
- [x] 5.3 Écrire `scripts/smoke-web.ts` : export web, serveur local, requêtes sans JavaScript sur `/`, `/a-propos` et `/api/trpc/health`, vérification de `lang`, `<title>`, des meta OG, de la mention et de la réponse de santé (D7)
- [x] 5.4 Ajouter un test de typage qui prouve qu'un changement incompatible de `AppRouter` fait échouer `bun run typecheck` (ex. `// @ts-expect-error` sur un usage client invalide)
- [x] 5.5 Écrire `scripts/docs-check.ts` selon le design D8 et l'exposer en `bun run docs:check`. Le faire passer sur la doc existante
- [x] 5.6 Créer `.github/workflows/ci.yml` : Bun et Node installés depuis `.tool-versions` (`bun-version-file`, `node-version-file`), cache, `bun run check`, puis smoke test web, sur PR et sur `main`
- [x] 5.8 Étendre `docs:check` : cohérence entre `.tool-versions`, `packageManager` et `engines` du `package.json` racine
- [x] 5.7 Vérifier localement que `bun run check` et le smoke test passent sans erreur

## 6. Devcontainer

- [x] 6.1 Écrire `.devcontainer/Dockerfile` : Debian slim, utilisateur non root, asdf + plugins `nodejs` et `bun`, `asdf install` depuis `.tool-versions`, git, gh, openspec, Claude Code, Codex, iptables/ipset (D10)
- [x] 6.2 Écrire `.devcontainer/devcontainer.json` : volumes nommés pour `node_modules` et le cache Bun, port 8081 redirigé, `remoteEnv` limité aux variables nécessaires, capacités `NET_ADMIN`/`NET_RAW`, `postCreateCommand: bun install`
- [x] 6.3 Écrire `.devcontainer/init-firewall.sh` (liste blanche en tête de fichier, refus par défaut, auto-vérification qu'un domaine hors liste est bloqué) et le lancer en `postStartCommand`
- [x] 6.4 Vérifier dans le conteneur : `bun install`, `bun run check`, smoke test web, `bun run dev` joignable depuis le navigateur de l'hôte
- [x] 6.5 Vérifier le workflow mobile : simulateur iOS de l'hôte connecté à Metro dans le conteneur via `localhost:8081`, et téléphone physique via `REACT_NATIVE_PACKAGER_HOSTNAME` ou `--tunnel` (simulateur vérifié sur le port 8082 ; téléphone physique documenté, non testé faute d’appareil)
- [x] 6.6 Vérifier qu'un agent lancé sans confirmation dans le conteneur ne peut pas joindre un domaine hors liste (ex. `curl https://example.com` échoue)

## 7. Documentation

- [x] 7.1 Créer `docs/architecture/README.md` (vue d'ensemble : schéma des modules, flux requête web → SSR → tRPC, emplacement des tokens et de la config) et `docs/architecture/commandes.md` (install, dev, check, smoke, docs:check)
- [x] 7.2 Créer `apps/app/AGENTS.md` (routes, coquille, tokens Uniwind, `src/config/app.ts`, tests jest-expo) et `packages/api/AGENTS.md` (structure du routeur, conventions de procédure, erreurs, tests)
- [x] 7.3 Mettre à jour `AGENTS.md` racine : retirer l'état « pré-code », ajouter les commandes, les nouveaux skills et le renvoi vers `docs/architecture/`
- [x] 7.4 Créer le skill `docs-sync` (quelle doc mettre à jour selon les fichiers touchés, `bun run check` en fin de tâche) dans `.agents/skills/`, avec son symlink dans `.claude/skills/`
- [x] 7.5 Créer le skill `charte-ui` (tokens, règle du mot chamois, interdits de l'ADR 0001, composants `Title`/`Footer`, accessibilité), avec son symlink
- [x] 7.6 Créer le skill `trpc-procedure` (où déclarer, validation zod, public ou protégé, tests via `createCaller`, usage client), avec son symlink
- [x] 7.7 Passer l'ADR 0009 en `accepted` (frontmatter + index). Si les tâches 2.2 ou 2.3 ont imposé un repli, créer l'ADR correspondant avec le skill `record-decision`
- [x] 7.8 Ajouter `.env.example` et le flux CI dans `docs/architecture/commandes.md`, puis lancer `bun run docs:check`
- [x] 7.9 Créer `docs/architecture/devcontainer.md` : démarrage, volumes, workflow mobile hôte ↔ conteneur, pare-feu (ajouter un domaine), mode autonome des agents et ses limites
- [x] 7.10 Passer l'ADR 0010 en `accepted` (frontmatter + index) et mentionner `.tool-versions` et le devcontainer dans `AGENTS.md`
