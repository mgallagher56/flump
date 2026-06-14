# Use official Bun image as base
FROM oven-sh/bun:1.3.5-slim AS base
WORKDIR /app

# Stage 1: Install all dependencies (development + production)
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/backend/package.json ./apps/backend/
COPY apps/marketing/package.json ./apps/marketing/
COPY apps/mobile-companion/package.json ./apps/mobile-companion/
COPY packages/app-shell/package.json ./packages/app-shell/
COPY packages/common/package.json ./packages/common/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
RUN bun install --frozen-lockfile

# Stage 2: Install only production dependencies
FROM base AS production-deps
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/backend/package.json ./apps/backend/
COPY apps/marketing/package.json ./apps/marketing/
COPY apps/mobile-companion/package.json ./apps/mobile-companion/
COPY packages/app-shell/package.json ./packages/app-shell/
COPY packages/common/package.json ./packages/common/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
RUN bun install --frozen-lockfile --production

# Stage 3: Build the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/apps/marketing/node_modules ./apps/marketing/node_modules
COPY --from=deps /app/apps/mobile-companion/node_modules ./apps/mobile-companion/node_modules
COPY --from=deps /app/packages/app-shell/node_modules ./packages/app-shell/node_modules
COPY --from=deps /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=deps /app/packages/typescript-config/node_modules ./packages/typescript-config/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY . .

# Build all workspaces
ENV NODE_ENV production
RUN bun run build

# Stage 4: Create final production image
FROM base AS runner
ENV NODE_ENV production

# Copy only production node_modules and built web app assets
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=production-deps /app/packages/app-shell/node_modules ./packages/app-shell/node_modules
COPY --from=production-deps /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=production-deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY --from=build /app/apps/web/build ./apps/web/build
COPY --from=build /app/apps/web/package.json ./apps/web/package.json

WORKDIR /app/apps/web
EXPOSE 3000

CMD ["bun", "run", "start"]
