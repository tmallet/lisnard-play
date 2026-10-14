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
chaque collecte jusqu'à ce qu'il soit `ended`. De 15 minutes avant son heure de
début prévue jusqu'à son démarrage effectif, un direct programmé DOIT être
revérifié au moins toutes les 30 secondes. Une vidéo `upcoming` ou `live` que la
plateforme ne renvoie plus (supprimée, privée, annulée) DOIT être close : un
direct passe à `ended`, un direct programmé redevient `none`.

#### Scenario: Passage en direct
- **WHEN** un direct programmé démarre
- **THEN** son statut passe de `upcoming` à `live` en moins de 30 secondes s'il était attendu dans le quart d'heure, au plus tard à la collecte suivante sinon

#### Scenario: Fin de direct
- **WHEN** un direct en cours se termine
- **THEN** son statut passe à `ended` et son heure de fin est enregistrée

#### Scenario: Vidéo disparue
- **WHEN** un direct en cours est supprimé ou passé en privé
- **THEN** son statut passe à `ended` lors de la revérification suivante, au lieu de rester « en direct »

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

### Requirement: Notifications push des chaînes
Quand l'adresse de rappel et le secret sont configurés, le système DOIT
s'abonner aux notifications push (WebSub) de chaque chaîne YouTube active et
renouveler ces abonnements avant leur expiration. À la réception d'une
notification pour une chaîne suivie, il DOIT enregistrer ou mettre à jour la
vidéo concernée, puis la classer et préparer son rendu sans attendre le cycle
de collecte suivant. Une notification dont la signature ne correspond pas au
secret, ou qui concerne une chaîne non suivie, NE DOIT avoir aucun effet. Sans
configuration, la collecte périodique DOIT continuer de fonctionner seule.

#### Scenario: Direct lancé à l'improviste
- **WHEN** la chaîne officielle lance un direct et que le hub envoie la notification
- **THEN** la vidéo est enregistrée avec le statut `live`, classée et dotée de son lecteur en moins de 30 secondes après la réception

#### Scenario: Notification falsifiée
- **WHEN** une requête arrive sur l'adresse de rappel avec une signature invalide
- **THEN** elle est refusée et aucune vidéo n'est enregistrée ni demandée à l'API YouTube

#### Scenario: Vérification de l'abonnement
- **WHEN** le hub vérifie un abonnement pour une chaîne suivie
- **THEN** le système renvoie le défi reçu, et refuse la vérification pour une chaîne non suivie

