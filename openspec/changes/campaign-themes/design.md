## Context

Motivation : voir `proposal.md`. Les décisions produit (périmètre, thèmes,
attribution multi-thème) sont dans l'ADR 0020, qui remplace l'ADR 0006.

État actuel, issu du change `intervention-ingestion` :
- le classifieur pose trois questions dans un seul appel System One :
  `intervient` (Noul), `role` et `kind` (Choice) ;
- `decide()` est une fonction pure ; `recompute` réapplique la règle aux
  réponses journalisées ;
- `item` porte `role` et `kind`, dénormalisés depuis la dernière décision ;
- l'API filtre par `role`, et l'app affiche un `RoleFilter` à trois options.

## Goals / Non-Goals

**Goals :**
- Attribuer zéro, un ou plusieurs thèmes à chaque contenu, de façon
  recalculable sans appel au modèle.
- Filtrer la liste par thème, côté API et côté app, avec une requête indexée.
- Écarter les contenus AMF, y compris ceux déjà publiés, sans attendre le
  reclassement.

**Non-Goals :**
- Calibrer finement `τ_theme` avec un grand jeu étiqueté : un échantillon
  validé suffit pour le premier seuil.
- Combiner plusieurs filtres (voir « Hors périmètre » de la proposition).

## Decisions

### D1 — Une question Noul par thème, dans le même appel

Les sept questions `theme_<id>` s'ajoutent aux trois existantes dans la même
requête System One. Le nombre d'appels réseau ne change pas ; seuls le coût et
la latence augmentent légèrement. La question du rôle est réécrite : `national`
reste le choix par défaut, et `amf` sert désormais à écarter. Le texte des
questions de thème reprend les définitions de la spec `intervention-themes`.
Comme le texte change, `QUESTIONS_VERSION` passe à 3. Justification et
alternatives (Choice unique, thèmes libres) : ADR 0020.

### D2 — Liste des thèmes partagée dans `@lisnard/db`

`THEMES` (identifiants) et le type `Theme` sont définis dans
`packages/db/src/schema.ts`, à côté des autres énumérations. Le worker (questions,
décision), l'API (validation zod) et les tests les importent de là. L'app ne
dépend pas de `@lisnard/db` : elle récupère le type `Theme` par inférence depuis
`AppRouter`. Les libellés y vivent dans `lib/format.ts`, sous la forme d'un
`Record<Theme, string>` que le typage oblige à garder complet.

*Alternative écartée* : une constante dans le worker, recopiée dans l'API, avec
un risque de divergence.

### D3 — Colonne `themes text[]` avec index GIN

Migration additive : `item.themes text[] NOT NULL DEFAULT '{}'` et un index GIN.
Le filtre s'écrit `themes @> ARRAY[$theme]`. Un `text[]` plutôt qu'un tableau
d'enum Postgres : ajouter ou retirer un thème ne demande pas de migration de
type, et les valeurs sont validées à l'écriture par le worker (D2) et à la
lecture par zod.

*Alternative écartée* : une table de jointure `item_theme`. Elle serait plus
normalisée, mais apporte une jointure de plus pour un attribut lu avec chaque
élément.

### D4 — `τ_theme` dans les seuils par modèle

`AppliedThresholds` gagne `theme: number`, journalisé avec chaque décision
(ADR 0018). `decide()` renvoie `themes`, la liste des thèmes dont la
probabilité est ≥ `τ_theme`, que le contenu soit publié ou écarté. Les thèmes
n'influencent pas la publication. Un journal antérieur, sans réponses de thème,
donne `themes = []`.

Valeur initiale : 0,5. Elle est vérifiée sur un échantillon d'environ 30
contenus publiés, présenté au porteur du projet sous forme de tableau
(contenu, thèmes attribués, à corriger), comme pour la calibration de
`intervient`. Les réponses validées sont ajoutées au jeu de référence (champ
`themes`), et `calibrate` en tire la précision et le rappel par thème.

### D5 — Bascule de l'AMF : `recompute` d'abord, reclassement ensuite

`PUBLISHABLE_ROLES = ['national']`. Au déploiement :
1. la migration ajoute `themes` ;
2. `recompute` réapplique la nouvelle règle aux réponses v2 : les contenus
   `amf` sont écartés immédiatement, et les thèmes restent vides ;
3. comme `QUESTIONS_VERSION` est passé à 3, l'empreinte d'entrée de chaque
   contenu change, et la tâche `classify` (50 contenus par cycle de 30 s)
   reclasse tout en quelques minutes. Les thèmes apparaissent au fil du
   reclassement.

L'étape 2 est une commande manuelle, documentée dans `deploiement.md`.

*Alternative écartée* : détecter au démarrage du worker que la règle a changé
et lancer `recompute` automatiquement. Il faudrait versionner la règle de
décision, pour une bascule qui n'arrive qu'une fois.

### D6 — API et contrat

- `interventions.list` : l'entrée `role` est remplacée par `theme:
  z.enum(THEMES).optional()`.
- `interventions.list` et `byId` : chaque élément expose `themes: Theme[]` à la
  place de `role`.
- `role` reste en base, pour le journal et le débogage, mais n'est plus exposé :
  tout contenu publié est `national`.
- L'app est livrée en même temps : le changement cassant est sans effet pour
  les utilisateurs.

### D7 — Interface

- **`ThemeFilter`** remplace `RoleFilter` : des pastilles « Tout » puis les sept
  thèmes. Sur mobile, elles sont dans un `ScrollView` horizontal ; sur le web,
  elles passent à la ligne. L'état actif se lit à la fois par la couleur et par
  `aria-selected` / `accessibilityState` (skill `charte-ui`).
- **Liste vide** pour un thème : message dédié (spec `intervention-feed`).
- **Carte** : la ligne de métadonnées devient « Média · Type · Thème 1, Thème 2 »,
  avec deux thèmes au plus puis « +N ».
- **Détail** : les libellés de tous les thèmes sur la ligne de métadonnées.

## Risks / Trade-offs

- **[Sur-attribution de « Vie de campagne »]** : beaucoup de contenus parlent de
  la campagne. → Définition restrictive dans la question (meetings,
  déplacements, soutiens, organisation), vérifiée sur l'échantillon (D4).
- **[Probabilités Noul mal calibrées entre thèmes]** : un même seuil peut ne pas
  convenir à tous les thèmes. → On commence avec un seuil unique ; on passera à
  un seuil par thème si l'échantillon le justifie (sans changer la spec, qui
  parle du « seuil du modèle »).
- **[Titres peu explicites]** : « Invité de la matinale » ne dit rien du sujet.
  → Aucun thème est un résultat accepté : le contenu reste visible sous « Tout ».
- **[Ordre de merge]** : les deltas modifient des specs créées par
  `intervention-ingestion`, encore actif. → Archiver `intervention-ingestion`
  avant d'archiver ce change.

## Migration Plan

1. Merger les PR #5 et #6, puis archiver `intervention-ingestion`.
2. Déployer ce change : la migration s'applique au démarrage du worker.
3. Lancer `bun cli.js recompute` dans le conteneur du worker : l'AMF est
   écartée.
4. Laisser le reclassement v3 se terminer, puis valider l'échantillon de thèmes
   (D4) et ajuster `τ_theme` si besoin avec `recompute`.

**Retour arrière** : revenir au commit précédent. La colonne `themes`, additive,
peut rester. Un `recompute` avec l'ancienne règle republie les contenus AMF.
