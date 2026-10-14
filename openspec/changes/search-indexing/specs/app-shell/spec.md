## ADDED Requirements

### Requirement: Indexation par les moteurs de recherche
Le site web NE DOIT PAS être indexé par les moteurs de recherche, sauf si
l'exploitant l'active explicitement par configuration (`ALLOW_INDEXING=true`),
sans reconstruction de l'application. Tant que l'indexation est désactivée :
- toute réponse du serveur DOIT porter l'en-tête `X-Robots-Tag: noindex, nofollow` ;
- `/robots.txt` DOIT interdire l'exploration de tout le site.

Une fois l'indexation activée, ni l'en-tête ni l'interdiction NE DOIVENT être
présents.

#### Scenario: Déploiement par défaut
- **WHEN** le serveur démarre sans `ALLOW_INDEXING`
- **THEN** chaque page porte `X-Robots-Tag: noindex, nofollow` et `/robots.txt` contient `Disallow: /`

#### Scenario: Indexation activée
- **WHEN** le serveur démarre avec `ALLOW_INDEXING=true`
- **THEN** aucune réponse ne porte d'en-tête `X-Robots-Tag` et `/robots.txt` autorise l'exploration
