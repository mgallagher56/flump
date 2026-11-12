# Runbook: staging environment and variable matrix

Owner: the repo owner. Ticket: E18-N9 (`docs/audit/plans/E18-no-owner-plan.md`). Design source: `docs/audit/plans/E18-plan-draft.md` section 3, with the round 3 and round 4 decisions applied (region EU West, DECISIONS item 8; cost, item 16).

Every step marked **Owner** needs the Railway or WorkOS dashboard and is a set of instructions only. No agent runs them.

Related runbooks (some land in parallel PRs, so a link may not resolve until those merge):

- [`backup-restore.md`](./backup-restore.md) (E18-N10): the restore-to-staging drill.
- [`region-move.md`](./region-move.md) (E18-N10): the EU West move checklist.
- [`uptime-and-alerts.md`](./uptime-and-alerts.md) (E18-N12): monitors and alert routing.
- [`first-deploy-pr368.md`](./first-deploy-pr368.md): production deploy and rollback.
- Scripts from N10: [`scripts/ops/backup-dump.sh`](../../scripts/ops/backup-dump.sh) and [`scripts/ops/restore-to-staging.sh`](../../scripts/ops/restore-to-staging.sh).

## 1. Shape

- One persistent Railway environment named `staging`, in the same project as production, created with Duplicate Environment.
- Region: **EU West** for every service and for Postgres (round 3, item 8). Production moves to EU West through the region-move runbook, so both environments end up in the same region.
- A duplicate of production: backend, web, marketing and Postgres. Postgres has its **own** volume and its own `DATABASE_URL`. Staging never points at the production database.
- Duplicating does not copy volume data (inference), so check the new Postgres is empty before the first restore.
- Cost: about $3 a month of usage at today's footprint (DECISIONS item 16). Builds are free.

### The database marker

Staging Postgres carries a comment that the N10 and N11 scripts check before they will write anything:

```sql
COMMENT ON DATABASE railway IS 'flump-staging';
```

Run it once against the staging database only (use the real database name if it is not `railway`). `restore-to-staging.sh` and the synthetic seed script refuse to run without it, so a wrong target fails safe. Check with:

```sql
SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname = current_database();
```

## 2. Trigger and promotion

- **Trigger:** staging services track `main` with `build.watchPatterns: ["**"]` (set in the config as code) and Wait for CI on, so every green `main` commit deploys to staging.
- **Promotion:** production deploys only when the release PR merges. Railway rebuilds per environment from the same commit; there is no artefact promotion. Everything in a release has therefore run on staging first.
- Confirm a green staging deploy before merging the release PR.

## 3. First-time setup (Owner, EU West)

1. Create the environment, staging the changes only: `railway environment new staging --duplicate production`. Review everything before deploying.
2. In the staged changes set the region of every service and Postgres to **EU West**, then fix the variables using the matrix in section 4. Generate public domains for the three services.
3. Deploy Postgres alone. Set the marker from section 1. To load data, follow [`backup-restore.md`](./backup-restore.md) (`scripts/ops/restore-to-staging.sh`, tunnelling through `railway connect Postgres --environment staging --tunnel-only`).
4. Deploy the backend and watch the migrations complete, then deploy web and marketing.
5. In the WorkOS dashboard add the staging web `/callback` to the redirect URIs (section 5).
6. Set healthchecks the same as production: backend `/health/ready`, web `/healthz`, marketing `/healthz`. Then run `BACKEND_URL=... WEB_URL=... MARKETING_URL=... bash scripts/ops/smoke.sh staging`.

## 4. Variable matrix

Source column values: **reference** (a Railway reference variable), **generate fresh** (a staging-specific value, never copied), **copy** (same value as production), **unset** (must not exist). "Secret?" means the value must never appear in logs, chat or commits.

Rows come from the code (`process.env.X`, `env.X` and `configService.get("X")` in `apps/*`) and are guarded by `scripts/ops/env-matrix.test.ts`: the test fails when a variable read in the code is missing from this file. Add a row here whenever you add a variable. Dynamically named variables (such as `<INSTITUTION>_CLIENT_ID`, built from a template string) cannot be found by the test, so keep those rows up to date by hand.

### 4.1 Backend

| Name                                                                                                                       | Production                                                                                                                                                                                                                                           | Staging                                                        | Source                            | Secret?              |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------- | -------------------- |
| `NODE_ENV`                                                                                                                 | `production`                                                                                                                                                                                                                                         | `production`                                                   | copy                              | no                   |
| `PORT`                                                                                                                     | Railway-injected                                                                                                                                                                                                                                     | Railway-injected                                               | unset (platform)                  | no                   |
| `DATABASE_URL`                                                                                                             | `${{Postgres.DATABASE_URL}}`                                                                                                                                                                                                                         | `${{Postgres.DATABASE_URL}}` (staging Postgres)                | reference                         | yes                  |
| `DB_SSL`                                                                                                                   | per first-deploy runbook                                                                                                                                                                                                                             | same as production                                             | copy                              | no                   |
| `DB_SSL_CA`                                                                                                                | only if `DB_SSL` verifies a CA                                                                                                                                                                                                                       | same as production                                             | copy                              | no                   |
| `BANKING_TOKEN_ENCRYPTION_KEY`                                                                                             | 32-byte key                                                                                                                                                                                                                                          | new key (`openssl rand -hex 32`)                               | generate fresh                    | yes                  |
| `WORKOS_API_KEY`                                                                                                           | production key                                                                                                                                                                                                                                       | same as production (shared WorkOS environment)                 | copy                              | yes                  |
| `WORKOS_CLIENT_ID`                                                                                                         | client id                                                                                                                                                                                                                                            | same as production                                             | copy                              | no                   |
| `WORKOS_ISSUER`                                                                                                            | issuer URL                                                                                                                                                                                                                                           | same as production                                             | copy                              | no                   |
| `CORS_ALLOWED_ORIGINS`                                                                                                     | production web origin                                                                                                                                                                                                                                | the staging web origin                                         | generate fresh                    | no                   |
| `TRUST_PROXY_HOPS`                                                                                                         | per first-deploy runbook                                                                                                                                                                                                                             | same as production                                             | copy                              | no                   |
| `CONTRACT_MODE`                                                                                                            | per contract rollout                                                                                                                                                                                                                                 | same as production, or ahead of it                             | copy                              | no                   |
| `CONTRACT_ENFORCE_GROUPS`                                                                                                  | per contract rollout                                                                                                                                                                                                                                 | same as production, or ahead of it                             | copy                              | no                   |
| `BANK_CONNECTIONS_ENABLED`                                                                                                 | allow-list switch                                                                                                                                                                                                                                    | same as production                                             | copy                              | no                   |
| `BANK_CONNECTIONS_ALLOWED_USER_IDS`                                                                                        | allow-list                                                                                                                                                                                                                                           | staging user ids only                                          | generate fresh                    | no                   |
| `BETA_ALLOWED_EMAILS`                                                                                                      | beta allow-list                                                                                                                                                                                                                                      | same as production                                             | copy                              | no                   |
| `BETA_ALLOWED_USER_IDS`                                                                                                    | beta allow-list                                                                                                                                                                                                                                      | same as production                                             | copy                              | no                   |
| `MCP_ENABLED`                                                                                                              | global MCP kill switch; `false` turns MCP off                                                                                                                                                                                                        | same as production                                             | copy                              | no                   |
| `MCP_OPEN_ACCESS`                                                                                                          | `true` opens MCP to every user; set explicitly, never leave unset in production                                                                                                                                                                      | `false`                                                        | generate fresh                    | no                   |
| `MCP_ALLOWED_USER_IDS`                                                                                                     | comma-separated WorkOS user ids allowed to use MCP                                                                                                                                                                                                   | staging test user ids                                          | generate fresh                    | no                   |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`                                                                                      | `15`                                                                                                                                                                                                                                                 | `15`                                                           | copy                              | no                   |
| `SENTRY_DSN`                                                                                                               | production DSN (after N2/N3/N4)                                                                                                                                                                                                                      | staging DSN (after N2/N3/N4)                                   | generate fresh                    | yes                  |
| `SENTRY_ENVIRONMENT`                                                                                                       | `production` (after N2/N3/N4)                                                                                                                                                                                                                        | `staging` (after N2/N3/N4)                                     | generate fresh                    | no                   |
| `LOG_FORMAT`                                                                                                               | `json` (after N2/N3/N4)                                                                                                                                                                                                                              | `json` (after N2/N3/N4)                                        | copy                              | no                   |
| `MCP_AUDIENCE`                                                                                                             | optional, defaults to `flump-mcp`                                                                                                                                                                                                                    | unset                                                          | unset                             | no                   |
| `AUTH_SERVER_URL`                                                                                                          | optional, defaults to `https://api.workos.com`                                                                                                                                                                                                       | unset                                                          | unset                             | no                   |
| `STARLING_USE_SANDBOX`                                                                                                     | unset (`true` selects the Starling sandbox)                                                                                                                                                                                                          | unset unless testing the sandbox                               | unset                             | no                   |
| `BACKEND_URL`                                                                                                              | the public backend URL; the bank OAuth redirect URI is `<BACKEND_URL>/bank-connections/callback` (`finance.service.ts`), so it is required wherever bank connections are enabled (defaults to `http://localhost:4000`, which is wrong in production) | the staging backend URL, or leave bank connections disabled    | generate fresh                    | no                   |
| `<INSTITUTION>_CLIENT_ID`, `<INSTITUTION>_CLIENT_SECRET`, `<INSTITUTION>_REDIRECT_URI` (for example `MONZO_`, `STARLING_`) | per-bank OAuth app credentials; the secret is a secret                                                                                                                                                                                               | unset, or sandbox credentials from the bank's developer portal | generate fresh (sandbox) or unset | `_CLIENT_SECRET` yes |
| `RAILWAY_ENVIRONMENT`                                                                                                      | Railway-injected                                                                                                                                                                                                                                     | Railway-injected                                               | unset (platform)                  | no                   |
| `RAILWAY_GIT_COMMIT_SHA`                                                                                                   | Railway-injected                                                                                                                                                                                                                                     | Railway-injected                                               | unset (platform)                  | no                   |

**Must be unset in staging and production:**

| Name                                                      | Why                                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `AUTH_DEV_BYPASS`                                         | Disables authentication. Local development only.                              |
| `DB_SYNCHRONIZE`                                          | Lets TypeORM rewrite the schema. Migrations only.                             |
| `ALLOW_DESTRUCTIVE_DB_TESTS`                              | Lets tests drop data. CI only.                                                |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASSWORD` | Local-development fallback when `DATABASE_URL` is absent. Use `DATABASE_URL`. |

**Delete from a duplicated environment:** `JWT_SECRET`, `FRONTEND_URL`, `WORKOS_REDIRECT_URI` (the backend no longer reads them).

### 4.2 Web

| Name                                  | Production                      | Staging                      | Source         | Secret? |
| ------------------------------------- | ------------------------------- | ---------------------------- | -------------- | ------- |
| `NODE_ENV`                            | `production`                    | `production`                 | copy           | no      |
| `VITE_API_URL`                        | production backend URL          | staging backend URL          | generate fresh | no      |
| `VITE_MARKETING_URL`                  | production marketing URL        | staging marketing URL        | generate fresh | no      |
| `WORKOS_API_KEY`                      | production key                  | same as production           | copy           | yes     |
| `WORKOS_CLIENT_ID`                    | client id                       | same as production           | copy           | no      |
| `WORKOS_COOKIE_PASSWORD`              | 32+ character secret            | new secret                   | generate fresh | yes     |
| `WORKOS_REDIRECT_URI`                 | `<production web>/callback`     | `<staging web>/callback`     | generate fresh | no      |
| `VITE_WORKOS_REDIRECT_URI`            | `<production web>/callback`     | `<staging web>/callback`     | generate fresh | no      |
| `AUTH_DEV_BYPASS`                     | unset                           | unset                        | unset          | no      |
| `VITE_SB_THEME`                       | Storybook only, unset           | unset                        | unset          | no      |
| `ALLOW_INDEXING`                      | `true` only at public launch    | unset                        | unset          | no      |
| `SENTRY_DSN`                          | production DSN (after N2/N3/N4) | staging DSN (after N2/N3/N4) | generate fresh | yes     |
| `SENTRY_ENVIRONMENT`                  | `production` (after N2/N3/N4)   | `staging` (after N2/N3/N4)   | generate fresh | no      |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `15`                            | `15`                         | copy           | no      |

### 4.3 Marketing

| Name                      | Production                                                           | Staging            | Source           | Secret? |
| ------------------------- | -------------------------------------------------------------------- | ------------------ | ---------------- | ------- |
| `NODE_ENV`                | `production`                                                         | `production`       | copy             | no      |
| `PORT`                    | Railway-injected                                                     | Railway-injected   | unset (platform) | no      |
| `VITE_APP_URL`            | production web URL                                                   | staging web URL    | generate fresh   | no      |
| `SECURITY_CONTACT`        | security contact address                                             | same as production | copy             | no      |
| `SITE_URL`                | public https origin, used for sitemap and robots when indexing is on | unset              | unset            | no      |
| `VITE_SHOW_PLACEHOLDERS`  | unset (build-time; `true` previews placeholder copy)                 | unset              | unset            | no      |
| `ALLOW_INDEXING`          | `true` only at public launch                                         | unset              | unset            | no      |
| `APP_URL`                 | fallback when `VITE_APP_URL` is unset                                | unset              | unset            | no      |
| `RAILWAY_PUBLIC_DOMAIN`   | Railway-injected                                                     | Railway-injected   | unset (platform) | no      |
| `RAILWAY_SERVICE_WEB_URL` | Railway-injected                                                     | Railway-injected   | unset (platform) | no      |

## 5. WorkOS

Staging uses the **same WorkOS environment as production** for now. Add the staging web `/callback` URL to the redirect URIs in the WorkOS dashboard (Owner). At public launch (E24) production moves to a WorkOS Production environment with new keys and staging keeps the WorkOS Staging environment.

## 6. Known gaps

- Marketing hard-codes the production web hostname (`apps/marketing/server/security.ts:3` and `apps/marketing/src/utils/url.ts`), so staging marketing can link to production web until that becomes config.
- Sharing the WorkOS environment means staging and production share user accounts; use test users on staging.
- No per-PR environments (not worth the cost yet).

## 7. Staleness guard

`bun test ./scripts/ops` runs `env-matrix.test.ts`. It collects every variable name read in `apps/backend`, `apps/web` and `apps/marketing` (excluding tests) plus a short list of variables read indirectly (libraries and Railway), and fails when one is missing from the table of the service that reads it (section 4.1, 4.2 or 4.3). It cannot see dynamically named variables. Names that only tests or build tools use live in the test's documented ignore list.
