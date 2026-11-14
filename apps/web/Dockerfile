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
# Launch guard (E24-T1): Railway passes the FLUMP_LAUNCH service variable only if declared here.
ARG FLUMP_LAUNCH
ARG ALLOW_INDEXING
# Release string: Railway passes the commit sha only if declared here. vite.config.mts turns it into
# VITE_APP_VERSION as "<apps/web version>+<7-char sha>". Public values only.
ARG RAILWAY_GIT_COMMIT_SHA
# Browser source maps (BE-07, L14): with the token, org and project all set, the client build
# emits hidden maps, uploads them to Sentry and deletes them, so none reach the runner stage.
# Unset: no maps, no upload. The org, project and URL are public slugs, so plain build ARGs.
# The token is a build ARG too: Railway's builder rejects `RUN --mount=type=secret` (it accepts
# cache mounts only), so a BuildKit secret cannot be used here. The ARG is declared in this build
# stage only; the runner stage below starts from `base` and copies files out, so the token is not
# in the final image or its history. It can remain in the builder's cache for this stage: use a
# Sentry organisation token limited to source map upload. Absent, the build skips upload.
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_URL
# Build, then swap node_modules for a production-only install (M17): the runtime image carries
# no devDependencies. The reinstall reuses the bun cache from the deps stage.
RUN bun run --cwd apps/web prepare \
 && SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-}" \
    bun turbo run build --filter=@flump/web... \
 && find . -name node_modules -type d -prune -exec rm -rf {} + \
 && bun install --frozen-lockfile --ignore-scripts --production --filter './' --filter '@flump/web' --filter 'marketing' --filter './packages/*'

# Stage 3: Create final production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/packages ./packages
COPY --from=build --chown=bun:bun /app/apps/web ./apps/web
COPY --from=build --chown=bun:bun /app/package.json ./package.json

WORKDIR /app/apps/web
EXPOSE 3000

USER bun

# Liveness probe for local runs and CI (Railway ignores Docker HEALTHCHECK).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s CMD ["bun", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Exec form so SIGTERM reaches the server directly. server.ts is the custom Express server (a port
# of react-router-serve plus security headers on every response and a query-free access log).
# Rollback: revert this line to ["bun", "node_modules/.bin/react-router-serve", "./build/server/index.js"]
# (@react-router/serve stays installed for one release).
CMD ["bun", "server.ts"]
