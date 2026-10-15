# push-notifications Specification

## Purpose
TBD - created by archiving change push-notifications. Update Purpose after archive.
## Requirements
### Requirement: Abonnement d'un appareil
L'application DOIT permettre d'activer les notifications d'un appareil depuis un
écran dédié, à l'adresse `/notifications` sur le web, accessible depuis l'en-tête
(cloche) sur le web, depuis l'accueil sur mobile quand l'appareil peut en recevoir,
et depuis « À propos ». Quand aucun direct n'est en cours, l'accueil DOIT inviter à
s'abonner, sauf si l'appareil est déjà abonné ou ne peut pas recevoir de
notifications. L'autorisation du système NE DOIT être demandée qu'après une
action explicite de l'utilisateur. L'abonnement DOIT porter trois préférences :
début d'un direct (activée par défaut), rappel avant un direct programmé
(activée par défaut) et nouvelle intervention (désactivée par défaut). Aucun
compte ni donnée d'identité NE DOIT être demandé. Quand l'appareil ne permet pas
les notifications (navigateur sans Web Push, iPhone hors écran d'accueil,
application mobile sans configuration de push), l'écran DOIT l'expliquer au lieu
de proposer l'activation.

#### Scenario: Activation sur le web
- **WHEN** un visiteur d'un navigateur compatible appuie sur « Activer les notifications » et accepte l'autorisation
- **THEN** l'abonnement est enregistré avec les préférences par défaut et l'écran affiche les trois interrupteurs

#### Scenario: Invitation sur l'accueil
- **WHEN** un visiteur d'un navigateur compatible, non abonné, ouvre l'accueil sans direct en cours
- **THEN** l'accueil affiche « Aucun direct en ce moment » avec un lien « Être prévenu du prochain » vers l'écran des notifications, et ne l'affiche plus une fois l'appareil abonné

#### Scenario: Autorisation refusée
- **WHEN** l'utilisateur refuse l'autorisation du système
- **THEN** rien n'est enregistré et l'écran explique comment l'autoriser dans les réglages

#### Scenario: iPhone dans Safari
- **WHEN** un visiteur ouvre l'écran dans Safari sur iPhone sans avoir ajouté le site à l'écran d'accueil
- **THEN** l'écran explique qu'il faut d'abord ajouter le site à l'écran d'accueil

### Requirement: Préférences et désabonnement
L'utilisateur DOIT pouvoir modifier chaque préférence et se désabonner depuis
l'écran des notifications. Le désabonnement DOIT supprimer l'abonnement côté
serveur. Seul l'appareil qui détient l'abonnement DOIT pouvoir le modifier ou le
supprimer.

#### Scenario: Désactiver les rappels
- **WHEN** l'utilisateur désactive « Rappel avant un direct »
- **THEN** il ne reçoit plus de rappel, mais toujours les débuts de direct

#### Scenario: Désabonnement
- **WHEN** l'utilisateur appuie sur « Désactiver les notifications »
- **THEN** l'abonnement est supprimé du serveur et l'appareil n'en reçoit plus aucune

### Requirement: Adresses d'envoi contrôlées
Le système NE DOIT accepter que des abonnements Web Push dont l'adresse est en
HTTPS et appartient à un service push connu (Google, Mozilla, Apple, Microsoft),
et des jetons Expo Push au format attendu. Toute autre adresse DOIT être refusée
à l'enregistrement. Le nombre de nouveaux abonnements DOIT être limité par adresse
IP ; la confirmation d'un abonnement existant NE DOIT jamais être bloquée par cette
limite ni par le plafond global.

#### Scenario: Remplissage abusif
- **WHEN** une même adresse IP enregistre plus de 10 nouveaux abonnements en une heure
- **THEN** les suivants sont refusés, tandis que les appareils déjà abonnés continuent de se confirmer

#### Scenario: Adresse arbitraire
- **WHEN** une requête d'abonnement porte une adresse `https://exemple.com/push`
- **THEN** elle est refusée comme entrée invalide et rien n'est enregistré

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

### Requirement: Expiration des abonnements
Un abonnement que le service push déclare expiré ou invalide DOIT être supprimé.
Un abonnement que l'appareil n'a pas confirmé depuis 13 mois DOIT être supprimé.

#### Scenario: Navigateur désinstallé
- **WHEN** le service Web Push répond que l'abonnement n'existe plus
- **THEN** l'abonnement est supprimé et n'est plus sollicité

