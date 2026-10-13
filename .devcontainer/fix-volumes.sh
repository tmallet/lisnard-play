#!/bin/bash
# Les volumes nommés sont créés par Docker avec root comme propriétaire :
# on les rend à l'utilisateur du conteneur (appelé via sudo au postCreate).
set -euo pipefail
for dir in /workspace/node_modules /home/dev/.bun/install/cache /home/dev/.claude /home/dev/.codex; do
  mkdir -p "$dir"
  chown -R dev:dev "$dir"
done
