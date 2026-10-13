## MODIFIED Requirements

### Requirement: Nom de l'application centralisé
Le nom affiché de l'application DOIT provenir d'une source unique, de sorte
qu'en le modifiant à un seul endroit, il change dans tous les écrans, titres
de page et métadonnées. Les écrans mobiles n'affichent pas le nom en surtitre :
la barre d'onglets et le titre de l'accueil suffisent à situer l'utilisateur.

#### Scenario: Changement du nom
- **WHEN** le nom de l'application est modifié dans sa source unique
- **THEN** le nouveau nom apparaît dans l'en-tête web, l'écran « À propos », le titre des pages web et les balises `og:title`
