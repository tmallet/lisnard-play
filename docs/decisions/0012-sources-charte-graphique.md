---
id: "0012"
title: Sources de la charte graphique — référence numérique, typographie et éléments exclus
status: accepted
date: 2026-10-13
tags: [charte, produit, juridique]
supersedes: null
superseded-by: null
related-specs: [app-shell]
related-changes: []
---

# 0012 — Sources de la charte graphique : référence numérique, typographie et éléments exclus

## Contexte

L'ADR 0001 a fixé une charte réduite (cinq couleurs, Montserrat) à partir de la
page d'attente https://www.lisnard2027.fr. Le kit militant de Nouvelle Énergie
(https://www.unenouvelleenergie.fr/kit-militant/) a depuis été examiné. Ce
qu'il montre :

- **Conditions affichées** : les éléments du kit sont réservés à la promotion
  de Nouvelle Énergie, et les logos ne doivent pas servir à porter d'autres
  idées.
- **Archive « Charte graphique » (2025-08, `charte-graphique-2025.zip`)** : aucun
  document de règles. Elle contient :
  - deux polices : **Tubqal Pro** (Typerepublic, licence commerciale, EULA
    https://typerepublic.com/about/eula) et **Tango Sans** (© 2020 Sandylukee,
    aucune licence fournie) ;
  - des **textures hexagonales** (« kick », « bold », « fine », « finger ») en
    bleu, kaki et blanc, plus un fond bleu uni ;
  - un bleu imprimé plus cyan (environ `#00407a`) que celui des sites, et un
    kaki (environ `#afb190`) proche du chamois.
- **Sites officiels** (unenouvelleenergie.fr et lisnard2027.fr, 2026) : ils
  utilisent **Montserrat** et une palette nommée `--ne-*` :

  | Token du site | Valeur | Dans l'app (ADR 0001) |
  |---------------|--------|-----------------------|
  | `ne-blue` / `ne-blue-dark` | `#1d257a` / `#0f1752` | `bleu` / `bleu-sombre` |
  | `ne-chamois` | `#b0ad85` | `chamois` |
  | `ne-chamois-dark` / `ne-chamois-light` | `#98955f` / `#dedbbd` | — |
  | `ne-emerald` | `#52c985` | `emeraude` |
  | `ne-emerald-ink` / `ne-emerald-tint` | `#177344` / `#dff7e9` | — |
  | `ne-off-white` | `#f9f9f9` | `blanc` |
  | `ne-indigo` / `-dark` / `-light` | `#4a36a3` / `#35278f` / `#5b3db0` | — |
  | `ne-pink` | `#f62a72` | — |
  | `ne-gainsboro` | `#dcdfdf` | — |
  | texte sur fond clair | `#171b3e`, secondaire `#4a5464` | — |

## Décision

- **Référence couleur** : les tokens `--ne-*` des sites officiels, c'est-à-dire
  la déclinaison numérique de la charte. Les cinq couleurs de l'ADR 0001 en
  sont un sous-ensemble exact : **aucun changement**. Le bleu imprimé du kit
  n'est pas repris.
- **Palette étendue** : documentée ci-dessus, mais **non adoptée pour l'instant**.
  L'ajout d'un token se fait à partir de ce tableau, en gardant la valeur
  officielle et un nom en français, et nécessite une décision explicite.
- **Typographie** : **Montserrat**, la police web des deux sites officiels.
  Tubqal Pro et Tango Sans **ne sont pas utilisées** : la première exige une
  licence commerciale qui ne couvre pas l'intégration dans l'app, et la
  licence de la seconde est inconnue.
- **Exclus** : les textures hexagonales, le fond du kit et tout autre fichier
  des archives du kit. Ces fichiers ne sont **jamais ajoutés au dépôt**. Les
  conditions d'usage du kit les réservent à la promotion de Nouvelle Énergie,
  ce qui confirme les interdits de l'ADR 0001 (logo, hexagone signature,
  visuels officiels).
- **Fond sombre conservé** : le site du parti est sur fond clair, la page de
  campagne sur fond bleu sombre. L'app garde le fond bleu sombre (ADR 0001).
  Passer au fond clair sera une décision à part.

## Alternatives écartées

- **Adopter Tubqal Pro** : licence commerciale requise, et engagement de
  conformité disproportionné pour une app indépendante.
- **Reprendre le bleu du kit (`#00407a`)** : il diverge des sites officiels
  actuels, qui sont la référence numérique.
- **Utiliser les textures hexagonales** : réservées à la promotion du parti,
  et trop identifiantes pour une app indépendante.

## Conséquences

- Le skill `charte-ui` renvoie à cet ADR pour la palette étendue et les
  éléments exclus.
- L'app n'utilise aucun fichier téléchargé depuis le kit.
