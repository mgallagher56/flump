Decisions: open

# System audit, November 2026: plan

This plan turns the audit's findings into nine slices. Each slice is one pull request. No slice is stacked on an open pull request: a slice starts when the slices it depends on have merged.

- Findings: [FINDINGS.md](./FINDINGS.md). Target model: [TARGET-MODEL.md](./TARGET-MODEL.md). Today's map: [docs/system/value-map.yaml](../../system/value-map.yaml).
- A slice is implemented only in the parts that open decisions do not touch (AGENTS.md section 13). Each slice lists its decisions.
- Every slice follows the laws in AGENTS.md: an independent reviewer, hand-worked values for any changed calculation, a "Guard changes" heading, and a parity log row where a shared flow changes.
- Every migration adds first, back-fills, switches readers, and drops a release later. Each data rewrite keeps a before-image table, as `LiabilitySignRule1794358050000` did.
- Effort: S is under a day of agent work, M is one to two days, L is three or more.

## Order at a glance

| Slice | Name | Depends on | Decisions | Effort | Quick win |
|---|---|---|---|---|---|
| 1 | The value map and its checks | none | 11 | M | yes |
| 2 | Wrong numbers today | none | 7 (note only), 9 | M | yes |
| 3 | One assembler | 1 | 10 | L | no |
| 4 | Accounts as the home for homes and loans | 2 | 4, 8, 9 | L | no |
| 5 | Budget lines linked to saved facts | 3, 4 | 1 | L | no |
| 6 | Pay and pension answers | 3 | 2, 3 | M | no |
| 7 | Self Assessment joined up | 4, 6 | 5, 6, 7 | L | no |
| 8 | Browser state | 3 | 13 | M | no |
| 9 | Database housekeeping | 4, 5, 6, 7 | 12 | M | no |

Slices 1 and 2 touch different files and can run at the same time. Slices 6 and 8 can run alongside 4 and 5.

## Slice 1. The value map and its checks

**Scope.** Make the map a maintained rule. No product code changes.

- Add `scripts/check-value-map.ts` to `check:laws`, with the five parts in TARGET-MODEL.md, "The automated check".
- Add a `value` field to each column in `apps/backend/src/modules/privacy/user-data-registry.ts`, holding a map id, and extend `user-data-registry.spec.ts` to require it.
- Extend `scripts/check-one-tax-engine.ts` and `scripts/lib/one-tax-engine.ts` into a general one-engine guard. The tax rule set stays as it is. A new rule set counts money arithmetic on saved rows in `apps/web`, `apps/backend` and `packages/mcp`, with a per-file baseline that can only fall.
- Add the "One home per value" section to `AGENTS.md` and the map to its section 5 pre-flight list.
- Add the link test harness: four personas (joint account at 40%, buy-to-let owner, self-employed in Scotland, no salary saved) in `apps/e2e/support/personas.ts` and in `packages/finance-engine/src/picture/__fixtures__/personas`, and one example link test.
- Fix persona P5's invalid tax records in `scripts/ops/synthetic-personas.ts` (SA-7).
- Add a "Test" column to the generated links view.

**Files.** `scripts/check-value-map.ts`, `scripts/lib/`, `scripts/generate-value-map.ts`, `docs/system/`, `AGENTS.md`, `package.json`, `user-data-registry.ts` and its spec, `apps/e2e/support/personas.ts`, `apps/e2e/tests/links/`.

**Migrations.** None.

**Tests.** Unit tests for the checker with fixtures for each failure. The registry spec. One browser link test (L09) as the pattern.

**Risk.** Low. The ratchet starts at today's counts, so nothing fails on day one. The risk is a noisy pattern; keep the arithmetic patterns narrow and list each file's count.

**What the user will notice.** Nothing.

**Guard changes.** Yes: a new entry in `check:laws` and a new law in `AGENTS.md`. Both need sign-off first (decision 11).

## Slice 2. Wrong numbers today

**Scope.** Defects that show a wrong figure or change saved data, fixed where they are, with no change to stored data.

| Fix | Finding | Where |
|---|---|---|
| The Savings and Debt edit forms send only changed fields, and never a share as a whole | SD-1, JO-1, SD-7 | `SavingsContainer.tsx`, `AddSavingsAccountDialog.tsx`, `AddDebtDialog.tsx`, `app.savings.tsx`, `app.debt.tsx` |
| The account edit dialog sends the balance only when it changed | CH-3 | `AddEditAccountsDialog.tsx` |
| The Retirement loader asks for budget lines | PP-6 | `app.retirement.tsx` |
| One rule for when a salary counts as PAYE pay, used by the page and the AI tax tool | SA-1 | `packages/finance-engine/src/picture/selectors/estimated-tax-due.ts`, `TaxContainer.tsx`, `TaxSourceContainer.tsx`, `getTaxYearPosition.ts` |
| The AI paths stop inventing a salary, and report it as missing | SA-2, AI-1, AI-2 | `packages/finance-engine/src/profile.ts`, `agent-data.service.ts`, `ai-context-pack.ts`, `projectNetWorth.ts` |
| The context pack uses the current tax year | AI-3, SA-8 | `profile.ts`, `ai-context-pack.ts` |
| The context pack's debt-free date uses no hidden extra payment | AI-5 | `ai-context-pack.ts` |
| A £0 income line does not make left over negative | BU-8 | `budget-totals.ts` |
| The Dashboard savings card uses the user's share | SD-2, JO-3 | `apps/web/app/routes/_index.tsx` |
| The runway what-if applies a share once | JO-2 | `BudgetContainer.tsx`, `RunwayCalculator.tsx` |
| Retirement picks the home mortgage, not the buy-to-let one | HM-8 | `packages/finance-engine/src/retirement-input.ts` |
| The Mortgage page "Last updated" reads the right field | CH-6 | `MortgageContainer.tsx` |
| The Mortgage page re-reads saved figures after a save | CS-1 | `MortgageContainer.tsx` |
| Reset clears browser storage | CS-3, AI-11 | `DataTab.tsx`, `useUserProfile.ts`, `userStorage.ts` |
| A plain note on the Self Assessment page when the tax region is Scotland | SA-3 | `features/tax`, wording under the copy guide and the advice boundary policy |
| A type change from a debt to an asset re-signs past months | CH-4 | `apps/backend/src/modules/snapshots/stored-balance.ts` |
| The staged import creates accounts through the account service | AI-9, AI-10 | `imports.service.ts`, `account-intake.service.ts` |

**Migrations.** None.

**Tests.** A unit or component test per fix. Hand-worked expected values for SA-1 (40,000 of self-employed income in 2026/27 less the 1,000 trading allowance is 39,000; 26,430 above the allowance at 20% is 5,286 and at 6% Class 4 is 1,585.80; total £6,872), BU-8, JO-2 and SD-2. Browser link tests for L67, L70, L58, L42 and L48, written first so they fail before the fix.

**Risk.** Medium. Many small edits across pages that other lanes are also touching (UX batch G, phone layout). Check `gh pr list` first and rebase late. The SA-1 fix changes a tax figure, so the owner signs its vectors (E4 decision).

**What the user will notice.** Joint savings no longer shrink on edit. The Self Assessment page and the Dashboard agree. Retirement can build a target from budget lines. The AI stops quoting a salary nobody entered.

**Decisions.** 9 for the on-screen wording of share and whole. 7 only for the note's wording.

## Slice 3. One assembler

**Scope.** Every figure shown in more than one place comes from the picture.

- Add selectors: savings total and saved each month, the debt summary (total, minimums, debt-free date, interest), ISA allowance used, paid into pensions each month, and a tax input builder.
- Move `get_financial_snapshot`, `get_budget_summary`, `get_debt_overview`, `get_tax_year_position`, `project_net_worth` and the context pack onto those selectors. Delete `summariseBudget` and the tools' local sums.
- Move the Dashboard loader's local sums onto the selectors. Delete the web `toMonthly` copy and use `budgetRowMonthly`.
- Retire `PortfolioSnapshot.getMonthlyHistory` in favour of `selectNetWorthSeries`. Remove `GET /portfolio-snapshot`, which has no caller.
- Retire `userProfileToFinancialBaseline` from signed-in paths. Signed-out calculators keep it.
- Remove the unused `picture.housingCost` consumer gap by making it the housing cost selector slice 5 needs.
- Deliver the picture to callers as decision 10 settles.

**Files.** `packages/finance-engine/src/picture/`, `packages/mcp/src/tools/`, `packages/finance-engine/src/ai-context-pack.ts`, `apps/web/app/routes/_index.tsx`, `apps/web/app/types/budget.ts`, `apps/backend/src/modules/agent/agent-data.service.ts`.

**Migrations.** None.

**Tests.** Hand-worked tests for each new selector. The consistency tests cover every AI read tool against the picture for all personas, including the four new ones. Browser link tests for L34, L45, L46 and L61 (through the context pack preview).

**Risk.** Medium. AI output changes for existing tokens: left over and months of cover will now equal the pages. The MCP output policy and evals need a re-run.

**What the user will notice.** The AI states the same figures as the pages.

**Decisions.** 10.

## Slice 4. Accounts as the home for homes and loans

**Scope.**

- Property kind: `account_subtype` `home` or `rental` on Property rows. Loan kinds for car finance, buy now pay later and other.
- `accounts.linked_account_id` from a mortgage to its property. The account service keeps the pair's share in step in both directions.
- Repayment type on the mortgage account.
- One backend call creates a mortgage with its property in one transaction. The Accounts page and onboarding use it.
- The Mortgage page's buy-to-let tab reads and writes the buy-to-let accounts.
- One account form: the same field set per account type on Accounts, Savings, Debt, Pension and Mortgage, sending only changed fields.
- Creating an account writes its first history row. One function keeps `accounts.balance` equal to the newest history value (decision 8).
- The check-in reminder reads `snapshot_checkins`.
- Remove `PATCH /accounts/balances`, which has no caller.

**Files.** `apps/backend/src/entities/account.entity.ts`, `account-intake.service.ts`, `snapshots/`, `packages/api-contract/src/domains/accounts.ts`, `packages/finance-engine/src/picture/selectors/loan-to-value.ts`, `home-equity.ts`, `check-in-day.ts`, `apps/web/app/containers/mortgage/`, `apps/web/app/components/dialogs/addEditAccountsDialog/`, `apps/web/app/features/savings`, `features/debt`, `features/pension`, `features/onboarding`.

**Migrations.**

1. Add `linked_account_id uuid NULL` with a foreign key (`ON DELETE SET NULL`) and `repayment_type varchar NULL`. Additive. Rollback: drop both.
2. Back-fill Property subtype from the name test, the link where a user has exactly one mortgage and one property of a kind, and repayment type from `user_profiles.mortgage_type`. Keep a before-image table. Rollback: restore from it.
3. Copy any `buy_to_let_*` profile values into accounts where no buy-to-let account exists (decision 4). Before-image table. Rollback: delete the created accounts by id.
4. Back-fill a first history row for accounts that have none, with source `backfill`. Rollback: delete rows with that source and migration marker.
5. The profile columns are dropped in slice 9, a release later.

**Tests.** Hand-worked loan to value and equity with a home and a rental. Backend integration tests for the pair's share in both directions and for the balance rule. Browser link tests for L05, L08, L10, L18, L19, L20, L68, L70 and L71.

**Risk.** High. It changes the account form on five pages and the most used write path. Mitigation: land the backend and migrations behind the existing forms first inside the same pull request's commits, and keep the old profile columns readable until slice 9.

**What the user will notice.** A buy-to-let mortgage added in Accounts shows on the Mortgage page. A rental is not counted as the home. A card can be set up fully from one form. A new account appears in History at once.

**Decisions.** 4, 8, 9.

## Slice 5. Budget lines linked to saved facts

**Scope.** Decision 1 option A.

- `budget_entries` gains `link_kind` and `link_account_id`. A linked line stores no amount.
- `selectBudgetTotals`, `essentialCommitments` and the Budget page resolve linked lines from take-home, the housing cost selector, and account monthly amounts at share.
- Onboarding and the wizard create linked lines in place of copies. Existing copied lines are offered a one-tap "link this line" when they match a saved fact.
- `selectHousingCost` becomes the one housing figure for the budget, commitments and Retirement. Rent rows gain ownership and share.
- Left over uses the same income as safe to spend when the income line is linked.
- Remove `findPossibleDuplicateDebtRows`, the session-stored "keep it here" list and the "Saved in your details" hint.

**Files.** `apps/backend/src/entities/budget-entry.entity.ts`, `budget.service.ts`, `packages/api-contract`, `packages/finance-engine/src/picture/selectors/`, `apps/web/app/containers/budget/`, `features/budget/`, `features/housing/`, `services/onboarding-seed.ts`, `packages/finance-engine/src/retirement.ts`.

**Migrations.** Add the two nullable columns with a check on `link_kind`. No automatic re-linking of existing rows: a user's typed plan figure is theirs. Rollback: drop the columns; linked lines created since would lose their amounts, so the down migration first writes each linked line's resolved amount into `amount`.

**Tests.** Hand-worked totals for a budget with each kind of linked line, sole and joint. Browser link tests for L13, L14, L33, L35, L36, L56 and L57.

**Risk.** High. Budget figures feed the Dashboard headline. Mitigation: a linked line that cannot resolve shows "Not set" with an action, never 0.

**What the user will notice.** Changing a salary, a rent, a mortgage payment or a monthly saving changes the budget and every figure built on it, with nothing to retype.

**Decisions.** 1.

## Slice 6. Pay and pension answers

**Scope.**

- Pension rate columns and the salary sacrifice flag become nullable with no default (decision 3). Remove `hasDefaultPensionRates` and the exact-pair test.
- Onboarding's take-home mode stores net pay as net pay (decision 2). `selectTakeHome` uses it when no salary is saved.
- Reset stores "not set" for pension answers (AI-12).
- One student loan plan: the account form writes the profile when it has none; `accounts.student_loan_plan` is migrated into the profile.
- The Pension page reads the tax region from the profile.
- Legacy `paye_salary` records stop replacing the salary; a migration removes them after copying the latest into an empty profile salary.

**Files.** `apps/backend/src/entities/user-profile.entity.ts`, `user-profile.service.ts`, `profile-view.ts`, `packages/finance-engine/src/picture/input.ts`, `selectors/take-home.ts`, `tax-calculator.ts`, `apps/web/app/features/onboarding/`, `features/pension/`, `containers/pension/`, `features/settings/components/AgeAndPaySection/`.

**Migrations.**

1. Drop the defaults and the `NOT NULL` on the three pension columns. Rollback: restore them.
2. Set rows that hold exactly 5, 3 and the default flag to null (decision 3), with a before-image table. Rollback: restore from it.
3. Move student loan plans from accounts to profiles where the profile has none. Before-image table.
4. Remove `paye_salary` records after the copy. Before-image table.

**Tests.** Hand-worked take-home for a typed net figure and for unset pension rates. Browser link tests for L27, L30 and L31.

**Risk.** Medium. Take-home changes for users on the defaults: it will say "Not set" for pension until they answer.

**What the user will notice.** A rate they chose is shown as chosen, including 5% and 3%. Onboarding and the Dashboard show the same take-home.

**Decisions.** 2, 3.

## Slice 7. Self Assessment joined up

**Scope.**

- `tax_records.account_id`, a nullable foreign key. Records are grouped by the account they describe.
- The rental share for tax comes from the rental Property account, per property (decision 6).
- A "Calculated" mortgage interest figure is offered from the linked buy-to-let mortgage's monthly balances and rate, for the user to confirm into a record (decision 5).
- The same offer for savings interest from savings accounts, for the personal savings allowance.
- The Mortgage page yield reads the rental records.
- The headline strip reads the engine's totals.
- Scottish bands in the Self Assessment calculation (decision 7), behind the owner's vector sign-off.

**Files.** `apps/backend/src/entities/tax-record.entity.ts`, `tax.service.ts`, `packages/api-contract/src/domains/tax.ts`, `packages/finance-engine/src/tax-calculator.ts`, `section24.ts`, `apps/web/app/features/tax/`, `containers/tax/`, `containers/mortgage/`.

**Migrations.** Add `account_id uuid NULL` with a foreign key (`ON DELETE SET NULL`) and an index on `(user_id, account_id)`. Rollback: drop it. Copy `property_ownership_share` onto a rental Property account's share where the account is sole and the profile share is under 100, with a before-image table.

**Tests.** Hand-worked vectors for the calculated interest (150,000 at 4.5% for a full year is 6,750, and the credit at 20% is 1,350), for a 50% share, and for a Scottish taxpayer. The owner signs the tax vectors before merge. Browser link tests for L21, L22, L23, L29 and L48.

**Risk.** High for correctness, because it changes tax figures. It is gated by the E4 sign-off rule and the advice boundary policy.

**What the user will notice.** A buy-to-let mortgage in Accounts brings its interest into Self Assessment as a figure to confirm. The share is entered once.

**Decisions.** 5, 6, 7.

## Slice 8. Browser state

**Scope.**

- The profile comes from loader data only. Remove `userProfileAtom`, the page-level atom seeding, and `financialBaselineAtom` from signed-in pages.
- Browser writes to the profile, budget lines and accounts become route actions, or call revalidate after success.
- The setup checklist's dismissed state moves to the profile (decision 13). Checklist steps are marked by the action, not by visiting a page (LD-2, CS-6).
- The navigation renders from loader data on the first paint (CS-4).
- One London month helper replaces the device-clock month in the Accounts list (CH-8).

**Files.** `apps/web/app/hooks/useUserProfile.ts`, `state/baseline.store.ts`, `utils/profileFirst.ts`, `root.tsx`, the containers, `features/dashboard/components/SetupChecklist/`, `features/accounts/accountRows.ts`.

**Migrations.** One additive profile column for the dismissed flag, if decision 13 is A. Rollback: drop it.

**Tests.** Component tests for server and client render equality on the Dashboard and the navigation. Browser link tests for L63, L64 and L65.

**Risk.** Medium. It touches every container. Do it after slice 3 so the containers are already thinner.

**What the user will notice.** No flash of default pages or of a hidden checklist. No conflict message after saving on two pages in a row.

**Decisions.** 13.

## Slice 9. Database housekeeping

**Scope.** Only what the earlier slices have stopped reading.

- Drop dead profile columns: `display_name`, `monthly_savings_target`, `savings_allocation_mode`, `savings_default_interest_rate`, `dashboard_widget_sizes`, `dashboard_widget_config`, the second and rental income columns, `monthly_other_outgoings`, the seven `buy_to_let_*` columns, `has_mortgage`, `mortgage_type`, `property_ownership_share`. Drop `accounts.student_loan_plan`, `budget_entries.is_primary_income` and `is_default`.
- Remove unused endpoints: the transactions endpoints, `POST /budget-entries/seed-defaults`, and the dead route intents on Pension and Savings.
- Loaders ask for what they show: `GET /accounts` gains a `details` option (none, latest, all). Take-home and Settings stop loading accounts.
- One statement for the balance update in `snapshot-write.ts`.
- A database check that an `account_details` row's `user_id` matches its account's.
- A `CHECK` on `accounts.type`.
- Remove the unused `calculateNetWorth` in `packages/banking` and the `Section24Calculator`'s second model, or route them through the engine.

**Migrations.** Each drop is its own migration, a release after its readers went. Every dropped column is copied to a before-image table kept for 30 days. Rollback: re-add the column and restore from the table. The registry entry for each column is removed in the same pull request.

**Tests.** The registry spec. A contract snapshot for the profile response. Query counts re-measured with the method in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).

**Risk.** Low for the product, medium for rollback, which is why the before-image tables exist.

**What the user will notice.** Nothing, apart from slightly faster pages as history grows.

**Decisions.** 12.

## The strongest argument against the larger restructures

Flump has no real users yet. All data is test data. The engine is sound and already tested against personas. Slices 4, 5 and 7 change the account form, the budget and the tax figures, which are the three busiest parts of the product, while other lanes are still polishing those same screens. A restructure there can break things that work today, and it competes for the owner's attention with launch gates such as the tax vector sign-off.

A cheaper path exists: do slices 1, 2 and 3 only. Fix the wrong numbers, put every figure on one assembler, and let the new check stop further duplication. Where two stores remain, show a plain notice when they differ. That removes most wrong figures for about a third of the effort.

Why the plan still recommends the larger slices:

- The duplicates are what the owner felt in testing. A notice that two figures differ is friction, and the owner asked for less of it.
- This is the cheapest moment. With test data only, every migration is trivially reversible. After the friends beta each one needs real care.
- The mobile rebuild (E12) will copy whatever model the web has. E39 (mortgage affordability) and E37 (invoices) both read the facts that are duplicated today.
- A check that only freezes today's duplication protects the current muddle as well as it protects a clean model.

A fair middle course, if the owner prefers it: slices 1 to 3 now, slice 4 next, and decide on 5 and 7 after using the result for a week.

## What this plan would not do

- **Not split `accounts` into a table per account type.** One table with typed subtypes and a link is enough, and every reader already handles it.
- **Not rebuild balances as a ledger of events.** A balance and a row per month is the right size for a planner with a monthly check-in.
- **Not add a generic key and value "facts" table.** The four homes are typed tables. A generic table would hide exactly the duplication this audit found.
- **Not bring back the housing sync** that was removed on 17 November. A sync keeps two stores. Linked lines keep one.
- **Not move sums into SQL or add a cache.** Pages cost 5 to 10 sub-millisecond queries. The waste is in reading history that is not shown, which slice 9 fixes directly.
- **Not cache or skip the deleted-account lookup** (LD-1). It is cheap, and it is a security control. Leave it alone unless measurement under real load says otherwise, and treat any change as a security decision for the owner.
- **Not remove the profile.** It is the right home for facts about the person. It only needs to stop holding other homes' facts.
- **Not make the AI tools compute anything of their own.** They read the picture.

## Overlap with other plans and lanes

- **E23 D-1-B** chose a backend `GET /financial-picture`. It was never built. Decision 10 confirms or amends it.
- **E34** (couples): slice 4's share rules and decision 9 set the per-person base that E34 C2 builds on.
- **E39** (mortgage affordability) reads housing cost and take-home from saved details. It should start after slice 5, or it will add a fourth reader of the duplicated housing cost.
- **E37** (invoices) writes `tax_records`. It should use the `account_id` and source model from slice 7.
- **E12** (mobile) should take its data model from the map after slice 4.
- **PR 779** let the home value be entered with the mortgage by having the browser write the Property account after the mortgage. Slice 4 moves that into one backend transaction. Until then the two-call approach stands.
- **UX batch lanes and the phone lanes** are editing the same containers as slice 2. Slice 2 should start from their merged state.

## Owner decisions

Each decision has options and a recommendation. A flag says when it changes where or how user data is stored, names an outside service, or touches security. No decision names an outside service.

1. **How budget lines relate to saved facts.** Flag: changes how user data is stored.
   - A. Linked lines: a line can point at a saved fact and takes its amount from it. The user can unlink and type their own.
   - B. Sync on write: keep copies and update them whenever the fact changes.
   - C. Keep copies and show a notice when they differ.
   - Recommendation: A. B was built and removed once. C leaves the double entry in place.

2. **Take-home pay typed in onboarding.** Flag: changes how user data is stored.
   - A. Store it as net pay and leave the salary empty. Figures that need pay before tax show "Not set".
   - B. Estimate the salary before tax from it, store that, and mark it as an estimate.
   - C. Remove the take-home option and always ask for pay before tax.
   - Recommendation: A. It never stores a figure the user did not give.

3. **Pension rates that are still the 5% and 3% row defaults.** Flag: changes stored user data, and reverses an earlier choice not to back-fill.
   - A. Make the columns empty by default, and set existing rows that hold exactly the defaults to "not set".
   - B. Leave existing rows, and add a "set by the user" marker for new answers.
   - Recommendation: A, now, while all data is test data.

4. **Where buy-to-let details live.** Flag: changes how user data is stored, and drops columns.
   - A. Accounts only. Copy any profile values into accounts, then drop the profile fields.
   - B. Keep the profile fields as a quick buy-to-let entry that needs no accounts.
   - Recommendation: A.

5. **Mortgage interest for the Self Assessment finance-cost credit.** Flag: changes a tax figure, so it needs the owner's vector sign-off; no storage change beyond slice 7's link.
   - A. Offer a "Calculated" figure from the linked mortgage for the user to confirm into a record.
   - B. Work it out silently and use it with no record.
   - C. Leave it as a figure the user types.
   - Recommendation: A. It matches the check-in's "Calculated" rule and keeps the user in charge of their return.

6. **The share of a rental property used for tax.** Flag: changes how user data is stored.
   - A. Per property, from the property account's share.
   - B. Keep one share on the profile for all properties.
   - Recommendation: A.

7. **Scottish taxpayers in Self Assessment.** Flag: changes a tax figure; needs vector sign-off.
   - A. A plain note on the page now (slice 2), then Scottish bands in the calculation (slice 7).
   - B. The note only.
   - Recommendation: A.

8. **What "today's balance" is.** Flag: changes how user data is stored.
   - A. Always the newest recorded figure. Creating an account records it. Correcting the newest month moves today's balance.
   - B. Keep today's balance separate from history, as now.
   - Recommendation: A.

9. **How a joint account reads on screen.**
   - A. Every page shows your share as the main figure with the whole as a second line. Every form edits the whole and says so.
   - B. Every page shows the whole, with your share as a second line.
   - C. Leave each page to choose, with a label.
   - Recommendation: A. It fits the E34 rule that joint items count at the person's share.

10. **How the picture reaches its callers.** This confirms or amends E23 D-1-B.
    - A. Build `GET /financial-picture` now and move the web loaders and the AI tools to it.
    - B. One shared server-side builder for the web and the AI tools now; add the endpoint when the mobile app needs it.
    - Recommendation: B. It gives one assembler without a new network hop, and leaves A open.

11. **Adopt the "One home per value" law and its CI check.** Flag: a guard change under AGENTS.md section 15 (a new required check and a new law).
    - A. Adopt both in slice 1.
    - B. Keep the map as a document with no check.
    - Recommendation: A. Without the check the map goes stale within weeks.

12. **Drop dead columns, endpoints and the unused parts of tables.** Flag: changes how user data is stored (deletes stored values after a before-image copy).
    - A. Drop them in slice 9, a release after their last reader goes. Keep the `transactions` table empty until the bank plan returns, and remove its endpoints.
    - B. Leave them in place and mark them deprecated.
    - Recommendation: A.

13. **Where "setup checklist dismissed" is stored.** Flag: changes where user data is stored (browser to database).
    - A. On the profile.
    - B. In the browser, cleared on reset.
    - Recommendation: A.
