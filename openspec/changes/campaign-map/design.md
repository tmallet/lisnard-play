## Context

Motivation : `proposal.md`. Décision durable : ADR 0027 (lieu extrait par un modèle,
carte SVG sans tiers, onglet « Campagne »). On réutilise le client OpenRouter et le
plafond de dépense des résumés (ADR 0021), le graphique SVG (ADR 0026) et la
frontière d'écriture (ADR 0017).

Données locales au 15 octobre 2026 : 218 interventions publiées, dont environ 10
meetings ou discours avec un lieu explicite dans le titre (Alsace, Saint-Raphaël,
Bayeux, Cannes), et une majorité de plateaux et d'extraits sans lieu pertinent.

## Goals / Non-Goals

**Goals :**
- une carte fidèle des déplacements, sans faux lieu ;
- aucun service tiers côté visiteur ;
- un coût négligeable et borné.

**Non-Goals :** voir « Hors périmètre » dans la proposition.

## Decisions

### D1 — Données

`item.place` (jsonb, nullable, migration 0010) :

```
{ onSite: boolean,               // déplacement hors studio ?
  label: string | null,          // « Saint-Raphaël (Var) », « Alsace »
  city: string | null,           // commune (BAN), si trouvée
  lat: number | null, lon: number | null,
  approximate: boolean,          // centre de région ou de département
  model, promptVersion, generatedAt, cost }
```

- `null` signifie « pas encore traité ».
- Un objet avec `onSite: false` signifie « traité, aucun lieu ».
- Les coordonnées absentes signifient « hors de France ou introuvable ».

### D2 — Extraction (worker, `src/places/`)

- **Consigne** (`prompt.ts`, `PLACE_PROMPT_VERSION`) : à partir du titre, du média
  et de la description, en français, répondre en JSON selon un `json_schema`.
  - Champs : `on_site`, `city` (commune, ou ville principale de la zone),
    `department`, `precision` (`city`, `department`, `region`, `country`, `none`).
  - Consignes explicites :
    - le lieu de l'intervention, pas le sujet ;
    - les plateaux et studios donnent `on_site: false` ;
    - en cas de doute, `none`.
- **Modèle** : `SUMMARY_MODEL`, Gemini léger via OpenRouter, avec la même gestion
  d'erreurs que les résumés. `SummaryServiceUnavailable` arrête le cycle sans
  compter d'échec.
- **Coût** : ajouté au journal `summary_spend` du jour, avec contrôle du plafond
  avant chaque appel (ADR 0021).
- **Tâche `places`** : toutes les 5 minutes, par lots de 20.
  - Elle traite les interventions publiées, visibles et non reprises, dont le lieu
    est absent ou dont la version de consigne a changé.
  - Elle est silencieuse quand il n'y a rien à faire.
  - L'historique est traité ainsi au fil des cycles.

### D3 — Géolocalisation (Base adresse nationale)

- **Commune** : `https://api-adresse.data.gouv.fr/search/?q=<lieu>&type=municipality&limit=1`.
  Le résultat est retenu si son score dépasse 0,6. On garde le nom de la commune, le
  département et les coordonnées.
- **Région ou département** : le modèle donne la ville principale de la zone
  (« en Alsace » → Strasbourg), géolocalisée comme une commune et marquée
  `approximate: true`. Les anciennes régions sont ainsi couvertes sans table de
  centres à maintenir.
- **Requête** : la commune seule, avec `limit=5`. Ajouter le département à la
  requête fait chuter le score. Le département sert ensuite à départager les
  homonymes, grâce au champ `context` de la réponse.
- **Pays étranger, ou rien de trouvé** : lieu gardé sans coordonnées.
- **Sécurité** : appel par le `fetch` du worker, vers une adresse fixe. Le lieu
  extrait n'est qu'un paramètre de requête, jamais une URL : pas de risque de SSRF
  (ADR 0017).

### D4 — API

`campaign.places` renvoie les lieux regroupés :

```
[{ key, label, city, lat, lon, approximate,
   interventions: [{ id, title, day, outlet, thumbnailUrl }] }]
```

- Regroupement par coordonnées identiques.
- Ordre : du plus grand nombre d'interventions au plus petit.
- Cache d'une minute, comme pour le graphique.
- Lecture `listPlaces` dans `@lisnard/db/read` : interventions visibles, non
  reprises, avec coordonnées.

### D5 — Carte (app)

- **Fond** : `assets/france-map.json`, avec les contours des régions
  simplifiés (Admin Express, IGN, licence ouverte 2.0, environ 40 Ko).
  - Il est précalculé en chemins SVG et projeté par un script
    (`scripts/build-france-map.ts`), pour ne rien projeter à l'exécution.
  - Projection équirectangulaire corrigée de la latitude moyenne, suffisante à
    l'échelle de la France et reproductible sans dépendance.
  - Encarts : Guadeloupe, Martinique, Guyane, La Réunion, Mayotte.
- **Repères** :
  - cercle chamois, rayon de 5 à 14 px selon la racine du nombre d'interventions ;
  - contour pointillé pour un lieu approximatif ;
  - toucher : carte de la liste sous la carte, comme `TimelineCard`.
- **Lieux proches qui se recouvrent** : le plus grand est dessiné en dernier, donc
  par-dessus. Le toucher sélectionne le lieu le plus proche du doigt.
- **Charte** : régions en `bleu` avec contours `blanc/15`, sans aucun visuel du parti.
- **Mention** sous la carte : « Lieux déduits des titres et descriptions ;
  les plateaux de télévision et de radio ne sont pas comptés. »

### D6 — Onglet « Campagne »

- **Route** : `src/app/(tabs)/campagne.tsx`, avec un sélecteur à deux segments,
  « Adhésions » et « Déplacements ».
  - La vue est lue et écrite dans le paramètre `vue` (`useLocalSearchParams`,
    `router.setParams`).
  - La vue « Adhésions » reprend le contenu actuel, extrait dans un composant
    `MembershipView`.
- **Redirection** : `src/app/(tabs)/adhesions.tsx` est retirée des onglets
  (`NAV_ITEMS` : `campagne`, « Campagne »). Une route `src/app/adhesions.tsx`
  redirige vers `/campagne` avec `<Redirect>`, sur le web comme dans l'app.
- **Icônes** : `flag` / `flag.fill` (SF Symbols), `flag` (Material).

## Risks / Trade-offs

- **[Faux lieux]** : la consigne force « aucun lieu » en cas de doute. Avant de
  merger, on vérifie un échantillon d'une trentaine d'interventions (lieu attendu
  contre lieu obtenu), noté dans `tasks.md`.
- **[Homonymes de communes]** (Saint-Denis…) : le département renvoyé par le
  modèle est ajouté à la requête BAN quand il est connu.
- **[Coût]** : environ 0,0001 $ par intervention sur du texte court. Le plafond
  quotidien borne le tout.
- **[Poids du fond de carte]** : environ 40 Ko, chargé avec la page « Campagne »
  uniquement.

## Migration Plan

1. Merger. La migration 0010 s'applique au démarrage du worker, puis la tâche
   `places` traite l'historique en quelques cycles.
2. La vue « Déplacements » affiche « aucun déplacement pour l'instant » tant que
   rien n'est traité.
