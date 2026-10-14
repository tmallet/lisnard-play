## Purpose

Classer chaque intervention publiée par thématiques de campagne, pour qu'un
visiteur retrouve les prises de position de David Lisnard sur un sujet donné.

## ADDED Requirements

### Requirement: Liste des thèmes
Le système DOIT reconnaître exactement sept thèmes, chacun avec un identifiant
stable et un libellé affiché :
- `economy` : « Économie » (fiscalité, dépenses publiques, entreprises, emploi,
  pouvoir d'achat) ;
- `security` : « Sécurité » (délinquance, justice, police, ordre public) ;
- `immigration` : « Immigration » ;
- `education` : « Éducation » (école, jeunesse, enseignement supérieur) ;
- `institutions` : « Institutions » (État, réforme institutionnelle,
  décentralisation, libertés locales, vie démocratique) ;
- `international` : « International » (Europe, diplomatie, défense) ;
- `campaign` : « Vie de campagne » (meetings, déplacements, soutiens,
  organisation de la campagne, sondages commentés par lui).

#### Scenario: Libellés affichés
- **WHEN** une intervention porte le thème `economy`
- **THEN** l'interface l'affiche sous le libellé « Économie »

### Requirement: Attribution multi-thème
Pour chaque contenu classé, le système DOIT obtenir du classifieur une
probabilité par thème, à partir des mêmes métadonnées que les autres questions.
Un thème DOIT être attribué si et seulement si sa probabilité atteint le seuil
`τ_theme` du modèle utilisé. Une intervention PEUT recevoir plusieurs thèmes,
ou aucun. L'absence de thème NE DOIT PAS empêcher sa publication. Les
probabilités brutes de chaque thème DOIVENT être journalisées avec la décision.

#### Scenario: Interview sur plusieurs sujets
- **WHEN** une interview obtient une probabilité au-dessus du seuil pour `economy` et pour `security`, et en dessous pour les autres thèmes
- **THEN** l'intervention porte les thèmes `economy` et `security`

#### Scenario: Aucun thème identifiable
- **WHEN** aucune probabilité de thème n'atteint le seuil pour une intervention publiable
- **THEN** l'intervention est publiée sans thème et reste visible sans filtre

### Requirement: Recalcul des thèmes sans nouvel appel
Le recalcul à partir des réponses journalisées DOIT aussi recalculer les thèmes
avec le seuil `τ_theme` en vigueur, sans rappeler le classifieur.

#### Scenario: Changement du seuil des thèmes
- **WHEN** `τ_theme` est relevé et qu'un recalcul est lancé
- **THEN** les thèmes de chaque intervention sont recalculés avec le nouveau seuil, sans appel au classifieur

### Requirement: Filtre par thème
L'API de liste DOIT accepter un thème facultatif et ne renvoyer alors que les
interventions publiées qui portent ce thème. Un thème inconnu DOIT être rejeté
par une erreur de requête invalide.

#### Scenario: Filtre Sécurité
- **WHEN** un client demande les interventions passées du thème `security`
- **THEN** seules les interventions publiées, passées et portant le thème `security` sont renvoyées, de la plus récente à la plus ancienne

#### Scenario: Thème inconnu
- **WHEN** un client demande le thème `sport`
- **THEN** l'API rejette la requête par une erreur de requête invalide
