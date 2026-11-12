# E18 Production operations: plan draft

Status: **draft plan. Nothing has been implemented.** Written 2026-11-12 by a read-only Opus planner against `origin/main` at `e4ff6c3`. I made no edits, no commits and no Railway changes.

**How I gathered evidence.** The Railway MCP tools were not available in this session. I used the logged-in Railway CLI (v5.71) read-only instead: `list`, `status --json`, `deployment list --json`, `variables --json` (I printed key names only, never values), `metrics`, `usage`, `postgres pitr status`, and `backup list` / `schedule list`. I also fetched docs.railway.com pages on 2026-11-12 and ran `gh` read-only.

**Labels.** **V** = verified in code, config, CLI output or docs. **I** = inference.

---

## 0. Findings that change the plan (read these first)

1. **Applying a Railway config or variable change deploys `main` HEAD and skips release gating (V/I).**
   - The backend's active deployment (2026-11-11 14:29 UTC) was created by an environment patch: `patchId` is present and `ignoreWatchPatterns: true`.
   - It built commit `05585b2`, which was `main` HEAD at that moment. It did not build the last release commit `a4eb63b`.
   - So production backend runs 21 commits past `flump/backend-v1.23.0`, none of which were released.
   - Today, any variable or setting change on backend or web that you apply with a normal Deploy would ship unreleased `main`. For backend that includes the three irreversible migrations.
   - Mitigation:
     - Freeze Railway config until PR 368 is handled.
     - Use `railway variable set --skip-deploys` (V, the flag exists), or hold **Alt** while clicking Deploy, which commits staged changes without redeploying (V, staged-changes docs).
     - Take the backup **before** touching any Railway setting.
2. **No backups exist (V).** `railway postgres pitr backup list` returns `[]`, the schedule list returns `[]`, and PITR is `enabled: false` with `bucketWired: false`. The Postgres volume holds 166 MB of a 5,000 MB volume (the Hobby maximum).
3. **Graceful shutdown currently does nothing (V, docs).** Railway sends SIGTERM and then SIGKILL after `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`, which **defaults to 0**. `enableShutdownHooks()` only helps once that variable is set. All three services show `drainingSeconds: null`.
4. **Plan is Hobby (V, deployment metadata `"plan":"hobby"`).** Consequences from the docs:
   - Images are kept for **72 hours** after a deployment is removed. Rollback only works inside that window; after it, you must Redeploy and rebuild.
   - Logs are kept 7 days.
   - Monitors (CPU, RAM and disk alerts) need Pro.
   - Volumes max out at 5 GB.
5. **The workspace has a hard usage limit of $10 and a soft limit of $5 (V, `railway usage`).** Adding staging plus PITR could reach the hard limit, which stops workloads, production included. Raise it before adding staging.
6. **How Wait for CI behaves (V, docs).**
   - It looks at each workflow's overall conclusion, not individual jobs.
   - A failed workflow skips the deployment immediately. Re-running CI afterwards does **not** redeploy; you must use "Deploy Latest Commit".
   - A cancelled run is ignored if another workflow on the same commit passed. So manually cancelling CI on a release commit would let the deploy proceed untested.
   - Anything still running after 2 hours is skipped.
   - The release-please workflow counts as a check suite. If `RELEASE_PLEASE_TOKEN` (a fine-grained PAT) expires, the release-please run fails and every deploy is silently skipped.
7. **Production backend already runs E1 fail-closed auth (V).** `auth.config.ts` is present at `05585b2`. The boot log lists the expected WorkOS issuers. The last 500 backend log lines contain no failing-claim lines (I: this could also mean very little traffic). The issuer risk for PR 368 is lower than assumed but still not pinned.
8. **Healthcheck paths that work with no code change (V, curl against production):** backend `/` returns 200 ("Flump API is running.", and Nest only listens after the DB connects and migrations run), web `/ping` returns 200, marketing `/` returns 200. Backend `/health` returns 404.
9. **Two dependency bots are active (V).** Dependabot vulnerability alerts are on (`GET /vulnerability-alerts` returns 204), and Dependabot opened PR 370, the zod 3 to 4 bump that broke `main`. Renovate is configured in `renovate.json`.
10. **The Renovate PR numbers in the brief were swapped (V).** 335 is remix-i18next v8, **336 is typeorm v1 (abandoned)**, and 338 is react-router v8. `main` already pins `typeorm 1.1.2` (`apps/backend/package.json`), so 336 is obsolete.
11. **Variable hygiene (V for names; values not read):**
    - Backend has `JWT_SECRET`, `FRONTEND_URL` and `WORKOS_REDIRECT_URI`. None of them is read by `apps/backend/src`.
    - Web has no `SESSION_SECRET`. This is harmless because `apps/web/app/session.server.ts` is imported by nothing, so it is dead code, even though the README calls it required.
12. **release-please has no `additional-paths` option (V, checked the official `schemas/config.json`).** N-08 has to be fixed with `node-workspace`, a single root component, or watch patterns (section 8).
13. **Marketing has no robots.txt (V).** `/robots.txt` returns the SPA HTML and there is no `X-Robots-Tag` header. The web app has `noindex` only on `/sandbox` (`apps/web/app/routes/sandbox.tsx:22`).

---

## 1. Current-state inventory

| Area | Fact | Source | V/I |
|---|---|---|---|
| Railway project | One project, `flump`, one environment (`production`), four services: backend, web, marketing, Postgres | `railway list --json` | V |
| Region / replicas | All services in `us-west2`, 1 replica each | deployment `serviceManifest.multiRegionConfig` | V |
| Builders | Dockerfile builds, `apps/<app>/Dockerfile`, `rootDirectory: null` (build context is the repo root) | serviceManifest | V |
| Watch patterns | backend `apps/backend/CHANGELOG.md`, web `apps/web/CHANGELOG.md`, marketing `apps/marketing/CHANGELOG.md` | serviceManifest | V |
| Healthchecks | `healthcheckPath: null` on all three | serviceManifest | V |
| Restart policy | `ON_FAILURE`, max 10 retries, all three | serviceManifest | V |
| Pre-deploy / overlap / draining | All null | serviceManifest | V |
| Wait for CI | On for backend, web and marketing; non-release commits show `SKIPPED` | DECISIONS.md:31; `deployment list` | V |
| Active deployments | backend `05585b2` (patch deploy, unreleased); web and marketing `60cc5cb` (release 2026-11-11 01:25) | `deployment list` | V |
| Postgres | Image `ghcr.io/railwayapp-templates/postgres-ssl:18` (major tag, which PITR requires); volume 166 MB of 5,000 MB; no TCP proxy (no `DATABASE_PUBLIC_URL`) | `status --json`; variable names | V |
| Backups | None; no schedule; PITR off | `railway postgres pitr ...` | V |
| Domains | Railway domains only (`*-production-*.up.railway.app`), no custom domain | `status --json` | V |
| Usage | Period Nov 3 to Dec 3: $0.74 used so far, estimated $1.41; soft limit $5, hard limit $10. Memory over the last day: Postgres 41 MB, web 116 MB, marketing 59 MB, backend 70 MB | `railway usage`, `railway metrics -a` | V |
| Backend variables (names) | `BANKING_TOKEN_ENCRYPTION_KEY CORS_ALLOWED_ORIGINS DATABASE_URL DB_SSL FRONTEND_URL JWT_SECRET NODE_ENV WORKOS_API_KEY WORKOS_CLIENT_ID WORKOS_REDIRECT_URI` plus `RAILWAY_*` | `variables --json \| jq keys` | V |
| Web variables (names) | `VITE_API_URL VITE_WORKOS_CLIENT_ID VITE_WORKOS_REDIRECT_URI WORKOS_API_KEY WORKOS_CLIENT_ID WORKOS_COOKIE_PASSWORD WORKOS_REDIRECT_URI` | same | V |
| Marketing variables (names) | `VITE_APP_URL` | same | V |
| Release PR 368 | Open, checks SUCCESS; changes only the manifest, three CHANGELOGs and three package.json files; 153 commits since `flump/backend-v1.23.0` | `gh pr view 368`; `git rev-list --count` | V |
| Release merge method | Squash (release commits have one parent) | `git log` | V |
| Migrations on `main` | `Baseline1794355200000` (skips if all 8 tables exist, throws on a partial schema), `ClearBankTokens1794355300000`, `RemoveSeededExampleData1794355400000`; both data migrations take `pg_advisory_xact_lock` and re-check the migrations table; every `down()` is a no-op | `apps/backend/src/migrations/*` | V |
| Migration execution | `migrationsRun: strict` (`apps/backend/src/config/db.config.ts:111`); runs inside TypeORM init before `listen`; the CLI never auto-runs (`apps/backend/src/data-source.options.ts`) | code | V |
| Transaction mode | Not set, so TypeORM's default (`all`, one transaction for every pending migration) applies | `apps/backend/src/config/typeorm.options.ts` | I (check the TypeORM 1.1 default) |
| Entity drift | No entity file changed between `flump/backend-v1.23.0` and `origin/main`; `05585b2` registers all 8 entities with `synchronize` | `git diff --stat`; `git show 05585b2:apps/backend/src/app.module.ts` | V (so production should have all 8 tables: I) |
| Backend runtime | `CMD ["bun","dist/main.js"]`; `start` script uses node; port-3000 TCP proxy when `PORT===4000` (`apps/backend/src/main.ts:35-48`); no `enableShutdownHooks`; no health controller (`apps/backend/src/app.controller.ts:8`) | code | V |
| Guards | Applied per controller (`@UseGuards(AuthGuard)`), no global `APP_GUARD`, so a new HealthController is public by default | `git grep` | V |
| Web health | `apps/web/app/routes/ping.tsx` (loader returns 200, `no-store`, but the route also has a UI component) | code | V |
| Web runtime config | Browser reads `window.ENV` (`apps/web/app/root.tsx:88`, `apps/web/app/services/api-client.ts:30`), so per-environment URLs work at runtime without a rebuild | code | V |
| WorkOS redirect | Only localhost overrides `WORKOS_REDIRECT_URI` (`apps/web/app/routes/login._index.tsx:7-13`); deployed environments use the env var | code | V |
| Dockerfiles | Multi-stage; `oven/bun:1-slim` floating tag; root user; no HEALTHCHECK; runner copies the full `node_modules` and `packages/`; hard-coded per-workspace `COPY` lists | `apps/*/Dockerfile` | V |
| .dockerignore | Root has 9 lines and no `.env*`; `apps/web/.dockerignore` exists but is not used because the context is the repo root | `.dockerignore`, serviceManifest | V / I |
| CI | lint (`biome ci`, check:auth, check:laws, test:scripts), check-types, vitest (Postgres 18 service, `REQUIRE_DB_TESTS=1`), build, audit (blocks PRs on high/critical; push and schedule only warn); per-job permissions; timeouts; cancel-in-progress only on PRs; no docker job; no secret scan; actions pinned by tag | `.github/workflows/ci-pipeline.yml` | V |
| Release workflow | `googleapis/release-please-action@v5.0.0` with `RELEASE_PLEASE_TOKEN`; a debug step echoes the outputs | `.github/workflows/release-please.yml` | V |
| release-please config | Three components (apps only), `plugins: []`, one combined PR (`separate-pull-requests: false`) | `release-please-config.json` | V |
| `main` CI | The last two pushes are green (`e4ff6c3`, `f9c3599`) | `gh run list` | V |
| D-12 | WorkOS key, client id, DB password and JWT secret were committed on 2026-06-13 (`ba5e978`, `5d17dc9`). The Railway project was created 2026-11-03, so the production DB password postdates the leak (I). Whether the WorkOS keys were rotated: **unknown** | D-security.md:124-131; `git log`; `railway list` | V / I |
| Observability | No Sentry, pino, winston, request-id or SIGTERM handling anywhere in `apps/` or `packages/`; Nest plaintext logs; Railway tracing off | `git grep`; `status --json` | V |

---

## 2. The pre-PR-368 gate: executable runbook

**Goal:** merge release PR 368 (the first production deploy of 153 commits, including irreversible `ClearBankTokens` and `RemoveSeededExampleData`) with a verified backup, a rehearsed migration, a rollback path, a healthcheck and a smoke test.

**Roles.** The owner is the only person who can do G1 to G4 and G6 to G8 (dashboard access, production credentials, production data). Agents prepare the scripts and code (tasks A-01 to A-04). **Agents must never receive the production dump, the tunnel password or any variable value.**

Run every command from a clean clone on the owner's machine. `railway` is already linked to project `flump`, environment `production` (V).

### G0. Preconditions (owner, 10 min)
- [ ] Decisions D1 (staging before 368) and D7 (deploy order) are made (section 18).
- [ ] **Railway config freeze:** no variable or setting changes on backend or web from now until G6. If unavoidable, use `--skip-deploys` or Alt+Deploy.
- [ ] Code prerequisites A-02 to A-04 are merged to `main`. release-please then refreshes PR 368 automatically. After that, **freeze `main`**: no more merges until G7, so the image you rehearse is the image you ship.
- [ ] `gh pr checks 368` is all green, and `gh run list --branch main --limit 2` shows success.
- [ ] Pick a two-hour window when nobody else is using the app (owner only, today).
- [ ] Install tools: `brew install libpq` (pg_dump/pg_restore 18), then `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"; pg_dump --version` must show 18.x. Docker (OrbStack) is running.

### G1. Read-only production checks (owner, 20 min)
1. **Variable values (dashboard, look only).**
   - backend `NODE_ENV` = `production`.
   - `DB_SSL` is `false` or `no-verify`. Not unset and not `true`: unset or `true` verifies the certificate, and the `postgres-ssl` image uses a self-signed one (I), so boot would fail.
   - `DATABASE_URL` is the **reference** `${{Postgres.DATABASE_URL}}` (private host `*.railway.internal`), not pasted text.
   - `BANKING_TOKEN_ENCRYPTION_KEY` is 32+ characters and not the example text.
   - `WORKOS_CLIENT_ID` is present.
   - `CORS_ALLOWED_ORIGINS` contains `https://web-production-845e6c.up.railway.app`.
2. **Open a tunnel** (terminal 1): `railway connect Postgres --tunnel-only`. It prints host, port, user, password and database. **Do not paste these into any chat or agent.**
3. Terminal 2: `export PGURL='postgresql://<user>:<password>@localhost:<port>/<db>'`
4. **Schema check:** `psql "$PGURL" -c '\dt'`. Expect exactly the 8 tables `accounts, account_details, bank_connections, budget_entries, mcp_tokens, tax_records, transactions, user_profiles`, with no `migrations` table. If any of the 8 is missing, **stop**: Baseline would throw "partial schema" and the backend would crash-loop.
5. **Counts:** `psql "$PGURL" -v owner='<your WorkOS user id>' -f scripts/ops/prod-counts.sql | tee ~/flump-backups/prod-before.txt`. The script comes from A-01: row counts per table, `bank_connections` grouped by status with token counts, rows owned by `user_mock`/`dev_user_123`, the owner's own rows per table, and `to_regclass('public.migrations')`.
6. **Expected cleanup counts:** `psql "$PGURL" -f <(bun scripts/ops/seed-cleanup-preview.ts) | tee ~/flump-backups/cleanup-preview.txt`. A-01 writes this script: it prints `SELECT count(*)` versions of the migration's DELETEs, built from the exported constants in `RemoveSeededExampleData1794355400000.ts`. **The owner's own rows must not appear in the fingerprint matches.**
7. **Decode one real WorkOS access token safely** (no online decoder, nothing pasted to an agent):
   - Sign in at the production web app.
   - Open DevTools, then Network, then any request to `backend-production-184b.up.railway.app`, and copy the `Authorization` header value without the `Bearer ` prefix.
   - `pbpaste | bun -e 'const t=(await Bun.stdin.text()).trim().split(".")[1];const p=JSON.parse(Buffer.from(t,"base64url").toString());console.log({iss:p.iss,aud:p.aud,exp:new Date(p.exp*1000).toISOString()})'; pbcopy </dev/null`
   - Compare `iss` with the boot log line: `railway logs -s backend -n 500 | grep "expected token issuers"`. Record the issuer in the runbook; it is not a secret.

### G2. Backups (owner, 15 min). This must happen before any Railway change.
1. **Railway-native snapshot:**
   ```bash
   railway postgres pitr backup create -s Postgres --name pre-pr368
   railway postgres pitr backup list -s Postgres --json   # note the id
   railway postgres pitr backup lock <id> -s Postgres     # never expires
   ```
   Backup availability on Hobby is **unverified**. The docs do not gate it by plan, and `list` works. If `create` errors, continue with the logical dump: it is mandatory either way.
2. **Logical dump (offsite, portable):**
   ```bash
   mkdir -p ~/flump-backups && chmod 700 ~/flump-backups
   STAMP=$(date -u +%Y%m%dT%H%MZ)
   pg_dump "$PGURL" --format=custom --no-owner --file ~/flump-backups/prod-pre-pr368-$STAMP.dump
   pg_dump "$PGURL" --schema-only --no-owner --file ~/flump-backups/prod-schema-pre-pr368-$STAMP.sql
   pg_restore --list ~/flump-backups/prod-pre-pr368-$STAMP.dump | grep -c "TABLE DATA"   # expect 8
   shasum -a 256 ~/flump-backups/*pre-pr368* > ~/flump-backups/SHA256SUMS
   ```
   Make a second copy on encrypted storage (FileVault disk plus an encrypted external drive, or `age -r <pubkey>` before any cloud upload). The dump contains the owner's financial data, encrypted bank tokens and PAT hashes.
3. **Turn on schedules:** `railway postgres pitr schedule set -s Postgres --daily --weekly`. Retention: daily kept 6 days, weekly 27 days (V, docs). This is a Postgres service change and may redeploy Postgres, which means a few seconds of DB downtime (volume services cannot overlap, V). Doing it after the dump is fine.

### G3. Restore drill and migration dry run (owner, 45-60 min; A-01 provides `scripts/ops/restore-drill.sh` to automate this)
Railway volume backups can only be restored into the same project and environment, onto the live volume (V). So the drill uses the logical dump.
```bash
docker run -d --name flump-drill -e POSTGRES_PASSWORD=drill_local_only -e POSTGRES_DB=flump_drill -p 55433:5432 postgres:18-alpine
DRILL=postgres://postgres:drill_local_only@localhost:55433/flump_drill
time pg_restore --dbname "$DRILL" --no-owner --exit-on-error ~/flump-backups/prod-pre-pr368-*.dump   # record the seconds: this is restore RTO
psql "$DRILL" -v owner='<id>' -f scripts/ops/prod-counts.sql > ~/flump-backups/drill-before.txt
diff ~/flump-backups/prod-before.txt ~/flump-backups/drill-before.txt   # expect no differences
```
**Dry-run the release image against the restored copy** (the same path production takes at boot):
```bash
git fetch origin release-please--branches--main && git switch --detach origin/release-please--branches--main
docker build -f apps/backend/Dockerfile -t flump-backend:pr368 .
docker run --rm --name be-pr368 --network host \
  -e NODE_ENV=production -e PORT=4400 \
  -e DATABASE_URL="$DRILL" -e DB_SSL=false \
  -e BANKING_TOKEN_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  -e WORKOS_CLIENT_ID='<public client id>' \
  flump-backend:pr368
```
- `--network host` (OrbStack supports it) keeps the host `localhost`, so no TLS is attempted.
- Expect, in order: TypeORM migration logs for 3 migrations, then `Removed seeded example data: taxRecords=… accounts=… budgetEntries=… mockIdentityRows=…`. These numbers must match `cleanup-preview.txt`. Then Nest start.
- `curl -fsS localhost:4400/` returns 200 (and `localhost:4400/health/ready` returns 200 once A-02 is in).
- `psql "$DRILL" -c 'SELECT name FROM migrations ORDER BY id'` shows 3 rows.
- Re-run counts into `drill-after.txt`. Expect: `bank_connections` token counts 0, rows of `user_mock`/`dev_user_123` 0, **owner rows unchanged apart from fingerprinted seed rows**.
- Stop the container (Ctrl+C, which also exercises shutdown) and start it again. Expect no new migration rows: `SELECT name, count(*) FROM migrations GROUP BY 1 HAVING count(*)>1` returns nothing.

**Rollback rehearsal** (proves the old image can run on the migrated schema):
```bash
git switch --detach 05585b2 && docker build -f apps/backend/Dockerfile -t flump-backend:old .
pg_dump "$DRILL" --schema-only > /tmp/before-old.sql
docker run --rm --network host -e NODE_ENV=production -e PORT=4401 -e DATABASE_URL="$DRILL" \
  -e WORKOS_CLIENT_ID='<id>' flump-backend:old    # boots with synchronize:true; curl localhost:4401/ -> 200
pg_dump "$DRILL" --schema-only > /tmp/after-old.sql && diff /tmp/before-old.sql /tmp/after-old.sql   # expect no diff; migrations table intact
docker rm -f flump-drill
```
Record: dump size, restore seconds, migration seconds, the counts, and pass/fail, in `docs/runbooks/drill-log.md`. Write counts only, never row data.

### G4. Staging rehearsal (owner, 60-90 min; only if D1 = A)
Follow section 3 "first-time setup", restore the same dump into staging Postgres, and deploy staging from `main`. Pass criteria:
- the backend log shows the same cleanup counts as G3;
- signing in at the staging web URL works;
- the smoke list (G8) passes on staging.

This rehearses the Railway-specific pieces that a local drill cannot: `DB_SSL` on the private network, references, healthchecks, and the WorkOS redirect.

### G5. Final head check (agent or owner, 5 min)
If any backend file changed between the G3 image and the current PR 368 head (`git diff <G3 sha> origin/release-please--branches--main -- apps/backend packages/banking packages/mcp packages/finance-engine`), repeat the G3 dry run.

### G6. Railway config, without deploying (owner, 10 min; after G2)
```bash
railway variable set -s backend RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15 --skip-deploys
railway variable set -s web     RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15 --skip-deploys
railway variable set -s backend WORKOS_ISSUER='<iss from G1.7>' --skip-deploys   # optional pin; it REPLACES the defaults, so copy it exactly
```
- **Healthchecks (dashboard):** backend `/health/ready` (or `/` if A-02 is not merged), web `/healthz` (or `/ping`), marketing `/healthz` (or `/`). Leave the timeout at the default 300 s. Commit the staged changes with **Alt+Deploy** (commit without redeploy, V docs).
- Then run `railway deployment list -s backend --limit 2` and check that no new deployment started. If one did start, it is deploying `main` HEAD, which equals the release content; you are covered by G2, so watch it as if it were G7.
- Raise the hard usage limit: `railway usage limit set ...` (check the flags with `--help`), or in the dashboard, to $25.
- Add a project webhook (Project Settings, Webhooks) pointing at a Discord or Slack channel on your phone (V, Muxer support). Crash emails go to project members by default (V).

### G7. Merge and watch (owner, 20 min)
```bash
gh pr merge 368 --squash          # keep the title "chore(main): release"
gh run list --branch main --limit 3 && gh run watch <ci-run-id>
railway deployment list -s backend --limit 2   # WAITING -> BUILDING -> DEPLOYING -> SUCCESS
railway logs -s backend -d                     # migrations, cleanup counts, "Nest application successfully started"
```
- **Order:** with D7 = A, all three services build in parallel from the same commit (V: one commit changes all three CHANGELOGs). With healthchecks on, the old backend keeps serving until the new one passes. If the backend fails, roll back web too (see the rollback section).
- **If CI fails on the merge commit**, the deployments are SKIPPED (V). Fix forward on `main`, or re-run CI and then use Command Palette, "Deploy Latest Commit", per service.

### G8. Smoke test (owner, 10 min; A-01 provides `scripts/ops/smoke.sh` for the HTTP part)
- `bash scripts/ops/smoke.sh production`:
  - backend `/` and `/health/ready` return 200, and the response body contains the new commit SHA;
  - web `/healthz` and `/ping` return 200;
  - marketing `/` returns 200;
  - `X-Robots-Tag: noindex` is present on web and marketing (if A-04 is merged);
  - `/robots.txt` disallows all.
- Manual:
  - sign in;
  - the dashboard loads the owner's data;
  - the accounts list renders;
  - add and delete a test budget entry;
  - bank connections show a reconnect or error state with no tokens in the network response;
  - the MCP tokens page loads;
  - marketing home renders.
- DB: re-run `prod-counts.sql` (read-only) into `prod-after.txt` and diff it against `drill-after.txt`. Expect equal, apart from rows written since the dump.

### G9. Watch window
- **Who watches:** the owner (the only operator). Optionally, an agent session the owner starts can run `railway logs -s backend` read-only and summarise errors. Never give it variable values.
- 30 minutes of active watching, then a check at 24 hours: `railway logs -s backend -n 1000 | grep -iE "error|exception|unauthor"`.
- Record deploy duration and outcome in `docs/runbooks/deploy-log.md`.

### Rollback plan for PR 368
- **Irreversible no matter what:** `ClearBankTokens` nulls every token (users reconnect) and `RemoveSeededExampleData` deletes the fingerprinted rows and all rows of the mock identities. `Baseline` only records itself on production. The only undo is restoring the G2 backup.
- **Backend fails at boot** (migration error, bad env):
  - *With* a healthcheck: the new deployment never takes traffic and the old one (`05585b2`) keeps serving (V, docs). The single-transaction mode (I: TypeORM default `all`) means nothing is half-applied.
  - Read `railway logs -s backend -d`, then fix forward with a new commit and a new release.
  - *Without* a healthcheck: Railway restarts up to 10 times, so expect a crash-loop outage. **Roll back immediately** (Deployments, the last good deployment, "...", Rollback). Hobby keeps images for **72 hours**; after that, Redeploy rebuilds `05585b2`.
- **Web broken, backend fine:** roll back web only to the `60cc5cb` deployment.
- **Code rollback after migrations succeeded:** the old backend boots on the migrated schema (rehearsed in G3).
  - Caveat: the old code seeds example data on GET again. Those rows will not be removed automatically, because the cleanup migration is already recorded.
  - **Never delete rows from `migrations`.** Re-running `ClearBankTokens` would wipe reconnected tokens; the README warns about this. Clean up with a new forward migration.
- **Data loss discovered:**
  - Volume-backup restore: Backups tab, Restore, review the staged volume swap, Deploy. Data written after the backup is lost; acceptable with one user.
  - Or `pg_restore` the logical dump into a new database and repoint `DATABASE_URL`.
  - Either way, then redeploy the backend.

---

## 3. Staging environment design

**Shape:** a persistent Railway environment `staging` in the same project, created with **Duplicate Environment**. That copies services, variables and configuration as staged changes that you review before deploying (V, docs).

| Item | Design |
|---|---|
| Services | backend, web, marketing, Postgres (its own volume; I: duplicating does not copy volume data, so check it is empty) |
| Database | Separate Postgres. For the PR 368 rehearsal, restore the production dump (D4). Afterwards, either refresh from production monthly or switch to a synthetic seed once real users exist (E19). Daily backup schedule only. |
| Variables to change before the first deploy | backend: `DATABASE_URL` must be the `${{Postgres.DATABASE_URL}}` reference (private networks are per environment, I); new `BANKING_TOKEN_ENCRYPTION_KEY` (`openssl rand -hex 32`); `NODE_ENV=production`; `CORS_ALLOWED_ORIGINS=<staging web origin>`; delete `JWT_SECRET`, `FRONTEND_URL`, `WORKOS_REDIRECT_URI`. web: `VITE_API_URL=<staging backend URL>` (read at runtime through `window.ENV`, V); `WORKOS_REDIRECT_URI` and `VITE_WORKOS_REDIRECT_URI` = `<staging web>/callback`; new `WORKOS_COOKIE_PASSWORD`. marketing: `VITE_APP_URL=<staging web>`. Add `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15`. |
| WorkOS | The leaked key had an `sk_test_` prefix, which means a WorkOS **Staging** environment (I). Short term: staging uses the same WorkOS environment as production, with the staging `/callback` added to its redirect URIs in the WorkOS dashboard. At public launch (E24): production moves to a WorkOS **Production** environment with new keys, and staging keeps WorkOS Staging. |
| Trigger | Staging services track `main` with **no watch patterns** and Wait for CI on, so every green `main` commit deploys to staging. Production still deploys only on release-PR merges. "Every release goes to staging first" then holds by construction: everything in a release ran on staging before the release PR merged. Alternative: track the `release-please--branches--main` branch, so staging runs exactly the release candidate, but staging is then empty between releases. |
| Promotion | Merging the release PR promotes. No artefact promotion: Railway rebuilds per environment from the same commit, and the Docker builds are deterministic enough (I). A pinned base image (task A-06) narrows the gap. |
| Known gaps | Marketing hard-codes `web-production-845e6c.up.railway.app` (`apps/marketing/server.ts:105-107`, `apps/marketing/src/utils/url.ts:23,38`, N-11), so staging marketing links to production web until that becomes config. |
| Cost | About +$2.5 to $4 a month of usage at today's footprint (roughly 290 MB RAM at $10/GB-month, plus a tiny volume). Builds are free (V). |
| PR environments | **Not worth it now.** Each PR would clone the full stack, including Postgres, with no data. WorkOS redirect URIs differ per PR domain, so sign-in would be broken unless wildcards are allowed (unverified). Bot PRs add noise. Revisit with Focused PR Environments (V, they deploy only affected services) once E21 contract tests exist. |

**First-time setup** (owner):
1. `railway environment new staging --duplicate production`. Stage only; review everything before deploying.
2. Fix the variables per the table. Generate domains for the three services.
3. Deploy Postgres alone. Run `railway connect Postgres --environment staging --tunnel-only`, then `pg_restore --no-owner --exit-on-error` the dump.
4. Deploy backend and watch the migrations, then web and marketing.
5. Add the staging callback in WorkOS.
6. Set healthchecks the same as production.

---

## 4. Health, readiness, graceful shutdown, Railway settings

- **Backend** (task A-02): a minimal `HealthController` in `apps/backend/src/health/health.controller.ts`. No `@nestjs/terminus`: it is an extra dependency with uncertain compatibility with Nest 12, and about 40 lines do the job.
  - `GET /health` is liveness: `{status:"ok"}` with no DB call.
  - `GET /health/ready` runs `SELECT 1` through the injected `DataSource` with a 2 s timeout. It returns 200 `{status:"ok", version, commit}`, or 503 `{status:"unavailable"}` with no error text.
  - `version` comes from `apps/backend/package.json`. `commit` is the first 7 characters of `RAILWAY_GIT_COMMIT_SHA` (I: Railway injects this for GitHub deploys; fall back to `"unknown"`).
  - Never include env names, hostnames, the DB version, stack traces or user counts.
  - No auth guard. The pattern is fine because guards are per controller (V).
  - Add `Cache-Control: no-store`.
- **Web** (A-04): resource route `apps/web/app/routes/healthz.ts` (loader only, no component, so the colocation law does not apply). It returns JSON as above and **does not call the backend**, so a backend outage does not fail web deploys. Keep `/ping` until the uptime monitors move.
- **Marketing** (A-04): `app.get("/healthz")` in `apps/marketing/server.ts`, before the SPA catch-all. Add `/robots.txt` (Disallow: /) and an `X-Robots-Tag: noindex, nofollow` header, unless `ALLOW_INDEXING=true` is set. Do the same header in web. This is E24's to remove deliberately at launch.
- **Graceful shutdown** (A-03): `app.enableShutdownHooks()` in `apps/backend/src/main.ts` so TypeORM closes the pool on SIGTERM. Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15` (the default is 0, V).
  - Web and marketing start through `bun run start`. A package-manager parent can swallow SIGTERM (V for npm/yarn/pnpm in the Railway docs; **unverified for `bun run`**). A-06 changes `CMD` to exec the server directly (`["bun","./node_modules/.bin/react-router-serve","./build/server/index.js"]` for web, the equivalent for marketing).
- **Railway healthcheck config:**
  - Paths as above, default 300 s timeout. Healthchecks only gate the deploy and do not monitor continuously (V).
  - Requests arrive with host `healthcheck.railway.app` (V). Nothing in the code filters by host (I).
  - Healthchecks target the injected `PORT` (V). Backend listens on `PORT ?? 4000` and web's react-router-serve uses `PORT`.
- **Restart policy:** keep `ON_FAILURE`. On paid plans the retry count is configurable (V); set backend to 3, so a boot-time migration failure stops quickly instead of looping 10 times (each loop retries the migration transaction). Web and marketing stay at 10.
- **Overlap:** the default is fine. Backend has no volume, so zero-downtime overlap works. Postgres deploys always have a short gap (V).

---

## 5. Observability

**Error tracking (D5).** Recommendation: Sentry SaaS, **EU data region** (chosen at organisation creation), Developer free tier. From memory and unverified: 1 user, about 5k errors a month, 30-day retention; check sentry.io/pricing.

Alternatives:
- GlitchTip (Sentry-compatible): hosted free tier, or self-hosted on Railway for about $3-5 a month.
- Better Stack: errors, logs and uptime in one tool; free tier limits unverified.
- No vendor, Railway logs only: 7-day retention and no grouping.

How to wire it:
- **Backend** (A-13): `@sentry/node` (or `@sentry/nestjs`) initialised in `apps/backend/src/instrument.ts`, imported first in `main.ts`. A global exception filter reports **5xx only**.
  - `sendDefaultPii:false`, `tracesSampleRate:0`, no profiling.
  - `beforeSend` and `beforeBreadcrumb` call a pure `scrubEvent()` (`apps/backend/src/observability/scrub.ts`) that drops the request body, cookies, the `authorization` header and query strings, and redacts keys matching `/token|secret|password|authorization|cookie|balance|amount|salary|iban|sort.?code|account.?number|receipt/i`.
  - Risk: the backend runs on **Bun**. Sentry's Node SDK relies on OpenTelemetry auto-instrumentation, which is partly unsupported on Bun (I). Capture through the explicit filter and test on staging. If capture fails, switch the backend `CMD` to node (`package.json` `start` already uses node).
- **Web** (A-14): `@sentry/react-router` (server and client).
  - No Session Replay, no console breadcrumbs, URL breadcrumbs with the query stripped (the OAuth `?code=` must never be captured).
  - Same scrubber, plus `denyUrls` for extensions.
  - Hash or omit the user id; never send email or name.
- **Never captured:** WorkOS access and refresh tokens, `wos-session` and session cookies, OAuth `code`, bank access and refresh tokens (even encrypted), MCP PATs and their hashes, `BANKING_TOKEN_ENCRYPTION_KEY`, any balance, amount, salary, tax record or receipt data, names, emails, request or response bodies.
- **Tests:** unit tests feed `scrubEvent` sample events containing each forbidden field and assert they are removed, plus a guard test that `Sentry.init` is called with `sendDefaultPii:false`.

**Structured logging** (A-12):
- Use Nest's built-in `ConsoleLogger` with `json: true` (I: Nest 11+ feature; confirm on 12.4) rather than adding pino.
- Railway parses JSON log lines into searchable attributes (V, the structured-logging guide exists; field details unverified).
- Request middleware (`apps/backend/src/observability/request-context.middleware.ts`):
  - takes `x-request-id` if it is a valid UUID, otherwise generates one;
  - echoes it in the response header;
  - logs one line per request: `{requestId, method, route (path template, not the raw URL), status, durationMs}`;
  - never logs query strings, headers or bodies.
- Redaction is by construction: the code only logs allow-listed fields.
- A test asserts that the access-log line for a request carrying `Authorization` and `?token=` contains neither.
- Web: the same pattern in the server entry, if one exists (I: the default react-router-serve has no hook; may need a custom server, so M effort, Phase 3).

**Uptime and alerting** (owner task O-08): Better Stack Uptime free tier (unverified: 10 monitors, 3-minute interval) or UptimeRobot. Note that UptimeRobot's free plan may now be non-commercial only (unverified).
- Monitors: backend `/health/ready`, web `/healthz`, marketing `/healthz`, alerting by email and phone push.
- A healthchecks.io heartbeat for the backup cron.

**Railway alerts:**
- A project webhook to Discord or Slack for `Deployment.failed` and crashed events (V).
- Crash emails to members (V).
- Monitors (CPU, RAM, disk, egress thresholds) need **Pro** (V).
- There are no log-based alerts on Railway (I). Use Sentry for errors.

**Metrics:** Railway's built-in CPU, memory, network and HTTP metrics (`railway metrics --http`, V) are enough for a one-person product. No Prometheus.

**Retention:** Railway logs 7 days on Hobby, 30 on Pro (V). Sentry 30 days (unverified). For longer retention, ship logs (Railway guide `ship-logs-third-party`) only after redaction exists. Not needed before launch.

---

## 6. Backups and disaster recovery

- **Targets for a one-person product:**
  - **Private beta:** RPO 24 h (daily snapshots), RTO 2 h (restore plus verify, done by the owner).
  - **Public launch:** RPO 5 min (PITR with `archive_timeout=60`, V), RTO 2 h.
- **Layers (D9):**
  1. Railway volume backups, daily and weekly (G2.3). Cheap, incremental, billed at the volume rate (V). They do **not** survive deleting the volume (V).
  2. **An offsite encrypted logical dump, weekly** (A-16 and O-12):
     - A Railway cron service (`ops/backup/Dockerfile` based on `postgres:18-alpine`, plus `backup.sh`) runs `pg_dump "$DATABASE_URL"` over the private network.
     - It pipes the dump through `age -r <owner public key>` and uploads to Cloudflare R2 or Backblaze B2 (outside Railway, so it survives losing the project).
     - It pings healthchecks.io on success and prunes objects older than 90 days.
     - Cron runs in UTC with a 5-minute minimum granularity, and overlapping runs are skipped (V).
  3. **PITR at public launch** (O-13): `railway postgres pitr enable -s Postgres`. This creates a bucket and redeploys Postgres. The window is about 4 weeks. A restore creates a sibling service and leaves the source untouched (V), so a restore drill is non-destructive. Bucket storage costs about $0.015/GB-month (V); there is no PITR fee.
- **Restore drill cadence:** before every irreversible migration; monthly for the first 3 months; then quarterly. Use `scripts/ops/restore-drill.sh` against the newest offsite dump, plus once a PITR sibling restore after PITR is on. Log the duration and the backup's age.
- **Region:** everything is in `us-west2` (V). The E19 data-region decision may move it. Moving is far cheaper now, while the DB is 166 MB.

---

## 7. Migration policy (A-17 writes `docs/runbooks/migrations.md` plus a PR template section)

1. **Forward only.** `down()` may be a no-op but must say why. Never run `migration:revert` in production (the README already warns about this). Fix forward with a new migration. Data loss is fixed by restoring from backup.
2. **Expand and contract.** During a deploy, the old and new app versions both run against the new schema: old code during the healthcheck overlap, and old code again after a rollback. So every migration must work with the **previous** release.
   - Add nullable columns or new tables, then deploy code that writes both, then backfill, then switch reads, then drop in a later release.
   - Never rename or drop in the same release as the code change.
3. **Destructive migrations** (DELETE, UPDATE without a key, DROP, TRUNCATE, or ALTER ... TYPE):
   - need a `-- destructive: approved-by-owner <date>` marker in the file;
   - need a backup id in the PR description;
   - need a restore-drill entry.
   - A CI check (`scripts/check-migrations.ts`, ratchet style like `check:laws`) fails on new migration files containing those statements without the marker.
4. **Concurrency.** Keep the shared `MIGRATION_LOCK_KEY` (`apps/backend/src/config/migration-lock.ts`) and the self re-check pattern from `ClearBankTokens`. One replica until preDeploy migrations exist.
5. **Testing against production-like data in CI** (A-17):
   - Commit `apps/backend/src/migrations/__fixtures__/prod-schema.sql`, a **schema-only** dump from G2 with no data, so no PII.
   - Add a spec to `migrations.integration.spec.ts` that loads it into the CI Postgres service, runs every migration, and asserts that the resulting schema matches the entities (the existing drift check, extended with column defaults and indexes per the E3 ledger follow-ups).
   - Add a synthetic data seed covering the fingerprint, mock-identity and owner-like rows.
   - Refresh the fixture after every release that changes the schema.
6. **Failure at boot.**
   - Today the migration runs inside TypeORM init before `listen`. On failure Nest throws, the process exits non-zero, and Railway restarts it. With a healthcheck, the old deployment keeps serving. **Fail fast:** set restart retries to 3 on backend.
   - **Target (D6-B, A-18):**
     - Railway `preDeployCommand`: `cd apps/backend && bun ../../node_modules/typeorm/cli.js -d dist/data-source.js migration:run`. The hoisted path of `typeorm/cli.js` in the image is **unverified**; check with `docker run --rm --entrypoint ls flump-backend:pr368 /app/node_modules/typeorm/cli.js`.
     - Set a pre-deploy timeout of 600 s.
     - Add a `DB_MIGRATIONS_RUN=false` override in `resolveDbConfig` (default stays true).
     - Pre-deploy failures never start the new deployment (V) and keep the migration off the healthcheck path. Pre-deploy runs in a separate container with private networking and env vars (V).

---

## 8. Deploy and release process

- **Flow today (V):**
  1. Conventional commits land on `main`.
  2. release-please (with a PAT) maintains a combined release PR.
  3. CI runs on that PR.
  4. A squash merge changes `apps/*/CHANGELOG.md`.
  5. Railway's watch patterns match; Wait for CI holds the deploy; all three services deploy.
- **Red `main`:** non-release commits never deploy (SKIPPED, V). A red release merge commit is skipped too, but release-please has already created tags and GitHub releases for code that is not live. Recovery: fix forward, then "Deploy Latest Commit" (runbook). The audit job does not block `main` on advisories (V, by design) but does block on its config-error exit code.
- **Risks to cover in the runbook:**
  - The PAT expiring, which skips every deploy. Mitigation A-21: switch to a GitHub App token via `actions/create-github-app-token`, or put a calendar reminder 2 weeks before expiry.
  - A manually cancelled CI run on a release commit, which does not block the deploy (V).
  - The 2-hour CI limit (V; current jobs are 25 minutes or less).
- **N-08, shared packages do not trigger a deploy (D3).** Workspace dependencies (V): backend uses banking, finance-engine and mcp; web uses banking, finance-engine and ui; marketing uses finance-engine and ui; mcp and ui use finance-engine.
  - **A. One root release component.** `release-please-config.json` gets `"packages": {".": {...}}`. The manifest becomes `{".": "<next>"}`, reusing the root `package.json` (1.18.0) and root `CHANGELOG.md`. Each Railway service watches `CHANGELOG.md` (root). Any releasable commit anywhere deploys all three. Simple and matches "one product". Per-app versions are lost.
  - **B. `node-workspace` plugin.** Add `packages/finance-engine`, `packages/ui`, `packages/banking` and `packages/mcp` as components with `plugins: [{type:"node-workspace"}]`, so a package release bumps its dependents' CHANGELOGs. Risk: `workspace:*` dependency specs may not be handled well by the plugin (unverified). Needs a dry-run spike: `npx release-please release-pr --dry-run --repo-url=... --token=...` on a branch.
  - **C. Widen Railway watch patterns** to `apps/<app>/** , packages/<deps>/**` and deploy on merge. This breaks the release gate, because every commit to a package deploys `main` HEAD.
  - **Recommendation:** A, done **after** PR 368 merges, so the first deploy is not disturbed. The owner changes the three watch patterns in the same sitting (with Alt+Deploy).
- **Config as code (optional, Phase 3):** `apps/<app>/railway.json` carrying `build.watchPatterns`, `deploy.healthcheckPath`, `restartPolicyType`, `preDeployCommand` and `drainingSeconds` (keys V in the config-as-code reference). Each service's config-file path must be set in the dashboard. Railway's newer `railway config` IaC (`.railway/railway.ts`) exists (V) and is unexplored; only consider it after staging works.

---

## 9. Docker hardening (A-06 and A-07)

- **Base image:** `FROM oven/bun:1.4.4-slim@sha256:<digest>`, matching `packageManager: bun@1.4.4` (V). Renovate maintains the digest (`docker:pinDigests`).
- **Non-root:** the final stage uses `COPY --chown=bun:bun …` and `USER bun` (the image ships a `bun` user per N-05, I). No app writes to the filesystem (I; check marketing's static serving).
- **HEALTHCHECK** (used locally and in CI; Railway uses its own path check, I): `HEALTHCHECK --interval=30s --timeout=3s CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`. There is no curl in the slim image.
- **Production dependencies only:** add a `prod-deps` stage running `bun install --production --frozen-lockfile --ignore-scripts` and copy only that stage's `node_modules`. Check that the marketing runtime still resolves `vite`, which `apps/marketing/server.ts` imports at the top level even in production (V). Marketing may need `vite` moved to dependencies or a lazy import. Evaluate `turbo prune --docker` later (bun.lock support unverified).
- **Exec form CMD** (signals reach the server directly): see section 4.
- **`.dockerignore` (root):** add `**/.env`, `**/.env.*`, `!**/.env.example`, `**/coverage`, `**/storybook-static`, `docs`, `.github`, `.husky`, `.claude`, `.agents`, `apps/mobile-companion/**` with `!apps/mobile-companion/package.json` (the Dockerfiles copy it, V). Delete the unused `apps/web/.dockerignore`.
- **CI job `docker`** (in `.github/workflows/ci-pipeline.yml`):
  - A matrix over backend, web and marketing using `docker/build-push-action` (SHA-pinned) with `push:false` and GHA cache.
  - Fail if image size exceeds a recorded budget (`docker image inspect -f '{{.Size}}'`; first run records the baseline).
  - Fail if `docker run --rm --entrypoint sh img -c 'ls -a /app/apps/*/.env* 2>/dev/null'` finds anything.
  - **Backend container smoke test:** start the image with `NODE_ENV=production` against the job's Postgres service (empty DB, so Baseline creates the tables) and wait for `curl -fsS localhost:4000/health/ready`. This proves production-mode boot plus migrations on every PR.
  - Runs on PRs and `main`, and so becomes part of Wait for CI. Expect about 5-10 extra minutes.
- **Remove the port-3000 TCP proxy** (`apps/backend/src/main.ts:35-48`, D-14) in Phase 2, after confirming no client uses `:3000`. Production calls the public domain (I).

---

## 10. Supply chain

- **Secret scanning** (A-08): a CI job running a pinned gitleaks binary or the `zricethezav/gitleaks:<version>@sha256` image (no licence needed). The `gitleaks-action` needs a licence only for organisation-owned repos; this repo is user-owned (I).
  - Command: `gitleaks git . --log-opts="<base>..<head>" --redact --exit-code 1` on PRs and pushes.
  - The owner runs a one-off full-history scan locally (`gitleaks git . --redact --report-path ~/gitleaks.json`). After rotating the D-12 secrets, add those findings' fingerprints to `.gitleaksignore`; history is not rewritten, per owner decision.
  - GitHub secret scanning and push protection are not available on a free private repo (I: needs Advanced Security).
- **One dependency bot (D8). Recommendation: Renovate only.**
  - Owner (O-09): Settings, Code security, turn **off** Dependabot security updates. Keep Dependabot **alerts**, which are free and informational.
  - A-09 edits `renovate.json`:
    - `osvVulnerabilityAlerts: true`, plus `vulnerabilityAlerts: {labels:["security"]}`;
    - `helpers:pinGitHubActionDigests` and `docker:pinDigests`;
    - `dependencyDashboardApproval: true` for majors;
    - a `packageRules` group "react-router v8" covering `react-router`, `@react-router/*`, `remix-i18next` and `@workos-inc/authkit-react-router`.
- **Triage of the red Renovate PRs:**
  - **336 typeorm v1 (abandoned): close.** `main` is already on 1.1.2 (V).
  - **335 remix-i18next v8 and 338 react-router v8: close with a comment** linking a new ticket, "React Router 8 migration". The branches have very stale bases (their diffs include the whole `.agents/` tree, V) and depend on each other and on `@workos-inc/authkit-react-router@0.13.0` compatibility (unverified). Renovate recreates them as one group behind dashboard approval. Do not do this before PR 368.
  - **Policy:** majors wait for dashboard approval and a ticket; minor and patch updates are grouped weekly and merged when green; security fixes are merged within 7 days (high or critical within 48 hours), or a time-boxed `audit-allowlist.json` entry is added (the existing E11 mechanism).
- **Pin actions by SHA** (A-10): `actions/checkout@v7.0.1`, `oven-sh/setup-bun@v2.2.0`, `actions/cache@v6.1.0`, `felixmosh/turborepo-gh-artifacts@v4.1.1`, `davelosert/vitest-coverage-report-action@v2.13.2` and `googleapis/release-please-action@v5.0.0` become `@<sha> # vX`. The files are `ci-pipeline.yml`, `release-please.yml` and `.github/actions/bun-setup/action.yml`. Renovate then maintains them.
- **npm provenance:** not applicable. Nothing is published, and npm provenance needs a public source repository (I). Revisit only if E17 publishes `@flump/mcp`.

---

## 11. Secrets management and rotation

- **Inventory and storage:**
  - Railway variables: backend `WORKOS_API_KEY`, `BANKING_TOKEN_ENCRYPTION_KEY`, `DATABASE_URL` (reference); web `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`; Postgres `POSTGRES_PASSWORD`/`PGPASSWORD`.
  - GitHub secrets: `RELEASE_PLEASE_TOKEN`, `TURBO_TOKEN`.
  - Future: Sentry DSN (not secret), R2 keys, the age public key (not secret).
- **D-12 status: unverified.** The owner checks each WorkOS API key's creation date in the WorkOS dashboard. If any key predates **2026-06-13** (the leak commits), rotate the API key and client secret now, update backend and web together with `--skip-deploys`, and let the release deploy pick them up.
  - The production DB password postdates the leak (project created 2026-11-03, I).
  - `JWT_SECRET` is **unused** (no reference in `apps/` or `packages/` source, V) and burned: delete it from backend, and also delete `FRONTEND_URL` and `WORKOS_REDIRECT_URI` there. `railway variable delete` has no `--skip-deploys` (V), so use the dashboard with Alt+Deploy, after PR 368.
  - Remove `JWT_SECRET` and the unused keys from `apps/backend/.env.example` (A-19 docs).
- **WorkOS issuer pin:** decode safely as in G1.7, then set `WORKOS_ISSUER` to the exact observed `iss` (the README says it replaces the defaults, V).
- **Rotation runbook** (`docs/runbooks/secret-rotation.md`), one row per secret:
  - where it lives and who uses it;
  - blast radius: `WORKOS_COOKIE_PASSWORD` logs everyone out; `BANKING_TOKEN_ENCRYPTION_KEY` makes every stored bank token unreadable, so users must reconnect, and key versioning is a future item;
  - the steps, with `--skip-deploys` followed by one deploy;
  - how to verify;
  - cadence: WorkOS keys yearly or on suspicion; PAT before expiry; cookie password and banking key only on suspicion.

---

## 12. Cost estimate (Railway figures from docs, V; vendor tiers unverified)

| Item | Monthly |
|---|---|
| Hobby subscription (includes $5 usage) | $5 |
| Production usage now (about 290 MB RAM, about 0.17 GB volume, low egress) | about $3, inside the included usage (CLI estimate $1.41 for a partial period) |
| Staging (same footprint, idle) | +$2.5 to $4 |
| Volume backups (incremental, $0.15/GB-month) | < $0.10 |
| PITR (bucket $0.015/GB-month plus upload egress) | < $1 |
| Offsite R2 or B2 (free tier, about 10 GB) | $0 |
| Sentry Developer, uptime monitor, healthchecks.io | $0 |
| **Total on Hobby** | **about $5 to $10** (raise the hard limit from $10 to $25) |
| Pro instead (30-day logs, 120 h image retention, monitors) | $20 including $20 usage, so **about $20** |

---

## 13. Runbooks to write (A-19, in `docs/runbooks/`)

`first-deploy-pr368.md` (section 2 verbatim), `deploy.md`, `rollback.md` (rollback, redeploy or restart; the 72-hour image limit; old code on the new schema), `restore.md` (volume backup, logical dump, PITR sibling), `incident.md` (detect, decide on rollback, communicate (owner only), postmortem template, MTTR log), `secret-rotation.md`, `migration-failure.md` (boot failure versus pre-deploy failure; never delete migration rows; partial-schema error), `drill-log.md` and `deploy-log.md` (append-only, counts and timings only).

---

## 14. Phases and tasks

Legend: **A** = agent task (subagent; sonnet unless stated; follows AGENTS.md section 5 pre-flight before every PR), **O** = owner only.

### Phase 0: before PR 368 (minimal track)

- **O-01 Config freeze and read-only production checks (G0, G1).** Area: Railway dashboard and psql. Acceptance: every G1 item is ticked; `prod-before.txt` and `cleanup-preview.txt` exist; the owner confirms 8 tables and no `migrations` table. Effort S. Depends on A-01. Risk: an accidental redeploy deploys HEAD.
- **O-02 Decode a WorkOS token and record the issuer.** Acceptance: the issuer is written in the runbook, and `WORKOS_ISSUER` is set with `--skip-deploys` (optional). Effort S. Risk: a typo in `WORKOS_ISSUER` causes 401s everywhere. Mitigation: copy-paste it, and confirm on staging or in the G8 smoke test.
- **O-03 Backups (G2).** Acceptance: a locked Railway backup id is recorded (or a documented failure on Hobby); the logical dump has a checksum; the `schedule list` command shows daily and weekly. Effort S.
- **A-01 Ops scripts and first-deploy runbook.** Files (new): `scripts/ops/prod-counts.sql`, `scripts/ops/seed-cleanup-preview.ts` (imports the constants from `apps/backend/src/migrations/RemoveSeededExampleData1794355400000.ts`), `scripts/ops/restore-drill.sh`, `scripts/ops/smoke.sh`, `scripts/ops/*.test.ts`, `docs/runbooks/first-deploy-pr368.md`. Acceptance:
  - `bun test ./scripts` passes, and a test shows the preview SQL count equals the migration's delete count on a synthetic DB (run under `TEST_DATABASE_URL`, the same guard as the migration spec);
  - `shellcheck scripts/ops/*.sh` is clean;
  - `smoke.sh` exits non-zero on a 404.

  Effort M. Depends on nothing. Model sonnet. Risk: the scripts must never print row data, only counts.
- **A-02 Backend health endpoints.** Files: `apps/backend/src/health/health.controller.ts` (new), `health.controller.spec.ts` (new), `apps/backend/src/app.module.ts`. Acceptance:
  - specs cover 200 when `SELECT 1` succeeds, 503 with body exactly `{status:"unavailable"}` when it throws, no auth needed, the `commit` falls back to `"unknown"`, and no response contains `DATABASE_URL`, a host or a stack;
  - `rtk bun run test` passes.

  Effort S. Model sonnet. Risk: low.
- **A-03 Graceful shutdown.** Files: `apps/backend/src/main.ts`, plus a test (a boot test or a check that `enableShutdownHooks` is called, using the existing main/boot test pattern if there is one). Acceptance: on SIGTERM the process exits 0 within 5 s with the DB pool closed (manual: `docker run …` then `docker stop -t 15`; logs show the shutdown). Effort S. Model sonnet.
- **A-04 Web and marketing healthz plus noindex.** Files: `apps/web/app/routes/healthz.ts` (new) and its test, `apps/marketing/server.ts`, a marketing server test, the web header in the server entry or `root.tsx` headers export. Acceptance: tests show `/healthz` returns 200 JSON without a backend call; `X-Robots-Tag: noindex, nofollow` is present unless `ALLOW_INDEXING=true`; `/robots.txt` returns `Disallow: /`. Effort S. Model sonnet. Risk: the marketing SPA catch-all ordering.
- **O-04 Restore drill, migration dry run and rollback rehearsal (G3, G5).** Acceptance: `drill-log.md` entry with restore seconds, migration seconds, counts matching the preview, a passing idempotency restart, and a clean old-image boot. Effort M. Depends on O-03, A-01, and A-02 to A-04 merged.
- **O-05 Staging rehearsal (G4; if D1 = A).** Acceptance: the staging URLs pass `smoke.sh staging`, owner sign-in works, the cleanup counts match G3. Effort M. Depends on O-04 and the WorkOS redirect.
- **O-06 Railway config without deploying (G6)** plus raising the limit plus the webhook. Acceptance: `deployment list` shows no new deployment; the Discord or Slack test message arrives. Effort S.
- **O-07 Merge, watch, smoke test, 30-minute and 24-hour checks (G7 to G9).** Acceptance: all three deployments SUCCESS; G8 passes; a `deploy-log.md` entry. Effort S.

### Phase 1: first two weeks after PR 368

- **O-08 Uptime monitors and heartbeat account.** Acceptance: three monitors green and a test alert received. S.
- **O-09 Turn off Dependabot security updates; close 336, 335 and 338 with comments.** S.
- **A-09 Renovate config** (`renovate.json`). Acceptance: Renovate's config validator (`npx --yes renovate-config-validator`) passes; on the next run the dashboard lists the RR8 group as awaiting approval. S. Model haiku.
- **A-10 Pin actions by SHA** (both workflows and `.github/actions/bun-setup/action.yml`). Acceptance: `grep -E "uses: [^ ]+@v" .github -r` returns nothing; CI green; actionlint clean. S. Model haiku. Coordinate edits to `ci-pipeline.yml` with E4 T17 and E8 T34 (shared file, SEQUENCE.md:55).
- **A-08 gitleaks CI job and `.gitleaksignore`.** Acceptance: the job fails on a PR containing a fake `sk_test_` string in a throwaway test commit (then dropped) and passes on clean PRs. S. Owner: the full-history scan and rotation first (O-14).
- **A-11 N-08 per D3**, plus **O-10** watch-pattern update. Acceptance: on a scratch branch, release-please dry-run output shows a release PR for a `packages/finance-engine`-only `fix:` commit; after merge the owner sees all intended services move out of SKIPPED. M. Depends on PR 368 merged.
- **O-11 Create a Sentry organisation (EU region) with backend and web projects; set DSN variables** (staging first). S.
- **A-12 Structured JSON logging and request ids.** Files: `apps/backend/src/main.ts`, `apps/backend/src/observability/request-context.middleware.ts` (new) and its spec. Acceptance: the spec proves that the access line has no query, `authorization` or cookie; on staging, the logs show JSON attributes. M.
- **A-13 Sentry backend with scrubber.** Files: `apps/backend/src/instrument.ts`, `apps/backend/src/observability/scrub.ts` and spec, `sentry.filter.ts`. Acceptance: scrubber unit tests over every forbidden field; a deliberately thrown 500 on staging appears in Sentry with no request body, headers or user email. M. Risk: Bun compatibility (fallback: node runtime).
- **A-14 Sentry web.** Files: `apps/web/app/entry.client.tsx`, `entry.server.tsx` (create if absent), `apps/web/app/observability/scrub.ts` and tests. Acceptance as A-13, plus no Replay and no `code=` in breadcrumbs. M. AGENTS.md: no UI components are added; if an error UI changes, the colocation, story and test laws apply.

### Phase 2: hardening

- **A-06 Docker hardening** (three Dockerfiles, root `.dockerignore`, delete `apps/web/.dockerignore`). Acceptance:
  - `docker build` passes for all three;
  - `docker run --rm img id -u` prints a non-zero uid;
  - `docker inspect` shows a Healthcheck;
  - image size is at least 40% below the baseline recorded in A-07's first run (target, I);
  - staging deploy green.

  M. Risk: a production-only install breaks marketing's `vite` import or web's runtime. Deploy to staging first.
- **A-07 CI docker job and backend container smoke test** (`ci-pipeline.yml`). Acceptance: the job is green; deleting a workspace `package.json` line in a scratch branch turns it red. M. Depends on A-02 (for `/health/ready`).
- **A-15 Marketing generic 500 instead of `e.stack`** (`apps/marketing/server.ts:142`; cross-reference E20 D-15). S.
- **A-21 release-please token: switch to a GitHub App token** (or document PAT expiry). Owner creates the App (O). S.
- **O-14 D-12 rotation and variable clean-up** (delete `JWT_SECRET`, `FRONTEND_URL` and backend `WORKOS_REDIRECT_URI`). S.
- **Remove the port-3000 proxy** (`apps/backend/src/main.ts:35-48`). S. Model sonnet.

### Phase 3: DR automation and policy

- **A-16 Offsite backup cron service** (`ops/backup/Dockerfile`, `ops/backup/backup.sh`, README section), plus **O-12** (R2 or B2 bucket, age key pair, Railway cron service `0 3 * * 0`, healthchecks.io). Acceptance: a dump object appears encrypted (no `PGDMP` magic until decrypted); `restore-drill.sh` restores from it; the heartbeat goes green. M.
- **A-17 Migration policy doc, destructive-SQL check, production-schema fixture test.** Files: `docs/runbooks/migrations.md`, `scripts/check-migrations.ts` and test, `apps/backend/src/migrations/__fixtures__/prod-schema.sql`, `migrations.integration.spec.ts`, `.github/pull_request_template.md`. Acceptance: the check fails on a new migration with an unmarked DELETE; the fixture spec runs in the CI vitest job. M.
- **A-18 preDeploy migrations** (`apps/backend/src/config/db.config.ts`, `DB_MIGRATIONS_RUN`), plus **O** setting the pre-deploy command and timeout on staging, then production. Acceptance: a staging deploy with a deliberately failing test migration on a scratch branch never starts the new container, and the old one keeps serving. M.
- **A-19 Runbooks** (section 13) and the README and `.env.example` fixes (`JWT_SECRET`, `SESSION_SECRET` dead code). M. Model sonnet.
- **A-20 Deploy stats script** (`scripts/ops/deploy-stats.ts`, reading `railway deployment list --json` saved to a file). S. Model haiku.
- **O-13 Enable PITR at public launch; quarterly drills (O-15).**
- **Optional:** config as code (`apps/*/railway.json`), Pro upgrade at launch (D2).

---

## 15. Minimal "before PR 368" track versus the full epic

- **Minimal (blocks PR 368):** O-01, O-02, O-03, A-01, A-02, A-03, A-04, O-04, O-06, O-07, plus O-05 if D1 = A.
  - Out of E18 scope but listed by SEQUENCE.md:137: the E23 onboarding and `PATCH` fixes, and hiding C-11.
  - Docker, CI and Renovate changes are deliberately **not** in this track: keep the first deploy's image identical to what was rehearsed.
- **Full epic:** everything in Phases 1 to 3. E18's "Done when" is met after A-06, A-07, A-08, A-11, A-13, A-19, O-08, O-09 and O-12.

---

## 16. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | A Railway variable or setting change deploys unreleased `main` with the irreversible migrations | Medium | High | Config freeze; `--skip-deploys` or Alt+Deploy; backup first (G2 before G6) |
| R2 | Baseline finds a partial schema and the backend crash-loops | Low (all 8 entities registered in `05585b2`, I) | High | G1.4 `\dt` check; G3 dry run on a restored copy |
| R3 | `DB_SSL` value wrong for the self-signed private DB, so boot fails | Medium | High | G1.1 check; staging rehearsal; healthcheck keeps the old deployment serving |
| R4 | Seed fingerprints delete the owner's real rows | Low | Medium | G1.6 preview with an owner-rows check; G3 count comparison |
| R5 | Issuer mismatch makes every API call 401 after deploy | Low (E1 already live) | High | G1.7 decode; smoke test sign-in; rollback |
| R6 | No backup exists today, so an incident before G2 means total loss | Present now | Critical | Do O-03 first, today |
| R7 | Rollback impossible after 72 h (Hobby image retention) | Medium | Medium | Redeploy rebuilds; Pro gives 120 h; keep old commits buildable |
| R8 | Old code after a rollback re-seeds example data | Medium if rolled back | Low (test data) | A new forward cleanup migration; never delete migration rows |
| R9 | The hard usage limit stops production after staging and PITR are added | Medium | High | Raise to $25 in G6 |
| R10 | PAT expiry silently skips every deploy | Medium within a year | High | A-21 GitHub App, or a reminder |
| R11 | Sentry captures PII or tokens | Medium without care | High (UK GDPR) | Scrubber with tests; EU region; no replay or bodies; E19 processor list |
| R12 | Sentry SDK misbehaves on Bun | Medium | Low | Explicit filter; staging test; node fallback |
| R13 | Docker production-only install breaks a runtime import | Medium | Medium | A-07 smoke test in CI; staging first |
| R14 | Staging accidentally points at the production DB or uses production secrets | Low | High | Staged-change review; per-environment references; new keys |
| R15 | node-workspace plugin mishandles `workspace:*` | Medium | Low | D3-A recommended; dry-run spike if B |
| R16 | Region move needed for E19 later with a bigger DB | Medium | Medium | Decide early (D11) |

---

## 17. Honest effort estimate

- **Minimal before-368 track:**
  - Agents: about 2 to 3 subagent-days (A-01 M, A-02 to A-04 S), including review and the pre-flight checks.
  - Owner: about 3 to 4 hours (checks, backup, drill, deploy watch), plus 2 to 3 hours if staging comes first (D1 = A), plus about 1 hour of WorkOS and dashboard work.
  - Elapsed: 2 to 4 days.
- **Full epic:**
  - Agents: about 15 to 22 subagent-days across 21 tasks.
  - Owner: about 10 to 15 hours (accounts: Sentry, uptime, R2, age key, GitHub App; Railway settings; drills).
  - Elapsed: 3 to 5 weeks, alongside E23 and E19.
  - `ci-pipeline.yml` is a shared hotspot with E4 T17 and E8 T34, so serialise those edits.

---

## 18. Decisions needed from the product owner

1. **D1. Staging before PR 368?**
   - A. Yes. Create staging, restore the production dump into it, and rehearse the deploy on Railway before merging. Tests the Railway-only pieces (`DB_SSL`, references, WorkOS redirect, healthchecks). Costs 2 to 3 more owner hours and about $3 a month.
   - B. Local drill only (G3) for PR 368, with staging built straight after. Faster; leaves the Railway-specific risk to the healthcheck and rollback.
   - C. No staging. Contradicts E18's "Done when".
   - Recommendation: **A**. Fable and SEQUENCE.md put staging before PR 368, and R3 and R14 are only caught on Railway. Fall back to B if time is short; the healthcheck still protects the backend.
   - Blocks: O-05, G4.
2. **D2. Railway plan.**
   - A. Stay on Hobby; upgrade at public launch.
   - B. Pro now ($20 a month): 30-day logs, 120 h rollback window, monitors.
   - C. Hobby permanently.
   - Recommendation: **A**. Usage is tiny; Pro's value (monitors, retention) matters once real users exist.
3. **D3. How shared-package changes trigger deploys (N-08).**
   - A. One root release component; every service watches the root `CHANGELOG.md`.
   - B. `node-workspace` plugin with packages as components (needs a spike).
   - C. Widen watch patterns to `packages/**` (breaks release gating).
   - Recommendation: **A**, after PR 368. Simplest; one product, one version.
   - Blocks: A-11.
4. **D4. Staging data.**
   - A. Restore the production dump (test data plus your own account) for the rehearsal, refreshed monthly.
   - B. Synthetic seed only.
   - C. Empty.
   - Recommendation: **A** now (DECISIONS.md says production data is test data apart from your own account, and your consent covers your own rows). Switch to **B** once real users exist (E19).
5. **D5. Error tracking.**
   - A. Sentry SaaS, EU region, free tier, strict scrubbing.
   - B. GlitchTip self-hosted on Railway.
   - C. None; logs only.
   - Recommendation: **A**. Lowest effort, EU region, a scrubber test suite. Record it in E19's processor list.
6. **D6. Where migrations run.**
   - A. Keep boot-time `migrationsRun` with healthcheck gating.
   - B. Railway `preDeployCommand` with boot-time runs turned off.
   - C. A manual CLI step before each deploy.
   - Recommendation: **A for PR 368** (the tested path), then **B in Phase 3**.
7. **D7. Deploy order for PR 368.**
   - A. Merge the combined PR; all three deploy together, with the backend protected by its healthcheck.
   - B. Switch to `separate-pull-requests: true` and merge backend, then web, then marketing. Release-please regenerates the PRs, which changes the release you rehearsed.
   - C. Temporarily turn off web and marketing autodeploy and deploy them by hand afterwards.
   - Recommendation: **A**. You are the only user; rollback of web is available for 72 hours.
8. **D8. Dependency bot.**
   - A. Renovate only (turn off Dependabot security updates, keep alerts).
   - B. Dependabot only.
   - C. Both (today; PR 370 came from Dependabot and broke `main`).
   - Recommendation: **A**.
9. **D9. Backup posture.**
   - A. Daily and weekly volume backups plus a weekly encrypted offsite dump now.
   - B. A plus PITR now.
   - C. PITR only.
   - Recommendation: **A now, B at public launch.**
10. **D10. Alert channel.**
    - A. Railway webhook to a Discord or Slack channel on your phone, plus uptime alerts by email and push.
    - B. Email only.
    - C. A paging app.
    - Recommendation: **A**.
11. **D11. Data region** (owned by E19, affects E18).
    - A. Decide before staging and launch, and move while the DB is 166 MB.
    - B. Stay in `us-west2` and document the transfer.
    - C. Defer.
    - Recommendation: **A**. Set staging up in the target region if it is already known.

---

## 19. Measurement

- **Deploy success rate:** SUCCESS ÷ (SUCCESS + FAILED + CRASHED) per service per month, ignoring SKIPPED and REMOVED (`railway deployment list -s <svc> --limit 200 --json`, A-20). Target ≥ 95%.
- **Change failure rate:** rollbacks or hotfix releases ÷ releases (`deploy-log.md`). Target ≤ 15%.
- **MTTR:** time from detection (uptime alert or Sentry) to resolution (`incident.md` log). Target < 1 h during private beta.
- **Restore drill time** (restore seconds plus verification), and **actual RPO** (age of the newest backup at drill time): `drill-log.md`. Targets: restore < 30 min; RPO ≤ 24 h now, ≤ 5 min with PITR.
- **Lead time:** release-PR merge to all services SUCCESS. Target < 20 min.
- **Alert noise:** alerts per week that needed no action. Target < 2.

---

## 20. AGENTS.md laws touched

- **Section 5, CI pre-flight:** every agent PR (A-01 to A-21) runs `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test` and `rtk bun run build`. The new CI jobs (docker, gitleaks) add to the four gates and do not replace any of them.
- **Sections 1 to 4, UI laws:** no new UI components are planned. `healthz.ts` is a resource route and the noindex work is headers only. If an error-tracking change touches error UI, the colocated directory, story (light and dark, a11y) and test rules apply.
- **Section 6, subagent models:** implementation tasks use sonnet; A-09, A-10 and A-20 may use haiku; this plan used opus. Use the `.claude/agents/implementer.md` and `explorer.md` agents.
- **Section 7:** use `rtk` for `git`, `gh`, `bun` and `vitest` commands. The owner's `railway`, `psql` and `pg_dump` commands run raw.

## 21. Unverified items to confirm during execution

- Volume backups on Hobby: `railway postgres pitr backup create`.
- Whether staged-change Deploy always builds branch HEAD. Strong evidence from the `05585b2` patch deploy; Alt+Deploy is the safe path.
- Whether duplicating an environment copies volume data (expected: no).
- `RAILWAY_GIT_COMMIT_SHA` availability at runtime.
- The TypeORM 1.1 default `migrationsTransactionMode`.
- The current `DB_SSL` value and whether `DATABASE_URL` is a reference (owner G1.1).
- The hoisted path of `typeorm/cli.js` in the backend image.
- Bun's SIGTERM forwarding under `bun run`.
- Sentry free-tier limits and Bun support; Better Stack and UptimeRobot free-tier terms.
- Whether `@workos-inc/authkit-react-router@0.13.0` works with React Router 8.
- Nest 12 `ConsoleLogger({json:true})`.
- Bun `--production` install and `turbo prune` with `bun.lock`.

Key files for implementers:
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/backend/src/main.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/backend/src/app.module.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/backend/src/config/db.config.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/backend/src/config/typeorm.options.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/backend/src/migrations/` (read the three migrations from `origin/main`; this worktree's branch lacks `RemoveSeededExampleData1794355400000.ts`)
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/backend/Dockerfile`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/Dockerfile`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/marketing/Dockerfile`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/.dockerignore`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/marketing/server.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/app/routes/ping.tsx`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/.github/workflows/ci-pipeline.yml`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/.github/workflows/release-please.yml`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/.github/actions/bun-setup/action.yml`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/release-please-config.json`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/renovate.json`
- `/Users/marcgallagher/personal/flump/docs/audit/EPICS.md` (E18 at lines 533-539)
- `/Users/marcgallagher/personal/flump/docs/audit/plans/DECISIONS.md`
- `/Users/marcgallagher/personal/flump/docs/audit/N-infra.md`

Note: this worktree is on branch `ci-release-please-token`, which has diverged from `origin/main` (merge base `96d80e2`). Implementers should branch from `origin/main`.

I fetched the Railway doc pages to `/private/tmp/claude-501/-Users-marcgallagher-personal-flump/f53838d8-2f6a-4832-a92e-67fe1d0489a4/scratchpad/rdocs/` for reference.
