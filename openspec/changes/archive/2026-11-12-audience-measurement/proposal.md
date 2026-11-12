## Why

L'éditeur veut connaître la fréquentation du site (pages consultées, origine des
visites) sans dégrader la confidentialité : pas de cookie, pas de bandeau, pas de
transfert à un tiers. Il dispose d'une instance Umami.

## What Changes

- **Script Umami** dans le document HTML racine (web seulement), limité au domaine
  de production et respectant « Do Not Track ».
- **Politique de confidentialité** : description de la mesure d'audience (données,
  finalité, conservation, opposition) ; retrait de « ne mesure pas l'audience ».
- **ADR 0035** : choix d'Umami, sans consentement au titre de l'exemption CNIL.

## Capabilities

### Modified Capabilities
- `app-shell` : nouvelle exigence « Mesure d'audience » ; « Mentions légales et
  confidentialité » décrit la mesure d'audience.
