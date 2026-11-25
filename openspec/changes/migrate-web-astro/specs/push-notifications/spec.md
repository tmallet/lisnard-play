## MODIFIED Requirements

### Requirement: Abonnement d'un appareil
L'application DOIT permettre d'activer les notifications d'un navigateur depuis un
écran dédié, à l'adresse `/notifications`, accessible depuis l'en-tête (cloche) et
depuis « À propos ». Quand aucun direct n'est en cours, l'accueil DOIT inviter à
s'abonner, sauf si le navigateur est déjà abonné ou ne peut pas recevoir de
notifications. L'autorisation du navigateur NE DOIT être demandée qu'après une
action explicite de l'utilisateur. L'abonnement DOIT porter trois préférences :
début d'un direct (activée par défaut), rappel avant un direct programmé
(activée par défaut) et nouvelle intervention (désactivée par défaut). Aucun
compte ni donnée d'identité NE DOIT être demandé. Quand le navigateur ne permet pas
les notifications (navigateur sans Web Push, iPhone hors écran d'accueil, JavaScript
désactivé), l'écran DOIT l'expliquer au lieu de proposer l'activation.

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

### Requirement: Adresses d'envoi contrôlées
Le système NE DOIT accepter que des abonnements Web Push dont l'adresse est en
HTTPS et appartient à un service push connu (Google, Mozilla, Apple, Microsoft).
Toute autre adresse, et tout jeton d'un autre service de notification, DOIT être
refusé à l'enregistrement. Le nombre de nouveaux abonnements DOIT être limité par
adresse IP ; la confirmation d'un abonnement existant NE DOIT jamais être bloquée par
cette limite ni par le plafond global.

#### Scenario: Remplissage abusif
- **WHEN** une même adresse IP enregistre plus de 10 nouveaux abonnements en une heure
- **THEN** les suivants sont refusés, tandis que les appareils déjà abonnés continuent de se confirmer

#### Scenario: Adresse arbitraire
- **WHEN** une requête d'abonnement porte une adresse `https://exemple.com/push`
- **THEN** elle est refusée comme entrée invalide et rien n'est enregistré

#### Scenario: Jeton Expo
- **WHEN** une requête d'abonnement porte un jeton `ExponentPushToken[...]`
- **THEN** elle est refusée comme entrée invalide et rien n'est enregistré
