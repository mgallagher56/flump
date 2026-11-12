# Track N: Infrastructure, CI, release and developer experience

Audited 2026-11-11 on branch `chore/subagent-model-rules`. Read-only: nothing here has been applied. Evidence is from reading files; no Docker build, no CI run and no Railway access.

## Summary

The CI pipeline does run the four AGENTS.md gates, but the gate that matters most for formatting is neutered (`lint` runs `biome check --write`), there is no coverage gate that actually works, no dependency or secret scanning, no Storybook test run and no Docker build. The release path (release-please to Railway, keyed on per-app `CHANGELOG.md` files) has a structural gap: changes to shared packages cannot trigger a deploy on their own. The backend boots with unsafe defaults (`synchronize: true`, a public hard-coded encryption key, default DB password) and there is no boot-time environment validation. The three Dockerfiles run as root, have no healthcheck, ship the whole 3.3 GB `node_modules`, and `.dockerignore` does not exclude `.env` files. Docs (README, `.env.example` files) are materially wrong about ports, packages and required variables.

Most of this is cheap to fix. The proposed automation section gives drop-in CI snippets and scripts to enforce the AGENTS.md laws so the audit does not need repeating.

Railway is in use (see N-08), so the `railway:use-railway` skill applies, but the Railway MCP server needs authorisation, so no live check of services, variables or deploy triggers was possible.

## Findings

### [N-01] TypeORM `synchronize: true` is unconditional, and DB TLS verification is off

- Severity: P1 (P0 if the production database holds real user data)
- Location: `apps/backend/src/app.module.ts:54`, `:55`, `:75`
- Evidence: both the `DATABASE_URL` branch and the host/port branch set `synchronize: true` with no `NODE_ENV` check. The `DATABASE_URL` branch sets `ssl: { rejectUnauthorized: false }` for any URL that does not contain `localhost` or `127.0.0.1`. There is no migrations directory and no `migrations` option (grep of `apps/backend/src` finds neither). `.agents/rules/project_rules.md:91` says "Never allow `synchronize: true` in production database environments".
- Impact: on every deploy TypeORM diffs entities against the live schema and applies it. A renamed or removed column or entity drops data silently. There is no rollback path and no reviewed migration. Disabled certificate verification lets a network attacker intercept DB traffic between Railway services and an external DB.
- Recommendation: `synchronize: process.env.NODE_ENV !== "production"` immediately; then introduce TypeORM migrations (`migrationsRun` on boot or a release command) and baseline the current schema. Use `ssl: { rejectUnauthorized: true }` with the provider CA, or rely on Railway's private network and set `DB_SSL` explicitly.
- Effort: S for the guard, M for migrations

### [N-02] No boot-time env validation, and insecure fallbacks when variables are missing

- Severity: P1
- Location: `apps/backend/src/app.module.ts:31`, `packages/banking/src/server/crypto.ts:7` and `:13`, `apps/backend/src/app.module.ts:63`, `apps/backend/src/auth/auth.guard.ts:47`, `apps/web/app/session.server.ts:5`
- Evidence:
  - `ConfigModule.forRoot({ isGlobal: true })` has no `validate` or `validationSchema`.
  - `DEFAULT_DEV_KEY = "flump_default_dev_banking_encryption_key_32_bytes!"` is committed, and `getDerivedKey` falls back to it when `BANKING_TOKEN_ENCRYPTION_KEY` is unset. Bank access tokens would be encrypted with a key anyone can read in the repo.
  - DB password defaults to `"postgres"` and DB name to `"postgres"` (`app.module.ts:63-64`).
  - `auth.guard.ts:47` branches on `!WORKOS_API_KEY` to authenticate as a dev user (already P0 in Track D; the infra angle is that nothing fails the boot when the key is missing).
  - Only the web app has a fail-fast check (`invariant(process.env.SESSION_SECRET, ...)`). The sweep counted `process.env` reads with no schema in `marketing/server.ts`, `plaid.ts`, `crypto.ts` and `mcp/transports/stdio.ts`.
- Impact: a mis-set production environment silently runs with a public encryption key, a default DB password and possibly no auth, instead of crashing on boot.
- Recommendation: one zod env schema per app (snippet 8 below) parsed at boot; in production, required secrets have no defaults and the process exits non-zero. Remove `DEFAULT_DEV_KEY` or allow it only when `NODE_ENV === "test"`.
- Effort: M

### [N-03] `bun run lint` uses `--write`, so CI can never fail on formatting, and warnings never fail

- Severity: P1
- Location: `package.json:12` (`"lint": "biome check --write ."`), `.github/workflows/ci-pipeline.yml` lint job, `.claude/skills/preflight/SKILL.md`
- Evidence: root `lint` and `format` are identical commands. In CI the runner rewrites files in its own checkout and exits 0 once fixable issues are fixed, so unformatted code merges. Phase 0 found 4 formatting errors (three app `CHANGELOG.md` files and `docs/audit/AUDIT_PLAN.md`) that `--write` would hide. 128 warnings exist and none gates. The per-package `lint` scripts (`biome check .`, no write) are never called by CI or by root `lint`.
- Impact: the first "zero Biome lint/format errors" gate in AGENTS.md section 5 does not mean what it says. Local agents also modify files as a side effect of "verification".
- Recommendation: `"lint": "biome ci ."`, keep `"format": "biome check --write ."`, add `"lint:fix"` if wanted. Add `!**/CHANGELOG.md` to `biome.json` `files.includes` (release-please output). Later ratchet to `--error-on-warnings` after burning down the 128 warnings. Update the preflight skill note.
- Effort: S

### [N-04] Coverage thresholds are dead config, and the packages that matter have none

- Severity: P2
- Location: `apps/web/vite.config.mts:70-90`, `.github/workflows/ci-pipeline.yml` (Report Coverage step), `packages/*/vitest.config.ts`, `apps/*/vitest.config.ts`
- Evidence: web declares `coverage: { branches: 80, functions: 80, lines: 80, statements: 80 }` as flat keys. In current Vitest these live under `coverage.thresholds`; the flat form is ignored. Proof by data: Phase 0 measured web at 70.57 % branches and 72.28 % functions and `bun run test` still passed. No other workspace declares thresholds: `@flump/mcp` is at 26 % lines, `finance-engine` at 77 % lines and 65 % branches. The coverage comment action only runs for `apps/web`. `mobile-companion` has no `test` script.
- Impact: the "test: set coverage target to 80 %" commit (`b51369c`) did not create a gate. Regressions in the money engine or MCP auth are invisible to CI.
- Recommendation: move to `thresholds` and set each workspace at its current floor (a ratchet), for example finance-engine 75/64, mcp 25/10, banking 85/70, backend 88/72, ui 85/60, marketing 88/80, web 83/70. Raise per quarter and raise finance-engine first. Snippet 6.
- Effort: S

### [N-05] Dockerfiles: root user, no healthcheck, full dev `node_modules` in the runtime image, floating base tag

- Severity: P2
- Location: `apps/web/Dockerfile:25-38`, `apps/backend/Dockerfile:25-38`, `apps/marketing/Dockerfile:25-38`
- Evidence:
  - They are multi-stage (good), but the `runner` stage has no `USER`, so the process runs as root.
  - No `HEALTHCHECK` in any of them. The backend exposes only `@Get()` on `AppController` (`apps/backend/src/app.controller.ts:8`), no `/health`. Marketing's `server.ts` has no health route.
  - The runner copies `/app/node_modules` (3.3 GB locally, including expo, storybook, vitest, react-native), the whole `packages/` tree with sources, and the whole app directory. No `bun install --production` stage and no pruning.
  - `FROM oven/bun:1-slim` floats across Bun 1.x minors, while CI and `packageManager` pin `1.4.4`.
  - Backend `CMD ["bun", "dist/main.js"]` but `package.json` `start` is `node dist/main`: two different runtimes for the same artefact, and production only ever exercises the Bun one.
  - The backend also opens a TCP proxy from port 3000 to 4000 (`apps/backend/src/main.ts:36-47`) inside the container, and EXPOSEs only 4000. This is a leftover compatibility hack.
- Impact: larger attack surface and slow image pulls and deploys, no orchestrator-level liveness signal, and bigger blast radius if the container is compromised.
- Recommendation: pin `oven/bun:1.4.4-slim` (or by digest), add a final stage with `USER bun` (the image ships a `bun` user), install production deps only (`bun install --production --frozen-lockfile` in a separate stage or `turbo prune`), add a `/health` route and `HEALTHCHECK` (snippet 9). Remove the port-3000 proxy once the frontend uses 4000.
- Effort: M

### [N-06] `.dockerignore` does not exclude `.env*`, coverage, docs or the mobile app

- Severity: P2
- Location: `.dockerignore` (9 lines: `node_modules .git .turbo dist build .next .cache *.log .DS_Store`)
- Evidence: `apps/backend/.env` and `apps/web/.env.local` exist in the working tree. They are gitignored, so Railway builds from git are clean, but a local `docker build` uses `COPY . .` in the build stage and the runner then does `COPY --from=build /app/apps/backend ./apps/backend`, so a local image bakes in the real `.env`. Coverage output, `storybook-static`, `docs` and `apps/mobile-companion` also enter the build context.
- Impact: secrets in locally built and pushed images, and a bigger, slower build context.
- Recommendation: add `**/.env`, `**/.env.*` with `!**/.env.example`, `**/coverage`, `**/storybook-static`, `docs`, `apps/mobile-companion/**` (but keep its `package.json` that the Dockerfiles copy), `.husky`, `.github`.
- Effort: S

### [N-07] Docker images are never built in CI

- Severity: P2
- Location: `.github/workflows/ci-pipeline.yml` (no docker job); git log shows `d9f8516 fix(web,marketing): fix dockerfiles`
- Evidence: the pipeline has four jobs (lint, check-types, vitest, build) and no `docker build`. Each Dockerfile hard-codes a list of workspace `package.json` files (for example `apps/web/Dockerfile:8-16`), so adding or removing a workspace breaks all three images silently. A Dockerfile fix has already landed once.
- Impact: a broken image is found on the Railway deploy after merging a release PR, not on the PR.
- Recommendation: add a matrix job that builds each image without pushing (snippet 4). Optionally replace the per-file `COPY` list with `COPY . .` guarded by `.dockerignore`, or use `turbo prune`.
- Effort: S

### [N-08] Release path: shared packages cannot trigger a release or deploy

- Severity: P1 (pending verification against Railway settings)
- Location: `release-please-config.json:19-52` (`packages` lists only `apps/web`, `apps/backend`, `apps/marketing`; `"plugins": []`), `.agents/rules/project_rules.md:277`
- Evidence: project rules state "Railway production services watch `apps/<service>/CHANGELOG.md` on `main` and deploy when a Release Please PR is merged". release-please attributes a commit to a component only if it touches that component's path. A fix confined to `packages/finance-engine`, `packages/banking`, `packages/ui` or `packages/mcp` touches none of the three paths, produces no release PR, and no `CHANGELOG.md` changes, so nothing deploys. There is no `node-workspace` plugin to bump dependents, and the root `CHANGELOG.md` and `package.json` version (`1.18.0`, last dated 2024-05-26) are frozen outside the manifest.
- Impact: a tax or mortgage calculation fix made in `finance-engine` can sit on `main` undeployed until someone happens to touch an app file. This is the highest-consequence process gap in the release flow, because it affects wrong-number fixes.
- Recommendation: verify Railway watch paths. Then either (a) add the `node-workspace` plugin so dependents of changed workspace packages are bumped, plus list the shared packages, or (b) widen the Railway watch patterns to include `packages/**` and deploy on merge rather than on changelog changes. Add a documented rollback step. Also add `extra-files` or drop the stale root version/CHANGELOG.
- Effort: M

### [N-09] Conventional commits are not enforced, though release-please depends on them

- Severity: P2
- Location: `.husky/pre-commit` (only tracked hook), `apps/web/commitlint.config.js`, root `package.json`
- Evidence: `git ls-files .husky` lists only `pre-commit`. `commitlint.config.js` exists only in `apps/web` and no `@commitlint/*` package appears in `package.json` or `bun.lock`. The husky shim `.husky/_/commit-msg` is generated and has no real hook behind it. Commits like `chore: ...` pass, but a non-conventional message simply yields no release entry.
- Impact: a mistyped prefix silently drops a change from the changelog and from version bumps.
- Recommendation: add `@commitlint/cli` and `@commitlint/config-conventional` at the root, move the config to the repo root, add `.husky/commit-msg` (`bunx commitlint --edit "$1"`), and run commitlint on PR titles in CI (snippet 5).
- Effort: S

### [N-10] Generated artefacts are tracked, and `packages/common` is only a stale coverage directory

- Severity: P2
- Location: 158 tracked `coverage/` files (`apps/backend` 38, `apps/marketing` 31, `packages/banking` 25, `packages/common` 15, `packages/finance-engine` 23, `packages/ui` 26); `apps/marketing/tsconfig.app.tsbuildinfo`, `apps/marketing/tsconfig.node.tsbuildinfo`; `.gitignore`
- Evidence: root `.gitignore` ignores `*.tsbuildinfo` but those two files were committed before the rule, so they stay tracked and `check-types` dirties them. `coverage` is not in the root `.gitignore`; only `apps/web/.gitignore:9` ignores it. `packages/common` contains only `coverage/` (no `package.json`, no `src`), but `README.md` still documents `@repo/common` as the domain package.
- Impact: noisy diffs and merge conflicts, a dirty tree after any coverage or type-check run, stale reports that mislead (old flat `packages/ui` calculator reports), and a ghost package.
- Recommendation: `git rm -r --cached` the coverage directories and the two tsbuildinfo files, add `coverage/` and `*.tsbuildinfo` (already) to root `.gitignore`, delete `packages/common`, and fix the README. Commands in quick wins.
- Effort: S

### [N-11] Env var docs and examples disagree with the code

- Severity: P2
- Location: `apps/web/.env.example`, `apps/backend/.env.example`, `apps/marketing/.env.example`, `docker-compose.yml`, `README.md` "Environment Variables"
- Evidence:
  - Web example sets `VITE_API_URL=http://localhost:3000`; backend `PORT=4000`; the web code fallback is `http://localhost:4000` in 13 `process.env.VITE_API_URL` reads and 7 `import.meta.env.VITE_API_URL` reads. README says backend is `:3000`. The backend works on 3000 only through the proxy hack (N-05).
  - Web fails at boot with `SESSION_SECRET must be set` (`session.server.ts:5`) but `SESSION_SECRET` is in no example and not in the README. A new contributor following the README hits a crash.
  - Read by code but undocumented: `DATABASE_URL`, `DB_SSL`, `BANKING_TOKEN_ENCRYPTION_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `STARLING_USE_SANDBOX`, `MCP_AUDIENCE`, `AUTH_SERVER_URL`, `FLUMP_PAT`, `FLUMP_API_URL`, `VITE_APP_URL`, `APP_URL`, `VITE_MARKETING_URL`.
  - Documented but unused: `JWT_SECRET` (no reference in `apps` or `packages` source), `WORKOS_CLIENT_ID` and `WORKOS_REDIRECT_URI` for the backend.
  - `docker-compose.yml` creates user, password and database all `postgres`; backend `.env.example` has `DB_PASSWORD=password` and `DB_NAME=flump`, so the example does not connect to the compose database as written.
  - Marketing example has only `PORT` and `NODE_ENV`; README says marketing is `:4000` but the example and Dockerfile use `3001`.
  - Hard-coded Railway default domain: `web-production-845e6c.up.railway.app` in `apps/marketing/server.ts:105-107` and `apps/marketing/src/utils/url.ts:23,38`, with host sniffing (`isRailway`) instead of configuration.
- Impact: slow onboarding, broken first run, and secrets or config nobody knows are required.
- Recommendation: generate the `.env.example` files from the zod env schemas (N-02), align ports (pick 4000 for the API, 3000 web, 3001 marketing), add `SESSION_SECRET` and all required keys, delete `JWT_SECRET`, align compose with the example, and replace the Railway host sniffing with `VITE_APP_URL`. Link to the Phase 1 note about the 17 `localhost:4000` fallbacks, which a central config module also fixes.
- Effort: M

### [N-12] README is materially out of date

- Severity: P2
- Location: `README.md`
- Evidence:
  - Ports: "Backend API `http://localhost:3000`" and "Marketing Site `http://localhost:4000`" are swapped relative to code (backend 4000, marketing 3001).
  - "Supabase Studio `http://localhost:54323`" has no basis: no Supabase in compose, config or dependencies. `.agents/rules/project_rules.md:91` also mentions `supabase migration`.
  - Architecture tree lists `packages/common` and `packages/app-shell` (neither exists as a package), and omits `banking`, `mcp` and `finance-engine`; domain section names `@repo/common`.
  - Prerequisites say Node `>= 20`; `.node-version` is `26.13.0`; `apps/web/package.json:5-8` has `engines` with `pnpm >=9` in a Bun repo.
  - "Quick Start" omits the `SESSION_SECRET` requirement (N-11), the required WorkOS setup, and the fact that the backend auth is currently mocked (Track D).
  - It says `bun run lint` "runs Biome checks" but it rewrites files (N-03).
  - Contributing section lists three of the four AGENTS.md gates, omitting `bun run build`.
  - "Testing and quality" says "Playwright browser runners" for component tests; web uses `happy-dom` (`vite.config.mts`, `environment: "happy-dom"`).
- Impact: wrong first-run experience, and agents and humans learn a false architecture.
- Recommendation: rewrite Quick Start, architecture tree, ports and prerequisites from the facts above; link `AGENTS.md` and the env schema.
- Effort: S

### [N-13] CI pipeline hygiene: tag-pinned actions, a third-party action with a write token, broad permissions, no timeouts, no Node pin

- Severity: P2
- Location: `.github/workflows/ci-pipeline.yml:19-22`, `.github/actions/bun-setup/action.yml`
- Evidence:
  - Workflow-level `permissions: actions: write, contents: read, pull-requests: write` is granted to every job, including lint and build, which need only `contents: read`.
  - `felixmosh/turborepo-gh-artifacts@v4.1.1` receives `secrets.GITHUB_TOKEN` (`repo-token`) with `actions: write`. It is third-party and pinned by tag, as are `oven-sh/setup-bun@v2.2.0`, `actions/cache@v6.1.0`, `actions/checkout@v7.0.1` and `davelosert/vitest-coverage-report-action@v2.13.2`. Mutable tags are a supply-chain risk.
  - No job has `timeout-minutes`.
  - No `setup-node` step: `bun run test` executes the `vitest` bin, whose shebang resolves to the runner's default Node, not the repo's `.node-version` (26.13.0). Node version in CI is therefore uncontrolled.
  - `fetch-depth: 0` is used in `check-types` and `vitest` but not needed (no turbo `--affected`, no git history reads), which slows checkout.
  - `concurrency.cancel-in-progress: true` also applies to pushes on `main`, so a quick second merge can cancel the first main run.
  - `release-please.yml` uses the default `GITHUB_TOKEN`, which means the release PR it opens will not trigger the CI workflow (GitHub does not run workflows for events created by that token). If branch protection requires checks, the release PR cannot merge without a manual re-run or a PAT or GitHub App token.
  - `release-please.yml` has a debug step that echoes all outputs on every run.
- Impact: elevated blast radius if one action is compromised, uncontrolled Node version, and a release PR that may be unmergeable or unchecked.
- Recommendation: per-job least-privilege permissions, pin third-party actions by SHA (Renovate can maintain digests with `helpers:pinGitHubActionDigests`), add `timeout-minutes: 15`, add `actions/setup-node` reading `.node-version`, gate cancel-in-progress to PRs, and give release-please a PAT or app token. Snippet 1 shows the pattern.
- Effort: S

### [N-14] Missing CI gates: dependency audit, secret scan, Storybook tests, docker, coverage

- Severity: P2
- Location: `.github/workflows/ci-pipeline.yml`
- Evidence: Phase 0 recorded `bun audit` with 21 vulnerabilities (7 high, 11 moderate, 3 low) including `typeorm`'s `minimatch` and `glob` chain (a runtime backend dependency) and `undici` via a web devDependency. Nothing in CI runs `bun audit`, a secret scanner, CodeQL, or Storybook tests. `bun run test:storybook` (`storybook build --test`) only builds stories and is not in CI at all; it does not execute `play()` tests or the a11y addon. `renovate.json` has no `vulnerabilityAlerts` or `osvVulnerabilityAlerts` setting.
- Impact: vulnerabilities and committed secrets arrive unnoticed; the AGENTS.md Definition of Done (zero a11y violations, `play()` coverage) is unenforced.
- Recommendation: add jobs for audit, gitleaks, and a Storybook vitest-addon or test-runner run (snippets 2, 3, 7). Start `bun audit` as non-blocking (`--audit-level=high` with `continue-on-error`) and tighten once the dev-tooling chain is cleaned. Add `osvVulnerabilityAlerts: true` to Renovate.
- Effort: M

### [N-15] Pre-commit does not enforce the pre-flight law or any AGENTS.md rule

- Severity: P2
- Location: `.husky/pre-commit` (`bun lint-staged`), `package.json:41-45`, `.claude/hooks/token-guard.sh`
- Evidence: the hook only runs `biome check --write` on staged `ts,tsx,js,jsx,json,md` files. No type check, no tests, no checks for colocation, tokens or `tabular-nums`. The only token check is `.claude/hooks/token-guard.sh`, a Claude Code PostToolUse hook: it fires only for Edit and Write tool calls (not human edits or `sed`), only matches quoted hex strings and `rgba(`, and exempts `backend`, `mobile-companion`, `finance-engine`, `banking`, `common` and `mcp`. Sweeps found 1,245 hex or rgb lines and 107 primitive-token lines, so it is not holding the line (and many of those files were never edited with Claude's tools).
- Impact: laws exist as prose and as an agent-only nudge; violations enter by any other route.
- Recommendation: move the checks into repo scripts that both humans and CI run (snippets 10 to 13), then call them from lint-staged (scoped to staged files) and the CI lint job. Keep `token-guard.sh` as an early-feedback layer.
- Effort: M

### [N-16] Proposed automation to enforce the AGENTS.md laws (see snippets below)

- Severity: P2
- Location: new files proposed: `scripts/check-colocation.ts`, `scripts/check-design-tokens.ts`, `scripts/check-tabular-nums.ts`, `.dependency-cruiser.cjs`, `panda.config.ts` (`strictTokens`), `.github/workflows/ci-pipeline.yml`
- Evidence: no Panda config sets `strictTokens` or `strictPropertyValues` (grep of `apps/*/panda.config.ts` and `packages/ui/panda.config.ts` returns nothing). `dependency-cruiser`, `knip`, `madge`, `gitleaks` and `osv` are not in `package.json` or `bun.lock`. The project skill `setup-ts-deep-modules` ships a config (`.agents/skills/setup-ts-deep-modules/dependency-cruiser.config.cjs`) built for a `src/packages/<name>/lib` layout, which does not match this repo's `packages/<name>/src` layout, so it needs adapting.
- Impact: the same audit (1,245 hex lines, 111 non-colocated components, 67 files without tabular numerals) will need repeating after every refactor.
- Recommendation: adopt the ratchet pattern: each script compares against a committed baseline file and fails only on new violations, so CI can go green today and tighten as legacy code is migrated. Details in "Proposed automation".
- Effort: M (scripts), S (Panda `strictTokens`)

### [N-17] Stale and duplicate config

- Severity: P3
- Location: `apps/web/fly.toml`, `apps/web/docker-compose.yml`, `apps/web/sonar-project.properties`, `apps/web/commitlint.config.js`, `apps/web/package.json:5-8`, `renovate.json:11`, `biome.json:2`, `.vscode/settings.json`, root `CHANGELOG.md`
- Evidence:
  - `fly.toml` is from 2023 (`app = "flump-f955"`); the commit `56ee0f6` removed the Fly deploy from CI, and Railway is now the target.
  - `apps/web/docker-compose.yml` duplicates the root one with `postgres:latest` and a `./postgres-data` bind mount, while root uses `postgres:18-alpine` and a named volume.
  - `sonar-project.properties` has a missing comma (`...*.d.tsapp/components/ui/**/*.*`), and `.vscode/settings.json` points SonarLint at `localhost:9000`; no Sonar step exists in CI.
  - `renovate.json` `ignoreDeps: ["typescript-coverage-report"]` refers to a package that is not in any manifest or lockfile.
  - `biome.json` `$schema` is 2.6.4 while Biome is 2.6.5 (2.6.6 available).
  - Root `package.json` version `1.18.0` and root `CHANGELOG.md` are frozen at 2024-05-26 and outside release-please's manifest.
  - `apps/web` `engines` lists `pnpm >=9` and the root `.npmrc` sets `engine-strict = true`, which pnpm or npm would enforce but Bun does not.
- Impact: confusion about the real deploy and DB setup; small risk of someone using the wrong compose file.
- Recommendation: delete the dead files, update the `$schema`, fix `engines` to `bun` and the real Node range, remove the dead Renovate entry, and either manifest the root or drop its version.
- Effort: S

### [N-18] Turbo configuration is thin

- Severity: P3
- Location: `turbo.json`, `apps/web/vite.config.mts:72`
- Evidence: no `env`, `globalEnv` or `globalDependencies`, so cache keys do not include variables such as `VITE_API_URL` or `VITE_APP_URL` except through Turbo's framework inference (not verified here). `test` depends on `^build` and also on `^test`, so package tests wait for upstream builds and tests, serialising CI. Web's coverage is `enabled: true` unconditionally, so every `bun run test` pays the V8 coverage cost and writes `coverage/` and `sonar-report.xml`. Root `lint` bypasses the turbo `lint` task entirely. `mobile-companion` has `lint` and `check-types` but no `test`. `ui: "tui"` in `turbo.json` can confuse CI logs (Turbo disables it in CI, but it is a local-only setting worth a note).
- Impact: slower CI than needed and a latent stale-cache risk for build-time `VITE_*` values.
- Recommendation: declare `env: ["VITE_*", "NODE_ENV"]` on `build`, drop `^test` from `test.dependsOn` if tests do not need upstream test results, make web coverage conditional on `--coverage` and use `test:coverage` in the CI coverage step only.
- Effort: S

### [N-19] Claude Code guardrails are partial

- Severity: P3
- Location: `.claude/settings.json`, `.claude/hooks/`, `.agents/skills/git-guardrails-claude-code`
- Evidence: settings has two PostToolUse hooks (biome format, token guard) and one env var. There is no PreToolUse guard against `git push`, `git reset --hard`, `git clean -f`, `git branch -D`, or `git checkout .`, and no `permissions.deny` rules for reading `.env*`. The `git-guardrails-claude-code` project skill exists but has not been applied, and the repo's own `preflight` skill says it never pushes. AGENTS.md section 5 expects a four-step pre-flight before PRs, with no hook that checks it ran.
- Impact: an agent can force-push or discard work; `.env` files with real secrets are readable by agents.
- Recommendation: apply the `git-guardrails-claude-code` hook project-scoped (propose only here), and add `permissions.deny` for `Read(./**/.env)` and `Read(./**/.env.local)`. Consider a Stop or pre-PR hook that refuses to proceed unless the preflight ran. Skills `setup-pre-commit` is Prettier-oriented and would conflict with Biome, so reuse its idea (typecheck and test in pre-commit) with Biome rather than running it.
- Effort: S

## Proposed automation (drafts only, nothing applied)

### Snippet 1: CI lint job (non-writing, least privilege, pinned Node)

Replace the lint job in `.github/workflows/ci-pipeline.yml`. Pin the `uses:` lines to SHAs when applying.

```yaml
permissions:
  contents: read

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: actions/setup-node@v5
        with:
          node-version-file: .node-version
      - uses: ./.github/actions/bun-setup
        with:
          turbo: true
          ghToken: ${{ secrets.GITHUB_TOKEN }}
          turboToken: ${{ env.TURBO_TOKEN }}
      - name: Biome (no write)
        run: bunx biome ci .
      - name: AGENTS.md law checks
        run: |
          bun scripts/check-colocation.ts
          bun scripts/check-design-tokens.ts
          bun scripts/check-tabular-nums.ts
      - name: Module boundaries
        run: bunx depcruise --config .dependency-cruiser.cjs apps packages
```

Matching `package.json` changes:

```json
{
  "scripts": {
    "lint": "biome ci .",
    "lint:fix": "biome check --write .",
    "format": "biome check --write .",
    "check:laws": "bun scripts/check-colocation.ts && bun scripts/check-design-tokens.ts && bun scripts/check-tabular-nums.ts && depcruise --config .dependency-cruiser.cjs apps packages"
  }
}
```

`biome.json` addition to stop release-please output failing lint:

```json
"files": { "includes": ["**", "!**/CHANGELOG.md", "!**/node_modules", "!**/dist", "!**/coverage", "!**/.turbo", "!**/build", "!**/styled-system"] }
```

### Snippet 2: dependency audit and secret scan jobs

```yaml
audit:
  name: Dependency audit
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@v7.0.1
    - uses: oven-sh/setup-bun@v2.2.0
      with: { bun-version: 1.4.4 }
    - run: bun install --frozen-lockfile --ignore-scripts
    - name: bun audit (high and above)
      run: bun audit --audit-level=high
      continue-on-error: true # remove once the dev-tooling chain is cleaned up

secrets:
  name: Secret scan
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@v7.0.1
      with: { fetch-depth: 0 }
    - uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Add `"osvVulnerabilityAlerts": true` to `renovate.json`, and `"extends": [..., "helpers:pinGitHubActionDigests"]` to keep action SHAs current.

### Snippet 3: Storybook tests with the a11y addon

Needs the `@storybook/addon-vitest` project wired in `apps/web/vite.config.mts` (this is Track J's decision). Job shape:

```yaml
storybook:
  name: Storybook tests and a11y
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v7.0.1
    - uses: ./.github/actions/bun-setup
      with: { turbo: false }
    - run: bunx playwright install --with-deps chromium
    - run: bun run --cwd apps/web vitest run --project=storybook
```

Set the a11y addon to `parameters.a11y.test: "error"` so violations fail the run rather than just showing in the panel.

### Snippet 4: Docker build smoke test

```yaml
docker:
  name: Docker build (${{ matrix.app }})
  runs-on: ubuntu-latest
  timeout-minutes: 20
  strategy:
    fail-fast: false
    matrix:
      app: [web, backend, marketing]
  steps:
    - uses: actions/checkout@v7.0.1
    - uses: docker/setup-buildx-action@v3
    - uses: docker/build-push-action@v6
      with:
        context: .
        file: apps/${{ matrix.app }}/Dockerfile
        push: false
        cache-from: type=gha,scope=${{ matrix.app }}
        cache-to: type=gha,mode=max,scope=${{ matrix.app }}
```

### Snippet 5: conventional commits (local and PR title)

```bash
bun add -d @commitlint/cli @commitlint/config-conventional
echo 'export default { extends: ["@commitlint/config-conventional"] };' > commitlint.config.js
echo 'bunx --no-install commitlint --edit "$1"' > .husky/commit-msg
```

```yaml
pr-title:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  steps:
    - uses: amannn/action-semantic-pull-request@v5
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Snippet 6: coverage thresholds that actually apply

In each `vitest.config.ts` (and fixing `apps/web/vite.config.mts`), use `thresholds`. Values are the Phase 0 floors, rounded down:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "lcov", "json-summary"],
  thresholds: { lines: 77, statements: 75, functions: 85, branches: 64 }, // finance-engine floor
},
```

Suggested floors (lines/branches): finance-engine 77/64, banking 87/72, mcp 26/11, backend 89/72, ui 86/60, marketing 88/81, web 84/70. Ratchet upwards; set finance-engine's target at 90/80 first because it is the money core. Remove `enabled: true` from web so plain `bun run test` stays fast, and run `test:coverage` only in the coverage CI step.

### Snippet 7: gate the whole workflow on the cheap checks first (optional)

Add `needs: [lint]` to `check-types` and `vitest` if CI minutes matter; otherwise leave the jobs parallel as they are now.

### Snippet 8: boot-time env validation (backend example)

```ts
// apps/backend/src/config/env.ts
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url().optional(),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().default(5432),
    DB_USER: z.string().default("postgres"),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().default("flump"),
    WORKOS_API_KEY: z.string().min(1),
    BANKING_TOKEN_ENCRYPTION_KEY: z.string().min(32),
    CORS_ALLOWED_ORIGINS: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.DATABASE_URL && env.DB_PASSWORD === "postgres") {
      ctx.addIssue({ code: "custom", message: "default DB password in production" });
    }
  });

export const validateEnv = (raw: Record<string, unknown>) => schema.parse(raw);
```

```ts
ConfigModule.forRoot({ isGlobal: true, validate: validateEnv });
```

Use the same pattern in `apps/web/app/config.server.ts` (replace the 17 `|| "http://localhost:4000"` fallbacks with one exported `API_URL`) and `apps/marketing/server.ts`. Generate each `.env.example` from the schema in a small script and fail CI if they drift.

### Snippet 9: Dockerfile runner stage and healthcheck (backend example)

```dockerfile
FROM oven/bun:1.4.4-slim AS base
# ... deps and build stages unchanged ...

FROM base AS prod-deps
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/   # adjust per package; or use turbo prune --docker
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/packages/*/dist ./packages/   # built outputs only
COPY --from=build --chown=bun:bun /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=bun:bun /app/apps/backend/package.json ./apps/backend/package.json
USER bun
WORKDIR /app/apps/backend
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["bun", "dist/main.js"]
```

The `COPY ... packages/*/dist` line is illustrative: workspace symlinks in `node_modules` point at `packages/<name>`, so the real change needs a short spike (or `turbo prune --docker`) before it is applied. Add a `GET /health` route that returns 200 and checks the DB connection with a cheap query.

Suggested `.dockerignore` additions:

```
**/.env
**/.env.*
!**/.env.example
**/coverage
**/storybook-static
docs
.github
.husky
```

### Snippet 10: colocation check (Law 1) with a ratchet baseline

```ts
// scripts/check-colocation.ts
import { Glob } from "bun";
import { basename, dirname } from "node:path";

const roots = [
  "packages/ui/src/**/*.tsx",
  "apps/web/app/components/**/*.tsx",
  "apps/web/app/containers/**/*.tsx",
  "apps/web/app/features/*/components/**/*.tsx",
  "apps/marketing/src/components/**/*.tsx",
  "apps/marketing/src/pages/**/*.tsx",
];
const skip = /\.(test|stories)\.tsx$|\/index\.tsx$|\/styled-system\//;
const required = (n: string) => [`${n}.styles.ts`, `${n}.stories.tsx`, `${n}.test.tsx`, "index.ts"];

const baseline = new Set<string>(
  (
    await Bun.file("scripts/colocation-baseline.txt")
      .text()
      .catch(() => "")
  )
    .split("\n")
    .filter(Boolean),
);
const failures: string[] = [];

for (const pattern of roots) {
  for await (const file of new Glob(pattern).scan(".")) {
    if (skip.test(file) || baseline.has(file)) continue;
    const name = basename(file, ".tsx");
    const dir = dirname(file);
    if (basename(dir) !== name) {
      failures.push(`${file}: must live in ${name}/${name}.tsx`);
      continue;
    }
    for (const sibling of required(name)) {
      if (!(await Bun.file(`${dir}/${sibling}`).exists()))
        failures.push(`${file}: missing ${sibling}`);
    }
  }
}

if (failures.length) {
  console.error(`Colocation violations (AGENTS.md section 1):\n${failures.join("\n")}`);
  process.exit(1);
}
```

Generate `scripts/colocation-baseline.txt` once from the current violations (`--write-baseline` flag) so CI passes today and fails only on new offenders. Shrink the baseline as components migrate.

### Snippet 11: design-token check (Law 2) with a ratchet baseline

```ts
// scripts/check-design-tokens.ts
import { Glob } from "bun";

const include = [
  "apps/web/app/**/*.{ts,tsx}",
  "apps/marketing/src/**/*.{ts,tsx}",
  "packages/ui/src/**/*.{ts,tsx}",
];
const exclude =
  /\.(test|stories)\.tsx?$|\/tokens\/|\/styled-system\/|\.config\.|panda\.preset|\.d\.ts$/;
const hex = /["'`]#[0-9a-fA-F]{3,8}["'`]|\brgba?\(|\bhsla?\(/;
const primitive =
  /["'`](slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|success|error)\.\d{2,3}\b/;

const baseline: Record<string, number> = JSON.parse(
  await Bun.file("scripts/design-token-baseline.json")
    .text()
    .catch(() => "{}"),
);
const failures: string[] = [];

for (const pattern of include) {
  for await (const file of new Glob(pattern).scan(".")) {
    if (exclude.test(file)) continue;
    const lines = (await Bun.file(file).text()).split("\n");
    const count = lines.filter((l) => hex.test(l) || primitive.test(l)).length;
    if (count > (baseline[file] ?? 0))
      failures.push(`${file}: ${count} violations (baseline ${baseline[file] ?? 0})`);
  }
}

if (failures.length) {
  console.error(`Design-token violations (AGENTS.md section 2):\n${failures.join("\n")}`);
  process.exit(1);
}
```

A per-file count baseline lets existing violations stand while forbidding new ones. Pair it with the stronger compile-time fix: set `strictTokens: true` and `strictPropertyValues: true` in `panda.config.ts` (apps and `packages/ui`), which makes Panda's `css()`, `cva` and `sva` reject raw colours and non-token values at type-check time. Expect many type errors on first turn-on, so enable per package after migration, or ship it as a ratchet with `// @ts-expect-error`-free migration in the Track H epic.

Biome also supports GritQL plugins (`"plugins": ["./biome-plugins/no-hex.grit"]`). A rule banning string literals that match `^#[0-9a-fA-F]{3,8}$` inside `css(...)` calls would give editor-time feedback. Syntax should be verified against the installed Biome 2.6.5 before relying on it.

### Snippet 12: tabular-nums check (Law 2, numeric display)

A per-file heuristic, same ratchet pattern:

```ts
// scripts/check-tabular-nums.ts
import { Glob } from "bun";

const formats = /formatCurrency|useFormatCurrency|Intl\.NumberFormat|toLocaleString|toFixed\(/;
const tabular = /tabular-nums|tabularNums/;
const exclude = /\.(test|stories)\.tsx?$|\/styled-system\/|\/utils\/|\.server\.ts$/;
const baseline = new Set<string>(
  (
    await Bun.file("scripts/tabular-baseline.txt")
      .text()
      .catch(() => "")
  )
    .split("\n")
    .filter(Boolean),
);
const failures: string[] = [];

for await (const file of new Glob("{apps/web/app,packages/ui/src}/**/*.tsx").scan(".")) {
  if (exclude.test(file) || baseline.has(file)) continue;
  const src = await Bun.file(file).text();
  if (formats.test(src) && !tabular.test(src)) failures.push(file);
}

if (failures.length) {
  console.error(
    `Files format numbers without tabular-nums (AGENTS.md section 2):\n${failures.join("\n")}`,
  );
  process.exit(1);
}
```

This is a file-level check, so it can pass while a single value is missed (same limit as the Phase 1 sweep). A sturdier route: add a Panda `textStyle` or `utilities` entry such as `numeric` that sets `fontVariantNumeric: 'tabular-nums'`, require money and percentage components to go through one `<Num>` or `<Currency>` primitive in `packages/ui`, and then check only that primitive. Also ban `toLocaleString()` with no locale and `toFixed(` on money paths with a Biome GritQL or `no-restricted-syntax`-style rule, since sweeps found about 10 locale-less calls.

### Snippet 13: dependency-cruiser boundaries (adapted to this repo's layout)

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "apps-do-not-import-apps",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/(?!\\1/)" },
    },
    {
      name: "packages-do-not-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-deep-package-imports",
      comment: "Import through the package entry point, not packages/<name>/src/**",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "^packages/[^/]+/src/(?!index\\.ts$)" },
    },
    {
      name: "engine-is-framework-free",
      comment: "finance-engine is the money core: no React, Nest or UI imports",
      severity: "error",
      from: { path: "^packages/finance-engine/src/" },
      to: { path: "node_modules/(react|react-dom|@nestjs|@repo/ui)" },
    },
    {
      name: "ui-does-not-know-the-app",
      severity: "error",
      from: { path: "^packages/ui/src/" },
      to: { path: "^(apps/|packages/(banking|finance-engine|mcp)/)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    exclude: { path: "(\\.test\\.|\\.stories\\.|styled-system|/dist/|/build/|/coverage/)" },
  },
};
```

Install with `bun add -d dependency-cruiser`. Start with `severity: "warn"` for `no-deep-package-imports` until the sweep shows the violation count, then flip to error. This is the `setup-ts-deep-modules` idea reshaped for a `packages/*/src` layout; the skill's own config would need its `src/packages/<name>/lib` assumption changed before use.

### Snippet 14: pre-commit that matches the pre-flight law (Biome, not Prettier)

```sh
# .husky/pre-commit
bun lint-staged
bun run check-types
```

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,json,css}": "biome check --write --no-errors-on-unmatched",
  "apps/web/app/**/*.tsx": "bun scripts/check-design-tokens.ts"
}
```

Running the full `bun run test` on every commit is heavy for this repo (web has 353 tests with coverage on); keep tests in CI and in the `preflight` skill, but type-check on commit is a reasonable middle ground. The `setup-pre-commit` project skill assumes Prettier and would conflict with Biome, so do not run it as written.

### Snippet 15: Claude Code guardrails

```json
{
  "permissions": {
    "deny": ["Read(./**/.env)", "Read(./**/.env.local)", "Read(./**/.env.production)"]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ]
  }
}
```

The script comes from the `git-guardrails-claude-code` skill (`scripts/block-dangerous-git.sh`). Not installed; propose only.

## Deploy checklist gaps (engineering:deploy-checklist lens)

What is missing from a safe production deploy today, in order of risk:

1. No migrations, so schema changes are applied by `synchronize: true` on boot (N-01).
2. No health endpoint and no `HEALTHCHECK`, so a bad deploy cannot be detected or auto-rolled back (N-05).
3. Required secrets and URLs are not validated, so a bad environment starts "healthy" (N-02, N-11).
4. Shared-package fixes do not trigger a release (N-08).
5. Images are not built before merge (N-07).
6. No rollback procedure is written down. Railway supports redeploying a prior deployment, but nothing in the repo or README says so, and without migrations the data side is not reversible.
7. No pre-deploy vulnerability or secret scan (N-14).
8. No monitoring or alerting configuration is in the repo (not checked against Railway; unknown).

## Limits

- No Railway access (MCP server not authorised), so Railway service settings, watch paths, variables, the production `NODE_ENV`, and whether production sets `BANKING_TOKEN_ENCRYPTION_KEY` and `WORKOS_API_KEY` are all unverified. N-01, N-02 and N-08 severities depend on that.
- No GitHub access: branch protection rules, required checks, Renovate PR history, and whether the release-please PR currently gets CI are unverified.
- No Docker build or image-size measurement was run; image size claims come from reading the Dockerfiles and the local `node_modules` size (3.3 GB), not from a built image.
- CI behaviour was read, not run. The claim that flat coverage keys are ignored is inferred from the Vitest config shape and from Phase 0 numbers (measured below the declared 80 percent while tests passed); it was not confirmed by a deliberate failing run.
- No runtime pass: the proposed scripts and configs were drafted but not executed, so counts and Biome GritQL syntax need checking when applied.
- The `engineering:deploy-checklist`, `claude-code-setup:claude-automation-recommender` and `railway:use-railway` plugin skills were not invoked as tools; their method was applied by hand. The project skills `setup-pre-commit`, `git-guardrails-claude-code` and `setup-ts-deep-modules` were read and compared to what exists; none was run.

## Quick wins

1. Change root `lint` to `biome ci .` and keep `--write` only on `format` (N-03). One line.
2. Add `!**/CHANGELOG.md` to `biome.json` `files.includes` (N-03).
3. `synchronize: process.env.NODE_ENV !== "production"` in `app.module.ts` (N-01).
4. `git rm -r --cached apps/*/coverage packages/*/coverage apps/marketing/*.tsbuildinfo` and add `coverage/` to the root `.gitignore`; delete `packages/common` (N-10).
5. Add `**/.env`, `**/.env.*` (keep `.env.example`) and `**/coverage` to `.dockerignore` (N-06).
6. Add `SESSION_SECRET` to `apps/web/.env.example`, fix the web `VITE_API_URL` to `http://localhost:4000`, align compose and `.env.example` DB credentials (N-11).
7. Fix the README ports, package list, Node and Bun prerequisites, and delete the Supabase line (N-12).
8. Move web coverage keys under `coverage.thresholds` and add floors for the other packages (N-04).
9. Add `permissions` per job, `timeout-minutes`, and `setup-node` with `.node-version` to CI (N-13).
10. Add `USER bun` and a pinned `oven/bun:1.4.4-slim` tag to the three Dockerfiles (N-05).
11. Install commitlint at the root and add `.husky/commit-msg` (N-09).
12. Delete `apps/web/fly.toml`, `apps/web/docker-compose.yml`, and the dead `typescript-coverage-report` Renovate entry (N-17).
13. Set `strictTokens: true` in one Panda config as a trial to see the real violation count (N-16).
