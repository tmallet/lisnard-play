# intervention-media Specification

## Purpose
Déterminer comment afficher le média d'une intervention : lecteur intégré quand
la plateforme l'autorise, sinon carte de lien vers la source, sans jamais
réhéberger de contenu.
## Requirements
### Requirement: Choix du rendu à l'ingestion
Pour chaque contenu publié, le système DOIT déterminer et enregistrer un rendu,
avant de le rendre visible :
- `embed` quand l'URL correspond à un fournisseur oEmbed pris en charge qui
  renvoie un type `video` ou `rich` ;
- `link` sinon.

Les clients NE DOIVENT contenir aucune logique propre à une plateforme pour
choisir ce rendu.

#### Scenario: Vidéo YouTube
- **WHEN** un contenu publié est une vidéo YouTube
- **THEN** son rendu enregistré est `embed`, avec l'adresse du lecteur intégré

#### Scenario: Article de presse
- **WHEN** un contenu publié est un article d'un site sans oEmbed
- **THEN** son rendu enregistré est `link`, avec le titre, l'image et le nom du site lus dans ses balises Open Graph quand elles existent

### Requirement: Fournisseurs intégrables
Les fournisseurs pris en charge pour l'intégration DOIVENT être au minimum
YouTube et Dailymotion. Un fournisseur qui exige un jeton d'application (Meta)
DOIT être traité en `link`.

#### Scenario: Publication Instagram
- **WHEN** un contenu publié pointe vers une publication Instagram
- **THEN** son rendu est `link`

### Requirement: Intégration sécurisée
Le lecteur intégré DOIT être affiché dans un contexte isolé (iframe sur le web,
vue web sur mobile) dont l'origine est celle du fournisseur. Seule l'adresse du
lecteur est conservée ; le HTML oEmbed brut NE DOIT jamais être injecté tel quel
dans la page de l'application.

#### Scenario: Affichage d'un lecteur
- **WHEN** l'écran de détail affiche un contenu `embed`
- **THEN** le lecteur est chargé depuis l'origine du fournisseur dans un contexte isolé, sans HTML tiers injecté dans la page

### Requirement: Aucun réhébergement
Le système NE DOIT jamais télécharger, stocker ou servir le média audio ou vidéo
d'un contenu. Il ne conserve que des métadonnées et des URL.

#### Scenario: Contenu sans intégration
- **WHEN** un contenu radio n'est pas intégrable
- **THEN** l'application affiche un lien vers le replay du diffuseur, sans copie du média

### Requirement: Échec de la résolution
Si la résolution oEmbed ou la lecture des balises Open Graph échoue, le contenu
DOIT rester publiable avec un rendu `link` minimal (titre et nom du média issus
de la collecte).

#### Scenario: Site injoignable
- **WHEN** la page d'un article ne répond pas lors de la lecture des balises Open Graph
- **THEN** le contenu est rendu en `link` avec son titre et le nom du média déjà connus

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

