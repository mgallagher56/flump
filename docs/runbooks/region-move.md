# Runbook: move Flump to Railway EU West

Owner-executed checklist (DECISIONS round 4: OD-3 A, item 8). Path A: build a **new** EU West Postgres, restore the final dump into it, repoint `DATABASE_URL`. The old Postgres is the rollback. Everything is in `us-west2` today; the database is small (about 166 MB), so move now.

> **Config-freeze warning** (see `first-deploy-pr368.md`): any Railway variable or setting change can deploy unreleased `main`. Change variables with `--skip-deploys` or hold **Alt** when committing staged changes. Never paste connection strings or dumps into chat.

Details of the scripts are in [backup-restore.md](backup-restore.md).

## Checklist

1. [ ] **Cost guard:** raise the Railway usage hard limit to **$25** (workspace billing).
2. [ ] **Dump:** `bash scripts/ops/backup-dump.sh --owner '<id>' --age-recipient <key>`. Copy the encrypted file offsite.
3. [ ] **Staging in EU West:** create staging per `staging.md` in EU West. Set `COMMENT ON DATABASE <staging db> IS 'flump-staging';`.
4. [ ] **Restore drill into staging:** `restore-to-staging.sh` (pass criteria in backup-restore.md), then `smoke.sh staging`, then sign in. Log it in `drill-log.md`. **Do not continue until this passes.**
5. [ ] **Quiet window:** announce it. Stop backend writes by removing the active backend deployment. Take the **final dump** (step 2 again) and note its time.
6. [ ] **New EU West Postgres:** create it in production, EU West. It is a fresh database with no marker; do not use `restore-to-staging.sh` against it (that script only restores into a database marked `flump-staging`). Restore with a client 18 `pg_restore`:

   ```bash
   pg_restore --dbname "$NEW_PGURL" --no-owner --exit-on-error --single-transaction ~/flump-backups/<final>.dump
   psql "$NEW_PGURL" -X -v expected_migrations=<n> -f scripts/ops/verify-restore.sql    # expect RESULT|PASS
   psql "$NEW_PGURL" -X -v owner='<id>' -f scripts/ops/prod-counts.sql > new-counts.txt
   diff <final>.counts.txt new-counts.txt                                                 # expect no output
   ```
7. [ ] **Repoint:** set the backend `DATABASE_URL` reference to the new Postgres service (`--skip-deploys`, then commit).
8. [ ] **Move backend, web and marketing** to EU West (service settings, region). Redeploy backend.
9. [ ] **Re-test:** `bash scripts/ops/smoke.sh production`, re-run `prod-counts.sql` and diff against the final dump counts, sign in, load the dashboard.
10. [ ] **Keep the old Postgres stopped for 7 days, then delete it. Keep the final dump for 30 days.** Set `COMMENT ON DATABASE <new prod db> IS 'flump-production';`.
11. [ ] Re-enable the schedules on the new Postgres (daily and weekly backups).

## Rollback

Before step 10's 7 days are up: repoint `DATABASE_URL` back to the old Postgres service (start it first), redeploy the backend, re-run `smoke.sh production`. Data written to the new database since the move is not copied back; if the quiet window was respected the loss is nil.

## Privacy notice line (for E19)

> We host our application and database in the EU (Railway, EU West). Our sign-in provider, WorkOS, is based in the United States, so your email address and sign-in details are transferred there under the provider's standard contractual safeguards.

E19 owns the final wording and the processor list.
