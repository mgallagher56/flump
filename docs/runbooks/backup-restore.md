# Runbook: backup and restore-to-staging drill

Owner-executed. Commands are for macOS zsh, from a clean clone at the repo root. Owner-only values (`PGURL`, `STAGING_PGURL`, owner id) stay in your shell: **never paste connection strings, dumps or tokens into chat or to an agent.** Agents only ever see counts files.

Scripts: `scripts/ops/backup-dump.sh`, `scripts/ops/restore-to-staging.sh`, `scripts/ops/verify-restore.sql`, `scripts/ops/prod-counts.sql`, `scripts/ops/smoke.sh`. Tools needed on your Mac: `pg_dump`, `pg_restore`, `psql` (`brew install libpq`, then put it on `PATH`; use client 18 or newer, matching the server), optionally `age` (`brew install age`).

## Targets

| Phase         | RPO                                      | RTO                                          |
| ------------- | ---------------------------------------- | -------------------------------------------- |
| Private beta  | 24 h (daily Railway snapshots + dump)    | 2 h (restore plus verify, done by the owner) |
| Public launch | 5 min (PITR enabled, E18 plan section 6) | 2 h                                          |

Drill targets: `restore_seconds` under 30 minutes; dump age at drill at most 24 h.

## 1. Take a dump

Get a tunnel URL (do not echo it):

```bash
railway connect Postgres --tunnel-only      # in a second terminal; copy the URL it prints into PGURL below
export PGURL='<paste, do not share>'
bash scripts/ops/backup-dump.sh --owner '<your WorkOS user id>' [--age-recipient age1...]
```

It writes to `~/flump-backups` (directory `0700`, files `0600`):

| File                            | What                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| `flump-prod-<stamp>.dump`       | `pg_dump --format=custom --no-owner`                              |
| `flump-prod-<stamp>.schema.sql` | schema only                                                       |
| `flump-prod-<stamp>.counts.txt` | `prod-counts.sql` output taken at dump time (with `--owner`)      |
| `flump-prod-<stamp>.sha256`     | checksums of the files above                                      |
| `flump-prod-<stamp>.dump.age`   | encrypted copy (with `--age-recipient`); **upload only this one** |

It prints `dump_seconds`, `dump_bytes` and `table_data_entries` (the `pg_restore --list` count of `TABLE DATA`; expect one per table, 9 today including `migrations`). Timing today (166 MB database): well under a minute; note yours in the drill log. The dump holds financial data, encrypted bank tokens and PAT hashes: keep it on FileVault disk plus an encrypted external drive, and encrypt with `age` before any cloud upload. Keep offsite copies at least 30 days.

The script never prints `PGURL`. It refuses without `PGURL`, with a non-`postgres://` URL, or with `--age-recipient` when `age` is missing.

## 2. Restore-to-staging drill (this is the drill)

Prerequisites (owner, once): the staging Postgres exists (`staging.md`) and carries the marker, **set by you, never by a script**:

```sql
COMMENT ON DATABASE <staging db name> IS 'flump-staging';
```

Run:

```bash
export PGURL='<production URL, only so the script can prove staging differs>'
export STAGING_PGURL='<staging URL>'
bash scripts/ops/restore-to-staging.sh --owner '<your WorkOS user id>' \
  --before-counts ~/flump-backups/flump-prod-<stamp>.counts.txt \
  ~/flump-backups/flump-prod-<stamp>.dump
```

The script refuses (exit 2, nothing changed) unless all of these hold:

- `STAGING_PGURL` and `PGURL` are both set, are different strings and name different host, port and database.
- The staging database comment is exactly `flump-staging`.
- The staging `public` schema is empty. If it is not, re-run with `--replace`: it drops and recreates `public` (only) after you type `restore-into-staging`.

Then it runs `pg_restore --no-owner --exit-on-error --single-transaction` (all or nothing), prints `restore_seconds`, writes `staging-counts.txt` and `staging-verify.txt` (in `--out-dir`, default the current directory), and diffs the counts against `--before-counts`. Exit 0 means both the diff and `verify-restore.sql` are clean. `verify-restore.sql` checks: expected tables present (`to_regclass`), `migrations` rows equal the timestamped files in `apps/backend/src/migrations` (override with `--expected-migrations N` when the dump predates newer migrations), every serial sequence is at or past `max(id)`, and prints foreign key and index counts.

### Pass criteria (all four)

1. `counts_diff: clean`.
2. `verify_restore: PASS`.
3. `bash scripts/ops/smoke.sh staging` passes (after the staging backend is pointed at the restored database).
4. You can sign in to staging and see your data.

### Log it

Append to `docs/runbooks/drill-log.md` (copy its template; counts and timings only): dump file name, size, dump age, `table_data_entries`, `restore_seconds`, counts identical yes/no, result.

### Rollback

The drill only writes to staging; production is read-only throughout (`pg_dump` and counts). To undo or redo, re-run with `--replace`, or recreate the staging database. Nothing needs undoing on production.

## 3. Cadence

Before every irreversible migration; monthly for the first 3 months after launch; then quarterly. Always against the newest dump.

## 4. After the switch to synthetic data

Once staging holds synthetic personas (E18-N11, `seed-synthetic.ts`) it is no longer a restore target for production data. The drill then becomes: take the dump, run `scripts/ops/restore-drill.sh` against it locally in Docker, then re-seed staging with N11.

## Reusable guard

`scripts/ops/lib-staging.sh` (source it; `assert_staging_marker`, `assert_distinct_targets`, `conn_target`) and its TypeScript twin `scripts/ops/staging-marker.ts` (`assertStagingMarker(client)`, `assertDistinctTargets`) hold the "database comment must equal `flump-staging`" check. Any script that writes to staging must call it first.
