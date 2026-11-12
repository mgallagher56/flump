# Runbook: first production deploy (release PR 368)

Owner-executed, for a non-expert following it unaided. Commands are for macOS zsh, run from a clean clone at the repo root. `railway` is linked to project `flump`, environment `production`. This file is self-contained.

> **WARNING: read before touching anything on Railway.**
>
> - **Any Railway variable or setting change can deploy unreleased `main` HEAD and bypass release gating.** The live backend deployment was itself created by a settings patch (commit `05585b2`, 21 commits past the last release, unreleased). A normal Deploy of staged changes would ship all of `main`, including the three irreversible migrations.
> - Change variables only with `railway variable set ... --skip-deploys`, or hold **Alt** while clicking Deploy in the dashboard (commits staged changes without redeploying).
> - **Take the logical dump (G2.1) BEFORE touching any Railway setting.**
> - **Config freeze:** no variable or setting changes on backend, web or marketing from now until G6 is done. Carve-outs: the usage-limit raise and the backup schedule in G2 (workspace billing and Postgres backups; the schedule may redeploy Postgres). Pause merging Dependabot/Renovate PRs and everything else into `main` for the whole freeze (until G7 is done).
> - **Never paste connection strings, passwords, tokens or dumps into chat or to an agent.** That covers the tunnel output, `PGURL`, `DATABASE_URL` and any variable value. Agents get counts files only. Do not paste tokens anywhere, including into online decoders.

## What cannot be undone

- `ClearBankTokens` nulls every bank token (every user must reconnect). `RemoveSeededExampleData` deletes the fingerprinted example rows and **all** rows of `user_mock` / `dev_user_123`. `Baseline` only records itself on production (the 8 tables already exist).
- **Never delete rows from the `migrations` table.** Re-running `ClearBankTokens` would wipe reconnected tokens.
- The only undo is restoring a pre-deploy backup from G2 (see Rollback, Data loss).

## What changes for visitors

Release 368 flips **production to noindex on web and marketing** (both were indexable before): every response gets `X-Robots-Tag: noindex, nofollow` and `/robots.txt` says `Disallow: /`. Setting `ALLOW_INDEXING=true` (exactly that string; `1`, `TRUE`, empty all keep noindex) on a service reverses it. Setting it is a Railway variable change, so it is inside the config freeze: if you ever want it, use `railway variable set -s web ALLOW_INDEXING=true --skip-deploys` (same for `marketing`); it takes effect on the next deploy of that service. Do not set it for this release unless you deliberately want indexing; the G8 smoke test expects noindex.

## What depends on the PR that ships these scripts

This runbook and `scripts/ops/*` ship in the same PR as the backend `/health/ready` endpoint, graceful-shutdown hooks, and web/marketing `/healthz`, `X-Robots-Tag` and `robots.txt`. CI on that PR also runs `bun test ./scripts/ops` (in the vitest job, with Postgres).

| Step                                | Needs that PR merged?                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| G1 to G3.1 (scripts, counts, drill) | No. Run them from a checkout of the PR branch, or after merge.                                                                       |
| G3.2 to G3.5 image rehearsal, G5    | Yes, merged **and** PR 368 refreshed, so the image you rehearse contains the health endpoints.                                       |
| G6 healthcheck paths                | Keep old-compatible paths (`/`, `/ping`, `/`) through G7. Switch to `/health/ready`, `/healthz`, `/healthz` only after G8 (see G8b). |
| G8 full smoke                       | Only passes after the release deploys. Before that, `/health/ready`, `/healthz`, noindex and `robots.txt` checks FAIL by design.     |

**Order:** merge the scripts PR to main, then wait for release-please to rewrite PR 368 (new commits, CI re-runs). Everything rehearsed before that point must be re-checked against the new head:

```bash
MERGE_SHA=<merge commit sha of the scripts PR on main>
until git fetch -q origin && git merge-base --is-ancestor "$MERGE_SHA" origin/release-please--branches--main; do sleep 30; done
gh pr view 368 --json headRefOid,statusCheckRollup    # wait until all checks are green
```

Then **freeze `main`** (no merges of any kind, including Dependabot/Renovate) until G7 is done.

## Logs

Counts and timings only, never row data: `docs/runbooks/drill-log.md` (restore drills) and `docs/runbooks/deploy-log.md` (deploys). Both are append-only templates.

## G0. Preconditions (10 min)

- [ ] You have decided whether to do the optional staging rehearsal (G4) first, and the order is: scripts PR first, then release PR 368.
- [ ] Railway config freeze is in force (see the banner). Dashboard shows **no staged changes** on any service (a later Deploy would ship them).
- [ ] You know: never run `railway postgres pitr enable` (or any `postgres` config command) without `--no-deploy` (`railway postgres --help`: such commands deploy by default). `pitr schedule set` has no `--no-deploy`: see G2.5.
- [ ] Scripts PR merged and PR 368 refreshed, then `main` frozen.
- [ ] `gh pr checks 368` all green on the refreshed head; `gh run list --branch main --limit 2` shows success.
- [ ] Two-hour window, nobody (including you) using the app. **The live (old) backend can re-seed example data on any signed-in GET, so do not open the app until G8 smoke passes.**
- [ ] Tools:

  ```bash
  setopt interactive_comments     # macOS zsh: lets pasted lines with trailing # comments work (repeat in every new window)
  bun install --frozen-lockfile   # seed-cleanup-preview.ts imports the migration (needs workspace deps)
  brew install libpq
  export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
  pg_dump --version        # must say 18.x
  docker info >/dev/null && echo docker ok
  mkdir -p ~/flump-backups && chmod 700 ~/flump-backups
  ```

  Secrets rule used below: `PGURL` and `OWNER_ID` are **plain shell variables, never `export`ed**, so child programs do not inherit them; each command receives them as an argument. Use the same terminal window throughout (a new window loses them: redo G1.2 and G1.5, and run `setopt interactive_comments` again, otherwise a pasted `VAR=value  # note` line does not set the variable).

## G1. Read-only production checks (25 min)

1. [ ] **Dashboard, look only (backend variables).** Open only the rows below; do not display other values.
   - `NODE_ENV` = `production`.
   - `DATABASE_URL` is the reference `${{Postgres.DATABASE_URL}}` (host `*.railway.internal`), not pasted text. (Unverified until you look.)
   - `BANKING_TOKEN_ENCRYPTION_KEY` is 32+ characters and not example text. The release backend refuses to boot without it.
   - `WORKOS_CLIENT_ID` present; `CORS_ALLOWED_ORIGINS` contains `https://web-production-845e6c.up.railway.app`.
2. [ ] **Find your owner id and the token issuer** (no online decoders, nothing pasted to an agent). Sign in to the production web app, DevTools, Network, any request to `backend-production-184b.up.railway.app`, copy the `Authorization` value **without** `Bearer `, then:

   ```bash
   pbpaste | bun -e 'const t=(await Bun.stdin.text()).trim().split(".")[1];const p=JSON.parse(Buffer.from(t,"base64url").toString());console.log({iss:p.iss,aud:p.aud,sub:p.sub,exp:new Date(p.exp*1000).toISOString()})'; pbcopy </dev/null
   OWNER_ID='<the sub value printed above>'    # plain variable, no export
   railway logs -s backend -n 500 | grep "expected token issuers"
   ```

   - `sub` is your WorkOS user id (normally starts `user_`). It is **not a secret**; it becomes `OWNER_ID`. The WorkOS dashboard user page shows the same id: cross-check it.
   - `pbcopy </dev/null` clears the clipboard so the token is gone. Do not paste the token anywhere.
   - Compare `iss` with the issuers in the boot log line. Note whether they match (needed in G6).
3. [ ] **DB_SSL verification** (wrong value fails the release boot before any migration runs, so nothing is half-applied; the old deployment keeps serving if a healthcheck is set, G6).
   - Rule from `apps/backend/src/config/db.config.ts` (production is strict: `DATABASE_URL` required, migrations run at boot):

     | `DB_SSL`       | Behaviour                                                                                                                                                                  |
     | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
     | unset or empty | TLS with certificate verification, unless the database host is `localhost`, `127.0.0.1` or `::1` (then no TLS). `*.railway.internal` counts as remote, so TLS is verified. |
     | `true`         | TLS with certificate verification, always.                                                                                                                                 |
     | `no-verify`    | TLS without certificate verification (boot logs a warning).                                                                                                                |
     | `false`        | No TLS (boot logs a warning for a remote host).                                                                                                                            |
     | anything else  | Boot throws: `DB_SSL must be one of: true, false, no-verify`.                                                                                                              |

   - Look at the `DB_SSL` row in the dashboard (the only variable you read for this; its value is not secret). Then read the live deployment's boot log: `railway logs -s backend -n 300 | grep -iE "DB_SSL|ssl|tls|certificate|successfully started"`.
   - Decision: `false` or `no-verify` -> leave it. Unset or `true` -> the release will demand a verified certificate. Railway's Postgres uses a self-signed certificate (unverified), which would fail verification. If the live boot log shows no TLS warning and the app works today, the old code may be using different rules, so do not assume: either run the optional staging rehearsal (G4) or set `DB_SSL=no-verify` in G6 (inside the freeze: `--skip-deploys` only).
   - The G3 image rehearsal uses `DB_SSL=false` against a local database, so it does **not** test this setting.
4. [ ] **Tunnel (terminal 1, leave open):** `railway connect Postgres --tunnel-only`. It prints host, port, user, password, database. Do not paste them anywhere but terminal 2.
5. [ ] **Terminal 2, same window as G1.2** (keeps the password out of shell history; no `export`):

   ```bash
   read -rs PGURL    # paste 'postgresql://<user>:<password>@localhost:<port>/<db>', press Return
   ```

6. [ ] **Schema check:** `psql -X "$PGURL" -c '\dt'`. Expect exactly `accounts, account_details, bank_connections, budget_entries, mcp_tokens, tax_records, transactions, user_profiles` and **no** `migrations` table. If any of the 8 is missing: **stop** (Baseline throws "partial schema" and the backend crash-loops).
7. [ ] **Counts (read-only, counts only):**

   ```bash
   psql -X "$PGURL" -v owner="$OWNER_ID" -f scripts/ops/prod-counts.sql | tee ~/flump-backups/prod-before.txt
   sed -n '/rows owned by the owner/,/== migrations/p' ~/flump-backups/prod-before.txt
   ```

   Output lines are `label|count`; `missing` marks an absent table. **GO / NO-GO: the "rows owned by the owner" lines must not all be 0** (you have used the app, so `accounts` and `user_profiles` should be at least 1). If they are all 0 the id is wrong: **stop** and redo G1.2.
8. [ ] **Expected cleanup counts** (mirrors the migration's DELETEs, imports its constants, never deletes). The preview refuses an empty or placeholder owner and exits non-zero:

   ```bash
   bun scripts/ops/seed-cleanup-preview.ts | psql -X "$PGURL" -v owner="$OWNER_ID" -f - | tee ~/flump-backups/cleanup-preview.txt
   ```

   **You must see a `summary|` line AND the final `== OK: preview complete` line. If either is missing the pipe failed** (a failed `bun` piped to `psql` prints nothing and exits 0). The `summary|` line uses the same labels as the migration log (`taxRecords`, `accounts`, `budgetEntries`, `mockIdentityRows`).
9. [ ] **Review what will be deleted (required):**

   ```bash
   sed -n '/retired mock identities/,/rows owned by the owner/p' ~/flump-backups/prod-before.txt
   grep -iE 'mock|summary|owner\.' ~/flump-backups/cleanup-preview.txt
   ```

   - **Mock identities** (`mock identity` / `mockIdentityRows.*` lines): confirm none of it is yours. It is the recorded owner decision that **all** rows of `user_mock` and `dev_user_123`, plus rows matching a seed fingerprint, are deleted without per-row review. If you do not agree, stop.
   - **`owner.*` lines above 0** mean your own account has rows matching an example-data fingerprint. This is likely: old code seeded your account with example data on first read, and those rows are test data by owner decision. But look at the counts and decide. Rows you edited no longer match the fingerprint and are **kept**. If the counts look wrong to you or you are unsure: **stop and ask before continuing**.

## G2. Backups (20 min). Before any Railway change except the carve-outs.

**Plain statement: if Railway's native backup or PITR is unavailable on this plan, the logical dump (G2.1 and G2.2) is your ONLY backup.** It must be verified (8 `TABLE DATA` entries, checksum, restored in the G3 drill) before anything else in this runbook. When last checked, PITR was `enabled: false`, no bucket was wired and `backup list` returned `[]`.

1. [ ] **Re-run counts immediately before the dump** (tunnel open), so you can prove nothing moved during it:

   ```bash
   psql -X "$PGURL" -v owner="$OWNER_ID" -f scripts/ops/prod-counts.sql > ~/flump-backups/prod-predump.txt
   ```

2. [ ] **Logical dump (mandatory) and verification:**

   ```bash
   STAMP=$(date -u +%Y%m%dT%H%MZ)
   DUMP=~/flump-backups/prod-pre-pr368-$STAMP.dump          # plain variable, no export
   pg_dump "$PGURL" --format=custom --no-owner --file "$DUMP"
   pg_dump "$PGURL" --schema-only --no-owner --file ~/flump-backups/prod-schema-pre-pr368-$STAMP.sql
   pg_restore --list "$DUMP" | grep -c "TABLE DATA"          # expect 8
   shasum -a 256 ~/flump-backups/*pre-pr368* > ~/flump-backups/SHA256SUMS
   psql -X "$PGURL" -v owner="$OWNER_ID" -f scripts/ops/prod-counts.sql > ~/flump-backups/prod-postdump.txt
   diff ~/flump-backups/prod-predump.txt ~/flump-backups/prod-postdump.txt && echo "no writes during dump"
   ```

   Expect `8` and no diff. A diff means data changed during the dump (someone used the app): repeat G2.1 and G2.2. If `prod-predump.txt` differs from `prod-before.txt`, data changed since G1: redo G1.8 and G1.9 (the review) before going on.
3. [ ] Second copy on encrypted storage (FileVault disk plus an encrypted external drive, or `age -r <pubkey>` before any cloud upload). The dump holds financial data, encrypted bank tokens and PAT hashes.
4. [ ] **Raise the hard usage limit first** (the workspace hard limit was $10; backups add cost and hitting the limit stops workloads, production included):

   ```bash
   railway usage limit status
   railway usage limit set --target workspace --hard 25      # add --workspace <name> if prompted, or use the dashboard
   ```

5. [ ] **Railway native backup, safe sequence** (availability on Hobby is **unverified**; if a command errors, stop this step, say so in the deploy log, and rely on the dump). Never add a `postgres` config command without checking `--help` for `--no-deploy`.

   ```bash
   railway postgres pitr status -s Postgres                          # read-only; note enabled / bucket
   railway postgres pitr backup create -s Postgres --name pre-pr368
   railway postgres pitr backup list -s Postgres --json              # verify: name pre-pr368 present, non-zero size; note the id
   railway postgres pitr backup lock <id> -s Postgres                # keep forever
   ```

   Then the schedule, **last in G2**. It is a Railway change that may redeploy Postgres (a few seconds of DB downtime; `schedule set` has no `--no-deploy`), carved out of the config freeze. Confirm no staged changes first (G0):

   ```bash
   railway postgres pitr schedule set -s Postgres --daily --weekly
   railway postgres pitr schedule list -s Postgres                   # verify both schedules appear
   ```

   Daily is kept 6 days, weekly 27 (unverified). Volume backups do not survive deleting the volume.

## G3. Restore drill, dry run, rollback rehearsal (45 to 60 min)

Railway volume backups only restore onto the live volume, so the drill uses the logical dump.

1. [ ] **Restore drill (automated).** Starts a throwaway local container (default `flump-drill`, port 55433, password `drill_local_only`), runs `pg_restore --no-owner --exit-on-error`, prints the restore time, writes counts. Falls back to the container's own `pg_restore`/`psql` if yours are missing. Refuses to run if the container exists, the host is not local, or (if `PGURL` is exported) the drill target equals production; because this runbook deliberately does not export `PGURL`, that last check cannot see it, so `drill_guard` below is your protection. `--keep` leaves the container for the dry run.

   ```bash
   bash scripts/ops/restore-drill.sh --keep --owner "$OWNER_ID" --out ~/flump-backups/drill-before.txt "$DUMP"
   diff ~/flump-backups/prod-predump.txt ~/flump-backups/drill-before.txt && echo "counts identical"
   DRILL='postgres://postgres:drill_local_only@localhost:55433/flump_drill'   # plain variable, no export
   ```

   The comparison is **`prod-predump.txt` (production just before the dump) against `drill-before.txt` (the restored copy)**. Expect no diff; any diff means the backup is incomplete: stop. If a previous `--keep` run left the container, run `docker rm -f flump-drill` first. Record `restore_seconds` (your restore time). Log it in `docs/runbooks/drill-log.md`.

   Before every destructive step below, define and run this guard. If it prints `REFUSE`, **stop**:

   ```bash
   drill_guard() {
     case "$DRILL" in *@localhost:*|*@127.0.0.1:*) ;; *) echo "REFUSE: DRILL is not a local database"; return 1;; esac
     [ "$DRILL" != "$PGURL" ] || { echo "REFUSE: DRILL equals PGURL (production)"; return 1; }
     echo "guard ok: DRILL is local and is not production"
   }
   drill_guard
   ```

   G3.2 to G3.5 are **unverified on this machine** (they need Docker image builds and runs that were not exercised when this runbook was written): note any surprise in the drill log.
2. [ ] **Dry-run the release image against the restored copy.** Run `drill_guard` first. Use a separate worktree so your checkout (and `scripts/ops`) stays put:

   ```bash
   git fetch origin release-please--branches--main
   G3_SHA=$(git rev-parse origin/release-please--branches--main); echo "$G3_SHA"   # record it: used in G5, G7 and the go/no-go
   git worktree add --detach ../flump-pr368 "$G3_SHA"
   (cd ../flump-pr368 && docker build -f apps/backend/Dockerfile -t flump-backend:pr368 .)
   drill_guard && docker run --rm --name be-pr368 --network host \
     -e NODE_ENV=production -e PORT=4400 \
     -e DATABASE_URL="$DRILL" -e DB_SSL=false \
     -e BANKING_TOKEN_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
     -e WORKOS_CLIENT_ID='<public client id>' \
     flump-backend:pr368
   ```

   - `--network host` works on OrbStack, **not on Docker Desktop**. On Docker Desktop replace the network flag with `-p 4400:4400` and use `-e DATABASE_URL='postgres://postgres:drill_local_only@host.docker.internal:55433/flump_drill'` (unverified; still a local database, `drill_guard` still applies).
   - `--network host` keeps `localhost` local, so no TLS is attempted.
   - Expect, in order: 3 migrations, then `Removed seeded example data: taxRecords=... accounts=... budgetEntries=... mockIdentityRows=...`, then Nest start. **These four numbers must equal the `summary|` line in `cleanup-preview.txt`** (the one from G1.8, or the re-run if you redid it).
   - The release image needs `BANKING_TOKEN_ENCRYPTION_KEY` (checked at startup in `apps/backend/src/config/config.module.ts`; a random value is fine for the rehearsal).
3. [ ] In another terminal: `curl -fsS localhost:4400/` and `curl -fsS localhost:4400/health/ready` both 200 (the latter needs the scripts PR). Also:

   ```bash
   docker exec flump-drill psql -U postgres -d flump_drill -Atc 'SELECT name FROM migrations ORDER BY id'          # 3 rows
   docker exec -i flump-drill psql -U postgres -d flump_drill -X -v owner="$OWNER_ID" -f - < scripts/ops/prod-counts.sql > ~/flump-backups/drill-after.txt
   ```

   Expect in `drill-after.txt`: bank-connection token counts 0, mock-identity rows 0, owner rows unchanged apart from rows flagged in the preview. **The dry-run migration counts (G3.2) equal `cleanup-preview.txt`** is a go/no-go item.
4. [ ] **Idempotency:** Ctrl+C the container (exercises shutdown), start it again with the same `drill_guard && docker run ...`. Then
   `docker exec flump-drill psql -U postgres -d flump_drill -Atc 'SELECT name, count(*) FROM migrations GROUP BY 1 HAVING count(*)>1'` must print nothing.
5. [ ] **Rollback rehearsal** (the old image must boot on the migrated schema). The old image (`05585b2`) may not need the banking key, but the rehearsal passes one anyway; it is harmless:

   ```bash
   git worktree add --detach ../flump-old 05585b2
   (cd ../flump-old && docker build -f apps/backend/Dockerfile -t flump-backend:old .)
   docker exec flump-drill pg_dump -U postgres -d flump_drill --schema-only > ~/flump-backups/before-old.sql
   drill_guard && docker run --rm --network host -e NODE_ENV=production -e PORT=4401 -e DATABASE_URL="$DRILL" -e DB_SSL=false \
     -e BANKING_TOKEN_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
     -e WORKOS_CLIENT_ID='<public client id>' flump-backend:old        # curl localhost:4401/ -> 200, then Ctrl+C
   docker exec flump-drill pg_dump -U postgres -d flump_drill --schema-only > ~/flump-backups/after-old.sql
   diff ~/flump-backups/before-old.sql ~/flump-backups/after-old.sql && echo "no schema change"
   ```

   (Same Docker Desktop substitution as G3.2.) Pass: the `curl` returns 200 and there is no schema diff.
6. [ ] **Clean up:** `docker rm -f flump-drill; docker rmi flump-backend:pr368 flump-backend:old; git worktree remove --force ../flump-pr368; git worktree remove --force ../flump-old`.
7. [ ] Append to `docs/runbooks/drill-log.md` (counts and timings only, never row data): dump size, restore seconds, migration seconds, counts, pass/fail.

## G4. Staging rehearsal (optional, 60 to 90 min)

Not required for the go/no-go. Do it if the DB_SSL value is unset/`true` (G1.3) or you want a real-TLS rehearsal. In the Railway dashboard create a separate `staging` environment with its own Postgres and backend (same variables, but a fresh random `BANKING_TOKEN_ENCRYPTION_KEY`; whether duplicating an environment copies volume data is unverified, expected no). Restore the same dump into staging Postgres through a tunnel (`railway connect Postgres -e staging --tunnel-only`, then `pg_restore --no-owner --exit-on-error`), deploy staging from `main`. Pass: backend log shows the same cleanup counts as G3, sign-in works on staging, and `BACKEND_URL=... WEB_URL=... MARKETING_URL=... bash scripts/ops/smoke.sh staging` passes. Never point staging at the production database.

## G5. Final head check (5 min)

PR 368's head must still equal `G3_SHA` (`git fetch origin && git rev-parse origin/release-please--branches--main`). If it moved, re-check checks and, if anything under the backend or its packages changed, repeat G3 steps 2 to 4:

```bash
git diff "$G3_SHA" origin/release-please--branches--main -- apps/backend packages/banking packages/mcp packages/finance-engine
```

## G6. Railway config, without deploying (10 min, after G2)

- [ ] Draining. **Required:** Railway's default is 0 seconds, so the backend's graceful shutdown is useless without it.

  ```bash
  railway variable set -s backend RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15 --skip-deploys
  railway variable set -s web     RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15 --skip-deploys
  # marketing intentionally has no draining variable (left at 0)
  ```

- [ ] `WORKOS_ISSUER`: **skip unless G1.2 showed a mismatch between the token `iss` and the boot-log issuers.** If it did: `railway variable set -s backend WORKOS_ISSUER='<iss from G1.2>' --skip-deploys` (it REPLACES the default issuers; copy exactly).
- [ ] `DB_SSL`: only if G1.3 told you to change it, with `--skip-deploys`.
- [ ] Healthchecks (dashboard, each service Settings, Healthcheck Path; leave timeout 300 s). The currently live builds (`05585b2` backend, `60cc5cb` web/marketing) have no `/health/ready` or `/healthz`, so keep **old-compatible** paths through G7: backend `/`, web `/ping`, marketing `/`. The G7 deploy of the release then still gets a healthcheck. Commit with **Alt+Deploy**. Switch to the new paths only in G8b.
- [ ] `railway deployment list -s backend --limit 2`: no new deployment started. If one did, it is deploying `main` HEAD (equals the release content) and the G2 backup covers you; watch it as G7.
- [ ] Project webhook (Project Settings, Webhooks) to a Discord or Slack channel on your phone.

## GO / NO-GO before G7

Every box must be ticked. One unticked box means do not merge.

- [ ] Logical dump verified: 8 `TABLE DATA`, checksum written, no writes during dump (G2.2).
- [ ] Drill counts equal: `prod-predump.txt` and `drill-before.txt` have no diff (G3.1).
- [ ] Dry-run migration counts equal the `summary|` line in `cleanup-preview.txt` (G3.2).
- [ ] Rollback rehearsal passed: old image booted, no schema diff (G3.5).
- [ ] Native backup listed and locked, schedule listed (G2.5); or you have explicitly accepted that the dump is your only backup.
- [ ] Dashboard shows no staged changes on any service.
- [ ] CI green on the PR 368 head (including the `bun test ./scripts/ops` step), and the head equals `G3_SHA` (G5).
- [ ] Owner id verified non-zero: "rows owned by the owner" lines in `prod-before.txt` are not all 0 (G1.7).
- [ ] Mock-identity and `owner.*` review done and accepted (G1.9).
- [ ] `DB_SSL` verified (G1.3), and set if needed (G6).
- [ ] `BANKING_TOKEN_ENCRYPTION_KEY` on the backend is 32+ characters (G1.1); without it the release backend crash-loops at boot.
- [ ] Draining set on backend and web, healthchecks on old-compatible paths (G6).
- [ ] You are not using the app, and will not until G8 smoke passes.

## G7. Merge and watch (20 min)

The old backend (`05585b2`) keeps serving while the new one migrates, and it **can re-seed example data on a signed-in GET**. **Do not use the app during G7, or after it until the G8 smoke test passes.**

```bash
gh pr merge 368 --squash --match-head-commit "$G3_SHA"    # keep the title "chore(main): release"; refuses if the head moved
gh run list --branch main --limit 3 && gh run watch <ci-run-id>
railway deployment list -s backend --limit 2     # WAITING, BUILDING, DEPLOYING, SUCCESS
railway logs -s backend -d                       # migrations, cleanup counts, "Nest application successfully started"
```

- [ ] Backend log cleanup counts equal `cleanup-preview.txt`.
- Backend, web and marketing build in parallel from one commit (the release merge commit). With healthchecks on (old-compatible paths), the old backend keeps serving until the new one passes. If the backend fails, roll back web too (see Rollback).
- If CI fails on the merge commit, deployments are SKIPPED: fix forward on `main`, or re-run CI and use Command Palette "Deploy Latest Commit" per service.
- **If the backend fails to boot (for example a failed migration):** repeated failed boot logs are **expected** (TypeORM retries the DB connection about 10 times per boot, then Railway restarts up to 10 times). With a healthcheck set the old deployment stays up and keeps serving. To stop the loop, remove the failed deployment in the dashboard (service, Deployments, the failed one, "...", Remove); `railway down --help` shows the CLI equivalent (unverified for this case). Then see Rollback.

## G8. Smoke test (10 min)

- [ ] Run (the release merge commit is the one Railway builds; `main` HEAD equals it while frozen):

  ```bash
  export MARKETING_URL='https://<marketing domain from the Railway dashboard>'   # not recorded in the repo; not a secret
  git fetch origin main
  EXPECTED_COMMIT=$(git rev-parse --short=7 origin/main) bash scripts/ops/smoke.sh production
  ```

  PASS/FAIL lines show paths and statuses only; exit code is non-zero on any failure. Checks: backend `/` and `/health/ready` (200, body has `"commit"`, matches `EXPECTED_COMMIT` if set); web `/healthz` and `/ping`; marketing `/` and `/healthz`; `X-Robots-Tag` noindex on web and marketing; `/robots.txt` has `Disallow: /` on both (these fail by design if you set `ALLOW_INDEXING=true`). `EXPECTED_COMMIT` must be the **release merge commit** that deployed: if `main` moved after G7, use the PR 368 merge SHA instead: `gh pr view 368 --json mergeCommit -q .mergeCommit.oid`.
- [ ] Manual (only now is it safe to use the app): sign in; dashboard shows your data; accounts list renders; add and delete a test budget entry; bank connections show a reconnect/error state with no tokens in the network response; MCP tokens page loads; marketing home renders.
- [ ] DB (tunnel open): `psql -X "$PGURL" -v owner="$OWNER_ID" -f scripts/ops/prod-counts.sql > ~/flump-backups/prod-after.txt; diff ~/flump-backups/drill-after.txt ~/flump-backups/prod-after.txt`. Expect equal apart from rows written since the dump.

## G8b. Switch healthchecks to the new endpoints (5 min, only after G8 passes)

The deployed code now serves them. In the dashboard set Healthcheck Path to backend `/health/ready`, web `/healthz`, marketing `/healthz`, and commit with **Alt+Deploy** (no redeploy). Re-running `smoke.sh` is not needed; `curl -fsS` each path once.

## G9. Watch window

- [ ] 30 minutes of active watching, then at 24 hours: `railway logs -s backend -n 1000 | grep -iE "error|exception|unauthor"`.
- [ ] Append duration and outcome to `docs/runbooks/deploy-log.md`.
- [ ] Close the tunnel and `unset PGURL OWNER_ID DUMP DRILL MARKETING_URL`.
- An agent may read logs read-only and summarise; never give it variable values.

## Rollback

**First, before rolling back or redeploying any old build:** set the healthcheck paths back to old-compatible (backend `/`, web `/ping`, marketing `/`) and Alt+Deploy, because `05585b2` and `60cc5cb` have no `/health/ready` or `/healthz` and would fail a new-path healthcheck. How Railway applies the healthcheck path on a rollback (current setting versus the one stored with the old deployment) is **unverified: confirm**.

- **Backend fails at boot** (migration error, bad env):
  - With a healthcheck the new deployment never takes traffic; the old one (`05585b2`) keeps serving. Nothing is half-applied if TypeORM runs all migrations in one transaction (**unverified, confirm the TypeORM 1.1.2 default**). Read `railway logs -s backend -d`, fix forward with a new commit and release.
  - Without a healthcheck Railway restarts up to 10 times (crash-loop outage): **roll back immediately** (Deployments, last good deployment, "...", Rollback). Hobby keeps images 72 hours; after that, Redeploy rebuilds `05585b2`.
- **Web broken, backend fine:** roll web back to the `60cc5cb` deployment.
- **Code rollback after migrations succeeded:** the old backend boots on the migrated schema (rehearsed in G3.5). Caveat: old code seeds example data on GET again, and the cleanup migration will not rerun. Clean up with a new forward migration, **never** by deleting `migrations` rows.
- **Data loss, option A, Railway backup:** `railway postgres pitr backup list -s Postgres`, then `railway postgres pitr backup restore <id> -s Postgres` (prompts; `--help` says it restores from the backup). Or dashboard: Postgres service, Backups tab, Restore, review the staged volume swap, Deploy. Data written after the backup is lost. (Unverified: whether it restores onto the live volume or a new service; read the prompt.)
- **Data loss, option B, restore the G2 dump into a new database** (all steps unverified against a real incident; verify each with `--help` before running):
  1. Create a new Postgres service: dashboard (project canvas, New, Database, PostgreSQL), or `railway add --database postgres` (see `railway add --help`). Note its service name, here `Postgres-restore`.
  2. Tunnel to it in terminal 1: `railway connect Postgres-restore --tunnel-only`. In terminal 2: `read -rs NEWURL` (paste the scoped `postgresql://...@localhost:<port>/<db>` string; no `export`).
  3. Restore: `pg_restore --dbname "$NEWURL" --no-owner --exit-on-error "$DUMP"`. If the new database is not empty, the restore fails: use a fresh service.
  4. Verify: `psql -X "$NEWURL" -v owner="$OWNER_ID" -f scripts/ops/prod-counts.sql | diff - ~/flump-backups/prod-predump.txt`.
  5. Repoint the backend. The tunnel string is **not** the right value (it is `localhost`); use a reference to the new service's internal URL. `DATABASE_URL` is currently a reference to the old database and must be **replaced**:
     `printf '%s' '${{Postgres-restore.DATABASE_URL}}' | railway variable set -s backend DATABASE_URL --stdin --skip-deploys`
     (single quotes keep the shell from expanding it; if the CLI does not keep reference syntax, set it in the dashboard Variables tab instead).
  6. Redeploy the backend: `railway deployment redeploy -s backend` (or dashboard, Deployments, Redeploy). If the dump predates the release, the migrations run again on boot (Baseline records itself on the existing tables, then the others); expect that.
  7. Run `smoke.sh` (G8), then `unset NEWURL`.

## Verified locally vs unverified

| Item                                                                                                                                                                                                                                 | Status                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prod-counts.sql`: counts, missing-table handling, missing `owner` fails, deterministic, no row values, read-only                                                                                                                    | Verified against throwaway Postgres 18 (tests + manual)                                                                                                                       |
| `seed-cleanup-preview.ts` counts equal the migration's log and row deltas, owner overlap                                                                                                                                             | Verified on synthetic data. Real seed fingerprints were not exercised (the original rows are deliberately not in the repo); G1.8 and G3.2 are the real check.                 |
| `restore-drill.sh` end to end (container tools path), `--keep`, bad dump, existing container, non-local host                                                                                                                         | Verified locally, shellcheck clean                                                                                                                                            |
| `restore-drill.sh` host `psql`/`pg_restore` path                                                                                                                                                                                     | Not exercised locally (no libpq here); first real use is yours                                                                                                                |
| `smoke.sh` pass/404/missing header/robots/commit/connection failure                                                                                                                                                                  | Verified against a local stub, shellcheck clean. **Read-only GETs, but do not run it against production until the release has deployed (the new endpoints 404 before that).** |
| G3.2 to G3.5 (image build, `docker run`, Docker Desktop alternative, old-image rehearsal)                                                                                                                                            | **Unverified on this machine**                                                                                                                                                |
| `railway` flags used (`usage limit set`, `postgres pitr ...`, `variable set --skip-deploys`, `connect --tunnel-only`, `logs -n`, `deployment redeploy`, `add --database`)                                                            | Present in `--help`; behaviour not exercised                                                                                                                                  |
| Marketing production URL                                                                                                                                                                                                             | Unknown: set `MARKETING_URL`                                                                                                                                                  |
| Snapshots on Hobby, `DB_SSL` value, `DATABASE_URL` is a reference, TypeORM 1.1.2 default transaction mode, `RAILWAY_GIT_COMMIT_SHA` at runtime, Railway healthcheck path on rollback, Alt+Deploy behaviour, data-loss recovery steps | Unverified: confirm during execution                                                                                                                                          |
