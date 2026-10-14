## Why

L'écran de détail paraît vide :
- pour une vidéo, il n'y a que le lecteur, et il faut la regarder en entier
  pour savoir ce que David Lisnard y dit ;
- pour un article relayé par Google News, la carte n'a ni image ni accroche,
  car les balises Open Graph sont lues sur la page de redirection de Google et
  non sur le site de l'éditeur.

Le porteur du projet souhaite un résumé en tête du détail pour « ceux qui ne
veulent pas tout regarder ». L'essai du 2026-10-13 a validé l'approche pour les
vidéos : Gemini lit une URL YouTube via OpenRouter, avec la clé déjà en place,
pour 0,002 $ par clip et 0,10 $ par débat complet.

## What Changes

- **Résumé des vidéos** : pour chaque intervention publiée dont le média est
  une vidéo YouTube, le worker demande à Gemini, via OpenRouter, un résumé
  factuel et neutre de ce que dit David Lisnard, proportionné à la durée (de
  trois phrases pour un extrait à trois courts paragraphes pour un débat),
  ainsi que 3 à 6 points clés.
  - Le résultat est stocké avec le modèle et la version de la consigne.
  - Il est affiché sous le lecteur de l'écran de détail avec la mention « Résumé généré
    automatiquement ».
- **Garde-fous** :
  - modèle épinglé ;
  - sortie structurée (JSON) ;
  - budget quotidien plafonné ;
  - plafond de tentatives ;
  - aucun résumé tant qu'un direct n'est pas terminé ;
  - si le modèle indique que David Lisnard ne s'exprime pas, aucun résumé n'est
    affiché.
- **Articles, sans résumé par IA** : à cause du droit voisin des éditeurs de
  presse (code de la propriété intellectuelle, article L218-2), le système ne
  récupère pas le texte des articles.
  - Le lien Google News est résolu vers l'URL de l'article chez l'éditeur.
  - Les balises Open Graph (image, accroche, nom du site) sont lues dans l'en-tête
    de la page de l'éditeur.
  - Le lien « source » pointe vers l'éditeur.
  - Les articles déjà publiés sont repris.
- **API** : `interventions.byId` expose `summary` (texte et points), ou `null`.
- **Nouvel ADR** : génération de texte par Gemini via OpenRouter, en complément
  de Jev qui reste le seul juge de la publication (ADR 0004), et refus de
  résumer la presse.

## Capabilities

### New Capabilities
- `intervention-summaries` : génération, stockage, garde-fous et affichage du
  résumé des interventions vidéo.

### Modified Capabilities
- `intervention-media` : résolution de l'URL de l'éditeur pour les liens
  d'agrégateur (Google News) avant la lecture d'Open Graph. Le lien « source »
  pointe vers l'éditeur.
- `intervention-feed` : l'écran de détail affiche le résumé sous le lecteur, et
  `interventions.byId` l'expose.

Ces capacités viennent des changes `intervention-ingestion` et `campaign-themes`,
qui doivent être archivés avant celui-ci.

## Impact

- **Worker** :
  - nouveau module `summaries/` (client OpenRouter, consigne, tâche planifiée) ;
  - `media/resolve.ts` : décodage des liens Google News ;
  - CLI : `summarize` et `media --refresh` ;
  - tests avec des réponses enregistrées.
- **Base** : colonnes `item.summary` (jsonb) et `item.summary_attempts`. Migration
  additive.
- **API** : `getPublishedById` et le routeur.
- **App** : bloc « Résumé » sur l'écran de détail ; la carte de lien utilise
  l'URL de l'éditeur.
- **Coût** : environ 3 à 5 $ pour résumer les vidéos déjà publiées, puis
  quelques centimes par jour, avec un plafond quotidien configurable.
- **Pare-feu du devcontainer** : rien à ajouter. `openrouter.ai` y figure déjà ;
  les sites des éditeurs sont lus via la lecture sécurisée existante.

## Hors périmètre

- Transcription intégrale des vidéos : elle pourra venir dans un change
  ultérieur.
- Résumé des articles de presse, radios et podcasts non intégrés (droit
  voisin, absence de média lisible par le modèle).
- Résumé des vidéos Dailymotion : Gemini ne lit que les URL YouTube.
- Traduction des résumés et résumé dans les cartes de la liste.
