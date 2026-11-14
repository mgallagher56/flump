# E16 PR 6 screenshots: debt and mortgage

Before (`origin/main` visual baselines before this PR) and after (this PR's baselines, regenerated in CI in the Playwright image), at 375 and 1280, light and dark. JPEG, full page. Files: `<debt|mortgage>-<width>-<theme>-<before|after>.jpg`.

The visual guard's user has no debts and a mortgage with balance and rate but no term, so these shots show the debt empty state and the mortgage partial state. The debt page with debts and the complete mortgage state are covered by container tests (`expectPageRules`, scenario-leaves-hero-and-strip) and Storybook stories, not by screenshots here.

What changed:

- Debt empty: no tabs, one intro line, one "Add a debt" button, the MoneyHelper line unchanged.
- Debt with debts: "Total you owe" hero (saved), three KPIs with estimates labelled "Estimate", one prompt for missing rates, one figure per list row, one "Pay extra each month" tool with a payoff-order `Tabs` control, UK calculators in a quiet drawer. The into-savings tool (D5), the high APR badge and the promo warning are gone.
- Mortgage partial: the 12 "Not set" cells, empty cost, LTV and chart cards and the scenario zone are gone. One card holds the two saved figures and one prompt with one button.
- Mortgage complete: "Remaining balance" hero (saved fact, ruling 7), four KPIs (Paid off by and Monthly payment labelled "Estimate", Interest rate with fix end, Loan to value), one details card with Edit, cost and LTV bands in quiet drawers, three scenario tools in `Tabs` with starting figures behind "More options".

Re-score (visual / simplicity), design-critique heuristics:

| Page                | Before    | After     |
| ------------------- | --------- | --------- |
| Debt (empty)        | 8.5 / 9   | 9.5 / 9.5 |
| Debt (with debts)   | 5.5 / 4.5 | 9 / 9.5   |
| Mortgage (partial)  | 4.5 / 3.5 | 9.5 / 10  |
| Mortgage (complete) | 4.5 / 3.5 | 9 / 9     |

Below 9.5 because of: no screenshot evidence yet for the with-debts and complete-mortgage states (scored from code, tests and stories); the complete mortgage page still carries three scenario tools and two drawers below the details, which is the plan's prescription but more surface than one tool; the debt zone notice lead can hold two sentences when both the budget and some rates are unknown.
