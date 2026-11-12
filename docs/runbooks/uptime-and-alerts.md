# Uptime checks and alert routing

Owner setup guide (E18-N12, owner tasks O-08 and O-09). Nothing here is configured by an agent: it needs accounts, so every step is for the owner. Labels: **V** means verified against code or docs on 2026-11-12, **unverified** means confirm before relying on it.

## 1. Monitors

Create one monitor per service in an uptime tool (Better Stack Uptime or UptimeRobot; free-tier limits and UptimeRobot's commercial-use terms are **unverified**, check before choosing).

| Service   | Path            | Expect                         | Notes (V from code)                                                                                                                                              |
| --------- | --------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend   | `/health/ready` | HTTP 200, body contains `"ok"` | Runs `SELECT 1` with a 2 s timeout. Answers 200 `{status:"ok",version,commit}` or 503 `{status:"unavailable"}` (`apps/backend/src/health/health.controller.ts`). |
| Web       | `/healthz`      | HTTP 200, body contains `"ok"` | Resource route, no backend call (`apps/web/app/routes/healthz.ts`).                                                                                              |
| Marketing | `/healthz`      | HTTP 200, body contains `"ok"` | Express ops router (`apps/marketing/server/ops.ts`).                                                                                                             |

- Interval: 3 to 5 minutes. Keyword check on `ok` (the 503 body contains `unavailable`, not `ok`, so the keyword also guards against a wrong 200).
- Alert only after 2 consecutive failures (about 6 to 10 minutes) to keep noise down.
- The backend liveness path `/health` is DB-free. Use it only for Railway's own healthcheck, not for uptime: it stays green during a database outage.
- Staging monitors are optional. Staging has no URL defaults by design (`scripts/ops/smoke.sh staging` needs `BACKEND_URL`, `WEB_URL` and `MARKETING_URL`).
- Run `bash scripts/ops/smoke.sh production` after setup to confirm the same URLs answer before pointing a monitor at them.

### Backup heartbeat (future, A-16)

When the backup cron exists, create a healthchecks.io check with a period matching the schedule plus a grace period, and have the cron `curl` the ping URL only on success. A missed ping alerts. Until A-16 lands there is nothing to ping: do not create the check early, it would alert immediately.

## 2. Alert routing

| Source                  | Event                                          | Channel                                | Who              |
| ----------------------- | ---------------------------------------------- | -------------------------------------- | ---------------- |
| Railway project webhook | `Deployment.failed` (V), and the crashed state | Discord or Slack channel on your phone | Owner            |
| Sentry alert rule       | New issue, or more than 10 events in 1 hour    | Email plus the same channel            | Owner            |
| Uptime tool             | Down for 2 consecutive checks                  | Email plus phone push                  | Owner            |
| Railway                 | Crash email                                    | Project members                        | none (automatic) |

Railway facts (V, docs.railway.com/observability/webhooks and /deployments/deployment-actions):

- Webhooks are configured per project and fire for any service, across all environments in the project.
- After 10 automatic restarts a deployment becomes Crashed, and Railway sends webhooks and emails to project members.
- The only event type string the webhook docs spell out is `"Deployment.failed"`. The exact string for a crash (likely `Deployment.crashed`) is **unverified**: choose the events in the webhook form, trigger Test Webhook, and read the `type` field in the payload before relying on a filter. If unsure, leave events unfiltered and tolerate the noise at first.
- Discord and Slack have provider-specific webhook URL formats (Railway docs, "Muxers"): paste the channel's webhook URL directly.
- Railway has no log-based alerts (inference). Use Sentry for errors. CPU, RAM and disk Monitors need the Pro plan (draft E18, V).

### Setup steps (owner)

1. Railway: project Settings, Webhooks, add the Discord or Slack URL, choose the deployment events, Save.
2. Uptime tool: add the three monitors above, set the alert policy to email plus push, and install the tool's mobile app.
3. Sentry (after E18-N1 to N3 land): alert rule, "new issue" and "more than 10 events in 1 hour", actions email plus the channel integration.

## 3. Test each alert

Do these once after setup, and again after changing a route.

| Alert           | How to test                                                                                                                                                                                                    | Pass when                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Railway webhook | Webhook form, Test Webhook (10 s timeout; or the Railway MCP `test-webhook` tool)                                                                                                                              | The sample payload appears in the channel and the form shows a 2xx status. |
| Uptime          | Use the tool's "send test notification". For a real check, add a temporary monitor on a path that returns 404 (for example `/healthz-test`) and delete it afterwards. Do not stop production services to test. | Email and push both arrive within 10 minutes.                              |
| Sentry          | Use the alert rule's "Send test notification", or send a test event from staging only.                                                                                                                         | Email and channel message arrive.                                          |
| Heartbeat       | Skip a ping once the backup cron exists.                                                                                                                                                                       | Alert arrives after the grace period.                                      |

## 4. Noise budget

Target: fewer than 2 alerts a week that needed no action (E18 draft, section 19). Review weekly during the private beta. If the budget is exceeded, in this order: raise the failure count before alerting, widen the interval to 5 minutes, tighten the Sentry rule, then drop the lowest-value channel. Do not mute alerts without writing down why.

## 5. Triage

| Alert                          | Check first                                                                                                                                                                                     | Then                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Backend monitor down, web fine | `railway logs -s backend -n 200`; open `/health` (liveness). If `/health` is 200 and `/health/ready` is 503, the database is the problem: check the Postgres service status and recent deploys. | Fix forward, or roll back (below).                               |
| Web or marketing down          | Latest deployment status and logs for that service.                                                                                                                                             | Roll back that service.                                          |
| All three down                 | Railway status page, then project status in the dashboard.                                                                                                                                      | Usually platform-side: wait, do not redeploy blindly.            |
| `Deployment.failed`            | Build or start logs of the failed deployment. The previous deployment keeps serving if a healthcheck is set.                                                                                    | Fix forward with a new commit.                                   |
| Crashed (10 restarts)          | Boot logs: migration error or missing env var are the usual causes.                                                                                                                             | Roll back immediately without a healthcheck (crash-loop outage). |
| Sentry new issue               | Release (commit) of the event, and whether it started with the last deploy.                                                                                                                     | Fix forward, or roll back if user-facing and recent.             |

Rollback: follow [`first-deploy-pr368.md#rollback`](./first-deploy-pr368.md#rollback) (the heading `## Rollback` exists, V). Two points from it: set healthcheck paths to be compatible with the build you roll back to, and Hobby keeps images for 72 hours, after which Redeploy rebuilds from source. Never delete rows from the `migrations` table to undo a migration.

Log each incident and time to resolution (target: under 1 hour during the private beta).
