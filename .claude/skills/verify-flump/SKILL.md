---

name: verify-flump
description: Launch a disposable local Flump stack (Postgres container, built backend, web app and marketing site, signed in as a seeded persona) and drive the apps/web UI with Playwright journeys that save screenshots, ARIA snapshots and API read-backs as proof. Use to prove a web app change works in the real app, not just in unit tests or Storybook, before claiming it done or opening a PR.
---

# Verify Flump

Proves behaviour in the real web app (`apps/web`) the way a user meets it: a browser signed in as a sample household, clicking through pages, with the saved data read back afterwards. Every run gets its own Postgres container and free ports, so runs never touch `bun run dev`, the e2e suite, other worktrees' databases or any deployed environment.

Never drive the Railway environment called "production" (it is the shared staging environment) or any other deployed URL. This skill only drives instances it started.

Other surfaces, not covered here: the marketing site (`apps/marketing`, launched only so sign-out has somewhere to land), the NestJS API on its own, the MCP server (`packages/mcp`) and the Expo app. Components on their own belong to Storybook (`bun run --cwd apps/web storybook`).

Everything goes through one helper, run from the repo root:

```bash
.claude/skills/verify-flump/scripts/verify-flump <up|doctor|drive|seed|down|list>
```

Below, `V` means `.claude/skills/verify-flump/scripts/verify-flump`.

## Launch

```bash
V up                         # builds, starts, seeds the homeowner persona; prints the run id
V up --persona renter        # another persona from apps/e2e/support/personas.ts
V up --no-seed              # no persona and no saved session (journeys that sign in themselves)
V up --skip-build            # reuse the current build output (only if nothing changed since)
```

What `up` does, in order: builds `backend`, `@flump/web` and `marketing` with turbo (cached, so a repeat build takes seconds; one automatic retry for the fresh-worktree `Could not load styled-system/css` race); starts `postgres:18-alpine` as container `flump-verify-<run-id>-pg` on a free `127.0.0.1` port with database `flump_e2e`, and waits until a TCP query answers and the image's init has finished; runs the TypeORM migrations; starts the built backend, web server and marketing site on free ports with the same test-only auth settings as the e2e suite (`AUTH_DEV_BYPASS=true`, `NODE_ENV=development`, `E2E_DEV_SESSION=true`, no `WORKOS_API_KEY`, no `RAILWAY_ENVIRONMENT`); waits for `GET /health/ready`, `GET /healthz` and the marketing root to return 200; then signs in through the real `/login` route and writes the persona through the web app's `/api` proxy.

Ready means the last line is `[verify-flump] ready: run <id>, web <url>, evidence <dir>` and stdout is the run id. That point is usable: migrated, seeded and signed in. A warm `up` takes about 10 seconds.

Prerequisites: `bun install` done at the repo root, Docker (Docker Desktop or OrbStack) running, and Chromium for Playwright (`cd apps/e2e && bunx playwright install chromium` if a journey says the browser is missing).

Teardown is `V down` (see Cleanup).

## Doctor

```bash
V doctor [run-id]
```

Read-only. Checks: the run's Postgres container is running; each recorded server PID is the process listening on its port (so you are not driving someone else's server); backend `/health/ready` and web `/healthz` return 200; a request with the dev session cookie reaches the dashboard without a redirect; the seeded browser session exists; and the build matches the checkout (same commit and same uncommitted changes under `apps/` and `packages/`). Exit code 0 only when every line says `ok`. A `FAIL build is stale` line means your change is not in the running build: `V down`, then `V up`. Run doctor first whenever anything looks off.

## Drive

A journey is a Bun script that drives Chromium through Playwright, using `scripts/lib.ts`. Run one with:

```bash
V drive accounts-add               # a shipped journey in journeys/
V drive /abs/path/to/my-journey.ts # your own journey file
VERIFY_HEADED=1 V drive dashboard  # watch it in a visible browser
```

Shipped journeys are in `journeys/`, one per feature in `features/README.md`; each feature file names the persona its journey expects. Most change the run's saved data, so run `V seed <persona> <run-id>` between them. For a feature with no shipped journey, write one in your scratchpad. Template:

```ts
import {
  expect,
  journey,
  open,
} from "/ABSOLUTE/REPO/PATH/.claude/skills/verify-flump/scripts/lib.ts";

await journey("budget-add-entry", async ({ page, step, api, save }) => {
  await step("open Budget and start editing", async () => {
    await open(page, "/app/budget"); // goto + wait for hydration
    await page.getByRole("button", { name: "Edit budget" }).click();
  });
  await step("the entry is saved", async () => {
    const entries = await api("/budget-entries"); // GET through the same-origin /api proxy
    save("budget-entries.json", entries);
    expect(JSON.stringify(entries)).toContain("Gym");
  });
});
```

Journey API (`scripts/lib.ts`): `journey(name, body, { signedIn })` launches Chromium at 1280x900 with the run's signed-in session (`signedIn: false` starts signed out) and `baseURL` set to the run's web URL, so `page.goto("/app/accounts")` works. `step(label, fn)` runs one user action and then saves a screenshot and ARIA snapshot. `api(path)` is a read-only `GET /api<path>` through the web app's proxy, sending the CSRF header the proxy needs. `save(file, data)` writes proof. `open(page, path)` goes to a path and waits for hydration; `hydrated(page)` waits for `html[data-hydrated]`. `expect` is Playwright's.

Handles, in order of preference: roles with accessible names (`getByRole("dialog", { name: "Add account" })`), `getByLabel`, then the stable data attributes the app already uses (`[data-figure="netWorth"]`, `[data-tone="hero"]`, `getByTestId("hero-figure")`, `#monthly-check-in-card`). The e2e specs in `apps/e2e/tests/` are the best source of current handles for a page. Never use coordinates or tab order.

Rules that cost a run when ignored:

- Wait for hydration (`open` or `hydrated`) before clicking script-driven controls: clicks before it are lost.
- `api()` only reaches paths on the proxy's allow-list (`API_ALLOW_LIST` in `apps/web/app/services/api-proxy.server.ts`). Tax records, the retirement plan and imports are not on it: prove those through a second page view instead.
- The run has one user. Journeys change its saved data. To get back to the persona's state, run `V seed <persona>`. That resets the user's financial data first, and the backend allows 10 resets an hour per user. If a seed fails with 429, `V down` and `V up` for a fresh database. Writes are rate limited too: after a few journeys and seeds in quick succession, seeding returns 429 on every write. To run many journeys, give each persona its own run (`V up --skip-build --persona <name>`) instead of reseeding one run again and again.
- Never call backend endpoints directly to set up state for a journey you are proving; drive the UI. `V seed` is the only setup shortcut, and only for the baseline.

## Evidence

Each run keeps its evidence in `~/.flump-verify/evidence/<run-id>/`, outside the checkout, so it survives `V down` and the worktree being deleted, and can never be committed (override the root with `VERIFY_EVIDENCE_ROOT`; keep it outside the repo):

- `logs/`: `build.log`, `migrations.log`, `backend.log`, `web.log`, `marketing.log`, `seed.log`.
- `journeys/<timestamp>-<name>/`: `NN-<step>.png` (full-page screenshot) and `NN-<step>.aria.yml` (ARIA snapshot) after each step; `FAILED-NN-<step>.*` for the step that failed; `journal.jsonl` (one line per step with URL, pass or fail, and the error); `problems.jsonl` (browser console errors and HTTP 5xx responses, if any); and whatever the journey `save()`d.

The journey prints `PASS <name>` or `FAIL <name>: <reason>` and the evidence folder, and exits 0 or 1.

Proof standards:

- Drive the real user path: the page, the button, the dialog. No internal setters, test-only endpoints or direct backend calls.
- Capture the action and the resulting state, one `step` per user action, not just the final screen.
- Verify the side effect as well as what is visible: reload and see it again, read it back with `api()`, or see it reach the page that depends on it (a new account changes the dashboard net worth).
- No mocks. The stack is real apart from sign-in, where the test-only dev session stands in for WorkOS exactly as in the e2e suite, and bank connections (TrueLayer, Monzo, Starling), which have no credentials locally and are not driven.
- Read `problems.jsonl`: a passing journey with a 5xx or console error in it is a finding to report.
- When you report a proof, give the journey name, the evidence folder, and the screenshots that show the change. The folder already outlives the worktree. Screenshots show only seeded test data; never commit them or paste them anywhere public unless that is still true.

## Cleanup

```bash
V down [run-id]   # defaults to the newest live run
V list            # live runs, if you lost track
```

`down` stops exactly the PIDs this run recorded (and their children) with TERM, then KILL after 2 seconds, removes this run's Postgres container, and deletes `.verify/state/<run-id>/`. It never kills by process name and never touches other containers. Evidence in `~/.flump-verify/evidence/<run-id>/` stays. Run `down` after every run, including a failed `up` (a half-started run is still recorded and `down` cleans it). Delete old evidence folders yourself when they are no longer needed.

## Helpers

All executable, run from the repo root:

- `scripts/verify-flump`: the launcher described above. `V` with no arguments prints usage.
- `scripts/lib.ts`: the journey harness, imported by journeys. Journeys run under `V drive`, which sets `NODE_PATH` to `apps/e2e/node_modules` so `@playwright/test` resolves, and sets `VERIFY_WEB_URL`, `VERIFY_BACKEND_URL`, `VERIFY_MARKETING_URL`, `VERIFY_STATE_DIR`, `VERIFY_EVIDENCE_DIR` and the `E2E_*_PORT` variables.
- `scripts/seed.ts`: signs in and writes a persona with `applyPersona` from `apps/e2e/support/personas.ts`. Called by `V up` and `V seed <persona>`. Personas: `homeowner` (default), `renter`, `debtpayer`, `selfemployed`, `retiree`, `everything`.
- `scripts/env.ts`: `requireEnv` and `optionalEnv`, the only way these scripts read `VERIFY_*` variables (lib re-exports `optionalEnv`). Use them rather than `process.env.X`, which Biome's turbo env rule flags.
- `tsconfig.json`: type checks every script and journey here against `apps/e2e`'s Playwright. `bun run check:laws` runs it, so CI fails on a type error in a journey. Run it alone with `bunx tsc -p .claude/skills/verify-flump/tsconfig.json`.

Several runs can live at once (one per agent, each with its own database and user). When more than one is live, pass the run id to every command (`V drive <journey> <run-id>`, `V seed <persona> <run-id>`, `V down <run-id>`), because the default is the newest run, which may be someone else's.

## Feature map

`features/README.md` indexes the user-facing features with a recipe for each. Read it before driving, and keep it current with `/pstack:maintain-verification-skill`.
