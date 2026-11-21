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

Direction of travel (E15 phase 3 target, not yet enforced): web pages move from inline styles to `@repo/ui` primitives and patterns. The legacy `FLP*` layer (`apps/web/app/components/core`) has been removed and `architecture.laws.test.ts` forbids it returning.

## 2. DESIGN TOKEN & STYLING LAWS

- **Zero Raw Hex/RGB or Primitive Token Leaks:** Components may NEVER use hardcoded hex values (`#141A26`) or raw primitive scale tokens (`indigo.600`, `slate.800`, `success.500`, `purple.500`, `cyan.400`). Always use the 7 canonical semantic namespaces:
  - `surface.*` (`canvas`, `card`, `sunken`, `subtle`, `overlay`, `contrast`, `scrim`, `hero`; `scrim` is a modal backdrop, never a text surface; `hero` is the single deep-teal headline block per page, added by DECISIONS round 5, text on it uses `text.onContrast`; `tint.{teal|apricot|sage}` are E16 domain tints for icon tiles and at most one tinted section per page, never around a `KpiStrip`, a `ScenarioZone` or a chart, and never on a KPI card; the one exception is marketing pages, whose section bands alternate `surface.canvas` with `surface.tint.teal` and use no `apricot` or `sage` band and no `surface.subtle` strip, while a band that holds figures or a chart stays on `surface.canvas`, by the owner decision of 2026-11-20 in `docs/audit/plans/DECISIONS.md`)
  - `text.*` (`primary`, `secondary`, `muted`, `onContrast`)
  - `border.*` (`DEFAULT`, `subtle`, `strong`, `input`, `focusRing`; reference a `DEFAULT` by its group name, `"border"` or `"primary"`: a literal `"border.DEFAULT"` resolves to no CSS variable and renders `currentColor`, and `check-design-tokens` counts it)
  - `primary.*` (`DEFAULT`, `solid`, `hover`, `subtle`, `border`, `foreground`; `solid`/`hover` are fills behind `primary.foreground` only, graphic-only fills use `primary` or `chart.primary`)
  - `status.{positive|warning|danger|info|neutral}.{text|bg|border|solid}`
  - `chart.*` (`primary`, `wealth`, `debt`, `warning`, `accentPurple`, `accentCyan`, `grid`, `series1`..`series8`, `projection`, `band`, `baseline`)
  - `accent.*` (`DEFAULT`, `subtle`, `border`, `onHero`; decoration and wayfinding only: never a figure, button, link or notice, and never a signal of good or bad)
- **Tabular Numbers on All Financial Data:** Every currency value, percentage, date, table cell, and slider badge MUST apply `fontVariantNumeric: 'tabular-nums'` (`tabular-nums`) and format numbers via standard UK formatting (`Intl.NumberFormat('en-GB')` / `useFormatCurrency()`).

## 3. PROGRESSIVE DISCLOSURE & LAYOUT LAWS

- **Single-Row KPI Strip:** Top-level page metrics must use `<KpiStrip>` (`lg:grid-cols-4` or `3`, max 4 items in a single horizontal row—never a tall 2x2 grid).
- **2-Column Simulator Split:** Any calculator or forecaster (`/debt`, `/mortgage`, `/pension`, `/forecast`) must use `<SimulatorSplitLayout>` (`lg:col-span-5` or `4` sticky left parameter controls + `lg:col-span-7` or `8` right visual chart & outcome cards). Never stack slider parameters full-width above the chart they control.
- **Compact Slider Inputs:** Always use `<SliderField>` (Label top-left, compact editable value pill top-right, slider below). Never render a full-width text input box below a slider.
- **Saved vs Scenario:** Headline figures and `<KpiStrip>`s read saved loader data only; what-if inputs live in a `<ScenarioZone>` driven by `useScenarioState`, and scenario inputs never write to saved data (no "apply", no localStorage, no money in URLs) and `surface.hero` never goes on a scenario outcome.
- **No Uncollapsed Raw Schedules:** Any table exceeding 8 rows (Amortisation schedules, 12-month ledgers, multi-year tax tables) must live inside a `<CollapsibleDrawer>` or secondary tab.
- **Number Budget and One Notice:** Each view keeps to the number budget and shows one headline figure, and each surface carries at most one quiet notice, as set out in principles P1, P2 and P4 of [`docs/design/e16-polish/PLAN.md`](./docs/design/e16-polish/PLAN.md).
- **One Tabs Component:** Tabbed views use the single tabs component from `@repo/ui` (today `SegmentedTabs`; E16 PR 2 consolidates it as `Tabs`); no hand-built tab rows.
- **Page Template:** Every app page renders through `<PageBody>` (content width `sizes.page.max`, `spacing.page.*` gutters and gaps) and shows its headline figure in `<HeroFigure>`, the only place `surface.hero` and `numeric.hero` appear (E16 P2 and P13). Direction of travel: `PageBody` and `HeroFigure` land with E16 PR 2 and pages adopt them in the page PRs; until then this is not enforced and existing `surface.hero` uses (KpiCard `tone="hero"` and others) stay.
- **Type and Motion Come From Tokens:** Font sizes come from textStyles or the `fontSizes` scale, weights stop at 700, and transitions use the `durations` and `easings` tokens; `bun scripts/check-style-literals.ts` ratchets raw values (and inline `style=` in the apps) down.

## 4. DEFINITION OF DONE FOR ANY UI CHANGE

A component or page task is NOT complete until:

1. It follows the colocated directory structure.
2. It has a `.stories.tsx` file rendering in both Light and Dark mode with zero `@storybook/addon-a11y` violations.
3. Interactive states are covered by a `.test.tsx` or Storybook `play()` test.
4. The local fast checks in section 5 pass, and every CI check on the PR is green (CI runs the full tests, build, Storybook a11y and E2E).

## 5. PRE-FLIGHT LAW (LOCAL FAST CHECKS, THEN CI)

CI runs the full suite on every PR in a few minutes, and nothing merges unless it is green and up to date with `main`. So local checks are the fast ones only; the slow ones belong to CI.

**Run locally before creating or pushing to a PR:**

1. `bun run lint` (zero Biome lint/format errors)
2. `bun run check-types` (zero TypeScript errors across all monorepo packages)
3. `bun run check:laws` (design tokens, tabular numbers, react icons, style literals, number inputs, judgement colours, dependency versions, copy, the unsigned tax vector ratchet, the one tax engine guard and the value map)
4. The tests for what you changed only: `bunx vitest run <paths>` or `bun run test --filter=<package>` for each package the change touches. Do not run the whole monorepo suite locally.

When a change removes violations, the baselines go stale and CI fails. Regenerate them with `bun scripts/check-design-tokens.ts --write-baseline`, `bun scripts/check-tabular-nums.ts --write-baseline`, `bun scripts/check-react-icons.ts --write-baseline`, `bun scripts/check-style-literals.ts --write-baseline`, `bun scripts/check-copy.ts --write-baseline` and `bun scripts/check-value-map.ts --write-baseline`, then commit the updated baseline files. The number-input and judgement checks (`scripts/check-input-types.ts`, `scripts/check-judgement-tokens.ts`) fail only when a count rises; a fall prints `IMPROVED` and passes, so regenerating their baselines is optional.

**Leave to CI:** the full `bun run test`, `bun run build`, Storybook a11y (light and dark), the E2E smoke test and the Docker images. Run one of these locally only to reproduce or debug a CI failure.

**After pushing:** wait for CI on the pushed commit. A PR is ready to merge only when every CI check on its latest commit is green; say so only then. The two advisory jobs, "Visual regression" and "Accessibility gate", are the exception: they do not block a merge, but read a red one and say in the PR what it found. If CI fails, read the failing job (`gh run view <id> --log-failed`), fix it and push again. Never ask for a merge on pending or failing CI, and never merge on the strength of local checks alone.

## 6. SUBAGENT MODEL LAW

When spawning any subagent (Agent/Task tool, workflows, parallel agents, `start_session`, or session forks that accept a model override), agents MUST set the model explicitly and never leave it to inherit from the parent session. Pick by the job (tiers moved up one level on 2026-11-13; simple coding relaxed on 2026-11-19):

- `haiku`: trivial, fully specified work only (one known file or command, no judgement, a wrong answer obvious at a glance). If unsure between `haiku` and `sonnet`, use `sonnet`.
- `sonnet`: simple tasks and lookups; mechanical implementation with an exact spec (renames, applying review findings, rebases, snapshot updates); and simple coding that `opus` is overqualified for, such as smaller fixes (known cause, small change following an existing pattern, inside one module, tests plain from the task). Money and tax maths, auth and security, privacy and data handling, and migrations stay on `opus` however small.
- `opus`: code, tests and docs beyond that; all code review (a smaller-fix lane's independent review stays on `opus`); complex investigation; straightforward decisions (a clear best option, low stakes, easily reversed).
- `fable`: plans, specs and complicated decisions (several competing options, high stakes or hard to reverse, legal/financial/security implications, conflicting evidence, as in the owner-decision rounds in `docs/audit/plans/DECISIONS.md`). Plan and decision subagents stay read-only, are given the options and the relevant evidence, and return the document or recommendation; the parent writes any file.

Never use `opus` or `fable` for anything outside the jobs above. When in doubt between two tiers, use the cheaper one, with two exceptions: `haiku` vs `sonnet` (use `sonnet`), and the work named above as staying on `opus` (all code review; money and tax maths, auth and security, privacy and data handling, migrations), which is never downgraded.

Enforcement lives in `.claude/`:

- `.claude/agents/explorer.md` (read-only tools): simple search and investigation.
- `.claude/agents/implementer.md`: writing code, review and complex investigation.
- `.claude/agents/planner.md` (read-only tools): plans, specs and straightforward decisions; prefer this over the built-in `Plan` agent.
- `.claude/agents/decider.md` (read-only tools): complicated decisions.
- Each agent file pins a default `model` in its frontmatter (`explorer` sonnet, `implementer` opus, `planner` fable, `decider` fable, `security-reviewer` and `ui-compliance-reviewer` opus). The default is only a fallback for a spawn that forgot the model; always pass the per-spawn `model` from the tiers above. Three spawns differ from the pinned default: a smaller fix goes to `implementer` with `model: 'sonnet'`; a straightforward decision goes to `planner` with `model: 'opus'`; a trivial search (one known file or command, answer obvious at a glance) goes to `explorer` with `model: 'haiku'`. `security-reviewer` and `ui-compliance-reviewer` always run on `opus`.
- `.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL=opus` as the default for any subagent (including built-ins such as `Explore`, `Plan`, `general-purpose`) that has no model of its own.

A per-spawn `model` parameter overrides both frontmatter and the default. In workflow scripts, every `agent()` call must pass `model` (`'haiku'`, `'sonnet'`, `'opus'` for code, review or a straightforward-decision stage, `'fable'` for a plan, spec or complicated-decision stage), including when it also sets `agentType` (`'explorer' | 'implementer' | 'planner' | 'decider' | 'security-reviewer' | 'ui-compliance-reviewer'`).

## 7. RTK TOKEN-SAVING LAW (RUST TOKEN KILLER)

[`rtk`](https://github.com/rtk-ai/rtk) is a CLI proxy that compresses noisy command output (60-90% fewer tokens). When running a command it supports, agents MUST prefix it with `rtk`.

- Applicable: `git` (status, diff, log, ...), `gh`, `bun`/`npm`/`pnpm` scripts (`lint`, `check-types`, `test`, `build`), `tsc`, `vitest`, `playwright`, `docker`, and file/search builtins (`ls`, `grep`, `find`, `cat`/read).
  - Example: `rtk git status`, `rtk bun run test`, `rtk bun run build`.
- The hook only rewrites a command at the start of a line. Inside pipes, loops, subshells, `&&` chains and wrappers it does nothing, so type the prefix yourself there: `for n in 1 2; do rtk gh pr view "$n"; done`, `lockf /tmp/flump-gate.lock rtk bunx vitest run`, `cd <worktree> && rtk git status`. Most misses in the 30-day `rtk discover` scan (33% coverage) were commands after a leading `cd ... &&`.
- The most-missed commands (from `rtk discover`): `git show` (use `rtk git show`), `grep -n` (`rtk grep`), `gh pr` (`rtk gh pr`), `tail`/`cat` on logs (`rtk read` or `rtk log`), `bunx biome` (`rtk bunx biome`), `ls -la` (`rtk ls`), `wc -l` (`rtk wc`).
- To read a file as it is on main, read it in your own up-to-date worktree (rebase first) with the Read tool rather than `git show origin/main:<path>`. Never dump a whole file from another ref: search it with `rtk git grep -n <pattern> <ref> -- <path>`, or take a line range (`rtk git show <ref>:<path> | sed -n '40,80p'`). Whole-file `git show <ref>:<path>` was the largest single waste in the scan.
- When you only need failures, use `rtk err <cmd>` (errors and warnings only) or `rtk test <cmd>` (failing tests only) instead of the full output.
- Run `rtk discover` to see which of your commands missed the proxy.
- Not applicable: interactive commands, long-running dev servers (`bun run dev`, `storybook`), and commands whose raw output is itself the deliverable.
- If a command's compressed output hides something needed (e.g. a full stack trace), use `rtk bypass <cmd>` for the raw output.
- The Section 5 pre-flight checks must still be executed and verified; `rtk` only changes how their output is displayed (e.g. `rtk bun run lint`).
- If `rtk` is not installed, install it (`brew install rtk`, or the official install script, which installs to `~/.local/bin` — ensure that is on `PATH`) and run `rtk init -g` for the Claude Code hook; fall back to the plain command only if installation is impossible.

## 8. CONTEXT AND TOKEN EFFICIENCY LAW

Every token an agent reads is paid for again on each later turn of that session, so keep contexts small.

- **One task per working session.** When a session's or subagent's task is merged, it reports its follow-ups and stops. New work starts in a fresh session or subagent with a short brief, never in a long-running one. The thread that coordinates them (a coordinator session, or the main thread of an agent that hands tasks to subagents) may carry on from task to task; the rule is for the conversations that do the work (owner, 21 November 2026).
- **Fewer, larger PRs.** Bundle related tickets into one PR and do not stack PRs on other open PRs.
- **Lean subagent reports.** Ask subagents for conclusions with file paths and line numbers, with a word limit, not file dumps or full logs. Do not read a subagent's transcript file.
- **Read narrowly.** Read the part of a file you need (offset and limit), search before reading, and do not re-read a file you just edited.
- **Read logs and output files by range.** Use `rtk read <file>` with a range, or `rtk log`, rather than `tail -c` or `cat` on a whole file.
- **Edit files with the Edit tool.** Do not rewrite files through `python3` or `perl -pi` heredocs: the script and its output both cost tokens, and the Edit tool sends only the changed text.
- **Do not poll.** Wait for the notification from a background command, subagent or session instead of re-checking it. Run long commands in the background.
- **Pick the cheapest model that fits** (section 6), and give mechanical work and simple coding (section 6) to `sonnet`.
- **Keep command output short.** Use `rtk` (section 7), `--json` with a `-q` filter on `gh`, and `| tail` or `| head` on anything long.
- **Coordinating lane sessions.** A session that coordinates others follows [`docs/agents/coordinator.md`](./docs/agents/coordinator.md).

## 9. DEPENDENCY VERSIONS

- A dependency declared in two or more workspace `package.json` files (root, `apps/*`, `packages/*`) must use the same version string everywhere. `bun scripts/check-dependency-versions.ts` enforces this in `check:laws` (and so in CI); peerDependencies ranges are not compared. Deliberate exceptions go in `ALLOWED_MISMATCHES` in `scripts/lib/dependency-versions.ts`, each with a reason and with sign-off first (section 15).
- Renovate groups non-major updates into one PR and raises major updates one PR per package; each covers every workspace that declares the package. When bumping by hand, bump every workspace together.
- Bun catalogs (`workspaces.catalog` and `"catalog:"` references) are deferred: Renovate's bun manager does not extract catalog entries ([`lib/modules/manager/bun/extract.ts`](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/bun/extract.ts) only reads `workspaces.packages`), so catalog versions would never get upgrade PRs. Revisit when Renovate adds support.

## 10. UX GUIDELINES AND STYLE GUIDE

Three documents in `docs/ux/` are the standing rules for how Flump behaves and looks on every platform (marketing site, web app, future mobile app). Sections 1 to 4 above are the enforced subset of them.

- [`docs/ux/UX-GUIDELINES.md`](./docs/ux/UX-GUIDELINES.md): behaviour. Hierarchy and the number budget, navigation, saved details versus scenarios, forms and money input, states, destructive actions, charts, onboarding, accessibility, trust, motion, responsive and touch.
- [`docs/ux/STYLE-GUIDE.md`](./docs/ux/STYLE-GUIDE.md): the visual language. Colour, type, spacing, radius, elevation, icons, illustration, logo, chart palette, component anatomy and states.
- [`docs/ux/CROSS-PLATFORM.md`](./docs/ux/CROSS-PLATFORM.md): what is shared between marketing, web and mobile, the component parity matrix, and the parity checklist.

**What to read before UI work:**

| Task                                                                                       | Read first                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new or changed page, flow, form, chart or state in `apps/web` or `apps/marketing`        | UX-GUIDELINES (the sections for what you touch), then `docs/agents/component-guidelines.md`                                                       |
| A new or changed component, token or recipe in `packages/ui`                               | STYLE-GUIDE, then `docs/agents/component-guidelines.md`                                                                                           |
| Any screen in the mobile app, or any change to tokens, formatting or shared specifications | CROSS-PLATFORM, and run its parity checklist                                                                                                      |
| User-facing words                                                                          | The copy guide (`docs/copy/COPY-GUIDE.md`, section 11 below) and `docs/compliance/advice-boundary-policy.md`. The UX documents do not set wording |

**Keep mobile in step.** A PR that changes what a user sees or does in a flow the mobile app shares (sign-in, the monthly check-in, navigation, net worth, accounts, settings, loading and error states, shared components, tokens, formatting or fixed wording) adds a dated row to [`docs/audit/plans/E12-mobile-parity-log.md`](./docs/audit/plans/E12-mobile-parity-log.md). The re-sweep session at the end of each design round checks the log against the merged PRs and appends any row that is missing.

**How the rules rank.** Each rule in those documents is marked "Enforced by" a law or test, "Proposed check", or "Review only". If a document and a law or test disagree, the law or test wins: follow it, and correct the document in the same PR. If a document and an older design note under `docs/design/` disagree, the `docs/ux/` document wins. Owner decisions in `docs/audit/plans/DECISIONS.md` outrank all of them.

**Review-only rules still apply.** A PR that touches UI states in its description which review-only rules it checked. The `ui-compliance-reviewer` agent reviews against the laws above and the `docs/ux/` documents.

`docs/ux/UX-ASSESSMENT-2026-11.md` is a dated assessment, not a rule set. Do not treat its findings as instructions; the changes it calls for become rules only when they enter the documents above.

## 11. COPY LAW

> **Detailed Reference**: Before writing or changing any string a user or a model reads (web, marketing, `packages/ui`, finance-engine text, MCP descriptions, prompts and results), read [`docs/copy/COPY-GUIDE.md`](./docs/copy/COPY-GUIDE.md).

- **How it fits with the UX guidelines.** [`docs/ux/UX-GUIDELINES.md`](./docs/ux/UX-GUIDELINES.md) says how a screen behaves; the copy guide says what its words are. Where both cover a pattern (empty states, errors, destructive actions), the UX guidelines decide the behaviour and the copy guide decides the wording.
- **Plain, factual, even-handed.** Everyday words, sentences of 25 words at most, sentence case, en-GB, no exclamation marks, em dashes or ampersands. One approved word per concept (guide section 6): "debts" not "liabilities", "what you own" not "assets", "left over each month" not "surplus", "estimate" for anything computed about the future or tax.
- **Never judge anyone's finances** (owner rule, guide 2.3): no "only" or "just" about money, no ranking renting below owning, no deprivation statistics at the reader, no red or warnings for ordinary situations.
- **Facts, not recommendations.** The advice boundary policy (`docs/compliance/advice-boundary-policy.md`, R1 to R8) and the claims rule (E7) outrank everything; the guide restates them in section 7. Fixed wording (notices, the MoneyHelper line, regulatory statements; guide 7.3) is never reworded without the owner.
- **Guard.** `bun scripts/check-copy.ts` (part of `check:laws`) is a ratchet over `scripts/copy-baseline.json`. `--list <path>` prints the hits under a path. After fixing copy, run `--write-baseline` and commit it. A false positive goes in `ALLOWED_PHRASES` with a reason and with sign-off first (section 15).

## 12. INDEPENDENT REVIEW LAW

No pull request merges without a review by a different agent from the one that wrote it: a separate session or a fresh review subagent that wrote none of the change. This applies to every agent working in the repo, including non-Claude agents. The PR description names who reviewed it and what they could not verify. Release PRs (`chore(main): release`) are merged by the owner and are exempt.

## 13. OPEN DECISIONS LAW

Every plan document carries a status line near the top: `Decisions: open` or `Decisions: accepted on <date>`. A plan with unanswered owner decisions is implemented only in the parts those decisions do not touch. Code must not invent a default for an undecided question.

## 14. HONEST TESTS LAW

- Every new or changed financial calculation has at least one test per behaviour whose expected value is worked out by hand, with the working in a comment.
- A test may not derive its expected value from the function under test.
- A PR report states which tests were skipped locally (for example, those needing a database). "Passes locally" is never claimed for tests that did not run.

## 15. GUARD CHANGES LAW

Changing an allow-list, a numeric limit in a test or law, a scanner suppression, a required check or a security exception needs sign-off before the change is made: from the owner for security exceptions and scanner suppressions, from the coordinator or owner for the rest. The PR description lists every such change under a heading "Guard changes", or says "None". Sample tokens and ids in tests are built at runtime, never suppressed. Lowering a ratchet baseline after removing violations (section 5) needs no sign-off; raising one does.

## 16. ONE HOME PER VALUE LAW

> **Detailed Reference**: Before adding, moving or removing a stored value, a browser storage or cookie key, or a figure shown in more than one place, read [`docs/system/README.md`](./docs/system/README.md).

- **One source of truth per fact.** Every stored fact about a user has one entry in `docs/system/value-map.yaml`, naming the one table and column that holds it. Do not add a second store for a fact that already has a home: read it from its home. A copy is allowed only when the map lists it with its status (`cache`, `derived` and so on) and says what keeps it equal.
- **One engine function per shared figure.** A figure shown in more than one place is computed by one function in `packages/finance-engine/src`, named in its map entry. Pages, backend services and AI tools read the figure from there. They do not sum balances, apply shares or convert amounts themselves.
- **Update the map in the same PR.** A PR that adds, moves or removes a database column, a profile field, a browser storage or cookie key, or a shared figure updates the map in the same PR. A new column also goes in its table's `valueMap` in `apps/backend/src/modules/privacy/user-data-registry.ts`. Then run `bun scripts/generate-value-map.ts`.
- **Guard.** `bun scripts/check-value-map.ts` (part of `check:laws`) fails on a column or browser key with no entry, a path, function, table or column that no longer exists, a malformed entry, a fact with no source of truth, a figure outside the engine, and stale generated views. Known problems are in `scripts/value-map-baseline.json`, each tied to an audit finding. The baseline only shrinks; raising it falls under section 15. Arithmetic that may be a second formula prints as a warning and does not fail the run.

## 17. TESTS THAT CATCH FAULTS AND RUN FAST LAW

> **Detailed Reference**: Before adding or changing any test, read [`docs/testing/writing-tests.md`](./docs/testing/writing-tests.md).

- **A test must fail when the code is wrong.** Every test asserts a specific value, output, state or call; `toBeDefined`, `toBeTruthy`, `not.toThrow` or a snapshot is never the only assertion on a behaviour. Each comparison is tested on its edge, just below and just above. Each branch is taken both ways. Inputs are chosen so a wrong operator, a swapped argument or a missing default gives a different answer.
- **See it fail.** Before trusting a new or changed test, break the code it covers and watch the test fail. A bug-fix test fails before the fix. For a change to logic in `packages/finance-engine`, or in `apps/backend` guards, interceptors, auth or `security/`, run Stryker on the changed files (the command is in the guide) and kill each survivor or give it a row in `docs/testing/mutation-triage.md`.
- **Never weaken a test to make it pass.** Loosening an assertion or deleting a case needs the reason in the PR description. `.only` and a bare `.skip` are never committed; `skipIf` on a stated condition is allowed.
- **A test must be quick.** In `apps/web`, `packages/ui` and `apps/marketing`, a test file with no DOM in the test or its source starts with `// @vitest-environment node` (conditions in the guide). No real waiting (fake timers, never a longer timeout), no real network, database or clock in a unit test, no `Math.random` or wall-clock assertions. Import and render only what the test needs. A new or changed unit test file that takes more than 5 seconds on its own needs the reason in the PR description.
- **Mutation testing stays local.** No workflow runs Stryker (owner decision, 20 November 2026). `bun run mutation <package|all>` is the whole-package check, run about once a month; the floors in `scripts/mutation-baseline.json` fall under section 15.
- **The PR description has a "Tests" heading** saying which behaviours the tests cover, how each test was seen to fail, and any test weakened, skipped or removed.
