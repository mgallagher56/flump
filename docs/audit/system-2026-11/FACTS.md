# System audit, November 2026: fact register

The register itself is data: [docs/system/value-map.yaml](../../system/value-map.yaml). It has one entry for every stored fact about a user, with every place the fact is stored, every screen or tool that writes it, every reader, and the store the code treats as the truth.

Read it as a page here: [the view by fact](../../system/generated/by-fact.md). That view is generated, so it cannot drift from the data.

This file is the audit's reading of the register on 19 November 2026: which facts are flagged, and why.

## How the register was built

- Six inventories of `origin/main` at `f5631d4f0`: the database schema, the profile and browser state, every web route, every backend endpoint, every derived figure, and the AI tools with imports and export.
- Ten deep dives then checked the inventories against the code and corrected them. Two inventory claims were wrong and are fixed in the register: `idempotency_keys.response_headers` is used, and the old `account_details` index was dropped.
- Every path in the register is checked by `bun scripts/generate-value-map.ts --check`.

## What the product stores

| Table | What it holds | Health |
|---|---|---|
| `user_profiles` | One row per person, about 60 columns: pay, pension, tax facts, housing, preferences, and copies of facts from other tables | The main overlap. About 25 columns duplicate another table or are dead |
| `accounts` | One row per account of any of 11 types, with balance, rate, monthly amount, kind, share | Sound shape. Missing a kind for properties and a link from mortgage to property |
| `account_details` | One balance per account per month | Sound. A new account gets no first row |
| `budget_entries` | Budget lines | Sound shape. Lines repeat facts held on accounts and the profile |
| `tax_records` | Self Assessment income and expense records | Sound shape. No link to the account a record describes |
| `retirement_plans` | One plan per person | Sound |
| `snapshot_checkins` | A marker for each finished monthly check-in | Written and never read by the product |
| `transactions` | Bank transactions | No product writer or reader since bank sync was deferred. Endpoints still exposed |
| `bank_connections`, `bank_oauth_states` | Bank links | Parked with bank sync |
| `import_batches` | Staged imports | Sound |
| `mcp_tokens`, `agent_audit_events`, `audit_events`, `consents`, `idempotency_keys`, `account_deletion_tombstones` | Access, audit and safety records | Sound. Not user financial facts |

Outside the database, user facts are also held in the browser:

| Store | Holds | Status |
|---|---|---|
| `localStorage` `flump_financial_baseline_v2` | Salary, region, age, pension, housing as last known | A cache. Signed-in pages use it only when no profile row exists |
| `localStorage` and cookie `flump_onboarding_seed` | Numbers typed into public calculators | For signed-out visitors. Read once to prefill onboarding |
| `localStorage` `flump_setup_checklist_dismissed` | Whether the setup checklist was dismissed | A second store beside the profile's checklist steps. Survives a reset |
| `sessionStorage` `flump.budget.keptDebtRows` | Budget lines the user chose to keep as they are | Lasts one browser session. Not cleared on sign-out |
| In-memory profile and baseline atoms | The whole profile | A second copy beside loader data |

No money values are held in URLs.

## Flagged facts

A fact is flagged when it has more than one store, more than one entry point that writes different stores, or readers that disagree about the source.

| Fact | Stores | The problem in one line | Findings |
|---|---|---|---|
| Salary | Profile; budget income line; legacy PAYE record; browser baseline; an engine default of 45,000 | Left over reads the budget copy, safe to spend reads the profile, and the AI falls back to the default | PP-1, BU-1, SA-2, SA-6 |
| Pension rates | Profile, with column defaults of 5 and 3; a pot's monthly amount | A default looks like an answer on one page and "Not set" on another | PP-2, PP-3, PP-11 |
| Student loan plan | Profile; the student loan account | Take-home reads only the profile; the account form asks again | PP-7, SD-9 |
| Tax region | Profile; a browser copy read by one notice | Self Assessment reads neither | SA-3, PP-9 |
| Balance today | `accounts.balance`; the current month's history row | Kept equal by current-month writes only | CH-1, CH-2, SD-1 |
| Check-in finished | `snapshot_checkins`; "any row this month" | The reminder reads the second, so one unrelated edit hides it | CH-3 |
| Share of a joint account | Account share; one profile share for rental tax | Net worth and tax can use different shares for the same property | SA-5, JO-7 |
| Monthly amount on an account | The account; a budget savings, debt or housing line | Payoff reads the account, planned savings reads the budget, commitments take the larger | BU-6, BU-7, SD-10 |
| Value of a property | Property account; a profile field for buy to let | The Mortgage page's buy-to-let tab reads the profile field, net worth reads the account | HM-4 |
| Kind of property | Not stored; guessed from the name | A rental with an ordinary name counts as the home | HM-3 |
| Buy-to-let mortgage | Mortgage account; three profile fields | Each is edited on a different page and neither updates the other | HM-4, SA-4 |
| Rent received | Tax records; two profile fields; a budget income line | Four stores, none feeding another | HM-5, SA-4 |
| Housing status and "has a mortgage" | Profile flags; whether a mortgage account exists | The flags do not follow the accounts | HM-6 |
| Housing cost | Profile; a budget housing line; the mortgage account's payment | Three pages each write one store and each figure reads a different one | HM-1, HM-2, BU-4 |
| Other outgoings | Profile; a budget line | Copied once in onboarding; the profile copy is never read | BU-10 |
| Setup checklist | Profile steps; a browser flag | A reset clears one and not the other | CS-2, CS-3 |

Facts with one store and no dispute: year of birth, the retirement plan, the check-in day, the net worth choices (one page-side gap in an AI tool), enabled pages and widgets, interest rates, credit limits, mortgage term and fix end date.

## Facts stored and used by nothing

These have no writer, no reader, or neither. They are listed for slice 9 of the plan.

- Profile: `display_name`, `monthly_take_home` (written, not read by a figure), `monthly_other_outgoings` (the same), `monthly_savings_target`, `savings_allocation_mode`, `savings_default_interest_rate`, `has_second_income`, `second_income_monthly`, `has_rental_income`, `rental_income_monthly`, `buy_to_let_count`, `buy_to_let_monthly_rental`, `dashboard_widget_sizes`, `dashboard_widget_config`. `country` and `currency` are constants today.
- Budget lines: `is_primary_income` (always false), `is_default` (set only by an endpoint nothing calls).
- Tables: `snapshot_checkins` (until the reminder reads it), `transactions`.
- Endpoints: `PATCH /accounts/balances`, `GET /portfolio-snapshot`, `POST /budget-entries/seed-defaults`, the transactions endpoints.

Not confirmed: whether `avatar_url` is shown anywhere outside Settings.
