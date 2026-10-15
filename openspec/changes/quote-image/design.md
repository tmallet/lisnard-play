## Context

Le serveur de production (`apps/app/server.ts`, ADR 0015) est un programme Bun qui sert
l'export Expo. Les API routes, elles, sont empaquetées par Metro, qui ne sait pas
embarquer un module natif. La citation se lit avec `getQuoteAt` (ADR 0028), par la
connexion partagée des routes (`src/server/db.ts`).

## Goals / Non-Goals

**Goals :**
- une seule image, identique sur toutes les plateformes ;
- produite sans service tiers ni appel payant ;
- réutilisable plus tard comme `og:image`.

**Non-Goals :**
- éditeur d'image ;
- choix du fond ou du format par le visiteur.

## Decisions

Décisions durables consignées dans l'ADR 0029. En résumé :

- **Rendu par le serveur** : satori (mise en page JSX vers SVG, polices Montserrat du
  paquet déjà installé), puis resvg (SVG vers PNG). Essai concluant sous Bun 1.4 :
  1080 × 1080 en 2 s à froid, environ 130 Ko. Alternatives écartées :
  - capture d'une vue côté client : deux implémentations, une pour le web, une pour le
    natif, avec des rendus inégaux ;
  - service d'images tiers : il enverrait des données à un tiers, ce qui contrevient
    à l'ADR 0001 pour l'esprit et à l'ADR 0022 pour la confidentialité.
- **Servie par `server.ts`**, hors Metro, à
  `/interventions/<id>/citation/<s>/image.png`. Le module natif de resvg s'y charge
  normalement.
  - L'image Docker ne contient pas de `node_modules` : le serveur lit la citation par
    l'API déjà présente (`quotes.at`, appelée en interne sans réseau), et le module
    d'image est empaqueté au build (`bun build`). Seuls resvg (binaire natif) et quatre
    graisses de Montserrat sont copiés dans l'image.
  - En développement (`expo start`), l'image n'existe pas. Le bouton est quand même
    affiché et pointe vers le domaine de production quand il tourne sur le natif.
  - On l'essaie avec le serveur de production en local, comme le fait le smoke test.
- **Cache** :
  - `Cache-Control: public, max-age=86400` ;
  - un cache mémoire de 200 images au plus, indexé par citation, texte et minutage.
    Une citation régénérée a donc une autre clé.
- **Mise en page** (modèle « encadré », choisi sur maquettes) :
  - filet chamois ; en tête, le média et la date (la date seule pour sa chaîne), et le
    thème en pastille ;
  - au centre, un grand guillemet, la citation centrée (de 66 px pour une phrase courte
    à 40 px pour une longue), puis « DAVID LISNARD » entre deux traits ;
  - une barre de lecture : « ▶ Le passage à 10:41 », placée sur la durée de la vidéo
    (sans barre si la durée est inconnue) ;
  - en pied, « LISNARD PLAY », la mention d'indépendance et `play.projetlisnard.fr`.
- **Partage** :
  - natif : `expo-file-system` télécharge l'image dans le cache, puis `expo-sharing`
    ouvre la feuille de partage ;
  - web : `navigator.canShare({ files })`, sinon un lien de téléchargement
    (`<a download>`).

## Risks / Trade-offs

- **Module natif de resvg dans l'image Docker (Linux arm64 ou x64)** → resvg publie
  des binaires pour ces plateformes. Le smoke test produit une image et le vérifie à
  chaque CI. Repli possible : `@resvg/resvg-wasm`.
- **Coût CPU si quelqu'un demande toutes les images** → le cache mémoire et le cache
  navigateur le limitent. L'identifiant et le minutage sont validés avant tout calcul,
  et une citation inconnue répond 404 sans rendu.
- **Texte très long** → la validation limite déjà une citation à 60 mots. Au-delà de
  la place disponible, la taille du texte descend jusqu'à 40 px.
