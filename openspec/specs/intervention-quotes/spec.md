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

