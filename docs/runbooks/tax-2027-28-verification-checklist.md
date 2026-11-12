# 2027/28 figures: owner verification checklist

**About an hour. Do this before anyone loads 2027/28 as verified.** Nothing below is in the app
yet: Flump uses 2026/27 rates after 6 April 2027 and shows a banner saying so. This checklist is
how you decide whether the 2027/28 figures can be trusted.

## Why this is needed

The draft planner copied some 2027/28 figures from a Budget 2026 summary. An independent review
disagrees with two of them against Budget 2025 as the reviewer knows it, and Budget 2026 is newer than that
reviewer's knowledge. So these are **unverified**, and the two conflicts are marked **CONFLICT** below.

## How

1. Open the primary source: Budget 2026 "Overview of tax legislation and rates" (OOTLAR), **Annex A: rates and allowances** on GOV.UK:
   https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances
2. Find the 2027/28 column for each row. Tick the box only if GOV.UK shows the same figure. If it differs, write the GOV.UK figure in the last column.
3. Also read **one independent summary** (for example the Institute for Fiscal Studies, ICAEW or a large accountancy firm's "Budget 2026 tax rates" page) and confirm the two **CONFLICT** rows with it.
4. Record the result (see the end).

## Figures to check (planner's values, unverified)

| ✔   | Figure                                                                  | Planner's 2027/28 value                                                | GOV.UK says |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------- |
| ☐   | Personal allowance                                                      | £12,570                                                                |             |
| ☐   | Basic rate band                                                         | £37,700                                                                |             |
| ☐   | Additional rate threshold                                               | £125,140                                                               |             |
| ☐   | Income tax rates (basic / higher / additional)                          | 20% / 40% / 45%                                                        |             |
| ☐   | **CONFLICT** Savings income rates (basic / higher / additional)         | 24% / 44% / 49%. Budget 2025 as the reviewer knows it: 22% / 42% / 47% |             |
| ☐   | **CONFLICT** Property income rates, England, Wales and Northern Ireland | 24% / 44% / 49%. Reviewer: 22% / 42% / 47%                             |             |
| ☐   | **CONFLICT** Cash ISA annual limit                                      | £20,000. Reviewer: £12,000 for under-65s                               |             |
| ☐   | Overall ISA limit                                                       | £20,000                                                                |             |
| ☐   | Dividend allowance and rates                                            | £500; 10.75% / 35.75% / 39.35%                                         |             |
| ☐   | Employee NI: primary threshold, upper earnings limit, rates             | £12,570; £50,270; 8% / 2%                                              |             |
| ☐   | Lower earnings limit                                                    | £6,916                                                                 |             |
| ☐   | Employer NI: secondary threshold and rate                               | £5,000; 15%                                                            |             |
| ☐   | Class 4 NI: thresholds and rates                                        | £12,570 / £50,270; 6% / 2%                                             |             |
| ☐   | Trading allowance                                                       | £3,000 (up from £1,000)                                                |             |
| ☐   | Pension annual allowance                                                | £60,000                                                                |             |
| ☐   | Capital gains tax: rates and annual exempt amount                       | 18% / 24%; £3,000                                                      |             |
| ☐   | Plan 2 student loan threshold                                           | £29,385 (frozen at 2026/27)                                            |             |

## Not known yet (do not tick, re-check later)

- Scottish income tax rates and bands (set at the Scottish Budget, December or January).
- Welsh rates.
- Scottish and Welsh property income rates.
- Student loan thresholds for Plans 1, 4, 5 and postgraduate (HMRC publishes around December to February).
- The finance-cost credit rate for rental landlords (Section 24) and the order the personal allowance is set against income types.

## Result

When every row is ticked (or corrected) and the three conflicts are settled by the independent summary:

- Write the date and what you changed in `docs/audit/plans/DECISIONS.md`, as "E22 D9-A sign-off".
- Tell the agent to load 2027/28 as **provisional** (never verified) with each figure sourced.
- Then follow `docs/runbooks/tax-year-update.md` for the rest. Vector sign-off is a separate task (`bun run tax:signoff`).

If you cannot finish before 1 March 2027, the calendar guard starts failing PRs. The safe default is still fine: the app keeps using 2026/27 with the banner.
