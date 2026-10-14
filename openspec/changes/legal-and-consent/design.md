## Context

Motivation : voir `proposal.md`. Décisions : ADR 0022.

## Decisions

### D1 — Configuration légale centralisée

`apps/app/src/config/legal.ts` regroupe :
- l'adresse de contact (`lisnardplay@tmallet.fr`) ;
- l'hébergeur : OneProvider (BrainStorm Network Inc., Laval, Canada), prestataire
  du serveur dédié, avec le lieu d'hébergement (France, centre de données
  Scaleway à Paris, d'après le whois de l'adresse IP) ;
- la date de mise à jour.

La page `/mentions-legales` et « À propos » lisent cette configuration. Changer
d'hébergeur ne touche qu'un fichier.

### D2 — Composant `PlayerConsent`

- **Affichage** : un composant multiplateforme affiche l'image de l'intervention
  (miniature HD, `largeThumbnail`), un bouton « Lire la vidéo » et la mention du
  fournisseur.
- **Au clic** : il rend `MediaEmbed`, avec une URL de lecteur transformée par
  `playerUrl()` :
  - hôte YouTube remplacé par `www.youtube-nocookie.com` ;
  - paramètre `autoplay=1`.
- **WebView mobile** : `mediaPlaybackRequiresUserAction` passe à `false`, puisque
  le clic de consentement tient lieu d'action de lecture.
- **Navigation** : la règle de l'ADR 0017, appliquée par `allowsInWebView`,
  compare la même URL transformée.

### D3 — Page légale statique

La route `src/app/mentions-legales.tsx` est pré-rendue au build (ADR 0011) :
- le smoke test vérifie son HTML sans JavaScript ;
- sur mobile, elle s'ouvre dans la pile, avec un en-tête « Retour » comme le
  détail ;
- le pied de page (`Footer`, mobile et web) y renvoie.

## Risks / Trade-offs

- **[Coordonnées de l'hébergeur]** : elles doivent rester exactes. Elles sont
  isolées dans `config/legal.ts`, et le porteur du projet les vérifie au
  déploiement.
- **[Autoplay bloqué par un navigateur]** : la lecture peut alors demander un
  second clic. C'est sans conséquence sur la conformité.
