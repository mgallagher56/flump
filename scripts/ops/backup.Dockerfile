# Image for the Railway cron service that runs the scheduled backup (BE-03, ruling D12).
# Build context: the repository root. The owner points a cron service at
# scripts/ops/backup.railway.json, which names this file. Runbook: docs/runbooks/backup-restore.md.
#
# Holds only what backup-run.ts needs: Postgres 18 client tools (pg_dump must be at least the
# server's major version), age for encryption, and Bun. No repository secrets are baked in;
# every value comes from the service's variables at run time.
# Base images pinned by digest (BE-01, M17).
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS bun

FROM postgres:18-bookworm@sha256:ece55f7868da684e400f82f1030a050718adbdd65c23aa500c486f6e2950dc0f
RUN apt-get update \
  && apt-get install -y --no-install-recommends age ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app
COPY scripts/ops/backup-lib.ts scripts/ops/backup-run.ts scripts/ops/backup-restore.ts ./scripts/ops/

# Never run the database server here: replace the postgres image's entrypoint.
USER postgres
ENTRYPOINT []
CMD ["bun", "scripts/ops/backup-run.ts"]
