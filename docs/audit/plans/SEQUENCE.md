# Sequencing of epics E2, E4, E5, E7, E8, E11 (planning workflow output)

Status: **draft recommendation, nothing implemented.**

## Summary

Main must be green before anything else, because the packages/mcp zod 4 breakage blocks every gate. Then ship the cheap E11 CI foundation and E7 T2, which removes the security form that falsely confirms messages. E2 goes next because writing invented data into real accounts is the most damaging problem users can see. E5 follows it, since both edit _index.tsx, app.onboarding.tsx, app.debt.tsx and app._index.tsx, and honest errors only make sense once GETs stop seeding. E4 engine work and E8 packages/ui token work run in parallel worktrees from the start. Their web-consumer tasks wait until E2 and E5 have landed on the shared widgets, containers and routes, and E4's tax fixes also wait for a named UK tax reviewer to sign off the vectors. Two decisions must be made jointly: E2 D7 with E4 D2 (debts as accounts and the liability sign rule), and E8 D3 with E11 D3 (Storybook a11y gate). None of the fact-checker's false verdicts changes the order, but the hex count (136 or 259 lines, not 97) means E8 T35 must be re-scoped and moved to the end of E8 or to E9.

## Recommended order

1. **Step 0: get main green (prerequisite, not an epic)** — Every plan (E2, E5, E11) says main may still be red because of the packages/mcp zod 4 bump in the E3 ledger. Until main is green, none of the four AGENTS.md section 5 gates can be proven, and E11's rule that every new gate first fails and then passes cannot work. Someone with GitHub access checks the latest main run and fixes or pins zod in packages/mcp before any epic opens a PR.
2. **E11 (foundation slice: T0, T1, T2, T3, T4, T6, T20)** — These are cheap, need no decision, and are mostly CI and config files that no other epic edits. T2 and T3 let the real-Postgres migration suite run in CI and stop it skipping silently. That has to happen before E2 T6 ships an irreversible cleanup migration. T1 (lint becomes `biome ci .`) must add the `!**/CHANGELOG.md` exclusion in biome.json:10-19 in the same commit, or CI goes red. Land this first, because the shared files (.github/workflows/ci-pipeline.yml, root package.json, turbo.json) are edited later by E4 T17 and E8 T32/T34. (blocked by: Step 0: get main green (prerequisite, not an epic))
3. **E7 (T1 and T2 immediately; rest gated on D0)** — This carries the highest legal exposure of all the epics, and it touches almost no shared files. T2 removes the security form that tells users their message was sent when nothing is sent. It needs no decision and should ship now. T4-T11 are copy changes in apps/marketing and wait for owner sign-off (and legal sign-off on O+L rows). They can be drafted in parallel at any time. T12 (web mirrors) runs after E2 T17 because both edit HomeHero.tsx, and its AddEditAccountsDialog.tsx edit must be sequenced with E5 T14. T14 (claims guard) lands last.
4. **E2 (backend T1-T5 first, then T7, T8, T9, T12-T16; T3/T6/T10/T11/T17-T20 after decisions)** — This is the most damaging problem users can see: GET requests write invented accounts, tax records and debts into real accounts. The backend tasks T1, T2 and T4 are small and safe. It goes before E5 for three reasons. E5 warns that honest error states will expose the auto-seeding endpoints. E2's own risks say not to invent a separate failure flag. And the two epics edit the same routes (_index.tsx, app.debt.tsx, app.onboarding.tsx, app._index.tsx), so they have to run one after the other. Run T6 (cleanup migration) only after E11 T2/T3, D3/D4, the read-only production counts and a backup. The fact-checker's correction (15 seed entries, not 16) does not change the order. It only changes the fingerprint and guard-spec counts in T6 and T2. Apply the missed items as well: delete or clear-only POST budget-entries/reset (budget.controller.ts:352-360), update migrations.integration.spec.ts:43,128,187 and migration-files.spec.ts, limit the guard spec to src/, and cover MortgageContainer.tsx:52-54 (fallbacks of 150000 and 25 as well as 4.5). (blocked by: E11 (foundation slice: T0, T1, T2, T3, T4, T6, T20))
5. **E5** — This makes outages honest. It depends on E2 having removed the GET-time writes, otherwise users suddenly get error pages instead of seeded data. Start T1, T2, T3, T5, T12 and T13 in parallel with E2, because they live in services/, features/feedback/ and config.server.ts, which E2 does not touch. T6, T8, T9, T10 and T11 rebase onto E2's changes to _index.tsx, app.onboarding.tsx, app._index.tsx and app.debt.tsx. T14-T16 (ConfirmDialog adoption) must come before the E8 web component sweeps, because they edit the same components. E2 T10 should use E5's ConfirmDialog if T13 has landed by then. The fact-checker's correction (12 files, not 14) does not change the order. Add the action fetches the plan missed (app.pension.tsx:20, app.tax.tsx:14, app.savings.tsx:20, app.accounts._index.tsx:28) to T10, or the T12 guard test will fail. Before shipping T7 with D1-B, check logout._index.tsx:29-35. (blocked by: E2 (backend T1-T5 first, then T7, T8, T9, T12-T16; T3/T6/T10/T11/T17-T20 after decisions))
6. **E4 (engine track in parallel; consumer track after E2/E5)** — Wrong tax figures are high user-visible risk, but every tax fix waits on vectors signed off by a UK tax reviewer. That is an external dependency, which is why E4 is not first. The engine-only tasks (T1, T3a, T4, T5, T7 engine part, T11, T12) live in packages/finance-engine and can run in their own worktree from day one. There are two exceptions. portfolio.ts and types.ts are also edited by E2 T11 (toDebtItems APR), so land E2 T11 first or merge the two. index.ts is also edited by E2 T12. The consumer tasks come after E2 and E5 have landed on the same files: T10 (_index.tsx), T11b (DebtWidget.tsx, PayoffStrategySwitcher.tsx) and T15a (MortgageWidget.tsx, MortgageContainer.tsx). T17 (CI guard) comes after E11's CI edits. The fact-checker's correction (the taper is already floored at tax-rules.ts:1087) does not change the order. It only narrows the T4 and T14 descriptions. Fix tax-rules.ts:521-523 (2026/27 values stored under the 2025/26 key) in T3a before any table-driven vector. (blocked by: E2 (backend T1-T5 first, then T7, T8, T9, T12-T16; T3/T6/T10/T11/T17-T20 after decisions), Owner/tax reviewer sign-off on vectors)
7. **E8 (packages/ui token track in parallel; web sweeps last)** — The token and primitive work (T01, T03, T05, T06, T10, T12, T13, T22, T26, T28) is in packages/ui and is mostly disjoint from the other epics. It can run in parallel, though packages/ui/src/index.tsx is shared with E2 T7. The broad web sweeps edit files that E2, E4, E5 and E7 also edit, so they go last: T07 (about 25 files), T11, T16, T20, T23, T27, T29, T30 and T35. T31-T34 (the Storybook gate) follow E11 T17, since the two epics split the gate by the joint D3 decision. The fact-checker's correction (136 or 259 hex lines, not 97) means T35 must be re-scoped before anyone starts it. It moves to the end of E8 or to E9, but the rest of the order stays the same. Apply the missed items: the global focus-visible rule must not override the Panda _focusVisible styles (Button.styles.ts:20-21), and auth.callback.tsx:52-60 needs primary.solid. (blocked by: E5, E11 (Storybook plumbing T17) for T31-T34)
8. **E11 (remaining: T5, T7-T19)** — T8-T12 (route tests) should be written after E5 has rewritten the route actions. E5 T9/T10 and E11 T10-T12 create the same test files (app.accounts.$account.test.ts, the action tests, app.onboarding.test.tsx), so write them once in E5 or after it. T13 re-baselines web coverage after that. T7 (audit gate) needs D1. T14 and T15 (ratchets) need D2. T17 is the Storybook plumbing for E8. T18 and T19 (E2E smoke tests) are much stronger once E2 has removed fabricated data and E5 has removed silent fallbacks, because otherwise a test can pass on invented numbers. First confirm the dev bypass works (auth.server.ts:63-72). The 'unclear' verdicts mostly come from the audit docs missing in that worktree, and they do not change the order. (blocked by: E5, E2 (backend T1-T5 first, then T7, T8, T9, T12-T16; T3/T6/T10/T11/T17-T20 after decisions))

## File overlaps between epics

- apps/web/app/routes/_index.tsx and _index.test.tsx: E2 T12, T15, T17; E4 T10; E5 T6, T9. This is the worst hotspot. Order: E2, then E5, then E4 T10.
- apps/web/app/routes/app.onboarding.tsx and app.onboarding.test.tsx: E2 T19; E5 T6, T8, T10, T11; E11 T12 (test).
- apps/web/app/routes/app.debt.tsx: E2 T9, T10; E5 T6.
- apps/web/app/routes/app._index.tsx: E2 T17; E5 T8.
- apps/web/app/routes/app.accounts.$account.tsx, app.accounts._index.tsx, app.pension.tsx, app.savings.tsx, app.tax.tsx: E5 T6, T9, T10. The tests for them are also planned by E11 T10-T12 (app.accounts.$account.test.ts is created by both E5 T9 and E11 T12).
- apps/web/app/services/backend-client.server.ts and backend-client.server.test.ts: E5 T2, T3, T4, T7; E11 T10.
- apps/web/app/root.tsx: E5 T6, T9, T18; E8 T23. apps/web/app/root.test.tsx: E5 T9; E8 T09.
- packages/finance-engine/src/portfolio.ts, portfolio.test.ts and types.ts: E2 T11 (toDebtItems APR); E4 T13 (sign convention, portfolio.ts:57, 158-159), T2 (types.ts:15), T11 (types.ts:258).
- packages/finance-engine/src/index.ts: E2 T12; E4 T2.
- apps/web/app/components/dashboard/widgets/DebtWidget.tsx: E2 T13; E4 T11b. MortgageWidget.tsx: E2 T15; E4 T15a. Both are also in the E8 T07 widget sweep.
- apps/web/app/components/dashboard/HomeDashboard.tsx: E2 T13; E8 T07, T23. HomeDashboard.test.tsx: E4 T10.
- apps/web/app/containers/tax/TaxContainer.tsx: E2 T16; E5 T16; E8 T07, T20. TaxContainer.test.tsx: E2 T16; E8 T20.
- apps/web/app/containers/mortgage/MortgageContainer.tsx: E4 T15a; E8 T07, T30; also the E2 missed item (lines 52-54).
- apps/web/app/containers/pension/PensionContainer.tsx: E2 T20; E8 T30.
- apps/web/app/components/pension/PensionForecasterCard.tsx: E4 T7, T15c; E8 T07, T29. PensionQuickStartWizard.tsx: E4 T7, T15b.
- apps/web/app/components/budget/BudgetDashboard.tsx: E2 T14; E8 T29.
- apps/web/app/components/home/HomeHero.tsx: E2 T17; E7 T12. FeaturePillars.tsx: E2 T17; E8 T07.
- apps/web/app/routes/sandbox.tsx: E2 T18; E8 T07. auth.callback.tsx: E8 T07, T23; E11 T8 (test).
- apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx: E5 T14; E7 T12.
- apps/web/app/components/setup/SetupChecklist.tsx: E7 T12; E8 T16.
- apps/web/app/components/savings/SavingsAccountsList.tsx: E5 T15; E8 T16.
- apps/web/app/components/budget/BudgetCategoryTable.tsx: E5 T15; E8 T11, T27.
- apps/web/app/components/budget/UserProfilePanel.tsx: E5 T16; E8 T07.
- apps/web/app/components/debt/PayoffStrategySwitcher.tsx: E4 T11b; E8 T17, T23.
- apps/web/app/features/ai-connections/components/McpConnectionCard/*: E7 T12; E8 T04, T05, T07, T11.
- apps/marketing/src/components/HomeFAQ.tsx and HomeFAQ.test.tsx: E7 T8; E8 T21.
- packages/ui/src/index.tsx: E2 T7; E8 T12, T13, T28 (one-line barrel additions; trivial conflicts).
- packages/ui/src/tokens/architecture.laws.test.ts: E5 T5; E8 T07, T35.
- apps/web/.storybook/preview.tsx: E8 T31; E11 T17.
- apps/web/vite.config.mts: E8 T32; E11 T5, T6, T13, T17. apps/web/package.json: E8 T32; E11 T6, T17 (plus bun.lock churn).
- Root package.json: E4 T17; E8 T32; E11 T0, T1, T7, T14, T15.
- Root README.md: E5 T1; E11 T1, T3.
- biome.json: E8 T21 (a11y rules to error); E11 T1 (CHANGELOG exclusion).
- .github/workflows/ci-pipeline.yml: E4 T17; E8 T34; E11 T0, T1, T3, T5, T7, T14, T17, T18, T20.
- apps/backend/src/migrations/migrations.integration.spec.ts: E2 T6; E11 T2, T3.
- apps/backend/src/user-profile.service.ts and its spec: E2 T4 and T20. Both are in E2, so sequence them within the epic.

## Decisions needed from you

- **E2**: Starter data: does a new real user get any data they did not enter, including the pre-filled onboarding values? (E2 D1) — recommendation: No (option A). Budget defaults are added only through the explicit button. Drop 'Salary (Take Home) £3,000' from the template at budget.controller.ts:176-185. Onboarding fields start empty.
- **E2 (affects E7 copy and E11 E2E)**: Demo mode: one demo or two, and can it leak into a real account? (E2 D2) — recommendation: Option A. Keep one public /sandbox for signed-out visitors only. ?demo=true redirects signed-out visitors there and is ignored for signed-in users. Delete DemoModeBanner and getDemoDashboardData. The seed carries no salary.
- **E2**: Cleanup of seeded rows already in production, including rows owned by the old mock identities user_mock and dev_user_123. (E2 D3 + D4) — recommendation: D3-B. Delete exact fingerprint matches for tax records and accounts. Leave budget rows. Do this only after read-only counts and a backup. For the mock-identity rows: delete them (D4-A) if the counts show no real user was ever mapped to those ids. Otherwise export them first (D4-C).
- **E2**: Pension and profile defaults (5% employee, 3% employer, salary sacrifice on) and the £45,000 salary fallback. (E2 D5) — recommendation: Option A. Label 5%/3% as an assumption ('Assumed: auto-enrolment minimum'), remove the £45,000 fallback and prompt for salary. No schema change.
- **E2**: Is the Poplar/Curo rental ledger in git history (from commit a640c2be) real data, and should history be rewritten? (E2 D6) — recommendation: Owner confirms. If it is real data and the repository is or will be public, rewrite history with filter-repo (a human task). Otherwise delete from HEAD only. No code task is blocked.
- **E2 + E4**: How do debts persist, and what sign convention do balances use? These are E2 D7 and E4 D2, and they must be decided together, because debts stored as accounts inherit the liability sign rule. — recommendation: E2 D7-A: persist debts through /accounts. Show 'APR not set' instead of inventing 19.9%, and add no in-page example toggle. E4 D2-A: assets keep the provider's sign, and liabilities are stored as minus the amount owed. Have one implementer own portfolio.ts for both.
- **E4**: Who is the UK tax reviewer who signs off the test vectors, and also rules on Scottish Gift Aid band extension? (E4 risk 1 + D9) — recommendation: Name the reviewer before any E4 tax fix merges. Until they rule on D9, use D9-B (Gift Aid affects only the allowance taper for Scottish taxpayers, with a disclaimer).
- **E4**: Which tax years are supported and verified? (E4 D1) — recommendation: Option b. Verify 2023/24 to 2026/27. Keep 2020/21 to 2022/23 but label them unverified. Unknown years throw an error.
- **E4**: Tax engine semantics: PAYE combination (D3), tax-trap marginal rate (D7), the 6 April boundary (D8) and the money and rounding policy (D5). — recommendation: D3-a: PAYE salary records replace the profile salary, and bonus and benefit records add on top. D7-a: two separate fields, income-tax-only rate and rate including NI. D8-a: fold the 6 April boundary into the new resolver. D5-a: keep pounds as floats and round to pence only at result boundaries.
- **E4 (and E2)**: What does the dashboard 'Est. Tax Due' show? It currently uses a fabricated income * 0.29 at _index.tsx:146. (E4 D4) — recommendation: Option b: the additional self-assessment balance, with an empty state instead of £0 when there is nothing to calculate. The owner signs off the label wording.
- **E4 + E5 + E8 + E2**: Mobile companion: fix now or park until E12 decides its future? (E4 D6, E8 D6, plus E5 T17 and E2 T16 touching mobile) — recommendation: Do the cheap correctness and safety items now: E4 T16 swaps the maths for engine calls, and E5 T17 adds confirmation to 'Disconnect all'. Defer the accessibility pass (E8 D6-A) until E12, because the app still runs on mock auth.
- **E5**: Backend 401 while the WorkOS session is still valid. (E5 D1) — recommendation: Option B. Show a 'Your session has ended' state with a 'Sign in again' button that posts to /logout, so no sign-in loop is possible. Revisit option C after the WorkOS issuer is confirmed. Note that E11 found a GET to /logout signs users out (logout._index.tsx:29-35), which is an E1 follow-up.
- **E5**: Partial endpoint failure: full error page, or partial data with a banner? (E5 D2) — recommendation: Option A. Any failed endpoint shows the route error state. Move to option B later if the optional endpoints prove flaky. State explicitly that a failed profile load must not skip the onboarding redirect in _index.tsx:66-68.
- **E5 + E11**: Browser API client, removing the bearer token from the browser, and the web-to-backend contract layer. (E5 D3, E11 D5) — recommendation: E5 D3-C: build apiFetch inside E5 now. Open a follow-up security epic that moves mutations into route actions, removes accessToken from root.tsx:52, and picks the contract approach (zod in @flump/common, or OpenAPI). 'Contract tests' moves out of E11's done-when.
- **E5**: Undo for deletes? (E5 D4) — recommendation: No. Confirmation only for now. Undo needs a data-retention policy and should be planned separately.
- **E7**: Copy sign-off process. (E7 D0) — recommendation: Option a. Removing a false claim merges on owner approval alone. New regulatory or GDPR statements wait for legal review.
- **E7**: Bank connection and FCA wording. (E7 D1) — recommendation: Option b for public pages: 'coming soon', and remove the FCA, AISP and comparison-matrix claims. Use option a wording in-app ('beta, read-only token'). Option c only if a regulated partner and its FRN exist.
- **E7**: Pricing page when no billing exists. (E7 D2) — recommendation: Option a: a single 'Flump is free' card with no prices, trial or Pro card.
- **E7**: Erasure and GDPR claim, security contact address, and company identity in the footer. (E7 D3, D4, D6) — recommendation: Remove the form now (T2). The owner supplies a monitored email address, which feeds both the security mailto (D4-a) and the manual account-closure route (D3-a). Open a separate ticket for real account deletion and a privacy policy. Footer: the registered company details if the company is incorporated, otherwise '© {year} Flump'.
- **E7**: MCP marketing copy. (E7 D5, D7) — recommendation: D5-c: label MCP as preview and remove the npx and remote instructions until the stdio PAT 401 is fixed. D7-a: fix the 'strict PII anonymisation' wording in the same pass.
- **E8**: Primary token split, which means editing the law text in AGENTS.md:21 and component-guidelines.md:43. (E8 D1) — recommendation: Option A. Add primary.solid for fills and keep primary as the accent. This is the smallest sweep, light mode does not change, and it needs the owner's approval to edit AGENTS.md.
- **E8**: The border.input value. (E8 D2) — recommendation: Option A. Light mode slate.500, dark mode rgba(255,255,255,0.40).
- **E8 + E11**: The Storybook a11y gate: who builds it, how strong is it, and when does it become required? (E8 D3, E11 D3) — recommendation: E11 T17 wires a real-browser Vitest Storybook project as a report-only CI job. E8 fixes the violations, runs light and dark separately, and switches a11y to error and the job to required. Change the preview default away from side-by-side (preview.tsx:27).
- **E8 + E11 (+E9)**: Ownership of the hex-to-token sweep and the AGENTS.md law ratchets. (E8 D4, E11 D2) — recommendation: E11 builds the token and tabular-nums ratchets. The colocation ratchet stays in E9. E8 does only the narrow status-text slice, and only after re-counting: the fact-checker found 136 or 259 lines, not 97. Any remaining hex goes to E9.
- **E8**: When to announce recalculated calculator results to screen readers. (E8 D5) — recommendation: Option A. Announce the headline outcome only, politely, debounced about 1 second after the last change. The copy owner agrees the wording.
- **E11**: Dependency audit gate policy, and coverage ratchet policy. (E11 D1, D6) — recommendation: D1-a: block high and critical advisories, with an allow-list whose entries expire after 90 days, plus a weekly scheduled run. D6-a: coverage floor set to measured minus 1, raised as coverage improves. Decide on a diff-coverage gate later.
- **E11**: End-to-end smoke test now, and how to handle WorkOS. (E11 D4) — recommendation: Option a, using the dev bypass, scheduled after E2 and E5 so it cannot pass on fabricated or fallback numbers. Add the WorkOS staging test (option b) when the owner can provision a staging project.
- **E11**: Branch protection and the release-please token (repository settings only the owner can change). (E11 D7) — recommendation: Option a. Make the five gates required, require code-owner review on the baseline and allow-list files, and give release-please a PAT or GitHub App token before any new check becomes required.

## Quick wins (no decision needed)

- E7 T2: remove the fake security enquiry form, the 'Enquiry sent' confirmation and the '1 business day' promise (apps/marketing/src/pages/SecurityPage.tsx).
- E11 T1: lint becomes `biome ci .` plus the CHANGELOG.md exclusion in biome.json, in the same commit.
- E11 T0, T2, T4, T6, T20: script test harness, resolveDbTestMode, coverage include lists and untracking 158 coverage files, swapping vitest-github-actions-reporter for the built-in reporter, CI job hygiene.
- E11 T3: Postgres service in the CI vitest job plus the turbo env pass-through (a prerequisite for E2 T6).
- E11 T8, T9: route tests for auth.callback, callback and logout. Pin the GET-logout behaviour and the configure() global state.
- E2 T1, T2, T4: getAccounts, getPortfolioSnapshot and getTaxRecords stop writing; profile creation becomes race-safe.
- E2 T7: shared EmptyState pattern in packages/ui.
- E2 T14, T15: hide the fabricated 92%/78% MTD actuals; remove the pension and mortgage literals from the home loader.
- E2 T16: remove 'Poplar' and the seeding claims from copy, fixtures and docs (HEAD only).
- E4 T1: test-vector catalogue and harness. E4 T3a: fix 2025/26 student loan thresholds (merges after reviewer sign-off). E4 T4: one EWNI band function.
- E5 T1: one validated API base URL in config.server.ts; fix the docs to port 4000.
- E5 T5, T13: RouteErrorState and ConfirmDialog components (colocated, new files only).
- E5 T17: mobile confirmation and error handling for 'Disconnect all'.
- E8 T01, T05: token contrast matrix test; dark danger solid token and the light chart warning series.
- E8 T09, T24: global focus-visible rule scoped so it does not override Panda _focusVisible; scroll padding for the sticky header.
- E8 T12, T13, T22, T26: VisuallyHidden and LiveRegion primitives, remove the nested <main> from SimulatorSplitLayout, table header scopes.
- E8 T14, T15, T18, T19: error association on FLPInput, FLPSelect and FLPCheckbox; accessible names on the ConnectBankWizard and MonthlyBalanceCheckInDrawer dialogs.

## Safe to run in parallel

- E7 marketing tasks (T1-T11, T13) can run in a separate worktree alongside any other epic. The only conflicts are E8 T21 (HomeFAQ.tsx) and E8 T07 (McpPage.styles.ts). E7 T12 must follow E2 T17 (HomeHero.tsx) and E5 T14 (AddEditAccountsDialog.tsx).
- The E4 engine-only track (T1, T3a, T4, T5, T7 engine part, T8 engine part, T11, T12, T14) can run alongside E2 and E5 web work. Coordinate portfolio.ts, types.ts and index.ts with E2 T11 and T12 by landing E2 T11 first or giving both to one session.
- The E8 packages/ui token and primitive track (T01, T03, T05, T06, T10, T12, T13, T22, T26, T28) can run alongside E2, E4 and E5. Only one-line barrel conflicts in packages/ui/src/index.tsx, against E2 T7.
- The E11 CI and scripts track (T0-T7, T14, T15) can run alongside the E2 backend and E4 engine tracks. It must land its ci-pipeline.yml and package.json edits before E4 T17 and E8 T32/T34.
- E2 backend tasks (T1, T2, T4, T5) and the E5 services layer (T1, T2, T3, T5, T13) can run at the same time, since they touch backend src versus apps/web/app/services and features/feedback.
- Must NOT run in parallel: E2 web routes with E5 T6, T8, T9, T10, T11 (same route files); E5 T14-T16 with the E8 web sweeps T07, T11, T16, T20, T27; E4 consumer tasks T10, T11b, T15a with the E2 widget and loader tasks; E8 T31/T32 with E11 T17 (preview.tsx, vite.config.mts).

## Added 2026-11-11: E15 (visual/UX elevation) and E16 (product review)

- E16 phases 0 to 3 (inventory, scoring, journeys, decision pack) are read-only and can start immediately. Run E15 phase 0 alongside it, sharing one walkthrough and one screenshot set (two lenses).
- E16 decisions gate: E6 scope, the E12 mobile feature inventory freeze (M0 to M3 spikes and shell may proceed), E15 phase 3 screen by screen, E9 page migration (skip CUT rows), E8 fixes on components marked for cut.
- E15 phases 1 and 2 (tokens, components) do not wait for E16, but must land before E12 builds screens. E15 phase 3 starts after the E8 web sweeps PR merges.
- E16 execution tickets touching `_index.tsx`, `app.onboarding.tsx`, `app.debt.tsx`, `HomeDashboard.tsx` or `TaxContainer.tsx` come after E2/E5 (merged) and E4 vector sign-off.

## Added 2026-11-11: E17 (agent and API surface)

- E17 design phases (inventory of current MCP tools and REST endpoints, target tool design, auth and consent model, OpenAPI and versioning plan) are read-only and can start now, alongside E16 discovery.
- E16 decides whether MCP is a headline feature; E17's build phases (real-data tools, writes, distribution) follow that decision. E6's MCP card finish/flag/delete verdict is folded into E17.
- The REST contract work (versioning, OpenAPI, typed client, error contract) is shared with E12 mobile: build it once, ahead of E12's feature screens.
- Tax tools wait for the owner's E4 tax-vector sign-off.

## Added 2026-11-11: E18 to E24 (Fable portfolio review) and revised order

Fable's recommended order for a one-person owner using agents (an inference to validate, not a commitment):

- **Before merging release PR 368:** manual database backup plus one restore drill, `/health` and a Railway healthcheck, staging environment (E18 core); the onboarding and `PATCH /accounts` fixes (E23, in flight); hide the C-11 tax-due figure; `noindex` and robots disallow; decode a real WorkOS token and pin the issuer.
- **Month 1 (safe first deploy):** E18 core with error tracking, E23 including the owner's E4 vector sign-off, then PR 368 to staging and then production as a private beta with noindex.
- **Month 2 (legal and security floor):** E19, E20, E21; apply E16's cuts, then re-baseline the ratchets; a Playwright smoke test.
- **Month 3 (product focus):** E16 merges and top three additions (tax-year hub, check-in history, CSV import); E22 before the 2027/28 tables; E15 phases 0 to 2 only.
- **Defer or cut:** E12 beyond its first spikes (after launch and E21); E15 phase 3 for screens not confirmed kept; E17 build phases (keep context-pack export, flag the remote MCP endpoint); bank connections (flag off); E13, E14, the `es` locale and Irish tax (cut per E16); E9 colocation for files due to be deleted.
- E21 (API contract and validation) blocks E12 M1 and the E17 build phases.
- Merge PR 386 (E8 web sweeps) before anything else edits `apps/web/app`.

## Added 2026-11-12: round 4 plans and parallel schedule

E17, E18, E20, E24, E25 and E29 now have ticket plans: `E17-next-phases-plan.md`, `E18-no-owner-plan.md`, `E20-next-phases-plan.md`, `E24-plan.md`, `E25-plan.md` and `E29-plan.md`. `PARALLEL-SCHEDULE.md` sets out the lanes, the order for shared files and the path to inviting friends. The decisions behind them are in DECISIONS.md round 4.

E29 is split into two parts:

- **E29a** is free agent work. It gates the friends beta, the E25 copy and E26.
- **E29b** is the lawyer's perimeter view. It is part of the fixed-fee launch engagement and gates public launch.

E30 (monthly snapshots and the check-in habit) has a plan, `E30-monthly-snapshots-plan.md`, in four PRs: PR1 backend and engine, PR2 web, PR3 mailer and reminders (blocked on the owner's email provider and a PECR opinion), PR4 v2 views. PR1 shares `account_details` and the `portfolio.ts` history code with E23 section 6 (see the plan, section 7).
