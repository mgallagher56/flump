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

## Retries are off, and the quarantine list

The suite runs with `retries: 0` everywhere, CI included (backend audit 2026-11, finding L10). A
test that fails once fails the job: a pass on a second try would hide a flaky spec.

If a spec turns out to be flaky and cannot be fixed straight away, do not bring retries back. Add
it to `QUARANTINE` in [`quarantine.ts`](./quarantine.ts) with the spec file, the test title, a
reason and the date. A quarantined test is left out of the gating run, and every CI run names it
in the "E2E smoke" job summary with a warning on the run page, so it stays visible until fixed.
The list holds five entries at most and `scripts/ci-config.test.ts` checks its shape. To run only
the quarantined tests, for example to see whether one still fails:

```sh
E2E_QUARANTINE=only bun run test:e2e
```

Remove the entry in the PR that fixes the spec.

## Requirements

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

Global setup signs in once, seeds the **homeowner** persona through the `/api` proxy and saves the
cookie as storage state for the authenticated specs.

### Personas

`support/personas.ts` holds two neutral sample households for the single dev-bypass user:

| Persona     | Household                                                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renter`    | Age 29, £32,000 salary, Plan 2 student loan, rent £950 and other spending £800 a month, £4,500 cash (current and savings), £9,000 pension at 5% plus 4% employer, a £1,800 credit card                                                       |
| `homeowner` | Age 44, £58,000 salary, a £310,000 home with a £186,000 repayment mortgage (4.5%, 218 months, £1,250 a month), other spending £1,500, £21,000 cash (current, savings, cash ISA), £96,000 pension at 8% plus 5%, a car loan and a credit card |

Each has profile facts, accounts with rates and payments, a budget across the standard
categories, and six past months of balances written through `PUT /snapshots/:month` (the
check-in endpoint, which accepts past months), so history charts and "since last month" figures
have data. The current month is left unrecorded, so the dashboard's check-in card shows.
Dates are relative to `FROZEN_NOW` when the servers run under the frozen clock, else to today.

`applyPersona(page, name)` is idempotent: when the stored accounts, budget and salary already
match it writes nothing (it does not check the months of history). Otherwise it clears the user's financial data with
`POST /user-profile/reset-financial-data` (only if there is anything to clear: that endpoint is
rate-limited to 10 calls an hour per user) and writes the persona again. A reset leaves the
profile's `hasResetFinancialData` flag set; nothing the personas show depends on it.

Two things to know when running locally against a database you keep. A visual run spends two
resets (homeowner, then renter), so about five runs an hour reach the limit and the seed fails
with 429: recreate the database. And the smoke suite's check-in test records the current month,
which the seed does not undo, so a visual run after it shows no check-in prompt: recreate the
database before comparing shots. CI always starts from an empty database.

### The new-user journey

`tests/new-user-journey.spec.ts` walks a brand-new user through setup, a first account, a first
budget entry and the dashboard. The suite has one user, so the spec clears it with
`clearToNewUser` (the same reset endpoint) and runs in its own Playwright project, `new-user`,
after every spec in `chromium` has finished. If a `chromium` spec fails, the journey does not run.
It leaves the journey's data behind; global setup seeds the homeowner again on the next run.

Each smoke project sends its own client address as `X-Forwarded-For` (`support/client-address.ts`),
and the servers share a per-run `WEB_CLIENT_IP_HMAC_KEY`, as production does. The backend then keys
its per-IP ceiling (300 requests a minute) on each project's address. Without that, the whole
suite counted as the web server's one address, and when the persona specs and the journey ran
inside one minute the journey's first budget entry was refused with 429.

Against a database you keep, a full smoke run therefore spends two resets (the journey, then the
next seed), so about five runs an hour reach the limit. To skip the journey while working on
another spec, run `bunx playwright test --project=chromium`. To run only the journey, run
`bunx playwright test --project=new-user --no-deps`.

## Known gaps

- `api-proxy.spec.ts` carries a `test.fail` for E20-N8: the root loader still serialises the
  access token into the document. When N8 lands that test goes red; remove `test.fail`.

## Visual regression

`visual/pages.spec.ts` (config `playwright.visual.config.ts`) takes full-page screenshots of every
row in `visual/routes.ts`: each signed-in screen, the signed-out tools index and one calculator in
the web app, and the marketing home, pricing, tools and MCP pages. Each one is shot
at 375 and 1280 wide, light and dark (four Playwright projects). Before each shot it also checks:

- no horizontal overflow at 375 (names the elements that stick out);
- no SVG gradient `<stop>` computing to black (an unresolved CSS variable falls back to black);
- a non-empty `<title>`.

**Renter pass.** After the four homeowner projects, the `renter-setup` project
(`visual/renter.setup.ts`) re-seeds the user as the renter, and four `*-renter` projects shoot the
household-dependent routes (`RENTER_ROUTES` in `visual/routes.ts`: dashboard, accounts, budget,
debt, mortgage, pension, savings, take-home) as `<route>-renter-<width>-<theme>.png`. It runs
through Playwright project `dependencies`, so when any homeowner shot fails the renter pass is
skipped for that run; a baseline regeneration run (`update=true`) passes and so always reaches it.

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

## Design sweep

`sweep/sweep.spec.ts` (config `playwright.sweep.config.ts`, `bun run e2e:sweep` here or
`bun run sweep:design` from the root) is a **local tool, not a CI job**. For each set in
`sweep/sets.ts` it re-seeds the persona, then shoots every page at 375x812 and 1280x800, light and
dark, as a full-page JPEG and a first-view `-fold` JPEG (quality 60), and records DOM metrics:

- `renter` and `mortgage` (the homeowner): every signed-in page, plus each secondary tab as
  `<page>--<tab>`;
- `dialogs` (homeowner, viewport shots): add and edit dialogs, the budget wizard, the check-in
  sheet, "Choose what shows here", the self assessment record forms, delete account, the mobile
  nav. Nothing is ever saved, deleted or finished;
- `onboarding`: each step, moving on with Next only;
- `out` (signed out web app) and `mkt` (marketing site).

Output goes to `docs/design/e16-polish/after/<set>/<page>-<width>-<theme>[-fold].jpg`, with
`after/metrics-<set>.json` in the same shape as `before/metrics-*.json` (N1 is `foldDistinct`, N
is `pageDistinct`, counted with the money, percentage and duration patterns of `countFigures`)
plus `heroes`, `notices`, `notSet` and `primaryButtons`. Anything that could not be opened is
listed in `after/unreachable-<set>.json`. `SWEEP_SETS=renter,dialogs` runs a subset. Build first,
and use free ports and a database whose name contains `e2e`, as for the other suites.

## Phone audit sweep

`sweep/phone.spec.ts` (config `playwright.phone.config.ts`, `bun run e2e:phone` here) is a
**local tool, not a CI job**, written for the phone audit in `docs/audit/phone-audit-2026-11`.
It drives the journeys in `sweep/phoneSets.ts` (J1 to J10 in `JOURNEYS.md`) at 320x568, 375x812,
390x844 and 430x932 in light and dark with touch and mobile emulation, and the main pages again
at 812x375 landscape. At each step it records the measured checks in `sweep/phoneChecks.ts`:
horizontal overflow, targets under 44px and cramped targets, inputs under 16px, keyboard types,
`autocomplete`, clipped text, fixed chrome heights, content under the bottom bar, the headline's
position, illustrations in the first view and layout shift. Overlays also record their edge,
height, close control, focus and background scroll lock, focus return and scroll after closing,
and a focus walk through their fields. Persona sets add scroll position after bottom-bar
navigation and Back, the loading and error states, axe at 375 in both themes and a 200% text pass.

Screenshots and JSON go **outside the repository** (`PHONE_OUT`, default
`<tmpdir>/flump-phone-audit`), because the repository is public. `PHONE_SETS=renter,mkt` runs a
subset and `PHONE_WIDTHS=375` narrows the widths. The sets re-seed the single dev user (the
renter, homeowner, debt payer, self-employed and near-retirement personas in
`support/personas.ts`), and the `newuser` set clears it, so it always runs last; a full run spends
about seven of the ten data resets allowed an hour. Build first, and use free ports and a database
whose name contains `e2e`, as for the other suites. Desktop emulation shows no on-screen keyboard:
the field walk catches script-driven jumps only.

Retirement plan is a friends-beta page: the backend answers 404 unless the user is listed in
`RETIREMENT_ALLOWED_USER_IDS`. To sweep it, set that variable to the dev-bypass user's id (see
`apps/backend/src/auth/dev-bypass.verifier.ts`) in the environment; the web servers inherit it.
Local test backend only.

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

## Interaction cost

`interaction/flows.spec.ts` (config `playwright.interaction.config.ts`, root script
`bun run test:interaction`) measures how much effort each core task takes (E38 S0, plan
`docs/audit/plans/E38-interaction-efficiency-audit-plan.md`). It does the seven core flows of the
plan, each three ways:

| Run                | Viewport | How it acts                                                                                                                               |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `desktop-pointer`  | 1280x800 | Mouse clicks; to replace a field's text, click it, Ctrl/Cmd+A, type                                                                       |
| `phone-touch`      | 375x812  | The same with taps (touch and mobile emulation)                                                                                           |
| `desktop-keyboard` | 1280x800 | Tab to each control (Shift+Tab when it is above the focus), then Enter (Space for a switch or checkbox); arrows in menus and radio groups |

The flows are budget editing, the monthly check-in, an account's whole life (add, rename, update
the balance, delete), adding and editing a debt and modelling extra payments, Self Assessment
records, salary and pension then the pension and mortgage what-ifs, and setup for a new user.
They are in `interaction/flows.ts`, written once against the `Actor` in `interaction/actor.ts`.

**What is counted.** An init script on every page reports each trusted `pointerdown` (a click or
tap) and `keydown` (one per key, so Ctrl+A is two), and how many dialogs are showing, to the test
through an exposed binding (`interaction/counter.ts`). So the counts are what the browser received,
not what the spec intended. Per flow and run:

- clicks or taps; picking an option in a native select is counted as one click without being sent
  (Playwright sets it, the browser draws the list) and shown as "select picks";
- keystrokes, every character typed included;
- Tab hops (Tab presses; backward with Shift held, one extra keystroke, when the control is above the focus);
- transitions: path changes plus opens of anything with `role="dialog"` or `"alertdialog"`
  (dialogs, sheets, the phone's More pages drawer, and popovers built on them). Query or hash
  changes, menus (`role="menu"`) and scrolling are not counted.

The touch run replaces a field's text with Ctrl/Cmd+A like the mouse run; a person on a phone
would select it another way, so its keystrokes are a close stand-in rather than exact.

`interaction/counter.spec.ts` (the `counter` project, which runs first) checks the counting on a
small page of its own, with every expected number worked out by hand in a comment.

**Deterministic.** One worker, in file order. Each mode starts from the seeded homeowner (the
first flow re-seeds when needed, then waits a minute so the backend's 120 writes a minute limit
never refuses a save inside a counted flow); onboarding starts from a cleared user. In CI the
servers and the browser run on the frozen clock of `support/clock.ts`. The flows do not clean up:
resets and deletes share the backend's limit of 10 an hour per user, and a run spends 8 of them
from an empty database (one re-seed per mode after the first, one account delete per mode, one
clear per mode), 9 when global setup must reset a database that already holds data. Against a database you keep, a second run within the hour gets 429
errors: recreate the database or wait.

**Baseline.** `docs/audit/interaction-cost/baseline.json` holds the counts per flow and run, and
`baseline.md` beside it the same as a table. A run compares itself with the baseline and writes
`test-results-interaction-cost/summary.md` (and the GitHub job summary): any flow whose clicks,
keystrokes, Tab hops or transitions rise is listed, and each one is printed as a warning.
**It never fails the run** (ED1 option (a), a coordinator ruling under the owner's delegation of
low-stakes decisions: warn-only until E38 S1 and S2 set the
target baselines). A run that finds lower costs lists them as improvements. A flow that fails
(most often because a page changed under it) is listed as "Not measured" and warned about, so it
never passes as "no change".

**Regenerating the baseline.** After a change that alters a flow (a redesigned page, or a fix that
saves steps):

- In CI (preferred, the counts it compares against come from the same container): run the
  workflow on your branch with `gh workflow run interaction-cost.yml --ref <branch> -f update=true`
  (the manual trigger works once the workflow is on `main`), or take the artifact from the pull
  request run, which always holds this run's baseline:

  ```sh
  gh run download <run-id> -n interaction-cost-baseline -D apps/e2e/test-results-interaction-cost
  cp apps/e2e/test-results-interaction-cost/baseline.{json,md} docs/audit/interaction-cost/
  ```

- Locally, after `bun run build`: `INTERACTION_UPDATE_BASELINE=1 bun run test:interaction`. It
  takes about five minutes. Off Linux the clock is not frozen and the file says so; the counts do
  not depend on the date within a month, but prefer the CI artifact for the committed file.

Look at the changed numbers in the diff before committing; that review is the point. When a flow
fails because a page changed, update its steps in `interaction/flows.ts` in the same pull request.

It runs in its own workflow, `.github/workflows/interaction-cost.yml` ("Interaction cost"), on pull
requests and by hand, with `continue-on-error: true` and not as a required check.
