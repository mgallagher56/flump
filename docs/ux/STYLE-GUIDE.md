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

The semantic namespaces are fixed: `surface`, `text`, `border`, `primary`, `accent`, `status`, `chart`. `accent` is the seventh, added by owner decision in E17 (section 2.6).

**Rule C1.** No hex, rgb or primitive scale name in component or page code, on any platform. **Enforced by** `scripts/check-design-tokens.ts` (web and marketing); **Proposed check** for mobile (CROSS-PLATFORM section 7).

### 2.2 Core palette

| Token                                               | Light                                         | Dark                                          | Use                                                                             |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `surface.canvas`                                    | `#f5f1ea`                                     | `#1d1a17`                                     | Page background                                                                 |
| `surface.card`                                      | `#fffdf9`                                     | `#272320`                                     | Cards, tables, drawers                                                          |
| `surface.subtle`                                    | `#f0ebe2`                                     | `#2e2a26`                                     | Hover fills, the scenario zone **[PR 2]**                                       |
| `surface.sunken`                                    | `#eae3d8`                                     | `#171412`                                     | Wells, input tracks                                                             |
| `surface.overlay`                                   | `#ffffff`                                     | `#36322d`                                     | Dialogs, sheets, menus, popovers                                                |
| `surface.contrast`                                  | `#22302c`                                     | `#3a352f`                                     | Rare inverted blocks                                                            |
| `surface.hero`                                      | `#12483f`                                     | `#1b5448`                                     | The one headline block on a page                                                |
| `surface.tint.teal` / `apricot` / `sage` **[PR 1]** | `#dcede6` / `#fae5cc` / `#e5edda`             | `#1f322d` / `#2e261c` / `#272f22`             | Icon tiles; at most one tinted section per page                                 |
| `surface.scrim`                                     | `rgba(43,38,32,.4)`                           | `rgba(8,6,4,.6)`                              | Backdrop behind dialogs and sheets; never behind text                           |
| `text.primary` / `secondary` / `muted`              | `#2b2620` / `#564f46` / `#6a6258`             | `#f4efe7` / `#cbc3b7` / `#a59d90`             | Body, supporting, quiet                                                         |
| `text.onContrast`                                   | `#f6f1e8`                                     | `#fffdf9`                                     | Text on `surface.hero` and `surface.contrast`                                   |
| `border` / `subtle` / `strong` / `input`            | `#dcd4c8` / `#e8e1d6` / `#b5ab9c` / `#867c6e` | `#3b362f` / `#302c27` / `#5c554a` / `#8f8678` | Card edge, dividers, emphasis, form controls                                    |
| `border.focusRing`, `primary`                       | `#0f6b5e`                                     | `#6fd0ba`                                     | Focus ring, links, selected state, icons                                        |
| `primary.solid` / `hover`                           | `#0f6b5e` / `#0a564b`                         | same in dark                                  | Fill behind `primary.foreground` (white) only                                   |
| `primary.subtle` / `border`                         | `#e1f0eb` / `#9ccfc2`                         | `#1e3b35` / `#2e6055`                         | Selected nav item, quiet accent fills                                           |
| `accent` **[E17]**                                  | `#7a3f66`                                     | `#dba6c9`                                     | Icons, shapes and lines; text on card, canvas and `accent.subtle` (section 2.6) |
| `accent.subtle` / `border` **[E17]**                | `#f1e4ee` / `#d6b4cc`                         | `#33242f` / `#6a4560`                         | The one tinted card or section on a page, and its edge                          |
| `accent.onHero` **[E17]**                           | `#e3b5d1`                                     | `#e3b5d1`                                     | One sun shape on `surface.hero`; never text                                     |

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

### 2.6 The accent (E17, "Damson")

A soft plum, the warm opposite of the teal. It adds warmth and a second voice to light mode without touching data. The approved options and mock-ups are in `docs/design/e17-options/`.

| Token           | Light     | Dark      | Role                                                                                   |
| --------------- | --------- | --------- | -------------------------------------------------------------------------------------- |
| `accent`        | `#7a3f66` | `#dba6c9` | Icons, shapes, lines, and text on `surface.card`, `surface.canvas` and `accent.subtle` |
| `accent.subtle` | `#f1e4ee` | `#33242f` | A tinted card or section                                                               |
| `accent.border` | `#d6b4cc` | `#6a4560` | The edge of an `accent.subtle` surface (decorative)                                    |
| `accent.onHero` | `#e3b5d1` | `#e3b5d1` | One shape on `surface.hero`                                                            |
| `chart.accent`  | `#7a3f66` | `#dba6c9` | One chart series, with a direct label and a dash                                       |

**Rule C7. Where the accent may go.** One tinted card or section per page, counted with the domain tints (a page has one tinted section in total, never an accent one and a domain one). Icon tiles. One small shape per illustration scene. One chart series, which must be dashed and directly labelled: under colour-vision simulation the plum sits close to the teal, so colour alone never tells them apart. One sun shape in the corner of the hero, with no bars or arrows beside the figure. **Review only**; contrast and separation **Enforced by** `tokens.a11y.test.ts` ("E17 accent namespace").

**Rule C8. Where the accent never goes.** A figure, KPI card, table cell or amount. A button, link or focus ring (teal only). A notice or status message. Around a `KpiStrip`, a `ScenarioZone` or a chart frame. And it never says that anything about a person's money is good or bad: it is not a status colour, and it is never paired with a gain, a loss, a debt or a target. **Review only**; `tokens.a11y.test.ts` keeps it at least 25 deltaE from every status colour and from `chart.debt`, `chart.warning` and `chart.wealth` in normal vision. Under colour-vision simulation the gap narrows, which is one more reason the accent never stands in for a status.

**Bolder tints (E17).** The existing sand, sage and teal tints are used more often, not changed: the one tinted section a page is allowed is the norm on pages that have a natural candidate (for example a prompt card), and icon tiles take their domain tint. No tint value changed, and the limits in section 2.4 stand.

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

Spacing is a 4px scale: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. No other gap or padding value, with one exception: the 36px gap between page sections (`spacing.page.section`, the owner's E17 5A choice).

| What                        | Value                                              |
| --------------------------- | -------------------------------------------------- |
| Content width               | 1200px at most (`sizes.page.max`) **[PR 1]**       |
| Page gutters                | 16px on a phone, 24px from 768px, 40px from 1024px |
| App header to h1            | 20px on a phone, 32px from 1024px                  |
| Gap between page sections   | 36px (`spacing.page.section`, E17 5A; see 12.5)    |
| Card padding                | 20px (14px in compact density)                     |
| Gap between cards in a grid | 16px (10px compact)                                |
| Control heights             | 32, 40, 48px (28, 32, 40px compact)                |
| Minimum touch target        | 44 by 44px. Never shrinks, in any density          |

Breakpoints: 640, 768, 1024, 1280px. The navigation switches from the phone pattern (menu button, drawer and, in the app, the bottom bar) to the desktop pattern at 768px (`NAV_BREAKPOINT`, owner ruling 2026-11-14), on marketing and web alike. From 768px to 1023px the desktop bar is compact, and from 1024px (`NAV_WIDE_BREAKPOINT`, `_navWide`, the "everything fits" width, shared by both sites) it is full. Links in the top bar are text only at every width (group buttons keep their chevron). Compact:, the logo as the way home in the web app ("Home" shows inline from 1024px), the one-button theme switch, and on marketing the lower-priority items ("AI connection", "Sample data", "Sign in") move into the menu, whose button stays (`wideOnly` links, `menuBelow="wide"`); text never shrinks. Full: "Home" inline (web), every marketing link, and the three-way theme switch. The phone top bar holds the menu button, logo, one-button theme switch and the account avatar (or "Sign in"), all 44px targets, and fits at 320px.

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

- Illustrations are for empty states, onboarding, check-in, and "not found" (Rule B10: beyond whole-page empty states and check-in, illustrations are allowed on large screens with spare space or all-number cards; at most one scene in view at a time, never pushing a figure down). Never beside real figures on compact viewports.
- Style: flat shapes in the palette's own tokens (sand, teal, sage, apricot), soft rounded forms that echo the logo, no outlines, no people's faces, no piles of coins or cash, no upward-arrow "growth" clichés.
- They are decorative: hidden from assistive technology, and the text beside them carries the meaning.
- The four scenes today are `empty-accounts`, `empty-goals`, `onboarding` and `not-found` (`Illustration` primitive). A new scene is added to the primitive and drawn with token colours so it follows the theme.
- The hero block may carry one sun shape in `accent.onHero` **[E17]**, with no bars or arrows beside the figure. Nothing else is decorated.

**IL1.** Illustrations use semantic tokens and follow the theme. **Enforced by** `scripts/check-design-tokens.ts`. **IL2.** Placement. **Review only**.

### 8.1 The scene family (E17)

Every scene is built to one sheet, so a new one sits beside the Budget scene without a second look. Samples are in [`docs/design/e17-options/options.html`](../design/e17-options/options.html), section 3.

| Part   | Rule                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------ |
| Grid   | 240 by 170. Everything stands on a ground line at 152. Keep 20 clear at the sides and 10 at the top    |
| Sun    | One per scene, in a top corner: a disc 36 to 40 across with a halo about 1.7 times as wide             |
| Shapes | Rounded rectangles with a 14 corner, circles, and the leaf (a quarter-round with a point). No outlines |
| Lines  | Three only, all with round ends: the dotted arc (3 wide, dots 10 apart), the stem (4) and the pole (5) |
| Count  | One sun, one dotted arc, at most one leaf or sprout, and three to five solid forms                     |
| Never  | People, faces, coins with symbols, arrows, red, a finish flag, or anything that grades a situation     |

Colour roles, all from tokens so dark mode follows:

| Role      | Token                                             | Use                                                                              |
| --------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Deep teal | `primary.solid`                                   | The main object, one per scene                                                   |
| Pale teal | `primary.border`                                  | Its partner or its back                                                          |
| Sage      | `chart.wealth`                                    | The third form, stems and leaves                                                 |
| Sun       | `chart.debt` at reduced strength                  | The disc and its halo                                                            |
| Sand      | `surface.sunken` (light), `surface.subtle` (dark) | The ground, nothing else                                                         |
| Paper     | `surface.card`                                    | Small details on teal                                                            |
| Accent    | `accent`                                          | One small shape per scene (a day on the calendar, a coin). Never the main object |

**IL3.** A scene follows the sheet above. **Review only**. **IL4.** Scenes are stored as lists of shapes (kind, position, colour role) in one shared file. The web draws the list as SVG and the mobile app draws the same list with its own SVG library. No image files. **Review only** until the shared file exists.

### 8.2 Where scenes go (E17)

| Place                                                                                | Scene                                                           | When                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------- |
| Dashboard first visit, Budget empty state                                            | Budget bars                                                     | Exists                                 |
| Accounts empty state                                                                 | Stacked cards                                                   | Exists; stop reusing it on other pages |
| Goals empty state, not-found page, error page                                        | Target, signpost                                                | Exists                                 |
| Savings empty state                                                                  | Jar                                                             | Now                                    |
| Debts empty state                                                                    | Three balances and a dotted path                                | Now                                    |
| Pension empty state                                                                  | Pot and plant                                                   | Now                                    |
| Monthly check-in, start and summary                                                  | Calendar; the tick is the only change                           | Now                                    |
| "Finish setting up" finish state                                                     | Sprout from the Budget scene                                    | Now                                    |
| Marketing not-found page                                                             | Signpost                                                        | Now                                    |
| Mortgage, Self Assessment, forecast and take-home pay empty states; onboarding steps | To draw                                                         | Later                                  |
| Marketing home hero and sections                                                     | A wider scene made from the same parts, one per section at most | Later                                  |
| Marketing pricing; any page with figures on it; any notice; any error about money    | None                                                            | Never                                  |

The mortgage scene is shown only to people who use the mortgage page, so renting is never set against owning.

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

| Token                                 | Value                                                         | Use                                                                                  |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `durations.fast`                      | 120ms                                                         | Hover, press, a scenario result changing                                             |
| `durations.base`                      | 200ms                                                         | Tabs, disclosure, toasts                                                             |
| `durations.slow`                      | 320ms                                                         | Sheets and dialogs                                                                   |
| `durations.loop`                      | 800ms                                                         | One turn of a continuous loop (the pending spinner in `Button`)                      |
| `easings.standard` / `enter` / `exit` | `cubic-bezier(0.2,0.6,0.2,1)` / `(0,0,0.2,1)` / `(0.4,0,1,1)` | Moving within the screen / arriving / leaving                                        |
| `durations.draw` **[E17]**            | 600ms                                                         | A line or tick drawing itself in, once                                               |
| `durations.scene` **[E17]**           | 900ms                                                         | An illustration settling on first view; the wash behind a figure that was just saved |
| `easings.settle` **[E17]**            | `cubic-bezier(0.16,1,0.3,1)`                                  | A soft landing with no overshoot, for `durations.scene` motion                       |

### 11.1 Approved animations (E17)

Five small animations are approved for a first pass. Each plays once, in answer to something the user did or the first time a thing is seen. None plays on every page load and none loops. Working demos are in the options page, section 4.

| Animation                              | Tokens                                                                                   | Plays                                                           | With reduced motion                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| A saved figure changes                 | Cross-fade over `fast`, `standard`; a pale teal wash fades over `scene`                  | Once, when a balance is saved                                   | The figure swaps at once, no wash                 |
| The check-in moves to the next account | Leaves over `fast`, `exit`; arrives over `base`, `enter`; 24px travel                    | On each "Next" in the check-in; Back runs it the other way      | A short fade, no travel                           |
| Setup progress fills                   | `slow`, `standard`                                                                       | Once, the first time the dashboard is seen after a step is done | The ring is drawn at its new length               |
| Save confirmation                      | Label swaps over `fast`; the tick draws over `base`, `standard`; returns after 2 seconds | On every successful save, in the button that was pressed        | The label changes to "Saved" with a finished tick |
| A scene settles on first view          | `scene`, `settle`: the sprout grows from its base, the sun rises 10px                    | Once, the first time an empty state is shown in a visit         | The scene is still from the start                 |

Left out, and why:

| Animation                        | Decision    | Reason                                                                               |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| A figure counts to its new value | Never       | UX-GUIDELINES M3: figures never count or roll. It shows amounts that were never true |
| A chart line draws in            | No change   | `useChartAnimation` already governs it                                               |
| Button hover and press scale     | Second pass | Small gain; touches every button story and snapshot                                  |
| The tab marker slides            | Second pass | Best done once, inside the single tabs component                                     |
| A toast arrives                  | Second pass | The save confirmation covers most saves                                              |

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

| Component                                                               | Parts                                                                                                           | Fixed rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                                | Label, optional leading icon                                                                                    | Variants: `primary` (teal fill, one per page), `outline`, `ghost`, `link`, `danger`. Heights 40, 48, 56px. Label is a verb phrase                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `TextInput`, `CurrencyInput`, `PercentInput`, `Select` in a `FormField` | Label above, control, helper text, error text                                                                   | Label always visible. `£` and `%` are fixed adornments, not typed. 8px radius, `border.input` edge                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `SliderField`                                                           | Label top left, editable value pill top right, slider below, optional helper                                    | The pill is a real text input; the slider is never the only way to set a value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Card`                                                                  | Optional title row, body, optional footer                                                                       | `surface.card`, 16px radius, 1px edge, level 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `HeroFigure` **[PR 2]**                                                 | Label, optional `explain` tip, optional estimate label, value in `numeric.hero`, one optional delta or sub-line | On `surface.hero` with `text.onContrast`. One per page. A saved figure (net worth, a balance, a total owed) never carries an estimate. On a calculator-style page (Take-home, Self Assessment, the tool pages) the hero may show the estimated answer the page exists to give, with the "Unverified estimate" label inside the hero (`estimateLabel`; owner ruling 2026-11-15, which replaces D2 for those pages). Falls back to a plain block when the value is unknown. Under forced colours it uses `Canvas` / `CanvasText` with a real border and drops the disc |
| `KpiCard`                                                               | Label, optional `explain` tip, value in `numeric.kpi`, optional delta badge, optional one-line caption          | Never tinted. Every value (money, date, text) is the same `numeric.kpi` size and wraps rather than grows. Cards in a strip share one height, caption at the bottom. Unknown value is "Not set" in `numeric.unset` with one action link                                                                                                                                                                                                                                                                                                                               |
| `KpiStrip`                                                              | 3 cards (4 at most) in one row; 2 cards split it into equal halves                                              | Always spans the full content width, so its outer edges line up with the `HeroFigure`; its cards split the row equally (two cards: halves) and are never capped to a narrower grid. Each card keeps its value at `numeric.kpi` and carries a one-line caption with no figure, so a short strip does not read as empty. Two cards sit side by side on a phone too (round 4, independent review of four options)                                                                                                                                                       |
| `Tabs` (the segmented control) **[PR 2]**                               | Container, 2 to 4 items, selected thumb                                                                         | The only in-page view switcher. Hidden when there is one option. Focus ring for the keyboard only, never after a click                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `StatusBadge`                                                           | Icon, text                                                                                                      | Tone decides colour and icon; text states the status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `InlineAlert`                                                           | Icon, message, optional action                                                                                  | For things the user must act on. Errors announce as alerts, others as status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ProjectionNotice`                                                      | Small info icon, fixed sentence                                                                                 | Quiet note: `text.secondary` on the parent surface, top hairline, no fill **[PR 2]**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ScenarioZone`                                                          | Title, "Illustration, not saved" badge, basis line, tools, footer (reset, update details, the notice)           | `surface.subtle` with a 1px dashed edge **[PR 2]**. Visibly lighter than the saved details above it                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ChartFigure`                                                           | Title in `heading.sm`, one-sentence summary, chart with direct labels, optional annotation, "Show data"         | Summary is required **[PR 2]**. Title keeps normal letter and word spacing **[R2-2]**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `SectionBand`                                                           | Full-width band, optional h2 and one-line subtitle; or variant `app`, a plain section heading                   | Tones `canvas`, `subtle`, `sage`, `apricot`; at most one sage and one apricot per page. Marketing's `MarketingSection` is this band **[R2-2]**                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Table`, `DataList`                                                     | Header row, rows, optional total row                                                                            | Figures right-aligned and tabular. More than 8 rows collapses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `CollapsibleDrawer`                                                     | Trigger with chevron, content                                                                                   | The chevron rotates; the content is reachable by keyboard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `Dialog`, `Sheet`                                                       | Title, body, actions                                                                                            | `surface.overlay`, 24px radius, level 3, over `surface.scrim`. A dialog on desktop becomes a bottom sheet on a phone                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ConfirmDialog`                                                         | Title naming the thing, consequence, cancel, destructive button                                                 | The destructive button is `danger` and says what it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Toast`                                                                 | Icon, message, optional action                                                                                  | Bottom of the screen above the bottom bar; level 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `EmptyState`                                                            | One illustration, one sentence, one button                                                                      | Replaces the page body below the header                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Skeleton`, `PageSkeleton` **[PR 2]**                                   | Grey blocks in the shape of the content                                                                         | A gentle pulse only when motion is allowed. Shown through `PendingReveal` (200ms delay, 400ms minimum; UX-GUIDELINES E2), never as a page-level route skeleton. The loading pattern: there is no standalone spinner **[R2-2]**                                                                                                                                                                                                                                                                                                                                       |
| App chrome                                                              | `TopBar`, `SideNav` or inline nav, `MobileBottomBar`, `NavDrawer`, `SiteFooter`, `ThemeToggle`                  | Shared by marketing and web                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**CA1.** Components live in their own directory with styles, stories and tests. **Enforced by** `architecture.laws.test.ts`. **CA2.** No second implementation of a listed component (no legacy `FLP*`, no local tabs). **Enforced by** `architecture.laws.test.ts` baseline **[PR 1]**.

### 12.3 Dialog or sheet

One rule for every modal surface. Enforced by: `Dialog.styles.ts` and `Sheet.styles.ts` (the phone presentation); which one a feature uses is review only.

- **On a phone (under md), every modal rises from the bottom of the screen**, full width, rounded at the top, clear of the home indicator. A `Dialog` and a `Sheet` look the same there, so a person never meets two kinds of modal on one device.
- **From md, use a `Dialog`** (centred) for a short form or a confirmation: one task, a few fields, done in one go. Add account, Edit account and every `ConfirmDialog` are dialogs.
- **From md, use a `Sheet`** (a panel at the side) for a long list or a task done step by step that keeps the page visible behind it. The monthly check-in and adding earlier months are sheets.
- A confirmation opened from inside a dialog replaces the dialog's actions with the question, or closes the dialog first; never stack a second modal on top of the first.

### 12.4 Setup progress (E17)

The dashboard's "Finish setting up" row is a progress ring with the next step named.

- **Collapsed:** one row. A ring showing steps done, the title "Finish setting up", the count and the next step in words, one button for that step, a control to open the list and a cross to hide the row. On a phone the next step is itself the link and the button is dropped, so the row stays one line.
- **Expanded:** the next step with its one-line description and its button, then the remaining steps, then the finished steps in quiet text with a tick.
- **"Not for me"** sits on every unfinished step. A step that does not apply counts as done, without comment.
- **Hidden means hidden.** The cross hides the row for good. The row never reappears, never badges the navigation and never sends a reminder.
- **Finish state:** when every step is done the row reads "Setup finished" for the rest of that visit, with the sprout from the Budget scene settling once, and it is gone on the next visit. The message is about the app being set up, never about the person's money.
- The ring uses `primary` on a `border` track, and the count is always given in words as well.

**SP1.** One row when collapsed, dismissible, never nags. **Review only** (UX-GUIDELINES O4).

### 12.5 Section headers and the result block (E17)

- **Section header.** Every section on a page opens with an icon tile, a title and one line saying what it is. Sections sit 36 apart (`spacing.page.*`), so each reads as its own block.
- **Saved sections are cards** on the canvas. A modelling zone is the only dashed outline on a page and has no fill.
- **Result block.** A section's key figure sits in one result block: a card of its own holding a label, an optional lead-in, the figure at 36, a note and at most one supporting row. One result block per section, for that section's key figure. It never uses `surface.hero` or a tint.
- **A saved result has its own section.** A figure worked out from saved details (for example "Breathing room") is shown in a result block in a section of its own. It never sits inside a modelling zone.
- **A modelling zone presents its result** in one result block: to the right of the inputs from tablet width up, and under them on a phone. Nothing else inside a zone is a card.
- **"Illustration, not saved" stays recognisable.** The zone keeps its dashed outline, now at 3:1 or more against the canvas (`border.input`), and the "Illustration, not saved" badge. The meaning never rests on colour alone, and the notice at the foot of the zone stays quiet.

**Components.** `PageSection` wraps one saved section: a `<section>` named by its `SectionHeader`, with the content under it. `ResultBlock` is the result card; its figure uses `numeric.result` (36px, tabular). `ScenarioZone` takes its one result block in `result`, and anything that follows the inputs and the result (a drawer of further options) in `extra`. When a section header already shows the result's name, the block keeps the name for assistive technology and does not print it twice (`hideLabel`). The icon tile takes the page's money domain; a section outside the money domains is neutral, and at most one header on a page uses the accent tile (rule C7).

**SR1.** One result block per section; a saved result is never inside a zone. **Review only**. The zone outline contrast is **Enforced by** `tokens.a11y.test.ts` ("border.input reaches 3:1 on every surface in both themes") and `ScenarioZone.test.tsx`.

### 12.6 Naming: "Breathing room" (E17)

"Breathing room" replaces "Months of cover" everywhere a person reads it. The wording is the owner's and is fixed:

| Part           | Wording                                           |
| -------------- | ------------------------------------------------- |
| Label          | Breathing room                                    |
| Description    | How long your savings would cover the essentials. |
| Value          | About 1.5 months                                  |
| Dashboard line | Breathing room: about 1.5 months                  |

The detail goes behind the info tip, not in the description: "savings" means the accounts the person can draw on, and "the essentials" means essential spending and minimum debt payments.

## 13. What this guide replaces

| Older document                        | Status                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/e15/tokens.md`           | Still the detailed token reference and measurement record. This guide is the summary                                               |
| `docs/design/data-viz.md`             | Still the chart helper reference                                                                                                   |
| `docs/design/e15/iconography.md`      | Still the icon migration reference                                                                                                 |
| `docs/design/e15/scenario-zone.md`    | Still the decision record; its "Visual" section is superseded by the lighter zone in section 12.2 once PR 2 merges                 |
| `docs/agents/component-guidelines.md` | Still the how-to for building a component                                                                                          |
| `docs/design/e16-polish/PLAN.md`      | The work plan that gets the product to this guide. When PR 13 closes it, this guide and UX-GUIDELINES remain as the standing rules |

## 14. Decisions

### 15 November 2026: E17, warmth and life

Decider: the owner. Visual reference: [`docs/design/e17-options/options.html`](../design/e17-options/options.html), with the approved combination and later rulings in [`docs/design/e17-options/README.md`](../design/e17-options/README.md).

| Area           | Decision                                                                                                                                                                | Where it is written                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Accent         | Option A, "Damson": a soft plum for decoration and wayfinding, never for good or bad. The existing sand, sage and teal tints are used more often, with no value changed | Section 2.6, rules C7 and C8                 |
| Setup progress | Option 2A, the ring and next step, with the finish state from 2C                                                                                                        | Section 12.4; UX-GUIDELINES O4               |
| Illustrations  | Option 3A: scenes for savings, debts, pension and the monthly check-in, built to one style sheet and stored as shape lists                                              | Sections 8.1 and 8.2                         |
| Motion         | Three new tokens and five first-pass animations; five others left out                                                                                                   | Section 11 and 11.1; UX-GUIDELINES M5 and M7 |
| Sections       | Option 5A: section headers and one result block per section, on every page                                                                                              | Section 12.5; UX-GUIDELINES S10              |
| Naming         | "Breathing room" replaces "Months of cover", and that saved result sits in its own section, never inside a modelling zone                                               | Section 12.6; COPY-GUIDE glossary            |

### 15 November 2026: E17 house rules (B1–B5, B8–B18)

| Rule    | Area                    | Requirement                                                         | Detail / Implementation                                                                                                                                                                                                                                                                |
| ------- | ----------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1**  | Figure card captions    | All cards in a strip or none; never a figure in a caption           | Captions under figure cards are uniform across the strip; if one card has a caption, all cards in that strip do. A caption never contains a numeric figure.                                                                                                                            |
| **B2**  | Row balance             | Shown when two or more rows; hidden when single row equals headline | In breakdown lists or tables, the balance column is shown when there are two or more rows; hidden when a single row equals the headline figure.                                                                                                                                        |
| **B3**  | Card strips             | Two-card strip is fine; never pad to three; no strip for one card   | A strip may contain two or more cards; never pad artificially to three. A single card is rendered standalone without a strip container.                                                                                                                                                |
| **B4**  | Tab focus ring          | Focus ring on tabs on keyboard focus only                           | Tabs apply focus outline only under `:focus-visible` (keyboard focus), not on mouse/pointer clicks (`[data-pointer-focus]:focus-visible { outline: none }`).                                                                                                                           |
| **B5**  | Links                   | Two link styles, both teal                                          | In-sentence links use `primary` (teal) with an underline. Standalone links use `primary` with `fontWeight: 600` and no underline.                                                                                                                                                      |
| **B8**  | Date formats            | "Nov 2026" in data; "15 November 2026" in sentences                 | Compact month/year (`"Nov 2026"`) in tables, charts, axes and badges; full date (`"15 November 2026"`) in prose and complete sentences.                                                                                                                                                |
| **B9**  | Estimates & projections | "~" with 3 significant figures for projections > 1 yr               | Projections more than a year ahead are rounded to three significant figures with `"~"` (`"~£388,000"`), NOT `"About"` or `"around"`. "Breathing room" keeps `"About"`.                                                                                                                 |
| **B10** | Illustrations           | Spare space on large screens or all-number cards                    | Beyond whole-page empty states and check-in, illustrations are allowed on large screens with spare space or all-number cards (at most one scene in view at a time, never pushing a figure down).                                                                                       |
| **B11** | Field requirements      | Mark only optional fields, `(optional)`                             | Required fields are standard and unmarked; only optional fields are marked with `(optional)` in muted text. Never show a "Required" tag.                                                                                                                                               |
| **B12** | Estimate label          | "Estimate" as a badge only                                          | "Estimate" is shown as a badge only, never repeated in the field or card label.                                                                                                                                                                                                        |
| **B13** | Edit actions            | Pencil on rows; outline "Edit" button on cards                      | Pencil icon with "Edit" text on list/table rows; small outline "Edit" button on details cards.                                                                                                                                                                                         |
| **B14** | Quiet drawer buttons    | Named label + small outline button with chevron                     | "More options" is replaced by specific names of what is inside. Styled as a small outline button with a chevron (`height: 32px`, `borderWidth: 1px`, `borderColor: border.strong`, `borderRadius: lg`), same height as the segmented switch; "Show data" and "Guide" share this style. |
| **B15** | Signed-out CTA          | "Request an invite" everywhere signed out                           | The call-to-action on all signed-out headers and landing pages is consistently "Request an invite".                                                                                                                                                                                    |
| **B16** | Headline panels         | Full width at 1280px                                                | Top headline panels/heroes span full width of the container at 1280px (`maxWidth: 100%`).                                                                                                                                                                                              |
| **B17** | Check-in actions        | "Start monthly check-in" / "Continue check-in"                      | "Update balances" becomes "Start monthly check-in" ("Continue check-in" when partially completed); outline button everywhere, primary only on History.                                                                                                                                 |
| **B18** | Accounts hero           | Total of accounts listed                                            | Accounts hero figure shows the total of the accounts listed, labelled as that; net worth stays on the dashboard.                                                                                                                                                                       |
