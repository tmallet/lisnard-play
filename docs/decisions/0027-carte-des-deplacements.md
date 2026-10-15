---
id: "0027"
title: Lieu des déplacements extrait par un modèle, carte de France en SVG sans tiers, onglet « Campagne »
status: accepted
date: 2026-10-15
tags: [ia, donnees, ui, confidentialite]
supersedes: null
superseded-by: null
related-specs: [intervention-places, membership-timeline]
related-changes: [campaign-map]
---

# 0027 — Lieu des déplacements extrait par un modèle, carte de France en SVG sans tiers, onglet « Campagne »

## Contexte

On veut une carte des déplacements de David Lisnard : meetings, discours, visites,
interviews en région. Aucune donnée de lieu n'existe aujourd'hui. Le lieu figure
souvent dans le titre (« Meeting en Alsace », « à Saint-Raphaël ») mais pas toujours,
et une interview sur un plateau parisien peut parler d'une autre ville. Une carte
classique, avec des tuiles OpenStreetMap, Google ou Apple, ferait contacter un
service tiers à chaque visiteur (ADR 0022).

## Décision

- **Lieu extrait par un modèle**, à partir du titre et de la description seulement.
  - Modèle : Gemini léger via OpenRouter, comme les résumés (ADR 0021).
  - La consigne demande le lieu où l'intervention s'est tenue, exclut les plateaux et
    studios, et impose « aucun lieu » en cas de doute.
  - Le résultat est stocké en base par le worker (ADR 0017), avec le modèle et la
    version de la consigne.
- **Coordonnées par la Base adresse nationale** (service public, adresse fixe) pour
  les communes. Les régions et départements sont placés en leur centre, avec la
  mention « approximatif ».
- **Coût** : imputé sur le plafond quotidien des résumés.
- **Carte de France en SVG**, à partir des contours des régions (IGN, licence
  ouverte), simplifiés et intégrés à l'app : aux couleurs de la charte, sans service
  tiers ni traceur, sur le web comme sur mobile.
- **Plateaux parisiens exclus** de la carte : ils formeraient la majorité des points
  sans rien dire des déplacements.
- **Onglet « Campagne »** à la place d'« Adhésions » : deux vues (courbe et carte)
  plutôt qu'un cinquième onglet, que l'en-tête téléphone ne peut pas accueillir.

## Alternatives écartées

- **Recherche de noms de communes dans le titre** : gratuite, mais fausse sur « Paris
  2024 » ou « l'affaire de Nice », et aveugle aux régions (« en Alsace »).
- **Classifieur Jev** : il répond par des probabilités sur des choix fermés, pas par
  un texte libre comme un lieu.
- **Carte à tuiles** (react-native-maps, Leaflet) : zoom fin, mais service tiers à
  chaque visite et rendu hors charte.
- **Cinquième onglet** : l'en-tête web sur téléphone est déjà plein.

## Conséquences

- Un lieu peut être faux. On vérifie un échantillon avant la mise en ligne, et la
  carte précise que les lieux sont déduits des titres et descriptions.
- Changer la consigne impose d'incrémenter `PLACE_PROMPT_VERSION` : les lieux sont
  alors recalculés au fil des cycles.
- L'adresse `/adhesions` redirige vers `/campagne`.
