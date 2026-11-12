# Runbook: first production deploy (release PR 368)

Owner-executed. Derived from `docs/audit/plans/E18-plan-draft.md` section 2 (G0 to G9 and rollback). Commands are for macOS zsh, run from a clean clone of `main` at the repo root. `railway` is linked to project `flump`, environment `production`.

> **WARNING: read before touching anything on Railway.**
> - **Any Railway variable or setting change can deploy unreleased `main` HEAD and bypass release gating.** The live backend deployment was itself created by a settings patch and runs 21 unreleased commits. A normal Deploy of staged changes would ship all of `main`, including the three irreversible migrations.
> - Change variables only with `railway variable set ... --skip-deploys`, or hold **Alt** while clicking Deploy in the dashboard (commits staged changes without redeploying).
> - **Take the backup (G2) BEFORE touching any Railway setting.**
> - **Config freeze:** no variable or setting changes on backend or web from now until G6 is done.
> - **Never paste connection strings, passwords, tokens or dumps into chat or to an agent.** That covers the tunnel output, `PGURL`, `DATABASE_URL` and any variable value. Agents get counts files only.

## What cannot be undone

- `ClearBankTokens` nulls every bank token (every user must reconnect). `RemoveSeededExampleData` deletes the fingerprinted example rows and **all** rows of `user_mock` / `dev_user_123`. `Baseline` only records itself on production (the 8 tables already exist).
- **Never delete rows from the `migrations` table.** Re-running `ClearBankTokens` would wipe reconnected tokens.
- The only undo is restoring the pre-deploy backup from G2.

## What depends on the PR that ships these scripts

This runbook and `scripts/ops/*` ship in the same PR as A-02 (`/health/ready`), A-03 (shutdown hooks) and A-04 (web and marketing `/healthz`, `X-Robots-Tag`, `robots.txt`).

| Step                              | Needs that PR merged?                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| G1 to G3 (scripts, counts, drill) | No. Run them from a checkout of the PR branch, or after merge.                                                                   |
| G3 image dry run, G5              | Yes, merged **and** PR 368 refreshed, so the image you rehearse contains the health endpoints.                                   |
| G6 healthcheck paths              | Use `/health/ready`, `/healthz`, `/healthz` only after the merge. Before it, use `/`, `/ping`, `/`.                              |
| G8 full smoke                     | Only passes after the release deploys. Before that, `/health/ready`, `/healthz`, noindex and `robots.txt` checks FAIL by design. |

**Order:** merge the scripts PR to main, wait for release-please to refresh PR 368 (new commits land in it automatically), confirm its checks are green, then **freeze `main`** (no merges) until G7 is done.

## G0. Preconditions (10 min)

- [ ] Decisions D1 (staging before 368) and D7 (deploy order) are made (plan section 18).
- [ ] Railway config freeze is in force (see the banner).
- [ ] Scripts PR (A-01 to A-04) merged and PR 368 refreshed, then `main` frozen.
- [ ] `gh pr checks 368` all green; `gh run list --branch main --limit 2` shows success.
- [ ] Two-hour window, nobody else using the app.
- [ ] Tools:

  ```bash
  brew install libpq
  export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
  pg_dump --version        # must say 18.x
  docker info >/dev/null && echo docker ok
  mkdir -p ~/flump-backups && chmod 700 ~/flump-backups
  export OWNER_ID='<your WorkOS user id>'
  ```

## G1. Read-only production checks (20 min)

1. [ ] **Dashboard, look only (backend variables):**
   - `NODE_ENV` = `production`.
   - `DB_SSL` is `false` or `no-verify`; not unset, not `true`. (Unverified guess: `postgres-ssl` uses a self-signed certificate, so unset or `true` would fail boot. **Confirm.**)
   - `DATABASE_URL` is the reference `${{Postgres.DATABASE_URL}}` (host `*.railway.internal`), not pasted text. **Confirm.**
   - `BANKING_TOKEN_ENCRYPTION_KEY` is 32+ characters and not example text.
   - `WORKOS_CLIENT_ID` present; `CORS_ALLOWED_ORIGINS` contains `https://web-production-845e6c.up.railway.app`.
2. [ ] **Tunnel (terminal 1, leave open):** `railway connect Postgres --tunnel-only`. It prints host, port, user, password, database. Do not paste them anywhere but terminal 2.
3. [ ] **Terminal 2:** `export PGURL='postgresql://<user>:<password>@localhost:<port>/<db>'` (and the same `PATH` and `OWNER_ID` exports as G0).
4. [ ] **Schema check:** `psql "$PGURL" -c '\dt'`. Expect exactly `accounts, account_details, bank_connections, budget_entries, mcp_tokens, tax_records, transactions, user_profiles` and **no** `migrations` table. If any of the 8 is missing: **stop** (Baseline throws "partial schema" and the backend crash-loops).
5. [ ] **Counts (read-only, counts only):**

   ```bash
   psql "$PGURL" -v owner="$OWNER_ID" -f scripts/ops/prod-counts.sql | tee ~/flump-backups/prod-before.txt
   ```

   Output lines are `label|count`; `missing` marks an absent table. Fails with a clear message if `owner` is unset or empty.
6. [ ] **Expected cleanup counts** (mirrors the migration's DELETEs, imports its constants, never deletes):

   ```bash
   bun scripts/ops/seed-cleanup-preview.ts | psql "$PGURL" -v owner="$OWNER_ID" -f - | tee ~/flump-backups/cleanup-preview.txt
   ```

   The `summary|` line uses the same labels as the migration log (`taxRecords`, `accounts`, `budgetEntries`, `mockIdentityRows`). **Review the `owner.*` lines: any count above 0 means rows of yours match a seed fingerprint and WILL be deleted.** Stop and decide before continuing if they are not 0.
7. [ ] **Pin the WorkOS issuer** (no online decoders, nothing pasted to an agent): sign in to the production web app, DevTools, Network, any request to `backend-production-184b.up.railway.app`, copy the `Authorization` value without `Bearer `, then:

   ```bash
   pbpaste | bun -e 'const t=(await Bun.stdin.text()).trim().split(".")[1];const p=JSON.parse(Buffer.from(t,"base64url").toString());console.log({iss:p.iss,aud:p.aud,exp:new Date(p.exp*1000).toISOString()})'; pbcopy </dev/null
   railway logs -s backend -n 500 | grep "expected token issuers"
   ```

   Record `iss` (not secret) for G6.

## G2. Backups (15 min). Before any Railway change.

1. [ ] **Railway snapshot** (availability on Hobby is **unverified: confirm**; if `create` errors, carry on, the dump is mandatory regardless):

   ```bash
   railway postgres pitr backup create -s Postgres --name pre-pr368
   railway postgres pitr backup list -s Postgres --json      # note the id
   railway postgres pitr backup lock <id> -s Postgres
   ```
2. [ ] **Logical dump (mandatory):**

   ```bash
   STAMP=$(date -u +%Y%m%dT%H%MZ)
   export DUMP=~/flump-backups/prod-pre-pr368-$STAMP.dump
   pg_dump "$PGURL" --format=custom --no-owner --file "$DUMP"
   pg_dump "$PGURL" --schema-only --no-owner --file ~/flump-backups/prod-schema-pre-pr368-$STAMP.sql
   pg_restore --list "$DUMP" | grep -c "TABLE DATA"          # expect 8
   shasum -a 256 ~/flump-backups/*pre-pr368* > ~/flump-backups/SHA256SUMS
   ```
3. [ ] Second copy on encrypted storage (FileVault disk plus an encrypted external drive, or `age -r <pubkey>` before any cloud upload). The dump holds financial data, encrypted bank tokens and PAT hashes.
4. [ ] **Schedules** (may redeploy Postgres: a few seconds of DB downtime; fine after the dump): `railway postgres pitr schedule set -s Postgres --daily --weekly`. Daily kept 6 days, weekly 27.

## G3. Restore drill, dry run, rollback rehearsal (45 to 60 min)

Railway volume backups only restore onto the live volume, so the drill uses the logical dump.

1. [ ] **Restore drill (automated).** Starts a throwaway local container (default `flump-drill`, port 55433, password `drill_local_only`), runs `pg_restore --no-owner --exit-on-error`, prints the restore time, writes counts. Falls back to the container's own `pg_restore`/`psql` if yours are missing. Refuses to run if the container exists or the host is not local. `--keep` leaves the container for the dry run.

   ```bash
   bash scripts/ops/restore-drill.sh --keep --owner "$OWNER_ID" --out ~/flump-backups/drill-before.txt "$DUMP"
   diff ~/flump-backups/prod-before.txt ~/flump-backups/drill-before.txt && echo "counts identical"
   export DRILL='postgres://postgres:drill_local_only@localhost:55433/flump_drill'
   ```

   Record `restore_seconds` (your restore RTO). Expect no diff; any diff means the backup is incomplete: stop.
2. [ ] **Dry-run the release image against the restored copy.** Use a separate worktree so your checkout (and `scripts/ops`) stays put:

   ```bash
   git fetch origin release-please--branches--main
   git worktree add --detach ../flump-pr368 origin/release-please--branches--main
   (cd ../flump-pr368 && docker build -f apps/backend/Dockerfile -t flump-backend:pr368 .)
   docker run --rm --name be-pr368 --network host \
     -e NODE_ENV=production -e PORT=4400 \
     -e DATABASE_URL="$DRILL" -e DB_SSL=false \
     -e BANKING_TOKEN_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
     -e WORKOS_CLIENT_ID='<public client id>' \
     flump-backend:pr368
   ```

   `--network host` (OrbStack) keeps `localhost` local, so no TLS is attempted. Expect, in order: 3 migrations, then `Removed seeded example data: taxRecords=... accounts=... budgetEntries=... mockIdentityRows=...`, then Nest start. **These four numbers must equal the `summary|` line in `cleanup-preview.txt`.**
3. [ ] In another terminal: `curl -fsS localhost:4400/` and `curl -fsS localhost:4400/health/ready` both 200 (the latter needs the scripts PR). Also:

   ```bash
   docker exec flump-drill psql -U postgres -d flump_drill -Atc 'SELECT name FROM migrations ORDER BY id'          # 3 rows
   docker exec -i flump-drill psql -U postgres -d flump_drill -X -v owner="$OWNER_ID" -f - < scripts/ops/prod-counts.sql > ~/flump-backups/drill-after.txt
   ```

   Expect in `drill-after.txt`: bank-connection token counts 0, mock-identity rows 0, owner rows unchanged apart from rows flagged in the preview.
4. [ ] **Idempotency:** Ctrl+C the container (exercises shutdown), start it again with the same `docker run`. Then
   `docker exec flump-drill psql -U postgres -d flump_drill -Atc 'SELECT name, count(*) FROM migrations GROUP BY 1 HAVING count(*)>1'` must print nothing.
5. [ ] **Rollback rehearsal** (the old image must boot on the migrated schema):

   ```bash
   git worktree add --detach ../flump-old 05585b2
   (cd ../flump-old && docker build -f apps/backend/Dockerfile -t flump-backend:old .)
   docker exec flump-drill pg_dump -U postgres -d flump_drill --schema-only > ~/flump-backups/before-old.sql
   docker run --rm --network host -e NODE_ENV=production -e PORT=4401 -e DATABASE_URL="$DRILL" \
     -e WORKOS_CLIENT_ID='<public client id>' flump-backend:old        # curl localhost:4401/ -> 200, then Ctrl+C
   docker exec flump-drill pg_dump -U postgres -d flump_drill --schema-only > ~/flump-backups/after-old.sql
   diff ~/flump-backups/before-old.sql ~/flump-backups/after-old.sql && echo "no schema change"
   ```
6. [ ] **Clean up:** `docker rm -f flump-drill; docker rmi flump-backend:pr368 flump-backend:old; git worktree remove --force ../flump-pr368 ../flump-old`.
7. [ ] Log in `docs/runbooks/drill-log.md` (counts and timings only, never row data): dump size, restore seconds, migration seconds, counts, pass/fail.

## G4. Staging rehearsal (60 to 90 min, only if D1 = A)

Follow plan section 3 "first-time setup", restore the same dump into staging Postgres, deploy staging from `main`. Pass: backend log shows the same cleanup counts as G3, sign-in works on staging, and `BACKEND_URL=... WEB_URL=... MARKETING_URL=... bash scripts/ops/smoke.sh staging` passes.

## G5. Final head check (5 min)

If anything under the backend or its packages changed since the image you rehearsed, repeat G3 steps 2 to 4:

```bash
git diff <G3 sha> origin/release-please--branches--main -- apps/backend packages/banking packages/mcp packages/finance-engine
```

## G6. Railway config, without deploying (10 min, after G2)

- [ ] Draining. **Required:** Railway's default is 0 seconds, so `enableShutdownHooks()` is useless without it.

  ```bash
  railway variable set -s backend RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15 --skip-deploys
  railway variable set -s web     RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15 --skip-deploys
  railway variable set -s backend WORKOS_ISSUER='<iss from G1.7>' --skip-deploys   # optional; REPLACES the default issuers, copy exactly
  ```
- [ ] Healthchecks (dashboard, each service Settings, Healthcheck Path; leave timeout 300 s): backend `/health/ready`, web `/healthz`, marketing `/healthz` (before the scripts PR is live: `/`, `/ping`, `/`). Commit with **Alt+Deploy**.
- [ ] `railway deployment list -s backend --limit 2`: no new deployment started. If one did, it is deploying `main` HEAD (equals the release content) and G2 covers you; watch it as G7.
- [ ] Raise the hard usage limit to $25 (`railway usage limit set --help` for flags, or dashboard). **Confirm the flags.**
- [ ] Project webhook (Project Settings, Webhooks) to a Discord or Slack channel on your phone.

## G7. Merge and watch (20 min)

```bash
gh pr merge 368 --squash          # keep the title "chore(main): release"
gh run list --branch main --limit 3 && gh run watch <ci-run-id>
railway deployment list -s backend --limit 2     # WAITING, BUILDING, DEPLOYING, SUCCESS
railway logs -s backend -d                       # migrations, cleanup counts, "Nest application successfully started"
```

- [ ] Backend log cleanup counts equal `cleanup-preview.txt`.
- Backend, web and marketing build in parallel from one commit. With healthchecks on, the old backend keeps serving until the new one passes. If the backend fails, roll back web too (see Rollback).
- If CI fails on the merge commit, deployments are SKIPPED: fix forward on `main`, or re-run CI and use Command Palette "Deploy Latest Commit" per service.

## G8. Smoke test (10 min)

- [ ] `bash
  export MARKETING_URL='https://<marketing domain from the Railway dashboard>'   # not recorded in the repo
  EXPECTED_COMMIT=$(git rev-parse --short=7 origin/main) bash scripts/ops/smoke.sh production
  `
  PASS/FAIL lines show paths and statuses only; exit code is non-zero on any failure. Checks: backend `/` and `/health/ready` (200, body has `"commit"`, matches `EXPECTED_COMMIT` if set); web `/healthz` and `/ping`; marketing `/` and `/healthz`; `X-Robots-Tag` noindex on web and marketing; `/robots.txt` has `Disallow: /` on both. (`EXPECTED_COMMIT` must be the **release commit** that deployed: if `main` moved, use the merge SHA of PR 368 instead.)
- [ ] Manual: sign in; dashboard shows your data; accounts list renders; add and delete a test budget entry; bank connections show a reconnect/error state with no tokens in the network response; MCP tokens page loads; marketing home renders.
- [ ] DB (tunnel open): `psql "$PGURL" -v owner="$OWNER_ID" -f scripts/ops/prod-counts.sql > ~/flump-backups/prod-after.txt; diff ~/flump-backups/drill-after.txt ~/flump-backups/prod-after.txt`. Expect equal apart from rows written since the dump.

## G9. Watch window

- [ ] 30 minutes of active watching, then at 24 hours: `railway logs -s backend -n 1000 | grep -iE "error|exception|unauthor"`.
- [ ] Append duration and outcome to `docs/runbooks/deploy-log.md`.
- An agent may read logs read-only and summarise; never give it variable values.

## Rollback

- **Backend fails at boot** (migration error, bad env):
  - With a healthcheck the new deployment never takes traffic; the old one (`05585b2`) keeps serving. Nothing is half-applied if TypeORM runs all migrations in one transaction (**unverified, confirm the 1.1 default**). Read `railway logs -s backend -d`, fix forward with a new commit and release.
  - Without a healthcheck Railway restarts up to 10 times (crash-loop outage): **roll back immediately** (Deployments, last good deployment, "...", Rollback). Hobby keeps images 72 hours; after that, Redeploy rebuilds `05585b2`.
- **Web broken, backend fine:** roll web back to the `60cc5cb` deployment.
- **Code rollback after migrations succeeded:** the old backend boots on the migrated schema (rehearsed in G3.5). Caveat: old code seeds example data on GET again, and the cleanup migration will not rerun. Clean up with a new forward migration, **never** by deleting `migrations` rows.
- **Data loss:** volume backup restore (Backups tab, Restore, review staged volume swap, Deploy; data after the backup is lost), or `pg_restore` the G2 dump into a new database and repoint `DATABASE_URL`. Then redeploy the backend.

## Verified locally vs unverified

| Item                                                                                                                                                                                                | Status                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prod-counts.sql`: counts, missing-table handling, missing `owner` fails, deterministic, no row values, read-only                                                                                   | Verified against throwaway Postgres 18 (tests + manual)                                                                                                       |
| `seed-cleanup-preview.ts` counts equal the migration's log and row deltas, owner overlap                                                                                                            | Verified on synthetic data. Real seed fingerprints were not exercised (the original rows are deliberately not in the repo); G1.6 and G3.2 are the real check. |
| `restore-drill.sh` end to end (container tools path), `--keep`, bad dump, existing container, non-local host                                                                                        | Verified locally, shellcheck clean                                                                                                                            |
| `restore-drill.sh` host `psql`/`pg_restore` path                                                                                                                                                    | Not exercised locally (no libpq here); first real use is yours                                                                                                |
| `smoke.sh` pass/404/missing header/robots/commit/connection failure                                                                                                                                 | Verified against a local stub, shellcheck clean. **Never run against production.**                                                                            |
| Marketing production URL                                                                                                                                                                            | Unknown: set `MARKETING_URL`                                                                                                                                  |
| Snapshots on Hobby, `DB_SSL` value, `DATABASE_URL` is a reference, TypeORM 1.1 default transaction mode, `RAILWAY_GIT_COMMIT_SHA` at runtime, `railway usage limit set` flags, Alt+Deploy behaviour | Unverified: confirm during execution                                                                                                                          |
