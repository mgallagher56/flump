# System audit, November 2026: browser and database evidence

Everything here was observed on a local build of `origin/main` at `f5631d4f0`, on 19 November 2026.

- The backend, the web app and Postgres 16 ran on the auditor's machine. Nothing touched staging or any real account.
- The data was the seeded `homeowner` persona from `apps/e2e/support/personas.ts`, applied to the single local test user.
- The browser was Chromium, driven by Playwright from a signed-in session.
- Each check changed a value in one place and then read the rendered text of the other pages.
- Most writes used the same `/api` request the page itself sends. Check B5 used the Savings page form. Checks B7 and B12 posted the Self Assessment form.
- Checks B1 to B17 were run by the lead. Checks B18 to B21 were run by the independent reviewer on the same local build.
- No screenshots are kept, because the repository is public.

## Checks

### B1

Mortgage payment. Before: Mortgage page "Monthly payment £1,250"; Budget "Housing / Mortgage £1,250", "Left over each month £135"; Dashboard left over £135. Saved payment 1,400 on the mortgage account (the PATCH the Mortgage page makes). After: Mortgage page £1,400; Budget housing row still £1,250; left over still £135 on Budget and Dashboard.

### B2

Second property. Added a Property account named "Rental flat" worth 200,000. Mortgage page loan to value went from 60% to 36.5% and the "Your equity £124,000" line no longer showed. Dashboard net worth went from £231,400 to £431,400.

### B3

Buy-to-let mortgage. Added a Mortgage account with subtype btl_mortgage, 150,000 at 5.1%, 640 a month. Mortgage page, Buy to let tab: "Add your buy to let mortgage balance and interest rate to see your monthly payment and what overpaying would change" and an "Add mortgage details" button; the account's balance, rate and payment do not show. Dashboard "Mortgage balance" card showed £336,000 (both mortgages added together).

### B4

Joint savings across pages. Marked "Easy access savings" (7,600) joint at 50%. Dashboard "Savings and investments" card stayed £17,600 (whole balances). Savings page "Total savings" £13,800 and the row £3,800; Accounts row "Savings · Joint, 50% £3,800"; net worth fell by 3,800 to £227,600.

### B5

Rate-only edit halves a joint balance. With the account joint at 50% and 7,600 stored, opened Edit on the Savings page. The "Current balance" field was prefilled with 3,800. Changed only the rate to 4.1 and saved. Stored balance became 3,800 (was 7,600). Savings then showed the row at £1,900 and Accounts "Joint, 50% £1,900".

### B6

Salary change. Saved salary changed from 58,000 to 70,000 (PATCH /user-profile, as Settings does). Take-home page went from £3,451 to £3,983 a month. Budget "Money in each month" stayed £3,450 and "Left over each month" stayed £135 on Budget and Dashboard. The line under it changed from "£171 a month after essential spending, debt payments and savings" to "£703 a month ...". Pension "Going in each month" showed £758.

### B7

Buy-to-let mortgage and Self Assessment. Turned Self Assessment on. Added a buy-to-let mortgage account (150,000 at 4.5%, 562 a month). Self Assessment "Income sources" then listed "Rental property / From your account: Buy-to-let mortgage", with "Estimated bill Not set". Added rent received of 1,100 a month from 6 April 2026 as a record. The page then showed "Estimated bill £4,880", "Income outside PAYE £13,200", "No expenses recorded" and "The estimate uses the property allowance". No mortgage interest from the account appeared anywhere in the estimate. The Dashboard card "Tax due this tax year" also showed £4,880 (same as the page, for an employed user).

### B8

Retirement page. /app/retirement returned "We cannot find that page" on the local build (the page is gated to allow-listed users), so retirement links were not checked in the browser in this batch.

### B9

Check-in card and a rename. Dashboard showed "Monthly check-in / November balances not recorded yet / Start monthly check-in". Renamed "Current account" with the same request the edit dialog sends (new name plus the unchanged balance 3,400). The Dashboard then showed no check-in card at all, with seven other accounts still unrecorded for November.

### B10

New account and history. Added a Saving account "New saver" with 5,000. Its page showed "Current balance £5,000 / No monthly balances recorded yet / No balance history yet".

### B11

Student loan plan. With no plan on the profile, added a Student Loan account with plan PLAN_2 and 30,000. Take-home page stayed £3,451 a month with only Income Tax, National Insurance and Pension in the breakdown: no student loan repayment.

### B12

Self-employed tax, Dashboard against page. Set employment to self-employed with a saved salary of 40,000 and added one self-employed income record of 40,000 for 2026/27. Self Assessment page "Estimated bill £15,132". Dashboard "Tax due this tax year £6,872".

### B13

Scotland. Set tax region to SCOTLAND. Self Assessment "Estimated bill" stayed £15,132 and the page text did not mention Scotland. The Dashboard figure stayed £6,872 and its text did not mention Scotland either.

### B14

Joint mortgage. Marked the residential mortgage joint at 50%. The Home property followed to joint 50% (stored). Dashboard "Mortgage balance £93,000" and net worth £169,400. Mortgage page "Remaining balance £186,000 / Whole loan, held jointly", loan to value 60%, "Your equity £62,000 / At your 50% share". Accounts rows "Home · Joint, 50% £155,000" and "Residential mortgage · Joint, 50% £93,000".

### B15

Correcting last month. With November not yet recorded, saved a corrected October value for "Easy access savings" (17,600 in place of 7,480) through the back-fill call. History then showed October £239,045 "Recorded" and November £231,400 "Carried forward". Dashboard net worth stayed £231,400. The account page showed "Current balance £7,600 / As of October".

### B16

AI context pack. The pack preview returned baseline.taxYear "2025/26" on 19 November 2026 (tax year 2026/27), with the saved salary 58,000.

### B17

Retirement target from budget lines. With 15 budget rows saved (11 of them spending outside housing and savings), Retirement, "From budget lines" showed "No spending lines other than housing saved yet." For this check the local backend was restarted with `BETA_OPEN=true`, which opens the Retirement page to the test user.


### B18

Run by the independent reviewer. Runway what-if with a joint account (JO-2). Marked "Easy access savings" (7,600) joint at 40%. Budget headline "About 5.5 months" and "Money to draw on £16,440". In the what-if list the account showed £1,216, which is 16% of the balance; 40% is £3,040. Switching it off gave "5.1 months" and £15,224; the right result is 4.5 months and £13,400.

### B19

Run by the independent reviewer. A chosen 5% and 3% with salary sacrifice (PP-3). Saved pension 5%, employer 3% and salary sacrifice on the profile. Pension page: "Assumed rates. Edit to match your payslip." Take-home page: "Not set" with a prompt to add the pension method. After B21, the Budget page said "Add your salary" although a salary of 58,000 was saved.

### B20

Run by the independent reviewer. A debt changed to an asset (CH-4). Changed "Credit card" (owing 1,200) to type Saving with balance 1,200. History "Net worth change" went from +£2,443 to +£4,843, a jump of twice the balance. The account page showed past months still negative.

### B21

Run by the independent reviewer. A £0 income line (BU-8). Set the budget income line to 0. Budget showed "Short each month £3,315" and "Money in each month £0". The Dashboard showed "Short each month" with the same figure.

## Not checked in a browser

- Anything that needs an AI client: the read tools' left over and months of cover, the tax tool with no salary saved. Only the context pack preview was read (B16).
- Onboarding in take-home mode (PP-1). It was not run, because the local user was already set up.
- The Mortgage page showing old figures after a save (CS-1), the checklist flash (CS-2, CS-4) and reset leaving browser storage (CS-3).
- Rent edited in housing details (HM-2, BU-4). Only the mortgage half of that link was run (B1).
- The staged import path (AI-9, AI-10).
- A 0% end date and the debt-free date (SD-4).
- Check B6 read "Going in each month £758" on the Pension page after the salary change. The reviewer could not reproduce how that figure is made up, so it is recorded as seen and not relied on.
- Anything on a phone-sized screen.

## Queries per page

Measured with Postgres statement logging while each page loaded once in the browser. Counts leave out transaction control statements. The slowest single statement on every page took under one millisecond on this small data set, so the figures show shape, not speed.

| Page | Queries | Of which the deleted-account lookup | Other tables read | Browser writes on load |
|---|---|---|---|---|
| Dashboard `/` | 9 | 4 | accounts, account_details, user_profiles, budget_entries, tax_records | none |
| Accounts | 8 | 4 | accounts, account_details, user_profiles, bank_connections | none |
| History | 5 | 2 | accounts, account_details, user_profiles | none |
| Mortgage | 5 | 2 | accounts, account_details, user_profiles | none |
| Budget | 7 | 3 | accounts, account_details, user_profiles, budget_entries | none |
| Savings | 10 | 4 | accounts, account_details, user_profiles (3 reads), budget_entries | `PATCH /api/user-profile/checklist` |
| Debt | 7 | 3 | accounts, account_details, user_profiles, budget_entries | none |
| Pension | 9 | 4 | accounts, account_details, user_profiles (3 reads) | `PATCH /api/user-profile/checklist` |
| Retirement (gated off in this run) | 6 | 3 | accounts, account_details, user_profiles | none |
| Take-home | 5 | 2 | accounts, account_details, user_profiles | none |
| Self Assessment | 7 | 3 | accounts, account_details, user_profiles, tax_records | none |
| Settings | 5 | 2 | accounts, account_details, user_profiles | none |

What the counts show:

- There is no N+1 read on any main page: no read repeats for each row. Savings and Pension read the profile three times.
- Every page reads all accounts and their full history, including Take-home and Settings, which show neither.
- Between a third and a half of all queries are the deleted-account lookup (finding LD-1).
- The slowest statement was the `account_details` read on most pages. With six months of history for eight accounts it is tiny. It grows with every month recorded.
- Not measured: write paths, the AI tools, and any data set larger than one persona.
