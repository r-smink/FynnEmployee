# FynnEmployee production image (Railway). The SQLite database lives on a volume via DATABASE_PATH.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Build tools in case better-sqlite3 has no prebuilt binary for this Node version
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 DATABASE_PATH=/tmp/build.db
# Webpack instead of Turbopack, same as in development
RUN npx next build --webpack && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATABASE_PATH=/data/fynnemployee.db
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/database ./database
COPY --from=build /app/next.config.ts ./
EXPOSE 3000
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
