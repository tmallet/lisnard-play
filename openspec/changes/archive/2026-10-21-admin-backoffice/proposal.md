## Why

Aujourd'hui, retirer une vidéo publiée à tort ou refaire un résumé raté demande une
intervention en base ou en ligne de commande sur le serveur. Il faut un backoffice
réservé à l'exploitant, sûr, pour ces deux gestes courants, et qui servira de base aux
suivants : fusion des noms de médias, correction d'un lieu.

## What Changes

- **Backoffice à `play.projetlisnard.fr/admin`**, servi par un service séparé
  (`apps/admin`) que le serveur public relaie par le réseau interne. Le site public
  reste sans droit d'écriture sur les contenus.
- **Un seul compte**, créé par une commande, sans inscription possible. Connexion par
  mot de passe puis code TOTP (application d'authentification), avec codes de secours,
  par Better Auth.
- **Vidéos** :
  - liste avec recherche et filtres (visibles, masquées, résumé en échec) ;
  - « Masquer » et « Réafficher », avec un motif facultatif : une vidéo masquée
    disparaît partout (flux, détail, recherche, citations, récapitulatifs, carte, plan
    du site, notifications) ;
  - « Relancer le résumé » : le worker le refait au cycle suivant, avec citations et
    notes, dans la limite du plafond du jour ; l'état de la demande est affiché.
- **Historique** des actions, en lecture seule.
- **Interface** : Refine avec shadcn/ui (React pour navigateur), indépendante de l'app
  Expo.
- Nouvel ADR 0032 : service d'administration, authentification, exception à la
  frontière d'écriture (ADR 0017).

## Capabilities

### New Capabilities

- `admin-backoffice` : accès sécurisé, masquage, relance du résumé, historique.

### Modified Capabilities

Aucune exigence existante ne change de texte ; la règle « masquée = invisible partout »
est portée par la nouvelle capability et appliquée par la condition de visibilité
commune.

## Hors périmètre

- Plusieurs comptes, rôles, inscription, mot de passe oublié par courriel.
- Code par courriel ou SMS.
- Autres actions (médias, lieux, citations à la main) : changes suivants.
- Modification du texte d'un résumé ou d'une citation.

## Impact

- Nouveau service `apps/admin` :
  - serveur Bun : Better Auth (extension `twoFactor`) et routeur d'administration ;
  - interface Refine + shadcn/ui ;
  - image Docker et service Coolify.
- `packages/db` :
  - colonnes de modération de `item` et demande de résumé ;
  - tables de Better Auth et journal des actions ;
  - point d'entrée `@lisnard/db/admin` ;
  - condition de visibilité étendue.
- `apps/app` : `server.ts` relaie `/admin/*` ; `robots.txt` exclut `/admin`.
- `apps/worker` : vidéos masquées ignorées (résumés, notes, notifications, lieux) ;
  demandes de résumé prises en priorité.
- Exploitation : un rôle Postgres dédié au service admin ; variables `BETTER_AUTH_SECRET`
  et `ADMIN_DATABASE_URL`, réservées au service admin.
