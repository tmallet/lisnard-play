## Why

Savoir ce que David Lisnard a dit sur un sujet suppose aujourd'hui de regarder des
heures de vidéo. Des citations horodatées, cherchables et partageables, chacune reliée
au passage exact de la vidéo officielle, font du site un outil que ni YouTube ni
Google News n'offrent : retrouver ce qu'il a dit, et le montrer.

## What Changes

- **Citations** : en plus du résumé, Gemini relève, dans le même appel, de 3 à 8
  citations marquantes par vidéo. Chaque citation a son texte, son minutage et son
  thème. Les vidéos seulement : on ne lit jamais le texte des articles (ADR 0021).
- **Écran de détail** : une section « Citations » sous le résumé. Chaque citation a un
  bouton « ▶ 12:34 » qui lance le lecteur officiel à ce moment, et un lien vers sa
  page. Mention « transcription automatique ».
- **Page par citation** : `/interventions/<id>/citation/<secondes>`, avec la citation
  en grand, le lecteur calé sur le passage, le contexte (média, date) et un lien vers
  l'intervention. Une adresse dont la citation a changé ouvre l'intervention au même
  moment.
- **Recherche** : un champ sur l'accueil, au-dessus des filtres, qui cherche dans les
  citations, les titres et les résumés (texte intégral, en français, sans tenir compte
  des accents). Les résultats mènent au passage exact ou à l'intervention.
- **Régénération** : la consigne des résumés passe en version 4. Les vidéos déjà
  résumées le sont à nouveau, avec leurs citations, au fil du plafond quotidien
  (environ 5 $ une fois).
- Nouvel ADR 0028.

## Capabilities

### New Capabilities
- `intervention-quotes` : extraction, stockage, affichage, page et recherche des
  citations.

### Modified Capabilities
- `intervention-summaries` : la réponse du modèle comprend les citations (consigne
  v4).
- `intervention-feed` : champ de recherche sur l'accueil.

## Impact

- **Base** :
  - table `quote` (intervention, position, texte, texte normalisé, minutage en
    secondes, thème), migration 0012 ;
  - index plein texte en français sur le texte normalisé, et index sur titres et
    résumés ;
  - lecture : citations d'une intervention, citation par minutage, recherche.
- **Worker** : consigne v4 et schéma de sortie (citations), validation, enregistrement
  des citations avec le résumé.
- **API** : `interventions.byId` expose les citations ; nouvelles procédures
  `quotes.at` et `search.query`.
- **App** :
  - section « Citations » de l'écran de détail ;
  - lecteur avec point de départ (paramètre `start` de YouTube, `?t=` dans
    l'adresse) ;
  - route `interventions/[id]/citation/[t]` ;
  - champ de recherche sur l'accueil et résultats.
- **Docs** : ADR 0028, `resumes.md`, architecture, AGENTS.
- ADR concernés : 0007 (médias), 0011 (pré-rendu), 0017, 0021 (résumés, presse),
  0022 (confidentialité).

## Hors périmètre

- Images de partage par citation (avec le rendu serveur, SDK 58).
- Transcription intégrale des vidéos.
- Citations tirées d'articles de presse.
- Correction manuelle des citations.
