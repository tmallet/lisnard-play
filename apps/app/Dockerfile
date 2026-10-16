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
# Image des citations (ADR 0029) : module empaqueté, resvg (binaire natif) laissé à part.
RUN bun build src/server/quote-image.ts --target=bun --outfile=/repo/image/quote-image.js \
    --external @resvg/resvg-js
# Aperçus de partage (ADR 0030, 0031) : routes et en-têtes, empaquetés en un fichier.
RUN bun build src/server/share.ts --target=bun --outfile=/repo/image/share.js

FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Le bundle de l'API est autonome : server.ts requiert expo-server (sans dépendance) et,
# pour l'image des citations, resvg et les polices.
COPY --from=build /repo/node_modules/expo-server ./node_modules/expo-server
COPY --from=build /repo/apps/app/dist ./dist
COPY --from=build /repo/apps/app/server.ts ./server.ts
COPY --from=build /repo/apps/app/src/server/indexing.ts ./src/server/indexing.ts
COPY --from=build /repo/image/quote-image.js ./src/server/quote-image.js
COPY --from=build /repo/image/share.js ./src/server/share.js
COPY --from=build /repo/node_modules/@resvg ./node_modules/@resvg
COPY --from=build /repo/node_modules/@expo-google-fonts/montserrat/package.json ./node_modules/@expo-google-fonts/montserrat/package.json
COPY --from=build /repo/node_modules/@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf ./node_modules/@expo-google-fonts/montserrat/400Regular/
COPY --from=build /repo/node_modules/@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf ./node_modules/@expo-google-fonts/montserrat/600SemiBold/
COPY --from=build /repo/node_modules/@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf ./node_modules/@expo-google-fonts/montserrat/700Bold/
COPY --from=build /repo/node_modules/@expo-google-fonts/montserrat/800ExtraBold/Montserrat_800ExtraBold.ttf ./node_modules/@expo-google-fonts/montserrat/800ExtraBold/
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r = await fetch('http://localhost:' + (process.env.PORT ?? 3000) + '/api/trpc/health'); process.exit(r.ok ? 0 : 1)"
CMD ["bun", "server.ts"]
