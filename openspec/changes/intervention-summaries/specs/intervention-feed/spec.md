## MODIFIED Requirements

### Requirement: Détail d'une intervention
L'API DOIT fournir une procédure publique de détail par identifiant, qui renvoie
les champs de la liste ainsi que la description, l'URL de la source, le rendu
média (`embed` avec l'adresse du lecteur, ou `link` avec les données de la carte
et, pour un lien d'agrégateur, l'URL de l'éditeur) et le résumé (texte et points
clés) quand il existe et peut être affiché, sinon `null` (spec
`intervention-summaries`). Un identifiant inconnu ou non publié DOIT renvoyer
une erreur « introuvable ».

#### Scenario: Identifiant inconnu
- **WHEN** un client demande le détail d'un identifiant qui n'existe pas ou n'est pas publié
- **THEN** l'API renvoie une erreur « introuvable »

#### Scenario: Détail avec résumé
- **WHEN** un client demande le détail d'une vidéo résumée
- **THEN** la réponse contient le texte du résumé et ses points clés, sans le modèle ni la consigne utilisés

### Requirement: Écran de détail
Un écran de détail DOIT afficher le titre, le média, la date, le type, les thèmes
et la description d'une intervention, ainsi que son résumé sous le lecteur quand il
existe (spec `intervention-summaries`). Pour un rendu `embed`, il affiche le
lecteur intégré et un lien vers la source. Pour un rendu `link`, il affiche une
carte qui ouvre la source dans le navigateur, chez l'éditeur quand l'URL de
celui-ci est connue : la carte tient lieu de lien vers la source. Il DOIT
toujours proposer un lien vers la source d'origine, une seule fois. Un texte
qui ne fait que répéter le titre, éventuellement suivi du nom du média
(description, titre ou description Open Graph de la carte), NE DOIT PAS être
affiché. L'écran DOIT être accessible par une URL web partageable
(`/interventions/<identifiant>`).

#### Scenario: Ouvrir une intervention vidéo
- **WHEN** l'utilisateur ouvre une intervention dont le rendu est `embed`
- **THEN** le lecteur intégré s'affiche, ainsi qu'un lien vers la source d'origine

#### Scenario: Article dont la description répète le titre
- **WHEN** l'utilisateur ouvre un article dont la description et le titre Open Graph reprennent le titre suivi du nom du média
- **THEN** le titre n'apparaît qu'une fois, la description n'est pas affichée, et la carte n'affiche que le média et le lien vers la source

#### Scenario: Article relayé par un agrégateur
- **WHEN** l'utilisateur ouvre un article Google News dont l'URL de l'éditeur est connue
- **THEN** la carte affiche l'image et l'accroche de l'éditeur, et son lien ouvre l'article chez l'éditeur

#### Scenario: Thèmes affichés
- **WHEN** l'utilisateur ouvre une intervention portant les thèmes `economie` et `institutions`
- **THEN** l'écran affiche les libellés « Économie » et « Institutions »

#### Scenario: URL partagée
- **WHEN** un visiteur ouvre directement `/interventions/<identifiant>` dans un navigateur
- **THEN** l'écran de détail de cette intervention s'affiche
