# app-shell Specification

## Purpose

Fournir la coquille commune de l'application sur le web, iOS et Android : mise
en page, navigation de base, identité visuelle issue de la charte réduite et
affichage permanent du caractère indépendant de l'application.
## Requirements
### Requirement: Disponibilité multiplateforme
L'application DOIT être utilisable dans un navigateur web, sur iOS et sur
Android à partir d'une même base de code, avec les mêmes écrans.

#### Scenario: Accès web
- **WHEN** un visiteur ouvre l'URL racine de l'application dans un navigateur
- **THEN** la page d'accueil s'affiche avec la mise en page commune

#### Scenario: Accès mobile
- **WHEN** un utilisateur lance l'application sur iOS ou Android
- **THEN** la page d'accueil s'affiche avec la même mise en page commune

### Requirement: HTML complet servi par le serveur
Sur le web, le serveur DOIT renvoyer pour chaque page un HTML qui contient déjà son
contenu principal et ses métadonnées, sans exécution de JavaScript côté client.
Ce HTML peut être pré-rendu au build ou rendu à chaque requête (ADR 0011).

#### Scenario: Contenu présent sans JavaScript
- **WHEN** un client HTTP sans moteur JavaScript demande la page d'accueil
- **THEN** la réponse HTML contient le titre de la page et la mention d'indépendance

### Requirement: Métadonnées web de base
Chaque page web DOIT exposer un titre, une description, une langue de document
`fr` et les balises Open Graph `og:title`, `og:description` et `og:type`.

#### Scenario: Métadonnées de la page d'accueil
- **WHEN** la page d'accueil est demandée sur le web
- **THEN** le document HTML déclare `lang="fr"`, une balise `<title>`, une meta description et les balises `og:title`, `og:description` et `og:type`

### Requirement: Mention d'indépendance
Chaque écran DOIT afficher, de façon visible et sans interaction préalable, la
mention « Initiative indépendante de soutiens. Ce site ne dépend ni de Nouvelle
Énergie ni de David Lisnard. »

#### Scenario: Mention sur le web
- **WHEN** une page quelconque est affichée sur le web
- **THEN** la mention d'indépendance est visible dans le pied de page

#### Scenario: Mention sur mobile
- **WHEN** un écran quelconque est affiché sur iOS ou Android
- **THEN** la mention d'indépendance y est affichée en clair, dans le contenu de l'écran

### Requirement: Écran « À propos »
L'application DOIT proposer un écran « À propos », accessible depuis la
navigation principale, qui présente l'objet de l'application, son caractère
indépendant, le fait que les contenus proviennent de sources publiques, et un
moyen de contact.

#### Scenario: Accès à « À propos »
- **WHEN** l'utilisateur choisit « À propos » dans la navigation
- **THEN** l'écran présente l'objet de l'application, la mention d'indépendance, l'origine publique des contenus et un moyen de contact

### Requirement: Charte visuelle réduite
L'interface DOIT utiliser exclusivement la palette de la charte réduite (bleu
`#1d257a`, bleu sombre `#0f1752`, chamois `#b0ad85`, blanc `#f9f9f9`,
émeraude `#52c985`) et la police Montserrat. Elle NE DOIT afficher ni le logo
Nouvelle Énergie, ni l'hexagone signature, ni aucun visuel officiel de la
campagne.

#### Scenario: Couleurs et police appliquées
- **WHEN** la page d'accueil est affichée
- **THEN** le fond utilise le bleu sombre ou le dégradé bleu vers bleu sombre, le texte principal est blanc et les titres sont en Montserrat

#### Scenario: Absence d'éléments officiels
- **WHEN** n'importe quel écran est affiché
- **THEN** aucun logo Nouvelle Énergie ni aucun hexagone signature n'apparaît

### Requirement: Accessibilité de base
Les éléments interactifs DOIVENT être utilisables au clavier sur le web, avec un
indicateur de focus visible, et le texte principal DOIT atteindre un contraste
d'au moins 4,5:1 avec son fond.

#### Scenario: Navigation au clavier
- **WHEN** un utilisateur web parcourt la page avec la touche Tab
- **THEN** chaque lien de navigation reçoit le focus avec un contour visible

### Requirement: Nom de l'application centralisé
Le nom affiché de l'application DOIT provenir d'une source unique, de sorte
qu'en le modifiant à un seul endroit, il change dans tous les écrans, titres
de page et métadonnées. Les écrans mobiles n'affichent pas le nom en surtitre :
la barre d'onglets et le titre de l'accueil suffisent à situer l'utilisateur.

#### Scenario: Changement du nom
- **WHEN** le nom de l'application est modifié dans sa source unique
- **THEN** le nouveau nom apparaît dans l'en-tête web, l'écran « À propos », le titre des pages web et les balises `og:title`

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

### Requirement: Mentions légales et confidentialité
L'application DOIT proposer une page « Mentions légales et confidentialité »,
accessible sans interaction préalable depuis le pied de page de chaque écran et
depuis l'écran « À propos », et sur le web à l'adresse `/mentions-legales`. Elle
DOIT indiquer :
- que l'éditeur, personne physique non professionnelle, reste anonyme et que
  ses coordonnées ont été communiquées à l'hébergeur ;
- une adresse électronique de contact ;
- le nom et l'adresse de l'hébergeur ;
- les données traitées et leur finalité (journaux techniques du serveur), et
  l'absence de cookie propre au site ;
- pour les notifications : les données d'abonnement conservées (adresse ou
  jeton fourni par le service push, préférences), leur finalité, leur
  transmission aux services push du navigateur ou de la plateforme, et leur
  suppression au désabonnement ou après 13 mois sans confirmation ;
- le dépôt de cookies par les lecteurs tiers, seulement après l'action du
  visiteur, avec un lien vers les règles de confidentialité de Google ;
- les droits des personnes et la possibilité de saisir la CNIL.

#### Scenario: Accès depuis n'importe quel écran
- **WHEN** un visiteur consulte une page quelconque du site
- **THEN** un lien « Mentions légales et confidentialité » est présent en pied de page et mène à `/mentions-legales`

#### Scenario: Contact
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y trouve l'adresse `lisnardplay@tmallet.fr` et l'identité de l'hébergeur

#### Scenario: Notifications
- **WHEN** un visiteur ouvre la page des mentions légales
- **THEN** il y trouve les données conservées pour les notifications et leur durée de conservation

