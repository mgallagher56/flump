# UI laws

Sections 1 to 4 and 10 of [`AGENTS.md`](../../AGENTS.md) in full, moved here word for word on 22 November 2026 to keep `AGENTS.md` short. They are binding. Other documents cite them as "AGENTS.md section 1" and so on.

## 1. COLOCATED COMPONENT DIRECTORY LAW (MANDATORY)

> **Detailed Reference**: Before creating or editing any component in `packages/ui`, `apps/web`, or `apps/marketing`, read [`docs/agents/component-guidelines.md`](../agents/component-guidelines.md).

Never create standalone, flat `.tsx` component files. Every component in `packages/ui`, `apps/web/app/features/*/components`, and new feature sections/pages in `apps/marketing/src/{components|pages}` MUST live in its own PascalCase directory with colocated files. The required set depends on where the component lives (E15 decision D3-C):

- **`packages/ui` and shared components** (anything imported by more than one feature or app): all five files.
- **Feature-internal components** (new components in `apps/web/app/features/<domain>/components/*` used only inside that feature): `ComponentName.tsx`, `ComponentName.styles.ts`, `ComponentName.test.tsx` and `index.ts`. A `ComponentName.stories.tsx` is required only if the component is interactive and not already covered by a story or test of its parent; promote it to the full five files when a second feature imports it. This relaxation takes effect as the E15 phase 3 web adoption lands; until then `architecture.laws.test.ts` still enforces all five files for every directory it lists (debt, sandbox, ai-connections, feedback, calculators, patterns, primitives, marketing), and that test is not loosened by this edit.

**`apps/mobile`**: every component lives in its own PascalCase directory with `ComponentName.tsx`, `ComponentName.styles.ts` (a StyleSheet factory that takes the theme), `ComponentName.test.tsx`, `ComponentName.states.ts` (named prop sets, shown by the dev gallery and used by the tests, in place of a Storybook file) and `index.ts` (E12 S1b; plan section 10.3).

The five files:

- `ComponentName/ComponentName.tsx` (Component implementation)
- `ComponentName/ComponentName.styles.ts` (Panda CSS `cva` or `sva` recipes, no inline style soup)
- `ComponentName/ComponentName.stories.tsx` (Storybook 8 visual states + `play()` interaction test)
- `ComponentName/ComponentName.test.tsx` (Vitest unit test)
- `ComponentName/index.ts` (Barrel export)

Direction of travel (E15 phase 3 target, not yet enforced): web pages move from inline styles to `@repo/ui` primitives and patterns. The legacy `FLP*` layer (`apps/web/app/components/core`) has been removed and `architecture.laws.test.ts` forbids it returning.

## 2. DESIGN TOKEN & STYLING LAWS

- **Zero Raw Hex/RGB or Primitive Token Leaks:** Components may NEVER use hardcoded hex values (`#141A26`) or raw primitive scale tokens (`indigo.600`, `slate.800`, `success.500`, `purple.500`, `cyan.400`). Always use the 7 canonical semantic namespaces:
  - `surface.*` (`canvas`, `card`, `sunken`, `subtle`, `overlay`, `contrast`, `scrim`, `hero`; `scrim` is a modal backdrop, never a text surface; `hero` is the single headline block per page, added by DECISIONS round 5 (solid mint in light, an edged card in dark, since the Midnight and Mint palette of 24 Nov 2026), text on it uses `text.onHero` and its figure `text.heroFigure`; `contrast` is charcoal, text on it uses `text.onContrast`; `tint.{teal|apricot|sage}` are E16 domain tints for icon tiles and at most one tinted section per page, never around a `KpiStrip`, a `ScenarioZone` or a chart, and never on a KPI card; the one exception is marketing pages, whose section bands alternate `surface.card` with `surface.canvas`, with one `surface.hero` band and a `surface.contrast` closing band, and use no `apricot` or `sage` band and no `surface.subtle` strip, while a band that holds figures or a chart stays on a `card` or `canvas` band, by the Midnight and Mint owner decision of 24 Nov 2026 in `docs/ux/STYLE-GUIDE.md` section 14, which replaced the canvas and `surface.tint.teal` bands of the owner decision of 2026-11-20 in `docs/audit/plans/DECISIONS.md`)
  - `text.*` (`primary`, `secondary`, `muted`, `onContrast`, `onHero`, `heroFigure`)
  - `border.*` (`DEFAULT`, `subtle`, `strong`, `input`, `focusRing`, `hero`, `section`; reference a `DEFAULT` by its group name, `"border"` or `"primary"`: a literal `"border.DEFAULT"` resolves to no CSS variable and renders `currentColor`, and `check-design-tokens` counts it)
  - `primary.*` (`DEFAULT`, `solid`, `hover`, `emphasis`, `subtle`, `border`, `foreground`; `solid`/`hover` are fills behind `primary.foreground` only, graphic-only fills use `primary` or `chart.primary`)
  - `status.{positive|warning|danger|info|neutral}.{text|bg|border|solid}`
  - `chart.*` (`primary`, `wealth`, `debt`, `warning`, `accentPurple`, `accentCyan`, `grid`, `series1`..`series8`, `projection`, `band`, `baseline`)
  - `accent.*` (`DEFAULT`, `subtle`, `border`, `onHero`; decoration and wayfinding only: never a figure, button, link or notice, and never a signal of good or bad)
- **Tabular Numbers on All Financial Data:** Every currency value, percentage, date, table cell, and slider badge MUST apply `fontVariantNumeric: 'tabular-nums'` (`tabular-nums`) and format numbers via standard UK formatting (`Intl.NumberFormat('en-GB')` / `useFormatCurrency()`).

## 3. PROGRESSIVE DISCLOSURE & LAYOUT LAWS

- **Single-Row KPI Strip:** Top-level page metrics must use `<KpiStrip>` (`lg:grid-cols-4` or `3`, max 4 items in a single horizontal row, never a tall 2x2 grid).
- **2-Column Simulator Split:** Any calculator or forecaster (`/debt`, `/mortgage`, `/pension`, `/forecast`) must use `<SimulatorSplitLayout>` (`lg:col-span-5` or `4` sticky left parameter controls + `lg:col-span-7` or `8` right visual chart & outcome cards). Never stack slider parameters full-width above the chart they control.
- **Compact Slider Inputs:** Always use `<SliderField>` (Label top-left, compact editable value pill top-right, slider below). Never render a full-width text input box below a slider.
- **Saved vs Scenario:** Headline figures and `<KpiStrip>`s read saved loader data only; what-if inputs live in a `<ScenarioZone>` driven by `useScenarioState`, and scenario inputs never write to saved data (no "apply", no localStorage, no money in URLs) and `surface.hero` never goes on a scenario outcome.
- **No Uncollapsed Raw Schedules:** Any table exceeding 8 rows (Amortisation schedules, 12-month ledgers, multi-year tax tables) must live inside a `<CollapsibleDrawer>` or secondary tab.
- **Number Budget and One Notice:** Each view keeps to the number budget and shows one headline figure, and each surface carries at most one quiet notice, as set out in principles P1, P2 and P4 of [`docs/design/e16-polish/PLAN.md`](../design/e16-polish/PLAN.md).
- **One Tabs Component:** Tabbed views use the single tabs component from `@repo/ui` (today `SegmentedTabs`; E16 PR 2 consolidates it as `Tabs`); no hand-built tab rows.
- **Page Template:** Every app page renders through `<PageBody>` (content width `sizes.page.max`, `spacing.page.*` gutters and gaps) and shows its headline figure in `<HeroFigure>`, the only place `surface.hero` and `numeric.hero` appear (E16 P2 and P13). Direction of travel: `PageBody` and `HeroFigure` land with E16 PR 2 and pages adopt them in the page PRs; until then this is not enforced and existing `surface.hero` uses (KpiCard `tone="hero"` and others) stay.
- **Type and Motion Come From Tokens:** Font sizes come from textStyles or the `fontSizes` scale, weights stop at 700, and transitions use the `durations` and `easings` tokens; `bun scripts/check-style-literals.ts` ratchets raw values (and inline `style=` in the apps) down.

## 4. DEFINITION OF DONE FOR ANY UI CHANGE

A component or page task is NOT complete until:

1. It follows the colocated directory structure.
2. It has a `.stories.tsx` file rendering in both Light and Dark mode with zero `@storybook/addon-a11y` violations.
3. Interactive states are covered by a `.test.tsx` or Storybook `play()` test.
4. The local fast checks in section 5 pass, and every CI check on the PR is green (CI runs the full tests, build, Storybook a11y and E2E).

## 10. UX GUIDELINES AND STYLE GUIDE

Three documents in `docs/ux/` are the standing rules for how Flump behaves and looks on every platform (marketing site, web app, future mobile app). Sections 1 to 4 above are the enforced subset of them.

- [`docs/ux/UX-GUIDELINES.md`](../ux/UX-GUIDELINES.md): behaviour. Hierarchy and the number budget, navigation, saved details versus scenarios, forms and money input, states, destructive actions, charts, onboarding, accessibility, trust, motion (12.1 the apps' tiers A to C, 12.2 the marketing site), responsive and touch.
- [`docs/ux/STYLE-GUIDE.md`](../ux/STYLE-GUIDE.md): the visual language. Colour, type, spacing, radius, elevation, icons, illustration, logo, chart palette, component anatomy and states.
- [`docs/ux/CROSS-PLATFORM.md`](../ux/CROSS-PLATFORM.md): what is shared between marketing, web and mobile, the component parity matrix, and the parity checklist.

**What to read before UI work:**

- A new or changed page, flow, form, chart or state in `apps/web` or `apps/marketing`: UX-GUIDELINES (the sections for what you touch), then `docs/agents/component-guidelines.md`.
- A new or changed component, token or recipe in `packages/ui`: STYLE-GUIDE, then `docs/agents/component-guidelines.md`.
- Any screen in the mobile app, or any change to tokens, formatting or shared specifications: CROSS-PLATFORM, and run its parity checklist.
- User-facing words: the copy guide (`docs/copy/COPY-GUIDE.md`, section 11 below) and `docs/compliance/advice-boundary-policy.md`. The UX documents do not set wording.

**Keep mobile in step.** A PR that changes what a user sees or does in a flow the mobile app shares (sign-in, the monthly check-in, navigation, net worth, accounts, settings, loading and error states, shared components, tokens, formatting or fixed wording) adds a dated row to [`docs/audit/plans/E12-mobile-parity-log.md`](../audit/plans/E12-mobile-parity-log.md). The re-sweep session at the end of each design round checks the log against the merged PRs and appends any row that is missing.

**How the rules rank.** Each rule in those documents is marked "Enforced by" a law or test, "Proposed check", or "Review only". If a document and a law or test disagree, the law or test wins: follow it, and correct the document in the same PR. If a document and an older design note under `docs/design/` disagree, the `docs/ux/` document wins. Owner decisions in `docs/audit/plans/DECISIONS.md` outrank all of them.

**Review-only rules still apply.** A PR that touches UI states in its description which review-only rules it checked. The `ui-compliance-reviewer` agent reviews against the laws above and the `docs/ux/` documents.

`docs/ux/UX-ASSESSMENT-2026-11.md` is a dated assessment, not a rule set. Do not treat its findings as instructions; the changes it calls for become rules only when they enter the documents above.
