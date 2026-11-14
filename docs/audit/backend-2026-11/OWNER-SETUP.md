# Owner setup for the backend audit fixes

What the owner must provision, switch on or confirm, per PR. The PRs change the repository only (rulings D5, D12, D13): no agent calls the Railway, Sentry, WorkOS or GitHub settings APIs, creates accounts or touches a real database. Tick each box and add the date when done. Values marked `<...>` are placeholders: real ones go into Railway variables or your password manager, never into the repository or a chat.

## BE-03 Backups, restore drill and alerting (findings H1, M16, L16)

Runbooks: [`backup-restore.md`](../../runbooks/backup-restore.md), [`uptime-and-alerts.md`](../../runbooks/uptime-and-alerts.md), [`incident.md`](../../runbooks/incident.md). Variables: [`scripts/ops/backup.env.example`](../../../scripts/ops/backup.env.example). Alert config: [`alert-rules.json`](../../runbooks/alert-rules.json).

**Deadline:** the first restore drill must be logged by **2026-12-15**, when the restore-drill law starts failing pull requests, and in any case before BE-05 deploys (its sign backfill cannot be undone except from a backup).

### 1. Point-in-time recovery

- [ ] In Railway, open the Postgres service, Backups (or Settings, Backups). Confirm what the plan offers: scheduled volume backups (daily, weekly, monthly) and whether point-in-time recovery is available and on. Write down the retention you see. Date: ____
- [ ] If PITR is offered, switch it on. If it needs a higher plan, decide before public launch (the launch RPO target is 5 minutes, `backup-restore.md` "Targets"). Until then the RPO is 24 hours from the nightly backup.
- [ ] Note the result in `deploy-log.md` (on/off, retention).

### 2. Offsite storage

Use a different provider from Railway so one account problem cannot take the database and its backups together (Cloudflare R2 or Backblaze B2 are S3-compatible and cheap at this size).

- [ ] Create a private bucket, for example `<flump-backups>`. No public access.
- [ ] Turn on object versioning **and** object lock (governance or compliance mode, 35 days). Both are required, so a stolen cron key can neither delete a backup nor overwrite it with a planted one (age encrypts to public keys, so anyone with write access could upload a dump the restore would accept). Choose a provider that supports object lock (R2 bucket locks and B2 object lock both do).
- [ ] Lifecycle rule: delete objects under `flump/prod/` 35 days after creation (the script never deletes).
- [ ] Create two API key pairs scoped to that bucket only:
  - **cron key**: write (put) and list only, no delete. Goes into the cron service.
  - **restore key**: read and list only. Stays in your password manager; used for drills.
- [ ] Note the S3 endpoint and region (R2: `https://<account>.r2.cloudflarestorage.com`, region `auto`).

### 3. Encryption keys (age)

- [ ] On your Mac: `brew install age`, then create two key pairs:

  ```bash
  age-keygen -o flump-backup-primary.txt     # prints "Public key: age1..."
  age-keygen -o flump-backup-recovery.txt
  ```

- [ ] Store `flump-backup-primary.txt` in your password manager (as a secure note). Print `flump-backup-recovery.txt` or put it on an encrypted USB stick kept somewhere else. Then delete both files from the Mac.
- [ ] The two **public** keys (`age1...`) go into `BACKUP_AGE_RECIPIENTS`, comma separated. Either secret key can decrypt every backup. Losing both means every backup is unreadable: check both exist at each drill.

### 4. Optional, a read-only database role for backups

Lets the cron service read but never write production.

- [ ] Through `railway connect Postgres`, run the following, and set a long random password at the `\password` prompt (so it never lands in `~/.psql_history`):

  ```sql
  CREATE ROLE flump_backup LOGIN;
  GRANT pg_read_all_data TO flump_backup;
  \password flump_backup
  ```

  Then build `BACKUP_DATABASE_URL` from the service's private host with this role. Without this step use `${{Postgres.DATABASE_URL}}`.

### 5. Backup cron service

- [ ] In the production environment: New, GitHub Repo, this repository. Name it `backup`.
- [ ] Settings, Config-as-code: set the path to `scripts/ops/backup.railway.json`. This sets the Dockerfile (`scripts/ops/backup.Dockerfile`), the start command, the schedule (`30 2 * * *`, 02:30 UTC) and restart policy `NEVER`. Confirm Settings shows the cron schedule. The service has no public domain.
- [ ] Variables (names from `scripts/ops/backup.env.example`): `BACKUP_DATABASE_URL` (`${{Postgres.DATABASE_URL}}` or the role from step 4), `BACKUP_DESTINATION=s3://<bucket>/flump/prod`, `BACKUP_AGE_RECIPIENTS`, `BACKUP_LABEL=prod`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (the cron key). Leave the heartbeat variables for step 6.
- [ ] Deploy, then trigger one run now (the service's Cron Runs, Run now, or deploy). Pass: the log ends with `seconds:` and lists `tables:` and `migrations:`, exit 0, and two `.age` objects appear in the bucket. Date: ____
- [ ] Check `max_connections` headroom: the backup holds one connection for a few seconds. Through `railway connect Postgres` run `SHOW max_connections;` and compare with the backend pool size times replicas (BE-02 documents the pool) plus 1 for the backup plus 3 spare. Note the numbers in `deploy-log.md`.

### 6. Heartbeat (dead-man switch)

- [ ] Create the monitor described in `uptime-and-alerts.md`, "Backup heartbeat" (Sentry Cron Monitor `flump-backup`, or healthchecks.io), with the schedule from `alert-rules.json` (`backupHeartbeat`).
- [ ] Set `BACKUP_HEARTBEAT_URL` and `BACKUP_HEARTBEAT_FAIL_URL` on the backup service, then trigger a run. Pass: the monitor shows a successful check-in. Date: ____

### 7. First restore drill

- [ ] Follow `backup-restore.md` section 3 against the backup from step 5. Pass: `RESULT|PASS` from both `backup-restore.ts` and `verify-restore.sql`.
- [ ] Add the entry to `docs/runbooks/drill-log.md` and commit it (a docs-only PR is fine). This clears the restore-drill law. Date: ____
- [ ] Optional the same day: rehearse the rollback in `first-deploy-pr368.md` G3.5 (old image boots on the restored schema) and mark it verified there (finding L16).

### 8. Alerts, each one tested (finding M16)

Values for every monitor and rule are in `alert-rules.json`; the steps are in `uptime-and-alerts.md` sections 1 to 3.

| Alert                                                  | Set up (date) | Tested (date) | How tested |
| ------------------------------------------------------ | ------------- | ------------- | ---------- |
| Uptime: backend `/health/ready`                        |               |               |            |
| Uptime: web `/healthz`                                 |               |               |            |
| Uptime: marketing `/healthz`                           |               |               |            |
| Backup heartbeat (missed and failed)                   |               |               |            |
| Sentry: new issue (production)                         |               |               |            |
| Sentry: regression (production)                        |               |               |            |
| Sentry: more than 10 events in 1 hour (production)     |               |               |            |
| Railway webhook: `Deployment.failed`, crashed          |               |               |            |

### 9. Branch protection (ruling D13)

- [ ] `💾 Backup and restore roundtrip` (workflow `.github/workflows/backup.yml`) is one of the required checks listed under BE-01 below. Apply it together with the rest of that list.

### Before deploying any PR with an irreversible migration (BE-05 first)

- [ ] Trigger a manual backup run with `BACKUP_LABEL=pre-<pr>` (or wait for the night's run), then run the section 3 drill on it and log it. Only then deploy.

## BE-01 Merge gate and secret scanning (finding H11)

BE-01 changed the workflows in the repository. The GitHub settings below are the owner's to apply (decision D13). Nothing in the repository can apply them, and no agent calls the settings API. Until they are applied, finding H11 stays open: a PR behind `main`, or one with a failing E2E, Docker, audit or gitleaks job, can still merge.

Apply them after the BE-01 PR has merged and its checks have run at least once on a pull request. GitHub only offers a check name in the picker after it has reported in the last 7 days. The Semgrep check is renamed in BE-01, so its new name appears after the first run.

### 1. Branch protection on `main`

Settings → Branches → the rule for `main` (or Settings → Rules → Rulesets, if you use rulesets).

| Setting | Value | Why |
|---|---|---|
| Require a pull request before merging | On | All changes go through CI |
| Required approving reviews | 0 | A solo owner cannot review their own PR. CI is the gate (D13) |
| Require status checks to pass before merging | On | |
| Require branches to be up to date before merging (`strict`) | **On** | A PR behind `main` must re-run CI on the merged result. AGENTS.md section 5 assumes this |
| Required status checks | The 12 names below, exactly | |
| Do not allow bypassing the above settings (`enforce_admins`) | **On** | Admins are exempt today, so the gate can be skipped by accident |
| Allow force pushes | Off | |
| Allow deletions | Off | |

Required status checks. These names are copied from `.github/required-checks.json`, and `scripts/ci-config.test.ts` fails if that file and the workflows drift apart. The emoji are part of each name.

| Check name | Workflow | Time on a PR (approx.) |
|---|---|---|
| `⬣ Lint & Type Check` | CI Pipeline | 30 s |
| `⚡ Vitest Tests` | CI Pipeline | 3 min (aggregates the two shards) |
| `🏗️ Build` | CI Pipeline | 30 s |
| `🧰 Ops script tests` | CI Pipeline | 40 s |
| `♿ Storybook a11y (light)` | CI Pipeline | 2.5 min |
| `♿ Storybook a11y (dark)` | CI Pipeline | 2 min |
| `🎭 E2E smoke` | CI Pipeline | 1 to 1.5 min |
| `🐳 Docker images` | CI Pipeline | 2 to 3 min when an image input changed; 20 s otherwise |
| `🛡️ Dependency audit` | CI Pipeline | 20 s |
| `🔑 Secret scan (gitleaks)` | Security Scan | 10 s |
| `🔎 SAST (Semgrep CE)` | Security Scan | 1.5 to 2 min |
| `💾 Backup and restore roundtrip` | Backup restore test (BE-03) | about 1.5 min |

The jobs run in parallel, so a PR still finishes in about 3 minutes. Remove the old `♿ Storybook a11y` entries or the old Semgrep name if the picker still lists them under their previous names.

Not required, on purpose:

- `⚡ Vitest web` and `⚡ Vitest backend and packages`: covered by `⚡ Vitest Tests`. Requiring the aggregate keeps the gate stable if the shards change.
- `🖼️ Visual regression`: still bedding in (`continue-on-error`; see `apps/e2e/README.md`, "Making it required").
- `🕷️ DAST (ZAP baseline, passive)`: scheduled only.

The same settings with the GitHub CLI, if you prefer it to the web page (run it yourself). It replaces the whole protection rule for `main`:

```bash
gh api -X PUT repos/mgallagher56/flump/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "⬣ Lint & Type Check" },
      { "context": "⚡ Vitest Tests" },
      { "context": "🏗️ Build" },
      { "context": "🧰 Ops script tests" },
      { "context": "♿ Storybook a11y (light)" },
      { "context": "♿ Storybook a11y (dark)" },
      { "context": "🎭 E2E smoke" },
      { "context": "🐳 Docker images" },
      { "context": "🛡️ Dependency audit" },
      { "context": "🔑 Secret scan (gitleaks)" },
      { "context": "🔎 SAST (Semgrep CE)" },
      { "context": "💾 Backup and restore roundtrip" }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

To check it afterwards: `gh api repos/mgallagher56/flump/branches/main/protection -q '{strict: .required_status_checks.strict, admins: .enforce_admins.enabled, checks: [.required_status_checks.checks[].context]}'`.

### 2. Secret scanning and push protection

Settings → Code security (the repository is public, so both are free):

| Setting | Value |
|---|---|
| Secret Protection (secret scanning) | Enable |
| Push protection | Enable |
| Dependabot alerts | Leave as they are. Renovate handles updates, and `🛡️ Dependency audit` blocks PRs |

Push protection stops a push that contains a known token format before it reaches GitHub. The gitleaks job is the second line of defence, and it runs on the PR after the push.

### 3. Railway "Wait for CI"

There is nothing to change. The new required checks gate pull requests. On a push to `main`, the audit and tax-calendar steps only warn, the Docker job does not run, and visual regression never runs. So a new upstream advisory or a flaky screenshot cannot block a deploy. One change: the Storybook a11y jobs are now blocking on `main` as well, as E8 planned. They have been green on `main` throughout the bedding-in period.

### How to know it worked

- Open a test PR from a branch that is behind `main`. GitHub shows "This branch is out-of-date" and blocks the merge until it is updated.
- A PR whose `🎭 E2E smoke` fails cannot merge, including for an admin.

## BE-07 Security, config and observability (findings M6, M8, M9, M10, M12, M14, M15, M18, L7, L14)

The backend now validates its whole environment at boot and refuses to start with a named error (`EnvValidationError`, `OpenBetaNotConfirmedError`, `ContractModeNotEnforcedError`, `BankLaunchGateError`). Set these **before** deploying, or the new image will not boot.

### 1. Backend service variables (Railway, production)

| Variable | Value |
|---|---|
| `DATABASE_URL` (or `DB_HOST` and friends) | Already set; confirm |
| `CORS_ALLOWED_ORIGINS` | The web origin(s), comma separated |
| `MCP_AUDIT_HMAC_KEY` | `<random, at least 32 characters>` |
| `WORKOS_CLIENT_ID` | Already set; confirm |
| `BANKING_TOKEN_ENCRYPTION_KEY` | Already set; confirm |
| `BETA_ALLOWED_EMAILS` and/or `BETA_ALLOWED_USER_IDS` | The allow-list (ruling D8). Only set `BETA_OPEN=true` if you mean to open the beta |
| `CONTRACT_MODE` | Unset or `enforce`. Any other value fails boot in production |
| `BANK_CONNECTIONS_ENABLED` | Unset or `false`. `true` fails boot until BE-12 flips the launch gate (ruling D11) |
| `WEB_CLIENT_IP_HMAC_KEY` | `<random, at least 32 characters>`, the **same value** on the web service |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional. Defaults to `0.02` in production (ruling D7); at most `0.05` is accepted |
| `DB_SLOW_QUERY_MS` | Optional. Defaults to 500 |

### 2. Web service variables (Railway)

| Variable | Value |
|---|---|
| `WEB_CLIENT_IP_HMAC_KEY` | Same value as the backend. Without it, every web user shares the web server's per-IP bucket |
| `SENTRY_AUTH_TOKEN` | A Sentry token with the `project:releases` scope. Set it as an ordinary service variable: Railway hands it to the Docker build as a BuildKit secret (id `SENTRY_AUTH_TOKEN`), read only by the build step and never baked into an image layer. Absent means source maps are skipped, not a failed build |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Your Sentry org and web project slugs (build variables) |
| `CSP_REPORT_ONLY` | Leave unset. Set to `true` only as an emergency rollback if the enforced CSP breaks a page |

### 3. Database

The migration `AddRateLimitBuckets1794632012000` adds one table, `rate_limit_buckets`. It is additive and reversible; run the backup drill before deploy as for every migration.

### How to know it worked

- The backend boots and `/health` is green; removing `MCP_AUDIT_HMAC_KEY` in a preview environment makes boot fail with `EnvValidationError` naming it.
- A web page's response carries `Content-Security-Policy` (not `-Report-Only`) and an `x-request-id`; the same id appears on the backend log line for that request.
- A Sentry web error shows a readable stack trace, and `https://<web-origin>/assets/<file>.js.map` returns 404.
- Repeated failed sign-ins stay limited after a redeploy.

## BE-06 Audit trail, retention and consents (findings H12, M-PRIV2, M-PRIV3, M-PRIV4, L6)

The retention purge is a command a Railway cron service runs once a day (ruling D5). It never runs inside the API. Policies (ruling D4): audit records 13 months (`audit_events`, `agent_audit_events`), import batches 30 days after their last change, revoked or expired AI tokens 13 months, pending bank consents 1 day after expiry, deletion tombstones at their 24-month expiry, idempotency keys after their 24-hour TTL (BE-09), the BE-05 sign before-image 90 days. Accounts with no sign-in for 24 months are **counted, not erased** (the log line `retention inactive_accounts_due=N`); see the follow-up below.

### Before deploying

- [ ] Run the backup drill (BE-03 "Before deploying any PR with an irreversible migration"). The BE-06 migration is additive and its `down()` only drops the new tables and column, but the deploy rule applies to every migration. Date: ____
- [ ] Optional: remove `AGENT_AUDIT_PURGE_ENABLED` from the backend's Railway variables. The in-process purge it controlled is gone; the variable is still accepted, so leaving it does no harm.

### 1. Retention cron service

- [ ] In the production environment: New, GitHub Repo, this repository. Name it `retention`.
- [ ] Settings, Config-as-code: set the path to `apps/backend/retention.railway.json`. This builds the backend image (`apps/backend/Dockerfile`), sets the start command `bun dist/jobs/retention-purge.js`, the schedule `15 3 * * *` (03:15 UTC, after the 02:30 backup) and restart policy `NEVER`. Confirm Settings shows the cron schedule. No public domain.
- [ ] Variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}` and `NODE_ENV=production`, plus `DB_SSL` and `DB_SSL_CA` if the backend service sets them (copy them as reference variables). Nothing else: the command reads only the database settings. Do **not** use the read-only backup role here; the purge deletes rows.
- [ ] Optional heartbeat: a second cron monitor (as for the backup, `uptime-and-alerts.md`) and `RETENTION_HEARTBEAT_URL=<https monitor URL>` on this service. The command pings it only after a successful run.
- [ ] Trigger one run now (Cron Runs, Run now). Pass: the log shows one `retention <table> deleted=<n>` line per policy, then `retention inactive_accounts_due=<n>`, and exit 0. Date: ____
- [ ] Staging: the same service in the staging environment, pointed at the staging database, is fine and recommended.

### 2. Checks after deploy

- [ ] Mint and revoke an AI token in the web app, then in `railway connect Postgres`: `SELECT action, created_at FROM audit_events ORDER BY created_at DESC LIMIT 2;` shows `mcp_token.revoked` and `mcp_token.minted`, and `SELECT kind, withdrawn_at IS NOT NULL FROM consents ORDER BY granted_at DESC LIMIT 1;` shows `ai_access | t`.
- [ ] `UPDATE audit_events SET action = action;` fails with `audit_events is append-only` (run it inside `BEGIN; ... ROLLBACK;`).

### Follow-ups the owner decides

- **Inactive-account erasure (D4).** Flump now records `last_active_at` and the job reports accounts past 24 months. Erasing them automatically needs a notice email some weeks before (no email sending exists yet) and a run of the account-deletion service from the job. The earliest any beta account can reach 24 months is late 2028.
- **Restricted database role for `audit_events`.** The append-only trigger stops the app rewriting a row by mistake; it does not stop someone holding the app's database credential from deleting rows or dropping the trigger. A separate app role without DELETE or TRUNCATE on `audit_events` (with the retention job on its own role) closes that. Optional before public launch.
- **Terms acceptance record (M-PRIV3).** The `consents` table has a `terms` kind, but the web app has no acceptance step to write it. Adding one needs the terms version from the legal pages and a small route.
