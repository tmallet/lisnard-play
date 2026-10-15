## REMOVED Requirements

### Requirement: Onglet « Adhésions »
**Reason**: L'onglet devient « Campagne » et réunit la courbe des adhésions et la
carte des déplacements.
**Migration**: L'adresse `/adhesions` redirige vers `/campagne`, vue « Adhésions ».

## ADDED Requirements

### Requirement: Onglet « Campagne »
L'application DOIT proposer un onglet « Campagne » dans la navigation principale
(en-tête sur le web, barre d'onglets sur iOS et Android). Il présente deux vues, au
choix de l'utilisateur : « Adhésions » (nombre d'adhérents de Nouvelle Énergie et son
évolution au fil des interventions, vue par défaut) et « Déplacements » (spec
`intervention-places`). Sur le web, la page DOIT être accessible à l'adresse
`/campagne`, la vue choisie DOIT figurer dans l'adresse (`/campagne?vue=deplacements`),
et l'ancienne adresse `/adhesions` DOIT rediriger vers `/campagne`.

#### Scenario: Accès depuis la navigation
- **WHEN** l'utilisateur choisit « Campagne » dans la navigation
- **THEN** la vue « Adhésions » s'affiche, avec le total d'adhérents, sa date de mise à jour et le graphique

#### Scenario: Changer de vue
- **WHEN** l'utilisateur choisit « Déplacements »
- **THEN** la carte des déplacements s'affiche et l'adresse devient `/campagne?vue=deplacements`

#### Scenario: Ancienne adresse
- **WHEN** un visiteur ouvre `/adhesions`
- **THEN** il arrive sur `/campagne`, vue « Adhésions »
