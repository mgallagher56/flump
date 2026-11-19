# Backend load smoke

Backend audit 2026-11, finding M23 (BE-17). A repeatable, fixed-rate run of the main read routes
against a backend on this machine, with a recorded baseline and a budget.

## What it does

`load-smoke.ts` waits for `/health/ready`, writes a small set of sample rows for the dev user if
they are not there (6 accounts, 20 budget entries), makes one unrecorded pass, then for 45 seconds
sends:

- 4 authenticated reads a second, round-robin over `/user-profile`, `/accounts`,
  `/account-details`, `/budget-entries` and `/tax-records`;
- 10 `/health/ready` requests a second (this route runs a database query and has no rate limit).

Requests leave on a fixed timetable whether or not earlier ones have answered, so a slow server
shows up as a longer tail, not as fewer requests. It prints p50, p95, p99 and the maximum per
route, writes the same to `load-smoke-result.json`, and exits 1 if the run is over the budget in
`budget.json`. Any status other than 200 counts as a failed request, and the budget allows none.

## It only runs against this machine

`assertLocalTarget` in `lib.ts` refuses any target that is not plain `http` on `localhost`,
`127.0.0.1` or `[::1]`, refuses credentials, paths and queries in the URL, and refuses to run at
all when a Railway variable or a proxy variable is set. There is no flag to turn this off. Requests never follow a
redirect. The backend it talks to must be in development mode with the dev sign-in bypass, which
the backend itself refuses to start with on Railway (`apps/backend/src/auth/auth.config.ts`).

Never point it at production, staging or any deployed address. To load-test a deployed
environment, use a separate tool and plan, agreed with the owner.

## Run it locally

A Postgres database whose name says what it is for, the built backend, then the script:

```bash
docker run -d --rm --name flump-load-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=flump_load_test -p 127.0.0.1:55432:5432 postgres:18-alpine
```

```bash
bunx turbo run build --filter=backend...
```

```bash
cd apps/backend && AUTH_DEV_BYPASS=true NODE_ENV=development WORKOS_API_KEY= RAILWAY_ENVIRONMENT= PORT=4100 DB_SSL=false \
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/flump_load_test \
  CORS_ALLOWED_ORIGINS=http://localhost:3100 FRONTEND_URL=http://localhost:3100 \
  sh -c 'bun run migration:run && bun dist/main.js'
```

In a second terminal, from the repo root (the token is the dev bypass constant in
`apps/backend/src/auth/dev-bypass.verifier.ts`; it is not a secret and only works in that mode):

```bash
LOAD_AUTH_TOKEN=<dev bypass token> bun run test:load
```

Settings: `LOAD_BASE_URL` (default `http://127.0.0.1:4100`), `LOAD_RATE` (authenticated requests
a second, default 4), `LOAD_HEALTH_RATE` (default 10), `LOAD_DURATION_S` (default 45),
`LOAD_OUTPUT`.

## In CI

`.github/workflows/load-smoke.yml` runs it weekly (Tuesdays 04:23 UTC), on demand, and on pull
requests that change `scripts/load/**` or the workflow. It is advisory: not a required check, and
it never runs on push to `main`. The result is in the job summary and the `load-smoke-result`
artifact. A red scheduled run means a route got slower or started failing: compare the summary
with the baseline below before changing the budget.

## Baseline and budget

`budget.json` holds both. The baseline is one CI run on a GitHub-hosted `ubuntu-latest` runner,
recorded with its date, commit and run: overall p95 4.9 ms and p99 6 ms over 630 requests with no
errors. The budget is set well above it (overall p95 75 ms, any route's p95 100 ms, overall p99
200 ms) because shared runners are noisy: it is there to catch a route becoming an order of
magnitude slower or starting to fail, not a 20% drift.

To re-record the baseline after a deliberate change (a new route in the mix, a different rate):
run the workflow from the Actions tab, copy the numbers from its summary into `baseline` in
`budget.json` with the date, commit and run number, and adjust `budget` in the same PR.
`lib.test.ts` fails if the budget is not above the baseline.

## What it does not measure

- **Throughput limits.** The backend allows one address 300 requests a minute and one user 600
  reads a minute (`apps/backend/src/security/rate-limit.decorator.ts`), and the dev bypass has a
  single user. So the smoke sends at most 240 authenticated requests a minute (`planProblem` in
  `lib.ts` enforces this) and cannot find the point where the server saturates.
- **Many users or large accounts.** One user with a small data set. Query plans at scale are
  covered separately by `apps/backend/src/migrations/query-plans.integration.spec.ts`.
- **Writes, imports, bank sync and the MCP endpoint.** Reads only.
- **The production network path.** No TLS, proxy or Railway hardware.

A load test with many users needs a test-only way to sign in as more than one user. That is a
change to the backend's sign-in code, so it is a follow-up, not part of this smoke.
