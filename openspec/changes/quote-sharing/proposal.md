## Why

Partager une citation sur X demande aujourd'hui de copier le lien à la main, et ce lien
s'affiche partout (X, WhatsApp, Facebook, LinkedIn) avec un aperçu générique
(« Citation · Lisnard Play »), car la page est pré-rendue sans connaître la citation
(ADR 0011). L'image de la citation existe déjà (ADR 0029) : il reste à la faire
apparaître dans l'aperçu du lien et à proposer un partage direct sur X.

## What Changes

- **Bouton « Partager sur X »** sur la page d'une citation et dans la section
  « Citations » de l'écran de détail.
  - Il ouvre la rédaction d'un message X déjà remplie : la citation, « — David
    Lisnard » et le lien vers la page de la citation.
  - Il passe par l'adresse de partage publique de X : ni compte développeur, ni SDK,
    ni traceur.
- **Aperçu du lien d'une citation** : le serveur réécrit l'en-tête de la page de
  citation qu'il sert (titre, description, `og:image`, `og:url`, `twitter:card`). Un
  lien partagé, par le bouton ou par copier-coller, s'affiche ainsi avec la citation.
- **Variante paysage de l'image** (1200 × 630), format des grands aperçus de lien,
  à `/interventions/<id>/citation/<secondes>/apercu.png`. Le carré reste pour
  « Partager en image ».
- Nouvel ADR 0030 : métadonnées des pages de citation réécrites par le serveur en
  attendant le rendu par requête du SDK 58 (ADR 0011).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `intervention-quotes` :
  - nouvelle exigence « Partage sur X » ;
  - nouvelle exigence « Aperçu du lien d'une citation » ;
  - l'exigence « Partage d'une citation en image » gagne la variante paysage.

## Hors périmètre

- Joindre l'image au message X : l'adresse de partage de X ne le permet pas, d'où
  l'aperçu du lien.
- Aperçu des pages d'intervention : même technique, change suivant.
- Autres réseaux (Facebook, LinkedIn, Bluesky) en bouton dédié : le partage natif
  existant les couvre, et ils profitent de l'aperçu.

## Impact

- `apps/app` :
  - `server.ts` réécrit l'en-tête des pages de citation (HTMLRewriter de Bun) et sert
    la variante paysage ;
  - mise en page paysage (`quote-card.ts`) ;
  - bouton X.
- Aucune dépendance nouvelle ; la citation est lue par l'API interne comme pour l'image
  (ADR 0029).
