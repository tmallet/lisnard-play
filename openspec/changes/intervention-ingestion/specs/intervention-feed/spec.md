## Purpose

Permettre de consulter les interventions publiées de David Lisnard, sur le web et
le mobile, classées en direct, à venir et passées, avec un écran de détail qui
donne accès au média.

## ADDED Requirements

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
(`live`, `upcoming`, `past`) et par rôle (`national`, `amf`). Elle DOIT être
paginée avec un curseur et ne pas renvoyer plus de 50 éléments par page. Les
interventions `past` sont triées de la plus récente à la plus ancienne, les
`upcoming` de la plus proche à la plus lointaine. Chaque élément DOIT contenir :
l'identifiant, le titre, le nom du média, le type, le rôle, le statut temporel,
la date (début de diffusion, sinon publication) et une image quand elle existe.

#### Scenario: Filtre par rôle
- **WHEN** un client demande les interventions passées de rôle `amf`
- **THEN** seules les interventions publiées de rôle `amf` et de statut `past` sont renvoyées, de la plus récente à la plus ancienne

#### Scenario: Taille de page invalide
- **WHEN** un client demande une page de 500 éléments
- **THEN** l'API rejette la requête par une erreur de requête invalide

### Requirement: Détail d'une intervention
L'API DOIT fournir une procédure publique de détail par identifiant, qui renvoie
les champs de la liste ainsi que la description, l'URL de la source et le rendu
média (`embed` avec l'adresse du lecteur, ou `link` avec les données de la
carte). Un identifiant inconnu ou non publié DOIT renvoyer une erreur
« introuvable ».

#### Scenario: Identifiant inconnu
- **WHEN** un client demande le détail d'un identifiant qui n'existe pas ou n'est pas publié
- **THEN** l'API renvoie une erreur « introuvable »

### Requirement: Accueil
L'écran d'accueil DOIT afficher les interventions en trois sections, dans cet
ordre : « En direct », « À venir », « Passées ». Une section vide NE DOIT pas
être affichée, sauf « Passées » qui affiche un message lorsqu'il n'y a encore
aucune intervention. La section « Passées » DOIT permettre de charger les
éléments suivants. Un filtre DOIT permettre d'afficher tout, seulement le rôle
`national`, ou seulement le rôle `amf`. La section « En direct » DOIT se
signaler visuellement par la couleur émeraude de la charte.

#### Scenario: Direct en cours sur l'accueil
- **WHEN** une intervention est en cours de diffusion
- **THEN** l'accueil affiche une section « En direct » en premier, signalée en émeraude

#### Scenario: Aucune intervention
- **WHEN** aucune intervention n'est encore publiée
- **THEN** l'accueil affiche un message indiquant que les interventions apparaîtront ici, sans section vide « En direct » ni « À venir »

### Requirement: Écran de détail
Un écran de détail DOIT afficher le titre, le média, la date, le type, le rôle et
la description d'une intervention. Pour un rendu `embed`, il affiche le lecteur
intégré. Pour un rendu `link`, il affiche une carte qui ouvre la source dans le
navigateur. Il DOIT toujours proposer un lien vers la source d'origine. L'écran
DOIT être accessible par une URL web partageable (`/interventions/<identifiant>`).

#### Scenario: Ouvrir une intervention vidéo
- **WHEN** l'utilisateur ouvre une intervention dont le rendu est `embed`
- **THEN** le lecteur intégré s'affiche, ainsi qu'un lien vers la source d'origine

#### Scenario: URL partagée
- **WHEN** un visiteur ouvre directement `/interventions/<identifiant>` dans un navigateur
- **THEN** l'écran de détail de cette intervention s'affiche

### Requirement: Fraîcheur
L'accueil DOIT rafraîchir la liste « En direct » et « À venir » au plus toutes
les 60 secondes tant qu'il est affiché, sans action de l'utilisateur.

#### Scenario: Un direct commence pendant la consultation
- **WHEN** un direct démarre alors que l'utilisateur est sur l'accueil
- **THEN** il apparaît dans la section « En direct » en moins de 60 secondes après sa détection par le worker
