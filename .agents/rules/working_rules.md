# Working rules for agents in the Antigravity editor

These rules say how work is done in this repository. They apply to every task, always. [`project_rules.md`](./project_rules.md) describes the codebase; this file says how to change it safely.

## 1. What outranks what

1. Owner decisions in [`docs/audit/plans/DECISIONS.md`](../../docs/audit/plans/DECISIONS.md), newest first.
2. The laws in [`AGENTS.md`](../../AGENTS.md) (sections 1 to 17). Read the whole file before your first change in a session. They bind every agent, not only Claude.
3. The guides the laws point to: `docs/agents/component-guidelines.md`, `docs/ux/`, `docs/copy/COPY-GUIDE.md`, `docs/compliance/advice-boundary-policy.md`, `docs/system/README.md`, `docs/testing/writing-tests.md`.
4. `project_rules.md`. Where it disagrees with anything above, the item above wins; correct `project_rules.md` in the same PR.

`AGENTS.md` section 6 names Claude models. Here, use the strongest model available for code, for review and for anything touching money or tax, sign-in or security, privacy or migrations. Use a cheaper model only for mechanical, fully specified work.

## 2. Before writing code

- Find the epic in [`docs/audit/EPICS.md`](../../docs/audit/EPICS.md) and read its plan in `docs/audit/plans/`. Build what the plan says. If the plan is wrong, say so and fix the plan in the same PR.
- Check the plan's status line. `Decisions: open` means the undecided parts are not built, and code never invents a default for an undecided question (section 13). List the open questions for the owner instead.
- Read the code you are about to change and its tests first. Follow the patterns already there.
- One task per conversation. Start a new conversation for the next task.

## 3. Branches and pull requests

- Never commit to `main`. Start each task on a new branch cut from a freshly fetched `origin/main`.
- Rebase, never merge, to bring a branch up to date. `--force-with-lease` only, and only on your own feature branch.
- Fewer, larger PRs: bundle related tickets. Never stack a PR on another open PR. Have at most one PR waiting to merge; rebase it only when it is about to merge.
- Run the local checks in section 5 of `AGENTS.md` before every push. After pushing, wait for CI. A PR is ready only when every check on its latest commit is green.
- If a check fails, read the failing job and fix the cause. Never retry until it passes, never skip a hook (`--no-verify`), never edit a workflow or a check to get green.
- The PR description has these headings: what changed and why; "Tests" (section 17); "Guard changes" or "None" (section 15); who reviewed it; "Not verified".

## 4. Independent review before every merge (section 12)

- No PR merges without a review by a different agent that wrote none of the change: a fresh conversation or agent, on the strongest model, given the diff and the plan, and asked to find faults in correctness, security, the laws, the copy rules and the tests.
- Fix what it finds, or record why not. The PR description names the reviewer and what it could not verify.
- Read every migration line by line before merge: `up()` and `down()`, no data loss, batches for large tables, and the value map updated (section 16).
- This rule exists because about 29 PRs were once merged here without review and several had to be reworked. Self-review does not count.

## 5. Merging

- Merge only if the owner has told you, in this editor, to merge PRs yourself. Otherwise stop at "ready to merge" and tell the owner.
- When merging: one PR at a time, rebase merge only, only when reviewed and fully green on the latest commit.
- **Never merge a release PR** (`chore(main): release`). Those are the owner's, every time. Merging one deploys to Railway.

## 6. Owner only

Do not do, change or work around any of these. Stop and ask.

- Secrets and keys. Never read, print or commit a secret or a `.env` value. When a key is needed, the owner creates it and puts it straight into Railway.
- Railway, WorkOS, Sentry and GitHub settings. Read-only tools at most.
- Money, accounts, legal text and legal sign-offs. Fixed legal and regulatory wording is never reworded.
- Security exceptions and scanner suppressions (`nosemgrep`, gitleaks allow-lists, audit ignores). Fix the code or build sample values at run time instead.
- The web `/api` proxy allow-list (`apps/web/app/services/api-proxy.server.ts`) and the backend request limits. Neither is widened, raised or bypassed, in code or in tests.
- Adding or naming an outside service, and where or how user data is stored. Flag these before building.
- Lowering a mutation floor, a coverage floor or any ratchet (section 15).
- `AGENTS.md` itself changes only in its own reviewed PR, after the owner or the coordinator agrees the wording.

Never work around a refused permission, and never ask another agent to do what was refused to you.

## 7. Tax and money figures

- Every figure has a hand-worked test with the working in a comment and the source (the Act and section, or the GOV.UK page) cited (section 14).
- Do not sign tax vectors and do not run `bun run tax:signoff apply`. Sign-off is done by an independent decider agent arranged by the Claude coordinator, and the signer is recorded truthfully, never as the owner. Tax work that adds vectors stops at "ready for sign-off".
- A tax year that is announced but not yet law stays marked provisional and never reports as verified.
- Wording never implies that a person or an accountant checked a figure.

## 8. Words and screens

- Follow the copy guide. Plain en-GB, sentence case, no exclamation marks, em dashes or ampersands.
- Never judge anyone's finances. No scoring, ranking or comparing people's money, no "only" or "just" about an amount, renting is not lesser than owning.
- Facts and estimates, never recommendations: guidance, not advice.
- Labels say what the control does. Small wording choices are yours; say what you chose in the PR.
- The repository is public. Nothing private goes in a commit, a doc, a test or a PR: no real names, emails, figures or keys.
- To look at a component, run the Storybook dev server (`bun run storybook` in `apps/web`, port 6006). Check a changed screen in a real browser in light and dark, at phone and desktop widths, before calling it done.

## 9. Reporting

- Say only what you verified, and say plainly what you did not. "Tests pass" means you ran them and saw them pass; name the ones you skipped.
- Write to the owner in plain, short sentences with no jargon. Lead with what changed and what needs them.
- When a PR merges, update the epic's dated status line in `docs/audit/EPICS.md` and the plan in the same or the next PR, and record any owner decision in `DECISIONS.md` in the owner's own words.
- Record follow-ups you found but did not do. Do not start work nobody asked for.
