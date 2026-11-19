# Phone audit: journey map (November 2026)

Status: audit, phase 1. Decisions: none open.

The owner tested staging on a phone on 18 November 2026 and asked for a full audit of phone
viewports across the web app and the marketing site, driven by user journeys. This map lists the
journeys, the household each one uses, and a coverage table showing that every page and every
overlay is reached by at least one journey. `FINDINGS.md` in this folder holds the results.

The sweep that drives these journeys is `apps/e2e/sweep/phone.spec.ts` (sets in
`apps/e2e/sweep/phoneSets.ts`, checks in `apps/e2e/sweep/phoneChecks.ts`). Each journey below
names its set. Run it with `bun run e2e:phone` in `apps/e2e` (README, "Phone audit sweep").
Screenshots go outside the repository.

## Page inventory

Built from `apps/web/app/routes/*.tsx` (flat routes) and `apps/marketing/src/App.tsx`, not from
memory. Redirect-only and non-page routes are listed so nothing is silently left out.

### Web app pages

| Route file                | Path                          | What it is                                                         |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `_index.tsx`              | `/`                           | Home (dashboard) when signed in; redirects to marketing otherwise  |
| `app._index.tsx`          | `/app`                        | Redirect to `/`, `/app/onboarding` or `/login`                     |
| `app.onboarding.tsx`      | `/app/onboarding`             | Onboarding steps                                                   |
| `app.accounts._index.tsx` | `/app/accounts`               | Accounts (net worth)                                               |
| `app.accounts.$account.tsx` | `/app/accounts/:account`    | One account's detail                                               |
| `app.accounts.history.tsx`| `/app/accounts/history`       | Monthly balances history and the check-in                          |
| `app.budget.tsx`          | `/app/budget`                 | Budget, budget wizard, housing                                     |
| `app.debt.tsx`            | `/app/debt`                   | Debt and borrowing (tabs)                                          |
| `app.mortgage.tsx`        | `/app/mortgage`               | Mortgage (tabs)                                                    |
| `app.savings.tsx`         | `/app/savings`                | Savings and forecast (tabs)                                        |
| `app.pension.tsx`         | `/app/pension`                | Pension (tabs)                                                     |
| `app.retirement.tsx`      | `/app/retirement`             | Retirement plan (hidden page, switched on per user)                |
| `app.take-home.tsx`       | `/app/take-home`              | Take-home pay (tabs)                                               |
| `app.self-assessment.tsx` | `/app/self-assessment`        | Self Assessment (opt-in, tabs)                                     |
| `app.tax.receipts.$id.tsx`| `/app/tax/receipts/:id`       | A stored receipt (file response, needs a saved record with a receipt) |
| `app.imports._index.tsx`  | `/app/imports`                | Imports list                                                       |
| `app.imports.$id.tsx`     | `/app/imports/:id`            | Import review                                                      |
| `app.profile.tsx`         | `/app/profile`                | Settings: Profile, Security (AI connections), Data tabs            |
| `account-deleted.tsx`     | `/account-deleted`            | Account deleted, or finish deleting                                |
| `tools._index.tsx`        | `/tools`                      | Calculators index (signed out and in)                              |
| `tools.$slug.tsx`         | `/tools/:slug`                | One calculator (eight slugs in `toolCatalog.ts`)                   |
| `login._index.tsx`        | `/login`                      | Sign in hand-off                                                   |
| `signup._index.tsx`       | `/signup`                     | Sign up hand-off                                                   |
| `$.tsx`                   | any unknown path              | Not found                                                          |

Redirect or non-page routes, reached as part of a journey but with nothing to look at:
`app.forecast.tsx` (301 to `/app/savings#forecast`), `app.tax._index.tsx` (301 to
`/app/self-assessment`), `app.sandbox.tsx` and `sandbox.tsx` (redirect to `/sandbox`, then
`/signup`), `$feature._index.tsx` (old feature paths redirect to their page), `logout._index.tsx`,
`callback.tsx` (WorkOS return), `account.export.ts` (export download), `api.$.tsx`, `healthz.ts`,
`ping.tsx`, `csp-report.ts`, `robots[.]txt.ts`.

### Marketing pages

| Route      | Page              |
| ---------- | ----------------- |
| `/`        | `HomePage`        |
| `/preview` | `PreviewPage`     |
| `/tools`   | `ToolsIndexPage`  |
| `/tools/:slug` | `ToolPage` (eight slugs) |
| `/pricing` | `PricingPage`     |
| `/security`| `SecurityPage`    |
| `/mcp`     | `McpPage`         |
| `/contact` | `ContactPage`     |
| `*`        | `NotFoundPage`    |

### Overlays in the web app

From the overlay primitives (`packages/ui/src/primitives/{Dialog,Sheet,Popover}`,
`packages/ui/src/patterns/{NavDrawer,ConfirmDialog}`) and every component that uses them.

| Id  | Overlay                                     | Kind    | Page                         | File                                                                                       |
| --- | ------------------------------------------- | ------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| O1  | Navigation drawer ("More pages", top bar)   | drawer  | every signed-in page         | `apps/web/app/components/structure/header/MobileNavDrawer/MobileNavDrawer.tsx`             |
| O2  | Account menu                                | menu    | every signed-in page         | `apps/web/app/components/navigation/AvatarMenu/AvatarMenu.tsx`                             |
| O3  | Add or edit account (and its delete confirm)| dialog  | Accounts, account detail     | `apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx`          |
| O4  | Monthly check-in and "Add earlier months"   | sheet   | Accounts, History            | `apps/web/app/features/snapshot/components/CheckInSheet/CheckInSheet.tsx`                  |
| O5  | Choose what shows here                      | dialog  | Home                         | `apps/web/app/features/dashboard/components/WidgetVisibilityPanel/WidgetVisibilityPanel.tsx` |
| O6  | Add or edit debt, delete debt               | dialog  | Debt                         | `apps/web/app/features/debt/components/AddDebtDialog/AddDebtDialog.tsx`                    |
| O7  | Edit mortgage                               | dialog  | Mortgage                     | `apps/web/app/features/mortgage/components/MortgageEditDialog/MortgageEditDialog.tsx`      |
| O8  | Add or edit pension pot, delete pot         | dialog  | Pension                      | `apps/web/app/features/pension/components/AddPensionAccountDialog/AddPensionAccountDialog.tsx` |
| O9  | Add or edit savings account, delete         | dialog  | Savings                      | `apps/web/app/features/savings/components/AddSavingsAccountDialog/AddSavingsAccountDialog.tsx` |
| O10 | Budget wizard (in page) and entry delete    | wizard  | Budget                       | `apps/web/app/features/budget/components/BudgetSetupWizard/BudgetSetupWizard.tsx`          |
| O11 | Add budget category                         | dialog  | Budget                       | `apps/web/app/features/budget/components/AddCategoryModal/AddCategoryModal.tsx`            |
| O12 | Add or edit budget entry                    | dialog  | Budget                       | `apps/web/app/features/budget/components/BudgetEntryDialog/BudgetEntryDialog.tsx`          |
| O13 | Housing (rent or mortgage payment)          | dialog  | Budget                       | `apps/web/app/features/housing/components/HousingDetails/HousingDetails.tsx`               |
| O14 | Self Assessment: Add income menu            | menu    | Self Assessment              | `apps/web/app/features/tax/components/AddIncomeMenu/AddIncomeMenu.tsx`                     |
| O15 | Self Assessment: record dialog              | dialog  | Self Assessment              | `apps/web/app/features/tax/components/TaxRecordDialog/TaxRecordDialog.tsx`                 |
| O16 | Self Assessment: copy from last year        | dialog  | Self Assessment              | `apps/web/app/features/tax/components/CopyTaxYearModal/CopyTaxYearModal.tsx`               |
| O17 | Self Assessment: receipt                    | dialog  | Self Assessment              | `apps/web/app/features/tax/components/TaxReceiptDialog/TaxReceiptDialog.tsx`               |
| O18 | Self Assessment: row actions, year menu, delete confirms | menu, alert | Self Assessment | `apps/web/app/features/tax/components/TaxRecordsTable/TaxRecordsTable.tsx`, `apps/web/app/containers/tax/TaxContainer.tsx` |
| O19 | Undo import                                 | alert   | Import review                | `apps/web/app/features/imports/components/ImportReviewPage/ImportReviewPage.tsx`           |
| O20 | Delete all data                             | alert   | Settings, Data               | `apps/web/app/features/settings/components/DataTab/DataTab.tsx`                            |
| O21 | Delete your account                         | alert   | Settings, Data               | `apps/web/app/features/settings/components/DeleteAccountSection/DeleteAccountSection.tsx`  |
| O22 | Disconnect an AI connection                 | alert   | Settings, Security           | `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`  |
| O23 | Info tips (KPI and hero figures, APR, starting figures, breathing room) | popover | most pages | `packages/ui/src/primitives/KpiCard/KpiCard.tsx`, `packages/ui/src/patterns/HeroFigure/HeroFigure.tsx` and callers |
| O24 | Date picker                                 | popover | Mortgage, Self Assessment, Budget dialogs | `packages/ui/src/primitives/DatePicker/DatePicker.tsx`                     |
| O25 | Marketing menu                              | drawer  | every marketing page         | `apps/marketing/src/components/Header/Header.tsx`                                          |

Not reachable by any user: `ConnectBankWizard` and the "Disconnect bank" confirm in
`BankConnectionsList` are imported by no page (dead code; listed as a finding, not audited).

## Households

All households are seeded through `apps/e2e/support/personas.ts`. Two existed (renter,
homeowner); three were added for this audit. Each is described by facts only; none is framed as
further along, better or worse than another.

| Persona        | Facts                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `renter`       | Sam, 29, rents, employed on £32,000 in England, Plan 2 student loan, one credit card, easy access savings, workplace pension, budget set |
| `homeowner`    | Alex, 44, repayment mortgage with a fixed rate ending in 20 months, employed on £58,000, car loan, credit card, two savings accounts      |
| `debtpayer`    | Jordan, 36, rents in Scotland, employed on £41,000, two credit cards (one at 0%), a personal loan and an overdraft, paying each down     |
| `selfemployed` | Robin, 47, self-employed in Wales, owns their home outright and lets one flat with an interest-only buy-to-let mortgage, Self Assessment on |
| `retiree`      | Morgan, 61, owns their home outright in Northern Ireland, employed on £38,000, three pension pots and an ISA, Retirement plan on         |
| `everything`   | Charlie, 52, employed on £74,000 in England with self-employed work on the side; owns a home jointly (50%) with a residential mortgage whose fix ends in 4 months; lets one flat with a buy-to-let mortgage; joint current account and joint bills; easy access and cash ISA savings, a stocks and shares ISA and a general investment account; a credit card, car finance and a Plan 1 student loan; two pensions; a retirement plan; Self Assessment records (self-employed and rental); one AI connection; one committed and one staged import; six months of history; every optional page on |
| new user       | the dev user cleared to brand new (`clearToNewUser`): no accounts, no budget, setup not finished                                         |
| signed out     | no session                                                                                                                              |

Two parts of the brief have no matching data in the product today, and the journeys say so
rather than inventing it: there is no joint-account field on an account (J3 checks the
"Joint current account" name only, on the retiree), and the homeowner's fix ends in 20 months, so
the "fix ending soon" notice is reached through the self-employed household, whose buy-to-let fix
ends in 7 months.

## Journeys

Every journey runs at 320x568, 375x812, 390x844 and 430x932 in light and dark, portrait, with
touch and mobile emulation, and its main pages again at 812x375 landscape. Overlays run at every
width in light and at 375 in dark. Steps marked "measure" are recorded by the sweep; the rest
are reviewed by eye from the screenshots.

### J1. First-time visitor on the marketing site, signs up, goes through onboarding

Set `mkt`, then `out` (`/signup`), then `newuser` (onboarding).

1. Open the marketing home page from a link. Measure: first view, header height, overflow.
2. Open the menu (O25), read it, close it. Measure: which side it opens from against the button.
3. Visit Tools, one tool page per slug, Pricing, Security, MCP, Contact and Preview.
4. Choose "Get started" and land on `/signup` in the web app.
5. Go through every onboarding step with Next only. Measure: field focus walk (scroll jumps),
   keyboard type for money and dates, input text size, the Next button's reach.
6. Reach a mistyped marketing URL (`/nope-404`).

### J2. Renter with savings and a budget

Set `renter`.

1. Home: read the headline, open "Choose what shows here" (O5), close it.
2. Use the bottom bar to go to Accounts, scroll, open "Add account" (O3), walk its fields,
   close it; open the current account, edit it, close.
3. Budget: open the wizard (O10), add a category (O11), open the rent dialog (O13), tap the
   breathing room tip (O23).
4. Savings, every tab; open "Add account" (O9).
5. Debt, Pension and Take-home, every tab.
6. Settings (Profile tab and the others).
7. From each page, scroll down and use the bottom bar, then Back. Measure: scroll position after
   navigation and after Back, the bottom bar's spacing and current-page state.
8. Hold a page load and fail one: the loading and error states.
9. Axe and 200% text on every page at 375.

### J3. Homeowner with a mortgage, a fix ending and joint accounts

Set `homeowner`.

1. Home, Accounts, History.
2. Mortgage, every tab; open "Edit mortgage" (O7) and walk its fields, including the date
   picker (O24); tap "Starting figures" (O23).
3. Budget: "Edit what you pay" (O13).
4. Pension: "Add pension pot" (O8).
5. Savings, Debt, Take-home, every tab.
6. Navigation checks as J2.

### J4. Cards and loans, paying debt down

Set `debtpayer`.

1. Home, then Debt with four debts; every tab (the payoff plan tools and the chart).
2. "Add a debt" (O6) and walk its fields; tap the APR tip (O23) inside the dialog.
3. Edit the personal loan; the delete confirm is opened only, never confirmed.
4. Budget with five repayment rows; Accounts.

### J5. Self-employed person and landlord using Self Assessment

Set `selfemployed`.

1. Home, then Self Assessment, every tab.
2. "Add income" menu (O14); a record dialog (O15) and walk its fields with the date picker (O24).
3. The tax year menu (O18).
4. Mortgage for the buy-to-let, with a fix ending in 7 months (the fix-ending notice).
5. Accounts with two property values; Settings, where Self Assessment is switched on.

### J6. Near retirement, using Pension and Retirement

Set `retiree`.

1. Home, Pension (every tab) with three pots; edit a pot (O8).
2. Retirement plan, the hidden page switched on for this household.
3. Savings and Accounts ("Joint current account").

### J7. Returning user doing the monthly check-in and reading history

Sets `renter` and `homeowner` (both have six months of history and this month due).

1. Accounts, "Start monthly check-in" (O4) from the deep link `?checkIn=1`; walk every balance
   field; close without saving. Measure: sheet height against the viewport, field jumps, focus
   return.
2. History: the chart, the month list, "Add earlier months".
3. Account detail from the list, then Back.

### J8. Settings, privacy, AI connections and imports

Set `settings` (the retiree's data).

1. Settings: Profile, Security (AI connections and their disconnect confirm, O22) and Data tabs.
2. Data: export link; "Delete all data" (O20) and "Delete your account" (O21), opened only.
3. Imports list, an import that does not exist (`/app/imports/does-not-exist`) and an account that
   does not exist (`/app/accounts/does-not-exist`): the route error and not-found states.
4. `/account-deleted` signed out.

### J9. Empty, loading, error, 404 and signed-out states

Sets `newuser`, `out`, `mkt` and the state steps of J2.

1. New user: every main page with no data (the empty states), then onboarding.
2. Signed out: `/tools` and each tool, `/signup`, `/login`, `/nope-404`, `/account-deleted`.
3. Loading and error: from J2 step 8.
4. Marketing not-found.

### J11. One person who uses every page

Set `everything`. Added at the owner's request ("i also want a journey to cover someone who uses
all the pages"). The densest household, so it is also the check for long lists, wrapped labels,
tables and the largest figures.

1. Marketing first: home, the menu (O25), Tools and every tool page, Pricing, Security, MCP,
   Contact, Preview.
2. Signed in: Home, Accounts, History, Budget, Savings, Debt, Mortgage, Pension, Retirement,
   Take-home, Self Assessment, Imports, Settings (every tab), Calculators, and Onboarding (which
   a set-up user is sent away from; recorded as it answers).
3. Every overlay once: the drawer from both triggers (O1), the account menu (O2), add and edit
   account (O3), the check-in (O4), Choose what shows here (O5), the budget wizard, category and
   mortgage-payment dialogs and the breathing room tip (O10, O11, O13, O23), add savings (O9),
   add and edit debt (O6), edit mortgage and its tip (O7, O23), add pension pot (O8), the Self
   Assessment menu, a rental record, copy from last year, row actions, year menu and delete
   confirm (O14 to O18), Undo import from the import review (O19, and the review page itself),
   disconnect AI (O22), delete all data (O20) and delete account (O21). Nothing is confirmed.
4. Navigation checks, loading and error states, axe and 200% text as J2.
5. A mistyped signed-in URL and a mistyped marketing URL (`/nope-404` on each), so one person
   also meets both not-found pages.

### J10. One-handed reach and landscape

Every set's main pages at 812x375; every overlay's close control measured for distance from the
bottom of the screen.

## Coverage

Every page and overlay against the journeys that reach it. "Set" names the sweep set. The J11
column is the one-person journey; it has no gaps except the stated exceptions listed after the
table, which one person cannot reach in one sitting and which other journeys cover.

| Page or overlay                         | Journeys        | Set | J11 |
| --------------------------------------- | --------------- | --------------------------- | --- |
| `/` Home                                | J2 J3 J4 J5 J6 J9 | renter, homeowner, debtpayer, selfemployed, retiree, newuser | yes |
| `/app` redirect                         | J1              | newuser (onboarding entry)  | yes |
| `/app/onboarding`                       | J1 J9           | newuser                     | exception |
| `/app/accounts`                         | J2 J3 J4 J5 J6 J7 J9 | all persona sets, newuser | yes |
| `/app/accounts/:account`                | J2 J7 J8        | renter (edit-account), settings (not found) | yes |
| `/app/accounts/history`                 | J2 J3 J7 J9     | renter, homeowner, newuser  | yes |
| `/app/budget`                           | J2 J3 J4 J9     | renter, homeowner, debtpayer, newuser | yes |
| `/app/debt`                             | J2 J3 J4 J9     | renter, homeowner, debtpayer, newuser | yes |
| `/app/mortgage`                         | J3 J5 J9        | homeowner, selfemployed, newuser | yes |
| `/app/savings`                          | J2 J3 J6 J9     | renter, homeowner, retiree, newuser | yes |
| `/app/pension`                          | J2 J3 J6 J9     | renter, homeowner, retiree, newuser | yes |
| `/app/retirement`                       | J6              | retiree                     | yes |
| `/app/take-home`                        | J2 J3           | renter, homeowner           | yes |
| `/app/self-assessment`                  | J5 J9           | selfemployed, newuser       | yes |
| `/app/tax/receipts/:id`                 | J5              | not reached: needs a saved record with an uploaded receipt (see FINDINGS) | exception |
| `/app/imports`                          | J8              | settings                    | yes |
| `/app/imports/:id`                      | J8              | settings (missing id); a real review needs an uploaded file (see FINDINGS) | yes |
| `/app/profile` and its tabs             | J2 J5 J8        | renter, selfemployed, settings | yes |
| `/account-deleted`                      | J8 J9           | out                         | exception |
| `/tools`, `/tools/:slug` (web)          | J9              | out                         | yes |
| `/login`, `/signup`                     | J1 J9           | out                         | exception |
| Web not found                           | J8 J9           | out, settings               | yes |
| Redirect routes (forecast, tax, sandbox, feature paths) | J9 | followed, nothing to show   | yes |
| Marketing `/`                           | J1              | mkt                         | yes |
| Marketing `/preview`                    | J1              | mkt                         | yes |
| Marketing `/tools`, `/tools/:slug`      | J1              | mkt                         | yes |
| Marketing `/pricing`, `/security`, `/mcp`, `/contact` | J1 | mkt                        | yes |
| Marketing not found                     | J1 J9           | mkt                         | yes |
| O1 Navigation drawer                    | J2 J10          | renter                      | yes |
| O2 Account menu                         | J2              | renter                      | yes |
| O3 Add or edit account                  | J2 J7           | renter                      | yes |
| O4 Check-in sheet                       | J7              | renter                      | yes |
| O5 Choose what shows here               | J2              | renter                      | yes |
| O6 Add or edit debt                     | J4              | debtpayer                   | yes |
| O7 Edit mortgage                        | J3              | homeowner                   | yes |
| O8 Pension pot                          | J3 J6           | homeowner, retiree          | yes |
| O9 Savings account                      | J2              | renter                      | yes |
| O10 Budget wizard                       | J2              | renter                      | yes |
| O11 Add budget category                 | J2              | renter                      | yes |
| O12 Budget entry                        | J2              | by eye inside the wizard (renter) | yes |
| O13 Housing                             | J2 J3           | renter, homeowner           | yes |
| O14 Add income menu                     | J5              | selfemployed                | yes |
| O15 Record dialog                       | J5              | selfemployed                | yes |
| O16 Copy from last year                 | J5              | by eye (needs an earlier year with records) | yes |
| O17 Receipt                             | J5              | not reached: needs an uploaded receipt | exception |
| O18 Row actions, year menu, deletes     | J5              | selfemployed (year menu); row menu needs a saved record | yes |
| O19 Undo import                         | J8              | not reached: needs a completed import | yes |
| O20 Delete all data                     | J8              | settings                    | yes |
| O21 Delete your account                 | J8              | settings                    | yes |
| O22 Disconnect AI connection            | J8              | by eye: needs a connected AI client | yes |
| O23 Info tips                           | J2 J3 J4        | renter, homeowner, debtpayer | yes |
| O24 Date picker                         | J3 J5           | homeowner, selfemployed (inside dialogs) | yes |
| O25 Marketing menu                      | J1              | mkt                         | yes |

### Stated exceptions for J11

One person cannot reach these in one sitting. Each is covered elsewhere or recorded in FINDINGS.

| Page or state                         | Why one person cannot reach it                                                   | Covered by        |
| ------------------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| `/app/onboarding` steps               | A set-up user is sent to Home; the steps exist only for a new user               | J1, J9 (newuser)  |
| Empty states of every page            | J11 has data on every page                                                       | J9 (newuser)      |
| Renter-only screens (rent in housing) | J11 owns a home; renting and owning are separate states                          | J2, J4            |
| `/login`, `/signup`, `/account-deleted` | Signed-out pages                                                               | J1, J9 (out)      |
| O17 Receipt and `/app/tax/receipts/:id` | Needs an uploaded receipt file; the seed writes no file                        | Not reached (FINDINGS) |
