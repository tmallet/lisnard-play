# Service d'administration (ADR 0032) : interface Refine + shadcn/ui et API, servis sous
# /admin, relayés par le serveur public. Contexte de build : racine du dépôt.
#   docker build -f apps/admin/Dockerfile .
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
WORKDIR /repo/apps/admin
RUN bunx vite build
# Serveur et commandes empaquetés : l'image finale n'a pas besoin de node_modules.
RUN bun build server.ts cli.ts --target=bun --outdir=/repo/out

FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production ADMIN_PORT=3001
COPY --from=build /repo/out ./
COPY --from=build /repo/apps/admin/dist ./dist
USER bun
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r = await fetch('http://localhost:' + (process.env.ADMIN_PORT ?? 3001) + '/admin/health'); process.exit(r.ok ? 0 : 1)"
CMD ["bun", "server.js"]
