# Official Bun image, pinned by digest (M17) so a re-pushed tag cannot change the build.
# To bump: docker buildx imagetools inspect oven/bun:<version>-slim and copy the index digest.
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS base
# No production-only install here yet: server.ts imports vite at the top level for dev mode, and
# vite is a devDependency. Follow-up: move the dev server behind a dynamic import, then prune.
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
RUN bun install --frozen-lockfile --ignore-scripts --filter './' --filter 'marketing' --filter './packages/*'

# Stage 2: Build the application
FROM deps AS build
COPY . .
ENV NODE_ENV=production
# Launch guard (E24-T1): Railway passes the FLUMP_LAUNCH service variable only if declared here.
ARG FLUMP_LAUNCH
ARG ALLOW_INDEXING
RUN bun run --cwd packages/ui generate && bun run --cwd apps/marketing generate && bun turbo run build --filter=marketing...

# Stage 3: Create final production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/packages ./packages
COPY --from=build --chown=bun:bun /app/apps/marketing ./apps/marketing
COPY --from=build --chown=bun:bun /app/package.json ./package.json

WORKDIR /app/apps/marketing
EXPOSE 3001

USER bun

# Liveness probe for local runs and CI (Railway ignores Docker HEALTHCHECK).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s CMD ["bun", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Exec form so SIGTERM reaches the server directly.
# server.ts installs no signal handlers and bun as PID 1 ignores SIGTERM by default,
# so a one-line preload exits cleanly on SIGTERM/SIGINT without touching app code.
CMD ["bun", "-e", "for (const s of ['SIGTERM','SIGINT']) process.on(s, () => process.exit(0)); await import('./server.ts')"]
