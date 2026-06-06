FROM node:22-alpine AS base

# ── deps stage: install production + dev deps ─────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder stage: generate Prisma client + build Next.js ─────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These vars are only needed at build time to satisfy prisma generate.
# Actual runtime values come from the container environment.
ARG DATABASE_URL=file:./dev.db
ARG AUTH_SECRET=build-placeholder
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true

RUN npm run build

# ── runner stage: minimal production image ────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma generated client is embedded in the standalone output; migrations
# must be run separately before starting (e.g. via an init container or
# the deploy command in your CI: `prisma migrate deploy`).

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
