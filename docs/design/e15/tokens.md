# E15 design tokens: architecture note

Scope: `packages/ui/src/tokens/` and `packages/ui/panda.preset.ts`. Direction: A "Calm ledger" (indigo kept, cool ink-blue neutrals), with B's compact density available for simulators, tables and account lists. System theme is the default; `data-theme="light|dark"` overrides.

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

Three roles, defined once in `fontFamilies` (`typography.ts`): `fonts.body`, `fonts.heading`, `fonts.numeric` (aliases body). Legacy `fonts.sans`, `fonts.display`, `fonts.mono` remain. The owner has not picked a typeface; Inter (body/numeric) and Plus Jakarta Sans (heading) are kept.

Self-hosting: `@fontsource-variable/{inter,plus-jakarta-sans,jetbrains-mono}` (pinned 5.3.0) are dependencies of `packages/ui`, loaded by `packages/ui/src/fonts/fonts.css` (weight axis only, `font-display: swap`) and exported as `@repo/ui/fonts.css`. Apps adopt it in the later web-adoption task: add `import "@repo/ui/fonts.css";` to the root, and delete the Google Fonts `<link>` tags. Nothing is changed in `apps/web` or `apps/marketing` yet.

**Swap procedure:** (1) edit the relevant entry in `fontFamilies` in `typography.ts`; (2) change the matching `@import` in `fonts.css` and the dependency in `packages/ui/package.json`. Run `bun run --cwd packages/ui generate`.

## textStyles

`display`, `heading.{xl,lg,md,sm}`, `body.{lg,md,sm}`, `label.{md,sm}`, `numeric.{kpi,lg,md,sm}`. Rules (enforced by tests): 12px minimum, line heights 1.2 to 1.6, fluid `clamp()` only on `display` and `heading.xl`, numeric styles always `tabular-nums`, display/headings use the heading face and the rest use the body face.

## Motion and elevation

Durations: instant 0ms, fast 120ms, base 200ms, slow 320ms. Easings: standard, enter, exit. Keyframes: `fadeIn`, `slideUp`, `scaleIn`, `shimmer`. z-index: base 0, sticky 10, header 20, dropdown 30, overlay 40, modal 50, toast 60.

Elevation keys `xs`, `card`, `raised`, `overlay`, `focus`, all with `_dark` (lighter surface plus a hairline inset highlight, black shadow alpha at most 0.4). `cardHover` and `floating` remain as aliases. The primitive `shadows.xs` moved into the semantic set (same name, now themed).

## Colour changes

New primitive `ink` scale (cool ink-blue). `surface.*`, `text.*`, `border.*` and neutral status now map to it; `slate` is kept for compatibility. `primary` light stays `#4f46e5`; dark primary and focus ring are `#a5a8ff`; `primary.solid`/`primary.hover` unchanged (white label stays AA). Status and chart values were refined from direction A and kept only where the matrix passes. Liabilities in charts use amber (`chart.debt`), not red.

Deviations from the mockup values, forced by the contrast matrix: `border.input` light is `#7d849c` (mockup `#858ca4` measured 2.98:1 on sunken and 2.88:1 on subtle, below 3:1); `status.danger.solid` light is `#d42a1e` (mockup `#d92d20` gave 4.44:1 for `text.onContrast` against 4.5:1); dark `text.onContrast` stays `#f8fafc` (an `#eceff9` label on the dark danger fill was 4.2:1). Dark `surface.contrast` stays a dark fill (`#222b47`) rather than mockup A's inverted light fill, to keep consumers of `text.onContrast` safe.

### New keys

| Key                | Light                  | Dark                     | Notes                                                                                                                                             |
| ------------------ | ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `surface.scrim`    | `rgba(20,23,43,0.4)`   | `rgba(5,8,16,0.6)`       | Backdrop, never a text surface. Composited over card: dims by 2.5:1 light, 1.1:1 dark (dark modals also rely on `surface.overlay` and elevation). |
| `chart.series6`    | `#a21caf`              | `#e468f5`                |                                                                                                                                                   |
| `chart.series7`    | `#c2410c`              | `#f0883e`                | Same value as `chart.warning`.                                                                                                                    |
| `chart.series8`    | `#64708f`              | `#8f9bbd`                |                                                                                                                                                   |
| `chart.projection` | `#5d647c`              | `#98a0ba`                | Forecast line: draw dashed.                                                                                                                       |
| `chart.band`       | `rgba(79,70,229,0.14)` | `rgba(143,146,255,0.18)` | Fill behind lines only. Composited difference from card at least 1.1:1; `chart.primary` line stays at least 3:1 on the composited band.           |
| `chart.baseline`   | `#7d849c`              | `#6b7699`                | Reference lines.                                                                                                                                  |

`chart.series1..5`, `primary`, `wealth`, `debt` (amber), `warning` (orange) and the accents also changed values; see the table.

### Measured contrast (WCAG ratios; graphics need 3:1)

| Key              | Light min (card, canvas) | Light min (all 5 surfaces) | Dark min (card, canvas) | Dark min (all 5 surfaces) |
| ---------------- | ------------------------ | -------------------------- | ----------------------- | ------------------------- |
| chart.series1    | 5.92                     | 5.43                       | 6.37                    | 5.81                      |
| chart.series2    | 4.06                     | 3.73                       | 8.27                    | 7.53                      |
| chart.series3    | 3.43                     | 3.14                       | 8.13                    | 7.41                      |
| chart.series4    | 4.54                     | 4.16                       | 7.60                    | 6.93                      |
| chart.series5    | 5.05                     | 4.62                       | 8.41                    | 7.66                      |
| chart.series6    | 5.95                     | 5.46                       | 6.27                    | 5.71                      |
| chart.series7    | 4.88                     | 4.47                       | 6.85                    | 6.24                      |
| chart.series8    | 4.65                     | 4.26                       | 6.26                    | 5.71                      |
| chart.primary    | 5.92                     | 5.43                       | 6.37                    | 5.81                      |
| chart.wealth     | 4.06                     | 3.73                       | 8.27                    | 7.53                      |
| chart.debt       | 3.43                     | 3.14                       | 8.13                    | 7.41                      |
| chart.warning    | 4.88                     | 4.47                       | 6.85                    | 6.24                      |
| chart.projection | 5.52                     | 5.06                       | 6.66                    | 6.07                      |
| chart.baseline   | 3.50                     | 3.21                       | 3.86                    | 3.52                      |

"All 5 surfaces" is card, canvas, sunken, subtle, overlay. The E8 light gap for chart warning/series5 on sunken and subtle is closed; `KNOWN_FAILURES` is now empty. Dark surface steps: canvas to card to overlay each at least 1.05:1 (sunken is a deliberate recess).

### Colour-vision deficiency

Adjacent series pairs are checked with Machado full-severity protan, deutan and tritan simulation and CIE76 deltaE. Threshold: 15 (a just-noticeable difference is about 2.3, so this is roughly six JNDs, enough to tell two thin lines apart). Measured minimum across adjacent pairs:

| Theme | Protanopia       | Deuteranopia     | Tritanopia       |
| ----- | ---------------- | ---------------- | ---------------- |
| Light | 39.3 (series5-6) | 17.6 (series5-6) | 28.3 (series4-5) |
| Dark  | 27.0 (series4-5) | 17.9 (series4-5) | 27.7 (series6-7) |

Non-adjacent series (for example 3 and 7, both warm) can look alike under CVD. Charts must still add direct labels, markers or dashes, so no pair relies on colour alone. `chart.projection` is only distinguished from `series8` by being dashed.
