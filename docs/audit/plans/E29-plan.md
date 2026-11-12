# E29 Advice-boundary and AI compliance gate: implementation plan

> **Round 4 overrides** (see [DECISIONS.md round 4 and its addendum](DECISIONS.md)). Where they conflict with the text below, these win:
> - The timing split (E29a/E29b) is recorded in DECISIONS round 4 (Fable 5).
> - OD1 A, OD2 A, OD3 A (the context pack is gated).
> - T8: the flag is **`MCP_OPEN_ACCESS`** (true opens MCP to everyone; false or unset in production means allowlisted users only), used with `MCP_ALLOWED_USER_IDS`. `MCP_ENABLED` stays E20-N18's global kill switch. T8 creates `readMcpAccessConfig(env)` in `apps/backend/src/mcp-access.ts`, which E20-N18 reuses. Check order: kill switch (503), then auth, then allowlist (404). Owner step 3 becomes: set `MCP_ALLOWED_USER_IDS=<owner id>` and leave `MCP_OPEN_ACCESS` unset. Never set `MCP_ENABLED=false` for this.
> - T3 owns `apps/web/app/copy-guard.test.ts` (E25-T9 makes no edit). `TaxTrapCalculator` allow-list entries belong to E25-T11, not E15.
> - T5: the `financial-audit.tool.ts:113` one-liner lands after E17-N1 and N3, and before E17-N11. If the engine work is ready first, ship it with a `topRecommendations` alias returning `[]`.

Status: READY FOR TICKETING, 2026-11-12. Written by the planner agent from the code at `06c520e0` on `claude/nifty-bun-defc71`. **The legal items here are pragmatic sequencing, not legal advice.** Every legal document this plan creates is marked "DRAFT, unreviewed, not legal advice" until the owner, and where marked a solicitor, approves it.

**Binding inputs.** DECISIONS.md rounds 1 to 3 apply. In particular:
- Round 3 item 9: the friends preconditions.
- Round 3 item 15: the legal sequence.
- Round 2 E17 D3-B: agent writes need the E19 DPIA first (conflict 5).
- Round 1 E7: the owner signs off all copy.

**Timing decision (fable, from the coordinator).** This settles the tension between the research ("perimeter view before friends") and round 3 item 15 ("Hub enquiry now, solicitor at launch"). E29 is split in two:

- **E29a** is all agent work and costs nothing. It covers copy rules, the advice-language guard, disclaimers, the MCP DPIA draft and a widened FCA Innovation Hub enquiry. It gates the friends beta, E25 copy and E26.
- **E29b** is the lawyer's perimeter view, bought as part of the fixed-fee solicitor engagement at launch. It gates public launch and E26 for non-friends.

**Gate minimums (binding).**

- **Before friends.** Everything in round 3 item 9, plus:
  1. An E29a copy pass, with advice-language patterns in `apps/marketing/src/claims.test.ts` and an equivalent for web.
  2. A widened Hub enquiry covering projections, salary-sacrifice and pension outputs, and LLM replies through MCP.
  3. MCP and PAT creation limited to owner-allowlisted accounts until the DPIA draft exists.
  4. A beta notice that says "guidance and calculations, not advice; unreviewed".
- **Before E25 copy ships.** The guard enforces the E29a rules. The E25 engine itself is not gated.
- **Before E26 ships to friends.** All of these must hold:
  - The owner has signed the DPIA draft.
  - Tool descriptions are worded as guidance.
  - Every response carries an "unverified" notice.
  - Evals show no personal product recommendations.
  - The Hub has replied, or 8 weeks have passed with no adverse signal.
  - An audit log exists (E17-N17).
- **Separate written FCA opinion.** Bought only if one of these happens:
  - bank connection goes public;
  - the Hub reply is adverse;
  - the solicitor will not cover the perimeter within the fixed fee;
  - E26 gains writes or names products;
  - charging starts.

## 1. What exists (evidence)

| Item | Evidence |
|---|---|
| Guidance-not-advice notice on projection pages (E19 A2/D8) | `52199223`. `packages/ui/src/patterns/ProjectionNotice/ProjectionNotice.tsx:9-10` holds the interim text `PROJECTION_NOTICE_TEXT`. It is used in the Debt, Mortgage, Pension, Savings, Tax and Budget containers, `sandbox.tsx` and `tools.$slug.tsx`. |
| Copy guard: only "guarantee" and "FCA", over web, marketing and mcp | `apps/web/app/copy-guard.test.ts:12-15`, scanning `:18-22`. It does not cover `packages/finance-engine/src` or `packages/ui/src`. |
| Marketing claims guard (E7 T14) | `apps/marketing/src/claims.test.ts:9-38`. It has no advice-language patterns. |
| MCP mortgage tool: the "Invest 100%" recommendation has gone, but a verdict remains | `packages/mcp/src/tools/mortgage-isa.tool.ts:88` (`recommendation:` key, now "Not applicable ... not advice"). `:131` has the `guaranteedInterestSavedGbp` key. `:143-146` has `favorsOption: "TAX_FREE_ISA_COMPOUNDING" \| "GUARANTEED_MORTGAGE_OVERPAYMENT"`. |
| Data map (E19 A4) | `cfcfc87c`, `docs/legal/data-map.md`. MCP outputs are "Not stored", the `mcp_tokens` row is hash-only, and the user's AI client is a data flow. |
| Bank-connect owner allowlist (pattern to copy for MCP) | `apps/backend/src/bank-connections.access.ts:16-44` (`isBankConnectionAllowed`, `BankConnectionsEnabledGuard`), used at `finance.controller.ts:24,174`. |
| PAT creation and context pack are ungated for any signed-in user | `apps/backend/src/mcp.controller.ts:49-68` (`POST mcp-tokens`) and `:80-87` (`GET mcp-tokens/context-pack`). The web card shows "not available yet" (`McpConnectionCard.tsx:100-111`, `bef3b851`), but the API is open. |
| No DPIA, perimeter brief, Consumer Duty doc or gate checklist | `docs/legal/` holds only `data-map.md`. The E19 plan defines B2 DPIA (`E19-plan-draft.md:379`) and B7 perimeter brief (`:387`, content at `:156-224`). Neither exists. |
| E19 C5 canonical disclaimers not built | `packages/finance-engine/src/disclaimers.ts` does not exist (planned at `E19-plan-draft.md:392`). |
| E17 harness not landed | `packages/mcp/src/__tests__/` and `testing/` do not exist. E17-N1 creates them (`E17-next-phases-plan.md:81-93`). N8 creates the envelope (`:190-208`), N22 the catalogue lint (`:406-412`) and N19 `docs/mcp/consent.md` (`:372-377`). None has landed. |

**Advice-language and segment-nudge inventory.** Hits for advice-style wording in source files, excluding tests and stories.

*Engine (flows into the UI, MCP and the context pack):*
- `packages/finance-engine/src/health-score.ts:59-174`. These are stage-specific `recommendations.push`. Examples:
  - `:83` "Prioritize ... Avalanche"
  - `:137` "Move low-yielding current account cash to a top-tier Cash ISA"
  - `:166` "Maximize remaining £20,000 UK ISA allowance"
  - `:174-176` "Sacrifice £X into pension to reclaim your £12,570 personal allowance"
- `:214` exposes them as `topRecommendations`.
- `:285-317` holds the stage headline and subline, e.g. "Stage 3: Build & Optimize ... optimize pensions, and eliminate mortgage interest". This is segment-based framing.
- Consumers:
  - `packages/finance-engine/src/ai-context-pack.ts:328,332,367`, served by `apps/backend/src/mcp.service.ts:262`;
  - `packages/mcp/src/tools/financial-audit.tool.ts:113`.
- `debt-payoff.ts:742` and `types.ts:205` define the student-loan `recommendation: "do_not_overpay" | "consider_overpaying"`.
- `uk-tax.ts:225` and `types.ts:329` define `recommendedSacrifice`.
- `section24.ts:84-117` and `types.ts:459` define `recommendedMonthlyTaxSetAsideGbp`. This is tax, not FCA, so low risk.

*MCP:*
- `packages/mcp/src/prompts/uk-advisor.prompts.ts`:
  - `:28` "Recommend the top 3 highest-impact ... actions"
  - `:39,53` "models optimal pension sacrifice ... maximize take-home wealth"
  - `:62-75` "crush-high-apr-debt ... aggressive ... fastest path"
- Tool descriptions:
  - `uk-tax-trap.tool.ts:53` "Simulates optimal pension salary sacrifice"
  - `financial-audit.tool.ts:22`, which lists the `STAGE_3_WEALTH_OPTIMIZE` stages
  - `financial-audit.tool.ts:146` "should be voluntarily overpaid"

*Web (outside E15 lanes):*
- **Highest priority:** `apps/web/app/containers/pension/PensionContainer.tsx:446-457`, the "Actionable optimisation ... SIPP contribution" text and a "Reclaim Allowance (SIPP £X) →" button. Its `handleOptimizeTaxTrap` at `:366-376` **saves a new contribution percentage** through `handleSyncContributions`. That is a one-click nudge that changes data.
- `components/debt/UkDebtInstrumentsCard.tsx:423` ("Recommended Monthly Sinking Fund") and `:501`.
- `components/debt/PayoffStrategySwitcher.tsx:307`, `features/debt/components/PayoffStrategyControls/PayoffStrategyControls.tsx:109` and `components/debt/AddDebtDialog.tsx:154`.
- `features/sandbox/components/SandboxTemplates/SandboxTemplates.tsx:53,212`.
- `components/home/HomeFooter.tsx:100`.
- `routes/tools.$slug.tsx:279` ("whether you should ever make voluntary overpayments").
- `routes/_index.tsx:18`. E15 D11b deletes this page; skip it if that has happened.

*Web (E15 lanes; hand off, do not edit):*
- `components/dashboard/HomeDashboard.tsx:478-560`, the stage-based "Stage 1: Stabilize & Clear" hero banner.
- `containers/mortgage/MortgageContainer.tsx:290` ("optimise your savings strategy").

*packages/ui (E15 lane; hand off):*
- `calculators/StudentLoanCalculator/StudentLoanCalculator.tsx:141-182`, which reads `recommendation`.
- `patterns/CoachCard/CoachCard.tsx:21`, "next best step". It is not used yet; E15 D1 adopts it.
- `patterns/TaxTrapEscapeBanner`.
- `foundations/TypographyScale/TypographyScale.tsx:176`.

*Marketing:*
- `apps/marketing/src/components/Footer.tsx:93` ("pension optimisation").
- `pages/McpPage/McpPage.tsx:56`.
- `components/McpSpotlightSection/McpSpotlightSection.tsx:121,135`.

*Legitimate (permanent allow-list candidates):*
- `tax-rules.ts:52` "You should always consult a qualified tax adviser" (a disclaimer).
- `McpConnectionCard.tsx:580` "90 Days (Recommended)", a product setting that E17-N18 rewrites.
- `ConnectBankWizard.tsx:575` "Personal Access Token (Recommended)", a technical choice.
- "optimistic" in `debtSummary.ts:32` and `DebtContainer.tsx:116,410`.
- The Escape key in `Header.tsx:139`.
- Comments, such as `HomeDashboard.tsx:95`.

Note: `docs/copy-style-guide.md:29` makes "optimise" the house spelling. The guard must therefore ban advice contexts, not the word itself.

## 2. Tickets (E29a; one PR each)

Every ticket finishes with AGENTS.md section 5: `rtk bun run lint`, `rtk bun run check-types`, `rtk bun run test`, `rtk bun run build`, all with zero errors. Copy changes merge only on the owner's approval (E7). Laws touched are listed per ticket.

### E29-T1. Advice boundary policy (rules doc). S, sonnet.
- **Goal:** one numbered rule set that the guard, the MCP policy, E25 copy and E26 tools cite. It replaces ad-hoc wording.
  - **R1 Guidance framing.** Show results for the user's own figures, neutrally, with both options side by side.
  - **R2 No personal recommendations or imperatives** on investments, pensions, mortgages or debt. No "you should", "we recommend", "best option", "optimal", or "move/invest/put your ... into an ISA/SIPP".
  - **R3 No product types with qualitative judgements, and no named providers** (for example "top-tier Cash ISA").
  - **R4 No segment-based nudges.** A computed segment (lifecycle stage, persona, income band) may only choose which modules or widgets show by default. It never selects action text, a call to action or an order of priority. CoachCard content is limited to app-housekeeping tasks such as "add an APR" or "set your region", never financial actions. This is the targeted support boundary; the regime went live on 6 April 2026.
  - **R5 No one-click data-changing action prompted by a computed outcome.** "Model this" pre-fills a what-if and never saves.
  - **R6 Required notices.** These are `ProjectionNotice` on projection surfaces, the MCP notice in every tool result, and "unverified" on tax outputs (E17 D4-B).
  - **R7 MCP output policy** (see T6).
  - **R8 Allowed vocabulary.** Factual "optimise" in a heading about the user's own settings is allowed only if R2 is met. "Escape" reads as an outcome promise, so prefer "below £100,000".
  - Each rule comes with worked before/after examples taken from the inventory above.
- **Files:** NEW `docs/compliance/advice-boundary-policy.md`. Mark it "DRAFT v0.1, unreviewed; the E29b solicitor view supersedes it".
- **Depends on:** none. **Parallel-safe:** yes (docs only). **Laws:** none.
- **Verify:** owner reads and signs; section 5 (docs-only, so it is a formality).
- **Risk:** the rules may be stricter than the eventual legal view. That is acceptable, because loosening later is cheap.

### E29-T2. Copy inventory and owner review sheet. S, haiku gathers, sonnet classifies.
- **Goal:** a table of every hit in section 1, re-run at the time of the PR. Columns: path:line, string, rule broken, proposed rewrite, owning ticket or lane (T3, T4, E15, E17), and owner sign-off.
- **Files:** NEW `docs/compliance/advice-copy-inventory.md`.
- **Depends on:** T1. **Parallel-safe:** yes. **Laws:** none.
- **Verify:** spot-check 10 rows against the code; section 5.
- **Risk:** the inventory goes stale while E15 and E17 move. T3's guard ratchet becomes the live source of truth.

### E29-T3. Advice-language guard with allow-list (ratchet). M, sonnet.
- **Goal:** the automated guard required before friends and before E25 copy.
- **Lexicon:**
  - NEW `packages/finance-engine/src/compliance/advice-lexicon.ts`, exporting `ADVICE_PATTERNS: Array<{id, pattern, rule}>`. It has no dependencies and is exported from `packages/finance-engine/src/index.ts`; that append line in the barrel can conflict trivially with E17 lane A and E23.
  - Patterns (all `/i`, word-bounded so camelCase keys such as `topRecommendations` do not match):
    - `\byou should\b`
    - `\b(we )?recommend(s|ed|ation|ations)?\b`
    - `\boptimal\b`
    - `\boptimi[sz](e|es|ed|ing)\b` followed by ` (your )?(pension|ISA|savings|wealth|tax)`
    - `\bbest (option|choice|strategy|product|account|deal|move)\b`
    - `\bactionable\b`
    - `\b(move|put|invest|switch)\b.{0,40}\b(ISA|SIPP|pension|savings account)\b`
    - `\btop-tier\b`
    - `\b(highest|top)[- ]impact\b`
    - `\bmaximi[sz]e\b`
- **Guards:**
  - Web: `apps/web/app/copy-guard.test.ts` gets a second `describe`. `SCAN_DIRS` (`:18-22`) widens to include `packages/finance-engine/src` and `packages/ui/src`, which also catches E15's files without editing them.
  - Marketing: `apps/marketing/src/claims.test.ts` gets the advice rows appended to `BANNED` (`:9-38`), as the decision requires. The rows map to rule ids instead of E7 register rows.
  - Both strip `/* */` blocks and whole-line `//` comments before matching.
- **Allow-list:**
  - NEW `apps/web/app/advice-allowlist.ts` with entries `{file, patternId, kind: "permanent"|"temporary", reason, owner: "E29-T4"|"E29-T5"|"E15"|"E17-N11"...}`. Marketing gets its own small inline list.
  - The test fails on a new hit and on a **stale** entry, so the ratchet only shrinks. This is the same idea as `scripts/tabular-baseline.txt`.
  - It starts with today's hits, each assigned to its owning ticket.
- **Files:** as above. The test files are E19- and E7-owned, and no in-flight lane edits them.
- **Depends on:** T1. **Parallel-safe:** yes, apart from the barrel line. **Laws:** 4 (tests).
- **Verify:**
  - Add a sentence such as "You should move this to an ISA" to a fixture file and check it fails.
  - Check that removing an allow-listed hit fails as stale.
  - `rtk bun run --cwd apps/web test copy-guard` and `rtk bun run --cwd apps/marketing test claims`, then section 5.
- **Risk:** false positives, for example "recommended" for settings. These are handled by permanent allow-list entries with a reason, never by loosening a pattern.

### E29-T4. Web and marketing copy rewrite (non-E15 files). M, sonnet. Owner signs the copy.
- **Goal:** clear every temporary allow-list entry owned by T4.
- **Pension:** `PensionContainer.tsx:446-457` becomes a neutral statement: "Adjusted net income above £100,000 reduces the personal allowance. A contribution of £X would bring it to £100,000 in this estimate." The button becomes "Model this contribution", which pre-fills the what-if and **does not call `handleSyncContributions`** (R5, `:366-376`).
- **Debt and sandbox:**
  - `UkDebtInstrumentsCard.tsx:423`: "Recommended Monthly Sinking Fund" becomes "Monthly amount to spread the cost".
  - `UkDebtInstrumentsCard.tsx:501` follows T5's field rename.
  - `PayoffStrategySwitcher.tsx:307` and `PayoffStrategyControls.tsx:109` become factual descriptions of what avalanche does, without "Maximises".
  - `AddDebtDialog.tsx:154`.
  - `SandboxTemplates.tsx:53,212`.
- **Other web:** `HomeFooter.tsx:100`, `tools.$slug.tsx:279` and `_index.tsx:18` (if the page still exists).
- **Marketing:** `Footer.tsx:93`, `McpPage.tsx:56` and `McpSpotlightSection.tsx:121,135`. The sample payload key `escapedTaxTrap` becomes neutral.
- **Files:** the lines above, plus their existing tests where text is asserted.
- **Depends on:** T3 (so the ratchet proves progress) and T5 (for `UkDebtInstrumentsCard:501`).
- **Conflicts:**
  - Not E15 mortgage or dashboard, and not packages/ui.
  - `PayoffStrategyControls` is a feature component that E16 D10-B is adopting, so check for an open E16 PR.
  - Marketing files may be touched by E15 D11a. Rebase.
- **Laws:**
  - 2: rewritten amounts keep `tabular-nums` and `useFormatCurrency`.
  - 4: stories for any touched colocated component still render light and dark with zero a11y violations, including `PayoffStrategyControls.stories.tsx` and `SandboxTemplates.stories.tsx`.
  - Inline style soup in `PensionContainer` is not fixed here (E15 later).
- **Verify:**
  - A test that clicking "Model this contribution" makes no save call (mock `handleSyncContributions`).
  - The guard's allow-list shrinks.
  - Section 5.
- **Risk:** the owner's sign-off is the bottleneck. Batch all strings into the T2 sheet for a single review.

### E29-T5. Engine: neutral observations, stage labels and student-loan outcome. M, sonnet.
- **Goal:** remove segment-driven action text at the source (R2, R3, R4).
- **Health score** (`health-score.ts:59-176`):
  - Replace `recommendations.push` with factual `observations`. For example: "£X of this tax year's ISA allowance is unused (resets 6 April)." "Adjusted net income is £X, in the £100,000 to £125,140 band where the personal allowance tapers."
  - Add `observations: string[]` to `HealthScoreResult` (`types.ts:530`).
  - Keep `topRecommendations` as a deprecated alias equal to `[]` for one release, so consumers still compile.
- **Stage labels:** `health-score.ts:285-317` gets descriptive headlines and sublines with no imperatives, e.g. "Unsecured debt present", "Building cash reserves", "No unsecured debt". The internal enums (`types.ts:2-4`) stay, because they are stored data and are used only for layout defaults (`profile.ts:161-163,321-323`, `app.onboarding.tsx:309-313`, allowed by R4).
- **Student loan:** `debt-payoff.ts:742` and `types.ts:205` add `projectedOutcome: "repaid_before_write_off" | "written_off_first"`. `recommendation` is deprecated but kept until E15 migrates `StudentLoanCalculator`.
- **Context pack:** `ai-context-pack.ts:332` becomes "Observations:", dropping the "Baseline fully optimized." fallback; `:367` renders `projectedOutcome`.
- **MCP one-liner:** `packages/mcp/src/tools/financial-audit.tool.ts:113` becomes `observations: healthScore.observations`. This is an E17 lane A file, so **coordinate**. Land it after E17-N1 so the snapshot updates deliberately, or fold it into N3 if that PR is open. N11 later deletes the tool.
- **Files:** above, plus `health-score.test.ts:24` and `ai-context-pack.test.ts`.
- **Depends on:** T1.
- **Conflicts:** E17 lane A (one line), and E23 (finance-engine `picture/` is a separate directory, so no file overlap).
- **Laws:** none (engine).
- **Verify:**
  - A unit test asserting that no observation matches `ADVICE_PATTERNS`.
  - Snapshots updated.
  - `rtk bun run --cwd packages/finance-engine test`, then section 5.
- **Risk:** E15 consumers that read `recommendation` keep working only while the deprecated field exists. Track its removal in E15's handoff (section 4).

### E29-T6. MCP output policy and tests. M, sonnet.
- **Goal:** machine-checkable "no personal product recommendations" for every tool result, description and prompt (R7, and the E26 eval precondition).
- **Policy module:**
  - NEW `packages/mcp/src/policy/output-policy.ts`, exporting `assertToolOutputPolicy(json)`. It walks the output recursively, applying `ADVICE_PATTERNS` to every string value.
  - It bans keys matching `/recommend|favou?rsOption|^best|guaranteed/i`. Numeric `recommendedMonthlyTaxSetAsideGbp` is on a permanent allow-list (tax, not FCA), with a rename suggested to N12.
  - It bans provider names from a short list.
  - It requires a `notice` string on every result, `MCP_NOTICE` from T7.
  - It also exports `assertDescriptionPolicy(text)` for descriptions and prompt text.
- **Tests:**
  - NEW `packages/mcp/src/policy/output-policy.test.ts`. Unit tests on fixtures (good and bad), plus a surface test that drives every tool and prompt through E17-N1's `testing/fake-provider.ts` and `testing/personas.ts`. It does not fork them.
  - Current violations go on an expiring allow-list:
    - `mortgage-isa.tool.ts:88,131,143-146` (owned by N11);
    - `uk-tax-trap.tool.ts:53` (N12);
    - `financial-audit.tool.ts:22,146` (N11);
    - `uk-advisor.prompts.ts:28,39,53,62-75` (N14).
- **E17 hooks:** N8's envelope gains a required `notice` field. N22's catalogue lint imports `assertDescriptionPolicy`. N21's eval graders add a "no product recommendation" behaviour using the same function. These are requests to E17, written into the gate doc (T10), not E29 edits.
- **Depends on:** E17-N1 (harness) and T3 (lexicon). The unit-test half can land before N1.
- **Parallel-safe:** new files only, so yes with lane A.
- **Laws:** 4 (tests).
- **Verify:** `rtk bun run --cwd packages/mcp test`, then section 5.
- **Risk:** this can drift from the N8 envelope shape. Mitigation: the policy walks generic JSON, so it does not depend on the shape.

### E29-T7. Canonical disclaimers and the beta notice line (E19 C5 slice). S, sonnet.
- **Goal:** one source for notice strings, including the friends-minimum wording.
- **Files:**
  - NEW `packages/finance-engine/src/disclaimers.ts`, exporting:
    - `PROJECTION_NOTICE`, the same text as `ProjectionNotice.tsx:9-10`;
    - `MCP_NOTICE`: "Calculations from figures held in Flump. Guidance, not advice. Unverified.";
    - `BETA_NOTICE`: "Flump is a test service. It gives guidance and calculations, not advice. These terms are unreviewed.";
    - `REGULATORY_STATUS` as a placeholder that **throws in tests if used**, because FCA wording is owner-only (E7).
  - The barrel gets one line.
- **Handoffs, not edits:**
  - E15 re-points `ProjectionNotice.tsx:9` to import `PROJECTION_NOTICE`, a one-line change in packages/ui.
  - E19 C1 and C2 (beta notice and terms) embed `BETA_NOTICE`.
  - E17-N8 uses `MCP_NOTICE`.
- **Depends on:** none. **Parallel-safe:** yes (new file). **Laws:** none.
- **Verify:** a unit test asserting `BETA_NOTICE` contains "not advice" and "unreviewed"; section 5.
- **Risk:** the claims guard bans `\bFCA\b` (`claims.test.ts:30`, `copy-guard.test.ts:14`). Keep FCA wording out of this file.

### E29-T8. MCP and PAT creation owner-allowlisted (friends minimum 3). S, sonnet.
- **Goal:** no non-allowlisted user can create a PAT or download the context pack, and an existing non-allowlisted token cannot be used, until the owner has signed the DPIA draft.
- **New guard:** NEW `apps/backend/src/mcp-access.ts` plus `mcp-access.spec.ts`, mirroring `bank-connections.access.ts:16-44`:
  - `MCP_ALLOWED_USER_IDS`;
  - `MCP_ENABLED`, defaulting to off in production;
  - a 404 `feature_disabled` response.
- **Controller:** `apps/backend/src/mcp.controller.ts:49` (`POST mcp-tokens`) and `:80` (`GET mcp-tokens/context-pack`) get `@UseGuards(AuthGuard, McpEnabledGuard)`. `GET` and `DELETE` stay open so users can list and revoke.
- **Token check:** the token-store adapter in `apps/backend/src/mcp.service.ts` returns `null` for tokens whose owner is not allowed. Confirm the exact line during implementation; this file is lane B.
- **No new routes,** so E21's `manifest-coverage.spec.ts:40-45` is unaffected.
- **Depends on:** none.
- **Conflicts:** E17 lane B (`mcp.controller.ts`, `mcp.service.ts`) and N16 (same controller). **Land T8 before N16**, since it is small.
- **Laws:** none (backend).
- **Verify:**
  - Spec cases: off, on, allowlisted, plus revoke still works.
  - A backend e2e if the harness allows.
  - Section 5.
  - Owner step: set the env vars on Railway.
- **Risk:** the owner forgets the env vars and loses MCP themselves. The default is off, and a clear 404 message makes that obvious.

### E29-T9. MCP DPIA draft (annex to E19 B2). M, sonnet.
- **Goal:** the DPIA that E26 (signed by the owner) and E17 phase 4 (DECISIONS conflict 5) wait on.
- **File:** NEW `docs/legal/dpia-mcp.md`, marked "DRAFT v0.1, unreviewed, not legal advice; for owner sign-off, then solicitor review at launch (E29b)". It follows the ICO template structure.
- **Sections:**
  1. ICO screening criteria applied: financial data, novel technology, possible inference. The record says a DPIA is done whether or not it is mandatory.
  2. Processing description: tools, resources and prompts; data categories taken from `data-map.md`; the context-pack download; what Flump stores (token hash, usage, a 13-month audit log, provisional per round 3 item 15, deleted with the account) and what it does not store (outputs).
  3. Roles: whether Flump discloses to the user's chosen AI client at the user's instruction, and whether the model provider is the user's vendor or Flump's processor. This is posed as an **open question for the solicitor**, not concluded.
  4. Lawful-basis options for the disclosure: Art 6(1)(b) contract or 6(1)(a) consent, with the trade-offs, and N19 consent copy as the transparency layer.
  5. International transfers: the provider is likely outside the UK; who makes the transfer depends on the roles in section 3. WorkOS (US) is already documented per round 3 item 8.
  6. Article 9 inference risk: transaction descriptions, budget free-text notes and tax notes could reveal health, religion, trade-union membership or sex life. Mitigations:
     - synced transactions are no longer stored (`DeleteSyncedTransactions1794355500000.ts`);
     - free-text notes are excluded from tool output by default (a request to E17 N4 and N9);
     - anonymisation (N4);
     - read-only default scopes `read:summary` and `simulate` (D5-A).
  7. Retention.
  8. No training: Flump does not train on user data; the provider's training settings are outside Flump's control. The copy must say so, with **no claim that the provider will not train** (the claims guard).
  9. Risk table: likelihood, severity and mitigation, linked to E17 N4, N16, N17 and N15, E20 scopes, T6 and T8.
  10. Residual risk and sign-off block.
- **Depends on:** reads N19 if it exists, but is not blocked by it. **Parallel-safe:** yes. **Laws:** none.
- **Verify:** owner sign-off is recorded in the doc; section 5.
- **Risk:** the draft is mistaken for a reviewed DPIA. Keep the status banner, and add a guard row in `claims.test.ts` if marketing ever cites a DPIA.

### E29-T10. Consumer Duty voluntary principles, the gate checklist and the PR template. S, sonnet.
- **Consumer Duty:** NEW `docs/compliance/consumer-duty-principles.md`. The four outcomes (products and services, price and value, consumer understanding, consumer support) are adopted voluntarily and mapped to concrete Flump practices:
  - the T1 rules;
  - assumptions visible and editable;
  - vulnerability handling in support (E19 6.12);
  - free and plain pricing placeholders (E7);
  - deletion and export.
- It states that Flump is not FCA-authorised and that adopting the Duty is voluntary. That sentence is held for the owner's wording because of the `FCA` guard: the guards scan only `.ts` and `.tsx` source, so docs are fine, but the wording still needs the owner.
- **Gate checklist:** NEW `docs/compliance/E29-gate.md`, which E25 and E26 PRs must link. It lists the friends, E25-copy, E26-friends and written-opinion trigger minimums verbatim from the decision, each with a checkbox and the evidence path (test name, doc, env var).
- **PR template:** NEW `.github/pull_request_template.md` with the line "E25/E26 copy or MCP surface? Link docs/compliance/E29-gate.md and tick the items." It is advisory, because there are no required checks (DECISIONS round 1, E11 D7).
- **Depends on:** T1. **Parallel-safe:** yes. **Laws:** none (it documents section 5).
- **Verify:** section 5.
- **Risk:** advisory gates get skipped. The automated parts (T3, T6) carry most of the weight.

### E29-T11. Widened Innovation Hub enquiry and full perimeter brief (E19 B7). M, sonnet. The owner sends it.
- **Hub enquiry:** NEW `docs/legal/fca-innovation-hub-enquiry.md`, at most about 1.5 pages, written for the owner to send **this month**. It covers:
  - (a) bank data through personal access tokens as a possible account information service, owner-only today;
  - (b) where guidance becomes advice: debt payoff order (RAO art 39E), mortgage overpay versus invest (art 53, 53A), pension contribution, salary-sacrifice and £100k-taper outputs, marginal-rate projections (E25), and the targeted support boundary for segment-based content;
  - (c) LLM replies through MCP, where a third-party model turns Flump calculations into narrative.
  - It also asks whether a pre-incorporation sole trader is eligible.
- **Full brief:** NEW `docs/legal/fca-perimeter-brief.md`, the full brief for the launch solicitor (E29b), built from `E19-plan-draft.md:156-224`. Facts are refreshed:
  - fact 3: bank connect is now owner-allowlisted (`bank-connections.access.ts`);
  - fact 4: the "Invest 100%" string is gone after `52199223`, but `favorsOption` remains (`mortgage-isa.tool.ts:143`) until N11;
  - fact 5: MCP is allowlisted after T8, with no write tools;
  - new: the T1 rules and T3 and T6 guards as mitigations;
  - new: E25 and E26 scope.
- It closes E19 B7 by reference.
- **Depends on:** T1, plus T8 for the facts (it can draft before T8 and refresh the fact).
- **Parallel-safe:** yes. **Laws:** none.
- **Verify:** every code fact cites path:line and is re-checked at the time of the PR; section 5.
- **Risk:** sending is an owner step (agents never contact third parties). The 8-week clock for E26 starts on the send date, so record it in the gate doc.

## 3. OWNER STEPS (agents do not do these)
1. Sign T1 rules, T2 copy sheet, T4 strings (E7).
2. **This month:** send the T11 Hub enquiry; record the send date in `E29-gate.md` (starts the 8-week E26 clock).
3. Set `MCP_ALLOWED_USER_IDS=<owner id>` and leave `MCP_OPEN_ACCESS` unset on Railway when T8 deploys (round 4 addendum: never `MCP_ENABLED=false`, which is the kill switch); check no active `mcp_tokens` rows belong to other users.
4. Sign the T9 DPIA draft before E26 reaches friends.
5. Embed `BETA_NOTICE` wording in the E19 beta notice/terms you publish (round 3 item 15).
6. **E29b at launch:** include the perimeter view (T11 brief, Hub reply) in the one fixed-fee solicitor engagement, with DPIA review. Buy a separate written FCA opinion only on a trigger listed above. All money and engagement decisions are yours.
7. Decide whether to change anything if the Hub reply is adverse (that is itself a trigger).

## 4. Handoffs to other lanes (requests, not E29 edits)
- **E15:**
  - Remove or neutralise the stage hero banner at `HomeDashboard.tsx:478-560` under R4. It may show figures (unsecured debt total) but no stage title or action.
  - Reword `MortgageContainer.tsx:290`.
  - Migrate `StudentLoanCalculator.tsx:141-182` to `projectedOutcome`.
  - Point `ProjectionNotice.tsx:9` at `PROJECTION_NOTICE`.
  - Keep CoachCard content within R4.
  - Reword `TypographyScale.tsx:176` and `TaxTrapEscapeBanner` copy.
  - The T3 guard already lists each of these as a temporary entry owned by E15.
- **E17:**
  - N8 envelope gets a required `notice` field (`MCP_NOTICE`).
  - N11 removes `recommendation`, `favorsOption` and `guaranteed*` keys and the stage enums from descriptions.
  - N12 rewords "optimal" and considers renaming `recommendedMonthlyTaxSetAsideGbp` to `monthlySetAsideEstimateGbp`.
  - N14 prompts must pass `assertDescriptionPolicy`: no "Recommend top 3", "crush" or "maximize".
  - N22 imports the policy.
  - N21 graders add the no-recommendation behaviour.
  - N4 and N9 exclude free-text notes by default.
  - N18 must handle T8's 404.
- **E19:** B2 adopts T9 as its MCP annex; B7 is closed by T11; C5 is started by T7.

## 5. OPEN DECISIONS (not settled in DECISIONS.md)
1. **Pension "Reclaim Allowance" button (`PensionContainer.tsx:455`).** It currently saves a new contribution. Options:
   - (A) "Model this", which pre-fills and never saves;
   - (B) remove the button;
   - (C) keep it with a confirmation step.

   **Recommendation: A.** It keeps the feature and meets R5. *Straightforward.*
2. **Lifecycle stage concept.** Options:
   - (A) keep the internal enums for layout defaults (E16 D11-B) but drop all stage-specific action text;
   - (B) remove stages entirely.

   **Recommendation: A**, because it is reversible and keeps onboarding module defaults. *Straightforward.*
3. **Does the context-pack download count as MCP for the T8 gate?** Options:
   - (A) yes, gated;
   - (B) no, because it is the user's own download.

   **Recommendation: A**, because it is designed to be pasted into a model and the DPIA covers it. *Straightforward.*

   The E29a/E29b timing tension is **decided** (fable, above) and is not reopened.

## 6. Lane summary

| Lane | Files | Order | Conflicts |
|---|---|---|---|
| **A: docs** | `docs/compliance/*`, `docs/legal/{dpia-mcp,fca-innovation-hub-enquiry,fca-perimeter-brief}.md`, `.github/pull_request_template.md` | T1 → T2, T10, T11; T9 any time | none |
| **B: guards and engine** | `packages/finance-engine/src/{compliance/advice-lexicon,disclaimers,health-score,ai-context-pack,debt-payoff,types}.ts` and the barrel, `apps/web/app/copy-guard.test.ts`, NEW `apps/web/app/advice-allowlist.ts`, `apps/marketing/src/claims.test.ts` | T7, T3 → T5 | barrel line (E17 lane A, E23); `financial-audit.tool.ts:113` one line (E17 lane A, after N1) |
| **C: web and marketing copy** | the non-E15 files in T4 | T4 after T3 and T5 | E16 (`PayoffStrategyControls`), E15 D11a (marketing); not mortgage, dashboard or packages/ui |
| **D: MCP policy** | NEW `packages/mcp/src/policy/*` | T6 after E17-N1 and T3 | none (new files) |
| **E: backend gate** | NEW `apps/backend/src/mcp-access.ts`, `mcp.controller.ts:49,80`, `mcp.service.ts` token adapter | T8 first; before E17-N16 | E17 lane B |

**Friends-critical path:** T1, T3, T4, T5, T7 and T8, plus the T11 send (owner) and the round 3 item 9 list. T9 is needed before any friend gets MCP, and T6 before E26.

