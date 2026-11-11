# FLUMP ARCHITECTURE, DESIGN SYSTEM & FILE STRUCTURE LAWS

## 1. COLOCATED COMPONENT DIRECTORY LAW (MANDATORY)

> **Detailed Reference**: Before creating or editing any component in `packages/ui`, `apps/web`, or `apps/marketing`, read [`docs/agents/component-guidelines.md`](./docs/agents/component-guidelines.md).

Never create standalone, flat `.tsx` component files. Every component in `packages/ui`, `apps/web/app/features/*/components`, and new feature sections/pages in `apps/marketing/src/{components|pages}` MUST live in its own PascalCase directory with colocated files:

- `ComponentName/ComponentName.tsx` (Component implementation)
- `ComponentName/ComponentName.styles.ts` (Panda CSS `cva` or `sva` recipes—no inline style soup)
- `ComponentName/ComponentName.stories.tsx` (Storybook 8 visual states + `play()` interaction test)
- `ComponentName/ComponentName.test.tsx` (Vitest unit test)
- `ComponentName/index.ts` (Barrel export)

## 2. DESIGN TOKEN & STYLING LAWS

- **Zero Raw Hex/RGB or Primitive Token Leaks:** Components may NEVER use hardcoded hex values (`#141A26`) or raw primitive scale tokens (`indigo.600`, `slate.800`, `success.500`, `purple.500`, `cyan.400`). Always use the 6 canonical semantic namespaces:
  - `surface.*` (`canvas`, `card`, `sunken`, `subtle`, `overlay`, `contrast`)
  - `text.*` (`primary`, `secondary`, `muted`, `onContrast`)
  - `border.*` (`DEFAULT`, `subtle`, `strong`, `input`, `focusRing`)
  - `primary.*` (`DEFAULT`, `hover`, `subtle`, `border`, `foreground`)
  - `status.{positive|warning|danger|info|neutral}.{text|bg|border|solid}`
  - `chart.*` (`primary`, `wealth`, `debt`, `warning`, `accentPurple`, `accentCyan`, `grid`, `series1`..`series5`)
- **Tabular Numbers on All Financial Data:** Every currency value, percentage, date, table cell, and slider badge MUST apply `fontVariantNumeric: 'tabular-nums'` (`tabular-nums`) and format numbers via standard UK formatting (`Intl.NumberFormat('en-GB')` / `useFormatCurrency()`).

## 3. PROGRESSIVE DISCLOSURE & LAYOUT LAWS

- **Single-Row KPI Strip:** Top-level page metrics must use `<KpiStrip>` (`lg:grid-cols-4` or `3`, max 4 items in a single horizontal row—never a tall 2x2 grid).
- **2-Column Simulator Split:** Any calculator or forecaster (`/debt`, `/mortgage`, `/pension`, `/forecast`) must use `<SimulatorSplitLayout>` (`lg:col-span-5` or `4` sticky left parameter controls + `lg:col-span-7` or `8` right visual chart & outcome cards). Never stack slider parameters full-width above the chart they control.
- **Compact Slider Inputs:** Always use `<SliderField>` (Label top-left, compact editable value pill top-right, slider below). Never render a full-width text input box below a slider.
- **No Uncollapsed Raw Schedules:** Any table exceeding 8 rows (Amortisation schedules, 12-month ledgers, multi-year tax tables) must live inside a `<CollapsibleDrawer>` or secondary tab.

## 4. DEFINITION OF DONE FOR ANY UI CHANGE

A component or page task is NOT complete until:

1. It follows the colocated directory structure.
2. It has a `.stories.tsx` file rendering in both Light and Dark mode with zero `@storybook/addon-a11y` violations.
3. Interactive states are covered by a `.test.tsx` or Storybook `play()` test.
4. `bun run lint`, `bun run check-types`, `bun run test`, and `bun run build` pass with zero errors.

## 5. MANDATORY CI PRE-FLIGHT LAW (BEFORE CREATING OR UPDATING A PR)

Before creating or pushing to any Pull Request, agents MUST run and verify all four CI checks locally:

1. `bun run lint` (zero Biome lint/format errors)
2. `bun run check-types` (zero TypeScript errors across all monorepo packages)
3. `bun run test` (100% passing tests across all packages)
4. `bun run build` (successful compilation across all packages and apps)

Never open, push, or ask the user to merge a PR without executing this exact 4-step sequence and confirming all checks pass with zero errors.

## 6. SUBAGENT MODEL LAW

When spawning any subagent (Agent/Task tool, workflows, parallel agents, or session forks that accept a model override), agents MUST set the model to `sonnet` or `haiku`. The only exception is planning: `opus` is allowed for subagents whose sole job is producing an implementation plan. Never use `fable`, never use `opus` for anything other than planning, and never leave the model to inherit from the parent session.

- Use `haiku` for read-only search, exploration, and simple mechanical tasks.
- Use `sonnet` for implementation, code review, and anything else requiring reasoning.
- Use `opus` only for planning (designing implementation plans, architectural trade-offs). Planning subagents must stay read-only.

Enforcement lives in `.claude/`:

- `.claude/agents/explorer.md` (`model: haiku`, read-only tools) — prefer this for search and exploration.
- `.claude/agents/implementer.md` (`model: sonnet`) — prefer this for writing code and review.
- `.claude/agents/planner.md` (`model: opus`, read-only tools) — prefer this over the built-in `Plan` agent for planning.
- `.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` as the default for any subagent (including built-ins such as `Explore`, `Plan`, `general-purpose`) that has no model of its own.

A per-spawn `model` parameter overrides both frontmatter and the default, so only pass `opus` there for planning, and never pass `fable`. In workflow scripts, every `agent()` call must pass `model: 'sonnet'` or `model: 'haiku'` (or `'opus'` for a planning stage), or use `agentType: 'explorer' | 'implementer' | 'planner'` — never omit both.
