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
and compares against the committed baselines. Like the smoke suite it reuses any server already listening
on its ports, which may be another checkout's build: pick free `E2E_*_PORT` values if unsure. Expect pixel differences on macOS; use it for the
layout checks and to try new routes, and let CI produce the images.

### Making it required

It starts as a non-required check with `continue-on-error: true`. Once it has passed on about
20 pull requests in a row without a flaky failure:

1. Remove `continue-on-error: true` from the `visual` job.
2. In GitHub, Settings → Rules (or Branches → branch protection for `main`), add the status check
   "🖼️ Visual regression" to the required checks.

## Accessibility gate

`a11y/pages.spec.ts` (config `playwright.a11y.config.ts`, root script `bun run test:a11y`) runs
page-level accessibility checks on every row of `visual/routes.ts`, reusing the visual suite's
servers, global setup, sign-in state, frozen clock and `settle`. One test per route per project
(`a11y/projects.ts`):

| Check    | Projects                                                                  | What fails                                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `axe`    | `375-light`, `375-dark`, `1280-light`, `1280-dark`, `1280-forced-colours` | `@axe-core/playwright` with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`; counted per rule id as failing nodes                                                                                                                            |
| `focus`  | the same five                                                             | Tabs through the first `MAX_TAB_STOPS` (25) elements: `no-visible-indicator` (focus changes no outline, box-shadow or border and there is no visible outline), `obscured` (the centre is under a fixed or sticky bar), `skip-link-not-first`, `no-skip-link` |
| `reflow` | `320-reflow`                                                              | `horizontal-overflow` at 320 px wide (WCAG 1.4.10), with the same overflow helper as the visual suite                                                                                                                                                        |
| `lang`   | `1280-light`                                                              | `html-lang-not-en-GB`                                                                                                                                                                                                                                        |
| `render` | `1280-forced-colours`                                                     | `empty-title`. Every project also asserts the route answers below 400 and, when signed in, does not bounce to `/login`                                                                                                                                       |

**Known-failures baseline.** `a11y/baseline.json` holds, per route, project and check, each rule
with its count. It stores no selectors or text, so it is stable from run to run. A run **fails**
when a rule appears that is not in the baseline or a count rises; the message names the route,
project, check and rule, lists example elements, and says how to update the baseline. A run
**passes** when counts fall or rules disappear, and prints an `IMPROVED` line for each, so a PR
that fixes something is never failed by a stale baseline. Lock improvements in by regenerating.

**Updating the baseline.** Locally, `A11Y_UPDATE_BASELINE=1 bun run test:a11y` rewrites
`a11y/baseline.json` (sorted keys, no timestamps; entries for routes and projects that did not
run are kept, routes no longer in `visual/routes.ts` are dropped). Or run the workflow with
`gh workflow run a11y-gate.yml --ref <branch> -f update=true` and download the result:

```sh
gh run download <run-id> -n a11y-baseline -D apps/e2e/a11y
```

Every run also writes its merged baseline to `test-results-a11y-findings/baseline.json` (the
`a11y-baseline` artifact in CI). While the committed file says `"generated": false` the suite
records and writes the baseline instead of failing, so the first run produces it.

It runs in its own workflow, `.github/workflows/a11y-gate.yml` ("Accessibility gate"), on pull
requests and by hand. It is **advisory**: `continue-on-error: true` and not a required check.
Make it required the same way as the visual suite once the baseline has stayed stable for about
20 pull requests. The committed baseline is generated in the CI container (Linux): contrast and reflow counts
can differ a little on macOS because fonts differ, so treat a local run as a preview; pick free `E2E_*_PORT` values and a database whose name contains `e2e`.
