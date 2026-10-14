# Image de l'app (ADR 0015) : export web Expo servi par Bun (pages pré-rendues + API tRPC).
# Contexte de build : racine du dépôt.  docker build -f apps/app/Dockerfile .
# BUN_VERSION doit rester égale à .tool-versions (vérifié par docs:check).
ARG BUN_VERSION=1.4.3

FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /repo
COPY package.json bun.lock bunfig.toml ./
COPY apps/app/package.json apps/app/
COPY apps/worker/package.json apps/worker/
COPY packages/api/package.json packages/api/
COPY packages/db/package.json packages/db/
RUN bun install --frozen-lockfile
COPY . .
WORKDIR /repo/apps/app
RUN bun --bun expo export --platform web

FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Le bundle de l'API est autonome : seul expo-server (sans dépendance) est requis par server.ts.
COPY --from=build /repo/node_modules/expo-server ./node_modules/expo-server
COPY --from=build /repo/apps/app/dist ./dist
COPY --from=build /repo/apps/app/server.ts ./server.ts
COPY --from=build /repo/apps/app/src/server/indexing.ts ./src/server/indexing.ts
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r = await fetch('http://localhost:' + (process.env.PORT ?? 3000) + '/api/trpc/health'); process.exit(r.ok ? 0 : 1)"
CMD ["bun", "server.ts"]
