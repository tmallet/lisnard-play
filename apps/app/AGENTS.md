# apps/app — @lisnard/app

Application Expo Router (web, iOS, Android) qui sert aussi l'API via ses API
routes. Vue d'ensemble : [docs/architecture/README.md](../../docs/architecture/README.md).

## Expo évolue vite : ne pas se fier à sa mémoire

Expo casse des API à chaque SDK (ici **SDK 57**). Avant de toucher une API
Expo, EAS ou React Native :

1. lire la version majeure d'`expo` dans `package.json` ;
2. consulter la doc correspondante : `https://docs.expo.dev/versions/v57.0.0/`,
   et `https://docs.expo.dev/llms.txt` pour le reste ;
3. charger les skills Expo du plugin (`expo:expo-router`, `expo:expo-ui`…)
   quand ils s'appliquent.

Ajouter une dépendance avec `bunx expo install <paquet>`, jamais `bun add`
directement : seul `expo install` choisit une version compatible avec le SDK.

## Structure

| Chemin | Rôle |
|--------|------|
| `src/app/` | Routes uniquement. Chaque fichier est un écran ; `_layout.tsx` = navigateur ; `+api.ts` = route API |
| `src/app/_layout.tsx` | Racine : `global.css`, polices, `ApiProvider`, fond en dégradé, `Stack` (`initialRouteName: '(tabs)'`, thème de navigation à fond transparent) |
| `src/app/+html.tsx` | Document HTML web (exécuté au rendu serveur, jamais côté client) |
| `src/app/(tabs)/` | Accueil (`index`, flux `InterventionFeed`) et `a-propos`. Navigation dans `components/AppNavigation(.web).tsx` : en-tête et liens sur le web, barre d'onglets **native** sur iOS et Android |
| `src/app/interventions/[id].tsx` | Détail d'une intervention : média, métadonnées, lien source ; distingue `NOT_FOUND` d'une erreur réseau |
| `src/app/api/trpc/[trpc]+api.ts` | Point d'accès tRPC (`GET`/`POST /api/trpc/*`), client Postgres partagé sur `globalThis` (ADR 0019) |
| `src/components/` | Composants partagés (hors routes) : `InterventionFeed`, `InterventionCard`, `LiveBadge`, `ThemeFilter`, `MediaEmbed(.web)`, `LinkCard`… |
| `src/lib/format.ts` | Dates en heure de Paris, libellés de type, libellés des thèmes (`THEME_LABELS`, type `Theme` inféré depuis `AppRouter`) |
| `shims/bun.js`, `metro.config.js` | Module `bun` résolu vers `globalThis.Bun` pour Metro (ADR 0019) |
| `server.ts` | Serveur de production Bun (`expo-server/adapter/bun`) qui sert `dist/` |
| `src/config/identity.json` | **Source unique** du nom de l'application (lu par `config/app.ts` et `app.config.ts`) : ne jamais écrire le nom en dur ailleurs |
| `src/config/app.ts` | `APP_NAME`, mentions (indépendance, sources), contact, `pageTitle()` |
| `src/config/navigation.ts` | `NAV_ITEMS` : onglets (route, lien, libellé, icônes), partagés par le web et le natif |
| `src/theme/colors.ts`, `src/theme/fonts.ts` | Valeurs JS de la charte (couleurs, noms Montserrat) pour les API qui n'acceptent pas de classes |
| `app.config.ts` | Complète `app.json` avec le nom issu de `identity.json` |
| `src/lib/trpc.tsx` | `ApiProvider`, `useTRPC` |
| `src/lib/push(.web).ts`, `push-types.ts`, `useNotifications.ts` | Notifications (ADR 0024) : Web Push (service worker `public/sw.js`, clé VAPID servie par `notifications.config`) ou `expo-notifications` (masqué sans projet EAS) ; état de l'écran `/notifications` |
| `src/components/NotifyInvite.tsx`, `NotificationsEntry(.web).tsx`, `src/lib/usePushAvailability.ts` | Entrées vers `/notifications` : invitation sur l'accueil sans direct, lien mobile ; la cloche web est dans `WebChrome.web.tsx`. Affichées seulement si l'appareil peut s'abonner |
| `src/config/join.ts`, `src/components/JoinCta.tsx` | Invitation à adhérer (ADR 0025) : lien de parrainage de l'éditeur, signalé sous le bouton ; accueil et détail |
| `src/components/PushLifecycle(.web).tsx` | Reconfirme l'abonnement au démarrage ; sur mobile, ouvre l'intervention touchée dans une notification |
| `src/app/manifest+api.ts`, `public/` | Manifeste web (installation sur l'écran d'accueil, condition des notifications sur iPhone), icônes, service worker |
| `src/global.css` | Tailwind + Uniwind + tokens de la charte |
| `src/uniwind-types.d.ts` | Généré par Metro (Uniwind), commité pour la vérification des types en CI |

## Conventions

- **Style** : `className` avec les tokens de la charte (`bg-bleu-sombre`,
  `text-chamois`, `font-sans-extrabold`…). Quand une API exige une valeur JS
  (options natives, `+html.tsx`), importer `colors` / `fontFamily` depuis
  `src/theme/` : jamais de code hex ni de nom de police en dur. Règles complètes : skill `charte-ui`.
- **Composant tiers sans `className`** : l'envelopper avec `withUniwind`
  (`import { withUniwind } from 'uniwind'`).
- **Variantes par plateforme** : fichiers `.web.tsx` / `.tsx` (`AppNavigation`,
  `Screen`) plutôt que des `Platform.OS` dans les écrans.
- **Navigation mobile** : `NativeTabs` (`expo-router/unstable-native-tabs` en SDK 57,
  `expo-router/native-tabs` à partir du SDK 58). Icônes : `sf` (SF Symbols, iOS) et
  `md` (Material, Android). Sur iOS 26+, la barre est en Liquid Glass et le système
  ignore `backgroundColor` et adapte lui-même les couleurs.
- **Écrans** : toujours envelopper le contenu dans `<Screen>`. Sur mobile
  (`Screen.tsx`), il fournit la mise en page commune : dégradé (le conteneur des
  onglets natifs masque la racine), pied de page avec la
  mention d'indépendance (`footer={false}` si l'écran l'affiche déjà), et un
  `ScrollView` en premier élément, ce qu'exigent les onglets natifs. Sur le web
  (`Screen.web.tsx`), en-tête et pied de page viennent d'`AppNavigation.web.tsx`.
- **Métadonnées web** : `<PageHead title=… description=… />` dans chaque écran, 404
  comprise (`+not-found.tsx`) : c'est lui qui pose `<title>`, la description et les
  balises Open Graph. `+html.tsx` ne porte que les balises communes.
- **Données** : toujours via tRPC (`useTRPC()` + `useQuery(trpc.x.queryOptions())`,
  ou `useInfiniteQuery(trpc.x.infiniteQueryOptions())` pour une liste paginée par
  curseur, comme le flux). L'app n'accède jamais à la base elle-même : seule l'API
  route lit Postgres, via `@lisnard/db/read` (ADR 0017). Pour ajouter une
  procédure : skill `trpc-procedure`.
- **Listes longues** : le contenu d'un écran défile dans le `ScrollView` de
  `Screen`. Pour charger la suite d'une liste à l'approche du bas, appeler
  `useOnEndReached(cb)` (`components/ScrollEnd.tsx`) plutôt qu'ajouter un bouton
  ou une `FlatList` imbriquée. Le rappel doit se protéger lui-même (`hasNextPage`,
  `isFetchingNextPage`), car il est appelé à chaque défilement près du bas.
- **Cartes** : image à la une en 16:9 sur toute la largeur. Listes en `CardGrid` : 1 colonne sur
  téléphone, 2 dès 768 px, 3 dès 1024 px ; l'accueil utilise `<Screen wide>` (max-w-6xl),
  les autres écrans gardent la colonne de lecture (max-w-3xl). `largeThumbnail` passe les
  miniatures YouTube en `hq720`, avec repli sur l'image d'origine (`onError`).
- **Lecteurs tiers** : toujours via `PlayerConsent` (clic pour charger, ADR 0022), jamais
  `MediaEmbed` directement dans un écran. `playerUrl()` passe YouTube sur
  `youtube-nocookie.com` et active la lecture automatique après le clic.
- **Mentions légales** : contact et hébergeur dans `config/legal.ts`, page
  `mentions-legales`, lien `LegalLink` dans le pied de page.
- **Médias** : `MediaEmbed` affiche le lecteur de l'URL fournie par le worker
  (iframe sur le web, `react-native-webview` sur mobile), sinon `LinkCard`. Jamais
  de téléchargement ni de réhébergement (ADR 0007).
- **Rendu web** : pré-rendu au build en SDK 57 (ADR 0011). Une route dynamique
  exige donc `generateStaticParams`, ou des métadonnées génériques.

## Tests

- `bun --filter @lisnard/app test` : jest-expo + React Native Testing Library.
  En RNTL 14, `render` est **asynchrone** : écrire `await render(...)`.
- Tests à côté du code, dans des dossiers `__tests__/`.
- Le smoke test web (`bun run smoke:web`) vérifie le HTML servi et l'API, avec
  le serveur Bun de production et une base jetable.
- Les tests qui rendent un composant à requêtes créent leur propre
  `QueryClient` (`retry: false`, `gcTime` infini) et le vident en fin de test
  (`client.clear()`), sinon des minuteurs survivent et Jest ne se termine pas.

## Pièges

- `CI=1 bunx expo start` **désactive la surveillance des fichiers** : les
  modifications ne sont plus servies. Pour itérer, lancer Metro sans `CI`
  (`bun run dev < /dev/null` dans un terminal non interactif).
- **Les API routes exigent le runtime Bun** (`Bun.sql`) : passer par
  `bun run dev`, qui lance `expo start` sous Bun avec le `.env` racine, plutôt
  que `bunx expo start` (Node). Erreur typique sinon : « Unable to resolve
  module bun » ou `Bun is not defined` (ADR 0019).
- **Export web** : `bunx expo export`, qui tourne sous Node s'il est installé.
  Sous Bun (`bun --bun expo export`), Metro échoue sur Linux dès que Node est
  aussi présent (« Cannot find module './Worker.js' »), comme sur la CI.
  L'image Docker, sans Node, exporte sous Bun sans problème.
- **État serveur** (connexion, cache) : le garder sur `globalThis`. Metro
  réévalue les modules à chaque rechargement, et un pool recréé à chaque fois
  épuise les connexions Postgres (« too many clients »).
- **Fond blanc sur le web** : la `Stack` peint le fond de son thème. Le thème
  de navigation de `_layout.tsx` le rend transparent pour laisser voir le dégradé.
- **Lecteurs intégrés** : le navigateur de prévisualisation de l'agent bloque
  les iframes externes. Vérifier la lecture dans un vrai navigateur ou sur le
  simulateur iOS.

## Natif

`ios/` et `android/` sont générés à la demande (Continuous Native Generation),
ignorés par git et jamais modifiés à la main. On configure le natif dans
`app.json` et via les config plugins. Expo Go suffit tant qu'aucun module
natif hors SDK n'est ajouté.
