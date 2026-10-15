## MODIFIED Requirements

### Requirement: Indexation par les moteurs de recherche
Le site web NE DOIT PAS être indexé par les moteurs de recherche, sauf si
l'exploitant l'active explicitement par configuration (`ALLOW_INDEXING=true`),
sans reconstruction de l'application. Tant que l'indexation est désactivée :
- toute réponse du serveur DOIT porter l'en-tête `X-Robots-Tag: noindex, nofollow` ;
- `/robots.txt` DOIT interdire l'exploration de tout le site.

Une fois l'indexation activée, ni l'en-tête ni l'interdiction NE DOIVENT être
présents, et `/robots.txt` DOIT indiquer l'adresse absolue du plan du site.

Le site DOIT servir à `/sitemap.xml` un plan du site au format Sitemaps qui liste, en
adresses absolues sur le domaine par lequel il est servi, les pages fixes (accueil,
campagne, à propos, mentions légales), chaque intervention visible et chaque page de
citation (dont le HTML servi porte le titre et la description, ADR 0030), avec leur date
de dernière mise à jour. Une intervention masquée (non publiée, sans rendu ou reprise
d'un autre article) NE DOIT PAS y figurer, ni ses citations.

#### Scenario: Déploiement par défaut
- **WHEN** le serveur démarre sans `ALLOW_INDEXING`
- **THEN** chaque page porte `X-Robots-Tag: noindex, nofollow` et `/robots.txt` contient `Disallow: /`

#### Scenario: Indexation activée
- **WHEN** le serveur démarre avec `ALLOW_INDEXING=true`
- **THEN** aucune réponse ne porte d'en-tête `X-Robots-Tag`, `/robots.txt` autorise l'exploration et contient `Sitemap: https://<domaine>/sitemap.xml`

#### Scenario: Plan du site
- **WHEN** un moteur demande `https://play.projetlisnard.fr/sitemap.xml`
- **THEN** il reçoit un document XML dont chaque adresse commence par `https://play.projetlisnard.fr/`, avec l'accueil, chaque intervention publiée et chaque page de citation, mais aucune intervention masquée
