## Why

Le site rassemble les interventions de David Lisnard ; un visiteur convaincu n'a
aujourd'hui aucun moyen de passer à l'action. Un bouton d'adhésion à Nouvelle
Énergie, bien intégré et sans ambiguïté sur l'indépendance du site, lui en donne un.

## What Changes

- Encart « Vous partagez ces idées ? » avec un bouton « Adhérer à Nouvelle
  Énergie », sur l'accueil (entre les directs et les interventions passées) et sur
  la page d'une intervention (après le contenu).
- Le lien est le **lien de parrainage de l'éditeur** : c'est indiqué sous le bouton,
  ainsi que l'ouverture du site du parti. Les mentions légales le précisent aussi.
- Charte de l'app uniquement (couleurs, Montserrat), sans logo ni visuel du parti ;
  la mention d'indépendance reste affichée (ADR 0001). Nouvel ADR 0025.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell` : ajout de l'invitation à adhérer ; les mentions légales signalent le
  lien de parrainage.

## Impact

- App : `src/config/join.ts`, composant `JoinCta`, accueil (`InterventionFeed`),
  détail d'une intervention, mentions légales.
- Docs : ADR 0025, skill `charte-ui` (composant), `apps/app/AGENTS.md`.
- ADR concernés : 0001 (indépendance), 0012 (charte), 0022 (éditeur anonyme).

## Hors périmètre

- Bouton de don, ou toute collecte d'argent par le site.
- Suivi des clics ou mesure d'audience (aucun traceur, ADR 0022).
- Bouton dans l'application mobile ailleurs que sur l'accueil et le détail.
