## Context

- Seul le worker écrit en base, sauf les abonnements aux notifications (ADR 0017,
  0024).
- Le serveur public est `apps/app/server.ts` (ADR 0015), derrière Caddy, déployé par
  Coolify.
- L'app est en Expo et React Native (ADR 0003) : shadcn/ui, qui repose sur le DOM, ne
  peut pas s'y intégrer.
- Les résumés ne sont produits que par le worker, qui seul détient la clé Gemini
  (ADR 0021).

## Goals / Non-Goals

**Goals :**
- deux gestes sûrs (masquer, relancer) ;
- un site public qui ne gagne aucun droit d'écriture ;
- une base Refine extensible.

**Non-Goals :**
- multi-comptes ;
- rôles ;
- édition de contenu.

## Decisions

Décisions durables consignées dans l'ADR 0032. En résumé :

- **Service `apps/admin` séparé, servi sous `/admin`**.
  - `server.ts` relaie `/admin/*` vers `http://admin:<port>` sur le réseau interne
    Coolify, en transmettant la méthode, les en-têtes, le corps et les cookies, sans
    réécrire le chemin.
  - Le service admin n'a pas de domaine public.
  - Alternative écartée : tout héberger dans `server.ts`, qui donnerait des droits
    d'écriture au processus public.
  - Autre alternative écartée : un sous-domaine, contraire au choix du porteur
    du projet.
- **Base** :
  - un rôle Postgres `lisnard_admin` (`ADMIN_DATABASE_URL`), avec des droits limités :
    - lecture des contenus ;
    - mise à jour des seules colonnes de modération et de demande de résumé de `item` ;
    - écriture des tables de Better Auth et du journal.
  - Un point d'entrée `@lisnard/db/admin` réunit ces écritures ; `write` reste au worker.
- **Modération** :
  - colonnes `item.hidden_at` et `item.hidden_reason`, hors de la classification,
    qu'aucun reclassement ne touche ;
  - `visibleItem` (lecture) et les sélections du worker (résumés, notes, notifications,
    lieux) excluent `hidden_at is not null`.
- **Relance du résumé** :
  - colonne `item.summary_requested_at` ;
  - le worker prend en priorité les vidéos demandées, en ignorant la version et les
    tentatives, et remet la marque à zéro en enregistrant le résumé, ou à l'abandon
    après ses tentatives ;
  - état affiché :
    - « demandé » tant que la marque existe ;
    - « fait » si le résumé est postérieur à la demande ;
    - « en échec » sinon.
- **Journal** : table `admin_action` (date, action, `item_id`, motif), en ajout seul.
- **Authentification : Better Auth** :
  - extensions `emailAndPassword` (`disableSignUp`) et `twoFactor` (TOTP, codes de
    secours) ;
  - adaptateur Drizzle, tables préfixées `auth_` ;
  - cookie `Path=/admin`, `HttpOnly`, `Secure`, `SameSite=Strict` ;
  - limitation de fréquence intégrée ;
  - TOTP obligatoire : toute route d'administration exige une session dont la double
    authentification est vérifiée ; sans TOTP associé, seule la page d'association est
    accessible ;
  - commande `bun admin create-account` (adresse, mot de passe saisi au terminal) ;
  - commande `reset-2fa` en dernier recours.
- **API d'administration** :
  - un routeur tRPC dans le service admin, chaque procédure vérifiant la session ;
  - Refine le consomme par un fournisseur de données sur mesure (`getList`, `getOne`,
    et des actions personnalisées).
- **Interface** :
  - Vite, React, Refine 5 (routeur React Router) avec **Refine UI**, son intégration
    shadcn/ui officielle (registre `ui.refine.dev`) : mise en page avec barre latérale
    et menu tiré des ressources, vues liste, tableau de données (`@refinedev/react-table`)
    avec filtres de colonnes et pagination ; libellés en français par le fournisseur de
    traduction de Refine ;
  - construite au build de l'image et servie par le service admin ;
  - en anglais dans le code, en français à l'écran.
- **Indexation** : `X-Robots-Tag: noindex` sur tout `/admin`, et `robots.txt` du site
  avec `Disallow: /admin` même quand l'indexation est activée.

## Risks / Trade-offs

- **Relais `/admin` dans `server.ts`** → c'est une seule route, sans logique. Si le
  service admin est arrêté, `/admin` répond 503 et le site public n'est pas affecté.
- **Perte du téléphone** → codes de secours, sinon `reset-2fa` en ligne de commande.
- **Même origine que le site** → le cookie est limité à `/admin` et en
  `SameSite=Strict`. Le site public ne charge aucun script tiers ; les lecteurs vidéo
  sont des iframes isolées.
- **Versions de Refine et de son intégration shadcn/ui** → à épingler au moment de
  l'implémentation, après lecture de leur documentation à jour.

## Migration Plan

1. Migration : colonnes, tables d'auth et journal, rôle `lisnard_admin` créé par
   l'exploitant (requête fournie dans le guide).
2. Déployer le service admin, puis l'app (relais).
3. Lancer `create-account` dans le terminal du service admin, puis se connecter et
   associer le TOTP.
