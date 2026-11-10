# Component Creation & Editing Guidelines for Agents

Use this guide whenever creating, refactoring, or editing React UI components across `packages/ui`, `apps/web`, and `apps/marketing`.

---

## 1. Colocated 5-File Directory Structure

Create every component inside its own `PascalCase` directory with all 5 colocated files:

```text
ComponentName/
├── ComponentName.tsx          # Pure React implementation (zero inline style={{}} props)
├── ComponentName.styles.ts    # Panda CSS cva / sva recipes using canonical semantic tokens
├── ComponentName.stories.tsx  # Storybook 8 visual states + play() interaction test
├── ComponentName.test.tsx     # Vitest unit & interaction test
└── index.ts                   # Barrel export: export * from "./ComponentName"; export * from "./ComponentName.styles";
```

Where components belong:

- **Shared primitives, patterns, and calculators**: `packages/ui/src/{foundations|primitives|patterns|calculators}/ComponentName/`
- **Web feature components**: `apps/web/app/features/<feature-domain>/components/ComponentName/`
- **Marketing components and pages**: `apps/marketing/src/{components|pages}/ComponentName/`

Register new component directories in `packages/ui/src/tokens/architecture.laws.test.ts` so CI verifies the 5-file invariant and token boundaries on every run.

---

## 2. Canonical Semantic Tokens & Styling (`ComponentName.styles.ts`)

Author all component styles in `ComponentName.styles.ts` using Panda CSS `cva` or `sva` from `@repo/ui/styled-system/css` (or `@repo/ui/styled-system/patterns` for `flex`, `grid`, `stack`).

### Canonical Token Namespaces

Use **only** these 6 semantic token namespaces (`packages/ui/src/tokens/index.ts`):

| Namespace   | Allowed Tokens                                                                                                                                     | Typical Usage                                                               |
| :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `surface.*` | `surface.canvas`, `surface.card`, `surface.sunken`, `surface.subtle`, `surface.overlay`, `surface.contrast`                                        | Page backgrounds, elevated cards, inset code/tablewells, dark hero callouts |
| `text.*`    | `text.primary`, `text.secondary`, `text.muted`, `text.onContrast`                                                                                  | Headings, body copy, captions, text on `surface.contrast`                   |
| `border.*`  | `border.DEFAULT`, `border.subtle`, `border.strong`, `border.input`, `border.focusRing`                                                             | Card borders, table dividers, form inputs, focus rings                      |
| `primary.*` | `primary` (`DEFAULT`), `primary.hover`, `primary.subtle`, `primary.border`, `primary.foreground`                                                   | Brand CTAs, active tabs, accent badges, primary links                       |
| `status.*`  | `status.{positive\|warning\|danger\|info\|neutral}.{text\|bg\|border\|solid}`                                                                      | Semantic badges, alerts, trend indicators, status dots                      |
| `chart.*`   | `chart.primary`, `chart.wealth`, `chart.debt`, `chart.warning`, `chart.accentPurple`, `chart.accentCyan`, `chart.grid`, `chart.series1`..`series5` | Data visualisations and chart series                                        |

### Styling Rules

- **Use `cva` variants instead of inline styles**: Express dynamic state (`active`, `tone`, `size`) via `cva` variants rather than `style={{ ... }}` props, raw hex codes, `var(--colors-...)`, or primitive scale tokens (`slate.*`, `indigo.*`, `emerald.*`).
- **Tabular numerals on financial data**: Set `fontVariantNumeric: "tabular-nums"` on every recipe displaying currency figures, percentages, dates, tax bands, or slider badges.
- **Asset vs liability polarity**: Style decreasing liability balances (`Mortgage`, `Loan`, `Credit Card`) with `status.positive.*` and increasing liability balances with `status.danger.*`, while keeping the directional arrow (`↑` / `↓`) faithful to the numeric change.

---

## 3. Progressive Disclosure & Layout Primitives

Import and compose shared layout patterns from `@repo/ui`:

- **Top-level page metrics (`<KpiStrip>`)**: Render up to 4 top-level KPIs in a single horizontal row (`lg:grid-cols-4` or `3`).
- **Interactive calculators (`<SimulatorSplitLayout>`)**: Place sticky parameter controls in the left column (`lg:col-span-5` or `4`) and live charts/outcomes in the right column (`lg:col-span-7` or `8`).
- **Numeric slider controls (`<SliderField>`)**: Render label top-left, compact editable value pill top-right, and range track below.
- **Schedules and ledgers > 8 rows (`<CollapsibleDrawer>` / `<SegmentedTabs>`)**: Place amortisation tables, 12-month ledgers, and multi-year tax schedules inside a `<CollapsibleDrawer>` (collapsed by default) or a secondary `<SegmentedTabs>` panel.
- **Portals for overlays**: Mount dialogs, drawers, and bottom sheets via Radix `<Dialog.Portal>` so parent `backdrop-filter` or `transform` styles do not trap `position: fixed` elements.

---

## 4. UK Domain & Copy Standards (`docs/copy-style-guide.md`)

- **British English (`en-GB`)**: Use UK spelling across all UI copy, labels, and comments: `anonymise` / `anonymisation`, `optimise` / `optimisation`, `amortisation`, `modelling`, `categorisation`, `summarise`, `authorise`, `visualise`, `analyse`, `catalogue`, `enrolment`, `favourite`.
- **Sentence case**: Use sentence case for all headings (`h1`–`h4`), buttons, tabs, badges, and table headers. Capitalise only proper nouns and statutory UK acronyms (`HMRC`, `FCA`, `PAYE`, `NI`, `ISA`, `SIPP`, `LTV`, `AER`, `APR`, `EAR`, `POA`, `Section 24`, `Self Assessment`, `Personal Allowance`).
- **Punctuation**:
  - Use spaced en-dashes (`–`) for parenthetical breaks.
  - Use closed en-dashes (`–`) for ranges (`£100k–£125k`, `2025/26–2026/27`, `0–100`).
  - Omit exclamation marks in headings, buttons, badges, and toast confirmations (use `"Copied"` instead of `"Copied!"`).
- **Currency formatting**: Format currency values with `useFormatCurrency()` in `apps/web` or `Intl.NumberFormat("en-GB")` in shared/stateless packages.
- **Deterministic UK financial figures**: Derive example and preview payloads from `@flump/finance-engine` so tax bands, Personal Allowance tapering (£1 lost per £2 above £100,000), and Section 24 relief match HMRC rules.

---

## 5. Testing, Storybook & Accessibility Verification

### Test ID & Accessibility Conventions

1. **Pair `id` and `data-testid` on tested elements**: `apps/web/test/vitest.setup.ts` configures Testing Library with `testIdAttribute: "id"`, whereas Storybook `play()` and `apps/marketing` use `data-testid`. Always set both attributes on elements targeted by tests:

   ```tsx
   <div id="mcp-connection-card" data-testid="mcp-connection-card">
   ```
2. **Radix `<SegmentedTabs>` in Vitest JSDOM**: Radix `Tabs.Trigger` activates on pointerdown or keyboard events rather than synthetic `click` in JSDOM. Trigger tab changes in `.test.tsx` with:

   ```ts
   const tab = screen.getByRole("tab", { name: /Active Tokens/i });
   fireEvent.pointerDown(tab, { button: 0 });
   fireEvent.keyDown(tab, { key: "Enter", code: "Enter" });
   ```
3. **Storybook `play()` tests (`ComponentName.stories.tsx`)**:
   - Import `expect`, `userEvent`, `within`, `fn` from `"storybook/test"`.
   - Wrap components that render `<Helmet>` in `<HelmetProvider>` inside the story `decorators`.
   - Verify primary user interactions and assertions inside `play: async ({ canvasElement }) => { ... }`.
4. **No `autoFocus` prop**: Use callback refs or Radix Dialog focus management instead of `autoFocus` to satisfy Biome `lint/a11y/noAutofocus`.

---

## 6. Completion Checklist Before Committing

Run this exact sequence before committing or updating a pull request:

1. Format and lint modified files with Biome:

   ```bash
   bunx biome check --write <modified-files>
   ```
2. Verify architecture and token laws:

   ```bash
   cd packages/ui && bunx vitest run src/tokens/architecture.laws.test.ts
   ```
3. Execute the 4 mandatory monorepo CI gates from the repository root:

   ```bash
   bun run lint
   bun run check-types
   bun run test
   bun run build
   ```
