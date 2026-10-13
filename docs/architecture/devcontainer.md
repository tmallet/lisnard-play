# Devcontainer

Environnement reproductible, et bac à sable pour faire travailler des agents
de codage en autonomie (ADR 0010). Fichiers : `.devcontainer/`.

```
┌──────────────────── Mac (hôte) ─────────────────────┐
│  Simulateur iOS ─┐      Navigateur ─┐               │
│                  ▼  localhost:8081  ▼  (redirigé)   │
│  ┌──────────── devcontainer (Linux) ─────────────┐  │
│  │ asdf (Bun, Node) · Metro · tests · openspec   │  │
│  │ Claude Code · Codex · pare-feu sortant        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Démarrer

- **VS Code / Cursor** : « Dev Containers: Reopen in Container ».
- **CLI** : `npx @devcontainers/cli up --workspace-folder .`, puis
  `npx @devcontainers/cli exec --workspace-folder . bash`.

Au premier démarrage :
1. `postCreateCommand` rend les volumes à l'utilisateur `dev`, puis lance
   `bun install` ;
2. `postStartCommand` active le pare-feu (à chaque démarrage).

## Contenu de l'image

| Élément | Source |
|---------|--------|
| Debian bookworm slim, utilisateur `dev` (non root) | `Dockerfile` |
| asdf, puis Bun et Node aux versions de `.tool-versions` | `asdf install` au build |
| `openspec`, `claude` (Claude Code), `codex` | `npm install -g` au build |
| `gh`, git, iptables/ipset | apt |

Pour changer une version d'outil : modifier `.tool-versions` (et
`package.json`, ce que vérifie `docs:check`), puis reconstruire le conteneur.

Dans un shell de connexion (`bash -l`), le PATH des shims asdf vient de
`/etc/profile.d/asdf.sh`.

## Volumes

| Volume | Monté sur | Pourquoi |
|--------|-----------|----------|
| `lisnard-play-node-modules-*` | `/workspace/node_modules` | Isole les binaires Linux de ceux du Mac ; Metro est bien plus rapide hors du montage macOS |
| `lisnard-play-bun-cache` | `~/.bun/install/cache` | Cache Bun partagé entre reconstructions |
| `lisnard-play-claude-*`, `lisnard-play-codex-*` | `~/.claude`, `~/.codex` | Connexion et configuration des agents conservées |

Si le montage du dépôt reste lent, utiliser « Dev Containers: Clone
Repository in Container Volume » : tout le dépôt vit alors dans un volume.

## Mobile : l'hôte se connecte à Metro dans le conteneur

Le simulateur iOS n'existe que sous macOS, et Docker sur Mac ne permet pas
l'émulateur Android. Les deux restent donc **sur l'hôte**.

- Dans le conteneur : `bun run dev`. Metro annonce `localhost`
  (`REACT_NATIVE_PACKAGER_HOSTNAME=localhost`).
- **Simulateur iOS ou émulateur Android de l'hôte** : ils joignent
  `localhost:8081` grâce à la redirection de port. Dans Expo Go, ouvrir
  `exp://localhost:8081`.
- **Le port de l'hôte doit être le même que celui du conteneur** : le manifeste
  Expo annonce `localhost:<port de Metro>`. Si le 8081 de l'hôte est déjà pris
  (un autre projet Expo, par exemple), lancer Metro sur le port de repli :
  `cd apps/app && bunx expo start --port 8082` (8082 est redirigé et autorisé par le pare-feu),
  puis ouvrir `exp://localhost:8082`.
- **Téléphone physique** : il doit joindre l'hôte par le réseau. Exporter
  `REACT_NATIVE_PACKAGER_HOSTNAME=<IP LAN du Mac>` sur l'hôte **avant** de
  démarrer le conteneur, ou utiliser `bunx expo start --tunnel` (le tunnel
  exige d'ajouter ses domaines au pare-feu).

## Pare-feu

`.devcontainer/init-firewall.sh`, lancé au démarrage :

- sortie **refusée par défaut**, IPv6 bloqué ;
- autorisés en sortie : DNS, SSH (git), réseau de l'hôte, plages IP de
  GitHub, et les domaines du tableau `ALLOWED_DOMAINS` en tête du script
  (npm, GitHub, API Anthropic et OpenAI, OpenRouter, Expo, nodejs.org) ;
- autorisés en entrée : les ports de développement `DEV_PORTS` (8081, 8082).
  Docker Desktop relaie les ports redirigés depuis une adresse extérieure au
  réseau de l'hôte ;
- idempotent : on peut le relancer à chaud (`sudo /usr/local/bin/init-firewall.sh`) ;
- **auto-vérification** : le script échoue si `example.com` est joignable,
  ou si GitHub ne l'est pas.

**Ajouter un domaine** (nouvelle API, nouvelle source d'ingestion) : l'ajouter
à `ALLOWED_DOMAINS` avec un commentaire, puis redémarrer le conteneur. Toute
modification passe par une PR. Un domaine qui ne se résout pas fait échouer
le démarrage, et c'est voulu.

Les IP sont résolues à chaque démarrage. Si un CDN change d'adresse en cours
de session, redémarrer le conteneur.

## Secrets

Aucun secret dans l'image. Les variables `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `OPENROUTER_API_KEY` et `EXPO_PUBLIC_API_URL` sont lues dans
l'environnement de l'hôte (`remoteEnv`), une par une. Pour en ajouter une, la
déclarer dans `devcontainer.json`. L'authentification git et GitHub passe par
le transfert d'identifiants de l'éditeur.

## Agents en autonomie

Dans ce conteneur, **et seulement là**, on peut lancer les agents sans
confirmation à chaque commande, par exemple
`claude --dangerously-skip-permissions` ou le mode équivalent de Codex.

Ce que le bac à sable protège :
- le système de fichiers du Mac, hors dépôt monté ;
- le réseau : seuls les domaines de la liste blanche sont joignables.

Ce qu'il ne protège **pas** :
- le dépôt monté : un agent peut modifier ou supprimer des fichiers (git
  permet de revenir en arrière) ;
- GitHub : avec les identifiants transférés, un agent peut pousser.
  La revue des PR reste le garde-fou.
- les services de la liste blanche, joignables avec les clés transmises.
