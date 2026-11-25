# Image du site (ADR 0015, 0037) : build Astro servi par Bun (pages rendues à chaque requête,
# API tRPC, images de partage). Contexte de build : racine du dépôt.
#   docker build -f apps/web/Dockerfile .
# BUN_VERSION doit rester égale à .tool-versions (vérifié par docs:check).
ARG BUN_VERSION=1.4.3

FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /repo
COPY package.json bun.lock bunfig.toml ./
COPY apps/admin/package.json apps/admin/
COPY apps/app/package.json apps/app/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/api/package.json packages/api/
COPY packages/db/package.json packages/db/
RUN bun install --frozen-lockfile
COPY . .
WORKDIR /repo/apps/web
RUN bun --bun astro build

FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
# Le code serveur est empaqueté avec ses dépendances (astro.config.ts) : seuls resvg
# (binaire natif) et les polices des images de partage restent des modules à part.
COPY --from=build /repo/apps/web/dist ./dist
COPY --from=build /repo/apps/web/server.mjs ./server.mjs
COPY --from=build /repo/node_modules/@resvg ./node_modules/@resvg
COPY --from=build /repo/node_modules/@fontsource/montserrat/package.json ./node_modules/@fontsource/montserrat/package.json
COPY --from=build /repo/node_modules/@fontsource/montserrat/files/*-normal.woff ./node_modules/@fontsource/montserrat/files/
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r = await fetch('http://localhost:' + (process.env.PORT ?? 3000) + '/api/trpc/health'); process.exit(r.ok ? 0 : 1)"
CMD ["bun", "--bun", "server.mjs"]
