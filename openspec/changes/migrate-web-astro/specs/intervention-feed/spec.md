## MODIFIED Requirements

### Requirement: Fraîcheur
L'accueil DOIT rafraîchir la liste « En direct » et « À venir » au plus toutes
les 30 secondes tant qu'il est affiché, sans action de l'utilisateur, et dès que
l'onglet du navigateur redevient visible. Sans JavaScript, ces listes sont celles du
moment où la page a été servie.

#### Scenario: Un direct commence pendant la consultation
- **WHEN** un direct démarre alors que l'utilisateur est sur l'accueil
- **THEN** il apparaît dans la section « En direct » en moins de 30 secondes après sa détection par le worker

#### Scenario: Retour dans l'application
- **WHEN** l'utilisateur revient sur l'onglet de l'accueil, ou rouvre le site installé sur l'écran d'accueil, après l'avoir quitté
- **THEN** les listes « En direct » et « À venir » sont rafraîchies immédiatement
