# One Flump on every platform

Status: adopted 2026-11-14. Applies to `apps/marketing`, `apps/web` and the future `apps/mobile` (the Expo rebuild planned in [`docs/audit/plans/E12-mobile-rebuild-plan.md`](../audit/plans/E12-mobile-rebuild-plan.md)).

A person who reads the marketing site, signs up on the web and later installs the app should feel they are in one product. This document says what makes that true: what is shared, how it reaches each platform, where platforms differ on purpose, and how to check a new screen. The look is in [STYLE-GUIDE.md](./STYLE-GUIDE.md), the behaviour in [UX-GUIDELINES.md](./UX-GUIDELINES.md), the evidence in [RESEARCH-2026-11.md](./RESEARCH-2026-11.md) (last two sections).

Rules end with **Enforced by**, **Proposed check** or **Review only**, as in the other two documents.

## 1. The model: share decisions, not code

Mature multi-platform design systems (Fluent, Spectrum, Polaris, Primer) share **tokens** and **specifications** and build components natively per platform. They do not share component code between web and native. We do the same.

| Layer                                                                           | Shared across all three?                            | How                                                                                                  |
| ------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Design tokens (colour, type, spacing, radius, elevation, motion, chart palette) | Yes, one source                                     | `packages/ui/src/tokens` today, moving to `@flump/tokens` (section 2)                                |
| Money maths                                                                     | Yes, one source                                     | `@flump/finance-engine`. No arithmetic on money in any app                                           |
| Number, currency and date formatting                                            | Yes, one source                                     | Web: `useFormatCurrency` and `Money`. Planned `@flump/format` for all three                          |
| API types and validation                                                        | Yes, one source                                     | `@flump/api-contract`                                                                                |
| Navigation structure and names                                                  | Yes, one source                                     | `navConfig.ts`, to be read by mobile (section 4)                                                     |
| Component specifications (name, anatomy, variants, states, rules)               | Yes, one specification                              | STYLE-GUIDE section 12 and Storybook; the parity matrix in section 3                                 |
| Words                                                                           | Yes, one guide                                      | The copy guide; shared string constants for fixed notices (`PROJECTION_NOTICE_TEXT`)                 |
| Icons, illustrations, logo                                                      | Yes, one set of artwork                             | Lucide; SVG scenes; the blob (section 6)                                                             |
| Component code and Panda recipes                                                | Marketing and web share `@repo/ui`. Mobile does not | Panda recipes cannot run on React Native. Mobile builds its own components to the same specification |
| Page layouts                                                                    | No                                                  | Each platform lays out for its own screen and conventions                                            |

**X1.** Marketing and web import every shared component from `@repo/ui`; neither keeps a private copy of a listed component. **Enforced by** `chrome-parity.laws.test.ts` (chrome) and `architecture.laws.test.ts` (`FLP*` baseline, polish PR 1). **X2.** Mobile imports no web component code and no `@repo/ui`. **Proposed check** (import rule in the mobile lint config).

## 2. The token pipeline

### Recommendation

Keep the TypeScript token files as the only authored source, generate a plain native theme from them with a small script, and prove the two outputs agree with a contract test. This confirms option (d) in E12 section 2.11 and adds the contract test and the scope below.

```text
packages/tokens/src/*.ts            authored source (moved from packages/ui/src/tokens; ui re-exports)
        |                    \
        | Panda preset        \ build-native-tokens.ts (Bun, no new dependency)
        v                      v
styled-system (web, marketing)   packages/tokens/native.generated.ts (committed, never hand-edited)
        |                                   |
        | panda codegen --spec              |
        v                                   v
design-system.json   <--- contract test --->   light and dark theme objects
```

1. **Source.** `@flump/tokens` holds what `packages/ui/src/tokens` holds today: primitives, the six semantic namespaces with `{ base, _dark }` values, text styles, spacing, radii, elevation, motion, z-index, breakpoints. `@repo/ui` re-exports it, so no web import changes. Web and marketing consume it through the Panda preset exactly as now.
2. **Generate.** `packages/tokens/scripts/build-native-tokens.ts` resolves every semantic token to a concrete value per theme and writes `native.generated.ts`, exported as `@flump/tokens/native`: two objects, `light` and `dark`, with identical keys. Run by a Turbo `generate:tokens` task. The output is committed; CI regenerates and fails on a diff.
3. **Consume.** The mobile `ThemeProvider` exposes the object through `useTheme()`. Styling is React Native `StyleSheet` with that theme (or Unistyles 3 on the same object if the E12 spike prefers it; it takes a plain theme object and switches light and dark natively). No NativeWind, Tamagui or react-native-web: they add a second styling system for no shared code.
4. **Check.** A Vitest contract test reads Panda's own export (`panda codegen --spec`, which writes the resolved design system to JSON; confirmed available in the pinned Panda 2.5.0) and the generated native theme, and asserts every semantic path exists in both with the same resolved value in both themes. The existing contrast matrix (`tokens.a11y.test.ts`) also runs against the generated values.

### What the generator must translate

| Token kind                                            | Web value                                | Native value                                                                                                                             |
| ----------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Colours                                               | CSS variable per theme                   | Hex or `rgba()` string per theme. Alpha tokens (`chart.band`, `chart.grid`, `surface.scrim`) keep their alpha                            |
| Spacing, radii, sizes                                 | `px` strings                             | Unitless numbers (1px is 1pt and 1dp)                                                                                                    |
| Font sizes                                            | `rem`                                    | Numbers at 16 per rem; the platform's font scale multiplies them                                                                         |
| Fluid sizes (`display`, `heading.xl`, `numeric.hero`) | `clamp()`                                | The minimum and maximum as two numbers; mobile uses the minimum on phones and the maximum on tablets                                     |
| Font weights                                          | `"600"`                                  | String weights mapped to the bundled font files                                                                                          |
| Line heights                                          | Unitless ratio                           | Absolute number (ratio times size)                                                                                                       |
| Letter spacing                                        | `em`                                     | Number (em times size)                                                                                                                   |
| Text styles                                           | Panda `textStyle`                        | One object per style, with `fontVariant: ['tabular-nums']` on every numeric style                                                        |
| Elevation                                             | `box-shadow` strings with a dark variant | `boxShadow` on the New Architecture; the dark hairline becomes a 1px border in `border.subtle`. Four levels only (STYLE-GUIDE section 6) |
| Motion                                                | Duration strings, cubic-bezier strings   | Milliseconds as numbers; bezier control points as four numbers for Reanimated                                                            |
| Density (`_compact`)                                  | Condition                                | Not generated. Mobile is always comfortable density                                                                                      |
| Breakpoints                                           | `rem`                                    | Numbers; mobile uses 600 and 840 as its phone and tablet steps                                                                           |

### Why not Style Dictionary or DTCG now

- The W3C Design Tokens format reached its first stable version in October 2025 (Format, Color and Resolver modules), but it is a community group report, and light and dark are expressed through the Resolver module. Style Dictionary 5 reads the format but does not support resolvers or ship a React Native output; Terrazzo does support resolvers.
- Making JSON the authored source would mean rewriting the Panda preset to read it and losing typed tokens in the editor, for no gain while there is no design tool in the loop. Our tokens are authored in code and tested in code.
- **When that changes** (a designer adopts Figma variables, or a second non-TypeScript consumer appears): emit DTCG JSON with a resolver file from the same TypeScript source as a third output, and process it with Terrazzo. DTCG never becomes the authored source.

**X3.** One authored token source. No platform defines a colour, size, radius, shadow or duration of its own. **Enforced by** `check-design-tokens.ts` (web, marketing); **Proposed check**: extend it to scan `apps/mobile/**` for colour literals. **X4.** The generated native theme is in step with the source and equal to the web values. **Proposed check**: the regenerate-and-diff CI step and the contract test above. **X5.** No token name encodes a theme or platform (`surface.card`, never `surface.card.dark` or `ios.card`). **Enforced by** `tokens.foundations.test.ts` (every key has both themes).

## 3. Component parity matrix

"Mobile equivalent" is the component the Expo app builds to the same specification. Names match so that a specification, a story and a test can be found by the same word on every platform. Status today: marketing and web columns are live; the mobile column is the requirement for E12.

| Component                                             | Web                       | Marketing                         | Mobile equivalent                                                 | Intended differences                                                                                                                                   |
| ----------------------------------------------------- | ------------------------- | --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                                              | `@repo/ui`                | `@repo/ui`                        | `Button`, same variants and sizes                                 | Mobile: 48 high at minimum; platform press feedback (ripple on Android, opacity on iOS); light haptic on a successful primary action                   |
| `TextInput`, `FormField`                              | `@repo/ui`                | `@repo/ui` (contact)              | `FormField` wrapping the native text input                        | Mobile: native keyboard, return-key moves to the next field                                                                                            |
| `CurrencyInput`, `PercentInput`                       | `@repo/ui`                | In calculators                    | Same names                                                        | Mobile: decimal pad keyboard; same parsing and formatting from `@flump/format`                                                                         |
| `Select`                                              | `@repo/ui`                | In calculators                    | `Select`                                                          | Mobile: opens a bottom sheet list (Android) or the native menu or picker (iOS), not a custom dropdown                                                  |
| `SliderField`                                         | `@repo/ui`                | In calculators                    | `SliderField` with the editable value                             | Mobile: native slider with `adjustable` role and increment and decrement actions; value text always editable                                           |
| `Checkbox`, `Switch`, `RadioCardGroup`                | `@repo/ui`                | Rare                              | Same names                                                        | Mobile: the platform's own switch; our colours                                                                                                         |
| `Card`                                                | `@repo/ui`                | `@repo/ui`                        | `Card`                                                            | None                                                                                                                                                   |
| `HeroFigure`                                          | `@repo/ui` (polish PR 2)  | Preview on home                   | `HeroFigure`                                                      | None. One per screen everywhere                                                                                                                        |
| `KpiCard`, `KpiStrip`                                 | `@repo/ui`                | Preview on home                   | Same names                                                        | Mobile: two-column grid or a horizontally paged row; never more than 4                                                                                 |
| `Money`                                               | `@repo/ui`                | `@repo/ui`                        | `Money`                                                           | None. Same formatting, same spoken text ("minus £1,234")                                                                                               |
| `Tabs` (segmented)                                    | `@repo/ui`                | Rare                              | `Tabs`                                                            | iOS may use the system segmented control with our colours; same 4-item limit                                                                           |
| `StatusBadge`, `InlineAlert`                          | `@repo/ui`                | `@repo/ui`                        | Same names                                                        | None                                                                                                                                                   |
| `ProjectionNotice`                                    | `@repo/ui`                | Tool pages                        | `ProjectionNotice`                                                | None. Same fixed text from `@flump/finance-engine`                                                                                                     |
| `ScenarioZone`                                        | `@repo/ui`                | Tool pages (the tool is the zone) | `ScenarioZone`                                                    | Mobile: may open as its own pushed screen from "Model a change", still labelled "Illustration, not saved"; the saved figures stay on the parent screen |
| `SimulatorSplitLayout`                                | `@repo/ui`                | Tool pages                        | None on phones                                                    | Phones: inputs then outcome in one column, outcome figure pinned. Tablets: the split                                                                   |
| `ChartFigure` and charts                              | `@repo/ui` with recharts  | Tool pages                        | `ChartFigure` with `react-native-svg` and `d3-shape` (E12 2.6)    | Same summary sentence, same "Show data" table, same `chart.*` colours and dashes. Mobile: tap to select with a fixed readout; no hover                 |
| `Table`, `DataList`                                   | `@repo/ui`                | Rare                              | `DataList` only                                                   | Mobile has no grid tables: rows of label and one figure                                                                                                |
| `CollapsibleDrawer`                                   | `@repo/ui`                | FAQ                               | `CollapsibleDrawer`                                               | None                                                                                                                                                   |
| `Dialog`                                              | `@repo/ui`                | Rare                              | Platform alert for short confirmations; a modal screen for forms  | Mobile uses native presentation                                                                                                                        |
| `Sheet`                                               | `@repo/ui`                | None                              | Native bottom sheet with detents                                  | Mobile: system drag-to-dismiss, with a visible close button as well                                                                                    |
| `ConfirmDialog`                                       | `@repo/ui`                | None                              | `ConfirmDialog`                                                   | iOS: action sheet or alert with the destructive role; Android: Material dialog. Same title, consequence and button label                               |
| `Toast`                                               | `@repo/ui`                | None                              | `Toast`                                                           | Mobile: above the tab bar, announced to the screen reader                                                                                              |
| `EmptyState`                                          | `@repo/ui`                | 404                               | `EmptyState`                                                      | None. Same illustration, sentence and one button                                                                                                       |
| `Skeleton`, `PageSkeleton`                            | `@repo/ui`                | None                              | Same names                                                        | None                                                                                                                                                   |
| `Icon`, `IconTile`                                    | `@repo/ui` (Lucide)       | `@repo/ui`                        | Same names (`lucide-react-native`)                                | Mobile may use the platform's own glyph for back, share and close only                                                                                 |
| `Illustration`                                        | `@repo/ui`                | `@repo/ui`                        | `Illustration` from the same SVG scenes                           | None                                                                                                                                                   |
| `FlumpLogo`, `HomeLogo`                               | `@repo/ui`                | `@repo/ui`                        | `FlumpLogo`; the app icon from the same artwork                   | App icon follows each store's shape and safe-zone rules                                                                                                |
| `TopBar`                                              | `@repo/ui`                | `@repo/ui`                        | Native stack header                                               | Title alignment and back affordance follow the platform                                                                                                |
| `MobileBottomBar`                                     | `@repo/ui` (below 1024px) | None                              | Native tab bar                                                    | Same five entries, names, order and icons. Platform material and height                                                                                |
| `NavDrawer`, `SideNav`                                | `@repo/ui`                | `@repo/ui` (drawer)               | The "More" screen: a plain list                                   | No drawer on mobile                                                                                                                                    |
| `SiteFooter`                                          | `@repo/ui`                | `@repo/ui`                        | None                                                              | Legal, help and contact links live in the "More" screen and in settings                                                                                |
| `ThemeToggle`                                         | `@repo/ui`                | `@repo/ui`                        | A setting: System, Light, Dark                                    | Mobile follows the system by default, as the web does                                                                                                  |
| `PageHeader`, `PageBody`                              | `@repo/ui`                | Own section layout                | A screen template with the same order of regions                  | Gutters 16 on phones                                                                                                                                   |
| Marketing sections (hero, feature rows, FAQ, pricing) | None                      | `apps/marketing`                  | None                                                              | Marketing only. Built from the same tokens, `Card`, `Button`, `IconTile` and real product components for any product preview                           |
| Calculators (`packages/ui/src/calculators`)           | `/tools`                  | `/tools`                          | The same tools, as native screens calling `@flump/finance-engine` | One catalogue for all three (polish PR 11 for web and marketing)                                                                                       |

**X6.** A component that exists on two platforms has the same name, the same variant and tone names, and the same states. **Proposed check**: keep this matrix as data (`docs/ux/parity.json` or a TypeScript table) and test that each named component exists where the matrix says it does. **Review only** until mobile exists. **X7.** A product preview on the marketing site is built from the real components with sample data, not redrawn. **Review only**; polish PR 12.

## 4. What must be identical

These are what make it feel like one product. Any difference here is a defect.

| Thing                       | Rule                                                                                                                                        | Check                                                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names and order of sections | Home, Accounts, Budget, Tax and pay, More (then Savings, Pension, Debt, Mortgage, and the rest), from one source                            | **Proposed check**: mobile reads the same navigation data as web, with a test                                                                                                                                                     |
| Figures                     | The same input gives the same figure on every platform, from `@flump/finance-engine`. No platform rounds, floors or recalculates on its own | **Enforced by** engine tests; E12's CI check for tax literals outside the engine                                                                                                                                                  |
| Formatting                  | `£1,234`, `-£1,234`, `12.5%`, `Mar 2030`, `3 years 4 months`, "Not set". Tabular numerals everywhere                                        | **Enforced by** `check-tabular-nums.ts` (web, marketing). **Proposed check**: `@flump/format` snapshot tests run on web, iOS and Android engines, because Hermes uses each platform's own number formatting and output can differ |
| Colour meaning              | Teal is the accent, apricot is debt, red is only an error or a destructive action, in both themes                                           | **Enforced by** tokens; **Review only** for use                                                                                                                                                                                   |
| Typography                  | The same two families and the same text styles                                                                                              | **Proposed check**: generated native text styles in the contract test                                                                                                                                                             |
| Saved versus scenario       | Headlines from saved data; what-ifs labelled "Illustration, not saved"; no apply                                                            | **Enforced by** per-page tests on web; **Proposed check**: the same test per mobile screen                                                                                                                                        |
| Notices and regulated text  | The same fixed sentences from one constant; one notice per screen                                                                           | **Enforced by** notice tests on web; shared constant on mobile                                                                                                                                                                    |
| States                      | Every screen has the same empty, loading, error and "Not set" treatments and wording                                                        | **Review only**                                                                                                                                                                                                                   |
| Number budget               | The same headline figure for a section on every platform, and no more figures on a phone than the web shows at 375                          | **Review only**                                                                                                                                                                                                                   |
| Charts                      | The same form, colours, dashes, summary sentence and data table for the same data                                                           | **Review only**                                                                                                                                                                                                                   |
| Theme                       | Light and dark both supported, following the system by default                                                                              | **Review only**                                                                                                                                                                                                                   |
| Accessibility target        | WCAG 2.2 AA on all three                                                                                                                    | See UX-GUIDELINES section 10                                                                                                                                                                                                      |

## 5. What differs on purpose

We follow each platform's conventions for chrome and input, because people bring habits from every other app on their device. Brand lives in content (cards, the hero, charts, type), not in system bars.

| Area                     | Web and marketing                           | iOS                                                                                                | Android                                                                   |
| ------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Back                     | Browser back; breadcrumbs on tool pages     | Edge swipe and the header back button. Never blocked                                               | System back with predictive back. Never blocked                           |
| Primary navigation       | Top bar from 1024px; bottom bar below       | Tab bar. "More" is an ordinary fifth tab that opens our own list screen, not the system overflow   | Navigation bar on phones; navigation rail from 600dp wide                 |
| Screen edges             | Safe-area insets on fixed bars              | Safe areas; system materials on bars and sheets, never behind figures                              | Edge to edge (required from Android 15); insets handled on every screen   |
| Modal content            | `Dialog` on desktop, `Sheet` on phones      | Sheets with detents; alerts for short confirmations                                                | Bottom sheets; Material dialogs                                           |
| Destructive confirmation | `ConfirmDialog`                             | Action sheet or alert, destructive role                                                            | Dialog, destructive text button                                           |
| Button order in dialogs  | Cancel left, action right                   | Platform order                                                                                     | Platform order                                                            |
| Pickers                  | Our `Select`; typed dates                   | Native menus, wheels or pickers                                                                    | Native pickers                                                            |
| Touch target             | 44px on touch, 24px floor with a pointer    | 44pt                                                                                               | 48dp                                                                      |
| Text size                | Follows the browser setting (rem)           | Follows Dynamic Type up to the largest accessibility size; the brand fonts scale like system fonts | Follows the system font scale to 200%                                     |
| Type on system chrome    | Ours                                        | System font on system bars and alerts; ours in content                                             | Same                                                                      |
| Feedback                 | Visual and announced                        | Plus light haptics on success, selection and error                                                 | Plus haptics where the device supports them                               |
| Pull to refresh          | No                                          | Yes, on screens that show saved data                                                               | Yes                                                                       |
| Hover                    | Hover states where a pointer exists         | None                                                                                               | None                                                                      |
| Density                  | Compact available for pointer-driven tables | Comfortable only                                                                                   | Comfortable only                                                          |
| Offline                  | Error state with retry                      | Read-only cached data, labelled with its age (E12 2.8)                                             | Same                                                                      |
| Sign-in                  | WorkOS hosted pages                         | WorkOS in the system browser sheet; optional device lock                                           | Same                                                                      |
| Dynamic colour           | n/a                                         | n/a                                                                                                | Not adopted: wallpaper colour never drives brand, status or chart colours |
| Marketing                | Long-form pages, SEO, the calculators       | Not in the app                                                                                     | Not in the app                                                            |

**X8.** A platform difference not in this table is either added here with a reason or removed. **Review only**. **X9.** The mobile app offers more than the website in a wrapper (native navigation, offline reading, device lock) and includes in-app account deletion; both stores require it. **Review only** (store review).

## 6. Shared assets

| Asset         | Source                                                                 | Web and marketing             | Mobile                                                                                 |
| ------------- | ---------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| Icons         | Lucide, one pinned version in all workspaces                           | `lucide-react` through `Icon` | `lucide-react-native` through `Icon`; same names, stroke 1.75, sizes 16, 20, 24        |
| Fonts         | Inter and Plus Jakarta Sans, variable, self-hosted                     | `@repo/ui/fonts.css`          | The same files bundled with `expo-font`; never disable font scaling on text or figures |
| Illustrations | The SVG scenes in the `Illustration` primitive, drawn in token colours | Inline SVG                    | The same paths through `react-native-svg`, coloured from the theme                     |
| Logo          | The `FlumpLogo` artwork                                                | Inline SVG                    | `react-native-svg`; app icon and splash exported from the same artwork                 |
| Chart palette | `chart.*` tokens                                                       | `chartColor()`                | The generated theme                                                                    |
| Fixed strings | `@flump/finance-engine` constants and the copy guide                   | Imported                      | Imported                                                                               |

**X10.** Dependency versions shared by workspaces match (`lucide`, React). **Enforced by** `scripts/check-dependency-versions.ts`.

## 7. Parity checklist for any new screen or component

Run this before opening a PR that adds or changes a screen on any platform. A "no" needs either a fix or a line in section 5.

**Structure**

- [ ] Does the screen exist, or is it planned, on the other platforms under the same name and in the same place in the navigation?
- [ ] Does it answer the same question with the same headline figure as its counterpart?
- [ ] Is the order of regions the same (header, headline, key figures, your details, scenario, detail)?

**Look**

- [ ] Are all colours, sizes, radii, shadows and durations from tokens, with no literal values?
- [ ] Does it work in light and dark?
- [ ] Does every component used appear in the parity matrix, with the same variant names?

**Figures and words**

- [ ] Do the figures come from `@flump/finance-engine` and the shared formatter, and match the other platforms for the same test persona?
- [ ] Are labels, notices and state messages the same strings as the counterpart screen?
- [ ] Are saved figures and scenario figures separated the same way?

**States**

- [ ] Are empty, loading, error, partial ("Not set") and offline states designed and the same in meaning as the counterpart?

**Platform**

- [ ] Does it follow section 5 for back, navigation, modals, pickers and targets on this platform?
- [ ] Does it work at the largest text size and the narrowest supported width (320px on web and phones)?
- [ ] Does it work with the platform's screen reader and without drag, hover or colour as the only cue?

**Record**

- [ ] If a new shared component or token was needed, was it added to the source (`@flump/tokens`, STYLE-GUIDE section 12, the parity matrix) and not only to this platform?

## 8. Proposed parity checks (not built)

| Check                 | What it does                                                                                             | Where                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Token generation diff | Regenerates the native theme in CI; fails on a diff                                                      | `packages/tokens`, Turbo `generate:tokens` |
| Token contract test   | Panda spec export and native theme have the same semantic paths and values, light and dark               | `packages/tokens` (Vitest)                 |
| Native contrast       | Runs the existing contrast matrix on the generated values                                                | `packages/tokens`                          |
| Native literal scan   | Extends `check-design-tokens.ts` and `check-tabular-nums.ts` to `apps/mobile`                            | `scripts/`                                 |
| Formatter snapshots   | The same inputs give the same strings on V8 (web), Hermes iOS and Hermes Android                         | `packages/format`                          |
| Navigation parity     | Mobile tab and "More" entries equal the web navigation data                                              | `apps/mobile` test                         |
| Parity matrix test    | The matrix as data; each component exists where the matrix says                                          | `docs/ux` data plus a Vitest test          |
| Mobile screenshots    | Maestro captures the same personas and screens as the web sweep, light and dark, for side-by-side review | `apps/mobile` e2e, advisory                |
| Mobile accessibility  | Per-milestone exit check from E12 5.1 (font scale 200%, 320pt width, VoiceOver, TalkBack)                | E12                                        |
