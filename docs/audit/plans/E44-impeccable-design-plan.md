# E44. Impeccable design skills: install, audit, improve, rework

> **Status: plan for owner approval. No code, nothing installed.** Written 2026-11-27. Owner request: "create an epic to install impeccable design and use skills to audit, improve and rework the design of the project".

**Decisions: open** (ID1 to ID9, section 12).

## 1. Purpose

Install the Impeccable design skill pack safely, then use it to audit the marketing site, the web app and the mobile app, fix what the owner agrees to fix, and rework the places where structure is the problem. Every finding is judged against Flump's own approved design, not the pack's taste.

**What it is not.** It does not replace the owner's design rulings (DECISIONS, 24 and 27 November 2026), the rewritten rules (STYLE-GUIDE 2.7, 8.3, 11.2 and 14; UX-GUIDELINES 12) or the rollout plan (`docs/design/motion/ROLLOUT-PLAN.md`). Order of authority: owner decisions, then the laws in `AGENTS.md`, then `docs/ux`, then any tool. No finance shaming, WCAG AA, en-GB with no em dashes, and no change to any figure or tax output.

## 2. Verified facts

Read on 27 November 2026 from `pbakaus/impeccable` at tag `skill-v4.11.1` (commit `2fc5e1459efbbf06d92c7306517c286bf12490cf`) and from npm. Nothing was installed.

| Topic | Fact |
| --- | --- |
| Licence | Apache-2.0. `NOTICE.md`: the iOS and Android reference files are distilled from an MIT project. It started from Anthropic's frontend-design skill |
| Versions | Three lines tagged separately: skill 4.11.1, CLI 4.11.1, Rust engine 0.1.31. npm `impeccable` 4.11.1 was published on 26 November 2026, inside Flump's 7-day `minimumReleaseAge` (`bunfig.toml`). Releases are very frequent |
| What installs | One skill (`SKILL.md`, about 50 reference files, `scripts/`), 5 subagents (each pinned to `model: inherit`), working files under `.impeccable/`, and `PRODUCT.md` and `DESIGN.md` at the project root |
| Engine | `scripts/impeccable` is a launcher. With no binary present it downloads one from the pack's GitHub releases into `~/.impeccable/bin/<ver>/` and checks its sha256 against a checksums file in the skill |
| Hooks | Three in Claude Code: SessionStart (5 s), PostToolUse on Edit and Write (5 s), Stop (30 s, full rule set on touched UI files). They run outside model approval, unsandboxed, with the agent's environment and network. They never block an edit. With local hook consent, `impeccable context` re-adds missing hook entries by itself |
| Per-session command | The skill tells the agent to run `scripts/impeccable context` once per session, which loads `PRODUCT.md` and `DESIGN.md` (and may fetch the engine on first use) |
| Network | The engine download; a fetch of visual directions from the impeccable.style catalogue when a new design starts, which telemetry off does not stop |
| Telemetry | On by default (directions shown and picked). Off by `DO_NOT_TRACK=1`, `npx impeccable telemetry off` or `"telemetry": false` in `.impeccable/config.json` |
| Live mode | A dev-server overlay. Its Apply can start the `claude` or `codex` CLI with approvals and sandbox off. `IMPECCABLE_LIVE_COPY_AGENT=off` prevents that |
| Detector | 62 fixed rules, no model, no key. Source files get pattern rules only; contrast, tiny text and other rendered rules need a URL and use installed Chrome or Edge. Output as text, JSON, GitHub annotations or SARIF. Ignores by config, by inline comment or by value |
| Native | With the platform set to iOS, Android or adaptive, `audit` and `adapt` read React Native source. The detector, live mode, `generate` and the edit hook are web-only |
| Agents | Claude Code, Cursor, Codex CLI, GitHub Copilot, Gemini CLI and about 15 more; the hook on six of them |
| Updates | `npx impeccable update`, the plugin marketplace, or a submodule update. The launcher is pinned to its checksums file |

**Not verified:** the privacy page; whether the engine binary makes other network calls (its source was not audited); the `npx skills add` route; whether the plugin marketplace updates by itself; the browser extension (out of scope). Also not verified here: whether `detect <url>` can reach a signed-in page; whether one ignore can be limited to named files for one rule; whether `DO_NOT_TRACK` set in `~/.zshrc` reaches sessions started from the desktop app; how the pack falls back when no image generation is available.

## 3. Slice 0: evaluate and install (owner decision)

### 3.1 Security and fit review (a lane, read-only, nothing installed)

The `security-reviewer` agent (opus) and a Fable decider review the pinned commit and write `docs/design/impeccable-audit/00-review.md`. They cover:

- What each script and hook runs, and with which environment. Lane sessions hold tokens (GitHub, Railway, the WorkOS test secret), so an unsandboxed hook with network access is a security exception and the owner's to approve.
- The engine download: source, checksum, and what the binary can reach.
- Telemetry and the catalogue fetch: what leaves the machine. The repo is public, but lane prompts and local files are not.
- Live mode's permission bypass.
- Model choice against AGENTS.md section 6. The pack's 5 agents pin `model: inherit`, and `critique` spawns two sub-agents with no model on web surfaces, which `.claude/hooks/require-model.sh` refuses. So the audit lane passes `model: opus` on each spawn.
- Unasked use. The skill's description is broad (design, redesign, critique, audit, polish), so any UI lane might invoke it. Rule: only E44 lanes invoke it, until ID9 says otherwise.
- Licence fit if any pack file is committed: Apache-2.0 needs `LICENSE` and `NOTICE.md` kept with the copied files, the MIT-derived files noted, and a line in `docs/legal/third-party-licences.md`.

### 3.2 Install routes compared

| Route | In lane sessions | In the public repo |
| --- | --- | --- |
| (a) Project install, committed | Hooks in `.claude/settings.json` fire in every lane and worktree: a 5 s check after every edit, up to 30 s at every stop, unsandboxed, in parallel lanes. First edit may download the engine | About 60 third-party files plus hooks committed; licence files needed; every update is a large diff |
| (b) User-level, owner's machine only | Skill visible to every session on that machine; with no hook, nothing runs until a lane calls the skill, and only E44 lanes do (section 3.1) | Nothing third-party committed. Only our own `PRODUCT.md` and `.impeccable/config.json` |
| (c) Plugin marketplace | Ships the hooks in the plugin; self-update not verified | Nothing committed, but no pin we control |
| (d) Pinned submodule plus `link`, no hooks | Each worktree must fetch a 5,000-file submodule; `link` runs the npm CLI | A pointer to a commit only; the pin is visible and reviewed in PRs |
| (e) Detector only, pinned, in a scratch folder | Nothing in sessions; one lane runs it on demand | Nothing committed |

### 3.3 Recommendation

Route (b) by manual copy at the pinned commit, with no hooks and no npm step. It carries the detector launcher too, so it covers (e). Reasons: no code runs unless a lane asks for it; nothing third-party enters the public repo; the pin is an exact commit; undo is deleting two folders. Cost: the 5 pack subagents are not installed, and the set-up is not reproducible on another machine (there is only one). If Slice 6 keeps the detector in CI, move to a pinned binary then. Routes (a) and (c) are rejected because of the hooks.

### 3.4 Pin, updates and switches

- **Pin:** skill 4.11.1 at the commit above. Install on or after 3 December 2026, so the release is 7 days old.
- **Updates:** never automatic. An update is a new review of the diff between two commits, at least 7 days after release, then the owner repeats section 3.6. The installed commit is recorded in this plan.
- **Telemetry off** by `DO_NOT_TRACK=1` and by `"telemetry": false` in our config. **Live mode is not used**, and `IMPECCABLE_LIVE_COPY_AGENT=off` is set anyway.
- **Hook consent is never given.** No lane writes `hook.consent`, and a PR that touches `.claude/settings.json` for the pack is refused.
- The commands that start a new design (`shape`, `generate`, `live`) are not used in Slices 2 to 4, so the catalogue is not fetched. Slice 5 flags any use to the owner first.

### 3.5 Which tool is used for what

| Tool | Job |
| --- | --- |
| `ui-compliance-reviewer` | Stays the pre-PR gate for every UI change: the laws in AGENTS.md sections 1 to 4 and 10 |
| `frontend-design` | Building new UI in lanes, as now |
| `design-skills` (design-critique, accessibility-audit, interaction-design, ux-writing) | Judgement reviews, and the mobile audit where the pack cannot run |
| Storybook a11y (required), Visual regression and Accessibility gate (advisory), E38 harness | Stay the automatic checks |
| Impeccable `critique` and `audit` | This epic's audit: a second, scored opinion per surface |
| Impeccable detector | Fixed-rule scan of source and public pages; a candidate check in Slice 6 |

### 3.6 Install steps (the owner runs these; no lane does)

Run in Terminal, not in a Claude session.

1. **Fetch the pack.** Run: `git clone https://github.com/pbakaus/impeccable.git ~/tools/impeccable-src` then `git -C ~/tools/impeccable-src checkout 2fc5e1459efbbf06d92c7306517c286bf12490cf`. You should see "HEAD is now at 2fc5e14". Check: `git -C ~/tools/impeccable-src rev-parse HEAD` prints the full commit. Undo: `rm -rf ~/tools/impeccable-src`.
2. **Copy the skill only.** Run: `mkdir -p ~/.claude/skills` then `cp -R ~/tools/impeccable-src/.claude/skills/impeccable ~/.claude/skills/impeccable` then `cp ~/tools/impeccable-src/LICENSE ~/tools/impeccable-src/NOTICE.md ~/.claude/skills/impeccable/`. Check: `ls ~/.claude/skills/impeccable` lists `SKILL.md`, `reference` and `scripts`. Undo: `rm -rf ~/.claude/skills/impeccable`.
3. **Switch off telemetry and live copy.** Add two lines to `~/.zshrc`: `export DO_NOT_TRACK=1` and `export IMPECCABLE_LIVE_COPY_AGENT=off`. Open a new Terminal window. Check: `echo $DO_NOT_TRACK $IMPECCABLE_LIVE_COPY_AGENT` prints `1 off`. Undo: delete the two lines.
4. **First run of the engine.** Run: `~/.claude/skills/impeccable/scripts/impeccable detect --list-rules` (the Slice 0 review confirms this exact form). You should see one download, then a list of 62 rules. Check: `ls ~/.impeccable/bin` shows one version folder. Undo: `rm -rf ~/.impeccable`.
5. **Confirm no hooks.** Run: `grep -c impeccable ~/.claude/settings.json` and the same on the repo's `.claude/settings.json`. You should see `0` for both, or "No such file". If anything asks about a hook, answer no. Undo: not needed.
6. **Tell the coordinator** the commit from step 1. The coordinator records it here.

## 4. Slice 1: teach it Flump

One docs PR from one lane (docs only: `bun run lint`, `bun run check-types`, `bun run check:laws`, which includes the Markdown em dash check).

- **`PRODUCT.md` at the repo root, committed, short.** Written by hand from the `init` headings, not by the interview. It points to the sources and does not restate them: STYLE-GUIDE (2.4, 2.7, 3.1, 8 to 8.3, 11 to 11.2, 14), UX-GUIDELINES (12, 12.1, 12.2), CROSS-PLATFORM, DECISIONS (D1 to D6 of 27 November 2026) and the rollout plan. Platform: adaptive. It states the precedence line from section 1, the no-shaming rule (neutral language; renting is not lesser than owning; colour never judges, MC2), WCAG AA, and that figures never change.
- **`DESIGN.md`:** run `document` once in the audit lane and read the result. Recommendation: do not commit it. `docs/ux` and `packages/tokens/src/index.ts` are the one home for design values, and a generated copy would drift. Revisit only if Slice 6 keeps the detector's design-system rules (ID5).
- **`.impeccable/config.json`, committed:** telemetry false; no live config. Caches and screenshots go in `.gitignore`.
- **Conflict table.** Every ignore is a scanner suppression: owner sign-off first, listed under "Guard changes" in the PR (ID6). Until signed, the audit runs every rule and triage marks the hits.

| Pack opinion | Flump position | Resolution |
| --- | --- | --- |
| `overused-font` flags Inter and Plus Jakarta Sans | The two approved fonts (STYLE-GUIDE 3.1) | Rule ignored, with reason and sign-off |
| `ai-color-palette`: violet gradients, cyan on dark | Violet and rose on orbs only (MC1); Midnight is teal on dark | Ignored for orb and bubble-field files and for the Midnight token values; kept elsewhere, where a hit is also a breach of MC1 |
| `radial-halo`, `radial-spotlight-glow`, `dark-glow` | Orbs, bubble fields and the hover light are approved (2.7, 11.2) | Scoped out for those marketing primitives only; a finding anywhere else |
| "Glass and blur as decoration" (skill text) | Glass cards approved; in the apps only on cards with no figure (tier A) | Stated in `PRODUCT.md`; findings against glass as such are rejected, glass on a figure card is ours to fix |
| "Cards are the lazy container", `nested-cards` | No ruling approves nested cards | Accepted as findings, judged case by case; the "lazy" remark never rates above P3 |
| `kicker-above-heading`, `hero-eyebrow-chip` | No uppercase eyebrows, no letter-spaced labels (STYLE-GUIDE T6) | Aligned: accepted as findings |
| `icon-tile-stack` | Every section header opens with an icon tile (STYLE-GUIDE 12.5); home section card icon tiles are approved (MC1) | Ignored for section headers and those tiles, with sign-off; a finding elsewhere |
| `pulsing-dot` | Nothing loops in the apps but the spinner and skeleton pulse (UX-GUIDELINES M5) | Accepted as a finding; the two approved loops are rejected hits |
| `shape-assembled-illustration` | Document cards are shape lists by ruling (8.3, IL4) | Ignored for illustration files, with sign-off |
| `gpt-thin-border-wide-shadow` | Glass has a soft border (STYLE-GUIDE 2.7); paper a soft shadow (8.3) | Judged against the elevation tokens, case by case |
| Motion: one authored moment, exponential ease-out | Calm scale; tiers A to C; lists in 11.1 and 11.2 | Ours wins; motion is reviewed against STYLE-GUIDE 11 only |
| `bounce-easing`, reduced-motion path, `em-dash-overuse`, `low-contrast`, `skipped-heading`, `tiny-text`, `line-length`, `gradient-text`, `cream-palette` | Aligned | Accepted as findings |

## 5. Slice 2: audit (read-only)

Nothing changes in this slice. One audit lane (opus), with the pack's commands and the detector.

| Surface | When | How |
| --- | --- | --- |
| Web app: Home, Accounts, Budget, Debt, Forecast, Savings, Pension, Retirement, Mortgage, Mortgage estimates, Take-home, Tax, Self Assessment, Invoicing, Imports, Profile, Onboarding, Invites, login, signup, terms acceptance, tools | Now | `critique` and `audit` per screen from a seeded persona; detector source scan of `apps/web` and `packages/ui`; detector by URL against the local dev server for the public screens. Light and dark, 375 and 1280 |
| Marketing: Home, Features index, five area pages, AI connection, Pricing, Preview, Security, Contact, the four legal pages, Not found | After each of M1 to M5 merges, for the pages that slice ships | The same, by URL so the rendered rules run. Pages M1 to M5 are about to replace are not audited on `main` |
| Mobile (`apps/mobile`) | Now, repeated after S9b | The native `audit` reading the React Native source. The detector, live mode and the hook do not apply. The rest comes from the mobile UI law checks, the dev gallery (`apps/mobile/app/(dev)/gallery.tsx`), Maestro screenshots, CROSS-PLATFORM section 7 and `design-skills` |

If the detector cannot reach signed-in pages, their rendered checks stay with the existing axe and Storybook a11y jobs, and the report says so.

**Output:** one report per surface in `docs/design/impeccable-audit/` (`web-<screen>.md`, `marketing-<page>.md`, `mobile.md`), plus the raw detector JSON. Each finding has: severity P0 to P3; evidence (a screenshot path or `file:line`); the rule it breaks, named as ours (which law or rule id) or the pack's (which rule); and a proposed fix. A finding that rests only on the pack's taste is marked so.

## 6. Slice 3: triage with the owner

Each finding gets one outcome: **fix now**; **fold into a rollout slice** (named, for example W1 for material polish or S9b for mobile); **needs an owner design decision**; or **rejected**, with the reason and the ruling it conflicts with. A Fable decider checks the triage for rulings missed and for anything that would shame a user or weaken accessibility. The owner sees one summary table, not 40 reports.

## 7. Slice 4: improve

Fix PRs grouped by surface, few and large but reviewable: one for the web app's shared components, one or two for web screens, one for mobile. Marketing fixes ride with the M slices. Each PR:

- follows AGENTS.md sections 1 to 4 (colocated components, semantic tokens, `SimulatorSplitLayout`, `KpiStrip`);
- carries before and after screenshots in both themes at both widths;
- updates visual baselines on purpose and says which;
- changes no figure and no tax output, and makes accessibility no weaker (Storybook a11y green in light and dark);
- passes the pre-flight (`bun run lint`, `bun run check-types`, `bun run check:laws`, the changed packages' tests), then `ui-compliance-reviewer` and an independent opus review (AGENTS.md section 12).

## 8. Slice 5: rework

Where the audit shows the structure of a screen is the problem, no lane rebuilds it from a finding. A lane makes two or three prototypes on a branch that is never merged, the owner chooses, and only then is a build planned, as for the marketing home page (prototype 11 on `claude/marketing-motion-prototypes-66c08d`). Likely candidates are named by Slice 3, not here.

## 9. Slice 6: keep it

Two questions, decided after Slice 4 with real numbers on noise.

| Option | What it needs |
| --- | --- |
| Detector in `check:laws` or CI | A new guard: coordinator sign-off and a baseline that only shrinks. A pinned binary with a checksum, not `npx` in CI (third-party code, the 7-day rule). SARIF upload would need `security-events: write`, a security change for the owner. Start advisory, like Visual regression |
| A pack review in every UI lane's pre-PR review | Slower lanes and more noise. Recommendation: no; keep `ui-compliance-reviewer` as the gate and use the pack on request and for a quarterly audit |

## 10. Order and effort

Slice 0, then 1, then 2 for web and mobile at once. Slice 3 follows each audit wave. Slice 4 for the web app should land before or with W1, so W1 does not redo it. Marketing waves follow M1 to M5 one by one. F2 (tokens, in progress) should merge before Slice 1, since the conflict table names its tokens. Slice 6 is last.

| Slice | Agent-days |
| --- | --- |
| 0 Evaluate and install | 1, plus the owner's 15 minutes |
| 1 Teach it Flump | 1 |
| 2 Audit | 4 (web 2, mobile 1, marketing waves 1) |
| 3 Triage | 1 |
| 4 Improve | 6 to 9 |
| 5 Rework | 3 to 5 for each screen chosen |
| 6 Keep it | 1 to 2 |

## 11. Risks

| Risk | Check |
| --- | --- |
| Tool taste overrides owner rulings | The precedence line; the conflict table; "rejected" needs a cited ruling; the Fable check |
| Third-party code in agent sessions | No hooks; pinned commit; checksum; the Slice 0 review; owner installs |
| Hooks appear in every lane | Hook consent never given; PRs touching `.claude/settings.json` refused |
| Network and telemetry | Telemetry off twice; live mode off; design-starting commands unused |
| Churn against the rollout | Marketing audited only after each M slice; web fixes timed with W1 |
| Review noise | Advisory first; taste-only findings capped at P3; no blanket per-lane review |
| Frequent upstream releases | No automatic updates; each update is a reviewed diff after 7 days |
| A second source of truth | `PRODUCT.md` points to `docs/ux`; `DESIGN.md` not committed |

## 12. Owner decisions

| Id | Decision | Recommendation | Unblocks |
| --- | --- | --- | --- |
| ID1 | Use the pack, and by which route | Yes: route (b), manual copy, no hooks | Everything |
| ID2 | Pin and update rule | The commit above, installed from 3 December 2026; updates only after review and 7 days | Slice 0 |
| ID3 | Telemetry, live mode, design-starting commands | Telemetry off, live mode unused, those commands unused in Slices 2 to 4 | Slice 0 |
| ID4 | Allow the engine binary to be downloaded and run on your machine | Yes, once, checksum verified, after the Slice 0 review | Slices 0 and 2 |
| ID5 | Commit `PRODUCT.md`; commit `DESIGN.md` | `PRODUCT.md` yes, short and pointing to our docs; `DESIGN.md` no | Slice 1 |
| ID6 | The detector ignores in section 4 | Sign each when the Slice 1 PR lists it; none before | Slice 1, and Slice 6 as a check |
| ID7 | Audit scope and timing | Web and mobile now; marketing after each M slice | Slice 2 |
| ID8 | Detector as a standing check | Decide after Slice 4; advisory first, pinned binary, no SARIF upload | Slice 6 |
| ID9 | A pack review in every UI lane | No; on request and quarterly | Slice 6 |
