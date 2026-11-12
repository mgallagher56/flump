# Track A: Tech debt inventory and prioritisation

Audited 2026-11-11 on branch `chore/subagent-model-rules` (read-only). Method: `engineering:tech-debt` scoring, with the `codebase-design` vocabulary (module, interface, seam, depth, locality) used where the debt is structural.

Priority score = (Impact + Risk) x (6 - Effort), each 1 to 5. Effort 1 is under an hour and 5 is multi-week. The maximum is 50.

## 1. Headline

- There is **no P0 in this track**. The mock-auth bypasses in `apps/backend/src/auth/auth.guard.ts` belong to Track D and are not re-scored here.
- The one P1 is backend `synchronize: true` with no migrations (A-01). It can silently alter or drop columns in a real database.
- Most of the debt is cheap to fix: committed build artefacts, dead Vitest config, version drift, stale docs and stale root files. About 10 items are under half a day.
- The expensive debt is structural and already known from Phase 1: the design system is not adopted by `apps/web`, 2,000-line containers, and `any` and loose compiler flags in `apps/web` and `apps/backend`.
- Phase 1 leads that **turned out wrong or only partly right** are listed in section 5. Read them before trusting the knip output.

## 2. Prioritised backlog

| Rank | ID   | Category       | Title                                                                                 | I   | R   | E   | Score | Sev |
| ---- | ---- | -------------- | ------------------------------------------------------------------------------------- | --- | --- | --- | ----- | --- |
| 1    | A-01 | Infrastructure | TypeORM `synchronize: true`, no migrations                                            | 3   | 5   | 3   | 24    | P1  |
| 1    | A-04 | Dependency     | Vulnerable transitive deps and pinned `zod` in `@flump/mcp`                           | 3   | 3   | 2   | 24    | P2  |
| 1    | A-07 | Test           | Vitest coverage thresholds in web are in the wrong place and enforce nothing          | 3   | 3   | 2   | 24    | P2  |
| 1    | A-17 | Code           | API base URL and env read ad hoc in 17+ places                                        | 3   | 3   | 2   | 24    | P2  |
| 1    | A-18 | Test           | Money core and auth surface under-tested; mobile and `common` untested                | 4   | 4   | 3   | 24    | P2  |
| 6    | A-05 | Infrastructure | Tooling version drift (bun, node, biome, base images)                                 | 2   | 2   | 1   | 20    | P3  |
| 6    | A-06 | Dependency     | TypeScript 7.0.2 plus an unreferenced `@typescript/typescript6`                       | 2   | 3   | 2   | 20    | P2  |
| 6    | A-10 | Documentation  | Doc drift across AGENTS.md, .cursorrules, project_rules.md, README, blueprint         | 3   | 2   | 2   | 20    | P2  |
| 6    | A-16 | Code           | Lint hygiene: 128 warnings, schema mismatch, `lint` runs with `--write`               | 2   | 2   | 1   | 20    | P2  |
| 10   | A-02 | Code           | Compiler strictness off in web and backend; 299 non-test `any`                        | 4   | 4   | 4   | 16    | P2  |
| 10   | A-09 | Architecture   | Emotion SSR cache kept alongside Panda with no emotion consumers                      | 2   | 2   | 2   | 16    | P3  |
| 10   | A-19 | Infrastructure | Dockerfiles: unpinned base, whole `node_modules` shipped, bun runtime vs node scripts | 2   | 2   | 2   | 16    | P3  |
| 13   | A-03 | Infrastructure | Committed coverage reports and tsbuildinfo files                                      | 2   | 1   | 1   | 15    | P2  |
| 13   | A-08 | Dependency     | Deprecated Vite and Vitest options in `apps/web`                                      | 2   | 1   | 1   | 15    | P3  |
| 15   | A-13 | Architecture   | Duplicate modules: two Buttons, web vs marketing landing sections, FLP* vs `@repo/ui` | 4   | 3   | 4   | 14    | P2  |
| 16   | A-11 | Code           | Dead code and stale files                                                             | 2   | 1   | 2   | 12    | P3  |
| 16   | A-12 | Dependency     | Duplicate dependency declarations across workspaces                                   | 2   | 1   | 2   | 12    | P3  |
| 18   | A-14 | Architecture   | 12 source files over 1,000 lines                                                      | 4   | 3   | 5   | 7     | P2  |

A low score on A-14 does not mean it is unimportant. It means it is a long project that should be sliced, not scheduled as one item.

## 3. Findings

### [A-01] TypeORM `synchronize: true` on every connection, no migrations

- Severity: P1
- Location: `apps/backend/src/app.module.ts:54` (DATABASE_URL branch) and `apps/backend/src/app.module.ts:75` (host/port branch)
- Evidence: both `useFactory` return paths set `synchronize: true`. The first also sets `ssl: isLocal ? false : { rejectUnauthorized: false }` (line 55). There is no `migrations` key and no migration files under `apps/backend/src` (`git ls-files apps/backend/src` lists only entities, controllers, services and providers). `NODE_ENV` is not consulted.
- Impact: on every boot against a real database, TypeORM diffs entities against the schema and applies changes. Renaming or retyping an entity column can drop data, and nobody reviews the DDL. Financial data and bank connection tokens live in these tables. It also means there is no versioned schema history. (The `rejectUnauthorized: false` part is a security point for Track D.)
- Recommendation: gate `synchronize` on a non-production flag, adopt TypeORM migrations (`migration:generate` from the current entities as the baseline) and run them as a release step. Keep `synchronize` only for local and test.
- Effort: M

### [A-02] Compiler strictness is off where most of the code lives

- Severity: P2
- Location: `apps/web/tsconfig.json:30,31` (`"noImplicitAny": false`, `"strictNullChecks": false`, despite `"strict": true`); `apps/backend/tsconfig.json:25` (`"strict": false`, with `strictNullChecks` and `noImplicitAny` switched back on individually); `apps/backend/tsconfig.json:26` (`noUncheckedIndexedAccess: false`, overriding `base.json`)
- Evidence: non-test, non-story `any` count by package, from `grep -E ': any|as any|<any>'`: web 169, backend 62, mobile 30, ui 16, finance-engine 12, marketing 5, mcp 5, banking 0. Total 299, consistent with the Phase 1 figure of 305 (which included some tests). `apps/web/package.json:95-107` declares a `typeCoverage` block with `atLeast: 100`, but no `type-coverage` dependency or script exists, and `renovate.json` ignores `typescript-coverage-report`. The target is declared and not measured.
- Impact: web is the largest app and has null checking off. Null dereferences in financial UI (loader data, optional profile fields) are not caught at build time. `any` in backend (62) sits at the API boundary, where DTO shape errors become runtime errors.
- Recommendation: staged. (1) Turn on `strictNullChecks` in web with a per-directory `// @ts-nocheck`-free approach: start with `utils/`, `state/`, `services/`, `hooks/` via a second tsconfig project, then widen. (2) Backend: enable `strict: true` and fix the fallout once. (3) Remove the dead `typeCoverage` block or wire a tool to it. (4) Add a Biome rule `noExplicitAny` as `error` for new code with a baseline list, so the count can only fall.
- Effort: L

### [A-03] Committed coverage reports and tsbuildinfo files

- Severity: P2
- Location: `apps/{backend,marketing}/coverage/`, `packages/{banking,common,finance-engine,ui}/coverage/` (158 tracked files); `apps/marketing/tsconfig.app.tsbuildinfo`, `apps/marketing/tsconfig.node.tsbuildinfo`
- Evidence: `git ls-files | grep -E 'coverage/|tsbuildinfo'` counts: backend 38, marketing 31, banking 25, common 15, finance-engine 23, ui 26, plus the two tsbuildinfo files. The root `.gitignore` has `*.tsbuildinfo` (so the two marketing files were added before the rule and never untracked) but has **no `coverage` entry**. Only `apps/web/.gitignore` ignores `/coverage`. `biome.json` excludes `**/coverage` from checks, so lint does not notice them either.
- Impact: every `test:coverage` or `check-types` run dirties the tree and invites accidental commits. Reports contain stale entries and add review noise. `turbo.json:25,29` declares `coverage/**` as a task output, so turbo caching will also restore stale reports.
- Recommendation: add `coverage/`, `sonar-report.xml` and `.react-router/` to the root `.gitignore` and run `git rm -r --cached` on the 158 coverage files and the two tsbuildinfo files.
- Effort: S

### [A-04] Dependency vulnerabilities and the `zod` pin

- Severity: P2
- Location: `apps/web/package.json:73` (`vitest-github-actions-reporter`); `apps/backend/package.json:26` (`typeorm`); `packages/mcp/package.json:32-33` (`@modelcontextprotocol/sdk ^1.6.1`, `zod ^3.24.2`); `apps/mobile-companion/package.json` (`expo`)
- Evidence: `bun audit` in `00-baseline.md`: 21 findings (7 high, 11 moderate, 3 low), all transitive. I did not re-run `bun audit`; I rely on that capture. In `bun.lock`, `zod` resolves to 3.25.76 (line 2480) and `@modelcontextprotocol/sdk` to 1.32.2 (line 636), whose own range is `zod ^3.25 || ^4.0`. So the `^3.24.2` pin in `@flump/mcp` is the only thing holding zod on the 3.x line. `vitest-github-actions-reporter` is imported at `apps/web/vite.config.mts:11` and used only when `GITHUB_ACTIONS` is set (line 101). It is also the source of the `undici` and `@fastify/busboy` highs.
- Impact: `undici` and `@fastify/busboy` are dev-time and CI-time only, so this is hygiene, not runtime exposure. `typeorm` (`minimatch`/`glob`) is a runtime dependency of the backend, so that one deserves a real look at whether the vulnerable code path is reachable. The zod pin blocks the fix and will keep blocking it.
- Recommendation: (1) drop `vitest-github-actions-reporter` (Vitest's built-in `github-actions` reporter covers annotations) and re-run `bun audit`. (2) Bump `zod` in `@flump/mcp` to the fixed 4.x line and run the mcp tests (the SDK accepts it). (3) Check the latest `typeorm` for the `glob`/`minimatch` bump. (4) Add `bun audit --audit-level=high` as a non-blocking CI step first.
- Effort: S for (1) to (2), M with the mcp tests, since the package has only 26% coverage

### [A-05] Tooling version drift

- Severity: P3
- Location: `package.json:5` (`bun@1.4.4`), `.github/actions/bun-setup/action.yml` (`bun-version: 1.4.4`), `README.md` ("Bun >= 1.4.0, Node >= 20"), `.node-version` (`26.13.0`), `apps/web/package.json:7-10` (`engines`: node `>=20`, pnpm `>=9`), `biome.json:2` (`$schema` 2.6.4), `apps/*/Dockerfile:2` (`oven/bun:1-slim`)
- Evidence: local bun was 1.3.5 when Phase 0 ran, below the pinned 1.4.4 and the README minimum, yet install and all gates passed. Biome CLI is 2.6.5 (pinned in `package.json:23`), the schema URL says 2.6.4, and 2.6.6 is available. `.node-version` pins Node 26.13.0, while README and web `engines` say `>=20`. `apps/web` declares a `pnpm >=9` engine in a Bun repo, and `.npmrc` has `engine-strict = true`, which only npm and pnpm read. The Dockerfiles use the floating `oven/bun:1-slim` tag, so images can pick up a different bun to the one CI tests with.
- Impact: low today, but each pin is a place where "works on my machine" differs from CI or production. The pnpm engine is misleading for new contributors.
- Recommendation: add a `.bun-version` or `packageManager`-driven check in a pre-commit step; pin Dockerfiles to `oven/bun:1.4.4-slim`; update the Biome `$schema` to 2.6.5 (and bump Biome to 2.6.6 via Renovate); remove the `pnpm` engine and align the README Node range with `.node-version` (or document why `>=20` is the real floor).
- Effort: S

### [A-06] TypeScript 7.0.2 and an unreferenced `@typescript/typescript6`

- Severity: P2
- Location: `package.json:19-20`, `apps/backend/package.json:35-36` (`"@typescript/typescript6": "6.0.2"`, `"typescript": "7.0.2"`); `apps/web/tsconfig.json:15` (`"ignoreDeprecations": "5.0"`); `apps/backend/tsconfig.json:12-13` (`emitDecoratorMetadata`, `experimentalDecorators`)
- Evidence: every workspace uses `typescript` 7.0.2 (`bun.lock` lines 16, 43, 74, 101, 180 and others) and `node_modules/typescript` reports version 7.0.2. `@typescript/typescript6` is declared at root and in backend, but a repo-wide grep for `typescript6` finds only `package.json` and `bun.lock` entries, with no config, script or import. There is no comment explaining why it exists. A plausible reason is a compiler-API shim for tools that do not yet support TS 7, but I could not confirm that from the repo, so treat it as unexplained. `ignoreDeprecations: "5.0"` is a value that predates both TS 6 and 7. `check-types` passes, so the compiler accepts it, but it is a stale suppression and hides which options are deprecated. The backend builds with `tsc` (`apps/backend/package.json:8`) and relies on decorator metadata for NestJS and TypeORM injection.
- Impact: unknown intent invites someone to delete or upgrade the wrong one. Decorator-metadata emit is the part of TS 7 most worth runtime-testing for a Nest and TypeORM app. The 71 backend unit tests mock providers, so they may not exercise DI wiring from the compiled `dist`. I did not run the compiled app, so this is a risk, not a confirmed bug.
- Recommendation: add a one-line comment (or ADR) in `package.json` docs explaining `@typescript/typescript6`, or remove it if nothing needs it; replace `ignoreDeprecations: "5.0"` with the current valid value, or delete it and fix what it was hiding; add a boot smoke test for the compiled backend (`nest` DI resolves and `/ping` answers).
- Effort: S for the cleanup, M for the boot smoke test

### [A-07] Web coverage thresholds are in the wrong place and enforce nothing

- Severity: P2
- Location: `apps/web/vite.config.mts:63-91` (`coverage: { all: true, branches: 80, functions: 80, lines: 80, statements: 80, thresholdAutoUpdate: false ... }`)
- Evidence: the four `80` values are top-level keys of `coverage`. As I understand Vitest's configuration, thresholds belong under `coverage.thresholds` (and `coverage.all` was removed in recent majors). `vitest` here is 5.1.0. I did not run a failing-coverage experiment, so confirm in one run by lowering a test. Phase 0 showed web at 83% statements, so it would pass either way, and `00-baseline.md` already notes "no coverage thresholds" in CI. `coverage.enabled: true` (line 69) means plain `bun run test` writes coverage and `sonar-report.xml` on every run. That is why the tree gets dirty (A-03).
- Impact: the 80% gate that the config appears to promise does not protect against regressions. Meanwhile `finance-engine` (76% lines, 65% branches) and `mcp` (26%) have no gate at all.
- Recommendation: move the numbers into `coverage.thresholds`, set `enabled` to false for the default `test` script (leave it to `test:coverage`), and add per-package thresholds at about the current numbers so they ratchet up. Remove `all`, `watchExclude` and `useAtomics` if they are no longer valid options in Vitest 5. A short list of valid options is in the Vitest docs.
- Effort: S

### [A-08] Deprecated Vite and Vitest options in `apps/web`

- Severity: P3
- Location: `apps/web/vite.config.mts:42-46` (`optimizeDeps.esbuildOptions`), `apps/web/vite.config.mts:10,41` (`vite-tsconfig-paths`), `apps/web/vite.config.mts:64,98,103` (`coverage.all`, `watchExclude`, `useAtomics`)
- Evidence: Phase 0 recorded three Vite warnings: a deprecated `envFile` option, a redundant `vite-tsconfig-paths` plugin and a deprecated `optimizeDeps.esbuildOptions`. The last two are visible in the config. **I could not find `envFile` in any repo config** (`grep -rn envFile` over apps and packages returns nothing), so that warning most likely comes from a plugin such as the React Router Vite plugin and is not fixable here. `vite` is 8.3.6, which bundles with Rolldown, so `esbuildOptions` is superseded by `rolldownOptions`. `esbuild` 0.28.2 is also a direct web devDependency (`package.json:60`), with one file referencing it.
- Impact: these are warnings now and likely errors on a future Vite major. Low urgency.
- Recommendation: remove `tsconfigPaths()` (use `resolve.tsconfigPaths` if path aliases are still needed), replace `optimizeDeps.esbuildOptions.target` with the Vite 8 equivalent, and drop `esbuild` and `vite-tsconfig-paths` from devDependencies if nothing else needs them.
- Effort: S

### [A-09] Emotion SSR cache kept with no emotion consumers

- Severity: P3
- Location: `apps/web/app/createEmotionCache.ts:1-7`, `apps/web/app/entry.server.tsx:3,14,45-58`, `apps/web/app/entry.client.tsx`; `apps/web/package.json:12-14`
- Evidence: `grep -rln '@emotion' apps packages` over `.ts` and `.tsx` finds exactly three files: the cache factory and both entry files. No component imports `@emotion/styled` or `css` from emotion. The server entry still builds a cache, wraps the app in `CacheProvider` and extracts styles through `renderStylesToNodeStream` (lines 56-58). `.agents/rules/project_rules.md` says to avoid other CSS-in-JS libraries and styling is Panda. The knip report lists these deps as "unused", but that report is unreliable for `apps/web` (section 5), so I verified by grep instead.
- Impact: three runtime packages, an extra stream transform on every SSR response, and a second styling system in the docs' mental model. It likely traces back to an earlier MUI or emotion-based UI. Part of the 230 KB `entry.client` may be emotion, but I did not measure it.
- Recommendation: delete the three emotion packages and the cache code, simplify `entry.server.tsx`, and check the SSR output and the bundle visualiser afterwards. This is the "Emotion to Panda" epic in the plan, and it is mostly already finished.
- Effort: S to M (test the SSR stream path carefully)

### [A-10] Documentation drift

- Severity: P2
- Location: `AGENTS.md`, `.cursorrules`, `.agents/rules/project_rules.md`, `README.md`, `docs/AGENT_IMPLEMENTATION_BLUEPRINT.md`, `GLOSSARY.md`, `docs/agents/component-guidelines.md`
- Evidence, by document:
  - **Rule sets disagree on the gate.** `AGENTS.md` section 4.4 and section 5 require `lint`, `check-types`, `test` and `build`. `.cursorrules` (34 lines, no section 5) and `.agents/rules/project_rules.md:171` ("`bun run check-types` and `bun run test`") require only two. Three copies of the same laws now diverge and a Cursor or Antigravity agent will skip lint and build.
  - **Storybook version.** `AGENTS.md:11`, `.cursorrules:9` and `docs/agents/component-guidelines.md:15` say "Storybook 8". Installed is 10.6.6 and README says Storybook 10.
  - **Packages that do not exist.** README lists `packages/common` ("pure domain models, tax rules") and `packages/app-shell` (README lines 126-127) and describes `@repo/common` (README lines 135-138). `.agents/rules/project_rules.md` also refers to `packages/app-shell` and `@repo/common`. In reality `packages/common` contains only a `coverage/` folder (15 tracked files) and `node_modules`, with no `package.json` or `src`, and `packages/app-shell` is absent. The domain logic now lives in `@flump/finance-engine` and `@flump/banking`, and `app-shell` is a folder inside `apps/marketing/src`. `packages/finance-engine/src/types.ts:105` still has a comment about "Compatibility aliases for @repo/common".
  - **Stack claims.** README's tech stack lists Playwright and MSW. Neither appears in any `package.json`. `project_rules.md` says the mobile app uses "TailwindCSS v4 / NativeWind v4" and the backend serves "REST/GraphQL". Neither NativeWind nor GraphQL is a dependency of `apps/mobile-companion` or `apps/backend`, and mobile styles are plain React Native objects.
  - **Blueprint.** `docs/AGENT_IMPLEMENTATION_BLUEPRINT.md:416` tells readers to run `pnpm --filter ...`, a package manager the repo does not use.
  - **GLOSSARY.** The seams it names do exist in code (`ProfilePersistenceAdapter`, `BankingProviderAdapter`, `BankSyncOrchestrator`, `PortfolioSnapshot` each appear in 6 to 14 source files). `ProfileLifecycle` is only an exported type in `apps/backend/src/user-profile.service.ts`, and the glossary calls it a "deep application service", which overstates it. Minor.
  - **Product docs.** `docs/pages_and_features.md` and `docs/app_functionality.md` were not cross-checked against the 29 route files. Left to Track I and L.
- Impact: agents and new contributors act on instructions that are wrong or incomplete. It is worst for the three overlapping rule files, because the agents that read them are the main contributors to this repo.
- Recommendation: make `AGENTS.md` the single source of truth. Turn `.cursorrules` and `project_rules.md` into one-line pointers to it (or generate them in a pre-commit step). Fix "Storybook 8", delete the `packages/common` directory, update README's package list and tech stack, and replace `pnpm` in the blueprint.
- Effort: M

### [A-11] Dead code and stale files

- Severity: P3
- Location: see evidence
- Evidence (each verified by reading or grep, not only knip):
  - `apps/web/app/components/core/inputs/slider/FLPSlider.tsx` and `apps/web/app/components/forecast/ScenarioLayersWidget.tsx` are referenced only by their own test files (`grep -rlw` over `apps/web/app` and `packages/ui/src`).
  - `apps/web/app/routes/callback.tsx` and `apps/web/app/routes/auth.callback.tsx` are both 72 lines and differ only in the exported function name (`diff`). Two routes serve the same handler, so changes to the auth callback must be made twice. Track D should say which URL WorkOS is actually configured to use.
  - `apps/web/.prettierrc.js` and `.prettierignore` are tracked in a Biome-only repo, and `.prettierrc.js` reads `compilerOptions.baseUrl` from `tsconfig.json`, which no longer sets one.
  - `apps/web/commitlint.config.js` (extends `@commitlint/config-conventional`, not installed) and `apps/web/sonar-project.properties` plus `.vscode/settings.json` (SonarLint connected to `http://localhost:9000`) are leftovers of earlier tooling. `.husky` runs only `lint-staged`.
  - `apps/web/fly.toml` is dated 2023 and names a Fly app; the Dockerfiles and `docker-compose.yml` suggest another host. `apps/web/docker-compose.yml`, `apps/web/scripts/migrate.sh` (a swapfile script for Fly) and `apps/web/db_types.ts` (a Supabase-generated type with a `graphql_public` schema, imported only by `app/containers/accounts/types.d.ts:1`) look like they predate the NestJS and TypeORM backend.
  - `packages/common` contains no source (see A-10), and `apps/web/app/utils/demoData.ts` is 989 lines of demo data (Track G decides whether it stays).
  - Root `package.json` and `apps/backend/package.json` declare `@typescript/typescript6` (A-06).
- Impact: noise for readers, false hits in searches, and some leftover config that suggests a deploy path that may not exist.
- Recommendation: delete the items above after the owner confirms Fly and Sonar are retired. Do the `callback` consolidation as part of the auth work in Track D.
- Effort: S

### [A-12] Duplicate dependency declarations across workspaces

- Severity: P3
- Location: all `package.json` files
- Evidence: `typescript` 7.0.2 is declared in the root and in 8 workspaces; `vitest` 5.1.0 in the root and 6 workspaces; `@types/node` 26.6.6 in root and 8 workspaces; `happy-dom` 21.0.4 in root and 3; `@vitest/coverage-v8` 5.1.0 in root and web; `react-icons` 5.7.0 in web, marketing and ui; `@radix-ui/react-tabs` 1.2.1 in web (`FLPTabs.tsx`) and ui (`SegmentedTabs.tsx`), which is the same component twice. All versions are exact pins and consistent today. Renovate groups non-major updates into one PR (`renovate.json`), so drift is unlikely in practice.
- Impact: low. It mostly makes upgrades touch many files and hides which package really needs what.
- Recommendation: use Bun's workspace `catalog` for shared versions, or keep dev tooling only at the root. Not urgent.
- Effort: M

### [A-13] Duplicate modules and a parallel design system

- Severity: P2
- Location: `packages/ui/src/components/forms/Button.tsx` and `packages/ui/src/primitives/Button/`; `apps/web/app/components/home/*` and `apps/marketing/src/components/*`; `apps/web/app/components/core/*` (FLP*) and `packages/ui`; `apps/mobile-companion/src` (7 `Intl.NumberFormat` helpers)
- Evidence: the landing page is built twice. Web `components/home` has `ComparisonMatrix`, `FeaturePillars`, `HomeFAQ`, `InteractiveFinancialTeaser`, `SecurityPrivacySection`, `WebBaselineSnapshotPreview`, `WebHowItWorksSection`, and marketing `components/` has the same set. `LoggedOutHome` is the web copy (imported from `routes/_index.tsx`). The marketing app holds the SEO pages. `@repo/ui` and web both ship tabs, buttons, sliders and badges (`FLPSlider`, `FLPBadge`, `FLPTabs`). Phase 1 found only 3 files using the `@repo/ui` layout components.
- Impact: a copy change or accessibility fix has to land in at least two places. Behaviour and styling drift. This is the largest ongoing cost of the debt in this report, and Track H owns the design-system side.
- Recommendation: decide first, in an ADR, whether web adopts `@repo/ui` or the AGENTS.md laws are relaxed for web. Then (1) share the landing sections through `@repo/ui` or serve `/` from marketing, (2) delete the extra Button, (3) move mobile formatters into one helper (or into `@flump/finance-engine` formatting).
- Effort: L

### [A-14] Oversized modules

- Severity: P2
- Location: `apps/web/app/containers/tax/TaxContainer.tsx` (2,198 lines), `UserProfilePanel.tsx` (1,348), mobile `TaxScreen.tsx` (1,316), mobile `MortgageScreen.tsx` (1,307), `RunwayCalculator.tsx` (1,236), `app.onboarding.tsx` (1,226), `MortgageContainer.tsx` (1,225), mobile `ProfileScreen.tsx` (1,209), `PensionForecasterCard.tsx` (1,180), `packages/finance-engine/src/tax-rules.ts` (1,139), mobile `ForecastScreen.tsx` (1,093), `BudgetDashboard.tsx` (1,012). Counts are from Phase 1; I did not recount.
- Evidence: Phase 1 also counts 2,213 `style={{` lines, concentrated in `TaxContainer` (130), `app.onboarding` (85) and `BudgetDashboard` (66).
- Impact, in `codebase-design` terms: these are **shallow, wide modules**. Most have a small interface (one container and its props) but do rendering, state, formatting and rules in one body, so there is little locality and no seam to test through. That matches the coverage data (web functions 72%) and the low `play()` coverage. `tax-rules.ts` is different: it is rules data and its size is expected, but it sits at 76% coverage in the money core.
- Recommendation: split by seam, not by line count. Extract calculation into `@flump/finance-engine` (pure, testable) and presentation into colocated components, one container at a time, starting with whichever is next to be edited for features. Do not schedule it as one project.
- Effort: L (ongoing)

### [A-16] Lint hygiene

- Severity: P2
- Location: root `package.json:17` (`"lint": "biome check --write ."`), `biome.json:2`, `apps/{backend,marketing,web}/CHANGELOG.md`
- Evidence: Phase 0 result for `biome check .`: 4 errors, 128 warnings, 1 info. The four errors are formatting only: three release-please CHANGELOG files and `docs/audit/AUDIT_PLAN.md`. `.github/workflows/ci-pipeline.yml` runs `bun run lint`, and the script writes fixes, so CI mutates files in the runner and still passes. A formatting regression can never fail CI. Warnings: about 45 `noNonNullAssertion`, 35 `noUnusedImports`, 8 `noThisInStatic`, 8 `noImportantStyles` and the 20 a11y ones. The lint-staged hook also uses `--write`, so the same applies locally. `biome.json` schema is 2.6.4 against CLI 2.6.5 (A-05). There are 7 `biome-ignore` comments, each with a reason (checked the ones in `AddDebtDialog.tsx`, `BudgetCategoryTable.tsx`, `UserProfilePanel.tsx`, `useUserProfile.ts` and `Header.test.tsx`), but two are the keyboard-handler suppressions that Track J cares about.
- Impact: CI lint is a no-op for formatting, and 128 warnings train people to ignore Biome output.
- Recommendation: make CI run `biome check .` (no `--write`) and keep `--write` for the local `format` script and the hook. Add `**/CHANGELOG.md` to `files.includes` exclusions. Clear the 35 unused imports in one safe-fix commit, then set `noUnusedImports` to `error`. Triage `noNonNullAssertion` per package.
- Effort: S for the CI and ignore change, M for the warning cleanup

### [A-17] API base URL and environment read ad hoc

- Severity: P2
- Location: `apps/web/app/root.tsx`, `apps/web/app/hooks/useUserProfile.ts` (6 occurrences), `apps/web/app/containers/budget/BudgetContainer.tsx` and most `app.*.tsx` routes; `apps/web/app/routes/logout._index.tsx` (hardcoded `http://localhost:3001`); `apps/marketing/server.ts` (8 `process.env` reads), `apps/web/app/session.server.ts`, `packages/banking/src/.../plaid.ts`, `crypto.ts`, `packages/mcp/src/transports/stdio.ts`
- Evidence: Phase 1 counted at least 17 copies of `process.env.VITE_API_URL || "http://localhost:4000"` in web. I did not recount each, but `apps/web/app/services/backend-client.server.ts` exists and has tests, so a single seam is already half built. There is no env schema anywhere. A missing variable falls back silently to localhost or to an unsafe default (for example the dev-user fallback in `auth.guard.ts:46-49`, owned by Track D).
- Impact: a misconfigured production deploy talks to `localhost:4000` and fails at request time instead of at boot. Every new route repeats the pattern. It is also the cause of the "no real config surface" gap that Track N notes.
- Recommendation: one `config` module per app (a zod schema is already in the repo through `@flump/mcp`), validated at boot, with `API_URL` read in one place. Route all web fetches through `backend-client.server.ts`.
- Effort: M

### [A-18] Test debt in the money core and the auth surface

- Severity: P2
- Location: `packages/finance-engine` (76% lines, 65% branches), `packages/mcp` (26% lines, 12% branches), `apps/mobile-companion` (no test script), `packages/common` (no source)
- Evidence: coverage table in `00-baseline.md` section 2; `apps/mobile-companion/package.json` has no `test` script; `turbo.json` has no mobile tasks for `test` or `build`. Phase 1 also found 33 of 54 stories without a `play()` test, and `test:storybook` only builds stories (`apps/web/package.json:93`), so neither `play()` nor the a11y addon runs in CI. `packages/ui` branch coverage is 60%.
- Impact: the package that produces every financial number has 35% of its branches untested, and the MCP surface (token verification, scopes) is the least tested part of the system. Tracks C, D and F will go deeper. For the debt backlog the point is that the missing safety net raises the risk of every refactor above (A-02, A-13, A-14).
- Recommendation: before any big refactor, add characterisation tests around `finance-engine` rules and the `mcp` token verifier. Run Storybook tests through the Vitest addon in CI (it is already a dependency, `@storybook/addon-vitest`). Add a `test` script to mobile or explicitly mark it out of scope.
- Effort: M to L

### [A-19] Docker and runtime hygiene

- Severity: P3
- Location: `apps/backend/Dockerfile`, `apps/web/Dockerfile`, `apps/marketing/Dockerfile`
- Evidence: all three use `FROM oven/bun:1-slim`, and the runner stage copies the whole `/app/node_modules`, all of `/app/packages` and the app directory (backend lines 26-36). So dev dependencies (Storybook, Vitest, Expo) ship in the production image. `apps/backend/Dockerfile` ends with `CMD ["bun", "dist/main.js"]`, while `apps/backend/package.json:9-11` defines `start` as `node dist/main`. The backend is therefore built by `tsc` and run on Bun in production, but documented and probably developed against Node (the `.node-version` is 26.13.0). No `USER` and no `HEALTHCHECK` appear in the files I read. `bun install --ignore-scripts` is used in the deps stage, so the `prepare` script (`panda codegen`) is skipped there and run explicitly in the web stage only.
- Impact: larger images, a bigger attack surface and a runtime that differs from the one the team normally tests. TypeORM and decorator metadata on Bun are the part worth smoke-testing (A-06).
- Recommendation: leave the detailed Docker review to Track N. For debt purposes: pin the image tag, use `bun install --production` in the runner stage, choose one runtime for the backend and say so in the README.
- Effort: M

## 4. Phased plan (alongside feature work)

**Phase 1, under a day in total (quick wins).** A-03, A-05, A-07, A-08, A-16 (CI part), A-10 (the three rule files), A-04 part 1 and 2.

**Phase 2, one to two weeks.** A-01 (migrations baseline), A-17 (config module), A-09 (emotion), A-11 (stale files), A-06 (boot smoke test), A-18 (characterisation tests for `finance-engine` and `mcp`).

**Phase 3, a quarter, sliced per feature.** A-02 (strictness, staged), A-13 (ADR then consolidation), A-14 (split containers as they are touched). Gate each slice by the four CI checks in AGENTS.md section 5.

## 5. Phase 1 leads that did not hold up, and tool limits

- **knip was run but is only partly reliable.** `bunx knip` ran without writing into the repo (`git status` was unchanged afterwards), but it **failed to load `apps/web/react-router.config.ts` and `apps/web/vite.config.mts`** (`ENOENT scandir 'app/routes'`, because the config reads the routes folder relative to the cwd). With those entry points missing, it reported every web route, `entry.client`, `entry.server`, `routes.ts` and `session.server.ts` as "unused files", and flagged `@emotion/*`, `i18next-browser-languagedetector`, `i18next-http-backend`, `isbot`, `tiny-invariant`, `@react-router/remix-routes-option-adapter` and `remix-flat-routes` as unused. I grepped these: each of the i18next, isbot, tiny-invariant, remix-flat-routes and routes-adapter packages is imported by at least one web source file, so **they are not unused**. Only the emotion finding survived verification (A-09). The "unused exports" list for web (60+ items, including routes and `home/*` components) is mostly the same artefact. I rechecked a sample by grep: `LoggedOutHome`, `HomeHero`, `DemoModeBanner`, `DebtWidget`, `StatMetric`, `RemortgageShockSim` and `UserAvatar` all have importers, so they are live. Only `FLPSlider` and `ScenarioLayersWidget` were confirmed dead.
- Knip's `@repo/typescript-config` "unused devDependency" hits are also false positives: workspaces extend it by relative path or `extends`, not by import.
- knip's `unlisted dependencies` for `@nestjs/schematics` (`apps/backend/nest-cli.json`) is plausible but I did not check whether `nest-cli.json` is used by any script. The backend scripts do not call the Nest CLI.
- The Phase 0 note that the Vite `envFile` warning is an option in `apps/web` could not be confirmed; it is not in repo config (A-08).
- The Phase 1 claim of "305 any" is about right for non-test code (299 by my count, excluding tests, specs and stories).
- Not checked: no runtime pass, so nothing about the compiled backend, SSR output or bundle contents was run. `bun audit` was not re-run. I did not measure what share of `entry.client` is emotion. I did not verify the Vitest threshold behaviour with a failing run. Renovate PR history needs GitHub access. Mobile app dependency state (Expo SDK 58 audit hits) was not inspected beyond the baseline.

## 6. Quick wins (each under an hour)

1. Add `coverage/` and `sonar-report.xml` to the root `.gitignore`, then `git rm -r --cached` the 158 coverage files and the two marketing `tsbuildinfo` files (A-03).
2. Move the web coverage numbers under `coverage.thresholds` and turn off `coverage.enabled` for plain `test` (A-07).
3. Change CI lint to `biome check .` without `--write` and ignore `**/CHANGELOG.md` (A-16).
4. Update the Biome `$schema` to match the CLI and pin Docker images to `oven/bun:1.4.4-slim` (A-05).
5. Delete the empty `packages/common` directory and fix README, `.cursorrules` and `project_rules.md` package lists (A-10).
6. Replace "Storybook 8" with "Storybook 10" in the three rule files, and add the missing lint and build steps to `.cursorrules` and `project_rules.md` (A-10).
7. Remove `vitest-github-actions-reporter` and re-run `bun audit` (A-04).
8. Bump `zod` in `packages/mcp/package.json` and run its tests (A-04).
9. Delete `FLPSlider`, `ScenarioLayersWidget` and their tests, the duplicate `callback.tsx` (after confirming the WorkOS redirect URI), `.prettierrc.js`, `.prettierignore` and `commitlint.config.js` in web (A-11).
10. Add a comment or ADR for `@typescript/typescript6`, or delete it (A-06).
