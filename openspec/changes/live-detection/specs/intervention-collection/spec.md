## ADDED Requirements

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

## MODIFIED Requirements

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
