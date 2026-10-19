# syntax=docker/dockerfile:1

# Multi-stage build for the Next.js app.
# Produces a small runtime image from `output: "standalone"` (next.config.ts),
# running as a non-root user.

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# deps — install dependencies once, cached on the lockfile
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# `npm ci` needs dev dependencies: the build runs TypeScript and Tailwind.
RUN npm ci

# ---------------------------------------------------------------------------
# builder — compile the app
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Keep telemetry off in CI/builds.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# The build prerenders /map, which reads the FAO/World Bank hunger data. With
# no network it falls back to the committed snapshot, so the build still works
# offline. No secrets are needed or passed at build time: LLM_API_KEY is read
# at runtime only.
RUN npm run build

# ---------------------------------------------------------------------------
# runner — minimal runtime
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as the image's built-in unprivileged user.
RUN chown -R node:node /app
USER node

# `public` is needed at runtime: it serves the country boundaries, and
# src/features/geography/server/iso-codes.ts reads the GeoJSON from disk.
COPY --from=builder --chown=node:node /app/public ./public

# standalone bundles the server plus only the modules it imports.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

# No shell, so signals (SIGTERM from `docker compose down`) reach Node directly.
CMD ["node", "server.js"]
