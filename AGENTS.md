# FLUMP ARCHITECTURE, DESIGN SYSTEM & FILE STRUCTURE LAWS

## 1. COLOCATED COMPONENT DIRECTORY LAW (MANDATORY)

> **Detailed Reference**: Before creating or editing any component in `packages/ui`, `apps/web`, or `apps/marketing`, read [`docs/agents/component-guidelines.md`](./docs/agents/component-guidelines.md).

Never create standalone, flat `.tsx` component files. Every component in `packages/ui`, `apps/web/app/features/*/components`, and new feature sections/pages in `apps/marketing/src/{components|pages}` MUST live in its own PascalCase directory with colocated files. The required set depends on where the component lives (E15 decision D3-C):

- **`packages/ui` and shared components** (anything imported by more than one feature or app): all five files.
- **Feature-internal components** (new components in `apps/web/app/features/<domain>/components/*` used only inside that feature): `ComponentName.tsx`, `ComponentName.styles.ts`, `ComponentName.test.tsx` and `index.ts`. A `ComponentName.stories.tsx` is required only if the component is interactive and not already covered by a story or test of its parent; promote it to the full five files when a second feature imports it. This relaxation takes effect as the E15 phase 3 web adoption lands; until then `architecture.laws.test.ts` still enforces all five files for every directory it lists (debt, sandbox, ai-connections, feedback, calculators, patterns, primitives, marketing), and that test is not loosened by this edit.

The five files:

- `ComponentName/ComponentName.tsx` (Component implementation)
- `ComponentName/ComponentName.styles.ts` (Panda CSS `cva` or `sva` recipes—no inline style soup)
- `ComponentName/ComponentName.stories.tsx` (Storybook 8 visual states + `play()` interaction test)
- `ComponentName/ComponentName.test.tsx` (Vitest unit test)
- `ComponentName/index.ts` (Barrel export)

Direction of travel (E15 phase 3 target, not yet enforced): web pages move from the legacy `FLP*` layer and inline styles to `@repo/ui` primitives and patterns.

## 2. DESIGN TOKEN & STYLING LAWS

- **Zero Raw Hex/RGB or Primitive Token Leaks:** Components may NEVER use hardcoded hex values (`#141A26`) or raw primitive scale tokens (`indigo.600`, `slate.800`, `success.500`, `purple.500`, `cyan.400`). Always use the 6 canonical semantic namespaces:
  - `surface.*` (`canvas`, `card`, `sunken`, `subtle`, `overlay`, `contrast`, `scrim`, `hero`; `scrim` is a modal backdrop, never a text surface; `hero` is the single deep-teal headline block per page, added by DECISIONS round 5, text on it uses `text.onContrast`)
  - `text.*` (`primary`, `secondary`, `muted`, `onContrast`)
  - `border.*` (`DEFAULT`, `subtle`, `strong`, `input`, `focusRing`)
  - `primary.*` (`DEFAULT`, `solid`, `hover`, `subtle`, `border`, `foreground`; `solid`/`hover` are fills behind `primary.foreground` only, graphic-only fills use `primary` or `chart.primary`)
  - `status.{positive|warning|danger|info|neutral}.{text|bg|border|solid}`
  - `chart.*` (`primary`, `wealth`, `debt`, `warning`, `accentPurple`, `accentCyan`, `grid`, `series1`..`series8`, `projection`, `band`, `baseline`)
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

When spawning any subagent (Agent/Task tool, workflows, parallel agents, or session forks that accept a model override), agents MUST set the model explicitly and never leave it to inherit from the parent session. Pick by the job:

- `haiku`: simple tasks and simple investigations (find a file or symbol, list usages, read-only lookups, mechanical edits, formatting, quick fact checks).
- `sonnet`: writing code, tests and docs, code review, and more complicated investigation or exploration (multi-file tracing, root-cause analysis, comparing approaches in the code).
- `opus`: writing plans and specs (implementation plans, design specs, architectural trade-offs), and making straightforward decisions (a clear best option, low stakes, easily reversed). Opus subagents stay read-only; they return the document or recommendation and the parent writes any file.
- `fable`: making complicated decisions (several competing options, high stakes or hard to reverse, legal/financial/security implications, conflicting evidence, as in the owner-decision rounds in `docs/audit/plans/DECISIONS.md`). Decision subagents stay read-only, are given the options and the relevant evidence, and return a recommendation with reasons. They never write code or files.

Never use `opus` or `fable` for anything outside the jobs above. When in doubt between two tiers, use the cheaper one.

Enforcement lives in `.claude/`:

- `.claude/agents/explorer.md` (`model: haiku`, read-only tools): simple search and investigation.
- `.claude/agents/implementer.md` (`model: sonnet`): writing code, review and complex investigation.
- `.claude/agents/planner.md` (`model: opus`, read-only tools): plans, specs and straightforward decisions; prefer this over the built-in `Plan` agent.
- `.claude/agents/decider.md` (`model: fable`, read-only tools): complicated decisions.
- `.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` as the default for any subagent (including built-ins such as `Explore`, `Plan`, `general-purpose`) that has no model of its own.

A per-spawn `model` parameter overrides both frontmatter and the default. In workflow scripts, every `agent()` call must pass `model` (`'haiku'`, `'sonnet'`, `'opus'` for a plan/spec or straightforward-decision stage, `'fable'` for a complicated-decision stage) or use `agentType: 'explorer' | 'implementer' | 'planner' | 'decider'`; never omit both.

## 7. RTK TOKEN-SAVING LAW (RUST TOKEN KILLER)

[`rtk`](https://github.com/rtk-ai/rtk) is a CLI proxy that compresses noisy command output (60-90% fewer tokens). When running a command it supports, agents MUST prefix it with `rtk`.

- Applicable: `git` (status, diff, log, ...), `gh`, `bun`/`npm`/`pnpm` scripts (`lint`, `check-types`, `test`, `build`), `tsc`, `vitest`, `playwright`, `docker`, and file/search builtins (`ls`, `grep`, `find`, `cat`/read).
  - Example: `rtk git status`, `rtk bun run test`, `rtk bun run build`.
- Not applicable: interactive commands, long-running dev servers (`bun run dev`, `storybook`), and commands whose raw output is itself the deliverable.
- If a command's compressed output hides something needed (e.g. a full stack trace), use `rtk bypass <cmd>` for the raw output.
- The Section 5 CI pre-flight checks must still be executed and verified; `rtk` only changes how their output is displayed (e.g. `rtk bun run lint`).
- If `rtk` is not installed, install it (`brew install rtk`, or the official install script, which installs to `~/.local/bin` — ensure that is on `PATH`) and run `rtk init -g` for the Claude Code hook; fall back to the plain command only if installation is impossible.
