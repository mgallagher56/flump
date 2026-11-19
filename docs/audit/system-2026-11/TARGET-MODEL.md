# System audit, November 2026: target model

This is the recommended single source of truth for each fact that is duplicated or disputed today. It is a recommendation. Where it depends on an owner decision, the decision number from [PLAN.md](./PLAN.md) is given, and nothing here should be built before that decision is made.

Finding ids point at [FINDINGS.md](./FINDINGS.md). Today's stores, writers and readers for every fact are in [docs/system/value-map.yaml](../../system/value-map.yaml).

## The four homes

Every fact about a user has one of four homes. A reader that needs a fact goes to its home. It does not keep a copy.

| Home | Holds | Table |
|---|---|---|
| The person | Pay, pension rates, year of birth, tax region, student loan plans, housing status when there is no mortgage, rent, preferences | `user_profiles` |
| Things with a balance | Every account, property, mortgage, card, loan and pot, with its rate, monthly amount, kind, share and history | `accounts`, `account_details` |
| The plan | Budget lines, and the retirement plan | `budget_entries`, `retirement_plans` |
| Income outside PAYE | Self Assessment records | `tax_records` |

Three rules follow.

1. **No copies between homes.** A budget line that repeats a saved fact is linked to it and has no amount of its own.
2. **Stored values are whole and unsigned by the form.** The engine applies the share and the sign. A form never sends back a value the engine has already adjusted.
3. **Not set is stored as not set.** No column default, engine default or reset value may look like an answer.

## Fact by fact

### Pay

| Fact | Source of truth | Who may write | How readers get it | Other stores |
|---|---|---|---|---|
| Salary before tax | `user_profiles.annual_salary` | Onboarding, Settings, Pension, Self Assessment, all through `PATCH /user-profile` | `profileFactsFromProfile`, then the picture | Budget income line becomes a linked line (derived). Legacy `paye_salary` records are migrated out and the engine stops letting them replace the salary. The `45,000` engine default is removed from every signed-in path. The browser baseline and seed stay for signed-out calculators only |
| Take-home typed in onboarding (decision 2) | `user_profiles.monthly_take_home`, kept as net pay | Onboarding | `selectTakeHome` uses it when no salary is saved, labelled as the user's own figure | `annual_salary` is left empty in this mode. Figures that need pay before tax show "Not set" with an action |
| Employment type | `user_profiles.employment_type` | Onboarding, Settings | One input builder for tax, used by the Dashboard, the page and the AI tools (SA-1) | none |
| Pension rates and method (decision 3) | `user_profiles.pension_percent`, `pension_employer_percent`, `is_salary_sacrifice`, made nullable with no default | Onboarding, Settings, Pension | The picture. Null means not set everywhere | The exact-pair test for 5% and 3% is removed. A pot's monthly amount is for payments outside the workplace scheme only, and the form says so |
| Tax region | `user_profiles.tax_region` | Onboarding, Settings | The picture, for every reader including Self Assessment and the Pension notice | The browser copy is no longer read on signed-in pages |
| Student loan plan | `user_profiles.student_loan_plans` | Onboarding, Settings. The Student Loan account form asks only when the profile has none, and writes the profile | The picture | `accounts.student_loan_plan` is migrated into the profile and dropped |
| Second income and rental income on the profile | none: these facts live as budget income lines and tax records | nobody | n/a | The four columns are dropped (decision 12) |

### Accounts, balances and history

| Fact | Source of truth | Who may write | How readers get it | Other stores |
|---|---|---|---|---|
| Balance today (decision 8) | `accounts.balance`, which must always equal the newest `account_details` value for that account | One backend function, used by create, edit, check-in, back-fill and import | `PortfolioSnapshot` | The current-month history row is written in the same transaction. Creating an account writes its first row. A write to the newest recorded month moves the balance when no newer row exists |
| Balance for a past month | `account_details` | Check-in, back-fill, import | `selectNetWorthSeries` only | `PortfolioSnapshot.getMonthlyHistory` is retired, so the context pack reads the same series |
| Check-in finished for a month | `snapshot_checkins` | The check-in, on its last step | The reminder on the Dashboard and History | "Any row this month" stops meaning "recorded" |
| Share of a joint account | `accounts.ownership` and `accounts.share_percent` | The one account form, on every page that edits accounts | `applyAccountShare` inside the engine | `user_profiles.property_ownership_share` is dropped (decision 6) |
| Rate, monthly amount, limit, 0% end date, term, fix end | The columns on `accounts` | The one account form | The engine | Budget lines that repeat a monthly amount become linked lines |
| Kind of loan (car finance, buy now pay later, other) | `accounts.account_subtype` | The one account form | Labels only | none |

The one account form: Accounts, Savings, Debt, Pension and Mortgage use the same field set for an account type, and send only the fields the user changed. That closes the halved balance (SD-1), the hidden check-in reminder after a rename (CH-3) and the "two pages to set up one card" friction (SD-8) with one change.

Joint accounts on screen (decision 9): every page shows the user's share as the main figure and the whole as a secondary line. Every form edits the whole and says so beside the field.

### Home, mortgage and buy to let

| Fact | Source of truth | Who may write | How readers get it | Other stores |
|---|---|---|---|---|
| Kind of property | New: `accounts.account_subtype` on Property rows, `home` or `rental` | The account form | `isBuyToLetAccount` reads the subtype | The name test stays only as the back-fill rule in the migration |
| Which mortgage belongs to which property | New: `accounts.linked_account_id` on the mortgage, a nullable foreign key to the property | The account form and the Mortgage page, through the account service | Equity, loan to value, share copying, retirement housing | The "exactly one of each" rule is removed |
| Value of a property | The Property account's balance | Accounts, Mortgage page, check-in | The engine | `user_profiles.buy_to_let_property_value` is migrated into a rental Property account and dropped (decision 4) |
| Buy-to-let mortgage balance, rate, type | The Mortgage account with subtype `btl_mortgage` | Accounts and the Mortgage page's buy-to-let tab, both writing the account | The Mortgage page reads the account | The three `buy_to_let_mortgage_*` profile columns, `has_buy_to_let` and `buy_to_let_count` are dropped |
| Repayment type | New: per mortgage, on the account | The account form | The engine | `user_profiles.mortgage_type` is migrated to the residential mortgage and dropped |
| Has a mortgage | Derived: a residential Mortgage account exists | nobody | A selector | `user_profiles.has_mortgage` is dropped. `housing_status` keeps only the answers a mortgage account cannot give: renting, living with family, own outright |
| Home value entered with the mortgage | One backend call that creates the mortgage, the property and the link in one transaction | Accounts, onboarding | n/a | The browser no longer makes two calls in a row (the PR 779 approach) |
| Housing cost each month | Derived: the residential mortgage's saved payment at the user's share when one exists, otherwise `user_profiles.monthly_housing_cost` (rent or board) | Mortgage page for the payment; housing details for rent | One selector, `selectHousingCost`, used by the budget's housing line, commitments, safe to spend, Breathing room and Retirement | The budget housing line becomes a linked line. A rent row gains ownership and share so a shared rent counts at the share (JO-8) |

### Budget (decision 1)

A budget line gains one optional field, `linked_to`, with a kind and a target:

| Linked line | Its amount is | Source |
|---|---|---|
| Take-home pay | The engine's take-home | Salary and pension rates |
| Housing | The housing cost selector | Mortgage account or rent |
| Saving into an account | That account's monthly saving at share | Savings account |
| Payment on a debt | That account's payment at share, or the estimate when none is saved | Card or loan account |

A linked line stores no amount. Its amount is worked out when the budget is read, so it cannot go stale. The user can unlink a line and type their own figure; the line is then an ordinary plan line and the page says it differs from the saved fact. This keeps the owner's "plan-only budget" decision: the plan follows saved facts unless the user chooses otherwise.

What goes away: the one-off copies made by onboarding and the wizard, the duplicate debt row check and its name matching (BU-7), the "Saved in your details" hint, `user_profiles.monthly_other_outgoings`, and the removed sync never needs to return.

### Self Assessment

| Fact | Source of truth | Who may write | How readers get it | Other stores |
|---|---|---|---|---|
| Rent received | `tax_records` with category `rental_income` | Self Assessment | The tax calculator | The two rent columns on the profile are dropped. The Mortgage page yield reads the records for the linked property |
| Which property or account a record is about | New: `tax_records.account_id`, a nullable foreign key | Self Assessment | Sources are grouped by account, then by source | none |
| Share of a rental property for tax (decision 6) | The rental Property account's share | The account form | The tax input builder, per property | `user_profiles.property_ownership_share` is dropped |
| Mortgage interest for the finance-cost credit (decision 5) | A `mortgage_interest` record, as now | The user, who is offered a "Calculated" figure from the linked mortgage's monthly balances and rate | The tax calculator | No silent calculation. The figure is the user's once confirmed, the same rule as the check-in |
| Tax region in the estimate (decision 7) | `user_profiles.tax_region` | Settings | The tax input builder passes it to the calculator | A note on the page until Scottish bands are built and signed off |

### Preferences and browser state

| Fact | Source of truth | Change |
|---|---|---|
| Setup checklist dismissed | New: a value on the profile | The browser flag is removed, so a reset or a second device behaves the same |
| The profile as the page sees it | Loader data only | The profile atom, the baseline atom on signed-in pages and the Mortgage page overlay are removed. A browser write to the profile becomes a route action or calls revalidate |
| Browser storage | Signed-out calculator seed, theme | Reset and erasure call the same clear function as sign-out |

## One assembler for figures

The picture in `packages/finance-engine/src/picture` is the only code that turns saved rows into figures. Pages, the AI read tools, the AI context pack and the export of any derived figure all read it.

- Figures that have no selector today get one: savings total and saved each month, the debt-free date and interest, ISA allowance used, paid into pensions each month, and the tax inputs.
- The rule that decides whether a salary counts as PAYE pay moves into one tax input builder. The Dashboard, the Self Assessment page and the AI tax tool all call it.
- The AI tools stop using `userProfileToFinancialBaseline`. They read `ProfileFacts` and return `missing[]` for anything not saved.
- The context pack takes the current tax year from the same resolver as the pages.
- Decision 10 settles whether this is delivered as the `GET /financial-picture` endpoint the owner already chose (E23 D-1-B), or as one shared server function first.

## Keeping it true

### The rule to add to `AGENTS.md`

Proposed wording, as a new section. It is a law change, so it needs sign-off (decision 11) and is made in slice 1, not in this audit.

> **ONE HOME PER VALUE LAW**
>
> - Every stored fact about a user and every figure shown in more than one place has one entry in `docs/system/value-map.yaml`. The entry names its single source of truth: a table and column for a fact, an engine function for a figure.
> - A pull request that adds, moves or removes a database column, a profile field, a browser storage key, or a figure shown to users updates the map in the same pull request and re-runs `bun scripts/generate-value-map.ts`.
> - A new store for a fact that already has a home is not allowed. Read the fact from its home. A cache or a derived copy is allowed only when the map lists it with that status and names what keeps it equal.
> - Money arithmetic on saved data lives in `packages/finance-engine`. Pages, backend services and AI tools read figures from the picture. They do not sum balances, apply shares or convert amounts themselves.
> - A form never sends back a value the engine has adjusted for display (a share, a sign, a rounding). It sends only fields the user changed.
> - A missing fact is shown as "Not set". Code never fills it with a default that looks like an answer.

### The automated check

One script, `scripts/check-value-map.ts`, added to `check:laws`. It builds on what exists.

| Part | What fails the check | Built on |
|---|---|---|
| Columns | A column of an entity in `USER_DATA_REGISTRY` that no map entry names, unless the registry marks it as not a user fact | `apps/backend/src/modules/privacy/user-data-registry.ts` already forces every column to be classified. Each registry column gains one field, `value`, holding a map id. The registry stays the legal source for export and erasure; the map does not absorb it |
| Browser storage | A `localStorage`, `sessionStorage` or cookie key written in `apps/web` or `packages/ui` that the map does not list | A scanner in the style of `scripts/check-style-literals.ts` |
| Paths | A map entry that points at a file that no longer exists, or generated views that are stale | `bun scripts/generate-value-map.ts --check`, which exists today |
| Figures | Money arithmetic on saved rows outside `packages/finance-engine`: sums over `balance`, `amount` or `monthlyContribution`, use of `sharePercent`, and monthly or yearly conversion | `scripts/check-one-tax-engine.ts` is extended into a general one-engine guard with the same ratchet idea: a baseline per file that can only fall. The tax guard becomes one rule set inside it, and `apps/mobile-companion` is either brought inside it or deleted |
| Figure entry points | A page or tool that imports a figure's function directly when the map says it must come from the picture | An import allow-list per figure, read from the map |

The ratchet starts at today's counts, so slice 1 changes no product code. Each later slice lowers the baseline.

### The contract test

Every link in the map can name a test. Slice 1 adds the harness and the personas; each later slice adds the tests for the links it fixes.

- **Engine level.** The existing consistency tests (`packages/mcp/src/__tests__/consistency.test.ts` and `apps/web/app/test/consistency/consistency.test.tsx`) are extended to every AI read tool, with four new personas: a joint account at 40%, a buy-to-let owner, a self-employed person in Scotland, and a person with no salary saved.
- **Browser level.** One Playwright file per link group under `apps/e2e/tests/links/`. Each test changes a value in one place and reads it everywhere the link names. The checks in [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md) are the first drafts of these tests.
- **Reporting.** The generated links view gains a "Test" column, and the check fails when a link marked "Holds" has no test.

## What this model does not change

- The engine's calculators and the picture builder.
- The four tables' basic shape. `accounts` stays one table for all account types.
- The export, erasure and reset registry.
- The rule that debts are stored negative.
- The owner's earlier decisions: plan-only budget, year of birth only, property never counts towards retirement, couples private by default, bank sync deferred.
