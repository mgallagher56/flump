# Runbook: backups, restore drill and recovery

Owner-executed. Commands are for macOS zsh, from a clean clone at the repo root. Owner-only values (`PGURL`, `STAGING_PGURL`, storage keys, the age identity, owner id) stay in your shell or the Railway service's variables: **never paste connection strings, keys, dumps or tokens into chat or to an agent.** Agents only ever see counts files and script summaries.

One-time setup (storage, keys, cron service, heartbeat, PITR) is in [`docs/audit/backend-2026-11/OWNER-SETUP.md`](../audit/backend-2026-11/OWNER-SETUP.md).

| Script                                | What it does                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `scripts/ops/backup-run.ts`           | Scheduled backup: snapshot-consistent dump plus fingerprint, encrypted with age, uploaded, heartbeat ping     |
| `scripts/ops/backup-restore.ts`       | Restore: download, decrypt, check the dump's sha256, `pg_restore`, then compare every table with the manifest |
| `scripts/ops/restore-fingerprint.sql` | Verification query set: `schema.table                                                                         | rows | checksum` per table plus the migrations count (psql only) |
| `scripts/ops/verify-restore.sql`      | Structural checks: tables present, migrations count, sequences ahead of their columns                         |
| `scripts/ops/backup-dump.sh`          | Manual dump from your Mac through a Railway tunnel (section 2)                                                |
| `scripts/ops/restore-to-staging.sh`   | Restore a manual dump into staging (section 5)                                                                |
| `scripts/ops/restore-drill.sh`        | Restore a manual dump into local Docker and write `prod-counts.sql` output                                    |

Tools on your Mac: `pg_dump`, `pg_restore`, `psql` client 18 or newer (`brew install libpq`, then `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`), `age` (`brew install age`), Docker, Bun.

## Targets

| Phase         | RPO                                                | RTO                                          |
| ------------- | -------------------------------------------------- | -------------------------------------------- |
| Private beta  | 24 h (nightly encrypted backup, Railway snapshots) | 2 h (restore plus verify, done by the owner) |
| Public launch | 5 min (PITR enabled)                               | 2 h                                          |

Drill targets: `restore_seconds` under 30 minutes; newest backup at most 26 h old at drill time.

> **Argv exposure:** the manual shell scripts pass connection URLs to `psql`, `pg_dump` and `pg_restore` as command-line arguments, so other local users can see them in `ps`. Run them on your own Mac only, never on a shared machine. The scripts never print URLs and show tool errors with URLs removed.

## 1. Scheduled backups (the cron service)

A Railway cron service built from `scripts/ops/backup.Dockerfile` (config: `scripts/ops/backup.railway.json`) runs `bun scripts/ops/backup-run.ts` every night at 02:30 UTC. Each run:

1. Opens one `REPEATABLE READ READ ONLY` transaction on the database and exports its snapshot.
2. Fingerprints every table in that snapshot: row count and an order-independent checksum of every row (`restore-fingerprint.sql` computes the same thing), plus the `migrations` row count.
3. Runs `pg_dump --format=custom --no-owner --snapshot=<that snapshot>`, so the dump and the fingerprint describe exactly the same data even while the app keeps writing.
4. Checks the dump with `pg_restore --list` (one `TABLE DATA` entry per table).
5. Writes a manifest (fingerprint, dump sha256 and size, server version), encrypts dump and manifest with age to every key in `BACKUP_AGE_RECIPIENTS`, and uploads `flump-prod-<stamp>.dump.age` then `flump-prod-<stamp>.manifest.json.age`. The manifest goes last: a backup without a manifest is incomplete and the restore ignores it.
6. Pings `BACKUP_HEARTBEAT_URL`. A missed ping is the alert (`uptime-and-alerts.md`, "Backup heartbeat"). On failure it pings `BACKUP_HEARTBEAT_FAIL_URL` with a one-line reason and exits 1.

It refuses (exit 2, nothing dumped) without an age recipient: nothing is ever uploaded unencrypted. It prints sizes, counts, seconds and object names only. Retention is a lifecycle rule on the bucket (35 days), not the script, so the script needs no delete permission.

To run the same backup by hand (for example before an irreversible migration):

```bash
read -s 'BACKUP_DATABASE_URL?tunnel URL (railway connect Postgres --tunnel-only): ' && export BACKUP_DATABASE_URL; echo
export BACKUP_DESTINATION='s3://<bucket>/flump/prod'   # or file:///Users/<you>/flump-backups
export BACKUP_AGE_RECIPIENTS='age1...,age1...'
export BACKUP_LABEL='pre-be05'
# plus S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY for s3://
bun scripts/ops/backup-run.ts
```

Every variable is listed in `scripts/ops/backup.env.example`.

## 2. Manual dump through a tunnel (fallback)

Use when the cron service is not set up yet, or for a plaintext local copy.

```bash
railway connect Postgres --tunnel-only      # in a second terminal; copy the URL it prints into PGURL below
read -s 'PGURL?tunnel URL: ' && export PGURL; echo
bash scripts/ops/backup-dump.sh --owner '<your WorkOS user id>' [--age-recipient age1...]
```

It writes to `~/flump-backups` (a directory the script creates is `0700`; files are `0600`): `flump-prod-<stamp>.dump` (`pg_dump --format=custom --no-owner`), `.schema.sql`, `.counts.txt` (with `--owner`; `prod-counts.sql` taken just before the dump, not atomic with it), `.sha256`, and `.dump.age` (with `--age-recipient`; **upload only this one**). It prints `dump_seconds`, `dump_bytes` and `table_data_entries`. The dump holds financial data, encrypted bank tokens and PAT hashes: keep it on FileVault disk and encrypt it before any upload.

## 3. Restore drill (do this; the CI law checks it)

Proves the newest real backup decrypts and restores completely. Production is never written: the restore goes into a throwaway Postgres in Docker on your Mac. About 15 minutes.

1. **Start an empty local Postgres 18** (port 55433, a local-only password):

   ```bash
   docker run -d --name flump-drill -e POSTGRES_PASSWORD=drill_local_only \
     -e POSTGRES_DB=flump_drill -p 127.0.0.1:55433:5432 postgres:18-alpine
   ```

2. **Point the restore at it and at the backups.** The identity file is the age secret key from your password manager: copy it, then write it to a file only you can read, for the drill only. Secrets are read with `read -s` so they never land in your shell history:

   ```bash
   (umask 077; pbpaste > "$HOME/.flump-drill-identity.txt"); pbcopy </dev/null
   export BACKUP_AGE_IDENTITY_FILE="$HOME/.flump-drill-identity.txt"
   export RESTORE_DATABASE_URL='postgres://postgres:drill_local_only@127.0.0.1:55433/flump_drill'
   export BACKUP_DESTINATION='s3://<bucket>/flump/prod'
   export S3_ENDPOINT='<endpoint>' S3_REGION='<region>'
   read -s 'S3_ACCESS_KEY_ID?restore key id: ' && export S3_ACCESS_KEY_ID; echo
   read -s 'S3_SECRET_ACCESS_KEY?restore key secret: ' && export S3_SECRET_ACCESS_KEY; echo
   ```

   Use the READ-ONLY restore key, not the cron's write key. The drill database's password is local-only, so it is fine in history. If production's URL is in your shell as `DATABASE_URL` or `BACKUP_DATABASE_URL`, leave it: the script refuses a target that names the same database.

3. **Restore the newest backup and compare it with its manifest:**

   ```bash
   bun scripts/ops/backup-restore.ts --latest | tee drill-restore.txt
   ```

   `--latest` picks the newest complete backup labelled `prod` (the nightly one); manual backups with another `BACKUP_LABEL` are only picked with `--label <label>`. It prints `restore_seconds`, `tables_checked`, `rows_checked`, the migrations count and, last, `RESULT|PASS` or `RESULT|FAIL`. Any `MISMATCH` line names the table that differs. Exit 0 only on PASS.

4. **Run the structural checks** (migrations count from the line above):

   ```bash
   psql "$RESTORE_DATABASE_URL" -X -v expected_migrations=<n> -f scripts/ops/verify-restore.sql | tee drill-verify.txt
   ```

   Pass: last line `RESULT|PASS`.

   To re-run the drill into the same database later, either recreate the container, or set its comment once by hand (`COMMENT ON DATABASE flump_drill IS 'flump-restore-target';`) and pass `--replace --confirm flump_drill`. The script never wipes a database without that comment, so production (which never carries it) cannot be replaced by mistake.

5. **Optional, app boots on it:** run the backend image against the drill database (`first-deploy-pr368.md` G3.3 shows the `docker run` line) and check `/health/ready` answers 200. Readiness fails if a migration is pending, so a 200 also proves the schema is current.

6. **Clean up:**

   ```bash
   docker rm -f flump-drill
   rm -f "$HOME/.flump-drill-identity.txt"
   ```

7. **Log it** in `docs/runbooks/drill-log.md` (copy the template; counts and timings only) and commit. The `check:laws` restore-drill law fails CI when the newest passing entry is older than 90 days.

### Pass criteria (all three)

1. `backup-restore.ts` printed `RESULT|PASS` (every table's row count and checksum, and the migrations count, equal the manifest).
2. `verify-restore.sql` printed `RESULT|PASS` (tables present, migrations count, sequences ahead).
3. The backup restored was at most 26 h old (its stamp is in the first output line).

If it fails: do not delete the backup. Note the `MISMATCH` lines and the error in the drill log (no row data), then run `bun scripts/ops/backup-restore.ts --backup <the previous backup's name>` to find the last good one. A failed drill is a P2 incident (`incident.md`): fix the backup before the next deploy.

### Verification query set

What proves a restore is complete, in order of strength:

| Check                                   | Proves                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Dump sha256 equals the manifest         | The file is the one that was written, undamaged                               |
| Per-table row count equals the manifest | No table lost rows                                                            |
| Per-table checksum equals the manifest  | Every row's content is identical (taken in the dump's own snapshot)           |
| No missing or unexpected tables         | The schema's table set is the same                                            |
| `migrations` count equals the manifest  | The schema version is the same                                                |
| `verify-restore.sql`                    | Sequences will not collide on the next insert; FK and index counts to compare |
| `/health/ready` on the restored data    | The app sees no pending migration                                             |

`backup-restore.ts` runs the first five. For a restore that has no manifest (a PITR restore), run `restore-fingerprint.sql` on both databases and diff: with writes paused on the source for the moment you take its fingerprint, the outputs match line for line.

```bash
psql "$RESTORE_DATABASE_URL" -X -f scripts/ops/restore-fingerprint.sql > restored.txt
psql "$SOURCE_URL" -X -f scripts/ops/restore-fingerprint.sql > source.txt
diff source.txt restored.txt && echo identical
```

### PITR drill (after PITR is on)

Once a quarter, instead of step 3: in the Railway dashboard restore the Postgres service to a point 1 hour ago **as a new service** (never over the live one), connect to it through `railway connect <new service> --tunnel-only`, set `RESTORE_DATABASE_URL` to that tunnel URL and run step 4 plus `restore-fingerprint.sql` row counts. Delete the new service afterwards. Log it with reason `pitr`.

## 4. Real recovery (production data lost or corrupted)

Never restore over the live database. Restore next to it, prove it, then switch.

1. Declare the incident (`incident.md`), and stop writes: set the backend's replica count to 0 or put the web app in maintenance.
2. Choose the source: PITR to just before the damage (best RPO) if PITR is on, else the newest `RESULT|PASS`-able backup from before the damage.
3. Create a **new** Postgres service in the production environment. For PITR, restore into a new service from the dashboard. For a backup, set `RESTORE_DATABASE_URL` to the new service's tunnel URL (with `read -s`) and run `bun scripts/ops/backup-restore.ts --backup <name>` from your Mac, naming the backup explicitly (never `--latest` in a recovery: pick the newest backup from before the damage and check its timestamp). Also set `DATABASE_URL` to the damaged database's tunnel URL: the script refuses a target that names the same host, port and database, but two tunnels on different local ports never match, so this is a safety net, not proof. Check by eye that `RESTORE_DATABASE_URL` is the NEW service before you press Enter. The new database is empty, so `--replace` is never needed; the script only wipes a database whose comment you set to `flump-restore-target` yourself.
4. Run the verification query set against the new service. All checks must pass.
5. Point the backend's `DATABASE_URL` at the new service (`${{<new service>.DATABASE_URL}}`), redeploy, and wait for `/health/ready` 200.
6. `bash scripts/ops/smoke.sh production`, sign in, check your own data.
7. Keep the damaged service, stopped, for 7 days for investigation, then delete it. Record RPO (data lost, in minutes) and RTO in the incident log.

## 5. Restore-to-staging drill (manual dumps)

For a manual dump from section 2. Prerequisite (owner, once): the staging Postgres exists (`staging.md`) and carries the marker, **set by you, never by a script**:

```sql
COMMENT ON DATABASE <staging db name> IS 'flump-staging';
```

```bash
read -s 'PGURL?production URL (only so the script can prove staging differs): ' && export PGURL; echo
read -s 'STAGING_PGURL?staging URL: ' && export STAGING_PGURL; echo
bash scripts/ops/restore-to-staging.sh --owner '<your WorkOS user id>' \
  --before-counts ~/flump-backups/flump-prod-<stamp>.counts.txt \
  ~/flump-backups/flump-prod-<stamp>.dump
```

The script refuses (exit 2, nothing changed) unless `STAGING_PGURL` and `PGURL` name different databases, the staging comment is exactly `flump-staging`, and the staging `public` schema is empty (or `--replace` after you type `restore-into-staging`). It runs `pg_restore --no-owner --exit-on-error --single-transaction`, writes `staging-counts.txt` and `staging-verify.txt`, and diffs counts against `--before-counts`. Pass: `counts_diff: clean`, `verify_restore: PASS`, `bash scripts/ops/smoke.sh staging` passes, and you can sign in to staging and see your data.

Once staging holds synthetic personas (`seed-synthetic.ts`) it is no longer a restore target for production data: use section 3 instead.

## 6. Cadence

- Section 3 drill: before every irreversible migration (BE-05's sign backfill is one), monthly for the first 3 months after launch, then at least every 90 days (enforced by the law).
- PITR drill: quarterly once PITR is on.
- Always against the newest backup.

## Automated restore test (CI)

`.github/workflows/backup.yml` runs on every pull request, on main and weekly: it seeds Postgres 18 with every migration, the synthetic personas and a table of awkward types, runs `backup-run.ts` (encrypted, to a local directory), restores with `backup-restore.ts` into an empty database, and requires `RESULT|PASS`, `verify-restore.sql` PASS, identical `restore-fingerprint.sql` output, and that a changed or deleted row is caught (`scripts/ops/backup-roundtrip.test.ts`). It also builds the cron image and checks it refuses to run unconfigured. It never touches a real database. It proves the scripts work; only section 3 proves the real backups do.

## Reusable guard

`scripts/ops/lib-staging.sh` (`assert_staging_marker`, `assert_distinct_targets`, `conn_target`) and `scripts/ops/staging-marker.ts` (`assertStagingMarker(client)`, `assertDistinctTargets`) hold the "database comment must equal `flump-staging`" check. Any script that writes to staging must call it first.
