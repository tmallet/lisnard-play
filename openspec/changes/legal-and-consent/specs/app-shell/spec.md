## ADDED Requirements

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
- le dépôt de cookies par les lecteurs tiers, seulement après l'action du
  visiteur, avec un lien vers les règles de confidentialité de Google ;
- les droits des personnes et la possibilité de saisir la CNIL.

#### Scenario: Accès depuis n'importe quel écran
- **WHEN** un visiteur consulte une page quelconque du site
- **THEN** un lien « Mentions légales et confidentialité » est présent en pied de page et mène à `/mentions-legales`

#### Scenario: Contact
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y trouve l'adresse `lisnardplay@tmallet.fr` et l'identité de l'hébergeur
