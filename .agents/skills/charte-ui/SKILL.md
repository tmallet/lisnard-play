---
name: charte-ui
description: Règles visuelles de l'application (charte réduite Nouvelle Énergie, indépendance). À utiliser pour tout travail d'interface dans apps/app — nouvel écran, composant, couleur, typographie, mise en page, accessibilité — et avant de valider un changement visuel.
---

# Charte UI

L'application est **indépendante** (ADR 0001) : elle reprend la palette et la
police de la charte Nouvelle Énergie, et rien d'autre.

## Interdits

- Le logo Nouvelle Énergie, l'hexagone signature, ou tout visuel officiel de
  la campagne (photos officielles, slogans).
- Tout nom d'application ou formulation qui suggère un lien officiel.
- Retirer ou masquer la mention d'indépendance (`INDEPENDENCE_NOTICE`).
- Une couleur hors palette.

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

Si une API exige une valeur JS (options de navigation, par exemple), reprendre
les valeurs hexadécimales ci-dessus, jamais d'autres.

## Composants existants

- `Title` : titre de page, en Montserrat 800 et en majuscules. La prop
  `highlight` met **un seul** mot ou groupe de mots en chamois.
  `<Title highlight="David Lisnard">Toutes les interventions de David Lisnard</Title>`
- `Footer` : mention d'indépendance. Sur le web, elle est dans le pied de page
  global (`AppNavigation.web.tsx`). Sur mobile, elle s'ajoute en bas des écrans
  de contenu.
- `Screen` : conteneur de page (zone sûre, défilement, largeur maximale `max-w-3xl`).
- `PageHead` : `<title>` et balises Open Graph d'un écran web.

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
