# Flump style guide

Status: adopted 2026-11-14. Owner: design system (`packages/ui`). Applies to the marketing site, the web app and the future mobile app.

This is the one description of how Flump looks. It states the visual language in platform-neutral terms so that the same decisions reach every platform. How things behave is in [UX-GUIDELINES.md](./UX-GUIDELINES.md). How the values reach React Native is in [CROSS-PLATFORM.md](./CROSS-PLATFORM.md). Words are in the copy guide (`docs/copy/COPY-GUIDE.md` when the copy programme lands it; until then [`docs/copy-style-guide.md`](../copy-style-guide.md)).

## How to read this guide

- **The code is the source of the values.** Tokens live in `packages/tokens/src/` (`@flump/tokens`; `@repo/ui` re-exports them, and the native theme is generated from them). If a value here disagrees with the token files, the token files win and this guide is corrected in the same PR. Full tables with contrast measurements are in [`docs/design/e15/tokens.md`](../design/e15/tokens.md).
- **This guide describes where we are going.** Items marked **[PR 1]** or **[PR 2]** are defined by the polish plan ([`docs/design/e16-polish/PLAN.md`](../design/e16-polish/PLAN.md), sections 4.1 to 4.5) and arrive with those PRs. Until they merge, the token or component may not exist on `main`. Hex values for PR 1 items are the plan's starting points; the shipped value is whatever passes `tokens.a11y.test.ts` with `KNOWN_FAILURES` empty.
- **Units.** Sizes are in CSS px. One px is one iOS point and one Android dp. Type sizes are authored in rem on the web so they follow the user's browser setting, and scale with the system font size on native.
- Every rule ends with how it is checked: **Enforced by** a named law or test, **Proposed check** for a check described in [UX-ASSESSMENT-2026-11.md](./UX-ASSESSMENT-2026-11.md) section 6 that does not exist yet, or **Review only**.

## 1. Character

Flump is a calm guide for a household's money. The look is "Direction C, warm guide": warm sand and warm charcoal neutrals, one deep teal accent, apricot for what you owe, rounded shapes, plain type and a lot of room around a small number of figures. It is not a trading terminal, a bank statement or a dashboard for analysts.

Three tests for any screen:

1. Could a person who is worried about money read it without feeling judged or alarmed?
2. Is there one thing to look at first?
3. Would it look like the same product if it were moved from the marketing site to the app, or from the web to a phone?

## 2. Colour

### 2.1 Structure

Three layers. Components use only the middle one.

| Layer             | What it is                                                          | Who may use it                  |
| ----------------- | ------------------------------------------------------------------- | ------------------------------- |
| Primitives        | Raw scales: `sand`, `teal`, `dark.*`, and the status and chart hues | Token files only                |
| Semantic tokens   | Purpose names with a light and a dark value                         | Every component, every platform |
| Component recipes | A component's use of semantic tokens                                | That component                  |

The semantic namespaces are fixed: `surface`, `text`, `border`, `primary`, `status`, `chart`.

**Rule C1.** No hex, rgb or primitive scale name in component or page code, on any platform. **Enforced by** `scripts/check-design-tokens.ts` (web and marketing); **Proposed check** for mobile (CROSS-PLATFORM section 7).

### 2.2 Core palette

| Token                                               | Light                                         | Dark                                          | Use                                                   |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `surface.canvas`                                    | `#f5f1ea`                                     | `#1d1a17`                                     | Page background                                       |
| `surface.card`                                      | `#fffdf9`                                     | `#272320`                                     | Cards, tables, drawers                                |
| `surface.subtle`                                    | `#f0ebe2`                                     | `#2e2a26`                                     | Hover fills, the scenario zone **[PR 2]**             |
| `surface.sunken`                                    | `#eae3d8`                                     | `#171412`                                     | Wells, input tracks                                   |
| `surface.overlay`                                   | `#ffffff`                                     | `#36322d`                                     | Dialogs, sheets, menus, popovers                      |
| `surface.contrast`                                  | `#22302c`                                     | `#3a352f`                                     | Rare inverted blocks                                  |
| `surface.hero`                                      | `#12483f`                                     | `#1b5448`                                     | The one headline block on a page                      |
| `surface.tint.teal` / `apricot` / `sage` **[PR 1]** | `#dcede6` / `#fae5cc` / `#e5edda`             | `#1f322d` / `#2e261c` / `#272f22`             | Icon tiles; at most one tinted section per page       |
| `surface.scrim`                                     | `rgba(43,38,32,.4)`                           | `rgba(8,6,4,.6)`                              | Backdrop behind dialogs and sheets; never behind text |
| `text.primary` / `secondary` / `muted`              | `#2b2620` / `#564f46` / `#6a6258`             | `#f4efe7` / `#cbc3b7` / `#a59d90`             | Body, supporting, quiet                               |
| `text.onContrast`                                   | `#f6f1e8`                                     | `#fffdf9`                                     | Text on `surface.hero` and `surface.contrast`         |
| `border` / `subtle` / `strong` / `input`            | `#dcd4c8` / `#e8e1d6` / `#b5ab9c` / `#867c6e` | `#3b362f` / `#302c27` / `#5c554a` / `#8f8678` | Card edge, dividers, emphasis, form controls          |
| `border.focusRing`, `primary`                       | `#0f6b5e`                                     | `#6fd0ba`                                     | Focus ring, links, selected state, icons              |
| `primary.solid` / `hover`                           | `#0f6b5e` / `#0a564b`                         | same in dark                                  | Fill behind `primary.foreground` (white) only         |
| `primary.subtle` / `border`                         | `#e1f0eb` / `#9ccfc2`                         | `#1e3b35` / `#2e6055`                         | Selected nav item, quiet accent fills                 |

### 2.3 Status colours

Each status has `text`, `bg`, `border` and `solid`. Values are in `tokens.md`.

| Status     | Hue                                                       | Means                                                                                            | Never means                                |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `positive` | Leaf green (kept apart from teal)                         | Something succeeded; a saved change                                                              | "Good finances"                            |
| `warning`  | Amber                                                     | Something needs the user's attention before it goes wrong (a deadline, an unverified tax figure) | Having debt, a low balance                 |
| `danger`   | Brick red                                                 | An error, or a destructive action                                                                | A negative number, a debt, a missed target |
| `info`     | Indigo today; a muted blue if owner decision D12 is taken | Information the user must act on                                                                 | A disclaimer or standing notice            |
| `neutral`  | Sand                                                      | Labels and states with no judgement ("Saved", "Illustration, not saved")                         |                                            |

**Rule C2. Colour never judges a person's finances.** Negative amounts are `text.primary` with a minus sign. Debt is apricot (`chart.debt`), never red. `status.danger` is for errors and destructive actions only; `status.warning` is not used on ordinary financial situations. **Enforced by** the no-judgement law in `check:laws` where it lands with the polish plan (P7.2); otherwise **Review only**, by the `ui-compliance-reviewer` agent.

**Rule C3. Status is never colour alone.** Every status carries an icon or a word (`StatusBadge` and `InlineAlert` add both). **Enforced by** the `StatusBadge` and `InlineAlert` component tests; **Review only** elsewhere.

**Rule C4. White text on a status fill only where it passes.** `status.danger.solid` may carry white text in both themes; `positive`, `info` and `neutral` solids in light only; `warning.solid` never. Use `status.*.bg` with `status.*.text` for labelled badges. **Enforced by** `tokens.a11y.test.ts`.

### 2.4 How much colour (light and dark)

Light mode had only two colours in practice (sand and teal). The polish plan adds colour without tinting data:

- About 60% sand canvas, 30% cards, 10% accent: the teal hero and buttons, apricot for debt, and the tint family on icon tiles.
- Cards separate from the canvas by a visible 1px `border` edge (the `border.DEFAULT` token; write `"border"` in code) and a slightly stronger warm shadow **[PR 1]**, not by tint.
- Each domain has one colour, used on its icon tile and its chart series everywhere:

| Domain                       | Colour  | Tokens                               |
| ---------------------------- | ------- | ------------------------------------ |
| Net worth, mortgage, pension | Teal    | `chart.primary`, `surface.tint.teal` |
| Savings                      | Sage    | `chart.wealth`, `surface.tint.sage`  |
| Debt                         | Apricot | `chart.debt`, `surface.tint.apricot` |
| Pay and tax                  | Neutral | `text.secondary`, `surface.subtle`   |

- At most one tinted section per page, never around a `KpiStrip`, a `ScenarioZone` or a chart. KPI cards are never tinted. The marketing site may use sage and apricot section bands (owner decision D16).
- Dark mode keeps Direction C as it is. Surfaces step lighter as they rise; the teal accent is the brighter `#6fd0ba` for text and icons while buttons stay deep teal. Apricot is a quiet `#2e261c` in dark, not a heavy brown **[R2-2]**.
- Dark mode works with JavaScript off (D30): every semantic token's dark value also applies under `prefers-color-scheme: dark` unless the page has been set to light (`systemDark` condition, `withSystemDark` in `@flump/tokens`). A component style that uses `_dark` must also set `_systemDark`. **Enforced by** `colorScheme.test.ts` **[R2-2]**.

**Rule C5.** `surface.hero` appears at most once per page, on the page's headline figure. **Enforced by** `expectPageRules` **[PR 2]**.

**Rule C6.** Marketing uses the same tokens as the app. No off-system colour, glow or gradient other than the logo. **Enforced by** `scripts/check-design-tokens.ts` (baseline may only shrink).

### 2.5 Contrast

| Pair                                                       | Minimum                                                 | Enforced by           |
| ---------------------------------------------------------- | ------------------------------------------------------- | --------------------- |
| Text on its surface                                        | 4.5:1 (3:1 for text at 24px or larger, or 18.66px bold) | `tokens.a11y.test.ts` |
| Control borders, focus ring, chart marks, meaningful icons | 3:1 against the adjacent surface                        | `tokens.a11y.test.ts` |
| Card edge against canvas                                   | 1.3:1 **[PR 1]**                                        | `tokens.a11y.test.ts` |
| Any two page surfaces                                      | 2.0 deltaE                                              | `tokens.a11y.test.ts` |

Both themes are tested. A new token is not added until its pairs are in the matrix.

## 3. Typography

### 3.1 Families

| Role                  | Family                       | Fallback    |
| --------------------- | ---------------------------- | ----------- |
| Headings and display  | Plus Jakarta Sans (variable) | System sans |
| Body, labels, numbers | Inter (variable)             | System sans |
| Code samples only     | System monospace             |             |

The app bundles exactly two fonts, self-hosted through `@repo/ui/fonts.css`. No third family, no monospace for decoration.

### 3.2 Scale

Use a text style, not a size. Sizes are the default at a 16px root.

| Text style                 | Size              | Weight          | Line height | Use                                                              |
| -------------------------- | ----------------- | --------------- | ----------- | ---------------------------------------------------------------- |
| `display`                  | 32 to 48px, fluid | 700             | 1.2         | Marketing hero headline only                                     |
| `heading.xl`               | 24 to 32px, fluid | 700             | 1.2         | Page title (h1)                                                  |
| `heading.lg`               | 22px              | 600             | 1.3         | Section title                                                    |
| `heading.md`               | 18px              | 600             | 1.3         | Card title                                                       |
| `heading.sm`               | 16px              | 600             | 1.4         | Group title inside a card                                        |
| `body.lg`                  | 18px              | 400             | 1.6         | Marketing lead paragraph                                         |
| `body.md`                  | 16px              | 400             | 1.5         | Default text                                                     |
| `body.sm`                  | 14px              | 400             | 1.5         | Supporting text, notices                                         |
| `label.md`                 | 14px              | 500             | 1.4         | Form labels, buttons                                             |
| `label.sm`                 | 12px              | 500             | 1.4         | KPI labels, table headers. Sentence case, no tracking **[PR 1]** |
| `numeric.hero` **[PR 1]**  | 36 to 48px, fluid | 700             | 1.2         | The headline figure                                              |
| `numeric.kpi`              | 32px              | 600             | 1.2         | KPI values                                                       |
| `numeric.lg` / `md` / `sm` | 20 / 16 / 14px    | 600 / 500 / 500 | 1.3 to 1.5  | Figures in cards, rows, axes and tooltips                        |
| `numeric.unset` **[PR 1]** | 16px              | 400             | 1.5         | "Not set", in `text.muted`                                       |

### 3.3 Rules

- **T1.** Font sizes come from text styles. No literal `px`, `rem` or `clamp()` in components. **Enforced by** `scripts/check-style-literals.ts` **[PR 1]**.
- **T2.** 12px is the smallest text anywhere. **Enforced by** `tokens.foundations.test.ts`.
- **T3.** Weights are 400, 500, 600 and 700. Nothing heavier. **Enforced by** `scripts/check-style-literals.ts` **[PR 1]**.
- **T4.** Every figure (money, percentage, date, duration, table cell, slider value) uses tabular numerals and UK formatting. **Enforced by** `scripts/check-tabular-nums.ts`.
- **T5.** The headline figure is the largest text on the page after the h1. "Not set" is never larger or heavier than a real value. **Enforced by** `expectPageRules` and the `KpiCard` stories **[PR 2]**.
- **T6.** Sentence case everywhere. No uppercase eyebrows, no letter-spaced labels. **Review only** (the copy guard covers words, not case).
- **T7.** One h1 per page, and heading levels do not skip. **Enforced by** Storybook a11y for components; **Proposed check** for pages (page-level axe scan).
- **T8.** Body text lines are at most about 75 characters wide. **Review only**.
- **T9.** Text must survive 200% zoom and the system's largest text setting without clipping or overlap. **Proposed check** (assessment section 6).

## 4. Spacing and layout

Spacing is a 4px scale: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. No other gap or padding value.

| What                        | Value                                              |
| --------------------------- | -------------------------------------------------- |
| Content width               | 1200px at most (`sizes.page.max`) **[PR 1]**       |
| Page gutters                | 16px on a phone, 24px from 768px, 40px from 1024px |
| App header to h1            | 20px on a phone, 32px from 1024px                  |
| Gap between page sections   | 32px                                               |
| Card padding                | 20px (14px in compact density)                     |
| Gap between cards in a grid | 16px (10px compact)                                |
| Control heights             | 32, 40, 48px (28, 32, 40px compact)                |
| Minimum touch target        | 44 by 44px. Never shrinks, in any density          |

Breakpoints: 640, 768, 1024, 1280px. The navigation switches from the phone pattern (menu button, drawer and, in the app, the bottom bar) to the desktop pattern at 768px (`NAV_BREAKPOINT`, owner ruling 2026-11-14), on marketing and web alike. From 768px to 1023px the desktop bar is compact, and from 1024px (`NAV_WIDE_BREAKPOINT`, `_navWide`, the "everything fits" width, shared by both sites) it is full. Compact: text-only links (group buttons keep their chevron), the logo as the way home in the web app ("Home" shows inline from 1024px), the one-button theme switch, and on marketing the lower-priority items ("AI connection", "Sample data", "Sign in") move into the menu, whose button stays (`wideOnly` links, `menuBelow="wide"`); text never shrinks. Full: links with icons (web), every marketing link, and the three-way theme switch. The phone top bar holds the menu button, logo, one-button theme switch and the account avatar (or "Sign in"), all 44px targets, and fits at 320px.

Page order for every app page: `PageHeader`, `HeroFigure`, `KpiStrip`, "Your details", `ScenarioZone`, drawers. Pages render through `PageBody` **[PR 2]**.

- **S1.** Spacing uses the scale. **Review only** (inline styles are counted by `check-style-literals.ts` **[PR 1]**).
- **S2.** Every app page uses `PageBody`; no page sets its own width or gutters. **Enforced by** `expectPageRules` **[PR 2]**; **Review only** until then.
- **S3.** Compact density is for pointer-driven tables and simulators only. It never applies on a touch device and never reduces the 44px target. **Review only**.

## 5. Radius

| Token            | Size | Used on                                           |
| ---------------- | ---- | ------------------------------------------------- |
| `xs`             | 4px  | Tags inside dense tables                          |
| `sm`             | 6px  | Small controls                                    |
| `control` (`md`) | 8px  | Buttons, inputs, the slider value pill            |
| `lg`             | 12px | The selected tab thumb, icon tiles                |
| `card` (`xl`)    | 16px | Cards, KPI cards, tables, drawers, tabs container |
| `tray` (`2xl`)   | 24px | Dialogs, sheets, section trays, the hero block    |
| `full`           | Pill | Badges, avatars, switches                         |

- **R1.** A nested shape has a smaller radius than its container. **Review only**.
- **R2.** No literal radius. **Enforced by** `scripts/check-style-literals.ts` where it covers radii; otherwise **Review only**.

## 6. Elevation

| Level | Token                                                               | Used on                                       |
| ----- | ------------------------------------------------------------------- | --------------------------------------------- |
| 0     | none                                                                | Canvas, sunken wells, the scenario zone       |
| 1     | `shadows.card` plus a 1px `border` edge                             | Cards, KPI cards, tables                      |
| 2     | `shadows.raised`                                                    | A card on hover or while dragged; sticky bars |
| 3     | `shadows.overlay`                                                   | Dialogs, sheets, menus, popovers, toasts      |
| Focus | `shadows.focus` or a 2px `border.focusRing` outline with 2px offset | Any focused control                           |

Light shadows are tinted with the warm ink (`rgba(43,38,32,a)`), never grey-blue. Dark mode raises by a lighter surface plus a hairline (an inset top highlight and a 1px ring), with only a modest shadow.

- **E1.** Elevation shows stacking order, not importance. The headline is made important by size and the hero surface, not by a shadow. **Review only**.
- **E2.** Every shadow has a dark value and uses warm ink. **Enforced by** `tokens.foundations.test.ts`.
- **E3.** Layer order comes from the z-index scale (sticky 10, header 20, dropdown 30, overlay 40, modal 50, popover 55, toast 60, tooltip 65, skip link 70). **Review only**; existing numeric literals are known debt.

## 7. Iconography

- One icon set: Lucide, through the `Icon` primitive. Sizes 16, 20 (default) and 24px; stroke 1.75; colour inherits from the parent's semantic token.
- Icons support a label. An icon alone is allowed only for close, back, menu, search, edit, delete, info and theme, and then the control has an accessible name and a 44px target.
- Money is `PoundSterling`. Never a dollar glyph.
- No icon that dramatises a financial situation: no flames, skulls, warning triangles or alarm bells on ordinary debts or balances.
- An arrow or trend icon must match the direction of the number beside it.
- A domain's icon sits on an `IconTile`: a 40px tile, radius `lg`, in that domain's tint **[PR 2]**.

- **I1.** No `react-icons` imports. **Enforced by** `scripts/check-react-icons.ts` (baseline only shrinks).
- **I2.** Icon-only controls have an accessible name. **Enforced by** Storybook a11y for components; **Proposed check** for pages.

Detail and the migration table: [`docs/design/e15/iconography.md`](../design/e15/iconography.md).

## 8. Illustration

- Illustrations are for empty states, onboarding and "not found" only. One per screen at most. Never beside real figures.
- Style: flat shapes in the palette's own tokens (sand, teal, sage, apricot), soft rounded forms that echo the logo, no outlines, no people's faces, no piles of coins or cash, no upward-arrow "growth" clichés.
- They are decorative: hidden from assistive technology, and the text beside them carries the meaning.
- The four scenes today are `empty-accounts`, `empty-goals`, `onboarding` and `not-found` (`Illustration` primitive). A new scene is added to the primitive, drawn with token colours so it follows the theme, and exported as SVG so mobile can use the same source.
- The hero block may carry one soft decorative shape at low opacity **[PR 2]**. Nothing else is decorated.

**IL1.** Illustrations use semantic tokens and follow the theme. **Enforced by** `scripts/check-design-tokens.ts`. **IL2.** Placement. **Review only**.

## 9. Logo

- The logo is the Flump blob: a soft teal form with a radial gradient and a small ground shadow, drawn inline so it follows the theme. It is the only gradient in the product.
- One component (`FlumpLogo`, wrapped by `HomeLogo` in the header) on marketing and web. The mobile app icon and in-app logo are drawn from the same artwork.
- Sizes `sm`, `md`, `lg`. Clear space around it is at least half its width. Do not recolour it, rotate it, add a wordmark in another typeface, or place it on `surface.hero` or a photograph.
- In a header it links to home and takes its accessible name from the link.

**L1.** Marketing and web render the same logo, theme switcher, top bar, drawer, footer and favicon from `@repo/ui`. **Enforced by** `chrome-parity.laws.test.ts`.

## 10. Charts

Chart behaviour rules are in UX-GUIDELINES section 8 and [`docs/design/data-viz.md`](../design/data-viz.md). The palette:

| Token                       | Light                                | Dark        | Use                                                    |
| --------------------------- | ------------------------------------ | ----------- | ------------------------------------------------------ |
| `chart.primary` (`series1`) | `#0f6b5e`                            | `#5cc4ae`   | Net worth, mortgage, pension; the main line            |
| `chart.wealth` (`series2`)  | `#64885c`                            | `#9ad0a0`   | Savings                                                |
| `chart.debt` (`series3`)    | `#c26a18`                            | `#eda45f`   | What you owe                                           |
| `series4` to `series8`      | purple, rose, blue, olive-gold, grey |             | Further entities, in this order                        |
| `chart.projection`          | `#6b3f2a`                            | `#ffd2a8`   | Forecast lines, always dashed                          |
| `chart.band`                | teal at 14%                          | teal at 15% | The range behind a forecast line; a fill, never a line |
| `chart.baseline`            | `#867c6e`                            | `#8f8678`   | Zero line, targets, reference lines                    |
| `chart.grid`                | ink at 8%                            | paper at 8% | Gridlines                                              |

- **CH1.** Chart colours come from `chart.*` only, through `chartColor()` and `seriesColor()`. **Enforced by** `scripts/check-design-tokens.ts` and `charts.test.ts`.
- **CH2.** A colour identifies an entity, never an outcome. No red and green pairs. **Review only**.
- **CH3.** Every series also has a direct label, a marker or a dash. Forecasts are dashed. **Review only**; `ChartFigure` turns direct labels on by default (off when `legend` is passed or there are more than 3 series) **[R2-2]**.
- **CH6.** At most 6 x ticks, the last tick inside the plot, months as "Sep" not "Sept", and a y-axis near the data range unless the data is near zero: use `CHART_AXIS_DEFAULTS`, `formatMonthTick`, `xTickAnchor` and `niceYDomain` from `@repo/ui` **[R2-2]**. **Enforced by** `axisDefaults.test.ts` for the helpers; **Review only** for adoption.
- **CH4.** Series, projection and baseline are at least 3:1 on every surface, and adjacent series stay apart under simulated colour-vision deficiency. **Enforced by** `tokens.a11y.test.ts`.
- **CH5.** Axis, legend and tooltip text uses the numeric text styles and `formatAxisCurrency`. **Enforced by** `scripts/check-tabular-nums.ts`; **Review only** for the formatter.

## 11. Motion values

| Token                                 | Value                                                         | Use                                                             |
| ------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `durations.fast`                      | 120ms                                                         | Hover, press, a scenario result changing                        |
| `durations.base`                      | 200ms                                                         | Tabs, disclosure, toasts                                        |
| `durations.slow`                      | 320ms                                                         | Sheets and dialogs                                              |
| `durations.loop`                      | 800ms                                                         | One turn of a continuous loop (the pending spinner in `Button`) |
| `easings.standard` / `enter` / `exit` | `cubic-bezier(0.2,0.6,0.2,1)` / `(0,0,0.2,1)` / `(0.4,0,1,1)` | Moving within the screen / arriving / leaving                   |

**M1.** Durations and easings come from tokens. **Enforced by** `scripts/check-style-literals.ts` **[PR 1]**. Behaviour rules are in UX-GUIDELINES section 12.

## 12. Component anatomy and states

Storybook is the living specification: every component has stories in light and dark with the accessibility check on. This section fixes what must be the same on every platform. Props use one vocabulary: `variant` (visual treatment), `tone` (meaning) and `size` (`sm`, `md`, `lg`).

### 12.1 States every interactive component has

| State                | Treatment                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Default              | As specified                                                                                                    |
| Hover (pointer only) | `surface.subtle` fill or `primary.hover`; never the only sign that something is clickable                       |
| Focus (keyboard)     | 2px `border.focusRing` outline, 2px offset, never removed, never hidden behind a sticky bar                     |
| Pressed              | A darker fill; on touch, immediate feedback                                                                     |
| Selected             | `primary.subtle` fill with `primary` text or icon, plus a non-colour cue (weight, tick or thumb)                |
| Disabled             | Lower contrast and no pointer; a visible reason nearby. Prefer leaving a button enabled and explaining on press |
| Loading              | The control keeps its size; its label is replaced by a spinner with an accessible "loading" name                |
| Error                | `status.danger.text` message under the control with an icon; the control gets a `status.danger.border`          |

**ST1.** Focus is always visible. **Enforced by** Storybook a11y and component tests; **Proposed check** for pages. **ST2.** No information on hover only. **Review only**.

### 12.2 Anatomy

| Component                                                               | Parts                                                                                                   | Fixed rules                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                                | Label, optional leading icon                                                                            | Variants: `primary` (teal fill, one per page), `outline`, `ghost`, `link`, `danger`. Heights 40, 48, 56px. Label is a verb phrase                                                                                                      |
| `TextInput`, `CurrencyInput`, `PercentInput`, `Select` in a `FormField` | Label above, control, helper text, error text                                                           | Label always visible. `£` and `%` are fixed adornments, not typed. 8px radius, `border.input` edge                                                                                                                                     |
| `SliderField`                                                           | Label top left, editable value pill top right, slider below, optional helper                            | The pill is a real text input; the slider is never the only way to set a value                                                                                                                                                         |
| `Card`                                                                  | Optional title row, body, optional footer                                                               | `surface.card`, 16px radius, 1px edge, level 1                                                                                                                                                                                         |
| `HeroFigure` **[PR 2]**                                                 | Label, optional `explain` tip, value in `numeric.hero`, one optional delta or sub-line                  | On `surface.hero` with `text.onContrast`. One per page. Never an estimate (D2). Falls back to a plain block when the value is unknown. Under forced colours it uses `Canvas` / `CanvasText` with a real border and drops the disc      |
| `KpiCard`                                                               | Label, optional `explain` tip, value in `numeric.kpi`, optional delta badge, optional one-line caption  | Never tinted. Every value (money, date, text) is the same `numeric.kpi` size and wraps rather than grows. Cards in a strip share one height, caption at the bottom. Unknown value is "Not set" in `numeric.unset` with one action link |
| `KpiStrip`                                                              | 3 cards (4 at most) in one row                                                                          | One row on desktop; a 2-column grid or horizontal list on a phone                                                                                                                                                                      |
| `Tabs` (the segmented control) **[PR 2]**                               | Container, 2 to 4 items, selected thumb                                                                 | The only in-page view switcher. Hidden when there is one option. Focus ring for the keyboard only, never after a click                                                                                                                 |
| `StatusBadge`                                                           | Icon, text                                                                                              | Tone decides colour and icon; text states the status                                                                                                                                                                                   |
| `InlineAlert`                                                           | Icon, message, optional action                                                                          | For things the user must act on. Errors announce as alerts, others as status                                                                                                                                                           |
| `ProjectionNotice`                                                      | Small info icon, fixed sentence                                                                         | Quiet note: `text.secondary` on the parent surface, top hairline, no fill **[PR 2]**                                                                                                                                                   |
| `ScenarioZone`                                                          | Title, "Illustration, not saved" badge, basis line, tools, footer (reset, update details, the notice)   | `surface.subtle` with a 1px dashed edge **[PR 2]**. Visibly lighter than the saved details above it                                                                                                                                    |
| `ChartFigure`                                                           | Title in `heading.sm`, one-sentence summary, chart with direct labels, optional annotation, "Show data" | Summary is required **[PR 2]**. Title keeps normal letter and word spacing **[R2-2]**                                                                                                                                                  |
| `SectionBand`                                                           | Full-width band, optional h2 and one-line subtitle; or variant `app`, a plain section heading           | Tones `canvas`, `subtle`, `sage`, `apricot`; at most one sage and one apricot per page. Marketing's `MarketingSection` is this band **[R2-2]**                                                                                         |
| `Table`, `DataList`                                                     | Header row, rows, optional total row                                                                    | Figures right-aligned and tabular. More than 8 rows collapses                                                                                                                                                                          |
| `CollapsibleDrawer`                                                     | Trigger with chevron, content                                                                           | The chevron rotates; the content is reachable by keyboard                                                                                                                                                                              |
| `Dialog`, `Sheet`                                                       | Title, body, actions                                                                                    | `surface.overlay`, 24px radius, level 3, over `surface.scrim`. A dialog on desktop becomes a bottom sheet on a phone                                                                                                                   |
| `ConfirmDialog`                                                         | Title naming the thing, consequence, cancel, destructive button                                         | The destructive button is `danger` and says what it does                                                                                                                                                                               |
| `Toast`                                                                 | Icon, message, optional action                                                                          | Bottom of the screen above the bottom bar; level 3                                                                                                                                                                                     |
| `EmptyState`                                                            | One illustration, one sentence, one button                                                              | Replaces the page body below the header                                                                                                                                                                                                |
| `Skeleton`, `PageSkeleton` **[PR 2]**                                   | Grey blocks in the shape of the content                                                                 | A gentle pulse only when motion is allowed. Shown through `PendingReveal` (200ms delay, 400ms minimum; UX-GUIDELINES E2), never as a page-level route skeleton. The loading pattern: there is no standalone spinner **[R2-2]**         |
| App chrome                                                              | `TopBar`, `SideNav` or inline nav, `MobileBottomBar`, `NavDrawer`, `SiteFooter`, `ThemeToggle`          | Shared by marketing and web                                                                                                                                                                                                            |

**CA1.** Components live in their own directory with styles, stories and tests. **Enforced by** `architecture.laws.test.ts`. **CA2.** No second implementation of a listed component (no legacy `FLP*`, no local tabs). **Enforced by** `architecture.laws.test.ts` baseline **[PR 1]**.

## 13. What this guide replaces

| Older document                        | Status                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/e15/tokens.md`           | Still the detailed token reference and measurement record. This guide is the summary                                               |
| `docs/design/data-viz.md`             | Still the chart helper reference                                                                                                   |
| `docs/design/e15/iconography.md`      | Still the icon migration reference                                                                                                 |
| `docs/design/e15/scenario-zone.md`    | Still the decision record; its "Visual" section is superseded by the lighter zone in section 12.2 once PR 2 merges                 |
| `docs/agents/component-guidelines.md` | Still the how-to for building a component                                                                                          |
| `docs/design/e16-polish/PLAN.md`      | The work plan that gets the product to this guide. When PR 13 closes it, this guide and UX-GUIDELINES remain as the standing rules |
