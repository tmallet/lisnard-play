## ADDED Requirements

### Requirement: Liens d'agrégateur
Quand l'URL d'un contenu est un lien de redirection d'un agrégateur (Google
News), le système DOIT déterminer l'URL de l'article chez l'éditeur avant de
lire ses balises Open Graph. Le rendu `link` DOIT alors porter cette URL, vers
laquelle le lien « source » de l'application renvoie. Si la résolution échoue,
la règle « Échec de la résolution » s'applique.

#### Scenario: Article relayé par Google News
- **WHEN** un article publié a pour URL un lien Google News qui mène à lejdd.fr
- **THEN** son rendu `link` porte l'URL de l'article sur lejdd.fr, avec l'image, l'accroche et le nom du site lus sur cette page

#### Scenario: Décodage impossible
- **WHEN** le lien Google News ne peut pas être résolu
- **THEN** le contenu est rendu en `link` minimal, avec son titre et le nom du média déjà connus

### Requirement: Lecture limitée aux métadonnées de partage
Pour une page d'éditeur de presse, le système NE DOIT lire que les balises de
l'en-tête destinées au partage (titre, image, accroche, nom du site). Il NE DOIT
NI stocker NI exploiter le texte de l'article (ADR 0021).

#### Scenario: Page d'article
- **WHEN** la page d'un article est lue pour construire sa carte
- **THEN** seules les balises Open Graph de l'en-tête sont conservées, et l'accroche est tronquée à 300 caractères

### Requirement: Mise à jour des rendus existants
Le système DOIT permettre de recalculer, à la demande, le rendu des contenus déjà
publiés, pour appliquer la résolution des liens d'agrégateur aux articles
collectés auparavant.

#### Scenario: Reprise des articles existants
- **WHEN** l'exploitant lance le recalcul des rendus
- **THEN** chaque article Google News déjà publié reçoit un rendu construit à partir de la page de l'éditeur
