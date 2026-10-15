## MODIFIED Requirements

### Requirement: Écran de détail
Un écran de détail DOIT afficher le titre, le média, la date, le type, les thèmes
et la description d'une intervention, ainsi que son résumé sous le lecteur quand il
existe (spec `intervention-summaries`). La description d'une vidéo YouTube NE DOIT
être affichée que si la vidéo vient de la chaîne officielle de David Lisnard : celle
d'une chaîne de média décrit l'émission entière (liens, autres invités, publicités).
Pour un rendu `embed`, il affiche le
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

#### Scenario: Vidéo d'une chaîne de média
- **WHEN** l'utilisateur ouvre une vidéo de BFMTV ou du Crayon
- **THEN** la description YouTube de la vidéo n'est pas affichée

#### Scenario: Vidéo de la chaîne officielle
- **WHEN** l'utilisateur ouvre une vidéo de la chaîne de David Lisnard
- **THEN** sa description YouTube est affichée

#### Scenario: Article dont la description répète le titre
- **WHEN** l'utilisateur ouvre un article dont la description et le titre Open Graph reprennent le titre suivi du nom du média
- **THEN** le titre n'apparaît qu'une fois, la description n'est pas affichée, et la carte n'affiche que le média et le lien vers la source

#### Scenario: Article relayé par un agrégateur
- **WHEN** l'utilisateur ouvre un article Google News dont l'URL de l'éditeur est connue
- **THEN** la carte affiche l'image et l'accroche de l'éditeur, et son lien ouvre l'article chez l'éditeur

#### Scenario: Thèmes affichés
- **WHEN** l'utilisateur ouvre une intervention portant les thèmes `economy` et `institutions`
- **THEN** l'écran affiche les libellés « Économie » et « Institutions »

#### Scenario: URL partagée
- **WHEN** un visiteur ouvre directement `/interventions/<identifiant>` dans un navigateur
- **THEN** l'écran de détail de cette intervention s'affiche
