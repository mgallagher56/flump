# Image for the Railway cron service that runs the scheduled backup (BE-03, ruling D12).
# Build context: the repository root. The owner points a cron service at
# scripts/ops/backup.railway.json, which names this file. Runbook: docs/runbooks/backup-restore.md.
#
# Holds only what backup-run.ts needs: Postgres 18 client tools (pg_dump must be at least the
# server's major version), age for encryption, and Bun. No repository secrets are baked in;
# every value comes from the service's variables at run time.
FROM oven/bun:1.4.4-slim AS bun

FROM postgres:18-bookworm
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
