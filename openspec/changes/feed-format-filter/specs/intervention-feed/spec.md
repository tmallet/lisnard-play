## ADDED Requirements

### Requirement: Format d'une intervention
Chaque intervention publiée DOIT avoir un format parmi trois, déduit de son rendu et de
sa durée, sans appel au classifieur :
- `article` : rendue par un lien vers la source, sans lecteur intégré ;
- `clip` : lecteur intégré et durée de 5 minutes au plus ;
- `long` : lecteur intégré et durée de plus de 5 minutes, ou durée inconnue.

Un direct resté programmé après son heure, jamais diffusé, N'A pas de format : il ne
figure que dans la liste sans filtre.

#### Scenario: Clip
- **WHEN** une vidéo intégrée dure 5 minutes tout juste
- **THEN** son format est `clip`

#### Scenario: Vidéo longue
- **WHEN** une vidéo intégrée dure 5 minutes et 1 seconde
- **THEN** son format est `long`

#### Scenario: Durée inconnue
- **WHEN** une vidéo intégrée n'a pas de durée connue
- **THEN** son format est `long`

#### Scenario: Direct jamais diffusé
- **WHEN** un direct programmé n'a pas démarré à son heure et n'a pas de durée
- **THEN** il n'apparaît ni sous les clips, ni sous les vidéos longues, ni sous les articles

#### Scenario: Article
- **WHEN** une intervention de type télévision n'a pas de lecteur intégré et renvoie vers le site du média
- **THEN** son format est `article`

### Requirement: Filtre par format
La procédure publique de liste DOIT accepter un format facultatif, combinable avec le
statut temporel et le thème ; une valeur inconnue DOIT être rejetée comme requête
invalide. L'accueil DOIT proposer, sous le filtre par thème, un filtre « Tout »,
« Vidéos longues », « Clips », « Presse et médias », qui reste utilisable sur un écran de
téléphone. Ce filtre NE DOIT s'appliquer qu'à la section « Passées » : les sections
« En direct » et « À venir » restent affichées quel que soit le format choisi.

#### Scenario: Filtrer par format sur l'accueil
- **WHEN** l'utilisateur choisit « Vidéos longues »
- **THEN** la section « Passées » n'affiche que les interventions de format `long`, le filtre choisi est signalé comme actif et le chargement continu suit ce filtre

#### Scenario: Format et thème combinés
- **WHEN** l'utilisateur choisit « Sécurité » puis « Clips »
- **THEN** la section « Passées » n'affiche que les clips portant le thème `security`

#### Scenario: Direct pendant un filtre par format
- **WHEN** une intervention est en direct et que l'utilisateur a choisi « Presse et médias »
- **THEN** la section « En direct » reste affichée

#### Scenario: Chargement ou échec d'un format
- **WHEN** une intervention est en direct, que l'utilisateur choisit un format et que les interventions passées sont en cours de chargement ou n'ont pas pu être chargées
- **THEN** la section « En direct » reste affichée, et le chargement ou un bouton pour réessayer apparaît dans la section « Passées »

#### Scenario: Aucun résultat pour les filtres
- **WHEN** aucune intervention passée ne correspond au format et au thème choisis
- **THEN** la section « Passées » affiche un message indiquant qu'aucune intervention ne correspond à ces filtres

#### Scenario: Format inconnu
- **WHEN** un client demande le format `podcast`
- **THEN** l'API rejette la requête par une erreur de requête invalide
