# E2 draft plan (planning workflow output)

Status: **draft, not reviewed, nothing implemented.** Produced by a read-only planner and fact-checked by a second agent; both can be wrong. Facts cite file:line in the code at the time of the run.

**Epic:** E2. Remove mocks and fabricated data from product paths (G-01, C-04, C-05, B-03, I-01, I-02, I-03, plus demo mode G-10/I-10 and the adjacent onboarding defaults I-05)

**Goal:** No GET or loader writes fabricated data. No signed-in screen shows invented figures: no seeded accounts or tax records, no invented debts, no fallback debt widget figures, no 92%/78% "actuals". Rows already seeded in production are found by exact fingerprint and cleaned up only as the product owner decides. Demo data is reachable only through one public, clearly labelled demo that signed-in users can never enter. Real users see consistent empty states built from one shared EmptyState pattern.

**Classification:** architectural

## Design

WHAT A BRAND-NEW REAL USER GETS TODAY (read from code, not run)

On the first visit to `/`, two loaders run in parallel. The root loader GETs `/user-profile` (root.tsx:37). The home loader's loadWorkspaceSnapshot GETs `/accounts`, `/account-details`, `/user-profile`, `/budget-entries`, `/tax-records` and `/portfolio-snapshot` (backend-client.server.ts:91-100).

Several of these write:
- Two GETs try to create the profile. One can fail on the unique `user_id`, and the web turns that failure into `null`, which skips the onboarding redirect (_index.tsx:66).
- `/accounts` and `/portfolio-snapshot` each seed 4 accounts, so the user can end up with 8.
- `/budget-entries` seeds 16 template rows, including a £3,000 take-home salary.
- `/tax-records` seeds 62 records from a real-looking personal rental ledger.

Onboarding then adds its own pre-filled £5,000 cash, £15,000 pension and budget rows (I-05). The same seeding fires from MCP (mcp.service.ts:95-98).

What each page then shows:
- **/app/debt:** four invented debts. The surplus is always £150 (app.debt.tsx:15 passes an array) and the financial stage comes from literals.
- **Dashboard:** the debt widget appears as soon as any liability exists, including a mortgage, with literal and past dates. The mortgage widget assumes 4.5% over 25 years.
- **Budget:** "MTD Settled Actuals" is always 92% or 78% of the plan.
- **Tax:** calculations run on the Poplar ledger.
- **Pension:** assumes a £45,000 salary.

Deleting the last account re-seeds it on the next load.

DESIGN

1. Backend: no read writes fabricated data
- Delete the seeding branches in AccountIntakeService.getAccounts, TaxController.getTaxRecords and BudgetController.getBudgetEntries. This also removes the C-04 race.
- The seed literals are deleted outright. They do not move to fixtures (see D6).
- A guard spec fails if any non-spec, non-migration backend source contains the seed signatures.
- Profile creation stays lazy, because the web uses profile.id to detect a loaded profile (UserProfilePanel.tsx:266,481). It becomes race-safe: catch unique violation 23505 and re-read.
- Ruling: an empty profile row is not fabricated data. The alternative is a GET that returns unsaved defaults, which breaks the profile.id check.
- hasResetFinancialData stays as a column. It no longer gates seeding.

2. Cleanup of existing rows (blocked on D3 and D4)
- One migration, RemoveSeededExampleData1794355400000, following the ClearBankTokens pattern: advisory lock, re-check its own name, no-op down, idempotent.
- Matching is by exact fingerprint only:
  - Tax: md5 of `name|to_char(amount)|to_char(date)|frequency|category|source|coalesce(end_date)`, compared against 62 hashes precomputed from the old literal (taken with `git show 11eccf8:apps/backend/src/tax.controller.ts`). The migration file therefore does not reintroduce the personal ledger. Including end_date keeps rows the user capped.
  - Accounts: exact (name, type, balance, interest_rate, monthly_contribution, is_current), connection_id null, and no account_details or transactions rows.
  - Budget (if D3 includes it): is_default true, exact values, and updated_at = created_at.
- The migration logs counts only, never user ids or names.
- Production counts are taken with read-only SQL by the human before deploy.

3. Web: no invented figures
- A new shared pattern, packages/ui/src/patterns/EmptyState (5 colocated files, semantic tokens only).
- Debt page:
  - Remove defaultDebts and show EmptyState ("No debts yet", "Add your credit cards, loans and overdrafts to compare payoff plans.", CTA "Add debt"). The "UK debt rules and helplines" tab stays usable.
  - The loader computes real inputs: monthly surplus from budget entries, liquid savings from PortfolioSnapshot.getTotalLiquidCash, and essential expenses from isEssential entries. A missing value is null, never a literal.
- Dashboard: the loader builds debtData from the engine with a pure buildDebtSummary(snapshot, now):
  - consumer debt only (getTotalConsumerDebt);
  - debts from toDebtItems;
  - highInterestCount using an exported engine predicate isHighInterestDebt (the rule from health-score.ts:257);
  - monthly minimums summed from the items;
  - debt-free date from compareAvalancheAndSnowball(debts, 0).minimumOnly.debtFreeDate, or null.
- "Interest saved" and the "+£50/mo" line are removed: there is no real basis for them until the user chooses an extra payment.
- The widget drops every || fallback. It is visible only when consumer debt is above 0, so a mortgage alone does not show it.
- Budget: remove the 0.92 and 0.78 fallbacks. When no entry has actualMtdGbp, hide both "MTD Settled Actuals" blocks and show one prompt: "Actual spending is not tracked yet. Connect a bank on Accounts to compare plan with reality."
- Home loader: `||` becomes `??` for pension percentages. The mortgage rate comes from the mortgage account's interestRate; the term is null, and the widget asks for it instead of assuming 25 years.
- Copy, fixtures and docs lose 'Poplar' and the seeding claims.

4. Demo mode (blocked on D2; recommended option A)
- One public demo, /sandbox.
- `/?demo=true` and `/app?demo=true` redirect signed-out visitors to /sandbox. A signed-in user who adds the parameter gets the real dashboard.
- The /sandbox loader redirects signed-in users to `/`. If authkit errors, the visitor is treated as signed out, so the public demo stays reachable.
- Delete DemoModeBanner, getDemoDashboardData and any DEMO_* constants it alone uses. Point HomeHero and FeaturePillars at /sandbox.
- The sandbox onboarding seed carries modules and stage only, not salary (D2 sub-choice). Update stale persona dates.

5. Split
- Backend tasks T1-T6.
- Shared UI T7.
- Web T8-T20.
- Backend and web are independent, except that T5 (MCP) needs T1 and T4, and T6 ships after T1-T3 are deployed.

Laws touched:
- Colocation (T7; no new flat files; the DemoModeBanner deletion removes a violation).
- Semantic tokens (T7, T13, T14 must not add hex; removed elements take their hex with them).
- Tabular numbers and useFormatCurrency on any new figure (T9, T13).
- KpiStrip and SimulatorSplitLayout are not restructured here (that is E9/I-09), but the debt empty state must not stack controls above a chart.
- Copy style: sentence case, en-GB, no exclamation marks.
- Four-gate CI pre-flight before any PR.
- Subagent model law for implementers (sonnet).

OUT OF SCOPE (owned elsewhere)
- Loader failure versus empty (I-04, E5). Empty states must not appear on a fetch failure once E5 adds a failure flag.
- Confirmation-dialog unification (I-06, E5).
- Tax estimate `* 0.29` (_index.tsx:146, E4).
- Plaid, sandbox and orchestrator mock adapters (G-07, E6).
- MCP card fake (G-06, E6).
- Mobile companion mock fallback (G-11, E12), apart from removing the personal names.
- Unscoped localStorage baseline key (G-10c, follow-up).
- Git history rewrite (D6, human).

## Decisions needed from the product owner

1. **D1 Starter data policy: should a new real user get any data they did not enter themselves? This includes the onboarding pre-filled values (I-05).**
   - A: None. Every page starts with an empty state. The budget template is added only through the existing explicit 'Add suggested defaults' button and wizard template, and onboarding fields start empty with placeholders.
   - B: None automatically, plus an opt-in 'Load example data' for signed-in users. It writes rows flagged as examples (new column and migration) and has a one-click remove. This conflicts with the epic's done-when unless the rows are clearly labelled.
   - C: Keep auto-seeding the generic budget template on the first GET, but remove the accounts and tax seeds. Onboarding defaults stay.
   - Recommendation: A. It matches the done-when and ADR-010, and the budget already has an explicit opt-in. Also drop 'Salary (Take Home) £3,000' from the suggested template (budget.controller.ts:176-185), because an invented income is the most damaging default.
   - Blocks: T3, T19

2. **D2 Demo mode: how is it reached, and what may it carry into a real account?**
   - A: One public demo at /sandbox. ?demo=true redirects signed-out visitors there and is ignored for signed-in users. Delete DemoModeBanner and getDemoDashboardData. /sandbox redirects signed-in users. The sandbox onboarding seed carries modules and stage only, never salary.
   - B: Keep both demos, both gated to signed-out visitors. Move DemoModeBanner into a colocated feature directory with semantic tokens. The seed keeps salary but onboarding shows it as a labelled, unconfirmed placeholder.
   - C: Remove the demo entirely. Marketing CTAs go to sign-up.
   - Recommendation: A. It removes 989 lines of duplicate demo surface over time, fixes the signed-in leak, and keeps one labelled demo (G-10, I-10).
   - Blocks: T17, T18

3. **D3 Existing seeded rows in production databases: what is removed automatically?**
   - A: The migration deletes exact, untouched fingerprint matches for tax records, accounts (no connection, no details, no transactions) and budget template rows (is_default and updated_at = created_at).
   - B: The migration deletes exact matches for tax records and accounts only. Budget template rows stay, because they are generic and the user may have adopted them.
   - C: No automatic delete. An authenticated endpoint plus a dashboard banner ('We added example data to your account by mistake. Remove it') lets each user remove the detected rows.
   - Recommendation: B, after the read-only production counts. The tax rows are someone's personal ledger and the accounts inflate net worth. Budget rows are generic, so leave them to the user. Take a database backup first, following the E3 pre-deploy checklist pattern.
   - Blocks: T6

4. **D4 Rows owned by the former shared mock identities (user_mock, dev_user_123). E1 removed these identities, but data written under them may exist in production.**
   - A: Count them read-only and delete all their rows in the same cleanup migration.
   - B: Count them and leave them. No live session can reach them after E1.
   - C: Export them for the owner, then delete.
   - Recommendation: A if the count shows no real user was ever mapped to these ids. Otherwise C.
   - Blocks: T6

5. **D5 Pension and profile defaults: is a 5% employee and 3% employer contribution with salary sacrifice on (user-profile.entity.ts:136-158, user-profile.service.ts:177-179) a reasonable assumption or fabricated data? The same question covers the £45,000 pension salary fallback.**
   - A: Keep 5%/3% as a labelled UK auto-enrolment assumption ('Assumed: auto-enrolment minimum. Change in Profile') until the user saves a value. Remove the £45,000 fallback and prompt for salary instead.
   - B: Null until the user enters a value. This needs an entity change plus a migration to alter column defaults and nullability, and the E3 drift test must pass.
   - C: Keep as is.
   - Recommendation: A now (no schema change). B can follow if the owner wants strict no-assumption behaviour.
   - Blocks: T20

6. **D6 The personal rental ledger (Poplar and Curo names, amounts and dates) is in git history from commit a640c2be onward. Is it the owner's real data, and should history be rewritten?**
   - A: Real data and the repository is or will be public: rewrite history (git filter-repo), force-push and re-clone. This is a human task.
   - B: Real data but the repository stays private: delete from HEAD only (this epic) and accept the history.
   - C: Not real data: delete from HEAD only.
   - Recommendation: The owner confirms. Code tasks remove the data from HEAD in every case, and the cleanup migration stores only md5 fingerprints so it does not reintroduce the data. No code task is blocked.

7. **D7 The debt page today is an in-memory simulator whose edits vanish. How should debts persist, and what happens when APR or minimum payment is unknown? Accounts have no minimum-payment column, and toDebtItems invents 19.9% APR.**
   - A: Persist through /accounts (type mapped to Credit Card, Loan or Overdraft; APR to interestRate; minimum payment to monthlyContribution). A missing APR shows 'APR not set' and the debt is excluded from avalanche ordering until set. A missing minimum is shown as 'estimated'. Confirm before delete.
   - B: Add debt-specific columns (minimum_payment, debt_type, promo expiry, revert APR) through a migration, then persist as in A.
   - C: Keep the page as a what-if simulator, clearly labelled 'Changes here are not saved. Add debts on Accounts.', and never invent an APR.
   - Recommendation: A. It reuses the savings-page action pattern (app.savings.tsx:14-90) with no schema change. B can follow if promo tracking needs storage. Also decide whether an optional 'Try with example debts' toggle (I-01) is wanted. Under the done-when it can only live in /sandbox, so the recommendation is no in-page toggle.
   - Blocks: T10, T11

## Tasks

### 1. T1 Backend: getAccounts and getPortfolioSnapshot never write (effort S)

- Files: `apps/backend/src/account-intake.service.ts`, `apps/backend/src/account-intake.service.spec.ts`, `apps/backend/src/finance.controller.spec.ts`
- Interfaces: Delete the seeding block and its comment (account-intake.service.ts:114-158). getAccounts(userId) becomes find, then attach details. Keep the UserProfile repository constructor parameter for now (finance.service.ts:38-48 and app.module.ts construct it). Remove the now-unused findOne call only.
- Tests:
  - account-intake.service.spec.ts 'returns [] and never saves for a user with no accounts': find resolves [], expect result toEqual([]) and accountRepo.save not called (replaces the auto-seed test at :40-54)
  - 'getPortfolioSnapshot for a new user returns zero totals without writing': netWorth 0, resolvedAccounts [], save not called
  - 'concurrent getAccounts and getPortfolioSnapshot insert nothing': Promise.all over the in-memory repository (testing/in-memory-repository.ts), row count stays 0
  - finance.controller.spec.ts:106-116 now expects getAccounts on empty repos to return length 0 ('handles account CRUD without seeding')

### 2. T2 Backend: getTaxRecords never writes, and a guard spec stops seed literals coming back (effort S)

- Files: `apps/backend/src/tax.controller.ts`, `apps/backend/src/tax.controller.spec.ts`, `apps/backend/src/no-seed-data.spec.ts (create)`
- Interfaces: getTaxRecords(req) returns taxRecordRepository.find({ where: { userId }, order: { date: 'DESC' } }) only. Delete lines 64-754. Keep the UserProfile repository injection for now (the constructor is used by specs with 2 arguments). no-seed-data.spec.ts reads every apps/backend/src/**/*.ts except *.spec.ts and migrations/** and asserts none match /Poplar|Curo|Main Checking|Workplace Pension — Nest|High Yield Savings/.
- Tests:
  - tax.controller.spec.ts 'returns [] for a new user and never calls create or save' (replaces :55-80)
  - tax.controller.spec.ts fixture at :31 renamed to a neutral 'Rental income (2025/26)'
  - no-seed-data.spec.ts 'no product source contains seed signatures': fails if a signature is reintroduced, and is proven by a temporary red run before the deletion

### 3. T3 Backend: getBudgetEntries never writes, and seed-defaults is idempotent (effort S, needs decision)

- Files: `apps/backend/src/budget.controller.ts`, `apps/backend/src/budget.controller.spec.ts`
- Interfaces: Remove budget.controller.ts:212-216 (the profile lookup and seed). seedDefaultBudgetEntries skips any template name the user already has with isDefault true, so a double click does not duplicate. Under D1-A, remove 'Salary (Take Home)' from DEFAULT_BUDGET_SEEDS. Leave POST reset unchanged; it is unused by the web (grep), so list it for later removal.
- Tests:
  - 'getBudgetEntries returns [] for a new user and never saves' (replaces :28-43)
  - 'seedDefaultBudgetEntries twice creates each template row once' (in-memory repository)
  - 'suggested defaults contain no income entry' (D1-A only)

### 4. T4 Backend: race-safe lazy profile creation (effort S)

- Files: `apps/backend/src/user-profile.service.ts`, `apps/backend/src/user-profile.service.spec.ts`
- Interfaces: private async findOrCreateProfile(userId: string, defaults: Partial<UserProfile>): Promise<UserProfile>. It does findOne, otherwise saves a new row. On a unique violation ((err as any)?.code === '23505' or driverError.code) it re-reads with findOne. getProfile (:147-209) and updateProfile (:217-248) both use it. The default values are unchanged here (see T20).
- Tests:
  - 'getProfile recovers when a concurrent request created the profile': save rejects with { code: '23505' }, findOne returns the row on the second call, result.userId matches
  - 'two concurrent getProfile calls resolve to the same profile id'
  - 'other save errors still propagate'

### 5. T5 Backend: MCP context pack for a new user writes nothing (effort S)

- Files: `apps/backend/src/mcp.service.spec.ts`
- Interfaces: No production change expected after T1 and T4. This is a regression test only.
- Depends on: T1, T4
- Tests:
  - 'getContextPack for a user with no data returns zero accounts and does not save accounts' (real FinanceService over in-memory repositories)

### 6. T6 Backend: RemoveSeededExampleData migration (fingerprint-based cleanup) (effort M, needs decision)

- Files: `apps/backend/src/migrations/RemoveSeededExampleData1794355400000.ts (create)`, `apps/backend/src/migrations/migrations.integration.spec.ts`, `apps/backend/src/migrations/seed-fingerprints.spec.ts (create)`, `apps/backend/README.md (pre-deploy count queries)`
- Interfaces: export const SEEDED_TAX_FINGERPRINTS: readonly string[] (62 md5 hex values of `name|to_char(amount,'FM999999999990.00')|to_char(date,'YYYY-MM-DD')|frequency|category|source|coalesce(to_char(end_date,'YYYY-MM-DD'),'')`, generated once from `git show 11eccf8:apps/backend/src/tax.controller.ts` and recorded in the ledger). export const SEEDED_ACCOUNTS: readonly { name; type; balance; interestRate; monthlyContribution; isCurrent }[] (4 rows). class RemoveSeededExampleData1794355400000 implements MigrationInterface: advisory lock with MIGRATION_LOCK_KEY, re-check its own name in the migrations table (ClearBankTokens pattern), DELETE tax_records WHERE md5(...) = ANY($1), DELETE accounts that match exactly with connection_id IS NULL and NOT EXISTS account_details or transactions. Budget and mock-identity deletes only as D3/D4 decide. Logs counts only. down() is a no-op.
- Depends on: T1, T2
- Tests:
  - seed-fingerprints.spec.ts: 62 entries, each /^[0-9a-f]{32}$/, no duplicates; the migration file contains no 'Poplar' or 'Curo'
  - integration (throwaway Postgres on 55432 via assertSafeTestDatabase): deletes rows whose computed fingerprint is listed; keeps a fingerprinted row whose amount or end_date was edited; keeps a seed-named account whose balance changed, one with connection_id, and one with account_details; deletes both copies of a race-duplicated seed set; a second run changes nothing; zero rows succeeds
  - update the existing integration expectations: the migration list at :43 adds the new class, applied() at :128 gains the third name, and toHaveLength(2) at :185 becomes 3

### 7. T7 Shared UI: EmptyState pattern (effort S)

- Files: `packages/ui/src/patterns/EmptyState/EmptyState.tsx`, `packages/ui/src/patterns/EmptyState/EmptyState.styles.ts`, `packages/ui/src/patterns/EmptyState/EmptyState.stories.tsx`, `packages/ui/src/patterns/EmptyState/EmptyState.test.tsx`, `packages/ui/src/patterns/EmptyState/index.ts`, `packages/ui/src/index.tsx`
- Interfaces: export interface EmptyStateProps { title: string; description?: string; icon?: ReactNode; action?: ReactNode; headingLevel?: 'h2' | 'h3'; id?: string }. The sva recipe uses only surface.subtle, border.subtle, text.primary and text.secondary. Pair the id and data-testid attributes (component-guidelines.md:84).
- Tests:
  - EmptyState.test.tsx: renders the title at the requested heading level, renders description and action, and omits the description element when the prop is absent
  - EmptyState.stories.tsx: Light and Dark stories plus a play() that asserts the heading and clicks the action fn(); zero addon-a11y violations
  - architecture.laws.test.ts passes unchanged (the patterns directory is scanned automatically)

### 8. T8 Web Debt page: remove invented debts and show the empty state (effort S)

- Files: `apps/web/app/containers/debt/DebtContainer.tsx`, `apps/web/app/containers/debt/DebtContainer.test.tsx`
- Interfaces: Delete defaultDebts (:31-64). Initial state is snapshot.toDebtItems(). When debts.length === 0, render <EmptyState title='No debts yet' description='Add your credit cards, loans and overdrafts to compare payoff plans.' action={<Button>Add debt</Button>}> in place of the summary cards and simulator tab. The 'UK debt rules and helplines' tab stays reachable.
- Depends on: T7
- Tests:
  - 'shows the empty state and no invented debts for a user without debt accounts': queryByText('Barclaycard Platinum') and queryByText('Klarna Pay in 3') are null, getByText('No debts yet') is present
  - 'Add debt from the empty state opens AddDebtDialog'
  - existing tests at :45-79 keep passing with the two mocked liability accounts

### 9. T9 Web Debt loader: real surplus, liquid savings and essential expenses (effort S)

- Files: `apps/web/app/routes/app.debt.tsx`, `apps/web/app/features/debt/utils/debtInputs.ts (create)`, `apps/web/app/features/debt/utils/debtInputs.test.ts (create)`, `apps/web/app/containers/debt/DebtContainer.tsx`, `apps/web/app/containers/debt/DebtContainer.test.tsx`
- Interfaces: export function buildDebtInputs(accounts, accountDetails, budgetEntries: BudgetEntry[]): { monthlySurplus: number | null; liquidSavings: number; monthlyEssentialExpenses: number | null }. It uses toMonthly from ~/types/budget and PortfolioSnapshot.getTotalLiquidCash, and returns null when there are no budget entries. The loader returns debtInputs instead of budgetData (fixes app.debt.tsx:15). The container removes '|| 150' (:93) and the 800 and 1600 literals (:114-115). With a null surplus, PayoffStrategySwitcher gets 0 and an inline prompt says 'Set up your budget to see your monthly surplus' (link to /app/budget).
- Depends on: T8
- Tests:
  - debtInputs.test.ts: surplus = monthly income minus expenses across weekly, monthly and annual entries; essential expenses sum only isEssential non-income entries; empty entries give null for both; liquid savings sums only current and saving accounts
  - DebtContainer.test.tsx 'passes the loader surplus, not 150': mock debtInputs.monthlySurplus 420 and expect the switcher to show £420
  - 'shows the budget prompt when surplus is null'

### 10. T10 Web Debt page: persist add, edit and delete through /accounts, with a delete confirmation (effort M, needs decision)

- Files: `apps/web/app/routes/app.debt.tsx`, `apps/web/app/features/debt/utils/debtAccountMapping.ts (create)`, `apps/web/app/features/debt/utils/debtAccountMapping.test.ts (create)`, `apps/web/app/containers/debt/DebtContainer.tsx`, `apps/web/app/components/debt/DebtAccountsList.tsx`, `apps/web/app/routes/app.debt.test.ts (create)`
- Interfaces: export function debtItemToAccountPayload(d: Omit<DebtItem,'id'>): { name: string; type: 'Credit Card' | 'Loan' | 'Overdraft'; balance: number; interestRate: number | null; monthlyContribution: number | null }. The action handles intents createDebt, updateDebt and deleteDebt against POST, PATCH and DELETE /accounts, following app.savings.tsx:14-90. requireAccessToken is used; throw on a non-OK response. Delete asks for confirmation (reuse the existing reset-confirm modal pattern until E5 unifies dialogs).
- Depends on: T8, T9, T11
- Tests:
  - mapping: credit_card maps to 'Credit Card', overdraft to 'Overdraft', loan, bnpl and car_finance to 'Loan'; apr 0 stays 0 and is never 19.9
  - app.debt.test.ts: createDebt POSTs /accounts with the bearer header and mapped body; a non-OK response throws; deleteDebt sends DELETE /accounts/:id
  - DebtContainer: delete shows the confirmation and only submits after confirming

### 11. T11 Finance engine: toDebtItems never invents an APR (effort S, needs decision)

- Files: `packages/finance-engine/src/portfolio.ts`, `packages/finance-engine/src/types.ts`, `packages/finance-engine/src/portfolio.test.ts (or the existing spec)`
- Interfaces: Per D7-A, DebtItem gains aprKnown?: boolean and minimumPaymentEstimated?: boolean. toDebtItems sets apr from interestRate (0 allowed) and aprKnown false when interestRate is null. The minimum payment estimate stays but is flagged. The 19.9 fallback is removed (:286-287). Callers that order by APR treat aprKnown false as last.
- Tests:
  - 'a 0% card keeps 0 APR'
  - 'null interestRate gives aprKnown false and apr 0'
  - 'minimumPaymentEstimated is true when no monthlyContribution'
  - existing ai-context-pack tests still pass (ai-context-pack.ts:148 consumes toDebtItems)

### 12. T12 Web dashboard loader: debt summary computed by the engine (effort S)

- Files: `apps/web/app/utils/debtSummary.ts (create)`, `apps/web/app/utils/debtSummary.test.ts (create)`, `packages/finance-engine/src/health-score.ts`, `packages/finance-engine/src/index.ts`, `apps/web/app/routes/_index.tsx`, `apps/web/app/routes/_index.test.tsx`
- Interfaces: The engine exports isHighInterestDebt(d: DebtItem): boolean, extracting the rule at health-score.ts:255-259 and used there. export interface DebtSummary { totalDebt: number; debtCount: number; highInterestCount: number; monthlyMinimumTotal: number; debtFreeDate: string | null; debts: DebtItem[] }. export function buildDebtSummary(snapshot: PortfolioSnapshot): DebtSummary | null returns null when there are no consumer debts. The debt-free date comes from compareAvalancheAndSnowball(debts, 0).minimumOnly.debtFreeDate. _index.tsx:239-246 is replaced with debtData: buildDebtSummary(portfolioSnapshot).
- Tests:
  - debtSummary.test.ts: a mortgage-only portfolio returns null; one card at 22.9% gives highInterestCount 1; a 3% loan is not high interest; totalDebt equals getTotalConsumerDebt; no field contains 'October 2026'
  - _index.test.tsx 'signed-in loader returns debtData null when the only liability is a mortgage' (mock loadWorkspaceSnapshot)

### 13. T13 Web DebtWidget and HomeDashboard: no fallbacks, consumer debt only (effort S)

- Files: `apps/web/app/components/dashboard/widgets/DebtWidget.tsx`, `apps/web/app/components/dashboard/widgets/DebtWidget.test.tsx`, `apps/web/app/components/dashboard/HomeDashboard.tsx`, `apps/web/app/utils/demoData.ts`
- Interfaces: DebtWidget data?: DebtSummary | null. Remove :64-67 fallbacks, the 'Interest saved' box and the '+£50/mo' line. A null debtFreeDate shows 'Not calculated'. A null summary in edit mode renders EmptyState 'No debts added'. Label 'Total unsecured debt' (sentence case) with tabular-nums. HomeDashboard.isModuleConfigured('debt') uses debtData?.totalDebt > 0 only (drop totalLiabilities at :262). financialStage uses debtData?.debts and budgetData?.monthlyExpenses ?? 0 (drop 1500 at :87). Sandbox persona debtData (demoData.ts:550) is updated to the DebtSummary shape with a future-relative date.
- Depends on: T7, T12
- Tests:
  - DebtWidget.test.tsx: with no data, queryByText('August 2026') and queryByText('£4,650') are null (inverts :23-24); with a summary, the figures render; edit mode with null shows 'No debts added'
  - HomeDashboard test 'mortgage-only user does not see the debt widget'
  - sandbox.test.tsx still renders total-debt for persona A

### 14. T14 Web Budget: hide the fabricated MTD actuals (effort S)

- Files: `apps/web/app/components/budget/BudgetDashboard.tsx`, `apps/web/app/components/budget/BudgetDashboard.test.tsx (create)`
- Interfaces: cashFlowSplit sets hasActuals = entries.some(e => e.actualMtdGbp !== undefined). The actual sums add only defined actualMtdGbp values (no 0.92 or 0.78). When hasActuals is false, the 'MTD Settled Actuals' cells (:497-502, :586-591) are not rendered, and one EmptyState-style prompt with a link to /app/accounts appears. The removed cells take their hex colours (#6366f1, #10b981) with them.
- Depends on: T7
- Tests:
  - 'does not render MTD Settled Actuals when no entry has actuals'
  - 'never shows 92% of a £1,000 priority budget (£920)'
  - 'renders actuals when actualMtdGbp is set'
  - 'shows the connect-a-bank prompt linking to /app/accounts'

### 15. T15 Web home loader: remove the pension and mortgage literals (effort S)

- Files: `apps/web/app/routes/_index.tsx`, `apps/web/app/components/dashboard/widgets/MortgageWidget.tsx`, `apps/web/app/routes/_index.test.tsx`
- Interfaces: pensionData.employeePercent and employerPercent use Number(x ?? 0) (fixes the || 5.0 and || 3.0 at :214-215). mortgageData.interestRate comes from the first mortgage account's interestRate or null, and remainingTermYears is null. MortgageWidget hides the monthly-payment figure and shows 'Add your rate and term on Mortgage' when either is null (removes || 4.5 and || 25 at :58-59).
- Tests:
  - _index.test.tsx 'a user with 0% pension contribution gets employeePercent 0'
  - 'mortgage rate comes from the account, term is null'
  - MortgageWidget 'null rate hides the payment and shows the prompt'

### 16. T16 Remove 'Poplar' and the seeding claims from copy, fixtures and docs (effort S)

- Files: `apps/web/app/containers/tax/TaxContainer.tsx`, `apps/web/app/components/tax/TaxIncomeSectionCard.tsx`, `apps/web/app/containers/tax/TaxContainer.test.tsx`, `apps/mobile-companion/src/api/client.ts`, `docs/app_functionality.md`, `docs/pages_and_features.md`
- Interfaces: TaxContainer.tsx:844 becomes the title 'Rental property'. Placeholders at :1867 and TaxIncomeSectionCard.tsx:399 become 'e.g. Flat rent, client retainer, interest'. Fixtures are renamed to neutral names. Delete docs/app_functionality.md section 3.1 (:78-80). docs/pages_and_features.md:112 drops 'demo/seed', and the demo rows describe the D2 outcome.
- Tests:
  - TaxContainer.test.tsx updated assertions pass (:154, :179, :253, :313 with the new names)
  - a repo grep for 'Poplar' outside git history returns nothing (manual check recorded in the ledger)

### 17. T17 Web: retire ?demo=true and DemoModeBanner (D2-A) (effort S, needs decision)

- Files: `apps/web/app/routes/_index.tsx`, `apps/web/app/routes/_index.test.tsx`, `apps/web/app/routes/app._index.tsx`, `apps/web/app/components/dashboard/DemoModeBanner.tsx (delete)`, `apps/web/app/utils/demoData.ts`, `apps/web/app/components/home/HomeHero.tsx`, `apps/web/app/components/home/FeaturePillars.tsx`
- Interfaces: The home loader calls loadWorkspaceSnapshot first. If there is no user and isDemoMode(url), it returns redirect('/sandbox'). For a signed-in user the parameter is ignored. app._index.tsx: if there is no user and the parameter is set, redirect('/sandbox'), otherwise behave as today. Delete getDemoDashboardData and any DEMO_* constants no longer referenced (verify with grep). Remove isDemo from the loader shapes. Links at HomeHero.tsx:198 and FeaturePillars.tsx:279 point to /sandbox.
- Tests:
  - _index.test.tsx 'signed-out ?demo=true redirects to /sandbox' (replaces :42-56)
  - 'signed-in ?demo=true returns the real dashboard data and never demo@flump.app' (mock getAuthSession with a user)
  - app._index 'signed-out /app?demo=true redirects to /sandbox, not /login'
  - remove the banner render test (:78-95)

### 18. T18 Web: /sandbox is for signed-out visitors only, and its seed carries no salary (D2-A) (effort S, needs decision)

- Files: `apps/web/app/routes/sandbox.tsx`, `apps/web/app/routes/sandbox.test.tsx`, `apps/web/app/utils/demoData.ts`
- Interfaces: export const loader = async (args) => { const { user } = await getAuthSession(args, { ensureSignedIn: false }).catch(() => ({ user: null })); if (user) throw redirect('/'); return {}; }. The catch keeps the public demo reachable when authkit errors, but must not swallow a redirect Response (rethrow instanceof Response). handleSaveAndCreateAccount (:115-139) leaves annualGrossSalary out of the seed (or marks it optional in OnboardingSeedPayload if the type requires it). Persona dates are computed relative to now.
- Tests:
  - sandbox loader 'redirects a signed-in user to /'
  - 'returns {} for a signed-out visitor'
  - 'returns {} when authkit throws a non-Response error'
  - 'Save and create account writes a seed without annualGrossSalary'

### 19. T19 Web onboarding starts empty (I-05, under D1-A) (effort M, needs decision)

- Files: `apps/web/app/routes/app.onboarding.tsx`, `apps/web/app/routes/app.onboarding.test.tsx`
- Interfaces: The numeric useState defaults at :99-120 become null or empty strings, with the example values moved to placeholder attributes. Finish is disabled until income is entered. Accounts and budget rows are created only for fields the user filled in (none for empty cash or pension). Checking res.ok and the saved-X-of-Y summary belong to E5/I-05 follow-up and are not in this task.
- Tests:
  - 'Next, Next, Finish without input is blocked: Finish disabled until salary entered'
  - 'empty cash and pension fields create no accounts' (mock fetch, assert no POST /accounts with 5000 or 15000)
  - 'placeholders show the examples'

### 20. T20 Pension defaults: label the assumptions and drop the £45,000 salary (D5-A) (effort S, needs decision)

- Files: `apps/web/app/containers/pension/PensionContainer.tsx`, `apps/web/app/containers/pension/PensionContainer.test.tsx`, `apps/backend/src/user-profile.service.ts`, `apps/backend/src/user-profile.service.spec.ts`
- Interfaces: PensionContainer :190-192 uses salary ?? null and, when null, shows a prompt to add salary in Profile instead of projecting from £45,000. When the profile has never been saved by the user, the 5% and 3% values show the label 'Assumed: auto-enrolment minimum'. Backend formatProfile keeps its outputs. No schema change.
- Tests:
  - 'no salary shows the add-salary prompt, not a projection'
  - 'unsaved profile shows the assumed label on contribution rates'
  - 'reset user keeps 0% (existing hasResetFinancialData test at user-profile.service.spec.ts:91 still passes)'

## Can start without any decision

- T1
- T2
- T4
- T5
- T7
- T8
- T9
- T12
- T13
- T14
- T15
- T16

## Review focus

- Parallel first-visit loaders: root.tsx:37 and loadWorkspaceSnapshot both GET /user-profile. After T1-T4, no GET may write anything except the race-safe profile row, and the onboarding redirect at _index.tsx:66 must fire on the first visit.
- T4 must recognise a unique violation through TypeORM's QueryFailedError (driverError.code '23505'), not only err.code, and must not swallow other errors.
- Users who already had seeds removed or pressed reset: removing the hasResetFinancialData gate must not change what they see. That flag now only affects pension defaults (user-profile.service.ts:90-114) and PensionContainer.tsx:189.
- Fingerprint stability in T6: amount numeric(12,2) and date must be formatted with to_char in SQL, not via the session DateStyle or a JS Number, or nothing will match. end_date is part of the fingerprint, so rows capped through createBulkTaxRecords (tax.controller.ts:778-784) are kept.
- T6 accounts rule: a user whose real account coincidentally equals a seed tuple is near-impossible, but the rule also requires no account_details, no transactions and no connection_id. Decide whether a partial seed set (some accounts edited) is acceptable to leave behind.
- T6 must update the existing integration expectations (migration list at :43, applied() at :128, toHaveLength(2) at :185), otherwise the E3 suite fails when run on the throwaway container.
- Migration logs must print counts only, with no user ids, names or amounts (privacy). The fingerprint file must not contain any ledger literal.
- Signed-in user plus ?demo=true from an old link or a marketing CTA must land on the real dashboard with no redirect loop between / and /sandbox. A signed-out visitor at /app?demo=true must reach /sandbox, not /login.
- WorkOS or authkit outage on /sandbox: after E1, getAuthSession rethrows Response and status-bearing errors. The T18 catch must keep the anonymous demo working without turning a real redirect into a signed-out view.
- Sandbox persona data must keep satisfying the new DebtSummary widget shape, and the persona dates (demoData.ts:554 'September 2026') must not be in the past.
- Debt page with only a mortgage, or only 0% cards: the mortgage never appears as a debt (toDebtItems filters category debt), and 0% must not display as 19.9% (portfolio.ts:286-287, T11).
- Budget 'Add suggested defaults' clicked twice currently duplicates 16 rows (budget.controller.ts:224-236). T3 adds the guard, and the template must not insert an invented income under D1-A.
- Empty state versus fetch failure: fetchJson turns 500s into [] (backend-client.server.ts:72-80), so on an outage the new empty states will say 'No debts yet'. Coordinate with E5 (I-04) so empty-state copy is suppressed when a load failed.
- HomeDashboard safe-to-spend still splits living costs 60/40 (HomeDashboard.tsx:97) and the stage banner reads financialStage. Check these still read sensibly once debtData.debts is real.
- No new raw hex, no primitive tokens, and tabular-nums on every new or changed figure (T7, T9, T13, T14, T15). Do not create any new flat .tsx component files.

## Risks

- Developers lose the automatic local seed data. With no fixtures kept (ADR-010 direction), local testing needs manual entry or onboarding. Document this in the README, and decide later whether to add a dev-only script that refuses to run in strict env.
- Production users who built on seeded accounts (renamed them or edited balances) keep those rows, because the migration deletes exact matches only. Their net worth may still contain invented history until they edit it. This is accepted and called out in the decision.
- T6 is irreversible (down is a no-op). Take a database backup and run the read-only counts first, following the E3 pre-deploy checklist. If the counts are surprising (for example many edited near-matches), stop and revisit D3.
- Overlap with E5: I-04 and I-06 touch the same loaders, the onboarding flow and the confirmation dialogs. Sequence so that E2 does not invent its own failure flag, and T10's confirmation follows the existing modal until E5 unifies dialogs.
- Overlap with E9 and I-09: DebtWidget, BudgetDashboard and DemoModeBanner are legacy flat files. E2 edits or deletes them without moving them. Adding BudgetDashboard.test.tsx next to a flat component is a stopgap until E9 colocates it.
- Overlap with E4: the home tax estimate * 0.29 (_index.tsx:146) is also a fabricated figure, but it belongs to tax correctness and is left alone here.
- The CI gates may fail at @flump/mcp because of the zod 4 breakage recorded in the E3 ledger. Implementers must report this honestly and run the affected packages directly, not claim green.
- The personal ledger stays in git history until the owner decides D6. Deleting it from HEAD does not remove it from clones or forks.
- Removing the 19.9% APR fallback (T11) changes avalanche ordering and the AI context pack for users with an unset APR. ai-context-pack.ts:148 consumes toDebtItems and needs a check.

## Rollout

1. Backend stop-the-bleeding first. Ship T1, T2 and T4, plus T3 once D1 is decided (T3 is small and can follow alone). New users stop getting seeds and the race disappears. Deploying these needs no data change.

2. The human, read-only, against production, before T6:
   - count tax_records by fingerprint match;
   - count exact seed account rows and how many have details, transactions or a connection;
   - count is_default budget rows with updated_at = created_at;
   - count rows owned by user_mock and dev_user_123.

   Record the numbers in the E2 ledger, take a backup, then decide D3 and D4.

3. T6 runs on boot through migrationsRun (E3). Test it first on the throwaway Postgres on port 55432 with assertSafeTestDatabase, never on the developer container on 5432.

4. Web tasks:
   - T7 first.
   - Then the debt work in order: T8, T9, T10 (T10 also needs T11).
   - T12, T14, T15 and T16 in parallel.
   - T13 after T12.
   - Demo tasks T17 and T18 after D2.
   - T19 after D1.
   - T20 after D5.

5. The owner answers D6 (history rewrite) separately. It does not block code.

6. Before each PR, run the four gates: bun run lint (restore the three reformatted CHANGELOG.md files), check-types, test and build. Report the @flump/mcp breakage honestly if it persists.

7. Implementers use sonnet and reviewers use sonnet (AGENTS.md section 6). Commit only when the user asks.

8. Rollback: redeploying the previous web or backend version brings no seeding back, because the literals are gone from HEAD. The cleanup migration cannot be reversed except by restoring the backup.

## Facts (as cited by the planner)

- The audit docs live only in the main checkout, at /Users/marcgallagher/personal/flump/docs/audit (EPICS.md, track files, plans/). This worktree has only docs/audit/plans, with the E1 and E3 design and plan files. (`/Users/marcgallagher/personal/flump/docs/audit (ls); worktree docs/audit/plans (ls)`)
- Still true: getAccounts saves 4 accounts (Main Checking 2450.75, High Yield Savings 15800, Cash ISA 42100.5, Workplace Pension Nest 18500) whenever a user has none and hasResetFinancialData is false. The comment says it is for development, but no environment check exists. Line numbers moved from the audit's 93-136. (`apps/backend/src/account-intake.service.ts:108-158`)
- getPortfolioSnapshot calls getAccounts, so it seeds as well. (`apps/backend/src/account-intake.service.ts:296-298`)
- The C-04 race still holds. loadWorkspaceSnapshot fetches /accounts and /portfolio-snapshot in the same Promise.all, so two seeding calls run at once for a new user. fetchJson turns any non-OK response or exception into a fallback. (`apps/web/app/services/backend-client.server.ts:72-100`)
- GET /tax-records saves 62 literal records (Poplar Rent, Curo Service Charge, Marcus, Vanguard, Trading 212 ISA and others, 2020/21 to 2025/26) when the user has none and has not reset. The literal runs from line 66 to the save at line 747. (`apps/backend/src/tax.controller.ts:56-756`)
- GET /budget-entries seeds 16 DEFAULT_BUDGET_SEEDS (isDefault true, including 'Salary (Take Home)' at 3000 income) when the user has none and has not reset. POST budget-entries/seed-defaults seeds with no duplicate guard, and POST budget-entries/reset deletes everything and re-seeds. (`apps/backend/src/budget.controller.ts:34-186, 197-236, 352-360`)
- The web already has an explicit 'Add suggested defaults' button that POSTs /budget-entries/seed-defaults, and the budget page has an isBudgetEmpty state. No web code calls budget-entries/reset. (`apps/web/app/containers/budget/BudgetContainer.tsx:140-144, 196-210, 453, 515`)
- getProfile writes a profile row on GET, with defaults pensionPercent 5, pensionEmployerPercent 3 and isSalarySacrifice true. user_id is unique. The root loader and the route loaders both GET /user-profile in parallel, so a new user can hit a unique-violation 500, which fetchJson turns into null. (`apps/backend/src/user-profile.service.ts:147-215; apps/backend/src/entities/user-profile.entity.ts:14; apps/web/app/root.tsx:37; apps/web/app/services/backend-client.server.ts:93`)
- The home loader redirects to onboarding only when userProfile is non-null and onboardingCompleted is false. A null profile from the race skips onboarding. (`apps/web/app/routes/_index.tsx:66-68`)
- formatProfile still uses hasResetFinancialData to choose pension defaults, and PensionContainer uses it to choose a 45000 salary fallback. (`apps/backend/src/user-profile.service.ts:90-114; apps/web/app/containers/pension/PensionContainer.tsx:189-201`)
- The MCP context pack calls getProfile and financeService.getAccounts, so today an MCP call also seeds accounts and creates a profile. (`apps/backend/src/mcp.service.ts:95-98`)
- Existing tests assert the seeding: the account-intake auto-seed test, the finance controller 'handles account CRUD and auto-seeding' test (expects 4), the budget 'should seed default budget entries if empty' test, and the tax 'should seed default tax records' test. (`apps/backend/src/account-intake.service.spec.ts:40-54; apps/backend/src/finance.controller.spec.ts:106-116; apps/backend/src/budget.controller.spec.ts:28-43; apps/backend/src/tax.controller.spec.ts:55-80`)
- I-01 holds. defaultDebts (Barclaycard, Klarna, Lloyds overdraft, Tesco loan) is used whenever toDebtItems returns nothing. evaluateFinancialStage gets the literals liquidSavings 800 and monthlyEssentialExpenses 1600. Add, delete and update only call setDebts. (`apps/web/app/containers/debt/DebtContainer.tsx:31-64, 99-103, 110-117, 139-153`)
- New bug: the debt route passes budgetData as the raw budgetEntries array, while the container reads budgetData?.monthlySurplus. The surplus is therefore always the 150 fallback, even for users with a budget. (`apps/web/app/routes/app.debt.tsx:15; apps/web/app/containers/debt/DebtContainer.tsx:92-93`)
- toDebtItems substitutes 19.9% APR when an account's interestRate is 0 or missing, and estimates the minimum payment as max(25, 2.5% of balance). Accounts have no minimum-payment column. (`packages/finance-engine/src/portfolio.ts:265-291; apps/backend/src/entities/account.entity.ts:27-49`)
- I-02 holds at new lines. The loader's debtData uses totalLiabilities (which includes mortgages), highInterestCount 2, debtFreeDate 'October 2026' (already past), interestSaved 18% and minimums 2.5%. The widget falls back to 4650, 'August 2026', 840 and 2, and hard-codes the copy 'Avalanche payoff active (+£50/mo surplus)'. (`apps/web/app/routes/_index.tsx:239-246; apps/web/app/components/dashboard/widgets/DebtWidget.tsx:64-67, 154-156`)
- getTotalLiabilities sums both debt and mortgage categories. getTotalConsumerDebt (category debt only) and toDebtItems exist and are already returned by the backend snapshot. (`packages/finance-engine/src/portfolio.ts:99-101, 212-245; apps/backend/src/account-intake.service.ts:308-309`)
- The dashboard shows the debt widget whenever totalLiabilities > 0, so a mortgage alone turns it on. financialStage reads debtData.debts, which the loader never sets, and uses a ?? 1500 expenses fallback. (`apps/web/app/components/dashboard/HomeDashboard.tsx:78-89, 259-264`)
- The engine's high-interest rule is APR >= 6.5, or debt type overdraft or credit_card. (`packages/finance-engine/src/health-score.ts:255-259`)
- I-03 holds. MTD actuals fall back to toMonthly*0.92 and *0.78, and actualMtdGbp is never populated anywhere in apps or packages (grep). BudgetDashboard has no test file. (`apps/web/app/components/budget/BudgetDashboard.tsx:208-215, 497-502, 586-591; apps/web/app/types/budget.ts:16`)
- The home loader also invents mortgage interestRate 4.5 and remainingTermYears 25, and Number(pensionPercent) || 5.0 turns a real 0% into 5%. user_profiles has no mortgage_rate column, so MortgageContainer's userProfile?.mortgageRate || 4.5 is always 4.5. (`apps/web/app/routes/_index.tsx:214-224; apps/web/app/components/dashboard/widgets/MortgageWidget.tsx:58-59; apps/backend/src/migrations/Baseline1794355200000.ts:27 (user_profiles DDL); apps/web/app/containers/mortgage/MortgageContainer.tsx:54-55`)
- The home loader returns static demo data for ?demo=true before any auth check, so a signed-in user gets demo data. /app?demo=true redirects to /?demo=true. (`apps/web/app/routes/_index.tsx:22-25; apps/web/app/routes/app._index.tsx:6-9`)
- DemoModeBanner is a flat file with raw hex and rgba colours and inline styles, which breaks the colocation and semantic-token laws. It is rendered only when isDemo is set. (`apps/web/app/components/dashboard/DemoModeBanner.tsx:6-84; apps/web/app/routes/_index.tsx:330`)
- Marketing CTAs inside the web app link to /?demo=true. (`apps/web/app/components/home/HomeHero.tsx:198; apps/web/app/components/home/FeaturePillars.tsx:279`)
- The /sandbox loader does no auth check. The page writes persona salary and stage into financialBaselineAtom. 'Save and create account' writes an onboarding seed cookie with annualGrossSalary 34000, 45000 or 115000. (`apps/web/app/routes/sandbox.tsx:70-72, 89-111, 115-139`)
- Sandbox persona data includes debtFreeDate 'September 2026', which is already in the past. (`apps/web/app/utils/demoData.ts:550-554`)
- Onboarding pre-fills age 32, salary 45000, housing 900, cash 5000, pension pot 15000 and pension 5% with salary sacrifice (I-05). This is not ticketed in any epic. (`apps/web/app/routes/app.onboarding.tsx:99-120; /Users/marcgallagher/personal/flump/docs/audit/EPICS.md (no I-05 ticket)`)
- The personal 'Poplar' name also leaks into UI copy, test fixtures, mobile mock data and docs. (`apps/web/app/containers/tax/TaxContainer.tsx:844,1867; apps/web/app/components/tax/TaxIncomeSectionCard.tsx:399; apps/web/app/containers/tax/TaxContainer.test.tsx:18,36; apps/backend/src/tax.controller.spec.ts:31; apps/mobile-companion/src/api/client.ts:134,170; docs/app_functionality.md:78-80`)
- packages/ui has no EmptyState component. Every subdirectory of patterns is checked by the colocation law test, and the web already imports patterns from @repo/ui. (`packages/ui/src/patterns (ls); packages/ui/src/tokens/architecture.laws.test.ts:8,36-57; apps/web/app/features/debt/components/PayoffStrategyControls/PayoffStrategyControls.tsx:1`)
- The E3 migration conventions to follow: file names end in a 13-digit timestamp, a shared advisory lock, a re-check of the migration's own name, and a no-op down. The integration spec lists the migrations explicitly and asserts exactly 2 applied, so a new migration must update it. (`apps/backend/src/migrations/ClearBankTokens1794355300000.ts:7-37; apps/backend/src/config/migration-lock.ts; apps/backend/src/migrations/migration-files.spec.ts:5-10; apps/backend/src/migrations/migrations.integration.spec.ts:6-7,43,128,185`)
- Accounts have created_at but no updated_at. tax_records and budget_entries have both. (`apps/backend/src/migrations/Baseline1794355200000.ts:20,23,25`)
- Gate caveats recorded by E3: the turbo gates fail only at @flump/mcp (zod 4 breakage on main), bun run lint reformats three unrelated CHANGELOG.md files, and migration integration tests need a throwaway Postgres on port 55432. The developer container on 5432 must not be touched. (`/Users/marcgallagher/personal/flump/docs/audit/plans/E3-config-db-ledger.md (Task 3, 4 and 6 entries); docs/audit/plans/E3-config-db-plan.md Global Constraints`)

## Fact-check

32 claims checked; 2 not confirmed.

- **false**: GET /budget-entries seeds 16 DEFAULT_BUDGET_SEEDS incl. Salary (Take Home) 3000; seed-defaults has no duplicate guard; reset deletes and re-seeds — There are 15 seed entries (15 name: and 15 isDefault: true lines), not 16. The rest (Salary at line 177, no duplicate guard, reset re-seeds) holds.
- **unclear**: E3 gate caveats: @flump/mcp zod 4 breakage, lint reformats CHANGELOGs, throwaway Postgres on 55432 — Main-checkout E3 ledger not read; the 55432 port is confirmed in migrations.integration.spec.ts comments.

Issues the checker says were missed:

- apps/backend/src/user-profile.service.ts:382 sets hasResetFinancialData = true in a reset flow. The plan keeps the column but should say what that flow now does (data deletion only) and whether the reset-then-reseed copy in the UI still makes sense once seeding is gone.
- apps/backend/src/budget.controller.ts:352-360 POST budget-entries/reset deletes everything and re-seeds. With no web caller it should be deleted or changed to clear-only, otherwise the budget seed literal survives and the 'no seed signatures' guard spec fails.
- apps/backend/src/budget.controller.ts:224-236 seed-defaults has no duplicate guard, and the web button shows only when isBudgetEmpty (BudgetContainer.tsx:140-144). This is the retained path for budget defaults, so the seed literal stays in the backend. That conflicts with the guard spec and the 'delete seed literals outright' design for budget.
- apps/web/app/containers/mortgage/MortgageContainer.tsx:52-54 also uses balance 150000 and term 25 fallbacks from nonexistent profile fields (mortgageBalance, mortgageTermYears), not just the 4.5 rate. Any 'no invented figures' fix there must cover all three.
- apps/backend/src/migrations/migrations.integration.spec.ts:43,128,187 (migrations list, applied names, toHaveLength(2)) and apps/backend/src/migrations/migration-files.spec.ts all need updating for the new migration; the dist/ and coverage/ dirs under apps/backend also contain 'Poplar' and seed code, so the guard spec must restrict its scan to src.
