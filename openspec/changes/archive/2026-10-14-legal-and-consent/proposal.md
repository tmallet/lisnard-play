## Why

Le site est en ligne en préproduction et sera publié sur les stores. Trois
obligations s'appliquent, alors même que l'application ne collecte presque rien
(ni compte, ni mesure d'audience, ni cookie propre) :
- **mentions légales** (LCEN, article 6) : éditeur, contact, hébergeur ;
- **consentement avant les traceurs tiers** : le lecteur YouTube intégré dépose
  des cookies et traceurs Google dès son affichage, ce qui exige le consentement
  préalable du visiteur selon la CNIL ;
- **politique de confidentialité** : exigée par l'App Store, Google Play et les
  conditions de l'API YouTube.

Le porteur du projet a choisi d'être un éditeur anonyme. Ses coordonnées sont
communiquées à l'hébergeur (LCEN, article 6-III-2), et le public dispose de
l'adresse `lisnardplay@tmallet.fr`.

## What Changes

- **Page « Mentions légales et confidentialité »** (`/mentions-legales`),
  accessible depuis le pied de page de chaque écran et depuis « À propos » :
  - éditeur anonyme et adresse de contact ;
  - hébergeur (OneProvider, serveur en France) ;
  - données traitées : journaux techniques du serveur, aucun cookie propre,
    cookies des lecteurs tiers après consentement ;
  - droits des personnes et réclamation auprès de la CNIL ;
  - sources des contenus, résumés générés automatiquement ;
  - renvoi aux règles de confidentialité de Google pour les vidéos YouTube.
- **Lecteurs tiers en « clic pour charger »** : l'écran de détail affiche
  d'abord la miniature et un bouton « Lire la vidéo », avec une mention des
  cookies du fournisseur. Le lecteur ne se charge qu'après le clic, puis démarre
  aussitôt.
- **YouTube servi par `youtube-nocookie.com`**, qui limite les traceurs.
- **Adresse de contact centralisée** dans la configuration de l'app.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell` : nouvelle exigence « Mentions légales et confidentialité ».
- `intervention-media` : nouvelle exigence « Consentement avant un lecteur
  tiers ».

## Impact

- **App** :
  - nouvelle route `mentions-legales` ;
  - nouveaux composants `PlayerConsent` et `LegalLink` ;
  - modification de `MediaEmbed` (natif et web), `Footer` et `a-propos` ;
  - configuration `config/legal.ts`.
- **Smoke test** : la page est pré-rendue avec l'adresse de contact.
- **Documentation** : ADR 0022 (consentement et lecteurs tiers), `apps/app/AGENTS.md`.

## Hors périmètre

- Bandeau de cookies global : inutile, aucun traceur n'est déposé sans clic.
- Mémorisation du consentement d'une vidéo à l'autre : chaque lecteur demande
  son clic, ce qui reste simple et ne stocke rien.
- Questions de droit électoral (comptes de campagne) : hors du code.
