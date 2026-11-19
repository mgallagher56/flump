# System audit, November 2026: dependency map

Three things live here: the matrix of pages against facts, the list of figures shown in more than one place, and the expected links. All three are generated from [docs/system/value-map.yaml](../../system/value-map.yaml), so this file only points at them and records what the audit flagged.

| View | What it answers |
|---|---|
| [By page and tool](../../system/generated/by-page.md) | What does the Mortgage page read and write? Includes the full matrix of facts against pages |
| [By fact and figure](../../system/generated/by-fact.md) | Where is this value stored, entered and used? Which function computes this figure? |
| [Connections](../../system/generated/connections.md) | One diagram per area |
| [Expected links](../../system/generated/links.md) | The 73 testable statements with their verdicts |

## Pages that write facts owned by another area

| Page | Writes | Finding |
|---|---|---|
| Accounts, when adding a mortgage | A Property account for the home, as a second request from the browser | HM-3, and slice 4 of the plan |
| Mortgage | Profile flags and the profile's buy-to-let fields; a Property account | HM-4, HM-9 |
| Budget | Profile housing status and housing cost | HM-2, BU-4 |
| Onboarding | Profile, accounts and budget lines, copying the same figures into two of them | BU-10, DB-3 |
| Pension | Profile salary and pension rates | none: one store |
| Self Assessment | Profile salary and the profile's rental share | SA-5 |
| Savings, Pension | A setup checklist step on every visit | LD-2, CS-6 |

## Figures shown in more than one place

"Engine" means `packages/finance-engine/src`. A figure is flagged when a second code path computes it, or when any path sits outside the engine.

| Figure | The engine function | Other code paths | Outside the engine | Verdict |
|---|---|---|---|---|
| Net worth today | `selectNetWorth` | The AI snapshot calls the same snapshot method directly; an onboarding preview; an unused copy in `packages/banking` | Onboarding, banking | Holds |
| Net worth over time | `selectNetWorthSeries` | `PortfolioSnapshot.getMonthlyHistory`, used by the AI context pack | none | Broken (CH-5) |
| Total debts | `selectDebtTotals` | The context pack's own sum; local sums in the AI debt tool and the Debt page | AI tool, Debt page | Duplicated (SD-6) |
| Debt-free date and interest | `compareAvalancheAndSnowball` | The context pack adds 50 a month; the AI simulate tool drops debts with no rate | none | Duplicated (SD-6, AI-5) |
| Home equity | `estimateHomeEquity` | Onboarding preview; the AI projection floors it at zero | Onboarding, AI tool | Holds on pages |
| Loan to value | `selectLoanToValue` | A local fallback on the Mortgage page | Mortgage page | Broken (HM-3) |
| Mortgage payment, calculated | `calculateMortgagePayment` | A rounded twin and an inline copy, all in the engine | none | Holds |
| Take-home pay | `selectTakeHome` | The context pack works from defaults; onboarding and Pension feed the same function different inputs | none | Broken (PP-2, PP-4, PP-5) |
| Left over each month | `selectBudgetTotals` | Two AI tools, the budget wizard, a web copy of the monthly conversion, onboarding | AI tools, web | Broken (BU-1, BU-3) |
| Safe to spend | `selectSafeToSpend` | none | none | Holds |
| Breathing room | `selectMonthsOfCover` | The AI snapshot uses a different essentials total; the runway what-if re-sums | AI tool, web | Broken (BU-3, JO-2) |
| Savings total and saved each month | none: summed on the Savings page from engine balances | The Dashboard sums raw balances | Both | Broken (SD-2) |
| Savings interest | `estimateSavingsInterestNext12Months` | A second weighted-rate function, computed and not shown | none | Holds |
| ISA allowance used | none | A web-only estimate; the engine reports zero used to the AI | Web | Duplicated (SD-3) |
| Estimated tax | `calculateUKTax` | Four callers prepare its inputs differently; the page's strip re-sums records | Web strip | Broken (SA-1, SA-2, SA-3) |
| Paid into pensions each month | `calculateWorkplacePensionContributions` | Local sums on Pension, the Dashboard and an AI tool | All three | Duplicated (PP-2, PP-11) |
| Retirement income | `calculateRetirementPlan` | none | none | Broken by its inputs (PP-6, HM-8) |
| Calculated check-in balance | `calculateCheckInBalance` | none | none | Holds |

The pattern: where a figure is wrong, the formula is usually right and the inputs differ. Five figures have no single owner in the engine at all: savings totals, ISA used, pension paid in, the debt summary as the pages show it, and the tax inputs.

Two spending figures are shown under different names and are not the same sum: the Dashboard's "Spending each month" leaves out savings lines, and the Budget's "Going out each month" includes them. Both come from `selectBudgetTotals`. They were £3,015 and £3,315 for the seeded persona.

## What the existing guards cover

| Guard | Covers | Does not cover |
|---|---|---|
| `scripts/check-one-tax-engine.ts` | Tax rate and threshold fields read outside the rule files, with a per-file ceiling | Any other arithmetic. Different inputs to the same calculator. The parked mobile app |
| The consistency tests in `packages/mcp` and `apps/web` | Marked figures on persona fixtures, and the AI context pack, against the picture | The AI read tools' own sums. Joint accounts. Buy to let. A missing salary |
| `user-data-registry.spec.ts` | Every column is classified for export, erasure and reset | Whether a column duplicates another fact |

Nothing scans for sums over balances, share arithmetic or budget conversion outside the engine. Slice 1 of the plan adds that.

## Expected links

The 73 statements, grouped by fact, with verdicts and finding ids, are in [the generated links view](../../system/generated/links.md). The counts on 19 November 2026:

| Verdict | Links |
|---|---|
| Holds | 19 |
| Holds with a manual step or a delay | 8 |
| Duplicated (two stores that can disagree) | 14 |
| Broken | 32 |

Nineteen of the 73 were checked in a browser as well as in code. The "Checked in" column of the view says which.
