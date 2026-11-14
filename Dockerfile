FROM oven/bun:1-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists
RUN mkdir -p public

# Build Next.js app
RUN bun run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# The trips scripts (cutover copy, booking import) and the files they import.
# Bun runs them as they are. Next bundles `postgres` into its chunks, so the
# package comes over on its own (it has no dependencies).
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/scripts/trips ./scripts/trips
COPY --from=builder /app/lib/trips/schema.ts /app/lib/trips/copy.ts /app/lib/trips/import.ts /app/lib/trips/types.ts ./lib/trips/

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
