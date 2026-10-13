# api-transport Specification

## Purpose

Exposer l'API de l'application derrière un point d'accès unique et typé, qui
valide les entrées et sert de canal à toutes les fonctionnalités
suivantes (liste des interventions, détail, abonnements).

## Requirements

### Requirement: Point d'accès API unique
L'application DOIT exposer son API sous le chemin `/api/trpc`, servi par la
même application que l'interface web, et les clients web, iOS et Android
DOIVENT tous passer par ce point d'accès.

#### Scenario: Appel depuis le web
- **WHEN** l'interface web appelle une procédure de l'API
- **THEN** la requête est adressée à un chemin sous `/api/trpc` de la même origine

#### Scenario: Appel depuis le mobile
- **WHEN** l'application mobile appelle une procédure de l'API
- **THEN** la requête est adressée à `/api/trpc` sur l'URL de base configurée pour l'environnement

### Requirement: Procédure de santé
L'API DOIT exposer une procédure publique de santé, en lecture seule, qui
renvoie un statut `ok`, la version de l'application et l'horodatage du serveur
au format ISO 8601.

#### Scenario: Santé nominale
- **WHEN** un client appelle la procédure de santé
- **THEN** la réponse contient `status: "ok"`, une `version` non vide et un horodatage ISO 8601

#### Scenario: Affichage côté client
- **WHEN** la page d'accueil est chargée en environnement de développement
- **THEN** le statut renvoyé par la procédure de santé est visible à l'écran

### Requirement: Validation des entrées
Toute procédure qui accepte des paramètres DOIT les valider avant traitement,
et rejeter une entrée invalide par une erreur de type « requête invalide »
qui décrit les champs fautifs, sans exécuter la procédure.

#### Scenario: Entrée invalide
- **WHEN** un client appelle une procédure avec un paramètre de type incorrect
- **THEN** l'API répond par une erreur de requête invalide qui indique le champ en cause, et la procédure n'est pas exécutée

### Requirement: Erreurs sans fuite d'information
En production, les erreurs renvoyées par l'API NE DOIVENT PAS exposer de pile
d'appels, de chemin de fichier ni de secret.

#### Scenario: Erreur interne en production
- **WHEN** une procédure lève une erreur inattendue en production
- **THEN** le client reçoit une erreur interne générique, sans pile d'appels ni détail d'implémentation

### Requirement: Contrat typé partagé
Les types d'entrée et de sortie des procédures DOIVENT être partagés entre le
serveur et les clients, afin qu'un changement incompatible du contrat soit
détecté à la vérification de types, avant l'exécution.

#### Scenario: Changement incompatible
- **WHEN** la forme de sortie d'une procédure change d'une manière incompatible avec son usage côté client
- **THEN** la vérification de types du dépôt échoue
