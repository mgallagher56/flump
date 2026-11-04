# Use official Bun image as base
FROM oven/bun:1-slim AS base
WORKDIR /app

# Stage 1: Install all dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/marketing/package.json ./apps/marketing/
COPY apps/web/package.json ./apps/web/
COPY apps/backend/package.json ./apps/backend/
COPY apps/mobile-companion/package.json ./apps/mobile-companion/
COPY packages/app-shell/package.json ./packages/app-shell/
COPY packages/common/package.json ./packages/common/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
RUN bun install --frozen-lockfile --ignore-scripts

# Stage 2: Build the application
FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN bun turbo run build --filter=marketing...

# Stage 3: Create final production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/marketing ./apps/marketing
COPY --from=build /app/package.json ./package.json

WORKDIR /app/apps/marketing
EXPOSE 3001

CMD ["bun", "run", "start"]
