# @flump/e2e

Playwright smoke suite. It runs on every PR in CI (job "E2E smoke") and takes well under three
minutes. It starts the **built** backend, web app and marketing site, so build first.

## Run it

```sh
docker compose up -d postgres                              # or any Postgres
docker compose exec postgres createdb -U postgres flump_e2e
bun run build
bun run test:e2e                                           # from the repo root
```

Needs Bun 1.4.4 (the version pinned in CI; older Bun cannot render the marketing site) and
Chromium: `bunx playwright install chromium`. Failures leave a trace under
`apps/e2e/test-results`; open it with `bunx playwright show-trace <trace.zip>`.

| Variable                                                   | Default                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| `E2E_DATABASE_URL`                                         | `postgres://postgres:postgres@localhost:5432/flump_e2e` |
| `E2E_BACKEND_PORT` / `E2E_WEB_PORT` / `E2E_MARKETING_PORT` | `4100` / `3100` / `3101`                                |

The database name must contain the word `e2e`; the suite refuses anything else because it
writes data for the dev-bypass user. Ports differ from the dev defaults so `bun run dev` can
keep running.

## How sign-in works

There is no real WorkOS in the suite. The backend runs with `AUTH_DEV_BYPASS=true` (it accepts
the dev session token). The web server runs with `NODE_ENV=development`, `AUTH_DEV_BYPASS=true`
and `E2E_DEV_SESSION=true` (`apps/web/app/utils/devSession.server.ts`): `/login` then sets an
HttpOnly `flump_dev_session` cookie and `/logout` clears it, so sign-in and sign-out are real
round trips. The flag is refused, and the web server refuses to boot, unless `NODE_ENV` is
`development` and `AUTH_DEV_BYPASS=true`, and when `RAILWAY_ENVIRONMENT` or `WORKOS_API_KEY` is
set. Never set it in a deployed environment.

Global setup signs in once, completes onboarding and seeds three accounts through the `/api`
proxy, and saves the cookie as storage state for the authenticated specs.

## Known gaps

- `api-proxy.spec.ts` carries a `test.fail` for E20-N8: the root loader still serialises the
  access token into the document. When N8 lands that test goes red; remove `test.fail`.
