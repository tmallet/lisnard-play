## ADDED Requirements

### Requirement: Mesure d'audience
Le site web DOIT mesurer son audience avec le script Umami de l'éditeur, sans
cookie ni stockage local, chargé en différé depuis le document HTML racine. Le
script NE DOIT envoyer de données que depuis le domaine de production et NE DOIT
rien envoyer si le navigateur demande à ne pas être suivi. Seules les pages vues
sont mesurées. L'application mobile NE DOIT PAS mesurer l'audience.

#### Scenario: Page servie en production
- **WHEN** un visiteur charge une page de `https://play.projetlisnard.fr/`
- **THEN** le HTML contient le script Umami avec `data-domains="play.projetlisnard.fr"` et `data-do-not-track="true"`

#### Scenario: Ne pas me suivre
- **WHEN** le navigateur du visiteur envoie le signal « Do Not Track »
- **THEN** aucune donnée de mesure d'audience n'est envoyée

## MODIFIED Requirements

### Requirement: Mentions légales et confidentialité
L'application DOIT proposer une page « Mentions légales et confidentialité »,
accessible sans interaction préalable depuis le pied de page de chaque écran (sur
le web à une largeur de téléphone, depuis la mention en tête du contenu) et depuis
l'écran « À propos », et sur le web à l'adresse `/mentions-legales`. Elle
DOIT indiquer :
- que l'éditeur, personne physique non professionnelle, reste anonyme et que
  ses coordonnées ont été communiquées à l'hébergeur ;
- une adresse électronique de contact ;
- le nom et l'adresse de l'hébergeur ;
- les données traitées et leur finalité (journaux techniques du serveur), et
  l'absence de cookie propre au site ;
- pour la mesure d'audience du site web (Umami, ADR 0035) : les données
  recueillies, l'absence de cookie et de conservation de l'adresse IP, la
  finalité statistique, la durée de conservation et le moyen de s'y opposer ;
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

#### Scenario: Mesure d'audience
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y trouve la description de la mesure d'audience Umami et comment s'y opposer

#### Scenario: Lien d'adhésion
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y apprend que le bouton d'adhésion est un lien de parrainage de l'éditeur
