## MODIFIED Requirements

### Requirement: Point d'accès API unique
L'application DOIT exposer son API sous le chemin `/api/trpc`, servi par la même
application que l'interface web, et le code exécuté dans le navigateur DOIT passer par
ce point d'accès. Le rendu des pages par le serveur DOIT appeler les mêmes procédures,
avec la même validation et les mêmes règles d'exposition, sans requête HTTP vers
lui-même.

#### Scenario: Appel depuis le web
- **WHEN** l'interface web appelle une procédure de l'API
- **THEN** la requête est adressée à un chemin sous `/api/trpc` de la même origine

#### Scenario: Rendu serveur
- **WHEN** le serveur rend la page d'une intervention masquée
- **THEN** la procédure de détail la refuse comme elle le ferait pour un appel HTTP, et la page répond HTTP 404

#### Scenario: Appel depuis le mobile
- **WHEN** le site, ouvert dans le navigateur d'un téléphone ou installé sur son écran d'accueil, appelle une procédure de l'API
- **THEN** la requête est adressée à un chemin sous `/api/trpc` de la même origine ; il n'existe pas d'application native ni d'URL de base propre au mobile
