# intervention-feed Specification

## Purpose
Permettre de consulter les interventions publiées de David Lisnard, sur le web et
le mobile, classées en direct, à venir et passées, avec un écran de détail qui
donne accès au média.
## Requirements
### Requirement: Seules les interventions publiées sont exposées
L'API et l'interface NE DOIVENT exposer que les contenus dont la décision la plus
récente est « publié ». Les contenus écartés, en attente ou les données internes
(probabilités, seuils, journal) NE DOIVENT jamais être renvoyés par l'API
publique.

#### Scenario: Contenu écarté
- **WHEN** un client demande la liste des interventions
- **THEN** aucun contenu écarté ou en attente n'y figure, et aucune probabilité du classifieur n'est renvoyée

### Requirement: Statut temporel
Chaque intervention exposée DOIT porter un statut temporel calculé au moment de
la requête :
- `live` : statut de diffusion « en cours » ;
- `upcoming` : direct programmé dont l'heure de début est dans le futur ;
- `past` : tous les autres cas.

#### Scenario: Direct en cours
- **WHEN** une intervention YouTube est en cours de diffusion
- **THEN** elle est exposée avec le statut `live`

### Requirement: Liste des interventions
L'API DOIT fournir une procédure publique de liste, filtrable par statut temporel
(`live`, `upcoming`, `past`) et par thème (spec `intervention-themes`). Elle DOIT
être paginée avec un curseur et ne pas renvoyer plus de 50 éléments par page. Les
interventions `past` sont triées de la plus récente à la plus ancienne, les
`upcoming` de la plus proche à la plus lointaine. Chaque élément DOIT contenir :
l'identifiant, le titre, le nom du média, le type, les thèmes (liste
éventuellement vide), le statut temporel, la date (début de diffusion, sinon
publication) et une image quand elle existe.

#### Scenario: Filtre par thème
- **WHEN** un client demande les interventions passées du thème `economy`
- **THEN** seules les interventions publiées portant le thème `economy` et de statut `past` sont renvoyées, de la plus récente à la plus ancienne

#### Scenario: Filtre par rôle
- **WHEN** un client transmet encore un paramètre `role` (ancien filtre `national` / `amf`)
- **THEN** le paramètre est ignoré et la liste renvoie les interventions publiées du statut demandé : le filtre par rôle n'existe plus, seul le rôle `national` étant publiable (ADR 0020)

#### Scenario: Taille de page invalide
- **WHEN** un client demande une page de 500 éléments
- **THEN** l'API rejette la requête par une erreur de requête invalide

### Requirement: Détail d'une intervention
L'API DOIT fournir une procédure publique de détail par identifiant, qui renvoie
les champs de la liste ainsi que la description, l'URL de la source, le rendu
média (`embed` avec l'adresse du lecteur, ou `link` avec les données de la carte
et, pour un lien d'agrégateur, l'URL de l'éditeur) et le résumé (texte et points
clés) quand il existe et peut être affiché, sinon `null` (spec
`intervention-summaries`). Un identifiant inconnu ou non publié DOIT renvoyer
une erreur « introuvable ».

#### Scenario: Identifiant inconnu
- **WHEN** un client demande le détail d'un identifiant qui n'existe pas ou n'est pas publié
- **THEN** l'API renvoie une erreur « introuvable »

#### Scenario: Détail avec résumé
- **WHEN** un client demande le détail d'une vidéo résumée
- **THEN** la réponse contient le texte du résumé et ses points clés, sans le modèle ni la consigne utilisés

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
émeraude de la charte.

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

### Requirement: Écran de détail
Un écran de détail DOIT afficher le titre, le média, la date, le type, les thèmes
et la description d'une intervention, ainsi que son résumé sous le lecteur quand il
existe (spec `intervention-summaries`). Pour un rendu `embed`, il affiche le
lecteur intégré et un lien vers la source. Pour un rendu `link`, il affiche une
carte qui ouvre la source dans le navigateur, chez l'éditeur quand l'URL de
celui-ci est connue : la carte tient lieu de lien vers la source. Il DOIT
toujours proposer un lien vers la source d'origine, une seule fois. Un texte
qui ne fait que répéter le titre, éventuellement suivi du nom du média
(description, titre ou description Open Graph de la carte), NE DOIT PAS être
affiché. L'écran DOIT être accessible par une URL web partageable
(`/interventions/<identifiant>`).

#### Scenario: Ouvrir une intervention vidéo
- **WHEN** l'utilisateur ouvre une intervention dont le rendu est `embed`
- **THEN** le lecteur intégré s'affiche, ainsi qu'un lien vers la source d'origine

#### Scenario: Article dont la description répète le titre
- **WHEN** l'utilisateur ouvre un article dont la description et le titre Open Graph reprennent le titre suivi du nom du média
- **THEN** le titre n'apparaît qu'une fois, la description n'est pas affichée, et la carte n'affiche que le média et le lien vers la source

#### Scenario: Article relayé par un agrégateur
- **WHEN** l'utilisateur ouvre un article Google News dont l'URL de l'éditeur est connue
- **THEN** la carte affiche l'image et l'accroche de l'éditeur, et son lien ouvre l'article chez l'éditeur

#### Scenario: Thèmes affichés
- **WHEN** l'utilisateur ouvre une intervention portant les thèmes `economy` et `institutions`
- **THEN** l'écran affiche les libellés « Économie » et « Institutions »

#### Scenario: URL partagée
- **WHEN** un visiteur ouvre directement `/interventions/<identifiant>` dans un navigateur
- **THEN** l'écran de détail de cette intervention s'affiche

### Requirement: Fraîcheur
L'accueil DOIT rafraîchir la liste « En direct » et « À venir » au plus toutes
les 60 secondes tant qu'il est affiché, sans action de l'utilisateur.

#### Scenario: Un direct commence pendant la consultation
- **WHEN** un direct démarre alors que l'utilisateur est sur l'accueil
- **THEN** il apparaît dans la section « En direct » en moins de 60 secondes après sa détection par le worker

