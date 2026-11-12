# E8 draft plan (planning workflow output)

Status: **draft, not reviewed, nothing implemented.** Produced by a read-only planner and fact-checked by a second agent; both can be wrong. Facts cite file:line in the code at the time of the run.

**Epic:** E8 - Accessibility AA (WCAG 2.2)

**Goal:** Meet WCAG 2.2 AA on the shared design system and the web app's main flows. In practice: (1) dark-mode primary and form-field boundary contrast pass, and the token test suite checks every semantic text, border, fill and chart pair in both themes; (2) a visible focus indicator on every interactive control; (3) the 20 Biome a11y warnings are fixed and those rules become errors; (4) form errors, sliders, dialogs, landmarks, tables, charts and recalculated results are announced to assistive tech; (5) the Storybook a11y addon becomes a real CI gate, so 'zero a11y violations' in AGENTS.md section 4 can be checked. Findings covered: J-01, J-06 (P1), J-03, J-04, J-05, J-07, J-08, J-09, J-10, J-11, J-12, J-13, J-15, J-16, J-17, J-18, plus the overlapping H-07 dark danger button. J-02 and J-14 depend on decisions D4 and D6. Not covered: E9 adoption and colocation of web components, E14 chart colour and format polish (K-*), and E11 lint `--write` (N-03), except where this epic touches them.

**Classification:** bounded

## Design

CONTRAST METHOD. WCAG 2.x relative luminance: each sRGB channel is c/255, linearised as c/12.92 if c<=0.03928, else ((c+0.055)/1.055)^2.4. L = 0.2126R + 0.7152G + 0.0722B. Ratio = (Lhi+0.05)/(Llo+0.05). Thresholds: 4.5 for text, 3 for UI boundaries, indicators and graphics. rgba tokens are alpha-composited over the surface first. Luminances used: white 1.0000, slate.50 0.9536, slate.100 0.9085, slate.300 0.6572, slate.500 0.1706, indigo.50 0.8890, indigo.400 0.3020, indigo.500 0.1851, indigo.600 0.1170, indigo.700 0.0829, dark.surface (card) 0.0103, dark.canvas 0.0047, dark.surfaceSunken 0.0061, dark.surfaceOverlay 0.0144, warning.500 0.4389, warning.600 0.2796, destructive.500 0.2290, destructive.600 0.1674, white@0.40 over card 0.1792, white@0.08 over card 0.0253, primary.subtle dark over card 0.0183.

TOKEN CHANGES (semantic mappings only; no primitive scale value changes).
1) J-01 primary, recommended option A of D1. Split the roles inside the existing primary.* namespace. primary.DEFAULT stays the 'interactive accent' role (text, links, borders, focus borders, slider accent, indicators): light indigo.600 (unchanged), dark indigo.500 -> indigo.400. Add primary.solid, the fill behind primary.foreground: indigo.600 in both themes. primary.hover becomes the solid hover: light indigo.700 (unchanged), dark indigo.400 -> indigo.700 (a darker step). primary.foreground stays #fff.
 Dark results. White on solid: (1.05)/(0.1170+0.05) = 6.29. White on hover: 1.05/0.1329 = 7.90. Primary text on card: 0.3520/0.0603 = 5.84; canvas 6.43, sunken 6.28, overlay 5.47, surface.subtle 6.06, on primary.subtle (composited) 0.3520/0.0683 = 5.15. As an indicator or border on card it is 5.84 (>=3).
 Light results are unchanged: white on indigo.600 6.29, on indigo.700 7.90; indigo.600 text on white 6.29, slate.50 6.01, slate.100 5.74, indigo.50 5.62.
 Caveat that drives the sweep: indigo.600 against the dark card is only 2.77. Solid fills are therefore only for surfaces whose label is text (buttons). Graphic-only fills (progress bars, checked checkbox box, active dots) must use primary or chart.primary (indigo.400 dark), never primary.solid.
 Options B and C of D1 have equivalent numbers but different sweeps. B adds primary.text (dark indigo.400) and makes DEFAULT dark indigo.600. C keeps one key: DEFAULT dark indigo.400, hover dark indigo.300, and foreground themed {base #fff, _dark slate.950}; slate.950 on indigo.400 is 6.76, on indigo.300 10.12.
2) J-06 border.input, recommended option A of D2. Light slate.300 -> slate.500: 1.05/0.2206 = 4.76 on white, 4.55 on canvas, 4.34 on sunken. Dark dark.border -> rgba(255,255,255,0.40): composited L 0.1792, so 0.2292/0.0603 = 3.80 on card, 3.81 canvas, 3.83 sunken, 3.74 overlay. border.DEFAULT and border.subtle stay faint for decorative card and divider hairlines; that is allowed under SC 1.4.11 because they do not identify a component. border.strong stays as is. Controls that use it to mark a boundary (the MCP toggle off-state, MCP inputs) move to border.input instead.
3) H-07 / J-01 danger. Dark status.danger.solid destructive.500 -> destructive.600: white on it 1.05/0.2174 = 4.83, and as a graphic on card 3.61. McpConnectionCard.tsx:877 moves from danger.solid text to status.danger.text (dark 6.30).
4) K overlap, chart.warning and chart.series5 light: warning.500 (2.15) -> warning.600: 1.05/0.3296 = 3.19 on white, 3.04 on canvas (>=3; narrow). The other light series pass: success.600 3.77, cyan.600 3.68, purple.600 5.70, indigo.600 6.29. Dark series pass (5.47 to 10.44 on card and overlay).
5) Pairs not changed but documented as non-text-only. White on light positive/warning/info solid is 3.77/3.19/4.10, and on dark 2.54/2.15/2.77. These solids are only fills today (FLPProgressBar.tsx:19-21) and pass 3:1 against card as graphics (dark 6.29 to 8.11, light 3.04 to 4.83). The test matrix asserts the 3:1 graphic rule for them and a separate rule that no component puts text on them (a grep ratchet).

PROPAGATION. Tokens -> panda.preset.ts -> each app's Panda config. CSS custom properties (--colors-primary, --colors-primary-solid ...) are emitted by the PostCSS plugin at dev and build time, so values change everywhere at once, including the 100 or so Emotion and inline var(--colors-primary) uses. A new key such as primary.solid only becomes a typed token after panda codegen (prepare) in packages/ui, apps/web and apps/marketing. strictTokens is not enabled, so a stale styled-system will not fail check-types; it simply emits an unknown class. The four-gate build regenerates the CSS.

VISUAL REGRESSION RISK. Light mode changes only the field borders (darker grey) and the chart warning series. Dark mode changes primary text and borders (lighter indigo across about 250 sites), the CTA fill (darker indigo), the hover direction (darker, not lighter) and the destructive fill. Snapshot tests with bg_primary class names (5 .snap files) will need updating. There is no Chromatic or visual diff in CI, so each token PR needs manual before/after review in Storybook dark mode of Button, SliderField, FLPInput/FLPSelect/FLPCheckbox, NavMenu, the dashboard widgets and the tax and mortgage containers.

FOCUS (J-05). Add one unlayered rule (outside @layer, like the reduced-motion block at index.css:137) in apps/web/app/index.css and apps/marketing/src/index.css: `:where(a,button,input,select,textarea,summary,[role=button],[role=radio],[role=switch],[role=tab],[tabindex]:not([tabindex="-1"])):focus-visible { outline: 2px solid var(--colors-border-focus-ring); outline-offset: 2px }`. Because unlayered CSS beats Panda's @layer utilities, silent `outline: none` removals stop working on those elements. Dialog containers with tabIndex -1 are excluded. Replace the checkbox ring at index.css:41-44 (1.60:1). SliderField gets _focusWithin on the pill, because the ui package is also used by marketing.

NEW COMPONENTS (colocated law, 5 files each, auto-covered by architecture.laws.test.ts:69). packages/ui/src/primitives/VisuallyHidden; packages/ui/src/primitives/LiveRegion; packages/ui/src/patterns/ChartFigure (a figure with a visible or hidden summary and an optional data table slot). All three are exported from packages/ui/src/index.tsx.

STORYBOOK GATE (J-15/F-08), recommended option A of D3. Add a 'storybook' Vitest project to apps/web/vite.config.mts using storybookTest({configDir: '.storybook'}) and browser mode with @vitest/browser-playwright (headless chromium). Set parameters.a11y.test = 'error' in preview.tsx. Under test, the decorator renders a single theme from globals.theme, not side-by-side. Run it twice (THEME=light and THEME=dark via initialGlobals), so axe sees one tree per theme and evaluates real computed contrast. Known violations are waived per story with parameters.a11y.test = 'todo' plus a finding-id comment, and a test asserts the waiver count only goes down. It starts as a separate, non-required CI job and becomes required after 1 to 2 weeks green. Cost: new devDeps @vitest/browser and @vitest/browser-playwright, a playwright chromium download (cache it in CI), roughly 66 files x 2 themes of browser-rendered stories (expect a few minutes, to be measured in the baseline task). Flake sources: CSS transitions and Recharts animation captured mid-flight (mitigate with reducedMotion emulation and the reduced-motion rule), web fonts, the react-router mock, i18n init, and marketing stories that need their own providers.

BIOME ORDER. (1) Real keyboard gaps first: SetupChecklist, the AccountDetailContainer back link, the SavingsAccountsList click-to-edit spans (10 warnings). (2) Selection semantics: PayoffStrategySwitcher as a radiogroup (3), ConnectBankWizard choice cards (3), HomeFAQ (1). (3) The stopPropagation wrappers in TaxContainer and AccountsCard (3, false positives for users; restructure, do not ignore), together with the J-03 Edit button. (4) Make useKeyWithClickEvents, noStaticElementInteractions and useSemanticElements errors, along with the 0-hit rules useButtonType, noSvgWithoutTitle and useFocusableInteractive.

MECHANICAL SWEEP vs PER COMPONENT. Sweeps with a ratchet test: the background-primary sites -> primary.solid or primary (judged per site but templated), color: "destructive" -> status.danger.text (15), status hex -> status.*.text (97, J-02, if D4 puts it here), th scope, icon-button title -> aria-label. Per component: field error association, dialog titles, landmarks, Biome fixes, live regions, chart alternatives.

## Decisions needed from the product owner

1. **D1. How should the primary role split be named (J-01)? Today one token serves both the CTA fill and primary-coloured text, and no single dark value passes both.**
   - A. Keep `primary` (DEFAULT) as the text/accent/border role (dark indigo.400), add `primary.solid` (indigo.600 both themes) for fills under primary.foreground, and make `primary.hover` darker (indigo.700). Sweep ~25 background sites. Edit AGENTS.md:21 and component-guidelines.md:43 to list `solid`.
   - B. Make `primary` the fill (dark indigo.600) and add `primary.text` (dark indigo.400). Sweep ~250 text, border, accent and var() sites, and law docs edit. Any unswept text drops to 2.77:1.
   - C. No new key: dark primary indigo.400, dark hover indigo.300, and a themed primary.foreground (dark slate.950). No sweep beyond hardcoded #fff on primary fills, but dark-mode CTAs become light indigo with near-black text (a brand change).
   - Recommendation: A. The smallest sweep, light mode unchanged, white-on-indigo CTAs kept, consistent with the existing status.*.solid naming. It needs the owner to approve editing the AGENTS.md law text.
   - Blocks: T06, T07

2. **D2. Which exact value should border.input take (J-06)? The 3:1 target is fixed; how heavy the field outlines look is a design choice.**
   - A. Light slate.500 (4.76 on card), dark rgba(255,255,255,0.40) (3.74 to 3.83).
   - B. slate.500 in both themes (dark 3.43 overlay, 3.66 card, 4.03 canvas). One opaque value, lowest dark margin.
   - C. Add a new primitive (for example slate.450 ~#7b8799) for a lighter light-mode outline around 3.2:1. This changes the primitive scale and needs a tokens.a11y.test update for the trimmed-scale tests.
   - Recommendation: A. Comfortable margin in both themes, no primitive scale change, and the dark value follows the existing rgba border pattern.
   - Blocks: T03

3. **D3. How strong should the Storybook a11y gate be, and where should it run (J-15/F-08)?**
   - A. @storybook/addon-vitest browser project (Playwright chromium) with a11y.test='error', light and dark as separate runs, a waiver list, its own CI job (non-required first, required after it is green). Real contrast checks; adds deps, a browser download and a few CI minutes.
   - B. Cheap: a Vitest test that renders each story via composeStories and runs axe-core in happy-dom inside the existing `bun run test`. No new browser, but axe cannot compute colour contrast without layout, so it only catches structural issues.
   - C. Keep a11y as a manual Storybook panel check and only fix the preview config. Leaves AGENTS.md section 4 unverifiable.
   - Recommendation: A, rolled out in two steps (advisory, then required). Contrast is the epic's main failure, and only a real browser checks it. The token matrix (T01) covers contrast at the token level in the meantime.
   - Blocks: T31, T32, T33, T34

4. **D4. Who owns J-02 (97 lines of status hex used as text)? It overlaps E9 H-03, the hex-to-token codemod.**
   - A. E8 does the narrow status-text slice now (#10b981, #ef4444, #f59e0b used as `color`) with a grep ratchet; E9 H-03 does the rest of the hex.
   - B. Leave all of it to E9 H-03, and E8 only adds the ratchet test.
   - C. Do the full H-03 codemod in E8.
   - Recommendation: A. It is user-facing contrast on core money tables, mechanical, and small enough to do here; coordinate file lists with E9 to avoid merge conflicts.
   - Blocks: T35

5. **D5. Announcement policy for recalculated calculator results (J-07): what is announced, and when?**
   - A. Announce only the headline outcome (for example the payoff date and total interest) politely, debounced about 1000 ms after the last slider or pill change.
   - B. Announce only on commit (pointer up, blur or Enter), not while dragging or pressing arrow keys.
   - C. No automatic announcements; add an 'Announce result' or summary region that users visit.
   - Recommendation: A, with the headline text per calculator agreed with the copy owner (E14/L-track terminology).
   - Blocks: T30

6. **D6. Mobile companion accessibility metadata (J-14): fix now, or wait on E12 (finish or park the mobile app)?**
   - A. Wait on E12; if parked, J-14 drops to P3 and is not done here.
   - B. Do a minimal pass now (accessibilityLabel and accessibilityRole on icon-only touchables and the 4 Switches).
   - C. Full pass with a shared PressableButton (L effort).
   - Recommendation: A. The app runs on mock auth (01-sweeps.md:80), so work there may be thrown away.

## Tasks

### 1. T01 Token contrast matrix harness, parity test, and guards for pairs that already pass (effort S)

- Files: `packages/ui/src/tokens/tokens.a11y.test.ts`
- Interfaces: Add test-local helpers: `resolveColor(path: string, theme: 'light'|'dark'): string`, which follows {colors.x.y} references and the DEFAULT key; `toRgb(value: string, over?: string): [number,number,number]`, which composites rgba over a hex surface; `contrast(fg: string, bg: string, theme): number`; and a table `PAIRS: { fg: string; bg: string; themes: ('light'|'dark')[]; min: 4.5|3; role: 'text'|'ui'|'graphic' }[]`. Use `it.each(PAIRS)`. Pairs known to fail are listed under `it.fails` with the finding id, so later tasks flip them by removing `.fails`.
- Tests:
  - 'every semanticTokens.colors leaf defines base and _dark (except primary.foreground)': walk the object and expect both keys
  - 'resolveColor follows references': expect resolveColor('surface.card','dark') toBe '#141A26'
  - 'composites rgba': expect contrast(resolveColor('border.input','dark'), '#141A26','dark') toBeCloseTo(1.25, 2)
  - it.each 'text.* on every surface.* >= 4.5 in both themes' (passes today)
  - it.each 'status.*.text on status.*.bg and surface.card >= 4.5'
  - 'border.focusRing vs surface.card/canvas >= 3 both themes'
  - it.fails 'primary.foreground on primary (dark) >= 4.5 [J-01]', 'primary on surface.card (dark) >= 4.5 [J-01]', 'border.input on surface.card >= 3 [J-06]', 'chart.warning on surface.card (light) >= 3', 'text.onContrast on status.danger.solid (dark) >= 4.5 [H-07]'

### 2. T03 Raise border.input to 3:1 in both themes (J-06) (effort S, needs decision)

- Files: `packages/ui/src/tokens/index.ts`, `packages/ui/src/tokens/tokens.a11y.test.ts`
- Interfaces: index.ts:206 becomes `input: { value: { base: '{colors.slate.500}', _dark: 'rgba(255, 255, 255, 0.40)' } }` (D2 option A).
- Depends on: T01
- Tests:
  - Flip the T01 it.fails to it: 'border.input on surface.card/canvas/sunken/overlay >= 3 in light and dark' (expected 4.76/4.55/4.34 light, 3.80/3.81/3.83/3.74 dark)
  - GlobalBaselineBar stories still render (manual dark-mode check)

### 3. T04 Use border.input on shared field components and toggle boundaries (effort S)

- Files: `apps/web/app/components/core/inputs/input/FLPInput.tsx`, `apps/web/app/components/core/inputs/select/FLPSelect.tsx`, `apps/web/app/components/core/inputs/checkbox/FLPCheckbox.tsx`, `packages/ui/src/primitives/SliderField/SliderField.styles.ts`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.styles.ts`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`, `apps/web/app/components/core/inputs/input/FLPInput.test.tsx`, `apps/web/app/components/core/inputs/select/FLPSelect.test.tsx`, `packages/ui/src/primitives/SliderField/SliderField.test.tsx`
- Interfaces: Change borderColor 'border' to 'border.input' at FLPInput.tsx:53, FLPSelect.tsx:59 and FLPCheckbox.tsx:101 (unchecked branch); 'border.subtle' to 'border.input' at SliderField.styles.ts:40; 'border.strong' to 'border.input' at McpConnectionCard.styles.ts:58 (toggle off) and McpConnectionCard.tsx:546,580.
- Depends on: T03
- Tests:
  - FLPInput.test 'uses the input boundary token': expect(getByRole('textbox').className).toContain('bd-c_border.input')
  - FLPSelect.test same for getByRole('combobox')
  - SliderField.test 'value pill has input boundary': the pill container className contains 'bd-c_border.input'
  - Update affected .snap files deliberately (review the diff)

### 4. T05 Dark danger solid, the danger-as-text site, and the light chart warning series (effort S)

- Files: `packages/ui/src/tokens/index.ts`, `packages/ui/src/tokens/tokens.a11y.test.ts`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`
- Interfaces: index.ts:228 dark solid becomes '{colors.destructive.600}'. index.ts:249 and :256 base become '{colors.warning.600}'. McpConnectionCard.tsx:877 color becomes 'status.danger.text'.
- Depends on: T01
- Tests:
  - Flip 'text.onContrast on status.danger.solid (dark) >= 4.5' (expect 4.83)
  - 'status.*.solid vs surface.card >= 3 as graphic, both themes'
  - Flip 'chart.warning and chart.series5 on surface.card and surface.canvas (light) >= 3' (expect 3.19 and 3.04)
  - New ratchet in architecture.laws.test.ts 'no component uses status.*.solid as a text colour': grep packages/ui/src and apps/*/src|app for `color: "status.[a-z]+.solid"`, allowing only icon elements via an explicit allowlist (PromoCliffTracker.tsx:32, PayoffStrategyControls.tsx:101)

### 5. T06 Split primary into accent and solid roles, and update the Button recipe and law docs (J-01, D1 option A) (effort S, needs decision)

- Files: `packages/ui/src/tokens/index.ts`, `packages/ui/src/tokens/tokens.a11y.test.ts`, `packages/ui/src/primitives/Button/Button.styles.ts`, `packages/ui/src/primitives/Button/Button.test.tsx`, `apps/web/app/components/core/buttons/__snapshots__/FLPButton.test.tsx.snap`, `AGENTS.md`, `docs/agents/component-guidelines.md`
- Interfaces: primary: DEFAULT {base indigo.600, _dark indigo.400}; solid {base indigo.600, _dark indigo.600} (new); hover {base indigo.700, _dark indigo.700}; subtle, border and foreground unchanged. Button.styles.ts:27 bg becomes 'primary.solid'; :29 stays primary.hover. AGENTS.md:21 and component-guidelines.md:43 add `solid` with usage 'fill behind primary.foreground only'.
- Depends on: T01
- Tests:
  - Flip 'primary.foreground on primary.solid >= 4.5 both themes' (6.29) and add 'on primary.hover >= 4.5 both' (7.90)
  - Flip 'primary on surface.card/canvas/sunken/overlay/subtle >= 4.5 both themes' (dark 5.84/6.43/6.28/5.47/6.06)
  - 'primary on primary.subtle >= 4.5 both' (light 5.62, dark 5.15)
  - 'primary vs surface.card >= 3 (indicator) both'
  - Button.test 'primary variant fills with primary.solid': expect(getByRole('button').className).toContain('bg_primary.solid')
  - Regenerate FLPButton snapshots and review

### 6. T07 Sweep background uses of primary, and add a ratchet (effort M, needs decision)

- Files: `apps/web/app/components/core/inputs/checkbox/FLPCheckbox.tsx`, `apps/web/app/components/core/inputs/slider/FLPSlider.tsx`, `apps/web/app/components/navigation/NavMenu.tsx`, `apps/web/app/components/navigation/GlobalBaselineScenarioBar.tsx`, `apps/web/app/components/dashboard/widgets/*.tsx (5)`, `apps/web/app/components/dashboard/HomeDashboard.tsx`, `apps/web/app/containers/tax/TaxContainer.tsx`, `apps/web/app/containers/mortgage/MortgageContainer.tsx`, `apps/web/app/components/forecast/ScenarioLayersWidget.tsx`, `apps/web/app/components/home/FeaturePillars.tsx`, `apps/web/app/components/pension/PensionForecasterCard.tsx`, `apps/web/app/components/budget/UserProfilePanel.tsx`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.styles.ts`, `apps/web/app/routes/{auth.callback,callback,sandbox}.tsx`, `packages/ui/src/primitives/ProgressBar/ProgressBar.styles.ts`, `apps/marketing/src/pages/McpPage/McpPage.styles.ts`, `packages/ui/src/tokens/architecture.laws.test.ts`
- Interfaces: Rule: a fill carrying text or an icon in foreground/white uses 'primary.solid' with 'primary.foreground'. A graphic-only fill (progress, dots, the checked checkbox box) uses 'primary' or 'chart.primary'. FLPCheckbox.tsx:103 '#ffffff' becomes 'primary.foreground' and the checked bg becomes 'primary.solid' (dark white tick on indigo.600 is 6.29).
- Depends on: T06
- Tests:
  - architecture.laws.test 'no bare primary background': regex /(bg|background|backgroundColor)\s*:\s*[^,\n]*("primary"|colors\.primary\)|colors-primary\))/ over apps/web/app, packages/ui/src and apps/marketing/src returns only an allowlist of graphic fills, each with a comment
  - FLPCheckbox.test 'checked box uses solid fill': className contains 'bg_primary.solid'
  - Manual dark-mode Storybook pass over the touched widgets

### 7. T09 Global focus-visible rule and checkbox focus ring (J-05) (effort S)

- Files: `apps/web/app/index.css`, `apps/marketing/src/index.css`, `apps/web/app/root.test.tsx (or a new apps/web/test/focus-css.test.ts)`
- Interfaces: Unlayered rule after the reduced-motion block: `:where(a,button,input,select,textarea,summary,[role=button],[role=radio],[role=switch],[role=tab],[tabindex]:not([tabindex='-1'])):focus-visible{outline:2px solid var(--colors-border-focus-ring);outline-offset:2px}`. index.css:41-44 becomes outline with the same token (replacing the 1.60:1 rgba shadow).
- Tests:
  - 'global focus-visible rule exists and is unlayered': read index.css as text, assert the rule appears after the last closing brace of @layer base and references --colors-border-focus-ring
  - Manual keyboard pass on /mcp toggle, /savings rate inputs and /budget select (record in PR)

### 8. T10 SliderField: pill focus-within, aria-valuetext, and move inline css into styles (J-05, J-12) (effort S)

- Files: `packages/ui/src/primitives/SliderField/SliderField.tsx`, `packages/ui/src/primitives/SliderField/SliderField.styles.ts`, `packages/ui/src/primitives/SliderField/SliderField.test.tsx`, `packages/ui/src/primitives/SliderField/SliderField.stories.tsx`
- Interfaces: Add prop `formatValue?: (value: number) => string`. The default formats with `new Intl.NumberFormat('en-GB')` and wraps it in unitPrefix/unitSuffix. The range input gets `aria-valuetext={formatValue(value)}`. New recipe `sliderPillInput` (replacing the inline css at :62-73). sliderFieldValuePill gets `_focusWithin: { outline: '2px solid', outlineColor: 'border.focusRing', outlineOffset: '2px' }`.
- Tests:
  - 'announces formatted value': render value 250000 with unitPrefix '£'; expect(getByRole('slider')).toHaveAttribute('aria-valuetext','£250,000')
  - 'suffix is appended': value 4.5, unitSuffix '%', expect aria-valuetext '4.5%'
  - 'custom formatter wins': formatValue={(v)=>`${v} years`}, expect aria-valuetext '25 years'
  - Story play(): userEvent.tab() until the pill input has focus; expect the pill container className to contain the focusWithin class

### 9. T11 Explicit focus styles on the remaining outline:none controls (effort S)

- Files: `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.styles.ts`, `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`, `apps/web/app/components/savings/SavingsForecasterCard.tsx`, `apps/web/app/components/budget/BudgetCategoryTable.tsx`
- Interfaces: Add `_focusVisible: { outline: '2px solid', outlineColor: 'border.focusRing', outlineOffset: '2px' }` next to each outline:none at McpConnectionCard.styles.ts:48, McpConnectionCard.tsx:550,584, SavingsForecasterCard.tsx:263,502 and BudgetCategoryTable.tsx:79.
- Depends on: T09
- Tests:
  - Ratchet in apps/web (new test apps/web/test/focus-ratchet.test.ts): every css() block containing outline: "none" also contains _focus, _focusVisible or &:focus within 25 lines, or appears in an allowlist of the 8 dialog-container sites

### 10. T12 VisuallyHidden primitive (colocated) (effort S)

- Files: `packages/ui/src/primitives/VisuallyHidden/VisuallyHidden.tsx`, `packages/ui/src/primitives/VisuallyHidden/VisuallyHidden.styles.ts`, `packages/ui/src/primitives/VisuallyHidden/VisuallyHidden.stories.tsx`, `packages/ui/src/primitives/VisuallyHidden/VisuallyHidden.test.tsx`, `packages/ui/src/primitives/VisuallyHidden/index.ts`, `packages/ui/src/index.tsx`
- Interfaces: `export const VisuallyHidden: FC<{ as?: 'span'|'div'|'caption'|'h2'; focusable?: boolean; children: ReactNode } & HTMLAttributes<HTMLElement>>`. The recipe is the standard clip pattern. With focusable, it becomes visible on focus (reused for the skip link).
- Tests:
  - 'content is in the accessibility tree': getByText('Hidden') exists
  - 'applies the clip recipe': className contains the position-absolute and clip classes
  - 'focusable variant un-hides on focus' (story play with userEvent.tab)
  - Architecture law test passes automatically (primitives dir scan)

### 11. T13 LiveRegion primitive (colocated) (effort S)

- Files: `packages/ui/src/primitives/LiveRegion/LiveRegion.tsx`, `packages/ui/src/primitives/LiveRegion/LiveRegion.styles.ts`, `packages/ui/src/primitives/LiveRegion/LiveRegion.stories.tsx`, `packages/ui/src/primitives/LiveRegion/LiveRegion.test.tsx`, `packages/ui/src/primitives/LiveRegion/index.ts`, `packages/ui/src/index.tsx`
- Interfaces: `export const LiveRegion: FC<{ message: string; politeness?: 'polite'|'assertive'; debounceMs?: number; visuallyHidden?: boolean }>`. It renders role='status' (polite) or role='alert' (assertive) with aria-atomic='true'. The region is mounted empty first and the text inserted after the debounce, so screen readers detect the change.
- Depends on: T12
- Tests:
  - 'renders a status region': getByRole('status') exists and is empty on first render
  - 'debounces updates' (vi.useFakeTimers): rerender message 'A' then 'B' within 500 ms, advance 1000 ms, expect textContent 'B' with no intermediate 'A'
  - 'assertive uses alert role': getByRole('alert')
  - 'does not re-announce identical message': the same string twice leaves textContent unchanged

### 12. T14 FLPInput and FLPSelect: unique ids, error association, error token (J-08, J-18) (effort S)

- Files: `apps/web/app/components/core/inputs/input/FLPInput.tsx`, `apps/web/app/components/core/inputs/input/FLPInput.test.tsx`, `apps/web/app/components/core/inputs/select/FLPSelect.tsx`, `apps/web/app/components/core/inputs/select/FLPSelect.test.tsx`
- Interfaces: `const id = props.id ?? useId(); const errorId = `${id}-error``. The input gets `aria-invalid={!!error || undefined}` and `aria-describedby={error ? errorId : undefined}` (merged with any caller value). The error span gets `id={errorId}`, `role='alert'`, color 'status.danger.text' and an icon. When isLabelHidden is set, the input gets `aria-label={label}`.
- Tests:
  - 'two inputs with the same label get distinct ids': render two FLPInput label='Amount'; getAllByLabelText('Amount') has length 2 and the ids differ
  - 'error is the accessible description': render error='Required'; expect(getByRole('textbox')).toHaveAccessibleDescription('Required') and toHaveAttribute('aria-invalid','true')
  - 'error is announced': getByRole('alert') has text 'Required'
  - 'hidden label keeps a name': isLabelHidden; getByRole('textbox',{name:'Amount'})
  - 'error uses danger token': the alert className contains 'c_status.danger.text'
  - Same for FLPSelect with getByRole('combobox')

### 13. T15 FLPCheckbox: error association and error token (J-08) (effort S)

- Files: `apps/web/app/components/core/inputs/checkbox/FLPCheckbox.tsx`, `apps/web/app/components/core/inputs/checkbox/FLPCheckbox.test.tsx`
- Interfaces: Same pattern as T14. FLPCheckbox.tsx:134 color becomes 'status.danger.text'.
- Tests:
  - 'error describes the checkbox': toHaveAccessibleDescription(error), aria-invalid='true'
  - 'error uses danger token'

### 14. T16 Fix the real keyboard gaps (Biome: 10 warnings, J-09) (effort S)

- Files: `apps/web/app/components/setup/SetupChecklist.tsx`, `apps/web/app/containers/accounts/accountDetailContainer/AccountDetailContainer.tsx`, `apps/web/app/components/savings/SavingsAccountsList.tsx`, `apps/web/app/components/setup/SetupChecklist.test.tsx`, `apps/web/app/components/savings/SavingsAccountsList.test.tsx`
- Interfaces: SetupChecklist.tsx:165 header becomes `<button type='button' aria-expanded aria-controls>`. AccountDetailContainer.tsx:237 'Back to accounts' div becomes a react-router `<Link to='/accounts'>`. SavingsAccountsList.tsx:521,557,603 click-to-edit spans become `<button type='button' aria-label='Edit balance for {name}'>`, with the same visual recipe.
- Tests:
  - SetupChecklist.test 'collapses with the keyboard': tab to getByRole('button',{name:/checklist/i}), press Enter, expect aria-expanded 'false'
  - SavingsAccountsList.test 'edits balance from the keyboard': getByRole('button',{name:'Edit balance for ISA'}), Enter opens the inline input
  - Biome a11y warnings for these files: 0 (count in the PR)

### 15. T17 PayoffStrategySwitcher as a radiogroup (J-10; Biome: 3) (effort S)

- Files: `apps/web/app/components/debt/PayoffStrategySwitcher.tsx`, `apps/web/app/components/debt/PayoffStrategySwitcher.test.tsx`
- Interfaces: The wrapper gets role='radiogroup' and aria-label='Payoff strategy'. Each card (:248, :322, :392) becomes a native `<input type='radio'>` visually hidden inside a styled `<label>`, using VisuallyHidden from T12. Arrow-key movement then comes free from the browser.
- Depends on: T12
- Tests:
  - 'exposes the selection': getAllByRole('radio') length 3; the selected one toBeChecked()
  - 'arrow keys change strategy': focus the first radio, press ArrowDown, expect onChange called with the second strategy

### 16. T18 ConnectBankWizard: choice cards as buttons and dialog name (J-09, J-04; Biome: 3) (effort S)

- Files: `apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx`, `apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.test.tsx`
- Interfaces: The role='button' divs at :409, :509 and :535 become `<button type='button'>`, or radios if they are a single choice. The headings at :386 and :498 are wrapped in `<Dialog.Title asChild>`. Add a Dialog.Description where helper text exists.
- Tests:
  - 'dialog is named on each step': getByRole('dialog',{name: /connect/i}); advance a step and assert the new name
  - 'choice cards are buttons': getAllByRole('button',{name: /<bank name>/})
  - No console error from Radix about a missing Title (spy on console.error)

### 17. T19 MonthlyBalanceCheckInDrawer dialog name (J-04) (effort S)

- Files: `apps/web/app/components/accounts/MonthlyBalanceCheckInDrawer.tsx`, `apps/web/app/components/accounts/MonthlyBalanceCheckInDrawer.test.tsx`
- Interfaces: MonthlyBalanceCheckInDrawer.tsx:160 heading is wrapped in `<Dialog.Title asChild>`.
- Tests:
  - 'drawer is named': getByRole('dialog',{name: <heading text>})

### 18. T20 Tax records: Edit button, and stopPropagation wrappers removed (J-03, J-09; Biome: 3) (effort S)

- Files: `apps/web/app/containers/tax/TaxContainer.tsx`, `apps/web/app/components/core/cards/AccountsCard.tsx`, `apps/web/app/containers/tax/TaxContainer.test.tsx`, `apps/web/app/components/core/cards/AccountsCard.test.tsx`
- Interfaces: Add `<button type='button' aria-label='Edit {record.name}'>` to the actions cell (TaxContainer.tsx around :1776). The row click at :1717-1721 stays as a mouse convenience. Remove the onClick wrappers at :1776 and :1819 and AccountsCard.tsx:236; call e.stopPropagation() inside the inner buttons' handlers instead.
- Tests:
  - 'tax record can be edited from the keyboard': getByRole('button',{name:'Edit Salary'}), Enter, expect onOpenEditModal called with that record
  - 'delete does not open edit': click Delete, expect onOpenEditModal not called

### 19. T21 HomeFAQ semantic element (Biome: 1) and escalate the Biome a11y rules to error (effort S)

- Files: `apps/marketing/src/components/HomeFAQ.tsx`, `apps/marketing/src/components/HomeFAQ.test.tsx`, `biome.json`
- Interfaces: HomeFAQ.tsx:102 uses the semantic element Biome suggests (button with aria-expanded, or details/summary). In biome.json:102-109, useButtonType, useKeyWithClickEvents, noSvgWithoutTitle, useFocusableInteractive, noStaticElementInteractions and useSemanticElements become 'error'.
- Depends on: T16, T17, T18, T20
- Tests:
  - HomeFAQ.test 'answer toggles with keyboard': getByRole('button',{name: <question>}), Enter, expect aria-expanded 'true'
  - `biome lint apps packages` exits 0 with 0 a11y diagnostics (record in the PR)

### 20. T22 SimulatorSplitLayout must not render a nested <main> (new finding) (effort S)

- Files: `packages/ui/src/patterns/SimulatorSplitLayout/SimulatorSplitLayout.tsx`, `packages/ui/src/patterns/SimulatorSplitLayout/SimulatorSplitLayout.test.tsx`, `packages/ui/src/patterns/SimulatorSplitLayout/SimulatorSplitLayout.stories.tsx`
- Interfaces: Add props `controlsLabel?: string` (default 'Parameters') and `contentLabel?: string` (default 'Results'). :22 becomes `<section aria-label={controlsLabel}>` and :23 becomes `<section aria-label={contentLabel}>`.
- Tests:
  - 'renders no main landmark': queryByRole('main') toBeNull()
  - 'labels both regions': getByRole('region',{name:'Parameters'}) and getByRole('region',{name:'Results'})

### 21. T23 Web landmarks: nav label, skip link, callback h1, blue.500 prop cleanup (J-16) (effort S)

- Files: `apps/web/app/components/structure/header/Header.tsx`, `apps/web/app/root.tsx`, `apps/web/app/routes/auth.callback.tsx`, `apps/web/app/components/dashboard/HomeDashboard.tsx`, `apps/web/app/components/debt/PayoffStrategySwitcher.tsx`, `apps/web/app/components/structure/header/Header.test.tsx`
- Interfaces: Header.tsx:137 gets `<nav aria-label='Primary'>`. root.tsx:121 gets `<main id='main-content' tabIndex={-1}>`, plus a first-child skip link `<VisuallyHidden as='a' focusable href='#main-content'>Skip to content</VisuallyHidden>` (or an anchor using the focusable recipe). auth.callback.tsx:46 becomes h1. HomeDashboard.tsx:319 and PayoffStrategySwitcher.tsx:383 change color='blue.500' to a text.* or primary token.
- Depends on: T12
- Tests:
  - Header.test 'primary nav is labelled': getByRole('navigation',{name:'Primary'})
  - root or route test 'skip link targets main': getByRole('link',{name:'Skip to content'}) has href '#main-content' and the main has that id
  - auth.callback test: getByRole('heading',{level:1})

### 22. T24 Scroll padding for the sticky header and fixed bottom bar (J-13) (effort S)

- Files: `apps/web/app/index.css`, `apps/web/app/components/structure/header/styles.ts`
- Interfaces: Unlayered `html { scroll-padding-top: var(--header-height, 64px); scroll-padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)) }`, with the bottom value scoped by media query to the breakpoint where MobileBottomBar shows (MobileBottomBar.tsx:24-33, 64px). The header sets --header-height.
- Tests:
  - CSS text test: index.css contains scroll-padding-top and scroll-padding-bottom outside @layer
  - Manual: tab through a long form on mobile width; no focused control is hidden (record in the PR)

### 23. T25 Reduced motion: spinner exemption and Recharts animation (J-18) (effort S)

- Files: `apps/web/app/index.css`, `apps/web/app/components/core/progress/FLPSpinner.tsx`, `apps/web/app/hooks/usePrefersReducedMotion.ts`, `apps/web/app/hooks/usePrefersReducedMotion.test.ts`, `the 8 files with isAnimationActive (grep)`
- Interfaces: `export function usePrefersReducedMotion(): boolean` (matchMedia, SSR-safe default false). In the reduced-motion block, the spinner (data-spinner) gets a slow non-rotating pulse instead of iteration-count 1. Charts pass `isAnimationActive={!reduced}`.
- Tests:
  - hook test: mock matchMedia matches true and expect true; listener change updates the value
  - FLPSpinner.test: has role='status' and aria-label 'Loading' (also fixes the silent spinner at BankConnectionsList.tsx:243 when it is reused there)

### 24. T26 Table header scopes and captions (J-17) (effort S)

- Files: `packages/ui/src/primitives/Table/Table.tsx`, `packages/ui/src/primitives/Table/Table.test.tsx`, `apps/web/app/components/core/table/FLPTable.tsx`, `apps/web/app/components/core/table/FLPTable.test.tsx`
- Interfaces: Th: `scope` defaults to 'col' inside THead, with `scope='row'` passed explicitly by row headers. Table gets an optional `caption?: string` rendered as `<VisuallyHidden as='caption'>`. Raw <table> sites in TaxContainer, UKTaxCalculator and ComparisonMatrix are a follow-up sweep under E9 adoption.
- Depends on: T12
- Tests:
  - Table.test 'column headers are scoped': every th in thead has scope 'col'
  - 'caption names the table': getByRole('table',{name:'Tax bands'})

### 25. T27 Icon-only buttons get aria-label, not only title (J-18) (effort S)

- Files: `apps/web/app/components/budget/BudgetCategoryTable.tsx`, `other icon-only buttons found by grep for <button|FLPButton with title= and no text child`, `apps/web/test/icon-button-ratchet.test.ts`
- Interfaces: Add `aria-label` matching the title at BudgetCategoryTable.tsx:552 and :570 and the other grep hits. Keep title as a tooltip.
- Tests:
  - BudgetCategoryTable.test: getByRole('button',{name:'Delete category Food'})
  - Ratchet: no `title=` on a button element without aria-label in apps/web/app (allowlist only if text content exists)

### 26. T28 ChartFigure pattern for chart text alternatives (J-11) (effort S)

- Files: `packages/ui/src/patterns/ChartFigure/ChartFigure.tsx`, `packages/ui/src/patterns/ChartFigure/ChartFigure.styles.ts`, `packages/ui/src/patterns/ChartFigure/ChartFigure.stories.tsx`, `packages/ui/src/patterns/ChartFigure/ChartFigure.test.tsx`, `packages/ui/src/patterns/ChartFigure/index.ts`, `packages/ui/src/index.tsx`
- Interfaces: `export const ChartFigure: FC<{ title: string; summary: string; showSummary?: boolean; dataTable?: ReactNode; children: ReactNode }>`. It renders `<figure aria-labelledby>` with the title, the chart children marked aria-hidden (Recharts SVG), the summary as a figcaption (visible or VisuallyHidden), and dataTable inside a CollapsibleDrawer labelled 'Show data'. Numbers in the summary are formatted by the caller with en-GB; the summary and table text use tabular-nums.
- Depends on: T12, T26
- Tests:
  - 'figure is named and described': getByRole('figure',{name:'Savings forecast'}) and the summary text is present
  - 'chart svg is hidden from AT': the container's svg has aria-hidden='true'
  - 'data table is reachable': getByRole('button',{name:'Show data'}) toggles a table

### 27. T29 Adopt ChartFigure in the 9 web charts (3 PRs of 3 charts) (effort M)

- Files: `apps/web/app/components/savings/SavingsForecasterCard.tsx`, `apps/web/app/components/pension/PensionForecasterCard.tsx`, `apps/web/app/components/forecast/SavingsForecaster.tsx`, `apps/web/app/components/debt/DebtToWealthBridgeCard.tsx`, `apps/web/app/components/mortgage/OverpaymentSimulator.tsx`, `apps/web/app/components/mortgage/OverpayVsSaveCompare.tsx`, `apps/web/app/components/accounts/AccountDetailChart.tsx`, `apps/web/app/components/forecast/UKTaxCalculator.tsx`, `apps/web/app/components/budget/BudgetDashboard.tsx`
- Interfaces: Each chart is wrapped in ChartFigure with a summary built from its headline numbers via useFormatCurrency(). The pies get direct labels or a legend table so series are not colour-only. Hex stroke replacement stays with E14/K-01.
- Depends on: T28
- Tests:
  - Per chart: getByRole('figure',{name}) and the summary contains the formatted headline (for example '£12,345')

### 28. T30 Announce recalculated calculator outcomes (J-07) (effort M, needs decision)

- Files: `apps/web/app/containers/debt/*`, `apps/web/app/containers/mortgage/MortgageContainer.tsx`, `apps/web/app/containers/pension/PensionContainer.tsx`, `apps/web/app/containers/forecast/*`, `packages/ui/src/calculators/*/ (7 calculators; one PR)`
- Interfaces: Each calculator renders `<LiveRegion message={headline} debounceMs={1000} />` next to its outcome card. The headline text per D5. Save and error states use politeness 'assertive' only for errors.
- Depends on: T13
- Tests:
  - Per calculator (fake timers): change a slider via fireEvent.change, advance 1000 ms, expect getByRole('status') toHaveTextContent(/debt-free by/i)

### 29. T31 Storybook preview: single theme under test, a11y.test error (effort S, needs decision)

- Files: `apps/web/.storybook/preview.tsx`
- Interfaces: Delete the redundant rules config at :47-56 and set `a11y: { test: 'error' }`. Add `initialGlobals: { theme: import.meta.env.VITE_SB_THEME ?? 'side-by-side' }`. The side-by-side branch is never used when VITE_SB_THEME is set.
- Tests:
  - Manual: Storybook dev still defaults to side-by-side
  - Under the test project (T32), each story renders exactly one theme container (assert in a preview-level play or a smoke story)

### 30. T32 Vitest storybook project and script (effort M, needs decision)

- Files: `apps/web/vite.config.mts`, `apps/web/package.json`, `package.json`, `apps/web/.storybook/vitest.setup.ts (if required by addon 10.6)`
- Interfaces: `test.projects`: [{ extends: true, test: { name: 'unit', include: [existing :96] } }, { extends: true, plugins: [storybookTest({ configDir: '.storybook' })], test: { name: 'storybook', browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] } } }]. Scripts: `test` stays unit-only (`vitest run --project unit`); `test:storybook` = `vitest run --project storybook`; `test:storybook:dark` sets VITE_SB_THEME=dark. Adds devDeps @vitest/browser and @vitest/browser-playwright pinned to 5.1.0.
- Depends on: T31
- Tests:
  - `bun run test` still runs only unit tests (count unchanged)
  - `bun run test:storybook` executes play() tests: deliberately break one play() locally and confirm it fails

### 31. T33 Baseline a11y run, waiver list and waiver ratchet (effort S, needs decision)

- Files: `affected *.stories.tsx (parameters.a11y.test = 'todo' with // E8 waiver: <id> <rule>)`, `apps/web/test/a11y-waivers.test.ts`
- Interfaces: Record the light and dark violation counts per story in the PR. The waiver test greps stories for `a11y: { test: 'todo' }` and asserts count <= the baseline constant.
- Depends on: T32
- Tests:
  - 'a11y waivers only go down': expect(waiverCount).toBeLessThanOrEqual(BASELINE)

### 32. T34 CI job for the Storybook a11y gate (effort S, needs decision)

- Files: `.github/workflows/ci-pipeline.yml`
- Interfaces: New job 'storybook-a11y': checkout, bun-setup, cache ~/.cache/ms-playwright, `bunx playwright install --with-deps chromium`, then `bun run --cwd apps/web test:storybook` and `test:storybook:dark`. It starts with continue-on-error: true and a timeout-minutes, and becomes required once green on main for an agreed period.
- Depends on: T33
- Tests:
  - CI run on the PR shows the job executing both themes and reporting counts

### 33. T35 Status hex text colours to status.*.text (J-02, if D4 option A) (effort M, needs decision)

- Files: `97 lines in apps/web/app and apps/marketing/src (grep color: "#10b981|#ef4444|#f59e0b"), for example UKTaxCalculator.tsx:527,538,547; InteractiveFinancialTeaser.tsx:539`, `packages/ui/src/tokens/architecture.laws.test.ts`
- Interfaces: Mechanical codemod: #10b981 to status.positive.text, #ef4444 to status.danger.text, #f59e0b to status.warning.text, but only when used as `color`. Strokes and fills are left to E14. Also color: "destructive" (15 lines) to status.danger.text.
- Tests:
  - Ratchet 'no status hex used as text colour' over apps/web/app and apps/marketing/src returns 0
  - Ratchet 'no bare destructive colour' returns 0

## Can start without any decision

- T01
- T04 (after T03; can be prepared against the test)
- T05
- T09
- T10
- T11
- T12
- T13
- T14
- T15
- T16
- T17
- T18
- T19
- T20
- T21
- T22
- T23
- T24
- T25
- T26
- T27
- T28
- T29

## Review focus

- T06/T07: a graphic-only fill (progress bar, checked checkbox box, active dot, slider accent) must not be moved to primary.solid. indigo.600 is 2.77:1 on the dark card and fails SC 1.4.11. Only text-labelled fills use solid.
- T06: focus borders (FLPInput.tsx:60, FLPSelect.tsx:66, FLPCheckbox.tsx:113) and box-shadows using token(colors.primary) keep pointing at `primary` (indigo.400 dark). Check that none was swept to solid by mistake.
- T06: hover now goes darker in dark mode. Confirm there is no `_hover: { bg: 'primary' }` left anywhere that would flip a CTA to indigo.400 under white text (2.98).
- T01: rgba tokens must be composited over the surface they actually sit on (card vs overlay vs canvas). A test that composites over white or black only will pass wrongly.
- T01: the resolver must handle DEFAULT keys (`border` means border.DEFAULT) and nested references like {colors.dark.border}. An unresolved reference must throw, not return a colour silently.
- T03/T04: changing border.input without moving FLPInput, FLPSelect and FLPCheckbox fixes nothing, because they use `border`. Both tasks must land before J-06 is closed.
- T05: any other `status.*.solid` used as text colour drops below 4.5 after the danger change. The ratchet must cover apps/marketing too.
- T09: the unlayered global rule beats Panda utilities. Check it does not override intentional custom focus styles (Button outlineOffset, SegmentedTabs), does not ring dialog containers (tabIndex -1), and works in marketing SSR.
- T14: aria-describedby passed by callers must be merged, not overwritten. useId must not break SSR hydration (React 19 useId is stable). A caller-provided id must win.
- T14: role='alert' on an error that renders on first load (server validation) announces on page load. Make sure that is intended, or use aria-live only after the user submits.
- T17/T18: replacing divs with native buttons or radios inherits UA styles and changes the tab order. Check the visual parity in light and dark, and that Enter/Space handlers are not run twice.
- T20: removing the stopPropagation wrappers must not make delete or receipt clicks also open the edit modal (regression test included).
- T22: other consumers that relied on SimulatorSplitLayout's <main> (sandbox, stories). The landmark test must assert there is no main.
- T31/T32: the side-by-side decorator must stay the default for humans. Under test exactly one theme renders, otherwise duplicate ids and landmarks give false violations.
- T32: `bun run test` (one of the four mandatory gates) must not start needing a browser; keep the storybook project out of the default test script.
- T33: waivers must be per story with a rule id and finding id. A global `a11y.test: 'todo'` or disabled rules would defeat the gate.
- Panda codegen: a new token key needs `panda codegen` in packages/ui, apps/web and apps/marketing. A stale gitignored styled-system can hide a typo because strictTokens is off; verify the emitted CSS variable exists (--colors-primary-solid).
- Snapshots: regenerated .snap files should differ only in the intended class names (bg_primary to bg_primary.solid, bd-c_border to bd-c_border.input).

## Risks

- Dark-mode visual shift. Primary text and borders get lighter across about 250 sites, and CTA fills get darker. There is no visual regression tooling in CI, so the review is manual.
- AGENTS.md and component-guidelines.md enumerate the primary keys. Options A and B of D1 mean editing the project's law documents, which needs the owner's approval.
- Light chart.warning at warning.600 only just passes on canvas (3.04). Any future lighter surface behind charts will fail; the matrix test pins it.
- The Storybook browser gate adds new devDependencies, a Chromium download and minutes of CI. Flake risk from transitions, Recharts animation, fonts and the router mock. Marketing stories may need their own providers.
- The unlayered global focus-visible rule may visually double up with existing component outlines, or show on mouse focus in some browsers' heuristics for inputs (inputs always match :focus-visible). This is intended for text inputs but changes their look.
- Snapshot churn in 5 or more .snap files hides unintended diffs if they are regenerated in bulk.
- Not fixed here: about 52 files render native inputs with inline styles, and only the shared FLP fields and SliderField get border.input. The remainder depends on E9 adoption or a follow-up sweep, so SC 1.4.11 stays partly failing on bespoke forms.
- Several audit counts were static and the stated lines held, but the J-16 blue.500 contrast claim no longer holds (FLPHeading.tsx:43 maps it). The SimulatorSplitLayout nested <main> is a new finding the audit missed.
- The local generated web styled-system still lists a bare 'destructive' token (stale output). J-08's 'invalid CSS' impact cannot be confirmed without codegen; the fix is the same either way.
- Changing the Biome rules to error makes `bun run lint` fail on new violations. With N-03 (`--write`) unresolved this still gates, because these rules have no safe autofix, but developers may hit it unexpectedly.

## Rollout

Order of PRs. Each passes the four gates (bun run lint, check-types, test, build) and names its finding ids in the description.
(1) T01 harness. Known failures are listed as it.fails, so the failing list is visible and the PR is green.
(2) The tokens that need no decision: T05.
(3) T03 to T04 once D2 is decided, then T06 to T07 once D1 is decided. Each token PR includes a manual Storybook dark and light before/after for Button, SliderField, the FLP fields, NavMenu and the dashboard widgets, and runs panda codegen in ui, web and marketing.
(4) Focus and semantics: T09, T10, T11, T22, T23, T24, then the Biome fixes T16 to T20, then T21 to escalate the rules.
(5) New primitives T12 and T13, then T14, T15, T17, T26, T28, T29, then T30 once D5 is decided.
(6) The gate, once D3 is decided: T31, T32, T33, then T34 as a non-required job, made required once green for about 1 to 2 weeks.
(7) T35 per D4. J-14 waits on E12.
Verification per task: the named Vitest tests, Storybook stories rendered in both themes with play() where interactive, and a Biome a11y count recorded in each Biome PR. After T34, no new waivers are allowed.

## Facts (as cited by the planner)

- The primary tokens are where the audit said. Dark DEFAULT is indigo.500, dark hover is indigo.400 (a lighter step), and foreground is a fixed #ffffff in both themes. White on indigo.500 is 4.47 and white on indigo.400 is 2.98, both below 4.5. (`packages/ui/src/tokens/index.ts:174-180`)
- Dark border.input is the same value as border.DEFAULT: dark.border, rgba(255,255,255,0.08). Over the dark card that composites to 1.25:1. Light border.input is slate.300 at 1.48:1 on white. Both are below 3:1. (`packages/ui/src/tokens/index.ts:202-208 and :38`)
- The token a11y test only checks light text on #fff, two dark text pairs on canvas, and three light status badges. getLuminance only parses #rrggbb, so it cannot resolve {colors.x} references or rgba tokens. That is why the dark primary, border and chart failures are unguarded. (`packages/ui/src/tokens/tokens.a11y.test.ts:5-24, 79-117`)
- The namespace test asserts exactly the 6 top-level namespaces. Adding a key inside primary.* (for example primary.solid) does not break it. A new top-level namespace would. (`packages/ui/src/tokens/tokens.a11y.test.ts:38-42`)
- The Button primary variant uses bg primary, color primary.foreground and hover bg primary.hover. The destructive variant uses bg status.danger.solid with text.onContrast. White on dark danger.solid (destructive.500) is 3.76. (`packages/ui/src/primitives/Button/Button.styles.ts:26-30, 59-63`)
- In web, FLPButton wraps the ui Button, so the token and recipe change reaches every web button. Web otherwise imports only StatusBadge, SegmentedTabs and SliderField from @repo/ui. (`apps/web/app/components/core/buttons/FLPButton.tsx:1,58-66`)
- The SliderField value pill text is color primary (3.90 in dark today). Its border is border.subtle. The pill input has outline none and no focus or focus-within style. The range input has no aria-valuetext. accentColor uses token(colors.primary). (`packages/ui/src/primitives/SliderField/SliderField.styles.ts:40,43,51; packages/ui/src/primitives/SliderField/SliderField.tsx:60-73, 86-97`)
- FLPInput: borderColor border, outline none, focus changes the border and shadow to primary, the error colour is the bare 'destructive' (not in semanticTokens), id={label}, and the error is a bare span with no aria association. (`apps/web/app/components/core/inputs/input/FLPInput.tsx:53,56,59-62,78,94,99`)
- FLPSelect repeats the pattern: borderColor border, outline none, focus primary, id={label}. FLPCheckbox fills with bg primary under a hardcoded #ffffff tick and uses color destructive for errors. (`apps/web/app/components/core/inputs/select/FLPSelect.tsx:59,62,66,81; apps/web/app/components/core/inputs/checkbox/FLPCheckbox.tsx:101-103,134`)
- Primary token usage by role (grep, excluding generated output). color: "primary": 67 in web, 12 in ui, 22 in marketing. var(--colors-primary): 60 as color, 9 accentColor, 5 borderColor, 5 backgroundColor. borderColor: "primary": 76 / 2 / 5. Background uses of primary: about 25 sites, such as FLPCheckbox.tsx:102, NavMenu.tsx:63, five dashboard widgets, TaxContainer.tsx:592 and 2140, ProgressBar.styles.ts:23 and Button.styles.ts:27. (`apps/web/app, packages/ui/src, apps/marketing/src (grep counts)`)
- border.input is used in only 2 places, both in GlobalBaselineBar. Changing its value has a small blast radius until field components switch to it. borderColor: "border" appears in 85 files. (`packages/ui/src/patterns/GlobalBaselineBar/GlobalBaselineBar.tsx:137,171`)
- A Revoke text button uses status.danger.solid as its text colour. Moving dark danger.solid to destructive.600 would drop that text to 3.61:1, so the site must move to status.danger.text. (`apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx:877`)
- Token propagation. The ui preset feeds colors and semanticTokens into Panda. web and marketing load the same preset and scan packages/ui/src. The web CSS is produced at build and dev time by the pandacss PostCSS plugin. styled-system/ is gitignored. turbo has a cached 'generate' task, but apps/web has no generate script, only prepare: panda codegen. (`packages/ui/panda.preset.ts:1-18; apps/web/panda.config.ts:2,12,18; apps/marketing/panda.config.ts:2,12,18; apps/web/vite.config.mts:26-30; .gitignore:31; turbo.json:5-8; apps/web/package.json:87`)
- 5 snapshot files contain Panda class names bg_primary and bg_primary.hover, so renaming a fill token changes the snapshots. (`apps/web/app/components/core/buttons/__snapshots__/FLPButton.test.tsx.snap (and 4 other .snap files)`)
- The Storybook preview's a11y config only lists color-contrast (already on by default in axe) and sets no a11y.test mode. In the installed addon-a11y the default mode is 'todo', which does not fail. The default theme is side-by-side, which renders <Story/> twice in one DOM, so ids and landmarks are duplicated for axe. (`apps/web/.storybook/preview.tsx:27,47-56,85-150; apps/web/node_modules/@storybook/addon-a11y/dist/_browser-chunks (test: "todo")`)
- Storybook loads stories from web, ui and marketing, and registers addon-vitest and addon-a11y. (`apps/web/.storybook/main.ts:12-23`)
- The web Vitest config only includes app/**/*.test files under happy-dom and has no storybookTest project. test:storybook is only 'storybook build --test'. (`apps/web/vite.config.mts:94-96; apps/web/package.json:90; package.json:22`)
- @vitest/browser and @vitest/browser-playwright are optional peers of addon-vitest and are not installed. The addon's Vitest 4+ template uses the playwright provider with headless chromium. axe-core 4.14.0 is already in the lockfile. (`bun.lock:991; apps/web/node_modules/@storybook/addon-vitest/templates/vitest.config.4.template.ts`)
- CI runs only lint, check:auth, check-types, test and build. There is no Storybook or a11y job. (`.github/workflows/ci-pipeline.yml:41,44,64,84,109`)
- The Biome a11y rules are all 'warn' except useAltText, useAriaPropsForRole, useValidAriaRole and useAnchorContent. A read-only run of Biome 2.6.5 (biome lint, no --write) today gives exactly 20 a11y warnings at the audit's lines. useKeyWithClickEvents (7): TaxContainer 1776 and 1819, AccountDetailContainer 237, SetupChecklist 165, SavingsAccountsList 521, 557 and 603. noStaticElementInteractions (6): AccountsCard 236, AccountDetailContainer 237, SetupChecklist 165, SavingsAccountsList 521, 557 and 603. useSemanticElements (7): PayoffStrategySwitcher 248, 322 and 392, ConnectBankWizard 409, 509 and 535, marketing HomeFAQ 102. useButtonType, noSvgWithoutTitle and useFocusableInteractive currently have 0 hits. (`biome.json:98-110; Biome output for apps/ and packages/`)
- There are 66 story files: 25 in web, 29 in ui, 12 in marketing. 34 have no play(). None sets an a11y parameter. (`find *.stories.tsx (apps/web, packages/ui, apps/marketing)`)
- web index.css declares the layer order reset, base, tokens, recipes, utilities, and puts its base styles in @layer base. The reduced-motion block is unlayered, and its animation-iteration-count: 1 stops spinners. The global checkbox focus ring is rgba(99,99,241,0.35), which is 1.60:1 on white. (`apps/web/app/index.css:1,3-135,41-44,137-146`)
- There are no aria-live, role=status, role=alert, aria-busy, aria-invalid, aria-describedby or aria-errormessage attributes anywhere in apps/web/app or packages/ui/src (grep returns 0). There is no scroll-padding and no skip link. (`apps/web/app, packages/ui/src (grep)`)
- New finding, not in the audit: SimulatorSplitLayout renders its own <aside> and <main>. Any page using it gets a <main> nested inside the root <main>. Today only the sandbox uses it, but AGENTS.md makes it mandatory for /debt, /mortgage, /pension and /forecast. (`packages/ui/src/patterns/SimulatorSplitLayout/SimulatorSplitLayout.tsx:22-23; apps/web/app/root.tsx:121; apps/web/app/features/sandbox/components/SandboxTemplates/SandboxTemplates.tsx`)
- Landmarks and headings. The desktop <nav> has no label, while the mobile nav is labelled. auth.callback has only an h2. The root <main> has moved to line 121 (the audit said 118). (`apps/web/app/components/structure/header/Header.tsx:137; apps/web/app/components/navigation/MobileBottomBar.tsx:112; apps/web/app/routes/auth.callback.tsx:46; apps/web/app/root.tsx:121`)
- Audit correction (J-16). HomeDashboard has moved to components/dashboard/HomeDashboard.tsx:319. FLPHeading already maps color="blue.500" to text.primary, so there is no undefined-contrast bug, only a misleading prop. blue.500 also exists through @pandacss/preset-panda. (`apps/web/app/components/dashboard/HomeDashboard.tsx:319; apps/web/app/components/core/typography/FLPHeading.tsx:43`)
- The tax record row is still opened by clicking the <tr> only, with no key handler or Edit button (J-03). (`apps/web/app/containers/tax/TaxContainer.tsx:1717-1721`)
- ConnectBankWizard and MonthlyBalanceCheckInDrawer render plain FLPHeading headings, not Dialog.Title, so both dialogs are unnamed (J-04). (`apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx:381,386,498; apps/web/app/components/accounts/MonthlyBalanceCheckInDrawer.tsx:129,160`)
- The J-05 sites with no focus replacement still exist. The repo has 49 outline none/0 lines in total. (`McpConnectionCard.styles.ts:48; McpConnectionCard.tsx:550,584; SavingsForecasterCard.tsx:263,502; BudgetCategoryTable.tsx:79`)
- FLPSlider already sets aria-valuetext. The ui SliderField does not. (`apps/web/app/components/core/inputs/slider/FLPSlider.tsx:167`)
- The AGENTS.md law and the component guidelines both list the allowed primary keys. Any new key (primary.solid or primary.text) means editing these law documents. (`AGENTS.md:21; docs/agents/component-guidelines.md:43`)
- The architecture law test enforces the colocated 5-file structure for every directory under primitives and patterns. Its grep-style token-boundary test is the pattern to copy for new ratchets. (`packages/ui/src/tokens/architecture.laws.test.ts:69-83,129-170`)
- 97 lines use the status hex colours as text (#10b981, #ef4444, #f59e0b), and 15 web lines use color: "destructive". (`apps/web/app, apps/marketing/src (grep)`)
- FLPProgressBar uses status.*.solid only as fills, not as text backgrounds. (`apps/web/app/components/core/progress/FLPProgressBar.tsx:19-21`)

## Fact-check

34 claims checked; 3 not confirmed.

- **unclear**: Biome a11y rule severities and the 20 warning breakdown — biome.json:98-110 severities confirmed. I did not run Biome, so the per-file warning counts are unverified.
- **unclear**: 66 story files (25/29/12), 34 without play(), none sets an a11y parameter — 25/29/12 confirmed and no story mentions a11y. My grep -L 'play' gives 33 without play, not 34. The match is loose, since 'display' would also match. Treat 33 or 34 as approximate.
- **false**: 97 lines use the status hex colours as text; 15 web lines use color: "destructive" — The destructive count of 15 is right. For hex, my grep of #10b981/#ef4444/#f59e0b across apps and packages (excluding node_modules and styled-system) gives 136 lines of the form color: "#hex" and 259 lines in total, including non-text uses like budget.ts:74,76 and pageConfig.ts:56. 97 is not reproducible, so the sweep size needs re-scoping.

Issues the checker says were missed:

- apps/web/app/routes/auth.callback.tsx:52-60: the error-page login link is inline-styled as var(--colors-primary) background with color #fff. This is the same white-on-dark-primary pair, so it must move to primary.solid. The planned sweep of 'bg primary' sites in Panda form will miss it.
- packages/ui/src/primitives/Button/Button.styles.ts:20-21 and SliderField.styles.ts:51-53: Panda _focusVisible rules set outlineColor/outlineOffset from border.focusRing. The planned unlayered global `outline: 2px solid` rule beats every layered Panda utility, so it overrides these custom focus styles. Scope the rule to elements without their own focus style, or drop those duplicates.
- apps/web/app/index.css:38-46: the checkbox base rules use var(--colors-primary, #6363f1) for border and focus. A primary.DEFAULT dark change to indigo.400 shifts these too, and the checked-state fill in the same block (below line 46) likely uses primary as a background. It needs the same fill-versus-accent judgement as FLPCheckbox.tsx:102.
- apps/web/.storybook/preview.tsx:73,159: the side-by-side branch wraps stories in data-theme containers, and the single-theme branch sets data-theme from globals. The 'render one theme under test' change needs a way to pass the theme in (initialGlobals or a THEME env var). Currently the default is 'side-by-side' at line 27, so the gate would silently run the duplicated-DOM mode unless that default is changed.
