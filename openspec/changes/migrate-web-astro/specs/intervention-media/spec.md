## MODIFIED Requirements

### Requirement: Intégration sécurisée
Le lecteur intégré DOIT être affiché dans une iframe dont l'origine est celle du
fournisseur. Seule l'adresse du lecteur est conservée ; le HTML oEmbed brut NE DOIT
jamais être injecté tel quel dans la page de l'application.

#### Scenario: Affichage d'un lecteur
- **WHEN** l'écran de détail affiche un contenu `embed`
- **THEN** le lecteur est chargé depuis l'origine du fournisseur dans une iframe, sans HTML tiers injecté dans la page
