## Context

- Jev (ADR 0004) répond à des questions vrai/faux par une probabilité ; sa clé ne vit
  que dans le worker, seul écrivain de la base (ADR 0017).
- Les citations existent depuis l'ADR 0028.
- Les adhésions sont lues sur le site du parti par l'API, avec un cache, sans copie en
  base (ADR 0026).
- L'image et la réécriture de l'en-tête suivent les ADR 0029 et 0030.

## Goals / Non-Goals

**Goals :**
- un récapitulatif fiable, sans appel au modèle à l'affichage ;
- un lien par période ;
- une publication en deux gestes.

**Non-Goals :**
- publication automatique ;
- édition du récapitulatif.

## Decisions

Décision durable consignée dans l'ADR 0031. En résumé :

- **Note par citation plutôt que choix par période** : une question Jev vrai/faux
  (« marquante ») par citation, posée une fois. Un choix parmi les citations du jour
  serait à refaire pour la semaine et à chaque nouvelle vidéo. La note sert aux deux
  périodes et à toute évolution (classement des résultats de recherche, par exemple).
  - Stockage : `quote.striking` (probabilité) et `quote.striking_version`. Une version
    de question incrémentée renote tout au fil des cycles.
  - Tâche `quotes:score` : toutes les 5 min, 25 citations au plus par cycle, silencieuse
    sans travail. Commande `score-quotes` pour l'historique.
- **Périodes** :
  - jour : date de Paris de l'intervention (même règle que la courbe) ; seules comptent les interventions qui ont eu lieu ou sont en cours (pas un direct annoncé pour plus tard) ;
  - semaine : lundi au dimanche, désignée par son lundi.
- **Données** :
  - `getRecap(db, du, au)` lit les interventions visibles, les médias, les lieux et la
    citation de plus haute note (à défaut de note, la première du jour) ;
  - l'API `recap.get` y ajoute les adhésions : total en fin de période, hausse depuis
    la veille du début, courbe (les 6 jours précédents pour un jour, la semaine et sa
    veille pour une semaine) ;
  - `recap.list` donne les 14 derniers jours avec intervention et les 6 dernières
    semaines ;
  - cache d'une minute, comme le graphique.
- **Image** : `recap-card.ts`, mise en page pure, testée, au modèle des images de
  citation :
  - courbe en SVG intégré ;
  - mini-carte des lieux à partir du fond de carte déjà intégré (ADR 0027) ;
  - servie par `server.ts`, lue par l'API interne et mise en cache comme les citations.
- **En-tête** : pour `/campagne` avec un `jour` ou une `semaine` valide, `server.ts`
  réécrit l'en-tête, avec le même code que les citations, généralisé.
- **Page** :
  - le récapitulatif est rendu en composants natifs (chiffres, médias, citation, liste
    des interventions), sans dépendre de l'image, absente sous `expo start` ;
  - vue « Récaps » dans le sélecteur de la page ;
  - « Publier sur X » réutilise l'adresse de partage de X (ADR 0030).

## Risks / Trade-offs

- **Qualité de la note** → la question est volontairement concrète : « formule forte,
  courte, reprenable telle quelle ». Un échantillon est relu après le rattrapage.
  Version incrémentée si elle change.
- **Adhésions indisponibles** (site du parti en panne) → le récapitulatif s'affiche
  sans le bloc adhésions, l'image aussi.
- **Récapitulatif d'un jour en cours** → les chiffres évoluent jusqu'à minuit, et les
  services d'aperçu gardent l'image en cache. L'adresse de l'image est versionnée par
  son contenu (nombre d'interventions, total d'adhérents, citation).
