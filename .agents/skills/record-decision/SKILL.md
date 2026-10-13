---
name: record-decision
description: Créer, remplacer ou déprécier un ADR (décision d'architecture) dans docs/decisions/. À utiliser dès qu'une décision durable est prise (choix de techno, de structure, de règle produit, de seuil, de convention), quand un design.md OpenSpec contient une décision, ou quand une décision existante est remise en cause.
---

# Consigner une décision (ADR)

Les ADR vivent dans `docs/decisions/` et sont la source durable du « pourquoi »
(voir ADR 0008). Ils sont rédigés en français.

## Quand créer un ADR

Créer un ADR si la décision :
- engage l'architecture, la stack, le modèle de données ou un contrat entre modules ;
- fixe une règle produit (périmètre, publication, notifications) ;
- choisit un fournisseur, un modèle ou une valeur structurante (ex. modèle épinglé) ;
- serait coûteuse à inverser, ou serait remise en question par un nouvel arrivant.

Pas d'ADR pour un détail d'implémentation local, réversible et évident à la
lecture du code.

## Avant d'écrire

1. Lire `docs/decisions/README.md` et rechercher les ADR existants sur le sujet :
   `grep -l "tags:.*<tag>" docs/decisions/*.md`.
2. Si un ADR `accepted` couvre déjà le sujet :
   - simple précision ou correction mineure : modifier l'ADR existant ;
   - changement de fond : créer un **nouvel** ADR qui le remplace (voir plus bas).

## Créer un ADR

1. Prendre le prochain numéro libre (le plus grand `id` + 1, sur 4 chiffres).
2. Copier `docs/decisions/_template.md` vers `docs/decisions/NNNN-slug-en-kebab.md`.
3. Remplir le frontmatter :
   - `id` entre guillemets (`"0009"`), `date` au format AAAA-MM-JJ ;
   - `status` : `accepted` si la décision est prise, `proposed` si elle attend validation ;
   - `tags` : réutiliser les tags existants de l'index avant d'en inventer ;
   - `related-specs` / `related-changes` : noms des capabilities et changes OpenSpec concernés.
4. Remplir les sections :
   - **Contexte** : les faits et contraintes, avec les sources (URL) ;
   - **Décision** : des énoncés affirmatifs et vérifiables (valeurs, noms, chemins) ;
   - **Alternatives écartées** : chaque option, avec la raison du rejet ;
   - **Conséquences** : ce que la décision impose au code et à la doc ;
   - **Points ouverts** : à supprimer si vide.
5. Ajouter une ligne dans le tableau de `docs/decisions/README.md` (ordre numérique).
6. Si la décision vient d'un `design.md` OpenSpec, y remplacer le détail par un
   renvoi : « Voir ADR NNNN ».
7. Si elle change le contexte global, mettre à jour `openspec/config.yaml`
   (`context`) et `AGENTS.md`.

## Remplacer un ADR

1. Créer le nouvel ADR avec `supersedes: "ancien-id"`.
2. Dans l'ancien : `status: superseded`, `superseded-by: "nouvel-id"`. Ne pas
   modifier le reste du contenu.
3. Mettre à jour le statut des deux lignes dans l'index.
4. Rechercher les renvois à l'ancien ADR (`grep -rn "ADR ancien-id"`) et les
   mettre à jour s'ils décrivent l'état actuel.

## Déprécier un ADR

Décision devenue sans objet, sans remplaçant : `status: deprecated`, ajouter
une phrase datée en tête de « Conséquences » pour expliquer pourquoi, puis
mettre à jour l'index.

## Vérification

- Le frontmatter est du YAML valide et contient toutes les clés du modèle.
- L'index contient exactement une ligne par fichier `NNNN-*.md`.
- Les liens `supersedes` / `superseded-by` sont réciproques.
