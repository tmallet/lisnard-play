## MODIFIED Requirements

### Requirement: Partage d'une citation en image
Chaque citation DOIT disposer d'une image carrée de 1080 × 1080 pixels, au format PNG,
à l'adresse `/interventions/<identifiant>/citation/<secondes>/image.png`, et d'une
variante paysage de 1200 × 630 pixels à
`/interventions/<identifiant>/citation/<secondes>/apercu.png`, pour les aperçus de lien.
Les deux images DOIVENT reprendre la palette et la police de la charte, et montrer :
- le texte de la citation ;
- « David Lisnard » ;
- le média (sauf pour sa propre chaîne) et la date ;
- le thème, s'il est connu ;
- le minutage du passage, situé sur la durée de la vidéo quand elle est connue ;
- le nom et l'adresse du site ;
- la mention d'indépendance.

Elles NE DOIVENT contenir ni logo, ni photo, ni miniature de vidéo. Une citation
introuvable à ce minutage DOIT donner une réponse 404, sans image.

La page d'une citation et la section « Citations » de l'écran de détail DOIVENT
proposer « Partager en image » (image carrée) : le partage du navigateur avec l'image
s'il accepte les fichiers, sinon le téléchargement de l'image. Sans JavaScript, ce
bouton DOIT être un lien vers l'image.

#### Scenario: Partage depuis un téléphone
- **WHEN** un visiteur touche « Partager en image » sous une citation dans le navigateur d'un téléphone qui partage des fichiers
- **THEN** la feuille de partage s'ouvre avec l'image de la citation, prête à envoyer sur WhatsApp ou Instagram

#### Scenario: Navigateur d'ordinateur
- **WHEN** un visiteur clique sur « Partager en image » dans un navigateur qui ne partage pas de fichiers
- **THEN** l'image de la citation est téléchargée

#### Scenario: Contenu de l'image
- **WHEN** on ouvre l'image d'une citation de BFMTV du 13 octobre 2026
- **THEN** elle montre la citation, « David Lisnard », « 13 octobre 2026 · BFMTV », le passage à 10:41 situé sur la durée de la vidéo, l'adresse du site et la mention d'indépendance, sans logo ni photo

#### Scenario: Variante paysage
- **WHEN** on ouvre `apercu.png` d'une citation
- **THEN** on reçoit un PNG de 1200 × 630 pixels avec le même contenu, mis en page en largeur

#### Scenario: Citation régénérée
- **WHEN** on demande l'image d'une citation qui n'existe plus à ce minutage
- **THEN** le serveur répond 404
