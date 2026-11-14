# Incident runbook

For anything that stops users using Flump, risks their data, or exposes it (finding L16). One person (the owner) handles it during the private beta; the steps are written so they can be followed tired, at night, from a laptop.

## Severity

| Level | Means                                                  | Examples                                                                   | Respond      |
| ----- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ------------ |
| P1    | Data lost, corrupted or exposed; or the whole app down | Bad migration, leaked secret, database gone, backend crash-loop            | Now          |
| P2    | A main feature broken for everyone, or backups failing | Sign-in broken, dashboard 500s, two missed backup heartbeats, failed drill | Same day     |
| P3    | Degraded, a workaround exists, or one user affected    | Slow page, one import failing, Sentry error spike with no user report      | Next workday |

A suspected data exposure is always P1, and UK GDPR gives 72 hours from awareness to report a notifiable breach to the ICO: start the clock in the log at step 1.

## Steps

1. **Open a log entry** (template below) with the time you noticed and the alert or report that told you. Write as you go; times in UTC.
2. **Stop the harm** before finding the cause:
   - Crash-loop or bad deploy: roll back (`first-deploy-pr368.md#rollback`; Railway, the service, Deployments, the last good one, Redeploy).
   - Data being damaged: stop writes (backend replicas to 0, or web maintenance), then follow `backup-restore.md` section 4. Never restore over the live database.
   - Leaked secret: rotate it first (`secret-scan.md`), then look for use.
   - Bank data at risk: `BANK_CONNECTIONS_ENABLED` stays false; if it was ever turned on, turn it off.
3. **Find what changed**: the last deploy (`deploy-log.md`), the Sentry release of the first event, Railway logs (`railway logs -s backend -n 200`), `/health` versus `/health/ready` (`uptime-and-alerts.md` section 5).
4. **Fix forward or keep the rollback.** Every fix goes through a PR with green CI, as normal; no hand edits to production data. If data needs repair, write it as a reviewed script, take a backup first (`bun scripts/ops/backup-run.ts` with `BACKUP_LABEL=pre-repair`), and run it once.
5. **Confirm recovery**: `bash scripts/ops/smoke.sh production`, monitors green, Sentry quiet for 30 minutes, sign in and check your own data.
6. **Tell users** if they noticed or their data was affected: what happened, what data, what you did, what they need to do (usually nothing). Plain words, no blame. For a personal-data breach decide within 72 hours whether to report to the ICO and record the decision and reason either way.
7. **Close the log** with RPO (data lost, minutes) and RTO (time to recovery), the cause, and follow-ups as issues. If a backup or restore was involved, add a drill-log entry.

## Log template

Append to the bottom of this file under "Incidents". No row data, user ids, emails or secrets.

```text
### YYYY-MM-DD HH:MM UTC - <short title> - P<n>
Noticed:            HH:MM (how: alert / user report / own check)
Harm stopped:       HH:MM (how)
Resolved:           HH:MM
Users affected:     <count or "unknown">
Data affected:      none / lost (RPO <n> min) / exposed (what kind)
Cause:
Fix (PR link):
ICO report decision (exposure only): reported HH:MM / not notifiable because ...
Follow-ups:
```

## Incidents

<!-- append new incidents below -->
