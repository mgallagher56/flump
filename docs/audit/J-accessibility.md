# Track J - Accessibility (WCAG 2.2 AA), code and token analysis

Method: static reading of code and tokens, plus a contrast script (`/private/tmp/claude-501/-Users-marcgallagher--claude-spares-spare-3qw9Xl/f53838d8-2f6a-4832-a92e-67fe1d0489a4/scratchpad/contrast.ts`, which imports a copy of `packages/ui/src/tokens/index.ts`). No browser, no screen reader, no runtime pass. Skill method: `design-skills:accessibility-audit` (POUR structure, severity by user impact). Product code untouched.

## Contrast results (computed, WCAG relative luminance)

Semi-transparent tokens (for example `status.*.bg`, `primary.subtle`) were composited over `surface.card` first. Thresholds: 4.5 for text, 3 for UI components and graphics.

### Passes (no action)

- `text.primary/secondary/muted` on every surface in both themes: light 6.92 to 17.85, dark 6.36 to 18.33. The lowest is `text.muted` on `surface.overlay` in dark mode, at 6.36.
- `status.*.text` on `status.*.bg` and on `surface.card/canvas`, both themes: 4.80 to 11.73. The lowest is light `warning.text` on `surface.canvas`, at 4.80.
- `border.focusRing` on card and canvas: light 6.29 / 6.01, dark 5.84 / 6.43.
- Dark chart series on card: 5.84 to 10.44.

### Failures

| Pair                                                          | Theme        | Ratio                                               | Needed | Where it bites                                                          |
| ------------------------------------------------------------- | ------------ | --------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `primary.foreground` (#fff) on `primary.DEFAULT` (indigo.500) | dark         | **4.47**                                            | 4.5    | Primary `Button` (`Button.styles.ts:27-28`)                             |
| `primary.foreground` on `primary.hover` (indigo.400)          | dark         | **2.98**                                            | 4.5    | Primary `Button` hover (`Button.styles.ts:29`)                          |
| `primary.DEFAULT` as text on `surface.card`                   | dark         | **3.90**                                            | 4.5    | 67 `color: "primary"` lines in web, e.g. the `SliderField` value pill   |
| `primary.DEFAULT` text on `primary.subtle`                    | dark         | **3.44**                                            | 4.5    | Subtle primary chips                                                    |
| `border.input` on `surface.card`                              | light / dark | **1.48 / 1.25**                                     | 3      | Input field boundary                                                    |
| `border.DEFAULT` on `surface.card`                            | light / dark | **1.23 / 1.25**                                     | 3      | Boundary of inputs that use `borderColor: "border"` (`FLPInput.tsx:53`) |
| `border.strong` on `surface.card`                             | light / dark | 1.48 / 1.64                                         | 3      | Toggle off-state border                                                 |
| `chart.warning` and `chart.series5` on card                   | light        | **2.15**                                            | 3      | 5th series and warning lines                                            |
| `chart.grid`                                                  | both         | 1.13 / 1.17                                         | n/a    | Decorative gridlines, acceptable                                        |
| white on `status.*.solid`                                     | light        | positive 3.77, warning 3.19, info 4.10, danger 4.83 | 4.5    | Any white-text-on-solid badge. Usage not verified                       |
| white on `status.*.solid`                                     | dark         | positive 2.54, warning 2.15, info 2.77, danger 3.76 | 4.5    | Same, worse in dark                                                     |
| `status.*.border` on card                                     | both         | 1.23 to 1.74                                        | 3      | Decorative, fine if text and icon carry meaning                         |

Hardcoded hex that bypasses the tokens (Track H counts 1,245 colour literals). Computed on white:

- `#10b981` 2.54
- `#f59e0b` 2.15
- `#ef4444` 3.76
- `#94a3b8` 2.56

`packages/ui/src/tokens/tokens.a11y.test.ts` only asserts a subset: light text, dark text, and light status badges. It never checks dark `primary`, the borders or the charts, which is why the failures above are unguarded.

Mobile theme (`apps/mobile-companion/src/theme.ts`) checked separately:

- Light `textMuted` is 4.76 on white and 4.55 on #f8fafc, which passes narrowly.
- Dark `textMutedLight` is 3.75, but nothing references it (0 uses), so it is dead.
- `#6363F1` text on the dark surface `#0f172a` is 3.90.

---

## Findings

### [J-01] Dark-mode primary colour fails contrast for button text, hover and primary-coloured text

- Severity: P1
- Location: `packages/ui/src/tokens/index.ts:174-180` (primary), `packages/ui/src/primitives/Button/Button.styles.ts:27-29`, `packages/ui/src/primitives/SliderField/SliderField.styles.ts:43`
- Evidence: in dark mode `primary` = indigo.500 `#6366f1`, `primary.hover` = indigo.400 `#818cf8`, and `primary.foreground` is a fixed `#ffffff`. Computed: white on primary 4.47, white on hover 2.98. `primary` text on `surface.card` is 3.90, and on `primary.subtle` 3.44. Web has 67 `color: "primary"` lines (grep).
- Impact: the primary CTA and the slider value pills are hard to read in dark mode, and the hover state loses legibility (SC 1.4.3). Light mode is fine (6.29 and 7.90).
- Recommendation: split the roles. In dark mode use indigo.600 `#4f46e5` for the solid fill (white on it is 6.29) and indigo.400 for primary-coloured text (5.84). For the hover fill, use a darker step, not a lighter one. Add dark primary, border and chart pairs to `tokens.a11y.test.ts`.
- Effort: S

### [J-02] Status colours written as hex text colours fail contrast on light backgrounds

- Severity: P1
- Location: 97 lines in `apps/web/app` and `apps/marketing/src` set `color: "#10b981" | "#ef4444" | "#f59e0b"` (grep). Examples: `apps/web/app/components/forecast/UKTaxCalculator.tsx:527,538,547`, `apps/web/app/components/home/InteractiveFinancialTeaser.tsx:539`. A further 14 lines use primitive `success.500`/`warning.500` as a text colour (for example `UKTaxCalculator.tsx:406`).
- Evidence: contrast on white: `#10b981` 2.54, `#f59e0b` 2.15, `#ef4444` 3.76. The semantic equivalents `status.positive.text`, `status.warning.text` and `status.danger.text` are 5.48, 5.02 and 6.47.
- Impact: gain, loss and warning amounts in tables and hero numbers are low contrast in light mode (SC 1.4.3). This also breaks AGENTS.md Law 2. The tax summary table is a core page.
- Recommendation: replace these with `status.*.text` tokens. A Biome or grep guard for `color: "#...` in apps would stop the regression (shared with Track H).
- Effort: M

### [J-03] Tax records can only be opened for editing by clicking the row

- Severity: P1 (SC 2.1.1 is Level A, so this is arguably P0 by the rubric, but delete, receipt and add stay keyboard-reachable)
- Location: `apps/web/app/containers/tax/TaxContainer.tsx:1717-1721` (`<tr onClick={() => onOpenEditModal(record)}>`)
- Evidence: the row has no `tabIndex`, `role` or key handler. The only buttons inside the row are the receipt button (about line 1778) and the delete button (about line 1834), both with `stopPropagation`. There is no edit button. Biome did not flag this because `tr` is not covered by its lint rules, so the Phase 1 sweep (5 sites) undercounts.
- Impact: keyboard and switch users cannot edit a tax record. They can only delete and re-add, which is data-loss prone on a financial record.
- Recommendation: add an "Edit" button in the actions cell (and keep the row click as a mouse convenience), or make the record name cell a `<button>`.
- Effort: S

### [J-04] Two dialogs have no accessible name

- Severity: P1
- Location: `apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx:381`, `apps/web/app/components/accounts/MonthlyBalanceCheckInDrawer.tsx:129`
- Evidence: grep for `Dialog.Title`, `aria-label` and `aria-labelledby` in `ConnectBankWizard.tsx` returns nothing. `MonthlyBalanceCheckInDrawer.tsx` has only a Close button label at line 174. Radix requires a Title (it logs a console error) and uses it for the dialog's name. Other dialogs do have one (`FLPModal.tsx:168`, `WidgetSettingsModal.tsx:65`, and others).
- Impact: screen readers announce an unnamed dialog on two key flows (connect a bank, monthly check-in), SC 4.1.2. Also, only `UserProfilePanel` and `WidgetSettingsModal` render a `Dialog.Description`, so `aria-describedby` is missing on the rest (P3).
- Recommendation: add `Dialog.Title` (wrap the existing heading with `asChild`, or use `VisuallyHidden`) and a Description where one exists.
- Effort: S

### [J-05] Focus indicator removed with no visible replacement on several form controls

- Severity: P1 (SC 2.4.7)
- Location: `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.styles.ts:48` (toggle switch), `McpConnectionCard.tsx:550,584` (inputs), `apps/web/app/components/savings/SavingsForecasterCard.tsx:263,502` (rate inputs), `apps/web/app/components/budget/BudgetCategoryTable.tsx:79` (select), `packages/ui/src/primitives/SliderField/SliderField.tsx:72` (value pill input)
- Evidence: I read all 49 `outline: none|0` lines (the Phase 1 count of 48 is right to within one) and checked the surrounding 25 lines for a focus style.
  - 8 are dialog content containers that receive programmatic focus (`TaxDisclaimerButton:48`, `FLPModal:84,106`, `CopyTaxYearModal:218`, `WidgetSettingsModal:41`, `ConnectBankWizard:264`, `UserProfilePanel:1018,1206`). Those are fine.
  - 1 is `index.css:31` (checkbox), which has a `:focus-visible` ring at `index.css:41`. Fine.
  - 32 have a `_focus` or `&:focus` replacement. Most only change the 1px `borderColor` to primary, some add a 2px ring (`FLPInput.tsx:60-63`). A border colour change is a visible state change, so I count these as passing SC 2.4.7, although they are weak (see J-06).
  - 8 have none, listed above. `SavingsAccountsList.tsx:151` is borderline, because its inline input has a permanent primary border, so it is always visible.
  - `SliderField`'s pill input has `outline: none` with no `:focus-within` on `sliderFieldValuePill` (`SliderField.styles.ts:27-41`), so tabbing into the pill shows nothing.
- Impact: keyboard users lose their place on the MCP toggle, the savings rate inputs and the slider value field.
- Recommendation: add `_focusVisible` with `outline: 2px solid`, `outlineColor: border.focusRing` to these sites. Add `_focusWithin` to `sliderFieldValuePill`. Better, add one global `:focus-visible` rule in `index.css` for `button, input, select, textarea, [role=button]` so removals can no longer be silent.
- Effort: S

### [J-06] Form field boundaries are below 3:1 (SC 1.4.11)

- Severity: P1 (design-system level, widely tolerated, but a strict AA failure)
- Location: `packages/ui/src/tokens/index.ts:202-208` (`border.DEFAULT`, `border.input`), `apps/web/app/components/core/inputs/input/FLPInput.tsx:53`
- Evidence: `border.input` against `surface.card` is 1.48 in light and 1.25 in dark. FLPInput and FLPSelect use `borderColor: "border"` (1.23 light, 1.25 dark). The input fill is the same colour as the card, so the 1px border is the only cue that a field exists. Inputs `focus` state changes border to primary (3.9 to 6.3), which passes.
- Impact: low-vision users may not see where to click or type. Affects every form.
- Recommendation: define `border.input` at 3:1 or better (for example slate.500 `#64748b` in light, about `rgba(255,255,255,0.45)` in dark), and use it in `FLPInput`, `FLPSelect` and the `packages/ui` equivalents. Keep the faint `border.DEFAULT` for cards and dividers.
- Effort: S

### [J-07] No live regions anywhere, so recalculated results and status changes are silent

- Severity: P2 (SC 4.1.3 applicability is debatable for slider-driven recalculation, but it clearly applies to save, error and sync states)
- Location: whole of `apps/web/app` and `packages/ui/src`
- Evidence: grep for `aria-live|role="status"|role="alert"|aria-busy` returns 0 results in app code. The calculators (`/debt`, `/mortgage`, `/pension`, `/forecast`) recompute outputs on slider change. `BankConnectionsList.tsx:243` shows a syncing spinner with no text alternative. No toast system exists either.
- Impact: screen reader users change a slider and hear nothing about the new result, payoff date or sync state.
- Recommendation: add a visually hidden `aria-live="polite"` summary for each calculator's headline outcome (debounced), and `role="status"` or `role="alert"` for saves and errors. Put the logic in `SimulatorSplitLayout` or the outcome card so it is shared.
- Effort: M

### [J-08] Form errors are not programmatically associated, and the error colour token does not exist

- Severity: P2
- Location: `apps/web/app/components/core/inputs/input/FLPInput.tsx:77-79,99`, `FLPCheckbox.tsx:133-135,194`, `FLPSelect.tsx`
- Evidence: no `aria-invalid`, `aria-describedby` or `aria-errormessage` exists anywhere in the repo (grep, 0 results). The error is a bare `<span>` after the input. The span uses `color: "destructive"`, and 15 lines in web do the same. The current `semanticTokens` has no `destructive` namespace (the architecture test asserts this), only the `destructive.50..800` primitive scale. The generated `packages/ui/styled-system` still exposes a bare `destructive` token, but that output looks stale against the source (it is gitignored and I did not regenerate it). On a fresh `panda codegen` the value will likely fall through as invalid CSS, and the error text would render in the inherited colour.
- Impact: screen readers do not hear the error when focusing the field (SC 1.3.1, 3.3.1 relationships and 4.1.3). Error text may be visually indistinguishable from body text.
- Recommendation: in the three field components, set `aria-invalid`, link `aria-describedby` to an error `id`, and give the error `role="alert"` or a live region. Switch `color: "destructive"` to `status.danger.text`. Also add an icon so the error does not rely on colour.
- Effort: S

### [J-09] Click handlers on non-interactive elements with no keyboard path

- Severity: P2 (each has some alternative route, otherwise it would be P1)
- Location: `apps/web/app/components/setup/SetupChecklist.tsx:165` (collapse header), `apps/web/app/containers/accounts/accountDetailContainer/AccountDetailContainer.tsx:237` ("Back to accounts" `div`), `apps/web/app/components/savings/SavingsAccountsList.tsx:521,557,603` (click-to-edit balance spans), `AccountsCard.tsx:236` (stopPropagation wrapper)
- Evidence: re-ran `bunx biome check apps packages --max-diagnostics=500` read-only: 20 a11y warnings, matching Phase 0 exactly. Mapping: `useKeyWithClickEvents` 7 (TaxContainer 1776 and 1819, AccountDetailContainer 237, SetupChecklist 165, SavingsAccountsList 521, 557, 603), `noStaticElementInteractions` 6 (the last five plus AccountsCard 236), `useSemanticElements` 7 (ConnectBankWizard 409, 509, 535; PayoffStrategySwitcher 248, 322, 392; marketing HomeFAQ 102). The two TaxContainer hits and AccountsCard are `stopPropagation` wrappers on cells, not actionable controls, so they are false positives for users. The real keyboard gaps are SetupChecklist, the back link and the inline edit spans. Biome's a11y rules are set to `warn` in `biome.json:98-109`, so none can fail CI.
- Impact: keyboard users cannot collapse the setup checklist, cannot use the back link (the main nav still works), and cannot quick-edit balances (the Edit dialog still works).
- Recommendation: use `<button type="button">` or `<Link>` for these. Replace the `role="button"` divs with real buttons. Upgrade `useKeyWithClickEvents`, `noStaticElementInteractions` and `useSemanticElements` to `error` once the 20 are fixed.
- Effort: S

### [J-10] Strategy cards act as a selection group but expose only `role="button"`

- Severity: P3
- Location: `apps/web/app/components/debt/PayoffStrategySwitcher.tsx:248-262,322,392`, `ConnectBankWizard.tsx:409,509,535`
- Evidence: `div role="button" tabIndex={0}` with Enter and Space handlers (so keyboard works). `PayoffStrategySwitcher` cards have no `aria-pressed` or `aria-checked`, so the selected strategy is conveyed by styling only (SC 4.1.2, 1.4.1).
- Impact: screen reader users cannot tell which payoff strategy is selected.
- Recommendation: use a `radiogroup` with `role="radio"` and `aria-checked`, or native radio inputs styled as cards (the `SegmentedTabs` primitive may be reusable).
- Effort: S

### [J-11] Charts have no text alternative or data table

- Severity: P2
- Location: Recharts charts in `SavingsForecasterCard.tsx:357`, `PensionForecasterCard.tsx:1098`, `SavingsForecaster.tsx:551`, `DebtToWealthBridgeCard.tsx:171`, `OverpaymentSimulator.tsx:380`, `OverpayVsSaveCompare.tsx:488`, `AccountDetailChart.tsx:35`, pies at `UKTaxCalculator.tsx:585` and `BudgetDashboard.tsx:838`. All in `apps/web/app`.
- Evidence: the only chart with a `<title>` is `packages/ui/src/patterns/DebtToWealthChart/DebtToWealthChart.tsx:130`. `role="img"` appears only on two icon-ish elements (`WebBaselineSnapshotPreview.tsx:289`, `DashboardWidgetCard.tsx:107`). No chart wrapper has an `aria-label` or a summary sentence. Recharts 3.10.1 is in use. I did not check its `accessibilityLayer` default or test it with a screen reader, which would give some keyboard exploration but still no summary. Several strokes are hardcoded: `#10b981` on white is 2.54 (SC 1.4.11 needs 3). Series are also colour-only in the pies.
- Impact: blind users get no information from forecast and breakdown charts, which are the product's main output (SC 1.1.1).
- Recommendation: wrap each chart in `role="img"` with `aria-label` (headline numbers), or put a `<figcaption>` summary beside it. The `CollapsibleDrawer` data tables that AGENTS.md already requires for long schedules can double as the data alternative. Replace hex strokes with `chart.*` tokens and use direct labels in the pies.
- Effort: M

### [J-12] Slider: no `aria-valuetext` in the shared UI primitive

- Severity: P3
- Location: `packages/ui/src/primitives/SliderField/SliderField.tsx:84-92,105-117`
- Evidence: the range input has `aria-label="${label} range slider"` and no `aria-valuetext`, so a screen reader announces `250000`, not `£250,000` or `4.5%`. The app's own `FLPSlider.tsx:167` does set `aria-valuetext={displayValue}`. Positives: the value pill is a real editable number input (`aria-label="... input"`), so there is a non-dragging alternative (SC 2.5.7). `FLPSlider` also has a native range input, so it supports keyboard and single-click, though its value badge is read-only. Both sliders use `minHeight` 36 to 44px (SC 2.5.8 OK).
- Impact: units and currency are not announced.
- Recommendation: pass `aria-valuetext` built from `unitPrefix`, formatted value and `unitSuffix`. The `aria-label` replaces the visible label as the accessible name, but it still contains the visible text, so it passes SC 2.5.3.
- Effort: S

### [J-13] Sticky header and fixed bottom bar with no scroll padding (focus not obscured)

- Severity: P2 (risk, not confirmed without a runtime pass)
- Location: `apps/web/app/components/structure/header/styles.ts:4-6` (sticky, `z-index: 50`), `apps/web/app/components/navigation/MobileBottomBar.tsx:24` (fixed), `apps/web/app/components/dashboard/DemoModeBanner.tsx:7` (sticky)
- Evidence: grep for `scroll-padding` or `scroll-margin` in `apps/web/app` returns nothing. Pages add `paddingBottom: 72px` for the bar (`root.tsx:121`), which helps the end of the page but not mid-scroll tabbing.
- Impact: a tabbed-to control can sit behind the header or the bottom bar (SC 2.4.11 AA, new in 2.2).
- Recommendation: set `scroll-padding-top` to header height and `scroll-padding-bottom` to bar height on `html`. Verify in a browser pass.
- Effort: S

### [J-14] Mobile companion app has zero accessibility metadata

- Severity: P1 (SC 4.1.2). Note the app currently runs on mock auth, so it may not be released; downgrade to P2 if it is not shipping.
- Location: `apps/mobile-companion/src/screens/*.tsx` (9 screens), `src/navigation/RootNavigator.tsx`
- Evidence: grep for `accessib|aria-` across `src` returns 0. There are 107 `TouchableOpacity`, 18 `TextInput` and 4 `Switch` (ProfileScreen 592, 710, 743, 777). 20 lines set `fontSize` 9 to 11 (for example `RootNavigator.tsx:375`, `MortgageScreen.tsx:1089-1175`), which is below the 12px floor the web tokens enforce. 41 lines reference `hitSlop` or 44px sizing, so target size is partly considered.
- Impact: VoiceOver and TalkBack users get unlabelled icon buttons ("button"), unlabelled switches and inputs, and no role or state on tab-like controls.
- Recommendation: add `accessibilityRole`, `accessibilityLabel` and `accessibilityState` to every `TouchableOpacity`/`Switch`, and `accessibilityLabel` to inputs. Extract a shared `PressableButton` so this is done once. Raise the small font sizes to at least 12.
- Effort: L

### [J-15] Storybook a11y checks are not enforced anywhere

- Severity: P2
- Location: `apps/web/.storybook/preview.tsx:47-55`, `apps/web/vite.config.mts:60-103`, `apps/web/package.json:90`, `.github/workflows/ci-pipeline.yml`
- Evidence: the `a11y` parameter only lists `color-contrast: enabled` (that rule is already on by default in axe, so this changes nothing). There is no `a11y.test` mode (`'error'`), so addon violations do not fail a run. `vite.config.mts` `test.include` is only `./app/**/*.{test,spec}.*` and has no `storybookTest` project, so `vitest run` never executes stories or their `play()` tests. `test:storybook` is `storybook build --test`, which only builds. CI runs lint, check-types, test and build only. The light/dark decorator is global, so dark mode is rendered, but nothing asserts on it. `jest-axe` or `vitest-axe` is not used in component tests. AGENTS.md section 4 requires zero a11y violations per story, and there is currently no way to check it.
- Impact: "zero violations" in the Definition of Done is unverifiable, and the contrast failures in this report passed all CI.
- Recommendation: add a Storybook Vitest project (`@storybook/addon-vitest` is already installed), set `parameters.a11y.test = "error"`, and run it in CI. Keep a short waiver list for known issues instead of a global off.
- Effort: M

### [J-16] Landmarks and headings are mostly sound, with small gaps

- Severity: P3
- Location: `apps/web/app/root.tsx:118` (single `<main>`), `apps/web/app/components/structure/header/Header.tsx:137` (`<nav>` without a label), `apps/web/app/routes/auth.callback.tsx:46` (`h2` only)
- Evidence: positives. One `<main>`, a `<header>`, `lang={locale}` on `<html>` (`root.tsx:68`), page-level `h1` via `FLPHeading as="h1"` in 11 containers, a labelled mobile `<nav>` (`MobileBottomBar.tsx:111-112`), and per-route `meta` titles. Gaps: the desktop `<nav>` has no `aria-label` while a second labelled nav exists on mobile, there is no skip link (grep), and `auth.callback` has no `h1`. `HomeDashboard.tsx:319` uses `color="blue.500"`, which is not a token in the palette (indigo is), so its contrast is undefined. A `<main>` landmark satisfies SC 2.4.1 as a bypass mechanism, so the missing skip link is not a failure.
- Recommendation: add `aria-label="Primary"`, a skip link to a `<main id>` target, an `h1` on the callback route, and swap `blue.500` for a `text.*` token.
- Effort: S

### [J-17] Tables: few header scopes, no captions

- Severity: P3
- Location: 12 `<table>` in `apps/web/app` (for example `TaxContainer.tsx`, `UKTaxCalculator.tsx`, `ComparisonMatrix.tsx`)
- Evidence: 60 `<th>` but only 4 `scope=` attributes (all in `ComparisonMatrix.tsx:163-169`), and no `<caption>` or table `aria-label`. Column headers in single-header tables are inferred correctly by browsers without `scope`, so this is a polish issue. Tables with row headers (for example per-year or per-category rows) need `scope="row"`.
- Recommendation: add `scope="col"` and `scope="row"` in the shared table styles or a `Table` wrapper, and a visually hidden caption per table.
- Effort: S

### [J-18] Reduced motion, targets and labelling: checked, with minor notes

- Severity: P3
- Location: `apps/web/app/index.css:137-146`, `apps/marketing/src/index.css:50-59`, `apps/web/app/components/core/progress/FLPSpinner.tsx:25`
- Evidence: both web and marketing have a global `prefers-reduced-motion` block, which covers CSS animation and transition (the Phase 1 count of "2 files" is therefore the two global rules, and is sufficient). Notes: the block sets `animation-iteration-count: 1`, which stops the spinner after one turn, so a loading state may look frozen. Recharts' own JS animation (8 uses of `isAnimationActive`) is not covered. `FLPInput` uses `id={label}` (`FLPInput.tsx:94`, same in `FLPSelect.tsx:81`), so two fields with the same label on one page get duplicate IDs and the second label points at the first field. The `isLabelHidden` prop removes the label with no `aria-label` fallback (no caller uses it today, so latent). Icon-only buttons rely on `title` only (for example `BudgetCategoryTable.tsx:552,570`), which gives a name but is not shown to keyboard or touch users.
- Recommendation: exempt the spinner from the iteration cap, or use a non-spinning indicator under reduced motion. Use `useId()` for field IDs and `aria-label` as the hidden-label fallback. Prefer `aria-label` on icon buttons.
- Effort: S

---

## Checked and found OK

- `<img>` without `alt`: 0 (Phase 1). No `<video>` or `<canvas>` uses in app code outside charts.
- Radix Dialog gives focus trap, Escape and focus restore by default. Radix Tabs (`FLPTabs`, `SegmentedTabs`) gives roving tabindex and `aria-selected`. Both have `_focusVisible` styles in `packages/ui`.
- `packages/ui` primitives (`Button`, `CollapsibleDrawer`, `SegmentedTabs`, `SliderField` track) all use a 2px `border.focusRing` outline with offset, passing 3:1 in both themes.
- Dark and light text pairs, and status text on status backgrounds, all pass.
- Reduced motion has a global rule (see J-18).
- Language attribute is set. Headings are structured (J-16).

## Limits

- No browser, assistive-technology or Storybook run. Focus order, focus trapping in real use, 200% and 400% zoom reflow (SC 1.4.4, 1.4.10), text spacing (1.4.12), drag handles on the bottom sheet (2.5.7), and actual rendered contrast over gradients or images were not tested.
- The 49-site outline review used a 25-line window around each site, so a focus style defined elsewhere (a global stylesheet) would be missed. I checked `index.css` and found only the checkbox rule.
- `packages/ui/styled-system` is generated and gitignored, and appears out of step with `tokens/index.ts` (bare `destructive` and `success` tokens still present). I did not regenerate it, so J-08's rendering impact is inferred.
- The white-on-`status.*.solid` pairs were computed but I did not confirm which components use them.
- Marketing app (`apps/marketing`) was only sampled (HomeFAQ, global CSS, hex counts).
- I did not read `docs/agents/component-guidelines.md`.

## Quick wins (under one hour each)

1. Add an Edit button to the tax records row (`TaxContainer.tsx:1717`) (J-03).
2. Add `Dialog.Title` to `ConnectBankWizard` and `MonthlyBalanceCheckInDrawer` (J-04).
3. Add a global `:focus-visible` rule in `index.css`, and `_focusWithin` on the `SliderField` pill (J-05).
4. Darken dark-mode `primary` fill and add a separate primary text token (J-01).
5. Raise `border.input` to 3:1 in both themes (J-06).
6. Add `aria-valuetext` to `SliderField` (J-12).
7. Make `FLPInput`, `FLPSelect` and `FLPCheckbox` set `aria-invalid` and `aria-describedby`, and fix the `destructive` colour (J-08).
8. Turn the three Biome a11y rules to `error` after fixing the 20 warnings, and add `scroll-padding` for the sticky header and bar (J-09, J-13).
