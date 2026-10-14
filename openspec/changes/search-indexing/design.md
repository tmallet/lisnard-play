## Context

Motivation : voir `proposal.md`. Les pages sont pré-rendues au build (ADR 0011)
et servies par `apps/app/server.ts` (adaptateur Bun d'expo-server, ADR 0015).

## Goals / Non-Goals

**Goals :** bloquer l'indexation par défaut et la débloquer par configuration, à
l'exécution.

**Non-Goals :** voir « Hors périmètre » dans la proposition.

## Decisions

### D1 — Blocage au niveau du serveur, à l'exécution

- **Choix** : en-tête HTTP `X-Robots-Tag` et `robots.txt` servis par
  `server.ts`, selon `ALLOW_INDEXING` lu au démarrage.
- *Alternative écartée* : une balise `<meta name="robots">` dans `+html.tsx`.
  Elle serait figée au build, ce qui imposerait de reconstruire l'image pour
  changer d'avis. Elle ne couvre pas non plus les réponses de l'API ni les
  fichiers statiques.

### D2 — Les deux mécanismes

- **`robots.txt`** : seul, il n'empêche pas l'indexation d'une URL découverte
  par un lien externe ; il empêche seulement son exploration.
- **`X-Robots-Tag`** : il garantit l'absence d'indexation, mais seulement pour
  les pages explorées.
- **Les deux ensemble** couvrent le cas courant. Au lancement public, on retire
  les deux en même temps.

### D3 — Valeur stricte

Seule la valeur exacte `true` active l'indexation. Toute autre valeur, y compris
une faute de frappe, la laisse bloquée : on préfère l'erreur dans le sens du
blocage.

## Risks / Trade-offs

- **[Pages déjà indexées]** si le site a été exposé avant ce change → rien n'est
  encore déployé, donc aucun risque.
