# FLUMP ARCHITECTURE, DESIGN SYSTEM & FILE STRUCTURE LAWS

**Before any UI work** (`packages/ui`, `apps/web`, `apps/marketing`) read [`docs/agents/ui-laws.md`](./docs/agents/ui-laws.md). It holds sections 1 to 4 and 10 in full, and they are binding. The lines below are reminders only.

## 1. COLOCATED COMPONENT DIRECTORY LAW (MANDATORY)

Every component lives in its own PascalCase directory with colocated files (implementation, styles, test, barrel export, and stories where required). Never a flat `.tsx` component file.

**`apps/mobile`**: every component lives in its own PascalCase directory with `ComponentName.tsx`, `ComponentName.styles.ts` (a StyleSheet factory that takes the theme), `ComponentName.test.tsx`, `ComponentName.states.ts` (named prop sets, shown by the dev gallery and used by the tests, in place of a Storybook file) and `index.ts`.

## 2. DESIGN TOKEN & STYLING LAWS

Semantic tokens only: no hex or RGB values and no primitive scale tokens. Tabular numbers and en-GB formatting on all financial data.

## 3. PROGRESSIVE DISCLOSURE & LAYOUT LAWS

Use the layout components (`KpiStrip`, `SimulatorSplitLayout`, `SliderField`, `ScenarioZone`, `CollapsibleDrawer`, the one tabs component, `PageBody`, `HeroFigure`). Saved figures and scenario inputs stay separate. Type and motion come from tokens.

## 4. DEFINITION OF DONE FOR ANY UI CHANGE

Colocated files, stories in light and dark with zero a11y violations, interactive states tested, the section 5 checks passing and every CI check green.

## 5. PRE-FLIGHT LAW (LOCAL FAST CHECKS, THEN CI)

CI runs the full suite on every PR in a few minutes, and nothing merges unless it is green and up to date with `main`. So local checks are the fast ones only; the slow ones belong to CI.

**Run locally before creating or pushing to a PR:**

1. `bun run lint` (zero Biome lint/format errors)
2. `bun run check-types` (zero TypeScript errors across all monorepo packages)
3. `bun run check:laws` (design tokens, tabular numbers, react icons, style literals, number inputs, judgement colours, orb-only colours, the GSAP and three.js import ban, dependency versions, copy, the unsigned tax vector ratchet, the one tax engine guard, the value map, the functionality map, skill sync commits, London dates, em dashes in Markdown and fake-tool PATHs in tests)
4. The tests for what you changed only: `bunx vitest run <paths>` or `bun run test --filter=<package>` for each package the change touches. Do not run the whole monorepo suite locally.

When a change removes violations, the baselines go stale and CI fails. Regenerate them with `bun scripts/check-design-tokens.ts --write-baseline`, `bun scripts/check-tabular-nums.ts --write-baseline`, `bun scripts/check-react-icons.ts --write-baseline`, `bun scripts/check-style-literals.ts --write-baseline`, `bun scripts/check-copy.ts --write-baseline` and `bun scripts/check-value-map.ts --write-baseline`, then commit the updated baseline files. The number-input, judgement, London date and Markdown em dash checks (`scripts/check-input-types.ts`, `scripts/check-judgement-tokens.ts`, `scripts/check-london-dates.ts`, `scripts/check-doc-dashes.ts`) fail only when a count rises; a fall prints `IMPROVED` and passes, so regenerating their baselines is optional.

**Leave to CI:** the full `bun run test`, `bun run build`, Storybook a11y (light and dark), the E2E smoke test and the Docker images. Run one of these locally only to reproduce or debug a CI failure.

**After pushing:** wait for CI on the pushed commit. A PR is ready to merge only when every CI check on its latest commit is green; say so only then. The two advisory jobs, "Visual regression" and "Accessibility gate", are the exception: they do not block a merge, but read a red one and say in the PR what it found. If CI fails, read the failing job (`gh run view <id> --log-failed`), fix it and push again. Never ask for a merge on pending or failing CI, and never merge on the strength of local checks alone.

## 6. SUBAGENT MODEL LAW

When spawning any subagent (Agent/Task tool, workflows, parallel agents, `start_session`, or session forks that accept a model override), agents MUST set the model explicitly and never leave it to inherit from the parent session. Pick by the job (tiers moved up one level on 2026-11-13; simple coding relaxed on 2026-11-19):

- `haiku`: trivial, fully specified work only (one known file or command, no judgement, a wrong answer obvious at a glance). If unsure between `haiku` and `sonnet`, use `sonnet`.
- `sonnet`: simple tasks and lookups; mechanical implementation with an exact spec (renames, applying review findings, rebases, snapshot updates); and simple coding that `opus` is overqualified for, such as smaller fixes (known cause, small change following an existing pattern, inside one module, tests plain from the task). Money and tax maths, auth and security, privacy and data handling, and migrations stay on `opus` however small.
- `opus`: code, tests and docs beyond that; all code review (a smaller-fix lane's independent review stays on `opus`); complex investigation; straightforward decisions (a clear best option, low stakes, easily reversed).
- `fable`: plans, specs and complicated decisions (several competing options, high stakes or hard to reverse, legal/financial/security implications, conflicting evidence, as in the owner-decision rounds in `docs/audit/plans/DECISIONS.md`). Plan and decision subagents stay read-only, are given the options and the relevant evidence, and return the document or recommendation; the parent writes any file.

Never use `opus` or `fable` for anything outside the jobs above. When in doubt between two tiers, use the cheaper one, with two exceptions: `haiku` vs `sonnet` (use `sonnet`), and the work named above as staying on `opus` (all code review; money and tax maths, auth and security, privacy and data handling, migrations), which is never downgraded.

A per-spawn `model` always overrides an agent file's pinned default, and every workflow `agent()` call passes `model`. `.claude/hooks/require-model.sh` refuses an Agent, Task or `start_session` call with no model (forks and calls where model does not apply pass). The agent files, their pinned defaults, the three spawns that differ from them and the workflow rules are in [`docs/agents/subagent-models.md`](./docs/agents/subagent-models.md).

## 7. RTK TOKEN-SAVING LAW (RUST TOKEN KILLER)

A hook adds the [`rtk`](https://github.com/rtk-ai/rtk) prefix to supported commands, so there is nothing to do for a command at the start of a line. The hook does nothing after a leading `cd ... &&` or inside pipes, loops, subshells and wrappers: type `rtk` yourself there. Never dump a whole file from another ref with `git show <ref>:<path>`. Detail: [`docs/agents/rtk.md`](./docs/agents/rtk.md).

## 8. CONTEXT AND TOKEN EFFICIENCY LAW

Every token an agent reads is paid for again on each later turn of that session, so keep contexts small.

- **One task per working session.** When a session's or subagent's task is merged, it reports its follow-ups and stops. New work starts in a fresh session or subagent with a short brief, never in a long-running one. The thread that coordinates them (a coordinator session, or the main thread of an agent that hands tasks to subagents) may carry on from task to task; the rule is for the conversations that do the work (owner, 21 November 2026).
- **Fewer, larger PRs.** Bundle related tickets into one PR and do not stack PRs on other open PRs.
- **Lean subagent reports.** Ask subagents for conclusions with file paths and line numbers, with a word limit, not file dumps or full logs. The default limit is 150 words for an implementation report and 250 for a review; a report lists only what must be fixed, what was not verified and what is left. Do not read a subagent's transcript file.
- **Short PR descriptions.** A PR description is at most 1000 characters (owner, 22 November 2026). Keep the headings the laws ask for ("Tests", "Guard changes", the reviewer line, review-only rules checked, tests skipped locally) at one or two lines each. Detail belongs in the code, the tests and the plan documents. The "PR description" workflow checks the cap, the Tests, Guard changes and Review lines and em dashes; run it before pushing with `gh pr view <n> --json title,body,author,headRefName | bun scripts/check-pr-body.ts -`.
- **Do not wake a large agent for a small job.** A resumed subagent re-reads its whole conversation. Once its PR is open, the coordinating thread does the rebase, the push and the PR description edit itself, and sends a subagent back only for code changes. A rebase that needs a conflict resolved in code is a code change: it goes back for review.
- **Read narrowly.** Read the part of a file you need (offset and limit), search before reading, and do not re-read a file you just edited.
- **Read logs and output files by range.** Use `rtk read <file>` with a range, or `rtk log`, rather than `tail -c` or `cat` on a whole file.
- **Edit files with the Edit tool.** Do not rewrite files through `python3` or `perl -pi` heredocs: the script and its output both cost tokens, and the Edit tool sends only the changed text.
- **Do not poll.** Wait for the notification from a background command, subagent or session instead of re-checking it. Run long commands in the background.
- **Pick the cheapest model that fits** (section 6), and give mechanical work and simple coding (section 6) to `sonnet`.
- **Keep command output short.** Use `rtk` (section 7), `--json` with a `-q` filter on `gh`, and `| tail` or `| head` on anything long.
- **Coordinating lane sessions.** A session that coordinates others follows [`docs/agents/coordinator.md`](./docs/agents/coordinator.md).

## 9. DEPENDENCY VERSIONS

A dependency declared in more than one workspace `package.json` uses the same version string everywhere; `check:laws` enforces it. Bump every workspace together. An exception needs sign-off first (section 15). Detail: [`docs/agents/laws-detail.md`](./docs/agents/laws-detail.md).

## 10. UX GUIDELINES AND STYLE GUIDE

The documents in `docs/ux/` (UX-GUIDELINES, STYLE-GUIDE, CROSS-PLATFORM) are the standing rules for how Flump behaves and looks. A law or test outranks them, and owner decisions in `docs/audit/plans/DECISIONS.md` outrank all. A PR that changes a flow the mobile app shares adds a dated row to `docs/audit/plans/E12-mobile-parity-log.md`. A PR that touches UI says which review-only rules it checked. Motion has two settings: the apps follow tiers A to C (UX-GUIDELINES 12.1: no count-up on real money, no three.js or GSAP outside `apps/marketing`), the marketing site follows 12.2. Full text: [`docs/agents/ui-laws.md`](./docs/agents/ui-laws.md).

## 11. COPY LAW

Before writing or changing any string a user or a model reads, read [`docs/copy/COPY-GUIDE.md`](./docs/copy/COPY-GUIDE.md).

- Plain en-GB, sentence case, 25 words a sentence at most, no exclamation marks, em dashes or ampersands, one approved word per concept.
- Never judge anyone's finances.
- Facts, not recommendations: `docs/compliance/advice-boundary-policy.md` (R1 to R8) and the claims rule outrank everything. Fixed wording is never reworded without the owner.
- `bun scripts/check-copy.ts` (in `check:laws`) is a ratchet; an `ALLOWED_PHRASES` entry needs sign-off first (section 15).

Detail: [`docs/agents/laws-detail.md`](./docs/agents/laws-detail.md).

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

Before adding, moving or removing a stored value, a browser storage or cookie key, a shared figure or a route, read [`docs/system/README.md`](./docs/system/README.md).

- Every stored fact has one home and one entry in `docs/system/value-map.yaml`. A figure shown in more than one place is computed by one function in `packages/finance-engine/src`; pages, services and AI tools read it from there.
- A PR that adds, moves or removes a column, profile field, storage or cookie key, or shared figure updates the map in the same PR (a new column also goes in its table's `valueMap` in `apps/backend/src/modules/privacy/user-data-registry.ts`), then runs `bun scripts/generate-value-map.ts`.
- A PR that adds or removes a route, or changes which facts or figures a section reads, updates the functionality map (route and section level only) and runs `bun run functionality-map`.
- `check:laws` checks both maps. Raising a baseline falls under section 15.

Detail: [`docs/agents/laws-detail.md`](./docs/agents/laws-detail.md).

## 17. TESTS THAT CATCH FAULTS AND RUN FAST LAW

Before adding or changing any test, read [`docs/testing/writing-tests.md`](./docs/testing/writing-tests.md).

- **A test must fail when the code is wrong.** Assert a specific value, output, state or call; `toBeDefined`, `toBeTruthy`, `not.toThrow` or a snapshot is never the only assertion on a behaviour. Test each comparison on its edge and each branch both ways.
- **See it fail.** Break the code and watch the test fail; a bug-fix test fails before the fix. For logic in `packages/finance-engine`, or in `apps/backend` guards, interceptors, auth or `security/`, run Stryker on the changed files and kill each survivor or give it a row in `docs/testing/mutation-triage.md`.
- **Never weaken a test to make it pass.** Loosening an assertion or deleting a case needs the reason in the PR description. No `.only` or bare `.skip`.
- **A test must be quick.** In `apps/web`, `packages/ui` and `apps/marketing`, a test file with no DOM starts with `// @vitest-environment node`. No real waiting, network, database or clock in a unit test. A unit test file that takes more than 5 seconds needs the reason in the PR description.
- **Mutation testing stays local.** No workflow runs Stryker.
- **The PR description has a "Tests" heading**: behaviours covered, how each test was seen to fail, anything weakened, skipped or removed.

Detail: [`docs/agents/laws-detail.md`](./docs/agents/laws-detail.md).

## 18. TEST DATABASE CLEAN-UP LAW

Leftover test databases filled the owner's disk once (23 containers and 24 GB of volumes on 25 November 2026), so every container or volume a lane starts for tests is tied to its worktree:

- Label it `--label flump.purpose=test-db --label flump.worktree="$(git rev-parse --show-toplevel)"`, and use `--rm` or an explicit teardown on exit, failure and interrupt. Use anonymous volumes, or create a named one with the same labels (`docker volume create --label ...`), since a container's labels do not reach its volumes.
- Remove it with its volumes before the lane reports ready: `docker rm -fv <name>`, or `bash scripts/ops/clean-test-dbs.sh "$(git rev-parse --show-toplevel)"`.
- When archiving a lane, the coordinator runs `bash scripts/ops/clean-test-dbs.sh <worktree path>`. `--orphans` removes those whose worktree is gone from this machine, so run it on the Mac the worktrees live on; `--dry-run` only lists. No Claude Code hook covers this: `WorktreeRemove` fires only for worktrees made by a `WorktreeCreate` hook.
- Never touch `flump-postgres` (the owner's dev database) or anything not labelled as a Flump test database. The script refuses both.
- The clean-up is for the local OrbStack Docker only: never a remote Docker host, never Railway or any hosted database, never CI. The script refuses unless the `orbstack` context is a socket in `~/.orbstack`, refuses when `CI` or `GITHUB_ACTIONS` is set, and no workflow may call it (`scripts/ci-config.test.ts` checks).

## 19. RULE TABLE

Each rule and what enforces it. "None" means only the reader enforces it: when a mistake under a "None" rule happens again, give it an enforcer in the same change (the pstack `correct` skill). Drop a row once its mistake cannot happen.

| Rule                                                                                   | Enforced by                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colocated component directories (1)                                                    | `packages/ui/src/tokens/architecture.laws.test.ts`, `scripts/check-mobile-laws.test.ts`, `.claude/hooks/component-siblings.sh`                             |
| Semantic tokens, no hex or primitive scale (2)                                         | `check:laws`: `check-design-tokens`, `check-style-literals`, `check-judgement-tokens`; `.claude/hooks/token-guard.sh`                                      |
| Tabular numbers on financial figures (2)                                               | `check:laws`: `check-tabular-nums`                                                                                                                         |
| Layout components and progressive disclosure (3)                                       | Partly: `architecture.laws.test.ts`; the rest None                                                                                                         |
| Stories, a11y in light and dark (4)                                                    | CI Storybook a11y jobs (required)                                                                                                                          |
| Local pre-flight, then green CI before "ready" (5)                                     | Required checks (`.github/required-checks.json`, branch protection, owner)                                                                                 |
| Every spawn sets its model (6)                                                         | None (a PreToolUse hook is proposed in its own PR, pending the owner); `CLAUDE_CODE_SUBAGENT_MODEL` only sets the fallback                                 |
| RTK prefix (7)                                                                         | The global RTK hook                                                                                                                                        |
| PR description: 1000 characters, Tests, Guard changes and Review lines (8, 12, 15, 17) | `scripts/check-pr-body.ts` in the "PR description" workflow (not a required check yet: owner)                                                              |
| One task per session, lean reports, no polling, read narrowly (8)                      | None                                                                                                                                                       |
| One version per dependency across workspaces (9)                                       | `check:laws`: `check-dependency-versions`, `check-workspace-deps`                                                                                          |
| No dependency newer than 7 days                                                        | `bunfig.toml` `minimumReleaseAge`, Renovate `minimumReleaseAge` (owner, 17 Nov: no lockfile-age CI check)                                                  |
| Violet and rose on orb-like elements only (10; STYLE-GUIDE MC1)                        | `check:laws`: `check-orb-colours` (allow-list in `scripts/lib/orbColours.ts`)                                                                              |
| No GSAP or three.js outside `apps/marketing` (10; UX-GUIDELINES AT4)                   | `check:laws`: `check-motion-imports` (imports and `package.json` declarations; no allow-list)                                                              |
| Marketing home page weight within baseline plus budget (UX-GUIDELINES MK12)            | `scripts/check-marketing-weight.ts` in the required Build job (`scripts/marketing-weight-baseline.json`); a baseline or budget raise: None                 |
| UX guidelines; parity log row for shared flows (10)                                    | Partly: `check-input-types`, the advisory Accessibility gate; the parity log row: None                                                                     |
| Copy rules in app strings (11)                                                         | `check:laws`: `check-copy`                                                                                                                                 |
| No em dashes in Markdown, agent rules or PR descriptions (11)                          | `check:laws`: `check-doc-dashes`; `check-pr-body`                                                                                                          |
| Facts, not recommendations; fixed wording (11)                                         | Partly: `check-copy` advice rules; the rest None                                                                                                           |
| Independent review by another agent (12)                                               | The Review line only (`check-pr-body`); the review itself: None                                                                                            |
| Plan status line `Decisions:` (13)                                                     | None                                                                                                                                                       |
| Hand-worked expected values; skipped tests stated (14)                                 | None                                                                                                                                                       |
| Guard changes signed off before the change (15)                                        | Listing: `check-pr-body`; the sign-off: None                                                                                                               |
| Ratchet baselines never rise unsigned (5, 15)                                          | London date and em dash baselines: their checks fail on any raise against main; the other ratchets fail on a count rise, a baseline raise: None            |
| One home per value; maps updated (16)                                                  | `check:laws`: `check-value-map`, `check-functionality-map`; `user-data-registry.spec.ts`                                                                   |
| One tax engine; signed tax vectors                                                     | `check:laws`: `check-one-tax-engine`, `check-tax-signoff`                                                                                                  |
| Tests fail when the code is wrong; no `.only` (17)                                     | Biome `noFocusedTests`; Stryker locally (`check-mutation-score`); the rest None                                                                            |
| UK dates on the London clock, one London formatter                                     | `check:laws`: `check-london-dates` (ratchet)                                                                                                               |
| Skills name their sync commit by title, never a hash                                   | `check:laws`: `check-skill-sync-commits`                                                                                                                   |
| Tests with fake tools use `isolatedPath` (`scripts/lib/fake-bin.ts`)                   | `check:laws`: `check-fake-bin-path`                                                                                                                        |
| Entity lists come from `ENTITIES`, never a hand copy                                   | Architecture: the migrations and privacy registry specs derive them                                                                                        |
| Generated files (lockfile, changelogs, styled-system, `.env`) never hand-edited        | `.claude/hooks/protect-files.sh`                                                                                                                           |
| No mock auth literals                                                                  | `bun run check:auth` in CI                                                                                                                                 |
| Test databases labelled, removed before ready and on archive (18)                      | `scripts/ops/clean-test-dbs.sh` and `scripts/ops/clean-test-dbs.test.ts` (run by the coordinator when archiving); labelling and removal before ready: None |
| Test database clean-up acts only on local OrbStack, never in CI (18)                   | `scripts/ops/clean-test-dbs.sh` refusals and `clean-test-dbs.test.ts`; `scripts/ci-config.test.ts` (no workflow, action or package script calls it)        |
| Maestro flows take passed values from the runner                                       | None (one instance so far)                                                                                                                                 |
| New API response fields carry a default; no field removed or retyped in v1 (20)        | `check:laws`: `check-openapi-breaking`                                                                                                                     |

## 20. API CONTRACT COMPATIBILITY LAW

An app installed last month must work against a newer backend, and a newer app against an older one. So within `/v1` a response only gains fields, and a new required field carries a default in `packages/api-contract` (`.default(...)`): the value that is safe and true against an older backend that lacks the field, not merely the new backend's own default. Readers fill it in from an older backend; the server must still send it (the backend's contract check logs a `missing_field`, and the contract suites fail on it). Readers ignore unknown fields. Removing, renaming or retyping a response field needs `/v2` or a signed allow-list entry (section 15). Detail: [`docs/api/versioning.md`](./docs/api/versioning.md).
