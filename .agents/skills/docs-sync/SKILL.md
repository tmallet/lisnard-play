---
name: docs-sync
description: Mettre la documentation en cohérence avec le code avant de conclure une tâche. À utiliser à la fin de toute tâche qui modifie du code, de la configuration, des dépendances ou des conventions, et avant d'archiver un change OpenSpec. Indique quelle doc mettre à jour selon les fichiers touchés, puis fait lancer bun run check.
---

# Synchroniser la documentation

Une tâche n'est terminée que si la doc décrit le code livré (ADR 0008). Tout
est rédigé en français.

## 1. Lister ce qui a changé

```bash
git status --short && git diff --stat main...HEAD
```

## 2. Appliquer la table de correspondance

| Fichiers touchés | Doc à vérifier / mettre à jour |
|------------------|--------------------------------|
| Nouveau module, dossier ou flux entre modules | `docs/architecture/README.md` (arborescence, flux) |
| `package.json` (scripts), CI, `.env.example`, `bunfig.toml` | `docs/architecture/commandes.md` |
| `apps/app/**` (routes, conventions, structure) | `apps/app/AGENTS.md` |
| `packages/api/**` (structure, conventions) | `packages/api/AGENTS.md`, skill `trpc-procedure` si la procédure change |
| `apps/app/src/global.css`, composants `Title`/`Footer`, règles visuelles | skill `charte-ui` |
| `.devcontainer/**`, `.tool-versions` | `docs/architecture/devcontainer.md`, ADR 0010 si le principe change |
| Nouveau package `apps/*` ou `packages/*` | son propre `AGENTS.md` + `AGENTS.md` racine + architecture |
| Nouveau skill | `.agents/skills/<nom>/SKILL.md` + symlink `.claude/skills/<nom>` + liste dans `AGENTS.md` racine |
| Décision durable (choix de techno, règle, valeur structurante) | ADR via le skill `record-decision` |
| Décision qui contredit un ADR accepté | nouvel ADR qui le remplace (`supersedes`), jamais de réécriture |
| Comportement observable modifié | spec OpenSpec du change en cours (`openspec/changes/<change>/specs/`) |
| Contexte global changé (stack, périmètre) | `openspec/config.yaml` (`context`) et `AGENTS.md` racine |

Symlink d'un nouveau skill :

```bash
ln -s ../../.agents/skills/<nom> .claude/skills/<nom>
```

## 3. Règles d'écriture

- Décrire l'état **actuel**, pas l'historique : l'historique est dans git et les ADR.
- Citer les ADR par leur numéro (« ADR 0004 ») plutôt que recopier leur contenu.
- Donner des chemins exacts et des commandes copiables.
- Supprimer ce qui devient faux plutôt que l'annoter.

## 4. Vérifier

```bash
bun run check
```

`docs:check` y est inclus. Il contrôle le frontmatter et l'index des ADR, les
liens relatifs, les symlinks des skills et la cohérence des versions d'outils.
Corriger toute erreur avant de conclure.
