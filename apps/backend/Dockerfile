# Official Bun image, pinned by digest (M17) so a re-pushed tag cannot change the build.
# To bump: docker buildx imagetools inspect oven/bun:<version>-slim and copy the index digest.
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS base
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

# Stage 1b: install only the workspaces this image needs
FROM base AS deps
COPY package.json bun.lock ./
COPY --from=manifests /app/apps ./apps
COPY --from=manifests /app/packages ./packages
RUN bun install --frozen-lockfile --ignore-scripts --filter './' --filter 'backend' --filter './packages/*'

# Stage 2: Build the application
FROM deps AS build
COPY . .
ENV NODE_ENV=production
# Build, then swap node_modules for a production-only install (M17): the runtime image carries
# no devDependencies. The reinstall reuses the bun cache from the deps stage.
RUN bun turbo run build --filter=backend... \
 && find . -name node_modules -type d -prune -exec rm -rf {} + \
 && bun install --frozen-lockfile --ignore-scripts --production --filter './' --filter 'backend' --filter './packages/*'

# Stage 3: Create final production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/packages ./packages
# Only the compiled server and its manifest (health reads the version from package.json); no src.
# Migrations run at boot from dist. The package.json migration scripts point at src, so a manual
# revert inside the container uses dist instead:
#   bun ./node_modules/typeorm/cli.js -d dist/data-source.js migration:revert
COPY --from=build --chown=bun:bun /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=bun:bun /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=bun:bun /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build --chown=bun:bun /app/package.json ./package.json

WORKDIR /app/apps/backend
EXPOSE 4000

USER bun

# Liveness probe for local runs and CI (Railway ignores Docker HEALTHCHECK).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s CMD ["bun", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Exec form so SIGTERM reaches the server directly.
CMD ["bun", "dist/main.js"]
