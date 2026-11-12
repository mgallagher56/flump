# E15. Visual fidelity, styling and UX elevation: plan draft

Status: **draft, nothing implemented.** Read-only planning output. Grounded in `main` at `e4ff6c3`. The planner's worktree is on `ci-release-please-token` at `f5d05b0`, which is behind main, so every code citation below was read with `git show main:<path>`. Audit inputs: `docs/audit/{EPICS,SUMMARY,SEQUENCE}.md`, tracks H, I, J, K, L, M, `plans/{DECISIONS,E5-plan-draft,E8-plan-draft,E8-web-ledger,E2-web-ledger,E11-ledger,E7-ledger}.md`, and the E12 plan, which sits only in `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/docs/audit/plans/E12-mobile-rebuild-plan.md`.

## Epic header (EPICS.md format)

- **Severity:** P2 for product quality. Parts of it close open P1/P2 audit items: I-09, I-11, I-12, I-14, K-01 to K-12, L-01, L-05 to L-13, H-04 to H-06, H-11, H-12.
- **Blocked by:** the E8 web sweeps merge (branch `claude/e8-web-sweeps-8f92e9`, 139 files, not on main) for every web-touching task; the E9 adopt-or-relax decision (D3 below) for Phase 3; and the owner's direction decision (D1) for Phases 1 to 7.
- **Done when:** see "Definition of done" at the end. In short: one chosen visual direction, expressed only through `packages/ui` tokens and components; every key screen rebuilt on them, owner-approved in light and dark at 375 and 1280 px; zero axe violations in the gated stories; measured improvement against the Phase 0 baseline; and regression guards (visual snapshots plus ratchets) in CI.
- **Labels:** needs-triage until D1 to D4 are decided. Then Phase 0 is ready-for-agent, Phase 1+ is ready-for-agent per task, and owner review is ready-for-human.

## 1. Goals and non-goals

**Goals**
1. Pick one deliberate visual direction from 2 to 3 concrete options, chosen by the owner after seeing real screens with real content. Not a reskin by default.
2. Make `packages/ui` the only source of visual truth. This means tokens for type, spacing, radius, elevation, motion, data-viz, icons and density, plus the components built on them, so the web, marketing and E12 mobile apps inherit one system.
3. Rebuild the key screens in priority order on that system, applying the layout laws (KpiStrip, SimulatorSplitLayout, SliderField, CollapsibleDrawer) where they are still missing (I-09).
4. Better UX on the main journeys: first run to first insight, monthly review, debt plan, mortgage decision, tax check. Clear state coverage (loading, empty, error, success) and plain en-GB finance copy.
5. Prevent regression: visual snapshots of components and page templates, design-law ratchets, Panda strictness.

**Non-goals**
- New product features, or deciding which features stay. That is E16; E15 only presents what E16 keeps.
- Backend or API changes. Exception: none expected. If a screen needs data that does not exist, file it to E16 or E6.
- Changing financial maths (E4) or auth (E1).
- Building the mobile app (E12). E15 hands E12 tokens and a component spec only.
- i18n infrastructure (E14 / L-12). E15 assumes en-GB-only copy unless D13 says otherwise.
- Billing, pricing values or legal and regulatory wording. The owner supplies those (DECISIONS.md, E7 rows).
- A pixel-perfect design-tool (Figma) source of truth. Mockups are HTML or Storybook, because agents can produce and verify those.

## 2. What already exists

**Tokens and primitives (on main)**
- `packages/ui/src/tokens/index.ts:171-280` already defines the six semantic colour namespaces with dark values.
  - `primary.solid` exists (`:176`, from E8 D1).
  - `border.input` is set to the E8 D2 values (`:207`).
  - Danger solid is 600 in dark (`:229`).
  - The `chart.*` roles are at `:246-259`.
- What does not exist:
  - **No motion, line-height, letter-spacing, font-weight, z-index, sizes, textStyles or layerStyles tokens.**
  - `fontSizes` (`:113-124`) is a plain Tailwind-like scale.
  - The primitive shadows `xs`, `cardLight`, `cardHoverLight` and `floatingLight` have no dark variant (`:155-168`; H-07).
- `packages/ui/panda.preset.ts:1-18` registers only colours, fonts, fontSizes, spacing, radii and shadows, via `theme.extend`.
- `apps/web/panda.config.ts` still loads `@pandacss/preset-panda`, so the stock palette leaks in (H-15). `strictTokens` is off.
- `packages/ui/src` primitives: Button, Card, CollapsibleDrawer, KpiCard, LiveRegion, ProgressBar, SegmentedTabs, SliderField, StatusBadge, Table, VisuallyHidden.
- Patterns: AllowanceProgressPill, AppSectionDivider, ChartFigure, DebtToWealthChart (static picture, K-04), EmptyState, GlobalBaselineBar, KpiStrip, PageHeader, SectionBand, SimulatorSplitLayout, TaxTrapEscapeBanner.
- Foundations stories: ColorPalette, SpacingAndRadii, TypographyScale.
- Seven calculators carry about 200 inline `style={{` (H-11).
- Missing from ui: Dialog, Input, Select, Checkbox, Text/Heading, Money, Tooltip, Toast, Skeleton, Icon, and nav and shell.

**Web app reality**
- `apps/web` uses `@repo/ui` layout laws in only 2 files (`features/sandbox/.../SandboxTemplates.tsx`, `features/debt/.../PayoffStrategyControls.tsx`). There are 144 files referencing `FLP*`.
- About 95% of components are flat. The giant files:

| File | Lines |
|---|---|
| `containers/tax/TaxContainer.tsx` | 2,198 |
| `components/budget/UserProfilePanel.tsx` | 1,348 |
| `components/budget/RunwayCalculator.tsx` | 1,236 |
| `containers/mortgage/MortgageContainer.tsx` | 1,225 |
| `routes/app.onboarding.tsx` | 1,226 |
| `components/pension/PensionForecasterCard.tsx` | 1,180 |
| `components/budget/BudgetDashboard.tsx` | 1,012 |

- Two icon sets are mixed: `react-icons/fa` (58 imports) and `react-icons/fi` (40 imports).
- Fonts load from Google Fonts at `apps/web/app/root.tsx:22-26` and `apps/marketing/index.html:9-12`. The Storybook head (`apps/web/.storybook/preview-head.html:3`) also loads Poppins and other weights, so Storybook does not match the app.
- Base type is hand-written in `apps/web/app/index.css:74-120`. There is a global reduced-motion backstop at `:137-146`, and `#6363f1` fallbacks in the checkbox CSS at `:16-63`.
- Charts use hex literals and an incomplete theme helper (`apps/web/app/components/charts/chartTheme.ts`; K-01, K-06, K-07).
- There are 81 `.stories.tsx` files. Storybook 10 lives only in `apps/web/.storybook` and also collects ui and marketing stories (`main.ts` stories globs). `@storybook/addon-vitest`, `addon-a11y` and `@chromatic-com/storybook` are installed. The preview defaults to side-by-side themes (`preview.tsx:27`) and has hex backgrounds (`:61-71`).
- DOM snapshot tests exist (`components/__snapshots__`, `containers/__snapshots__`, `navigation/__snapshots__`). They will churn on every restyle.

**Completed epics E15 builds on**
- **E2 (done on main):** no fabricated figures; honest empty states; debts persisted as accounts; liabilities displayed positive. The E2 web ledger's open follow-ups (`ForecastContainer || 500`, `PensionWidget || 65`, the remaining 5/3/45000 fallbacks) are visible on E15 screens. E15 must not restyle around them: route them to E2 follow-up tickets or fix them inside the screen task with a test.
- **E5 (done):** `RouteErrorBoundary`, `RouteErrorState` and `ConfirmDialog` exist in `apps/web/app/features/feedback/components/*`. `apiFetch` and honest loader failures are done.
- **E7 (done on marketing):** the claims guard is `apps/marketing/src/claims.test.ts`; pricing uses a placeholder price.
- **E11 (done):** `check:laws` = `scripts/check-design-tokens.ts` + `scripts/check-tabular-nums.ts`, with baselines `scripts/design-token-baseline.json` and `scripts/tabular-baseline.txt`, wired into the lint job (`.github/workflows/ci-pipeline.yml:55-56`). Coverage floors are per workspace. There is no branch protection (DECISIONS D7). **Railway "Wait for CI" with `checkSuites: true` is the one enforced gate**, so any new CI job that flakes on `main` blocks deploys (see risk R6).

**In flight or pending**
- **E8 web sweeps:** branch `claude/e8-web-sweeps-8f92e9`, unmerged. It covers form-field a11y, the primary.solid sweep, focus and scroll CSS, landmarks, ChartFigure adoption in 9 charts, live regions, icon-button labels, and T35 status text tokens. The Storybook a11y gate (T31-T34: Vitest browser project with `@vitest/browser-playwright`, single theme under test, a11y `error`) was "delegated" and is not on main. E15 web work must start after that branch merges. Its gate is the base for the E15 visual-regression job.
- **E9:** the adopt-or-relax decision is still open. EPICS.md: "Decide first whether web adopts packages/ui or the laws are relaxed for web". It was never in SEQUENCE.md or DECISIONS.md.
- **E4 consumer tasks** (T10 `_index.tsx`, T11b DebtWidget/PayoffStrategySwitcher, T15a MortgageWidget/MortgageContainer) touch dashboard, debt and mortgage files. Check E4's state before Phase 3 starts on those screens.
- **E12 mobile rebuild plan** (worktree copy above): parity "by design spec, not shared code". It plans to move the tokens to a new `packages/tokens` (`@flump/tokens`, task T1.15) with a native generator. This changes where Phase 1 edits land.
- **E14** (copy, i18n and data-viz polish) and **E10** (Emotion removal, H-10) overlap Phases 4, 5 and 1.

## 3. Dependencies and sequencing

| Epic | Relation to E15 | Rule |
|---|---|---|
| E2, E5 | Done; E15 builds on them | Screen tasks keep the honest empty and error states and the existing tests (`routes/loaders.honest.test.ts`, `ConfirmDialog` usage). Mockups and stories label sample data "Sample data", per E2 D2. |
| E8 web sweeps | Same files as nearly every Phase 3 task | **Merge E8 web sweeps before any E15 task that edits `apps/web/app`.** Phases 0 to 2 (discovery, tokens, ui components) can start now. |
| E8 Storybook gate (T31-T34) | The Phase 8 visual job reuses its browser project and single-theme preview | E15 T8.1 depends on E8 T32. If E8 T31-T34 stall, E15 T8.1 builds that plumbing itself (+M effort) to E8's spec, so it is built only once. |
| E9 | Phase 3 is the web adoption of packages/ui | **Recommend E15 absorbs E9's remaining scope for every screen it touches** ("touch each file once"). Redesigning on the FLP layer and inline styles would be throwaway work. Needs D3. H-01 (invalid token names) stays an immediate E9 fix if still open. |
| E16 (functionality review, sibling) | Decides which screens and widgets exist, the IA, and flows | See below. |
| E12 mobile | Inherits the system | E15 Phase 1 token names must be stable before E12 builds screens. Coordinate T1.15: either E12 extracts `@flump/tokens` first and E15 edits there, or E15 Phase 1 lands first and E12 moves the result. **Recommendation: E15 Phase 1 lands first and E12 T1.15 moves it.** E15 adds a native-friendly component spec (T2.14) because E12 does not import `@repo/ui`. New token categories (motion, textStyles, elevation) must be resolvable by E12's generator, so keep them plain values with no Panda-only syntax in the raw token objects. |
| E4 | File overlap on dashboard, debt, mortgage and tax | Phase 3 tasks on those screens rebase after E4 T10, T11b, T15a, or merge into one session. |
| E10 | Emotion removal | Do H-10 (S) before Phase 3, so the SSR path has a single styling system. |
| E14 | Data-viz and copy polish | E15 absorbs K-* and L-* items on screens it redesigns. E14 keeps i18n (L-12) and anything left over. |
| E6 | Bank connect scope | The onboarding "connect bank" step and ConnectBankWizard visuals depend on E6's scope decision. Until then, design the manual path first. |

**E15 and E16: which goes first.** Recommendation: **run E15 Phase 0 and E16 discovery together, with E16's scope verdicts gating E15 Phase 3 screen by screen.**
- Do one walkthrough with one persona dataset and one screenshot set, viewed through two lenses: UX and visual (E15), and functional value and correctness (E16). Journey maps are shared.
- E16 findings that must come before E15: feature keep, cut or merge (Savings vs Forecast overlap, Runway calculator inside Budget, the sandbox, tools pages, the dashboard widget set, budget actuals, the MCP card); IA and navigation (I-12); onboarding flow content (bank step, E6).
- E15 findings that must come before E16: none blocking. E15's heuristic issues feed E16's backlog.
- E15 Phases 1 and 2 (tokens, components) do not depend on E16 and should not wait.
- If E16 has not started when Phase 3 is ready, begin with scope-stable surfaces: the app shell and error/empty states (T3.0, T3.11), then the mortgage pilot (D4).

**Recommended order**
1. Phase 0 (with E16 discovery), alongside the E8 web sweeps merge.
2. Owner decisions D1 to D4.
3. Phase 1.
4. Phase 5a: glossary and copy patterns. Small, but needed before screen copy.
5. Phase 2.
6. Phase 8a: visual-regression and ratchet plumbing, so Phase 3 has a guard from the first screen.
7. Phase 3 screens in priority order, each including its Phase 4 microinteractions, Phase 5b copy and Phase 6 responsive acceptance.
8. Phase 7 marketing, after copy sign-off.
9. Phase 8b: final hardening.

Phases 4, 5 and 6 also get a short cross-cutting task each, for shared pieces and the final sweep.

## 4. Phases and tasks

Conventions for every task:
- Colocated 5-file directories (Law 1), subject to D3 for feature-internal components.
- Semantic tokens only (Law 2), `tabular-nums` through the `Money`/numeric textStyle.
- Stories render in light and dark with zero a11y violations, plus `play()` for interactive states (Law 4).
- Register new directories in `packages/ui/src/tokens/architecture.laws.test.ts`.
- PR pre-flight (Law 5): `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`, plus `bun run check:laws` and `bun run test:storybook`.
- Ratchet baselines may only shrink.
- Model tier follows AGENTS.md section 6: sonnet for implementation and critique, haiku for capture, inventory and mechanical edits. No opus in execution.

Effort scale (subagent with one review loop): S = up to half a day, M = 1 to 2 days, L = 3 to 5 days. Anything bigger is split.

### Phase 0. Discovery and direction (about 7 to 9 agent-days plus 3 to 4 owner hours)

**T0.1 Review dataset and capture environment**
- Files/area: new dev-only script `scripts/dev/review-personas.ts` and its test; `docs/design/e15/README.md`.
- Personas:
  1. *New*: empty account, just signed up.
  2. *Typical*: £42k salary, 2 credit cards, mortgage, workplace pension, 8-category budget.
  3. *Complex*: Scottish taxpayer, £110k income (taper), BTL property, 12 budget categories, 5 debts, multiple pensions.
- Acceptance:
  - Refuses to run unless `NODE_ENV=development` and `AUTH_DEV_BYPASS=true` (one identity, `dev_user_123`, so `--persona` resets and reseeds that user).
  - Idempotent; never imported by app code; covered by `check:auth` and the E2 guard spec.
  - The README documents starting the stack and switching personas.
  - The `/sandbox` personas are reused for signed-out screens.
- Effort S. Depends on: none. Skill: none. Tests: bun test for the guard conditions. Model: sonnet.

**T0.2 Screenshot baseline**
- Files/area: `docs/design/e15/baseline/`, about 60 to 80 compressed PNGs plus an index.
- Coverage:
  - Signed-in routes for each persona where it matters: `/`, `/app/onboarding`, `/app/debt`, `/app/mortgage`, `/app/pension`, `/app/forecast`, `/app/savings`, `/app/tax`, `/app/budget`, `/app/accounts`, `/app/accounts/:id`, `/app/profile`.
  - Signed-out routes: `/sandbox`, `/tools`, `/tools/:slug`, error, 404, login error.
  - Marketing: home, pricing, security, MCP, tools.
  - Each at 375 and 1280 px, in light and dark.
- Uses the session's browser automation tools. Storybook MCP (`@storybook/addon-mcp`) is the fallback for component states.
- Acceptance: every image is named `route--persona--width--theme.png`; the index notes broken renders.
- Effort S to M. Depends on: T0.1. Skill: none. Model: haiku.

**T0.3 Heuristic design critique per screen**, 5 parallel subagents:
- (a) dashboard and shell/nav
- (b) onboarding, auth and errors
- (c) debt, mortgage
- (d) pension, forecast, savings, tax
- (e) budget, accounts, profile, marketing

- Files/area: `docs/design/e15/critique/<group>.md`.
- Acceptance:
  - Per screen: Nielsen 1-5 scores; hierarchy, density, consistency and state-coverage notes; the top 5 issues with screenshot references and severity.
  - States which I-, H-, J-, K- and L- audit findings are fixed by E2, E5 or E8 and which are still open.
  - Separates UX issues from visual issues, and flags functional findings for E16.
- Effort M total. Depends on: T0.2. Skill: design-critique, accessibility-audit (lens only). Model: sonnet.

**T0.4 Journey maps**
- Journeys:
  1. First run: marketing, sign-up, onboarding, first insight.
  2. Returning glance.
  3. Monthly review.
  4. Debt payoff plan.
  5. Mortgage overpay vs save decision.
  6. Tax-year check / Self Assessment estimate.
- Files/area: `docs/design/e15/journeys.md`, shared with E16.
- Acceptance: for each journey, stages, actions, thoughts, pain points, opportunities and the measured baseline (clicks, screens, server round trips and seconds to first meaningful number, using T0.1 personas).
- Effort M. Depends on: T0.2. Skill: journey-mapping, ux-strategy. Model: sonnet.

**T0.5 Competitor and pattern benchmark**
- Products:
  - UK money apps: Emma, Snoop, Moneyhub, Monzo/Starling insights.
  - Planners: YNAB, Monarch, Copilot, ProjectionLab, Boldin.
  - UK calculators: MoneyHelper, MoneySavingExpert.
- Public pages and published screenshots only; no sign-ups.
- Files/area: `docs/design/e15/benchmark.md`.
- Acceptance: covers the patterns for KPI header, net worth over time, simulator controls and outcome cards, empty states, onboarding length, data-viz styling, dark mode and density, each with "adopt / adapt / avoid" and a reason. No copied assets.
- Effort S to M. Depends on: none. Skill: ux-strategy, design-critique. Model: sonnet.

**T0.6 Synthesis: principles, problem list, IA proposal**
- Files/area: `docs/design/e15/synthesis.md`.
- Acceptance:
  - 4 to 6 design principles. Examples: "every number is traceable to your inputs", "show the next action", "calm by default, detail on demand".
  - A ranked problem list (impact x frequency).
  - An IA and navigation proposal built from one route manifest (`apps/web/app/utils/pageConfig.ts` `APP_PAGES`, I-12), co-signed with E16.
- Effort S. Depends on: T0.3, T0.4, T0.5. Skill: ux-strategy. Model: sonnet.

**T0.7 Three visual directions as mockups**
- Directions:
  - **A "Calm ledger"**: refined indigo, light-first, editorial typography, generous space, minimal chrome.
  - **B "Instrument panel"**: dark-first, dense, data-forward, mono or tabular numerals prominent, sharper radii.
  - **C "Warm guide"**: softer warm neutral palette, larger radii, friendly illustration slots, coach-style next-action cards.
- Each direction includes a token sketch: palette (primitives mapped to the existing semantic names), type pair and scale, radius, elevation, density, motion character, chart palette.
- Each is applied to the same 4 frames (dashboard, mortgage simulator, onboarding step, empty or error state) in light and dark, at 1280 and 375 px. Content is the Typical persona, labelled "Sample data".
- Format: standalone HTML files in `docs/design/e15/directions/{a,b,c}/` (no build, not shipped). Not Storybook yet; see D12.
- Acceptance:
  - Identical content across directions.
  - Every text/background pair listed with its computed contrast, AA or better in both themes.
  - A one-page rationale and trade-offs per direction (fit with principles, build cost, mobile fit).
- Effort L, about 1 day per direction, best as 3 parallel subagents then one consistency pass. Depends on: T0.6. Skill: design-elevation, frontend-design, design-systems. Model: sonnet.

**T0.8 Owner direction session and decision record**
- Files/area: append an E15 section to `docs/audit/plans/DECISIONS.md`.
- Acceptance: D1 (direction, including any hybrid notes), D2, D5, D6, D8 to D11 recorded.
- Effort S (owner time). Depends on: T0.7. Model: n/a.

**T0.9 Baseline metrics**
- Files/area: `docs/design/e15/metrics-baseline.md`, using the measurement section below.
- Acceptance:
  - Lighthouse (mobile) for `/sandbox`, `/tools`, marketing `/`, `/pricing`, and signed-in `/` and `/app/mortgage` on a local production build.
  - axe counts per route.
  - CSS stats from the built CSS (distinct colours, font sizes, shadows, radii).
  - `check:laws` counts.
  - Journey baselines from T0.4.
- Effort S. Depends on: T0.1. Model: haiku.

### Phase 1. Foundations in packages/ui (about 9 to 11 agent-days)

Edits land in `packages/ui/src/tokens/index.ts` and `packages/ui/panda.preset.ts`, or in `packages/tokens/*` if E12 T1.15 has already landed. All changes are additive to the six colour namespaces, with no renames. Any new colour key (for example `surface.scrim`, `chart.series6-8`) requires the owner to approve an edit to AGENTS.md section 2 and `docs/agents/component-guidelines.md` (same process as E8 D1).

**T1.1 Token architecture note and preset wiring**
- Files/area: `docs/design/e15/tokens.md`; `panda.preset.ts:5-16`, which gains `lineHeights`, `fontWeights`, `letterSpacings`, `durations`, `easings`, `zIndex`, `sizes`, `textStyles`, `layerStyles`, `keyframes`.
- Acceptance:
  - The `styled-system` output for the existing tokens is unchanged (diff check).
  - Raw token objects are plain values, so the E12 generator can read them.
  - The doc defines the prop vocabulary (`variant` is visual style, `tone` is semantic status, `size` is `sm|md|lg`) per H-06.
- Effort S. Depends on: D1. Skill: design-systems. Tests: extend `packages/ui/src/index.test.ts` to assert the preset exports. Model: sonnet.

**T1.2 Type scale, textStyles and font loading**
- Files/area:
  - `tokens/index.ts:101-124`: fonts and sizes.
  - New `textStyles`: display, heading.{xl,lg,md,sm}, body.{lg,md,sm}, label.{md,sm}, numeric.{kpi,lg,md,sm}. Numeric styles carry `fontVariantNumeric: tabular-nums`.
  - Replace `apps/web/app/index.css:74-120` and the marketing `index.css` heading rules with the textStyles.
  - Self-host the fonts (D5): remove the Google Fonts links at `root.tsx:22-26`, `apps/marketing/index.html:9-12` and `.storybook/preview-head.html:1-3` (drop Poppins).
- Acceptance:
  - Fluid clamp only on display and heading.xl.
  - 12 px minimum.
  - Line heights 1.2 to 1.6 by role.
  - `TypographyScale` foundation story updated in light and dark.
  - No layout shift from fonts (`font-display: swap` plus size-adjust fallback).
  - The CSP still passes (M-12).
- Effort M. Depends on: T1.1, D5. Skill: design-systems. Tests: story plus a unit test that every numeric textStyle sets tabular-nums. Model: sonnet.

**T1.3 Spacing, sizing, radius, density**
- Files/area: `tokens/index.ts:126-153`; add semantic sizes (control heights sm/md/lg, touch target 44); add a Panda condition `compact: '[data-density=compact] &'` (D9).
- Acceptance: the `SpacingAndRadii` story shows both densities; radius values follow the D1 direction.
- Effort S. Depends on: T1.1. Skill: design-systems. Model: sonnet.

**T1.4 Elevation, layering, scrim**
- Files/area: `tokens/index.ts:155-168` and `:261-280`.
- Acceptance:
  - Semantic shadows `xs`, `card`, `raised`, `overlay`, `focus`, all with `_dark`. Dark elevation comes from lighter surfaces plus hairline, not heavy black shadows.
  - A scrim token.
  - zIndex scale: base, sticky, header, dropdown, overlay, modal, toast.
  - Removes the H-07 parity gap.
  - A new `Elevation` foundation story.
- Effort S. Depends on: T1.1, owner approval for the scrim key. Skill: design-systems. Tests: extend `tokens.a11y.test.ts` with a parity assertion that iterates all semantic tokens. Model: sonnet.

**T1.5 Motion tokens and reduced-motion handling**
- Tokens:
  - Durations: instant 0, fast 120 ms, base 200 ms, slow 320 ms.
  - Easings: standard, enter, exit.
  - Keyframes: fadeIn, slideUp, scaleIn, shimmer.
- Rules:
  - All motion is authored under Panda's `_motionSafe` condition. The global block at `index.css:137-146` stays as a backstop.
  - Promote `usePrefersReducedMotion` (E8 T25, on the E8 branch) into `packages/ui` with `useChartAnimation()` (K-09).
- Acceptance:
  - A `Motion` foundation story with a reduced-motion toggle.
  - Under reduced motion, no transform or opacity animation runs and spinners pulse (E8 T25 behaviour).
- Effort S to M. Depends on: T1.1, E8 web sweeps merge (for the hook). Skill: interaction-design. Tests: hook unit test with mocked matchMedia (SSR default false); story `play()` under reduced-motion emulation. Model: sonnet.

**T1.6 Data-viz palette and chart styling spec**
- Files/area:
  - `tokens/index.ts:246-259`: may add `series6-8`, `projection`, `baseline`, `band` (owner approval for new keys).
  - `docs/design/data-viz.md`.
  - New `packages/ui/src/foundations/DataVizPalette/` story.
  - Framework-free helpers in `packages/ui/src/charts/` (or `patterns/ChartKit`): `chartColor(role)` returning `var(--colors-chart-*)`; `formatAxisCurrency` (compact, en-GB, K-07); legend, axis and grid specs.
- Spec rules:
  - Colour by entity, not outcome (K-03).
  - A legend for 2 or more series, plus a non-colour cue (K-02).
  - Gradients at most 0.15 opacity.
  - "Assumes X%" captions (K-11).
  - Donut capped at 6 categories plus "Other" (K-08).
  - Tooltip uses the numeric textStyle.
- Acceptance: every series is at least 3:1 against `surface.card` in both themes. A CVD test simulates deuteranopia, protanopia and tritanopia (Machado matrices) and asserts a minimum ΔE between adjacent series.
- Effort M. Depends on: T1.1, D1. Skill: design-systems (dataviz lens). Tests: palette contrast and CVD unit tests; story. Model: sonnet.

**T1.7 Iconography**
- Files/area: new `packages/ui/src/primitives/Icon/` (5 files) wrapping the chosen set (D6) with size tokens 16/20/24, a stroke width, `aria-hidden` by default, and a required `label` when standalone.
- Add a `check:laws` rule plus baseline for `react-icons/fa` and `react-icons/fi` imports. Call sites migrate per screen in Phase 3.
- Acceptance: an icon gallery story; a test that an Icon without `label` is `aria-hidden`.
- Effort S to M. Depends on: D6. Skill: design-systems. Model: sonnet.

**T1.8 Theme refinement, light and dark**
- Files/area: `tokens/index.ts:1-99` (primitives, per D1/D2) and `:171-243`.
- Acceptance:
  - Surface steps are distinguishable (canvas, card, overlay at least 1.1:1 luminance step in dark).
  - `text.muted` at least 4.5:1 on every surface.
  - Status `bg` and `text` pairs pass.
  - Theme set before paint with no flash. Check the inline theme script for the CSP nonce (M-12).
  - The `tokens.a11y.test.ts` matrix is extended to all text/surface, status and chart combinations in both themes.
  - `ColorPalette` story updated.
- Effort M. Depends on: T0.8. Skill: design-systems, accessibility-audit. Model: sonnet.

**T1.9 Panda strictness in packages/ui**
- Files/area: `packages/ui/panda.config.ts`. Drop `preset-panda` colours or set `strictTokens: true` (H-15, H-17). Verify the option names with context7 against Panda 2.5.
- Acceptance: the ui build fails on an unknown token (fixture test); ui stays green. Web strictness waits until after Phase 3 (T8.4).
- Effort S to M (expect a burst of fixes in the calculators). Depends on: T1.1. Model: sonnet.

**T1.10 Guidelines and foundations docs**
- Files/area: `docs/agents/component-guidelines.md` (textStyles, motion rule, icons, elevation, prop vocabulary, density); AGENTS.md section 2 edits if new keys were approved.
- Effort S. Depends on: T1.2 to T1.8. Skill: design-systems. Model: haiku.

### Phase 2. Component upgrades in packages/ui (about 22 to 27 agent-days)

Every task:
- Ships 5-file directories.
- Stories cover default, sizes, tones, disabled, loading, error, and long en-GB content, in light and dark.
- `play()` covers keyboard and pointer interaction.
- Vitest covers logic and ARIA.
- Registered in `architecture.laws.test.ts`.
- Zero `style={{`.

New Radix dependencies (tooltip, popover, dropdown-menu, radio-group, switch, select) need an owner note in the PR.

| ID | Component(s) | Acceptance highlights | Effort | Depends | Skill | Model |
|---|---|---|---|---|---|---|
| T2.1 | Button refresh, IconButton, ButtonLink (absorbs FLPLinkButton) | `danger` variant naming (H-06); pending state with spinner and kept width; IconButton requires `label`; 44 px touch size on `coarse` pointer | M | T1.2-T1.7 | design-systems, interaction-design | sonnet |
| T2.2a | FormField, TextInput, CurrencyInput, PercentInput | label, hint, error association via `useId` (E8 A1 pattern); `inputMode="decimal"`; en-GB parse and format; empty stays empty (E2 rule); `border.input` | M | T2.1 | design-systems, ux-writing | sonnet |
| T2.2b | Select, Checkbox, Switch | promote from FLPSelect/FLPCheckbox (H-05); solid checked fill per E8 deviation note | M | T2.2a | design-systems | sonnet |
| T2.2c | RadioCardGroup | strategy cards as a real radiogroup (J-10); arrow keys | S | T2.2b | interaction-design | sonnet |
| T2.3 | Text, Heading, Money, Num | typed colour prop restricted to `text.*`/`status.*.text` (H-05 root issue); `Money` routes through formatter, sign convention, `tabular-nums`, "Not set" state (H-12) | M | T1.2 | design-systems | sonnet |
| T2.4 | Card refresh, KpiCard, KpiStrip | delta and trend with arrow plus text (not colour alone); liability polarity rule; empty value state; max 4 enforced by type; single row from `sm` up (I-09) | M | T2.3 | design-systems | sonnet |
| T2.5 | Dialog, Sheet (bottom sheet on mobile), ConfirmDialog promoted from `apps/web/app/features/feedback/components/ConfirmDialog` | Radix portal; titled (J-04); scrim token; motion under `_motionSafe`; web ConfirmDialog re-exports during transition | M | T1.4, T1.5 | interaction-design | sonnet |
| T2.6 | InlineAlert/Banner, Toast (via LiveRegion), Skeleton, Spinner, ProjectionNotice | toast has no auto-dismiss for errors; skeleton shimmer only under motion-safe; ProjectionNotice holds owner-approved text (L-01) | M | T2.5 | interaction-design, ux-writing | sonnet |
| T2.7 | Tooltip/InfoTip (term glosses, L-15), Popover, Menu | keyboard and touch reachable, not hover-only | M | T2.1 | interaction-design, accessibility-audit | sonnet |
| T2.8 | AppShell, TopBar, SideNav, MobileBottomBar patterns | driven by a manifest prop (no react-router import in ui; `renderLink` slot); Home first and Debt reachable on mobile (I-12); skip link (E8 VisuallyHidden) | L | T2.1, T2.7, D-IA from T0.6/E16 | design-systems, ux-strategy | sonnet |
| T2.9 | Table refresh, DataList with "Show all N" (cap 8, I-16), Stepper, StatusBadge, ProgressBar refresh | numeric right-alignment; sticky header; stacked layout under `md` | M | T2.3 | design-systems | sonnet |
| T2.10 | PageHeader, SimulatorSplitLayout, SliderField, CollapsibleDrawer, EmptyState, SectionBand refresh | sticky controls at `lg`; under `lg` controls collapse into a summary bar plus Sheet with the outcome kept visible; EmptyState gains illustration and action slots | M | T2.5, T2.6 | interaction-design | sonnet |
| T2.11 | Chart kit: ChartFigure refresh, ChartLegend, ChartTooltipContent, axis and grid props, `useChartAnimation` | framework-free parts in ui; recharts adapters in new `apps/web/app/features/charts/` (keeps recharts out of ui); replaces `components/charts/chartTheme.ts` | M | T1.6, T2.3 | design-systems | sonnet |
| T2.12 | packages/ui calculators restyle (7) | inline styles to `.styles.ts` (H-11); point at `primitives/Button` and delete `components/` shim (H-14); used by tools pages and marketing | L (split into 2 or 3 PRs) | T2.1-T2.4 | design-systems | sonnet |
| T2.13 | Page templates as stories: Dashboard, Simulator, Form, List/Detail, Error/Empty | compositions only; become the visual-regression anchors and the E12 reference | S-M | T2.4-T2.11 | design-systems | sonnet |
| T2.14 | Component spec for E12 | `docs/design/component-spec.md`: anatomy, states, tokens per component, platform notes | S | T2.13 | design-systems | haiku |

### Phase 3. Key screens, in priority order (about 45 to 60 agent-days with E9 folded in)

Every screen task:
- Moves the screen's components into `apps/web/app/features/<domain>/components/<Name>/`, replacing the FLP layer and raw hex, `style={{`, `var(--colors-`, `toLocaleString()` and react-icons imports with ui primitives.
- Splits giant files.
- Adopts the layout laws.
- Wraps charts in the chart kit.
- Applies Phase 5 copy patterns and Phase 4 microinteractions.
- Meets Phase 6 responsive acceptance.

Acceptance for each screen:
- (1) Owner-approved before and after screenshots at 375 and 1280, light and dark, for the relevant personas, attached to the PR.
- (2) `check:laws` baselines shrink for every touched file. Target zero in the moved files.
- (3) All existing route, loader and action tests and the `loaders.honest` test stay green. DOM `__snapshots__` for replaced components are deleted in favour of visual snapshots.
- (4) Stories with `play()` for interactive feature components (scope per D3).
- (5) Zero axe violations in those stories.
- (6) No new invented figure. E2 follow-up fallbacks found in scope are removed with a test.
- (7) E16 verdict for the screen recorded before work starts.

Skill for all: frontend-design (implementation), design-critique (self-review against Phase 0), ux-writing, accessibility-audit. Model: sonnet. A haiku subagent does the mechanical icon and formatter codemods inside each screen.

| ID | Screen | Main files | Split into | Effort | Depends |
|---|---|---|---|---|---|
| T3.0 | App shell and navigation | `components/structure/header/{Header,MobileNavDrawer,styles}.tsx`, `components/navigation/*`, `root.tsx`, `utils/pageConfig.ts` | adopt T2.8 from manifest; global `useNavigation` progress bar (I-11); theme toggle | M | T2.8, E8 merge, E10 H-10 |
| T3.1 | Dashboard | `routes/_index.tsx`, `components/dashboard/HomeDashboard.tsx` + 12 widgets, `components/setup/SetupChecklist.tsx`, `GlobalBaselineScenarioBar.tsx` | (a) KPI strip and layout, (b) widgets to feature dir in 2 PRs, (c) first-run and empty states with next-action card | L x 2 | T3.0, E4 T10/T11b, E16 widget verdict |
| T3.2 | Onboarding / first run | `routes/app.onboarding.tsx` (1,226 lines) | split into step components; Stepper; CurrencyInput; skip-for-now; optional bank step per E6; finish summary; journey 1 target from T0.4 | L | T2.2, T2.9, E16/E6 |
| T3.3 | Debt | `containers/debt/DebtContainer.tsx`, `components/debt/*`, `features/debt/*` | SimulatorSplitLayout; RadioCardGroup strategies; DebtToWealth chart via kit (K-02/K-03); honest "APR not set" states | L | T2.10, T2.11, E4 T11b |
| T3.4 | Mortgage (**recommended pilot**, D4) | `containers/mortgage/MortgageContainer.tsx`, `components/mortgage/{MortgageTracker,OverpaymentSimulator,OverpayVsSaveCompare,RemortgageShockSim}.tsx` | split 5-up grids into KpiStrip of at most 4 (I-09); SliderField for the 9 raw ranges; ERC caveat copy (L-02) | L | T2.10, T2.11, E4 T15a |
| T3.5 | Pension | `containers/pension/*`, `components/pension/*` (2,992 lines) | number fields that snap to 0 become CurrencyInput or SliderField (I-09); stacked-area spec | L | T2.10, T2.11 |
| T3.6 | Forecast and savings | `containers/forecast/*`, `components/forecast/{SavingsForecaster,UKTaxCalculator}.tsx`, `containers/savings/*`, `components/savings/*` | merge or split per E16 overlap verdict | L | E16 |
| T3.7 | Tax | `containers/tax/TaxContainer.tsx` (2,198 lines, 130 inline styles), `components/tax/*` | (a) split per tab, (b) record form in Dialog with FormField, (c) records table pagination (I-16) and keyboard row editing (J-03) | L x 3 | T2.2, T2.5, T2.9, E4 tax consumers |
| T3.8 | Budget | `containers/budget/BudgetContainer.tsx`, `components/budget/{BudgetDashboard,BudgetCategoryTable,BudgetSetupWizard,RunwayCalculator}.tsx` | (a) dashboard and donut cap (K-08), (b) category table, (c) wizard, (d) runway (or move per E16); month selector only if E16 approves (I-13) | L x 3 | E16 |
| T3.9 | Accounts | `routes/app.accounts._index.tsx`, `routes/app.accounts.$account.tsx`, `containers/accounts/*`, `components/accounts/*`, `components/dialogs/{addEditAccountsDialog,connectBankWizard}/*` | list, detail chart and ledger (12 rows in drawer or tab), dialogs on T2.5; bank wizard visuals scoped by E6 | L x 2 | T2.5, T2.9, E6 |
| T3.10 | Settings / profile | `routes/app.profile.tsx`, `components/budget/UserProfilePanel.tsx` (1,348 lines), `features/ai-connections/*` | split into Profile, Security, Data tabs or routes with their own save and an unsaved-changes guard (`useBlocker`, I-14); keep the Reset type-to-confirm pattern | L | T2.2, T2.5 |
| T3.11 | Error, empty and loading states | `features/feedback/components/{RouteErrorBoundary,RouteErrorState}/*`, `root.tsx` ErrorBoundary, 404 handling in `routes/$feature._index.tsx`, `callback.tsx`/`auth.callback.tsx` errors, per-route EmptyState | shell kept on error; 404 vs 5xx distinguished; retry; copy from T5.1 | M | T2.6, T3.0 |
| T3.12 | Signed-out web surfaces: `/sandbox`, `/tools`, `/tools/:slug`, login | `routes/sandbox.tsx`, `routes/tools.*`, `components/home/*` | depends on D11b: either delete web `components/home` forks and redirect signed-out `/` to marketing, or restyle them | M-L | D11b, T2.12 |

### Phase 4. Microinteractions and motion (about 5 agent-days; most of it is inside Phase 3)

| ID | Task | Acceptance | Effort | Skill | Model |
|---|---|---|---|---|---|
| T4.1 | Interaction spec | `docs/design/interaction.md`: what animates and why. Rules: never animate a money figure from a fake start value; value changes use a 120 ms crossfade, not count-up; charts do not animate while dragging (K-09); hover elevation only on interactive cards | S | interaction-design | sonnet |
| T4.2 | Simulator feedback loop | debounced recalculation; the changed outcome is briefly highlighted (motion-safe) and announced politely (E8 D5-A, about 1 s debounce); "Reset to my figures" control | M | interaction-design | sonnet |
| T4.3 | Save and confirm states | Button pending, then tick, then Toast; inline error keeps form values (L-04); copy-to-clipboard feedback "Copied" | S | interaction-design, ux-writing | sonnet |
| T4.4 | Transitions | Dialog/Sheet enter and exit, tab indicator, skeleton-to-content fade, nav progress bar; all under `_motionSafe` | S | interaction-design | sonnet |
| T4.5 | Dashboard customise polish | drag reorder with a keyboard alternative and announced moves | S | interaction-design, accessibility-audit | sonnet |

Tests: `play()` with reduced-motion on and off; a unit test asserting `useChartAnimation` returns false while dragging.

### Phase 5. Content and UX writing (about 7 agent-days plus owner sign-off)

| ID | Task | Files | Acceptance | Effort | Depends | Skill | Model |
|---|---|---|---|---|---|---|---|
| T5.1 (5a, before Phase 3) | Voice, terminology, copy patterns | `docs/copy-style-guide.md`, `GLOSSARY.md` new "User-facing terms" section (L-06) | canonical terms (Safe to spend, Take-home, Log in/Sign up, Self Assessment, Personal Allowance); empty-state, error ("what happened, what to do"), confirm and ProjectionNotice templates; owner signs off the ProjectionNotice wording | M | T0.6 | ux-writing | sonnet |
| T5.2 | Copy guard script | `scripts/check-copy.ts` + test + baseline, wired into `check:laws` | flags banned terms (style guide section 7, L-05), en-US spellings (L-07), `!` in labels, em dashes in JSX text (L-08), bare `toLocaleString()` (L-13); ratchet baseline | M | T5.1 | ux-writing | sonnet |
| T5.3 | Formatting helpers | `pluralise()` (Intl.PluralRules, L-11); one date helper; Money everywhere (H-12) | the "1 days" cases fixed; tests | S | T2.3 | ux-writing | haiku |
| T5.4 (5b, after Phase 3) | Residual sweep | everything Phase 3 did not touch, plus web mirrors of the E7 claims (E7 T12, still out of scope there) | copy guard baseline at zero for `apps/web/app` | M | Phase 3 | ux-writing | sonnet |
| T5.5 | Disclaimer restructure | `packages/finance-engine/src/tax-rules.ts:29-56` TAX_DISCLAIMER display (L-09) | headed sections, a "Rules last updated" stamp; owner approves wording; touches finance-engine only for the string constants | S | owner | ux-writing | sonnet |

### Phase 6. Responsive and touch on web (about 5 to 7 agent-days; acceptance applies inside Phase 3)

| ID | Task | Acceptance | Effort | Skill | Model |
|---|---|---|---|---|---|
| T6.1 | Breakpoint and touch spec | `docs/design/responsive.md`: 375, 768, 1024, 1280, 1440 behaviour per template; targets at least 44 px on coarse pointers (WCAG 2.5.8 floor is 24); safe-area insets; no hover-only affordances | S | interaction-design | sonnet |
| T6.2 | Simulator on mobile | summary bar showing the headline outcome plus a "Adjust" Sheet; charts reduce ticks and show tap tooltips plus a ChartFigure table | M | interaction-design | sonnet |
| T6.3 | Tables and lists on mobile | stacked rows, numeric alignment kept, "Show all N" | S | design-systems | sonnet |
| T6.4 | Viewport stories and checks | Storybook viewport globals (375, 1280) on page templates; visual snapshots at both | S | none | haiku |
| T6.5 | Cross-device pass | real-device or emulated pass over the 6 journeys; issue list closed or ticketed | M | accessibility-audit | sonnet |

### Phase 7. Marketing visual pass, after copy sign-off (about 10 to 12 agent-days)

Preconditions: E7 copy is owner-signed (done per the E7 ledger, with open follow-ups), D1 is decided, and D11 (marketing expression) is decided.

| ID | Task | Files | Acceptance | Effort | Model |
|---|---|---|---|---|---|
| T7.1 | Colocate and restyle shell | `apps/marketing/src/components/{Header,Footer,ThemeToggle}.tsx`, `index.css`, `index.html` | 5-file dirs (H-08 step 7); self-hosted fonts; tokens only | M | sonnet |
| T7.2 | Home sections | `HomePage.tsx`, `FeaturePillars`, `HowItWorksSection`, `ComparisonMatrix`, `InteractiveFinancialTeaser`, `BaselineSnapshotPreview`, `SecurityPrivacySection`, `HomeFAQ` | "Example" labels on illustrative figures (K-14); no raw rgba (E7 follow-up); claims guard green | L | sonnet |
| T7.3 | Pricing, Security, MCP, Tools pages | `pages/{PricingPage,SecurityPage,ToolPage,ToolsIndexPage}.tsx`, `pages/McpPage/*` | placeholder price preserved (DECISIONS E7); explicit Light/Dark stories (E7 follow-up) | L | sonnet |
| T7.4 | Social and OG assets in the new style | `public/` OG image template | covers M-05 visuals only; SEO tags stay with the M track | S | sonnet |
| T7.5 | Lighthouse and visual check | metrics vs T0.9 | no regression in performance; accessibility 100 | S | haiku |

Skill: design-elevation, frontend-design, ux-writing (layout of signed copy only, no rewording without the owner).

### Phase 8. Regression guard and done (about 5 to 6 agent-days)

**T8.1 Visual regression (8a, before Phase 3).** Recommendation (D7-A): **Vitest browser-mode screenshot assertions inside the E8 Storybook Vitest project**, on a curated `visual` story tag.
- Files/area: `apps/web/vite.config.mts` (new `visual` project or tag filter on E8's `storybook` project); `apps/web/.storybook/preview.tsx` (single theme under test per E8 T31; disable animations; wait for fonts); `apps/web/package.json` script `test:visual`; baselines in `apps/web/__screenshots__/`; a CI job in `.github/workflows/ci-pipeline.yml`.
- Scope: about 40 ui stories x 2 themes, plus T2.13 templates x 2 themes x 2 viewports. That is about 120 to 140 images at about 30 to 60 KB each, so 5 to 8 MB in git and no LFS. Free LFS bandwidth (1 GB/month) would be eaten by CI checkouts.
- CI budget: the private repo on the free plan has **2,000 Linux minutes a month**. The job runs only on `pull_request` with path filters (`packages/ui/**`, `apps/web/app/**`, `apps/marketing/src/**`, `apps/web/.storybook/**`). Chromium is cached. Target under 6 minutes, so about 150 runs fit in roughly 900 minutes alongside existing CI. Measure the first month.
- Railway "Wait for CI" uses `checkSuites: true`, so the job must not run (or must be `continue-on-error`) on `push` to `main`. Otherwise a flaky snapshot blocks deploys.
- Baselines are generated only in CI or in the pinned Playwright Docker image (platform-specific names). A `workflow_dispatch` "update snapshots" job uploads new baselines as an artifact for a human to commit.
- Before committing to the API, verify `toMatchScreenshot` and Storybook `afterEach` support in the installed Vitest 5.1 and Storybook 10.6 with context7. If either is insufficient, fall back to D7-B (Playwright `toHaveScreenshot` against the static `storybook build` output).
- Acceptance: an intentional 1 px token change fails the job with a diff artifact; a no-op PR passes 10 times in a row (flake check).
- Effort M (L if the E8 gate is not there yet). Depends on: E8 T32 or its rebuild, T2.13. Model: sonnet.

**T8.2 Design-law ratchets (extend E11 scripts)**
- Files/area: `scripts/lib/design-tokens.ts`, `scripts/check-design-tokens.ts`, `scripts/design-token-baseline.json`, `scripts/check-design-laws.test.ts`.
- Add rules:
  - primitive names `success|warning|destructive|info|dark.<n>` (H-13);
  - `style={{`;
  - `var(--colors-`;
  - `react-icons/` (from T1.7);
  - raw `transition:` or `animation:` outside motion tokens;
  - raw px `fontSize` literals;
  - `boxShadow` literals.
- Each rule is a per-file baseline that may only shrink. The existing E11 known limitations stay documented.
- Effort M. Model: sonnet.

**T8.3 Colocation ratchet** (H-08 step 1). Only if E9 is absorbed (D3). Auto-discover directories in `architecture.laws.test.ts` with a shrinking list of known-flat files. Effort S. Model: sonnet.

**T8.4 Panda strictness in web and marketing**, after Phase 3: `strictTokens` (or equivalent) in `apps/web/panda.config.ts` and marketing; remove `preset-panda` colours. Effort S to M. Model: sonnet.

**T8.5 A11y gate required in practice.** The E8 Storybook a11y job plus the E15 visual job become "expected green" in the PR checklist. Branch protection is not available (D7), so enforcement is review discipline plus Railway on main. Add a page-level axe run on the 6 journeys if E11 T18/T19 Playwright smoke exists. Effort S. Model: haiku.

**T8.6 Final measurement report.** `docs/design/e15/metrics-final.md` against T0.9. Effort S. Model: haiku.

**Definition of done for E15**
1. D1 direction implemented through tokens; no visual value outside `packages/ui` tokens (`check:laws` and the copy guard at zero for redesigned files; repo-wide baselines at least 60% below the T0.9 counts).
2. Every Phase 3 screen owner-approved in light and dark at 375 and 1280; E16 verdicts respected.
3. All new or changed components in 5-file directories with light and dark stories, `play()` on interactive states, and zero a11y violations under the E8 gate.
4. The visual regression job is green and stable (no flake in 2 weeks); ratchets in CI.
5. Measurement targets below met or explained.
6. The four `bun run` gates plus `check:laws` and `test:storybook` pass on the final PRs (AGENTS.md section 5).
7. Component spec and tokens handed to E12.

## 5. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Redesign never converges (endless direction churn) | M | H | One direction decision (T0.8), principles from T0.6, a pilot screen (D4) before rollout, owner review per screen with at most 2 rounds |
| R2 | Conflicts with in-flight branches (E8 web sweeps, 139 files; E4 consumer tasks) | H | H | Hard gate: no `apps/web/app` edits before the E8 merge; rebase-order rule per screen; one session owns each screen's files |
| R3 | E9 left undecided, so E15 restyles the FLP layer (throwaway) | M | H | D3 decided before Phase 3; Phase 3 tasks carry the E9 migration |
| R4 | Effort underestimated on giant files (Tax, Budget, Profile, Pension) | H | M | Split L x 2-3 sub-tasks; migrate first, restyle second within one screen task; budget recorded per screen and re-estimated after the pilot |
| R5 | Subagents judge visuals poorly | H | M | Acceptance requires screenshots read back by the agent, a design-critique self-review against Phase 0, and owner sign-off; visual snapshots catch drift |
| R6 | Visual snapshot flake (fonts, Recharts animation, sub-pixel AA) blocks Railway deploys through `checkSuites` | M | H | PR-only job with path filters; reduced motion and animations off; fonts awaited; pinned Docker image; per-story thresholds; flake check in T8.1 acceptance |
| R7 | GitHub Actions minutes exhausted (2,000/month) | M | M | Path filters, caching, curated story set, measure in month one; fall back to manual `test:visual` locally |
| R8 | Token changes break contrast in one theme | M | H | Extend `tokens.a11y.test.ts` to full matrix and CVD test before value changes (T1.6, T1.8) |
| R9 | Token location moves (E12 `@flump/tokens`) mid-Phase 1 | M | M | Sequence: E15 Phase 1 first, E12 T1.15 moves it; or one owner for the tokens file |
| R10 | New colour keys need AGENTS.md law edits | H | L | Batch all proposed keys in one owner approval (D10) |
| R11 | Animated or redesigned numbers mislead (fake start values, colour meaning) | L | H | T4.1 rules; entity-not-outcome colour (K-03); no count-up |
| R12 | Copy changes stray into legal or regulatory territory | M | H | ProjectionNotice and disclaimer wording owner-approved; E7 rules apply; claims guards stay green |
| R13 | DOM snapshot tests churn on every restyle | H | L | Delete presentational DOM snapshots when visual snapshots cover them; keep behavioural tests |
| R14 | Self-hosting fonts or new deps increase bundle size | L | M | Variable fonts subset to Latin; Lighthouse comparison (T7.5, T8.6); Radix deps tree-shaken |
| R15 | E16 not planned in time, so Phase 3 stalls | M | M | Start with scope-stable T3.0, T3.11 and the T3.4 pilot |
| R16 | Mockups or stories show figures that look real | M | M | "Sample data" labels per E2 D2; personas only in dev |

## 6. Decisions needed from the product owner

1. **D1. Which visual direction?**
   - A. "Calm ledger": refined current indigo, light-first, editorial type, generous space.
   - B. "Instrument panel": dark-first, dense, data-forward, prominent tabular numerals.
   - C. "Warm guide": warm neutrals, larger radii, illustration slots, coach-style next-action cards.
   - Recommendation: decide only after T0.7 mockups. The provisional lean is A as the base, with B's density for simulators and tables (via D9-C). It fits the "trust" problem the audit found and costs least to apply across 12 screens.
   - Blocks: Phases 1 to 7.

2. **D2. Brand colour.**
   - A. Keep indigo (`indigo.600`) and refine the neutrals only.
   - B. Evolve the hue (new primitive scale, same semantic names).
   - C. New brand identity, including logo.
   - Recommendation: A, unless the chosen direction clearly needs B. Semantic names stay, so B is cheap in code but needs a full contrast re-test. C is out of scope for E15.
   - Blocks: T1.8.

3. **D3. Does web adopt packages/ui (the open E9 decision), and does E15 absorb E9?**
   - A. Full adoption, with the 5-file rule for every component.
   - B. Relax the laws for web.
   - C. Adopt ui primitives and patterns everywhere; all 5 files required for `packages/ui` and shared components; feature-internal components need only `Name.tsx`, `Name.styles.ts`, `index.ts` and a test (H-08 step 8). E15 Phase 3 carries the migration.
   - Recommendation: C. B makes a refreshed system impossible to apply consistently. A produces many empty stories for one-off feature parts. Requires editing AGENTS.md Law 1 wording.
   - Blocks: Phase 3, T8.3.

4. **D4. Pilot screen and E16 ordering.**
   - A. Dashboard first, as listed.
   - B. Mortgage first as the pilot (scope-stable after E2/E4, exercises SimulatorSplitLayout, SliderField, the chart kit and KpiStrip), then dashboard once E16 settles the widget set.
   - C. App shell plus error and empty states first, then dashboard.
   - Recommendation: B, with T3.0 (shell) in parallel. E16 scope verdicts gate each Phase 3 screen; E15 Phases 0 to 2 run alongside E16.
   - Blocks: Phase 3 order.

5. **D5. Typography.**
   - A. Keep Inter (body) and Plus Jakarta Sans (headings), self-hosted.
   - B. One variable family (for example Inter with display optical sizing) for everything, self-hosted.
   - C. A new pair chosen in the direction mockups.
   - Recommendation: A or B, as chosen with D1. Self-host either way (privacy and CSP; drop the Google Fonts links in `root.tsx:22-26` and `apps/marketing/index.html:9-12`, and remove the stray Poppins from Storybook).
   - Blocks: T1.2.

6. **D6. Icon set.**
   - A. Lucide (`lucide-react`): a maintained successor to Feather, consistent stroke, tree-shakable.
   - B. Keep react-icons but use Feather (`fi`) only.
   - C. Phosphor.
   - Recommendation: A. It looks like the existing `fi` icons, so the visual change is small, and it drops two mixed sets. Migration happens per screen in Phase 3.
   - Blocks: T1.7.

7. **D7. Visual regression tool (free GitHub budget).**
   - A. Vitest browser-mode screenshots in the E8 Storybook Vitest project: one Chromium install shared with the a11y gate, baselines in git.
   - B. Playwright `toHaveScreenshot` against the static Storybook build in the Playwright Docker image: more mature, but a second browser toolchain.
   - C. Chromatic free tier (5,000 snapshots a month; the addon is already installed): no baseline files in git, but an external account, a snapshot cap (about 30 full builds a month at about 160 snapshots) and story content leaving the repo.
   - Recommendation: A, falling back to B if the installed Vitest or Storybook APIs fall short (verify first). Run it PR-only, never as a blocking check on `main`, because of Railway `checkSuites`.
   - Blocks: T8.1.

8. **D8. Default theme.**
   - A. Follow the system setting, with a user override.
   - B. Light by default.
   - C. Dark by default.
   - Recommendation: A. Both themes are first-class in the laws.
   - Blocks: T1.8.

9. **D9. Density.**
   - A. One density.
   - B. A user toggle (comfortable or compact).
   - C. Contextual: comfortable for dashboard, onboarding and forms; compact for tables, ledgers and simulator controls; a `data-density` hook kept for a later toggle.
   - Recommendation: C.
   - Blocks: T1.3.

10. **D10. New colour token keys** (for example `surface.scrim`, `chart.series6-8`, `chart.projection`, `chart.band`), and the AGENTS.md section 2 edits they need.
    - A. Approve the batch proposed in T1.1.
    - B. Approve only scrim and chart additions.
    - C. No new keys; map everything onto existing keys.
    - Recommendation: A, as one approval, so the law text changes once.
    - Blocks: T1.4, T1.6.

11. **D11. Marketing.**
    - (a) Expression:
      - A. Identical visual language to the app.
      - B. Same tokens and type, with a more expressive marketing layer (larger display type, illustration).
      - C. A separate marketing style.
      - Recommendation: B.
    - (b) The duplicated public home inside web (`apps/web/app/components/home/*`, about 4,400 lines with the marketing forks):
      - A. Delete it and redirect signed-out `/` to the marketing site.
      - B. Restyle both.
      - C. Move the shared sections to packages/ui.
      - Recommendation: A. It removes a whole surface to redesign and keep in sync.
    - Blocks: T3.12, Phase 7.

12. **D12. Mockup format for the directions.**
    - A. Standalone HTML artifacts, not shipped.
    - B. Storybook stories on a throwaway branch.
    - C. A design tool (Figma).
    - Recommendation: A. It is fastest, bypasses the code laws for throwaway work, and is easy to review in a browser. The chosen direction is then rebuilt properly as Phase 1 foundation stories.
    - Blocks: T0.7.

13. **D13. Language scope for the copy pass** (L-12, owned by E14 but it affects Phase 5).
    - A. en-GB only: remove `es`, the dead keys and the detector.
    - B. Multilingual: strings move to the catalogue during Phase 5.
    - C. Defer the decision and edit strings in place.
    - Recommendation: A. The product is UK-specific (HMRC, ISA, AER), and B roughly doubles Phase 5.
    - Blocks: T5.2, T5.4.

14. **D14. Review cadence.**
    - A. Owner reviews every screen PR.
    - B. Owner reviews the pilot, then a batch at each phase end.
    - C. Agent self-review only.
    - Recommendation: B, with A for the dashboard and onboarding.
    - Blocks: Phase 3 throughput.

## 7. Measurement: what "better" means

Baseline in T0.9; final in T8.6. Most numbers are measured on the local production build with the T0.1 personas. The product has no analytics, so task success is scripted and owner-observed, not user telemetry.

| Dimension | Metric | Target |
|---|---|---|
| Task success | Owner (or 3 to 5 recruited UK testers, if the owner wants) completes the 6 journeys from T0.4 unaided; success or failure and error count per task | every journey succeeds unaided; errors halved vs baseline |
| Time to first insight | From sign-up return to the first meaningful personalised number on the dashboard: clicks, screens, server round trips, seconds (scripted run plus stopwatch) | at least 30% fewer steps; under 3 minutes with typical inputs |
| Heuristic quality | Nielsen 1-5 per screen, re-scored by a fresh design-critique pass with the same rubric | every screen at least 4 on visibility of status, consistency and error recovery (currently "Weak" in I-ux) |
| Accessibility | axe violations in gated stories and on the 6 journey routes; `tokens.a11y.test.ts` matrix coverage; Biome a11y count | zero violations; 100% of text/surface/status/chart pairs AA in both themes |
| Contrast and CVD | computed matrix plus CVD ΔE test (T1.6) | all pass |
| Performance | Lighthouse mobile (Performance, Accessibility, Best Practices) on `/sandbox`, `/tools`, marketing `/`, `/pricing`, signed-in `/`, `/app/mortgage`; CLS from fonts | Accessibility 100; Performance not lower than baseline and at least 85 on marketing; CLS under 0.05 |
| System consistency | CSS stats on built CSS: distinct colour, font-size, shadow and radius values; `check:laws` and copy-guard counts; FLP references | at least 60% fewer distinct raw values; ratchets at zero in redesigned files; FLP references zero (if D3 A or C) |
| Copy | copy guard (banned terms, en-US, punctuation); reading level of key screens (Flesch-Kincaid on extracted strings, informational) | guard zero; key flows at or below reading age 12 to 14 equivalent |
| Qualitative | owner review per screen against the principles; before and after screenshot pairs | owner approval recorded per screen |

## 8. Honest effort summary

| Phase | Agent-days (subagent work including review loops) | Owner time |
|---|---|---|
| 0 Discovery and direction | 7 to 9 | 3 to 4 h |
| 1 Foundations | 9 to 11 | 1 h (D10) |
| 2 Components | 22 to 27 | 1 to 2 h |
| 3 Screens (E9 folded in) | 45 to 60 | 1 h per screen group |
| 4 Microinteractions | about 5 (plus inside Phase 3) | none |
| 5 Content | about 7 | 2 h sign-off |
| 6 Responsive | 5 to 7 | 1 h |
| 7 Marketing | 10 to 12 | 2 h |
| 8 Guards | 5 to 6 | none |
| **Total** | **about 115 to 145 agent-days** | **about 15 to 20 h** |

- With 2 or 3 parallel worktrees (ui track, one screen track, discovery or marketing), expect **about 3.5 to 5 months elapsed**. Phase 3 is the critical path.
- Without folding E9 in, Phase 3 would be about half this (a reskin of the FLP layer), but most of it would be redone in E9. That is why D3 is the most consequential decision after D1.

## Key files

- `/Users/marcgallagher/personal/flump/packages/ui/src/tokens/index.ts` (on main)
- `/Users/marcgallagher/personal/flump/packages/ui/panda.preset.ts`
- `/Users/marcgallagher/personal/flump/apps/web/panda.config.ts`
- `/Users/marcgallagher/personal/flump/apps/web/app/index.css`
- `/Users/marcgallagher/personal/flump/apps/web/app/root.tsx`
- `/Users/marcgallagher/personal/flump/apps/web/.storybook/main.ts`
- `/Users/marcgallagher/personal/flump/apps/web/.storybook/preview.tsx`
- `/Users/marcgallagher/personal/flump/apps/web/.storybook/preview-head.html`
- `/Users/marcgallagher/personal/flump/apps/web/app/components/charts/chartTheme.ts`
- `/Users/marcgallagher/personal/flump/apps/web/app/utils/pageConfig.ts`
- `/Users/marcgallagher/personal/flump/apps/web/app/features/feedback/components/` (ConfirmDialog, RouteErrorBoundary, RouteErrorState)
- `/Users/marcgallagher/personal/flump/scripts/check-design-tokens.ts`, `/Users/marcgallagher/personal/flump/scripts/lib/design-tokens.ts`, `/Users/marcgallagher/personal/flump/scripts/design-token-baseline.json`
- `/Users/marcgallagher/personal/flump/.github/workflows/ci-pipeline.yml`
- `/Users/marcgallagher/personal/flump/docs/agents/component-guidelines.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/DECISIONS.md`, `/Users/marcgallagher/personal/flump/docs/audit/plans/SEQUENCE.md`, `/Users/marcgallagher/personal/flump/docs/audit/plans/E8-web-ledger.md`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/docs/audit/plans/E12-mobile-rebuild-plan.md` (the only copy of the E12 plan; section 2.11 has the token extraction)
