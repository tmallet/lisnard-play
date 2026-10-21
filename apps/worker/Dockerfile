# Image du worker (ADR 0015) : collecte, classification, publication. Seule l'adresse de
# rappel WebSub est exposée, et seulement si elle est configurée (ADR 0023).
# Contexte de build : racine du dépôt.  docker build -f apps/worker/Dockerfile .
# BUN_VERSION doit rester égale à .tool-versions (vérifié par docs:check).
ARG BUN_VERSION=1.4.3

FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /repo
COPY package.json bun.lock bunfig.toml ./
COPY apps/admin/package.json apps/admin/
COPY apps/app/package.json apps/app/
COPY apps/worker/package.json apps/worker/
COPY packages/api/package.json packages/api/
COPY packages/db/package.json packages/db/
RUN bun install --frozen-lockfile
COPY . .
# Un seul fichier par point d'entrée : aucune dépendance à installer dans l'image finale.
RUN cd apps/worker && bun run build

FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production MIGRATIONS_DIR=/app/drizzle HEARTBEAT_FILE=/tmp/lisnard-worker-heartbeat
COPY --from=build /repo/apps/worker/dist ./
COPY --from=build /repo/packages/db/drizzle ./drizzle
USER bun
EXPOSE 8080
# Sain si la boucle a battu dans les 5 dernières minutes.
HEALTHCHECK --interval=60s --timeout=5s --start-period=120s --retries=3 \
  CMD bun -e "const s = await Bun.file(process.env.HEARTBEAT_FILE).stat().catch(() => null); process.exit(s && Date.now() - s.mtimeMs < 300000 ? 0 : 1)"
CMD ["bun", "index.js"]
