# intervention-quotes Specification

## Purpose
TBD - created by archiving change video-quotes. Update Purpose after archive.
## Requirements
### Requirement: Citations des vidéos
Pour chaque vidéo résumée où David Lisnard s'exprime, le système DOIT relever de 3
à 8 citations marquantes : ses propres mots, tels qu'il les prononce, avec le moment
de la vidéo où ils sont dits (en secondes) et un thème parmi ceux de l'application.
Une citation NE DOIT PAS être reformulée ni attribuée à un autre intervenant, et le
système NE DOIT PAS en relever pour un article de presse. Les citations DOIVENT être
produites dans le même appel que le résumé, enregistrées avec lui et remplacées
quand il est régénéré.

#### Scenario: Vidéo d'entretien
- **WHEN** une vidéo d'entretien de 20 minutes est résumée
- **THEN** elle reçoit entre 3 et 8 citations, chacune avec son minutage

#### Scenario: Pas de prise de parole
- **WHEN** David Lisnard ne s'exprime pas dans la vidéo
- **THEN** aucune citation n'est enregistrée

### Requirement: Citations à l'écran
L'écran de détail d'une vidéo DOIT afficher ses citations sous le résumé, chacune
avec un bouton qui lance le lecteur officiel au moment de la citation et un lien vers
sa page. Les citations DOIVENT être signalées comme une transcription automatique.
Une adresse d'intervention avec un minutage (`?t=<secondes>`) DOIT ouvrir le lecteur
calé sur ce moment, après le consentement au lecteur tiers (ADR 0022).

#### Scenario: Écouter une citation
- **WHEN** l'utilisateur touche « ▶ 12:34 » sous une citation
- **THEN** le lecteur officiel démarre à 12 minutes 34 secondes

### Requirement: Page d'une citation
Chaque citation DOIT avoir une page à l'adresse
`/interventions/<identifiant>/citation/<secondes>`, avec la citation en grand, le
média, la date, le lecteur calé sur le passage et un lien vers l'intervention. Si
aucune citation ne correspond à ce minutage (citations régénérées), la page DOIT
afficher l'intervention calée sur ce moment plutôt qu'une erreur.

#### Scenario: Lien partagé
- **WHEN** un visiteur ouvre le lien d'une citation reçu par message
- **THEN** il voit la citation, son contexte, et peut écouter le passage

#### Scenario: Citation régénérée
- **WHEN** un visiteur ouvre le lien d'une citation qui n'existe plus à ce minutage
- **THEN** l'intervention s'affiche, le lecteur calé sur ce moment

### Requirement: Recherche
L'accueil DOIT proposer un champ de recherche qui trouve, parmi les interventions
publiées, les citations, titres et résumés contenant les mots saisis, en français et
sans tenir compte des accents ni de la casse. Les résultats DOIVENT montrer d'abord
les citations, chacune menant à sa page, puis les interventions correspondantes. Une
recherche sans résultat DOIT l'indiquer.

#### Scenario: Recherche d'un thème
- **WHEN** l'utilisateur cherche « retraites »
- **THEN** il voit les citations qui en parlent, avec leur média et leur date, puis les interventions dont le titre ou le résumé le mentionnent

#### Scenario: Accents
- **WHEN** l'utilisateur cherche « etat profond »
- **THEN** la citation « L'État profond en France, c'est Bercy » est trouvée

### Requirement: Partage d'une citation en image
Chaque citation DOIT disposer d'une image carrée de 1080 × 1080 pixels, au format PNG,
à l'adresse `/interventions/<identifiant>/citation/<secondes>/image.png`. L'image DOIT
reprendre la palette et la police de la charte, et montrer :
- le texte de la citation ;
- « David Lisnard » ;
- le média (sauf pour sa propre chaîne) et la date ;
- le thème, s'il est connu ;
- le minutage du passage, situé sur la durée de la vidéo quand elle est connue ;
- le nom et l'adresse du site ;
- la mention d'indépendance.

L'image NE DOIT contenir ni logo, ni photo, ni miniature de vidéo. Une citation
introuvable à ce minutage DOIT donner une réponse 404, sans image.

La page d'une citation et la section « Citations » de l'écran de détail DOIVENT
proposer « Partager en image » :
- sur iOS et Android, la feuille de partage du système avec l'image ;
- sur le web, le partage du navigateur avec l'image s'il accepte les fichiers, sinon le
  téléchargement de l'image.

#### Scenario: Partage depuis un téléphone
- **WHEN** un visiteur touche « Partager en image » sous une citation dans l'app iPhone
- **THEN** la feuille de partage s'ouvre avec l'image de la citation, prête à envoyer sur WhatsApp ou Instagram

#### Scenario: Navigateur d'ordinateur
- **WHEN** un visiteur clique sur « Partager en image » dans un navigateur qui ne partage pas de fichiers
- **THEN** l'image de la citation est téléchargée

#### Scenario: Contenu de l'image
- **WHEN** on ouvre l'image d'une citation de BFMTV du 13 octobre 2026
- **THEN** elle montre la citation, « David Lisnard », « 13 octobre 2026 · BFMTV », le passage à 10:41 situé sur la durée de la vidéo, l'adresse du site et la mention d'indépendance, sans logo ni photo

#### Scenario: Citation régénérée
- **WHEN** on demande l'image d'une citation qui n'existe plus à ce minutage
- **THEN** le serveur répond 404

