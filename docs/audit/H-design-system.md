# Track H: Design system and token compliance

Audited 2026-11-11 on `main`. Read-only. All evidence is from reading code and from grepping the committed Panda output in `apps/web/build/client/assets/index-Cb-Bywej.css`. No runtime or browser pass was done, so visual claims are inferred from CSS and are marked as such.

## Summary

The design system in `packages/ui` is well formed: six semantic namespaces, every semantic colour has a dark value, and the primitives are properly colocated. But it is barely used. `apps/web` runs on its own `FLP*` layer, and the shared layout patterns (`KpiStrip`, `SimulatorSplitLayout`, `PageHeader`) are used in exactly one place, the sandbox template page. The `packages/ui` calculators, which should be the reference implementation, break the same laws.

Nothing stops drift, so it has compounded. The only enforcement is a vitest file with a hand-picked directory allowlist.

What I found that the Phase 1 sweep did not:

- **Invalid tokens that silently emit invalid CSS.** `backgroundColor: "card"`, `"background"` and `color: "destructive"` appear about 100 times and compile to `background-color:card` and `color:destructive`. Those declarations are dropped by the browser. Error text is not red and card backgrounds are transparent. `root.tsx` uses an undefined CSS variable on `<body>`.
- **Emotion is dead code in `apps/web`.** Nothing consumes it. Removing it is about 1 hour of work, not a migration.
- **`#6363f1` is not a token.** It is a near-miss of `indigo.500` (`#6366f1`) and the most common brand colour in the apps, about 71 occurrences.
- **Dark-mode contrast fails on the primary and destructive buttons** (4.47:1 and 3.76:1), and the token a11y test does not cover those pairs.
- **Mobile re-derives its theme by hand.** It flattens `{base, _dark}` to `base`, hard-codes different dark surfaces, and inverts the slate scale in light mode.

Counts are lines or occurrences, as stated per finding. Excluded: tests, stories, `node_modules`, `styled-system`, `dist`, `build`, `coverage`.

## Method notes and corrections to Phase 1

- Phase 1 reported "107 primitive-token lines". My re-grep (primitive scale in quotes or `colors.<scale>.`) gives 135 across the repo: web 65, ui 50, marketing 20. About 50 of the ui hits are in `tokens/` (legitimate), so the real violation count is about 85. The bigger problem is not primitive scales (`success.500`) but names that are not tokens at all (H-01).
- Phase 1 reported `style={{` at 2,213 lines. Per workspace: web 1,574, ui 201, marketing 370. The ui number matters because it is the reference package.
- Phase 1 said "67 files do not mention tabular". The check is by file. There is a global `.tabular-nums` utility in `apps/web/app/index.css:122` and `apps/marketing/src/index.css:42`, so the number is opt-in by class. I confirmed the gap on named files (H-12) but did not enumerate every value.
- Phase 1 wanted `packages/ui/src/components/forms/Button.tsx` checked as a duplicate Button. It is not a duplicate. It is a two-line re-export of `primitives/Button` (`export * from "../../primitives/Button"`), imported only by the 7 calculators. It is a shim, not a second implementation (H-14).

## Findings

### [H-01] Non-existent semantic names compile to invalid CSS (cards transparent, error text not red)

- Severity: P1
- Location: `apps/web/app/components/forecast/SavingsForecaster.tsx:89,126`; `apps/web/app/components/forecast/UKTaxCalculator.tsx:134,171`; `apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:821`; `apps/web/app/components/mortgage/OverpayVsSaveCompare.tsx:440`; `apps/web/app/components/budget/UserProfilePanel.tsx:878`; `apps/web/app/components/home/WebBaselineSnapshotPreview.tsx:72,74`; `apps/marketing/src/components/BaselineSnapshotPreview.tsx:69,71`; `apps/web/app/components/budget/BudgetDashboard.tsx:612,614`
- Evidence: A grep for `color|borderColor|backgroundColor|bg` set to `"background"`, `"card"` or `"destructive"` finds 39, 32 and 29 uses in apps and ui. None of these are tokens (the `tokens.a11y.test.ts` test asserts those legacy namespaces were removed). The compiled web CSS shows the result: `.bg-c_card{background-color:card}`, `.bg-c_background{background-color:background}`, `.c_destructive{color:destructive}`, `.bd-c_destructive{border-color:destructive}`. Panda passes unknown strings through verbatim, and a browser discards them. Also `"success.bg"`, `"success.border"`, `"destructive.bg"`, `"destructive.border"` are used as tokens. The scales only have `success.50` and `.200`, so these are undefined too (6 uses). Panda is not in `strictTokens` mode (`apps/web/panda.config.ts`, `packages/ui/panda.config.ts`), so TypeScript and the build accept all of it.
- Impact: In `SavingsForecaster` and `UKTaxCalculator` the card and panel backgrounds do not render, so they show whatever is behind them; in dark mode that may mean unreadable panels (not verified visually). Validation and error text using `color="destructive"` falls back to the inherited colour, so errors are not red.
- Recommendation: Map mechanically: `card` to `surface.card`, `background` to `surface.canvas`, `destructive` to `status.danger.text` (text) or `status.danger.solid` (fills), `success.bg` and `success.border` to `status.positive.bg` and `status.positive.border`. Turn on `strictTokens: true` and `validation: "error"` (check the exact option names against Panda 2.5 docs) so this class of bug fails the build.
- Effort: M

### [H-02] `<body>` background uses an undefined CSS variable

- Severity: P1 (visual not verified at runtime; high confidence from CSS)
- Location: `apps/web/app/root.tsx:100,146`
- Evidence: `backgroundColor: "var(--colors-background)"` as an inline style on `<body>`. `--colors-background` is not defined anywhere in the compiled CSS (a search of `--colors-background:` in the built stylesheet returns nothing). The stylesheet rule `body{background-color:var(--colors-surface-canvas)}` (`apps/web/app/index.css:68`) is a lower-priority rule than the inline style. An inline declaration that references an undefined variable is invalid at computed-value time, so it resolves to `unset` (transparent) and overrides the working rule. Web's `panda.config.ts` has no `globalCss` (only ui's does), so nothing else sets the page background.
- Impact: The page background may be transparent (white viewport) in dark mode behind dark cards. Other files use the same dead variable: `DebtToWealthBridgeCard.tsx:106`, `RemortgageShockSim.tsx:154,185`, `AccountDetailChart.tsx:78` (`--colors-card`), `AddEditAccountsDialog.tsx:404,427,645,676`, `TaxIncomeSectionCard.tsx:289,305,649` (`--colors-destructive`).
- Recommendation: Replace with `var(--colors-surface-canvas)` and `var(--colors-surface-card)`, or better, remove the inline body style and rely on the `index.css` rule. Check in a browser in dark mode as part of the fix.
- Effort: S

### [H-03] Raw colours: 91 web files, and the top values are not tokens

- Severity: P1 (Law 2 violation on core pages)
- Location: `apps/web/app` (91 files with hex or rgb), `apps/marketing/src` (15 files), `apps/mobile-companion/src/screens` (141 lines)
- Evidence: Web hex occurrences by value: `#10b981` 98, `#ef4444` 61, `#6363f1` 48, `#f59e0b` 29, `#8b5cf6` 26, `#3b82f6` 19, `#d97706` 13, `#6366f1` 11. The rgba tints are mostly fixed-alpha versions of the same hues: `rgba(99,99,241,0.08)` 26, `rgba(99,102,241,0.08)` 11, `rgba(16,185,129,0.08/0.12)` 22, `rgba(139,92,246,0.12)` 11, `rgba(245,158,11,0.12)` 9, `rgba(239,68,68,0.1)` 9. There are 53 `boxShadow` lines with rgba in web. Worst directories by hex or rgb lines: `components/budget` 142, `components/tax` 58, `components/pension` 54, `components/home` 45, `components/dashboard/widgets` 44, `routes` 42, `components/savings` 41.
- Triage (what I read, not a full census):
  - **Legitimate, keep:** token definitions in `packages/ui/src/tokens` (about 103 lines), mobile `theme.ts` (44, but see H-09), bank brand colours (`BankConnectionsList.tsx:34-40` `#00aeef`, `#db0011`, `#ec0000`; `ConnectBankWizard.tsx:46`), `ColorPalette.tsx` (documentation component), the `var(--colors-x, #fallback)` fallbacks in `chartTheme.ts`. Bank colours should move to one `bankBrandColors` constants file.
  - **Charts do not need raw values.** Recharts accepts `var(--colors-chart-primary)` for `stroke`, `fill` and `stopColor`. Panda also exposes `token("colors.chart.primary")`. All 9 recharts files can use the `chart.*` tokens. Today the chart namespace has almost no consumers: a grep for `chart.series|wealth|debt|primary` in web `app` returns 0.
  - **Violations, by theme:** (a) status greens, reds and ambers as text or fills (`#10b981`, `#ef4444`, `#f59e0b`, `#d97706`), mapping to `status.positive|danger|warning.{text,solid}` or `chart.wealth|debt|warning`; (b) brand indigo (`#6363f1`, `#6366f1`), mapping to `primary`, `primary.subtle` or `chart.primary`; (c) fixed-alpha tinted backgrounds, mapping to `status.*.bg` and `primary.subtle`, whose dark values are already exactly these alphas (`rgba(16,185,129,0.12)` etc.), so the tokens match; (d) purple `#8b5cf6` (maps to `chart.accentPurple`, but note that token is purple.600 `#7c3aed` in light, so colours will shift slightly); (e) shadows; (f) `#3b82f6` blue (see below).
  - **Tokens that are genuinely missing:** a blue or "info" accent that matches existing usage (`#3b82f6` 19 uses, `Section24Calculator.tsx:69` `rgba(59,130,246,0.12)`; the `info` scale is sky `#0ea5e9`, not blue); a modal scrim (`rgba(0,0,0,0.45)` in `ColorPalette.tsx:177` and similar); `shadow.*` semantic tokens beyond `card`, `cardHover` and `floating` (only 3 exist, and the `xs` and `*Light` primitives have no dark variant, so the 53 inline rgba shadows have no home); a neutral zinc grey (`#a1a1aa`, 8 uses, probably should be `text.muted` or `status.neutral.solid`); `status.*.text` on solid fills (see H-07).
  - **Light/dark risk:** a hard-coded `#10b981` as text is 2.54:1 on white and 2.42:1 on slate-50 (AA fails). The fixed colour does not switch to `status.positive.text` (success.700 in light). Examples: `UKTaxCalculator.tsx:527`, `ScenarioLayersWidget.tsx:134,216`, `InteractiveFinancialTeaser.tsx:539`. `#f59e0b` on white is 2.15:1.
- Impact: Inconsistent colour, AA contrast failures on financial figures in light mode, no dark-mode adaptation for raw values (web has only 12 `_dark` pairings in components).
- Recommendation: Do the mapping as a codemod (a single script with a hex-to-token table, reviewed per directory), starting with the three highest-traffic groups: `#10b981`/`#ef4444`/`#f59e0b` text and fills, `#6363f1`, and the `rgba` tints. Add the 4 missing tokens first (scrim, extra shadows, a blue accent decision, neutral). Ratchet with H-17.
- Effort: L (multi-day; mechanical but about 90 files)

### [H-04] `#6363f1` is a stray brand colour, not `indigo.500`

- Severity: P2
- Location: `apps/web/app/types/budget.ts:73`, `apps/web/app/utils/pageConfig.ts:48,97`, `apps/web/app/components/savings/SavingsSummaryCards.tsx:144`, `SavingsAccountsList.tsx:389`, `SavingsForecasterCard.tsx:219,360`, `apps/web/app/index.css:47` (fallback), `apps/mobile-companion/src/theme.ts:61,77,90` (`#6363F1` as indigo 400 or 600)
- Evidence: `colors.indigo.500` is `#6366f1` and `indigo.600` is `#4f46e5` (`packages/ui/src/tokens/index.ts`). `#6363f1` is none of them: 48 occurrences in web, 14 in marketing, plus `rgba(99,99,241,*)` (about 47 lines). It looks like the old brand colour that predates the tokens. It is 4.58:1 on white (barely passes), while `primary` in light mode is the much darker `#4f46e5`.
- Impact: Two indigos on screen. The CTA is `#4f46e5`, charts and icons are `#6363f1`.
- Recommendation: Pick one (use `primary` or `chart.primary`), replace all occurrences including the `rgba(99,99,241,*)` tints. Fix the mobile theme to read the token.
- Effort: M

### [H-05] `FLP*` layer duplicates `packages/ui`; most of ui is unused by web

- Severity: P1 (Law 3 and the design system's purpose)
- Location: `apps/web/app/components/core/**` vs `packages/ui/src/{primitives,patterns}`
- Evidence: `apps/web` imports from `@repo/ui` in only 8 non-test files (7 calculator wrappers, plus `McpConnectionCard`, `PayoffStrategyControls`, `PromoCliffTracker`, `SandboxTemplates`, `NavMenu`, `UserProfilePanel`, `FLPButton`, `FLPLinkButton`). `KpiStrip`, `SimulatorSplitLayout`, `PageHeader`, `KpiCard`, `CollapsibleDrawer` and `Card` are used only in `features/sandbox/.../SandboxTemplates.tsx`. The real pages (`MortgageContainer.tsx:451,646,858,1088`, `DebtContainer.tsx:307`) hand-roll `gridTemplateColumns` with `repeat(5, 1fr)` (that is a 5-wide KPI row, which Law 3 forbids) and 12-column grids. Web has 185 raw `<button`, 12 raw `<table` and 9 files with raw `<input type="range">`.
- Mapping (all web paths under `apps/web/app/components/core`, importers counted over non-test, non-core web files):

| Web component                                       | Importers                                       | ui equivalent                                                                        | Verdict                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FLPButton`                                         | 40                                              | `primitives/Button`                                                                  | Already a wrapper (`FLPButton.tsx:1`). `mappedVariant` at `FLPButton.tsx:38-49` is an identity map. Adopt: replace with `Button` plus a mobile `minH` from a Panda breakpoint, then delete the wrapper.                                           |
| `FLPLinkButton`                                     | n/a                                             | `buttonVariants`                                                                     | Keep as thin wrapper or move into ui as `ButtonLink`.                                                                                                                                                                                             |
| `FLPButtonGroup`                                    | n/a                                             | none                                                                                 | Promote to ui or delete if unused.                                                                                                                                                                                                                |
| `FLPCard` + `FLPCardStyles`                         | 31                                              | `primitives/Card` (`elevation`, `padding`)                                           | Merge. FLPCard's `interactive` maps to `elevation="interactive"`; its `isMobile` is replaced by Card's responsive padding.                                                                                                                        |
| `FLPModal`                                          | 6 (plus 11 more files using raw Radix `Dialog`) | none                                                                                 | Gap in ui. Promote `FLPModal` to `ui/primitives/Dialog` first, then migrate the 17 dialog files.                                                                                                                                                  |
| `FLPInput`, `FLPSelect`, `FLPCheckbox`              | 3, 2, n/a                                       | none                                                                                 | Gap in ui. Promote to ui.                                                                                                                                                                                                                         |
| `FLPSlider`                                         | **0**                                           | `primitives/SliderField`                                                             | Delete. Nothing imports it. The 9 raw range inputs (`SavingsForecaster`, `UKTaxCalculator`, `TaxTrapAlertBanner`, `PayoffStrategySwitcher`, the 4 mortgage components) should move to `SliderField`. Only `PayoffStrategyControls` uses it today. |
| `FLPTable`                                          | **0**                                           | `primitives/Table`                                                                   | Delete; migrate the 12 raw `<table`s to ui `Table`. FLPTable also uses the non-canonical `backgroundColor: "surface"`.                                                                                                                            |
| `FLPTabs`                                           | 1                                               | `primitives/SegmentedTabs`                                                           | Merge. `UserProfilePanel` already uses `SegmentedTabs`.                                                                                                                                                                                           |
| `FLPBadge`                                          | 1                                               | `primitives/StatusBadge`                                                             | Merge. Same variants except `negative` vs `danger` (H-06).                                                                                                                                                                                        |
| `FLPProgressBar`                                    | 1                                               | `primitives/ProgressBar`                                                             | Merge. Same `negative` vs `danger` drift.                                                                                                                                                                                                         |
| `StatMetric`                                        | 1                                               | `primitives/KpiCard`                                                                 | Merge into KpiCard.                                                                                                                                                                                                                               |
| `CollapsibleSection`                                | 1                                               | `primitives/CollapsibleDrawer`                                                       | The prop API is identical (`title, badge, subtitle, defaultOpen, children, className`). Delete and swap.                                                                                                                                          |
| `FLPBox`                                            | 6                                               | Panda `flex`, `stack`, `grid`, `box` patterns                                        | Delete. It is a Chakra-style prop shim.                                                                                                                                                                                                           |
| `FLPText`, `FLPHeading`                             | 71, 67                                          | none                                                                                 | Gap in ui. Promote as `Text` and `Heading`, with a typed colour prop (see below). Heaviest-fan-in components, so do the typed prop first.                                                                                                         |
| `FLPSpinner`, `AccountsCard`, `TaxDisclaimerButton` | n/a                                             | none                                                                                 | Domain or niche. Keep in web, but colocate.                                                                                                                                                                                                       |
| (none)                                              | n/a                                             | `KpiStrip`, `SimulatorSplitLayout`, `PageHeader`, `SectionBand`, `GlobalBaselineBar` | Adopt in the real pages (MortgageContainer, DebtContainer, pension, forecast).                                                                                                                                                                    |

- A further root issue: `FLPText`, `FLPHeading` and `FLPBox` take `color?: string`, `fontSize?: string`, etc. (`FLPText.tsx:6-8`), then call `css({ color })` at render. There is no type safety and Panda's static extractor cannot see the value. The compiled CSS only works because the same literals appear elsewhere in the source (I checked the 15 most common `color=` values on `FLPText`/`FLPHeading`/`FLPBox`; all have a generated class, but only by luck of other literal usage). A new colour used only through an `FLP*` prop would produce no CSS. They also accept stock Panda palette names that are not Flump tokens (`blue.500` 7, `red.700` 2, `red.600` 2, `green.700` 1, `green.600` 1).
- Impact: Two component systems, two sets of props (`isMobile` plus a context versus Panda breakpoints), the system's patterns used by one page.
- Recommendation: Order: (1) type `Text`, `Heading` colour props to the 6 namespaces and promote them; (2) promote `Dialog`, `Input`, `Select`, `Checkbox`; (3) delete `FLPSlider`, `FLPTable`, `FLPBox`, `CollapsibleSection`, and adopt/merge the rest per the table; (4) adopt `KpiStrip`/`SimulatorSplitLayout` in the 5 simulator pages as each is refactored. Keep `FLP*` as re-exports for one release to avoid a big-bang diff.
- Effort: L

### [H-06] Variant and prop naming drift between the two layers

- Severity: P3
- Location: `FLPBadge.tsx:4`, `FLPProgressBar.tsx:5` vs `StatusBadge.styles.ts:17-48`, `ProgressBar.styles.ts:22-27`; `FLPSlider.tsx` vs `SliderField.tsx`; `FLPCard.tsx` vs `Card.styles.ts`; `FLPModal.tsx:20-23`
- Evidence:
  - Status names: ui uses `positive|warning|danger|info|neutral` (matching `status.*`); `FLPBadge` and `FLPProgressBar` use `negative` for the same thing. Button uses `destructive`. So "bad" is `danger`, `negative` and `destructive` in three places.
  - Slider units: `FLPSlider` has `unit` and `formatValue`; `SliderField` has `unitPrefix` and `unitSuffix`.
  - Card: `FLPCard` has `variant: "desktop" | "mobile"` and `interactive`; `Card` has `elevation` and `padding`. `variant` is a responsive switch in one and a visual style in the other.
  - Responsive: FLP components take `isMobile` and read a React context; ui components use Panda breakpoints (for example `Card.styles.ts:30` `p: { base, md }`).
  - Modal: `confirmButton.colorPalette: string` is a Chakra-era name; the only values used are `"blue"` and `"red"` (stock Panda palettes, not Flump tokens).
- Impact: Mapping friction during adoption, and the stock palettes leak in.
- Recommendation: Standardise on the `status.*` vocabulary (`danger`, not `negative`) and Panda breakpoints, not `isMobile`. Document a one-page "prop vocabulary" (`variant` is the visual style, `tone` or `intent` is semantic status, `size` is `sm|md|lg`) in `docs/agents/component-guidelines.md`.
- Effort: S for the rename; M with call-site updates

### [H-07] Dark-mode parity: tokens complete, but two button pairs fail contrast and tests miss them

- Severity: P1 (WCAG AA on primary and destructive actions in dark mode)
- Location: `packages/ui/src/tokens/index.ts:166-172` (primary), `:196-201` (danger), `packages/ui/src/primitives/Button/Button.styles.ts:26-29,59-62`; `packages/ui/src/tokens/tokens.a11y.test.ts`
- Evidence:
  - Parity: I read every entry in `semanticTokens.colors`. All of `primary`, `surface`, `text`, `border`, `status.*` and `chart.*` define both `base` and `_dark`, except `primary.foreground` (`#ffffff` in both, fine). Shadows `card`, `cardHover`, `floating` have `_dark`. Parity gaps: the primitive shadows `xs`, `cardLight`, `cardHoverLight`, `floatingLight` have no dark counterpart and are used raw. `surface.DEFAULT` is a 7th key beyond the documented six (used by `FLPTable.tsx` and 48 `var(--colors-surface…)` references) and is not in the guidelines.
  - Contrast (computed with the WCAG formula): white on `primary` in dark (`indigo.500` `#6366f1`) is 4.47:1 (AA for normal text needs 4.5). White on `status.danger.solid` in dark (`destructive.500` `#ef4444`) is 3.76:1, used as the background of the destructive button (`Button.styles.ts:59-62`, `color: text.onContrast`). In light, danger is 4.83:1 and primary 6.29:1, so only dark fails. Also `status.positive.solid` (success.600) and `status.warning.solid` (warning.600) under white text are 3.77:1 and 3.19:1, so any solid badge or fill that carries text will fail; currently they are used as bar fills only (`ProgressBar.styles.ts:24-26`).
  - `tokens.a11y.test.ts` checks only: three light text pairs, two dark text pairs, and three light badge pairs. No dark badge pairs, no solid-with-foreground pairs, no border or focus-ring contrast, no automated "every semantic token has `_dark`" assertion.
- Impact: The primary CTA is borderline and the destructive confirmation button fails AA in dark mode.
- Recommendation: In dark, use `indigo.600` for `primary` (or a dark foreground) and `destructive.600` for `status.danger.solid`; add contrast and parity assertions to `tokens.a11y.test.ts` (iterate over `semanticTokens` programmatically rather than naming pairs); add `shadows` dark parity.
- Effort: S

### [H-08] Law 1 colocation gap and a realistic migration order

- Severity: P1 (Law 1 on all of `apps/web` components) with a P2 plan item for marketing
- Location: `apps/web/app/components` (about 80 non-test source files in domain folders, 21 of them `core`), `apps/web/app/containers` (9), `apps/marketing/src/{components,pages}` (15)
- Evidence: Phase 1 counted 111 web and 15 marketing files. By my count of domain folders: `budget` 6 files and 5,659 lines, `home` 12 and 3,669, `dashboard` 12 and 3,602, `pension` 5 and 2,992, `savings` 6 and 2,395, `core` 21 and 2,408, `containers/tax` 1 file and 2,198 lines. There are 0 `*.styles.ts` files in web components or containers (styles are inline `css()` or `style={{}}`), 89 test files and 21 stories files for roughly 90 components. Moving files into folders alone would not meet Law 1: `ComponentName.tsx` must be "pure React, zero `style={{}}`", and the biggest files carry hundreds of those (`TaxContainer` 130 `style={{` lines).
- Realistic plan, ordered by leverage:
  1. **Guard first (S).** Make `architecture.laws.test.ts` auto-discover directories (today it hard-codes 8 `it` blocks and a few feature folders) and add a ratchet: a JSON list of known-flat legacy files that may shrink but not grow. New flat `.tsx` in `components/` or `containers/` fails CI.
  2. **Scaffold (S).** A `bun run new:component Name --scope web-feature|ui` generator that creates the 5 files, so the cost of compliance is near zero.
  3. **Retire `components/core` by promotion, not by moving (M-L).** Doing H-05 shrinks the largest folder (21 files) and the highest fan-in components. Do this before any bulk move.
  4. **Shared and leaf widgets (M each):** `navigation` (7), `dashboard/widgets` (12 small widgets, repeated structure, good codemod candidates), `structure/header`, `charts`.
  5. **De-duplicate `home` against marketing (M).** `apps/web/app/components/home/{FeaturePillars,ComparisonMatrix,InteractiveFinancialTeaser,SecurityPrivacySection,WebHowItWorksSection,WebBaselineSnapshotPreview}` are forks of the same-named marketing components (about 4,400 lines in total across both; `ComparisonMatrix` still differs by 321 diff lines, so they have diverged). Decide which app owns each, and move the shared ones to `packages/ui`.
  6. **Domain by domain into `features/<domain>/components/` (L each):** smallest first (`accounts`, `setup`, `forecast`, `mortgage`), then `tax`, `debt`, `savings`, `pension`, `budget`. For each, split the large files while moving, since otherwise colocation is cosmetic: `TaxContainer` (2,198 lines), `UserProfilePanel` (1,348), `RunwayCalculator` (1,236), `MortgageContainer` (1,225), `PensionForecasterCard` (1,180), `BudgetDashboard` (1,012). Budget 3 to 5 days per big domain, so overall several weeks. Pair each domain with its token and `style={{}}` cleanup (H-03) so each file is touched once.
  7. **Marketing (M).** 15 files; marketing has fewer hex lines (15 files) and already wraps `@repo/ui`. Do it in one PR after the home de-duplication.
  8. **Relax the rule where it costs more than it gives (policy).** Requiring `.styles.ts`, `.stories.tsx` and `.test.tsx` for every feature-level component will produce many empty stories. Consider requiring all 5 files for `packages/ui` and shared components, and only `Name.tsx`, `index.ts` and a test for feature-internal ones. That is a policy decision for the owner.
- Impact: The rule exists but is violated by about 95 percent of web components, so it is not a usable standard.
- Recommendation: As above; migrate-on-touch for anything not in the ordered list.
- Effort: L

### [H-09] Mobile `theme.ts` diverges from web tokens

- Severity: P2
- Location: `apps/mobile-companion/src/theme.ts:1,2-18,43-117`
- Evidence: The file imports the tokens by a relative path (`../../../packages/ui/src/tokens`), although `package.json:20` already depends on `@repo/ui`. It reads only the primitive `colors`, not `semanticTokens`. `extractValue` flattens any `{base, _dark}` pair to `base` (`:7-9`), so semantic dark values are never read. `getThemeColors` then hard-codes dark and light values that differ from web: dark `background` `#020617` (web `dark.canvas` is `#0B0F17`), `surface` and `card` `#0f172a` (web `#141A26`), `border` `rgba(30,41,59,0.5)` (web `rgba(255,255,255,0.08)`), text `#ffffff` (web `#f8fafc`). In light mode it inverts the slate scale: `slate.900` becomes `#ffffff`, `slate.950` `#f8fafc`, `slate.300` `#64748b`, `slate.700` `#cbd5e1` (`:100-109`), and it redefines indigo steps (`indigo.600` is `#6363F1`, not `#4f46e5`). Screens then use a scale name that means the opposite colour depending on theme (298 `colors.slate[...]` or similar references in screens). There are also 141 raw hex or rgb lines in `screens/` and 7 separate `Intl.NumberFormat` helpers.
- Impact: Mobile and web look different in dark mode; a "slate.900" reference is a dark background in one theme and white in the other, which is hard to reason about and breaks when tokens change. Light muted text `slate.500` on `slate.50` is 4.55:1, on the edge.
- Recommendation: Add a small `toNativeTheme(semanticTokens, mode)` to `packages/ui` that resolves `base` or `_dark` for all six namespaces to concrete values, and export it. Mobile imports `@repo/ui/native-theme`, screens use `theme.surface.card`, `theme.text.muted` and so on, with no scale inversion. Put the shared `formatCurrency` into `@flump/common`. Do this together with replacing the 141 screen hex values.
- Effort: M for the theme; L including screens

### [H-10] Emotion is vestigial in `apps/web`; removal is small

- Severity: P3 (cleanup that removes a double-style SSR path)
- Location: `apps/web/app/createEmotionCache.ts`, `entry.client.tsx:7,19-37,63-65`, `entry.server.tsx:3-4,14,45-58`, `context.tsx`, `apps/web/package.json:11-13`
- Evidence: A grep for `@emotion` in web `app` returns only `createEmotionCache.ts`, `entry.client.tsx` and `entry.server.tsx`. No component imports `styled`, `css` from Emotion, or `jsxImportSource` (checked `vite.config.mts`, `tsconfig.json`, `react-router.config.ts`, `.storybook`). There is no other CSS-in-JS library. The three files exist only to create a cache, wrap the tree in `CacheProvider`, and run `renderStylesToNodeStream()` on the response, which extracts zero rules because nothing emits Emotion styles. `ClientStyleContext` and `ServerStyleContext` in `context.tsx` have no consumers besides `entry.client.tsx`. Panda emits static CSS, so it needs no SSR extraction. This is a Chakra-era leftover (the `colorPalette` props and `isMobile` pattern point the same way).
- Impact: Dead dependency (three packages), a pointless `PassThrough` stream in every response (`entry.server.tsx:52-56`), and a misleading impression of two styling systems.
- Recommendation: Delete `createEmotionCache.ts` and `context.tsx` if unused; remove the providers from both entries; pipe `renderToPipeableStream` straight into the response; remove `@emotion/cache`, `@emotion/react`, `@emotion/server` from `package.json`. Run the web tests and one SSR smoke check. The real double-styling problem is not Emotion but Panda plus inline `style={{}}` (1,574 lines in web) and `var(--colors-…)` strings (601 in web), covered by H-03 and H-17.
- Effort: S

### [H-11] `packages/ui` calculators break the laws they are meant to demonstrate

- Severity: P2
- Location: `packages/ui/src/calculators/{MortgageVsIsa,Section24,DebtSnowball,TaxTrap,ZeroPercentCliff,StudentLoan,OverdraftCost}Calculator/*.tsx`
- Evidence: 201 `style={{` lines in ui non-test source, 42 in `MortgageVsIsaCalculator.tsx`, 39 in `Section24Calculator.tsx`, 32 in `DebtSnowballCalculator.tsx`, 30 in `TaxTrapCalculator.tsx`. 143 `var(--colors-…)` references in ui, mostly in the same files. Raw rgba tints with fixed alpha (`TaxTrapCalculator.tsx:68,86,287-289`, `StudentLoanCalculator.tsx:172-173`) and raw hex (`StudentLoanCalculator.tsx:176` `#fca5a5` and `#6ee7b7`, which are primitive `destructive.300` and `success.300` and do not adapt to dark mode). Non-token shadows in `*.styles.ts` (`boxShadow: "0 8px 30px rgba(0,0,0,0.06)"`, 3 files). `architecture.laws.test.ts` scans only 3 McpConnectionCard, McpSpotlight and McpPage directories for inline style, hex and primitives, so these pass.
- Impact: The reference package does not follow the guideline ("zero inline style={{}}"), so contributors copy the wrong pattern.
- Recommendation: Move each calculator's inline styles into its `.styles.ts` with `cva`/`sva`, add the missing semantic tokens, and extend the strict scan in the architecture test to all of `packages/ui/src` (excluding `foundations/ColorPalette`).
- Effort: L

### [H-12] Tabular numbers and number formatting gaps

- Severity: P2
- Location: `apps/web/app/components/dashboard/widgets/AccountsWidget.tsx:222,242,245` (0 tabular usage in file), `HomeHero.tsx`, `DebtAccountsList.tsx`, `TaxWidget.tsx` (0 each); `apps/web/app/routes/app.onboarding.tsx:443,721,1023,1102,1174,1196,1218`; `GlobalBaselineScenarioBar.tsx:115`; `DebtContainer.tsx:193`; `WealthCheckHeroWidget.tsx:660`; `AccountDetails.tsx:94`; `packages/ui/src/primitives/Table/Table.styles.ts`, `patterns/KpiStrip/KpiStrip.styles.ts`
- Evidence: There are 81 `tabular-nums` or `fontVariantNumeric` occurrences against 71 files that format numbers. I confirmed zero occurrences in `AccountsWidget`, `HomeHero`, `DebtAccountsList`, `TaxWidget`, although `AccountsWidget` renders `formatCurrency(...)` for net worth and totals. Utility `.tabular-nums` exists globally (`index.css:122`), so it is opt-in per element. In ui, `Table.styles.ts` has no tabular rule (it relies on a class applied in `Table.tsx`), and only 3 of 9 primitive style files mention it. There are 10 `toLocaleString()` calls with no locale in web (listed above), which depend on the viewer's browser locale and violate the en-GB rule. `AccountDetails.tsx:94` uses `toLocaleString("default", …)`. At least four sites build `£${n.toLocaleString()}` by hand (`app.onboarding.tsx:721`, `GlobalBaselineScenarioBar.tsx:115`), bypassing `useFormatCurrency`, so a non-GBP user sees `£`. Separately, `useFormatCurrency` chooses a locale per currency (`en-US`, `de-DE`, `en-IN`, …) and falls back to en-GB, while Law 2 says en-GB. That may be the better product behaviour, but the law and code disagree.
- Impact: Misaligned digits in tables and widgets; locale-dependent output; wrong currency symbol for non-GBP profiles.
- Recommendation: Add one `<Money>`/`<Num>` component (or a `numeric` Panda text style) in ui that applies `tabular-nums` and routes through the formatter, then replace call sites; make the 10 `toLocaleString()` use the formatter with an explicit locale; decide whether the law should say "user currency locale, en-GB default" and update `AGENTS.md`. A grep-based check in CI (H-17) can enforce "no bare `toLocaleString()`".
- Effort: M

### [H-13] The architecture test is the only enforcement and covers little

- Severity: P2
- Location: `packages/ui/src/tokens/architecture.laws.test.ts:11-30,119-147,150-193`; `biome.json`; `.github/workflows/ci-pipeline.yml`
- Evidence: The test hard-codes directories. The token-boundary check (`deprecatedPatterns`) is a substring list applied to 7 directories and does not scan `apps/web` components. The strict hex, primitive and inline-style check covers only 3 hand-listed directories. The primitive regex is `/\b(slate|indigo|emerald|amber|red|purple|cyan)\.[0-9]{2,3}\b/`, which misses the names this repo actually uses: `success`, `warning`, `destructive`, `info`, `dark` (the real leaks are `success.500` 32, `warning.500` 16, `destructive.500` 6 in web). Biome has no colour or style rule configured. CI runs lint, check-types, test and build only; the Storybook a11y and `play()` tests are not executed (Phase 0 section 3).
- Impact: Violations accumulate silently; the one strict scan guards three folders.
- Recommendation: See H-17.
- Effort: M

### [H-14] Small structural items in `packages/ui`

- Severity: P3
- Location: `packages/ui/src/components/forms/Button.tsx`, `components/layout/{SectionBand,AppSectionDivider}.tsx`, `src/index.tsx`
- Evidence: `components/forms/Button.tsx` is a shim re-exporting `primitives/Button`; 7 calculators import it via `../../components/forms/Button.js` instead of the primitive. `components/layout/SectionBand.tsx` and `AppSectionDivider.tsx` sit beside `patterns/SectionBand` and `patterns/AppSectionDivider` (same names; not verified whether they are also shims). `components/` is not in `index.tsx` exports and is not covered by the architecture test.
- Impact: Two import paths for Button; stale folder.
- Recommendation: Point the calculators at `../../primitives/Button`, delete `components/`, and confirm the two layout files are shims before removing.
- Effort: S

### [H-15] Generated and stock Panda palettes widen the surface

- Severity: P3
- Location: `packages/ui/panda.config.ts:14-17`, `apps/web/panda.config.ts`, `packages/ui/panda.preset.ts`
- Evidence: Both configs use `presets: ["@pandacss/preset-base", "@pandacss/preset-panda", flumpPreset]` and the flump preset uses `theme.extend`, so Panda's entire stock palette stays available next to Flump's. This is why `blue.500`, `red.700`, `green.600` compile without any error. The web and ui packages each run their own Panda codegen and `include` the ui source from web (`apps/web/panda.config.ts:12`), so styles for ui components are generated in two outputs.
- Impact: Off-palette colours are accepted by the type system.
- Recommendation: Use `theme.tokens.colors` (not `extend`) to replace the stock colour palette, or enable `strictTokens`. Verify that the doubled generation of ui styles is intended.
- Effort: S

### [H-16] Storybook theme coverage is global but a11y is not enforced (carry-over)

- Severity: P3 (owned by Track J)
- Location: `apps/web/.storybook/preview.tsx:31-34,97-126`
- Evidence: The preview has a side-by-side light and dark decorator, so dark coverage exists for every story. Baseline already notes `test:storybook` only builds and does not run `play()` or axe. Per Phase 1, 33 of 54 stories have no `play()`.
- Impact: The "zero a11y violations in both modes" part of the Definition of Done is not checked.
- Recommendation: Handled in Track J; mentioned because enforcement of this track depends on it.
- Effort: M

### [H-17] Enforcement recommendation: yes, via a ratchet, Panda strictness and a small Biome plugin

- Severity: P2 (recommendation, not a defect)
- Location: `packages/ui/src/tokens/architecture.laws.test.ts`, both `panda.config.ts`, `biome.json`, CI
- Evidence/reasoning: The violations are mechanical and countable, and the laws already exist in prose. A hard "zero" gate would block every PR today (793 web hex lines). A ratchet lets the count only go down.
- Recommendation, in priority order:
  1. **Panda `strictTokens: true`** (and `validation: "error"`, verify names) in `apps/web`, `apps/marketing` and `packages/ui`. This alone would have caught H-01 (about 100 invalid names) at build time. Expect a one-time burst of fixes.
  2. **Ratchet test.** Extend `architecture.laws.test.ts` to scan every `.tsx` and `.ts` under `apps/web/app`, `apps/marketing/src` and `packages/ui/src` (except `tokens/`, `ColorPalette`, a `bankBrandColors` file). Assert counts of: hex and `rgb(a)` literals, `style={{`, `var(--colors-`, bare `toLocaleString()`, primitive scale names (include `success|warning|destructive|info|dark`) are each `<=` a committed baseline JSON per file. The baseline may only shrink. New files start at zero.
  3. **Auto-discovered colocation check** (H-08 step 1) with the same baseline mechanism.
  4. **Biome GritQL plugin** (Biome 2.x supports plugins) for `style={{` and raw colour string literals in `apps/**`, set to `warn` first so it shows in review. Verify the exact plugin syntax on 2.6.x before relying on it. Biome has no built-in rule for this.
  5. **CI**: add `storybook` a11y run via Track J, and make `bun run lint` non-writing in CI (Phase 0 noted `--write` hides problems).
  6. Do not enforce `fontVariantNumeric` by grep; use the `<Money>` component (H-12) so there is a single place that is correct.
- Effort: M

## Token map (quick reference for the codemod)

| Raw value                                 | Token to use                                                   | Note                                            |
| ----------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| `#10b981` text                            | `status.positive.text`                                         | raw value is 2.54:1 on white                    |
| `#10b981` fill or chart                   | `status.positive.solid` or `chart.wealth`                      |                                                 |
| `#ef4444` text                            | `status.danger.text`                                           |                                                 |
| `#ef4444` fill or chart                   | `status.danger.solid` or `chart.debt`                          |                                                 |
| `#f59e0b`, `#d97706`                      | `status.warning.text`, `status.warning.solid`, `chart.warning` |                                                 |
| `#6363f1`, `#6366f1`, `rgba(99,99,241,*)` | `primary`, `primary.subtle`, `chart.primary`                   |                                                 |
| `#8b5cf6`                                 | `chart.accentPurple`                                           | light shifts to purple.600                      |
| `#3b82f6`                                 | missing                                                        | decide: map to `status.info.*` or add an accent |
| `rgba(16,185,129,.08-.12)`                | `status.positive.bg`                                           |                                                 |
| `rgba(239,68,68,.06-.12)`                 | `status.danger.bg`                                             |                                                 |
| `rgba(0,0,0,.02-.06)` surfaces            | `surface.sunken` or `surface.subtle`                           |                                                 |
| rgba box shadows                          | `shadows.card`, `cardHover`, `floating`                        | add 1-2 more                                    |
| `"card"`, `"background"`, `"destructive"` | `surface.card`, `surface.canvas`, `status.danger.*`            | invalid today (H-01)                            |

## Limits

- No runtime or browser pass. H-01 and H-02 are derived from the compiled CSS and source, not seen in a browser, so the visible effect (for example white body behind dark cards) should be confirmed once.
- The hex triage is by top values and sampled directories, not a line-by-line classification of all 1,245 lines. The `rgba` shadow and tint groupings are by value counts.
- I did not run Storybook, axe or the vitest suite. Contrast ratios are calculated from token values using the WCAG formula, not measured in the UI.
- Importer counts for `FLP*` components are by file-level word match (`\bFLPButton\b`) across web non-test, non-story, non-core files, so they could over-count files that mention a name in a comment.
- I did not check whether `components/layout/{SectionBand,AppSectionDivider}.tsx` are also shims.
- Table-over-8-rows and `CollapsibleDrawer` compliance (Law 3) were not audited here beyond adoption counts.
- Tools: the plan named design and design-system skills and the code-review Standards axis. I used the repo standard (`AGENTS.md`, `docs/agents/component-guidelines.md`) directly rather than loading the skills, since this was a read-only analysis of code.

## Quick wins

1. Fix the `"card"`, `"background"` and `"destructive"` names and the dead `var(--colors-background|card|destructive)` references (H-01, H-02); about 130 mechanical replacements.
2. Set `strictTokens: true` after step 1 so it cannot recur.
3. Delete `FLPSlider`, `FLPTable` (zero importers) and the identity `mappedVariant` in `FLPButton.tsx:38-49`.
4. Swap `CollapsibleSection` for `CollapsibleDrawer` (identical props, one call site).
5. Remove Emotion (H-10): 3 files, 3 dependencies.
6. Dark-mode `primary` and `status.danger.solid` to the 600 steps, and add dark contrast and parity assertions to `tokens.a11y.test.ts` (H-07).
7. Replace the 10 bare `toLocaleString()` calls and the `£${…}` string builds with the formatter (H-12).
8. Repoint the 7 calculators from `components/forms/Button` to `primitives/Button` and delete `components/` (H-14).
9. Replace the stray `#6363f1` with `primary` or `chart.primary` (H-04).
