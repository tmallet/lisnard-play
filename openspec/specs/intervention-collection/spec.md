# intervention-collection Specification

## Purpose
Collecter automatiquement, depuis des sources publiques configurées, les contenus
susceptibles d'être des interventions de David Lisnard, avec des métadonnées
fiables obtenues sans modèle d'IA, pour les soumettre ensuite au classifieur.
## Requirements
### Requirement: Sources configurées
Le système DOIT collecter uniquement depuis une liste de sources déclarées en
configuration. Chaque source a un identifiant stable, un type (chaîne YouTube ou
flux RSS), un nom de média affichable et un indicateur actif ou inactif. Une
source inactive NE DOIT PAS être interrogée.

#### Scenario: Source inactive
- **WHEN** une source est marquée inactive dans la configuration
- **THEN** aucune requête n'est envoyée vers cette source lors des collectes suivantes

### Requirement: Collecte périodique et résiliente
Le système DOIT interroger chaque source active à une cadence propre à son type.
Les chaînes YouTube DOIVENT être interrogées au moins toutes les 5 minutes,
pour détecter les directs. L'échec d'une source (réseau, format invalide, quota
dépassé) NE DOIT PAS empêcher la collecte des autres sources, et DOIT être
journalisé avec la source en cause. Une seule collecte DOIT s'exécuter à la
fois, même si plusieurs instances du worker tournent.

#### Scenario: Une source en panne
- **WHEN** une source renvoie une erreur pendant une collecte
- **THEN** les autres sources sont tout de même collectées et l'erreur est journalisée avec l'identifiant de la source

#### Scenario: Deux instances du worker
- **WHEN** deux instances du worker démarrent une collecte au même moment
- **THEN** une seule effectue la collecte, l'autre l'ignore jusqu'au cycle suivant

### Requirement: Pré-filtre sur le nom
Avant toute classification, le système DOIT écarter les contenus dont le titre et
la description ne mentionnent pas « Lisnard » (insensible à la casse et aux
accents). Les contenus de la chaîne YouTube de David Lisnard sont exemptés de ce
filtre.

#### Scenario: Contenu sans mention
- **WHEN** une vidéo d'une chaîne de média ne mentionne « Lisnard » ni dans son titre ni dans sa description
- **THEN** elle n'est pas enregistrée comme candidate et n'est pas soumise au classifieur

#### Scenario: Chaîne de David Lisnard
- **WHEN** une vidéo provient de la chaîne YouTube de David Lisnard
- **THEN** elle est enregistrée comme candidate, même sans mention de son nom dans le titre

### Requirement: Métadonnées déterministes
Pour chaque contenu candidat, le système DOIT enregistrer, sans recourir au
classifieur : l'URL canonique, le titre, la description, le nom du média (issu de
la source), la date de publication et, quand la plateforme les fournit, les
heures de début et de fin de diffusion.

#### Scenario: Vidéo YouTube programmée
- **WHEN** une vidéo YouTube candidate est un direct programmé
- **THEN** son heure de début prévue est enregistrée depuis les métadonnées de la plateforme

### Requirement: Statut de diffusion
Pour les contenus YouTube, le système DOIT déterminer et mettre à jour le statut
de diffusion à partir des métadonnées de la plateforme : `upcoming` (direct
programmé), `live` (en cours), `ended` (direct terminé) ou `none` (vidéo non
diffusée en direct). Un contenu `upcoming` ou `live` DOIT être revérifié à
chaque collecte jusqu'à ce qu'il soit `ended`.

#### Scenario: Passage en direct
- **WHEN** un direct programmé démarre
- **THEN** son statut passe de `upcoming` à `live` au plus tard à la collecte suivante

#### Scenario: Fin de direct
- **WHEN** un direct en cours se termine
- **THEN** son statut passe à `ended` et son heure de fin est enregistrée

### Requirement: Dédoublonnage
Un même contenu NE DOIT être enregistré qu'une fois, même s'il est trouvé
plusieurs fois ou par plusieurs sources. L'identité d'un contenu est son
identifiant sur la plateforme (identifiant de vidéo YouTube, par exemple), à
défaut son URL canonique. Une nouvelle rencontre d'un contenu connu met à jour
ses métadonnées sans créer de doublon.

#### Scenario: Vidéo vue deux fois
- **WHEN** une vidéo déjà enregistrée réapparaît dans une collecte ultérieure
- **THEN** aucun nouvel enregistrement n'est créé et ses métadonnées sont mises à jour

### Requirement: Rattrapage des chaînes officielles
Pour une chaîne YouTube officielle de David Lisnard, le système DOIT collecter
toutes ses vidéos publiées depuis le début de l'historique, et pas seulement les
plus récentes exposées par le flux. Ce rattrapage DOIT avoir lieu au démarrage du
worker, puis au moins une fois par jour, et pouvoir être relancé à la demande.
Il DOIT s'arrêter à la première vidéo antérieure au début de l'historique et ne
pas créer de doublon.

#### Scenario: Rattrapage initial
- **WHEN** le worker démarre et que la chaîne officielle compte 195 vidéos depuis le 31 mars 2026
- **THEN** les 195 vidéos sont enregistrées, et aucune vidéo antérieure au 31 mars 2026 n'est demandée au-delà de la première rencontrée

#### Scenario: Rattrapage répété
- **WHEN** le rattrapage est relancé sans nouvelle vidéo
- **THEN** aucun nouvel enregistrement n'est créé

### Requirement: Début de l'historique
Le système NE DOIT PAS enregistrer de contenu dont la date de diffusion, ou à
défaut de publication, est antérieure au 31 mars 2026 à 00:00, heure de Paris.

#### Scenario: Contenu antérieur
- **WHEN** une source expose une vidéo publiée le 30 mars 2026
- **THEN** cette vidéo n'est pas enregistrée

