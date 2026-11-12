# Use official Bun image as base
FROM oven/bun:1-slim AS base
WORKDIR /app

# Stage 1a: workspace manifests only. Every workspace's package.json is needed so
# the frozen lockfile resolves, and a glob keeps this correct when workspaces are
# added (apps/*, packages/*). Everything but package.json is stripped so this layer
# only changes when a manifest changes.
FROM base AS manifests
COPY apps ./apps
COPY packages ./packages
RUN find apps packages -name node_modules -type d -prune -exec rm -rf {} + ; \
    find apps packages -type f ! -name package.json -delete ; \
    find apps packages -type d -empty -delete

# Stage 1b: install only the workspaces this image needs. Web also needs marketing:
# apps/web/vite.config.mts resolves react-helmet-async via ../marketing/package.json.
FROM base AS deps
COPY package.json bun.lock ./
COPY --from=manifests /app/apps ./apps
COPY --from=manifests /app/packages ./packages
RUN bun install --frozen-lockfile --ignore-scripts --filter './' --filter '@flump/web' --filter 'marketing' --filter './packages/*'

# Stage 2: Build the application
FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN bun run --cwd apps/web prepare && bun turbo run build --filter=@flump/web...

# Stage 3: Create final production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/package.json ./package.json

WORKDIR /app/apps/web
EXPOSE 3000

CMD ["bun", "run", "start"]
