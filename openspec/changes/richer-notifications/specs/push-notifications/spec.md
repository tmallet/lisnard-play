## MODIFIED Requirements

### Requirement: Envoi des événements
Le système DOIT envoyer, à chaque abonnement qui l'a choisi :
- **début d'un direct** : quand une intervention publiée et dotée d'un rendu
  passe en direct ;
- **rappel** : quand une intervention publiée est programmée dans les 15 minutes ;
- **nouvelle intervention** : quand une intervention qui n'est ni un direct ni
  programmée devient visible. Une vidéo DOIT attendre son résumé (ou son absence
  constatée) pour être notifiée, au plus tard 10 minutes après sa découverte ; un
  article de presse n'attend pas.

Chaque notification DOIT ouvrir la page de détail de l'intervention quand
l'utilisateur la touche. Son titre DOIT être court, commencer par un emoji propre au
type d'événement et dire ce qui se passe sans le titre de l'intervention :
« 🔴 David Lisnard est en direct », « ⏰ Dans 15 min : David Lisnard en direct »,
« 🎥 Nouvelle vidéo de David Lisnard » pour sa chaîne, « 📰 David Lisnard sur
<média> » (ou « dans <média> » pour la presse écrite) sinon. Son texte DOIT donner
le titre de l'intervention, en casse normale si l'original est entièrement en
majuscules, puis selon le cas le média, l'heure de début d'un direct programmé, la
durée d'une vidéo et la première phrase de son résumé. Quand une miniature existe,
elle DOIT être jointe comme image de la notification. Chaque événement DOIT être
envoyé au plus une fois par intervention. Un événement antérieur à sa détection de
plus de 2 heures (rattrapage de l'historique, reprise après une panne) NE DOIT PAS
être notifié.

#### Scenario: Direct lancé
- **WHEN** un direct de la chaîne officielle est détecté, publié et doté de son lecteur
- **THEN** les abonnés aux débuts de direct reçoivent en moins de 30 secondes la notification « 🔴 David Lisnard est en direct », dont le texte donne le titre du direct, et qui ouvre la page du direct

#### Scenario: Nouvelle vidéo avec son résumé
- **WHEN** une vidéo intitulée « GARAGES À VÉLO OBLIGATOIRES » est publiée sur sa chaîne et résumée trois minutes plus tard
- **THEN** la notification « 🎥 Nouvelle vidéo de David Lisnard » part après le résumé, avec le texte « Garages à vélo obligatoires », sa durée et la première phrase du résumé

#### Scenario: Résumé trop long à venir
- **WHEN** le résumé d'une nouvelle vidéo n'est pas prêt dix minutes après sa découverte
- **THEN** la notification part sans résumé

#### Scenario: Pas de doublon
- **WHEN** un direct déjà notifié est revérifié ou de nouveau notifié par YouTube
- **THEN** aucune nouvelle notification n'est envoyée

#### Scenario: Rattrapage de l'historique
- **WHEN** le worker publie des interventions anciennes lors d'un rattrapage
- **THEN** aucune notification « nouvelle intervention » n'est envoyée pour elles
