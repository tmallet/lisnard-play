## Context

Motivation et périmètre : `proposal.md`. Décision durable : ADR 0026 (données
d'adhésion du parti, lues avec un cache et sans copie en base).

Sources observées le 15 octobre 2026 :
- `https://adherent.unenouvelleenergie.fr/donnees/adherents.json` renvoie
  `{ adherents, mis_a_jour, source }`, avec `Cache-Control: public, max-age=60` et
  `Access-Control-Allow-Origin: *` ;
- `…/donnees/adherents/historique.json` renvoie
  `{ depuis, mis_a_jour, jours: [{ jour, adherents }] }`, un point par jour depuis le
  1er janvier 2026, soit environ 11 Ko, mis à jour vers 3 h UTC.

La base locale compte 218 interventions publiées depuis le 31 mars, dont 183 de la
chaîne officielle, avec au plus 5 vidéos officielles et 18 interventions par jour.

## Goals / Non-Goals

**Goals :**
- toutes les interventions visibles sur la courbe, avec la miniature des vidéos
  officielles ;
- au plus une requête vers la source toutes les 90 secondes ;
- page utilisable sur téléphone comme sur ordinateur.

**Non-Goals :** voir « Hors périmètre » dans la proposition.

## Decisions

### D1 — Lecture et cache (packages/api)

- **Module** : `src/membership/source.ts`.
  - Les adresses ont une base configurable, `MEMBERSHIP_SOURCE_URL` (par défaut,
    l'adresse du parti), pour que les tests et le smoke test pointent vers des
    fixtures.
  - Un `fetch` de 5 s au plus par fichier.
  - Validation zod des deux réponses : nombres positifs, dates ISO, jours au format
    `AAAA-MM-JJ`.
- **Cache** : en mémoire, sur `globalThis` pour survivre aux rechargements de
  développement (ADR 0019). Il expire après 90 secondes.
  - Une seule requête est en vol à la fois : les appels simultanés attendent la même
    promesse.
  - En cas d'échec, la dernière valeur valide est servie avec `stale: true`. Le
    prochain essai a lieu après 30 secondes, pour ne pas solliciter une source en
    panne à chaque visite.
- **Pas d'écriture en base** : la frontière d'écriture (ADR 0017) est respectée.

### D2 — Interventions de la période (packages/db)

- **Lecture** : `listTimelineItems(db)` dans `read.ts` renvoie, pour chaque
  intervention publiée et dotée d'un rendu : `id`, `day` (date de début ou de
  publication, en jour de Paris), `title`, `outlet`, `thumbnailUrl`, `official` et
  `live`.
- **Ordre** : chronologique.
- **Volume** : environ 220 lignes, soit quelques dizaines de Ko.
- **Source officielle** : `official` vient d'une colonne `source.official` (migration
  0008), recopiée par le worker depuis `sources.config.ts` au démarrage, comme le
  reste de la table `source`. L'API ne dépend ainsi pas de la configuration du worker.

### D3 — Procédure `membership.timeline`

```
{
  total: { members, updatedAt } | null,
  days: [{ day, members }],        // de la 1re intervention à aujourd'hui (Paris)
  interventions: [...],            // D2
  stale: boolean,                  // dernière valeur valide servie après un échec
  source: 'Nouvelle Énergie'
}
```

- **Jours** : l'historique est coupé au jour de la plus ancienne intervention. Le jour
  en cours est ajouté avec le total en direct s'il manque dans l'historique.
- **Fuseau horaire** : la source ne le précise pas. Son historique est recalculé vers
  3 h UTC (5 h à Paris), ce qui correspond à la clôture d'une journée française. On
  retient donc le jour de Paris pour les deux séries (`listTimelineItems`, `parisDay`).
  Un décalage éventuel ne déplacerait un repère que d'un jour.

### D4 — Graphique (apps/app)

- **Dépendance** : `react-native-svg`, ajoutée par `bunx expo install`. Elle dessine
  la courbe, l'aire, la grille et les étiquettes de mois, sur le web comme sur mobile.
- **Échelle** : 24 px par jour, ajustée pendant l'implémentation : à 10 px, les ronds
  de 22 px se chevauchaient d'un jour à l'autre. La largeur est
  `max(largeur visible, jours × 24)`.
  Une `ScrollView` horizontale, ouverte en fin de période (`scrollToEnd` après la mise
  en page), sert de conteneur.
- **Hauteur et axe vertical** : environ 280 px de hauteur. L'axe vertical part d'un
  minimum arrondi sous la plus petite valeur, pour ne pas écraser la courbe. Ses
  étiquettes (par exemple « 40 k ») sont fixées à gauche, hors du défilement.
- **Repères** : des vues positionnées par-dessus le SVG, plus simples à toucher et à
  styliser que du SVG.
  - Vidéo officielle : rond de 22 px avec la miniature YouTube en petite taille
    (`default.jpg`, environ 4 Ko) et un liseré chamois.
  - Autre intervention : point chamois de 8 px.
  - Direct : liseré émeraude.
  - Même jour : empilement vertical au-dessus du point de la courbe, au pas de la
    taille du repère, le plus récent en haut. Au-delà de 5 repères, les vidéos
    officielles restent visibles en priorité ; le reste forme un repère « +N », qui
    affiche la liste du jour (une journée a compté 18 interventions). Le calcul se
    fait dans une fonction pure, `layoutTimeline`, testée à part.
- **Carte** : sous le graphique, avec la miniature, le titre, le média, la date, le
  total ce jour-là et un lien « Voir l'intervention » (pour « +N », la liste des
  interventions du jour). Elle se met à jour au toucher, et au survol sur le web. Avant
  toute sélection, une indication invite à toucher un repère.
- **En-tête de page** : total en grand, « mis à jour à … », « Source : Nouvelle
  Énergie ».
  - Si les données datent d'une valeur de repli : « données du … (source
    momentanément indisponible) ».
  - Sous le titre, la phrase de prudence sur la corrélation.
- **Charte** : courbe et aire en chamois sur le dégradé, sans visuel du parti
  (ADR 0001).

### D5 — Navigation

- **Onglet** : `NAV_ITEMS` reçoit `adhesions` (« Adhésions », icônes
  `person.3` / `group`), entre « Accueil » et « À propos ».
- **Route** : `src/app/(tabs)/adhesions.tsx`, pré-rendue comme les autres pages
  (ADR 0011). Les données arrivent côté client.

## Risks / Trade-offs

- **[Source non documentée]** : un changement de format est rattrapé par la validation
  zod (repli sur la dernière valeur, puis message). Sa disparition ferait perdre le
  graphique. C'est assumé (ADR 0026).
- **[Fuseau du « jour »]** : à vérifier (D3).
- **[Poids des miniatures]** : environ 180 × 4 Ko, soit 0,7 Mo au plus, chargés par
  le navigateur à l'affichage. Acceptable. Un chargement différé pourra suivre si
  besoin.
- **[Lecture abusive de la corrélation]** : la phrase de prudence et l'absence de tout
  calcul d'« effet » la limitent.

## Migration Plan

Merger, puis le déploiement automatique s'en charge. La migration 0008 (colonne
`source.official`) s'applique au démarrage du worker. Avant elle, `official` vaut
`false` : la page fonctionne, sans miniature.
