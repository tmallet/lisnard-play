## ADDED Requirements

### Requirement: Lecture sans JavaScript
Toute page DOIT être lisible et parcourable sans exécuter de JavaScript côté client :
l'accueil, ses filtres, ses interventions passées, le détail d'une intervention et
ses citations, la page d'une citation, « Campagne », « À propos » et les mentions
légales. Sans JavaScript :
- les filtres de l'accueil DOIVENT fonctionner par l'adresse (`theme`, `format`) ;
- la section « Passées » DOIT proposer un lien vers les interventions plus anciennes,
  qui porte les filtres en cours ;
- l'écran de détail DOIT afficher la miniature et un lien vers la source à la place
  du lecteur.

Le JavaScript ne fait qu'ajouter des fonctions : chargement continu, recherche
instantanée, rafraîchissement des directs, lecteur après consentement, notifications,
partage.

#### Scenario: Robot sans JavaScript sur une intervention
- **WHEN** un client HTTP sans moteur JavaScript demande `/interventions/<id>` d'une vidéo résumée
- **THEN** le corps de la page, hors `<noscript>`, contient le titre, le média, la date, le résumé, ses points et les citations de l'intervention

#### Scenario: Pagination sans JavaScript
- **WHEN** un client sans JavaScript demande `/?theme=security` et suit le lien vers les interventions plus anciennes
- **THEN** il reçoit la page suivante des interventions passées du thème `security`

#### Scenario: Filtre sans JavaScript
- **WHEN** un client sans JavaScript demande `/?format=clip`
- **THEN** la section « Passées » du HTML ne contient que des clips

### Requirement: Stabilité des adresses publiques
Les adresses publiques du site DOIVENT rester celles servies avant la migration, avec
les mêmes statuts HTTP : `/`, `/interventions/<id>`, `/interventions/<id>/citation/<secondes>`
et ses images `image.png` et `apercu.png`, `/campagne` (et `?vue=deplacements`),
`/a-propos`, `/mentions-legales`, `/notifications`, `/sitemap.xml`, `/robots.txt`,
`/manifest`, `/api/trpc`, `/admin`. `/adhesions` DOIT rediriger de façon permanente
vers `/campagne`. Une adresse inconnue DOIT répondre HTTP 404 avec une page qui porte la
mention d'indépendance.

#### Scenario: Ancienne adresse d'intervention
- **WHEN** un moteur revisite une adresse `/interventions/<id>` listée dans le plan du site avant la migration
- **THEN** il reçoit HTTP 200 et la page de cette intervention, avec la même adresse canonique

#### Scenario: Adresse inconnue
- **WHEN** un visiteur demande `/page-inexistante`
- **THEN** la réponse est HTTP 404 et la page affiche la mention d'indépendance

## MODIFIED Requirements

### Requirement: Disponibilité multiplateforme
L'application DOIT être un site web, utilisable dans tout navigateur récent, sur
ordinateur comme sur téléphone, et installable sur l'écran d'accueil (PWA). Il
N'existe pas d'application iOS ni Android (ADR 0037).

#### Scenario: Accès web
- **WHEN** un visiteur ouvre l'URL racine de l'application dans un navigateur
- **THEN** la page d'accueil s'affiche avec la mise en page commune

#### Scenario: Accès mobile
- **WHEN** un visiteur ouvre l'URL racine dans le navigateur d'un téléphone, ou depuis l'icône ajoutée à l'écran d'accueil
- **THEN** la page d'accueil s'affiche avec la mise en page commune, adaptée à la largeur du téléphone

### Requirement: HTML complet servi par le serveur
Le serveur DOIT rendre chaque page à chaque requête, à partir des données à jour, et
renvoyer un HTML qui contient déjà son contenu principal, dans le corps de la page et
hors de tout `<noscript>`, ainsi que ses métadonnées, sans exécution de JavaScript côté
client. Une intervention publiée DOIT apparaître dans le HTML de l'accueil et avoir sa
page dès sa publication, sans reconstruction du site.

#### Scenario: Contenu présent sans JavaScript
- **WHEN** un client HTTP sans moteur JavaScript demande la page d'accueil
- **THEN** la réponse HTML contient le titre de la page, la mention d'indépendance et les interventions de l'accueil

#### Scenario: Intervention publiée après le déploiement
- **WHEN** le worker publie une intervention après le dernier déploiement du site
- **THEN** sa page `/interventions/<id>` répond HTTP 200 avec son titre et son contenu dans le HTML

### Requirement: Mention d'indépendance
Chaque écran DOIT afficher, de façon visible et sans interaction préalable, la
mention « Initiative indépendante de soutiens. Ce site ne dépend ni de Nouvelle
Énergie ni de David Lisnard. »

#### Scenario: Mention sur le web
- **WHEN** une page quelconque est affichée sur le web, à partir d'une largeur de tablette
- **THEN** la mention d'indépendance est visible dans le pied de page, fixe en bas de l'écran

#### Scenario: Mention sur le web, téléphone
- **WHEN** une page quelconque est affichée sur le web à une largeur de téléphone
- **THEN** la mention d'indépendance et le lien vers les mentions légales sont affichés une seule fois, en petit en tête du contenu, sans pied de page fixe ; un écran qui affiche déjà la mention dans son contenu (« À propos », mentions légales) ne la répète pas

#### Scenario: Mention sur mobile
- **WHEN** un écran quelconque est affiché depuis le site installé sur l'écran d'accueil d'un téléphone
- **THEN** la mention d'indépendance y est affichée comme dans le navigateur à la même largeur

### Requirement: Nom de l'application centralisé
Le nom affiché de l'application DOIT provenir d'une source unique, de sorte
qu'en le modifiant à un seul endroit, il change dans tous les écrans, titres
de page et métadonnées.

#### Scenario: Changement du nom
- **WHEN** le nom de l'application est modifié dans sa source unique
- **THEN** le nouveau nom apparaît dans l'en-tête web, l'écran « À propos », le titre des pages web et les balises `og:title`

### Requirement: Mesure d'audience
Le site web DOIT mesurer son audience avec le script Umami de l'éditeur, sans
cookie ni stockage local, chargé en différé depuis le document HTML racine. Le
script NE DOIT envoyer de données que depuis le domaine de production et NE DOIT
rien envoyer si le navigateur demande à ne pas être suivi. Seules les pages vues
sont mesurées.

#### Scenario: Page servie en production
- **WHEN** un visiteur charge une page de `https://play.projetlisnard.fr/`
- **THEN** le HTML contient le script Umami avec `data-domains="play.projetlisnard.fr"` et `data-do-not-track="true"`

#### Scenario: Ne pas me suivre
- **WHEN** le navigateur du visiteur envoie le signal « Do Not Track »
- **THEN** aucune donnée de mesure d'audience n'est envoyée

### Requirement: Invitation à adhérer
L'accueil et la page d'une intervention, après son contenu, DOIVENT proposer un
encart d'invitation à adhérer à Nouvelle Énergie. Sur l'accueil, l'invitation DOIT
être visible sans défiler sans masquer la première intervention : sur téléphone, un
bandeau fin au-dessus des interventions passées ; dès deux colonnes, un encart après
la première rangée de cartes. L'encart DOIT :
- ouvrir le site d'adhésion du parti dans un nouvel onglet ;
- indiquer qu'il mène au site du parti et qu'il s'agit d'un lien de parrainage de
  l'éditeur, auquel l'adhésion sera rattachée ;
- n'utiliser que la charte de l'application, sans logo ni visuel du parti, et ne
  pas masquer la mention d'indépendance.

Aucun traceur NE DOIT être ajouté au lien ni au clic.

#### Scenario: Depuis une intervention
- **WHEN** un visiteur arrive en bas de la page d'une intervention
- **THEN** il voit « Vous partagez ces idées ? » et un bouton « Adhérer à Nouvelle Énergie » qui ouvre le site d'adhésion

#### Scenario: Transparence du parrainage
- **WHEN** un visiteur lit l'encart
- **THEN** il est informé que le lien est un lien de parrainage de l'éditeur du site

### Requirement: Métadonnées de référencement de l'accueil et des interventions
Le HTML servi pour l'accueil et pour chaque page `/interventions/<id>` DOIT porter, sans
exécuter de JavaScript, une adresse canonique sur le domaine de production, des balises
Open Graph et Twitter, et des données structurées JSON-LD. Une page d'intervention DOIT avoir
un titre (intervention et date), une description et une image propres, et décrire une
vidéo en `VideoObject` (date de mise en ligne, miniature, lecteur) ou un lien vers la presse
en `WebPage`. Son corps DOIT contenir, comme contenu visible de la page et non dans un
`<noscript>`, son titre, son média, sa date et, pour une vidéo seulement, son résumé, ses
points et ses citations. Une intervention de presse N'A PAS de résumé ni de texte
d'article (ADR 0021). Les valeurs issues des données DOIVENT être échappées. Une intervention
inconnue ou masquée DOIT répondre HTTP 404. Une page de l'accueil filtrée ou paginée DOIT
avoir pour adresse canonique celle de l'accueil, sans paramètre.

#### Scenario: Vidéo
- **WHEN** un robot demande `/interventions/<id>` d'une vidéo publiée
- **THEN** le HTML a un titre propre daté, `link rel=canonical`, `og:image`, `twitter:card`, un JSON-LD `VideoObject` et le résumé dans le corps de la page

#### Scenario: Presse
- **WHEN** un robot demande l'intervention d'un article relayé
- **THEN** le HTML porte titre, média et date, un JSON-LD `WebPage`, et aucun résumé

#### Scenario: Intervention inconnue
- **WHEN** un robot demande `/interventions/<uuid inconnu>`
- **THEN** la réponse est HTTP 404

#### Scenario: Accueil
- **WHEN** un robot demande `/`
- **THEN** le HTML contient la canonique, la carte Twitter, l'image et un JSON-LD `WebSite` et `Organization` portant la mention d'indépendance

#### Scenario: Accueil filtré
- **WHEN** un robot demande `/?theme=security`
- **THEN** l'adresse canonique du HTML est `https://play.projetlisnard.fr/`
