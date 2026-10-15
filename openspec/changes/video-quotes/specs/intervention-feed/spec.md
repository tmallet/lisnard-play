## MODIFIED Requirements

### Requirement: Accueil
L'écran d'accueil DOIT afficher les interventions en trois sections, dans cet
ordre : « En direct », « À venir », « Passées ». Une section vide NE DOIT pas
être affichée, sauf « Passées » qui affiche un message lorsqu'il n'y a encore
aucune intervention. La section « Passées » DOIT charger automatiquement les
éléments suivants quand l'utilisateur approche de la fin de la liste, sans
bouton à actionner, et signaler le chargement en cours. Un filtre DOIT permettre d'afficher tout, ou seulement les
interventions d'un thème : « Tout » puis les sept thèmes, dans l'ordre de la spec
`intervention-themes`. Le filtre DOIT rester utilisable sur un écran de
téléphone : sur une seule ligne qui défile horizontalement, ou sur plusieurs
lignes. La section « En direct » DOIT se signaler visuellement par la couleur
émeraude de la charte. Au-dessus du filtre, un champ de recherche DOIT permettre de
chercher dans les citations, titres et résumés (spec `intervention-quotes`) ; il
DOIT tenir sur une ligne, pour ne pas repousser les interventions sous la ligne de
flottaison d'un téléphone.

#### Scenario: Direct en cours sur l'accueil
- **WHEN** une intervention est en cours de diffusion
- **THEN** l'accueil affiche une section « En direct » en premier, signalée en émeraude

#### Scenario: Aucune intervention
- **WHEN** aucune intervention n'est encore publiée
- **THEN** l'accueil affiche un message indiquant que les interventions apparaîtront ici, sans section vide « En direct » ni « À venir »

#### Scenario: Chargement continu
- **WHEN** l'utilisateur fait défiler l'accueil jusqu'à la fin des interventions passées déjà chargées, et qu'il en reste d'autres
- **THEN** la page suivante est chargée et ajoutée à la liste sans action supplémentaire

#### Scenario: Page suivante en échec
- **WHEN** le chargement de la page suivante des interventions passées échoue
- **THEN** les interventions déjà affichées restent visibles et un bouton permet de réessayer

#### Scenario: Filtrer par thème sur l'accueil
- **WHEN** l'utilisateur choisit le filtre « Sécurité »
- **THEN** les trois sections n'affichent que les interventions portant le thème `security`, et le filtre choisi est signalé comme actif

#### Scenario: Thème sans intervention
- **WHEN** l'utilisateur choisit un thème qui ne compte aucune intervention
- **THEN** la section « Passées » affiche un message indiquant qu'aucune intervention ne correspond à ce thème

#### Scenario: Recherche depuis l'accueil
- **WHEN** l'utilisateur saisit « Bercy » dans le champ de recherche de l'accueil et valide
- **THEN** les résultats de la recherche s'affichent, citations d'abord
