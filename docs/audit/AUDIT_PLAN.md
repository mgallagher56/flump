# Flump Full-Project Audit Plan

> Status: **Plan only — nothing audited yet.** Created 2026-11-11.
> Scope: whole monorepo — `apps/{web,marketing,backend,mobile-companion}`, `packages/{ui,finance-engine,banking,mcp,common,typescript-config}`, CI/Docker/release tooling.
> Yardstick: [`AGENTS.md`](../../AGENTS.md), [`docs/agents/component-guidelines.md`](../agents/component-guidelines.md), [`docs/copy-style-guide.md`](../copy-style-guide.md), WCAG 2.2 AA.

---

## 0. Skill map — which skill for which job

Several installed skills overlap. This is the pick for each dimension (**primary** first, others as supplements).

| #   | Audit track                          | Primary skill                                                                                                  | Supplementary skills                                                                                                                                                                                           | Skip / why                                                                                         |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A   | Tech debt inventory & prioritisation | `engineering:tech-debt`                                                                                        | `improve-codebase-architecture` (.agents), `codebase-design` (.agents)                                                                                                                                         | —                                                                                                  |
| B   | Architecture & module boundaries     | `improve-codebase-architecture` (.agents)                                                                      | `engineering:architecture` (write ADRs for decisions found), `engineering:system-design` (backend/banking/MCP service boundaries)                                                                              | —                                                                                                  |
| C   | Correctness / bug hunt               | `code-review` (built-in, `high`, path targets per package)                                                     | `engineering:code-review` (security/perf lens), `superpowers:systematic-debugging` only for confirmed bugs                                                                                                     | `security-review` and `simplify` only look at the pending diff — not useful for a whole-repo audit |
| D   | Security                             | `engineering:code-review` (security lens over auth, MCP token verifier, banking adapters, backend controllers) | `workos:workos` (verify AuthKit integration is correct)                                                                                                                                                        | —                                                                                                  |
| E   | Performance & optimisation           | `engineering:code-review` (perf lens)                                                                          | `searchfit-seo:technical-seo` (Core Web Vitals / bundle for marketing + web), `run` + built-in browser for real measurements                                                                                   | —                                                                                                  |
| F   | Test quality & coverage              | `engineering:testing-strategy`                                                                                 | `superpowers:test-driven-development` (for remediation)                                                                                                                                                        | —                                                                                                  |
| G   | Stubs, mocks, unfinished features    | `engineering:tech-debt` + targeted greps (§3.G)                                                                | `docs/pages_and_features.md` / `app_functionality.md` as the "promised" list                                                                                                                                   | —                                                                                                  |
| H   | Design-system & token compliance     | `design:design-system` (hardcoded values, naming, variants)                                                    | `design-skills:design-systems` (governance, hierarchy), `frontend-design:frontend-design` (visual direction)                                                                                                   | —                                                                                                  |
| I   | UX heuristics & flows                | `design-skills:design-critique` (heuristics, IA, excise)                                                       | `design:design-critique` (hierarchy/consistency on screenshots), `design-skills:journey-mapping` (onboarding, connect-bank, first budget), `design-skills:interaction-design` (states, errors, loading, empty) | `ux-research`, `ux-strategy`, `design-ops` — research/process, not audit                           |
| J   | Accessibility                        | `design-skills:accessibility-audit` (WCAG **2.2**)                                                             | Storybook `addon-a11y` run, keyboard + screen-reader pass in built-in browser                                                                                                                                  | `design:accessibility-review` targets WCAG 2.1 — use 2.2 skill instead                             |
| K   | Data visualisation (charts)          | `dataviz`                                                                                                      | `design-skills:accessibility-audit` (chart a11y: non-colour encodings, text alternatives)                                                                                                                      | —                                                                                                  |
| L   | Copy & microcopy                     | `design-skills:ux-writing`                                                                                     | `design:ux-copy` (individual strings), i18n completeness check                                                                                                                                                 | —                                                                                                  |
| M   | Marketing site SEO                   | `searchfit-seo:seo-audit`                                                                                      | `technical-seo`, `schema-markup`, `broken-links`, `internal-linking`                                                                                                                                           | content-creation SEO skills — out of scope                                                         |
| N   | Infra, CI, release, Docker           | `engineering:deploy-checklist`                                                                                 | `railway:use-railway` (if deployed on Railway), `claude-code-setup:claude-automation-recommender` (hooks to enforce AGENTS.md laws)                                                                            | —                                                                                                  |
| —   | Running the app for visual review    | `run` + `anthropic-skills:built-in-browser`                                                                    | —                                                                                                                                                                                                              | —                                                                                                  |
| —   | Turning findings into work           | `to-tickets` (.agents) or `superpowers:writing-plans`                                                          | `engineering:architecture` for ADRs                                                                                                                                                                            | —                                                                                                  |

### 0b. Project skills from Matt Pocock (`.agents/skills`)

These are installed in the repo and sit alongside the plugin skills above. They are used **in addition to** the primary skill for the track, not instead of it.

| Skill                                               | Used in       | How                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code-review` (project version)                     | C, H, N       | Its "Standards" axis checks code against the repo's documented rules. Run it with `AGENTS.md`, `docs/agents/component-guidelines.md` and `docs/copy-style-guide.md` as the standard, to confirm the Phase 1 law violations. Its "Spec" axis can compare shipped features with `docs/pages_and_features.md` for Track G. Note that the project version and the built-in `code-review` share a name, so call it as the project skill |
| `improve-codebase-architecture`                     | B             | Primary skill for the architecture track: finds shallow modules and deepening opportunities (the 2,198-line `TaxContainer`, flat backend `src/`, duplicated banking providers)                                                                                                                                                                                                                                                     |
| `codebase-design`                                   | A, B          | Shared vocabulary (deep modules, seams, testability) for describing findings consistently                                                                                                                                                                                                                                                                                                                                          |
| `setup-ts-deep-modules`                             | B, N          | Enforces package boundaries with dependency-cruiser, so `apps/*` can only reach packages through their entry points. Proposed in the audit, not applied                                                                                                                                                                                                                                                                            |
| `domain-modeling`                                   | B, L          | Checks `GLOSSARY.md` against real usage, spots terminology drift between code, copy and docs, and records ADRs for decisions the audit surfaces                                                                                                                                                                                                                                                                                    |
| `diagnosing-bugs`                                   | C, E          | Used only on findings that are confirmed bugs or measured slowness (for example the `deleteAccount` ordering, any wrong tax result) to find the real cause before the fix is planned                                                                                                                                                                                                                                               |
| `research`                                          | C, D          | Checks facts against primary sources: current UK tax bands, NI, student-loan and pension thresholds for `finance-engine`, plus WorkOS and Plaid verification requirements. Output is captured as Markdown in the repo                                                                                                                                                                                                              |
| `migrate-to-shoehorn`                               | F             | Candidate for tests that use `as` assertions to build partial data. Audit only counts them; the migration is a remediation ticket                                                                                                                                                                                                                                                                                                  |
| `tdd`                                               | Remediation   | Not an audit step. Fixes for P0/P1 findings should be test-first (write the failing test for the auth bypass or IDOR, then fix)                                                                                                                                                                                                                                                                                                    |
| `setup-pre-commit` and `git-guardrails-claude-code` | N             | Compare against the existing Husky and lint-staged setup, and decide whether to add the hooks that enforce AGENTS.md laws                                                                                                                                                                                                                                                                                                          |
| `frontend-design` (project copy)                    | H, I          | Visual-direction lens when judging whether screens look intentional or templated. A copy also exists as a plugin skill                                                                                                                                                                                                                                                                                                             |
| `setup-matt-pocock-skills`                          | Phase 3       | `docs/agents/issue-tracker.md` and `triage-labels.md` already exist, so it should be configured. The synthesis step reads them before writing tickets                                                                                                                                                                                                                                                                              |
| `to-spec`, `to-tickets`, `wayfinder`                | Phase 3       | `to-tickets` turns epics into tickets with blocking edges. `wayfinder` fits the very large epics (auth rework, migrating `apps/web` onto `packages/ui`) that need a decision map before work starts                                                                                                                                                                                                                                |
| `grill-with-docs`                                   | After Phase 3 | Interview-style session on the open decisions the audit raises (for example: relax the design-system laws for web, or migrate), recording ADRs as it goes                                                                                                                                                                                                                                                                          |
| `triage` and `retro`                                | After Phase 3 | `triage` moves the new tickets through the label workflow. `retro` reviews how the audit itself went                                                                                                                                                                                                                                                                                                                               |

Not used: `chief-of-staff` (the workflow tool already handles orchestration), `grill-me`, `handoff`, `claude-handoff`, `implement`, `implement-spec` (remediation only), and the writing, teaching and scaffolding skills.

---

## 1. Phase 0 — Baseline (do first, ~1 session)

Capture the current state so every later finding has a reference point.

- [ ] Run the four CI gates and record results verbatim: `bun run lint`, `bun run check-types`, `bun run test`, `bun run build`.
- [ ] `bun run test:coverage` — record per-package line/branch coverage.
- [ ] `bun run test:storybook` — record a11y violations and failing `play()` tests.
- [ ] Production bundle sizes: `apps/web` and `apps/marketing` client output (`dist/client`), largest chunks.
- [ ] Dependency health: `bun outdated`, `bun audit` (or equivalent), Renovate open PRs, duplicate deps (e.g. `react-icons` in two apps, **`@emotion/react` alongside Panda CSS in `apps/web`**).
- [ ] Lighthouse (mobile + desktop) on marketing home, web dashboard, one simulator page.
- [ ] Inventory: list every route in `apps/web/app/routes`, every component in `packages/ui`, every backend controller.

**Output:** `docs/audit/00-baseline.md`

### Early signals from a quick scan (to be verified, not findings yet)

- ~111 `.tsx` files in `apps/web/app/components` + `containers` are **flat files**, not colocated `Name/Name.tsx` dirs (Law §1).
- ~74 non-test source files contain hex literals (Law §2 — may include legitimate token definitions; needs triage).
- `@emotion/react` is still imported in `apps/web` (3 files) — second styling system next to Panda.
- `apps/mobile-companion/src/api/client.ts` uses a hardcoded `mock-session-token` and in-memory mock data fallback; several mobile screens heavy on placeholders.
- Stub/mock markers also in `packages/banking` (Plaid adapter, orchestrator), `packages/mcp/src/auth/token-verifier.ts`, budget/accounts/tax/onboarding routes and dialogs.

---

## 2. Phase 1 — Automated sweeps (cheap, broad)

Mechanical checks that feed every later track. Each produces a file list, not opinions.

| Check                         | How                                                                                                                                                                 | Feeds |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Flat component files (Law §1) | find `.tsx` not in a same-named dir under `packages/ui`, `apps/web/app/{components,containers,features}`, `apps/marketing/src/{components,pages}`                   | H     |
| Missing colocated files       | for each component dir, check `.styles.ts`, `.stories.tsx`, `.test.tsx`, `index.ts`                                                                                 | F, H  |
| Raw hex / rgb / hsl           | grep `#[0-9a-f]{3,8}`, `rgb(`, `hsl(` outside token/preset files                                                                                                    | H     |
| Primitive token leaks         | grep `(indigo                                                                                                                                                       | slate | success | purple | cyan | gray | …)\.\d{2,3}` outside presets | H               |
| Inline style soup             | grep `style={{`, `css({` with >3 props inside `.tsx`                                                                                                                | H     |
| Tabular nums                  | currency/percent/date render sites missing `tabular-nums`                                                                                                           | H, L  |
| Number formatting             | `Intl.NumberFormat(` without `'en-GB'`, `toFixed(` on money, manual `£` concatenation                                                                               | C, L  |
| Layout laws                   | `/debt /mortgage /pension /forecast` use `SimulatorSplitLayout`; KPI rows use `KpiStrip` (≤4); sliders use `SliderField`; tables >8 rows inside `CollapsibleDrawer` | I     |
| Debt markers                  | `TODO                                                                                                                                                               | FIXME | HACK    | XXX    | mock | stub | placeholder                  | not implemented | coming soon | lorem` in non-test code | G   |
| Dead code                     | unused exports/files (e.g. `knip`), unused deps                                                                                                                     | A     |
| Type escape hatches           | `any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, non-null `!`                                                                                              | C     |
| Lint suppressions             | `biome-ignore` count per package                                                                                                                                    | A     |
| Console / debug               | `console.log`, `debugger` in non-test code                                                                                                                          | A     |
| Hardcoded URLs/secrets        | `localhost`, `http://`, API keys, tokens in source                                                                                                                  | D     |
| Hardcoded strings             | user-visible JSX text not going through `react-i18next` in `apps/web`                                                                                               | L     |

**Output:** `docs/audit/01-sweeps.md` (counts + file lists per check)

---

## 3. Phase 2 — Deep audit tracks

Each track: run the named skill against the stated scope, use Phase 1 data as input, write findings in the format in §5.

### A. Tech debt — `engineering:tech-debt`

Scope: whole repo.

- [ ] Categorise debt: code, architecture, test, dependency, documentation, infra.
- [ ] Two styling systems (Emotion + Panda) — migration cost.
- [ ] Legacy flat `apps/web/app/components/*` vs new `features/*` structure — migration path.
- [ ] Duplicate logic between `apps/web`, `apps/mobile-companion`, `packages/finance-engine` (calculations reimplemented in UI?).
- [ ] Stale docs: `AGENT_IMPLEMENTATION_BLUEPRINT.md`, `pages_and_features.md`, `GLOSSARY.md`, `.cursorrules` vs `AGENTS.md` drift.
- [ ] Score each item: impact × effort × risk → priority.

Output: `docs/audit/A-tech-debt.md`

### B. Architecture — `improve-codebase-architecture`, `engineering:architecture`

- [ ] Package boundaries: does `apps/*` reach into package internals instead of public exports?
- [ ] `finance-engine` purity: no I/O, deterministic, fully unit-tested.
- [ ] `banking` adapter pattern: provider abstraction, error model, retries, idempotency.
- [ ] `mcp` package + `backend/mcp.controller`: tool schemas, auth, versioning.
- [ ] Backend (NestJS 12 + TypeORM): module layout (most controllers sit flat in `src/`), DTO validation, entity design, migrations strategy.
- [ ] Web data flow: loaders/actions vs client fetching, `state/` vs `context/` vs hooks overlap.
- [ ] Shallow vs deep modules; candidates to consolidate.
- [ ] Write ADRs for any decision that needs ratifying (e.g. "Panda only", "features/ structure").

Output: `docs/audit/B-architecture.md` + `docs/adr/*`

### C. Correctness — built-in `code-review` at `high`, one run per package

Order by risk: `finance-engine` → `banking` → `backend` → `mcp` → `apps/web` → `packages/ui` → `marketing` → `mobile-companion`.

- [ ] Financial maths: rounding (pennies as integers?), floating-point money, UK tax-year boundaries, tax band tables up to date, compounding, amortisation edge cases (0% rate, 0 term, overpayments).
- [ ] Date/timezone handling.
- [ ] Error handling: unhandled promise rejections, swallowed errors, missing error boundaries in routes.
- [ ] Race conditions in loaders/effects; stale closures.

Output: `docs/audit/C-correctness.md`

### D. Security — `engineering:code-review` (security lens), `workos:workos`

- [ ] AuthKit / WorkOS integration: session handling (`session.server.ts`), callback routes (`auth.callback.tsx` _and_ `callback.tsx` — why two?), logout, CSRF.
- [ ] Backend authZ: every controller enforces user scoping (no IDOR on accounts/budgets/profile).
- [ ] MCP token verifier: real verification vs stub.
- [ ] Banking: credential/token storage, Plaid secrets, webhook signature verification.
- [ ] Input validation on all endpoints (DTOs / zod).
- [ ] Secrets in repo, Dockerfiles, `docker-compose.yml`, CI logs.
- [ ] Headers: CSP, HSTS, cookie flags on Express servers (marketing SSR, web).
- [ ] `bun audit` results triaged.

Output: `docs/audit/D-security.md`

### E. Performance & optimisation — `engineering:code-review` (perf), `searchfit-seo:technical-seo`

- [ ] Bundle: largest chunks, route-level code splitting, `react-icons` import style (tree-shaking), Emotion runtime cost.
- [ ] React: unnecessary re-renders in simulators (slider drag → full chart recompute?), memoisation of finance-engine calls, large lists without virtualisation.
- [ ] SSR: marketing hydration cost, web streaming.
- [ ] Backend: N+1 TypeORM queries, missing indexes, unpaginated endpoints.
- [ ] Turbo cache config, Docker image size and layer caching, CI duration.
- [ ] Core Web Vitals measured in the built-in browser (LCP, INP, CLS).

Output: `docs/audit/E-performance.md`

### F. Tests — `engineering:testing-strategy`

- [ ] Coverage gaps by package vs risk (finance-engine and banking should be near-100%).
- [ ] Components missing `.test.tsx` / `.stories.tsx` / `play()`.
- [ ] Test quality: assertion-free tests, snapshot-only tests, over-mocking, tests that just check render.
- [ ] Missing layers: contract tests between web ↔ backend, E2E for critical journeys (sign-up → onboarding → connect bank → budget).
- [ ] Storybook light + dark coverage (Law §4.2).

Output: `docs/audit/F-tests.md`

### G. Stubs, mocks, unfinished functionality — `engineering:tech-debt` + sweeps

- [ ] Cross-reference `docs/pages_and_features.md` and `docs/app_functionality.md` against what is actually wired end-to-end.
- [ ] For each route: is data real (backend) or hardcoded/mocked? Do buttons do anything?
- [ ] Mobile companion: mock token, in-memory fallback, placeholder screens.
- [ ] Banking adapters: which providers are real vs stubbed.
- [ ] `sandbox` feature / routes — dev-only? Exposed in prod?
- [ ] Classify each: _ship-blocking_, _hide behind flag_, _delete_.

Output: `docs/audit/G-unfinished.md` (table: feature · location · state · recommended action)

### H. Design system & tokens — `design:design-system`, `design-skills:design-systems`

Scope: `packages/ui` (tokens, preset, primitives, patterns, calculators) then consumers.

- [ ] Token architecture: primitives → 6 semantic namespaces; any gaps forcing devs to reach for hex?
- [ ] Component inventory: duplicates between `packages/ui` and `apps/web/app/components` (e.g. multiple dialog/card/table implementations).
- [ ] Variant/prop API consistency (`size`, `variant`, `tone` naming).
- [ ] Every Phase 1 law violation triaged.
- [ ] Dark mode parity of every token.
- [ ] Storybook docs completeness.

Output: `docs/audit/H-design-system.md`

### I. UX & interaction — `design-skills:design-critique`, `design:design-critique`, `design-skills:interaction-design`, `design-skills:journey-mapping`

Method: launch with `run`, screenshot every route in the built-in browser at 375 / 768 / 1440 widths, light + dark.

- [ ] Nielsen heuristics per page; information hierarchy; excise (unneeded steps).
- [ ] Journey maps: first-run (marketing → sign-up → onboarding → connect bank → first insight), monthly budget review, scenario simulation.
- [ ] Every interactive component's states: default, hover, focus, active, disabled, loading, empty, error, success.
- [ ] Progressive disclosure laws (§3 of AGENTS.md) applied on every page.
- [ ] Navigation/IA consistency between web and mobile companion.
- [ ] Forms: validation timing, error placement, recovery.

Output: `docs/audit/I-ux.md` (with screenshots)

### J. Accessibility — `design-skills:accessibility-audit` (WCAG 2.2 AA)

- [ ] Automated: Storybook a11y addon across all stories, axe on every route (light + dark).
- [ ] Keyboard-only walkthrough of each journey: focus order, visible focus (`border.focusRing`), traps in Radix dialogs, skip links.
- [ ] Screen reader semantics: landmarks, headings, labels on sliders/value pills, live regions for recalculated results.
- [ ] Contrast for all semantic token pairs in both themes (incl. `status.*` and `chart.*`).
- [ ] Target size ≥ 24×24 (2.2 SC 2.5.8), dragging alternatives for sliders (SC 2.5.7), focus not obscured (SC 2.4.11).
- [ ] Reduced motion, zoom to 400% / reflow.
- [ ] Mobile companion: accessibilityLabel/role coverage.

Output: `docs/audit/J-accessibility.md`

### K. Data visualisation — `dataviz`

- [ ] Chart type fit per insight (forecast, debt payoff, budget split, pension).
- [ ] Palette uses `chart.*` tokens only, distinguishable in both themes and for colour-blindness.
- [ ] Axis/number formatting en-GB + tabular nums; tooltips; legends.
- [ ] Chart text alternatives / data tables.

Output: `docs/audit/K-dataviz.md`

### L. Copy & content — `design-skills:ux-writing`, `design:ux-copy`

- [ ] Audit against `docs/copy-style-guide.md` and `GLOSSARY.md` (consistent terms).
- [ ] Buttons, errors, empty states, onboarding, financial disclaimers.
- [ ] i18n: hardcoded strings, missing keys, pluralisation.
- [ ] Reading level for financial explanations.

Output: `docs/audit/L-copy.md`

### M. Marketing & SEO — `searchfit-seo:seo-audit` (+ `technical-seo`, `schema-markup`, `broken-links`, `internal-linking`)

- [ ] Meta/OG per page (react-helmet-async), canonical, sitemap, robots.
- [ ] Structured data (Organization, SoftwareApplication, FAQ).
- [ ] Broken links, orphan pages, `tools/$slug` indexability.
- [ ] SSR correctness (content present without JS).

Output: `docs/audit/M-marketing-seo.md`

### N. Infra, CI & DX — `engineering:deploy-checklist`, `claude-code-setup:claude-automation-recommender`

- [ ] `ci-pipeline.yml`: runs all four gates? caching? coverage thresholds? Storybook a11y gate?
- [ ] Dockerfiles: multi-stage, non-root, image size, healthchecks.
- [ ] Release-please + Renovate config sanity.
- [ ] Env var documentation and validation at boot.
- [ ] Husky/lint-staged coverage.
- [ ] Automation to _enforce_ AGENTS.md laws (Biome rules, custom lint, CI scripts for colocated structure / hex / tabular-nums) so the audit doesn't need repeating.

Output: `docs/audit/N-infra.md`

---

## 4. Phase 3 — Synthesis & triage

- [ ] Merge all track findings into `docs/audit/SUMMARY.md`: top 10 risks, quick wins (<1h), themes.
- [ ] De-duplicate (e.g. a hex value found by H and K).
- [ ] Prioritise with the rubric below; group into epics (e.g. "Emotion → Panda migration", "Colocate legacy components", "Wire real data to mobile").
- [ ] Convert to tickets with `to-tickets` (labels per `docs/agents/triage-labels.md`) or remediation plans with `superpowers:writing-plans`.
- [ ] Write ADRs for structural decisions.

## 5. Finding format & severity

Every finding, in every track file:

```
### [TRACK-NN] Short title
- Severity: P0 | P1 | P2 | P3
- Location: path/to/file.tsx:42 (or list)
- Evidence: what was observed (command output, screenshot, snippet)
- Impact: user / security / maintainability consequence
- Recommendation: concrete fix
- Effort: S (<1h) | M (<1d) | L (multi-day)
```

| Severity | Meaning                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| P0       | Security hole, wrong financial result, data loss, WCAG A blocker, broken core journey                            |
| P1       | AGENTS.md law violation on a core page, WCAG AA failure, significant perf issue, mocked feature exposed to users |
| P2       | Inconsistency, missing tests/stories, moderate debt                                                              |
| P3       | Polish, nice-to-have                                                                                             |

## 6. Execution

- **Order:** Phase 0 → Phase 1 → tracks in risk order **C, D, G, J, H, F, B, A, E, I, K, L, M, N** → Phase 3.
- **Read-only:** the audit changes no product code; findings only. Remediation happens afterwards, with the CI pre-flight (AGENTS.md §5) on each PR.
- **Parallelism:** tracks C–N are independent once Phase 0/1 exist. They can be run one per session, or fanned out as a multi-agent workflow (ask explicitly for a workflow — it's token-heavy; ~14 tracks ≈ 14+ agents plus a verification pass).
- **Verification:** each P0/P1 should be re-checked (reproduced or confirmed in code) before it lands in the summary, to keep false positives out.
