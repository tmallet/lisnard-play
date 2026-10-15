## ADDED Requirements

### Requirement: Partage d'une citation en image
Chaque citation DOIT disposer d'une image carrée de 1080 × 1080 pixels, au format PNG,
à l'adresse `/interventions/<identifiant>/citation/<secondes>/image.png`. L'image DOIT
reprendre la palette et la police de la charte, et montrer :
- le texte de la citation ;
- « David Lisnard » ;
- le média et la date ;
- l'adresse du site ;
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
- **THEN** elle montre la citation, « David Lisnard », « BFMTV · 13 octobre 2026 », l'adresse du site et la mention d'indépendance, sans logo ni photo

#### Scenario: Citation régénérée
- **WHEN** on demande l'image d'une citation qui n'existe plus à ce minutage
- **THEN** le serveur répond 404
