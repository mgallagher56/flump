# Flump style guide

Status: adopted 2026-11-14; amended 2026-11-27 for the marketing design language (sections 2.4, 2.7, 8, 11 and 14). Owner: design system (`packages/ui`). Applies to the marketing site, the web app and the future mobile app.

This is the one description of how Flump looks. It states the visual language in platform-neutral terms so that the same decisions reach every platform. How things behave is in [UX-GUIDELINES.md](./UX-GUIDELINES.md). How the values reach React Native is in [CROSS-PLATFORM.md](./CROSS-PLATFORM.md). Words are in the copy guide (`docs/copy/COPY-GUIDE.md` when the copy programme lands it; until then [`docs/copy-style-guide.md`](../copy-style-guide.md)).

## How to read this guide

- **The code is the source of the values.** Tokens live in `packages/tokens/src/` (`@flump/tokens`; `@repo/ui` re-exports them, and the native theme is generated from them). If a value here disagrees with the token files, the token files win and this guide is corrected in the same PR. Full tables with contrast measurements are in [`docs/design/e15/tokens.md`](../design/e15/tokens.md).
- **This guide describes where we are going.** Items marked **[PR 1]** or **[PR 2]** are defined by the polish plan ([`docs/design/e16-polish/PLAN.md`](../design/e16-polish/PLAN.md), sections 4.1 to 4.5) and arrive with those PRs. Until they merge, the token or component may not exist on `main`. Hex values for PR 1 items are the plan's starting points; the shipped value is whatever passes `tokens.a11y.test.ts` with `KNOWN_FAILURES` empty.
- **Units.** Sizes are in CSS px. One px is one iOS point and one Android dp. Type sizes are authored in rem on the web so they follow the user's browser setting, and scale with the system font size on native.
- Every rule ends with how it is checked: **Enforced by** a named law or test, **Proposed check** for a check described in [UX-ASSESSMENT-2026-11.md](./UX-ASSESSMENT-2026-11.md) section 6 that does not exist yet, or **Review only**.

## 1. Character

Flump is a calm guide for a household's money. The look is "Midnight and Mint" (owner, 24 Nov 2026; section 14): a pale mint light theme with deep-green ink and charcoal buttons, a cool charcoal dark theme ("Midnight") with mint figures, teal links, apricot for what you owe, rounded shapes, plain type and a lot of room around a small number of figures. It is not a trading terminal, a bank statement or a dashboard for analysts. The marketing site speaks the same language with more room to move: a lit orb, soft bubbles, glass and paper cards, and calm motion (section 2.7 and 11.2; owner, 27 Nov 2026). The apps stay quiet.

Three tests for any screen:

1. Could a person who is worried about money read it without feeling judged or alarmed?
2. Is there one thing to look at first?
3. Would it look like the same product if it were moved from the marketing site to the app, or from the web to a phone?

## 2. Colour

### 2.1 Structure

Three layers. Components use only the middle one.

| Layer             | What it is                                                          | Who may use it                  |
| ----------------- | ------------------------------------------------------------------- | ------------------------------- |
| Primitives        | Raw scales: `mint`, `teal`, `dark.*`, and the status and chart hues | Token files only                |
| Semantic tokens   | Purpose names with a light and a dark value                         | Every component, every platform |
| Component recipes | A component's use of semantic tokens                                | That component                  |

The semantic namespaces are fixed: `surface`, `text`, `border`, `primary`, `accent`, `status`, `chart`. `accent` is the seventh, added by owner decision in E17 (section 2.6).

**Rule C1.** No hex, rgb or primitive scale name in component or page code, on any platform. **Enforced by** `scripts/check-design-tokens.ts` (web and marketing); **Proposed check** for mobile (CROSS-PLATFORM section 7).

### 2.2 Core palette

| Token                                               | Light                                         | Dark                                          | Use                                                                                             |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `surface.canvas`                                    | `#eef6f3`                                     | `#14171c`                                     | Page background                                                                                 |
| `surface.card`                                      | `#f8fcfa`                                     | `#1d2128`                                     | Cards, tables, drawers, marketing bands (light never uses pure white)                           |
| `surface.subtle`                                    | `#e7f2ee`                                     | `#262b33`                                     | Hover fills, the scenario zone **[PR 2]**                                                       |
| `surface.sunken`                                    | `#dfeee9`                                     | `#0f1216`                                     | Wells, input tracks                                                                             |
| `surface.overlay`                                   | `#f6f7f7`                                     | `#2a3039`                                     | Dialogs, sheets, menus, popovers                                                                |
| `surface.contrast`                                  | `#14171c`                                     | `#0f1216`                                     | Charcoal: the footer and small numbered markers; never a marketing band                         |
| `surface.hero`                                      | `#6fd0ba`                                     | `#1d2128`                                     | The one headline block on a page: solid mint in light, a card with a `border.hero` edge in dark |
| `surface.tint.teal` / `apricot` / `sage` **[PR 1]** | `#c6e6dc` / `#fae5cc` / `#e1edd6`             | `#1d3934` / `#42311c` / `#2b3822`             | Icon tiles; at most one tinted section per page                                                 |
| `surface.tint.sky` / `rose` / `violet`              | `#d8e8f2` / `#f3e3ea` / `#e3e0f4`             | `#1d3846` / `#4d2939` / `#353050`             | Home section card icon tiles only (see "Home section cards" below)                              |
| `surface.scrim`                                     | `rgba(15,42,42,.4)`                           | `rgba(5,7,9,.6)`                              | Backdrop behind dialogs and sheets; never behind text                                           |
| `text.primary` / `secondary` / `muted`              | `#0f2a2a` / `#2f4a4a` / `#476060`             | `#f1eee8` / `#cdd1d7` / `#a9afb9`             | Body, supporting, quiet                                                                         |
| `text.onContrast`                                   | `#f8fcfa`                                     | `#f8fcfa`                                     | Text on `surface.contrast` only                                                                 |
| `text.onHero`                                       | `#0f2a2a`                                     | `#f1eee8`                                     | Labels and lines on `surface.hero`                                                              |
| `text.heroFigure`                                   | `#0f2a2a`                                     | `#6fd0ba`                                     | The headline figure on `surface.hero`                                                           |
| `border` / `subtle` / `strong` / `input`            | `#c8dcd5` / `#d5e5e0` / `#678a82` / `#5e837a` | `#303740` / `#242931` / `#7a8390` / `#737c88` | Card edge, dividers, emphasis, form controls                                                    |
| `border.hero`                                       | `#6fd0ba`                                     | `#3a424e`                                     | The edge of `surface.hero` (the fill itself in light)                                           |
| `border.section`                                    | `#0f2a2a`                                     | `#737c88`                                     | The dark rule under an app section title                                                        |
| `border.focusRing`, `primary`                       | `#0b6b5d`                                     | `#6fd0ba`                                     | Focus ring, links, outline buttons, selected state, icons                                       |
| `primary.emphasis`                                  | `#084f45`                                     | `#9be3d2`                                     | Link and outline button hover                                                                   |
| `primary.solid` / `hover`                           | `#14171c` / `#2c323b`                         | `#6fd0ba` / `#9be3d2`                         | Primary button fill, behind `primary.foreground` only: charcoal in light, mint in dark          |
| `primary.foreground`                                | `#f8fcfa`                                     | `#0e1a17`                                     | Text on `primary.solid`                                                                         |
| `primary.mark` / `markLit`                          | `#084f45` / `#0b6b5d`                         | `#6fd0ba` / `#9be3d2`                         | The logo body, lit from above by `markLit`: teal in light, mint in dark. Not the charcoal fill  |
| `primary.subtle` / `border`                         | `#cfe9e2` / `#5a8f83`                         | `#1f3532` / `#53877d`                         | Selected nav item, quiet accent fills                                                           |
| `accent`                                            | `#1d5f73`                                     | `#e3b5d1`                                     | Icons, shapes and lines; text on card, canvas and `accent.subtle` (section 2.6)                 |
| `accent.subtle` / `border`                          | `#d2eef0` / `#a9c6be`                         | `#2f2733` / `#5a4655`                         | The one tinted card or section on a page, and its edge                                          |
| `accent.onHero`                                     | `#0b6b5d`                                     | `#e3b5d1`                                     | One sun shape on `surface.hero`; never text                                                     |

**Rule C9. Mint is a fill in light, never text.** `#6fd0ba` fails as text on every light ground, so in light it appears only as the hero fill and the hero edge. Links, outline buttons and the focus ring are teal (`primary`, `#0b6b5d`, hover `primary.emphasis`). In dark, mint is the headline figure and the primary button. **Enforced by** `tokens.a11y.test.ts` for the pairs it lists; **Review only** for use.

### 2.3 Status colours

Each status has `text`, `bg`, `border` and `solid`. Values are in `tokens.md`.

| Status     | Hue                                                       | Means                                                                                            | Never means                                |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `positive` | Leaf green (kept apart from teal)                         | Something succeeded; a saved change                                                              | "Good finances"                            |
| `warning`  | Amber                                                     | Something needs the user's attention before it goes wrong (a deadline, an unverified tax figure) | Having debt, a low balance                 |
| `danger`   | Brick red                                                 | An error, or a destructive action                                                                | A negative number, a debt, a missed target |
| `info`     | Indigo today; a muted blue if owner decision D12 is taken | Information the user must act on                                                                 | A disclaimer or standing notice            |
| `neutral`  | Grey-green                                                | Labels and states with no judgement ("Saved", "Illustration, not saved")                         |                                            |

**Rule C2. Colour never judges a person's finances.** Negative amounts are `text.primary` with a minus sign. Debt is apricot (`chart.debt`), never red. `status.danger` is for errors and destructive actions only; `status.warning` is not used on ordinary financial situations. **Enforced by** the no-judgement law in `check:laws` where it lands with the polish plan (P7.2); otherwise **Review only**, by the `ui-compliance-reviewer` agent.

**Rule C3. Status is never colour alone.** Every status carries an icon or a word (`StatusBadge` and `InlineAlert` add both). **Enforced by** the `StatusBadge` and `InlineAlert` component tests; **Review only** elsewhere.

**Rule C4. White text on a status fill only where it passes.** `status.danger.solid` may carry white text in both themes; `positive`, `info` and `neutral` solids in light only; `warning.solid` never. Use `status.*.bg` with `status.*.text` for labelled badges. **Enforced by** `tokens.a11y.test.ts`.

### 2.4 How much colour (light and dark)

Light mode ("Mint") adds colour without tinting data:

- About 60% mint canvas, 30% off-white cards and bands, 10% accent: the solid mint hero, teal links and outline buttons, apricot for debt, and the tint family on icon tiles.
- Dark (charcoal) appears in light mode only on primary buttons, small markers and the footer. Light mode uses no pink, apart from the rose exception in section 14 and the marketing orb colours (section 2.7).
- App section titles sit on a dark rule (`border.section`) so sections are clearly separated.
- Cards separate from the canvas by a visible 1px `border` edge (the `border.DEFAULT` token; write `"border"` in code) and a soft deep-green shadow **[PR 1]**, not by tint.
- Each area of the app has one colour, on its home section card, its page headers and its icon tiles (owner request, 19 Nov 2026, which replaced the E16 P9.3 map of teal, sage, apricot and neutral). The one home for the map is `ICON_TILE_DOMAIN_TONE` in `packages/ui` (`IconTile.tsx`); the home cards read it through `sectionColours.ts`, so a card and its page cannot differ:

| Area                 | Colour  | Tokens                                  |
| -------------------- | ------- | --------------------------------------- |
| Net worth, mortgage  | Teal    | `chart.series1`, `surface.tint.teal`    |
| Savings              | Sage    | `chart.series2`, `surface.tint.sage`    |
| Debt                 | Apricot | `chart.series3`, `surface.tint.apricot` |
| Pension              | Sky     | `chart.series6`, `surface.tint.sky`     |
| Self Assessment, tax | Violet  | `chart.series4`, `surface.tint.violet`  |
| Budget and pay       | Rose    | `chart.series5`, `surface.tint.rose`    |
| Accounts             | Accent  | `accent`, `accent.subtle` (rule C7)     |

- A colour names an area. It is never the only carrier of meaning (the title and icon always name the area) and never says good or bad: no area uses `series7` (the warning colour) or a status colour (rule C8). The `chart.seriesN` tokens are the glyph colours on the tiles only; charts keep their own palette, and only tiles, headers and card edges follow this map. Contrast and separation **Enforced by** `tokens.a11y.test.ts` ("E16 surface tints"); the map by `IconTile.test.tsx`, and its match with the home cards by `sectionColours.test.ts` and `WidgetCard.test.tsx`.

- At most one tinted section per page, never around a `KpiStrip`, a `ScenarioZone` or a chart. KPI cards are never tinted.
- Marketing bands alternate off-white `surface.card` with mint `surface.canvas`, and nothing else: no solid colour band, so no `surface.hero` band, no charcoal `surface.contrast` closing band and no tinted band (owner, 27 Nov 2026). The page ends calmly on a card or canvas band above the shared footer, which is chrome (rule L1), not a band. Bubble fields may sit at the edges of a band (section 2.7); they are not a band colour. This replaced the solid mint and charcoal bands of Midnight and Mint (24 Nov 2026), which had replaced the canvas and `surface.tint.teal` bands of owner choice "A" (2026-11-20) and the sage and apricot bands of D16. **Enforced by** the `HomePage`, `FeaturePage`, `AiConnectionPage`, `ClosingCta` and `SecurityPrivacySection` tests once slices M1 and M3 change them; until then those tests still pin the older band order (ROLLOUT-PLAN, "Guards to change, and in which slice").
- Dark mode is "Midnight": cool charcoal surfaces that step lighter as they rise (sunken `#0f1216`, canvas `#14171c`, card `#1d2128`), borders `#303740` and `#3a424e`, text `#f1eee8` and muted `#a9afb9`. Mint `#6fd0ba` is the headline figure and the primary button fill, with dark ink `#0e1a17` on it. Soft pink `#e3b5d1` is the accent, for small accents only. Apricot is a quiet `#2e261c` in dark, not a heavy brown **[R2-2]**.
- Dark mode works with JavaScript off (D30): every semantic token's dark value also applies under `prefers-color-scheme: dark` unless the page has been set to light (`systemDark` condition, `withSystemDark` in `@flump/tokens`). A component style that uses `_dark` must also set `_systemDark`. **Enforced by** `colorScheme.test.ts` **[R2-2]**.

**Rule C5.** `surface.hero` appears at most once per page, on the page's headline figure. **Enforced by** `expectPageRules` **[PR 2]**.

**Rule C6.** Marketing uses the same tokens as the app, plus its own material tokens (section 2.7), and no off-system colour. In the apps the logo is the only gradient; the only light is the glass card material on cards holding no figure and a still focus or hover light (tier A). On the marketing site the only others are the orb's own shading and the light of the glass card and the tilt-and-light hover (section 2.7). None is drawn over text or a figure, and none is violet or rose except on the orb itself. **Enforced by** `scripts/check-design-tokens.ts` (baseline may only shrink).

### 2.5 Contrast

| Pair                                                       | Minimum                                                 | Enforced by           |
| ---------------------------------------------------------- | ------------------------------------------------------- | --------------------- |
| Text on its surface                                        | 4.5:1 (3:1 for text at 24px or larger, or 18.66px bold) | `tokens.a11y.test.ts` |
| Control borders, focus ring, chart marks, meaningful icons | 3:1 against the adjacent surface                        | `tokens.a11y.test.ts` |
| Card edge against canvas                                   | 1.3:1 **[PR 1]**                                        | `tokens.a11y.test.ts` |
| Any two page surfaces                                      | 2.0 deltaE                                              | `tokens.a11y.test.ts` |

Both themes are tested. A new token is not added until its pairs are in the matrix.

### 2.6 The accent

Since Midnight and Mint (24 Nov 2026) the accent is a deep blue-teal in light and the soft pink in dark, so damson leads nowhere in light and pink never appears in light. It adds a second voice without touching data. The E17 "Damson" options in `docs/design/e17-options/` are history; the roles and rules below still stand.

| Token           | Light     | Dark      | Role                                                                                   |
| --------------- | --------- | --------- | -------------------------------------------------------------------------------------- |
| `accent`        | `#1d5f73` | `#e3b5d1` | Icons, shapes, lines, and text on `surface.card`, `surface.canvas` and `accent.subtle` |
| `accent.subtle` | `#d2eef0` | `#2f2733` | A tinted card or section                                                               |
| `accent.border` | `#a9c6be` | `#5a4655` | The edge of an `accent.subtle` surface (decorative)                                    |
| `accent.onHero` | `#0b6b5d` | `#e3b5d1` | One shape on `surface.hero`                                                            |
| `chart.accent`  | `#1d5f73` | `#e3b5d1` | One chart series, with a direct label and a dash                                       |

**Rule C7. Where the accent may go.** One tinted card or section per page, counted with the domain tints (a page has one tinted section in total, never an accent one and a domain one). Icon tiles. One small shape per illustration scene. One chart series, which must be dashed and directly labelled: under colour-vision simulation the accent sits close to the teal, so colour alone never tells them apart. One sun shape in the corner of the hero, with no bars or arrows beside the figure. **Review only**; contrast and separation **Enforced by** `tokens.a11y.test.ts` ("E17 accent namespace").

**Rule C8. Where the accent never goes.** A figure, KPI card, table cell or amount. A button, link or focus ring (teal only). A notice or status message. Around a `KpiStrip`, a `ScenarioZone` or a chart frame. And it never says that anything about a person's money is good or bad: it is not a status colour, and it is never paired with a gain, a loss, a debt or a target. **Review only**; `tokens.a11y.test.ts` keeps it at least 25 deltaE from every status colour and from `chart.debt`, `chart.warning` and `chart.wealth` in normal vision. Under colour-vision simulation the gap narrows, which is one more reason the accent never stands in for a status.

**Bolder tints (E17).** The existing teal, sage and apricot tints are used more often, not changed: the one tinted section a page is allowed is the norm on pages that have a natural candidate (for example a prompt card), and icon tiles take their domain tint. No tint value changed, and the limits in section 2.4 stand.

### 2.7 Marketing colour and material (27 Nov 2026)

The marketing site adds an orb, bubble fields and two card materials to the palette above. They are tokens like any other **[F2]**: `orb.skyTeal.*` and `orb.violetRose.*` in `packages/tokens/src/index.ts`, plus the glass and paper material. The orb and bubble tokens are marketing only. The glass material and the still hover light may also be used in the apps on cards holding no figure (tier A, AT3). Behaviour is in UX-GUIDELINES 12.2.

| Element              | Colour and material                                                                                                                               | Never                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Orb                  | A lit sphere in one orb colour set (sky and teal, or violet and rose), shaded by its own light. Still image where the device cannot run it (MK11) | Over a heading or text; cut by an edge                                       |
| Bubble field         | Soft circles in the two orb colour sets, at the edges of a band                                                                                   | Behind long text, a figure or a chart; as icons on feature tiles             |
| Glass card           | A card with a soft border and a faint inner light                                                                                                 | A top border on hover; glass objects inside pictures                         |
| Document card        | Paper on `surface.card`, ink from text tokens, an "Example" tag (section 8.3)                                                                     | Real names, real account numbers or real-looking personal details            |
| Tilt-and-light hover | A pointer light and a moving mint or neutral gradient, with up to six degrees of tilt                                                             | On a card that holds a real figure; in the apps (UX-GUIDELINES 12.1, tier C) |
| Receding scene       | A tinted overlay and a soft blur behind the content at a journey stop                                                                             | Over content; as fog                                                         |

- **MC1. Mint leads; violet and rose are for orb-like elements only** (the orb and bubble fields), never a tint, gradient or background of anything else. The existing `surface.tint.violet` and `surface.tint.rose` stay home section card icon tiles only. **Proposed check**: the orb-only colour check **[F2]**.
- **MC2. Colour never judges.** Debt is never rose, and no orb colour is paired with a gain, a loss, a debt or a target. Rules C2 and C8 apply. **Enforced by** `check-judgement-tokens.ts`.
- **MC3. Contrast is unchanged.** Text on glass, paper or a receding scene meets section 2.5 on its actual background, in both themes and in forced colours. **Enforced by** `tokens.a11y.test.ts` once the material tokens join its matrix **[F2]**; **Review only** for a backdrop that moves.

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

Breakpoints: 640, 768, 1024, 1280px. The navigation switches from the phone pattern (menu button, drawer and, in the app, the bottom bar) to the desktop pattern at 768px (`NAV_BREAKPOINT`, owner ruling 2026-11-14), on marketing and web alike. From 768px to 1023px the desktop bar is compact, and from 1024px (`NAV_WIDE_BREAKPOINT`, `_navWide`, the "everything fits" width, shared by both sites) it is full. Links in the top bar are text only at every width (group buttons keep their chevron), with 12px of padding each side at every width; when a bar would not fit, links move into the menu rather than the padding shrinking. Compact: the one-button theme switch; in the web app "Home", "Accounts", "Budget" and "Pay" inline (the bottom bar's pages) with the two groups in the menu; on marketing the lower-priority items ("AI connection", "Preview", "Sign in") move into the menu. The menu button stays in both (`wideOnly` items, `menuBelow="wide"`); text never shrinks. Full: every web section with "Home" first, every marketing link, and the three-way theme switch. "Home" is a nav item at every width in the web app (owner ruling): inline from 768px, in the bottom bar below. The menu button sits last on the right, the side its drawer opens from. The phone top bar holds the logo, one-button theme switch, the account avatar (or "Sign in") and the menu button, all 44px targets, and fits at 320px.

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

Light shadows are tinted with the deep-green ink (`rgba(15,42,42,a)`), never grey-blue. Dark mode raises by a lighter surface plus a hairline (an inset top highlight and a 1px ring), with only a modest shadow.

- **E1.** Elevation shows stacking order, not importance. The headline is made important by size and the hero surface, not by a shadow. **Review only**.
- **E2.** Every shadow has a dark value and uses the deep-green ink in light. **Enforced by** `tokens.foundations.test.ts`.
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

Flump has two picture styles, drawn by the one `Illustration` primitive:

- **Document cards** (section 8.3, owner, 27 Nov 2026): tilted cards and paper documents (a bank card, a payslip, a budget slip, a statement, a calendar page, a ticket) with sample content and an "Example" tag. The marketing site uses them now. The web and mobile apps switch their empty states, onboarding and check-in to them once the new marketing home page has shipped (owner, D4).
- **Flat scenes** (section 8.1, E17): flat shapes on a ground line. The apps keep them until that switch.

Rules for both styles:

- Pictures go where section 8.2 says. In the apps, beyond whole-page empty states and check-in, a picture is allowed on large screens with spare space or beside all-number cards, at most one in view at a time and never pushing a figure down (rule B10); never beside real figures on compact viewports. On the marketing site, at most one picture per band.
- Colours come from semantic tokens and follow the theme. No people's faces, no piles of coins or cash, no upward-arrow "growth" clichés, no red, no finish flag, and nothing that grades a situation.
- They are decorative: hidden from assistive technology, and the text beside them carries the meaning.
- A picture never moves in an error state. Where a picture may move, it follows UX-GUIDELINES 12.1 (apps) or 12.2 (marketing).
- The hero block may carry one sun shape in `accent.onHero` **[E17]**, with no bars or arrows beside the figure. Nothing else in the app hero is decorated.

**IL1.** Pictures use semantic tokens and follow the theme. **Enforced by** `scripts/check-design-tokens.ts`. **IL2.** Placement. **Review only**. **IL4.** Every picture, in either style, is stored as a list of shapes (kind, position, colour role, and for a document card its lines of sample text) in one shared file. The web draws the list as SVG and the mobile app draws the same list with its own SVG library. No image files. **Review only** until the shared file exists.

### 8.1 Flat scenes (E17)

Every flat scene is built to one sheet, so a new one sits beside the Budget scene without a second look. Samples are in [`docs/design/e17-options/options.html`](../design/e17-options/options.html), section 3.

Style: flat shapes in the palette's own tokens (mint, teal, sage, apricot), soft rounded forms that echo the logo, no outlines. A new scene is added to the primitive and drawn with token colours so it follows the theme.

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
| Main      | `primary.solid`                                   | The main object, one per scene (charcoal in light, mint in dark)                 |
| Pale teal | `primary.border`                                  | Its partner or its back                                                          |
| Sage      | `chart.wealth`                                    | The third form, stems and leaves                                                 |
| Sun       | `chart.debt` at reduced strength                  | The disc and its halo                                                            |
| Ground    | `surface.sunken` (light), `surface.subtle` (dark) | The ground, nothing else                                                         |
| Paper     | `surface.card`                                    | Small details on the main object                                                 |
| Accent    | `accent`                                          | One small shape per scene (a day on the calendar, a coin). Never the main object |

**IL3.** A flat scene follows the sheet above. **Review only**. Storage is rule IL4 (section 8).

### 8.2 Where pictures go

The flat scenes below are the apps' pictures until the switch to document cards (D4); each place then takes its document card counterpart, and the "When" column keeps its meaning.

| Place                                                                                                            | Scene                                                                                                                       | When                                         |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Dashboard first visit, Budget empty state                                                                        | Budget bars                                                                                                                 | Exists                                       |
| Accounts empty state                                                                                             | Stacked cards                                                                                                               | Exists; stop reusing it on other pages       |
| Goals empty state, not-found page, error page                                                                    | Target, signpost                                                                                                            | Exists                                       |
| Savings empty state                                                                                              | Jar                                                                                                                         | Now                                          |
| Debts empty state                                                                                                | Three balances and a dotted path                                                                                            | Now                                          |
| Pension empty state                                                                                              | Pot and plant                                                                                                               | Now                                          |
| Monthly check-in, start and summary                                                                              | Calendar; the tick is the only change                                                                                       | Now                                          |
| "Finish setting up" finish state                                                                                 | Sprout from the Budget scene                                                                                                | Now                                          |
| Mortgage, Self Assessment, forecast and take-home pay empty states; onboarding steps                             | To draw                                                                                                                     | Later                                        |
| Web app empty states, onboarding and check-in                                                                    | Document card counterparts of the scenes above (section 8.3); error pages take the same pictures and never move             | After the new marketing home page ships (D4) |
| Marketing home hero and bands                                                                                    | Document cards (the assembled hero, the calendar page, the security card, the getting started ticket), one per band at most | Rollout slice M1                             |
| Marketing features, area pages, AI connection, preview, security, contact                                        | One document card per band at most                                                                                          | Rollout slices M3 and M4                     |
| Marketing not-found page                                                                                         | Signpost today; then a ticket document card and one small still orb                                                         | Signpost exists; the ticket in slice M5      |
| Beside a price on marketing pricing; beside a real figure on a compact screen; any notice; any error about money | None                                                                                                                        | Never                                        |

The mortgage scene is shown only to people who use the mortgage page, so renting is never set against owning.

### 8.3 Document cards (27 Nov 2026)

The approved sheet is prototype 11's picture set (`apps/marketing/prototypes/p11/art/Pictures.tsx` on branch `claude/marketing-motion-prototypes-66c08d`); the chosen sheet is copied into `docs/design` when slice F3 builds the primitive.

| Part    | Rule                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Objects | A bank card, a payslip, a budget slip, a statement, a calendar page or a ticket, slightly tilted, on paper (`surface.card`) with a soft shadow                     |
| Content | Sample content only: made-up round figures in tabular numbers, no real names, account numbers or addresses. Figures follow the house rules (B8 dates, B9 rounding) |
| Tag     | An "Example" tag on every card that shows figures, as real text (not drawn as shapes), so it scales with text size and survives forced colours                     |
| Lines   | Hairline edges and ruled lines from border and text tokens. Flat-scene shapes may sit on a card                                                                    |
| Colour  | Semantic tokens only. Debt in apricot, never rose; violet and rose never on a card (rule MC1)                                                                      |
| Never   | Glass objects, bubble icons, people or faces, coins with symbols, arrows that grade, anything that implies the reader's own finances                               |

**IL5.** A document card follows the sheet above and carries its "Example" tag. **Review only**; the tag's presence **Proposed check** in the primitive's tests **[F3]**.

## 9. Logo

- The logo is the Flump blob: a soft teal form with a radial gradient and a small ground shadow, drawn inline so it follows the theme. It is the only gradient in the apps (material light: rule C6); on the marketing site the orb and the material light in section 2.7 are the others (rule C6).
- One component (`FlumpLogo`, wrapped by `HomeLogo` in the header) on marketing and web. The mobile app icon and in-app logo are drawn from the same artwork.
- Sizes `sm`, `md`, `lg`. Clear space around it is at least half its width. Do not recolour it, rotate it, add a wordmark in another typeface, or place it on `surface.hero` or a photograph.
- In a header it links to home and takes its accessible name from the link.

**L1.** Marketing and web render the same logo, theme switcher, top bar, drawer, footer and favicon from `@repo/ui`. **Enforced by** `chrome-parity.laws.test.ts`.

## 10. Charts

Chart behaviour rules are in UX-GUIDELINES section 8 and [`docs/design/data-viz.md`](../design/data-viz.md). The palette:

| Token                       | Light                                | Dark        | Use                                                    |
| --------------------------- | ------------------------------------ | ----------- | ------------------------------------------------------ |
| `chart.primary` (`series1`) | `#0b6b5d`                            | `#6fd0ba`   | Net worth, mortgage, pension; the main line            |
| `chart.wealth` (`series2`)  | `#64885c`                            | `#9ad0a0`   | Savings                                                |
| `chart.debt` (`series3`)    | `#c26a18`                            | `#eda45f`   | What you owe                                           |
| `series4` to `series8`      | purple, rose, blue, olive-gold, grey |             | Further entities, in this order                        |
| `chart.projection`          | `#6b3f2a`                            | `#ffd2a8`   | Forecast lines, always dashed                          |
| `chart.band`                | teal at 14%                          | teal at 15% | The range behind a forecast line; a fill, never a line |
| `chart.baseline`            | `#5e837a`                            | `#737c88`   | Zero line, targets, reference lines                    |
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

These are the app scale. The marketing site has its own calm scale **[F2]**, named apart so the app's `fast`, `base` and `slow` never change for it. The starting values (ROLLOUT-PLAN section 2; the token file wins once it exists): hover about 590ms, entry 1,540ms, stagger 196ms, disclosure 980ms, count 2,240ms, chart 2,660ms, hero 4,760ms; easings "calm" `cubic-bezier(0.25,0.1,0.2,1)` and "calmInOut" `cubic-bezier(0.45,0,0.3,1)`, with no overshoot. The apps never use the calm scale (UX-GUIDELINES M2).

### 11.1 Approved animations in the apps (E17; tiers in UX-GUIDELINES 12.1)

These are the only animations in the web and mobile apps beyond tier A. Each plays once, in answer to something the user did or the first time a thing is seen. None plays on every page load and none loops. Working demos are in the options page, section 4. A saved figure changing, the check-in moving on and the save confirmation mark a change of state. The rest are tier B moments: setup progress, the chart draw, the check-in completion picture and onboarding entrances from the tier table, and the empty-state settle (ROLLOUT-PLAN section 4, "Empty and error states").

| Animation                               | Tokens                                                                                   | Plays                                                                                                                                                 | With reduced motion                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| A saved figure changes                  | Cross-fade over `fast`, `standard`; a pale teal wash fades over `scene`                  | Once, when a balance is saved                                                                                                                         | The figure swaps at once, no wash                 |
| The check-in moves to the next account  | Arrives over `base`, `enter`; 24px travel; no leave phase (it delayed input)             | On each "Next" in the check-in; Back runs it the other way                                                                                            | A short fade, no travel                           |
| Setup progress fills                    | `slow`, `standard`                                                                       | Once, the first time the dashboard is seen after a step is done, on a client navigation; a server-rendered first load is drawn still                  | The ring is drawn at its new length               |
| Save confirmation                       | Label swaps over `fast`; the tick draws over `base`, `standard`; returns after 2 seconds | On every successful save, in the button that was pressed                                                                                              | The label changes to "Saved" with a finished tick |
| A scene settles on first view           | `scene`, `settle`: the sprout grows from its base, the sun rises 10px                    | Once, the first time an empty state is shown in a visit, on a client navigation; a server-rendered first load is drawn still. Never in an error state | The scene is still from the start                 |
| A chart draws in                        | `draw`, through `useChartAnimation`                                                      | Once per visit; off while a slider is dragged                                                                                                         | Drawn complete                                    |
| The check-in completion picture settles | `scene`, `settle`                                                                        | Once, when the check-in summary is first shown                                                                                                        | The picture is still from the start               |
| An onboarding step arrives              | Within `slow`, `enter`; opacity and a short travel                                       | Once per step                                                                                                                                         | A short fade, no travel                           |

Left out, and why:

| Animation                              | Decision          | Reason                                                                                                                                                            |
| -------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A figure counts to its new value       | Never in the apps | UX-GUIDELINES M3: a real figure never counts or rolls. It shows amounts that were never true, and a person glancing mid-count could read a wrong balance (tier C) |
| Tilt, parallax, bubble fields, the orb | Never in the apps | Tier C (UX-GUIDELINES 12.1): they delay reading or move what holds a figure                                                                                       |
| Button hover and press scale           | Second pass       | Small gain; touches every button story and snapshot                                                                                                               |
| The tab marker slides                  | Second pass       | Best done once, inside the single tabs component                                                                                                                  |
| A toast arrives                        | Second pass       | The save confirmation covers most saves                                                                                                                           |

### 11.2 Marketing building blocks (27 Nov 2026)

The approved motion on the marketing site (owner, 27 Nov 2026). Rules are in UX-GUIDELINES 12.2; which pages get which block is rule MK15. Every block uses the calm scale, and with reduced motion every block shows its finished state and GSAP and three.js are not loaded (UX-GUIDELINES M4).

| Block                             | What it is                                                        | Plays                                                                                                         | Still version (reduced motion, no JavaScript, low power) |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Orb                               | A lit 3D sphere (three.js) rolling along the bead track           | Through the home page journey; at a stop only the orb moves                                                   | A still image of the orb in place (MK11)                 |
| Bubble field                      | Soft drifting circles, CSS only, in the two orb colour sets       | Slowly, pausing off screen and in a hidden tab, with a stop control or coming to rest within 5 seconds (MK14) | The circles stand still                                  |
| Bead track                        | The winding dotted path the orb rolls along                       | Draws with the journey                                                                                        | Drawn complete                                           |
| Glass card                        | Card material (section 2.7)                                       | No motion of its own                                                                                          | Unchanged                                                |
| Document card                     | A tilted paper picture tagged "Example" (section 8.3)             | May arrive with an entrance                                                                                   | At rest in place                                         |
| Tilt-and-light hover              | Pointer light, a moving gradient and up to six degrees of tilt    | On hover with a pointer only, never on a card holding a real figure                                           | No tilt, no moving light                                 |
| Entrance                          | A card or tag arriving once, staggered, by distance and opacity   | Once, when first scrolled into view                                                                           | In place from the start                                  |
| Count-up                          | A fixed sample figure tagged "Example" counting to its value      | Once, when first seen; the final value is in the HTML (MK10, MK13)                                            | The final value                                          |
| Self-drawing chart                | The breathing room, savings line or debt payoff drawing itself    | Once, when first seen                                                                                         | Drawn complete                                           |
| Unfolding payslip, accounts tiles | The two approved set pieces                                       | Once, when first seen                                                                                         | Unfolded, laid out                                       |
| Triggered changeover              | Leave, beat, arrive, started by scroll and finished by time (MK2) | At each journey stop                                                                                          | Every stop shown in order                                |
| Receding scene                    | A tinted overlay and a soft blur behind the content at a stop     | While the stop is at rest                                                                                     | No overlay or blur                                       |
| Carousel with dots                | Sideways features, with dots and previous and next buttons (MK9)  | When the visitor moves it                                                                                     | A native sideways scroll, every item in the page         |

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

| Component                                                               | Parts                                                                                                           | Fixed rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                                | Label, optional leading icon                                                                                    | Variants: `primary` (`primary.solid`: charcoal in light, mint in dark; one per page), `outline`, `ghost`, `link`, `danger`. Heights 40, 48, 56px. Label is a verb phrase                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `TextInput`, `CurrencyInput`, `PercentInput`, `Select` in a `FormField` | Label above, control, helper text, error text                                                                   | Label always visible. `£` and `%` are fixed adornments, not typed. 8px radius, `border.input` edge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `SliderField`                                                           | Label top left, editable value pill top right, slider below, optional helper                                    | The pill is a real text input; the slider is never the only way to set a value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Card`                                                                  | Optional title row, body, optional footer                                                                       | `surface.card`, 16px radius, 1px edge, level 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `HeroFigure` **[PR 2]**                                                 | Label, optional `explain` tip, optional estimate label, value in `numeric.hero`, one optional delta or sub-line | On `surface.hero` with `text.onHero`, the value in `text.heroFigure`, and a `border.hero` edge. One per page. A saved figure (net worth, a balance, a total owed) never carries an estimate. On a calculator-style page (Take-home, Self Assessment, the tool pages) the hero may show the estimated answer the page exists to give, with the "Unverified estimate" label inside the hero (`estimateLabel`; owner ruling 2026-11-15, which replaces D2 for those pages). Falls back to a plain block when the value is unknown. Under forced colours it uses `Canvas` / `CanvasText` with a real border and drops the disc |
| `KpiCard`                                                               | Label, optional `explain` tip, value in `numeric.kpi`, optional delta badge, optional one-line caption          | Never tinted. Every value (money, date, text) is the same `numeric.kpi` size and wraps rather than grows. Cards in a strip share one height, caption at the bottom. Unknown value is "Not set" in `numeric.unset` with one action link                                                                                                                                                                                                                                                                                                                                                                                     |
| `KpiStrip`                                                              | 3 cards (4 at most) in one row; 2 cards split it into equal halves                                              | Always spans the full content width, so its outer edges line up with the `HeroFigure`; its cards split the row equally (two cards: halves) and are never capped to a narrower grid. Each card keeps its value at `numeric.kpi` and carries a one-line caption with no figure, so a short strip does not read as empty. Two cards sit side by side on a phone too (round 4, independent review of four options)                                                                                                                                                                                                             |
| `Tabs` (the segmented control) **[PR 2]**                               | Container, 2 to 4 items, selected thumb                                                                         | The only in-page view switcher. Hidden when there is one option. Focus ring for the keyboard only, never after a click                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `StatusBadge`                                                           | Icon, text                                                                                                      | Tone decides colour and icon; text states the status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `InlineAlert`                                                           | Icon, message, optional action                                                                                  | For things the user must act on. Errors announce as alerts, others as status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ProjectionNotice`                                                      | Small info icon, fixed sentence                                                                                 | Quiet note: `text.secondary` on the parent surface, top hairline, no fill **[PR 2]**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ScenarioZone`                                                          | Title, "Illustration, not saved" badge, basis line, tools, footer (reset, update details, the notice)           | `surface.subtle` with a 1px dashed edge **[PR 2]**. Visibly lighter than the saved details above it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `ChartFigure`                                                           | Title in `heading.sm`, one-sentence summary, chart with direct labels, optional annotation, "Show data"         | Summary is required **[PR 2]**. Title keeps normal letter and word spacing **[R2-2]**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `SectionBand`                                                           | Full-width band, optional h2 and one-line subtitle; or variant `app`, a plain section heading                   | Marketing tones `card` and `canvas` alternating, and no solid colour band (owner, 27 Nov 2026; section 2.4). The `hero`, `contrast` and `teal` tones remain in code until the rollout slices remove their last use; no new band uses them. Marketing's `MarketingSection` is this band **[R2-2]**                                                                                                                                                                                                                                                                                                                          |
| `Table`, `DataList`                                                     | Header row, rows, optional total row                                                                            | Figures right-aligned and tabular. More than 8 rows collapses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `CollapsibleDrawer`                                                     | Trigger with chevron, content                                                                                   | The chevron rotates; the content is reachable by keyboard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Dialog`, `Sheet`                                                       | Title, body, actions                                                                                            | `surface.overlay`, 24px radius, level 3, over `surface.scrim`. A dialog on desktop becomes a bottom sheet on a phone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ConfirmDialog`                                                         | Title naming the thing, consequence, cancel, destructive button                                                 | The destructive button is `danger` and says what it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `Toast`                                                                 | Icon, message, optional action                                                                                  | Bottom of the screen above the bottom bar; level 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `EmptyState`                                                            | One illustration, one sentence, one button                                                                      | Replaces the page body below the header                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Skeleton`, `PageSkeleton` **[PR 2]**                                   | Grey blocks in the shape of the content                                                                         | A gentle pulse only when motion is allowed. Shown through `PendingReveal` (200ms delay, 400ms minimum; UX-GUIDELINES E2), never as a page-level route skeleton. The loading pattern: there is no standalone spinner **[R2-2]**                                                                                                                                                                                                                                                                                                                                                                                             |
| App chrome                                                              | `TopBar`, `SideNav` or inline nav, `MobileBottomBar`, `NavDrawer`, `SiteFooter`, `ThemeToggle`                  | Shared by marketing and web                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

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

- **Section header.** Every section on a page opens with an icon tile, a title and one line saying what it is. In the app the title sits on a dark rule (`border.section`). Sections sit 36 apart (`spacing.page.*`), so each reads as its own block.
- **Saved sections are cards** on the canvas. A modelling zone is the only dashed outline on a page and has no fill.
- **Result block.** A section's key figure sits in one result block: a card of its own holding a label, an optional lead-in, the figure at 36, a note and at most one supporting row. One result block per section, for that section's key figure. It never uses `surface.hero` or a tint.
- **A saved result has its own section.** A figure worked out from saved details (for example "Breathing room") is shown in a result block in a section of its own. It never sits inside a modelling zone.
- **A modelling zone presents its result** in one result block: to the right of the inputs from tablet width up, and under them on a phone. Nothing else inside a zone is a card.
- **"Illustration, not saved" stays recognisable.** The zone keeps its dashed outline, now at 3:1 or more against the canvas (`border.input`), and the "Illustration, not saved" badge. The meaning never rests on colour alone, and the notice at the foot of the zone stays quiet.

**Components.** `PageSection` wraps one saved section: a `<section>` named by its `SectionHeader`, with the content under it. `ResultBlock` is the result card; its figure uses `numeric.result` (36px, tabular). `ScenarioZone` takes its one result block in `result`, and anything that follows the inputs and the result (a drawer of further options) in `extra`. When a section header already shows the result's name, the block keeps the name for assistive technology and does not print it twice (`hideLabel`). The icon tile takes the page's area colour (the map in section 2.4); at most one header on a page uses the accent tile (rule C7).

**SR1.** One result block per section; a saved result is never inside a zone. **Review only**. The zone outline contrast is **Enforced by** `tokens.a11y.test.ts` ("border.input reaches 3:1 on every surface in both themes") and `ScenarioZone.test.tsx`.

### 12.6 Naming: "Breathing room" (E17)

"Breathing room" replaces "Months of cover" everywhere a person reads it. The wording is the owner's and is fixed:

| Part           | Wording                                           |
| -------------- | ------------------------------------------------- |
| Label          | Breathing room                                    |
| Description    | How long your savings would cover the essentials. |
| Value          | About 1.5 months                                  |
| From a year    | About 1 year, About 1 year 1 month                |
| Above 10 years | More than 10 years                                |
| Dashboard line | Breathing room: about 1.5 months                  |

From 12 months the value reads in whole years and months (owner ruling, 18 November 2026): one decimal place under a year, and once that rounds to 12 or more, whole months rounded half up (11.96 is "About 1 year", 12.5 is "About 1 year 1 month"), with no "0 months". One formatter, `breathing-room-wording.ts` in the finance engine, words it for the app, the marketing previews and AI text.

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

### 27 November 2026: the marketing design language

Decider: the owner, who accepted the six recommendations of [`docs/design/motion/ROLLOUT-PLAN.md`](../design/motion/ROLLOUT-PLAN.md) (DECISIONS, D1 to D6) after choosing prototype 11 on branch `claude/marketing-motion-prototypes-66c08d`. On the rules: "happy to rewrite these rules to fit the new approvals".

- The marketing site gains the orb, bubble fields, glass and document cards and a calm, slower motion scale (sections 2.7, 8.3, 11 and 11.2; UX-GUIDELINES 12.2). GSAP and three.js may be used there and nowhere else.
- Marketing bands alternate card and canvas only. The solid mint band and the charcoal closing band of 24 November 2026 are withdrawn (section 2.4).
- Violet and rose appear only on orb-like elements, never as a tint, gradient or background. Debt is never rose.
- Pictures become tilted cards and paper documents tagged "Example" (section 8.3): on the marketing site now, in the apps' empty states and check-in once the new home page ships. Error states stay still. Pictures stay shape lists (IL4).
- The apps follow tiers A, B and C (UX-GUIDELINES 12.1). Count-up on real money, scroll scenes, WebGL, parallax, bubble fields behind data and tilt on cards holding figures never reach the apps.
- Accessibility, reduced motion, tabular figures and the no-judgement colour rules are unchanged or stricter.

### 25 November 2026: the light logo is teal

Decider: the owner, who reported the light logo as black. The Midnight and Mint mock-ups draw the light logo as a charcoal dot, and #901 followed them by painting the mark with the charcoal button fill. By the owner's request the light mark is teal (`#084f45`, lit from above by `#0b6b5d`); dark stays mint (`#6fd0ba`, lit by `#9be3d2`). The mark has its own tokens, `primary.mark` and `primary.markLit`, so restyling the buttons never recolours the logo. The favicon tile follows the same colours (owner, same day), pinned by `chrome-parity.laws.test.ts`. Each clears 3:1 on the canvas, card and overlay in both themes (5.8:1 or more in light). **Enforced by** `tokens.a11y.test.ts` (teal or mint hue, never a neutral; 3:1), `FlumpLogo.test.tsx` and the FlumpLogo stories' play check.

### 24 November 2026: Midnight and Mint replace Direction C

Decider: the owner. Mock-ups (sample data only): [`docs/design/midnight-mint/`](../design/midnight-mint/README.md).

Midnight (dark) and Mint (light) replace the E15 "Direction C" look (cream canvas, deep teal-green hero, sand neutrals). The old look closely resembled another company's site. No copying was found, but the owner wants Flump to look distinct. The token values in section 2.2 and `packages/tokens/src/index.ts` carry the change; fonts are unchanged (Plus Jakarta Sans headings, Inter body, no serif).

Light rules:

- Canvas a subtle mint `#eef6f3` (owner, 24 Nov 2026, replacing the first `#e4f4ef`); cards and bands off-white `#f8fcfa`, never pure white. Light cards keep a hairline edge (`border`, `#c8dcd5`: the owner asked for `#d5e5e0`, but that is 1.26:1 on the card and 1.19:1 on the canvas, under the 1.3:1 card-edge rule, so the nearest passing value is used).
- The headline panel is solid mint `#6fd0ba` with dark ink `#0f2a2a`. Mint fails as text on light grounds, so it is only a fill there (rule C9).
- Text `#0f2a2a`, `#2f4a4a` and `#476060`. Links and outline buttons teal `#0b6b5d`, hover `#084f45`. Primary buttons charcoal `#14171c`.
- Decorative hairlines `#c8dcd5` and `#d5e5e0`. Control boundaries (outline and secondary buttons, inputs, toggles, tracks) use `border.strong` `#678a82` or `border.input` `#5e837a`, both 3:1 on every surface; in dark `#7a8390` and `#737c88`. No pink in light, with one named exception below.
- **Exception: rose in light** (coordinator decision, 24 Nov 2026; the owner may veto). Rose stays the Budget and Pay section and chart colour, because the six section colours leave no free non-pink hue (red is danger, ochre is the chart warning, and an indigo would break the series4 to series6 colour-vision order). It appears on small marks only: the icon tile, the card's top edge, a chart series and its legend dot. Never on a background, band, button, link or text. The light `surface.tint.rose` (`#f3e3ea`) is as quiet as the other five tints.
- Dark appears only on primary buttons, small markers and the footer. Section titles sit on a dark rule.

Token meanings that changed: `surface.hero` (solid mint with dark text in light; an edged card with a mint figure in dark), new `text.onHero` and `text.heroFigure` (`text.onContrast` is now only for `surface.contrast`), `primary.solid` and `primary.foreground` (charcoal with off-white in light, mint with dark ink in dark), the light `accent` (deep blue-teal), and new `border.hero`, `border.section` and `primary.emphasis`.

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
