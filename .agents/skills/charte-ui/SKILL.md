---
name: charte-ui
description: Règles visuelles de l'application (charte réduite Nouvelle Énergie, indépendance). À utiliser pour tout travail d'interface dans apps/app — nouvel écran, composant, couleur, typographie, mise en page, accessibilité — et avant de valider un changement visuel.
---

# Charte UI

L'application est **indépendante** (ADR 0001) : elle reprend la palette et la
police de la charte Nouvelle Énergie, et rien d'autre. Les sources de la charte
(sites officiels, kit militant), la palette officielle étendue et les éléments
exclus sont dans l'**ADR 0012**.

## Interdits

- Le logo Nouvelle Énergie, l'hexagone signature, ou tout visuel officiel de
  la campagne (photos officielles, slogans).
- Tout nom d'application ou formulation qui suggère un lien officiel.
- Retirer ou masquer la mention d'indépendance (`INDEPENDENCE_NOTICE`).
- Une couleur hors palette. Pour ajouter un token, partir des valeurs
  officielles `--ne-*` (ADR 0012) et le décider explicitement.
- Tout fichier du kit militant (textures hexagonales, fond, polices Tubqal Pro
  ou Tango Sans) : il n'entre jamais dans le dépôt.
- Une autre police que Montserrat (police web des sites officiels).

## Tokens (`apps/app/src/global.css`)

| Classe | Valeur | Usage |
|--------|--------|-------|
| `bleu` | `#1d257a` | couleur principale, début du dégradé |
| `bleu-sombre` | `#0f1752` | fond, fin du dégradé |
| `chamois` | `#b0ad85` | accent : **un seul mot-clé par titre**, liens |
| `blanc` | `#f9f9f9` | texte (opacités `/85`, `/70` pour le secondaire) |
| `emeraude` | `#52c985` | focus clavier, état « en direct », statut positif |
| `font-sans` | Montserrat 400 | texte courant |
| `font-sans-semibold` | Montserrat 600 | liens, libellés |
| `font-sans-bold` | Montserrat 700 | chapeaux, accroches |
| `font-sans-extrabold` | Montserrat 800 | titres (majuscules) |

Fond de page : `bg-bleu-sombre bg-linear-160 from-bleu to-bleu-sombre`. Sur le
web, il est posé dans `_layout.tsx`. Sur mobile, c'est `Screen` qui le dessine,
car les onglets natifs masquent la racine : tout écran passe donc par `<Screen>`.

Barre d'onglets native : couleurs passées en options JS (`AppNavigation.tsx`).
Sur iOS 26+, le Liquid Glass ignore `backgroundColor` et adapte les teintes : c'est
le comportement natif attendu, ne pas le contourner.

Si une API exige une valeur JS (options natives, `+html.tsx`), importer `colors`
(`src/theme/colors.ts`) et `fontFamily` (`src/theme/fonts.ts`) : jamais de code hex
ni de nom de police en dur, jamais de valeur dérivée (opacité, teinte) hors
`blancSecondaire`.

## Composants existants

- `Title` : titre de page, en Montserrat 800 et en majuscules. La prop
  `highlight` met **un seul** mot ou groupe de mots en chamois.
  `<Title highlight="David Lisnard">Toutes les interventions de David Lisnard</Title>`
- `Footer` : mention d'indépendance. Sur le web, elle est dans le pied de page
  global (`AppNavigation.web.tsx`). Sur mobile, `Screen` l'ajoute en bas de chaque
  écran.
- `Screen` : conteneur de page. Sur mobile, il dessine dégradé, surtitre avec le
  nom et pied de page ; sur le web, défilement et largeur maximale `max-w-3xl`.
- Icônes de l'app (`assets/images/`) : monogramme « LP » provisoire en Montserrat
  ExtraBold (L blanc, P chamois) sur le dégradé, sans logo ni hexagone.
- `PageHead` : `<title>` et balises Open Graph d'un écran web.
- `JoinCta` : invitation à adhérer à Nouvelle Énergie (ADR 0025), sur l'accueil et le
  détail. Charte de l'app seulement, jamais de logo ni de visuel du parti ; la mention
  du parrainage reste sous le bouton. Lien et textes : `src/config/join.ts`.
  Sur l'accueil, `<JoinCta compact />` : sur téléphone, titre et bouton court, mention
  courte ; forme complète dès `md`.

## Accessibilité (spec app-shell)

- Contraste ≥ 4,5:1 pour le texte. Mesuré sur bleu et bleu sombre : blanc
  ≥ 12,5, blanc/70 ≥ 6,8, chamois ≥ 5,7, émeraude ≥ 6,3. Ne pas descendre
  sous `blanc/70` pour du texte.
- Focus clavier visible sur le web : contour émeraude défini dans `global.css`
  (`:focus-visible`). Ne pas le supprimer.
- Rôles sémantiques : `role="heading"` pour les titres, `banner`,
  `navigation`, `main` et `contentinfo` pour la structure.

## Vérifier

- Web : `bun run dev`, ouvrir la page, parcourir au clavier avec Tab.
- iOS : simulateur via Expo Go.
- `bun run check` (les tests de `Title` et `Footer` couvrent la règle du mot
  chamois et la mention).
