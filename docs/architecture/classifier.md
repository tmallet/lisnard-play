# Classifieur

Décide si un contenu collecté est une intervention publique de David Lisnard
dans le périmètre de l'application, la campagne présidentielle (ADR 0004, 0018,
0020), et lui attribue des thèmes. Code :
`apps/worker/src/classifier/` et `apps/worker/src/publish.ts`.

## Modèle

- **Jev** (TypeSafe), modèle « System One » appelé via OpenRouter :
  `POST https://openrouter.ai/api/v1/systemone`.
- **Instantané épinglé** : `typesafe/jev-1.13-20260917`. L'identifiant
  `typesafe/jev-1.13` suit le dernier instantané de la 1.13, ce qui pourrait
  décaler la calibration sans prévenir.
- Coût observé : environ 0,00003 $ par contenu (3 questions). Latence de 230 à
  510 ms.

## Questions (`questions.ts`, version 3)

| Clé | Type | Rôle |
|-----|------|------|
| `intervient` | Noul (probabilité 0 à 1) | Le contenu rapporte-t-il une prise de parole de David Lisnard lui-même ? Les déclarations rapportées (« déclare », « affirme »…) comptent ; les analyses, portraits, sondages ou anecdotes ne comptent pas |
| `role` | Choice | `national` (par défaut, y compris quand il parle des communes ou de la décentralisation dans son programme), `amf` (seulement s'il parle au nom des maires, en tant que président de l'AMF), `mairie` (uniquement si le sujet porte explicitement sur Cannes), `hors_sujet` |
| `kind` | Choice | `tv`, `radio`, `presse`, `podcast`, `meeting`, `discours`, `stream`, `reseau_social` |
| `theme_<id>` (×7) | Noul | David Lisnard aborde-t-il ce thème, même parmi d'autres ? Thèmes et définitions : spec `intervention-themes` (`economie`, `securite`, `immigration`, `education`, `institutions`, `international`, `campagne`) |

**État envoyé** : titre, description (2 000 caractères au plus), média, type de
source, dates. Jev ne produit pas de texte : il ne fait que décider.

## Règle de publication (`decide.ts`)

Un contenu est publié si et seulement si :
- `intervient ≥ τ_intervient`, sauf pour la chaîne officielle de David Lisnard
  (`official: true` dans `sources.config.ts`), où son intervention est présumée
  (ADR 0018) ;
- le rôle le plus probable est `national` : l'AMF et la mairie sont hors
  périmètre (ADR 0020) ;
- la confiance de ce rôle est `≥ τ_role`.

Un modèle sans seuils dans `thresholds.ts` ne publie rien.

**Thèmes** : un thème est attribué quand sa probabilité est `≥ τ_theme`. Une
intervention peut en avoir plusieurs, ou aucun : elle reste alors visible sous
« Tout ». Les thèmes n'influencent pas la publication.

## Seuils actuels

| Modèle | τ_intervient | τ_role | τ_theme |
|--------|--------------|--------|---------|
| `typesafe/jev-1.13-20260917` | 0,75 | 0,60 | 0,50 |

## Calibration du 2026-10-13

Jeu de référence : `apps/worker/eval/reference.jsonl`, 120 cas **validés par le
porteur du projet**. Il comprend 110 contenus réels collectés le 2026-10-13 et
10 cas limites synthétiques de l'ADR 0006 (Festival, conseil municipal,
communiqué de la ville, homonyme, AMF…).

| Questions | Seuils | Précision | Rappel | Rôle juste |
|-----------|--------|-----------|--------|------------|
| v1 (spike) | 0,50 / 0,60 | 100 % | 42 % | 88,9 % |
| v2 | 0,50 / 0,60 | 91,8 % | 96,6 % | 96,8 % |
| **v2 (retenu)** | **0,75 / 0,60** | **96 à 98 %** | **82,8 %** | 96,8 % |

- **v1 → v2** : en v1, les articles qui reprennent ses déclarations étaient
  traités comme de simples citations. Le rôle `mairie` était aussi choisi dès
  qu'il était présenté comme « maire de Cannes ».
- **Variabilité** : Jev n'est pas strictement déterministe. Les cas sans réponse
  journalisée pour la version courante sont reclassés à chaque passage de
  `calibrate`, et la précision varie de ±2 points d'un passage à l'autre (1 ou 2
  faux positifs sur environ 50 publications).
- **Choix des seuils** : on maximise la précision sous la contrainte d'un rappel
  d'au moins 80 % (design D5), car une fausse publication coûte plus cher qu'un
  oubli (ADR 0018).
- **Erreurs restantes à 0,75** :
  - 1 faux positif (une chronique radio qui présente sa proposition) ;
  - 10 faux négatifs, surtout des déplacements de campagne et des reprises
    courtes de déclarations, dont la probabilité `intervient` est comprise
    entre 0,40 et 0,75.

## Calibration des questions v3 (2026-10-13, ADR 0020)

Le jeu de référence compte 138 cas :
- les 120 cas d'origine ;
- 18 contenus de l'échantillon de thèmes, validés par le porteur du projet.

| Mesure | Résultat |
|--------|----------|
| Publication (0,75 / 0,60) | précision 95,5 %, rappel 86,5 % (VP 64, FP 3, FN 10) |
| Rôle juste | 97,5 % |
| Thèmes (28 cas étiquetés, τ_theme 0,50) | précision et rappel de 100 % pour chaque thème |

- **AMF** : les contenus AMF déjà publiés ont été écartés par `recompute`. Avec
  la question du rôle réécrite, la plupart des anciens contenus « AMF »
  (décentralisation, bureaucratie) sont reclassés `national`. Les trois cas
  ambigus (priorités des maires du Var, budget des collectivités, UMOP) ont été
  validés comme relevant de la campagne.
- **Thèmes** : sur 218 interventions publiées, 69 n'ont aucun thème, et le
  porteur du projet l'accepte. Les thèmes les plus fréquents sont Économie (64),
  Institutions (45), Éducation (33) et Sécurité (32).
- **Chaîne officielle** : depuis cette calibration, `calibrate` applique la même
  présomption d'intervention que la publication (ADR 0018). Les chiffres
  reflètent donc la règle réelle.
- **Proposition de `calibrate`** : 0,80 / 0,75 (précision 100 %, rappel 81,1 %).
  Elle n'est pas appliquée : le changement est à décider par le porteur du
  projet.
- **Coût du reclassement v3** : environ 0,00007 $ par contenu (10 questions).

## Procédures

| Besoin | Commande (depuis la racine) |
|--------|-----------------------------|
| Mesurer les seuils actuels et obtenir une proposition | `bun apps/worker/src/cli.ts calibrate --validated` |
| Appliquer de nouveaux seuils (dont `τ_theme`) sans rappeler le modèle | modifier `thresholds.ts`, puis `bun apps/worker/src/cli.ts recompute` |
| Reclasser après un changement de modèle | `bun apps/worker/src/cli.ts reclassify --model <ancien>` |

**Modifier les questions** : changer le texte dans `questions.ts`, incrémenter
`QUESTIONS_VERSION`, puis recalibrer. Le worker reclasse automatiquement les
contenus, puisque l'empreinte d'entrée change avec la version.

**Changer de modèle** :
1. ajouter ses seuils après une calibration ;
2. le configurer (`PINNED_MODEL`) ;
3. lancer `reclassify`.

Le journal conserve toutes les décisions, ce qui permet de comparer avant et
après. Le skill `classifier-jev` détaille ces étapes.
