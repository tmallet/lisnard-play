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
| `src/app/_layout.tsx` | Racine : `global.css`, polices, `ApiProvider`, fond en dégradé |
| `src/app/+html.tsx` | Document HTML web (exécuté au rendu serveur, jamais côté client) |
| `src/app/(tabs)/` | Accueil (`index`) et `a-propos`. Navigation dans `components/AppNavigation(.web).tsx` : en-tête et liens sur le web, barre d'onglets **native** sur iOS et Android |
| `src/app/api/trpc/[trpc]+api.ts` | Point d'accès tRPC (`GET`/`POST /api/trpc/*`) |
| `src/components/` | Composants partagés (hors routes) |
| `src/config/app.ts` | **Source unique** du nom et des mentions : ne jamais écrire le nom en dur ailleurs |
| `src/lib/trpc.tsx` | `ApiProvider`, `useTRPC` |
| `src/global.css` | Tailwind + Uniwind + tokens de la charte |
| `src/uniwind-types.d.ts` | Généré par Metro (Uniwind), commité pour la vérification des types en CI |

## Conventions

- **Style** : `className` avec les tokens de la charte (`bg-bleu-sombre`,
  `text-chamois`, `font-sans-extrabold`…). Pas de couleur en dur, sauf là où
  une API exige une valeur JS (options de navigation). Règles complètes : skill `charte-ui`.
- **Composant tiers sans `className`** : l'envelopper avec `withUniwind`
  (exemple : `SafeAreaView` dans `Screen.tsx`).
- **Variantes par plateforme** : fichiers `.web.tsx` / `.tsx` (exemple :
  `AppNavigation`). Sur mobile, la mention d'indépendance est affichée dans
  le contenu ; sur le web, dans le pied de page.
- **Navigation mobile** : `NativeTabs` (`expo-router/unstable-native-tabs` en SDK 57,
  `expo-router/native-tabs` à partir du SDK 58). Icônes : `sf` (SF Symbols, iOS) et
  `md` (Material, Android). Sur iOS 26+, la barre est en Liquid Glass et le système
  ignore `backgroundColor` et adapte lui-même les couleurs.
- **Écrans** : toujours envelopper le contenu dans `<Screen>`. Il porte le dégradé
  sur mobile (le conteneur des onglets natifs masque la racine) et place le
  `ScrollView` comme premier élément, ce qu'exigent les onglets natifs.
- **Métadonnées web** : `<PageHead title=… description=… />` dans chaque écran.
- **Données** : toujours via tRPC (`useTRPC()` + `useQuery(trpc.x.queryOptions())`).
  Pour ajouter une procédure : skill `trpc-procedure`.
- **Rendu web** : pré-rendu au build en SDK 57 (ADR 0011). Une route dynamique
  exige donc `generateStaticParams`, ou des métadonnées génériques.

## Tests

- `bun --filter @lisnard/app test` : jest-expo + React Native Testing Library.
  En RNTL 14, `render` est **asynchrone** : écrire `await render(...)`.
- Tests à côté du code, dans des dossiers `__tests__/`.
- Le smoke test web (`bun run smoke:web`) vérifie le HTML servi et l'API.

## Pièges

- `CI=1 bunx expo start` **désactive la surveillance des fichiers** : les
  modifications ne sont plus servies. Pour itérer, lancer Metro sans `CI`
  (`bunx expo start < /dev/null` dans un terminal non interactif).

## Natif

`ios/` et `android/` sont générés à la demande (Continuous Native Generation),
ignorés par git et jamais modifiés à la main. On configure le natif dans
`app.json` et via les config plugins. Expo Go suffit tant qu'aucun module
natif hors SDK n'est ajouté.
