# E11 draft plan (planning workflow output)

Status: **draft, not reviewed, nothing implemented.** Produced by a read-only planner and fact-checked by a second agent; both can be wrong. Facts cite file:line in the code at the time of the run.

**Epic:** E11 - Test and CI gates (F-07, F-11, plus CI items N-03, N-04, N-13 (partly), N-14, N-15/N-16, F-05, F-08 (CI wiring only), F-15/N-10, and the E3 follow-up "migration integration tests never run in CI")

**Goal:** CI fails on formatting and lint errors without rewriting files. It runs the real-Postgres migration suite and cannot skip it silently. It enforces per-package coverage floors that only move upwards, gates on dependency advisories through an allow-list that expires, and prevents new violations of the AGENTS.md laws through baseline ratchets. Web route loaders and actions get tested and counted in coverage. A minimal end-to-end smoke test and the contract layer follow the owner's decisions below. Each new gate is first proven by a run that fails, then made green.

**Classification:** bounded

## Design

SPEC (decisions recorded; anything still open is in Decisions).

1. Lint is check-only (N-03). package.json scripts become `"lint": "biome ci ."`, `"lint:fix": "biome check --write ."`, with `"format"` unchanged. lint-staged keeps --write (local only). biome.json files.includes gains "!**/CHANGELOG.md" (release-please output). The preflight skill note (.claude/skills/preflight/SKILL.md:17) changes to say lint no longer modifies files. Warnings stay non-gating for now. Ratcheting to --error-on-warnings is a follow-up after the 126 warnings are cleared.

2. Script test harness. Root `"test:scripts": "bun test ./scripts"` (Bun's built-in runner, no config). Root `"test"` becomes `"turbo run test && bun test ./scripts"` so the four-gate preflight covers the scripts. Script logic lives in pure exported functions (`scripts/lib/*.ts`) with thin CLIs, following check-no-mock-auth.sh. The first tests cover the existing check-no-mock-auth.sh through SCAN_ROOTS fixtures.

3. Migration suite in CI (the E3 follow-up). New pure `resolveDbTestMode(env): "run" | "skip"` in apps/backend/src/testing/dbTestMode.ts. It returns "run" when TEST_DATABASE_URL is set and "skip" when it is unset. It THROWS when REQUIRE_DB_TESTS === "1" and TEST_DATABASE_URL is unset, so CI fails at collection instead of skipping. migrations.integration.spec.ts:28 switches to `describe.skipIf(resolveDbTestMode(process.env) === "skip")`.

turbo.json: add `"env": ["TEST_DATABASE_URL", "REQUIRE_DB_TESTS"]` to both `test` and `test:coverage`. `env` is used rather than `passThroughEnv` on purpose: env values are part of the task hash, so a cached local run without a database (suite skipped) can never be replayed from the remote cache as a CI pass. ALLOW_DESTRUCTIVE_DB_TESTS is deliberately NOT passed through, so the name guard always applies under turbo.

Exact vitest job (replaces ci-pipeline.yml:66-91):

  vitest:
    name: ⚡ Vitest Tests
    runs-on: ubuntu-latest
    timeout-minutes: 25
    permissions:
      actions: write        # turborepo-gh-artifacts cache server
      contents: read
      pull-requests: write  # coverage report comment
    services:
      postgres:
        image: postgres:18-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: flump_ci_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres -d flump_ci_test"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 12
    env:
      TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5432/flump_ci_test
      REQUIRE_DB_TESTS: "1"
    steps:
      - name: ⬇️ Checkout repo
        uses: actions/checkout@v7.0.1
      - name: ⚙️ Setup Bun and install dependencies
        uses: ./.github/actions/bun-setup
        with:
          turbo: true
          ghToken: ${{ secrets.GITHUB_TOKEN }}
          turboToken: ${{ env.TURBO_TOKEN }}
      - name: ⚡ Run vitest with coverage (includes real-Postgres migration tests)
        run: bun run test:coverage
      - name: "Report Coverage"
        if: always()
        uses: davelosert/vitest-coverage-report-action@v2.13.2
        with:
          working-directory: "apps/web"
          threshold-icons: '{"0": "🔴", "80": "🟢"}'

The job runs on the runner, not in a container, so localhost:5432 reaches the service. The password is a literal for a throwaway service container, not a secret. Only one spec file touches the DB, so no cross-file schema race occurs. The image tag matches docker-compose.yml:3. Pinning by digest is a hygiene follow-up.

4. Coverage gates (F-05, N-04). Every Node workspace gets `coverage: { provider: "v8", include: ["src/**/*.{ts,tsx}"], exclude: [tests, stories, index.ts barrels, *.d.ts, dist, styled-system], reporter: ["text", "json-summary", "lcov"], thresholds: {...} }`. packages/mcp gets a new vitest.config.ts with include src/**/*.test.ts and exclude dist. Web moves its numbers under coverage.thresholds and drops `all`, `enabled: true` and thresholdAutoUpdate. Plain `bun run test` then stays fast, and coverage plus thresholds apply in `test:coverage`, which CI runs.

Threshold rule (from F-tests.md:204): after adding `include`, measure once, then floor = floor(measured) - 1 per metric. Provisional numbers if re-measurement matched Phase 0 (stmts/branches/funcs/lines): finance-engine 74/63/84/76, banking 85/71/93/86, mcp 24/10/32/25, backend 88/71/79/88, ui 84/59/73/85, marketing 87/80/62/87, web 82/69/71/83. These WILL drop once `include` adds files nothing imports (tax-calculator.ts, mcp.service.ts), so the implementer must use the measured values, not these. Targets from F-tests.md:206-214 are recorded as ratchet goals, not gates. Gitignore coverage/ at the root and untrack the 158 files (F-15, N-10).

5. Audit gate (N-14). `scripts/check-audit.ts` runs `bun audit --json`. It fails closed if the command errors or the output is unparseable. It fails when an advisory at or above the threshold is not in `audit-allowlist.json`, and when an allow-list entry has passed its `expires` date. Entries no longer reported produce a warning. Each allow-list entry carries `{ id, package, severity, reason, expires (ISO date, max 90 days) }`. The threshold and scope are Decision 1. Before the gate, replace vitest-github-actions-reporter with Vitest's built-in "github-actions" reporter, which removes the undici and @fastify/busboy highs. New job:

  audit:
    name: 🛡️ Dependency audit
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: ./.github/actions/bun-setup
      - run: bun run check:audit

6. Law ratchets (N-15, N-16), pending Decision 2. Three scripts: check-colocation, check-design-tokens and check-tabular-nums, based on the drafts in N-infra.md:467-600. Each compares against a committed baseline and fails on new offenders AND on stale baseline entries, so the baseline can only shrink. A `--write-baseline` flag regenerates it. They run as `bun run check:laws` in the lint job, next to check:auth.

7. Route loader/action tests (F-07). Call the exports directly with `new Request(...)`, vi.mock("@workos-inc/authkit-react-router") (the pattern from apps/web/app/utils/auth.server.test.ts:11-15), and a stubbed global fetch that records URL, method and headers. Assert redirects, Set-Cookie, the Authorization header and request bodies. Then remove "app/routes/*.*" from the web coverage exclude and re-baseline the web floor. Error-path behaviour (silent fallbacks) is E5's: tests pin today's behaviour with a comment and do not change it.

8. Storybook (F-08), pending Decision 3. Recommended: E11 wires the @storybook/addon-vitest project in apps/web (browser provider with Playwright Chromium) and adds a report-only `storybook` job (continue-on-error: true). E8 fixes violations and flips parameters.a11y.test to "error" and the job to blocking.

9. E2E and contract (F-11), pending Decisions 4 and 5.

Edits to ci-pipeline.yml beyond the vitest job: the lint job gets `bun run test:scripts` and (after Decision 2) `bun run check:laws`. Every job gets timeout-minutes and least-privilege `permissions` (lint, check-types, build: contents: read plus actions: write only where the turbo cache action needs it). Concurrency becomes `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`. SHA-pinning of actions is noted as a follow-up and kept out of E11.

Laws touched: AGENTS.md section 5 (the lint gate's meaning changes; the four commands stay), section 4 (Storybook a11y and play enforcement wiring), sections 1 and 2 (enforcement scripts only, no component changes). No UI components are created, so the colocation, semantic token, KpiStrip and SimulatorSplitLayout laws are untouched by E11 code. Subagent law (section 6): implementers use sonnet.

## Decisions needed from the product owner

1. **D1: Dependency-audit gate policy: which severities block, for which dependencies, and how allow-listing works.**
   - (a) Block high and critical across all dependencies. Known transitive advisories go in audit-allowlist.json with a reason and a 90-day expiry. The job is required on PRs.
   - (b) Block high and critical only for production dependency paths (typeorm's minimatch and glob chain, the MCP SDK). Dev-only chains are reported but never block.
   - (c) Report-only (continue-on-error) for now, and revisit after Renovate clears the chains.
   - Recommendation: (a), run after the reporter swap task, so the allow-list is short (mostly the typeorm minimatch/glob chain and storybook/expo globs). It is simple, honest and self-expiring. A weekly scheduled run should be added so new advisories surface without blocking unrelated PRs mid-week. Whether the scheduled run opens an issue is an owner preference.
   - Blocks: T7

2. **D2: Who owns the AGENTS.md law-enforcement ratchets (colocation, design tokens, tabular-nums)? E9 H-08 step 1 and H-01 overlap.**
   - (a) E11 builds all three ratchet scripts and the CI wiring now. E9 only shrinks the baselines and turns on Panda strictTokens.
   - (b) E11 builds the token and tabular-nums ratchets only. Colocation stays in E9 H-08 step 1, because E9 may relax the 5-file rule for feature-internal components (EPICS.md:470).
   - (c) Defer all three to E9.
   - Recommendation: (b). Tokens and tabular-nums are stable laws and stop new violations immediately. The colocation ratchet's rule set depends on E9's pending 'relax the 5-file rule?' decision, so building it now risks rework.
   - Blocks: T14, T15, T16

3. **D3: Boundary with E8 for the Storybook play()/a11y gate (F-08 is in no epic).**
   - (a) E11 wires the Vitest Storybook project and a report-only CI job. E8 fixes violations, splits light and dark into separate tests, and flips a11y.test to 'error' and the job to required.
   - (b) E8 owns all of F-08, including the CI job.
   - (c) E11 wires it and makes it blocking immediately, with a per-story a11y 'todo' baseline.
   - Recommendation: (a). The CI and test-runner plumbing is E11's skill set, and the violation burn-down is E8's. Report-only avoids a red main while the violation count is still unknown (00-baseline.md:59).
   - Blocks: T17

4. **D4: End-to-end smoke test: now or later, and how to handle WorkOS.**
   - (a) Now. A Playwright smoke test runs against web, backend and the CI Postgres service with the E1 dev bypass (NODE_ENV=development, AUTH_DEV_BYPASS=true, no WORKOS_* keys). It covers onboarding to dashboard first insight but skips real sign-up. Non-required check on PRs touching apps/web, apps/backend or packages/**.
   - (b) Now, with a WorkOS staging environment. The owner provisions a staging WorkOS project, a test user, a CI redirect URI and GitHub secrets (WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, test credentials). This covers real sign-up but is slower and flakier (hosted UI, possible bot protection).
   - (c) Later, after E2 (mocks and demo data removed) and E5 (honest failure states). Today's silent fallbacks and demo data could make a smoke test pass on fabricated numbers.
   - Recommendation: (a) for onboarding to first insight now, as two small tasks, with assertions on figures derived from the values typed in. (b) is scheduled once the owner can provision WorkOS staging. If E2 lands first, (a) gets stronger; it does not need to wait. First verify that authkitLoader actually throws without WorkOS env, because the web bypass depends on it (auth.server.ts:63-72).
   - Blocks: T18, T19

5. **D5: Contract layer between web and backend (F-11).**
   - (a) Shared zod schemas in a real @flump/common package (packages/common today holds only a stale coverage directory), parsed by backend responses and the web client.
   - (b) Backend-generated OpenAPI (Nest swagger) and a generated, validated web client.
   - (c) Defer to E5 ('one API client'). The contract is the natural shape of that client.
   - Recommendation: (c). Designing the contract is architectural work and overlaps E5's single-client refactor. E11 only adds the CI slot once E5 chooses (a) or (b). Done-when item 'contract tests' then moves to E5, and the owner should confirm that move.

6. **D6: Coverage ratchet policy after the floors land.**
   - (a) Floors = measured - 1 now. Any PR that raises a package by 2 points or more also raises its floor. Quarterly review towards the F-tests.md targets.
   - (b) Floors = measured exactly (no slack), plus a diff-coverage gate of 80% on changed lines in finance-engine, backend/src/auth and mcp.
   - (c) Floors now, and decide on diff coverage after a month of data.
   - Recommendation: (a) now, (c) for diff coverage. A diff gate needs an extra action or tool and a PR-comment permission. The setup task can start under (a) regardless.

7. **D7: Branch protection and repository settings (owner-only, not code).**
   - (a) Make Lint, Type Check, Vitest Tests, Build and (after a week green) Dependency audit required checks. Require code-owner review on the baseline and allow-list files. Give release-please a PAT or GitHub App token so its PRs run CI.
   - (b) Keep the current required set and add new checks as informational only.
   - (c) Owner decides per check after each lands.
   - Recommendation: (a). Without required checks the new gates are advisory. Note that job display names (emoji included) are what required checks match, so renaming jobs later breaks protection. The release-please token change is needed before new required checks or release PRs stall (N-13).

## Tasks

### 1. T0: Script test harness plus tests for the existing check-no-mock-auth.sh (effort S)

- Files: `package.json (scripts: add test:scripts = 'bun test ./scripts'; test = 'turbo run test && bun test ./scripts')`, `scripts/check-no-mock-auth.test.ts (new)`, `scripts/__fixtures__/mock-auth/ (new fixture tree)`, `.github/workflows/ci-pipeline.yml (lint job: add 'bun run test:scripts' step after check:auth)`
- Interfaces: No new runtime interface. The test spawns `bash scripts/check-no-mock-auth.sh` with env SCAN_ROOTS pointed at fixture dirs (absolute paths, so allow-list comparisons do not match fixtures) and reads exit code and stderr.
- Tests:
  - 'exits 0 and prints OK when no literal is present': fixture with clean file -> exitCode 0, stdout contains 'OK:'
  - 'exits 1 and names file:line when mock-session-token appears in a non-allowed file': exitCode 1, stderr contains the fixture path and ':1:'
  - 'allows *.test.* and *.spec.* files': fixture file foo.test.ts containing dev_user_123 -> exitCode 0
  - 'exits 2 on scan error instead of reporting OK': SCAN_ROOTS=/nonexistent -> exitCode 2, stderr contains 'scan failed'

### 2. T1: Make lint check-only and stop CHANGELOG.md failing it (effort S)

- Files: `package.json:18 (lint -> 'biome ci .'; add 'lint:fix': 'biome check --write .'; format unchanged)`, `biome.json:10-19 (add '!**/CHANGELOG.md' to files.includes)`, `.claude/skills/preflight/SKILL.md:17 (lint no longer writes; use lint:fix to fix)`, `README.md (contributing/quality line that says lint runs Biome checks: mention lint:fix)`, `scripts/ci-config.test.ts (new)`
- Interfaces: Root scripts: lint (check-only), lint:fix, format.
- Depends on: T0
- Tests:
  - scripts/ci-config.test.ts 'root lint script never writes': JSON.parse(package.json).scripts.lint does not match /--write|--apply/ and equals 'biome ci .'
  - 'biome excludes release-please changelogs': biome.json files.includes contains '!**/CHANGELOG.md'
  - Manual failing-before proof: add a misformatted scratch .ts under scripts/, run `bun run lint` -> non-zero exit and the file is NOT modified (git diff empty); delete the scratch file; `bun run lint` -> 0 errors

### 3. T2: resolveDbTestMode so the migration suite cannot be skipped silently when required (effort S)

- Files: `apps/backend/src/testing/dbTestMode.ts (new)`, `apps/backend/src/testing/dbTestMode.spec.ts (new)`, `apps/backend/src/migrations/migrations.integration.spec.ts:15,28 (use resolveDbTestMode)`
- Interfaces: export function resolveDbTestMode(env: Record<string, string | undefined>): "run" | "skip". It throws Error('REQUIRE_DB_TESTS=1 but TEST_DATABASE_URL is not set; the real-Postgres migration tests would be skipped.') and never prints the URL.
- Tests:
  - 'skips when TEST_DATABASE_URL is unset and DB tests are not required': resolveDbTestMode({}) === 'skip'
  - 'runs when TEST_DATABASE_URL is set': resolveDbTestMode({TEST_DATABASE_URL:'postgres://u:p@localhost:5432/x_test'}) === 'run'
  - 'throws when REQUIRE_DB_TESTS=1 and TEST_DATABASE_URL is unset': toThrow(/REQUIRE_DB_TESTS/)
  - 'treats an empty TEST_DATABASE_URL as unset': {TEST_DATABASE_URL:''} -> 'skip'; with REQUIRE_DB_TESTS:'1' -> throws
  - 'error message never contains a URL or password': message does not contain 'postgres://' or 'p@'
  - Existing assertSafeTestDatabase.spec.ts and migration-files.spec.ts still pass; integration suite still skipped locally without the env

### 4. T3: Postgres 18 service in the CI vitest job and turbo env pass-through (effort S)

- Files: `.github/workflows/ci-pipeline.yml:66-91 (vitest job: services.postgres, job env TEST_DATABASE_URL and REQUIRE_DB_TESTS, timeout-minutes, job permissions; exact YAML in design)`, `turbo.json:20-27 (test and test:coverage: add "env": ["TEST_DATABASE_URL", "REQUIRE_DB_TESTS"])`, `apps/backend/src/migrations/migrations.integration.spec.ts:9-14 (header comment: CI runs this via the service container)`, `README.md (backend testing note: how CI runs the migration suite)`
- Interfaces: CI contract: in the vitest job TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/flump_ci_test and REQUIRE_DB_TESTS=1 reach apps/backend vitest through turbo.
- Depends on: T2
- Tests:
  - Local proof that turbo filters (no DB needed): with turbo.json unchanged, `REQUIRE_DB_TESTS=1 bunx turbo run test --filter=backend --force` passes (variable stripped, suite skipped); after adding env, the same command fails at collection with the T2 error. This proves pass-through without any DB.
  - Local proof with DB (developer runs a throwaway container on 55432 per the spec header): `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test REQUIRE_DB_TESTS=1 bunx turbo run test --filter=backend --force` reports 'migrations (real Postgres)' 10 passed, 0 skipped; then remove the container
  - CI proof on the PR: the vitest job log shows the migrations suite executed (not skipped). Record the line in the PR description.

### 5. T4: Coverage include lists for every workspace and untracking committed coverage (effort S)

- Files: `apps/backend/vitest.config.ts (coverage block: provider v8, include src/**/*.ts, exclude specs, migrations index, *.d.ts, main.ts)`, `packages/finance-engine/vitest.config.ts`, `packages/banking/vitest.config.ts`, `packages/mcp/vitest.config.ts (new; include src/**/*.test.ts, exclude node_modules and dist, coverage block)`, `apps/marketing/vitest.config.ts (coverage include src/**/*.{ts,tsx}, exclude stories, tests, entry files)`, `.gitignore (add coverage/)`, `git rm -r --cached apps/*/coverage packages/*/coverage (158 files)`
- Interfaces: Each config: coverage { provider: 'v8', include, exclude, reporter: ['text','json-summary','lcov'] }. No thresholds yet.
- Tests:
  - `bun run test:coverage` passes and every workspace emits coverage/coverage-summary.json
  - Record the measured stmts/branches/funcs/lines per package in the PR description (input to T5)
  - `git ls-files | grep -c /coverage/` == 0 after the change, and running test:coverage leaves `git status` clean
  - mcp test count unchanged before and after the new config (no dist tests picked up, no tests dropped)

### 6. T5: Live coverage thresholds per package; web keys fixed; CI runs test:coverage (effort S)

- Files: `apps/web/vite.config.mts:70-92 (move numbers under coverage.thresholds; remove all, enabled:true, thresholdAutoUpdate; keep reporters needed by the report action)`, `apps/backend/vitest.config.ts, packages/finance-engine/vitest.config.ts, packages/banking/vitest.config.ts, packages/mcp/vitest.config.ts, packages/ui/vitest.config.ts:11-21, apps/marketing/vitest.config.ts (coverage.thresholds = floor(measured from T4) - 1 per metric)`, `.github/workflows/ci-pipeline.yml vitest step (run: bun run test:coverage, already in the T3 YAML)`, `docs/testing-coverage.md or README section (floors, targets from F-tests.md:206-214, ratchet rule)`
- Interfaces: coverage.thresholds: { statements, branches, functions, lines } per workspace.
- Depends on: T4, T3
- Tests:
  - Failing-before proof: move the web 80s under coverage.thresholds unchanged -> `bun run --cwd apps/web test:coverage` FAILS on functions/branches (Phase 0: 72.28/70.57). This proves the key is live. Then set measured floors -> passes
  - Per package: temporarily raise one threshold to 100 and confirm `test:coverage` fails, then revert (proof each package enforces)
  - `bun run test` (no coverage) still passes and no longer writes apps/web/coverage

### 7. T6: Replace vitest-github-actions-reporter with Vitest's built-in reporter (effort S)

- Files: `apps/web/vite.config.mts:11,101 (drop import; use 'github-actions' reporter when GITHUB_ACTIONS is set)`, `apps/web/package.json:73 (remove devDependency)`, `bun.lock (regenerated by the implementer's bun install)`
- Interfaces: none
- Tests:
  - `bun run --cwd apps/web test` passes locally
  - `bun audit` no longer lists undici or @fastify/busboy via vitest-github-actions-reporter (paste before and after counts in the PR)
  - CI annotations still appear for a failing test (check once on the PR or trust Vitest docs; state which)

### 8. T7: Dependency audit gate with expiring allow-list (effort M, needs decision)

- Files: `scripts/lib/audit.ts (new, pure evaluation)`, `scripts/check-audit.ts (new CLI: runs `bun audit --json`, fails closed on spawn error or parse error)`, `scripts/check-audit.test.ts (new, fixtures)`, `scripts/__fixtures__/audit/*.json (captured `bun audit --json` sample plus synthetic cases)`, `audit-allowlist.json (new; entries for remaining known advisories after T6)`, `package.json (check:audit script)`, `.github/workflows/ci-pipeline.yml (audit job, exact YAML in design)`, `renovate.json (osvVulnerabilityAlerts: true)`
- Interfaces: export type AllowEntry = { id: string; package: string; severity: 'low'|'moderate'|'high'|'critical'; reason: string; expires: string }; export function evaluateAudit(report: unknown, allow: AllowEntry[], opts: { threshold: Severity; today: string }): { failures: string[]; warnings: string[] }
- Depends on: T0, T6
- Tests:
  - 'fails on an unallow-listed high advisory': failures.length 1 naming package and id
  - 'passes when the high advisory is allow-listed and unexpired'
  - 'fails when an allow-list entry is past expires' (today injected, no Date.now)
  - 'warns on an allow-list entry no longer reported' (stale entry)
  - 'ignores advisories below threshold'
  - 'throws on an unrecognised report shape' (fail closed)
  - CLI: a non-zero bun audit exit with valid JSON is evaluated, not treated as a pass or a crash; missing JSON -> exit 2

### 9. T8: Tests for auth.callback and callback loaders (effort S)

- Files: `apps/web/app/routes/auth.callback.test.ts (new)`, `apps/web/app/routes/callback.test.ts (new, or one shared table-driven test importing both loaders)`
- Interfaces: Mocks @workos-inc/authkit-react-router { authLoader: () => workosLoaderMock, configure: configureMock }; the loaders are called with { request: new Request(url), params: {}, context: {} }.
- Tests:
  - 'redirects to /login when code is missing': response.status 302 and Location '/login'; workosLoaderMock not called
  - 'appends flump_has_session cookie without Domain on localhost': Set-Cookie contains 'flump_has_session=1' and 'Max-Age=2592000', not 'Domain='
  - 'sets a host-only cookie on the web app'
  - 'pins current behaviour for a lookalike host' (documents the endsWith gap; flag to E1/D owner rather than fix silently)
  - 'calls configure with a localhost redirect URI only on localhost': configureMock called once on localhost, not on the web app
  - 'preserves upstream status and existing Set-Cookie headers'

### 10. T9: Tests for the logout loader and action (effort S)

- Files: `apps/web/app/routes/logout._index.test.ts (new)`
- Interfaces: Mock signOut(request, { returnTo }) returning a Response.
- Tests:
  - 'signs out with returnTo VITE_MARKETING_URL when set'
  - 'falls back to http://localhost:3001 on localhost and the deployed marketing site elsewhere'
  - 'clears flump_has_session with Max-Age=0' on both loader and action
  - 'keeps WorkOS Set-Cookie headers' (both cookies present)

### 11. T10: Assert the Authorization header in backend-client and the accounts action (effort S)

- Files: `apps/web/app/services/backend-client.server.test.ts (add cases)`, `apps/web/app/routes/app.accounts._index.test.ts (new; action only)`
- Interfaces: A fetch stub recording [url, init]; getAuthSession mocked via vi.mock('~/utils/auth.server', importActual plus override of getAuthSession).
- Tests:
  - backend-client: 'sends Authorization: Bearer <token> on every workspace request': every recorded init.headers.Authorization === 'Bearer tok_1'
  - backend-client: 'returns the empty snapshot and makes no fetch when there is no user'
  - accounts action: 'intent=create POSTs /accounts with Authorization and parsed numeric balance'
  - accounts action: 'omits balance when blank or non-numeric'
  - accounts action: 'intent=update PATCHes /accounts/:id'
  - accounts action: 'throws redirect to /login when no access token' (authHeader path), and fetch not called

### 12. T11: Tests for the app.tax and app.savings actions (effort S)

- Files: `apps/web/app/routes/app.tax.test.ts (new)`, `apps/web/app/routes/app.savings.test.ts (new)`
- Interfaces: Same fetch stub and auth mock as T10 (extract to apps/web/test/routeTestUtils.ts if reused 3 or more times).
- Depends on: T10
- Tests:
  - For each intent the action handles: the correct method, path and JSON body, plus the Authorization header
  - 'no access token -> redirect /login, no fetch'
  - 'backend non-OK -> current documented behaviour' (pin; E5 owns the change)

### 13. T12: Tests for the app.pension, app.accounts.$account and app.onboarding actions (effort S)

- Files: `apps/web/app/routes/app.pension.test.ts (new)`, `apps/web/app/routes/app.accounts.$account.test.ts (new)`, `apps/web/app/routes/app.onboarding.test.tsx (add action cases next to the component cases)`
- Interfaces: As T11.
- Depends on: T10
- Tests:
  - Per intent: method, path, body and Authorization asserted
  - Unauthenticated -> redirect /login
  - onboarding action: persists the profile through the backend with the user's token (assert URL and body)

### 14. T13: Count routes in web coverage and re-baseline the web floor (effort S)

- Files: `apps/web/vite.config.mts:79 (remove 'app/routes/*.*' from exclude; keep 'app/*.*' for entry files or narrow it to entry.* and root.tsx)`, `apps/web/vite.config.mts thresholds (re-measure, floor - 1)`
- Interfaces: none
- Depends on: T5, T8, T9, T10, T11, T12
- Tests:
  - `bun run --cwd apps/web test:coverage` passes with routes included; the PR records the before and after web numbers
  - Per-file check: auth.callback.tsx, callback.tsx and logout._index.tsx show at least 90% lines in the report (F-tests.md:213 target); if not, add cases in T8 or T9

### 15. T14: Design-token ratchet (AGENTS.md section 2) (effort S, needs decision)

- Files: `scripts/lib/design-tokens.ts (new; adapt N-infra.md:520-558)`, `scripts/check-design-tokens.ts (new CLI with --write-baseline)`, `scripts/design-token-baseline.json (generated)`, `scripts/check-design-tokens.test.ts`, `package.json (check:laws)`, `.github/workflows/ci-pipeline.yml lint job (bun run check:laws)`
- Interfaces: export function countTokenViolations(source: string): number; export function compareToBaseline(counts: Record<string, number>, baseline: Record<string, number>): { failures: string[]; stale: string[] }
- Depends on: T0
- Tests:
  - 'counts quoted hex, rgb(a) and hsl(a) and primitive scale tokens like "indigo.600"'
  - 'ignores semantic tokens such as "status.danger.text" and "chart.series1"'
  - 'fails when a file exceeds its baseline count' and 'fails for a new file with any violation'
  - 'reports stale when a file drops below baseline' (forces the baseline to shrink)
  - 'skips tests, stories, tokens, styled-system and *.d.ts'

### 16. T15: tabular-nums ratchet (AGENTS.md section 2) (effort S, needs decision)

- Files: `scripts/lib/tabular-nums.ts`, `scripts/check-tabular-nums.ts`, `scripts/tabular-baseline.txt`, `scripts/check-tabular-nums.test.ts`, `package.json (extend check:laws)`
- Interfaces: export function needsTabular(source: string): boolean (formats numbers via formatCurrency, useFormatCurrency, Intl.NumberFormat, toLocaleString or toFixed and lacks tabular-nums/tabularNums)
- Depends on: T14
- Tests:
  - 'flags a component using useFormatCurrency without tabular-nums'
  - 'passes when fontVariantNumeric tabular-nums or a tabularNums token is present'
  - 'flags toLocaleString() with no locale' (sweep found about 10)
  - Baseline new and stale semantics as in T14

### 17. T16: Colocation ratchet (AGENTS.md section 1), only if D2 assigns it to E11 (effort S, needs decision)

- Files: `scripts/lib/colocation.ts`, `scripts/check-colocation.ts`, `scripts/colocation-baseline.txt`, `scripts/check-colocation.test.ts`
- Interfaces: export function colocationViolations(file: string, exists: (p: string) => boolean): string[]
- Depends on: T14
- Tests:
  - 'flat Foo.tsx outside Foo/ is a violation'
  - 'Foo/Foo.tsx missing Foo.styles.ts, Foo.stories.tsx, Foo.test.tsx or index.ts reports each missing sibling'
  - 'tests, stories and index.tsx are skipped'
  - Baseline new and stale semantics

### 18. T17: Vitest Storybook project and report-only CI job (effort M, needs decision)

- Files: `apps/web/vite.config.mts (test.projects: the existing unit project plus a storybook project via storybookTest from @storybook/addon-vitest, browser provider Playwright Chromium)`, `apps/web/package.json (test:storybook-vitest script; add @vitest/browser-playwright and playwright devDependencies)`, `apps/web/.storybook/preview.tsx:47-55 (leave a11y.test at 'todo'; E8 flips it)`, `.github/workflows/ci-pipeline.yml (storybook job: install chromium, run the script, continue-on-error: true)`
- Interfaces: Script: bun run --cwd apps/web test:storybook-vitest
- Tests:
  - Locally, the storybook project runs all 66 story files and executes the existing play() functions; the PR records the pass/fail and a11y counts
  - A deliberately failing play() assertion in a scratch story fails the project (then remove it)
  - `bun run test` (unit project) is unaffected in duration and count

### 19. T18: E2E harness: Playwright workspace that boots backend, web and Postgres with the dev bypass (effort M, needs decision)

- Files: `apps/e2e/package.json (new workspace: @playwright/test; test:e2e script)`, `apps/e2e/playwright.config.ts (webServer entries for backend and web with NODE_ENV=development, AUTH_DEV_BYPASS=true, DATABASE_URL to the test DB, DB_SYNCHRONIZE unset, migrations run)`, `apps/e2e/tests/smoke.spec.ts (health: web /ping returns 200 and the backend responds)`, `.github/workflows/ci-pipeline.yml (e2e job with the same Postgres service, paths filter, non-required)`, `turbo.json (test:e2e task, cache false)`
- Interfaces: Script: bun run --cwd apps/e2e test:e2e
- Depends on: T3
- Tests:
  - Spike first (half a day max): confirm authkitLoader throws without WORKOS_* env so the web bypass engages (auth.server.ts:63-72); if not, stop and report back (D4 revisit)
  - 'app boots and /app renders for the dev user' passes locally and in CI
  - Backend refuses to boot under the e2e env if AUTH_DEV_BYPASS is combined with WORKOS_API_KEY (sanity check of the E1 guard)

### 20. T19: E2E journey: onboarding to first insight (effort S, needs decision)

- Files: `apps/e2e/tests/onboarding-first-insight.spec.ts (new)`
- Interfaces: none
- Depends on: T18
- Tests:
  - 'completes the 3-step onboarding with income 50,000 and lands on the dashboard'
  - 'dashboard shows a figure derived from the entered inputs' (an exact en-GB formatted value computed by finance-engine for the given input, asserted as text; not just 'a number is visible')
  - 'no demo-data marker is shown to the signed-in dev user'

### 21. T20: CI hygiene on the jobs E11 touches (effort S)

- Files: `.github/workflows/ci-pipeline.yml (per-job permissions and timeout-minutes on lint, check-types and build; concurrency cancel-in-progress only for pull_request; drop unneeded fetch-depth: 0 at :53-54 and :73-74)`
- Interfaces: none
- Depends on: T3
- Tests:
  - actionlint (bunx or a docker image, run by the implementer) reports no errors on ci-pipeline.yml
  - The PR's CI run shows all jobs green with the new permissions (turbo cache still works in jobs that keep actions: write)

## Can start without any decision

- T0
- T1
- T2
- T3
- T4
- T5
- T6
- T8
- T9
- T10
- T11
- T12
- T13
- T20

## Review focus

- Turbo remote-cache replay: with TEST_DATABASE_URL in `env` (hashed), a cached CI result is only replayed for identical inputs. Confirm nobody switches it to passThroughEnv, which would let a skipped local run replay as a CI pass.
- REQUIRE_DB_TESTS must be evaluated at collection time (describe.skipIf argument), so a missing URL fails the file instead of reporting 0 tests. Check that vitest reports a collection error as a failed run with a non-zero exit through turbo.
- The CI database name must satisfy assertSafeTestDatabase without ALLOW_DESTRUCTIVE_DB_TESTS. Nobody should add that variable to the workflow or turbo env 'to make it work'.
- The service container health check must pass before steps run. A slow Postgres start shows up as ECONNREFUSED in the first spec, not as a skip.
- `biome ci .` locally also checks untracked files (vcs.useIgnoreFile ignores only gitignored paths), so the untracked docs/audit/*.md may fail a developer's local lint. Decide whether to format or ignore them before committing the audit docs.
- The CHANGELOG.md exclusion also hides hand-edited changelogs from formatting. That is acceptable but should be stated.
- Thresholds apply only under test:coverage. A PR can be green on local `bun run test` and red in CI. Make sure the preflight skill or README says so.
- Adding coverage.include lowers the numbers, so thresholds must be set from the post-include measurement, or CI goes red on day one.
- mcp gets its first vitest.config.ts. Confirm it does not drop the existing tests (token-verifier.test.ts, mcp.test.ts) and does not pick up dist output.
- web: removing `enabled: true` must keep the json-summary reporter and output path the coverage report action reads (vite.config.mts:88).
- GITHUB_ACTIONS under turbo strict env mode: vite.config.mts:101 reads it inside a turbo task. Verify the variable reaches the process, or the reporter swap in T6 silently loses annotations.
- Audit script: bun audit exits non-zero when it finds advisories. The script must parse the JSON anyway, and must fail (exit 2) on network or registry errors, never pass. Expiry dates use an injected 'today' in tests and UTC in the CLI.
- Ratchet baselines: stale entries must fail, so a fixed file cannot regress unnoticed. A PR that grows a baseline file must be visible in review (D7 code-owner rule).
- Route tests: auth.server.ts runs isDevBypass(process.env) at import. Tests must not set AUTH_DEV_BYPASS with NODE_ENV=production in module scope. The callback's configure() mutates WorkOS global state, so reset mocks between localhost and non-localhost cases.
- Route tests pin today's silent fallbacks (backend-client.server.ts:76-79) rather than fixing them. Each pinned case should carry a comment pointing to E5 so the next epic flips it deliberately.
- E2E: the first-insight assertion must be a value computed from the typed inputs. A test that only checks that 'a currency figure is visible' passes on demo or mock data (E2 not yet done).
- Script test harness: `bun test ./scripts` uses bun:test, not vitest. Do not import vitest there, and do not let turbo's vitest runs glob scripts/.
- Job display names are what branch protection matches. Keep the existing names (e.g. '⚡ Vitest Tests') unchanged, or tell the owner before renaming.

## Risks

- main may still be red from the packages/mcp zod 4 bump recorded in the E3 ledger. New gates cannot be proven green until main is green. Check the latest main run first (owner or a session with GitHub access).
- The real coverage numbers after `include` are unknown (no runtime pass allowed here). Provisional floors in the design are placeholders and must be replaced by measured values.
- New required checks plus release-please PRs opened with GITHUB_TOKEN (no CI trigger) can block releases until the owner configures a PAT or GitHub App token. This is owner-only.
- bun audit depends on the npm registry. Transient outages would fail PRs if the audit job is required. Mitigations are a retry, or making only the scheduled run blocking (owner choice in D1).
- Exact `bun audit --json` output shape and flags for Bun 1.4.4 are unverified here. T7 must capture a real fixture first.
- The E2E dev-bypass path depends on authkitLoader throwing without WorkOS env. If it does not, D4 option (a) needs a different stub and the plan returns to the owner.
- The Storybook browser project adds Playwright browser installs (CI minutes, cache size). It is report-only until E8 is ready.
- CI time grows: a Postgres service, test:coverage instead of test, an audit job, a Storybook job and an E2E job. Paths filters on E2E and Storybook keep PR latency reasonable.
- Lockfile churn: T6, T17 and T18 add or remove dependencies. Earlier sessions avoided `bun install` because of a stale bun.lock. Implementers should run it on a green main only and commit the lockfile in the same task.
- Owner-only items: branch protection required checks, code-owner review enforcement, the release-please token, WorkOS staging secrets for any real sign-up E2E, and TURBO_TOKEN/TURBO_TEAM (already present at ci-pipeline.yml:11-13). The Postgres service needs no secret.

## Rollout

Suggested PR sequence, each running the four AGENTS.md section 5 gates locally and a green CI run before merge:

1. PR A (T0, T1): script harness plus check-only lint. After merge, the owner keeps the 'Lint' required check; its meaning is now honest.
2. PR B (T2, T3, T20): migration suite in CI. The PR description quotes the CI log line showing the migrations suite ran. Before merge, the owner confirms 'Vitest Tests' stays required.
3. PR C (T4, T5): coverage include and thresholds. The PR description lists the measured numbers and chosen floors.
4. PR D (T6, T7): reporter swap plus audit gate, informational for one week, then the owner marks 'Dependency audit' required (D1, D7).
5. PRs E and F (T8 to T13): route tests in two or three small PRs, then the coverage exclusion removal.
6. After D2: T14 to T16 law ratchets in the lint job. The owner adds a code-owner rule for scripts/*baseline* and audit-allowlist.json.
7. After D3: T17 report-only Storybook job; E8 later flips it to blocking.
8. After D4: T18 and T19 E2E as a non-required, paths-filtered job. Promote it to required after two weeks without flakes.

Owner checklist (cannot be done in code): required status checks per D7; a release-please PAT or App token before adding required checks; WorkOS staging credentials if D4 (b) is chosen; confirm current main CI health. Contract tests (F-11 second half) move to E5 if D5 (c) is accepted, so EPICS.md E11 'Done when' should be amended to match.

## Facts (as cited by the planner)

- Root lint is `biome check --write .`, the same command as `format`, so the CI lint step rewrites files and cannot fail on fixable format errors. (`package.json:18-19; .github/workflows/ci-pipeline.yml:40-41`)
- The mock-auth guard script is wired as `check:auth` and runs in the CI lint job. It supports a SCAN_ROOTS override 'to exercise the scan-error path in tests', but no test of the script exists (the only references are package.json and the E1/E3 plans). (`package.json:24; .github/workflows/ci-pipeline.yml:43-44; scripts/check-no-mock-auth.sh:19-20`)
- The E3 baseline for lint is 3 format errors (three app CHANGELOG.md files written by release-please) and about 126 warnings. biome.json does not exclude CHANGELOG.md. (`docs/audit/plans/E3-config-db-plan.md:22,198; docs/audit/plans/E3-config-db-ledger.md:49; biome.json:10-19`)
- The preflight skill documents that `bun run lint` modifies files. (`.claude/skills/preflight/SKILL.md:17`)
- The migration integration suite drops the public schema. It is skipped when TEST_DATABASE_URL is unset (describe.skipIf at collection time) and calls assertSafeTestDatabase before connecting. (`apps/backend/src/migrations/migrations.integration.spec.ts:9-15,28,33,56-60`)
- The guard accepts only localhost, 127.0.0.1, ::1 or [::1], plus a database name matching /test/i, unless ALLOW_DESTRUCTIVE_DB_TESTS=1. A GitHub service container mapped to localhost:5432 with database flump_ci_test satisfies it without the override. (`apps/backend/src/testing/assertSafeTestDatabase.ts:1,19-28`)
- The E3 final review recorded 'CI has no Postgres service so migration integration tests never run in CI (STRONGLY recommended)' and 'turbo strips TEST_DATABASE_URL at repo root' as follow-ups. (`docs/audit/plans/E3-config-db-ledger.md:58`)
- turbo.json declares no env, globalEnv or passThroughEnv on any task. Under Turbo 2's default strict env mode, undeclared variables such as TEST_DATABASE_URL are filtered out of task processes. The test and test:coverage tasks exist with coverage outputs. (`turbo.json:20-27; package.json:36 (turbo 2.11.10)`)
- The CI vitest job runs `bun run test` with no services, and the coverage report action reads only apps/web. (`.github/workflows/ci-pipeline.yml:66-91`)
- The local compose Postgres image is postgres:18-alpine. E3 ran the migration suite against a throwaway postgres:18-alpine container. (`docker-compose.yml:3; apps/backend/src/migrations/migrations.integration.spec.ts:10-11`)
- The web coverage block puts thresholds as flat keys (branches/functions/lines/statements 80), which Vitest 5 ignores. It also has `all: true` and `enabled: true` unconditionally, and excludes `app/routes/*.*` and `app/*.*`. (`apps/web/vite.config.mts:70-92`)
- Backend, banking, finance-engine and marketing vitest configs set no coverage block. packages/mcp has no vitest.config.ts at all (the audit said 'empty file'; it is now absent). Only packages/ui sets coverage.include. (`apps/backend/vitest.config.ts:1-10; packages/banking/vitest.config.ts:1-8; packages/finance-engine/vitest.config.ts:1-8; apps/marketing/vitest.config.ts:1-10; packages/ui/vitest.config.ts:11-21`)
- Every workspace with tests already has a `test:coverage` script (`vitest run --coverage`). mobile-companion has no test script. (`apps/backend/package.json:14; packages/banking/package.json:33; packages/finance-engine/package.json:20; packages/mcp/package.json:33; packages/ui/package.json:29; apps/web/package.json:83; apps/marketing/package.json:15; apps/mobile-companion/package.json:11-13`)
- Phase 0 coverage (stmts/branch/funcs/lines): banking 86.84/72.15/94.23/87.85; finance-engine 75.75/64.80/85.78/77.66; mcp 25.65/11.88/33.92/26.08; backend 89.32/72.80/80.41/89.97; ui 85.74/60.07/74.54/86.09; marketing 88.34/81.87/63.01/88.85; web 83.28/70.57/72.28/84.92. Backend and mcp have changed a lot since (E1/E3 took backend to 172 tests), so these are stale upper bounds. (`docs/audit/00-baseline.md:43-51; docs/audit/plans/E3-config-db-ledger.md:59`)
- There are 158 tracked files under coverage/. The root .gitignore has no coverage entry; only apps/web ignores its own. packages/common contains only a coverage directory. (`.gitignore:29 (dist/ only); apps/web/.gitignore:9; `git ls-files | grep -c /coverage/` = 158; packages/common/ (only coverage)`)
- bun audit found 21 advisories (7 high), all transitive. Most highs are undici and @fastify/busboy via vitest-github-actions-reporter, a web devDependency used only as a reporter. Vitest has a built-in github-actions reporter. (`docs/audit/00-baseline.md:74-79; apps/web/package.json:73; apps/web/vite.config.mts:11,101`)
- The zod <4.6.6 advisory is partly stale: @flump/mcp now pins zod 4.6.6 (the @modelcontextprotocol/sdk transitive path still needs re-checking). (`packages/mcp/package.json:38`)
- No route test covers auth.callback, callback, logout, login, signUp or any mutating action. Route test files exist only for $feature._index, _index, app.onboarding, sandbox and tools. 30 loader/action exports were found under routes/. (`apps/web/app/routes/ (listing); auth.callback.tsx:9; callback.tsx:9; logout._index.tsx:29,33; app.accounts._index.tsx:13,138; app.tax.tsx:8,147; app.savings.tsx:14,116; app.pension.tsx:14,195; app.accounts.$account.tsx:7,55; app.onboarding.tsx:38,55`)
- The callback loader redirects to /login without `code`, calls the global WorkOS `configure()` for localhost hosts, and appends a flump_has_session cookie with a Domain attribute when hostname.endsWith(<old domain>). That check also matches a host such as a lookalike host, which a test should pin. Logout clears the same cookie. (`apps/web/app/routes/auth.callback.tsx:10-36; apps/web/app/routes/logout._index.tsx:4-27`)
- Actions build the Authorization header with authHeader(), which throws redirect('/login') when there is no access token (E1). backend-client tests do not assert the Authorization header, and fetchJson silently returns fallbacks on non-OK responses or exceptions (an E5 concern). (`apps/web/app/utils/auth.server.ts:24-33; apps/web/app/routes/app.accounts._index.tsx:14-15,32-40; apps/web/app/services/backend-client.server.ts:70-81; apps/web/app/services/backend-client.server.test.ts:65-107`)
- auth.server.ts runs isDevBypass(process.env) at import. The web dev bypass session is used only when authkitLoader throws and NODE_ENV=development with AUTH_DEV_BYPASS=true. The backend dev mode requires AUTH_DEV_BYPASS=true, NODE_ENV=development and no WORKOS_API_KEY. (`apps/web/app/utils/auth.server.ts:13-22,63-72; apps/backend/src/auth/auth.config.ts:6-21`)
- Storybook has @storybook/addon-vitest and addon-a11y registered, but no Vitest storybook project exists. The a11y config enables only color-contrast with no `test` mode. test:storybook is only `storybook build --test` and is not in CI. Stories from packages/ui and apps/marketing load through the web Storybook. (`apps/web/.storybook/main.ts:12-23; apps/web/.storybook/preview.tsx:47-55; apps/web/package.json:90`)
- F-08 (Storybook play/a11y never run) appears in no epic ticket. E8 lists only J-01 and J-06. The E11 boundary with E8 therefore needs a ruling. (`docs/audit/EPICS.md:423-443; docs/audit/F-tests.md:115-122`)
- E9 H-08 already lists '1 auto-discovering ratchet test' for colocation as its first step, and H-01 covers enabling strictTokens. This overlaps the N-16 law scripts. (`docs/audit/EPICS.md:455-471; docs/audit/N-infra.md:184-191`)
- The composite setup action gives the third-party felixmosh/turborepo-gh-artifacts the GITHUB_TOKEN. Workflow-level permissions grant actions: write and pull-requests: write to every job. No job has timeout-minutes, and there is no setup-node step. (`.github/actions/bun-setup/action.yml:18-27; .github/workflows/ci-pipeline.yml:19-22`)
- release-please uses the default token, so its PRs do not trigger CI. If new checks become required, release PRs cannot merge without owner action (a PAT or app token, or admin merge). (`.github/workflows/release-please.yml:20-23; docs/audit/N-infra.md:160`)
- CODEOWNERS has a single owner for everything, and renovate.json has no osvVulnerabilityAlerts. (`.github/CODEOWNERS:1; renovate.json:1-26`)
- The E3 ledger recorded origin/main CI as red because of the Renovate zod 3 to 4 bump in packages/mcp. Whether that is fixed now cannot be verified read-only (no GitHub access). New gates need a green main to land on. (`docs/audit/plans/E3-config-db-ledger.md:4; git log -- packages/mcp (4e143ee, 1195e94)`)

## Fact-check

28 claims checked; 8 not confirmed.

- **unclear**: E3 final review recorded CI-has-no-Postgres and turbo-strips-TEST_DATABASE_URL follow-ups. — docs/audit/plans/E3-config-db-ledger.md does not exist in this worktree, so the quoted text cannot be checked.
- **unclear**: Phase 0 coverage numbers and that they are stale. — docs/audit/00-baseline.md and the ledger were not available for reading in this worktree. The only docs/audit content here is plans/.
- **unclear**: bun audit 21 advisories (7 high), mostly undici/@fastify/busboy via vitest-github-actions-reporter; Vitest has a built-in github-actions reporter. — vitest-github-actions-reporter 0.11.1 is a web devDependency (apps/web/package.json:73) and is used at vite.config.mts:101, so the dependency claim holds. The advisory counts could not be checked (baseline doc unreadable and no audit run).
- **unclear**: Actions use authHeader() throwing redirect('/login'); backend-client tests don't assert Authorization; fetchJson silently returns fallbacks. — Not opened in this pass; auth.server.ts, backend-client.server.ts and its test were not read.
- **unclear**: auth.server.ts runs isDevBypass at import; web dev bypass only when authkitLoader throws and NODE_ENV=development with AUTH_DEV_BYPASS=true; backend dev mode needs AUTH_DEV_BYPASS=true, NODE_ENV=development and no WORKOS_API_KEY. — auth.server.ts and auth.config.ts were not opened in this pass.
- **unclear**: F-08 appears in no epic ticket; E8 lists only J-01 and J-06. — docs/audit/EPICS.md and F-tests.md are not in this worktree.
- **unclear**: E9 H-08 lists a colocation ratchet test; H-01 covers strictTokens; overlaps N-16. — Audit docs not available in this worktree.
- **unclear**: E3 ledger recorded origin/main CI red from the Renovate zod bump; cannot verify read-only. — Ledger missing from this worktree; no GitHub access.

Issues the checker says were missed:

- apps/web/app/routes/logout._index.tsx:29-35 - the loader and the action both call handleSignOut, so a plain GET to /logout signs the user out (logout CSRF via an image or link). The F-07 route tests should pin this, and the plan should say whether it is in scope or an E1 follow-up.
- apps/web/app/routes/auth.callback.tsx:15-22 - configure() is global process state, mutated per request based on request hostname. After one localhost callback, WORKOS_REDIRECT_URI stays overridden for all later requests in that process. Route tests need to reset or isolate it.
- docs/audit/plans/E3-config-db-plan.md:22,198 - the plan treats the three CHANGELOG.md format errors as the only baseline. Switching lint to `biome ci .` makes the 3 errors fatal immediately, so the biome.json exclusion for CHANGELOG.md (biome.json:10-19) must land in the same commit as the lint change or CI goes red.
- .github/actions/bun-setup/action.yml:18-27 - the turbo cache server step runs before setup-bun, and setup-bun, actions/cache and the turbo action are all tag-pinned. The planned least-privilege permissions change must keep actions:write on every job that sets turbo:true, or the cache action fails.
- .github/workflows/ci-pipeline.yml:66-84 - the planned vitest job uses `bun run test:coverage`, but the turbo `test` task also declares coverage/** outputs and root `test` is being changed to also run `bun test ./scripts`. The plan should say whether CI should still run the root `test` gate (or only test:coverage plus test:scripts), since AGENTS.md section 5 names `bun run test` as the CI check.
