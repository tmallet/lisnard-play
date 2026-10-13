---
id: "0008"
title: Système de documentation structuré pour les agents de codage
status: accepted
date: 2026-10-13
tags: [documentation, outillage, agents]
supersedes: null
superseded-by: null
related-specs: []
related-changes: []
---

# 0008 — Système de documentation structuré pour les agents de codage

## Contexte

Le projet est développé avec des agents de codage (Claude, Codex…). Toute
décision et toute l'architecture doivent être documentées de façon structurée
et facile à exploiter. Les `design.md` d'OpenSpec sont archivés en fin de
change et ne suffisent pas comme source durable du « pourquoi ».

## Décision

- **Langue** : documentation en français. Le code et les identifiants restent
  en anglais.
- **Un type de connaissance, un emplacement** :

  | Question             | Emplacement                                   |
  |----------------------|-----------------------------------------------|
  | Par où commencer ?   | `AGENTS.md` (racine), `CLAUDE.md` → `@AGENTS.md` |
  | Comportement (quoi)  | `openspec/specs/<capability>/spec.md`         |
  | Décisions (pourquoi) | `docs/decisions/NNNN-*.md` (ADR)              |
  | Architecture         | `docs/architecture/*.md`                      |
  | Procédures           | `.agents/skills/<skill>/SKILL.md`             |
  | Règles d'un module   | `apps/*/AGENTS.md`, `packages/*/AGENTS.md`    |
  | Changements en cours | `openspec/changes/<change>/`                  |

- **ADR** : frontmatter YAML typé (`id`, `title`, `status`, `date`, `tags`,
  `supersedes`, `superseded-by`, `related-specs`, `related-changes`), modèle
  `docs/decisions/_template.md`, index `docs/decisions/README.md`. Un ADR
  accepté ne se réécrit pas : on le remplace par un nouvel ADR.
- **Skills** : sources canoniques dans `.agents/skills/` (multi-agents),
  symlinkées dans `.claude/skills/`. On crée un skill pour toute procédure
  récurrente qui ne se déduit pas du code (`record-decision`, puis `docs-sync`,
  `charte-ui`, `add-intervention-source`, `classifier-jev`, `trpc-procedure`
  au fil des besoins).
- **Contrôle** :
  - des règles OpenSpec dans `openspec/config.yaml` (ADR obligatoire pour les
    décisions des `design.md`, section « Documentation » dans `tasks.md`) ;
  - un script `docs:check` en CI (frontmatter, index, liens, symlinks), à
    créer avec le monorepo.

## Alternatives écartées

- **Décisions uniquement dans les design.md OpenSpec** : dispersées dans les
  archives, difficiles à retrouver.
- **Wiki externe** : hors du dépôt, invisible pour les agents.
- **Documentation en anglais** : écartée par choix du porteur du projet.

## Conséquences

- Chaque change OpenSpec se termine par une mise à jour de la documentation.
- Un hook d'agent (rappel en fin de tâche si du code change sans doc) pourra
  être ajouté si la doc dérive.
