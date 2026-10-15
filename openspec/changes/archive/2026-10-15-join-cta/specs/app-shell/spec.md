## ADDED Requirements

### Requirement: Invitation à adhérer
L'accueil, entre les interventions en direct ou à venir et les interventions
passées, et la page d'une intervention, après son contenu, DOIVENT proposer un
encart d'invitation à adhérer à Nouvelle Énergie. L'encart DOIT :
- ouvrir le site d'adhésion du parti hors de l'application (nouvel onglet sur le
  web, navigateur sur mobile) ;
- indiquer qu'il mène au site du parti et qu'il s'agit d'un lien de parrainage de
  l'éditeur, auquel l'adhésion sera rattachée ;
- n'utiliser que la charte de l'application, sans logo ni visuel du parti, et ne
  pas masquer la mention d'indépendance.

Aucun traceur NE DOIT être ajouté au lien ni au clic.

#### Scenario: Depuis une intervention
- **WHEN** un visiteur arrive en bas de la page d'une intervention
- **THEN** il voit « Vous partagez ces idées ? » et un bouton « Adhérer à Nouvelle Énergie » qui ouvre le site d'adhésion

#### Scenario: Transparence du parrainage
- **WHEN** un visiteur lit l'encart
- **THEN** il est informé que le lien est un lien de parrainage de l'éditeur du site

## MODIFIED Requirements

### Requirement: Mentions légales et confidentialité
L'application DOIT proposer une page « Mentions légales et confidentialité »,
accessible sans interaction préalable depuis le pied de page de chaque écran et
depuis l'écran « À propos », et sur le web à l'adresse `/mentions-legales`. Elle
DOIT indiquer :
- que l'éditeur, personne physique non professionnelle, reste anonyme et que
  ses coordonnées ont été communiquées à l'hébergeur ;
- une adresse électronique de contact ;
- le nom et l'adresse de l'hébergeur ;
- les données traitées et leur finalité (journaux techniques du serveur), et
  l'absence de cookie propre au site ;
- pour les notifications : les données d'abonnement conservées (adresse ou
  jeton fourni par le service push, préférences), leur finalité, leur
  transmission aux services push du navigateur ou de la plateforme, et leur
  suppression au désabonnement ou après 13 mois sans confirmation ;
- que le bouton d'adhésion est un lien de parrainage de l'éditeur vers le site de
  Nouvelle Énergie, qui ne fait de ce site ni un site du parti ni un site officiel ;
- le dépôt de cookies par les lecteurs tiers, seulement après l'action du
  visiteur, avec un lien vers les règles de confidentialité de Google ;
- les droits des personnes et la possibilité de saisir la CNIL.

#### Scenario: Accès depuis n'importe quel écran
- **WHEN** un visiteur consulte une page quelconque du site
- **THEN** un lien « Mentions légales et confidentialité » est présent en pied de page et mène à `/mentions-legales`

#### Scenario: Contact
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y trouve l'adresse `lisnardplay@tmallet.fr` et l'identité de l'hébergeur

#### Scenario: Notifications
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y trouve les données conservées pour les notifications et leur durée de conservation

#### Scenario: Lien d'adhésion
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y apprend que le bouton d'adhésion est un lien de parrainage de l'éditeur
