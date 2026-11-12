# E15 design tokens: architecture note

Scope: `packages/ui/src/tokens/` and `packages/ui/panda.preset.ts`. Direction: round 5 hybrid, Direction C's "Warm guide" palette (teal, sand, warm charcoal) on A's structure, with B's compact density available for simulators, tables and account lists. System theme is the default; `data-theme="light|dark"` overrides.

## Layers

1. **Primitives** (`colors`, `fontSizes`, `spacing`, `radii`, `shadows`, `sizes`, `durations`, ...): raw scales. Never referenced from components.
2. **Semantic tokens** (`semanticTokens`): the contract components use. Six colour namespaces stay fixed: `surface`, `text`, `border`, `primary`, `status`, `chart`. Plus semantic `shadows` (elevation), `spacing.density.*` and `sizes.density.*`.
3. **textStyles / keyframes**: composed from the tokens above (`textStyle: "heading.lg"`).
4. **Components**: consume semantic tokens and textStyles only (no raw hex, no primitives).

Files: `index.ts` (colours, radii, spacing, fontSizes, re-exports), `typography.ts`, `motion.ts`, `elevation.ts`, `layout.ts`. Name collision note: the Panda keyframes object is exported as `motionKeyframes` because `@repo/ui` already re-exports Panda's `keyframes()` helper.

## Prop vocabulary

Components use one vocabulary: `variant` (visual treatment, e.g. `solid | subtle | outline`), `tone` (meaning, e.g. `neutral | positive | warning | danger | info`) and `size` (`sm | md | lg`). Do not add `kind`, `type` (for visuals), `color` or `intent` props.

## Plain-values rule (for E12)

Raw token objects (`fontFamilies`, `textStyles`, `durations`, `easings`, `zIndex`, `sizes`, `motionKeyframes`) hold plain strings and numbers only: no token references, no Panda-only syntax, so another runtime can read them as data. The exceptions are `semanticTokens`, which by definition use `{ base, _dark }` / `{ base, _compact }` and `{token.path}` references. Durations and easings are plain strings; reduced motion is the consumer's job (apply keyframes only under `_motionSafe`).

## Unknown values: "Not set" (D16)

A missing or unknown figure renders the text `Not set`, never `0`, `NaN`, `-` or an empty cell. Applies to every numeric textStyle consumer (KPIs, tables, forms).

## Density

`compact` is a Panda condition (`[data-density=compact] &`, in `panda.config.ts` and the preset). Semantic tokens `spacing.density.{controlPadY,controlPadX,rowPadY,cardPad,gap}` and `sizes.density.control.{sm,md,lg}` take `{ base: comfortable, _compact: compact }`. Usage: `<section data-density="compact">` then `py: "density.rowPadY"`, `height: "density.control.md"`. Comfortable control heights are 32/40/48px, compact 28/32/40px. `sizes.touch` (44px) never shrinks; compact is a pointer-density mode, so keep touch targets on coarse pointers.

## Fonts

Three roles, defined once in `fontFamilies` (`typography.ts`): `fonts.body`, `fonts.heading`, `fonts.numeric` (aliases body). Legacy `fonts.sans`, `fonts.display`, `fonts.mono` remain; `fonts.mono` is the system monospace stack (`ui-monospace, SFMono-Regular, Menlo, monospace`). JetBrains Mono was removed 2026-11-12: the app bundles exactly two fonts. The owner has not picked a typeface; Inter (body/numeric) and Plus Jakarta Sans (heading) are kept.

Self-hosting: `@fontsource-variable/{inter,plus-jakarta-sans}` (pinned 5.3.0) are dependencies of `packages/ui`, loaded by `packages/ui/src/fonts/fonts.css` (weight axis only, `font-display: swap`) and exported as `@repo/ui/fonts.css`. Apps adopt it in the later web-adoption task: add `import "@repo/ui/fonts.css";` to the root, and delete the Google Fonts `<link>` tags. Nothing is changed in `apps/web` or `apps/marketing` yet.

**Swap procedure:** (1) edit the relevant entry in `fontFamilies` in `typography.ts`; (2) change the matching `@import` in `fonts.css` and the dependency in `packages/ui/package.json`. Run `bun run --cwd packages/ui generate`.

## textStyles

`display`, `heading.{xl,lg,md,sm}`, `body.{lg,md,sm}`, `label.{md,sm}`, `numeric.{kpi,lg,md,sm}`. Rules (enforced by tests): 12px minimum, line heights 1.2 to 1.6, fluid `clamp()` only on `display` and `heading.xl`, numeric styles always `tabular-nums`, display/headings use the heading face and the rest use the body face.

## Motion and elevation

Durations: instant 0ms, fast 120ms, base 200ms, slow 320ms. Easings: standard, enter, exit. Keyframes: `fadeIn`, `slideUp`, `scaleIn`, `shimmer`. z-index (one scale, every preset-panda key redefined so nothing leaks through with a stale value): hide -1, base 0, docked 5, sticky 10, header 20, banner 25, dropdown 30, overlay 40, modal 50, popover 55, toast 60, tooltip 65, skipLink 70. No app or package consumes the z-index tokens yet: every existing `zIndex` is a numeric literal (for example 50/60 in dialogs, 80/90/100 in mobile nav, 1000 in AddDebtDialog, 9999/10000 in WidgetSettingsModal and MonthlyBalanceCheckInDrawer), so nothing breaks, but those literals do not follow this scale and should move to tokens during web adoption.

Elevation keys `xs`, `card`, `raised`, `overlay`, `focus`, all with `_dark` (lighter surface plus a hairline inset highlight, black shadow alpha at most 0.4). `cardHover` and `floating` remain as aliases. The primitive `shadows.xs` moved into the semantic set (same name, now themed).

## Colour changes

Colour values are defined once, in the "Round 5 palette" section at the end of this file (Direction C: teal, sand, warm charcoal). The earlier direction A values (indigo primary, ink-blue neutrals) no longer exist; `slate` and `indigo` primitives remain (indigo only for `status.info`). Liabilities in charts use apricot (`chart.debt`), never red.

### New keys (since E15 T1)

`surface.scrim`, `surface.hero` (round 5), `chart.series6..8`, `chart.projection`, `chart.band` and `chart.baseline`. Current values are in the round 5 semantic table. Rules that still hold: `surface.scrim` is a backdrop, never a text surface; `chart.band` is a fill behind lines only (composited at least 1.1:1 from the card, and `chart.primary` stays at least 3:1 on it); `chart.projection` is drawn dashed and is at least 15 deltaE from every series; `chart.baseline` is for reference lines.

### Contrast checks (enforced by `tokens.a11y.test.ts`)

Chart series, accents, projection and baseline are at least 3:1 on card, canvas, sunken, subtle and overlay in both themes (lowest measured: 3.07 light, 3.54 dark). Status fills (`status.*.solid`) are at least 3:1 on card, canvas, sunken and subtle:

| Fill     | Light min | Dark min |
| -------- | --------- | -------- |
| positive | 6.07      | 9.44     |
| warning  | 3.35      | 6.30     |
| danger   | 4.38      | 3.04     |
| info     | 4.93      | 5.24     |
| neutral  | 4.04      | 5.30     |

### Status fills and white text (primary.foreground)

`primary.foreground` is white in both themes. Measured ratios on `status.*.solid`:

| Fill                    | Light | Dark | May carry white text? |
| ----------------------- | ----- | ---- | --------------------- |
| `status.positive.solid` | 7.74  | 1.51 | Light only            |
| `status.warning.solid`  | 4.27  | 2.26 | Never                 |
| `status.danger.solid`   | 5.58  | 4.69 | Both                  |
| `status.info.solid`     | 6.29  | 2.72 | Light only            |
| `status.neutral.solid`  | 5.15  | 2.68 | Light only            |

`warning.solid` (both themes) and `positive`, `info`, `neutral` solids in dark must never carry white text. Use `status.*.bg` with `status.*.text` for labelled badges. The allowed pairs are `PRIMARY_FOREGROUND_OK`; the forbidden ones are asserted below 4.5 in the tests. `text.onContrast` is also asserted at 4.5:1 on `surface.contrast`, `surface.hero` and `status.danger.solid`.

## Visible changes for users (round 5)

- **Palette:** warm sand (light) and warm charcoal (dark) neutrals replace the cool ink-blue; the accent and focus ring are teal; links, selected states and primary buttons are teal.
- **Status colours:** positive is a leaf green clearly apart from the teal accent; info stays indigo; liabilities and debt are apricot.
- **Charts:** eight series tuned for colour-blind readers (see below); forecasts use a dashed brown (light) or pale apricot (dark) projection line and a teal band.
- **Hero:** a deep-teal headline block token (`surface.hero`) exists; screens adopt it in a later PR.
- **Unchanged here:** radii, shadows, fonts and every component.

## Font weights

The token scale stops at bold (700). Raw `fontWeight` usage above that, counted with grep over `apps` and `packages` (excluding generated output):

| Weight               | apps/web | apps/marketing | apps/mobile-companion | packages |
| -------------------- | -------- | -------------- | --------------------- | -------- |
| 800                  | 20       | 15             | 18                    | 11       |
| 900                  | 1        | 2              | 13                    | 0        |
| `extrabold` (string) | 0        | 3              | 0                     | 0        |
| `black`              | 0        | 0              | 0                     | 0        |

`apps/web/app/components/home/HomeHero.tsx:121` uses 900. Plus Jakarta Sans variable axis tops out at 800, so 900 clamps to 800 there (Inter does reach 900). Many 800 usages exist; web adoption should map them to `bold` (700) or add an explicit `extrabold` token rather than relying on clamping. Mobile-companion is React Native and unaffected by the web fonts.

### Colour-vision deficiency

Adjacent series pairs are checked with Machado full-severity protan, deutan and tritan simulation and CIE76 deltaE. Threshold: 15 (a just-noticeable difference is about 2.3, so this is roughly six JNDs). Measured minimum across adjacent pairs (series order: teal, sage, apricot, purple, rose, blue, olive-gold, grey):

| Theme | Protanopia       | Deuteranopia     | Tritanopia       |
| ----- | ---------------- | ---------------- | ---------------- |
| Light | 17.9 (series5-6) | 24.6 (series1-2) | 18.2 (series7-8) |
| Dark  | 16.1 (series1-2) | 18.8 (series1-2) | 21.8 (series1-2) |

Non-adjacent series (for example 3 and 7, both warm) can look alike under CVD; they are at least 15 apart under normal vision (tested). Charts must still add direct labels, markers or dashes so no pair relies on colour alone. `chart.projection` is at least 15 deltaE from every series under normal vision and is also drawn dashed.

## Round 5 palette (Direction C, shipped)

Source: the `--*` variables of `docs/design/e15/directions/c/index.html` (light `:root`, dark `[data-theme="dark"]`). Primitives: `sand` (replaces `ink`), `teal`, the warm `dark.*` set; `indigo` stays for `status.info` only. Component code is unchanged: semantic names are the same, plus the new `surface.hero`.

**Supersedes** the "Colour changes" and "Measured contrast" tables above for the colour values (they describe direction A). Contrast figures that matter are re-asserted by `tokens.a11y.test.ts`.

### Semantic table (light / dark)

| Token                                        | Light                                         | Dark                                          |
| -------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| `surface.canvas`                             | `#f5f1ea`                                     | `#1d1a17`                                     |
| `surface.card`                               | `#fffdf9`                                     | `#272320`                                     |
| `surface.sunken`                             | `#eae3d8`                                     | `#171412`                                     |
| `surface.subtle`                             | `#f0ebe2`                                     | `#2e2a26`                                     |
| `surface.overlay`                            | `#ffffff`                                     | `#36322d`                                     |
| `surface.contrast`                           | `#22302c`                                     | `#3a352f`                                     |
| `surface.hero` (new)                         | `#12483f`                                     | `#1b5448`                                     |
| `surface.scrim`                              | `rgba(43,38,32,.4)`                           | `rgba(8,6,4,.6)`                              |
| `text.primary` / `secondary` / `muted`       | `#2b2620` / `#564f46` / `#6a6258`             | `#f4efe7` / `#cbc3b7` / `#a59d90`             |
| `text.onContrast`                            | `#f6f1e8`                                     | `#fffdf9`                                     |
| `border` / `subtle` / `strong` / `input`     | `#dcd4c8` / `#e8e1d6` / `#b5ab9c` / `#867c6e` | `#3b362f` / `#302c27` / `#5c554a` / `#8f8678` |
| `border.focusRing`, `primary`                | `#0f6b5e`                                     | `#6fd0ba`                                     |
| `primary.solid`                              | `#0f6b5e`                                     | `#0f6b5e` (deep teal in both themes)          |
| `primary.hover`                              | `#0a564b`                                     | `#0a564b`                                     |
| `primary.subtle` / `border`                  | `#e1f0eb` / `#9ccfc2`                         | `#1e3b35` / `#2e6055`                         |
| `primary.foreground`                         | `#ffffff`                                     | `#ffffff`                                     |
| `status.positive` text / bg / border / solid | `#3e6b12` / `#eaf3da` / `#bcd68f` / `#3a5c08` | `#a8d86a` / `#2a3316` / `#4a6428` / `#c5de4c` |
| `status.warning`                             | `#8a4a08` / `#fcebd2` / `#ebc38a` / `#b06a10` | `#f2b873` / `#3b2c16` / `#6b4b1e` / `#e0a04a` |
| `status.danger`                              | `#a13a2b` / `#fbe5e0` / `#e8b0a4` / `#b64030` | `#f4a593` / `#3d221d` / `#74403a` / `#be5337` |
| `status.info` (indigo, unchanged)            | `#3730a3` / `#eef0ff` / `#c7c9f7` / `#4f46e5` | `#a5a8ff` / `#1b1e4a` / `#3b3f8f` / `#8f92ff` |
| `status.neutral`                             | `#564f46` / `#ece6dc` / `#c9c0b2` / `#766c5f` | `#cbc3b7` / `#2e2a26` / `#4a443b` / `#a59d90` |
| `chart.primary`, `series1`                   | `#0f6b5e`                                     | `#5cc4ae`                                     |
| `chart.wealth`, `series2`                    | `#64885c`                                     | `#9ad0a0`                                     |
| `chart.debt` (apricot), `series3`            | `#c26a18`                                     | `#eda45f`                                     |
| `chart.accentPurple`, `series4`              | `#7e67a8`                                     | `#a98fe0`                                     |
| `series5`                                    | `#b03f6a`                                     | `#e58aa2`                                     |
| `chart.accentCyan`, `series6`                | `#2f7fa0`                                     | `#6db5d6`                                     |
| `chart.warning`, `series7`                   | `#94750f`                                     | `#e3b452`                                     |
| `series8`                                    | `#7a7064`                                     | `#a59d90`                                     |
| `chart.projection` (dashed)                  | `#6b3f2a`                                     | `#ffd2a8`                                     |
| `chart.band` (teal alpha)                    | `rgba(15,107,94,.14)`                         | `rgba(92,196,174,.15)`                        |
| `chart.baseline`                             | `#867c6e`                                     | `#8f8678`                                     |
| `chart.grid`                                 | `rgba(43,38,32,.08)`                          | `rgba(244,239,231,.08)`                       |

### `surface.hero`

One deep-teal headline block per page (the headline figure). Text on it uses `text.onContrast`: 9.22:1 light, 8.58:1 dark (asserted at 4.5:1). The block is at least 1.5:1 against canvas and card and at least 20 deltaE from every page surface. Not for KPI cards, chart areas or full-page bands.

### Deviations from the mockup values (forced by the matrix, `KNOWN_FAILURES` stays empty)

- `primary` dark is the mockup's real `#6fd0ba`, not the plan's stand-in `#5cc4ae` (which is the mockup's dark `primary-solid`); `chart.primary` dark is `#5cc4ae`. `primary.solid` is deep teal in both themes (white on `#5cc4ae` is 2.11:1), so the mockup's dark `primary-solid` and `primary-foreground` (`#0c2823`) are not used.
- `surface.sunken` light `#eae3d8` (mockup `#ece6dc`): canvas, subtle and sunken were 1.8 to 2.3 deltaE apart; now every surface pair is at least 2.0. `border.input` light `#867c6e` (mockup `#8c8274` gave under 3:1 on the darker sunken). `surface.overlay` dark `#36322d` (mockup `#312d28` was 1.5 deltaE from subtle).
- Dark `surface.contrast` stays a dark fill (`#3a352f`), not the mockup's inverted light fill, because `text.onContrast` must be light on the dark `surface.hero`. Dark `text.onContrast` is `#fffdf9` (mockup `#1d1a17` is the inverted value): `status.danger.solid` dark has to be both at least 3:1 on `surface.subtle` and at least 4.5:1 under a light label, which only a near-white label allows (window of about 0.005 relative luminance, `#be5337`).
- Status solids: `warning.solid` light `#b06a10` (mockup `#c77a1b` under 3:1 on canvas, subtle, sunken), `danger.solid` light `#b64030` and dark `#be5337` (mockup values fail the onContrast and white-label pairs), `neutral.solid` light `#766c5f` (white label), `positive` is new (see below).
- Chart: `wealth` `#64885c` / `#9ad0a0` (mockup `#4a9a7c` was 2.7:1 on the darker sunken light surface, and the mockup dark `#93cba8` was 14.8 deltaE from primary); `debt` light `#c26a18` and `warning` `#94750f` to keep 3:1 on sunken; series4 to 6 reordered (purple, rose, blue) because purple next to blue collapses under protan simulation (11 deltaE); `chart.band` uses the mockup's alpha (.14 light, .15 dark). `chart.grid` is an alpha of the text colour (`rgba(43,38,32,.08)` light, `rgba(244,239,231,.08)` dark) instead of the mockup's opaque `#e6dfd3` / `#3a352e`, so it composites over any surface; on the card it lands within a few levels of the mockup hex. `chart.projection` is `#6b3f2a` / `#ffd2a8` (the mockup's `#9a5210` / `#f5b987` was 14.8 / 14.6 deltaE from `chart.debt`). `status.positive.solid` is `#3a5c08` / `#c5de4c`, chosen so it is at least 15 deltaE from primary and wealth under protan, deutan and tritan. The debt hue test now allows 25 to 50 degrees (apricot is about 29).

### Distinctness measurements (CIE76 deltaE unless stated)

| Pair                                                                          | Light                     | Dark                      |
| ----------------------------------------------------------------------------- | ------------------------- | ------------------------- |
| `chart.wealth` vs `chart.primary` (normal / protan / deutan / tritan)         | 24.3 / 22.3 / 24.6 / 18.5 | 19.5 / 16.1 / 18.8 / 21.8 |
| `status.positive.solid` vs `primary` (normal / protan / deutan / tritan)      | 39.6 / 40.4 / 38.9 / 17.4 | 64.6 / 67.7 / 64.2 / 38.6 |
| `status.positive.solid` vs `chart.wealth` (normal / protan / deutan / tritan) | 26.9 / 27.5 / 25.5 / 18.2 | 48.0 / 52.3 / 46.9 / 20.0 |
| `chart.projection` vs nearest series                                          | 25.7 (series8)            | 25.9 (series3)            |
| `chart.debt` vs `chart.primary`                                               | 81.9                      | 71.1                      |

`status.positive.solid` hue is about 80 degrees (leaf), `primary` about 170 (teal). Adjacent series pairs still clear the CVD threshold of 15 (existing test); all eight series are pairwise at least 15 under normal vision.

### Page surface separation

Every pair of canvas, card, sunken, subtle and overlay is at least 2.0 deltaE (about one just-noticeable difference) in both themes; light card and overlay (`#fffdf9` vs `#ffffff`) are the closest pair at 2.2, and rely on elevation for separation. Light surfaces are warm (red channel at least blue), as are dark.
