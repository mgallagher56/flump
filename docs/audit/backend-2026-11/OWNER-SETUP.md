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

### 9. Branch protection (ruling D13, optional)

- [ ] GitHub, Settings, Branches, the `main` rule, "Require status checks to pass": add `💾 Backup and restore roundtrip` (workflow `.github/workflows/backup.yml`). It runs on every pull request, so it is safe to require.

### Before deploying any PR with an irreversible migration (BE-05 first)

- [ ] Trigger a manual backup run with `BACKUP_LABEL=pre-<pr>` (or wait for the night's run), then run the section 3 drill on it and log it. Only then deploy.
