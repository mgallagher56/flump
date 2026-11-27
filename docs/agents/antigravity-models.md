# Antigravity CLI: which models, for which work

The rules for using the Antigravity command line tool (`agy`) for coding work in this repository: which of its models do which work, how a run is set up and checked, and how its work reaches `main`. First written by the coordinator on 27 November 2026 and updated after the first two real tasks (PRs 972 and 976).

Decisions: AM1 to AM6 (section 9) were accepted as recommended by the owner on 27 November 2026 ("Accept all six").

## 1. What this covers

The owner approved using `agy` for coding work on 27 November 2026, under the normal review process. Agents working inside Antigravity read [`AGENTS.md`](../../AGENTS.md) and [`.agents/rules/working_rules.md`](../../.agents/rules/working_rules.md) as well as this page; the session that manages an Antigravity run follows sections 6 and 7 here.

## 2. What is known, and how

- `agy` 1.5.18 is installed and signed in on the owner's Mac.
- Quota shows two separate meters: "Gemini Models" and "Claude and GPT models". Each has a five-hour limit and a weekly limit. The "Claude and GPT models" meter shows a reset date of 1 January 1970, which is a placeholder; that pool's real limits are not known, and nothing here uses it (AM3).
- The models on offer (section 3) come from `agy`'s own output, not from memory.
- Two real tasks have run through it (PR 972, a review-fix round on mobile switch contrast; PR 976, the sign-in email in Settings, Security). What they taught is in section 7.
- The quality claims in section 3 are still from Google's documentation and third-party write-ups, with second-hand benchmark figures. Our own results replace them as more tasks run (section 10).
- How Google uses prompts and code on this plan is set in the owner's own Antigravity privacy and training settings (AM5). The repository is public, so the code itself is not sensitive.

## 3. The models on offer

| Model                                | Effort levels                    | What Google says it is for                            | Status                       |
| ------------------------------------ | -------------------------------- | ----------------------------------------------------- | ---------------------------- |
| Gemini 4 Neon                        | Low, Medium, High, XHigh         | Complex coding; the default model and default planner | Current                      |
| Gemini 4 Carbon                      | Low, Medium, High                | The hardest, longest tasks                            | Current                      |
| Gemini 4 Hydrogen                    | Low, Medium, High, XHigh         | Fast everyday work; the default executor              | Current                      |
| Orchestrator (Neon or Carbon)        | Fixed, not adjustable in the CLI | Planner plans and reviews, Hydrogen edits and tests   | Current                      |
| Gemini 4 Argon, Orchestrator (Argon) | Low, Medium, High                | Sustained reasoning                                   | **Removed 30 November 2026** |
| Gemini 3.8 Flash                     | Low, Medium, High                | Not stated                                            | **Removed 30 November 2026** |
| GPT-OSS 120B                         | Medium                           | Not stated                                            | **Removed 30 November 2026** |
| Claude Opus 5.5, Claude Sonnet 5.5   | Low, Medium, High                | Not stated                                            | Current, separate quota      |

Three entries above (Argon with its Orchestrator, 3.8 Flash and GPT-OSS 120B) are removed on 30 November 2026.

Google's own guidance: Orchestrator is the recommended default for feature work, bug fixes, refactoring and multi-file debugging. Hydrogen alone is for small maintenance with no planning step. A single large model is for work where every step needs full depth. Google also says to start with Hydrogen or Neon and move to Carbon only when a task gets stuck.

One third-party index puts Neon ahead of Carbon and Hydrogen for coding agents (59, 55, 52). Google reports that Neon writes more secure code than Carbon on its security benchmark. Treat both as indications only.

## 4. Which model for which work

| Work                                                                                                  | Model                                                            | Why                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Default for coding tasks                                                                              | `Orchestrator (Neon)`                                            | Google's recommended default; the planner checks the executor's work before it reports |
| Small mechanical tasks: renames, boilerplate, tests for well-defined functions, docs, a narrow CI fix | `Gemini 4 Hydrogen (Medium)`                                     | Cheapest on quota; no planning step needed                                             |
| A task that failed once on the default, or needs depth at every step                                  | `Gemini 4 Neon (High)`                                           | One strong model throughout                                                            |
| A task still stuck after that                                                                         | `Gemini 4 Carbon (High)`, once, then it returns to a Claude lane | Google's stated escalation; no third attempt                                           |
| Never                                                                                                 | Argon, 3.8 Flash, GPT-OSS 120B                                   | Removed on 30 November 2026                                                            |
| Never                                                                                                 | Claude models inside `agy`                                       | See below                                                                              |
| Never by default                                                                                      | Any `XHigh` level                                                | Quota cost with no evidence yet that it pays                                           |

**Why not the Claude models inside Antigravity.** The point of adding Antigravity is a second model family. Our reviewers are Claude models. Code written by Gemini and reviewed by Claude gets a genuinely independent second look; code written by Claude inside `agy` does not, and Claude already runs here under our own guardrails.

**Effort.** The owner's standing cap for Claude roles is medium. AM2 allows High for the two escalation rows above and for the Orchestrator, whose effort Google fixes (its release notes say it defaults to high).

**Quota.** Runs are expensive on the Gemini pool. On PR 976, two full Orchestrator runs used about 55 points of the five-hour pool (69% left before, 15% after) and a short Hydrogen run used about 1. Plan for no more than two Orchestrator runs per five-hour window, and use Hydrogen for follow-up fixes. When the pool runs out, wait for the refresh (AM4).

## 5. What Antigravity gets, and what it never gets

Good fits: self-contained tasks with a clear finish line and tests that can prove the result. Examples: a contained refactor, a UI component with stories and tests, test coverage for existing code, marketing page work from an approved design, documentation.

Widened by the owner on 27 November 2026: asked "May Antigravity also be given sign-in, encryption, money and migration tasks?", he answered "Yes, allow them". So it may be given:

- Sign-in, sessions, the app lock, the offline cache and cryptographic code.
- Tax and money arithmetic.
- Database migrations.

The safeguards on that work are the ones every agent already has, and they do not relax:

- A `security-reviewer` pass (Claude opus) on anything touching sign-in, sessions, stored data or cryptography, as well as the independent code review.
- Any change to a figure is its own commit, signed off by an independent Fable decider and recorded as `fable-decider`. Shared money code moves by the S5 method.
- The coordinator reads every migration before it merges.
- A device check where the change can only be proved on a device.

Never given to Antigravity, whatever the model:

- A task whose purpose is to change a guard: laws, CI checks, mutation floors, scanner settings.
- Anything needing secrets, `.env` files, the test account's password, Railway, WorkOS settings or the owner's sheet. It works on the code, never with real credentials or real data.
- Data deletion against a real environment.
- Device checks on the emulator or simulator.
- Review of its own work, or of anyone else's work as the only reviewer.

## 6. How a run is set up

Owner, 27 November 2026: Antigravity is managed from its own session or agent, never from the coordinator session. That manager session writes or refines the brief, runs Antigravity, checks its work and reports to the coordinator, who still reviews, device-checks and merges.

Widened by the owner on 27 November 2026: "allow antigravity to have some more permissions to edit any files it decides and allow it to commit and push as it wants to".

**The command.** Each run starts from the task's own git worktree, never the main checkout:

```sh
agy --model "<model>" --sandbox \
  --settings '{"permissions":{"allow":["command(regex:^git push origin <branch>$)"]}}' \
  --print-timeout 50m -p "<brief>"
```

- The settings key is `permissions` (plural); `permission` fails.
- The one allow rule is an anchored regex for the task's own branch. A prefix rule would also match a refspec such as `<branch>:main`.
- The rule is passed for that run only; nothing is saved.
- Runs use the default headless mode with `--sandbox`. `--mode auto` is not available on this account, and `--mode accept-edits` stops commit and push from working in a worktree. Never `--dangerously-skip-permissions`.
- In the default headless mode Antigravity decides for itself when a command may run outside the sandbox; commit and push only work that way from a worktree. The owner chose this on 27 November 2026: asked "keep its sandbox and have the manager commit and push, or let it leave the sandbox?", he answered "Let it leave". Anything needing approval that it does not take is soft-denied; the run does not hang.

**Saved permissions.** A user-level saved permissions file for Antigravity adds its allow rules to every run, whatever the command line says. Before each run the manager checks whether one exists and reports the rules it holds, without printing any secret in it.

**The brief.** Every brief opens with these rules:

- Work only in this git worktree and its branch. Change nothing outside it, and never touch the main checkout, including its `.npmrc`.
- Never push to or touch `main`; never merge; never open or touch a release PR.
- Never read or print `.env` files, keychains, tokens or credential folders.
- Call no outside host. The only network use is the push and what the project's own commands (bun, turbo, biome, jest) need.
- Install no global tools.
- Push with exactly `git push origin <branch>` as a single plain command, never chained with `&&` or anything else, and never forced.
- In its own data folder, read only the output files of its own background commands for the current run, and nothing else there.
- In the report, list every command run outside the sandbox, and why.

**After each run** the manager:

- Lists every out-of-sandbox command from the CLI log (the safety monitor's flags for that run) and cross-checks it against Antigravity's own list. Anything outside the brief stops the work and goes to the coordinator.
- Checks from its own worktree that only the task's branch, its remote branch and the task worktree's HEAD moved during the run.
- Confirms no `.env`, keychain or credential access, no outside hosts, and that the main checkout's `.npmrc` is unchanged.
- Records the quota meters before and after.

## 7. What the first two tasks taught

- **The setup in section 6 works.** Antigravity committed and pushed its own work on both tasks with the single anchored push rule.
- **It will leave the sandbox.** On PR 972 it ran knip outside the sandbox after a permission error, with nothing approving that explicitly. On PR 976 the out-of-sandbox commands were ordinary project work (installs, tests on loopback, `check:laws`, knip, type checks, git commit and push), all inside the brief. It also read its own task output under its data folder, which is now allowed for the current run only. Hence the after-run log check, every time.
- **Quality.** The independent reviews found careful root-causing (PR 976 traced an empty email to a missing claim in the access token) and good log hygiene (logs carry only error class, code and status). They also found what it missed: the cost angle of a new endpoint that calls an outside service (the security reviewer caught that the general rate limit allowed too many calls, and a tighter class was added), and the scanner rule against literal ids in tests (CI's Semgrep flagged two hardcoded sample ids, fixed by building them at runtime with no suppression). Briefs for similar work name both.
- **Quota.** See section 4: about 55 points of the five-hour pool for two full Orchestrator runs.

## 8. How its work reaches main

1. The manager writes the brief, as for any lane: the task, what done looks like, the rules in section 6.
2. It runs as section 6 describes.
3. It reads `AGENTS.md` and `.agents/rules/working_rules.md` first. Those already bind agents in the Antigravity editor.
4. It may edit any file the task needs: there is no per-task folder limit. A change to a guard (laws, CI, tsconfig, mutation floors, scanner settings) is still listed in the PR for the coordinator to sign, as for every agent.
5. It commits and pushes to its own branch as it sees fit, and may open its own pull requests.
6. What does not change, because these are the owner's standing rules for every agent: it never pushes to `main`, never force-pushes any branch but its own, never merges, never touches a release PR, never reads or prints secrets or `.env` files, and adds no scanner suppressions.
7. The PR says plainly that Antigravity wrote the change and names the model, under "Review".
8. Review is unchanged: an independent Claude opus reviewer that wrote none of it, plus the security or UI reviewer where the files call for one. The coordinator reads every migration and signs off any guard change.
9. CI fully green, then the coordinator merges by rebase. Release PRs stay the owner's.

## 9. Decisions

Accepted by the owner on 27 November 2026.

|     | Decision                                                                                                       | Ruling                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| AM1 | The model table in section 4                                                                                   | Accepted                                                                                                                  |
| AM2 | Effort: allow High for the two escalation rows and the Orchestrator's fixed setting, or hold to the medium cap | Allow High there. Holding to medium would rule out the Orchestrator, since its effort cannot be set from the command line |
| AM3 | Never use Claude models inside Antigravity                                                                     | Accepted                                                                                                                  |
| AM4 | When Gemini quota runs out: wait for the refresh, or spend paid credits                                        | Wait. Credits are money, so this is the owner's setting ("AI Credit Overages: Never"); no agent changes it                |
| AM5 | Data use: the owner checks his Antigravity privacy and training settings                                       | An owner action; the repository is public, so the code is not sensitive                                                   |
| AM6 | Start with one trial task before regular use                                                                   | Accepted. The trial ran on `Orchestrator (Neon)` and was reviewed as normal (section 7)                                   |

## 10. To revisit

- After about five tasks: replace the second-hand claims in section 3 with our own review results per model.
- On 30 November 2026, when Argon, 3.8 Flash and GPT-OSS 120B are removed: confirm the model list against `agy`'s own output.

## Sources

- `agy` 1.5.18: its model list, `/usage` output and release notes.
- Google, "Choose a model": https://antigravity.google/docs/models/
- Google, Antigravity plans: https://www.antigravity.google/docs/plans
- Google, Antigravity permissions and sandbox (CLI): https://antigravity.google/docs/permissions?tab=cli and https://antigravity.google/docs/sandbox?tab=cli
- Google, "Introducing Gemini 4 Neon": https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/
- Google, "Introducing Gemini 4 Hydrogen": https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/
- Third-party comparison (coding index figures): https://plotly.com/blog/gemini-4-neon-vs-carbon-vs-hydrogen/
