# Owner setup for the backend audit fixes

What the owner must provision, switch on or confirm, per PR. The PRs change the repository only (rulings D5, D12, D13): no agent calls the Railway, Sentry, WorkOS or GitHub settings APIs, creates accounts or touches a real database. Tick each box and add the date when done. Values marked `<...>` are placeholders: real ones go into Railway variables or your password manager, never into the repository or a chat.

## BE-03 Backups, restore drill and alerting (findings H1, M16, L16)

Runbooks: [`backup-restore.md`](../../runbooks/backup-restore.md), [`uptime-and-alerts.md`](../../runbooks/uptime-and-alerts.md), [`incident.md`](../../runbooks/incident.md). Variables: [`scripts/ops/backup.env.example`](../../../scripts/ops/backup.env.example). Alert config: [`alert-rules.json`](../../runbooks/alert-rules.json).

**Status (owner decision, 2026-11-14):** backups are deferred while Flump is in pre-production testing, so sections 1 to 8 below are not set up yet and the restore-drill law is advisory: it warns and never fails (`ENFORCED = false` in `scripts/backend-laws/check-restore-drill.ts`). When backups go live, complete this section, log the first drill and set `ENFORCED` to `true`. Until then, a migration that rewrites data (BE-05's liability sign backfill is the first) can only be undone through its own before-image table, not from a backup.

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
- `🏋️ Backend load smoke`: weekly, on demand and on pull requests that change the load smoke (BE-17). Shared runners are too noisy for it to block a merge.

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
| `WEB_CLIENT_IP_HMAC_KEY` | Same value as the backend, at least 32 characters. Required in production since SEC-A: the web server does not start without it |
| `SENTRY_AUTH_TOKEN` | A Sentry organisation token (or a personal token with the `project:releases` scope). Set it as an ordinary service variable: Railway passes it to the Docker build as a build argument, used in the build stage only, so it is not in the final image. Railway's builder does not support BuildKit secret mounts. Optional: without it the build skips source map upload |
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
- **Restricted database role for `audit_events`.** See "SEC-A / SEC-F" below: SEC-F added the TRUNCATE and DELETE guards, and the role is the remaining owner step.
- **Terms acceptance record (M-PRIV3).** The backend route exists since BE-15 (`POST /v1/user-profile/terms-acceptance`, see below). The web acceptance step that calls it is still a follow-up.

## BE-04 / BE-15: account deletion and privacy variables (findings N1, N2, N3, M-PRIV3)

Four backend variables keep account deletion, the client-IP rate limit and terms acceptance working in production. Since SEC-A the first three are required: the backend refuses to start in production without them (see "SEC-A / SEC-F" below). `TERMS_VERSION` stays optional: while it is unset in production, the backend logs one warning naming it at boot, and `GET /health/ready` still answers 200 but counts it in `configWarnings` (a number only: the public route never names a variable).

### 1. Backend service variables (Railway, production)

| Variable | What it does | What breaks while it is unset |
|---|---|---|
| `DELETION_TOMBSTONE_KEY` | HMAC key for the hashed user id kept after an account is erased (`openssl rand -hex 32`, at least 32 characters). **Never rotate it**: old tombstones become unfindable | The backend does not start (SEC-A). Also refused when shorter than 32 characters |
| `WEB_CLIENT_IP_HMAC_KEY` | Verifies the signed client-IP header from the web service (BE-07). Same value on the web service | The backend does not start (SEC-A) |
| `WORKOS_API_KEY` | Lets account deletion remove the WorkOS login, and lets the password reset and name updates reach WorkOS | The backend does not start (SEC-A) |
| `TERMS_VERSION` | The terms and privacy notice version people accept, for example `2026-11-01` (1 to 64 letters, digits, dots, dashes or underscores). Change it whenever the legal pages change | `POST /v1/user-profile/terms-acceptance` answers 503 `terms_not_configured`. A request naming any other version gets 409 `terms_version_mismatch` |

### 2. Database

The migration `AuditActionUserExported1795000000000` lets `audit_events` hold the new action `user.exported`: each data export now writes one audit row (N3). It changes only the CHECK constraint. Its `down()` never deletes audit rows: it refuses with an error while any `user.exported` row exists, so export or archive those rows before reverting.

### Notes

- While `BETA_ALLOWED_EMAILS` is set, removing someone from the beta does not stop their existing AI connection tokens. Revoke the tokens, or use the MCP allow-list.
- Optional: rate-limit rows written before this release keep raw keys until they expire (about a day).

### How to know it worked

- [ ] `GET /health/ready` answers 200 with `"configWarnings": 0` (`1` while `TERMS_VERSION` is unset, which is expected until the terms are published). Date: ____ When it is higher than expected, the names are in the backend boot log (Railway, backend service, deploy logs) as `warn` lines, one per unset variable, in this form: `<VARIABLE_NAME> is not set in production. See docs/audit/backend-2026-11/OWNER-SETUP.md (BE-04 / BE-15).`
- [ ] Download your data export in the web app, then in `railway connect Postgres`: `SELECT action FROM audit_events ORDER BY created_at DESC LIMIT 1;` shows `user.exported`.
- [x] SEC-A has made the three keys required (owner confirmed them set on 15 November 2026).

## SEC-A / SEC-F: keys required at boot, audit-trail integrity (findings N1, M9, S3, S10)

### 1. Variables production now refuses to start without

Check these **before** deploying the release that contains SEC-A. A service that is missing one exits at boot with a message naming the variable (never its value), and Railway keeps the previous deployment running.

| Service | Variable | Rule |
|---|---|---|
| backend | `DELETION_TOMBSTONE_KEY` | Set, at least 32 characters. Never rotate it |
| backend | `WEB_CLIENT_IP_HMAC_KEY` | Set, at least 32 characters, the same value as on the web service |
| backend | `WORKOS_API_KEY` | Set |
| web | `WEB_CLIENT_IP_HMAC_KEY` | Set, at least 32 characters, the same value as on the backend |

These join the variables the backend already required in production: `DATABASE_URL` (or `DB_HOST`), `CORS_ALLOWED_ORIGINS`, `MCP_AUDIT_HMAC_KEY` (at least 32 characters), `WORKOS_CLIENT_ID`, `BANKING_TOKEN_ENCRYPTION_KEY` (at least 32 characters), and a beta allow-list or `BETA_OPEN=true`. `TERMS_VERSION` is still optional. The marketing service is unchanged.

"Production" means `NODE_ENV=production`, which both Docker images set. The web server also treats an unset `NODE_ENV` as production.

- [ ] Before the release: `GET /health/ready` on the current production backend shows `"configWarnings": 1` (only `TERMS_VERSION` unset). That proves the three backend keys are set and the tombstone key is long enough. A higher number means a key is missing or too short: fix it first. Date: ____
- [ ] Before the release: the web service's `WEB_CLIENT_IP_HMAC_KEY` is the same value as the backend's (compare in Railway; do not paste either anywhere). Date: ____
- [ ] After the release: both services are running the new deployment, and `GET /health/ready` still shows `"configWarnings": 1`. Date: ____

Also in SEC-A (S3): a Railway service never uses the committed development banking key, whatever its `NODE_ENV`. Production already required `BANKING_TOKEN_ENCRYPTION_KEY`, so nothing changes there.

### 2. Database

The migration `AuditEventsDeleteAndTruncateGuards1795100000000` adds two triggers to `audit_events` and changes no row. After it, the table refuses every UPDATE and every TRUNCATE, and refuses a DELETE unless the transaction declares one of two reasons: `retention` (the daily purge) or `erasure` (account deletion, and the staging reseed). Its `down()` drops only the two triggers and their functions.

- [ ] After deploy, in `railway connect Postgres`, inside `BEGIN; ... ROLLBACK;`: `TRUNCATE audit_events;` fails with `audit_events cannot be truncated`, and `DELETE FROM audit_events;` fails with `audit_events rows are deleted only by retention or erasure`. Date: ____
- [ ] The next retention run still logs `retention audit_events deleted=<n>` and exits 0. Date: ____

To remove audit rows by hand (only ever on a database that is not production), declare the reason in the same transaction: `BEGIN; SELECT set_config('flump.audit_delete', 'erasure', true); DELETE FROM audit_events WHERE ...; COMMIT;`

### 3. Restricted database role (owner step, optional before public launch)

The triggers stop a bug in the app from rewriting or removing audit rows. They do not stop someone holding the app's database credential, who can declare a reason or drop a trigger. A role that does not own the table closes that. Sketch, to adapt and run as the database owner:

```sql
-- The API's role: reads and appends audit rows, cannot delete, truncate or alter the table.
CREATE ROLE flump_app LOGIN PASSWORD '<generate>';
GRANT USAGE ON SCHEMA public TO flump_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO flump_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO flump_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM flump_app;
```

Three things must be settled before using it, which is why it is not done here:

- Migrations run at backend boot as the backend's role, and need to own the tables. The API would need a second connection, or migrations a separate deploy step.
- Account deletion deletes the person's audit rows as the API's role. It would need its own narrow path (for example a `SECURITY DEFINER` function owned by the table owner), or the decision below.
- The retention cron keeps the owner role, or a role with DELETE on the tables it purges.

### 4. Receipt encryption key (review fix, 17 Nov 2026): done 17 Nov 2026

**Done 17 Nov 2026:** the owner set `RECEIPT_ENCRYPTION_KEY` on the backend service in Railway. The checks below still apply around the next release.

From the release after 17 Nov 2026, the backend also refuses to start in production without `RECEIPT_ENCRYPTION_KEY`. It encrypts the tax receipts people upload. The boot error names the variable, never its value. A versioned keyring in `RECEIPT_ENCRYPTION_KEYS` (`<version>:<secret>` entries) may replace it.

| Service | Variable | Rule |
|---|---|---|
| backend | `RECEIPT_ENCRYPTION_KEY` | Set, at least 32 characters. Never rotate it by replacing the value: rotate by moving to `RECEIPT_ENCRYPTION_KEYS` with the old key kept as an earlier version |

If the backend already has the variable (receipts were encrypted by `EncryptTaxReceipts1795200000000`), nothing is needed. If not:

- [x] Generate the key on your own machine with `openssl rand -base64 48` and paste the output straight into the backend service's variables in Railway. Never paste it into a chat, an issue, a commit or any file in this repository. Date: 17 Nov 2026
- [ ] Before the release: `GET /health/ready` on the current backend still shows `"configWarnings": 1`. Date: ____
- [ ] After the release: the backend runs the new deployment, and a receipt uploaded before the release still opens. Date: ____

### Follow-ups the owner decides

- **N12: keep a pseudonymised audit copy on erasure?** Today erasure deletes the person's `audit_events` rows (the `user.deleted` row has no user id). Keeping a copy keyed by the tombstone hash would preserve the security trail; it also keeps more data after an erasure. Not decided, so the behaviour is unchanged.
- **`agent_audit_events`** has no UPDATE, TRUNCATE or DELETE guard. The same triggers would fit; not in SEC-F because finding S10 covers `audit_events` only.

---

## BE-17 / SEC-E: load smoke, E2E retries and image hardening (findings M23, L10, M17, N6, S7, S8, S9)

Everything in this PR is in the repository; nothing needs a setting to take effect. These are the things only the owner can do or decide.

### 1. Nothing to add to branch protection

The PR adds one job, `🏋️ Backend load smoke`, in its own workflow. Leave it out of the required checks. It runs every Tuesday at 04:23 UTC; a red run means a read route got much slower or started failing. How to read it: `scripts/load/README.md`.

The new image checks (file ownership, web image contents, the build token canary) are steps inside `🐳 Docker images`, which is already required.

### 2. Sentry build token (web service, Railway)

Railway's builder cannot use secret mounts, so the web image takes `SENTRY_AUTH_TOKEN` as a build argument. CI now proves on every image change that the value is not in the final image's history, config or files. It can still sit in Railway's build cache for the build stage.

- [ ] Check the token in the web service's variables is a Sentry **organisation token** with source map upload only (Sentry, Settings, Developer Settings, Organization Tokens), not a personal token. Date: ____

### 3. E2E retries are off

The required `🎭 E2E smoke` check no longer retries a failed test. If a test starts failing now and then, the fix is to repair it or add it to `apps/e2e/quarantine.ts` with a reason (`apps/e2e/README.md`), not to re-run until green.

### 4. Decision: Semgrep rule packs (the rest of finding S7)

The Semgrep image is pinned by digest, but the rule packs (`p/owasp-top-ten`, `p/typescript`, `p/react`, `p/nodejsscan`) are fetched from the Semgrep registry on each run and cannot be pinned to a version. The re-score suggests copying the rules into the repository. They were not copied: the registry rules come under the Semgrep Rules License, which limits redistribution, and this repository is public. Choose one:

- [ ] Accept the remaining risk (a changed upstream rule can add or remove findings; it cannot run code in CI beyond the pinned Semgrep image). Date: ____
- [ ] Or ask for a follow-up that replaces the registry packs with rules whose licence allows copying, kept in the repository.

### How to know it worked

- [ ] The first scheduled `🏋️ Load smoke` run is green, and its summary shows p95 figures near the baseline in `scripts/load/budget.json`. Date: ____
- [ ] After the next deploy, the web app loads and signs in as before (the web image now holds the build output only). Date: ____
