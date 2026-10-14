## MODIFIED Requirements

### Requirement: Fraîcheur
L'accueil DOIT rafraîchir la liste « En direct » et « À venir » au plus toutes
les 30 secondes tant qu'il est affiché, sans action de l'utilisateur, et dès que
l'application revient au premier plan.

#### Scenario: Un direct commence pendant la consultation
- **WHEN** un direct démarre alors que l'utilisateur est sur l'accueil
- **THEN** il apparaît dans la section « En direct » en moins de 30 secondes après sa détection par le worker

#### Scenario: Retour dans l'application
- **WHEN** l'utilisateur revient dans l'application mobile après l'avoir quittée
- **THEN** les listes « En direct » et « À venir » sont rafraîchies immédiatement
