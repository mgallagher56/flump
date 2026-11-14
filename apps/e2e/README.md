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

## Visual regression

`visual/pages.spec.ts` (config `playwright.visual.config.ts`) takes full-page screenshots of every
row in `visual/routes.ts`: each signed-in screen, the signed-out tools index, one calculator and
`/sandbox` in the web app, and the marketing home, pricing, tools and MCP pages. Each one is shot
at 375 and 1280 wide, light and dark (four Playwright projects). Before each shot it also checks:

- no horizontal overflow at 375 (names the elements that stick out);
- no SVG gradient `<stop>` computing to black (an unresolved CSS variable falls back to black);
- a non-empty `<title>`.

It runs in its own workflow, `.github/workflows/visual-regression.yml` ("Visual regression"),
on pull requests and by hand, alongside the required CI Pipeline jobs. It never runs on push to
`main`, so it cannot hold up Railway deploys.

**Deterministic output.** The job runs in the `mcr.microsoft.com/playwright:v1.65.0-noble`
container with its own empty database, seeded by the same global setup as the smoke suite. The
three servers run under libfaketime, starting at `FROZEN_NOW` in `support/clock.ts`
(`E2E_FREEZE_CLOCK=1`), and the browser clock is installed at the same instant, so month labels,
check-in prompts and chart axes never move. Animations are off, motion is reduced, fonts are
awaited, and Playwright retakes a shot until two in a row match. The budget is `maxDiffPixels: 100`
per shot (an absolute count, so a small but wrong logo still fails). To hide something that
changes from run to run, give it a `data-visual-mask` attribute.

**Baselines** live in `visual/__screenshots__/<route>-<project>.png`. They are only valid when
generated in that container on Linux x64: font rendering differs on macOS and on Apple Silicon,
so never commit baselines from your own machine.

### Updating baselines

After an intended visual change (or a Playwright bump, which changes Chromium):

1. Push the branch, then run the workflow on it:
   `gh workflow run visual-regression.yml --ref <branch> -f update=true`
   (or Actions → Visual regression → Run workflow, ticking "Regenerate baselines").
   The manual trigger works once this workflow is on `main`.
2. Download the regenerated images over the old ones and commit them:

   ```sh
   gh run download <run-id> -n visual-baselines -D apps/e2e/visual/__screenshots__
   ```
3. Look at the changed images in the PR diff before committing; that review is the point.

A pull request run also writes any **missing** baseline (a new route) into the same
`visual-baselines` artifact, so a new row in `visual/routes.ts` needs no manual run. When shots
differ, the `visual-report` artifact holds the expected, actual and diff images and the HTML
report.

Locally, `bun run test:visual` (from the repo root, after `bun run build`) runs the layout checks
and compares against the committed baselines. Expect pixel differences on macOS; use it for the
layout checks and to try new routes, and let CI produce the images.

### Making it required

It starts as a non-required check with `continue-on-error: true`. Once it has passed on about
20 pull requests in a row without a flaky failure:

1. Remove `continue-on-error: true` from the `visual` job.
2. In GitHub, Settings → Rules (or Branches → branch protection for `main`), add the status check
   "🖼️ Visual regression" to the required checks.
