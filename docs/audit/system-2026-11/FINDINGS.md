# System audit, November 2026: findings

Audited commit: `f5631d4f0` (`origin/main` on 19 November 2026). This file holds every finding from the ten deep dives. The summary for the owner is [SUMMARY.md](./SUMMARY.md). The fix order is [PLAN.md](./PLAN.md).

## How to read this file

- Each finding has an id (area prefix and number), the fact or figure, what is wrong, what the user experiences, evidence, a severity, the root cause and how to check it.
- Severity is one of: wrong number shown, user must enter something twice, stale until reload, wasteful but invisible.
- "Confirmed in code" means a reviewer read the code path. It does not mean the behaviour was run.
- "Confirmed in a browser" means the lead changed a value in a local build and read the result on the pages. Those checks are in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- "Inferred, not confirmed" means the claim follows from the code but nobody traced or ran it end to end.
- The verdict for each expected link is in [the generated links view](../../system/generated/links.md).

Path short forms used in the evidence lines:

| Short form | Meaning |
|---|---|
| `W/`, `WEB/` | `apps/web/app/` |
| `E/`, `FE/` | `packages/finance-engine/src/` |
| `B/`, `BE/`, `be/` | `apps/backend/src/` |
| `MCP/` | `packages/mcp/src/tools/` |

Worked figures in the findings were worked by hand from the code. Figures in the browser evidence were read from the screen.

## Root causes

Many findings are the same problem seen from different pages. Ten root causes cover nearly all of them. [SUMMARY.md](./SUMMARY.md) explains each in plain words and [TARGET-MODEL.md](./TARGET-MODEL.md) says what to do about it.

| Root cause | Findings |
|---|---|
| R1. The profile holds copies of facts that live elsewhere | HM-4, HM-5, HM-6, PP-7, PP-10, SD-9, SA-5, JO-7, BU-10, DB-1, DB-2, DB-3, DB-7, DB-8 |
| R2. Budget rows are loose copies of facts held on accounts and the profile | HM-1, HM-2, BU-1, BU-4, BU-5, BU-6, BU-7, SD-10, JO-8, JO-12 |
| R3. A page shows the user's share and then treats it as the whole | SD-1, SD-2, SD-7, JO-1, JO-2, JO-3, JO-4, JO-5, JO-9, JO-10, HM-11 |
| R4. More than one piece of code assembles the same figure | BU-3, SD-3, SD-6, SA-1, SA-9, AI-4, AI-5, AI-6, AI-7, AI-8, CH-5, CH-9, PP-4, SA-11 |
| R5. Defaults stored or used as if they were the user's answers | PP-2, PP-3, PP-5, SA-2, SA-8, AI-1, AI-2, AI-3, AI-12, BU-8, BU-10, DB-4, DB-5 |
| R6. Today's balance and the monthly history are two stores with gaps | CH-1, CH-2, CH-3, CH-4, CH-7, DB-13 |
| R7. Account kinds and links between records are missing | LD-4, HM-3, HM-7, HM-8, SA-4, SA-7, SD-4, SD-8, SD-12, JO-6, JO-11, AI-9, DB-6, DB-16, PP-8, SA-3 |
| R8. The browser keeps its own copies of saved data | CS-1, CS-2, CS-3, CS-4, CS-5, CS-7, CS-8, PP-9, AI-11, HM-9, CH-8 |
| R9. Dead weight: unused columns, endpoints, tables and repeated reads | HM-10, PP-10, BU-11, SD-5, SD-11, SA-12, CH-7, CS-6, AI-10, DB-9, DB-10, DB-11, DB-12, DB-14, DB-15, DB-17 |
| R10. Nothing stops a second store or a second formula being added | SA-11, and every finding above |

The same defect is sometimes listed in two areas, because two reviewers reached it from different pages. The pairs are: SD-1 and JO-1; SD-2 and JO-3; HM-1 and BU-5; HM-2 and BU-4; HM-4 and DB-1; PP-1 and BU-2; PP-7, SD-9 and DB-7; SA-2, AI-2, PP-5 and DB-5; SA-5, JO-7 and DB-8; SA-8 and AI-3; HM-7 and JO-6; PP-9 and CS-7; CS-3 and AI-11.

## Findings added by the lead

### LD-1 Every backend request looks up the deleted-account list
- Fact or figure: database queries per page.
- What is wrong: each request to the backend runs one `SELECT` on `account_deletion_tombstones`, so a page that makes four backend requests runs it four times.
- What the user experiences: nothing visible.
- Evidence: measured on local Postgres with statement logging, homeowner persona. Dashboard: 9 queries, 4 of them this lookup. Accounts: 8 and 4. Savings: 10 and 4. See [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md), "Queries per page".
- Severity: wasteful but invisible.
- Root cause: the check sits in the per-request guard with no short cache. Not confirmed: where in the guard it runs.
- Confidence: confirmed by measurement; the code path was not read.

### LD-2 Opening Savings or Pension writes to the profile
- Fact or figure: setup checklist steps.
- What is wrong: a plain visit to Savings or Pension sends `PATCH /user-profile/checklist` from the browser.
- What the user experiences: nothing visible. The profile version changes, which can make a save from another tab fail with a conflict.
- Evidence: measured: both pages made one browser `PATCH /api/user-profile/checklist` and three `user_profiles` reads on load. See also CS-6.
- Severity: wasteful but invisible.
- Root cause: the checklist step is marked on page view, not on the action it describes.
- Confidence: confirmed by measurement.

### LD-3 The backend build can leave an incomplete output folder
- Fact or figure: none (build tooling).
- What is wrong: `apps/backend` builds with `rm -rf dist && tsc -p tsconfig.build.json`, and `incremental` is on. The build info file sits outside `dist`, so the compiler can skip files it thinks are current.
- What the user experiences: nothing. A developer sees `Cannot find module './config/timezone'` when starting the built backend.
- Evidence: seen in this audit's worktree after a cached build. `apps/backend/tsconfig.json` sets `"incremental": true`. Building with `--incremental false` produced a complete folder.
- Severity: wasteful but invisible.
- Root cause: the clean step removes the output and keeps the cache that describes it.
- Confidence: seen once; not confirmed in CI, which builds from a clean checkout.

### LD-4 An investment's own return is not what Retirement uses
- Fact or figure: the yearly return saved on an investment account, and the growth the retirement projection applies to it.
- What is wrong: the account form saves an "Estimated annual return" in `accounts.interest_rate`, and Retirement ignores it and applies the plan's three growth cases to every counted account.
- What the user experiences: a return typed on an investment changes the Savings page and nothing on Retirement. The same column means AER on a savings account and expected return on an investment.
- Evidence: `apps/web/app/features/savings/components/AddSavingsAccountDialog/AddSavingsAccountDialog.tsx:156`; `packages/finance-engine/src/retirement-input.ts:292`. Raised by the independent reviewer.
- Severity: user must enter something twice.
- Root cause: one column with two meanings, and a second store for growth on the plan.
- Confidence: confirmed in code by the reviewer; not run. Whether Retirement should use an account's own return is a product choice, so the plan lists no fix for it.

## Home, mortgage, buy to let and housing (HM)

### HM-1 The mortgage payment saved on the Mortgage page does not reach the budget
- Confirmed in a browser: yes, check B1 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: monthly mortgage payment (account monthlyContribution) vs budget "Mortgage payment" row vs profile.monthlyHousingCost.
- What is wrong: three stores hold the payment and nothing keeps them in step since the sync was removed in 986fd6286.
- What the user experiences: after changing the payment on the Mortgage page, the budget housing row, essentials, Breathing room and safe to spend still use the old figure; retirement uses the new one.
- Evidence: MortgageContainer.tsx:399-404 (writes monthlyContribution); E/picture/selectors/commitments.ts:38-47 (essentials from budget rows; mortgages are not "debt", so no account minimum is counted, portfolio.ts:402-404); E/retirement-input.ts:198 (retirement reads monthlyContribution); BudgetContainer.tsx:671-676 (mortgage holder's housing row links away and HousingDetails renders nothing, HousingDetails.tsx:63-66); git 986fd6286 message.
- Severity: wrong number shown.
- Root cause: no single owner for "housing cost"; the budget row is a free copy.
- How to check: homeowner persona. Mortgage page, Edit, change monthly payment from 1,250 to 1,400, save. Open Budget: housing row still £1,250, Breathing room and left over unchanged. (Retirement change is hidden for this persona because the 218-month term ends before 67; extend term to 360 months to see retirement move.)
- Confidence: confirmed in code.

### HM-2 Saving rent in housing details leaves the budget row and cover figures unchanged
- Fact or figure: rent (renting or living with family).
- What is wrong: handleSaveHousing writes profile.monthlyHousingCost only; essentials, months of cover and safe to spend read budget rows.
- What the user experiences: the dialog says the rent is "used across Flump", but the row total and Breathing room do not move; a line "Saved in your details: £X a month" appears beside a different row total.
- Evidence: BudgetContainer.tsx:242-250, 530-533; HousingDetails.tsx:52, 104-116; commitments.ts:38-43; retirement.ts:664-666 (retirement does use the profile).
- Severity: wrong number shown.
- Root cause: as HM-1; the removed sync was the only bridge.
- How to check: renter persona, Budget, open housing row, Edit your rent, change it by £100, save. Read the row total, Breathing room and safe to spend (unchanged), then Retirement housing (changed).
- Confidence: confirmed in code.

### HM-3 A buy-to-let property is treated as the home unless its name says "buy to let"
- Confirmed in a browser: yes, check B2 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: residential home value, LTV, equity, property share.
- What is wrong: Property accounts have no subtype, so isBuyToLetAccount falls back to the name regex; a rental called "Flat 2" counts as a residential home.
- What the user experiences: LTV divides the home mortgage by home plus rental; with one such property and no home, the Mortgage page offers the rental's value as "home value" and a save overwrites the rental's balance; the Accounts mortgage dialog hides the home value field because "a home is already there"; propertyFollowsMortgage can give the rental the home mortgage's share.
- Evidence: E/picture/selectors/loan-to-value.ts:22-38, 54-57; E/home-equity.ts:60-66; MortgageContainer.tsx:247-253, 438-457; W/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx:399-408; account-intake.service.ts:309-318; W/features/accounts/accountSubtypes.ts:16-19 (mortgage subtypes only).
- Severity: wrong number shown.
- Root cause: buy-to-let is decided by name for property rows.
- How to check: homeowner persona, Accounts, add Property "Rental flat" £200,000. Mortgage page: loan to value drops (186k over 510k, about 36%) and the home value field becomes read-only "from accounts".
- Confidence: confirmed in code.

### HM-4 Buy-to-let mortgage on Accounts and buy-to-let figures on the Mortgage page are separate stores
- Confirmed in a browser: yes, check B3 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: BTL balance, rate, type, property value.
- What is wrong: the Mortgage page BTL tab reads and writes profile.buyToLet*; Accounts, net worth, debt totals and Self Assessment read accounts.
- What the user experiences: add a BTL mortgage (subtype "Buy-to-let (BTL) mortgage") on Accounts; the BTL tab appears but asks for balance and rate. Typing them there does not change the account. A BTL value typed on the Mortgage page is not in net worth, and net worth flags "a mortgage counts with no home value saved".
- Evidence: MortgageContainer.tsx:366-378, 570-573, 603-608, 686-692; app.accounts._index.tsx:137-145 (BTL home value deliberately never stored as an account); E/net-worth-basis.ts:115-131; W/routes/_index.tsx:118.
- Severity: user must enter something twice (and wrong number shown when they differ).
- Root cause: the BTL tab predates BTL accounts and was never moved onto them.
- How to check: homeowner persona, Accounts, add Mortgage, kind Buy-to-let, £150,000. Open Mortgage, Buy to let tab: balance empty. Enter £140,000 there, save, return to Accounts: still £150,000. Dashboard mortgage card now includes £150,000.
- Confidence: confirmed in code.

### HM-5 Buy-to-let rent on the Mortgage page cannot be entered anywhere
- Fact or figure: BTL monthly rent and gross yield.
- What is wrong: profile.buyToLetMonthlyRental (and hasBuyToLet, buyToLetCount) has no writer in the web app; the BTL card's Edit goes to Settings, which has no such field.
- What the user experiences: yield and "rent left after payment" stay empty; Edit leads to a page with nothing to edit. Rent entered in Self Assessment or as budget income is not used.
- Evidence: grep of W for buyToLetMonthlyRental: reads only (MortgageContainer.tsx:608, 719) plus demoData.ts:594; MortgageContainer.tsx:1099-1105 (navigate "/app/profile"); W/routes/app.profile.tsx (Settings).
- Severity: wrong number shown (missing figure with a dead-end action).
- Root cause: field orphaned when settings were reworked.
- How to check: any persona with a BTL account, Mortgage, Buy to let tab, press Edit on the buy-to-let card: Settings opens with no rent field.
- Confidence: confirmed in code.

### HM-6 Housing status and "has a mortgage" do not follow the accounts
- Fact or figure: profile.housingStatus, profile.hasMortgage.
- What is wrong: neither changes when a mortgage account is added or deleted, and housingStatus has no edit control after onboarding (Budget can only write it as "renting").
- What the user experiences: a renter who adds a mortgage keeps a "Renting" housing row, Settings hides "Your mortgage", and retirement models rent for life. Someone who deletes a paid-off mortgage keeps "Mortgage": the Mortgage page residential view stays, the budget housing row links to it, and retirement falls back to the old profile figure as "Your own housing figure" for life.
- Evidence: useFinishOnboarding.ts:95-99; BudgetContainer.tsx:244-246; MortgageContainer.tsx:380, 599-602; ProfileTab.tsx:261, 434-435; retirement.ts:664-688.
- Severity: wrong number shown (retirement housing).
- Root cause: tenure is a profile answer with no link to accounts.
- How to check: homeowner persona, Accounts, delete "Residential mortgage". Retirement: housing reads £1,250 a month as your own figure (about £15,000 a year) instead of none. Budget housing row still says "Mortgage".
- Confidence: confirmed in code.

### HM-7 A property's share does not move its mortgage, and a later Property is not aligned
- Fact or figure: ownership/sharePercent on Property vs Mortgage.
- What is wrong: propertyFollowsMortgage runs only on mortgage create (when joint) and mortgage share change.
- What the user experiences: add a joint 50% mortgage with no home value, then add the home on Accounts as a Property (sole by default): net worth counts the whole home against half the mortgage. Editing the home to joint later leaves the mortgage alone.
- Evidence: account-intake.service.ts:300-301, 308, 633-643, 775-782.
- Severity: wrong number shown (net worth).
- Root cause: one-way rule by design (comment :300-301); L18 asks for both ways.
- How to check: fresh user, add joint 50% mortgage £200,000 without home value, then add Property £300,000 sole. Net worth counts £300,000 less £100,000.
- Confidence: confirmed in code.

### HM-8 Retirement can cost the buy-to-let mortgage as the home
- Fact or figure: retirement housing cost.
- What is wrong: mortgageDetails takes the first account of category mortgages with no buy-to-let filter.
- What the user experiences: with a BTL mortgage listed before the home mortgage, retirement shows its payment and end age as housing.
- Evidence: E/retirement-input.ts:193-208. (Also selectHousingCost sums every Mortgage including BTL, housing-cost.ts:35, but see HM-10.)
- Severity: wrong number shown.
- Root cause: missing isBuyToLetAccount filter.
- How to check: homeowner persona, add a BTL mortgage with rate, term and payment; if it sorts first, Retirement housing shows its figures.
- Confidence: confirmed in code (ordering in practice inferred).

### HM-9 Mortgage page save failure says "nothing has changed" after the profile was written
- Fact or figure: mortgage type, hasMortgage.
- What is wrong: updateProfile runs before the account PATCH; a non-conflict PATCH failure shows "Nothing has changed", yet the new type is saved and appears after reload.
- Evidence: MortgageContainer.tsx:380, 409-414, 527; picture uses profile.mortgageType at :225.
- Severity: stale until reload.
- Root cause: two writes with no ordering guarantee or rollback.
- How to check: hard to force without a network block; in dev tools block PATCH /accounts/*, change type to interest-only and rate, save, then reload.
- Confidence: confirmed in code.

### HM-10 The engine's housing cost figure is computed and never shown
- Fact or figure: picture.housingCost (selectHousingCost).
- What is wrong: no page, MCP tool or export reads it; it also ignores the saved payment and includes BTL mortgages.
- Evidence: E/picture/build.ts:70; grep for ".housingCost" finds no consumer; housing-cost.ts:31-50.
- Severity: wasteful but invisible.
- Confidence: confirmed in code.

### HM-11 Dashboard mortgage card and Mortgage page show different balances for joint or BTL
- Confirmed in a browser: yes, check B14 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Evidence: _index.tsx:78,118 (all mortgages, share applied by PortfolioSnapshot) vs MortgageContainer.tsx:594-596, 615-618 (residential, whole via withWholeBalances).
- Severity: wrong number shown (looks inconsistent; each is labelled differently only implicitly).
- How to check: edit the homeowner mortgage to joint 50%: Dashboard card £93,000, Mortgage page £186,000.
- Confidence: confirmed in code.

## Profile, pay, pension and retirement (PP)

### PP-1 Onboarding net mode stores a take-home figure as gross salary
- Fact or figure: `annualSalary`.
- What is wrong: choosing "take-home" in onboarding saves `monthlyTakeHome x 12` into `annualSalary`, which every reader treats as gross pay.
- What the user experiences: after entering £2,500 a month take-home, the dashboard and Take-home page compute tax on £30,000 gross and show about £2,100 a month; the budget income row says £2,500. Pension contributions, the £100,000 notice, Self Assessment PAYE salary, Retirement workplace contributions and AI output all use £30,000 as gross. Settings shows "Salary £30,000".
- Evidence: useFinishOnboarding.ts:86-90; onboarding-seed.ts:75 (income row = typed take-home); _index.tsx:156; TaxContainer.tsx:186; retirementInput.ts:44; draft.ts:60-66 (re-entry then shows net x 12 as a gross salary).
- Severity: wrong number shown.
- Root cause: no gross figure exists in net mode, and the save writes the net figure to the gross column instead of leaving salary unset.
- How to check: new account, onboarding Income step, choose take-home, enter £2,500 a month, finish. Compare the budget income row (Budget) with "Estimated take-home" on the dashboard and the Take-home page, and the salary in Settings > Age and pay.
- Confidence: confirmed in code.

### PP-2 Row-default 5% and 3% shown as a choice on the dashboard, "Not set" elsewhere
- Fact or figure: `pensionPercent`, `pensionEmployerPercent`.
- What is wrong: the dashboard widget shows the creation defaults as "8%, you and your employer together", and dashboard/Take-home/safe-to-spend take-home deduct 5%, while the Pension page and Settings call the same rates assumed or not set.
- What the user experiences: a new user who never gave rates sees 8% on the dashboard and "Not set" on Pension. Dashboard take-home includes a 5% pension; Pension's take-home tool asks for the contribution.
- Evidence: PensionWidget.tsx:44-63; _index.tsx:162-168,262-268; input.ts:131 (`pensionPercent` passes the default through); PensionContainer.tsx:126-135,181-187; AgeAndPaySection.tsx:60-67.
- Severity: wrong number shown.
- Root cause: `hasDefaultPensionRates` is applied on Pension and Settings only; `profileFactsFromProfile` and the dashboard loader read raw columns.
- How to check: fresh account with salary, no pension rates entered. Read the dashboard Pension widget and estimated take-home, then open /app/pension and the Take-home page.
- Confidence: confirmed in code.

### PP-3 A real 5% and 3% choice can never count as chosen
- Confirmed in a browser: yes, check B19 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Review note: the "Not set" reading of a chosen 5% and 3% is on the Pension page and in Settings. The engine keeps a chosen 5% as set and treats only the salary sacrifice flag as unanswered when the rates are exactly 5 and 3. The Budget page then says "Add your salary", because it reads any missing pay fact as a missing salary (`BudgetOverview.tsx:47-49`).
- Fact or figure: pension rates and salary sacrifice flag.
- What is wrong: rates exactly 5/3 are always read as untouched defaults, so a user who chose them (the auto-enrolment minimum) is told "Not set", and a 5/3 salary sacrifice choice is read as null.
- What the user experiences: saving 5% and 3% on Pension or Settings still shows "Not set". With salary sacrifice also chosen, the dashboard and safe to spend stay at "Add pension method" for good. Onboarding answer "5%" also ends as assumed (employer stays 3).
- Evidence: contribution.ts:21-26; input.ts:91-112; PensionContainer.tsx:140 (`methodSet = !ratesAssumed`); take-home.ts:39-43; useFinishOnboarding.ts:100.
- Severity: user must enter something twice (and it never sticks).
- Root cause: no "set by user" flag; the 5/3 pair is the only signal.
- How to check: Pension > details, enter 5% and 3%, choose salary sacrifice, save. Reload Pension and the dashboard: look for "Not set" and "Add pension method".
- Confidence: confirmed in code.

### PP-4 Take-home differs between onboarding, the budget row and the dashboard
- Fact or figure: monthly take-home.
- What is wrong: onboarding treats a blank pension as 0% and writes that take-home into `monthlyTakeHome` and the budget income row, but saves no pension rate, so the row default 5% then applies to dashboard take-home.
- What the user experiences: onboarding says £X take-home and the budget income row is £X; the dashboard right after says less (5% pension deducted). The code comment promises they match.
- Evidence: deriveOnboardingSummary.ts:6-21,75-83; useFinishOnboarding.ts:100,136; onboarding-seed.ts:75; _index.tsx:156.
- Severity: wrong number shown.
- Root cause: two defaults for one unanswered question (0% in onboarding, 5% in the row).
- How to check: onboarding in gross mode, salary £40,000, leave pension blank, note take-home on the finish summary; finish and compare with dashboard estimated take-home and the Budget income row.
- Confidence: confirmed in code.

### PP-5 AI output invents salary, pension rate and tax year
- Fact or figure: AI baseline (`userProfileToFinancialBaseline`).
- What is wrong: with no saved salary the MCP/context pack baseline uses 45,000; tax figures use tax year 2025/26 always; the pack uses the raw salary sacrifice flag.
- What the user experiences: the AI context pack prints "Salary before tax: £45,000" and a tax position for a salary never entered; `get_tax_year_position` uses 45,000; `project_net_worth` adds 45,000 x 5% as "saved salary times pension contribution". The pack's tax section is labelled 2025/26 and "ISA allowance unused this tax year" is for that year, not 2026/27.
- Evidence: profile.ts:14,17,177-181,261; agent-data.service.ts:204-206,336; ai-context-pack.ts:336-348,406,531; getTaxYearPosition.ts:85-87; projectNetWorth.ts:171-179. The web patches the salary only (useUserProfile.ts:279-285).
- Severity: wrong number shown.
- Root cause: the engine mapper falls back to `DEFAULT_FINANCIAL_BASELINE` (an anonymous-calculator default) and never sets `taxYear`; the backend uses it unpatched.
- How to check: not browser-only. Persona with no salary, connect an MCP client, ask for the context pack or tax year position.
- Confidence: confirmed in code.

### PP-6 Retirement never sees budget rows
- Review note: Retirement is a friends-beta page (`apps/backend/src/modules/retirement/retirement.access.ts`), so only allow-listed users can reach this today.
- Confirmed in a browser: yes, check B17 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: retirement spending target built from budget lines.
- What is wrong: the Retirement loader calls `loadWorkspaceSnapshot(args)` without `includeBudget: true`, so `budgetEntries` is always `[]`.
- What the user experiences: "From budget lines" always says "No spending lines other than housing saved yet". A saved budget target gives no estimate on the web, while the MCP retirement tools (which load the rows) give one.
- Evidence: app.retirement.tsx:40,55,95; backend-client.server.ts:368,406; retirement-input.ts:211-232,272-273; RetirementPlanner.tsx:792-793; app.retirement.test.ts:54 mocks `[]`, so this is untested.
- Severity: wrong number shown.
- Root cause: missing loader option.
- How to check: persona with budget rows (food, bills). Open /app/retirement, target, "From budget lines".
- Confidence: confirmed in code.

### PP-7 Student loan plan held in two places
- Confirmed in a browser: yes, check B11 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: student loan plan.
- What is wrong: the account form saves `studentLoanPlan` on the account, while take-home reads `studentLoanPlans` on the profile; nothing links them.
- What the user experiences: a user who adds a Plan 2 loan account but said "no student loan" in onboarding gets take-home with no repayment; changing one never changes the other.
- Evidence: AddEditAccountsDialog.tsx:425-448; account.entity.ts:109; ProfileTab.tsx:396-413; useFinishOnboarding.ts:92; take-home.ts:61-66; debt-payoff.ts:63.
- Severity: user must enter something twice.
- Root cause: two columns for one fact.
- How to check: onboarding with "no student loan", then add a Student Loan account (Plan 2). Open Take-home and Settings > Profile.
- Confidence: confirmed in code.

### PP-8 Self Assessment uses rUK bands for Scottish taxpayers without saying so
- Confirmed in a browser: yes, check B13 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: Self Assessment estimate.
- What is wrong: `calculateUKTax` takes no region, and the Self Assessment page shows no assumption note, while the dashboard's estimated tax due carries one.
- What the user experiences: a Scottish user sees tax on the Self Assessment page worked out on England, Wales and NI bands, without being told.
- Evidence: tax-calculator.ts:421-433; TaxContainer.tsx:225-233 (no region read; no region text in features/tax); estimated-tax-due.ts:92.
- Severity: wrong number shown.
- Root cause: the ledger is rUK-only (engine limitation), and only the picture selector discloses it.
- How to check: Settings > Profile, region Scotland, salary £60,000. Open Self Assessment and look for any note on bands.
- Confidence: confirmed in code (that no note exists in features/tax or the container).

### PP-9 Pension trap region comes from the browser baseline
- Fact or figure: tax region for the £100,000 notice.
- What is wrong: region is read from `financialBaselineAtom`, which on the server and first client paint is the stored or default baseline, and becomes the profile's region only after `setProfile` runs in an effect; `setProfile` never writes localStorage, but a seed hydration does.
- What the user experiences: a brief first paint with England rates (or a marketing calculator's region) before the saved region; the notice itself does not change, only its tax figure.
- Evidence: PensionContainer.tsx:69-75,246-254; baseline.store.ts:117-130,157-171; useUserProfile.ts:318-327; taxTrapCopy.ts:49-55.
- Severity: stale until reload (momentary).
- Root cause: region not taken from `profileFactsFromProfile` like the rest of the page.
- How to check: Scottish persona with salary £110,000; hard-reload /app/pension with throttled CPU and watch the notice figure.
- Confidence: inferred, not confirmed (timing).

### PP-10 Dead profile fields and dead writers
- Fact or figure: second and rental income fields, `monthlyTakeHome`, `monthlyOtherOutgoings`, `monthlySavingsTarget`; Pension intents `updatePensionContributions`, `completePensionWizard`.
- What is wrong: these are stored or accepted but feed no figure; the intents and `updateSavingsSettings` are never submitted.
- What the user experiences: nothing visible; onboarding's "Other monthly spending" lives on only as the budget row.
- Evidence: profile.ts:224-246 (only to baseline and MCP wire, used by no tool); draft.ts:60-73; app.pension.tsx:95-182; app.savings.tsx:95-111.
- Severity: wasteful but invisible.
- Root cause: leftovers from the baseline era.
- How to check: none.
- Confidence: confirmed in code.

### PP-11 Pot payments added to salary contributions
- Fact or figure: monthly paid into pensions (Pension summary, Retirement "paid in").
- What is wrong: both add each current pot's `monthlyContribution` to salary x (employee + employer), so the same workplace payment typed on the pot counts twice.
- What the user experiences: a monthly total about double the payslip; Pension shows a note when both exist (`includesPotPayments`); Retirement projects both.
- Evidence: PensionContainer.tsx:113-117,197-201,307; retirement.ts:1110-1157.
- Severity: wrong number shown (only when the user enters both).
- Root cause: pot contribution field and profile rates describe overlapping money.
- How to check: Pension page, salary £40,000 at 5%/3%, edit the workplace pot to £267 a month; read the monthly total and Retirement's yearly paid in.
- Confidence: inferred, not confirmed (depends on user entry; whether Retirement shows a note was not checked).

## Budget and the left-over figures (BU)

### BU-1 Budget income row is a one-off copy of take-home
- Confirmed in a browser: yes, check B6 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: budget income, left over, the "Money in" figure on the Budget page.
- What is wrong: The income row is copied from take-home once and never follows a later salary, pension or tax-year change.
- What the user experiences: After a pay rise saved in settings, safe to spend (which uses engine take-home) goes up but left over (which uses the budget income row) does not. Both sit on the same Budget card.
- Evidence: services/onboarding-seed.ts:75 (row = summary take-home); BudgetSetupWizard.tsx:523-549 (copy only on button press, only into an existing row); FE/picture/selectors/budget-totals.ts:7 ("not take-home from salary"); safe-to-spend.ts:52 (uses profile take-home); features/budget/components/BudgetOverview/BudgetOverview.tsx:55-63,87 (both shown together). No other writer of budget rows exists (grep of `/budget-entries`: BudgetContainer and onboarding only).
- Worked example: onboarding at £36,000 gross gives a £2,400 income row. The salary is later changed to £42,000, so take-home is about £2,750. Left over still uses £2,400; safe to spend uses £2,750. With £1,500 essentials and £200 savings, left over shows £700 and safe to spend shows £1,050 a month.
- Severity: wrong number shown.
- Root cause: two stores for one fact (budget income row and profile salary), with no sync and no notice when they differ.
- How to check: seeded persona with a budget income row. Note "Left over" and the safe-to-spend sub-line on /app/budget. Raise the salary in /app/profile (Age and pay). Reload /app/budget: the safe-to-spend figure changes and left over does not.
- Confidence: confirmed in code.

### BU-2 Onboarding "take-home" mode saves net pay as gross salary
- Fact or figure: engine take-home, safe to spend, and the income row compared with it.
- What is wrong: In "monthly take-home" mode, onboarding saves `annualSalary = takeHome x 12`. The engine then treats that as gross and takes tax, NI and pension off it again, while the budget income row holds the real net figure.
- What the user experiences: From the first day, left over (from the row) and safe to spend (from engine take-home) are built on different incomes. Safe to spend comes out several hundred pounds a month too low.
- Evidence: features/onboarding/useFinishOnboarding.ts:86-90; deriveOnboardingSummary.ts:76-78; FE/picture/selectors/take-home.ts:35,69-72 (only `annualSalary` is used); FE/profile.ts:224 (`monthlyTakeHome` is stored as an override, but no selector reads it).
- Worked example: £2,500 a month net, 5% pension. Saved gross is £30,000. Engine: pension £1,500, tax about £3,186, NI about £1,394, so take-home is about £1,993 a month against the £2,500 row. With £1,500 essentials and £200 savings: left over £800, safe to spend about £293.
- Severity: wrong number shown.
- Root cause: no net-to-gross conversion; the saved `monthlyTakeHome` is ignored by `selectTakeHome`.
- How to check: a new user picks the take-home option in onboarding, enters £2,500, and finishes. On /app/budget compare "Money in" (£2,500) with the take-home shown on the take-home page or dashboard.
- Confidence: confirmed in code (the exact amounts depend on the tax year).

### BU-3 MCP read tools disagree with the picture on left over and Breathing room
- Fact or figure: `get_financial_snapshot` surplus and `emergencyRunwayMonths`, and `get_budget_summary` essentials.
- What is wrong: The MCP tools sum essentials over every essential row, savings rows included, and subtract stored account minimums on top of debt rows. The picture leaves out savings and takes the larger of the two debt sources.
- What the user experiences: The assistant states a different "left over" and number of months of Breathing room from the ones on the Dashboard.
- Evidence: packages/mcp/src/tools/read/common.ts:236-238 (essential = any `isEssential` row); getFinancialSnapshot.ts:104 (`income - essential - discretionary - minStored`), :121; FE/picture/selectors/commitments.ts:39-54; packages/mcp/src/__tests__/consistency.test.ts:72-110 (covers the context pack and resources only, not these tools).
- Worked example: cash £6,000, income row £2,500, rent £900, food £300, savings row £200 (saved as essential by default), card row in "debt" £100, card minimum £100. Picture: cover 6,000 / 1,300 = 4.6 months, left over £1,000. Snapshot tool: 6,000 / 1,500 = 4.0 months, left over £900. The `get_budget_summary` essentials are £1,500, but the context pack says £1,300 for essentials.
- Severity: wrong number shown.
- Root cause: `summariseBudget` and the snapshot keep their own arithmetic instead of calling `selectBudgetTotals`, `essentialCommitments` and `selectMonthsOfCover`.
- How to check: in the AI assistant, ask "how many months of Breathing room do I have and what is left over each month" for a persona with a savings row and a card. Compare with the Dashboard KPI strip.
- Confidence: confirmed in code.

### BU-4 Rent edited on the Budget page does not reach the budget figures
- Fact or figure: essentials, Breathing room, safe to spend, left over.
- What is wrong: "Edit your rent" writes only the profile. Every budget figure reads the housing row, and only housing cost and retirement read the profile.
- What the user experiences: After raising the rent, the Budget page shows "Saved in your details: £1,000 a month" next to a housing row of £900. Breathing room and safe to spend still use £900.
- Evidence: BudgetContainer.tsx:242-249 (`updateProfile` only), 530-533; HousingDetails.tsx:18,104-115; FE/picture/selectors/housing-cost.ts:52-71 (profile only, "never budget rows"); commitments.ts:38-43 (rows only).
- Worked example: rent row £900, rent edited to £1,000, cash £6,000, other essentials £400. Cover stays 6,000 / 1,300 = 4.6 instead of 6,000 / 1,400 = 4.3. Safe to spend is £100 a month too high.
- Severity: wrong number shown (the user must enter the rent twice to fix it).
- Root cause: two stores (profile housing cost and the budget housing row), with a display hint but no write to the row.
- How to check: a renter persona. On /app/budget open Housing, choose "Edit your rent", and raise it by £100. Breathing room and the safe-to-spend sub-line do not change; the "Saved in your details" line appears.
- Confidence: confirmed in code.

### BU-5 Mortgage payment lives in three places
- Confirmed in a browser: yes, check B1 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: housing in commitments versus the mortgage page payment.
- What is wrong: Commitments count the budget housing row only. The mortgage account's saved payment is excluded (mortgages are not debt items), and housing cost uses a balance, rate and term estimate first.
- What the user experiences: The mortgage page payment can be updated to £1,150 while the Budget, safe to spend and Breathing room keep the onboarding row of £1,000. For mortgage holders the housing panel shows no hint, because it returns null.
- Evidence: MortgageContainer.tsx:389-403; FE/portfolio.ts:402-404 (category "debt" only); housing-cost.ts:72-84; HousingDetails.tsx:63-66; services/onboarding-seed.ts:51,76-77.
- Severity: wrong number shown.
- Root cause: no single mortgage-payment fact.
- How to check: a homeowner persona. Change the monthly payment on /app/mortgage, then check the /app/budget housing row and Breathing room.
- Confidence: confirmed in code.

### BU-6 Left over ignores account minimums, and the Debt page builds on it
- Fact or figure: left over (Dashboard, Budget, Debt) and the "use left over" extra payment.
- What is wrong: Left over subtracts only budget rows. Card and loan payments saved on accounts are left out unless a budget row exists, and the Debt page offers that left over as extra on top of the minimums.
- What the user experiences: "Use £800" on the pay-extra slider plans £800 on top of £150 minimums, when only £800 is free in total. Safe to spend on the same data counts the £150.
- Evidence: budget-totals.ts:85; debtInputs.ts:25; PayExtraTool.tsx:243-245; commitments.ts:44-47 (safe to spend does include them).
- Worked example: income £2,500; rent £900, bills £300, food £300, savings £200; card minimums £150 saved on accounts, with no debt row in the budget. Left over is £800, though the honest figure is £650.
- Severity: wrong number shown.
- Root cause: two debt-payment stores, and only commitments reconcile them.
- How to check: a persona with a card that has a saved minimum and no "debt" budget row. Compare /app/debt "use left over" with the Dashboard's left over and the Budget's safe to spend.
- Confidence: confirmed in code.

### BU-7 Card payments recorded outside the "debt" category are counted twice
- Fact or figure: safe to spend and Breathing room.
- What is wrong: `findPossibleDuplicateDebtRows` only flags a row whose name contains the account's name and whose amount equals a saved minimum to the penny. A "Credit card" bills row against a "Barclaycard" account, or onboarding's "General living and outgoings" against an estimated minimum, is counted twice.
- What the user experiences: Safe to spend is too low and Breathing room too short by the payment amount, with no notice. "Keep as is" lasts only for the browser session (sessionStorage), so the notice comes back in a new session.
- Evidence: FE/picture/selectors/duplicate-debt-rows.ts:57-97 (penny match, name match, estimated minimums skipped); commitments.ts:42; BudgetContainer.tsx:91-106; services/onboarding-seed.ts:73-74 (the card account is seeded without a minimum, so its minimum is estimated).
- Worked example: onboarding with other outgoings £1,100 (including a £100 card payment) and £4,000 of card debt. Estimated minimum = max(25, 2.5% x 4,000) = £100. Commitments are £900 + £1,100 + £100 = £2,100, against real outgoings of £2,000.
- Severity: wrong number shown.
- Root cause: the duplicate check papers over two stores with a name heuristic.
- How to check: on /app/budget add a bills row "Credit card" at the card's saved minimum, then note that safe to spend drops by that amount and no duplicate notice appears.
- Confidence: confirmed in code. That users do this is inferred.

### BU-8 A £0 income row makes left over negative
- Confirmed in a browser: yes, check B21 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: left over and "Short each month".
- What is wrong: The wizard saves an income entry with only a name as £0, and `hasIncome` is then true.
- What the user experiences: The Dashboard and Budget show "Short each month £1,500" when the user simply has not typed an amount yet. The wizard's own hint suggests adding a salary row and then pressing "Use £X", which makes this likely.
- Evidence: BudgetSetupWizard.tsx:194-201,528-531; budget-totals.ts:63-66; routes/_index.tsx:234; HomeDashboard.tsx:160-169.
- Severity: wrong number shown.
- Root cause: `hasIncome` does not require an amount above 0, unlike `hasEssentials` (budget-totals.ts:72).
- How to check: an empty-budget persona. In the wizard's income step add "Salary" with no amount, add rent £900, and finish. The Dashboard left-over card shows short by £900.
- Confidence: confirmed in code.

### BU-9 Pension in take-home and the budget (L37 note)
- Fact or figure: take-home and planned savings.
- What is wrong: Nothing is wrong by default. If a user adds a "Pension" savings row, safe to spend subtracts it again from a take-home that is already net of pension. Separately, BU-2 deducts pension twice inside take-home for take-home-mode users.
- Severity: wrong number shown (only in those cases).
- How to check: add a savings row "Workplace pension" at the payroll amount; safe to spend falls by that amount.
- Confidence: inferred, not confirmed (depends on what users do).

### BU-10 Onboarding rows are saved as essential, and other outgoings is stored twice
- Fact or figure: Breathing room, safe to spend, `profile.monthlyOtherOutgoings`.
- What is wrong: Seed rows carry no `isEssential`, so the backend sets true. All "other outgoings" (a custom "living" category) then count as essential. The same figure is also kept in the profile, where no figure reads it.
- What the user experiences: Breathing room is shorter than the person's essentials alone would give, until they untick the flag in Edit budget.
- Evidence: services/onboarding-seed.ts:44,80; budget.service.ts:325; grep: `monthlyOtherOutgoings` is read only by onboarding hydration and the export and MCP input (useSeedHydration.ts:51; agent/mcp-input.ts:57).
- Severity: wrong number shown (essential flag); wasteful but invisible (profile copy).
- How to check: finish onboarding with other outgoings £1,100, then open /app/budget Edit budget: "General living and outgoings" is ticked essential.
- Confidence: confirmed in code.

### BU-11 Dead fields and endpoint
- Fact or figure: `monthlySavingsTarget`, `isPrimaryIncome`, `isDefault`, `POST /budget-entries/seed-defaults`, and Dashboard `totalMonthlyContributions` and `savingsRatePct`.
- What is wrong: These are stored or worked out but never shown or used.
  - The `monthlySavingsTarget` save action has no form that submits it.
  - `isPrimaryIncome` is always false on create, so the RunwayCalculator treats every income row as "other income" and the wizard falls back to the first row.
  - `seed-defaults` (fourteen £0 rows, `isDefault` true) has no client caller.
  - Dashboard `totalMonthlyContributions` sums raw contributions at 100%, not the user's share, and is not displayed.
- Evidence: routes/app.savings.tsx:95-110; budget.service.ts:255-266,322,327; RunwayCalculator.tsx:155-157; routes/_index.tsx:100-103,239-245; api-proxy.server.ts:58.
- Severity: wasteful but invisible.
- Confidence: confirmed in code.

## Savings, ISAs, cards and loans (SD)

### SD-1 Editing a joint savings account on Savings halves its balance
- Confirmed in a browser: yes, check B5 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: The Savings page replaces each account's `balance` with the user's share (`nominalBalance`) and passes those rows to the list. The edit dialog prefills from that share, and always sends `balance` on save. The backend stores it as the whole balance.
- What is wrong: The user's share is saved back as the whole balance, so every save of a joint account cuts it by the share again.
- What the user experiences: A joint easy-access account of £10,000 at 50% shows £5,000 on Savings. They change only the rate and save. The stored balance is now £5,000, so Savings and net worth show £2,500, and Accounts shows £2,500. A second save gives £1,250. A history row for this month is probably written too.
- Evidence: W/containers/savings/SavingsContainer.tsx:105-110 (balance replaced with nominalBalance), :205 (`<SavingsAccountsList accounts={savingsAccounts} />`); W/features/savings/components/SavingsAccountsList/SavingsAccountsList.tsx:153-156 (dialog given that row); AddSavingsAccountDialog.tsx:77 (prefill), :102 (always sends balance); W/routes/app.savings.tsx:73-74 (PATCH balance). The dialog test uses a raw account (AddSavingsAccountDialog.test.tsx:193-201), so this path is not covered.
- Severity: wrong number shown (and saved data changed)
- Root cause: A display value at the share is reused as a form value that is stored whole.
- How to check: On Accounts, make a non-ISA savings account joint at 50% with £10,000. Open Savings, then Edit on that account: note the balance field (expect £5,000). Change only the rate and save. Read the balance on Accounts and Savings.
- Confidence: confirmed in code

### SD-2 Dashboard savings total is the whole balance, Savings is the share
- Confirmed in a browser: yes, check B4 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: The Dashboard "Savings and investments" card sums raw `a.balance` over Saving and Investment rows. Savings sums `nominalBalance` (at share). Accounts rows are also at share.
- What is wrong: The same accounts give two different totals.
- What the user experiences: With a sole ISA of £8,000 and a joint saver of £10,000 at 50%, the Dashboard card shows £18,000; Savings and the Accounts rows add to £13,000. Net worth on the same Dashboard uses £13,000.
- Evidence: W/routes/_index.tsx:93-99, :251; W/features/dashboard/components/SavingsWidget/SavingsWidget.tsx:26; W/containers/savings/SavingsContainer.tsx:116-118; W/features/accounts/accountRows.ts:107-115.
- Severity: wrong number shown
- Root cause: The Dashboard does its own sum over loader rows instead of using `PortfolioSnapshot` or the picture.
- How to check: With a 50% joint savings account, compare the Dashboard savings card with the Savings hero total.
- Confidence: confirmed in code

### SD-3 ISA allowance used has two answers, and neither reads balances
- Fact or figure: Savings shows `estimateIsaUsed` = sum of the monthly saving on ISA accounts x months started since 6 April, capped at £20,000. On 19 November that is 8 months. The AI context pack prints "ISA allowance unused this tax year: £20,000 of £20,000" because `isaAllowanceUsedGbp` is hard-coded to 0.
- What is wrong: The AI always reports none of the allowance used, while Savings reports an estimate. The estimate ignores lump sums, transfers, an account opened mid-year and any balance change recorded at a check-in.
- What the user experiences: A Cash ISA with £500 a month shows £4,000 used on Savings, but the AI says £20,000 is unused. An ISA opened in May with a £10,000 deposit and no monthly saving shows "None" on Savings.
- Evidence: W/features/savings/components/SavingsAccountsList/isaAllowance.utils.ts:4,45-58; W/features/savings/components/SavingsSummaryCards/SavingsSummaryCards.tsx:16,26-27,121-122; FE/uk-tax.ts:467-469; FE/ai-context-pack.ts:540. There is no engine `estimateIsaUsed`. The web has its own `ISA_ALLOWANCE` (isaAllowance.utils.ts:4) next to the engine rule (FE/uk-tax-year.ts:353,492).
- Severity: wrong number shown
- Root cause: ISA used is not stored and not worked out in the engine. The tax facade hard-codes a stub.
- How to check: Give a Cash ISA a monthly saving of £500 on Savings and read the ISA card. Then ask the AI how much ISA allowance is left (or read the MCP context pack).
- Confidence: confirmed in code

### SD-4 The 0% end date is shown but never used in interest
- Fact or figure: `toDebtItems` passes `promoAprExpiryDate` but never `revertApr`. The schedule switches rate only when both are set, so the stored APR applies for the whole schedule.
- What is wrong: The debt-free date and interest on Debt, Dashboard and MCP ignore the end of a 0% deal.
- What the user experiences: A £3,000 card entered at 0% until June 2027, with a £100 payment, clears in 30 months with £0 interest, even though interest starts in June 2027. If the user enters the later rate (say 24.9%) instead, interest is charged from today. The AI pack also tells the model "then 24.9% APR", which is an assumed default and not the user's figure.
- Evidence: FE/portfolio.ts:429-447; FE/debt-payoff.ts:146-167 (revertApr ?? 24.9 in the alert only), :290-296; FE/ai-context-pack.ts:508-513; W/features/debt/components/DebtAccountsList/DebtAccountsList.tsx:106-109 (display only).
- Severity: wrong number shown
- Root cause: No revert rate is stored, and the rate field does not say which rate to enter.
- How to check: On Debt, add a card of £3,000 at 0% APR, £100 a month, 0% ending in 6 months. Read the debt-free date: it will be about 30 months away. Change the end date to next month: the date does not move.
- Confidence: confirmed in code

### SD-5 The credit limit is display only
- Fact or figure: `creditLimitGbp` is shown as "Limit £x" in the Debt list and is not used anywhere else: no utilisation, no headroom, nothing in MCP.
- What is wrong: Nothing is wrong with the figures. The field is stored and shown only.
- What the user experiences: Nothing incorrect.
- Evidence: FE/portfolio.ts:425-446; W/features/debt/components/DebtAccountsList/DebtAccountsList.tsx:100-103; no MCP use (grep).
- Severity: wasteful but invisible
- Root cause: None. This is a feature gap.
- How to check: None needed.
- Confidence: confirmed in code

### SD-6 AI debt figures use different inputs from Dashboard and Debt
- Fact or figure: Dashboard (`buildDebtSummary`) and Debt (`compareAvalancheAndSnowball(debts, 0).minimumOnly`) both run the minimum-only avalanche over `toDebtItems`, and both hide the date when any APR is unknown. MCP `simulate_debt_payoff` leaves out debts with no APR and gives a date for the rest. The context pack runs with a hard-coded extra £50 a month, counts unknown APRs as 0%, and labels its "Debt balance" from payoff items only.
- What is wrong: The AI can quote an earlier debt-free date and a lower total debt than the pages show.
- What the user experiences: With a card of £2,000 at 20% (£60 a month), a loan of £5,000 with no APR, and a current account £300 overdrawn: Dashboard and Debt show total debt £7,300 and no date ("add the rate"). MCP gives a date for the card alone. The context pack says debt balance £7,000 and gives a date with £50 extra that the user never chose.
- Evidence: W/utils/debtSummary.ts:29-47; W/containers/debt/DebtContainer.tsx:73,80-82,251-256; W/features/debt/components/DebtSummary/DebtSummary.tsx:46,75; MCP/simulate/simulateDebtPayoff.ts:174-182,252-253; MCP/read/getDebtOverview.ts:99; FE/ai-context-pack.ts:277-284,383,503-505.
- Severity: wrong number shown
- Root cause: The context pack builds its own debt section instead of using `selectDebtTotals` and a minimum-only schedule.
- How to check: Seed a card with an APR and a loan without one. Compare the Debt page date with the AI's answer to "when will I be debt-free?".
- Confidence: confirmed in code

### SD-7 Joint debt payment edited on Debt is saved on the wrong basis
- Fact or figure: `toDebtItems` scales the balance and `monthlyContribution` by the share. The Debt edit dialog prefills the minimum from that scaled value and saves the typed value as the stored (whole) payment.
- What is wrong: For a joint card or loan, an edited payment is stored at the share, then scaled down again when read.
- What the user experiences: A joint loan (50%) with £300 a month shows £150 on Debt. The user corrects it to £160 and saves. Debt then shows £80, and the budget and commitments change too.
- Evidence: FE/portfolio.ts:246-248,419-421; W/features/debt/components/AddDebtDialog/AddDebtDialog.tsx:61-63,108-115; W/containers/debt/DebtContainer.tsx:192-196. Joint is allowed for cards and loans (FE/joint-share.ts:112-117; AddEditAccountsDialog.tsx:384-390).
- Severity: wrong number shown
- Root cause: The same share-for-display versus whole-for-storage mix-up as SD-1. The balance is safe because Debt does not send it on edit (DebtContainer.tsx:180-181).
- How to check: Make a loan joint at 50% on Accounts with a £300 payment set on Debt. Edit the payment on Debt to £160 and read it back.
- Confidence: inferred, not confirmed (needs a run; the code path is clear)

### SD-8 Each form has a different set of fields
- Fact or figure: The Accounts dialog has name, type, subtype (Saving, Investment, Mortgage), student loan plan, balance, joint and share, credit limit and 0% end. It has no rate and no monthly amount. The Savings dialog has name, kind, balance, rate and monthly saving, but no joint control (it only forces sole for an ISA). The Debt dialog has name, type, rate, payment, limit and 0% end, with balance on create only, and no joint control.
- What is wrong: Nothing is lost on save: each route sends only its own fields. But no single form holds a whole account, so a full setup needs two pages.
- What the user experiences: A card added on Accounts shows on Debt with "add the rate" and an estimated minimum. A joint saver can only be made joint on Accounts.
- Evidence: AddEditAccountsDialog.tsx:414-455; W/features/accounts/accountFormBody.ts:4-12; W/routes/app.savings.tsx:28-88; W/routes/app.debt.tsx:36-82.
- Severity: user must enter something twice
- Root cause: The fields were split across forms by page.
- How to check: Add a credit card on Accounts with a limit, then open Debt: the rate is missing and the minimum is marked as an estimate.
- Confidence: confirmed in code

### SD-9 The student loan plan on the account is not the one take-home uses
- Confirmed in a browser: yes, check B11 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: The account stores `studentLoanPlan`, and the Accounts dialog requires it. Take-home and the AI read the profile `studentLoanPlans` only. The context pack evaluates the loan with a £15,000 balance proxy, not the account balance.
- What is wrong: The two plans can disagree, and only the profile plan changes take-home.
- What the user experiences: They add a Plan 2 loan on Accounts. Take-home still shows no student loan repayment until the plan is also set on Profile.
- Evidence: FE/picture/selectors/take-home.ts:61-66; FE/picture/input.ts:122-127; apps/backend/src/modules/finance/account-intake.service.ts:442-461; FE/ai-context-pack.ts:288-292.
- Severity: user must enter something twice
- Root cause: Two stores with no sync.
- How to check: With no plan on Profile, add a Plan 2 Student Loan account on Accounts. Open Take-home and look for a student loan line.
- Confidence: confirmed in code

### SD-10 Payoff ignores the budget's debt row
- Fact or figure: The payoff payment is the account's `monthlyContribution`. When that is empty or 0, it is max(£25, 2.5% of the balance). Budget debt rows are used only in commitments, as max(account minimums, budget rows).
- What is wrong: A payment entered only in the budget never reaches the payoff date.
- What the user experiences: Card £4,000, with a budget row "Card £200" and no payment on the account. Payoff uses £100 (2.5%), so the date is years later than £200 would give.
- Evidence: FE/portfolio.ts:416-421; commitments as in inventory B1.
- Severity: user must enter something twice
- Root cause: Two places hold one fact.
- How to check: Put £200 in a budget debt row, leave the card's payment empty, and read the Debt page minimum (marked as an estimate) and the date.
- Confidence: confirmed in code (commitments side from the inventory, not re-read)

### SD-11 Unused savings figures and settings
- Fact or figure: The Dashboard loader works out `weightedInterestRate` (`getWeightedSavingsRate`, which counts unrated accounts and investments at 0%) and `totalMonthlyContributions`, but the widget shows neither. The `updateSavingsSettings` action has no caller. The profile fields `monthlySavingsTarget`, `savingsAllocationMode` and `savingsDefaultInterestRate` have no reader. The 5.0% default on the profile never fills in a missing account rate: Savings counts that account as having no rate.
- What is wrong: The code is unused, and it could mislead whoever wires it up later. For example, £10,000 at 4% plus £10,000 with no rate gives 2.00% from `getWeightedSavingsRate`, but 4.0% from `balanceWeightedRate`.
- What the user experiences: Nothing today.
- Evidence: W/routes/_index.tsx:100-106,250-253; FE/portfolio.ts:380-392; FE/savings-interest.ts:142-157; W/routes/app.savings.tsx:95-109; apps/backend/src/modules/profile/user-profile.service.ts:282-287.
- Severity: wasteful but invisible
- Root cause: Leftovers from an earlier design.
- How to check: None.
- Confidence: confirmed in code

### SD-12 Debt kinds collapse to Loan
- Fact or figure: The Debt type list offers BNPL, car finance and other. All three are stored as "Loan" and read back as `loan`, labelled "Personal loan".
- What is wrong: The kind the user chose is not kept.
- What the user experiences: They choose "Car finance or HP" and the row then says "Personal loan".
- Evidence: W/features/debt/components/AddDebtDialog/AddDebtDialog.tsx:40-47; W/features/debt/utils/debtAccountMapping.ts:20-24; FE/portfolio.ts:406-413.
- Severity: wrong number shown (a wrong label, not a figure)
- Root cause: There is no stored subtype for loans.
- How to check: Add a debt of type "Car finance or HP" on Debt and read its row label.
- Confidence: confirmed in code

## Self Assessment (SA)

### SA-1 Self-employed profile income counted as PAYE salary on the page and in MCP
- Confirmed in a browser: yes, check B12 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: self-employed, profile `annualSalary` 40,000, one self-employed income record of 40,000 in 2026/27, no expenses. The trading allowance of 1,000 leaves 39,000 profit. Dashboard (salary passed as 0): income tax on 39,000 − 12,570 = 26,430 at 20% is 5,286, plus Class 4 at 6% on the same 26,430 is 1,585.80, total **£6,872**. Page (salary passed as PAYE pay): total income 79,000; income tax 7,540 + 11,492 = 19,032; plus Class 4 1,585.80; less tax already paid through PAYE on 40,000 of 5,486; total **£15,132**. MCP passes the same inputs as the page. Both figures were seen in the browser (check B12). An earlier version of this finding left out the trading allowance and gave £15,592 and £7,132.
- What is wrong: the page and MCP pass the profile salary as PAYE pay whatever the employment type; only the Dashboard selector zeroes it for self-employed.
- What the user experiences: two different "estimated bill" figures, more than double on the page; the drawer shows "Salary through PAYE £40,000" for someone with no employer.
- Evidence: TaxContainer.tsx:186,230 (no `employmentType` read anywhere in containers/tax or features/tax); TaxSourceContainer.tsx:88-91; estimated-tax-due.ts:66,85; getTaxYearPosition.ts:87,93.
- Severity: wrong number shown.
- Root cause: the salary rule lives inside `selectEstimatedTaxDue`, not in `calculateUKTax`, and the page and MCP call `calculateUKTax` directly.
- How to check: any persona with SA on. Settings: employment type self-employed, salary 40,000. SA: add self-employed income 40,000 annual in 2026/27. Read the page hero, then the Dashboard Self Assessment card.
- Confidence: confirmed in code.

### SA-2 MCP and AI context pack invent a £45,000 salary when none is saved
- Fact or figure: no salary saved, rental profit 20,000. Dashboard: unknown. Page: salary 0, bill £1,486 (20,000 − 12,570 at 20%). MCP: salary 45,000, total 65,000, income tax 7,540 + 14,730 at 40% = 13,432, less "PAYE tax" 6,486, bill **£6,946**; the `missing.annualSalary` note never fires because salary is not 0.
- What is wrong: `userProfileToFinancialBaseline` replaces a missing salary with `DEFAULT_FINANCIAL_BASELINE.annualGrossSalary` 45,000, and MCP and the context pack read it as fact.
- What the user experiences: the AI assistant quotes a tax position on a salary the user never gave.
- Evidence: packages/finance-engine/src/profile.ts:16,178-181; getTaxYearPosition.ts:87,120; ai-context-pack.ts:347-351,531; apps/backend/src/modules/agent/agent-data.service.ts:204-206.
- Severity: wrong number shown.
- Root cause: a display default used as an input; the web app already neutralises it (apps/web/app/state/baseline.store.ts:25-37), the backend does not.
- How to check: needs the MCP client, so check by code or an MCP test with a profile with `annualSalary` null; in the browser, compare SA hero (salary empty) with the Dashboard card (should say not shown).
- Confidence: confirmed in code (the exact MCP figure is worked by hand, not run).

### SA-3 Scottish taxpayers: page estimate silently uses England bands
- Confirmed in a browser: yes, check B13 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: Scottish, salary 45,000, rental profit 5,000. EWNI (all three surfaces): taxable 37,430, rental taxed at 20% = **£1,000**. Scottish 2026/27 bands put taxable income above 31,092 at 42%: about **£2,100**.
- What is wrong: `calculateUKTax` hard-codes `ENGLAND_NI_WALES`; the page shows no note, the Dashboard shows a note, MCP shows Scottish bands next to the EWNI estimate.
- What the user experiences: an estimate roughly half the likely bill, with no warning on the SA page itself.
- Evidence: tax-calculator.ts:796-798; estimated-tax-due.ts:22-23,92; getTaxYearPosition.ts:95,192-195; no `taxRegion` read in containers/tax or features/tax.
- Severity: wrong number shown.
- Root cause: region was never added to the SA ledger's signature.
- How to check: set tax region Scotland in Settings, add rental income on SA, read the SA page for any region note, then the Dashboard card notes.
- Confidence: confirmed in code (Scottish figure approximate).

### SA-4 Buy-to-let mortgage account carries nothing into SA
- Confirmed in a browser: yes, check B7 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: fixture "Dan": BTL mortgage account 150,000 at 4.5%, `monthlyContribution` 562.50; the same interest is also a budget entry (562.50) and a `mortgage_interest` record (6,750 annual). Three typings of one figure (packages/finance-engine/src/picture/__fixtures__/personas/dan.ts:25-31,38,91-94).
- What is wrong: the BTL row in "Income sources" lists the account name only; the Section 24 credit reads only `mortgage_interest` records.
- What the user experiences: "From your account: BTL mortgage" suggests the account is used, but the bill ignores it. To get the relief the user must type again: (1) rent as `rental_income` records, (2) interest paid as `mortgage_interest` expense records for the whole property, (3) their share in the "How the estimate is worked out" drawer, which only appears after rental income exists.
- What the engine would need: per tax year, interest = sum over the year's months of (month balance from `account_details`, else current balance) × `interestRate` / 12, times the account `sharePercent`. For an interest-only loan at constant balance this is balance × rate (150,000 × 4.5% = 6,750). Payment records would be exact but none are stored.
- Evidence: TaxContainer.tsx:385-394; TaxSourcesPanel.tsx:87-100; tax-calculator.ts:490,582,677-682.
- Severity: user must enter something twice.
- Root cause: tax records are a separate ledger with no account link.
- How to check: add a mortgage account with subtype buy-to-let, balance 150,000, rate 4.5%. Open SA (turned on): see the BTL row; add rent 1,100 monthly; open the drawer and confirm "Tax credit for mortgage interest" is £0.
- Confidence: confirmed in code.

### SA-5 Two property shares
- Fact or figure: BTL property and mortgage accounts joint at 50% (net worth counts 50%); profile share unset, so SA uses 100%. Rent 12,000, costs 2,000: SA taxes 10,000 profit, not 5,000.
- What is wrong: SA reads profile `propertyOwnershipShare` only; account `sharePercent` is never consulted, and the profile share is edited only inside SA.
- What the user experiences: correct share in Accounts, double the taxable rent in SA unless they type 50 again.
- Evidence: TaxContainer.tsx:187,230,375; TaxSourceContainer.tsx:89; profileFirst.ts:40-48; joint-share.ts:133,177.
- Severity: wrong number shown (until retyped).
- Root cause: share stored per profile for tax and per account for wealth.
- How to check: mark the BTL property joint 50% in Accounts; on SA open the drawer and read "Your share of the rental property".
- Confidence: confirmed in code.

### SA-6 Legacy PAYE salary records override the profile salary for tax only
- Fact or figure: profile 58,000, an annual `paye_salary` record 40,000, rental profit 10,000. Page, Dashboard and MCP all use 40,000: rental tax **£2,000**. On 58,000 it would be **£4,000**. Take-home and Pension use 58,000. The drawer shows "Yearly salary before tax 58,000" and "Salary through PAYE £40,000" together; editing the 58,000 changes nothing.
- What is wrong: the engine lets a salary record replace the saved salary; the UI no longer lets people create one but keeps old ones.
- What the user experiences: a salary field that does nothing and a bill based on an older figure.
- Evidence: tax-calculator.ts:549-569; tax-labels.ts:68-82; TaxReservePanel.tsx:101-152.
- Severity: wrong number shown (rare: only legacy or API-written records; no seed writes one).
- Root cause: two stores for employment pay.
- How to check: needs a `paye_salary` record created through the API; then compare the drawer's two salary lines.
- Confidence: confirmed in code.

### SA-7 Seeded persona P5 tax records do not match the engine's ids
- Fact or figure: P5 records: `{source:"rental", category:"rent", 650 monthly}` and `{source:"self-employment", category:"software", 720 annual}`.
- What is wrong: `rent` is not a rental category (the id is `rental_income`), so the engine ignores the rent; `self-employment` is not a contract source, so the `/tax-records` response should fail `TaxRecordDto` parsing.
- What the user experiences: likely an error page on both the Dashboard and SA for P5, since both loaders fetch tax records. If it loads, the strip shows "Income outside PAYE £7,800" next to a bill worked out on £0 rent.
- Evidence: scripts/ops/synthetic-personas.ts:267-286; scripts/ops/seed-synthetic.ts:165-167 (raw SQL, no validation); packages/api-contract/src/domains/tax.ts:5,18,66; apps/web/app/services/backend-client.server.ts:407,419; tax-calculator.ts:467-469.
- Severity: wrong number shown (test data; API accepts any category string, so real users can hit the category half via the API).
- Root cause: the seed bypasses the contract; `category` is a free string in the contract.
- How to check: sign in as seeded P5, open the Dashboard, then /app/self-assessment.
- Confidence: category part confirmed in code; error page inferred, not confirmed.

### SA-8 AI context pack reports tax for 2025/26
- Confirmed in a browser: yes, check B16 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: section heading "Tax, 2025/26" and its SA ledger are for 2025/26 on 19 November 2026; 2026/27 records fall outside it.
- What is wrong: `userProfileToFinancialBaseline` spreads `DEFAULT_FINANCIAL_BASELINE.taxYear` "2025/26" and never sets the current year.
- What the user experiences: the assistant describes last year's position as this year's.
- Evidence: profile.ts:13,211-213; ai-context-pack.ts:342,347-351,406,530.
- Severity: wrong number shown.
- Root cause: a fixed default year in the baseline.
- How to check: not browser-visible; check by an MCP context-pack call or unit test.
- Confidence: confirmed in code.

### SA-9 Headline strip sums differ from what the engine taxes
- Fact or figure: 50% share, rent 12,000: strip "Income outside PAYE £12,000"; engine taxes 6,000. An ISA interest record of 300 alone shows the hero with £0 and a strip of £300; the Dashboard shows nothing.
- What is wrong: `nonPayeIncome`/`nonPayeCosts` sum every non-PAYE record locally, whole property, ISA included.
- What the user experiences: the strip and the bill do not match without an explanation on the list page (the source page labels "Whole property").
- Evidence: TaxHeadline.tsx:41-53,93-96; TaxIncomeSectionCard.tsx:59-66; estimated-tax-due.ts:25-33,86-90.
- Severity: wrong number shown (labelling).
- How to check: set share 50 in the drawer, add rent 1,000 monthly; read the strip against the drawer's "Your share of rental profit".
- Confidence: confirmed in code.

### SA-10 Unsaved drawer edits change the page bill only; Dashboard unknown text points the wrong way
- Fact or figure: typing a new salary in the drawer recalculates the hero at once; the source page and Dashboard stay on the saved salary until Save. An employee with no salary sees "Shown once you add income not taxed through PAYE" on the Dashboard even after adding rent, because the missing item is the salary.
- Evidence: TaxContainer.tsx:191-233; TaxSourceContainer.tsx:86-91; estimated-tax-due.ts:69-70; TaxWidget.tsx:55-59.
- Severity: stale until reload (save).
- Confidence: confirmed in code.

### SA-11 What `check-one-tax-engine` does not cover
- It counts rate-field names and four threshold literals only (scripts/lib/one-tax-engine.ts:28-29). It cannot see: different inputs to the same `calculateUKTax` (SA-1, SA-2, SA-3); the literal 0.2 Section 24 rate (tax-calculator.ts:682) and a second Section 24 model (packages/finance-engine/src/section24.ts:50, used by packages/ui Section24Calculator); PSA limits hard-coded as 1000/500 (AnnualAllowancePill.tsx:47-48); local record sums (TaxHeadline.tsx:41-53, routes/_index.tsx:136-146); the parked mobile app (outside ROOTS).
- Severity: wasteful but invisible.
- Confidence: confirmed in code.

### SA-12 Wasted work
- Dashboard loads all tax records and computes `estimatedTaxDue` and an unused `netProfit` even when SA is off (routes/_index.tsx:58,133-146,289). MCP tax tools ignore `enabledModules`.
- Severity: wasteful but invisible.

## Balances, the check-in and History (CH)

### CH-1 A new account has no history row
- Confirmed in a browser: yes, check B10 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: `createAccount` saves the account only (BE/modules/finance/account-intake.service.ts:596-644). Only the onboarding finish (BE/modules/profile/user-profile.service.ts:205-208), a check-in, a balance edit or an import write a row.
- What is wrong: The month an account is added is never recorded for it, so History changes that month after it ends.
- What the user experiences: (a) Account B (£5,000) added on 20 October. In October, History's October point includes B, because the current month is filled from saved balances. On 1 November, October is worked out again without B (FE/snapshots.ts:170, 197: saved balances fill the `through` month only). October drops by £5,000 and November shows it as "added". The Dashboard's change line compares today with October (WEB/routes/_index.tsx:180), so it counts B's whole balance as change. (b) A user with accounts but no rows at all (onboarded with none, then added them on Accounts) gets an empty History, because `selectNetWorthSeries` returns `[]` when no row exists (FE/snapshots.ts:166). MCP `get_balance_history` is empty too. The empty state says "Their balances then become your first month of history" (WEB/features/snapshot/components/SnapshotHistoryPage/SnapshotHistoryPage.tsx:258), which does not happen. The user has to do a check-in to confirm figures they have just typed.
- Evidence: BE/modules/finance/account-intake.service.ts:596-644; FE/snapshots.ts:166-200; WEB/routes/_index.tsx:174-181; SnapshotHistoryPage.tsx:255-259.
- Severity: wrong number shown.
- Root cause: The create path does not call `upsertCurrentMonthHistory`, unlike update.
- How to check: As a seeded persona with History, on Accounts add a Saving account with £5,000. Note the current month's net worth in History. Then check the account page: it says "No monthly balances recorded yet" and has no chart. For (b), sign up, finish onboarding with no accounts, add two accounts on Accounts, then open History: it shows "No monthly balances yet".
- Confidence: confirmed in code (the rollover part follows from the selector, not run).

### CH-2 Correcting the latest month after it ends leaves today's balance at the old figure
- Confirmed in a browser: yes, check B15 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: `writeSnapshotRows` moves the balance only for the current month (snapshot-write.ts:66-69).
- What is wrong: The saved balance and the latest recorded value disagree, and every "today" reader shows the older one.
- What the user experiences: October check-in typed £1,000 by mistake. In November, before checking in, the user uses "Add earlier months", picks October and enters £10,000. History's October point shows £10,000. November is filled from the saved balance, still £1,000 (FE/snapshots.ts:197-199), so the chart dips by £9,000. The Dashboard, Accounts, MCP and the account page hero show £1,000. The hero's subline says "As of October 2026" (WEB/containers/accounts/accountDetailContainer/AccountDetailContainer.tsx:137-153) under a figure that is not October's record. In the check-in, the step says "Current balance: £1,000" (FE/check-in.ts:482-483) and the calculated figure is withheld (FE/check-in.ts:76-80). The back-fill list prefills £10,000 for November (FE/check-in.ts:294-295), so two sheets offer two figures. An import committed to the latest past month gives the same state (BE/modules/imports/imports.service.ts:435-472).
- Evidence: as above.
- Severity: wrong number shown.
- Root cause: "Today" is a separate stored figure, moved only by current-month writes. Nothing reconciles it when a later-dated past row lands after it was set.
- How to check: Seeded persona with a recorded previous month and no row this month. History, "Add earlier months", choose last month, change one account by £1,000, save. Compare History's last two points, the Dashboard net worth and that account's page hero and subline.
- Confidence: confirmed in code.

### CH-3 The check-in reminder hides once any single account is recorded
- Confirmed in a browser: yes, check B9 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: `isCheckInDue` returns false when `lastRecordedMonth` is this month (FE/check-in-day.ts:59). The Dashboard passes the latest month of any row of any account (WEB/routes/_index.tsx:189; WEB/features/snapshot/snapshotModel.ts:320-330). History uses the same test for its prompt (FE/recorded-month-comparison.ts:106).
- What is wrong: A part-done check-in or an unrelated edit counts as "this month recorded".
- What the user experiences: The check-in saves each step at once (WEB/features/snapshot/useCheckIn.ts:72-74). After one of five accounts, the Dashboard row disappears, and the "Continue check-in" label can never show: `partDone` is never passed (WEB/features/dashboard/components/HomeDashboard/HomeDashboard.tsx:367). History's "not recorded yet" link goes and "Next check-in" points to next month. The same happens if the user renames any account: the edit dialog always posts the prefilled balance (AddEditAccountsDialog.tsx:250, 312, 449), so `updateAccount` writes a current-month "manual" row (account-intake.service.ts:772-774). Side effects of that row: it replaces a "calculated" or "confirmed" source with "manual" (History source label). It counts as a typed figure for the statement prompt (FE/check-in.ts:435). It also makes a connected account's month stick against sync (connected-write.ts:39).
- Evidence: as above; `snapshot_checkins` (written with `complete`, snapshots.service.ts:164-170) is never read.
- Severity: stale until reload (the reminder goes for the rest of the month).
- Root cause: "Recorded" means any row. The table that records a completed check-in is never read, and the edit form does not leave out an unchanged balance.
- How to check: Seeded persona, after the check-in day, with nothing recorded this month: the Dashboard shows "Start monthly check-in". On Accounts, edit any account's name only and save. Back on the Dashboard the row is gone. Second check: start the check-in, answer one step, close it, go to the Dashboard.
- Confidence: confirmed in code.

### CH-4 Debt changed to an asset keeps negative history
- Confirmed in a browser: yes, check B20 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: `resignHistoryForType` only re-signs towards a debt (stored-balance.ts:39-47). The edit dialog shows a debt's amount as positive and re-posts it (AddEditAccountsDialog.tsx:250, 429, 449).
- What is wrong: Today's balance turns +£500 but every past month stays −£500.
- What the user experiences: A credit card owing £500 is changed to Saving. History shows a £1,000 rise this month. The Accounts list change compares £500 with −£500 and gives about "-200%" (WEB/features/accounts/accountRows.ts:121-124).
- Evidence: as above; BE/modules/finance/account-intake.service.ts:760-770.
- Severity: wrong number shown.
- Root cause: The sign rule leaves an asset's sign alone, and the form always resends a positive figure.
- How to check: Seeded persona with a Credit Card with two recorded months. Edit it, change the type to Saving, save. Read History's last two points and the Accounts row change.
- Confidence: data path confirmed in code; the on-screen percentage is inferred, not confirmed.

### CH-5 History elsewhere stops at the last recorded month (L51)
- Fact or figure: `PortfolioSnapshot.getMonthlyHistory` covers only accounts with rows, from first to last recorded month, with no current-month fill (FE/portfolio.ts:461-520). It feeds the AI context pack `portfolio.monthlyHistory` (FE/ai-context-pack.ts:376, beside `netWorth` from saved balances at :366) and `GET /portfolio-snapshot` (account-intake.service.ts:873). No web or mobile code calls that endpoint (only a test sets `includePortfolioSnapshot`, WEB/services/backend-client.server.ts:371,411). The retirement "Counted towards retirement" line and the MCP retirement series also run without `through` or saved balances (WEB/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx:306-309, 612-624; packages/mcp/src/tools/read/getRetirementPicture.ts:239). They leave out pots never recorded, though the month is shown beside the figure.
- What is wrong: In the context pack, the history's last point and the net worth figure can differ, and the last point can be months old.
- What the user experiences: An assistant reading the pack sees two different "latest" net worths. A pension added without a check-in is missing from "Counted towards retirement".
- Evidence: as above.
- Severity: wrong number shown (AI output); the endpoint itself is wasteful but invisible.
- Root cause: Two history implementations; only `selectNetWorthSeries` takes the saved-balance fill.
- How to check: Settings, AI connections, preview the context pack for a persona with no row this month (or a newly added account). Compare `portfolio.netWorth` with the last `monthlyHistory` point.
- Confidence: confirmed in code.

### CH-6 Mortgage "Last updated" never uses the recorded month
- Fact or figure: `String(row.account_id) === selectedAccountId` (MortgageContainer.tsx:746-747). The contract row has `accountId` only and is strict (api-contract accounts.ts:176-178).
- What is wrong: The match never succeeds.
- What the user experiences: The line shows the profile's last change date (MortgageContainer.tsx:762), not the month of the latest mortgage balance.
- Evidence: as above.
- Severity: wrong number shown (a date).
- Root cause: The snake_case field name is left over.
- How to check: Seeded persona with a residential mortgage and history. Open the Mortgage page without saving and read "Last updated". Compare it with the account page's latest month.
- Confidence: confirmed in code.

### CH-7 Unused write path and write-only table
- Fact or figure: `PATCH /accounts/balances` (finance.controller.ts:119-122; service :793-814) has no caller in web, mobile or MCP, and the proxy does not allow it (WEB/services/api-proxy.server.ts:51-73). `snapshot_checkins` is read only by export and erasure.
- What is wrong: There is a second check-in writer with no If-Match check, and a table nobody reads.
- What the user experiences: Nothing today.
- Severity: wasteful but invisible.
- Root cause: The check-in moved to `PUT /snapshots/:month`.
- How to check: none (code only).
- Confidence: confirmed in code.

### CH-8 Month keys from the device clock
- Fact or figure: `summariseAccountBalance` uses `now.getMonth()` (accountRows.ts:79-80). `isFutureMonth` defaults to `currentMonth` and `currentYear`, worked out once when the module loads (WEB/utils/utils.ts:60-61). Those defaults are used by the Accounts container's snapshot input and by `AccountDetails` (WEB/containers/accounts/accountsContainer/AccountsContainer.tsx:65; WEB/components/accounts/AccountDetails/AccountDetails.tsx:35). History and the Dashboard use `londonMonth()`, as the backend does (BE/modules/snapshots/london-date.ts:7).
- What is wrong: Near midnight on the 1st (UTC server in summer, or a device abroad), or on a server process running across a month change, the current month's row can be treated as future or as last month's.
- What the user experiences: The Accounts change percentage or the account chart's current point can be wrong for that window. Server and browser renders may differ.
- Severity: wrong number shown (rare window).
- Root cause: Three clocks in use instead of one London helper.
- How to check: Set the device time zone to UTC−10 on the 1st of a month after a check-in. Compare the Accounts change and the account chart with History.
- Confidence: inferred, not confirmed.

### CH-9 MCP snapshot for the current month uses carried figures
- Fact or figure: `get_financial_snapshot` with `asOfMonth` equal to the current month takes the historical path with no saved balances (packages/mcp/src/tools/read/getFinancialSnapshot.ts:75, 196-201).
- What is wrong: It returns last recorded values and leaves out unrecorded accounts, unlike the call without `asOfMonth`.
- Severity: wrong number shown (AI output).
- How to check: none in the browser; with an MCP client, call the tool with and without the current month.
- Confidence: confirmed in code.

## Joint ownership and shares (JO)

### JO-1 Editing a joint savings account shrinks its stored balance
- Confirmed in a browser: yes, check B5 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
Fact or figure: stored balance of a joint Saving or Investment account.
What is wrong: the Savings page edit dialog is filled with the user's share and saves it back as the whole balance.
What the user experiences: after any edit on the Savings page (say, a new rate), the account drops to 40% of its real balance, and to 16% after a second edit; net worth, history (a current-month row is written) and every total fall with it.
Evidence: WEB/containers/savings/SavingsContainer.tsx:105-111 (balance replaced by `nominalBalance`, already shared, FE/portfolio.ts:226-229); SavingsAccountsList.tsx:156 (passes that row); AddSavingsAccountDialog.tsx:77 (fills from it), :102 (always sends `balance`); BE/modules/finance/account-intake.service.ts:759-773 (stores it and upserts history).
Severity: wrong number shown (and stored).
Root cause: a display copy of the row with the share applied is reused as the edit source.
How to check: homeowner. Accounts, edit "Easy access savings", Joint, share 40, save: row reads £3,040, "Joint, 40%". Savings, Edit "Easy access savings": balance field should read £7,600; bug shows £3,040. Change rate to 4.1 and save. Accounts row should still be £3,040; bug shows £1,216 (3,040 x 40%).
Confidence: confirmed in code.

### JO-2 Runway illustration applies the share twice
- Confirmed in a browser: yes, check B18 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
Fact or figure: "Accounts to draw on" amounts and the illustrated months of cover.
What is wrong: the Budget page passes rows whose balance is already shared but still carry ownership, and the runway builds a new snapshot that shares them again.
What the user experiences: a joint account shows at 16% of its balance in the list; switching it off or investments on moves the illustration by the wrong amount.
Evidence: WEB/containers/budget/BudgetContainer.tsx:204-211, :690; RunwayCalculator.tsx:139-144, :288-322, :387.
Severity: wrong number shown.
Root cause: share applied on display rows, then again by `PortfolioSnapshot`.
How to check: homeowner with "Easy access savings" joint at 40%. Budget, Breathing room reads 5.5 months (liquid 3,400 + 3,040 + 10,000 = 16,440 over essentials 2,675 + minimums 305 = 2,980). Open runway "Accounts and spending to include": Easy access should be £3,040; bug £1,216. Untick it: expected 13,400 / 2,980 = 4.5; bug (16,440 - 1,216) / 2,980 = 5.1.
Confidence: confirmed in code.

### JO-3 Dashboard savings widget shows the whole balance
- Confirmed in a browser: yes, check B4 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
Fact or figure: "Savings and investments" widget.
What is wrong: the loader adds raw `a.balance`, while the Savings page it links to shows the share.
What the user experiences: Dashboard and Savings page disagree by the other person's part.
Evidence: WEB/routes/_index.tsx:96-103, :251-256; SavingsWidget.tsx:26; compare SavingsContainer.tsx:118.
Severity: wrong number shown.
Root cause: local reduce instead of `PortfolioSnapshot`.
How to check: with Easy access joint at 40%, Dashboard widget should read £13,040 (3,040 + 10,000); bug £17,600. Savings page hero reads £13,040.
Confidence: confirmed in code.

### JO-4 Retirement spending target counts joint budget lines in full
Fact or figure: the budget-based retirement target and its line list.
What is wrong: `budgetTarget` copies amount and frequency but not ownership or share, and `resolveLineMonthlyAmount` calls `budgetRowMonthly` without them.
What the user experiences: a joint grocery line at 50% is £260 on Budget but £520 in the retirement target.
Evidence: FE/retirement-input.ts:215-231; FE/retirement.ts:260-271; WEB/features/retirement/components/RetirementPlanner/RetirementPlanner.tsx:802; MCP get_retirement_picture uses the same input.
Severity: wrong number shown.
Root cause: share fields dropped in the mapper.
How to check: Budget, edit "Groceries" £520, Joint 50%: essentials fall by £260. Retirement, budget target: line still "£520 / monthly" and target unchanged; expected £260.
Confidence: confirmed in code.

### JO-5 Mortgage figures differ between Dashboard, Accounts and the Mortgage page
- Confirmed in a browser: yes, check B14 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
Fact or figure: mortgage balance, home value, loan to value, payment.
What is wrong: Accounts row, Dashboard widget, net worth and retirement use the share; the Mortgage page uses the whole loan; nothing on the widget or page says which.
What the user experiences: "Mortgage balance £74,400" on Dashboard opens a page saying £186,000.
Evidence: WEB/routes/_index.tsx:118,271-276; MortgageWidget.tsx:20-24; MortgageContainer.tsx:257,564,616-622,638; jointMortgage.ts:3-8; research table E34:88 says "at my share".
Severity: wrong number shown (unlabelled mismatch).
Root cause: deliberate whole-loan page without a label, against the research table.
How to check: Accounts, Residential mortgage Joint 40%. Dashboard Mortgage balance £74,400; Mortgage page balance £186,000, LTV 60.0%, "Your equity" £49,600 "At your 40% share". Decide wording with the owner.
Confidence: confirmed in code.

### JO-6 Property follows its mortgage one way and only in narrow cases
Fact or figure: Property account ownership and share.
What is wrong: the copy runs only from a mortgage on joint create or share change, only with exactly one mortgage and one property of that kind; property edits never reach the mortgage; a home added later from Accounts is created sole; staged imports skip it.
What the user experiences: home and mortgage at different shares, so net worth counts e.g. 50% of the home against 40% of the loan.
Evidence: BE/modules/finance/account-intake.service.ts:303-327, :634-643, :774-782; AddEditAccountsDialog.tsx:285-289 (new account defaults sole); AccountsContainer.tsx:103-109 (add-property mode sets name and type only); BE/modules/imports/imports.service.ts:374-387. Mortgage page and add-mortgage paths do copy the share to a new home: MortgageContainer.tsx:458-471; routes/app.accounts._index.tsx:48-101.
Severity: wrong number shown.
Root cause: one-way rule with an ambiguity bail-out and no prompt.
How to check: mortgage Joint 40%: Home row turns "Joint, 40%" £124,000. Edit Home to 50%: mortgage stays 40%; net worth 155,000 - 74,400 for the pair; Mortgage page equity £80,600 "At your share of the home and of the mortgage".
Confidence: confirmed in code.

### JO-7 Buy-to-let share held in two places
Fact or figure: rental share in tax vs buy-to-let property in net worth.
What is wrong: Self Assessment, estimated tax and MCP tax use the profile share; net worth uses the account share; buy-to-let equity on the Mortgage page uses neither.
What the user experiences: setting a buy-to-let property joint at 50% halves it in net worth, but tax still taxes 100% of rent until the profile share is changed separately.
Evidence: TaxContainer.tsx:187-252; taxActions.server.ts:44-55; FE/picture/selectors/estimated-tax-due.ts (profile share); MCP getTaxYearPosition.ts:88-93; MortgageContainer.tsx:276-283.
Severity: user must enter something twice.
Root cause: legacy `property_ownership_share` never tied to account shares.
How to check: add Property "Buy to let flat" £200,000 Joint 50%: net worth +£100,000. Self Assessment ownership share still 100%.
Confidence: confirmed in code.

### JO-8 Saved housing cost has no share
Fact or figure: profile `monthlyHousingCost`.
What is wrong: a joint rent budget row counts at share, but the saved rent, the picture housing cost fallback and retirement housing use it whole.
What the user experiences: Budget housing row £750 with "Saved in your details: £1,500 a month" beside it.
Evidence: housing-cost.ts:68-90; HousingDetails.tsx:104-116; BudgetContainer.tsx:528-534; FE/retirement-input.ts:322,361.
Severity: wrong number shown.
Root cause: no share field on the profile value.
How to check: renter persona, Budget, mark the rent row joint 50%: row halves; housing line shows the whole saved rent.
Confidence: confirmed in code.

### JO-9 Account detail hero and chart on different bases
Fact or figure: account detail page.
What is wrong: hero is the share, chart is whole; with a future-dated row the hero becomes whole.
What the user experiences: "Current balance £3,040" above a chart ending at £7,600.
Evidence: AccountDetailContainer.tsx:109-114,147-151,208-212; AccountDetails.tsx:32,47.
Severity: wrong number shown.
Root cause: chart reads raw history.
How to check: open Easy access savings detail after JO-1 setup.
Confidence: confirmed in code.

### JO-10 Share shown without saying so, entered whole without saying so
Fact or figure: labels.
What is wrong: only the Accounts list says "Joint, 40%"; Savings rows, Debt rows, account detail, Dashboard widgets and MCP list_accounts show a share unlabelled; the account form "Balance", the check-in and the Debt minimum field do not say whole or share.
What the user experiences: unclear whether to type the whole balance; the Debt minimum shows £106 for a £265 payment and a typed £265 then shows £106.
Evidence: AccountsGroupList.tsx:181; AddEditAccountsDialog.tsx:686; AddDebtDialog.tsx:63-64,107-114; CheckInStep.tsx:167; listAccounts.ts:75; DebtAccountsList.tsx:100-115 (credit limit whole next to a share).
Severity: user must enter something twice.
Root cause: no shared "your share" label.
How to check: Car loan Joint 40%: Debt page row £3,360, minimum field £106, Dashboard minimums 106 + 40 = £146.
Confidence: confirmed in code.

### JO-11 Share input lacks subtype on some paths
Fact or figure: ISA test inside the share.
What is wrong: history series and MCP ranged reads pass name and type but not `accountSubtype`, so a legacy joint row can count joint on one path and sole on another.
What the user experiences: rare: history last point and net worth differ for a legacy joint ISA identified only by subtype.
Evidence: FE/check-in.ts:206-214; BE/modules/agent/agent-data.service.ts:187-201; FE/joint-share.ts:81-92.
Severity: wrong number shown (legacy rows only).
Root cause: inconsistent share input shape.
How to check: none practical; needs a legacy row.
Confidence: inferred, not confirmed.

### JO-12 Duplicate debt row check misses joint loans
Fact or figure: "possible duplicate" notice.
What is wrong: matching compares the account minimum at share with the budget row at its own share, so a joint loan with a sole budget row no longer matches.
What the user experiences: "Car loan payment" £265 and the £106 minimum both counted in commitments, no notice.
Evidence: FE/picture/selectors/duplicate-debt-rows.ts:52-75; commitments.ts:25-46.
Severity: wrong number shown.
Root cause: exact pence match across bases.
How to check: homeowner, Car loan joint 40%: the duplicate notice for "Car loan payment" should disappear (it shows when sole).
Confidence: inferred, not confirmed.

## AI tools, imports, export and reset (AI)

### AI-1 The AI context pack shows a salary, tax and allowances for a user who has saved no salary
- Fact or figure: salary, take-home, adjusted net income, the £100k band, Personal Savings Allowance, Self Assessment ledger in the pack.
- What is wrong: `userProfileToFinancialBaseline` fills an unsaved salary with £45,000 (and pension 5%/3%, cash £5,000, pension pot £15,000, outgoings £1,100, age 32). The pack prints and works from these values.
- What the user experiences: the downloaded pack says "Salary before tax: £45,000" and gives tax figures for it. The Dashboard says the salary is not set. An AI assistant reasons from figures the person never gave.
- Evidence: FE/profile.ts:11-36, 178-181, 244-256; FE/ai-context-pack.ts:239-243, 336-352, 531-542; apps/backend/src/modules/agent/agent-data.service.ts:336,360.
- Severity: wrong number shown.
- Root cause: the pack reads the old `FinancialBaseline` (filled with defaults) for tax, not `profileFacts` (no defaults), which it already holds.
- How to check: a pack test with a profile whose salary, pension rate, birth year and housing cost are null. Expect no salary line, no tax figures, and no default figures in `pack.baseline`.
- Confidence: confirmed in code.

### AI-2 get_tax_year_position and project_net_worth use the invented £45,000 salary
- Fact or figure: estimated tax, Self Assessment amount, monthly pension contribution in the projection.
- What is wrong: both read `baseline.annualGrossSalary`, which is £45,000 when nothing is saved. The tax tool's "no salary saved" check only fires at 0, so it never fires.
- What the user experiences: the AI quotes a Self Assessment bill for rental income as if it sat on top of a £45,000 salary. project_net_worth adds £187.50 a month of pension contributions labelled "from profile".
- Evidence: MCP/read/getTaxYearPosition.ts:85-93, 120-127; MCP/simulate/projectNetWorth.ts:171-181.
- Severity: wrong number shown.
- Root cause: the same as AI-1.
- How to check: an MCP test with a null salary. Expect payeSalaryGbp 0 (or unknown) with an annualSalary entry in missing[], and no pension contribution in the projection.
- Confidence: confirmed in code.

### AI-3 The pack always uses 2025/26 tax rules
- Confirmed in a browser: yes, check B16 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: the pack's take-home, allowances and Self Assessment ledger, and its heading "Tax, 2025/26".
- What is wrong: `DEFAULT_FINANCIAL_BASELINE.taxYear` is "2025/26" and the mapper never replaces it, so `safeBaseline.taxYear || getCurrentUKTaxYear()` never reaches the current year.
- What the user experiences: in November 2026 the pack reports last year's thresholds and ledger beside a Self Assessment page set to 2026/27.
- Evidence: FE/profile.ts:14, 211-274; FE/ai-context-pack.ts:342, 348, 406.
- Severity: wrong number shown.
- Root cause: a fixed default year in the baseline.
- How to check: build a pack with fake timers set to 2026-11. Expect currentTaxYear "2026/27".
- Confidence: confirmed in code.

### AI-4 get_financial_snapshot's left over and breathing room do not match the Dashboard
- Fact or figure: monthlySurplusAfterStoredMinimumsGbp, monthlyEssentialSpendGbp, emergencyRunwayMonths.
- What is wrong: the tool takes stored minimums off on top of any debt budget rows. It divides cash by budget essentials only, where the page uses essentials without debt plus the larger of account minimums and debt rows, and leaves savings rows out.
- What the user experiences: the AI says "5.0 months" and "£800 left over" while the Dashboard says 4.6 months and £900 (worked examples in section 2).
- Evidence: MCP/read/getFinancialSnapshot.ts:97-121; MCP/read/common.ts:224-258; FE/picture/selectors/commitments.ts:32-56; FE/picture/selectors/months-of-cover.ts:31-46; apps/web/app/routes/_index.tsx:234-249.
- Severity: wrong number shown.
- Root cause: the read tools re-implement budget arithmetic instead of building `buildFinancialPicture` (the pack already does, ai-context-pack.ts:315). The consistency test checks only net worth for this tool (packages/mcp/src/__tests__/consistency.test.ts:166).
- How to check: extend the consistency test so that snapshot surplus and runway equal `picture.budget.surplus` and `picture.monthsOfCover.months`, with a persona that has a debt budget row, a stored minimum and a savings row marked essential.
- Confidence: confirmed in code.

### AI-5 The pack's debt-free date adds £50 a month without saying so
- Fact or figure: debt-free date and total interest (avalanche and snowball) in the pack, and the observations.
- What is wrong: `compareAvalancheAndSnowball(debtItems, 50)` and `calculateDebtSchedule(..., 50, ...)` include £50 extra. The pages use 0 and show no date when an APR is unknown.
- What the user experiences: the pack gives a date years earlier than the Debt page and Dashboard.
- Evidence: FE/ai-context-pack.ts:279, 283, 504-505; apps/web/app/containers/debt/DebtContainer.tsx:75; apps/web/app/utils/debtSummary.ts:32-46.
- Severity: wrong number shown.
- Root cause: a hard-coded extra payment.
- How to check: assert the pack's avalanche date equals `buildDebtSummary(snapshot).debtFreeDate` for a persona with debts.
- Confidence: confirmed in code.

### AI-6 The pack's balance history can end months before today
- Fact or figure: `portfolio.monthlyHistory`.
- What is wrong: `getMonthlyHistory` ends at the last recorded month, skips accounts with no history rows, and never uses today's saved balance. History and get_balance_history do all of these.
- What the user experiences: an AI reading the pack sees a latest point (say March) that differs from net worth today and from the History page.
- Evidence: FE/portfolio.ts:461-520; FE/check-in.ts:199-222; FE/ai-context-pack.ts:376.
- Severity: wrong number shown.
- Root cause: two engine series functions.
- How to check: assert that the pack's last history point equals `picture.netWorth.netWorth` when the series reaches the current month.
- Confidence: confirmed in code.

### AI-7 Other invented or proxy figures in the pack
- Fact or figure: the student loan outcome; the average savings rate.
- What is wrong: the student loan evaluation uses a fixed £15,000 balance, not the saved Student Loan account. The savings rate defaults to 5% with no savings and counts investments and unrated accounts.
- What the user experiences: "Projected outcome" for a loan that is not theirs; "Average savings rate: 5% AER" with no savings.
- Evidence: FE/ai-context-pack.ts:288-293, 375, 490; FE/portfolio.ts:380-391.
- Severity: wrong number shown.
- Root cause: placeholder inputs.
- How to check: a pack test with no savings expects no rate line, and with a student loan account expects its balance to be used.
- Confidence: confirmed in code.

### AI-8 project_net_worth ignores the net worth choices and the home-value rule
- Fact or figure: startingNetWorthGbp and the projection.
- What is wrong: it starts from cash + investments + pensions + max(0, all property − all mortgages) − consumer debt, whatever the user chose about the home and the student loan.
- What the user experiences: with "don't count the home" (home £300k, mortgage £200k, cash £10k) the Dashboard shows £10k and the AI starts from £110k.
- Evidence: MCP/simulate/projectNetWorth.ts:184, 196-203, 223.
- Severity: wrong number shown.
- Root cause: local equity arithmetic; the basis is not passed.
- How to check: assert startingNetWorthGbp equals `picture.netWorth.netWorth` for each basis, or report the difference in notes.
- Confidence: confirmed in code (forecast start inferred from its inputs).

### AI-9 Imported accounts skip rules the account form applies
- Fact or figure: accounts created by an import commit.
- What is wrong: commit inserts `Account` rows directly, so they are always sole owner. Nothing can set a subtype (so buy-to-let is decided by name only), a student loan plan, a credit limit or a 0% end date. No home is paired with a mortgage, and no audit event is written.
- What the user experiences: an imported joint account counts at 100% until edited. An imported buy-to-let mortgage without "BTL" in its name counts in home equity and loan to value. An imported mortgage with no Property shows the "home value missing" note.
- Evidence: apps/backend/src/modules/imports/imports.service.ts:366-403; packages/mcp/src/tools/write/stageImport.ts:44-58; apps/backend/src/modules/finance/account-intake.service.ts:596-644; FE/picture/selectors/loan-to-value.ts:31-38.
- Same in both paths: the sign rule (`storedBalance`, imports.service.ts:380 and import-helpers.ts:139); currency GBP.
- Import is stronger: it writes history rows through the shared `writeSnapshotRows`, which moves the balance for the current month (apps/backend/src/modules/snapshots/snapshot-write.ts:51-71). The form's `createAccount` writes no current-month row.
- Not compared: numeric limits on the form DTO against the stage schema (interest 0-100, term 1-600).
- Idempotency: commit and revert are guarded by batch status and a user lock (imports.service.ts:350-354, 507-512). That is sound.
- Severity: user must enter something twice (joint share and subtype after import). Imports are owner-only during rollout (ImportsAccessGuard, imports.controller.ts:31), so few users are affected today.
- Root cause: a second create path.
- How to check: an import commit test that runs the new accounts through `AccountIntakeService` rules, or a staged `ownership`/`accountSubtype` field.
- Confidence: confirmed in code.

### AI-10 Import revert deletes accounts outside the delete path
- Fact or figure: accounts created by a reverted batch.
- What is wrong: raw SQL removes them with no `account.deleted` audit event.
- What revert restores, and what it can leave: it restores only cells still stamped by the batch with the value written, and puts back prior values with their source. It moves a current-month balance back only if the balance is unchanged. Accounts with any remaining row stay. The balance column and history stay consistent, because a later form edit or check-in takes the row out of the batch's ownership (account-intake.service.ts:676-679).
- What the user experiences: nothing visible. The audit trail misses the deletion.
- Evidence: apps/backend/src/modules/imports/imports.service.ts:505-620; apps/backend/src/modules/finance/account-intake.service.ts:822-840.
- Severity: wasteful but invisible.
- Root cause: bulk delete for speed.
- How to check: revert test expects an audit event per deleted account.
- Confidence: confirmed in code.

### AI-11 A financial reset leaves browser stores in place
- Fact or figure: localStorage `flump_financial_baseline_v2` (and legacy keys), the seed cookie, `RUNWAY_STORAGE_KEY`, `flump_setup_checklist_dismissed`, sessionStorage kept debt rows.
- What is wrong: `resetFinancialData` (web) only posts and sets the profile. `clearUserStorage` runs on sign-out, erasure notice and sign in again, never on reset.
- What the user experiences: after a reset the setup checklist stays dismissed though its steps were cleared. The Pension page still reads the £100k-notice region from the old browser baseline (`getKnownTrapRegion(baseline)`), so a region from before the reset can show. Salary and share do not come back, because the profile row still exists and `salaryProfileFirst` / `propertyShareProfileFirst` ignore the baseline then. The seed cookie is normally already cleared on hydration or finishing onboarding.
- Evidence: apps/web/app/hooks/useUserProfile.ts:391-407; apps/web/app/features/settings/components/DataTab/DataTab.tsx:60-73; apps/web/app/utils/userStorage.ts:9-27; apps/web/app/utils/profileFirst.ts:29-50; apps/web/app/containers/pension/PensionContainer.tsx:69, 246; apps/web/app/state/baseline.store.ts:117-168.
- Severity: stale until reload (until sign-out, in fact).
- Root cause: reset is not wired to `clearUserStorage`.
- How to check: a DataTab test that USER_STORAGE_KEYS are empty after a successful reset.
- Confidence: confirmed in code (region resurfacing inferred, not confirmed).

### AI-12 Reset stores pension 0% and net pay as answers
- Fact or figure: pensionPercent, pensionEmployerPercent, isSalarySacrifice after a reset.
- What is wrong: `clearFinancialProfileFields` writes 0, 0 and false, not "not set". `profileFactsFromProfile` reads these as the user's answers.
- What the user experiences: if only the salary is re-entered, take-home is shown as if they had chosen no pension contribution.
- Evidence: apps/backend/src/modules/profile/profile-view.ts:255-258; FE/picture/input.ts:105-135; FE/picture/selectors/take-home.ts:39-43.
- Severity: wrong number shown.
- Root cause: the columns are NOT NULL with no "unanswered" state.
- How to check: after a reset, `selectTakeHome` with a salary only should be unknown (pensionPercent missing).
- Confidence: inferred, not confirmed (onboarding may ask again before any page shows take-home).

Reset leaves these profile fields: names, avatar, currency, country, enabled pages, dashboard widgets and config, checkInDay, net worth choices and lastActiveAt. All are preferences or identity, and leaving them is by design (profile-view.ts:236-239). Export covers every profile column (user-data-registry.ts:455-507). The export holds stored rows only, with no derived figures.

## Browser state (CS)

### CS-1 Mortgage page re-reads old figures after a save, and can save them back
- Fact or figure: residential mortgage balance, rate and term on the Mortgage page.
- What is wrong: after saving a mortgage without changing the home value, the page keeps the save only in an overlay, but choosing the account again (or switching to Buy to let and back) reloads balance, rate and term from the loader rows taken before the save.
- What the user experiences: the old rate, term and balance reappear in the summary and in the edit form; if they then save the form (say to add a fixed-rate end date), the old rate and term are sent and overwrite what they saved a moment ago, with no conflict, because the If-Match comes from the patched row.
- Evidence: MortgageContainer.tsx:409-418 (overlay only), :480 (revalidate only when `propertySaved`), :613-626 `accountFigures` uses `accounts`/`accountDetails` not `pictureAccounts`, :636-658 effect uses loader rows, :662-679 `selectAccount`, :686-697 `switchToCategory`, :392-393 rate and term always sent when above 0, :408-413 version from patched row.
- Severity: wrong number shown (and a saved value can be silently reverted).
- Root cause: two copies of account rows on the page (loader and `accountPatches`); the selection code reads the wrong one; no revalidation after an account-only save.
- How to check: persona with one residential mortgage account (rate 5.00%, 300 months). Open /app/mortgage, Edit, set rate 4.50%, Save. Switch to Buy to let, then back to Residential (or Edit and choose the account in the picker). Expect 4.50%; code says 5.00%. Then set a fixed-rate end date and Save; reload; check the stored rate.
- Confidence: confirmed in code (the revert step is inferred from the body-building code at :384-404).

### CS-2 Setup checklist hydration mismatch
- Fact or figure: the setup checklist on the dashboard.
- What is wrong: `useState(readDismissed)` reads localStorage during the first client render; the server cannot, so it renders the checklist and the client renders nothing.
- What the user experiences: for someone who dismissed the checklist, it appears in the server HTML and vanishes on hydration (layout jump); React logs a hydration error and may re-render the whole tree on the client.
- Evidence: SetupChecklist.tsx:68-74 (window access inside try returns false on the server), :151, :185; HomeDashboard.tsx:358-360.
- Severity: stale until reload (a flash on every full load).
- Root cause: storage read in a state initialiser instead of an effect (Budget does it right, BudgetContainer.tsx:358-362).
- How to check: any persona with incomplete steps; dismiss the checklist; hard-reload /app with the console open and a slow CPU; look for a hydration warning and the checklist flashing.
- Confidence: confirmed in code.

### CS-3 Reset leaves user data in the browser
- Fact or figure: `flump_financial_baseline_v2` (salary, region, age, housing, from calculator seeds), `flump_setup_checklist_dismissed`, onboarding seed cookie and localStorage.
- What is wrong: "Delete all financial data" clears the server and the atom but calls no `clearUserStorage`.
- What the user experiences: after reset the server clears completed checklist steps (backend profile-view.ts:272) but the dismissal flag keeps the checklist hidden while they set up again; the stored baseline still holds the earlier salary and region and is loaded on every full page load until the profile effect replaces it.
- Evidence: DataTab.tsx:60-74; useUserProfile.ts:391-407; userStorage.ts:9-27 (callers only logout watcher, SignInAgainButton.tsx:37, AccountDeletedNotice.tsx:33); baseline.store.ts:117-130.
- Severity: stale until reload (checklist: until storage is cleared by sign-out).
- Root cause: reset path not wired to the storage clear list.
- How to check: persona that dismissed the checklist; Settings, Your data, delete all financial data, finish onboarding, open /app: expect the checklist; code says hidden. In devtools, check localStorage still holds the two keys.
- Confidence: confirmed in code.

### CS-4 Navigation shows default pages until hydration effects run
- Fact or figure: nav links (enabled pages).
- What is wrong: Header and mobile drawer read `userProfileAtom`, which is `DEFAULT_PROFILE` on the server and on the first client render; the user's own pages appear only after `root.tsx` seeds the atom in an effect.
- What the user experiences: on a full load, Accounts, Budget, Debt, Savings, Pension and Mortgage show; then the bar changes to the user's choice (e.g. Debt disappears, Self Assessment or Retirement appears).
- Evidence: Header.tsx:31,48; MobileNavDrawer.tsx:76,84; useUserProfile.ts:128,262; root.tsx:209-216.
- Severity: stale until reload (a flash on every full load).
- Root cause: chrome reads the atom rather than the root loader's `userProfile` via `seededProfile`.
- How to check: persona with enabledPages = accounts, budget, tax, retirement; hard-reload /app with CPU throttling; watch the nav.
- Confidence: confirmed in code.

### CS-5 Page-level atom seeding can roll back a newer profile
- Fact or figure: the atom's `updatedAt`, used as If-Match.
- What is wrong: six containers call `setProfile(loaderProfile)` with no version check, unlike root which refuses an older version.
- What the user experiences: if they press Save in Settings and click to Pension before the save answers, the Pension loader may return the pre-save profile; its effect then overwrites the newer atom. Pension shows the old salary or rates, and the next profile save anywhere gets a "changed somewhere else" toast and must be repeated.
- Evidence: PensionContainer.tsx:71-75; BudgetContainer.tsx:122-124; SavingsContainer.tsx:72-74; TakeHomeContainer.tsx:19-21; MortgageContainer.tsx:153-156; routes/app.profile.tsx:78-80; contrast root.tsx:211-214; seededProfile prefers the atom on matching id, profileFirst.ts:56-62.
- Severity: user must enter something twice (and wrong number shown until reload).
- Root cause: the version guard lives only in root.
- How to check: throttle network to Slow 3G; Settings, change salary, Save and immediately click Pension; then change pension rates on Pension and Save; watch for the conflict toast and the salary shown.
- Confidence: inferred, not confirmed (race).

### CS-6 Checklist step written on every page visit
- Fact or figure: `setupChecklistCompletedSteps`.
- What is wrong: Pension and Savings mark their step in an effect on every mount when pots exist, even if already complete.
- What the user experiences: nothing visible; one extra PATCH per visit (TypeORM probably skips an unchanged update, so the version may not move; not confirmed).
- Evidence: PensionContainer.tsx:203-207; SavingsContainer.tsx:113-115; backend user-profile.service.ts:466-482.
- Severity: wasteful but invisible.
- Root cause: no check of `completedSteps` before writing.
- How to check: open Pension twice with the network tab; count PATCH /api/user-profile/checklist.
- Confidence: confirmed in code (version effect inferred).

### CS-7 Pension tax-trap region read from the browser baseline
- Fact or figure: region used for the £100,000 note.
- What is wrong: the region comes from `financialBaselineAtom`, which on the first client render is whatever localStorage holds (possibly a calculator seed), while the server uses the no-salary baseline.
- What the user experiences: for a salary in the trap band with an old seeded baseline, the note's figures can differ between server HTML and the hydrated page for one render; after effects it matches the profile region.
- Evidence: PensionContainer.tsx:242-254; utils/taxTrapCopy.ts:49-55; baseline.store.ts:117-130; useUserProfile.ts:324.
- Severity: stale until reload (one-render flash).
- Root cause: region not taken from the saved profile like salary.
- How to check: Scottish persona, salary £105,000; first run a marketing calculator with England; hard-reload /app/pension; watch the note.
- Confidence: inferred, not confirmed.

### CS-8 Mortgage overlay can mask a newer server row (multi-tab)
- Fact or figure: mortgage balance and version on the Mortgage page.
- What is wrong: `accountPatches` (including `updatedAt`) is laid over fresh loader rows until the page unmounts.
- What the user experiences: after a save here and a change in another tab, a later revalidation still shows this tab's older figures; the next save gets 412 and drops the overlay.
- Evidence: MortgageContainer.tsx:212-220, 497-500, 514-520.
- Severity: user must enter something twice.
- Confidence: inferred, not confirmed.

## Database (DB)

### DB-1 Buy-to-let facts live twice, and the Mortgage page reads the profile copy
- Confirmed in a browser: yes, check B3 in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md).
- Fact or figure: BTL property value, mortgage balance, rate, type, rent, count.
- What is wrong: the Mortgage page's buy-to-let tab reads and writes seven profile columns while net worth, tax sources and check-in use BTL Property and Mortgage accounts.
- What the user experiences: a BTL mortgage updated in the check-in still shows the old (or empty) balance and loan to value on the BTL tab; "1 property" shows with two BTL properties; rent and count have no editor ("Configure" goes to a profile page that has no BTL fields).
- Evidence: MortgageContainer.tsx:263,366-374,571,603-608,687-691,719,1103; BtlOverview.tsx:50-52; no writer of buyToLetCount/hasBuyToLet/buyToLetMonthlyRental in web, backend or mcp.
- Severity: wrong number shown.
- Root cause: legacy profile form kept after BTL accounts arrived.
- Recommendation: read BTL figures from accounts (subtype `btl_mortgage`, see DB-6) and rent from rental tax_records; then stop writing the profile columns; drop them a release later. Rollback: columns kept until the drop, readers switch back by revert.
- Confidence: confirmed in code.

### DB-2 Income inputs with no writer still feed figures
- Fact or figure: second_income_monthly, rental_income_monthly, has_* flags.
- What is wrong: no screen, endpoint client or MCP tool writes them any more, yet the PSA band and side income read them, and the two readers disagree about the flag.
- What the user experiences: a user with old values gets a personal savings allowance band from income they cannot see or change; nothing visible for new users.
- Evidence: fe/picture/selectors/psa-band.ts:23-24 (respects flag); fe/profile.ts:229 (ignores flag); git log -S shows the last web writer removed by 13-14 Nov.
- Severity: wrong number shown (legacy users only).
- Root cause: form removed, columns and readers left.
- Recommendation: derive these from tax_records (source rental/self-employed) or budget income rows; null the columns in a backfill only after readers switch; drop later. Rollback: keep a copy table for 90 days, as liability_sign_backfill did.
- Confidence: confirmed in code (effect on live users inferred; depends on legacy data).

### DB-3 Onboarding writes the same three facts to profile and budget
- Fact or figure: take-home pay, housing cost, other outgoings.
- What is wrong: onboarding saves each to a profile column and to a budget row, and nothing keeps them equal afterwards (the housing sync was removed in 986fd6286).
- What the user experiences: editing the budget rent row leaves retirement and the AI using the onboarding figure; other outgoings can never be edited after onboarding.
- Evidence: useFinishOnboarding.ts:90,95-97; onboarding-seed.ts:75-80; fe/retirement-input.ts:361; fe/profile.ts:231-243; mcp-input.ts.
- Severity: user must enter something twice.
- Root cause: profile was the first budget; budget rows came later.
- Recommendation: budget rows are the truth (they are editable and itemised). Add a `role` column to budget_entries (`take_home`, `housing`, `living`) additively, backfill from names and onboarding names, switch readers to sum by role, then drop the three profile columns. Rollback: role column is additive; readers revert.
- Confidence: confirmed in code.

### DB-4 Pension 5% / 3% and salary sacrifice are stored defaults that look like choices
- Fact or figure: pension_percent, pension_employer_percent, is_salary_sacrifice.
- What is wrong: NOT NULL defaults are written when the row is created, so the app guesses "assumed" from the exact pair 5/3 and needs `has_reset_financial_data` to tell a reset from a default.
- What the user experiences: someone who really pays 5% and gets 3% is shown "Not set" for method and rates; nothing else visible.
- Evidence: Baseline migration (`pension_percent numeric(5,2) NOT NULL DEFAULT 5`); user-profile.service.ts:148-150; PensionContainer.tsx:124-140; fe/picture/input.ts:91-112; profile-view.ts:149-173 (null branches unreachable); SalarySacrificeDefaultFalse1794357400000.ts:3-5 (old rows not backfilled, owner decision).
- Severity: wrong number shown (rare, real users at auto-enrolment minimums).
- Root cause: defaults in the schema instead of null for "not answered".
- Recommendation: make the three columns nullable with no default; backfill null where the row still has 5/3 and updated_at equals created_at (or onboarding never touched them); then drop has_reset_financial_data and the pair heuristic. Needs an owner decision for the backfill (same as the earlier sacrifice ruling). Rollback: re-add defaults; nulls read as "not set" already.
- Confidence: confirmed in code.

### DB-5 Null profile salary becomes £45,000 for the AI
- Fact or figure: annual_salary null.
- What is wrong: the MCP tax tool takes salary from the engine baseline, which fills a null salary with 45,000 (and cash 5,000, pot 15,000 from columns that do not exist).
- What the user experiences: an AI answer about the tax year can be based on an invented salary; the web patches this (useUserProfile.ts:276-284), MCP does not.
- Evidence: fe/profile.ts:17,178-181; be/modules/agent/agent-data.service.ts:204-207; packages/mcp/src/tools/read/getTaxYearPosition.ts:85-87.
- Severity: wrong number shown.
- Root cause: baseline defaults for seeds reused as data.
- Recommendation: have getBaseline use profileFactsFromProfile (never invents) or apply the web's zero-salary rule. Not a schema change. Confidence: confirmed in code.

### DB-6 Accounts typing: one wide table, three meanings, BTL by name
- Fact or figure: accounts.type, monthly_contribution, buy-to-let property identity.
- What is wrong: `type` has no CHECK; monthly_contribution means saving (Saving/ISA), pot contribution (Pension) and payment (Mortgage, debts); a Property is buy-to-let only if its name matches /buy to let|btl/.
- What the user experiences: renaming "BTL flat" to "Flat 2" moves it into the residential home and loan to value; nothing else visible.
- Evidence: be/entities/account.entity.ts:8-18 (checks), :73-80; fe/picture/selectors/loan-to-value.ts:22-38; packages/api-contract/src/domains/accounts.ts:58 (subtypes for Mortgage only); fe/retirement-input.ts:158,198.
- Severity: wrong number shown (rename case).
- Root cause: subtypes added for mortgages only.
- Recommendation: add Property subtypes (`residential_property`, `btl_property`), backfill from the name regex, then make the selector ignore the name. Add `CHECK (type IN (...))` NOT VALID, then VALIDATE. Leave one wide table (11 types, few nullable columns, cheap); document monthly_contribution per type in the entity rather than splitting. Rollback: drop the check; subtypes are additive.
- Confidence: confirmed in code.

### DB-7 Student loan plan held on profile and on the account
- What is wrong: take-home deductions read profile.student_loan_plans, the debt payoff reads accounts.student_loan_plan, and neither updates the other.
- What the user experiences: adding a Plan 2 loan account does not change take-home; must be told twice.
- Evidence: be/modules/finance/account-intake.service.ts:441-446; user-profile.service.ts (studentLoanPlans); fe/debt-payoff.ts:63; fe/picture/input.ts:125-127.
- Severity: user must enter something twice.
- Recommendation: the profile list is the tax fact (a plan exists even with no balance tracked); on account create/edit with a plan, add it to the profile list in the same transaction, or derive the list as union of both at read. No migration needed for the union. Confidence: confirmed in code.

### DB-8 Two ownership shares for rental property
- What is wrong: tax uses profile.property_ownership_share, net worth uses the BTL Property account's share_percent (E34).
- What the user experiences: a 50% joint BTL flat can be taxed at 100% of rent if the Tax page share was never set.
- Evidence: TaxContainer.tsx:187-246; estimated-tax-due.ts:78-82; account-intake.service.ts:303-335.
- Severity: wrong number shown (inferred when the two differ).
- Recommendation: default the Tax page share from the single BTL Property's share when the profile value is the untouched default; long term move share onto a property/income-source link (DB-14 step 5). Confidence: confirmed both stores; disagreement inferred.

### DB-9 Dead and write-only profile columns
- Columns: display_name, currency, country, savings_default_interest_rate, monthly_savings_target, savings_allocation_mode, dashboard_widget_order, dashboard_widget_sizes, dashboard_widget_config, has_buy_to_let, buy_to_let_count.
- What is wrong: no reader feeds a screen or figure (or no writer exists).
- What the user experiences: nothing visible; the export carries meaningless defaults.
- Evidence: section 2; app.savings.tsx:95 dead intent.
- Severity: wasteful but invisible.
- Recommendation: stop exposing in the contract (mark deprecated, keep accepting writes for one release), remove readers/types, then drop columns in one migration; down() re-adds with the old defaults. Update user-data-registry export lists in the same PR. Confidence: confirmed in code.

### DB-10 transactions and snapshot_checkins are dead stores
- Review note: `apps/mobile-companion` calls `GET /transactions` (`apps/mobile-companion/src/api/client.ts:352`) and reads `displayName`. That app is parked until the E12 rebuild, so "no client" means no client in the web app or the AI tools.
- What is wrong: transactions has POST/GET endpoints and an unused `AgentDataService.queryTransactions`, but no web, MCP or bank-sync caller; snapshot_checkins is inserted on check-in and read only by the export.
- What the user experiences: nothing visible.
- Evidence: be/modules/finance/finance.controller.ts:152-174; finance.service.ts:136-198; agent-data.service.ts:395-417 (no caller in packages/mcp); snapshots.service.ts:166; user-data-registry.ts:113.
- Severity: wasteful but invisible.
- Recommendation: transactions: remove the two routes (owner decision round 10 defers sync; recreate with sync); keep the table until bank sync design decides, or drop with a pg_dump. snapshot_checkins: either read it for "check-in done this month" or drop. Confidence: confirmed in code.

### DB-11 Avatar image in the profile row is sent twice per page
- Fact or figure: avatar_url up to 262 KB data URL.
- What is wrong: every GET /user-profile returns it, and a full page load calls GET /user-profile twice (root loader and workspace loader), plus every PATCH response.
- What the user experiences: slower loads for users with a picture; otherwise nothing.
- Evidence: api-contract profile.ts:10-17; web/root.tsx:63; web/services/backend-client.server.ts:404; ProfileTab.tsx:173 (512 px).
- Severity: wasteful but invisible.
- Recommendation: move to `user_avatars(user_id PK, mime, data bytea)` served by `GET /user-profile/avatar` with caching; return only a URL/version in the profile. Additive table, backfill, switch, drop column. Rollback: keep the column until the drop.
- Confidence: confirmed in code (size of real avatars not measured).

### DB-12 Per-row writes and repeated full reads
- What is wrong (ranked by likely cost):
  1. Every page loader fetches all accounts with all history (`/accounts` page size 500, details joined) even on pages that need only the profile (take-home), and refetches after every action. account-intake.service.ts:508-525; backend-client.server.ts:401-404; routes/app.take-home.tsx:10.
  2. MCP context reads all history twice: getAccounts (accounts + details) then getAccountDetails (accounts + details). agent-data.service.ts:337-339. Per MCP call.
  3. Profile read twice per full load (root + workspace), each a SELECT of a wide row (with avatar). root.tsx:63.
  4. Snapshot write updates accounts.balance one row at a time. be/modules/snapshots/snapshot-write.ts:66-70 (also import commit). Already tracked in backend-2026-11 L13, open for this path.
  5. PATCH /accounts/balances does save + upsert per account (no web caller now). account-intake.service.ts:806-812.
  6. GET /portfolio-snapshot loads all accounts and history but has no caller. backend-client.server.ts:411 (flag never set).
- Severity: wasteful but invisible.
- Recommendation: 1) let loaders request `/accounts?details=latest` or a months window, and drop the accounts call from profile-only routes; 2) build details from the getAccounts result; 3) pass the root profile down instead of refetching; 4) one `UPDATE accounts SET balance = v.value FROM (VALUES ...)`; 5/6) delete the unused routes.
- Confidence: confirmed in code; costs not measured here (query counts are in BROWSER-EVIDENCE.md).

### DB-13 balance vs latest history row
- What is wrong: accounts.balance is "now" (engine D22, fe/portfolio.ts:223-229) and the current-month account_details row is history; createAccount writes no row and bank sync can keep a manual value, so this month's chart point can differ from the headline.
- What the user experiences: possibly a chart's last point not matching the balance until the next check-in (inferred).
- Evidence: account-intake.service.ts:596-648 (no detail row); snapshot-write.ts:64-70; fe/portfolio.ts:223.
- Severity: stale until reload (inferred).
- Recommendation: keep balance as the truth; add a nightly integrity count (like integrity/account-orphans.ts) of current-month rows whose value differs from balance, and write the row on create. Confidence: inferred, not confirmed.

### DB-14 account_details.user_id has no database guard
- What is wrong: user_id is copied from the account, but nothing stops a row whose user_id differs from accounts.user_id; agent reads trust d.user_id with a join to a.user_id.
- Evidence: EvolveAccountDetailsForSnapshots1794356100000.ts:56-68; agent-data.service.ts:152-154; integrity/account-orphans.ts:58 (one-off check).
- Severity: wasteful but invisible (no wrong writer found).
- Recommendation: add `UNIQUE(id, user_id)` on accounts and a composite FK `(account_id, user_id) REFERENCES accounts(id, user_id)` NOT VALID, then VALIDATE. Rollback: drop constraint. Confidence: confirmed absent; risk inferred.

### DB-15 Budget flags that never vary
- What is wrong: is_primary_income is server-owned and always false (seeds and createEntry), yet web filters on it; is_default rows come only from POST /budget-entries/seed-defaults, which no client calls.
- Evidence: be/modules/budget/budget.service.ts:57-187,324; BudgetContainer.tsx:73-80; RunwayCalculator.tsx:156; routes/_index.tsx:197.
- Severity: wasteful but invisible.
- Recommendation: drop is_primary_income (or use it as DB-3's `role = take_home`); remove seed-defaults and DEFAULT_BUDGET_SEEDS; drop is_default after. Confidence: confirmed in code.

### DB-16 Tax "sources" are buckets, not sources
- What is wrong: sources are grouped by the fixed `source` value (rental, paye, self-employed, savings); there is no source id, so two rental properties or two employers cannot be told apart, and type/source are only checked by the API contract, not the DB.
- Evidence: TaxIncomeSectionCard.tsx:55; fe/tax-calculator.ts:467-476; packages/api-contract/src/domains/tax.ts:16-18.
- Severity: wasteful but invisible today; blocks per-property tax.
- Recommendation: later, an `income_sources(id, user_id, kind, name, account_id NULL, share_percent)` table with tax_records.source_id NULL, backfilled one source per (user, source). Add CHECKs on type/source NOT VALID. Confidence: confirmed in code.

### DB-17 Leftovers
- liability_sign_backfill: rows go at 90 days, the empty table stays and down() then restores nothing (be/jobs/retention.ts:88-94). Drop it in a migration after the window.
- Retention depends on the unprovisioned cron (already tracked in backend-2026-11 H12/M-PRIV2, partly closed).
- No index on import_batches(user_id, created_at) for BATCH_ORDER (imports.service.ts:66-72); tiny tables, low.
- Down() quality: data migrations are honest no-ops with comments (RemoveSeededExampleData, DeleteSyncedTransactions, ClearBankTokens, EncryptTaxReceipts, BackfillAnnualTaxRecordEndDate); TaxRecordAprilEndDate down() reverses exactly. Acceptable.

## Recommended order (normalise, merge, drop)
1. DB-5 and DB-1 readers (wrong numbers, no schema change first).
2. DB-9 and DB-15 drops (deprecate one release, then one migration).
3. DB-4 nullable pension facts (owner decision on backfill).
4. DB-3 budget `role` column, switch readers, drop profile take-home/housing/outgoings.
5. DB-6 Property subtypes + type CHECK; DB-14 composite FK.
6. DB-2 and DB-8 via income sources (DB-16), then drop second/rental income columns and property_ownership_share.
7. DB-11 avatar table; DB-10 transactions routes and table.
Each: additive first, backfill, switch readers, drop a release later, keep a before-image table for data rewrites.

# What is sound and should be left alone

### Home, mortgage, buy to let and housing

- Mortgage page residential writes go to the account (balance with history row, rate, term, fix end, payment); fix end has one store read by Mortgage, check-in and MCP.
- addHomeForMortgage: idempotency keys per part, retry detection by label and value, mortgage never rolled back, honest notices (app.accounts._index.tsx:48-103,124-136).
- Mortgage page home write re-checks the backend before POSTing, so a second tab does not create a second home (MortgageContainer.tsx:447-458); double-click guard (:322-323).
- selectLoanToValue and estimateHomeEquity read saved rows only, return unknown not 0, and keep whole-vs-share explicit.
- Retirement excludes housing budget rows (retirement.ts:250) so housing is not counted twice there.
- Safe to spend and cover cannot double count housing: they never read the profile or mortgage account (they can miss it, see HM-1).

### Profile, pay, pension and retirement

- `salaryProfileFirst`/`propertyShareProfileFirst` and `seededProfile` (profileFirst.ts): the saved profile wins once a row exists; no 5%/3% first paint on Pension and Take-home containers.
- One take-home selector (`selectTakeHome`) for dashboard, Take-home and safe to spend; the remaining split is in the inputs (PP-2, PP-4).
- Profile write queue with If-Match and 412 reload (useUserProfile.ts:309-357).
- Web and MCP Retirement share `buildRetirementPlanInput` and `workplacePensionFromProfile`, including `ratesAssumed` (shown at RetirementPlanner.tsx:648); State Pension stored once.
- Year of birth only, from the profile, for Retirement and MCP.
- Wales and NI mapped to rUK income tax bands is correct; Scotland handled in take-home, the trap and MCP tax position.
- Onboarding first run saves net pay and later runs leave a chosen method alone (useFinishOnboarding.ts:101-108).

### Budget and the left-over figures

- `budgetRowMonthly` (FE budget-totals.ts:38) and web `toMonthly` (types/budget.ts:56) agree: weekly x 52/12, annual / 12, and joint rows at share through the same `applyBudgetEntryShare`, income rows included. The wizard's left over (income minus all non-income rows) equals the engine's surplus.
- Dashboard, Budget overview, Breathing room and the Debt page all read the one picture (`buildWorkspacePicture`). Budget rebuilds it live on edit (BudgetContainer.tsx:226).
- `essentialCommitments` is shared by safe to spend and months of cover, so they are known or unknown together. £0 essential rows never make either known (budget-totals.ts:72; months-of-cover.ts:39).
- The RunwayCalculator starts from the saved figure's own numbers and only applies changes the user makes, so an untouched illustration equals the saved figure.
- `isBudgetEmpty` treats all-£0 rows as empty (BudgetContainer.tsx:252-256). The wizard and "Add common entries" never duplicate a saved row (synonym matching).

### Savings, ISAs, cards and loans

- One engine for savings interest: `estimateSavingsInterestNext12Months` covers cash accounts with a rate, scales the monthly saving by share and splits ISA from other interest (FE/savings-interest.ts:92-116). Unrated accounts are counted, not given a guessed rate.
- `totalMonthlySavingAtShare` puts the monthly saving on the same basis as the share balance (FE/savings-interest.ts:124-135).
- Total debt, `getTotalConsumerDebt`, is one figure on Dashboard, Debt and MCP getDebtOverview, and includes overdrawn current accounts (FE/portfolio.ts:350-357; W/features/debt/utils/debtInputs.ts:29).
- Student loans are left out of consumer debt and payoff everywhere, and count in net worth only by the user's basis (FE/portfolio.ts:216-240,359-364; FE/net-worth-basis.ts:43-53). The Accounts footnote follows the choice.
- An unknown APR is never invented: Dashboard and Debt hide the date (debtSummary.ts:33,47; DebtSummary.tsx:46,75). An estimated minimum is flagged as an estimate.
- The Debt edit never sends the balance, so debt balances cannot be corrupted from Debt (DebtContainer.tsx:180-181).
- ISAs and pensions are always sole (FE/joint-share.ts:112-117), and Savings sends sole when a joint account becomes an ISA.
- Rate and payment fields keep "not set" as null, not 0 (app.debt.tsx:17-20; app.savings.tsx:46-51).

### Self Assessment

- `calculateUKTax` itself: month-by-month record bucketing, annual vs monthly vs one-off records, trading allowance, property allowance route compared with costs route (tie keeps costs), Section 24 credit capped by finance costs, rental profit and taxable non-savings income, PSA band from taxable income, starting rate for savings, dividend stacking, Class 4 from the rule functions (tax-calculator.ts:540-793).
- Profile-first salary and share on the web (utils/profileFirst.ts), with the onboarding baseline used only with no profile row.
- The SA Save writes the profile through one PATCH with If-Match (taxActions.server.ts:42-56).
- New PAYE records cannot be salary (tax-labels.ts:70-82).
- Tax year handling: page, Dashboard and MCP all pick the current supported year and fall back the same way (taxYears.ts:8-26; uk-tax-year.ts:225-229; mcp assumptions.ts:61-73). Only the context pack differs (SA-8).
- The source page labels rental figures "Whole property" and uses saved figures (TaxSourceContainer.tsx:86-93,173-180).
- MCP `loadTaxYearRecords` includes ongoing monthly records started in earlier years (agent-data.service.ts:301-309).
- Opt-in gate and turn-on flow (TaxContainer.tsx:74-160).

### Balances, the check-in and History

- One sign rule on every write (`storedBalance`, stored-balance.ts:17-19), with readers undoing it in one place: `PortfolioSnapshot` takes `Math.abs` for debts (portfolio.ts:238), the series does the same (snapshots.ts:206-211), and so do check-in steps (check-in.ts:479) and back-fill rows (check-in.ts:312).
- Current-month writes move the balance atomically in every path, including the import's protected upsert (snapshot-write.ts:60-70) and the connected sync's single statement (connected-write.ts:28-45).
- Carry-forward is computed at read time and flagged, never stored (snapshots.ts:6-10, 208).
- History's latest point equals the Dashboard and Accounts net worth whenever at least one row exists (selectSavedNetWorthSeries with `currentBalances`, check-in.ts:215-223). Basis and joint share are applied the same way.
- The month key is Europe/London on the backend (london-date.ts) and in History and the Dashboard (snapshotModel.ts:43-52). Future months are refused (snapshots.service.ts:71).
- The calculated balance is recomputed and checked by the server (snapshots.service.ts:250-308), and refused when the saved balance moved (check-in.ts:76-80).
- Account delete is one transaction with an audit event (account-intake.service.ts:822-841).

### Joint ownership and shares

- One share helper and default: FE/joint-share.ts:147-183, DEFAULT_JOINT_SHARE_PERCENT 50 used by engine, BE create and update (account-intake.service.ts:622-623,752-753) and budget (BE/modules/budget/budget.service.ts:226-230).
- `PortfolioSnapshot` applies the share once at construction to balance, history and contribution (FE/portfolio.ts:142-154,189,226-248); every engine total, debt item, months of cover and safe to spend inherit it consistently, and numerator and denominator agree.
- Budget share in one function (`budgetRowMonthly`, budget-totals.ts:38-47) mirrored by WEB/types/budget.ts:56-67; MCP budget uses it.
- ISA and pension joint refusal on create and on renames, with legacy rows quietly treated as sole (account-intake.service.ts:612-621,716-750).
- Home equity helper with separate home and mortgage shares and clear sublines (FE/home-equity.ts; HomeEquityLine.tsx:25-34).
- Retirement counted series uses raw history plus share once (FE/retirement.ts:1372-1390).
- Export keeps whole balances plus the share fields: correct raw data.

### AI tools, imports, export and reset

- One registry drives export, erasure and reset, with coverage tests. Secrets and hashes are left out with reasons. Reset withdraws AI and bank consents and writes an audit event (user-data-registry.ts; user-profile.service.ts:343-411).
- Net worth, totals and history in get_financial_snapshot, get_balance_history and the pack share `PortfolioSnapshot` and `selectNetWorthSeries` with the pages, under the user's choices and joint shares. A consistency test covers this.
- get_budget_summary's left over equals the page by construction. The pack's budget, safe to spend and breathing room come from `buildFinancialPicture`.
- The retirement tools share `buildRetirementPlanInput` and `calculateRetirementPlan` with the Retirement page (parity test noted at retirementInput.ts:52).
- Import staging and revert: protected writes, manual values kept unless ticked, sign rule on restore, batch ownership of rows, conditional balance restore.
- `salaryProfileFirst` keeps the browser baseline from standing in for a saved profile.
- Anonymised mode changes labels only, not totals.

### Browser state

- `revalidateOnConflict` everywhere; no route blocks default revalidation (services/conflict.ts:77-80).
- Root atom seeding with the never-go-back guard (root.tsx:209-216), and 412 handling that reloads all loaders (conflict.ts:58-71, root.tsx:203-207).
- Ordered profile write queue (useUserProfile.ts:309-314).
- `seededProfile` stops `DEFAULT_PROFILE` 5% and 3% leaking into the first paint (profileFirst.ts:56-62); Settings uses loader until the atom has an id (SettingsPage.tsx:47).
- Budget writes are not optimistic, failed deletes keep the row, 412 refetches rows (BudgetContainer.tsx:292-353); kept-debt rows read after mount (:358-362).
- Dashboard widget and checklist-skip optimism with rollback to the last confirmed list (HomeDashboard.tsx:198-242).
- Theme preference reads storage after mount, with a pre-paint script (packages/ui/src/hooks/useThemePreference.ts:57-68); `useBelowMd` uses a server snapshot.
- Sign-out: every `/logout` form clears storage (userStorage.ts:33-40); the redirect leaves the origin, so atoms go too. No Jotai Provider, but nothing writes the server-side default store during render, so no cross-request leak was found.
- HTML is `no-store` (security/headers.server.ts:61-74). Back/forward in the app re-runs loaders. Safari may still restore a no-store page from bfcache after sign-out (inferred, not checked).

### Database

- User data registry with coverage test (be/modules/privacy/user-data-registry.ts, user-data-registry.spec.ts) and the erasure/reset flow.
- Leading user_id index on every user table (entities/table-laws.spec.ts); keyset orders match (accounts, budget, tax, transactions, tokens).
- FK cascades account_details/transactions -> accounts; import_batch_id SET NULL; liability sign CHECK and triggers.
- account_details unique month, month and as_of_date CHECKs; numeric transformers on money columns.
- last_active_at write at most once a day (last-active.interceptor.ts:41-51); rate-limit table self-sweeps; idempotency and retention jobs are batched, locked and idempotent.
- timestamptz everywhere; receipt_data select:false and encrypted.
