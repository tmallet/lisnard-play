## Décisions

Voir [ADR 0035](../../../../docs/decisions/0035-mesure-d-audience-umami.md) :
Umami sur l'instance de l'éditeur, web seulement, sans cookie, `data-domains`
limité à la production, `data-do-not-track`, pages vues uniquement.

## Mise en œuvre

- `apps/app/src/config/analytics.ts` : URL du script, identifiant du site, domaine.
- `apps/app/src/app/+html.tsx` : balise `<script defer>` avant la fin de `<head>`.
- `apps/app/src/app/mentions-legales.tsx` : paragraphe « mesure d'audience ».
