# Phase 0 — Baseline

Captured 2026-11-11 on `main` (clean tree at start). Tooling: bun 1.3.5 locally (repo pins `bun@1.4.4`), Biome 2.6.5.

## 1. The four CI gates

| Gate                  | Result                                                                         | Notes                                                       |
| --------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `bun run lint`        | **Fails** (run read-only as `biome check .`; the script itself uses `--write`) | 4 errors, 128 warnings, 1 info                              |
| `bun run check-types` | Pass                                                                           | 14/14 tasks                                                 |
| `bun run test`        | Pass                                                                           | 13/13 tasks. ui 62, backend 71, marketing 25, web 353 tests |
| `bun run build`       | Pass                                                                           | 8/8 tasks                                                   |

### Lint detail

**The 4 errors are all formatting, not code:** `apps/{backend,marketing,web}/CHANGELOG.md` (release-please output, probably should be in Biome's ignore list) and `docs/audit/AUDIT_PLAN.md` (this audit's own file). Because `bun run lint` runs with `--write`, CI would auto-fix them, which hides the problem.

**Warnings by workspace:** apps/web 50, finance-engine 29, banking 18, backend 15, mcp 8, marketing 6, ui 3, mobile-companion 1. Another warning comes from `.agents/skills`.

**Warnings by rule (counts approximate; Biome's output was parsed loosely):**

| Rule                                                            | Count  |
| --------------------------------------------------------------- | ------ |
| `noUnusedImports`                                               | 35     |
| `noNonNullAssertion`                                            | ~45    |
| `noThisInStatic`                                                | 8      |
| `noImportantStyles`                                             | 8      |
| `a11y/useSemanticElements`                                      | 7      |
| `a11y/noStaticElementInteractions`                              | 6      |
| `a11y/useKeyWithClickEvents`                                    | 7      |
| `noUnusedPrivateClassMembers`                                   | 4      |
| `noUnusedFunctionParameters`                                    | 6      |
| `noDocumentCookie`                                              | 2      |
| `useDateNow`                                                    | 2      |
| `noGlobalIsNan`, `noStaticOnlyClass`, `noTemplateCurlyInString` | 1 each |

Also: `biome.json` has `$schema` 2.6.4 but the CLI is 2.6.5. Biome 2.6.6 is available.

The a11y warnings (click handlers on non-interactive elements, missing keyboard handlers) feed straight into Track J.

## 2. Tests and coverage

| Package                 | Stmts     | Branch    | Funcs     | Lines     |
| ----------------------- | --------- | --------- | --------- | --------- |
| `@flump/banking`        | 86.84     | 72.15     | 94.23     | 87.85     |
| `@flump/finance-engine` | 75.75     | 64.80     | 85.78     | 77.66     |
| **`@flump/mcp`**        | **25.65** | **11.88** | **33.92** | **26.08** |
| `backend`               | 89.32     | 72.80     | 80.41     | 89.97     |
| `@repo/ui`              | 85.74     | 60.07     | 74.54     | 86.09     |
| `marketing`             | 88.34     | 81.87     | 63.01     | 88.85     |
| `@flump/web`            | 83.28     | 70.57     | 72.28     | 84.92     |
| `mobile-companion`      | no tests  |           |           |           |
| `@flump/common`         | no tests  |           |           |           |

Concerns: `finance-engine` is the money-calculation core and sits at ~76% lines / 65% branches. `@flump/mcp` (auth and tools) is at ~26%. `mobile-companion` has no test script at all.

## 3. Storybook

`bun run test:storybook` is `storybook build --test`. It **passes**, but it only builds the stories. It does not run the `play()` tests or the a11y addon. So **there is currently no automated a11y-violation count and no light/dark story check anywhere in CI**. Getting one means running the Vitest addon project or the Storybook test runner. That is Track J work. 66 `.stories.tsx` files exist. The build also emits a chunk-size warning.

## 4. Bundles

| Output                           | Largest files                                                   |
| -------------------------------- | --------------------------------------------------------------- |
| `apps/web/build/client`          | `CategoricalChart` (recharts) 301 KB, `entry.client` 230 KB     |
| `apps/web/build/server/index.js` | 1.5 MB                                                          |
| `apps/marketing/dist/client`     | `index-*.js` 522 KB (single bundle, no route splitting evident) |
| `apps/marketing/dist/server`     | `entry-server.js` 404 KB                                        |

Sizes are raw, not gzip. The marketing client is one 522 KB file for a mostly static site. Look at route-level splitting and `react-icons` imports in Track E.

## 5. Dependencies

`bun audit`: **21 vulnerabilities (7 high, 11 moderate, 3 low)**. Everything flagged is a transitive, mostly dev-tooling dependency:

- `undici <6.23.0`, via `vitest-github-actions-reporter` (web devDependency). This accounts for most of the highs: WebSocket DoS issues, TLS validation bypass.
- `minimatch` and `glob`, via `typeorm`, `expo` and `@storybook/react-vite`. `typeorm` is a runtime dependency of the backend.
- `zod <4.6.6`, via `@flump/mcp` (pins `^3.24.2`) and `@modelcontextprotocol/sdk`.
- `@fastify/busboy`, via `vitest-github-actions-reporter`.

`bun outdated` shows only `@biomejs/biome` 2.6.5 → 2.6.6 for direct dependencies.

Other things seen in the toolchain output:

- Vite config warnings in web: deprecated `envFile` option, `vite-tsconfig-paths` plugin now redundant, `optimizeDeps.esbuildOptions` deprecated.
- `@emotion` is still used for SSR style extraction in `apps/web` (`createEmotionCache.ts`, `entry.client.tsx`, `entry.server.tsx`) alongside Panda.

## 6. Inventory

- Web routes: 29 files in `apps/web/app/routes` (includes tests; both `auth.callback.tsx` and `callback.tsx` exist).
- Backend controllers: 6 (`app`, `budget`, `finance`, `mcp`, `tax`, `user-profile`), all flat in `src/`.
- `packages/ui/src`: calculators 9, patterns 9, primitives 9, components 2, foundations 3, tokens 3 entries.
- Web components and containers: 111 non-test, non-story `.tsx` files in domain folders (for example `components/budget/BudgetCategoryTable.tsx`). **None follows the `Name/Name.tsx` layout** required by AGENTS.md Law §1. The only colocated code is under `features/*`.
- Stories: 66 files across the repo.
- CI (`.github/workflows/ci-pipeline.yml`): runs lint, check-types, test, build. No coverage thresholds, no Storybook a11y gate, no `bun audit`.

## 7. Not done in Phase 0

- **Lighthouse / Core Web Vitals:** not run. It needs the apps served (web needs WorkOS and backend env, marketing needs a build served). Moved to Track E, where the apps will be launched anyway.
- **Gzip bundle sizes** and a bundle visualiser.
- **Storybook a11y violation count** (see §3).
- **Renovate PR review:** needs GitHub access, which isn't authorised in this session.

## 8. Findings from running Phase 0

**Generated coverage reports are committed to git.** `apps/*/coverage` and `packages/*/coverage` (158 tracked files, mostly HTML) are tracked, except `apps/web`, which gitignores its own, so every `test:coverage` run dirties the tree. They also contain stale entries (for example the old flat `packages/ui` calculator reports). They should be gitignored and removed from the index. This is a P2 item for Track N. I reverted the changes my run made.

## 9. Side effects of running Phase 0

`bun run check-types` modified two tracked files: `apps/marketing/tsconfig.app.tsbuildinfo` and `tsconfig.node.tsbuildinfo`. These are build artefacts that are committed to the repo. They are probably accidental and belong in `.gitignore`. Nothing was committed.
