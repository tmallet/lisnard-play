## ADDED Requirements

### Requirement: Consentement avant un lecteur tiers
Aucun lecteur tiers (YouTube, Dailymotion) NE DOIT être chargé avant une action
explicite du visiteur. L'écran de détail DOIT d'abord afficher l'image de
l'intervention, un bouton « Lire la vidéo » et une mention indiquant que le
fournisseur peut déposer des cookies. Après l'action, le lecteur DOIT se charger
et démarrer la lecture. Les vidéos YouTube DOIVENT être servies depuis le domaine
`youtube-nocookie.com`.

#### Scenario: Ouverture d'une vidéo
- **WHEN** un visiteur ouvre l'écran de détail d'une vidéo YouTube
- **THEN** seule la miniature s'affiche avec le bouton « Lire la vidéo », et aucune requête n'est faite vers YouTube pour le lecteur

#### Scenario: Lecture après consentement
- **WHEN** le visiteur appuie sur « Lire la vidéo »
- **THEN** le lecteur se charge depuis `www.youtube-nocookie.com` et la lecture démarre
